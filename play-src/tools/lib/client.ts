import type { ClientMessage, HostCommand, HostView, PlayerView, ServerMessage } from "@bitblitz/schema";

// A minimal BitBlitz client for scripts (smoke test, bot load). Uses Node's built-in
// WebSocket and answers latency pings automatically, like the real web app.

export const API = process.env.BITBLITZ_API ?? "http://127.0.0.1:8787";
export const DEV_PASSPHRASE = process.env.BITBLITZ_PASSPHRASE ?? "bitblitz-dev";

/** The HTTP side of one game server. The integration tests point it at their own in-process server. */
export class BitBlitzClient {
  constructor(
    readonly api: string,
    private readonly passphrase: string,
  ) {}

  login(passphrase = this.passphrase, headers: Record<string, string> = {}): Promise<Response> {
    return fetch(`${this.api}/api/host/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ passphrase }),
    });
  }

  async hostToken(): Promise<string> {
    const response = await this.login();
    if (!response.ok) throw new Error(`login failed: ${response.status} ${await response.text()}`);
    return ((await response.json()) as { token: string }).token;
  }

  async createGame(token: string, quiz: unknown): Promise<{ code: string; hostKey: string }> {
    const response = await fetch(`${this.api}/api/games`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ quiz }),
    });
    if (response.status !== 201) throw new Error(`create failed: ${response.status} ${await response.text()}`);
    return (await response.json()) as { code: string; hostKey: string };
  }

  connect(code: string): Connection {
    return new Connection(code, this.api);
  }
}

// The scripts (smoke test, bot load, video) talk to the dev server.
const devServer = new BitBlitzClient(API, DEV_PASSPHRASE);
export const login = (passphrase?: string, headers?: Record<string, string>) => devServer.login(passphrase, headers);
export const hostToken = () => devServer.hostToken();
export const createGame = (token: string, quiz: unknown) => devServer.createGame(token, quiz);

type Waiter = { match: (m: ServerMessage) => boolean; resolve: (m: ServerMessage) => void; reject: (e: Error) => void };

export class Connection {
  readonly received: { at: number; message: ServerMessage }[] = [];
  private readonly socket: WebSocket;
  private waiters: Waiter[] = [];
  private listeners = new Set<(m: ServerMessage) => void>();
  private closeListeners = new Set<(code: number) => void>();
  private openPromise: Promise<void>;
  closed = false;
  closeCode: number | null = null;

  constructor(code: string, api = API) {
    this.socket = new WebSocket(`${api.replace(/^http/, "ws")}/api/games/${code}/ws`);
    this.openPromise = new Promise((resolve, reject) => {
      this.socket.addEventListener("open", () => resolve(), { once: true });
      this.socket.addEventListener("error", () => reject(new Error("socket error")), { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data)) as ServerMessage;
      this.received.push({ at: performance.now(), message });
      if (message.type === "ping") this.send({ type: "pong", id: message.id });
      for (const listener of this.listeners) listener(message);
      for (const waiter of [...this.waiters]) {
        if (waiter.match(message)) {
          this.waiters = this.waiters.filter((w) => w !== waiter);
          waiter.resolve(message);
        }
      }
    });
    this.socket.addEventListener("close", (event) => {
      this.closed = true;
      this.closeCode = event.code;
      for (const listener of this.closeListeners) listener(event.code);
      for (const waiter of this.waiters) waiter.reject(new Error(`socket closed (${event.code})`));
      this.waiters = [];
    });
  }

  onMessage(listener: (m: ServerMessage) => void): void {
    this.listeners.add(listener);
  }

  onClose(listener: (code: number) => void): void {
    this.closeListeners.add(listener);
  }

  opened(): Promise<void> {
    return this.openPromise;
  }

  send(message: ClientMessage): void {
    this.socket.send(JSON.stringify(message));
  }

  /** Sends text as-is, for testing how the server treats input that is not a valid message. */
  sendRaw(text: string): void {
    this.socket.send(text);
  }

  /** Resolves with the close code once the socket closes. */
  whenClosed(timeoutMs = 10_000): Promise<number> {
    if (this.closed) return Promise.resolve(this.closeCode ?? -1);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`socket still open after ${timeoutMs} ms`)), timeoutMs);
      this.onClose((code) => {
        clearTimeout(timer);
        resolve(code);
      });
    });
  }

  command(command: HostCommand): void {
    this.send({ type: "command", command });
  }

  /** The latest view this connection received, or null before the first one. */
  lastView(): HostView | PlayerView | null {
    for (let i = this.received.length - 1; i >= 0; i--) {
      const message = this.received[i]!.message;
      if (message.type === "view") return message.view;
    }
    return null;
  }

  /** As the host, presses Next, Skip or Reveal now on the screen it is currently showing. */
  press(kind: "next" | "skip" | "reveal_now"): void {
    const view = this.lastView();
    if (view?.role !== "host") throw new Error("press() needs a host connection that has received a view");
    this.command({ kind, seen: { phase: view.phase, questionIndex: view.questionIndex } });
  }

  waitFor<T extends ServerMessage>(match: (m: ServerMessage) => m is T, timeoutMs?: number): Promise<T>;
  waitFor(match: (m: ServerMessage) => boolean, timeoutMs?: number): Promise<ServerMessage>;
  waitFor(match: (m: ServerMessage) => boolean, timeoutMs = 10_000): Promise<ServerMessage> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.waiters = this.waiters.filter((w) => w.resolve !== done);
        reject(new Error(`timed out waiting (${timeoutMs} ms)`));
      }, timeoutMs);
      const done = (m: ServerMessage) => {
        clearTimeout(timer);
        resolve(m);
      };
      this.waiters.push({ match, resolve: done, reject: (e) => (clearTimeout(timer), reject(e)) });
    });
  }

  /** Resolves once this connection is in `phase`: at once if its latest view already is. */
  waitForPhase(phase: string, timeoutMs?: number): Promise<HostView | PlayerView> {
    const current = this.lastView();
    if (current?.phase === phase) return Promise.resolve(current);
    return this.waitFor((m) => m.type === "view" && m.view.phase === phase, timeoutMs).then(
      (m) => (m as Extract<ServerMessage, { type: "view" }>).view,
    );
  }

  close(): void {
    this.socket.close();
  }
}

export function isType<K extends ServerMessage["type"]>(type: K) {
  return (m: ServerMessage): m is Extract<ServerMessage, { type: K }> => m.type === type;
}
