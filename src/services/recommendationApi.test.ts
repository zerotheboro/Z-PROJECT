import { describe, expect, it } from "vitest";
import { DEFAULT_RECOMMENDATION_API_BASE, resolveRecommendationApiBase } from "./recommendationApi";

const development = { DEV: true, PROD: false };
const production = { DEV: false, PROD: true };

describe("shared recommendation API routing", () => {
  it("defaults to Render in both production and development; localhost is never inferred", () => {
    for (const environment of [development, production, {}, { DEV: true, PROD: true }])
      expect(resolveRecommendationApiBase(undefined, environment)).toBe(DEFAULT_RECOMMENDATION_API_BASE);
  });
  it.each(["http://127.0.0.1:3001/", "http://localhost:3001", "http://[::1]:3001"])("allows explicit loopback HTTP only in development: %s", base => {
    expect(resolveRecommendationApiBase(undefined, { ...development, VITE_API_BASE_URL: base })).toBe(base.replace(/\/$/, ""));
    expect(() => resolveRecommendationApiBase(undefined, { ...production, VITE_API_BASE_URL: base })).toThrow(/configuration/);
  });
  it("normalizes a trusted HTTPS base and preserves an optional path prefix", () => {
    expect(resolveRecommendationApiBase(undefined, { ...production, VITE_API_BASE_URL: "https://api.example/prefix///" })).toBe("https://api.example/prefix");
    expect(resolveRecommendationApiBase("https://test.example/", production)).toBe("https://test.example");
  });
  it.each([
    "https://localhost", "https://localhost.", "https://sub.localhost", "https://127.0.0.2", "https://127.1", "https://2130706433",
    "https://0x7f000001", "https://[::1]", "https://[0:0:0:0:0:0:0:1]", "https://[::ffff:127.0.0.1]",
    "https://0.0.0.0", "https://[::]"
  ])("never routes production to loopback or unspecified addresses: %s", base => {
    expect(() => resolveRecommendationApiBase(base, production)).toThrow(/configuration/);
    expect(() => resolveRecommendationApiBase(base, { DEV: true, PROD: true })).toThrow(/configuration/);
  });
  it.each([
    "/api", "//api.example", "http://api.example", "javascript:alert(1)", "file:///tmp/api", "ftp://api.example",
    "https://user:password@api.example", "https://api.example?query=1", "https://api.example#fragment",
    "https://api.example?", "https://api.example#", "https://api.example/a b", "https:\\api.example"
  ])("rejects malformed, credential-bearing or insecure configuration without echoing it: %s", base => {
    expect(() => resolveRecommendationApiBase(base, development)).toThrow("Invalid recommendation API base URL configuration.");
  });
  it("rejects invalid types and never allows a missing development flag to enable loopback", () => {
    expect(() => resolveRecommendationApiBase(undefined, { VITE_API_BASE_URL: 42 })).toThrow(/configuration/);
    expect(() => resolveRecommendationApiBase("http://127.0.0.1:3001", { PROD: false })).toThrow(/configuration/);
  });
  it("never sends a public frontend to loopback even if a development build was mistakenly hosted there", () => {
    expect(() => resolveRecommendationApiBase("https://localhost:3001", development, "edulience.space")).toThrow(/configuration/);
    expect(() => resolveRecommendationApiBase("http://127.0.0.1:3001", development, "edulience.space")).toThrow(/configuration/);
    expect(resolveRecommendationApiBase("http://127.0.0.1:3001", development, "localhost")).toBe("http://127.0.0.1:3001");
  });
});
