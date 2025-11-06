import type { NextApiRequest, NextApiResponse } from "next";
import { checkRateLimit } from "../../lib/ratelimit";
import { scanInput } from "../../lib/scanner";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    // Get client identifier (IP or forwarded IP)
    const identifier =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() ||
      req.socket.remoteAddress ||
      "unknown";

    // Check rate limit
    const { success: rateLimitOk, remaining } = await checkRateLimit(identifier);

    if (!rateLimitOk) {
      res.setHeader("X-RateLimit-Remaining", remaining?.toString() || "0");
      return res.status(429).json({
        success: false,
        error: "Rate limit exceeded. Please try again later.",
      });
    }

    res.setHeader("X-RateLimit-Remaining", remaining?.toString() || "unknown");

    // Validate request body
    const { input } = req.body;

    if (!input || typeof input !== "string") {
      return res.status(400).json({
        success: false,
        error: "Invalid request. 'input' field is required and must be a string.",
      });
    }

    // Limit input size (100KB)
    if (input.length > 100000) {
      return res.status(400).json({
        success: false,
        error: "Input too large. Maximum size is 100KB.",
      });
    }

    // Run scan
    const result = scanInput(input);

    // TODO: Queue async deeper LLM analysis (non-blocking)
    // await queueDeepAnalysis(result.meta.inputHash, result);

    // Return result
    return res.status(200).json(result);
  } catch (error) {
    console.error("API error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}
