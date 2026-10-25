(() => {
  const section = document.querySelector('.projects-screen');
  const grid = section.querySelector('.projects-grid');
  const tiles = [...grid.querySelectorAll('.project-tile')];
  const filterBar = section.querySelector('.project-filters');
  const filters = [...filterBar.querySelectorAll('[data-filter]')];
  const sort = section.querySelector('#project-sort');
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const hover = matchMedia('(hover: hover) and (pointer: fine)');
  const results = section.querySelector('#project-results');
  let category = 'All';
  const reduced = () => preference.matches;
  function cancelMotion() { tiles.forEach(tile => tile.getAnimations({ subtree: true }).forEach(animation => animation.cancel())); }
  function render() {
    cancelMotion();
    const before = new Map(tiles.filter(tile => !tile.hidden).map(tile => [tile, tile.getBoundingClientRect()]));
    const ordered = [...tiles].sort((a, b) => sort.value === 'az'
      ? a.querySelector('h3').textContent.localeCompare(b.querySelector('h3').textContent)
      : (Number(a.dataset.order) - Number(b.dataset.order)) * (sort.value === 'reverse' ? -1 : 1));
    ordered.forEach(tile => { tile.hidden = category !== 'All' && tile.dataset.category !== category; grid.append(tile); });
    const shown = tiles.filter(tile => !tile.hidden).length;
    results.textContent = `${shown} ${shown === 1 ? 'project' : 'projects'} shown`;
    const positions = tiles.filter(tile => !tile.hidden).map(tile => [tile, tile.getBoundingClientRect()]);
    positions.forEach(([tile, rect], i) => {
      if (rect.bottom <= 0 || rect.top >= innerHeight) return;
      const previous = before.get(tile);
      const x = previous ? previous.left - rect.left : 0;
      const y = previous ? previous.top - rect.top : 0;
      if (reduced()) {
        tile.animate([{ opacity: .7 }, { opacity: 1 }], { duration: 100 });
      } else if (previous && (x || y)) {
        tile.animate([{ translate: `${x}px ${y}px` }, { translate: '0 0' }], { duration: 520, easing: 'cubic-bezier(.32,.72,0,1)' });
      } else if (!previous) {
        tile.animate([{ opacity: 0, scale: .96, filter: 'blur(4px)' }, { opacity: 1, scale: 1, filter: 'blur(0)' }], { duration: 420, delay: i * 30, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' });
      }
    });
  }

  // The filter's plate slides to the pressed button.
  const plate = document.createElement('i');
  plate.className = 'filter-hl';
  plate.setAttribute('aria-hidden', 'true');
  filterBar.prepend(plate);
  function placePlate() {
    const button = filters.find(filter => filter.getAttribute('aria-pressed') === 'true');
    if (!button || !button.offsetWidth) return;
    plate.style.setProperty('--x', `${button.offsetLeft}px`);
    plate.style.setProperty('--y', `${button.offsetTop}px`);
    plate.style.setProperty('--w', `${button.offsetWidth}px`);
    plate.style.setProperty('--h', `${button.offsetHeight}px`);
    if (!filterBar.hasAttribute('data-hl')) { filterBar.setAttribute('data-hl', ''); requestAnimationFrame(() => filterBar.setAttribute('data-ready', '')); }
  }
  filters.forEach(button => button.addEventListener('click', () => {
    category = button.dataset.filter;
    filters.forEach(filter => filter.setAttribute('aria-pressed', String(filter === button)));
    placePlate();
    render();
  }));
  sort.addEventListener('change', render);
  new ResizeObserver(placePlate).observe(filterBar);
  document.fonts?.ready.then(placePlate);
  placePlate();

  // Tiles lean a few degrees toward the pointer, a soft light follows it, and the picture
  // drifts the other way inside its frame.
  tiles.forEach(tile => {
    let frame = 0, event = null;
    const media = tile.querySelector('.project-image');
    const paint = () => {
      frame = 0;
      const r = tile.getBoundingClientRect(), x = (event.clientX - r.left) / r.width, y = (event.clientY - r.top) / r.height;
      tile.style.setProperty('--ry', `${((x - .5) * 6).toFixed(2)}deg`);
      tile.style.setProperty('--rx', `${((.5 - y) * 5).toFixed(2)}deg`);
      tile.style.setProperty('--mx', `${(x * r.width).toFixed(0)}px`);
      tile.style.setProperty('--my', `${(y * r.height).toFixed(0)}px`);
      media.style.setProperty('--px', `${((.5 - x) * 10).toFixed(1)}px`);
      media.style.setProperty('--py', `${((.5 - y) * 8).toFixed(1)}px`);
    };
    tile.addEventListener('pointermove', e => {
      if (!hover.matches || reduced() || e.pointerType !== 'mouse') return;
      event = e;
      tile.setAttribute('data-tilt', '');
      if (!frame) frame = requestAnimationFrame(paint);
    });
    tile.addEventListener('pointerleave', () => {
      cancelAnimationFrame(frame); frame = 0;
      tile.removeAttribute('data-tilt');
      ['--rx', '--ry'].forEach(name => tile.style.removeProperty(name));
      ['--px', '--py'].forEach(name => media.style.removeProperty(name));
    });
  });

  // The sheet. Where view transitions exist, the tile's picture travels into the sheet and back.
  const modal = section.querySelector('.project-modal');
  const modalMedia = modal.querySelector('.project-modal-media');
  let opener = null, openTile = null, closing = false, morph = null;
  // The tiles' loops rest behind the sheet.
  function pauseTiles(paused) {
    tiles.forEach(tile => { const video = tile.querySelector('video'); if (!video) return; if (paused) video.pause(); else if (!reduced()) video.play().catch(() => {}); });
  }
  const canMorph = () => typeof document.startViewTransition === 'function' && !reduced();
  function fill(tile) {
    modalMedia.replaceChildren(tile.querySelector('img').cloneNode());
    const video = tile.querySelector('video');
    if (video && !reduced()) {
      const clip = video.cloneNode();
      clip.muted = true;
      modalMedia.append(clip);
      clip.play().catch(() => {});
    }
    modalMedia.append(tile.querySelector('.project-number').cloneNode(true));
    const total = String(tiles.length).padStart(2, '0');
    modal.querySelector('.project-modal-count').textContent = `Project ${tile.querySelector('.project-number').textContent} / ${total}`;
    modal.querySelector('#project-modal-title').textContent = tile.querySelector('h3').textContent;
    modal.querySelector('.project-modal-sub').textContent = tile.querySelector('.project-meta p').textContent;
    modal.querySelector('.project-modal-text').textContent = tile.querySelector('.project-description').textContent;
  }
  function openProject(tile) {
    opener = tile.querySelector('.project-open');
    openTile = tile;
    fill(tile);
    const show = () => { document.documentElement.classList.add('project-modal-open'); modal.showModal(); pauseTiles(true); };
    if (!canMorph()) { modal.removeAttribute('data-vt'); show(); return; }
    const source = tile.querySelector('.project-image');
    source.style.viewTransitionName = 'project-media';
    modal.setAttribute('data-vt', '');
    const transition = morph = document.startViewTransition(() => {
      source.style.viewTransitionName = '';
      modalMedia.style.viewTransitionName = 'project-media';
      show();
    });
    // A close started before this finished owns the names now; leave them to it.
    transition.finished.finally(() => { if (morph === transition) modalMedia.style.viewTransitionName = ''; });
  }
  function closeProject() {
    if (!modal.open || closing) return;
    const target = openTile && !openTile.hidden ? openTile.querySelector('.project-image') : null;
    const finish = () => { closing = false; modal.removeAttribute('data-closing'); modal.close(); };
    if (canMorph() && target) {
      closing = true;
      modalMedia.style.viewTransitionName = 'project-media';
      const transition = morph = document.startViewTransition(() => {
        modalMedia.style.viewTransitionName = '';
        target.style.viewTransitionName = 'project-media';
        finish();
      });
      transition.finished.finally(() => { if (morph === transition) target.style.viewTransitionName = ''; });
      return;
    }
    if (reduced()) { finish(); return; }
    closing = true;
    modal.setAttribute('data-closing', '');
    setTimeout(finish, 220);
  }
  tiles.forEach(tile => tile.querySelector('.project-open').addEventListener('click', () => openProject(tile)));
  modal.querySelector('.project-modal-close').addEventListener('click', closeProject);
  modal.addEventListener('cancel', event => { event.preventDefault(); closeProject(); });
  modal.addEventListener('click', event => {
    const box = modal.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) closeProject();
  });
  modal.addEventListener('close', () => {
    pauseTiles(false);
    modalMedia.replaceChildren();
    document.documentElement.classList.remove('project-modal-open');
    opener?.focus({ preventScroll: true });
    openTile = null;
  });
  preference.addEventListener('change', cancelMotion);
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancelMotion(); });

  // The heading and the controls wipe in from the left as the section rises.
  let scheduled = false;
  let previousProgress = -1;
  let previousReduced;
  function updateEntry() {
    scheduled = false;
    const reduced = preference.matches;
    const progress = reduced ? 1 : Math.min(1, Math.max(0, (innerHeight - section.getBoundingClientRect().top) / (innerHeight * .5)));
    if (progress === previousProgress && reduced === previousReduced) return;
    previousProgress = progress;
    previousReduced = reduced;
    section.classList.toggle('projects-motion-reduced', reduced);
    section.querySelector('.projects-intro').style.clipPath = progress === 1 ? '' : `inset(-20px ${(1 - progress) * 100}% -20px -20px)`;
    const controlsProgress = Math.min(1, Math.max(0, (progress - .1) / .9));
    section.querySelector('.projects-controls').style.clipPath = controlsProgress === 1 ? '' : `inset(-10px ${(1 - controlsProgress) * 100}% -10px -10px round 14px)`;
  }
  function scheduleEntry() {
    if (!scheduled) { scheduled = true; requestAnimationFrame(updateEntry); }
  }
  addEventListener('scroll', scheduleEntry, { passive: true });
  addEventListener('resize', scheduleEntry);
  preference.addEventListener('change', scheduleEntry);
  scheduleEntry();
})();
