(() => {
  document.querySelectorAll('.section-transition-scroll').forEach(section => {
  const stage = section.querySelector('.projects-transition-stage');
  const overlapping = section.classList.contains('contact-transition-scroll');
  const video = stage.querySelector('video');
  const source = video.querySelector('source');
  const toggle = document.querySelector('#motion-toggle');
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const frame = 1 / Number(video.dataset.fps || 24);
  const clamp = value => Math.min(1, Math.max(0, value));
  let target = 0;
  let scheduled = false;
  let failed = false;
  let loaded = false;
  let visible = false;
  let presented = false;
  const reduced = () => preference.matches || toggle.getAttribute('aria-pressed') === 'true';

  function seek() {
    if (document.hidden || section.hidden || video.seeking || video.readyState < 1) return;
    if (Math.abs(video.currentTime - target) > frame / 2) video.currentTime = target;
  }

  function load() {
    if (loaded || failed || reduced()) return;
    loaded = true;
    video.preload = 'auto';
    video.load();
  }

  function update() {
    scheduled = false;
    if (section.hidden) return;
    const rect = section.getBoundingClientRect();
    const progress = overlapping
      ? clamp((innerHeight / 2 - rect.top) / rect.height)
      : clamp((innerHeight - rect.top) / (rect.height + innerHeight));
    const wasVisible = visible;
    visible = progress > 0 && progress < 1;
    if (!visible && !wasVisible && !loaded) return;
    const edge = .18;
    const fade = Math.min(clamp(progress / edge), clamp((1 - progress) / edge));
    const opacity = fade * fade * (3 - 2 * fade);
    const motion = clamp((progress - edge) / (1 - 2 * edge));
    if (Number.isFinite(video.duration)) {
      target = Math.round(motion * Math.max(0, video.duration - frame) / frame) * frame;
      seek();
    }
    if (!visible && !wasVisible) return;
    // Re-enter on the correct endpoint, never a frame left over from the last pass.
    if (!visible) presented = false;
    if (visible && !video.seeking && video.readyState >= 2 && Math.abs(video.currentTime - target) <= frame / 2) presented = true;
    stage.style.backgroundImage = !presented && progress > .5 && video.dataset.endPoster
      ? `url('${video.dataset.endPoster}')` : '';
    stage.style.opacity = String(opacity);
    stage.classList.toggle('projects-transition-visible', opacity > 0);
    stage.classList.toggle('projects-transition-playing', opacity > 0 && presented);
    if (opacity > 0) load();
  }

  function schedule() {
    if (!document.hidden && !scheduled) { scheduled = true; requestAnimationFrame(update); }
  }

  function configure() {
    section.hidden = reduced() || failed;
    video.pause();
    if (section.hidden) {
      visible = false;
      presented = false;
      stage.style.opacity = '0';
      stage.classList.remove('projects-transition-visible', 'projects-transition-playing');
    }
    else schedule();
  }

  new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) load();
  }, { rootMargin: '100% 0px' }).observe(section);
  video.addEventListener('loadeddata', schedule);
  video.addEventListener('canplay', schedule);
  video.addEventListener('seeked', () => { seek(); schedule(); });
  const fail = () => { if (loaded) { failed = true; configure(); } };
  video.addEventListener('error', fail);
  source.addEventListener('error', fail);
  document.addEventListener('visibilitychange', schedule);
  preference.addEventListener('change', configure);
  toggle.addEventListener('click', configure);
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  configure();
  });
})();
