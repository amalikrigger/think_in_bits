import { MEDIA_FILE_NAME_PATTERN, validateQuiz } from "@bitblitz/schema";
import { SESSION_TTL_MS, signSession, verifyPassphrase, verifySession } from "./auth";
import type { Env } from "./env";

export { GameRoom } from "./game-room";
export { LoginLimiter } from "./login-limiter";

// HTTP routes. Everything stateful lives in a Durable Object; this file only checks
// auth, validates input and forwards.
//
//   GET  /api/health
//   POST /api/host/login                 { passphrase } → { token, expiresAt }
//   POST /api/games                      Bearer session; { quiz } → { code, hostKey } | 400 { problems }
//   GET  /api/games/:code                → { exists, title, phase, joinable, locked }
//   GET  /api/games/:code/ws             WebSocket upgrade (players and host)
//   PUT  /api/games/:code/media/:name    X-Host-Key; image body
//   GET  /api/games/:code/media/:name
//   GET  /api/games/:code/results.csv    X-Host-Key

const CODE_PATTERN = /^\d{6}$/;
const QUIZ_MAX_BYTES = 512 * 1024;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin");
    if (origin && !allowedOrigins(env).includes(origin)) return json({ error: "origin not allowed" }, 403);
    if (request.method === "OPTIONS") return withCors(new Response(null, { status: 204 }), origin);

    try {
      return withCors(await route(request, env), origin);
    } catch (error) {
      console.error("unhandled", error);
      return withCors(json({ error: "server error" }, 500), origin);
    }
  },
} satisfies ExportedHandler<Env>;

async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] !== "api") return json({ error: "not found" }, 404);

  if (parts[1] === "health" && parts.length === 2) return json({ ok: true });
  if (parts[1] === "host" && parts[2] === "login" && request.method === "POST") return login(request, env);
  if (parts[1] === "games" && parts.length === 2 && request.method === "POST") return createGame(request, env);

  if (parts[1] === "games" && parts[2] && CODE_PATTERN.test(parts[2])) {
    const code = parts[2];
    const room = env.GAME_ROOM.get(env.GAME_ROOM.idFromName(code));
    const rest = parts.slice(3);

    if (rest.length === 0 && request.method === "GET") return json(await room.info());
    if (rest[0] === "ws" && rest.length === 1) return room.fetch(request);

    const mediaName = rest[0] === "media" && rest.length === 2 ? decodeMediaName(rest[1]!) : null;
    if (mediaName) {
      if (request.method === "GET") return serveMedia(await room.getMedia(mediaName));
      if (request.method === "PUT") {
        if (!(await room.isHostKey(request.headers.get("X-Host-Key") ?? ""))) return json({ error: "not the host" }, 401);
        const contentType = (request.headers.get("Content-Type") ?? "").split(";")[0]!.trim();
        const result = await room.putMedia(mediaName, contentType, await request.arrayBuffer());
        return result === "ok" ? json({ ok: true }) : json({ error: result }, result === "too_large" ? 413 : 400);
      }
    }

    if (rest[0] === "results.csv" && rest.length === 1 && request.method === "GET") {
      if (!(await room.isHostKey(request.headers.get("X-Host-Key") ?? ""))) return json({ error: "not the host" }, 401);
      const csv = await room.resultsCsv();
      if (csv === null) return json({ error: "game not found" }, 404);
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="bitblitz-${code}-results.csv"`,
        },
      });
    }
  }
  return json({ error: "not found" }, 404);
}

async function login(request: Request, env: Env): Promise<Response> {
  // Fail closed: no configured secrets means nobody can host, not that everybody can.
  if (!env.HOST_PASSPHRASE_HASH || !env.SESSION_SECRET || env.SESSION_SECRET.length < 32) {
    return json({ error: "host login is not configured on this server" }, 503);
  }
  // The attempt is counted before the slow hash check, so a burst of parallel guesses
  // cannot all pass the limit at once; a correct passphrase clears the count.
  const limiter = env.LOGIN_LIMITER.get(env.LOGIN_LIMITER.idFromName(clientIp(request)));
  const decision = await limiter.reserve();
  if (!decision.allowed) {
    return json({ error: "too many attempts, try again later" }, 429, { "Retry-After": String(decision.retryAfterSec) });
  }

  const body = await readJson(request, 4096);
  const passphrase = typeof body === "object" && body && "passphrase" in body ? String(body.passphrase) : "";
  if (!(await verifyPassphrase(passphrase, env.HOST_PASSPHRASE_HASH))) {
    return json({ error: "that passphrase isn't right" }, 401);
  }
  await limiter.succeed();
  const expiresAt = Date.now() + SESSION_TTL_MS;
  return json({ token: await signSession(env.SESSION_SECRET, expiresAt), expiresAt });
}

async function createGame(request: Request, env: Env): Promise<Response> {
  const token = request.headers.get("Authorization")?.replace(/^Bearer /, "") ?? null;
  if (!(await verifySession(env.SESSION_SECRET, token, Date.now()))) return json({ error: "log in as the host first" }, 401);

  const body = await readJson(request, QUIZ_MAX_BYTES);
  if (body === undefined) return json({ error: "send the quiz as JSON, up to 512 KB" }, 400);
  const quizInput = typeof body === "object" && body && "quiz" in body ? body.quiz : body;
  const validation = validateQuiz(quizInput);
  if (!validation.ok) return json({ error: "the quiz has problems", problems: validation.problems }, 400);

  for (let attempt = 0; attempt < 8; attempt++) {
    const code = String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0]! % 900000));
    const room = env.GAME_ROOM.get(env.GAME_ROOM.idFromName(code));
    const result = await room.init(validation.quiz, code);
    if (result.ok) return json({ code, hostKey: result.hostKey }, 201);
  }
  return json({ error: "could not find a free game code, try again" }, 503);
}

function serveMedia(media: { contentType: string; bytes: ArrayBuffer } | null): Response {
  if (!media) return json({ error: "not found" }, 404);
  return new Response(media.bytes, {
    headers: {
      "Content-Type": media.contentType,
      "Cache-Control": "public, max-age=3600",
      // SVGs can carry script; this keeps an uploaded file inert even if opened directly.
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src data:",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function readJson(request: Request, maxBytes: number): Promise<unknown> {
  // Refuse by the declared length first, so an oversized upload is not buffered before being rejected.
  const declared = Number(request.headers.get("Content-Length") ?? 0);
  if (declared > maxBytes) return undefined;
  const text = await request.text();
  if (text.length > maxBytes) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/** The media path segment arrives percent-encoded (the web app encodes `file.name`). */
function decodeMediaName(segment: string): string | null {
  try {
    const name = decodeURIComponent(segment);
    return MEDIA_FILE_NAME_PATTERN.test(name) ? name : null;
  } catch {
    return null;
  }
}

function clientIp(request: Request): string {
  return request.headers.get("CF-Connecting-IP") ?? "local";
}

function allowedOrigins(env: Env): string[] {
  return env.ALLOWED_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean);
}

function withCors(response: Response, origin: string | null): Response {
  if (!origin || response.status === 101) return response;
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Host-Key");
  headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
  headers.set("Vary", "Origin");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...extraHeaders },
  });
}
