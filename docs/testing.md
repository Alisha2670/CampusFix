# FixMyCampus — Testing Strategy & Verification Guide

No module is marked complete until all applicable tests pass and actual execution results are verified and recorded.

---

## 1. Test Levels & Tooling

| Level | Tool | Responsibility |
|---|---|---|
| **Backend Unit & API Tests** | Jest + Supertest | Schema validation, password hashing, JWT generation, status state machine rules, API response envelopes |
| **Frontend Build & Types** | Vite + TypeScript compiler | JSX components, Tailwind styles, Axios client, context state, type conformity |
| **AI Unit Tests** | Pytest | FastAPI route validation, `all-MiniLM-L6-v2` embeddings, cosine similarity scoring, priority rules |
| **Security & Boundary Tests** | Jest + Supertest | IDOR checks (student viewing another student's ticket), role escalation attempts, unauthenticated route blocks |

---

## 2. Test Execution Log

### Day 1: Authentication & User Management (Executed: 2026-10-30)

**Test Suite 1: `tests/health.test.ts` (Module 1 Scaffold)**
- [x] `GET /api/health` returns 200 OK with healthy status payload (PASSED - 13ms)
- [x] `GET /api/non-existent-route` returns 404 with NOT_FOUND code (PASSED - 11ms)

**Test Suite 2: `tests/auth.test.ts` (Modules 2, 3, & 4)**
- [x] `POST /api/auth/register` creates student with bcrypt password hash & sets HTTP-only cookie (PASSED - 163ms)
- [x] `POST /api/auth/register` rejects invalid email with VALIDATION_ERROR (PASSED - 23ms)
- [x] `POST /api/auth/register` rejects short password with VALIDATION_ERROR (PASSED - 14ms)
- [x] `POST /api/auth/register` rejects duplicate email registration with 409 DUPLICATE_ENTRY (PASSED - 103ms)
- [x] `POST /api/auth/login` authenticates valid credentials and sets HTTP-only cookie (PASSED - 173ms)
- [x] `POST /api/auth/login` rejects wrong password with 401 INVALID_CREDENTIALS (PASSED - 178ms)
- [x] `POST /api/auth/login` rejects non-existent email with 401 INVALID_CREDENTIALS (PASSED - 104ms)
- [x] `GET /api/auth/me` returns current user profile for authenticated session (PASSED - 108ms)
- [x] `GET /api/auth/me` rejects unauthenticated request with 401 UNAUTHORIZED (PASSED - 14ms)
- [x] `POST /api/auth/logout` clears auth session cookie (PASSED - 104ms)
- [x] RBAC: blocks student from accessing admin-only endpoint with 403 FORBIDDEN (PASSED - 105ms)
- [x] RBAC: permits admin to access admin-only endpoint with 200 OK (PASSED - 20ms)

### Day 2: Complaint Submission Pipeline & Cloud Storage (Executed: 2026-10-30)

**Test Suite 3: `tests/complaint.test.ts` (Phases 2.1, 2.2, 2.3, 2.5)**
- [x] `POST /api/complaints` creates complaint, assigns ID `FC-XXXX`, sets status `Submitted` and AI status `Pending` (PASSED - 154ms)
- [x] `POST /api/complaints` rejects complaint if category is not in allowed enum (PASSED - 26ms)
- [x] `POST /api/complaints` rejects complaint if description is under 10 chars (PASSED - 15ms)
- [x] `POST /api/complaints` blocks non-students with 403 FORBIDDEN (PASSED - 17ms)
- [x] `POST /api/complaints` uploads attached image buffer to Cloudinary CDN and stores `imageUrl` (PASSED - 1473ms)
- [x] `GET /api/complaints/my` returns only the requesting student's own complaints (PASSED - 62ms)
- [x] `GET /api/complaints/:id` allows owner to view complaint details (PASSED - 37ms)
- [x] `GET /api/complaints/:id` blocks other students from accessing private complaints (IDOR Defense: 403 FORBIDDEN) (PASSED - 32ms)
- [x] `GET /api/complaints/:id` permits administrators to access any complaint (PASSED - 33ms)

**Frontend Verification: `npm run build`**
- [x] Vite React TypeScript build: 1,668 modules transformed, zero type errors, production bundle generated in 4.75s (PASSED)

### Day 3: Ticket Tracking & Admin Dashboards (Executed: 2026-10-31)

**Test Suite 4: `tests/admin.test.ts` (Phases 3.1, 3.4)**
- [x] `GET /api/admin/complaints` allows admin to retrieve all complaints with pagination (PASSED - 106ms)
- [x] `GET /api/admin/complaints` filters complaints by status (e.g., `In Progress`) (PASSED - 36ms)
- [x] `GET /api/admin/complaints` filters complaints by category (e.g., `Electrical`) (PASSED - 25ms)
- [x] `GET /api/admin/complaints` searches complaints by keyword in title or complaint ID (PASSED - 26ms)
- [x] `GET /api/admin/complaints` blocks a regular student from accessing admin complaints (403 FORBIDDEN) (PASSED - 18ms)
- [x] `GET /api/admin/complaints` blocks unauthenticated access (401 UNAUTHORIZED) (PASSED - 9ms)

**Frontend Verification: `npm run build`**
- [x] Vite React TypeScript build: 1,672 modules transformed, zero type errors, production bundle generated in 4.26s (PASSED)

### Day 4: Admin Triage, State Transitions & In-App Notifications (Executed: 2026-10-31)

**Updated Suite 4: `tests/admin.test.ts` (Phases 4.1, 4.4)**
- [x] `PATCH /api/admin/complaints/:id/status` transitions status from Submitted to Acknowledged and appends to `statusHistory` (PASSED - 30ms)
- [x] `PATCH /api/admin/complaints/:id/status` rejects illegal state machine jump (e.g. Submitted -> Resolved) with 400 INVALID_STATUS_TRANSITION (PASSED - 19ms)
- [x] `PATCH /api/admin/complaints/:id/status` prevents transitioning out of terminal state Resolved (PASSED - 10ms)
- [x] `PATCH /api/admin/complaints/:id/status` blocks regular student from changing status (403 FORBIDDEN) (PASSED - 8ms)
- [x] `PATCH /api/admin/complaints/:id` assigns department and adjusts priority (PASSED - 24ms)
- [x] `PATCH /api/admin/complaints/:id` blocks student from updating triage metadata (403 FORBIDDEN) (PASSED - 8ms)

**Test Suite 5: `tests/notification.test.ts` (Phases 4.2, 4.4)**
- [x] Auto-creates notification for student when admin updates complaint status (PASSED - 88ms)
- [x] Auto-creates notification for student when admin assigns a department (PASSED - 57ms)
- [x] `PATCH /api/notifications/:id/read` marks a single notification as read (PASSED - 49ms)
- [x] `PATCH /api/notifications/:id/read` blocks another student from reading notifications (IDOR Defense: 404 NOT_FOUND) (PASSED - 27ms)
- [x] `PATCH /api/notifications/read-all` marks all unread notifications as read in bulk (PASSED - 52ms)
- [x] Blocks unauthenticated access to notification endpoints (401 UNAUTHORIZED) (PASSED - 12ms)

**Frontend Verification: `npm run build`**
- [x] Vite React TypeScript build: 1,674 modules transformed, zero type errors, production bundle generated in 4.09s (PASSED)

### Day 5: AI Microservice, Embeddings & Duplicate Detection (Executed: 2026-10-31)

**Test Suite 6 (Python Pytest): `ai_service/tests/` (Phases 5.1, 5.2, 5.3)**
- [x] `test_health_check_endpoint`: `GET /health` returns status "healthy" and model_loaded true (PASSED - 0.05s)
- [x] `test_semantic_duplicate_detection`: 384-dimensional cosine similarity identifies semantically similar issues (similarity >= 0.70) (PASSED - 3.12s)
- [x] `test_category_and_priority_classifier`: NLP classifier correctly predicts "Electrical" and "Urgent" for spark hazard text (PASSED - 0.02s)
- [x] `test_analyze_api_endpoint`: `POST /analyze` full pipeline returns suggested category, priority, confidence score, and duplicate candidate list (PASSED - 2.85s)

**Test Suite 7 (Node.js Jest): `tests/ai.test.ts` (Phase 5.4)**
- [x] Resiliency & Graceful Degradation: when AI microservice is offline or times out (3000ms budget), ticket remains safely in DB and `aiAnalysis.status` degrades to "Failed" without throwing (PASSED - 216ms)
- [x] Valid Payload Integration: records completed AI analysis with suggested category, priority, and duplicates in MongoDB when microservice returns 200 OK (PASSED - 52ms)

**Full Backend Regression (All 6 Suites): `npm test`**
- [x] `tests/health.test.ts` (2 tests PASSED)
- [x] `tests/auth.test.ts` (12 tests PASSED)
- [x] `tests/complaint.test.ts` (9 tests PASSED)
- [x] `tests/admin.test.ts` (12 tests PASSED)
- [x] `tests/notification.test.ts` (6 tests PASSED)
- [x] `tests/ai.test.ts` (2 tests PASSED)
- [x] Total: 43/43 tests passing across 6 suites in 22.00s.

**Frontend Verification: `npm run build`**
- [x] Vite React TypeScript build: 1,674 modules transformed, zero type errors, production bundle generated in 4.81s (PASSED)

### Day 6: Analytics, Charts & Department Metrics (Executed: 2026-11-01)

**Test Suite 8 (Node.js Jest): `tests/analytics.test.ts` (Phases 6.1, 6.3)**
- [x] Empty DB Resiliency: `GET /api/admin/analytics` returns zero counts, empty department workload, and zero percentages gracefully without division-by-zero crashes (PASSED - 114ms)
- [x] Calculation & Aggregation Accuracy: accurately aggregates KPI summary metrics (total, open, resolved, resolution rate, urgent active), category breakdown, priority distribution, department workload, and daily trends (PASSED - 128ms)
- [x] RBAC Defense: blocks regular students from accessing analytics with 403 FORBIDDEN (PASSED - 21ms)
- [x] Auth Boundary: blocks unauthenticated requests with 401 UNAUTHORIZED (PASSED - 22ms)

**Full Backend Regression (All 7 Suites): `npm test`**
- [x] `tests/health.test.ts` (2 tests PASSED)
- [x] `tests/auth.test.ts` (12 tests PASSED)
- [x] `tests/complaint.test.ts` (9 tests PASSED)
- [x] `tests/admin.test.ts` (12 tests PASSED)
- [x] `tests/notification.test.ts` (6 tests PASSED)
- [x] `tests/ai.test.ts` (2 tests PASSED)
- [x] `tests/analytics.test.ts` (4 tests PASSED)
- [x] Total: 47/47 tests passing across 7 suites in 20.57s.

**Python AI Regression: `pytest tests -v`**
- [x] 4/4 Pytest tests passing in `ai_service` in 14.02s.

**Frontend Verification: `npm run build`**
- [x] Vite React TypeScript build: 1,676 modules transformed, zero type errors, production bundle generated in 8.39s (PASSED)

### Day 7: Full System Verification, Security Audit & Deployment (Executed: 2026-11-02)

**Test Suite 9 (Node.js Jest): `tests/e2e.test.ts` (Phase 7.1)**
- [x] Step 1: Student 1 onboarding, registration & profile verification (PASSED - 148ms)
- [x] Step 2: Student 1 complaint submission (Save Before AI) with status "Submitted" (PASSED - 228ms)
- [x] Step 3: Student 2 duplicate incident submission with AI semantic match 79.2% (PASSED - 310ms)
- [x] Step 4: Administrator authentication and multi-filter triage feed retrieval (PASSED - 152ms)
- [x] Step 5: Admin Finite State Machine progression (Submitted -> Acknowledged -> Assigned -> In Progress -> Resolved) and illegal skip rejection 400 (PASSED - 218ms)
- [x] Step 6: Admin marks duplicate ticket as terminal "Duplicate" status (PASSED - 36ms)
- [x] Step 7: Student 1 real-time notification delivery, single read, and bulk mark-read (PASSED - 84ms)
- [x] Step 8: Admin analytics dynamic recalculation reflecting resolution rate and department capacity (PASSED - 52ms)

**Test Suite 10 (Node.js Jest): `tests/security.test.ts` (Phase 7.2)**
- [x] Privilege Escalation Defense: attempts to submit `role: "admin"` during registration are stripped and forced to `student` (PASSED - 125ms)
- [x] JWT Tampering Defense: requests with forged JWT signatures return 401 INVALID_TOKEN (PASSED - 12ms)
- [x] Token Expiration Defense: expired JWT tokens return 401 INVALID_TOKEN (PASSED - 12ms)
- [x] Unauthenticated Route Defense: unauthenticated calls return 401 UNAUTHORIZED (PASSED - 7ms)
- [x] IDOR Complaint Defense: Student 2 cannot access Student 1 complaint details (403 FORBIDDEN) (PASSED - 29ms)
- [x] IDOR Notification Defense: Student 2 cannot mark Student 1 notification as read (404 NOT_FOUND) (PASSED - 19ms)
- [x] RBAC Admin Triage Defense: regular students blocked from admin complaints with 403 FORBIDDEN (PASSED - 11ms)
- [x] RBAC Admin Analytics Defense: regular students blocked from admin analytics with 403 FORBIDDEN (PASSED - 11ms)

**Full Backend Regression (All 9 Suites): `npm test`**
- [x] `tests/health.test.ts` (2 tests PASSED)
- [x] `tests/auth.test.ts` (12 tests PASSED)
- [x] `tests/complaint.test.ts` (9 tests PASSED)
- [x] `tests/admin.test.ts` (12 tests PASSED)
- [x] `tests/notification.test.ts` (6 tests PASSED)
- [x] `tests/ai.test.ts` (2 tests PASSED)
- [x] `tests/analytics.test.ts` (4 tests PASSED)
- [x] `tests/e2e.test.ts` (8 tests PASSED)
- [x] `tests/security.test.ts` (8 tests PASSED)
- [x] Total: 63/63 tests passing across 9 suites in 29.92s.

**Python AI Regression: `pytest tests -v`**
- [x] 4/4 Pytest tests passing in `ai_service` in 14.02s.

**Frontend Verification: `npm run build`**
- [x] Vite React TypeScript build: 1,676 modules transformed, zero type errors, production bundle generated cleanly (PASSED)

**Final Cumulative Summary:** 9 Backend Test Suites (63 Tests) + 1 Python Pytest Suite (4 Tests) = 67 Total Tests Passed, 0 Failed. 100% Green Verification.

---

### Feature Extension: Student Upvoting & Campus Community Feed ("Me Too / +1") (Executed: 2026-11-03)

**Test Suite 11 (Node.js Jest): `tests/upvote.test.ts` (Phases 8.1, 8.2)**
- [x] Upvote toggle: allows a student to upvote a complaint and increment `upvoteCount` atomically (PASSED - 95ms)
- [x] Upvote untoggle: allows toggling off an upvote when clicked again (PASSED - 75ms)
- [x] Multi-student upvoting: supports multiple distinct students upvoting the same complaint (PASSED - 43ms)
- [x] 404 handling: returns 404 when upvoting a non-existent complaint (PASSED - 14ms)
- [x] RBAC enforcement: blocks non-students (e.g. Admin) from upvoting with 403 FORBIDDEN (PASSED - 19ms)
- [x] Auth enforcement: rejects unauthenticated upvote requests with 401 UNAUTHORIZED (PASSED - 11ms)
- [x] Feed retrieval: returns active complaints sorted by `mostUpvoted` by default (PASSED - 55ms)
- [x] Personalized state: indicates whether the requesting student has upvoted each complaint (`hasUpvoted: true/false`) (PASSED - 40ms)
- [x] Reporter privacy: protects student privacy in public feed by omitting email and phone numbers (PASSED - 40ms)
- [x] Multi-filtering: filters feed by building and category accurately (PASSED - 40ms)
- [x] Sort selector: allows sorting by newest (`createdAt: -1`) (PASSED - 39ms)
- [x] Feed security: rejects unauthenticated requests to feed with 401 UNAUTHORIZED (PASSED - 29ms)

**Full Backend Regression (All 10 Suites): `npm test`**
- [x] Total: **75/75 tests passing across 10 test suites in 22.76s (100% GREEN)**.

**Frontend Verification: `npm run build`**
- [x] Vite React TypeScript build: 1,677 modules transformed, zero type errors, production bundle generated cleanly in 6.64s (PASSED)

**Final Cumulative Platform Matrix:** 10 Backend Test Suites (75 Tests) + 1 Python Pytest Suite (4 Tests) = **79 Total Tests Passed, 0 Failed. 100% Green Verification.**

---

### Feature Extension: Real-Time WebSockets & Google OAuth 2.0 (Executed: 2026-11-03)

**Test Suite 12 (Node.js Jest): `tests/socket.test.ts` (Phase 9)**
- [x] Socket handshake authentication: connects client via valid JWT auth token (PASSED - 40ms)
- [x] Live upvote broadcast: broadcasts `complaint:upvoted` event to `feed` room (PASSED - 5ms)
- [x] Targeted push alerts: delivers `notification:new` exclusively to `user:<userId>` room (PASSED - 118ms)
- [x] Status broadcast: broadcasts `complaint:status_updated` event to feed listeners (PASSED - 3ms)

**Test Suite 13 (Node.js Jest): `tests/oauth.test.ts` (Phase 10)**
- [x] First-time Google user: auto-provisions student account with secure random password and sets session cookie (PASSED - 183ms)
- [x] Existing user account linking: links `googleId` to existing student email without creating duplicates (PASSED - 62ms)
- [x] Validation: rejects requests without credential payload with 400 Bad Request (PASSED - 13ms)
- [x] Cryptographic defense: rejects forged or invalid Google tokens with 401 Unauthorized (PASSED - 660ms)

**Full Backend Regression (All 12 Suites): `npm test`**
- [x] Total: **83/83 tests passing across 12 test suites in 34.08s (100% GREEN)**.

**Frontend Verification: `npm run build`**
- [x] Vite React TypeScript build: 1,708 modules transformed, zero type errors, production bundle generated cleanly in 5.27s (PASSED)

**Final Cumulative Platform Matrix:** 12 Backend Test Suites (83 Tests) + 1 Python Pytest Suite (4 Tests) = **87 Total Tests Passed, 0 Failed. 100% Green Verification.**

---

### Feature Extension: Password Recovery Architecture (Executed: 2026-11-03)

**Test Suite 14 (Node.js Jest): `tests/password-reset.test.ts` (Phase 11)**
- [x] Cryptographic Hash Storage: generates raw 32-byte token and stores one-way SHA-256 hash with 15-minute expiration in DB (PASSED - 231ms)
- [x] Password Reset & Credential Update: validates token, hashes new password with bcrypt, clears token fields, and enables login with new credentials (PASSED - 350ms)
- [x] Token Expiration Defense: rejects expired reset tokens (>15 mins) with 400 Bad Request (`INVALID_OR_EXPIRED_TOKEN`) (PASSED - 22ms)
- [x] Tamper / Invalid Token Defense: rejects arbitrary or forged tokens with 400 Bad Request (PASSED - 15ms)
- [x] Replay Attack Prevention: rejects token reuse after successful reset (PASSED - 193ms)
- [x] Account Enumeration Protection: returns 200 with standard generic confirmation for non-existent emails without leaking account existence (PASSED - 16ms)

**Full Backend Regression (All 13 Suites): `npm test`**
- [x] Total: **89/89 tests passing across 13 test suites in 37.68s (100% GREEN)**.

**Frontend Verification: `npm run build`**
- [x] Vite React TypeScript build: 1,710 modules transformed, zero type errors, production bundle generated cleanly in 5.49s (PASSED)

**Final Cumulative Platform Matrix:** 13 Backend Test Suites (89 Tests) + 1 Python Pytest Suite (4 Tests) = **93 Total Tests Passed, 0 Failed. 100% Green Verification.**
