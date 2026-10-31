/* The Chain Reaction — standalone player.
   Plays the film's seven shots, in order, on one 1920×1080 stage.
   Each shot is a pure function of time: init(kit) builds it once, render(t) draws frame t,
   so any moment can be shown directly — scrubbing and frame-stepping need no replay. */
(function () {
  'use strict';

  // Timing and easing helpers, identical to the ones the film was written against.
  const clamp01 = x => x < 0 ? 0 : x > 1 ? 1 : x;
  const seg = (t, a, b) => clamp01((t - a) / (b - a));
  const lerp = (a, b, p) => a + (b - a) * p;
  const eo = x => 1 - Math.pow(1 - clamp01(x), 3);
  const ei = x => Math.pow(clamp01(x), 3);
  const eio = x => { x = clamp01(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  const eob = (x, c1 = 1.4) => { x = clamp01(x); const c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };

  // Word-by-word text reveal used by the opening title and the closing subtitle.
  const TextFx = {
    split(el) {
      if (el.__words) return el.__words;
      const text = el.textContent; el.textContent = '';
      const spans = [];
      for (const w of text.split(/(\s+)/)) {
        if (/^\s+$/.test(w)) { el.appendChild(document.createTextNode(w)); continue; }
        if (!w) continue;
        const s = document.createElement('span');
        s.textContent = w; s.style.display = 'inline-block'; s.style.willChange = 'opacity, transform';
        el.appendChild(s); spans.push(s);
      }
      return (el.__words = spans);
    },
    fadeFromRight(el, t, t0, o = {}) {
      const { stagger = 0.11, dur = 0.5, dx = 26 } = o, ws = TextFx.split(el);
      ws.forEach((s, i) => { const p = eo(seg(t, t0 + i * stagger, t0 + i * stagger + dur)); s.style.opacity = p; s.style.transform = `translateX(${((1 - p) * dx).toFixed(1)}px)`; });
      return t0 + (ws.length - 1) * stagger + dur;
    },
    fadeOutLeft(el, t, t0, o = {}) {
      const { stagger = 0.07, dur = 0.35, dx = 22 } = o, ws = TextFx.split(el);
      ws.forEach((s, i) => { const p = ei(seg(t, t0 + i * stagger, t0 + i * stagger + dur)); if (t >= t0) { s.style.opacity = 1 - p; s.style.transform = `translateX(${(-p * dx).toFixed(1)}px)`; } });
    },
  };

  // Markup string -> DOM fragment (SVG inside parses in the SVG namespace).
  const h = html => { const tpl = document.createElement('template'); tpl.innerHTML = html.trim(); return tpl.content; };

  const shots = [];
  let total = 0, T = 0, playing = false, last = null, current = null, dragging = false;
  const FPS = 60;

  window.FILM = {
    // Each shot file calls FILM.add(id, name, seconds, build); build(kit) registers the shot with kit.scene(id, { init, render }).
    add(id, name, dur, build) { shots.push({ id, name, dur, build }); },
    start,
  };

  const $ = s => document.querySelector(s);
  const fmt = x => x.toFixed(2);

  function start() {
    const stage = $('#stage');
    for (const s of shots) {
      s.start = total; total += s.dur;
      s.el = document.createElement('div');
      s.el.className = 'shot'; s.el.style.display = 'none';
      stage.appendChild(s.el);
      s.kit = { clamp01, seg, lerp, eo, ei, eio, eob, TextFx, h, stage: s.el, scene(id, obj) { s.obj = obj; } };
      s.build(s.kit);
      s.obj.init(s.kit);
    }
    buildControls();
    fit();
    new ResizeObserver(fit).observe($('.frame'));
    draw();
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) setPlaying(true);
    requestAnimationFrame(tick);
  }

  function fit() { $('#stage').style.transform = `scale(${$('.frame').clientWidth / 1920})`; }

  function shotAt(t) { for (const s of shots) if (t < s.start + s.dur) return s; return shots[shots.length - 1]; }

  function draw() {
    const s = shotAt(T);
    if (current !== s) {
      if (current) current.el.style.display = 'none';
      s.el.style.display = ''; current = s;
    }
    s.obj.render(Math.min(T - s.start, s.dur), s.kit);
    $('#now').textContent = fmt(T);
    shots.forEach(x => { x.fill.style.width = (100 * clamp01((T - x.start) / x.dur)) + '%'; x.label.classList.toggle('on', x === s); });
    $('.playhead').style.left = (100 * T / total) + '%';
    const tr = $('#track');
    tr.setAttribute('aria-valuenow', fmt(T));
    tr.setAttribute('aria-valuetext', `${T.toFixed(1)} seconds, ${s.name}`);
  }

  function tick(now) {
    if (playing && !dragging) {
      if (last != null) T += (now - last) / 1000;
      last = now;
      if (T >= total) { T = total; setPlaying(false); }
      draw();
    } else last = null;
    requestAnimationFrame(tick);
  }

  function setPlaying(on) {
    if (on && T >= total) T = 0;
    playing = on; last = null;
    const b = $('#play');
    b.textContent = on ? 'Pause' : (T >= total ? 'Play again' : 'Play');
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  function seek(t) { T = Math.max(0, Math.min(total, t)); draw(); if (!playing) setPlaying(false); }

  function buildControls() {
    const segs = $('.segs'), labels = $('.labels');
    $('#total').textContent = fmt(total);
    $('#track').setAttribute('aria-valuemax', fmt(total));
    for (const s of shots) {
      const bar = document.createElement('span'); bar.style.flexGrow = s.dur;
      s.fill = document.createElement('i'); bar.appendChild(s.fill); segs.appendChild(bar);
      const lb = document.createElement('button'); lb.type = 'button'; lb.textContent = s.name; lb.style.flexGrow = s.dur;
      lb.addEventListener('click', () => seek(s.start)); s.label = lb; labels.appendChild(lb);
    }
    $('#play').addEventListener('click', () => setPlaying(!playing));
    const tr = $('#track');
    const at = e => { const r = tr.getBoundingClientRect(); seek(total * clamp01((e.clientX - r.left) / r.width)); };
    tr.addEventListener('pointerdown', e => { dragging = true; tr.setPointerCapture(e.pointerId); at(e); });
    tr.addEventListener('pointermove', e => { if (dragging) at(e); });
    tr.addEventListener('pointerup', () => { dragging = false; last = null; });
    tr.addEventListener('pointercancel', () => { dragging = false; last = null; });
    document.addEventListener('keydown', e => {
      if (e.target.closest && e.target.closest('button') && (e.key === ' ' || e.key === 'Enter')) return;
      const step = e.shiftKey ? 1 : 1 / FPS;
      if (e.key === ' ') { e.preventDefault(); setPlaying(!playing); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); setPlaying(false); seek(T + step); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); setPlaying(false); seek(T - step); }
      else if (e.key === 'Home') { e.preventDefault(); seek(0); }
      else if (e.key === 'End') { e.preventDefault(); setPlaying(false); seek(total); }
    });
  }
})();
