const { seg, eio, lerp } = kit;
const TAU = Math.PI * 2;
function energy() {           // drawn flat in the plane just above the core, in its own units
  const pt = (r, a) => (r * Math.cos(a)).toFixed(1) + ' ' + (r * Math.sin(a)).toFixed(1);
  let t = '', arcs = '';
  for (let i = 0; i < 72; i++) { const a = i / 72 * TAU, L = i % 6 ? 6 : 12; t += 'M' + pt(L > 6 ? 78 : 81, a) + 'L' + pt(L > 6 ? 90 : 87, a); }
  for (let j = 0; j < 6; j++) { const a = j / 6 * TAU; arcs += 'M' + pt(100, a) + 'A100 100 0 0 1 ' + pt(100, a + .42); }
  return '<circle class="ox-holo" r="74"/><g class="core-a"><path class="ox-holo2" d="' + t + '"/></g>' +
    '<g class="core-b"><path class="ox-holo2" d="' + arcs + '"/></g><path class="ox-holo core-v"/>' +
    '<circle class="ox-holo" r="124" stroke-dasharray="3 9"/><circle class="ox-pls core-p" r="70"/>';
}
kit.scene('core', {
  init(kit) {
    this.k0 = kit.start;
    kit.stage.append(kit.h('<div class="ground"></div>'));
    this.dev = OBX.build(kit, 'cor', { planes: [{ n: 'en', y: 0, m: energy() }] });
    const q = s => this.dev.svg.querySelector(s);
    this.ga = q('.core-a'); this.gb = q('.core-b'); this.vec = q('.core-v'); this.pl = q('.core-p');
    kit.stage.append(kit.h('<div class="vig"></div>'));
    kit.stage.append(kit.h('<div class="halo core-flash" style="width:1200px;height:1200px"></div>'));
    this.flash = kit.stage.querySelector('.core-flash').style;
    const svg = kit.h('<svg class="art" viewBox="0 0 1920 1080"></svg>');
    kit.stage.append(svg);
    this.tags = [
      { p: [-42.4, -14, 42.4], t: 14.55, tag: OBX.tag(kit, svg, { k: '01', v: 'CORE SYNCHRONIZATION', x: 560, y: 300, side: 'l' }) },
      { p: [0, -15, -157], t: 15.25, tag: OBX.tag(kit, svg, { k: '02', v: 'ENERGY TRANSFER', x: 1480, y: 730 }) },
      { p: [134, -20, 134], t: 15.95, tag: OBX.tag(kit, svg, { k: '03', v: 'SYSTEM INTEGRITY', x: 330, y: 860, side: 'l' }) }
    ];
    kit.stage.append(kit.h('<div class="mono core-num" style="position:absolute;left:330px;top:884px;transform:translateX(-100%);font-size:34px;letter-spacing:.12em;color:var(--main);line-height:1">100%</div>'));
    this.num = kit.stage.querySelector('.core-num');
  },
  render(t) {
    const G = this.k0 + t, M = OBX.M(G), en = this.dev.items.en;
    const o = seg(G, 14.6, 15.3) * (1 - seg(G, 17.6, 17.95));
    en.o = o * (.55 + .45 * seg(G, 15.5, 17));
    const d = this.dev.render(G);
    if (o > 0) {
      this.ga.setAttribute('transform', 'rotate(' + (OBX.ringA(3, G) * 80).toFixed(2) + ')');
      this.gb.setAttribute('transform', 'rotate(' + (-OBX.ringA(2, G) * 63).toFixed(2) + ')');
      let v = '';
      for (let i = 0; i < 16; i++) {
        const a = i / 16 * TAU, L = 10 + 26 * (.5 + .5 * Math.sin(M * 5.3 + i * 1.9)) * seg(G, 15, 16.5);
        v += 'M' + (132 * Math.cos(a)).toFixed(1) + ' ' + (132 * Math.sin(a)).toFixed(1) + 'L' + ((132 + L) * Math.cos(a)).toFixed(1) + ' ' + ((132 + L) * Math.sin(a)).toFixed(1);
      }
      this.vec.setAttribute('d', v);
      this.pl.setAttribute('r', lerp(70, 1100, OBX.PAR.pulse(G)).toFixed(1));
      this.pl.style.opacity = OBX.PAR.pulseA(G).toFixed(3);
    }
    // the release: one bright pulse at 17 s, held through the freeze
    const c = d.P(0, -14, 0), f = G >= 17 ? .6 * (1 - seg(M, 17, 17.75)) : 0;
    this.flash.left = (c[0] - 600).toFixed(1) + 'px'; this.flash.top = (c[1] - 600).toFixed(1) + 'px'; this.flash.opacity = f.toFixed(3);
    const out = seg(G, 17.55, 17.9);
    for (const g of this.tags) g.tag.render(d.P(g.p[0], g.p[1], g.p[2]), seg(G, g.t, g.t + .7), out);
    const n = seg(G, 16.25, 16.95);
    this.num.textContent = Math.round(lerp(52, 100, eio(n))) + '%';
    this.num.style.opacity = (seg(G, 16.2, 16.4) * (1 - out)).toFixed(3);
  }
});
