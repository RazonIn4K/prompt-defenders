# Pull Request

## Description

<!-- Provide a brief description of the changes in this PR -->

## Type of Change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Refactoring (no functional changes)
- [ ] Performance improvement
- [ ] Security update

## Related Issues

<!-- Link to related issues, e.g., Closes #123 -->

## Changes Made

<!-- List the main changes made in this PR -->

-
-
-

## Testing

<!-- Describe the tests you ran to verify your changes -->

- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Manual testing completed
- [ ] Type checking passing
- [ ] Linting passing

## Security Considerations

<!-- Any security implications of these changes? -->

- [ ] No secrets in code
- [ ] Input validation reviewed
- [ ] Security headers reviewed
- [ ] Dependencies updated and scanned

## Go-Live-Gate Compliance

**Before merging, verify against [Go-Live-Gate.md](../docs/Go-Live-Gate.md):**

### Security
- [ ] Security headers configured
- [ ] Rate limiting tested
- [ ] Input validation implemented
- [ ] No secrets in code
- [ ] SBOM/Grype passing

### Analytics (L5 Tool Policy)
- [ ] **Single L5 tool verified**: Only Datadog RUM is initialized
- [ ] No other L5 tools (Sentry, New Relic, etc.) present
- [ ] See [Tool-Analytics.md](../docs/Tool-Analytics.md)

### Privacy
- [ ] No PII stored
- [ ] Privacy disclosures updated
- [ ] Data handling documented

### Quality
- [ ] Tests passing
- [ ] Type checking passing
- [ ] Build successful
- [ ] CI workflows passing

## Screenshots (if applicable)

<!-- Add screenshots for UI changes -->

## Checklist

- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing tests pass locally
- [ ] Any dependent changes have been merged and published

## Deployment Notes

<!-- Any special deployment considerations? -->

- [ ] Environment variables updated (if needed)
- [ ] Database migrations (if needed)
- [ ] Rollback plan documented (if needed)

## Additional Notes

<!-- Any additional information for reviewers -->

---

**Reviewer**: Please ensure all Go-Live-Gate requirements are met before approval.
