import type { Breadcrumb } from "@sentry/types";
import {
  computeBackoffDelay,
  getJobStatus,
  getNextPendingJob,
  getQueueDefaults,
  performDeepAnalysis,
  releaseScheduledJobs,
  scheduleJobRetry,
  updateJobStatus,
  type UpdateJobOptions,
} from "./queue";
import { addBreadcrumb, captureException } from "./monitoring";

/**
 * Configuration for the deep analysis worker runtime.
 */
export interface WorkerConfig {
  /** Delay applied when the queue is empty (milliseconds). */
  idleDelayMs?: number;
  /** Override max attempts when job metadata is missing. */
  defaultMaxAttempts?: number;
  /** Override base delay for backoff in milliseconds. */
  backoffBaseMs?: number;
  /** Override cap for backoff delay in milliseconds. */
  backoffCapMs?: number;
  /** Optional logger implementation. Defaults to console. */
  logger?: Pick<typeof console, "log" | "warn" | "error"> & {
    debug?: (...args: unknown[]) => void;
  };
}

/**
 * Result of a worker iteration for observability/testing.
 */
export type WorkerIterationResult =
  | { state: "idle" }
  | { state: "processed"; jobId: string }
  | { state: "retry-scheduled"; jobId: string; delayMs: number; attempts: number }
  | { state: "failed"; jobId: string; attempts: number };

/**
 * Sleep helper used between polling iterations.
 * @param ms - Milliseconds to sleep.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Process the next job in the queue if available.
 * @param config - Worker configuration overrides.
 * @returns Metadata describing the iteration result.
 */
export async function processNextJob(config: WorkerConfig = {}): Promise<WorkerIterationResult> {
  const logger = config.logger ?? console;
  const defaults = getQueueDefaults();
  const defaultMaxAttempts = config.defaultMaxAttempts ?? defaults.maxAttempts;
  const backoffBaseMs = config.backoffBaseMs ?? defaults.backoffBaseMs;
  const backoffCapMs = config.backoffCapMs ?? defaults.backoffCapMs;

  await releaseScheduledJobs();

  const jobId = await getNextPendingJob();
  if (!jobId) {
    logger.debug?.("Worker idle - no jobs available");
    addBreadcrumb({
      category: "worker",
      message: "No job available",
      level: "info",
    } satisfies Breadcrumb);
    return { state: "idle" };
  }

  const job = await getJobStatus(jobId);
  if (!job) {
    logger.warn(`Job ${jobId} not found when attempting to process`);
    addBreadcrumb({
      category: "worker",
      message: "Job missing during fetch",
      level: "warning",
      data: { jobId },
    } satisfies Breadcrumb);
    return { state: "idle" };
  }

  const attemptNumber = job.attempts + 1;
  const maxAttempts = job.maxAttempts ?? defaultMaxAttempts;
  const timestamp = new Date().toISOString();

  const processingUpdate: UpdateJobOptions = {
    attempts: attemptNumber,
    lastAttemptAt: timestamp,
    error: undefined,
    lastError: undefined,
  };

  const statusUpdated = await updateJobStatus(jobId, "processing", processingUpdate);
  if (!statusUpdated) {
    logger.error(`Failed to update job ${jobId} to processing status`);
    addBreadcrumb({
      category: "worker",
      message: "Failed to update job to processing",
      level: "error",
      data: { jobId },
    } satisfies Breadcrumb);
    return { state: "idle" };
  }

  addBreadcrumb({
    category: "worker",
    message: "Processing job",
    level: "info",
    data: {
      jobId,
      attempts: attemptNumber,
    },
  } satisfies Breadcrumb);

  try {
    const result = await performDeepAnalysis(job.inputHash, job.metadata);
    await updateJobStatus(jobId, "completed", {
      result,
      error: undefined,
      attempts: attemptNumber,
      lastAttemptAt: timestamp,
    });

    logger.log(`✅ Completed job ${jobId} on attempt ${attemptNumber}`);
    addBreadcrumb({
      category: "worker",
      message: "Job completed",
      level: "info",
      data: {
        jobId,
        attempts: attemptNumber,
      },
    } satisfies Breadcrumb);

    return { state: "processed", jobId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`❌ Job ${jobId} failed on attempt ${attemptNumber}:`, errorMessage);

    captureException(error, {
      jobId,
      attemptNumber,
      inputHash: job.inputHash,
    });

    if (attemptNumber >= maxAttempts) {
      await updateJobStatus(jobId, "failed", {
        error: errorMessage,
        attempts: attemptNumber,
        lastAttemptAt: timestamp,
        lastError: errorMessage,
      });

      addBreadcrumb({
        category: "worker",
        message: "Job permanently failed",
        level: "error",
        data: {
          jobId,
          attempts: attemptNumber,
        },
      } satisfies Breadcrumb);

      return { state: "failed", jobId, attempts: attemptNumber };
    }

    const delayMs = computeBackoffDelay(attemptNumber, backoffBaseMs, backoffCapMs);
    await updateJobStatus(jobId, "pending", {
      attempts: attemptNumber,
      lastAttemptAt: timestamp,
      lastError: errorMessage,
    });

    await scheduleJobRetry(jobId, delayMs);

    addBreadcrumb({
      category: "worker",
      message: "Job scheduled for retry",
      level: "warning",
      data: {
        jobId,
        attempts: attemptNumber,
        delayMs,
      },
    } satisfies Breadcrumb);

    return {
      state: "retry-scheduled",
      jobId,
      delayMs,
      attempts: attemptNumber,
    };
  }
}

/**
 * Continuously process jobs with a polling loop.
 * @param config - Worker configuration overrides.
 */
export async function runWorker(config: WorkerConfig = {}): Promise<void> {
  const idleDelay = config.idleDelayMs ?? 1000;

  for (;;) {
    const result = await processNextJob(config);

    if (result.state === "idle") {
      await sleep(idleDelay);
    }
  }
}
