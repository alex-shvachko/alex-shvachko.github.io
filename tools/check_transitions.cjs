const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const queue = [], events = {}, videoEvents = {};
const classes = new Set();
let top = -800, time = 0, pressed = false, overlapping = false, configure;
const video = {
  dataset: {endPoster: 'end.jpg'}, duration: 5.166667, readyState: 4, seeking: false,
  get currentTime() { return time; },
  set currentTime(value) { time = value; this.seeking = true; },
  querySelector: () => ({addEventListener() {}}),
  pause() {}, load() {}, addEventListener: (name, fn) => videoEvents[name] = fn
};
const stage = {style: {}, querySelector: () => video, classList: {
  toggle(name, enabled) { enabled ? classes.add(name) : classes.delete(name); },
  remove(...names) { names.forEach(name => classes.delete(name)); }
}};
const section = {hidden: true, querySelector: () => stage, classList: {contains: () => overlapping},
  getBoundingClientRect: () => ({top, bottom: top + 1000, height: 1000})};
const context = {
  document: {hidden: false, querySelectorAll: () => [section],
    querySelector: () => ({getAttribute: () => String(pressed), addEventListener: (name, fn) => configure = fn}),
    addEventListener: (name, fn) => events[name] = fn},
  innerHeight: 1000,
  matchMedia: () => ({matches: false, addEventListener() {}}),
  IntersectionObserver: class {observe() {}},
  requestAnimationFrame: fn => queue.push(fn),
  addEventListener: (name, fn) => events[name] = fn
};
vm.runInNewContext(fs.readFileSync('assets/motion/projects-transition.js', 'utf8'), context);
const flush = () => { while (queue.length) queue.shift()(); };
const move = value => { top = value; events.scroll(); flush(); };
const decoded = () => { video.seeking = false; videoEvents.seeked(); flush(); };

flush();
assert.equal(time, 5.125, 'reverse entry must request the final frame');
assert.equal(classes.has('projects-transition-playing'), false, 'hide the stale frame during entry seeking');
assert.equal(stage.style.backgroundImage, "url('end.jpg')", 'use the Contact endpoint while decoding');
decoded();
assert.equal(classes.has('projects-transition-playing'), true);
move(-500);
const midpoint = time;
decoded();
move(200); decoded();
move(-500); decoded();
assert.equal(time, midpoint, 'the same scroll position must display the same frame in either direction');
move(-1001);
assert.equal(stage.style.opacity, '0', 'remove the overlay after leaving the transition');
decoded();
move(-800);
assert.equal(time, 5.125, 'prepare the endpoint before reverse re-entry');
move(-200);
move(400);
decoded(); decoded();
assert.equal(time, 0.9583333333333333, 'a busy decoder must catch up to the latest scroll target');
overlapping = true;
vm.runInNewContext(fs.readFileSync('assets/motion/projects-transition.js', 'utf8'), context);
flush(); decoded();
move(-500); decoded();
assert.equal(stage.style.opacity, '0', 'Contact handoff must finish when Contact reaches the viewport top');
assert.equal(time, 5.125, 'Contact handoff must finish on its final frame at the page scroll limit');
pressed = true; configure(); flush();
assert.equal(section.hidden, true, 'reduced motion must remove the transition spacer');
assert.equal(classes.has('projects-transition-playing'), false);
console.log('PASS: decoded reverse entry, endpoint poster, direction symmetry, offscreen cleanup, latest seek target, reduced motion');
