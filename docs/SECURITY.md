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
- **Development**: Token bucket fallback
- Rate limit headers included in responses

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

**Current State**: Public API endpoint (no auth required)

**TODO**: For production deployment with auth:
- Implement API key authentication
- Add rate limiting per API key
- Implement user/tenant isolation

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

1. **No Authentication**: Current version has public API endpoint
2. **In-Memory Rate Limiting**: Fallback not suitable for production at scale
3. **Regex-Based Detection**: Not as robust as LLM-based analysis
4. **No DDoS Protection**: Requires infrastructure-level protection

## Roadmap

- [ ] Add API key authentication
- [ ] Implement async LLM-based deep analysis
- [ ] Add request signing for API calls
- [ ] Implement CAPTCHA for public endpoints
- [ ] Add Web Application Firewall (WAF) integration
- [ ] Implement anomaly detection

## Security Contacts

- **Security Lead**: [To be assigned]
- **Engineering Lead**: [To be assigned]

---

**Last Updated**: 2025-11-06
**Version**: 1.0.0
