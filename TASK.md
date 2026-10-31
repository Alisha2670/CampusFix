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

- [ ] **Phase 4.1: State Machine & Transition Rules**
- [ ] **Phase 4.2: In-App Notification System**
- [ ] **Phase 4.3: Frontend Notification UI**
- [ ] **Phase 4.4: Automated Testing & Verification**
- [ ] **Day 4 Final Checkpoint: End-of-Day Review & Git Push (Requires Permission)**

---

## 📋 Day 5 — AI Microservice (FastAPI + Embeddings + Duplicates)

- [ ] **Phase 5.1: FastAPI Setup & Health Check**
- [ ] **Phase 5.2: NLP & Semantic Duplicate Detection**
- [ ] **Phase 5.3: Automated Categorization & Priority Engine**
- [ ] **Phase 5.4: Node.js $\leftrightarrow$ FastAPI Integration & Resiliency**
- [ ] **Phase 5.5: Automated Testing & Verification**
- [ ] **Day 5 Final Checkpoint: End-of-Day Review & Git Push (Requires Permission)**

---

## 📋 Day 6 — Analytics, Charts & Department Metrics

- [ ] **Phase 6.1: MongoDB Analytics Aggregations**
- [ ] **Phase 6.2: Frontend Analytics Dashboard**
- [ ] **Phase 6.3: Automated Testing & Verification**
- [ ] **Day 6 Final Checkpoint: End-of-Day Review & Git Push (Requires Permission)**

---

## 📋 Day 7 — Full System Verification, Security Audit & Deployment

- [ ] **Phase 7.1: End-to-End User Journey Tests**
- [ ] **Phase 7.2: Security & Boundary Audit**
- [ ] **Phase 7.3: Documentation & Production Audit**
- [ ] **Phase 7.4: Final Git Push & Release (Requires Permission)**

---

## 🛡️ Operating Rules for This Project

1. **Explain First:** Every action, module, or code modification is explained before execution.
2. **Seek Permission:** No moving between phases or making destructive changes without explicit user approval.
3. **End-of-Day Git Push Only:** No pushing to Git after every tiny step. Git pushes occur **once per completed day** after running tests and obtaining explicit user sign-off.
