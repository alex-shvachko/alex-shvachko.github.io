(() => {
  const section = document.querySelector('.journey');
  const cards = [...section.querySelectorAll('.journey-card')];
  const sphere = section.querySelector('.tag-sphere');
  let lastTime = 0;
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width:1100px)');
  const groups = [
    ['Claude Code', 'Codex', 'LoRA Training', 'Orchestration', 'Multimodal AI', 'Automation'],
    ['Security', 'Data Engineering', 'Deep Learning', 'AI Safety', 'LLM Fine-tuning', 'Databases'],
    ['Pattern Mining', 'SQL Server', 'Data Warehouse', 'Time Series', 'SLURM', 'MapReduce'],
    ['AI Education', 'Communication', 'Presentations', 'Networking', 'Leadership', 'Management'],
    ['Coding Education', 'Development Basics', 'Human Connection', 'Mathematics', 'Computer Science', 'Python']
  ];
  // Five longitude sectors cover the whole sphere, including its rear hemisphere.
  const tags = groups.flatMap((labels, group) => labels.map((label, row) => {
    const longitude = group * Math.PI * 2 / groups.length + (row % 2 ? .22 : -.22);
    const latitude = (row - 2.5) * .36;
    const el = document.createElement('span');
    el.className = 'sphere-tag'; el.textContent = label; el.setAttribute('role', 'listitem');
    sphere.append(el);
    return { el, group, x: Math.cos(latitude) * Math.sin(longitude), y: Math.sin(latitude), z: Math.cos(latitude) * Math.cos(longitude) };
  }));
  let rotation = 0, desiredRotation = 0, active = -1, frame = 0, reduced = false, drag = null, offset = 0, visible = false;
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  // The globe's wireframe: meridians and parallels on the tags' own sphere, the near half drawn
  // brighter than the far half, and a dashed orbit ring round it.
  const NS = 'http://www.w3.org/2000/svg';
  const rim = section.querySelector('.sphere-rim');
  const wire = document.createElementNS(NS, 'svg');
  wire.setAttribute('aria-hidden', 'true');
  const [backPath, frontPath, equatorPath, orbitPath] = ['back', 'front', 'equator', 'orbit'].map(name => {
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('class', name === 'back' ? '' : name);
    wire.append(path);
    return path;
  });
  rim.append(wire);
  let wireKey = '';
  function drawWire(angle, tilt) {
    const size = sphere.clientWidth, c = size / 2, R = size * .35;
    const key = `${size} ${angle.toFixed(4)} ${tilt}`;
    if (!size || key === wireKey) return;
    const resized = !wireKey.startsWith(`${size} `);
    wireKey = key;
    if (resized) wire.setAttribute('viewBox', `0 0 ${size} ${size}`);
    let front = '', back = '', equator = '';
    const trace = (point, steps) => {
      let prev = null;
      for (let k = 0; k <= steps; k++) {
        const [x0, y0, z0] = point(k / steps * Math.PI * 2);
        const x = x0 * Math.cos(angle) + z0 * Math.sin(angle), zr = z0 * Math.cos(angle) - x0 * Math.sin(angle);
        const y = y0 * Math.cos(tilt) - zr * Math.sin(tilt), z = y0 * Math.sin(tilt) + zr * Math.cos(tilt);
        const p = 3.5 / (3.5 - z), sx = c + x * R * p, sy = c + y * R * p, near = z >= 0;
        const step = `${sx.toFixed(1)} ${sy.toFixed(1)}`;
        if (prev && prev.near === near) { if (near) front += 'L' + step; else back += 'L' + step; }
        else if (near) front += 'M' + step; else back += 'M' + step;
        prev = { near };
      }
    };
    for (let m = 0; m < 6; m++) { const l = m * Math.PI / 6; trace(t => [Math.cos(t) * Math.sin(l), Math.sin(t), Math.cos(t) * Math.cos(l)], 64); }
    [-1.05, -.55, .55, 1.05].forEach(lat => trace(t => [Math.cos(lat) * Math.sin(t), Math.sin(lat), Math.cos(lat) * Math.cos(t)], 64));
    const f0 = front, b0 = back;
    front = ''; back = '';
    trace(t => [Math.sin(t), 0, Math.cos(t)], 72);
    equator = front; back = b0 + back; front = f0;
    backPath.setAttribute('d', back); frontPath.setAttribute('d', front); equatorPath.setAttribute('d', equator);
    // The orbit: a tilted ring a little outside the globe; it only changes with the size.
    if (!resized) return;
    let orbit = '';
    for (let k = 0; k <= 96; k++) {
      const t = k / 96 * Math.PI * 2, x = Math.cos(t) * size * .56, y = Math.sin(t) * size * .17, r = -.32;
      orbit += (k ? 'L' : 'M') + (c + x * Math.cos(r) - y * Math.sin(r)).toFixed(1) + ' ' + (c + x * Math.sin(r) + y * Math.cos(r)).toFixed(1);
    }
    orbitPath.setAttribute('d', orbit);
  }
  function paint() {
    const radius = sphere.clientWidth * .35;
    const angle = reduced ? 0 : rotation + offset;
    const tilt = reduced ? 0 : -.12;
    drawWire(angle, tilt === 0 ? -.12 : tilt);
    tags.forEach(tag => {
      const x = tag.x * Math.cos(angle) + tag.z * Math.sin(angle);
      const z0 = tag.z * Math.cos(angle) - tag.x * Math.sin(angle);
      const y = tag.y * Math.cos(tilt) - z0 * Math.sin(tilt);
      const z = tag.y * Math.sin(tilt) + z0 * Math.cos(tilt);
      const perspective = 3.5 / (3.5 - z);
      tag.el.style.transform = `translate(-50%,-50%) translate(${x * radius * perspective}px,${y * radius * perspective}px) scale(${(.73 + (z + 1) * .18) * perspective})`;
      tag.el.style.opacity = String(.16 + (z + 1) * .42);
      tag.el.style.zIndex = String(Math.round((z + 1) * 100));
      tag.el.classList.toggle('focused', tag.group === active);
    });
  }
  function update(now) {
    frame = 0;
    if (!visible || document.hidden) return;
    const elapsed = lastTime ? Math.min(64, now - lastTime) : 1000 / 60;
    lastTime = now;
    const rect = section.getBoundingClientRect();
    // When the section is no taller than the screen (reduced motion), scroll cannot choose a
    // chapter: the buttons do, starting from the first.
    const span = mobile.matches ? section.offsetHeight - innerHeight * .4 : section.offsetHeight - innerHeight;
    let next = active < 0 ? 0 : active;
    if (span > 1) {
      const p = mobile.matches ? clamp((innerHeight * .4 - rect.top) / span, 0, 1) : clamp(-rect.top / span, 0, 1);
      next = Math.min(4, Math.floor(p * 5));
    }
    if (!Number.isFinite(next)) next = 0;
    if (next !== active) {
      active = next;
      cards.forEach((card, i) => { card.classList.toggle('revealed', reduced || i <= active); card.classList.toggle('active', i === active); });
      section.querySelector('#sphere-chapter').textContent = cards[active].querySelector('h3').textContent;
      desiredRotation = -active * Math.PI * 2 / 5;
    }
    if (!reduced) {
      rotation += (desiredRotation - rotation) * (1 - Math.exp(-elapsed / 180));
    }
    paint();
    if (!reduced && rect.top < innerHeight && rect.bottom > 0 && Math.abs(desiredRotation - rotation) > .001) schedule();
  }
  function schedule() { if (visible && !frame) frame = requestAnimationFrame(update); }
  function configure() {
    reduced = preference.matches;
    section.classList.toggle('journey-live', !reduced);
    section.classList.toggle('journey-reduced', reduced);
    if (reduced) offset = 0;
    active = -1; schedule();
  }
  cards.forEach((card, i) => card.querySelector('button').addEventListener('click', () => {
    if (!reduced && !mobile.matches) scrollTo({ top: scrollY + section.getBoundingClientRect().top + (i + .08) / 5 * (section.offsetHeight - innerHeight), behavior: 'auto' });
    else {
      active = i; cards.forEach((item, n) => item.classList.toggle('active', n === i));
      desiredRotation = -i * Math.PI * 2 / 5;
      section.querySelector('#sphere-chapter').textContent = card.querySelector('h3').textContent;
      if (reduced) paint();
      else { rotation = desiredRotation; paint(); }
    }
  }));
  sphere.addEventListener('pointerdown', event => { if (reduced) return; drag = { x: event.clientX, offset }; sphere.setPointerCapture(event.pointerId); });
  sphere.addEventListener('pointermove', event => { if (drag) { offset = drag.offset + (event.clientX - drag.x) * .008; paint(); } });
  sphere.addEventListener('pointerup', () => { drag = null; offset = 0; schedule(); });
  sphere.addEventListener('pointercancel', () => { drag = null; offset = 0; schedule(); });
  sphere.addEventListener('lostpointercapture', () => { drag = null; offset = 0; schedule(); });
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; lastTime = 0; schedule(); }).observe(section);
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  document.addEventListener('visibilitychange', () => { lastTime = 0; schedule(); });
  preference.addEventListener('change', configure);
  configure();
})();
