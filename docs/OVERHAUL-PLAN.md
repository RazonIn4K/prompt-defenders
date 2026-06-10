# Prompt Defenders Overhaul Plan

Date: 2026-06-09
Status: Active
Role in portfolio strategy: **the security product — prompt injection scanner +
rules engine. The product mostly exists; the work is polish and credibility, not
construction.**
Cross-repo governance: see `E:\Codebases\PORTFOLIO-OVERHAUL-MASTER-PLAN.md`.

---

## Current diagnosis (verified against the repo, with file/line references)

Strong product foundation already in place:

- **CLI**: `prompt-defender` / `promptdefenders` bins (`package.json` →
  `bin/prompt-defender.mjs` → `src/cli.ts`). Usage:
  `npx prompt-defender scan <file|-> [--rules basic]`.
- **Web UI already exists** (`src/pages/index.tsx`): scan form, score, severity,
  matched rules, mitigations, deep-analysis checkbox, copy-JSON button. The old
  plan's "add a public demo" phase is therefore obsolete — replace with "make the
  demo a stronger product landing."
- **API**: `POST /api/scan` (fast regex scan), `POST /api/scan/deep` (enqueue async
  LLM analysis via Upstash queue), `GET /api/scan/result?id=UUID` (poll).
- **Rules engine**: `public/api/scanner/rules/rules.json` — v1.0.1 (2025-11-07),
  10 rules (PI-001…PI-010), severity weights low=10 / medium=25 / high=50 /
  critical=100, risk bands 0-19 / 20-49 / 50-79 / 80-100.
- **Rules governance is real**: `scripts/validate-rules.js` (JSON syntax, required
  fields, severity enum, regex compilation), `scripts/bump-rules-version.mjs`
  (semver bump + changelog template), `scripts/check-rules-version-bump.js` +
  `.github/workflows/rules-validate.yml` (CI fails PRs that change rules without a
  version bump and a non-template `RULES-CHANGELOG.md` entry).
- **Privacy posture**: input never stored — HMAC-SHA256 hash + length + timestamp
  only (`src/lib/scanner.ts`); 100KB input cap; rate limiting 10 req/min
  (`src/lib/ratelimit.ts`); prod-only API key auth (`src/lib/auth.ts`); Sentry +
  Datadog RUM with input masking (`src/pages/_app.tsx`).
- **Tests**: 4 files, ~299 lines (`tests/cli.test.ts`, `auth.test.ts`,
  `deepAnalysisWorker.test.ts`, `queue.test.ts`) plus a 3-file example corpus
  (`examples/benign_prompt.txt`, `injection_simple.txt` → PI-001+PI-002,
  `injection_complex.txt` → PI-006/007/009) and an Express integration demo
  (`examples/integration_demo/`).

The credibility problems:

1. **The lint script is a stub**: `"lint": "echo 'Linting not yet configured' && exit 0"`
   (`package.json`). For a security-branded tool, a quality gate that always passes
   undercuts the entire "audit rigor" story. The fix is nearly free:
   `eslint.config.mjs` already exists extending `next/core-web-vitals`.
2. **The differentiator (rules governance) is invisible** — it lives in scripts, CI,
   and a changelog, with no public surface.
3. **The homepage is a bare form**, not a product landing.
4. **Cross-brand leakage**: `docs/loom/LOOM_SCRIPT.md:11,39,56` ties the tool to
   "csbrainai and Upwork audits."
5. Repo is 1 commit behind origin/main (clean tree) — fast-forward first.

### Stack
Next.js 16.0.1 (pages router), React 19.2, TypeScript 5.9.3 strict, Vitest 2.1.8,
Upstash Redis/Ratelimit, Sentry, Datadog RUM.

---

## Goal

```text
Prompt Defenders = prompt injection scanner + rules engine
```

Not: an AI security blog, a David portfolio page, a CSBrainAI companion site, or a
High Encode sub-brand.

Primary user: developers and security reviewers integrating guardrails.
Primary CTA: scan a prompt, use the CLI/API, inspect the rules.

---

## PR plan

### PR P1 — Real quality gate  (Week 1, IMMEDIATE, small)

Change `package.json`:

```json
"lint": "echo 'Linting not yet configured' && exit 0"
```

to:

```json
"lint": "eslint ."
```

(or `next lint` if it resolves the existing flat config cleanly under Next 16 —
verify which one actually runs the config; `eslint .` is the safer bet with
`eslint.config.mjs` already present). Then fix everything it flags.

Quality command target after this PR:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run validate-rules
```

All five must pass locally and in CI (`.github/workflows/ci.yml`). If CI currently
calls the stub lint, update the workflow to rely on the real one.

### PR P2 — `/rules` explorer  (Week 2 — the hero differentiator)

The governance machinery is genuinely strong and totally invisible. Build a
read-only page over data that already ships:

Route: `/rules` (new page in `src/pages/rules.tsx`).

Reads from:

```text
public/api/scanner/rules/rules.json    (current version, rules)
RULES-CHANGELOG.md                     (version history)
```

Content:

```text
Current rules version + updated date          (rules.json: version, updated)
Per rule: ID, severity badge, description, rationale
          (render the pattern in a collapsed/expandable block)
Severity → score mapping (10/25/50/100) and risk bands
Version history rendered from RULES-CHANGELOG.md
"How rules change": version bump + changelog enforced by CI
How to propose a rule (link to repo issues/PR flow)
```

Note: rule regex patterns are already public (rules.json ships in `public/`), so
rendering them is not a disclosure change.

### PR P3 — Homepage as product landing + demo  (Week 2)

Keep the current scanner form as the "Try it now" section of `src/pages/index.tsx`,
and add around it:

```text
Hero:       Prompt injection scanner and rules engine.
            Score prompts for injection risk before they reach your LLM.

CLI strip:  npx prompt-defender scan examples/injection_simple.txt --rules basic

Use cases:  pre-LLM request scanning · red-team prompt review ·
            CI checks for prompt libraries · support-chatbot guardrails

Integration snippet: Express middleware (adapt from examples/integration_demo/)

Links:      Try scanner (anchor) | View rules (/rules) | API docs | Install CLI
```

Footer: one line — "Built by David Ortiz." linking to davidtiz.com. Nothing else
cross-brand.

### PR P4 — API and integration docs surface  (Week 3)

Promote the existing material into navigable docs pages (or a docs section in the
README if pages are overkill at this stage):

```text
/docs/api            endpoint specs for /api/scan, /api/scan/deep, /api/scan/result
                     (request/response examples already exist in README)
/docs/integrations   Express middleware (examples/integration_demo/), FastAPI bridge
                     (README), CI usage (docs/ci_integration.md)
/docs/security       distilled from docs/SECURITY.md + privacy posture (HMAC-only,
                     no raw storage, rate limits, auth model)
```

Schema contract already lives at `public/api/scanner/schema.json` — link it.

### PR P5 — Boundary cleanup  (Week 1–2, small, can ride with P1 or P3)

- `docs/loom/LOOM_SCRIPT.md` (lines 11, 39, 56) ties the product to csbrainai and
  Upwork audits. Sales collateral may stay in `docs/` as internal material, but
  remove cross-brand language from: README, homepage UI, API docs, public docs,
  and metadata.
- Add `docs/BRAND-BOUNDARY.md`:

```md
# Prompt Defenders Brand Boundary

## This property is
- A prompt injection scanner and rules engine.
- A CLI / API / web tool for developers and security reviewers.

## This property is not
- A High Encode learning product.
- A CSBrainAI companion.
- David Ortiz's portfolio.

## Primary user
Developers and security reviewers integrating guardrails.

## Primary CTA
Scan a prompt; install the CLI; integrate the API; inspect the rules.

## Cross-link rule
- One restrained "Built by David Ortiz" credit is allowed (links to davidtiz.com).
- No ecosystem links. Internal sales collateral in docs/ may reference other
  properties but must not leak into public surfaces.
```

### PR P6 — Expand the red-team corpus  (Week 3, stretch but valuable)

Tests currently verify rule triggering on 3 example files; there is no E2E API test.
The rules changelog already claims alignment "with real-world jailbreak transcripts" —
back the claim:

```text
tests/corpus/
  direct-override.json            → expected: PI-001 (+ severity band)
  system-prompt-extraction.json   → expected rule IDs
  tool-exfiltration.json
  multi-turn-jailbreak.json
  benign-control.json             → expected: score 0, severity low
```

Each entry maps payload → expected rule IDs + expected severity band, executed by a
single Vitest suite iterating the corpus. Add at least one E2E test hitting
`/api/scan` (Next route handler invoked directly) to cover the API contract in
`public/api/scanner/schema.json`. Corpus additions that expose detection gaps should
drive new rules through the existing bump-rules/changelog flow.

---

## What NOT to do in this repo

- Do not position it as a blog or add learning content — that is High Encode's lane.
- Do not add deep-analysis claims the worker can't back; the async LLM lane exists
  (`src/worker/deepAnalysisWorker.ts`) but keep marketing claims tied to what ships.
- Do not bypass rules governance: any rule change goes through `bump-rules` +
  changelog, never a direct edit (CI enforces this — keep it that way).
- Do not log or store raw prompt input anywhere new; HMAC-only is a product promise.

## Done criteria for this repo

- [ ] `npm run lint` is real and green; CI runs lint/typecheck/test/build/validate-rules.
- [ ] `/rules` explorer live, rendering rules.json + RULES-CHANGELOG.md.
- [ ] Homepage reads as a product landing with CLI, use cases, integration snippet,
      and the scan form as "Try it now."
- [ ] API/integration/security docs navigable from the homepage.
- [ ] No cross-brand language on any public surface; `docs/BRAND-BOUNDARY.md` exists.
- [ ] Corpus-driven tests pass and cover every shipped rule ID at least once.
