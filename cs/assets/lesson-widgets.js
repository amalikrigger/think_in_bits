/* ============================================================
   THINK IN BITS - CS lesson widgets

   Every widget is opt-in via a data-widget attribute and degrades
   to nothing if this file fails to load. Widgets work in both Read
   and Present mode, so an activity can be run live with the class
   or worked through alone.

   Widgets:
     data-widget="strength"    live password strength, computed locally
     data-widget="passphrase"  passphrase generator, feeds a strength meter
     data-widget="inbox"       phishing triage, scored
     data-widget="push"        git push simulator, shows a key leaking
     data-widget="choice"      click-to-answer question with feedback
     .turnin                   persistent checklist with progress
   ============================================================ */
(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  function store(key, val) {
    try {
      if (val === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, val);
    } catch (e) { return null; }
  }

  var PAGE = location.pathname.replace(/[^a-z0-9]/gi, '-');

  /* ============================================================
     1. PASSWORD STRENGTH, computed in this page and never sent anywhere
     ============================================================ */

  var COMMON = ['password','123456','12345678','qwerty','abc123','letmein','monkey',
    'dragon','baseball','football','iloveyou','admin','welcome','login','princess',
    'sunshine','master','shadow','superman','trustno1','passw0rd','starwars'];

  // Assumed attacker speed. Stated on the page so the number is not magic.
  var GUESSES_PER_SEC = 1e11;

  function poolSize(pw) {
    var n = 0;
    if (/[a-z]/.test(pw)) n += 26;
    if (/[A-Z]/.test(pw)) n += 26;
    if (/[0-9]/.test(pw)) n += 10;
    if (/[^a-zA-Z0-9]/.test(pw)) n += 33;
    return n || 1;
  }

  function analyze(pw) {
    if (!pw) return { bits: 0, seconds: 0, label: 'Type something', level: 0, note: '' };

    var lower = pw.toLowerCase();
    var bits = pw.length * (Math.log(poolSize(pw)) / Math.log(2));
    var note = '';

    // Separator-joined words behave like a passphrase: count words, not characters.
    var words = lower.split(/[^a-z]+/).filter(function (w) { return w.length > 2; });
    if (words.length >= 3) {
      var phraseBits = words.length * (Math.log(2000) / Math.log(2));
      if (phraseBits > bits) bits = phraseBits;
      note = words.length + ' words';
    }

    // Real attackers do not brute force. They run wordlists through substitution
    // and suffix rules first, so Tr0ub4dor&3 and basketball2024 fall about as fast
    // as the bare word does. Without this, the meter would teach the exact
    // misconception the lesson exists to break.
    var deleet = lower
      .replace(/0/g, 'o').replace(/4/g, 'a').replace(/3/g, 'e').replace(/1/g, 'i')
      .replace(/5/g, 's').replace(/7/g, 't').replace(/@/g, 'a')
      .replace(/\$/g, 's').replace(/!/g, 'i');
    var core = deleet.replace(/[^a-z]/g, '');

    // One word-shaped chunk plus decorations. Capped at 14 letters so a long
    // run-together passphrase like correcthorsebatterystaple is not punished.
    if (words.length < 2 && core.length >= 4 && core.length <= 14) {
      bits = Math.min(bits, 34);
      note = 'one word plus a few extras, which cracking tools try before anything else';
    }

    for (var i = 0; i < COMMON.length; i++) {
      if (lower.indexOf(COMMON[i]) !== -1 || deleet.indexOf(COMMON[i]) !== -1) {
        bits = Math.min(bits, 8);
        note = 'contains a password from the leaked lists';
        break;
      }
    }
    if (/^[0-9]+$/.test(pw)) { bits = Math.min(bits, pw.length * 3.3); note = 'digits only'; }
    if (/(.)\1{2,}/.test(pw)) { bits = Math.min(bits, 20); note = 'the same character repeated'; }
    if (/^(abc|qwe|asd|zxc|123)/i.test(pw)) { bits = Math.min(bits, 14); note = 'starts with a keyboard run'; }
    bits = Math.max(bits, 1);

    var seconds = Math.pow(2, bits) / 2 / GUESSES_PER_SEC;

    // Label and number must always agree, so both come off the same scale.
    var label, level;
    if (seconds < 1)          { label = 'Instant';    level = 1; }
    else if (seconds < 60)    { label = 'Seconds';    level = 1; }
    else if (seconds < 3600)  { label = 'Minutes';    level = 1; }
    else if (seconds < 86400) { label = 'Hours';      level = 2; }
    else if (seconds < 3.154e7)  { label = 'Days';    level = 3; }
    else if (seconds < 3.154e9)  { label = 'Years';   level = 4; }
    else if (seconds < 3.154e11) { label = 'Centuries'; level = 5; }
    else { label = 'Longer than the universe has existed'; level = 5; }

    return { bits: bits, seconds: seconds, label: label, level: level, note: note };
  }

  function humanTime(s) {
    if (s < 1) return 'less than a second';
    var units = [['second', 'seconds', 1], ['minute', 'minutes', 60], ['hour', 'hours', 3600],
                 ['day', 'days', 86400], ['year', 'years', 3.154e7],
                 ['century', 'centuries', 3.154e9]];
    for (var i = units.length - 1; i >= 0; i--) {
      var v = s / units[i][2];
      if (v >= 1) {
        if (v >= 1e6) return v.toExponential(1).replace('e+', ' x 10^') + ' ' + units[i][1];
        var num = v < 10 ? v.toFixed(1) : Math.round(v).toLocaleString();
        return num + ' ' + (v >= 2 ? units[i][1] : units[i][0]);
      }
    }
    return 'less than a second';
  }

  function buildStrength(host) {
    host.innerHTML =
      '<div class="w-head"><span class="w-tag">Try it</span>' +
      '<span class="w-sub">Runs in this page. Nothing you type is sent anywhere.</span></div>' +
      '<label class="w-label" for="' + host.id + '-in">Type a password to test</label>' +
      '<input class="w-input" id="' + host.id + '-in" type="text" autocomplete="off" ' +
        'spellcheck="false" placeholder="try: password1  then: mango-bicycle-cloud">' +
      '<div class="w-meter"><span class="w-fill"></span></div>' +
      '<div class="w-readout"><b class="w-verdict">Type something</b>' +
      '<span class="w-detail"></span></div>' +
      '<p class="w-foot">Assumes an attacker guessing 100 billion times a second, which is a fast graphics card on a badly stored password.</p>';

    var input = $('.w-input', host), fill = $('.w-fill', host),
        verdict = $('.w-verdict', host), detail = $('.w-detail', host);

    function update() {
      var r = analyze(input.value);
      fill.style.width = Math.min(100, (r.bits / 90) * 100) + '%';
      fill.className = 'w-fill lv' + r.level;
      verdict.textContent = r.label;
      verdict.className = 'w-verdict lv' + r.level;
      detail.textContent = input.value
        ? humanTime(r.seconds) + ' to crack' + (r.note ? ' (' + r.note + ')' : '')
        : '';
    }
    input.addEventListener('input', update);
    host.__setValue = function (v) { input.value = v; update(); input.focus(); };
    update();
  }

  /* ============================================================
     2. PASSPHRASE GENERATOR
     ============================================================ */

  var WORDS = 'anchor amber antler apricot arrow aspen badge bamboo banjo basket beacon bison blanket bottle boulder bracket bridge bucket cactus candle canoe canyon cargo cedar chimney cinder clover cobalt compass copper coral cotton crater cricket crimson crystal cyclone dagger daisy dolphin domino dragon drummer ember falcon fathom feather ferry fiddle flint forest fountain freckle galley garnet gecko ginger glacier granite gravel harbor harvest hazel hollow hornet indigo ivory jasmine jetty jungle kettle lagoon lantern lattice ledger lemon lighthouse lily lobster locket lumber mackerel magnet mahogany mango maple marble marlin meadow mercury minnow mirror mitten monsoon mosaic moss nectar nickel nutmeg oasis obsidian octave onyx opal orbit orchard otter oyster paddle papaya parrot pebble pelican pepper pewter pigeon pillar pine plaza plover pocket pollen poppy prairie prism pumpkin quarry quartz quiver radish rafter rattle raven reef ribbon rigging ripple river rocket rudder saffron sailor salmon sandbar sapphire satchel scallop schooner seagull seashell sequin shovel signal silver skiff slate sloop socket sparrow spindle spiral spruce squall stallion starfish sterling stirrup sugar sunset surfer swallow tackle tamarind tangerine tavern teapot tempest thicket thimble thistle thunder timber tinder topaz torch tortoise trellis trumpet tugboat tulip tundra turtle valley velvet vessel violet walnut warbler whistle willow window wombat yarrow zebra zephyr'.split(' ');

  function pick(n) {
    var out = [], used = {};
    var rand = function (max) {
      if (window.crypto && window.crypto.getRandomValues) {
        var a = new Uint32Array(1); window.crypto.getRandomValues(a);
        return a[0] % max;
      }
      return Math.floor(Math.random() * max);
    };
    while (out.length < n) {
      var w = WORDS[rand(WORDS.length)];
      if (!used[w]) { used[w] = 1; out.push(w); }
    }
    return out;
  }

  function buildPassphrase(host) {
    var target = host.getAttribute('data-target');
    host.innerHTML =
      '<div class="w-head"><span class="w-tag">Try it</span>' +
      '<span class="w-sub">Four unrelated words, picked at random.</span></div>' +
      '<div class="w-phrase" aria-live="polite">click generate</div>' +
      '<div class="w-row">' +
        '<button class="w-btn" type="button" data-act="gen">Generate</button>' +
        (target ? '<button class="w-btn ghost" type="button" data-act="test">Test it above</button>' : '') +
      '</div>' +
      '<p class="w-foot">Unrelated is the point. Words about you or about each other are guessable.</p>';

    var out = $('.w-phrase', host);
    function gen() { out.textContent = pick(4).join('-'); }
    host.addEventListener('click', function (e) {
      var act = e.target.getAttribute('data-act');
      if (act === 'gen') gen();
      if (act === 'test') {
        var t = document.getElementById(target);
        if (t && t.__setValue) { t.__setValue(out.textContent); t.scrollIntoView({ block: 'center' }); }
      }
    });
    gen();
  }

  /* ============================================================
     3. PHISHING INBOX, the actual activity
     ============================================================ */

  function buildInbox(host) {
    var data;
    try { data = JSON.parse($('script[type="application/json"]', host).textContent); }
    catch (e) { return; }

    // Labels are configurable so the same engine drives the phishing inbox
    // and the citation check in the research lesson.
    var L = {
      task:  host.getAttribute('data-task')  || 'Open each message. Decide: trust it, or report it.',
      yes:   host.getAttribute('data-yes')   || 'Looks legit',
      no:    host.getAttribute('data-no')    || 'Report as phishing',
      badV:  host.getAttribute('data-bad')   || 'This one is phishing.',
      goodV: host.getAttribute('data-good')  || 'This one is real.'
    };

    var judged = {};
    var wrap = document.createElement('div');
    wrap.className = 'w-inbox';
    host.appendChild(wrap);

    function render() {
      var done = Object.keys(judged).length;
      var right = Object.keys(judged).filter(function (k) { return judged[k].correct; }).length;

      wrap.innerHTML =
        '<div class="w-head"><span class="w-tag">Your task</span>' +
        '<span class="w-sub">' + esc(L.task) + '</span></div>' +
        '<div class="w-score"><b>' + done + ' of ' + data.length + '</b> judged' +
        (done ? ' &middot; <b class="' + (right === done ? 'ok' : '') + '">' + right + '</b> correct' : '') +
        '</div>' +
        '<div class="w-mail">' + data.map(function (m, i) {
          var j = judged[i];
          return '<article class="w-msg' + (j ? (j.correct ? ' correct' : ' wrong') : '') + '">' +
            '<button class="w-msg-head" type="button" data-open="' + i + '" aria-expanded="false">' +
              '<span class="w-from">' + esc(m.from) + '</span>' +
              '<span class="w-subj">' + esc(m.subject) + '</span>' +
              (j ? '<span class="w-verdict-chip ' + (j.correct ? 'ok' : 'no') + '">' +
                   (j.correct ? 'correct' : 'missed') + '</span>' : '<span class="w-chip">open</span>') +
            '</button>' +
            '<div class="w-msg-body" hidden>' +
              '<div class="w-msg-meta"><b>From:</b> ' + esc(m.address) + '</div>' +
              '<div class="w-msg-text">' + esc(m.body).replace(/\n/g, '<br>') + '</div>' +
              (j ? '<div class="w-feedback ' + (j.correct ? 'ok' : 'no') + '">' +
                     '<b>' + esc(m.phish ? L.badV : L.goodV) + '</b> ' +
                     esc(m.why) +
                   '</div>'
                 : '<div class="w-row">' +
                     '<button class="w-btn ghost" type="button" data-judge="' + i + '" data-say="trust">' + esc(L.yes) + '</button>' +
                     '<button class="w-btn warn" type="button" data-judge="' + i + '" data-say="report">' + esc(L.no) + '</button>' +
                   '</div>') +
            '</div>' +
          '</article>';
        }).join('') + '</div>' +
        (done === data.length
          ? '<div class="w-done"><b>You scored ' + right + ' out of ' + data.length + '.</b> ' +
            (right === data.length
              ? 'Screenshot this and submit it.'
              : 'Reopen the ones you missed, read why, then screenshot this and submit it.') + '</div>'
          : '');
    }

    wrap.addEventListener('click', function (e) {
      var openBtn = e.target.closest('[data-open]');
      if (openBtn) {
        var body = openBtn.parentNode.querySelector('.w-msg-body');
        var isOpen = !body.hidden;
        body.hidden = isOpen;
        openBtn.setAttribute('aria-expanded', String(!isOpen));
        return;
      }
      var jb = e.target.closest('[data-judge]');
      if (jb) {
        var i = +jb.getAttribute('data-judge');
        var said = jb.getAttribute('data-say');
        judged[i] = { correct: (said === 'report') === !!data[i].phish };
        render();
        // keep the one they just answered open
        var reopened = wrap.querySelectorAll('.w-msg')[i];
        if (reopened) {
          reopened.querySelector('.w-msg-body').hidden = false;
          reopened.querySelector('.w-msg-head').setAttribute('aria-expanded', 'true');
        }
      }
    });

    render();
  }

  /* ============================================================
     3b. SEARCH QUERY CHECKER
     They type a real query and the page confirms the operator landed.
     ============================================================ */

  var OPS = [
    { key: 'quotes',   test: function (q) { return /"[^"]+"/.test(q); },
      label: 'an exact phrase in quotes', does: 'demands those words in that order' },
    { key: 'minus',    test: function (q) { return /(^|\s)-\w/.test(q); },
      label: 'a minus to exclude a word', does: 'drops results containing that word' },
    { key: 'site',     test: function (q) { return /site:\S+\.\S+/.test(q); },
      label: 'site: with a domain', does: 'searches inside one site only' },
    { key: 'filetype', test: function (q) { return /filetype:(pdf|doc|docx|xls|ppt|csv|txt)/i.test(q); },
      label: 'filetype: with a real extension', does: 'returns only that kind of file' }
  ];

  function buildQuery(host) {
    var cfg = {};
    var tag = $('script[type="application/json"]', host);
    if (tag) { try { cfg = JSON.parse(tag.textContent); } catch (e) {} }
    var need = cfg.require || [];

    host.innerHTML =
      '<div class="w-head"><span class="w-tag">Try it</span>' +
      '<span class="w-sub">' + esc(cfg.task || 'Type a search query.') + '</span></div>' +
      '<label class="w-label" for="' + host.id + '-q">Your query</label>' +
      '<input class="w-input" id="' + host.id + '-q" type="text" autocomplete="off" spellcheck="false" placeholder="' + esc(cfg.placeholder || 'type your search here') + '">' +
      '<ul class="w-ops"></ul>' +
      (need.length ? '<div class="w-goal" hidden></div>' : '') +
      '<p class="w-foot">Nothing is searched from this page. Copy your query into a search engine when it checks out.</p>';

    var input = $('.w-input', host), list = $('.w-ops', host), goal = $('.w-goal', host);

    function update() {
      var q = input.value;
      var found = OPS.filter(function (o) { return o.test(q); });
      var sentence = /\b(what|how|why|who|where|when|is|are|does|can)\b/i.test(q) && q.split(/\s+/).length > 6;

      list.innerHTML = OPS.map(function (o) {
        var on = o.test(q);
        return '<li class="' + (on ? 'on' : '') + '"><span class="w-op-dot"></span>' +
          '<span><b>' + esc(o.label) + '</b>' + (on ? ' &middot; ' + esc(o.does) : '') + '</span></li>';
      }).join('') +
      (sentence ? '<li class="warnrow"><span class="w-op-dot"></span><span><b>This still reads like a whole question.</b> Search engines throw most of those words away. Cut it to keywords.</span></li>' : '');

      if (goal) {
        var missing = need.filter(function (n) {
          var op = OPS.filter(function (o) { return o.key === n.op; })[0];
          if (n.contains) return q.toLowerCase().indexOf(n.contains.toLowerCase()) === -1;
          return op ? !op.test(q) : false;
        });
        goal.hidden = !q;
        if (q) {
          goal.className = 'w-goal ' + (missing.length ? 'no' : 'ok');
          goal.innerHTML = missing.length
            ? '<b>Not there yet.</b> Still missing: ' + missing.map(function (m) { return esc(m.label); }).join(', ') + '.'
            : '<b>That works.</b> Run it in a search engine and record the source you land on.';
        }
      }
    }
    input.addEventListener('input', update);
    update();
  }

  /* ============================================================
     4. GIT PUSH SIMULATOR, shows the key actually leaking
     ============================================================ */

  function buildPush(host) {
    host.innerHTML =
      '<div class="w-head"><span class="w-tag">Try it</span>' +
      '<span class="w-sub">Same project, two settings. Push it and see what the internet gets.</span></div>' +
      '<label class="w-check"><input type="checkbox" class="w-gi"> my project has a <code>.gitignore</code> containing <code>.env</code></label>' +
      '<div class="w-row"><button class="w-btn" type="button" data-act="push">git push</button></div>' +
      '<pre class="w-term" aria-live="polite">$ _</pre>';

    var gi = $('.w-gi', host), term = $('.w-term', host);
    host.addEventListener('click', function (e) {
      if (e.target.getAttribute('data-act') !== 'push') return;
      var safe = gi.checked;
      term.className = 'w-term ' + (safe ? 'ok' : 'leak');
      term.textContent =
        '$ git add .\n$ git commit -m "add my chatbot"\n$ git push origin main\n\n' +
        'Uploading...\n' +
        (safe
          ? '  app.py            uploaded\n  README.md         uploaded\n  .gitignore        uploaded\n  .env              SKIPPED, listed in .gitignore\n\nDone. Your key never left your computer.'
          : '  app.py            uploaded\n  README.md         uploaded\n  .env              uploaded  <-- API_KEY=sk-a83ff20c9d4e1b77c5\n\nDone.\n\nYour key is now public. Scanning bots find keys like this\nwithin minutes and start spending on them.');
    });
  }

  /* ============================================================
     5. CLICK-TO-ANSWER QUESTION
     ============================================================ */

  function buildChoice(host) {
    var opts = $$('[data-opt]', host);
    var why = $('.w-why', host);
    host.addEventListener('click', function (e) {
      var b = e.target.closest('[data-opt]');
      if (!b || host.classList.contains('answered')) return;
      host.classList.add('answered');
      opts.forEach(function (o) {
        var right = o.getAttribute('data-opt') === 'correct';
        o.classList.add(right ? 'right' : 'not');
        if (o === b && !right) o.classList.add('chose-wrong');
        if (o === b && right) o.classList.add('chose-right');
      });
      if (why) why.hidden = false;
    });
  }

  /* ============================================================
     6. PERSISTENT CHECKLISTS
     ============================================================ */

  function buildChecklist(list, idx) {
    var key = 'tib-check-' + PAGE + '-' + idx;
    var saved = {};
    try { saved = JSON.parse(store(key) || '{}'); } catch (e) {}

    var items = $$('li', list);
    items.forEach(function (li, i) {
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.className = 'w-tick';
      cb.checked = !!saved[i];
      li.classList.toggle('done', cb.checked);
      cb.addEventListener('change', function () {
        saved[i] = cb.checked;
        li.classList.toggle('done', cb.checked);
        store(key, JSON.stringify(saved));
        count();
      });
      li.insertBefore(cb, li.firstChild);
    });

    var tally = document.createElement('p');
    tally.className = 'w-tally';
    list.parentNode.insertBefore(tally, list.nextSibling);
    function count() {
      var n = items.filter(function (li) { return li.classList.contains('done'); }).length;
      tally.textContent = n + ' of ' + items.length + ' done';
      tally.classList.toggle('all', n === items.length && n > 0);
    }
    count();
  }

  /* ============================================================
     7. EXTERNAL LINKS OPEN IN A NEW TAB
     ============================================================ */

  function fixLinks() {
    $$('a[href^="http"]').forEach(function (a) {
      if (a.hostname === location.hostname) return;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      if (!a.querySelector('.ext')) {
        var s = document.createElement('span');
        s.className = 'ext';
        s.setAttribute('aria-label', '(opens in a new tab)');
        s.textContent = '↗';
        a.appendChild(s);
      }
    });
  }

  /* ============================================================
     8. BITS: text to binary, so "everything is numbers" stops being a slogan
     ============================================================ */

  function buildBits(host) {
    host.innerHTML =
      '<div class="w-head"><span class="w-tag">Try it</span>' +
      '<span class="w-sub">Type anything. This is what the machine actually stores.</span></div>' +
      '<label class="w-label" for="' + host.id + '-t">Your text</label>' +
      '<input class="w-input" id="' + host.id + '-t" type="text" autocomplete="off" ' +
        'spellcheck="false" maxlength="24" value="Hi">' +
      '<div class="w-bitgrid"></div>' +
      '<p class="w-bitcount"></p>' +
      '<p class="w-foot">Eight bits make one byte, and one byte holds one basic character. Your name, a photo, a song and this whole page are all this, just more of it.</p>';

    var input = $('.w-input', host), grid = $('.w-bitgrid', host), count = $('.w-bitcount', host);

    function update() {
      var s = input.value;
      grid.innerHTML = s.split('').map(function (ch) {
        var code = ch.charCodeAt(0);
        var bin = code > 255 ? code.toString(2) : ('00000000' + code.toString(2)).slice(-8);
        return '<div class="w-byte">' +
          '<span class="w-char">' + (ch === ' ' ? '&nbsp;' : esc(ch)) + '</span>' +
          '<span class="w-bin">' + bin + '</span>' +
          '<span class="w-dec">' + code + '</span>' +
        '</div>';
      }).join('');
      var bits = s.split('').reduce(function (n, c) {
        return n + (c.charCodeAt(0) > 255 ? c.charCodeAt(0).toString(2).length : 8); }, 0);
      count.innerHTML = s.length
        ? '<b>' + s.length + '</b> character' + (s.length === 1 ? '' : 's') + ', <b>' + bits + '</b> bits'
        : 'Type something.';
    }
    input.addEventListener('input', update);
    update();
  }

  /* ============================================================
     9. CPU STEPPER: one instruction at a time, which is the whole point
     ============================================================ */

  function buildCpu(host) {
    var prog = [
      { src: 'set count = 0',        run: function (s) { s.vars.count = 0; } },
      { src: 'set total = 0',        run: function (s) { s.vars.total = 0; } },
      { src: 'repeat while count < 4', run: function (s) {
          if (!(s.vars.count < 4)) { s.pc = 6; return true; } } },
      { src: '    total = total + count', run: function (s) { s.vars.total += s.vars.count; } },
      { src: '    count = count + 1',     run: function (s) { s.vars.count += 1; } },
      { src: '    go back and check again', run: function (s) { s.pc = 2; return true; } },
      { src: 'print total',          run: function (s) { s.out.push(String(s.vars.total)); } }
    ];

    var s, timer = null;

    host.innerHTML =
      '<div class="w-head"><span class="w-tag">Try it</span>' +
      '<span class="w-sub">A real program. Step it one line at a time and watch memory change.</span></div>' +
      '<div class="w-cpu">' +
        '<ol class="w-code"></ol>' +
        '<div class="w-side">' +
          '<div class="w-mem"></div>' +
          '<div class="w-out"><b>Output</b><pre></pre></div>' +
        '</div>' +
      '</div>' +
      '<div class="w-row">' +
        '<button class="w-btn" type="button" data-act="step">Step</button>' +
        '<button class="w-btn ghost" type="button" data-act="run">Run it</button>' +
        '<button class="w-btn ghost" type="button" data-act="reset">Reset</button>' +
      '</div>' +
      '<p class="w-foot">Your laptop does this a few billion times a second. Not cleverer than you. Just relentless.</p>';

    var codeEl = $('.w-code', host), memEl = $('.w-mem', host), outEl = $('.w-out pre', host);

    function reset() {
      if (timer) { clearInterval(timer); timer = null; }
      s = { pc: 0, vars: {}, out: [], done: false, steps: 0 };
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
      outEl.textContent = s.out.length ? s.out.join('\n') : (s.done ? '' : '');
      if (s.done) outEl.textContent = s.out.join('\n') + '\n\nfinished in ' + s.steps + ' steps';
    }

    function step() {
      if (s.done) return;
      var line = prog[s.pc];
      if (!line) { s.done = true; draw(); return; }
      s.steps++;
      var jumped = line.run(s);
      if (!jumped) s.pc++;
      if (s.pc >= prog.length) s.done = true;
      draw();
    }

    host.addEventListener('click', function (e) {
      var act = e.target.getAttribute('data-act');
      if (act === 'step') { if (timer) { clearInterval(timer); timer = null; } step(); }
      else if (act === 'reset') reset();
      else if (act === 'run') {
        if (timer) { clearInterval(timer); timer = null; return; }
        if (s.done) reset();
        timer = setInterval(function () {
          step();
          if (s.done) { clearInterval(timer); timer = null; }
        }, 420);
      }
    });

    reset();
  }

  /* ============================================================
     BOOT
     ============================================================ */

  function boot() {
    fixLinks();
    $$('[data-widget]').forEach(function (host, i) {
      if (!host.id) host.id = 'w' + i;
      var kind = host.getAttribute('data-widget');
      try {
        if (kind === 'strength') buildStrength(host);
        else if (kind === 'passphrase') buildPassphrase(host);
        else if (kind === 'inbox') buildInbox(host);
        else if (kind === 'query') buildQuery(host);
        else if (kind === 'push') buildPush(host);
        else if (kind === 'choice') buildChoice(host);
        else if (kind === 'bits') buildBits(host);
        else if (kind === 'cpu') buildCpu(host);
      } catch (e) {
        // a broken widget must never take the lesson down
        host.innerHTML = '<p class="w-foot">This activity could not load. The lesson still works without it.</p>';
      }
    });
    $$('.turnin').forEach(buildChecklist);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else { boot(); }
})();
