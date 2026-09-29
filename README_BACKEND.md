# SAFEX AR Safety Command Center — Backend & Database Guide

Real-time Node.js, Express, TypeScript, and PostgreSQL backend for the SAFEX AR Industrial Safety Command Center and Unity Android AR training application.

---

## 1. Architecture

```text
Unity Android APK (AR Simulation)
        ↓ (UnityWebRequest / HTTP REST)
SAFEX REST API (Express + TypeScript on Node.js)
        ↓ (Prisma ORM)
PostgreSQL Database (Source of Truth)
        ↓ (Polling / REST Endpoints)
SAFEX Admin Dashboard (HTML5 / Vanilla CSS / JavaScript)
```

- **Offline-First Resilient Sync:** Unity training continues completely uninterrupted when offline. Unsent telemetry is enqueued in `Application.persistentDataPath/SAFEXSyncQueue.json` and automatically flushed when internet connectivity returns.
- **Multilingual Telemetry:** Trainee records and sessions support **English (`en`)**, **Hindi (`hi`)**, and **Santali (`sat`)**.
- **Admin Dashboard Auto-Refresh:** The frontend polls the backend every 6 seconds to reflect real-time session progress, assessments, and issued certificates.

---

## 2. Prerequisites

- **Node.js**: v18.0.0 or later (v20+ recommended)
- **npm**: v9.0.0 or later
- **PostgreSQL**: v14, v15, or v16 (Local via Docker / Windows Installer, or Cloud via Neon / Supabase / Railway)

---

## 3. PostgreSQL Database Setup

### Option A: 1-Click Docker Compose (Recommended)
Run PostgreSQL locally with the included `docker-compose.yml`:
```bash
cd backend
docker compose up -d
```
This starts PostgreSQL on port `5432` with user `postgres` and database `safex_safety_db`.

### Option B: Cloud PostgreSQL (Zero Local Setup)
1. Create a free PostgreSQL database on [Neon.tech](https://neon.tech) or [Supabase](https://supabase.com).
2. Copy the pooled connection string into `backend/.env`.

### Option C: Native Windows PostgreSQL
If using the PostgreSQL Windows Installer:
1. Ensure the PostgreSQL Windows Service is running (`net start postgresql-x64-16` or from Services).
2. Create database `safex_safety_db` via pgAdmin or `createdb -U postgres safex_safety_db`.

---

## 4. Environment Variables (`.env`)

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Configure your environment settings:
```env
# Database Connection (PostgreSQL)
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/safex_safety_db?schema=public"

# Server Port
PORT=5000

# Security Key for Unity AR App (X-SAFEX-API-KEY header)
ADMIN_API_KEY="SAFEX-AR-SAFETY-KEY-2026"

# Allowed CORS Origins (* or comma-separated domains)
CORS_ORIGIN="*"
```

---

## 5. Local Setup & Execution Commands

Run these exact commands in the `/backend` folder:

```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma Client
npx prisma generate

# 3. Apply database migration
npx prisma migrate dev --name init
# (Alternative for rapid prototype without migration files: npx prisma db push)

# 4. Seed demo trainees & sessions (clearly tagged isDemo: true)
npm run seed

# 5. Start development server with live reload
npm run dev

# 6. Production build & start
npm run build
npm start
```

---

## 6. REST API Documentation

All endpoints return a uniform JSON format:
```json
{
  "success": true,
  "data": { ... }
}
```

In case of error:
```json
{
  "success": false,
  "message": "Error description"
}
```

### 6.1 Trainees API

#### `POST /api/trainees`
Creates or updates a trainee record.
- **Request Body:**
  ```json
  {
    "traineeId": "TR-2141",
    "name": "Asha Soren",
    "language": "sat",
    "deviceId": "ANDROID-SAFEX-01"
  }
  ```
- **Language values supported:** `sat` (Santali), `hi` (Hindi), `en` (English).

#### `GET /api/trainees`
Returns all registered trainees with their latest sessions and certificates.

#### `GET /api/trainees/:traineeId`
Returns a specific trainee along with full training session history, events, and certificates.

---

### 6.2 Training Sessions API

#### `POST /api/sessions`
Starts a new training session.
- **Request Body:**
  ```json
  {
    "sessionId": "SESSION-GAS-20260929-01",
    "traineeId": "TR-2141",
    "module": "GAS",
    "startedAt": "2026-09-29T10:00:00Z"
  }
  ```
- **Module values:** `GAS`, `FIRE`.

#### `PATCH /api/sessions/:sessionId`
Updates session completion, duration, or status.
- **Request Body:**
  ```json
  {
    "status": "COMPLETED",
    "completedAt": "2026-09-29T10:14:00Z",
    "durationSeconds": 840,
    "assessmentPassed": true
  }
  ```

#### `GET /api/sessions`
Returns recent training sessions.
- **Query Filters:** `?module=GAS&status=COMPLETED&language=sat&traineeId=TR-2141&limit=20`

---

### 6.3 Training Events API

#### `POST /api/sessions/:sessionId/events`
Records an in-session AR telemetry event.
- **Request Body:**
  ```json
  {
    "eventType": "BUDDY_CONFIRMED",
    "eventData": {
      "module": "GAS",
      "buddyName": "Arun Kisku"
    },
    "timestamp": "2026-09-29T10:08:00Z"
  }
  ```
- **Supported Event Types:**
  - `SURFACE_DETECTED`
  - `MINE_PLACED`
  - `TRAINING_STARTED`
  - `REACH_POWER_CONTROL`
  - `ISOLATE_POWER`
  - `USE_FIRE_EXTINGUISHER`
  - `RAISE_ALARM`
  - `REACH_GAS_DETECTOR`
  - `SELECT_CORRECT_GAS_PPE`
  - `BUDDY_CONFIRMED`
  - `ISOLATE_CONTAMINATED_AREA`
  - `EVACUATE_SAFE_EXIT`
  - `TRAINING_COMPLETED`

---

### 6.4 Assessments API

#### `POST /api/assessments`
Records action-based competency assessment results.
- **Request Body:**
  ```json
  {
    "sessionId": "SESSION-GAS-20260929-01",
    "module": "GAS",
    "completedActions": [
      "REACH_GAS_DETECTOR",
      "RAISE_ALARM",
      "SELECT_CORRECT_GAS_PPE",
      "BUDDY_CONFIRMED",
      "ISOLATE_CONTAMINATED_AREA",
      "EVACUATE_SAFE_EXIT"
    ],
    "score": 100,
    "passed": true,
    "durationSeconds": 840
  }
  ```

#### `GET /api/assessments`
Returns assessment records.

---

### 6.5 Certificates & QR Verification API

#### `POST /api/certificates`
Registers an issued certificate.
- **Request Body:**
  ```json
  {
    "certificateId": "SAFEX-20260929-842103",
    "sessionId": "SESSION-GAS-20260929-01",
    "traineeId": "TR-2141",
    "module": "GAS",
    "score": 100,
    "percentage": 100,
    "status": "PASSED"
  }
  ```

#### `GET /api/certificates`
Returns all issued certificates.

#### `GET /api/certificates/:certificateId`
Official QR scan and audit verification endpoint. Returns certificate status, trainee details, ISO 45001 compliance standards, and score.

---

### 6.6 Dashboard Analytics API

#### `GET /api/dashboard/overview`
Returns live command center summary:
```json
{
  "totalTrainees": 9,
  "activeSessions": 1,
  "completedSessions": 3,
  "passedAssessments": 3,
  "certificatesIssued": 3,
  "fireSessions": 1,
  "gasSessions": 3,
  "completionRate": 75
}
```

#### `GET /api/dashboard/training-trend`
Returns daily completion statistics for the last 14 days for Fire & Gas modules.

#### `GET /api/dashboard/recent-sessions`
Returns recent sessions with trainee demographic and event details.

#### `GET /api/dashboard/module-stats`
Returns per-module statistics (`Fire & Explosion` and `Gas Leak & Confined Space`).

#### `GET /api/dashboard/language-stats`
Returns participant breakdown by language:
- English (`en`)
- Hindi (`hi`)
- Santali (`sat`)

---

## 7. Unity Android Integration Instructions

### 7.1 Script Installation
1. Copy the script located at `Assets/Scripts/Backend/SAFEXCloudSyncManager.cs` into your Unity project's `Assets/Scripts/Backend/` folder.
2. In your opening scene (or training boot scene), create an empty GameObject named `SAFEXCloudSync` and attach `SAFEXCloudSyncManager`.
3. In the Inspector:
   - **Api Base Url:**
     - Android Emulator: `http://10.0.2.2:5000/api`
     - Physical Android Device (Local Wi-Fi): `http://YOUR-PC-IP:5000/api` (e.g. `http://192.168.1.15:5000/api`)
     - Production: `https://your-domain.com/api`
   - **Api Key:** `SAFEX-AR-SAFETY-KEY-2026`
   - **Current Language:** `sat` (Santali), `hi`, or `en`.

### 7.2 Controller Integration Examples

#### In `GasTrainingController.cs`:
```csharp
// When gas is detected
SAFEXCloudSyncManager.Instance.SendTrainingEvent(
    currentSessionId,
    SAFEXCloudSyncManager.EVENT_REACH_GAS_DETECTOR,
    "{\"gas\":\"CH4\",\"ppm\":50}"
);

// When buddy protocol confirmed
SAFEXCloudSyncManager.Instance.SendTrainingEvent(
    currentSessionId,
    SAFEXCloudSyncManager.EVENT_BUDDY_CONFIRMED,
    "{\"buddy\":\"Arun Kisku\"}"
);

// When safe exit reached
SAFEXCloudSyncManager.Instance.SendTrainingEvent(
    currentSessionId,
    SAFEXCloudSyncManager.EVENT_EVACUATE_SAFE_EXIT
);
```

#### In `SAFEXAssessmentManager.cs`:
```csharp
List<string> actions = new List<string> {
    "REACH_GAS_DETECTOR",
    "RAISE_ALARM",
    "SELECT_CORRECT_GAS_PPE",
    "BUDDY_CONFIRMED",
    "ISOLATE_CONTAMINATED_AREA",
    "EVACUATE_SAFE_EXIT"
};

SAFEXCloudSyncManager.Instance.SendAssessment(
    currentSessionId,
    "GAS",
    actions,
    score: 100f,
    passed: true,
    durationSeconds: sessionDuration
);
```

#### In `CertificateManager.cs`:
```csharp
string certId = SAFEXCloudSyncManager.Instance.GenerateCertificateId();

SAFEXCloudSyncManager.Instance.SendCertificate(
    certId,
    currentSessionId,
    currentTraineeId,
    "GAS",
    score: 100f,
    percentage: 100f,
    status: "PASSED"
);
```

---

## 8. Production Deployment Guide

### Deploying to Render / Railway / Heroku
1. Push this repository to GitHub/GitLab.
2. In your hosting platform:
   - **Build Command:** `npm run build && npx prisma migrate deploy`
   - **Start Command:** `npm start`
   - **Environment Variables:**
     - `DATABASE_URL`: Your production PostgreSQL URL
     - `PORT`: Automatically set by host or `5000`
     - `ADMIN_API_KEY`: Strong generated secret key
     - `CORS_ORIGIN`: Your admin dashboard domain or `*`
