import { chromium, type Browser } from "playwright";

// The browser the UI tools drive. On Amali's Mac that is the installed Google Chrome (no
// browser download into ~/Library/Caches). Elsewhere (CI, a cloud container) point
// BITBLITZ_CHROME at any Chromium binary that matches this Playwright version closely enough.

export function launchBrowser(): Promise<Browser> {
  const executablePath = process.env.BITBLITZ_CHROME;
  return executablePath ? chromium.launch({ executablePath, headless: true }) : chromium.launch({ channel: "chrome", headless: true });
}
