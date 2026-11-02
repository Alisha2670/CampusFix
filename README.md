# FixMyCampus 🏛️

**An Enterprise-Grade, AI-Augmented Smart Campus Facility Maintenance & Incident Resolution Platform**

[![CI Tests](https://img.shields.io/badge/Automated%20Tests-67%20Passed-brightgreen.svg)](#-test-verification-matrix)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript%20%7C%20Python-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)
[![Framework](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite%20%2B%20Tailwind-61dafb.svg)](https://vitejs.dev/)
[![Backend](https://img.shields.io/badge/Backend-Node.js%20%2B%20FastAPI%20%2B%20MongoDB-green.svg)](https://expressjs.com/)

---

## 📖 Executive Overview

FixMyCampus is a decoupled, polyglot three-tier platform designed to solve the critical operational bottlenecks of university campus facility management. It replaces slow, disorganized maintenance requests with an automated pipeline featuring **local deep learning duplicate detection**, **state-machine governed ticket lifecycles**, **in-app notification delivery**, and **real-time administrative aggregation analytics**.

---

## 🏛️ System Architecture

The platform follows a decoupled, resilient microservice-inspired architecture:

```
+-----------------------------------------------------------------------+
|                             Client Layer                              |
|           React 18 (Vite) + TypeScript + Tailwind CSS                 |
|   - Student Portal: Complaint submission, photo preview, tracking    |
|   - Admin Portal: Triage cockpit, state machine transitions, charts   |
+-----------------------------------+-----------------------------------+
                                    | HTTPS / JSON (REST)
                                    v
+-----------------------------------------------------------------------+
|                       Main Backend Coordinator                        |
|             Node.js + Express.js + Mongoose (TypeScript)              |
|   - Security: Stateless JWT in HTTP-only cookies, 10-round bcrypt     |
|   - Business Rules: Finite State Machine (Status transitions)         |
|   - Cloudinary Upload Mediator: Memory buffer streaming               |
|   - Asynchronous AI Dispatcher: 3000ms AbortController timeout budget|
|   - Database Authority: Sole writer to MongoDB Atlas                 |
+--------------------+-----------------------------+--------------------+
                     |                             |
     Mongoose Driver |                             | Internal HTTP (Fetch)
                     v                             v
+--------------------------------+  +-----------------------------------+
|          Data Layer            |  |           AI Microservice         |
|      MongoDB Atlas (Cloud)     |  |       Python 3.12 + FastAPI       |
|   - users (indexed by email)   |  |   - SentenceTransformers          |
|   - complaints (indexed by ID) |  |     (all-MiniLM-L6-v2)            |
|   - notifications (indexed)    |  |   - 384-d Cosine Similarity Engine|
+--------------------------------+  |   - NLP Hazard & Urgency Scorer   |
                     |              +-----------------------------------+
      Cloudinary SDK |
                     v
+--------------------------------+
|         Object Storage         |
|     Cloudinary CDN (Images)    |
+--------------------------------+
```

---

## 🛠️ Complete Tech Stack

| Layer | Technologies | Role / Responsibility |
|---|---|---|
| **Client (Frontend)** | React 18, TypeScript, Vite, Tailwind CSS, Lucide React, Axios | Responsive single-page application with separate Student and Admin triage workflows |
| **API Coordinator (Backend)** | Node.js, Express.js, TypeScript, Mongoose, Zod, Bcrypt.js, Multer | RESTful API gateway, authentication, RBAC authorization, state machine, and data persistence |
| **AI Microservice** | Python 3.12, FastAPI, Uvicorn, SentenceTransformers (`all-MiniLM-L6-v2`), Scikit-learn, NumPy | Vector embeddings, 384-dimensional cosine similarity scoring, and NLP safety hazard classification |
| **Database & CDN** | MongoDB Atlas, Cloudinary CDN | Cloud NoSQL persistence with compound indexes; image optimization and global CDN delivery |
| **Testing & QA** | Jest, Supertest, `mongodb-memory-server`, Pytest, HTTPX, TypeScript (`tsc`) | 63 backend integration/security tests, 4 Pytest unit tests, and production type checking |

---

## ⚡ Core Engineering Highlights

### 1. 🔍 Local Deep Learning Semantic Duplicate Detection
- Rather than calling expensive, rate-limited external APIs, the platform runs a local **`all-MiniLM-L6-v2`** Transformer model inside an asynchronous FastAPI microservice.
- Converts complaint text into **384-dimensional dense vectors** capturing contextual meaning rather than raw keywords.
- Computes **Cosine Similarity ($\cos \theta$)** against open complaints in the same facility building.
- Flags duplicate candidates when similarity matches **$\ge 70\%$**, preventing redundant technician dispatches to the same location.

### 2. 🛡️ "Save-Before-AI" Zero-Ticket-Loss Resiliency Pattern
- **Mandatory Decision:** Student complaint ingestion must **never** be blocked or dropped by downstream microservice latency or failures.
- Ingestion Sequence:
  1. Complaint is validated via Zod and persisted in **MongoDB Atlas** (`status: "Submitted"`, `aiAnalysis.status: "Pending"`).
  2. Ticket ID (`FC-XXXX`) is immediately returned to the student ($<100\text{ms}$).
  3. Node.js invokes the AI microservice asynchronously with an **`AbortController` 3000ms timeout budget**.
  4. If the AI service succeeds, MongoDB records `aiAnalysis.status: "Completed"`.
  5. If the AI service times out or is offline, it degrades gracefully to `aiAnalysis.status: "Failed"` without failing the student request.

### 3. ⚙️ Strict Finite State Machine
Complaint lifecycle transitions are strictly governed by an algorithmic rules engine (`statemachine.service.ts`):
$$\text{Submitted} \longrightarrow \text{Acknowledged} \longrightarrow \text{Assigned} \longrightarrow \text{In Progress} \longrightarrow \text{Resolved}$$
- Illegal shortcuts (e.g., jumping from `Submitted` directly to `Resolved`) are rejected with `400 Bad Request` (`INVALID_STATUS_TRANSITION`).
- Terminal states (`Resolved`, `Duplicate`, `Rejected`) are strictly immutable.
- Every state transition appends an audit entry (`changedBy`, `timestamp`, `comment`) to `statusHistory` and triggers an in-app notification.

### 4. 📊 High-Performance MongoDB Aggregation Analytics
- The Admin Analytics dashboard (`/admin/analytics`) is backed by 7 aggregation pipelines:
  - **Summary KPIs:** Total Complaints, Resolution Rate (%), Average Resolution Duration (hrs), and Active Urgencies.
  - **7-Day Intake Trend:** Date-continuous, zero-filled daily volume aggregation.
  - **Department Workload Matrix:** Active vs. resolved capacity per maintenance crew (`Plumbing & Sanitation`, `Electrical Maintenance`, etc.).
  - **Category & Priority Distributions:** Multi-domain percentage breakdowns.

### 5. 🔒 Security & Boundary Defenses
- **Stateless JWT in HTTP-Only Cookies:** Tokens are stored in `HttpOnly`, `SameSite: 'none'` (production) cookies, rendering them immune to XSS token theft.
- **Insecure Direct Object Reference (IDOR) Defense:** Students can strictly only view their own private tickets; cross-student ticket requests return `403 Forbidden`.
- **Privilege Escalation Defense:** Zod schemas and backend services strictly strip and ignore any attempted `role: "admin"` injection during registration.
- **Role-Based Access Control (RBAC):** Administrative triage and analytics routes reject non-admin sessions with `403 Forbidden`.

---

## 🚀 Quickstart & Local Setup

### Prerequisites
- **Node.js:** v18+ (Node 20+ or 22+ recommended)
- **Python:** v3.10+ (Python 3.12 recommended)
- **MongoDB Atlas Account:** (Or local MongoDB instance)
- **Cloudinary Account:** (Free tier)

---

### Step 1: Clone the Repository
```bash
git clone https://github.com/Alisha2670/CampusFix.git
cd CampusFix
```

---

### Step 2: Configure Environment Variables

Create `.env` inside `backend/`:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_super_secret_jwt_key_min_32_chars
FRONTEND_URL=http://localhost:5173
AI_SERVICE_URL=http://localhost:8000
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

Create `.env` inside `frontend/`:
```env
VITE_API_URL=http://localhost:5000/api
```

---

### Step 3: Start the Backend (Port 5000)
```bash
cd backend
npm install
npm run dev
```

*(Optional: Seed standard administrator account)*
```bash
npx tsx scripts/seed-admin.ts
# Default: admin@campus.edu / AdminPass123!
```

---

### Step 4: Start the AI Microservice (Port 8000)
```bash
cd ai_service
python -m venv .venv

# Windows:
.\.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

---

### Step 5: Start the Frontend (Port 5173)
```bash
cd frontend
npm install
npm run dev
```

Open **`http://localhost:5173`** in your browser!

---

## 🧪 Test Verification Matrix

FixMyCampus is verified through **67 automated test cases** across unit, integration, and security layers:

```bash
# Run all 63 Node.js backend tests (Jest)
cd backend
npm test

# Run all 4 Python AI tests (Pytest)
cd ai_service
pytest tests -v

# Run Frontend type checking and production build
cd frontend
npm run build
```

### Verified Test Suites:
| Test Suite | Framework | Tests | Result | Focus Area |
|---|---|---|---|---|
| `tests/auth.test.ts` | Jest | 12 | **PASS** | Bcrypt hashing, JWT cookies, profile retrieval, RBAC blocks |
| `tests/complaint.test.ts` | Jest | 9 | **PASS** | Ticket generation (`FC-XXXX`), Cloudinary buffer upload, IDOR defense |
| `tests/admin.test.ts` | Jest | 12 | **PASS** | Multi-filter pagination, search, status transitions, department triage |
| `tests/notification.test.ts` | Jest | 6 | **PASS** | Status alerts, unread badge counter, single & bulk read markers |
| `tests/ai.test.ts` | Jest | 2 | **PASS** | Zero-ticket-loss resiliency, 3000ms timeout fallback to `Failed` |
| `tests/analytics.test.ts` | Jest | 4 | **PASS** | Aggregation accuracy, empty database resiliency, RBAC 403 blocks |
| `tests/e2e.test.ts` | Jest | 8 | **PASS** | Master lifecycle journey from registration to resolution & analytics |
| `tests/security.test.ts` | Jest | 8 | **PASS** | Tampered JWTs, expired tokens, privilege escalation, IDOR defenses |
| `tests/health.test.ts` | Jest | 2 | **PASS** | Health probe (`200 OK`) and 404 catch-all |
| `ai_service/tests/` | Pytest | 4 | **PASS** | Model lifespan loading, 384-d cosine similarity, NLP hazard classifier |
| **Total Test Coverage** | | **67 / 67** | **100%** | Zero failing tests |

---

## 🗺️ Production Roadmap & Extension Points

- [ ] **Google Workspace OAuth 2.0 (SSO):** Institutional `.edu` domain verification and single-click authentication.
- [ ] **Transactional Email Recovery (Resend / AWS SES):** Time-bound cryptographic password reset tokens (SHA-256 with 15-minute TTL).
- [ ] **Real-time WebSockets:** Live push notification streaming using Socket.io or WebSockets.
- [ ] **Mobile App Client:** React Native companion application for facility maintenance technicians.

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
