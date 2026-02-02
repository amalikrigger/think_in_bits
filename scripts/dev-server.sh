#!/bin/bash

# ========================================
# THINK IN BITS - Development Server
# ========================================
# Starts a local development server with auto-rebuild
# when template files change.
#
# Usage:
#   ./scripts/dev-server.sh           # Start server on port 8000
#   ./scripts/dev-server.sh 3000      # Start server on port 3000
#
# Requirements:
#   - Python 3 (for http.server)
#   - fswatch (for file watching) - optional
#
# ========================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Configuration
PORT="${1:-8000}"
TEMPLATES_DIR="$PROJECT_ROOT/templates"

# ----------------------------------------
# Functions
# ----------------------------------------

print_header() {
    echo -e "${CYAN}"
    echo "========================================"
    echo "  THINK IN BITS - Dev Server"
    echo "========================================"
    echo -e "${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}→ $1${NC}"
}

# Build pages before starting
initial_build() {
    print_info "Running initial build..."
    "$SCRIPT_DIR/build-pages.sh"
    echo ""
}

# Start HTTP server
start_server() {
    print_info "Starting development server..."
    echo ""
    echo -e "${GREEN}Server running at:${NC}"
    echo -e "  ${CYAN}http://localhost:$PORT${NC}"
    echo ""
    echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
    echo ""
    
    cd "$PROJECT_ROOT"
    python3 -m http.server "$PORT"
}

# Watch for changes and rebuild (requires fswatch)
watch_and_rebuild() {
    if command -v fswatch &> /dev/null; then
        print_info "Watching for template changes..."
        
        fswatch -o "$TEMPLATES_DIR" | while read -r; do
            echo ""
            print_info "Changes detected, rebuilding..."
            "$SCRIPT_DIR/build-pages.sh"
        done
    else
        print_info "fswatch not installed - auto-rebuild disabled"
        print_info "Install with: brew install fswatch"
        print_info "Run ./scripts/build-pages.sh manually after changes"
    fi
}

# Cleanup on exit
cleanup() {
    echo ""
    print_info "Shutting down..."
    kill 0
}

# ----------------------------------------
# Main
# ----------------------------------------

print_header

# Check Python is available
if ! command -v python3 &> /dev/null; then
    print_error "Python 3 is required but not installed"
    exit 1
fi

# Initial build
initial_build

# Trap Ctrl+C
trap cleanup SIGINT SIGTERM

# Start watcher in background if fswatch is available
if command -v fswatch &> /dev/null; then
    watch_and_rebuild &
fi

# Start server (this blocks)
start_server
