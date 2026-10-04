(() => {
  const video = document.querySelector('#rover');
  const story = document.querySelector('.story');
  const opening = document.querySelector('.opening');
  const counter = document.querySelector('#progress');
  const toggle = document.querySelector('#motion-toggle');
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  let manualReduce = false;
  let target = 0;
  let scheduled = false;
  let enabled = false;
  let visible = true;
  let entrance = [];
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const frameDuration = 1 / 24;

  function seek() {
    if (!visible || document.hidden || !enabled || video.seeking || video.readyState < 1) return;
    if (Math.abs(video.currentTime - target) > frameDuration / 2) video.currentTime = target;
  }
  function update() {
    scheduled = false;
    if (!enabled || document.hidden) return;
    const rect = story.getBoundingClientRect();
    const entry = document.querySelector('#experience').getBoundingClientRect();
    const wasVisible = visible;
    visible = entry.top > 0 && rect.top < innerHeight;
    if (!visible && !wasVisible) return;
    const firstSceneDistance = entry.top - rect.top;
    const progress = clamp(-rect.top / firstSceneDistance, 0, 1);
    target = Math.round(progress * Math.max(0, video.duration - frameDuration) / frameDuration) * frameDuration;
    counter.textContent = `${String(Math.round(progress * 100)).padStart(2, '0')} / 100`;
    const uiOpacity = clamp(1 - Math.max(0, -rect.top) / (innerHeight * .65), 0, 1);
    opening.style.opacity = String(uiOpacity);
    opening.inert = uiOpacity === 0;
    story.style.setProperty('--opening-ui-opacity', String(uiOpacity));
    document.querySelector('body > header').style.opacity = String(uiOpacity);
    seek();
  }
  function schedule() {
    if (!scheduled) { scheduled = true; requestAnimationFrame(update); }
  }
  function configure() {
    const reduced = preference.matches || manualReduce;
    document.body.classList.toggle('motion-reduced', reduced);
    if (reduced) { entrance.forEach(animation => animation.cancel()); entrance = []; }
    enabled = Number.isFinite(video.duration) && !preference.matches && !manualReduce && !video.error;
    document.body.classList.toggle('motion-ready', enabled);
    toggle.setAttribute('aria-pressed', String(manualReduce || preference.matches));
    toggle.textContent = manualReduce || preference.matches ? 'Motion reduced' : 'Reduce motion';
    opening.style.opacity = '';
    opening.inert = false;
    story.style.removeProperty('--opening-ui-opacity');
    document.querySelector('body > header').style.opacity = '';
    if (enabled) {
      video.play().then(() => { video.pause(); seek(); schedule(); }).catch(schedule);
      schedule();
    }
    else { video.pause(); counter.textContent = 'EXPLORE AT YOUR PACE'; }
  }
  video.addEventListener('loadeddata', configure);
  video.addEventListener('seeked', () => { if (Math.abs(video.currentTime - target) > frameDuration / 2) seek(); });
  video.addEventListener('canplay', seek);
  video.addEventListener('error', configure);
  video.querySelector('source').addEventListener('error', configure);
  preference.addEventListener('change', configure);
  toggle.addEventListener('click', () => { manualReduce = !manualReduce; configure(); });
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { entrance.forEach(animation => animation.cancel()); entrance = []; }
    else schedule();
  });
  configure();
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
