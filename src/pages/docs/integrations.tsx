import DocsLayout from "../../components/DocsLayout";
import styles from "../../components/DocsLayout.module.css";

const expressSnippet = `import express from "express";
import { scanInput } from "./src/lib/scanner";

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

  const reply = await callYourLLM(prompt); // your own LLM adapter
  return res.json({ reply, scan });
});`;

const fastapiSnippet = `import json
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
    return json.loads(proc.stdout)`;

const ciSnippet = `name: prompt-defenders
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
          node scripts/check-scan.js scan-report.json`;

const thresholdSnippet = `import { readFileSync } from "node:fs";

const report = JSON.parse(readFileSync(process.argv[2], "utf8"));
if (report.risk_score >= 50) {
  console.error("Prompt Defenders detected high-risk patterns:", report.issues);
  process.exit(1);
}
console.log("Prompts look clean", report.risk_score);`;

const vitestSnippet = `import { scanInput } from "../src/lib/scanner";

it("marketing copy fixtures stay clean", () => {
  const report = scanInput(loadMarketingTemplate());
  expect(report.success).toBe(true);
  expect(report.analysis.score).toBeLessThan(20);
});`;

export default function IntegrationsDocs() {
  return (
    <DocsLayout
      title="Integration guide"
      metaDescription="Gate prompts in Express middleware, bridge the CLI from FastAPI, and fail CI builds on high-risk prompt findings with Prompt Defenders."
      description="Three proven integration points: inline middleware before your model call, a CLI bridge from non-Node stacks, and CI gates for prompt libraries."
    >
      <section className={styles.card}>
        <p className={styles.sectionLabel}>Middleware</p>
        <h2 className={styles.cardTitle}>Express: block before the model call</h2>
        <p className={styles.cardCopy}>
          Score every prompt inline and reject anything at or above the high band (score ≥ 50). A
          runnable version lives in{" "}
          <a
            href="https://github.com/RazonIn4K/prompt-defenders/tree/main/examples/integration_demo"
            target="_blank"
            rel="noopener noreferrer"
          >
            examples/integration_demo
          </a>
          .
        </p>
        <pre className={styles.codeBlock}>{expressSnippet}</pre>
      </section>

      <section className={styles.card}>
        <p className={styles.sectionLabel}>CLI bridge</p>
        <h2 className={styles.cardTitle}>FastAPI (or any stack) via the CLI</h2>
        <p className={styles.cardCopy}>
          Non-Node services can pipe prompts to <code>prompt-defender scan -</code> over stdin and
          parse the JSON report. Run it from a clone of this repo (the CLI is not yet published to
          npm).
        </p>
        <pre className={styles.codeBlock}>{fastapiSnippet}</pre>
      </section>

      <section className={styles.card}>
        <p className={styles.sectionLabel}>CI</p>
        <h2 className={styles.cardTitle}>Fail builds on risky prompt templates</h2>
        <p className={styles.cardCopy}>
          Scan seed prompts (system messages, scripted flows) in your pipeline and fail the build
          when the report crosses your threshold:
        </p>
        <pre className={styles.codeBlock}>{ciSnippet}</pre>
        <pre className={styles.codeBlock}>{thresholdSnippet}</pre>
        <p className={styles.cardCopy}>
          Or gate prompt fixtures directly inside tests:
        </p>
        <pre className={styles.codeBlock}>{vitestSnippet}</pre>
        <ul className={styles.list}>
          <li>Treat <code>risk_score &gt;= 50</code> as a blocking threshold.</li>
          <li>Upload the scan report as a build artifact so reviewers can inspect advisories.</li>
          <li>
            Full guide:{" "}
            <a
              href="https://github.com/RazonIn4K/prompt-defenders/blob/main/docs/ci_integration.md"
              target="_blank"
              rel="noopener noreferrer"
            >
              docs/ci_integration.md
            </a>
          </li>
        </ul>
      </section>
    </DocsLayout>
  );
}
