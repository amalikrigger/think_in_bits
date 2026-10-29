/* ============================================================
   THINK IN BITS · MARKS (shared)
   Mark-scheme lines that light up one at a time, plus code chips.
   Used by the booklet engine and the Examiner's Desk. Pairs with marks.css.

   Markup (new):
     <div class="tib-mk">
       <div class="tib-mk-line" data-code="M1" data-n="1"> ...working... <div class="tib-mk-earn">...</div></div>
     </div>
   Older booklet markup still works: .marks > .mline (.code, .earn) inside main.bk is upgraded.
   The old class names stay on the elements, so older tests and links keep working.

   API: TIBMarks.ladder(box) wires one box; TIBMarks.ladderAll(root) wires every box under root;
        TIBMarks.chip(code) returns the HTML for a code chip (codes are plain strings we write).
   ============================================================ */
(function () {
  'use strict';
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function btn(label, cls) { var b = el('button', 'tib-mk-btn' + (cls ? ' ' + cls : ''), label); b.type = 'button'; return b; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* old booklet markup -> new class names (old ones kept) */
  function upgrade(root) {
    [].slice.call((root || document).querySelectorAll('main.bk .marks')).forEach(function (box) {
      box.classList.add('tib-mk');
      [].slice.call(box.querySelectorAll(':scope > .mline')).forEach(function (l) {
        l.classList.add('tib-mk-line');
        var c = l.querySelector('.code'); if (c) c.classList.add('tib-mk-code');
        var e = l.querySelector('.earn'); if (e) e.classList.add('tib-mk-earn');
      });
    });
  }

  function ladder(box) {
    if (box.getAttribute('data-mk-ready')) return;
    box.setAttribute('data-mk-ready', '1');
    var lines = [].slice.call(box.querySelectorAll(':scope > .tib-mk-line')), i = 0;
    var total = lines.reduce(function (s, l) { return s + (+(l.getAttribute('data-n') || 1)); }, 0);
    lines.forEach(function (l) {
      if (!l.querySelector('.tib-mk-code')) l.insertBefore(el('div', 'tib-mk-code code', esc(l.getAttribute('data-code') || '')), l.firstChild);
    });
    /* bk-btn keeps the booklet's own button look; tot/go keep the booklet's older selectors */
    var tot = el('div', 'tib-mk-tot tot');
    var go = btn('Award the next mark', 'go bk-btn'), reset = btn('Start again', 'bk-btn');
    var txt = el('span'); tot.appendChild(go); tot.appendChild(reset); tot.appendChild(txt); box.appendChild(tot);
    function upd() {
      var got = 0;
      lines.forEach(function (l, j) { var on = j < i; l.classList.toggle('lit', on); if (on) got += +(l.getAttribute('data-n') || 1); });
      txt.innerHTML = '<b>' + got + '</b> of ' + total + ' marks';
      go.disabled = i >= lines.length;
    }
    go.addEventListener('click', function () { i = Math.min(lines.length, i + 1); upd(); });
    reset.addEventListener('click', function () { i = 0; upd(); });
    upd();
  }

  function ladderAll(root) {
    upgrade(root);
    [].slice.call((root || document).querySelectorAll('.tib-mk')).forEach(ladder);
  }

  /* a code chip: "M1*" -> chip; data-code lets a page open that code's card */
  function chip(code, extra) {
    var c = String(code);
    return '<span class="tib-mk-chip' + (extra ? ' ' + extra : '') + '" data-code="' + esc(c) + '">' + esc(c) + '</span>';
  }

  window.TIBMarks = { ladder: ladder, ladderAll: ladderAll, upgrade: upgrade, chip: chip };
})();
