#!/bin/bash
# ============================================
# Start Silo Project - Local Development Mode
# ============================================
# This script runs all services locally WITHOUT Docker
# Perfect for: Fast iteration, debugging, presentations
#
# Requirements:
#   - PostgreSQL running on port 5432
#   - Ollama running on port 11434
#   - Conda environment named "silo" with all dependencies
#   - Node.js 18+
# ============================================

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Starting Silo Project - Local Development Mode"
echo "================================================"
echo ""

# Check if Ollama is running
echo "Checking Ollama..."
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "OK: Ollama is running"
    OLLAMA_MODELS=$(curl -s http://localhost:11434/api/tags | python3 -c "import sys, json; data = json.load(sys.stdin); print('\n'.join([m['name'] for m in data.get('models', [])]))" 2>/dev/null || echo "")
    if [ -n "$OLLAMA_MODELS" ]; then
        echo "Available models:"
        echo "$OLLAMA_MODELS" | sed 's/^/   - /'
    fi
else
    echo "ERROR: Ollama is NOT running!"
    echo "   Start it with: ollama serve"
    echo "   Or download from: https://ollama.ai"
    exit 1
fi

# Check if PostgreSQL is running
echo ""
echo "Checking PostgreSQL..."
if pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo "OK: PostgreSQL is running"
else
    echo "WARNING: PostgreSQL is NOT running on localhost:5432"
    echo "   Start it or use Docker for just the database:"
    echo "   docker compose up db"
fi

# Check Conda environment
echo ""
echo "Checking Conda environment 'silo'..."
if ! conda env list | grep -q "^silo "; then
    echo "ERROR: Conda environment 'silo' not found!"
    echo "   Create it with your requirements.txt"
    exit 1
fi

echo "OK: Conda environment 'silo' exists"

# Check if .env exists
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    echo ""
    echo "WARNING: .env file not found!"
    echo "   Creating from .env.example..."
    cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
    echo "   Please edit .env with your settings"
    exit 1
fi

echo ""
echo "All checks passed!"
echo ""
echo "================================================"
echo "Starting services..."
echo ""
echo "INSTRUCTIONS:"
echo "   1. Backend API will start on http://localhost:8000"
echo "   2. Frontend will start on http://localhost:3000"
echo "   3. Press Ctrl+C in each terminal to stop"
echo ""
echo "================================================"
echo ""

# Activate conda environment
echo "Activating conda environment 'silo'..."
eval "$(conda shell.bash hook)"
conda activate silo

# Start Backend
echo "Starting Backend (Terminal 1)..."
echo "   Command: cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
echo ""

# Start Frontend  
echo "Starting Frontend (Terminal 2)..."
echo "   Command: cd frontend && npm run dev"
echo ""

# Ask user if they want to start automatically
read -p "Do you want to start both services now? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Start backend in background
    cd "$PROJECT_ROOT/backend"
    echo ""
    echo "Starting Backend on http://localhost:8000 ..."
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
    BACKEND_PID=$!
    
    # Wait for backend to start
    sleep 3
    
    # Check if backend is running
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        echo "OK: Backend is running!"
    else
        echo "WARNING: Backend may still be starting..."
    fi
    
    # Start frontend
    cd "$PROJECT_ROOT/frontend"
    echo "Starting Frontend on http://localhost:3000 ..."
    npm run dev &
    FRONTEND_PID=$!
    
    echo ""
    echo "================================================"
    echo "All services started!"
    echo "================================================"
    echo ""
    echo "Service URLs:"
    echo "   Frontend:  http://localhost:3000"
    echo "   Backend:   http://localhost:8000"
    echo "   API Docs:  http://localhost:8000/docs"
    echo "   Ollama:    http://localhost:11434"
    echo ""
    echo "To stop all services:"
    echo "   kill $BACKEND_PID $FRONTEND_PID"
    echo "   Or press Ctrl+C"
    echo ""
    
    # Wait for user to press Ctrl+C
    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo ''; echo 'Services stopped'; exit" INT
    wait
fi
