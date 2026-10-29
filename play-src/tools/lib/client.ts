import type { ClientMessage, HostCommand, HostView, PlayerView, ServerMessage } from "@bitblitz/schema";

// A minimal BitBlitz client for scripts (smoke test, bot load). Uses Node's built-in
// WebSocket and answers latency pings automatically, like the real web app.

export const API = process.env.BITBLITZ_API ?? "http://127.0.0.1:8787";
export const DEV_PASSPHRASE = process.env.BITBLITZ_PASSPHRASE ?? "bitblitz-dev";

export async function login(passphrase = DEV_PASSPHRASE, headers: Record<string, string> = {}): Promise<Response> {
  return fetch(`${API}/api/host/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ passphrase }),
  });
}

export async function hostToken(): Promise<string> {
  const response = await login();
  if (!response.ok) throw new Error(`login failed: ${response.status} ${await response.text()}`);
  return ((await response.json()) as { token: string }).token;
}

export async function createGame(token: string, quiz: unknown): Promise<{ code: string; hostKey: string }> {
  const response = await fetch(`${API}/api/games`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ quiz }),
  });
  if (response.status !== 201) throw new Error(`create failed: ${response.status} ${await response.text()}`);
  return (await response.json()) as { code: string; hostKey: string };
}

type Waiter = { match: (m: ServerMessage) => boolean; resolve: (m: ServerMessage) => void; reject: (e: Error) => void };

export class Connection {
  readonly received: { at: number; message: ServerMessage }[] = [];
  private readonly socket: WebSocket;
  private waiters: Waiter[] = [];
  private openPromise: Promise<void>;
  closed = false;
  closeCode: number | null = null;

  constructor(code: string) {
    this.socket = new WebSocket(`${API.replace(/^http/, "ws")}/api/games/${code}/ws`);
    this.openPromise = new Promise((resolve, reject) => {
      this.socket.addEventListener("open", () => resolve(), { once: true });
      this.socket.addEventListener("error", () => reject(new Error("socket error")), { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data)) as ServerMessage;
      this.received.push({ at: performance.now(), message });
      if (message.type === "ping") this.send({ type: "pong", id: message.id });
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
      for (const waiter of this.waiters) waiter.reject(new Error(`socket closed (${event.code})`));
      this.waiters = [];
    });
  }

  opened(): Promise<void> {
    return this.openPromise;
  }

  send(message: ClientMessage): void {
    this.socket.send(JSON.stringify(message));
  }

  command(command: HostCommand): void {
    this.send({ type: "command", command });
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

  waitForPhase(phase: string, timeoutMs?: number): Promise<HostView | PlayerView> {
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
