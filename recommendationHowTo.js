import { METHOD_POOL } from "./methodPool.js";

// Case/outer whitespace are harmless. Only the explicitly renamed rest method
// has a historical alias; do not guess aliases or match substrings.
const identity = value => typeof value === "string" ? value.trim().toLowerCase() : null;

const postLearningRest = METHOD_POOL.find(method => method.name === "Post-Learning Rest");

/** Preserve historical storage; normalize this one renamed identity at read time. */
export function getCanonicalRecommendationMethodName(name) {
  return identity(name) === "sleep after studying"
    ? postLearningRest.name
    : name;
}

/** Correct this method's display and safety guidance without changing personalized reasoning.
 * @template {{name: string}} T
 * @param {T} method
 */
export function getReviewedMethodPresentation(method) {
  return identity(getCanonicalRecommendationMethodName(method.name)) === identity(postLearningRest.name)
    ? { ...method, name: postLearningRest.name, branch: postLearningRest.branch, warning: postLearningRest.warning }
    : method;
}

/** @param {readonly { name: string, branch: string, how_to_use: string[] }[]} pool */
export function createMethodInstructionLookup(pool) {
  const methods = new Map();
  for (const method of pool) {
    const key = identity(method.name);
    if (!key || methods.has(key)) throw new Error("Ambiguous method catalog identity");
    if (!Array.isArray(method.how_to_use) || method.how_to_use.length < 3 || method.how_to_use.length > 4
      || Array.from(method.how_to_use).some(step => typeof step !== "string" || !step.trim() || step.length > 400)) {
      throw new Error("Invalid reviewed method instructions");
    }
    methods.set(key, { name: method.name, branch: method.branch, steps: [...method.how_to_use] });
  }
  /** @param {unknown} name @param {unknown} [branch] */
  function lookup(name, branch) {
    const method = methods.get(identity(name));
    if (!method || (branch !== undefined && identity(branch) !== identity(method.branch))) return null;
    return [...method.steps];
  }
  return lookup;
}

const reviewedHowTo = createMethodInstructionLookup(METHOD_POOL);
export function getReviewedHowTo(name, branch) {
  return reviewedHowTo(getCanonicalRecommendationMethodName(name), branch);
}

/** Enrich only after validating model output. Canonical steps always win.
 * @template {{recommended_methods: {name: string, branch: string}[]}} T
 * @param {T} result
 */
export function attachRecommendationHowTo(result) {
  const seen = new Set();
  return { ...result, recommended_methods: result.recommended_methods.map(method => {
    const key = identity(getCanonicalRecommendationMethodName(method.name));
    const steps = getReviewedHowTo(method.name, method.branch);
    if (!steps || seen.has(key)) throw new Error("Unknown, ambiguous or repeated recommended method");
    seen.add(key);
    return { ...getReviewedMethodPresentation(method), how_to_use: steps };
  }) };
}

export function hasReviewedHowTo(method) {
  const steps = getReviewedHowTo(method.name, method.branch);
  return steps !== null && Array.isArray(method.how_to_use)
    && steps.length === method.how_to_use.length
    && steps.every((step, index) => step === method.how_to_use[index]);
}
