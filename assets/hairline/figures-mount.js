// Mounts the two hairline package figures when they come near the viewport: the tray of
// cards over Projects and the signal dish over Contact. A figure's caption goes to the
// read-out beside it when there is one.
import { dish, riffle } from './figures.js';

const figures = { dish, riffle };
const options = {
  dish: { intensity: .7, label: 'A satellite dish on a gimbal that turns to follow your pointer.' },
  riffle: { intensity: .55 }
};

document.querySelectorAll('[data-figure]').forEach(host => {
  const make = figures[host.dataset.figure];
  if (!make) return;
  const read = host.parentElement.querySelector('.signal-read b');
  const watch = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    watch.disconnect();
    make(host, { ...options[host.dataset.figure], play: true, onRead: read ? text => { read.textContent = text; } : undefined });
  }, { rootMargin: '240px 0px' });
  watch.observe(host);
});
