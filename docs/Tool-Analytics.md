# Tool Analytics Policy

## L5 Analytics Tool Definition

**L5 Analytics Tools** are comprehensive, production-grade observability platforms that provide:
- Real User Monitoring (RUM)
- Session replay capabilities
- Distributed tracing
- Error tracking and aggregation
- Performance monitoring
- Custom event tracking

Examples include:
- **Datadog RUM** (Current L5 tool)
- Sentry
- New Relic
- Dynatrace
- AppDynamics
- Elastic APM

## Single L5 Tool Policy

**Policy**: Each repository/service must use ONLY ONE L5 analytics tool.

### Rationale

1. **Cost Efficiency**: L5 tools are expensive. Multiple tools create redundant costs.
2. **Data Consistency**: Single source of truth for metrics and monitoring.
3. **Performance Impact**: Multiple RUM tools increase page load time and resource usage.
4. **Privacy Compliance**: Reduced data collection surface area.
5. **Maintenance Burden**: Single tool reduces configuration complexity.

### Current L5 Tool: Datadog RUM

**Repository**: `prompt-defenders`
**Tool**: Datadog RUM
**Configured In**: `src/pages/_app.tsx`

**Required Environment Variables**:
- `NEXT_PUBLIC_DD_APP_ID`
- `NEXT_PUBLIC_DD_CLIENT_TOKEN`
- `NEXT_PUBLIC_ENV`
- `NEXT_PUBLIC_COMMIT_SHA`

### Enforcement

The Go-Live-Gate checklist **MUST** verify:
1. Only Datadog RUM is initialized in application code
2. No other L5 tool imports or initialization code exists
3. Package.json does not include other L5 tool SDKs

### Non-L5 Tools (Allowed)

These tools are **NOT** considered L5 and can be used alongside Datadog RUM:
- Lightweight error loggers (e.g., console logging)
- Custom analytics (first-party tracking)
- A/B testing tools
- Feature flag services
- Business intelligence tools (Google Analytics for marketing only)

### Changing L5 Tools

To change the L5 tool:
1. Document business justification
2. Update this file with new tool information
3. Remove old L5 tool completely (code, dependencies, env vars)
4. Update Go-Live-Gate.md checklist
5. Require security and privacy review

### Serverless APM (Future)

**TODO**: Add Datadog Serverless APM documentation for:
- AWS Lambda instrumentation
- API Gateway tracing
- Cold start monitoring
- Link: https://docs.datadoghq.com/serverless/

This is not required for the current implementation but should be added when deploying serverless functions.

---

**Last Updated**: 2025-11-06
**Owner**: Engineering Team
