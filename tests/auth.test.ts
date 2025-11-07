import { describe, expect, test, beforeEach, afterAll, vi } from "vitest";
import {
  authenticateRequest,
  getApiKeyFromHeaders,
  validateApiKey,
} from "../src/lib/auth";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  Object.keys(process.env).forEach((key) => {
    delete process.env[key];
  });
  Object.assign(process.env, ORIGINAL_ENV);
});

afterAll(() => {
  vi.unstubAllEnvs();
  Object.keys(process.env).forEach((key) => {
    delete process.env[key];
  });
  Object.assign(process.env, ORIGINAL_ENV);
});

describe("validateApiKey", () => {
  test("allows requests in development without API key", () => {
    vi.stubEnv("NODE_ENV", "development");
    const result = validateApiKey(undefined);
    expect(result).toEqual({ authenticated: true });
  });

  test("rejects when API_KEYS missing in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("API_KEYS", "");

    const result = validateApiKey(undefined);
    expect(result.authenticated).toBe(false);
    expect(result.reason).toBe("API authentication not configured");
  });

  test("authenticates when key matches configured set", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("API_KEYS", "test-key, another-key");

    const result = validateApiKey("another-key");
    expect(result.authenticated).toBe(true);
  });

  test("rejects invalid key in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("API_KEYS", "test-key");

    const result = validateApiKey("wrong-key");
    expect(result.authenticated).toBe(false);
    expect(result.reason).toBe("Invalid API key");
  });
});

describe("getApiKeyFromHeaders", () => {
  test("handles array headers and returns first key", () => {
    const key = getApiKeyFromHeaders({ "x-api-key": ["first", "second"] });
    expect(key).toBe("first");
  });

  test("detects case-insensitive header names", () => {
    const key = getApiKeyFromHeaders({ "X-Api-Key": "mixed" });
    expect(key).toBe("mixed");
  });
});

describe("authenticateRequest", () => {
  test("propagates validation result", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("API_KEYS", "alpha");

    const result = authenticateRequest({ "x-api-key": "alpha" });
    expect(result.authenticated).toBe(true);
  });
});
