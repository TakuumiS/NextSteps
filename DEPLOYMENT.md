# Deployment Guide (Render.com)

This guide explains how to deploy NextSteps to [Render](https://render.com), a cloud platform that supports Python, Node.js, and PostgreSQL.

## Prerequisites

1. A GitHub repository with this code pushed to it.
2. A [Render.com](https://render.com) account.

## Automated Deployment (Blueprint)

We have included a `render.yaml` file that defines the entire infrastructure.

1. Go to the [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** and select **Blueprint**.
3. Connect your GitHub repository.
4. Render will detect the `render.yaml` file.
5. You will be prompted to enter values for the following environment variables (which are set to `sync: false` in the YAML):
    - `GOOGLE_CLIENT_ID`: From Google Cloud Console.
    - `GOOGLE_CLIENT_SECRET`: From Google Cloud Console.
    - `GOOGLE_REDIRECT_URI`: Set to `https://<YOUR-BACKEND-URL>/auth/callback`.
        - *Note*: You won't know the backend URL until after the first deploy fails or you create a placeholder service.
        - **Workaround**: Deploy once. It will fail. Get the URL of the backend service. Update `GOOGLE_REDIRECT_URI` in the Render Dashboard Env Vars. Update your Google Cloud Console Authorized Redirect URIs to match. Redeploy.
    - `GEMINI_API_KEY`: From Google AI Studio.

6. Click **Apply**.
7. Render will create:
    - A PostgreSQL database.
    - A Python backend service.
    - A Node.js frontend service.

## Manual Configuration (If not using Blueprint)

### Database
1. Create a **PostgreSQL** database on Render.
2. Copy the `Internal Connection String`.

### Backend
1. Create a **Web Service**.
2. **Runtime**: Python 3.
3. **Build Command**: `pip install -r requirements.txt`
4. **Start Command**: `gunicorn -c backend/gunicorn_conf.py backend.main:app`
5. **Environment Variables**:
    - `DATABASE_URL`: (Paste connection string)
    - `GEMINI_API_KEY`: ...
    - `GOOGLE_CLIENT_ID`: ...
    - `GOOGLE_CLIENT_SECRET`: ...
    - `GOOGLE_REDIRECT_URI`: `https://<YOUR-APP-NAME>.onrender.com/auth/callback`

### Frontend
1. Create a **Static Site** (for pure static) or **Web Service** (if using `vite preview`).
    - *Recommended for simplicity here*: **Web Service** (Node) serves the build artifacts easily.
2. **Runtime**: Node.
3. **Build Command**: `cd frontend && npm install && npm run build`
4. **Start Command**: `cd frontend && npm run preview -- --host 0.0.0.0 --port $PORT`
5. **Rewrites/Redirects**:
    - If using Static Site: Rewrite `/*` to `/index.html`.

## Important Notes

- **CORS**: You may need to update `backend/main.py` to allow the specific frontend domain once deployed. Currently it allows `http://localhost:5173`.
- **Google OAuth**: You MUST add the deployed domain to your "Authorized Javascript Origins" and "Authorized Redirect URIs" in the Google Cloud Console.
