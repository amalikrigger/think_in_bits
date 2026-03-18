/* =============================================================
   Senior Trip Itinerary - script.js
   Vanilla ES6+  |  No external libraries  |  No import statements
   ============================================================= */

'use strict';

/* ─────────────────────────────────────────────
   AUTH GATE
───────────────────────────────────────────── */

const AUTH_HASH = 'c16b2793ae36635b79542503b2caf0a570b5c4dbe92e7f9acf5f01b4254a9e8b';

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function initAuthGate() {
  const gate = document.getElementById('auth-gate');
  const appShell = document.getElementById('app-shell');
  const form = document.getElementById('auth-form');
  const input = document.getElementById('auth-password');
  const error = document.getElementById('auth-error');

  if (!gate || !appShell) return;

  // Already authenticated this session
  if (sessionStorage.getItem('authenticated') === 'true') {
    gate.classList.add('auth-hidden');
    appShell.classList.remove('app-hidden');
    startApp();
    return;
  }

  // Focus password input
  if (input) input.focus();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const value = input.value;
    if (!value) return;

    const hashed = await hashPassword(value);

    if (hashed === AUTH_HASH) {
      sessionStorage.setItem('authenticated', 'true');
      gate.classList.add('auth-success');
      error.textContent = '';

      setTimeout(() => {
        gate.classList.add('auth-hidden');
        appShell.classList.remove('app-hidden');
        startApp();
      }, 400);
    } else {
      error.textContent = 'Incorrect password. Try again.';
      gate.classList.add('auth-shake');
      input.value = '';
      input.focus();
      setTimeout(() => gate.classList.remove('auth-shake'), 500);
    }
  });
}

/* ─────────────────────────────────────────────
   DATA
───────────────────────────────────────────── */

const ITINERARY = [
  {
    dayNumber: 8,
    dayName: 'Sunday',
    label: 'Day 8 - Sunday',
    badges: ['Travel', 'Arrival', 'Food'],
    activities: [
      { title: 'Be at airport by 12:00 PM, fly in at 3:15 PM', cost: null, isTBD: false, link: null, categories: ['travel'] },
      { title: 'Get rental cars', cost: null, isTBD: false, link: null, categories: ['travel'] },
      { title: 'Unpack and settle in rooms', cost: null, isTBD: false, link: null, categories: ['hotel'] },
      { title: 'Plaza Carolina Mall', cost: null, isTBD: true, link: null, categories: ['shopping', 'free-time'] },
      { title: 'Dinner', cost: 15, isTBD: false, link: null, categories: ['food'] }
    ]
  },
  {
    dayNumber: 9,
    dayName: 'Monday',
    label: 'Day 9 - Monday',
    badges: ['Adventure', 'Food', 'Entertainment'],
    activities: [
      { title: 'Culebra Boat Ride', cost: 135, isTBD: false, link: 'https://www.viator.com/account/booking/detail/1358688163', categories: ['adventure', 'water'] },
      { title: 'Lunch', cost: null, isTBD: false, link: null, categories: ['food'] },
      { title: 'Back to hotel', cost: null, isTBD: false, link: null, categories: ['hotel'] },
      { title: 'Free time', cost: null, isTBD: false, link: null, categories: ['free-time'] },
      { title: '4DX Movie Night', cost: 35, isTBD: false, link: null, categories: ['entertainment'] }
    ]
  },
  {
    dayNumber: 10,
    dayName: 'Tuesday',
    label: 'Day 10 - Tuesday',
    badges: ['Culture', 'Food', 'Adventure'],
    activities: [
      { title: 'Brunch', cost: null, isTBD: false, link: null, categories: ['food'] },
      { title: 'Old San Juan - Bracelet Making', cost: 25, isTBD: false, link: null, categories: ['culture', 'shopping'] },
      { title: 'Old San Juan - Drnkin Cookies', cost: null, isTBD: true, link: null, categories: ['food'] },
      { title: 'Trampoline Park', cost: '25–30', isTBD: false, link: null, categories: ['adventure'], note: 'Two sessions available: ~$25 and $15–$30; exact split TBD' },
      { title: 'Photo Booth in San Juan', cost: null, isTBD: false, link: null, categories: ['fun'] },
      { title: 'Tavola (Italian Dinner)', cost: null, isTBD: false, link: null, categories: ['food', 'formal'] }
    ]
  },
  {
    dayNumber: 11,
    dayName: 'Wednesday',
    label: 'Day 11 - Wednesday',
    badges: ['Nature', 'Adventure', 'Food'],
    activities: [
      {
        title: 'El Yunque Rainforest',
        cost: null,
        isTBD: false,
        link: 'https://www.viator.com/tours/San-Juan/El-Yunque-Rain-Forest-Turisteando-En-El-Encanto/d903-350273P1?pid=P00030058&uid=U00252041&mcid=65533&currency=USD&aid=CallCenter-ViatorDesktopUSCA-General&CALL_CENTER_SOURCE=ViatorUSCA-General&CONTACTID=693939074367',
        categories: ['nature', 'adventure']
      },
      { title: 'Lunch', cost: null, isTBD: false, link: null, categories: ['food'] },
      { title: 'Back to hotel', cost: null, isTBD: false, link: null, categories: ['hotel'] }
    ]
  },
  {
    dayNumber: 12,
    dayName: 'Thursday',
    label: 'Day 12 - Thursday',
    badges: ['Free Day', 'Formal Night'],
    activities: [
      {
        title: 'Free Day (with boundaries)',
        cost: null,
        isTBD: false,
        link: null,
        categories: ['free-time'],
        options: [
          'Bracelet making',
          'Going back to the mall',
          'Escape room',
          'Staying at hotel',
          'Sunset photos at the beach'
        ]
      },
      { title: 'Formal Dinner - La Castia De Roses', cost: null, isTBD: false, link: null, categories: ['food', 'formal'] }
    ]
  },
  {
    dayNumber: null,
    dayName: 'Friday',
    label: 'Friday - Departure',
    badges: ['Travel', 'Departure'],
    activities: [
      { title: 'Sleep in & Have Brunch', cost: null, isTBD: false, link: null, categories: ['food'] },
      { title: 'Return rental cars', cost: null, isTBD: false, link: null, categories: ['travel'] },
      { title: 'Fly out at 2:45 PM', cost: null, isTBD: false, link: null, categories: ['travel'] }
    ]
  }
];

const CHECKLIST = [
  'Valid ID / Passport',
  'Flight confirmation',
  'Spending money + card',
  'Phone charger + portable battery',
  'Swimwear',
  'Sunscreen (SPF 30+)',
  'Comfortable walking shoes',
  'Formal outfit for dinner night',
  'Lightweight rain jacket',
  'Reusable water bottle',
  'Snacks for travel',
  'Earbuds / headphones',
  'Camera or extra phone storage',
  'Any required medications',
  'Emergency contact info written down'
];

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */

/** True if the user prefers reduced motion */
const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Returns a Date representing midnight (local) for a yyyy-mm-dd string,
 * or null if the string is falsy / invalid.
 */
function parseDateLocal(str) {
  if (!str) return null;
  const d = new Date(`${str}T00:00:00`);
  return isNaN(d.getTime()) ? null : d;
}

/** Return today at midnight local time */
function todayMidnight() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Show a brief toast message */
function showToast(msg) {
  const existing = document.getElementById('js-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'js-toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.textContent = msg;
  toast.style.cssText = [
    'position:fixed',
    'bottom:1.5rem',
    'left:50%',
    'transform:translateX(-50%)',
    'background:var(--color-accent,#0077cc)',
    'color:#fff',
    'padding:.6rem 1.2rem',
    'border-radius:999px',
    'font-size:.9rem',
    'z-index:9999',
    'pointer-events:none',
    'opacity:1',
    'transition:opacity .4s ease'
  ].join(';');
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 450);
  }, 2500);
}

/* ─────────────────────────────────────────────
   DAY CHIPS
───────────────────────────────────────────── */

function renderDayChips() {
  const container = document.getElementById('day-chips');
  if (!container) return;
  container.innerHTML = '';

  ITINERARY.forEach((day, index) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'day-chip';
    btn.textContent = day.label;
    btn.dataset.dayIndex = index;
    btn.setAttribute('aria-label', `Go to ${day.label}`);

    btn.addEventListener('click', () => {
      const sectionId = getDaySectionId(index);
      const target = document.getElementById(sectionId);
      if (target) {
        target.scrollIntoView({
          behavior: prefersReducedMotion() ? 'auto' : 'smooth',
          block: 'start'
        });
      }
      setActiveChip(index);
    });

    container.appendChild(btn);
  });

  // Apply active chip based on saved start date
  highlightActiveChip();
}

function getDaySectionId(index) {
  return `day-section-${index}`;
}

function setActiveChip(index) {
  const chips = document.querySelectorAll('.day-chip');
  chips.forEach((chip, i) => {
    chip.classList.toggle('active', i === index);
    chip.setAttribute('aria-current', i === index ? 'true' : 'false');
  });
}

function highlightActiveChip() {
  const startDateStr = localStorage.getItem('tripStartDate');
  const startDate = parseDateLocal(startDateStr);
  if (!startDate) return;

  const today = todayMidnight();
  const diffDays = Math.round((today - startDate) / 86400000);

  if (diffDays >= 0 && diffDays < ITINERARY.length) {
    setActiveChip(diffDays);
  }
}

/* ─────────────────────────────────────────────
   ITINERARY SECTIONS
───────────────────────────────────────────── */

const BADGE_CLASS_MAP = {
  'Travel': 'badge-travel',
  'Arrival': 'badge-travel',
  'Departure': 'badge-departure',
  'Food': 'badge-food',
  'Adventure': 'badge-adventure',
  'Culture': 'badge-culture',
  'Entertainment': 'badge-entertainment',
  'Free Time': 'badge-free-time',
  'Free Day': 'badge-free-time',
  'Formal Night': 'badge-formal',
  'Nature': 'badge-nature',
  'Shopping': 'badge-culture',
  'Water': 'badge-adventure'
};

function renderItinerary() {
  const container = document.getElementById('itinerary-sections');
  if (!container) return;
  container.innerHTML = '';

  ITINERARY.forEach((day, index) => {
    const section = document.createElement('section');
    section.className = 'day-section';
    section.id = getDaySectionId(index);

    // ── Card wrapper
    const card = document.createElement('div');
    card.className = 'day-card';
    card.style.setProperty('--delay', `${index * 0.1}s`);

    // ── Card header
    const header = document.createElement('div');
    header.className = 'day-card-header';

    const title = document.createElement('h2');
    title.className = 'day-label';
    title.textContent = day.label;
    header.appendChild(title);

    // Badges
    if (day.badges && day.badges.length) {
      const badgeWrap = document.createElement('div');
      badgeWrap.className = 'day-card-badges';
      day.badges.forEach(b => {
        const badge = document.createElement('span');
        const badgeMod = BADGE_CLASS_MAP[b] || '';
        badge.className = ('badge' + (badgeMod ? ' ' + badgeMod : '')).trim();
        badge.textContent = b;
        badgeWrap.appendChild(badge);
      });
      header.appendChild(badgeWrap);
    }

    card.appendChild(header);

    // ── Activity list
    const body = document.createElement('div');
    body.className = 'day-card-body';

    const ul = document.createElement('ul');
    ul.className = 'activity-list';

    day.activities.forEach(activity => {
      const li = document.createElement('li');
      li.className = 'activity-item' + (activity.isTBD ? ' tbd' : '');

      // Title
      const titleSpan = document.createElement('span');
      titleSpan.className = 'activity-title';
      titleSpan.textContent = activity.title;
      li.appendChild(titleSpan);

      // TBD marker
      if (activity.isTBD) {
        const tbd = document.createElement('span');
        tbd.className = 'tbd-badge';
        tbd.setAttribute('aria-label', 'To be determined');
        tbd.textContent = 'TBD';
        li.appendChild(tbd);
      }

      // Cost pill
      if (activity.cost !== null && activity.cost !== undefined) {
        const pill = document.createElement('span');
        pill.className = 'cost-pill';
        const costDisplay = typeof activity.cost === 'number'
          ? `$${activity.cost}`
          : `$${activity.cost}`;
        pill.textContent = costDisplay;
        li.appendChild(pill);
      }

      // Note
      if (activity.note) {
        const note = document.createElement('p');
        note.className = 'activity-note';
        note.textContent = activity.note;
        li.appendChild(note);
      }

      // Options sub-list
      if (activity.options && activity.options.length) {
        const optLabel = document.createElement('p');
        optLabel.className = 'options-label';
        optLabel.textContent = 'Options:';
        li.appendChild(optLabel);

        const optList = document.createElement('ul');
        optList.className = 'options-list';
        activity.options.forEach(opt => {
          const optItem = document.createElement('li');
          optItem.textContent = opt;
          optList.appendChild(optItem);
        });
        li.appendChild(optList);
      }

      // Link button (Viator)
      if (activity.link) {
        const anchor = document.createElement('a');
        anchor.className = 'link-btn';
        anchor.href = activity.link;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        anchor.textContent = 'View Booking ↗';
        anchor.setAttribute('aria-label', `View booking for ${activity.title}`);
        li.appendChild(anchor);
      }

      ul.appendChild(li);
    });

    body.appendChild(ul);
    card.appendChild(body);
    section.appendChild(card);
    container.appendChild(section);
  });
}

/* ─────────────────────────────────────────────
   BUDGET
───────────────────────────────────────────── */

// Small palette for budget bar segments
const BUDGET_PALETTE = [
  '#4a9eff',
  '#ff6b6b',
  '#ffd166',
  '#06d6a0',
  '#a78bfa',
  '#f97316',
  '#ec4899'
];

function renderBudget() {
  const knownList  = document.getElementById('budget-known-list');
  const rangeList  = document.getElementById('budget-range-list');
  const totalSpan  = document.getElementById('budget-known-total');
  const bar        = document.getElementById('budget-bar');

  if (!knownList || !rangeList || !totalSpan || !bar) return;

  knownList.innerHTML = '';
  rangeList.innerHTML = '';
  bar.innerHTML = '';

  const knownItems = [];
  const rangeItems = [];

  // Collect costs from ITINERARY
  ITINERARY.forEach(day => {
    day.activities.forEach(activity => {
      if (activity.cost === null || activity.cost === undefined) return;

      if (typeof activity.cost === 'number') {
        knownItems.push({ label: `${day.label}: ${activity.title}`, cost: activity.cost });
      } else {
        // It's a string range like "25–30"
        rangeItems.push({ label: `${day.label}: ${activity.title}`, cost: activity.cost });
      }
    });
  });

  // Render known
  let knownTotal = 0;
  knownItems.forEach(item => {
    const li = document.createElement('li');
    li.className = 'budget-item';
    const labelSpan = document.createElement('span');
    labelSpan.className = 'budget-item-label';
    labelSpan.textContent = item.label;
    const amountSpan = document.createElement('span');
    amountSpan.className = 'budget-item-amount';
    amountSpan.textContent = `$${item.cost}`;
    li.appendChild(labelSpan);
    li.appendChild(amountSpan);
    knownList.appendChild(li);
    knownTotal += item.cost;
  });

  // Render ranges
  rangeItems.forEach(item => {
    const li = document.createElement('li');
    li.className = 'budget-item budget-item--range';
    const labelSpan = document.createElement('span');
    labelSpan.className = 'budget-item-label';
    labelSpan.textContent = item.label;
    const amountSpan = document.createElement('span');
    amountSpan.className = 'budget-item-amount';
    amountSpan.textContent = `$${item.cost}`;
    li.appendChild(labelSpan);
    li.appendChild(amountSpan);
    rangeList.appendChild(li);
  });

  // Known total
  totalSpan.textContent = `$${knownTotal}`;

  // Budget bar segments - each known item as a percentage of total
  if (knownTotal > 0) {
    knownItems.forEach((item, i) => {
      const pct = ((item.cost / knownTotal) * 100).toFixed(2);
      const seg = document.createElement('div');
      seg.className = 'budget-bar-segment';
      seg.style.width = `${pct}%`;
      seg.style.background = BUDGET_PALETTE[i % BUDGET_PALETTE.length];
      seg.title = `${item.label}: $${item.cost} (${pct}%)`;
      seg.setAttribute('aria-label', `${item.label}: $${item.cost}`);
      bar.appendChild(seg);
    });
  }
}

/* ─────────────────────────────────────────────
   PACKING CHECKLIST
───────────────────────────────────────────── */

const CHECKLIST_STORAGE_KEY = 'checklistState';

function getChecklistState() {
  try {
    return JSON.parse(localStorage.getItem(CHECKLIST_STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveChecklistState(state) {
  localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(state));
}

function updateChecklistProgress() {
  const progressEl = document.getElementById('checklist-progress');
  if (!progressEl) return;
  const state = getChecklistState();
  const checkedCount = CHECKLIST.filter(item => state[item]).length;
  progressEl.textContent = `${checkedCount}/${CHECKLIST.length} packed`;
  progressEl.setAttribute('aria-label', `${checkedCount} of ${CHECKLIST.length} items packed`);
}

function renderChecklist() {
  const ul = document.getElementById('checklist-items');
  const resetBtn = document.getElementById('reset-checklist');
  if (!ul) return;

  ul.innerHTML = '';
  const state = getChecklistState();

  // Progress indicator
  const checkedCount = CHECKLIST.filter(item => state[item]).length;
  const progressEl = document.getElementById('checklist-progress');
  if (progressEl) {
    progressEl.textContent = `${checkedCount}/${CHECKLIST.length} packed`;
    progressEl.setAttribute('aria-label', `${checkedCount} of ${CHECKLIST.length} items packed`);
  }

  CHECKLIST.forEach((itemText, index) => {
    const li = document.createElement('li');
    li.className = 'checklist-item' + (state[itemText] ? ' checked' : '');
    li.setAttribute('role', 'checkbox');
    li.setAttribute('aria-checked', state[itemText] ? 'true' : 'false');
    li.setAttribute('tabindex', '0');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `chk-${index}`;
    checkbox.className = 'visually-hidden';
    checkbox.checked = !!state[itemText];

    const customCheck = document.createElement('span');
    customCheck.className = 'custom-checkbox';
    customCheck.setAttribute('aria-hidden', 'true');

    const label = document.createElement('label');
    label.htmlFor = `chk-${index}`;
    label.textContent = itemText;

    li.appendChild(checkbox);
    li.appendChild(customCheck);
    li.appendChild(label);

    const toggle = () => {
      const currentState = getChecklistState();
      currentState[itemText] = !currentState[itemText];
      saveChecklistState(currentState);
      li.classList.toggle('checked', !!currentState[itemText]);
      li.setAttribute('aria-checked', currentState[itemText] ? 'true' : 'false');
      checkbox.checked = !!currentState[itemText];
      updateChecklistProgress();
    };

    li.addEventListener('click', toggle);
    li.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    });

    ul.appendChild(li);
  });

  // Reset button
  if (resetBtn) {
    // Remove any existing listener by cloning
    const freshReset = resetBtn.cloneNode(true);
    resetBtn.parentNode.replaceChild(freshReset, resetBtn);

    freshReset.addEventListener('click', () => {
      if (window.confirm('Reset the entire packing checklist? This cannot be undone.')) {
        saveChecklistState({});
        renderChecklist();
      }
    });
  }
}

/* ─────────────────────────────────────────────
   COUNTDOWN
───────────────────────────────────────────── */

let _countdownInterval = null;

function initCountdown() {
  const el = document.getElementById('hero-countdown');
  if (!el) return;

  function tick() {
    const startDateStr = localStorage.getItem('tripStartDate');
    const startDate = parseDateLocal(startDateStr);

    if (!startDate) {
      el.innerHTML = '<span class="countdown-prompt">Set a trip start date in Settings ⚙</span>';
      return;
    }

    const now = Date.now();
    const target = startDate.getTime();
    const diff = target - now;

    if (diff <= 0) {
      // Trip has started or passed
      const today = todayMidnight();
      const dayIndex = Math.round((today - startDate) / 86400000);

      if (dayIndex >= 0 && dayIndex < ITINERARY.length) {
        const day = ITINERARY[dayIndex];
        el.innerHTML = `<span class="countdown-active">🌴 Today is <strong>${day.label}</strong>!</span>`;
      } else if (dayIndex >= ITINERARY.length) {
        el.innerHTML = '<span class="countdown-done">The trip is over, what a trip! 🎉</span>';
      } else {
        el.innerHTML = '<span class="countdown-soon">The adventure begins today! 🎉</span>';
      }
      return;
    }

    const totalSeconds = Math.floor(diff / 1000);
    const days    = Math.floor(totalSeconds / 86400);
    const hours   = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    el.innerHTML = `
      <div class="countdown-grid">
        <div class="countdown-unit">
          <span class="countdown-value">${String(days).padStart(2, '0')}</span>
          <span class="countdown-label">days</span>
        </div>
        <div class="countdown-unit">
          <span class="countdown-value">${String(hours).padStart(2, '0')}</span>
          <span class="countdown-label">hrs</span>
        </div>
        <div class="countdown-unit">
          <span class="countdown-value">${String(minutes).padStart(2, '0')}</span>
          <span class="countdown-label">min</span>
        </div>
        <div class="countdown-unit">
          <span class="countdown-value">${String(seconds).padStart(2, '0')}</span>
          <span class="countdown-label">sec</span>
        </div>
      </div>`;
  }

  if (_countdownInterval) clearInterval(_countdownInterval);
  tick();
  if (!prefersReducedMotion()) {
    _countdownInterval = setInterval(tick, 1000);
  }
}

/* ─────────────────────────────────────────────
   SETTINGS MODAL
───────────────────────────────────────────── */

function initSettings() {
  const settingsBtn   = document.getElementById('settings-btn');
  const modal         = document.getElementById('settings-modal');
  const closeBtn      = document.getElementById('settings-close');
  const saveBtn       = document.getElementById('save-settings');
  const input         = document.getElementById('start-date-input');

  if (!modal) return;

  function openModal() {
    modal.classList.remove('hidden');
    modal.setAttribute('aria-modal', 'true');
    // Pre-fill with saved value
    if (input) {
      input.value = localStorage.getItem('tripStartDate') || '';
    }
    // Focus close button for accessibility
    if (closeBtn) closeBtn.focus();
  }

  function closeModal() {
    modal.classList.add('hidden');
    modal.removeAttribute('aria-modal');
    if (settingsBtn) settingsBtn.focus();
  }

  if (settingsBtn) settingsBtn.addEventListener('click', openModal);
  if (closeBtn)    closeBtn.addEventListener('click', closeModal);

  // Click backdrop (the modal overlay itself, not its children) to close
  modal.addEventListener('click', e => {
    if (e.target === modal) closeModal();
  });

  // Keyboard: Escape to close
  modal.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      if (input && input.value) {
        localStorage.setItem('tripStartDate', input.value);
      } else {
        localStorage.removeItem('tripStartDate');
      }
      closeModal();
      // Refresh countdown and active chip
      initCountdown();
      highlightActiveChip();
      showToast('Trip date saved!');
    });
  }
}

/* ─────────────────────────────────────────────
   THEME TOGGLE
───────────────────────────────────────────── */

function initThemeToggle() {
  const html = document.documentElement;

  // Apply persisted theme on load
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    html.setAttribute('data-theme', savedTheme);
  }

  // Theme toggle button (optional, may or may not exist in HTML)
  const toggleBtn = document.getElementById('theme-toggle');
  if (!toggleBtn) return;

  function getCurrentTheme() {
    return html.getAttribute('data-theme') || 'light';
  }

  function applyTheme(theme) {
    html.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    toggleBtn.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
    toggleBtn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
  }

  // Init button state
  applyTheme(getCurrentTheme());

  toggleBtn.addEventListener('click', () => {
    const next = getCurrentTheme() === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  });
}

/* ─────────────────────────────────────────────
   SHARE BUTTON
───────────────────────────────────────────── */

function initShareBtn() {
  const shareBtn = document.getElementById('share-btn');
  if (!shareBtn) return;

  shareBtn.addEventListener('click', async () => {
    const shareData = {
      title: 'Senior Trip Itinerary',
      text: 'Check out our senior trip itinerary!',
      url: location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled or share failed - silently ignore
        if (err.name !== 'AbortError') {
          console.warn('Share failed:', err);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(location.href);
        showToast('Link copied to clipboard!');
      } catch {
        // Fallback if clipboard API also unavailable
        showToast('Copy this URL: ' + location.href);
      }
    }
  });
}

/* ─────────────────────────────────────────────
   INIT
───────────────────────────────────────────── */

function startApp() {
  renderDayChips();
  renderItinerary();
  renderBudget();
  renderChecklist();
  initCountdown();
  initSettings();
  initThemeToggle();
  initShareBtn();
}

document.addEventListener('DOMContentLoaded', () => {
  initAuthGate();
});
