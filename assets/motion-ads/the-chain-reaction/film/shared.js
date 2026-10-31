/* Shared drawing kit for every shot: gears, marble, dominoes, camera, motion paths, and the reusable machine sections. */
(function () {
var P = Math.PI, D = P / 180, PITCH = 28, DEP = 12;
function f(n) { return String(Math.round(n * 10) / 10); }
function cl(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
function sg(t, a, b) { return cl((t - a) / (b - a)); }
function R(x) { return x < 0 ? 0 : x < .6 ? x * x / 1.2 : x - .3; }
var EZ = { l: function (p) { return p; }, i: function (p) { return p * p; }, o: function (p) { return 1 - (1 - p) * (1 - p); }, io: function (p) { return p < .5 ? 2 * p * p : 1 - 2 * (1 - p) * (1 - p); } };
var MX = window.MX = { D: D, f: f, EZ: EZ, R: R };
MX.rp = function (n) { return n * PITCH / (2 * P); };
MX.gearD = function (n) {
  var r = MX.rp(n) + DEP / 2, ri = r - DEP, w = P / n, s = '';
  for (var i = 0; i < n; i++) {
    var a = i * 2 * w, pts = [[ri, a - w * .56], [r, a - w * .3], [r, a + w * .3], [ri, a + w * .56]];
    for (var j = 0; j < 4; j++) s += (s ? 'L' : 'M') + f(pts[j][0] * Math.cos(pts[j][1])) + ' ' + f(pts[j][0] * Math.sin(pts[j][1]));
  }
  return s + 'Z';
};
MX.gear = function (n, fill) {
  var ri = MX.rp(n) - DEP / 2, s = '<path class="k ' + fill + '" d="' + MX.gearD(n) + '"/>', i, a;
  s += '<circle class="k nf" r="' + f(ri * .84) + '" style="stroke-width:2;opacity:.5"/>';
  if (ri > 70) {
    var h = ri > 150 ? 6 : 5;
    for (i = 0; i < h; i++) { a = (i + .5) / h * 2 * P; s += '<circle class="k f-ivo" cx="' + f(Math.cos(a) * ri * .5) + '" cy="' + f(Math.sin(a) * ri * .5) + '" r="' + f(ri * .16) + '" style="stroke-width:2.5"/>'; }
    if (ri > 110) for (i = 0; i < 36; i++) { a = i / 36 * 2 * P; var r2 = ri * (i % 3 ? .76 : .72); s += '<line class="k" x1="' + f(Math.cos(a) * ri * .79) + '" y1="' + f(Math.sin(a) * ri * .79) + '" x2="' + f(Math.cos(a) * r2) + '" y2="' + f(Math.sin(a) * r2) + '" style="stroke-width:2"/>'; }
  } else for (i = 0; i < 3; i++) { a = i / 3 * 2 * P; s += '<line class="k" x1="0" y1="0" x2="' + f(Math.cos(a) * ri * .72) + '" y2="' + f(Math.sin(a) * ri * .72) + '" style="stroke-width:' + f(Math.max(3, ri * .12)) + '"/>'; }
  s += '<circle class="k f-navy" r="' + f(Math.max(7, ri * .2)) + '"/><circle class="f-ivo" r="' + f(Math.max(3, ri * .07)) + '"/>';
  return s;
};
MX.mesh = function (a1, n1, n2, phi) { return phi + P + P / n2 - (a1 - phi) * n1 / n2; };
MX.at = function (x, y, n1, n2, phi) { var d = MX.rp(n1) + MX.rp(n2); return [x + Math.cos(phi) * d, y + Math.sin(phi) * d]; };
MX.path = function (segs) {
  return function (t) {
    if (t <= segs[0].t[0]) return MX.ev(segs[0], 0);
    for (var i = 0; i < segs.length; i++) { var s = segs[i]; if (t <= s.t[1]) return MX.ev(s, EZ[s.e || 'l'](sg(t, s.t[0], s.t[1]))); }
    return MX.ev(segs[segs.length - 1], 1);
  };
};
MX.ev = function (s, p) {
  if (s.l) return [s.l[0] + (s.l[2] - s.l[0]) * p, s.l[1] + (s.l[3] - s.l[1]) * p];
  if (s.q) { var q = s.q, u = 1 - p; return [u * u * q[0] + 2 * u * p * q[2] + p * p * q[4], u * u * q[1] + 2 * u * p * q[3] + p * p * q[5]]; }
  var a = s.a, g = (a[3] + (a[4] - a[3]) * p) * D; return [a[0] + Math.cos(g) * a[2], a[1] + Math.sin(g) * a[2]];
};
MX.plen = function (pts) { var L = 0; for (var i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; };
MX.polyAt = function (pts, d) {
  for (var i = 1; i < pts.length; i++) {
    var dx = pts[i][0] - pts[i - 1][0], dy = pts[i][1] - pts[i - 1][1], l = Math.hypot(dx, dy);
    if (d <= l || i == pts.length - 1) { var p = l ? Math.max(0, Math.min(1, d / l)) : 0; return [pts[i - 1][0] + dx * p, pts[i - 1][1] + dy * p]; }
    d -= l;
  }
  return pts[0];
};
MX.pstr = function (pts) { return pts.map(function (p) { return f(p[0]) + ',' + f(p[1]); }).join(' '); };
MX.cam = function (el, cx, cy, z, k) { k = k || 1; el.setAttribute('transform', 'translate(960 540) scale(' + Math.pow(z, k).toFixed(4) + ') translate(' + f(-cx * k) + ' ' + f(-cy * k) + ')'); };
MX.keys = function (K, t) {
  var n = K.length, i = 0, r = [], j;
  if (t <= K[0][0]) return K[0].slice(1);
  if (t >= K[n - 1][0]) return K[n - 1].slice(1);
  while (t > K[i + 1][0]) i++;
  var u = (t - K[i][0]) / (K[i + 1][0] - K[i][0]), A = K[Math.max(0, i - 1)], B = K[i], C = K[i + 1], E = K[Math.min(n - 1, i + 2)];
  for (j = 1; j < 4; j++) {
    var lg = j == 3, p0 = lg ? Math.log(A[j]) : A[j], p1 = lg ? Math.log(B[j]) : B[j], p2 = lg ? Math.log(C[j]) : C[j], p3 = lg ? Math.log(E[j]) : E[j];
    var v = .5 * (2 * p1 + (p2 - p0) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (3 * p1 - p0 - 3 * p2 + p3) * u * u * u);
    r.push(lg ? Math.exp(v) : v);
  }
  return r;
};
MX.put = function (el, x, y, rot, s) { el.setAttribute('transform', 'translate(' + f(x) + ' ' + f(y) + ')' + (rot ? ' rotate(' + f(rot) + ')' : '') + (s != null && s !== 1 ? ' scale(' + s.toFixed(3) + ')' : '')); };
MX.marble = function (r) {
  return '<circle class="k f-mdk" r="' + f(r) + '" style="stroke-width:' + f(Math.max(2, r * .14)) + '"/><circle class="f-main" cx="' + f(-r * .12) + '" cy="' + f(-r * .12) + '" r="' + f(r * .8) + '"/><g class="mx-spin"><path class="mx-sw" d="M' + f(-r * .5) + ' 0A' + f(r * .5) + ' ' + f(r * .5) + ' 0 0 1 ' + f(r * .5) + ' 0" style="stroke-width:' + f(r * .14) + '"/></g><ellipse class="f-ivo" cx="' + f(-r * .36) + '" cy="' + f(-r * .4) + '" rx="' + f(r * .26) + '" ry="' + f(r * .16) + '" transform="rotate(-38 ' + f(-r * .36) + ' ' + f(-r * .4) + ')" style="opacity:.92"/>';
};
MX.ball = function (g, x, y, roll, s) { MX.put(g, x, y, 0, s); var sp = g.querySelector('.mx-spin'); if (sp) sp.setAttribute('transform', 'rotate(' + f(roll || 0) + ')'); };
MX.domino = function (w, h, fill) {
  return '<rect class="k ' + fill + '" x="' + f(-w) + '" y="' + f(-h) + '" width="' + f(w) + '" height="' + f(h) + '" rx="' + f(w * .2) + '"/><rect class="shade" x="' + f(-w * .32) + '" y="' + f(3 - h) + '" width="' + f(w * .32 - 3) + '" height="' + f(h - 6) + '" rx="2"/><line class="k" x1="' + f(-w * .78) + '" y1="' + f(-h / 2) + '" x2="' + f(-w * .22) + '" y2="' + f(-h / 2) + '" style="stroke-width:2"/><circle class="f-navy" cx="' + f(-w * .52) + '" cy="' + f(-h * .76) + '" r="' + f(w * .11) + '"/><circle class="f-navy" cx="' + f(-w * .52) + '" cy="' + f(-h * .24) + '" r="' + f(w * .11) + '"/>';
};
MX.fall = function (t, t0, dur, rest) { var p = sg(t, t0, t0 + dur), x = t - t0 - dur; return p < 1 ? rest * p * p : rest - 2.5 * Math.sin(x * 18) * Math.exp(-x * 9); };
MX.grid = function (id, x, y, w, h) { return '<defs><pattern id="' + id + '" width="48" height="48" patternUnits="userSpaceOnUse"><circle cx="24" cy="24" r="2.2" class="dot"/></pattern></defs><rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="url(#' + id + ')"/>'; };
MX.far = function (x0, x1, y0, y1) {
  var s = '', i, x, y;
  for (x = Math.ceil(x0 / 700) * 700; x < x1; x += 700) {
    i = Math.round(x / 700); y = y0 + ((i * 377) % 1000) / 1000 * (y1 - y0);
    s += '<circle class="far" cx="' + x + '" cy="' + f(y) + '" r="' + (120 + (i * 53) % 220) + '"/>';
    if (i % 2) s += '<line class="far" x1="' + (x - 300) + '" y1="' + f(y + 260) + '" x2="' + (x + 500) + '" y2="' + f(y + 260) + '"/>';
    if (i % 3 == 0) s += '<rect class="far" x="' + (x + 120) + '" y="' + f(y - 200) + '" width="180" height="180" rx="10"/>';
  }
  return s;
};
MX.OVP = [
  [[1900, 1080], [1600, 1080], [1600, 760], [1330, 760]],
  [[1900, 1080], [1300, 1080], [1300, 1150], [720, 1150]],
  [[1900, 1080], [1900, 1340], [1250, 1340], [1250, 1500]],
  [[1900, 1080], [1900, 1955]],
  [[1900, 1080], [2200, 1080], [2200, 620], [2445, 620]],
  [[1900, 1080], [2380, 1080], [2380, 960], [2440, 960]],
  [[1900, 1080], [2250, 1080], [2250, 1500], [2940, 1500]],
  [[1900, 1080], [1760, 1080], [1760, 420], [1700, 420], [1700, 370]]
];
MX.OVC = ['accent', 'sun', 'lime', 'copper', 'teal', 'lav', 'mag', 'teal'];
MX.OVG = [{ n: 48, c: 'f-acc', x: 1150, y: 520 }, { n: 18, c: 'f-sun', m: 0, p: -15 }, { n: 30, c: 'f-teal', m: 0, p: 200 }, { n: 12, c: 'f-lav', m: 1, p: 40 }, { n: 22, c: 'f-cop', m: 0, p: 110 }, { n: 14, c: 'f-lime', m: 2, p: 250 }];
MX.OVG.forEach(function (o) { if (o.m != null) { var q = MX.OVG[o.m], xy = MX.at(q.x, q.y, q.n, o.n, o.p * D); o.x = xy[0]; o.y = xy[1]; } });
MX.ovHTML = function () {
  var s = '', i, k, r, x, y, g, ps, pts;
  var plate = function (x, y, w, h) { return '<rect class="shade" x="' + (x + 14) + '" y="' + (y + 16) + '" width="' + w + '" height="' + h + '" rx="28"/><rect class="k f-plate" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="28"/>'; };
  var lab = function (x, y, t) { return '<text class="mono" x="' + x + '" y="' + y + '" style="font-size:24px">' + t + '</text>'; };
  var sec = function (cx, cy, inner) { return '<g class="ov-sec" data-c="' + cx + ' ' + cy + '">' + inner + '</g>'; };
  g = '';
  MX.OVP.forEach(function (pt, k) {
    var p2 = MX.pstr(pt), L = MX.plen(pt);
    g += '<polyline class="k nf" points="' + p2 + '" style="stroke-width:18"/><polyline points="' + p2 + '" style="fill:none;stroke:var(--ground);stroke-width:11;stroke-linejoin:round"/><polyline class="ov-lit" points="' + p2 + '" style="fill:none;stroke:var(--' + MX.OVC[k] + ');stroke-width:8;stroke-linejoin:round;stroke-linecap:round;stroke-dasharray:' + f(L) + ' ' + f(L + 20) + ';stroke-dashoffset:' + f(L) + '"/>';
    for (var j = 0; j < 2; j++) g += '<circle class="k ov-ball" r="9" cx="' + pt[0][0] + '" cy="' + pt[0][1] + '" style="fill:var(--' + MX.OVC[k] + ');stroke-width:2;opacity:0"/>';
  });
  s += sec(1900, 1080, g);
  g = plate(600, 110, 1040, 850);
  MX.OVG.forEach(function (o) { g += '<g transform="translate(' + f(o.x) + ' ' + f(o.y) + ')"><circle class="shade" r="' + f(MX.rp(o.n) + 10) + '" cx="10" cy="12"/><g class="ov-g">' + MX.gear(o.n, o.c) + '</g></g>'; });
  g += lab(640, 940, 'SEC.A — GEAR TRAIN 48:18:30');
  s += sec(1120, 535, g);
  g = plate(140, 990, 560, 420);
  for (r = 0; r < 3; r++) {
    y = 1080 + 140 * r;
    g += '<line class="rail" x1="150" y1="' + (y + 3) + '" x2="640" y2="' + (y + 3) + '"/>';
    for (i = 0; i < 11; i++) g += '<g transform="translate(' + (180 + i * 42) + ' ' + y + ')"><g class="ov-d" data-r="' + r + '" data-i="' + i + '">' + MX.domino(18 + 3 * r, 70 + 20 * r, ['f-ivo', 'f-acc', 'f-sun'][r]) + '</g></g>';
  }
  g += lab(170, 1398, 'SEC.B — DOMINO ARRAY');
  s += sec(420, 1200, g);
  g = '<g transform="translate(850 1620) rotate(-14)">' + plate(-420, -90, 840, 190);
  [-300, 0, 300].forEach(function (lx) { g += '<line class="k" x1="' + lx + '" y1="22" x2="' + (lx - 24) + '" y2="88" style="stroke-width:7"/>'; });
  g += '<rect class="k f-navy" x="-380" y="-22" width="760" height="44" rx="22"/>';
  for (i = 0; i < 11; i++) g += '<g transform="translate(' + (-350 + i * 70) + ' 0)"><g class="ov-roll"><circle class="k f-steel" r="15" style="stroke-width:2"/><line class="k" x1="-11" y1="0" x2="11" y2="0" style="stroke-width:2.5"/></g></g>';
  g += '<line class="ov-belt" x1="-372" y1="-22" x2="372" y2="-22" style="stroke:var(--lime);stroke-width:5;stroke-dasharray:16 20"/>';
  ['f-lime', 'f-sun', 'f-teal', 'f-lav', 'f-acc', 'f-cop'].forEach(function (c, j) { g += '<g class="ov-item" data-x="' + (j * 127) + '"><rect class="k ' + c + '" x="-18" y="-52" width="36" height="30" rx="6"/></g>'; });
  g += lab(-400, 82, 'SEC.C — CONVEYOR') + '</g>';
  s += sec(850, 1620, g);
  g = plate(1420, 1640, 980, 350) + '<rect class="k f-steel" x="1450" y="1942" width="900" height="22" rx="11"/>';
  for (i = 0; i < 8; i++) {
    x = 1480 + i * 120;
    g += '<g class="ov-p"><rect class="k f-navy" x="' + (x - 9) + '" y="1700" width="18" height="120"/><rect class="k ' + (i % 2 ? 'f-lime' : 'f-cop') + '" x="' + (x - 36) + '" y="1676" width="72" height="28" rx="9"/></g><rect class="k f-steel" x="' + (x - 30) + '" y="1790" width="60" height="152" rx="8"/><line class="k" x1="' + (x - 30) + '" y1="1822" x2="' + (x + 30) + '" y2="1822"/><line class="k" x1="' + (x - 30) + '" y1="1910" x2="' + (x + 30) + '" y2="1910"/>';
  }
  g += lab(1450, 1984, 'SEC.G — PISTONS ×8');
  s += sec(1900, 1815, g);
  g = plate(2330, 110, 450, 1010);
  var TX = [2420, 2555, 2690], TC = ['teal', 'mag', 'sun'];
  for (i = 0; i < 3; i++) {
    x = TX[i];
    g += '<rect class="glass" x="' + (x - 52) + '" y="150" width="104" height="140" rx="16"/><rect x="' + (x - 44) + '" y="196" width="88" height="86" rx="10" style="fill:var(--' + TC[i] + ')"/><rect class="k f-steel" x="' + (x - 58) + '" y="140" width="116" height="16" rx="6"/>';
    pts = []; for (k = 0; k <= 24; k++) { var p = k / 24; pts.push([x + (2555 + (i - 1) * 32 - x) * p + 30 * Math.sin(p * P * 2 + i * 2.1) * Math.sin(p * P), 300 + p * 228]); }
    ps = MX.pstr(pts);
    g += '<polyline class="k nf" points="' + ps + '" style="stroke-width:26"/><polyline points="' + ps + '" style="fill:none;stroke:var(--ground);stroke-width:20;stroke-linejoin:round"/><polyline class="ov-tube" points="' + ps + '" style="fill:none;stroke:var(--' + TC[i] + ');stroke-width:10;stroke-dasharray:22 8;stroke-linejoin:round"/><circle class="k f-steel" cx="' + x + '" cy="300" r="13"/>';
  }
  g += '<circle class="glass" cx="2555" cy="620" r="102"/><circle cx="2555" cy="628" r="88" style="fill:color-mix(in srgb, var(--lav) 45%, var(--teal))"/><g transform="translate(2555 628)"><g class="ov-swirl">';
  for (i = 0; i < 3; i++) { r = 26 + i * 20; g += '<path transform="rotate(' + (i * 120) + ')" d="M' + r + ' 0A' + r + ' ' + r + ' 0 1 1 ' + f(-.94 * r) + ' ' + f(-.34 * r) + '" style="fill:none;stroke:var(--' + TC[i] + ');stroke-width:9;stroke-linecap:round"/>'; }
  g += '</g></g><path d="M2495 565 A70 70 0 0 1 2560 532" style="fill:none;stroke:var(--ground);stroke-width:8;stroke-linecap:round;opacity:.8"/><rect class="k f-steel" x="2539" y="716" width="32" height="70" rx="6"/>';
  for (i = 0; i < 3; i++) g += '<line class="ov-rib" x1="' + (2543 + i * 12) + '" y1="786" x2="' + (2583 + i * 12) + '" y2="850" style="stroke:var(--' + TC[i] + ');stroke-width:10;stroke-dasharray:18 7"/>';
  g += '<path class="rail" d="M2425 1000 Q2425 1092 2555 1092 Q2685 1092 2685 1000"/><g transform="translate(2555 960)"><g class="ov-tur"><circle class="k f-steel" r="66"/>';
  for (i = 0; i < 10; i++) g += '<rect class="k ' + ['f-teal', 'f-mag', 'f-sun'][i % 3] + '" x="56" y="-12" width="58" height="24" rx="5" transform="rotate(' + (i * 36) + ')"/>';
  g += '<circle class="k f-navy" r="16"/></g></g>' + lab(2360, 1102, 'SEC.D — PIGMENT TURBINE');
  s += sec(2555, 615, g);
  g = plate(2900, 300, 800, 1680) + '<path class="rail" d="M2990 1013 A330 330 0 1 1 3610 1013" style="stroke-width:8"/><path class="rail" d="M3027.5 999.2 A290 290 0 1 1 3572.5 999.2" style="stroke-width:5"/>';
  [[3300, 900, 60, 'f-sun'], [3140, 1300, 46, 'f-teal'], [3460, 1300, 46, 'f-lav']].forEach(function (b) { g += '<g transform="translate(' + b[0] + ' ' + b[1] + ')"><g class="ov-bump"><circle class="k ' + b[3] + '" r="' + b[2] + '"/><circle class="k f-ivo" r="' + f(b[2] * .55) + '"/><circle class="' + b[3] + '" r="' + f(b[2] * .22) + '"/></g></g>'; });
  [[3150, 1080], [3450, 1080]].forEach(function (q) { g += '<g transform="translate(' + q[0] + ' ' + q[1] + ')"><rect class="k f-acc ov-sq" x="-26" y="-26" width="52" height="52" rx="8"/></g>'; });
  [[3060, 1580, 1], [3540, 1580, -1], [3200, 1800, 1]].forEach(function (q) { g += '<g transform="translate(' + q[0] + ' ' + q[1] + ') scale(' + q[2] + ' 1)"><g class="ov-flip"><path class="k f-mag" d="M0 -17 L150 -7 A7 7 0 0 1 150 7 L0 17 A17 17 0 0 1 0 -17Z"/><circle class="f-navy" r="6"/></g></g>'; });
  var zz = 'M3640 1700'; for (i = 1; i <= 12; i++) zz += ' L' + (3640 + (i % 2 ? 22 : -22)) + ' ' + (1700 + i * 16);
  g += '<path class="rail" d="' + zz + '" style="stroke-width:5"/><rect class="k f-cop" x="3610" y="1680" width="60" height="20" rx="6"/><line class="rail" x1="3640" y1="1680" x2="3640" y2="1180"/><circle class="k f-sun ov-pball" r="16" cx="3300" cy="590"/>' + lab(2940, 1960, 'SEC.F — PINBALL');
  s += sec(3300, 1140, g);
  g = '<circle class="shade" cx="1714" cy="276" r="118"/><circle class="k f-plate" cx="1700" cy="260" r="118"/><circle class="k f-ivo" cx="1700" cy="260" r="100"/><g transform="translate(1700 260)"><g class="ov-fan">';
  for (i = 0; i < 6; i++) g += '<ellipse class="k f-lime" cx="50" cy="0" rx="44" ry="15" transform="rotate(' + (i * 60) + ')"/>';
  g += '<circle class="k f-navy" r="14"/></g></g>' + lab(1835, 268, 'SEC.E — FAN');
  s += sec(1700, 260, g);
  g = '<g transform="translate(1900 1080)"><circle class="ov-ring" r="250" style="fill:none;stroke:var(--accent);stroke-width:8;stroke-dasharray:60 30"/><circle class="ov-ring" r="345" style="fill:none;stroke:var(--sun);stroke-width:14;stroke-linecap:round;stroke-dasharray:1 30"/><circle class="ov-ring" r="440" style="fill:none;stroke:var(--teal);stroke-width:6;stroke-dasharray:150 46"/>';
  for (i = 0; i < 4; i++) g += '<circle class="k ov-rball ' + ['f-lav', 'f-lime', 'f-cop', 'f-acc'][i] + '" r="13" cx="345" cy="0"/>';
  g += '<rect class="shade" x="-116" y="-56" width="260" height="190" rx="32"/><rect class="k f-plate" x="-130" y="-72" width="260" height="190" rx="32"/><circle class="lite ov-pulse" r="70" style="opacity:0"/><circle class="k f-ivo" r="66"/><g class="ov-btn"><circle class="k f-main" r="46"/><circle class="f-ivo" cx="-15" cy="-17" r="10" style="opacity:.7"/></g><text class="mono" x="0" y="102" style="font-size:20px;text-anchor:middle">MASTER</text></g>';
  s += sec(1900, 1080, g);
  return s;
};
MX.ovBind = function (root) {
  var H = {};
  ['g', 'd', 'roll', 'belt', 'item', 'p', 'tube', 'swirl', 'rib', 'tur', 'bump', 'flip', 'sq', 'pball', 'fan', 'ring', 'rball', 'lit', 'ball', 'btn', 'pulse', 'sec'].forEach(function (c) { H[c] = Array.prototype.slice.call(root.querySelectorAll('.ov-' + c)); });
  H.len = MX.OVP.map(MX.plen);
  H.render = function (T, W) {
    var a = H.len.map(function (L) { return W + .08 + L / 1700; });
    var ph = function (k) { return .06 * T + .94 * R(T - a[k]); };
    H.lit.forEach(function (el, k) { el.style.strokeDashoffset = f(H.len[k] * (1 - cl((T - W) * 1700 / H.len[k]))); });
    H.ball.forEach(function (el, k) { var j = k >> 1, L = H.len[j], on = T > a[j]; el.style.opacity = on ? 1 : 0; if (on) { var pt = MX.polyAt(MX.OVP[j], ((T - a[j]) * 520 + (k & 1) * L / 2) % L); el.setAttribute('cx', f(pt[0])); el.setAttribute('cy', f(pt[1])); } });
    var ang = [], A = ph(0) * 1.5;
    MX.OVG.forEach(function (o, k) { ang[k] = k ? MX.mesh(ang[o.m], MX.OVG[o.m].n, o.n, o.p * D) : A; if (H.g[k]) H.g[k].setAttribute('transform', 'rotate(' + f(ang[k] / D) + ')'); });
    H.d.forEach(function (el) { var r = +el.getAttribute('data-r'), i = +el.getAttribute('data-i'), t0 = a[1] + (10 - i) * .045 + r * .12, rest = i == 10 ? 80 : 62; el.setAttribute('transform', 'rotate(' + f(rest * (1 - EZ.io(sg(T, t0, t0 + .4)))) + ')'); });
    var c = ph(2);
    H.roll.forEach(function (el) { el.setAttribute('transform', 'rotate(' + f(c * 573) + ')'); });
    H.belt.forEach(function (el) { el.style.strokeDashoffset = f(-c * 150); });
    H.item.forEach(function (el) { var x = ((+el.getAttribute('data-x') + c * 150) % 760 + 760) % 760 - 380; el.setAttribute('transform', 'translate(' + f(x) + ' 0)'); el.style.opacity = f(cl((380 - Math.abs(x)) / 40)); });
    var pp = ph(3);
    H.p.forEach(function (el, i) { el.setAttribute('transform', 'translate(0 ' + f(-24 - 24 * Math.sin(pp * 7 - i * .8)) + ')'); });
    var d = ph(4);
    H.tube.forEach(function (el) { el.style.strokeDashoffset = f(-d * 220); });
    H.rib.forEach(function (el) { el.style.strokeDashoffset = f(-d * 260); });
    H.swirl.forEach(function (el) { el.setAttribute('transform', 'rotate(' + f(d * 160) + ')'); });
    H.tur.forEach(function (el) { el.setAttribute('transform', 'rotate(' + f(ph(5) * 260) + ')'); });
    var b = ph(6);
    H.bump.forEach(function (el, k) { el.setAttribute('transform', 'scale(' + (1 + .09 * Math.max(0, Math.sin(b * 8 + k * 2.1))).toFixed(3) + ')'); });
    H.flip.forEach(function (el, k) { el.setAttribute('transform', 'rotate(' + f(22 - 40 * Math.max(0, Math.sin(b * 6 + k * 2))) + ')'); });
    H.sq.forEach(function (el, k) { el.setAttribute('transform', 'rotate(' + f(b * (k ? -140 : 140)) + ')'); });
    var pa = (160 + 220 * (.5 - .5 * Math.cos(b * 2.6))) * D;
    H.pball.forEach(function (el) { el.setAttribute('cx', f(3300 + 310 * Math.cos(pa))); el.setAttribute('cy', f(900 + 310 * Math.sin(pa))); });
    H.fan.forEach(function (el) { el.setAttribute('transform', 'rotate(' + f(ph(7) * 600) + ')'); });
    var rr = .06 * T + .94 * R(T - W);
    H.ring.forEach(function (el, k) { el.setAttribute('transform', 'rotate(' + f((k % 2 ? -1 : 1) * rr * (34 - k * 9)) + ')'); });
    H.rball.forEach(function (el, k) { var g = rr * .9 + k * P / 2; el.setAttribute('cx', f(345 * Math.cos(g))); el.setAttribute('cy', f(345 * Math.sin(g))); });
    var pr = EZ.o(sg(T, W, W + .07)) * (1 - .35 * EZ.o(sg(T, W + .07, W + .3)));
    H.btn.forEach(function (el) { el.setAttribute('transform', 'translate(0 ' + f(6 * pr) + ') scale(' + (1 - .06 * pr).toFixed(3) + ')'); });
    var pu = sg(T, W, W + .9);
    H.pulse.forEach(function (el) { el.setAttribute('r', f(70 + 240 * EZ.o(pu))); el.style.opacity = f(pu > 0 && pu < 1 ? 1 - pu : 0); });
  };
  return H;
};
})();
(function () {
var P = Math.PI, D = P / 180, MX = window.MX, f = MX.f, EZ = MX.EZ;
function sg(t, a, b) { var x = (t - a) / (b - a); return x < 0 ? 0 : x > 1 ? 1 : x; }
MX.W3 = function () {
  var GT = [{ n: 60, x: 4150, y: 560 }, { n: 20, m: 0, p: -30, te: .35 }, { n: 28, m: 1, p: 10, te: .65 }, { n: 14, m: 1, p: -105, te: .8 }, { n: 36, m: 2, p: 70, te: 1.05 }, { n: 12, m: 0, p: 100, te: 1.3 }];
  GT.forEach(function (g) { if (g.m != null) { var q = GT[g.m], xy = MX.at(q.x, q.y, q.n, g.n, g.p * D); g.x = xy[0]; g.y = xy[1]; } });
  var gam = function (T) { return T < 0 ? 0 : T < 1 ? 30 * T * T : 30 + 60 * (T - 1); };
  var ang = function (k, u) { return k ? MX.mesh(ang(GT[k].m, Math.max(u, GT[k].te)), GT[GT[k].m].n, GT[k].n, GT[k].p * D) : gam(u + .6) * D; };
  var W = { GT: GT, ang: ang };
  W.a5e = ang(5, 1.3);
  W.sb = function (u) { return Math.max(0, (W.a5e - ang(5, u)) * 53.5); };
  W.sbm = W.sb(1.76);
  W.conv = function (lx, ly) { return [4120 + .96082 * lx + .27715 * ly, 1080 - .27715 * lx + .96082 * ly]; };
  W.TK = [5380, 5530, 5680]; W.TC = ['teal', 'mag', 'sun']; W.E = [[5455, 770], [5530, 750], [5605, 770]];
  W.tubes = W.TK.map(function (x, i) { var pts = []; for (var k = 0; k <= 40; k++) { var p = k / 40; pts.push([x + (W.E[i][0] - x) * p + 70 * Math.sin(p * P * 2.5 + i * 2.1) * Math.sin(p * P), 342 + (W.E[i][1] - 342) * p]); } return pts; });
  W.MT = [[5340, 830], [5340, 1708], [5392, 1760], [6400, 1760], [6452, 1800]];
  W.gl = function (pts, wd) { return '<polyline points="' + pts + '" style="fill:none;stroke:var(--second);stroke-width:' + (wd + 6) + ';stroke-linecap:round;stroke-linejoin:round"/><polyline points="' + pts + '" style="fill:none;stroke:color-mix(in srgb, var(--accent) 8%, var(--ground));stroke-width:' + wd + ';stroke-linecap:round;stroke-linejoin:round"/>'; };
  W.html = function () {
    var s = '', i, x, yc, sp = '', a;
    for (a = 0; a < 31.4; a += .25) { var r = 14 + 60 * a / 31.4; sp += f(r * Math.cos(a)) + ',' + f(r * Math.sin(a)) + ' '; }
    var TP = '1784,812 3150,940 3600,1010 4020,1030';
    s += '<rect class="shade" x="3894" y="116" width="1120" height="840" rx="36"/><rect class="k f-plate" x="3880" y="100" width="1120" height="840" rx="36"/><text class="mono" x="3910" y="140" style="font-size:13px">G-01 · Ø535 · 60T · MAINSPRING DRIVE</text>';
    s += '<rect class="shade" x="5274" y="46" width="520" height="1080" rx="30"/><rect class="k f-plate" x="5260" y="30" width="520" height="1080" rx="30"/><text class="mono" x="5290" y="1094" style="font-size:13px">PIGMENT TOWER · C / M / Y</text>';
    s += '<polyline points="5300,826 5090,826 5090,556" style="fill:none;stroke:var(--copper);stroke-width:5;stroke-linejoin:round"/><polyline class="w3-sig" points="5300,826 5090,826 5090,556" style="fill:none;stroke:var(--sun);stroke-width:7;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:60 1000;stroke-dashoffset:60"/>';
    s += W.gl(MX.pstr(W.MT), 40) + W.gl(TP, 40);
    var FY = [880, 900, 910, 900, 880], BY = [850, 825, 812, 825, 850];
    [[BY, .86], [FY, 1]].forEach(function (rw) { for (var j = 0; j < 5; j++) { var dx = 3248 + 78 * j; s += '<line class="rail" x1="' + f(dx - 28 * rw[1] - 14) + '" y1="' + (rw[0][j] + 3) + '" x2="' + (dx + 16) + '" y2="' + (rw[0][j] + 3) + '" style="stroke-width:' + (rw[1] < 1 ? 4 : 6) + '"/><g transform="translate(' + dx + ' ' + rw[0][j] + ') scale(' + rw[1] + ') rotate(66)">' + MX.domino(28, 150, 'f-main') + '</g>'; } });
    s += '<line class="rail" x1="3590" y1="883" x2="3680" y2="883"/><g transform="translate(3660 880) rotate(85.7)"><rect class="k f-navy" x="-50" y="-300" width="50" height="300" rx="10"/><rect class="f-sun" x="-44" y="-160" width="38" height="16" rx="4"/><circle class="f-ivo" cx="-25" cy="-240" r="7"/><circle class="f-ivo" cx="-25" cy="-70" r="7"/></g>';
    s += '<rect class="k f-steel" x="3872" y="876" width="16" height="84" rx="4"/><rect class="k f-steel" x="3846" y="956" width="68" height="12" rx="4"/><g transform="translate(3880 876) rotate(-22)"><g transform="rotate(12.3)"><rect class="k f-cop" x="-118" y="-7" width="236" height="14" rx="7"/></g><circle class="k f-navy" r="9"/><circle class="f-ivo" r="3"/></g><text class="mono" x="3760" y="1000" style="font-size:12px">B-07 · BRASS LEVER</text>';
    s += '<g transform="translate(3950 860) rotate(-47)"><path class="k f-cop" d="M-8 4 L38 24 L44 34 L36 38 L-6 14 Z"/><path class="k f-cop" d="M-7 -2 L18 -86 L32 -98 L36 -88 L26 -78 L7 2 Z"/><circle class="k f-navy" r="7"/></g><text class="mono" x="3900" y="720" style="font-size:11px">LOCK</text>';
    W.TK.forEach(function (x, i) {
      s += '<rect class="glass" x="' + (x - 56) + '" y="70" width="112" height="220" rx="18"/><rect class="w3-lvl" x="' + (x - 46) + '" y="118" width="92" height="164" rx="12" style="fill:var(--' + W.TC[i] + ')"/><path d="M' + (x - 36) + ' 140 V250" style="stroke:var(--ground);stroke-width:6;stroke-linecap:round;opacity:.6"/><rect class="k f-steel" x="' + (x - 64) + '" y="58" width="128" height="20" rx="7"/><text class="mono" x="' + x + '" y="73" style="font-size:12px;text-anchor:middle">' + 'CMY'[i] + '-0' + (i + 1) + '</text>';
      s += W.gl(MX.pstr(W.tubes[i]), 22);
    });
    s += '<g class="w3-liq"></g>';
    W.TK.forEach(function (x) { s += '<circle class="k f-steel" cx="' + x + '" cy="316" r="26"/><g transform="translate(' + x + ' 316)"><g class="w3-h"><rect class="k f-cop" x="-62" y="-6" width="62" height="12" rx="6"/><circle class="k f-cop" cx="-58" cy="0" r="9"/></g></g><circle class="k f-ivo" cx="' + x + '" cy="316" r="9"/>'; });
    s += '<circle class="glass" cx="5530" cy="900" r="150" style="stroke-width:4"/><g class="w3-mix"></g><path d="M5438 822 A122 122 0 0 1 5530 778" style="fill:none;stroke:var(--ground);stroke-width:10;stroke-linecap:round;opacity:.9"/><rect class="k f-steel" x="5508" y="1046" width="44" height="34" rx="6"/><g transform="translate(5530 1104)"><g class="w3-gate"><rect class="k f-steel" x="-5" y="-30" width="10" height="60" rx="3"/><rect class="k f-steel" x="-30" y="-5" width="60" height="10" rx="3"/><circle class="k f-navy" r="8"/></g></g>';
    s += '<path class="rail" d="M5190 770 L5300 812"/><g transform="translate(5300 812)"><g class="w3-trig"><rect class="k f-cop" x="0" y="0" width="54" height="10" rx="4"/></g></g><line class="rail" x1="5358" y1="772" x2="5358" y2="822"/><text class="mono" x="5150" y="862" style="font-size:12px">TRIGGER T-4</text>';
    s += '<g transform="translate(4120 1080) rotate(-16.09)"><rect class="k f-plate" x="40" y="34" width="1000" height="22" rx="8"/><rect class="k f-navy" x="-32" y="-32" width="1146" height="64" rx="32"/><rect class="f-steel" x="-18" y="-18" width="1118" height="36" rx="18"/>';
    for (x = 0; x <= 1080; x += 120) s += '<circle class="k f-ivo" cx="' + x + '" r="13" style="stroke-width:2"/>';
    s += '<line class="w3-belt" x1="0" y1="-32" x2="1080" y2="-32" style="stroke:var(--lime);stroke-width:5;stroke-dasharray:18 22"/></g>';
    for (i = 0; i < 5; i++) {
      x = 4380 + 130 * i; yc = 1080 - (x - 4120) * .2885;
      s += '<g class="w3-p"><rect class="k f-navy" x="' + (x - 8) + '" y="' + f(yc + 90) + '" width="16" height="70"/><rect class="k ' + (i % 2 ? 'f-lime' : 'f-cop') + '" x="' + (x - 30) + '" y="' + f(yc + 76) + '" width="60" height="22" rx="8"/></g><rect class="k f-steel" x="' + (x - 24) + '" y="' + f(yc + 140) + '" width="48" height="110" rx="8"/><line class="k" x1="' + (x - 24) + '" y1="' + f(yc + 172) + '" x2="' + (x + 24) + '" y2="' + f(yc + 172) + '"/>';
    }
    s += '<polyline class="rail" points="4340,' + f(1080 - 220 * .2885 + 252) + ' 4940,' + f(1080 - 820 * .2885 + 252) + '"/><text class="mono" x="4360" y="' + f(1080 - 240 * .2885 + 292) + '" style="font-size:12px">PUMP ROW P-5</text>';
    s += '<path class="rail" d="M4026 1050 H4080"/><g class="w3-flap"><rect class="k f-cop" x="-5" y="-100" width="10" height="100" rx="5"/><circle class="k f-navy" r="6"/></g><text class="mono" x="3990" y="1086" style="font-size:11px">CATCH C-1</text>';
    GT.forEach(function (g, k) { s += '<g class="w3-gp"><circle class="shade" r="' + f(MX.rp(g.n) + 12) + '" cx="12" cy="14"/><g class="w3-g">' + MX.gear(g.n, ['f-acc', 'f-sun', 'f-teal', 'f-lav', 'f-cop', 'f-lime'][k]) + (k == 5 ? '<path class="k f-cop" d="M-14 0 A14 14 0 0 1 14 0 L8 78 A8 8 0 0 1 -8 78 Z" transform="rotate(' + f(-ang(5, 1.5) / D) + ')"/>' : '') + (k ? '' : '<circle class="k f-ivo" r="80"/><polyline points="' + sp + '" style="fill:none;stroke:var(--second);stroke-width:3"/><circle class="k f-navy" r="13"/>') + '</g></g>'; });
    for (i = 0; i < 5; i++) s += '<circle class="lite w3-pu" r="6" style="opacity:0"/>';
    s += '<line class="w3-ch" x2="4150" y2="1080" style="stroke:var(--second);stroke-width:7;stroke-dasharray:9 6;opacity:0"/><line class="w3-ch" x2="4090" y2="1080" style="stroke:var(--second);stroke-width:7;stroke-dasharray:9 6;opacity:0"/>';
    s += '<line class="w3-rod" style="stroke:var(--second);stroke-width:14;stroke-linecap:round;opacity:0"/><line class="w3-rod" style="stroke:var(--copper);stroke-width:7;stroke-linecap:round;opacity:0"/><circle class="k f-navy w3-pin" r="9" style="opacity:0"/>';
    s += '<rect class="shade" x="5012" y="494" width="72" height="76" rx="10"/><rect class="k f-steel" x="5004" y="486" width="72" height="76" rx="10"/><circle class="k f-ivo" cx="5018" cy="550" r="4"/><circle class="k f-ivo" cx="5062" cy="550" r="4"/><text class="mono" x="5000" y="476" style="font-size:12px">ARM A-3</text>';
    s += '<g class="w3-a1"><rect class="k f-lav" x="-16" y="-15" width="232" height="30" rx="15"/><line class="k" x1="24" y1="0" x2="176" y2="0" style="stroke-width:2;opacity:.45"/><g class="w3-a2"><rect class="k f-lav" x="-14" y="-12" width="198" height="24" rx="12"/><g transform="translate(170 0)"><rect class="k f-steel" x="-6" y="-16" width="26" height="32" rx="6"/><path class="rail" d="M18 -12 L44 -18 M18 12 L44 18" style="stroke-width:6"/></g><circle class="k f-cop" r="11"/><circle class="f-navy" r="3.5"/></g><circle class="k f-cop" r="14"/><circle class="f-navy" r="4.5"/></g>';
    return s;
  };
  W.bind = function (root) {
    var H = {};
    ['gp', 'g', 'pu', 'belt', 'ch', 'flap', 'p', 'rod', 'pin', 'a1', 'a2', 'sig', 'h', 'trig', 'lvl', 'gate', 'liq', 'mix'].forEach(function (c) { H[c] = Array.prototype.slice.call(root.querySelectorAll('.w3-' + c)); });
    H.render = function (u, arm) {
      var Pp = [];
      GT.forEach(function (g, k) {
        var ph = (g.p || 0) * D, o = k ? 40 * (1 - EZ.o(sg(u, g.te - .25, g.te))) : 0, x = g.x + Math.cos(ph) * o, y = g.y + Math.sin(ph) * o; Pp.push([x, y]);
        H.gp[k].setAttribute('transform', 'translate(' + f(x) + ' ' + f(y) + ')');
        H.g[k].setAttribute('transform', 'rotate(' + f(ang(k, u) / D) + ')');
        if (k) { var qq = GT[g.m], pu = sg(u, g.te, g.te + .45), el = H.pu[k - 1], r = MX.rp(qq.n); el.setAttribute('cx', f(qq.x + Math.cos(ph) * r)); el.setAttribute('cy', f(qq.y + Math.sin(ph) * r)); el.setAttribute('r', f(6 + 46 * EZ.o(pu))); el.style.opacity = f(pu > 0 && pu < 1 ? 1 - pu : 0); }
      });
      var sb = W.sb(u), p5 = Pp[5], co = f(sg(u, 1.05, 1.3));
      H.belt[0].style.strokeDashoffset = f(-sb);
      H.ch[0].setAttribute('x1', f(p5[0] - 53)); H.ch[0].setAttribute('y1', f(p5[1])); H.ch[1].setAttribute('x1', f(p5[0] + 53)); H.ch[1].setAttribute('y1', f(p5[1]));
      H.ch.forEach(function (el) { el.style.strokeDashoffset = f(-sb); el.style.opacity = co; });
      var xf = u - 1.6;
      H.flap[0].setAttribute('transform', 'translate(4082 1050) rotate(' + f(90 * EZ.o(sg(u, 1.47, 1.6)) - (xf > 0 ? 4 * Math.sin(xf * 25) * Math.exp(-xf * 10) : 0)) + ')');
      H.p.forEach(function (el, i) { el.setAttribute('transform', 'translate(0 ' + f(-15 - 15 * Math.sin(sb / 35 - i * 1.1)) + ')'); });
      var j1, j2;
      if (arm) { j1 = arm[0]; j2 = arm[1]; } else { var a = EZ.io(sg(u, 2, 3.7)), xa = u - 3.7; j1 = 100 - 153.2 * a + (xa > 0 ? 2 * Math.sin(xa * 14) * Math.exp(-xa * 6) : 0); j2 = 160 - 106.7 * a; }
      H.a1[0].setAttribute('transform', 'translate(5040 520) rotate(' + f(j1) + ')');
      H.a2[0].setAttribute('transform', 'translate(200 0) rotate(' + f(j2) + ')');
      var a4 = ang(4, u), cp = [Pp[4][0] + 110 * Math.cos(a4), Pp[4][1] + 110 * Math.sin(a4)], ap = [5040 + 80 * Math.cos(j1 * D), 520 + 80 * Math.sin(j1 * D)], ro = f(sg(u, .9, 1.1));
      H.rod.forEach(function (el) { el.setAttribute('x1', f(cp[0])); el.setAttribute('y1', f(cp[1])); el.setAttribute('x2', f(ap[0])); el.setAttribute('y2', f(ap[1])); el.style.opacity = ro; });
      H.pin[0].setAttribute('cx', f(cp[0])); H.pin[0].setAttribute('cy', f(cp[1])); H.pin[0].style.opacity = ro;
      return { P: Pp, sb: sb, j1: j1, j2: j2 };
    };
    return H;
  };
  return W;
};
})();
(function () {
var MX = window.MX, f = MX.f, D = MX.D;
MX.PB = function () {
  var s = '', i, a;
  s += '<rect class="shade" x="6574" y="166" width="2240" height="1800" rx="40"/><rect class="k f-plate" x="6560" y="150" width="2240" height="1800" rx="40"/><text class="mono" x="6600" y="1930" style="font-size:14px">SEC.F — IMPOSSIBLE PINBALL · RAMP R600 · LOOP R180</text>';
  s += '<line class="rail" x1="6060" y1="1802" x2="6060" y2="1900" style="stroke-width:6"/><rect class="k f-steel" x="6030" y="1896" width="60" height="12" rx="4"/><circle class="k f-steel" cx="6060" cy="1802" r="22"/><circle class="k f-navy" cx="6060" cy="1802" r="6"/>';
  s += '<rect class="k f-steel" x="6226" y="1786" width="16" height="76" rx="4"/><line class="rail" x1="6226" y1="1843" x2="6900" y2="1843" style="stroke-width:8"/><line class="rail" x1="6520" y1="1800" x2="6880" y2="1800" style="stroke-width:4"/>';
  s += '<path class="pb-cab" d="M6310 1600 L6075.6 1786.4 A22 22 0 1 0 6060 1824 L6210 1824" style="fill:none;stroke:var(--second);stroke-width:3"/>';
  s += '<g class="pb-head" transform="translate(6440 1824)"><rect class="k f-steel" x="-230" y="-5" width="200" height="10"/><circle class="k f-navy" cx="-230" r="8"/><rect class="k f-cop" x="-30" y="-20" width="30" height="40" rx="6"/><rect class="f-navy" x="-7" y="-20" width="7" height="40" rx="2"/></g>';
  var sp = ''; for (i = 0; i <= 20; i++) sp += (i ? ' L' : 'M') + f(6242 + 168 * i / 20) + ' ' + (i % 2 ? 1810 : 1838);
  s += '<path class="pb-spr" d="' + sp + '" style="fill:none;stroke:var(--second);stroke-width:4;stroke-linejoin:round"/>';
  s += '<g transform="translate(6234 1786)"><g class="pb-lat"><rect class="k f-cop" x="-4" y="-30" width="8" height="32" rx="3"/><path class="k f-cop" d="M4 -30 L18 -22 L4 -18 Z"/></g><circle class="k f-navy" r="5"/></g><text class="mono" x="6230" y="1940" style="font-size:13px">LAUNCHER L-9 · 2400 N/m</text>';
  s += '<path class="rail" d="M6900 1840 A600 600 0 0 0 7244.1 748.5" style="stroke-width:11"/><path d="M6900 1850 A610 610 0 0 0 7249.9 740.3" style="fill:none;stroke:var(--sun);stroke-width:5"/><path class="rail" d="M7325.9 1597.4 A556 556 0 0 0 7218.9 784.6" style="stroke-width:4"/>';
  [70, 35, 0, -35].forEach(function (g) { a = g * D; s += '<line class="rail" x1="' + f(6900 + 614 * Math.cos(a)) + '" y1="' + f(1240 + 614 * Math.sin(a)) + '" x2="' + f(6900 + 680 * Math.cos(a)) + '" y2="' + f(1240 + 680 * Math.sin(a)) + '" style="stroke-width:6"/>'; });
  for (i = 0; i < 8; i++) { a = (80 - i * 17) * D; s += '<circle class="k f-ivo pb-lt" cx="' + f(6900 + 646 * Math.cos(a)) + '" cy="' + f(1240 + 646 * Math.sin(a)) + '" r="10" style="stroke-width:2.5"/>'; }
  s += '<circle class="k f-teal" cx="7160" cy="250" r="36"/><circle class="k f-ivo" cx="7160" cy="250" r="16"/><circle class="k f-lav" cx="6760" cy="300" r="32"/><circle class="k f-ivo" cx="6760" cy="300" r="14"/>';
  s += '<circle class="k nf" cx="6960" cy="470" r="98" style="stroke-dasharray:6 8"/><circle class="lite pb-pu" cx="6960" cy="470" r="80" style="opacity:0"/><g transform="translate(6960 470)"><g class="pb-bmp"><circle class="k f-sun" r="80"/><circle class="k f-ivo" r="52"/><circle class="k f-sun" r="30"/><circle class="f-ivo" cx="-24" cy="-30" r="9" style="opacity:.7"/></g></g><text class="mono" x="6880" y="600" style="font-size:13px">BUMPER B-1</text>';
  s += '<line class="k" x1="7330" y1="170" x2="7330" y2="318" style="stroke-width:2"/><line class="k" x1="7570" y1="170" x2="7570" y2="390" style="stroke-width:2"/><rect class="k f-steel" x="7300" y="160" width="300" height="12" rx="4"/><g transform="translate(7450 360)"><g class="pb-srl" transform="rotate(-1.5)"><line class="rail" x1="-200" y1="-60" x2="200" y2="60" style="stroke-width:9"/><line x1="-200" y1="-66" x2="200" y2="54" style="stroke:var(--lime);stroke-width:3"/><circle class="k f-navy" r="7"/></g></g><text class="mono" x="7300" y="150" style="font-size:13px">SUSPENDED RAIL S-2</text>';
  s += '<path class="rail" d="M7640 418 Q7690 888 7980 880" style="stroke-width:8"/><circle class="rail" cx="7980" cy="700" r="180" style="stroke-width:9"/><circle cx="7980" cy="700" r="171" style="fill:none;stroke:var(--teal);stroke-width:4"/><text class="mono" x="7920" y="500" style="font-size:13px">LOOP</text><line class="rail" x1="7980" y1="883" x2="8460" y2="883" style="stroke-width:8"/>';
  s += '<g transform="translate(8160 790)"><rect class="k f-acc pb-sq" x="-25" y="-25" width="50" height="50" rx="8"/></g><g transform="translate(8300 955)"><rect class="k f-lav pb-sq" x="-25" y="-25" width="50" height="50" rx="8"/></g>';
  [[8640, 1080, 165], [8420, 760, 15], [8700, 560, 165]].forEach(function (p) { s += '<circle class="k f-steel" cx="' + p[0] + '" cy="' + p[1] + '" r="24"/><g transform="translate(' + p[0] + ' ' + p[1] + ')"><g class="pb-pad" transform="rotate(' + p[2] + ')"><path class="k f-mag" d="M0 -17 L150 -7 A7 7 0 0 1 150 7 L0 17 A17 17 0 0 1 0 -17Z"/><circle class="k f-navy" r="7"/></g></g>'; });
  [[8540, 1079], [8530, 761], [8600, 559]].forEach(function (p) { s += '<circle class="lite pb-pu" cx="' + p[0] + '" cy="' + p[1] + '" r="16" style="opacity:0"/>'; });
  s += '<text class="mono" x="8560" y="1160" style="font-size:13px">PADDLES P-1 · P-2 · P-3</text>';
  return s;
};
})();
