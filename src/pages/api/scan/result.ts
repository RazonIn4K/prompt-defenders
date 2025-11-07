/**
 * GET /api/scan/result?id=<queueId>
 *
 * Fetch async deep analysis result
 * - Returns 202 (processing), 200 (complete), or 404 (not found)
 * - Includes status and result data when available
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { authenticateRequest } from "../../../lib/auth";
import { getJobStatus } from "../../../lib/queue";

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
      return res.status(404).json({
        success: false,
        error: "Job not found. It may have expired (24 hour TTL).",
      });
    }

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
        return res.status(500).json({
          success: false,
          error: "Unknown job status",
        });
    }
  } catch (error) {
    console.error("API error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}
