/* ============================================================
   THINK IN BITS · BOARD (shared)
   The deck engine's blank board and graph paper, for pages that are not slide decks
   (booklets and review pages). The board and graph code below is lifted from deck.js
   unchanged, so both behave the same: 4 pens, erase, undo (Z), clear, pages, graph
   paper with Axes, light or dark, Done. deck.js keeps its own copy for now.
   A page opts in by loading this file after booklet.js. It adds two floating buttons:
     Board (W)  a blank page to work on      Graph (G)  graph paper with numbered axes
   Pairs with board.css (the board rules copied from deck.css).
   ============================================================ */
(function () {
  'use strict';
  var body = document.body;
  var $ = function (id) { return document.getElementById(id); };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  function closeOverlays() { var t = document.getElementById('bkToc'); if (t) t.classList.remove('open'); }
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
        '<button id="bClose" type="button" title="Back to the page (W)">Done</button>' +
      '</div>' +
    '</div>';

  body.appendChild(chrome);
  var fab = document.createElement('div');
  fab.className = 'tib-fab';
  fab.innerHTML = '<button id="boardBtn" type="button" title="Blank board (W)">Board' + hk('W') + '</button>' +
    '<button id="graphBtn" type="button" title="Graph paper (G)">Graph' + hk('G') + '</button>';
  body.appendChild(fab);
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

  /* keys: W board, G graph, and while the board is open Esc, Z, arrows (same as the deck engine) */
  document.addEventListener('keydown', function (e) {
    var t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
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
    if (document.querySelector('.bk-toc.open, #cgZoom.on')) return;
    if (e.key === 'w' || e.key === 'W') { e.preventDefault(); toggleBoard(true); }
    else if (e.key === 'g' || e.key === 'G') { e.preventDefault(); openGraph(); }
  });
  window.TIBBoard = { toggle: function (on) { toggleBoard(on); }, graph: openGraph, isOpen: function () { return boardOn; } };
})();
