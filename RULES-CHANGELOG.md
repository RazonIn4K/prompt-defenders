# Rules Changelog

This document tracks all changes to the prompt injection detection rule pack.

All rule changes must include a version bump and a changelog entry describing the changes.

## Format

```
## vX.Y.Z - YYYY-MM-DD
- [Added/Modified/Removed] Rule PI-XXX: Description of change
- Rationale for change
```

---

## v1.0.0 - 2025-11-06

**Initial Release**

- Added 10 core detection rules
- Coverage areas:
  - Direct instruction override (PI-001)
  - System prompt extraction (PI-002)
  - Role manipulation (PI-003)
  - Delimiter manipulation (PI-004)
  - Encoded payload indicators (PI-005)
  - Developer mode activation (PI-006)
  - Jailbreak patterns (PI-007)
  - Safety filter bypass (PI-008)
  - SQL injection patterns (PI-009)
  - Excessive repetition (PI-010)

**Rationale**: Establish baseline detection coverage for common prompt injection attack vectors.

---

## How to Update Rules

1. Edit `public/api/scanner/rules/rules.json`
2. Run `npm run bump-rules` to increment version and add changelog template
3. Edit this file to describe your changes
4. Commit both files
5. CI will validate that version was bumped and changelog was updated

**Never commit rule changes without:**
- Version bump in rules.json
- Corresponding changelog entry
- Validated regex patterns
