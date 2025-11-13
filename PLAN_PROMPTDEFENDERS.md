# Async API Security & Documentation Alignment Plan

**Session Goal**: Align async deep-analysis API implementation with documented behavior, tighten security & docs, improve scanner response UX.

**Date**: 2025-11-13

---

## A. Docs vs Code

### AUTH Mismatches

**Finding**: SECURITY.md lines 55-60 say "TODO: For production deployment with auth" but `auth.ts` ALREADY implements API key authentication.

- **SECURITY.md:55-60**: States auth is a TODO
- **auth.ts**: Fully implements `authenticateRequest`, validates `X-API-Key` header, enforces in production, permissive in dev
- **README.md:126-138**: Correctly documents the authentication behavior
- **Go-Live-Gate.md:13**: Correctly mentions Phase 2 API key auth is completed

**Action Required**: Update SECURITY.md to reflect that authentication IS implemented.

---

### RATE LIMIT Mismatches

**Finding**: Rate limiting is correctly documented and implemented, BUT:

1. **Fail-open behavior not explicit**:
   - `ratelimit.ts:70-72` fails open on error: `return { success: true }`
   - Docs don't explicitly call this out as a security tradeoff
   - This is important for security-conscious users to know

2. **Missing rate limiting on `/api/scan/result`**:
   - `/api/scan` has rate limiting (scan.ts:33)
   - `/api/scan/deep` has rate limiting (deep.ts:41)
   - `/api/scan/result` does NOT have rate limiting ⚠️
   - This creates an inconsistency where polling could be abused

**Current Behavior**:
- 10 requests/minute per IP (Upstash) or 10 token bucket (dev)
- Sliding window algorithm in prod
- Returns 429 with `X-RateLimit-Remaining` header

**Action Required**:
- Add rate limiting to `/api/scan/result` for consistency
- Document fail-open behavior in SECURITY.md
- Add rate limit headers to `/api/scan/result`

---

### ASYNC API Documentation vs Implementation

**Finding**: Async endpoints EXIST and are mostly aligned, but have gaps:

**What's Good**:
- `/api/scan/deep` exists at `src/pages/api/scan/deep.ts`
- `/api/scan/result` exists at `src/pages/api/scan/result.ts`
- Both have auth enforcement matching `/api/scan`
- Response shapes mostly match README.md examples
- Status codes are appropriate (202 for pending, 200 for complete, 404 for not found)

**Gaps**:
1. **Missing Sentry breadcrumbs**:
   - `/api/scan/deep` doesn't add breadcrumbs for:
     - Job enqueued (handled in `queue.ts` but not in handler)
     - Queue service unavailable
   - `/api/scan/result` doesn't add breadcrumbs for:
     - Job status queried
     - Job not found
     - Job expired

2. **No rate limiting on `/api/scan/result`** (see above)

3. **Response shape enhancements**:
   - Could add more developer-friendly fields without breaking schema
   - e.g., add `attemptsRemaining` for pending jobs
   - e.g., add `nextPollAfter` suggestion for better client behavior

---

## B. Async Deep Analysis

### Current Implementation

**`enqueueDeepAnalysis` (queue.ts:88-141)**:
- Generates UUID job ID
- Stores job in Redis: `queue:job:{jobId}` with 24h TTL
- Adds job ID to pending queue list: `queue:pending`
- Returns job ID for polling
- Adds Sentry breadcrumb on enqueue

**`runWorker` & `processNextJob` (deepAnalysisWorker.ts)**:
- Polls `queue:pending` for next job
- Releases scheduled retry jobs from `queue:retry` (sorted set by timestamp)
- Updates job to "processing" status
- Calls `performDeepAnalysis` (stub)
- On success: updates to "completed" with result
- On failure: retries with exponential backoff (2s, 4s, 8s...) up to max attempts (default 3)
- On exhaustion: updates to "failed" with error
- Adds Sentry breadcrumbs throughout lifecycle

**`performDeepAnalysis` (queue.ts:383-417)**:
- **CURRENTLY A STUB** - simulates 2s delay
- Returns placeholder LLM result with:
  - `deepScore: 75`
  - `confidence: 0.85`
  - `reasoning: "Deep LLM analysis detected..."`
  - `recommendations: [...]`
  - `modelUsed: "placeholder-llm-v1"`
- Adds Sentry breadcrumbs for start/complete

**Job Fields Stored**:
```typescript
{
  id: string;               // UUID
  inputHash: string;        // HMAC-SHA256 (privacy-preserving)
  inputLength: number;      // Character count
  timestamp: string;        // ISO8601 enqueue time
  status: "pending" | "processing" | "completed" | "failed";
  attempts: number;         // Current attempt count
  maxAttempts: number;      // Max retry attempts (default 3)
  lastAttemptAt?: string;   // ISO8601 of last attempt
  lastError?: string;       // Last error message
  result?: any;             // Deep analysis result (when completed)
  error?: string;           // Final error message (when failed)
  metadata?: Record<string, any>;  // Additional context (e.g., fastScanScore)
}
```

**Privacy Compliance**:
- ✅ Only `inputHash` stored, never raw text
- ✅ Hash is HMAC-SHA256 with salt
- ✅ 24-hour TTL ensures automatic cleanup
- ✅ Documented in PRIVACY.md

---

### API Contract

**`/api/scan/deep` (POST)**:
- **Auth**: ✅ `X-API-Key` required in prod
- **Rate Limit**: ✅ 10 req/min
- **Request**: `{ inputHash: string, inputLength: number, metadata?: object }`
- **Response (202)**: `{ success: true, queueId, status: "pending", message, pollEndpoint }`
- **Response (503)**: Queue unavailable
- **Privacy**: ✅ Only accepts hash, not raw input

**`/api/scan/result` (GET)**:
- **Auth**: ✅ `X-API-Key` required in prod
- **Rate Limit**: ❌ **MISSING**
- **Query**: `?id={jobId}`
- **Response (202)**: Pending/processing with metadata
- **Response (200)**: Completed with result OR failed with error
- **Response (404)**: Job not found/expired
- **Observability**: ⚠️ Missing Sentry breadcrumbs

---

## C. Implementation Tasks (Ranked)

### Priority 1: Security & Consistency

**[api] Task 1.1: Add rate limiting to `/api/scan/result`**
- **Why**: Consistency with other endpoints; prevents polling abuse
- **How**:
  - Add `checkRateLimit` call in `/api/scan/result` handler
  - Extract identifier from headers (same pattern as other endpoints)
  - Add `X-RateLimit-Remaining` header to responses
  - Return 429 if exceeded
- **Files**: `src/pages/api/scan/result.ts`
- **Risk**: Low (additive change, follows existing pattern)

---

### Priority 2: Observability

**[observability] Task 2.1: Add Sentry breadcrumbs to API handlers**
- **Why**: Requested in session goals; improves debugging
- **Where**:
  - `/api/scan/deep`:
    - Add breadcrumb when job enqueued successfully
    - Add breadcrumb when queue unavailable (503 response)
  - `/api/scan/result`:
    - Add breadcrumb when job status queried
    - Add breadcrumb when job not found (404)
    - Add breadcrumb when job expired
- **Files**: `src/pages/api/scan/deep.ts`, `src/pages/api/scan/result.ts`
- **Risk**: Very low (additive, no behavior change)

**[observability] Task 2.2: Add exception capture to API handlers**
- **Why**: Currently only console.error, Sentry not used
- **Where**: Both handlers' catch blocks
- **How**: Import `captureException` from `monitoring.ts`
- **Files**: `src/pages/api/scan/deep.ts`, `src/pages/api/scan/result.ts`
- **Risk**: Very low

---

### Priority 3: Documentation Alignment

**[docs] Task 3.1: Update SECURITY.md to reflect implemented features**
- **Changes**:
  - Lines 55-60: Remove "TODO" for auth, document current implementation
  - Add section on rate limiter fail-open behavior (line 30)
  - Add note that `performDeepAnalysis` is currently a stub
- **Files**: `docs/SECURITY.md`
- **Risk**: None (docs only)

**[docs] Task 3.2: Update README.md async API section (if needed)**
- **Review**: Check if examples match actual response shapes
- **Add**: Note about rate limiting on `/api/scan/result`
- **Files**: `README.md`
- **Risk**: None (docs only)

**[docs] Task 3.3: Add fail-open documentation to PRIVACY.md**
- **Why**: Users should know rate limiter fails open when Redis unavailable
- **Where**: Security section (around line 103)
- **Files**: `docs/PRIVACY.md`
- **Risk**: None (docs only)

---

### Priority 4: Developer UX Improvements (Nice-to-Have)

**[api] Task 4.1: Add developer-friendly fields to `/api/scan/result` responses**
- **Without breaking schema**: Add optional fields
- **Pending/processing response**:
  - Add `attemptsRemaining: maxAttempts - attempts`
  - Add `nextPollAfter: number` (suggested delay in seconds)
- **Failed response**:
  - Add `attemptsExhausted: true` flag
- **Files**: `src/pages/api/scan/result.ts`
- **Risk**: Low (additive, backward compatible)

**[api] Task 4.2: Add structured error codes**
- **Why**: Better client error handling
- **Example**:
  - `error: "Job not found"` → `{ error: "Job not found", code: "JOB_NOT_FOUND" }`
  - `error: "Rate limit exceeded"` → `{ error: "...", code: "RATE_LIMIT_EXCEEDED" }`
- **Files**: All three API handlers
- **Risk**: Medium (changes response shape, but additive)

---

### Priority 5: Testing & Validation

**[test] Task 5.1: Add tests for rate limiting on `/api/scan/result`**
- **After**: Task 1.1 is complete
- **Files**: New test file or extend existing
- **Risk**: None (tests only)

**[test] Task 5.2: Run existing test suite**
- **Command**: `npm run test`
- **Validate**: No regressions from changes
- **Files**: `tests/auth.test.ts`, `tests/queue.test.ts`, `tests/deepAnalysisWorker.test.ts`
- **Risk**: None (validation only)

---

## Implementation Order (Recommended)

1. **Task 1.1** - Add rate limiting to `/api/scan/result` (security)
2. **Task 2.1** - Add Sentry breadcrumbs to handlers (observability)
3. **Task 2.2** - Add exception capture to handlers (observability)
4. **Task 3.1** - Update SECURITY.md (docs)
5. **Task 3.2** - Update README.md (docs)
6. **Task 3.3** - Update PRIVACY.md (docs)
7. **Task 5.2** - Run test suite to validate (validation)
8. **Task 4.1** - Add developer-friendly response fields (UX, if time permits)

---

## Guardrails

✅ **Do NOT log or persist raw user prompts** - only hashes
✅ **Do NOT break existing `/api/scan` request/response shape**
✅ **Maintain TypeScript strictness** - no `any` without good reason
✅ **Run tests + lint before finishing**
✅ **Follow existing patterns** - consistency with current code style

---

## Summary

**Current State**:
- ✅ Async API endpoints exist and are functional
- ✅ Authentication is implemented and documented correctly (mostly)
- ✅ Queue system with retry/backoff is working
- ✅ Privacy compliance is solid (hash-only storage)
- ⚠️ Missing rate limiting on `/api/scan/result`
- ⚠️ Missing Sentry breadcrumbs in API handlers
- ⚠️ SECURITY.md has outdated TODO about auth

**Post-Implementation State**:
- ✅ Consistent rate limiting across all API endpoints
- ✅ Full observability with Sentry breadcrumbs
- ✅ Accurate documentation matching implementation
- ✅ Better developer UX with helpful response fields

---

## TODOs for Future Sessions

- [ ] Integrate actual LLM API for `performDeepAnalysis` (replace stub)
- [ ] Add structured error codes across all endpoints
- [ ] Create comprehensive integration tests for async flow
- [ ] Add API usage dashboard/metrics
- [ ] Implement job result caching for completed jobs
- [ ] Add webhook support for job completion notifications
- [ ] Consider adding CAPTCHA for public endpoints (mentioned in SECURITY.md roadmap)
- [ ] Explore job priority queue for paid vs free tiers
- [ ] Add GraphQL endpoint as alternative to REST
- [ ] Implement job cancellation endpoint (`DELETE /api/scan/result?id=...`)

---

## Files Changed (Implementation Complete ✅)

### Modified:
- [x] `src/pages/api/scan/result.ts` - Added rate limiting & Sentry observability
  - Added `checkRateLimit` with IP/forwarded-IP identifier
  - Added `X-RateLimit-Remaining` header
  - Added Sentry breadcrumbs for job queries, not found, unknown status
  - Added `captureException` for error handling

- [x] `src/pages/api/scan/deep.ts` - Added Sentry observability
  - Added breadcrumbs for successful enqueue and queue unavailable
  - Added `captureException` for error handling

- [x] `src/pages/api/scan.ts` - Added Sentry exception capture
  - Added `captureException` for consistency across all API handlers

- [x] `docs/SECURITY.md` - Updated to reflect current implementation
  - Removed "TODO" for authentication (now implemented)
  - Added explicit fail-open behavior documentation
  - Updated Known Limitations section
  - Updated Roadmap with completed items
  - Bumped version to 1.1.0

- [x] `README.md` - Clarified rate limiting behavior
  - Added fail-open note to main `/api/scan` endpoint
  - Added rate limit documentation to `/api/scan/deep` and `/api/scan/result`
  - Added note about deep analysis stub

- [x] `docs/PRIVACY.md` - Added fail-open behavior note
  - Added rate limiting fail-open behavior to Security section
  - Bumped version to 1.1.0

### Created:
- [x] `PLAN_PROMPTDEFENDERS.md` - This document

---

## Validation Results ✅

**Tests**: All 14 tests passed
- ✅ `tests/auth.test.ts` (7 tests)
- ✅ `tests/queue.test.ts` (3 tests)
- ✅ `tests/deepAnalysisWorker.test.ts` (4 tests)

**TypeScript**: No type errors (tsc --noEmit passed)

**Linting**: Not yet configured in project

---

## Implementation Summary

Successfully aligned the async deep-analysis API implementation with documented behavior and tightened security documentation. All changes are backward compatible and improve observability without breaking existing functionality.

**Key Improvements**:
1. ✅ **Security**: Added rate limiting to `/api/scan/result` endpoint for consistency
2. ✅ **Observability**: Added comprehensive Sentry breadcrumbs and exception capture across all API handlers
3. ✅ **Documentation**: Updated docs to accurately reflect implemented features and fail-open behavior
4. ✅ **Validation**: All tests passing, TypeScript strict mode passing

**No Breaking Changes**: All modifications are additive or documentation-only. Existing API contracts preserved.
