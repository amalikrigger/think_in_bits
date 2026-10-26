/* Circle geometry labs, shared by the 1.3 Session 4 deck and Booklet 3.
   Load after KaTeX and meet-labs.js (uses MeetKit.figure for the grid). Instance-based: any number per page, no fixed ids.
   GeoKit.overlay(svgOrId, spec, items)  draws extra pieces on a MeetKit.figure with the same spec:
       items: [{seg:[x1,y1,x2,y2], col, dash, w}, {right:[vx,vy, ax,ay, bx,by], col}]  (right = right-angle box at the vertex)
   Labs, from markup:
     <div class="lab geo" data-geo="chord" data-a="1" data-b="5"></div>       drag A and B round the circle x² + y² = 25
     <div class="lab geo" data-geo="semi" data-p="2"></div>                    drag P round the circle; AB is a diameter
   Points snap to the 12 whole-number points on x² + y² = 25, so every gradient is an exact fraction.
   data-a, data-b, data-p are indexes into that list (0 to 11). Each lab exposes box.__set({a, b, p}) for scripted checks. */
window.GeoKit = (function () {
  'use strict';
  var M = '−';
  function el(x) { return typeof x === 'string' ? document.getElementById(x) : x; }
  function map(f) {
    var P = 24, k = f.k, H = 2 * P + (f.y[1] - f.y[0]) * k;
    return { px: function (v) { return P + (v - f.x[0]) * k; }, py: function (v) { return H - P - (v - f.y[0]) * k; }, k: k };
  }
  function overlay(target, f, items) {
    var svg = el(target); if (!svg) return; var m = map(f), s = '';
    items.forEach(function (it) {
      if (it.seg) { var g = it.seg; s += '<line x1="' + m.px(g[0]) + '" y1="' + m.py(g[1]) + '" x2="' + m.px(g[2]) + '" y2="' + m.py(g[3]) + '" stroke="' + it.col + '" stroke-width="' + (it.w || 2.6) + '"' + (it.dash ? ' stroke-dasharray="' + it.dash + '"' : '') + ' stroke-linecap="round"/>'; }
      if (it.right) s += rightBox(m, it.right, it.col, it.size);
    });
    svg.insertAdjacentHTML('beforeend', s);
  }
  /* small square at vertex V, along unit directions to A and B (in grid units, drawn in pixels) */
  function rightBox(m, r, col, size) {
    var vx = r[0], vy = r[1], ux = r[2] - vx, uy = r[3] - vy, wx = r[4] - vx, wy = r[5] - vy;
    var lu = Math.hypot(ux, uy), lw = Math.hypot(wx, wy); if (!lu || !lw) return '';
    var d = (size || 11) / m.k; ux = ux / lu * d; uy = uy / lu * d; wx = wx / lw * d; wy = wy / lw * d;
    var p = [[vx + ux, vy + uy], [vx + ux + wx, vy + uy + wy], [vx + wx, vy + wy]].map(function (q) { return m.px(q[0]).toFixed(1) + ',' + m.py(q[1]).toFixed(1); });
    return '<polyline points="' + p.join(' ') + '" fill="none" stroke="' + (col || '#ffc46b') + '" stroke-width="2"/>';
  }
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = a % b; a = b; b = t; } return a || 1; }
  function frac(n, d) { /* exact fraction as text, real minus sign; null when d = 0 */
    if (d === 0) return null; if (d < 0) { n = -n; d = -d; } var g = gcd(n, d); n /= g; d /= g;
    var s = d === 1 ? String(Math.abs(n)) : Math.abs(n) + '/' + d; return (n < 0 ? M : '') + s;
  }
  function num(v) { return v < 0 ? M + (-v) : String(v); }
  function pt(p) { return '(' + num(p[0]) + ', ' + num(p[1]) + ')'; }
  function half(v) { return v % 2 === 0 ? num(v / 2) : (v < 0 ? M : '') + Math.abs(v) + '/2'; }
  return { overlay: overlay, rightBox: rightBox, map: map, frac: frac, num: num, pt: pt, half: half, M: M };
})();

(function () {
  'use strict';
  var G = window.GeoKit, F = window.MeetKit && window.MeetKit.figure, M = G.M;
  if (!F) return;
  /* the 12 whole-number points on x² + y² = 25, going round anticlockwise from (5, 0) */
  var PTS = [[5, 0], [4, 3], [3, 4], [0, 5], [-3, 4], [-4, 3], [-5, 0], [-4, -3], [-3, -4], [0, -5], [3, -4], [4, -3]];
  var SPEC = { x: [-7, 7], y: [-7, 7], k: 22, step: 1, grid: 1, fs: 9 };
  var CY = '#00e5ff', W = '#ffffff', GO = '#ffc46b', GR = '#b0b0b0';
  function nearest(x, y, skip) {
    var best = -1, bd = 1e9; PTS.forEach(function (p, i) { if (skip.indexOf(i) >= 0) return; var d = Math.hypot(p[0] - x, p[1] - y); if (d < bd) { bd = d; best = i; } }); return best;
  }
  function next(i, dir, skip) { var j = i; do { j = (j + dir + 12) % 12; } while (skip.indexOf(j) >= 0 && j !== i); return j; }

  [].slice.call(document.querySelectorAll('.lab.geo')).forEach(function (box, n) {
    var mode = box.getAttribute('data-geo') || 'chord';
    var st = mode === 'semi' ? { p: +(box.getAttribute('data-p') || 2) } : { a: +(box.getAttribute('data-a') || 1), b: +(box.getAttribute('data-b') || 5) };
    var uid = 'geo' + n;
    box.innerHTML = '<svg class="fig" id="' + uid + '-svg" role="img" aria-label="' + (mode === 'semi'
        ? 'The circle x squared plus y squared equals 25 with diameter AB and a point P on the circle; the angle at P is marked'
        : 'The circle x squared plus y squared equals 25 with a chord AB, its midpoint M and the line from the center C to M') + '"></svg>' +
      '<div class="panel">' +
      '<p class="small gk-help">' + (mode === 'semi' ? 'Drag <b>P</b> round the circle, or use the buttons.' : 'Drag <b>A</b> or <b>B</b> round the circle, or use the buttons.') + '</p>' +
      '<div class="picks gk-move" role="group" aria-label="Move a point">' + (mode === 'semi'
        ? '<button type="button" data-k="p" data-d="1">P ↺</button><button type="button" data-k="p" data-d="-1">P ↻</button>'
        : '<button type="button" data-k="a" data-d="1">A ↺</button><button type="button" data-k="a" data-d="-1">A ↻</button><button type="button" data-k="b" data-d="1">B ↺</button><button type="button" data-k="b" data-d="-1">B ↻</button>') + '</div>' +
      '<div class="read gk-read" aria-live="polite"></div>' +
      '<div class="verdict ok gk-v"></div></div>';
    var svg = box.querySelector('svg'), read = box.querySelector('.gk-read'), verdict = box.querySelector('.gk-v');
    var m = G.map(SPEC), drag = null;

    function skipFor(key) { if (mode === 'semi') return [0, 6]; return [key === 'a' ? st.b : st.a]; }
    function handle(p, label, key, col) {
      return '<g class="gk-h" data-k="' + key + '" style="cursor:grab"><circle cx="' + m.px(p[0]) + '" cy="' + m.py(p[1]) + '" r="13" fill="rgba(0,229,255,0.12)" stroke="' + col + '" stroke-width="1.5"/>' +
        '<circle cx="' + m.px(p[0]) + '" cy="' + m.py(p[1]) + '" r="5" fill="' + col + '"/></g>' + lbl(p, label, col);
    }
    function lbl(p, t, col) {
      var dx = p[0] >= 0 ? 12 : -26, dy = p[1] >= 0 ? -10 : 22;
      return '<text x="' + (m.px(p[0]) + dx) + '" y="' + (m.py(p[1]) + dy) + '" font-family="JetBrains Mono, monospace" font-size="13" font-weight="700" fill="' + col + '">' + t + '</text>';
    }
    function draw() {
      F(svg, { x: SPEC.x, y: SPEC.y, k: SPEC.k, step: SPEC.step, grid: SPEC.grid, fs: SPEC.fs, circles: [[0, 0, 5, W, '']], pts: [[0, 0, 'C', GR, 6, -6]] });
      var s = '', html = '', ok = '';
      if (mode === 'semi') {
        var A = [-5, 0], B = [5, 0], P = PTS[st.p];
        s += seg(A, B, GR, '5 4') + seg(A, P, CY) + seg(B, P, CY) + G.rightBox(m, [P[0], P[1], A[0], A[1], B[0], B[1]], GO, 12);
        s += lbl(A, 'A', W) + lbl(B, 'B', W) + handle(P, 'P', 'p', CY);
        var gAP = G.frac(P[1] - A[1], P[0] - A[0]), gBP = G.frac(P[1] - B[1], P[0] - B[0]);
        var AP2 = Math.pow(P[0] - A[0], 2) + Math.pow(P[1] - A[1], 2), BP2 = Math.pow(P[0] - B[0], 2) + Math.pow(P[1] - B[1], 2);
        html = '<span class="lw">P =</span> <b>' + G.pt(P) + '</b><br>' +
          '<span class="lw">gradient AP =</span> ' + gAP + ' &nbsp; <span class="lw">gradient BP =</span> ' + gBP + '<br>' +
          '<span class="lw">product =</span> <b>' + prod(P[1] - A[1], P[0] - A[0], P[1] - B[1], P[0] - B[0]) + '</b><br>' +
          '<span class="lw">AP² + BP² =</span> ' + AP2 + ' + ' + BP2 + ' = <b>' + (AP2 + BP2) + '</b> <span class="lw">= AB² = 10² = 100</span>';
        ok = 'Angle APB = 90° wherever P is. AB is a diameter.';
      } else {
        var Aa = PTS[st.a], Bb = PTS[st.b], Mx2 = Aa[0] + Bb[0], My2 = Aa[1] + Bb[1], Mm = [Mx2 / 2, My2 / 2];
        s += seg(Aa, Bb, CY);
        if (Mx2 === 0 && My2 === 0) {
          s += lbl(Aa, 'A', CY) + handle(Aa, '', 'a', CY) + handle(Bb, 'B', 'b', CY);
          html = '<span class="lw">A =</span> ' + G.pt(Aa) + ' &nbsp; <span class="lw">B =</span> ' + G.pt(Bb) + '<br><span class="lw">midpoint M =</span> <b>(0, 0)</b>, the center itself';
          ok = 'This chord is a diameter: its midpoint is the center, so there is no line CM to draw.';
        } else {
          s += seg([0, 0], Mm, GO, '5 4') + G.rightBox(m, [Mm[0], Mm[1], 0, 0, Aa[0], Aa[1]], GO, 11);
          s += '<circle cx="' + m.px(Mm[0]) + '" cy="' + m.py(Mm[1]) + '" r="4.5" fill="' + GO + '"/>' + lbl(Mm, 'M', GO);
          s += handle(Aa, 'A', 'a', CY) + handle(Bb, 'B', 'b', CY);
          var gAB = G.frac(Bb[1] - Aa[1], Bb[0] - Aa[0]), gCM = G.frac(My2, Mx2);
          html = '<span class="lw">A =</span> ' + G.pt(Aa) + ' &nbsp; <span class="lw">B =</span> ' + G.pt(Bb) + '<br>' +
            '<span class="lw">midpoint M =</span> <b>(' + G.half(Mx2) + ', ' + G.half(My2) + ')</b><br>' +
            '<span class="lw">gradient AB =</span> ' + (gAB === null ? 'undefined (vertical)' : gAB) + ' &nbsp; <span class="lw">gradient CM =</span> ' + (gCM === null ? 'undefined (vertical)' : gCM) + '<br>' +
            '<span class="lw">product =</span> <b>' + (gAB === null || gCM === null ? 'one line is vertical, the other horizontal' : prod(Bb[1] - Aa[1], Bb[0] - Aa[0], My2, Mx2)) + '</b><br>' +
            '<span class="lw">CA = CB =</span> 5';
          ok = 'CM is perpendicular to AB for every chord. C is on the perpendicular bisector of AB.';
        }
      }
      svg.insertAdjacentHTML('beforeend', s);
      read.innerHTML = html; verdict.textContent = ok;
    }
    function prod(n1, d1, n2, d2) { return G.frac(n1 * n2, d1 * d2); }
    function seg(p, q, col, dash) { return '<line x1="' + m.px(p[0]) + '" y1="' + m.py(p[1]) + '" x2="' + m.px(q[0]) + '" y2="' + m.py(q[1]) + '" stroke="' + col + '" stroke-width="2.6"' + (dash ? ' stroke-dasharray="' + dash + '"' : '') + ' stroke-linecap="round"/>'; }
    function toGrid(e) {
      var r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal, sx = vb.width / r.width, sy = vb.height / r.height;
      var X = (e.clientX - r.left) * sx, Y = (e.clientY - r.top) * sy;
      return [SPEC.x[0] + (X - 24) / SPEC.k, SPEC.y[0] + (vb.height - 24 - Y) / SPEC.k];
    }
    svg.addEventListener('pointerdown', function (e) {
      var g = e.target.closest && e.target.closest('.gk-h'); if (!g) return;
      drag = g.getAttribute('data-k'); e.preventDefault(); try { svg.setPointerCapture(e.pointerId); } catch (x) {}
    });
    svg.addEventListener('pointermove', function (e) {
      if (!drag) return; var q = toGrid(e), i = nearest(q[0], q[1], skipFor(drag));
      if (i >= 0 && i !== st[drag]) { st[drag] = i; draw(); }
    });
    function end() { drag = null; }
    svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
    [].forEach.call(box.querySelectorAll('.gk-move button'), function (b) {
      b.addEventListener('click', function () { var k = b.getAttribute('data-k'); st[k] = next(st[k], +b.getAttribute('data-d'), skipFor(k)); draw(); });
    });
    box.__set = function (o) { Object.keys(o).forEach(function (k) { if (k in st) st[k] = o[k]; }); draw(); return read.textContent; };
    draw();
  });
})();
