import DocsLayout from "../../components/DocsLayout";
import styles from "../../components/DocsLayout.module.css";

const authSnippet = `curl -X POST https://prompt-defenders.vercel.app/api/scan \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: your-api-key-here" \\
  -d '{"input":"test"}'`;

const scanRequest = `{
  "input": "Your text to scan here",
  "deepAnalysis": false
}`;

const scanResponse = `{
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
    "rulesVersion": "1.0.2",
    "timestamp": "2026-06-09T20:00:00.000Z"
  }
}`;

const deepResponse = `{
  "success": true,
  "analysis": { "...": "same as above" },
  "meta": { "...": "same as above" },
  "deepAnalysis": {
    "queueId": "uuid-here",
    "status": "pending",
    "pollEndpoint": "/api/scan/result?id=uuid-here"
  }
}`;

const resultStates = `202 Accepted   { "success": true,  "status": "pending" | "processing", ... }
200 OK         { "success": true,  "status": "completed", "result": { "deepScore": 75, ... } }
200 OK         { "success": false, "status": "failed", "error": "Analysis failed: reason" }
404 Not Found  { "success": false, "error": "Job not found. It may have expired (24 hour TTL)." }`;

export default function ApiDocs() {
  return (
    <DocsLayout
      title="API reference"
      metaDescription="Endpoint specs for the Prompt Defenders scan API: POST /api/scan, POST /api/scan/deep, and GET /api/scan/result, with authentication and rate limits."
      description="Three endpoints: a fast synchronous scan, an async deep-analysis queue, and a polling endpoint. Responses follow a versioned JSON contract."
    >
      <section className={styles.card}>
        <p className={styles.sectionLabel}>Authentication</p>
        <h2 className={styles.cardTitle}>X-API-Key (production only)</h2>
        <p className={styles.cardCopy}>
          In production, direct API calls require an <code>X-API-Key</code> header (configured via
          the comma-separated <code>API_KEYS</code> environment variable); requests without a valid
          key get <code>401</code>. Same-origin requests from the hosted form are exempt, and
          development mode is permissive.
        </p>
        <pre className={styles.codeBlock}>{authSnippet}</pre>
      </section>

      <section className={styles.card}>
        <p className={styles.sectionLabel}>Endpoint</p>
        <h2 className={styles.cardTitle}>POST /api/scan</h2>
        <p className={styles.cardCopy}>
          Fast regex scan against the versioned rule pack. Input is HMAC-hashed in memory and never
          stored; maximum input size is 100KB (<code>400</code> above it).
        </p>
        <pre className={styles.codeBlock}>{scanRequest}</pre>
        <pre className={styles.codeBlock}>{scanResponse}</pre>
        <p className={styles.cardCopy}>
          With <code>&quot;deepAnalysis&quot;: true</code> the response also carries a queue
          reference:
        </p>
        <pre className={styles.codeBlock}>{deepResponse}</pre>
        <ul className={styles.list}>
          <li>
            Rate limit: 10 requests/minute per IP — <code>429</code> when exceeded, with an{" "}
            <code>X-RateLimit-Remaining</code> header on every response. If the rate-limit backend
            is unavailable, requests fail open to preserve availability.
          </li>
          <li>
            The response shape is governed by the versioned contract at{" "}
            <a href="/api/scanner/schema.json">/api/scanner/schema.json</a>, and{" "}
            <code>tests/apiScan.test.ts</code> validates responses against that file in CI.
          </li>
        </ul>
      </section>

      <section className={styles.card}>
        <p className={styles.sectionLabel}>Endpoint</p>
        <h2 className={styles.cardTitle}>POST /api/scan/deep</h2>
        <p className={styles.cardCopy}>
          Enqueues async deep analysis for a previously scanned input. Only the input hash and
          length are submitted — never raw text. Same rate limits as <code>/api/scan</code>.
        </p>
        <p className={styles.cardCopy}>
          Honest caveat: the deep-analysis worker currently uses a placeholder LLM stub; real LLM
          integration is a roadmap item. Treat deep results as illustrative until then.
        </p>
      </section>

      <section className={styles.card}>
        <p className={styles.sectionLabel}>Endpoint</p>
        <h2 className={styles.cardTitle}>GET /api/scan/result?id=&lt;queueId&gt;</h2>
        <p className={styles.cardCopy}>
          Polls a queued deep analysis. Jobs expire after 24 hours. Response states:
        </p>
        <pre className={styles.codeBlock}>{resultStates}</pre>
      </section>
    </DocsLayout>
  );
}
