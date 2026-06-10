import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { scanInput } from "../src/lib/scanner";

interface CorpusEntry {
  name: string;
  payload: string;
  expectedRuleIds: string[];
  expectedSeverity: "low" | "medium" | "high" | "critical";
}

interface CorpusFile {
  category: string;
  entries: CorpusEntry[];
}

const corpusDir = fileURLToPath(new URL("./corpus", import.meta.url));
const rulesPath = fileURLToPath(
  new URL("../public/api/scanner/rules/rules.json", import.meta.url)
);

const corpusFiles: CorpusFile[] = readdirSync(corpusDir)
  .filter((file) => file.endsWith(".json"))
  .map((file) => JSON.parse(readFileSync(join(corpusDir, file), "utf-8")));

const shippedRuleIds: string[] = JSON.parse(readFileSync(rulesPath, "utf-8")).rules.map(
  (rule: { id: string }) => rule.id
);

describe("red-team corpus", () => {
  for (const corpus of corpusFiles) {
    describe(corpus.category, () => {
      for (const entry of corpus.entries) {
        it(entry.name, () => {
          const result = scanInput(entry.payload);
          expect(result.success).toBe(true);

          const triggered = result.analysis.advisories.map((advisory) => advisory.ruleId);
          for (const ruleId of entry.expectedRuleIds) {
            expect(triggered, `expected ${ruleId} to trigger`).toContain(ruleId);
          }

          expect(result.analysis.severity).toBe(entry.expectedSeverity);

          if (entry.expectedRuleIds.length === 0) {
            expect(result.analysis.advisories).toEqual([]);
            expect(result.analysis.score).toBe(0);
          } else {
            expect(result.analysis.score).toBeGreaterThan(0);
          }
        });
      }
    });
  }

  it("covers every shipped rule ID at least once", () => {
    const covered = new Set(
      corpusFiles.flatMap((corpus) =>
        corpus.entries.flatMap((entry) => entry.expectedRuleIds)
      )
    );
    const uncovered = shippedRuleIds.filter((ruleId) => !covered.has(ruleId));
    expect(
      uncovered,
      `rules.json ships rule IDs with no corpus coverage: ${uncovered.join(", ")} — add corpus entries for them`
    ).toEqual([]);
  });
});
