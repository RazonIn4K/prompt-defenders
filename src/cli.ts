import { readFile as fsReadFile } from "node:fs/promises";
import type { WriteStream } from "node:tty";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { scanInput, type ScanResult } from "./lib/scanner";

export interface CliIssue {
  rule_id: string;
  description: string;
  severity: string;
  rationale: string;
}

export interface CliReport {
  risk_score: number;
  issues: CliIssue[];
  suggested_mitigations: string[];
}

interface CliRuntime {
  stdout?: WriteStream | NodeJS.WritableStream;
  stderr?: WriteStream | NodeJS.WritableStream;
  readFile?: (filePath: string) => Promise<string>;
  readFromStdin?: () => Promise<string>;
}

interface ScanCommandConfig {
  inputPath?: string;
  ruleset: string;
  errors: string[];
  warnings: string[];
}

const DEFAULT_RULESET = "basic";

const RULE_MITIGATION_LIBRARY: Record<string, string[]> = {
  "PI-001": [
    "Reinforce system prompts server-side so user overrides are ignored.",
    "Strip override keywords (ignore/disregard/forget) before forwarding to the LLM."
  ],
  "PI-002": [
    "Never echo internal system prompts—respond with a redacted message instead.",
    "Split privileged instructions into separate, non-user-accessible channels."
  ],
  "PI-003": [
    "Lock conversation roles in middleware and reject attempts to re-assign agent personas.",
    "Use function-calling or tool abstractions instead of raw persona swaps."
  ],
  "PI-007": [
    "Deploy jailbreak-specific filters (DAN/DoAnythingNow patterns) prior to model calls.",
    "Use staged reviewers to catch unrestricted-mode requests before fulfillment."
  ],
  "PI-008": [
    "Block bypass/circumvent phrasing and prompt the user to restate their request safely.",
    "Reiterate policy boundaries whenever bypass attempts are detected."
  ],
  "PI-009": [
    "Treat prompts as untrusted SQL input—never concatenate directly with queries.",
    "Use parameterized statements or translation layers when executing downstream."
  ],
};

const BASELINE_MITIGATIONS = [
  "Route risky prompts through this scanner before each LLM call.",
  "Log hashed prompts for auditing without storing raw customer data.",
];

export function buildCliReport(result: ScanResult): CliReport {
  const issues: CliIssue[] = result.analysis.advisories.map((advisory) => ({
    rule_id: advisory.ruleId,
    description: advisory.description,
    severity: advisory.severity,
    rationale: advisory.rationale,
  }));

  return {
    risk_score: result.analysis.score,
    issues,
    suggested_mitigations: deriveMitigations(result),
  };
}

function deriveMitigations(result: ScanResult): string[] {
  const mitigations = new Set<string>(BASELINE_MITIGATIONS);

  for (const advisory of result.analysis.advisories) {
    const ruleSpecific = RULE_MITIGATION_LIBRARY[advisory.ruleId];
    if (ruleSpecific) {
      for (const action of ruleSpecific) {
        mitigations.add(action);
      }
    }
  }

  if (result.analysis.advisories.length === 0) {
    mitigations.add("No obvious injection markers detected. Continue monitoring and log the scan.");
  }

  if (result.analysis.severity === "high" || result.analysis.severity === "critical") {
    mitigations.add("Block the message, alert an operator, and request the user to restate goals safely.");
  }

  return Array.from(mitigations);
}

function defaultReadFromStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    const { stdin } = process;
    if (stdin.isTTY) {
      resolve("");
      return;
    }

    const chunks: Buffer[] = [];
    stdin.on("data", (chunk) => {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    });
    stdin.on("error", (error) => {
      reject(error);
    });
    stdin.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
  });
}

function parseScanArguments(args: string[]): ScanCommandConfig {
  let inputPath: string | undefined;
  let ruleset = DEFAULT_RULESET;
  const errors: string[] = [];
  const warnings: string[] = [];

  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    if (token === "--rules") {
      const next = args[i + 1];
      if (!next) {
        errors.push("Missing value after --rules");
      } else {
        ruleset = next;
        i += 1;
      }
      continue;
    }

    if (!inputPath) {
      inputPath = token;
    } else {
      errors.push(`Unexpected argument: ${token}`);
    }
  }

  if (ruleset !== DEFAULT_RULESET) {
    warnings.push(`Ruleset "${ruleset}" not recognized. Falling back to ${DEFAULT_RULESET}.`);
    ruleset = DEFAULT_RULESET;
  }

  return { inputPath, ruleset, errors, warnings };
}

async function readInputContents(inputPath: string | undefined, runtime: CliRuntime): Promise<string> {
  if (!inputPath || inputPath === "-") {
    const reader = runtime.readFromStdin ?? defaultReadFromStdin;
    return reader();
  }

  const reader = runtime.readFile ?? defaultReadFile;
  return reader(inputPath);
}

function defaultReadFile(filePath: string): Promise<string> {
  return fsReadFile(filePath, "utf8");
}

function printUsage(stream: NodeJS.WritableStream): void {
  stream.write("Usage: promptdefenders scan <file-path | -> [--rules basic]\n");
  stream.write("Example: npx prompt-defender scan ./prompt.txt --rules basic\n");
}

export async function runCli(argv = process.argv.slice(2), runtime: CliRuntime = {}): Promise<number> {
  const stdout = (runtime.stdout as NodeJS.WritableStream) ?? process.stdout;
  const stderr = (runtime.stderr as NodeJS.WritableStream) ?? process.stderr;

  if (argv.length === 0 || argv[0] === "--help" || argv[0] === "-h") {
    printUsage(stdout);
    return 0;
  }

  const command = argv[0];
  if (command !== "scan") {
    stderr.write(`Unknown command: ${command}\n`);
    printUsage(stderr);
    return 1;
  }

  const { inputPath, errors, warnings } = parseScanArguments(argv.slice(1));

  if (warnings.length > 0) {
    for (const warning of warnings) {
      stderr.write(`Warning: ${warning}\n`);
    }
  }

  if (errors.length > 0) {
    for (const error of errors) {
      stderr.write(`Error: ${error}\n`);
    }
    printUsage(stderr);
    return 1;
  }

  let inputText: string;
  try {
    inputText = await readInputContents(inputPath, runtime);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    stderr.write(`Failed to read input: ${message}\n`);
    return 1;
  }

  if (!inputText.trim()) {
    stderr.write("No input provided. Pass a file path or pipe data via stdin.\n");
    return 1;
  }

  const scanResult = scanInput(inputText);

  if (!scanResult.success) {
    stderr.write(`Scan failed: ${scanResult.error ?? "Unknown error"}\n`);
    return 1;
  }

  const report = buildCliReport(scanResult);
  stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  return 0;
}

const invokedUrl = process.argv[1] ? pathToFileURL(process.argv[1]).href : undefined;
if (invokedUrl && import.meta.url === invokedUrl) {
  runCli().then((code) => {
    if (code !== 0) {
      process.exitCode = code;
    }
  }).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
