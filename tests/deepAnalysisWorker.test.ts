import { beforeEach, describe, expect, test, vi } from "vitest";
import * as queueModule from "../src/lib/queue";
import * as monitoringModule from "../src/lib/monitoring";
import { processNextJob } from "../src/lib/deepAnalysisWorker";

const baseJob: queueModule.QueueJob = {
  id: "job-1",
  inputHash: "hash",
  inputLength: 10,
  timestamp: new Date().toISOString(),
  status: "pending",
  attempts: 0,
  maxAttempts: 3,
};

beforeEach(() => {
  vi.spyOn(queueModule, "releaseScheduledJobs").mockResolvedValue(0);
  vi.spyOn(monitoringModule, "addBreadcrumb").mockImplementation(() => undefined);
  vi.spyOn(monitoringModule, "captureException").mockImplementation(() => undefined);
});

describe("processNextJob", () => {
  test("returns idle when no jobs are available", async () => {
    vi.spyOn(queueModule, "getNextPendingJob").mockResolvedValue(null);

    const result = await processNextJob();
    expect(result).toEqual({ state: "idle" });
  });

  test("marks job as completed when analysis succeeds", async () => {
    vi.spyOn(queueModule, "getNextPendingJob").mockResolvedValue("job-1");
    vi.spyOn(queueModule, "getJobStatus").mockResolvedValue({ ...baseJob });
    const updateSpy = vi
      .spyOn(queueModule, "updateJobStatus")
      .mockResolvedValue(true);
    vi.spyOn(queueModule, "performDeepAnalysis").mockResolvedValue({ deepScore: 90 });
    const scheduleSpy = vi.spyOn(queueModule, "scheduleJobRetry").mockResolvedValue(true);

    const result = await processNextJob();

    expect(result).toEqual({ state: "processed", jobId: "job-1" });
    expect(updateSpy).toHaveBeenCalledWith("job-1", "processing", expect.any(Object));
    expect(updateSpy).toHaveBeenCalledWith(
      "job-1",
      "completed",
      expect.objectContaining({ result: { deepScore: 90 } })
    );
    expect(scheduleSpy).not.toHaveBeenCalled();
  });

  test("schedules retry with backoff when analysis fails", async () => {
    vi.spyOn(queueModule, "getNextPendingJob").mockResolvedValue("job-1");
    vi.spyOn(queueModule, "getJobStatus").mockResolvedValue({ ...baseJob });
    vi.spyOn(queueModule, "updateJobStatus").mockResolvedValue(true);
    vi.spyOn(queueModule, "performDeepAnalysis").mockRejectedValue(new Error("boom"));
    vi.spyOn(queueModule, "computeBackoffDelay").mockReturnValue(4000);
    const scheduleSpy = vi.spyOn(queueModule, "scheduleJobRetry").mockResolvedValue(true);

    const result = await processNextJob();

    expect(result.state).toBe("retry-scheduled");
    if (result.state === "retry-scheduled") {
      expect(result.delayMs).toBe(4000);
      expect(result.attempts).toBe(1);
    }
    expect(scheduleSpy).toHaveBeenCalledWith("job-1", 4000);
  });

  test("marks job as failed when attempts exceed max", async () => {
    vi.spyOn(queueModule, "getNextPendingJob").mockResolvedValue("job-1");
    vi.spyOn(queueModule, "getJobStatus").mockResolvedValue({
      ...baseJob,
      attempts: 1,
      maxAttempts: 2,
    });
    vi.spyOn(queueModule, "updateJobStatus").mockResolvedValue(true);
    vi.spyOn(queueModule, "performDeepAnalysis").mockRejectedValue(new Error("boom"));
    const scheduleSpy = vi.spyOn(queueModule, "scheduleJobRetry");

    const result = await processNextJob();

    expect(result).toEqual({ state: "failed", jobId: "job-1", attempts: 2 });
    expect(scheduleSpy).not.toHaveBeenCalled();
  });
});
