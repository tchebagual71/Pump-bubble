#!/bin/bash

# Production deployment script for Pump Bubble
# This script sets up the production environment on the server

set -e

echo "🚀 Starting Pump Bubble deployment..."

# Configuration
APP_DIR="/opt/pump-bubble"
COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   log_error "This script should not be run as root for security reasons"
   exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    log_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create application directory if it doesn't exist
if [ ! -d "$APP_DIR" ]; then
    log_info "Creating application directory: $APP_DIR"
    sudo mkdir -p "$APP_DIR"
    sudo chown $USER:$USER "$APP_DIR"
fi

# Navigate to application directory
cd "$APP_DIR"

# Check if .env file exists
if [ ! -f "$ENV_FILE" ]; then
    log_warn ".env file not found. Please create one based on .env.example"
    if [ -f ".env.example" ]; then
        cp .env.example .env
        log_info "Created .env file from .env.example. Please edit it with your configuration."
        exit 1
    fi
fi

# Pull latest changes (if git repo exists)
if [ -d ".git" ]; then
    log_info "Pulling latest changes from git..."
    git pull origin main
fi

# Build and start services
log_info "Building and starting services..."
docker-compose -f "$COMPOSE_FILE" pull
docker-compose -f "$COMPOSE_FILE" up -d --remove-orphans

# Wait for services to be ready
log_info "Waiting for services to start..."
sleep 30

# Health check
log_info "Performing health check..."
if curl -f http://localhost/health/caddy > /dev/null 2>&1; then
    log_info "✅ Health check passed! Application is running."
else
    log_error "❌ Health check failed! Please check the logs."
    docker-compose logs
    exit 1
fi

# Clean up old images
log_info "Cleaning up old Docker images..."
docker image prune -f

log_info "🎉 Deployment completed successfully!"
log_info "Your application is now running at: http://localhost"