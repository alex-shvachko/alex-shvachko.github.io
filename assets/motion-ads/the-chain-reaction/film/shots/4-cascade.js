/* Shot 4 of 7: Color cascade (6 s).
   The marble trips the arm, valves pour cyan, magenta and yellow through tubes into a turbine that spins up. */
FILM.add('cascade', 'Color cascade', 6, function (kit) {
const { seg, eo, eio, clamp01 } = kit;
kit.scene('cascade', {
  init(kit) {
    const M = window.MX, W = M.W3(), Dg = M.D; this.W = W;
    const CH = 'M5530 1134 Q5545 1260 5680 1300 L5930 1335', CC = 'color-mix(in srgb, var(--teal) 45%, var(--mag))';
    const pre = '<rect class="shade" x="5634" y="1246" width="900" height="590" rx="30"/><rect class="k f-plate" x="5620" y="1230" width="900" height="590" rx="30"/>';
    let w = '<path d="' + CH + '" style="fill:none;stroke:var(--second);stroke-width:50;stroke-linecap:round;stroke-linejoin:round"/><path d="' + CH + '" style="fill:none;stroke:color-mix(in srgb, var(--accent) 8%, var(--ground));stroke-width:44;stroke-linecap:round;stroke-linejoin:round"/><path class="cas-ch" d="' + CH + '" style="fill:none;stroke:' + CC + ';stroke-width:22;stroke-linejoin:round"/><path class="cas-chf" d="' + CH + '" style="fill:none;stroke:var(--ground);stroke-width:4;stroke-dasharray:14 26;opacity:0"/><rect class="k f-steel" x="5916" y="1352" width="34" height="12" rx="4"/>';
    w += '<path class="rail" d="M5860 1500 L5750 1790 M5860 1500 L5970 1790" style="stroke-width:10"/><rect class="k f-steel" x="5720" y="1784" width="280" height="16" rx="6"/><path class="rail" d="M5672 1560 Q5672 1716 5860 1716 Q6048 1716 6048 1560" style="stroke-width:8"/>';
    w += '<line class="cas-bt" x1="5860" y1="1450" x2="6400" y2="1510" style="stroke:var(--second);stroke-width:9;stroke-dasharray:12 8"/><line class="cas-bt" x1="5860" y1="1550" x2="6400" y2="1690" style="stroke:var(--second);stroke-width:9;stroke-dasharray:12 8"/>';
    w += '<g transform="translate(5860 1500)"><g class="cas-tu"><circle class="k f-steel" r="112"/>';
    for (let i = 0; i < 6; i++) { const a = i * 60 * Dg; w += '<line class="k" x1="' + (50 * Math.cos(a)).toFixed(1) + '" y1="' + (50 * Math.sin(a)).toFixed(1) + '" x2="' + (104 * Math.cos(a)).toFixed(1) + '" y2="' + (104 * Math.sin(a)).toFixed(1) + '" style="stroke-width:5"/>'; }
    for (let i = 0; i < 12; i++) w += '<rect class="k ' + ['f-teal', 'f-mag', 'f-sun'][i % 3] + '" x="104" y="-16" width="66" height="32" rx="6" transform="rotate(' + (i * 30) + ')"/>';
    w += '<circle class="k f-cop" r="50"/><circle class="k f-ivo" r="34"/><circle class="k f-navy" r="10"/></g></g>';
    w += '<g transform="translate(6400 1600)"><circle class="shade" r="96" cx="10" cy="12"/><g class="cas-p2"><circle class="k f-cop" r="90"/><circle class="k nf" r="72" style="stroke-width:2;opacity:.5"/>';
    for (let i = 0; i < 5; i++) { const a = (i + .5) * 72 * Dg; w += '<circle class="k f-ivo" cx="' + (44 * Math.cos(a)).toFixed(1) + '" cy="' + (44 * Math.sin(a)).toFixed(1) + '" r="14" style="stroke-width:2.5"/>'; }
    w += '<circle class="k f-navy" cx="70" cy="0" r="11"/><circle class="k f-navy" r="16"/><circle class="f-ivo" r="5"/></g></g>';
    for (let k = 0; k < 3; k++) w += '<path class="cas-wf" d="M' + (5934 + k * 7) + ' 1338 Q' + (5966 + k * 7) + ' 1344 ' + (5970 + k * 9) + ' 1420" style="fill:none;stroke:var(--' + W.TC[k] + ');stroke-width:12;stroke-linecap:round;stroke-dasharray:26 10;opacity:0"/>';
    for (let k = 0; k < 10; k++) w += '<circle class="cas-dp" r="' + (3 + k % 3) + '" style="fill:var(--' + W.TC[k % 3] + ');opacity:0"/>';
    [['MIXING CHAMBER M-1', 5690, 1000], ['ROTARY GATE', 5572, 1112], ['CHANNEL', 5730, 1266], ['TURBINE T-6', 6070, 1780], ['POWER TAKE-OFF \u2192 LAUNCHER', 6000, 1430]].forEach(l => { w += '<text class="mono" x="' + l[1] + '" y="' + l[2] + '" style="font-size:13px">' + l[0] + '</text>'; });
    w += '<g class="cas-m">' + M.marble(16) + '</g><polyline points="' + M.pstr(W.MT) + '" style="fill:none;stroke:color-mix(in srgb, var(--accent) 10%, var(--ground));stroke-width:40;stroke-linecap:round;stroke-linejoin:round;opacity:.35"/>';
    kit.stage.append(kit.h('<div class="ground"><svg class="art" viewBox="0 0 1920 1080"><g class="cas-far">' + M.far(0, 5000, 0, 1000) + '</g><g class="cas-cam">' + M.grid('cas-dots', 3000, -1000, 6000, 4000) + pre + M.PB() + W.html() + w + '</g></svg></div>'));
    const q = s => kit.stage.querySelector(s), qa = s => [...kit.stage.querySelectorAll(s)];
    this.cam = q('.cas-cam'); this.far = q('.cas-far'); this.H = W.bind(this.cam);
    this.L = W.tubes.map(p => M.plen(p));
    let lq = '<polyline class="cas-lnk" style="fill:none;stroke:var(--copper);stroke-width:6;stroke-linecap:round;stroke-linejoin:round"/>';
    W.tubes.forEach((p, i) => { const L = this.L[i].toFixed(1); lq += '<polyline class="cas-lq" points="' + M.pstr(p) + '" style="fill:none;stroke:var(--' + W.TC[i] + ');stroke-width:12;stroke-linejoin:round;stroke-dasharray:' + L + ' ' + (this.L[i] + 10).toFixed(1) + ';stroke-dashoffset:' + L + '"/>'; for (let k = 0; k < 4; k++) lq += '<circle class="cas-bb" r="3.5" style="fill:var(--ground);opacity:0"/>'; });
    let mx = '<defs><clipPath id="cas-clip"><circle cx="5530" cy="900" r="146"/></clipPath></defs><g clip-path="url(#cas-clip)">';
    W.E.forEach((e, i) => { mx += '<line class="cas-in" x1="' + e[0] + '" y1="' + e[1] + '" x2="' + e[0] + '" y2="1060" style="stroke:var(--' + W.TC[i] + ');stroke-width:9;stroke-dasharray:20 8;opacity:0"/>'; });
    mx += '<path class="cas-wv" style="fill:' + CC + '"/><g class="cas-swr" style="opacity:0"><g transform="translate(5530 1000)"><g class="cas-sw">';
    for (let i = 0; i < 3; i++) { const r = 24 + i * 20; mx += '<path transform="rotate(' + i * 120 + ')" d="M' + r + ' 0A' + r + ' ' + r + ' 0 1 1 ' + (-.94 * r).toFixed(1) + ' ' + (-.34 * r).toFixed(1) + '" style="fill:none;stroke:var(--' + W.TC[i] + ');stroke-width:9;stroke-linecap:round"/>'; }
    mx += '</g></g></g></g>';
    this.H.liq[0].innerHTML = lq; this.H.mix[0].innerHTML = mx;
    this.lnk = q('.cas-lnk'); this.lq = qa('.cas-lq'); this.bb = qa('.cas-bb'); this.inl = qa('.cas-in'); this.wv = q('.cas-wv'); this.swr = q('.cas-swr'); this.sw = q('.cas-sw');
    this.ch = q('.cas-ch'); this.chf = q('.cas-chf'); this.wf = qa('.cas-wf'); this.dp = qa('.cas-dp'); this.tu = q('.cas-tu'); this.bt = qa('.cas-bt'); this.p2 = q('.cas-p2'); this.m = q('.cas-m');
    let Lc = Math.hypot(250, 35), pp = [5530, 1134];
    for (let i = 1; i <= 24; i++) { const s = i / 24, u = 1 - s, x = u * u * 5530 + 2 * u * s * 5545 + s * s * 5680, y = u * u * 1134 + 2 * u * s * 1260 + s * s * 1300; Lc += Math.hypot(x - pp[0], y - pp[1]); pp = [x, y]; }
    this.Lc = Lc; this.ch.style.strokeDasharray = Lc.toFixed(1) + ' ' + (Lc + 10).toFixed(1); this.ch.style.strokeDashoffset = Lc.toFixed(1);
    this.mp = M.path([{ t: [1.545, 1.65], q: [5144.6, 734.5, 5182, 728, 5195.7, 755.1] }, { t: [1.65, 1.82], l: [5195.7, 755.1, 5300, 795] }, { t: [1.82, 1.88], l: [5300, 795, 5339, 796] }, { t: [1.88, 1.96], l: [5339, 796, 5335, 796] }, { t: [3.0, 3.15], q: [5335, 796, 5342, 800, 5340, 830], e: 'i' }]);
    this.K = [[0, 5000, 560, .85], [.8, 5010, 650, .9], [1.6, 5190, 690, 1.05], [2.15, 5250, 530, 1.0], [2.75, 5420, 420, 1.05], [3.35, 5520, 640, 1.0], [3.95, 5560, 930, 1.0], [4.6, 5770, 1260, .95], [5.3, 5960, 1460, .9], [6, 6380, 1780, 1.6]];
  },
  render(t) {
    const M = window.MX, W = this.W, Dg = M.D, c = M.keys(this.K, t), f1 = x => x.toFixed(1);
    M.cam(this.cam, c[0], c[1], c[2]); M.cam(this.far, c[0], c[1], c[2], .55);
    const ik = (x, y) => { const dx = x - 5040, dy = y - 520, d = Math.min(398, Math.hypot(dx, dy)), ph = Math.atan2(dy, dx), al = Math.acos(d / 400); return [(ph - al) / Dg, 2 * al / Dg]; };
    const p1 = eio(seg(t, 2.5, 2.95)), pv = [p1, eio(seg(t, 2.85, 3.2)), eio(seg(t, 3.2, 3.55))];
    let arm = null;
    if (t >= 2.15) { const th = (180 - 90 * p1) * Dg, g = ik(5380 + 58 * Math.cos(th), 316 + 58 * Math.sin(th)); if (t < 2.5) { const a = eio(seg(t, 2.15, 2.5)); arm = [-53.2 + (g[0] + 53.2) * a, 53.3 + (g[1] - 53.3) * a]; } else arm = g; }
    const r = this.H.render(t + 4, arm);
    const mids = [];
    W.TK.forEach((x, i) => { this.H.h[i].setAttribute('transform', 'rotate(' + f1(-90 * pv[i]) + ')'); const th = (180 - 90 * pv[i]) * Dg; mids.push(f1(x + 30 * Math.cos(th)) + ',' + f1(316 + 30 * Math.sin(th))); });
    this.lnk.setAttribute('points', mids.join(' '));
    this.H.sig[0].style.strokeDashoffset = f1(60 - 536 * seg(t, 1.9, 2.15));
    const dip = 3 * Math.sin(Math.PI * seg(t, 1.88, 2.05)) + 35 * eo(seg(t, 3.0, 3.12)) * (1 - eio(seg(t, 3.45, 3.8)));
    this.H.trig[0].setAttribute('transform', 'rotate(' + f1(dip) + ')');
    const ts = [2.8, 3.15, 3.5], fl = ts.map((s, i) => clamp01((t - s) * 900 / this.L[i]));
    this.lq.forEach((el, i) => { el.style.strokeDashoffset = f1(this.L[i] * (1 - fl[i])); });
    this.bb.forEach((el, k) => { const i = k >> 2, on = fl[i] > .05; el.style.opacity = on ? '.85' : '0'; if (on) { const p = M.polyAt(W.tubes[i], ((t - ts[i]) * 520 + (k & 3) * 140) % (fl[i] * this.L[i])); el.setAttribute('cx', f1(p[0])); el.setAttribute('cy', f1(p[1])); } });
    this.H.lvl.forEach((el, i) => { const dr = 30 * seg(t, ts[i], 6); el.setAttribute('y', f1(118 + dr)); el.setAttribute('height', f1(164 - dr)); });
    const lv = 1052 - 200 * eio(seg(t, 3.0, 4.6)), amp = 5 * clamp01((1052 - lv) / 30);
    let d = 'M5376 1062';
    for (let x = 5376; x <= 5684; x += 14) d += ' L' + x + ' ' + f1(lv + amp * Math.sin(x / 38 + t * 7));
    this.wv.setAttribute('d', d + ' L5684 1062 Z');
    this.inl.forEach((el, i) => { el.style.opacity = fl[i] >= 1 ? '1' : '0'; el.setAttribute('y2', f1(lv + 4)); el.style.strokeDashoffset = f1(-t * 420); });
    this.swr.style.opacity = clamp01((990 - lv) / 60).toFixed(3);
    this.sw.setAttribute('transform', 'rotate(' + f1(t * 170) + ')');
    this.H.gate[0].setAttribute('transform', 'rotate(' + f1(220 * M.R(t - 3.7)) + ')');
    const fc = clamp01((t - 3.75) / .3);
    this.ch.style.strokeDashoffset = f1(this.Lc * (1 - fc));
    this.chf.style.opacity = fc >= 1 ? '.6' : '0'; this.chf.style.strokeDashoffset = f1(-t * 300);
    const wo = clamp01((t - 4.05) / .1).toFixed(2);
    this.wf.forEach(el => { el.style.opacity = wo; el.style.strokeDashoffset = f1(-t * 420); });
    this.dp.forEach((el, k) => { const ph = (t * 1.6 + k * .173) % 1, on = t > 4.15; el.style.opacity = on ? (1 - ph).toFixed(2) : '0'; if (on) { el.setAttribute('cx', f1(5975 + (k % 2 ? 1 : -.7) * (50 + k * 9) * ph)); el.setAttribute('cy', f1(1420 - 150 * ph + 190 * ph * ph)); } });
    const xt = t - 4.2, th = xt < 0 ? 0 : xt < 1.2 ? 125 * xt * xt : 300 * (xt - .6);
    this.tu.setAttribute('transform', 'rotate(' + f1(th) + ')');
    this.bt.forEach(el => { el.style.strokeDashoffset = f1(-th * Dg * 50); });
    this.p2.setAttribute('transform', 'rotate(' + f1(th * 50 / 90) + ')');
    let mx, my, roll;
    if (t < 1.545) { const p = W.conv(20 + r.sb - W.sbm, -48); mx = p[0]; my = p[1]; roll = 507; }
    else if (t < 3.15) { const p = this.mp(t); mx = p[0]; my = p[1]; roll = 507 + (mx - 5144.4) * 3.58; }
    else { const dd = 600 * (t - 3.15), p = M.polyAt(W.MT, dd); mx = p[0]; my = p[1]; roll = 1205 + dd * 3.58; }
    M.ball(this.m, mx, my, roll);
  },
});
});
