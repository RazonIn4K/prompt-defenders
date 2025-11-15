# Prompt Defenders – Technical Deep Dive

## Scanning Approach
- **Synchronous regex scanning**: Inputs are normalized to UTF-8 strings and evaluated against a curated rule pack. The scanner never persists raw prompts; only HMAC hashes plus metadata (length, timestamp) are exposed to downstream systems.
- **Deterministic scoring**: Each advisory carries a severity-derived weight (10–100). Scores are capped at 100 and rolled into a severity ladder (`low`, `medium`, `high`, `critical`). Thresholds can be tuned per integration.
- **Mitigation catalog**: CLI and SDK responses include contextual mitigation text so engineers can automate responses (block, redact, escalate) without digging through documentation.

## Rule Packs
- Stored in `public/api/scanner/rules/rules.json` with version tags and changelog enforcement.
- Patterns span override attempts, system prompt leaks, jailbreak keywords, encoded payload indicators, SQL/tool exploits, and repetition/amplification signals.
- Governance scripts (`npm run validate-rules`, `npm run bump-rules`) ensure every change increments the pack version and records rationale.
- Tests under `tests/cli.test.ts` assert coverage for public jailbreak families and regression prompts sourced from real incidents.

## Known Limitations
- **Regex scope**: Highly obfuscated payloads, multi-lingual attacks, or image/audio-based prompts may bypass detection until new rules are shipped.
- **Context window**: Scanner operates on a single input blob. Multi-turn exploits must be flattened upstream or augmented with conversation-state analyzers.
- **Latency vs. depth**: Deep LLM-assisted analysis is intentionally deferred (future worker queue) to preserve P99 latency under 10 ms for inline API usage.
- **Tool awareness**: We warn on explicit SQL/API instructions but do not yet simulate tool executions. Pair with runtime authorization and output filters.

## Roadmap Highlights
1. **Semantic heuristics** – lightweight embedding similarity to catch paraphrased jailbreaks without adding heavy model dependencies.
2. **Adaptive rule packs** – tenant-specific allow/deny lists with automated propagation and rollback tooling.
3. **Async deep analysis worker** – queue-based pipeline that escalates high-risk prompts to an LLM for red-team style summaries.
4. **Telemetry & drift detection** – dashboards showing rule hit frequency, novel patterns, and automated suggestions for new signatures.
5. **Toolchain hooks** – first-class plugins for LangChain, LlamaIndex, Vercel AI SDK, and enterprise chat platforms so adoption requires zero custom glue code.

For implementation details on deployment topologies and complementary controls, see [docs/security.md](./security.md). High-level positioning for buyers is summarized in [README.md](../README.md).
