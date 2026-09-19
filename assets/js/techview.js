/* techview.js — the stylized view on the far side of the robot's eye:
   self-drawing experience timeline, a cloud of skill tags with an expanding
   detail card, and an edge rail of category markers that light up on scroll.
   Vanilla only; honours prefers-reduced-motion. */

const reduced = matchMedia('(prefers-reduced-motion: reduce)');

/* ------------------------------------------------------------------ skills */
const SKILLS = [
  // [name, category, one-liner]
  ['Python', 'AI·ML', 'The language everything else here is written in — pipelines, models, tooling.'],
  ['scikit-learn', 'AI·ML', 'Classical ML workhorse: features in, honest metrics out.'],
  ['TensorFlow', 'AI·ML', 'Deep nets for vision and tabular work when the problem earns the parameters.'],
  ['PyTorch', 'AI·ML', 'First pick for research-flavoured models and fast iteration.'],
  ['XGBoost', 'AI·ML', 'Gradient boosting for tabular data that still beats half the deep models.'],
  ['NLP / LLMs', 'AI·ML', 'Prompting, fine-tuning and wiring language models into real workflows.'],
  ['RAG', 'AI·ML', 'Retrieval pipelines that ground answers in documents instead of vibes.'],
  ['Embeddings', 'AI·ML', 'Vectorising text and meaning so search and clustering actually work.'],
  ['AI agents', 'AI·ML', 'Tool-using agents that plan, call APIs and report back.'],
  ['MCP', 'AI·ML', 'Model Context Protocol servers and clients — agents with well-shaped tools.'],
  ['SQL', 'Data·Infra', 'Queries that stay readable at one billion rows.'],
  ['Spark', 'Data·Infra', 'Distributed processing when a single machine politely declines.'],
  ['Hadoop', 'Data·Infra', 'The older big-data stack — HDFS, MapReduce, the classics.'],
  ['AWS', 'Data·Infra', 'Cloud plumbing: storage, compute and glue for data workloads.'],
  ['REST APIs', 'Data·Infra', 'Interfaces that document, version and fail predictably.'],
  ['Microservices', 'Data·Infra', 'Small services with clear seams instead of one nervous monolith.'],
  ['Docker', 'Data·Infra', 'Reproducible boxes for everything that runs.'],
  ['Kubernetes', 'Data·Infra', 'Orchestration when the boxes need a conductor.'],
  ['CI/CD', 'Data·Infra', 'Pipelines that test, build and ship without a human babysitter.'],
  ['GitHub Actions', 'Data·Infra', 'Automation living next to the code it serves.'],
  ['NoSQL', 'Data·Infra', 'Document and key-value stores where schemas would only slow things down.'],
  ['Linux / Bash', 'Data·Infra', 'The terminal is home; scripts fix things while you sleep.'],
  ['JavaScript', 'Web·Creative', 'The browser as a canvas — interfaces with a pulse.'],
  ['React', 'Web·Creative', 'Component-driven UIs that stay tidy as they grow.'],
  ['three.js', 'Web·Creative', 'Real-time 3D in the browser — like the glade you just flew through.'],
  ['n8n', 'Web·Creative', 'Visual workflow automation that wires APIs together without boilerplate.'],
  ['Make', 'Web·Creative', 'Scenario-based automation for operations busywork.'],
  ['Zapier', 'Web·Creative', 'Quick glue between the thousand SaaS products everyone uses.'],
  ['Webhooks', 'Web·Creative', 'Event-driven connections — systems that talk the moment something happens.'],
  ['Stable Diffusion', 'Creative AI', 'Open-source image generation, tuned and automated.'],
  ['Flux', 'Creative AI', 'Current-generation image models for sharper, more literal prompts.'],
  ['Wan', 'Creative AI', 'Video generation — motion to go with the stills.'],
  ['ComfyUI', 'Creative AI', 'Node-based pipelines that make generation reproducible.'],
  ['Forge', 'Creative AI', 'A faster Stable Diffusion WebUI flavour for daily driving.'],
  ['LoRA training', 'Creative AI', 'Teaching models a face, a style, a product — on a shoestring.'],
  ['ControlNet', 'Creative AI', 'Steering generation with poses, edges and depth.'],
  ['VAE', 'Creative AI', 'The codec between pixels and latent space — and why it sometimes matters.'],
  ['CLIP', 'Creative AI', 'The joint text-image embedding space everything creative-AI stands on.'],
];

// Percentage positions + rotation inside .cloud-field (desktop layout only;
// mobile collapses to a flex wrap and ignores these).
const POS = [
  [4, 4, -6], [34, 2, 3.5], [62, 5, -3], [82, 12, 5],
  [12, 16, 4], [44, 14, -7], [70, 26, 2.5], [6, 30, -4],
  [30, 27, 6], [52, 33, -3.5], [78, 40, 7], [20, 42, -6],
  [40, 49, 3], [64, 55, -5], [8, 55, 4.5], [28, 62, -3],
  [54, 68, 6.5], [76, 68, -4], [12, 72, 3], [36, 78, -6.5],
  [60, 82, 4], [84, 52, -2.5], [4, 86, 5], [24, 90, -4],
  [48, 91, 2], [70, 13, -7], [90, 30, 3], [88, 84, -5],
  [16, 8, 7], [58, 44, -8], [86, 64, 4.5], [32, 38, 5.5],
  [68, 96, -3], [44, 22, 8], [10, 48, -7.5], [80, 92, 6],
  [2, 66, -3.5], [56, 9, -5],
];

const field = document.getElementById('cloud-field');
const detail = document.getElementById('skill-detail');
const rail = document.getElementById('cloud-rail');
const techview = document.getElementById('techview');
let openBtn = null;

function closeDetail() {
  detail.hidden = true;
  openBtn?.setAttribute('aria-pressed', 'false');
  openBtn = null;
}

SKILLS.forEach(([name, cat, line], i) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'cloud-tag';
  b.dataset.cat = cat;
  b.textContent = name;
  const [x, y, r] = POS[i % POS.length];
  const j = Math.floor(i / POS.length);           // wrap-around ring for >38 tags
  b.style.setProperty('--x', `clamp(0%, ${(x + j * 7) % 95}%, 78%)`);
  b.style.setProperty('--y', `${(y + j * 11) % 96}%`);
  b.style.setProperty('--rot', r + 'deg');
  b.setAttribute('aria-pressed', 'false');
  b.setAttribute('aria-label', `${name} — ${cat}. Show details`);
  b.addEventListener('click', () => {
    if (openBtn === b) { closeDetail(); return; }
    openBtn?.setAttribute('aria-pressed', 'false');
    openBtn = b;
    b.setAttribute('aria-pressed', 'true');
    detail.hidden = false;
    detail.innerHTML = '';
    const h = document.createElement('h4');
    const c = document.createElement('span');
    c.className = 'sd-cat';
    const p = document.createElement('p');
    h.textContent = name;
    c.textContent = cat;
    p.textContent = line;
    detail.append(c, h, p);
  });
  field.appendChild(b);
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && openBtn) { closeDetail(); openBtn = null; }
});

/* ------------------------------------------------------------ reveal + line */
const nodes = [...document.querySelectorAll('.tl-node')];
if (reduced.matches || !('IntersectionObserver' in window)) {
  nodes.forEach(n => n.classList.add('is-in'));
  techview.style.setProperty('--line', 1);
} else {
  const inObs = new IntersectionObserver(entries => {
    for (const e of entries) if (e.isIntersecting) {
      e.target.classList.add('is-in');
      inObs.unobserve(e.target);
    }
  }, { threshold: 0.4 });
  nodes.forEach(n => inObs.observe(n));
}

/* -------------------- --tv fade-in and --line draw, driven by raw scroll --- */
let ticking = false;
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    const vh = innerHeight;
    const r = techview.getBoundingClientRect();
    // Long overlap with the pinned canvas: starts fading in ~80vh before the
    // section top reaches the viewport, so there is no hard swap point.
    const tv = Math.min(1, Math.max(0, (vh * 1.25 - r.top) / (vh * 0.8)));
    techview.style.setProperty('--tv', tv.toFixed(3));
    // Draw the timeline line with how far we've scrolled into its track.
    const tl = techview.querySelector('.tech-timeline').getBoundingClientRect();
    const line = Math.min(1, Math.max(0, (vh * 0.85 - tl.top) / (tl.height + vh * 0.15)));
    techview.style.setProperty('--line', reduced.matches ? 1 : line.toFixed(3));
    // Rail: light each category once its first tag crosses mid-viewport.
    rail.querySelectorAll('button').forEach(btn => {
      const first = field.querySelector(`.cloud-tag[data-cat="${CSS.escape(btn.dataset.rail)}"]`);
      const lit = first && first.getBoundingClientRect().top < vh * 0.9;
      btn.classList.toggle('is-lit', !!lit);
    });
  });
}
addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', onScroll);
onScroll();

// Rail buttons scroll their first tag into view.
rail.addEventListener('click', e => {
  const btn = e.target.closest('button[data-rail]');
  if (!btn) return;
  const first = field.querySelector(`.cloud-tag[data-cat="${CSS.escape(btn.dataset.rail)}"]`);
  first?.scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth', block: 'center' });
});
