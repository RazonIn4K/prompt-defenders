/**
 * GET /api/scan/result?id=<queueId>
 *
 * Fetch async deep analysis result
 * - Returns 202 (processing), 200 (complete), or 404 (not found)
 * - Includes status and result data when available
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { authenticateRequest } from "../../../lib/auth";
import { checkRateLimit } from "../../../lib/ratelimit";
import { getJobStatus } from "../../../lib/queue";
import { addBreadcrumb, captureException } from "../../../lib/monitoring";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET
  if (req.method !== "GET") {
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

    // Get queue ID from query
    const { id } = req.query;

    if (!id || typeof id !== "string") {
      return res.status(400).json({
        success: false,
        error: "Invalid request. 'id' query parameter is required.",
      });
    }

    // Fetch job status
    const job = await getJobStatus(id);

    if (!job) {
      addBreadcrumb({
        category: "api",
        message: "Job not found or expired",
        level: "warning",
        data: {
          endpoint: "/api/scan/result",
          jobId: id,
        },
      });
      return res.status(404).json({
        success: false,
        error: "Job not found. It may have expired (24 hour TTL).",
      });
    }

    addBreadcrumb({
      category: "api",
      message: "Job status queried",
      level: "info",
      data: {
        endpoint: "/api/scan/result",
        jobId: id,
        status: job.status,
      },
    });

    // Return appropriate status based on job state
    switch (job.status) {
      case "pending":
      case "processing":
        return res.status(202).json({
          success: true,
          status: job.status,
          message: "Analysis still in progress. Please poll again.",
          queueId: job.id,
          enqueuedAt: job.timestamp,
          attempts: job.attempts,
          lastAttemptAt: job.lastAttemptAt,
          lastError: job.lastError,
        });

      case "completed":
        return res.status(200).json({
          success: true,
          status: "completed",
          queueId: job.id,
          enqueuedAt: job.timestamp,
          result: job.result,
          meta: {
            inputHash: job.inputHash,
            inputLength: job.inputLength,
          },
          attempts: job.attempts,
          lastAttemptAt: job.lastAttemptAt,
        });

      case "failed":
        return res.status(200).json({
          success: false,
          status: "failed",
          queueId: job.id,
          enqueuedAt: job.timestamp,
          error: job.error || "Analysis failed",
          meta: {
            inputHash: job.inputHash,
            inputLength: job.inputLength,
          },
          attempts: job.attempts,
          lastAttemptAt: job.lastAttemptAt,
          lastError: job.lastError,
        });

      default:
        addBreadcrumb({
          category: "api",
          message: "Unknown job status encountered",
          level: "error",
          data: {
            endpoint: "/api/scan/result",
            jobId: id,
            status: job.status,
          },
        });
        return res.status(500).json({
          success: false,
          error: "Unknown job status",
        });
    }
  } catch (error) {
    console.error("API error:", error);
    captureException(error, {
      endpoint: "/api/scan/result",
      method: req.method,
      jobId: typeof req.query.id === "string" ? req.query.id : undefined,
    });
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}
