// The score display during a game. It only touches the page when a number
// actually changes, because changing the page 60 times a second is slow.

const $ = (id) => document.getElementById(id);

// A little paw print for each life.
const PAW_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><g class="life">
  <ellipse cx="12" cy="15" rx="5.5" ry="4.6"/>
  <ellipse cx="5.6" cy="9.6" rx="2.2" ry="2.7"/><ellipse cx="9.6" cy="5.6" rx="2.2" ry="2.7"/>
  <ellipse cx="14.4" cy="5.6" rx="2.2" ry="2.7"/><ellipse cx="18.4" cy="9.6" rx="2.2" ry="2.7"/></g></svg>`;

export class Hud {
  constructor() {
    this.score = $('hud-score');
    this.middleLabel = $('hud-middle-label');
    this.middle = $('hud-middle');
    this.middleBlock = this.middle.parentElement;
    this.lives = $('hud-lives');
    this.shown = {};
  }

  update(game) {
    this.set('score', game.score, () => {
      this.score.textContent = game.score.toLocaleString();
      bump(this.score);
    });

    if (game.mode === 'challenge') {
      const seconds = Math.ceil(game.timeLeft);
      this.set('middle', `time:${seconds}`, () => {
        this.middleLabel.textContent = 'Time';
        this.middle.textContent = seconds;
        this.middleBlock.classList.toggle('urgent', seconds <= 10);
      });
      this.set('lives', 'none', () => (this.lives.hidden = true));
    } else {
      this.set('middle', `level:${game.level}`, () => {
        this.middleLabel.textContent = 'Level';
        this.middle.textContent = game.level;
        this.middleBlock.classList.remove('urgent');
      });
      this.set('lives', game.lives, () => {
        this.lives.hidden = false;
        this.lives.innerHTML = PAW_SVG.repeat(Math.max(0, Math.min(game.lives, 6)));
        this.lives.setAttribute('aria-label', `${game.lives} lives`);
      });
    }
  }

  /** Run `change` only if `value` is different from last time. */
  set(key, value, change) {
    if (this.shown[key] === value) return;
    this.shown[key] = value;
    change();
  }

  reset() {
    this.shown = {};
  }
}

function bump(element) {
  element.classList.remove('bump');
  void element.offsetWidth; // restart the animation
  element.classList.add('bump');
}
