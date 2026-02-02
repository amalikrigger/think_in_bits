# 🚀 Deploy to GitHub Pages Script

A fully automated bash script that deploys any static HTML/CSS/JS project to GitHub Pages, making it ready to embed in WordPress, Elementor, or any website.

## 📋 Table of Contents

1. [What This Script Does](#what-this-script-does)
2. [Prerequisites](#prerequisites)
3. [Installation](#installation)
4. [Usage](#usage)
5. [Step-by-Step Explanation](#step-by-step-explanation)
6. [Configuration](#configuration)
7. [Troubleshooting](#troubleshooting)
8. [Updating Your Site](#updating-your-site)

---

## What This Script Does

This script automates the entire GitHub Pages deployment process:

| Step | Action | Description |
|------|--------|-------------|
| 1 | **Check Prerequisites** | Verifies git, GitHub CLI, and authentication |
| 2 | **Create .gitignore** | Excludes unnecessary files (node_modules, editor files, etc.) |
| 3 | **Initialize Git** | Sets up a git repository with `main` branch |
| 4 | **Commit Files** | Stages and commits all production files |
| 5 | **Create GitHub Repo** | Creates a new public repository on GitHub |
| 6 | **Push Code** | Uploads all files to GitHub |
| 7 | **Enable GitHub Pages** | Configures the repo to serve as a website |
| 8 | **Generate Embed Code** | Provides ready-to-use iframe code for WordPress |

---

## Prerequisites

Before running the script, ensure you have:

### Required
- **macOS** or **Linux** operating system
- **Homebrew** (for macOS) - Install from [brew.sh](https://brew.sh)
- **Git** - Usually pre-installed on macOS
- **GitHub Account** - Sign up at [github.com](https://github.com)

### Automatically Installed by Script
- **GitHub CLI (gh)** - Will be installed if missing

---

## Installation

### Option 1: Copy to Your Project

1. Create a `scripts` folder in your project:
   ```bash
   mkdir scripts
   ```

2. Copy the script into your project:
   ```bash
   cp /path/to/deploy-to-github-pages.sh scripts/
   ```

3. Make it executable:
   ```bash
   chmod +x scripts/deploy-to-github-pages.sh
   ```

### Option 2: Use from Any Location

1. Copy to a central location:
   ```bash
   cp deploy-to-github-pages.sh /usr/local/bin/deploy-gh-pages
   chmod +x /usr/local/bin/deploy-gh-pages
   ```

2. Run from any project folder:
   ```bash
   cd /path/to/your/project
   deploy-gh-pages my_repo_name
   ```

---

## Usage

### Basic Usage

```bash
# Navigate to your project folder (must contain index.html)
cd /path/to/your/project

# Run the script with your desired repository name
./scripts/deploy-to-github-pages.sh your_repo_name
```

### Example

```bash
cd ~/Projects/my-website
./scripts/deploy-to-github-pages.sh awesome_website
```

**Output:** Your site will be live at `https://YOUR_USERNAME.github.io/awesome_website/`

---

## Step-by-Step Explanation

### Step 1: Prerequisites Check

```
▶ Step 1: Checking prerequisites...
✔ Found index.html
✔ Homebrew is installed
✔ Git is installed
✔ GitHub CLI is installed
✔ Authenticated as: your_username
```

**What happens:**
- Verifies `index.html` exists (your main entry file)
- Checks if required tools are installed
- If GitHub CLI is missing, offers to install it
- If not logged in, prompts for GitHub authentication

### Step 2: Create .gitignore

```
▶ Step 2: Creating .gitignore file...
✔ .gitignore created
```

**What happens:**
- Creates a `.gitignore` file that excludes:
  - OS files (`.DS_Store`, `Thumbs.db`)
  - Editor files (`.idea/`, `.vscode/`, `*.swp`)
  - Documentation folders (`docs/`)
  - Node modules (`node_modules/`)
  - Backup files (`*_backup.html`)
  - Temporary files (`*.tmp`, `*.log`)

**Why this matters:** Keeps your repository clean by only pushing production files.

### Step 3: Initialize Git

```
▶ Step 3: Initializing Git repository...
✔ Git repository initialized
✔ Branch renamed to 'main'
```

**What happens:**
- Runs `git init` to create a repository
- Renames the default branch to `main` (GitHub's standard)

### Step 4: Commit Files

```
▶ Step 4: Staging and committing files...
ℹ Files to be committed:
 A .gitignore
 A index.html
 A css/styles.css
 A js/main.js
 ...
Proceed with commit? (y/n): y
✔ Files committed
```

**What happens:**
- Stages all files with `git add .`
- Shows you what will be committed
- Asks for confirmation before committing
- Creates initial commit

### Step 5: Create GitHub Repository

```
▶ Step 5: Creating GitHub repository...
✓ Created repository your_username/your_repo_name on github.com
✔ Repository created: https://github.com/your_username/your_repo_name
```

**What happens:**
- Uses GitHub CLI to create a new **public** repository
- Automatically sets up the remote connection
- If repo already exists, offers to use it

### Step 6: Push to GitHub

```
▶ Step 6: Pushing code to GitHub...
Enumerating objects: 88, done.
Writing objects: 100% (88/88), done.
✔ Code pushed to GitHub
```

**What happens:**
- Pushes all committed files to GitHub
- Sets up tracking for the `main` branch

### Step 7: Enable GitHub Pages

```
▶ Step 7: Enabling GitHub Pages...
✔ GitHub Pages enabled
ℹ Waiting for deployment...
ℹ Build status: built (attempt 3/30)...
✔ Site deployed successfully!
```

**What happens:**
- Enables GitHub Pages via API
- Configures it to serve from `main` branch root
- Waits for the build to complete (up to 2.5 minutes)

### Step 8: Display Results

```
╔════════════════════════════════════════════════════════════════╗
║  🎉 Deployment Complete!
╚════════════════════════════════════════════════════════════════╝

Your site is live at:
https://your_username.github.io/your_repo_name/
```

**What happens:**
- Shows your live site URL
- Displays the GitHub repository URL
- Generates iframe embed code for WordPress/Elementor
- Saves all info to `DEPLOYMENT_INFO.md`

---

## Configuration

### Customizing the .gitignore

Edit the `GITIGNORE_CONTENT` variable at the top of the script:

```bash
GITIGNORE_CONTENT='# Your custom ignore patterns
node_modules/
.env
*.log
'
```

### Common Files to Exclude

| Pattern | Description |
|---------|-------------|
| `node_modules/` | NPM packages (large, can be reinstalled) |
| `.env` | Environment variables (sensitive) |
| `docs/` | Documentation (not needed for production) |
| `*.log` | Log files |
| `.DS_Store` | macOS folder metadata |
| `.idea/` | JetBrains IDE settings |
| `.vscode/` | VS Code settings |

---

## Troubleshooting

### "No index.html found"
**Problem:** The script requires an `index.html` file as the entry point.
**Solution:** Make sure you're running the script from your project root folder.

### "Not authenticated with GitHub"
**Problem:** GitHub CLI needs to be logged in.
**Solution:** The script will prompt you to log in. Follow the browser authentication flow.

### "Repository already exists"
**Problem:** A repo with that name already exists on your GitHub.
**Solution:** Choose a different name, or confirm to use the existing repo.

### "Build status: building" (stuck)
**Problem:** GitHub Pages build is taking longer than usual.
**Solution:** Wait a few minutes and check the URL manually. First deployments can take up to 10 minutes.

### Site shows 404 error
**Problem:** GitHub Pages hasn't finished deploying yet.
**Solution:** Wait 2-5 minutes and refresh. Check repository Settings → Pages for status.

---

## Updating Your Site

After making local changes to your files, update the live site with:

```bash
# Stage all changes
git add .

# Commit with a descriptive message
git commit -m "Update: Added new feature"

# Push to GitHub
git push
```

**Timeline:** Changes go live within 1-2 minutes after pushing.

### Quick One-Liner

```bash
git add . && git commit -m "Update site" && git push
```

---

## Generated Files

After running the script, you'll have:

| File | Purpose |
|------|---------|
| `.gitignore` | Tells git which files to ignore |
| `.git/` | Git repository data (hidden folder) |
| `DEPLOYMENT_INFO.md` | Contains your URLs and embed codes |

---

## Iframe Embed Examples

### Full Featured Embed
```html
<iframe 
  src="https://username.github.io/repo_name/" 
  width="100%" 
  height="800" 
  frameborder="0" 
  style="border: none; border-radius: 8px;"
  title="My Website"
  loading="lazy">
</iframe>
```

### Responsive Embed (Elementor)
```html
<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden;">
  <iframe 
    src="https://username.github.io/repo_name/" 
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;"
    loading="lazy">
  </iframe>
</div>
```

### Specific Page Embed
```html
<iframe src="https://username.github.io/repo_name/shop.html" width="100%" height="600" frameborder="0"></iframe>
```

---

## Security Notes

- The script creates **public** repositories (required for free GitHub Pages)
- Never commit sensitive data (passwords, API keys, `.env` files)
- The `.gitignore` automatically excludes common sensitive files
- Use environment variables for any secrets

---

## License

MIT License - Feel free to modify and reuse this script.
