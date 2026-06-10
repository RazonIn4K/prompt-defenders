import { readFileSync } from "fs";
import { join } from "path";
import type { GetStaticProps } from "next";
import Head from "next/head";
import Link from "next/link";
import StatusBadge from "../components/StatusBadge";
import styles from "./rules.module.css";

type Severity = "low" | "medium" | "high" | "critical";

interface Rule {
  id: string;
  description: string;
  severity: Severity;
  pattern: string;
  rationale: string;
}

interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
  notes: string[];
}

interface RulesPageProps {
  version: string;
  updated: string;
  rules: Rule[];
  changelog: ChangelogEntry[];
}

// Mirrors computeScore/determineSeverity in src/lib/scanner.ts — keep in sync.
const severityWeights: Array<{ severity: Severity; weight: number }> = [
  { severity: "low", weight: 10 },
  { severity: "medium", weight: 25 },
  { severity: "high", weight: 50 },
  { severity: "critical", weight: 100 },
];

const riskBands: Array<{ range: string; severity: Severity; meaning: string }> = [
  { range: "0 – 19", severity: "low", meaning: "Low signal against the current rule pack." },
  { range: "20 – 49", severity: "medium", meaning: "Meaningful risk signals; review before production." },
  { range: "50 – 79", severity: "high", meaning: "Should be treated as blocking until reviewed." },
  { range: "80 – 100", severity: "critical", meaning: "Blocking; strong injection indicators present." },
];

const repoUrl = "https://github.com/RazonIn4K/prompt-defenders";

export default function Rules({ version, updated, rules, changelog }: RulesPageProps) {
  return (
    <>
      <Head>
        <title>Rule Pack | Prompt Defenders</title>
        <meta
          name="description"
          content="The versioned prompt injection rule pack behind every Prompt Defenders scan: rule IDs, severities, detection patterns, scoring model, and full version history."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className={styles.page}>
        <div className={styles.heroGlow} />

        <main className={styles.container}>
          <section className={styles.hero}>
            <div className={styles.eyebrow}>Rules engine</div>
            <h1 className={styles.title}>Every scan is scored by a versioned rule pack</h1>
            <p className={styles.subtitle}>
              The full rule pack is public: every rule, its severity, and its detection pattern.
              Changes are governed — a version bump and a changelog entry are enforced by CI, so
              the version you see here is the version that scored your scan.
            </p>
            <div className={styles.signalRow}>
              <span className={styles.signalPill}>v{version}</span>
              <span className={styles.signalPill}>Updated {updated}</span>
              <span className={styles.signalPill}>{rules.length} detection rules</span>
            </div>
            <div className={styles.inlineLinks}>
              <Link href="/">← Back to scanner</Link>
              <a href="/api/scanner/rules/rules.json" target="_blank" rel="noopener noreferrer">
                Raw rules.json
              </a>
              <a href={`${repoUrl}/issues`} target="_blank" rel="noopener noreferrer">
                Propose a rule
              </a>
            </div>
          </section>

          <section className={styles.scoringGrid}>
            <div className={styles.card}>
              <p className={styles.sectionLabel}>Scoring model</p>
              <h2 className={styles.cardTitle}>Severity weights</h2>
              <p className={styles.cardCopy}>
                Each matched rule adds its severity weight to the risk score. The total is capped
                at 100.
              </p>
              <ul className={styles.weightList}>
                {severityWeights.map(({ severity, weight }) => (
                  <li key={severity} className={styles.weightRow}>
                    <StatusBadge severity={severity} />
                    <span className={styles.weightValue}>+{weight}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className={styles.card}>
              <p className={styles.sectionLabel}>Scoring model</p>
              <h2 className={styles.cardTitle}>Risk bands</h2>
              <p className={styles.cardCopy}>
                The summed score maps to an overall severity band for the whole input.
              </p>
              <ul className={styles.bandList}>
                {riskBands.map((band) => (
                  <li key={band.range} className={styles.bandRow}>
                    <span className={styles.bandRange}>{band.range}</span>
                    <StatusBadge severity={band.severity} />
                    <span className={styles.bandMeaning}>{band.meaning}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className={styles.rulesSection}>
            <p className={styles.sectionLabel}>Rule pack</p>
            <h2 className={styles.cardTitle}>
              The {rules.length} rules in v{version}
            </h2>
            <p className={styles.cardCopy}>
              Patterns are published deliberately — the pack ships in the public scanner bundle, so
              transparency costs nothing and lets you audit exactly what each rule matches.
            </p>
            <div className={styles.ruleGrid}>
              {rules.map((rule) => (
                <article key={rule.id} className={styles.ruleCard}>
                  <div className={styles.ruleHeader}>
                    <span className={styles.ruleId}>{rule.id}</span>
                    <StatusBadge severity={rule.severity} />
                  </div>
                  <h3 className={styles.ruleName}>{rule.description}</h3>
                  <p className={styles.ruleRationale}>{rule.rationale}</p>
                  <details className={styles.patternDetails}>
                    <summary>Detection pattern</summary>
                    <pre className={styles.patternBlock}>
                      <code>{rule.pattern}</code>
                    </pre>
                  </details>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.card}>
            <p className={styles.sectionLabel}>Governance</p>
            <h2 className={styles.cardTitle}>How rules change</h2>
            <ol className={styles.governanceList}>
              <li>
                Rules live in <code>public/api/scanner/rules/rules.json</code>; every change starts
                as a pull request.
              </li>
              <li>
                <code>npm run bump-rules</code> increments the semver version and scaffolds a
                changelog entry.
              </li>
              <li>
                CI validates rule structure, severity values, and regex compilation on every rules
                change.
              </li>
              <li>
                A second CI check blocks any pull request that modifies rules without a version
                bump and a real (non-template) changelog entry.
              </li>
            </ol>
            <p className={styles.cardCopy}>
              Found an injection pattern the pack misses?{" "}
              <a href={`${repoUrl}/issues`} target="_blank" rel="noopener noreferrer">
                Open an issue
              </a>{" "}
              with the payload shape and expected rule behavior.
            </p>
          </section>

          <section className={styles.card}>
            <p className={styles.sectionLabel}>History</p>
            <h2 className={styles.cardTitle}>Version history</h2>
            <div className={styles.historyList}>
              {changelog.map((entry) => (
                <article key={entry.version} className={styles.historyEntry}>
                  <div className={styles.historyHeader}>
                    <span className={styles.historyVersion}>v{entry.version}</span>
                    <span className={styles.historyDate}>{entry.date}</span>
                  </div>
                  {entry.changes.length > 0 && (
                    <ul className={styles.historyChanges}>
                      {entry.changes.map((change, idx) => (
                        <li key={idx}>{change}</li>
                      ))}
                    </ul>
                  )}
                  {entry.notes.map((note, idx) => (
                    <p key={idx} className={styles.historyNote}>
                      {note}
                    </p>
                  ))}
                </article>
              ))}
            </div>
          </section>
        </main>
      </div>
    </>
  );
}

function parseChangelog(markdown: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [];
  let current: ChangelogEntry | null = null;

  for (const rawLine of markdown.split("\n")) {
    const header = rawLine.match(/^## v(\d+\.\d+\.\d+)\s*-\s*(\d{4}-\d{2}-\d{2})/);
    if (header) {
      current = { version: header[1], date: header[2], changes: [], notes: [] };
      entries.push(current);
      continue;
    }
    if (/^#{1,3}\s/.test(rawLine)) {
      // A non-version heading (e.g. "## How to Update Rules") ends version content.
      current = null;
      continue;
    }
    if (!current) continue;

    const line = rawLine.replace(/\*\*/g, "").trim();
    if (!line || line === "---" || line.startsWith("```")) continue;

    if (line.startsWith("- ")) {
      current.changes.push(line.slice(2));
    } else {
      current.notes.push(line);
    }
  }

  return entries;
}

export const getStaticProps: GetStaticProps<RulesPageProps> = async () => {
  const pack = JSON.parse(
    readFileSync(join(process.cwd(), "public/api/scanner/rules/rules.json"), "utf-8")
  ) as { version: string; updated: string; rules: Rule[] };

  const changelog = parseChangelog(
    readFileSync(join(process.cwd(), "RULES-CHANGELOG.md"), "utf-8")
  );

  return {
    props: {
      version: pack.version,
      updated: pack.updated,
      rules: pack.rules,
      changelog,
    },
  };
};
