# Prompt Defenders Security Usage Guide

## Purpose
Prompt Defenders is a preflight scanner for prompt injection detection. It is designed to run **before** user text reaches privileged LLM contexts so that risky content can be blocked, quarantined, or routed for manual review.

## Recommended Deployment Model
1. **Inline guardrail** – Call `scanInput()` (Node) or invoke the CLI (`promptdefenders scan -`) within your API, chatbot gateway, or workflow orchestrator before invoking any LLM.
2. **Severity thresholds** – Treat `score >= 50` ("high") as a hard block and `score >= 80` ("critical") as a block plus alert. Log `analysis.advisories` for your SOC.
3. **Immutable logging** – Store only the `meta.inputHash` plus advisories for auditing; never persist raw prompts unless your privacy policy allows it.
4. **Feedback loop** – When you block a prompt, return a safe remediation hint to the end user so they understand why the request was denied.

## Limitations
- The shipped rule pack is regex-based and cannot catch every obfuscated payload, image-based attack, or multi-turn exploit.
- The scanner runs synchronously and expects UTF-8 text. Binary attachments, audio transcripts, or streaming partials must be normalized upstream.
- It does not provide downstream policy enforcement—if an attacker reaches your LLM through another channel, you still need sandboxing and output filters.
- Deep analysis (LLM-assisted triage) is intentionally out-of-band to protect latency-sensitive conversations.

## Complementary Controls
- **Network layer**: Rate limiting, IP reputation, and WAF rules to cut down opportunistic traffic before it hits Prompt Defenders.
- **Application layer**: Authentication, role-based access, and strict separation between system prompts and user content.
- **Observability**: Pipe advisories into your SIEM/alerting platform so clusters of similar attacks can be investigated.
- **Human-in-the-loop**: For critical workflows (payments, admin actions), route blocked prompts to a security analyst before discarding them entirely.

## Client Project Checklist
- [ ] All user prompts scan through Prompt Defenders prior to LLM calls.
- [ ] Severity thresholds documented in runbooks and unit tests (see `tests/cli.test.ts`).
- [ ] Alerts wired to engineering/SOC channels for `critical` detections.
- [ ] Complementary rate limiting and authentication active in production.
- [ ] Periodic rule-pack updates via the repository's governance scripts.

Prompt Defenders is most effective when treated as part of a layered defense strategy—pair it with output filtering, least-privilege tool access, and active monitoring to deliver a premium "Prompt Injection Audit + Remediation" service for your clients.

For engineers wanting deeper implementation notes (rule pack governance, roadmap, and mitigation internals), see [docs/technical_deep_dive.md](./technical_deep_dive.md).
