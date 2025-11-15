# CI Integration Guide

Automate prompt audits so regressions never reach production.

## Scan Prompt Templates During CI

Use the CLI to scan seed prompts (system messages, marketing flows, scripted tests) as part of your pipeline. Example GitHub Actions job:

```yaml
name: prompt-defenders
on: [push, pull_request]

jobs:
  scan-prompts:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - name: Scan scripted prompts
        run: |
          npx prompt-defender scan prompts/signup_flow.txt --rules basic > scan-report.json
          node scripts/check-scan.js scan-report.json
```

`scripts/check-scan.js` can read the JSON, report findings, and exit non-zero when `risk_score >= 50` so the build fails early:

```js
import { readFileSync } from "node:fs";

const report = JSON.parse(readFileSync(process.argv[2], "utf8"));
if (report.risk_score >= 50) {
  console.error("Prompt Defenders detected high-risk patterns:", report.issues);
  process.exit(1);
}
console.log("Prompts look clean", report.risk_score);
```

## Gate Prompt Fixtures in Tests

Scan automatically generated prompts inside unit/integration tests. Example with Vitest:

```ts
import { scanInput } from "../src/lib/scanner";

it("marketing copy fixtures stay clean", () => {
  const report = scanInput(loadMarketingTemplate());
  expect(report.success).toBe(true);
  expect(report.analysis.score).toBeLessThan(20);
});
```

## Failing Builds on High-Risk Findings

- Treat `risk_score >= 50` as a blocking threshold. Exit CI with `process.exit(1)` when triggered.
- Upload `scan-report.json` as an artifact so security reviewers can inspect advisories.
- Optionally, wire Slack/Teams alerts via workflow run notifications for critical findings.

Embedding Prompt Defenders in CI proves to buyers that every release enforces the same guardrails they see during the live audit.
