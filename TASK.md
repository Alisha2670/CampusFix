# FixMyCampus — Master Task & Workflow Roadmap (7-Day Plan)

This document tracks the complete end-to-end development workflow for FixMyCampus across all 7 days.
Every stage requires passing tests, verification, and explicit user permission before proceeding.
**Git pushes are performed strictly at the end of each completed day with user approval.**

---

## 📅 Day-by-Day Workflow Overview

```
Day 1: Project Setup, Mongo Connection, Authentication & Authorization (COMPLETE - PUSHED)
  │
  ▼
Day 2: Complaint Submission Pipeline (Node API, Cloudinary Media, React Form) (COMPLETE - AWAITING PUSH)
  │
  ▼
Day 3: Student Ticket Tracking & Admin Retrieval Dashboards
  │
  ▼
Day 4: Admin Triage, Complaint State Machine & In-App Notifications
  │
  ▼
Day 5: Python FastAPI AI Microservice (Embeddings, Duplicates, Categorization)
  │
  ▼
Day 6: Analytics Aggregations, Department Metrics & Data Visualizations
  │
  ▼
Day 7: Full System Integration, Security Audit, E2E Verification & Git Finalization
```

---

## 📋 Day 1 — Foundation, Database Connection & Authentication

- [x] **Phase 1.1: System Architecture & Master Contract** (PASSED)
- [x] **Phase 1.2: Backend Scaffold & Environment Setup** (PASSED)
- [x] **Phase 1.3: User Model & Security Engine** (PASSED)
- [x] **Phase 1.4: Authentication & Authorization Middleware** (PASSED)
- [x] **Phase 1.5: Auth Controllers & Routes** (PASSED)
- [x] **Phase 1.6: Automated Testing & Verification** (14/14 PASSED)
- [x] **Day 1 Final Checkpoint: End-of-Day Review & Git Push** (Commit `566221e` on `main`)

---

## 📋 Day 2 — Complaint Submission Pipeline & Cloud Storage

- [x] **Phase 2.1: Complaint Data Modeling**
  - Create Mongoose `Complaint` model (`src/models/Complaint.ts`)
  - Implement embedded `location` object and `aiAnalysis` schema with default `Pending`
  - Implement complaint ID generator (e.g., `FC-1024`)

- [x] **Phase 2.2: Cloudinary Media Storage**
  - Setup Cloudinary configuration and upload helper (`src/config/cloudinary.ts`, `src/services/cloudinary.service.ts`)
  - Multer middleware for memory buffering & file type validation (JPEG, PNG, WebP $\le 5\text{MB}$)

- [x] **Phase 2.3: Complaint Creation API**
  - Implement `POST /api/complaints` (saves complaint before calling AI)
  - Implement request validator for title, description, category, and room location
  - Return 201 Created with complaint reference ID immediately

- [x] **Phase 2.4: Frontend Initialization & Complaint Form**
  - Initialize `frontend/` with React, TypeScript, Vite, and Tailwind CSS
  - Build central Axios API client with `withCredentials: true`
  - Build Student Complaint Submission Form with image upload preview and validation

- [x] **Phase 2.5: Automated Testing & Verification**
  - Test complaint persistence in MongoDB (9/9 complaint tests passing, 23/23 total)
  - Test validation errors on missing location or invalid category
  - Test file upload size/type constraints
  - Frontend production build verified (`tsc && vite build` clean in 4.75s)

- [x] **Day 2 Final Checkpoint: End-of-Day Review & Git Push (Requires Permission)**

---

## 📋 Day 3 — Ticket Tracking & Admin Dashboards

- [x] **Phase 3.1: Complaint Retrieval APIs**
  - Implement `GET /api/complaints/my` (Student: own complaints only with pagination)
  - Implement `GET /api/complaints/:id` (IDOR check: only owner or admin can view)
  - Implement `GET /api/admin/complaints` (Admin: filter by status, category, priority, building, search, pagination)

- [x] **Phase 3.2: Frontend Student Dashboard**
  - "My Complaints" list view with status badges and timestamps
  - Single Complaint Detail view with progress tracker (`StatusTimeline.tsx`)
  - Image modal preview, search filter, and status filter tabs

- [x] **Phase 3.3: Frontend Admin Dashboard**
  - Complaints triage table with multi-filter controls (Status, Priority, Category)
  - Search bar by Complaint ID, title, or Student Name
  - Summary metric cards (Total, In Triage, In Progress, Resolved)
  - Direct detail modal inspector with status history timeline
  - Role-protected route (`AdminRoute`) in `App.tsx`

- [x] **Phase 3.4: Automated Testing & Verification**
  - Verify IDOR protection (student A cannot view student B's ticket: 403 Forbidden)
  - Verify admin pagination, search, and category/status filtering accuracy
  - 29/29 Jest tests passing across 4 test suites (backend)
  - Frontend production build passing with 0 errors (`npm run build`)

- [x] **Day 3 Final Checkpoint: End-of-Day Review & Git Push (Requires Permission)**

---

## 📋 Day 4 — Admin Triage, State Transitions & In-App Notifications

- [x] **Phase 4.1: State Machine & Transition Rules**
  - Implement Complaint Lifecycle State Machine engine (`src/services/statemachine.service.ts`)
  - Implement `PATCH /api/admin/complaints/:id/status` (reject illegal jumps with 400 `INVALID_STATUS_TRANSITION`)
  - Implement `PATCH /api/admin/complaints/:id` (department assignment, priority, category)
  - Append audit details to embedded `statusHistory`

- [x] **Phase 4.2: In-App Notification System**
  - Implement Mongoose `Notification` model (`src/models/Notification.ts`) with index `{ userId: 1, isRead: 1, createdAt: -1 }`
  - Auto-dispatch notifications on status changes and department assignments
  - Implement notification endpoints (`GET /api/notifications`, `PATCH /api/notifications/:id/read`, `PATCH /api/notifications/read-all`)

- [x] **Phase 4.3: Frontend Triage Actions & In-App Notification Bell**
  - Build `NotificationBell.tsx` component mounted in `Navbar.tsx` with live unread badge and dropdown
  - Implement notification API client (`frontend/src/api/notification.api.ts`)
  - Build interactive admin workflow action cards inside `AdminDashboardPage.tsx` modal (state machine dropdown, audit note, department selector)

- [x] **Phase 4.4: Automated Testing & Verification**
  - 41/41 automated tests passing across 5 test suites (`tests/notification.test.ts`, `tests/admin.test.ts`, etc.)
  - Frontend production build passing with 0 errors (`npm run build`)

- [x] **Day 4 Final Checkpoint: End-of-Day Review & Git Push (Requires Permission)**

---

## 📋 Day 5 — AI Microservice (FastAPI + Embeddings + Duplicates)

- [x] **Phase 5.1: FastAPI Setup & Health Check**
  - Scaffold `ai_service/` with Python 3.12, FastAPI, Uvicorn, SentenceTransformers, and Pytest
  - Implement singleton `EmbeddingService` for `all-MiniLM-L6-v2` with lifespan pre-loading
  - Implement `GET /health` endpoint verifying AI microservice status and model readiness

- [x] **Phase 5.2: NLP & Semantic Duplicate Detection**
  - Implement 384-dimensional cosine similarity calculation in `DuplicateService`
  - Set threshold 0.70 (70%) for semantic duplicate matching against existing complaints
  - Return similarity percentage and matched ticket metadata

- [x] **Phase 5.3: Automated Categorization & Priority Engine**
  - Implement intent and keyword matching in `ClassifierService` across 5 categories
  - Implement safety hazard & impact heuristic scoring for urgency level (`Urgent`, `High`, `Medium`, `Low`)
  - Expose unified `POST /analyze` endpoint returning category, priority, duplicates, and confidence

- [x] **Phase 5.4: Node.js $\leftrightarrow$ FastAPI Integration & Resiliency**
  - Implement `AiService` in Node.js backend using native `fetch` and `AbortController` (3000ms timeout budget)
  - Guarantee zero ticket loss by persisting complaint in MongoDB Atlas *before* triggering AI analysis asynchronously
  - Implement graceful degradation: if AI microservice times out or is offline, complaint stays safe and `aiAnalysis.status` records `Failed` without failing the user request
  - Display AI duplicate warnings in Admin Dashboard (`AdminDashboardPage.tsx`)

- [x] **Phase 5.5: Automated Testing & Verification**
  - 4/4 Pytest tests passing in `ai_service` (`tests/test_health.py`, `tests/test_analysis.py`)
  - 43/43 Jest tests passing across 6 test suites in `backend` (`tests/ai.test.ts`, `tests/complaint.test.ts`, etc.)
  - Frontend production build passing with 0 errors (`npm run build`)

- [x] **Day 5 Final Checkpoint: End-of-Day Review & Git Push (Requires Permission)**

---

## 📋 Day 6 — Analytics, Charts & Department Metrics

- [x] **Phase 6.1: MongoDB Analytics Aggregations**
  - Implement `AnalyticsService` in `backend/src/services/analytics.service.ts` with 7 aggregation pipelines
  - Compute KPI summary (Total, Resolved, Active, Resolution Rate %, Urgent Alerts, AI Completed)
  - Compute Category, Priority, and Status distributions with percentage shares
  - Compute Department Workload and capacity matrix (Total Assigned, Active, Resolved)
  - Compute Average Resolution Time in hours for resolved complaints
  - Compute trailing 7-day intake volume trend with zero-filled date continuity
  - Expose `GET /api/admin/analytics` in `admin.routes.ts` secured by `requireAuth` and `requireRole(ROLES.ADMIN)`

- [x] **Phase 6.2: Frontend Analytics Dashboard**
  - Implement frontend API client `frontend/src/api/analytics.api.ts`
  - Build `AdminAnalyticsPage.tsx` with 4 executive KPI cards, 7-day trend SVG bar chart, category progress bars, urgency badges, and department workload matrix
  - Wire route `/admin/analytics` guarded by `AdminRoute` in `App.tsx`
  - Mount navigation tabs in `Navbar.tsx` for seamless switching between Triage and Analytics

- [x] **Phase 6.3: Automated Testing & Verification**
  - 4/4 Jest tests passing in `tests/analytics.test.ts` (empty DB resiliency, aggregation accuracy, student RBAC 403, unauthenticated 401)
  - 47/47 full backend Jest regression tests passing across all 7 test suites
  - 4/4 Python Pytest tests passing in `ai_service`
  - Frontend production build passing with 0 errors (`1676 modules transformed`)

- [x] **Day 6 Final Checkpoint: End-of-Day Review & Git Push (Requires Permission)**

---

## 📋 Day 7 — Full System Verification, Security Audit & Deployment

- [x] **Phase 7.1: End-to-End User Journey Tests**
  - Implement master lifecycle integration test `backend/tests/e2e.test.ts` (8/8 steps passing)
  - Verify complete flow: student onboarding -> complaint filing -> AI processing -> duplicate detection -> admin triage -> state machine lifecycle -> notification dispatch & read -> analytics reflection
  - 55/55 backend tests passing across 8 suites

- [x] **Phase 7.2: Security & Boundary Audit**
  - Implement dedicated security test suite `backend/tests/security.test.ts` (8/8 tests passing)
  - Verify mass-assignment privilege escalation defense (forcing role to student)
  - Verify JWT tampering and expired token rejection (401)
  - Verify IDOR defenses on complaints and notifications (403/404)
  - Verify RBAC boundaries on admin triage and analytics (403)
  - Update cookie options for production cross-domain security (`sameSite: 'none'`, `secure: true`)
  - 63/63 backend tests passing across 9 suites

- [x] **Phase 7.3: Documentation & Production Audit**
  - Author comprehensive recruiter-ready root `README.md` with system topology, tech stack, architecture highlights, quickstart setup, test matrix, and production roadmap
  - Audit environment variables and configuration templates
  - Update testing guide `docs/testing.md` and daily log `docs/development-progress.md`
  - Verify full-stack test suites: 63 Jest backend tests + 4 Pytest ML tests = 67 Total Tests passing; frontend build 0 errors

- [x] **Phase 7.4: Final Git Push & Release (Requires Permission)**

---

## 🛡️ Operating Rules for This Project

1. **Explain First:** Every action, module, or code modification is explained before execution.
2. **Seek Permission:** No moving between phases or making destructive changes without explicit user approval.
3. **End-of-Day Git Push Only:** No pushing to Git after every tiny step. Git pushes occur **once per completed day** after running tests and obtaining explicit user sign-off.
