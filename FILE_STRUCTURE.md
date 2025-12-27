# File Structure and Documentation

This document explains the purpose of each file and directory in the NextSteps project.

## Root Directory

- **`README.md`**: The main entry point for the project documentation, including setup and running instructions.
- **`start.sh`**: A helper script to start both the Backend (FastAPI) and Frontend (Vite) servers simultaneously.
- **`.env`**: (Git-ignored) Contains secret environment variables (DB credentials, API keys).
- **`.env.example`**: A template for `.env` with placeholder values for safe distribution.
- **`gemini_key.json`**: JSON key file for Google Cloud service account authentication (specifically for Gmail API).
- **`credentials.json`**: Client secret file for Google OAuth flow.

## Backend (`backend/`)

Built with Python and FastAPI.

### Core Files
- **`main.py`**: The entry point for the FastAPI application. Configures CORS, middleware, and includes routers.
- **`database.py`**: Configures the PostgreSQL database connection using SQLAlchemy.
- **`models.py`**: Defines SQLAlchemy ORM models (`User`, `JobApplication`) and Pydantic enums (`JobStatus`).
- **`auth.py`**: Handles Google OAuth authentication flow (login, callback, cleaning user data).
- **`requirements.txt`**: Lists all Python dependencies.

### Services
- **`gmail_service.py`**: Contains functions to interact with the Gmail API (authenticate, search emails, get message content).
- **`llm_service.py`**: Wraps the Google Gemini API to parse email content and extract structured data (Company, Status, Job Title).

### Routers (`backend/routers/`)
- **`analytics.py`**: Endpoints for dashboard stats (`/analytics/stats`) and CSV export (`/analytics/export`).
- **`jobs.py`**: CRUD endpoints for `JobApplication` (create, read, update, delete).
- **`scan.py`**: Endpoint (`/scan/`) that triggers the Gmail scan + Gemini processing pipeline.
- **`users.py`**: User profile management endpoints.

### Tests (`backend/tests/`)
- **`test_main.py`**: Contains `pytest` unit tests for the backend (e.g., health check).

## Frontend (`frontend/`)

Built with React, TypeScript, and Vite.

### Configuration
- **`vite.config.ts`**: Configuration for the Vite build tool and test runner.
- **`package.json`**: Lists Node.js dependencies and scripts.
- **`eslint.config.js`**: Linting rules.

### Source Code (`frontend/src/`)
- **`main.tsx`**: The entry point that mounts the React app and wraps it in Providers (Toast, etc.).
- **`App.tsx`**: The main layout component. Handles authentication state and routing (Login vs Dashboard).
- **`setupTests.ts`**: Configures the testing environment (imports `jest-dom`).

### Components (`frontend/src/components/`)
- **`AnalyticsView.tsx`**: Displays the stats dashboard (charts, counters) and the "Export CSV" button.
- **`Board.tsx`**: The core Kanban board component. Handles drag-and-drop logic using `@dnd-kit`.
- **`Header.tsx`**: Navigation bar with User menu and "Scan Emails" button.
- **`JobModal.tsx`**: specialized modal for adding/editing job details manually.
- **`Login.tsx`**: Simple login page with "Sign in with Google" button.

### API (`frontend/src/api/`)
- **`index.ts`**: Centralized Axios instance and typed functions for all backend API calls.

### Contexts (`frontend/src/contexts/`)
- **`ToastContext.tsx`**: Provides a global toast notification system (`useToast`).
