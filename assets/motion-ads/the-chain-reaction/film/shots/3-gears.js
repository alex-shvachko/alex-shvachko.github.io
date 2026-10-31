/* Shot 3 of 7: Clockwork (4 s).
   Meshed gears cascade into motion, drive a conveyor that carries the marble up while an arm unfolds. */
FILM.add('gears', 'Clockwork', 4, function (kit) {
const { clamp01 } = kit;
kit.scene('gears', {
  init(kit) {
    const M = window.MX, W = M.W3();
    this.W = W;
    let fg = '';
    [[5480, 260, 70], [6550, 1180, 54], [5900, -120, 40]].forEach(g => { fg += '<g transform="translate(' + g[0] + ' ' + g[1] + ')"><g class="gr-fg"><path d="' + M.gearD(g[2]) + '" style="fill:color-mix(in srgb, var(--second) 5%, transparent);stroke:var(--second);stroke-width:5;opacity:.22"/><circle r="' + (M.rp(g[2]) * .5).toFixed(0) + '" style="fill:none;stroke:var(--second);stroke-width:4;opacity:.22"/></g></g>'; });
    const TP = '1784,812 3150,940 3600,1010 4020,1030';
    kit.stage.append(kit.h('<div class="ground"><svg class="art" viewBox="0 0 1920 1080"><g class="gr-far">' + M.far(0, 5000, 0, 1000) + '</g><g class="gr-cam">' + M.grid('gr-dots', 1000, -1000, 8000, 4000) + W.html() + '<g class="gr-m">' + M.marble(16) + '</g><polyline points="' + TP + '" style="fill:none;stroke:color-mix(in srgb, var(--accent) 10%, var(--ground));stroke-width:40;stroke-linecap:round;stroke-linejoin:round;opacity:.35"/><polyline points="1784,798 3150,926 3600,996 4020,1016" style="fill:none;stroke:var(--ground);stroke-width:3;opacity:.9"/></g><g class="gr-fgl" style="opacity:0">' + fg + '</g></svg></div>'));
    const q = s => kit.stage.querySelector(s);
    this.cam = q('.gr-cam'); this.far = q('.gr-far'); this.fgl = q('.gr-fgl'); this.m = q('.gr-m');
    this.fg = [...kit.stage.querySelectorAll('.gr-fg')];
    this.H = W.bind(this.cam);
    this.mp = M.path([{ t: [0, 1.56], l: [4060, 1032, 4060, 1032] }, { t: [1.56, 1.76], q: [4060, 1032, 4100, 1033, 4125.9, 1028.4] }]);
    this.K = [[0, 4150, 600, 1.15], [.5, 4260, 560, 1.3], [1.1, 4420, 540, 1.42], [1.75, 4300, 860, 1.25], [2.5, 4560, 820, 1.05], [3.3, 4850, 650, .9], [4, 5000, 560, .85]];
  },
  render(t) {
    const M = window.MX, W = this.W, c = M.keys(this.K, t);
    M.cam(this.cam, c[0], c[1], c[2]); M.cam(this.far, c[0], c[1], c[2], .55); M.cam(this.fgl, c[0], c[1], c[2], 1.35);
    this.fgl.style.opacity = clamp01((t - .2) / .6).toFixed(3);
    this.fg.forEach((g, i) => g.setAttribute('transform', 'rotate(' + (t * (i % 2 ? -14 : 12)).toFixed(2) + ')'));
    const r = this.H.render(t);
    let x, y, roll;
    if (t < 1.76) { const p = this.mp(t); x = p[0]; y = p[1]; roll = (x - 4060) * 3.58 + 270.7; }
    else { const lx = 20 + r.sb - W.sbm, p = W.conv(lx, -48); x = p[0]; y = p[1]; roll = 66 * 3.58 + 270.7; }
    M.ball(this.m, x, y, roll);
  },
});
});
