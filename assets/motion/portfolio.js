(() => {
  // One continuous film sits behind the whole page. Scroll position maps to film time
  // section by section; the displayed frame eases toward that time so scrubbing glides.
  const video = document.querySelector('#rover');
  const source = video.querySelector('source');
  const scene = document.querySelector('.scene');
  const opening = document.querySelector('.opening');
  const counter = document.querySelector('#progress');
  const header = document.querySelector('body > header');
  const journeyStage = document.querySelector('.journey-stage');
  const toggle = document.querySelector('#motion-toggle');
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  // Film time where Home, Journey, Projects and About begin, then the film's end.
  const CUTS = [0, 8, 18, 24, 30];
  // Overlay strength over film time: none on the white studio, deeper over busy footage.
  const SCRIM = [[0, 0], [6.5, 0], [9, .22], [17, .22], [19, .36], [23, .36], [25, .12], [30, .18]];
  const frameDuration = 1 / 24;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const smooth = value => value * value * (3 - 2 * value);
  let enabled = false, manualReduce = false, raf = 0, shown = 0, last = 0, entrance = [];

  function boundaries() {
    const top = selector => document.querySelector(selector).getBoundingClientRect().top + scrollY;
    const end = Math.max(0, document.documentElement.scrollHeight - innerHeight);
    const contact = Math.max(top('#projects'), end - document.querySelector('#contact').offsetHeight);
    return [0, top('#experience'), top('#projects'), contact, end];
  }
  function filmTime() {
    const b = boundaries();
    const y = clamp(scrollY, 0, b[4]);
    let i = 0;
    while (i < 3 && y >= b[i + 1]) i++;
    const span = b[i + 1] - b[i];
    return CUTS[i] + (span > 0 ? clamp((y - b[i]) / span, 0, 1) : 1) * (CUTS[i + 1] - CUTS[i]);
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
    header.style.opacity = String(smooth(home));
    scene.style.setProperty('--home-ui', String(smooth(home)));
    counter.textContent = `${String(Math.round(t / CUTS[4] * 100)).padStart(2, '0')} / 100`;
    // Journey UI arrives with the stage and leaves before the stage scrolls away.
    const rect = journeyStage.parentElement.getBoundingClientRect();
    const arrive = clamp((innerHeight * .85 - rect.top) / (innerHeight * .6), 0, 1);
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
    const reduced = preference.matches || manualReduce;
    document.body.classList.toggle('motion-reduced', reduced);
    if (reduced) { entrance.forEach(animation => animation.cancel()); entrance = []; }
    enabled = Number.isFinite(video.duration) && !reduced && !video.error;
    document.body.classList.toggle('motion-ready', enabled);
    toggle.setAttribute('aria-pressed', String(reduced));
    toggle.textContent = reduced ? 'Motion reduced' : 'Reduce motion';
    if (!enabled) {
      video.pause();
      [opening, header].forEach(element => { element.style.opacity = ''; element.style.transform = ''; });
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
  // Smaller screens get the lighter 720p cut.
  source.src = matchMedia('(max-width: 900px)').matches ? source.dataset.srcSmall : source.dataset.src;
  video.load();
  video.addEventListener('loadedmetadata', configure);
  video.addEventListener('seeked', schedule);
  // The film is only ever scrubbed; a play() used to prime decoding must never keep running.
  video.addEventListener('playing', () => { if (enabled) video.pause(); schedule(); });
  video.addEventListener('error', configure);
  source.addEventListener('error', configure);
  preference.addEventListener('change', configure);
  toggle.addEventListener('click', () => { manualReduce = !manualReduce; configure(); });
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { entrance.forEach(animation => animation.cancel()); entrance = []; }
    else { last = 0; schedule(); }
  });
  configure();

  // Reveal blocks of the later sections as they scroll into view, and hide them again on the way out.
  const reveal = new IntersectionObserver(entries => entries.forEach(entry =>
    entry.target.classList.toggle('in-view', entry.isIntersecting)), { rootMargin: '0px 0px -8% 0px', threshold: .08 });
  document.querySelectorAll('.projects-intro, .projects-controls, .project-tile, .projects-bottom, .contact-panel > section, .contact-bottom')
    .forEach((element, i) => { element.classList.add('reveal'); element.style.setProperty('--reveal-delay', `${(i % 3) * 70}ms`); reveal.observe(element); });

  if (!preference.matches && scrollY < innerHeight * .1) {
    const ease = 'cubic-bezier(.16,1,.3,1)';
    entrance = [
      opening.querySelector('h1').animate([
        { opacity: .25, clipPath: 'inset(0 0 25% 0)' },
        { opacity: 1, clipPath: 'inset(0)' }
      ], { duration: 650, easing: ease }),
      ...[opening.querySelector('.intro'), opening.querySelector('.scroll-link'), opening.querySelector('.hero-topics')].map((element, i) =>
        element.animate([{ opacity: .35 }, { opacity: 1 }], { duration: 350, delay: 100 + i * 65, easing: ease }))
    ];
  }
})();
