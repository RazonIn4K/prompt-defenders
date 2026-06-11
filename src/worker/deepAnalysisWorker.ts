import { initializeMonitoring } from "../lib/monitoring";
import { runWorker } from "../lib/deepAnalysisWorker";
import { getDeepAnalysisMode } from "../lib/deepAnalysisConfig";

/**
 * Bootstrap script for the deep analysis background worker.
 * Initializes monitoring and starts the polling loop.
 */
async function main(): Promise<void> {
  if (getDeepAnalysisMode() === "disabled") {
    console.warn(
      "⚠️  DEEP_ANALYSIS_MODE is disabled; deep analysis worker exiting. " +
        "Set DEEP_ANALYSIS_MODE=placeholder to run the demo pipeline."
    );
    return;
  }

  const monitoringEnabled = initializeMonitoring({
    serviceName: "deep-analysis-worker",
    tracesSampleRate: 0,
  });

  if (!monitoringEnabled) {
    console.warn(
      "⚠️  Running worker without Sentry monitoring. Set SENTRY_DSN to enable breadcrumbs."
    );
  }

  await runWorker({
    idleDelayMs: Number.parseInt(process.env.WORKER_IDLE_DELAY_MS ?? "1000", 10),
  });
}

main().catch((error) => {
  console.error("Deep analysis worker crashed:", error);
  process.exitCode = 1;
});
