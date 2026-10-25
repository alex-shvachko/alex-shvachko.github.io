(() => {
  // Leader lines are drawn in pixels from live layout and from the line world's own camera,
  // so labels, lines and dots always meet the part of the drawing they name.
  const NS = 'http://www.w3.org/2000/svg';
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const easeOut = value => 1 - Math.pow(1 - value, 4);
  // Progress of a sub-phase [from, to] inside an overall 0..1 progress.
  const phase = (value, from, to) => clamp((value - from) / (to - from), 0, 1);
  const create = (name, attributes = {}) => {
    const element = document.createElementNS(NS, name);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
    return element;
  };
  const World = window.World;
  if (!World) return;

  // 01 Home: topic labels pinned to parts of the rover (head, lidar, antenna, eye, wheel).
  const opening = document.querySelector('.opening');
  const topics = document.querySelector('.hero-topics');
  const copy = document.querySelector('.hero-copy');
  const heroSvg = topics.querySelector('svg');
  const items = [...topics.querySelectorAll('.topic')].map(label => {
    const [dx, dy] = label.dataset.offset.split(',').map(Number);
    const path = create('path');
    const pulse = create('circle', { class: 'topic-pulse', r: 4 });
    const dot = create('circle', { class: 'topic-dot', r: 3.5 });
    heroSvg.append(path, pulse, dot);
    return { label, part: label.dataset.part, dx, dy, path, pulse, dot, length: 0, intro: 0, hidden: true, key: '' };
  });
  let introStart = 0, heroFrame = 0, sizes = null;

  // Sizes are read once per layout change, so the per-frame pass only writes.
  function measure() {
    sizes = {
      width: topics.clientWidth, height: topics.clientHeight,
      block: { l: copy.offsetLeft - 8, t: copy.offsetTop - 8, r: copy.offsetLeft + copy.offsetWidth + 8, b: copy.offsetTop + copy.offsetHeight + 8 },
      ceiling: (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--topbar')) || 56) + 6
    };
    items.forEach(item => { item.w = item.label.offsetWidth; item.h = item.label.offsetHeight; });
  }
  function layoutHero() {
    if (!sizes) measure();
    const { width, height, block, ceiling } = sizes, margin = 14;
    if (!width || !height) return;
    const box = opening.getBoundingClientRect();
    const view = `0 0 ${width} ${height}`;
    if (heroSvg.getAttribute('viewBox') !== view) heroSvg.setAttribute('viewBox', view);
    const inside = (x, y, b) => x > b.l && x < b.r && y > b.t && y < b.b;
    const reach = World.roverScale() * 44;
    const placed = [];
    const pins = items.map(item => { const p = World.anchor(item.part); return p ? [p[0] - box.left, p[1] - box.top] : [-1e4, -1e4]; });
    items.forEach((item, index) => {
      const point = World.anchor(item.part);
      if (!point) { item.hidden = true; return; }
      const ax = point[0] - box.left, ay = point[1] - box.top;
      const { w, h } = item;
      let lx = ax + item.dx * reach, ly = ay + item.dy * reach;
      lx = clamp(lx, margin + w / 2, width - margin - w / 2);
      ly = clamp(ly, ceiling + h / 2, height - margin - h / 2);
      // A label that would sit on the headline steps out to the side of it instead.
      if (ly + h / 2 > block.t && ly - h / 2 < block.b && lx - w / 2 < block.r && lx + w / 2 > block.l) {
        if (block.r + 12 + w <= width - margin) lx = block.r + 12 + w / 2;
        else ly = ay < block.t ? block.t - h / 2 - 6 : block.b + h / 2 + 6;
      }
      // Nor on a label already placed or another part's pin: step down, then up, until clear.
      const clear = (x, y) => !placed.some(p => x - w / 2 < p.r + 6 && x + w / 2 > p.l - 6 && y - h / 2 < p.b + 4 && y + h / 2 > p.t - 4)
        && !pins.some(([px, py], k) => k !== index && px > x - w / 2 - 6 && px < x + w / 2 + 6 && py > y - h / 2 - 6 && py < y + h / 2 + 6);
      for (let step = 1; !clear(lx, ly) && step <= 6; step++) {
        const down = clamp(ly + step * (h + 6), ceiling + h / 2, height - margin - h / 2), up = clamp(ly - step * (h + 6), ceiling + h / 2, height - margin - h / 2);
        if (clear(lx, down)) { ly = down; break; }
        if (clear(lx, up)) { ly = up; break; }
      }
      const b = { l: lx - w / 2, r: lx + w / 2, t: ly - h / 2, b: ly + h / 2 };
      placed.push(b);
      // Labels never sit on the headline, and a part that left the screen takes its label with it.
      item.hidden = ax < 0 || ax > width || ay < 0 || ay > height || inside(ax, ay, block)
        || !(b.r < block.l || b.l > block.r || b.b < block.t || b.t > block.b);
      // The leader leaves the dot vertically and meets the label edge that faces it.
      let ex, ey;
      if (ay >= b.t && ay <= b.b) { ex = ax < b.l ? b.l : b.r; ey = ay; }
      else { ex = clamp(ax, b.l + w * .2, b.r - w * .2); ey = ay < b.t ? b.t : b.b; }
      const key = [ax, ay, lx, ly].map(v => v.toFixed(1)).join();
      if (key === item.key) return;
      item.key = key;
      item.label.style.setProperty('--x', `${lx.toFixed(1)}px`);
      item.label.style.setProperty('--y', `${ly.toFixed(1)}px`);
      item.path.setAttribute('d', `M${ax.toFixed(1)} ${ay.toFixed(1)}Q${ax.toFixed(1)} ${ey.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`);
      item.length = item.path.getTotalLength();
      item.path.style.strokeDasharray = `${item.length} ${item.length}`;
      [item.dot, item.pulse].forEach(circle => { circle.setAttribute('cx', ax.toFixed(1)); circle.setAttribute('cy', ay.toFixed(1)); });
    });
    paintHero();
  }
  function paintHero() {
    const reduced = preference.matches;
    // While the camera is still gliding back to the studio, the pins wait for it to land.
    const landed = reduced ? 1 : clamp(1 - World.phase * 6, 0, 1);
    items.forEach((item, i) => {
      // Topics retract one after another as the camera leaves the studio.
      const exit = reduced ? 1 : Math.min(landed, clamp(1 - scrollY / (innerHeight * .38) * (1 + i * .12), 0, 1));
      const value = item.hidden ? 0 : Math.min(item.intro, exit);
      const dot = easeOut(phase(value, 0, .3)), line = easeOut(phase(value, .12, .68)), tag = easeOut(phase(value, .5, 1));
      item.dot.style.transform = `scale(${dot})`;
      // A running CSS animation outranks inline styles, so the pulse is switched by class.
      item.pulse.classList.toggle('off', value !== 1);
      item.path.style.strokeDashoffset = String(item.length * (1 - line));
      item.label.style.opacity = String(tag);
      item.label.style.clipPath = tag === 1 ? '' : `inset(-6px ${(1 - tag) * 100}% -6px -6px round 8px)`;
      item.label.style.translate = `0 ${(1 - tag) * 8}px`;
    });
  }
  function heroTick(now) {
    heroFrame = 0;
    if (!introStart) introStart = now;
    let running = false;
    items.forEach((item, i) => {
      item.intro = clamp((now - introStart - i * 120) / 1150, 0, 1);
      if (item.intro < 1) running = true;
    });
    paintHero();
    if (running) heroFrame = requestAnimationFrame(heroTick);
  }
  function startHero() {
    cancelAnimationFrame(heroFrame);
    if (preference.matches || scrollY > innerHeight * .1) { items.forEach(item => { item.intro = 1; }); paintHero(); return; }
    introStart = 0;
    // The pins arrive once the rover has drawn itself.
    const wait = Math.max(450, (World.introEnd || 0) - performance.now());
    setTimeout(() => { heroFrame = requestAnimationFrame(heroTick); }, wait);
  }

  // 02 Journey: each card reaches out to the marker beside it on the trail and stops there.
  const stage = document.querySelector('.journey-stage');
  const journeySvg = stage.querySelector('.journey-links');
  const cards = [...stage.querySelectorAll('.journey-card')];
  const wide = matchMedia('(min-width:1101px)');
  const links = cards.map(card => {
    const link = create('path', { class: 'link' });
    const dot = create('circle', { r: 3.5 });
    journeySvg.append(link, dot);
    return { card, link, dot, key: '' };
  });
  function paintJourney() {
    const width = stage.clientWidth, height = stage.clientHeight;
    if (!wide.matches || !width) return;
    const view = `0 0 ${width} ${height}`;
    const box = stage.getBoundingClientRect();
    const rects = links.map(({ card }) => card.getBoundingClientRect());
    if (journeySvg.getAttribute('viewBox') !== view) journeySvg.setAttribute('viewBox', view);
    links.forEach(({ card, link, dot }, i) => {
      const marker = World.marker(i);
      const shown = !!marker && World.markerShown(i);
      const on = shown && card.classList.contains('revealed');
      if (marker) {
        const rect = rects[i];
        const tx = marker[0] - box.left, ty = marker[1] - box.top;
        const leftOf = rect.right - box.left <= tx;
        const fx = leftOf ? rect.right - box.left : rect.left - box.left, fy = rect.top - box.top + rect.height / 2;
        const mx = (fx + tx) / 2;
        const key = [fx, fy, tx, ty].map(v => v.toFixed(1)).join();
        if (key !== links[i].key) {
          links[i].key = key;
          link.setAttribute('d', `M${fx.toFixed(1)} ${fy.toFixed(1)}C${mx.toFixed(1)} ${fy.toFixed(1)} ${mx.toFixed(1)} ${ty.toFixed(1)} ${tx.toFixed(1)} ${ty.toFixed(1)}`);
          const length = link.getTotalLength();
          link.style.strokeDasharray = `${length} ${length}`;
          link.style.setProperty('--length', String(length));
          dot.setAttribute('cx', tx.toFixed(1)); dot.setAttribute('cy', ty.toFixed(1));
        }
      }
      link.classList.toggle('on', on);
      dot.classList.toggle('on', on);
      dot.classList.toggle('active', on && card.classList.contains('active'));
    });
  }
  new MutationObserver(paintJourney).observe(stage.querySelector('.journey-cards'), { subtree: true, attributes: true, attributeFilter: ['class'] });

  // The world calls back after every frame it draws; layout changes come through the observers.
  World.onFrame(state => {
    // Only the stage in view does any work: the hero while it is on screen, the links while
    // the Journey stage is pinned.
    if (scrollY < innerHeight * .6) layoutHero();
    if (state.phi > .85 && state.phi < 2.3) paintJourney();
  });
  function layout() { measure(); items.forEach(item => { item.key = ''; }); links.forEach(link => { link.key = ''; }); layoutHero(); paintJourney(); }
  let scrollFrame = 0;
  addEventListener('scroll', () => { if (!scrollFrame) scrollFrame = requestAnimationFrame(() => { scrollFrame = 0; paintHero(); }); }, { passive: true });
  new ResizeObserver(layout).observe(document.documentElement);
  wide.addEventListener('change', layout);
  preference.addEventListener('change', () => { layout(); startHero(); });
  document.fonts.ready.then(layout);
  layout();
  startHero();
})();
