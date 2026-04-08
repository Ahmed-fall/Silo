#!/bin/bash
# ============================================
# Start Silo Project - Docker Mode
# ============================================
# This script runs all services using Docker
# Perfect for: Production-like setup, clean environment
#
# Requirements:
#   - Docker Desktop installed & running
#   - Docker Compose v2+
#   - Ollama running on WSL host (accessible via host.docker.internal)
# ============================================

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "🌾 Starting Silo Project - Docker Mode"
echo "======================================"
echo ""

# Check if Docker is running
echo "🔍 Checking Docker..."
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is NOT running!"
    echo ""
    echo "   Please start Docker Desktop and ensure:"
    echo "   1. Docker Desktop is running"
    echo "   2. WSL 2 integration is enabled in Settings → Resources → WSL Integration"
    echo "   3. Your WSL distro is enabled for Docker"
    echo ""
    echo "   Then try again."
    exit 1
fi

echo "✅ Docker is running"

# Check if .env exists
echo ""
echo "🔍 Checking .env file..."
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    echo "⚠️  .env file not found!"
    echo "   Creating from .env.example..."
    cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
    echo "   ✅ Created .env - please edit it with your settings if needed"
    echo ""
fi

# Load .env to check Ollama config
if [ -f "$PROJECT_ROOT/.env" ]; then
    source <(grep -E '^(OLLAMA_URL|OLLAMA_MODEL)=' "$PROJECT_ROOT/.env" | sed 's/^/export /')
    echo "📦 Ollama URL: $OLLAMA_URL"
    echo "🤖 Ollama Model: $OLLAMA_MODEL"
fi

echo ""
echo "================================================"
echo "🚀 Building and starting Docker services..."
echo ""

# Build and start all services
cd "$PROJECT_ROOT"
docker compose down 2>/dev/null || true
docker compose up --build -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 10

# Health checks
echo ""
echo "🔍 Running health checks..."

# Check Backend
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ Backend API: http://localhost:8000"
else
    echo "⚠️  Backend API: Still starting... (check logs: docker compose logs backend)"
fi

# Check Frontend
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend: http://localhost:3000"
else
    echo "⚠️  Frontend: Still starting... (check logs: docker compose logs frontend)"
fi

# Check Database
if docker compose exec db pg_isready -U silo_user > /dev/null 2>&1; then
    echo "✅ Database: Ready"
else
    echo "⚠️  Database: Still initializing..."
fi

echo ""
echo "================================================"
echo "✅ All services started!"
echo "================================================"
echo ""
echo "📌 Service URLs:"
echo "   Frontend:  http://localhost:3000"
echo "   Backend:   http://localhost:8000"
echo "   API Docs:  http://localhost:8000/docs"
echo "   AI Vision: http://localhost:8001"
echo ""
echo "📊 Useful commands:"
echo "   View logs:         docker compose logs -f"
echo "   View backend logs: docker compose logs -f backend"
echo "   Stop services:     docker compose down"
echo "   Restart backend:   docker compose restart backend"
echo ""
echo "🛑 To stop all services:"
echo "   docker compose down"
echo ""
