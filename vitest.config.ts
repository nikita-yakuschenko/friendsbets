import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "tests/**/*.test.ts"],
    exclude: [
      "tests/e2e/**",
      "tests/perf/**",
      "node_modules/**",
      ".next/**",
      "coverage/**",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      reportsDirectory: "./coverage",
      include: ["src/lib/**/*.ts", "src/server/actions/**/*.ts"],
      exclude: [
        "**/*.test.ts",
        "**/*.test.tsx",
        "src/lib/**/test-cases.ts",
        "src/generated/**",
      ],
      thresholds: {
        "src/lib/invite-code.ts": { lines: 90, statements: 90, branches: 85 },
        "src/lib/game-path.ts": { lines: 100, statements: 100 },
        "src/lib/football-api/championat/football-score.ts": {
          lines: 100,
          statements: 100,
        },
        "src/lib/notification-preview.ts": {
          lines: 90,
          statements: 90,
        },
        "src/lib/logger.ts": { lines: 85, statements: 85 },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
