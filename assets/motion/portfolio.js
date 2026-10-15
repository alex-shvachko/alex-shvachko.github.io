(() => {
  // One continuous film sits behind the whole page. Scroll position maps to film time
  // section by section; the displayed frame eases toward that time so scrubbing glides.
  const video = document.querySelector('#rover');
  const source = video.querySelector('source');
  const scene = document.querySelector('.scene');
  const opening = document.querySelector('.opening');
  const counter = document.querySelector('#progress');
  const journeyStage = document.querySelector('.journey-stage');
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const FILM_END = 30;
  // The God and Adam frame the film holds on while the projects are browsed.
  const HOLD = 23.2;
  // Overlay strength over film time: none on the white studio, deeper over busy footage.
  const SCRIM = [[0, 0], [6.5, 0], [9, .22], [17, .22], [19, .3], [HOLD, .3], [25, .12], [30, .18]];
  const frameDuration = 1 / 24;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const smooth = value => value * value * (3 - 2 * value);
  let enabled = false, raf = 0, shown = 0, last = 0, entrance = [];

  // Scroll position -> film time keys. Home plays the studio and forest, the pinned Journey
  // plays the aerial path, God and Adam form as Projects rises and then hold while the grid
  // is browsed, and the sky opens into space through the gap before About.
  function keys() {
    const projects = document.querySelector('#projects');
    const top = element => element.getBoundingClientRect().top + scrollY;
    const vh = innerHeight;
    const start = top(projects), end = Math.max(0, document.documentElement.scrollHeight - vh);
    const list = [[0, 0], [top(document.querySelector('#experience')), 8], [start - vh, 17.5],
      [start - vh * .15, HOLD], [start + projects.offsetHeight - vh * .55, HOLD + .3], [end, FILM_END]];
    for (let i = 1; i < list.length; i++) list[i][0] = Math.max(list[i][0], list[i - 1][0]);
    return list;
  }
  function filmTime() {
    const list = keys();
    const y = clamp(scrollY, 0, list[list.length - 1][0]);
    for (let i = 1; i < list.length; i++) {
      const [y0, t0] = list[i - 1], [y1, t1] = list[i];
      if (y <= y1) return y1 > y0 ? t0 + (t1 - t0) * (y - y0) / (y1 - y0) : t1;
    }
    return FILM_END;
  }
  function scrimAt(t) {
    for (let i = 1; i < SCRIM.length; i++) {
      const [t1, v1] = SCRIM[i], [t0, v0] = SCRIM[i - 1];
      if (t <= t1) return v0 + (v1 - v0) * smooth(clamp((t - t0) / (t1 - t0), 0, 1));
    }
    return SCRIM[SCRIM.length - 1][1];
  }
  function paintUI(t) {
    // Home UI leaves as the forest starts to grow.
    const home = clamp(1 - scrollY / (innerHeight * .45), 0, 1);
    opening.style.opacity = String(smooth(home));
    opening.style.transform = `translateY(${(1 - home) * -40}px)`;
    opening.inert = home === 0;
    scene.style.setProperty('--home-ui', String(smooth(home)));
    counter.textContent = `${String(Math.round(t / FILM_END * 100)).padStart(2, '0')} / 100`;
    // Journey UI arrives with the stage and leaves before the stage scrolls away.
    const rect = journeyStage.parentElement.getBoundingClientRect();
    // Arrives as the camera lifts into the aerial shot rather than over the forest floor.
    const arrive = clamp((innerHeight * .35 - rect.top) / (innerHeight * .55), 0, 1);
    const leave = clamp((rect.bottom - innerHeight * .35) / (innerHeight * .5), 0, 1);
    const journey = smooth(Math.min(arrive, leave));
    journeyStage.style.setProperty('--journey-ui', String(journey));
    journeyStage.style.setProperty('--journey-shift', `${(arrive < 1 ? 1 - arrive : leave - 1) * 36}px`);
    scene.style.setProperty('--scrim', scrimAt(t).toFixed(3));
  }
  function frame(now) {
    raf = 0;
    if (!enabled || document.hidden) return;
    if (!video.paused) video.pause();
    const target = filmTime();
    const dt = last ? Math.min(64, now - last) : 16;
    last = now;
    shown += (target - shown) * (1 - Math.exp(-dt / 110));
    if (Math.abs(target - shown) < frameDuration / 4) shown = target;
    const snapped = Math.round(clamp(shown, 0, video.duration - frameDuration) / frameDuration) * frameDuration;
    if (!video.seeking && video.readyState >= 1 && Math.abs(video.currentTime - snapped) > frameDuration / 2) video.currentTime = snapped;
    paintUI(shown);
    if (shown !== target || video.seeking) schedule();
    else last = 0;
  }
  function schedule() {
    if (!raf) raf = requestAnimationFrame(frame);
  }
  function configure() {
    const reduced = preference.matches;
    document.body.classList.toggle('motion-reduced', reduced);
    if (reduced) { entrance.forEach(animation => animation.cancel()); entrance = []; }
    enabled = Number.isFinite(video.duration) && !reduced && !video.error;
    document.body.classList.toggle('motion-ready', enabled);
    if (!enabled) {
      video.pause();
      opening.style.opacity = ''; opening.style.transform = '';
      opening.inert = false;
      scene.style.removeProperty('--home-ui');
      scene.style.removeProperty('--scrim');
      journeyStage.style.removeProperty('--journey-ui');
      journeyStage.style.removeProperty('--journey-shift');
      counter.textContent = 'EXPLORE AT YOUR PACE';
      return;
    }
    shown = filmTime();
    video.play().then(() => { video.pause(); schedule(); }).catch(schedule);
    schedule();
  }
  // Smaller screens get the lighter 720p cut; 4K-class displays get the 2160p cut unless data is saved.
  const devicePixels = Math.max(screen.width, screen.height) * devicePixelRatio;
  source.src = matchMedia('(max-width: 900px)').matches ? source.dataset.srcSmall
    : devicePixels >= 2560 && !navigator.connection?.saveData ? source.dataset.srcLarge : source.dataset.src;
  video.load();
  video.addEventListener('loadedmetadata', configure);
  video.addEventListener('seeked', schedule);
  // The film is only ever scrubbed; a play() used to prime decoding must never keep running.
  video.addEventListener('playing', () => { if (enabled) video.pause(); schedule(); });
  video.addEventListener('error', configure);
  source.addEventListener('error', configure);
  preference.addEventListener('change', configure);
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { entrance.forEach(animation => animation.cancel()); entrance = []; }
    else { last = 0; schedule(); }
  });
  configure();

  // Reveal blocks of the later sections as they scroll into view, and hide them again on the way out.
  // Headings wait until the film has settled behind them; tiles cascade in reading order.
  const toggleView = entries => entries.forEach(entry => entry.target.classList.toggle('in-view', entry.isIntersecting));
  const late = new IntersectionObserver(toggleView, { rootMargin: '0px 0px -28% 0px', threshold: 0 });
  const early = new IntersectionObserver(toggleView, { rootMargin: '0px 0px -8% 0px', threshold: .08 });
  document.querySelectorAll('.projects-intro, .projects-controls, .contact-panel > section, .contact-bottom').forEach((element, i) => {
    element.classList.add('reveal'); element.style.setProperty('--reveal-delay', `${(i % 3) * 110}ms`); late.observe(element);
  });
  document.querySelectorAll('.project-tile, .projects-bottom').forEach((element, i) => {
    element.classList.add('reveal'); element.style.setProperty('--reveal-delay', `${(i % 3) * 90}ms`); early.observe(element);
  });

  if (!preference.matches && scrollY < innerHeight * .1) {
    const ease = 'cubic-bezier(.16,1,.3,1)';
    // Headline rises out of a slot, the spark snaps on, then the copy and caption settle in.
    // The topic callouts follow from connectors.js once the headline has landed.
    const rise = (element, delay) => element.animate([
      { opacity: 0, translate: '0 26px', filter: 'blur(8px)' },
      { opacity: 1, translate: '0 0', filter: 'blur(0)' }
    ], { duration: 900, delay, easing: ease, fill: 'backwards' });
    entrance = [
      opening.querySelector('h1').animate([
        { clipPath: 'inset(100% -10% -10% -10%)', translate: '0 48px' },
        { clipPath: 'inset(-10% -10% -10% -10%)', translate: '0 0' }
      ], { duration: 1100, easing: ease, fill: 'backwards' }),
      opening.querySelector('.spark').animate([
        { opacity: 0, scale: '0' },
        { opacity: 1, scale: '1' }
      ], { duration: 650, delay: 700, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'backwards' }),
      rise(opening.querySelector('.intro'), 320),
      rise(opening.querySelector('.scroll-link'), 450),
      rise(scene.querySelector('.scene-caption'), 900)
    ];
  }
})();
