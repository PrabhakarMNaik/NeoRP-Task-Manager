#!/bin/bash

# NeoRP Enhanced Startup Script
# Version 2.0.0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${GREEN}[NeoRP]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_info() { echo -e "${BLUE}[INFO]${NC} $1"; }

# Configuration
BACKEND_PORT=3001
FRONTEND_PORT=3000
DB_PORT=5432

check_port() {
    local port=$1
    if command -v lsof >/dev/null 2>&1; then
        lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1
    elif command -v netstat >/dev/null 2>&1; then
        netstat -tuln | grep ":$port " >/dev/null 2>&1
    else
        return 1
    fi
}

kill_port() {
    local port=$1
    if command -v lsof >/dev/null 2>&1; then
        local pids=$(lsof -ti:$port)
        if [ ! -z "$pids" ]; then
            kill -9 $pids 2>/dev/null
            sleep 2
        fi
    fi
}

start_postgres() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if command -v systemctl >/dev/null 2>&1; then
            sudo systemctl start postgresql
        else
            sudo service postgresql start
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew services start postgresql 2>/dev/null
    fi
}

# Clean up any existing processes
print_info "Cleaning up existing processes..."
kill_port $BACKEND_PORT
kill_port $FRONTEND_PORT

# Start PostgreSQL
print_info "Starting PostgreSQL..."
start_postgres

# Start backend
print_info "Starting backend server..."
cd backend
npm run dev > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait for backend
sleep 5
if check_port $BACKEND_PORT; then
    print_status "Backend started on port $BACKEND_PORT"
else
    print_error "Backend failed to start"
    exit 1
fi

# Start frontend
print_info "Starting frontend server..."
cd frontend
npm start > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Wait for frontend
sleep 10
if check_port $FRONTEND_PORT; then
    print_status "Frontend started on port $FRONTEND_PORT"
else
    print_error "Frontend failed to start"
    exit 1
fi

print_status "NeoRP Enhanced v2.0.0 is ready!"
print_info "Frontend: http://localhost:$FRONTEND_PORT"
print_info "Backend:  http://localhost:$BACKEND_PORT"
print_info "Press Ctrl+C to stop all services"

# Cleanup function
cleanup() {
    print_info "Stopping NeoRP services..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    kill_port $BACKEND_PORT
    kill_port $FRONTEND_PORT
    print_status "NeoRP stopped"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Keep running
while true; do
    sleep 10
    if ! kill -0 $BACKEND_PID 2>/dev/null || ! kill -0 $FRONTEND_PID 2>/dev/null; then
        print_error "One or more services died unexpectedly"
        cleanup
        exit 1
    fi
done
