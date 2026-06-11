import { afterEach, describe, expect, test, vi } from "vitest";
import { computeBackoffDelay, performDeepAnalysis } from "../src/lib/queue";
import { __resetDeepAnalysisConfigForTests } from "../src/lib/deepAnalysisConfig";

describe("computeBackoffDelay", () => {
  test("uses base delay for first attempt", () => {
    expect(computeBackoffDelay(1, 2000, 10000)).toBe(2000);
  });

  test("doubles delay for subsequent attempts", () => {
    expect(computeBackoffDelay(3, 1000, 10000)).toBe(4000);
  });

  test("caps delay at provided maximum", () => {
    expect(computeBackoffDelay(5, 500, 4000)).toBe(4000);
  });
});

describe("performDeepAnalysis", () => {
  afterEach(() => {
    vi.useRealTimers();
    __resetDeepAnalysisConfigForTests();
  });

  test("throws instead of producing output when disabled", async () => {
    await expect(performDeepAnalysis("hash")).rejects.toThrow(
      /DEEP_ANALYSIS_MODE/
    );
  });

  test("labels placeholder results in placeholder mode", async () => {
    vi.stubEnv("DEEP_ANALYSIS_MODE", "placeholder");
    vi.useFakeTimers();

    const pending = performDeepAnalysis("hash");
    await vi.advanceTimersByTimeAsync(2000);
    const result = await pending;

    expect(result.placeholder).toBe(true);
    expect(result.disclaimer).toContain("not a verdict");
    expect(result.modelUsed).toBe("placeholder-llm-v1");
  });
});
