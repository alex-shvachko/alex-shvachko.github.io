(() => {
  const contact = document.querySelector('#contact');
  const video = contact.querySelector('.contact-sky-loop video');
  const source = video.querySelector('source');
  const toggle = document.querySelector('#motion-toggle');
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  let visible = false;
  let scheduled = false;
  let starting = false;
  video.loop = true;
  const reduced = () => preference.matches || toggle.getAttribute('aria-pressed') === 'true';
  const exposed = () => visible && !document.hidden && !reduced()
    && contact.getBoundingClientRect().top <= innerHeight * .16;

  function update() {
    scheduled = false;
    // Avoid decoding the sky behind the preceding full-screen transition.
    const enabled = exposed();
    contact.classList.toggle('contact-live', enabled && video.readyState >= 2);
    if (!enabled) { video.pause(); return; }
    if (!source.src) {
      source.src = source.dataset.src;
      video.preload = 'auto';
      video.load();
    }
    if (video.paused && !starting) {
      starting = true;
      video.play().then(() => {
        starting = false;
        if (!exposed()) video.pause();
      }).catch(() => { starting = false; });
    }
  }

  function schedule() {
    if (visible && !scheduled) { scheduled = true; requestAnimationFrame(update); }
  }

  function sync() {
    const enabled = visible && !reduced() && !document.hidden;
    if (!enabled) { contact.classList.remove('contact-live'); video.pause(); }

    if (!enabled) return;

    schedule();
  }

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  }, { threshold: 0.02 }).observe(contact);
  preference.addEventListener('change', sync);
  toggle.addEventListener('click', sync);
  document.addEventListener('visibilitychange', sync);
  video.addEventListener('loadeddata', schedule);
  video.addEventListener('canplay', schedule);
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
})();
