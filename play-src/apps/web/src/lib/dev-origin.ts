// The game server only accepts browser origins it knows, and in dev those are localhost and
// 127.0.0.1. A phone on the classroom Wi-Fi loads the page from http://<mac-LAN-IP>:5173,
// an address that changes with the network, so its requests reach the server through the
// Vite proxy with an Origin the server would refuse.
//
// A request whose Origin is the same address it was sent to came from a page this dev
// server served, so the proxy passes it on as the dev origin. A request from any other
// site keeps its own Origin, and the server still refuses it.

/** The Origin to forward for a proxied request, or null to leave it unchanged. */
export function devProxyOrigin(origin: string | undefined, host: string | undefined, devOrigin: string): string | null {
  if (!origin || !host) return null;
  return origin === `http://${host}` ? devOrigin : null;
}
