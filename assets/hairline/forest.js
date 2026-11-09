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
      g, x, y, r: R, h: H, low: false, sway: true,
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
      g, x, y, r: R, h: H, low: false, sway: true,
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
      g, x, y, r: 16 * size, h: H, low: false, sway: true,
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
      g, x, y, r: R * 1.2, h: R * 1.6, low: true, sway: true,
      draw(s, lx, ly) {
        const r = R * (.2 + .8 * s);
        set(back, cloud(P(x + dx - r * .55 + lx * .4, y - dx - r * .55 + ly * .4, r * .75), r * .66, 6, ph2));
        const c = P(x + lx * .5, y + ly * .5, r * .55);
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
  let items = [], grass = null, grassAt = -1, pebbles = null, stream = null;
  // The growth the items were last sized for: while it holds, their size and visibility hold too.
  let grownPhi = NaN, grownReduced = null;
  const BLADE = { k: 90, c: 6, eps: .03 };
  function nearestOnRoute(route, x, y) {
    let best = Infinity;
    for (let i = 0; i < route.pts.length; i += 2) { const p = route.pts[i]; best = Math.min(best, Math.hypot(p[0] - x, p[1] - y)); }
    return best;
  }
  function build({ route, pointAt, marks, plinth, toScreen, W, H, blocked, clear = [], budget, seed }) {
    water.replaceChildren(); ground.replaceChildren();
    items = [];
    grownPhi = NaN;
    const rnd = mulberry(seed), sc = toScreen.scale;
    const screenRoute = route.pts.filter((_, i) => i % 2 === 0 && route.s[i] >= route.exit * .5).map(p => toScreen(p[0], p[1], 0));
    const pxToRoute = (sx0, sy0, sx1, sy1) => {
      let best = Infinity;
      for (const [px, py] of screenRoute) best = Math.min(best, Math.hypot(Math.max(sx0 - px, 0, px - sx1), Math.max(sy0 - py, 0, py - sy1)));
      return best;
    };
    const inside = (sx, sy, r) => sx > r.l && sx < r.r && sy > r.t && sy < r.b;
    // On view when some of it shows: a foot below the top edge, a top above the bottom edge.
    const onView = ([sx, sy], h = 0, r = 0) => sx > -40 - r && sx < W + 40 + r && sy > -40 && sy - h < H + 40;
    // A ground point under a random spot on the screen, so the open ground fills the frame evenly.
    const onScreen = () => toScreen.inverse(lerp(-40, W + 40, rnd()), lerp(-20, H + 100, rnd()));

    // The river crosses the trail between the second and third stops, on a wide plank bridge.
    const sMid = (route.stops[1] + route.stops[2]) / 2, mid = pointAt(sMid);
    const tx = Math.cos(mid.h), ty = Math.sin(mid.h), nx = -ty, ny = tx;
    // the river's half-width, as wide as the stops either side allow; the deck's half-length
    // along the trail and half-width across it
    const RW = clamp((route.stops[2] - route.stops[1]) * .26, 20, 46), DL = RW + 14, DW = 44;
    const centre = [], calmAt = [];
    for (let u = -1300; u <= 1300; u += 8) {
      const calm = smooth(clamp((Math.abs(u) - DW - 30) / 170, 0, 1));
      const meander = calm * (Math.sin(u * .0085 + 1.3) * 70 + Math.sin(u * .023 + .4) * 18);
      centre.push([mid.x + nx * u + tx * meander, mid.y + ny * u + ty * meander]);
      calmAt.push(calm);
    }
    const normalAt = i => { const a = centre[Math.max(0, i - 1)], b = centre[Math.min(centre.length - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [-(b[1] - a[1]) / l, (b[0] - a[0]) / l]; };
    const width = i => RW * (1 + calmAt[i] * (.16 * Math.sin(i * .17) + .12 * Math.sin(i * .061 + 2)));
    const along = (side, k, jitter) => centre.map((p, i) => { const [qx, qy] = normalAt(i), w = width(i) * k + Math.sin(i * .9 + side) * jitter; return [p[0] + qx * w * side, p[1] + qy * w * side]; });
    const bankA = along(1, 1, 1.2), bankB = along(-1, 1, 1.2);
    const streamG = mk('g', {}, water);
    mk('path', { class: 'fo', d: poly([...bankA, ...bankB.slice().reverse()].map(([x, y]) => P(x, y, 0))) }, streamG);
    mk('path', { class: 'nf sil', d: open(bankA.map(([x, y]) => P(x, y, 0))) }, streamG);
    mk('path', { class: 'nf sil', d: open(bankB.map(([x, y]) => P(x, y, 0))) }, streamG);
    // the shallows: a broken second line inside each bank
    let shallows = '';
    [1, -1].forEach(side => {
      let run_ = [];
      along(side, .8, 1.6).forEach(([x, y], i) => {
        if (Math.sin(i * .23 + side * 2) + Math.sin(i * .071) * .5 > -.1) run_.push(P(x, y, 0));
        else { if (run_.length > 1) shallows += open(run_); run_ = []; }
      });
      if (run_.length > 1) shallows += open(run_);
    });
    // the current: short strokes riding it, and stones breaking it
    let ripples = '';
    for (let i = 4; i < centre.length - 6; i += 1 + Math.floor(rnd() * 2)) {
      for (let r = 0, n = 1 + Math.floor(rnd() * 2); r < n; r++) {
        const [qx, qy] = normalAt(i), off = (rnd() - .5) * width(i) * 1.4, len = 2 + Math.floor(rnd() * 3);
        const pts = [];
        for (let j = 0; j <= len; j++) { const c = centre[i + j], [rx, ry] = normalAt(i + j), bow = Math.sin(j / len * Math.PI) * 1.2; pts.push(P(c[0] + rx * (off + bow), c[1] + ry * (off + bow), 0)); }
        ripples += open(pts);
        if (rnd() < .035) { const c = centre[i]; mk('path', { class: 'sil', d: poly(disc(c[0] + qx * off * .8, c[1] + qy * off * .8, .8, 2 + rnd() * 2.6, 12)) }, streamG); }
      }
    }
    mk('path', { class: 'nf lo', d: shallows + ripples }, streamG);
    /** How far a ground point is from the nearer bank; below zero, it is in the water. */
    const distStream = (x, y) => { let b = Infinity; for (let i = 0; i < centre.length; i += 2) b = Math.min(b, Math.hypot(centre[i][0] - x, centre[i][1] - y) - width(i)); return b; };

    // The bridge: two beams across the water, planks laid over them along the trail, and a
    // rail of posts each side; the near rail stands among the trees, a span at a time.
    const local = (a, b) => [mid.x + tx * a + nx * b, mid.y + ty * a + ny * b];
    const xfRing = ring => ring.map(q => { const [wx, wy] = local(q.u, q.v); return { u: wx, v: wy, nu: q.nu * tx + q.nv * nx, nv: q.nu * ty + q.nv * ny }; });
    const deck = mk('g', {}, ground), farRail = mk('g', {}, ground);
    const nearSide = (nx + ny) > 0 ? 1 : -1;
    const block = (a0, b0, a1, b1, z0, z1, parent) => {
      const [r0, r1] = rings(a0, b0, a1, b1, .4, .2), pr = prism(P, front, xfRing(r0), xfRing(r1), z0, z1);
      mk('path', { class: 'sil', d: pr.sil }, parent);
      mk('path', { class: 'nf lo', d: pr.crease }, parent);
    };
    const posts = [], bays = Math.round(DL * 2 / 17);
    for (let k = 0; k <= bays; k++) posts.push(-DL + k * DL * 2 / bays);
    const post = (a, b, parent) => block(a - 1.2, b - 1.2, a + 1.2, b + 1.2, 0, 11, parent);
    const span = (a0, a1, b, parent) => {
      const ends = [a0, a1].map(a => { const [wx, wy] = local(a, b); return [P(wx, wy, 11), P(wx, wy, 6.5)]; });
      mk('path', { class: 'nf sil', d: open([ends[0][0], ends[1][0]]) }, parent);
      mk('path', { class: 'nf lo', d: open([ends[0][1], ends[1][1]]) }, parent);
    };
    const farB = -nearSide * (DW + 1);
    posts.forEach(a => post(a, farB, farRail));
    for (let k = 0; k < bays; k++) span(posts[k], posts[k + 1], farB, farRail);
    [-1, 1].forEach(sd => block(-DL - 5, sd * (DW - 4) - 2, DL + 5, sd * (DW - 4) + 2, 0, 1.4, deck));
    for (let k = 0, n = Math.round(DL * 2 / 5.4); k < n; k++) {
      const pitch = DL * 2 / n, a0 = -DL + k * pitch;
      block(a0, -DW + (rnd() - .5) * 1.6, a0 + pitch * .8, DW + (rnd() - .5) * 1.6, 1.4, 2.7, deck);
    }
    const nearB = nearSide * (DW + 1), spans = [];
    for (let k = 0; k < bays; k++) {
      const g = mk('g');
      post(posts[k], nearB, g);
      if (k === bays - 1) post(posts[k + 1], nearB, g);
      span(posts[k], posts[k + 1], nearB, g);
      const [cx, cy] = local((posts[k] + posts[k + 1]) / 2, nearB);
      items.push({ g, x: cx, y: cy, depth: cx + cy + .5, still: true });
      spans.push(g);
    }
    stream = { parts: [streamG, deck, farRail, ...spans] };

    // Everything standing is checked the same way: off the trail and the bridge, out of the
    // water and the studio, clear of the markers, never over the rover's way or the heading.
    const placed = [];
    const fits = (it, { gap = .95, under = .45 } = {}) => {
      const dR = nearestOnRoute(route, it.x, it.y);
      if (dR < it.r + (it.low ? 18 : 44)) return false;
      if (Math.hypot(it.x, it.y) < plinth + 30 + it.r) return false;
      if (marks.some(m => Math.hypot(m[0] - it.x, m[1] - it.y) < 26 + it.r * .4)) return false;
      const bx = it.x - mid.x, by = it.y - mid.y;
      if (Math.abs(bx * tx + by * ty) < DL + 18 + it.r && Math.abs(bx * nx + by * ny) < DW + 24 + it.r) return false;
      if (distStream(it.x, it.y) < it.r * .65 + 4) return false;
      if (placed.some(o => Math.hypot(o.x - it.x, o.y - it.y) < (o.r + it.r) * (it.low || o.low ? .7 : gap))) return false;
      const foot = toScreen(it.x, it.y, 0), half = it.r * sc * 1.08, tall = it.h * sc * .88;
      if (!onView(foot, it.h * sc, it.r * sc)) return false;
      const box = [foot[0] - half, foot[1] - tall, foot[0] + half, foot[1] + it.r * sc * .5];
      if (pxToRoute(...box) < (it.low ? 12 : 34) * sc) return false;
      if (clear.some(c => !(box[2] < c.l || box[0] > c.r || box[3] < c.t || box[1] > c.b))) return false;
      if (blocked.some(r => inside(foot[0], foot[1] - tall * .4, r)) && rnd() > under) return false;
      return true;
    };
    const plant = (it, start) => {
      it.depth = it.x + it.y;
      it.start = start ?? (.18 + .5 * clamp(Math.hypot(it.x, it.y) / 1300, 0, 1) + rnd() * .08);
      it.sx = spring(0, { k: 60, c: 6, eps: .02 }); it.sy = spring(0, { k: 60, c: 6, eps: .02 });
      it.awake = false; it.drawn = ''; it.grown = ''; it.foot = P(it.x, it.y, 0);
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
    for (let gx = X0; gx < X1; gx += 160) for (let gy = Y0; gy < Y1; gy += 160) centres.push([gx + rnd() * 160, gy + rnd() * 160]);
    for (let i = centres.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [centres[i], centres[j]] = [centres[j], centres[i]]; }
    const characters = [
      [['pine', 6], ['spruce', 3], ['birch', 1]],
      [['oak', 6], ['birch', 2], ['pine', 1]],
      [['spruce', 5], ['pine', 3]],
      [['birch', 5], ['oak', 2], ['pine', 1]],
      [['pine', 3], ['oak', 3], ['spruce', 2], ['birch', 2]],
      [['oak', 4], ['birch', 4]],
      [['oak', 3], ['spruce', 3], ['birch', 1]]
    ];
    const groves = [];
    for (const [cx, cy] of centres) {
      if (trees >= budget * .72) break;
      const [gx, gy] = toScreen(cx, cy, 0);
      if (gx < -100 || gx > W + 100 || gy < -60 || gy > H + 180 || nearestOnRoute(route, cx, cy) < 100 || Math.hypot(cx, cy) < plinth + 130) continue;
      const character = characters[Math.floor(rnd() * characters.length)], radius = 90 + rnd() * 80, members = 9 + Math.floor(rnd() * 8);
      let m = 0;
      for (let tries = 0; m < members && tries < members * 6 && trees < budget * .72; tries++) {
        const a = rnd() * TAU, d = Math.sqrt(rnd()) * radius, x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
        const it = kinds[pick(character)](x, y, .74 + rnd() * .5);
        if (!fits(it, { gap: .5, under: .3 })) continue;
        plant(it); trees++; m++;
        if (it.r > 25 && rnd() < .3) mushrooms(it.x, it.y, it.r * .5 + 6, it.start + .08);
      }
      if (m) groves.push({ cx, cy, radius, character });
    }
    // Each grove's edge: saplings of its own kinds stepping out into the open, and at its feet
    // an understory of bushes, stones and the odd fallen trunk.
    for (const { cx, cy, radius, character } of groves) {
      for (let k = 0, n = 3 + Math.floor(rnd() * 4), tries = 0; k < n && tries < 30 && trees < budget * .86; tries++) {
        const a = rnd() * TAU, d = radius * (.85 + rnd() * .45);
        const it = kinds[pick(character)](cx + Math.cos(a) * d, cy + Math.sin(a) * d, .42 + rnd() * .22);
        if (fits(it, { gap: .6, under: .5 })) { plant(it); trees++; k++; }
      }
      for (let k = 0, n = 3 + Math.floor(rnd() * 4), tries = 0; k < n && tries < 30; tries++) {
        const a = rnd() * TAU, d = radius * (.4 + rnd() * .85), x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d, roll = rnd();
        const it = roll < .55 ? bush(x, y, rnd, .8 + rnd() * .5) : roll < .85 ? rock(x, y, rnd, .7 + rnd() * .6) : roll < .93 ? log(x, y, rnd) : mushroom(x, y, rnd);
        if (fits(it, { under: .4 })) { plant(it); k++; }
      }
    }
    // Lone trees in the clearings between the groves.
    for (let i = 0; i < 600 && trees < budget; i++) {
      const [x, y] = onScreen();
      const it = kinds[pick([['pine', 4], ['oak', 4], ['birch', 3], ['spruce', 1]])](x, y, .62 + rnd() * .5);
      if (!fits(it, { gap: .9, under: .25 })) continue;
      plant(it); trees++;
    }
    function mushrooms(x, y, ring, start) {
      const k = 2 + Math.floor(rnd() * 3);
      for (let m = 0; m < k; m++) {
        const a = rnd() * TAU, d = ring + rnd() * 6, sh = mushroom(x + Math.cos(a) * d, y + Math.sin(a) * d, rnd);
        if (fits(sh)) plant(sh, start);
      }
    }
    // The open ground between: thickets of two or three bushes, and boulders lying together.
    for (let i = 0, n = 0; i < budget * 4 && n < budget * .3; i++) {
      const [cx, cy] = onScreen(), thicket = rnd() < .55, k = 3 + Math.floor(rnd() * 2);
      for (let j = 0; j < k; j++) {
        const a = rnd() * TAU, d = j ? 12 + rnd() * 10 : 0, x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
        const it = thicket ? bush(x, y, rnd, j ? .65 + rnd() * .3 : .9 + rnd() * .4) : rock(x, y, rnd, j ? .5 + rnd() * .4 : 1.2 + rnd() * .6);
        if (fits(it, { under: .3 })) { plant(it); n++; }
      }
    }
    // The path's own edges: low growth, stones and young birches, now one side, now the other.
    for (let s = route.exit + 40; s < route.len - 10; s += 14 + rnd() * 20) {
      const p = pointAt(s), side = rnd() < .5 ? -1 : 1, off = 44 + rnd() * 40;
      const x = p.x - Math.sin(p.h) * off * side, y = p.y + Math.cos(p.h) * off * side, roll = rnd();
      const it = roll < .44 ? bush(x, y, rnd, .8 + rnd() * .4) : roll < .7 ? rock(x, y, rnd, .8 + rnd() * .5) : roll < .86 ? birch(x, y, rnd, .6 + rnd() * .3) : mushroom(x, y, rnd);
      if (fits(it)) plant(it);
    }
    // Fallen logs beside the path, some with mushrooms on the shaded side.
    for (let n = 0, tries = 0; n < 7 && tries < 500; tries++) {
      const s = route.exit + rnd() * (route.len - route.exit), p = pointAt(s), side = rnd() < .5 ? -1 : 1, off = 60 + rnd() * 70;
      const lg = log(p.x - Math.sin(p.h) * off * side, p.y + Math.cos(p.h) * off * side, rnd);
      if (!fits(lg)) continue;
      plant(lg); n++;
      if (rnd() < .6) mushrooms(lg.x, lg.y, 10, lg.start + .08);
    }
    // The stream's banks: stones at the water's edge and bushes leaning over it.
    for (let i = 0, n = 0; i < 300 && n < budget * .12; i++) {
      const j = 8 + Math.floor(rnd() * (centre.length - 16)), [qx, qy] = normalAt(j), side = rnd() < .5 ? -1 : 1, isRock = rnd() < .6;
      const off = side * (width(j) + (isRock ? 8 : 20) + rnd() * 10), x = centre[j][0] + qx * off, y = centre[j][1] + qy * off;
      const it = isRock ? rock(x, y, rnd, .6 + rnd() * .7) : bush(x, y, rnd, .8 + rnd() * .4);
      if (fits(it, { under: .3 })) { plant(it); n++; }
    }

    // Grass in clumps along the path, over the open ground, round the feet of trees, bushes and
    // stones, and as reeds on the banks; pebbles at the path's edges. The grass is kept in
    // patches of one path each, so growing and the wind redraw only the patches they reach.
    const patches = new Map();
    const tuft = (x, y, tall) => {
      if (Math.hypot(x, y) < plinth + 20 || nearestOnRoute(route, x, y) < 12 || distStream(x, y) < 1 || !onView(toScreen(x, y, 0))) return;
      const bx = x - mid.x, by = y - mid.y;
      if (Math.abs(bx * tx + by * ty) < DL + 6 && Math.abs(bx * nx + by * ny) < DW + 6) return;
      const key = `${Math.floor(x / 140)} ${Math.floor(y / 140)}`;
      let patch = patches.get(key);
      if (!patch) patches.set(key, patch = { tufts: [], cx: (Math.floor(x / 140) + .5) * 140, cy: (Math.floor(y / 140) + .5) * 140, lo: 9, hi: -9, awake: false, held: false });
      const start = .25 + .5 * clamp(Math.hypot(x, y) / 1300, 0, 1), n = (tall ? 4 : 3) + Math.floor(rnd() * 4);
      patch.lo = Math.min(patch.lo, start); patch.hi = Math.max(patch.hi, start + .28);
      patch.tufts.push({
        x, y, start, sx: spring(0, BLADE), sy: spring(0, BLADE), awake: false, qx: 0, qy: 0, at: -1, d: '',
        // each blade: its lean at the foot, its height and how freely it bends
        blades: Array.from({ length: n }, () => [(rnd() - .5) * 7, (rnd() - .5) * 7, (tall ? 12 : 6) + rnd() * (tall ? 10 : 7), .6 + rnd() * .8])
      });
    };
    for (let i = 0; i < budget * 1.6; i++) {
      const s = route.exit + 10 + rnd() * (route.len - route.exit - 10), p = pointAt(s), side = rnd() < .5 ? -1 : 1, off = 14 + rnd() * 60;
      const x = p.x - Math.sin(p.h) * off * side, y = p.y + Math.cos(p.h) * off * side;
      for (let k = 0, n = 2 + Math.floor(rnd() * 2); k < n; k++) tuft(x + (rnd() - .5) * 12, y + (rnd() - .5) * 12, false);
    }
    for (let i = 0; i < budget * 1.2; i++) {
      const [x, y] = onScreen();
      for (let k = 0, n = 2 + Math.floor(rnd() * 3); k < n; k++) tuft(x + (rnd() - .5) * 18, y + (rnd() - .5) * 18, false);
    }
    for (let i = 0; i < budget * 1.4; i++) {
      const j = Math.floor(rnd() * centre.length), [qx, qy] = normalAt(j), side = rnd() < .5 ? -1 : 1, off = side * (width(j) + 2 + rnd() * 6);
      tuft(centre[j][0] + qx * off, centre[j][1] + qy * off, true);
    }
    items.filter(it => !it.still && rnd() < .65).forEach(it => { for (let k = 0, n = it.low ? 2 : 4; k < n; k++) { const a = rnd() * TAU, d = it.r * .6 + rnd() * 12; tuft(it.x + Math.cos(a) * d, it.y + Math.sin(a) * d, false); } });
    grass = [...patches.values()];
    grass.forEach(p => { p.el = mk('path', { class: 'nf grass' }, ground); });
    grassAt = -1;
    const stones = [];
    for (let s = route.exit + 6; s < route.len; s += 6) {
      if (rnd() < .7) continue;
      const p = pointAt(s), side = rnd() < .5 ? -1 : 1, off = 6.4 + rnd() * 3, x = p.x - Math.sin(p.h) * off * side, y = p.y + Math.cos(p.h) * off * side;
      if (Math.abs((x - mid.x) * tx + (y - mid.y) * ty) < DL + 4 && Math.abs((x - mid.x) * nx + (y - mid.y) * ny) < DW + 4) continue;
      stones.push({ s, x, y, r: 1 + rnd() * 1.1 });
    }
    pebbles = { el: mk('path', { class: 'nf lo' }, ground), stones, drawn: -1 };
    return items;
  }

  // ---- motion --------------------------------------------------------------------------------
  // The wind follows the pointer: it blows outward from where the pointer rests, and gusts the
  // way the pointer moves, so a sweep across the forest bends it in a wave that springs back.
  const wind = { x: 0, y: 0, vx: 0, vy: 0, on: false };
  function windAt(x, y, R, A, V) {
    const dx = x - wind.x, dy = y - wind.y, d = Math.hypot(dx, dy);
    if (d >= R) return [0, 0];
    const q = 1 - d / R, k = q * q * (3 - 2 * q), sp = Math.hypot(wind.vx, wind.vy), cap = sp > 900 ? 900 / sp : 1;
    return [(dx / (d || 1) * A + wind.vx * cap * V) * k, (dy / (d || 1) * A + wind.vy * cap * V) * k];
  }
  // A tuft's blades, grown to s and leaning by its quantised lean (twentieths of a unit, finer
  // than a pixel).
  function blades(t, s) {
    if (s <= .01) return '';
    const foot = P(t.x, t.y, 0), lx = t.qx / 20, ly = t.qy / 20, fx = f(foot[0]), fy = f(foot[1]);
    let d = '';
    for (const [bx, by, bh, flex] of t.blades) {
      // a taller blade bends further; bent over, its tip comes down
      const h = bh * s, wx = lx * flex * h / 10, wy = ly * flex * h / 10, z = Math.sqrt(Math.max(h * h * .12, h * h - wx * wx - wy * wy));
      const tip = P(t.x + bx + wx, t.y + by + wy, z), ctl = P(t.x + bx * .25 + wx * .25, t.y + by * .25 + wy * .25, z * .62);
      d += `M${fx} ${fy}Q${f(ctl[0])} ${f(ctl[1])} ${f(tip[0])} ${f(tip[1])}`;
    }
    return d;
  }
  // A patch is one path; each tuft keeps its own piece of it, rebuilt only when it grew or leaned.
  function drawPatch(p, g) {
    let d = '';
    for (const t of p.tufts) {
      const s = smooth(clamp((g - t.start) / .28, 0, 1));
      if (t.at !== s || t.dx !== t.qx || t.dy !== t.qy) { t.at = s; t.dx = t.qx; t.dy = t.qy; t.d = blades(t, s); }
      d += t.d;
    }
    set(p.el, d);
  }
  /** Draws what changed; returns whether anything is still moving. */
  function update({ phi, pointer, drift, rover, moved, shown, reduced, dt }) {
    let busy = false;
    const show = smooth(clamp((phi - .38) / .35, 0, 1));
    // Growth follows phi alone: with phi and the motion setting as they were, nothing grows, shows or hides.
    const grow = phi !== grownPhi || reduced !== grownReduced;
    grownPhi = phi; grownReduced = reduced;
    if (stream && grow) stream.parts.forEach(g => { const v = show.toFixed(3); if (g.style.opacity !== v) g.style.opacity = v; });
    // the gust: how fast the pointer sweeps over the ground, smoothed
    const ease = 1 - Math.exp(-dt * 10), step = Math.max(dt, .008);
    wind.vx += ((drift ? drift[0] / step : 0) - wind.vx) * ease;
    wind.vy += ((drift ? drift[1] / step : 0) - wind.vy) * ease;
    if (Math.hypot(wind.vx, wind.vy) < 4) wind.vx = wind.vy = 0;
    wind.on = !!pointer && !reduced;
    if (pointer) { wind.x = pointer[0]; wind.y = pointer[1]; }
    for (const it of items) {
      if (it.still) continue;
      if (grow || it.s === undefined) {
        it.s = reduced ? 0 : smooth(clamp((phi - it.start) / .3, 0, 1));
        if (it.s <= .001) { if (it.g.style.display !== 'none') it.g.style.display = 'none'; continue; }
        if (it.g.style.display === 'none') it.g.style.display = '';
      } else if (it.s <= .001) continue;
      const s = it.s;
      let stepped = !it.drawn;
      if (it.sway) {
        // the wind, and a stir as the rover goes by
        const [tx, ty] = wind.on ? windAt(it.x, it.y, 260, it.low ? 18 : 30, it.low ? .03 : .045) : [0, 0];
        if (rover && Math.abs(moved) > .02) {
          const dx = it.x - rover[0], dy = it.y - rover[1], d = Math.hypot(dx, dy);
          if (d < 110) { const kick = clamp(Math.abs(moved), 0, 3) * 6 * (1 - d / 110); it.sx.v += dx / (d || 1) * kick; it.sy.v += dy / (d || 1) * kick; it.awake = true; }
        }
        if (it.sx.t !== tx || it.sy.t !== ty) { it.sx.t = tx; it.sy.t = ty; it.awake = true; }
        if (it.awake && !reduced) {
          const a = stepS(it.sx, dt), b = stepS(it.sy, dt);
          it.awake = a || b;
          stepped = true;
          if (it.awake) busy = true;
        }
      }
      // Drawn full grown, and redrawn only as it leans by a tenth of a unit or more (under a
      // pixel at the journey's scale); it grows by scaling up from its foot.
      if (stepped) {
        const qx = Math.round(it.sx.x * 10), qy = Math.round(it.sy.x * 10), key = qx + ' ' + qy;
        if (key !== it.drawn) { it.drawn = key; it.draw(1, qx / 10, qy / 10); }
      }
      const grown = grow ? s.toFixed(3) : it.grown;
      if (grown !== it.grown) {
        it.grown = grown;
        // a growing tree keeps its strokes at a pixel while it is scaled (see .at-rest)
        it.g.classList.toggle('growing', s < .9995);
        if (s >= .9995) it.g.removeAttribute('transform');
        else it.g.setAttribute('transform', `matrix(${grown} 0 0 ${grown} ${f(it.foot[0] * (1 - s))} ${f(it.foot[1] * (1 - s))})`);
      }
    }
    if (grass) {
      // the grass is grown by the journey, and past that stays as drawn until the wind finds it
      const g = reduced ? 0 : Math.round(Math.min(phi, 1.1) * 400) / 400, g0 = grassAt;
      grassAt = g;
      for (const p of grass) {
        let dirty = g !== g0 && !(Math.max(g0, g) < p.lo || Math.min(g0, g) > p.hi);
        const near = wind.on && Math.hypot(p.cx - wind.x, p.cy - wind.y) < 190 + 100;
        if (!reduced && (near || p.awake || p.held)) {
          p.awake = p.held = false;
          for (const t of p.tufts) {
            const [wx, wy] = near ? windAt(t.x, t.y, 190, 8, .016) : [0, 0];
            if (t.sx.t !== wx || t.sy.t !== wy) { t.sx.t = wx; t.sy.t = wy; t.awake = true; }
            if (wx || wy) p.held = true;
            if (!t.awake) continue;
            const a = stepS(t.sx, dt), b = stepS(t.sy, dt);
            t.awake = a || b;
            if (t.awake) p.awake = true;
            const qx = Math.round(t.sx.x * 20), qy = Math.round(t.sy.x * 20);
            if (qx !== t.qx || qy !== t.qy) { t.qx = qx; t.qy = qy; dirty = true; }
          }
          if (p.awake) busy = true;
        }
        if (dirty) drawPatch(p, g);
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
