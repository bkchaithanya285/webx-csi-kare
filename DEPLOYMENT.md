# WEBX 2026 — Deployment Guide
## Full-Stack Architecture: Frontend on Vercel & Backend on Render

This guide walks you through deploying the **Frontend to Vercel** and the **Backend to Render**.

---

### Architecture Overview

| Layer | Technology | Hosting Platform | URL Configuration |
| :--- | :--- | :--- | :--- |
| **Frontend** | Next.js 16 (React 19, Tailwind) | **Vercel** | `https://your-webx-app.vercel.app` |
| **Backend** | Express.js (Node.js, CORS, Cloudinary) | **Render** | `https://your-webx-backend.onrender.com` |
| **Database** | Firebase Firestore | **Firebase Cloud** | Configured via environment variables |
| **Media** | Cloudinary API | **Cloudinary CDN** | Configured via environment variables |

---

## Part 1: Deploy Backend to Render

### Option A: Using `render.yaml` Blueprint (Recommended)
1. Push your repository to **GitHub** or **GitLab**.
2. Go to your [Render Dashboard](https://dashboard.render.com/).
3. Click **New +** $\rightarrow$ **Blueprint**.
4. Select your `WebX` repository. Render will automatically read the root `render.yaml` file and configure the service:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/health`
5. Fill in your environment variables:
   - `CLOUDINARY_CLOUD_NAME`: `<your_cloudinary_cloud_name>`
   - `CLOUDINARY_API_KEY`: `<your_cloudinary_api_key>`
   - `CLOUDINARY_API_SECRET`: `<your_cloudinary_api_secret>`
   - `FRONTEND_URL`: `https://<your-app>.vercel.app`
6. Click **Apply**. Once deployed, copy your Render service URL (e.g. `https://webx-backend.onrender.com`).

---

### Option B: Manual Web Service Creation
1. Go to [Render Dashboard](https://dashboard.render.com/) $\rightarrow$ Click **New +** $\rightarrow$ **Web Service**.
2. Connect your Git repository.
3. Configure the settings:
   - **Name**: `webx-backend`
   - **Region**: Nearest to your users
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
4. Under **Advanced** $\rightarrow$ **Health Check Path**, enter: `/health`
5. Under **Environment Variables**, add:
   ```env
   NODE_ENV=production
   PORT=10000
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   FRONTEND_URL=https://your-app.vercel.app
   ```
6. Click **Create Web Service**.
7. Once live, test `https://<your-render-app>.onrender.com/health` in your browser. It should return:
   ```json
   { "status": "healthy", "uptime": ... }
   ```

---

## Part 2: Deploy Frontend to Vercel

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New...** $\rightarrow$ **Project**.
3. Import your Git repository.
4. Vercel will automatically detect:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: `./` (leave default)
   - **Build Command**: `next build`
   - **Output Directory**: `.next`
5. Open the **Environment Variables** section and add the following:

| Variable Key | Value Description |
| :--- | :--- |
| `NEXT_PUBLIC_BACKEND_URL` | `https://<your-render-app>.onrender.com` |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Your Firebase Web API Key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Your Firebase Auth Domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Your Firebase Project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`| Your Firebase Storage Bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`| Your Firebase Messaging Sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Your Firebase App ID |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | Your Firebase Measurement ID (optional) |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Your Cloudinary Cloud Name |
| `NEXT_PUBLIC_CLOUDINARY_API_KEY` | Your Cloudinary API Key |
| `CLOUDINARY_API_SECRET` | Your Cloudinary API Secret |
| `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | `ml_default` |

6. Click **Deploy**. Vercel will build and launch your production application.

---

## Part 3: Verification & Health Checklist

After both deployments are complete:
- [ ] Visit `https://<your-backend>.onrender.com/health` $\rightarrow$ returns `{ "status": "healthy" }`.
- [ ] Open the Vercel frontend URL on desktop and mobile.
- [ ] Ensure the Spider-Man cinematic intro video and CSI logo animation play smoothly.
- [ ] Submit a test registration on `/register` $\rightarrow$ verify data persists across browser refreshes.
- [ ] Test the payment proof screenshot upload on `/payment` $\rightarrow$ verifies connection to Cloudinary via the Render backend.
- [ ] Log in to the Admin Console at `/admin` (Passcode: `csi@221`).
- [ ] Click **Download Passes (.ZIP)** to verify batch ZIP export of all team passes.
