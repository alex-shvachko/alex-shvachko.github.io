/* OBSIDIAN X-01 — shared device engine.
   One object, one coordinate system, one timeline: every scene draws the same machine with
   dev.render(G), where G is the film's own seconds (kit.start + t). Units are world units;
   the monolith is 800 x 120 x 520 (x, y, z), centred on the origin, y up. */
(function () {
  'use strict';
  const TAU = Math.PI * 2, PI = Math.PI;
  const cl = x => x < 0 ? 0 : x > 1 ? 1 : x;
  const sg = (t, a, b) => cl((t - a) / (b - a));
  const lp = (a, b, p) => a + (b - a) * p;
  const llp = (a, b, p) => Math.exp(lp(Math.log(a), Math.log(b), p));
  const io3 = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(2 - 2 * x, 3) / 2;
  const io5 = x => x < .5 ? 16 * Math.pow(x, 5) : 1 - Math.pow(2 - 2 * x, 5) / 2;
  const o2 = x => 1 - (1 - x) * (1 - x);
  const o3 = x => 1 - Math.pow(1 - x, 3);
  const o5 = x => 1 - Math.pow(1 - x, 5);
  const bump = (t, a, b) => t <= a || t >= b ? 0 : Math.sin((t - a) / (b - a) * PI);
  const f1 = v => Math.round(v * 10) / 10;
  const f2 = v => Math.round(v * 100) / 100;
  const f4 = v => Math.round(v * 10000) / 10000;
  const deg = r => f2(r * 180 / PI);
  function rng(seed) {
    let s = seed >>> 0;
    return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function integ(K, x) {               // integral of a piecewise-linear speed profile, 0 before its first knot
    let s = 0;
    for (let i = 0; i < K.length - 1; i++) {
      const t0 = K[i][0], v0 = K[i][1], t1 = K[i + 1][0], v1 = K[i + 1][1];
      if (x <= t0) return s;
      const xe = x < t1 ? x : t1, ve = v0 + (v1 - v0) * ((xe - t0) / (t1 - t0));
      s += (xe - t0) * (v0 + ve) / 2;
      if (x < t1) return s;
    }
    const L = K[K.length - 1];
    return s + (x - L[0]) * L[1];
  }

  /* ---------------- the timeline ---------------- */
  const FZ0 = 17.22, FZ1 = 17.52;                       // everything holds still after the core pulse
  const M = G => G < FZ0 ? G : G < FZ1 ? FZ0 : G - (FZ1 - FZ0);
  const RK = [[10.2, 0], [11.3, 1], [15, 1], [17.2, 4.2], [17.23, .3], [17.7, .3], [18.3, -2], [20.6, -.6], [21.4, 0]];
  const HK = [[11, 0], [11.9, .35], [15, .35], [17.2, 3.2], [17.23, .3], [18.4, 0]];
  const FK = [[9.6, 0], [10.6, 1], [14.6, 1], [17.2, 3.4], [17.23, 1]];
  const RDIR = [1, -1, 1, -1], RMAG = [.5, .78, 1.12, 1.6], RPH = [.2, 1.1, 2.3, .7];
  const ringA = (k, G) => RPH[k] + RDIR[k] * RMAG[k] * integ(RK, M(G));
  // [open from, open to, close from, close to] — opened in "First separation", closed in "Reassembly"
  const EX = {
    locksR: [4.25, 4.75, 21.15, 21.45], locks: [4.55, 5.6, 20.55, 21.15], cover: [4.8, 6.2, 20.35, 21.05],
    pF: [5.15, 6.35, 19.95, 20.5], pR: [5.3, 6.5, 20.08, 20.63], pB: [5.45, 6.65, 20.21, 20.76], pL: [5.6, 6.8, 20.34, 20.89],
    plate2: [5.5, 6.8, 18.75, 20.1], plate1: [5.7, 7, 18.55, 19.9], boardB: [5.9, 7.2, 18.35, 19.7],
    rings: [6, 7.3, 18.1, 19.6], mods: [6.15, 7.4, 18.2, 19.45], boardA: [6.05, 7.35, 18, 19.35], chassis: [6.3, 7.6, 18.85, 20.15]
  };
  const ex = (k, G) => { const w = EX[k]; return G < 12 ? io3(sg(G, w[0], w[1])) : 1 - io5(sg(G, w[2], w[3])); };
  const DY = { chassis: -250, boardA: -150, mods: -78, boardB: 115, plate1: 185, plate2: 255, cover: 330, locks: 110 };
  function lit(G, b) {
    const a = .5 * io3(sg(G, 9.8 + b * .14, 10.9 + b * .14));
    const c = io3(sg(G, 14.4 + b * .16, 15.2 + b * .16));
    return Math.max(a, c) * (1 - .65 * sg(G, 18.1, 19.8)) * (1 - sg(G, 20.2, 20.9));
  }
  function core(G) {
    if (G < 13.55) return 0;
    let c = .28 * sg(G, 13.6, 13.85) + .42 * bump(G, 13.95, 14.6) + .72 * io3(sg(G, 14.5, 17));
    c *= 1 + .05 * Math.sin(M(G) * 7);
    return c * (1 - .4 * sg(G, 17.55, 18.3)) * (1 - sg(G, 18.6, 20.8));
  }
  const PAR = {
    slit: G => Math.max(.85 * bump(G, 1.8, 2.7), sg(G, 3.95, 4.25) * (1 - sg(G, 4.9, 5.7)), .95 * bump(G, 24, 24.8)),
    seam: G => bump(G, 4.15, 5.5),
    run: G => sg(G, 21.45, 22),
    holo: G => sg(G, 11, 11.9) * (1 - sg(G, 17.95, 18.45)),
    pulse: G => G < 17 ? 0 : o5(sg(G, 17, 17.22)),
    pulseA: G => G < 17 ? 0 : 1 - sg(G, 17.52, 17.95),
    glass: G => lp(.96, .5, ex('cover', G)),
    amber: G => .9 * bump(G, 6.3, 8.4),
    edge: G => .45 + .55 * o3(sg(G, .3, 3.6)),
    flow: G => 110 * integ(FK, M(G)),
    holoA: G => integ(HK, M(G)),
    lit, core
  };

  /* ---------------- the camera ---------------- */
  const CP = [
    { yaw: .98, pitch: .30, dist: 2400, f: 2400, tx: 0, ty: 0, tz: 0, oy: 30, roll: -.02 },
    { yaw: .66, pitch: .38, dist: 2600, f: 2340, tx: 0, ty: 0, tz: 0, oy: 10, roll: 0 },
    { yaw: .50, pitch: .44, dist: 3300, f: 2046, tx: 0, ty: 95, tz: 0, oy: 0, roll: 0 },
    { yaw: 1.70, pitch: 1.565, dist: 122, f: 276, tx: 0, ty: -22, tz: 0, oy: 0, roll: 0 },
    { yaw: 1.95, pitch: 1.565, dist: 116, f: 276, tx: 10, ty: -22, tz: -14, oy: 0, roll: 0 },
    { yaw: .62, pitch: .36, dist: 2900, f: 2200, tx: 0, ty: 0, tz: 0, oy: -165, roll: 0 }
  ];
  function mixCam(A, B, p, q) {
    const o = {};
    for (const k in A) { const pk = q && q[k] != null ? q[k] : p; o[k] = (k === 'dist' || k === 'f') ? llp(A[k], B[k], pk) : lp(A[k], B[k], pk); }
    return o;
  }
  function camAt(G) {
    if (G < 4) return mixCam(CP[0], CP[1], o2(sg(G, 0, 4)));
    if (G < 8) return mixCam(CP[1], CP[2], io3(sg(G, 4.1, 8)));
    if (G < 12.75) { const u = sg(G, 8, 12.75); return mixCam(CP[2], CP[3], io3(u), { pitch: io3(sg(u, 0, .62)) }); }
    if (G < 18) return mixCam(CP[3], CP[4], io3(sg(M(G), 12.75, 17.7)));
    const u = sg(G, 18, 21.9);
    return mixCam(CP[4], CP[5], io3(u), { pitch: io3(sg(u, .28, 1)), oy: io3(sg(u, .45, 1)) });
  }
  function View() { this.pos = [0, 0, 0]; }
  View.prototype.set = function (c) {
    const sy = Math.sin(c.yaw), cy = Math.cos(c.yaw), sp = Math.sin(c.pitch), cp = Math.cos(c.pitch);
    this.F = [-sy * cp, -sp, -cy * cp]; this.R = [cy, 0, -sy]; this.U = [-sy * sp, cp, -cy * sp];
    this.pos = [c.tx + c.dist * sy * cp, c.ty + c.dist * sp, c.tz + c.dist * cy * cp];
    this.f = c.f; this.cx = 960; this.cy = 540 + c.oy; this.cr = Math.cos(c.roll); this.sr = Math.sin(c.roll); this.c = c;
    return this;
  };
  View.prototype.P = function (x, y, z) {
    const dx = x - this.pos[0], dy = y - this.pos[1], dz = z - this.pos[2], F = this.F, R = this.R, U = this.U;
    const d = dx * F[0] + dy * F[1] + dz * F[2];
    const k = this.f / (d > .001 ? d : .001);
    const sx = (dx * R[0] + dz * R[2]) * k, sy = -(dx * U[0] + dy * U[1] + dz * U[2]) * k;
    return [this.cx + sx * this.cr - sy * this.sr, this.cy + sx * this.sr + sy * this.cr, d];
  };
  // affine of a flat face: local (u,v) -> screen, fitted through the face centre
  View.prototype.aff = function (C, U, V, hu, hv) {
    const p = this.P(C[0], C[1], C[2]);
    const a1 = this.P(C[0] + U[0] * hu, C[1] + U[1] * hu, C[2] + U[2] * hu), a0 = this.P(C[0] - U[0] * hu, C[1] - U[1] * hu, C[2] - U[2] * hu);
    const b1 = this.P(C[0] + V[0] * hv, C[1] + V[1] * hv, C[2] + V[2] * hv), b0 = this.P(C[0] - V[0] * hv, C[1] - V[1] * hv, C[2] - V[2] * hv);
    return 'matrix(' + f4((a1[0] - a0[0]) / (2 * hu)) + ',' + f4((a1[1] - a0[1]) / (2 * hu)) + ',' + f4((b1[0] - b0[0]) / (2 * hv)) + ',' + f4((b1[1] - b0[1]) / (2 * hv)) + ',' + f2(p[0]) + ',' + f2(p[1]) + ')';
  };
  const XA = [1, 0, 0], ZA = [0, 0, 1];
  View.prototype.affH = function (x, y, z, r) { return this.aff([x, y, z], XA, ZA, r, r); };

  /* ---------------- materials and light ---------------- */
  const PAL = { dk: [2, 3, 5], gr: [16, 19, 24], ti: [36, 42, 50], si: [137, 151, 165], ic: [98, 230, 255], wh: [244, 250, 255] };
  const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const rgba = (c, a) => 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + f2(cl(a)) + ')';
  const nrm = v => { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };
  const LK = nrm([-.35, .6, .72]), LR = nrm([.8, .25, -.55]);
  const C0 = mixc(PAL.dk, PAL.gr, .7), C2 = mixc(PAL.ti, PAL.si, .26);
  function shade(mat, N, top, G, gain) {
    const k = Math.max(0, N[0] * LK[0] + N[1] * LK[1] + N[2] * LK[2]), r = Math.max(0, N[0] * LR[0] + N[1] * LR[1] + N[2] * LR[2]);
    const edge = rgba(mixc(PAL.si, PAL.ic, .45 * r), (.1 + .3 * k + .45 * r) * gain);
    if (mat === 'glass') return [rgba(PAL.ic, top ? .03 + .03 * k : .1), rgba(mixc(PAL.si, PAL.ic, .6), (.35 + .35 * r) * gain)];
    if (top && mat === 'smoke') return [rgba(mixc(PAL.gr, PAL.dk, .3), PAR.glass(G)), rgba(PAL.si, (.22 + .2 * k) * gain)];
    let c = k < .6 ? mixc(C0, PAL.ti, k / .6) : mixc(PAL.ti, C2, (k - .6) / .4);
    if (mat === 'pcb') c = mixc(c, PAL.dk, top ? .55 : .3);
    return [rgba(c, 1), edge];
  }

  /* ---------------- procedural detail (each part's own flat coordinates) ---------------- */
  const pt = (r, a) => f1(r * Math.cos(a)) + ' ' + f1(r * Math.sin(a));
  const CI = (x, y, r) => 'M' + f1(x - r) + ' ' + f1(y) + 'a' + r + ' ' + r + ' 0 1 0 ' + 2 * r + ' 0a' + r + ' ' + r + ' 0 1 0 ' + -2 * r + ' 0';
  const RC = (x, y, w, h) => 'M' + f1(x) + ' ' + f1(y) + 'h' + f1(w) + 'v' + f1(h) + 'h' + f1(-w) + 'z';
  const RR = (x, y, w, h, r) => 'M' + f1(x + r) + ' ' + f1(y) + 'h' + f1(w - 2 * r) + 'a' + r + ' ' + r + ' 0 0 1 ' + r + ' ' + r + 'v' + f1(h - 2 * r) + 'a' + r + ' ' + r + ' 0 0 1 ' + -r + ' ' + r + 'h' + f1(2 * r - w) + 'a' + r + ' ' + r + ' 0 0 1 ' + -r + ' ' + -r + 'v' + f1(2 * r - h) + 'a' + r + ' ' + r + ' 0 0 1 ' + r + ' ' + -r + 'z';
  const PL = (P, z) => 'M' + P.map(p => f1(p[0]) + ' ' + f1(p[1])).join('L') + (z ? 'z' : '');
  const OCT = r => PL(Array.from({ length: 8 }, (_, i) => [r * Math.cos(PI / 8 + i * PI / 4), r * Math.sin(PI / 8 + i * PI / 4)]), 1);
  const pa = (cls, d, x) => '<path class="' + cls + '" d="' + d + '"' + (x || '') + '/>';
  const band = (ra, rb, a0, a1) => 'M' + pt(ra, a0) + 'A' + ra + ' ' + ra + ' 0 0 1 ' + pt(ra, a1) + 'L' + pt(rb, a1) + 'A' + rb + ' ' + rb + ' 0 0 0 ' + pt(rb, a0) + 'z';

  function route(rnd, th, o) {                       // an octilinear trace leaving the core outward
    let d = Math.round(th / (TAU / 8)) & 7, x = Math.cos(th) * o.r0, y = Math.sin(th) * o.r0;
    const P = [[x, y]], legs = 2 + Math.floor(rnd() * 3), m = 22;
    for (let i = 0; i < legs; i++) {
      const a = d * TAU / 8, ux = Math.round(Math.cos(a) * 1e6) / 1e6, uy = Math.round(Math.sin(a) * 1e6) / 1e6;
      let L = 26 + rnd() * 120;
      if (ux) L = Math.min(L, ((ux > 0 ? o.hw - m : m - o.hw) - x) / ux);
      if (uy) L = Math.min(L, ((uy > 0 ? o.hd - m : m - o.hd) - y) / uy);
      if (L < 8) break;
      x += ux * L; y += uy * L; P.push([x, y]);
      let nd = (d + (rnd() < .5 ? 1 : 7)) & 7;
      const na = nd * TAU / 8;
      if (Math.cos(na) * x + Math.sin(na) * y < 0) nd = (nd === ((d + 1) & 7)) ? (d + 7) & 7 : (d + 1) & 7;
      d = nd;
    }
    return P;
  }
  function offs(P, o) {
    const n = P.length, N = [], out = [];
    for (let i = 0; i < n - 1; i++) { const dx = P[i + 1][0] - P[i][0], dy = P[i + 1][1] - P[i][1], l = Math.hypot(dx, dy) || 1; N.push([-dy / l, dx / l]); }
    for (let i = 0; i < n; i++) {
      let nx, ny, s = 1;
      if (i === 0) { nx = N[0][0]; ny = N[0][1]; } else if (i === n - 1) { nx = N[n - 2][0]; ny = N[n - 2][1]; }
      else { const a = N[i - 1], b = N[i]; nx = a[0] + b[0]; ny = a[1] + b[1]; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l; s = 1 / Math.max(.5, nx * a[0] + ny * a[1]); }
      out.push([P[i][0] + nx * o * s, P[i][1] + ny * o * s]);
    }
    return out;
  }
  function circuits(seed, o) {
    const rnd = rng(seed), B = [[], [], [], []];
    let pads = '', vias = '';
    for (let b = 0; b < o.n; b++) {
      const th = (b + .2 + rnd() * .6) / o.n * TAU, P = route(rnd, th, o);
      if (P.length < 2) continue;
      const q = Math.min(3, Math.floor(th / (TAU / 4))), k = o.k ? o.k : 2 + Math.floor(rnd() * 4);
      for (let i = 0; i < k; i++) {
        const L = offs(P, (i - (k - 1) / 2) * 7), e = L[L.length - 1];
        B[q].push(PL(L)); pads += RC(e[0] - 2.5, e[1] - 2.5, 5, 5);
        if (!i) vias += CI(L[0][0], L[0][1], 2.6);
      }
    }
    const bands = B.map(a => a.join(''));
    return { bands, all: bands.join(''), pads, vias };
  }
  const litM = bands => '<g>' + bands.map((d, i) => pa('ox-lt', d, ' data-b="' + i + '"') + pa('ox-fl', d, ' data-b="' + i + '"')).join('') + '</g>';
  const pulseM = n => '<circle class="ox-pls" clip-path="url(#§c' + n + ')" r="1"/>';

  function boardM(seed, hole, n) {
    const o = { hw: 370, hd: 230, r0: hole ? 222 : 84, n }, c = circuits(seed, o), rnd = rng(seed + 99);
    let fine = '', smd = '', fast = '', edge = '';
    const rp = o.r0 - 9;
    for (let i = 0; i < 128; i++) { const a = i / 128 * TAU; fine += 'M' + pt(rp, a) + 'L' + pt(rp + 5, a); }
    for (let i = 0; i < 54; i++) {
      const x = (rnd() * 2 - 1) * 330, y = (rnd() * 2 - 1) * 196;
      if (Math.hypot(x, y) < o.r0 + 20) continue;
      smd += rnd() < .5 ? RC(x, y, 7, 3.5) + RC(x, y + 5, 7, 3.5) : RC(x, y, 3.5, 7) + RC(x + 5, y, 3.5, 7);
    }
    for (const s of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const x = s[0] * 350, y = s[1] * 210; fast += CI(x, y, 7) + 'M' + (x - 4) + ' ' + y + 'h8M' + x + ' ' + (y - 4) + 'v8'; }
    for (let x = -190; x <= 190; x += 10) edge += RC(x - 2.5, 214, 5, 10);
    const chips = hole ? [[-300, -170], [300, 170], [-300, 170], [300, -170]] : [[-150, -200], [150, 200]];
    let ch = '', pins = '';
    for (const p of chips) {
      ch += RC(p[0] - 30, p[1] - 18, 60, 36);
      for (let x = -24; x <= 24; x += 6) pins += 'M' + (p[0] + x) + ' ' + (p[1] - 18) + 'v-5M' + (p[0] + x) + ' ' + (p[1] + 18) + 'v5';
    }
    let sock = '';
    if (!hole) for (const m of MODS) sock += RC(m[0] - 36, m[1] - 26, 72, 52);
    let grid = '';
    if (!hole) for (let i = -5; i <= 5; i++) for (let j = -5; j <= 5; j++) grid += RC(i * 9 - 2, j * 9 - 2, 4, 4);
    const base = hole ? pa('ox-pcbt', RC(-370, -230, 740, 460) + CI(0, 0, 214), ' fill-rule="evenodd"') : '';
    const spill = hole ? '' : '<circle class="ox-spill" clip-path="url(#§cboardA)" r="300" fill="url(#§gs)"/>';
    return base + spill + pa('ox-pin', fine + fast) + pa('ox-tr', c.all) + pa('ox-pd', c.pads + c.vias + smd + edge + grid) +
      pa('ox-eng', sock) + pa('ox-chip', ch) + pa('ox-pin', pins) + litM(c.bands) + pulseM(hole ? 'boardB' : 'boardA');
  }
  function chassisM() {
    let fins = '', dots = '', boss = '';
    for (let x = -352; x <= -128; x += 9) fins += 'M' + x + ' -196V196';
    for (let x = 128; x <= 352; x += 9) fins += 'M' + x + ' -196V196';
    for (let i = -3.5; i <= 3.5; i++) for (let j = -3.5; j <= 3.5; j++) dots += RC(i * 20 - 3, j * 20 - 3, 6, 6);
    for (const p of [[-372, -206], [372, -206], [372, 206], [-372, 206], [-110, 0], [110, 0], [0, -214], [0, 214]]) boss += CI(p[0], p[1], 9) + CI(p[0], p[1], 4);
    const rails = 'M-386 -238H386M-386 -228H386M-386 238H386M-386 228H386';
    return pa('ox-eng2', fins + rails) + pa('ox-chip', RR(-96, -96, 192, 192, 10)) + pa('ox-pd', dots) + pa('ox-pin', boss) + pulseM('chassis');
  }
  function plate1M() {
    const hw = 352, hd = 212;
    let d = '', pads = '';
    for (let c = -hw - hd; c <= hw + hd; c += 26) {
      let u0 = Math.max(-hw, -hd - c), u1 = Math.min(hw, hd - c);
      if (u1 > u0) d += 'M' + f1(u0) + ' ' + f1(u0 + c) + 'L' + f1(u1) + ' ' + f1(u1 + c);
      u0 = Math.max(-hw, c - hd); u1 = Math.min(hw, c + hd);
      if (u1 > u0) d += 'M' + f1(u0) + ' ' + f1(c - u0) + 'L' + f1(u1) + ' ' + f1(c - u1);
    }
    for (let x = -344; x <= 344; x += 16) pads += RC(x - 1.5, -224, 3, 7) + RC(x - 1.5, 217, 3, 7);
    for (let y = -200; y <= 200; y += 16) pads += RC(-364, y - 1.5, 7, 3) + RC(357, y - 1.5, 7, 3);
    const c = circuits(41, { hw: 360, hd: 220, r0: 150, n: 12, k: 2 });
    return pa('ox-grid', d) + pa('ox-gridb', RR(-352, -212, 704, 424, 8)) + pa('ox-pd', pads) + litM(c.bands) + pulseM('plate1');
  }
  function plate2M() {
    let d = '', dots = '';
    for (let i = 0; i < 4; i++) d += RR(-344 + i * 22, -204 + i * 22, 688 - i * 44, 408 - i * 44, 10);
    d += CI(0, 0, 232) + CI(0, 0, 226);
    const sp = [[], [], [], []];
    for (let i = 0; i < 32; i++) {
      const a = (i + .5) / 32 * TAU, ux = Math.cos(a), uy = Math.sin(a), L = Math.min(Math.abs(338 / ux), Math.abs(198 / uy));
      sp[Math.floor(i / 8)].push('M' + pt(236, a) + 'L' + f1(ux * L) + ' ' + f1(uy * L));
      dots += CI(ux * L, uy * L, 2.2);
    }
    return pa('ox-grid', d) + pa('ox-pd', dots) + litM(sp.map(a => a.join(''))) + pulseM('plate2');
  }
  function coverM() {
    let d = RR(-388, -248, 776, 496, 12) + RR(-378, -238, 756, 476, 8) + OCT(96) + CI(0, 0, 214) + CI(0, 0, 206), c = '';
    for (const s of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) for (let i = 0; i < 5; i++) {
      const P = [[s[0] * (360 - i * 9), s[1] * (110 + i * 7)], [s[0] * (360 - i * 9), s[1] * (196 - i * 9)], [s[0] * (334 - i * 9), s[1] * (222 - i * 9)], [s[0] * (240 - i * 16), s[1] * (222 - i * 9)]];
      c += PL(P) + CI(P[3][0], P[3][1], 2.2);
    }
    for (let i = 0; i < 64; i++) { const a = i / 64 * TAU; d += 'M' + pt(214, a) + 'L' + pt(i % 8 ? 220 : 228, a); }
    return pa('ox-eng', d) + pa('ox-eng2', c);
  }
  function wallOut(w, front) {
    const hw = w / 2 - 22;
    let d = 'M' + -hw + ' -26H' + hw + 'M' + -hw + ' 26H' + hw + 'M' + (10 - w / 2) + ' -40V40M' + (w / 2 - 10) + ' -40V40', v = '';
    for (let i = 0; i < 10; i++) v += RC(hw - 150 + i * 14, 33, 6, 10);
    let s = pa('ox-eng2', d) + pa('ox-eng', 'M' + (2 - w / 2) + ' -46.5H' + (w / 2 - 2)) + pa('ox-pin', v) +
      pa('ox-seam', 'M' + -w / 2 + ' -49.5H' + w / 2) + pa('ox-run', 'M' + -w / 2 + ' -49.5H' + w / 2);
    if (front) s += '<ellipse class="ox-slitg" rx="200" ry="38" fill="url(#§gi)"/>' + pa('ox-slit', RC(-96, -1.6, 192, 3.2));
    return s;
  }
  function wallIn(w) {
    const hw = w / 2 - 20;
    let d = 'M' + -hw + ' -20H' + hw + 'M' + -hw + ' 20H' + hw, p = '', t = '';
    for (let x = -hw + 10; x < hw - 10; x += 26) p += RC(x, -4, 10, 8);
    for (let x = -hw; x < hw - 16; x += 40) t += RC(x, -46, 16, 6);
    return pa('ox-eng2', d) + pa('ox-chip', p) + pa('ox-pin', t);
  }
  function modM() {
    let pins = '', g = '';
    for (let x = -26; x <= 26; x += 6) pins += 'M' + x + ' -22v-5M' + x + ' 22v5';
    for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) g += RC(-17 + i * 6, -7 + j * 6, 3, 3);
    return pa('ox-chip', RC(-27, -17, 54, 34)) + pa('ox-pd', g) + pa('ox-pin', pins) + '<circle class="ox-led" cx="20" cy="-11" r="2.6"/>';
  }
  function ringTop(r0, r1, k) {
    let t = '', tl = '', n = '';
    for (let i = 0; i < 120; i++) {
      const a = i / 120 * TAU;
      if (i % 10 === 0) tl += 'M' + pt(r0 + 3, a) + 'L' + pt(r1 - 2, a); else t += 'M' + pt(r1 - 7, a) + 'L' + pt(r1 - 2, a);
    }
    for (let j = 0; j < 3; j++) { const a0 = j * TAU / 3 + k; n += band(r0 + 2, r1 - 2, a0, a0 + .14); }
    return pa('ox-ring', CI(0, 0, r1) + CI(0, 0, r0)) + pa('ox-tick', t) + pa('ox-eng2', tl + CI(0, 0, (r0 + r1) / 2 - 3)) + pa('ox-notch', n);
  }
  function ringParts(r0, r1, dir) {
    const rm = (r0 + r1) / 2 - 3;
    let d = '', tr = '';
    for (const a of [0, 2.2, 4.3]) { d += CI(rm * Math.cos(a), rm * Math.sin(a), 2.4); tr += 'M' + pt(rm, a - .34 * dir) + 'A' + rm + ' ' + rm + ' 0 0 ' + (dir > 0 ? 1 : 0) + ' ' + pt(rm, a); }
    return pa('ox-trail', tr) + pa('ox-hot', d);
  }
  function procTop() {
    let g = '';
    for (let i = -4; i <= 4; i++) for (let j = -4; j <= 4; j++) { if (Math.abs(i) < 2 && Math.abs(j) < 2) continue; g += RC(i * 7.5 - 1.6, j * 7.5 - 1.6, 3.2, 3.2); }
    return pa('ox-chip', OCT(66)) + pa('ox-eng2', OCT(56)) + pa('ox-pd', g) + pa('ox-die', RC(-13, -13, 26, 26)) +
      '<circle class="ox-cg" r="44" fill="url(#§gw)"/><circle class="ox-cp" r="4.5"/>';
  }
  function lockTop() {
    let b = '';
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + .26; b += CI(13 * Math.cos(a), 13 * Math.sin(a), 1.6); }
    return pa('ox-lock', CI(0, 0, 20)) + pa('ox-eng2', CI(0, 0, 16)) + pa('ox-notch', RC(-11, -2.5, 22, 5)) + pa('ox-pd', b);
  }
  function holoM() {
    let t = '', arcs = '', txt = '';
    for (let i = 0; i < 180; i++) { const a = i / 180 * TAU, L = i % 15 === 0 ? 12 : i % 5 === 0 ? 7 : 4; t += 'M' + pt(240, a) + 'L' + pt(240 + L, a); }
    for (let j = 0; j < 4; j++) { const a0 = j * PI / 2 + .3; arcs += 'M' + pt(268, a0) + 'A268 268 0 0 1 ' + pt(268, a0 + .55); }
    ['000', '090', '180', '270'].forEach((s, j) => { const a = j * PI / 2 - PI / 2; txt += '<text class="ox-holot" x="' + f1(Math.cos(a) * 288) + '" y="' + f1(Math.sin(a) * 288 + 3) + '" text-anchor="middle">' + s + '</text>'; });
    return pa('ox-holo', CI(0, 0, 232), ' stroke-dasharray="2 6"') + pa('ox-holo', t + 'M-232 0H232M-232 -6V6M232 -6V6') + pa('ox-holo2', arcs) + txt +
      '<text class="ox-holot" x="0" y="-12" text-anchor="middle">Ø 464.00</text>';
  }

  /* ---------------- the parts ---------------- */
  const AX = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  const MODS = [[-292, -150], [-292, 0], [-292, 150], [292, -150], [292, 0], [292, 150]];
  const RINGS = [{ r0: 176, r1: 204, y: -36, dy: 10 }, { r0: 146, r1: 168, y: -34, dy: 13 }, { r0: 116, r1: 138, y: -32, dy: 16 }, { r0: 90, r1: 108, y: -30, dy: 19 }];
  const LOCKS = [[-352, -212], [352, -212], [352, 212], [-352, 212]];
  const WALLS = [
    { n: 'pF', A1: [1, 0, 0], A3: [0, 0, 1], he: 260, w: 800, s0: 0 },
    { n: 'pR', A1: [0, 0, -1], A3: [1, 0, 0], he: 400, w: 492, s0: 800 },
    { n: 'pB', A1: [-1, 0, 0], A3: [0, 0, -1], he: 260, w: 800, s0: 1292 },
    { n: 'pL', A1: [0, 0, 1], A3: [-1, 0, 0], he: 400, w: 492, s0: 2092 }
  ];
  const SEAMP = 2584;
  function wallSt(w, G) {
    const ch = DY.chassis * ex('chassis', G), phi = PI / 2 * ex(w.n, G), c = Math.cos(phi), s = Math.sin(phi), A3 = w.A3;
    const A2 = [A3[0] * s, c, A3[2] * s], B3 = [A3[0] * c, -s, A3[2] * c], H = [A3[0] * w.he, -48 + ch, A3[2] * w.he];
    return { C: [H[0] + A2[0] * 50 - B3[0] * 7, H[1] + A2[1] * 50 - B3[1] * 7, H[2] + A2[2] * 50 - B3[2] * 7], A: [w.A1, A2, B3] };
  }
  const flat = (y0, k) => G => ({ C: [0, y0 + (k ? DY[k] * ex(k, G) : 0), 0], A: AX });
  let PARTS = null;
  function parts() {
    if (PARTS) return PARTS;
    const L = [];
    L.push({ n: 'chassis', k: 'box', mat: 'ti', h: [400, 6, 260], st: flat(-54, 'chassis'), det: { 2: chassisM() }, clip: [400, 260] });
    WALLS.forEach(w => L.push({ n: w.n, k: 'box', mat: 'ti', h: [w.w / 2, 50, 7], st: G => wallSt(w, G), det: { 4: wallOut(w.w, w.n === 'pF'), 5: wallIn(w.w) }, wall: w }));
    L.push({ n: 'boardA', int: 1, k: 'box', mat: 'pcb', h: [370, 2, 230], st: flat(-44, 'boardA'), det: { 2: boardM(7, 0, 18) }, clip: [370, 230], lit: 1 });
    MODS.forEach((m, i) => L.push({ n: 'm' + i, int: 1, k: 'box', mat: 'ti', h: [32, 4, 22], st: G => { const e = ex('mods', G), s = 1 + .22 * e; return { C: [m[0] * s, -38 + DY.mods * e, m[1] * s], A: AX }; }, det: { 2: modM() } }));
    RINGS.forEach((r, i) => L.push({ n: 'R' + i, int: 1, k: 'disc', r0: r.r0, r1: r.r1, hh: 6, st: G => ({ x: 0, y: r.y + r.dy * ex('rings', G), z: 0, rot: ringA(i, G), prot: ringA(i, G) * 1.7 }), top: ringTop(r.r0, r.r1, i * .7), bot: pa('ox-ringb', CI(0, 0, r.r1) + CI(0, 0, r.r0)), parts: ringParts(r.r0, r.r1, RDIR[i]) }));
    L.push({ n: 'proc', int: 1, k: 'oct', r: 66, y0: -40, y1: -14, top: procTop() });
    L.push({ n: 'glow', int: 1, k: 'glow' });
    L.push({ n: 'holo', int: 1, k: 'plane', y: -3, m: holoM(), op: PAR.holo, rot: G => .2 + .5 * PAR.holoA(G) });
    L.push({ n: 'boardB', int: 1, k: 'box', mat: 'pcb', noTop: 1, h: [370, 2, 230], st: flat(-4, 'boardB'), det: { 2: boardM(19, 1, 20) }, clip: [370, 230], lit: 1 });
    L.push({ n: 'plate1', int: 1, k: 'box', mat: 'glass', h: [360, 1.5, 220], st: flat(11.5, 'plate1'), det: { 2: plate1M() }, clip: [360, 220], lit: 1 });
    L.push({ n: 'plate2', int: 1, k: 'box', mat: 'glass', h: [360, 1.5, 220], st: flat(27.5, 'plate2'), det: { 2: plate2M() }, clip: [360, 220], lit: 1 });
    L.push({ n: 'cover', k: 'box', mat: 'smoke', h: [400, 4, 260], st: flat(56, 'cover'), det: { 2: coverM() } });
    LOCKS.forEach((p, i) => L.push({ n: 'k' + i, k: 'disc', r0: 0, r1: 20, hh: 4, st: G => ({ x: p[0], y: 60 + DY.cover * ex('cover', G) + DY.locks * ex('locks', G), z: p[1], rot: PI / 2 * ex('locksR', G) + i * PI / 2, prot: 0 }), top: lockTop(), bot: pa('ox-ringb', CI(0, 0, 20)) }));
    return (PARTS = L);
  }
  // corner index bit k set = + side on axis k; each face lists its four corners in order
  const FACEIDX = [];
  for (let fi = 0; fi < 6; fi++) {
    const ax = fi >> 1, sv = fi & 1 ? 0 : 1, o = [0, 1, 2].filter(a => a !== ax);
    FACEIDX.push([[0, 0], [1, 0], [1, 1], [0, 1]].map(q => (sv << ax) | (q[0] << o[0]) | (q[1] << o[1])));
  }
  const neg = v => [-v[0], -v[1], -v[2]];
  function faceUV(fi, A, h) {           // local axes of a face: u to the right, v downward, seen from outside
    switch (fi) {
      case 2: return [A[0], A[2], h[0], h[2]];
      case 3: return [A[0], neg(A[2]), h[0], h[2]];
      case 4: return [A[0], neg(A[1]), h[0], h[1]];
      case 5: return [neg(A[0]), neg(A[1]), h[0], h[1]];
      case 0: return [neg(A[2]), neg(A[1]), h[2], h[1]];
      default: return [A[2], neg(A[1]), h[2], h[1]];
    }
  }

  const CSS = '.ox{position:absolute;inset:0;width:100%;height:100%;overflow:visible}' +
    '.ox polygon{stroke-width:1;stroke-linejoin:round}' +
    '.ox-eng{fill:none;stroke:color-mix(in srgb,var(--silver) 20%,transparent);stroke-width:1}' +
    '.ox-eng2{fill:none;stroke:color-mix(in srgb,var(--silver) 42%,transparent);stroke-width:1.1}' +
    '.ox-pcbt{fill:color-mix(in srgb,var(--graphite) 55%,var(--ground));stroke:color-mix(in srgb,var(--silver) 45%,transparent);stroke-width:1}' +
    '.ox-tr{fill:none;stroke:color-mix(in srgb,var(--titanium) 45%,var(--silver));stroke-width:1.1;stroke-linejoin:round;opacity:.5}' +
    '.ox-pd{fill:color-mix(in srgb,var(--silver) 62%,transparent)}' +
    '.ox-lt{fill:none;stroke:var(--main);stroke-width:1.6;stroke-linejoin:round;stroke-linecap:round}' +
    '.ox-fl{fill:none;stroke:var(--second);stroke-width:2.2;stroke-linecap:round;stroke-dasharray:6 84}' +
    '.ox-chip{fill:var(--graphite);stroke:color-mix(in srgb,var(--silver) 55%,transparent);stroke-width:1}' +
    '.ox-pin{fill:none;stroke:color-mix(in srgb,var(--silver) 55%,transparent);stroke-width:1.3}' +
    '.ox-grid{fill:none;stroke:color-mix(in srgb,var(--main) 15%,transparent);stroke-width:.8}' +
    '.ox-gridb{fill:none;stroke:color-mix(in srgb,var(--main) 38%,transparent);stroke-width:1}' +
    '.ox-ring{fill:color-mix(in srgb,var(--titanium) 78%,var(--ground));stroke:color-mix(in srgb,var(--silver) 55%,transparent);stroke-width:1;fill-rule:evenodd}' +
    '.ox-ringb{fill:var(--ground);stroke:color-mix(in srgb,var(--silver) 22%,transparent);stroke-width:1;fill-rule:evenodd}' +
    '.ox-lock{fill:var(--titanium);stroke:color-mix(in srgb,var(--silver) 65%,transparent);stroke-width:1}' +
    '.ox-tick{fill:none;stroke:color-mix(in srgb,var(--silver) 70%,transparent);stroke-width:1}' +
    '.ox-notch{fill:var(--ground)}' +
    '.ox-die{fill:color-mix(in srgb,var(--main) 18%,var(--ground));stroke:color-mix(in srgb,var(--main) 60%,transparent);stroke-width:1}' +
    '.ox-hot{fill:var(--second)}' +
    '.ox-trail{fill:none;stroke:color-mix(in srgb,var(--main) 70%,transparent);stroke-width:2;stroke-linecap:round}' +
    '.ox-cp{fill:var(--second)}' +
    '.ox-led{fill:var(--accent)}' +
    '.ox-seam{fill:none;stroke:var(--main);stroke-width:2}' +
    '.ox-run{fill:none;stroke:var(--second);stroke-width:3;stroke-linecap:round}' +
    '.ox-slit{fill:var(--second)}' +
    '.ox-holo{fill:none;stroke:color-mix(in srgb,var(--main) 55%,transparent);stroke-width:1}' +
    '.ox-holo2{fill:none;stroke:var(--main);stroke-width:2}' +
    '.ox-holot{fill:color-mix(in srgb,var(--main) 85%,transparent);font-family:var(--mono,ui-monospace,monospace);font-size:9px;letter-spacing:.18em}' +
    '.ox-pls{fill:none;stroke:var(--main);stroke-width:3}';

  function defs(p, L) {
    const st = (o, c, a) => '<stop offset="' + o + '" style="stop-color:var(--' + c + ');stop-opacity:' + a + '"/>';
    let s = '<radialGradient id="' + p + 'gi">' + st(0, 'main', .8) + st(.35, 'main', .22) + st(1, 'main', 0) + '</radialGradient>' +
      '<radialGradient id="' + p + 'gw">' + st(0, 'second', 1) + st(.16, 'second', .85) + st(.4, 'main', .45) + st(1, 'main', 0) + '</radialGradient>' +
      '<radialGradient id="' + p + 'gs">' + st(0, 'main', .32) + st(1, 'main', 0) + '</radialGradient>';
    for (const it of L) if (it.clip) s += '<clipPath id="' + p + 'c' + it.n + '"><rect x="' + -it.clip[0] + '" y="' + -it.clip[1] + '" width="' + 2 * it.clip[0] + '" height="' + 2 * it.clip[1] + '"/></clipPath>';
    return s;
  }
  function markup(it) {
    let s = '<g data-i="' + it.n + '">';
    if (it.k === 'box') {
      for (let fi = 0; fi < 6; fi++) s += '<polygon data-f="' + fi + '"/>';
      for (const fi in it.det) s += '<g data-d="' + fi + '">' + it.det[fi] + '</g>';
    } else if (it.k === 'disc') {
      s += '<g data-b>' + it.bot + '</g><g data-t>' + it.top + '</g>' + (it.parts ? '<g data-p>' + it.parts + '</g>' : '');
    } else if (it.k === 'oct') {
      for (let i = 0; i < 8; i++) s += '<polygon data-f="' + i + '"/>';
      s += '<g data-t>' + it.top + '</g>';
    } else if (it.k === 'glow') {
      s += '<circle fill="url(#§gi)" r="1"/>';
    } else if (it.k === 'plane') {
      s += '<g data-t>' + it.m + '</g>';
    }
    return s + '</g>';
  }

  /* ---------------- a device: one per scene, all drawing the same machine ---------------- */
  function build(kit, p, opt) {
    opt = opt || {};
    kit.css(CSS);
    const L = parts().slice();
    (opt.planes || []).forEach(q => L.push({ n: q.n, int: 1, k: 'plane', y: q.y, m: q.m, scene: 1, op: () => 1, rot: () => 0 }));
    let s = '<svg class="ox" viewBox="0 0 1920 1080"><defs>' + defs(p, L) + (opt.defs || '') + '</defs><g class="ox-w">';
    for (const it of L) s += markup(it);
    s += '</g>' + (opt.over || '') + '</svg>';
    const svg = kit.h(s.split('§').join(p));
    kit.stage.append(svg);
    const world = svg.querySelector('.ox-w'), V = new View(), dev = { svg, world, V, items: {}, list: [], order: '' };
    for (const src of L) {
      const it = Object.assign({}, src), el = world.querySelector('[data-i="' + it.n + '"]');
      it.el = el; it.on = true;
      if (it.k === 'box') {
        it.F = Array.from(el.querySelectorAll('polygon'));
        it.D = {}; el.querySelectorAll('[data-d]').forEach(g => { it.D[g.getAttribute('data-d')] = g; });
        it.lt = Array.from(el.querySelectorAll('.ox-lt')); it.fl = Array.from(el.querySelectorAll('.ox-fl'));
        it.pls = el.querySelector('.ox-pls'); it.spill = el.querySelector('.ox-spill'); it.led = el.querySelector('.ox-led');
        if (it.wall) { it.seam = el.querySelector('.ox-seam'); it.run = el.querySelector('.ox-run'); it.slit = el.querySelector('.ox-slit'); it.slitg = el.querySelector('.ox-slitg'); }
      } else if (it.k === 'disc') { it.gb = el.querySelector('[data-b]'); it.gt = el.querySelector('[data-t]'); it.gp = el.querySelector('[data-p]'); }
      else if (it.k === 'oct') { it.F = Array.from(el.querySelectorAll('polygon')); it.gt = el.querySelector('[data-t]'); it.cg = el.querySelector('.ox-cg'); it.cp = el.querySelector('.ox-cp'); }
      else if (it.k === 'glow') it.c = el.querySelector('circle');
      else if (it.k === 'plane') it.gt = el.querySelector('[data-t]');
      dev.items[it.n] = it; dev.list.push(it);
    }
    dev.render = G => render(dev, G);
    dev.P = (x, y, z) => V.P(x, y, z);
    dev.at = (n, dx, dy, dz) => { const c = dev.items[n].C; return V.P(c[0] + (dx || 0), c[1] + (dy || 0), c[2] + (dz || 0)); };
    dev.hull = () => {
      const Q = [];
      for (let i = 0; i < 8; i++) { const q = V.P(i & 1 ? 400 : -400, i & 2 ? 60 : -60, i & 4 ? 260 : -260); Q.push([q[0], q[1]]); }
      return hull(Q);
    };
    return dev;
  }
  function hull(P) {
    P = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    for (const q of P) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    for (let i = P.length - 1; i >= 0; i--) { const q = P[i]; while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
    return lo.slice(0, -1).concat(up.slice(0, -1));
  }
  function show(it, op) {
    const on = op > .003;
    if (on !== it.on) { it.el.style.display = on ? '' : 'none'; it.on = on; }
    if (on) it.el.style.opacity = f2(op);
    return on;
  }
  function nearFade(V, d, minD, rad) { const z = V.f / Math.max(d, 1) * rad; return (1 - sg(z, 1700, 2600)) * sg(minD, 3, 18); }

  function render(dev, G) {
    const V = dev.V.set(camAt(G)), pos = V.pos, gain = PAR.edge(G), cg = core(G), hf = Math.hypot(V.F[0], V.F[2]);
    const pr = lp(60, 1300, PAR.pulse(G)), pa_ = PAR.pulseA(G) * (1 - .5 * PAR.pulse(G)), flow = PAR.flow(G);
    const lits = [lit(G, 0), lit(G, 1), lit(G, 2), lit(G, 3)];
    const open = sg(Math.max(ex('cover', G), ex('pF', G), ex('pR', G), ex('pB', G), ex('pL', G)), 0, .04);
    for (const it of dev.list) {
      if (it.k === 'box') {
        const S = it.st(G), C = S.C, A = S.A, h = it.h; it.C = C;
        const pc = V.P(C[0], C[1], C[2]); it.depth = pc[2];
        const K = [];
        let minD = 1e9;
        for (let i = 0; i < 8; i++) {
          const a = i & 1 ? h[0] : -h[0], b = i & 2 ? h[1] : -h[1], c = i & 4 ? h[2] : -h[2];
          const q = V.P(C[0] + A[0][0] * a + A[1][0] * b + A[2][0] * c, C[1] + A[0][1] * a + A[1][1] * b + A[2][1] * c, C[2] + A[0][2] * a + A[1][2] * b + A[2][2] * c);
          K.push(q); if (q[2] < minD) minD = q[2];
        }
        it.key = C[1];
        if (!show(it, (it.int ? open : 1) * nearFade(V, pc[2], minD, it.rad || (it.rad = Math.hypot(h[0], h[1], h[2]))))) continue;
        for (let fi = 0; fi < 6; fi++) {
          const ax = fi >> 1, sn = fi & 1 ? -1 : 1, N = [A[ax][0] * sn, A[ax][1] * sn, A[ax][2] * sn];
          const Fc = [C[0] + N[0] * h[ax], C[1] + N[1] * h[ax], C[2] + N[2] * h[ax]];
          const vis = (pos[0] - Fc[0]) * N[0] + (pos[1] - Fc[1]) * N[1] + (pos[2] - Fc[2]) * N[2] > 0;
          const pg = it.F[fi], dg = it.D[fi], drawPoly = vis && !(fi === 2 && it.noTop);
          pg.style.display = drawPoly ? '' : 'none';
          if (drawPoly) {
            const I = FACEIDX[fi], sh = shade(it.mat, N, fi === 2, G, gain);
            pg.setAttribute('points', I.map(j => f1(K[j][0]) + ',' + f1(K[j][1])).join(' '));
            pg.style.fill = sh[0]; pg.style.stroke = sh[1];
          }
          if (fi === 4 && it.wall && ex(it.n, G) < .637) it.key = vis ? 1e6 : -1e6;
          if (dg) {
            dg.style.display = vis ? '' : 'none';
            if (vis) { const uv = faceUV(fi, A, h); dg.setAttribute('transform', V.aff(Fc, uv[0], uv[1], uv[2], uv[3])); }
          }
        }
        if (it.lit) for (let i = 0; i < it.lt.length; i++) {
          const b = +it.lt[i].getAttribute('data-b'), g = lits[b];
          it.lt[i].style.strokeDasharray = f1(g * 620) + ' 4000'; it.lt[i].style.opacity = f2(g > .002 ? .35 + .65 * g : 0);
          it.fl[i].style.strokeDashoffset = f1(-flow); it.fl[i].style.opacity = f2(g * g);
        }
        if (it.pls) { it.pls.setAttribute('r', f1(pr)); it.pls.style.opacity = f2(pa_); }
        if (it.spill) it.spill.style.opacity = f2(cg * .9);
        if (it.led) it.led.style.opacity = f2(PAR.amber(G));
        if (it.wall) {
          it.seam.style.opacity = f2(PAR.seam(G) * .9);
          const r = PAR.run(G), head = r * (SEAMP + 140) - it.wall.s0, seg = 140;
          it.run.style.strokeDasharray = seg + ' 9000'; it.run.style.strokeDashoffset = f1(seg - head);
          it.run.style.opacity = f2(r > 0 && r < 1 ? 1 : 0);
          if (it.slit) { const sl = PAR.slit(G); it.slit.style.opacity = f2(.08 + .92 * sl); it.slitg.style.opacity = f2(sl); }
        }
      } else if (it.k === 'disc') {
        const S = it.st(G), yt = S.y + it.hh, pc = V.P(S.x, S.y + it.hh / 2, S.z);
        it.C = [S.x, S.y + it.hh / 2, S.z]; it.depth = pc[2]; it.key = it.C[1];
        if (!show(it, (it.int ? open : 1) * nearFade(V, pc[2], pc[2] - it.r1 * hf, it.r1))) continue;
        it.gb.setAttribute('transform', V.affH(S.x, S.y, S.z, it.r1));
        const mt = V.affH(S.x, yt, S.z, it.r1);
        it.gt.setAttribute('transform', mt + ' rotate(' + deg(S.rot) + ')');
        if (it.gp) it.gp.setAttribute('transform', mt + ' rotate(' + deg(S.prot) + ')');
      } else if (it.k === 'oct') {
        const pc = V.P(0, (it.y0 + it.y1) / 2, 0); it.C = [0, (it.y0 + it.y1) / 2, 0]; it.depth = pc[2]; it.key = it.y1;
        if (!show(it, open * nearFade(V, pc[2], pc[2] - it.r * hf - 13, it.r))) continue;
        for (let i = 0; i < 8; i++) {
          const a0 = PI / 8 + i * PI / 4, a1 = a0 + PI / 4, am = a0 + PI / 8, N = [Math.cos(am), 0, Math.sin(am)];
          const x0 = it.r * Math.cos(a0), z0 = it.r * Math.sin(a0), x1 = it.r * Math.cos(a1), z1 = it.r * Math.sin(a1);
          const vis = (pos[0] - x0) * N[0] + (pos[2] - z0) * N[2] > 0, pg = it.F[i];
          pg.style.display = vis ? '' : 'none';
          if (!vis) continue;
          const q = [V.P(x0, it.y0, z0), V.P(x1, it.y0, z1), V.P(x1, it.y1, z1), V.P(x0, it.y1, z0)], sh = shade('ti', N, 0, G, gain);
          pg.setAttribute('points', q.map(v => f1(v[0]) + ',' + f1(v[1])).join(' '));
          pg.style.fill = sh[0]; pg.style.stroke = sh[1];
        }
        it.gt.setAttribute('transform', V.affH(0, it.y1, 0, it.r));
        it.cg.style.opacity = f2(cg); it.cp.style.opacity = f2(sg(cg, 0, .2));
      } else if (it.k === 'glow') {
        const q = V.P(0, -14, 0); it.C = [0, -14, 0]; it.depth = q[2] - 1; it.key = -13.9;
        if (!show(it, open * cg * .55 * (q[2] > 5 ? 1 : 0))) continue;
        it.c.setAttribute('cx', f1(q[0])); it.c.setAttribute('cy', f1(q[1]));
        it.c.setAttribute('r', f1(150 * V.f / q[2] * (.7 + .5 * cg)));
      } else if (it.k === 'plane') {
        const q = V.P(0, it.y, 0); it.C = [0, it.y, 0]; it.depth = q[2]; it.key = it.y;
        const op = open * (it.o != null ? it.o : it.op(G)) * nearFade(V, q[2], q[2] - 300 * hf, 300);
        if (!show(it, op)) continue;
        it.gt.setAttribute('transform', V.affH(0, it.y, 0, 300) + ' rotate(' + deg(it.r != null ? it.r : it.rot(G)) + ')');
      }
    }
    // paint low to high (the camera is always above the stack), near walls last
    const vis = dev.list.filter(it => it.on).sort((a, b) => a.key - b.key || b.depth - a.depth), key = vis.map(it => it.n).join(',');
    if (key !== dev.order) { for (const it of vis) dev.world.appendChild(it.el); dev.order = key; }
    dev.G = G;
    return dev;
  }

  /* ---------------- engineering call-outs (screen space) ---------------- */
  function tag(kit, svg, o) {
    const ns = 'http://www.w3.org/2000/svg', right = o.side !== 'l';
    const el = kit.h('<div class="tag' + (right ? '' : ' tag-l') + (o.cls ? ' ' + o.cls : '') + '" style="left:' + o.x + 'px;top:' + (o.y - 25) + 'px"><span class="tag-k">' + o.k + '</span><span class="tag-v">' + o.v + '</span></div>');
    kit.stage.append(el);
    const ln = document.createElementNS(ns, 'polyline'), dot = document.createElementNS(ns, 'circle'), ring = document.createElementNS(ns, 'circle');
    ln.setAttribute('class', 'lead'); dot.setAttribute('class', 'dot'); dot.setAttribute('r', '3'); ring.setAttribute('class', 'lead'); ring.setAttribute('r', '8');
    svg.append(ln, ring, dot);
    let on = true;
    return {
      el,
      render(a, pIn, pOut) {
        const op = (pIn > 0 ? 1 : 0) * (1 - (pOut || 0));
        const vis = op > .003;
        if (vis !== on) { const d = vis ? '' : 'none'; el.style.display = d; ln.style.display = d; dot.style.display = d; ring.style.display = d; on = vis; }
        if (!vis) return;
        const x2 = o.x + (right ? -12 : 12), y2 = o.y, dx = x2 - a[0], dy = y2 - a[1];
        const ex_ = Math.abs(dy) <= Math.abs(dx) ? a[0] + Math.sign(dx) * Math.abs(dy) : a[0];
        const L = Math.hypot(ex_ - a[0], y2 - a[1]) + Math.abs(x2 - ex_);
        const pl = o3(sg(pIn, 0, .55)), pt_ = o3(sg(pIn, .4, 1));
        ln.setAttribute('points', f1(a[0]) + ',' + f1(a[1]) + ' ' + f1(ex_) + ',' + f1(y2) + ' ' + f1(x2) + ',' + f1(y2));
        ln.style.strokeDasharray = f1(L * pl) + ' ' + f1(L + 20);
        dot.setAttribute('cx', f1(a[0])); dot.setAttribute('cy', f1(a[1])); ring.setAttribute('cx', f1(a[0])); ring.setAttribute('cy', f1(a[1]));
        ring.setAttribute('r', f1(lp(18, 8, o3(sg(pIn, 0, .4)))));
        ring.style.opacity = f2(op * sg(pIn, 0, .15)); dot.style.opacity = f2(op);
        ln.style.opacity = f2(op);
        el.style.opacity = f2(op);
        el.style.clipPath = right ? 'inset(0 ' + f1((1 - pt_) * 100) + '% 0 0)' : 'inset(0 0 0 ' + f1((1 - pt_) * 100) + '%)';
      }
    };
  }

  window.OBX = {
    build, tag, camAt, View, M, ex, PAR, ringA, DY, RINGS, MODS, LOCKS,
    proj(G, x, y, z) { return new View().set(camAt(G)).P(x, y, z); },
    ease: { io3, io5, o2, o3, o5, sg, lp, bump, cl }
  };
})();
