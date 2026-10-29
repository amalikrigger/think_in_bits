import { useCallback, useEffect, useRef, useState } from "react";
import type { ClientMessage, HostView, PlayerView, ServerMessage } from "@bitblitz/schema";
import { fetchGameInfo, wsUrl } from "./api";
import { remainingFraction, resyncDeadline, type TimerSnapshot } from "./countdown";
import {
  CONNECT_TIMEOUT_MS,
  finalCloseReason,
  GAME_GONE_REASON,
  HEARTBEAT_MS,
  looksLikeSuspend,
  READY,
  reconnectDelay,
  shouldProbeGame,
  shouldReconnectOnWake,
} from "./socket-logic";

// One WebSocket to a game, kept alive across Wi-Fi drops, locked phones and sleeping laptops.
// On every (re)connect it sends `hello()` (host_auth, resume or join), answers latency
// pings, and exposes the latest view the server pushed. The decisions (backoff, when to
// give up, when to distrust an "open" socket) live in socket-logic.ts and are unit tested.

export type SocketStatus = "connecting" | "open" | "reconnecting" | "stopped";

type Options<V extends HostView | PlayerView> = {
  code: string | null;
  hello: () => ClientMessage | null;
  onMessage?: (message: ServerMessage) => void;
  /** Narrows views to the role this screen expects. */
  role: V["role"];
};

export function useGameSocket<V extends HostView | PlayerView>({ code, hello, onMessage, role }: Options<V>) {
  const [status, setStatus] = useState<SocketStatus>("connecting");
  const [view, setView] = useState<V | null>(null);
  const [stopReason, setStopReason] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const helloRef = useRef(hello);
  const onMessageRef = useRef(onMessage);
  const stoppedRef = useRef(false);
  const reconnectRef = useRef<(() => void) | null>(null);

  // Latest callbacks without re-running the connection effect (no stale closures).
  useEffect(() => {
    helloRef.current = hello;
    onMessageRef.current = onMessage;
  });

  /** Returns false when the socket isn't open, so the UI can say "not connected" instead of silently dropping a tap. */
  const send = useCallback((message: ClientMessage): boolean => {
    const socket = socketRef.current;
    if (socket?.readyState !== READY.OPEN) return false;
    socket.send(JSON.stringify(message));
    return true;
  }, []);

  const stop = useCallback((reason: string) => {
    stoppedRef.current = true;
    setStopReason(reason);
    setStatus("stopped");
    socketRef.current?.close();
  }, []);

  /** Drop the current connection and open a fresh one now (the server resumes the same seat). */
  const reconnect = useCallback(() => reconnectRef.current?.(), []);

  useEffect(() => {
    if (!code) return;
    stoppedRef.current = false;
    let attempt = 0;
    let failuresWithoutOpen = 0;
    let probing = false;
    let hiddenAt: number | null = null;
    let lastBeat = Date.now();
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let connectTimer: ReturnType<typeof setTimeout> | undefined;

    const probeGame = async () => {
      if (probing) return;
      probing = true;
      try {
        const info = await fetchGameInfo(code);
        if (!info.exists && !stoppedRef.current) stop(GAME_GONE_REASON);
      } catch {
        // The server itself is unreachable: keep retrying, it may be a Wi-Fi blip.
      } finally {
        probing = false;
      }
    };

    const connect = () => {
      if (stoppedRef.current) return;
      clearTimeout(retryTimer);
      clearTimeout(connectTimer);
      const socket = new WebSocket(wsUrl(code));
      socketRef.current = socket;
      let opened = false;
      connectTimer = setTimeout(() => {
        if (socket.readyState === READY.CONNECTING) socket.close();
      }, CONNECT_TIMEOUT_MS);

      socket.addEventListener("open", () => {
        if (socketRef.current !== socket) return;
        clearTimeout(connectTimer);
        opened = true;
        attempt = 0;
        failuresWithoutOpen = 0;
        setStatus("open");
        const first = helloRef.current();
        if (first) socket.send(JSON.stringify(first));
      });

      socket.addEventListener("message", (event) => {
        if (socketRef.current !== socket) return;
        let message: ServerMessage;
        try {
          message = JSON.parse(String(event.data)) as ServerMessage;
        } catch {
          return;
        }
        if (message.type === "ping") {
          socket.send(JSON.stringify({ type: "pong", id: message.id } satisfies ClientMessage));
          return;
        }
        if (message.type === "view" && message.view.role === role) setView(message.view as V);
        onMessageRef.current?.(message);
      });

      socket.addEventListener("close", (event) => {
        clearTimeout(connectTimer);
        if (socketRef.current !== socket) return;
        const final = finalCloseReason(event.code);
        if (final) return stop(final);
        if (stoppedRef.current) return;
        failuresWithoutOpen = opened ? 0 : failuresWithoutOpen + 1;
        if (shouldProbeGame(failuresWithoutOpen)) void probeGame();
        setStatus("reconnecting");
        retryTimer = setTimeout(connect, reconnectDelay(attempt++));
      });
    };

    const reconnectNow = () => {
      if (stoppedRef.current) return;
      clearTimeout(retryTimer);
      attempt = 0;
      const current = socketRef.current;
      if (current && current.readyState <= READY.OPEN) {
        // Detach first so its close event doesn't schedule a second reconnect.
        socketRef.current = null;
        current.close();
      }
      connect();
    };
    reconnectRef.current = reconnectNow;

    // A phone coming back online should not wait out the backoff.
    const onOnline = () => {
      const current = socketRef.current;
      if (!current || current.readyState > READY.OPEN) reconnectNow();
    };
    // Wi-Fi gone: a dead TCP connection can report OPEN for minutes, during which taps
    // would vanish into its buffer. Drop it now so the student sees "Reconnecting" and
    // "Not connected" at once; the retries fail fast until the network is back.
    const onOffline = () => {
      if (stoppedRef.current) return;
      const current = socketRef.current;
      if (current && current.readyState <= READY.OPEN) {
        socketRef.current = null;
        current.close();
      }
      setStatus("reconnecting");
      clearTimeout(retryTimer);
      retryTimer = setTimeout(connect, reconnectDelay(attempt++));
    };
    // A locked phone or a closed laptop lid: after a long time away the socket may be a zombie.
    // Wall-clock time, because performance.now() stands still while the machine sleeps.
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
        return;
      }
      const awayMs = hiddenAt === null ? 0 : Date.now() - hiddenAt;
      hiddenAt = null;
      if (shouldReconnectOnWake(awayMs, socketRef.current?.readyState ?? null)) reconnectNow();
    };
    // Sleep without a visibilitychange: the heartbeat fires late, so treat it like a wake.
    const heartbeat = setInterval(() => {
      const now = Date.now();
      const gap = now - lastBeat;
      lastBeat = now;
      if (looksLikeSuspend(gap) && shouldReconnectOnWake(gap, socketRef.current?.readyState ?? null)) reconnectNow();
    }, HEARTBEAT_MS);

    connect();
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stoppedRef.current = true;
      clearTimeout(retryTimer);
      clearTimeout(connectTimer);
      clearInterval(heartbeat);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVisibility);
      reconnectRef.current = null;
      const current = socketRef.current;
      socketRef.current = null;
      current?.close();
    };
  }, [code, role, stop]);

  return { status, view, send, stop, reconnect, stopReason };
}

/** A smooth local countdown driven by the server's "ms remaining", immune to device clock skew. */
export function useCountdown(timer: TimerSnapshot | null, paused: boolean) {
  const active = timer !== null && !paused;
  const deadlineRef = useRef<number | null>(null);
  const [now, setNow] = useState(() => performance.now());
  // Bumped whenever the deadline really moves, so a finished animation loop restarts
  // (for example after a reconnect that found the question still open).
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    if (!active) {
      deadlineRef.current = null;
      return;
    }
    const next = resyncDeadline(deadlineRef.current, performance.now(), timer.msRemaining);
    if (next !== deadlineRef.current) {
      deadlineRef.current = next;
      setGeneration((g) => g + 1);
    }
    setNow(performance.now());
  }, [active, timer]);

  useEffect(() => {
    if (!active) return;
    let frame = 0;
    const loop = () => {
      const current = performance.now();
      setNow(current);
      if (deadlineRef.current !== null && current < deadlineRef.current) frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [active, generation]);

  if (!timer) return null;
  const deadline = deadlineRef.current;
  const msRemaining = !active || deadline === null ? timer.msRemaining : Math.max(0, deadline - now);
  return { msRemaining, totalMs: timer.totalMs, fraction: remainingFraction(msRemaining, timer.totalMs) };
}
