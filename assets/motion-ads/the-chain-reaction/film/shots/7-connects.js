/* Shot 7 of 7: Everything connects (5 s).
   Rails, gears and plates lock into the words EVERYTHING CONNECTS.; the marble rolls in as the final period. */
FILM.add('connects', 'Everything connects', 5, function (kit) {
const { seg, eo, eio, eob, clamp01, TextFx } = kit;
kit.scene('connects', {
  init(kit) {
    const M = window.MX, D = Math.PI / 180;
    const arc = (cx, cy, rx, ry, a0, a1, n) => { const p = []; for (let i = 0; i <= n; i++) { const a = (a0 + (a1 - a0) * i / n) * D; p.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); } return p; };
    const G = {
      E: { w: 110, s: [[[110, 0], [0, 0], [0, 170], [110, 170]], [[0, 85], [92, 85]]] },
      V: { w: 140, s: [[[0, 0], [70, 170], [140, 0]]] },
      R: { w: 120, s: [[[0, 170], [0, 0], [70, 0]].concat(arc(70, 42.5, 45, 42.5, -90, 90, 14)).concat([[0, 85]]), [[58, 85], [120, 170]]] },
      Y: { w: 140, s: [[[0, 0], [70, 92], [140, 0]], [[70, 92], [70, 170]]] },
      T: { w: 120, s: [[[0, 0], [120, 0]], [[60, 0], [60, 170]]] },
      H: { w: 120, s: [[[0, 0], [0, 170]], [[120, 0], [120, 170]], [[0, 85], [120, 85]]] },
      I: { w: 0, s: [[[0, 0], [0, 170]]] },
      N: { w: 125, s: [[[0, 170], [0, 0], [125, 170], [125, 0]]] },
      G: { w: 140, s: [arc(70, 85, 70, 85, -35, -345, 40).concat([[80, 107]])] },
      C: { w: 140, s: [arc(70, 85, 70, 85, -35, -325, 40)] },
      S: { w: 120, s: [arc(60, 42.5, 55, 42.5, -20, -270, 22).concat(arc(60, 127.5, 55, 42.5, -90, 160, 22).slice(1))] },
      O: { w: 160, gear: 1 }
    };
    const CV = { acc: 'accent', sun: 'sun', teal: 'teal', lav: 'lav', cop: 'copper', lime: 'lime' };
    this.K = [[0, 1900, 1060, .46], [1.2, 1900, 1060, .4], [5, 1900, 1060, .4]];
    const toS = (p, t) => { const c = M.keys(this.K, t); return [960 + (p[0] - c[0]) * c[2], 540 + (p[1] - c[1]) * c[2]]; };
    const L = [];
    const build = (word, cols, src, y0, x0, tb) => { let x = x0; [...word].forEach((ch, i) => { L.push({ ch, x, y: y0, w: G[ch].w, col: cols[i], gear: !!G[ch].gear, src: toS(src[i], tb + i * .07), t0: tb + i * .07, r0: ((i * 97 + y0) % 240) - 120 }); x += G[ch].w + 44; }); return x; };
    build('EVERYTHING', ['acc', 'sun', 'teal', 'lav', 'cop', 'lime', 'acc', 'sun', 'teal', 'lav'], [[420, 1200], [823, 401], [1150, 520], [1434, 444], [1700, 260], [2555, 220], [2555, 620], [2555, 820], [2555, 960], [3300, 900]], 255, (1920 - 1521) / 2, .15);
    const xe = build('CONNECTS', ['cop', 'sun', 'acc', 'teal', 'lav', 'lime', 'cop', 'acc'], [[850, 1620], [1043, 813], [1600, 1800], [2200, 1800], [1600, 1080], [3140, 1300], [3200, 1700], [3460, 1300]], 495, 238, .3);
    const px = xe + 26, py = 639;
    let s = '<path class="ec-tr" pathLength="1" d="M170 224 H1770 Q1835 224 1835 290 V520 Q1835 585 1770 585 H' + (px + 50) + '" style="fill:none;stroke:var(--second);stroke-width:6;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:1 1.02;stroke-dashoffset:1"/><circle class="ec-so" cx="' + px + '" cy="' + py + '" r="26" style="fill:var(--ground);stroke:var(--second);stroke-width:6;opacity:0"/>';
    L.forEach(l => {
      let inner = '', bolts = '';
      if (l.gear) inner = '<g transform="translate(80 85)"><g class="ec-gr">' + M.gear(18, 'f-sun') + '</g></g>';
      else G[l.ch].s.forEach(pts => {
        const d = 'M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L'), st = 'fill:none;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:1 1.02;stroke-dashoffset:1';
        inner += '<path class="ec-st" pathLength="1" d="' + d + '" style="stroke:var(--second);stroke-width:36;' + st + '"/><path class="ec-st" pathLength="1" d="' + d + '" style="stroke:var(--' + CV[l.col] + ');stroke-width:24;' + st + '"/>';
        [pts[0], pts[pts.length - 1]].forEach(p => { bolts += '<circle class="k f-ivo ec-b" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="0" style="stroke-width:2.5"/>'; });
      });
      s += '<g class="ec-l" style="opacity:0">' + inner + bolts + '</g>';
    });
    s += '<g class="ec-sm" style="opacity:0">' + M.marble(22) + '</g>';
    kit.stage.append(kit.h('<div class="ground"><svg class="art" viewBox="0 0 1920 1080"><g class="ec-cam">' + M.grid('ec-dots', -3000, -3000, 9000, 7000) + '<g class="ec-ov">' + M.ovHTML() + '</g><g class="ec-wm">' + M.marble(16) + '</g></g></svg><svg class="art" viewBox="0 0 1920 1080">' + s + '</svg><div class="words" style="left:0;top:752px;width:1920px;align-items:center"><p class="sub ec-sub">ONE SMALL ACTION. INFINITE POSSIBILITIES.</p></div><div class="words ec-lab" style="left:120px;bottom:64px;opacity:0"><p class="tag">The chain reaction · No. 001</p></div><div class="words ec-lab" style="right:120px;bottom:64px;align-items:flex-end;opacity:0"><p class="tag">One marble · one machine</p></div></div>'));
    const q = sel => kit.stage.querySelector(sel), qa = sel => [...kit.stage.querySelectorAll(sel)];
    this.cam = q('.ec-cam'); this.wm = q('.ec-wm'); this.sm = q('.ec-sm'); this.tr = q('.ec-tr'); this.so = q('.ec-so'); this.sub = q('.ec-sub'); this.lab = qa('.ec-lab');
    this.ov = M.ovBind(q('.ec-ov'));
    this.SC = this.ov.sec.map(el => el.getAttribute('data-c').split(' ').map(Number));
    this.RA = [.75, .5, .45, .55, .6, .5, .4, .55, 1.15];
    qa('.ec-l').forEach((g, k) => { const l = L[k]; l.el = g; l.st = [...g.querySelectorAll('.ec-st')]; l.b = [...g.querySelectorAll('.ec-b')]; l.gr = g.querySelector('.ec-gr'); });
    this.L = L; this.px = px; this.py = py;
    const c0 = M.keys(this.K, .6), s0 = [960, 540 + (1018 + 3.9 - 14 * .985 - c0[1]) * c0[2]];
    this.s0 = 16 * c0[2] / 22;
    this.mp = M.path([
      { t: [.6, 1.0], q: [s0[0], s0[1], 560, -140, 190, 199] },
      { t: [1.0, 1.75], l: [190, 199, 1770, 199] },
      { t: [1.75, 1.85], q: [1770, 199, 1810, 199, 1810, 270] },
      { t: [1.85, 2.0], l: [1810, 270, 1810, 520] },
      { t: [2.0, 2.1], q: [1810, 520, 1810, 560, 1770, 560] },
      { t: [2.1, 2.2], l: [1770, 560, px + 44, 560] },
      { t: [2.2, 2.4], q: [px + 44, 560, px + 30, 566, px, py], e: 'i' }
    ]);
  },
  render(t) {
    const M = window.MX, c = M.keys(this.K, t), f1 = x => x.toFixed(1), ov = this.ov;
    M.cam(this.cam, c[0], c[1], c[2]);
    ov.render(5 + t, 1.8);
    ov.sec.forEach((el, k) => { const a = this.RA[k], cc = this.SC[k], sc = 1 - .9 * eio(seg(t, a, a + .9)); el.setAttribute('transform', 'translate(' + cc[0] + ' ' + cc[1] + ') scale(' + sc.toFixed(3) + ') translate(' + (-cc[0]) + ' ' + (-cc[1]) + ')'); el.style.opacity = (1 - eio(seg(t, a + .25, a + .95))).toFixed(3); });
    const kick = Math.sin(Math.PI * seg(t, .5, .68));
    if (kick > 0) ov.btn[0].setAttribute('transform', 'translate(0 ' + f1(3.9 - 14 * kick) + ') scale(.961)');
    M.ball(this.wm, 1900, 1021.9 - 14 * kick, 0);
    this.wm.style.opacity = t < .6 ? '1' : '0';
    this.tr.style.strokeDashoffset = (1 - eio(seg(t, .3, .95))).toFixed(4);
    this.so.style.opacity = clamp01((t - 1.5) / .3).toFixed(3);
    this.so.setAttribute('r', f1(26 + 4 * Math.sin(Math.PI * seg(t, 2.4, 2.6))));
    const lock = 2.4, n = this.L.length;
    this.L.forEach((l, k) => {
      const p = seg(t, l.t0, l.t0 + 1), pe = eio(p), cx = l.x + l.w / 2, cy = l.y + 85;
      const x = l.src[0] + (cx - l.src[0]) * pe, y = l.src[1] + (cy - l.src[1]) * pe - 160 * Math.sin(Math.PI * pe);
      const xv = t - lock - (n - k) * .02, dy = xv > 0 ? 3 * Math.sin(xv * 45) * Math.exp(-xv * 9) : 0;
      const sc = .22 + .78 * eob(p, 1.5), rot = l.gear ? 0 : l.r0 * (1 - pe);
      l.el.style.opacity = clamp01((t - l.t0) / .12).toFixed(3);
      l.el.setAttribute('transform', 'translate(' + f1(x) + ' ' + f1(y + dy) + ') rotate(' + f1(rot) + ') scale(' + sc.toFixed(3) + ') translate(' + f1(-l.w / 2) + ' -85)');
      if (l.gr) l.gr.setAttribute('transform', 'rotate(' + f1((x - cx) / 86 * 57.3) + ')');
      const dr = (1 - eo(seg(t, l.t0 + .08, l.t0 + .9))).toFixed(4);
      l.st.forEach(el => { el.style.strokeDashoffset = dr; });
      const br = (6 * eob(seg(t, l.t0 + .95, l.t0 + 1.2), 1.8)).toFixed(2);
      l.b.forEach(el => el.setAttribute('r', br));
    });
    if (t >= .6) {
      const p = this.mp(t), sq = Math.sin(Math.PI * seg(t, 2.4, 2.48)), bo = 7 * Math.sin(Math.PI * seg(t, 2.46, 2.6));
      const sc = t < 1 ? this.s0 + (1 - this.s0) * eo(seg(t, .6, 1)) : 1;
      this.sm.style.opacity = '1';
      this.sm.setAttribute('transform', 'translate(' + f1(p[0]) + ' ' + f1(p[1] - bo + 22 * .12 * sq) + ') scale(' + (sc * (1 + .1 * sq)).toFixed(3) + ' ' + (sc * (1 - .12 * sq)).toFixed(3) + ')');
      const spin = this.sm.querySelector('.mx-spin'); if (spin) spin.setAttribute('transform', 'rotate(' + f1(p[0] * 2.6) + ')');
    } else this.sm.style.opacity = '0';
    TextFx.fadeFromRight(this.sub, t, 2.6);
    this.lab.forEach(el => { el.style.opacity = clamp01((t - 3.0) / .5).toFixed(3); });
  },
});
});
