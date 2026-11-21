/* =========================================================================
   SOLAR — canvas scenes
   1. "How it works": sunlight → panels → battery → house after dark
   2. Night sky over the contact section
   3. Static stars for the sunset
   ========================================================================= */
(() => {
  'use strict';
  const SOLAR = (window.SOLAR = window.SOLAR || {});
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => t * t * (3 - 2 * t);
  const DPR = () => Math.min(window.devicePixelRatio || 1, 2);

  /* -----------------------------------------------------------------------
     1. PHOTON SCENE
     Logical space is 1000 units wide; height follows the canvas aspect.
     ----------------------------------------------------------------------- */
  const canvas = document.querySelector('[data-photons]');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    const section = canvas.closest('section');
    const steps = Array.from(section.querySelectorAll('.step'));
    const read = {
      time: section.querySelector('[data-hr="time"]'),
      pv: section.querySelector('[data-hr="pv"]'),
      soc: section.querySelector('[data-hr="soc"]'),
      home: section.querySelector('[data-hr="home"]'),
    };
    let W = 1000, H = 800, scale = 1;
    let p = 0;               // scroll progress 0..1
    let running = false, visible = false, last = 0, raf = 0;
    const photons = [], sparks = [], pulses = [], stars = [];
    let hitCount = 0;

    // geometry (computed on resize)
    let G = null;
    function layout() {
      const r = canvas.getBoundingClientRect();
      if (!r.width) return;
      const dpr = DPR();
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      W = 1000; H = 1000 * (r.height / r.width);
      scale = canvas.width / W;
      const ground = H * 0.86;
      const wallTop = ground - H * 0.24;
      const roofTop = wallTop - H * 0.2;
      const cx = 560;
      G = {
        ground, wallTop, roofTop,
        roof: { tl: [cx - 150, roofTop], tr: [cx + 150, roofTop], br: [cx + 215, wallTop], bl: [cx - 215, wallTop] },
        wall: { x0: cx - 190, x1: cx + 190 },
        windows: [[cx - 150, wallTop + 30, 74, 56], [cx + 76, wallTop + 30, 74, 56]],
        door: [cx - 28, wallTop + 52, 56, ground - wallTop - 52],
        batt: { x: 150, y: ground - 150, w: 64, h: 150 },
        inv: { x: 146, y: ground - 222, w: 72, h: 50 },
        sun: { x: 860, y: H * 0.17, r: 44 },
        rows: 4, cols: 7,
      };
      const inv = G.inv, b = G.batt;
      G.wires = {
        roof: poly([[cx - 205, wallTop - 6], [inv.x + inv.w + 40, wallTop - 6], [inv.x + inv.w + 40, inv.y + inv.h / 2], [inv.x + inv.w, inv.y + inv.h / 2]]),
        batt: poly([[inv.x + inv.w / 2, inv.y + inv.h], [b.x + b.w / 2, b.y]]),
        home: poly([[inv.x + inv.w, inv.y + inv.h - 10], [cx - 190, inv.y + inv.h - 10]]),
      };
      cells.length = 0;
      for (let r2 = 0; r2 < G.rows; r2++) for (let c = 0; c < G.cols; c++) cells.push({ r: r2, c, e: 0 });
      stars.length = 0;
      for (let i = 0; i < 70; i++) stars.push({ x: Math.random() * W, y: Math.random() * H * 0.55, r: Math.random() * 1.4 + 0.4, t: Math.random() * 6 });
    }
    const cells = [];
    function poly(pts) {
      const segs = [];
      let total = 0;
      for (let i = 1; i < pts.length; i++) {
        const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
        segs.push({ a: pts[i - 1], b: pts[i], l, s: total });
        total += l;
      }
      return { pts, segs, total };
    }
    function along(w, d) {
      d = clamp(d, 0, w.total);
      for (const s of w.segs) {
        if (d <= s.s + s.l) { const k = (d - s.s) / s.l; return [lerp(s.a[0], s.b[0], k), lerp(s.a[1], s.b[1], k)]; }
      }
      return w.pts[w.pts.length - 1];
    }
    // bilinear point inside the roof (u across, v down)
    function roofPt(u, v) {
      const { tl, tr, br, bl } = G.roof;
      const top = [lerp(tl[0], tr[0], u), lerp(tl[1], tr[1], u)];
      const bot = [lerp(bl[0], br[0], u), lerp(bl[1], br[1], u)];
      return [lerp(top[0], bot[0], v), lerp(top[1], bot[1], v)];
    }

    // story values from progress
    const phase = () => (p < 1 / 3 ? 0 : p < 2 / 3 ? 1 : 2);
    const local = () => (p * 3) - Math.min(2, Math.floor(p * 3));
    const clock = () => lerp(7 * 60, 21 * 60, p); // 07:00 → 21:00
    const sunUp = () => clamp(1 - (p - 0.7) / 0.18, 0, 1);
    const night = () => clamp((p - 0.72) / 0.2, 0, 1);
    const soc = () => (p < 1 / 3 ? lerp(0.2, 0.34, p * 3) : p < 2 / 3 ? lerp(0.34, 1, ease((p - 1 / 3) * 3)) : lerp(1, 0.64, (p - 2 / 3) * 3));
    const pvKw = () => { const t = clock() / 60; return t > 6.2 && t < 18.6 ? 6.4 * Math.pow(Math.sin(Math.PI * (t - 6.2) / 12.4), 1.2) : 0; };
    const homeKw = () => { const t = clock() / 60; return 0.4 + 1.3 * Math.exp(-((t - 7.4) ** 2) / 0.9) + 0.5 * Math.exp(-((t - 13) ** 2) / 5) + 2.3 * Math.exp(-((t - 19.6) ** 2) / 3.2); };

    function spawnPhoton() {
      const u = 0.06 + Math.random() * 0.88, v = 0.08 + Math.random() * 0.84;
      const target = roofPt(u, v);
      const cell = cells[Math.min(G.rows - 1, Math.floor(v * G.rows)) * G.cols + Math.min(G.cols - 1, Math.floor(u * G.cols))];
      const s = G.sun;
      const a = Math.random() * Math.PI * 2;
      const sx = s.x + Math.cos(a) * s.r * 0.6, sy = sunY() + Math.sin(a) * s.r * 0.6;
      photons.push({ x: sx, y: sy, tx: target[0], ty: target[1], sx, sy, k: 0, sp: 0.9 + Math.random() * 0.6, cell });
    }
    const sunY = () => G.sun.y + (1 - sunUp()) * H * 0.75;

    function update(dt) {
      const ph = phase();
      const up = sunUp();
      // photons
      const rate = (ph === 0 ? lerp(18, 70, local()) : ph === 1 ? 70 : 70 * up) * (reduce ? 0 : 1);
      let n = rate * dt;
      while (n > 0) { if (Math.random() < n) spawnPhoton(); n -= 1; }
      for (let i = photons.length - 1; i >= 0; i--) {
        const f = photons[i];
        f.k += dt * f.sp * 1.6;
        f.x = lerp(f.sx, f.tx, f.k); f.y = lerp(f.sy, f.ty, f.k);
        if (f.k >= 1) {
          f.cell.e = 1;
          for (let j = 0; j < 3; j++) sparks.push({ x: f.tx, y: f.ty, vx: (Math.random() - 0.5) * 120, vy: -Math.random() * 120, life: 1 });
          hitCount++;
          if (hitCount % 6 === 0) pulses.push({ wire: 'roof', d: 0, next: ph === 0 ? 'home' : 'batt' });
          photons.splice(i, 1);
        }
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life -= dt * 2.4; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 260 * dt;
        if (s.life <= 0) sparks.splice(i, 1);
      }
      cells.forEach((c) => { c.e = Math.max(0, c.e - dt * 1.8); });
      // after dark the battery feeds the house
      if (ph === 2 && night() > 0.3 && Math.random() < dt * 9) pulses.push({ wire: 'batt', d: 0, rev: true, next: 'home' });
      for (let i = pulses.length - 1; i >= 0; i--) {
        const q = pulses[i];
        const w = G.wires[q.wire];
        q.d += dt * 260;
        if (q.d >= w.total) {
          if (q.next) { pulses.push({ wire: q.next, d: 0 }); }
          pulses.splice(i, 1);
        }
      }
    }

    function draw() {
      if (!G) return;
      const ph = phase(), nt = night(), up = sunUp();
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      // sky
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, mixc([44, 42, 38], [16, 18, 30], nt));
      g.addColorStop(1, mixc([36, 35, 32], [20, 20, 26], nt));
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      // stars
      if (nt > 0) {
        stars.forEach((s) => {
          s.t += 0.016;
          ctx.globalAlpha = nt * (0.45 + 0.55 * Math.abs(Math.sin(s.t)));
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill();
        });
        ctx.globalAlpha = 1;
      }
      // sun + glow
      const sy = sunY();
      if (up > 0) {
        const s = G.sun;
        const glow = ctx.createRadialGradient(s.x, sy, 0, s.x, sy, s.r * 7);
        glow.addColorStop(0, 'rgba(255,205,70,' + (0.4 * up) + ')');
        glow.addColorStop(1, 'rgba(255,205,70,0)');
        ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(s.x, sy, s.r * 7, 0, 7); ctx.fill();
        ctx.fillStyle = '#F5C21B'; ctx.beginPath(); ctx.arc(s.x, sy, s.r, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(255,240,190,.8)'; ctx.beginPath(); ctx.arc(s.x - 10, sy - 10, s.r * 0.45, 0, 7); ctx.fill();
      } else {
        // moon
        ctx.fillStyle = 'rgba(239,235,227,' + nt + ')';
        ctx.beginPath(); ctx.arc(170, H * 0.16, 22, 0, 7); ctx.fill();
        ctx.fillStyle = mixc([44, 42, 38], [16, 18, 30], nt);
        ctx.beginPath(); ctx.arc(181, H * 0.16 - 7, 20, 0, 7); ctx.fill();
      }
      // ground
      ctx.strokeStyle = 'rgba(239,235,227,.18)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, G.ground); ctx.lineTo(W, G.ground); ctx.stroke();

      // house wall
      const { x0, x1 } = G.wall;
      ctx.fillStyle = mixc([52, 50, 46], [30, 29, 27], nt);
      ctx.fillRect(x0, G.wallTop, x1 - x0, G.ground - G.wallTop);
      ctx.strokeStyle = 'rgba(239,235,227,.35)'; ctx.lineWidth = 1.5;
      ctx.strokeRect(x0, G.wallTop, x1 - x0, G.ground - G.wallTop);
      // windows: glow at night
      const lights = clamp(nt * 1.3, 0, 1);
      [...G.windows, G.door].forEach((w, i) => {
        ctx.fillStyle = lights > 0 ? 'rgba(255,200,103,' + (0.15 + 0.85 * lights) + ')' : 'rgba(239,235,227,.08)';
        ctx.fillRect(w[0], w[1], w[2], w[3]);
        if (lights > 0 && i < 2) {
          const lg = ctx.createRadialGradient(w[0] + w[2] / 2, w[1] + w[3] / 2, 4, w[0] + w[2] / 2, w[1] + w[3] / 2, 120);
          lg.addColorStop(0, 'rgba(255,190,90,' + 0.35 * lights + ')'); lg.addColorStop(1, 'rgba(255,190,90,0)');
          ctx.fillStyle = lg; ctx.fillRect(w[0] - 120, w[1] - 120, w[2] + 240, w[3] + 240);
        }
        ctx.strokeStyle = 'rgba(239,235,227,.3)'; ctx.strokeRect(w[0], w[1], w[2], w[3]);
      });

      // roof panels
      cells.forEach((c) => {
        const u0 = c.c / G.cols, u1 = (c.c + 1) / G.cols, v0 = c.r / G.rows, v1 = (c.r + 1) / G.rows;
        const a = roofPt(u0 + 0.008, v0 + 0.012), b = roofPt(u1 - 0.008, v0 + 0.012), d = roofPt(u1 - 0.008, v1 - 0.012), e = roofPt(u0 + 0.008, v1 - 0.012);
        const base = mixc([46, 62, 92], [26, 34, 52], nt);
        ctx.fillStyle = c.e > 0 ? mixc(hexToArr(base), [255, 214, 90], c.e * 0.85) : base;
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(d[0], d[1]); ctx.lineTo(e[0], e[1]); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(160,190,230,.25)'; ctx.lineWidth = 1; ctx.stroke();
      });
      const { tl, tr, br, bl } = G.roof;
      ctx.strokeStyle = 'rgba(239,235,227,.5)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(tl[0], tl[1]); ctx.lineTo(tr[0], tr[1]); ctx.lineTo(br[0], br[1]); ctx.lineTo(bl[0], bl[1]); ctx.closePath(); ctx.stroke();

      // wires
      ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      Object.values(G.wires).forEach((w) => {
        ctx.strokeStyle = 'rgba(239,235,227,.16)';
        ctx.beginPath(); w.pts.forEach((pt, i) => (i ? ctx.lineTo(pt[0], pt[1]) : ctx.moveTo(pt[0], pt[1]))); ctx.stroke();
      });
      // inverter
      const inv = G.inv;
      ctx.fillStyle = '#3A3934'; ctx.strokeStyle = 'rgba(239,235,227,.4)'; ctx.lineWidth = 1.5;
      roundRect(inv.x, inv.y, inv.w, inv.h, 6); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#F5C21B'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(inv.x + 18, inv.y + inv.h / 2);
      ctx.bezierCurveTo(inv.x + 28, inv.y + 12, inv.x + 36, inv.y + 12, inv.x + 36, inv.y + inv.h / 2);
      ctx.bezierCurveTo(inv.x + 36, inv.y + inv.h - 12, inv.x + 46, inv.y + inv.h - 12, inv.x + 54, inv.y + inv.h / 2);
      ctx.stroke();
      // battery
      const b = G.batt, lvl = soc();
      ctx.fillStyle = '#ECE8E0'; roundRect(b.x, b.y, b.w, b.h, 10); ctx.fill();
      ctx.fillStyle = '#C9C3B7'; roundRect(b.x + 10, b.y + 14, b.w - 20, b.h - 28, 5); ctx.fill();
      const fh = (b.h - 28) * lvl;
      ctx.fillStyle = '#F5C21B'; roundRect(b.x + 10, b.y + 14 + (b.h - 28 - fh), b.w - 20, fh, 5); ctx.fill();
      if (ph === 1) {
        const bg = ctx.createRadialGradient(b.x + b.w / 2, b.y + b.h / 2, 10, b.x + b.w / 2, b.y + b.h / 2, 120);
        bg.addColorStop(0, 'rgba(245,194,27,' + 0.25 * (0.6 + 0.4 * Math.sin(performance.now() / 300)) + ')'); bg.addColorStop(1, 'rgba(245,194,27,0)');
        ctx.fillStyle = bg; ctx.fillRect(b.x - 120, b.y - 120, b.w + 240, b.h + 240);
      }

      // photons (additive)
      ctx.globalCompositeOperation = 'lighter';
      photons.forEach((f) => {
        const k0 = Math.max(0, f.k - 0.08);
        const x0 = lerp(f.sx, f.tx, k0), y0 = lerp(f.sy, f.ty, k0);
        const grad = ctx.createLinearGradient(x0, y0, f.x, f.y);
        grad.addColorStop(0, 'rgba(255,200,60,0)'); grad.addColorStop(1, 'rgba(255,214,90,.95)');
        ctx.strokeStyle = grad; ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(f.x, f.y); ctx.stroke();
      });
      sparks.forEach((s) => {
        ctx.fillStyle = 'rgba(255,220,120,' + s.life + ')';
        ctx.beginPath(); ctx.arc(s.x, s.y, 2.2 * s.life + 0.5, 0, 7); ctx.fill();
      });
      pulses.forEach((q) => {
        const w = G.wires[q.wire];
        const [x, y] = along(w, q.rev ? w.total - q.d : q.d);
        const pg = ctx.createRadialGradient(x, y, 0, x, y, 14);
        pg.addColorStop(0, 'rgba(255,214,90,1)'); pg.addColorStop(1, 'rgba(255,214,90,0)');
        ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(x, y, 14, 0, 7); ctx.fill();
      });
      ctx.globalCompositeOperation = 'source-over';
    }

    function roundRect(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    }
    function mixc(a, b, t) { return 'rgb(' + a.map((v, i) => Math.round(lerp(v, b[i], t))).join(',') + ')'; }
    function hexToArr(rgb) { return rgb.match(/\d+/g).map(Number); }

    function frame(ts) {
      const dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
      last = ts;
      update(dt);
      draw();
      if (running) raf = requestAnimationFrame(frame);
    }
    function start() { if (running || reduce) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
    function stop() { running = false; cancelAnimationFrame(raf); }

    function setProgress(v) {
      p = clamp(v, 0, 1);
      const ph = phase(), lp = local();
      steps.forEach((s, i) => {
        s.classList.toggle('is-active', i === ph);
        const bar = s.querySelector('.step__bar b');
        if (bar) bar.style.setProperty('--p', i < ph ? 1 : i === ph ? lp.toFixed(3) : 0);
      });
      if (read.time) {
        read.time.textContent = SOLAR.hhmm ? SOLAR.hhmm(clock()) : '';
        read.pv.textContent = pvKw().toFixed(1);
        read.soc.textContent = Math.round(soc() * 100);
        read.home.textContent = homeKw().toFixed(1);
      }
      if (reduce) draw();
    }
    SOLAR.photons = { setProgress, driven: false };

    // fallback progress when no scroll library drives it
    function fallbackProgress() {
      if (SOLAR.photons.driven) return;
      const r = section.getBoundingClientRect(), vh = window.innerHeight;
      setProgress((vh * 0.5 - r.top) / Math.max(1, r.height));
    }
    window.addEventListener('scroll', fallbackProgress, { passive: true });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver((en) => {
        visible = en[0].isIntersecting;
        if (visible) start(); else stop();
      }, { rootMargin: '100px 0px' }).observe(canvas);
    }
    const onResize = () => { layout(); draw(); };
    window.addEventListener('resize', onResize);
    layout();
    setProgress(0);
    draw();
  }

  /* -----------------------------------------------------------------------
     2. NIGHT SKY (contact)
     ----------------------------------------------------------------------- */
  const sky = document.querySelector('[data-stars]');
  if (sky) {
    const c = sky.getContext('2d');
    let w = 0, h = 0, stars = [], shooting = null, running = false, raf = 0, nextShot = 3;
    const resize = () => {
      const r = sky.getBoundingClientRect(), dpr = DPR();
      w = r.width; h = r.height;
      sky.width = Math.round(w * dpr); sky.height = Math.round(h * dpr);
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round((w * h) / 9000);
      stars = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.2 + 0.3, ph: Math.random() * 6, sp: 0.4 + Math.random() * 1.2 }));
    };
    const draw = (t) => {
      c.clearRect(0, 0, w, h);
      stars.forEach((s) => {
        c.globalAlpha = reduce ? 0.6 : 0.25 + 0.75 * Math.abs(Math.sin(s.ph + t * s.sp));
        c.fillStyle = '#FFFFFF';
        c.beginPath(); c.arc(s.x, s.y, s.r, 0, 7); c.fill();
      });
      c.globalAlpha = 1;
      if (shooting) {
        const s = shooting;
        const g = c.createLinearGradient(s.x, s.y, s.x - s.vx * 0.12, s.y - s.vy * 0.12);
        g.addColorStop(0, 'rgba(255,240,200,' + s.life + ')'); g.addColorStop(1, 'rgba(255,240,200,0)');
        c.strokeStyle = g; c.lineWidth = 1.6;
        c.beginPath(); c.moveTo(s.x, s.y); c.lineTo(s.x - s.vx * 0.12, s.y - s.vy * 0.12); c.stroke();
      }
    };
    let last = 0;
    const loop = (ts) => {
      const t = ts / 1000, dt = Math.min(0.05, t - last || 0.016);
      last = t;
      nextShot -= dt;
      if (nextShot <= 0 && !shooting) {
        shooting = { x: Math.random() * w * 0.7 + w * 0.2, y: Math.random() * h * 0.3, vx: -(500 + Math.random() * 300), vy: 220 + Math.random() * 120, life: 1 };
        nextShot = 5 + Math.random() * 6;
      }
      if (shooting) {
        shooting.x += shooting.vx * dt; shooting.y += shooting.vy * dt; shooting.life -= dt * 1.1;
        if (shooting.life <= 0) shooting = null;
      }
      draw(t);
      if (running) raf = requestAnimationFrame(loop);
    };
    resize(); draw(0);
    window.addEventListener('resize', () => { resize(); draw(last); });
    if (!reduce && 'IntersectionObserver' in window) {
      new IntersectionObserver((en) => {
        if (en[0].isIntersecting) { if (!running) { running = true; raf = requestAnimationFrame(loop); } }
        else { running = false; cancelAnimationFrame(raf); }
      }).observe(sky);
    }
  }

  /* -----------------------------------------------------------------------
     3. STATIC STARS (sunset)
     ----------------------------------------------------------------------- */
  const field = document.querySelector('[data-stars-static]');
  if (field) {
    let html = '';
    for (let i = 0; i < 90; i++) {
      const o = (0.3 + Math.random() * 0.7).toFixed(2), s = Math.random() < 0.15 ? 3 : 2;
      html += '<i style="left:' + (Math.random() * 100).toFixed(2) + '%;top:' + (Math.random() * 62).toFixed(2) + '%;opacity:' + o + ';width:' + s + 'px;height:' + s + 'px"></i>';
    }
    field.innerHTML = html;
  }
})();
