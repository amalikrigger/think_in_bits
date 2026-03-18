'use strict';

// ─── Constants ────────────────────────────────────────────────────────────────
const STATE_KEY   = 'raw_app_state';
const THEME_KEY   = 'raw_theme';
const SOUND_KEY   = 'raw_sound';
const SWIPE_TOTAL = 20;
const MAX_UNDOS   = 3;

// ─── Tunable Config ───────────────────────────────────────────────────────────
const CONFIG = {
  DRAG_COMMIT_THRESHOLD: 0.25,   // fraction of card width to commit swipe
  FLICK_VELOCITY:        0.8,    // px/ms — minimum velocity for a flick-swipe
  MAX_TILT_DEG:          18,     // max card rotation during drag (degrees)
  TAP_TIMEOUT_MS:        300,    // max duration for a pointer-down to count as tap
  TAP_SLOP_PX:           8,      // max pointer travel for a tap
  CONFETTI_COUNT:        130,    // number of confetti particles
  CONFETTI_MAX_FRAMES:   200,    // animation frame budget for confetti
  SPEED_DEMON_MS:        1500,   // avg swipe time threshold for Speed Demon badge
  SLOW_SAVOR_MS:         8000,   // avg swipe time threshold for Slow & Savory badge
  MIN_SWIPE_TIME_MS:     200,    // lower-bound sanity filter for swipe times
  MAX_SWIPE_TIME_MS:     90000,  // upper-bound sanity filter for swipe times
  GROUP_THRESHOLD:       3,      // min likes in a group to qualify for assignment
  GROUP_BONUS:           3,      // bonus points for matching assigned group
  COMPAT_HIGH_PCT:       60,     // friend compatibility: "high" threshold
  COMPAT_MID_PCT:        30,     // friend compatibility: "mid" threshold
};

// ─── Group Color Gradients ────────────────────────────────────────────────────
const GROUP_COLORS = {
  'Nigiri':        'linear-gradient(135deg, #f6d365, #fda085)',
  'Maki':          'linear-gradient(135deg, #89f7fe, #66a6ff)',
  'Sashimi':       'linear-gradient(135deg, #a18cd1, #fbc2eb)',
  'Tempura Rolls': 'linear-gradient(135deg, #ffecd2, #fcb69f)',
  'Fusion':        'linear-gradient(135deg, #c471f5, #fa71cd)',
  'Classic':       'linear-gradient(135deg, #c8a97e, #8b6849)',
  'Spicy':         'linear-gradient(135deg, #ff6b6b, #ff0844)',
  'Vegetarian':    'linear-gradient(135deg, #96fbc4, #8fd3f4)',
};

// ─── Achievement Badges ───────────────────────────────────────────────────────
const BADGES = [
  { id: 'spice-lord',      icon: '🌶️', label: 'Spice Lord',     desc: '4+ Spicy likes',         test: (r)    => (r.groupData['Spicy']?.length     || 0) >= 4 },
  { id: 'traditionalist',  icon: '🏯', label: 'Traditionalist', desc: '4+ Classic likes',        test: (r)    => (r.groupData['Classic']?.length   || 0) >= 4 },
  { id: 'fusion-fanatic',  icon: '✨', label: 'Fusion Fanatic',  desc: '4+ Fusion likes',         test: (r)    => (r.groupData['Fusion']?.length    || 0) >= 4 },
  { id: 'herbivore',       icon: '🌿', label: 'Herbivore',       desc: 'Liked a Vegetarian item', test: (r)    => (r.groupData['Vegetarian']?.length || 0) >= 1 },
  { id: 'second-thoughts', icon: '↩️', label: 'Second Thoughts', desc: 'Used all 3 Undos',        test: (_, s) => s.undosRemaining === 0 },
  { id: 'clean-sweep',     icon: '💯', label: 'Clean Sweep',     desc: 'Liked 15+ items',         test: (r)    => r.totalLikes >= 15 },
  { id: 'speed-demon',     icon: '⚡', label: 'Speed Demon',     desc: 'Avg under 1.5s/swipe',    test: (r)    => r.avgSwipeTime > 0 && r.avgSwipeTime < CONFIG.SPEED_DEMON_MS },
  { id: 'slow-savor',      icon: '🍵', label: 'Slow & Savory',   desc: 'Avg over 8s/swipe',       test: (r)    => r.avgSwipeTime > CONFIG.SLOW_SAVOR_MS },
  { id: 'combo-king',      icon: '🔥', label: 'Combo King',      desc: 'Hit a 5× eat streak',     test: (_, s) => (s.maxStreak || 0) >= 5 },
];

// ─── Personality Types ────────────────────────────────────────────────────────
const PERSONALITY_TYPES = {
  spicy:       { title: 'The Flame Chaser',   icon: '🔥', desc: 'You live for the heat. Mild is boring — you chase every tingle of spice with reckless joy.' },
  bold:        { title: 'The Flavor Chaser',  icon: '⚡', desc: 'Subtlety? Never heard of it. You want every bite to make a statement.' },
  umami:       { title: 'The Depth Seeker',   icon: '🌊', desc: 'You crave complexity and the savory soul hidden in every ingredient.' },
  classic:     { title: 'The Purist',         icon: '🎌', desc: 'Tradition is your temple. You trust the masters and honor what works.' },
  light:       { title: 'The Minimalist',     icon: '🌸', desc: 'Less is more. You find beauty in simplicity and clean, fresh flavors.' },
  fresh:       { title: 'The Purity Seeker',  icon: '💧', desc: "If it's not fresh, it doesn't make the cut. You're an ingredient purist." },
  rich:        { title: 'The Indulgent',      icon: '✨', desc: 'You go all-in on rich, luxurious flavors. Life is too short for boring food.' },
  creamy:      { title: 'The Comfort Lover',  icon: '🧈', desc: 'Velvety, smooth, and satisfying — you gravitate toward what feels like a warm hug.' },
  crunchy:     { title: 'The Texture Addict', icon: '💥', desc: 'The crunch is non-negotiable. You eat with your ears as much as your mouth.' },
  tangy:       { title: 'The Zest Lover',     icon: '🍋', desc: 'Bright, acidic, electric — you want your food to wake you up.' },
  adventurous: { title: 'The Risk-Taker',     icon: '🌏', desc: 'Menus are suggestions. You always order the thing no one else dares to try.' },
  smoky:       { title: 'The Complex Palate', icon: '🌫️', desc: 'You appreciate layers of flavor that unfold slowly and tell a story.' },
  sweet:       { title: 'The Sweet Tooth',    icon: '🍯', desc: 'A hint of sweetness makes everything better, and you know exactly where to find it.' },
  delicate:    { title: 'The Refined Eater',  icon: '🦢', desc: 'Precision and grace define your palate. You notice nuances that others miss.' },
  tempura:     { title: 'The Crunch Fanatic', icon: '🍤', desc: 'Golden, crispy, perfect — you want your sushi with a satisfying crunch every time.' },
  vegetarian:  { title: 'The Green Heart',    icon: '🌿', desc: 'Plants first. You find richness in vegetables and love clean, earth-forward flavor.' },
};

// ─── Module-level state ───────────────────────────────────────────────────────
let state         = null;
let reducedMotion = false;
let cardStack     = null;
let soundEnabled  = true;
let audioCtx      = null;
let friendResult  = null;   // decoded from URL hash before play
let toastTimer    = null;   // active toast clearTimeout handle
let modalTrigger  = null;   // element that opened the card modal (for focus restore)

// ─── Utilities ────────────────────────────────────────────────────────────────

/** Fisher-Yates shuffle — returns a new shuffled copy, never mutates original. */
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── State persistence ────────────────────────────────────────────────────────

function saveState() {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch (_) {
    // Quota exceeded or storage unavailable — continue without persisting
  }
}

/**
 * Attempt to restore saved state from localStorage.
 * Returns true and sets the module-level `state` if valid; false otherwise.
 */
function loadState() {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      Array.isArray(parsed.deck) &&
      parsed.deck.length > 0 &&
      Array.isArray(parsed.swipes)
    ) {
      // Bounds-check restorable fields
      parsed.currentIndex   = Math.max(0, Math.min(parsed.currentIndex   || 0, parsed.deck.length));
      parsed.undosRemaining = Math.max(0, Math.min(parsed.undosRemaining || 0, MAX_UNDOS));
      state = parsed;
      return true;
    }
  } catch (_) {
    // corrupted save — ignore
  }
  return false;
}

// ─── Dark Mode ────────────────────────────────────────────────────────────────

function initDarkMode() {
  const saved       = localStorage.getItem(THEME_KEY);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark      = saved ? saved === 'dark' : prefersDark;
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  updateThemeBtn(isDark);
}

function toggleDarkMode() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const next   = isDark ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem(THEME_KEY, next);
  updateThemeBtn(!isDark);
}

function updateThemeBtn(isDark) {
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.textContent = isDark ? '☀️' : '🌙';
    btn.setAttribute('aria-pressed', String(isDark));
  }
}

// ─── Sound Effects ────────────────────────────────────────────────────────────

function initSound() {
  soundEnabled = localStorage.getItem(SOUND_KEY) !== 'off';
  updateSoundBtn();
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  localStorage.setItem(SOUND_KEY, soundEnabled ? 'on' : 'off');
  updateSoundBtn();
}

function updateSoundBtn() {
  const btn = document.getElementById('sound-toggle');
  if (btn) {
    btn.textContent = soundEnabled ? '🔊' : '🔇';
    btn.setAttribute('aria-pressed', String(soundEnabled));
  }
}

function getAudioCtx() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (_) { return null; }
  }
  return audioCtx;
}

function playSwipeSound(dir) {
  if (!soundEnabled) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    if (dir === 'right') {
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.28, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.26);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.26);
    } else {
      osc.frequency.setValueAtTime(330, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.22, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.26);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.26);
    }
  } catch (_) { /* AudioContext unavailable */ }
}

function playResultsSound() {
  if (!soundEnabled) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    [523, 659, 784, 1047].forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.13;
      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
      osc.start(t);
      osc.stop(t + 0.36);
    });
  } catch (_) { /* AudioContext unavailable */ }
}

// ─── Confetti ─────────────────────────────────────────────────────────────────

function launchConfetti() {
  if (reducedMotion) return;
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  canvas.style.display = 'block';
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx     = canvas.getContext('2d');
  const colors  = ['#FF4757','#f4a261','#FFD166','#2ecc71','#74b9ff','#a29bfe','#fd79a8'];
  const pieces  = Array.from({ length: CONFIG.CONFETTI_COUNT }, () => ({
    x:      Math.random() * canvas.width,
    y:      Math.random() * -canvas.height * 0.5,
    w:      Math.random() * 13 + 6,
    h:      Math.random() * 6 + 3,
    angle:  Math.random() * Math.PI * 2,
    spin:   (Math.random() - 0.5) * 0.22,
    vx:     (Math.random() - 0.5) * 5,
    vy:     Math.random() * 4 + 2,
    color:  colors[Math.floor(Math.random() * colors.length)],
    opacity: 1,
  }));
  let frame = 0;
  const maxFrames = CONFIG.CONFETTI_MAX_FRAMES;
  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    frame++;
    for (const p of pieces) {
      p.x     += p.vx;
      p.y     += p.vy;
      p.angle += p.spin;
      p.vy    += 0.07;
      if (frame > maxFrames * 0.55) p.opacity -= 0.018;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.opacity);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (frame < maxFrames) {
      requestAnimationFrame(tick);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.style.display = 'none';
    }
  }
  requestAnimationFrame(tick);
}

// ─── Card Detail Modal ────────────────────────────────────────────────────────

function openCardModal(sushi) {
  const modal = document.getElementById('card-modal');
  if (!modal) return;
  modalTrigger = document.activeElement;
  document.getElementById('card-modal-name').textContent  = sushi.name;
  document.getElementById('card-modal-group').textContent = sushi.group;
  const img = document.getElementById('card-modal-img');
  img.src = sushi.image;
  img.alt = sushi.name;
  img.onerror = function () { handleImgError(this, sushi.name); };
  const tagsEl = document.getElementById('card-modal-tags');
  tagsEl.innerHTML = '';
  (sushi.tags || []).forEach(tag => {
    const span = document.createElement('span');
    span.className   = 'card-modal-tag';
    span.textContent = tag;
    tagsEl.appendChild(span);
  });
  const snippets = sushi.descriptionSnippets || [];
  document.getElementById('card-modal-desc').textContent = snippets.join(' ');
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  // Move focus into modal
  const closeBtn = document.getElementById('card-modal-close');
  if (closeBtn) closeBtn.focus();
}

function closeCardModal() {
  const modal = document.getElementById('card-modal');
  if (!modal) return;
  modal.style.display = 'none';
  document.body.style.overflow = '';
  // Restore focus to the element that opened the modal
  if (modalTrigger && typeof modalTrigger.focus === 'function') {
    modalTrigger.focus();
    modalTrigger = null;
  }
}

function trapFocusInModal(e) {
  const modal = document.getElementById('card-modal');
  if (!modal || modal.style.display === 'none') return;
  if (e.key !== 'Tab') return;
  const focusable = modal.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])');
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last  = focusable[focusable.length - 1];
  if (e.shiftKey) {
    if (document.activeElement === first) { e.preventDefault(); last.focus(); }
  } else {
    if (document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
}

// ─── Share Card (Canvas) ──────────────────────────────────────────────────────

function roundedRect(ctx, x, y, w, h, r) {
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

function renderShareCanvas(sushiImg) {
  const { perfectSushi, tagWeights, earnedBadges } = state.results;
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const C      = document.createElement('canvas');
  C.width      = 600;
  C.height     = 700;
  const ctx    = C.getContext('2d');

  // ── Background ───────────────────────────────────────────────────────────
  if (isDark) {
    const grd = ctx.createLinearGradient(0, 0, 600, 700);
    grd.addColorStop(0, '#1a0a1e');
    grd.addColorStop(1, '#0f0d28');
    ctx.fillStyle = grd;
  } else {
    const grd = ctx.createLinearGradient(0, 0, 600, 700);
    grd.addColorStop(0, '#FF4757');
    grd.addColorStop(0.6, '#f4a261');
    grd.addColorStop(1, '#FFD166');
    ctx.fillStyle = grd;
  }
  ctx.fillRect(0, 0, 600, 700);

  // ── Seigaiha dot texture ─────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  for (let r = 0; r < 700; r += 22) {
    for (let c = 0; c < 600; c += 22) {
      ctx.beginPath(); ctx.arc(c, r, 1, 0, Math.PI * 2); ctx.fill();
    }
  }

  // ── Japanese double-line border frame ────────────────────────────────────
  const gold = isDark ? 'rgba(201,168,76,0.7)' : 'rgba(255,255,255,0.45)';
  // Outer border
  ctx.strokeStyle = gold; ctx.lineWidth = 3;
  ctx.strokeRect(16, 16, 568, 668);
  // Inner border
  ctx.strokeStyle = gold; ctx.lineWidth = 1;
  ctx.strokeRect(22, 22, 556, 656);
  // Corner ornaments
  const corners = [[26,26],[574,26],[26,674],[574,674]];
  corners.forEach(([cx, cy]) => {
    ctx.fillStyle = gold;
    ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();
  });

  // ── Brand title ──────────────────────────────────────────────────────────
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font      = 'bold 44px serif';
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur  = 12;
  ctx.fillText('Raw 🍣', 300, 72);
  ctx.shadowBlur = 0;

  // Brushstroke underline under brand
  const ul = ctx.createLinearGradient(190, 78, 410, 78);
  ul.addColorStop(0, 'rgba(255,255,255,0)');
  ul.addColorStop(0.5, 'rgba(255,255,255,0.55)');
  ul.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.strokeStyle = ul; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(190, 82); ctx.lineTo(410, 82); ctx.stroke();

  // ── Sushi image in rounded card ──────────────────────────────────────────
  if (sushiImg) {
    ctx.save();
    roundedRect(ctx, 90, 100, 420, 310, 22);
    ctx.clip();
    ctx.drawImage(sushiImg, 90, 100, 420, 310);
    // Gradient shadow over image bottom
    const imgGrd = ctx.createLinearGradient(90, 300, 90, 410);
    imgGrd.addColorStop(0, 'rgba(0,0,0,0)');
    imgGrd.addColorStop(1, 'rgba(0,0,0,0.52)');
    ctx.fillStyle = imgGrd;
    ctx.fillRect(90, 100, 420, 310);
    ctx.restore();
  } else {
    // Placeholder
    ctx.save();
    roundedRect(ctx, 90, 100, 420, 310, 22);
    ctx.clip();
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(90, 100, 420, 310);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '48px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('🍣', 300, 270);
    ctx.restore();
  }
  // Gold border around image
  ctx.strokeStyle = isDark ? 'rgba(201,168,76,0.5)' : 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 2;
  roundedRect(ctx, 90, 100, 420, 310, 22);
  ctx.stroke();

  // ── Sushi name ────────────────────────────────────────────────────────────
  ctx.fillStyle = '#ffffff';
  ctx.font      = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 8;
  ctx.fillText(perfectSushi.name, 300, 450);
  ctx.shadowBlur = 0;

  // ── Personality type ──────────────────────────────────────────────────────
  const sortedTags = Object.entries(tagWeights).sort((a, b) => b[1] - a[1]);
  const topTag     = sortedTags[0]?.[0];
  const pType      = topTag && PERSONALITY_TYPES[topTag];
  if (pType) {
    ctx.font      = '20px sans-serif';
    ctx.fillStyle = isDark ? 'rgba(201,168,76,0.95)' : 'rgba(255,255,255,0.92)';
    ctx.fillText(`${pType.icon}  ${pType.title}`, 300, 486);
  }

  // ── Gold divider ──────────────────────────────────────────────────────────
  const divGrd = ctx.createLinearGradient(120, 506, 480, 506);
  divGrd.addColorStop(0, 'rgba(201,168,76,0)');
  divGrd.addColorStop(0.5, 'rgba(201,168,76,0.7)');
  divGrd.addColorStop(1, 'rgba(201,168,76,0)');
  ctx.strokeStyle = divGrd; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(120, 510); ctx.lineTo(480, 510); ctx.stroke();

  // ── Top tags ───────────────────────────────────────────────────────────────
  const topTagNames = sortedTags.slice(0, 4).map(([t]) => t).join('  ·  ');
  ctx.font      = '15px sans-serif';
  ctx.fillStyle = isDark ? 'rgba(220,200,255,0.7)' : 'rgba(255,255,255,0.75)';
  ctx.fillText(topTagNames, 300, 540);

  // ── Badge icons (up to 5) ─────────────────────────────────────────────────
  if (earnedBadges && earnedBadges.length > 0) {
    const badgeList = earnedBadges.slice(0, 5);
    const spacing   = 44;
    const startX    = 300 - ((badgeList.length - 1) * spacing) / 2;
    ctx.font = '22px sans-serif';
    badgeList.forEach((b, i) => {
      ctx.fillText(b.icon, startX + i * spacing, 580);
    });
  }

  // ── Footer with URL ───────────────────────────────────────────────────────
  ctx.font      = '13px sans-serif';
  ctx.fillStyle = isDark ? 'rgba(201,168,76,0.45)' : 'rgba(255,255,255,0.4)';
  ctx.fillText('raw-sushi.app', 300, 670);

  return C;
}

function downloadShareCard() {
  const { perfectSushi } = state.results;
  if (!perfectSushi) return;
  const btn = document.getElementById('share-btn');
  if (btn) { btn.textContent = '⏳ Generating…'; btn.disabled = true; }

  const finalize = (sushiImg) => {
    const canvas = renderShareCanvas(sushiImg);
    const dataURL = canvas.toDataURL('image/png');

    // Try Web Share API first (mobile Safari / Chrome)
    if (navigator.share && navigator.canShare) {
      canvas.toBlob(blob => {
        const file = new File([blob], 'my-perfect-sushi.png', { type: 'image/png' });
        const shareData = { title: `My perfect sushi: ${perfectSushi.name}`, text: `I’m a ${PERSONALITY_TYPES[Object.entries(state.results.tagWeights).sort((a,b)=>b[1]-a[1])[0]?.[0]]?.title || 'Sushi Lover'} 🍣`, files: [file] };
        if (navigator.canShare(shareData)) {
          navigator.share(shareData)
            .then(() => { if (btn) { btn.textContent = '📸 Share'; btn.disabled = false; } })
            .catch(() => { triggerPNGDownload(dataURL, btn); });
          return;
        }
        triggerPNGDownload(dataURL, btn);
      }, 'image/png');
    } else if (navigator.clipboard) {
      // Clipboard URL fallback
      const url = window.location.href;
      navigator.clipboard.writeText(url).then(() => {
        showToast('📋 Link copied to clipboard!', '', 2500);
      }).catch(() => {});
      triggerPNGDownload(dataURL, btn);
    } else {
      triggerPNGDownload(dataURL, btn);
    }
  };

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload  = () => finalize(img);
  img.onerror = () => finalize(null);
  img.src     = perfectSushi.image;
}

function triggerPNGDownload(dataURL, btn) {
  const link   = document.createElement('a');
  link.download = 'my-perfect-sushi.png';
  link.href     = dataURL;
  link.click();
  if (btn) { btn.textContent = '📸 Share'; btn.disabled = false; }
}

// ─── Error display ────────────────────────────────────────────────────────────

function showError(msg) {
  const errorScreen = document.getElementById('error-screen');
  const swipeScreen = document.getElementById('swipe-screen');
  if (swipeScreen) swipeScreen.style.display = 'none';
  document.getElementById('error-message').textContent = msg;
  if (errorScreen) errorScreen.style.display = 'flex';
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

function updateUI() {
  document.getElementById('progress-text').textContent =
    `Swipe ${state.swipes.length} / ${SWIPE_TOTAL}`;
  const progressFill = document.getElementById('progress-fill');
  if (progressFill) {
    progressFill.style.width = (state.swipes.length / SWIPE_TOTAL * 100) + '%';
  }
  document.getElementById('undo-count').textContent = state.undosRemaining;
  document.getElementById('undo-btn').disabled =
    state.undosRemaining === 0 || state.swipes.length === 0;
}

// ─── Image error placeholder ──────────────────────────────────────────────────

function handleImgError(imgEl, name) {
  const placeholder = document.createElement('div');
  placeholder.className = 'card-img-placeholder';
  placeholder.textContent = '🍣 ' + name;
  imgEl.parentNode.replaceChild(placeholder, imgEl);
}

// ─── Card rendering ───────────────────────────────────────────────────────────

function renderCard() {
  // Clear the stack
  cardStack.innerHTML = '';

  // Check if session is over
  if (state.currentIndex >= state.deck.length || state.swipes.length >= SWIPE_TOTAL) {
    computeResults();
    renderResults();
    return;
  }

  // ── Next card (peek / back) ──────────────────────────────────────────────
  // Only show a peek if there IS a next card AND we haven't hit 19 swipes yet
  if (
    state.currentIndex + 1 < state.deck.length &&
    state.swipes.length < SWIPE_TOTAL - 1
  ) {
    const nextSushi = state.deck[state.currentIndex + 1];
    const nextCard  = document.createElement('div');
    nextCard.className = 'card card--back';
    nextCard.innerHTML = `
      <img class="card-img" src="${nextSushi.image}" alt="${nextSushi.name}" />`;
    nextCard.querySelector('.card-img').onerror = function () {
      handleImgError(this, nextSushi.name);
    };
    cardStack.appendChild(nextCard);
  }

  // ── Current card (on top) ────────────────────────────────────────────────
  const sushi = state.deck[state.currentIndex];
  const card  = document.createElement('div');
  card.className = 'card';
  card.innerHTML = `
    <div class="card-indicator card-indicator--left" aria-hidden="true">NOPE</div>
    <div class="card-indicator card-indicator--right" aria-hidden="true">EAT</div>
    <img class="card-img" src="${sushi.image}" alt="${sushi.name}" />
    <div class="card-tap-hint" aria-hidden="true">Tap for details</div>`;
  card.querySelector('.card-img').onerror = function () {
    handleImgError(this, sushi.name);
  };
  cardStack.appendChild(card);
  attachDragListeners(card);

  // Start timing this card presentation (for swipe speed tracking)
  if (!state._swipeStart) state._swipeStart = Date.now();
}

// ─── Pointer-event drag ───────────────────────────────────────────────────────

function attachDragListeners(card) {
  let startX      = 0;
  let startY      = 0;
  let startTime   = 0;
  let deltaX      = 0;
  let cardWidth   = 0;
  let rafId       = null;
  let isDragging  = false;

  const leftIndicator  = card.querySelector('.card-indicator--left');
  const rightIndicator = card.querySelector('.card-indicator--right');

  card.addEventListener('pointerdown', (e) => {
    // Only primary pointer (mouse left-click, first touch)
    if (!e.isPrimary) return;
    startX    = e.clientX;
    startY    = e.clientY;
    startTime = Date.now();
    deltaX    = 0;
    cardWidth = card.getBoundingClientRect().width;
    isDragging = true;
    card.setPointerCapture(e.pointerId);
  });

  card.addEventListener('pointermove', (e) => {
    if (!isDragging || !e.isPrimary) return;
    deltaX = e.clientX - startX;

    card.classList.add('card--dragging');

    // Fade indicators based on drag distance
    const threshold = cardWidth * CONFIG.DRAG_COMMIT_THRESHOLD;
    if (leftIndicator && rightIndicator) {
      leftIndicator.style.opacity  = deltaX < 0 ? Math.min(1, Math.abs(deltaX) / threshold) : 0;
      rightIndicator.style.opacity = deltaX > 0 ? Math.min(1, Math.abs(deltaX) / threshold) : 0;
    }

    if (reducedMotion) return; // skip transform animation for reduced-motion users

    // Apply transform via rAF to avoid layout thrashing
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      const rotate = (deltaX / cardWidth) * CONFIG.MAX_TILT_DEG;
      card.style.transform = `translateX(${deltaX}px) rotate(${rotate}deg)`;
    });
  });

  // 3D hover tilt (mouse only, not during drag)
  card.addEventListener('mousemove', (e) => {
    if (isDragging || reducedMotion) return;
    const rect  = card.getBoundingClientRect();
    const cx    = rect.left + rect.width  / 2;
    const cy    = rect.top  + rect.height / 2;
    const tiltX = ((e.clientY - cy) / (rect.height / 2)) * -5;
    const tiltY = ((e.clientX - cx) / (rect.width  / 2)) *  5;
    card.style.transform = `perspective(900px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
  });

  card.addEventListener('mouseleave', () => {
    if (isDragging) return;
    card.style.transition = 'transform 0.45s ease';
    card.style.transform  = '';
    setTimeout(() => { card.style.transition = ''; }, 460);
  });

  card.addEventListener('pointerup', (e) => {
    if (!isDragging || !e.isPrimary) return;
    isDragging = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }

    card.classList.remove('card--dragging');

    const elapsed  = Date.now() - startTime;
    const velocity = elapsed > 0 ? Math.abs(deltaX) / elapsed : 0; // px/ms
    const deltaY   = Math.abs(e.clientY - startY);

    // Commit if dragged far enough or flicked fast enough
    if (Math.abs(deltaX) > cardWidth * CONFIG.DRAG_COMMIT_THRESHOLD || velocity > CONFIG.FLICK_VELOCITY) {
      commitSwipe(deltaX < 0 ? 'left' : 'right');
    } else if (Math.abs(deltaX) < CONFIG.TAP_SLOP_PX && deltaY < CONFIG.TAP_SLOP_PX && elapsed < CONFIG.TAP_TIMEOUT_MS) {
      // Tap — open detail modal
      card.style.transform = '';
      if (leftIndicator)  leftIndicator.style.opacity  = 0;
      if (rightIndicator) rightIndicator.style.opacity = 0;
      openCardModal(state.deck[state.currentIndex]);
    } else {
      // Spring the card back to centre
      card.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
      card.style.transform  = '';
      if (leftIndicator)  leftIndicator.style.opacity  = 0;
      if (rightIndicator) rightIndicator.style.opacity = 0;
      setTimeout(() => { card.style.transition = ''; }, 400);
    }
  });

  // Cancel drag if pointer leaves the window
  card.addEventListener('pointercancel', () => {
    if (!isDragging) return;
    isDragging = false;
    card.classList.remove('card--dragging');
    card.style.transform  = '';
    card.style.transition = '';
    if (leftIndicator)  leftIndicator.style.opacity  = 0;
    if (rightIndicator) rightIndicator.style.opacity = 0;
  });
}

// ─── Swipe commit & handling ──────────────────────────────────────────────────

function triggerBgPulse(dir) {
  const el = document.getElementById('bg-pulse');
  if (!el) return;
  el.classList.remove('bg-pulse--nope', 'bg-pulse--eat');
  void el.offsetWidth; // force reflow to restart animation
  el.classList.add(dir === 'left' ? 'bg-pulse--nope' : 'bg-pulse--eat');
}

function commitSwipe(dir) {
  const card = document.querySelector('#card-stack .card:not(.card--back)');
  if (!card) return;
  playSwipeSound(dir);
  triggerBgPulse(dir);
  spawnParticles(dir);

  // Haptic feedback on supported devices
  if (navigator.vibrate) navigator.vibrate(10);

  if (reducedMotion) {
    // Skip fly-off animation; use a simple fade-out class
    card.classList.add('card--gone');
    card.addEventListener('transitionend', () => { handleSwipe(dir); }, { once: true });
    // Fallback in case the transition never fires (e.g. display:none)
    setTimeout(() => handleSwipe(dir), 300);
  } else {
    card.classList.add(dir === 'left' ? 'card--swiping-left' : 'card--swiping-right');
    card.addEventListener('transitionend', () => { handleSwipe(dir); }, { once: true });
  }
}

function handleSwipe(dir) {
  const sushi     = state.deck[state.currentIndex];
  const now       = Date.now();
  const swipeTime = state._swipeStart ? now - state._swipeStart : 0;

  // Track decision time (sanity-bound: 200ms – 90s)
  if (!state.swipeTimes) state.swipeTimes = [];
  if (swipeTime > CONFIG.MIN_SWIPE_TIME_MS && swipeTime < CONFIG.MAX_SWIPE_TIME_MS) state.swipeTimes.push(swipeTime);

  state.swipes.push({ id: sushi.id, liked: dir === 'right', timestamp: now });
  state.currentIndex++;

  // ── Streak tracking ─────────────────────────────────────────────────────
  if (!('eatStreak' in state)) state.eatStreak = 0;
  if (!('maxStreak' in state)) state.maxStreak  = 0;

  if (dir === 'right') {
    state.eatStreak++;
    if (state.eatStreak > state.maxStreak) state.maxStreak = state.eatStreak;
    // Show streak badge once streak ≥ 2
    if (state.eatStreak >= 2) {
      const row = document.getElementById('streak-row');
      const cnt = document.getElementById('streak-count');
      if (row && cnt) {
        cnt.textContent = state.eatStreak;
        row.style.display = 'flex';
        // Re-trigger pop animation
        const badge = document.getElementById('streak-badge');
        if (badge) { badge.style.animation = 'none'; void badge.offsetWidth; badge.style.animation = ''; }
      }
    }
    // Combo toasts
    if      (state.eatStreak === 3)  showToast('🔥 3× Combo!',          'combo');
    else if (state.eatStreak === 5)  showToast('⚡ 5× Mega Combo!',      'combo');
    else if (state.eatStreak === 8)  showToast('💥 8× ULTRA Combo!!',  'combo');
    else if (state.eatStreak === 12) showToast('🌟 12× LEGENDARY!!!',  'combo');
  } else {
    state.eatStreak = 0;
    const row = document.getElementById('streak-row');
    if (row) row.style.display = 'none';
  }

  saveState();

  if (state.swipes.length >= SWIPE_TOTAL) {
    computeResults();
    renderResults();
  } else {
    renderCard();
    updateUI();
    // Start timing the next card now (after it's rendered)
    state._swipeStart = Date.now();
  }
}

// ─── Undo ─────────────────────────────────────────────────────────────────────

function undo() {
  if (state.undosRemaining <= 0 || state.swipes.length === 0) return;
  state.swipes.pop();
  state.currentIndex--;
  state.undosRemaining--;
  // Reset streak and streak badge
  state.eatStreak = 0;
  if (state.swipeTimes && state.swipeTimes.length > 0) state.swipeTimes.pop();
  const row = document.getElementById('streak-row');
  if (row) row.style.display = 'none';
  saveState();
  renderCard();
  updateUI();
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

function computeResults() {
  const swipes = state.swipes; // exactly SWIPE_TOTAL entries
  const deck   = state.deck;

  // 1. Build tagWeights: liked sushi tags += 2, disliked tags -= 1
  const tagWeights = {};
  for (const swipe of swipes) {
    const sushi = deck.find(s => s.id === swipe.id);
    if (!sushi) continue;
    for (const tag of sushi.tags) {
      tagWeights[tag] = (tagWeights[tag] || 0) + (swipe.liked ? 2 : -1);
    }
  }

  // 2. Group liked sushi, keyed by group name
  const groupData = {}; // { groupName: [{sushi, swipeIndex}] }
  for (let i = 0; i < swipes.length; i++) {
    const swipe = swipes[i];
    if (!swipe.liked) continue;
    const sushi = deck.find(s => s.id === swipe.id);
    if (!sushi) continue;
    if (!groupData[sushi.group]) groupData[sushi.group] = [];
    groupData[sushi.group].push({ sushi, swipeIndex: i });
  }

  // Base score = sum of tagWeights for a sushi's tags (no group bonus)
  function baseScore(sushi) {
    return sushi.tags.reduce((sum, tag) => sum + (tagWeights[tag] || 0), 0);
  }

  // 3. Assign group — must have ≥ 3 likes to qualify; 'Explorer' if none qualify
  let assignedGroup = 'Explorer';
  let bestCount     = 0;

  for (const [group, items] of Object.entries(groupData)) {
    const count = items.length;
    if (count < CONFIG.GROUP_THRESHOLD) continue; // minimum threshold to qualify for a group

    if (count > bestCount) {
      bestCount     = count;
      assignedGroup = group;
    } else if (count === bestCount) {
      // Tiebreak 1: average base score
      const currentItems = groupData[assignedGroup] || [];
      const currentAvg   = currentItems.reduce((s, { sushi }) => s + baseScore(sushi), 0) / currentItems.length;
      const newAvg       = items.reduce((s, { sushi }) => s + baseScore(sushi), 0) / items.length;

      if (newAvg > currentAvg) {
        assignedGroup = group;
      } else if (newAvg === currentAvg) {
        // Tiebreak 2: whichever group had its earliest liked sushi first
        const currentFirst = Math.min(...currentItems.map(i => i.swipeIndex));
        const newFirst     = Math.min(...items.map(i => i.swipeIndex));
        if (newFirst < currentFirst) assignedGroup = group;
      }
    }
  }

  // 4. Full match score = baseScore + 3 group bonus
  function matchScore(sushi) {
    let score = baseScore(sushi);
    if (assignedGroup !== 'Explorer' && sushi.group === assignedGroup) score += CONFIG.GROUP_BONUS;
    return score;
  }

  // 5. Perfect sushi = liked sushi with highest matchScore (earliest-swiped as tiebreaker)
  const likedSwipes = swipes.filter(s => s.liked);
  let perfectSushi  = null;
  let bestScore     = -Infinity;
  let bestIndex     = Infinity;

  for (let i = 0; i < likedSwipes.length; i++) {
    const swipe = likedSwipes[i];
    const sushi = deck.find(s => s.id === swipe.id);
    if (!sushi) continue;
    const score = matchScore(sushi);
    if (score > bestScore || (score === bestScore && i < bestIndex)) {
      bestScore    = score;
      bestIndex    = i;
      perfectSushi = sushi;
    }
  }

  state.results = { tagWeights, assignedGroup, perfectSushi, groupData };

  // ── Extended stats & badges ─────────────────────────────────────────────
  const totalLikes   = likedSwipes.length;
  const times        = state.swipeTimes || [];
  const avgSwipeTime = times.length
    ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
    : 0;
  state.results.totalLikes   = totalLikes;
  state.results.avgSwipeTime = avgSwipeTime;

  state.results.earnedBadges = BADGES.filter(b => {
    try { return b.test(state.results, state); } catch (_) { return false; }
  });
}

// ─── Results rendering ────────────────────────────────────────────────────────

function renderResults() {
  const { tagWeights, assignedGroup, perfectSushi, groupData, earnedBadges, totalLikes, avgSwipeTime } = state.results;

  // Hide swipe screen; animate results screen in
  const swipeScreen   = document.getElementById('swipe-screen');
  const resultsScreen = document.getElementById('results-screen');
  swipeScreen.classList.add('screen-exit');
  setTimeout(() => {
    swipeScreen.style.display = 'none';
    swipeScreen.classList.remove('screen-exit');
  }, 280);
  resultsScreen.style.display = 'flex';
  resultsScreen.classList.add('screen-enter');
  setTimeout(() => {
    resultsScreen.classList.remove('screen-enter');
    // Move focus to results screen
    const playAgainBtn = document.getElementById('play-again-btn');
    if (playAgainBtn) playAgainBtn.focus();
  }, 500);

  launchConfetti();
  playResultsSound();

  // ── Friend banner ────────────────────────────────────────────────────────
  if (friendResult) {
    const sortedTW   = Object.entries(tagWeights).sort((a, b) => b[1] - a[1]);
    const myTags     = new Set(sortedTW.slice(0, 5).map(([t]) => t));
    const friendTags = new Set(friendResult.tags);
    const overlap    = [...myTags].filter(t => friendTags.has(t)).length;
    const compat     = Math.round((overlap / Math.max(myTags.size, friendTags.size, 1)) * 100);
    const sharedList = [...myTags].filter(t => friendTags.has(t)).slice(0, 2).join(' & ');
    const msg = compat >= CONFIG.COMPAT_HIGH_PCT
      ? `🍣 You & your friend are ${compat}% sushi-compatible! You both love ${sharedList || 'the same vibes'}`
      : compat >= CONFIG.COMPAT_MID_PCT
      ? `🤔 You & your friend are ${compat}% sushi-compatible — interesting combo!`
      : `😅 You & your friend are only ${compat}% sushi-compatible. Opposites attract?`;
    const banner = document.getElementById('friend-banner');
    const text   = document.getElementById('friend-banner-text');
    if (banner && text) { text.textContent = msg; banner.style.display = 'block'; }
    setTimeout(() => showToast(`👫 Friend compat: ${compat}%`, 'compat', 3500), 800);
  }

  // ── Edge case: user liked nothing ───────────────────────────────────────
  if (!perfectSushi) {
    document.getElementById('result-name').textContent        = 'No Sushi For You! 😅';
    document.getElementById('result-group').textContent       = 'You rejected everything!';
    document.getElementById('result-personality').textContent =
      "Wow, you're picky! Not a single sushi made the cut. Are you sure sushi is for you? Try again — there's something for everyone!";
    document.getElementById('result-img').style.display       = 'none';
    document.getElementById('result-tags').innerHTML          = '';
    document.getElementById('result-groups-breakdown').innerHTML = '';
    return;
  }

  // Helper — apply staggered reveal animation
  function revealEl(id, delayMs) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.animation = `resultReveal 0.5s cubic-bezier(0.34,1.56,0.64,1) ${delayMs}ms both`;
  }

  // ── Winning sushi card ───────────────────────────────────────────────────
  const resultImg = document.getElementById('result-img');
  resultImg.src   = perfectSushi.image;
  resultImg.alt   = perfectSushi.name;
  resultImg.style.display = '';
  resultImg.onerror = function () { handleImgError(this, perfectSushi.name); };
  document.getElementById('result-name').textContent  = perfectSushi.name;
  document.getElementById('result-group').textContent = 'Group: ' + assignedGroup;

  // ── Personality type card ────────────────────────────────────────────────
  const sortedTagsFull = Object.entries(tagWeights).sort((a, b) => b[1] - a[1]);
  const topTagKey      = sortedTagsFull[0]?.[0];
  const pType          = topTagKey && PERSONALITY_TYPES[topTagKey];
  const typeCard       = document.getElementById('result-type-card');
  if (pType && typeCard) {
    typeCard.style.display = '';
    document.getElementById('result-type-icon').textContent  = pType.icon;
    document.getElementById('result-type-title').textContent = pType.title;
    document.getElementById('result-type-desc').textContent  = pType.desc;
  } else if (typeCard) {
    typeCard.style.display = 'none';
  }

  // ── Personality paragraph ────────────────────────────────────────────────
  const sortedTags = sortedTagsFull.map(([t]) => t);
  const snippet0   = perfectSushi.descriptionSnippets?.[0] || '';
  const snippet1   = perfectSushi.descriptionSnippets?.[1] || '';
  document.getElementById('result-personality').textContent =
    (pType ? `${pType.icon} ${pType.title}. ` : '') + `${snippet0} ${snippet1}`.trim();

  // ── Top 5 tags list ──────────────────────────────────────────────────────
  const tagsList = document.getElementById('result-tags');
  tagsList.innerHTML = '';
  sortedTags.slice(0, 5).forEach(tag => {
    const li = document.createElement('li');
    li.textContent = `${tag}: ${tagWeights[tag]}`;
    tagsList.appendChild(li);
  });

  // ── Group breakdown bars ─────────────────────────────────────────────────
  const allGroups = {};
  for (const swipe of state.swipes) {
    const sushi = state.deck.find(s => s.id === swipe.id);
    if (!sushi) continue;
    if (!allGroups[sushi.group]) allGroups[sushi.group] = 0;
    if (swipe.liked) allGroups[sushi.group]++;
  }
  const maxCount  = Math.max(...Object.values(allGroups), 1);
  const breakdown = document.getElementById('result-groups-breakdown');
  breakdown.innerHTML = '';
  Object.entries(allGroups)
    .sort((a, b) => b[1] - a[1])
    .forEach(([group, count]) => {
      const pct  = (count / maxCount * 100) + '%';
      const item = document.createElement('div');
      item.className = 'bar-item';
      item.innerHTML = `
        <span class="bar-label">${group}</span>
        <div class="bar-track"><div class="bar-fill" style="--bar-width: ${pct}"></div></div>
        <span class="bar-count">${count}</span>`;
      breakdown.appendChild(item);
    });

  // ── Achievement badges ───────────────────────────────────────────────────
  const badgesSection = document.getElementById('badges-section');
  const badgesGrid    = document.getElementById('badges-grid');
  if (badgesGrid && earnedBadges && earnedBadges.length > 0) {
    badgesGrid.innerHTML = '';
    earnedBadges.forEach((badge, i) => {
      const el = document.createElement('div');
      el.className = 'badge-item';
      el.style.animationDelay = `${300 + i * 80}ms`;
      el.innerHTML = `<span class="badge-icon">${badge.icon}</span><span>${badge.label}</span>`;
      el.title = badge.desc;
      badgesGrid.appendChild(el);
    });
    if (badgesSection) badgesSection.style.display = 'block';
    setTimeout(() => showToast(`${earnedBadges[0].icon} Achievement: ${earnedBadges[0].label}!`, 'badge', 2800), 1400);
  }

  // ── Speed stat ───────────────────────────────────────────────────────────
  const speedStatEl = document.getElementById('speed-stat');
  const speedTextEl = document.getElementById('speed-stat-text');
  if (speedStatEl && speedTextEl && avgSwipeTime > 0) {
    const secs  = (avgSwipeTime / 1000).toFixed(1);
    const label = avgSwipeTime < CONFIG.SPEED_DEMON_MS ? ' ⚡ Lightning fast!'
                : avgSwipeTime > CONFIG.SLOW_SAVOR_MS ? ' 🍵 Savoring every card'
                : ' 👌 Steady pace';
    speedTextEl.textContent  = `⏱️ Avg decision time: ${secs}s${label}`;
    speedStatEl.style.display = 'block';
  }

  // ── Encode deep-link into URL hash ───────────────────────────────────────
  encodeResultHash();

  // ── Cinematic staggered reveal ───────────────────────────────────────────
  revealEl('result-type-card',   0);
  revealEl('result-card',        120);
  revealEl('result-personality', 240);
  revealEl('result-breakdown',   360);
  revealEl('badges-section',     480);
  revealEl('speed-stat',         560);
  revealEl('results-actions',    640);
}

// ─── Swipe hint overlay ───────────────────────────────────────────────────────

function showSwipeHint() {
  if (reducedMotion) return;
  const card = document.querySelector('#card-stack .card:not(.card--back)');
  if (!card) return;
  const hint = document.createElement('div');
  hint.className = 'swipe-hint-overlay';
  hint.setAttribute('aria-hidden', 'true');
  hint.innerHTML = '<span class="swipe-hint-text">← Nope &nbsp;|&nbsp; Eat →</span>';
  card.appendChild(hint);
}

// ─── Splash screen ────────────────────────────────────────────────────────────

function showSplash() {
  const splash = document.getElementById('splash-screen');
  if (!splash) return;
  splash.classList.remove('splash-out');
  addSakuraPetals('sakura-field-splash', 24, ['#ffb7c5', '#ffc8d5', '#ffe4ec', '#ffaec0', '#ff85a1']);
  splash.style.display = 'flex';
}

function hideSplash() {
  const splash = document.getElementById('splash-screen');
  if (!splash) return;
  splash.classList.add('splash-out');
  setTimeout(() => {
    splash.style.display = 'none';
    // Move focus to the first interactive element on swipe screen
    const nopeBtn = document.getElementById('nope-btn');
    if (nopeBtn) nopeBtn.focus();
  }, 560);
  // Start ambient sakura background
  const bg = document.getElementById('sakura-bg');
  if (bg) {
    addSakuraPetals('sakura-bg', 16, ['#ffb7c5', '#ffc8d5', '#ffe4ec', '#f4a0b8', '#ffd6e0']);
    setTimeout(() => bg.classList.add('visible'), 700);
  }
}

// ─── Sakura petal spawner ─────────────────────────────────────────────────────

function addSakuraPetals(containerId, count, colors) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const petal     = document.createElement('div');
    petal.className = 'sakura-petal';
    const size      = 7 + Math.random() * 11;
    petal.style.cssText = [
      `left: ${Math.random() * 100}%`,
      `width: ${size}px`,
      `height: ${size}px`,
      `background: ${colors[Math.floor(Math.random() * colors.length)]}`,
      `animation-duration: ${4.5 + Math.random() * 7}s`,
      `animation-delay: ${Math.random() * 9}s`,
      `opacity: 0`,
    ].join(';');
    container.appendChild(petal);
  }
}

// ─── Toast notification ───────────────────────────────────────────────────────

function showToast(msg, type = '', duration = 2400) {
  const el = document.getElementById('toast');
  if (!el) return;
  clearTimeout(toastTimer);
  el.textContent = msg;
  el.className   = 'toast' + (type ? ' toast--' + type : '');
  void el.offsetWidth; // force reflow for re-animation
  el.classList.add('toast--visible');
  toastTimer = setTimeout(() => el.classList.remove('toast--visible'), duration);
}

// ─── Swipe particles ──────────────────────────────────────────────────────────

function spawnParticles(dir) {
  if (reducedMotion) return;
  const emojis = dir === 'right'
    ? ['🍣', '❤️', '😍', '✨', '🎉', '💫']
    : ['💨', '✕', '😑', '👋', '🙅'];
  const count = dir === 'right' ? 8 : 5;
  const cx    = window.innerWidth  * (dir === 'right' ? 0.70 : 0.30);
  const cy    = window.innerHeight * 0.40;
  for (let i = 0; i < count; i++) {
    const el        = document.createElement('span');
    el.className    = 'swipe-particle';
    el.textContent  = emojis[Math.floor(Math.random() * emojis.length)];
    const angle     = (Math.random() * 200) - 100;
    const dist      = 70 + Math.random() * 110;
    const dx        = Math.round(Math.cos((angle * Math.PI) / 180) * dist * (dir === 'right' ? 1 : -1));
    const dy        = Math.round(Math.sin((angle * Math.PI) / 180) * dist - 70);
    el.style.cssText = `left:${cx}px;top:${cy}px;--p-end:translate(${dx}px,${dy}px) scale(0.4);animation-delay:${i * 45}ms`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 900 + i * 45);
  }
}

// ─── Deep-link helpers ────────────────────────────────────────────────────────

function encodeResultHash() {
  if (!state || !state.results) return;
  const { tagWeights, perfectSushi } = state.results;
  const sorted  = Object.entries(tagWeights).sort((a, b) => b[1] - a[1]);
  const topTag  = sorted[0]?.[0] || '';
  const top3    = sorted.slice(0, 3).map(([t]) => t).join(',');
  const pType   = PERSONALITY_TYPES[topTag];
  const title   = pType ? pType.title.replace(/ /g, '_') : 'Sushi_Lover';
  const sname   = perfectSushi ? perfectSushi.name : '';
  try {
    history.replaceState(null, '', `#r=${encodeURIComponent(title)}|${encodeURIComponent(top3)}|${encodeURIComponent(sname)}`);
  } catch (_) {}
}

function decodeFriendHash() {
  try {
    const hash = window.location.hash;
    if (!hash.startsWith('#r=')) return null;
    const [rawTitle, rawTags, rawName] = hash.slice(3).split('|').map(decodeURIComponent);
    if (!rawTitle) return null;
    return {
      title : rawTitle.replace(/_/g, ' '),
      tags  : rawTags ? rawTags.split(',') : [],
      name  : rawName || '',
    };
  } catch (_) { return null; }
}

// ─── Data loading ─────────────────────────────────────────────────────────────

async function loadData() {
  try {
    const response = await fetch('data/sushi.json');
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const data = await response.json();

    // Decode friend deep-link from URL hash before starting
    friendResult = decodeFriendHash();
    // Clear the hash so the user's own result can be encoded after play
    if (friendResult) {
      try { history.replaceState(null, '', window.location.pathname); } catch (_) {}
    }

    // Restore saved session or start fresh
    if (!loadState() || state.deck.length === 0) {
      state = {
        deck:           shuffle(data),
        currentIndex:   0,
        swipes:         [],
        undosRemaining: MAX_UNDOS,
        eatStreak:      0,
        maxStreak:      0,
        swipeTimes:     [],
        _swipeStart:    null,
      };
      saveState();
    } else {
      // Backfill missing fields on restored legacy state
      if (!('eatStreak'     in state)) state.eatStreak     = 0;
      if (!('maxStreak'     in state)) state.maxStreak      = 0;
      if (!('swipeTimes'    in state)) state.swipeTimes     = [];
    }

    renderCard();
    updateUI();

    // Show friend banner hint before swiping starts
    if (friendResult) {
      setTimeout(() => showToast(`👫 Your friend is: ${friendResult.title}! Can you beat them?`, 'compat', 4000), 800);
    }
  } catch (err) {
    showError(
      "Could not load sushi data. Make sure you're running this from a local server (not file://).\n\nTechnical: " +
      err.message
    );
  }
}

// ─── Initialisation ───────────────────────────────────────────────────────────

function init() {
  // Cache DOM references
  cardStack     = document.getElementById('card-stack');
  reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Action button listeners
  document.getElementById('nope-btn').addEventListener('click', () => commitSwipe('left'));
  document.getElementById('eat-btn').addEventListener('click',  () => commitSwipe('right'));
  document.getElementById('undo-btn').addEventListener('click', undo);
  document.getElementById('play-again-btn').addEventListener('click', () => {
    localStorage.removeItem(STATE_KEY);
    // Reset in-page without full reload
    const resultsScreen = document.getElementById('results-screen');
    const swipeScreen   = document.getElementById('swipe-screen');
    if (resultsScreen) resultsScreen.style.display = 'none';
    if (swipeScreen)   swipeScreen.style.display   = '';
    // Clear URL hash
    try { history.replaceState(null, '', window.location.pathname); } catch (_) {}
    // Re-load data and start fresh
    loadData();
    // Re-show splash
    showSplash();
  });

  // Header control listeners
  document.getElementById('theme-toggle').addEventListener('click', toggleDarkMode);
  document.getElementById('sound-toggle').addEventListener('click', toggleSound);
  document.getElementById('share-btn').addEventListener('click', downloadShareCard);
  document.getElementById('card-modal-close').addEventListener('click', closeCardModal);
  document.getElementById('card-modal-backdrop').addEventListener('click', closeCardModal);

  // Splash begin button
  const splashBtn = document.getElementById('splash-begin-btn');
  if (splashBtn) {
    splashBtn.addEventListener('click', hideSplash);
    // Allow Enter/Space on splash to begin
    splashBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); hideSplash(); }
    });
  }

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    // Focus trap for modal
    trapFocusInModal(e);

    if (e.key === 'Escape') { closeCardModal(); return; }

    // Undo: Ctrl+Z / Cmd+Z
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      undo();
      return;
    }

    // Swipe via arrow keys (only on swipe screen)
    const swipeScreen = document.getElementById('swipe-screen');
    if (swipeScreen && swipeScreen.style.display !== 'none') {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        commitSwipe('left');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        commitSwipe('right');
      }
    }
  });

  // Init feature modules
  initDarkMode();
  initSound();

  // Show splash then load data
  if (!reducedMotion) {
    showSplash();
  }
  loadData();
}

document.addEventListener('DOMContentLoaded', init);
