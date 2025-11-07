#!/usr/bin/env node

/**
 * Check Rules Version Bump
 *
 * Validates that:
 * 1. If rules.json changed, version was bumped
 * 2. Corresponding changelog entry exists in RULES-CHANGELOG.md
 *
 * Used in CI to enforce rules governance
 */

const { execSync } = require("child_process");
const { readFileSync } = require("fs");
const { join } = require("path");

function exec(command) {
  try {
    return execSync(command, { encoding: "utf-8" }).trim();
  } catch (error) {
    return "";
  }
}

function main() {
  console.log("🔍 Checking rules version bump...\n");

  // Get the base branch (main or develop)
  const baseBranch = process.env.GITHUB_BASE_REF || "main";
  console.log(`Base branch: ${baseBranch}`);

  // Fetch the base branch
  exec(`git fetch origin ${baseBranch}`);

  // Check if rules.json was modified
  const rulesChanged = exec(
    `git diff --name-only origin/${baseBranch}...HEAD | grep "public/api/scanner/rules/rules.json"`
  );

  if (!rulesChanged) {
    console.log("✅ No changes to rules.json - skipping version check\n");
    return;
  }

  console.log("📝 rules.json was modified - verifying version bump...\n");

  // Get current version
  const rulesPath = join(process.cwd(), "public/api/scanner/rules/rules.json");
  const rules = JSON.parse(readFileSync(rulesPath, "utf-8"));
  const currentVersion = rules.version;

  // Get previous version from base branch
  const previousRulesContent = exec(
    `git show origin/${baseBranch}:public/api/scanner/rules/rules.json`
  );

  if (!previousRulesContent) {
    console.log("⚠️  Could not fetch previous rules.json - assuming new file\n");
    checkChangelogEntry(currentVersion);
    return;
  }

  const previousRules = JSON.parse(previousRulesContent);
  const previousVersion = previousRules.version;

  console.log(`Previous version: ${previousVersion}`);
  console.log(`Current version:  ${currentVersion}`);

  // Check if version was bumped
  if (currentVersion === previousVersion) {
    console.error("\n❌ ERROR: rules.json was modified but version was not bumped!");
    console.error("\nPlease run:");
    console.error("  npm run bump-rules [major|minor|patch]");
    console.error("\nThen commit the changes.\n");
    process.exit(1);
  }

  // Validate version format and increment
  if (!isValidVersionBump(previousVersion, currentVersion)) {
    console.error(
      `\n❌ ERROR: Invalid version bump from ${previousVersion} to ${currentVersion}`
    );
    console.error("Version must follow semver and increment by one level.\n");
    process.exit(1);
  }

  console.log("✅ Version was bumped correctly\n");

  // Check changelog entry
  checkChangelogEntry(currentVersion);
}

function isValidVersionBump(previous, current) {
  const prevParts = previous.split(".").map(Number);
  const currParts = current.split(".").map(Number);

  if (prevParts.length !== 3 || currParts.length !== 3) {
    return false;
  }

  const [prevMajor, prevMinor, prevPatch] = prevParts;
  const [currMajor, currMinor, currPatch] = currParts;

  // Major bump
  if (currMajor === prevMajor + 1 && currMinor === 0 && currPatch === 0) {
    return true;
  }

  // Minor bump
  if (
    currMajor === prevMajor &&
    currMinor === prevMinor + 1 &&
    currPatch === 0
  ) {
    return true;
  }

  // Patch bump
  if (
    currMajor === prevMajor &&
    currMinor === prevMinor &&
    currPatch === prevPatch + 1
  ) {
    return true;
  }

  return false;
}

function checkChangelogEntry(version) {
  console.log(`🔍 Checking for changelog entry for v${version}...\n`);

  const changelogPath = join(process.cwd(), "RULES-CHANGELOG.md");
  const changelog = readFileSync(changelogPath, "utf-8");

  // Check if version appears in changelog
  const versionRegex = new RegExp(`## v${version.replace(/\./g, "\\.")}`, "i");

  if (!versionRegex.test(changelog)) {
    console.error(`\n❌ ERROR: No changelog entry found for v${version}!`);
    console.error("\nPlease add a changelog entry to RULES-CHANGELOG.md:");
    console.error(`\n## v${version} - YYYY-MM-DD`);
    console.error("- [Added/Modified/Removed] Rule PI-XXX: Description");
    console.error("- Rationale: Why was this change made?\n");
    process.exit(1);
  }

  // Check if the entry is not just the template
  const versionSection = extractVersionSection(changelog, version);
  if (isTemplateEntry(versionSection)) {
    console.error(`\n❌ ERROR: Changelog entry for v${version} appears to be a template!`);
    console.error("\nPlease edit RULES-CHANGELOG.md and replace the template with actual changes.\n");
    process.exit(1);
  }

  console.log("✅ Valid changelog entry found\n");
}

function extractVersionSection(changelog, version) {
  const versionRegex = new RegExp(
    `## v${version.replace(/\./g, "\\.")}.*?\n(.*?)(?=\n## v|$)`,
    "is"
  );
  const match = changelog.match(versionRegex);
  return match ? match[1] : "";
}

function isTemplateEntry(section) {
  // Check if section contains template placeholders
  const templateMarkers = [
    "PI-XXX",
    "[Added/Modified/Removed]",
    "Description of change",
    "Why was this change made",
  ];

  return templateMarkers.some((marker) => section.includes(marker));
}

main();
