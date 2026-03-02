/**
 * Think In Bits - Shared JavaScript Module
 *
 * - Smooth scroll for anchor links (accounts for fixed navbar)
 * - Scroll-triggered entry animations (IntersectionObserver)
 *
 * Note: Navigation toggle (hamburger, active links, scroll class)
 *       is handled by the inline script inside nav.html template.
 *
 * Pure vanilla JavaScript — no dependencies.
 */

document.addEventListener('DOMContentLoaded', function () {

  // ============================================
  // 1. SMOOTH SCROLL FOR ANCHOR LINKS
  // ============================================
  // Offset scroll target by navbar height so fixed nav
  // doesn't obscure the section heading.

  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;

      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        e.preventDefault();
        const navbar = document.querySelector('.tib-navbar');
        const navHeight = navbar ? navbar.offsetHeight : 70;
        const targetPosition =
          targetElement.getBoundingClientRect().top +
          window.pageYOffset -
          navHeight;

        window.scrollTo({ top: targetPosition, behavior: 'smooth' });
      }
    });
  });

  // ============================================
  // 2. SCROLL-TRIGGERED ENTRY ANIMATIONS
  // ============================================
  // Elements with .tib-animate start invisible (opacity:0,
  // translateY:22px) via CSS and gain .tib-visible when they
  // cross into the viewport.  Cards in a grid get staggered
  // transition-delay values based on their sibling index.

  const animateTargets = document.querySelectorAll('.tib-animate');

  if (animateTargets.length === 0) return;

  // Fallback: reveal everything immediately when
  // IntersectionObserver is unavailable (old browsers).
  if (!('IntersectionObserver' in window)) {
    animateTargets.forEach(function (el) {
      el.classList.add('tib-visible');
    });
    return;
  }

  // Assign stagger delays: group siblings inside the same
  // parent container (e.g. a card grid) so each column in
  // a row staggers independently.
  const parents = new Map();
  animateTargets.forEach(function (el) {
    const parent = el.parentElement;
    if (!parents.has(parent)) parents.set(parent, []);
    parents.get(parent).push(el);
  });

  parents.forEach(function (children) {
    children.forEach(function (el, index) {
      el.style.transitionDelay = index * 80 + 'ms';
    });
  });

  // Observe each target and reveal on intersection.
  const observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('tib-visible');
          // Stop watching once revealed — animation is one-time.
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.1,
      rootMargin: '0px 0px -40px 0px',
    }
  );

  animateTargets.forEach(function (el) {
    observer.observe(el);
  });

});

// ── Scroll Progress Bar ──────────────────────────────────────────────────────
(function () {
  const bar = document.createElement('div');
  bar.id = 'tib-scroll-progress';
  document.body.prepend(bar);

  function updateProgress() {
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const pct = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
    bar.style.width = pct + '%';
  }

  window.addEventListener('scroll', updateProgress, { passive: true });
})();

// ── Hero Canvas Node Network ──────────────────────────────────────────────────
(function () {
  const canvas = document.getElementById('tib-hero-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const CYAN = '0, 229, 255';
  const NODE_COUNT = 40;
  const CONNECT_DIST = 120;
  let nodes = [];
  let animId;

  function resize() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }

  function initNodes() {
    nodes = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      nodes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        r: Math.random() * 2 + 1
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw connections
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CONNECT_DIST) {
          const alpha = (1 - dist / CONNECT_DIST) * 0.3;
          ctx.beginPath();
          ctx.strokeStyle = `rgba(${CYAN}, ${alpha})`;
          ctx.lineWidth = 1;
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
        }
      }
    }

    // Draw nodes
    nodes.forEach(n => {
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${CYAN}, 0.6)`;
      ctx.fill();
    });
  }

  function update() {
    nodes.forEach(n => {
      n.x += n.vx;
      n.y += n.vy;
      if (n.x < 0 || n.x > canvas.width)  n.vx *= -1;
      if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
    });
  }

  function loop() {
    update();
    draw();
    animId = requestAnimationFrame(loop);
  }

  resize();
  initNodes();

  if (!prefersReduced) {
    loop();
  } else {
    draw(); // static snapshot
  }

  window.addEventListener('resize', () => {
    cancelAnimationFrame(animId);
    resize();
    initNodes();
    if (!prefersReduced) loop();
    else draw();
  }, { passive: true });
})();

// ── 3D Card Tilt ─────────────────────────────────────────────────────────────
(function () {
  if (navigator.maxTouchPoints > 0) return; // skip on touch devices

  const MAX_TILT = 8; // degrees

  document.querySelectorAll('.tib-project-card').forEach(card => {
    card.style.transition = 'transform 0.15s ease, box-shadow 0.15s ease';
    card.style.willChange = 'transform';

    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (rect.width / 2);
      const dy = (e.clientY - cy) / (rect.height / 2);
      const rotateX = -dy * MAX_TILT;
      const rotateY =  dx * MAX_TILT;
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(4px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0)';
    });
  });
})();

// ── Stats Counter ─────────────────────────────────────────────────────────────
(function () {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DURATION = 1500; // ms

  function easeOutQuad(t) {
    return t * (2 - t);
  }

  function animateCounter(el, target) {
    if (prefersReduced) {
      el.textContent = target;
      return;
    }
    const start = performance.now();
    function step(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / DURATION, 1);
      el.textContent = Math.round(easeOutQuad(progress) * target);
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = target;
      }
    }
    requestAnimationFrame(step);
  }

  const counters = document.querySelectorAll('.tib-stat-number[data-target]');
  if (!counters.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.dataset.target, 10);
        animateCounter(el, target);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(el => observer.observe(el));
})();
