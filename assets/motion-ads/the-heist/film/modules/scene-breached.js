const { seg, lerp, eo } = kit;
kit.scene('breached', {
  init(kit) {
    kit.stage.append(kit.h('<div class="ground">' +
      '<div class="breached-rule" style="position:absolute;left:360px;top:502px;width:1200px;height:2px;opacity:0;background:linear-gradient(90deg, transparent, color-mix(in srgb, var(--accent) 70%, var(--second)) 22%, var(--second) 50%, color-mix(in srgb, var(--accent) 70%, var(--second)) 78%, transparent)"></div>' +
      '<div class="words" style="left:0;top:425px;width:1920px;align-items:center;gap:44px">' +
      '<h1 class="title breached-title" style="opacity:0">BREACHED.</h1>' +
      '<p class="cap breached-cap">SYSTEM ACCESS: COMPROMISED</p></div></div>'));
    this.rule = kit.stage.querySelector('.breached-rule').style;
    this.title = kit.stage.querySelector('.breached-title').style;
    this.cap = kit.stage.querySelector('.breached-cap').style;
    this.len = 'SYSTEM ACCESS: COMPROMISED'.length;
    this.typed = kit.typist('SYSTEM ACCESS: COMPROMISED', 0.95, 42, 5);
  },
  render(t) {
    const r = eo(seg(t, 0.12, 0.38));
    this.rule.transform = 'scaleX(' + r.toFixed(4) + ')';
    this.rule.opacity = (r * (1 - seg(t, 0.7, 1.1))).toFixed(3);
    const k = eo(seg(t, 0.3, 0.75)), cut = (50 * (1 - k)).toFixed(2);
    this.title.opacity = t < 0.3 ? '0' : '1';
    this.title.clipPath = 'inset(' + cut + '% 0 ' + cut + '% 0)';
    const off = lerp(-14, -3, eo(seg(t, 0.3, 1.3)));
    this.title.textShadow = off.toFixed(2) + 'px 0 0 color-mix(in srgb, var(--accent) 75%, transparent), 0 0 22px color-mix(in srgb, var(--accent) 28%, transparent)';
    this.title.transform = 'scale(' + (1 + 0.014 * seg(t, 0.3, 3)).toFixed(4) + ')';
    const n = this.typed.at(t).length / this.len;
    this.cap.clipPath = 'inset(0 ' + (100 * (1 - n)).toFixed(2) + '% 0 0)';
  },
});
