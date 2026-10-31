const { seg, eio, lerp } = kit;
kit.scene('unknown', {
  init(kit) {
    this.k0 = kit.start;
    kit.stage.append(kit.h('<div class="ground"></div>'));
    const mask = '<linearGradient id="unk-mg" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="1080">' +
      '<stop offset="0" stop-color="#fff"/><stop class="unk-s1" offset="0" stop-color="#fff"/>' +
      '<stop class="unk-s2" offset="0" stop-color="#1d1d1d"/><stop offset="1" stop-color="#1d1d1d"/></linearGradient>' +
      '<mask id="unk-m" maskUnits="userSpaceOnUse" x="-400" y="-400" width="2720" height="1880">' +
      '<rect x="-400" y="-400" width="2720" height="1880" fill="url(#unk-mg)"/></mask>';
    this.dev = OBX.build(kit, 'unk', { defs: mask });
    this.s1 = kit.stage.querySelector('.unk-s1');
    this.s2 = kit.stage.querySelector('.unk-s2');
    kit.css('.unk-band{position:absolute;left:0;width:1920px;height:220px;margin-top:-110px;background:radial-gradient(48% 50% at 50% 50%, color-mix(in srgb, var(--main) 13%, transparent), transparent)}');
    kit.stage.append(kit.h('<div class="vig"></div>'));
    kit.stage.append(kit.h('<div class="unk-band"></div>'));
    kit.stage.append(kit.h('<div class="beam unk-scan" style="width:1920px"></div>'));
    this.band = kit.stage.querySelector('.unk-band').style;
    this.scan = kit.stage.querySelector('.unk-scan').style;
    const svg = kit.h('<svg class="art" viewBox="0 0 1920 1080"></svg>');
    kit.stage.append(svg);
    this.tags = [
      OBX.tag(kit, svg, { k: '01', v: 'UNKNOWN DEVICE', x: 520, y: 300, side: 'l' }),
      OBX.tag(kit, svg, { k: '02', v: 'SYSTEM ID: X-01', x: 1560, y: 430 }),
      OBX.tag(kit, svg, { k: '03', v: 'CORE STATUS: DORMANT', x: 480, y: 760, side: 'l', cls: 'tag-a' })
    ];
    this.anc = [[-200, 60, -130], [400, 60, -260], [60, 2, 260]];
  },
  render(t) {
    const G = this.k0 + t, d = this.dev.render(G);
    // one thin line of light scans down and finds the edges
    const y = lerp(372, 1180, eio(seg(t, -0.12, 3.3)));
    if (t < 3.4) d.world.setAttribute('mask', 'url(#unk-m)'); else d.world.removeAttribute('mask');
    this.s1.setAttribute('offset', Math.min(1, Math.max(0, (y - 4) / 1080)).toFixed(4));
    this.s2.setAttribute('offset', Math.min(1, Math.max(0, (y + 170) / 1080)).toFixed(4));
    const a = 1 - seg(t, 2.8, 3.45);
    this.scan.top = y.toFixed(1) + 'px'; this.scan.opacity = a.toFixed(3);
    this.band.top = y.toFixed(1) + 'px'; this.band.opacity = a.toFixed(3);
    for (let i = 0; i < 3; i++) {
      const p = this.anc[i];
      this.tags[i].render(d.P(p[0], p[1], p[2]), seg(t, 2.05 + i * .25, 2.75 + i * .25), seg(t, 3.5, 3.92));
    }
  }
});
