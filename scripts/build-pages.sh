#!/usr/bin/env bash

# ========================================
# THINK IN BITS - Page Builder Script
# ========================================
# Assembles full HTML pages from section templates
# based on page configuration files.
#
# Usage:
#   ./scripts/build-pages.sh           # Build all pages
#   ./scripts/build-pages.sh index     # Build only index.html
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

# Paths
TEMPLATES_DIR="$PROJECT_ROOT/templates"
SECTIONS_DIR="$TEMPLATES_DIR/sections"
CONFIGS_DIR="$TEMPLATES_DIR/page-configs"
OUTPUT_DIR="$PROJECT_ROOT"

# Function to get page title
get_page_title() {
    local page_name="$1"
    case "$page_name" in
        index)    echo "Business Club - Innovation & Entrepreneurship" ;;
        shop)     echo "3D Prints Shop - Business Club" ;;
        projects) echo "Projects & Games - Business Club" ;;
        blog)     echo "Blog & News - Business Club" ;;
        about)    echo "About Us - Business Club" ;;
        *)        echo "Business Club" ;;
    esac
}

# ----------------------------------------
# Functions
# ----------------------------------------

print_header() {
    echo -e "${CYAN}"
    echo "========================================"
    echo "  THINK IN BITS - Page Builder"
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

# Paths to base CSS files
VARIABLES_CSS="$TEMPLATES_DIR/base/variables.css"
SHARED_CSS="$TEMPLATES_DIR/base/shared-components.css"

# Generate HTML document header
generate_head() {
    local page_name="$1"
    local title
    title=$(get_page_title "$page_name")
    
    cat <<EOF
<!-- ============================================
     AUTO-GENERATED FILE - DO NOT EDIT DIRECTLY
     Edit templates in /templates/ folder instead.
     Rebuild with: ./scripts/build-pages.sh
     ============================================ -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>$title</title>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap" rel="stylesheet">
  <style>
    /* CSS Variables - Required for all sections */
    :root {
      --tib-primary-color: #00e5ff;
      --tib-primary-dark: #0099cc;
      --tib-secondary-color: #b0b0b0;
      --tib-bg-color: #0a0a0a;
      --tib-bg-gradient-end: #1a1a2e;
      --tib-surface-color: #1a1a1a;
      --tib-surface-alt: #0f0f0f;
      --tib-surface-light: #2a2a2a;
      --tib-text-color: #ffffff;
      --tib-text-muted: #666666;
      --tib-border-subtle: rgba(255, 255, 255, 0.05);
      --tib-primary-alpha-10: rgba(0, 229, 255, 0.1);
      --tib-primary-alpha-30: rgba(0, 229, 255, 0.3);
      --tib-primary-alpha-03: rgba(0, 229, 255, 0.03);
      --tib-font-family: 'Poppins', sans-serif;
      --tib-border-radius-card: 20px;
      --tib-border-radius-btn: 50px;
      --tib-border-radius-cta: 30px;
      --tib-section-padding: 5rem 1.5rem;
      --tib-max-width: 1200px;
      --tib-shadow-card: 0 10px 30px rgba(0, 0, 0, 0.5);
      --tib-shadow-primary: 0 8px 20px rgba(0, 229, 255, 0.3);
      --tib-shadow-hover: 0 20px 50px rgba(0, 229, 255, 0.2);
      
      /* Accent Colors (for tags/badges) */
      --tib-accent-game: #ff6b6b;
      --tib-accent-game-alpha: rgba(255, 107, 107, 0.1);
      --tib-accent-website: #4ecdc4;
      --tib-accent-website-alpha: rgba(78, 205, 196, 0.1);
    }
    
    /* Base Reset */
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    html, body { height: 100%; width: 100%; }
    body {
      font-family: var(--tib-font-family);
      background: var(--tib-bg-color);
      color: var(--tib-text-color);
      overflow-x: hidden;
      line-height: 1.6;
    }
    a { text-decoration: none; color: inherit; }
    ul, ol { list-style: none; }
    img { max-width: 100%; height: auto; display: block; }
EOF

    # Inject shared components CSS if it exists
    if [[ -f "$SHARED_CSS" ]]; then
        echo ""
        echo "    /* ========================================"
        echo "       Shared Component Styles"
        echo "       ======================================== */"
        # Read the file, skip the header comment block (first 10 lines), indent each line
        tail -n +11 "$SHARED_CSS" | sed 's/^/    /'
    fi

    cat <<EOF
  </style>
</head>
<body>
EOF
}

# Generate HTML document footer
generate_foot() {
    cat <<EOF
</body>
</html>
EOF
}

# Build a single page from its config file
build_page() {
    local page_name="$1"
    local config_file="$CONFIGS_DIR/${page_name}.conf"
    local output_file="$OUTPUT_DIR/${page_name}.html"
    
    if [[ ! -f "$config_file" ]]; then
        print_error "Config file not found: $config_file"
        return 1
    fi
    
    print_info "Building ${page_name}.html..."
    
    # Start with HTML head
    generate_head "$page_name" > "$output_file"
    
    # Process each line in the config file
    while IFS= read -r line || [[ -n "$line" ]]; do
        # Skip empty lines and comments
        [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
        
        # Trim whitespace
        line=$(echo "$line" | xargs)
        
        local section_file="$SECTIONS_DIR/$line"
        
        if [[ -f "$section_file" ]]; then
            echo "" >> "$output_file"
            echo "  <!-- Section: $line -->" >> "$output_file"
            cat "$section_file" >> "$output_file"
        else
            print_error "  Section not found: $line"
        fi
    done < "$config_file"
    
    # Add HTML footer
    generate_foot >> "$output_file"
    
    print_success "Built ${page_name}.html"
}

# Build all pages
build_all() {
    local count=0
    local errors=0
    
    for config_file in "$CONFIGS_DIR"/*.conf; do
        [[ ! -f "$config_file" ]] && continue
        
        local page_name=$(basename "$config_file" .conf)
        
        if build_page "$page_name"; then
            ((count++))
        else
            ((errors++))
        fi
    done
    
    echo ""
    if [[ $errors -eq 0 ]]; then
        print_success "Successfully built $count page(s)"
    else
        print_error "Built $count page(s) with $errors error(s)"
    fi
}

# ----------------------------------------
# Main
# ----------------------------------------

print_header

# Check directories exist
if [[ ! -d "$SECTIONS_DIR" ]]; then
    print_error "Sections directory not found: $SECTIONS_DIR"
    exit 1
fi

if [[ ! -d "$CONFIGS_DIR" ]]; then
    print_error "Configs directory not found: $CONFIGS_DIR"
    exit 1
fi

# Build specific page or all pages
if [[ -n "$1" ]]; then
    build_page "$1"
else
    build_all
fi

echo ""
echo -e "${CYAN}Done!${NC}"
