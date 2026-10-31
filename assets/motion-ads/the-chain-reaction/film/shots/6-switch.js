/* Shot 6 of 7: Master switch (5 s).
   At the apex the camera pulls back to the whole machine; the marble falls on the red switch and a wave wakes everything. */
FILM.add('switch', 'Master switch', 5, function (kit) {
const { seg, eo, eio, clamp01 } = kit;
kit.scene('switch', {
  init(kit) {
    const M = window.MX;
    kit.stage.append(kit.h('<div class="ground"><svg class="art" viewBox="0 0 1920 1080"><g class="sw-far" style="opacity:0">' + M.far(0, 3200, 700, 1300) + '</g><g class="sw-cam">' + M.grid('sw-dots', -3000, -3000, 9000, 7000) + '<g class="sw-ov">' + M.ovHTML() + '</g><circle class="f-main sw-gh" r="16" style="opacity:0"/><circle class="f-main sw-gh" r="16" style="opacity:0"/><g class="sw-m"><g class="sw-mi">' + M.marble(16) + '</g></g><text class="mono sw-lab" x="1960" y="960" style="font-size:20px;opacity:0">CLICK \u00b7 26.8 S</text></g></svg></div>'));
    const q = s => kit.stage.querySelector(s);
    this.cam = q('.sw-cam'); this.far = q('.sw-far'); this.m = q('.sw-m'); this.mi = q('.sw-mi'); this.lab = q('.sw-lab');
    this.gh = [...kit.stage.querySelectorAll('.sw-gh')];
    this.ov = M.ovBind(q('.sw-ov'));
    this.K = [[0, 1900, -430, 1.1], [.4, 1900, -380, 1.0], [1.2, 1900, 760, .42], [1.55, 1900, 820, .5], [1.85, 1900, 1030, 1.25], [2.2, 1900, 1050, 1.15], [3.2, 1900, 1060, .62], [5, 1900, 1060, .46]];
    this.my = t => t < .5 ? -480 + 6 * eio(seg(t, 0, .5)) : t < 1.8 ? -474 + 1492 * Math.pow(seg(t, .5, 1.8), 2) : 1018;
  },
  render(t) {
    const M = window.MX, c = M.keys(this.K, t);
    M.cam(this.cam, c[0], c[1], c[2]); M.cam(this.far, c[0], c[1], c[2], .55);
    this.far.style.opacity = clamp01((c[1] + 300) / 400).toFixed(3);
    this.ov.render(t, 1.8);
    const pr = eo(seg(t, 1.8, 1.87)) * (1 - .35 * eo(seg(t, 1.87, 2.1))), h = t - 1.8;
    let y = this.my(t), sx = 1, sy = 1;
    if (h >= 0) { y = 1018 + 6 * pr - (h > .06 && h < .22 ? 12 * Math.sin(Math.PI * (h - .06) / .16) : 0); const sq = Math.sin(Math.PI * seg(t, 1.8, 1.87)); sx = 1 + .12 * sq; sy = 1 - .15 * sq; }
    this.m.setAttribute('transform', 'translate(1900 ' + (y + 16 * (1 - sy)).toFixed(1) + ')');
    this.mi.setAttribute('transform', 'scale(' + sx.toFixed(3) + ' ' + sy.toFixed(3) + ')');
    this.gh.forEach((g, k) => { const yy = this.my(t - .014 * (k + 1)), d = Math.abs(y - yy); g.setAttribute('cx', '1900'); g.setAttribute('cy', yy.toFixed(1)); g.style.opacity = (t < 1.8 ? clamp01((d - 8) / 30) * (.3 - .12 * k) : 0).toFixed(3); });
    this.lab.style.opacity = (clamp01((t - 1.85) / .3) * (1 - clamp01((t - 3.2) / .5))).toFixed(3);
  },
});
});
