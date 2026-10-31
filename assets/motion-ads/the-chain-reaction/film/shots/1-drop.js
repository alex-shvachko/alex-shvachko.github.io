/* Shot 1 of 7: The first marble (3 s).
   A clamp opens, the red marble drops, bounces, rolls a curved rail and clicks the first lever. */
FILM.add('drop', 'The first marble', 3, function (kit) {
const { seg, eo, ei, eob, clamp01, TextFx } = kit;
kit.scene('drop', {
  init(kit) {
    const M = window.MX;
    let w = '<line class="rail" x1="540" y1="272" x2="934" y2="272"/>';
    for (let x = 560; x < 930; x += 20) w += '<line class="k" x1="' + x + '" y1="279" x2="' + x + '" y2="' + (x % 100 ? 284 : 290) + '" style="stroke-width:1.5"/>';
    [620, 780].forEach(x => { w += '<line class="rail" x1="' + x + '" y1="276" x2="' + x + '" y2="360" style="stroke-width:5"/><rect class="k f-steel" x="' + (x - 18) + '" y="356" width="36" height="10" rx="3"/>'; });
    w += '<rect class="k f-steel" x="916" y="204" width="88" height="26" rx="7"/><circle class="k f-ivo" cx="930" cy="217" r="4"/><circle class="k f-ivo" cx="990" cy="217" r="4"/><text class="mono" x="560" y="252" style="font-size:11px">R-01 · RELEASE</text>';
    w += '<g class="drop-jl"><path class="rail" d="M0 0 V36 H16" style="stroke-width:7"/><circle class="k f-cop" r="5"/></g><g class="drop-jr"><path class="rail" d="M0 0 V36 H-16" style="stroke-width:7"/><circle class="k f-cop" r="5"/></g>';
    w += '<rect class="k f-steel" x="950" y="484" width="20" height="96" rx="4"/><rect class="k f-steel" x="924" y="576" width="72" height="12" rx="4"/><path class="k f-plate" d="M876 466 L1044 472 L1044 488 L876 482 Z"/><circle class="k f-ivo" cx="896" cy="474" r="3.5"/><circle class="k f-ivo" cx="1024" cy="480" r="3.5"/><text class="mono" x="880" y="512" style="font-size:11px">P-02</text>';
    w += '<path class="rail" d="M1040 486 Q1300 496 1388 652 Q1448 754 1580 754 L1760 754" style="stroke-width:3"/>';
    [[1257, 521], [1467, 717], [1680, 742]].forEach(p => { w += '<line class="rail" x1="' + p[0] + '" y1="' + p[1] + '" x2="' + p[0] + '" y2="860" style="stroke-width:5"/><rect class="k f-steel" x="' + (p[0] - 16) + '" y="856" width="32" height="10" rx="3"/><circle class="k f-ivo" cx="' + p[0] + '" cy="' + (p[1] + 18) + '" r="4"/>'; });
    w += '<path class="rail" d="M1040 474 Q1300 484 1390 640 Q1450 742 1580 742 L1764 742" style="stroke-width:8"/><text class="mono" x="1290" y="468" style="font-size:11px">RAIL R-03 · 1:2.4</text>';
    w += '<polyline points="1784,812 3150,940" style="fill:none;stroke:var(--second);stroke-width:46;stroke-linecap:round"/><polyline points="1784,812 3150,940" style="fill:none;stroke:color-mix(in srgb, var(--accent) 8%, var(--ground));stroke-width:40;stroke-linecap:round"/>';
    w += '<line class="rail" x1="1846" y1="763" x2="2240" y2="763"/>';
    [1900, 2080].forEach(x => { w += '<line class="rail" x1="' + x + '" y1="766" x2="' + x + '" y2="790" style="stroke-width:5"/>'; });
    for (let i = 0; i < 6; i++) w += '<g transform="translate(' + (1880 + i * 42) + ' 760)"><g class="drop-d">' + M.domino(18, 70, 'f-ivo') + '</g></g>';
    w += '<rect class="k f-steel" x="1805" y="760" width="14" height="26" rx="3"/><g class="drop-lev"><rect class="k f-cop" x="-5" y="-74" width="10" height="80" rx="5"/><circle class="k f-navy" r="7"/><circle class="f-ivo" r="2.5"/></g><text class="mono" x="1822" y="668" style="font-size:11px">L-1</text>';
    w += '<circle class="f-main drop-g" r="16"/><circle class="f-main drop-g" r="16"/><g class="drop-m">' + M.marble(16) + '</g>';
    w += '<polyline points="1784,812 3150,940" style="fill:none;stroke:color-mix(in srgb, var(--accent) 10%, var(--ground));stroke-width:40;stroke-linecap:round;opacity:.35"/><polyline points="1784,798 3150,926" style="fill:none;stroke:var(--ground);stroke-width:3;opacity:.9"/><path class="glass" d="M1760 750 L1804 750 L1796 794 L1772 794 Z" style="opacity:.55"/>';
    kit.stage.append(kit.h('<div class="ground"><svg class="art" viewBox="0 0 1920 1080"><g class="drop-far">' + M.far(0, 5000, 0, 1000) + '</g><g class="drop-cam">' + M.grid('drop-dots', -1000, -1000, 8000, 4000) + w + '</g></svg><div class="words drop-words" style="left:120px;bottom:100px;width:1100px"><h1 class="line">The Chain Reaction</h1><p class="tag drop-tag">One marble · one machine · one continuous chain reaction</p></div></div>'));
    const q = s => kit.stage.querySelector(s);
    this.cam = q('.drop-cam'); this.far = q('.drop-far'); this.jl = q('.drop-jl'); this.jr = q('.drop-jr'); this.m = q('.drop-m'); this.lev = q('.drop-lev');
    this.gh = [...kit.stage.querySelectorAll('.drop-g')]; this.d = [...kit.stage.querySelectorAll('.drop-d')];
    this.line = q('.line'); this.tag = q('.drop-tag'); this.words = q('.drop-words');
    this.K = [[0, 960, 262, 2.0], [.95, 960, 258, 2.3], [1.3, 966, 360, 1.8], [1.75, 1030, 440, 1.5], [2.2, 1330, 590, 1.36], [2.6, 1720, 700, 1.3], [3, 1840, 720, 1.3]];
    this.mp = M.path([
      { t: [0, .85], l: [960, 255, 960, 255] },
      { t: [.85, 1], l: [960, 255, 960, 257] },
      { t: [1, 1.3], l: [960, 257, 960, 455], e: 'i' },
      { t: [1.3, 1.5], q: [960, 455, 976, 387, 992, 456] },
      { t: [1.5, 1.62], q: [992, 456, 1002, 436, 1012, 457] },
      { t: [1.62, 1.8], l: [1012, 457, 1040, 458] },
      { t: [1.8, 2.3], q: [1040, 457, 1300, 467, 1390, 623], e: 'i' },
      { t: [2.3, 2.45], q: [1390, 623, 1450, 725, 1580, 725] },
      { t: [2.45, 2.57], l: [1580, 725, 1764, 725] },
      { t: [2.57, 2.59], l: [1764, 725, 1793, 727] },
      { t: [2.59, 2.63], l: [1793, 727, 1787, 729] },
      { t: [2.63, 2.78], q: [1787, 729, 1786, 760, 1784, 812], e: 'i' },
      { t: [2.78, 3], l: [1784, 812, 1849.7, 818.2] }
    ]);
  },
  render(t) {
    const M = window.MX, c = M.keys(this.K, t);
    M.cam(this.cam, c[0], c[1], c[2]); M.cam(this.far, c[0], c[1], c[2], .55);
    const aj = 60 * eob(seg(t, .62, .84), 1.6) - 4 * Math.sin(Math.PI * seg(t, .52, .62));
    this.jl.setAttribute('transform', 'translate(940 236) rotate(' + aj.toFixed(2) + ')');
    this.jr.setAttribute('transform', 'translate(980 236) rotate(' + (-aj).toFixed(2) + ')');
    const p = this.mp(t);
    M.ball(this.m, p[0], p[1], (p[0] - 960) * 3.58);
    this.gh.forEach((g, k) => { const s = this.mp(t - .012 * (k + 1)), d = Math.hypot(p[0] - s[0], p[1] - s[1]); M.put(g, s[0], s[1]); g.style.opacity = (clamp01((d - 6) / 22) * (.32 - k * .14)).toFixed(3); });
    const x = t - 2.72, al = 45 * eo(seg(t, 2.59, 2.72)) + (x > 0 ? 3 * Math.sin(x * 20) * Math.exp(-x * 8) : 0);
    this.lev.setAttribute('transform', 'translate(1812 760) rotate(' + al.toFixed(2) + ')');
    this.d.forEach((g, i) => g.setAttribute('transform', 'rotate(' + M.fall(t, 2.7 + i * .14, .26, 64.6).toFixed(2) + ')'));
    TextFx.fadeFromRight(this.line, t, -0.8);
    TextFx.fadeFromRight(this.tag, t, -0.5);
    this.words.style.opacity = (1 - eo(seg(t, 1.0, 1.4))).toFixed(3);
    this.words.style.transform = 'translateX(' + (-30 * ei(seg(t, 1.0, 1.4))).toFixed(1) + 'px)';
  },
});
});
