# Spotit

**Parking Management NioHack —** Spotit provides a trust-first parking booking platform that preserves evidence when bookings fail, enforces capacity integrity, and gives drivers and admins a clear resolution workflow.  

[//]: # (Badges: Build | License | Tech Stack — add your CI/status badges here)

---

## Overview
Spotit is a demo-ready parking reservation platform built around a "Continuity Engine" that preserves evidence and enforces booking integrity when real-world parking experiences go wrong. It combines a modern React frontend with a TypeScript/Express API and a Prisma-backed Postgres datastore to deliver reliable booking lifecycle, dispute handling, and capacity safety.

## Key features
- **Continuity Engine:** Captures evidence, creates a verifiable timeline of events for disputes, and surfaces recovery flows to drivers.
- **Booking lifecycle & capacity integrity:** Centralized capacity release logic ensures availableSpaces cannot exceed totalSpaces and prevents state drift.
- **Owner & admin tooling:** Owner dashboard and admin complaint workflows with a rich timeline to resolve disputes.
- **Geofence and demo modes:** Geofence check-in/out with a visible DEMO_MODE to explain bypasses during demos.
- **AI document verification (optional):** Driver identity verification pipeline integrated into the flow (contained under ai-verification-engine).

---

## Architecture & how it works
High-level flow: Frontend → Backend API → Database / Services / External APIs

Simple ASCII diagram
Frontend (React + Vite)
  ↓ (REST / protected endpoints)
Backend (Express + TypeScript)
  ↓ (Prisma)
Postgres (local / test via docker-compose)

How it fits together (short)
- The React frontend (vite + Tailwind) is a single-page app that calls the backend API for authentication, parking discovery, bookings, and reporting.
- The backend is an Express server (TypeScript) using Prisma to talk to Postgres; it contains business logic for bookings, the Continuity Engine, and periodic background jobs (e.g., a session sweeper).
- Docker Compose is used to run a dedicated test Postgres (on port 5433) for CI and local test runs.

Tech stack (compact)
- Frontend: React 19, Vite, TypeScript, Tailwind CSS, react-router
- Backend: Node + TypeScript, Express 5, Prisma ORM, Zod validation
- Database: PostgreSQL (dev/test via docker-compose)
- Auth / Third-party: JWT (jsonwebtoken), Cloudinary (image evidence), bcryptjs (password hashes)

---

## Quick start (local development)
Minimum prerequisites:
- Node >= 18 (recommended)
- npm or yarn
- Docker (for local test Postgres)

1. Clone the repo
   git clone https://github.com/Vishvam2006/Spotit.git
   cd Spotit

2. Start the local test Postgres (used by backend tests / local development)
   docker compose up -d db

3. Configure environment variables
   - Copy template files:
     cp backend/.env.example backend/.env
     cp frontend/.env.example frontend/.env
   - Example variables (adjust as needed; see samples below)

4. Backend (API)
   cd backend
   npm install
   # run dev server (uses tsx watcher)
   npm run dev
   # run tests (ensure docker compose db is running — test Postgres listens on 5433)
   npm test

5. Frontend (web app)
   cd ../frontend
   npm install
   npm run dev
   # open the browser at the Vite URL (usually http://localhost:5173)

.env.example (suggested — place in backend/.env.example and frontend/.env.example)

Backend (.env.example)
PORT=5001
DATABASE_URL=postgresql://spotit@localhost:5433/spotit_test?schema=public
JWT_SECRET=your_jwt_secret_here
CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
NODE_ENV=development

Frontend (.env.example)
VITE_API_URL=http://localhost:5001

Notes
- The repo's docker-compose.yml intentionally exposes the test Postgres on port 5433 to avoid colliding with a developer's local Postgres instance.
- For CI/test runs: ensure docker compose db is up, then run cd backend && npm test.

---

## Project structure (key folders)
```text
frontend/             # React + Vite SPA (UI components, pages, routing)
  src/
    components/       # Reusable UI components (ProtectedRoute, admin layout, etc.)
    pages/            # Page-level routes (Home, Explore, ParkingDetails, Admin...)
    context/          # Auth and theme providers
    main.tsx

backend/              # Express API (TypeScript) and Prisma configs
  src/
    app.ts            # Express app and routes registration
    server.ts         # Server bootstrap + session sweeper + graceful shutdown
    services/         # Business logic (sessionSweeper, booking logic, etc.)
    config/
      prisma.ts       # Prisma client config
  prisma/              # Schema and migrations (prisma generate / seed)

ai-verification-engine/  # (Optional) verification microservice / models
docs/                 # Supporting docs and design notes
SPOTIT_PRIORITY_ROADMAP.md  # Product roadmap and demo-critical priorities
docker-compose.yml    # Local Postgres for tests; volume and healthchecks
