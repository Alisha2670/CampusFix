# FixMyCampus — System Architecture Contract

This document is the official architectural foundation for FixMyCampus. Any architectural changes must be reviewed, justified, and approved before modification.

---

## 1. High-Level Architecture Overview

FixMyCampus is structured as a decoupled, polyglot three-tier microservice-inspired architecture:

```
+-------------------------------------------------------------------+
|                        Client Layer                               |
|   React (Vite) + TypeScript + Tailwind CSS                        |
|   - Student Portal: Submission form, ticket tracking, history    |
|   - Admin Portal: Triage dashboard, department dispatch, stats   |
+---------------------------------+---------------------------------+
                                  | HTTPS / JSON (REST)
                                  v
+-------------------------------------------------------------------+
|                    Main Backend Coordinator                       |
|   Node.js + Express.js + Mongoose (TypeScript)                    |
|   - Auth & RBAC (JWT in HTTP-only cookies, bcrypt)                |
|   - Business rules & State Machine (Status transitions)           |
|   - Cloudinary upload mediator & validation                       |
|   - Single point of contact for Database & AI Service             |
+-------------------+-----------------------------+-----------------+
                    |                             |
     Mongoose Pool  |                             | Internal HTTP (Axios)
                    v                             v
+-------------------------------+  +--------------------------------+
|         Data Layer            |  |         AI Service             |
|   MongoDB Atlas               |  |   Python 3.10+ & FastAPI       |
|   - users                     |  |   - Sentence Transformers      |
|   - complaints                |  |     (all-MiniLM-L6-v2)         |
|   - notifications             |  |   - Scikit-learn Classifier    |
|                               |  |   - Cosine Similarity Engine   |
+-------------------------------+  +--------------------------------+
                    |
                    | Cloudinary SDK
                    v
+-------------------------------+
|       Object Storage          |
|   Cloudinary CDN (Images)     |
+-------------------------------+
```

---

## 2. Core Architectural Decisions (Frozen)

### Decision 1: API & Schema Contracts First
No backend endpoint or frontend view is coded before its contract is documented in `docs/api-documentation.md` and `docs/database-schema.md`.

### Decision 2: Save Before AI Analysis (Graceful Degradation)
Student complaint submission must **never** be blocked or delayed by the AI service:
1. Node.js validates and persists the complaint in MongoDB Atlas (`status: "Submitted"`, `aiAnalysis.status: "Pending"`).
2. Complaint reference ID is immediately returned to the student.
3. Node.js invokes FastAPI asynchronously with a 3000ms timeout budget.
4. If FastAPI succeeds, MongoDB is updated (`aiAnalysis.status: "Completed"`).
5. If FastAPI fails or times out, MongoDB records `aiAnalysis.status: "Failed"`. The complaint remains 100% saved and manageable by administrators.

### Decision 3: In-App Notifications & Single Database Source of Truth
MongoDB Atlas is the single data authority. Only Node.js has database read/write access. All status transitions append to an embedded `statusHistory` array and insert an in-app notification.

---

## 3. Communication Protocols

| Link | Protocol | Format | Security / Auth |
|---|---|---|---|
| React $\to$ Node.js | HTTPS REST | JSON / multipart/form-data | HTTP-only JWT Cookie, CORS whitelist |
| Node.js $\to$ MongoDB Atlas | Mongo Wire Protocol | BSON via Mongoose | TLS, IP Whitelist, Auth Credentials |
| Node.js $\to$ Cloudinary | HTTPS | Binary stream | API Key + Secret signature |
| Node.js $\to$ FastAPI | Internal HTTP | JSON | Internal private port (timeout: 3000ms) |
| React $\to$ FastAPI | **FORBIDDEN** | N/A | Direct browser-to-AI calls are blocked |
