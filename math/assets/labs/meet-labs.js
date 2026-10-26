/* Meeting labs, shared by the 1.3 Session 3 deck and the "Where lines meet curves" booklet.
   Load after KaTeX. Two pieces, both instance-based (any number per page, no fixed ids):
   MeetKit.figure(svgOrId, spec)  static figure with numbered axes, equal scales, circles, lines, function curves.
   MeetLab                         every <div class="lab meet"> on the page becomes a line-meets-curve lab.
   Markup: <div class="lab meet" data-m="1" data-c="2" [data-curve="circle"] [data-curves="circle,parabola,recip,slip"]></div>
   The lab substitutes y = mx + c into the curve, shows the quadratic (fractions cleared), asks for a
   prediction (cuts / touches / misses), then shows b² − 4ac, the verdict and the meeting points.
   "slip" is the June 2023 examiner-report error on Paper 11 Q5: writing 2/x as 2x. The equation stops being
   quadratic, and the lab says so. */
window.MeetKit = (function () {
  'use strict';
  var M = '−', MONO = 'JetBrains Mono, monospace';
  function lab(v) { var r = Math.round(v * 100) / 100; return r < 0 ? M + (-r) : String(r); }
  function el(x) { return typeof x === 'string' ? document.getElementById(x) : x; }
  /* spec: {x:[lo,hi], y:[lo,hi], k: px per unit, step, circles:[[cx,cy,r,col,dash]], lines:[[m,c,col,dash]] (y = mx + c),
            fns:[[f, col, dash, xlo, xhi]], pts:[[x,y,label,col,dx,dy]], texts:[[x,y,txt,col]], asym: true (draw nothing extra) } */
  function figure(target, f) {
    var svg = el(target); if (!svg) return;
    var P = 24, k = f.k, xr = f.x, yr = f.y, W = 2 * P + (xr[1] - xr[0]) * k, H = 2 * P + (yr[1] - yr[0]) * k;
    svg.setAttribute('viewBox', '0 0 ' + W.toFixed(1) + ' ' + H.toFixed(1));
    function px(v) { return P + (v - xr[0]) * k; }
    function py(v) { return H - P - (v - yr[0]) * k; }
    var id = svg.id || ('mk' + Math.random().toString(36).slice(2, 8)), cid = 'clip-' + id, v;
    var s = '<defs><clipPath id="' + cid + '"><rect x="' + P + '" y="' + P + '" width="' + (W - 2 * P) + '" height="' + (H - 2 * P) + '"/></clipPath></defs>';
    var gstep = f.grid || 1;
    for (v = Math.ceil(xr[0] / gstep) * gstep; v <= xr[1]; v += gstep) s += '<line x1="' + px(v) + '" y1="' + py(yr[0]) + '" x2="' + px(v) + '" y2="' + py(yr[1]) + '" stroke="rgba(255,255,255,0.05)"/>';
    for (v = Math.ceil(yr[0] / gstep) * gstep; v <= yr[1]; v += gstep) s += '<line x1="' + px(xr[0]) + '" y1="' + py(v) + '" x2="' + px(xr[1]) + '" y2="' + py(v) + '" stroke="rgba(255,255,255,0.05)"/>';
    s += '<line x1="' + px(xr[0]) + '" y1="' + py(0) + '" x2="' + px(xr[1]) + '" y2="' + py(0) + '" stroke="rgba(255,255,255,0.7)" stroke-width="1.4"/>';
    s += '<line x1="' + px(0) + '" y1="' + py(yr[0]) + '" x2="' + px(0) + '" y2="' + py(yr[1]) + '" stroke="rgba(255,255,255,0.7)" stroke-width="1.4"/>';
    var fs = f.fs || 10;
    for (v = Math.ceil(xr[0] / f.step) * f.step; v <= xr[1] + 1e-9; v += f.step) if (Math.abs(v) > 1e-9) s += '<text x="' + px(v) + '" y="' + (py(0) + fs + 3) + '" font-family="' + MONO + '" font-size="' + fs + '" fill="#b0b0b0" text-anchor="middle">' + lab(v) + '</text>';
    for (v = Math.ceil(yr[0] / f.step) * f.step; v <= yr[1] + 1e-9; v += f.step) if (Math.abs(v) > 1e-9) s += '<text x="' + (px(0) - 5) + '" y="' + (py(v) + fs * 0.35) + '" font-family="' + MONO + '" font-size="' + fs + '" fill="#b0b0b0" text-anchor="end">' + lab(v) + '</text>';
    (f.circles || []).forEach(function (c) { s += '<circle cx="' + px(c[0]) + '" cy="' + py(c[1]) + '" r="' + (c[2] * k) + '" fill="none" stroke="' + c[3] + '" stroke-width="2.4"' + (c[4] ? ' stroke-dasharray="' + c[4] + '"' : '') + ' clip-path="url(#' + cid + ')"/>'; });
    (f.fns || []).forEach(function (c) { s += path(c[0], c[3] == null ? xr[0] : c[3], c[4] == null ? xr[1] : c[4], yr, px, py, c[1], c[2], cid, c[5]); });
    (f.lines || []).forEach(function (l) {
      /* trim y = mx + c to the window, so no part of the line sits outside the figure */
      var a0 = xr[0], a1 = xr[1];
      if (l[0] !== 0) { var e0 = (yr[0] - l[1]) / l[0], e1 = (yr[1] - l[1]) / l[0]; a0 = Math.max(a0, Math.min(e0, e1)); a1 = Math.min(a1, Math.max(e0, e1)); }
      if (a1 <= a0) return;
      s += '<line x1="' + px(a0) + '" y1="' + py(l[0] * a0 + l[1]) + '" x2="' + px(a1) + '" y2="' + py(l[0] * a1 + l[1]) + '" stroke="' + l[2] + '" stroke-width="2.6"' + (l[3] ? ' stroke-dasharray="' + l[3] + '"' : '') + ' clip-path="url(#' + cid + ')"/>';
    });
    (f.texts || []).forEach(function (t) { s += '<text x="' + px(t[0]) + '" y="' + py(t[1]) + '" font-family="' + MONO + '" font-size="' + (t[4] || 12) + '" font-weight="700" fill="' + t[3] + '" text-anchor="' + (t[5] || 'middle') + '">' + t[2].replace(/-/g, M) + '</text>'; });
    (f.pts || []).forEach(function (p) {
      s += '<circle cx="' + px(p[0]) + '" cy="' + py(p[1]) + '" r="4.5" fill="' + p[3] + '"/>';
      if (p[2]) s += '<text x="' + (px(p[0]) + p[4]) + '" y="' + (py(p[1]) + p[5]) + '" font-family="' + MONO + '" font-size="12" font-weight="700" fill="' + p[3] + '">' + p[2].replace(/-/g, M) + '</text>';
    });
    if (!f.noxy) {
      s += '<text x="' + (W - P + 3) + '" y="' + (py(0) - 4) + '" font-family="' + MONO + '" font-size="11" fill="#b0b0b0">x</text>';
      s += '<text x="' + (px(0) + 5) + '" y="' + (P - 7) + '" font-family="' + MONO + '" font-size="11" fill="#b0b0b0">y</text>';
    }
    svg.innerHTML = s;
  }
  /* a function curve as polylines, broken wherever it leaves the window or jumps (asymptotes) */
  function path(fn, x0, x1, yr, px, py, col, dash, cid, w) {
    var out = '', pts = [], n = 600, i, x, y, span = yr[1] - yr[0];
    function flush() { if (pts.length > 1) out += '<polyline points="' + pts.join(' ') + '" fill="none" stroke="' + col + '" stroke-width="' + (w || 2.6) + '"' + (dash ? ' stroke-dasharray="' + dash + '"' : '') + ' stroke-linejoin="round" clip-path="url(#' + cid + ')"/>'; pts = []; }
    var prev = null;
    for (i = 0; i <= n; i++) {
      x = x0 + (x1 - x0) * i / n; y = fn(x);
      if (!isFinite(y) || Math.abs(y - (yr[0] + yr[1]) / 2) > span * 1.5 || (prev !== null && Math.abs(y - prev) > span)) { flush(); prev = isFinite(y) ? y : null; if (!isFinite(y) || Math.abs(y - (yr[0] + yr[1]) / 2) > span * 1.5) continue; }
      pts.push(px(x).toFixed(1) + ',' + py(y).toFixed(1)); prev = y;
    }
    flush();
    return out;
  }
  function tex(str) {
    if (!window.katex) return str;
    var t = str.replace(/−/g, '-').replace(/²/g, '^{2}').replace(/√(\d+)/g, '\\sqrt{$1}').replace(/(\d+)\/([a-z\d]+)/g, '\\tfrac{$1}{$2}');
    return katex.renderToString(t, { throwOnError: false, output: 'html' });
  }
  return { figure: figure, path: path, tex: tex, lab: lab, M: M };
})();

/* ---------- Meeting Lab ---------- */
(function () {
  'use strict';
  var K = window.MeetKit, M = K.M, MONO = 'JetBrains Mono, monospace';
  /* each curve: name, equation text, function for drawing, and the quadratic A x² + B x + C = 0 after substituting y = mx + c */
  var CURVES = {
    circle: { name: 'Circle', eq: 'x² + y² = 45', circle: [0, 0, Math.sqrt(45)],
      quad: function (m, c) { return [1 + m * m, 2 * m * c, c * c - 45]; },
      sub: function (ms, cs) { return 'x² + (' + ms + ')² = 45'; } },
    parabola: { name: 'Parabola', eq: 'y = x² − 4x + 5', fn: function (x) { return x * x - 4 * x + 5; },
      quad: function (m, c) { return [1, -4 - m, 5 - c]; },
      sub: function (ms) { return 'x² − 4x + 5 = ' + ms; } },
    recip: { name: 'Reciprocal', eq: 'y = 2/x', fn: function (x) { return Math.abs(x) < 1e-9 ? NaN : 2 / x; },
      quad: function (m, c) { return [m, c, -2]; },
      sub: function (ms) { return '2/x = ' + ms + ',  times x'; } },
    slip: { name: 'Reciprocal, with the slip', eq: 'y = 2/x\\text{, written as }y = 2x', fn: function (x) { return Math.abs(x) < 1e-9 ? NaN : 2 / x; }, ghost: function (x) { return 2 * x; },
      quad: function (m, c) { return [0, m - 2, c]; },
      sub: function (ms) { return '2x = ' + ms; } }
  };
  function num(v) { var r = Math.round(v * 1e6) / 1e6; return r < 0 ? M + (-r) : String(r); }
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b > 1e-9) { var t = a % b; a = b; b = t; } return a || 1; }
  /* clear fractions: m and c are multiples of 0.5, so scaling by 4 always gives integers */
  function intQuad(q) {
    var s = 1; while (s <= 4 && q.some(function (v) { return Math.abs(v * s - Math.round(v * s)) > 1e-9; })) s *= 2;
    var r = q.map(function (v) { return Math.round(v * s); });
    var g = r.reduce(function (a, v) { return v === 0 ? a : gcd(a, v); }, 0) || 1;
    if (r[0] < 0 || (r[0] === 0 && r[1] < 0)) g = -g;
    return r.map(function (v) { return v / g; });
  }
  function term(k, sym, first) {
    if (k === 0) return '';
    var mag = Math.abs(k), body = (mag === 1 && sym ? '' : String(mag)) + sym;
    return first ? (k < 0 ? M : '') + body : (k < 0 ? ' − ' : ' + ') + body;
  }
  function poly(q) { var s = term(q[0], 'x²', true); s += term(q[1], 'x', s === ''); s += term(q[2], '', s === ''); return (s || '0') + ' = 0'; }
  function lineText(m, c) {
    var s = m === 0 ? '' : (m === 1 ? 'x' : m === -1 ? M + 'x' : num(m) + 'x');
    if (c !== 0) s += s ? (c < 0 ? ' − ' + num(-c) : ' + ' + num(c)) : num(c);
    return 'y = ' + (s || '0');
  }
  function rhs(m, c) { return lineText(m, c).slice(4); }
  function fmtPt(x, y) { return '(' + num(Math.round(x * 100) / 100) + ', ' + num(Math.round(y * 100) / 100) + ')'; }

  [].slice.call(document.querySelectorAll('.lab.meet')).forEach(function (box, n) {
    var keys = (box.getAttribute('data-curves') || 'circle,parabola,recip,slip').split(',');
    var cur = box.getAttribute('data-curve') || keys[0];
    var m0 = +(box.getAttribute('data-m') || 1), c0 = +(box.getAttribute('data-c') || 2);
    var uid = 'meet' + n, guess = null, show = false;
    box.innerHTML =
      '<svg class="fig" viewBox="0 0 440 440" role="img" aria-label="Grid with the chosen curve, the line y = mx + c, and the points where they meet"></svg>' +
      '<div class="panel">' +
      '<div class="picks mt-curves" role="group" aria-label="Curve"></div>' +
      '<label for="' + uid + '-m" class="mt-mlab">gradient m</label><input type="range" id="' + uid + '-m" class="mt-m" min="-3" max="3" step="0.5" value="' + m0 + '">' +
      '<label for="' + uid + '-c" class="mt-clab">intercept c</label><input type="range" id="' + uid + '-c" class="mt-c" min="-9" max="9" step="0.5" value="' + c0 + '">' +
      '<div class="read mt-read"></div>' +
      '<div class="picks mt-guess" role="group" aria-label="Your prediction"><button type="button" data-g="2" aria-pressed="false">Cuts twice</button><button type="button" data-g="1" aria-pressed="false">Touches once</button><button type="button" data-g="0" aria-pressed="false">Misses</button></div>' +
      '<button type="button" class="toggle mt-show" aria-pressed="false">Show b² − 4ac</button>' +
      '<div class="verdict mt-v" style="display:none"></div></div>';
    var svg = box.querySelector('svg'), im = box.querySelector('.mt-m'), ic = box.querySelector('.mt-c'), read = box.querySelector('.mt-read');
    var mlab = box.querySelector('.mt-mlab'), clab = box.querySelector('.mt-clab'), verdict = box.querySelector('.mt-v'), showBtn = box.querySelector('.mt-show');
    var cw = box.querySelector('.mt-curves'), gbtns = [].slice.call(box.querySelectorAll('.mt-guess button'));
    keys.forEach(function (key) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = CURVES[key].name; b.setAttribute('data-k', key);
      b.setAttribute('aria-pressed', key === cur ? 'true' : 'false');
      if (key === 'slip') b.className = 'mt-slip';
      b.addEventListener('click', function () { cur = key; reset(); [].forEach.call(cw.children, function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); }); draw(); });
      cw.appendChild(b);
    });
    function reset() { show = false; guess = null; showBtn.setAttribute('aria-pressed', 'false'); showBtn.textContent = 'Show b² − 4ac'; gbtns.forEach(function (o) { o.setAttribute('aria-pressed', 'false'); }); }
    gbtns.forEach(function (b) { b.addEventListener('click', function () { guess = +b.getAttribute('data-g'); gbtns.forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); }); draw(); }); });
    showBtn.addEventListener('click', function () { show = !show; showBtn.setAttribute('aria-pressed', show ? 'true' : 'false'); showBtn.textContent = show ? 'Hide' : 'Show b² − 4ac'; draw(); });
    [im, ic].forEach(function (i) { i.addEventListener('input', function () { reset(); draw(); }); });

    var S = 440, P = 26, LO = -10, HI = 10, k = (S - 2 * P) / (HI - LO), cid = uid + '-clip';
    function px(v) { return P + (v - LO) * k; }
    function py(v) { return S - P - (v - LO) * k; }
    function grid() {
      var s = '<defs><clipPath id="' + cid + '"><rect x="' + P + '" y="' + P + '" width="' + (S - 2 * P) + '" height="' + (S - 2 * P) + '"/></clipPath></defs>', v;
      for (v = LO; v <= HI; v++) {
        var ax = v === 0, col = ax ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.06)', w = ax ? 1.6 : 1;
        s += '<line x1="' + px(v) + '" y1="' + py(LO) + '" x2="' + px(v) + '" y2="' + py(HI) + '" stroke="' + col + '" stroke-width="' + w + '"/>';
        s += '<line x1="' + px(LO) + '" y1="' + py(v) + '" x2="' + px(HI) + '" y2="' + py(v) + '" stroke="' + col + '" stroke-width="' + w + '"/>';
        if (v % 2 === 0 && v !== 0) {
          s += '<text x="' + px(v) + '" y="' + (py(0) + 15) + '" font-family="' + MONO + '" font-size="10.5" fill="#b0b0b0" text-anchor="middle">' + num(v) + '</text>';
          s += '<text x="' + (px(0) - 5) + '" y="' + (py(v) + 4) + '" font-family="' + MONO + '" font-size="10.5" fill="#b0b0b0" text-anchor="end">' + num(v) + '</text>';
        }
      }
      return s;
    }
    /* the outcome, worked from the cleared quadratic */
    function solve(q, m, c) {
      var A = q[0], B = q[1], C = q[2];
      if (A === 0) {
        if (B === 0) return { kind: 'none-lin', xs: [] };
        return { kind: 'linear', xs: [-C / B] };
      }
      var D = B * B - 4 * A * C;
      if (D > 0) return { kind: 2, D: D, xs: [(-B - Math.sqrt(D)) / (2 * A), (-B + Math.sqrt(D)) / (2 * A)] };
      if (D === 0) return { kind: 1, D: D, xs: [-B / (2 * A)] };
      return { kind: 0, D: D, xs: [] };
    }
    function draw() {
      var m = +im.value, c = +ic.value, C = CURVES[cur];
      mlab.textContent = 'gradient m = ' + num(m); clab.textContent = 'intercept c = ' + num(c);
      var q = intQuad(C.quad(m, c)), r = solve(q, m, c), lt = lineText(m, c), slip = cur === 'slip';
      var h = '<span class="lw">curve</span> &nbsp;<b>' + K.tex(C.eq) + '</b>' +
              '<br><span class="lw">line</span> &nbsp;<b>' + K.tex(lt) + '</b>' +
              '<br><span class="lw">substitute</span> &nbsp;' + K.tex(C.sub(rhs(m, c)).replace(',  times x', '\\quad \\times x')) +
              '<br><span class="lw">rearrange to 0</span> &nbsp;<b>' + K.tex(poly(q)) + '</b>';
      var s = grid();
      if (C.circle) s += '<circle cx="' + px(0) + '" cy="' + py(0) + '" r="' + (C.circle[2] * k) + '" fill="none" stroke="#ffffff" stroke-width="2.6" clip-path="url(#' + cid + ')"/>';
      if (C.fn) s += K.path(C.fn, LO, HI, [LO, HI], px, py, '#ffffff', '', cid);
      if (slip) s += K.path(C.ghost, LO, HI, [LO, HI], px, py, '#ff6b6b', '7 5', cid);
      var x0 = LO, x1 = HI;
      if (m !== 0) { var q0 = (LO - c) / m, q1 = (HI - c) / m; x0 = Math.max(LO, Math.min(q0, q1)); x1 = Math.min(HI, Math.max(q0, q1)); }
      if (x1 > x0) s += '<line x1="' + px(x0) + '" y1="' + py(m * x0 + c) + '" x2="' + px(x1) + '" y2="' + py(m * x1 + c) + '" stroke="#00e5ff" stroke-width="2.8" clip-path="url(#' + cid + ')"/>';
      var ok = null, msg = '';
      if (show) {
        verdict.style.display = '';
        if (slip) {
          ok = false;
          msg = 'This is not a quadratic: there is no x² term, so b² − 4ac has nothing to work on. 2/x is not 2x (the red dashed line). Multiply both sides by x instead.';
          h += '<br><span class="lw">b² − 4ac</span> &nbsp;<b>not a quadratic</b>';
        } else if (r.kind === 'linear' || r.kind === 'none-lin') {
          ok = true;
          msg = r.kind === 'linear' ? 'm = 0 makes the line horizontal, and the equation is linear: one meeting point. The discriminant only applies to a quadratic.' : 'y = 0 is the x-axis. The curve never reaches it, so they never meet.';
          h += '<br><span class="lw">b² − 4ac</span> &nbsp;<b>no x² term</b>';
        } else {
          h += '<br><span class="lw">b² − 4ac</span> &nbsp;<b>' + K.tex('(' + num(q[1]) + ')^2 - 4(' + num(q[0]) + ')(' + num(q[2]) + ') = ' + num(r.D)) + '</b>';
          msg = r.kind === 2 ? 'b² − 4ac > 0: two different roots, so the line cuts the curve at two points.' : r.kind === 1 ? 'b² − 4ac = 0: one repeated root, so the line touches the curve once. It is a tangent.' : 'b² − 4ac < 0: no real roots, so the line misses the curve.';
          if (guess !== null) { ok = guess === r.kind; msg = (ok ? 'Your prediction was right. ' : 'Not this time. ') + msg; } else ok = true;
        }
        var pts = slip ? [] : r.xs.map(function (x) { return [x, m * x + c]; });
        if (pts.length) h += '<br><span class="lw">meeting ' + (pts.length === 1 ? 'point' : 'points') + '</span> &nbsp;' + pts.map(function (p) { return fmtPt(p[0], p[1]); }).join(' and ');
        pts.forEach(function (p) { s += '<circle cx="' + px(p[0]) + '" cy="' + py(p[1]) + '" r="6" fill="#ffc46b" stroke="#0a0a0a" stroke-width="2"/>'; });
        verdict.className = 'verdict mt-v ' + (ok ? 'ok' : 'no');
        verdict.textContent = msg.replace(/(^|[\s(])-(\d)/g, '$1' + M + '$2');
      } else {
        verdict.style.display = 'none';
        h += '<br><span class="lw">Predict first: does the line cut, touch or miss?</span>';
      }
      read.innerHTML = h;
      svg.innerHTML = s;
    }
    box.__set = function (curve, m, c) { if (curve) { cur = curve; [].forEach.call(cw.children, function (o) { o.setAttribute('aria-pressed', o.getAttribute('data-k') === curve ? 'true' : 'false'); }); } im.value = m; ic.value = c; reset(); draw(); };
    draw();
  });
})();
