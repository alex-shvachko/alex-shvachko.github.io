/* Shot 5 of 7: Impossible pinball (8 s).
   The turbine cocks a spring launcher; the marble rockets up a ramp, off a bumper, through a loop and paddles, into the air. */
FILM.add('pinball', 'Impossible pinball', 8, function (kit) {
const { seg, eo, eio, clamp01 } = kit;
kit.scene('pinball', {
  init(kit) {
    const M = window.MX, W = M.W3(), Dg = M.D; this.W = W;
    const pre = '<rect class="shade" x="5634" y="1246" width="900" height="590" rx="30"/><rect class="k f-plate" x="5620" y="1230" width="900" height="590" rx="30"/>';
    let w = W.gl(M.pstr(W.MT), 40);
    w += '<path class="rail" d="M5860 1500 L5750 1790 M5860 1500 L5970 1790" style="stroke-width:10"/><rect class="k f-steel" x="5720" y="1784" width="280" height="16" rx="6"/><path class="rail" d="M5672 1560 Q5672 1716 5860 1716 Q6048 1716 6048 1560" style="stroke-width:8"/>';
    w += '<line class="pb-bt" x1="5860" y1="1450" x2="6400" y2="1510" style="stroke:var(--second);stroke-width:9;stroke-dasharray:12 8"/><line class="pb-bt" x1="5860" y1="1550" x2="6400" y2="1690" style="stroke:var(--second);stroke-width:9;stroke-dasharray:12 8"/>';
    w += '<g transform="translate(5860 1500)"><g class="pb-tu"><circle class="k f-steel" r="112"/>';
    for (let i = 0; i < 6; i++) { const a = i * 60 * Dg; w += '<line class="k" x1="' + (50 * Math.cos(a)).toFixed(1) + '" y1="' + (50 * Math.sin(a)).toFixed(1) + '" x2="' + (104 * Math.cos(a)).toFixed(1) + '" y2="' + (104 * Math.sin(a)).toFixed(1) + '" style="stroke-width:5"/>'; }
    for (let i = 0; i < 12; i++) w += '<rect class="k ' + ['f-teal', 'f-mag', 'f-sun'][i % 3] + '" x="104" y="-16" width="66" height="32" rx="6" transform="rotate(' + (i * 30) + ')"/>';
    w += '<circle class="k f-cop" r="50"/><circle class="k f-ivo" r="34"/><circle class="k f-navy" r="10"/></g></g>';
    w += '<g transform="translate(6400 1600)"><circle class="shade" r="96" cx="10" cy="12"/><g class="pb-p2"><circle class="k f-cop" r="90"/><circle class="k nf" r="72" style="stroke-width:2;opacity:.5"/>';
    for (let i = 0; i < 5; i++) { const a = (i + .5) * 72 * Dg; w += '<circle class="k f-ivo" cx="' + (44 * Math.cos(a)).toFixed(1) + '" cy="' + (44 * Math.sin(a)).toFixed(1) + '" r="14" style="stroke-width:2.5"/>'; }
    w += '<circle class="k f-navy" cx="70" cy="0" r="11"/><circle class="k f-navy" r="16"/><circle class="f-ivo" r="5"/></g></g>';
    [['TURBINE T-6', 6070, 1780], ['POWER TAKE-OFF \u2192 LAUNCHER', 6000, 1430]].forEach(l => { w += '<text class="mono" x="' + l[1] + '" y="' + l[2] + '" style="font-size:13px">' + l[0] + '</text>'; });
    w += '<circle class="f-main pb-gh" r="16" style="opacity:0"/><circle class="f-main pb-gh" r="16" style="opacity:0"/><g class="pb-m">' + M.marble(16) + '</g><polyline points="' + M.pstr(W.MT) + '" style="fill:none;stroke:color-mix(in srgb, var(--accent) 10%, var(--ground));stroke-width:40;stroke-linecap:round;stroke-linejoin:round;opacity:.35"/>';
    kit.stage.append(kit.h('<div class="ground"><svg class="art" viewBox="0 0 1920 1080"><g class="pb-far">' + M.far(0, 5000, 0, 1000) + '</g><g class="pb-cam">' + M.grid('pb-dots', 3000, -2000, 7000, 5000) + pre + M.PB() + w + '</g></svg></div>'));
    const q = s => kit.stage.querySelector(s), qa = s => [...kit.stage.querySelectorAll(s)];
    this.cam = q('.pb-cam'); this.far = q('.pb-far'); this.tu = q('.pb-tu'); this.bt = qa('.pb-bt'); this.p2 = q('.pb-p2'); this.m = q('.pb-m'); this.gh = qa('.pb-gh');
    this.head = q('.pb-head'); this.spr = q('.pb-spr'); this.cab = q('.pb-cab'); this.lat = q('.pb-lat'); this.bmp = q('.pb-bmp'); this.srl = q('.pb-srl');
    this.sq = qa('.pb-sq'); this.pad = qa('.pb-pad'); this.pu = qa('.pb-pu'); this.lt = qa('.pb-lt');
    this.drop = M.path([{ t: [.525, .62], q: [6452, 1800, 6462, 1802, 6470, 1824], e: 'i' }]);
    this.mp = M.path([
      { t: [1.5, 1.74], l: [6357, 1824, 6900, 1824] },
      { t: [1.74, 2.55], a: [6900, 1240, 584, 90, -50] },
      { t: [2.55, 2.75], q: [7275.4, 792.6, 7122, 664, 7054.6, 453.3] },
      { t: [2.75, 3.08], q: [7054.6, 453.3, 7100, 180, 7262, 287] },
      { t: [3.08, 3.85], l: [7262, 287, 7640, 400] },
      { t: [3.85, 4.2], q: [7640, 400, 7690, 870, 7980, 864], e: 'i' },
      { t: [4.2, 4.95], a: [7980, 700, 164, 90, -270] },
      { t: [4.95, 5.2], l: [7980, 864, 8460, 864] },
      { t: [5.2, 5.4], q: [8460, 864, 8510, 866, 8540, 1079], e: 'i' },
      { t: [5.42, 5.72], q: [8540, 1079, 8585, 830, 8530, 761] },
      { t: [5.76, 6.0], q: [8530, 761, 8545, 600, 8600, 559] },
      { t: [6.06, 8.0], l: [8600, 559, 8428, -1200], e: 'o' }
    ]);
    this.K = [[0, 6380, 1780, 1.6], [.5, 6400, 1790, 1.65], [1.2, 6390, 1810, 1.9], [1.5, 6390, 1815, 2.0], [1.85, 6800, 1650, 1.05], [2.5, 7150, 1050, .85], [3.0, 7120, 560, .85], [3.6, 7440, 430, .95], [4.4, 7900, 720, .95], [5.1, 8250, 860, .95], [5.8, 8560, 820, .9], [6.5, 8450, 250, .62], [7.2, 8430, -760, .9], [8, 8428, -1150, 1.1]];
  },
  render(t) {
    const M = window.MX, W = this.W, Dg = M.D, c = M.keys(this.K, t), f1 = x => x.toFixed(1);
    M.cam(this.cam, c[0], c[1], c[2]); M.cam(this.far, c[0], c[1], c[2], .55);
    this.far.style.opacity = clamp01((c[1] + 300) / 400).toFixed(3);
    const th = 300 * (t + 1.2);
    this.tu.setAttribute('transform', 'rotate(' + f1(th % 360) + ')');
    this.bt.forEach(el => { el.style.strokeDashoffset = f1(-th * Dg * 50); });
    this.p2.setAttribute('transform', 'rotate(' + f1((th * 50 / 90) % 360) + ')');
    const xc = 6440 - 100 * eio(seg(t, .2, 1.25)), r = t - 1.5;
    let xh = xc;
    if (r >= 0) xh = r < .045 ? 6340 + 124 * eo(r / .045) : 6440 + 24 * Math.cos((r - .045) * 30) * Math.exp(-(r - .045) * 10);
    this.head.setAttribute('transform', 'translate(' + f1(xh) + ' 1824)');
    let sp = ''; for (let i = 0; i <= 20; i++) sp += (i ? ' L' : 'M') + f1(6242 + (xh - 30 - 6242) * i / 20) + ' ' + (i % 2 ? 1810 : 1838);
    this.spr.setAttribute('d', sp);
    const re = xh - 230, sag = r > 0 ? 40 * eo(seg(t, 1.5, 1.8)) : 0;
    this.cab.setAttribute('d', 'M6310 1600 L6075.6 1786.4 A22 22 0 1 0 6060 1824 Q' + f1((6060 + re) / 2) + ' ' + f1(1824 + sag) + ' ' + f1(re) + ' 1824');
    this.lat.setAttribute('transform', 'rotate(' + f1(-35 * eo(seg(t, 1.46, 1.52))) + ')');
    const s1 = seg(t, 2.75, 2.83), s2 = seg(t, 2.83, 3.0);
    this.bmp.setAttribute('transform', 'scale(' + (1 - .14 * Math.sin(Math.PI * s1) + .07 * Math.sin(Math.PI * s2)).toFixed(3) + ')');
    [[2.75, 80, 90], [5.4, 16, 60], [5.72, 16, 60], [6.0, 16, 60]].forEach((e, k) => { const pu = seg(t, e[0], e[0] + .45), el = this.pu[k]; el.setAttribute('r', f1(e[1] + e[2] * eo(pu))); el.style.opacity = (pu > 0 && pu < 1 ? (1 - pu) * .9 : 0).toFixed(3); });
    this.srl.setAttribute('transform', 'rotate(' + f1(-1.5 + 3 * eio(seg(t, 3.08, 3.85))) + ')');
    this.sq.forEach((el, k) => el.setAttribute('transform', 'rotate(' + f1(t * (k ? -120 : 120)) + ')'));
    [[165, 5.4, 1, 35], [15, 5.72, -1, 35], [165, 6.0, 1, 42]].forEach((p, k) => { this.pad[k].setAttribute('transform', 'rotate(' + f1(p[0] + p[2] * p[3] * eo(seg(t, p[1], p[1] + .07)) * (1 - eio(seg(t, p[1] + .3, p[1] + .7)))) + ')'); });
    const ra = t < 1.74 ? 999 : 90 - 140 * seg(t, 1.74, 2.55);
    this.lt.forEach((el, i) => { el.style.fill = ra <= 80 - i * 17 ? 'var(--sun)' : ''; });
    let x, y, roll;
    if (t < .525) { const d = 600 * (t + 2.85), p = M.polyAt(W.MT, d); x = p[0]; y = p[1]; roll = 1205 + d * 3.58; }
    else if (t < 1.5) {
      if (t < .62) { const p = this.drop(t); x = p[0]; y = p[1]; }
      else { y = 1824; x = t < .85 ? 6470 + (xc + 17 - 6470) * eio(seg(t, .62, .85)) : xc + 17; }
      roll = 8455 + (x - 6452) * 3.58;
    } else { const p = this.mp(t); x = t < 1.6 ? Math.max(p[0], xh + 17) : p[0]; y = p[1]; roll = 8455 + (x - 6452) * 3.58; }
    M.ball(this.m, x, y, roll);
    this.gh.forEach((g, k) => { if (t < 1.5) { g.style.opacity = '0'; return; } const s = this.mp(t - .014 * (k + 1)), d = Math.hypot(x - s[0], y - s[1]); M.put(g, s[0], s[1]); g.style.opacity = (clamp01((d - 8) / 30) * (.3 - .12 * k)).toFixed(3); });
  },
});
});
