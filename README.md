# Murder Mystery Platform: TechTrix 2026

Welcome to the TechTrix Murder Mystery platform. This document contains the necessary access codes and configuration details for testing and operation.

## 🕵️ Quick Access Codes (Default)

Use these codes to unlock the evidence batches in the Investigation Hub:

| Batch | Default Access Code | Description |
|-------|---------------------|-------------|
| **Batch 1** | *(Check Admin)* | Primary evidence for Sector 4 Anomaly |
| **Batch 2** | `CRIMSON2026` | Secondary evidence (requires B1 completion) |
| **Batch 3** | `CRIMSON2026` | Final archive files |

### 🔐 Admin Access
- **Admin Dashboard**: `/admin`
- **Master Access Key**: `techtrix_admin_2026`
- **Permissions**: Manage batch codewords, toggle locks, and reset team progress.

*Note: Access codes can be changed via the Admin Dashboard or directly in the MongoDB `batches` collection.*

## 🛠️ Local Development Setup

### 1. Backend (FastAPI)
- **Directory**: `/backend`
- **Command**: `uvicorn main:app --reload`
- **Environment**: Ensure `.env` contains your `MONGODB_URI`.
- **API URL**: `http://localhost:8000`

### 2. Frontend (Next.js)
- **Directory**: `/frontend`
- **Command**: `npm run dev`
- **Environment**: Ensure `.env.local` contains your `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`.
- **URL**: `http://localhost:3000`

## 🚀 Production Deployment

### Backend (Render)
- **Environment Variables**:
  - `ALLOWED_ORIGINS`: `https://your-app.vercel.app`
  - `MONGODB_URI`: Your MongoDB Atlas string.

### Frontend (Vercel)
- **Environment Variables**:
  - `NEXT_PUBLIC_API_URL`: `https://your-backend.onrender.com`

## 🛡️ Admin Access
To access the Admin Dashboard (`/admin`), your email must be listed in the `ADMIN_EMAILS` variable in the backend `.env`.

---
**TechTrix 2026 Intelligence Bureau**
