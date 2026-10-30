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

*(Updated as tests are executed during development)*

### Day 1: Authentication & User Management
- [ ] User registration with valid inputs
- [ ] Duplicate email registration rejection (409 Conflict)
- [ ] Role escalation attempt rejection (public register cannot become admin)
- [ ] User login with valid credentials (returns JWT cookie)
- [ ] User login with invalid password (401 Unauthorized)
- [ ] Auth middleware verification (`requireAuth` and `requireRole`)
- [ ] Get current user profile (`/api/auth/me`)
