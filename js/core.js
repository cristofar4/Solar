/* =========================================================================
   SOLAR — core behaviour (works with or without the animation libraries)
   1. Helpers and the visitor's sun (time-zone estimate, no location prompt)
   2. Header, Solutions mega menu, mobile menu
   3. Hero slideshow
   4. Solutions panels
   5. Homes / Business split
   6. Process steps
   7. System sizer
   8. Quote form
   ========================================================================= */
(() => {
  'use strict';

  /* ---------------------------------------------------------------- 1 */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const pad = (n) => String(n).padStart(2, '0');
  const hhmm = (mins) => { const m = ((Math.round(mins) % 1440) + 1440) % 1440; return pad(Math.floor(m / 60)) + ':' + pad(m % 60); };
  const fmt = (n, d = 0) => Number(n).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
  const SOLAR = (window.SOLAR = window.SOLAR || {});
  SOLAR.reduce = reduce;

  const ZONES = {
    'Africa/Lagos': [6.45, 3.39], 'Africa/Accra': [5.6, -0.19], 'Africa/Abidjan': [5.36, -4.01], 'Africa/Dakar': [14.72, -17.47],
    'Africa/Douala': [4.05, 9.7], 'Africa/Kinshasa': [-4.32, 15.31], 'Africa/Luanda': [-8.84, 13.23], 'Africa/Nairobi': [-1.29, 36.82],
    'Africa/Kampala': [0.35, 32.58], 'Africa/Dar_es_Salaam': [-6.79, 39.21], 'Africa/Addis_Ababa': [9.03, 38.74], 'Africa/Cairo': [30.04, 31.24],
    'Africa/Casablanca': [33.57, -7.59], 'Africa/Johannesburg': [-26.2, 28.05], 'Africa/Harare': [-17.83, 31.05], 'Africa/Lusaka': [-15.39, 28.32],
    'Europe/London': [51.51, -0.13], 'Europe/Dublin': [53.35, -6.26], 'Europe/Lisbon': [38.72, -9.14], 'Europe/Madrid': [40.42, -3.7],
    'Europe/Paris': [48.86, 2.35], 'Europe/Amsterdam': [52.37, 4.9], 'Europe/Berlin': [52.52, 13.4], 'Europe/Rome': [41.9, 12.5],
    'Europe/Warsaw': [52.23, 21.01], 'Europe/Stockholm': [59.33, 18.07], 'Europe/Athens': [37.98, 23.73], 'Europe/Istanbul': [41.01, 28.98],
    'America/New_York': [40.71, -74.01], 'America/Toronto': [43.65, -79.38], 'America/Chicago': [41.88, -87.63], 'America/Denver': [39.74, -104.99],
    'America/Phoenix': [33.45, -112.07], 'America/Los_Angeles': [34.05, -118.24], 'America/Mexico_City': [19.43, -99.13], 'America/Bogota': [4.71, -74.07],
    'America/Lima': [-12.05, -77.04], 'America/Sao_Paulo': [-23.55, -46.63], 'America/Argentina/Buenos_Aires': [-34.6, -58.38],
    'Asia/Dubai': [25.2, 55.27], 'Asia/Riyadh': [24.71, 46.68], 'Asia/Karachi': [24.86, 67.0], 'Asia/Kolkata': [19.08, 72.88],
    'Asia/Calcutta': [19.08, 72.88], 'Asia/Dhaka': [23.81, 90.41], 'Asia/Bangkok': [13.76, 100.5], 'Asia/Jakarta': [-6.2, 106.85],
    'Asia/Singapore': [1.35, 103.82], 'Asia/Manila': [14.6, 120.98], 'Asia/Shanghai': [31.23, 121.47], 'Asia/Tokyo': [35.68, 139.69],
    'Australia/Perth': [-31.95, 115.86], 'Australia/Brisbane': [-27.47, 153.03], 'Australia/Sydney': [-33.87, 151.21], 'Pacific/Auckland': [-36.85, 174.76],
  };
  const REGION_LAT = { Africa: 5, Europe: 48, America: 30, Asia: 25, Australia: -30, Pacific: -15 };
  function place() {
    let tz = '';
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { /* old browser */ }
    if (ZONES[tz]) return { lat: ZONES[tz][0], lon: ZONES[tz][1] };
    return { lat: REGION_LAT[tz.split('/')[0]] ?? 25, lon: (-new Date().getTimezoneOffset() / 60) * 15 };
  }
  // NOAA approximation, in minutes after local midnight
  function sunDay(date, lat, lon) {
    const doy = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 864e5);
    const tzH = -date.getTimezoneOffset() / 60;
    const g = (2 * Math.PI / 365) * (doy - 1);
    const eq = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
    const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
    const rad = Math.PI / 180, latR = lat * rad;
    const cosH = clamp(Math.cos(90.833 * rad) / (Math.cos(latR) * Math.cos(decl)) - Math.tan(latR) * Math.tan(decl), -1, 1);
    const half = (Math.acos(cosH) / rad) * 4;
    const noon = 720 - 4 * lon - eq + tzH * 60;
    return { rise: noon - half, set: noon + half, noonElevation: 90 - Math.abs(lat - decl / rad) };
  }
  const here = place();
  let sun = sunDay(new Date(), here.lat, here.lon);

  function paintSun() {
    const d = new Date(), now = d.getHours() * 60 + d.getMinutes();
    const up = now > sun.rise && now < sun.set;
    const chip = $('[data-sunchip]');
    if (chip) {
      chip.classList.toggle('is-night', !up);
      $('[data-sunchip-text]', chip).textContent = (up ? 'Sun’s up near you · ' : 'After sunset near you · ') + hhmm(now);
    }
    $$('[data-sun-times]').forEach((el) => { el.textContent = 'Sunrise ' + hhmm(sun.rise) + ' · Sunset ' + hhmm(sun.set) + ' (estimated from your time zone)'; });
  }
  paintSun();
  setInterval(() => { sun = sunDay(new Date(), here.lat, here.lon); paintSun(); }, 60000);
  $$('[data-year]').forEach((el) => { el.textContent = String(new Date().getFullYear()); });

  /* ---------------------------------------------------------------- 2 */
  const header = $('#header');
  const megaBtn = $('#megaBtn');
  const mega = $('#mega');
  const burger = $('#burger');
  const menu = $('#menu');
  let lastY = window.scrollY;

  function onScroll() {
    const y = window.scrollY;
    header.classList.toggle('is-solid', y > 40);
    const open = !mega.hidden || !menu.hidden;
    if (!open) {
      if (y > lastY + 6 && y > 500) header.classList.add('is-hidden');
      else if (y < lastY - 6 || y < 200) header.classList.remove('is-hidden');
    }
    lastY = y;
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  header.addEventListener('focusin', () => header.classList.remove('is-hidden'));
  onScroll();

  // mega menu: hover on desktop, click and keyboard everywhere
  let megaTimer = 0;
  function setMega(open) {
    clearTimeout(megaTimer);
    if (open === !mega.hidden) return;
    mega.hidden = !open;
    megaBtn.setAttribute('aria-expanded', String(open));
    header.classList.toggle('mega-open', open);
  }
  megaBtn.addEventListener('click', () => setMega(mega.hidden));
  const hoverable = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (hoverable) {
    [megaBtn, mega].forEach((el) => {
      el.addEventListener('pointerenter', () => setMega(true));
      el.addEventListener('pointerleave', () => { megaTimer = setTimeout(() => setMega(false), 220); });
    });
  }
  mega.addEventListener('click', (e) => {
    const card = e.target.closest('[data-solution]');
    if (card) { openPanel(+card.dataset.solution); setMega(false); }
  });
  document.addEventListener('click', (e) => { if (!mega.hidden && !header.contains(e.target)) setMega(false); });

  function setMenu(open) {
    menu.hidden = !open;
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.style.overflow = open ? 'hidden' : '';
    if (SOLAR.lenis) { if (open) SOLAR.lenis.stop(); else SOLAR.lenis.start(); }
    header.classList.remove('is-hidden');
    header.classList.toggle('is-solid', open || window.scrollY > 40);
  }
  burger.addEventListener('click', () => setMenu(menu.hidden));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!mega.hidden) { setMega(false); megaBtn.focus(); }
    if (!menu.hidden) { setMenu(false); burger.focus(); }
  });

  /* ---------------------------------------------------------------- 3 */
  const hero = $('.hero');
  const slides = $$('.slide');
  const bars = $$('[data-goto]');
  const capNum = $('[data-slide-num]'), capTitle = $('[data-slide-cap]'), capSub = $('[data-slide-sub]');
  const DUR = 7000;
  let current = 0, timer = 0, busy = false, heroVisible = true;
  hero.style.setProperty('--dur', DUR + 'ms');

  function paintBars() {
    bars.forEach((b, i) => {
      b.setAttribute('aria-selected', String(i === current));
      b.classList.toggle('is-done', i < current);
      const bar = b.querySelector('i');
      bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = '';
    });
  }
  function caption() {
    const s = slides[current];
    capNum.textContent = pad(current + 1);
    capTitle.textContent = s.dataset.caption;
    capSub.textContent = s.dataset.sub;
  }
  async function goTo(i) {
    i = (i + slides.length) % slides.length;
    if (i === current || busy) return;
    busy = true;
    const from = slides[current], to = slides[i];
    const img = to.querySelector('img');
    if (img.loading === 'lazy') img.loading = 'eager';
    if (!img.complete) await new Promise((r) => { img.addEventListener('load', r, { once: true }); img.addEventListener('error', r, { once: true }); });
    current = i;
    caption();
    paintBars();
    if (SOLAR.slideTransition) { try { await SOLAR.slideTransition(to); } catch (e) { /* fall through */ } }
    from.classList.remove('is-active');
    to.classList.add('is-active');
    busy = false;
    schedule();
  }
  function schedule() {
    clearTimeout(timer);
    if (reduce || !heroVisible || document.hidden) { hero.classList.add('is-paused'); return; }
    hero.classList.remove('is-paused');
    timer = setTimeout(() => goTo(current + 1), DUR);
  }
  bars.forEach((b) => b.addEventListener('click', () => goTo(+b.dataset.goto)));
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((en) => { heroVisible = en[0].isIntersecting; schedule(); }, { threshold: 0.15 }).observe(hero);
  }
  document.addEventListener('visibilitychange', schedule);
  SOLAR.startSlides = () => { paintBars(); schedule(); };
  if (!root.classList.contains('is-intro')) SOLAR.startSlides();
  // warm the other slides once the page has loaded
  window.addEventListener('load', () => slides.forEach((s) => { const im = s.querySelector('img'); if (im.loading === 'lazy') im.loading = 'eager'; }));

  /* ---------------------------------------------------------------- 4 */
  const panels = $$('.panel');
  function openPanel(i) {
    panels.forEach((p, j) => {
      const on = j === i;
      p.classList.toggle('is-open', on);
      p.querySelector('.panel__head').setAttribute('aria-expanded', String(on));
    });
  }
  SOLAR.openPanel = openPanel;
  panels.forEach((p, i) => {
    const head = p.querySelector('.panel__head');
    head.addEventListener('click', () => openPanel(i));
    head.addEventListener('focus', () => openPanel(i));
    if (hoverable) p.addEventListener('pointerenter', () => openPanel(i));
  });

  /* ---------------------------------------------------------------- 5 */
  const halves = $$('.split__half');
  function focusHalf(name) { halves.forEach((h) => h.classList.toggle('is-focus', h.dataset.half === name)); }
  halves.forEach((h) => {
    if (hoverable) h.addEventListener('pointerenter', () => focusHalf(h.dataset.half));
    h.addEventListener('focusin', () => focusHalf(h.dataset.half));
    h.addEventListener('click', () => focusHalf(h.dataset.half));
  });
  $$('[data-split-target]').forEach((a) => a.addEventListener('click', () => focusHalf(a.dataset.splitTarget)));
  if (location.hash === '#business') focusHalf('business');

  /* ---------------------------------------------------------------- 6 */
  const steps = $$('.step');
  const labels = $$('.process__labels li');
  const pimgs = $$('[data-pimg]');
  let stepNow = 0, stepBusy = false, stepWant = 0;
  async function showStepImage(i) {
    if (stepBusy) { stepWant = i; return; }
    stepBusy = true; stepWant = i;
    const to = pimgs[i];
    if (to.loading === 'lazy') to.loading = 'eager';
    if (SOLAR.processTransition) { try { await SOLAR.processTransition(to); } catch (e) { /* fall through */ } }
    pimgs.forEach((im, j) => im.classList.toggle('is-active', j === i));
    stepBusy = false;
    if (stepWant !== i) showStepImage(stepWant);
  }
  SOLAR.setStep = (i) => {
    if (i === stepNow) return;
    stepNow = i;
    steps.forEach((s, j) => s.classList.toggle('is-active', j === i));
    labels.forEach((l, j) => l.classList.toggle('is-active', j === i));
    showStepImage(i);
  };

  /* ---------------------------------------------------------------- 7
     Rough sizing: 430 W panels, 78% performance ratio, ~2 m² per panel,
     battery sized for the chosen hours of evening use, 0.4 kg CO₂ per kWh. */
  const ins = { use: $('[data-in="use"]'), sun: $('[data-in="sun"]'), backup: $('[data-in="backup"]') };
  const outs = { use: $('[data-out="use"]'), sun: $('[data-out="sun"]'), backup: $('[data-out="backup"]') };
  const res = (k) => $('[data-res="' + k + '"]');
  const roof = $('[data-roof]');
  const roofMore = $('[data-roof-more]');
  const ROOF_CELLS = 40;
  if (roof) roof.innerHTML = '<i></i>'.repeat(ROOF_CELLS);
  const roofCells = roof ? $$('i', roof) : [];
  let lit = 0;

  if (ins.sun) {
    const elev = Math.sin((clamp(sun.noonElevation, 0, 90) * Math.PI) / 180);
    ins.sun.value = String(clamp(Math.round((2.2 + 3.6 * elev) * 2) / 2, 3, 7));
  }
  const setNum = (el, value, d) => {
    if (SOLAR.tweenNumber) SOLAR.tweenNumber(el, value, d);
    else el.textContent = fmt(value, d);
  };
  function size() {
    if (!ins.use) return;
    const use = +ins.use.value, sunH = +ins.sun.value, backup = +ins.backup.value;
    [ins.use, ins.sun, ins.backup].forEach((r) => {
      r.style.setProperty('--fill', (((+r.value - +r.min) / (+r.max - +r.min)) * 100).toFixed(1) + '%');
    });
    outs.use.textContent = fmt(use) + ' kWh';
    outs.sun.textContent = sunH.toFixed(1) + ' h';
    outs.backup.textContent = backup ? backup + ' h' : 'None';

    const daily = use / 30.4;
    const panelsN = Math.max(2, Math.ceil((daily / (sunH * 0.78)) * 1000 / 430));
    const kw = (panelsN * 430) / 1000;
    const batt = backup ? Math.ceil(((daily / 24) * backup * 1.3) / 5) * 5 : 0;
    const year = kw * sunH * 0.78 * 365;
    setNum(res('kw'), kw, 1);
    setNum(res('panels'), panelsN, 0);
    setNum(res('roof'), Math.round(panelsN * 2), 0);
    if (batt) { setNum(res('batt'), batt, 0); $('[data-res-unit="batt"]').hidden = false; }
    else { res('batt').textContent = 'None'; $('[data-res-unit="batt"]').hidden = true; }
    setNum(res('year'), Math.round(year / 10) * 10, 0);
    setNum(res('co2'), (year * 0.4) / 1000, 1);

    const want = Math.min(panelsN, ROOF_CELLS);
    if (want !== lit) {
      const was = lit;
      lit = want;
      // fill from the eaves (bottom row) upwards
      const order = roofCells.slice().reverse();
      order.forEach((c, i) => c.classList.toggle('is-on', i < want));
      if (SOLAR.flashCells) SOLAR.flashCells(order.slice(Math.min(was, want), Math.max(was, want)), want > was);
    }
    roofMore.textContent = panelsN > ROOF_CELLS ? '+' + (panelsN - ROOF_CELLS) + ' more panels' : '';
  }
  Object.values(ins).forEach((r) => r && r.addEventListener('input', size));
  size();
  SOLAR.resize = size;

  /* ---------------------------------------------------------------- 8
     Front-end only: connect the TODO below to your CRM or email service. */
  const form = $('#quoteForm');
  const done = $('#formDone');
  if (form) {
    const rules = {
      name: () => form.elements.name.value.trim().length > 1,
      contact: () => { const v = form.elements.contact.value.trim(); return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) || v.replace(/\D/g, '').length >= 7; },
      type: () => !!form.querySelector('input[name="type"]:checked'),
    };
    const fieldOf = (n) => (n === 'type' ? form.querySelector('.field--choice') : form.elements[n].closest('.field'));
    const check = (n) => {
      const ok = rules[n]();
      const f = fieldOf(n);
      f.classList.toggle('is-invalid', !ok);
      const el = n === 'type' ? form.querySelector('input[name="type"]') : form.elements[n];
      el.setAttribute('aria-invalid', String(!ok));
      if (!ok) el.setAttribute('aria-describedby', $('.field__error', f).id); else el.removeAttribute('aria-describedby');
      return ok;
    };
    ['name', 'contact'].forEach((n) => {
      const el = form.elements[n];
      el.addEventListener('blur', () => { if (el.value) check(n); });
      el.addEventListener('input', () => { if (fieldOf(n).classList.contains('is-invalid')) check(n); });
    });
    $$('input[name="type"]', form).forEach((r) => r.addEventListener('change', () => check('type')));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const names = ['name', 'contact', 'type'];
      const bad = names.filter((n) => !check(n));
      if (bad.length) {
        (bad[0] === 'type' ? form.querySelector('input[name="type"]') : form.elements[bad[0]]).focus();
        done.textContent = '';
        return;
      }
      const first = form.elements.name.value.trim().split(/\s+/)[0];
      // TODO: send new FormData(form) to your backend here.
      done.textContent = 'Thanks, ' + first + '. We’ll call within one working day to book your visit.';
      form.reset();
    });
  }
})();
