# NextSteps - Job Application Tracker

NextSteps is a full-stack application for tracking job applications using a Kanban-style board. It integrates with Gmail to parse application statuses using Gemini AI.

## Features

- **Kanban Board**: Drag-and-drop interface to manage job applications.
- **Email Scanning**: Automatically scans Gmail for job application updates.
- **AI Powered**: Uses Google Gemini to extract company names and statuses from emails.
- **Analytics**: Visualization of application progress.

## Project Structure

For a detailed explanation of every file in the codebase, see [FILE_STRUCTURE.md](FILE_STRUCTURE.md).

## Prerequisites

- [Python 3.10+](https://www.python.org/)
- [Node.js 18+](https://nodejs.org/)
- [PostgreSQL](https://www.postgresql.org/)

## Setup

### 1. Clone the repository

```bash
git clone <repository-url>
cd NextSteps
```

### 2. Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create a `.env` file in the root directory (based on `.env.example`):
```bash
cp ../.env.example ../.env
```
Update `../.env` with your PostgreSQL credentials and API keys.

### 3. Frontend Setup

```bash
cd ../frontend
npm install
```

## Running the Application

You can use the provided helper script to start both servers:

```bash
# From the root directory
chmod +x start.sh
./start.sh
```

Or run them manually:

**Backend:**
```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload
```

**Frontend:**
```bash
cd frontend
npm run dev
```

The frontend will be available at http://localhost:5173 and the backend API at http://localhost:8000.
