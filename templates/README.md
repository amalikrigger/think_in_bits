# Think In Bits - Template System

A modular template system for building and deploying website sections to WordPress Elementor or as standalone HTML pages.

## Table of Contents

- [Quick Start](#quick-start)
- [Folder Structure](#folder-structure)
- [Usage Guide](#usage-guide)
  - [Option A: WordPress Elementor Embedding](#option-a-wordpress-elementor-embedding)
  - [Option B: Standalone HTML Website](#option-b-standalone-html-website)
- [Development Workflow](#development-workflow)
- [Available Templates](#available-templates)
- [Customization](#customization)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

### For WordPress Elementor

1. **Add CSS Variables to WordPress**:
   - Go to WordPress Admin → Appearance → Customize → Additional CSS
   - Paste the contents of `templates/base/variables.css`
   - Click "Publish"

2. **Embed a Section**:
   - Edit a page with Elementor
   - Add an "HTML" widget
   - Open any file from `templates/sections/` (e.g., `hero-home.html`)
   - Copy the entire contents and paste into the HTML widget

### For Standalone Website

```bash
# Make scripts executable
chmod +x scripts/build-pages.sh scripts/dev-server.sh

# Build all pages from templates
./scripts/build-pages.sh

# Start local development server
./scripts/dev-server.sh

# Deploy to GitHub Pages
./scripts/deploy-to-github-pages.sh my-site-name
```

---

## Folder Structure

```
templates/
├── base/
│   └── variables.css       # CSS variables for WordPress theme CSS editor
├── sections/               # Individual embeddable sections
│   ├── nav.html            # Navigation bar (includes JS)
│   ├── hero-home.html      # Home page hero
│   ├── hero-shop.html      # Shop page hero
│   ├── hero-projects.html  # Projects page hero
│   ├── hero-blog.html      # Blog page hero
│   ├── hero-about.html     # About page hero
│   ├── product-grid.html   # 3D prints product grid
│   ├── project-grid.html   # Projects/games grid
│   ├── blog-grid.html      # Blog posts grid
│   ├── cta-banner.html     # Custom print CTA
│   ├── cta-newsletter.html # Newsletter CTA
│   ├── cta-about-preview.html # About us CTA
│   ├── about-mission.html  # Mission statement
│   ├── values-grid.html    # Values cards
│   ├── team-grid.html      # Team member cards
│   ├── contact-section.html # Contact + social links
│   ├── footer.html         # Simple footer
│   ├── footer-full.html    # Footer with contact info
│   ├── home-print-promo.html  # 3D print promo (home)
│   ├── home-projects-promo.html # Projects promo (home)
│   └── home-news-promo.html    # News promo (home)
├── page-configs/           # Define which sections each page uses
│   ├── index.conf
│   ├── shop.conf
│   ├── projects.conf
│   ├── blog.conf
│   └── about.conf
└── README.md               # This file
```

---

## Usage Guide

### Option A: WordPress Elementor Embedding

This approach is ideal when you want to embed individual sections into WordPress pages using Elementor's HTML widget.

#### Step 1: Set Up CSS Variables

1. In WordPress Admin, go to **Appearance → Customize → Additional CSS**
2. Open `templates/base/variables.css`
3. Copy the entire contents
4. Paste into the Additional CSS field
5. Click **Publish**

This loads all the design tokens (colors, fonts, spacing) that the templates need.

#### Step 2: Add Google Fonts

Ensure Poppins font is available. In WordPress:
- Go to **Elementor → Settings → General**
- Or add to your theme's header:
```html
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap" rel="stylesheet">
```

#### Step 3: Embed Sections

1. Edit a page with Elementor
2. Drag an **HTML** widget to your page
3. Open the desired template file from `templates/sections/`
4. Copy the entire contents (including `<style>` and `<script>` tags)
5. Paste into the HTML widget's Content field
6. Update and preview

#### Example: Embedding a Hero Section

1. Open `templates/sections/hero-shop.html`
2. Copy everything from `<!-- ========= ... -->` to the closing `</section>`
3. Paste into an Elementor HTML widget
4. The section will render with all its styles inline

#### Tips for Elementor

- **Full-width sections**: Set the Elementor section to "Full Width" or "Boxed" depending on your theme
- **Navigation**: If using WordPress theme navigation, skip `nav.html`
- **Footer**: If using WordPress theme footer, skip `footer.html`
- **Mobile preview**: Always check mobile responsiveness in Elementor preview

---

### Option B: Standalone HTML Website

This approach generates complete HTML pages from templates for use as a static website (e.g., hosted on GitHub Pages).

#### Step 1: Understanding Page Configs

Each page is defined by a config file in `templates/page-configs/`:

```bash
# Example: shop.conf
nav.html
hero-shop.html
product-grid.html
cta-banner.html
footer.html
```

The build script reads this file and concatenates the sections in order.

#### Step 2: Build Pages

```bash
# Build all pages
./scripts/build-pages.sh

# Build a specific page
./scripts/build-pages.sh shop
```

This generates:
- `index.html` from `index.conf`
- `shop.html` from `shop.conf`
- `projects.html` from `projects.conf`
- `blog.html` from `blog.conf`
- `about.html` from `about.conf`

#### Step 3: Local Development

```bash
# Start dev server with auto-rebuild
./scripts/dev-server.sh

# Or specify a custom port
./scripts/dev-server.sh 3000
```

Open `http://localhost:8000` in your browser.

If you have `fswatch` installed (`brew install fswatch`), the server will automatically rebuild pages when you edit template files.

#### Step 4: Deploy to GitHub Pages

```bash
./scripts/deploy-to-github-pages.sh my-site-name
```

This will:
1. Run `build-pages.sh` to ensure pages are current
2. Initialize git repository
3. Create GitHub repository
4. Push to GitHub Pages
5. Provide the live URL

---

## Development Workflow

### Making Changes to a Section

1. Edit the template file (e.g., `templates/sections/hero-home.html`)
2. Run `./scripts/build-pages.sh` to regenerate all pages using that section
3. Changes propagate to all pages that include the section

### Adding a New Section

1. Create a new file in `templates/sections/` (e.g., `my-section.html`)
2. Follow the template structure:
   ```html
   <!-- ========================================
        My Section Name
        ======================================== -->
   
   <style>
   /* Section-specific CSS using --tib-* variables */
   .tib-my-section { ... }
   </style>
   
   <section class="tib-my-section">
     <!-- HTML content -->
   </section>
   ```
3. Add to relevant page configs in `templates/page-configs/`

### Adding a New Page

1. Create `templates/page-configs/newpage.conf`:
   ```
   nav.html
   hero-home.html
   # ... other sections
   footer.html
   ```
2. Add page title to `scripts/build-pages.sh`:
   ```bash
   PAGE_TITLES["newpage"]="New Page - Business Club"
   ```
3. Run `./scripts/build-pages.sh`

---

## Available Templates

### Navigation
| Template | Description |
|----------|-------------|
| `nav.html` | Fixed navigation bar with hamburger menu (includes JS) |

### Heroes (5 variants)
| Template | Description |
|----------|-------------|
| `hero-home.html` | Welcome hero with 2 CTAs |
| `hero-shop.html` | 3D Printing Services hero |
| `hero-projects.html` | Student Projects hero |
| `hero-blog.html` | Club News hero |
| `hero-about.html` | About Us hero |

### Content Grids
| Template | Description |
|----------|-------------|
| `product-grid.html` | 3D prints product cards (3 items) |
| `project-grid.html` | All 9 student projects with badges |
| `blog-grid.html` | Blog post cards (4 items) |
| `values-grid.html` | Precision/Quality/Innovation cards |
| `team-grid.html` | Team member cards (4 items) |

### Call-to-Action Banners
| Template | Description |
|----------|-------------|
| `cta-banner.html` | Custom print request CTA |
| `cta-newsletter.html` | Newsletter subscription CTA |
| `cta-about-preview.html` | About Us preview CTA |

### Home Page Promos
| Template | Description |
|----------|-------------|
| `home-print-promo.html` | 3D printing service promo (2 cards) |
| `home-projects-promo.html` | Student games promo (3 cards) |
| `home-news-promo.html` | Latest news promo (2 cards) |

### About Page Sections
| Template | Description |
|----------|-------------|
| `about-mission.html` | Mission statement text |
| `contact-section.html` | Contact info + social links |

### Footers
| Template | Description |
|----------|-------------|
| `footer.html` | Simple copyright footer |
| `footer-full.html` | Footer with contact + social links |

---

## Customization

### Changing Colors

Edit `templates/base/variables.css`:

```css
:root {
  --tib-primary-color: #00e5ff;    /* Main accent color */
  --tib-primary-dark: #0099cc;     /* Darker accent */
  --tib-bg-color: #0a0a0a;         /* Background */
  /* ... */
}
```

After changing, rebuild pages and update WordPress Additional CSS.

### Changing Content

Edit the HTML in any template file, then run:
```bash
./scripts/build-pages.sh
```

### Using Different Sections Per Page

Edit the `.conf` files in `templates/page-configs/`:

```bash
# templates/page-configs/shop.conf
nav.html
hero-shop.html
product-grid.html
# Add or remove sections here
footer.html
```

---

## Troubleshooting

### Sections look unstyled in Elementor

1. Ensure `variables.css` is in WordPress Additional CSS
2. Check that Google Fonts (Poppins) is loaded
3. Verify you copied the `<style>` block along with the HTML

### Navigation hamburger menu doesn't work

The `nav.html` template includes inline JavaScript. Ensure you copied the `<script>` block at the end of the file.

### Build script fails

1. Ensure scripts are executable: `chmod +x scripts/*.sh`
2. Run from project root directory
3. Check that config files exist in `templates/page-configs/`

### fswatch auto-rebuild not working

Install fswatch: `brew install fswatch`

Without fswatch, you need to run `./scripts/build-pages.sh` manually after changes.

---

## CSS Class Naming Convention

All template classes use the `tib-` prefix (Think In Bits) to avoid conflicts with WordPress themes:

- `tib-navbar` - Navigation
- `tib-hero` - Hero sections
- `tib-section` - Content sections
- `tib-card` - Card components
- `tib-btn` - Buttons
- `--tib-*` - CSS variables

This namespacing ensures your embedded sections don't conflict with theme styles.

---

## Support

For questions or issues, contact the Business Club development team.
