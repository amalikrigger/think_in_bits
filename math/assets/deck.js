/* ============================================================
   THINK IN BITS · 9709 deck engine (shared)
   One file for every deck, so every deck gets the same bottom bar,
   blank board, overlays, timer and keys. A deck page supplies only
   its <section class="slide"> elements, plus on <body>:
     data-deck-name="1.2 · Session 3"
     data-help-note="A line about this deck's widgets (optional)"
   Deck-specific widgets live in the deck's own <script> and should
   run after this file (use `defer` on both, deck script last).
   ============================================================ */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var body = document.body;
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  var deckKey = 'tib-deck:' + location.pathname;
  var deckName = body.getAttribute('data-deck-name') || '';
  var helpNote = body.getAttribute('data-help-note') ||
    'On a phone or tablet, swipe left and right. Tap any practice question to check the answer.';

  /* ---------- chrome, injected once so every deck matches ---------- */
  var gridIcon = '<svg width="13" height="13" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true"><rect x="0" y="0" width="6" height="6" rx="1.5"/><rect x="8" y="0" width="6" height="6" rx="1.5"/><rect x="0" y="8" width="6" height="6" rx="1.5"/><rect x="8" y="8" width="6" height="6" rx="1.5"/></svg>';
  var hk = function (k) { return '<kbd class="hk">' + k + '</kbd>'; };
  var chrome = document.createElement('div');
  chrome.innerHTML =
    '<div class="board" id="board" role="dialog" aria-modal="true" aria-label="Blank board">' +
      '<canvas id="graphCanvas" aria-hidden="true"></canvas>' +
      '<canvas id="boardCanvas"></canvas>' +
      '<div class="gset" id="gSet" role="dialog" aria-label="Graph settings">' +
        '<div class="gset-row"><span class="gl">x</span><label>from <input id="gXmin" type="number" step="any"></label><label>to <input id="gXmax" type="number" step="any"></label><label>step <input id="gXstep" type="number" step="any" min="0"></label></div>' +
        '<div class="gset-row"><span class="gl">y</span><label>from <input id="gYmin" type="number" step="any"></label><label>to <input id="gYmax" type="number" step="any"></label><label>step <input id="gYstep" type="number" step="any" min="0"></label></div>' +
        '<div class="gset-row"><label class="chk"><input id="gEqual" type="checkbox"> Same scale on both axes (circles stay round)</label></div>' +
        '<div class="gset-row presets"><span class="gl2">Quick</span><button type="button" data-g="-5,5,1,-5,5,1">±5</button><button type="button" data-g="-10,10,1,-10,10,1">±10</button><button type="button" data-g="-10,10,2,-10,10,2">±10 by 2</button><button type="button" data-g="-20,20,5,-20,20,5">±20 by 5</button><button type="button" data-g="0,10,1,0,10,1">0 to 10</button><button type="button" id="gDone" class="go">Done</button></div>' +
        '<p class="gmsg" id="gMsg"></p>' +
      '</div>' +
      '<div class="board-bar">' +
        '<button class="swatch" type="button" data-color="#ffffff" style="background:#ffffff" aria-pressed="true" aria-label="White pen"></button>' +
        '<button class="swatch" type="button" data-color="#00e5ff" style="background:#00e5ff" aria-pressed="false" aria-label="Cyan pen"></button>' +
        '<button class="swatch" type="button" data-color="#4fe08a" style="background:#4fe08a" aria-pressed="false" aria-label="Green pen"></button>' +
        '<button class="swatch" type="button" data-color="#ff6b6b" style="background:#ff6b6b" aria-pressed="false" aria-label="Red pen"></button>' +
        '<button id="bErase" type="button" aria-pressed="false">Erase</button>' +
        '<span class="sep"></span>' +
        '<button id="bUndo" type="button" title="Undo (Z)">Undo</button>' +
        '<button id="bClear" type="button">Clear</button>' +
        '<span class="sep"></span>' +
        '<button id="bPrev" type="button" aria-label="Previous board page">&lsaquo;</button>' +
        '<span class="pg" id="bPage">1 / 1</span>' +
        '<button id="bNext" type="button" aria-label="Next board page">&rsaquo;</button>' +
        '<button id="bAdd" type="button" aria-label="New board page">+</button>' +
        '<span class="sep"></span>' +
        '<button id="bGraph" type="button" aria-pressed="false" title="Graph on this page (G)">Graph</button>' +
        '<button id="bAxes" type="button" title="Set the axes">Axes</button>' +
        '<span class="sep"></span>' +
        '<button id="bTheme" type="button" aria-label="Light or dark board">Light</button>' +
        '<button id="bClose" type="button" title="Back to the slide you left (W)">Done</button>' +
      '</div>' +
    '</div>' +
    '<div class="progress" id="progress"></div>' +
    '<div class="hint" id="hint">← → move · Space next step · W blank board · K show or hide keys · ? every key</div>' +
    '<div class="toast" id="toast" role="status"><span id="toastText"></span><button type="button" class="go" id="toastGo">Resume</button><button type="button" id="toastNo">Start over</button></div>' +
    '<div class="hud">' +
      '<div class="left"><span class="name">' + deckName + '</span><span class="here" id="here"></span></div>' +
      '<div class="nav">' +
        '<span class="timer-wrap">' +
          '<span class="timer" id="timer" role="button" tabindex="0" title="Click or press T to start and pause. Shift + T resets.">00:00</span>' +
          '<button id="timerMenuBtn" type="button" aria-label="Timer options" title="Timer options">⏱' + hk('T') + '</button>' +
          '<div class="tmenu" id="tmenu" role="menu">' +
            '<span class="lab2">Count</span>' +
            '<button type="button" data-mins="0">Count up</button>' +
            '<span class="lab2">Count down from</span>' +
            '<div class="row2"><button type="button" data-mins="3">3</button><button type="button" data-mins="5">5</button><button type="button" data-mins="10">10</button><button type="button" data-mins="15">15</button></div>' +
            '<div class="row2"><input id="tCustom" type="number" min="1" max="120" placeholder="min" aria-label="Custom minutes"><button type="button" id="tCustomGo">Set</button></div>' +
            '<button type="button" id="tReset">Reset</button>' +
          '</div>' +
        '</span>' +
        '<button id="prevBtn" type="button" aria-label="Previous">←' + hk('←') + '</button>' +
        '<span class="count" id="count"></span>' +
        '<button id="nextBtn" type="button" aria-label="Next">→' + hk('→') + '</button>' +
        '<button id="revealBtn" type="button" aria-label="Reveal every step on this slide" title="Reveal all (R)">Reveal' + hk('R') + '</button>' +
        '<button id="boardBtn" type="button" aria-label="Blank board" title="Blank board (W)">Board' + hk('W') + '</button>' +
        '<button id="graphBtn" type="button" aria-label="Graph paper" title="Graph paper (G)">Graph' + hk('G') + '</button>' +
        '<button id="gridBtn" type="button" aria-label="All slides" title="All slides (O)">' + gridIcon + hk('O') + '</button>' +
        '<button id="fsBtn" type="button" aria-label="Fullscreen" title="Fullscreen (F)">⛶' + hk('F') + '</button>' +
        '<button id="keysBtn" type="button" aria-label="Show or hide key labels" title="Show or hide key labels (K)" aria-pressed="true">Keys' + hk('K') + '</button>' +
        '<button id="helpBtn" type="button" aria-label="Keyboard help" title="Keys (?)">?</button>' +
      '</div>' +
    '</div>' +
    '<div class="overlay" id="grid" role="dialog" aria-modal="true" aria-label="All slides"><h3>All slides</h3><div class="grid" id="gridInner"></div></div>' +
    '<div class="overlay" id="help" role="dialog" aria-modal="true" aria-label="Keys">' +
      '<h3>Keys</h3>' +
      '<div class="keys">' +
        '<kbd>→</kbd><span>Next step, then next slide. Space and Page Down do the same.</span>' +
        '<kbd>←</kbd><span>Back one step, then back one slide.</span>' +
        '<kbd>R</kbd><span>Reveal every step on this slide at once.</span>' +
        '<kbd>O</kbd><span>All slides. Click any one to jump there. Esc closes.</span>' +
        '<kbd>T</kbd><span>Start or pause the timer. Shift + T resets it. The ⏱ button switches between counting up and a countdown.</span>' +
        '<kbd>W</kbd><span>Blank board. Pens, eraser, undo (Z) and extra pages. Esc or W returns you to the slide you left.</span>' +
        '<kbd>G</kbd><span>Graph paper: numbered axes across the whole screen to draw on. Axes sets how far each axis goes and the step. G again hides the graph.</span>' +
        '<kbd>K</kbd><span>Show or hide the key labels on the bottom bar.</span>' +
        '<kbd>F</kbd><span>Fullscreen on or off.</span>' +
        '<kbd>P</kbd><span>Print, or save as a PDF handout with every step and answer shown.</span>' +
        '<kbd>M</kbd><span>Reading mode: every step shown, each slide scrolls like a page. On by default on phones.</span>' +
        '<kbd>Home</kbd><span>First slide.</span>' +
        '<kbd>End</kbd><span>Last slide, everything revealed.</span>' +
        '<kbd>?</kbd><span>This list.</span>' +
      '</div>' +
      '<p class="small" style="margin-top:3vh">' + helpNote + '</p>' +
      '<p style="margin-top:2vh"><button type="button" class="toolchip" id="printBtn" style="cursor:pointer">Print or save as PDF</button> <button type="button" class="toolchip" id="readBtn" style="cursor:pointer">Reading mode: off</button></p>' +
    '</div>';
  while (chrome.firstChild) body.appendChild(chrome.firstChild);

  /* ---------- math: typeset \( … \) and \[ … \] with the self-hosted KaTeX ---------- */
  if (window.renderMathInElement) {
    [].slice.call(document.querySelectorAll('.slide')).forEach(function (s) {
      try {
        renderMathInElement(s, {
          delimiters: [{ left: '\\[', right: '\\]', display: true }, { left: '\\(', right: '\\)', display: false }],
          throwOnError: false, strict: 'ignore'
        });
      } catch (e) { if (window.console) console.error('math render', e); }
    });
  }

  var slides = [].slice.call(document.querySelectorAll('.slide'));
  var idx = 0;
  var h = parseInt((location.hash || '').replace('#', ''), 10);
  var hadHash = h >= 1 && h <= slides.length;
  if (hadHash) idx = h - 1;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function frags(s) { return [].slice.call(s.querySelectorAll('.frag')); }
  /* plain text of an element for the bottom bar and slide grid: typeset math is read
     back from its TeX source and turned into readable Unicode */
  function texToText(t) {
    var sup = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻', 'n': 'ⁿ' };
    var rep = [[/\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}/g, function (m, n, d) { var w = function (x) { return /[+\-\s]/.test(x.trim()) ? '(' + x.trim() + ')' : x.trim(); }; return w(n) + '/' + w(d); }], [/\\sqrt\{([^{}]*)\}/g, '√($1)'],
      [/\\le(q|qslant)?\b/g, '≤'], [/\\ge(q|qslant)?\b/g, '≥'], [/\\ne(q)?\b/g, '≠'], [/\\in\b/g, '∈'], [/\\mathbb\{R\}/g, 'ℝ'],
      [/\\pm\b/g, '±'], [/\\times\b/g, '×'], [/\\cdot\b/g, '·'], [/\\(to|rightarrow)\b/g, '→'], [/\\Rightarrow\b/g, '⇒'],
      [/\\mapsto\b/g, '↦'], [/\\circ\b/g, '∘'], [/\\Delta\b/g, 'Δ'], [/\\theta\b/g, 'θ'], [/\\pi\b/g, 'π'], [/\\text\{([^{}]*)\}/g, '$1'],
      [/\\(sin|cos|tan|ln|log)\b/g, '$1'], [/\\left|\\right|\\,|\;|\\!|\\quad/g, ' ']];
    rep.forEach(function (r) { t = t.replace(r[0], r[1]); });
    t = t.replace(/\^\{([^{}]*)\}|\^(\w)/g, function (m, a, b) { return (a || b).split('').map(function (ch) { return sup[ch] || ch; }).join(''); });
    return t.replace(/\\[a-zA-Z]+/g, '').replace(/[{}]/g, '').replace(/-/g, '−').replace(/\s+/g, ' ').trim();
  }
  function plain(el) {
    var c = el.cloneNode(true);
    [].slice.call(c.querySelectorAll('.katex')).forEach(function (k) {
      var a = k.querySelector('annotation');
      k.textContent = a ? texToText(a.textContent) : k.textContent;
    });
    return c.textContent.replace(/\s+/g, ' ').trim();
  }
  function titleOf(s) { var t = s.querySelector('h1, h2'); return t ? plain(t) : ''; }

  /* ---------- reading mode ---------- */
  var reading = false;
  function setReading(on) {
    reading = !!on;
    body.classList.toggle('reading', reading);
    $('readBtn').textContent = 'Reading mode: ' + (reading ? 'on' : 'off');
  }
  var savedRead = store.get('tib-deck-reading');
  var phone = window.matchMedia && matchMedia('(max-width: 760px)').matches;
  setReading(savedRead === null ? phone : savedRead === '1');

  /* ---------- key labels ---------- */
  function setKeys(on) {
    body.classList.toggle('show-keys', on);
    $('keysBtn').setAttribute('aria-pressed', on ? 'true' : 'false');
    store.set('tib-deck-keys', on ? '1' : '0');
  }
  setKeys(store.get('tib-deck-keys') !== '0');

  /* ---------- navigation ---------- */
  function show(i, revealAll) {
    idx = Math.max(0, Math.min(slides.length - 1, i));
    slides.forEach(function (s, j) {
      var on = j === idx;
      s.classList.toggle('active', on);
      s.setAttribute('aria-hidden', on ? 'false' : 'true');
    });
    frags(slides[idx]).forEach(function (f) { f.classList.toggle('on', !!revealAll || reading); });
    slides[idx].scrollTop = 0;
    $('count').textContent = (idx + 1) + ' / ' + slides.length;
    $('here').textContent = titleOf(slides[idx]);
    $('progress').style.width = ((idx + 1) / slides.length * 100).toFixed(2) + '%';
    try { history.replaceState(null, '', '#' + (idx + 1)); } catch (e) {}
    store.set(deckKey, String(idx + 1));
    markGrid();
  }
  function next() {
    var pending = reading ? [] : frags(slides[idx]).filter(function (f) { return !f.classList.contains('on'); });
    if (pending.length) {
      pending[0].classList.add('on');
      try { pending[0].scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' }); } catch (e) {}
      return;
    }
    if (idx < slides.length - 1) show(idx + 1, false);
  }
  function prev() {
    var on = reading ? [] : frags(slides[idx]).filter(function (f) { return f.classList.contains('on'); });
    if (on.length) { on[on.length - 1].classList.remove('on'); return; }
    if (idx > 0) show(idx - 1, true);
  }
  function revealAll() { frags(slides[idx]).forEach(function (f) { f.classList.add('on'); }); }

  /* ---------- overlays ---------- */
  var grid = $('grid'), help = $('help');
  function anyOpen() { return grid.classList.contains('open') || help.classList.contains('open'); }
  function closeOverlays() { grid.classList.remove('open'); help.classList.remove('open'); $('tmenu').classList.remove('open'); }
  function toggleOverlay(el) { var was = el.classList.contains('open'); closeOverlays(); if (!was) el.classList.add('open'); }
  var gi = $('gridInner');
  slides.forEach(function (s, j) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'thumb';
    var eb = s.querySelector('.eyebrow');
    b.innerHTML = '<span class="num">' + (j + 1 < 10 ? '0' : '') + (j + 1) + '</span>' +
      (eb ? '<span class="eb">' + plain(eb) + '</span>' : '') + '<span class="tt">' + titleOf(s) + '</span>';
    b.addEventListener('click', function () { closeOverlays(); show(j, false); });
    gi.appendChild(b);
  });
  function markGrid() { [].slice.call(gi.children).forEach(function (b, j) { b.classList.toggle('current', j === idx); }); }
  [grid, help].forEach(function (o) { o.addEventListener('click', function (e) { if (e.target === o) closeOverlays(); }); });

  /* ---------- timer: count up, or count down from a set time ---------- */
  var tEl = $('timer'), tStart = null, tAcc = 0, tTick = null, tDown = 0; /* tDown in ms, 0 = count up */
  function fmt(ms) {
    var neg = ms < 0; ms = Math.abs(ms);
    var s = Math.floor(ms / 1000), m = Math.floor(s / 60); s = s % 60;
    return (neg ? '−' : '') + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }
  function tRender() {
    var el = tAcc + (tStart ? Date.now() - tStart : 0);
    if (tDown) {
      var left = tDown - el;
      /* counts down to 00:00, then shows overtime as a negative */
      tEl.textContent = left > 0 ? fmt(Math.ceil(left / 1000) * 1000) : (left > -1000 ? '00:00' : fmt(-Math.floor(-left / 1000) * 1000));
      tEl.classList.toggle('ending', left > 0 && left <= 60000);
      tEl.classList.toggle('up', left <= 0);
      tEl.classList.remove('late');
    } else {
      tEl.textContent = fmt(el);
      tEl.classList.toggle('late', el >= 55 * 60 * 1000);
      tEl.classList.remove('ending', 'up');
    }
  }
  function tToggle() {
    if (tStart) { tAcc += Date.now() - tStart; tStart = null; clearInterval(tTick); tEl.classList.remove('on'); }
    else { tStart = Date.now(); tTick = setInterval(tRender, 250); tEl.classList.add('on'); }
    tRender();
  }
  function tReset() { tStart = null; tAcc = 0; clearInterval(tTick); tEl.classList.remove('on', 'late', 'ending', 'up'); tRender(); }
  function tMode(mins) {
    tDown = mins > 0 ? mins * 60000 : 0;
    tEl.classList.toggle('count-down', tDown > 0);
    tReset();
    if (tDown) tToggle();
    $('tmenu').classList.remove('open');
  }
  tEl.addEventListener('click', tToggle);
  tEl.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); tToggle(); } });
  $('timerMenuBtn').addEventListener('click', function (e) { e.stopPropagation(); $('tmenu').classList.toggle('open'); });
  [].slice.call($('tmenu').querySelectorAll('button[data-mins]')).forEach(function (b) {
    b.addEventListener('click', function () { tMode(+b.getAttribute('data-mins')); });
  });
  $('tCustomGo').addEventListener('click', function () { var v = +$('tCustom').value; if (v > 0) tMode(v); });
  $('tReset').addEventListener('click', function () { tReset(); $('tmenu').classList.remove('open'); });
  document.addEventListener('click', function (e) { if (!e.target.closest('.timer-wrap')) $('tmenu').classList.remove('open'); });
  tRender();

  /* ---------- fullscreen, print ---------- */
  function fullscreen() {
    var d = document;
    if (d.fullscreenElement) { d.exitFullscreen && d.exitFullscreen(); }
    else if (d.documentElement.requestFullscreen) { d.documentElement.requestFullscreen(); }
  }
  function printDeck() { closeOverlays(); setTimeout(function () { window.print(); }, 50); }

  /* ---------- tap to check ---------- */
  [].slice.call(document.querySelectorAll('.check')).forEach(function (c) {
    c.setAttribute('role', 'button');
    c.setAttribute('aria-expanded', 'false');
    if (!c.hasAttribute('tabindex')) c.setAttribute('tabindex', '0');
    function toggle() { var open = c.classList.toggle('open'); c.setAttribute('aria-expanded', open ? 'true' : 'false'); }
    c.addEventListener('click', function (e) { if (e.target.closest('a')) return; toggle(); });
    c.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); toggle(); } });
  });

  /* ---------- first-load hint ---------- */
  var hint = $('hint'), hintT = null;
  function hideHint() { hint.classList.remove('show'); clearTimeout(hintT); }
  if (store.get('tib-deck-hint2') !== '1') {
    setTimeout(function () { hint.classList.add('show'); }, 900);
    hintT = setTimeout(hideHint, 7000);
    store.set('tib-deck-hint2', '1');
  }

  /* ---------- resume where you left off ---------- */
  var toast = $('toast');
  function hideToast() { toast.classList.remove('show'); }
  (function () {
    var saved = parseInt(store.get(deckKey), 10);
    if (hadHash || !(saved > 1 && saved <= slides.length)) return;
    $('toastText').textContent = 'Pick up at slide ' + saved + '?';
    $('toastGo').onclick = function () { hideToast(); show(saved - 1, false); };
    $('toastNo').onclick = function () { hideToast(); show(0, false); };
    toast.classList.add('show');
    setTimeout(hideToast, 10000);
  })();

  /* ---------- title entrance, once ---------- */
  if (idx === 0 && !reduce) {
    body.classList.add('intro');
    setTimeout(function () { body.classList.remove('intro'); }, 2200);
  }

  /* ---------- buttons ---------- */
  $('nextBtn').addEventListener('click', next);
  $('prevBtn').addEventListener('click', prev);
  $('revealBtn').addEventListener('click', revealAll);
  $('gridBtn').addEventListener('click', function () { toggleOverlay(grid); });
  $('helpBtn').addEventListener('click', function () { toggleOverlay(help); });
  $('fsBtn').addEventListener('click', fullscreen);
  $('keysBtn').addEventListener('click', function () { setKeys(!body.classList.contains('show-keys')); });
  $('printBtn').addEventListener('click', printDeck);
  $('readBtn').addEventListener('click', function () { setReading(!reading); store.set('tib-deck-reading', reading ? '1' : '0'); show(idx, false); });

  /* ---------- blank board ----------
     A full-screen writing surface that replaces the slide rather than drawing
     over it. Strokes are stored normalized (0..1) so a resize or fullscreen
     redraws them correctly instead of stretching them. */
  var boardOn = false, toggleBoard;
  (function () {
    var wrap = $('board'), cv = $('boardCanvas'), ctx = cv.getContext('2d');
    var gcv = $('graphCanvas'), gctx = gcv.getContext('2d');
    var gdef = { xmin: -10, xmax: 10, xs: 1, ymin: -10, ymax: 10, ys: 1, eq: true };
    try { var gsv = JSON.parse(store.get('tib-deck-graph') || 'null'); if (gsv && gsv.xmax > gsv.xmin && gsv.ymax > gsv.ymin && gsv.xs > 0 && gsv.ys > 0) gdef = gsv; } catch (err) {}
    var gpages = [null];
    var pages = [[]], pi = 0, color = '#ffffff', size = 4, erasing = false, drawing = false, cur = null, penSeen = false;
    function W() { return wrap.clientWidth; }
    function H() { return wrap.clientHeight; }
    function resize() { var r = Math.min(window.devicePixelRatio || 1, 2); [[cv, ctx], [gcv, gctx]].forEach(function (c) { c[0].width = Math.round(W() * r); c[0].height = Math.round(H() * r); c[1].setTransform(r, 0, 0, r, 0, 0); }); redraw(); }
    /* graph paper: drawn on its own canvas under the ink, so Erase never removes it */
    function num(v) { var t = String(Math.round(v * 1000) / 1000); return t.charAt(0) === '-' ? '\u2212' + t.slice(1) : t; }
    function drawGraph() {
      var g = gpages[pi], w = W(), h = H();
      gctx.clearRect(0, 0, w, h);
      $('bGraph').setAttribute('aria-pressed', g ? 'true' : 'false');
      if (!g) return;
      var light = wrap.classList.contains('light');
      var barTop = wrap.querySelector('.board-bar').getBoundingClientRect().top;
      var L = 50, R = w - 30, T = 44, B = Math.min(h - 40, (barTop > 0 ? barTop : h - 80) - 34);
      var sx = (R - L) / (g.xmax - g.xmin), sy = (B - T) / (g.ymax - g.ymin);
      g = { xmin: g.xmin, xmax: g.xmax, xs: g.xs, ymin: g.ymin, ymax: g.ymax, ys: g.ys, eq: g.eq };
      if (g.eq) {
        /* same scale: keep the set range as the minimum and stretch the other axis to fill the screen */
        var s = Math.min(sx, sy);
        function grow(lo, hi, span) { var extra = span - (hi - lo); if (lo >= 0) return [lo, hi + extra]; if (hi <= 0) return [lo - extra, hi]; return [lo - extra / 2, hi + extra / 2]; }
        var gx = grow(g.xmin, g.xmax, (R - L) / s), gy = grow(g.ymin, g.ymax, (B - T) / s);
        g.xmin = gx[0]; g.xmax = gx[1]; g.ymin = gy[0]; g.ymax = gy[1]; sx = sy = s;
      }
      var X = function (x) { return L + (x - g.xmin) * sx; }, Y = function (y) { return B - (y - g.ymin) * sy; };
      var minor = light ? 'rgba(20,20,26,0.13)' : 'rgba(255,255,255,0.11)';
      var axis = light ? '#14141a' : '#e8e8ee', lab = light ? '#3a3a44' : '#b0b0b8';
      function ticks(a, b, st) { var out = [], k0 = Math.ceil(a / st - 1e-9), k1 = Math.floor(b / st + 1e-9); for (var k = k0; k <= k1 && out.length < 400; k++) out.push(k * st); return out; }
      var xt = ticks(g.xmin, g.xmax, g.xs), yt = ticks(g.ymin, g.ymax, g.ys);
      gctx.lineWidth = 1; gctx.strokeStyle = minor; gctx.beginPath();
      xt.forEach(function (x) { gctx.moveTo(Math.round(X(x)) + 0.5, T); gctx.lineTo(Math.round(X(x)) + 0.5, B); });
      yt.forEach(function (y) { gctx.moveTo(L, Math.round(Y(y)) + 0.5); gctx.lineTo(R, Math.round(Y(y)) + 0.5); });
      gctx.stroke();
      var ax = (g.ymin <= 0 && g.ymax >= 0) ? Y(0) : B, ay = (g.xmin <= 0 && g.xmax >= 0) ? X(0) : L;
      gctx.strokeStyle = axis; gctx.lineWidth = 2; gctx.beginPath(); gctx.moveTo(L, ax); gctx.lineTo(R + 10, ax); gctx.moveTo(ay, B); gctx.lineTo(ay, T - 10); gctx.stroke();
      gctx.fillStyle = axis; gctx.beginPath(); gctx.moveTo(R + 14, ax); gctx.lineTo(R + 4, ax - 5); gctx.lineTo(R + 4, ax + 5); gctx.fill();
      gctx.beginPath(); gctx.moveTo(ay, T - 14); gctx.lineTo(ay - 5, T - 4); gctx.lineTo(ay + 5, T - 4); gctx.fill();
      var fs = Math.max(12, Math.min(17, Math.round(Math.min(w, h) / 50)));
      gctx.font = fs + 'px "JetBrains Mono", ui-monospace, monospace'; gctx.fillStyle = lab;
      var kx = Math.max(1, Math.ceil((fs * 2.6) / (g.xs * sx))), ky = Math.max(1, Math.ceil((fs * 1.6) / (g.ys * sy)));
      var lx = Math.min(Math.max(ax + 6, T), B + fs + 8);
      gctx.textAlign = 'center'; gctx.textBaseline = 'top';
      xt.forEach(function (x) { var k = Math.round(x / g.xs); if (Math.abs(x) < 1e-9 && ay === X(0) && ax === Y(0)) return; if (k % kx) return; gctx.fillText(num(x), X(x), lx); });
      gctx.textAlign = 'right'; gctx.textBaseline = 'middle';
      yt.forEach(function (y) { var k = Math.round(y / g.ys); if (Math.abs(y) < 1e-9 && ay === X(0) && ax === Y(0)) return; if (k % ky) return; gctx.fillText(num(y), ay - 7, Y(y)); });
      if (ay === X(0) && ax === Y(0)) { gctx.textAlign = 'right'; gctx.textBaseline = 'top'; gctx.fillText('0', ay - 6, ax + 5); }
      gctx.font = 'italic ' + (fs + 3) + 'px Poppins, sans-serif'; gctx.fillStyle = axis;
      gctx.textAlign = 'left'; gctx.textBaseline = 'middle'; gctx.fillText('x', R + 18, ax);
      gctx.textAlign = 'left'; gctx.textBaseline = 'middle'; gctx.fillText('y', ay + 12, T - 10);
    }
    function style(s) { ctx.globalCompositeOperation = s.erase ? 'destination-out' : 'source-over'; ctx.strokeStyle = s.color; ctx.lineWidth = s.size; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; }
    function redraw() {
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, W(), H());
      pages[pi].forEach(function (s) {
        if (!s.pts.length) return;
        style(s); ctx.beginPath();
        s.pts.forEach(function (p, i) { var x = p[0] * W(), y = p[1] * H(); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
        if (s.pts.length === 1) ctx.lineTo(s.pts[0][0] * W() + 0.01, s.pts[0][1] * H());
        ctx.stroke();
      });
      ctx.globalCompositeOperation = 'source-over';
      $('bPage').textContent = (pi + 1) + ' / ' + pages.length;
      drawGraph();
    }
    function seg(s, a, b) { style(s); ctx.beginPath(); ctx.moveTo(a[0] * W(), a[1] * H()); ctx.lineTo(b[0] * W(), b[1] * H()); ctx.stroke(); ctx.globalCompositeOperation = 'source-over'; }
    function at(e) { return [e.clientX / W(), e.clientY / H()]; }
    function reject(e) { return penSeen && e.pointerType === 'touch'; }
    cv.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'pen') penSeen = true;
      if (reject(e)) return;
      e.preventDefault();
      try { cv.setPointerCapture(e.pointerId); } catch (err) {}
      drawing = true;
      cur = { color: color, size: erasing ? size * 7 : size, erase: erasing, pts: [at(e)] };
      pages[pi].push(cur); seg(cur, cur.pts[0], cur.pts[0]);
    });
    cv.addEventListener('pointermove', function (e) {
      if (!drawing || !cur || reject(e)) return;
      e.preventDefault();
      var p = at(e); seg(cur, cur.pts[cur.pts.length - 1], p); cur.pts.push(p);
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) { cv.addEventListener(ev, function () { drawing = false; cur = null; }); });
    [].slice.call(wrap.querySelectorAll('.swatch')).forEach(function (b) {
      b.addEventListener('click', function () {
        color = b.getAttribute('data-color'); erasing = false; $('bErase').setAttribute('aria-pressed', 'false');
        [].slice.call(wrap.querySelectorAll('.swatch')).forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
      });
    });
    $('bErase').addEventListener('click', function () { erasing = !erasing; this.setAttribute('aria-pressed', erasing ? 'true' : 'false'); });
    function undo() { pages[pi].pop(); redraw(); }
    $('bUndo').addEventListener('click', undo);
    $('bClear').addEventListener('click', function () { pages[pi] = []; redraw(); });
    $('bPrev').addEventListener('click', function () { if (pi > 0) { pi--; redraw(); } });
    $('bNext').addEventListener('click', function () { if (pi < pages.length - 1) { pi++; redraw(); } });
    $('bAdd').addEventListener('click', function () { pages.splice(pi + 1, 0, []); gpages.splice(pi + 1, 0, null); pi++; redraw(); });
    /* graph settings */
    var gin = { xmin: $('gXmin'), xmax: $('gXmax'), xs: $('gXstep'), ymin: $('gYmin'), ymax: $('gYmax'), ys: $('gYstep') };
    function fillSet(g) { Object.keys(gin).forEach(function (k) { gin[k].value = g[k]; }); $('gEqual').checked = !!g.eq; $('gMsg').textContent = ''; }
    function readSet() {
      var g = {}; Object.keys(gin).forEach(function (k) { g[k] = parseFloat(gin[k].value); }); g.eq = $('gEqual').checked;
      var bad = Object.keys(gin).some(function (k) { return !isFinite(g[k]); });
      if (bad) return 'Fill in every box.';
      if (g.xmax <= g.xmin) return 'x: "to" must be bigger than "from".';
      if (g.ymax <= g.ymin) return 'y: "to" must be bigger than "from".';
      if (g.xs <= 0 || g.ys <= 0) return 'Each step must be more than 0.';
      if ((g.xmax - g.xmin) / g.xs > 200 || (g.ymax - g.ymin) / g.ys > 200) return 'That is more than 200 grid lines. Use a bigger step.';
      return g;
    }
    function applySet() {
      var g = readSet();
      if (typeof g === 'string') { $('gMsg').textContent = g; return false; }
      $('gMsg').textContent = ''; gdef = g; store.set('tib-deck-graph', JSON.stringify(g));
      gpages[pi] = JSON.parse(JSON.stringify(g)); drawGraph(); return true;
    }
    function openSet(on) { if (on) { var bt = wrap.querySelector('.board-bar').getBoundingClientRect().top; if (bt > 0) $('gSet').style.bottom = (H() - bt + 10) + 'px'; } $('gSet').classList.toggle('open', on); $('bAxes').setAttribute('aria-pressed', on ? 'true' : 'false'); if (on) fillSet(gpages[pi] || gdef); }
    [].slice.call($('gSet').querySelectorAll('input')).forEach(function (inp) { inp.addEventListener('input', applySet); inp.addEventListener('change', applySet); });
    [].slice.call($('gSet').querySelectorAll('button[data-g]')).forEach(function (b) {
      b.addEventListener('click', function () { var v = b.getAttribute('data-g').split(',').map(Number); fillSet({ xmin: v[0], xmax: v[1], xs: v[2], ymin: v[3], ymax: v[4], ys: v[5], eq: $('gEqual').checked }); applySet(); });
    });
    $('gDone').addEventListener('click', function () { if (applySet()) openSet(false); });
    function setGraph(on) { gpages[pi] = on ? JSON.parse(JSON.stringify(gdef)) : null; if (!on) openSet(false); drawGraph(); }
    $('bGraph').addEventListener('click', function () { setGraph(!gpages[pi]); });
    $('bAxes').addEventListener('click', function () { var on = !$('gSet').classList.contains('open'); if (on && !gpages[pi]) setGraph(true); openSet(on); });
    wrap.__graph = function (fromSlides) {
      if (fromSlides) {
        if (gpages[pi] && pages[pi].length) { pages.splice(pi + 1, 0, []); gpages.splice(pi + 1, 0, null); pi++; }
        else if (!gpages[pi] && pages[pi].length) { pages.splice(pi + 1, 0, []); gpages.splice(pi + 1, 0, null); pi++; }
        setGraph(true); redraw();
      } else setGraph(!gpages[pi]);
    };
    wrap.__closeSet = function () { if ($('gSet').classList.contains('open')) { openSet(false); return true; } return false; };
    $('bTheme').addEventListener('click', function () {
      var lightNow = wrap.classList.toggle('light');
      this.textContent = lightNow ? 'Dark' : 'Light';
      var from = lightNow ? '#ffffff' : '#14141a', to = lightNow ? '#14141a' : '#ffffff';
      var sw = wrap.querySelector('.swatch[data-color="' + from + '"]');
      if (sw) { sw.setAttribute('data-color', to); sw.style.background = to; if (color === from) color = to; }
      redraw();
    });
    $('bClose').addEventListener('click', function () { toggleBoard(false); });
    window.addEventListener('resize', function () { if (boardOn) resize(); });
    toggleBoard = function (want) {
      boardOn = (want === undefined) ? !boardOn : !!want;
      wrap.classList.toggle('on', boardOn);
      body.classList.toggle('boarding', boardOn);
      if (boardOn) { closeOverlays(); resize(); } else openSet(false);
    };
    wrap.__undo = undo;
    wrap.__page = function (d) { if (d < 0 && pi > 0) { pi--; redraw(); } else if (d > 0 && pi < pages.length - 1) { pi++; redraw(); } };
  })();
  $('boardBtn').addEventListener('click', function () { toggleBoard(); });
  function openGraph() { if (!boardOn) toggleBoard(true); $('board').__graph(true); }
  $('graphBtn').addEventListener('click', openGraph);

  /* ---------- keys ---------- */
  document.addEventListener('keydown', function (e) {
    var t = e.target;
    var widget = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.closest('.check') || t.closest('.timer'));
    if (widget && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Enter'].indexOf(e.key) >= 0) return;
    if (t && t.tagName === 'INPUT' && t.type === 'number') return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (boardOn) {
      if (e.key === 'Escape' && $('board').__closeSet()) { e.preventDefault(); }
      else if (e.key === 'Escape' || e.key === 'w' || e.key === 'W') { e.preventDefault(); toggleBoard(false); }
      else if (e.key === 'g' || e.key === 'G') { e.preventDefault(); $('board').__graph(false); }
      else if (e.key === 'z' || e.key === 'Z') { e.preventDefault(); $('board').__undo(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); $('board').__page(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); $('board').__page(1); }
      return;
    }
    if (e.key === 'Escape') { closeOverlays(); hideToast(); return; }
    if (anyOpen() && e.key !== 'o' && e.key !== 'O' && e.key !== '?') return;
    switch (e.key) {
      case 'ArrowRight': case ' ': case 'PageDown': e.preventDefault(); next(); break;
      case 'ArrowLeft': case 'PageUp': e.preventDefault(); prev(); break;
      case 'Home': e.preventDefault(); show(0, false); break;
      case 'End': e.preventDefault(); show(slides.length - 1, true); break;
      case 'r': case 'R': revealAll(); break;
      case 'o': case 'O': toggleOverlay(grid); break;
      case '?': toggleOverlay(help); break;
      case 't': case 'T': e.shiftKey ? tReset() : tToggle(); break;
      case 'f': case 'F': fullscreen(); break;
      case 'k': case 'K': setKeys(!body.classList.contains('show-keys')); break;
      case 'p': case 'P': printDeck(); break;
      case 'm': case 'M': setReading(!reading); store.set('tib-deck-reading', reading ? '1' : '0'); show(idx, false); break;
      case 'w': case 'W': e.preventDefault(); toggleBoard(true); break;
      case 'g': case 'G': e.preventDefault(); openGraph(); break;
      default: return;
    }
    hideHint(); hideToast();
  });

  /* ---------- swipe ---------- */
  var tx = null, ty = null;
  document.addEventListener('touchstart', function (e) { if (e.touches.length !== 1) return; tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
  document.addEventListener('touchend', function (e) {
    if (tx === null) return;
    var dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
    tx = ty = null;
    if (anyOpen() || boardOn || e.target.closest('input, .check, .explore, .lab, .hud, .math, table, .toast')) return;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) { dx < 0 ? next() : prev(); hideHint(); }
  }, { passive: true });

  window.addEventListener('hashchange', function () {
    var n = parseInt((location.hash || '').replace('#', ''), 10);
    if (n >= 1 && n <= slides.length && n - 1 !== idx) show(n - 1, false);
  });

  /* print shows every step and answer */
  window.addEventListener('beforeprint', function () { slides.forEach(function (s) { frags(s).forEach(function (f) { f.classList.add('on'); }); }); });

  window.TIBDeck = { show: show, next: next, prev: prev, revealAll: revealAll, current: function () { return idx; } };
  show(idx, false);
})();
