# SAFEX AR Safety Command Center — Frontend Dashboard

Industrial safety training command center dashboard built with HTML5, Vanilla CSS, and modern JavaScript.

---

## 🚀 Separate Frontend Deployment Guide

You can deploy this frontend independently to **Vercel**, **Netlify**, or **Cloudflare Pages**.

### 1. Deploying to Vercel (Recommended)
1. Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
2. Select repository: `https://github.com/paras999000/SAFEX-ARNX.git`.
3. In **Project Settings**:
   - **Root Directory:** Set to `frontend`
   - **Framework Preset:** `Other` (or Vite)
   - **Build Command:** Leave default / empty
   - **Output Directory:** Leave default (`.`)
4. Click **Deploy**!

### 2. Deploying to Netlify
1. Go to [netlify.com](https://netlify.com) and click **"Add new site" > "Import an existing project"**.
2. Select your GitHub repository.
3. In **Build Settings**:
   - **Base directory:** `frontend`
   - **Publish directory:** `frontend`
4. Click **Deploy site**!

---

## 🔗 Connecting Frontend to your Deployed Backend

Once your backend is deployed (e.g. to Render at `https://safex-api.onrender.com`):

1. **Option A (In Dashboard Settings):**
   - Open your deployed frontend website.
   - Click **Settings** in the sidebar.
   - Enter your deployed backend URL in the **Backend API Endpoint** box (e.g. `https://your-backend.onrender.com`).
   - Click **Save & Connect**. The dashboard will instantly synchronize and save the preference in your browser.

2. **Option B (URL Parameter):**
   - Simply append `?api=https://your-backend.onrender.com` to your frontend URL:
     `https://your-frontend.vercel.app/?api=https://your-backend.onrender.com`
   - It will automatically save and remember your backend URL.
