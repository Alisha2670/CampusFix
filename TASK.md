# FixMyCampus — Master Task & Workflow Roadmap (7-Day Plan)

This document tracks the complete end-to-end development workflow for FixMyCampus across all 7 days.
Every stage requires passing tests, verification, and explicit user permission before proceeding.
**Git pushes are performed strictly at the end of each completed day with user approval.**

---

## 📅 Day-by-Day Workflow Overview

```
Day 1: Project Setup, Mongo Connection, Authentication & Authorization (COMPLETE - AWAITING PUSH)
  │
  ▼
Day 2: Complaint Submission Pipeline (Node API, Cloudinary Media, React Form)
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

- [x] **Phase 1.1: System Architecture & Master Contract**
  - Architecture diagram and component boundaries documented
  - Database schema contract defined (`docs/database-schema.md`)
  - API documentation contract finalized (`docs/api-documentation.md`)
  - Git repository initialized with strict `.gitignore`
  - Initial contract commit pushed to GitHub

- [x] **Phase 1.2: Backend Scaffold & Environment Setup**
  - Initialize `backend/` directory with TypeScript, Express, Mongoose, Zod, JWT
  - Configure environment parser (`src/config/env.ts`)
  - Setup Mongoose connection with retry and timeout logic (`src/config/db.ts`)
  - Define universal enums: Roles, Categories, Priorities, Statuses (`src/constants/enums.ts`)
  - Build standard API response helpers (`src/utils/response.util.ts`)

- [x] **Phase 1.3: User Model & Security Engine**
  - Build Mongoose `User` schema with bcrypt password hashing (`src/models/User.ts`)
  - Enforce email uniqueness and role enum restrictions (`student` vs `admin`)
  - Implement request validation schemas using Zod (`src/validators/auth.validator.ts`)

- [x] **Phase 1.4: Authentication & Authorization Middleware**
  - Implement JWT cookie extraction & validation middleware (`src/middleware/auth.middleware.ts`)
  - Implement Role-Based Access Control (RBAC) guard (`src/middleware/role.middleware.ts`)
  - Implement centralized error handler for Zod & Mongo errors (`src/middleware/error.middleware.ts`)

- [x] **Phase 1.5: Auth Controllers & Routes**
  - `POST /api/auth/register` (Public: registers student, hashes password, sets HTTP-only cookie)
  - `POST /api/auth/login` (Public: verifies credentials, sets HTTP-only cookie)
  - `POST /api/auth/logout` (Authenticated: clears session cookie)
  - `GET /api/auth/me` (Authenticated: returns current user profile)

- [x] **Phase 1.6: Automated Testing & Verification**
  - Run Jest unit and API integration tests with in-memory MongoDB
  - Verify rejection of invalid emails, short passwords, duplicate registrations
  - Verify RBAC: ensure students are blocked from admin resources with 403 Forbidden
  - Verify password hash safety (plain password never returned)
  - **Result: 14 out of 14 tests passed**

- [ ] **Day 1 Final Checkpoint: End-of-Day Review & Git Push**
  - Update `docs/development-progress.md` with test results
  - Present results to user and **request permission to perform Day 1 Git push**

---

## 📋 Day 2 — Complaint Submission Pipeline & Cloud Storage

- [ ] **Phase 2.1: Complaint Data Modeling**
  - Create Mongoose `Complaint` model (`src/models/Complaint.ts`)
  - Implement embedded `location` object and `aiAnalysis` schema with default `Pending`
  - Implement complaint ID generator (e.g., `FC-1024`)

- [ ] **Phase 2.2: Cloudinary Media Storage**
  - Setup Cloudinary configuration and upload helper (`src/config/cloudinary.ts`)
  - Multer middleware for memory buffering & file type validation (JPEG, PNG, WebP $\le 5\text{MB}$)

- [ ] **Phase 2.3: Complaint Creation API**
  - Implement `POST /api/complaints` (saves complaint before calling AI)
  - Implement request validator for title, description, category, and room location
  - Return 201 Created with complaint reference ID immediately

- [ ] **Phase 2.4: Frontend Initialization & Complaint Form**
  - Initialize `frontend/` with React, TypeScript, Vite, and Tailwind CSS
  - Build central Axios API client with `withCredentials: true`
  - Build Student Complaint Submission Form with image upload preview and validation

- [ ] **Phase 2.5: Automated Testing & Verification**
  - Test complaint persistence in MongoDB
  - Test validation errors on missing location or invalid category
  - Test file upload size/type constraints

- [ ] **Day 2 Final Checkpoint: End-of-Day Review & Git Push (Requires Permission)**

---

## 📋 Day 3 — Ticket Tracking & Admin Dashboards

- [ ] **Phase 3.1: Complaint Retrieval APIs**
  - Implement `GET /api/complaints/my` (Student: own complaints only with pagination)
  - Implement `GET /api/complaints/:id` (IDOR check: only owner or admin can view)
  - Implement `GET /api/admin/complaints` (Admin: filter by status, category, priority)

- [ ] **Phase 3.2: Frontend Student Dashboard**
  - "My Complaints" list view with status badges and timestamps
  - Single Complaint Detail view with progress tracker

- [ ] **Phase 3.3: Frontend Admin Dashboard**
  - Complaints triage table with multi-filter controls (Status, Priority, Category)
  - Search bar by Complaint ID or Student Name

- [ ] **Phase 3.4: Automated Testing & Verification**
  - Verify IDOR protection (student A cannot view student B's ticket)
  - Verify admin pagination and filtering accuracy

- [ ] **Day 3 Final Checkpoint: End-of-Day Review & Git Push (Requires Permission)**

---

## 📋 Day 4 — Admin Triage, State Transitions & In-App Notifications

- [ ] **Phase 4.1: State Machine & Transition Rules**
  - Implement finite state machine validator for complaint lifecycle:
    `Submitted` $\to$ `Acknowledged` $\to$ `Assigned` $\to$ `In Progress` $\to$ `Resolved` / `Rejected` / `Duplicate`
  - Implement `PATCH /api/admin/complaints/:id/status` (updates status and appends `statusHistory`)
  - Implement `PATCH /api/admin/complaints/:id` (assigns department and confirms priority)

- [ ] **Phase 4.2: In-App Notification System**
  - Create Mongoose `Notification` model (`src/models/Notification.ts`)
  - Implement `NotificationService.createNotification()` triggered on every status change
  - Implement `GET /api/notifications` and `PATCH /api/notifications/:id/read`

- [ ] **Phase 4.3: Frontend Notification UI**
  - Notification bell with unread badge counter in navbar
  - Real-time or poll-based notification dropdown with mark-as-read capability

- [ ] **Phase 4.4: Automated Testing & Verification**
  - Test invalid status transition rejection (e.g., cannot jump from `Submitted` to `Resolved` directly)
  - Test notification generation upon status change

- [ ] **Day 4 Final Checkpoint: End-of-Day Review & Git Push (Requires Permission)**

---

## 📋 Day 5 — AI Microservice (FastAPI + Embeddings + Duplicates)

- [ ] **Phase 5.1: FastAPI Setup & Health Check**
  - Initialize `ai-service/` with Python 3.10+, FastAPI, and Uvicorn
  - Implement `GET /health` with model loading diagnostics
  - Setup Pydantic request/response schemas matching master contract

- [ ] **Phase 5.2: NLP & Semantic Duplicate Detection**
  - Load `sentence-transformers/all-MiniLM-L6-v2`
  - Implement cosine similarity engine to compare against candidate complaints in same building
  - Flag duplicates exceeding $0.75$ similarity threshold

- [ ] **Phase 5.3: Automated Categorization & Priority Engine**
  - Implement category classifier or keyword-intent heuristics
  - Implement urgency detection rules (e.g., "spark", "gas", "flood" $\to$ Urgent)

- [ ] **Phase 5.4: Node.js $\leftrightarrow$ FastAPI Integration & Resiliency**
  - Implement `ai-client.service.ts` with 3000ms timeout budget
  - Verify graceful degradation: if FastAPI is killed, complaints still save with `aiAnalysis.status = "Failed"`

- [ ] **Phase 5.5: Automated Testing & Verification**
  - Pytest unit tests for `/analyze` endpoint
  - Integration test verifying Node handles AI service timeout cleanly

- [ ] **Day 5 Final Checkpoint: End-of-Day Review & Git Push (Requires Permission)**

---

## 📋 Day 6 — Analytics, Charts & Department Metrics

- [ ] **Phase 6.1: MongoDB Analytics Aggregations**
  - Implement `GET /api/admin/analytics` using MongoDB Aggregation Pipelines:
    - Complaints count grouped by status
    - Volume distribution by category
    - Average resolution turnaround time
    - Recurring issue hotspots by building/room

- [ ] **Phase 6.2: Frontend Analytics Dashboard**
  - Integrate chart visualization library (e.g., Chart.js / Recharts)
  - Metrics cards: Total complaints, Resolution rate, Pending triage, Urgent issues
  - Visual breakdown charts for admin insights

- [ ] **Phase 6.3: Automated Testing & Verification**
  - Test aggregation accuracy with seeded mock complaint history

- [ ] **Day 6 Final Checkpoint: End-of-Day Review & Git Push (Requires Permission)**

---

## 📋 Day 7 — Full System Verification, Security Audit & Deployment

- [ ] **Phase 7.1: End-to-End User Journey Tests**
  - Complete flow: Student registers $\to$ Submits issue $\to$ AI analyzes $\to$ Admin triages $\to$ Department assigned $\to$ Status updated $\to$ Student notified $\to$ Resolved $\to$ Reflected in Analytics
- [ ] **Phase 7.2: Security & Boundary Audit**
  - Verify password hash safety, XSS protection, CORS configuration, and IDOR guards
- [ ] **Phase 7.3: Documentation & Production Audit**
  - Finalize all docs in `docs/` with complete execution summaries
- [ ] **Phase 7.4: Final Git Push & Release (Requires Permission)**

---

## 🛡️ Operating Rules for This Project

1. **Explain First:** Every action, module, or code modification is explained before execution.
2. **Seek Permission:** No moving between phases or making destructive changes without explicit user approval.
3. **End-of-Day Git Push Only:** No pushing to Git after every tiny step. Git pushes occur **once per completed day** after running tests and obtaining explicit user sign-off.
