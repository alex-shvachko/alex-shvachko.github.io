kit.scene('signal', {
  init(kit) { this.v = DM.mount(kit); this.t0 = kit.start; },
  render(t) { DM.draw(this.v, this.t0 + t); },
});
