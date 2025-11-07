#!/usr/bin/env node

/**
 * Bump Rules Version Script
 *
 * Increments the version in rules.json and adds a changelog template
 * Usage: npm run bump-rules [major|minor|patch]
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

// Parse arguments
const args = process.argv.slice(2);
const bumpType = args[0] || "patch"; // default to patch

if (!["major", "minor", "patch"].includes(bumpType)) {
  console.error('❌ Invalid bump type. Use: major, minor, or patch');
  process.exit(1);
}

// Paths
const rulesPath = join(process.cwd(), "public/api/scanner/rules/rules.json");
const changelogPath = join(process.cwd(), "RULES-CHANGELOG.md");

try {
  // Read rules.json
  const rulesContent = readFileSync(rulesPath, "utf-8");
  const rules = JSON.parse(rulesContent);

  // Parse current version
  const currentVersion = rules.version;
  const [major, minor, patch] = currentVersion.split(".").map(Number);

  if (isNaN(major) || isNaN(minor) || isNaN(patch)) {
    console.error(`❌ Invalid version format in rules.json: ${currentVersion}`);
    process.exit(1);
  }

  // Increment version
  let newVersion;
  switch (bumpType) {
    case "major":
      newVersion = `${major + 1}.0.0`;
      break;
    case "minor":
      newVersion = `${major}.${minor + 1}.0`;
      break;
    case "patch":
      newVersion = `${major}.${minor}.${patch + 1}`;
      break;
  }

  console.log(`📦 Bumping version: ${currentVersion} → ${newVersion} (${bumpType})`);

  // Update rules.json
  rules.version = newVersion;
  rules.updated = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  writeFileSync(rulesPath, JSON.stringify(rules, null, 2) + "\n");
  console.log(`✅ Updated ${rulesPath}`);

  // Prepare changelog template
  const today = new Date().toISOString().split("T")[0];
  const changelogTemplate = `
## v${newVersion} - ${today}

- [Added/Modified/Removed] Rule PI-XXX: Description of change
- Rationale: Why was this change made?

---

`;

  // Read current changelog
  const changelogContent = readFileSync(changelogPath, "utf-8");

  // Find insertion point (after the "---" following the format section)
  const insertMarker = "---\n\n## v";
  const insertIndex = changelogContent.indexOf(insertMarker);

  if (insertIndex === -1) {
    console.error("❌ Could not find insertion point in RULES-CHANGELOG.md");
    console.log("⚠️  Please manually add the following to RULES-CHANGELOG.md:");
    console.log(changelogTemplate);
  } else {
    // Insert new changelog entry
    const beforeMarker = changelogContent.substring(0, insertIndex + 5); // Include "---\n"
    const afterMarker = changelogContent.substring(insertIndex + 5);
    const updatedChangelog = beforeMarker + changelogTemplate + afterMarker;

    writeFileSync(changelogPath, updatedChangelog);
    console.log(`✅ Added changelog template to ${changelogPath}`);
  }

  console.log("\n📝 Next steps:");
  console.log("1. Edit RULES-CHANGELOG.md to describe your changes");
  console.log("2. Commit both files:");
  console.log(`   git add ${rulesPath} ${changelogPath}`);
  console.log(`   git commit -m "chore: bump rules to v${newVersion}"`);
  console.log("3. Push to trigger CI validation\n");

} catch (error) {
  console.error("❌ Error:", error.message);
  process.exit(1);
}
