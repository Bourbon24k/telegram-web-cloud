# Deployment Guide for Vercel

Yes, it is possible to deploy this project to Vercel. However, since Vercel is primarily serverless, there are some limitations and recommended configurations.

## Limitations

1.  **Database**: The current project uses SQLite (`cloud.db`), which is a file-based database. 
    *   **Problem**: On Vercel, the file system is ephemeral (read-only/reset on redeploy), so you will lose all data and users instantly.
    *   **Solution**: You MUST use an external database like **Vercel Postgres**, **Supabase**, or **Neon**.
    *   **Config**: The app is already updated to read `DATABASE_URL` from environment variables.

2.  **Telegram Bot Polling**:
    *   **Problem**: Vercel "Serverless Functions" have execution time limits (max 10-60s) and do not run continuously. The bot polling loop (`start_bot`) will fail or timeout.
    *   **Solution**: The code has been updated to **disable polling** when running on Vercel. You must set up a **Webhook** for the bot or run the bot worker on a separate VPS (like a $5 DigitalOcean droplet or Railway.app). The backend on Vercel can still handle the API and file logic.

## Recommended Strategy: Split Deployment

The best way to deploy a monorepo (Frontend + Backend) on Vercel is to create **two separate projects** connected by environment variables.

### Part 1: Backend Deployment

1.  Go to Vercel Dashboard -> **Add New Project**.
2.  Import this repository.
3.  **Project Name**: e.g., `tg-cloud-backend`
4.  **Root Directory**: Click "Edit" and select `backend`.
5.  **Environment Variables**:
    *   `DATABASE_URL`: `postgres://user:pass@host/db` (Your external DB connection string)
    *   `BOT_TOKEN`: Your Telegram Bot Token
    *   `CHANNEL_ID`: Your Channel ID
    *   `ENCRYPTION_KEY`: Your key
    *   `VERCEL`: `1` (This is usually set automatically, but good to be sure)
6.  **Deploy**.
7.  Copy the assigned domain (e.g., `https://tg-cloud-backend.vercel.app`).

### Part 2: Frontend Deployment

1.  Go to Vercel Dashboard -> **Add New Project**.
2.  Import the same repository.
3.  **Project Name**: e.g., `tg-cloud-frontend`
4.  **Root Directory**: Click "Edit" and select `frontend`.
5.  **Framework Preset**: Select **Vite** (should be auto-detected).
6.  **Environment Variables**:
    *   `VITE_API_URL`: Paste the Backend URL from Part 1 (e.g., `https://tg-cloud-backend.vercel.app`) - **IMPORTANT**: Do not add a trailing slash.
7.  **Deploy**.

## Alternative: Single Deployment (Advanced)

If you insist on a single deployment, you must use Vercel's legacy build configuration or `vercel.json` rewrites, but this is prone to errors with Vite+Python combinations. The split deployment is officially recommended.
