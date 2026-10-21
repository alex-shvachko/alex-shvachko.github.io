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
  function paint() {
    const radius = sphere.clientWidth * .35;
    const angle = reduced ? 0 : rotation + offset;
    const tilt = reduced ? 0 : -.12;
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
    const p = mobile.matches
      ? clamp((innerHeight * .4 - rect.top) / (section.offsetHeight - innerHeight * .4), 0, 1)
      : clamp(-rect.top / (section.offsetHeight - innerHeight), 0, 1);
    const next = Math.min(4, Math.floor(p * 5));
    if (next !== active) {
      active = next;
      cards.forEach((card, i) => { card.classList.toggle('revealed', reduced || i <= active); card.classList.toggle('active', i === active); });
      section.querySelector('#sphere-chapter').textContent = cards[active].querySelector('h3').textContent.toUpperCase();
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
      section.querySelector('#sphere-chapter').textContent = card.querySelector('h3').textContent.toUpperCase();
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
