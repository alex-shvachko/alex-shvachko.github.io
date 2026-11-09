(() => {
  const section = document.querySelector('.projects-screen');
  const grid = section.querySelector('.projects-grid');
  const tiles = [...grid.querySelectorAll('.project-tile')];
  const filterBar = section.querySelector('.project-filters');
  const filters = [...filterBar.querySelectorAll('[data-filter]')];
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const hover = matchMedia('(hover: hover) and (pointer: fine)');
  const results = section.querySelector('#project-results');
  let category = 'All';
  const reduced = () => preference.matches;
  function cancelMotion() { tiles.forEach(tile => tile.getAnimations({ subtree: true }).forEach(animation => animation.cancel())); }
  function render() {
    cancelMotion();
    const before = new Map(tiles.filter(tile => !tile.hidden).map(tile => [tile, tile.getBoundingClientRect()]));
    const ordered = [...tiles].sort((a, b) => Number(a.dataset.order) - Number(b.dataset.order));
    ordered.forEach(tile => { tile.hidden = category !== 'All' && tile.dataset.category !== category; grid.append(tile); });
    const shown = tiles.filter(tile => !tile.hidden).length;
    results.textContent = `${shown} ${shown === 1 ? 'project' : 'projects'} shown`;
    // The archive (archive.js) fills its trays in the same order and slides to the category's tray.
    section.dispatchEvent(new CustomEvent('projects:render', { detail: { tiles: ordered, category } }));
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

  // Two views of the same projects: the archive tray (the default) and the grid of tiles.
  const views = [...section.querySelectorAll('[data-view]')];
  function setView(view) {
    section.dataset.view = view;
    views.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === view)));
  }
  views.forEach(button => button.addEventListener('click', () => setView(button.dataset.view)));
  setView('archive');

  // Only load a live project thumbnail while its grid tile is visible. A live scene compiles on
  // the page's own thread, so it mounts once the scroll has stopped and the page is idle.
  let lastScroll = 0;
  addEventListener('scroll', () => { lastScroll = performance.now(); }, { passive: true });
  section.querySelectorAll('.project-tile[data-preview]').forEach(liveTile => {
    const previewImage = liveTile.querySelector('.project-image');
    let frame = null, seen = false, timer = 0;
    const mount = () => {
      clearTimeout(timer);
      if (!seen || frame || preference.matches || modalIsOpen()) return;
      const quiet = lastScroll + 400 - performance.now();
      if (quiet > 0) { timer = setTimeout(mount, quiet); return; }
      const make = () => {
        if (!seen || frame || preference.matches || modalIsOpen()) return;
        if (performance.now() - lastScroll < 400) { mount(); return; }
        frame = document.createElement('iframe'); frame.src = liveTile.dataset.preview; frame.tabIndex = -1; frame.setAttribute('aria-hidden', 'true'); frame.title = ''; previewImage.append(frame);
      };
      if ('requestIdleCallback' in window) requestIdleCallback(make, { timeout: 800 }); else make();
    };
    const observer = new IntersectionObserver(([entry]) => {
      seen = entry.isIntersecting;
      if (seen && !preference.matches && !modalIsOpen()) mount();
      else { clearTimeout(timer); if (frame) { frame.remove(); frame = null; } }
    });
    function modalIsOpen() { return !!section.querySelector('.project-modal[open]'); }
    observer.observe(liveTile);
  });

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
  let opener = null, openTile = null, openSource = null, closing = false, morph = null;
  const rendered = element => !!element && element.getClientRects().length > 0;
  // A tile's loop plays only while the tile is on screen (never while the grid is hidden, the
  // sheet is open or motion is reduced), and its file is not fetched before it first shows.
  const tileVideos = [...grid.querySelectorAll('.project-tile video')], videosOnScreen = new Set();
  const syncVideo = video => {
    if (videosOnScreen.has(video) && !reduced() && !modal.open) video.play().catch(() => {});
    else video.pause();
  };
  tileVideos.forEach(video => { video.autoplay = false; video.preload = 'none'; video.pause(); });
  const videoObserver = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) videosOnScreen.add(entry.target); else videosOnScreen.delete(entry.target);
    syncVideo(entry.target);
  }));
  tileVideos.forEach(video => videoObserver.observe(video));
  preference.addEventListener('change', () => tileVideos.forEach(syncVideo));
  // The tiles' and the archive's loops rest behind the sheet.
  function pauseTiles(paused) {
    section.querySelectorAll('.archive-preview video').forEach(video => { if (paused) video.pause(); else if (!reduced()) video.play().catch(() => {}); });
    tileVideos.forEach(syncVideo);
    section.querySelectorAll('.project-image iframe').forEach(frame => { if (paused) { frame.dataset.pausedSrc = frame.getAttribute('src'); frame.src = 'about:blank'; } else if (frame.dataset.pausedSrc) { frame.src = frame.dataset.pausedSrc; delete frame.dataset.pausedSrc; } });
    section.dispatchEvent(new Event('project-preview-state'));
  }
  const canMorph = () => typeof document.startViewTransition === 'function' && !reduced();
  let disposeModel = null, selection = 0;
  const gallery = modal.querySelector('.project-gallery');
  function clearModel() { if (disposeModel) { disposeModel(); disposeModel = null; } }
  function fill(tile) {
    const image = tile.querySelector('img');
    const collection = window.projectMedia[tile.dataset.order] || [];
    const items = collection.length ? [...collection] : [{ type: 'image', src: image.dataset.full || image.getAttribute('src'), label: tile.querySelector('h3').textContent.trim() }];
    const originalVideo = tile.querySelector('video');
    if (originalVideo && !['8', '10'].includes(tile.dataset.order)) items.splice(tile.dataset.order === '7' ? 0 : 1, 0, { type: 'video', src: originalVideo.getAttribute('src'), label: 'Preview' });
    modal.querySelector('#project-modal-title').textContent = tile.querySelector('h3').textContent;
    modal.querySelector('.project-modal-sub').textContent = tile.querySelector('.project-meta p').textContent;
    modal.querySelector('.project-modal-text').textContent = tile.querySelector('.project-description').textContent;
    gallery.replaceChildren();
    if (items.length > 1) {
      const heading = document.createElement('h4'); heading.textContent = 'Explore the collection'; gallery.append(heading);
      const list = document.createElement('div'); list.className = 'gallery-list'; gallery.append(list);
      items.forEach((item, index) => {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'gallery-item';
        button.setAttribute('aria-label', `${item.label}${item.type === 'video' ? ', video' : item.type === 'model' ? ', 3D model' : item.type === 'experience' ? ', interactive experience' : ''}`);
        const thumb = document.createElement(item.type === 'experience' && !item.poster ? 'span' : 'img'); if (thumb.tagName === 'IMG') { thumb.src = item.type === 'image' ? item.src : (item.poster || image.getAttribute('src')); thumb.alt = ''; thumb.loading = 'lazy'; } else { thumb.className = 'gallery-placeholder'; thumb.textContent = item.label; }
        const label = document.createElement('span'); label.textContent = item.label;
        if (item.type !== 'image') { const badge = document.createElement('b'); badge.textContent = item.type === 'model' ? '3D' : item.type === 'experience' ? 'INTERACTIVE' : 'PLAY'; button.append(badge); }
        button.append(thumb, label); button.addEventListener('click', () => select(index)); list.append(button);
      });
    }
    function select(index) {
      selection++; const request = selection; clearModel(); modalMedia.replaceChildren();
      gallery.querySelectorAll('.gallery-item').forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
      const item = items[index];
      if (item.type === 'image') { const picture = document.createElement('img'); picture.src = item.src; picture.alt = item.label; modalMedia.append(picture); }
      else if (item.type === 'video') { const video = document.createElement('video'); video.src = item.src; video.controls = true; video.playsInline = true; video.preload = 'metadata'; video.poster = item.poster || image.getAttribute('src'); modalMedia.append(video); }
      else if (item.type === 'experience') { const frame = document.createElement('iframe'); frame.src = item.src; frame.title = item.label; modalMedia.append(frame); }
      else {
        const host = document.createElement('div'); host.className = 'model-viewer'; host.textContent = 'Loading model…'; modalMedia.append(host); const hint = document.createElement('span'); hint.className = 'model-hint'; hint.textContent = 'Drag or use arrow keys to rotate'; modalMedia.append(hint);
        import('./model-viewer.js').then(module => module.showModel(host, item.src)).then(dispose => { if (request === selection && host.isConnected) disposeModel = dispose; else dispose(); }).catch(() => { if (host.isConnected) host.textContent = 'This model could not be loaded.'; });
      }
    }
    select(0);
  }
  // Opened from a tile, the tile's picture travels into the sheet; opened from the archive, the
  // pulled folder's preview does.
  function openProject(tile, from = {}) {
    opener = from.opener || tile.querySelector('.project-open');
    openTile = tile;
    const source = rendered(from.source) ? from.source : tile.querySelector('.project-image');
    openSource = source;
    fill(tile);
    const show = () => { document.documentElement.classList.add('project-modal-open'); modal.showModal(); pauseTiles(true); };
    if (!canMorph() || !rendered(source)) { modal.removeAttribute('data-vt'); show(); return; }
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
    const target = openTile && !openTile.hidden && rendered(openSource) ? openSource : null;
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
  section.addEventListener('archive:open', event => openProject(event.detail.tile, event.detail));
  modal.querySelector('.project-modal-close').addEventListener('click', closeProject);
  modal.addEventListener('cancel', event => { event.preventDefault(); closeProject(); });
  modal.addEventListener('click', event => {
    const box = modal.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) closeProject();
  });
  modal.addEventListener('close', () => {
    document.documentElement.classList.remove('project-modal-open');
    pauseTiles(false);
    selection++; clearModel(); modalMedia.replaceChildren(); gallery.replaceChildren();
    opener?.focus({ preventScroll: true });
    openTile = null; openSource = null;
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
