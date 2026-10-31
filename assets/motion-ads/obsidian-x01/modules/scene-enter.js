const { seg, eo, lerp } = kit;
const RD = ['R0   Ø 408   ω +0.50', 'R1   Ø 336   ω −0.78', 'R2   Ø 276   ω +1.12', 'R3   Ø 216   ω −1.60'];
kit.scene('enter', {
  init(kit) {
    this.k0 = kit.start;
    kit.stage.append(kit.h('<div class="ground"></div>'));
    this.dev = OBX.build(kit, 'ent');
    kit.stage.append(kit.h('<div class="vig"></div>'));
    const svg = kit.h('<svg class="art" viewBox="0 0 1920 1080"></svg>');
    kit.stage.append(svg);
    // the exploded-view call-outs, as the last shot left them
    this.old = [
      { n: 'pR', o: [0, 0, 60], tag: OBX.tag(kit, svg, { k: '01', v: 'PROTECTIVE SHELL', x: 1430, y: 900 }) },
      { n: 'boardB', o: [-370, 0, 0], tag: OBX.tag(kit, svg, { k: '02', v: 'NEURAL INTERFACE', x: 520, y: 440, side: 'l' }) },
      { n: 'plate2', o: [360, 0, -80], tag: OBX.tag(kit, svg, { k: '03', v: 'CONDUCTIVE MATRIX', x: 1430, y: 380 }) },
      { n: 'boardA', o: [-370, 0, 60], tag: OBX.tag(kit, svg, { k: '04', v: 'PROCESSOR ARRAY', x: 520, y: 720, side: 'l' }) }
    ];
    this.ring = OBX.tag(kit, svg, { k: '05', v: 'STABILIZATION RINGS', x: 1450, y: 960 });
    kit.stage.append(kit.h('<div class="read ent-read" style="left:120px;top:790px">' +
      '<p class="tag-k">COUNTER-ROTATION</p>' + RD.map(s => '<p>' + s + '</p>').join('') + '</div>'));
    this.rows = Array.from(kit.stage.querySelectorAll('.ent-read > p'));
  },
  render(t) {
    const G = this.k0 + t, d = this.dev.render(G);
    for (const g of this.old) g.tag.render(d.at(g.n, g.o[0], g.o[1], g.o[2]), 1, seg(G, 8.0, 8.45));
    const out = seg(G, 12.68, 12.95);
    this.ring.render(d.at('R0', 134, 3, -134), seg(G, 11.3, 12.0), out);
    for (let i = 0; i < this.rows.length; i++) {
      const p = eo(seg(G, 11.5 + i * .12, 11.9 + i * .12)), s = this.rows[i].style;
      s.clipPath = 'inset(0 ' + ((1 - p) * 100).toFixed(1) + '% 0 0)';
      s.opacity = (p > 0 ? 1 - out : 0).toFixed(3);
    }
  }
});
