const { seg, eo, TextFx } = kit;
kit.scene('metropolis', {
  init(kit) {
    this.v = DM.mount(kit); this.t0 = kit.start;
    kit.stage.append(kit.h('<div class="scrim metropolis-scrim"></div>'));
    kit.stage.append(kit.h('<div class="words metropolis-words" style="left:118px;bottom:150px"><h1 class="line title">DATA METROPOLIS</h1><p class="sub tagline metropolis-tag">EVERY NUMBER BUILDS A WORLD.</p></div>'));
    this.title = kit.stage.querySelector('.title');
    this.tag = kit.stage.querySelector('.metropolis-tag').style;
    this.scrim = kit.stage.querySelector('.metropolis-scrim').style;
  },
  render(t) {
    DM.draw(this.v, this.t0 + t);
    this.scrim.opacity = eo(seg(t, 0, 0.6));
    TextFx.fadeFromRight(this.title, t, 0.0, { stagger: 0.16, dur: 0.6, dx: 34 });
    const p = eo(seg(t, 0.5, 1.05));
    this.tag.opacity = p; this.tag.transform = 'translateX(' + (1 - p) * 26 + 'px)';
  },
});
