import { createHmac } from "crypto";
import rules from "../../public/api/scanner/rules/rules.json";

export interface ScanResult {
  success: boolean;
  analysis: {
    score: number;
    severity: "low" | "medium" | "high" | "critical";
    categories: string[];
    advisories: Array<{
      ruleId: string;
      description: string;
      severity: string;
      rationale: string;
    }>;
  };
  meta: {
    inputHash: string;
    inputLength: number;
    rulesVersion: string;
    timestamp: string;
  };
  error?: string;
}

export interface Rule {
  id: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  pattern: string;
  rationale: string;
}

// HMAC hash for correlation (not storing raw input)
export function hashInput(input: string): string {
  const salt = process.env.HASH_SALT || "default-salt-change-in-production";
  return createHmac("sha256", salt).update(input).digest("hex");
}

// Compute risk score based on severity
function computeScore(advisories: Array<{ severity: string }>): number {
  const severityWeights = {
    low: 10,
    medium: 25,
    high: 50,
    critical: 100,
  };

  let totalScore = 0;
  for (const advisory of advisories) {
    totalScore += severityWeights[advisory.severity as keyof typeof severityWeights] || 0;
  }

  // Cap at 100
  return Math.min(100, totalScore);
}

// Determine overall severity
function determineSeverity(score: number): "low" | "medium" | "high" | "critical" {
  if (score >= 80) return "critical";
  if (score >= 50) return "high";
  if (score >= 20) return "medium";
  return "low";
}

// Main scanner function
export function scanInput(input: string): ScanResult {
  try {
    // Validate input
    if (!input || typeof input !== "string") {
      return {
        success: false,
        analysis: {
          score: 0,
          severity: "low",
          categories: [],
          advisories: [],
        },
        meta: {
          inputHash: "",
          inputLength: 0,
          rulesVersion: rules.version,
          timestamp: new Date().toISOString(),
        },
        error: "Invalid input",
      };
    }

    // Hash input for correlation only (not stored)
    const inputHash = hashInput(input);
    const inputLength = input.length;

    // Run regex prefilter against rule pack
    const advisories: Array<{
      ruleId: string;
      description: string;
      severity: string;
      rationale: string;
    }> = [];

    const categories = new Set<string>();

    for (const rule of rules.rules) {
      try {
        const regex = new RegExp(rule.pattern, "gi");
        if (regex.test(input)) {
          advisories.push({
            ruleId: rule.id,
            description: rule.description,
            severity: rule.severity,
            rationale: rule.rationale,
          });
          categories.add(rule.description);
        }
      } catch (regexError) {
        console.error(`Error in rule ${rule.id}:`, regexError);
      }
    }

    // Compute score and severity
    const score = computeScore(advisories);
    const severity = determineSeverity(score);

    return {
      success: true,
      analysis: {
        score,
        severity,
        categories: Array.from(categories),
        advisories,
      },
      meta: {
        inputHash,
        inputLength,
        rulesVersion: rules.version,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error("Scanner error:", error);
    return {
      success: false,
      analysis: {
        score: 0,
        severity: "low",
        categories: [],
        advisories: [],
      },
      meta: {
        inputHash: "",
        inputLength: 0,
        rulesVersion: rules.version,
        timestamp: new Date().toISOString(),
      },
      error: "Internal scanner error",
    };
  }
}

// TODO: Queue async deeper LLM analysis (non-blocking)
// export async function queueDeepAnalysis(inputHash: string, result: ScanResult): Promise<void> {
//   // Implementation for background LLM analysis
//   // Could use a queue like BullMQ, AWS SQS, or similar
// }
