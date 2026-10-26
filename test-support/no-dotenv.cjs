// Test process only: do not load the developer's .env during backend tests.
require("dotenv").config = () => ({ parsed: {} });
if (process.env.NODE_ENV === "test") {
  // Some legacy auth-only tests construct an unused OpenAI client. Satisfy its
  // constructor without a real credential, and prohibit external fetch calls.
  process.env.OPENAI_API_KEY = "offline-test-placeholder-not-a-real-key";
  const fetchLocal = globalThis.fetch;
  globalThis.fetch = (input, ...options) => {
    let target;
    try { target = new URL(typeof input === "string" || input instanceof URL ? input : input.url); }
    catch { return Promise.reject(new Error("Invalid offline test URL")); }
    if (!["127.0.0.1", "localhost", "[::1]"].includes(target.hostname)) {
      return Promise.reject(new Error("Non-local fetch is disabled in offline tests"));
    }
    return fetchLocal(input, ...options);
  };
}
