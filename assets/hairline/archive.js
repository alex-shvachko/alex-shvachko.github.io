(() => {
  // The project archive: the tray of folders from hairline's Riffle, drawn here at full size
  // with each project's picture on its folder. The folder under the pointer (or chosen with
  // the arrow keys) stands up out of the tray and plays its preview; a click opens the project.
  // It reads the projects from the tiles and follows the filter and sort (projects.js).
  if (!window.HL) return;
  const { Cam, proj, facing, rrect, ringAt, run, hull, poly, open, fillet, rad, clamp, tween, tset, tval, tdone, mk, register } = HL;
  const section = document.querySelector('#projects');
  const root = section && section.querySelector('.archive');
  if (!root) return;
  const stage = root.querySelector('.archive-stage');
  const frame = root.querySelector('.archive-preview');
  const live = root.querySelector('#archive-live');
  const caption = {
    count: root.querySelector('.archive-count'), category: root.querySelector('.archive-category'),
    title: root.querySelector('.archive-title'), sub: root.querySelector('.archive-sub'),
    open: root.querySelector('.archive-open')
  };
  const reducedQuery = matchMedia('(prefers-reduced-motion: reduce)');
  const allTiles = [...section.querySelectorAll('.project-tile')];

  // Folders: W wide, H tall with a TW × TH tab, G apart; the picture is a 16:9 window on the face.
  const MAX = 11, W = 120, H = 70, G = 13, TW = 30, TH = 8, TABS = [10, 45, 80], TK = 1.4;
  const REST = -12, BACK = -22, FWD = 18, LIFT = 50, STAGGER = 36;
  const IMG = { u0: 8, u1: 112, v0: 6, v1: 64.5 }, BW = 160, BH = 90;
  const X0 = -6, X1 = W + 6, Y0 = -10, Y1 = (MAX - 1) * G + 10, WH = 24, WR = 8, WT = 2.6;
  // The camera turns a little further round than the world's, so the folders' faces open toward the viewer.
  const C = Cam(30, .5, 1), P = proj(C), front = facing(C);
  const LR = pts => (pts[0][0] <= pts[pts.length - 1][0] ? pts : pts.slice().reverse());

  // ---- the fixed parts: frame and tray ---------------------------------------------------
  const svg = mk('svg', { 'aria-hidden': 'true', focusable: 'false' }, stage);
  stage.insertBefore(svg, frame);
  const pose = (y, th, lift) => {
    const s = Math.sin(rad(th)), c = Math.cos(rad(th));
    return { w: (u, v) => P(u, y + v * s, v * c + lift), wb: (u, v) => P(u, y + v * s - TK * c, v * c + TK * s + lift) };
  };
  // The view is fitted to every pose a folder can take, so nothing ever leaves the frame.
  let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
  const grow = ([x, y]) => { bx0 = Math.min(bx0, x); by0 = Math.min(by0, y); bx1 = Math.max(bx1, x); by1 = Math.max(by1, y); };
  for (let i = 0; i < MAX; i++) for (const th of [REST, BACK, FWD, 0]) for (const lift of [0, LIFT]) {
    const { w } = pose(i * G, th, lift);
    [[0, 0], [W, 0], [W, H + TH], [0, H + TH]].forEach(([u, v]) => grow(w(u, v)));
  }
  [[X0, Y0], [X1, Y0], [X0, Y1], [X1, Y1]].forEach(([x, y]) => { grow(P(x, y, 0)); grow(P(x, y, WH)); });
  const PAD = 6, VB = [bx0 - PAD, by0 - PAD, bx1 - bx0 + PAD * 2, by1 - by0 + PAD * 2];
  svg.setAttribute('viewBox', VB.map(v => v.toFixed(2)).join(' '));
  stage.style.setProperty('--archive-ratio', (VB[2] / VB[3]).toFixed(4));

  const outer = rrect(X0, Y0, X1, Y1, WR, 6), inner = rrect(X0 + WT, Y0 + WT, X1 - WT, Y1 - WT, WR - WT, 6);
  const far = mk('g', {}, svg);
  mk('path', { d: poly(hull(ringAt(P, outer, 0).concat(ringAt(P, outer, WH)))), class: 'sil' }, far);
  mk('path', { d: poly(ringAt(P, inner, WH)), class: 'nf' }, far);
  mk('path', { d: open(ringAt(P, run(inner, q => !front(q)), 2.5)), class: 'nf lo' }, far);
  const cardsG = mk('g', {}, svg);
  const near = mk('g', {}, svg);
  {
    const iF = LR(ringAt(P, run(inner, front), WH)), oT = LR(ringAt(P, run(outer, front), WH)), oB = LR(ringAt(P, run(outer, front), 0));
    const hx = (X0 + X1) / 2, onFront = ring => ring.map(q => P(q.u, Y1, q.v));
    mk('path', { d: poly([...iF, oT[oT.length - 1], ...oB.slice().reverse(), oT[0]]), class: 'fo' }, near);
    mk('path', { d: open(oT), class: 'nf lo' }, near);
    mk('path', { d: open(iF), class: 'nf' }, near);
    mk('path', { d: open([oT[0], ...oB, oT[oT.length - 1]]), class: 'nf sil' }, near);
    mk('path', { d: poly(onFront(rrect(hx - 14, 8, hx + 14, 15.5, 3.5, 5))), class: 'nf' }, near);
    mk('path', { d: poly(onFront(rrect(hx - 12, 9.8, hx + 12, 13.7, 1.8, 5))), class: 'nf lo' }, near);
  }

  // ---- the folders ---------------------------------------------------------------------------
  const read = tile => ({
    tile,
    number: tile.querySelector('.project-number').textContent.trim(),
    title: tile.querySelector('h3').textContent.trim(),
    sub: tile.querySelector('.project-meta p').textContent.trim(),
    category: tile.dataset.category,
    image: tile.querySelector('img').getAttribute('src'),
    video: tile.querySelector('video')?.getAttribute('src') || null
  });
  let items = [], folders = [], active = -1, slot = () => 0, shown = false;
  const matrix = (TL, TR, BL, w, h) => [(TR[0] - TL[0]) / w, (TR[1] - TL[1]) / w, (BL[0] - TL[0]) / h, (BL[1] - TL[1]) / h, TL[0], TL[1]];

  function build(list, entering) {
    items = list.map(read);
    const n = items.length;
    // Folders fill the tray from the front; fewer of them stand further apart.
    const gap = n > 1 ? Math.min(G * 1.9, (MAX - 1) * G / (n - 1)) : 0;
    slot = k => (MAX - 1) * G - (n - 1 - k) * gap;
    cardsG.replaceChildren();
    const now = performance.now();
    folders = items.map((item, idx) => {
      const k = n - 1 - idx, t0 = TABS[idx % 3];
      const shape = fillet([[0, 0], [W, 0], [W, H], [t0 + TW, H], [t0 + TW, H + TH], [t0, H + TH], [t0, H], [0, H]], [1.2, 1.2, 3.6, 2, 2.6, 2.6, 2, 3.6]);
      const g = mk('g', {}, cardsG);
      const back = mk('path', { class: 'lo' }, g), face = mk('path', { class: 'sil' }, g);
      const image = mk('image', { width: BW, height: BH, preserveAspectRatio: 'xMidYMid slice' }, g);
      const window_ = mk('path', { class: 'nf' }, g);
      // The project's number is punched on the tab, one hole of twelve, as in Riffle.
      const punch = [];
      const no = clamp(Number(item.number) - 1 || 0, 0, 11);
      for (let p = 0; p < 12; p++) punch.push(mk('circle', { r: .95, class: p === no ? 'dot m' : 'dot off' }, g));
      const a = tween(REST), z = tween(entering ? 34 : 0);
      if (entering) tset(z, 0, now, 80 + idx * STAGGER);
      return { item, k, t0, shape, g, back, face, image, window: window_, punch, no, a, z, drawn: '' };
    });
    // Back to front in the paint order: the front folder is the first project.
    folders.slice().sort((p, q) => p.k - q.k).forEach(f => cardsG.append(f.g));
    if (shown) folders.forEach(f => f.image.setAttribute('href', f.item.image));
    active = -1;
  }

  function draw(f, now) {
    const th = tval(f.a, now), lift = tval(f.z, now), key = `${th.toFixed(3)} ${lift.toFixed(3)}`;
    if (key === f.drawn) return;
    f.drawn = key;
    const { w, wb } = pose(slot(f.k), th, lift);
    f.back.setAttribute('d', poly(f.shape.map(p => wb(p[0], p[1]))));
    f.face.setAttribute('d', poly(f.shape.map(p => w(p[0], p[1]))));
    const TL = w(IMG.u0, IMG.v1), TR = w(IMG.u1, IMG.v1), BL = w(IMG.u0, IMG.v0), BR = w(IMG.u1, IMG.v0);
    f.image.setAttribute('transform', `matrix(${matrix(TL, TR, BL, BW, BH).map(v => v.toFixed(4)).join(' ')})`);
    f.window.setAttribute('d', poly([TL, TR, BR, BL]));
    f.punch.forEach((dot, p) => {
      const q = w(f.t0 + TW / 2 + ((p % 4) - 1.5) * 5, H + TH / 2 + (1 - Math.floor(p / 4)) * 2.2);
      dot.setAttribute('cx', q[0].toFixed(2)); dot.setAttribute('cy', q[1].toFixed(2));
    });
  }

  // The pulled folder's preview is a real picture (and video) laid onto its face in page pixels,
  // so it stays sharp and can play. It shows once the folder has risen clear of the others.
  let frameKey = '';
  function placeFrame(now) {
    const f = folders[active];
    if (!f) { frame.style.opacity = '0'; return; }
    const lift = tval(f.z, now), th = tval(f.a, now);
    const { w } = pose(slot(f.k), th, lift);
    const k = stage.clientWidth / VB[2];
    const px = q => [(q[0] - VB[0]) * k, (q[1] - VB[1]) * k];
    const m = matrix(px(w(IMG.u0, IMG.v1)), px(w(IMG.u1, IMG.v1)), px(w(IMG.u0, IMG.v0)), 320, 180);
    const key = m.map(v => v.toFixed(3)).join(',');
    if (key !== frameKey) { frameKey = key; frame.style.transform = `matrix(${key})`; }
    frame.style.opacity = String(clamp((lift / LIFT - .82) / .18, 0, 1));
  }

  const loop = register(stage, (_dt, now) => {
    let moving = false;
    folders.forEach(f => { draw(f, now); if (!tdone(f.a, now) || !tdone(f.z, now)) moving = true; });
    placeFrame(now);
    return moving;
  });

  function fillFrame(item) {
    const img = document.createElement('img');
    img.src = item.image; img.alt = ''; img.decoding = 'async';
    const nodes = [img];
    if (item.video && !reducedQuery.matches) {
      const video = document.createElement('video');
      video.src = item.video; video.muted = true; video.loop = true; video.playsInline = true; video.preload = 'auto';
      video.setAttribute('aria-hidden', 'true');
      nodes.push(video);
      video.play().catch(() => {});
    }
    frame.replaceChildren(...nodes);
  }

  /** Pulls folder a (an index into items, 0 = the front one); the stagger spreads out from it. */
  function setActive(a, announce) {
    a = clamp(a, 0, items.length - 1);
    if (a === active || !folders[a]) return;
    const now = performance.now(), ka = folders[a].k;
    active = a;
    folders.forEach(f => {
      const delay = Math.abs(f.k - ka) * STAGGER;
      tset(f.a, f.k < ka ? BACK : f.k > ka ? FWD : 0, now, delay);
      tset(f.z, f.k === ka ? LIFT : 0, now, delay);
      f.face.classList.toggle('hi', f.k === ka);
      f.punch[f.no].setAttribute('class', f.k === ka ? 'dot' : 'dot m');
    });
    const item = items[a];
    caption.count.textContent = `${item.number} / ${String(allTiles.length).padStart(2, '0')}`;
    caption.category.textContent = item.category;
    caption.title.textContent = item.title;
    caption.sub.textContent = item.sub;
    caption.open.setAttribute('aria-label', `Open ${item.title}`);
    fillFrame(item);
    if (announce) live.textContent = `${item.number}, ${item.title}`;
    frameKey = '';
    loop.wake();
  }

  function openActive() {
    const item = items[active];
    if (item) section.dispatchEvent(new CustomEvent('archive:open', { detail: { tile: item.tile, source: frame, opener: stage } }));
  }

  // ---- input: the pointer picks by the folders' resting top edges, which never move ----------
  function toView(e) {
    const r = stage.getBoundingClientRect();
    return [VB[0] + (e.clientX - r.left) / r.width * VB[2], VB[1] + (e.clientY - r.top) / r.height * VB[3]];
  }
  function hit(q) {
    if (!folders.length) return -1;
    const row = (() => { const a = P(0, 0, 0), b = P(0, 1, 0), l = Math.hypot(b[0] - a[0], b[1] - a[1]); return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; })();
    const across = (() => { const a = P(0, 0, 0), b = P(1, 0, 0), l = Math.hypot(b[0] - a[0], b[1] - a[1]); return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; })();
    let best = -1, bd = Infinity;
    folders.forEach((f, idx) => {
      const top = P(W / 2, slot(f.k) + H * Math.sin(rad(REST)), H * Math.cos(rad(REST)));
      const dx = q[0] - top[0], dy = q[1] - top[1];
      const along = Math.abs(dx * row[0] + dy * row[1]), side = Math.abs(dx * across[0] + dy * across[1]);
      if (side < W * .62 && along < bd) { bd = along; best = idx; }
    });
    return best;
  }
  // Mouse and pen pick by hovering and open with a click; a finger picks with a tap and opens with a second tap.
  let lastType = 'mouse';
  stage.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' || e.pointerType === 'pen') { const a = hit(toView(e)); if (a >= 0) setActive(a); } });
  stage.addEventListener('pointerdown', e => {
    lastType = e.pointerType;
    if (e.pointerType !== 'touch') return;
    const a = hit(toView(e));
    if (a < 0) return;
    if (a === active) openActive(); else setActive(a, true);
  });
  stage.addEventListener('click', e => { if (lastType !== 'touch') { const a = hit(toView(e)); if (a >= 0) { setActive(a); openActive(); } } });
  stage.addEventListener('keydown', e => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (step) { e.preventDefault(); setActive(active + step, true); }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0, true); }
    else if (e.key === 'End') { e.preventDefault(); setActive(items.length - 1, true); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openActive(); }
  });
  caption.open.addEventListener('click', openActive);

  // The filter and sort rebuild the tray; the folder that was out stays out if it is still there.
  section.addEventListener('projects:render', e => {
    const keep = items[active]?.tile;
    build(e.detail.tiles, true);
    const again = items.findIndex(item => item.tile === keep);
    setActive(again >= 0 ? again : 0);
  });
  // Pictures load only once the archive comes near the viewport.
  new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting || shown) return;
    shown = true;
    folders.forEach(f => f.image.setAttribute('href', f.item.image));
  }, { rootMargin: '400px 0px' }).observe(stage);
  new ResizeObserver(() => { frameKey = ''; loop.wake(); }).observe(stage);
  reducedQuery.addEventListener('change', () => { const a = active; active = -1; setActive(a < 0 ? 0 : a); });

  build(allTiles.filter(tile => !tile.hidden), false);
  setActive(0);
})();
