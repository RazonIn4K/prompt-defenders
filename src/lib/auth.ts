/**
 * API Key Authentication
 *
 * Optional authentication for production environments
 * - Validates X-API-Key header against environment variable list
 * - Enforced in production, permissive in development
 * - Returns 401 on missing/invalid key in prod
 */

export interface AuthResult {
  authenticated: boolean;
  reason?: string;
}

/**
 * Validate API key from request header
 * @param apiKey - API key from X-API-Key header
 * @returns Authentication result
 */
export function validateApiKey(apiKey: string | undefined): AuthResult {
  const env = process.env.NODE_ENV || "development";
  const isProd = env === "production";

  // In development, authentication is permissive
  if (!isProd) {
    console.log("🔓 Development mode - API key validation skipped");
    return { authenticated: true };
  }

  // In production, require API key
  const apiKeysEnv = process.env.API_KEYS;

  if (!apiKeysEnv) {
    console.error("❌ API_KEYS environment variable not set in production");
    return {
      authenticated: false,
      reason: "API authentication not configured",
    };
  }

  // Parse comma-separated API keys
  const validKeys = apiKeysEnv
    .split(",")
    .map((key) => key.trim())
    .filter((key) => key.length > 0);

  if (validKeys.length === 0) {
    console.error("❌ No valid API keys configured");
    return {
      authenticated: false,
      reason: "API authentication not configured",
    };
  }

  // Check if API key was provided
  if (!apiKey || apiKey.trim().length === 0) {
    console.warn("⚠️  No API key provided in production request");
    return {
      authenticated: false,
      reason: "API key required in production. Provide X-API-Key header.",
    };
  }

  // Validate API key
  const isValid = validKeys.includes(apiKey.trim());

  if (!isValid) {
    console.warn("⚠️  Invalid API key provided");
    return {
      authenticated: false,
      reason: "Invalid API key",
    };
  }

  console.log("✅ API key validated successfully");
  return { authenticated: true };
}

/**
 * Get API key from request headers
 * Supports both X-API-Key and X-Api-Key (case variations)
 * @param headers - Request headers object
 * @returns API key or undefined
 */
export function getApiKeyFromHeaders(
  headers: Record<string, string | string[] | undefined>
): string | undefined {
  // Check various header case variations
  const apiKey =
    headers["x-api-key"] ||
    headers["X-API-Key"] ||
    headers["X-Api-Key"];

  if (Array.isArray(apiKey)) {
    return apiKey[0];
  }

  return apiKey;
}

/**
 * Middleware helper to validate API key from request
 * @param headers - Request headers
 * @returns Authentication result
 */
export function authenticateRequest(
  headers: Record<string, string | string[] | undefined>
): AuthResult {
  const apiKey = getApiKeyFromHeaders(headers);
  return validateApiKey(apiKey);
}
