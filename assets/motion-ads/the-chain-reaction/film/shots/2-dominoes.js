/* Shot 2 of 7: Domino cathedral (4 s).
   Dominoes fall in growing, colored chains that converge on a brass lever, which unlocks a giant gear. */
FILM.add('dominoes', 'Domino cathedral', 4, function (kit) {
const { seg, eo, clamp01 } = kit;
kit.scene('dominoes', {
  init(kit) {
    const M = window.MX, D = [];
    for (let i = 0; i < 8; i++) D.push({ x: 1880 + 42 * i, y: 760, h: 70, w: 18, c: 'f-ivo', s: 1, t0: -.30 + .14 * i, d: .26, r: 64.6 });
    for (let j = 0; j < 8; j++) { const b = j % 2; D.push({ x: 2238 + 56 * j, y: b ? 742 : 760, h: 100, w: 22, c: 'f-acc', s: b ? .86 : 1, t0: .82 + .11 * j, d: .24, r: 66 }); }
    for (let k = 0; k < 8; k++) D.push({ x: 2706 + 66 * k, y: 760 + 15 * k, h: 130, w: 26, c: 'f-sun', s: .92 + .08 * Math.cos(k * Math.PI / 2), t0: 1.74 + .09 * k, d: .22, r: 66 });
    const FY = [880, 900, 910, 900, 880], BY = [850, 825, 812, 825, 850];
    for (let m = 0; m < 5; m++) { D.push({ x: 3248 + 78 * m, y: BY[m], h: 150, w: 28, c: 'f-main', s: .86, t0: 2.49 + .08 * m, d: .2, r: 66 }); D.push({ x: 3248 + 78 * m, y: FY[m], h: 150, w: 28, c: 'f-main', s: 1, t0: 2.47 + .08 * m, d: .2, r: 66 }); }
    D.sort((a, b) => a.s - b.s);
    const GT = [{ n: 60, x: 4150, y: 560 }, { n: 20, m: 0, p: -30, te: .35 }, { n: 28, m: 1, p: 10, te: .65 }, { n: 14, m: 1, p: -105, te: .8 }, { n: 36, m: 2, p: 70, te: 1.05 }, { n: 12, m: 0, p: 100, te: 1.3 }];
    GT.forEach(g => { if (g.m != null) { const q = GT[g.m], xy = M.at(q.x, q.y, q.n, g.n, g.p * M.D); g.x = xy[0]; g.y = xy[1]; } });
    const gam = T => T < 0 ? 0 : T < 1 ? 30 * T * T : 30 + 60 * (T - 1);
    const ang = (k, u) => k ? M.mesh(ang(GT[k].m, Math.max(u, GT[k].te)), GT[GT[k].m].n, GT[k].n, GT[k].p * M.D) : gam(u + .6) * M.D;
    this.ang = ang;
    const TP = '1784,812 3150,940 3600,1010 4020,1030';
    let w = '<rect class="shade" x="3894" y="116" width="1120" height="840" rx="36"/><rect class="k f-plate" x="3880" y="100" width="1120" height="840" rx="36"/><text class="mono" x="3910" y="140" style="font-size:13px">G-01 · Ø535 · 60T · MAINSPRING DRIVE</text>';
    w += '<polyline points="' + TP + '" style="fill:none;stroke:var(--second);stroke-width:46;stroke-linecap:round;stroke-linejoin:round"/><polyline points="' + TP + '" style="fill:none;stroke:color-mix(in srgb, var(--accent) 8%, var(--ground));stroke-width:40;stroke-linecap:round;stroke-linejoin:round"/>';
    w += '<g transform="translate(4120 1080) rotate(-16.09)"><rect class="k f-plate" x="40" y="34" width="1000" height="22" rx="8"/><rect class="k f-navy" x="-32" y="-32" width="1146" height="64" rx="32"/><rect class="f-steel" x="-18" y="-18" width="1118" height="36" rx="18"/>';
    for (let x = 0; x <= 1080; x += 120) w += '<circle class="k f-ivo" cx="' + x + '" r="13" style="stroke-width:2"/>';
    w += '<line x1="0" y1="-32" x2="1080" y2="-32" style="stroke:var(--lime);stroke-width:5;stroke-dasharray:18 22"/></g>';
    w += '<path class="rail" d="M4026 1050 H4080"/><g transform="translate(4082 1050)"><rect class="k f-cop" x="-5" y="-100" width="10" height="100" rx="5"/><circle class="k f-navy" r="6"/></g><text class="mono" x="3990" y="1086" style="font-size:11px">CATCH C-1</text>';
    GT.forEach((g, k) => { const o = k ? 40 : 0, x = g.x + Math.cos((g.p || 0) * M.D) * o, y = g.y + Math.sin((g.p || 0) * M.D) * o; w += '<g transform="translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')"><circle class="shade" r="' + (M.rp(g.n) + 12).toFixed(1) + '" cx="12" cy="14"/><g class="dom-g">' + M.gear(g.n, ['f-acc', 'f-sun', 'f-teal', 'f-lav', 'f-cop', 'f-lime'][k]) + (k == 5 ? '<path class="k f-cop" d="M-14 0 A14 14 0 0 1 14 0 L8 78 A8 8 0 0 1 -8 78 Z" transform="rotate(' + (-ang(5, 1.5) / M.D).toFixed(2) + ')"/>' : '') + (k ? '' : '<circle class="k f-ivo" r="80"/><polyline class="dom-sp" style="fill:none;stroke:var(--second);stroke-width:3"/><circle class="k f-navy" r="13"/>') + '</g></g>'; });
    for (const d of D) w += '<line class="rail" x1="' + (d.x - d.w * d.s - 14) + '" y1="' + (d.y + 3) + '" x2="' + (d.x + 16) + '" y2="' + (d.y + 3) + '" style="stroke-width:' + (d.s < 1 ? 4 : 6) + '"/><g transform="translate(' + d.x + ' ' + d.y + ') scale(' + d.s.toFixed(3) + ')"><g class="dom-d">' + M.domino(d.w, d.h, d.c) + '</g></g>';
    w += '<line class="rail" x1="3590" y1="883" x2="3680" y2="883"/><g transform="translate(3660 880)"><g class="dom-f"><rect class="k f-navy" x="-50" y="-300" width="50" height="300" rx="10"/><rect class="f-sun" x="-44" y="-160" width="38" height="16" rx="4"/><circle class="f-ivo" cx="-25" cy="-240" r="7"/><circle class="f-ivo" cx="-25" cy="-70" r="7"/></g></g>';
    w += '<rect class="k f-steel" x="3872" y="876" width="16" height="84" rx="4"/><rect class="k f-steel" x="3846" y="956" width="68" height="12" rx="4"/><g class="dom-lev"><g transform="rotate(12.3)"><rect class="k f-cop" x="-118" y="-7" width="236" height="14" rx="7"/></g><circle class="k f-navy" r="9"/><circle class="f-ivo" r="3"/></g><text class="mono" x="3760" y="1000" style="font-size:12px">B-07 · BRASS LEVER</text>';
    w += '<g class="dom-paw"><path class="k f-cop" d="M-8 4 L38 24 L44 34 L36 38 L-6 14 Z"/><path class="k f-cop" d="M-7 -2 L18 -86 L32 -98 L36 -88 L26 -78 L7 2 Z"/><circle class="k f-navy" r="7"/></g><text class="mono" x="3900" y="720" style="font-size:11px">LOCK</text>';
    [['A · IVORY ×8', 1860, 668], ['B · ZIGZAG ×8', 2220, 628], ['C · SPIRAL ×8', 2690, 612], ['D · TWIN CHAIN ×10', 3220, 648]].forEach(l => { w += '<text class="mono" x="' + l[1] + '" y="' + l[2] + '" style="font-size:12px">' + l[0] + '</text>'; });
    w += '<circle class="f-main dom-gh" r="16"/><g class="dom-m">' + M.marble(16) + '</g><polyline points="' + TP + '" style="fill:none;stroke:color-mix(in srgb, var(--accent) 10%, var(--ground));stroke-width:40;stroke-linecap:round;stroke-linejoin:round;opacity:.35"/><polyline points="1784,798 3150,926 3600,996 4020,1016" style="fill:none;stroke:var(--ground);stroke-width:3;opacity:.9"/>';
    kit.stage.append(kit.h('<div class="ground"><svg class="art" viewBox="0 0 1920 1080"><g class="dom-far">' + M.far(0, 5000, 0, 1000) + '</g><g class="dom-cam">' + M.grid('dom-dots', -1000, -1000, 8000, 4000) + w + '</g></svg></div>'));
    const q = s => kit.stage.querySelector(s), qa = s => [...kit.stage.querySelectorAll(s)];
    this.cam = q('.dom-cam'); this.far = q('.dom-far'); this.m = q('.dom-m'); this.gh = q('.dom-gh'); this.f = q('.dom-f'); this.lev = q('.dom-lev'); this.paw = q('.dom-paw');
    this.d = qa('.dom-d'); this.D = D; this.g = qa('.dom-g'); this.GT = GT;
    let sp = ''; for (let a = 0; a < 31.4; a += .25) { const r = 14 + 60 * a / 31.4; sp += (r * Math.cos(a)).toFixed(1) + ',' + (r * Math.sin(a)).toFixed(1) + ' '; }
    q('.dom-sp').setAttribute('points', sp);
    this.TPts = [[1784, 812], [3150, 940], [3600, 1010], [4060, 1032]]; this.L = M.plen(this.TPts);
    this.K = [[0, 1840, 720, 1.3], [.6, 2080, 730, 1.26], [1.2, 2420, 740, 1.12], [1.9, 2850, 790, 1.0], [2.5, 3280, 830, .88], [3.0, 3640, 780, .86], [3.45, 3920, 700, .95], [4, 4150, 600, 1.15]];
    this.g.forEach((el, k) => { if (k) el.setAttribute('transform', 'rotate(' + (ang(k, -10) / M.D).toFixed(2) + ')'); });
  },
  render(t) {
    const M = window.MX, c = M.keys(this.K, t);
    M.cam(this.cam, c[0], c[1], c[2]); M.cam(this.far, c[0], c[1], c[2], .55);
    this.d.forEach((el, i) => { const d = this.D[i]; el.setAttribute('transform', 'rotate(' + M.fall(t, d.t0, d.d, d.r).toFixed(2) + ')'); });
    const pf = seg(t, 2.88, 3.28), af = 75.7 * pf * pf + 10 * eo(seg(t, 3.28, 3.42));
    this.f.setAttribute('transform', 'rotate(' + af.toFixed(2) + ')');
    const x = t - 3.4, al = -22 * eo(seg(t, 3.28, 3.4)) + (x > 0 ? 1.5 * Math.sin(x * 22) * Math.exp(-x * 9) : 0);
    this.lev.setAttribute('transform', 'translate(3880 876) rotate(' + al.toFixed(2) + ')');
    this.paw.setAttribute('transform', 'translate(3950 860) rotate(' + (-47 * eo(seg(t, 3.3, 3.44))).toFixed(2) + ')');
    this.g[0].setAttribute('transform', 'rotate(' + (this.ang(0, t - 4) / M.D).toFixed(2) + ')');
    let d = 66 + 300 * t + 104 * t * t; const ta = 3.4;
    if (t > ta) { const y = t - ta; d = this.L - 10 * Math.sin(y * 16) * Math.exp(-y * 7); }
    const p = M.polyAt(this.TPts, d), pg = M.polyAt(this.TPts, d - (300 + 208 * t) * .016);
    M.ball(this.m, p[0], p[1], d * 3.58);
    M.put(this.gh, pg[0], pg[1]); this.gh.style.opacity = t < ta ? (clamp01((t - 1) / 2) * .3).toFixed(3) : '0';
  },
});
});
