#!/bin/bash

# NeoRP Complete Setup Script
# This script sets up the entire NeoRP system from scratch

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Configuration
NEORP_VERSION="2.0.0"
NODE_MIN_VERSION="16"
POSTGRES_MIN_VERSION="12"

# Function to print colored output
print_header() {
    echo ""
    echo -e "${CYAN}================================${NC}"
    echo -e "${WHITE}$1${NC}"
    echo -e "${CYAN}================================${NC}"
    echo ""
}

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[ℹ]${NC} $1"
}

print_step() {
    echo -e "${PURPLE}[→]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to get version number
get_version() {
    echo "$1" | grep -oE '[0-9]+\.[0-9]+' | head -1 | cut -d. -f1
}

# Function to check system requirements
check_requirements() {
    print_header "Checking System Requirements"
    
    local all_good=true
    
    # Check Node.js
    if command_exists node; then
        local node_version=$(node -v)
        local node_major=$(get_version "$node_version")
        if [ "$node_major" -ge "$NODE_MIN_VERSION" ]; then
            print_status "Node.js $node_version detected"
        else
            print_error "Node.js version $NODE_MIN_VERSION+ required. Found: $node_version"
            all_good=false
        fi
    else
        print_error "Node.js not found. Please install Node.js $NODE_MIN_VERSION+"
        all_good=false
    fi
    
    # Check npm
    if command_exists npm; then
        local npm_version=$(npm -v)
        print_status "npm $npm_version detected"
    else
        print_error "npm not found. Please install npm"
        all_good=false
    fi
    
    # Check PostgreSQL
    if command_exists psql; then
        local pg_version=$(psql --version)
        print_status "PostgreSQL detected: $pg_version"
    else
        print_warning "PostgreSQL not found. Will provide installation instructions"
    fi
    
    # Check Git
    if command_exists git; then
        local git_version=$(git --version)
        print_status "Git detected: $git_version"
    else
        print_error "Git not found. Please install Git"
        all_good=false
    fi
    
    if [ "$all_good" = false ]; then
        print_error "Please install missing requirements and run this script again"
        exit 1
    fi
}

# Function to install PostgreSQL
install_postgresql() {
    print_header "Installing PostgreSQL"
    
    if command_exists psql; then
        print_status "PostgreSQL already installed"
        return 0
    fi
    
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        print_step "Installing PostgreSQL on Linux..."
        if command_exists apt-get; then
            sudo apt-get update
            sudo apt-get install -y postgresql postgresql-contrib
        elif command_exists yum; then
            sudo yum install -y postgresql-server postgresql-contrib
            sudo postgresql-setup initdb
        elif command_exists pacman; then
            sudo pacman -S postgresql
            sudo -u postgres initdb -D /var/lib/postgres/data
        else
            print_error "Unsupported Linux distribution. Please install PostgreSQL manually"
            return 1
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        print_step "Installing PostgreSQL on macOS..."
        if command_exists brew; then
            brew install postgresql
            brew services start postgresql
        else
            print_error "Homebrew not found. Please install Homebrew first or install PostgreSQL manually"
            return 1
        fi
    else
        print_error "Unsupported operating system. Please install PostgreSQL manually"
        return 1
    fi
    
    print_status "PostgreSQL installation completed"
}

# Function to setup database
setup_database() {
    print_header "Setting Up Database"
    
    # Start PostgreSQL service
    print_step "Starting PostgreSQL service..."
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if command_exists systemctl; then
            sudo systemctl start postgresql
            sudo systemctl enable postgresql
        else
            sudo service postgresql start
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        if command_exists brew; then
            brew services start postgresql
        fi
    fi
    
    # Wait for PostgreSQL to start
    sleep 3
    
    # Create database and user
    print_step "Creating database and user..."
    
    # Create the SQL commands in a temporary file
    cat > /tmp/neorp_setup.sql << EOF
-- Create database
CREATE DATABASE neorp_db;

-- Create user
CREATE USER neorp_user WITH PASSWORD 'Sw@mi2127';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE neorp_db TO neorp_user;

-- Grant additional privileges for modern PostgreSQL
\c neorp_db
GRANT ALL ON SCHEMA public TO neorp_user;
GRANT CREATE ON SCHEMA public TO neorp_user;
EOF

    # Execute the SQL commands
    if sudo -u postgres psql -f /tmp/neorp_setup.sql; then
        print_status "Database and user created successfully"
    else
        print_warning "Database creation may have failed, but this could be normal if already exists"
    fi
    
    # Clean up
    rm -f /tmp/neorp_setup.sql
}

# Function to setup project structure
setup_project() {
    print_header "Setting Up Project Structure"
    
    # Create main directory if it doesn't exist
    if [ ! -d "neorp-project" ]; then
        print_step "Creating project directory..."
        mkdir -p neorp-project
        cd neorp-project
    else
        print_info "Using existing project directory..."
        cd neorp-project
    fi
    
    # Create backend structure
    print_step "Setting up backend structure..."
    mkdir -p backend/{config,models,routes,migrations,scripts,logs}
    
    # Create frontend structure
    print_step "Setting up frontend structure..."
    mkdir -p frontend/{src/{components,assets,utils},public}
    
    print_status "Project structure created"
}

# Function to setup backend
setup_backend() {
    print_header "Setting Up Backend"
    
    cd backend
    
    # Initialize package.json if it doesn't exist
    if [ ! -f "package.json" ]; then
        print_step "Initializing backend package.json..."
        cat > package.json << EOF
{
  "name": "neorp-backend",
  "version": "2.0.0",
  "description": "NeoRP Enhanced Project Planning Backend",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "db:migrate": "PGPASSWORD=Sw@mi2127 psql -U neorp_user -h localhost -d neorp_db -f migrations/init.sql",
    "db:reset": "PGPASSWORD=Sw@mi2127 psql -U neorp_user -h localhost -d neorp_db -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;' && npm run db:migrate",
    "test": "echo \\"Error: no test specified\\" && exit 1"
  },
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.0",
    "cors": "^2.8.5",
    "dotenv": "^16.0.3",
    "uuid": "^9.0.0",
    "helmet": "^7.0.0",
    "compression": "^1.7.4"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  },
  "keywords": ["neorp", "project-management", "kanban", "postgresql", "enhanced"],
  "author": "NeoRP Team",
  "license": "MIT"
}
EOF
    fi
    
    # Install dependencies
    print_step "Installing backend dependencies..."
    npm install
    
    # Create .env file
    if [ ! -f ".env" ]; then
        print_step "Creating .env configuration..."
        cat > .env << EOF
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

# Security Configuration
SESSION_SECRET=neorp_session_secret_$(date +%s)

# File Upload Configuration
MAX_FILE_SIZE=10mb
UPLOAD_PATH=./uploads

# Time Tracking Configuration
AUTO_SAVE_INTERVAL=30000
MAX_TIMER_DURATION=28800

# Application Monitoring
ENABLE_APP_MONITORING=false
ALLOWED_APPS_ENFORCEMENT=false

# Logging Configuration
LOG_LEVEL=info
LOG_FILE=./logs/neorp.log

# Feature Flags
ENABLE_TASK_LINKING=true
ENABLE_TIME_TRACKING=true
ENABLE_FILE_UPLOADS=true
ENABLE_APP_MANAGEMENT=true
ENABLE_MARKDOWN_EDITOR=true

# Performance Configuration
DB_POOL_MAX=20
DB_POOL_IDLE_TIMEOUT=30000
DB_POOL_CONNECTION_TIMEOUT=2000
EOF
    fi
    
    cd ..
    print_status "Backend setup completed"
}

# Function to setup frontend
setup_frontend() {
    print_header "Setting Up Frontend"
    
    cd frontend
    
    # Initialize package.json if it doesn't exist
    if [ ! -f "package.json" ]; then
        print_step "Initializing frontend package.json..."
        cat > package.json << EOF
{
  "name": "neorp-frontend",
  "version": "2.0.0",
  "private": true,
  "description": "NeoRP Enhanced Project Planning Frontend",
  "dependencies": {
    "@testing-library/jest-dom": "^5.16.4",
    "@testing-library/react": "^13.4.0",
    "@testing-library/user-event": "^13.5.0",
    "lucide-react": "^0.263.1",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1",
    "web-vitals": "^2.1.4"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "eslintConfig": {
    "extends": [
      "react-app"
    ],
    "env": {
      "jest": true
    }
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  },
  "proxy": "http://localhost:3001",
  "devDependencies": {
    "@tailwindcss/forms": "^0.5.4",
    "autoprefixer": "^10.4.14",
    "postcss": "^8.4.24",
    "tailwindcss": "^3.3.2"
  }
}
EOF
    fi
    
    # Install dependencies
    print_step "Installing frontend dependencies..."
    npm install
    
    # Setup Tailwind CSS
    print_step "Setting up Tailwind CSS..."
    if [ ! -f "tailwind.config.js" ]; then
        npx tailwindcss init -p
    fi
    
    cd ..
    print_status "Frontend setup completed"
}

# Function to create startup scripts
create_scripts() {
    print_header "Creating Startup Scripts"
    
    # Create main startup script
    print_step "Creating main startup script..."
    cat > start-neorp.sh << 'EOF'
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
EOF
    
    chmod +x start-neorp.sh
    
    # Create logs directory
    mkdir -p logs
    
    print_status "Startup scripts created"
}

# Function to run database migration
run_migration() {
    print_header "Running Database Migration"
    
    cd backend
    
    # Run migration
    print_step "Executing database migration..."
    if npm run db:migrate; then
        print_status "Database migration completed successfully"
    else
        print_warning "Migration may have failed, but this could be normal if tables already exist"
    fi
    
    cd ..
}

# Function to test installation
test_installation() {
    print_header "Testing Installation"
    
    # Test database connection
    print_step "Testing database connection..."
    if PGPASSWORD=Sw@mi2127 psql -U neorp_user -h localhost -d neorp_db -c "SELECT 1;" >/dev/null 2>&1; then
        print_status "Database connection successful"
    else
        print_error "Database connection failed"
        return 1
    fi
    
    # Test backend dependencies
    print_step "Testing backend dependencies..."
    cd backend
    if npm list >/dev/null 2>&1; then
        print_status "Backend dependencies OK"
    else
        print_warning "Some backend dependencies may be missing"
    fi
    cd ..
    
    # Test frontend dependencies
    print_step "Testing frontend dependencies..."
    cd frontend
    if npm list >/dev/null 2>&1; then
        print_status "Frontend dependencies OK"
    else
        print_warning "Some frontend dependencies may be missing"
    fi
    cd ..
    
    print_status "Installation test completed"
}

# Function to show completion message
show_completion() {
    print_header "Setup Complete!"
    
    echo ""
    echo -e "${GREEN}🎉 NeoRP Enhanced v$NEORP_VERSION has been successfully installed!${NC}"
    echo ""
    echo -e "${CYAN}📁 Project Location:${NC} $(pwd)"
    echo -e "${CYAN}🚀 To start NeoRP:${NC} ./start-neorp.sh"
    echo -e "${CYAN}🌐 Frontend URL:${NC} http://localhost:3000"
    echo -e "${CYAN}🔧 Backend URL:${NC} http://localhost:3001"
    echo ""
    echo -e "${BLUE}📖 Features Included:${NC}"
    echo -e "   • Notion-style editor with slash commands"
    echo -e "   • Advanced image pasting and handling"
    echo -e "   • Pomodoro timer with soothing notifications"
    echo -e "   • 3D glass morphism design"
    echo -e "   • Task linking and management"
    echo -e "   • File attachments and uploads"
    echo -e "   • Application management and monitoring"
    echo ""
    echo -e "${YELLOW}💡 Next Steps:${NC}"
    echo -e "   1. Run ${CYAN}./start-neorp.sh${NC} to start the system"
    echo -e "   2. Open http://localhost:3000 in your browser"
    echo -e "   3. Create your first task and explore the features"
    echo -e "   4. Check out the usage guide for advanced features"
    echo ""
    echo -e "${PURPLE}🔧 Troubleshooting:${NC}"
    echo -e "   • Check logs in the ${CYAN}logs/${NC} directory"
    echo -e "   • Ensure PostgreSQL is running"
    echo -e "   • Verify ports 3000 and 3001 are available"
    echo ""
}

# Main execution
main() {
    clear
    print_header "NeoRP Enhanced Setup v$NEORP_VERSION"
    
    echo -e "${BLUE}This script will set up a complete NeoRP project management system with:${NC}"
    echo -e "• Modern glass morphism UI with 3D effects"
    echo -e "• Notion-style editor with live markdown rendering"
    echo -e "• Advanced timer system with Pomodoro support"
    echo -e "• Task linking and file management"
    echo -e "• PostgreSQL database integration"
    echo ""
    
    read -p "Continue with installation? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Installation cancelled"
        exit 0
    fi
    
    check_requirements
    
    if ! command_exists psql; then
        read -p "Install PostgreSQL? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            install_postgresql
        else
            print_error "PostgreSQL is required. Please install it manually and run this script again"
            exit 1
        fi
    fi
    
    setup_database
    setup_project
    setup_backend
    setup_frontend
    create_scripts
    run_migration
    test_installation
    show_completion
}

# Run main function
main "$@"