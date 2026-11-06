import { describe, expect, it } from "vitest";
import { METHOD_POOL } from "../../methodPool.js";
import { attachRecommendationHowTo, createMethodInstructionLookup, getReviewedHowTo, getReviewedMethodPresentation, hasReviewedHowTo } from "../../recommendationHowTo.js";

const names = ["Prime Question", "Pomodoro Technique", "Peripheral Vision", "Everything in 1 Place", "Auto Google", "Water Your Face / Body",
  "10 Minute Wall Stare", "Stroop Effect Exercise", "Short Workout", "Long-term Workout", "Structure Your Day", "Track Progress", "Brain Diet",
  "Header First", "Use a Pointer", "Spaced Learning", "Doodle Effect", "Incubation Effect", "Active Recall", "2X Video Speed", "Premack's Principle",
  "Interleaved Practice", "Story Telling", "Feynman Technique", "Memory Palace", "80/20 Rule", "One Sentence", "Divide Steps", "Derive Basics",
  "Leitner System", "Note-taking 4x4", "Abbreviation", "You vs Book Cycle", "Cornell Method", "Highlight"];

describe("reviewed recommendation instructions", () => {
  it("preserves the existing ordered catalog identities", () => {
    expect(METHOD_POOL.filter(method => !["Calm Start", "Post-Learning Rest"].includes(method.name)).map(method => method.name)).toEqual(names);
    expect(METHOD_POOL).toHaveLength(names.length + 2);
    expect(new Set(METHOD_POOL.map(method => method.name.toLowerCase())).size).toBe(METHOD_POOL.length);
    expect(METHOD_POOL.reduce((count, method) => count + method.how_to_use.length, 0)).toBe(144);
    expect(METHOD_POOL.filter(method => method.name === "Post-Learning Rest")).toHaveLength(1);
    expect(METHOD_POOL.some(method => method.name === "Sleep After Studying")).toBe(false);
  });
  it.each([
    ["Calm Start", "pre-learn"], ["Post-Learning Rest", "meta-learn"]
  ])("enrolls %s in its approved branch without overstating its purpose", (name, branch) => {
    const method = METHOD_POOL.find(item => item.name === name)!;
    expect(method.branch).toBe(branch);
    expect(getReviewedHowTo(name, branch)).toEqual(method.how_to_use);
    if (name === "Calm Start") {
      expect(method.warning).toContain("not anxiety treatment");
      expect(method.warning).toContain("not anxiety treatment or a guaranteed focus boost");
    } else {
      expect(method.description).toContain("quiet wakeful rest");
      expect(method.description).toContain("without requiring sleep");
      expect(method.how_to_use[3]).toContain("You do not need to fall asleep.");
      expect(method.warning).toContain("not a proven optimal duration");
    }
  });
  it.each(METHOD_POOL)("provides 3–4 distinct, bounded actions for $name", method => {
    expect(method.how_to_use.length).toBeGreaterThanOrEqual(3);
    expect(method.how_to_use.length).toBeLessThanOrEqual(4);
    expect(new Set(method.how_to_use).size).toBe(method.how_to_use.length);
    for (const step of method.how_to_use) {
      expect(step.trim().length).toBeGreaterThan(20);
      expect(step.length).toBeLessThanOrEqual(400);
    }
    expect(getReviewedHowTo(method.name, method.branch)).toEqual(method.how_to_use);
  });
  it("rejects duplicate and case-ambiguous catalog identities", () => {
    expect(() => createMethodInstructionLookup([METHOD_POOL[0], METHOD_POOL[0]])).toThrow(/Ambiguous/);
    expect(() => createMethodInstructionLookup([METHOD_POOL[0], { ...METHOD_POOL[0], name: " prime question " }])).toThrow(/Ambiguous/);
  });
  it("rejects malformed instructions, including sparse steps", () => {
    for (const steps of [[], ["one"], new Array(3), ["", "two", "three"]])
      expect(() => createMethodInstructionLookup([{ ...METHOD_POOL[0], how_to_use: steps }])).toThrow(/Invalid/);
  });
  it("does not guess unknown names, ambiguous aliases, or incorrect branches", () => {
    expect(getReviewedHowTo("Active Recall", "memory")).toBeNull();
    for (const name of ["Recall", "Active-Recall", "Cornell Notes", "Unknown"])
      expect(getReviewedHowTo(name)).toBeNull();
    expect(getReviewedHowTo(" active recall ")).toEqual(getReviewedHowTo("Active Recall"));
  });
  it("overwrites model-supplied HOW, preserves order and original fields, and never mutates the input", () => {
    const methods = ["Active Recall", "Divide Steps", "Derive Basics"].map(name => {
      const method = METHOD_POOL.find(item => item.name === name)!;
      return { name, branch: method.branch, reason: `Personalized ${name}`, warning: "Original caution", how_to_use: ["Untrusted AI instructions"] };
    });
    const selection = { user_problem: "Mock situation", recommended_methods: methods, study_plan: "Original plan", final_note: "Original note" };
    const original = JSON.stringify(selection), enriched = attachRecommendationHowTo(selection);
    expect(enriched.recommended_methods.map(method => method.name)).toEqual(methods.map(method => method.name));
    expect(enriched.recommended_methods.every(hasReviewedHowTo)).toBe(true);
    enriched.recommended_methods.forEach((method, index) => expect(method).toMatchObject({ ...methods[index], how_to_use: getReviewedHowTo(method.name) }));
    expect(JSON.stringify(selection)).toBe(original);
    const steps = getReviewedHowTo("Active Recall")!; steps[0] = "Changed caller copy";
    expect(getReviewedHowTo("Active Recall")![0]).not.toBe(steps[0]);
  });
  it("rejects unknown and repeated selections rather than inventing instructions", () => {
    const method = { name: "Active Recall", branch: "meta-learn", reason: "Reason", warning: "Warning" };
    for (const methods of [[{ ...method, name: "Unknown" }], [method, method]])
      expect(() => attachRecommendationHowTo({ recommended_methods: methods })).toThrow(/Unknown/);
  });
  it.each(["Sleep After Studying", "Post-Learning Rest"])("uses corrected canonical guidance for %s without mutating historical input", name => {
    const original = { name, branch: "meta-learn", reason: "My personalized reason", warning: "Go to bed after studying.", how_to_use: ["Fall asleep in two minutes."] };
    const before = JSON.stringify(original);
    const canonical = METHOD_POOL.find(method => method.name === "Post-Learning Rest")!;
    const displayed = getReviewedMethodPresentation(original);
    expect(displayed).toMatchObject({ name: canonical.name, branch: canonical.branch, reason: original.reason, warning: canonical.warning });
    expect(getReviewedHowTo(name)).toEqual(canonical.how_to_use);
    const enriched = attachRecommendationHowTo({ recommended_methods: [original] });
    expect(enriched.recommended_methods[0]).toMatchObject({ ...displayed, how_to_use: canonical.how_to_use });
    expect(enriched.recommended_methods.every(hasReviewedHowTo)).toBe(true);
    expect(JSON.stringify(original)).toBe(before);
  });
  it("rejects alias duplicates and wrong branches without creating another catalog method", () => {
    const old = { name: "Sleep After Studying", branch: "meta-learn" };
    expect(() => attachRecommendationHowTo({ recommended_methods: [old, { ...old, name: "Post-Learning Rest" }] })).toThrow(/repeated/);
    expect(() => attachRecommendationHowTo({ recommended_methods: [{ ...old, branch: "memory" }] })).toThrow(/Unknown/);
    expect(getReviewedHowTo("Sleep After")).toBeNull();
    expect(getReviewedHowTo("military sleep method")).toBeNull();
    expect(getReviewedHowTo("Progressive Muscle Relaxation")).toBeNull();
  });
  it("keeps the revised methods mechanically distinct and the triangle formula accurate", () => {
    expect(getReviewedHowTo("Divide Steps")!.join(" ")).toMatch(/in order.*fewer hints.*independently/);
    expect(getReviewedHowTo("Derive Basics")!.join(" ")).toContain("A = 1/2 ab sin(C)");
    expect(getReviewedHowTo("Derive Basics")!.join(" ")).not.toContain("cos(C)");
    expect(getReviewedHowTo("Everything in 1 Place")!.join(" ")).toMatch(/materials.*unrelated tabs.*visible list.*next time/);
  });
});
