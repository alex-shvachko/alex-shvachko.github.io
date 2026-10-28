// The signal's sky, drawn in hairline's line: a ringed giant and a dark cratered world, small
// moons on dashed orbits, a ringed pebble, a crescent, constellations strung between nodes, a
// stippled band of galaxy and four-point sparks. It answers the pointer with parallax, pulses
// its sparks, carries the moons round their orbits and lets a shooting star cross now and then.
// world.js owns the layers, their fade and the scroll; this file draws and animates.
// Three layers, so motion never repaints what is still: `far` (dust, guides, constellations),
// `near` (the planets, drawn once) and `fx` (what moves).
window.HLCosmos = function ({ far, near, fx }) {
  const { mk, clamp } = HL;
  const TAU = Math.PI * 2, RAD = Math.PI / 180;
  const f = n => (+n).toFixed(1);
  const smooth = t => t * t * (3 - 2 * t);
  const mulberry = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

  const defs = mk('defs', {}, near);
  const farG = mk('g', {}, far), nearG = mk('g', {}, near), fxG = mk('g', {}, fx);
  let W = 0, H = 0, u = 1, clipN = 0, moons = [], rnd = Math.random;

  const disc = (cx, cy, r) => `M${f(cx - r)} ${f(cy)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0Z`;
  const spark = (x, y, r, c = .16) => {
    const k = r * c;
    return `M${f(x)} ${f(y - r)}Q${f(x + k)} ${f(y - k)} ${f(x + r)} ${f(y)}Q${f(x + k)} ${f(y + k)} ${f(x)} ${f(y + r)}Q${f(x - k)} ${f(y + k)} ${f(x - r)} ${f(y)}Q${f(x - k)} ${f(y - k)} ${f(x)} ${f(y - r)}Z`;
  };
  const clip = (d, evenodd) => {
    const id = `cosmos-c${++clipN}`;
    mk('path', { d, 'clip-rule': evenodd ? 'evenodd' : 'nonzero' }, mk('clipPath', { id }, defs));
    return `url(#${id})`;
  };
  const ink = (parent, d, cls, style) => {
    const p = mk('path', { d, class: cls }, parent);
    if (style) {
      const { transform, ...css } = style;
      if (transform) p.setAttribute('transform', transform);
      Object.assign(p.style, css);
    }
    return p;
  };
  // Parallel strokes across a disc's bounding square; a clip keeps the part that is wanted.
  const hatch = (cx, cy, R, deg, gap) => {
    const a = deg * RAD, dx = Math.cos(a), dy = Math.sin(a);
    let d = '';
    for (let o = -R; o <= R; o += gap) {
      const px = cx - dy * o, py = cy + dx * o;
      d += `M${f(px - dx * R)} ${f(py - dy * R)}L${f(px + dx * R)} ${f(py + dy * R)}`;
    }
    return d;
  };
  const gauss = () => Math.sqrt(-2 * Math.log(rnd() || 1e-9)) * Math.cos(TAU * rnd());
  // A crescent: the part of a disc a second, shifted disc leaves uncovered, as one outline.
  const crescent = (cx, cy, R, d, r) => {
    const x = (d * d + R * R - r * r) / (2 * d), y = Math.sqrt(Math.max(0, R * R - x * x));
    return `M${f(cx + x)} ${f(cy - y)}A${f(R)} ${f(R)} 0 1 0 ${f(cx + x)} ${f(cy + y)}A${f(r)} ${f(r)} 0 ${x > d ? 1 : 0} 1 ${f(cx + x)} ${f(cy - y)}Z`;
  };

  // A small ball: plate, a crater or two and a few strokes on its dark side.
  function ball(parent, cx, cy, r) {
    const g = mk('g', {}, parent);
    mk('circle', { cx: f(cx), cy: f(cy), r: f(r), class: 'sil' }, g);
    const c = clip(disc(cx, cy, r));
    const gg = mk('g', { 'clip-path': c }, g);
    ink(gg, hatch(cx, cy, r, 40, Math.max(2.4, r * .26)), 'nf sil', { strokeOpacity: .45 });
    const k = 1 + Math.floor(rnd() * 2);
    for (let i = 0; i < k; i++) mk('ellipse', { cx: f(cx + (rnd() - .5) * r * 1.0), cy: f(cy + (rnd() - .5) * r * 1.0), rx: f(r * (.14 + rnd() * .1)), ry: f(r * (.1 + rnd() * .08)), class: 'nf' }, gg);
    return g;
  }

  // A rocky world, lit from one side: a dense dark side, a thin bright limb, craters.
  function rock(cx, cy, R, light, cls) {
    const g = mk('g', {}, nearG);
    mk('circle', { cx: f(cx), cy: f(cy), r: f(R), class: cls || 'sil' }, g);
    const lx = Math.cos(light), ly = Math.sin(light);
    const outer = mk('g', { 'clip-path': clip(disc(cx, cy, R)) }, g);
    const sx = cx - lx * R * .3, sy = cy - ly * R * .3;
    const shade = mk('g', { 'clip-path': clip(disc(sx, sy, R * .98)) }, outer);
    const gap = Math.max(2.6, R * .045);
    ink(shade, hatch(cx, cy, R * 1.3, 38, gap), 'nf sil', { strokeOpacity: .55 });
    ink(shade, hatch(cx, cy, R * 1.3, -52, gap * 1.15), 'nf sil', { strokeOpacity: .4 });
    for (let i = 0; i < 13; i++) {
      const a = rnd() * TAU, d = Math.sqrt(rnd()) * R * .82, x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
      const r = R * (.04 + rnd() * rnd() * .16), rad = Math.sqrt(Math.max(.05, 1 - (d / R) ** 2));
      const e = mk('ellipse', { cx: f(x), cy: f(y), rx: f(r * rad), ry: f(r), class: 'nf', transform: `rotate(${f(a / RAD)} ${f(x)} ${f(y)})` }, outer);
      if (r > R * .1) mk('ellipse', { cx: f(x + r * .12), cy: f(y), rx: f(r * rad * .5), ry: f(r * .5), class: 'nf lo', transform: e.getAttribute('transform') }, outer);
    }
    // the bright limb, drawn heavier than the rest of the outline
    ink(g, crescent(cx, cy, R, R * .12, R * .99), 'nf hi', { strokeWidth: 1.4, transform: `rotate(${f(light / RAD + 180)} ${f(cx)} ${f(cy)})` });
    return g;
  }

  // A ringed giant: bands of cloud, a spot, a shadowed limb, and rings in front of and behind it.
  function giant(cx, cy, R, tilt) {
    const rot = `rotate(${tilt} ${f(cx)} ${f(cy)})`;
    const back = mk('g', { transform: rot }, nearG), body = mk('g', {}, nearG), front = mk('g', { transform: rot }, nearG);
    const RINGS = [[1.3, 'sil'], [1.36, 'lo'], [1.43, 'sil', '2 3'], [1.5, 'lo'], [1.66, 'sil'], [1.71, 'lo'], [1.78, 'sil', '1 3'], [1.86, 'lo'], [1.93, 'sil'], [2.12, 'sil'], [2.17, 'lo'], [2.24, 'sil', '5 4'], [2.31, 'lo']];
    for (const [m, cls, dash] of RINGS) {
      const rx = R * m, ry = rx * .2, style = dash ? { strokeDasharray: dash } : null;
      ink(back, `M${f(cx - rx)} ${f(cy)}A${f(rx)} ${f(ry)} 0 0 1 ${f(cx + rx)} ${f(cy)}`, `nf ${cls}`, style);
      ink(front, `M${f(cx + rx)} ${f(cy)}A${f(rx)} ${f(ry)} 0 0 1 ${f(cx - rx)} ${f(cy)}`, `nf ${cls}`, style);
    }
    mk('circle', { cx: f(cx), cy: f(cy), r: f(R), class: 'sil' }, body);
    const inBody = mk('g', { 'clip-path': clip(disc(cx, cy, R)) }, body);
    const bands = mk('g', { transform: rot }, inBody);
    [-.74, -.58, -.44, -.3, -.16, -.04, .1, .24, .38, .52, .66, .8].forEach((t, i) => {
      const rx = R * Math.sqrt(1 - t * t), y = cy - R * t * .98;
      ink(bands, `M${f(cx - rx)} ${f(y)}A${f(rx)} ${f(rx * .2)} 0 0 0 ${f(cx + rx)} ${f(y)}`, i % 3 ? 'nf lo' : 'nf sil', i % 3 ? null : { strokeOpacity: .55 });
    });
    mk('ellipse', { cx: f(cx - R * .3), cy: f(cy + R * .32), rx: f(R * .17), ry: f(R * .08), class: 'nf sil', transform: rot }, inBody);
    mk('ellipse', { cx: f(cx - R * .3), cy: f(cy + R * .32), rx: f(R * .09), ry: f(R * .04), class: 'nf lo', transform: rot }, inBody);
    // the shadowed limb, lit from the upper left
    const gap = Math.max(3.4, R * .035);
    const limb = (ox, oy, r2, deg, g2, op) => ink(mk('g', { 'clip-path': clip(disc(cx, cy, R) + disc(cx + ox, cy + oy, r2), true) }, inBody), hatch(cx, cy, R * 1.2, deg, g2), 'nf sil', { strokeOpacity: op });
    limb(-R * .34, -R * .3, R, 34, gap, .5);
    limb(-R * .18, -R * .15, R, -38, gap * .9, .4);
    return { cx, cy, R };
  }

  // A burst of fine rays round a four-point spark, the brightest kind of star.
  function burst(x, y, r) {
    const g = mk('g', { class: 'cosmos-tw' }, fxG);
    g.style.setProperty('--tw-d', `${(4 + rnd() * 4).toFixed(1)}s`);
    g.style.setProperty('--tw-dl', `${(-rnd() * 6).toFixed(1)}s`);
    let rays = '';
    for (let i = 0; i < 16; i++) {
      const a = i * TAU / 16, a0 = r * .24, a1 = r * (i % 4 === 0 ? 1.9 : i % 2 ? .95 : 1.35);
      rays += `M${f(x + Math.cos(a) * a0)} ${f(y + Math.sin(a) * a0)}L${f(x + Math.cos(a) * a1)} ${f(y + Math.sin(a) * a1)}`;
    }
    ink(g, `M${f(x - r * 2.5)} ${f(y)}H${f(x + r * 2.5)}M${f(x)} ${f(y - r * 2.5)}V${f(y + r * 2.5)}`, 'nf lo');
    ink(g, rays, 'nf lo');
    mk('circle', { cx: f(x), cy: f(y), r: f(r * .72), class: 'nf lo dash' }, g);
    ink(g, spark(x, y, r), 'nf sil');
    ink(g, spark(x, y, r * .34, .3), 'dot');
    return g;
  }

  function build(opts) {
    ({ W, H } = opts);
    const { tall, narrow } = opts;
    rnd = mulberry(20261028);
    u = narrow ? Math.min(H / 900, W / 520) : Math.min(W / 1440, H / 900);
    for (const g of [farG, nearG, fxG]) g.replaceChildren();
    defs.replaceChildren();
    moons = []; shots.forEach(s => { s.on = false; s.g.style.display = 'none'; });
    const at = (fx, fy) => [W * fx, H * fy];
    const zone = narrow ? { x0: W * .1, x1: W * .9, y0: H * .28, y1: H * .64 } : { x0: W * .5 - 215 * u, x1: W * .5 + 215 * u, y0: H * .2, y1: H * .66 };
    const inZone = (x, y, pad = 0) => x > zone.x0 - pad && x < zone.x1 + pad && y > zone.y0 - pad && y < zone.y1 + pad;
    const solids = [];

    // ---- far: the stippled band of galaxy, then fine dust over the whole sky
    {
      const x0 = -.05 * W, y0 = .8 * H, x1 = narrow ? .5 * W : .36 * W, y1 = narrow ? .04 * H : .06 * H;
      const nx = y1 - y0, ny = x0 - x1, nl = Math.hypot(nx, ny);
      const faint = [], mid = [], bright = [];
      const n = Math.round(clamp(W * H / 900, 380, 1400));
      for (let i = 0; i < n; i++) {
        const t = rnd(), off = gauss() * 74 * u * (.55 + t * .5) * (narrow ? .7 : 1);
        const x = x0 + (x1 - x0) * t + nx / nl * off, y = y0 + (y1 - y0) * t + ny / nl * off, p = `M${f(x)} ${f(y)}h.1`;
        const r = rnd();
        (r < .08 ? bright : r < .35 ? mid : faint).push(p);
      }
      const m = Math.round(clamp(W * tall / 7000, 80, 300));
      for (let i = 0; i < m; i++) {
        const x = rnd() * W, y = (rnd() * 1.25 - .1) * tall, p = `M${f(x)} ${f(y)}h.1`, r = rnd();
        (r < .06 ? bright : r < .3 ? mid : faint).push(p);
      }
      ink(farG, faint.join(''), 'nf lo', { strokeWidth: 1.7 });
      ink(farG, mid.join(''), 'nf sil', { strokeWidth: 1.5, strokeOpacity: .7 });
      ink(farG, bright.join(''), 'nf hi', { strokeWidth: 2.1, strokeOpacity: .85 });
    }

    // ---- far: long guide lines, great dashed orbits with a node or two upon them
    {
      const orbits = [
        [.52, .52, .64, .27, -14, '1 5'], [.46, .5, .5, .16, 18, ''], [.2, .36, .2, .2, 0, '2 6'],
        [.18, .62, .34, .34, 0, '1 8'], [.84, .58, .36, .12, -22, '']
      ];
      for (const [fx, fy, rxF, ryF, rot, dash] of orbits) {
        const [cx, cy] = at(fx, fy), rx = rxF * W, ry = ryF * W;
        const ex = mk('ellipse', { cx: f(cx), cy: f(cy), rx: f(rx), ry: f(ry), class: 'nf lo', transform: `rotate(${rot} ${f(cx)} ${f(cy)})` }, farG);
        if (dash) ex.style.strokeDasharray = dash;
        for (let k = 0; k < 2; k++) {
          const a = rnd() * TAU, x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry, c = Math.cos(rot * RAD), s = Math.sin(rot * RAD);
          const px = cx + (x - cx) * c - (y - cy) * s, py = cy + (x - cx) * s + (y - cy) * c;
          if (px < 0 || px > W || py < 0 || py > H * .86 || inZone(px, py, 24)) continue;
          mk('circle', { cx: f(px), cy: f(py), r: f(3.4), class: 'sil' }, farG);
          mk('circle', { cx: f(px), cy: f(py), r: f(1.1), class: 'dot' }, farG);
        }
      }
      const guides = [.18, narrow ? .86 : .7].map(fx => [fx * W, .06 * H, .8 * H]);
      for (const [x, y0, y1] of guides) {
        ink(farG, `M${f(x)} ${f(y0)}V${f(y1)}`, 'nf lo', { strokeDasharray: '1 6' });
        for (let k = 0; k < 4; k++) mk('circle', { cx: f(x), cy: f(y0 + (y1 - y0) * (.12 + k * .26 + rnd() * .1)), r: 1.8, class: 'dot m' }, farG);
      }
    }

    // ---- near: the giant, the dark world, a ringed pebble, a far limb, and the moons' orbits
    const A = narrow ? at(.7, .15) : at(.76, .27), RA = (narrow ? 145 : 178) * Math.max(u, .55);
    giant(A[0], A[1], RA, -17);
    solids.push({ x: A[0], y: A[1], r: RA * 2.3 });
    const B = narrow ? at(.2, .68) : at(.2, .37), RB = Math.max(40, (narrow ? 64 : 70) * u);
    rock(B[0], B[1], RB, -Math.PI / 4, 'hi');
    solids.push({ x: B[0], y: B[1], r: RB * 1.9 });
    {
      // a compass ring round the dark world, with its ticks
      let t = '';
      for (let k = 0; k < 48; k++) { const a = k * TAU / 48, r0 = RB * 1.5, r1 = RB * (k % 6 ? 1.56 : 1.64); t += `M${f(B[0] + Math.cos(a) * r0)} ${f(B[1] + Math.sin(a) * r0)}L${f(B[0] + Math.cos(a) * r1)} ${f(B[1] + Math.sin(a) * r1)}`; }
      mk('circle', { cx: f(B[0]), cy: f(B[1]), r: f(RB * 1.5), class: 'nf lo' }, nearG);
      ink(nearG, t, 'nf lo');
    }
    {
      const C = narrow ? at(.12, .3) : at(.63, .13), RC = Math.max(8, 17 * u), tilt = -22;
      const rot = `rotate(${tilt} ${f(C[0])} ${f(C[1])})`;
      const back = mk('g', { transform: rot }, nearG);
      ink(back, `M${f(C[0] - RC * 2.2)} ${f(C[1])}A${f(RC * 2.2)} ${f(RC * .55)} 0 0 1 ${f(C[0] + RC * 2.2)} ${f(C[1])}`, 'nf sil');
      ball(nearG, C[0], C[1], RC);
      const front = mk('g', { transform: rot }, nearG);
      ink(front, `M${f(C[0] + RC * 2.2)} ${f(C[1])}A${f(RC * 2.2)} ${f(RC * .55)} 0 0 1 ${f(C[0] - RC * 2.2)} ${f(C[1])}`, 'nf sil');
      ink(front, `M${f(C[0] + RC * 1.8)} ${f(C[1])}A${f(RC * 1.8)} ${f(RC * .46)} 0 0 1 ${f(C[0] - RC * 1.8)} ${f(C[1])}`, 'nf lo');
      solids.push({ x: C[0], y: C[1], r: RC * 3 });
    }
    if (!narrow) {
      const D = at(1, .66), RD = Math.max(40, 74 * u);
      rock(D[0], D[1], RD, -2.3);
      solids.push({ x: D[0], y: D[1], r: RD * 1.3 });
      const M = at(.15, .72), RM = Math.max(14, 25 * u);
      ink(nearG, crescent(M[0], M[1], RM, RM * .55, RM * .86), 'sil', { fill: 'var(--hl-plate)' });
      solids.push({ x: M[0], y: M[1], r: RM * 1.6 });
    }
    // two moons on dashed orbits round the giant, one round the dark world
    const orbit = (c, rx, ry, tilt, r, speed, a, hide) => {
      const e = mk('ellipse', { cx: f(c[0]), cy: f(c[1]), rx: f(rx), ry: f(ry), class: 'nf lo', transform: `rotate(${tilt} ${f(c[0])} ${f(c[1])})` }, nearG);
      e.style.strokeDasharray = '1 5';
      const g = ball(fxG, 0, 0, r);
      moons.push({ g, cx: c[0], cy: c[1], rx, ry, tilt: tilt * RAD, a, w: speed, hide });
    };
    orbit(A, RA * 3, RA * .9, -14, Math.max(6, 11 * u), .11, 1.1, { x: A[0], y: A[1], r: RA });
    orbit(A, RA * 2.7, RA * .46, -20, Math.max(4.5, 7 * u), -.16, 3.9, { x: A[0], y: A[1], r: RA });
    orbit(B, RB * 2.2, RB * .8, 14, Math.max(3.5, 5 * u), .22, 2.2, { x: B[0], y: B[1], r: RB });

    // ---- far: three constellations, nodes joined by fine lines
    const clusters = narrow ? [[.5, .66, 90], [.3, .1, 70]] : [[.34, .17, 120], [.62, .74, 110], [.89, .5, 100]];
    for (const [fx, fy, spread] of clusters) {
      const c = at(fx, fy), pts = [];
      for (let i = 0, tries = 0; i < 7 && tries < 60; tries++) {
        const a = rnd() * TAU, d = Math.sqrt(rnd()) * spread * u, x = c[0] + Math.cos(a) * d, y = c[1] + Math.sin(a) * d;
        if (x < 8 || x > W - 8 || y < 8 || y > H * .84 || inZone(x, y, 18) || solids.some(s => Math.hypot(x - s.x, y - s.y) < s.r)) continue;
        if (pts.some(p => Math.hypot(p[0] - x, p[1] - y) < 26 * u)) continue;
        pts.push([x, y]); i++;
      }
      if (pts.length < 3) continue;
      const order = [pts.shift()];
      while (pts.length) {
        const last = order[order.length - 1];
        let bi = 0;
        pts.forEach((p, i) => { if (Math.hypot(p[0] - last[0], p[1] - last[1]) < Math.hypot(pts[bi][0] - last[0], pts[bi][1] - last[1])) bi = i; });
        order.push(pts.splice(bi, 1)[0]);
      }
      let d = order.map((p, i) => `${i ? 'L' : 'M'}${f(p[0])} ${f(p[1])}`).join('');
      if (order.length > 4) d += `M${f(order[1][0])} ${f(order[1][1])}L${f(order[order.length - 1][0])} ${f(order[order.length - 1][1])}`;
      ink(farG, d, 'nf sil', { strokeOpacity: .5 });
      order.forEach((p, i) => {
        mk('circle', { cx: f(p[0]), cy: f(p[1]), r: f(i % 3 ? 1.9 : 2.6), class: 'dot' }, farG);
        if (i % 3 === 0) mk('circle', { cx: f(p[0]), cy: f(p[1]), r: 6, class: 'nf sil' }, farG);
      });
    }

    // ---- fx: sparks that pulse, from the great bursts down to the smallest
    const free = pad => {
      for (let i = 0; i < 40; i++) {
        const x = rnd() * W, y = rnd() * H * .84;
        if (!inZone(x, y, pad) && !solids.some(s => Math.hypot(x - s.x, y - s.y) < s.r + pad)) return [x, y];
      }
      return null;
    };
    const bursts = narrow ? [[.9, .38, 26], [.12, .78, 20]] : [[.91, .16, 44], [.43, .1, 24], [.08, .63, 34], [.65, .6, 18], [.34, .76, 14]];
    for (const [fx, fy, r] of bursts) {
      const [x, y] = at(fx, fy);
      if (!inZone(x, y, 30)) burst(x, y, Math.max(7, r * u));
    }
    const small = narrow ? 8 : 18;
    for (let i = 0; i < small; i++) {
      const p = free(14);
      if (!p) continue;
      const g = mk('g', { class: 'cosmos-tw' }, fxG);
      g.style.setProperty('--tw-d', `${(3 + rnd() * 5).toFixed(1)}s`);
      g.style.setProperty('--tw-dl', `${(-rnd() * 8).toFixed(1)}s`);
      const r = Math.max(3.4, (4 + rnd() * 7) * u);
      ink(g, spark(p[0], p[1], r, .2), 'dot' + (rnd() < .5 ? ' m' : ''));
    }
  }

  // ---- the shooting star: a bright head with a tail that thins, crossing the sky down and left
  const shotG = mk('g', {}, fx);
  const shots = Array.from({ length: 3 }, () => {
    const g = mk('g', {}, shotG);
    g.style.display = 'none';
    const tail = [0, 1, 2, 3].map(i => {
      const l = mk('line', { class: 'nf hi' }, g);
      l.style.strokeWidth = (1.7 - i * .32).toFixed(2);
      return l;
    });
    const head = mk('circle', { r: 2.4, class: 'dot accent' }, g);
    return { g, tail, head, on: false, t0: 0, dur: 1, x: 0, y: 0, dx: 0, dy: 0, len: 0, tailLen: 0 };
  });
  let nextShot = 0;
  function spawnShot(now) {
    const s = shots.find(s => !s.on);
    if (!s) return;
    const a = (146 + Math.random() * 20) * RAD;
    s.dx = Math.cos(a); s.dy = Math.sin(a);
    s.x = W * (.4 + Math.random() * .65); s.y = H * (-.02 + Math.random() * .32);
    s.len = clamp(W * (.26 + Math.random() * .2), 240, 620);
    s.tailLen = (110 + Math.random() * 90) * Math.max(.7, u);
    s.dur = 850 + Math.random() * 450;
    s.t0 = now; s.on = true; s.g.style.display = '';
  }
  function stepShots(now) {
    if (now >= nextShot) {
      spawnShot(now);
      // now and then a second one follows close behind the first
      nextShot = now + (Math.random() < .22 ? 350 + Math.random() * 500 : 2400 + Math.random() * 3800);
    }
    for (const s of shots) {
      if (!s.on) continue;
      const k = (now - s.t0) / s.dur;
      if (k >= 1) { s.on = false; s.g.style.display = 'none'; continue; }
      const p = 1 - Math.pow(1 - k, 1.7), alpha = Math.min(1, k / .1) * (1 - smooth(clamp((k - .7) / .3, 0, 1)));
      const at = q => [s.x + s.dx * s.len * Math.max(0, q), s.y + s.dy * s.len * Math.max(0, q)];
      const seg = s.tailLen / s.len / 4;
      s.tail.forEach((l, i) => {
        const a = at(p - i * seg), b = at(p - (i + 1) * seg);
        l.setAttribute('x1', f(a[0])); l.setAttribute('y1', f(a[1])); l.setAttribute('x2', f(b[0])); l.setAttribute('y2', f(b[1]));
        l.style.strokeOpacity = ((1 - i * .24) * alpha).toFixed(2);
      });
      const h = at(p);
      s.head.setAttribute('cx', f(h[0])); s.head.setAttribute('cy', f(h[1]));
      s.head.style.opacity = alpha.toFixed(2);
    }
  }

  // ---- the loop: parallax, the moons, the shooting stars; asleep whenever the sky is not shown
  let on = false, raf = 0, last = 0, phi = 0;
  const ptr = [0, 0], ptrT = [0, 0], seen = new Map();
  const place = (el, x, y) => {
    const v = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
    if (seen.get(el) !== v) { seen.set(el, v); el.style.transform = v; }
  };
  addEventListener('pointermove', e => { if (e.pointerType === 'touch') return; ptrT[0] = (e.clientX / (W || innerWidth) - .5) * 2; ptrT[1] = (e.clientY / (H || innerHeight) - .5) * 2; }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { ptrT[0] = ptrT[1] = 0; });
  function frame(now) {
    raf = 0;
    if (!on || document.hidden) { last = 0; return; }
    const dt = last ? Math.min(.05, (now - last) / 1000) : 1 / 60;
    last = now;
    const k = 1 - Math.exp(-dt / .45);
    ptr[0] += (ptrT[0] - ptr[0]) * k; ptr[1] += (ptrT[1] - ptr[1]) * k;
    // the sky rises into place as the floor falls away: the nearer, the further it comes
    const rise = 1 - smooth(clamp((phi - 3.05) / .95, 0, 1));
    place(far, ptr[0] * -7, rise * H * .06 + ptr[1] * -4);
    place(near, ptr[0] * -18, rise * H * .14 + ptr[1] * -10);
    place(fx, ptr[0] * -18, rise * H * .14 + ptr[1] * -10);
    for (const m of moons) {
      m.a += m.w * dt;
      const ex = Math.cos(m.a) * m.rx, ey = Math.sin(m.a) * m.ry, c = Math.cos(m.tilt), s = Math.sin(m.tilt);
      const x = m.cx + ex * c - ey * s, y = m.cy + ex * s + ey * c;
      m.g.setAttribute('transform', `translate(${f(x)} ${f(y)})`);
      // behind its planet while on the far side of the orbit
      const gone = Math.sin(m.a) < 0 && Math.hypot(x - m.hide.x, y - m.hide.y) < m.hide.r + 6;
      m.g.style.display = gone ? 'none' : '';
    }
    stepShots(now);
    raf = requestAnimationFrame(frame);
  }
  function drive(active, p) {
    phi = p;
    if (active && !on) { on = true; last = 0; nextShot = performance.now() + 1400; }
    else if (!active && on) on = false;
    if (on && !raf) raf = requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange', () => { last = 0; if (on && !raf) raf = requestAnimationFrame(frame); });

  return { build, drive };
};
