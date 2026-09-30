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
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function seek() {
    if (!enabled || video.seeking || video.readyState < 1) return;
    if (Math.abs(video.currentTime - target) > 0.035) video.currentTime = target;
  }
  function update() {
    scheduled = false;
    if (!enabled) return;
    const rect = story.getBoundingClientRect();
    const progress = clamp(-rect.top / (story.offsetHeight - innerHeight), 0, 1);
    const entry = document.querySelector('#experience').getBoundingClientRect();
    const forestStart = (entry.top - rect.top) / (story.offsetHeight - innerHeight);
    target = progress < forestStart
      ? progress / forestStart * 14
      : 14 + (progress - forestStart) / (1 - forestStart) * (video.duration - 14 - 1 / 24);
    counter.textContent = `${String(Math.round(progress * 100)).padStart(2, '0')} / 100`;
    opening.style.opacity = String(clamp(1 - progress / 0.16, 0, 1));
    seek();
  }
  function schedule() {
    if (!scheduled) { scheduled = true; requestAnimationFrame(update); }
  }
  function configure() {
    enabled = Number.isFinite(video.duration) && !preference.matches && !manualReduce && !video.error;
    document.body.classList.toggle('motion-ready', enabled);
    toggle.setAttribute('aria-pressed', String(manualReduce || preference.matches));
    toggle.textContent = manualReduce || preference.matches ? 'Motion reduced' : 'Reduce motion';
    opening.style.opacity = '';
    if (enabled) schedule();
    else { video.pause(); counter.textContent = 'EXPLORE AT YOUR PACE'; }
  }
  video.addEventListener('loadeddata', configure);
  video.addEventListener('seeked', seek);
  video.addEventListener('canplay', seek);
  video.addEventListener('error', configure);
  video.querySelector('source').addEventListener('error', configure);
  preference.addEventListener('change', configure);
  toggle.addEventListener('click', () => { manualReduce = !manualReduce; configure(); });
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  configure();
})();
