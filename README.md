# Prompt Defenders

**Privacy-first prompt injection detection scanner with Datadog RUM observability**

## Overview

Prompt Defenders is a Next.js application that scans text inputs for prompt injection patterns using regex-based rules and returns a risk score with detailed advisories. Built with privacy and security as core principles.

### Key Features

- **Privacy-First**: Input text is NEVER stored; only HMAC-hashed in memory for correlation
- **Fast Regex Scanning**: Synchronous detection using versioned rule packs
- **Async Deep Analysis**: Optional LLM-based analysis via queue (privacy-preserving)
- **API Key Authentication**: Optional production authentication (dev-permissive)
- **Comprehensive Security**: CSP headers, rate limiting, input validation
- **Datadog RUM Integration**: L5 observability with masked user inputs
- **Stable API Contract**: Versioned JSON schema for reliable integration
- **Rules Governance**: Version-controlled rule packs with changelog enforcement
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
- `UPSTASH_REDIS_REST_URL`: Upstash Redis URL for rate limiting & async queue
- `UPSTASH_REDIS_REST_TOKEN`: Upstash Redis token
- `API_KEYS`: Comma-separated API keys for production authentication (e.g., `key1,key2`)

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

## How to Run a Quick Audit on Your Chatbot Prompts

The new CLI makes it easy to demo a guardrail scan in seconds:

1. Drop a prompt into a text file (reuse the samples under [`examples/`](./examples)).
2. Run the scanner locally:

   ```bash
   npx prompt-defender scan examples/injection_simple.txt --rules basic
   ```

3. Show the JSON report to stakeholders:

   ```json
   {
     "risk_score": 75,
     "issues": [
       {
         "rule_id": "PI-001",
         "description": "Direct instruction override attempts",
         "severity": "high",
         "rationale": "Common pattern in prompt injection attacks attempting to override system instructions"
       },
       {
         "rule_id": "PI-002",
         "description": "System prompt extraction",
         "severity": "critical",
         "rationale": "Attempts to extract system prompts are critical security concerns"
       }
     ],
     "suggested_mitigations": [
       "Route risky prompts through this scanner before each LLM call.",
       "Log hashed prompts for auditing without storing raw customer data.",
       "Reinforce system prompts server-side so user overrides are ignored.",
       "Strip override keywords (ignore/disregard/forget) before forwarding to the LLM.",
       "Never echo internal system prompts—respond with a redacted message instead.",
       "Split privileged instructions into separate, non-user-accessible channels.",
       "Block the message, alert an operator, and request the user to restate goals safely."
     ]
   }
   ```

> Tip: Pipe live chat transcripts into `promptdefenders scan -` to capture attacks during a security review without writing to disk.

### Rule Coverage & Risk Categories

Our Vitest suite exercises the highest-risk rule families so you can cite concrete evidence during audits:

- **Instruction override (PI-001, High)** – "Ignore all previous instructions" payloads get flagged with remediation steps to reassert system prompts.
- **System prompt extraction (PI-002, Critical)** – Any attempt to leak onboarding/system guidance triggers a stop and mitigation such as redaction.
- **Developer-mode / unrestricted switches (PI-006, PI-007, Critical)** – Public jailbreak patterns (e.g., generalized Do-Anything-Now requests) are covered and will halt execution before the LLM sees them.
- **Bypass + SQL-style payloads (PI-008/PI-009, High/Critical)** – Complex prompts in `examples/injection_complex.txt` demonstrate how stacked attempts map to higher risk scores.

All categories above have dedicated regression tests under [`tests/cli.test.ts`](./tests/cli.test.ts) to prove that the shipped rule pack is effective against real-world prompts. For a deeper explanation of scanner mechanics and roadmap considerations, read [docs/technical_deep_dive.md](./docs/technical_deep_dive.md).

### Integration Examples

Using the scanner inside your pipeline keeps risky prompts away from production models.

#### Node + Express middleware

```ts
import express from "express";
import { scanInput } from "./src/lib/scanner"; // adjust path if consuming as a package

const app = express();
app.use(express.json());

app.post("/chat", async (req, res) => {
  const prompt = String(req.body?.prompt ?? "");
  const scan = scanInput(prompt);
  if (!scan.success) {
    return res.status(500).json({ error: scan.error ?? "scan_failed" });
  }

  if (scan.analysis.score >= 50) {
    return res.status(422).json({
      message: "Prompt blocked by Prompt Defenders",
      advisories: scan.analysis.advisories,
    });
  }

  const llmResponse = await callYourLLM(prompt); // your own LLM adapter
  return res.json({ reply: llmResponse, scan });
});

app.listen(3000);
```

For deployment guidance and layered-control suggestions, see [docs/security.md](./docs/security.md).

#### FastAPI + CLI bridge

```py
import json
import subprocess
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()

class Prompt(BaseModel):
    text: str

def run_prompt_defender(prompt: str) -> dict:
    proc = subprocess.run(
        ["npx", "prompt-defender", "scan", "-"],
        input=prompt.encode("utf-8"),
        capture_output=True,
        check=False,
    )
    if proc.returncode != 0:
        raise HTTPException(status_code=500, detail=proc.stderr.decode())
    return json.loads(proc.stdout)

@app.post("/chat")
def chat(prompt: Prompt):
    report = run_prompt_defender(prompt.text)
    if report["risk_score"] >= 50:
        raise HTTPException(status_code=422, detail=report["issues"])
    # call your LLM safely once cleared
    llm_reply = call_llm(prompt.text)
    return {"reply": llm_reply, "scan": report}
```

## API Documentation

### Authentication (Production Only)

In **production**, all API endpoints require an `X-API-Key` header:

```bash
curl -X POST https://api.promptdefenders.com/api/scan \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key-here" \
  -d '{"input":"test"}'
```

- **Development mode**: Authentication is permissive (no key required)
- **Production mode**: Returns `401 Unauthorized` without valid API key
- Configure valid keys via `API_KEYS` environment variable (comma-separated)

### POST /api/scan

Scan text for prompt injection patterns (fast regex-based analysis).

**Request:**
```json
{
  "input": "Your text to scan here",
  "deepAnalysis": false  // Optional: enqueue async LLM analysis
}
```

**Response (without deep analysis):**
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

**Response (with deep analysis enabled):**
```json
{
  "success": true,
  "analysis": { /* ... same as above ... */ },
  "meta": { /* ... same as above ... */ },
  "deepAnalysis": {
    "queueId": "uuid-here",
    "status": "pending",
    "pollEndpoint": "/api/scan/result?id=uuid-here"
  }
}
```

**Rate Limits:**
- 10 requests per minute per IP
- Returns `429` when exceeded
- `X-RateLimit-Remaining` header included in all responses
- **Note**: If rate limiter service (Upstash Redis) is unavailable, requests fail open (are allowed) to maintain service availability

**Schema:** See [public/api/scanner/schema.json](./public/api/scanner/schema.json)

---

### POST /api/scan/deep

Enqueue async deep analysis (LLM-based).

**Request:**
```json
{
  "inputHash": "abc123...",  // HMAC hash from /api/scan
  "inputLength": 45,
  "metadata": {}  // Optional additional metadata
}
```

**Response:**
```json
{
  "success": true,
  "queueId": "uuid-here",
  "status": "pending",
  "message": "Deep analysis enqueued. Poll /api/scan/result?id=uuid-here",
  "pollEndpoint": "/api/scan/result?id=uuid-here"
}
```

**Rate Limits:** Same as `/api/scan` (10 req/min per IP)

**Privacy Note:** Only the input hash is stored, never the raw text.

**Note:** Deep analysis currently uses a placeholder LLM stub. Real LLM integration planned for future releases.

---

### GET /api/scan/result?id=<queueId>

Fetch async deep analysis result.

**Rate Limits:** Same as `/api/scan` (10 req/min per IP)

**Response (pending/processing):**
```json
{
  "success": true,
  "status": "pending",  // or "processing"
  "message": "Analysis still in progress. Please poll again.",
  "queueId": "uuid-here",
  "enqueuedAt": "2025-11-06T20:00:00.000Z"
}
```
**HTTP Status:** `202 Accepted`

**Response (completed):**
```json
{
  "success": true,
  "status": "completed",
  "queueId": "uuid-here",
  "enqueuedAt": "2025-11-06T20:00:00.000Z",
  "result": {
    "deepScore": 75,
    "confidence": 0.85,
    "reasoning": "Deep LLM analysis detected...",
    "recommendations": ["..."]
  },
  "meta": {
    "inputHash": "abc123...",
    "inputLength": 45
  }
}
```
**HTTP Status:** `200 OK`

**Response (failed):**
```json
{
  "success": false,
  "status": "failed",
  "queueId": "uuid-here",
  "error": "Analysis failed: reason"
}
```
**HTTP Status:** `200 OK`

**Response (not found):**
```json
{
  "success": false,
  "error": "Job not found. It may have expired (24 hour TTL)."
}
```
**HTTP Status:** `404 Not Found`

## Rules & Detection

Rules are defined in [public/api/scanner/rules/rules.json](./public/api/scanner/rules/rules.json).

See [RULES-CHANGELOG.md](./RULES-CHANGELOG.md) for version history and changes.

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

### Rules Governance (Phase 2)

All rule changes are version-controlled and require:

1. **Version Bump**: Increment version in `rules.json`
2. **Changelog Entry**: Document changes in `RULES-CHANGELOG.md`
3. **CI Validation**: Automated enforcement via GitHub Actions

**Workflow:**

```bash
# 1. Edit rules.json with your changes
vim public/api/scanner/rules/rules.json

# 2. Bump version and add changelog template
npm run bump-rules [major|minor|patch]

# 3. Edit RULES-CHANGELOG.md to describe your changes
vim RULES-CHANGELOG.md

# 4. Commit both files
git add public/api/scanner/rules/rules.json RULES-CHANGELOG.md
git commit -m "chore: bump rules to v1.0.1 - added new detection pattern"

# 5. Push (CI will validate version bump and changelog)
git push
```

**CI Enforcement:**

The `rules-validate.yml` workflow ensures:
- If `rules.json` changed, version was bumped
- Changelog has a corresponding entry (not just template)
- PR fails if requirements are not met

This governance ensures rule changes are auditable and traceable.

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
- `SENTRY_DSN`
- `DEEP_ANALYSIS_MAX_ATTEMPTS`
- `DEEP_ANALYSIS_BACKOFF_BASE_MS`
- `DEEP_ANALYSIS_BACKOFF_CAP_MS`
- `WORKER_IDLE_DELAY_MS`

## Roadmap / TODOs

### Phase 2 (Completed ✅)
- [x] Add async deep LLM analysis worker (non-blocking)
- [x] Implement API key authentication (optional, prod-only)
- [x] Implement background queue for deep analysis (Upstash KV)
- [x] Rules governance with version control and changelog
- [x] UI polish (status badges, copy button, disclosure)

### Future Enhancements
- [ ] Integrate actual LLM API for deep analysis (currently placeholder)
- [ ] Add Datadog Serverless APM documentation
- [ ] Add CAPTCHA for public endpoints
- [ ] Create dashboard for rule management
- [ ] Add A/B testing for rule effectiveness
- [x] Implement worker process for queue consumption

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
