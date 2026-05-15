# 🕵️‍♂️ TechTrix 2026: Treasure Hunt:Murder Mystery Intelligence Bureau

Welcome, Operative. You have gained access to the core repository for the **Murder Mystery Platform**, the official investigative terminal for TechTrix 2026. This system is designed for high-stakes digital forensics, evidence analysis, and team-based competition.

---

## 🔐 CRITICAL ACCESS KEYS (EYES ONLY)

| SECURITY LEVEL | ACCESS KEY | TARGET DESTINATION |
| :--- | :--- | :--- |
| **MASTER ADMIN** | `techtrix_admin_2026` | `/admin` (Command Center) |
| **BATCH 1** | `CRIMSON2026` | Sector 4: Primary Evidence |
| **BATCH 2** | `VOIDSHADOW2026` | Deep Archive: Secondary Intel |
| **BATCH 3** | `DEATHLYSILENCE2026` | Final Dossier: Truth Extraction |

---

## 🏛️ ARCHITECTURE OVERVIEW

The platform is a split-stack intelligence system designed for low-latency data synchronization and cinematic user immersion.

- **Frontend**: Next.js 14 (App Router) | Tailwind CSS | Framer Motion | Clerk Auth
- **Backend**: FastAPI (Python 3.11+) | Beanie ODM | MongoDB Atlas
- **Security**: Granular CORS protocols & Secret-Key Gating

---

## 🛠️ OPERATIONAL SETUP

### 1. Intelligence Terminal (Frontend)
Initialize the user interface and connection protocols.
```bash
cd frontend
npm install
npm run dev
```
**Required Environment (`.env.local`):**
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Clerk authentication key.
- `NEXT_PUBLIC_API_URL`: `http://localhost:8000` (Local)

### 2. Central Intelligence (Backend)
Initialize the database and API services.
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```
**Required Environment (`.env`):**
- `MONGODB_URI`: Connection string for MongoDB Atlas.
- `ALLOWED_ORIGINS`: Commas-separated list of permitted domains.

---

## 🚀 DEPLOYMENT STRATEGY

### **Live Server (Render)**
- Set `PYTHON_VERSION` to `3.11.x`.
- Ensure `ALLOWED_ORIGINS` includes your Vercel domain.
- The system automatically handles port binding and health checks.

### **Surface Interface (Vercel)**
- Connect the GitHub repository.
- Override the `NEXT_PUBLIC_API_URL` with your Render backend URL.
- Deploy with the Next.js preset.

---

## 📜 FIELD MANUAL (RULES OF ENGAGEMENT)

1. **Evidence Locking**: All batches are locked by default. Admins must "Unlock" them via the Command Center to allow team entry.
2. **Team Progress**: Teams must submit the quiz for the current batch before gaining authorization to enter the next sector.
3. **Admin Powers**: The Command Center (`/admin`) allows operatives to reset team progress, update story intel, and synchronize codewords in real-time.

---
**STRICTLY CONFIDENTIAL | TECHTRIX 2026 INTELLIGENCE BUREAU**
