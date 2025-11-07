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
import { addBreadcrumb, captureException, initializeMonitoring } from "./monitoring";

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
 * Process a single job with retry logic
 * @param jobId - Job ID to process
 * @returns True if successful, false if failed after all retries
 */
async function processJob(jobId: string): Promise<boolean> {
  addBreadcrumb({
    category: "worker",
    message: "Processing job",
    data: { jobId },
    level: "info",
  });

  try {
    // Get job details
    const job = await getJobStatus(jobId);
    if (!job) {
      addBreadcrumb({
        category: "worker",
        message: "Job not found",
        data: { jobId },
        level: "warning",
      });
      return false;
    }

    // Check if already processed
    if (job.status === "completed" || job.status === "failed") {
      addBreadcrumb({
        category: "worker",
        message: "Job already processed",
        data: { jobId, status: job.status },
        level: "info",
      });
      return true;
    }

    // Update to processing status
    await updateJobStatus(jobId, "processing");
    addBreadcrumb({
    category: "worker",
    message: "Job status updated to processing",
    data: { jobId },
    level: "info",
  });

    // Retry loop with exponential backoff
    let lastError: Error | null = null;
    const retryAttempts = (job.metadata?.retryAttempts as number) || 0;

    for (let attempt = retryAttempts; attempt < WORKER_CONFIG.maxRetries; attempt++) {
      try {
        // Perform deep analysis
        const result = await performDeepAnalysis(job.inputHash, job.metadata);

        // Update job with success result
        await updateJobStatus(jobId, "completed", { result });
        addBreadcrumb({
          category: "worker",
          message: "Job completed successfully",
          data: { jobId, attempt },
          level: "info",
        });
        return true;
      } catch (error) {
        lastError = error as Error;
        addBreadcrumb({
          category: "worker",
          message: "Job attempt failed",
          data: { jobId, attempt, error: lastError.message },
          level: "warning",
        });

        // If not the last attempt, wait with exponential backoff
        if (attempt < WORKER_CONFIG.maxRetries - 1) {
          const backoffMs = calculateBackoff(attempt);
          console.log(`Retrying job ${jobId} in ${backoffMs}ms (attempt ${attempt + 1}/${WORKER_CONFIG.maxRetries})`);

          // Update retry metadata
          await updateJobStatus(jobId, "processing", { attempts: attempt + 1, lastError: lastError.message, metadata: job.metadata });
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
    await updateJobStatus(jobId, "failed", { error: errorMessage });

    addBreadcrumb({
      category: "worker",
      message: "Job moved to DLQ after retries exhausted",
      data: { jobId, error: errorMessage },
      level: "error",
    });

    captureException(
      new Error(`Job ${jobId} failed after ${WORKER_CONFIG.maxRetries} retries: ${errorMessage}`),
      { jobId, inputHash: job.inputHash }
    );

    return false;
  } catch (error) {
    const err = error as Error;
    addBreadcrumb({
      category: "worker",
      message: "Fatal error processing job",
      data: { jobId, error: err.message },
      level: "error",
    });
    captureException(err, { jobId });
    return false;
  }
}

/**
 * Worker loop - polls for pending jobs and processes them
 */
async function workerLoop(): Promise<void> {
  if (!isRunning) return;

  try {
    addBreadcrumb({
      category: "worker",
      message: "Worker polling for jobs",
      level: "info",
    });

    // Get next pending job
    const jobId = await getNextPendingJob();

    if (jobId) {
      console.log(`Worker picked up job: ${jobId}`);
      await processJob(jobId);
    } else {
      // No jobs in queue
      addBreadcrumb({
        category: "worker",
        message: "No pending jobs",
        level: "info",
      });
    }
  } catch (error) {
    const err = error as Error;
    addBreadcrumb({
      category: "worker",
      message: "Worker loop error",
      data: { error: err.message },
      level: "error",
    });
    captureException(err);
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
  addBreadcrumb({
    category: "worker",
    message: "Worker started",
    level: "info",
  });

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
  addBreadcrumb({
    category: "worker",
    message: "Worker stopping",
    level: "info",
  });

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
