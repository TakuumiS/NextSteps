#!/bin/bash

# Function to kill child processes on exit
cleanup() {
    echo "Stopping servers..."
    kill $(jobs -p)
}

trap cleanup EXIT

echo "Starting Backend..."
source backend/venv/bin/activate
export PYTHONPATH=$PYTHONPATH:$(pwd)
uvicorn backend.main:app --reload &
BACKEND_PID=$!

echo "Starting Frontend..."
cd frontend
npm run dev &
FRONTEND_PID=$!

echo "NextSteps is running!"
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:5173"

wait
