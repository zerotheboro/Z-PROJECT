import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import { METHOD_POOL } from "./methodPool.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

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

// 1. Create compact version
const COMPACT_METHOD_POOL = METHOD_POOL.map((method) => ({
  n: method.name,
  b: method.branch,
  c: method.category,
  f: method.best_for,
  d: method.description,
  w: method.warning
}));
// Now you know how save token but also give same context
// 2. Create static method context
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

app.post("/api/recommend", async (req, res) => {
  try {
    const { biggestProblem, methodQuestion, extraContext } = req.body;

    const userPrompt = buildUserPrompt({
      biggestProblem,
      methodQuestion,
      extraContext
    });

    const response = await client.responses.create({
      model: "gpt-5.4-mini",
      instructions: SYSTEM_PROMPT,
      input: userPrompt,
      text: {
        format: {
          type: "json_schema",
          name: "edulience_recommendation",
          schema: recommendationSchema,
          strict: true
        }
      }
    });

    const result = JSON.parse(response.output_text);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to get recommendation" });
  }
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});