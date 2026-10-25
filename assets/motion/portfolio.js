(() => {
  // The page's scroll choreography over the line world (world.js draws and steers the world
  // itself): the hero copy leaves as the camera rises, the Journey stage arrives and leaves
  // with its own drift, and the later sections rise in as they enter.
  const opening = document.querySelector('.opening');
  const cta = opening.querySelector('.scroll-link');
  const journeyStage = document.querySelector('.journey-stage');
  // Only the rover's read-out fades with the home UI; set on <html>, the value would restyle the
  // whole page (the line world included) on every frame of the scroll.
  const readout = document.querySelector('.world-readout');
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const smooth = value => value * value * (3 - 2 * value);
  let enabled = false, raf = 0, entrance = [];

  function paintUI() {
    raf = 0;
    if (!enabled) return;
    // Read layout first, then write, so the frame never forces a second layout.
    const rect = journeyStage.parentElement.getBoundingClientRect();
    // Home UI leaves as the camera starts to rise off the studio.
    const home = clamp(1 - scrollY / (innerHeight * .45), 0, 1);
    opening.style.opacity = String(smooth(home));
    opening.style.transform = `translateY(${(1 - home) * -40}px)`;
    // Only the button leaves the tab order; the heading stays readable to assistive tech.
    cta.inert = home === 0;
    readout.style.setProperty('--home-ui', String(smooth(home)));
    // Journey UI arrives with the aerial view and leaves before the stage scrolls away.
    const arrive = clamp((innerHeight * .35 - rect.top) / (innerHeight * .55), 0, 1);
    const leave = clamp((rect.bottom - innerHeight * .35) / (innerHeight * .5), 0, 1);
    journeyStage.style.setProperty('--journey-ui', String(smooth(Math.min(arrive, leave))));
    journeyStage.style.setProperty('--journey-shift', `${(arrive < 1 ? 1 - arrive : leave - 1) * 36}px`);
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(paintUI); }
  function configure() {
    const reduced = preference.matches;
    document.body.classList.toggle('motion-reduced', reduced);
    if (reduced) { entrance.forEach(animation => animation.cancel()); entrance = []; }
    enabled = !reduced;
    document.body.classList.toggle('motion-ready', enabled);
    if (!enabled) {
      opening.style.opacity = ''; opening.style.transform = '';
      cta.inert = false;
      readout.style.removeProperty('--home-ui');
      journeyStage.style.removeProperty('--journey-ui');
      journeyStage.style.removeProperty('--journey-shift');
      return;
    }
    schedule();
  }
  preference.addEventListener('change', configure);
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { entrance.forEach(animation => animation.cancel()); entrance = []; }
  });
  configure();

  // Reveal blocks of the later sections as they scroll into view, and hide them again on the way out.
  // Headings wait until the world has settled behind them; tiles cascade in reading order.
  const toggleView = entries => entries.forEach(entry => entry.target.classList.toggle('in-view', entry.isIntersecting));
  const late = new IntersectionObserver(toggleView, { rootMargin: '0px 0px -22% 0px', threshold: 0 });
  const early = new IntersectionObserver(toggleView, { rootMargin: '0px 0px -8% 0px', threshold: .08 });
  document.querySelectorAll('.projects-intro, .projects-controls, .contact-signal, .contact-panel > section').forEach((element, i) => {
    element.classList.add('reveal'); element.style.setProperty('--reveal-delay', `${(i % 3) * 110}ms`); late.observe(element);
  });
  document.querySelectorAll('.project-tile').forEach((element, i) => {
    element.classList.add('reveal'); element.style.setProperty('--reveal-delay', `${(i % 3) * 90}ms`); early.observe(element);
  });

  if (!preference.matches && scrollY < innerHeight * .1) {
    const ease = 'cubic-bezier(.16,1,.3,1)';
    // While the world draws the rover, the name rises out of its slot line by line, then the
    // role line and the button settle in. The topic pins follow from connectors.js.
    const rise = (element, delay) => element.animate([
      { opacity: 0, translate: '0 22px', filter: 'blur(8px)' },
      { opacity: 1, translate: '0 0', filter: 'blur(0)' }
    ], { duration: 900, delay, easing: ease, fill: 'backwards' });
    const h1 = opening.querySelector('h1');
    entrance = [
      h1.animate([
        { clipPath: 'inset(100% -10% -12% -10%)', translate: '0 40px' },
        { clipPath: 'inset(-10% -10% -12% -10%)', translate: '0 0' }
      ], { duration: 1150, delay: 120, easing: ease, fill: 'backwards' }),
      h1.querySelector('em').animate([
        { opacity: 0, letterSpacing: '.04em', filter: 'blur(6px)' },
        { opacity: 1, letterSpacing: '-.01em', filter: 'blur(0)' }
      ], { duration: 1300, delay: 420, easing: ease, fill: 'backwards' }),
      rise(opening.querySelector('.intro'), 520),
      rise(opening.querySelector('.scroll-link'), 660),
      rise(document.querySelector('.topbar'), 300),
      rise(document.querySelector('.world-readout'), 1500)
    ];
  }
})();
