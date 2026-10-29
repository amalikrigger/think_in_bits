import { MotionConfig } from "motion/react";
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { HostApp } from "./host/HostApp";
import { PlayerApp } from "./player/PlayerApp";
import "./styles/app.css";

// Two apps behind one static page: /play/#host for the teacher, /play/ (or /play/?c=CODE
// from the QR code) for students. Hash routing needs no server rewrites on Pages.

function App() {
  const [isHost, setIsHost] = useState(() => window.location.hash === "#host");
  useEffect(() => {
    const onHash = () => setIsHost(window.location.hash === "#host");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return isHost ? <HostApp /> : <PlayerApp />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </StrictMode>,
);
