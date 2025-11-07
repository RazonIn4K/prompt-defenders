import { afterEach, beforeAll, vi } from "vitest";

beforeAll(() => {
  vi.stubEnv("NODE_ENV", "test");
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.stubEnv("NODE_ENV", "test");
});
