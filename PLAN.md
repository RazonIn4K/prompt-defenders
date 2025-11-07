# Plan

1. **Inventory & Baseline**
   - Capture current branch, recent commits, and working tree state.
   - Review existing authentication, queue, and worker-related modules.

2. **Authentication & HMAC Verification**
   - Inspect `src/lib/auth.ts`, API routes under `src/pages/api/scan`, and hashing logic in `src/lib/scanner.ts`.
   - Confirm environment variable usage for API keys and hashing salt.
   - Add regression tests for the authentication helpers covering production/dev scenarios and header parsing.

3. **Async Worker Reliability**
   - Extend queue schema to record attempts, errors, and retry metadata.
   - Implement exponential backoff scheduling (`queue:retry` sorted set) and helper utilities.
   - Add monitoring harness (`src/lib/monitoring.ts`) with Sentry breadcrumb/exception support.
   - Provide worker runtime (`src/lib/deepAnalysisWorker.ts`) plus executable entry point (`src/worker/deepAnalysisWorker.ts`).

4. **API Surface Updates**
   - Expose retry metadata via `/api/scan/result` for improved observability.
   - Document new environment variables in `README.md`.

5. **Validation & Tooling**
   - Introduce Vitest configuration and targeted unit tests for auth, queue backoff, and worker control flow.
   - Supply `smoke_promptdefenders.sh` to automate dependency install, tests, and type-check.
   - Run `npm test` and `npm run typecheck` to verify the toolchain.
