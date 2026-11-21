/* =========================================================================
   SOLAR — core behaviour (works with or without the animation libraries)
   1. Helpers
   2. Real sun for the visitor (time-zone estimate)
   3. Page clock: scroll position → time of day → sky, nav, rail
   4. Sun-path navigation
   5. Header state and mobile drawer
   6. Home / Business switch
   7. "Your roof today" simulator
   8. Project sparklines
   9. Care steps
  10. Assessment form
   ========================================================================= */
(() => {
  'use strict';

  /* ---------------------------------------------------------------- 1 */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const pad = (n) => String(n).padStart(2, '0');
  const hhmm = (mins) => {
    const m = ((Math.round(mins) % 1440) + 1440) % 1440;
    return pad(Math.floor(m / 60)) + ':' + pad(m % 60);
  };
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, t) => {
    const A = hex(a), B = hex(b);
    return 'rgb(' + A.map((v, i) => Math.round(lerp(v, B[i], t))).join(' ') + ')';
  };
  // piecewise colour ramp: stops = [[x, '#hex'], ...]
  const ramp = (stops, x) => {
    if (x <= stops[0][0]) return mix(stops[0][1], stops[0][1], 0);
    for (let i = 1; i < stops.length; i++) {
      if (x <= stops[i][0]) {
        const [x0, c0] = stops[i - 1], [x1, c1] = stops[i];
        return mix(c0, c1, (x - x0) / Math.max(1e-6, x1 - x0));
      }
    }
    const last = stops[stops.length - 1][1];
    return mix(last, last, 0);
  };
  if (reduceMotion.matches) root.classList.add('reduce');

  const SOLAR = (window.SOLAR = window.SOLAR || {});
  SOLAR.reduce = reduceMotion.matches;
  SOLAR.hhmm = hhmm;
  SOLAR.clamp = clamp;

  /* ---------------------------------------------------------------- 2
     The visitor's own sun, estimated from the time zone (no location prompt). */
  const ZONES = {
    'Africa/Lagos': [6.45, 3.39], 'Africa/Accra': [5.6, -0.19], 'Africa/Abidjan': [5.36, -4.01],
    'Africa/Dakar': [14.72, -17.47], 'Africa/Douala': [4.05, 9.7], 'Africa/Kinshasa': [-4.32, 15.31],
    'Africa/Luanda': [-8.84, 13.23], 'Africa/Nairobi': [-1.29, 36.82], 'Africa/Kampala': [0.35, 32.58],
    'Africa/Dar_es_Salaam': [-6.79, 39.21], 'Africa/Addis_Ababa': [9.03, 38.74], 'Africa/Cairo': [30.04, 31.24],
    'Africa/Casablanca': [33.57, -7.59], 'Africa/Algiers': [36.75, 3.06], 'Africa/Tunis': [36.8, 10.18],
    'Africa/Johannesburg': [-26.2, 28.05], 'Africa/Harare': [-17.83, 31.05], 'Africa/Lusaka': [-15.39, 28.32],
    'Europe/London': [51.51, -0.13], 'Europe/Dublin': [53.35, -6.26], 'Europe/Lisbon': [38.72, -9.14],
    'Europe/Madrid': [40.42, -3.7], 'Europe/Paris': [48.86, 2.35], 'Europe/Amsterdam': [52.37, 4.9],
    'Europe/Berlin': [52.52, 13.4], 'Europe/Rome': [41.9, 12.5], 'Europe/Warsaw': [52.23, 21.01],
    'Europe/Stockholm': [59.33, 18.07], 'Europe/Athens': [37.98, 23.73], 'Europe/Istanbul': [41.01, 28.98],
    'Europe/Moscow': [55.76, 37.62],
    'America/New_York': [40.71, -74.01], 'America/Toronto': [43.65, -79.38], 'America/Chicago': [41.88, -87.63],
    'America/Denver': [39.74, -104.99], 'America/Phoenix': [33.45, -112.07], 'America/Los_Angeles': [34.05, -118.24],
    'America/Vancouver': [49.28, -123.12], 'America/Halifax': [44.65, -63.57], 'America/Mexico_City': [19.43, -99.13],
    'America/Bogota': [4.71, -74.07], 'America/Lima': [-12.05, -77.04], 'America/Santiago': [-33.45, -70.67],
    'America/Sao_Paulo': [-23.55, -46.63], 'America/Argentina/Buenos_Aires': [-34.6, -58.38], 'Pacific/Honolulu': [21.31, -157.86],
    'Asia/Dubai': [25.2, 55.27], 'Asia/Riyadh': [24.71, 46.68], 'Asia/Karachi': [24.86, 67.0],
    'Asia/Kolkata': [19.08, 72.88], 'Asia/Calcutta': [19.08, 72.88], 'Asia/Dhaka': [23.81, 90.41],
    'Asia/Bangkok': [13.76, 100.5], 'Asia/Jakarta': [-6.2, 106.85], 'Asia/Singapore': [1.35, 103.82],
    'Asia/Manila': [14.6, 120.98], 'Asia/Hong_Kong': [22.32, 114.17], 'Asia/Shanghai': [31.23, 121.47],
    'Asia/Seoul': [37.57, 126.98], 'Asia/Tokyo': [35.68, 139.69],
    'Australia/Perth': [-31.95, 115.86], 'Australia/Brisbane': [-27.47, 153.03], 'Australia/Sydney': [-33.87, 151.21],
    'Australia/Melbourne': [-37.81, 144.96], 'Pacific/Auckland': [-36.85, 174.76],
  };
  const REGION_LAT = { Africa: 5, Europe: 48, America: 30, Asia: 25, Australia: -30, Pacific: -15, Atlantic: 30, Indian: -10 };
  function guessPlace() {
    let tz = '';
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { /* old browser */ }
    if (ZONES[tz]) return { lat: ZONES[tz][0], lon: ZONES[tz][1] };
    return { lat: REGION_LAT[tz.split('/')[0]] ?? 25, lon: (-new Date().getTimezoneOffset() / 60) * 15 };
  }
  // NOAA approximation; minutes after local midnight
  function sunDay(date, lat, lon) {
    const doy = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 864e5);
    const tzH = -date.getTimezoneOffset() / 60;
    const g = (2 * Math.PI / 365) * (doy - 1);
    const eq = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
    const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g)
      + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
    const rad = Math.PI / 180, latR = lat * rad;
    const cosH = clamp(Math.cos(90.833 * rad) / (Math.cos(latR) * Math.cos(decl)) - Math.tan(latR) * Math.tan(decl), -1, 1);
    const halfDay = (Math.acos(cosH) / rad) * 4;
    const noon = 720 - 4 * lon - eq + tzH * 60;
    return { rise: noon - halfDay, set: noon + halfDay, noonElevation: 90 - Math.abs(lat - decl / rad) };
  }
  const place = guessPlace();
  const realSun = sunDay(new Date(), place.lat, place.lon);
  const nowMinutes = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };

  $$('[data-sun-footer]').forEach((el) => { el.textContent = 'Near you today ↑' + hhmm(realSun.rise) + ' ↓' + hhmm(realSun.set); });
  $$('[data-year]').forEach((el) => { el.textContent = String(new Date().getFullYear()); });

  /* ---------------------------------------------------------------- 3
     Page clock. Each scene carries a time; scrolling interpolates between them. */
  const PAGE = { rise: 370, set: 1110, end: 1350 }; // the page's day: sunrise 06:10, sunset 18:30
  const scenes = $$('[data-scene]').map((el) => ({
    el, id: el.id, time: +el.dataset.time, label: el.dataset.label || '',
    dark: el.hasAttribute('data-dark'), darkFrom: el.dataset.darkFrom ? +el.dataset.darkFrom : null,
    top: 0, bottom: 0,
  }));
  const SKY = [[350, '#ECE2D6'], [450, '#F2EBE1'], [600, '#F4F1EA'], [720, '#F6F4EE'], [900, '#F4EFE6'], [1020, '#F2E6D3'], [1080, '#EFDCC2']];
  const sky = $('.sky');
  const masthead = $('#masthead');
  const rail = $('.rail');
  const railTime = $('[data-rail-time]');
  const railText = $('[data-rail-text]');
  const railTrack = $('[data-rail-track]');
  const sunsetTime = $('[data-sunset-time]');
  let pageTime = scenes[0] ? scenes[0].time : 350;

  // build rail ticks
  if (railTrack) {
    railTrack.innerHTML = scenes.filter((s) => s.id).map((s) =>
      '<li><a href="#' + s.id + '" data-rail="' + s.id + '" aria-label="' + s.label.replace(/"/g, '') + '"></a></li>').join('');
  }
  const railLinks = $$('[data-rail]');

  function measure() {
    scenes.forEach((s) => {
      const box = s.el.parentElement && s.el.parentElement.classList.contains('pin-spacer') ? s.el.parentElement : s.el;
      const r = box.getBoundingClientRect();
      s.top = r.top + window.scrollY;
      s.bottom = s.top + r.height;
    });
  }

  function timeAt(y) {
    const vh = window.innerHeight;
    const docEnd = document.documentElement.scrollHeight - vh + vh * 0.35;
    for (let i = scenes.length - 1; i >= 0; i--) {
      const s = scenes[i];
      const top = i === 0 ? vh * 0.35 : s.top;
      if (y >= top || i === 0) {
        const next = scenes[i + 1];
        const nTop = next ? next.top : docEnd;
        const nTime = next ? next.time : PAGE.end;
        return lerp(s.time, nTime, clamp((y - top) / Math.max(1, nTop - top), 0, 1));
      }
    }
    return pageTime;
  }
  const sceneAt = (y) => {
    let cur = scenes[0];
    scenes.forEach((s) => { if (y >= s.top) cur = s; });
    return cur;
  };
  const isDarkAt = (y) => scenes.some((s) => {
    if (s.dark) return y >= s.top && y < s.bottom;
    if (s.darkFrom != null) return y >= s.top + (s.bottom - s.top) * s.darkFrom && y < s.bottom;
    return false;
  });

  let lastRailId = null;
  function tick() {
    const vh = window.innerHeight;
    const y = window.scrollY + vh * 0.35;
    pageTime = timeAt(y);
    SOLAR.pageTime = pageTime;

    // sky colour + travelling glow
    if (sky) {
      sky.style.setProperty('--sky', ramp(SKY, pageTime));
      const f = (pageTime - PAGE.rise) / (PAGE.set - PAGE.rise);
      const up = f > 0 && f < 1 ? Math.sin(Math.PI * f) : 0;
      sky.style.setProperty('--gx', (6 + 88 * clamp(f, 0, 1)).toFixed(2) + 'vw');
      sky.style.setProperty('--gy', (96 - 82 * up).toFixed(2) + 'vh');
      sky.style.setProperty('--go', clamp(up * 1.6, 0, 1).toFixed(3));
    }

    // header + rail tone
    const dark = isDarkAt(window.scrollY + 40);
    masthead.classList.toggle('is-dark', dark);
    if (rail) rail.classList.toggle('is-dark', isDarkAt(window.scrollY + vh / 2));

    // rail
    const s = sceneAt(window.scrollY + vh / 2);
    if (railTime) railTime.textContent = hhmm(pageTime);
    if (s && s.id && s.id !== lastRailId) {
      lastRailId = s.id;
      railText.textContent = s.label;
      railLinks.forEach((a) => {
        if (a.dataset.rail === s.id) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
      markNav(s.id);
    }

    // sunset readout follows the page clock
    if (sunsetTime) sunsetTime.textContent = hhmm(clamp(pageTime, 1080, 1170));

    followSun();
    if (SOLAR.onTick) SOLAR.onTick(pageTime);
  }
  let ticking = false;
  const requestTick = () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; tick(); }); } };
  window.addEventListener('scroll', requestTick, { passive: true });

  /* ---------------------------------------------------------------- 4
     Sun-path navigation: the sun sits at the page's time of day. Point at a
     link and it travels the arc to that link. */
  const nav = $('#sunpath');
  const dome = nav && $('.sunpath__dome', nav);
  const sunEl = nav && $('.sunpath__sun', nav);
  const arcSvg = nav && $('.sunpath__arc', nav);
  const arcPath = nav && $('.sunpath__path', nav);
  const arcElapsed = nav && $('.sunpath__elapsed', nav);
  const arcTicks = nav && $('.sunpath__ticks', nav);
  const navLinks = nav ? $$('.sunpath__links a', nav) : [];
  let W = 0, H = 0, A = 0, curF = 0, anim = 0, pointing = false, returning = false;

  const pageF = () => {
    const f = (pageTime - PAGE.rise) / (PAGE.set - PAGE.rise);
    return f < 0 ? -0.06 : f > 1 ? 1.06 : f;
  };
  const arcXY = (f) => [clamp(f, 0, 1) * W, f < 0 || f > 1 ? H : H - A * Math.sin(Math.PI * f)];
  const arcD = (f0, f1) => {
    let d = '';
    for (let i = 0; i <= 56; i++) {
      const [x, y] = arcXY(f0 + ((f1 - f0) * i) / 56);
      d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
    }
    return d;
  };
  const linkF = (a) => {
    const r = a.getBoundingClientRect(), d = dome.getBoundingClientRect();
    return (r.left + r.width / 2 - d.left) / d.width;
  };
  function placeSun() {
    const [x, y] = arcXY(curF);
    sunEl.style.transform = 'translate(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px)';
  }
  function moveSun(f, done) {
    cancelAnimationFrame(anim);
    if (reduceMotion.matches || !W) { curF = f; placeSun(); if (done) done(); return; }
    const from = curF, t0 = performance.now();
    const dur = 420 + 520 * Math.min(1, Math.abs(f - from));
    const step = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      curF = from + (f - from) * e;
      placeSun();
      if (k < 1) anim = requestAnimationFrame(step); else if (done) done();
    };
    anim = requestAnimationFrame(step);
  }
  function followSun() {
    if (!nav || !W) return;
    const f = pageF();
    nav.classList.toggle('is-night', f < 0 || f > 1);
    arcElapsed.setAttribute('d', f > 0 ? arcD(0, clamp(f, 0, 1)) : '');
    if (!pointing && !returning) { curF = f; placeSun(); }
  }
  function drawNav() {
    if (!dome) return;
    W = dome.clientWidth; H = dome.clientHeight; A = Math.max(6, H - 4);
    arcSvg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    arcPath.setAttribute('d', arcD(0, 1));
    let t = '<line class="sunpath__horizon" x1="0" y1="' + (H - 0.5) + '" x2="' + W + '" y2="' + (H - 0.5) + '"/>';
    navLinks.forEach((a) => {
      if (!a.offsetParent) return;
      const x = (linkF(a) * W).toFixed(1);
      t += '<line class="sunpath__tick" data-tick="' + a.dataset.nav + '" x1="' + x + '" x2="' + x + '" y1="' + (H - 3.5) + '" y2="' + H + '"/>';
    });
    arcTicks.innerHTML = t;
    markNav(lastRailId);
    followSun();
  }
  function markNav(id) {
    const key = navLinks.some((a) => a.dataset.nav === id) ? id : null;
    $$('[data-nav]').forEach((a) => {
      if (a.dataset.nav === key) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
    if (arcTicks) $$('.sunpath__tick', arcTicks).forEach((ln) => {
      const on = ln.dataset.tick === key;
      ln.classList.toggle('is-active', on);
      ln.setAttribute('y1', String(H - (on ? 6 : 3.5)));
    });
  }
  if (nav) {
    navLinks.forEach((a) => {
      const go = () => { pointing = true; returning = false; nav.classList.add('is-lifted'); moveSun(linkF(a)); };
      a.addEventListener('pointerenter', go);
      a.addEventListener('focus', go);
    });
    const rest = () => {
      pointing = false; returning = true; nav.classList.remove('is-lifted');
      moveSun(pageF(), () => { returning = false; });
    };
    nav.addEventListener('pointerleave', rest);
    nav.addEventListener('focusout', (e) => { if (!nav.contains(e.relatedTarget)) rest(); });
  }

  /* ---------------------------------------------------------------- 5 */
  const menuBtn = $('#menuBtn');
  const drawer = $('#drawer');
  const headerState = () => masthead.classList.toggle('is-scrolled', window.scrollY > 24);
  window.addEventListener('scroll', headerState, { passive: true });
  headerState();
  function setDrawer(open) {
    drawer.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
  }
  menuBtn.addEventListener('click', () => setDrawer(drawer.hidden));
  drawer.addEventListener('click', (e) => { if (e.target.closest('a')) setDrawer(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !drawer.hidden) { setDrawer(false); menuBtn.focus(); } });
  document.addEventListener('click', (e) => { if (!drawer.hidden && !masthead.contains(e.target)) setDrawer(false); });

  /* ---------------------------------------------------------------- 6 */
  const fitCard = $('.sys--fit');
  const SPEC = {
    home: 'Homes: 6–12 kW on the roof and a 10–15 kWh battery on the wall.',
    business: 'Business: 50–500 kW on roofs or carports, sized to cut your peak-demand charges.',
  };
  if (fitCard) {
    let mode = 'home';
    const setMode = (next) => {
      mode = next;
      $$('[data-mode-btn]', fitCard).forEach((b) => {
        const on = b.dataset.modeBtn === next;
        b.setAttribute('aria-checked', String(on));
        b.tabIndex = on ? 0 : -1;
      });
      $$('[data-mode-img]', fitCard).forEach((img) => img.classList.toggle('is-active', img.dataset.modeImg === next));
      $('[data-mode-spec]', fitCard).textContent = SPEC[next];
    };
    $$('[data-mode-btn]', fitCard).forEach((b) => {
      b.addEventListener('click', () => setMode(b.dataset.modeBtn));
      b.addEventListener('keydown', (e) => {
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
        e.preventDefault();
        const next = mode === 'home' ? 'business' : 'home';
        setMode(next);
        $('[data-mode-btn="' + next + '"]', fitCard).focus();
      });
    });
  }

  // phones: the systems track scrolls natively; keep its progress bar honest
  const hs = $('[data-hscroll]');
  const sysBar = $('[data-sys-bar]');
  if (hs && sysBar) {
    hs.addEventListener('scroll', () => {
      const max = hs.scrollWidth - hs.clientWidth;
      if (max > 0) sysBar.style.setProperty('--p', (0.2 + 0.8 * (hs.scrollLeft / max)).toFixed(3));
    }, { passive: true });
  }

  /* ---------------------------------------------------------------- 7
     "Your roof today": 8 kW array, 13.5 kWh battery (5 kW, 10% reserve). */
  const STEPS = 288, DT = 24 / STEPS;
  const SYS = { cap: 13.5, pmax: 5, reserve: 0.1 };
  const bump = (t, m, s) => Math.exp(-((t - m) ** 2) / (2 * s * s));
  const loadAt = (t) => 0.38 + 1.35 * bump(t, 7.2, 0.75) + 0.55 * bump(t, 13, 1.6) + 2.4 * bump(t, 19.6, 1.3) + 0.25 * bump(t, 22.5, 0.8);

  function simulate() {
    const rise = realSun.rise / 60, set = realSun.set / 60;
    const elev = clamp(Math.sin((clamp(realSun.noonElevation, 0, 90) * Math.PI) / 180), 0.3, 1);
    const peak = 6.5 * Math.sqrt(elev);
    const solarAt = (t) => {
      if (set - rise < 0.5) return 0;
      const s = (t - rise) / (set - rise);
      return s <= 0 || s >= 1 ? 0 : peak * Math.pow(Math.sin(Math.PI * s), 1.25);
    };
    let soc = 0.5 * SYS.cap;
    const rows = [];
    for (let day = 0; day < 3; day++) {
      for (let i = 0; i < STEPS; i++) {
        const t = i * DT, p = solarAt(t), l = loadAt(t), net = p - l;
        let batt = 0, grid = 0;
        if (net >= 0) { const c = Math.min(net, SYS.pmax, (SYS.cap - soc) / DT); soc += c * DT; batt = c; grid = net - c; }
        else {
          const need = -net, d = Math.min(need, SYS.pmax, Math.max(0, (soc - SYS.reserve * SYS.cap) / DT));
          soc -= d * DT; batt = -d; grid = -(need - d);
        }
        if (day === 2) rows.push({ t, p, l, batt, grid, soc: soc / SYS.cap });
      }
    }
    const sum = (fn) => rows.reduce((a, r) => a + fn(r), 0) * DT;
    const totals = { gen: sum((r) => r.p), use: sum((r) => r.l), imp: sum((r) => Math.max(0, -r.grid)) };
    totals.self = totals.use ? (1 - totals.imp / totals.use) * 100 : 0;
    return { rows, totals, rise, set };
  }
  const sim = simulate();
  SOLAR.sim = sim;

  const range = $('[data-sim-range]');
  const skyBand = $('[data-sim-sky]');
  const skyArc = $('[data-sim-arc]');
  const skySun = $('[data-sim-sun]');
  const chart = $('[data-sim-chart]');
  const chartBox = $('.sim__chart');
  let band = null, geo = null, cursor = null;

  const SKY_BAND = (rise, set) => [
    [0, '#0D111D', '#1A2030'], [rise - 0.8, '#0D111D', '#1A2030'], [rise, '#5B4A6E', '#F2A97E'],
    [rise + 1.3, '#9CC3E4', '#F4E7D3'], [set - 1.3, '#9CC3E4', '#F4E7D3'], [set, '#6A4870', '#F0915A'],
    [set + 0.8, '#0D111D', '#1A2030'], [24, '#0D111D', '#1A2030'],
  ];
  const skyStops = SKY_BAND(sim.rise, sim.set);

  function drawBand() {
    if (!skyBand) return;
    const w = skyBand.clientWidth, h = skyBand.clientHeight;
    if (!w) return;
    const inset = 22, hy = Math.round(h * 0.78), Aa = hy - 30;
    const X = (t) => inset + (t / 24) * (w - inset * 2);
    const nightLen = 24 - sim.set + sim.rise;
    const Y = (t) => {
      if (t > sim.rise && t < sim.set) return hy - Aa * Math.sin(Math.PI * (t - sim.rise) / (sim.set - sim.rise));
      const u = t >= sim.set ? (t - sim.set) / nightLen : (t + 24 - sim.set) / nightLen;
      return hy - Aa * 0.42 * Math.sin(Math.PI * clamp(u, 0, 1));
    };
    const path = (t0, t1) => {
      let d = '';
      const n = 80;
      for (let i = 0; i <= n; i++) { const t = t0 + ((t1 - t0) * i) / n; d += (i ? 'L' : 'M') + X(t).toFixed(1) + ' ' + Y(t).toFixed(1); }
      return d;
    };
    let out = '<path class="arc" d="' + path(sim.rise, sim.set) + '"/>';
    out += '<path class="arc" style="opacity:.35" d="' + path(0, sim.rise) + '"/><path class="arc" style="opacity:.35" d="' + path(sim.set, 24) + '"/>';
    out += '<path class="arc-done" data-arc-done d=""/>';
    out += '<line class="horizon" x1="0" x2="' + w + '" y1="' + hy + '" y2="' + hy + '"/>';
    for (let t = 0; t <= 24; t += 3) {
      out += '<line class="tick" x1="' + X(t) + '" x2="' + X(t) + '" y1="' + hy + '" y2="' + (hy + (t % 6 ? 4 : 8)) + '"/>';
      if (t % 6 === 0) out += '<text x="' + X(t) + '" y="' + (h - 10) + '" text-anchor="' + (t === 0 ? 'start' : t === 24 ? 'end' : 'middle') + '">' + pad(t) + ':00</text>';
    }
    skyArc.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    skyArc.innerHTML = out;
    band = { X, Y, path, done: skyArc.querySelector('[data-arc-done]') };
  }

  function drawChart() {
    if (!chart) return;
    const w = chart.clientWidth, h = chart.clientHeight;
    if (!w || !h) return;
    const cs = getComputedStyle(chartBox);
    const padL = parseFloat(cs.getPropertyValue('--padL')) || 30;
    const padR = parseFloat(cs.getPropertyValue('--padR')) || 40;
    const padT = 12, padB = 24, pw = w - padL - padR, ph = h - padT - padB, yMax = 7;
    const X = (t) => padL + (t / 24) * pw, Y = (kw) => padT + ph - (kw / yMax) * ph, S = (s) => padT + ph - s * ph;
    const rows = sim.rows;
    const line = (fn) => rows.map((r, i) => (i ? 'L' : 'M') + X(r.t).toFixed(1) + ' ' + fn(r).toFixed(1)).join('') + 'L' + X(24).toFixed(1) + ' ' + fn(rows[0]).toFixed(1);
    let o = '';
    o += '<rect class="night" x="' + X(0) + '" y="' + padT + '" width="' + Math.max(0, X(sim.rise) - X(0)) + '" height="' + ph + '"/>';
    o += '<rect class="night" x="' + X(sim.set) + '" y="' + padT + '" width="' + Math.max(0, X(24) - X(sim.set)) + '" height="' + ph + '"/>';
    [0, 2, 4, 6].forEach((v) => {
      o += '<line class="grid" x1="' + padL + '" x2="' + (w - padR) + '" y1="' + Y(v) + '" y2="' + Y(v) + '"/>';
      o += '<text x="' + (padL - 8) + '" y="' + (Y(v) + 4) + '" text-anchor="end">' + v + '</text>';
    });
    o += '<text x="' + (padL - 8) + '" y="' + (padT - 1) + '" text-anchor="end">kW</text>';
    [0, 0.5, 1].forEach((s) => { o += '<text x="' + (w - padR + 8) + '" y="' + (S(s) + 4) + '">' + Math.round(s * 100) + '%</text>'; });
    [0, 6, 12, 18, 24].forEach((t) => {
      o += '<text x="' + X(t) + '" y="' + (h - 5) + '" text-anchor="' + (t === 0 ? 'start' : t === 24 ? 'end' : 'middle') + '">' + pad(t) + ':00</text>';
    });
    o += '<path class="solar-area" d="' + line((r) => Y(r.p)) + 'L' + X(24) + ' ' + Y(0) + 'L' + X(0) + ' ' + Y(0) + 'Z"/>';
    o += '<path class="solar-line" d="' + line((r) => Y(r.p)) + '"/>';
    o += '<path class="batt-line" d="' + line((r) => S(r.soc)) + '"/>';
    o += '<path class="home-line" d="' + line((r) => Y(r.l)) + '"/>';
    o += '<g data-cursor-g><line class="cursor-line" y1="' + padT + '" y2="' + (padT + ph) + '"/><circle class="dot-batt" r="3.5"/><circle class="dot-home" r="4"/><circle class="dot-solar" r="5"/></g>';
    chart.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    chart.innerHTML = o;
    geo = { X, Y, S };
    const g = chart.querySelector('[data-cursor-g]');
    cursor = { line: g.children[0], batt: g.children[1], home: g.children[2], solar: g.children[3] };
  }

  const out = {
    time: $('[data-sim-time]'), phase: $('[data-sim-phase]'),
    pv: $('[data-node-val="pv"]'), home: $('[data-node-val="home"]'), batt: $('[data-node-val="batt"]'), grid: $('[data-node-val="grid"]'),
    fill: $('[data-batt-fill]'),
  };
  const run = (k) => $('[data-run="' + k + '"]');
  const node = (k) => $('[data-node="' + k + '"]');
  function setRun(k, kw, reverse) {
    const el = run(k);
    if (!el) return;
    const a = Math.abs(kw);
    el.style.setProperty('--o', a > 0.05 ? '1' : '0');
    el.style.setProperty('--d', clamp(1.6 / Math.max(a, 0.2), 0.22, 3).toFixed(2) + 's');
    el.style.setProperty('--dir', reverse ? 'reverse' : 'normal');
    node(k).classList.toggle('is-live', a > 0.05);
  }
  function phaseText(r) {
    if (r.p <= 0.02) {
      if (r.grid < -0.05) return 'Night. Battery at its reserve, the grid tops up.';
      return r.t < 12 ? 'Before sunrise. The house runs on stored sun.' : 'Evening. The house runs on stored sun.';
    }
    if (r.p < r.l) return r.t < 12 ? 'Early light. Panels are waking up.' : 'Late sun. The battery takes over.';
    if (r.grid > 0.05) return 'Battery full. Surplus goes to the grid.';
    return 'Sun runs the house and fills the battery.';
  }
  function renderSim(i) {
    i = clamp(i, 0, STEPS - 1);
    const r = sim.rows[i];
    const mins = i * 5;
    out.time.textContent = hhmm(mins);
    out.phase.textContent = phaseText(r);
    out.pv.textContent = r.p.toFixed(1) + ' kW';
    out.home.textContent = r.l.toFixed(1) + ' kW';
    out.batt.textContent = Math.round(r.soc * 100) + '%';
    out.grid.textContent = Math.abs(r.grid).toFixed(1) + ' kW';
    out.fill.style.transform = 'scaleY(' + r.soc.toFixed(3) + ')';
    setRun('pv', r.p, false);
    setRun('home', r.l, false);
    setRun('batt', r.batt, r.batt > 0);   // path runs battery → inverter
    setRun('grid', r.grid, r.grid < 0);   // path runs inverter → grid
    node('home').classList.add('is-live');

    if (skyBand) {
      const t = r.t;
      let top = skyStops[0][1], bot = skyStops[0][2];
      for (let k = 1; k < skyStops.length; k++) {
        if (t <= skyStops[k][0]) {
          const [t0, a0, b0] = skyStops[k - 1], [t1, a1, b1] = skyStops[k];
          const f = (t - t0) / Math.max(1e-6, t1 - t0);
          top = mix(a0, a1, f); bot = mix(b0, b1, f);
          break;
        }
      }
      skyBand.style.setProperty('--sky-top', top);
      skyBand.style.setProperty('--sky-bot', bot);
      if (band) {
        skySun.style.transform = 'translate(' + band.X(t).toFixed(1) + 'px,' + band.Y(t).toFixed(1) + 'px)';
        const day = t > sim.rise && t < sim.set;
        skySun.classList.toggle('is-moon', !day);
        band.done.setAttribute('d', day ? band.path(sim.rise, t) : t >= sim.set ? band.path(sim.rise, sim.set) : '');
      }
    }
    range.setAttribute('aria-valuetext', hhmm(mins) + ', solar ' + r.p.toFixed(1) + ' kilowatts, battery ' + Math.round(r.soc * 100) + ' percent');
    if (geo && cursor) {
      const x = geo.X(r.t);
      cursor.line.setAttribute('x1', x); cursor.line.setAttribute('x2', x);
      cursor.solar.setAttribute('cx', x); cursor.solar.setAttribute('cy', geo.Y(r.p));
      cursor.home.setAttribute('cx', x); cursor.home.setAttribute('cy', geo.Y(r.l));
      cursor.batt.setAttribute('cx', x); cursor.batt.setAttribute('cy', geo.S(r.soc));
    }
  }

  if (range) {
    const t = sim.totals;
    $('[data-total="gen"]').textContent = t.gen.toFixed(1);
    $('[data-total="use"]').textContent = t.use.toFixed(1);
    $('[data-total="imp"]').textContent = t.imp.toFixed(1);
    $('[data-total="self"]').textContent = Math.round(t.self);

    range.value = String(clamp(Math.round(nowMinutes() / 5), 0, STEPS - 1));
    const playBtn = $('[data-sim-play]');
    const playLabel = $('[data-sim-play-label]');
    let playing = 0, last = 0;
    const stopPlay = () => {
      if (!playing) return;
      cancelAnimationFrame(playing); playing = 0;
      playBtn.setAttribute('aria-pressed', 'false'); playLabel.textContent = 'Play the day';
    };
    const step = (ts) => {
      if (ts - last > 26) {
        last = ts;
        const v = +range.value + 1;
        if (v > STEPS - 1) { stopPlay(); return; }
        range.value = String(v);
        renderSim(v);
      }
      playing = requestAnimationFrame(step);
    };
    playBtn.addEventListener('click', () => {
      if (playing) { stopPlay(); return; }
      if (+range.value >= STEPS - 1) range.value = '0';
      playBtn.setAttribute('aria-pressed', 'true'); playLabel.textContent = 'Pause';
      playing = requestAnimationFrame(step);
    });
    range.addEventListener('input', () => { stopPlay(); renderSim(+range.value); });
    range.addEventListener('pointerdown', stopPlay);
    SOLAR.playDay = () => { if (!playing) playBtn.click(); };
  }

  /* ---------------------------------------------------------------- 8 */
  function drawSparks() {
    const spark = (sel, fn) => { const el = $(sel); if (el) el.innerHTML = fn(); };
    spark('[data-spark="day"]', () => {
      const max = Math.max(...sim.rows.map((r) => r.p)) || 1;
      const d = sim.rows.map((r, i) => (i ? 'L' : 'M') + ((r.t / 24) * 200).toFixed(1) + ' ' + (62 - (r.p / max) * 56).toFixed(1)).join('');
      return '<line class="s-base" x1="0" x2="200" y1="62" y2="62"/><path class="s-area" d="' + d + 'L200 62L0 62Z"/><path class="s-line" d="' + d + '"/>';
    });
    spark('[data-spark="months"]', () => {
      const mwh = [23, 24, 28, 28, 29, 26, 24, 25, 27, 28, 25, 25]; // sums to 312
      const max = Math.max(...mwh), bw = 200 / 12;
      return '<line class="s-base" x1="0" x2="200" y1="62" y2="62"/>' + mwh.map((v, i) => {
        const hgt = (v / max) * 56;
        return '<rect class="s-bar' + (v < 25 ? ' is-low' : '') + '" x="' + (i * bw + 2).toFixed(1) + '" y="' + (62 - hgt).toFixed(1) + '" width="' + (bw - 4).toFixed(1) + '" height="' + hgt.toFixed(1) + '"/>';
      }).join('');
    });
    spark('[data-spark="soc"]', () => {
      const d = sim.rows.map((r, i) => (i ? 'L' : 'M') + ((r.t / 24) * 200).toFixed(1) + ' ' + (62 - r.soc * 58).toFixed(1)).join('');
      return '<line class="s-base" x1="0" x2="200" y1="62" y2="62"/><path class="s-area" d="' + d + 'L200 62L0 62Z"/><path class="s-line" d="' + d + '"/>';
    });
  }
  drawSparks();

  /* ---------------------------------------------------------------- 9 */
  const csteps = $$('.cstep');
  const careImgs = $$('[data-care-img]');
  const careNum = $('[data-care-num]');
  let careActive = 'assess';
  function setCare(key) {
    if (key === careActive) return;
    const prev = careActive;
    careActive = key;
    csteps.forEach((s) => s.classList.toggle('is-active', s.dataset.care === key));
    careImgs.forEach((img) => {
      img.classList.toggle('is-active', img.dataset.careImg === key);
      img.classList.toggle('was-active', img.dataset.careImg === prev);
    });
    const i = csteps.findIndex((s) => s.dataset.care === key);
    if (careNum) careNum.textContent = pad(i + 1);
  }
  if ('IntersectionObserver' in window && csteps.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) setCare(en.target.dataset.care); });
    }, { rootMargin: '-45% 0px -45% 0px' });
    csteps.forEach((s) => io.observe(s));
  }

  /* ---------------------------------------------------------------- 10
     Front-end only: connect the TODO below to your CRM or email service. */
  const form = $('#assessForm');
  const done = $('#formDone');
  if (form) {
    const rules = {
      name: (v) => v.trim().length > 1,
      contact: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || v.replace(/\D/g, '').length >= 7,
      type: (v) => v !== '',
    };
    const check = (field) => {
      const ok = rules[field.name](field.value);
      const wrap = field.closest('.field');
      wrap.classList.toggle('is-invalid', !ok);
      field.setAttribute('aria-invalid', String(!ok));
      const err = $('.field__error', wrap);
      if (!ok) field.setAttribute('aria-describedby', err.id); else field.removeAttribute('aria-describedby');
      return ok;
    };
    Object.keys(rules).forEach((n) => {
      const f = form.elements[n];
      f.addEventListener('blur', () => { if (f.value) check(f); });
      f.addEventListener('input', () => { if (f.closest('.field').classList.contains('is-invalid')) check(f); });
      f.addEventListener('change', () => { if (f.closest('.field').classList.contains('is-invalid')) check(f); });
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fields = Object.keys(rules).map((n) => form.elements[n]);
      const results = fields.map(check);
      const firstBad = fields[results.indexOf(false)];
      if (firstBad) { firstBad.focus(); done.textContent = ''; return; }
      const first = form.elements.name.value.trim().split(/\s+/)[0];
      // TODO: send new FormData(form) to your backend here.
      done.textContent = 'Thanks, ' + first + '. We’ll be in touch within one working day to book your visit.';
      form.reset();
    });
  }

  /* ---------------------------------------------------------------- boot */
  function layout() {
    measure();
    drawNav();
    drawBand();
    drawChart();
    if (range) renderSim(+range.value);
    tick();
  }
  SOLAR.refresh = layout;
  layout();
  let rT = 0;
  window.addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(layout, 140); });
  window.addEventListener('load', layout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
})();
