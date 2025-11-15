# Prompt Defenders – Managed SaaS Offering Outline

## Service Model
- Multi-tenant control plane hosted on Vercel/Cloud Run with per-tenant API keys and isolated rule packs.
- Edge worker (or customer-provided middleware) forwards prompts to `/v1/scan` API before reaching the LLM provider.
- Optional on-prem agent pulls updated rules + mitigation playbooks for regulated environments.

## Core Components
1. **Ingestion API** – Accepts prompt payload + metadata, runs rule pack, returns JSON (score, advisories, mitigation suggestions, input hash).
2. **Rules governance service** – Versioned store with tenant overrides, approval workflow, and emergency rollback.
3. **Metrics pipeline** – Aggregates anonymized advisory counts, severity distribution, time-to-block, and exports to customer dashboards (Grafana/Snowflake).
4. **Notification bus** – Webhooks/Slack/MS Teams connectors for critical detections; supports rate limiting and batching.
5. **Admin console** – Multi-tenant UI for SOC teams to view incidents, approve new rules, and download audit logs.

## Usage Metering & Plans
- Meter on *scanned prompts per month* with burst credits for live incidents.
- Include add-ons for:
  - Dedicated rule-pack tuning (hours/mo)
  - Deep-analysis worker quotas
  - Compliance exports (SOC2 attestation packages)
- Offer SLA upgrades (e.g., 99.9% uptime, <150 ms P95 scan latency) for higher tiers.

## Operational Considerations
- **Data handling**: Store only HMAC hashes + advisories; raw prompts must never leave customer perimeter.
- **Latency budget**: Keep synchronous scans <50 ms at 95th percentile; push heavy NLP to async queues.
- **Isolation**: Namespace Redis/storage per tenant or use row-level security to prevent cross-tenant data leaks.
- **Security**: Mutual TLS + signed webhooks, audit logging for console actions, periodic rule-pack penetration tests.

## Roadmap Hooks
- Automated drift detection to alert when new prompt patterns evade existing rules.
- Self-service policy editing with preview sandboxes before publishing to production tenants.
- Billing integrations (Stripe, Chargebee) to handle metered usage and SLA credits automatically.
- Marketplace adapters (LangChain, LlamaIndex, Zendesk bots) for zero-code onboarding.
