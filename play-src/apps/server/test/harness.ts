import { readFileSync } from "node:fs";
import type { HostView, PlayerView, QuizInput, ServerMessage } from "@bitblitz/schema";
import { createTestHarness } from "wrangler";
import { hashPassphrase, randomToken } from "../src/auth";
import { BitBlitzClient, Connection, isType } from "../../../tools/lib/client";

// Boots the real Worker and Durable Objects from wrangler.toml in-process (workerd via
// Miniflare), with test-only secrets, so integration tests need no `pnpm dev` and never read
// the developer's .dev.vars. Each test file gets its own server and its own storage.

export const TEST_PASSPHRASE = "integration-test-passphrase";

export type TestServer = { api: string; client: BitBlitzClient; sessionSecret: string; close: () => Promise<void> };

/** `vars` overrides wrangler.toml [vars] for this server only, e.g. a deployed BUILD_SHA. */
export async function startServer(options: { vars?: Record<string, string> } = {}): Promise<TestServer> {
  const sessionSecret = randomToken(32);
  const server = createTestHarness({
    root: new URL("..", import.meta.url).pathname,
    workers: [
      {
        configPath: "./wrangler.toml",
        vars: options.vars,
        secrets: { HOST_PASSPHRASE_HASH: await hashPassphrase(TEST_PASSPHRASE), SESSION_SECRET: sessionSecret },
      },
    ],
  });
  const { url } = await server.listen();
  const api = url.href.replace(/\/$/, "");
  return { api, client: new BitBlitzClient(api, TEST_PASSPHRASE), sessionSecret, close: () => server.close() };
}

export const sampleQuiz = (name: string): QuizInput =>
  JSON.parse(readFileSync(new URL(`../../../samples/${name}.json`, import.meta.url), "utf8"));

export type PlayerViewMessage = { type: "view"; view: PlayerView };
export type HostViewMessage = { type: "view"; view: HostView };
export const isPlayerView = (m: ServerMessage): m is PlayerViewMessage => m.type === "view" && m.view.role === "player";
export const isHostView = (m: ServerMessage): m is HostViewMessage => m.type === "view" && m.view.role === "host";

/** The next player view on this connection that matches. */
export async function nextPlayerView(connection: Connection, match: (view: PlayerView) => boolean, timeoutMs?: number): Promise<PlayerView> {
  const message = await connection.waitFor((m): m is PlayerViewMessage => isPlayerView(m) && match(m.view), timeoutMs);
  return message.view;
}

/** A logged-in host connection on a fresh game. */
export async function hostGame(server: TestServer, quiz: unknown) {
  const token = await server.client.hostToken();
  const { code, hostKey } = await server.client.createGame(token, quiz);
  const host = server.client.connect(code);
  await host.opened();
  host.send({ type: "host_auth", key: hostKey });
  await host.waitFor(isType("host_welcome"));
  return { code, hostKey, host, token };
}

/** A player who has joined and been welcomed. */
export async function joinAs(server: TestServer, code: string, nickname: string) {
  const player = server.client.connect(code);
  await player.opened();
  player.send({ type: "join", nickname });
  const welcome = await player.waitFor(isType("welcome"));
  return { player, welcome };
}

export type { Connection };
