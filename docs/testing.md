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

**Cumulative Summary:** 5 Test Suites Passed, 41 Total Automated Tests Passed, 0 Failed.
