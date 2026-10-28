// Mounts the hairline package figure when it comes near the viewport: the signal dish over
// Contact. Its caption goes to the read-out beside it.
import { dish } from './figures.js';

const figures = { dish };
const options = {
  dish: { intensity: .7, label: 'A satellite dish on a gimbal that turns to follow your pointer.' }
};

document.querySelectorAll('[data-figure]').forEach(host => {
  const make = figures[host.dataset.figure];
  if (!make) return;
  const read = host.closest('.contact-signal')?.querySelector('.signal-read b');
  const watch = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    watch.disconnect();
    make(host, { ...options[host.dataset.figure], play: true, onRead: read ? text => { read.textContent = text; } : undefined });
  }, { rootMargin: '240px 0px' });
  watch.observe(host);
});
