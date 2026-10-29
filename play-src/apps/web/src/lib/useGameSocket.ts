import { useCallback, useEffect, useRef, useState } from "react";
import type { ClientMessage, HostView, PlayerView, ServerMessage } from "@bitblitz/schema";
import { wsUrl } from "./api";

// One WebSocket to a game, kept alive across Wi-Fi drops and sleeping laptops.
// On every (re)connect it sends `hello()` (host_auth, resume or join), answers latency
// pings, and exposes the latest view the server pushed.

export type SocketStatus = "connecting" | "open" | "reconnecting" | "stopped";

/** Close codes after which retrying is pointless (see game-room.ts). */
const FINAL_CLOSE_CODES: Record<number, string> = {
  4000: "This game has expired.",
  4001: "The game didn't accept this host key.",
  4003: "You were removed from this game.",
};

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
  helloRef.current = hello;
  onMessageRef.current = onMessage;

  const send = useCallback((message: ClientMessage) => {
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
  }, []);

  const stop = useCallback((reason: string) => {
    stoppedRef.current = true;
    setStopReason(reason);
    setStatus("stopped");
    socketRef.current?.close();
  }, []);

  useEffect(() => {
    if (!code) return;
    stoppedRef.current = false;
    let attempt = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      if (stoppedRef.current) return;
      const socket = new WebSocket(wsUrl(code));
      socketRef.current = socket;

      socket.addEventListener("open", () => {
        attempt = 0;
        setStatus("open");
        const first = helloRef.current();
        if (first) socket.send(JSON.stringify(first));
      });

      socket.addEventListener("message", (event) => {
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
        if (socketRef.current !== socket) return;
        const final = FINAL_CLOSE_CODES[event.code];
        if (final) return stop(final);
        if (stoppedRef.current) return;
        setStatus("reconnecting");
        // Back off gently: 0.5 s, 1 s, 2 s … capped at 5 s, with jitter so a whole class
        // reconnecting after a Wi-Fi blip doesn't arrive in one burst.
        const delay = Math.min(5000, 500 * 2 ** attempt++) * (0.75 + Math.random() * 0.5);
        retryTimer = setTimeout(connect, delay);
      });
    };

    // A laptop waking up or a phone coming back online should not wait out the backoff.
    const reconnectNow = () => {
      const socket = socketRef.current;
      if (stoppedRef.current || (socket && socket.readyState <= WebSocket.OPEN)) return;
      clearTimeout(retryTimer);
      attempt = 0;
      connect();
    };
    const onVisible = () => document.visibilityState === "visible" && reconnectNow();

    connect();
    window.addEventListener("online", reconnectNow);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stoppedRef.current = true;
      clearTimeout(retryTimer);
      window.removeEventListener("online", reconnectNow);
      document.removeEventListener("visibilitychange", onVisible);
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [code, role, stop]);

  return { status, view, send, stop, stopReason };
}

/** A local deadline from the server's "ms remaining", immune to device clock skew. */
export function useCountdown(timer: { msRemaining: number; totalMs: number } | null, paused: boolean) {
  const [deadline, setDeadline] = useState<number | null>(null);
  const [now, setNow] = useState(() => performance.now());

  useEffect(() => {
    setDeadline(timer && !paused ? performance.now() + timer.msRemaining : null);
    setNow(performance.now());
  }, [timer, paused]);

  useEffect(() => {
    if (deadline === null) return;
    let frame = 0;
    const loop = () => {
      setNow(performance.now());
      if (performance.now() < deadline) frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [deadline]);

  if (!timer) return null;
  const msRemaining = paused || deadline === null ? timer.msRemaining : Math.max(0, deadline - now);
  return { msRemaining, totalMs: timer.totalMs, fraction: timer.totalMs ? msRemaining / timer.totalMs : 0 };
}
