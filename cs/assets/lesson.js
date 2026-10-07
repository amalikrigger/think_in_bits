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
      // start the projector on the tab the reader was looking at
      if (groups.length && activeTab >= 0 && tabOf(idx) !== activeTab) idx = groups[activeTab].start;
      show(idx, true);
    } else {
      if (groups.length) selectTab(tabOf(idx), { hash: !opts.silent });
      // clear present-only state, then park the reader on the panel they were on
      panels.forEach(function (p) { p.classList.remove('active'); });
      if (!opts.silent && idx > 0 && panels[idx]) {
        panels[idx].scrollIntoView({ block: 'start' });
      }
      if (progressEl) progressEl.style.width = '0';
    }

    try { localStorage.setItem(STORE, presenting ? 'present' : 'read'); } catch (e) {}
  }

  /* ---------- day tabs, Read mode only ----------
     Opt-in per lesson: a panel with data-tab="Day 2" starts a new tab. Panels
     before the first one form the "Start" tab (or the deck's data-first-tab).
     Read mode shows one tab at a time with a sticky tab bar and a Next button
     at the bottom. Present mode ignores tabs and pages through every panel. */

  var groups = [];
  var activeTab = -1;
  var tabbar = null, tabnext = null;
  var TAB_STORE = 'tib-tab-' + location.pathname;

  function slugify(t) { return String(t).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

  function buildTabs() {
    if (!deck.querySelector('[data-tab]')) return;
    var cur = { label: deck.getAttribute('data-first-tab') || 'Start', start: 0 };
    panels.forEach(function (p, i) {
      var t = p.getAttribute('data-tab');
      if (!t) return;
      if (i === 0) { cur.label = t; return; }
      cur.end = i - 1; groups.push(cur);
      cur = { label: t, start: i };
    });
    cur.end = panels.length - 1; groups.push(cur);
    if (groups.length < 2) { groups = []; return; }
    groups.forEach(function (g) { g.slug = slugify(g.label); });

    deck.classList.add('tabbed');
    tabbar = document.createElement('nav');
    tabbar.className = 'tabbar';
    tabbar.setAttribute('aria-label', 'Lesson sections');
    groups.forEach(function (g, gi) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = g.label;
      b.addEventListener('click', function () { selectTab(gi, { scroll: true, hash: true }); });
      tabbar.appendChild(b);
    });
    deck.insertBefore(tabbar, deck.firstChild);

    tabnext = document.createElement('nav');
    tabnext.className = 'tabnext';
    tabnext.setAttribute('aria-label', 'Previous and next section');
    deck.appendChild(tabnext);
  }

  function tabOf(i) {
    for (var g = 0; g < groups.length; g++) if (i >= groups[g].start && i <= groups[g].end) return g;
    return 0;
  }

  function navButton(gi, cls, text) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = cls; b.textContent = text;
    b.addEventListener('click', function () { selectTab(gi, { scroll: true, hash: true }); });
    return b;
  }

  function selectTab(gi, opts) {
    if (!groups.length) return;
    opts = opts || {};
    gi = Math.max(0, Math.min(gi, groups.length - 1));
    activeTab = gi;
    var g = groups[gi];
    panels.forEach(function (p, i) {
      p.classList.toggle('tab-off', i < g.start || i > g.end);
      p.classList.toggle('tab-first', i === g.start);
    });
    Array.prototype.forEach.call(tabbar.children, function (b, i) {
      b.classList.toggle('on', i === gi);
      if (i === gi) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    var on = tabbar.children[gi];
    if (on) tabbar.scrollLeft = Math.max(0, on.offsetLeft - 24);

    tabnext.innerHTML = '';
    if (gi > 0) tabnext.appendChild(navButton(gi - 1, 'prev', '← ' + groups[gi - 1].label));
    if (gi < groups.length - 1) tabnext.appendChild(navButton(gi + 1, 'next', 'Next: ' + groups[gi + 1].label + ' →'));

    try { localStorage.setItem(TAB_STORE, g.slug); } catch (e) {}
    if (opts.hash) { try { history.replaceState(null, '', '#t-' + g.slug); } catch (e) {} }
    if (opts.scroll) window.scrollTo(0, 0);
  }

  buildTabs();

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
  var hash = (location.hash || '').replace('#', '');
  var startAt = parseInt(hash, 10);
  if (startAt >= 1 && startAt <= panels.length) idx = startAt - 1;

  // Tabs: a #t-day-2 link wins, then a numbered link, then the last tab this
  // browser had open, then the first tab.
  if (groups.length) {
    var want = -1, stored = null;
    if (hash.indexOf('t-') === 0) {
      groups.forEach(function (g, gi) { if (g.slug === hash.slice(2)) want = gi; });
      if (want >= 0) idx = groups[want].start;
    }
    if (want < 0 && startAt >= 1 && startAt <= panels.length) want = tabOf(idx);
    if (want < 0) {
      try { stored = localStorage.getItem(TAB_STORE); } catch (e) {}
      groups.forEach(function (g, gi) { if (g.slug === stored) want = gi; });
      if (want >= 0) idx = groups[want].start;
    }
    if (want < 0) want = 0;
    activeTab = want;
  }

  var saved = null;
  try { saved = localStorage.getItem(STORE); } catch (e) {}
  // Read is the default. Students outnumber presenters.
  setMode(saved === 'present' ? 'present' : 'read', { silent: true });
})();
