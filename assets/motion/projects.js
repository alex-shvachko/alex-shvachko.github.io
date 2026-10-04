(() => {
  const section = document.querySelector('.projects-screen');
  const grid = section.querySelector('.projects-grid');
  const tiles = [...grid.querySelectorAll('.project-tile')];
  const filters = [...section.querySelectorAll('[data-filter]')];
  const sort = section.querySelector('#project-sort');
  const toggle = document.querySelector('#motion-toggle');
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  let category = 'All';
  const reduced = () => preference.matches || toggle.getAttribute('aria-pressed') === 'true';
  function cancelMotion() { tiles.forEach(tile => tile.getAnimations({ subtree: true }).forEach(animation => animation.cancel())); }
  function render() {
    cancelMotion();
    const before = new Map(tiles.filter(tile => !tile.hidden).map(tile => [tile, tile.getBoundingClientRect()]));
    const ordered = [...tiles].sort((a, b) => sort.value === 'az'
      ? a.querySelector('h3').textContent.localeCompare(b.querySelector('h3').textContent)
      : (Number(a.dataset.order) - Number(b.dataset.order)) * (sort.value === 'reverse' ? -1 : 1));
    ordered.forEach(tile => { tile.hidden = category !== 'All' && tile.dataset.category !== category; grid.append(tile); });
    const count = tiles.filter(tile => !tile.hidden).length;
    section.querySelector('#project-results').textContent = `${String(count).padStart(2, '0')} EXPLORATIONS / MOCK SHOWCASE`;
    const positions = tiles.filter(tile => !tile.hidden).map(tile => [tile, tile.getBoundingClientRect()]);
    positions.forEach(([tile, rect]) => {
      if (rect.bottom <= 0 || rect.top >= innerHeight) return;
      const previous = before.get(tile);
      const x = previous ? previous.left - rect.left : 0;
      const y = previous ? previous.top - rect.top : 0;
      if (reduced()) {
        tile.animate([{ opacity: .7 }, { opacity: 1 }], { duration: 100 });
      } else if (previous && (x || y)) {
        tile.animate([{ transform: `translate(${x}px,${y}px)` }, { transform: 'translate(0,0)' }], { duration: 280, easing: 'cubic-bezier(.16,1,.3,1)' });
      } else if (!previous) {
        tile.animate([{ opacity: .25 }, { opacity: 1 }], { duration: 180, easing: 'ease-out' });
      }
    });
  }
  filters.forEach(button => button.addEventListener('click', () => {
    category = button.dataset.filter;
    filters.forEach(filter => filter.setAttribute('aria-pressed', String(filter === button)));
    render();
  }));
  sort.addEventListener('change', render);
  tiles.forEach(tile => tile.querySelector('details').addEventListener('toggle', event => {
    if (event.target.open) tile.querySelector('.project-description').animate([{ opacity: .35 }, { opacity: 1 }], { duration: reduced() ? 100 : 180, easing: 'ease-out' });
  }));
  preference.addEventListener('change', cancelMotion);
  toggle.addEventListener('click', cancelMotion);
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancelMotion(); });
  let scheduled = false;
  let previousProgress = -1;
  let previousReduced;
  function updateEntry() {
    scheduled = false;
    const reduced = preference.matches || toggle.getAttribute('aria-pressed') === 'true';
    const progress = reduced ? 1 : Math.min(1, Math.max(0, (innerHeight - section.getBoundingClientRect().top) / (innerHeight * .5)));
    if (progress === previousProgress && reduced === previousReduced) return;
    previousProgress = progress;
    previousReduced = reduced;
    section.classList.toggle('projects-motion-reduced', reduced);
    section.querySelector('.projects-intro').style.clipPath = progress === 1 ? '' : `inset(0 ${(1 - progress) * 100}% 0 0)`;
    const controlsProgress = Math.min(1, Math.max(0, (progress - .1) / .9));
    section.querySelector('.projects-controls').style.clipPath = controlsProgress === 1 ? '' : `inset(0 ${(1 - controlsProgress) * 100}% 0 0)`;
  }
  function scheduleEntry() {
    if (!scheduled) { scheduled = true; requestAnimationFrame(updateEntry); }
  }
  addEventListener('scroll', scheduleEntry, { passive: true });
  addEventListener('resize', scheduleEntry);
  preference.addEventListener('change', scheduleEntry);
  toggle.addEventListener('click', scheduleEntry);
  scheduleEntry();
})();
