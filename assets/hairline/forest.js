// The forest along the journey trail, drawn by hand in hairline's line: pines and spruces of
// stacked, scalloped tiers with drooping tips and branch strokes, oaks with cloudy crowns of
// overlapping lumps, birches with bark ticks, bushes, rocks, fallen logs with their rings,
// mushrooms, grass, and a stream with ripples, stones and reeds that the trail crosses on a
// plank bridge. Trees stand in groves with clearings between, the path is lined with low
// growth, and nothing ever hides the rover's way. It grows outward from the studio as the
// camera rises, leans from the pointer like a breeze, and stirs as the rover passes.
// world.js owns the camera, the paint order and the loop; this file draws and places.
window.HLForest = function ({ P, front, facing, water, ground }) {
  const { mk, clamp, lerp, hull, poly, open, spring, stepS, rings, prism, fillet, run, ringAt } = HL;
  const TAU = Math.PI * 2;
  const smooth = t => t * t * (3 - 2 * t);
  const set = (el, value) => { if (el.getAttribute('d') !== value) el.setAttribute('d', value); };
  const f = n => n.toFixed(2);
  const mulberry = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

  /** The lower run of a closed loop of screen points, leftmost to rightmost: the edge we see. */
  function frontChain(pts) {
    let iL = 0, iR = 0;
    pts.forEach((p, i) => { if (p[0] < pts[iL][0]) iL = i; if (p[0] > pts[iR][0]) iR = i; });
    const n = pts.length, a = [], b = [];
    for (let i = iL; ; i = (i + 1) % n) { a.push(pts[i]); if (i === iR) break; }
    for (let i = iL; ; i = (i - 1 + n) % n) { b.push(pts[i]); if (i === iR) break; }
    const avg = r => r.reduce((s, p) => s + p[1], 0) / r.length;
    return avg(a) > avg(b) ? a : b;
  }
  /** A lumpy lobe: a circle in screen space round c, its radius rippled by two waves. */
  const lobe = (c, R, p1, p2, n = 32) => Array.from({ length: n }, (_, i) => {
    const a = i / n * TAU, r = R * (1 + .06 * Math.sin(5 * a + p1) + .035 * Math.sin(11 * a + p2));
    return [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r];
  });
  const arc = (c, r, a0, a1, n = 10) => Array.from({ length: n + 1 }, (_, i) => { const a = lerp(a0, a1, i / n); return [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]; });
  /** A flat ellipse on the ground: a circle of radius r at height z, projected. */
  const disc = (x, y, z, r, n = 26) => Array.from({ length: n }, (_, i) => { const a = i / n * TAU; return P(x + Math.cos(a) * r, y + Math.sin(a) * r, z); });
  /** A trunk: a narrow quad from its foot to its (bent) top, with a rounded foot. */
  const trunk = ([bx, by], [tx, ty], w) => `M${f(bx - w)} ${f(by)}L${f(tx - w * .7)} ${f(ty)}L${f(tx + w * .7)} ${f(ty)}L${f(bx + w)} ${f(by)}Q${f(bx)} ${f(by + w * .8)} ${f(bx - w)} ${f(by)}Z`;
  /** How far a point at height z leans, for a tree H tall whose top leans by (lx, ly). */
  const bend = (z, H, lx, ly) => { const k = Math.pow(clamp(z / H, 0, 1), 1.6); return [lx * k, ly * k]; };
  const seg = (a, b, t0, t1) => `M${f(lerp(a[0], b[0], t0))} ${f(lerp(a[1], b[1], t0))}L${f(lerp(a[0], b[0], t1))} ${f(lerp(a[1], b[1], t1))}`;

  // ---- the kinds ---------------------------------------------------------------------------
  /** A conifer: tiers of scalloped skirts whose tips droop, a ridge and two branch strokes on each. */
  function conifer(x, y, rnd, size, columnar) {
    const n = columnar ? 6 + Math.floor(rnd() * 2) : 4 + Math.floor(rnd() * 2);
    const H = (columnar ? 140 + rnd() * 60 : 115 + rnd() * 70) * size, R = (columnar ? 19 + rnd() * 6 : 30 + rnd() * 14) * size;
    const stem = (columnar ? 9 : 12) * size + rnd() * 5, ph = rnd() * TAU, waves = columnar ? 11 + Math.floor(rnd() * 3) : 8 + Math.floor(rnd() * 4);
    const g = mk('g'), bole = mk('path', { class: 'sil' }, g);
    const tiers = Array.from({ length: n }, () => ({ sil: mk('path', { class: 'sil' }, g), lines: mk('path', { class: 'nf lo' }, g) }));
    return {
      g, x, y, r: R, h: H, low: false,
      draw(s, lx, ly) {
        const h = H * s, r = R * (.3 + .7 * s), st = stem * s, cH = Math.max(.1, h - st);
        const tz = st + cH * .08, ot = bend(tz, H, lx, ly);
        set(bole, trunk(P(x, y, 0), P(x + ot[0], y + ot[1], tz), 2.6 * size * (.5 + .5 * s)));
        tiers.forEach((T, k) => {
          const zb = st + cH * (k / n) * .8, zt = k === n - 1 ? h : zb + cH * (columnar ? .3 : .44);
          const rr = r * (1 - .78 * k / n), ob = bend(zb, H, lx, ly), oa = bend(zt, H, lx, ly);
          const hem = [];
          for (let i = 0; i < 34; i++) {
            const a = i / 34 * TAU, wave = Math.sin(waves * a + ph + k * 1.7), m = rr * (1 + .1 * wave);
            hem.push(P(x + ob[0] + Math.cos(a) * m, y + ob[1] + Math.sin(a) * m, zb - Math.max(0, wave) * rr * .13));
          }
          const apex = P(x + oa[0], y + oa[1], zt), chain = frontChain(hem);
          set(T.sil, poly([apex, ...chain]));
          // a ridge toward the nearest tip, and two branches toward tips either side of it
          const near = chain.reduce((p, q) => (q[1] > p[1] ? q : p));
          const left = chain[Math.floor(chain.length * .3)], right = chain[Math.floor(chain.length * .72)];
          set(T.lines, seg(apex, near, .2, .78) + seg(apex, left, .45, .86) + seg(apex, right, .5, .84));
        });
      }
    };
  }
  /** A cloud crown, as a hand draws one: scallops bulging out between points round the crown. */
  function cloud(c, R, k, ph, tall = 1) {
    const pts = Array.from({ length: k }, (_, i) => {
      const a = i / k * TAU + ph, rr = R * (.84 + .16 * Math.sin(i * 2.3 + ph * 3));
      return [c[0] + Math.cos(a) * rr, c[1] + Math.sin(a) * rr * .92 * tall];
    });
    let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
    for (let i = 0; i < k; i++) {
      const a = pts[i], b = pts[(i + 1) % k], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      const ox = mx - c[0], oy = my - c[1], l = Math.hypot(ox, oy) || 1, bulge = Math.hypot(b[0] - a[0], b[1] - a[1]) * .42;
      d += `Q${f(mx + ox / l * bulge)} ${f(my + oy / l * bulge)} ${f(b[0])} ${f(b[1])}`;
    }
    return d + 'Z';
  }
  /** A few small scallops inside a crown, low on the side away from the light. */
  function folds(c, R, ph, n = 3, tall = 1) {
    let d = '';
    for (let i = 0; i < n; i++) {
      const a = .1 * Math.PI + i * .24 * Math.PI + Math.sin(ph + i) * .08, r = R * (.5 + (i % 2) * .16);
      const p = [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r * tall], w = R * .2;
      const a0 = [p[0] - w * Math.sin(a), p[1] + w * Math.cos(a) * .6], a1 = [p[0] + w * Math.sin(a), p[1] - w * Math.cos(a) * .6];
      d += `M${f(a0[0])} ${f(a0[1])}Q${f(p[0] + Math.cos(a) * w * .7)} ${f(p[1] + Math.sin(a) * w * .7)} ${f(a1[0])} ${f(a1[1])}`;
    }
    return d;
  }
  /** A broadleaf tree: a trunk forking under a cloud crown, a smaller cloud behind it for depth. */
  function oak(x, y, rnd, size) {
    const T = (48 + rnd() * 22) * size, R = (30 + rnd() * 12) * size, lean = (rnd() - .5) * 6, k = 9 + Math.floor(rnd() * 3), ph = rnd() * TAU, ph2 = rnd() * TAU;
    const H = T + R * 1.6;
    const g = mk('g'), bole = mk('path', { class: 'sil' }, g), boughs = mk('path', { class: 'nf sil' }, g);
    const back = mk('path', { class: 'sil' }, g), crownEl = mk('path', { class: 'sil' }, g), fold = mk('path', { class: 'nf lo' }, g);
    return {
      g, x, y, r: R, h: H, low: false,
      draw(s, lx, ly) {
        const t = T * s, r = R * (.25 + .75 * s), cz = t + r * .7;
        const ot = bend(t, H, lx + lean, ly - lean), foot = P(x, y, 0), top = P(x + ot[0], y + ot[1], t);
        set(bole, trunk(foot, top, 3.6 * size * (.5 + .5 * s)));
        const fork = [lerp(foot[0], top[0], .62), lerp(foot[1], top[1], .62)];
        set(boughs, `M${f(fork[0])} ${f(fork[1])}L${f(fork[0] - r * .42)} ${f(fork[1] - r * .55)}M${f(fork[0])} ${f(fork[1])}L${f(fork[0] + r * .36)} ${f(fork[1] - r * .6)}`);
        const oc = bend(cz, H, lx + lean, ly - lean), c = P(x + oc[0], y + oc[1], cz);
        const ob = bend(cz + r * .35, H, lx + lean, ly - lean), cb = P(x + ob[0] - r * .32, y + ob[1] - r * .32, cz + r * .35);
        set(back, cloud(cb, r * .62, 7, ph2));
        set(crownEl, cloud(c, r, k, ph));
        set(fold, folds(c, r, ph, 3));
      }
    };
  }
  /** A birch: a slender trunk with bark ticks under a tall, loose crown and a low side cloud. */
  function birch(x, y, rnd, size) {
    const H = (120 + rnd() * 45) * size, side = rnd() < .5 ? -1 : 1, ph = rnd() * TAU, ph2 = rnd() * TAU;
    const ticks = Array.from({ length: 6 }, () => [.06 + rnd() * .42, rnd() < .5 ? -1 : 1]);
    const g = mk('g'), bole = mk('path', { class: 'sil' }, g), bark = mk('path', { class: 'nf' }, g);
    const side_ = mk('path', { class: 'sil' }, g), crownEl = mk('path', { class: 'sil' }, g), fold = mk('path', { class: 'nf lo' }, g);
    return {
      g, x, y, r: 16 * size, h: H, low: false,
      draw(s, lx, ly) {
        const h = H * s, ot = bend(h * .9, H, lx, ly), foot = P(x, y, 0), top = P(x + ot[0], y + ot[1], h * .9), w = 2.1 * size * (.5 + .5 * s);
        set(bole, trunk(foot, top, w));
        let d = '';
        ticks.forEach(([t, sgn]) => { const q = [lerp(foot[0], top[0], t), lerp(foot[1], top[1], t)]; d += `M${f(q[0] - w * .9 * sgn)} ${f(q[1])}L${f(q[0] + w * .2 * sgn)} ${f(q[1] - 1.2)}`; });
        set(bark, d);
        // a tall, loose crown over most of the upper trunk, a smaller cloud low on one side
        const r = 20 * size * (.3 + .7 * s);
        const zs = h * .5, os = bend(zs, H, lx, ly), cs = P(x + os[0] + side * 10 * size, y + os[1] - side * 10 * size, zs);
        set(side_, cloud(cs, r * .58, 7, ph2));
        const zc = h * .7, oc = bend(zc, H, lx, ly), c = P(x + oc[0], y + oc[1], zc);
        set(crownEl, cloud(c, r, 10, ph, 1.6));
        set(fold, folds(c, r, ph, 3, 1.6));
      }
    };
  }
  function bush(x, y, rnd, size) {
    const R = (12 + rnd() * 5) * size, ph = rnd() * TAU, ph2 = rnd() * TAU, dx = (rnd() - .5) * 8 * size;
    const g = mk('g'), back = mk('path', { class: 'sil' }, g), body = mk('path', { class: 'sil' }, g), fold = mk('path', { class: 'nf lo' }, g);
    return {
      g, x, y, r: R * 1.2, h: R * 1.6, low: true,
      draw(s, lx, ly) {
        const r = R * (.2 + .8 * s);
        set(back, cloud(P(x + dx - r * .55 + lx * .2, y - dx - r * .55 + ly * .2, r * .75), r * .66, 6, ph2));
        const c = P(x + lx * .25, y + ly * .25, r * .55);
        set(body, cloud(c, r, 8, ph, .78));
        set(fold, folds(c, r, ph, 2, .78));
      }
    };
  }
  function rock(x, y, rnd, size) {
    const n = 6, rr = (7 + rnd() * 6) * size, h = (5 + rnd() * 5) * size;
    const pts = Array.from({ length: n }, (_, i) => { const a = i / n * TAU + rnd() * .5, m = rr * (.78 + rnd() * .42); return [x + Math.cos(a) * m, y + Math.sin(a) * m]; });
    const foot = fillet(pts, pts.map(() => 2.2 + rnd() * 1.4), 4);
    const cx = foot.reduce((s, p) => s + p[0], 0) / foot.length, cy = foot.reduce((s, p) => s + p[1], 0) / foot.length;
    const sample = (scale, dx, dy) => foot.map(([px, py]) => { const ux = px - cx, uy = py - cy, l = Math.hypot(ux, uy) || 1; return { u: cx + ux * scale + dx, v: cy + uy * scale + dy, nu: ux / l, nv: uy / l }; });
    const base = sample(1, 0, 0), topRing = sample(.72, rnd() * 2 - 1, rnd() * 2 - 1);
    const g = mk('g'), sil = mk('path', { class: 'sil' }, g), crease = mk('path', { class: 'nf lo' }, g);
    return {
      g, x, y, r: rr, h, low: true,
      draw(s) {
        const z = h * s;
        set(sil, poly(hull(ringAt(P, base, 0).concat(ringAt(P, topRing, z)))));
        set(crease, open(ringAt(P, run(topRing, front), z)));
      }
    };
  }
  function log(x, y, rnd) {
    const a = rnd() * TAU, L = 34 + rnd() * 14, R = 5 + rnd() * 1.5, ax = Math.cos(a), ay = Math.sin(a), nx = -ay, ny = ax;
    const cap = (sgn, r) => Array.from({ length: 30 }, (_, i) => { const t = i / 30 * TAU, c = Math.cos(t) * r, sn = Math.sin(t) * r; return P(x + ax * L / 2 * sgn + nx * c, y + ay * L / 2 * sgn + ny * c, R + sn); });
    const g = mk('g'), body = mk('path', { class: 'sil' }, g), face = mk('path', { class: 'nf sil' }, g), growth = mk('path', { class: 'nf lo' }, g), bark = mk('path', { class: 'nf lo' }, g);
    return {
      g, x, y, r: L / 2, h: R * 2, low: true,
      draw(s) {
        const near = facing(ax, ay) ? 1 : -1, r = R * (.4 + .6 * s);
        set(body, poly(hull(cap(1, r).concat(cap(-1, r)))));
        set(face, poly(cap(near, r)));
        // the cut end shows its growth rings
        set(growth, poly(cap(near, r * .66)) + poly(cap(near, r * .34)));
        set(bark, open([P(x - ax * L * .34, y - ay * L * .34, R * 1.6), P(x + ax * L * .2, y + ay * L * .2, R * 1.64)]) + open([P(x - ax * L * .1, y - ay * L * .1, R * 1.25), P(x + ax * L * .36, y + ay * L * .36, R * 1.3)]));
      }
    };
  }
  function mushroom(x, y, rnd) {
    const h = 4 + rnd() * 2.4, rc = 3 + rnd() * 1.6;
    const g = mk('g'), stalk = mk('path', { class: 'sil' }, g), cap = mk('path', { class: 'sil' }, g), spot = mk('path', { class: 'dot off' }, g);
    return {
      g, x, y, r: 4, h: h + rc, low: true,
      draw(s) {
        const z = h * s, foot = P(x, y, 0), top = P(x, y, z), r = rc * (.2 + .8 * s);
        set(stalk, trunk(foot, top, .9));
        const rim = frontChain(disc(x, y, z, r, 18));
        const dome = arc(top, r, Math.PI, TAU, 12).map(([px, py]) => [px, top[1] - (top[1] - py) * 1.2]);
        set(cap, poly([...dome, ...rim.slice().reverse()]));
        set(spot, poly(arc([top[0] - r * .28, top[1] - r * .6], .7, 0, TAU, 8)));
      }
    };
  }

  // ---- placement -----------------------------------------------------------------------------
  let items = [], grass = null, pebbles = null, stream = null;
  function nearestOnRoute(route, x, y) {
    let best = Infinity;
    for (let i = 0; i < route.pts.length; i += 2) { const p = route.pts[i]; best = Math.min(best, Math.hypot(p[0] - x, p[1] - y)); }
    return best;
  }
  function build({ route, pointAt, marks, plinth, toScreen, W, H, blocked, clear = [], budget, seed }) {
    water.replaceChildren(); ground.replaceChildren();
    items = [];
    const rnd = mulberry(seed), sc = toScreen.scale;
    const screenRoute = route.pts.filter((_, i) => i % 2 === 0 && route.s[i] >= route.exit * .5).map(p => toScreen(p[0], p[1], 0));
    const pxToRoute = (sx0, sy0, sx1, sy1) => {
      let best = Infinity;
      for (const [px, py] of screenRoute) best = Math.min(best, Math.hypot(Math.max(sx0 - px, 0, px - sx1), Math.max(sy0 - py, 0, py - sy1)));
      return best;
    };
    const inside = (sx, sy, r) => sx > r.l && sx < r.r && sy > r.t && sy < r.b;
    const onView = ([sx, sy], m = 0) => sx > -60 - m && sx < W + 60 + m && sy > -120 - m && sy < H + 200 + m;

    // The stream crosses the trail between the second and third stops, on a plank bridge.
    const sMid = (route.stops[1] + route.stops[2]) / 2, mid = pointAt(sMid);
    const tx = Math.cos(mid.h), ty = Math.sin(mid.h), nx = -ty, ny = tx;
    const centre = [];
    for (let u = -1300; u <= 1300; u += 8) {
      const calm = smooth(clamp((Math.abs(u) - 26) / 140, 0, 1));
      const meander = calm * (Math.sin(u * .0085 + 1.3) * 52 + Math.sin(u * .023 + .4) * 14);
      centre.push([mid.x + nx * u + tx * meander, mid.y + ny * u + ty * meander]);
    }
    const normalAt = i => { const a = centre[Math.max(0, i - 1)], b = centre[Math.min(centre.length - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [-(b[1] - a[1]) / l, (b[0] - a[0]) / l]; };
    const width = i => 10 + Math.sin(i * .17) * 2.4 + Math.sin(i * .061 + 2) * 2.2;
    const bank = side => centre.map((p, i) => { const [qx, qy] = normalAt(i), w = width(i) + Math.sin(i * .9 + side) * .7; return [p[0] + qx * w * side, p[1] + qy * w * side]; });
    const bankA = bank(1), bankB = bank(-1);
    const streamG = mk('g', {}, water);
    mk('path', { class: 'fo', d: poly([...bankA, ...bankB.slice().reverse()].map(([x, y]) => P(x, y, 0))) }, streamG);
    mk('path', { class: 'nf sil', d: open(bankA.map(([x, y]) => P(x, y, 0))) }, streamG);
    mk('path', { class: 'nf sil', d: open(bankB.map(([x, y]) => P(x, y, 0))) }, streamG);
    // ripples: short strokes riding the current, and a few stones breaking it
    let ripples = '';
    for (let i = 4; i < centre.length - 4; i += 2 + Math.floor(rnd() * 3)) {
      const [qx, qy] = normalAt(i), off = (rnd() - .5) * width(i) * 1.1, len = 2 + Math.floor(rnd() * 2);
      const pts = [];
      for (let j = 0; j <= len; j++) { const c = centre[i + j], [rx, ry] = normalAt(i + j), bow = Math.sin(j / len * Math.PI) * .9; pts.push(P(c[0] + rx * (off + bow), c[1] + ry * (off + bow), 0)); }
      ripples += open(pts);
      if (rnd() < .05) { const c = centre[i]; mk('path', { class: 'sil', d: poly(disc(c[0] + qx * off * .6, c[1] + qy * off * .6, .6, 1.6 + rnd() * 1.4, 12)) }, streamG); }
    }
    mk('path', { class: 'nf lo', d: ripples }, streamG);
    const distStream = (x, y) => { let b = Infinity; for (let i = 0; i < centre.length; i += 2) b = Math.min(b, Math.hypot(centre[i][0] - x, centre[i][1] - y)); return b; };

    // The bridge: planks across the water along the trail, a rail on each side.
    const local = (a, b) => [mid.x + tx * a + nx * b, mid.y + ty * a + ny * b];
    const xfRing = ring => ring.map(q => { const [wx, wy] = local(q.u, q.v); return { u: wx, v: wy, nu: q.nu * tx + q.nv * nx, nv: q.nu * ty + q.nv * ny }; });
    const deck = mk('g', {}, ground), farRail = mk('g', {}, ground);
    const nearSide = (nx + ny) > 0 ? 1 : -1;
    const rail = (side, parent) => {
      [-14.5, 0, 14.5].forEach(a => {
        const [r0, r1] = rings(a - 1, side * 31.5 - 1, a + 1, side * 31.5 + 1, .4, .2), pr = prism(P, front, xfRing(r0), xfRing(r1), 0, 10);
        mk('path', { class: 'sil', d: pr.sil }, parent);
        mk('path', { class: 'nf lo', d: pr.crease }, parent);
      });
      const top = [-14.5, 14.5].map(a => { const [wx, wy] = local(a, side * 31.5); return [P(wx, wy, 10), P(wx, wy, 6)]; });
      mk('path', { class: 'nf sil', d: open([top[0][0], top[1][0]]) }, parent);
      mk('path', { class: 'nf lo', d: open([top[0][1], top[1][1]]) }, parent);
    };
    rail(-nearSide, farRail);
    for (let k = 0; k < 9; k++) {
      const a0 = -14 + k * 3.15, [r0, r1] = rings(a0, -30.5, a0 + 2.55, 30.5, .5, .3);
      const pr = prism(P, front, xfRing(r0), xfRing(r1), 1.4, 2.7);
      mk('path', { class: 'sil', d: pr.sil }, deck);
      mk('path', { class: 'nf lo', d: pr.crease }, deck);
    }
    const nearRail = mk('g');
    rail(nearSide, nearRail);
    const [bxN, byN] = local(0, nearSide * 31.5);
    items.push({ g: nearRail, x: bxN, y: byN, depth: bxN + byN + .5, still: true });
    stream = { g: streamG, deck, farRail, nearRail };

    // Everything standing is checked the same way: off the trail and the bridge, out of the
    // water and the studio, clear of the markers, never over the rover's way or the heading.
    const placed = [];
    const fits = (it, { gap = .95, under = .45 } = {}) => {
      const dR = nearestOnRoute(route, it.x, it.y);
      if (dR < it.r + (it.low ? 18 : 44)) return false;
      if (Math.hypot(it.x, it.y) < plinth + 30 + it.r) return false;
      if (marks.some(m => Math.hypot(m[0] - it.x, m[1] - it.y) < 26 + it.r * .4)) return false;
      const bx = it.x - mid.x, by = it.y - mid.y;
      if (Math.abs(bx * tx + by * ty) < 34 + it.r && Math.abs(bx * nx + by * ny) < 56 + it.r) return false;
      if (distStream(it.x, it.y) < it.r * .65 + 14) return false;
      if (placed.some(o => Math.hypot(o.x - it.x, o.y - it.y) < (o.r + it.r) * (it.low || o.low ? .7 : gap))) return false;
      const foot = toScreen(it.x, it.y, 0), half = it.r * sc * 1.08, tall = it.h * sc * .88;
      if (!onView(foot, it.h * sc)) return false;
      const box = [foot[0] - half, foot[1] - tall, foot[0] + half, foot[1] + it.r * sc * .5];
      if (pxToRoute(...box) < (it.low ? 12 : 34) * sc) return false;
      if (clear.some(c => !(box[2] < c.l || box[0] > c.r || box[3] < c.t || box[1] > c.b))) return false;
      if (blocked.some(r => inside(foot[0], foot[1] - tall * .4, r)) && rnd() > under) return false;
      return true;
    };
    const plant = (it, start) => {
      it.depth = it.x + it.y;
      it.start = start ?? (.18 + .5 * clamp(Math.hypot(it.x, it.y) / 1300, 0, 1) + rnd() * .08);
      it.sx = spring(0, { k: 46, c: 5.5, eps: .02 }); it.sy = spring(0, { k: 46, c: 5.5, eps: .02 });
      it.awake = false; it.drawn = '';
      it.g.style.display = 'none';
      placed.push(it); items.push(it);
    };
    let trees = 0;
    const kinds = { pine: (x, y, s) => conifer(x, y, rnd, s, false), spruce: (x, y, s) => conifer(x, y, rnd, s, true), oak: (x, y, s) => oak(x, y, rnd, s), birch: (x, y, s) => birch(x, y, rnd, s) };
    const pick = weights => { let r = rnd() * weights.reduce((s, [, w]) => s + w, 0); for (const [k, w] of weights) { if ((r -= w) <= 0) return k; } return weights[0][0]; };

    // Groves: tight clumps whose crowns overlap, each with its own character.
    const corners = [[-120, -160], [W + 120, -160], [-120, H + 240], [W + 120, H + 240]].map(([sx, sy]) => toScreen.inverse(sx, sy));
    const X0 = Math.min(...corners.map(c => c[0])), X1 = Math.max(...corners.map(c => c[0])), Y0 = Math.min(...corners.map(c => c[1])), Y1 = Math.max(...corners.map(c => c[1]));
    const centres = [];
    for (let gx = X0; gx < X1; gx += 190) for (let gy = Y0; gy < Y1; gy += 190) centres.push([gx + rnd() * 190, gy + rnd() * 190]);
    for (let i = centres.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [centres[i], centres[j]] = [centres[j], centres[i]]; }
    const characters = [
      [['pine', 6], ['spruce', 3], ['birch', 1]],
      [['oak', 6], ['birch', 2], ['pine', 1]],
      [['spruce', 5], ['pine', 3]],
      [['birch', 5], ['oak', 2], ['pine', 1]],
      [['pine', 3], ['oak', 3], ['spruce', 2], ['birch', 2]]
    ];
    for (const [cx, cy] of centres) {
      if (trees >= budget * .82) break;
      if (!onView(toScreen(cx, cy, 0), 40) || nearestOnRoute(route, cx, cy) < 110 || Math.hypot(cx, cy) < plinth + 140) continue;
      const character = characters[Math.floor(rnd() * characters.length)], radius = 85 + rnd() * 70, members = 6 + Math.floor(rnd() * 6);
      for (let m = 0, tries = 0; m < members && tries < members * 6 && trees < budget * .82; tries++) {
        const a = rnd() * TAU, d = Math.sqrt(rnd()) * radius, x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
        const it = kinds[pick(character)](x, y, .78 + rnd() * .42);
        if (!fits(it, { gap: .5, under: .55 })) continue;
        plant(it); trees++; m++;
        if (it.r > 25 && rnd() < .14) mushrooms(it);
      }
    }
    // Lone trees in the clearings between the groves.
    for (let i = 0; i < 400 && trees < budget; i++) {
      const x = lerp(X0, X1, rnd()), y = lerp(Y0, Y1, rnd());
      const it = kinds[pick([['pine', 4], ['oak', 3], ['birch', 2], ['spruce', 1]])](x, y, .8 + rnd() * .35);
      if (!fits(it, { gap: .9, under: .4 })) continue;
      plant(it); trees++;
    }
    function mushrooms(tree) {
      const k = 2 + Math.floor(rnd() * 2);
      for (let m = 0; m < k; m++) {
        const a = rnd() * TAU, d = tree.r * .5 + 6 + rnd() * 6, sh = mushroom(tree.x + Math.cos(a) * d, tree.y + Math.sin(a) * d, rnd);
        if (fits(sh)) plant(sh, tree.start + .08);
      }
    }
    // The path's own edges: low growth, stones and young birches, now one side, now the other.
    for (let s = route.exit + 40; s < route.len - 10; s += 22 + rnd() * 26) {
      const p = pointAt(s), side = rnd() < .5 ? -1 : 1, off = 46 + rnd() * 34;
      const x = p.x - Math.sin(p.h) * off * side, y = p.y + Math.cos(p.h) * off * side, roll = rnd();
      const it = roll < .48 ? bush(x, y, rnd, .8 + rnd() * .4) : roll < .72 ? rock(x, y, rnd, .8 + rnd() * .5) : roll < .86 ? birch(x, y, rnd, .7 + rnd() * .2) : mushroom(x, y, rnd);
      if (fits(it)) plant(it);
    }
    // Fallen logs beside the path.
    for (let n = 0, tries = 0; n < 3 && tries < 300; tries++) {
      const s = route.exit + rnd() * (route.len - route.exit), p = pointAt(s), side = rnd() < .5 ? -1 : 1, off = 60 + rnd() * 50;
      const lg = log(p.x - Math.sin(p.h) * off * side, p.y + Math.cos(p.h) * off * side, rnd);
      if (fits(lg)) { plant(lg); n++; }
    }

    // Grass in clumps along the path, round the groves' feet and as reeds on the banks; pebbles
    // at the path's edges. One path each, redrawn only while they grow.
    const tufts = [];
    const tuft = (x, y, tall) => {
      if (Math.hypot(x, y) < plinth + 20 || nearestOnRoute(route, x, y) < 12 || !onView(toScreen(x, y, 0))) return;
      const blades = 3 + Math.floor(rnd() * 3);
      tufts.push({ x, y, start: .25 + .5 * clamp(Math.hypot(x, y) / 1300, 0, 1), blades: Array.from({ length: blades }, () => [(rnd() - .5) * 6, (rnd() - .5) * 6, (tall ? 11 : 6) + rnd() * (tall ? 8 : 6)]) });
    };
    for (let i = 0; i < budget * 1.4; i++) {
      const s = route.exit + 10 + rnd() * (route.len - route.exit - 10), p = pointAt(s), side = rnd() < .5 ? -1 : 1, off = 14 + rnd() * 50;
      const x = p.x - Math.sin(p.h) * off * side, y = p.y + Math.cos(p.h) * off * side;
      for (let k = 0; k < 2; k++) tuft(x + (rnd() - .5) * 10, y + (rnd() - .5) * 10, false);
    }
    for (let i = 0; i < budget * .9; i++) {
      const j = Math.floor(rnd() * centre.length), [qx, qy] = normalAt(j), side = rnd() < .5 ? -1 : 1, off = side * (width(j) + 2 + rnd() * 5);
      tuft(centre[j][0] + qx * off, centre[j][1] + qy * off, true);
    }
    items.filter(it => !it.low && !it.still && rnd() < .5).forEach(it => { for (let k = 0; k < 3; k++) { const a = rnd() * TAU, d = it.r * .6 + rnd() * 12; tuft(it.x + Math.cos(a) * d, it.y + Math.sin(a) * d, false); } });
    grass = { el: mk('path', { class: 'nf' }, ground), tufts, drawn: '' };
    const stones = [];
    for (let s = route.exit + 6; s < route.len; s += 6) {
      if (rnd() < .7) continue;
      const p = pointAt(s), side = rnd() < .5 ? -1 : 1, off = 6.4 + rnd() * 3;
      stones.push({ s, x: p.x - Math.sin(p.h) * off * side, y: p.y + Math.cos(p.h) * off * side, r: 1 + rnd() * 1.1 });
    }
    pebbles = { el: mk('path', { class: 'nf lo' }, ground), stones, drawn: -1 };
    return items;
  }

  // ---- motion --------------------------------------------------------------------------------
  /** Draws what changed; returns whether anything is still moving. */
  function update({ phi, pointer, rover, moved, shown, reduced, dt }) {
    let busy = false;
    const show = smooth(clamp((phi - .38) / .35, 0, 1));
    if (stream) [stream.g, stream.deck, stream.farRail, stream.nearRail].forEach(g => { const v = show.toFixed(3); if (g.style.opacity !== v) g.style.opacity = v; });
    for (const it of items) {
      if (it.still) continue;
      const s = reduced ? 0 : smooth(clamp((phi - it.start) / .3, 0, 1));
      if (s <= .001) { if (it.g.style.display !== 'none') it.g.style.display = 'none'; continue; }
      if (it.g.style.display === 'none') it.g.style.display = '';
      if (!it.low) {
        // a breeze from the pointer, and a stir as the rover goes by
        let tx = 0, ty = 0;
        if (pointer) {
          const dx = it.x - pointer[0], dy = it.y - pointer[1], d = Math.hypot(dx, dy);
          if (d < 150) { const k = Math.pow(1 - d / 150, 2) * 14; tx = dx / (d || 1) * k; ty = dy / (d || 1) * k; }
        }
        if (rover && Math.abs(moved) > .02) {
          const dx = it.x - rover[0], dy = it.y - rover[1], d = Math.hypot(dx, dy);
          if (d < 110) { const kick = clamp(Math.abs(moved), 0, 3) * 6 * (1 - d / 110); it.sx.v += dx / (d || 1) * kick; it.sy.v += dy / (d || 1) * kick; it.awake = true; }
        }
        if (it.sx.t !== tx || it.sy.t !== ty) { it.sx.t = tx; it.sy.t = ty; it.awake = true; }
        if (it.awake && !reduced) {
          const a = stepS(it.sx, dt), b = stepS(it.sy, dt);
          it.awake = a || b;
          if (it.awake) busy = true;
        }
      }
      const key = `${s.toFixed(3)} ${it.sx.x.toFixed(2)} ${it.sy.x.toFixed(2)}`;
      if (key !== it.drawn) { it.drawn = key; it.draw(s, it.sx.x, it.sy.x); }
      if (s < 1) busy = true;
    }
    if (grass) {
      // the grass is grown by the journey; past that it stays as drawn
      const g = reduced ? 0 : Math.min(phi, 1.1), key = g.toFixed(3);
      if (key !== grass.drawn) {
        grass.drawn = key;
        let d = '';
        for (const t of grass.tufts) {
          const s = smooth(clamp((g - t.start) / .28, 0, 1));
          if (s <= .01) continue;
          const foot = P(t.x, t.y, 0);
          for (const [bx, by, bh] of t.blades) {
            const tip = P(t.x + bx, t.y + by, bh * s), ctl = P(t.x + bx * .25, t.y + by * .25, bh * s * .62);
            d += `M${f(foot[0])} ${f(foot[1])}Q${f(ctl[0])} ${f(ctl[1])} ${f(tip[0])} ${f(tip[1])}`;
          }
        }
        set(grass.el, d);
      }
    }
    if (pebbles) {
      const upto = reduced ? 0 : shown;
      if (Math.abs(upto - pebbles.drawn) > 2 || (upto === 0) !== (pebbles.drawn === 0)) {
        pebbles.drawn = upto;
        let d = '';
        for (const p of pebbles.stones) if (p.s <= upto) d += poly(disc(p.x, p.y, 0, p.r, 9));
        set(pebbles.el, d);
      }
    }
    return busy;
  }

  return { build, update, get items() { return items; } };
};
