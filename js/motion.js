/* =========================================================================
   SOLAR — motion (GSAP + ScrollTrigger + Lenis)
   Skipped entirely when the visitor prefers reduced motion or the libraries
   fail to load; the page is complete without it.
   1. Smooth scroll and anchor links
   2. Text splitting
   3. Intro: loader, then the hero opens
   4. Pinned scenes: hero fold, photon story, horizontal systems
   5. Reveals: headings, statement, counters, simulator, projects
   6. Sunset, care, contact, footer
   7. Marquee, magnetic buttons, card tilt, custom cursor
   ========================================================================= */
(() => {
  'use strict';
  const SOLAR = (window.SOLAR = window.SOLAR || {});
  const root = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !window.gsap || !window.ScrollTrigger) {
    root.classList.remove('is-loading', 'is-intro');
    return;
  }
  const gsap = window.gsap, ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);
  root.classList.add('has-motion');
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = gsap.utils.clamp;

  /* ---------------------------------------------------------------- 1 */
  let lenis = null;
  if (window.Lenis) {
    lenis = new window.Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    SOLAR.lenis = lenis;
  }
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    const box = target.parentElement && target.parentElement.classList.contains('pin-spacer') ? target.parentElement : target;
    if (lenis) lenis.scrollTo(box, { duration: 1.6 });
    else box.scrollIntoView({ behavior: 'smooth' });
    if (id !== '#top' && id !== '#main') {
      target.setAttribute('tabindex', '-1');
      setTimeout(() => target.focus({ preventScroll: true }), 900);
    }
  });

  /* ---------------------------------------------------------------- 2 */
  function splitWords(el, mask = true) {
    if (el.dataset.splitDone) return $$('.w', el);
    const walk = (node) => {
      Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/([ \t\n\r]+)/).forEach((part) => {
            if (!part) return;
            if (/^[ \t\n\r]+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span');
            w.className = 'w';
            w.textContent = part;
            if (mask) { const m = document.createElement('span'); m.className = 'wm'; m.appendChild(w); frag.appendChild(m); }
            else frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(el);
    el.dataset.splitDone = '1';
    return $$('.w', el);
  }

  /* ---------------------------------------------------------------- 3 */
  const heroWords = splitWords($('.hero__title'));
  const fold = $('[data-fold]');
  const navBits = $$('.brand:not(.brand--footer), .sunpath, .cta, .menu-btn');
  gsap.set(heroWords, { yPercent: 115 });
  gsap.set('.hero__title', { opacity: 1 });
  gsap.set('.hero__side', { opacity: 1 });
  gsap.set('.hero__side > *', { y: 30, opacity: 0 });
  gsap.set('.chip', { y: 16, opacity: 0 });
  gsap.set(navBits, { y: -40, opacity: 0 });
  gsap.set('.hl', { '--hl': 0 });
  gsap.set(fold, { '--open': 0, opacity: 1 });
  gsap.set('[data-tilt-hero]', { '--so': 0.15 });
  gsap.set('.p-noon', { clipPath: 'inset(0% 50% 0% 50%)' });
  gsap.set('.fold3d__tag', { opacity: 0, y: 10 });
  gsap.set('.scroll-cue', { opacity: 0 });

  function playIntro() {
    root.classList.remove('is-intro');
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.to(navBits, { y: 0, opacity: 1, duration: 1.2, stagger: 0.08 }, 0)
      .to('.chip', { y: 0, opacity: 1, duration: 1 }, 0.1)
      .to(heroWords, { yPercent: 0, duration: 1.4, stagger: 0.075 }, 0.15)
      .to('.hl', { '--hl': 1, duration: 1.1, ease: 'expo.inOut' }, 0.8)
      .to('.hero__side > *', { y: 0, opacity: 1, duration: 1.1, stagger: 0.1 }, 0.5)
      .to('.p-noon', { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.inOut' }, 0.35)
      .to(fold, { '--open': 1, duration: 2, ease: 'expo.out' }, 1.05)
      .to('[data-tilt-hero]', { '--so': 1, duration: 1.8, ease: 'expo.out' }, 1.05)
      .to('.fold3d__tag', { opacity: 1, y: 0, duration: 0.7, stagger: 0.12 }, 2)
      .to('.scroll-cue', { opacity: 1, duration: 0.8 }, 2.1);
  }

  function runLoader() {
    return new Promise((resolve) => {
      const loader = $('.loader');
      if (!root.classList.contains('is-loading') || !loader) { resolve(); return; }
      if (lenis) lenis.stop();
      document.body.style.overflow = 'hidden';
      const count = $('[data-loader-count]');
      const show = (v) => { count.textContent = String(Math.round(v)).padStart(3, '0'); };
      const state = { v: 0 };
      const loaded = new Promise((r) => {
        if (document.readyState === 'complete') r();
        else window.addEventListener('load', r, { once: true });
        setTimeout(r, 2800);
      });
      const charge = gsap.timeline();
      charge.to('.loader__mark .ray', { strokeDashoffset: 0, duration: 0.6, stagger: 0.07, ease: 'power2.out' }, 0)
        .to(state, { v: 87, duration: 1.4, ease: 'power1.inOut', onUpdate: () => show(state.v) }, 0);
      Promise.all([loaded, charge.then()]).then(() => {
        const out = gsap.timeline({
          onComplete: () => {
            loader.style.display = 'none';
            root.classList.remove('is-loading');
            document.body.style.overflow = '';
            if (lenis) lenis.start();
            try { sessionStorage.setItem('solar-intro-seen', '1'); } catch (e) { /* storage blocked */ }
          },
        });
        out.to(state, { v: 100, duration: 0.4, ease: 'power2.out', onUpdate: () => show(state.v) })
          .to('.loader__count', { opacity: 0, y: 12, duration: 0.35, ease: 'power2.in' }, '+=0.05')
          .to('.loader__mark', { rotate: 180, scale: 0.35, opacity: 0, duration: 0.9, ease: 'expo.inOut' }, '<')
          .to('.loader__half--a', { yPercent: -100, duration: 1.2, ease: 'expo.inOut' }, '-=0.35')
          .to('.loader__half--b', { yPercent: 100, duration: 1.2, ease: 'expo.inOut' }, '<')
          .add(resolve, '-=0.85');
      });
    });
  }

  /* ---------------------------------------------------------------- 4
     Pinned scenes are created first, in page order, so later triggers measure correctly. */
  const mm = gsap.matchMedia();

  // 4a. HERO — the brochure flattens and becomes a full-bleed film frame
  const tilt = $('[data-tilt-hero]');
  const heroTl = gsap.timeline({
    scrollTrigger: { trigger: '.hero', start: 'top top', end: '+=130%', pin: true, scrub: 1, invalidateOnRefresh: true },
  });
  const heroScale = () => window.innerWidth / fold.offsetWidth;
  const heroShift = () => {
    const stage = $('[data-stage]');
    const center = stage.offsetTop + stage.offsetHeight - fold.offsetHeight / 2;
    return window.innerHeight / 2 - center;
  };
  heroTl
    .to('.hero__top', { yPercent: -40, opacity: 0, ease: 'power1.in', duration: 0.45 }, 0)
    .to('.scroll-cue', { opacity: 0, duration: 0.1 }, 0)
    .to(fold, { '--flat': 1, ease: 'power2.inOut', duration: 0.6 }, 0)
    .to(tilt, { scale: heroScale, y: heroShift, ease: 'power2.inOut', duration: 0.7 }, 0.05)
    .to('.fold3d__tag', { opacity: 0, duration: 0.15 }, 0.05)
    .fromTo('.stage__caption span', { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, stagger: 0.08, duration: 0.25, ease: 'power3.out' }, 0.62)
    .set('.stage__caption', { opacity: 1 }, 0.62);

  if (fine) {
    const rx = gsap.quickTo(fold, 'rotationX', { duration: 1, ease: 'power3' });
    const ry = gsap.quickTo(fold, 'rotationY', { duration: 1, ease: 'power3' });
    window.addEventListener('pointermove', (e) => {
      const p = heroTl.scrollTrigger ? heroTl.scrollTrigger.progress : 0;
      if (p > 0.02 || window.scrollY > window.innerHeight) { rx(0); ry(0); return; }
      ry((e.clientX / window.innerWidth - 0.5) * 12);
      rx(-(e.clientY / window.innerHeight - 0.5) * 7);
    });
  }

  // 4b. HOW IT WORKS — pinned photon story, three steps
  mm.add('(min-width: 0px)', () => {
    const small = window.innerWidth < 761;
    ScrollTrigger.create({
      trigger: '.how', start: 'top top', end: small ? '+=180%' : '+=240%', pin: true,
      onUpdate: (self) => SOLAR.photons && SOLAR.photons.setProgress(self.progress),
      onRefresh: (self) => SOLAR.photons && SOLAR.photons.setProgress(self.progress),
    });
    if (SOLAR.photons) SOLAR.photons.driven = true;
  });

  // 4c. SYSTEMS — horizontal track on wider screens
  mm.add('(min-width: 761px)', () => {
    root.classList.add('has-hpin');
    const hs = $('[data-hscroll]');
    const track = $('.hscroll__track');
    const cards = $$('.sys', track);
    const bar = $('[data-sys-bar]');
    const idx = $('[data-sys-index]');
    const dist = () => {
      const cs = getComputedStyle(hs);
      return Math.max(0, track.scrollWidth - (hs.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)));
    };
    const tween = gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: {
        trigger: '.systems', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.8, invalidateOnRefresh: true,
        onUpdate: (self) => {
          bar.style.setProperty('--p', (0.2 + 0.8 * self.progress).toFixed(3));
          idx.textContent = String(Math.min(cards.length, Math.round(self.progress * (cards.length - 1)) + 1)).padStart(2, '0');
        },
      },
    });
    cards.forEach((card, i) => {
      const img = card.querySelector('.sys__media img:not([data-mode-img])');
      if (img) {
        gsap.fromTo(img, { xPercent: -6 }, {
          xPercent: 6, ease: 'none',
          scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true },
        });
      }
      if (i > 0) {
        gsap.from(card, {
          rotate: 4, yPercent: 10, scale: 0.92, transformOrigin: '0% 100%', ease: 'none',
          scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left 105%', end: 'left 60%', scrub: true },
        });
      }
    });
    return () => root.classList.remove('has-hpin');
  });

  /* ---------------------------------------------------------------- 5 */
  // headings rise word by word
  $$('[data-split]').forEach((h) => {
    const words = splitWords(h);
    gsap.from(words, {
      yPercent: 115, duration: 1.3, ease: 'expo.out', stagger: 0.06,
      scrollTrigger: { trigger: h, start: 'top 88%' },
    });
  });
  $$('.eyebrow').forEach((e) => {
    if (e.closest('.hero')) return;
    gsap.from(e, { opacity: 0, x: -20, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: e, start: 'top 90%' } });
  });

  // statement: words light up as you read
  const statement = $('[data-words]');
  if (statement) {
    const words = splitWords(statement, false);
    gsap.fromTo(words, { opacity: 0.12 }, {
      opacity: 1, ease: 'none', stagger: 0.12,
      scrollTrigger: { trigger: statement, start: 'top 82%', end: 'bottom 42%', scrub: true },
    });
  }

  // counters
  $$('[data-count]').forEach((el) => {
    const end = parseFloat(el.dataset.count);
    const dec = +(el.dataset.decimals || 0);
    const o = { v: 0 };
    el.textContent = (0).toFixed(dec);
    ScrollTrigger.create({
      trigger: el, start: 'top 90%', once: true,
      onEnter: () => gsap.to(o, { v: end, duration: 2, ease: 'expo.out', onUpdate: () => { el.textContent = o.v.toFixed(dec); } }),
    });
  });
  gsap.from('.stat', { y: 60, opacity: 0, duration: 1.2, stagger: 0.12, ease: 'expo.out', scrollTrigger: { trigger: '.stats', start: 'top 88%' } });

  // the photon scene rises into place before it pins
  gsap.fromTo('.how__scene', { y: 120, rotate: 3, scale: 0.9 }, {
    y: 0, rotate: 0, scale: 1, ease: 'none',
    scrollTrigger: { trigger: '.how', start: 'top bottom', end: 'top top', scrub: true },
  });

  // simulator: parts arrive, lines draw, then the sun sweeps to "now"
  const day = $('#day');
  if (day) {
    $$('.flow__base').forEach((p) => {
      const len = p.getTotalLength();
      gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
    });
    gsap.set('.node', { scale: 0, transformOrigin: '50% 50%' });
    const tl = gsap.timeline({ scrollTrigger: { trigger: '.sim', start: 'top 75%' } });
    tl.from('.sim__top > *, .sim__mid > *, .totals > div', { y: 70, opacity: 0, duration: 1.2, stagger: 0.08, ease: 'expo.out' })
      .to('.node', { scale: 1, duration: 0.9, stagger: 0.08, ease: 'back.out(2)' }, 0.3)
      .to('.flow__base', { strokeDashoffset: 0, duration: 1.2, stagger: 0.08, ease: 'power2.inOut' }, 0.5);
    const range = $('[data-sim-range]');
    if (range) {
      const target = +range.value;
      const o = { v: 0 };
      ScrollTrigger.create({
        trigger: '.sim__sky', start: 'top 70%', once: true,
        onEnter: () => {
          range.value = '0';
          range.dispatchEvent(new Event('input'));
          gsap.to(o, {
            v: target, duration: 2.8, delay: 0.4, ease: 'power2.inOut',
            onUpdate: () => { range.value = String(Math.round(o.v)); range.dispatchEvent(new Event('input')); },
          });
        },
      });
    }
  }

  // projects
  $$('.project').forEach((card, i) => {
    const media = card.querySelector('[data-wipe]');
    const img = media && media.querySelector('img');
    const tl = gsap.timeline({ scrollTrigger: { trigger: card, start: 'top 88%' } });
    tl.from(card, { y: 140, rotateX: 14, opacity: 0, duration: 1.4, ease: 'expo.out', delay: i * 0.08 })
      .fromTo(media, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: 'expo.inOut' }, 0.1)
      .from(img, { scale: 1.35, duration: 1.8, ease: 'expo.out' }, 0.1);
    const svg = card.querySelector('.spark svg');
    if (svg) {
      const bars = svg.querySelectorAll('.s-bar');
      if (bars.length) tl.from(bars, { scaleY: 0, duration: 0.9, stagger: 0.05, ease: 'expo.out' }, 0.6);
      else tl.fromTo(svg, { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'power2.inOut' }, 0.6);
    }
  });

  /* ---------------------------------------------------------------- 6 */
  const sunset = gsap.timeline({ scrollTrigger: { trigger: '.sunset', start: 'top top', end: 'bottom bottom', scrub: 1, invalidateOnRefresh: true } });
  sunset
    .fromTo('.sunset__sky', { yPercent: 0 }, { yPercent: -80, ease: 'none', duration: 1 }, 0)
    .fromTo('.sunset__sun', { y: 0, scale: 0.92 }, { y: () => window.innerHeight * 0.66, scale: 1.12, ease: 'power1.in', duration: 0.62 }, 0)
    .to('.sunset__line--a', { yPercent: -60, opacity: 0, ease: 'power2.in', duration: 0.16 }, 0.36)
    .to('.sunset__copy', { color: '#EFEBE3', ease: 'none', duration: 0.12 }, 0.38)
    .fromTo('.sunset__line--b', { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, ease: 'power3.out', duration: 0.2 }, 0.52)
    .to('.sunset__stars', { opacity: 1, ease: 'none', duration: 0.3 }, 0.6)
    .to('.sunset__ground', { boxShadow: '0 -1px 0 rgba(255,200,120,0), 0 -30px 80px rgba(255,150,80,0)', duration: 0.3 }, 0.62);

  // care: the progress line follows the steps; the frame rises in
  gsap.fromTo('[data-care-line]', { '--p': 0 }, { '--p': 1, ease: 'none', scrollTrigger: { trigger: '.care__list', start: 'top 55%', end: 'bottom 55%', scrub: true } });
  gsap.from('.care__sticky', { yPercent: 14, opacity: 0, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: '.care', start: 'top 70%' } });

  // contact + footer
  gsap.from('.contact__status, .contact__lede', { y: 30, opacity: 0, duration: 1.1, stagger: 0.1, ease: 'expo.out', scrollTrigger: { trigger: '.contact__head', start: 'top 80%' } });
  gsap.from('.form, .faq details', { y: 60, opacity: 0, duration: 1.2, stagger: 0.08, ease: 'expo.out', scrollTrigger: { trigger: '.contact__grid', start: 'top 85%' } });
  gsap.fromTo('[data-wordmark]', { '--fill': '0%', yPercent: 30 }, {
    '--fill': '100%', yPercent: 0, ease: 'none',
    scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: true },
  });

  /* ---------------------------------------------------------------- 7 */
  // marquee: drifts on its own, speeds up and leans with scroll velocity
  const mq = $('[data-marquee]');
  if (mq) {
    let x = 0, boost = 0, dir = 1, skew = 0, live = false;
    ScrollTrigger.create({
      trigger: '.marquee', start: 'top bottom', end: 'bottom top',
      onToggle: (self) => { live = self.isActive; },
      onUpdate: (self) => { const v = self.getVelocity(); boost = Math.min(Math.abs(v) / 220, 9); dir = self.direction; skew = clamp(-12, 12, -v / 220); },
    });
    const setX = gsap.quickSetter(mq, 'x', 'px');
    const setSkew = gsap.quickSetter(mq, 'skewX', 'deg');
    let curSkew = 0;
    gsap.ticker.add((time, dt) => {
      if (!live) return;
      const half = mq.scrollWidth / 2;
      x -= (50 + boost * 140) * dir * (dt / 1000);
      x = gsap.utils.wrap(-half, 0, x);
      setX(x);
      curSkew += (skew - curSkew) * 0.12;
      setSkew(curSkew);
      boost *= 0.93; skew *= 0.9;
    });
  }

  if (fine) {
    // magnetic buttons
    $$('[data-magnetic]').forEach((el) => {
      const xTo = gsap.quickTo(el, 'x', { duration: 0.7, ease: 'power3' });
      const yTo = gsap.quickTo(el, 'y', { duration: 0.7, ease: 'power3' });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.3);
        yTo((e.clientY - r.top - r.height / 2) * 0.45);
      });
      el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });

    // project cards lean toward the pointer
    $$('[data-tilt-card]').forEach((card) => {
      const rx = gsap.quickTo(card, 'rotationX', { duration: 0.8, ease: 'power3' });
      const ry = gsap.quickTo(card, 'rotationY', { duration: 0.8, ease: 'power3' });
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        ry(((e.clientX - r.left) / r.width - 0.5) * 10);
        rx(-((e.clientY - r.top) / r.height - 0.5) * 8);
      });
      card.addEventListener('pointerleave', () => { rx(0); ry(0); });
    });

    // custom cursor
    root.classList.add('has-cursor');
    const cur = $('.cursor'), dot = $('.cursor__dot'), ring = $('.cursor__ring'), label = $('.cursor__label');
    const dx = gsap.quickTo(dot, 'x', { duration: 0.1 }), dy = gsap.quickTo(dot, 'y', { duration: 0.1 });
    const rx = gsap.quickTo(ring, 'x', { duration: 0.55, ease: 'power3' }), ry = gsap.quickTo(ring, 'y', { duration: 0.55, ease: 'power3' });
    gsap.set([dot, ring], { x: -100, y: -100 });
    window.addEventListener('pointermove', (e) => { dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); });
    document.addEventListener('pointerleave', () => cur.classList.add('is-hidden'));
    document.addEventListener('pointerenter', () => cur.classList.remove('is-hidden'));
    document.addEventListener('pointerover', (e) => {
      const t = e.target;
      const lab = t.closest('[data-cursor]');
      const hot = t.closest('a, button, summary, [role="radio"]');
      const field = t.closest('input:not([type="range"]), textarea, select');
      cur.classList.toggle('has-label', !!lab);
      cur.classList.toggle('is-hover', !!hot && !lab);
      cur.classList.toggle('is-hidden', !!field);
      label.textContent = lab ? lab.dataset.cursor : '';
    });
    document.addEventListener('pointerdown', () => gsap.to(ring, { scale: 0.8, duration: 0.2 }));
    document.addEventListener('pointerup', () => gsap.to(ring, { scale: 1, duration: 0.4, ease: 'back.out(3)' }));
  }

  /* ---------------------------------------------------------------- boot */
  ScrollTrigger.addEventListener('refresh', () => { if (SOLAR.refresh) SOLAR.refresh(); });
  window.addEventListener('load', () => ScrollTrigger.refresh());
  ScrollTrigger.refresh();
  runLoader().then(playIntro);
})();
