# Go-Live Gate Checklist

This document defines the requirements that must be met before deploying any service to production.

## Security Requirements

- [ ] All security headers configured (CSP, HSTS, X-Frame-Options, etc.)
- [ ] Rate limiting implemented and tested (Upstash Redis in production)
- [ ] Input validation on all API endpoints
- [ ] No secrets in source code (use environment variables)
- [ ] SBOM generated and vulnerability scan passed (no high/critical vulnerabilities)
- [ ] CodeQL security analysis passed
- [ ] **API Key Authentication (Phase 2)**: API_KEYS env var configured for production
- [ ] API authentication tested (401 on missing/invalid key in prod, permissive in dev)

## Analytics & Observability

- [ ] **Single L5 Analytics Tool Policy**: Only ONE L5 tool (Datadog RUM) is deployed
  - ⚠️ **ENFORCEMENT**: Verify no other L5 tools (Sentry, New Relic, etc.) are initialized
  - See [Tool-Analytics.md](./Tool-Analytics.md) for L5 tool definitions
- [ ] Datadog RUM configured with proper environment variables
- [ ] Privacy controls configured (defaultPrivacyLevel: mask-user-input)
- [ ] Error tracking and logging implemented

## Privacy & Compliance

- [ ] Privacy Policy documented and displayed to users
- [ ] Data retention policy defined (24 hour TTL for queue jobs)
- [ ] User consent mechanisms in place (if required)
- [ ] No PII stored without explicit consent
- [ ] Input data handling documented (hashed only, no raw storage)
- [ ] **Async Queue Privacy (Phase 2)**: Verified that only inputHash stored in queue, never raw text
- [ ] Datadog RUM `mask-user-input` setting confirmed (defaultPrivacyLevel: mask-user-input)
- [ ] Privacy disclosure visible in UI ("Hashed only • Guidance, not certification")

## Testing & Quality

- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Type checking passing (TypeScript)
- [ ] Linting passing
- [ ] Build successful

## CI/CD

- [ ] CI pipeline configured and passing
- [ ] Rules validation workflow passing (if applicable)
- [ ] **Rules Governance (Phase 2)**: Version bump + changelog enforcement in CI
- [ ] CodeQL workflow configured
- [ ] SBOM/Grype vulnerability scanning configured

## Documentation

- [ ] README.md updated with setup instructions
- [ ] API documentation available (schemas, contracts)
- [ ] **Async API Flow Documented (Phase 2)**: /api/scan, /api/scan/deep, /api/scan/result
- [ ] **API Authentication Documented (Phase 2)**: X-API-Key header usage
- [ ] Security policy documented (SECURITY.md)
- [ ] Privacy policy documented (PRIVACY.md)
- [ ] Environment variables documented (.env.example)
- [ ] **RULES-CHANGELOG.md (Phase 2)**: Version history documented and publicly accessible

## Deployment

- [ ] Environment variables set in production environment
  - [ ] HASH_SALT (secure random value)
  - [ ] NEXT_PUBLIC_DD_APP_ID and NEXT_PUBLIC_DD_CLIENT_TOKEN
  - [ ] UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
  - [ ] **API_KEYS (Phase 2)**: Comma-separated production API keys
- [ ] Secrets properly managed (using secrets manager)
- [ ] Monitoring and alerting configured
- [ ] **Async Queue Monitoring (Phase 2)**: Upstash Redis dashboard configured
- [ ] Rollback plan documented
- [ ] Database migrations tested (if applicable - N/A for this service)

## Sign-Off

- Developer: _________________ Date: _______
- Security Review: _________________ Date: _______
- Privacy Review: _________________ Date: _______
- Operations: _________________ Date: _______

---

**Note**: This checklist must be completed and reviewed before any production deployment. Bypassing this gate requires explicit approval from the engineering lead and security team.
