/**
 * Background worker for async deep analysis queue processing
 *
 * Features:
 * - Exponential backoff retry logic (3 attempts)
 * - DLQ (Dead Letter Queue) for failed jobs
 * - Sentry breadcrumbs and error tracking
 * - Graceful shutdown handling
 */

import { getNextPendingJob, getJobStatus, updateJobStatus, performDeepAnalysis, QueueJob } from "./queue";

// Worker configuration
const WORKER_CONFIG = {
  pollIntervalMs: 5000, // Poll every 5 seconds
  maxRetries: 3,
  baseBackoffMs: 1000, // Start with 1 second
  maxBackoffMs: 30000, // Max 30 seconds
};

let isRunning = false;
let workerInterval: NodeJS.Timeout | null = null;

/**
 * Calculate exponential backoff delay
 * @param attempt - Retry attempt number (0-indexed)
 * @returns Delay in milliseconds
 */
function calculateBackoff(attempt: number): number {
  const delay = Math.min(
    WORKER_CONFIG.baseBackoffMs * Math.pow(2, attempt),
    WORKER_CONFIG.maxBackoffMs
  );
  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 0.3 * delay;
  return Math.floor(delay + jitter);
}

/**
 * Add Sentry breadcrumb for queue operations
 * @param message - Breadcrumb message
 * @param data - Additional data
 * @param level - Severity level
 */
function addSentryBreadcrumb(
  message: string,
  data?: Record<string, any>,
  level: "info" | "warning" | "error" = "info"
): void {
  // Only add breadcrumb if Sentry is available
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

  // Always log for debugging
  const logFn = level === "error" ? console.error : level === "warning" ? console.warn : console.log;
  logFn(`[Worker Breadcrumb] ${message}`, data || "");
}

/**
 * Report error to Sentry
 * @param error - Error object
 * @param context - Additional context
 */
function reportErrorToSentry(error: Error, context?: Record<string, any>): void {
  if (typeof window !== "undefined" && (window as any).Sentry) {
    (window as any).Sentry.captureException(error, { extra: context });
  } else if (global && (global as any).Sentry) {
    (global as any).Sentry.captureException(error, { extra: context });
  }
  console.error("Worker error:", error, context);
}

/**
 * Process a single job with retry logic
 * @param jobId - Job ID to process
 * @returns Success status
 */
async function processJob(jobId: string): Promise<boolean> {
  addSentryBreadcrumb("Processing job", { jobId }, "info");

  try {
    // Get job details
    const job = await getJobStatus(jobId);
    if (!job) {
      addSentryBreadcrumb("Job not found", { jobId }, "warning");
      return false;
    }

    // Check if already processed
    if (job.status === "completed" || job.status === "failed") {
      addSentryBreadcrumb("Job already processed", { jobId, status: job.status }, "info");
      return true;
    }

    // Update to processing status
    await updateJobStatus(jobId, "processing");
    addSentryBreadcrumb("Job status updated to processing", { jobId }, "info");

    // Retry loop with exponential backoff
    let lastError: Error | null = null;
    const retryAttempts = (job.metadata?.retryAttempts as number) || 0;

    for (let attempt = retryAttempts; attempt < WORKER_CONFIG.maxRetries; attempt++) {
      try {
        // Perform deep analysis
        const result = await performDeepAnalysis(job.inputHash, job.metadata);

        // Update job with success result
        await updateJobStatus(jobId, "completed", result);
        addSentryBreadcrumb("Job completed successfully", { jobId, attempt }, "info");
        return true;
      } catch (error) {
        lastError = error as Error;
        addSentryBreadcrumb(
          "Job attempt failed",
          { jobId, attempt, error: lastError.message },
          "warning"
        );

        // If not the last attempt, wait with exponential backoff
        if (attempt < WORKER_CONFIG.maxRetries - 1) {
          const backoffMs = calculateBackoff(attempt);
          console.log(`Retrying job ${jobId} in ${backoffMs}ms (attempt ${attempt + 1}/${WORKER_CONFIG.maxRetries})`);

          // Update retry metadata
          await updateJobStatus(jobId, "processing", undefined, undefined);
          if (job.metadata) {
            job.metadata.retryAttempts = attempt + 1;
            job.metadata.lastError = lastError.message;
          }

          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
      }
    }

    // All retries exhausted - move to DLQ (failed status)
    const errorMessage = lastError?.message || "Unknown error after retries";
    await updateJobStatus(jobId, "failed", undefined, errorMessage);

    addSentryBreadcrumb(
      "Job moved to DLQ after retries exhausted",
      { jobId, error: errorMessage },
      "error"
    );

    reportErrorToSentry(
      new Error(`Job ${jobId} failed after ${WORKER_CONFIG.maxRetries} retries: ${errorMessage}`),
      { jobId, inputHash: job.inputHash }
    );

    return false;
  } catch (error) {
    const err = error as Error;
    addSentryBreadcrumb(
      "Fatal error processing job",
      { jobId, error: err.message },
      "error"
    );
    reportErrorToSentry(err, { jobId });
    return false;
  }
}

/**
 * Worker loop - polls for pending jobs and processes them
 */
async function workerLoop(): Promise<void> {
  if (!isRunning) return;

  try {
    addSentryBreadcrumb("Worker polling for jobs", {}, "info");

    // Get next pending job
    const jobId = await getNextPendingJob();

    if (jobId) {
      console.log(`Worker picked up job: ${jobId}`);
      await processJob(jobId);
    } else {
      // No jobs in queue
      addSentryBreadcrumb("No pending jobs", {}, "info");
    }
  } catch (error) {
    const err = error as Error;
    addSentryBreadcrumb("Worker loop error", { error: err.message }, "error");
    reportErrorToSentry(err);
  }
}

/**
 * Start the worker
 */
export function startWorker(): void {
  if (isRunning) {
    console.warn("Worker already running");
    return;
  }

  console.log("Starting worker...");
  isRunning = true;
  addSentryBreadcrumb("Worker started", {}, "info");

  // Start polling loop
  workerInterval = setInterval(workerLoop, WORKER_CONFIG.pollIntervalMs);

  // Run immediately on start
  workerLoop();
}

/**
 * Stop the worker gracefully
 */
export function stopWorker(): void {
  if (!isRunning) {
    console.warn("Worker not running");
    return;
  }

  console.log("Stopping worker...");
  isRunning = false;
  addSentryBreadcrumb("Worker stopping", {}, "info");

  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
  }

  console.log("Worker stopped");
}

/**
 * Get worker status
 */
export function getWorkerStatus(): { running: boolean; config: typeof WORKER_CONFIG } {
  return {
    running: isRunning,
    config: WORKER_CONFIG,
  };
}

// Graceful shutdown on process termination
if (typeof process !== "undefined") {
  process.on("SIGTERM", stopWorker);
  process.on("SIGINT", stopWorker);
}
