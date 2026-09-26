/* Life-path timeline: one restrained reveal, with no separate skills showroom. */
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const path = document.getElementById('path');
const nodes = [...path.querySelectorAll('.tl-node')];

if (reduced.matches || !('IntersectionObserver' in window)) {
  nodes.forEach(node => node.classList.add('is-in'));
  path.style.setProperty('--line', 1);
} else {
  path.classList.add('can-animate');
  const entrance = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) {
      path.classList.add('is-visible');
      entrance.disconnect();
    }
  }, { rootMargin: '0px 0px -15% 0px' });
  entrance.observe(path);

  const nodeEntrance = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      nodeEntrance.unobserve(entry.target);
    });
  }, { threshold: 0.3 });
  nodes.forEach(node => nodeEntrance.observe(node));
}

let framePending = false;
function drawPath() {
  if (framePending) return;
  framePending = true;
  requestAnimationFrame(() => {
    framePending = false;
    const timeline = path.querySelector('.tech-timeline').getBoundingClientRect();
    const progress = Math.min(1, Math.max(0, (innerHeight * .85 - timeline.top) / (timeline.height + innerHeight * .15)));
    path.style.setProperty('--line', reduced.matches ? 1 : progress.toFixed(3));
  });
}

addEventListener('scroll', drawPath, { passive: true });
addEventListener('resize', drawPath);
drawPath();
