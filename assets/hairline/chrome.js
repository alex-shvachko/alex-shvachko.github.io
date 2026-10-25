(() => {
  // The top bar: the theme switch (light unless the visitor chose dark), the four stages with a marker that slides to the one in
  // view, and the bar's own presence (clear over the hero, a frosted strip after it).
  const root = document.documentElement;
  const bar = document.querySelector('.topbar');
  const toggle = bar.querySelector('.theme-toggle');
  const system = matchMedia('(prefers-color-scheme: dark)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const isDark = () => (root.dataset.theme ? root.dataset.theme === 'dark' : system.matches);

  function paint() {
    const dark = isDark();
    toggle.dataset.mode = dark ? 'dark' : 'light';
    toggle.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
    if (root.dataset.theme) document.querySelectorAll('meta[name=theme-color]').forEach(meta => { meta.content = dark ? '#08090a' : '#ffffff'; });
  }
  function apply(next) {
    root.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch {}
    paint();
  }
  // The new theme wipes out from the switch as a growing circle.
  let latest = null;
  toggle.addEventListener('click', () => {
    const next = isDark() ? 'light' : 'dark';
    if (!document.startViewTransition || reduced.matches) { apply(next); return; }
    const r = toggle.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    root.classList.add('theme-vt');
    const transition = document.startViewTransition(() => apply(next));
    latest = transition;
    // A second click skips the first wipe; only the latest one may take the class away.
    transition.finished.finally(() => { if (latest === transition) root.classList.remove('theme-vt'); });
    transition.ready.then(() => root.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { duration: 680, easing: 'cubic-bezier(.32,.72,0,1)', pseudoElement: '::view-transition-new(root)' }
    )).catch(() => {});
  });
  system.addEventListener('change', paint);
  paint();

  // Stages: the last section whose top has crossed 45% of the viewport is the current one.
  const nav = bar.querySelector('.topbar-nav');
  const links = [...nav.querySelectorAll('a')];
  const marker = nav.querySelector('.topbar-hl');
  const sections = links.map(link => document.querySelector(link.getAttribute('href')));
  let current = -1, frame = 0;
  function place() {
    const link = links[current];
    if (!link) return;
    marker.style.setProperty('--x', `${link.offsetLeft}px`);
    marker.style.setProperty('--w', `${link.offsetWidth}px`);
    marker.style.setProperty('--o', '1');
  }
  function update() {
    frame = 0;
    const line = innerHeight * .45;
    let next = 0;
    sections.forEach((section, i) => { if (section && section.getBoundingClientRect().top <= line) next = i; });
    if (next !== current) {
      current = next;
      links.forEach((link, i) => { if (i === current) link.setAttribute('aria-current', 'true'); else link.removeAttribute('aria-current'); });
      place();
      if (!nav.hasAttribute('data-ready')) requestAnimationFrame(() => nav.setAttribute('data-ready', ''));
    }
    // The bar is clear over the hero and frosts once the headline has gone; the name docks in as it leaves.
    const y = scrollY, h = innerHeight;
    bar.style.setProperty('--bar-solid', Math.min(1, Math.max(0, (y - h * .2) / (h * .35))).toFixed(3));
    bar.style.setProperty('--bar-name', Math.min(1, Math.max(0, (y - h * .3) / (h * .25))).toFixed(3));
  }
  const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', () => { place(); schedule(); });
  document.fonts?.ready.then(place);
  update();
})();
