import {
  defineConfig
} from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    clearMocks: true,
    restoreMocks: true,
    include: [
      "src/**/*.test.{ts,tsx}"
    ]
  }
});
