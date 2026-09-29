# SAFEX AR Safety Command Center

Full-stack Industrial Safety Training Command Center connected in real-time to the SAFEX Unity Android AR Simulation.

---

## 🏛️ System Architecture

```text
Unity Android APK (AR Mining & Hazardous Training)
       ↓ (UnityWebRequest / HTTP REST)
Node.js + Express + TypeScript Backend (/backend)
       ↓ (Prisma ORM)
PostgreSQL Database (Source of Truth)
       ↓ (REST APIs & Auto-polling)
SAFEX Admin Command Center Dashboard (/frontend)
```

- **Independent Frontend & Backend Deployments:** Designed to deploy the frontend (e.g. on Vercel / Netlify) and backend (e.g. on Render / Railway) completely separately.
- **Multilingual Support:** Localized AR telemetry and dashboard support for **English (`en`)**, **Hindi (`hi`)**, and **Santali (`sat`)**.
- **Offline-First Resilience:** Unity training continues without interruption when internet is unavailable. Requests are queued locally in `Application.persistentDataPath/SAFEXSyncQueue.json` and automatically flushed when internet returns.

---

## 📂 Repository Organization

```text
├── frontend/                  # Standalone Web Dashboard (Deploy to Vercel / Netlify)
│   ├── index.html             # Command center interface
│   ├── styles.css             # Dark industrial command center CSS
│   ├── src/main.js            # Live REST API client & 6s polling engine
│   ├── public/                # Static brand assets
│   ├── package.json           # Frontend scripts for Vercel/Netlify
│   ├── vercel.json            # 1-Click Vercel SPA routing
│   ├── netlify.toml           # 1-Click Netlify routing
│   └── README.md              # Frontend deployment guide
│
├── backend/                   # REST API & Database Service (Deploy to Render / Railway)
│   ├── prisma/
│   │   ├── schema.prisma      # PostgreSQL models (Trainee, Session, Event, Assessment, Cert)
│   │   └── seed.ts            # Realistic demo data seed
│   ├── src/                   # Express & TypeScript controllers, routes, and services
│   ├── docker-compose.yml     # 1-Click PostgreSQL container
│   ├── package.json           # Server dependencies & scripts
│   ├── tsconfig.json          # TypeScript compiler config
│   ├── Procfile               # Production web process
│   ├── .env.example           # Environment template
│   └── README.md              # Backend deployment & API guide
│
├── unity/                     # Unity Android AR Integration
│   ├── SAFEXCloudSyncManager.cs # Reusable C# sync manager with offline queue
│   └── README.md              # Unity scene & controller setup instructions
│
└── README.md                  # Project overview & deployment guide
```

---

## 🚀 Separate Deployment Instructions

### 1. Deploy the Backend (e.g., on Render or Railway)
1. In [Render](https://render.com) or [Railway](https://railway.app), create a new **Web Service** from this GitHub repository.
2. Configure settings:
   - **Root Directory:** `backend`
   - **Build Command:** `npm run build && npx prisma migrate deploy`
   - **Start Command:** `npm start`
   - **Environment Variables:**
     - `DATABASE_URL`: Your PostgreSQL connection string (Render provides a free managed PostgreSQL database)
     - `PORT`: `5000` (or leave default assigned by host)
     - `ADMIN_API_KEY`: `SAFEX-AR-SAFETY-KEY-2026`
     - `CORS_ORIGIN`: `*` (or your frontend domain)
3. Copy your deployed backend URL (e.g. `https://safex-api.onrender.com`).

---

### 2. Deploy the Frontend (e.g., on Vercel or Netlify)
1. In [Vercel](https://vercel.com) or [Netlify](https://netlify.com), import this GitHub repository.
2. In Project Settings:
   - **Root Directory:** `frontend`
   - **Framework Preset:** `Other` (or static)
   - **Build Command:** (leave empty)
   - **Output Directory:** `.`
3. Click **Deploy**!
4. Once deployed, link your frontend to your backend:
   - Open your deployed dashboard.
   - Go to **Settings** in the sidebar.
   - Enter your deployed backend URL (e.g. `https://safex-api.onrender.com`) and click **Save & Connect**.
   - *Alternatively, simply append `?api=https://safex-api.onrender.com` to your frontend URL.*

---

### 3. Configure the Unity Android App
1. Place `unity/SAFEXCloudSyncManager.cs` into your Unity project's `Assets/Scripts/Backend/`.
2. Attach `SAFEXCloudSyncManager` to an empty GameObject.
3. In the Inspector, set `apiBaseUrl` to your deployed backend URL: `https://safex-api.onrender.com/api`.
4. Build the Android APK. Training telemetry, event logs, assessments, and certificates will now automatically synchronize to your cloud command center!

---

## 💻 Local Development

### Running the Backend Locally
```bash
cd backend
npm install
docker compose up -d              # Optional: Start local PostgreSQL container
npx prisma generate
npx prisma migrate dev --name init
npm run seed                      # Populate demo records
npm run dev                       # Runs on http://localhost:5000
```

### Running the Frontend Locally
```bash
cd frontend
npm run dev                       # Or open index.html directly
```
*Note: The backend also serves the frontend directly at `http://localhost:5000` when running locally.*
