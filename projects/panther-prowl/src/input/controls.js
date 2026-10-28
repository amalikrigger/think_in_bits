// Turns key presses, swipes and the on-screen arrow pad into directions.
//
// Three ways to play:
//   Keyboard   arrow keys or WASD. P or Esc pauses, M mutes.
//   Swipe      flick a finger anywhere on the screen. You can keep your finger
//              down and flick again to turn again.
//   Arrow pad  the round pad on touch screens. Hold it or slide your thumb
//              around it.
//
// Holding a key (or the pad) keeps asking for that direction every frame, so
// you can hold "up" before a corner and the panther turns the moment it can.

import { CONTROLS } from '../config.js';

const KEY_DIRECTIONS = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
};

export class Controls {
  /**
   * @param swipeSurface  the element swipes are read from (the game canvas)
   * @param dpad          the arrow pad element (or null)
   * @param handlers      { direction(dir), pause(), mute(), anyInput(), isTyping() }
   */
  constructor({ swipeSurface, dpad, handlers }) {
    this.handlers = handlers;
    this.heldKeys = []; // most recent last
    this.dpadDirection = null;
    this.enabled = false; // only steer while a game is being played

    this.listenToKeyboard();
    this.listenToSwipes(swipeSurface);
    if (dpad) this.listenToDpad(dpad);

    // No right-click menu or long-press menu over the game.
    window.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  /** The direction being held down right now, if any. */
  get heldDirection() {
    return this.dpadDirection ?? this.heldKeys[this.heldKeys.length - 1] ?? null;
  }

  listenToKeyboard() {
    window.addEventListener('keydown', (event) => {
      this.handlers.anyInput?.();
      if (this.handlers.isTyping?.()) return; // typing initials or a PIN, not playing
      const direction = KEY_DIRECTIONS[event.code];
      if (direction) {
        event.preventDefault(); // stop arrow keys scrolling the page
        if (!this.heldKeys.includes(direction)) this.heldKeys.push(direction);
        if (this.enabled) this.handlers.direction(direction);
      } else if (event.code === 'KeyP' || event.code === 'Escape') {
        this.handlers.pause?.();
      } else if (event.code === 'KeyM') {
        this.handlers.mute?.();
      }
    });
    window.addEventListener('keyup', (event) => {
      const direction = KEY_DIRECTIONS[event.code];
      if (direction) this.heldKeys = this.heldKeys.filter((held) => held !== direction);
    });
    window.addEventListener('blur', () => {
      this.heldKeys = [];
      this.dpadDirection = null;
    });
  }

  listenToSwipes(surface) {
    let start = null; // where the current flick started

    surface.addEventListener('pointerdown', (event) => {
      this.handlers.anyInput?.();
      start = { x: event.clientX, y: event.clientY, id: event.pointerId };
    });

    surface.addEventListener('pointermove', (event) => {
      if (!start || event.pointerId !== start.id) return;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (Math.hypot(dx, dy) < CONTROLS.swipeThreshold) return;
      // Whichever way the finger moved more wins.
      const direction = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
      if (this.enabled) this.handlers.direction(direction);
      // Start measuring again from here, so a second flick turns again.
      start = { x: event.clientX, y: event.clientY, id: event.pointerId };
    });

    const end = (event) => {
      if (start && event.pointerId === start.id) start = null;
    };
    surface.addEventListener('pointerup', end);
    surface.addEventListener('pointercancel', end);
  }

  listenToDpad(pad) {
    let activePointer = null;

    const update = (event) => {
      const rect = pad.getBoundingClientRect();
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height / 2);
      // A small dead zone in the middle so a resting thumb doesn't steer.
      const direction = Math.hypot(dx, dy) < rect.width * 0.12 ? null : Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
      if (direction !== this.dpadDirection) {
        this.dpadDirection = direction;
        pad.dataset.active = direction ?? '';
        if (direction && this.enabled) this.handlers.direction(direction);
      }
    };

    pad.addEventListener('pointerdown', (event) => {
      this.handlers.anyInput?.();
      activePointer = event.pointerId;
      pad.setPointerCapture?.(event.pointerId);
      update(event);
      event.preventDefault();
    });
    pad.addEventListener('pointermove', (event) => {
      if (event.pointerId === activePointer) update(event);
    });
    const release = (event) => {
      if (event.pointerId !== activePointer) return;
      activePointer = null;
      this.dpadDirection = null;
      pad.dataset.active = '';
    };
    pad.addEventListener('pointerup', release);
    pad.addEventListener('pointercancel', release);
  }
}
