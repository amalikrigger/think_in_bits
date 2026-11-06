import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { isType } from "../../../tools/lib/client";
import { signSession } from "../src/auth";
import { hostGame, sampleQuiz, startServer, type TestServer } from "./harness";

// What a deployed server must hold to (SHIP_READINESS gates A and B): every response carries
// the security headers, the health check names the deployed commit, and every way of acting
// as a host without the right credential fails.

let server: TestServer;
beforeAll(async () => {
  server = await startServer({ vars: { BUILD_SHA: "abc1234" } });
}, 60_000);
afterAll(async () => {
  await server?.close();
});

const quiz = sampleQuiz("smoke-test");

describe("deployment traceability and headers", () => {
  it("reports the deployed commit on the health check", async () => {
    const health = (await (await fetch(`${server.api}/api/health`)).json()) as { ok: boolean; version: string };
    expect(health).toEqual({ ok: true, version: "abc1234" });
  });

  it.each([
    ["the health check", "/api/health", "GET"],
    ["an unknown route", "/api/nope", "GET"],
    ["a refused login", "/api/host/login", "POST"],
  ])("sets the security headers on %s", async (_label, path, method) => {
    const response = await fetch(`${server.api}${path}`, { method, body: method === "POST" ? "{}" : undefined });
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("Referrer-Policy")).toBe("no-referrer");
    expect(response.headers.get("Strict-Transport-Security")).toContain("max-age=");
    expect(response.headers.get("Content-Security-Policy")).toContain("default-src 'none'");
  });
});

describe("acting as a host without the right credential fails", () => {
  const create = (authorization?: string) =>
    fetch(`${server.api}/api/games`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(authorization ? { Authorization: authorization } : {}) },
      body: JSON.stringify({ quiz }),
    });

  it("refuses to create a game with no token, a forged token, or an expired one", async () => {
    const expired = await signSession(server.sessionSecret, Date.now() - 1000);
    const forged = await signSession("not-the-server-secret-but-32-chars-long", Date.now() + 60_000);
    const statuses = await Promise.all([create(), create("Bearer nonsense"), create(`Bearer ${expired}`), create(`Bearer ${forged}`)].map(async (r) => (await r).status));
    expect(statuses).toEqual([401, 401, 401, 401]);
  });

  it("refuses one game's host key on another game", async () => {
    const a = await hostGame(server, quiz);
    const b = await hostGame(server, quiz);

    const impostor = server.client.connect(b.code);
    await impostor.opened();
    impostor.send({ type: "host_auth", key: a.hostKey });
    expect((await impostor.waitFor(isType("error"))).code).toBe("auth_failed");

    const media = await fetch(`${server.api}/api/games/${b.code}/media/x.svg`, {
      method: "PUT",
      headers: { "X-Host-Key": a.hostKey, "Content-Type": "image/svg+xml" },
      body: "<svg xmlns='http://www.w3.org/2000/svg'/>",
    });
    const results = await fetch(`${server.api}/api/games/${b.code}/results.csv`, { headers: { "X-Host-Key": a.hostKey } });
    expect([media.status, results.status]).toEqual([401, 401]);
    for (const c of [a.host, b.host, impostor]) c.close();
  }, 30_000);
});
