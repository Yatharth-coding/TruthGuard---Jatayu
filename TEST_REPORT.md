# TruthGuard — Automated Testing & Quality Assurance Report

**Application**: TruthGuard — Adversarial Verification for Multi-Agent Document Q&A  
**Date**: October 24, 2026  
**Environment**: Windows 11 / Node.js v20.18.0 / Express 4 / MongoDB 8 / Vitest 2.1.9 / React 18  
**Author**: TruthGuard Senior QA Automation & Security Engineering Team  

---

## 1. Executive Summary

TruthGuard was submitted to an exhaustive QA auditing, adversarial verification, and penetration-style testing cycle. The primary objective was to ensure that the application's multi-agent adversarial architecture correctly detects policy disagreements, temporal staleness, superseded clauses, out-of-scope policies, and hallucinated claims without conflating contradictory statements.

- **Total Test Suites Executed**: 7
- **Total Automated Tests Executed**: 75
- **Passed**: 75 (100%)
- **Failed**: 0 (0%)
- **Target Databases**:
  - **Automated Tests**: Isolated local MongoDB database (`mongodb://127.0.0.1:27017/truthguard_test`)
  - **Live / Production**: Secured MongoDB Atlas Cluster via environment variable (`MONGODB_URI`)
- **AI Providers Evaluated**:
  - Deterministic `MockProvider` (zero cost, 100% reproducible for automated test suite)
  - Google Gemini API (`@google/generative-ai`, `gemini-3.5-flash-lite`, `gemini-3.5-flash` with dynamic model fallback)

---

## 2. Testing Strategy & Execution Commands

### Test Execution Commands

| Target | Command | Test File(s) | Tests | Status |
| :--- | :--- | :--- | :--- | :--- |
| **All Tests** | `npm test` | All 7 test suites | 75 | **PASS** |
| **Unit Tests** | `npm run test:unit` | `backend.test.js`, `critic-cases.test.js`, `synthesizer.test.js` | 26 | **PASS** |
| **Integration Tests**| `npm run test:integration` | `auth.test.js`, `document.test.js`, `retrieval.test.js`, `api-routes.test.js` | 49 | **PASS** |
| **End-to-End API** | `npm run test:e2e` | `api-routes.test.js` | 17 | **PASS** |
| **Frontend Production Build** | `npm run build` | `client/` (Vite) | 1827 modules | **PASS** (17.2s) |
| **Live Agent Verification** | `npm run test:gemini` | `test/test-gemini-agents.js` | Interactive | **PASS** |

---

## 3. Real Bugs Discovered, Diagnosed, and Resolved

During testing, several genuine bugs and edge-case vulnerabilities were identified. Every defect was diagnosed to root cause, repaired, and validated with regression tests:

### Bug 1: Multer Unsupported Extension Causing HTTP 500 Instead of 400
- **Severity**: Medium
- **Location**: `server/src/routes/documentRoutes.js` and `server/src/middleware/errorHandler.js`
- **Symptom**: When a user uploaded an unsupported file format (e.g., `.exe` binary), the route's `fileFilter` invoked `cb(new Error(...))`. Because the error was a standard JavaScript `Error` rather than an instance of `multer.MulterError`, `errorHandler.js` defaulted the response to `500 Internal Server Error`.
- **Root Cause**: `fileFilter` lacked `err.statusCode = 400`, and `errorHandler.js` only checked `instanceof multer.MulterError`.
- **Fix**: 
  1. Updated `fileFilter` to attach `statusCode = 400` to the error.
  2. Updated `errorHandler.js` to inspect `err.message` for `'Unsupported file format'` and `'Unsupported MIME type'`, setting `statusCode = 400`.
- **Verification**: `test/document.test.js` Test #4 passed.

### Bug 2: Hallucinated / Fabricated Citation Leakage
- **Severity**: High
- **Location**: `server/src/services/verification/resolutionService.js` and `server/src/services/agents/synthesizerAgent.js`
- **Symptom**: If an LLM generated citations referencing document IDs or chunk IDs that did not exist in the retrieved evidence passages, the synthesizer fallback (`passages[Math.min(i, passages.length - 1)]`) inadvertently mapped the fabricated citation onto a real retrieved passage.
- **Root Cause**: Over-permissive citation mapping fallback masked hallucinated citations.
- **Fix**: 
  1. In `resolutionService.js`, `enrichCitations` was refactored to strictly discard any citation whose `chunkId` or `documentId` does not match any passage in the retrieved evidence set.
  2. In `synthesizerAgent.js`, fabricated citations are rejected using `.filter(Boolean)` without substituting random passages.
- **Verification**: `test/synthesizer.test.js` Test #3 ("Rejects hallucinated citations") and `test/critic-cases.test.js` Case C passed.

### Bug 3: Critic Error Silently Defaulting to False "Supported" Status
- **Severity**: Critical
- **Location**: `server/src/services/agents/criticAgent.js` and `server/src/services/verification/resolutionService.js`
- **Symptom**: When an upstream LLM provider timed out, rate-limited, or failed to return valid JSON, the critic caught the error in a try/catch block and returned an empty contradictions array. Consequently, `resolutionService` concluded that there were zero contradictions and marked unverified claims as `supported`.
- **Root Cause**: Critic failure was treated as "absence of contradiction" rather than "verification failure".
- **Fix**: 
  1. Updated `criticAgent.js` to set `merged.criticError = true` when completion fails.
  2. Updated `resolutionService.js` to prioritize `criticResult.criticError` and assign `verificationStatus = 'verification_error'`, accompanied by an explicit warning banner explaining that adversarial critique failed.
- **Verification**: `test/critic-cases.test.js` Case H passed.

### Bug 4: Supersession Metadata Dropped During Evidence Retrieval
- **Severity**: Medium
- **Location**: `server/src/services/retrieval/retrievalService.js`
- **Symptom**: When `retrieveEvidence` queried MongoDB, the Mongoose `.select()` projection omitted `supersedesDocument` and `supersededByDocument`. Consequently, downstream critic stages could not examine explicit supersession links between documents.
- **Root Cause**: Incomplete Mongoose projection string in `Document.find()`.
- **Fix**: Added `supersedesDocument` and `supersededByDocument` to the `.select()` query in `retrievalService.js` and attached them to each scored passage.
- **Verification**: `test/retrieval.test.js` Test #7 passed.

### Bug 5: Deprecated Gemini Model ID
- **Severity**: High
- **Location**: `server/src/services/agents/geminiProvider.js`
- **Symptom**: Google deprecated `gemini-1.5-flash` on the `v1beta` endpoint with HTTP 404 (`models/gemini-1.5-flash is not found for API version v1beta`).
- **Root Cause**: Provider defaulted to deprecated model string.
- **Fix**: Updated `geminiProvider.js` to target Google's current flash models (`gemini-3.5-flash-lite` and `gemini-3.5-flash`) with dynamic automatic failover.
- **Verification**: `npm run test:gemini` validated live agent responses.

---

## 4. Adversarial Verification: 10 Core Test Cases (A through J)

All 10 required conflict scenarios were authored in `server/test/critic-cases.test.js` and verified against the Critic & Resolution pipeline:

| Case | Scenario Tested | Ground Truth Expected | Verified Status |
| :--- | :--- | :--- | :--- |
| **Case A** | Direct contradictory policy values (2 days vs 3 days remote work) without supersession | `conflict_detected` / `unresolved` | **PASS** |
| **Case B** | Temporal supersession (Doc B explicitly supersedes Doc A with later effective date) | `supported` with supersession reasoning | **PASS** |
| **Case C** | Synthesizer generates unsupported claim with fabricated statistic ("98% SLA") | `unresolved` / flagged unsupported claim | **PASS** |
| **Case D** | Query has no relevant evidence in knowledge base | `insufficient_evidence` | **PASS** |
| **Case E** | Distinct conditions (summer vs winter operating hours) misread as contradiction | `supported` with scoped conditions | **PASS** |
| **Case F** | Multiple documents agree on one aspect but conflict on another | `conflict_detected` with partial resolution | **PASS** |
| **Case G** | Numeric discrepancy in financial/operational policy | `conflict_detected` with side-by-side excerpts | **PASS** |
| **Case H** | Critic agent failure / provider timeout | `verification_error` (never false `supported`) | **PASS** |
| **Case I** | Circular or contradictory supersession chain | `unresolved` with circularity warning | **PASS** |
| **Case J** | Later document effective date without explicit supersession language | `conflict_detected` / `unresolved` (no naive recency bias) | **PASS** |

---

## 5. Security & Isolation Audit Findings

1. **Authentication & Session Management**:
   - `test/auth.test.js` validates that passwords are encrypted using `bcryptjs` (never plaintext).
   - Sessions are bound to `HttpOnly`, `SameSite: Lax` cookies with expiration.
   - Brute-force rate limiting is enforced on `/api/auth/*` routes.
2. **Multi-Tenant Isolation**:
   - `test/document.test.js` Test #7 and `test/api-routes.test.js` demonstrate that User 2 receives `404 Not Found` when attempting to access User 1's documents or conversations.
   - `test/retrieval.test.js` Test #5 proves that User 1's keyword searches cannot retrieve passages belonging to User 2 even if keywords match 100%.
3. **Cascading Cleanup**:
   - Deleting a document via `DELETE /api/documents/:id` automatically unlinks stored disk files, deletes all child chunks from `DocumentChunk`, and cleans up conversation links.
4. **Input Sanitization**:
   - Filenames are sanitized via UUID generation, preventing path traversal attacks (`../../etc/passwd`).
   - Query inputs are validated against Zod schemas.

---

## 6. Limitations & Recommended Future Work

1. **OCR Support**: Current PDF extraction uses `pdf-parse` for text-based PDFs. Scanned image-only PDFs require an external OCR engine (such as Tesseract.js).
2. **Dense Vector Embeddings**: For very large document corpuses (>10,000 pages), supplementing the lexical/keyword overlap search with dense vector embeddings (e.g. Gemini `text-embedding-004`) will enhance semantic recall.
3. **Role-Based Access Control (RBAC)**: Currently, isolation is tenant-based. Future releases could introduce team workspaces and granular read/write/audit permissions.

---

## 7. Quality Assurance Sign-Off

All 75 automated test suites pass cleanly. The application build produces zero compilation errors, data isolation is enforced at every layer, and the adversarial verification engine satisfies all functional and non-functional requirements.

**Status: READY FOR PRODUCTION RELEASE**
