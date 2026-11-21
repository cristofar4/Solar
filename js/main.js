/* =========================================================================
   SOLAR — behaviour
   1. Sun maths (sunrise, sunset, position) estimated from the time zone
   2. Sun-path navigation
   3. Day / night view
   4. Header state and mobile drawer
   5. Scroll spy and section rail
   6. Home / Business switch
   7. Services accordion
   8. "A day on your roof" simulator
   9. Project sparklines
  10. Care tabs
  11. Assessment form
   ========================================================================= */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const darkScheme = window.matchMedia('(prefers-color-scheme: dark)');
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const pad = (n) => String(n).padStart(2, '0');
  const hhmm = (mins) => {
    const m = ((Math.round(mins) % 1440) + 1440) % 1440;
    return pad(Math.floor(m / 60)) + ':' + pad(m % 60);
  };
  const store = {
    get(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* storage blocked */ } },
  };

  /* -----------------------------------------------------------------------
     1. SUN MATHS
     No geolocation prompt: the time zone gives a good-enough place.
     ----------------------------------------------------------------------- */
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
    const offsetH = -new Date().getTimezoneOffset() / 60;
    return { lat: REGION_LAT[tz.split('/')[0]] ?? 25, lon: offsetH * 15 };
  }

  // NOAA approximation. Returns minutes after local midnight.
  function sunDay(date, lat, lon) {
    const doy = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 864e5);
    const tzH = -date.getTimezoneOffset() / 60;
    const g = (2 * Math.PI / 365) * (doy - 1);
    const eq = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
    const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g)
      + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
    const rad = Math.PI / 180;
    const latR = lat * rad;
    const cosH = clamp(Math.cos(90.833 * rad) / (Math.cos(latR) * Math.cos(decl)) - Math.tan(latR) * Math.tan(decl), -1, 1);
    const halfDay = (Math.acos(cosH) / rad) * 4; // minutes
    const noon = 720 - 4 * lon - eq + tzH * 60;
    const noonElevation = 90 - Math.abs(lat - decl / rad);
    return { rise: noon - halfDay, set: noon + halfDay, noon, noonElevation };
  }

  const place = guessPlace();
  let sun = sunDay(new Date(), place.lat, place.lon);
  const nowMinutes = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60; };
  const dayFraction = () => (nowMinutes() - sun.rise) / Math.max(1, sun.set - sun.rise);
  const isDaytime = () => { const f = dayFraction(); return f >= 0 && f <= 1; };

  function paintSunText() {
    const rise = hhmm(sun.rise), set = hhmm(sun.set);
    $$('[data-sunrise]').forEach((el) => { el.textContent = '↑' + rise; });
    $$('[data-sunset]').forEach((el) => { el.textContent = set + '↓'; });
    $$('[data-sun-summary]').forEach((el) => { el.textContent = 'Sunrise ' + rise + ' · Sunset ' + set + ' near you'; });
    $$('[data-sun-footer]').forEach((el) => {
      el.textContent = 'Near you today ↑' + rise + ' ↓' + set;
      el.title = 'Sunrise and sunset, estimated from your time zone';
    });
    const day = isDaytime();
    root.classList.toggle('is-night', !day);
    $$('[data-sun-state]').forEach((el) => {
      el.title = day ? 'The sun is up near you. Panels are generating.' : 'The sun is down near you. Batteries are on duty.';
    });
  }

  /* -----------------------------------------------------------------------
     2. SUN-PATH NAVIGATION
     The bar carries today's sun arc. At rest the sun sits where the real sun
     is now; point at a link and it travels the arc to that link.
     ----------------------------------------------------------------------- */
  const sky = $('#sky');
  const dome = sky && $('.sky__dome', sky);
  const sunEl = sky && $('.sky__sun', sky);
  const arcSvg = sky && $('.sky__arc', sky);
  const arcPath = sky && $('.sky__path', sky);
  const arcElapsed = sky && $('.sky__elapsed', sky);
  const arcTicks = sky && $('.sky__ticks', sky);
  const navLinks = sky ? $$('.sky__links a', sky) : [];

  let W = 0, H = 0, A = 0;
  let curF = 0.5, anim = 0, pointing = false;

  const restF = () => {
    const f = dayFraction();
    if (f < 0) return -0.08;
    if (f > 1) return 1.08;
    return f;
  };
  const arcXY = (f) => {
    const x = clamp(f, 0, 1) * W;
    // below the horizon the sun waits half-set at the arc's end
    const y = f < 0 || f > 1 ? H : H - A * Math.sin(Math.PI * f);
    return [x, y];
  };
  const arcD = (f0, f1) => {
    let d = '';
    const n = 56;
    for (let i = 0; i <= n; i++) {
      const [x, y] = arcXY(f0 + ((f1 - f0) * i) / n);
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
  function moveSun(f) {
    cancelAnimationFrame(anim);
    if (reduceMotion.matches || !W) { curF = f; placeSun(); return; }
    const from = curF, t0 = performance.now();
    const dur = 420 + 520 * Math.min(1, Math.abs(f - from));
    const step = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      curF = from + (f - from) * e;
      placeSun();
      if (k < 1) anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
  }
  function drawSky() {
    if (!dome) return;
    W = dome.clientWidth;
    H = dome.clientHeight;
    A = Math.max(6, H - 4);
    arcSvg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    arcPath.setAttribute('d', arcD(0, 1));
    const f = dayFraction();
    arcElapsed.setAttribute('d', f > 0 ? arcD(0, clamp(f, 0, 1)) : '');
    let ticks = '<line class="sky__horizon" x1="0" y1="' + (H - 0.5) + '" x2="' + W + '" y2="' + (H - 0.5) + '"/>';
    navLinks.forEach((a) => {
      if (!a.offsetParent) return;
      const x = (linkF(a) * W).toFixed(1);
      const active = a.getAttribute('aria-current') === 'true';
      ticks += '<line class="sky__tick' + (active ? ' is-active' : '') + '" data-tick="' + a.dataset.nav + '" x1="' + x + '" x2="' + x + '" y1="' + (H - (active ? 6 : 3.5)) + '" y2="' + H + '"/>';
    });
    arcTicks.innerHTML = ticks;
    if (!pointing) curF = restF();
    placeSun();
  }

  if (sky) {
    navLinks.forEach((a) => {
      const go = () => { pointing = true; sky.classList.add('is-lifted'); moveSun(linkF(a)); };
      a.addEventListener('pointerenter', go);
      a.addEventListener('focus', go);
    });
    const rest = () => { pointing = false; sky.classList.remove('is-lifted'); moveSun(restF()); };
    sky.addEventListener('pointerleave', rest);
    sky.addEventListener('focusout', (e) => { if (!sky.contains(e.relatedTarget)) rest(); });
  }

  /* -----------------------------------------------------------------------
     3. DAY / NIGHT VIEW
     ----------------------------------------------------------------------- */
  const themeBtn = $('#daynight');
  const themeColor = $('meta[name="theme-color"]');
  const currentTheme = () => root.dataset.theme || (darkScheme.matches ? 'dark' : 'light');
  function syncThemeButton() {
    const dark = currentTheme() === 'dark';
    const label = dark ? 'Switch to day view' : 'Switch to night view';
    themeBtn.setAttribute('aria-label', label);
    themeBtn.title = label;
    themeBtn.setAttribute('aria-pressed', String(dark));
    if (themeColor) themeColor.setAttribute('content', dark ? '#131210' : '#F3F0EA');
  }
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const next = currentTheme() === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      store.set('solar-theme', next);
      syncThemeButton();
    });
    if (darkScheme.addEventListener) darkScheme.addEventListener('change', syncThemeButton);
    syncThemeButton();
  }

  /* -----------------------------------------------------------------------
     4. HEADER STATE + MOBILE DRAWER
     ----------------------------------------------------------------------- */
  const masthead = $('#masthead');
  const menuBtn = $('#menuBtn');
  const drawer = $('#drawer');
  const onScroll = () => masthead.classList.toggle('is-scrolled', window.scrollY > 24);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  function setDrawer(open) {
    drawer.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
    masthead.classList.toggle('menu-open', open);
  }
  menuBtn.addEventListener('click', () => setDrawer(drawer.hidden));
  drawer.addEventListener('click', (e) => { if (e.target.closest('a')) setDrawer(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !drawer.hidden) { setDrawer(false); menuBtn.focus(); }
  });
  document.addEventListener('click', (e) => {
    if (!drawer.hidden && !masthead.contains(e.target)) setDrawer(false);
  });

  /* -----------------------------------------------------------------------
     6. HOME / BUSINESS SWITCH  (declared before scroll spy uses it)
     ----------------------------------------------------------------------- */
  const fitCard = $('.card--fit');
  const SPEC = {
    home: '6–12 kW rooftop · 10–15 kWh battery',
    business: '50–500 kW rooftop · peak-demand control',
  };
  let mode = 'home';
  let activeSection = 'top';

  function setMode(next) {
    mode = next;
    fitCard.dataset.mode = next;
    $$('[data-mode-btn]', fitCard).forEach((b) => {
      const on = b.dataset.modeBtn === next;
      b.setAttribute('aria-checked', String(on));
      b.tabIndex = on ? 0 : -1;
    });
    $$('[data-mode-img]', fitCard).forEach((img) => img.classList.toggle('is-active', img.dataset.modeImg === next));
    $('[data-mode-spec]', fitCard).textContent = SPEC[next];
    markNav();
  }
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
  $$('a[data-nav="business"], a[data-nav="homes"]').forEach((a) => {
    a.addEventListener('click', () => setMode(a.dataset.nav === 'business' ? 'business' : 'home'));
  });
  if (location.hash === '#business') setMode('business');

  /* -----------------------------------------------------------------------
     5. SCROLL SPY + SECTION RAIL
     ----------------------------------------------------------------------- */
  const sections = $$('[data-section]');
  const railNum = $('[data-rail-num]');
  const railText = $('[data-rail-text]');
  const railLinks = $$('[data-rail]');
  const railOrder = railLinks.map((a) => a.dataset.rail);

  function markNav() {
    let key = null;
    if (activeSection === 'homes') key = mode === 'business' ? 'business' : 'homes';
    else if (activeSection === 'systems' || activeSection === 'projects') key = activeSection;
    $$('[data-nav]').forEach((a) => {
      if (a.dataset.nav === key) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
    if (arcTicks) {
      $$('.sky__tick', arcTicks).forEach((t) => {
        const on = t.dataset.tick === key;
        t.classList.toggle('is-active', on);
        t.setAttribute('y1', String(H - (on ? 6 : 3.5)));
      });
    }
  }

  function setActiveSection(el) {
    activeSection = el.dataset.section;
    const railKey = el.dataset.railKey || el.id || activeSection;
    const i = railOrder.indexOf(railKey);
    if (i > -1) {
      railNum.textContent = pad(i + 1);
      railText.textContent = el.dataset.railTitle || '';
      railLinks.forEach((a, j) => {
        if (j === i) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    }
    markNav();
  }

  if ('IntersectionObserver' in window) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) setActiveSection(en.target); });
    }, { rootMargin: '-38% 0px -58% 0px' });
    sections.forEach((s) => spy.observe(s));
  }

  /* -----------------------------------------------------------------------
     7. SERVICES ACCORDION
     ----------------------------------------------------------------------- */
  $$('.service__row').forEach((btn) => {
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', String(open));
      btn.closest('.service').classList.toggle('is-open', open);
    });
  });

  /* -----------------------------------------------------------------------
     8. A DAY ON YOUR ROOF — energy model
     8 kW array, 13.5 kWh battery (5 kW max, 10% reserve), clear-sky day
     shaped by the visitor's own sunrise, sunset and noon sun height.
     ----------------------------------------------------------------------- */
  const STEPS = 288; // 5-minute steps
  const DT = 24 / STEPS;
  const SYS = { cap: 13.5, pmax: 5, reserve: 0.1 };
  const bump = (t, m, s) => Math.exp(-((t - m) ** 2) / (2 * s * s));
  const loadAt = (t) => 0.38 + 1.35 * bump(t, 7.2, 0.75) + 0.55 * bump(t, 13, 1.6) + 2.4 * bump(t, 19.6, 1.3) + 0.25 * bump(t, 22.5, 0.8);

  function simulate() {
    const rise = sun.rise / 60, set = sun.set / 60;
    const elev = clamp(Math.sin((clamp(sun.noonElevation, 0, 90) * Math.PI) / 180), 0.3, 1);
    const peak = 6.5 * Math.sqrt(elev);
    const solarAt = (t) => {
      if (set - rise < 0.5) return 0;
      const s = (t - rise) / (set - rise);
      return s <= 0 || s >= 1 ? 0 : peak * Math.pow(Math.sin(Math.PI * s), 1.25);
    };
    let soc = 0.5 * SYS.cap;
    const rows = [];
    for (let day = 0; day < 3; day++) { // run to a steady state, keep the last day
      for (let i = 0; i < STEPS; i++) {
        const t = i * DT, p = solarAt(t), l = loadAt(t), net = p - l;
        let batt = 0, grid = 0;
        if (net >= 0) {
          const c = Math.min(net, SYS.pmax, (SYS.cap - soc) / DT);
          soc += c * DT; batt = c; grid = net - c;
        } else {
          const need = -net;
          const d = Math.min(need, SYS.pmax, Math.max(0, (soc - SYS.reserve * SYS.cap) / DT));
          soc -= d * DT; batt = -d; grid = -(need - d);
        }
        if (day === 2) rows.push({ t, p, l, batt, grid, soc: soc / SYS.cap });
      }
    }
    const sum = (fn) => rows.reduce((a, r) => a + fn(r), 0) * DT;
    const totals = {
      gen: sum((r) => r.p),
      use: sum((r) => r.l),
      imp: sum((r) => Math.max(0, -r.grid)),
    };
    totals.self = totals.use ? (1 - totals.imp / totals.use) * 100 : 0;
    return { rows, totals, rise, set, peak };
  }

  let sim = simulate();
  const chart = $('[data-sim-chart]');
  const range = $('[data-sim-range]');
  const chartBox = $('.day__chart');
  let geo = null;
  let cursor = null;

  const NS = 'http://www.w3.org/2000/svg';
  function drawChart() {
    if (!chart) return;
    const w = chart.clientWidth, h = chart.clientHeight;
    if (!w || !h) return;
    const cs = getComputedStyle(chartBox);
    const padL = parseFloat(cs.getPropertyValue('--padL')) || 34;
    const padR = parseFloat(cs.getPropertyValue('--padR')) || 44;
    const padT = 12, padB = 26;
    const pw = w - padL - padR, ph = h - padT - padB;
    const yMax = 7;
    const X = (t) => padL + (t / 24) * pw;
    const Y = (kw) => padT + ph - (kw / yMax) * ph;
    const S = (s) => padT + ph - s * ph;
    const rows = sim.rows;
    const line = (fn) => rows.map((r, i) => (i ? 'L' : 'M') + X(r.t).toFixed(1) + ' ' + fn(r).toFixed(1)).join('') + 'L' + X(24).toFixed(1) + ' ' + fn(rows[0]).toFixed(1);

    let out = '';
    // night bands
    out += '<rect class="night" x="' + X(0) + '" y="' + padT + '" width="' + Math.max(0, X(sim.rise) - X(0)) + '" height="' + ph + '"/>';
    out += '<rect class="night" x="' + X(sim.set) + '" y="' + padT + '" width="' + Math.max(0, X(24) - X(sim.set)) + '" height="' + ph + '"/>';
    // grid + y labels (kW on the left, battery % on the right)
    [0, 2, 4, 6].forEach((v) => {
      out += '<line class="grid" x1="' + padL + '" x2="' + (w - padR) + '" y1="' + Y(v) + '" y2="' + Y(v) + '"/>';
      out += '<text x="' + (padL - 8) + '" y="' + (Y(v) + 4) + '" text-anchor="end">' + v + '</text>';
    });
    out += '<text x="' + (padL - 8) + '" y="' + (padT - 0) + '" text-anchor="end" dy="-1">kW</text>';
    [0, 0.5, 1].forEach((s) => {
      out += '<text x="' + (w - padR + 8) + '" y="' + (S(s) + 4) + '">' + Math.round(s * 100) + '%</text>';
    });
    // x labels
    [0, 6, 12, 18, 24].forEach((t) => {
      const anchor = t === 0 ? 'start' : t === 24 ? 'end' : 'middle';
      out += '<text x="' + X(t) + '" y="' + (h - 6) + '" text-anchor="' + anchor + '">' + pad(t) + ':00</text>';
    });
    // series
    out += '<path class="solar-area" d="' + line((r) => Y(r.p)) + 'L' + X(24) + ' ' + Y(0) + 'L' + X(0) + ' ' + Y(0) + 'Z"/>';
    out += '<path class="solar-line" d="' + line((r) => Y(r.p)) + '"/>';
    out += '<path class="batt-line" d="' + line((r) => S(r.soc)) + '"/>';
    out += '<path class="home-line" d="' + line((r) => Y(r.l)) + '"/>';
    // cursor
    out += '<g data-cursor><line class="cursor" y1="' + padT + '" y2="' + (padT + ph) + '"/>'
      + '<circle class="dot-batt" r="3.5"/><circle class="dot-home" r="4"/><circle class="dot-solar" r="5"/></g>';

    chart.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    chart.innerHTML = out;
    geo = { X, Y, S, padL, pw };
    const g = chart.querySelector('[data-cursor]');
    cursor = { line: g.children[0], batt: g.children[1], home: g.children[2], solar: g.children[3] };
    renderSim(+range.value);
  }

  const out = {
    time: $('[data-sim-time]'), phase: $('[data-sim-phase]'),
    solar: $('[data-flow="solar"]'), home: $('[data-flow="home"]'), soc: $('[data-flow="soc"]'), grid: $('[data-flow="grid"]'),
    sSolar: $('[data-flow-state="solar"]'), sHome: $('[data-flow-state="home"]'), sBatt: $('[data-flow-state="batt"]'), sGrid: $('[data-flow-state="grid"]'),
    meter: $('[data-flow-meter]'),
  };
  const tile = (name) => $('.flow--' + name);

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
    const r = sim.rows[clamp(i, 0, STEPS - 1)];
    const mins = i * 5;
    out.time.textContent = hhmm(mins);
    out.phase.textContent = phaseText(r);
    out.solar.textContent = r.p.toFixed(1);
    out.home.textContent = r.l.toFixed(1);
    out.soc.textContent = Math.round(r.soc * 100);
    out.grid.textContent = Math.abs(r.grid).toFixed(1);
    out.meter.style.width = (r.soc * 100).toFixed(1) + '%';

    out.sSolar.textContent = r.p > 0.05 ? 'Generating' : r.t < sim.rise ? 'Waiting for sunrise' : 'Done for the day';
    out.sHome.textContent = r.p >= r.l ? 'Powered by the sun' : r.batt < -0.05 ? 'Powered by the battery' : 'Powered by the grid';
    out.sBatt.textContent = r.batt > 0.05 ? 'Charging +' + r.batt.toFixed(1) + ' kW'
      : r.batt < -0.05 ? 'Supplying ' + (-r.batt).toFixed(1) + ' kW'
      : r.soc > 0.99 ? 'Full' : 'Holding reserve';
    out.sGrid.textContent = r.grid > 0.05 ? 'Exporting surplus' : r.grid < -0.05 ? 'Importing' : 'No exchange';

    tile('solar').classList.toggle('is-live', r.p > 0.05);
    tile('home').classList.toggle('is-live', true);
    tile('batt').classList.toggle('is-live', Math.abs(r.batt) > 0.05);
    tile('grid').classList.toggle('is-live', Math.abs(r.grid) > 0.05);

    range.style.setProperty('--fill', ((i / (STEPS - 1)) * 100).toFixed(2) + '%');
    range.setAttribute('aria-valuetext', hhmm(mins) + ', solar ' + r.p.toFixed(1) + ' kilowatts, battery ' + Math.round(r.soc * 100) + ' percent');

    if (geo && cursor) {
      const x = geo.X(r.t);
      cursor.line.setAttribute('x1', x); cursor.line.setAttribute('x2', x);
      cursor.solar.setAttribute('cx', x); cursor.solar.setAttribute('cy', geo.Y(r.p));
      cursor.home.setAttribute('cx', x); cursor.home.setAttribute('cy', geo.Y(r.l));
      cursor.batt.setAttribute('cx', x); cursor.batt.setAttribute('cy', geo.S(r.soc));
    }
  }

  function paintTotals() {
    const t = sim.totals;
    $('[data-total="gen"]').textContent = t.gen.toFixed(1);
    $('[data-total="use"]').textContent = t.use.toFixed(1);
    $('[data-total="imp"]').textContent = t.imp.toFixed(1);
    $('[data-total="self"]').textContent = Math.round(t.self);
  }

  if (chart && range) {
    range.value = String(clamp(Math.round(nowMinutes() / 5), 0, STEPS - 1));
    range.addEventListener('input', () => { stopPlay(); renderSim(+range.value); });

    const fromPointer = (e) => {
      if (!geo) return;
      const box = chart.getBoundingClientRect();
      const t = clamp(((e.clientX - box.left - geo.padL) / geo.pw) * 24, 0, 24);
      range.value = String(clamp(Math.round(t / DT), 0, STEPS - 1));
      renderSim(+range.value);
    };
    chart.addEventListener('pointerdown', (e) => { stopPlay(); chart.setPointerCapture(e.pointerId); fromPointer(e); });
    chart.addEventListener('pointermove', (e) => { if (chart.hasPointerCapture(e.pointerId)) fromPointer(e); });

    // play the day
    const playBtn = $('[data-sim-play]');
    const playLabel = $('[data-sim-play-label]');
    let playing = 0, last = 0;
    function stopPlay() {
      if (!playing) return;
      cancelAnimationFrame(playing); playing = 0;
      playBtn.setAttribute('aria-pressed', 'false'); playLabel.textContent = 'Play the day';
    }
    function tick(t) {
      if (t - last > 28) {
        last = t;
        const v = +range.value + 1;
        if (v > STEPS - 1) { stopPlay(); return; }
        range.value = String(v);
        renderSim(v);
      }
      playing = requestAnimationFrame(tick);
    }
    playBtn.addEventListener('click', () => {
      if (playing) { stopPlay(); return; }
      if (+range.value >= STEPS - 1) range.value = '0';
      playBtn.setAttribute('aria-pressed', 'true'); playLabel.textContent = 'Pause';
      playing = requestAnimationFrame(tick);
    });
    range.addEventListener('keydown', stopPlay);

    paintTotals();
    drawChart();
  }

  /* -----------------------------------------------------------------------
     9. PROJECT SPARKLINES
     ----------------------------------------------------------------------- */
  function drawSparks() {
    const sparkDay = $('[data-spark="day"]');
    if (sparkDay) {
      // a 9.6 kW home on a clear day, using the same model shape
      const rows = sim.rows, max = Math.max(...rows.map((r) => r.p)) || 1;
      let d = '';
      rows.forEach((r, i) => { d += (i ? 'L' : 'M') + ((r.t / 24) * 200).toFixed(1) + ' ' + (62 - (r.p / max) * 56).toFixed(1); });
      sparkDay.innerHTML = '<line class="s-base" x1="0" x2="200" y1="62" y2="62"/>'
        + '<path class="s-area" d="' + d + 'L200 62L0 62Z"/><path class="s-line" d="' + d + '"/>';
    }
    const sparkMonths = $('[data-spark="months"]');
    if (sparkMonths) {
      const mwh = [23, 24, 28, 28, 29, 26, 24, 25, 27, 28, 25, 25]; // sums to 312
      const max = Math.max(...mwh), bw = 200 / 12;
      sparkMonths.innerHTML = '<line class="s-base" x1="0" x2="200" y1="62" y2="62"/>' + mwh.map((v, i) => {
        const hgt = (v / max) * 56;
        return '<rect class="s-bar' + (v < 25 ? ' is-low' : '') + '" x="' + (i * bw + 2).toFixed(1) + '" y="' + (62 - hgt).toFixed(1) + '" width="' + (bw - 4).toFixed(1) + '" height="' + hgt.toFixed(1) + '"/>';
      }).join('');
    }
    const sparkSoc = $('[data-spark="soc"]');
    if (sparkSoc) {
      let d = '';
      sim.rows.forEach((r, i) => { d += (i ? 'L' : 'M') + ((r.t / 24) * 200).toFixed(1) + ' ' + (62 - r.soc * 58).toFixed(1); });
      sparkSoc.innerHTML = '<line class="s-base" x1="0" x2="200" y1="62" y2="62"/>'
        + '<path class="s-area" d="' + d + 'L200 62L0 62Z"/><path class="s-line" d="' + d + '"/>';
    }
  }
  drawSparks();

  /* -----------------------------------------------------------------------
     10. CARE TABS
     ----------------------------------------------------------------------- */
  const tabs = $$('.tab');
  const tablist = $('.tabs');
  function moveInk() {
    const sel = tabs.find((t) => t.getAttribute('aria-selected') === 'true');
    if (!sel || !tablist) return;
    tablist.style.setProperty('--x', sel.offsetLeft + 'px');
    tablist.style.setProperty('--w', sel.offsetWidth + 'px');
  }
  function selectTab(tab, focus) {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      $('#' + t.getAttribute('aria-controls')).hidden = !on;
    });
    $$('[data-care-img]').forEach((img) => img.classList.toggle('is-active', img.dataset.careImg === tab.dataset.tab));
    moveInk();
    if (focus) tab.focus();
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => selectTab(t));
    t.addEventListener('keydown', (e) => {
      let j = null;
      if (e.key === 'ArrowRight') j = (i + 1) % tabs.length;
      if (e.key === 'ArrowLeft') j = (i - 1 + tabs.length) % tabs.length;
      if (e.key === 'Home') j = 0;
      if (e.key === 'End') j = tabs.length - 1;
      if (j !== null) { e.preventDefault(); selectTab(tabs[j], true); }
    });
  });
  moveInk();

  /* -----------------------------------------------------------------------
     11. ASSESSMENT FORM
     Front-end only: connect the submit handler to your CRM or email service.
     ----------------------------------------------------------------------- */
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

  /* -----------------------------------------------------------------------
     Boot, resize and the minute clock
     ----------------------------------------------------------------------- */
  const yearEl = $('[data-year]');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  paintSunText();
  drawSky();
  markNav();

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { drawSky(); drawChart(); moveInk(); }, 120);
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { drawSky(); moveInk(); });

  setInterval(() => {
    sun = sunDay(new Date(), place.lat, place.lon);
    paintSunText();
    drawSky();
    markNav();
    if (!pointing) moveSun(restF());
  }, 60000);
})();
