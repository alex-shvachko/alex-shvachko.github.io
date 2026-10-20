(() => {
  // Leader lines are drawn in pixels from live layout, so labels, lines and dots always meet.
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

  // 01 Home: topic labels pinned to parts of the rover in the film's first frame (1920x1080).
  const FRAME_W = 1920, FRAME_H = 1080;
  const scene = document.querySelector('.scene');
  const video = document.querySelector('#rover');
  const topics = document.querySelector('.hero-topics');
  const copy = document.querySelector('.hero-copy');
  const heroSvg = topics.querySelector('svg');
  const items = [...topics.querySelectorAll('.topic')].map(label => {
    const [ax, ay] = label.dataset.anchor.split(',').map(Number);
    const [lx, ly] = label.dataset.label.split(',').map(Number);
    const path = create('path');
    const pulse = create('circle', { class: 'topic-pulse', r: 5 });
    const dot = create('circle', { class: 'topic-dot', r: 5 });
    heroSvg.append(path, pulse, dot);
    return { label, path, pulse, dot, ax, ay, lx, ly, length: 0, intro: 0, hidden: false };
  });
  let introStart = 0, heroFrame = 0;

  // How the film frame sits in the scene, following object-fit: cover and object-position.
  function cover() {
    const width = scene.clientWidth, height = scene.clientHeight;
    const scale = Math.max(width / FRAME_W, height / FRAME_H);
    const [px = .5, py = .5] = getComputedStyle(video).objectPosition.split(' ').map(value => parseFloat(value) / 100).map(value => Number.isFinite(value) ? value : .5);
    return { scale, ox: (width - FRAME_W * scale) * px, oy: (height - FRAME_H * scale) * py };
  }
  function framePoint(x, y) {
    const { scale, ox, oy } = cover();
    return [ox + x * scale, oy + y * scale];
  }
  function layoutHero() {
    const width = topics.clientWidth, height = topics.clientHeight, margin = 14;
    if (!width || !height || !scene.clientWidth) return;
    heroSvg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    const block = { l: copy.offsetLeft, t: copy.offsetTop, r: copy.offsetLeft + copy.offsetWidth, b: copy.offsetTop + copy.offsetHeight };
    const inside = (x, y, box) => x > box.l && x < box.r && y > box.t && y < box.b;
    items.forEach(item => {
      const [ax, ay] = framePoint(item.ax, item.ay);
      let [lx, ly] = framePoint(item.lx, item.ly);
      const w = item.label.offsetWidth, h = item.label.offsetHeight;
      lx = clamp(lx, margin + w / 2, width - margin - w / 2);
      ly = clamp(ly, margin + h / 2, height - margin - h / 2);
      const box = { l: lx - w / 2, r: lx + w / 2, t: ly - h / 2, b: ly + h / 2 };
      // Labels never sit on the headline; on narrow screens the rover may also be cropped away.
      item.hidden = ax < 0 || ax > width || ay < 0 || ay > height || inside(ax, ay, block)
        || !(box.r < block.l || box.l > block.r || box.b < block.t || box.t > block.b);
      item.label.style.setProperty('--x', `${lx.toFixed(1)}px`);
      item.label.style.setProperty('--y', `${ly.toFixed(1)}px`);
      // The leader leaves the dot vertically and meets the label edge that faces it.
      let ex, ey;
      if (ay >= box.t && ay <= box.b) { ex = ax < box.l ? box.l : box.r; ey = ay; }
      else { ex = clamp(ax, box.l + w * .2, box.r - w * .2); ey = ay < box.t ? box.t : box.b; }
      item.path.setAttribute('d', `M${ax.toFixed(1)} ${ay.toFixed(1)}Q${ax.toFixed(1)} ${ey.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`);
      item.length = item.path.getTotalLength();
      item.path.style.strokeDasharray = `${item.length} ${item.length}`;
      [item.dot, item.pulse].forEach(circle => { circle.setAttribute('cx', ax.toFixed(1)); circle.setAttribute('cy', ay.toFixed(1)); });
    });
    paintHero();
  }
  function paintHero() {
    const reduced = preference.matches;
    items.forEach((item, i) => {
      // Topics retract one after another as the page leaves the studio shot.
      const exit = reduced ? 1 : clamp(1 - scrollY / (innerHeight * .38) * (1 + i * .12), 0, 1);
      const value = item.hidden ? 0 : Math.min(item.intro, exit);
      const dot = easeOut(phase(value, 0, .3)), line = easeOut(phase(value, .12, .68)), tag = easeOut(phase(value, .5, 1));
      item.dot.style.transform = `scale(${dot})`;
      item.pulse.style.opacity = value === 1 ? '' : '0';
      item.path.style.strokeDashoffset = String(item.length * (1 - line));
      item.label.style.opacity = String(tag);
      item.label.style.clipPath = tag === 1 ? '' : `inset(-6px ${(1 - tag) * 100}% -6px -6px)`;
      item.label.style.translate = `0 ${(1 - tag) * 10}px`;
    });
  }
  function heroTick(now) {
    heroFrame = 0;
    if (!introStart) introStart = now;
    let running = false;
    items.forEach((item, i) => {
      item.intro = clamp((now - introStart - 520 - i * 120) / 1150, 0, 1);
      if (item.intro < 1) running = true;
    });
    paintHero();
    if (running) heroFrame = requestAnimationFrame(heroTick);
  }
  function startHero() {
    cancelAnimationFrame(heroFrame);
    if (preference.matches || scrollY > innerHeight * .1) { items.forEach(item => { item.intro = 1; }); paintHero(); return; }
    introStart = 0;
    heroFrame = requestAnimationFrame(heroTick);
  }

  // 02 Journey: each card reaches out to the dirt trail in the aerial shot and stops where it
  // touches it. The trail moves with the film, so links follow the frame actually shown.
  const stage = document.querySelector('.journey-stage');
  const journeySvg = stage.querySelector('.journey-links');
  const cards = [...stage.querySelectorAll('.journey-card')];
  const wide = matchMedia('(min-width:1101px)');
  const links = cards.map(card => {
    const link = create('path', { class: 'link' });
    const dot = create('circle', { r: 7 });
    journeySvg.append(link, dot);
    return { card, link, dot };
  });
  // Trail edges per film time and frame band, tracked offline by tools/trail-track.py.
  let trail = null;
  fetch('assets/motion/film/trail.json').then(response => response.ok ? response.json() : null).then(data => { trail = data; paintJourney(); }).catch(() => {});
  // [left, right] trail edge in frame pixels at film time t and frame row y; null where untracked.
  function trailAt(t, y) {
    const { start, step, band, frames } = trail;
    const last = frames[0].length / 2 - 1;
    const f = (t - start) / step, i = Math.floor(f);
    const row = clamp(y / band - .5, 0, last), j = Math.floor(row);
    const sample = (frame, b) => frames[frame] && frames[frame][b * 2] >= 0 ? [frames[frame][b * 2], frames[frame][b * 2 + 1]] : null;
    const mix = (a, b, k) => a && b ? [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k] : null;
    const at = frame => mix(sample(frame, j), sample(frame, Math.min(j + 1, last)), row - j);
    return mix(at(i), at(i + 1), f - i);
  }
  function paintJourney() {
    const width = stage.clientWidth, height = stage.clientHeight;
    if (!wide.matches || !width) return;
    journeySvg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    const box = stage.getBoundingClientRect();
    // The links layer drifts with the cards while the stage UI arrives and leaves.
    const shift = parseFloat(stage.style.getPropertyValue('--journey-shift')) || 0;
    const { scale, ox, oy } = cover();
    links.forEach(({ card, link, dot }) => {
      const y = card.offsetTop + card.offsetHeight / 2;
      const left = card.offsetLeft, right = left + card.offsetWidth;
      const edges = trail && trailAt(video.currentTime, (y + box.top + shift - oy) / scale);
      const [l, r] = edges ? edges.map(x => ox + x * scale - box.left) : [0, 0];
      // A card whose trail runs underneath it already touches it, so it gets no link.
      const reachable = Boolean(edges) && (r < left || l > right);
      if (reachable) {
        const from = r < left ? left : right, to = r < left ? r : l, length = Math.abs(to - from);
        link.setAttribute('d', `M${from.toFixed(1)} ${y}H${to.toFixed(1)}`);
        link.style.strokeDasharray = `${length} ${length}`;
        link.style.setProperty('--length', String(length));
        dot.setAttribute('cx', to.toFixed(1)); dot.setAttribute('cy', y);
      }
      const on = reachable && card.classList.contains('revealed');
      link.classList.toggle('on', on);
      dot.classList.toggle('on', on);
      dot.classList.toggle('active', on && card.classList.contains('active'));
    });
  }
  new MutationObserver(paintJourney).observe(stage.querySelector('.journey-cards'), { subtree: true, attributes: true, attributeFilter: ['class'] });
  video.addEventListener('seeked', paintJourney);

  function layout() { layoutHero(); paintJourney(); }
  let scrollFrame = 0;
  addEventListener('scroll', () => { if (!scrollFrame) scrollFrame = requestAnimationFrame(() => { scrollFrame = 0; paintHero(); paintJourney(); }); }, { passive: true });
  new ResizeObserver(layout).observe(document.documentElement);
  new ResizeObserver(paintJourney).observe(stage);
  wide.addEventListener('change', layout);
  preference.addEventListener('change', () => { layout(); startHero(); });
  document.fonts.ready.then(layout);
  layout();
  startHero();
})();
