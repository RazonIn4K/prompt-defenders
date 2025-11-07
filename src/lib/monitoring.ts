import * as Sentry from "@sentry/node";

/**
 * Options for initializing monitoring providers like Sentry.
 */
export interface MonitoringInitOptions {
  /** Optional DSN override. Defaults to SENTRY_DSN env var. */
  dsn?: string;
  /** Deployment environment label (defaults to NODE_ENV). */
  environment?: string;
  /** Release/version identifier. */
  release?: string;
  /** Sample rate for tracing (0 disables tracing). */
  tracesSampleRate?: number;
  /** Service name for logging context. */
  serviceName?: string;
}

let sentryInitialized = false;
let sentryEnabled = false;

/**
 * Initialize Sentry monitoring safely. Subsequent calls are no-ops.
 * @param options - Configuration overrides for Sentry initialization.
 * @returns True when Sentry is enabled for this process.
 */
export function initializeMonitoring(options?: MonitoringInitOptions): boolean {
  if (sentryInitialized) {
    return sentryEnabled;
  }

  const dsn = options?.dsn ?? process.env.SENTRY_DSN;

  if (!dsn) {
    console.warn(
      "ℹ️  Sentry DSN not provided. Monitoring breadcrumbs and exception capture are disabled."
    );
    sentryInitialized = true;
    sentryEnabled = false;
    return sentryEnabled;
  }

  const environment = options?.environment ?? process.env.NODE_ENV ?? "development";
  const release = options?.release ?? process.env.VERCEL_GIT_COMMIT_SHA;
  const tracesSampleRate = options?.tracesSampleRate ?? 0;

  Sentry.init({
    dsn,
    environment,
    release,
    tracesSampleRate,
  });

  sentryInitialized = true;
  sentryEnabled = true;
  console.log(
    `✅ Sentry initialized for ${options?.serviceName ?? "application"} in ${environment} environment.`
  );

  return sentryEnabled;
}

/**
 * Record a breadcrumb for observability if Sentry is enabled.
 * @param breadcrumb - Breadcrumb metadata to record.
 */
export function addBreadcrumb(breadcrumb: Sentry.Breadcrumb): void {
  if (!sentryEnabled) {
    return;
  }

  Sentry.addBreadcrumb(breadcrumb);
}

/**
 * Capture an exception with optional context metadata when Sentry is enabled.
 * @param error - Error instance or value.
 * @param context - Additional context for debugging.
 */
export function captureException(
  error: unknown,
  context?: Record<string, unknown>
): void {
  if (!sentryEnabled) {
    return;
  }

  Sentry.captureException(error, context ? { contexts: { detail: context } } : undefined);
}

/**
 * Exported for testing to allow resetting Sentry state between test cases.
 */
export function __resetMonitoringForTests(): void {
  sentryInitialized = false;
  sentryEnabled = false;
  Sentry.close(0);
}
