/* ============================================================
   THINK IN BITS - CS lesson controller

   Read mode    : plain scrolling document. No JS needed to read it.
   Present mode : one section at a time, keyboard driven, for the projector.

   Progressive: if this file fails to load, the page is still a complete,
   readable lesson. Present mode is the only thing that goes away.
   ============================================================ */
(function () {
  'use strict';

  var body = document.body;
  var deck = document.getElementById('deck');
  if (!deck) return;

  // Slide 0 is the title block, then every .slide in document order.
  var head = deck.querySelector('.lesson-head');
  var panels = [];
  if (head) panels.push(head);
  Array.prototype.push.apply(panels, deck.querySelectorAll('.slide'));
  if (!panels.length) return;

  var progressEl = document.getElementById('progress');
  var hudEl = document.getElementById('hud');
  var readBtn = document.getElementById('readBtn');
  var presentBtn = document.getElementById('presentBtn');

  var idx = 0;
  var presenting = false;
  var STORE = 'tib-cs-lesson-mode';

  /* ---------- mode ---------- */

  function setMode(mode, opts) {
    opts = opts || {};
    presenting = (mode === 'present');
    body.classList.toggle('present', presenting);
    if (readBtn) readBtn.setAttribute('aria-pressed', String(!presenting));
    if (presentBtn) presentBtn.setAttribute('aria-pressed', String(presenting));

    if (presenting) {
      show(idx, true);
    } else {
      // clear present-only state, then park the reader on the panel they were on
      panels.forEach(function (p) { p.classList.remove('active'); });
      if (!opts.silent && idx > 0 && panels[idx]) {
        panels[idx].scrollIntoView({ block: 'start' });
      }
      if (progressEl) progressEl.style.width = '0';
    }

    try { localStorage.setItem(STORE, presenting ? 'present' : 'read'); } catch (e) {}
  }

  /* ---------- present-mode paging ---------- */

  function show(n, replaceHash) {
    idx = Math.max(0, Math.min(n, panels.length - 1));
    panels.forEach(function (p, i) { p.classList.toggle('active', i === idx); });
    if (panels[idx]) panels[idx].scrollTop = 0;

    if (progressEl) {
      var pct = panels.length > 1 ? (idx / (panels.length - 1)) * 100 : 100;
      progressEl.style.width = pct + '%';
    }
    if (hudEl) hudEl.textContent = (idx + 1) + ' / ' + panels.length;

    var hash = '#' + (idx + 1);
    if (location.hash !== hash) {
      try {
        if (replaceHash) history.replaceState(null, '', hash);
        else history.pushState(null, '', hash);
      } catch (e) { location.hash = hash; }
    }
  }

  function next() { if (idx < panels.length - 1) show(idx + 1); }
  function prev() { if (idx > 0) show(idx - 1); }

  function fullscreen() {
    var el = document.documentElement;
    if (document.fullscreenElement) {
      if (document.exitFullscreen) document.exitFullscreen();
    } else if (el.requestFullscreen) {
      el.requestFullscreen().catch(function () {});
    }
  }

  /* ---------- wiring ---------- */

  if (readBtn) readBtn.addEventListener('click', function () { setMode('read'); });
  if (presentBtn) presentBtn.addEventListener('click', function () { setMode('present'); });

  document.addEventListener('keydown', function (e) {
    var t = e.target;
    // never hijack typing or a focused control
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    // P toggles presenting from anywhere
    if (e.key === 'p' || e.key === 'P') {
      e.preventDefault();
      setMode(presenting ? 'read' : 'present');
      return;
    }
    if (!presenting) return;

    switch (e.key) {
      case 'ArrowRight': case ' ': case 'PageDown': e.preventDefault(); next(); break;
      case 'ArrowLeft': case 'PageUp': e.preventDefault(); prev(); break;
      case 'Home': e.preventDefault(); show(0); break;
      case 'End': e.preventDefault(); show(panels.length - 1); break;
      case 'f': case 'F': e.preventDefault(); fullscreen(); break;
      case 'Escape': e.preventDefault(); setMode('read'); break;
      default: return;
    }
  });

  /* ---------- swipe, present mode only ---------- */

  var tx = null, ty = null;
  document.addEventListener('touchstart', function (e) {
    if (!presenting || e.touches.length !== 1) return;
    tx = e.touches[0].clientX; ty = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchend', function (e) {
    if (!presenting || tx === null) return;
    var dx = e.changedTouches[0].clientX - tx;
    var dy = e.changedTouches[0].clientY - ty;
    tx = ty = null;
    if (e.target.closest && e.target.closest('.twrap, pre, details, .modebar')) return;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) { dx < 0 ? next() : prev(); }
  }, { passive: true });

  window.addEventListener('popstate', function () {
    if (!presenting) return;
    var n = parseInt((location.hash || '').replace('#', ''), 10);
    if (n >= 1 && n <= panels.length && n - 1 !== idx) show(n - 1, true);
  });

  /* ---------- boot ---------- */

  // A hash means someone linked a specific section, so honor it.
  var startAt = parseInt((location.hash || '').replace('#', ''), 10);
  if (startAt >= 1 && startAt <= panels.length) idx = startAt - 1;

  var saved = null;
  try { saved = localStorage.getItem(STORE); } catch (e) {}
  // Read is the default. Students outnumber presenters.
  setMode(saved === 'present' ? 'present' : 'read', { silent: true });
})();
