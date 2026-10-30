# FixMyCampus — Testing Strategy & Verification Guide

No module is marked complete until all applicable tests pass and actual execution results are verified and recorded.

---

## 1. Test Levels & Tooling

| Level | Tool | Responsibility |
|---|---|---|
| **Backend Unit & API Tests** | Jest + Supertest | Schema validation, password hashing, JWT generation, status state machine rules, API response envelopes |
| **Frontend Component Tests** | Vitest + React Testing Library | Form inputs, validation warnings, complaint list rendering, notification bell counters |
| **AI Unit Tests** | Pytest | FastAPI route validation, `all-MiniLM-L6-v2` embeddings, cosine similarity scoring, priority rules |
| **Security & Boundary Tests** | Jest + Supertest | IDOR checks (student viewing another student's ticket), role escalation attempts, unauthenticated route blocks |

---

## 2. Test Execution Log

### Day 1: Authentication & User Management (Executed: 2026-10-30)

**Test Suite 1: `tests/health.test.ts` (Module 1 Scaffold)**
- [x] `GET /api/health` returns 200 OK with healthy status payload (PASSED - 15ms)
- [x] `GET /api/non-existent-route` returns 404 with NOT_FOUND code (PASSED - 9ms)

**Test Suite 2: `tests/auth.test.ts` (Modules 2, 3, & 4)**
- [x] `POST /api/auth/register` creates student with bcrypt password hash & sets HTTP-only cookie (PASSED - 229ms)
- [x] `POST /api/auth/register` rejects invalid email with VALIDATION_ERROR (PASSED - 25ms)
- [x] `POST /api/auth/register` rejects short password with VALIDATION_ERROR (PASSED - 11ms)
- [x] `POST /api/auth/register` rejects duplicate email registration with 409 DUPLICATE_ENTRY (PASSED - 112ms)
- [x] `POST /api/auth/login` authenticates valid credentials and sets HTTP-only cookie (PASSED - 174ms)
- [x] `POST /api/auth/login` rejects wrong password with 401 INVALID_CREDENTIALS (PASSED - 166ms)
- [x] `POST /api/auth/login` rejects non-existent email with 401 INVALID_CREDENTIALS (PASSED - 102ms)
- [x] `GET /api/auth/me` returns current user profile for authenticated session (PASSED - 99ms)
- [x] `GET /api/auth/me` rejects unauthenticated request with 401 UNAUTHORIZED (PASSED - 13ms)
- [x] `POST /api/auth/logout` clears auth session cookie (PASSED - 92ms)
- [x] RBAC: blocks student from accessing admin-only endpoint with 403 FORBIDDEN (PASSED - 102ms)
- [x] RBAC: permits admin to access admin-only endpoint with 200 OK (PASSED - 19ms)

**Summary:** 2 Test Suites Passed, 14 Total Tests Passed, 0 Failed (Execution time: 5.46s).
