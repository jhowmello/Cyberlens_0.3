#!/bin/sh

# Docker entrypoint script for CyberLens Backend
# This script handles database migrations and application startup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

log_error() {
    echo "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" >&2
}

log_warning() {
    echo "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

log_success() {
    echo "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] SUCCESS: $1${NC}"
}

# Function to wait for database
wait_for_db() {
    log "Waiting for database connection..."
    
    # Extract database connection details from DATABASE_URL if available
    if [ -n "$DATABASE_URL" ]; then
        # Parse DATABASE_URL to extract host and port
        DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
        DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
        
        if [ -n "$DB_HOST" ] && [ -n "$DB_PORT" ]; then
            log "Checking database connectivity to $DB_HOST:$DB_PORT"
            
            # Wait for database to be ready (max 60 seconds)
            for i in $(seq 1 60); do
                if nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; then
                    log_success "Database is ready!"
                    return 0
                fi
                log "Waiting for database... ($i/60)"
                sleep 1
            done
            
            log_error "Database connection timeout after 60 seconds"
            exit 1
        else
            log_warning "Could not parse DATABASE_URL, skipping database wait"
        fi
    else
        log_warning "DATABASE_URL not set, skipping database wait"
    fi
}

# Function to run database migrations
run_migrations() {
    log "Running database migrations..."
    
    # Check if Prisma schema exists
    if [ ! -f "./prisma/schema.prisma" ]; then
        log_error "Prisma schema not found at ./prisma/schema.prisma"
        exit 1
    fi
    
    # Generate Prisma client (in case it's not generated)
    log "Generating Prisma client..."
    npx prisma generate || {
        log_error "Failed to generate Prisma client"
        exit 1
    }
    
    # Run database migrations
    log "Applying database migrations..."
    npx prisma migrate deploy || {
        log_error "Database migration failed"
        exit 1
    }
    
    log_success "Database migrations completed successfully"
}

# Function to seed database (optional)
seed_database() {
    if [ "$RUN_SEED" = "true" ]; then
        log "Seeding database..."
        npm run seed || {
            log_warning "Database seeding failed, continuing anyway"
        }
    fi
}

# Function to validate environment
validate_environment() {
    log "Validating environment variables..."
    
    # Required environment variables
    REQUIRED_VARS="NODE_ENV DATABASE_URL JWT_SECRET"
    
    for var in $REQUIRED_VARS; do
        eval value=\$$var
        if [ -z "$value" ]; then
            log_error "Required environment variable $var is not set"
            exit 1
        fi
    done
    
    # Validate NODE_ENV
    if [ "$NODE_ENV" != "production" ] && [ "$NODE_ENV" != "development" ] && [ "$NODE_ENV" != "test" ]; then
        log_warning "NODE_ENV is set to '$NODE_ENV', expected 'production', 'development', or 'test'"
    fi
    
    log_success "Environment validation passed"
}

# Function to setup signal handlers
setup_signal_handlers() {
    # Handle SIGTERM gracefully
    trap 'log "Received SIGTERM, shutting down gracefully..."; kill -TERM $PID; wait $PID' TERM
    
    # Handle SIGINT gracefully
    trap 'log "Received SIGINT, shutting down gracefully..."; kill -INT $PID; wait $PID' INT
}

# Function to start the application
start_application() {
    log "Starting CyberLens Backend API..."
    
    # Set up signal handlers
    setup_signal_handlers
    
    # Start the application in background
    npm run start:prod &
    PID=$!
    
    log_success "Application started with PID $PID"
    
    # Wait for the application process
    wait $PID
    EXIT_CODE=$?
    
    if [ $EXIT_CODE -eq 0 ]; then
        log_success "Application exited gracefully"
    else
        log_error "Application exited with code $EXIT_CODE"
    fi
    
    exit $EXIT_CODE
}

# Function to perform health check
health_check() {
    log "Performing initial health check..."
    
    # Wait a bit for the application to start
    sleep 5
    
    # Try to connect to health endpoint
    if curl -f http://localhost:3000/health >/dev/null 2>&1; then
        log_success "Health check passed"
    else
        log_warning "Health check failed, but continuing startup"
    fi
}

# Main execution
main() {
    log "=== CyberLens Backend Startup ==="
    log "Version: 1.0.3"
    log "Environment: $NODE_ENV"
    log "User: $(whoami)"
    log "Working Directory: $(pwd)"
    
    # Validate environment
    validate_environment
    
    # Wait for database if needed
    if [ "$SKIP_DB_WAIT" != "true" ]; then
        wait_for_db
    else
        log "Skipping database wait (SKIP_DB_WAIT=true)"
    fi
    
    # Run migrations if needed
    if [ "$SKIP_MIGRATIONS" != "true" ]; then
        run_migrations
    else
        log "Skipping database migrations (SKIP_MIGRATIONS=true)"
    fi
    
    # Seed database if requested
    seed_database
    
    # Start the application
    start_application
}

# Execute main function
main "$@"