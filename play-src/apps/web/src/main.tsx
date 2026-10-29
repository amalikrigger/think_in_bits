import { MotionConfig } from "motion/react";
import { lazy, StrictMode, Suspense, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { PlayerApp } from "./player/PlayerApp";
import "./styles/app.css";

// Two apps behind one static page: /play/#host for the teacher, /play/ (or /play/?c=CODE
// from the QR code) for students. Hash routing needs no server rewrites on Pages.
// The teacher's screens (upload, QR, confetti, zod validation) are a separate chunk, so a
// student's phone on school Wi-Fi only downloads the player.
const HostApp = lazy(() => import("./host/HostApp").then((module) => ({ default: module.HostApp })));

function App() {
  const [isHost, setIsHost] = useState(() => window.location.hash === "#host");
  useEffect(() => {
    const onHash = () => setIsHost(window.location.hash === "#host");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return (
    <Suspense fallback={<Loading />}>
      {isHost ? <HostApp /> : <PlayerApp />}
    </Suspense>
  );
}

function Loading() {
  return (
    <div className="bb-screen flex items-center justify-center text-xl font-semibold text-muted" role="status">
      Loading…
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </StrictMode>,
);
