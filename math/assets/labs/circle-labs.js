/* Circle labs, shared by the 1.3 Session 2 deck and the Circles booklet.
   Load after KaTeX. Each widget looks up its own elements and does nothing if they are absent:
   CircleLabKit (grid, figures, zoom, KaTeX readouts), the Circle Reader (#cr-*), the Tangent Lab (#tl-*),
   and the Circle Probe (.probe). Built once, used everywhere: fix a lab here and both pages get it. */
/* ---------- shared grid helpers for the two labs ---------- */
window.CircleLabKit = (function () {
  'use strict';
  var M = '−', MONO = 'JetBrains Mono, monospace', S = 440, P0 = 26, LO = -10, HI = 10;
  function px(v) { return P0 + (v - LO) / (HI - LO) * (S - 2 * P0); }
  function py(v) { return S - P0 - (v - LO) / (HI - LO) * (S - 2 * P0); }
  var K = (S - 2 * P0) / (HI - LO), CID = 'CLIP';
  function sgn(n) { return n < 0 ? M + (-n) : String(n); }
  function grid(cid) {
    CID = cid;
    var s = '<defs><clipPath id="' + cid + '"><rect x="' + P0 + '" y="' + P0 + '" width="' + (S - 2 * P0) + '" height="' + (S - 2 * P0) + '"/></clipPath></defs>', v;
    for (v = LO; v <= HI; v++) {
      var ax = v === 0, col = ax ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.06)', w = ax ? 1.6 : 1;
      s += '<line x1="' + px(v) + '" y1="' + py(LO) + '" x2="' + px(v) + '" y2="' + py(HI) + '" stroke="' + col + '" stroke-width="' + w + '"/>';
      s += '<line x1="' + px(LO) + '" y1="' + py(v) + '" x2="' + px(HI) + '" y2="' + py(v) + '" stroke="' + col + '" stroke-width="' + w + '"/>';
      if (v % 2 === 0 && v !== 0) {
        s += '<text x="' + px(v) + '" y="' + (py(0) + 15) + '" font-family="' + MONO + '" font-size="10.5" fill="#b0b0b0" text-anchor="middle">' + sgn(v) + '</text>';
        s += '<text x="' + (px(0) - 5) + '" y="' + (py(v) + 4) + '" font-family="' + MONO + '" font-size="10.5" fill="#b0b0b0" text-anchor="end">' + sgn(v) + '</text>';
      }
    }
    return s;
  }
  /* "(x − 3)²", "(x + 2)²" or "x²" */
  function sq(name, c) { if (c === 0) return name + '²'; return '(' + name + (c > 0 ? ' − ' + c : ' + ' + (-c)) + ')²'; }
  function std(a, b, rr) { return sq('x', a) + ' + ' + sq('y', b) + ' = ' + rr; }
  function term(k, sym, first) {
    if (k === 0) return '';
    var mag = Math.abs(k), body = (mag === 1 && sym ? '' : mag) + sym;
    return first ? (k < 0 ? M : '') + body : (k < 0 ? ' − ' : ' + ') + body;
  }
  function expanded(a, b, rr) { return 'x² + y²' + term(-2 * a, 'x') + term(-2 * b, 'y') + term(a * a + b * b - rr, '') + ' = 0'; }
  function circle(cx, cy, r, col, dash, w) {
    return '<circle cx="' + px(cx) + '" cy="' + py(cy) + '" r="' + (r * K) + '" fill="none" stroke="' + col + '" stroke-width="' + (w || 2.6) + '"' + (dash ? ' stroke-dasharray="' + dash + '"' : '') + ' clip-path="url(#' + CID + ')"/>';
  }
  function dot(x, y, col, label, dx, dy) {
    return '<circle cx="' + px(x) + '" cy="' + py(y) + '" r="5.5" fill="' + col + '"/>' + (label ? '<text x="' + (px(x) + (dx || 8)) + '" y="' + (py(y) + (dy || -8)) + '" font-family="' + MONO + '" font-size="13" font-weight="700" fill="' + col + '">' + label + '</text>' : '');
  }
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = a % b; a = b; b = t; } return a || 1; }
  function frac(n, d) { if (d === 0) return 'undefined (vertical)'; if (n === 0) return '0'; if (d < 0) { n = -n; d = -d; } var g = gcd(n, d); n /= g; d /= g; return (n < 0 ? M : '') + Math.abs(n) + (d === 1 ? '' : '/' + d); }
  /* typeset a readout with KaTeX: real minus signs and ² become LaTeX, a/b becomes a small fraction */
  function tex(str) {
    if (!window.katex) return str;
    var t = str.replace(/−/g, '-').replace(/²/g, '^{2}').replace(/(\d+)\/(\d+)/g, '\\tfrac{$1}{$2}');
    return katex.renderToString(t, { throwOnError: false, output: 'html' });
  }
  /* static figure: equal scales, numbered axes, real minus signs. Spec: {x:[lo,hi], y:[lo,hi], k: px per unit, step, circles, lines, segs, right, texts, pts} */
  var MONO_F = 'JetBrains Mono, monospace';
  function lab(v) { return v < 0 ? M + (-v) : String(v); }
  function figure(id, f) {
    var svg = document.getElementById(id); if (!svg) return;
    var P = 26, k = f.k, xr = f.x, yr = f.y;
    var W = 2 * P + (xr[1] - xr[0]) * k, H = 2 * P + (yr[1] - yr[0]) * k;
    svg.setAttribute('viewBox', '0 0 ' + W.toFixed(1) + ' ' + H.toFixed(1));
    function px(v) { return P + (v - xr[0]) * k; }
    function py(v) { return H - P - (v - yr[0]) * k; }
    var v, cid = 'clip-' + id, s = '<defs><clipPath id="' + cid + '"><rect x="' + P + '" y="' + P + '" width="' + (W - 2 * P) + '" height="' + (H - 2 * P) + '"/></clipPath></defs>';
    for (v = Math.ceil(xr[0]); v <= xr[1]; v++) s += '<line x1="' + px(v) + '" y1="' + py(yr[0]) + '" x2="' + px(v) + '" y2="' + py(yr[1]) + '" stroke="rgba(255,255,255,0.05)"/>';
    for (v = Math.ceil(yr[0]); v <= yr[1]; v++) s += '<line x1="' + px(xr[0]) + '" y1="' + py(v) + '" x2="' + px(xr[1]) + '" y2="' + py(v) + '" stroke="rgba(255,255,255,0.05)"/>';
    s += '<line x1="' + px(xr[0]) + '" y1="' + py(0) + '" x2="' + px(xr[1]) + '" y2="' + py(0) + '" stroke="rgba(255,255,255,0.7)" stroke-width="1.4"/>';
    s += '<line x1="' + px(0) + '" y1="' + py(yr[0]) + '" x2="' + px(0) + '" y2="' + py(yr[1]) + '" stroke="rgba(255,255,255,0.7)" stroke-width="1.4"/>';
    for (v = Math.ceil(xr[0] / f.step) * f.step; v <= xr[1]; v += f.step) if (v !== 0) s += '<text x="' + px(v) + '" y="' + (py(0) + 13) + '" font-family="' + MONO_F + '" font-size="10" fill="#b0b0b0" text-anchor="middle">' + lab(v) + '</text>';
    for (v = Math.ceil(yr[0] / f.step) * f.step; v <= yr[1]; v += f.step) if (v !== 0) s += '<text x="' + (px(0) - 5) + '" y="' + (py(v) + 3.5) + '" font-family="' + MONO_F + '" font-size="10" fill="#b0b0b0" text-anchor="end">' + lab(v) + '</text>';
    (f.circles || []).forEach(function (c) { s += '<circle cx="' + px(c[0]) + '" cy="' + py(c[1]) + '" r="' + (c[2] * k) + '" fill="none" stroke="' + c[3] + '" stroke-width="2.4"' + (c[4] ? ' stroke-dasharray="' + c[4] + '"' : '') + ' clip-path="url(#' + cid + ')"/>'; });
    (f.lines || []).forEach(function (l) { s += '<line x1="' + px(l[0]) + '" y1="' + py(l[1]) + '" x2="' + px(l[2]) + '" y2="' + py(l[3]) + '" stroke="' + l[4] + '" stroke-width="2.6" clip-path="url(#' + cid + ')"/>'; });
    (f.segs || []).forEach(function (l) { s += '<line x1="' + px(l[0]) + '" y1="' + py(l[1]) + '" x2="' + px(l[2]) + '" y2="' + py(l[3]) + '" stroke="' + l[4] + '" stroke-width="2.2"' + (l[5] ? ' stroke-dasharray="' + l[5] + '"' : '') + '/>'; });
    if (f.right) {
      var r = f.right, len = 0.45 * (17 / k), u = Math.hypot(r[2][0], r[2][1]), w = Math.hypot(r[3][0], r[3][1]);
      var a = [r[2][0] / u * len, r[2][1] / u * len], b = [r[3][0] / w * len, r[3][1] / w * len];
      s += '<polyline points="' + px(r[0] + a[0]) + ',' + py(r[1] + a[1]) + ' ' + px(r[0] + a[0] + b[0]) + ',' + py(r[1] + a[1] + b[1]) + ' ' + px(r[0] + b[0]) + ',' + py(r[1] + b[1]) + '" fill="none" stroke="#ffc46b" stroke-width="1.6"/>';
    }
    (f.texts || []).forEach(function (t) { s += '<text x="' + px(t[0]) + '" y="' + py(t[1]) + '" font-family="' + MONO_F + '" font-size="13" font-weight="700" fill="' + t[3] + '" text-anchor="middle">' + t[2] + '</text>'; });
    (f.pts || []).forEach(function (p) {
      s += '<circle cx="' + px(p[0]) + '" cy="' + py(p[1]) + '" r="4.5" fill="' + p[3] + '"/>';
      s += '<text x="' + (px(p[0]) + p[4]) + '" y="' + (py(p[1]) + p[5]) + '" font-family="' + MONO_F + '" font-size="12" font-weight="700" fill="' + p[3] + '">' + p[2].replace(/-/g, M) + '</text>';
    });
    s += '<text x="' + (W - P + 4) + '" y="' + (py(0) - 4) + '" font-family="' + MONO_F + '" font-size="11" fill="#b0b0b0">x</text>';
    s += '<text x="' + (px(0) + 5) + '" y="' + (P - 8) + '" font-family="' + MONO_F + '" font-size="11" fill="#b0b0b0">y</text>';
    svg.innerHTML = s;
  }
  function figures(F) { Object.keys(F).forEach(function (id) { figure(id, F[id]); }); }
  /* click any graph (svg.cg) to enlarge it; click or Esc to close */
  function zoom() {
  'use strict';
  var box = document.createElement('div');
  box.id = 'cgZoom'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Enlarged graph');
  document.body.appendChild(box);
  function close() { box.classList.remove('on'); box.innerHTML = ''; }
  box.addEventListener('click', close);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && box.classList.contains('on')) close(); });
  [].slice.call(document.querySelectorAll('svg.cg')).forEach(function (svg) {
    svg.setAttribute('tabindex', '0'); svg.setAttribute('role', 'img');
    function open() {
      var c = svg.cloneNode(true); c.removeAttribute('tabindex'); c.removeAttribute('id');
      box.innerHTML = ''; box.appendChild(c);
      var p = document.createElement('p'); p.textContent = 'Click or press Esc to close'; box.appendChild(p);
      box.classList.add('on');
    }
    svg.addEventListener('click', open);
    svg.addEventListener('keydown', function (e) { if (e.key === 'Enter') open(); });
  });
  }
  return { figure: figure, figures: figures, zoom: zoom, tex: tex, px: px, py: py, K: K, sgn: sgn, grid: grid, std: std, expanded: expanded, circle: circle, dot: dot, gcd: gcd, frac: frac, term: term, M: M };
})();

/* ---------- Circle Reader: four ways to read (x − a)² + (y − b)² = r².
   Reading 0 is correct. 1-3 are the June 2023 examiner-report errors: radius = right-hand side,
   center signs kept as written, x and y swapped. ---------- */
(function () {
  'use strict';
  var svg = document.getElementById('cr-svg'); if (!svg) return;
  var L = CircleLabKit, M = L.M;
  var ia = document.getElementById('cr-a'), ib = document.getElementById('cr-b'), ir = document.getElementById('cr-r');
  var eqEl = document.getElementById('cr-eq'), read = document.getElementById('cr-read'), verdict = document.getElementById('cr-verdict'), showBtn = document.getElementById('cr-show');
  var alab = document.getElementById('cr-alab'), blab = document.getElementById('cr-blab'), rlab = document.getElementById('cr-rlab');
  var picks = [].slice.call(document.querySelectorAll('#cr-picks button'));
  var method = 0, show = false;
  var NAMES = ['Correct reading', 'Radius = right-hand side', 'Keep the signs', 'Swap x and y'];
  function draw() {
    var a = +ia.value, b = +ib.value, r = +ir.value, rr = r * r;
    alab.textContent = 'a = ' + L.sgn(a); blab.textContent = 'b = ' + L.sgn(b); rlab.textContent = 'r = ' + r + ', so r² = ' + rr;
    eqEl.innerHTML = '<b>' + L.tex(L.std(a, b, rr)) + '</b><br><span class="lw">expanded:</span> ' + L.tex(L.expanded(a, b, rr));
    var ca = a, cb = b, rad = r;
    if (method === 1) rad = rr; else if (method === 2) { ca = -a; cb = -b; } else if (method === 3) { ca = b; cb = a; }
    var same = ca === a && cb === b && rad === r;
    var h = '<span class="lw">' + NAMES[method] + ':</span> center <b>' + L.tex('(' + L.sgn(ca) + ', ' + L.sgn(cb) + ')') + '</b> &nbsp;radius <b>' + L.tex(String(rad)) + '</b>';
    var s = L.grid('cr-clip');
    if (show) {
      s += L.circle(a, b, r, '#b0b0b0', '6 5', 2.2) + L.dot(a, b, '#b0b0b0', '', 0, 0);
      s += L.circle(ca, cb, rad, same ? '#00e5ff' : '#ff6b6b', '', 3) + L.dot(ca, cb, same ? '#00e5ff' : '#ff6b6b', 'reading', 8, -8);
      verdict.style.display = '';
      verdict.className = 'verdict ' + (same ? 'ok' : 'no');
      if (method === 0) verdict.textContent = 'Matches. Every point on this circle fits the equation.';
      else if (same) verdict.textContent = 'It matches here only by luck: ' + (method === 1 ? 'r = 1, and 1 squared is 1.' : method === 2 ? 'the center is (0, 0), so flipping changes nothing.' : 'a = b, so swapping changes nothing.') + ' Move a slider and try again.';
      else verdict.textContent = method === 1 ? 'Misses. The right-hand side is r squared, so the radius is ' + r + ', not ' + rr + '.'
        : method === 2 ? 'Misses. (x − a) means the center has +a, so the signs flip when you read them.'
        : 'Misses. The number with x is the first coordinate of the center.';
      verdict.textContent = verdict.textContent.replace(/-/g, M);
    } else {
      h += '<br><span class="lw">Predict first: is this the circle the equation describes?</span>';
      verdict.style.display = 'none';
    }
    read.innerHTML = h;
    svg.innerHTML = s;
  }
  picks.forEach(function (bt) {
    bt.addEventListener('click', function () {
      method = +bt.getAttribute('data-i'); show = false;
      showBtn.setAttribute('aria-pressed', 'false'); showBtn.textContent = 'Show the circle';
      picks.forEach(function (o) { o.setAttribute('aria-pressed', o === bt ? 'true' : 'false'); });
      draw();
    });
  });
  showBtn.addEventListener('click', function () { show = !show; showBtn.setAttribute('aria-pressed', show ? 'true' : 'false'); showBtn.textContent = show ? 'Hide the circle' : 'Show the circle'; draw(); });
  [ia, ib, ir].forEach(function (el) { el.addEventListener('input', draw); });
  draw();
})();

/* ---------- Tangent Lab: radius 5, P on one of the 12 whole-number points of the circle.
   Method 0 flips and changes sign (the tangent). 1 uses the radius gradient. 2 flips only.
   The verdict tests the distance from the center to the line against r = 5. ---------- */
(function () {
  'use strict';
  var svg = document.getElementById('tl-svg'); if (!svg) return;
  var L = CircleLabKit, M = L.M;
  var OFF = [[5, 0], [4, 3], [3, 4], [0, 5], [-3, 4], [-4, 3], [-5, 0], [-4, -3], [-3, -4], [0, -5], [3, -4], [4, -3]];
  var ia = document.getElementById('tl-a'), ib = document.getElementById('tl-b'), ik = document.getElementById('tl-k');
  var eqEl = document.getElementById('tl-eq'), read = document.getElementById('tl-read'), verdict = document.getElementById('tl-verdict'), showBtn = document.getElementById('tl-show');
  var alab = document.getElementById('tl-alab'), klab = document.getElementById('tl-klab');
  var picks = [].slice.call(document.querySelectorAll('#tl-picks button'));
  var method = 0, show = false;
  function lineEq(x0, y0, u, v) {
    /* line through (x0, y0) with direction (u, v): v x − u y + (u y0 − v x0) = 0 */
    var A = v, B = -u, C = u * y0 - v * x0, g = L.gcd(L.gcd(A, B), C);
    A /= g; B /= g; C /= g;
    if (A < 0 || (A === 0 && B < 0)) { A = -A; B = -B; C = -C; }
    var out = L.term(A, 'x', true); out += L.term(B, 'y', out === ''); out += L.term(C, '', out === '');
    return out + ' = 0';
  }
  function draw() {
    var a = +ia.value, b = +ib.value, o = OFF[+ik.value], Px = a + o[0], Py = b + o[1];
    alab.textContent = 'center (' + L.sgn(a) + ', ' + L.sgn(b) + ')   (top slider x, bottom slider y)';
    klab.textContent = 'P = (' + L.sgn(Px) + ', ' + L.sgn(Py) + ')   (slide P around the circle)';
    eqEl.innerHTML = '<span class="lw">circle</span> &nbsp;<b>' + L.tex(L.std(a, b, 25)) + '</b>';
    var dx = o[0], dy = o[1], u, v;
    if (method === 0) { u = -dy; v = dx; } else if (method === 1) { u = dx; v = dy; } else { u = dy; v = dx; }
    function g(t) { return /undefined/.test(t) ? t : L.tex(t); }
    var h = '<span class="lw">gradient of radius</span> &nbsp;<b>' + g(L.frac(dy, dx)) + '</b>';
    var s = L.grid('tl-clip');
    s += L.circle(a, b, 5, '#b0b0b0', '6 5', 2.2);
    s += '<line x1="' + L.px(a) + '" y1="' + L.py(b) + '" x2="' + L.px(Px) + '" y2="' + L.py(Py) + '" stroke="#ffffff" stroke-width="2.4"/>';
    if (show) {
      var len = Math.hypot(u, v), k = 30 / len;
      var d = Math.abs(v * (a - Px) - u * (b - Py)) / len, ok = Math.abs(d - 5) < 1e-9;
      s += '<line x1="' + L.px(Px - u * k) + '" y1="' + L.py(Py - v * k) + '" x2="' + L.px(Px + u * k) + '" y2="' + L.py(Py + v * k) + '" stroke="' + (ok ? '#00e5ff' : '#ff6b6b') + '" stroke-width="3" clip-path="url(#tl-clip)"/>';
      h += '<br><span class="lw">gradient used</span> &nbsp;<b>' + g(L.frac(v, u)) + '</b>'
        + '<br><span class="lw">line</span> &nbsp;<b>' + L.tex(lineEq(Px, Py, u, v)) + '</b>'
        + '<br><span class="lw">distance from center to line</span> ' + (Math.round(d * 100) / 100) + ' &nbsp;<span class="lw">r</span> 5';
      verdict.style.display = '';
      verdict.className = 'verdict ' + (ok ? 'ok' : 'no');
      if (method === 0) verdict.textContent = 'The line is exactly 5 from the center, so it touches the circle only at P. This is the tangent.';
      else if (ok) verdict.textContent = 'It works here only because the radius is ' + (dy === 0 ? 'horizontal' : 'vertical') + '. Move P to a point like (4, 3) from the center and try again.';
      else verdict.textContent = method === 1 ? 'This line runs along the radius, straight through the center, and cuts the circle twice.'
        : 'Flipping without changing the sign does not give a right angle. The line cuts the circle again.';
      verdict.textContent = verdict.textContent.replace(/-/g, M);
    } else {
      h += '<br><span class="lw">Predict first: will this line only touch the circle at P?</span>';
      verdict.style.display = 'none';
    }
    s += L.dot(a, b, '#ffffff', 'C', -18, 16) + L.dot(Px, Py, '#ffc46b', 'P', 9, -9);
    read.innerHTML = h;
    svg.innerHTML = s;
  }
  picks.forEach(function (bt) {
    bt.addEventListener('click', function () {
      method = +bt.getAttribute('data-i'); show = false;
      showBtn.setAttribute('aria-pressed', 'false'); showBtn.textContent = 'Show the line';
      picks.forEach(function (o) { o.setAttribute('aria-pressed', o === bt ? 'true' : 'false'); });
      draw();
    });
  });
  showBtn.addEventListener('click', function () { show = !show; showBtn.setAttribute('aria-pressed', show ? 'true' : 'false'); showBtn.textContent = show ? 'Hide the line' : 'Show the line'; draw(); });
  [ia, ib, ik].forEach(function (el) { el.addEventListener('input', draw); });
  draw();
})();
/* ---------- Circle Probe: drag a point and test it against (x − a)² + (y − b)² = r².
   Markup: <div class="lab probe" data-a="1" data-b="-2" data-rr="45" data-x="-8,10" data-y="-11,7"
                data-start="4,4" data-step="2" [data-unit="10" data-unit-name="km"] [data-places='[[0,0,"Christiansted"],...]']>
   The probe snaps to whole numbers. Arrow keys move it one unit. The verdict compares the
   left-hand side with r², which is the squared distance from the center. ---------- */
(function () {
  'use strict';
  var L = window.CircleLabKit, M = L.M, MONO = 'JetBrains Mono, monospace';
  function sg(n) { return n < 0 ? M + (-n) : String(n); }
  function bracket(name, c) { return c === 0 ? name + '²' : '(' + name + (c > 0 ? ' − ' + c : ' + ' + (-c)) + ')²'; }
  function sub(v, c) { return c === 0 ? sg(v) + '²' : '(' + sg(v) + (c > 0 ? ' − ' + c : ' + ' + (-c)) + ')²'; }
  [].slice.call(document.querySelectorAll('.probe')).forEach(function (box, n) {
    var a = +box.getAttribute('data-a'), b = +box.getAttribute('data-b'), rr = +box.getAttribute('data-rr');
    var xr = box.getAttribute('data-x').split(',').map(Number), yr = box.getAttribute('data-y').split(',').map(Number);
    var st = (box.getAttribute('data-start') || '0,0').split(',').map(Number), step = +(box.getAttribute('data-step') || 2);
    var unit = +(box.getAttribute('data-unit') || 0), uname = box.getAttribute('data-unit-name') || '', clab = box.getAttribute('data-center-label') || 'C';
    var places = []; try { places = JSON.parse(box.getAttribute('data-places') || '[]'); } catch (e) {}
    var S = 440, P = 26, k = (S - 2 * P) / Math.max(xr[1] - xr[0], yr[1] - yr[0]);
    var Wd = 2 * P + (xr[1] - xr[0]) * k, Ht = 2 * P + (yr[1] - yr[0]) * k;
    function px(v) { return P + (v - xr[0]) * k; }
    function py(v) { return Ht - P - (v - yr[0]) * k; }
    var cid = 'probe-clip-' + n;
    box.innerHTML =
      '<svg class="fig" viewBox="0 0 ' + Wd.toFixed(1) + ' ' + Ht.toFixed(1) + '" tabindex="0" role="application" aria-label="Drag the point, or use the arrow keys, to test it against the circle"></svg>' +
      '<div class="panel"><div class="read pr-eq"></div><div class="read pr-work"></div><div class="verdict pr-v"></div>' +
      (places.length ? '<div class="picks pr-places"></div>' : '') +
      '<p class="pr-hint">Drag the point, or click the graph and use the arrow keys.</p></div>';
    var svg = box.querySelector('svg'), eqEl = box.querySelector('.pr-eq'), work = box.querySelector('.pr-work'), verdict = box.querySelector('.pr-v');
    var X = st[0], Y = st[1], drag = false;
    var r = Math.sqrt(rr);
    if (places.length) {
      var pl = box.querySelector('.pr-places');
      places.forEach(function (p) {
        var bt = document.createElement('button'); bt.type = 'button'; bt.textContent = p[2];
        bt.addEventListener('click', function () { X = p[0]; Y = p[1]; draw(); });
        pl.appendChild(bt);
      });
    }
    function grid() {
      var s = '<defs><clipPath id="' + cid + '"><rect x="' + P + '" y="' + P + '" width="' + (Wd - 2 * P) + '" height="' + (Ht - 2 * P) + '"/></clipPath></defs>', v;
      for (v = xr[0]; v <= xr[1]; v++) s += '<line x1="' + px(v) + '" y1="' + py(yr[0]) + '" x2="' + px(v) + '" y2="' + py(yr[1]) + '" stroke="' + (v === 0 ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.06)') + '" stroke-width="' + (v === 0 ? 1.6 : 1) + '"/>';
      for (v = yr[0]; v <= yr[1]; v++) s += '<line x1="' + px(xr[0]) + '" y1="' + py(v) + '" x2="' + px(xr[1]) + '" y2="' + py(v) + '" stroke="' + (v === 0 ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.06)') + '" stroke-width="' + (v === 0 ? 1.6 : 1) + '"/>';
      var ly = (yr[0] <= 0 && yr[1] >= 0) ? py(0) : py(yr[0]), lx = (xr[0] <= 0 && xr[1] >= 0) ? px(0) : px(xr[0]);
      for (v = Math.ceil(xr[0] / step) * step; v <= xr[1]; v += step) if (v !== 0) s += '<text x="' + px(v) + '" y="' + (ly + 14) + '" font-family="' + MONO + '" font-size="10.5" fill="#b0b0b0" text-anchor="middle">' + sg(v) + '</text>';
      for (v = Math.ceil(yr[0] / step) * step; v <= yr[1]; v += step) if (v !== 0) s += '<text x="' + (lx - 5) + '" y="' + (py(v) + 4) + '" font-family="' + MONO + '" font-size="10.5" fill="#b0b0b0" text-anchor="end">' + sg(v) + '</text>';
      return s;
    }
    function draw() {
      var dx = X - a, dy = Y - b, val = dx * dx + dy * dy, where = val < rr ? 'in' : val === rr ? 'on' : 'out';
      var col = where === 'on' ? '#4fe08a' : where === 'in' ? '#00e5ff' : '#ff6b6b';
      var s = grid();
      s += '<circle cx="' + px(a) + '" cy="' + py(b) + '" r="' + (r * k) + '" fill="rgba(0,229,255,0.05)" stroke="#ffffff" stroke-width="2.4" clip-path="url(#' + cid + ')"/>';
      s += '<line x1="' + px(a) + '" y1="' + py(b) + '" x2="' + px(X) + '" y2="' + py(b) + '" stroke="#ffc46b" stroke-width="2" stroke-dasharray="4 3"/>';
      s += '<line x1="' + px(X) + '" y1="' + py(b) + '" x2="' + px(X) + '" y2="' + py(Y) + '" stroke="#ffc46b" stroke-width="2" stroke-dasharray="4 3"/>';
      s += '<line x1="' + px(a) + '" y1="' + py(b) + '" x2="' + px(X) + '" y2="' + py(Y) + '" stroke="' + col + '" stroke-width="2.6"/>';
      /* a place is [x, y, label, dx, dy, anchor]; the offsets keep nearby labels apart */
      places.forEach(function (p) { s += '<circle cx="' + px(p[0]) + '" cy="' + py(p[1]) + '" r="4" fill="#b0b0b0"/><text x="' + (px(p[0]) + (p[3] == null ? 7 : p[3])) + '" y="' + (py(p[1]) + (p[4] == null ? 14 : p[4])) + '" font-family="' + MONO + '" font-size="11" fill="#b0b0b0" text-anchor="' + (p[5] || 'start') + '">' + p[2] + '</text>'; });
      s += '<circle cx="' + px(a) + '" cy="' + py(b) + '" r="4.5" fill="#ffffff"/><text x="' + (px(a) - 16) + '" y="' + (py(b) + 16) + '" font-family="' + MONO + '" font-size="12" font-weight="700" fill="#ffffff">' + clab + '</text>';
      s += '<circle class="pr-pt" cx="' + px(X) + '" cy="' + py(Y) + '" r="9" fill="' + col + '" stroke="#0a0a0a" stroke-width="2" style="cursor:grab"/>';
      var right = X >= a, up = Y >= b;
      s += '<text x="' + (px(X) + (right ? 12 : -12)) + '" y="' + (py(Y) + (up ? -10 : 20)) + '" text-anchor="' + (right ? 'start' : 'end') + '" font-family="' + MONO + '" font-size="13" font-weight="700" fill="' + col + '">(' + sg(X) + ', ' + sg(Y) + ')</text>';
      svg.innerHTML = s;
      eqEl.innerHTML = '<span class="lw">circle</span> &nbsp;<b>' + L.tex(bracket('x', a) + ' + ' + bracket('y', b) + ' = ' + rr) + '</b>';
      var w = '<span class="lw">left-hand side at the point</span><br>' + L.tex(sub(X, a) + ' + ' + sub(Y, b) + ' = ' + (dx * dx) + ' + ' + (dy * dy) + ' = ' + val);
      if (unit) w += '<br><span class="lw">distance from the center</span> ' + L.tex('\\sqrt{' + val + '}') + ' ≈ ' + (Math.round(Math.sqrt(val) * unit * 10) / 10) + ' ' + uname + ' &nbsp;<span class="lw">radius</span> ' + (r * unit) + ' ' + uname;
      work.innerHTML = w;
      verdict.className = 'verdict pr-v ' + (where === 'on' ? 'ok' : where === 'in' ? 'in' : 'no');
      verdict.textContent = (where === 'in' ? val + ' < ' + rr + ', so the point is inside the circle.' : where === 'on' ? val + ' = ' + rr + ', so the point is on the circle.' : val + ' > ' + rr + ', so the point is outside the circle.');
    }
    function toGrid(e) {
      var pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
      var q = pt.matrixTransform(svg.getScreenCTM().inverse());
      X = Math.max(xr[0], Math.min(xr[1], Math.round((q.x - P) / k + xr[0])));
      Y = Math.max(yr[0], Math.min(yr[1], Math.round((Ht - P - q.y) / k + yr[0])));
      draw();
    }
    svg.style.touchAction = 'none';
    svg.addEventListener('pointerdown', function (e) { drag = true; try { svg.setPointerCapture(e.pointerId); } catch (er) {} toGrid(e); e.preventDefault(); });
    svg.addEventListener('pointermove', function (e) { if (drag) toGrid(e); });
    ['pointerup', 'pointercancel'].forEach(function (ev) { svg.addEventListener(ev, function () { drag = false; }); });
    svg.addEventListener('keydown', function (e) {
      var d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key];
      if (!d) return; e.preventDefault(); e.stopPropagation();
      X = Math.max(xr[0], Math.min(xr[1], X + d[0])); Y = Math.max(yr[0], Math.min(yr[1], Y + d[1])); draw();
    });
    box.__set = function (x, y) { X = x; Y = y; draw(); };
    draw();
  });
})();
