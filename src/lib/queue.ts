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
import { addBreadcrumb } from "./monitoring";

const QUEUE_PENDING_KEY = "queue:pending";
const QUEUE_RETRY_KEY = "queue:retry";

const MAX_ATTEMPTS = Number.parseInt(
  process.env.DEEP_ANALYSIS_MAX_ATTEMPTS ?? "3",
  10
);
const BACKOFF_BASE_MS = Number.parseInt(
  process.env.DEEP_ANALYSIS_BACKOFF_BASE_MS ?? "2000",
  10
);
const BACKOFF_CAP_MS = Number.parseInt(
  process.env.DEEP_ANALYSIS_BACKOFF_CAP_MS ?? "30000",
  10
);

const JOB_TTL_SECONDS = 86400; // 24 hours

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
  attempts: number;
  maxAttempts: number;
  lastAttemptAt?: string;
  lastError?: string;
  result?: any; // Deep analysis result (when completed)
  error?: string; // Error message (when failed)
  metadata?: Record<string, any>; // Additional metadata
}

export interface UpdateJobOptions {
  result?: any;
  error?: string;
  attempts?: number;
  lastAttemptAt?: string;
  lastError?: string;
  metadata?: Record<string, any>;
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
    addBreadcrumb({
      category: "queue",
      message: "Queue unavailable - Redis not configured",
      level: "warning",
    });
    return null;
  }

  const jobId = randomUUID();
  const job: QueueJob = {
    id: jobId,
    inputHash,
    inputLength,
    timestamp: new Date().toISOString(),
    status: "pending",
    attempts: 0,
    maxAttempts: Math.max(1, MAX_ATTEMPTS),
    metadata,
  };

  try {
    // Store job with 24 hour TTL
    await client.setex(`queue:job:${jobId}`, JOB_TTL_SECONDS, JSON.stringify(job));

    // Add to pending queue (list)
    await client.lpush(QUEUE_PENDING_KEY, jobId);

    console.log(`✅ Enqueued job ${jobId} for deep analysis`);
    addBreadcrumb({
      category: "queue",
      message: "Job enqueued",
      data: { jobId, inputLength },
      level: "info",
    });
    return jobId;
  } catch (error) {
    console.error("Failed to enqueue job:", error);
    addBreadcrumb({
      category: "queue",
      message: "Failed to enqueue job",
      data: { jobId, error: (error as Error).message },
      level: "error",
    });
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
      addBreadcrumb({
        category: "queue",
        message: "Job not found",
        data: { jobId },
        level: "warning",
      });
      return null;
    }

    const job = JSON.parse(data) as QueueJob;
    if (typeof job.attempts !== "number") {
      job.attempts = 0;
    }
    if (typeof job.maxAttempts !== "number") {
      job.maxAttempts = Math.max(1, MAX_ATTEMPTS);
    }
    return job;
  } catch (error) {
    console.error("Failed to get job status:", error);
    addBreadcrumb({
      category: "queue",
      message: "Failed to get job status",
      data: { jobId, error: (error as Error).message },
      level: "error",
    });
    return null;
  }
}

/**
 * Update job status with optional metadata updates
 * @param jobId - Job ID
 * @param status - New status
 * @param options - Additional job property updates
*/
export async function updateJobStatus(
  jobId: string,
  status: QueueJob["status"],
  options: UpdateJobOptions = {}
): Promise<boolean> {
  const client = getRedisClient();
  if (!client) {
    return false;
  }

  try {
    const existingData = await client.get<string>(`queue:job:${jobId}`);
    if (!existingData) {
      console.error(`Job ${jobId} not found`);
      addBreadcrumb({
        category: "queue",
        message: "Job not found for update",
        data: { jobId },
        level: "error",
      });
      return false;
    }

    const job: QueueJob = JSON.parse(existingData);
    job.status = status;
    if (options.result !== undefined) {
      job.result = options.result;
    }

    if (options.error !== undefined) {
      job.error = options.error;
    }

    if (options.attempts !== undefined) {
      job.attempts = options.attempts;
    }

    if (options.lastAttemptAt !== undefined) {
      job.lastAttemptAt = options.lastAttemptAt;
    }

    if (options.lastError !== undefined) {
      job.lastError = options.lastError;
    }

    if (options.metadata !== undefined) {
      job.metadata = options.metadata;
    }

    // Update with 24 hour TTL
    await client.setex(`queue:job:${jobId}`, JOB_TTL_SECONDS, JSON.stringify(job));

    console.log(`✅ Updated job ${jobId} status to ${status}`);
    addBreadcrumb({
      category: "queue",
      message: "Job status updated",
      data: { jobId, status, hasError: !!options.error },
      level: status === "failed" ? "error" : "info",
    });
    return true;
  } catch (error) {
    console.error("Failed to update job status:", error);
    addBreadcrumb({
      category: "queue",
      message: "Failed to update job status",
      data: { jobId, error: (error as Error).message },
      level: "error",
    });
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
    const jobId = await client.rpop<string>(QUEUE_PENDING_KEY);
    return jobId || null;
  } catch (error) {
    console.error("Failed to get next pending job:", error);
    addBreadcrumb({
      category: "queue",
      message: "Failed to dequeue job",
      data: { error: (error as Error).message },
      level: "error",
    });
    return null;
  }
}

/**
 * Schedule a job for retry using exponential backoff.
 * @param jobId - Job identifier.
 * @param delayMs - Delay in milliseconds before retry becomes available.
 */
export async function scheduleJobRetry(jobId: string, delayMs: number): Promise<boolean> {
  const client = getRedisClient();
  if (!client) {
    return false;
  }

  try {
    const retryTimestamp = Date.now() + delayMs;
    await client.zadd(QUEUE_RETRY_KEY, {
      score: retryTimestamp,
      member: jobId,
    });
    console.log(`⏳ Scheduled retry for job ${jobId} in ${delayMs}ms`);
    return true;
  } catch (error) {
    console.error("Failed to schedule job retry:", error);
    return false;
  }
}

/**
 * Release jobs whose retry delay has elapsed back into the pending queue.
 * @returns Number of jobs released.
 */
export async function releaseScheduledJobs(): Promise<number> {
  const client = getRedisClient();
  if (!client) {
    return 0;
  }

  try {
    const now = Date.now();
    const dueJobs = (await client.zrange(QUEUE_RETRY_KEY, 0, now, {
      byScore: true,
    })) as string[];

    if (dueJobs.length === 0) {
      return 0;
    }

    const pipeline = client.multi();
    for (const jobId of dueJobs) {
      pipeline.lpush(QUEUE_PENDING_KEY, jobId);
    }
    pipeline.zremrangebyscore(QUEUE_RETRY_KEY, 0, now);
    await pipeline.exec();

    console.log(`🔁 Released ${dueJobs.length} job(s) back to pending queue`);
    return dueJobs.length;
  } catch (error) {
    console.error("Failed to release scheduled jobs:", error);
    return 0;
  }
}

/**
 * Compute an exponential backoff delay with optional cap.
 * @param attempt - Attempt count (1-indexed).
 * @param baseMs - Base delay in milliseconds.
 * @param capMs - Maximum delay in milliseconds.
 */
export function computeBackoffDelay(
  attempt: number,
  baseMs: number = BACKOFF_BASE_MS,
  capMs: number = BACKOFF_CAP_MS
): number {
  if (attempt <= 1) {
    return Math.min(baseMs, capMs);
  }

  const delay = baseMs * 2 ** (attempt - 1);
  return Math.min(delay, capMs);
}

export function getQueueDefaults() {
  return {
    maxAttempts: Math.max(1, MAX_ATTEMPTS),
    backoffBaseMs: BACKOFF_BASE_MS,
    backoffCapMs: BACKOFF_CAP_MS,
  };
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
  addBreadcrumb({
    category: "queue",
    message: "Starting deep analysis",
    data: { inputHash: inputHash.substring(0, 8) + "..." },
    level: "info",
  });

  // TODO: Replace with actual LLM API call
  // For now, simulate processing delay
  await new Promise((resolve) => setTimeout(resolve, 2000));

  addBreadcrumb({
    category: "queue",
    message: "Deep analysis completed",
    data: { inputHash: inputHash.substring(0, 8) + "..." },
    level: "info",
  });

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
