# Security Policy

## Overview

Prompt Defenders is a privacy-first prompt injection detection scanner. This document outlines our security practices and policies.

## Security Principles

1. **Defense in Depth**: Multiple layers of security controls
2. **Least Privilege**: Minimal permissions and access
3. **Secure by Default**: Security controls enabled out of the box
4. **Privacy First**: No raw user input storage
5. **Fail Secure**: Errors fail in a secure state

## Security Controls

### 1. Input Validation

- All API inputs validated before processing
- Maximum input size: 100KB
- Input sanitization for regex processing
- HMAC hashing for correlation (not storage)

### 2. Rate Limiting

- **Production**: Upstash Redis-based rate limiting
  - 10 requests per minute per IP
  - Sliding window algorithm
- **Development**: Token bucket fallback (in-memory)
- Rate limit headers included in responses
- **Fail-Open Behavior**: If the rate limiter service is unavailable (e.g., Redis connection failure), requests are allowed to proceed rather than being rejected. This ensures service availability but reduces abuse protection during limiter outages. Monitor rate limiter health in production.

### 3. Security Headers

All responses include comprehensive security headers:

- **Content-Security-Policy**: Restricts resource loading
- **Strict-Transport-Security**: Enforces HTTPS
- **X-Frame-Options**: Prevents clickjacking
- **X-Content-Type-Options**: Prevents MIME sniffing
- **X-XSS-Protection**: Legacy XSS protection
- **Referrer-Policy**: Limits referrer information
- **Permissions-Policy**: Restricts browser features

See `next.config.ts` for full CSP configuration.

### 4. Data Handling

- **Input Data**: HMAC-hashed in memory only, never stored
- **Hash Salt**: Configured via `HASH_SALT` environment variable
- **Correlation**: Hashes used only for telemetry correlation
- **Retention**: No persistent storage of user inputs

### 5. Authentication & Authorization

**Current Implementation**:
- **API Key Authentication**: Implemented via `X-API-Key` header
  - **Production**: API key required (configured via `API_KEYS` environment variable)
  - **Development**: Permissive mode (no key required for easier local development)
  - Returns `401 Unauthorized` for missing or invalid keys in production
- **Enforcement**: All API endpoints (`/api/scan`, `/api/scan/deep`, `/api/scan/result`) enforce authentication
- **Rate Limiting**: Applied per IP address or forwarded IP (future: per API key)

**Future Enhancements**:
- Per-API-key rate limiting quotas
- Multi-tenant isolation with separate key namespaces
- Request signing for enhanced security

### 6. Cryptography

- HMAC-SHA256 for input hashing
- Configurable salt via environment variable
- Never log or expose hashes publicly

### 7. Dependency Security

- Automated SBOM generation with Syft
- Vulnerability scanning with Grype
- CI fails on high/critical vulnerabilities
- Regular dependency updates

### 8. Code Security

- CodeQL static analysis on all commits
- TypeScript for type safety
- ESLint for code quality
- Strict React mode enabled

## Reporting Security Issues

**DO NOT** create public GitHub issues for security vulnerabilities.

Instead, please report security issues to:
- **Email**: security@promptdefenders.com (set up if going to production)
- **GitHub Security Advisories**: Use "Report a vulnerability" button

We aim to respond to security reports within 48 hours.

## Security Checklist for Contributors

Before submitting code:

- [ ] No secrets in code (use environment variables)
- [ ] Input validation on all user inputs
- [ ] No use of dangerous functions (eval, Function constructor)
- [ ] Dependencies up to date
- [ ] Tests passing
- [ ] Linting passing
- [ ] Security headers configured

## Known Limitations

1. **Deep Analysis Stub**: The `performDeepAnalysis` function is currently a placeholder that simulates LLM analysis with a 2-second delay. Real LLM integration is planned for future releases.
2. **In-Memory Rate Limiting Fallback**: Token bucket fallback (used when Redis is unavailable) not suitable for production at scale due to per-instance state
3. **Regex-Based Detection**: Fast scan uses regex patterns; deep analysis (when LLM is integrated) will provide more robust detection
4. **Rate Limiter Fails Open**: Service availability prioritized over strict rate limiting during limiter outages
5. **No DDoS Protection**: Requires infrastructure-level protection (e.g., CloudFlare, AWS Shield)

## Roadmap

- [x] Add API key authentication (Phase 2 - Completed)
- [x] Implement async queue for LLM-based deep analysis (Phase 2 - Completed)
- [ ] Integrate actual LLM API for deep analysis (currently stub)
- [ ] Add request signing for API calls
- [ ] Implement per-API-key rate limiting quotas
- [ ] Implement CAPTCHA for public endpoints
- [ ] Add Web Application Firewall (WAF) integration
- [ ] Implement anomaly detection for abuse patterns

## Security Contacts

- **Security Lead**: [To be assigned]
- **Engineering Lead**: [To be assigned]

---

**Last Updated**: 2025-11-13
**Version**: 1.1.0
