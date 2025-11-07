# Review

## Highlights
- Hardened API authentication path with explicit production tests.
- Added Sentry-aware monitoring layer plus resilient worker loop with exponential backoff and retry scheduling.
- Exposed queue attempt metadata through the `/api/scan/result` endpoint for improved debugging.
- Introduced Vitest-based coverage for auth and worker logic along with a repeatable smoke script.

## Security Considerations
- API key validation remains constant-time via string equality; key material is never logged.
- Queue metadata persists only HMAC hashes and retry diagnostics; no raw input recorded.
- Sentry initialization gated behind `SENTRY_DSN` to avoid accidental telemetry in unsecured environments.

## Performance Notes
- Retry scheduling leverages sorted set operations (`zrange` + `zremrangebyscore`) to avoid busy polling.
- Exponential backoff defaults are configurable via environment variables to tune load characteristics.

## Testing
- `npm test`
- `npm run typecheck`
