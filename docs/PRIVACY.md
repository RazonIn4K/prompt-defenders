# Privacy Policy

## Overview

Prompt Defenders is committed to protecting user privacy. This document describes how we handle data in our prompt injection detection scanner.

## Data We Collect

### 1. User Input (Not Stored)

- **What**: Text submitted for scanning
- **How**: HMAC-hashed in memory only
- **Storage**: NOT stored in any database
- **Retention**: Exists only during request processing
- **Purpose**: Scanning for prompt injection patterns

**Important**: We NEVER store raw user input. Only a cryptographic hash is computed for correlation purposes.

### 2. Telemetry Data

Collected via **Datadog RUM** (our L5 analytics tool):

- **Session Information**:
  - Session ID (anonymous)
  - Session duration
  - Page views

- **Technical Data**:
  - Browser type and version
  - Operating system
  - Screen resolution
  - Geographic region (country-level only)

- **Performance Metrics**:
  - Page load times
  - API response times
  - Error rates

- **User Interactions** (Privacy-Protected):
  - Button clicks (anonymized)
  - Navigation patterns
  - Form submissions (inputs are MASKED)

**Privacy Level**: `mask-user-input` - All user inputs are masked in session replays.

### 3. Metadata

For each scan request, we collect:

- **Input Hash**: HMAC-SHA256 hash (for correlation only)
- **Input Length**: Number of characters
- **Timestamp**: When scan was performed
- **IP Address**: For rate limiting only (not stored long-term)
- **User Agent**: For compatibility tracking

## How We Use Data

1. **Service Operation**: Process scan requests and return results
2. **Rate Limiting**: Prevent abuse via IP-based rate limits
3. **Performance Monitoring**: Track API response times and errors
4. **Security**: Detect and prevent attacks
5. **Product Improvement**: Understand usage patterns (anonymized)

## Data Sharing

- **Third Parties**: Datadog (for observability) - see [Datadog Privacy Policy](https://www.datadoghq.com/legal/privacy/)
- **No Selling**: We never sell user data
- **No Marketing**: We don't use data for marketing purposes
- **Legal Requirements**: May disclose if required by law

## Data Retention

- **Input Data**: Not stored (hashed in memory only)
- **Telemetry**: Retained in Datadog per their retention policy (typically 15-90 days)
- **Logs**: Retained for 30 days (no raw inputs in logs)
- **Metadata**: Retained for 90 days for security analysis

## User Rights

### Your Rights

- **Transparency**: This policy describes our data practices
- **No Personal Data Storage**: We don't store PII or raw inputs
- **Opt-Out**: Can disable JavaScript to prevent telemetry (but service won't work)

### Data Subject Requests

Since we don't store raw input data:
- **Access**: No personal data to access
- **Deletion**: No personal data to delete
- **Correction**: No personal data to correct

For telemetry data in Datadog:
- Contact: privacy@promptdefenders.com (set up if going to production)

## Cookies

We do NOT use cookies for tracking. Datadog RUM may use:
- **Session Storage**: For session continuity
- **Local Storage**: For RUM configuration (no PII)

## Security

See [SECURITY.md](./SECURITY.md) for detailed security practices.

Key points:
- HMAC-SHA256 for input hashing
- TLS/HTTPS for all communications
- Security headers (CSP, HSTS, etc.)
- No sensitive data in logs
- **Rate Limiting**: 10 requests per minute per IP. Note that if the rate limiter service is temporarily unavailable, requests are allowed to proceed (fail-open) to maintain service availability. This prioritizes uptime over strict rate enforcement during infrastructure issues.

## Children's Privacy

This service is not intended for children under 13. We do not knowingly collect data from children.

## Changes to This Policy

We may update this policy. Changes will be:
- Posted to this document
- Effective immediately upon posting
- Communicated via website notice

## Contact

For privacy questions or concerns:
- **Email**: privacy@promptdefenders.com (set up if going to production)
- **GitHub**: [Create a privacy-related issue](https://github.com/yourusername/prompt-defenders/issues)

## Compliance

- **GDPR**: Minimal data collection, no PII storage
- **CCPA**: No sale of personal information
- **COPPA**: Not directed at children

## Transparency

We believe in radical transparency:
- This policy is version-controlled
- All changes tracked in Git
- Open-source codebase for audit

## FAQ

**Q: Is my prompt data stored?**
A: No. We only compute a hash in memory for correlation. Raw input is never stored.

**Q: Can you see what I scanned?**
A: No. We only see metadata (hash, length, timestamp, results).

**Q: What does Datadog collect?**
A: Session metadata, performance metrics, errors. User inputs are masked.

**Q: How do I opt out?**
A: Disable JavaScript (but service won't work) or use the API directly without the UI.

**Q: Is this HIPAA compliant?**
A: This service is not designed for HIPAA compliance. Do not submit PHI.

**Q: Is this SOC 2 compliant?**
A: Not yet. Compliance certifications are on the roadmap for enterprise customers.

---

**Last Updated**: 2025-11-13
**Version**: 1.1.0
**Effective Date**: Upon deployment
