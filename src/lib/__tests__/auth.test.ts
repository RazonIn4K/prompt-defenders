/**
 * Unit tests for API key authentication
 *
 * Tests cover:
 * - Valid API key validation
 * - Invalid API key rejection
 * - Missing API key handling
 * - Multiple API keys support
 * - Development vs production mode
 * - Case-insensitive header matching
 */

import { validateApiKey, getApiKeyFromHeaders, authenticateRequest, AuthResult } from "../auth";

describe("API Key Authentication", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe("validateApiKey", () => {
    it("should allow requests in development mode without API key", () => {
      process.env.NODE_ENV = "development";
      const result = validateApiKey(undefined);
      expect(result.authenticated).toBe(true);
    });

    it("should reject requests in production mode without API_KEYS env var", () => {
      process.env.NODE_ENV = "production";
      delete process.env.API_KEYS;

      const result = validateApiKey("some-key");
      expect(result.authenticated).toBe(false);
      expect(result.reason).toContain("not configured");
    });

    it("should reject requests in production mode with empty API_KEYS", () => {
      process.env.NODE_ENV = "production";
      process.env.API_KEYS = "";

      const result = validateApiKey("some-key");
      expect(result.authenticated).toBe(false);
      expect(result.reason).toContain("not configured");
    });

    it("should reject requests in production mode without API key provided", () => {
      process.env.NODE_ENV = "production";
      process.env.API_KEYS = "key1,key2,key3";

      const result = validateApiKey(undefined);
      expect(result.authenticated).toBe(false);
      expect(result.reason).toContain("API key required");
    });

    it("should reject requests in production mode with empty API key", () => {
      process.env.NODE_ENV = "production";
      process.env.API_KEYS = "key1,key2,key3";

      const result = validateApiKey("");
      expect(result.authenticated).toBe(false);
      expect(result.reason).toContain("API key required");
    });

    it("should reject requests in production mode with invalid API key", () => {
      process.env.NODE_ENV = "production";
      process.env.API_KEYS = "key1,key2,key3";

      const result = validateApiKey("invalid-key");
      expect(result.authenticated).toBe(false);
      expect(result.reason).toBe("Invalid API key");
    });

    it("should accept requests in production mode with valid API key", () => {
      process.env.NODE_ENV = "production";
      process.env.API_KEYS = "key1,key2,key3";

      const result = validateApiKey("key2");
      expect(result.authenticated).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it("should accept requests with API key that has leading/trailing spaces", () => {
      process.env.NODE_ENV = "production";
      process.env.API_KEYS = "key1, key2 , key3";

      const result = validateApiKey("key2");
      expect(result.authenticated).toBe(true);
    });

    it("should handle single API key", () => {
      process.env.NODE_ENV = "production";
      process.env.API_KEYS = "single-key";

      const result = validateApiKey("single-key");
      expect(result.authenticated).toBe(true);
    });

    it("should handle API keys with special characters", () => {
      process.env.NODE_ENV = "production";
      process.env.API_KEYS = "key-with-dashes,key_with_underscores,key.with.dots";

      expect(validateApiKey("key-with-dashes").authenticated).toBe(true);
      expect(validateApiKey("key_with_underscores").authenticated).toBe(true);
      expect(validateApiKey("key.with.dots").authenticated).toBe(true);
    });
  });

  describe("getApiKeyFromHeaders", () => {
    it("should extract API key from x-api-key header (lowercase)", () => {
      const headers = { "x-api-key": "test-key" };
      const result = getApiKeyFromHeaders(headers);
      expect(result).toBe("test-key");
    });

    it("should extract API key from X-API-Key header (proper case)", () => {
      const headers = { "X-API-Key": "test-key" };
      const result = getApiKeyFromHeaders(headers);
      expect(result).toBe("test-key");
    });

    it("should extract API key from X-Api-Key header (mixed case)", () => {
      const headers = { "X-Api-Key": "test-key" };
      const result = getApiKeyFromHeaders(headers);
      expect(result).toBe("test-key");
    });

    it("should handle array of values and return first one", () => {
      const headers = { "x-api-key": ["key1", "key2"] };
      const result = getApiKeyFromHeaders(headers);
      expect(result).toBe("key1");
    });

    it("should return undefined when no API key header present", () => {
      const headers = { "content-type": "application/json" };
      const result = getApiKeyFromHeaders(headers);
      expect(result).toBeUndefined();
    });

    it("should prioritize x-api-key over other case variations", () => {
      const headers = {
        "x-api-key": "lowercase-key",
        "X-API-Key": "uppercase-key",
      };
      const result = getApiKeyFromHeaders(headers);
      expect(result).toBe("lowercase-key");
    });
  });

  describe("authenticateRequest", () => {
    it("should authenticate request with valid API key in production", () => {
      process.env.NODE_ENV = "production";
      process.env.API_KEYS = "valid-key-1,valid-key-2";

      const headers = { "x-api-key": "valid-key-1" };
      const result = authenticateRequest(headers);

      expect(result.authenticated).toBe(true);
    });

    it("should reject request with invalid API key in production", () => {
      process.env.NODE_ENV = "production";
      process.env.API_KEYS = "valid-key-1,valid-key-2";

      const headers = { "x-api-key": "invalid-key" };
      const result = authenticateRequest(headers);

      expect(result.authenticated).toBe(false);
      expect(result.reason).toBe("Invalid API key");
    });

    it("should accept request without API key in development", () => {
      process.env.NODE_ENV = "development";

      const headers = {};
      const result = authenticateRequest(headers);

      expect(result.authenticated).toBe(true);
    });

    it("should reject request without API key in production", () => {
      process.env.NODE_ENV = "production";
      process.env.API_KEYS = "key1,key2";

      const headers = {};
      const result = authenticateRequest(headers);

      expect(result.authenticated).toBe(false);
      expect(result.reason).toContain("API key required");
    });
  });

  describe("Security considerations", () => {
    it("should not expose API keys in error messages", () => {
      process.env.NODE_ENV = "production";
      process.env.API_KEYS = "secret-key-1,secret-key-2";

      const result = validateApiKey("wrong-key");

      expect(result.reason).not.toContain("secret-key-1");
      expect(result.reason).not.toContain("secret-key-2");
    });

    it("should handle undefined NODE_ENV as development", () => {
      delete process.env.NODE_ENV;

      const result = validateApiKey(undefined);
      expect(result.authenticated).toBe(true);
    });
  });
});
