/* =========================================================================
   SOLAR — motion (GSAP + ScrollTrigger + Lenis)
   Skipped when the visitor prefers reduced motion or the libraries fail to
   load; the page is complete without it.
   1. Smooth scroll and anchors
   2. The "solar cell" transition: photos switch on cell by cell
   3. Intro
   4. Hero scroll-out
   5. Pinned scenes: process, projects rail
   6. Reveals, parallax, counters
   7. Marquee, magnetic buttons, cursor
   ========================================================================= */
(() => {
  'use strict';
  const SOLAR = (window.SOLAR = window.SOLAR || {});
  const root = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduce || !window.gsap || !window.ScrollTrigger) {
    root.classList.remove('is-intro');
    if (SOLAR.startSlides) SOLAR.startSlides();
    return;
  }
  const gsap = window.gsap, ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);
  root.classList.add('has-motion');
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const small = () => window.innerWidth < 700;

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
    if (lenis) lenis.scrollTo(box, { duration: 1.5, offset: id === '#top' ? 0 : -10 });
    else box.scrollIntoView({ behavior: 'smooth' });
  });

  /* ---------------------------------------------------------------- 2
     A grid of cells, each holding its slice of the next photo, scales in
     with a flash of sunlight, sweeping across the frame. */
  function cover(img, W, H) {
    const w0 = img.naturalWidth || +img.getAttribute('width');
    const h0 = img.naturalHeight || +img.getAttribute('height');
    const s = Math.max(W / w0, H / h0);
    const dw = w0 * s, dh = h0 * s;
    const pos = getComputedStyle(img).objectPosition.split(' ').map((v) => parseFloat(v) / 100);
    return { dw, dh, ox: (W - dw) * (isNaN(pos[0]) ? 0.5 : pos[0]), oy: (H - dh) * (isNaN(pos[1]) ? 0.5 : pos[1]) };
  }
  function cellReveal(host, img, opts = {}) {
    const cols = opts.cols || 10, rows = opts.rows || 6, from = opts.from || 'start', amount = opts.amount || 0.75;
    return new Promise((resolve) => {
      const W = host.clientWidth, H = host.clientHeight;
      if (!W || !H) { resolve(); return; }
      const cw = W / cols, ch = H / rows;
      const { dw, dh, ox, oy } = cover(img, W, H);
      const src = img.currentSrc || img.src;
      const layer = document.createElement('div');
      layer.className = 'cells';
      layer.style.setProperty('--cols', cols);
      layer.style.setProperty('--rows', rows);
      const cells = [], glows = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const d = document.createElement('div');
          d.className = 'cell';
          d.style.backgroundImage = 'url("' + src + '")';
          d.style.backgroundSize = dw.toFixed(1) + 'px ' + dh.toFixed(1) + 'px';
          d.style.backgroundPosition = (ox - c * cw).toFixed(1) + 'px ' + (oy - r * ch).toFixed(1) + 'px';
          const g = document.createElement('i');
          d.appendChild(g);
          layer.appendChild(d);
          cells.push(d); glows.push(g);
        }
      }
      host.appendChild(layer);
      const stagger = { grid: [rows, cols], from, amount };
      gsap.timeline({ onComplete: () => { resolve(); requestAnimationFrame(() => requestAnimationFrame(() => layer.remove())); } })
        .fromTo(cells, { scale: 0, rotate: -8 }, { scale: 1, rotate: 0, duration: 0.6, ease: 'power3.out', stagger }, 0)
        .fromTo(glows, { opacity: 0.95 }, { opacity: 0, duration: 0.55, ease: 'power1.out', stagger }, 0.15);
    });
  }
  SOLAR.cellReveal = cellReveal;

  const slidesHost = $('[data-slides]');
  const sweeps = ['start', 'center', 'end', 'edges'];
  let sweep = 0;
  SOLAR.slideTransition = (slide) => {
    sweep = (sweep + 1) % sweeps.length;
    return cellReveal(slidesHost, slide.querySelector('img'), small() ? { cols: 5, rows: 8, from: sweeps[sweep] } : { cols: 11, rows: 6, from: sweeps[sweep] });
  };
  const frame = $('[data-process-frame]');
  SOLAR.processTransition = (img) => cellReveal(frame, img, { cols: 8, rows: 6, from: 'start', amount: 0.6 });
  SOLAR.tweenNumber = (el, value, d) => {
    const from = parseFloat(String(el.textContent).replace(/[^0-9.]/g, '')) || 0;
    const o = { v: from };
    gsap.to(o, {
      v: value, duration: 0.6, ease: 'power3.out', overwrite: true,
      onUpdate: () => { el.textContent = Number(o.v).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d }); },
    });
  };
  SOLAR.flashCells = (cells, on) => {
    if (!cells.length) return;
    if (on) gsap.fromTo(cells, { scale: 0.4, filter: 'brightness(2.4)' }, { scale: 1, filter: 'brightness(1)', duration: 0.5, ease: 'back.out(2.4)', stagger: 0.025, overwrite: true });
    else gsap.fromTo(cells, { scale: 0.85 }, { scale: 1, duration: 0.3, ease: 'power2.out', stagger: 0.015, overwrite: true });
  };

  /* split text */
  function splitWords(el) {
    if (el.dataset.splitDone) return $$('.w', el);
    const walk = (node) => {
      Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/([ \t\n\r]+)/).forEach((part) => {
            if (!part) return;
            if (/^[ \t\n\r]+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const m = document.createElement('span'); m.className = 'wm';
            const w = document.createElement('span'); w.className = 'w'; w.textContent = part;
            m.appendChild(w); frag.appendChild(m);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && !n.classList.contains('curl')) walk(n);
      });
    };
    walk(el);
    el.dataset.splitDone = '1';
    return $$('.w', el);
  }
  // the script word appears as if written, left to right
  const write = (el, at) => ({ el, from: { clipPath: 'inset(0% 100% 0% 0%)' }, to: { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: 'power2.inOut' }, at });

  /* ---------------------------------------------------------------- 3 */
  const heroMedia = $('[data-hero-media]');
  const titleWords = splitWords($('.hero__title'));
  gsap.set(titleWords, { yPercent: 118 });
  gsap.set('.hero__title .curl', { clipPath: 'inset(0% 100% 0% 0%)' });
  gsap.set('.hero__title', { opacity: 1 });
  gsap.set('.hero .eyebrow', { y: 20, opacity: 0 });
  gsap.set('.hero__row', { opacity: 1 });
  gsap.set('.hero__row > *', { y: 30, opacity: 0 });
  gsap.set('.hero__dock', { y: 20, opacity: 0 });
  gsap.set('.header__bar > *', { y: -24, opacity: 0 });

  function intro() {
    // dark cells cover the first photo, then switch off from the centre out
    const cols = small() ? 5 : 11, rows = small() ? 8 : 6;
    const layer = document.createElement('div');
    layer.className = 'cells cells--cover';
    layer.style.setProperty('--cols', cols);
    layer.style.setProperty('--rows', rows);
    const cells = [], glows = [];
    for (let i = 0; i < cols * rows; i++) {
      const d = document.createElement('div'); d.className = 'cell';
      const g = document.createElement('i'); d.appendChild(g);
      layer.appendChild(d); cells.push(d); glows.push(g);
    }
    layer.style.zIndex = '5';
    heroMedia.appendChild(layer);
    root.classList.remove('is-intro');

    const stagger = { grid: [rows, cols], from: 'center', amount: 0.9 };
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' }, onComplete: () => { layer.remove(); if (SOLAR.startSlides) SOLAR.startSlides(); } });
    tl.fromTo(glows, { opacity: 0 }, { opacity: 0.9, duration: 0.25, ease: 'power1.in', stagger }, 0.1)
      .to(cells, { scale: 0, duration: 0.7, ease: 'power3.inOut', stagger }, 0.3)
      .fromTo(heroMedia, { scale: 1.2 }, { scale: 1, duration: 2.2, ease: 'expo.out', clearProps: 'transform' }, 0.3)
      .to('.header__bar > *', { y: 0, opacity: 1, duration: 1.1, stagger: 0.06 }, 0.8)
      .to('.hero .eyebrow', { y: 0, opacity: 1, duration: 1 }, 0.9)
      .to(titleWords, { yPercent: 0, duration: 1.4, stagger: 0.07 }, 0.95)
      .to('.hero__title .curl', { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'power2.inOut' }, 1.35)
      .to('.hero__row > *', { y: 0, opacity: 1, duration: 1.1, stagger: 0.1 }, 1.35)
      .to('.hero__dock', { y: 0, opacity: 1, duration: 1 }, 1.6);
  }

  /* ---------------------------------------------------------------- 4 */
  gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } })
    .fromTo(heroMedia, { clipPath: 'inset(0% 0% 0% 0% round 0px)' }, { clipPath: 'inset(7% 4% 7% 4% round 32px)', ease: 'none' }, 0)
    .to('.slides', { scale: 1.12, ease: 'none' }, 0)
    .to('.hero__content', { yPercent: -35, opacity: 0, ease: 'none' }, 0)
    .to('.hero__dock', { opacity: 0, ease: 'none', duration: 0.4 }, 0);

  /* ---------------------------------------------------------------- 5
     Pins first, in page order, so later triggers measure correctly. */
  const mm = gsap.matchMedia();

  mm.add('(min-width: 900px)', () => {
    root.classList.add('has-process-pin');
    const bar = $('[data-process-bar]');
    ScrollTrigger.create({
      trigger: '.process', start: 'top top', end: '+=300%', pin: true,
      onUpdate: (self) => {
        bar.style.setProperty('--p', Math.max(0.04, self.progress).toFixed(3));
        if (SOLAR.setStep) SOLAR.setStep(Math.min(3, Math.floor(self.progress * 4)));
      },
    });
    return () => root.classList.remove('has-process-pin');
  });

  mm.add('(min-width: 761px)', () => {
    root.classList.add('has-rail-pin');
    const rail = $('[data-rail]');
    const track = $('[data-rail-track]');
    const cards = $$('.proj', track);
    const bar = $('[data-proj-bar]');
    const idx = $('[data-proj-index]');
    const dist = () => {
      const cs = getComputedStyle(rail);
      return Math.max(0, track.scrollWidth - (rail.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)));
    };
    const skewTo = gsap.quickTo(track, 'skewX', { duration: 0.5, ease: 'power3' });
    const tween = gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: {
        trigger: '.projects', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.8, invalidateOnRefresh: true,
        onUpdate: (self) => {
          bar.style.setProperty('--p', (0.2 + 0.8 * self.progress).toFixed(3));
          idx.textContent = String(Math.min(cards.length, Math.round(self.progress * (cards.length - 1)) + 1)).padStart(2, '0');
          skewTo(gsap.utils.clamp(-6, 6, self.getVelocity() / -400));
        },
        onScrubComplete: () => skewTo(0),
      },
    });
    cards.forEach((card) => {
      const img = card.querySelector('img');
      gsap.fromTo(img, { xPercent: -5 }, { xPercent: 5, ease: 'none', scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } });
      gsap.from(card.querySelector('.proj__img'), { clipPath: 'inset(0% 0% 0% 100% round 20px)', ease: 'none', scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left 100%', end: 'left 70%', scrub: true } });
    });
    return () => root.classList.remove('has-rail-pin');
  });

  /* ---------------------------------------------------------------- 6 */
  $$('[data-split]').forEach((h) => {
    const ws = splitWords(h);
    const tl = gsap.timeline({ scrollTrigger: { trigger: h, start: 'top 88%' } });
    tl.from(ws, { yPercent: 118, duration: 1.3, ease: 'expo.out', stagger: 0.06 });
    $$('.curl', h).forEach((c) => {
      const w = write(c);
      tl.fromTo(w.el, w.from, w.to, Math.min(0.9, ws.length * 0.06 + 0.25));
    });
  });
  $$('.label').forEach((l) => {
    if (l.closest('.hero')) return;
    gsap.from(l, { opacity: 0, x: -24, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: l, start: 'top 90%' } });
  });

  const words = $('[data-words]');
  if (words) {
    const ws = splitWords(words);
    gsap.fromTo(ws, { opacity: 0.14 }, { opacity: 1, ease: 'none', stagger: 0.1, scrollTrigger: { trigger: words, start: 'top 80%', end: 'bottom 50%', scrub: true } });
  }
  $$('[data-count]').forEach((el) => {
    const end = parseFloat(el.dataset.count), o = { v: 0 };
    el.textContent = '0';
    ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: () => gsap.to(o, { v: end, duration: 2, ease: 'expo.out', onUpdate: () => { el.textContent = Math.round(o.v); } }) });
  });

  gsap.from('.trust__list li', { y: 30, opacity: 0, duration: 1, stagger: 0.08, ease: 'expo.out', scrollTrigger: { trigger: '.trust', start: 'top 92%' } });

  $$('[data-reveal-img]').forEach((fig) => {
    const fr = fig.querySelector('.statement__frame');
    gsap.timeline({ scrollTrigger: { trigger: fig, start: 'top 80%' } })
      .fromTo(fr, { clipPath: 'inset(100% 0% 0% 0% round 20px)' }, { clipPath: 'inset(0% 0% 0% 0% round 20px)', duration: 1.5, ease: 'expo.inOut' })
      .from(fr.querySelector('img'), { scale: 1.35, duration: 2, ease: 'expo.out' }, 0.1)
      .from(fig.querySelector('figcaption'), { y: 20, opacity: 0, duration: 1, ease: 'expo.out' }, 0.8);
  });

  $$('[data-parallax]').forEach((img) => {
    const box = img.closest('section, figure, article') || img.parentElement;
    gsap.fromTo(img, { yPercent: -7 }, { yPercent: 7, ease: 'none', scrollTrigger: { trigger: box, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  gsap.from('.panel', { y: 120, opacity: 0, duration: 1.3, stagger: 0.09, ease: 'expo.out', scrollTrigger: { trigger: '.panels', start: 'top 85%' } });
  gsap.from('.split__half', { clipPath: 'inset(100% 0% 0% 0%)', duration: 1.5, stagger: 0.15, ease: 'expo.inOut', scrollTrigger: { trigger: '.split', start: 'top 75%' } });
  gsap.from('.split__title', { yPercent: 60, opacity: 0, duration: 1.4, stagger: 0.15, ease: 'expo.out', scrollTrigger: { trigger: '.split', start: 'top 60%' } });

  gsap.from('.process__frame', { y: 80, rotate: 2, opacity: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.process', start: 'top 70%' } });

  gsap.timeline({ scrollTrigger: { trigger: '.sizer', start: 'top 70%' } })
    .from('.ctrl', { y: 40, opacity: 0, duration: 1, stagger: 0.1, ease: 'expo.out' }, 0)
    .from('.result', { y: 100, opacity: 0, duration: 1.4, ease: 'expo.out' }, 0.1)
    .from('.roof i.is-on', { scale: 0, duration: 0.6, stagger: { amount: 0.6, from: 'start' }, ease: 'back.out(2)' }, 0.5);

  mm.add('(max-width: 760px)', () => {
    $$('.proj').forEach((p) => gsap.from(p, { y: 60, opacity: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: '.projects', start: 'top 70%' } }));
  });

  gsap.timeline({ scrollTrigger: { trigger: '.contact', start: 'top 65%' } })
    .from('.contact__lede, .contact__points li', { y: 30, opacity: 0, duration: 1, stagger: 0.08, ease: 'expo.out' }, 0.2)
    .from('.form', { y: 80, opacity: 0, duration: 1.3, ease: 'expo.out' }, 0.1);
  gsap.from('.faq details', { y: 30, opacity: 0, duration: 1, stagger: 0.06, ease: 'expo.out', scrollTrigger: { trigger: '.faq', start: 'top 88%' } });

  gsap.fromTo('.wordmark', { yPercent: 35, '--bgy': '0%' }, { yPercent: 0, '--bgy': '100%', ease: 'none', scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: true } });

  /* ---------------------------------------------------------------- 7 */
  const mq = $('[data-marquee]');
  if (mq) {
    let x = 0, boost = 0, dir = 1, skew = 0, live = false, cur = 0;
    ScrollTrigger.create({
      trigger: '.marquee', start: 'top bottom', end: 'bottom top',
      onToggle: (self) => { live = self.isActive; },
      onUpdate: (self) => { const v = self.getVelocity(); boost = Math.min(Math.abs(v) / 220, 9); dir = self.direction; skew = gsap.utils.clamp(-12, 12, -v / 220); },
    });
    const setX = gsap.quickSetter(mq, 'x', 'px'), setSkew = gsap.quickSetter(mq, 'skewX', 'deg');
    gsap.ticker.add((t, dt) => {
      if (!live) return;
      const half = mq.scrollWidth / 2;
      x = gsap.utils.wrap(-half, 0, x - (50 + boost * 140) * dir * (dt / 1000));
      setX(x);
      cur += (skew - cur) * 0.12; setSkew(cur);
      boost *= 0.93; skew *= 0.9;
    });
  }

  if (fine) {
    $$('[data-magnetic]').forEach((el) => {
      const xTo = gsap.quickTo(el, 'x', { duration: 0.7, ease: 'power3' }), yTo = gsap.quickTo(el, 'y', { duration: 0.7, ease: 'power3' });
      el.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); xTo((e.clientX - r.left - r.width / 2) * 0.3); yTo((e.clientY - r.top - r.height / 2) * 0.45); });
      el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });

    root.classList.add('has-cursor');
    const cur = $('.cursor'), dot = $('.cursor__dot'), ring = $('.cursor__ring'), label = $('.cursor__label');
    const dx = gsap.quickTo(dot, 'x', { duration: 0.1 }), dy = gsap.quickTo(dot, 'y', { duration: 0.1 });
    const rx = gsap.quickTo(ring, 'x', { duration: 0.5, ease: 'power3' }), ry = gsap.quickTo(ring, 'y', { duration: 0.5, ease: 'power3' });
    gsap.set([dot, ring], { x: -100, y: -100 });
    window.addEventListener('pointermove', (e) => { dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); });
    document.addEventListener('pointerleave', () => cur.classList.add('is-hidden'));
    document.addEventListener('pointerenter', () => cur.classList.remove('is-hidden'));
    document.addEventListener('pointerover', (e) => {
      const t = e.target;
      const lab = t.closest('[data-cursor]');
      const hot = t.closest('a, button, summary, .choices label, [tabindex]');
      const field = t.closest('input[type="text"], textarea');
      cur.classList.toggle('has-label', !!lab);
      cur.classList.toggle('is-hover', !!hot && !lab);
      cur.classList.toggle('is-hidden', !!field);
      label.textContent = lab ? lab.dataset.cursor : '';
    });
    document.addEventListener('pointerdown', () => gsap.to(ring, { scale: 0.8, duration: 0.2 }));
    document.addEventListener('pointerup', () => gsap.to(ring, { scale: 1, duration: 0.4, ease: 'back.out(3)' }));
  }

  /* ---------------------------------------------------------------- boot */
  window.addEventListener('load', () => ScrollTrigger.refresh());
  ScrollTrigger.refresh();
  const firstImg = $('.slide.is-active img');
  let started = false;
  const go = () => { if (started) return; started = true; requestAnimationFrame(intro); };
  if (firstImg.complete) go();
  else { firstImg.addEventListener('load', go, { once: true }); firstImg.addEventListener('error', go, { once: true }); setTimeout(go, 2500); }
})();
