import { readFileSync } from "node:fs";
import { compile } from "sass";
import { parse } from "postcss";
import { expect, it } from "vitest";

const training = compile("src/quiz/TrainingExperience.scss").css;
const profile = compile("src/components/CumulativeProfile.scss").css;
const tokens = readFileSync("src/index.scss", "utf8");
const sheet = parse(training);
const profileSheet = parse(profile);
function styleFor(selector: string, media?: string, source = sheet) {
  const declarations: Record<string, string> = {};
  source.walkRules(rule => {
    const query = rule.parent?.type === "atrule" && "params" in rule.parent ? rule.parent.params : undefined;
    if (!rule.selectors.includes(selector) || query !== media) return;
    rule.walkDecls(declaration => { declarations[declaration.prop] = declaration.value; });
  });
  return declarations;
}
function contrast(first: number[], second: number[]) {
  const luminance = (rgb: number[]) => rgb.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)
    .reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + .05) / (values[1] + .05);
}
it("preserves the original brand tokens and restored profile accent", () => {
  expect(tokens).toMatch(/--tomato:\s*#F75A5A/i); expect(tokens).toMatch(/--darker-black:\s*#1A2634/i);
  expect(tokens).toMatch(/--complement-of-yellow:\s*#203E5F/i);
  expect(tokens).toMatch(/--energetic--yellow:\s*#FFD63A/i); expect(tokens).toMatch(/--lightblue:\s*#20b2aa/i);
  const ink = [26, 38, 52], tomato = [247, 90, 90], paper = [245, 245, 245];
  expect(contrast(ink, tomato)).toBeGreaterThanOrEqual(4.5); expect(contrast(ink, paper)).toBeGreaterThanOrEqual(7);
  expect(contrast(tomato.map((v, i) => .8 * v + .2 * ink[i]), paper)).toBeGreaterThanOrEqual(3);
  expect(profile).toContain("--cp-accent: var(--lightblue)");
  expect(training).not.toMatch(/--training-(?:paper|soft)/);
});
it("restores the original dark Training surfaces, card proportions and typography", () => {
  expect(styleFor(".training-page").background).toContain("radial-gradient(");
  expect(styleFor(".training-page").background).toContain("var(--darker-black)");
  expect(styleFor(".training-page").color).toBe("var(--font-color)");
  expect(styleFor(".training-page .training-hero")).toMatchObject({
    width: "min(1200px, 94vw)", padding: "clamp(2.5rem, 6vw, 6rem)",
    border: "2px solid var(--energetic--yellow)", background: "var(--complement-of-yellow)",
    "border-radius": "var(--radius)", "box-shadow": "var(--shadow)"
  });
  expect(styleFor(".training-page .training-entry-card")).toMatchObject({
    padding: "clamp(1.8rem, 4vw, 3rem)", border: "2px solid var(--lightblue)",
    background: "rgba(32, 62, 95, 0.72)", "border-radius": "var(--radius)", "box-shadow": "var(--shadow)"
  });
  expect(styleFor(".training-page .method-picker .method-picker-grid .method-picker-card")).toMatchObject({
    background: "var(--darker-black)", color: "var(--font-color)", "min-height": "190px", padding: "var(--space-2)"
  });
  expect(styleFor(".training-page .method-picker-card strong")).toMatchObject({
    color: "var(--lightblue)", "font-family": "var(--font-heading)", "font-size": "1.7rem", "font-weight": "400"
  });
  sheet.walkRules(rule => {
    if (!rule.selectors.some(selector => selector.includes(".training-page"))) return;
    rule.walkDecls(declaration => {
      expect(declaration.value).not.toMatch(/var\(--training-(?:paper|soft)\)/);
      expect(declaration.prop).not.toMatch(/^--training-(?:paper|soft)$/);
    });
  });
});
it("retains functional labels with the original picker palette and selected/disabled states", () => {
  expect(training).toContain(".method-picker-description"); expect(training).toContain(".method-availability-badge");
  expect(training).not.toContain(".method-picker-card > span:last-child");
  expect(styleFor(".training-page .method-picker-card .method-picker-description").color).toBe("rgba(245, 245, 245, 0.72)");
  // Preserve the current working-tree coral badge; the card repair does not
  // replace the owner's palette with a different availability colour.
  expect(styleFor(".training-page .method-availability-badge").background).toBe("#F75A5A");
  expect(styleFor(".training-page .method-picker .method-picker-grid .method-picker-card.selected")).toMatchObject({
    "border-color": "var(--energetic--yellow)", background: "rgba(238, 197, 80, 0.12)"
  });
  expect(styleFor(".training-page .method-picker-actions button:disabled").opacity).toBe("0.4");
  expect(training).toMatch(/\.method-picker-name\s*\{[^}]*flex-wrap: wrap;/);
});
it("retains the original two/three-column desktop grids and single-column mobile layout", () => {
  expect(styleFor(".training-page .training-entry-options")["grid-template-columns"]).toBe("repeat(2, minmax(0, 1fr))");
  expect(styleFor(".training-page .method-picker-grid")["grid-template-columns"]).toBe("repeat(3, minmax(0, 1fr))");
  expect(styleFor(".training-page", "(max-width: 720px)").padding).toBe("1rem 10px 5rem");
  for (const selector of [".training-page .training-entry-options", ".training-page .method-picker-grid"])
    expect(styleFor(selector, "(max-width: 720px)")["grid-template-columns"]).toBe("1fr");
});
it("lets picker cards grow with readable content and uses page scrolling instead of a clipped nested viewport", () => {
  expect(styleFor(".training-page .method-picker-groups")).toMatchObject({ "max-height": "none", overflow: "visible" });
  expect(styleFor(".training-page .method-picker .method-picker-grid .method-picker-card")).toMatchObject({
    height: "auto", "max-height": "none", "min-width": "0", width: "100%", "white-space": "normal", "overflow-wrap": "anywhere", margin: "0", "box-shadow": "var(--shadow)"
  });
  expect(training).not.toContain(".method-picker-entry");
  expect(training).not.toContain(".method-video-test-action");
  expect(training).not.toContain(".individual-video-testing");
  expect(styleFor(".training-page .method-picker-actions").position).toBe("static");
  expect(styleFor(".training-page .method-picker .method-picker-grid .method-picker-card:disabled").opacity).toBe("1");
});
it("keeps the normal video and passage in the study panel with a single mobile column", () => {
  expect(styleFor(".two-x-economics-study")["grid-template-columns"]).toBe("minmax(0, 1.15fr) minmax(0, 1fr)");
  expect(styleFor(".two-x-economics-study", "(max-width: 720px)")["grid-template-columns"]).toBe("minmax(0, 1fr)");
  expect(styleFor(".economics-video-player iframe")).toMatchObject({ width: "100%", height: "auto", "aspect-ratio": "16/9" });
});
it("restores original dark Baseline, Lab, Match, Reflection and dialog surfaces", () => {
  expect(styleFor(".assessment.assessment-v2").background).toContain("var(--darker-black)");
  expect(styleFor(".assessment.assessment-v2").color).toBe("var(--font-color)");
  for (const stage of ["learning-situation", "baseline-challenge", "method-introduction", "method-lab", "method-match", "reflection"]) {
    expect(styleFor(`.assessment.assessment-v2 .${stage}`)).toMatchObject({
      width: "min(920px, 96vw)", padding: "clamp(1.8rem, 5vw, 4rem)",
      background: "var(--complement-of-yellow)", border: "2px solid var(--lightblue)", "box-shadow": "var(--shadow)"
    });
    expect(styleFor(`.assessment.assessment-v2 .${stage}`, "(max-width: 720px)")).toMatchObject({
      width: "100%", padding: "1.5rem 1rem"
    });
  }
  expect(styleFor(".assessment.assessment-v2 button")).toMatchObject({
    background: "var(--energetic--yellow)", color: "var(--darker-black)", "box-shadow": "0 5px 0 rgba(0, 0, 0, 0.9)"
  });
  expect(styleFor(".assessment.assessment-v2 .assessment-option.selected")).toMatchObject({
    background: "var(--energetic--yellow)", color: "var(--darker-black)"
  });
  expect(styleFor(".assessment.assessment-v2 .option-grid", "(max-width: 720px)")["grid-template-columns"]).toBe("1fr");
  expect(styleFor(".training-dialog")).toMatchObject({ background: "var(--darkblue, #111827)", color: "var(--font-color)" });
});
it("restores the recorded Profile hero, yellow actions, original workspace and spacing", () => {
  expect(styleFor(".profile-workspace", undefined, profileSheet)).toMatchObject({ background: "var(--lightblue)", "padding-top": "6.5rem" });
  expect(styleFor(".cumulative-profile", undefined, profileSheet).background).toBe("var(--lightblue)");
  expect(styleFor(".cumulative-profile .cumulative-hero", undefined, profileSheet)).toMatchObject({
    background: "var(--darker-black)", color: "var(--font-color)", padding: "var(--space-3)", "box-shadow": "var(--shadow)"
  });
  expect(styleFor(".cumulative-profile .profile-primary-action", undefined, profileSheet)).toMatchObject({
    background: "var(--energetic--yellow)", color: "var(--darker-black)", "box-shadow": "var(--shadow)"
  });
  expect(styleFor(".cumulative-profile .profile-layout", undefined, profileSheet)["grid-template-columns"]).toBe("218px minmax(0, 1fr)");
  expect(styleFor(".cumulative-profile .profile-layout", "(max-width: 800px)", profileSheet)["grid-template-columns"]).toBe("minmax(0, 1fr)");
});
it("keeps responsive Economics images readable on restored dark screens and retains profile focus styling", () => {
  expect(training).toMatch(/\.economics-topic-image img\s*\{[^}]*inline-size: 100%;[^}]*block-size: auto;/);
  expect(styleFor(".economics-topic-image").color).toBe("inherit");
  expect(profile).toMatch(/:focus-visible\s*\{[^}]*outline: 3px solid var\(--tomato\)/);
  expect(profile).toContain("@media (max-width:");
});
