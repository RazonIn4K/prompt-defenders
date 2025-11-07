/**
 * Queue management for async deep analysis
 * Uses Upstash Redis KV for lightweight serverless queue
 *
 * Privacy: Only stores inputHash, length, timestamp, and metadata
 * Never stores raw input text
 *
 * Includes Sentry breadcrumb tracking for observability
 */

import { Redis } from "@upstash/redis";
import { randomUUID } from "crypto";

/**
 * Add Sentry breadcrumb for queue operations
 */
function addQueueBreadcrumb(
  message: string,
  data?: Record<string, any>,
  level: "info" | "warning" | "error" = "info"
): void {
  // Check if Sentry is available (browser or server)
  if (typeof window !== "undefined" && (window as any).Sentry) {
    (window as any).Sentry.addBreadcrumb({
      category: "queue",
      message,
      data,
      level,
      timestamp: Date.now() / 1000,
    });
  } else if (global && (global as any).Sentry) {
    (global as any).Sentry.addBreadcrumb({
      category: "queue",
      message,
      data,
      level,
      timestamp: Date.now() / 1000,
    });
  }
}

// Initialize Upstash Redis client
let redis: Redis | null = null;

function getRedisClient(): Redis | null {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn(
      "⚠️  Upstash Redis not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN."
    );
    return null;
  }

  redis = new Redis({
    url,
    token,
  });

  return redis;
}

export interface QueueJob {
  id: string;
  inputHash: string;
  inputLength: number;
  timestamp: string;
  status: "pending" | "processing" | "completed" | "failed";
  result?: any; // Deep analysis result (when completed)
  error?: string; // Error message (when failed)
  metadata?: Record<string, any>; // Additional metadata
}

/**
 * Enqueue a job for deep analysis
 * @param inputHash - HMAC hash of input (for correlation only)
 * @param inputLength - Length of input text
 * @param metadata - Optional metadata
 * @returns Job ID for polling
 */
export async function enqueueDeepAnalysis(
  inputHash: string,
  inputLength: number,
  metadata?: Record<string, any>
): Promise<string | null> {
  const client = getRedisClient();
  if (!client) {
    console.warn("Queue not available - Upstash Redis not configured");
    addQueueBreadcrumb("Queue unavailable - Redis not configured", {}, "warning");
    return null;
  }

  const jobId = randomUUID();
  const job: QueueJob = {
    id: jobId,
    inputHash,
    inputLength,
    timestamp: new Date().toISOString(),
    status: "pending",
    metadata,
  };

  try {
    // Store job with 24 hour TTL
    await client.setex(`queue:job:${jobId}`, 86400, JSON.stringify(job));

    // Add to pending queue (list)
    await client.lpush("queue:pending", jobId);

    console.log(`✅ Enqueued job ${jobId} for deep analysis`);
    addQueueBreadcrumb("Job enqueued", { jobId, inputLength }, "info");
    return jobId;
  } catch (error) {
    console.error("Failed to enqueue job:", error);
    addQueueBreadcrumb("Failed to enqueue job", { jobId, error: (error as Error).message }, "error");
    return null;
  }
}

/**
 * Get job status and result
 * @param jobId - Job ID
 * @returns Job data or null if not found
 */
export async function getJobStatus(jobId: string): Promise<QueueJob | null> {
  const client = getRedisClient();
  if (!client) {
    return null;
  }

  try {
    const data = await client.get<string>(`queue:job:${jobId}`);
    if (!data) {
      addQueueBreadcrumb("Job not found", { jobId }, "warning");
      return null;
    }

    addQueueBreadcrumb("Job status retrieved", { jobId }, "info");
    return JSON.parse(data) as QueueJob;
  } catch (error) {
    console.error("Failed to get job status:", error);
    addQueueBreadcrumb("Failed to get job status", { jobId, error: (error as Error).message }, "error");
    return null;
  }
}

/**
 * Update job status
 * @param jobId - Job ID
 * @param status - New status
 * @param result - Optional result data
 * @param error - Optional error message
 */
export async function updateJobStatus(
  jobId: string,
  status: QueueJob["status"],
  result?: any,
  error?: string
): Promise<boolean> {
  const client = getRedisClient();
  if (!client) {
    return false;
  }

  try {
    const existingData = await client.get<string>(`queue:job:${jobId}`);
    if (!existingData) {
      console.error(`Job ${jobId} not found`);
      addQueueBreadcrumb("Job not found for update", { jobId }, "error");
      return false;
    }

    const job: QueueJob = JSON.parse(existingData);
    job.status = status;
    if (result) job.result = result;
    if (error) job.error = error;

    // Update with 24 hour TTL
    await client.setex(`queue:job:${jobId}`, 86400, JSON.stringify(job));

    console.log(`✅ Updated job ${jobId} status to ${status}`);
    addQueueBreadcrumb("Job status updated", { jobId, status, hasError: !!error }, status === "failed" ? "error" : "info");
    return true;
  } catch (error) {
    console.error("Failed to update job status:", error);
    addQueueBreadcrumb("Failed to update job status", { jobId, error: (error as Error).message }, "error");
    return false;
  }
}

/**
 * Get next pending job for processing
 * @returns Job ID or null if queue is empty
 */
export async function getNextPendingJob(): Promise<string | null> {
  const client = getRedisClient();
  if (!client) {
    return null;
  }

  try {
    const jobId = await client.rpop<string>("queue:pending");
    if (jobId) {
      addQueueBreadcrumb("Job dequeued", { jobId }, "info");
    }
    return jobId || null;
  } catch (error) {
    console.error("Failed to get next pending job:", error);
    addQueueBreadcrumb("Failed to dequeue job", { error: (error as Error).message }, "error");
    return null;
  }
}

/**
 * Simulate deep LLM analysis (placeholder for actual LLM integration)
 * In production, this would call an LLM API
 * @param inputHash - HMAC hash of input
 * @param metadata - Job metadata
 * @returns Analysis result
 */
export async function performDeepAnalysis(
  inputHash: string,
  metadata?: Record<string, any>
): Promise<any> {
  addQueueBreadcrumb("Starting deep analysis", { inputHash: inputHash.substring(0, 8) + "..." }, "info");

  // TODO: Replace with actual LLM API call
  // For now, simulate processing delay
  await new Promise((resolve) => setTimeout(resolve, 2000));

  addQueueBreadcrumb("Deep analysis completed", { inputHash: inputHash.substring(0, 8) + "..." }, "info");

  return {
    deepScore: 75,
    confidence: 0.85,
    reasoning: "Deep LLM analysis detected potential injection patterns with high confidence.",
    recommendations: [
      "Review context boundaries",
      "Implement input sanitization",
      "Monitor for similar patterns",
    ],
    modelUsed: "placeholder-llm-v1",
    analysisTimestamp: new Date().toISOString(),
  };
}
