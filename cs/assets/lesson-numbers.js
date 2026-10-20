/* ============================================================
   THINK IN BITS - Numbers lab

   Three hands-on widgets for How Computers Work. Each one answers
   "what does it mean to say a color / a photo / a sound is just
   numbers?" by letting the student change the numbers and watch the
   thing change. Plain canvas and Web Audio, no libraries, so they
   run offline on a school Chromebook.

     data-widget="color"    three bytes make a color; flip the bits
     data-widget="pixels"   a photo is a grid of those triplets
     data-widget="sound"    a sound is one number, measured over and over
     data-widget="desk"     memory vs storage: type, save, cut the power
     data-widget="cpulab"   the program stepper, with a dial and a guess
     data-widget="parts"    sort a machine's parts into the four jobs

   Opt-in per element, and a broken widget never takes a lesson down.
   ============================================================ */
(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var esc = function (v) { return String(v).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var fmt = function (n) { return Math.round(n).toLocaleString('en-US'); };
  var bin8 = function (n) { return ('00000000' + n.toString(2)).slice(-8); };
  var clamp = function (n, lo, hi) { return Math.max(lo, Math.min(hi, n)); };
  var uid = 0;

  /* ---------- styles ---------- */
  var css = [
    '.nw-grid { display: grid; grid-template-columns: minmax(0, 210px) minmax(0, 1fr); gap: 20px; align-items: start; }',
    '.nw-grid.wide { grid-template-columns: minmax(0, 330px) minmax(0, 1fr); }',
    '@media (max-width: 760px) { .nw-grid, .nw-grid.wide { grid-template-columns: minmax(0, 1fr); } }',
    '.nw-swatch { display: flex; height: 150px; border-radius: 14px; overflow: hidden; border: 1px solid var(--hairline-strong); position: relative; }',
    '.nw-swatch > div { flex: 1 1 50%; position: relative; }',
    '.nw-swatch > div span { position: absolute; left: 8px; bottom: 6px; font-size: 11px; font-weight: 600; padding: 2px 7px; border-radius: 50px; background: rgba(0,0,0,.55); color: #fff; }',
    '.nw-hex { margin: 9px 0 0; font-family: var(--mono); font-size: 12.5px; color: var(--text-2); line-height: 1.55; }',
    '.nw-ch { margin-bottom: 12px; }',
    '.nw-ch-top { display: flex; align-items: center; gap: 10px; }',
    '.nw-ch-name { width: 50px; font-size: 13px; font-weight: 600; color: var(--c); flex: 0 0 auto; }',
    '.nw-range { flex: 1 1 auto; min-width: 0; accent-color: var(--c); height: 24px; }',
    '.nw-num { font-family: var(--mono); font-size: 15px; font-weight: 700; width: 3.2ch; text-align: right; flex: 0 0 auto; }',
    '.nw-bot { display: flex; align-items: center; gap: 6px 14px; flex-wrap: wrap; margin: 6px 0 0 60px; }',
    '.nw-bits { display: flex; gap: 4px; }',
    '.nw-bit { width: 32px; padding: 3px 0 2px; border-radius: 8px; border: 1px solid var(--hairline-strong); background: #0d0d14; color: var(--text-3); cursor: pointer; display: flex; flex-direction: column; align-items: center; line-height: 1.15; font-family: var(--mono); }',
    '.nw-bit b { font-size: 15px; }',
    '.nw-bit i { font-style: normal; font-size: 9.5px; opacity: .8; }',
    '.nw-bit[aria-pressed="true"] { background: var(--c); border-color: var(--c); color: #04141a; }',
    '.nw-bit:hover { border-color: var(--c); }',
    '.nw-bit:focus-visible, .nw-seg button:focus-visible, .nw-chip:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }',
    '.nw-eq { font-family: var(--mono); font-size: 12px; color: var(--text-3); }',
    '.nw-chips { display: flex; flex-wrap: wrap; gap: 7px; margin: 14px 0 0; align-items: center; }',
    '.nw-chips > span { font-size: 12.5px; color: var(--text-3); margin-right: 2px; }',
    '.nw-chip { display: inline-flex; align-items: center; gap: 7px; padding: 6px 12px; border-radius: 50px; border: 1px solid var(--hairline-strong); background: transparent; color: var(--text-2); font: 500 12.5px var(--font); cursor: pointer; }',
    '.nw-chip:hover { border-color: var(--accent); color: var(--text); }',
    '.nw-chip i { width: 12px; height: 12px; border-radius: 50%; border: 1px solid rgba(255,255,255,.3); display: inline-block; }',
    '.nw-chip.on { border-color: var(--gold); color: var(--gold); background: var(--gold-soft); }',
    '.nw-game { margin: 12px 0 0; padding: 10px 13px; border-radius: 10px; font-size: 13.5px; background: var(--gold-soft); border: 1px solid var(--gold-line); color: var(--text); }',
    '.nw-game.ok { background: var(--ok-soft); border-color: var(--ok-line); }',
    '.nw-seg { display: inline-flex; flex-wrap: wrap; gap: 0; border: 1px solid var(--hairline-strong); border-radius: 16px; overflow: hidden; }',
    '.nw-seg button { padding: 6px 11px; border: 0; background: transparent; color: var(--text-2); font: 500 12.5px var(--font); cursor: pointer; }',
    '.nw-seg button + button { border-left: 1px solid var(--hairline); }',
    '.nw-seg button[aria-pressed="true"] { background: var(--accent); color: #04141a; font-weight: 700; }',
    '.nw-seg button:disabled { opacity: .35; cursor: not-allowed; }',
    '.nw-ctl { margin: 0 0 12px; }',
    '.nw-ctl > label, .nw-ctl > .nw-lab { display: block; font-size: 12.5px; color: var(--text-3); margin: 0 0 5px; }',
    '.nw-ctl > label b, .nw-ctl > .nw-lab b { color: var(--text); font-family: var(--mono); }',
    '.nw-canvas { display: block; width: 100%; border-radius: 12px; border: 1px solid var(--hairline-strong); background: #0d0d14; }',
    '.nw-px { image-rendering: pixelated; cursor: crosshair; touch-action: none; max-width: 384px; aspect-ratio: 1 / 1; height: auto; }',
    '.nw-px:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }',
    '.nw-stat { margin: 10px 0 0; font-size: 13.5px; color: var(--text-2); }',
    '.nw-stat b { color: var(--text); }',
    '.nw-note { margin: 8px 0 0; font-size: 13px; color: var(--accent); min-height: 1.4em; }',
    '.nw-insp { padding: 11px 13px; border-radius: 12px; background: #0d0d14; border: 1px solid var(--hairline); margin: 0 0 12px; }',
    '.nw-insp h4 { margin: 0 0 8px; font-size: 13px; font-weight: 600; color: var(--text-2); }',
    '.nw-insp h4 code { color: var(--text); }',
    '.nw-insp .nw-ch { margin: 0 0 4px; }',
    '.nw-insp .nw-ch-name { width: 44px; }',
    '.nw-insp .nw-bin { font-family: var(--mono); font-size: 12px; color: var(--text-3); width: 8.4ch; flex: 0 0 auto; }',
    '.nw-ops { display: flex; flex-wrap: wrap; gap: 7px; }',
    '.nw-chans { margin-left: 8px; }',
    '.nw-chk { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; margin-right: 10px; cursor: pointer; }',
    '.nw-chk input { accent-color: var(--accent); width: 16px; height: 16px; }',
    '.nw-playrow { display: flex; align-items: center; gap: 8px 16px; flex-wrap: wrap; }',
    '.nw-strip { display: flex; flex-wrap: wrap; gap: 5px; margin: 0; }',
    '.nw-strip span { font-family: var(--mono); font-size: 12px; padding: 3px 8px; border-radius: 7px; background: #0d0d14; border: 1px solid var(--hairline); color: var(--gold); }',
    '.nw-strip em { font-style: normal; color: var(--text-3); align-self: center; font-size: 12px; }',
    '.nw-pad { height: 96px; touch-action: none; cursor: crosshair; }',
    '.nw-two { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; }',
    '.nw-hint { font-size: 12px; color: var(--text-3); margin: 5px 0 0; }',
    'body.present .slide .nw-hex, body.present .slide .nw-stat, body.present .slide .nw-game, body.present .slide .nw-note { font-size: clamp(11.5px, 1.15vw, 16px); margin-top: 6px; }',
    'body.present .slide .nw-hex { line-height: 1.4; }',
    'body.present .slide .nw-swatch { height: clamp(96px, 17vh, 170px); }',
    'body.present .slide .nw-ch { margin-bottom: clamp(4px, 1vh, 10px); }',
    'body.present .slide .nw-bot { margin-top: 3px; }',
    'body.present .slide .nw-bit { width: clamp(26px, 2.3vw, 34px); padding: 2px 0; }',
    'body.present .slide .nw-bit b { font-size: clamp(12px, 1.2vw, 15px); }',
    'body.present .slide .nw-chip { padding: 4px 11px; font-size: clamp(11.5px, 1.1vw, 13.5px); }',
    'body.present .slide .nw-chips { margin-top: clamp(6px, 1.2vh, 12px); }',
    'body.present .slide .nw-ctl { margin-bottom: clamp(6px, 1.2vh, 12px); }',
    'body.present .slide .nw-insp { margin-bottom: clamp(6px, 1.2vh, 12px); padding: 8px 12px; }',
    'body.present .slide .nw-seg button { padding: 5px 10px; font-size: clamp(11.5px, 1.1vw, 13px); }',
    'body.present .slide .nw-playrow .w-btn { padding: 5px 16px; }',
    'body.present .slide .nw-strip span { padding: 2px 7px; }',
    'body.present .slide .nw-insp .nw-ch-top { gap: 8px; }',
    'body.present .slide .nw-px { max-width: clamp(240px, 42vh, 330px); }',
    'body.present .slide .nw-ctl > .nw-lab { margin-bottom: 3px; }',
    'body.present .slide [data-widget="color"] .w-foot, body.present .slide [data-widget="pixels"] .w-foot, body.present .slide [data-widget="sound"] .w-foot { display: none; }',
    '.nw-deskgrid { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr); gap: 14px; margin-bottom: 12px; }',
    '@media (max-width: 640px) { .nw-deskgrid { grid-template-columns: minmax(0, 1fr); } }',
    '.nw-zone { position: relative; padding: 12px 14px; border-radius: 14px; border: 1px solid var(--hairline-strong); background: #0d0d14; }',
    '.nw-zdesk { border-color: var(--accent-line); } .nw-zcab { border-color: var(--gold-line); }',
    '.nw-zone h4 { margin: 0; font-size: 14px; } .nw-zone h4 span { font-weight: 500; font-size: 12px; color: var(--text-3); margin-left: 6px; }',
    '.nw-zsub { margin: 2px 0 8px; font-size: 12.5px; color: var(--text-3); }',
    '.nw-ta { width: 100%; box-sizing: border-box; resize: vertical; background: #14141c; color: var(--text); border: 1px solid var(--hairline-strong); border-radius: 9px; padding: 9px 11px; font: 14px var(--font); min-height: 84px; }',
    '.nw-ta:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; } .nw-ta:disabled { opacity: .5; }',
    '.nw-dirty { margin: 6px 0 0; font-size: 12.5px; min-height: 1.3em; color: var(--text-2); }',
    '.nw-ok { color: var(--ok); font-weight: 600; } .nw-bad { color: var(--warn); font-weight: 600; }',
    '.nw-off { position: absolute; inset: 0; border-radius: 14px; background: rgba(0,0,0,.9); display: flex; align-items: center; justify-content: center; font-weight: 700; letter-spacing: .08em; color: var(--warn); text-transform: uppercase; }',
    '.nw-off[hidden] { display: none; }',
    '.nw-doc { padding: 10px 12px; border-radius: 10px; background: #14141c; border: 1px solid var(--gold-line); font-size: 13px; display: flex; flex-direction: column; gap: 3px; }',
    '.nw-doc.empty { border-style: dashed; color: var(--text-3); border-color: var(--hairline-strong); min-height: 70px; justify-content: center; align-items: center; }',
    '.nw-doc b { color: var(--gold); } .nw-doc span { font-size: 11.5px; color: var(--text-3); } .nw-doc em { font-style: normal; color: var(--text-2); word-break: break-word; }',
    '.nw-file.flash .nw-doc { animation: nwflash .6s ease; }',
    '@keyframes nwflash { 0% { box-shadow: 0 0 0 0 rgba(255,200,87,.7); } 100% { box-shadow: 0 0 0 14px rgba(255,200,87,0); } }',
    '.nw-cpuctl { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 14px; }',
    '.nw-guess { max-width: 150px; }',
    '.nw-parts { display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; }',
    '.nw-part { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; padding: 7px 11px; border-radius: 10px; background: #0d0d14; border: 1px solid var(--hairline); }',
    '.nw-part.ok { border-color: var(--ok-line); background: var(--ok-soft); } .nw-part.bad { border-color: var(--warn-line); background: var(--warn-soft); }',
    '.nw-pn { flex: 1 1 230px; font-size: 13.5px; font-weight: 500; }',
    '.nw-pj { display: inline-flex; gap: 5px; flex-wrap: wrap; }',
    '.nw-jb { padding: 4px 11px; border-radius: 50px; border: 1px solid var(--hairline-strong); background: transparent; color: var(--text-2); font: 500 12px var(--font); cursor: pointer; }',
    '.nw-jb:hover { border-color: var(--accent); } .nw-jb:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }',
    '.nw-jb[aria-pressed="true"] { background: var(--accent); border-color: var(--accent); color: #04141a; font-weight: 700; }',
    '.nw-pr { flex: 1 1 100%; margin: 2px 0 0; font-size: 12.5px; color: var(--text-2); }',
    '.nw-detail { margin: 6px 0 0; font-size: 13.5px; color: var(--text-2); min-height: 1.4em; }',
    '.nw-detail b { color: var(--text); }',
    'body.present .slide .nw-pr { font-size: clamp(11px, 1vw, 13px); }',
    'body.present .slide .nw-ta { min-height: 64px; } body.present .slide .nw-zsub { margin-bottom: 4px; }',
    'body.present .slide [data-widget="desk"] .w-head, body.present .slide [data-widget="cpulab"] .w-head, body.present .slide [data-widget="parts"] .w-head { display: none; }',
    'body.present .slide [data-widget="cpulab"] .w-code { padding: 6px 0; } body.present .slide [data-widget="cpulab"] .w-code li { line-height: 1.2; padding-top: 2px; padding-bottom: 2px; font-size: 13px; }',
    'body.present .slide [data-widget="cpulab"] .w-cpu { margin: 8px 0; } body.present .slide [data-widget="cpulab"] .w-side { gap: 6px; }',
    'body.present .slide [data-widget="cpulab"] .w-mem, body.present .slide [data-widget="cpulab"] .w-out { padding: 8px 12px; }',
    'body.present .slide [data-widget="parts"] .nw-pr { display: none; }',
    'body.present .slide [data-widget="parts"] .nw-part { padding: 2px 10px; }',
    'body.present .slide [data-widget="parts"] .nw-jb { padding: 2px 10px; } body.present .slide [data-widget="parts"] .nw-parts { gap: 4px; margin-bottom: 6px; }',
    'body.present .slide [data-widget="parts"] .nw-ctl > .nw-lab { display: none; } body.present .slide [data-widget="parts"] .nw-ctl { margin-bottom: 6px; }',
    'body.present .slide [data-widget="desk"] .w-foot, body.present .slide [data-widget="cpulab"] .w-foot, body.present .slide [data-widget="bits"] .w-foot { display: none; }',
    '@media (max-height: 760px) { body.present .slide [data-widget="color"] .w-head, body.present .slide [data-widget="pixels"] .w-head, body.present .slide [data-widget="sound"] .w-head, body.present .slide [data-widget="desk"] .w-head, body.present .slide [data-widget="cpulab"] .w-head, body.present .slide [data-widget="parts"] .w-head { display: none; } body.present .slide .nw-note { min-height: 0; } }',
    '@media (max-width: 520px) {',
    '  .nw-bot { margin-left: 0; }',
    '  .nw-bot { width: 100%; }',
    '  .nw-bits { width: 100%; gap: 3px; }',
    '  .nw-bit { flex: 1 1 0; width: auto; min-width: 0; }',
    '  .nw-bit i { font-size: 8.5px; }',
    '  .nw-ch-name { width: 44px; }',
    '  .nw-seg button { padding: 6px 10px; }',
    '}'
  ].join('\n');
  var styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  /* ---------- small helpers ---------- */

  // A pill-shaped group of buttons where exactly one is pressed.
  function seg(label, opts, cur, on) {
    var el = document.createElement('div');
    el.className = 'nw-seg';
    el.setAttribute('role', 'group');
    el.setAttribute('aria-label', label);
    var btns = opts.map(function (o) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = o[1];
      b.setAttribute('data-v', String(o[0]));
      b.addEventListener('click', function () { set(o[0]); on(o[0]); });
      el.appendChild(b);
      return b;
    });
    function set(v) {
      btns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-v') === String(v))); });
    }
    set(cur);
    return { el: el, set: set, btns: btns };
  }

  function sizeCanvas(cv, cssH) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.max(160, Math.round(cv.clientWidth));
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(cssH * dpr);
    cv.style.height = cssH + 'px';
    var g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { g: g, w: w, h: cssH };
  }

  function onResize(el, fn) {
    if (window.ResizeObserver) {
      var last = 0;
      new ResizeObserver(function () {
        var w = el.clientWidth;
        if (w && w !== last) { last = w; fn(); }
      }).observe(el);
    } else {
      window.addEventListener('resize', fn);
    }
  }

  /* ============================================================
     1. COLOR: three bytes, and the bits that make them
     ============================================================ */

  function buildColor(host) {
    var id = host.id;
    var CH = [
      { k: 'r', name: 'Red', c: '#ff5c5c' },
      { k: 'g', name: 'Green', c: '#4fe08a' },
      { k: 'b', name: 'Blue', c: '#5cb8ff' }
    ];
    var PRE = [
      ['Caribbean water', [0, 180, 216]],
      ['Flamboyant tree', [232, 66, 31]],
      ['Banana yellow', [255, 210, 63]],
      ['Carnival purple', [123, 44, 191]],
      ['Night sky', [10, 14, 40]]
    ];
    var v = { r: 232, g: 66, b: 31 };
    var target = null;

    var h = '<div class="w-head"><span class="w-tag">Try it</span>' +
      '<span class="w-sub">Move a slider, or tap the little switches. Watch the number and the color.</span></div>' +
      '<div class="nw-grid"><div>' +
        '<div class="nw-swatch" aria-hidden="true"><div class="nw-sw-t" hidden><span>Target</span></div><div class="nw-sw-y"><span>Yours</span></div></div>' +
        '<p class="nw-hex" aria-live="polite"></p>' +
      '</div><div>';
    CH.forEach(function (c) {
      h += '<div class="nw-ch" style="--c:' + c.c + '" data-ch="' + c.k + '">' +
        '<div class="nw-ch-top"><label class="nw-ch-name" for="' + id + '-' + c.k + '">' + c.name + '</label>' +
        '<input class="nw-range" id="' + id + '-' + c.k + '" type="range" min="0" max="255" step="1" value="' + v[c.k] + '">' +
        '<output class="nw-num" for="' + id + '-' + c.k + '"></output></div>' +
        '<div class="nw-bot"><div class="nw-bits">';
      [128, 64, 32, 16, 8, 4, 2, 1].forEach(function (p) {
        h += '<button class="nw-bit" type="button" data-p="' + p + '"><b>0</b><i>' + p + '</i></button>';
      });
      h += '</div><div class="nw-eq"></div></div></div>';
    });
    h += '</div></div>' +
      '<div class="nw-chips"><span>Try:</span>' +
      '<button class="nw-chip nw-rand" type="button">Random color</button>' +
      '<button class="nw-chip nw-gamebtn" type="button">Match game</button></div>' +
      '<p class="nw-game" hidden></p>' +
      '<p class="w-foot">Three bytes is 24 bits, which is <b>16,777,216</b> different colors. Each switch is worth double the one to its right, and the number is every switch that is on, added up.</p>';
    host.innerHTML = h;

    var presetRow = $('.nw-chips', host);
    PRE.forEach(function (p) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'nw-chip';
      b.innerHTML = '<i style="background:rgb(' + p[1].join(',') + ')"></i>' + p[0];
      b.addEventListener('click', function () { v.r = p[1][0]; v.g = p[1][1]; v.b = p[1][2]; update(); });
      presetRow.insertBefore(b, $('.nw-rand', presetRow));
    });

    var swT = $('.nw-sw-t', host), swY = $('.nw-sw-y', host), hex = $('.nw-hex', host);
    var game = $('.nw-game', host), gameBtn = $('.nw-gamebtn', host);

    function update() {
      swY.style.background = 'rgb(' + v.r + ',' + v.g + ',' + v.b + ')';
      CH.forEach(function (c) {
        var row = $('[data-ch="' + c.k + '"]', host), n = v[c.k];
        $('.nw-range', row).value = n;
        $('.nw-num', row).textContent = n;
        var on = [];
        $$('.nw-bit', row).forEach(function (b) {
          var p = +b.getAttribute('data-p'), is = (n & p) !== 0;
          b.setAttribute('aria-pressed', String(is));
          b.setAttribute('aria-label', c.name + ' switch worth ' + p + ', ' + (is ? 'on' : 'off'));
          $('b', b).textContent = is ? '1' : '0';
          if (is) on.push(p);
        });
        $('.nw-eq', row).textContent = on.length ? on.join(' + ') + ' = ' + n : 'all switches off = 0';
      });
      var hx = '#' + [v.r, v.g, v.b].map(function (n) { return ('0' + n.toString(16)).slice(-2); }).join('').toUpperCase();
      hex.innerHTML = 'rgb(' + v.r + ', ' + v.g + ', ' + v.b + ')<br>' + hx + ' &middot; ' +
        bin8(v.r) + ' ' + bin8(v.g) + ' ' + bin8(v.b);
      if (target) judge();
    }

    function judge() {
      var parts = [], worst = 0;
      CH.forEach(function (c) {
        var d = target[c.k] - v[c.k], a = Math.abs(d);
        worst = Math.max(worst, a);
        if (a <= 12) parts.push(c.name + ': just right');
        else parts.push(c.name + ': ' + (d > 0 ? 'raise it' : 'lower it') + (a > 60 ? ' a lot' : ' a bit'));
      });
      if (worst <= 12) {
        game.className = 'nw-game ok';
        game.innerHTML = '<b>Match.</b> Every number is within 12, which is closer than your eye can tell.';
      } else {
        game.className = 'nw-game';
        game.textContent = parts.join(' · ');
      }
    }

    function startGame() {
      target = { r: Math.floor(Math.random() * 256), g: Math.floor(Math.random() * 256), b: Math.floor(Math.random() * 256) };
      swT.hidden = false;
      swT.style.background = 'rgb(' + target.r + ',' + target.g + ',' + target.b + ')';
      game.hidden = false;
      gameBtn.classList.add('on');
      gameBtn.textContent = 'End game';
      judge();
    }
    function endGame() {
      target = null;
      swT.hidden = true;
      game.hidden = true;
      gameBtn.classList.remove('on');
      gameBtn.textContent = 'Match game';
    }

    host.addEventListener('input', function (e) {
      var row = e.target.closest && e.target.closest('[data-ch]');
      if (row && e.target.classList.contains('nw-range')) { v[row.getAttribute('data-ch')] = +e.target.value; update(); }
    });
    host.addEventListener('click', function (e) {
      var bit = e.target.closest && e.target.closest('.nw-bit');
      if (!bit) return;
      var row = bit.closest('[data-ch]'), k = row.getAttribute('data-ch');
      v[k] = v[k] ^ (+bit.getAttribute('data-p'));
      update();
    });
    gameBtn.addEventListener('click', function () { if (target) endGame(); else startGame(); });
    $('.nw-rand', host).addEventListener('click', function () {
      v.r = Math.floor(Math.random() * 256); v.g = Math.floor(Math.random() * 256); v.b = Math.floor(Math.random() * 256);
      update();
    });
    update();
  }

  /* ============================================================
     2. PIXELS: a photo is a grid of color triplets
     ============================================================ */

  var SRC = 96; // source picture is 96 x 96, so every size below divides it exactly
  var SIZES = [4, 8, 12, 16, 32, 96];
  var NUMBERS_MAX = 12;
  var DISPLAY = 384;

  function makeScene() {
    var c = document.createElement('canvas');
    c.width = c.height = SRC;
    var g = c.getContext('2d');
    var sky = g.createLinearGradient(0, 0, 0, 58);
    sky.addColorStop(0, '#1d2b6b'); sky.addColorStop(0.55, '#c2457a'); sky.addColorStop(1, '#ffb347');
    g.fillStyle = sky; g.fillRect(0, 0, SRC, 58);
    g.fillStyle = '#fff3b0'; g.beginPath(); g.arc(68, 51, 9, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1f5c3a'; g.beginPath(); g.moveTo(0, 58); g.quadraticCurveTo(15, 38, 36, 58); g.closePath(); g.fill();
    var sea = g.createLinearGradient(0, 58, 0, SRC);
    sea.addColorStop(0, '#f08a4b'); sea.addColorStop(0.22, '#0e7c9b'); sea.addColorStop(1, '#04384f');
    g.fillStyle = sea; g.fillRect(0, 58, SRC, SRC - 58);
    g.fillStyle = 'rgba(255,230,150,0.55)';
    [[62, 60, 12], [64, 64, 9], [60, 68, 14], [66, 72, 7], [62, 77, 10], [65, 83, 6]].forEach(function (r) {
      g.fillRect(r[0], r[1], r[2], 2);
    });
    g.fillStyle = '#7a1f1f';
    g.beginPath(); g.moveTo(26, 73); g.lineTo(60, 73); g.lineTo(54, 82); g.lineTo(32, 82); g.closePath(); g.fill();
    g.fillStyle = '#e8e8e8'; g.fillRect(43, 48, 2, 25);
    g.fillStyle = '#ffffff';
    g.beginPath(); g.moveTo(46, 50); g.lineTo(46, 71); g.lineTo(60, 71); g.closePath(); g.fill();
    g.fillStyle = '#ffd166';
    g.beginPath(); g.moveTo(42, 56); g.lineTo(42, 71); g.lineTo(30, 71); g.closePath(); g.fill();
    return g.getImageData(0, 0, SRC, SRC);
  }

  function buildPixels(host) {
    var id = host.id;
    var scene = makeScene();
    var N = 8, px = [], sel = { x: 4, y: 5 }, mode = 'color';
    var chan = { r: true, g: true, b: true };
    var dragging = false;

    function sample() {
      var cell = SRC / N;
      px = [];
      for (var y = 0; y < N; y++) {
        for (var x = 0; x < N; x++) {
          var r = 0, g = 0, b = 0;
          for (var j = 0; j < cell; j++) {
            for (var i = 0; i < cell; i++) {
              var o = ((y * cell + j) * SRC + (x * cell + i)) * 4;
              r += scene.data[o]; g += scene.data[o + 1]; b += scene.data[o + 2];
            }
          }
          var n = cell * cell;
          px.push([Math.round(r / n), Math.round(g / n), Math.round(b / n)]);
        }
      }
    }

    var h = '<div class="w-head"><span class="w-tag">Try it</span>' +
      '<span class="w-sub">Click a square to read its three numbers. Then change them.</span></div>' +
      '<div class="nw-grid wide"><div>' +
        '<canvas class="nw-canvas nw-px" width="' + DISPLAY + '" height="' + DISPLAY + '" tabindex="0" ' +
          'role="img" aria-label="A sunset with a sailboat, drawn as a grid of pixels. Arrow keys move between pixels."></canvas>' +
        '<p class="nw-stat"></p>' +
      '</div><div>' +
        '<div class="nw-ctl"><span class="nw-lab">Detail: how many squares</span><span class="nw-sz"></span></div>' +
        '<div class="nw-ctl"><span class="nw-lab">View</span><span class="nw-vw"></span> ' +
          '<span class="nw-chans"><label class="nw-chk"><input type="checkbox" data-c="r" checked> Red</label>' +
          '<label class="nw-chk"><input type="checkbox" data-c="g" checked> Green</label>' +
          '<label class="nw-chk"><input type="checkbox" data-c="b" checked> Blue</label></span></div>' +
        '<div class="nw-insp"><h4 class="nw-ih"></h4>';
    [['r', 'Red', '#ff5c5c'], ['g', 'Green', '#4fe08a'], ['b', 'Blue', '#5cb8ff']].forEach(function (c) {
      h += '<div class="nw-ch" style="--c:' + c[2] + '" data-ch="' + c[0] + '"><div class="nw-ch-top">' +
        '<label class="nw-ch-name" for="' + id + '-p' + c[0] + '">' + c[1] + '</label>' +
        '<input class="nw-range" id="' + id + '-p' + c[0] + '" type="range" min="0" max="255" step="1" value="0">' +
        '<output class="nw-num"></output><span class="nw-bin"></span></div></div>';
    });
    h += '</div>' +
        '<div class="nw-ctl"><span class="nw-lab">Do math on every number in the picture</span>' +
        '<div class="nw-ops">' +
          '<button class="nw-chip" type="button" data-op="bright">Brighter (+40)</button>' +
          '<button class="nw-chip" type="button" data-op="dark">Darker (&minus;40)</button>' +
          '<button class="nw-chip" type="button" data-op="invert">Invert (255 &minus; n)</button>' +
          '<button class="nw-chip" type="button" data-op="gray">Gray</button>' +
          '<button class="nw-chip" type="button" data-op="reset">Reset</button>' +
        '</div><p class="nw-note" aria-live="polite"></p></div>' +
      '</div></div>' +
      '<p class="w-foot">A phone photo is this, with about twelve million squares. A filter is not magic: it is arithmetic on every number.</p>';
    host.innerHTML = h;

    var cv = $('.nw-px', host), g = cv.getContext('2d');
    var stat = $('.nw-stat', host), note = $('.nw-note', host), ih = $('.nw-ih', host);

    var sizeSeg = seg('Number of squares across', SIZES.map(function (n) { return [n, n + '×' + n]; }), N, function (v) {
      N = +v; sel.x = Math.min(sel.x, N - 1); sel.y = Math.min(sel.y, N - 1);
      sel.x = Math.floor(N / 2); sel.y = Math.floor(N * 0.6);
      sample();
      if (mode === 'numbers' && N > NUMBERS_MAX) { mode = 'color'; viewSeg.set('color'); }
      note.textContent = '';
      sync();
    });
    $('.nw-sz', host).appendChild(sizeSeg.el);

    var viewSeg = seg('View', [['color', 'Color'], ['numbers', 'Numbers']], mode, function (v) {
      mode = v; sync();
    });
    $('.nw-vw', host).appendChild(viewSeg.el);

    function gray(p) { return Math.round(0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]); }

    function draw() {
      var cell = DISPLAY / N;
      g.clearRect(0, 0, DISPLAY, DISPLAY);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = '600 ' + Math.max(8, Math.floor(cell * 0.34)) + 'px "JetBrains Mono", monospace';
      for (var y = 0; y < N; y++) {
        for (var x = 0; x < N; x++) {
          var p = px[y * N + x];
          if (mode === 'numbers') {
            var n = gray(p);
            g.fillStyle = 'rgb(' + n + ',' + n + ',' + n + ')';
            g.fillRect(x * cell, y * cell, cell, cell);
            g.fillStyle = n > 128 ? '#000' : '#fff';
            g.fillText(String(n), x * cell + cell / 2, y * cell + cell / 2 + 1);
          } else {
            g.fillStyle = 'rgb(' + (chan.r ? p[0] : 0) + ',' + (chan.g ? p[1] : 0) + ',' + (chan.b ? p[2] : 0) + ')';
            g.fillRect(x * cell, y * cell, cell, cell);
          }
        }
      }
      // grid lines only when squares are big enough to look like squares
      if (cell >= 24) {
        g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1;
        g.beginPath();
        for (var i = 1; i < N; i++) {
          g.moveTo(Math.round(i * cell) + 0.5, 0); g.lineTo(Math.round(i * cell) + 0.5, DISPLAY);
          g.moveTo(0, Math.round(i * cell) + 0.5); g.lineTo(DISPLAY, Math.round(i * cell) + 0.5);
        }
        g.stroke();
      }
      // selection
      g.lineWidth = cell >= 12 ? 3 : 2;
      g.strokeStyle = '#000';
      g.strokeRect(sel.x * cell + 1, sel.y * cell + 1, cell - 2, cell - 2);
      g.lineWidth = 1.5; g.strokeStyle = '#00e5ff';
      g.strokeRect(sel.x * cell + 1, sel.y * cell + 1, cell - 2, cell - 2);
    }

    function inspect() {
      var p = px[sel.y * N + sel.x];
      ih.innerHTML = 'Pixel <code>column ' + (sel.x + 1) + ', row ' + (sel.y + 1) + '</code>';
      ['r', 'g', 'b'].forEach(function (k, i) {
        var row = $('[data-ch="' + k + '"]', host);
        $('.nw-range', row).value = p[i];
        $('.nw-num', row).textContent = p[i];
        $('.nw-bin', row).textContent = bin8(p[i]);
      });
    }

    function stats() {
      var total = N * N;
      stat.innerHTML = '<b>' + N + ' × ' + N + '</b> = ' + fmt(total) + ' pixels × 3 numbers = <b>' + fmt(total * 3) + ' bytes</b>';
    }

    function sync() {
      var many = N > NUMBERS_MAX;
      viewSeg.btns[1].disabled = many;
      viewSeg.btns[1].title = many ? 'Too many squares to print the numbers, but they are all still there.' : '';
      $$('.nw-chans input', host).forEach(function (c) { c.disabled = mode === 'numbers'; });
      $('.nw-chans', host).style.opacity = mode === 'numbers' ? 0.4 : 1;
      draw(); inspect(); stats();
    }

    function pick(e) {
      var r = cv.getBoundingClientRect();
      var x = Math.floor((e.clientX - r.left) / r.width * N);
      var y = Math.floor((e.clientY - r.top) / r.height * N);
      x = clamp(x, 0, N - 1); y = clamp(y, 0, N - 1);
      if (x !== sel.x || y !== sel.y) { sel.x = x; sel.y = y; draw(); inspect(); }
    }
    cv.addEventListener('pointerdown', function (e) {
      dragging = true;
      try { cv.setPointerCapture(e.pointerId); } catch (err) { /* older browsers */ }
      pick(e);
    });
    cv.addEventListener('pointermove', function (e) { if (dragging) pick(e); });
    cv.addEventListener('pointerup', function () { dragging = false; });
    cv.addEventListener('pointercancel', function () { dragging = false; });
    cv.addEventListener('keydown', function (e) {
      var dx = 0, dy = 0;
      if (e.key === 'ArrowLeft') dx = -1; else if (e.key === 'ArrowRight') dx = 1;
      else if (e.key === 'ArrowUp') dy = -1; else if (e.key === 'ArrowDown') dy = 1;
      else return;
      e.preventDefault(); e.stopPropagation(); // arrows move the pixel, not the slide
      sel.x = clamp(sel.x + dx, 0, N - 1); sel.y = clamp(sel.y + dy, 0, N - 1);
      draw(); inspect();
    });

    host.addEventListener('input', function (e) {
      var t = e.target;
      if (t.classList.contains('nw-range')) {
        var k = t.closest('[data-ch]').getAttribute('data-ch');
        px[sel.y * N + sel.x]['rgb'.indexOf(k)] = +t.value;
        draw(); inspect();
      } else if (t.matches && t.matches('.nw-chans input')) {
        chan[t.getAttribute('data-c')] = t.checked;
        draw();
      }
    });

    var OPS = {
      bright: ['Brighter: added 40 to every number, and stopped at 255 because a byte cannot go higher.', function (n) { return n + 40; }],
      dark: ['Darker: took 40 off every number, and stopped at 0.', function (n) { return n - 40; }],
      invert: ['Invert: every number became 255 minus itself. Black and white swapped.', function (n) { return 255 - n; }]
    };
    host.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-op]');
      if (!b) return;
      var op = b.getAttribute('data-op');
      if (op === 'reset') { sample(); note.textContent = 'Back to the original numbers.'; }
      else if (op === 'gray') {
        px.forEach(function (p) { var n = gray(p); p[0] = p[1] = p[2] = n; });
        note.textContent = 'Gray: red, green and blue all set to the same number, so there is no color left.';
      } else {
        px.forEach(function (p) { for (var i = 0; i < 3; i++) p[i] = clamp(OPS[op][1](p[i]), 0, 255); });
        note.textContent = OPS[op][0];
      }
      draw(); inspect();
    });

    sample();
    sync();
  }

  /* ============================================================
     3. SOUND: one number, measured over and over
     ============================================================ */

  function buildSound(host) {
    var st = { shape: 'sine', freq: 220, rate: 8000, bits: 8 };
    var drawn = [], i;
    for (i = 0; i < 128; i++) drawn.push(Math.sin(2 * Math.PI * i / 128));
    var WINDOW = 0.012; // the picture shows 12 thousandths of a second
    var ac = null, src = null, playing = false;

    var h = '<div class="w-head"><span class="w-tag">Try it</span>' +
      '<span class="w-sub">Turn your volume down first. Then change how the sound is measured and listen.</span></div>' +
      '<div class="nw-two">' +
        '<canvas class="nw-canvas nw-wave" role="img" aria-label="A sound wave, with the measured samples drawn on it"></canvas>' +
        '<div class="nw-padwrap" hidden><span class="nw-lab" style="font-size:12.5px;color:var(--text-3)">Draw one repeat of your own wave. Click and drag.</span>' +
          '<canvas class="nw-canvas nw-pad" role="img" aria-label="Drawing area for your own wave"></canvas></div>' +
      '</div>' +
      '<div class="nw-grid" style="margin-top:14px;grid-template-columns:repeat(auto-fit,minmax(210px,1fr))">' +
        '<div class="nw-ctl"><span class="nw-lab">Wave shape</span><span class="nw-sh"></span></div>' +
        '<div class="nw-ctl"><label for="' + host.id + '-f">Pitch: <b class="nw-fv"></b></label>' +
          '<input class="nw-range" style="--c:var(--accent);width:100%" id="' + host.id + '-f" type="range" min="110" max="880" step="1" value="' + st.freq + '"></div>' +
        '<div class="nw-ctl"><span class="nw-lab">Measurements per second: <b class="nw-rv"></b></span><span class="nw-rs"></span></div>' +
        '<div class="nw-ctl"><span class="nw-lab">Detail of each number: <b class="nw-bv"></b></span><span class="nw-bs"></span></div>' +
      '</div>' +
      '<div class="nw-playrow"><button class="w-btn nw-play" type="button">Play 1 second</button>' +
      '<div class="nw-strip" aria-label="The first numbers that are stored"></div></div>' +
      '<p class="nw-stat"></p>' +
      '<p class="w-foot">Gold dots are the numbers the computer keeps. The bright line is what gets played back from them. The faint line is the real sound they were measured from. A phone call uses 8,000 measurements a second; a CD uses 44,100.</p>';
    host.innerHTML = h;

    var cv = $('.nw-wave', host), pad = $('.nw-pad', host), padWrap = $('.nw-padwrap', host);
    var strip = $('.nw-strip', host), stat = $('.nw-stat', host), playBtn = $('.nw-play', host);
    var fRange = $('input[type=range]', host);

    var shapeSeg = seg('Wave shape', [['sine', 'Smooth'], ['square', 'Buzzy'], ['saw', 'Sawtooth'], ['draw', 'Draw it']], st.shape, function (v) {
      st.shape = v; padWrap.hidden = v !== 'draw'; redraw();
    });
    $('.nw-sh', host).appendChild(shapeSeg.el);
    var rateSeg = seg('Measurements per second', [[500, '500'], [1000, '1,000'], [4000, '4,000'], [8000, '8,000'], [44100, '44,100']], st.rate, function (v) {
      st.rate = +v; redraw();
    });
    $('.nw-rs', host).appendChild(rateSeg.el);
    var bitsSeg = seg('Bits per number', [[2, '2 bits'], [4, '4 bits'], [8, '8 bits'], [16, '16 bits']], st.bits, function (v) {
      st.bits = +v; redraw();
    });
    $('.nw-bs', host).appendChild(bitsSeg.el);

    function wave(p) {
      p = p - Math.floor(p);
      if (st.shape === 'sine') return Math.sin(2 * Math.PI * p);
      if (st.shape === 'square') return p < 0.5 ? 0.8 : -0.8;
      if (st.shape === 'saw') return 0.9 * (2 * p - 1);
      var x = p * 128, i0 = Math.floor(x) % 128, f = x - Math.floor(x);
      return drawn[i0] * (1 - f) + drawn[(i0 + 1) % 128] * f;
    }
    function levels() { return Math.pow(2, st.bits) - 1; }
    function toInt(v) { return Math.round((clamp(v, -1, 1) * 0.5 + 0.5) * levels()); }
    function fromInt(q) { return q / levels() * 2 - 1; }
    function sampleInt(k) { return toInt(wave(k / st.rate * st.freq)); }

    function waveH() {
      return document.body.classList.contains('present')
        ? clamp(Math.round(window.innerHeight * 0.17), 105, 190) : 230;
    }

    function redraw() {
      var s = sizeCanvas(cv, waveH()), g = s.g, W = s.w, H = s.h;
      var mid = H / 2, amp = H / 2 - 16;
      g.clearRect(0, 0, W, H);
      // grid: a line every 2 ms
      g.font = '11px "JetBrains Mono", monospace'; g.textBaseline = 'alphabetic';
      g.strokeStyle = 'rgba(255,255,255,0.07)'; g.fillStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1;
      for (var ms = 0; ms <= 12; ms += 2) {
        var gx = Math.round(ms / 1000 / WINDOW * W) + 0.5;
        g.beginPath(); g.moveTo(gx, 0); g.lineTo(gx, H - 14); g.stroke();
        g.textAlign = ms === 12 ? 'right' : 'left';
        g.fillText(ms + ' ms', ms === 12 ? W - 3 : gx + 3, H - 3);
      }
      g.beginPath(); g.moveTo(0, mid + 0.5); g.lineTo(W, mid + 0.5); g.stroke();
      var X = function (t) { return t / WINDOW * W; };
      var Y = function (v) { return mid - v * amp; };

      // the real sound
      g.strokeStyle = 'rgba(255,255,255,0.28)'; g.lineWidth = 1.5;
      g.beginPath();
      for (var px = 0; px <= W; px += 2) {
        var t = px / W * WINDOW, y = Y(wave(t * st.freq));
        if (px === 0) g.moveTo(px, y); else g.lineTo(px, y);
      }
      g.stroke();

      // the stored numbers, played back as held steps
      var count = Math.floor(WINDOW * st.rate) + 1;
      g.strokeStyle = '#00e5ff'; g.lineWidth = 2; g.lineJoin = 'round';
      g.beginPath();
      for (var k = 0; k < count; k++) {
        var yv = Y(fromInt(sampleInt(k))), x0 = X(k / st.rate), x1 = X((k + 1) / st.rate);
        if (k === 0) g.moveTo(x0, yv); else g.lineTo(x0, yv);
        g.lineTo(Math.min(x1, W), yv);
      }
      g.stroke();

      // the dots
      var dense = count > 160;
      g.fillStyle = '#ffc857'; g.strokeStyle = 'rgba(255,200,87,0.5)'; g.lineWidth = 1;
      for (k = 0; k < count; k++) {
        var dx = X(k / st.rate), dy = Y(fromInt(sampleInt(k)));
        if (!dense) { g.beginPath(); g.moveTo(dx, mid); g.lineTo(dx, dy); g.stroke(); }
        g.beginPath(); g.arc(dx, dy, dense ? 1.2 : 3.2, 0, Math.PI * 2); g.fill();
      }

      // labels and numbers
      $('.nw-fv', host).textContent = st.freq + ' repeats per second';
      $('.nw-rv', host).textContent = fmt(st.rate) + (st.rate >= 44100 ? ' (CD)' : st.rate === 8000 ? ' (phone)' : st.rate < 1500 ? ' (too slow)' : '');
      $('.nw-bv', host).textContent = fmt(Math.pow(2, st.bits)) + ' levels';
      var nums = '';
      for (k = 0; k < 10; k++) nums += '<span>' + sampleInt(k) + '</span>';
      strip.innerHTML = nums + '<em>and so on, ' + fmt(st.rate) + ' every second</em>';
      var bytes = st.rate * st.bits / 8;
      stat.innerHTML = 'One second is <b>' + fmt(st.rate) + '</b> numbers × <b>' + st.bits + '</b> bits = <b>' + fmt(bytes) + ' bytes</b>.';
      if (pad && !padWrap.hidden) drawPad();
    }

    function drawPad() {
      var s = sizeCanvas(pad, 96), g = s.g, W = s.w, H = s.h;
      g.clearRect(0, 0, W, H);
      g.strokeStyle = 'rgba(255,255,255,0.1)'; g.beginPath(); g.moveTo(0, H / 2 + 0.5); g.lineTo(W, H / 2 + 0.5); g.stroke();
      g.strokeStyle = '#00e5ff'; g.lineWidth = 2; g.beginPath();
      for (var i = 0; i < 128; i++) {
        var x = i / 127 * W, y = H / 2 - drawn[i] * (H / 2 - 8);
        if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.stroke();
    }

    // drawing your own wave
    var last = null;
    function padPoint(e) {
      var r = pad.getBoundingClientRect();
      var i = clamp(Math.round((e.clientX - r.left) / r.width * 127), 0, 127);
      var v = clamp(((r.top + r.height / 2) - e.clientY) / (r.height / 2 - 8), -1, 1);
      if (last && last.i !== i) {
        var a = last, b = { i: i, v: v }, step = i > a.i ? 1 : -1;
        for (var j = a.i; j !== i + step; j += step) drawn[j] = a.v + (b.v - a.v) * ((j - a.i) / (i - a.i));
      } else drawn[i] = v;
      last = { i: i, v: v };
      redraw();
    }
    pad.addEventListener('pointerdown', function (e) {
      try { pad.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      last = null; padPoint(e);
    });
    pad.addEventListener('pointermove', function (e) { if (e.buttons || last) { if (e.buttons) padPoint(e); } });
    pad.addEventListener('pointerup', function () { last = null; });
    pad.addEventListener('pointercancel', function () { last = null; });

    fRange.addEventListener('input', function () { st.freq = +fRange.value; redraw(); });

    function stop() {
      if (src) { try { src.stop(); } catch (e) { /* already stopped */ } src = null; }
      playing = false; playBtn.textContent = 'Play 1 second';
    }
    playBtn.addEventListener('click', function () {
      if (playing) { stop(); return; }
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { playBtn.textContent = 'No sound support here'; return; }
      ac = ac || new AC();
      if (ac.resume) ac.resume();
      var SR = 44100, n = SR, buf = ac.createBuffer(1, n, SR), d = buf.getChannelData(0);
      var fade = Math.floor(SR * 0.02);
      for (var k = 0; k < n; k++) {
        var sampleIndex = Math.floor(k / SR * st.rate);        // which stored number is current
        var v = fromInt(sampleInt(sampleIndex));                // held until the next one arrives
        var env = Math.min(1, k / fade, (n - 1 - k) / fade);
        d[k] = v * env * 0.5;
      }
      src = ac.createBufferSource();
      src.buffer = buf;
      var gain = ac.createGain(); gain.gain.value = 0.25;
      src.connect(gain); gain.connect(ac.destination);
      src.onended = function () { playing = false; src = null; playBtn.textContent = 'Play 1 second'; };
      src.start();
      playing = true; playBtn.textContent = 'Stop';
    });
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); });

    onResize(host, redraw);
    if (window.MutationObserver) new MutationObserver(redraw).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    redraw();
  }

  /* ============================================================
     4. DESK AND CABINET: why unsaved work dies
     ============================================================ */

  function buildDesk(host) {
    var KEY = 'tib-desk-cabinet-v1';
    var cab = null, auto = false, timer = null, busy = false, offTimer = null;
    try { var raw = localStorage.getItem(KEY); if (raw) cab = JSON.parse(raw); } catch (e) { cab = null; }

    host.innerHTML =
      '<div class="w-head"><span class="w-tag">Try it</span>' +
      '<span class="w-sub">Type on the desk. Then see what survives a power cut.</span></div>' +
      '<div class="nw-deskgrid">' +
        '<div class="nw-zone nw-zdesk"><h4>The desk <span>memory (RAM)</span></h4>' +
          '<p class="nw-zsub">Fast. Small. Wiped when the power goes.</p>' +
          '<textarea class="nw-ta" rows="4" maxlength="400" autocomplete="off" spellcheck="false" ' +
            'aria-label="Your document, open on the desk" placeholder="Type something. This document is open on the desk."></textarea>' +
          '<p class="nw-dirty" aria-live="polite"></p>' +
          '<div class="nw-off" hidden>No power</div>' +
        '</div>' +
        '<div class="nw-zone nw-zcab"><h4>The filing cabinet <span>storage (drive)</span></h4>' +
          '<p class="nw-zsub">Slower. Huge. Still there tomorrow.</p>' +
          '<div class="nw-file"></div>' +
        '</div>' +
      '</div>' +
      '<div class="nw-ops">' +
        '<button class="w-btn nw-save" type="button">Save to cabinet</button>' +
        '<button class="w-btn ghost nw-open" type="button">Open from cabinet</button>' +
        '<button class="w-btn warn nw-cut" type="button">Cut the power</button>' +
        '<label class="nw-chk"><input type="checkbox" class="nw-auto"> Autosave</label>' +
      '</div>' +
      '<p class="nw-note nw-msg" aria-live="polite"></p>' +
      '<p class="w-foot">Nothing you type here leaves this page. The cabinet is kept on this device only.</p>';

    var ta = $('.nw-ta', host), dirty = $('.nw-dirty', host), file = $('.nw-file', host);
    var msg = $('.nw-msg', host), off = $('.nw-off', host), zdesk = $('.nw-zdesk', host);
    var bSave = $('.nw-save', host), bOpen = $('.nw-open', host), bCut = $('.nw-cut', host);

    function when() { return new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); }
    function snippet(t) { return t.length > 64 ? t.slice(0, 64) + '…' : t; }

    function drawCab() {
      if (!cab) { file.innerHTML = '<div class="nw-doc empty">Empty drawer</div>'; return; }
      file.innerHTML = '<div class="nw-doc"><b>My document</b><span>saved ' + esc(cab.time) + '</span>' +
        '<em>' + (cab.text ? '“' + esc(snippet(cab.text)) + '”' : '(blank)') + '</em></div>';
    }
    function drawDirty() {
      var t = ta.value;
      if (!t && !cab) dirty.textContent = '';
      else if (cab && cab.text === t) dirty.innerHTML = '<span class="nw-ok">Saved.</span> A copy is in the cabinet.';
      else if (t) dirty.innerHTML = '<span class="nw-bad">Not saved.</span> This exists only on the desk.';
      else dirty.textContent = '';
    }
    function say(t) { msg.textContent = t; }
    function save(silent) {
      cab = { text: ta.value, time: when() };
      try { localStorage.setItem(KEY, JSON.stringify(cab)); } catch (e) { /* kept in this page only */ }
      drawCab(); drawDirty();
      file.classList.remove('flash'); void file.offsetWidth; file.classList.add('flash');
      say(silent ? 'Autosave copied the desk into the cabinet.' : 'Copied from the desk into the cabinet.');
    }
    function lock(on) { busy = on; [bSave, bOpen, bCut, ta].forEach(function (el) { el.disabled = on; }); }

    ta.addEventListener('input', function () {
      drawDirty();
      if (auto) { clearTimeout(timer); timer = setTimeout(function () { save(true); }, 700); }
    });
    $('.nw-auto', host).addEventListener('change', function (e) {
      auto = e.target.checked;
      if (auto) { say('Autosave is on. Every few moments the desk is copied into the cabinet for you.'); if (ta.value) save(true); }
      else say('Autosave is off. Nothing reaches the cabinet unless you save.');
    });
    bSave.addEventListener('click', function () { if (!busy) save(false); });
    bOpen.addEventListener('click', function () {
      if (busy) return;
      if (!cab) { say('The cabinet is empty. Save something first.'); return; }
      lock(true); say('Fetching from the cabinet…');
      setTimeout(function () {
        ta.value = cab.text; lock(false); drawDirty();
        say('Copied from the cabinet onto the desk. Notice the wait: storage is slower than memory.');
      }, 900);
    });
    bCut.addEventListener('click', function () {
      if (busy) return;
      var had = ta.value, saved = cab && cab.text === had;
      lock(true); clearTimeout(timer);
      zdesk.classList.add('dead'); off.hidden = false;
      say('');
      clearTimeout(offTimer);
      offTimer = setTimeout(function () {
        ta.value = ''; zdesk.classList.remove('dead'); off.hidden = true; lock(false); drawDirty();
        if (!had) say('The desk was already empty. The cabinet is untouched.');
        else if (saved) say('The desk is empty, but nothing was lost: you had saved. Open it from the cabinet to bring it back.');
        else if (cab) say('The desk is empty. Everything you typed since your last save is gone. The older save is still in the cabinet.');
        else say('The desk is empty and the cabinet has nothing. That text is gone for good: it never left memory.');
      }, 1100);
    });
    drawCab(); drawDirty();
    if (cab) say('The cabinet already has a saved document from earlier. Open it, or type something new.');
  }

  /* ============================================================
     5. CPU LAB: the stepper, with a dial and a guess
     ============================================================ */

  function buildCpuLab(host) {
    var N = 4, s, timer = null;

    function program() {
      return [
        { src: 'set count = 0', run: function (st) { st.vars.count = 0; } },
        { src: 'set total = 0', run: function (st) { st.vars.total = 0; } },
        { src: 'repeat while count < ' + N, run: function (st) { if (!(st.vars.count < N)) { st.pc = 6; return true; } } },
        { src: '    total = total + count', run: function (st) { st.vars.total += st.vars.count; } },
        { src: '    count = count + 1', run: function (st) { st.vars.count += 1; } },
        { src: '    go back and check again', run: function (st) { st.pc = 2; return true; } },
        { src: 'print total', run: function (st) { st.out.push(String(st.vars.total)); } }
      ];
    }
    var prog = program();

    host.innerHTML =
      '<div class="w-head"><span class="w-tag">Try it</span>' +
      '<span class="w-sub">Pick how many numbers to add, guess the steps, then step through.</span></div>' +
      '<div class="nw-cpuctl">' +
        '<div class="nw-ctl"><label for="' + host.id + '-n">Count up to: <b class="nw-nv"></b></label>' +
          '<input class="nw-range" style="--c:var(--accent);width:100%" id="' + host.id + '-n" type="range" min="1" max="10" step="1" value="4"></div>' +
        '<div class="nw-ctl"><label for="' + host.id + '-g">Your guess: how many steps?</label>' +
          '<input class="w-input nw-guess" id="' + host.id + '-g" type="number" inputmode="numeric" min="0" max="999" placeholder="a number"></div>' +
      '</div>' +
      '<div class="w-cpu"><ol class="w-code"></ol><div class="w-side"><div class="w-mem"></div>' +
        '<div class="w-out"><b>Output</b><pre></pre></div></div></div>' +
      '<div class="nw-playrow"><button class="w-btn" type="button" data-act="step">Step</button>' +
        '<button class="w-btn ghost" type="button" data-act="run">Run it</button>' +
        '<button class="w-btn ghost" type="button" data-act="reset">Reset</button>' +
        '<span class="nw-stat nw-count" style="margin:0"></span></div>' +
      '<p class="nw-note nw-verdict" aria-live="polite"></p>' +
      '<p class="w-foot">Your laptop does this a few billion times a second. Not cleverer than you. Just relentless.</p>';

    var codeEl = $('.w-code', host), memEl = $('.w-mem', host), outEl = $('.w-out pre', host);
    var nv = $('.nw-nv', host), cnt = $('.nw-count', host), verdict = $('.nw-verdict', host), guess = $('.nw-guess', host);
    var nRange = $('input[type=range]', host);

    function reset() {
      if (timer) { clearInterval(timer); timer = null; }
      s = { pc: 0, vars: {}, out: [], done: false, steps: 0 };
      verdict.textContent = '';
      draw();
    }
    function draw() {
      codeEl.innerHTML = prog.map(function (line, i) {
        return '<li class="' + (i === s.pc && !s.done ? 'now' : '') + '"><code>' + esc(line.src) + '</code></li>';
      }).join('');
      var names = Object.keys(s.vars);
      memEl.innerHTML = '<b>Memory</b>' + (names.length
        ? '<table><tbody>' + names.map(function (k) {
            return '<tr><td><code>' + esc(k) + '</code></td><td>' + s.vars[k] + '</td></tr>'; }).join('') + '</tbody></table>'
        : '<p class="w-foot">nothing stored yet</p>');
      outEl.textContent = s.out.join('\n');
      nv.textContent = N + (N === 4 ? ' (the original)' : '');
      cnt.innerHTML = 'Steps so far: <b>' + s.steps + '</b>';
    }
    function finish() {
      var rule = '4 steps for every number, plus 4 more = ' + (4 * N + 4) + '.';
      var g = guess.value === '' ? null : +guess.value;
      if (g === null) verdict.textContent = 'Finished in ' + s.steps + ' steps. The rule: ' + rule;
      else if (g === s.steps) verdict.textContent = 'You guessed ' + g + ' and it took ' + s.steps + '. Exactly right. The rule: ' + rule;
      else verdict.textContent = 'You guessed ' + g + ' and it took ' + s.steps + '. The rule: ' + rule;
    }
    function step() {
      if (s.done) return;
      var line = prog[s.pc];
      s.steps++;
      var jumped = line.run(s);
      if (!jumped) s.pc++;
      if (s.pc >= prog.length) { s.done = true; draw(); finish(); return; }
      draw();
    }
    nRange.addEventListener('input', function () { N = +nRange.value; prog = program(); guess.value = ''; reset(); });
    host.addEventListener('click', function (e) {
      var act = e.target.getAttribute && e.target.getAttribute('data-act');
      if (act === 'step') { if (timer) { clearInterval(timer); timer = null; } step(); }
      else if (act === 'reset') reset();
      else if (act === 'run') {
        if (timer) { clearInterval(timer); timer = null; return; }
        if (s.done) reset();
        timer = setInterval(function () { step(); if (s.done) { clearInterval(timer); timer = null; } }, N <= 4 ? 420 : N <= 6 ? 260 : 140);
      }
    });
    reset();
  }

  /* ============================================================
     6. SORT THE PARTS: practice for the lab audit
     ============================================================ */

  var JOBS = [['input', 'Input'], ['processing', 'Processing'], ['output', 'Output'], ['storage', 'Storage']];
  var BOTH = ['input', 'output'];
  var MACHINES = [
    ['Glowforge', [
      ['Lid camera', ['input'], null, 'It photographs the material so you can place your design on it.'],
      ['The design file, sent over Wi-Fi', ['input'], null, 'A file coming in is input, the same as a keystroke.'],
      ['The glowing start button', ['input'], null, 'One press tells it to begin.'],
      ['Control board', ['processing'], null, 'It reads the file and works out where the laser must go.'],
      ['Laser tube', ['output'], null, 'Output is not only pixels. Here it is light that cuts.'],
      ['Motors that move the laser head', ['output'], null, 'Moving something in the real world is output.'],
      ['Your saved designs, in your online account', ['storage'], null, 'The awkward one: the storage is online, not inside the machine. Where would you say it lives?']
    ]],
    ['RoboMaster S1', [
      ['Camera on the gimbal', ['input'], null, 'It sees. Input, even though the robot uses it to make decisions.'],
      ['Hit sensors on the armor', ['input'], null, 'They feel impacts, and a sensor is always input.'],
      ['Commands from the app on your phone', ['input'], null, 'Whatever tells the machine what to do is input.'],
      ['Main controller board', ['processing'], null, 'It runs your program and decides what the motors do.'],
      ['Wheel and gimbal motors', ['output'], null, 'The robot moves. That is output.'],
      ['The gel bead launcher', ['output'], null, 'Output does not have to be on a screen.'],
      ['The program you wrote', ['storage', 'processing'], ['storage'], 'The awkward one. It is stored, then read as instructions. "Not sure, because" is a good answer here.']
    ]],
    ['micro:bit', [
      ['Buttons A and B', ['input'], null, 'A press is a signal coming in.'],
      ['Accelerometer (feels tilt and shake)', ['input'], null, 'A sensor. Input.'],
      ['The 25 LED lights', ['output'], null, 'The screen is made of lights, and lights are output.'],
      ['The processor chip', ['processing'], null, 'It reads your program one instruction at a time.'],
      ['Flash memory that holds your program', ['storage'], null, 'It is tiny, but storage does not have to be big. It keeps your program when the power is off.'],
      ['Radio (talks to other micro:bits)', BOTH, BOTH, 'Both: it sends and it receives. One part can do two jobs.'],
      ['Pins along the bottom edge', BOTH, BOTH, 'You choose. A sensor plugged in is input, a motor or light is output.']
    ]],
    ['Raspberry Pi', [
      ['USB ports for keyboard and mouse', ['input'], null, 'Keys and clicks come in through here.'],
      ['HDMI port to a screen', ['output'], null, 'The picture goes out through here.'],
      ['The processor chip', ['processing'], null, 'It does the instructions.'],
      ['RAM chips', ['processing'], null, 'Working memory is the desk. It sits with processing, because that is where the work happens.'],
      ['The microSD card', ['storage'], null, 'Most Pi models start up from it. Take it out and the Pi has nothing to run.'],
      ['Wi-Fi', BOTH, BOTH, 'Both: data comes in and goes out.'],
      ['GPIO pins', BOTH, BOTH, 'Like the micro:bit pins. Input or output, depending on what you connect.']
    ]],
    ['A laptop', [
      ['Keyboard and trackpad', ['input'], null, 'You push, it listens.'],
      ['Webcam and microphone', ['input'], null, 'They bring the room in as numbers.'],
      ['Screen and speakers', ['output'], null, 'Pixels and sound going out.'],
      ['The CPU', ['processing'], null, 'It reads and does the instructions.'],
      ['RAM', ['processing'], null, 'The desk. It belongs with processing, because that is where the work happens.'],
      ['The drive (SSD or flash)', ['storage'], null, 'The filing cabinet. It is still there when the power is off.'],
      ['Wi-Fi', BOTH, BOTH, 'Both: data comes in and goes out.']
    ]]
  ];

  function buildParts(host) {
    var cur = 0, picks = [], checked = false;
    MACHINES.forEach(function (m) { picks.push(m[1].map(function () { return {}; })); });

    host.innerHTML =
      '<div class="w-head"><span class="w-tag">Warm-up</span>' +
      '<span class="w-sub">Pick a machine. For each part, tap the job it does. A part can do more than one.</span></div>' +
      '<div class="nw-ctl"><span class="nw-lab">Machine</span><span class="nw-ms"></span></div>' +
      '<div class="nw-parts"></div>' +
      '<div class="nw-ops"><button class="w-btn nw-check" type="button">Check my card</button>' +
        '<button class="w-btn ghost nw-clear" type="button">Clear</button></div>' +
      '<p class="nw-note nw-sum" aria-live="polite"></p><p class="nw-detail" aria-live="polite"></p>';

    var list = $('.nw-parts', host), sum = $('.nw-sum', host), detail = $('.nw-detail', host);
    var mseg = seg('Machine', MACHINES.map(function (m, i) { return [i, m[0]]; }), cur, function (v) {
      cur = +v; checked = false; render();
    });
    $('.nw-ms', host).appendChild(mseg.el);

    function ok(part, set) {
      var chosen = Object.keys(set).filter(function (k) { return set[k]; });
      if (!chosen.length) return false;
      var allowed = part[1], need = part[2] || [];
      return chosen.every(function (k) { return allowed.indexOf(k) > -1; }) &&
        need.every(function (k) { return chosen.indexOf(k) > -1; });
    }

    function render() {
      var parts = MACHINES[cur][1], html = '';
      parts.forEach(function (p, i) {
        html += '<div class="nw-part" data-i="' + i + '"><span class="nw-pn">' + esc(p[0]) + '</span><span class="nw-pj">';
        JOBS.forEach(function (j) {
          html += '<button class="nw-jb" type="button" data-j="' + j[0] + '" aria-pressed="' + (!!picks[cur][i][j[0]]) + '">' + j[1] + '</button>';
        });
        html += '</span><p class="nw-pr" hidden></p></div>';
      });
      list.innerHTML = html;
      sum.textContent = ''; detail.textContent = '';
    }

    list.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('.nw-jb');
      if (!b) return;
      var row = b.closest('.nw-part'), i = +row.getAttribute('data-i'), j = b.getAttribute('data-j');
      picks[cur][i][j] = !picks[cur][i][j];
      b.setAttribute('aria-pressed', String(!!picks[cur][i][j]));
      if (checked) { row.classList.remove('ok', 'bad'); $('.nw-pr', row).hidden = true; sum.textContent = ''; detail.textContent = ''; checked = false; }
    });
    $('.nw-check', host).addEventListener('click', function () {
      var parts = MACHINES[cur][1], right = 0, blank = 0, firstBad = -1;
      parts.forEach(function (p, i) {
        var row = $('[data-i="' + i + '"]', list), good = ok(p, picks[cur][i]);
        var any = Object.keys(picks[cur][i]).some(function (k) { return picks[cur][i][k]; });
        if (!any) blank++;
        if (good) right++; else if (firstBad < 0) firstBad = i;
        row.classList.toggle('ok', good); row.classList.toggle('bad', !good);
        var pr = $('.nw-pr', row);
        pr.hidden = false;
        pr.textContent = (good ? 'Yes. ' : (any ? 'Not quite. ' : 'Pick a job. ')) + p[3];
      });
      checked = true;
      sum.textContent = right + ' of ' + parts.length + ' right.' + (right === parts.length ? ' That is a finished card.' : ' Fix the ones that are off, then check again.');
      detail.innerHTML = firstBad < 0 ? '' : 'Start with <b>' + esc(parts[firstBad][0]) + '</b>: ' + esc(parts[firstBad][3]);
    });
    $('.nw-clear', host).addEventListener('click', function () {
      picks[cur] = MACHINES[cur][1].map(function () { return {}; }); checked = false; render();
    });
    render();
  }

  /* ---------- start up ---------- */
  function init() {
    $$('[data-widget]').forEach(function (host) {
      var kind = host.getAttribute('data-widget');
      if (['color', 'pixels', 'sound', 'desk', 'cpulab', 'parts'].indexOf(kind) < 0) return;
      if (!host.id) host.id = 'nw-' + (++uid);
      try {
        if (kind === 'color') buildColor(host);
        else if (kind === 'pixels') buildPixels(host);
        else if (kind === 'sound') buildSound(host);
        else if (kind === 'desk') buildDesk(host);
        else if (kind === 'cpulab') buildCpuLab(host);
        else buildParts(host);
      } catch (err) {
        if (window.console) console.error('numbers lab widget failed:', kind, err);
        host.textContent = '';
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
