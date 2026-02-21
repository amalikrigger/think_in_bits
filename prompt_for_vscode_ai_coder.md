# Prompt for VS Code AI Coder

**Role:** You are an expert Frontend Web Developer and UI/UX Designer.  
**Task:** Create a multi-page website for Think In Bits based on the design language found in `#file:index.html`.

---

## Phase 1: Strategic Planning

Before writing code, please provide a detailed plan that outlines:

- **Architecture:** How you will split the current prototype into a modular multi-page system.
- **Design System:** How you will implement CSS variables for brand colors (Primary, Secondary, Surface, Background) to ensure easy "one-click" theme changes.
- **File Structure:** A map of the proposed directory (including the `/projects/` folder for games).
- **Component Breakdown:** Identification of shared components (Navigation, Footer).

---

## Phase 2: Implementation Requirements

### 1. Design System & Global Styles

- **Vanilla Stack:** Use only standard HTML5, CSS3, and Vanilla JavaScript.
- **Theming:** Extract the "Cyberpunk/Tech" aesthetic from `#file:index.html` (dark backgrounds, neon accents, glassmorphism).
- **Brand Variables:** Define a `:root` CSS block with variables for:
  - `--primary-color` (currently `#00e5ff`)
  - `--secondary-color` (currently `#b0b0b0`)
  - `--bg-color` (currently `#0a0a0a`)
  - `--surface-color` (currently `#1a1a1a`)
- **Responsiveness:** Ensure the site is fully mobile-responsive using Flexbox and Grid.

### 2. Page Specifications

#### A. Home Page (`index.html`)

- **Hero Section:** A high-impact, visually stunning introduction. Use gradients, subtle animations, or a grid-pattern background similar to the prototype.
- **3D Print Promo:** A featured section highlighting the 3D printing service with a CTA button leading to the Shop page.
- **Games/Projects Promo:** A section showcasing that students create games in CS class, leading to the Projects page.
- **Blog Preview:** A clean "Latest News" section.
- **About Preview:** A brief, attractive "Who We Are" snippet.

#### B. 3D Prints Page (`shop.html`)

- This page should mirror the layout and functionality of the original `#file:index.html`.
- Maintain the Google Form integration for custom quotes.
- Display the product grid for "Ready-made" prints.

#### C. Games & Projects Page (`projects.html`)

- **Navigation:** A grid or list view of games located in the `/projects/` directory.
- **Project Cards:** Each card must display:
  - Game Title & Creator Name.
  - A "Play Now" or "View Project" link.
  - Creator Email.
  - A "Feedback" link (can be a `mailto:` or a simple placeholder link).
- **Visuals:** Use a consistent card design that matches the 3D print product cards.

#### D. Blog & News Page (`blog.html`)

- A dedicated space for updates and excitement.
- Use a clean, readable typography-focused layout.

#### E. About Us Page (`about.html`)

- An expanded version of the about section.
- Focus on "Precision, Quality, and Innovation."
- Include a "Meet the Team" or "Our Mission" visual layout.

### 3. Navigation & Interactivity

- Implement a consistent Header/Navigation bar across all pages.
- Ensure smooth transitions between pages.
- Maintain the "Smooth Scroll" behavior for any anchor links.

---

## Phase 3: Execution

Once the plan is approved, proceed to generate the files. Start by creating the global CSS file with the variable system, then move to the individual HTML pages.
