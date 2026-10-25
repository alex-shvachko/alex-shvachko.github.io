(() => {
  // The line world behind the page, drawn with the hairline kernel: a rover on its plinth,
  // the trail of the journey with a marker per chapter, the floor grid and a field of stars.
  // Scroll steers one camera across it (studio, path, archive, signal); the pointer is
  // answered by the rover. Geometry is projected once at unit scale and the camera is a
  // transform on top, so a zoom never redraws what did not move.
  if (!window.HL) return;
  const { rings, circ, prism, hull, poly, open, clamp, lerp, mk, solid, put, tween, tset, tval, tdone, spring, stepS } = HL;
  const root = document.querySelector('.world');
  if (!root) return;
  const readout = document.querySelector('.world-readout b');
  const reducedQuery = matchMedia('(prefers-reduced-motion: reduce)');

  // The kernel's 2:1 camera at unit scale.
  const CS = Math.SQRT1_2, K = .5, ZF = Math.sqrt(.75);
  const P = (x, y, z) => [(x - y) * CS, (x + y) * CS * K - z * ZF];
  const unP = (sx, sy) => { const Y = sy / K; return [(sx + Y) * CS, (Y - sx) * CS]; };
  const facing = (nx, ny) => nx * CS + ny * CS >= -1e-6;
  const front = q => facing(q.nu, q.nv);
  const smooth = t => t * t * (3 - 2 * t);
  const inOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
  const set = (el, name, value) => { if (el.getAttribute(name) !== value) el.setAttribute(name, value); };
  const ring2 = (cx, cy, cz, ux, uy, uz, vx, vy, vz, r, n, sv = 1) => {
    const out = [];
    for (let k = 0; k < n; k++) {
      const t = k / n * Math.PI * 2, c = Math.cos(t) * r, s = Math.sin(t) * r * sv;
      out.push(P(cx + ux * c + vx * s, cy + uy * c + vy * s, cz + uz * c + vz * s));
    }
    return out;
  };

  // ---- the drawing -------------------------------------------------------------------
  const svg = mk('svg', { 'aria-hidden': 'true', focusable: 'false' }, root);
  const defs = mk('defs', {}, svg);
  const grad = mk('radialGradient', { id: 'world-fade-g', gradientUnits: 'userSpaceOnUse' }, defs);
  mk('stop', { offset: 0, 'stop-color': '#fff', 'stop-opacity': 1 }, grad);
  mk('stop', { offset: .5, 'stop-color': '#fff', 'stop-opacity': .6 }, grad);
  mk('stop', { offset: 1, 'stop-color': '#fff', 'stop-opacity': 0 }, grad);
  const mask = mk('mask', { id: 'world-fade', maskUnits: 'userSpaceOnUse', x: 0, y: 0 }, defs);
  const maskRect = mk('rect', { x: 0, y: 0, fill: 'url(#world-fade-g)' }, mask);

  const starsG = mk('g', { class: 'stars', opacity: 0 }, svg);
  const floor = mk('g', { mask: 'url(#world-fade)' }, svg);
  const floorCam = mk('g', {}, floor);
  const gridCoarse = mk('path', { class: 'grid' }, floorCam);
  const gridFine = mk('path', { class: 'grid' }, floorCam);
  const scene = mk('g', {}, svg);
  const cam = mk('g', {}, scene);
  const plinthG = mk('g', {}, cam);
  const trailG = mk('g', {}, cam);
  const backMarks = mk('g', {}, cam);
  const roverG = mk('g', {}, cam);
  const frontMarks = mk('g', {}, cam);

  // The plinth: a round plate with a ring of ticks round its rim and a dashed guide inside.
  const PR = 56;
  put(solid(plinthG), prism(P, front, circ(PR, 120), circ(PR - 2.2, 120), -6, 0));
  {
    let d = '';
    for (let k = 0; k < 64; k++) {
      const a = k / 64 * Math.PI * 2, r0 = PR - (k % 8 ? 5.5 : 9), r1 = PR - 3.6;
      const p = P(Math.cos(a) * r0, Math.sin(a) * r0, 0), q = P(Math.cos(a) * r1, Math.sin(a) * r1, 0);
      d += `M${p[0].toFixed(2)} ${p[1].toFixed(2)}L${q[0].toFixed(2)} ${q[1].toFixed(2)}`;
    }
    mk('path', { class: 'nf lo', d }, plinthG);
    mk('path', { class: 'nf lo dash', d: poly(circ(40, 96).map(q => P(q.u, q.v, 0))) }, plinthG);
  }

  // The rover, in its own frame: u forward, w to its left, z up.
  const CHASSIS = rings(-30, -17, 30, 17, 6, 1.8);
  const BUMPER = rings(29, -14, 33, 14, 1.6, .7);
  const HEAD = rings(-11, -13, 11, 13, 5, 1.6);
  const HEAD_AT = 14, NECK = circ(4, 28);
  const LIDAR_AT = -13, LIDAR = [circ(7, 48), circ(6.1, 48)], CAP = [circ(4.6, 36), circ(3.9, 36)];
  const ANT = [-24, -11], ANT_TOP = 64;
  const WHEEL_U = [22, 0, -22], WHEEL_W = 23.5, WR = 9, WHW = 3.6, WZ = 9;
  const ROCKER = [[22, 9], [7, 21], [-11, 16], [-22, 9], [-11, 16], [0, 9]];
  const xf = (ring, ox, oy, h) => {
    const c = Math.cos(h), s = Math.sin(h);
    return ring.map(q => ({ u: ox + q.u * c - q.v * s, v: oy + q.u * s + q.v * c, nu: q.nu * c - q.nv * s, nv: q.nu * s + q.nv * c }));
  };

  const el = {
    chassis: solid(roverG), bumper: solid(roverG),
    sides: [1, -1].map(side => ({
      side,
      rocker: mk('path', { class: 'nf sil' }, roverG),
      wheels: WHEEL_U.map(() => {
        const g = mk('g', {}, roverG);
        return { g, tire: mk('path', { class: 'sil' }, g), face: mk('path', { class: 'nf' }, g), rim: mk('path', { class: 'nf lo' }, g), spokes: mk('path', { class: 'nf lo' }, g), hub: mk('path', { class: 'sil' }, g) };
      })
    })),
    lidar: (() => {
      const g = mk('g', {}, roverG);
      return { g, body: solid(g), cap: solid(g), slit: mk('path', { class: 'nf hi' }, g) };
    })(),
    head: (() => {
      const g = mk('g', {}, roverG);
      const neck = solid(g), box = solid(g);
      box.sil.classList.add('hi');
      const eyes = [0, 1].map(() => ({ ring: mk('path', { class: 'sil' }, g), lens: mk('path', { class: 'nf lo' }, g), pupil: mk('path', { class: 'dot accent' }, g) }));
      return { g, neck, box, eyes };
    })(),
    antenna: (() => {
      const g = mk('g', {}, roverG);
      return { g, base: solid(g), mast: mk('path', { class: 'nf sil' }, g), band: mk('path', { class: 'nf lo' }, g), tip: mk('path', { class: 'sil' }, g) };
    })()
  };

  function wheel(w, cx, cy, ax, ay, spin) {
    const fx = ay, fy = -ax, N = 30;
    const A = ring2(cx - WHW * ax, cy - WHW * ay, WZ, fx, fy, 0, 0, 0, 1, WR, N);
    const B = ring2(cx + WHW * ax, cy + WHW * ay, WZ, fx, fy, 0, 0, 0, 1, WR, N);
    // The cap whose outward normal faces the camera is the one we see.
    const nearB = facing(ax, ay);
    const ncx = cx + (nearB ? WHW : -WHW) * ax, ncy = cy + (nearB ? WHW : -WHW) * ay;
    set(w.tire, 'd', poly(hull(A.concat(B))));
    set(w.face, 'd', poly(nearB ? B : A));
    set(w.rim, 'd', poly(ring2(ncx, ncy, WZ, fx, fy, 0, 0, 0, 1, WR * .7, 24)));
    set(w.hub, 'd', poly(ring2(ncx, ncy, WZ, fx, fy, 0, 0, 0, 1, WR * .28, 14)));
    let d = '';
    for (let k = 0; k < 3; k++) {
      const a = spin + k * Math.PI * 2 / 3, c = Math.cos(a), sn = Math.sin(a);
      const p = P(ncx + fx * c * WR * .28, ncy + fy * c * WR * .28, WZ + sn * WR * .28);
      const q = P(ncx + fx * c * WR * .7, ncy + fy * c * WR * .7, WZ + sn * WR * .7);
      d += `M${p[0].toFixed(2)} ${p[1].toFixed(2)}L${q[0].toFixed(2)} ${q[1].toFixed(2)}`;
    }
    set(w.spokes, 'd', d);
  }

  // Pose: where the rover stands and how it answers the pointer.
  const pose = { x: 0, y: 0, h: 0, spin: 0 };
  const yaw = spring(.32, { k: 90, c: 17 });
  const lookX = spring(.4), lookZ = spring(-.15);
  const leanX = spring(0, { k: 60, c: 9 }), leanY = spring(0, { k: 60, c: 9 });
  let lidarAngle = .6, blink = 1, blinkAt = 2.4, blinkT = -1;
  const anchors = {};

  function drawRover() {
    const { x: bx, y: by, h } = pose, c = Math.cos(h), s = Math.sin(h);
    const at = (u, w) => [bx + u * c - w * s, by + u * s + w * c];
    put(el.chassis, prism(P, front, xf(CHASSIS[0], bx, by, h), xf(CHASSIS[1], bx, by, h), 14, 29));
    put(el.bumper, prism(P, front, xf(BUMPER[0], bx, by, h), xf(BUMPER[1], bx, by, h), 15, 25));
    const ax = -s, ay = c;
    const nearSide = facing(ax, ay) ? 1 : -1;
    for (const side of el.sides) {
      const w0 = side.side * WHEEL_W;
      side.wheels.forEach((w, i) => { const [cx, cy] = at(WHEEL_U[i], w0); w.depth = cx + cy; wheel(w, cx, cy, ax, ay, pose.spin); });
      let d = '';
      for (let k = 0; k < ROCKER.length; k += 3) {
        const pts = ROCKER.slice(k, k + 3).map(([u, z]) => { const [px, py] = at(u, side.side * 19.4); return P(px, py, z); });
        d += open(pts);
      }
      set(side.rocker, 'd', d);
    }
    // Lidar: a puck on the deck, a cap, and a slit that sweeps round.
    const [lx, ly] = at(LIDAR_AT, 0);
    slitAt = [lx, ly];
    put(el.lidar.body, prism(P, front, xf(LIDAR[0], lx, ly, 0), xf(LIDAR[1], lx, ly, 0), 29, 36));
    put(el.lidar.cap, prism(P, front, xf(CAP[0], lx, ly, 0), xf(CAP[1], lx, ly, 0), 36, 39.5));
    drawSlit(lx, ly);
    // Head on its neck: it turns to the pointer and its eyes follow it.
    const [hx, hy] = at(HEAD_AT, 0), hh = h + yaw.x, hc = Math.cos(hh), hs = Math.sin(hh);
    put(el.head.neck, prism(P, front, xf(NECK, hx, hy, 0), null, 29, 33));
    put(el.head.box, prism(P, front, xf(HEAD[0], hx, hy, hh), xf(HEAD[1], hx, hy, hh), 33, 46));
    const seen = facing(hc, hs);
    const Lx = -hs, Ly = hc;
    el.head.eyes.forEach((eye, i) => {
      const wv = i ? -6 : 6, ex = hx + 11 * hc - wv * hs, ey = hy + 11 * hs + wv * hc, ez = 40;
      eye.ring.style.display = eye.lens.style.display = eye.pupil.style.display = seen ? '' : 'none';
      if (!seen) return;
      set(eye.ring, 'd', poly(ring2(ex, ey, ez, Lx, Ly, 0, 0, 0, 1, 4, 26, blink)));
      set(eye.lens, 'd', poly(ring2(ex, ey, ez, Lx, Ly, 0, 0, 0, 1, 2.7, 22, blink)));
      const px = ex + Lx * lookX.x, py = ey + Ly * lookX.x, pz = ez + lookZ.x * blink;
      set(eye.pupil, 'd', poly(ring2(px, py, pz, Lx, Ly, 0, 0, 0, 1, 1.45, 14, blink)));
      // The pin meets the eye on its rim, so the pupil stays in view.
      if (i === 0) anchors.eye = P(ex + Lx * 4, ey + Ly * 4, ez);
    });
    // Antenna: a mast with a ball on top that leans toward the pointer.
    const [ax0, ay0] = at(ANT[0], ANT[1]);
    put(el.antenna.base, prism(P, front, xf(circ(2.3, 18), ax0, ay0, 0), null, 29, 32));
    const tip = [ax0 + leanX.x, ay0 + leanY.x, ANT_TOP];
    const band = [ax0 + leanX.x * .55, ay0 + leanY.x * .55, 50];
    set(el.antenna.mast, 'd', open([P(ax0, ay0, 32), P(...band), P(...tip)]));
    set(el.antenna.band, 'd', poly(ring2(band[0], band[1], band[2], 1, 0, 0, 0, 1, 0, 1.6, 14)));
    set(el.antenna.tip, 'd', poly(ring2(tip[0], tip[1], tip[2], CS, -CS, 0, 0, 0, 1, 2.3, 18)));

    anchors.head = P(hx, hy, 46);
    anchors.lidar = P(lx, ly, 39.5);
    anchors.antenna = P(tip[0], tip[1], tip[2] + 2.3);
    const nearWheel = el.sides.find(sd => sd.side === nearSide).wheels.reduce((a, b) => (b.depth > a.depth ? b : a));
    const wi = el.sides.find(sd => sd.side === nearSide).wheels.indexOf(nearWheel);
    const [wx, wy] = at(WHEEL_U[wi], nearSide * (WHEEL_W + WHW));
    anchors.wheel = P(wx, wy, WZ);

    // Paint order: far wheels, far rocker, chassis, near rocker, near wheels, then the deck
    // parts from the back. Reordered only when the order actually changes.
    const far = el.sides.find(sd => sd.side !== nearSide), near = el.sides.find(sd => sd.side === nearSide);
    const byDepth = list => list.slice().sort((a, b) => a.depth - b.depth);
    el.head.depth = hx + hy; el.lidar.depth = lx + ly; el.antenna.depth = ax0 + ay0;
    const bumperFront = facing(c, s);
    const order = [
      ...byDepth(far.wheels).map(w => w.g), far.rocker,
      ...(bumperFront ? [el.chassis.g, el.bumper.g] : [el.bumper.g, el.chassis.g]),
      near.rocker, ...byDepth(near.wheels).map(w => w.g),
      ...byDepth([el.head, el.lidar, el.antenna]).map(p => p.g)
    ];
    if (order.some((node, i) => roverG.children[i] !== node)) roverG.append(...order);
  }
  let slitAt = [0, 0];
  function drawSlit(lx, ly) {
    const a = lidarAngle, nx = Math.cos(a), ny = Math.sin(a);
    if (!facing(nx, ny)) { set(el.lidar.slit, 'd', ''); return; }
    const p = P(lx + nx * 7, ly + ny * 7, 30.5), q = P(lx + nx * 7, ly + ny * 7, 34.5);
    set(el.lidar.slit, 'd', `M${p[0].toFixed(2)} ${p[1].toFixed(2)}L${q[0].toFixed(2)} ${q[1].toFixed(2)}`);
  }

  // ---- the trail ---------------------------------------------------------------------
  const trailPlan = mk('path', { class: 'nf sil dash' }, trailG);
  const trailL = mk('path', { class: 'nf sil' }, trailG);
  const trailR = mk('path', { class: 'nf sil' }, trailG);
  let route = null, marks = [];
  function spline(pts, n) {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      for (let k = 0; k < n; k++) {
        const t = k / n, t2 = t * t, t3 = t2 * t;
        out.push([0, 1].map(j => .5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
      }
    }
    out.push(pts[pts.length - 1].slice());
    return out;
  }
  function buildRoute(points, markersWorld) {
    const pts = spline(points, 26), s = [0];
    for (let i = 1; i < pts.length; i++) s.push(s[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const tan = pts.map((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)]; const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; });
    const HW = 4.2, edge = side => pts.map((p, i) => P(p[0] - tan[i][1] * HW * side, p[1] + tan[i][0] * HW * side, 0));
    const r = { pts, s, tan, L: edge(1), R: edge(-1), C: pts.map(p => P(p[0], p[1], 0)), len: s[s.length - 1] };
    r.exit = PR + 4;
    r.stops = markersWorld.map(m => {
      let best = 0, bd = Infinity;
      pts.forEach((p, i) => { const d = Math.hypot(p[0] - m[0], p[1] - m[1]); if (d < bd) { bd = d; best = i; } });
      return s[best];
    });
    return r;
  }
  function index(s) {
    const S = route.s;
    let lo = 0, hi = S.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (S[m] <= s) lo = m; else hi = m; }
    return [lo, S[hi] > S[lo] ? clamp((s - S[lo]) / (S[hi] - S[lo]), 0, 1) : 0];
  }
  function pointAt(s) {
    const [i, f] = index(clamp(s, 0, route.len)), j = Math.min(i + 1, route.pts.length - 1);
    const a = route.pts[i], b = route.pts[j], ta = route.tan[i], tb = route.tan[j];
    return { x: lerp(a[0], b[0], f), y: lerp(a[1], b[1], f), h: Math.atan2(lerp(ta[1], tb[1], f), lerp(ta[0], tb[0], f)) };
  }
  function slice(list, s0, s1) {
    if (s1 <= s0) return '';
    const [i0] = index(s0), [i1, f1] = index(s1);
    const pts = list.slice(i0, i1 + 1);
    const j = Math.min(i1 + 1, list.length - 1);
    pts.push([lerp(list[i1][0], list[j][0], f1), lerp(list[i1][1], list[j][1], f1)]);
    return open(pts);
  }
  function buildMarks(markersWorld) {
    backMarks.replaceChildren(); frontMarks.replaceChildren();
    // A relayout keeps each pillar's rise where it was, so nothing collapses and regrows.
    const previous = marks;
    marks = markersWorld.map(([x, y], i) => {
      const g = mk('g', {}, backMarks);
      const pad = solid(g), pillar = solid(g);
      put(pad, prism(P, front, ...rings(x - 6, y - 6, x + 6, y + 6, 2.6, .9), 0, 1.2));
      const top = mk('ellipse', { class: 'dot accent', rx: 1.9, ry: .95 }, g);
      return { g, pad, pillar, top, x, y, rise: previous[i] ? previous[i].rise : tween(0), drawn: NaN, on: false };
    });
  }
  const PILLAR = 15;
  function drawMarks(now, active) {
    let busy = false;
    marks.forEach((m, i) => {
      const reached = state.roverS >= route.stops[i] - 2 && state.routeShown * route.len >= route.stops[i];
      tset(m.rise, reached ? PILLAR : 0, now, 0);
      const h = tval(m.rise, now);
      if (!tdone(m.rise, now)) busy = true;
      if (h !== m.drawn) {
        m.drawn = h;
        if (h > .2) put(m.pillar, prism(P, front, ...rings(m.x - 3.2, m.y - 3.2, m.x + 3.2, m.y + 3.2, 1.5, .7), 1.2, 1.2 + h));
        else put(m.pillar, { sil: '', crease: '' });
        const q = P(m.x, m.y, 1.4 + h);
        m.top.setAttribute('cx', q[0].toFixed(2)); m.top.setAttribute('cy', q[1].toFixed(2));
      }
      const live = i === active && h > PILLAR * .6;
      m.pillar.sil.classList.toggle('hi', live);
      m.top.style.display = live ? '' : 'none';
      m.g.style.opacity = state.routeShown * route.len >= route.stops[i] - 6 ? '1' : '0';
      // A marker the rover has not reached yet stands in front of it only when it is nearer the viewer.
      const nearer = m.x + m.y > pose.x + pose.y;
      const want = nearer ? frontMarks : backMarks;
      if (m.g.parentNode !== want) want.append(m.g);
    });
    return busy;
  }

  // ---- floor and sky -------------------------------------------------------------------
  function gridPath(x0, y0, x1, y1, step) {
    let d = '';
    for (let x = Math.ceil(x0 / step) * step; x <= x1; x += step) { const a = P(x, y0, 0), b = P(x, y1, 0); d += `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}`; }
    for (let y = Math.ceil(y0 / step) * step; y <= y1; y += step) { const a = P(x0, y, 0), b = P(x1, y, 0); d += `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}`; }
    return d;
  }
  function buildStars() {
    starsG.replaceChildren();
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    // The field covers the tallest the viewport gets, so a phone's toolbar never uncovers its edge.
    const tall = Math.max(H, screen.height || H);
    const n = clamp(Math.round(W * tall / 8000), 60, 240);
    for (let i = 0; i < n; i++) {
      const bright = rnd() < .12, twinkle = rnd() < .35;
      const c = mk('circle', { cx: (rnd() * W).toFixed(1), cy: (rnd() * tall * 1.15).toFixed(1), r: (bright ? 1.1 + rnd() * .6 : .5 + rnd() * .5).toFixed(2) }, starsG);
      if (bright) c.classList.add('b');
      if (twinkle) { c.classList.add('tw'); c.style.setProperty('--tw-d', `${(3 + rnd() * 5).toFixed(1)}s`); c.style.setProperty('--tw-dl', `${(-rnd() * 8).toFixed(1)}s`); }
    }
  }

  // ---- cameras and scroll ----------------------------------------------------------------
  let starSize = '';
  let W = 0, H = 0, reduced = false, wide = false, narrow = false, keys = [], camKeys = [], hasLayout = false;
  const state = { phi: 0, target: 0, roverS: 0, routeShown: 0, active: -1, cam: null };
  const top = node => node.getBoundingClientRect().top + scrollY;
  const coarse = matchMedia('(pointer: coarse)');
  // The drawing is sized to the fixed layer itself, which excludes a classic scrollbar, so
  // its pixels are the page's pixels; breakpoints still follow the viewport, as CSS does.
  function sizeCanvas() {
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    mask.setAttribute('width', W); mask.setAttribute('height', H);
    maskRect.setAttribute('width', W); maskRect.setAttribute('height', H);
  }
  function layout() {
    const nW = root.clientWidth || innerWidth, nH = root.clientHeight || innerHeight;
    if (!nW || !nH) return;
    // A phone's toolbar showing or hiding only nudges the height: resize the canvas, keep the world.
    if (hasLayout && nW === W && Math.abs(nH - H) < 150 && coarse.matches && reduced === reducedQuery.matches) {
      H = nH; sizeCanvas(); measureKeys(); schedule();
      return;
    }
    W = nW; H = nH;
    reduced = reducedQuery.matches;
    wide = innerWidth > 1100; narrow = innerWidth <= 700;
    sizeCanvas();

    // Home: the rover on its plinth, right of the headline (above it on phones).
    const Sh = narrow ? clamp(W * .0064, 1.8, 3.1) : clamp(Math.min(W * (W < H ? .0048 : .0042), H * .0066), 2.3, 6.8);
    const home = { Fw: [0, 0, 20], Fs: narrow ? [W * .5, H * .3] : [W * .705, H * .56], S: Sh, r: Math.max(W, H) * .5 };

    // Journey: the trail runs down the gutter between the two columns of cards, a marker
    // beside each card. Measured in the pinned stage, which sits at the top of the viewport.
    const stage = document.querySelector('.journey-stage');
    const cards = stage ? [...stage.querySelectorAll('.journey-card')] : [];
    let Sj, origin, markScreen, trailScreen;
    if (wide && cards.length === 5) {
      const rects = cards.map(c => ({ l: c.offsetLeft, t: c.offsetTop, r: c.offsetLeft + c.offsetWidth, b: c.offsetTop + c.offsetHeight }));
      const left = rects.map(r => r.l < W * .2);
      const gL = Math.max(...rects.filter((r, i) => left[i]).map(r => r.r)), gR = Math.min(...rects.filter((r, i) => !left[i]).map(r => r.l));
      const gap = clamp((gR - gL) * .14, 12, 20), mid = (gL + gR) / 2, wiggle = clamp((gR - gL) * .05, 3, 8);
      Sj = clamp(H / 900, .8, 1.15);
      markScreen = rects.map((r, i) => [left[i] ? r.r + gap : r.l - gap, (r.t + r.b) / 2]);
      trailScreen = markScreen.map(([, y], i) => [mid + (left[i] ? wiggle : -wiggle), y]);
      origin = [(gL + gR) / 2 + W * .06, -H * .34];
    } else {
      Sj = clamp(Math.min(W, H) / 700, .75, 1.1);
      const cx = narrow ? W * .5 : W * .5;
      markScreen = [0, 1, 2, 3, 4].map(i => [cx + (i % 2 ? -1 : 1) * 26, H * (.34 + i * .13)]);
      trailScreen = markScreen.map(([x, y], i) => [x + (i % 2 ? 1 : -1) * 24, y]);
      origin = [W * .6, -H * .3];
    }
    const toWorld = ([sx, sy]) => unP((sx - origin[0]) / Sj, (sy - origin[1]) / Sj);
    const marksWorld = markScreen.map(toWorld), trailWorld = trailScreen.map(toWorld);
    const last = trailWorld[4], prev = trailWorld[3];
    const dl = Math.hypot(last[0] - prev[0], last[1] - prev[1]) || 1;
    const end = [last[0] + (last[0] - prev[0]) / dl * 150, last[1] + (last[1] - prev[1]) / dl * 150];
    const first = trailWorld[0], fl = Math.hypot(first[0], first[1]) || 1;
    const exit = [first[0] / fl * (PR + 6), first[1] / fl * (PR + 6)];
    route = buildRoute([[0, 0], exit, ...trailWorld, end], marksWorld);
    buildMarks(marksWorld);
    const centre = toWorld([W * .5, H * .5]);
    const journey = { Fw: [centre[0], centre[1], 0], Fs: [W * .5, H * .5], S: Sj, r: Math.max(W, H) * .78 };
    const archive = { Fw: [end[0], end[1], 0], Fs: [W * .5, H * .62], S: Sj * .92, r: Math.max(W, H) * .7 };
    const signal = { Fw: [end[0], end[1], 0], Fs: [W * .5, H * 1.35], S: Sj * .85, r: Math.max(W, H) * .6 };
    camKeys = [home, journey, journey, archive, signal];

    // The floor: a fine grid round the studio, a coarse one under the whole route.
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const grow = ([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); };
    camKeys.forEach(k => {
      const p = P(...k.Fw), ox = k.Fs[0] - k.S * p[0], oy = k.Fs[1] - k.S * p[1];
      [[0, 0], [W, 0], [0, H], [W, H]].forEach(([sx, sy]) => grow(unP((sx - ox) / k.S, (sy - oy) / k.S)));
    });
    const C = 48;
    gridCoarse.setAttribute('d', gridPath(Math.floor(x0 / C) * C - C, Math.floor(y0 / C) * C - C, x1 + C, y1 + C, C));
    gridFine.setAttribute('d', gridPath(-216, -216, 216, 216, 12));
    if (starSize !== String(W)) { starSize = String(W); buildStars(); }
    drawnPose = drawnTrail = '';
    measureKeys();
    state.roverS = roverAt(state.phi);
    hasLayout = true;
    schedule();
  }
  // Scroll keys: home, journey pinned, journey released, projects, contact. Re-measured on
  // their own whenever the page's height changes (a filter, a figure mounting).
  function measureKeys() {
    const exp = document.querySelector('#experience'), proj = document.querySelector('#projects'), contact = document.querySelector('#contact');
    const vh = innerHeight;
    const k1 = top(exp), k2 = wide ? k1 + exp.offsetHeight - vh : k1 + exp.offsetHeight - vh * .6;
    keys = [0, k1, Math.max(k1 + 1, k2), Math.max(k2 + 2, top(proj) - vh * .3), Math.max(k2 + 3, top(contact) - vh * .3)];
  }
  function scrollPhi() {
    const y = scrollY;
    if (y <= keys[0]) return 0;
    for (let i = 1; i < keys.length; i++) if (y <= keys[i]) return i - 1 + (y - keys[i - 1]) / (keys[i] - keys[i - 1]);
    return keys.length - 1;
  }
  function camAt(phi) {
    const i = clamp(Math.floor(phi), 0, camKeys.length - 2), t = smooth(clamp(phi - i, 0, 1));
    const a = camKeys[i], b = camKeys[i + 1];
    const S = Math.exp(lerp(Math.log(a.S), Math.log(b.S), t));
    let Fw = a.Fw.map((v, j) => lerp(v, b.Fw[j], t)), Fs = [lerp(a.Fs[0], b.Fs[0], t), lerp(a.Fs[1], b.Fs[1], t)];
    // Rising off the studio, the camera holds the rover in frame and carries it from the
    // hero spot to where it will stand on the trail (the journey camera at the end).
    if (i === 0 && route) {
      const at = pointAt(roverAt(phi)), goal = pointAt(route.stops[0]);
      const jf = P(...b.Fw), jp = P(goal.x, goal.y, 0);
      const goalScreen = [b.Fs[0] + b.S * (jp[0] - jf[0]), b.Fs[1] + b.S * (jp[1] - jf[1])];
      Fw = [at.x, at.y, lerp(20, 0, t)];
      Fs = [lerp(a.Fs[0], goalScreen[0], t), lerp(a.Fs[1], goalScreen[1], t)];
    }
    const p = P(...Fw);
    return { S, ox: Fs[0] - S * p[0], oy: Fs[1] - S * p[1], fx: Fs[0], fy: Fs[1], r: lerp(a.r, b.r, t) };
  }
  // Where the rover is along the trail for a scroll phase: it leaves the plinth as the camera
  // rises, waits beside each card while it is read, drives on as the next one opens.
  function roverAt(phi) {
    const st = route.stops;
    if (phi <= .3) return 0;
    if (phi < 1) return st[0] * inOut((phi - .3) / .7);
    if (phi < 2) {
      const p = (phi - 1) * 5, c = Math.min(4, Math.floor(p)), f = p - c;
      return c >= 4 ? st[4] : lerp(st[c], st[c + 1], inOut(clamp((f - .58) / .42, 0, 1)));
    }
    return lerp(st[4], route.len, inOut(clamp((phi - 2) / .7, 0, 1)));
  }

  // ---- the entrance: the plinth and the rover draw themselves, then the rover wakes ----------
  let intro = null;
  const outExpo = t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
  function startIntro() {
    if (reduced || scrollY > innerHeight * .1) return;
    const parts = [[plinthG, 0, 900], [el.chassis.g, 320, 820], [el.bumper.g, 470, 600]];
    el.sides.forEach((sd, k) => { parts.push([sd.rocker, 560 + k * 60, 700]); sd.wheels.forEach((w, i) => parts.push([w.g, 600 + k * 60 + i * 70, 720])); });
    parts.push([el.head.g, 760, 820], [el.lidar.g, 840, 720], [el.antenna.g, 920, 720]);
    parts.forEach(([node]) => {
      node.classList.add('draw');
      const paths = node.tagName === 'path' ? [node] : [...node.querySelectorAll('path')];
      paths.forEach(p => { if (!p.classList.contains('dash')) p.setAttribute('pathLength', '1'); });
    });
    intro = { t0: performance.now(), parts, end: Math.max(...parts.map(([, d, t]) => d + t)) + 500 };
    root.setAttribute('data-intro', '');
    window.World.introEnd = intro.t0 + 1150;
  }
  function stepIntro(now) {
    if (!intro) return false;
    const e = now - intro.t0;
    intro.parts.forEach(([node, delay, dur]) => {
      const d = outExpo(clamp((e - delay) / dur, 0, 1)), f = smooth(clamp((e - delay - dur * .4) / (dur * .6), 0, 1));
      node.style.setProperty('--d', d.toFixed(4));
      node.style.setProperty('--f', f.toFixed(4));
    });
    intro.grid = outExpo(clamp(e / 1300, 0, 1));
    blink = e < 1500 ? .1 : e < 1720 ? .1 + (e - 1500) / 220 * .9 : 1;
    if (e < intro.end) return true;
    intro.parts.forEach(([node]) => {
      node.classList.remove('draw'); node.style.removeProperty('--d'); node.style.removeProperty('--f');
      (node.tagName === 'path' ? [node] : [...node.querySelectorAll('path')]).forEach(p => p.removeAttribute('pathLength'));
    });
    root.removeAttribute('data-intro');
    intro = null;
    return true;
  }

  // ---- pointer ---------------------------------------------------------------------------
  let pointer = null;
  let lastInput = performance.now();
  addEventListener('pointermove', e => { if (e.pointerType === 'touch' && !e.isPrimary) return; pointer = [e.clientX, e.clientY]; lastInput = performance.now(); schedule(); }, { passive: true });
  addEventListener('pointerdown', e => { pointer = [e.clientX, e.clientY]; lastInput = performance.now(); schedule(); }, { passive: true });
  const release = e => { if (e.pointerType !== 'mouse') { pointer = null; schedule(); } };
  addEventListener('pointerup', release, { passive: true });
  addEventListener('pointercancel', release, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { pointer = null; schedule(); });
  addEventListener('blur', () => { pointer = null; schedule(); });

  // ---- the loop ----------------------------------------------------------------------------
  let raf = 0, last = 0, part = '', settled = false, drawnPose = '', drawnTrail = '';
  const listeners = new Set();
  let requested = 0;
  function schedule() {
    // A frame asked for while the page was throttled can be dropped; ask again rather than wait forever.
    if (raf && performance.now() - requested > 500) { cancelAnimationFrame(raf); raf = 0; }
    if (!raf && hasLayout) { requested = performance.now(); raf = requestAnimationFrame(frame); }
  }
  function frame(now) {
    raf = 0;
    if (document.hidden || !route) { last = 0; return; }
    const dt = last ? Math.min(.05, (now - last) / 1000) : 1 / 60;
    last = now;
    state.target = reduced ? 0 : scrollPhi();
    // The first frame lands where the page opened (a deep link does not fly through the world).
    if (!settled) { settled = true; state.phi = state.target; state.roverS = roverAt(state.phi); }
    state.phi += (state.target - state.phi) * (1 - Math.exp(-dt / .12));
    if (Math.abs(state.target - state.phi) < 4e-4) state.phi = state.target;
    const phi = state.phi;
    let busy = phi !== state.target;

    // Camera and the layers' presence.
    const C = camAt(phi);
    state.cam = C;
    const m = `matrix(${C.S.toFixed(4)} 0 0 ${C.S.toFixed(4)} ${C.ox.toFixed(2)} ${C.oy.toFixed(2)})`;
    set(cam, 'transform', m); set(floorCam, 'transform', m);
    if (stepIntro(now)) busy = true;
    set(grad, 'cx', C.fx.toFixed(1)); set(grad, 'cy', C.fy.toFixed(1)); set(grad, 'r', (C.r * (intro ? Math.max(.001, intro.grid) : 1)).toFixed(1));
    gridFine.style.opacity = clamp((C.S - 1.7) / 1.6, 0, 1).toFixed(3);
    const sceneOn = reduced ? (scrollY < innerHeight * .6 ? 1 : .35) : phi < 2.55 ? 1 : phi < 3 ? lerp(1, .32, smooth((phi - 2.55) / .45)) : lerp(.32, 0, smooth(clamp(phi - 3, 0, 1)));
    scene.style.opacity = floor.style.opacity = sceneOn.toFixed(3);
    const starsOn = reduced ? 0 : smooth(clamp((phi - 3.05) / .8, 0, 1));
    set(starsG, 'opacity', starsOn.toFixed(3));
    set(starsG, 'transform', `translate(0 ${(-(phi - 3) * H * .08).toFixed(1)})`);
    root.toggleAttribute('data-stars', starsOn > 0);

    // Trail and rover.
    state.routeShown = reduced ? 0 : clamp((phi - .2) / .75, 0, 1);
    const s = reduced ? 0 : roverAt(phi);
    const moved = s - state.roverS;
    state.roverS = s;
    const at = pointAt(s);
    const h0 = 1.2;
    const k = clamp(s / route.exit, 0, 1);
    pose.x = at.x; pose.y = at.y;
    pose.h = h0 + wrap(at.h - h0) * smooth(k);
    pose.spin += moved / WR;
    const trailKey = `${state.routeShown.toFixed(4)} ${s.toFixed(2)}`;
    if (trailKey !== drawnTrail) {
      drawnTrail = trailKey;
      set(trailPlan, 'd', slice(route.C, route.exit, route.len * state.routeShown));
      set(trailL, 'd', slice(route.L, route.exit, Math.max(route.exit, s)));
      set(trailR, 'd', slice(route.R, route.exit, Math.max(route.exit, s)));
    }

    // Active chapter from the real scroll, so the marker lights with its card.
    const t = state.target;
    state.active = t >= 1 && t <= 2.6 ? Math.min(4, Math.floor((Math.min(t, 2) - 1) * 5)) : -1;
    if (drawMarks(now, state.active)) busy = true;

    // The pointer: the head turns to it on the ground, the eyes find it on screen.
    if (pointer && !reduced) {
      const g = unP((pointer[0] - C.ox) / C.S, (pointer[1] - C.oy) / C.S);
      const [hx, hy] = [pose.x + HEAD_AT * Math.cos(pose.h), pose.y + HEAD_AT * Math.sin(pose.h)];
      yaw.t = clamp(wrap(Math.atan2(g[1] - hy, g[0] - hx) - pose.h), -.95, .95);
      const hp = P(hx, hy, 40), dx = pointer[0] - (C.ox + C.S * hp[0]), dy = pointer[1] - (C.oy + C.S * hp[1]);
      const lx = P(-Math.sin(pose.h + yaw.x), Math.cos(pose.h + yaw.x), 0), ll = Math.hypot(lx[0], lx[1]) || 1;
      lookX.t = clamp((dx * lx[0] + dy * lx[1]) / ll / 160, -1, 1) * 1.1;
      lookZ.t = clamp(-dy / 200, -1, 1) * 1;
      const reach = clamp(1 - Math.hypot(dx, dy) / (C.S * 140), 0, 1);
      leanX.t = clamp((g[0] - hx) / 60, -1, 1) * 3.5 * reach;
      leanY.t = clamp((g[1] - hy) / 60, -1, 1) * 3.5 * reach;
    } else {
      yaw.t = reduced ? .32 : .32 * (1 - k); lookX.t = .45; lookZ.t = -.2; leanX.t = 0; leanY.t = 0;
    }
    for (const sp of [yaw, lookX, lookZ, leanX, leanY]) if (stepS(sp, dt)) busy = true;
    if (Math.abs(moved) > 1e-3) { const kick = clamp(moved, -3, 3) * 2.5; leanX.v -= Math.cos(pose.h) * kick; leanY.v -= Math.sin(pose.h) * kick; }

    // Ambient life while the rover is in view: the lidar sweeps, the eyes blink now and then.
    // Ambient life rests five seconds after the last scroll or pointer move, and wakes with the next.
    const ambient = !reduced && phi < 2.7 && now - lastInput < 5000;
    if (ambient) {
      lidarAngle += dt * 1.7;
      if (!intro) blinkAt -= dt;
      if (blinkAt <= 0 && blinkT < 0) { blinkT = 0; blinkAt = 3.5 + Math.random() * 4; }
      if (blinkT >= 0) { blinkT += dt; blink = blinkT < .09 ? 1 - blinkT / .09 * .9 : blinkT < .2 ? .1 + (blinkT - .09) / .11 * .9 : 1; if (blinkT >= .2) blinkT = -1; }
    }
    const poseKey = [pose.x, pose.y, pose.h, pose.spin, yaw.x, lookX.x, lookZ.x, leanX.x, leanY.x, blink].map(v => v.toFixed(3)).join() + m;
    const changed = poseKey !== drawnPose;
    if (changed) { drawnPose = poseKey; drawRover(); }
    else drawSlit(...slitAt);

    // The read-out names the part of the rover under the pointer.
    let name = 'rest';
    if (pointer && phi < .5) {
      let best = 46;
      for (const [key, q] of Object.entries(anchors)) {
        const d = Math.hypot(pointer[0] - (C.ox + C.S * q[0]), pointer[1] - (C.oy + C.S * q[1]));
        if (d < best) { best = d; name = key; }
      }
      if (name === 'rest' && pointer[0] > C.fx - C.S * 70 && pointer[0] < C.fx + C.S * 70 && Math.abs(pointer[1] - C.fy) < C.S * 60) name = `tracking ${String(Math.round(((pose.h + yaw.x) * 180 / Math.PI % 360 + 360) % 360)).padStart(3, '0')}°`;
    }
    if (readout && name !== part) { part = name; readout.textContent = name; }

    // Pages that hang lines off the drawing only hear about frames where something moved.
    if (changed || busy) listeners.forEach(fn => fn(state));
    if (busy || ambient) schedule();
    else last = 0;
  }

  // Screen points the page connects to: rover parts, and the marker beside each card.
  const screen = q => state.cam ? [state.cam.ox + state.cam.S * q[0], state.cam.oy + state.cam.S * q[1]] : null;
  window.World = {
    anchor: name => anchors[name] ? screen(anchors[name]) : null,
    marker: i => marks[i] ? screen(P(marks[i].x, marks[i].y, 0)) : null,
    markerShown: i => !!marks[i] && state.routeShown * route.len >= route.stops[i],
    roverScale: () => state.cam ? state.cam.S : 1,
    onFrame: fn => { listeners.add(fn); return () => listeners.delete(fn); },
    get phase() { return state.phi; },
    layout,
    introEnd: 0
  };

  addEventListener('scroll', () => { lastInput = performance.now(); schedule(); }, { passive: true });
  new ResizeObserver(() => { if (hasLayout) { measureKeys(); schedule(); } }).observe(document.querySelector('main'));
  // Size changes arrive in bursts (resize, the observer, fonts); lay out once they settle.
  let layoutTimer = 0;
  const requestLayout = () => { clearTimeout(layoutTimer); layoutTimer = setTimeout(layout, 60); };
  addEventListener('resize', requestLayout);
  reducedQuery.addEventListener('change', requestLayout);
  document.addEventListener('visibilitychange', () => { last = 0; schedule(); });
  const stage = document.querySelector('.journey-stage');
  if (stage) new ResizeObserver(requestLayout).observe(stage);
  document.fonts?.ready.then(requestLayout);
  addEventListener('pageshow', () => { last = 0; schedule(); });
  layout();
  startIntro();
  setTimeout(schedule, 700);
})();
