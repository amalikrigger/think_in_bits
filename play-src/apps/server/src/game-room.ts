import { DurableObject } from "cloudflare:workers";
import { createGame, nextDeadline, resultsCsv, step, type EngineEvent, type GameState, type OutgoingMessage } from "@bitblitz/engine";
import { ClientMessage, type Quiz, type ServerMessage } from "@bitblitz/schema";
import { constantTimeEqualText, randomToken, sha256 } from "./auth";
import type { Env } from "./env";
import { spendMessage, type MessageBudget } from "./rate-limit";

// The shell around the pure engine, one instance per game. It owns everything the engine
// must not: sockets, the clock, persistence, alarms, random tokens and latency pings.

/** Games and their nicknames are deleted after this long without activity. */
const IDLE_EXPIRY_MS = 6 * 60 * 60 * 1000;
const MEDIA_MAX_BYTES = 1024 * 1024;
const MEDIA_MAX_FILES = 40;
const MEDIA_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml"]);
/** The largest legitimate client message (a settings patch) is a few hundred bytes. */
const MESSAGE_MAX_BYTES = 8 * 1024;

/** WebSocket close codes. The web app treats 4000–4003 as final and does not reconnect after them. */
const CLOSE = { expired: 4000, authFailed: 4001, kicked: 4003, flooding: 4008, tooBig: 1009 } as const;

/** Events caused by a person's message. Only these count as activity for the 6 h idle expiry. */
const ACTIVITY_EVENTS = new Set<EngineEvent["type"]>(["join", "resume", "answer", "latency", "host_connected", "host_command"]);

type Attachment =
  | { role: "pending"; connectionId: string }
  | { role: "host"; connectionId: string }
  | { role: "player"; connectionId: string; playerId: string };

type Stored = { state: GameState; hostKeyHash: string; expiresAt: number };

export type InitResult = { ok: true; hostKey: string } | { ok: false; reason: "in_use" };
export type GameInfo =
  | { exists: false }
  | { exists: true; title: string; phase: GameState["phase"]; joinable: boolean; locked: boolean; generatedNicknames: boolean };

export class GameRoom extends DurableObject<Env> {
  private stored: Stored | null = null;
  /** Ping id → send time, per connection. In memory only: losing it just skips a sample. */
  private pings = new Map<string, Map<number, number>>();
  /** Starts at a random offset so a pong from before a hibernation cannot match a fresh ping. */
  private pingSeq = crypto.getRandomValues(new Uint32Array(1))[0]! % 1_000_000_000;
  /** Per-connection message budget. In memory only: waking from hibernation simply refills it. */
  private budgets = new Map<string, MessageBudget>();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.stored = (await ctx.storage.get<Stored>("game")) ?? null;
      await this.reconcileConnections();
    });
  }

  // ---------- RPC from the Worker ----------

  async init(quiz: Quiz, code: string): Promise<InitResult> {
    // The slow work comes first so that the in-use check and the claim below run with no await
    // between them: two create requests that drew the same code cannot both claim it.
    const hostKey = randomToken();
    const hostKeyHash = await sha256(hostKey);
    const seed = crypto.getRandomValues(new Uint32Array(1))[0]!;
    const now = Date.now();
    if (this.stored && this.stored.expiresAt > now) return { ok: false, reason: "in_use" };
    for (const ws of this.ctx.getWebSockets()) ws.close(CLOSE.expired, "game expired");
    this.pings.clear();
    this.budgets.clear();
    this.stored = { state: createGame(quiz, { code, seed }), hostKeyHash, expiresAt: now + IDLE_EXPIRY_MS };
    await this.ctx.storage.deleteAll();
    await this.persist();
    return { ok: true, hostKey };
  }

  async info(): Promise<GameInfo> {
    const game = this.live();
    if (!game) return { exists: false };
    const { state } = game;
    const over = state.phase === "podium" || state.phase === "ended";
    const joinable = !over && !state.settings.locked && (state.phase === "lobby" || state.settings.lateJoin);
    return {
      exists: true,
      title: state.quiz.title,
      phase: state.phase,
      joinable,
      locked: state.settings.locked,
      generatedNicknames: state.settings.generatedNicknamesOnly,
    };
  }

  async isHostKey(hostKey: string): Promise<boolean> {
    const game = this.live();
    return game !== null && constantTimeEqualText(await sha256(hostKey), game.hostKeyHash);
  }

  async putMedia(name: string, contentType: string, bytes: ArrayBuffer): Promise<"ok" | "too_large" | "bad_type" | "too_many"> {
    if (!MEDIA_TYPES.has(contentType)) return "bad_type";
    if (bytes.byteLength > MEDIA_MAX_BYTES) return "too_large";
    const existing = await this.ctx.storage.list({ prefix: "media:" });
    if (existing.size >= MEDIA_MAX_FILES && !existing.has(`media:${name}`)) return "too_many";
    await this.ctx.storage.put(`media:${name}`, { contentType, bytes });
    return "ok";
  }

  async getMedia(name: string): Promise<{ contentType: string; bytes: ArrayBuffer } | null> {
    if (!this.live()) return null;
    return (await this.ctx.storage.get<{ contentType: string; bytes: ArrayBuffer }>(`media:${name}`)) ?? null;
  }

  async resultsCsv(): Promise<string | null> {
    const game = this.live();
    return game ? resultsCsv(game.state) : null;
  }

  // ---------- WebSockets (hibernation API) ----------

  override async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") return new Response("expected a WebSocket", { status: 426 });
    if (!this.live()) return new Response("game not found", { status: 404 });
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ role: "pending", connectionId: randomToken(12) } satisfies Attachment);
    return new Response(null, { status: 101, webSocket: client });
  }

  override async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    const attachment = ws.deserializeAttachment() as Attachment;

    // Cheapest checks first: every accepted message costs an engine step and a storage write.
    const spent = spendMessage(this.budgets.get(attachment.connectionId), Date.now());
    this.budgets.set(attachment.connectionId, spent.budget);
    if (!spent.allowed) {
      sendTo(ws, { type: "error", code: "rate_limited", message: "too many messages; slow down" });
      return ws.close(CLOSE.flooding, "too many messages");
    }
    const size = typeof raw === "string" ? raw.length : raw.byteLength;
    if (size > MESSAGE_MAX_BYTES) {
      sendTo(ws, { type: "error", code: "bad_message", message: "message too large" });
      return ws.close(CLOSE.tooBig, "message too large");
    }
    if (!this.live()) {
      sendTo(ws, { type: "error", code: "game_not_found", message: "this game has ended" });
      return ws.close(CLOSE.expired, "game expired");
    }

    let parsed: ReturnType<typeof ClientMessage.safeParse>;
    try {
      parsed = ClientMessage.safeParse(JSON.parse(typeof raw === "string" ? raw : new TextDecoder().decode(raw)));
    } catch {
      return sendTo(ws, { type: "error", code: "bad_message", message: "messages must be JSON" });
    }
    if (!parsed.success) return sendTo(ws, { type: "error", code: "bad_message", message: "unrecognised message" });
    const message = parsed.data;

    switch (message.type) {
      case "host_auth": {
        // A socket that is already a player keeps its seat: it cannot be rebound as the host.
        if (attachment.role === "player") return;
        if (!(await this.isHostKey(message.key))) {
          sendTo(ws, { type: "error", code: "auth_failed", message: "host key not accepted" });
          return ws.close(CLOSE.authFailed, "auth failed");
        }
        ws.serializeAttachment({ role: "host", connectionId: attachment.connectionId } satisfies Attachment);
        await this.apply({ type: "host_connected" });
        const media = await this.ctx.storage.list({ prefix: "media:" });
        return sendTo(ws, { type: "media", names: [...media.keys()].map((k) => k.slice("media:".length)) });
      }
      case "join":
        if (attachment.role !== "pending") return;
        return this.apply({ type: "join", connectionId: attachment.connectionId, nickname: message.nickname, token: randomToken() });
      case "resume":
        if (attachment.role !== "pending") return;
        return this.apply({ type: "resume", connectionId: attachment.connectionId, token: message.token });
      case "answer":
        if (attachment.role !== "player") return sendTo(ws, notAuthenticated());
        return this.apply({ type: "answer", playerId: attachment.playerId, questionIndex: message.questionIndex, choice: message.choice });
      case "pong": {
        const sentAt = this.pings.get(attachment.connectionId)?.get(message.id);
        if (attachment.role !== "player" || sentAt === undefined) return;
        this.pings.get(attachment.connectionId)!.delete(message.id);
        return this.apply({ type: "latency", playerId: attachment.playerId, rttMs: Date.now() - sentAt });
      }
      case "command":
        if (attachment.role !== "host") return sendTo(ws, notAuthenticated());
        return this.apply({ type: "host_command", command: message.command });
    }
  }

  override async webSocketClose(ws: WebSocket): Promise<void> {
    await this.dropSocket(ws);
  }

  override async webSocketError(ws: WebSocket): Promise<void> {
    await this.dropSocket(ws);
  }

  override async alarm(): Promise<void> {
    const game = this.stored;
    if (!game) return;
    if (Date.now() >= game.expiresAt) {
      for (const ws of this.ctx.getWebSockets()) ws.close(CLOSE.expired, "game expired");
      this.stored = null;
      this.pings.clear();
      this.budgets.clear();
      await this.ctx.storage.deleteAll();
      await this.ctx.storage.deleteAlarm();
      return;
    }
    await this.apply({ type: "tick" });
  }

  // ---------- engine plumbing ----------

  private async apply(event: EngineEvent): Promise<void> {
    const game = this.live();
    if (!game) return;
    const now = Date.now();
    const before = game.state.phase;
    const { state, messages } = step(game.state, event, now);
    game.state = state;
    // A timer firing or a socket dropping must not keep a forgotten game alive.
    if (ACTIVITY_EVENTS.has(event.type)) game.expiresAt = now + IDLE_EXPIRY_MS;
    await this.persist();
    const orphans = this.deliver(messages);
    // Fresh latency samples for everyone right before answers open and after each reveal, and
    // for a newcomer alone on join or resume: pinging the whole room on every join would turn a
    // class arriving together into an n² storm of pongs.
    if (state.phase !== before && (state.phase === "countdown" || state.phase === "reveal")) this.pingPlayers();
    if (event.type === "join" || event.type === "resume") this.pingPlayers(event.connectionId);
    // A player whose socket went away before its welcome could be delivered starts offline,
    // instead of counting as "connected" and holding up "everyone has answered".
    for (const playerId of orphans) await this.apply({ type: "disconnect", playerId });
  }

  /** Sends each message to its sockets; returns players welcomed on a socket that no longer exists. */
  private deliver(messages: OutgoingMessage[]): string[] {
    const sockets = this.ctx.getWebSockets().map((ws) => ({ ws, a: ws.deserializeAttachment() as Attachment }));
    const orphans: string[] = [];
    for (const { to, message } of messages) {
      if (to.kind === "connection" && message.type === "welcome") {
        // The engine accepted this socket as a player: remember who it is.
        const target = sockets.find((s) => s.a.connectionId === to.connectionId);
        if (target) {
          target.a = { role: "player", connectionId: to.connectionId, playerId: message.playerId };
          target.ws.serializeAttachment(target.a);
        } else {
          orphans.push(message.playerId);
        }
      }
      for (const { ws, a } of sockets) {
        const match =
          (to.kind === "host" && a.role === "host") ||
          (to.kind === "player" && a.role === "player" && a.playerId === to.playerId) ||
          (to.kind === "connection" && a.connectionId === to.connectionId);
        if (!match) continue;
        sendTo(ws, message);
        if (message.type === "kicked") ws.close(CLOSE.kicked, "removed by the teacher");
      }
    }
    return orphans;
  }

  /** Pings every player socket, or only the one with `onlyConnectionId`. */
  private pingPlayers(onlyConnectionId?: string): void {
    const now = Date.now();
    for (const ws of this.ctx.getWebSockets()) {
      const a = ws.deserializeAttachment() as Attachment;
      if (a.role !== "player") continue;
      if (onlyConnectionId !== undefined && a.connectionId !== onlyConnectionId) continue;
      const id = ++this.pingSeq;
      const pending = this.pings.get(a.connectionId) ?? new Map<number, number>();
      pending.set(id, now);
      this.pings.set(a.connectionId, pending);
      sendTo(ws, { type: "ping", id });
    }
  }

  private async dropSocket(ws: WebSocket): Promise<void> {
    const a = ws.deserializeAttachment() as Attachment | null;
    if (!a) return;
    this.pings.delete(a.connectionId);
    this.budgets.delete(a.connectionId);
    if (a.role !== "player") return;
    if (!this.playerHasSocket(a.playerId, ws)) await this.apply({ type: "disconnect", playerId: a.playerId });
  }

  /** Whether any socket other than `except` (a newer tab, say) still holds this player. */
  private playerHasSocket(playerId: string, except?: WebSocket): boolean {
    return this.ctx.getWebSockets().some((other) => {
      if (other === except) return false;
      const a = other.deserializeAttachment() as Attachment | null;
      return a?.role === "player" && a.playerId === playerId;
    });
  }

  /**
   * After an eviction or a restart the saved state may still say "connected" for players whose
   * sockets are gone (hibernated sockets survive and are listed; evicted ones are not). Left
   * alone, such a player would hold up "everyone has answered" until the clock ran out.
   */
  private async reconcileConnections(): Promise<void> {
    const game = this.live();
    if (!game) return;
    for (const player of Object.values(game.state.players)) {
      if (player.connected && !this.playerHasSocket(player.id)) await this.apply({ type: "disconnect", playerId: player.id });
    }
  }

  private live(): Stored | null {
    return this.stored && this.stored.expiresAt > Date.now() ? this.stored : null;
  }

  private async persist(): Promise<void> {
    if (!this.stored) return;
    await this.ctx.storage.put("game", this.stored);
    const deadline = nextDeadline(this.stored.state);
    await this.ctx.storage.setAlarm(Math.min(deadline ?? Number.POSITIVE_INFINITY, this.stored.expiresAt));
  }
}

function sendTo(ws: WebSocket, message: ServerMessage): void {
  try {
    ws.send(JSON.stringify(message));
  } catch {
    // The socket closed between lookup and send; the close handler will tidy up.
  }
}

function notAuthenticated(): ServerMessage {
  return { type: "error", code: "not_authenticated", message: "join or authenticate first" };
}
