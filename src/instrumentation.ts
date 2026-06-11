/**
 * Next.js instrumentation hook (runs once when the Node.js server boots).
 *
 * Initializes server-side Sentry monitoring for API routes and SSR using
 * the same @sentry/node helper as the deep analysis worker. Reads
 * SENTRY_DSN from the environment; when unset, monitoring stays disabled
 * and a notice is logged instead.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initializeMonitoring } = await import("./lib/monitoring");
    initializeMonitoring({
      serviceName: "next-server",
      tracesSampleRate: 0,
    });
  }
}
