/**
 * Deep analysis feature gating (DEEP_ANALYSIS_MODE)
 *
 * - "disabled" (default): queueing deep analysis is rejected with a clear
 *   "unavailable" response and the hosted form hides the option.
 * - "placeholder": the pipeline runs, but every result is explicitly
 *   labeled as a demo placeholder, not a verdict.
 * - "llm": reserved for a real LLM integration. None exists yet, so it
 *   falls back to "disabled" with a logged warning.
 */

export type DeepAnalysisMode = "disabled" | "placeholder" | "llm";

/** Disclaimer attached to every placeholder-mode response and result. */
export const PLACEHOLDER_DISCLAIMER =
  "Demo placeholder — not a verdict. This simulated output must not be used as a security assessment.";

/**
 * Flip to true once performDeepAnalysis calls a real model, which makes
 * DEEP_ANALYSIS_MODE=llm a valid configuration.
 */
export const LLM_INTEGRATION_AVAILABLE = false;

let warnedFallback = false;

/**
 * Resolve the effective deep analysis mode from DEEP_ANALYSIS_MODE.
 * Unknown values and a premature "llm" setting fall back to "disabled".
 */
export function getDeepAnalysisMode(): DeepAnalysisMode {
  const raw = (process.env.DEEP_ANALYSIS_MODE ?? "disabled").trim().toLowerCase();

  if (raw === "" || raw === "disabled") {
    return "disabled";
  }

  if (raw === "placeholder") {
    return "placeholder";
  }

  if (raw === "llm" && LLM_INTEGRATION_AVAILABLE) {
    return "llm";
  }

  if (!warnedFallback) {
    warnedFallback = true;
    console.warn(
      `⚠️  DEEP_ANALYSIS_MODE="${raw}" is not available (no real LLM integration is implemented yet). Falling back to disabled.`
    );
  }

  return "disabled";
}

/** Exported for testing to reset warn-once state between test cases. */
export function __resetDeepAnalysisConfigForTests(): void {
  warnedFallback = false;
}
