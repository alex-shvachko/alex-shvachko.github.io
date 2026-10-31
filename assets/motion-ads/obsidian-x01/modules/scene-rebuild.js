const { seg, eo, lerp } = kit;
kit.scene('rebuild', {
  init(kit) {
    this.k0 = kit.start;
    kit.stage.append(kit.h('<div class="ground"></div>'));
    this.dev = OBX.build(kit, 'reb');
    kit.stage.append(kit.h('<div class="vig"></div>'));
    let c = '';
    for (let i = 0; i < 10; i++) c += '<circle class="lead reb-c" r="1"/>';
    const svg = kit.h('<svg class="art" viewBox="0 0 1920 1080">' + c + '</svg>');
    kit.stage.append(svg);
    this.rings = Array.from(svg.querySelectorAll('.reb-c'));
    // what snaps home, and when: six modules into their sockets, then the four locks
    this.snaps = [0, 1, 2, 3, 4, 5].map(i => ({ n: 'm' + i, dy: 4, t: 19.42, r: 30 }))
      .concat([0, 1, 2, 3].map(i => ({ n: 'k' + i, dy: 4, t: 21.45, r: 48 })));
  },
  render(t) {
    const G = this.k0 + t, d = this.dev.render(G);
    for (let i = 0; i < this.snaps.length; i++) {
      const s = this.snaps[i], el = this.rings[i], p = seg(G, s.t, s.t + .42);
      const a = p > 0 && p < 1 ? (1 - p) * .9 : 0;
      el.style.opacity = a.toFixed(3);
      if (!a) continue;
      const q = d.at(s.n, 0, s.dy, 0);
      el.setAttribute('cx', q[0].toFixed(1)); el.setAttribute('cy', q[1].toFixed(1));
      el.setAttribute('r', lerp(6, s.r, eo(p)).toFixed(1));
      el.style.stroke = 'var(--main)';
    }
  }
});
