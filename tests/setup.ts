import path from "node:path";
import { config } from "dotenv";
import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";

config({ path: path.resolve(process.cwd(), ".env.test.local") });
config({ path: path.resolve(process.cwd(), ".env") });

process.env.SESSION_SECRET ??= "test-session-secret-at-least-32-chars-long";
process.env.NEXT_PUBLIC_APP_URL ??= "http://localhost:3000";

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});
