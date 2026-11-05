import { chromium, type Browser } from "playwright";

// The browser the UI tools drive. On Amali's Mac that is the installed Google Chrome (no
// browser download into ~/Library/Caches). Elsewhere (CI, a cloud container) point
// BITBLITZ_CHROME at any Chromium binary that matches this Playwright version closely enough.
// BITBLITZ_CHROME_ARGS adds browser flags, e.g. "--no-proxy-server" on a machine whose
// outbound proxy would otherwise carry the browser's requests to the LAN address.

export function launchBrowser(): Promise<Browser> {
  const executablePath = process.env.BITBLITZ_CHROME;
  const args = (process.env.BITBLITZ_CHROME_ARGS ?? "").split(" ").filter(Boolean);
  return executablePath ? chromium.launch({ executablePath, headless: true, args }) : chromium.launch({ channel: "chrome", headless: true, args });
}
