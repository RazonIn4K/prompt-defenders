#!/usr/bin/env node
// Runs src/cli.ts through the tsx CLI in a child process. Loader-hook
// approaches (tsx/esm, tsx/esm/api register/tsImport) break on newer Node
// and on Windows (require/ESM cycle, ?namespace mangled into the path).
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const tsxCli = require.resolve("tsx/cli");
const cliEntry = fileURLToPath(new URL("../src/cli.ts", import.meta.url));

const child = spawn(process.execPath, [tsxCli, cliEntry, ...process.argv.slice(2)], {
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  process.exitCode = signal ? 1 : (code ?? 0);
});
