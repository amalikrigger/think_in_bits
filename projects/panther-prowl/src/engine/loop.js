// The game loop: calls `frame(dt, time)` once per screen refresh.
//
// `dt` is the real time since the last frame, in seconds, so the game runs at
// the same speed on a 60 Hz tablet and a 120 Hz phone. (The old game moved
// things a fixed amount 30 times a second, no matter what.)

// If a frame takes longer than this (the tab was busy, or a slow device
// hiccupped) we pretend it was this long, so nobody teleports through a wall.
const MAX_FRAME_SECONDS = 1 / 20;

export function startLoop(frame, { onHide } = {}) {
  let lastTime = null;
  let pending = null; // the next frame we've asked for (so we never run two loops)

  function tick(now) {
    // Ask for the next frame FIRST, so one unexpected error can't freeze the
    // whole game at the booth. The error still shows in the console.
    pending = requestAnimationFrame(tick);
    const dt = lastTime === null ? 0 : Math.min((now - lastTime) / 1000, MAX_FRAME_SECONDS);
    lastTime = now;
    frame(dt, now / 1000);
  }

  // Stop completely while the tab is hidden: saves battery, and avoids a giant
  // dt when the player comes back.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(pending);
      pending = null;
      onHide?.();
    } else if (pending === null) {
      lastTime = null;
      pending = requestAnimationFrame(tick);
    }
  });

  pending = requestAnimationFrame(tick);
}
