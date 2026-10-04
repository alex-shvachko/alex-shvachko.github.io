const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const events = {}, observers = [], queue = [];
const node = () => ({ style: {}, classList: { toggle() {} }, setAttribute() {},
  addEventListener(name, fn) { this.events[name] = fn; }, events: {} });
let top = 1000, pressed = false, loads = 0;
const source = { dataset: { src: 'journey.mp4' } };
const video = Object.assign(node(), { duration: 5, currentTime: 0, readyState: 4,
  querySelector: () => source, load() { loads++; } });
const home = Object.assign(node(), { readyState: 0, error: null });
const sphere = Object.assign(node(), { clientWidth: 400, append() {}, setPointerCapture() {} });
const cards = Array.from({ length: 5 }, (_, i) => {
  const button = node();
  return Object.assign(node(), { querySelector: selector => selector === 'button' ? button : { textContent: `Chapter ${i}` } });
});
const labels = { '#sphere-chapter': {}, '#journey-count': {} };
const section = Object.assign(node(), {
  offsetHeight: 5000,
  getBoundingClientRect: () => ({ top, bottom: top + 5000 }),
  querySelectorAll: () => cards,
  querySelector: selector => selector === '.tag-sphere' ? sphere : selector === '#journey-video' ? video : labels[selector]
});
const toggle = Object.assign(node(), { getAttribute: () => String(pressed) });
const context = {
  document: { hidden: false, createElement: node,
    querySelector: selector => selector === '.journey' ? section : selector === '#rover' ? home : toggle,
    addEventListener: (name, fn) => events[name] = fn },
  matchMedia: () => ({ matches: false, addEventListener() {} }),
  innerHeight: 1000, scrollY: 0,
  IntersectionObserver: class { constructor(fn) { observers.push(fn); } observe() {} },
  requestAnimationFrame: fn => { queue.push(fn); return queue.length; },
  addEventListener: (name, fn) => events[name] = fn,
  scrollTo() {}
};
vm.runInNewContext(fs.readFileSync('assets/motion/journey.js', 'utf8'), context);
observers[0]([{ isIntersecting: true }]);
assert.equal(loads, 0, 'opening must settle before loading Journey');
home.readyState = 4;
top = 2800;
home.events.loadeddata();
assert.equal(loads, 0, 'settled Journey outside warm range must stay unloaded');
top = 1900; context.scrollY = 900;
observers[0]([{ isIntersecting: true }]);
assert.equal(loads, 1, 'approaching Journey must preload once');
assert.equal(source.src, 'journey.mp4');
events.scroll();
assert.equal(loads, 1, 'scroll must not reload media');
observers[1]([{ isIntersecting: true }]);
pressed = true; toggle.events.click();
queue.shift()(16);
assert.equal(labels['#journey-count'].textContent, '01 / 05');
assert.equal(loads, 1, 'reduced motion must not trigger another download');
observers[1]([{ isIntersecting: false }]);
events.scroll();
assert.equal(queue.length, 0, 'offscreen Journey must not schedule animation');
console.log('PASS: startup geometry, lazy preload range, single load, reduced motion, offscreen scheduling');
