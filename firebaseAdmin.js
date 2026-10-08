import process from "node:process";
import {
  applicationDefault,
  cert,
  getApp,
  initializeApp
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const ADMIN_APP_NAME = "edulience-backend";
const DEFAULT_FIREBASE_PROJECT_ID = "edulience-920ba";
const REQUIRED_SERVICE_ACCOUNT_FIELDS = Object.freeze([
  "type",
  "project_id",
  "private_key_id",
  "private_key",
  "client_email",
  "client_id"
]);

export class FirebaseAdminConfigurationError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "FirebaseAdminConfigurationError";
    this.code = code;
  }
}

export function isFirebaseAdminConfigurationError(error) {
  return error instanceof FirebaseAdminConfigurationError;
}

export function parseFirebaseServiceAccount(rawServiceAccount) {
  if (typeof rawServiceAccount !== "string" || !rawServiceAccount.trim()) {
    throw new FirebaseAdminConfigurationError(
      "firebase_admin_credentials_missing",
      "FIREBASE_SERVICE_ACCOUNT_JSON is missing or empty"
    );
  }

  let serviceAccount;

  try {
    serviceAccount = JSON.parse(rawServiceAccount);
  } catch {
    throw new FirebaseAdminConfigurationError(
      "firebase_admin_credentials_invalid_json",
      "FIREBASE_SERVICE_ACCOUNT_JSON must contain valid JSON"
    );
  }

  if (
    !serviceAccount
    || typeof serviceAccount !== "object"
    || Array.isArray(serviceAccount)
  ) {
    throw new FirebaseAdminConfigurationError(
      "firebase_admin_credentials_invalid_shape",
      "FIREBASE_SERVICE_ACCOUNT_JSON must contain a service-account object"
    );
  }

  for (const field of REQUIRED_SERVICE_ACCOUNT_FIELDS) {
    if (
      typeof serviceAccount[field] !== "string"
      || !serviceAccount[field].trim()
    ) {
      throw new FirebaseAdminConfigurationError(
        "firebase_admin_credentials_missing_field",
        `FIREBASE_SERVICE_ACCOUNT_JSON is missing required field: ${field}`
      );
    }
  }

  if (serviceAccount.type !== "service_account") {
    throw new FirebaseAdminConfigurationError(
      "firebase_admin_credentials_invalid_type",
      "FIREBASE_SERVICE_ACCOUNT_JSON must be a service-account credential"
    );
  }

  const privateKey = serviceAccount.private_key.replace(/\\n/g, "\n");

  if (
    !privateKey.includes("-----BEGIN PRIVATE KEY-----")
    || !privateKey.includes("-----END PRIVATE KEY-----")
  ) {
    throw new FirebaseAdminConfigurationError(
      "firebase_admin_credentials_invalid_private_key",
      "FIREBASE_SERVICE_ACCOUNT_JSON contains an invalid private_key"
    );
  }

  return {
    ...serviceAccount,
    private_key: privateKey
  };
}

export function createFirebaseAdminManager({
  env = process.env,
  sdk = {
    applicationDefault,
    cert,
    getApp,
    initializeApp,
    getAuth,
    getFirestore
  }
} = {}) {
  let adminApp;
  let initializationInfo;

  function resolveInitializationOptions() {
    const rawServiceAccount = env.FIREBASE_SERVICE_ACCOUNT_JSON;
    const configuredProjectId = env.FIREBASE_PROJECT_ID?.trim()
      || DEFAULT_FIREBASE_PROJECT_ID;

    if (typeof rawServiceAccount === "string" && rawServiceAccount.trim()) {
      const serviceAccount = parseFirebaseServiceAccount(rawServiceAccount);

      if (serviceAccount.project_id !== configuredProjectId) {
        throw new FirebaseAdminConfigurationError(
          "firebase_admin_project_mismatch",
          "Firebase service-account project_id does not match FIREBASE_PROJECT_ID"
        );
      }

      return {
        credential: sdk.cert(serviceAccount),
        credentialSource: "service_account_json",
        projectId: configuredProjectId
      };
    }

    if (typeof env.GOOGLE_APPLICATION_CREDENTIALS === "string"
      && env.GOOGLE_APPLICATION_CREDENTIALS.trim()) {
      return {
        credential: sdk.applicationDefault(),
        credentialSource: "google_application_credentials",
        projectId: configuredProjectId
      };
    }

    throw new FirebaseAdminConfigurationError(
      "firebase_admin_credentials_missing",
      "Set FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS"
    );
  }

  function getFirebaseAdminApp() {
    if (adminApp) {
      return adminApp;
    }

    try {
      adminApp = sdk.getApp(ADMIN_APP_NAME);
      initializationInfo = {
        credentialSource: "existing_app",
        projectId: adminApp.options?.projectId
          || env.FIREBASE_PROJECT_ID?.trim()
          || DEFAULT_FIREBASE_PROJECT_ID
      };
      return adminApp;
    } catch (error) {
      if (error?.code !== "app/no-app") {
        throw new FirebaseAdminConfigurationError(
          "firebase_admin_lookup_failed",
          "Firebase Admin app lookup failed",
          { cause: error }
        );
      }
    }

    try {
      const {
        credential,
        credentialSource,
        projectId
      } = resolveInitializationOptions();

      adminApp = sdk.initializeApp(
        { credential, projectId },
        ADMIN_APP_NAME
      );
      initializationInfo = { credentialSource, projectId };
    } catch (error) {
      if (isFirebaseAdminConfigurationError(error)) {
        throw error;
      }

      throw new FirebaseAdminConfigurationError(
        "firebase_admin_initialization_failed",
        "Firebase Admin could not be initialized",
        { cause: error }
      );
    }

    return adminApp;
  }

  return {
    initialize() {
      getFirebaseAdminApp();
      return { ...initializationInfo };
    },

    verifyIdToken(idToken) {
      return sdk.getAuth(getFirebaseAdminApp()).verifyIdToken(idToken, true);
    },

    getFirestore() {
      return sdk.getFirestore(getFirebaseAdminApp());
    }
  };
}

const firebaseAdminManager = createFirebaseAdminManager();

export function initializeFirebaseAdmin() {
  return firebaseAdminManager.initialize();
}

export async function verifyFirebaseIdToken(idToken) {
  return firebaseAdminManager.verifyIdToken(idToken);
}

export function getFirebaseAdminFirestore() {
  return firebaseAdminManager.getFirestore();
}
