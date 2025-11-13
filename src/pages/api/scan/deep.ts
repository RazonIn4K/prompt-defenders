/**
 * POST /api/scan/deep
 *
 * Enqueue async deep LLM analysis
 * - Accepts inputHash and metadata
 * - Returns queueId for polling
 * - Does NOT store raw input (privacy-first)
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { authenticateRequest } from "../../../lib/auth";
import { checkRateLimit } from "../../../lib/ratelimit";
import { enqueueDeepAnalysis } from "../../../lib/queue";
import { addBreadcrumb, captureException } from "../../../lib/monitoring";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    // API Key Authentication
    const authResult = authenticateRequest(req.headers as Record<string, string>);
    if (!authResult.authenticated) {
      return res.status(401).json({
        success: false,
        error: authResult.reason || "Unauthorized",
      });
    }

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
    const { inputHash, inputLength, metadata } = req.body;

    if (!inputHash || typeof inputHash !== "string") {
      return res.status(400).json({
        success: false,
        error: "Invalid request. 'inputHash' field is required and must be a string.",
      });
    }

    if (!inputLength || typeof inputLength !== "number") {
      return res.status(400).json({
        success: false,
        error: "Invalid request. 'inputLength' field is required and must be a number.",
      });
    }

    // Enqueue deep analysis
    const queueId = await enqueueDeepAnalysis(inputHash, inputLength, metadata);

    if (!queueId) {
      addBreadcrumb({
        category: "api",
        message: "Queue service unavailable",
        level: "error",
        data: { endpoint: "/api/scan/deep" },
      });
      return res.status(503).json({
        success: false,
        error: "Queue service unavailable. Please try again later.",
      });
    }

    addBreadcrumb({
      category: "api",
      message: "Deep analysis job enqueued successfully",
      level: "info",
      data: {
        endpoint: "/api/scan/deep",
        queueId,
        inputLength,
      },
    });

    // Return queue ID for polling
    return res.status(202).json({
      success: true,
      queueId,
      status: "pending",
      message: "Deep analysis enqueued. Poll /api/scan/result?id=" + queueId,
      pollEndpoint: `/api/scan/result?id=${queueId}`,
    });
  } catch (error) {
    console.error("API error:", error);
    captureException(error, {
      endpoint: "/api/scan/deep",
      method: req.method,
    });
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}
