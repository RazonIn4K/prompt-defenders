import DocsLayout from "../../components/DocsLayout";
import styles from "../../components/DocsLayout.module.css";

const privacySignals = [
  "Raw input never stored",
  "HMAC-SHA256 hash only",
  "100KB input cap",
  "10 req/min rate limit",
  "Prod API-key auth",
  "Masked telemetry inputs",
];

export default function SecurityDocs() {
  return (
    <DocsLayout
      title="Security model"
      metaDescription="How to deploy Prompt Defenders as a preflight guardrail, its privacy posture (HMAC-only, no raw storage), honest limitations, and complementary controls."
      description="Prompt Defenders is a preflight scanner: it runs before user text reaches privileged LLM contexts so risky content can be blocked, quarantined, or routed for review."
    >
      <section className={styles.card}>
        <p className={styles.sectionLabel}>Deployment model</p>
        <h2 className={styles.cardTitle}>Run it inline, act on thresholds</h2>
        <ul className={styles.list}>
          <li>
            <strong>Inline guardrail</strong> — call <code>scanInput()</code> (Node) or the CLI
            inside your API, chatbot gateway, or orchestrator before any LLM call.
          </li>
          <li>
            <strong>Severity thresholds</strong> — treat score ≥ 50 (high) as a hard block and
            score ≥ 80 (critical) as block plus alert; log advisories for your SOC.
          </li>
          <li>
            <strong>Hash-only logging</strong> — store <code>meta.inputHash</code> plus advisories
            for auditing; never persist raw prompts.
          </li>
          <li>
            <strong>Feedback loop</strong> — return a safe remediation hint when you block, so
            users understand the denial.
          </li>
        </ul>
      </section>

      <section className={styles.card}>
        <p className={styles.sectionLabel}>Privacy posture</p>
        <h2 className={styles.cardTitle}>What the service keeps (and doesn&apos;t)</h2>
        <p className={styles.cardCopy}>
          Submitted text exists only during request processing. The service computes an
          HMAC-SHA256 hash for correlation, records input length and timestamp, and discards the
          raw input. Telemetry (Datadog RUM) runs with <code>mask-user-input</code>.
        </p>
        <div className={styles.badgeRow}>
          {privacySignals.map((signal) => (
            <span key={signal} className={styles.badge}>
              {signal}
            </span>
          ))}
        </div>
        <p className={styles.cardCopy}>
          Full policies:{" "}
          <a
            href="https://github.com/RazonIn4K/prompt-defenders/blob/main/docs/PRIVACY.md"
            target="_blank"
            rel="noopener noreferrer"
          >
            PRIVACY.md
          </a>{" "}
          ·{" "}
          <a
            href="https://github.com/RazonIn4K/prompt-defenders/blob/main/docs/SECURITY.md"
            target="_blank"
            rel="noopener noreferrer"
          >
            SECURITY.md
          </a>
        </p>
      </section>

      <section className={styles.card}>
        <p className={styles.sectionLabel}>Limitations</p>
        <h2 className={styles.cardTitle}>What it deliberately does not claim</h2>
        <ul className={styles.list}>
          <li>
            The rule pack is regex-based — it cannot catch every obfuscated payload, image-based
            attack, or multi-turn exploit. Pair it with output filtering.
          </li>
          <li>
            Scanning is synchronous over UTF-8 text; normalize binary attachments, audio
            transcripts, or streaming partials upstream.
          </li>
          <li>
            It is not downstream policy enforcement — you still need sandboxing, least-privilege
            tool access, and output filters at the model boundary.
          </li>
          <li>
            Deep analysis is intentionally out-of-band (async queue) to protect latency-sensitive
            conversations, and currently uses a placeholder LLM stub.
          </li>
        </ul>
      </section>

      <section className={styles.card}>
        <p className={styles.sectionLabel}>Layered defense</p>
        <h2 className={styles.cardTitle}>Complementary controls</h2>
        <ul className={styles.list}>
          <li>Network: rate limiting, IP reputation, WAF rules ahead of the scanner.</li>
          <li>
            Application: authentication, role-based access, strict separation of system prompts
            from user content.
          </li>
          <li>Observability: pipe advisories into your SIEM so attack clusters surface.</li>
          <li>
            Human-in-the-loop: route blocked prompts on critical workflows (payments, admin
            actions) to an analyst instead of discarding them.
          </li>
        </ul>
        <p className={styles.cardCopy}>
          Found a vulnerability in Prompt Defenders itself? Report privately via{" "}
          <a
            href="https://github.com/RazonIn4K/prompt-defenders/security/advisories/new"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub Security Advisories
          </a>
          — please don&apos;t open a public issue.
        </p>
      </section>
    </DocsLayout>
  );
}
