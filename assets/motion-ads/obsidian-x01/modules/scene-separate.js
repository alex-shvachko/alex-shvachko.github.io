const { seg, eo, lerp } = kit;
kit.scene('separate', {
  init(kit) {
    this.k0 = kit.start;
    kit.stage.append(kit.h('<div class="ground"></div>'));
    this.dev = OBX.build(kit, 'sep');
    kit.stage.append(kit.h('<div class="vig"></div>'));
    kit.stage.append(kit.h('<div class="halo sep-halo" style="width:520px;height:150px"></div>'));
    kit.stage.append(kit.h('<div class="beam sep-beam"></div>'));
    this.halo = kit.stage.querySelector('.sep-halo').style;
    this.beam = kit.stage.querySelector('.sep-beam').style;
    const svg = kit.h('<svg class="art" viewBox="0 0 1920 1080"></svg>');
    kit.stage.append(svg);
    // the four call-outs name each layer as it settles into the exploded stack
    this.tags = [
      { n: 'pR', o: [0, 0, 60], t: 6.4, tag: OBX.tag(kit, svg, { k: '01', v: 'PROTECTIVE SHELL', x: 1430, y: 900 }) },
      { n: 'boardB', o: [-370, 0, 0], t: 6.7, tag: OBX.tag(kit, svg, { k: '02', v: 'NEURAL INTERFACE', x: 520, y: 440, side: 'l' }) },
      { n: 'plate2', o: [360, 0, -80], t: 7.0, tag: OBX.tag(kit, svg, { k: '03', v: 'CONDUCTIVE MATRIX', x: 1430, y: 380 }) },
      { n: 'boardA', o: [-370, 0, 60], t: 7.3, tag: OBX.tag(kit, svg, { k: '04', v: 'PROCESSOR ARRAY', x: 520, y: 720, side: 'l' }) }
    ];
  },
  render(t) {
    const G = this.k0 + t, d = this.dev.render(G);
    // a narrow beam of cyan escapes the central seam
    const s = d.P(0, 2, 260), w = lerp(40, 1500, eo(seg(t, 0, .55)));
    const a = seg(t, 0, .1) * (1 - seg(t, .6, 1.35));
    this.beam.left = (s[0] - w / 2).toFixed(1) + 'px'; this.beam.top = s[1].toFixed(1) + 'px';
    this.beam.width = w.toFixed(1) + 'px'; this.beam.opacity = a.toFixed(3);
    this.halo.left = (s[0] - 260).toFixed(1) + 'px'; this.halo.top = (s[1] - 75).toFixed(1) + 'px';
    this.halo.opacity = (a * .85).toFixed(3);
    for (const g of this.tags) g.tag.render(d.at(g.n, g.o[0], g.o[1], g.o[2]), seg(G, g.t, g.t + .7), 0);
  }
});
