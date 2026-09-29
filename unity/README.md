# SAFEX AR Safety — Unity Android Integration

This folder contains the complete Unity C# synchronization script connecting the Unity Android AR Simulation to the SAFEX Command Center Backend.

---

## 📁 File: `SAFEXCloudSyncManager.cs`

Drop this file into your Unity Project:
`Assets/Scripts/Backend/SAFEXCloudSyncManager.cs`

---

## ⚡ Features:
- **Offline-First Resilient Sync:** All failed requests automatically persist to `Application.persistentDataPath/SAFEXSyncQueue.json` and resync once internet connection is restored.
- **Multilingual Support:** Handles English (`en`), Hindi (`hi`), and Santali (`sat`).
- **Standardized Certificate ID:** Produces `SAFEX-yyyyMMdd-######` for QR code verification.
- **Zero Training Interruption:** Asynchronous non-blocking web requests.

---

## ⚙️ Inspector Configuration

Attach `SAFEXCloudSyncManager` to an empty GameObject named `SAFEXCloudSync`:

1. **Api Base Url:**
   - Android Emulator: `http://10.0.2.2:5000/api`
   - Android Physical Device (Local Wi-Fi): `http://<YOUR-PC-IP>:5000/api`
   - Production Deployed Backend: `https://your-backend.onrender.com/api`
2. **Api Key:** `SAFEX-AR-SAFETY-KEY-2026`
3. **Current Language:** `sat` (Santali), `hi` (Hindi), `en` (English)
