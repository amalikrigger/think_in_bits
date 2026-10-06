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

  /* ---------- code boxes: label bar plus a copy button ----------
     Every <pre> in the lesson becomes a box with a label on top.
     data-label   names it ("Type in the Terminal", "server.py")
     data-nocopy  marks sample output or a diagram: label only, no button
     The copy reads the text at click time, so a name typed into the
     folder-name box is already inside the code when it is copied. */

  var COPY_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"></rect><path d="M5 15V5a2 2 0 0 1 2-2h10"></path></svg>';

  function legacyCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
    document.body.appendChild(ta);
    ta.select();
    try { ta.setSelectionRange(0, text.length); } catch (e) {}
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
    return ok;
  }

  function copyText(text, done, fail) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, function () {
        legacyCopy(text) ? done() : fail();
      });
    } else {
      legacyCopy(text) ? done() : fail();
    }
  }

  function selectAll(el) {
    try {
      var r = document.createRange(); r.selectNodeContents(el);
      var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
    } catch (e) {}
  }

  function buildCodeBoxes() {
    Array.prototype.forEach.call(deck.querySelectorAll('pre'), function (pre) {
      if (pre.parentNode.classList.contains('codebox')) return;
      var nocopy = pre.hasAttribute('data-nocopy');

      var box = document.createElement('div');
      box.className = 'codebox' + (nocopy ? ' is-output' : '');
      var bar = document.createElement('div');
      bar.className = 'codebar';
      var label = document.createElement('span');
      label.className = 'codelabel';
      label.textContent = pre.getAttribute('data-label') || (nocopy ? 'What you should see' : 'Code');
      bar.appendChild(label);

      if (!nocopy) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'copybtn';
        btn.setAttribute('aria-label', 'Copy this code to the clipboard');
        btn.innerHTML = COPY_ICON + '<span class="copytxt">Copy</span>';
        var txt = btn.querySelector('.copytxt');
        var timer = null;
        function flash(cls, msg) {
          btn.className = 'copybtn ' + cls; txt.textContent = msg;
          clearTimeout(timer);
          timer = setTimeout(function () { btn.className = 'copybtn'; txt.textContent = 'Copy'; }, 2200);
        }
        btn.addEventListener('click', function () {
          var text = pre.textContent.replace(/\s+$/, '');
          copyText(text,
            function () { flash('done', 'Copied'); },
            function () { selectAll(pre); flash('failed', 'Press Ctrl+C'); });
        });
        bar.appendChild(btn);
      }

      pre.parentNode.insertBefore(box, pre);
      box.appendChild(bar);
      box.appendChild(pre);
    });
  }

  buildCodeBoxes();

  /* ---------- boot ---------- */

  // A hash means someone linked a specific section, so honor it.
  var startAt = parseInt((location.hash || '').replace('#', ''), 10);
  if (startAt >= 1 && startAt <= panels.length) idx = startAt - 1;

  var saved = null;
  try { saved = localStorage.getItem(STORE); } catch (e) {}
  // Read is the default. Students outnumber presenters.
  setMode(saved === 'present' ? 'present' : 'read', { silent: true });
})();
