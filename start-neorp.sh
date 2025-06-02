#!/bin/bash

# NeoRP Project Planning System Startup Script
# This script starts all components of the NeoRP system

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
BACKEND_PORT=3001
FRONTEND_PORT=3000
DB_PORT=5432
APP_MONITOR=false

# Function to print colored output
print_status() {
    echo -e "${GREEN}[NeoRP]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Function to check if port is in use
check_port() {
    local port=$1
    if command -v lsof >/dev/null 2>&1; then
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            return 0
        else
            return 1
        fi
    elif command -v netstat >/dev/null 2>&1; then
        if netstat -tuln | grep ":$port " >/dev/null 2>&1; then
            return 0
        else
            return 1
        fi
    else
        return 1
    fi
}

# Function to kill process on port
kill_port() {
    local port=$1
    if command -v lsof >/dev/null 2>&1; then
        local pids=$(lsof -ti:$port)
        if [ ! -z "$pids" ]; then
            print_info "Killing processes on port $port: $pids"
            kill -9 $pids 2>/dev/null
            sleep 2
        fi
    elif command -v fuser >/dev/null 2>&1; then
        fuser -k $port/tcp 2>/dev/null
        sleep 2
    fi
}

# Function to check if PostgreSQL is running
check_postgres() {
    if command -v pg_isready >/dev/null 2>&1; then
        if pg_isready -p $DB_PORT >/dev/null 2>&1; then
            return 0
        fi
    fi
    
    # Alternative check using netstat or lsof
    if check_port $DB_PORT; then
        return 0
    fi
    
    return 1
}

# Function to start PostgreSQL
start_postgres() {
    print_info "Starting PostgreSQL..."
    
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if command -v systemctl >/dev/null 2>&1; then
            sudo systemctl start postgresql
        else
            sudo service postgresql start
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        if command -v brew >/dev/null 2>&1; then
            brew services start postgresql
        else
            pg_ctl -D /usr/local/var/postgres start
        fi
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
        net start postgresql-x64-12
    fi
    
    # Wait for PostgreSQL to start
    local attempts=0
    while [ $attempts -lt 15 ]; do
        if check_postgres; then
            print_status "PostgreSQL is running"
            return 0
        fi
        print_info "Waiting for PostgreSQL to start... (attempt $((attempts + 1))/15)"
        sleep 2
        attempts=$((attempts + 1))
    done
    
    print_error "Failed to start PostgreSQL"
    return 1
}

# Function to check if Node.js is installed
check_node() {
    if ! command -v node >/dev/null 2>&1; then
        print_error "Node.js is not installed. Please install Node.js v16 or higher."
        exit 1
    fi
    
    local node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ $node_version -lt 16 ]; then
        print_error "Node.js version 16 or higher is required. Current version: $(node -v)"
        exit 1
    fi
    
    print_status "Node.js $(node -v) detected"
}

# Function to check if npm is installed
check_npm() {
    if ! command -v npm >/dev/null 2>&1; then
        print_error "npm is not installed. Please install npm."
        exit 1
    fi
    print_status "npm $(npm -v) detected"
}

# Function to install dependencies
install_dependencies() {
    print_info "Checking dependencies..."
    
    # Backend dependencies
    if [ ! -d "backend/node_modules" ]; then
        print_info "Installing backend dependencies..."
        cd backend
        npm install
        if [ $? -ne 0 ]; then
            print_error "Failed to install backend dependencies"
            exit 1
        fi
        cd ..
    fi
    
    # Frontend dependencies
    if [ ! -d "frontend/node_modules" ]; then
        print_info "Installing frontend dependencies..."
        cd frontend
        npm install
        if [ $? -ne 0 ]; then
            print_error "Failed to install frontend dependencies"
            exit 1
        fi
        cd ..
    fi
    
    print_status "Dependencies are ready"
}

# Function to check environment file
check_env() {
    if [ ! -f "backend/.env" ]; then
        print_warning ".env file not found. Creating from template..."
        if [ -f "backend/.env.example" ]; then
            cp backend/.env.example backend/.env
            print_info "Please edit backend/.env with your database credentials"
            print_info "Press Enter to continue or Ctrl+C to exit and configure .env first"
            read
        else
            print_warning "No .env.example found. Creating basic .env file..."
            cat > backend/.env << EOF
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=neorp_db
DB_USER=neorp_user
DB_PASSWORD=Sw@mi2127

# Server Configuration
PORT=3001
NODE_ENV=development

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
EOF
            print_info "Basic .env file created. You may need to adjust database credentials."
        fi
    fi
}

# Function to run database migration
run_migration() {
    print_info "Running database migration..."
    cd backend
    if npm run db:migrate >/dev/null 2>&1; then
        print_status "Database migration completed"
    else
        print_warning "Database migration failed. This might be normal if tables already exist."
        print_info "If this is a fresh install, check your database credentials in .env"
    fi
    cd ..
}

# Function to cleanup on exit
cleanup() {
    print_info "Shutting down NeoRP system..."
    
    # Kill backend
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
    fi
    
    # Kill frontend
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
    fi
    
    # Kill app monitor
    if [ ! -z "$MONITOR_PID" ]; then
        kill $MONITOR_PID 2>/dev/null
    fi
    
    # Kill any remaining processes on our ports
    kill_port $BACKEND_PORT
    kill_port $FRONTEND_PORT
    
    print_status "NeoRP system stopped"
    exit 0
}

# Function to show system status
show_status() {
    echo ""
    print_status "NeoRP System Status"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Check PostgreSQL
    if check_postgres; then
        echo -e "Database:     ${GREEN}✓${NC} PostgreSQL running on port $DB_PORT"
    else
        echo -e "Database:     ${RED}✗${NC} PostgreSQL not running"
    fi
    
    # Check Backend
    if check_port $BACKEND_PORT; then
        echo -e "Backend:      ${GREEN}✓${NC} Running on http://localhost:$BACKEND_PORT"
    else
        echo -e "Backend:      ${RED}✗${NC} Not running"
    fi
    
    # Check Frontend
    if check_port $FRONTEND_PORT; then
        echo -e "Frontend:     ${GREEN}✓${NC} Running on http://localhost:$FRONTEND_PORT"
    else
        echo -e "Frontend:     ${RED}✗${NC} Not running"
    fi
    
    echo ""
    echo -e "Access URLs:"
    echo -e "  Frontend:   ${CYAN}http://localhost:$FRONTEND_PORT${NC}"
    echo -e "  Backend:    ${CYAN}http://localhost:$BACKEND_PORT${NC}"
    echo -e "  API Health: ${CYAN}http://localhost:$BACKEND_PORT/api/health${NC}"
    echo ""
}

# Function to start the system
start_system() {
    print_status "Starting NeoRP Project Planning System..."
    echo ""
    
    # Pre-flight checks
    check_node
    check_npm
    check_env
    install_dependencies
    
    # Clean ports automatically
    print_info "Cleaning up any existing processes..."
    kill_port $BACKEND_PORT
    kill_port $FRONTEND_PORT
    sleep 2
    
    # Start PostgreSQL
    if ! check_postgres; then
        start_postgres || exit 1
    else
        print_status "PostgreSQL is already running"
    fi
    
    # Run database migration
    run_migration
    
    # Start backend
    print_info "Starting backend server..."
    cd backend
    npm run dev > ../backend.log 2>&1 &
    BACKEND_PID=$!
    cd ..
    
    # Wait for backend to start
    local attempts=0
    while [ $attempts -lt 15 ]; do
        if check_port $BACKEND_PORT; then
            print_status "Backend server started on port $BACKEND_PORT"
            break
        fi
        print_info "Waiting for backend to start... (attempt $((attempts + 1))/15)"
        sleep 2
        attempts=$((attempts + 1))
    done
    
    if [ $attempts -eq 15 ]; then
        print_error "Backend failed to start. Check backend.log for details."
        cat backend.log | tail -20
        cleanup
        exit 1
    fi
    
    # Start frontend
    print_info "Starting frontend development server..."
    cd frontend
    npm start > ../frontend.log 2>&1 &
    FRONTEND_PID=$!
    cd ..
    
    # Wait for frontend to start
    attempts=0
    while [ $attempts -lt 20 ]; do
        if check_port $FRONTEND_PORT; then
            print_status "Frontend server started on port $FRONTEND_PORT"
            break
        fi
        print_info "Waiting for frontend to start... (attempt $((attempts + 1))/20)"
        sleep 3
        attempts=$((attempts + 1))
    done
    
    if [ $attempts -eq 20 ]; then
        print_error "Frontend failed to start. Check frontend.log for details."
        cat frontend.log | tail -20
        cleanup
        exit 1
    fi
    
    # Start app monitor if requested
    if [ "$APP_MONITOR" = true ]; then
        print_info "Starting application monitor..."
        if [ -f "backend/scripts/app-monitor.js" ]; then
            node backend/scripts/app-monitor.js start > app-monitor.log 2>&1 &
            MONITOR_PID=$!
            print_status "Application monitor started"
        else
            print_warning "App monitor script not found, skipping..."
        fi
    fi
    
    # Show status
    show_status
    
    print_status "NeoRP system is ready!"
    print_info "Press Ctrl+C to stop all services"
    
    # Set up signal handlers
    trap cleanup SIGINT SIGTERM
    
    # Keep script running and monitor processes
    while true; do
        sleep 10
        
        # Check if processes are still running
        if [ ! -z "$BACKEND_PID" ] && ! kill -0 $BACKEND_PID 2>/dev/null; then
            print_error "Backend process died unexpectedly"
            print_info "Backend log:"
            tail -10 backend.log
            cleanup
            exit 1
        fi
        
        if [ ! -z "$FRONTEND_PID" ] && ! kill -0 $FRONTEND_PID 2>/dev/null; then
            print_error "Frontend process died unexpectedly"
            print_info "Frontend log:"
            tail -10 frontend.log
            cleanup
            exit 1
        fi
    done
}

# Parse command line arguments
case "${1:-start}" in
    start)
        start_system
        ;;
    stop)
        print_info "Stopping NeoRP system..."
        kill_port $BACKEND_PORT
        kill_port $FRONTEND_PORT
        print_status "NeoRP system stopped"
        ;;
    status)
        show_status
        ;;
    restart)
        print_info "Restarting NeoRP system..."
        kill_port $BACKEND_PORT
        kill_port $FRONTEND_PORT
        sleep 3
        start_system
        ;;
    monitor)
        APP_MONITOR=true
        start_system
        ;;
    clean)
        print_info "Cleaning up NeoRP system..."
        kill_port $BACKEND_PORT
        kill_port $FRONTEND_PORT
        rm -f backend.log frontend.log app-monitor.log
        print_status "Cleanup completed"
        ;;
    fix-ports)
        print_info "Fixing port conflicts..."
        kill_port $BACKEND_PORT
        kill_port $FRONTEND_PORT
        print_status "Port conflicts resolved"
        ;;
    help|--help|-h)
        echo "NeoRP Project Planning System"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  start      Start the NeoRP system (default)"
        echo "  stop       Stop all NeoRP services"
        echo "  restart    Restart the NeoRP system"
        echo "  status     Show system status"
        echo "  monitor    Start with application monitoring"
        echo "  clean      Stop services and clean log files"
        echo "  fix-ports  Kill processes using ports 3000 and 3001"
        echo "  help       Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0              # Start system"
        echo "  $0 start        # Start system"
        echo "  $0 fix-ports    # Fix port conflicts"
        echo "  $0 monitor      # Start with app monitoring"
        echo "  $0 status       # Check status"
        echo "  $0 stop         # Stop system"
        ;;
    *)
        print_error "Unknown command: $1"
        echo "Use '$0 help' for available commands"
        exit 1
        ;;
esac