# FixMyCampus 🏛️

**Smart Campus Maintenance & Facility Issue Resolution System**

FixMyCampus is an enterprise-grade, microservice-inspired platform designed to streamline campus facility repairs, eliminate duplicate reports with AI semantic vector matching, and automate priority triaging.

---

## 🛠️ Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS
- **Backend:** Node.js, Express.js, TypeScript, Mongoose, Zod
- **AI Service:** Python 3.10+, FastAPI, Sentence Transformers (`all-MiniLM-L6-v2`), Scikit-learn
- **Database:** MongoDB Atlas
- **Storage:** Cloudinary CDN

---

## 📁 System Design & Architecture Contracts

All architectural contracts, database schemas, and API documentation are maintained as the single source of truth in the `docs/` directory:

- [docs/architecture.md](docs/architecture.md) — System topology, component boundaries, and failure handling
- [docs/database-schema.md](docs/database-schema.md) — Complete Mongoose schemas, types, enums, and indexes
- [docs/api-documentation.md](docs/api-documentation.md) — REST API endpoints, request/response formats
- [docs/testing.md](docs/testing.md) — Testing strategy and verification matrix
- [docs/development-progress.md](docs/development-progress.md) — Daily development log and audit trail

