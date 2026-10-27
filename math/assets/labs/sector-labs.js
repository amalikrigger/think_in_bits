/* Circular measure labs and figures, shared by the 1.4 decks (and later Trigonometry and the booklets).
   No dependencies. Instance-based: any number per page, no fixed ids.

   SectorKit.figure(svgOrId, spec)  draws a static sector figure, scaled to fit.
     spec: { r: radius in units, t: angle in radians, k: px per unit (default fits 200px),
             rot: angle of the first radius in radians (default 0, pointing right),
             O, A, B: point labels (center, end of first radius, end of second radius),
             rLabel, tLabel, sLabel: text for the radius, the angle and the arc,
             chord: true draws AB, half: true draws the line of symmetry with a right-angle box,
             shade: 'sector' | 'segment' | 'none', arcCol, chordCol, extra: [[x, y, text, col]] in units from O }
   Labs, from markup:
     <div class="lab sector" data-lab="radian" data-r="3" data-t="1"></div>     arc measured in radii; θ in rad and degrees
     <div class="lab sector" data-lab="sector" data-r="9" data-t="2.0944"></div>  s = rθ, A = ½r²θ, perimeter, degrees mistake
   Each lab exposes box.__set({r, t, deg}) for scripted checks; it returns the readout text. */
window.SectorKit = (function () {
  'use strict';
  var CY = '#00e5ff', W = '#ffffff', GR = '#b0b0b0', GO = '#ffc46b', RD = '#ff6b6b', TAU = 2 * Math.PI;
  var FONT = 'font-family="JetBrains Mono, monospace" font-weight="700"';
  function el(x) { return typeof x === 'string' ? document.getElementById(x) : x; }
  function sf(v, n) { /* n significant figures, trailing zeros kept for n = 3 readouts */
    if (!isFinite(v)) return '∞'; if (v === 0) return '0';
    var d = Math.max(0, (n || 3) - 1 - Math.floor(Math.log10(Math.abs(v))));
    return v.toFixed(Math.min(d, 6));
  }
  function gcd(a, b) { while (b) { var t = a % b; a = b; b = t; } return a; }
  function piFrac(t) { /* 'π/6', '2π/3', '2π' when t is a multiple of π/12, else null */
    var n = Math.round(t / (Math.PI / 12)); if (n <= 0 || Math.abs(n * Math.PI / 12 - t) > 1e-6) return null;
    var g = gcd(n, 12), a = n / g, b = 12 / g;
    return (a === 1 ? '' : a) + 'π' + (b === 1 ? '' : '/' + b);
  }
  function at(cx, cy, R, a) { return [cx + R * Math.cos(a), cy - R * Math.sin(a)]; }
  function arcPath(cx, cy, R, a0, a1) {
    if (a1 - a0 >= TAU - 1e-6) { var m = at(cx, cy, R, a0 + Math.PI), s0 = at(cx, cy, R, a0);
      return 'M' + s0[0].toFixed(2) + ',' + s0[1].toFixed(2) + ' A' + R + ',' + R + ' 0 1 0 ' + m[0].toFixed(2) + ',' + m[1].toFixed(2) + ' A' + R + ',' + R + ' 0 1 0 ' + s0[0].toFixed(2) + ',' + s0[1].toFixed(2); }
    var p = at(cx, cy, R, a0), q = at(cx, cy, R, a1);
    return 'M' + p[0].toFixed(2) + ',' + p[1].toFixed(2) + ' A' + R + ',' + R + ' 0 ' + (a1 - a0 > Math.PI ? 1 : 0) + ' 0 ' + q[0].toFixed(2) + ',' + q[1].toFixed(2);
  }
  function txt(x, y, s, col, size, anchor) {
    return '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" ' + FONT + ' font-size="' + (size || 13) + '" fill="' + col + '" text-anchor="' + (anchor || 'middle') + '" dominant-baseline="middle">' + s + '</text>';
  }
  function line(p, q, col, w, dash) {
    return '<line x1="' + p[0].toFixed(2) + '" y1="' + p[1].toFixed(2) + '" x2="' + q[0].toFixed(2) + '" y2="' + q[1].toFixed(2) + '" stroke="' + col + '" stroke-width="' + (w || 2.4) + '"' + (dash ? ' stroke-dasharray="' + dash + '"' : '') + ' stroke-linecap="round"/>';
  }
  /* everything is drawn round (0, 0), then the viewBox is fitted to what was drawn */
  function figure(target, f) {
    var svg = el(target); if (!svg) return;
    var R = f.k ? f.r * f.k : 160, a0 = f.rot || 0, a1 = a0 + f.t, s = '';
    var O = [0, 0], A = at(0, 0, R, a0), B = at(0, 0, R, a1), shade = f.shade || 'sector';
    var arcCol = f.arcCol || CY, chordCol = f.chordCol || GO;
    if (shade === 'sector') s += '<path d="M0,0 L' + A[0].toFixed(2) + ',' + A[1].toFixed(2) + ' ' + arcPath(0, 0, R, a0, a1).replace(/^M[^A]+/, '') + ' Z" fill="rgba(0,229,255,0.10)"/>';
    if (shade === 'segment') s += '<path d="' + arcPath(0, 0, R, a0, a1) + ' Z" fill="rgba(255,196,107,0.16)"/>';
    s += line(O, A, W) + line(O, B, W);
    s += '<path d="' + arcPath(0, 0, R, a0, a1) + '" fill="none" stroke="' + arcCol + '" stroke-width="3.4" stroke-linecap="round"/>';
    if (f.chord) s += line(A, B, chordCol, 2.8);
    var am = (a0 + a1) / 2, M = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
    if (f.half) {
      s += line(O, M, GR, 2, '5 4');
      var u = [M[0] / Math.hypot(M[0], M[1]), M[1] / Math.hypot(M[0], M[1])], v = [(A[0] - M[0]) / Math.hypot(A[0] - M[0], A[1] - M[1]), (A[1] - M[1]) / Math.hypot(A[0] - M[0], A[1] - M[1])], d = 10;
      s += '<polyline points="' + [[M[0] - u[0] * d, M[1] - u[1] * d], [M[0] - u[0] * d + v[0] * d, M[1] - u[1] * d + v[1] * d], [M[0] + v[0] * d, M[1] + v[1] * d]].map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ') + '" fill="none" stroke="' + GO + '" stroke-width="2"/>';
    }
    /* angle mark at the center */
    var ar = Math.min(f.half ? 54 : 34, R * 0.32);
    s += '<path d="' + arcPath(0, 0, ar, a0, a1) + '" fill="none" stroke="' + GO + '" stroke-width="2"/>';
    if (f.tLabel) { var tp = at(0, 0, ar + (f.t < 0.7 ? 34 : 20), f.half ? a0 + f.t * 0.82 : am); s += txt(tp[0], tp[1], f.tLabel, GO, 14); }
    if (f.rLabel) { var rp = at(0, 0, R / 2, a0), off = at(0, 0, 14, a0 - Math.PI / 2); s += txt(rp[0] + off[0], rp[1] + off[1], f.rLabel, W, 13); }
    if (f.sLabel) { var sp = at(0, 0, R + 26, am); s += txt(sp[0], sp[1], f.sLabel, arcCol, 14); }
    if (f.cLabel && f.chord) { var cp = [M[0] - M[0] / Math.hypot(M[0], M[1]) * 24, M[1] - M[1] / Math.hypot(M[0], M[1]) * 24]; s += txt(cp[0], cp[1], f.cLabel, chordCol, 13); }
    function lab(p, t, dir) { var q = at(0, 0, 18, dir); return txt(p[0] + q[0], p[1] + q[1], t, W, 14); }
    if (f.O) s += lab(O, f.O, am + Math.PI);
    if (f.A) s += lab(A, f.A, a0 - (f.t < 1 ? 0.6 : 0));
    if (f.B) s += lab(B, f.B, a1 + (f.t < 1 ? 0.6 : 0));
    (f.extra || []).forEach(function (e) { var k = f.k || 160 / f.r; s += txt(e[0] * k, -e[1] * k, e[2], e[3] || GR, e[4] || 13); });
    s += '<circle cx="0" cy="0" r="3.5" fill="' + W + '"/>';
    /* fit: center, both ends, arc samples, label room */
    var xs = [0, A[0], B[0]], ys = [0, A[1], B[1]];
    for (var i = 0; i <= 24; i++) { var p = at(0, 0, R, a0 + f.t * i / 24); xs.push(p[0]); ys.push(p[1]); }
    var pad = 42, x0 = Math.min.apply(null, xs) - pad, x1 = Math.max.apply(null, xs) + pad, y0 = Math.min.apply(null, ys) - pad, y1 = Math.max.apply(null, ys) + pad;
    svg.setAttribute('viewBox', x0.toFixed(0) + ' ' + y0.toFixed(0) + ' ' + (x1 - x0).toFixed(0) + ' ' + (y1 - y0).toFixed(0));
    svg.innerHTML = s;
  }
  return { figure: figure, sf: sf, piFrac: piFrac, arcPath: arcPath, at: at, txt: txt, line: line, CY: CY, W: W, GR: GR, GO: GO, RD: RD, TAU: TAU };
})();

(function () {
  'use strict';
  var K = window.SectorKit, CY = K.CY, W = K.W, GR = K.GR, GO = K.GO, RD = K.RD, TAU = K.TAU;
  [].slice.call(document.querySelectorAll('.lab.sector')).forEach(function (box, n) {
    var kind = box.getAttribute('data-lab') || 'sector';
    var st = { r: +(box.getAttribute('data-r') || 3), t: +(box.getAttribute('data-t') || 1), deg: false };
    var uid = 'sk' + n, isRad = kind === 'radian';
    var snaps = isRad ? [['1 rad', 1], ['π/2', Math.PI / 2], ['π', Math.PI], ['3π/2', 1.5 * Math.PI], ['2π', TAU]]
                      : [['π/6', Math.PI / 6], ['1 rad', 1], ['2π/3', 2 * Math.PI / 3], ['π', Math.PI], ['3π/2', 1.5 * Math.PI]];
    box.innerHTML = '<svg class="fig" viewBox="0 0 320 320" role="img" aria-label="' + (isRad
        ? 'A circle with a sector of angle theta; tick marks show how many radii fit along the arc'
        : 'A sector of radius r and angle theta, with its arc length, area and perimeter') + '"></svg>' +
      '<div class="panel">' +
      '<label for="' + uid + '-r">radius r = <span class="cval sk-rv"></span> cm</label>' +
      '<input type="range" id="' + uid + '-r" class="sk-r" min="1" max="10" step="0.5" value="' + st.r + '">' +
      '<label for="' + uid + '-t">angle θ = <span class="cval sk-tv"></span> rad</label>' +
      '<input type="range" id="' + uid + '-t" class="sk-t" min="0.05" max="' + TAU.toFixed(4) + '" step="0.01" value="' + st.t + '">' +
      '<div class="picks sk-snap" role="group" aria-label="Set the angle">' + snaps.map(function (p) { return '<button type="button" data-t="' + p[1] + '">' + p[0] + '</button>'; }).join('') + '</div>' +
      (isRad ? '' : '<button type="button" class="toggle sk-deg" aria-pressed="false">Type θ in degrees by mistake</button>') +
      '<div class="read sk-read" aria-live="polite"></div>' +
      '<div class="verdict ok sk-v"></div></div>';
    var svg = box.querySelector('svg'), read = box.querySelector('.sk-read'), verdict = box.querySelector('.sk-v');
    var rIn = box.querySelector('.sk-r'), tIn = box.querySelector('.sk-t'), degBtn = box.querySelector('.sk-deg');
    var C = 160, PX = isRad ? 0 : 14; /* radian lab: fixed drawing size; sector lab: 14 px per cm, true to scale */

    function draw() {
      var r = st.r, t = Math.min(Math.max(st.t, 0.05), TAU), R = isRad ? 112 : r * PX, s = '', deg = t * 180 / Math.PI, pf = K.piFrac(t);
      box.querySelector('.sk-rv').textContent = K.sf(r, 3).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
      box.querySelector('.sk-tv').textContent = t.toFixed(2) + (pf ? ' = ' + pf : '');
      /* the full circle, faint, then the sector */
      s += '<circle cx="' + C + '" cy="' + C + '" r="' + R + '" fill="none" stroke="' + GR + '" stroke-opacity="0.35" stroke-width="1.5" stroke-dasharray="4 5"/>';
      var A = K.at(C, C, R, 0), B = K.at(C, C, R, t);
      s += '<path d="M' + C + ',' + C + ' L' + A[0].toFixed(2) + ',' + A[1].toFixed(2) + ' ' + K.arcPath(C, C, R, 0, t).replace(/^M[^A]+/, '') + ' Z" fill="rgba(0,229,255,0.12)"/>';
      s += K.line([C, C], A, W) + K.line([C, C], B, W);
      s += '<path d="' + K.arcPath(C, C, R, 0, t) + '" fill="none" stroke="' + CY + '" stroke-width="4" stroke-linecap="round"/>';
      var ar = Math.min(30, R * 0.4);
      s += '<path d="' + K.arcPath(C, C, ar, 0, t) + '" fill="none" stroke="' + GO + '" stroke-width="2"/>';
      if (isRad) {
        /* a tick every one radius of arc: arc length measured in radii is the angle in radians */
        for (var k = 1; k <= 6; k++) {
          var p = K.at(C, C, R - 9, k), q = K.at(C, C, R + 9, k), on = k <= t + 1e-9, col = on ? GO : GR;
          s += K.line(p, q, col, on ? 3 : 1.5) + K.txt(K.at(C, C, R + 24, k)[0], K.at(C, C, R + 24, k)[1], k + 'r', col, 12);
        }
        s += K.txt(C + R / 2, C + 14, 'r', W, 13);
      } else {
        s += K.txt(C + R / 2, C + 14, K.sf(r, 3).replace(/\.0+$/, ''), W, 12);
      }
      var lp = K.at(C, C, ar + 16, t / 2); s += K.txt(lp[0], lp[1], 'θ', GO, 14);
      s += '<circle cx="' + C + '" cy="' + C + '" r="3.5" fill="' + W + '"/>';
      svg.innerHTML = s;

      var arc = r * t, area = 0.5 * r * r * t, per = 2 * r + arc, frac = t / TAU, html, v, ok = true;
      if (isRad) {
        html = '<span class="lw">θ =</span> <b>' + t.toFixed(3) + ' rad</b> <span class="lw">=</span> ' + deg.toFixed(1) + '°<br>' +
          '<span class="lw">arc =</span> θ × r = ' + t.toFixed(3) + ' × ' + r + ' = <b>' + K.sf(arc, 3) + ' cm</b><br>' +
          '<span class="lw">arc ÷ r =</span> ' + t.toFixed(3) + ' <span class="lw">for every r: the angle counts radii</span><br>' +
          '<span class="lw">fraction of a full turn =</span> θ ÷ 2π = ' + frac.toFixed(3);
        if (Math.abs(t - 1) < 0.006) v = 'The arc is exactly one radius long. That angle is 1 radian, about 57.3°.';
        else if (Math.abs(t - Math.PI) < 0.006) v = 'Half a turn. The arc is π radii (about 3.14) long, so 180° = π radians.';
        else if (Math.abs(t - TAU) < 0.006) v = 'A full turn. The circumference 2πr is 2π radii, so 360° = 2π radians.';
        else v = 'The angle in radians is how many radii fit along the arc: here ' + t.toFixed(2) + '.';
      } else if (st.deg) {
        var wrong = 0.5 * r * r * deg, whole = Math.PI * r * r;
        html = '<span class="lw">θ =</span> ' + t.toFixed(3) + ' rad, but typed as <b class="bad">' + deg.toFixed(1) + '</b><br>' +
          '<span class="lw">½r²θ with degrees =</span> ½ × ' + r + '² × ' + deg.toFixed(1) + ' = <b class="bad">' + K.sf(wrong, 3) + ' cm²</b><br>' +
          '<span class="lw">the whole circle πr² =</span> ' + K.sf(whole, 3) + ' cm²<br>' +
          '<span class="lw">the real sector area =</span> <b>' + K.sf(area, 3) + ' cm²</b>';
        v = 'The degrees answer is ' + (wrong / whole).toFixed(1) + ' times the whole circle. Impossible: s = rθ and A = ½r²θ need θ in radians.';
        ok = false;
      } else {
        html = '<span class="lw">arc s = rθ =</span> ' + r + ' × ' + t.toFixed(3) + ' = <b>' + K.sf(arc, 3) + ' cm</b><br>' +
          '<span class="lw">area A = ½r²θ =</span> ½ × ' + r + '² × ' + t.toFixed(3) + ' = <b>' + K.sf(area, 3) + ' cm²</b><br>' +
          '<span class="lw">perimeter = r + r + s =</span> <b>' + K.sf(per, 3) + ' cm</b><br>' +
          '<span class="lw">fraction of the circle =</span> θ ÷ 2π = ' + frac.toFixed(3);
        if (t > TAU - 0.006) v = 'A full turn: the whole circle, area πr². The two radii lie on top of each other, so the edge is just the circumference 2πr.';
        else v = pf ? 'θ = ' + pf + ' is ' + Math.round(deg) + '°, which is ' + frac.toFixed(3) + ' of the circle.' : 'θ is ' + deg.toFixed(1) + '°, which is ' + frac.toFixed(3) + ' of the circle.';
      }
      read.innerHTML = html; verdict.textContent = v;
      verdict.classList.toggle('ok', ok); verdict.classList.toggle('no', !ok);
      if (degBtn) { degBtn.setAttribute('aria-pressed', String(st.deg)); degBtn.textContent = st.deg ? 'Back to radians' : 'Type θ in degrees by mistake'; }
      rIn.value = st.r; tIn.value = t;
    }
    rIn.addEventListener('input', function () { st.r = +rIn.value; draw(); });
    tIn.addEventListener('input', function () { st.t = +tIn.value; draw(); });
    [].forEach.call(box.querySelectorAll('.sk-snap button'), function (b) { b.addEventListener('click', function () { st.t = +b.getAttribute('data-t'); draw(); }); });
    if (degBtn) degBtn.addEventListener('click', function () { st.deg = !st.deg; draw(); });
    box.__set = function (o) { Object.keys(o).forEach(function (k) { if (k in st) st[k] = o[k]; }); draw(); return read.textContent + ' | ' + verdict.textContent; };
    draw();
  });
})();
