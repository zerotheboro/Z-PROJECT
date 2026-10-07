import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import {
  createFirebaseDailyUsageLimiter,
  DailyRecommendationLimitError,
  getFirebaseAdminFirestore,
  initializeFirebaseAdmin,
  isFirebaseAdminConfigurationError,
  verifyFirebaseIdToken
} from "./firebaseAdmin.js";
import { METHOD_POOL } from "./methodPool.js";
import {
  createFirebaseTrainingQuotaManager,
  TrainingQuotaExceededError,
  TrainingQuotaValidationError,
  TrainingReservationConflictError
} from "./trainingQuota.js";

dotenv.config();

export const SIGNED_IN_MODEL = "gpt-5.4-mini";
export const ANONYMOUS_MODEL = "gpt-5-mini";
export const ALLOWED_MODELS = Object.freeze([
  SIGNED_IN_MODEL,
  ANONYMOUS_MODEL
]);
export const MAX_OUTPUT_TOKENS = 2000;
export const SIGNED_IN_RATE_LIMIT = 3;
export const ANONYMOUS_RATE_LIMIT = 2;
export const RECOMMEND_RATE_WINDOW_MS = 60_000;
export const SIGNED_IN_DAILY_LIMIT = 20;
export const TRAINING_ACCESS_RATE_LIMIT = 30;
export const INPUT_LIMITS = Object.freeze({
  biggestProblem: 300,
  methodQuestion: 300,
  extraContext: 1000
});

const ENDPOINT = "/api/recommend";
const ALLOWED_MODEL_SET = new Set(ALLOWED_MODELS);

const SYSTEM_PROMPT = `
You are the Edulience study-method adviser.

Your job is to recommend study methods only from the provided METHOD_POOL for the user's study situation.

Rules:
- Only recommend methods from METHOD_POOL
- Recommend at most 3 methods
- Keep the tone practical, encouraging, student-friendly, not overlong, and never falsely certain
- Include why each method fits
- Include warning conditions where each method may not work as well
- Return valid JSON only
`;

const COMPACT_METHOD_POOL = METHOD_POOL.map((method) => ({
  n: method.name,
  b: method.branch,
  c: method.category,
  f: method.best_for,
  d: method.description,
  w: method.warning
}));

const METHOD_CONTEXT = `
EDULIENCE METHOD_POOL

Fields:
n = name
b = branch
c = category
f = best_for
d = description
w = warning

${JSON.stringify(COMPACT_METHOD_POOL)}
`;

function buildUserPrompt({
  biggestProblem,
  methodQuestion,
  extraContext
}) {
  return `
${METHOD_CONTEXT}

STUDENT INFORMATION

Biggest problem:
${biggestProblem || "not provided"}

Method question:
${methodQuestion || "not provided"}

Extra context:
${extraContext || "none"}
`.trim();
}

const recommendationSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    user_problem: { type: "string" },
    recommended_methods: {
      type: "array",
      minItems: 1,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          branch: { type: "string" },
          reason: { type: "string" },
          warning: { type: "string" }
        },
        required: ["name", "branch", "reason", "warning"]
      }
    },
    study_plan: { type: "string" },
    final_note: { type: "string" }
  },
  required: ["user_problem", "recommended_methods", "study_plan", "final_note"]
};

function getAuthContext(req) {
  return req.auth ?? {
    status: "anonymous",
    verified: false,
    uid: null
  };
}

function getClientIp(req) {
  return req.ip || req.socket?.remoteAddress || "unknown";
}

function selectModel(authContext) {
  const model = authContext.verified
    ? SIGNED_IN_MODEL
    : ANONYMOUS_MODEL;

  if (!ALLOWED_MODEL_SET.has(model)) {
    throw new Error("Server selected a model outside the allowlist");
  }

  return model;
}

function writeLog(logger, level, event) {
  const log = logger[level] ?? logger.log;
  log.call(logger, JSON.stringify(event));
}

function createRequestLogContext(req, modelSelected) {
  const authContext = getAuthContext(req);

  return {
    endpoint: ENDPOINT,
    auth_status: authContext.status,
    user_id: authContext.uid,
    firebase_uid: authContext.uid,
    anonymous: !authContext.verified,
    client_ip: getClientIp(req),
    model_selected: modelSelected,
    model_requested: modelSelected
  };
}

function logRejectedRequest(logger, now, req, {
  status,
  errorMessage,
  event = "recommendation_request_rejected"
}) {
  const modelSelected = selectModel(getAuthContext(req));

  writeLog(logger, "warn", {
    timestamp: new Date(now()).toISOString(),
    event,
    ...createRequestLogContext(req, modelSelected),
    model_returned: null,
    openai_request_id: null,
    input_tokens: null,
    output_tokens: null,
    total_tokens: null,
    status,
    error_message: errorMessage,
    success: false
  });
}

function validateRecommendationInput(body) {
  const source = body && typeof body === "object" && !Array.isArray(body)
    ? body
    : {};
  const validated = {};

  for (const [field, maxLength] of Object.entries(INPUT_LIMITS)) {
    const value = source[field];

    if (value === undefined || value === null) {
      validated[field] = "";
      continue;
    }

    if (typeof value !== "string") {
      return { error: `${field} must be a string` };
    }

    if (value.length > maxLength) {
      return { error: `${field} must be ${maxLength} characters or fewer` };
    }

    validated[field] = value;
  }

  return { value: validated };
}

function getBearerToken(req) {
  const authorization = req.get("authorization");

  if (authorization === undefined) {
    return undefined;
  }

  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

function createFirebaseAuthMiddleware({
  verifyToken,
  logger,
  now
}) {
  return async (req, res, next) => {
    req.auth = null;
    const idToken = getBearerToken(req);

    if (idToken === undefined) {
      next();
      return;
    }

    try {
      if (!idToken) {
        throw new Error("Malformed Authorization header");
      }

      const decodedToken = await verifyToken(idToken);

      if (!decodedToken?.uid || typeof decodedToken.uid !== "string") {
        throw new Error("Verified Firebase token did not contain a UID");
      }

      req.auth = {
        status: "verified",
        verified: true,
        uid: decodedToken.uid
      };
    } catch (error) {
      const configurationFailure = isFirebaseAdminConfigurationError(error);
      const status = configurationFailure ? 503 : 401;

      writeLog(logger, configurationFailure ? "error" : "warn", {
        timestamp: new Date(now()).toISOString(),
        ...(configurationFailure ? { severity: "high" } : {}),
        event: configurationFailure
          ? "firebase_admin_unavailable"
          : "firebase_auth_verification_failed",
        endpoint: req.path,
        auth_status: "invalid",
        user_id: null,
        firebase_uid: null,
        anonymous: false,
        client_ip: getClientIp(req),
        model_selected: null,
        model_requested: null,
        model_returned: null,
        openai_request_id: null,
        input_tokens: null,
        output_tokens: null,
        total_tokens: null,
        status,
        firebase_error_code: error?.code ?? null,
        error_message: configurationFailure
          ? "Firebase Admin configuration is unavailable"
          : "Firebase token verification failed",
        success: false
      });
      res.status(status).json({
        error: configurationFailure
          ? "Authentication service unavailable"
          : "Invalid authentication token"
      });
      return;
    }

    next();
  };
}

function requireVerifiedTrainingAuth(req, res, next) {
  const authContext = getAuthContext(req);

  if (!authContext.verified) {
    res.status(401).json({
      error: "Authentication required"
    });
    return;
  }

  next();
}

function createTrainingRateLimitMiddleware({
  limit,
  windowMs,
  now
}) {
  const identities = new Map();

  return (req, res, next) => {
    const uid = getAuthContext(req).uid;
    const currentTime = now();
    const current = identities.get(uid);

    if (!current || currentTime >= current.resetAt) {
      identities.set(uid, {
        count: 1,
        resetAt: currentTime + windowMs
      });
      next();
      return;
    }

    if (current.count >= limit) {
      res.set(
        "Retry-After",
        String(Math.max(
          1,
          Math.ceil(
            (current.resetAt - currentTime) / 1000
          )
        ))
      );
      res.status(429).json({
        error: "Too many training access requests"
      });
      return;
    }

    current.count += 1;
    next();
  };
}

function sendTrainingQuotaError(res, error) {
  if (error instanceof TrainingQuotaExceededError) {
    res.status(403).json({
      error: "Daily training limit reached",
      code: error.code,
      quota: error.quota,
      access: error.access
    });
    return;
  }

  if (error instanceof TrainingQuotaValidationError) {
    res.status(400).json({
      error: error.message,
      code: error.code
    });
    return;
  }

  if (error instanceof TrainingReservationConflictError) {
    res.status(409).json({
      error: error.message,
      code: error.code
    });
    return;
  }

  res.status(503).json({
    error: "Training access service unavailable"
  });
}

function createRateLimitMiddleware({
  signedInLimit,
  anonymousLimit,
  windowMs,
  now,
  logger
}) {
  const identities = new Map();

  return (req, res, next) => {
    const authContext = getAuthContext(req);
    const identity = authContext.verified
      ? `user:${authContext.uid}`
      : `ip:${getClientIp(req)}`;
    const limit = authContext.verified
      ? signedInLimit
      : anonymousLimit;
    const currentTime = now();
    const current = identities.get(identity);

    if (!current || currentTime >= current.resetAt) {
      identities.set(identity, {
        count: 1,
        resetAt: currentTime + windowMs
      });
      next();
      return;
    }

    if (current.count >= limit) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((current.resetAt - currentTime) / 1000)
      );
      logRejectedRequest(logger, now, req, {
        status: 429,
        errorMessage: "Per-minute recommendation limit reached"
      });
      res.set("Retry-After", String(retryAfterSeconds));
      res.status(429).json({ error: "Too many recommendation requests" });
      return;
    }

    current.count += 1;
    next();
  };
}

function createOpenAIClient() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    maxRetries: 0
  });
}

export function createRecommendationApp({
  openAIClient,
  verifyFirebaseToken = verifyFirebaseIdToken,
  dailyUsageLimiter,
  trainingQuotaManager,
  logger = console,
  now = Date.now,
  signedInRateLimit = SIGNED_IN_RATE_LIMIT,
  anonymousRateLimit = ANONYMOUS_RATE_LIMIT,
  rateWindowMs = RECOMMEND_RATE_WINDOW_MS
} = {}) {
  const app = express();
  const client = openAIClient ?? createOpenAIClient();
  const signedInDailyUsage = dailyUsageLimiter
    ?? createFirebaseDailyUsageLimiter({
      limit: SIGNED_IN_DAILY_LIMIT,
      now
    });
  const trainingQuota = trainingQuotaManager
    ?? createFirebaseTrainingQuotaManager({
      now,
      getFirestore: getFirebaseAdminFirestore
    });

  app.set("trust proxy", 1);
  app.use(cors());
  app.use(createFirebaseAuthMiddleware({
    verifyToken: verifyFirebaseToken,
    logger,
    now
  }));
  app.use(express.json({ limit: "16kb" }));

  const trainingRateLimit =
    createTrainingRateLimitMiddleware({
      limit: TRAINING_ACCESS_RATE_LIMIT,
      windowMs: RECOMMEND_RATE_WINDOW_MS,
      now
    });

  app.get(
    "/api/training/access",
    requireVerifiedTrainingAuth,
    trainingRateLimit,
    async (req, res) => {
      try {
        const access = await trainingQuota.getAccess(
          getAuthContext(req).uid,
          req.query.timezone
        );
        res.json(access);
      } catch (error) {
        sendTrainingQuotaError(res, error);
      }
    }
  );

  app.post(
    "/api/training/reserve",
    requireVerifiedTrainingAuth,
    trainingRateLimit,
    async (req, res) => {
      try {
        const reservation = await trainingQuota.reserve(
          getAuthContext(req).uid,
          req.body
        );
        res.json(reservation);
      } catch (error) {
        sendTrainingQuotaError(res, error);
      }
    }
  );

  app.post(
    ENDPOINT,
    createRateLimitMiddleware({
      signedInLimit: signedInRateLimit,
      anonymousLimit: anonymousRateLimit,
      windowMs: rateWindowMs,
      now,
      logger
    }),
    async (req, res) => {
      const authContext = getAuthContext(req);
      const modelSelected = selectModel(authContext);
      const logContext = createRequestLogContext(req, modelSelected);
      const input = validateRecommendationInput(req.body);

      if (input.error) {
        logRejectedRequest(logger, now, req, {
          status: 400,
          errorMessage: input.error
        });
        res.status(400).json({ error: input.error });
        return;
      }

      let dailyReservation = null;

      if (authContext.verified) {
        try {
          dailyReservation = await signedInDailyUsage.reserve(authContext.uid);
        } catch (error) {
          if (error instanceof DailyRecommendationLimitError) {
            logRejectedRequest(logger, now, req, {
              status: 429,
              errorMessage: error.message,
              event: "daily_recommendation_limit_reached"
            });
            res.status(429).json({ error: "Daily recommendation limit reached" });
            return;
          }

          writeLog(logger, "error", {
            timestamp: new Date(now()).toISOString(),
            severity: "high",
            event: "daily_usage_check_failed",
            ...logContext,
            model_returned: null,
            openai_request_id: null,
            input_tokens: null,
            output_tokens: null,
            total_tokens: null,
            status: 503,
            error_message: error instanceof Error
              ? error.message
              : "Daily usage check failed",
            success: false
          });
          res.status(503).json({ error: "Failed to get recommendation" });
          return;
        }
      }

      try {
        const userPrompt = buildUserPrompt(input.value);
        const request = client.responses.create({
          model: modelSelected,
          instructions: SYSTEM_PROMPT,
          input: userPrompt,
          store: true,
          max_output_tokens: MAX_OUTPUT_TOKENS,
          text: {
            format: {
              type: "json_schema",
              name: "edulience_recommendation",
              schema: recommendationSchema,
              strict: true
            }
          }
        });
        const {
          data: response,
          response: rawResponse,
          request_id: requestId
        } = await request.withResponse();
        const usage = response.usage ?? {};

        writeLog(logger, "info", {
          timestamp: new Date(now()).toISOString(),
          event: "openai_request_completed",
          ...logContext,
          model_returned: response.model ?? null,
          openai_request_id: requestId,
          input_tokens: usage.input_tokens ?? null,
          output_tokens: usage.output_tokens ?? null,
          total_tokens: usage.total_tokens ?? null,
          status: rawResponse.status,
          success: true
        });

        if (!ALLOWED_MODEL_SET.has(response.model)) {
          writeLog(logger, "error", {
            timestamp: new Date(now()).toISOString(),
            severity: "high",
            event: "openai_unapproved_model_returned",
            ...logContext,
            model_returned: response.model ?? null,
            openai_request_id: requestId
          });
        } else if (response.model !== modelSelected) {
          writeLog(logger, "warn", {
            timestamp: new Date(now()).toISOString(),
            event: "openai_model_mismatch",
            ...logContext,
            model_returned: response.model,
            openai_request_id: requestId
          });
        }

        const result = JSON.parse(response.output_text);
        res.json(result);
      } catch (error) {
        if (dailyReservation) {
          try {
            await signedInDailyUsage.release(dailyReservation);
          } catch (releaseError) {
            writeLog(logger, "error", {
              timestamp: new Date(now()).toISOString(),
              severity: "high",
              event: "daily_usage_reservation_release_failed",
              ...logContext,
              status: 500,
              error_message: releaseError instanceof Error
                ? releaseError.message
                : "Daily usage reservation release failed"
            });
          }
        }

        writeLog(logger, "error", {
          timestamp: new Date(now()).toISOString(),
          event: "openai_request_failed",
          ...logContext,
          model_returned: null,
          status: error?.status ?? 500,
          openai_error_code: error?.code ?? null,
          openai_request_id: error?.requestID ?? null,
          input_tokens: null,
          output_tokens: null,
          total_tokens: null,
          error_message: error instanceof Error ? error.message : "Unknown error",
          success: false
        });
        res.status(500).json({ error: "Failed to get recommendation" });
      }
    }
  );

  app.use((error, req, res, next) => {
    if (error?.type === "entity.too.large") {
      logRejectedRequest(logger, now, req, {
        status: 413,
        errorMessage: "Request body exceeds 16kb"
      });
      res.status(413).json({ error: "Request body too large" });
      return;
    }

    if (error?.type === "entity.parse.failed") {
      logRejectedRequest(logger, now, req, {
        status: 400,
        errorMessage: "Request body contains invalid JSON"
      });
      res.status(400).json({ error: "Invalid JSON request body" });
      return;
    }

    next(error);
  });

  return app;
}

const currentFile = fileURLToPath(import.meta.url);
const entryFile = process.argv[1] ? path.resolve(process.argv[1]) : null;

if (entryFile === currentFile) {
  const PORT = process.env.PORT || 3001;

  try {
    const { credentialSource, projectId } = initializeFirebaseAdmin();
    writeLog(console, "info", {
      timestamp: new Date().toISOString(),
      event: "firebase_admin_initialized",
      credential_source: credentialSource,
      project_id: projectId,
      success: true
    });
  } catch (error) {
    writeLog(console, "error", {
      timestamp: new Date().toISOString(),
      severity: "high",
      event: "firebase_admin_initialization_failed",
      firebase_error_code: error?.code ?? null,
      error_message: isFirebaseAdminConfigurationError(error)
        ? error.message
        : "Firebase Admin initialization failed",
      success: false
    });
  }

  const app = createRecommendationApp();

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}
