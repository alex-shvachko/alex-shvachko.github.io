// Mounts the hairline package figure when it comes near the viewport: the signal dish over
// Contact.
import { dish } from './figures.js';

const figures = { dish };
const options = {
  dish: { intensity: .7, label: 'A satellite dish on a gimbal that turns to follow your pointer.' }
};

document.querySelectorAll('[data-figure]').forEach(host => {
  const make = figures[host.dataset.figure];
  if (!make) return;
  const watch = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    watch.disconnect();
    make(host, { ...options[host.dataset.figure] });
    // Relay mouse positions across the viewport to the figure's local pointer handler.
    addEventListener('pointermove', event => {
      if (event.isTrusted && event.pointerType === 'mouse') {
        host.dispatchEvent(new PointerEvent('pointermove', { clientX: event.clientX, clientY: event.clientY, pointerType: 'mouse' }));
      }
    }, { passive: true });
  }, { rootMargin: '240px 0px' });
  watch.observe(host);
});
