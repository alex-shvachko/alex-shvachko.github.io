const { seg, eo, eio, lerp } = kit;
const LY = 640;
kit.scene('reveal', {
  init(kit) {
    this.k0 = kit.start;
    kit.stage.append(kit.h('<div class="ground"></div>'));
    this.dev = OBX.build(kit, 'rev');
    kit.stage.append(kit.h('<div class="vig"></div>'));
    kit.css('.rev-glow{fill:none;stroke:color-mix(in srgb, var(--main) 30%, transparent);stroke-width:6;stroke-linejoin:round}' +
      '.rev-edge{fill:none;stroke:var(--main);stroke-width:1.6;stroke-linejoin:round}' +
      '.rev-line{stroke:var(--main);stroke-width:1.5}' +
      '.rev-words{left:0;width:1920px;top:668px;align-items:center;gap:0}' +
      '.rev-m{overflow:hidden;padding:4px 0 8px}' +
      '.rev-name{margin:0;font-size:112px;line-height:1;color:var(--second);white-space:nowrap}' +
      '.rev-sub{margin-top:30px!important;font-size:22px;font-weight:500;letter-spacing:.5em;padding-left:.5em;color:var(--silver);white-space:pre}' +
      '.rev-tag{margin-top:22px!important;font-family:var(--mono, ui-monospace, monospace);font-size:12px;letter-spacing:.62em;padding-left:.62em;color:var(--main)}');
    const svg = kit.h('<svg class="art" viewBox="0 0 1920 1080"><path class="rev-glow"/><path class="rev-edge"/>' +
      '<line class="rev-line" y1="' + LY + '" y2="' + LY + '"/><circle class="dot rev-head" r="3.5"/><circle class="lead rev-ring" r="9"/></svg>');
    kit.stage.append(svg);
    const q = s => svg.querySelector(s);
    this.glow = q('.rev-glow'); this.edge = q('.rev-edge'); this.line = q('.rev-line'); this.head = q('.rev-head'); this.ring = q('.rev-ring');
    kit.stage.append(kit.h('<div class="words rev-words"><div class="rev-m"><h1 class="line rev-name">OBSIDIAN</h1></div>' +
      '<p class="rev-sub">X-01  /  ADVANCED COMPUTATIONAL CORE</p><p class="rev-tag">ENGINEERED BEYOND LIMITS</p></div>'));
    const w = s => kit.stage.querySelector(s).style;
    this.words = w('.rev-words'); this.name = w('.rev-name'); this.sub = w('.rev-sub'); this.tg = w('.rev-tag');
  },
  render(t) {
    const d = this.dev.render(this.k0 + t);
    // the silhouette, starting from its lowest corner
    let H = d.hull(), b = 0;
    for (let i = 1; i < H.length; i++) if (H[i][1] > H[b][1]) b = i;
    H = H.slice(b).concat(H.slice(0, b)); H.push(H[0]);
    let L = 0; const seglen = [];
    for (let i = 1; i < H.length; i++) { const s = Math.hypot(H[i][0] - H[i - 1][0], H[i][1] - H[i - 1][1]); seglen.push(s); L += s; }
    const dpath = 'M' + H.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L');
    const p = eio(seg(t, .05, .95)), op = (p > 0 ? 1 : 0) * (1 - .85 * seg(t, .95, 1.6));
    for (const el of [this.glow, this.edge]) {
      el.setAttribute('d', dpath); el.style.strokeDasharray = (L * p).toFixed(1) + ' ' + (L + 10).toFixed(1); el.style.opacity = op.toFixed(3);
    }
    // the head of the trace, then the line that leaves the object
    let hx, hy, k = L * p, i = 0;
    while (i < seglen.length - 1 && k > seglen[i]) { k -= seglen[i]; i++; }
    const f = seglen[i] ? Math.min(1, k / seglen[i]) : 0;
    hx = lerp(H[i][0], H[i + 1][0], f); hy = lerp(H[i][1], H[i + 1][1], f);
    const B = H[0], drop = eio(seg(t, .95, 1.2));
    if (t > .95) { hx = B[0]; hy = lerp(B[1], LY, drop); }
    const hv = seg(t, 0, .08) * (1 - seg(t, 1.2, 1.35));
    for (const el of [this.head, this.ring]) { el.setAttribute('cx', hx.toFixed(1)); el.setAttribute('cy', hy.toFixed(1)); el.style.opacity = hv.toFixed(3); }
    const s = eo(seg(t, 1.15, 1.7));
    this.line.setAttribute('x1', lerp(B[0], 400, s).toFixed(1)); this.line.setAttribute('x2', lerp(B[0], 1520, s).toFixed(1));
    this.line.style.opacity = (s > 0 ? 1 - .45 * seg(t, 2.2, 3) : 0).toFixed(3);
    // OBSIDIAN rises out of the line; the designation opens from the centre
    const n = eo(seg(t, 1.3, 1.95)), sp = lerp(.58, .36, eo(seg(t, 1.3, 2.5)));
    this.name.transform = 'translateY(' + ((1 - n) * -110).toFixed(2) + '%)';
    this.name.letterSpacing = sp.toFixed(4) + 'em'; this.name.paddingLeft = sp.toFixed(4) + 'em';
    const c = (1 - eo(seg(t, 1.75, 2.3))) * 50;
    this.sub.clipPath = 'inset(0 ' + c.toFixed(2) + '% 0 ' + c.toFixed(2) + '%)';
    const g = eo(seg(t, 2.05, 2.5));
    this.tg.opacity = g.toFixed(3); this.tg.transform = 'translateY(' + ((1 - g) * 8).toFixed(1) + 'px)';
    this.words.transform = 'translateY(' + (-2 * Math.max(0, t - 1.3)).toFixed(2) + 'px)';
  }
});
