# Prompt Defenders

**Privacy-first prompt injection detection scanner with Datadog RUM observability**

## Overview

Prompt Defenders is a Next.js application that scans text inputs for prompt injection patterns using regex-based rules and returns a risk score with detailed advisories. Built with privacy and security as core principles.

### Key Features

- **Privacy-First**: Input text is NEVER stored; only HMAC-hashed in memory for correlation
- **Fast Regex Scanning**: Synchronous detection using versioned rule packs
- **Comprehensive Security**: CSP headers, rate limiting, input validation
- **Datadog RUM Integration**: L5 observability with masked user inputs
- **Stable API Contract**: Versioned JSON schema for reliable integration
- **CI/CD Gates**: Automated validation, SBOM, vulnerability scanning

## Architecture

```
┌─────────────────┐
│   User Input    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Rate Limiter   │ ◄── Upstash Redis (prod) / Token Bucket (dev)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Input Hashing  │ ◄── HMAC-SHA256 (not stored)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Regex Scanner  │ ◄── Rule Pack (versioned)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Risk Scoring   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  JSON Response  │ ◄── Stable Contract
└─────────────────┘
```

## Quick Start

### Prerequisites

- Node.js 20+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/prompt-defenders.git
cd prompt-defenders

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Edit .env.local with your configuration
```

### Environment Variables

See [.env.example](./.env.example) for all required variables.

**Required:**
- `HASH_SALT`: Salt for HMAC hashing (change in production!)

**Datadog RUM (L5 Analytics):**
- `NEXT_PUBLIC_DD_APP_ID`: Datadog Application ID
- `NEXT_PUBLIC_DD_CLIENT_TOKEN`: Datadog Client Token
- `NEXT_PUBLIC_ENV`: Environment (development/staging/production)
- `NEXT_PUBLIC_COMMIT_SHA`: Commit SHA for version tracking

**Optional (Production):**
- `UPSTASH_REDIS_REST_URL`: Upstash Redis URL for rate limiting
- `UPSTASH_REDIS_REST_TOKEN`: Upstash Redis token

### Development

```bash
# Run development server
npm run dev

# Open http://localhost:3000
```

### Build & Deploy

```bash
# Type check
npm run typecheck

# Lint
npm run lint

# Test
npm run test

# Build
npm run build

# Start production server
npm start
```

## API Documentation

### POST /api/scan

Scan text for prompt injection patterns.

**Request:**
```json
{
  "input": "Your text to scan here"
}
```

**Response:**
```json
{
  "success": true,
  "analysis": {
    "score": 50,
    "severity": "high",
    "categories": ["Direct instruction override attempts"],
    "advisories": [
      {
        "ruleId": "PI-001",
        "description": "Direct instruction override attempts",
        "severity": "high",
        "rationale": "Common pattern in prompt injection attacks..."
      }
    ]
  },
  "meta": {
    "inputHash": "abc123...",
    "inputLength": 45,
    "rulesVersion": "1.0.0",
    "timestamp": "2025-11-06T20:00:00.000Z"
  }
}
```

**Rate Limits:**
- 10 requests per minute per IP
- Returns `429` when exceeded
- `X-RateLimit-Remaining` header included

**Schema:** See [public/api/scanner/schema.json](./public/api/scanner/schema.json)

## Rules & Detection

Rules are defined in [public/api/scanner/rules/rules.json](./public/api/scanner/rules/rules.json).

### Rule Structure

```json
{
  "id": "PI-001",
  "description": "Direct instruction override attempts",
  "severity": "high",
  "pattern": "(?i)(ignore|disregard)\\s+(previous|all)\\s+(instructions|commands)",
  "rationale": "Common pattern in prompt injection attacks"
}
```

### Severity Levels

- **low**: Score 10 per match
- **medium**: Score 25 per match
- **high**: Score 50 per match
- **critical**: Score 100 per match

### Risk Score

- **0-19**: Low severity
- **20-49**: Medium severity
- **50-79**: High severity
- **80-100**: Critical severity

## Security

See [docs/SECURITY.md](./docs/SECURITY.md) for detailed security information.

### Security Features

- **Rate Limiting**: Upstash Redis (prod) / Token Bucket (dev)
- **Security Headers**: CSP, HSTS, X-Frame-Options, etc.
- **Input Validation**: Max 100KB, type checking
- **No Data Storage**: HMAC hash only, never raw input
- **Vulnerability Scanning**: Syft + Grype in CI

### Reporting Security Issues

**DO NOT** create public issues for security vulnerabilities.
Contact: security@promptdefenders.com

## Privacy

See [docs/PRIVACY.md](./docs/PRIVACY.md) for full privacy policy.

**Key Points:**
- Input text is NEVER stored
- Only HMAC hash computed in memory for correlation
- Datadog RUM configured with `mask-user-input`
- No PII collection
- Results are guidance, not certification

## CI/CD

### Workflows

1. **CI** ([.github/workflows/ci.yml](./.github/workflows/ci.yml))
   - Lint, type check, test, build
   - Syft SBOM generation
   - Grype vulnerability scanning (fails on high/critical)

2. **CodeQL** ([.github/workflows/codeql.yml](./.github/workflows/codeql.yml))
   - JavaScript security analysis
   - Weekly scheduled scans

3. **Rules Validation** ([.github/workflows/rules-validate.yml](./.github/workflows/rules-validate.yml))
   - Validates rule structure and versioning
   - Runs on changes to rules or schema

## Go-Live-Gate

Before production deployment, complete the [Go-Live-Gate checklist](./docs/Go-Live-Gate.md).

**Critical Requirements:**
- [ ] Single L5 tool verified (Datadog RUM only)
- [ ] All security headers configured
- [ ] Rate limiting tested
- [ ] Vulnerability scan passing
- [ ] Privacy policy displayed

## Analytics (L5 Tool)

See [docs/Tool-Analytics.md](./docs/Tool-Analytics.md) for L5 tool policy.

**Current L5 Tool**: Datadog RUM

**Policy**: Only ONE L5 analytics tool per service.

**Future**: Add Datadog Serverless APM for Lambda functions (link in docs).

## Development

### Project Structure

```
prompt-defenders/
├── .github/
│   ├── workflows/          # CI/CD workflows
│   └── pull_request_template.md
├── docs/
│   ├── Go-Live-Gate.md     # Production deployment checklist
│   ├── Tool-Analytics.md   # L5 tool policy
│   ├── SECURITY.md         # Security policy
│   └── PRIVACY.md          # Privacy policy
├── public/
│   └── api/scanner/
│       ├── schema.json     # Stable API contract
│       └── rules/
│           └── rules.json  # Versioned rule pack
├── scripts/
│   └── validate-rules.js   # Rules validation script
├── src/
│   ├── lib/
│   │   ├── ratelimit.ts    # Rate limiter (Upstash + fallback)
│   │   └── scanner.ts      # Scanner logic
│   └── pages/
│       ├── _app.tsx        # Datadog RUM initialization
│       ├── index.tsx       # Scanner UI
│       └── api/
│           └── scan.ts     # Scanner API endpoint
├── .env.example            # Environment variable template
├── next.config.ts          # Next.js config with security headers
└── package.json
```

### Adding New Rules

1. Edit `public/api/scanner/rules/rules.json`
2. Add rule with required fields: `id`, `description`, `severity`, `pattern`, `rationale`
3. Test regex pattern validity
4. Increment `version` field
5. Run `npm run validate-rules`
6. Commit and push (triggers rules validation workflow)

### Testing Rate Limiting

```bash
# Test rate limiting (10 requests/min)
for i in {1..15}; do
  curl -X POST http://localhost:3000/api/scan \
    -H "Content-Type: application/json" \
    -d '{"input":"test"}' \
    -w "\nStatus: %{http_code}\n"
done
```

## Secrets to Set (Per Repository)

### All Environments
- `HASH_SALT`

### Datadog Repo (This One)
- `NEXT_PUBLIC_DD_APP_ID`
- `NEXT_PUBLIC_DD_CLIENT_TOKEN`
- `NEXT_PUBLIC_ENV`
- `NEXT_PUBLIC_COMMIT_SHA`

### Optional (Production)
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

## Roadmap / TODOs

- [ ] Move token bucket to Upstash in production
- [ ] Add async deep LLM analysis worker (non-blocking)
- [ ] Implement API key authentication
- [ ] Add Datadog Serverless APM documentation
- [ ] Implement background queue for deep analysis
- [ ] Add CAPTCHA for public endpoints
- [ ] Create dashboard for rule management
- [ ] Add A/B testing for rule effectiveness

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Ensure tests pass and CI is green
5. Submit a PR using the template
6. Verify Go-Live-Gate requirements

## License

ISC

## Support

- **Documentation**: See [docs/](./docs/)
- **Issues**: [GitHub Issues](https://github.com/yourusername/prompt-defenders/issues)
- **Security**: security@promptdefenders.com
- **Privacy**: privacy@promptdefenders.com

---

**Built with privacy and security first. Results are guidance, not certification.**
