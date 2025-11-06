# Go-Live Gate Checklist

This document defines the requirements that must be met before deploying any service to production.

## Security Requirements

- [ ] All security headers configured (CSP, HSTS, X-Frame-Options, etc.)
- [ ] Rate limiting implemented and tested
- [ ] Input validation on all API endpoints
- [ ] No secrets in source code (use environment variables)
- [ ] SBOM generated and vulnerability scan passed (no high/critical vulnerabilities)
- [ ] CodeQL security analysis passed

## Analytics & Observability

- [ ] **Single L5 Analytics Tool Policy**: Only ONE L5 tool (Datadog RUM) is deployed
  - ⚠️ **ENFORCEMENT**: Verify no other L5 tools (Sentry, New Relic, etc.) are initialized
  - See [Tool-Analytics.md](./Tool-Analytics.md) for L5 tool definitions
- [ ] Datadog RUM configured with proper environment variables
- [ ] Privacy controls configured (defaultPrivacyLevel: mask-user-input)
- [ ] Error tracking and logging implemented

## Privacy & Compliance

- [ ] Privacy Policy documented and displayed to users
- [ ] Data retention policy defined
- [ ] User consent mechanisms in place (if required)
- [ ] No PII stored without explicit consent
- [ ] Input data handling documented (hashed only, no raw storage)

## Testing & Quality

- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Type checking passing (TypeScript)
- [ ] Linting passing
- [ ] Build successful

## CI/CD

- [ ] CI pipeline configured and passing
- [ ] Rules validation workflow passing (if applicable)
- [ ] CodeQL workflow configured
- [ ] SBOM/Grype vulnerability scanning configured

## Documentation

- [ ] README.md updated with setup instructions
- [ ] API documentation available (schemas, contracts)
- [ ] Security policy documented (SECURITY.md)
- [ ] Privacy policy documented (PRIVACY.md)
- [ ] Environment variables documented

## Deployment

- [ ] Environment variables set in production environment
- [ ] Secrets properly managed (using secrets manager)
- [ ] Monitoring and alerting configured
- [ ] Rollback plan documented
- [ ] Database migrations tested (if applicable)

## Sign-Off

- Developer: _________________ Date: _______
- Security Review: _________________ Date: _______
- Privacy Review: _________________ Date: _______
- Operations: _________________ Date: _______

---

**Note**: This checklist must be completed and reviewed before any production deployment. Bypassing this gate requires explicit approval from the engineering lead and security team.
