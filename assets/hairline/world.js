(() => {
  // The line world behind the page, drawn with the hairline kernel: a rover on its plinth,
  // the trail of the journey with a marker per chapter, the floor grid and a field of stars.
  // Scroll steers one camera across it (studio, path, archive, signal); the pointer is
  // answered by the rover. Geometry is projected once at unit scale and the camera is a
  // transform on top, so a zoom never redraws what did not move.
  if (!window.HL) return;
  const { rings, circ, prism, hull, poly, open, run, seg, clamp, lerp, mk, solid, tween, tset, tval, tdone, spring, stepS } = HL;
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
  // The kernel's put, writing only what changed: a path given the same d is still repainted.
  const put = (el, sh) => { set(el.sil, 'd', sh.sil); set(el.cr, 'd', sh.crease); };
  // A layer at nothing leaves the page, so it costs nothing to paint or composite.
  const fadeTo = (el, v) => { el.style.opacity = v.toFixed(3); el.style.display = v > 0 ? '' : 'none'; };
  const ring2 = (cx, cy, cz, ux, uy, uz, vx, vy, vz, r, n, sv = 1) => {
    const out = [];
    for (let k = 0; k < n; k++) {
      const t = k / n * Math.PI * 2, c = Math.cos(t) * r, s = Math.sin(t) * r * sv;
      out.push(P(cx + ux * c + vx * s, cy + uy * c + vy * s, cz + uz * c + vz * s));
    }
    return out;
  };

  // ---- the drawing -------------------------------------------------------------------
  // Three drawings stacked, each its own compositor layer: the stars, the floor and the scene.
  // A tree that sways repaints only the scene, never the masked floor under it, and the
  // layers fade as wholes on the compositor.
  const layer = () => mk('svg', { 'aria-hidden': 'true', focusable: 'false' }, root);
  const sky = layer(), nearSvg = layer(), fxSvg = layer(), floorSvg = layer(), svg = layer();
  const defs = mk('defs', {}, floorSvg);
  const grad = mk('radialGradient', { id: 'world-fade-g', gradientUnits: 'userSpaceOnUse' }, defs);
  mk('stop', { offset: 0, 'stop-color': '#fff', 'stop-opacity': 1 }, grad);
  mk('stop', { offset: .5, 'stop-color': '#fff', 'stop-opacity': .6 }, grad);
  mk('stop', { offset: 1, 'stop-color': '#fff', 'stop-opacity': 0 }, grad);
  const mask = mk('mask', { id: 'world-fade', maskUnits: 'userSpaceOnUse', x: 0, y: 0 }, defs);
  const maskRect = mk('rect', { x: 0, y: 0, fill: 'url(#world-fade-g)' }, mask);

  const starsG = mk('g', { class: 'stars' }, sky);
  // The signal's sky: planets, moons, constellations and shooting stars over the stars (cosmos.js).
  const cosmos = window.HLCosmos ? window.HLCosmos({ far: sky, near: nearSvg, fx: fxSvg }) : null;
  const floor = mk('g', { mask: 'url(#world-fade)' }, floorSvg);
  const floorCam = mk('g', {}, floor);
  const gridCoarse = mk('path', { class: 'grid' }, floorCam);
  const gridFine = mk('path', { class: 'grid' }, floorCam);
  // One faint speck drawn without anti-aliasing. Chrome rasterises a layer that holds many curved
  // strokes with multisampling, which on an integrated GPU costs this scene a third of its frame;
  // any aliased paint in the layer has it keep its ordinary anti-aliasing instead.
  mk('rect', { class: 'speck', width: 1, height: 1, 'shape-rendering': 'crispEdges' }, svg);
  const cam = mk('g', {}, svg);
  // Paint order: the studio plinth, the stream, the trail, what lies flat on the ground (the
  // bridge deck, grass, pebbles), then every standing thing in one group sorted by depth, the
  // trees and markers fixed and the rover slotted in among them as it goes.
  const plinthG = mk('g', {}, cam);
  const waterG = mk('g', {}, cam);
  const trailG = mk('g', {}, cam);
  const groundG = mk('g', {}, cam);
  const objects = mk('g', {}, cam);
  const roverG = mk('g', {}, objects);
  let standing = [], roverSlot = -1;

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
  // The head pivots at its centre, HEAD_Z up, between the two arms of a yoke. The yoke stands
  // on a turntable that turns about z; the head nods about its own w axis on the arms' pivots.
  // Its front is a screen, and the eyes live on the screen.
  const HEAD = rings(-11, -14, 11, 14, 3.6, 1.4);
  const HEAD_AT = 13, HEAD_Z = 42, HEAD_H = 8;
  const SCREEN = HL.rrect(-9.4, -5.8, 9.4, 5.8, 2.6, 6);
  const TABLE = [circ(16.4, 72), circ(15.2, 72)], TABLE_TOP = 31.4, ARM_W = [14.3, 15.7];
  // An arm is a plate in the head's u-z plane, wide where it stands and round over the pivot;
  // each corner keeps the outward normal of the plate's edge there.
  const ARM = [
    { u: -3.8, z: TABLE_TOP, nu: -.7, nz: -.7 }, { u: 3.8, z: TABLE_TOP, nu: .7, nz: -.7 },
    ...Array.from({ length: 9 }, (_, k) => { const a = k / 8 * Math.PI; return { u: 3.2 * Math.cos(a), z: HEAD_Z + 3.2 * Math.sin(a), nu: Math.cos(a), nz: Math.sin(a) }; })
  ];
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
        return {
          g, tire: mk('path', { class: 'sil' }, g), tread: mk('path', { class: 'nf' }, g), face: mk('path', { class: 'nf' }, g),
          rim: mk('path', { class: 'nf lo' }, g), spokes: mk('path', { class: 'nf' }, g), hub: mk('path', { class: 'sil' }, g),
          cap: mk('path', { class: 'nf lo' }, g), bolts: mk('path', { class: 'dot m' }, g)
        };
      })
    })),
    lidar: (() => {
      const g = mk('g', {}, roverG);
      return { g, body: solid(g), cap: solid(g), slit: mk('path', { class: 'nf hi' }, g) };
    })(),
    head: (() => {
      const g = mk('g', {}, roverG);
      const table = solid(g), notches = mk('path', { class: 'nf' }, g);
      const arms = [1, -1].map(side => ({ side, ...solid(g) }));
      const box = solid(g);
      box.sil.classList.add('hi');
      const screen = mk('path', { class: 'screen' }, g), glare = mk('path', { class: 'nf glare' }, g);
      const eyes = [0, 1].map(() => mk('path', { class: 'eye' }, g));
      const pivot = mk('path', { class: 'sil' }, g), hub = mk('path', { class: 'nf' }, g);
      return { g, table, notches, arms, box, screen, glare, eyes, pivot, hub };
    })(),
    antenna: (() => {
      const g = mk('g', {}, roverG);
      return { g, base: solid(g), mast: mk('path', { class: 'nf sil' }, g), band: mk('path', { class: 'nf lo' }, g), tip: mk('path', { class: 'sil' }, g) };
    })()
  };

  // A wheel: a lugged tyre round a dished rim of five spokes, the hub standing proud with its
  // bolts. All of it turns with the spin; turned further in a frame than the eye can follow,
  // the lugs, spokes and bolts blur into rings. Step is how far it turned since the last frame.
  const LUGS = 16, SPOKES = 5, TREAD = Array.from({ length: 48 }, (_, k) => ({ t: k / 48 * Math.PI * 2 }));
  function wheel(w, cx, cy, ax, ay, spin, step) {
    // A wheel that has not moved (the rover holds still while its head turns) keeps its drawing.
    const key = [cx, cy, ax, ay, spin, step].map(v => v.toFixed(4)).join();
    if (key === w.key) return;
    w.key = key;
    const fx = ay, fy = -ax, o = facing(ax, ay) ? 1 : -1;
    // a point on the wheel: e out along the axle toward us, X forward and Y up in its plane
    const at = (e, X, Y) => P(cx + ax * e * o + fx * X, cy + ay * e * o + fy * X, WZ + Y);
    const pt = (e, r, t) => at(e, Math.cos(t) * r, Math.sin(t) * r);
    const ring = (e, r, n) => Array.from({ length: n }, (_, k) => pt(e, r, k / n * Math.PI * 2));
    const seenAt = t => (fx + fy) * Math.cos(t) + .8165 * Math.sin(t) > .12;
    w.hit = hull(ring(-WHW, WR, 30).concat(ring(WHW, WR, 30)));
    set(w.tire, 'd', poly(w.hit));
    // Lugs: a chevron across the tread that runs on down the shoulder.
    let d = '';
    if (step < Math.PI / LUGS * .8) {
      for (let k = 0; k < LUGS; k++) {
        const t = k / LUGS * Math.PI * 2 - spin, shoulder = [pt(WHW, WR, t), pt(WHW, WR - 1.4, t)];
        d += seenAt(t) && seenAt(t - .16) ? open([pt(-WHW * .86, WR, t), pt(0, WR, t - .16), ...shoulder]) : open(shoulder);
      }
    } else {
      const arc = run(TREAD, q => seenAt(q.t));
      for (const e of [-.45, .45]) d += open(arc.map(q => pt(e * WHW, WR, q.t)));
      d += poly(ring(WHW, WR - 1.4, 30));
    }
    set(w.tread, 'd', d);
    set(w.face, 'd', poly(ring(WHW, WR, 30)) + poly(ring(WHW, WR * .74, 26)));
    set(w.rim, 'd', poly(ring(WHW - .7, WR * .7, 26)));
    // Spokes: each a pair of lines from the hub out to the sunken rim, a little wider there.
    const fast = step > Math.PI / SPOKES * .8;
    let sp = '', bolts = '', cap = poly(ring(WHW + .9, 2.6, 16)) + poly(ring(WHW + .9, .8, 10));
    if (!fast) {
      for (let k = 0; k < SPOKES; k++) {
        const a = k / SPOKES * Math.PI * 2 - spin, c = Math.cos(a), s = Math.sin(a);
        for (const n of [-1, 1]) sp += seg(at(WHW + .2, c * 2.4 - s * n * .75, s * 2.4 + c * n * .75), at(WHW - .7, c * 6.1 - s * n * 1.05, s * 6.1 + c * n * 1.05));
        const b = a + Math.PI / SPOKES, bx = Math.cos(b) * 1.6, by = Math.sin(b) * 1.6;
        bolts += poly(Array.from({ length: 6 }, (_, j) => at(WHW + .9, bx + Math.cos(j * Math.PI / 3) * .38, by + Math.sin(j * Math.PI / 3) * .38)));
      }
    } else {
      sp = poly(ring(WHW - .3, 4, 22)) + poly(ring(WHW - .5, 5.3, 24));
      cap += poly(ring(WHW + .9, 1.6, 14));
    }
    set(w.spokes, 'd', sp);
    set(w.hub, 'd', poly(hull(ring(WHW - .3, 2.6, 16).concat(ring(WHW + .9, 2.6, 16)))));
    set(w.cap, 'd', cap);
    set(w.bolts, 'd', bolts);
  }

  // Pose: where the rover stands and how it answers the pointer.
  const pose = { x: 0, y: 0, h: 0, spin: 0, step: 0 };
  const yaw = spring(.32, { k: 90, c: 17 });
  const lookX = spring(.4), lookZ = spring(-.15);
  const leanX = spring(0, { k: 60, c: 9 }), leanY = spring(0, { k: 60, c: 9 });
  const pitch = spring(0, { k: 80, c: 13 });
  let lidarAngle = .6, blink = 1, blinkAt = 2.4, blinkT = -1;
  const anchors = {};

  // Burnouts: a click on a wheel spins up its axle, that wheel and its twin across, while the
  // other two hold the rover where it stands. The tyres smoke behind and lay rubber down.
  const BURN_W = 36;
  const burns = WHEEL_U.map(() => ({ spin: 0, step: 0, w: 0, until: 0, acc: 0, marks: null }));
  // The smoke is every puff's outline and then every puff's fill over them, so only the outline
  // of the cloud they make together is left. It paints under the whole rover, wheels and all.
  // Each puff is a pair of circles, kept and reused: the GPU draws a circle outright, where one
  // path of many arcs would be cut into triangles again on every frame.
  const smokeG = mk('g', {}, roverG);
  const smoke = { edge: mk('g', {}, smokeG), fill: mk('g', {}, smokeG), discs: [] };
  const skidG = mk('g', {});
  cam.insertBefore(skidG, objects);
  let puffs = [], skids = [], burnI = 0, burnGlad = 0, shaken = '', bodyHit = [], nearNow = 1;
  // A puff thrown back off the tyre where it meets the ground and out from the rover's side,
  // forward being (fx, fy) and side 1 for its left: it billows up, then shrinks away.
  function puff(x, y, fx, fy, side) {
    if (puffs.length > 180) return;
    const back = 10 + Math.random() * 18, out = side * Math.random() * 10, e = side * (WHW * .5 + Math.random() * 3), j = (Math.random() - .5) * 5;
    puffs.push({
      x: x - fx * (WR * .7 + j) - fy * e, y: y - fy * (WR * .7 + j) + fx * e, z: 1 + Math.random() * 3,
      vx: -fx * back - fy * out, vy: -fy * back + fx * out, vz: 4 + Math.random() * 7,
      r: 3.5 + Math.random() * 5, t: 0, life: 1.3 + Math.random() * 1.1
    });
  }
  /** Steps the burnouts, their smoke and their rubber; returns whether any of it still moves. */
  function stepBurns(now, dt) {
    const c = Math.cos(pose.h), s = Math.sin(pose.h);
    let live = false;
    burnI = 0;
    burns.forEach((b, i) => {
      const want = now < b.until ? BURN_W : 0;
      b.w += (want - b.w) * (1 - Math.exp(-dt * (want ? 4 : 1.5)));
      if (!want && b.w < .3) b.w = 0;
      b.step = b.w * dt;
      b.spin += b.step;
      burnI = Math.max(burnI, b.w / BURN_W);
      if (!b.w) { b.marks = null; return; }
      live = true;
      const centres = [1, -1].map(side => [pose.x + WHEEL_U[i] * c - side * WHEEL_W * s, pose.y + WHEEL_U[i] * s + side * WHEEL_W * c]);
      if (want) {
        b.marks = b.marks || centres.map(([x, y]) => { const m = { x, y, c, s, len: 0, end: 0, node: mk('path', { class: 'dot m' }, skidG) }; skids.push(m); return m; });
        b.marks.forEach(m => { m.len = Math.min(22, m.len + dt * 14); m.end = b.until; });
      }
      if (b.w > BURN_W * .35) {
        b.acc += dt * 42 * b.w / BURN_W;
        for (; b.acc >= 1; b.acc--) centres.forEach(([x, y], k) => puff(x, y, c, s, k ? -1 : 1));
      }
    });
    // rubber: a patch under each tyre, smeared back from where it scrubs, fading once it stops
    skids = skids.filter(m => {
      const f = clamp((now - m.end - 400) / 5000, 0, 1);
      if (f >= 1) { m.node.remove(); return false; }
      const edge = n => Array.from({ length: 7 }, (_, k) => {
        const l = lerp(2, -m.len, k / 6), e = n * WHW * (.85 - .25 * (k / 6) ** 2) + Math.sin(k * 2.3 + n) * .25;
        return P(m.x + m.c * l - m.s * e, m.y + m.s * l + m.c * e, 0);
      });
      set(m.node, 'd', poly(edge(1).concat(edge(-1).reverse())));
      set(m.node, 'opacity', (.32 * (1 - f)).toFixed(3));
      live = true;
      return true;
    });
    // Smoke: each puff slows and rises as it swells and shrinks again.
    const drag = Math.exp(-dt * 1.8);
    let n = 0;
    puffs = puffs.filter(p => {
      p.t += dt;
      const k = p.t / p.life;
      if (k >= 1) return false;
      p.vx *= drag; p.vy *= drag; p.vz = p.vz * drag + 9 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      const [qx, qy] = P(p.x, p.y, p.z), r = (p.r * Math.sin(Math.PI * Math.pow(k, .6))).toFixed(2);
      const pair = smoke.discs[n] || (smoke.discs[n] = [mk('circle', { class: 'puff' }, smoke.edge), mk('circle', { class: 'puff-fill' }, smoke.fill)]);
      pair.forEach(c => { set(c, 'cx', qx.toFixed(2)); set(c, 'cy', qy.toFixed(2)); set(c, 'r', r); c.style.display = ''; });
      n++;
      live = true;
      return true;
    });
    for (let i = n; i < smoke.discs.length; i++) smoke.discs[i].forEach(c => { c.style.display = 'none'; });
    // the body shudders over the spinning axle
    const lift = burnI ? (Math.sin(now * .09) + Math.sin(now * .157)) * .25 * burnI : 0;
    const shake = lift ? `translate(0 ${(-lift * ZF).toFixed(3)})` : '';
    if (shake !== shaken) {
      shaken = shake;
      [el.chassis.g, el.bumper.g, el.head.g, el.lidar.g, el.antenna.g].forEach(g => (shake ? g.setAttribute('transform', shake) : g.removeAttribute('transform')));
    }
    return live;
  }

  // The face: each eye is a top and a bottom edge sampled across its width, so one mood morphs
  // into another; the blink presses both edges toward the middle.
  const EYE_N = 15;
  const se = (t, p) => Math.pow(Math.max(0, 1 - Math.pow(Math.abs(t), p)), 1 / p);
  const MOODS = {
    open: { w: 3.8, top: t => 2.9 * se(t, 2.6), bot: t => -2.9 * se(t, 2.6) },
    wide: { w: 5, top: t => 2.6 * se(t, 2), bot: t => -2.6 * se(t, 2) },
    squint: { w: 4.6, top: t => .8 * se(t, 2.4), bot: t => -.8 * se(t, 2.4) },
    happy: { w: 4.8, top: t => 1.5 * (1 - t * t) - .3 + .8 * se(t, 3), bot: t => 1.5 * (1 - t * t) - .3 - .8 * se(t, 3) },
    sleepy: { w: 4.2, top: t => Math.min(.2, 2.6 * se(t, 2.4)), bot: t => -2.6 * se(t, 2.4) }
  };
  const sample = (m, edge) => Array.from({ length: EYE_N }, (_, k) => m[edge](-1 + 2 * k / (EYE_N - 1)));
  const face = [0, 1].map(() => ({ w: MOODS.open.w, top: sample(MOODS.open, 'top'), bot: sample(MOODS.open, 'bot') }));
  let mood = 'open', moodUntil = 0, moodAt = 6, faceVer = 0, napTimer = 0;
  /** Eases both eyes toward a mood (a wink is one glad eye); returns whether they still move. */
  function stepFace(want, dt) {
    const ease = reduced ? 1 : 1 - Math.exp(-dt * 16);
    let moving = false;
    face.forEach((e, i) => {
      const m = MOODS[want === 'wink' ? (i ? 'open' : 'happy') : want];
      const dw = (m.w - e.w) * ease;
      e.w += dw;
      if (Math.abs(dw) > 1e-3) moving = true;
      for (let k = 0; k < EYE_N; k++) {
        const t = -1 + 2 * k / (EYE_N - 1), a = (m.top(t) - e.top[k]) * ease, b = (m.bot(t) - e.bot[k]) * ease;
        e.top[k] += a; e.bot[k] += b;
        if (Math.abs(a) > 1e-3 || Math.abs(b) > 1e-3) moving = true;
      }
    });
    return moving;
  }

  function drawRover() {
    const { x: bx, y: by, h } = pose, c = Math.cos(h), s = Math.sin(h);
    const at = (u, w) => [bx + u * c - w * s, by + u * s + w * c];
    put(el.chassis, prism(P, front, xf(CHASSIS[0], bx, by, h), xf(CHASSIS[1], bx, by, h), 14, 29));
    put(el.bumper, prism(P, front, xf(BUMPER[0], bx, by, h), xf(BUMPER[1], bx, by, h), 15, 25));
    const ax = -s, ay = c;
    const nearSide = facing(ax, ay) ? 1 : -1;
    const body = xf(CHASSIS[0], bx, by, h);
    bodyHit = hull(body.map(q => P(q.u, q.v, 14)).concat(body.map(q => P(q.u, q.v, 29))));
    nearNow = nearSide;
    for (const side of el.sides) {
      const w0 = side.side * WHEEL_W;
      side.wheels.forEach((w, i) => { const [cx, cy] = at(WHEEL_U[i], w0); w.depth = cx + cy; wheel(w, cx, cy, ax, ay, pose.spin + burns[i].spin, pose.step + burns[i].step); });
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
    // Head on its yoke: the table turns to the pointer and carries the arms, the head nods
    // between them, and its face is a screen.
    const [hx, hy] = at(HEAD_AT, 0), hh = h + yaw.x, hc = Math.cos(hh), hs = Math.sin(hh);
    const pc = Math.cos(pitch.x), ps = Math.sin(pitch.x);
    // a point in the head's own frame (u forward, w left, z up from the pivot), and a direction
    const hp = (u, w, z) => { const u1 = u * pc - z * ps; return P(hx + u1 * hc - w * hs, hy + u1 * hs + w * hc, HEAD_Z + u * ps + z * pc); };
    const hd = (u, w, z) => { const u1 = u * pc - z * ps; return [u1 * hc - w * hs, u1 * hs + w * hc, u * ps + z * pc]; };
    const seen = ([x, y, z]) => x + y + z * .8165 > 1e-6;
    const sideOn = facing(-hs, hc) ? 1 : -1;
    put(el.head.table, prism(P, front, xf(TABLE[0], hx, hy, 0), xf(TABLE[1], hx, hy, 0), 29, TABLE_TOP));
    // notches round the table's rim turn with it; the one in front is the head's heading
    let nd = '';
    for (let k = 0; k < 36; k++) {
      const a = hh + k / 36 * Math.PI * 2, nx = Math.cos(a), ny = Math.sin(a), x = hx + nx * 16.4, y = hy + ny * 16.4;
      if (nx + ny > .25) nd += seg(P(x, y, k ? 29.8 : 29.3), P(x, y, k ? 30.9 : 31.2));
    }
    set(el.head.notches, 'd', nd);
    // each arm is a plate; along the edges that turn toward us its near face leaves a crease
    const ap = (u, w, z) => P(hx + u * hc - w * hs, hy + u * hs + w * hc, z);
    const edge = run(ARM, q => seen([q.nu * hc, q.nu * hs, q.nz]));
    el.head.arms.forEach(arm => {
      const [wi, wo] = ARM_W.map(v => v * arm.side), wn = arm.side === sideOn ? wo : wi;
      const plate = ARM.map(q => ap(q.u, wi, q.z)).concat(ARM.map(q => ap(q.u, wo, q.z)));
      put(arm, { sil: poly(hull(plate)), crease: open(edge.map(q => ap(q.u, wn, q.z))) });
    });
    const shell = [];
    [[HEAD[1], -HEAD_H], [HEAD[0], 1.4 - HEAD_H], [HEAD[0], HEAD_H - 1.4], [HEAD[1], HEAD_H]].forEach(([ring, z]) => ring.forEach(q => shell.push(hp(q.u, q.v, z))));
    const rim = seen(hd(0, 0, 1)) ? run(HEAD[1], q => seen(hd(q.nu, q.nv, 0))) : [];
    put(el.head.box, { sil: poly(hull(shell)), crease: open(rim.map(q => hp(q.u, q.v, HEAD_H))) });
    const faceOn = seen(hd(1, 0, 0));
    [el.head.screen, el.head.glare, ...el.head.eyes].forEach(p => { p.style.display = faceOn ? '' : 'none'; });
    const F = 11.05, lookW = lookX.x * 1.7, lookZ_ = .2 + lookZ.x * 1.3;
    if (faceOn) {
      set(el.head.screen, 'd', poly(SCREEN.map(q => hp(F, q.u, q.v))));
      set(el.head.glare, 'd', open([hp(F, -8.5, 4.9), hp(F, -6.8, 3.2)]) + open([hp(F, -8.7, 2.5), hp(F, -8.3, 2.1)]));
      el.head.eyes.forEach((eye, i) => {
        const e = face[i], cw = (i ? -4.6 : 4.6) + lookW, top = [], bot = [];
        for (let k = 0; k < EYE_N; k++) {
          const t = -1 + 2 * k / (EYE_N - 1), w = cw + t * e.w / 2, mid = (e.top[k] + e.bot[k]) / 2;
          top.push(hp(F, w, lookZ_ + mid + (e.top[k] - mid) * blink));
          bot.push(hp(F, w, lookZ_ + mid + (e.bot[k] - mid) * blink));
        }
        set(eye, 'd', poly(top.concat(bot.reverse())));
      });
    }
    anchors.eye = hp(F, 4.6 + lookW, lookZ_);
    // the pivot the head nods on, on the arm that faces us: a disc whose marks turn with the
    // nod. The far arm paints under the head, the near one over it.
    const pw = sideOn * (ARM_W[1] + .1), qx = hx - pw * hs, qy = hy + pw * hc;
    set(el.head.pivot, 'd', poly(ring2(qx, qy, HEAD_Z, hc, hs, 0, 0, 0, 1, 2.7, 20)));
    let pd = poly(ring2(qx, qy, HEAD_Z, hc, hs, 0, 0, 0, 1, 1.1, 12));
    for (let k = 0; k < 3; k++) {
      const a = Math.PI / 2 + pitch.x + k * Math.PI * 2 / 3, c = Math.cos(a), sn = Math.sin(a);
      pd += seg(P(qx + hc * c * 1.1, qy + hs * c * 1.1, HEAD_Z + sn * 1.1), P(qx + hc * c * 2.2, qy + hs * c * 2.2, HEAD_Z + sn * 2.2));
    }
    set(el.head.hub, 'd', pd);
    const nearArm = el.head.arms.find(a => a.side === sideOn), farArm = el.head.arms.find(a => a.side !== sideOn);
    if (el.head.notches.nextSibling !== farArm.g) el.head.g.insertBefore(farArm.g, el.head.notches.nextSibling);
    if (nearArm.g.nextSibling !== el.head.pivot) el.head.g.insertBefore(nearArm.g, el.head.pivot);
    // Antenna: a mast with a ball on top that leans toward the pointer.
    const [ax0, ay0] = at(ANT[0], ANT[1]);
    put(el.antenna.base, prism(P, front, xf(circ(2.3, 18), ax0, ay0, 0), null, 29, 32));
    const tip = [ax0 + leanX.x, ay0 + leanY.x, ANT_TOP];
    const band = [ax0 + leanX.x * .55, ay0 + leanY.x * .55, 50];
    set(el.antenna.mast, 'd', open([P(ax0, ay0, 32), P(...band), P(...tip)]));
    set(el.antenna.band, 'd', poly(ring2(band[0], band[1], band[2], 1, 0, 0, 0, 1, 0, 1.6, 14)));
    set(el.antenna.tip, 'd', poly(ring2(tip[0], tip[1], tip[2], CS, -CS, 0, 0, 0, 1, 2.3, 18)));

    anchors.head = hp(0, 0, HEAD_H);
    anchors.lidar = P(lx, ly, 39.5);
    anchors.antenna = P(tip[0], tip[1], tip[2] + 2.3);
    const nearWheel = el.sides.find(sd => sd.side === nearSide).wheels.reduce((a, b) => (b.depth > a.depth ? b : a));
    const wi = el.sides.find(sd => sd.side === nearSide).wheels.indexOf(nearWheel);
    const [wx, wy] = at(WHEEL_U[wi], nearSide * (WHEEL_W + WHW + .9));
    anchors.wheel = P(wx, wy, WZ);

    // Paint order: the smoke, far wheels, far rocker, chassis, near rocker, near wheels, then the
    // deck parts from the back. Reordered only when the order actually changes.
    const far = el.sides.find(sd => sd.side !== nearSide), near = el.sides.find(sd => sd.side === nearSide);
    const byDepth = list => list.slice().sort((a, b) => a.depth - b.depth);
    el.head.depth = hx + hy; el.lidar.depth = lx + ly; el.antenna.depth = ax0 + ay0;
    const bumperFront = facing(c, s);
    const order = [
      smokeG, ...byDepth(far.wheels).map(w => w.g), far.rocker,
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
  // The trail's two edges are drawn in pieces, so as the rover drives on only the piece it is
  // on is redrawn, not the whole trail across the screen.
  let edges = [];
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
  function buildEdges() {
    edges.forEach(e => e.el.remove());
    edges = [];
    for (const list of [route.L, route.R])
      for (let i = 0; i < list.length - 1; i += 16) {
        const j = Math.min(i + 16, list.length - 1);
        edges.push({ el: mk('path', { class: 'nf sil' }, trailG), list, a: route.s[i], b: route.s[j] });
      }
  }
  function buildMarks(markersWorld) {
    // A relayout keeps each pillar's rise where it was, so nothing collapses and regrows.
    const previous = marks;
    marks = markersWorld.map(([x, y], i) => {
      const g = mk('g');
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
    });
    return busy;
  }

  const forest = window.HLForest({ P, front, facing, water: waterG, ground: groundG });

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
      const c = mk('circle', { cx: (rnd() * W).toFixed(1), cy: ((rnd() * 1.25 - .1) * tall).toFixed(1), r: (bright ? 1.1 + rnd() * .6 : .5 + rnd() * .5).toFixed(2) }, starsG);
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
    [sky, nearSvg, fxSvg, floorSvg, svg].forEach(s => s.setAttribute('viewBox', `0 0 ${W} ${H}`));
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
    buildEdges();
    buildMarks(marksWorld);

    // The forest, placed for this layout: measured against the journey camera, it keeps the
    // rover's corridor and the heading clear and thins out under the cards and the globe.
    const toScreen = (x, y, z) => { const p = P(x, y, z); return [origin[0] + Sj * p[0], origin[1] + Sj * p[1]]; };
    toScreen.inverse = (sx, sy) => unP((sx - origin[0]) / Sj, (sy - origin[1]) / Sj);
    toScreen.scale = Sj;
    const box = el => el ? { l: el.offsetLeft, t: el.offsetTop, r: el.offsetLeft + el.offsetWidth, b: el.offsetTop + el.offsetHeight } : null;
    const orbit = wide ? box(stage.querySelector('.skills-orbit')) : null;
    const blocked = wide ? [...cards.map(box), orbit].filter(Boolean) : [];
    // Text on the stage keeps a clear ground behind it: the heading, and the globe's caption and button.
    const head = wide ? box(stage.querySelector('.journey-heading')) : null;
    const clear = [head && { l: head.l - 18, t: head.t - 14, r: head.r + 40, b: head.b + 14 }, orbit && { l: orbit.l - 10, t: orbit.b + 6, r: orbit.r + 10, b: orbit.b + 140 }].filter(Boolean);
    const forestItems = reduced ? [] : forest.build({
      route, pointAt, marks: marksWorld, plinth: PR, toScreen, W, H, blocked,
      clear,
      budget: wide ? 230 : narrow ? 100 : 160, seed: 20261025
    });
    if (reduced) { waterG.replaceChildren(); groundG.replaceChildren(); }
    standing = [...forestItems, ...marks.map(m => ({ g: m.g, depth: m.x + m.y }))].sort((a, b) => a.depth - b.depth);
    objects.replaceChildren(...standing.map(o => o.g), roverG);
    roverSlot = -1;
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
    if (starSize !== `${W}x${H}`) {
      starSize = `${W}x${H}`; buildStars();
      cosmos?.build({ W, H, tall: Math.max(H, window.screen.height || H), narrow });
    }
    drawnPose = drawnTrail = '';
    drawn = null;
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
  let pointer = null, pointerOn = null;
  let lastInput = performance.now();
  addEventListener('pointermove', e => { if (e.pointerType === 'touch' && !e.isPrimary) return; pointer = [e.clientX, e.clientY]; pointerOn = e.target; lastInput = performance.now(); schedule(); }, { passive: true });
  addEventListener('pointerdown', e => { pointer = [e.clientX, e.clientY]; lastInput = performance.now(); schedule(); }, { passive: true });
  const release = e => { if (e.pointerType !== 'mouse') { pointer = null; schedule(); } };
  addEventListener('pointerup', release, { passive: true });
  addEventListener('pointercancel', release, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { pointer = null; schedule(); });
  addEventListener('blur', () => { pointer = null; schedule(); });

  // A click on a wheel (not on the page's own controls or text over it) sets its axle spinning;
  // more clicks keep it going a while longer.
  const PASS = 'a, button, input, select, textarea, label, summary, dialog, [tabindex], .topic, article, h1, h2, h3, h4, p';
  const inside = ([x, y], pts) => {
    let c = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  /** The axle of the wheel at a screen point, or -1: near wheels first, far ones only where the body does not hide them. */
  function wheelAt(x, y, target) {
    const C = state.cam;
    if (!C || reduced || intro || state.phi > 2.4 || target?.closest?.(PASS)) return -1;
    const q = [(x - C.ox) / C.S, (y - C.oy) / C.S];
    let hit = -1, best = -Infinity;
    for (const sd of el.sides) {
      const near = sd.side === nearNow;
      sd.wheels.forEach((w, i) => {
        const rank = w.depth + (near ? 1e6 : 0);
        if (w.hit && rank > best && inside(q, w.hit) && (near || !inside(q, bodyHit))) { hit = i; best = rank; }
      });
    }
    return hit;
  }
  addEventListener('click', e => {
    const i = e.button ? -1 : wheelAt(e.clientX, e.clientY, e.target);
    if (i < 0) return;
    const now = performance.now(), b = burns[i];
    b.until = Math.min(now + 3600, Math.max(b.until, now) + 1500);
    burnGlad = b.until + 2600;
    lastInput = now;
    schedule();
  });

  // ---- the loop ----------------------------------------------------------------------------
  let raf = 0, last = 0, part = '', settled = false, drawnPose = '', drawnTrail = '', windFrom = null, camM = '', still = 0, atRest = false, strokesAtRest = false, drawn = null, drawnM = '';
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
    const sKey = C.S.toFixed(4);
    if (m !== camM) { camM = m; still = 0; } else still++;
    atRest = still >= 2;
    if (!atRest) busy = true;
    // While the camera moves, the floor and the scene are redrawn only now and then: in between,
    // the compositor carries their last raster to where the camera now is (moved, and scaled by
    // under 1.5%, which reads as a fresh drawing). Once the camera rests they are drawn for it.
    const D = drawn || C, kz = C.S / D.S, tx = C.ox - kz * D.ox, ty = C.oy - kz * D.oy;
    if (!drawn || (atRest ? m !== drawnM || !strokesAtRest : Math.abs(kz - 1) > .015 || Math.hypot(tx, ty) > Math.max(W, H) * .12)) {
      drawn = C; drawnM = m;
      set(cam, 'transform', m); set(floorCam, 'transform', m);
      floorSvg.style.transform = svg.style.transform = '';
      // At rest the scene's strokes are scaled to the camera rather than held at a pixel by
      // vector-effect, so the GPU keeps the paths that did not change from frame to frame; on
      // the move every path is redrawn anyway, and vector-effect spares restyling them all.
      // The switch is made only here, where everything is being redrawn regardless.
      if (atRest !== strokesAtRest) {
        strokesAtRest = atRest;
        if (atRest) svg.style.setProperty('--cam-s', sKey);
        svg.classList.toggle('at-rest', atRest);
      }
    } else floorSvg.style.transform = svg.style.transform = drawnM === m ? '' : `matrix(${kz.toFixed(5)},0,0,${kz.toFixed(5)},${tx.toFixed(2)},${ty.toFixed(2)})`;
    if (stepIntro(now)) busy = true;
    // the floor's fade belongs to the drawn camera, so the compositor carries it with the grid
    set(grad, 'cx', drawn.fx.toFixed(1)); set(grad, 'cy', drawn.fy.toFixed(1)); set(grad, 'r', (drawn.r * (intro ? Math.max(.001, intro.grid) : 1)).toFixed(1));
    fadeTo(gridFine, clamp((C.S - 1.7) / 1.6, 0, 1));
    // Over the forest the floor steps back, so the trees carry the drawing.
    gridCoarse.style.opacity = lerp(1, .42, smooth(clamp((phi - .35) / .6, 0, 1))).toFixed(3);
    const sceneOn = reduced ? (scrollY < innerHeight * .6 ? 1 : .35) : phi < 2.55 ? 1 : phi < 3 ? lerp(1, .18, smooth((phi - 2.55) / .45)) : lerp(.18, 0, smooth(clamp(phi - 3, 0, 1)));
    fadeTo(floorSvg, sceneOn); fadeTo(svg, sceneOn);
    const starsOn = reduced ? 0 : smooth(clamp((phi - 3.05) / .8, 0, 1));
    fadeTo(sky, starsOn); fadeTo(nearSvg, starsOn); fadeTo(fxSvg, starsOn);
    // the sky rises into place and leans to the pointer on its own loop, moved by the compositor
    if (cosmos) cosmos.drive(starsOn > 0, phi);
    else if (starsOn > 0) sky.style.transform = `translateY(${(-(phi - 3) * H * .08).toFixed(1)}px)`;
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
    pose.step = Math.abs(moved) / WR;
    if (stepBurns(now, dt)) busy = true;
    // a burnout slews the rover a little either way about where it stands
    pose.h += Math.sin(now * .013) * .05 * burnI;
    const trailKey = `${state.routeShown.toFixed(4)} ${s.toFixed(2)}`;
    if (trailKey !== drawnTrail) {
      drawnTrail = trailKey;
      set(trailPlan, 'd', slice(route.C, route.exit, route.len * state.routeShown));
      const upTo = Math.max(route.exit, s);
      edges.forEach(e => set(e.el, 'd', slice(e.list, Math.max(route.exit, e.a), Math.min(upTo, e.b))));
    }

    // The rover takes its place among the standing things by depth.
    {
      const d = pose.x + pose.y;
      let lo = 0, hi = standing.length;
      while (lo < hi) { const m = (lo + hi) >> 1; if (standing[m].depth <= d) lo = m + 1; else hi = m; }
      if (lo !== roverSlot) { roverSlot = lo; objects.insertBefore(roverG, standing[lo] ? standing[lo].g : null); }
    }
    // Once the world has faded behind Projects it quiets: no wind, and the rover stops looking.
    const heard = sceneOn > .5 ? pointer : null;
    const ground = heard ? unP((heard[0] - C.ox) / C.S, (heard[1] - C.oy) / C.S) : null;
    // How far the pointer itself moved over the ground, not the camera under it: the wind's gust.
    const drift = heard && windFrom ? unP((heard[0] - windFrom[0]) / C.S, (heard[1] - windFrom[1]) / C.S) : null;
    windFrom = heard && [heard[0], heard[1]];
    if (forest.update({ phi, pointer: ground, drift, rover: [pose.x, pose.y], moved, shown: state.routeShown * route.len, reduced, dt })) busy = true;

    // Active chapter from the real scroll, so the marker lights with its card.
    const t = state.target;
    state.active = t >= 1 && t <= 2.6 ? Math.min(4, Math.floor((Math.min(t, 2) - 1) * 5)) : -1;
    if (drawMarks(now, state.active)) busy = true;

    // The pointer: the head turns to it on the ground, the eyes find it on screen.
    if (heard && !reduced) {
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
      // the head nods up to a pointer above it and down to one below
      const up = pointer[1] - (C.oy + C.S * P(hx, hy, HEAD_Z)[1]);
      pitch.t = clamp(-up / (C.S * 110), -1, 1) * (up < 0 ? .4 : .28);
      document.documentElement.classList.toggle('over-wheel', wheelAt(pointer[0], pointer[1], pointerOn) >= 0);
    } else {
      document.documentElement.classList.remove('over-wheel');
      yaw.t = reduced ? .32 : .32 * (1 - k); lookX.t = .45; lookZ.t = -.2; leanX.t = 0; leanY.t = 0; pitch.t = 0;
    }
    // The face's mood: glad with the pointer on it, intent while it hurries along the trail,
    // drowsy once nothing has happened for a while, and now and then a passing mood of its own.
    let want = 'open';
    if (!reduced && !intro) {
      const top = anchors.head && [C.ox + C.S * anchors.head[0], C.oy + C.S * anchors.head[1]];
      if (burnI > .15) want = 'squint';
      else if (heard && top && Math.hypot(pointer[0] - top[0], pointer[1] - top[1] - C.S * 8) < C.S * 30) want = 'happy';
      else if (Math.abs(moved) > .8) want = 'squint';
      else if (now < burnGlad) want = 'happy';
      else if (now - lastInput > 6000) want = 'sleepy';
      else if (now < moodUntil) want = mood;
    }
    if (want === 'sleepy') pitch.t = -.22;
    // with the pointer on its head it turns to the one looking at it
    else if (want === 'happy') { yaw.t = clamp(wrap(Math.PI / 4 - pose.h), -.95, .95); pitch.t = .16; lookX.t = 0; lookZ.t = .2; }
    // the antenna whips about over a burnout
    if (burnI) { leanX.t += Math.sin(now * .023) * 2.6 * burnI; leanY.t += Math.cos(now * .019) * 2.6 * burnI; }
    for (const sp of [yaw, lookX, lookZ, leanX, leanY, pitch]) if (stepS(sp, dt)) busy = true;
    if (stepFace(want, dt)) { busy = true; faceVer++; }
    if (Math.abs(moved) > 1e-3) { const kick = clamp(moved, -3, 3) * 2.5; leanX.v -= Math.cos(pose.h) * kick; leanY.v -= Math.sin(pose.h) * kick; }

    // Ambient life while the rover is in view: the lidar sweeps, the eyes blink now and then.
    // Ambient life rests five seconds after the last scroll or pointer move, and wakes with the next.
    const ambient = !reduced && phi < 2.7 && now - lastInput < 5000;
    if (ambient) {
      lidarAngle += dt * 1.7;
      if (!intro) blinkAt -= dt;
      if (blinkAt <= 0 && blinkT < 0) { blinkT = 0; blinkAt = 3.5 + Math.random() * 4; }
      if (blinkT >= 0) { blinkT += dt; blink = blinkT < .09 ? 1 - blinkT / .09 * .9 : blinkT < .2 ? .1 + (blinkT - .09) / .11 * .9 : 1; if (blinkT >= .2) blinkT = -1; }
      if (!intro) moodAt -= dt;
      if (moodAt <= 0) {
        moodAt = 5 + Math.random() * 6;
        mood = ['happy', 'wide', 'wink', 'squint'][Math.floor(Math.random() * 4)];
        moodUntil = now + 1300 + Math.random() * 1200;
      }
    }
    // Wake once more when it is time to doze, so the face can get drowsy.
    if (!reduced && phi < 2.7 && want !== 'sleepy') { clearTimeout(napTimer); napTimer = setTimeout(schedule, Math.max(60, 6050 - (now - lastInput))); }
    const poseKey = [pose.x, pose.y, pose.h, pose.spin, pose.step, ...burns.flatMap(b => [b.spin, b.step]), yaw.x, lookX.x, lookZ.x, leanX.x, leanY.x, pitch.x, blink].map(v => v.toFixed(3)).join() + faceVer + m;
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
    if (burnI > .1) name = 'burnout';
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
