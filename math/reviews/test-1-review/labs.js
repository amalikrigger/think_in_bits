/* Test 1 Review labs. Every figure is drawn with the shared MeetKit.figure (meet-labs.js)
   and GeoKit.overlay (circle-geo-labs.js), so axes, trimming and colors match the decks.
   Readouts are plain text with real minus signs (U+2212). */
(function () {
  'use strict';
  var M = '−', CY = '#00e5ff', WH = '#ffffff', GO = '#ffc46b', RD = '#ff6b6b', GN = '#4fe08a', GR = '#b0b0b0', PU = '#b39dff';
  function $(id) { return document.getElementById(id); }
  function fmt(v, dp) {
    if (!isFinite(v)) return '?';
    var p = Math.pow(10, dp == null ? 2 : dp), r = Math.round(v * p) / p;
    if (Object.is(r, -0) || Math.abs(r) < 1e-12) r = 0;
    var s = String(Math.abs(r));
    return (r < 0 ? M : '') + s;
  }
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = a % b; a = b; b = t; } return a || 1; }
  /* exact fraction from a decimal that is a multiple of 1/den */
  function frac(v, den) {
    den = den || 4; var n = Math.round(v * den), d = den, g = gcd(n, d); n /= g; d /= g;
    return (n < 0 ? M : '') + (d === 1 ? Math.abs(n) : Math.abs(n) + '/' + d);
  }
  function draw(svgId, spec, extra) {
    MeetKit.figure(svgId, spec);
    if (!extra || !extra.length) return;
    if (!spec.ky || spec.ky === spec.k) { GeoKit.overlay(svgId, spec, extra); return; }
    /* GeoKit.overlay assumes one scale; this figure has its own y scale, so draw the segments here
       with the same mapping MeetKit.figure uses (P = 24, k per x unit, ky per y unit). */
    var P = 24, H = 2 * P + (spec.y[1] - spec.y[0]) * spec.ky, s = '';
    function px(v) { return P + (v - spec.x[0]) * spec.k; }
    function py(v) { return H - P - (v - spec.y[0]) * spec.ky; }
    extra.forEach(function (it) {
      if (!it.seg) return; var g = it.seg;
      s += '<line x1="' + px(g[0]) + '" y1="' + py(g[1]) + '" x2="' + px(g[2]) + '" y2="' + py(g[3]) + '" stroke="' + it.col + '" stroke-width="' + (it.w || 2.6) + '"' + (it.dash ? ' stroke-dasharray="' + it.dash + '"' : '') + ' stroke-linecap="round"/>';
    });
    $(svgId).insertAdjacentHTML('beforeend', s);
  }
  function picks(id, cb) {
    var box = $(id); if (!box) return;
    var bs = [].slice.call(box.querySelectorAll('button'));
    bs.forEach(function (b) {
      b.addEventListener('click', function () {
        bs.forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
        cb(b.getAttribute('data-v'));
      });
    });
    var on = box.querySelector('[aria-pressed="true"]') || bs[0];
    return on.getAttribute('data-v');
  }
  function verdict(el, cls, html) { el.className = 'verdict ' + cls; el.innerHTML = html; }
  function slider(id, cb, show) {
    var s = $(id), o = $(id + 'o');
    function go() { var v = parseFloat(s.value); if (o) o.textContent = show ? show(v) : fmt(v); cb(v); }
    s.addEventListener('input', go);
    return go;
  }

  /* ---------- warm-up: the tank race ---------- */
  (function () {
    if (!$('lab-tanks')) return;
    function set(id, f) { var w = $(id); w.style.height = Math.min(1, f) * 100 + '%'; w.classList.toggle('full', f >= 1 - 1e-9); }
    var go = slider('tkT', function (t) {
      var a = t / 10, b = t / 15, c = a + b;
      set('tk1', a); set('tk2', b); set('tk3', c);
      $('tkRead').innerHTML =
        '<span class="lw">pipe 1:</span> ' + fmt(t, 1) + ' × 1/10 = <b>' + fmt(Math.min(a, 1) * 100, 0) + '%</b> full<br>' +
        '<span class="lw">pipe 2:</span> ' + fmt(t, 1) + ' × 1/15 = <b>' + fmt(Math.min(b, 1) * 100, 0) + '%</b> full<br>' +
        '<span class="lw">both:</span> ' + fmt(t, 1) + ' × 1/6 = <b>' + fmt(Math.min(c, 1) * 100, 0) + '%</b> full' +
        (Math.abs(t - 6) < 1e-9 ? '<br><span class="ok">6 minutes: the shared tank is exactly full.</span>' : '');
    }, function (v) { return fmt(v, 1); });
    go();
  })();

  /* ---------- Q1: the square builder ---------- */
  (function () {
    if (!$('lab-sq')) return;
    var spec0 = { x: [-7, 1], y: [-15, 7], k: 40, ky: 11, step: 1, ystep: 5 };
    function real(x) { return 2 * x * x + 12 * x + 5; }
    function render(v) {
      var sub = +v, c = 5 - sub, cand = function (x) { return 2 * (x + 3) * (x + 3) + c; };
      var ok = sub === 18;
      var spec = Object.assign({}, spec0, {
        fns: [[real, WH, '', null, null, 3], [cand, ok ? CY : RD, '7 5', null, null, 2.6]],
        pts: [[-3, c, '(' + M + '3, ' + fmt(c) + ')', ok ? CY : RD, 8, ok ? 16 : -8]]
      });
      draw('sqFig', spec);
      $('sqRead').innerHTML = '<span class="lw">line 3:</span> 2(x + 3)² ' + M + ' ' + sub + ' + 5<br>' +
        '<span class="lw">gives:</span> <b>2(x + 3)² ' + (c < 0 ? M + ' ' + (-c) : '+ ' + c) + '</b><br>' +
        '<span class="lw">check at x = 0:</span> real ' + fmt(real(0)) + ', yours ' + fmt(cand(0));
      if (ok) verdict($('sqVerdict'), 'ok', 'It lies exactly on the white curve. The 2 outside multiplies the ' + M + '9 as well, so you take away 18.');
      else verdict($('sqVerdict'), 'no', 'It misses: your curve is 9 units too high everywhere. The bracket was 2[(x + 3)² ' + M + ' 9], so the 2 multiplies the 9.');
    }
    render(picks('sqPicks', render));
  })();

  /* ---------- Q2: the range finder ---------- */
  (function () {
    if (!$('lab-rng')) return;
    function f(x) { return x * x - 6 * x + 11; }
    var L = $('rngL'), R = $('rngR'), H = $('rngH');
    function render() {
      var a = Math.min(+L.value, +R.value), b = Math.max(+L.value, +R.value), h = +H.value;
      $('rngLo').textContent = fmt(+L.value, 1); $('rngRo').textContent = fmt(+R.value, 1); $('rngHo').textContent = fmt(h, 1);
      var fa = f(a), fb = f(b), inside = a <= 3 && 3 <= b;
      var lo = inside ? 2 : Math.min(fa, fb), hi = Math.max(fa, fb);
      var endLo = Math.min(fa, fb);
      var xs = []; if (h >= 2) { var r = Math.sqrt(h - 2); [3 - r, 3 + r].forEach(function (x, i) { if (x >= a - 1e-9 && x <= b + 1e-9 && (i === 0 || r > 1e-9)) xs.push(x); }); }
      var pts = [[a, fa, 'f(' + fmt(a, 1) + ') = ' + fmt(fa), GO, 6, -10], [b, fb, 'f(' + fmt(b, 1) + ') = ' + fmt(fb), GO, 6, 16]];
      if (inside) pts.push([3, 2, 'vertex (3, 2)', CY, 8, 16]);
      xs.forEach(function (x) { pts.push([x, h, '', RD, 0, 0]); });
      var spec = { x: [-1.5, 7.5], y: [0, 20], k: 40, ky: 14, step: 1, ystep: 2,
        fns: [[f, GR, '5 5', null, null, 1.6], [f, CY, '', a, b, 3.2]],
        vlines: [[a, GO, '4 4', 1.4], [b, GO, '4 4', 1.4]],
        lines: [[0, h, RD, '6 4']], pts: pts };
      draw('rngFig', spec);
      $('rngRead').innerHTML = '<span class="lw">domain:</span> ' + fmt(a, 1) + ' ≤ x ≤ ' + fmt(b, 1) + '<br>' +
        '<span class="lw">vertex x = 3:</span> ' + (inside ? '<b>inside</b>, lowest value 2' : 'outside the domain') + '<br>' +
        '<span class="lw">ends only:</span> ' + fmt(endLo) + ' ≤ f(x) ≤ ' + fmt(hi) + '<br>' +
        '<span class="lw">true range:</span> <b>' + fmt(lo) + ' ≤ f(x) ≤ ' + fmt(hi) + '</b><br>' +
        '<span class="lw">test line y = ' + fmt(h, 1) + ':</span> cuts the graph <b>' + xs.length + '</b> time' + (xs.length === 1 ? '' : 's');
      var parts = [];
      var cls = 'ok';
      if (inside && endLo > 2 + 1e-9) { parts.push('Ends only gets the range wrong here: the vertex dips to 2.'); cls = 'no'; }
      else parts.push('Ends only happens to work for this domain.');
      if (xs.length >= 2) { parts.push('Not one-one: a horizontal line cuts it twice, so no inverse.'); cls = 'no'; }
      else if (!inside || Math.abs(a - 3) < 1e-9 || Math.abs(b - 3) < 1e-9) parts.push('With the vertex at an end or outside, no horizontal line can cut it twice: one-one.');
      else parts.push('Move the test line: somewhere it cuts twice.');
      verdict($('rngVerdict'), cls, parts.join('<br>'));
    }
    [L, R, H].forEach(function (s) { s.addEventListener('input', render); });
    render();
  })();

  /* ---------- Q2(e): the mirror for f, x ≥ 3 ---------- */
  (function () {
    if (!$('lab-inv2')) return;
    function f(x) { return (x - 3) * (x - 3) + 2; }
    function render(v) {
      var s = +v, g = function (x) { return 3 + s * Math.sqrt(x - 2); }, ok = s > 0;
      var spec = { x: [-1, 12], y: [-1, 12], k: 30, step: 2,
        lines: [[1, 0, GR, '5 5']],
        fns: [[f, CY, '', 3, 12, 3], [g, ok ? GO : RD, ok ? '' : '6 4', 2, 12, 2.8]],
        pts: [[5, 6, '(5, 6) on f', CY, -78, -8], [6, 5, '(6, 5)', GO, 8, 16], [6, g(6), ok ? '' : '(6, 1)', ok ? GO : RD, 8, 14]] };
      draw('inv2Fig', spec, [{ seg: [5, 6, 6, 5], col: WH, dash: '3 3', w: 1.4 }]);
      $('inv2Read').innerHTML = '<span class="lw">f(5) = 6, so the mirror image (6, 5) must be on f⁻¹</span><br>' +
        '<span class="lw">your choice at x = 6:</span> 3 ' + (ok ? '+' : M) + ' √4 = <b>' + fmt(g(6)) + '</b>';
      if (ok) verdict($('inv2Verdict'), 'ok', 'Lands on (6, 5): the mirror image of f in y = x. Outputs at least 3, matching the domain x ≥ 3.');
      else verdict($('inv2Verdict'), 'no', 'Gives (6, 1), not (6, 5). The ' + M + ' root is the inverse of the other half of the parabola, x ≤ 3.');
    }
    render(picks('inv2Picks', render));
  })();

  /* ---------- Q3: the order machine ---------- */
  (function () {
    if (!$('lab-ord')) return;
    function f(x) { return x * x - 2 * x - 1; }
    var route = '1';
    var stages = {
      '1': [['f(x)', f], [M + 'f(x)  (reflect in the x-axis)', function (x) { return -f(x); }], [M + 'f(x) + 4  (then up 4)', function (x) { return -f(x) + 4; }]],
      '2': [['f(x)', f], ['f(x) ' + M + ' 4  (down 4)', function (x) { return f(x) - 4; }], [M + '[f(x) ' + M + ' 4] = 4 ' + M + ' f(x)  (then reflect)', function (x) { return 4 - f(x); }]],
      '3': [['f(x)', f], ['f(x) + 4  (up 4)', function (x) { return f(x) + 4; }], [M + '[f(x) + 4] = ' + M + 'f(x) ' + M + ' 4  (then reflect)', function (x) { return -f(x) - 4; }]]
    };
    var S = $('ordS');
    function render() {
      var st = +S.value, cur = stages[route][st];
      $('ordSo').textContent = ['start', 'step 1', 'step 2'][st];
      var spec = { x: [-3, 5], y: [-8, 8], k: 34, ky: 17, step: 1, ystep: 2,
        fns: [[f, GR, '5 5', null, null, 1.6], [function (x) { return 4 - f(x); }, GO, '8 5', null, null, 2.4], [cur[1], CY, '', null, null, 3]] };
      draw('ordFig', spec);
      $('ordRead').innerHTML = '<span class="lw">now showing:</span> <b>y = ' + cur[0] + '</b><br><span class="lw">target (gold):</span> y = 4 ' + M + ' f(x)';
      if (st < 2) verdict($('ordVerdict'), 'in', 'Step on to finish the route.');
      else if (route === '3') verdict($('ordVerdict'), 'no', 'Misses the target by 8 everywhere: reflecting second flips the +4 into ' + M + '4. Same two steps, wrong order.');
      else verdict($('ordVerdict'), 'ok', 'On the target. ' + (route === '1' ? 'Reflect first, then translate up 4.' : 'Translating down 4 first works too, because the reflection then turns ' + M + '4 into +4.'));
    }
    route = picks('ordPicks', function (v) { route = v; S.value = 0; render(); });
    S.addEventListener('input', render);
    render();
  })();

  /* ---------- Q4: turn the line ---------- */
  (function () {
    if (!$('lab-disc')) return;
    function p(x) { return x * x + 3; }
    function D(k) { return k * k - 16; }
    var go = slider('discK', function (k) {
      var d = D(k), xs = [];
      if (d > 1e-9) xs = [(k - Math.sqrt(d)) / 2, (k + Math.sqrt(d)) / 2]; else if (Math.abs(d) <= 1e-9) xs = [k / 2];
      var pts = [[0, -1, '(0, ' + M + '1)', GR, 8, 14]];
      xs.forEach(function (x) { pts.push([x, p(x), '(' + fmt(x) + ', ' + fmt(p(x)) + ')', xs.length === 1 ? GN : CY, 8, -8]); });
      draw('discFig', { x: [-5, 5], y: [-4, 14], k: 30, ky: 15, step: 1, ystep: 2,
        fns: [[p, WH, '', null, null, 3]], lines: [[k, -1, CY, '']], pts: pts });
      var spec2 = { x: [-7, 7], y: [-18, 34], k: 20, ky: 6, step: 1, ystep: 4, noxy: true,
        fns: [[D, PU, '', null, null, 2.6]],
        pts: [[k, d, 'D = ' + fmt(d), d > 1e-9 ? GN : (Math.abs(d) <= 1e-9 ? GO : RD), 8, d > 0 ? 14 : -8], [-4, 0, '', WH, 0, 0], [4, 0, '', WH, 0, 0]],
        texts: [[6.7, 1.6, 'k', GR, 12], [0.6, 32, 'D', GR, 12, 'start'], [1.2, 26, 'D = k² ' + M + ' 16', PU, 11, 'start']] };
      draw('discD', spec2, [
        { seg: [-7, 0, -4, 0], col: GN, w: 5 }, { seg: [4, 0, 7, 0], col: GN, w: 5 }, { seg: [-4, 0, 4, 0], col: RD, dash: '6 5', w: 4 },
        { seg: [k, 0, k, d], col: GR, dash: '3 3', w: 1.2 }]);
      $('discRead').innerHTML = '<span class="lw">quadratic:</span> x² ' + (Math.abs(k) < 1e-9 ? '' : (k > 0 ? M + ' ' : '+ ') + (Math.abs(Math.abs(k) - 1) < 1e-9 ? '' : fmt(Math.abs(k))) + 'x ') + '+ 4 = 0<br>' +
        '<span class="lw">b² ' + M + ' 4ac:</span> (' + fmt(-k) + ')² ' + M + ' 16 = <b>' + fmt(d) + '</b>';
      if (d > 1e-9) verdict($('discVerdict'), 'ok', 'D &gt; 0: two distinct points. k is outside ' + M + '4 and 4 (the green parts).');
      else if (Math.abs(d) <= 1e-9) verdict($('discVerdict'), 'in', 'D = 0: the line is a tangent. k = ' + fmt(k) + ', touching at (' + fmt(k / 2) + ', ' + fmt(p(k / 2)) + ').');
      else verdict($('discVerdict'), 'no', 'D &lt; 0: the line misses the curve. k is between ' + M + '4 and 4 (the red part).');
    }, function (v) { return fmt(v); });
    go();
  })();

  /* ---------- Q5: find the touching line ---------- */
  (function () {
    if (!$('lab-tan')) return;
    var slip = false, kk = 0.5;
    function c(x) { return -2 / x; }
    function render() {
      var k = kk, d = 9 - 8 * k, xs = [];
      var spec = { x: [-6, 3], y: [-4, 8], k: 34, ky: 26, step: 1, ystep: 2, fns: [[c, WH, '', null, null, 3]], lines: [[k, 3, CY, '']], pts: [] };
      if (slip) {
        spec.lines.push([-2, 0, RD, '6 4']);
        var xl = -3 / (k + 2); spec.pts.push([xl, -2 * xl, '', RD, 0, 0]);
        draw('tanFig', spec);
        $('tanRead').innerHTML = '<span class="lw">the slip:</span> kx + 3 = ' + M + '2x<br><span class="lw">gives:</span> (k + 2)x = ' + M + '3, <b>not a quadratic</b>';
        verdict($('tanVerdict'), 'no', 'Writing ' + M + '2/x as ' + M + '2x turns the curve into the red straight line. There is no quadratic, so b² ' + M + ' 4ac has nothing to test. This is the June 2023 examiner-report error.');
        return;
      }
      if (d > 1e-9) xs = [(-3 - Math.sqrt(d)) / (2 * k), (-3 + Math.sqrt(d)) / (2 * k)]; else if (Math.abs(d) <= 1e-9) xs = [-3 / (2 * k)];
      xs.forEach(function (x) { spec.pts.push([x, c(x), '(' + fmt(x) + ', ' + fmt(c(x)) + ')', xs.length === 1 ? GN : CY, 8, -8]); });
      draw('tanFig', spec);
      $('tanRead').innerHTML = '<span class="lw">multiply by x:</span> ' + (function (f) { return f === '1' ? '' : f.indexOf('/') > 0 ? '(' + f + ')' : f; })(frac(k, 8)) + 'x² + 3x + 2 = 0<br>' +
        '<span class="lw">b² ' + M + ' 4ac:</span> 9 ' + M + ' 8(' + frac(k, 8) + ') = <b>' + fmt(d, 3) + '</b>';
      if (d > 1e-9) verdict($('tanVerdict'), 'in', 'D &gt; 0: the line cuts the curve twice. Make k bigger.');
      else if (Math.abs(d) <= 1e-9) verdict($('tanVerdict'), 'ok', 'D = 0 at k = 9/8: the line touches at (' + M + '4/3, 3/2). That is the answer.');
      else verdict($('tanVerdict'), 'no', 'D &lt; 0: no real roots, so the line misses the curve. Make k smaller.');
    }
    slider('tanK', function (k) { kk = k; render(); }, function (v) { return frac(v, 8); })();
    $('tanSlip').addEventListener('click', function () { slip = !slip; this.setAttribute('aria-pressed', slip ? 'true' : 'false'); render(); });
  })();

  /* ---------- Q6: move the midpoint ---------- */
  (function () {
    if (!$('lab-chord')) return;
    var X = $('chX'), Y = $('chY');
    function grad(dy, dx) { if (Math.abs(dx) < 1e-9) return null; return frac(dy / dx, 4); }
    function render() {
      var mx = +X.value, my = +Y.value; $('chXo').textContent = fmt(mx, 1); $('chYo').textContent = fmt(my, 1);
      var cx = 2, cy = -3, dx = mx - cx, dy = my - cy, dd = dx * dx + dy * dy;
      var spec = { x: [-4, 8], y: [-9, 3], k: 30, step: 2, circles: [[cx, cy, 5, WH, '']], pts: [[cx, cy, 'C(2, ' + M + '3)', WH, 8, 16]] };
      if (dd >= 25 - 1e-9) {
        spec.pts.push([mx, my, 'M', RD, 8, -8]); draw('chordFig', spec);
        $('chRead').innerHTML = '<span class="lw">CM =</span> ' + fmt(Math.sqrt(dd)) + ' (radius 5)';
        verdict($('chVerdict'), 'no', 'M is not inside the circle, so it cannot be the midpoint of a chord. Move it inward.');
        return;
      }
      if (dd < 1e-9) {
        spec.pts.push([mx, my, 'M = C', CY, 8, -8]); draw('chordFig', spec, [{ seg: [cx - 5, cy, cx + 5, cy], col: CY }]);
        $('chRead').innerHTML = 'M is the center: every chord through it is a diameter.';
        verdict($('chVerdict'), 'in', 'Any diameter has its midpoint at C. Move M off the center to see the rule.');
        return;
      }
      var len = Math.sqrt(dd), ux = -dy / len, uy = dx / len, half = Math.sqrt(25 - dd);
      var A = [mx + ux * half, my + uy * half], B = [mx - ux * half, my - uy * half];
      spec.pts.push([mx, my, 'M(' + fmt(mx, 1) + ', ' + fmt(my, 1) + ')', GO, 8, -10], [A[0], A[1], 'A', CY, 6, -6], [B[0], B[1], 'B', CY, 6, 14]);
      draw('chordFig', spec, [{ seg: [cx, cy, mx, my], col: GO, w: 2.4 }, { seg: [A[0], A[1], B[0], B[1]], col: CY, w: 3 }, { right: [mx, my, cx, cy, A[0], A[1]], col: GO }]);
      var gCM = grad(dy, dx), gAB = grad(-dx, dy);
      $('chRead').innerHTML = '<span class="lw">gradient CM:</span> <b>' + (gCM == null ? 'undefined (vertical)' : gCM) + '</b><br>' +
        '<span class="lw">gradient AB:</span> <b>' + (gAB == null ? 'undefined (vertical)' : gAB) + '</b><br>' +
        '<span class="lw">A</span> (' + fmt(A[0]) + ', ' + fmt(A[1]) + ') &nbsp;<span class="lw">B</span> (' + fmt(B[0]) + ', ' + fmt(B[1]) + ')';
      var both = gCM != null && gAB != null && Math.abs(dx) > 1e-9 && Math.abs(dy) > 1e-9;
      verdict($('chVerdict'), 'ok', both ? 'Gradients multiply to ' + M + '1: CM is perpendicular to the chord, wherever M is.' : 'One line is horizontal and the other vertical: still perpendicular.');
    }
    [X, Y].forEach(function (s) { s.addEventListener('input', render); });
    render();
  })();

  /* ---------- Q7: measure the radius ---------- */
  (function () {
    if (!$('lab-semi')) return;
    var P = [1, 1], R = [7, 3], C = [4, 2], r = Math.sqrt(10), base = Math.atan2(3, -1) * 180 / Math.PI, mode = '1';
    var S = $('semiQ');
    function render() {
      var ang = (base + (+S.value)) * Math.PI / 180, Q = [C[0] + r * Math.cos(ang), C[1] + r * Math.sin(ang)];
      $('semiQo').textContent = (+S.value === 0 ? 'Q(3, 5)' : 'moved');
      var ok = mode === '1', rad = ok ? r : 3;
      var near = Math.hypot(Q[0] - P[0], Q[1] - P[1]) < 0.15 || Math.hypot(Q[0] - R[0], Q[1] - R[1]) < 0.15;
      var spec = { x: [-1, 9], y: [-2, 6], k: 38, step: 1,
        circles: [[C[0], C[1], rad, ok ? CY : RD, ok ? '' : '6 5']],
        pts: [[P[0], P[1], 'P(1, 1)', WH, -58, 14], [R[0], R[1], 'R(7, 3)', WH, 8, -8], [C[0], C[1], 'C(4, 2)', GO, -64, -6], [Q[0], Q[1], +S.value === 0 ? 'Q(3, 5)' : 'Q', WH, 8, -8]] };
      var extra = [{ seg: [P[0], P[1], R[0], R[1]], col: GR, dash: '6 5', w: 1.6 }, { seg: [P[0], P[1], Q[0], Q[1]], col: WH, w: 1.8 }, { seg: [Q[0], Q[1], R[0], R[1]], col: WH, w: 1.8 }];
      if (!near) extra.push({ right: [Q[0], Q[1], P[0], P[1], R[0], R[1]], col: GO });
      if (ok) { extra.push({ seg: [4, 2, 7, 2], col: GO, w: 3 }, { seg: [7, 2, 7, 3], col: GO, w: 3 }, { seg: [4, 2, 7, 3], col: '#ff9b6b', w: 3 }); spec.texts = [[5.5, 1.55, 'across 3', GO, 12], [7.15, 2.35, 'up 1', GO, 12, 'start']]; }
      else { extra.push({ seg: [4, 2, 7, 2], col: RD, w: 3 }); spec.texts = [[5.5, 1.55, '(7 ' + M + ' 1) ÷ 2 = 3', RD, 12]]; }
      draw('semiFig', spec, extra);
      var d = function (A) { return Math.pow(A[0] - C[0], 2) + Math.pow(A[1] - C[1], 2); };
      var mPQ = (Q[1] - P[1]) / (Q[0] - P[0]), mQR = (R[1] - Q[1]) / (R[0] - Q[0]);
      $('semiRead').innerHTML = (ok ? '<span class="lw">r² = 3² + 1² =</span> <b>10</b>' : '<span class="lw">r² = 3² =</span> <b>9</b>') + '<br>' +
        '<span class="lw">distance² from C to P, Q, R:</span> ' + fmt(d(P)) + ', ' + fmt(d(Q)) + ', ' + fmt(d(R)) + '<br>' +
        (near ? '<span class="lw">Q is on top of P or R, so there is no triangle.</span>' :
        '<span class="lw">gradient PQ × gradient QR:</span> <b>' + fmt(mPQ * mQR, 3) + '</b>');
      if (ok) verdict($('semiVerdict'), 'ok', 'Every point is 10 from C (squared): the circle goes through P, Q and R. Move Q: the angle at Q stays 90°.');
      else verdict($('semiVerdict'), 'no', 'r² = 9 misses all three points (they are all 10 from C, squared). "Across only" leaves out the up 1, because P and R are at different heights.');
    }
    mode = picks('semiPicks', function (v) { mode = v; render(); });
    S.addEventListener('input', render);
    render();
  })();

  /* ---------- Q8: the function machine ---------- */
  (function () {
    if (!$('lab-mach')) return;
    function f(x) { return 2 * x - 3; }
    function g(x) { return x * x + 1; }
    var order = 'gf', xv = 2;
    function render() {
      var first = order === 'gf' ? f : g, second = order === 'gf' ? g : f;
      var n1 = order === 'gf' ? 'f: 2x ' + M + ' 3' : 'g: x² + 1', n2 = order === 'gf' ? 'g: x² + 1' : 'f: 2x ' + M + ' 3';
      var mid = first(xv), out = second(mid);
      $('machRow').innerHTML = '<span class="val">' + fmt(xv) + '</span><span class="arr">→</span><span class="box">' + n1 + '</span><span class="arr">→</span><span class="val">' + fmt(mid) + '</span><span class="arr">→</span><span class="box">' + n2 + '</span><span class="arr">→</span><span class="val">' + fmt(out) + '</span>';
      var comp = function (x) { return second(first(x)); };
      var sol = order === 'gf' ? [0, 3] : [-Math.sqrt(5.5), Math.sqrt(5.5)];
      var pts = sol.map(function (x) { return [x, 10, 'x = ' + fmt(x), GN, -18, -10]; });
      pts.push([xv, out, '', CY, 0, 0]);
      draw('machFig', { x: [-3, 5], y: [-2, 20], k: 36, ky: 13, step: 1, ystep: 2,
        fns: [[comp, CY, '', null, null, 3]], lines: [[0, 10, GO, '6 4']], pts: pts });
      $('machRead').innerHTML = order === 'gf'
        ? '<span class="lw">gf(x) = (2x ' + M + ' 3)² + 1</span><br><span class="lw">gf(x) = 10 at</span> <b>x = 0 and x = 3</b>'
        : '<span class="lw">fg(x) = 2x² ' + M + ' 1</span><br><span class="lw">fg(x) = 10 at</span> <b>x = ±' + fmt(Math.sqrt(5.5)) + '</b> (a different answer: order matters)';
    }
    order = picks('machPicks', function (v) { order = v; render(); });
    slider('machX', function (v) { xv = v; render(); })();
  })();

  /* ---------- Q9: the mirror for h ---------- */
  (function () {
    if (!$('lab-inv')) return;
    function h(x) { return (2 * x + 3) / (x - 4); }
    function hi(x) { return (4 * x + 3) / (x - 2); }
    slider('invA', function (a) {
      var b = h(a);
      var spec = { x: [-1, 14], y: [-1, 14], k: 26, step: 2,
        vlines: [[4, GR, '4 4', 1.2], [2, GO, '5 4', 2]],
        lines: [[1, 0, GR, '5 5'], [0, 2, GR, '4 4'], [0, 4, GO, '4 4']],
        fns: [[h, CY, '', 4.0001, 14, 3], [hi, GO, '', 2.0001, 14, 3]],
        pts: [[a, b, '(' + fmt(a) + ', ' + fmt(b) + ')', CY, 8, -8], [b, a, '(' + fmt(b) + ', ' + fmt(a) + ')', GO, b > 10 ? -78 : 8, 16]],
        texts: [[12.6, 13.2, 'y = x', GR, 11], [12.2, 1.4, 'y = 2', GR, 11], [12.2, 4.5, 'y = 4', GO, 11]] };
      draw('invFig', spec, [{ seg: [a, b, b, a], col: WH, dash: '3 3', w: 1.4 }]);
      $('invRead').innerHTML = '<span class="lw">on h:</span> h(' + fmt(a) + ') = <b>' + fmt(b) + '</b><br>' +
        '<span class="lw">on h⁻¹:</span> h⁻¹(' + fmt(b) + ') = <b>' + fmt(hi(b)) + '</b> (back to where you started)<br>' +
        '<span class="lw">h stays above y = 2, so h⁻¹ only takes inputs x &gt; 2 (gold line x = 2)</span>';
    })();
  })();
})();
