// The signal instrument above Contact: noise runs in from the left, the dish takes it apart, a
// clean pulse runs out on the right. How well it is locked on (0 to 1) sets how much noise is
// left and how tall the pulse stands, and reads out as a signal-to-noise ratio. The lock is
// found by pointing at the beacon in the sky (the dish follows the pointer), and rises on its
// own as the stage scrolls to the middle of the screen. Sky and dish are drawn elsewhere
// (cosmos.js, figures.js); this file draws the trace and keeps the numbers.
(() => {
  const section = document.querySelector('.contact-signal');
  const rig = section?.querySelector('.signal-rig');
  const svg = rig?.querySelector('.signal-scope');
  if (!svg) return;
  const NS = 'http://www.w3.org/2000/svg';
  const mk = (tag, attrs) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    svg.appendChild(e);
    return e;
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = t => t * t * (3 - 2 * t);
  const reducedQuery = matchMedia('(prefers-reduced-motion: reduce)');

  // The trace is drawn in a 760 x 190 box with the dish at its middle, over x 296 to 464.
  const W = 760, Y0 = 132, DL = 300, DR = 460;
  let ticks = '';
  for (let x = 0; x <= W; x += 20) ticks += `M${x} ${Y0 + 6}v${x % 80 ? 3.5 : 7}`;
  mk('path', { class: 'base', d: `M0 ${Y0}H${W}` });
  mk('path', { class: 'tick', d: ticks });
  const raw2 = mk('path', { class: 'raw2' }), raw = mk('path', { class: 'raw' });
  const res = mk('path', { class: 'res' }), out = mk('path', { class: 'out' });
  const ring = mk('circle', { class: 'ring', r: 6 }), live = mk('circle', { class: 'live', r: 3 });

  // The meter: twenty ticks that fill with the lock.
  const meter = section.querySelector('.signal-meter');
  const bars = Array.from({ length: 20 }, () => meter.appendChild(document.createElement('i')));
  const snrEl = section.querySelector('.signal-snr'), stateEl = section.querySelector('.signal-state');

  // One beat of the signal: a small lift, a sharp spike with its dip, a slow settle.
  const g = (d, s) => Math.exp(-(d / s) * (d / s));
  const pulse = (x, t) => {
    let p = ((x - 90 * t) / 150) % 1;
    if (p < 0) p += 1;
    return .12 * g(p - .18, .03) + g(p - .4, .009) - .3 * g(p - .44, .011) + .22 * g(p - .68, .045);
  };
  const noise = () => Math.random() + Math.random() - 1;
  const f = n => n.toFixed(1);

  function draw(t, lock) {
    let a = '', b = '';
    for (let x = 0; x <= DL; x += 4) {
      const k = Math.pow(1 - x / DL, 1.4), p = pulse(x, t) * 12;
      a += `${x ? 'L' : 'M'}${x} ${f(Y0 - p + noise() * 46 * k)}`;
      b += `${x ? 'L' : 'M'}${x} ${f(Y0 - p * .6 + noise() * 34 * k)}`;
    }
    raw.setAttribute('d', a); raw2.setAttribute('d', b);
    let o = '', r = '', y = Y0;
    const amp = 12 + 44 * lock, left = 46 * Math.pow(1 - lock, 1.3);
    for (let x = DR; x <= W; x += 2) {
      const env = smooth(clamp((x - DR) / 36, 0, 1)), n = noise() * left * (.45 + .55 * smooth((x - DR) / 180)) * smooth(clamp((x - DR) / 20, 0, 1));
      const yp = Y0 - pulse(x, t) * amp * env;
      y = yp + n;
      o += `${x > DR ? 'L' : 'M'}${x} ${f(lock > .55 ? yp + n * .25 : y)}`;
      r += `${x > DR ? 'L' : 'M'}${x} ${f(y)}`;
    }
    out.setAttribute('d', o); res.setAttribute('d', r);
    out.style.opacity = (.35 + .65 * lock).toFixed(2);
    res.style.opacity = (.85 * Math.min(1, left / 20)).toFixed(2);
    live.setAttribute('cx', W - 2); live.setAttribute('cy', f(y));
    ring.setAttribute('cx', W - 2); ring.setAttribute('cy', f(y));
    ring.setAttribute('r', (6 + 2.5 * Math.sin(t * 3)).toFixed(1));
    ring.style.opacity = lock > .8 ? '1' : '0';
  }

  // ---- the lock: the beacon found with the pointer, else what the scroll and the quiet give
  let lock = 0, pointer = null, visible = false, raf = 0, last = 0, lastDraw = 0, lit = -1, snrText = '', state = '';
  addEventListener('pointermove', e => { pointer = [e.clientX, e.clientY]; }, { passive: true });
  addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') setTimeout(() => { pointer = null; }, 1400); }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { pointer = null; });
  function aim(now) {
    const b = window.World?.sky?.beacon();
    const r = rig.getBoundingClientRect(), vh = innerHeight;
    const clarity = smooth(clamp(1 - Math.abs(r.top + r.height / 2 - vh * .5) / (vh * .85), 0, 1));
    // a slow pass of its own now and then, for a screen with no pointer
    const pass = Math.pow(Math.max(0, Math.sin(now / 1000 * .38)), 6) * .3;
    let t = .12 + .6 * clarity + pass + .03 * Math.sin(now / 1000 * 1.3);
    if (b && pointer) t = Math.max(t, Math.exp(-Math.pow(Math.hypot(pointer[0] - b[0], pointer[1] - b[1]) / Math.max(90, innerWidth * .09), 2)) * .98);
    return clamp(t, 0, 1);
  }
  function report() {
    const snr = -6 + 30 * lock, text = `snr ${snr < 0 ? '−' : '+'}${Math.abs(snr).toFixed(1)} dB`;
    if (text !== snrText) { snrText = text; snrEl.textContent = text; }
    const n = Math.round(lock * bars.length);
    if (n !== lit) { lit = n; bars.forEach((el, i) => el.classList.toggle('on', i < n)); }
    const s = lock > .82 ? 'locked' : lock > .45 ? 'tracking' : 'searching';
    if (s !== state) { state = s; stateEl.textContent = s; section.dataset.state = s; }
    window.World?.sky?.lock(lock);
  }
  // The sky is the whole screen on arrival and recedes behind the text as the page is scrolled to its end.
  function recede() {
    const c = document.querySelector('#contact').getBoundingClientRect().top;
    window.World?.sky?.calm(smooth(clamp(-c / (innerHeight * .55), 0, 1)));
  }
  function frame(now) {
    raf = 0;
    if (!visible || document.hidden) { last = 0; return; }
    const dt = last ? Math.min(.05, (now - last) / 1000) : 1 / 60;
    last = now;
    lock += (aim(now) - lock) * (1 - Math.exp(-dt / .28));
    report();
    recede();
    if (now - lastDraw > 33) { lastDraw = now; draw(now / 1000, lock); }
    raf = requestAnimationFrame(frame);
  }
  const wake = () => { if (visible && !raf && !reducedQuery.matches) raf = requestAnimationFrame(frame); };
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; wake(); }, { rootMargin: '120px 0px' }).observe(rig);
  document.addEventListener('visibilitychange', () => { last = 0; wake(); });

  // Reduced motion: one still frame, locked on.
  function still() {
    if (!reducedQuery.matches) return;
    lock = .9; report(); draw(.4, lock);
  }
  reducedQuery.addEventListener('change', () => { still(); wake(); });
  draw(0, 0); report(); still();
})();
