(() => {
  // Dust: a GPU layer of fine particles under the line world, drawn in the world's own camera.
  // Home: a floor of dust round the studio that the pointer stirs. Each move sends out a ripple
  // and the dust under the pointer is pushed aside, then settles. Contact: a stream that runs
  // in as scattered noise from the left and leaves the dish as a clean pulse train on the right.
  // Every particle is computed in the vertex shader from its index, so there are no buffers and
  // no per-particle state, and the count is only a draw-call argument. The loop sleeps when
  // nothing moves and while the layer is hidden.
  const root = document.querySelector('.world');
  if (!root || !window.World) return;
  // Set up once the page has loaded and gone idle, so the dust never competes with the first frames.
  const later = () => { if ('requestIdleCallback' in window) requestIdleCallback(start, { timeout: 1500 }); else setTimeout(start, 300); };
  if (document.readyState === 'complete') later(); else addEventListener('load', later, { once: true });

  function start() {
  const canvas = document.createElement('canvas');
  canvas.className = 'dust';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;display:none';
  const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'high-performance' });
  if (!gl) return;
  root.prepend(canvas);

  // ---- shaders ---------------------------------------------------------------------------------
  const IMPULSES = 16;
  const VS = `#version 300 es
  precision highp float;
  precision highp int;
  uniform vec2 uRes;
  uniform float uDpr, uTime, uMode, uRadius, uAlpha, uReveal, uCount;
  uniform vec4 uCam;               // ox, oy, S, fade radius (css px)
  uniform vec2 uFocus;             // the camera's focus on screen (css px)
  uniform vec4 uImp[${IMPULSES}];  // floor x, floor y, start time, strength
  uniform vec4 uPush;              // floor x, floor y, strength, pointer screen x
  uniform vec4 uRig;               // the stream's band: left, centre y, width, height (css px)
  uniform vec3 uStir;              // pointer screen x, y, strength for the stream
  out float vA;

  uint hash(uint x) { x ^= x >> 16; x *= 0x7feb352du; x ^= x >> 15; x *= 0x846ca68bu; x ^= x >> 16; return x; }
  float rnd(uint id, uint k) { return float(hash(id * 4u + k) >> 8) / 16777216.0; }

  const float CS = 0.70710678, ZF = 0.8660254;

  vec2 floorDust(uint id, out float a) {
    float u = rnd(id, 0u), v = rnd(id, 1u), j = rnd(id, 2u);
    // Denser towards the studio: the radius is drawn with a bias to the middle.
    float r = uRadius * pow(u, 0.7);
    float t = 6.2831853 * v;
    vec2 w = vec2(cos(t), sin(t)) * r;
    // The pointer pushes the dust aside on the floor, smoothly and without a singular centre.
    vec2 dp = w - uPush.xy;
    w += dp * uPush.z * exp(-dot(dp, dp) / 900.0);
    // Ripples: rings that leave each impulse, slow down and fade.
    float z = 0.0;
    for (int k = 0; k < ${IMPULSES}; k++) {
      vec4 I = uImp[k];
      float age = uTime - I.z;
      if (I.w == 0.0 || age < 0.0 || age > 2.6) continue;
      float d = distance(w, I.xy);
      float x = d - age * (70.0 - age * 12.0);
      z += I.w * exp(-x * x / 60.0 - age * 1.5) * cos(x * 0.5) / (1.0 + d * 0.01);
    }
    vec2 p = vec2((w.x - w.y) * CS, (w.x + w.y) * CS * 0.5 - z * ZF);
    vec2 s = uCam.xy + uCam.z * p;
    // The floor's own fade round the camera's focus, as the grid's mask draws it; grown in at the start.
    float f = distance(s, uFocus) / (uCam.w * uReveal + 1.0);
    float fade = f < 0.5 ? mix(1.0, 0.6, f * 2.0) : max(0.0, mix(0.6, 0.0, (f - 0.5) * 2.0));
    // The field thins out towards its rim, so it never shows an edge.
    fade *= 1.0 - smoothstep(0.45, 1.0, r / uRadius);
    a = fade * (0.55 + 0.9 * j) * (1.0 + clamp(z * 0.22, -0.7, 1.6));
    return s;
  }

  vec2 stream(uint id, out float a) {
    float u = rnd(id, 0u), v = rnd(id, 1u), j = rnd(id, 2u), g = rnd(id, 3u);
    // Each particle runs left to right at its own pace and wraps.
    float x = fract(u + uTime * (0.018 + 0.03 * j));
    // Gaussian-ish spread from two uniforms.
    float n = (v + g - 1.0) * 1.6;
    // Noise in, signal out: the scatter collapses through the dish in the middle.
    float clean = smoothstep(0.38, 0.58, x);
    float flicker = sin(uTime * (3.0 + 9.0 * g) + 40.0 * v) * 0.35;
    float scatter = mix(0.55 + 0.25 * flicker, 0.06, clean);
    // The clean side carries a soft pulse train.
    float ph = fract((x - uTime * 0.03) * 9.0);
    float pulse = clean * (smoothstep(0.0, 0.1, ph) - smoothstep(0.3, 0.4, ph)) * 0.28;
    vec2 s = vec2(uRig.x + x * uRig.z, uRig.y + uRig.w * (n * scatter - pulse));
    // The pointer adds noise where it passes.
    vec2 d = s - uStir.xy;
    s.y += (g - 0.5) * 70.0 * uStir.z * exp(-dot(d, d) / 9000.0);
    float edge = smoothstep(0.0, 0.08, x) * (1.0 - smoothstep(0.9, 1.0, x));
    a = edge * (0.45 + 0.9 * j) * mix(1.0, 0.85, clean);
    return s;
  }

  void main() {
    uint id = uint(gl_VertexID);
    float a;
    vec2 s = uMode < 0.5 ? floorDust(id, a) : stream(id, a);
    vec2 c = s / uRes * 2.0 - 1.0;
    gl_Position = vec4(c.x, -c.y, 0.0, 1.0);
    // A few grains stand a little larger than the rest.
    gl_PointSize = uDpr * (rnd(id, 3u) > 0.97 ? 1.6 : 1.0);
    vA = clamp(a * uAlpha, 0.0, 1.0);
  }`;
  const FS = `#version 300 es
  precision mediump float;
  uniform vec3 uInk;
  in float vA;
  out vec4 o;
  void main() { o = vec4(uInk * vA, vA); }`;

  // Compiled in the background where the browser allows it: asking for a shader's status straight
  // away would hold the page's thread until the GPU process has finished.
  const parallel = gl.getExtension('KHR_parallel_shader_compile');
  const compile = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const vs = compile(gl.VERTEX_SHADER, VS), fs = compile(gl.FRAGMENT_SHADER, FS);
  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  const linked = () => !parallel || gl.getProgramParameter(prog, parallel.COMPLETION_STATUS_KHR);
  const poll = () => { if (linked()) run(); else setTimeout(poll, 60); };
  poll();

  function run() {
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn('[dust]', gl.getShaderInfoLog(vs) || gl.getShaderInfoLog(fs) || gl.getProgramInfoLog(prog));
    canvas.remove(); return;
  }
  gl.useProgram(prog);
  gl.bindVertexArray(gl.createVertexArray());
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  const U = {};
  ['uRes', 'uDpr', 'uTime', 'uMode', 'uRadius', 'uAlpha', 'uReveal', 'uCount', 'uCam', 'uFocus', 'uImp', 'uPush', 'uRig', 'uStir', 'uInk'].forEach(n => { U[n] = gl.getUniformLocation(prog, n); });

  // ---- budget ----------------------------------------------------------------------------------
  // The count follows the screen's device pixels and the machine; the alpha follows the count, so
  // the dust reads as the same tone everywhere, grainier with fewer particles, finer with more.
  const coarse = matchMedia('(pointer: coarse)').matches;
  const cores = navigator.hardwareConcurrency || 4, memory = navigator.deviceMemory || 8;
  const query = Number(new URLSearchParams(location.search).get('dust'));
  let ceiling = coarse || cores <= 4 || memory <= 4 ? 220000 : 1600000;
  let W = 0, H = 0, dpr = 1, count = 0;
  function size() {
    W = root.clientWidth || innerWidth; H = root.clientHeight || innerHeight;
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    count = query > 0 ? Math.min(query, 8e6) : Math.round(Math.min(ceiling, Math.max(80000, W * H * dpr * dpr * 0.2)));
    gl.uniform2f(U.uRes, W, H);
    gl.uniform1f(U.uDpr, dpr);
    gl.uniform1f(U.uCount, count);
    measureRig();
    wake();
  }

  // ---- colour ----------------------------------------------------------------------------------
  const hex = s => { const m = /#([0-9a-f]{6})/i.exec(s || ''); return m ? [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16) / 255) : null; };
  let dark = false;
  function colour() {
    dark = document.documentElement.dataset.theme === 'dark';
    const ink = hex(getComputedStyle(document.documentElement).getPropertyValue('--ink')) || (dark ? [.93, .93, .94] : [.04, .04, .04]);
    gl.uniform3f(U.uInk, ...ink);
    wake();
  }
  new MutationObserver(colour).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  // ---- the stream's band, measured on layout and carried by the scroll -------------------------
  const rig = document.querySelector('.signal-rig');
  let rigTop = 0, rigH = 0;
  // The scroll position is read in the scroll event, never inside the world's frame after it has
  // drawn (that would lay the page out again), and only where it is used: over Contact, and for the
  // reduced-motion fade.
  let sy = scrollY, syStale = false;
  addEventListener('scroll', () => { if (phi > 2.9 || reducedQuery.matches) { sy = scrollY; syStale = false; } else syStale = true; }, { passive: true });
  function measureRig() {
    if (!rig) return;
    const r = rig.getBoundingClientRect();
    sy = scrollY;
    rigTop = r.top + sy; rigH = r.height;
  }
  if (rig) new ResizeObserver(() => { measureRig(); wake(); }).observe(document.querySelector('main') || rig);

  // ---- pointer ---------------------------------------------------------------------------------
  const reducedQuery = matchMedia('(prefers-reduced-motion: reduce)');
  const CS = Math.SQRT1_2, K = .5;
  const toFloor = (sx, sy) => { const C = cam; const qx = (sx - C.ox) / C.S, Y = (sy - C.oy) / C.S / K; return [(qx + Y) * CS, (Y - qx) * CS]; };
  const imp = new Float32Array(IMPULSES * 4);
  let impAt = 0, lastImp = null, lastImpT = 0;
  let pointer = null, pointerT = 0;
  const push = { x: 0, y: 0, s: 0, v: 0, t: 0 };
  const stir = { s: 0, t: 0 };
  const t0 = performance.now();
  const now = () => (performance.now() - t0) / 1000;
  function impulse(x, y, strength) {
    imp.set([x, y, now(), strength], impAt * 4);
    impAt = (impAt + 1) % IMPULSES;
  }
  addEventListener('pointermove', e => {
    if (reducedQuery.matches || (e.pointerType === 'touch' && !e.isPrimary)) return;
    pointer = [e.clientX, e.clientY]; pointerT = performance.now();
    if (cam && mode === 0) {
      const [x, y] = toFloor(e.clientX, e.clientY);
      const t = now();
      if (lastImp) {
        const d = Math.hypot(x - lastImp[0], y - lastImp[1]);
        // A ripple every few world units travelled, stronger the faster the pointer goes.
        if (d > 7 && t - lastImpT > .05) { impulse(x, y, Math.min(5, .9 + d / Math.max(.016, t - lastImpT) * .012)); lastImp = [x, y]; lastImpT = t; }
      } else { lastImp = [x, y]; lastImpT = t; }
    }
    wake();
  }, { passive: true });
  addEventListener('pointerdown', e => {
    if (reducedQuery.matches || !cam || mode !== 0 || e.target.closest?.('a, button, input, select, textarea, dialog, article, h1, h2, h3, p')) return;
    const [x, y] = toFloor(e.clientX, e.clientY);
    impulse(x, y, 9);
    wake();
  }, { passive: true });
  const leave = () => { pointer = null; lastImp = null; wake(); };
  document.documentElement.addEventListener('pointerleave', leave);
  addEventListener('blur', leave);
  addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') leave(); }, { passive: true });

  // ---- the world's camera ----------------------------------------------------------------------
  let cam = null, phi = 0, worldAt = 0;
  World.onFrame(state => {
    cam = state.cam; phi = state.phi; worldAt = performance.now();
    // Drawn in the world's own frame, so the dust and the grid never part on a scroll.
    draw();
  });

  // ---- the loop --------------------------------------------------------------------------------
  let raf = 0, mode = 0, shown = false, adapt = { n: 0, slow: 0, last: 0 };
  const smooth = t => t * t * (3 - 2 * t);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  function wake() { if (!raf && !document.hidden) raf = requestAnimationFrame(tick); }
  function tick(t) {
    raf = 0;
    if (document.hidden) return;
    // While the world is drawing, it draws the dust; this loop covers the frames it sleeps through.
    const live = draw(performance.now() - worldAt > 40);
    if (live) {
      // Fewer particles if this machine cannot hold the frame.
      if (adapt.last) {
        const dt = t - adapt.last;
        adapt.n++; if (dt > 24) adapt.slow++;
        if (adapt.n >= 45) {
          if (adapt.slow > 22 && count > 120000 && !(query > 0)) { ceiling = Math.round(count * .6); size(); }
          adapt.n = adapt.slow = 0;
        }
      }
      adapt.last = t;
      raf = requestAnimationFrame(tick);
    } else adapt.last = 0;
  }

  function draw(render = true) {
    if (!cam || !W) return false;
    const reduced = reducedQuery.matches;
    const t = reduced ? 0 : now();
    const p = performance.now();
    // Which scene, and how present it is: the floor until the trail leaves the studio, the stream
    // once the sky is up over Contact.
    const streamOn = reduced ? 0 : smooth(clamp((phi - 3.1) / .7, 0, 1));
    // A jump straight to Contact skips the scroll events that would have kept this fresh.
    if (syStale && (streamOn > 0 || reduced)) { sy = scrollY; syStale = false; }
    const floorOn = reduced ? (sy < H * .6 ? 1 : 0) : 1 - smooth(clamp((phi - .2) / .65, 0, 1));
    const rigY = rigTop - sy + rigH * .5;
    const streamSeen = streamOn > 0 && rig && rigY > -rigH && rigY < H + rigH;
    mode = floorOn > 0 ? 0 : 1;
    const on = mode === 0 ? floorOn : streamSeen ? streamOn : 0;
    if (on <= 0.002) {
      if (shown) { shown = false; canvas.style.display = 'none'; }
      return false;
    }
    if (!shown) { shown = true; canvas.style.display = ''; }

    // The push under the pointer springs toward where the pointer is, and away when it leaves.
    const dt = push.t ? Math.min(.05, (p - push.t) / 1000) : 1 / 60;
    push.t = p;
    let moving = false;
    if (mode === 0) {
      const target = pointer && !reduced && p - pointerT < 1400 ? 1 : 0;
      if (pointer && !reduced) { const [x, y] = toFloor(pointer[0], pointer[1]); push.x = x; push.y = y; }
      const k = 1 - Math.exp(-dt / .16);
      push.v += (target - push.v) * k;
      if (Math.abs(target - push.v) < .002) push.v = target; else moving = true;
    } else {
      const target = pointer && !reduced && p - pointerT < 900 ? 1 : 0;
      stir.s += (target - stir.s) * (1 - Math.exp(-dt / .25));
      if (Math.abs(target - stir.s) < .002) stir.s = target; else moving = true;
    }
    let rippling = false;
    for (let k = 0; k < IMPULSES; k++) if (imp[k * 4 + 3] && t - imp[k * 4 + 2] < 2.6) { rippling = true; break; }
    const reveal = Math.min(1, (p - t0) / 1400);

    if (render) {
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(U.uTime, t);
      gl.uniform1f(U.uMode, mode);
      gl.uniform4f(U.uCam, cam.ox, cam.oy, cam.S, cam.r);
      gl.uniform2f(U.uFocus, cam.fx, cam.fy);
      gl.uniform1f(U.uReveal, 1 - Math.pow(2, -10 * reveal));
      gl.uniform1f(U.uRadius, 230);
      let n = count;
      if (mode === 0) {
        gl.uniform4fv(U.uImp, imp);
        gl.uniform4f(U.uPush, push.x, push.y, push.v * .85, 0);
        // Tone held steady: about this much ink per device pixel of the field, whatever the count.
        const field = Math.PI * Math.pow(Math.min(cam.r, 230 * cam.S), 2) * .5 * dpr * dpr;
        gl.uniform1f(U.uAlpha, on * clamp(field / n * (dark ? .07 : .05), .01, .5));
      } else {
        n = Math.round(count * .45);
        gl.uniform4f(U.uRig, 0, rigY, W, rigH * 1.1);
        gl.uniform3f(U.uStir, pointer ? pointer[0] : -1e4, pointer ? pointer[1] : -1e4, stir.s);
        const band = W * rigH * 1.1 * .6 * dpr * dpr;
        gl.uniform1f(U.uAlpha, on * clamp(band / n * (dark ? .055 : .075), .015, .5));
      }
      gl.drawArrays(gl.POINTS, 0, n);
    }
    // Asleep once nothing moves: the last frame stays on the canvas.
    return !reduced && (mode === 1 || rippling || moving || reveal < 1);
  }

  addEventListener('resize', () => { clearTimeout(size.timer); size.timer = setTimeout(size, 60); });
  reducedQuery.addEventListener('change', wake);
  document.addEventListener('visibilitychange', wake);
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); cancelAnimationFrame(raf); raf = 0; });
  canvas.addEventListener('webglcontextrestored', () => location.reload());
  colour();
  size();
  }
  }
})();
