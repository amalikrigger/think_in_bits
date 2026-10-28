// Short-lived eye candy: sparks, floating score numbers, screen shake and
// flashes. None of it affects the game; it just makes things feel good.
//
// Positions are in tiles, like everything else in the maze.

import { EFFECTS } from '../config.js';

export class Effects {
  constructor({ reducedMotion }) {
    this.reducedMotion = reducedMotion;
    this.particles = [];
    this.popups = [];
    this.shakeLeft = 0;
    this.shakeStrength = 0;
    this.flashLeft = 0;
    this.flashColor = '#fff';
  }

  /** A burst of sparks flying out from (x, y). */
  burst(x, y, { colors, count = 12, speed = 4, life = 0.6, size = 0.12 }) {
    const amount = this.reducedMotion ? Math.ceil(count / 3) : count;
    for (let i = 0; i < amount && this.particles.length < EFFECTS.maxParticles; i++) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = speed * (0.4 + Math.random() * 0.6);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life,
        maxLife: life,
        size: size * (0.6 + Math.random() * 0.8),
        color: colors[i % colors.length],
      });
    }
  }

  /** A number (or word) that floats up and fades out. */
  popup(x, y, text, { color = '#fff', size = 0.9, life = 1 } = {}) {
    this.popups.push({ x, y, text, color, size, life, maxLife: life });
  }

  shake(strength = 0.25, seconds = 0.3) {
    if (this.reducedMotion || !EFFECTS.screenShake) return;
    this.shakeStrength = strength;
    this.shakeLeft = seconds;
  }

  flash(color, seconds = 0.25) {
    this.flashColor = color;
    this.flashLeft = this.reducedMotion ? seconds / 2 : seconds;
    this.flashLength = this.flashLeft;
  }

  clear() {
    this.particles.length = 0;
    this.popups.length = 0;
    this.shakeLeft = 0;
    this.flashLeft = 0;
  }

  update(dt) {
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 1 - 3 * dt; // air drag
      p.vy *= 1 - 3 * dt;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);

    for (const popup of this.popups) {
      popup.y -= 1.2 * dt;
      popup.life -= dt;
    }
    this.popups = this.popups.filter((popup) => popup.life > 0);

    this.shakeLeft = Math.max(0, this.shakeLeft - dt);
    this.flashLeft = Math.max(0, this.flashLeft - dt);
  }

  /** How far to nudge the whole picture this frame, in tiles. */
  get shakeOffset() {
    if (this.shakeLeft <= 0) return { x: 0, y: 0 };
    const amount = this.shakeStrength * (this.shakeLeft / 0.3);
    return { x: (Math.random() - 0.5) * amount, y: (Math.random() - 0.5) * amount };
  }

  /** Draw the sparks. The canvas is already in tile units. */
  drawParticles(ctx) {
    for (const p of this.particles) {
      ctx.globalAlpha = Math.min(1, (p.life / p.maxLife) * 1.5);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }
}
