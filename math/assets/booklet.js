/* ============================================================
   THINK IN BITS · BOOKLET ENGINE
   Load after KaTeX (katex.min.js + auto-render.min.js). A booklet page supplies:
     <body data-booklet="1.3-circles" data-booklet-name="1.3 · Booklet 2 · Circles" data-back="../../../math.html">
     <main class="bk"> ... <section class="bsec" id="..." data-title="..."> ... </section> ... </main>
   Pieces it wires up:
     .steps     step-by-step reveal (children .step, button added)
     .predict   choose first, then see why (buttons in .opts; the right one has data-ok; data-say = feedback)
     .marks     mark-scheme lines (.mline with data-code and data-n) that light up one at a time;
                this lives in marks.js + marks.css, which the page loads before booklet.js
     .try       check-yourself question (.q then .sol); students mark Got it / Not yet, saved per browser
     .tally     running count of check-yourself results
   Progress (sections read, questions marked) is kept in localStorage only, wrapped in try/catch,
   so the page still works when storage is blocked.
   ============================================================ */
(function () {
  'use strict';
  var body = document.body, key = 'tib-booklet:' + (body.getAttribute('data-booklet') || 'x');
  var store = {
    get: function () { try { return JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch (e) { return {}; } },
    set: function (o) { try { localStorage.setItem(key, JSON.stringify(o)); } catch (e) {} }
  };
  var state = store.get(); state.read = state.read || {}; state.tries = state.tries || {};
  function save() { store.set(state); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function btn(label, cls) { var b = el('button', 'bk-btn' + (cls ? ' ' + cls : ''), label); b.type = 'button'; return b; }

  /* ---------- math ---------- */
  if (window.renderMathInElement) {
    renderMathInElement(document.querySelector('main.bk') || body, {
      delimiters: [{ left: '\\[', right: '\\]', display: true }, { left: '\\(', right: '\\)', display: false }],
      throwOnError: false
    });
  }

  var secs = [].slice.call(document.querySelectorAll('section.bsec'));
  var tries = [].slice.call(document.querySelectorAll('.try'));

  /* ---------- top bar + contents ---------- */
  var bar = el('div', 'bk-bar');
  bar.innerHTML = '<a class="bk-back" href="' + (body.getAttribute('data-back') || '../') + '">‹ Math</a>' +
    '<span class="bk-name">' + (body.getAttribute('data-booklet-name') || document.title) + '</span>' +
    '<div class="bk-meter" aria-live="polite"><span id="bkCount"></span><div class="bk-track"><div class="bk-fill" id="bkFill"></div></div></div>' +
    '<button type="button" id="bkTocBtn" aria-haspopup="dialog">Contents</button>';
  body.insertBefore(bar, body.firstChild);
  var toc = el('div', 'bk-toc'); toc.id = 'bkToc'; toc.setAttribute('role', 'dialog'); toc.setAttribute('aria-label', 'Contents');
  var list = secs.map(function (s, i) {
    return '<li><a href="#' + s.id + '" data-sec="' + s.id + '"><span class="n">' + (i + 1) + '</span><span>' + (s.getAttribute('data-title') || s.id) + '</span><span class="tick"></span></a></li>';
  }).join('');
  toc.innerHTML = '<div class="panel"><h3>Contents</h3><ol>' + list + '</ol>' +
    '<p class="small" style="margin-top:16px">Your progress is saved in this browser only.</p>' +
    '<div class="row"><button type="button" class="bk-btn" id="bkPrint">Print or save as PDF</button><button type="button" class="bk-btn" id="bkReset">Start over</button><button type="button" class="bk-btn go" id="bkClose">Close</button></div></div>';
  body.appendChild(toc);
  function openToc(on) { toc.classList.toggle('open', on); if (on) toc.querySelector('a').focus(); }
  document.getElementById('bkTocBtn').addEventListener('click', function () { openToc(true); });
  document.getElementById('bkClose').addEventListener('click', function () { openToc(false); });
  toc.addEventListener('click', function (e) { if (e.target === toc || e.target.closest('a')) openToc(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && toc.classList.contains('open')) openToc(false); });
  document.getElementById('bkPrint').addEventListener('click', function () { openToc(false); setTimeout(function () { window.print(); }, 50); });
  document.getElementById('bkReset').addEventListener('click', function () {
    state = { read: {}, tries: {} }; save();
    tries.forEach(function (t) { setTry(t, null); t.classList.remove('open'); });
    refresh();
  });

  function refresh() {
    var nRead = secs.filter(function (s) { return state.read[s.id]; }).length;
    var nTry = tries.filter(function (t) { return state.tries[t.getAttribute('data-id')]; }).length;
    var nGot = tries.filter(function (t) { return state.tries[t.getAttribute('data-id')] === 'got'; }).length;
    var total = secs.length + tries.length, done = nRead + nTry;
    document.getElementById('bkCount').textContent = nRead + ' of ' + secs.length + ' sections · ' + nTry + ' of ' + tries.length + ' questions';
    document.getElementById('bkFill').style.width = (total ? Math.round(done / total * 100) : 0) + '%';
    [].slice.call(toc.querySelectorAll('a[data-sec]')).forEach(function (a) { a.querySelector('.tick').textContent = state.read[a.getAttribute('data-sec')] ? '✓' : ''; });
    [].slice.call(document.querySelectorAll('.tally')).forEach(function (t) {
      t.innerHTML = 'Got it: <b>' + nGot + '</b> &nbsp;·&nbsp; Not yet: <b>' + (nTry - nGot) + '</b> &nbsp;·&nbsp; Not tried: <b>' + (tries.length - nTry) + '</b>';
    });
  }

  /* a section counts as read once you have scrolled to its end */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { var id = e.target.getAttribute('data-end-of'); if (!state.read[id]) { state.read[id] = 1; save(); refresh(); } } });
    }, { rootMargin: '0px 0px -10% 0px' });
    secs.forEach(function (s) { var m = el('span'); m.setAttribute('data-end-of', s.id); m.style.display = 'block'; m.style.height = '1px'; s.appendChild(m); io.observe(m); });
  }
  /* backup for fast scrolling: any end marker on screen at a scroll stop counts too */
  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return; ticking = true;
    setTimeout(function () {
      ticking = false; var changed = false, h = window.innerHeight;
      [].slice.call(document.querySelectorAll('[data-end-of]')).forEach(function (m) {
        var t = m.getBoundingClientRect().top, id = m.getAttribute('data-end-of');
        if (t >= 0 && t <= h * 0.92 && !state.read[id]) { state.read[id] = 1; changed = true; }
      });
      if (changed) { save(); refresh(); }
    }, 120);
  }, { passive: true });

  /* ---------- step-by-step reveal ---------- */
  [].slice.call(document.querySelectorAll('.steps')).forEach(function (box) {
    var steps = [].slice.call(box.querySelectorAll(':scope > .step')), i = 0;
    var row = el('div', 'more'), next = btn(box.getAttribute('data-next') || 'Next step', 'go'), all = btn('Show all');
    row.appendChild(next); if (steps.length > 1) row.appendChild(all); row.style.display = 'flex'; row.style.gap = '8px'; row.style.flexWrap = 'wrap';
    box.appendChild(row);
    function upd() { steps.forEach(function (s, j) { s.classList.toggle('on', j < i); }); if (i >= steps.length) { row.style.display = 'none'; } }
    next.addEventListener('click', function () { i++; upd(); });
    all.addEventListener('click', function () { i = steps.length; upd(); });
    if (box.hasAttribute('data-open')) { i = +box.getAttribute('data-open') || 1; }
    upd();
  });

  /* ---------- predict first ---------- */
  [].slice.call(document.querySelectorAll('.predict')).forEach(function (box) {
    var opts = [].slice.call(box.querySelectorAll('.opts button')), say = box.querySelector('.say');
    if (!say) { say = el('p', 'say'); box.querySelector('.opts').after(say); }
    opts.forEach(function (b) {
      b.type = 'button';
      b.addEventListener('click', function () {
        var ok = b.hasAttribute('data-ok');
        b.classList.add(ok ? 'right' : 'wrong');
        say.className = 'say ' + (ok ? 'right' : 'wrong');
        say.textContent = b.getAttribute('data-say') || (ok ? 'Yes.' : 'Not that one. Try again, or read why below.');
        if (ok) { opts.forEach(function (o) { o.disabled = true; }); box.classList.add('done'); }
        else if (box.querySelectorAll('.opts button.wrong').length >= Math.min(2, opts.length - 1)) {
          box.classList.add('done'); opts.forEach(function (o) { if (o.hasAttribute('data-ok')) o.classList.add('right'); o.disabled = true; });
        }
      });
    });
  });

  /* ---------- marks lighting up one at a time (shared: marks.js, loaded before this file) ---------- */
  if (window.TIBMarks) TIBMarks.ladderAll(document.querySelector('main.bk') || body);

  /* ---------- check yourself ---------- */
  function setTry(t, v) {
    var id = t.getAttribute('data-id');
    if (v) state.tries[id] = v; else delete state.tries[id];
    t.classList.toggle('got', v === 'got'); t.classList.toggle('not', v === 'not');
    [].slice.call(t.querySelectorAll('.self button')).forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-v') === v ? 'true' : 'false'); });
  }
  tries.forEach(function (t, n) {
    var id = t.getAttribute('data-id') || ('q' + (n + 1)); t.setAttribute('data-id', id);
    var acts = el('div', 'acts'), show = btn('Show the answer', 'go');
    acts.appendChild(show);
    var self = el('div', 'self'); self.innerHTML = '<span>How did you do?</span>';
    var got = btn('Got it'), not = btn('Not yet');
    got.className += ' got'; not.className += ' not'; got.setAttribute('data-v', 'got'); not.setAttribute('data-v', 'not');
    self.appendChild(got); self.appendChild(not);
    var sol = t.querySelector('.sol'); t.insertBefore(acts, sol); t.appendChild(self);
    show.addEventListener('click', function () { var o = t.classList.toggle('open'); show.textContent = o ? 'Hide the answer' : 'Show the answer'; });
    [got, not].forEach(function (b) { b.addEventListener('click', function () { var v = b.getAttribute('data-v'); setTry(t, state.tries[id] === v ? null : v); save(); refresh(); }); });
    if (state.tries[id]) { setTry(t, state.tries[id]); }
  });

  window.addEventListener('beforeprint', function () { tries.forEach(function (t) { t.classList.add('open'); }); });
  refresh();
  window.TIBBooklet = { refresh: refresh, state: function () { return state; } };
})();
