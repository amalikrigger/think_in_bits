#!/bin/bash

#===============================================================================
#
#   DEPLOY TO GITHUB PAGES - Automated Deployment Script
#   
#   Description: This script automates the deployment of a static HTML/CSS/JS
#                project to GitHub Pages for embedding in WordPress/Elementor.
#
#   Author: Think In Bits Automation
#   Created: 2026-01-29
#   
#   Prerequisites:
#     - Homebrew installed (for macOS)
#     - A GitHub account
#     - Your project files ready (HTML, CSS, JS, assets)
#
#   Usage:
#     chmod +x deploy-to-github-pages.sh
#     ./deploy-to-github-pages.sh [repository-name]
#
#   Example:
#     ./deploy-to-github-pages.sh my_awesome_site
#
#===============================================================================

set -e  # Exit on any error

#-------------------------------------------------------------------------------
# CONFIGURATION - Modify these as needed
#-------------------------------------------------------------------------------

# Default repository name (will be overridden by command line argument)
DEFAULT_REPO_NAME="my_project"

# Files/folders to exclude from deployment (added to .gitignore)
GITIGNORE_CONTENT='# OS files
.DS_Store
Thumbs.db
.Spotlight-V100
.Trashes
Desktop.ini

# Editor files
.idea/
.vscode/
*.swp
*.swo
*~
.*.swp

# Documentation/task files (not needed for production)
docs/

# Backup files
*_backup.html
*_backup.*
*.bak

# Node.js (if any)
node_modules/
package-lock.json
yarn.lock

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Temp files
*.tmp
*.temp

# Build artifacts (if any)
dist/
build/
.cache/

# Environment files
.env
.env.local
.env.*.local

# This script itself (optional - remove if you want to include it)
scripts/
'

#-------------------------------------------------------------------------------
# COLORS FOR OUTPUT
#-------------------------------------------------------------------------------

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

#-------------------------------------------------------------------------------
# HELPER FUNCTIONS
#-------------------------------------------------------------------------------

print_header() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}  ${BOLD}$1${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_step() {
    echo -e "${BLUE}▶${NC} ${BOLD}Step $1:${NC} $2"
}

print_success() {
    echo -e "${GREEN}✔${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✖${NC} $1"
}

print_info() {
    echo -e "${CYAN}ℹ${NC} $1"
}

confirm() {
    read -p "$(echo -e ${YELLOW}"$1 (y/n): "${NC})" -n 1 -r
    echo
    [[ $REPLY =~ ^[Yy]$ ]]
}

#-------------------------------------------------------------------------------
# MAIN SCRIPT
#-------------------------------------------------------------------------------

main() {
    print_header "🚀 GitHub Pages Deployment Script"
    
    # Get repository name from argument or use default
    REPO_NAME="${1:-$DEFAULT_REPO_NAME}"
    
    echo -e "Repository name: ${BOLD}$REPO_NAME${NC}"
    echo -e "Working directory: ${BOLD}$(pwd)${NC}"
    echo ""
    
    #---------------------------------------------------------------------------
    # STEP 1: Check Prerequisites
    #---------------------------------------------------------------------------
    print_step "1" "Checking prerequisites..."
    
    # Check if we're in a directory with an index.html
    if [ ! -f "index.html" ]; then
        print_error "No index.html found in current directory!"
        print_info "Please run this script from your project root folder."
        exit 1
    fi
    print_success "Found index.html"
    
    # Check if Homebrew is installed (macOS)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        if ! command -v brew &> /dev/null; then
            print_error "Homebrew is not installed!"
            print_info "Install it from: https://brew.sh"
            exit 1
        fi
        print_success "Homebrew is installed"
    fi
    
    # Check if git is installed
    if ! command -v git &> /dev/null; then
        print_error "Git is not installed!"
        print_info "Install with: brew install git"
        exit 1
    fi
    print_success "Git is installed"
    
    # Check if GitHub CLI is installed
    if ! command -v gh &> /dev/null; then
        print_warning "GitHub CLI (gh) is not installed"
        if confirm "Would you like to install it now?"; then
            print_info "Installing GitHub CLI..."
            if [[ "$OSTYPE" == "darwin"* ]]; then
                brew install gh
            elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
                # For Linux (Debian/Ubuntu)
                curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
                echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
                sudo apt update
                sudo apt install gh
            else
                print_error "Please install GitHub CLI manually: https://cli.github.com"
                exit 1
            fi
            print_success "GitHub CLI installed"
        else
            print_error "GitHub CLI is required. Exiting."
            exit 1
        fi
    else
        print_success "GitHub CLI is installed"
    fi
    
    # Check if authenticated with GitHub
    if ! gh auth status &> /dev/null; then
        print_warning "Not authenticated with GitHub"
        print_info "Starting GitHub authentication..."
        gh auth login
    fi
    
    GITHUB_USER=$(gh api user --jq '.login')
    print_success "Authenticated as: $GITHUB_USER"
    
    echo ""
    
    #---------------------------------------------------------------------------
    # STEP 1.5: Build pages from templates (if build script exists)
    #---------------------------------------------------------------------------
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    BUILD_SCRIPT="$SCRIPT_DIR/build-pages.sh"
    
    if [ -f "$BUILD_SCRIPT" ]; then
        print_step "1.5" "Building pages from templates..."
        if confirm "Run build-pages.sh to regenerate HTML from templates?"; then
            chmod +x "$BUILD_SCRIPT"
            "$BUILD_SCRIPT"
            print_success "Pages built from templates"
        else
            print_info "Skipping template build"
        fi
        echo ""
    fi
    
    #---------------------------------------------------------------------------
    # STEP 2: Create .gitignore
    #---------------------------------------------------------------------------
    print_step "2" "Creating .gitignore file..."
    
    if [ -f ".gitignore" ]; then
        if confirm "A .gitignore already exists. Overwrite it?"; then
            echo "$GITIGNORE_CONTENT" > .gitignore
            print_success ".gitignore updated"
        else
            print_info "Keeping existing .gitignore"
        fi
    else
        echo "$GITIGNORE_CONTENT" > .gitignore
        print_success ".gitignore created"
    fi
    
    echo ""
    
    #---------------------------------------------------------------------------
    # STEP 3: Initialize Git Repository
    #---------------------------------------------------------------------------
    print_step "3" "Initializing Git repository..."
    
    if [ -d ".git" ]; then
        print_warning "Git repository already exists"
        if confirm "Do you want to reinitialize? (This won't delete history)"; then
            git init
        fi
    else
        git init
        print_success "Git repository initialized"
    fi
    
    # Rename branch to main if needed
    CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "")
    if [ "$CURRENT_BRANCH" != "main" ] && [ -n "$CURRENT_BRANCH" ]; then
        git branch -m main
        print_success "Branch renamed to 'main'"
    elif [ -z "$CURRENT_BRANCH" ]; then
        git checkout -b main 2>/dev/null || true
    fi
    
    echo ""
    
    #---------------------------------------------------------------------------
    # STEP 4: Stage and Commit Files
    #---------------------------------------------------------------------------
    print_step "4" "Staging and committing files..."
    
    git add .
    
    # Show what will be committed
    echo ""
    print_info "Files to be committed:"
    git status --short | head -20
    FILE_COUNT=$(git status --short | wc -l | tr -d ' ')
    if [ "$FILE_COUNT" -gt 20 ]; then
        print_info "... and $((FILE_COUNT - 20)) more files"
    fi
    echo ""
    
    if confirm "Proceed with commit?"; then
        # Check if there are changes to commit
        if git diff --cached --quiet; then
            print_warning "No changes to commit (already committed?)"
        else
            git commit -m "Initial commit: Deploy to GitHub Pages"
            print_success "Files committed"
        fi
    else
        print_error "Commit cancelled. Exiting."
        exit 1
    fi
    
    echo ""
    
    #---------------------------------------------------------------------------
    # STEP 5: Create GitHub Repository
    #---------------------------------------------------------------------------
    print_step "5" "Creating GitHub repository..."
    
    # Check if repo already exists
    if gh repo view "$GITHUB_USER/$REPO_NAME" &> /dev/null; then
        print_warning "Repository '$REPO_NAME' already exists on GitHub"
        if confirm "Do you want to use the existing repository?"; then
            # Set remote if not already set
            if ! git remote get-url origin &> /dev/null; then
                git remote add origin "https://github.com/$GITHUB_USER/$REPO_NAME.git"
                print_success "Remote 'origin' added"
            fi
        else
            print_error "Please choose a different repository name. Exiting."
            exit 1
        fi
    else
        gh repo create "$REPO_NAME" --public --source=. --remote=origin
        print_success "Repository created: https://github.com/$GITHUB_USER/$REPO_NAME"
    fi
    
    echo ""
    
    #---------------------------------------------------------------------------
    # STEP 6: Push to GitHub
    #---------------------------------------------------------------------------
    print_step "6" "Pushing code to GitHub..."
    
    git push -u origin main --force
    print_success "Code pushed to GitHub"
    
    echo ""
    
    #---------------------------------------------------------------------------
    # STEP 7: Enable GitHub Pages
    #---------------------------------------------------------------------------
    print_step "7" "Enabling GitHub Pages..."
    
    # Enable GitHub Pages via API
    gh api "repos/$GITHUB_USER/$REPO_NAME/pages" -X POST --input - <<EOF 2>/dev/null || true
{"build_type":"legacy","source":{"branch":"main","path":"/"}}
EOF
    
    print_success "GitHub Pages enabled"
    print_info "Waiting for deployment..."
    
    # Wait for build to complete
    for i in {1..30}; do
        STATUS=$(gh api "repos/$GITHUB_USER/$REPO_NAME/pages" --jq '.status' 2>/dev/null || echo "unknown")
        if [ "$STATUS" = "built" ]; then
            break
        fi
        echo -ne "\r${CYAN}ℹ${NC} Build status: $STATUS (attempt $i/30)..."
        sleep 5
    done
    echo ""
    
    # Get final status
    PAGES_URL=$(gh api "repos/$GITHUB_USER/$REPO_NAME/pages" --jq '.html_url' 2>/dev/null)
    PAGES_STATUS=$(gh api "repos/$GITHUB_USER/$REPO_NAME/pages" --jq '.status' 2>/dev/null)
    
    if [ "$PAGES_STATUS" = "built" ]; then
        print_success "Site deployed successfully!"
    else
        print_warning "Build status: $PAGES_STATUS (may still be building)"
    fi
    
    echo ""
    
    #---------------------------------------------------------------------------
    # STEP 8: Display Results
    #---------------------------------------------------------------------------
    print_header "🎉 Deployment Complete!"
    
    echo -e "${GREEN}Your site is live at:${NC}"
    echo -e "${BOLD}${CYAN}$PAGES_URL${NC}"
    echo ""
    
    echo -e "${GREEN}GitHub Repository:${NC}"
    echo -e "${BOLD}https://github.com/$GITHUB_USER/$REPO_NAME${NC}"
    echo ""
    
    #---------------------------------------------------------------------------
    # STEP 9: Generate Embed Code
    #---------------------------------------------------------------------------
    print_header "📋 Iframe Embed Code for WordPress/Elementor"
    
    echo -e "${YELLOW}Full Site Embed:${NC}"
    echo ""
    cat << EMBED
<iframe 
  src="$PAGES_URL" 
  width="100%" 
  height="800" 
  frameborder="0" 
  style="border: none; border-radius: 8px;"
  title="$REPO_NAME"
  loading="lazy">
</iframe>
EMBED
    echo ""
    
    echo -e "${YELLOW}Simple One-liner:${NC}"
    echo ""
    echo "<iframe src=\"$PAGES_URL\" width=\"100%\" height=\"800\" frameborder=\"0\"></iframe>"
    echo ""
    
    #---------------------------------------------------------------------------
    # STEP 10: Save Info to File
    #---------------------------------------------------------------------------
    INFO_FILE="DEPLOYMENT_INFO.md"
    cat > "$INFO_FILE" << INFOFILE
# Deployment Information

## Live Site
**URL:** $PAGES_URL

## GitHub Repository  
**URL:** https://github.com/$GITHUB_USER/$REPO_NAME

## Iframe Embed Code

### Full Embed (Recommended)
\`\`\`html
<iframe 
  src="$PAGES_URL" 
  width="100%" 
  height="800" 
  frameborder="0" 
  style="border: none; border-radius: 8px;"
  title="$REPO_NAME"
  loading="lazy">
</iframe>
\`\`\`

### Simple One-liner
\`\`\`html
<iframe src="$PAGES_URL" width="100%" height="800" frameborder="0"></iframe>
\`\`\`

## How to Update the Site

After making local changes, run these commands:
\`\`\`bash
git add .
git commit -m "Your update message"
git push
\`\`\`

The site will automatically update within 1-2 minutes.

---
*Deployed on: $(date)*
INFOFILE

    print_success "Deployment info saved to: $INFO_FILE"
    echo ""
    
    print_header "📝 Quick Reference"
    echo -e "${BOLD}To update your site after changes:${NC}"
    echo ""
    echo "  git add ."
    echo "  git commit -m \"Your update message\""
    echo "  git push"
    echo ""
    print_info "Changes will be live within 1-2 minutes after pushing."
    echo ""
}

#-------------------------------------------------------------------------------
# RUN MAIN FUNCTION
#-------------------------------------------------------------------------------

main "$@"
