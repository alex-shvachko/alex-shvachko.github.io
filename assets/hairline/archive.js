(() => {
  // The project archive: the tray of folders from hairline's Riffle, drawn here at full size,
  // one tray per category standing in a row that slides to the chosen category; the first tray
  // holds every project. Each folder wears its project's picture. In the tray in front, the
  // folder under the pointer (or chosen with the arrow keys) stands up out of the tray and plays
  // its preview; a click opens the project. A click on a tray at the side, or a swipe, brings that
  // tray in front. It reads the projects from the tiles and follows the filter and sort (projects.js).
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
  const filters = [...section.querySelectorAll('.project-filters [data-filter]')];

  // Folders: W wide, H tall with a TW × TH tab, G apart; the picture is a 16:9 window on the face.
  const MAX = 11, W = 120, H = 70, G = 13, TW = 30, TH = 8, TABS = [10, 45, 80], TK = 1.4;
  const REST = -12, BACK = -22, FWD = 18, LIFT = 50, STAGGER = 36, ARRIVE = 240;
  const IMG = { u0: 8, u1: 112, v0: 6, v1: 64.5 }, BW = 160, BH = 90;
  const X0 = -6, X1 = W + 6, Y0 = -10, Y1 = (MAX - 1) * G + 10, WH = 24, WR = 8, WT = 2.6;
  // The camera turns a little further round than the world's, so the folders' faces open toward the viewer.
  const C = Cam(30, .5, 1), P = proj(C), front = facing(C);
  const LR = pts => (pts[0][0] <= pts[pts.length - 1][0] ? pts : pts.slice().reverse());

  // ---- the fixed parts: frame and trays --------------------------------------------------
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
  stage.style.setProperty('--archive-ratio', (VB[2] / VB[3]).toFixed(4));

  // Every tray is drawn alike: its lines behind the folders, and its front wall over them.
  const outer = rrect(X0, Y0, X1, Y1, WR, 6), inner = rrect(X0 + WT, Y0 + WT, X1 - WT, Y1 - WT, WR - WT, 6);
  const FAR = [
    [poly(hull(ringAt(P, outer, 0).concat(ringAt(P, outer, WH)))), 'sil'],
    [poly(ringAt(P, inner, WH)), 'nf'],
    [open(ringAt(P, run(inner, q => !front(q)), 2.5)), 'nf lo']
  ];
  const NEAR = (() => {
    const iF = LR(ringAt(P, run(inner, front), WH)), oT = LR(ringAt(P, run(outer, front), WH)), oB = LR(ringAt(P, run(outer, front), 0));
    const hx = (X0 + X1) / 2, onFront = ring => ring.map(q => P(q.u, Y1, q.v));
    return [
      [poly([...iF, oT[oT.length - 1], ...oB.slice().reverse(), oT[0]]), 'fo'],
      [open(oT), 'nf lo'],
      [open(iF), 'nf'],
      [open([oT[0], ...oB, oT[oT.length - 1]]), 'nf sil'],
      [poly(onFront(rrect(hx - 14, 8, hx + 14, 15.5, 3.5, 5))), 'nf'],
      [poly(onFront(rrect(hx - 12, 9.8, hx + 12, 13.7, 1.8, 5))), 'nf lo']
    ];
  })();
  // The tray's category and count are lettered on its front wall, either side of the handle:
  // text x runs along the wall and text y down it.
  const o = P(0, Y1, 0), eu = P(1, Y1, 0), ed = P(0, Y1, -1);
  const LETTERING = `matrix(${[eu[0] - o[0], eu[1] - o[1], ed[0] - o[0], ed[1] - o[1], o[0], o[1]].map(v => v.toFixed(4)).join(' ')})`;

  const track = document.createElement('div');
  track.className = 'archive-track';
  stage.insertBefore(track, frame);
  const trays = filters.map((button, index) => {
    const category = button.dataset.filter;
    const el = document.createElement('div');
    el.className = 'archive-tray';
    el.style.setProperty('--i', index);
    track.append(el);
    const svg = mk('svg', { viewBox: VB.map(v => v.toFixed(2)).join(' '), 'aria-hidden': 'true', focusable: 'false' }, el);
    // A faint aliased speck keeps Chrome from multisampling the trays' layer (see world.js).
    mk('rect', { class: 'speck', x: VB[0], y: VB[1], width: .4, height: .4, 'shape-rendering': 'crispEdges' }, svg);
    const far = mk('g', {}, svg);
    FAR.forEach(([d, cls]) => mk('path', { d, class: cls }, far));
    const cardsG = mk('g', {}, svg);
    const near = mk('g', {}, svg);
    NEAR.forEach(([d, cls]) => mk('path', { d, class: cls }, near));
    const label = mk('g', { transform: LETTERING, class: 'label' }, near);
    mk('text', { x: X0 + 8, y: -10.6 }, label).textContent = category === 'All' ? 'ALL' : category.toUpperCase();
    const count = mk('text', { x: X1 - 8, y: -10.6, 'text-anchor': 'end' }, label);
    return { index, category, el, cardsG, count, items: [], folders: [], active: -1, slot: () => 0 };
  });

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
  // cur is the tray in front: the only one whose folders stand up, take input and show the preview.
  let cur = trays.find(tray => filters[tray.index].getAttribute('aria-pressed') === 'true') || trays[0], shown = false;
  const matrix = (TL, TR, BL, w, h) => [(TR[0] - TL[0]) / w, (TR[1] - TL[1]) / w, (BL[0] - TL[0]) / h, (BL[1] - TL[1]) / h, TL[0], TL[1]];

  function build(tray, list, entering) {
    const items = tray.items = list.map(read);
    const n = items.length;
    // Folders fill the tray from the front; fewer of them stand further apart.
    const gap = n > 1 ? Math.min(G * 1.9, (MAX - 1) * G / (n - 1)) : 0;
    tray.slot = k => (MAX - 1) * G - (n - 1 - k) * gap;
    tray.cardsG.replaceChildren();
    const now = performance.now();
    tray.folders = items.map((item, idx) => {
      const k = n - 1 - idx, t0 = TABS[idx % 3];
      const shape = fillet([[0, 0], [W, 0], [W, H], [t0 + TW, H], [t0 + TW, H + TH], [t0, H + TH], [t0, H], [0, H]], [1.2, 1.2, 3.6, 2, 2.6, 2.6, 2, 3.6]);
      const g = mk('g', {}, tray.cardsG);
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
    tray.folders.slice().sort((p, q) => p.k - q.k).forEach(f => tray.cardsG.append(f.g));
    if (shown) tray.folders.forEach(f => f.image.setAttribute('href', f.item.image));
    tray.count.textContent = `${String(n).padStart(2, '0')} ${n === 1 ? 'PROJECT' : 'PROJECTS'}`;
    tray.active = -1;
  }

  function draw(tray, f, now) {
    const th = tval(f.a, now), lift = tval(f.z, now), key = `${th.toFixed(3)} ${lift.toFixed(3)}`;
    if (key === f.drawn) return;
    f.drawn = key;
    const { w, wb } = pose(tray.slot(f.k), th, lift);
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
  // so it stays sharp and can play. It rides in the tray in front and shows once the folder has
  // risen clear of the others.
  // The stage's width comes from its observer; reading it in the loop would lay the page out.
  let frameKey = '', stageWidth = stage.clientWidth;
  function placeFrame(now) {
    const f = cur.folders[cur.active];
    if (!f) { frame.style.opacity = '0'; return; }
    const lift = tval(f.z, now), th = tval(f.a, now);
    const { w } = pose(cur.slot(f.k), th, lift);
    const k = stageWidth / VB[2];
    const px = q => [(q[0] - VB[0]) * k, (q[1] - VB[1]) * k];
    const m = matrix(px(w(IMG.u0, IMG.v1)), px(w(IMG.u1, IMG.v1)), px(w(IMG.u0, IMG.v0)), 320, 180);
    const key = m.map(v => v.toFixed(3)).join(',');
    if (key !== frameKey) { frameKey = key; frame.style.transform = `matrix(${key})`; }
    frame.style.opacity = String(clamp((lift / LIFT - .82) / .18, 0, 1));
  }

  const loop = register(stage, (_dt, now) => {
    let moving = false;
    trays.forEach(tray => tray.folders.forEach(f => { draw(tray, f, now); if (!tdone(f.a, now) || !tdone(f.z, now)) moving = true; }));
    placeFrame(now);
    return moving;
  });

  // Each project's picture and video are made once and kept, so passing over the folders again
  // never reloads the picture or starts a new decoder; the video leaving pauses.
  const previews = new Map();
  function fillFrame(item) {
    let nodes = previews.get(item.tile);
    if (!nodes) {
      const img = document.createElement('img');
      img.src = item.image; img.alt = ''; img.decoding = 'async';
      nodes = [img];
      if (item.video) {
        const video = document.createElement('video');
        video.src = item.video; video.muted = true; video.loop = true; video.playsInline = true; video.preload = 'auto';
        video.setAttribute('aria-hidden', 'true');
        nodes.push(video);
      }
      previews.set(item.tile, nodes);
    }
    frame.querySelectorAll('video').forEach(video => video.pause());
    const shown = nodes.filter(node => node.tagName === 'IMG' || !reducedQuery.matches);
    frame.replaceChildren(...shown);
    shown.forEach(node => { if (node.tagName === 'VIDEO') node.play().catch(() => {}); });
  }

  /** Pulls folder a of the tray in front (0 = its front folder) after wait ms; the stagger spreads out from it. */
  function setActive(a, announce, wait = 0) {
    const { items, folders } = cur;
    a = clamp(a, 0, items.length - 1);
    if (a === cur.active || !folders[a]) return;
    const now = performance.now(), ka = folders[a].k;
    cur.active = a;
    folders.forEach(f => {
      const delay = wait + Math.abs(f.k - ka) * STAGGER;
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

  /** Lays a tray's folders back down as it slides out of the way. */
  function rest(tray) {
    const now = performance.now(), ka = tray.folders[tray.active]?.k ?? 0;
    tray.folders.forEach(f => {
      const delay = Math.abs(f.k - ka) * STAGGER / 2;
      tset(f.a, REST, now, delay);
      tset(f.z, 0, now, delay);
      f.face.classList.remove('hi');
      f.punch[f.no].setAttribute('class', 'dot m');
    });
    tray.active = -1;
  }

  /** Slides the row to a tray; the folder that was out stays out if that tray has it. */
  function bring(tray) {
    if (tray === cur) return;
    const keep = cur.items[cur.active]?.tile;
    rest(cur);
    cur.el.classList.remove('is-front');
    cur = tray;
    show();
    const again = cur.items.findIndex(item => item.tile === keep);
    setActive(again >= 0 ? again : 0, false, ARRIVE);
  }
  function show() {
    cur.el.classList.add('is-front');
    cur.el.append(frame);
    track.style.setProperty('--at', cur.index);
  }

  function openActive() {
    const item = cur.items[cur.active];
    if (item) section.dispatchEvent(new CustomEvent('archive:open', { detail: { tile: item.tile, source: frame, opener: stage } }));
  }

  // ---- input: the pointer picks by the folders' resting top edges, which never move ----------
  function toView(e) {
    const r = cur.el.getBoundingClientRect();
    return [VB[0] + (e.clientX - r.left) / r.width * VB[2], VB[1] + (e.clientY - r.top) / r.height * VB[3]];
  }
  function hit(q) {
    if (!cur.folders.length) return -1;
    const row = (() => { const a = P(0, 0, 0), b = P(0, 1, 0), l = Math.hypot(b[0] - a[0], b[1] - a[1]); return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; })();
    const across = (() => { const a = P(0, 0, 0), b = P(1, 0, 0), l = Math.hypot(b[0] - a[0], b[1] - a[1]); return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; })();
    let best = -1, bd = Infinity;
    cur.folders.forEach((f, idx) => {
      const top = P(W / 2, cur.slot(f.k) + H * Math.sin(rad(REST)), H * Math.cos(rad(REST)));
      const dx = q[0] - top[0], dy = q[1] - top[1];
      const along = Math.abs(dx * row[0] + dy * row[1]), side = Math.abs(dx * across[0] + dy * across[1]);
      if (side < W * .62 && along < bd) { bd = along; best = idx; }
    });
    return best;
  }
  const trayAt = e => trays.find(tray => tray.el.contains(e.target));
  // A tray at the side is brought in front through its filter button, so the filter, the grid
  // and the count stay in step.
  const choose = tray => filters[tray.index].click();
  // Mouse and pen pick by hovering and open with a click; a finger picks with a tap, opens with a
  // second tap, and drags the row sideways to the next tray.
  let lastType = 'mouse', touch = null;
  function drag(e) {
    const dx = touch.dx = e.clientX - touch.x;
    if (!touch.side && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(e.clientY - touch.y)) {
      touch.side = true;
      track.classList.add('is-dragging');
    }
    // Past the first or last tray the row gives only a little.
    if (touch.side) track.style.setProperty('--drag', `${(trays[cur.index - Math.sign(dx)] ? dx : dx / 3).toFixed(1)}px`);
  }
  function letGo() {
    track.classList.remove('is-dragging');
    track.style.setProperty('--drag', '0px');
  }
  stage.addEventListener('pointermove', e => {
    if (touch && e.pointerId === touch.id) { drag(e); return; }
    if ((e.pointerType === 'mouse' || e.pointerType === 'pen') && trayAt(e) === cur) { const a = hit(toView(e)); if (a >= 0) setActive(a); }
  });
  stage.addEventListener('pointerdown', e => {
    lastType = e.pointerType;
    if (e.pointerType === 'touch') touch = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, side: false };
  });
  stage.addEventListener('pointerup', e => {
    if (!touch || e.pointerId !== touch.id) return;
    const { dx, side } = touch;
    touch = null;
    if (side) {
      letGo();
      const next = trays[cur.index - Math.sign(dx)];
      if (next && Math.abs(dx) > Math.min(90, stage.clientWidth * .2)) choose(next);
      return;
    }
    const tray = trayAt(e);
    if (tray && tray !== cur) { choose(tray); return; }
    const a = hit(toView(e));
    if (a < 0) return;
    if (a === cur.active) openActive(); else setActive(a, true);
  });
  stage.addEventListener('pointercancel', e => {
    if (!touch || e.pointerId !== touch.id) return;
    if (touch.side) letGo();
    touch = null;
  });
  stage.addEventListener('click', e => {
    if (lastType === 'touch') return;
    const tray = trayAt(e);
    if (tray && tray !== cur) { choose(tray); return; }
    const a = hit(toView(e));
    if (a >= 0) { setActive(a); openActive(); }
  });
  stage.addEventListener('keydown', e => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (step) { e.preventDefault(); setActive(cur.active + step, true); }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0, true); }
    else if (e.key === 'End') { e.preventDefault(); setActive(cur.items.length - 1, true); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openActive(); }
  });
  caption.open.addEventListener('click', openActive);

  // The sort refills every tray (the one in front drops its folders in again) and the filter
  // slides the row to its category's tray.
  function fill(tiles, entering) {
    const keep = cur.items[cur.active]?.tile;
    trays.forEach(tray => build(tray, tiles.filter(tile => tray.category === 'All' || tile.dataset.category === tray.category), entering && tray === cur));
    const again = cur.items.findIndex(item => item.tile === keep);
    setActive(again >= 0 ? again : 0);
  }
  let order = allTiles.map(tile => tile.dataset.order).join();
  section.addEventListener('projects:render', e => {
    const key = e.detail.tiles.map(tile => tile.dataset.order).join();
    if (key !== order) { order = key; fill(e.detail.tiles, true); }
    bring(trays.find(tray => tray.category === e.detail.category) || trays[0]);
  });
  // The pulled folder's video plays only while the archive is on screen; scrolled away, it would
  // keep a decoder busy for nothing.
  new IntersectionObserver(([entry]) => {
    frame.querySelectorAll('video').forEach(video => {
      if (!entry.isIntersecting) video.pause();
      else if (!reducedQuery.matches && !document.documentElement.classList.contains('project-modal-open')) video.play().catch(() => {});
    });
  }).observe(stage);
  // Pictures load only once the archive comes near the viewport.
  new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting || shown) return;
    shown = true;
    trays.forEach(tray => tray.folders.forEach(f => f.image.setAttribute('href', f.item.image)));
  }, { rootMargin: '400px 0px' }).observe(stage);
  new ResizeObserver(() => { stageWidth = stage.clientWidth; frameKey = ''; loop.wake(); }).observe(stage);
  reducedQuery.addEventListener('change', () => { const a = cur.active; cur.active = -1; setActive(a < 0 ? 0 : a); });

  show();
  fill(allTiles, false);
})();
