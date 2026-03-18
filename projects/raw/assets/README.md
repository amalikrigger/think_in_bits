# Raw 🍣 — Assets Guide

## Project Overview

Raw is a static single-page application (SPA) inspired by Tinder — but for sushi. Users swipe through sushi dishes, liking or passing on each one, with the goal of finding their perfect roll. The app requires no backend or build step; it runs entirely in the browser, served over a local HTTP server.

## Where to Place Images

All sushi images live in the `assets/sushi/` folder. Images must be named using their numeric ID corresponding to the entry in `data/sushi.json`:

```
assets/sushi/1.jpg
assets/sushi/2.jpg
...
assets/sushi/47.jpg
```

The filename (without extension) must match the `id` field of the sushi entry in `data/sushi.json`. Do not use subdirectories inside `assets/sushi/`.

## Recommended Image Specs

| Property     | Recommendation                        |
|--------------|---------------------------------------|
| Aspect Ratio | 3:4 (portrait) or 4:3 (landscape)     |
| Min Size     | 600×800px                             |
| Format       | JPG / JPEG only                       |
| File Size    | Under 1MB for fast loading            |

Consistent aspect ratios ensure the card UI renders cleanly without cropping or stretching. Oversized files will slow down the swipe experience.

## How to Update sushi.json

The data file is located at `data/sushi.json`. Each entry has an `image` field that points to the image file relative to the project root:

```json
{
  "id": 1,
  "name": "Spicy Tuna Roll",
  "description": "A classic roll with a kick.",
  "image": "assets/sushi/1.jpg"
}
```

To update an image, replace the file at `assets/sushi/<id>.jpg` and ensure the `image` field in the corresponding JSON entry still points to the correct path. Do not change the path format.

## How to Add New Sushi Items

Follow these steps to add a new sushi item to the app:

1. **Add the image** — Place the new image in `assets/sushi/` using the next available numeric filename (e.g., `48.jpg`).
2. **Open `data/sushi.json`** — Append a new entry to the JSON array following this schema:

```json
{
  "id": 48,
  "name": "Your Sushi Name",
  "description": "A short, appetizing description.",
  "image": "assets/sushi/48.jpg"
}
```

3. **Verify the `id`** — The `id` must be unique and match the image filename (without extension).
4. **Reload the app** — Refresh the browser; the new item will appear in the swipe deck.

### sushi.json Schema

| Field         | Type   | Required | Description                              |
|---------------|--------|----------|------------------------------------------|
| `id`          | number | yes      | Unique integer; matches image filename   |
| `name`        | string | yes      | Display name of the sushi item           |
| `description` | string | yes      | Short description shown on the card      |
| `image`       | string | yes      | Relative path: `assets/sushi/<id>.jpg`   |

## How to Run the App

### Option A — Recommended: Python HTTP Server

```bash
python3 -m http.server 8080
```

Then open your browser to: [http://localhost:8080](http://localhost:8080)

Run this command from the project root (the directory containing `index.html`).

### Option B — VS Code Live Server Extension

1. Install the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension in VS Code.
2. Right-click `index.html` in the Explorer and select **Open with Live Server**.
3. The app will open automatically in your default browser.

> ⚠️ **WARNING:** Do **not** open `index.html` directly via `file://` (e.g., by double-clicking it in Finder). The app uses `fetch()` to load `data/sushi.json`, which browsers block under `file://` due to CORS restrictions. The app will silently fail to load any sushi data.

## Project File Structure

```
/
├── index.html
├── styles.css
├── app.js
├── data/
│   └── sushi.json
├── assets/
│   ├── sushi/        ← place images here (1.jpg – 47.jpg)
│   └── README.md
└── docs/
    └── tasks/        ← orchestration task files
```
