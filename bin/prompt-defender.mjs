#!/usr/bin/env node
import "tsx/esm";

const moduleUrl = new URL("../src/cli.ts", import.meta.url);
const cli = await import(moduleUrl.href);

const exitCode = await cli.runCli();
if (typeof exitCode === "number" && exitCode !== 0) {
  process.exitCode = exitCode;
}
