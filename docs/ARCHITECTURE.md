# Architecture

This repository's system map is an [Archify](https://tt-a1i.github.io/archify/) specification.

- Spec: `docs/archify/prompt-defenders-architecture.json`
- Type: architecture (showcase)
- Captured: 2026-08-27

## Summary

Prompt Defenders is a Next.js 16 Pages Router application deployed at prompt-defenders.vercel.app. The POST /api/scan endpoint runs scanner.ts against rules.json v1.0.2 with 12 regex-based detection rules. Production API access requires an X-API-Key header while the same-origin hosted form is exempt, and input is HMAC-SHA256 hashed in memory for privacy. Asynchronous deep scans are queued via POST /api/scan/deep to Upstash Redis with a 24-hour TTL.

## Regenerate the interactive HTML

Do not commit the generated HTML (~700KB).

```bash
npx -y skills add tt-a1i/archify --skill archify --agent cursor --global --copy --yes
node bin/archify.mjs deliver architecture docs/archify/prompt-defenders-architecture.json /tmp/prompt-defenders.html --quality showcase
```
