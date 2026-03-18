(function () {
  'use strict';

  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const bestScoreEl = document.getElementById('best-score');
  const overlay = document.getElementById('overlay');
  const overlayText = document.getElementById('overlay-text');
  const startBtn = document.getElementById('start-btn');
  const canvasContainer = document.getElementById('canvas-container');
  const announce = document.getElementById('sr-announce');

  const GRID = 20;
  const BASE_TICK = 120;
  const MIN_TICK = 60;
  const TICK_DECREASE = 2;
  const LS_KEY = 'snake-game-highscore';

  let COLS = canvas.width / GRID;
  let ROWS = canvas.height / GRID;

  let snake, direction, nextDirection, food, score, running, paused;
  let lastUpdateTime = 0;
  let animFrameId = null;
  let particles = [];
  let bestScore = parseInt(localStorage.getItem(LS_KEY), 10) || 0;

  bestScoreEl.textContent = bestScore;

  // --- Helpers ---

  function tickInterval() {
    return Math.max(MIN_TICK, BASE_TICK - score * TICK_DECREASE);
  }

  function canReverse() {
    return snake && snake.length === 1;
  }

  function srAnnounce(msg) {
    announce.textContent = '';
    requestAnimationFrame(function () { announce.textContent = msg; });
  }

  // --- Particles ---

  function spawnParticles(cx, cy) {
    const count = 6;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i;
      particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * (1.5 + Math.random()),
        vy: Math.sin(angle) * (1.5 + Math.random()),
        life: 1,
        radius: 2 + Math.random() * 2,
        color: Math.random() > 0.5 ? '#ef4444' : '#f97316'
      });
    }
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= dt / 400;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function drawParticles() {
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // --- Game State ---

  function init() {
    snake = [{ x: Math.floor(COLS / 2), y: Math.floor(ROWS / 2) }];
    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
    score = 0;
    paused = false;
    particles = [];
    scoreEl.textContent = '0';
    spawnFood();
  }

  function spawnFood() {
    if (snake.length >= COLS * ROWS) {
      winGame();
      return;
    }
    let valid = false;
    while (!valid) {
      food = {
        x: Math.floor(Math.random() * COLS),
        y: Math.floor(Math.random() * ROWS)
      };
      valid = true;
      for (let i = 0; i < snake.length; i++) {
        if (snake[i].x === food.x && snake[i].y === food.y) {
          valid = false;
          break;
        }
      }
    }
  }

  function update() {
    direction = nextDirection;
    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

    // Wall collision
    if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
      gameOver();
      return;
    }

    // Self collision
    for (let i = 0; i < snake.length; i++) {
      if (snake[i].x === head.x && snake[i].y === head.y) {
        gameOver();
        return;
      }
    }

    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
      score++;
      scoreEl.textContent = score;
      // Score pop animation
      scoreEl.classList.remove('score-pop');
      void scoreEl.offsetWidth;
      scoreEl.classList.add('score-pop');
      // Food-eat particles
      spawnParticles(food.x * GRID + GRID / 2, food.y * GRID + GRID / 2);
      spawnFood();
    } else {
      snake.pop();
    }
  }

  // --- Drawing ---

  function drawRoundedRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function draw() {
    // Background
    ctx.fillStyle = '#0d3b0d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid lines (subtle)
    ctx.strokeStyle = 'rgba(74, 222, 128, 0.06)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= canvas.width; x += GRID) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += GRID) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Food with glow
    const foodCX = food.x * GRID + GRID / 2;
    const foodCY = food.y * GRID + GRID / 2;
    const foodRadius = GRID / 2 - 2;

    ctx.save();
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(foodCX, foodCY, foodRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Snake
    for (let i = snake.length - 1; i >= 0; i--) {
      const segment = snake[i];
      const sx = segment.x * GRID + 1;
      const sy = segment.y * GRID + 1;
      const sw = GRID - 2;
      const sh = GRID - 2;

      if (i === 0) {
        ctx.fillStyle = '#f472b6';
      } else {
        ctx.fillStyle = '#ec4899';
      }

      drawRoundedRect(sx, sy, sw, sh, 4);
      ctx.fill();
      ctx.strokeStyle = '#be185d';
      ctx.lineWidth = 1;
      drawRoundedRect(sx, sy, sw, sh, 4);
      ctx.stroke();
    }

    // Snake head eyes
    if (snake.length > 0) {
      const head = snake[0];
      const hcx = head.x * GRID + GRID / 2;
      const hcy = head.y * GRID + GRID / 2;

      const eyeOffset = 4;
      const eyeRadius = 3;
      const pupilRadius = 1.5;

      let e1x, e1y, e2x, e2y, px, py;
      if (direction.x === 1) { // right
        e1x = hcx + 3; e1y = hcy - eyeOffset;
        e2x = hcx + 3; e2y = hcy + eyeOffset;
        px = 1.5; py = 0;
      } else if (direction.x === -1) { // left
        e1x = hcx - 3; e1y = hcy - eyeOffset;
        e2x = hcx - 3; e2y = hcy + eyeOffset;
        px = -1.5; py = 0;
      } else if (direction.y === -1) { // up
        e1x = hcx - eyeOffset; e1y = hcy - 3;
        e2x = hcx + eyeOffset; e2y = hcy - 3;
        px = 0; py = -1.5;
      } else { // down
        e1x = hcx - eyeOffset; e1y = hcy + 3;
        e2x = hcx + eyeOffset; e2y = hcy + 3;
        px = 0; py = 1.5;
      }

      // Eyeballs (white)
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(e1x, e1y, eyeRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(e2x, e2y, eyeRadius, 0, Math.PI * 2);
      ctx.fill();

      // Pupils
      ctx.fillStyle = '#1a1a2e';
      ctx.beginPath();
      ctx.arc(e1x + px, e1y + py, pupilRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(e2x + px, e2y + py, pupilRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Particles
    drawParticles();
  }

  // --- Game Loop (requestAnimationFrame) ---

  function gameLoop(timestamp) {
    if (!running) return;
    if (paused) {
      animFrameId = requestAnimationFrame(gameLoop);
      return;
    }

    const elapsed = timestamp - lastUpdateTime;
    const tick = tickInterval();

    // Update particles every frame for smoothness
    updateParticles(elapsed > tick ? tick : elapsed);

    if (elapsed >= tick) {
      lastUpdateTime = timestamp;
      update();
    }

    if (running) {
      draw();
      animFrameId = requestAnimationFrame(gameLoop);
    }
  }

  // --- State Transitions ---

  function gameOver() {
    running = false;
    if (animFrameId) cancelAnimationFrame(animFrameId);

    // Update high score
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem(LS_KEY, bestScore);
      bestScoreEl.textContent = bestScore;
    }

    // Death shake
    canvasContainer.classList.add('canvas-shake');
    canvasContainer.addEventListener('animationend', function onEnd() {
      canvasContainer.classList.remove('canvas-shake');
      canvasContainer.removeEventListener('animationend', onEnd);
    });

    overlayText.textContent = 'Game Over! Score: ' + score;
    startBtn.textContent = 'Restart';
    overlay.classList.remove('hidden');
    startBtn.focus();
    srAnnounce('Game over. Your score is ' + score);
  }

  function winGame() {
    running = false;
    if (animFrameId) cancelAnimationFrame(animFrameId);

    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem(LS_KEY, bestScore);
      bestScoreEl.textContent = bestScore;
    }

    overlayText.textContent = 'You Win! 🎉 Score: ' + score;
    startBtn.textContent = 'Play Again';
    overlay.classList.remove('hidden');
    startBtn.focus();
    srAnnounce('You win! Your score is ' + score);
  }

  function startGame() {
    overlay.classList.add('hidden');
    init();
    running = true;
    lastUpdateTime = performance.now();
    draw();
    if (animFrameId) cancelAnimationFrame(animFrameId);
    animFrameId = requestAnimationFrame(gameLoop);
    srAnnounce('Game started');
  }

  function togglePause() {
    if (!running) return;
    paused = !paused;
    if (paused) {
      overlayText.textContent = 'Paused';
      startBtn.textContent = 'Resume';
      overlay.classList.remove('hidden');
      startBtn.focus();
      srAnnounce('Game paused');
    } else {
      overlay.classList.add('hidden');
      lastUpdateTime = performance.now();
      srAnnounce('Game resumed');
    }
  }

  // --- Controls ---

  startBtn.addEventListener('click', function () {
    if (paused) {
      togglePause();
    } else {
      startGame();
    }
  });

  // Keyboard
  document.addEventListener('keydown', function (e) {
    // Pause
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
      if (running) {
        togglePause();
        e.preventDefault();
        return;
      }
    }

    if (paused || !running) return;

    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        if (canReverse() || direction.y !== 1) nextDirection = { x: 0, y: -1 };
        e.preventDefault();
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        if (canReverse() || direction.y !== -1) nextDirection = { x: 0, y: 1 };
        e.preventDefault();
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        if (canReverse() || direction.x !== 1) nextDirection = { x: -1, y: 0 };
        e.preventDefault();
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        if (canReverse() || direction.x !== -1) nextDirection = { x: 1, y: 0 };
        e.preventDefault();
        break;
    }
  });

  // Touch controls (D-pad buttons)
  document.querySelectorAll('.touch-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (paused || !running) return;
      const dir = btn.getAttribute('data-dir');
      switch (dir) {
        case 'up':
          if (canReverse() || direction.y !== 1) nextDirection = { x: 0, y: -1 };
          break;
        case 'down':
          if (canReverse() || direction.y !== -1) nextDirection = { x: 0, y: 1 };
          break;
        case 'left':
          if (canReverse() || direction.x !== 1) nextDirection = { x: -1, y: 0 };
          break;
        case 'right':
          if (canReverse() || direction.x !== -1) nextDirection = { x: 1, y: 0 };
          break;
      }
    });
  });

  // Swipe controls
  let touchStartX = 0;
  let touchStartY = 0;

  canvas.addEventListener('touchstart', function (e) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  canvas.addEventListener('touchend', function (e) {
    if (paused || !running) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0 && (canReverse() || direction.x !== -1)) nextDirection = { x: 1, y: 0 };
      else if (dx < 0 && (canReverse() || direction.x !== 1)) nextDirection = { x: -1, y: 0 };
    } else {
      if (dy > 0 && (canReverse() || direction.y !== -1)) nextDirection = { x: 0, y: 1 };
      else if (dy < 0 && (canReverse() || direction.y !== 1)) nextDirection = { x: 0, y: -1 };
    }
  }, { passive: true });

  // Initial draw
  init();
  draw();
  startBtn.focus();
})();