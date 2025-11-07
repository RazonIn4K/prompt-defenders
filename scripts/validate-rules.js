#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const RULES_PATH = path.join(__dirname, "../public/api/scanner/rules/rules.json");
const SCHEMA_PATH = path.join(__dirname, "../public/api/scanner/schema.json");

function validateRules() {
  console.log("🔍 Validating rules and schema...");

  // Check if files exist
  if (!fs.existsSync(RULES_PATH)) {
    console.error(`❌ Rules file not found: ${RULES_PATH}`);
    process.exit(1);
  }

  if (!fs.existsSync(SCHEMA_PATH)) {
    console.error(`❌ Schema file not found: ${SCHEMA_PATH}`);
    process.exit(1);
  }

  // Parse rules
  let rules;
  try {
    const rulesContent = fs.readFileSync(RULES_PATH, "utf8");
    rules = JSON.parse(rulesContent);
  } catch (error) {
    console.error(`❌ Failed to parse rules.json: ${error.message}`);
    process.exit(1);
  }

  // Parse schema
  let schema;
  try {
    const schemaContent = fs.readFileSync(SCHEMA_PATH, "utf8");
    schema = JSON.parse(schemaContent);
  } catch (error) {
    console.error(`❌ Failed to parse schema.json: ${error.message}`);
    process.exit(1);
  }

  // Validate rules structure
  if (!rules.version) {
    console.error("❌ Rules file missing 'version' field");
    process.exit(1);
  }

  if (!rules.rules || !Array.isArray(rules.rules)) {
    console.error("❌ Rules file missing 'rules' array");
    process.exit(1);
  }

  // Validate each rule
  const requiredFields = ["id", "description", "severity", "pattern", "rationale"];
  const validSeverities = ["low", "medium", "high", "critical"];

  for (let i = 0; i < rules.rules.length; i++) {
    const rule = rules.rules[i];

    // Check required fields
    for (const field of requiredFields) {
      if (!rule[field]) {
        console.error(`❌ Rule at index ${i} missing required field: ${field}`);
        process.exit(1);
      }
    }

    // Validate severity
    if (!validSeverities.includes(rule.severity)) {
      console.error(
        `❌ Rule ${rule.id} has invalid severity: ${rule.severity}. Must be one of: ${validSeverities.join(", ")}`
      );
      process.exit(1);
    }

    // Validate regex pattern
    try {
      new RegExp(rule.pattern);
    } catch (error) {
      console.error(`❌ Rule ${rule.id} has invalid regex pattern: ${error.message}`);
      process.exit(1);
    }
  }

  // Validate schema structure
  if (!schema.version) {
    console.error("❌ Schema file missing 'version' field");
    process.exit(1);
  }

  console.log(`✅ Rules validation passed!`);
  console.log(`   - Rules version: ${rules.version}`);
  console.log(`   - Schema version: ${schema.version}`);
  console.log(`   - Total rules: ${rules.rules.length}`);
}

validateRules();
