import * as THREE from './vendor/three.module.js';
import { GLTFLoader } from './vendor/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from './vendor/addons/loaders/DRACOLoader.js';
import { Robot } from './scene/robot.js?v=rig-fix-8';
import { buildCascade } from './scene/cascade.js';
import { ButterflyController } from './scene/butterfly.js';
import { buildGlassMenu } from './scene/glassbranch.js?v=ship-3';
import {
  LAYOUT, buildEnvironment, placeTree, buildGround,
  buildPond, buildLights, buildScreenLight,
  buildMotes, buildFallingLeaves, updateFallingLeaves, buildTreeline,
  buildGrass, buildBotanicals,
} from './scene/world.js?v=ship-3';

const canvas = document.querySelector('#scene');
const stage = canvas.parentElement;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch {
  canvas.remove();
}
if (!renderer) throw new Error('WebGL unavailable; the still fallback stands in.');

renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.98;
// info resets itself on every render() call, so by default it only ever reports
// the last pass of the chain. Reset it once per frame instead, and the counters
// describe the frame.
renderer.info.autoReset = false;

const scene = new THREE.Scene();
scene.matrixAutoUpdate = false;
const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.02, 160);

/* ----------------------------------------------------------------- camera rig */
// The home pose drifts gently at the edges; scrolling then enters the display.
const FOCUS = new THREE.Vector3(1.15, 2.50, 3.6);
const HOME = new THREE.Vector3(3.1, 3.55, 12.2);
const DRIFT = { x: 0.22, y: 0.12 };
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const debugParams = new URLSearchParams(location.search);
const debugPose = debugParams.has('debug') ? debugParams.get('pose') : null;
let assetsReady = false;
let contextLost = false;
let needsFrame = true;
let scrollS = 0;                          // 0..1 progress through the track
function frameCamera() {
  const aspect = stage.clientWidth / stage.clientHeight;
  camera.aspect = aspect;
  // Keep the robot and the left pond in frame; reserve the lower area on phones.
  if (aspect < 0.95) {
    FOCUS.set(0.05, 2.05, 3.65);
    HOME.set(1.1, 4.1, 3.65 + Math.max(11.4, 7.6 / aspect));
    camera.fov = 38;
  } else {
    FOCUS.set(1.35, 2.15, 3.6);
    HOME.set(2.7, 3.65, 3.6 + Math.max(8.8, 10.8 / aspect));
    camera.fov = 38;
  }
  // Resizing mid-dive must NOT snap back to the hero framing; the frame loop
  // keeps lerping toward the scroll-driven pose. Only re-anchor at rest.
  if (scrollS <= 0.001) {
    camera.position.copy(HOME);
    camera.lookAt(FOCUS);
  }
  camera.updateProjectionMatrix();
}
frameCamera();
const DEADZONE = 0.45;                   // cursor stays central until this far out

/* ------------------------------------------------------------- scroll dive */
// The hero is pinned inside .hero-track (280svh); scrolling through the track
// pushes the camera through the robot's glowing screen toward the tech view.
const heroTrack = document.querySelector('.hero-track');
// Updated from the animated front display before positioning the camera.
const EYE_POS = new THREE.Vector3();
const EYE_TARGET = new THREE.Vector3();
const THROUGH_POS = new THREE.Vector3();
function updateScrollProgress() {
  if (reducedMotion.matches || !heroTrack) { scrollS = 0; stage.classList.remove('is-through'); return; }
  const r = heroTrack.getBoundingClientRect();
  const range = heroTrack.offsetHeight - stage.clientHeight;
  scrollS = range > 0 ? THREE.MathUtils.clamp(-r.top / range, 0, 1) : 0;
  // Clear the hint and controls as the viewer starts entering the display.
  stage.classList.toggle('is-through', scrollS > 0.16);
}
// Throttle scroll-progress to animation-frame cadence — getBoundingClientRect is not
// cheap across rapid scroll events.
let scrollTick = false;
function onScrollFrame() {
  if (scrollTick) return;
  scrollTick = true;
  requestAnimationFrame(() => { scrollTick = false; updateScrollProgress(); });
}
addEventListener('scroll', onScrollFrame, { passive: true });
reducedMotion.addEventListener('change', () => { needsFrame = true; updateScrollProgress(); });
updateScrollProgress();
const easeInOut = t => t * t * (3 - 2 * t);
const camWant = new THREE.Vector3();
const aimWant = new THREE.Vector3();

const edgePull = new THREE.Vector2(0, 0);   // eased -1..1 per axis
const edgeWant = new THREE.Vector2(0, 0);

camera.position.copy(HOME);
camera.lookAt(FOCUS);

/* ----------------------------------------------------------------- composition */
let environment = buildEnvironment(scene, renderer);
const { sun } = buildLights(scene);
buildGround(scene);
const treeline = buildTreeline(scene);
const grass = buildGrass(scene, { count: 8000 });
const water = buildPond(scene, LAYOUT.sun);
const cascade = buildCascade(scene);
buildBotanicals(scene);
const screenLight = buildScreenLight(scene);
screenLight.light.color.set('#328aff');
screenLight.light.intensity = 0.65;
const motes = buildMotes(scene);

// The navigation, as a glass bough of the oak hanging into the right of frame.
const menu = buildGlassMenu(scene, camera, document.querySelector('.branch-menu'),
  { home: HOME, focus: FOCUS });

// The reflection re-renders the scene. At 256px in dark water none of these
// read as anything but noise, and they are most of the geometry.
water.reflectionSkips.push(grass, motes, treeline, menu.frame, cascade.group);

/* --------------------------------------------------------------------- loading */
const draco = new DRACOLoader().setDecoderPath('./assets/js/vendor/addons/libs/draco/').setWorkerLimit(2);
draco.preload();
const loader = new GLTFLoader().setDRACOLoader(draco);

const pointer = new THREE.Vector2(0, 0);
let robot = null;
let butterfly = null;
let fallingLeaves = null;

const ready = (async () => {
  const [treeGltf, robotModel, shoreGltf, gardenGltf] = await Promise.all([
    loader.loadAsync('./assets/models/glade-oak.glb?v=2'),
    Robot.load(loader, './assets/models/robot-atom.glb?v=2'),
    loader.loadAsync('./assets/models/glade-shore.glb'),
    loader.loadAsync('./assets/models/glade-garden.glb'),
  ]);

  const { leaves } = placeTree(treeGltf, scene);
  shoreGltf.scene.traverse(o => { if (o.isMesh) {
    o.receiveShadow = true;
    o.material.side = THREE.DoubleSide;
  } });
  scene.add(shoreGltf.scene);
  gardenGltf.scene.traverse(o => { if (o.isMesh) {
    o.receiveShadow = true;
    o.material.side = THREE.DoubleSide;
    o.castShadow = /Root|Boulder|Ivy/.test(o.name);
  } });
  scene.add(gardenGltf.scene);
  water.reflectionSkips.push(...leaves);
  fallingLeaves = buildFallingLeaves(scene, leaves[0]?.material);
  water.reflectionSkips.push(fallingLeaves, robotModel.root);

  robot = robotModel;
  robot.root.position.copy(LAYOUT.robot.pos);
  robot.root.rotation.y = LAYOUT.robot.rotY;
  robot.root.scale.setScalar(LAYOUT.robot.scale);
  scene.add(robot.root);

  const hand = robot.handPosition(new THREE.Vector3());
  butterfly = await ButterflyController.load(scene, './assets/models/butterfly.glb', {
    loader,
    focus: new THREE.Vector3(FOCUS.x, FOCUS.y + 0.30, FOCUS.z + 0.7),
    home: hand.clone().add(new THREE.Vector3(0.3, 0.45, 0.55)),
    // Kept tight around the robot so it never wanders out of frame.
    bounds: new THREE.Box3(
      new THREE.Vector3(-2.4, 0.9, 2.6), new THREE.Vector3(3.8, 4.2, 6.4)),
    motion: { scale: 0.12, followSpeed: 1.7, noise: 0.06, landingHeight: 0.32 },
    zones: [
      { id: 'finger', mesh: robot.perch, radius: 0.34,
        normal: new THREE.Vector3(0, 1, 0) },
      ...menu.zones,
    ],
    // Only the fingertip landing holds the arm still, so the hand stops moving
    // out from under it. When the butterfly goes to the menu he keeps reaching
    // after it, and his head keeps following.
    onStateChange: (state, zone) => {
      robot.frozen = state !== 'flying' && zone === 'finger';
    },
  });

  // All shadow casters are static, so render the map once after asset loading.
  sun.shadow.needsUpdate = true;
  sun.shadow.autoUpdate = false;

  water.reflectionSkips.push(butterfly.root);
  // Static scenery retains its world matrices. Animated groups stay live.
  scene.updateMatrixWorld(true);
  const moving = new Set([robot.root, butterfly.root, menu.frame, fallingLeaves,
    screenLight.light, screenLight.bounce]);
  for (const child of scene.children) {
    if (!moving.has(child)) child.traverse(o => { o.matrixAutoUpdate = false; });
  }
  await renderer.compileAsync(scene, camera);
  clock.getDelta();
  assetsReady = true;
  stage.classList.add('is-ready');
  draco.dispose();
})();

stage.classList.add('is-webgl');
menu.resize();
ready.catch(err => {
  console.error('[hero] scene failed to load', err);
  stage.classList.remove('is-webgl');
});

/* ----------------------------------------------------------------- interaction */
const ndc = new THREE.Vector2();
const picker = new THREE.Raycaster();
let luring = false;
// Refreshed on every move and on resize. The frame loop reads only its width
// and height to place the menu labels, and those are what scrolling leaves
// alone, so it never needs a scroll listener of its own.
let rect = stage.getBoundingClientRect();

/** Which perch, if any, the cursor is resting on. */
function perchUnderCursor() {
  if (robot && picker.intersectObject(robot.body, false).length) return 'finger';
  return menu.zones.find(z => picker.intersectObject(z.mesh, false).length > 0)?.id ?? null;
}

function onMove(e) {
  needsFrame = true;
  rect = stage.getBoundingClientRect();
  const fx = (e.clientX - rect.left) / rect.width;
  const fy = (e.clientY - rect.top) / rect.height;
  ndc.set(fx * 2 - 1, -(fy * 2) + 1);
  picker.setFromCamera(ndc, camera);

  // Pointing anywhere at the robot calls the butterfly to his hand; the lure in
  // the frame loop then walks it onto the fingertip.
  luring = !!robot && picker.intersectObject(robot.body, false).length > 0;

  // Once it has settled, leaving sends it back up - and so does moving to a
  // different perch, so it hops along the menu rather than sitting there while
  // the cursor walks away. The controller handles breaking off an approach.
  if (butterfly?.state === 'landed') {
    const under = perchUnderCursor();
    if (under !== butterfly.landing?.zone.id) {
      butterfly.resetButterfly();
      // A reset deliberately disarms capture so it cannot re-land where it just
      // left. Moving to a different perch is the one case that should re-arm at
      // once, otherwise the hop strands it in mid-air.
      if (under) butterfly.zoneArmed = true;
    }
  }

  // Highlight the menu. A bead under the cursor wins; otherwise the label's own
  // pointer events own the highlight, so a cursor resting on the text keeps it.
  const beads = picker.intersectObjects(menu.buttons, false);
  if (beads.length) menu.setHover(beads[0].object.userData.nodeId);
  else if (!e.target.closest?.('.branch-menu a')) menu.setHover(null);
  stage.classList.toggle('is-pointing', !!menu.hovered);

  if (!luring) butterfly?.handlePointer(ndc, camera);

  // Only the outer band of the frame moves the camera at all.
  const band = v => {
    const a = Math.abs(v);
    return a <= DEADZONE ? 0 : Math.sign(v) * Math.min(1, (a - DEADZONE) / (1 - DEADZONE));
  };
  if (!reducedMotion.matches && camera.aspect >= 0.95) edgeWant.set(band(ndc.x), band(ndc.y));
}

stage.addEventListener('pointermove', onMove);
stage.addEventListener('pointerleave', () => {
  needsFrame = true;
  luring = false;
  edgeWant.set(0, 0);
  menu.setHover(null);
  stage.classList.remove('is-pointing');
  if (butterfly?.state === 'landed') butterfly.resetButterfly();
});
stage.addEventListener('focusin', () => { needsFrame = true; });
stage.addEventListener('focusout', () => { needsFrame = true; });
// Clicking the bead itself follows the link the same way its label does.
stage.addEventListener('click', e => {
  if (e.target.closest?.('.branch-menu a')) return;
  menu.nodes.find(n => n.id === menu.hovered)?.label?.click();
});
addEventListener('resize', () => {
  needsFrame = true;
  reflectionPosition.set(Infinity, Infinity, Infinity);
  frameCamera();
  updateScrollProgress();
  edgePull.set(0, 0);
  edgeWant.set(0, 0);
  renderer.setSize(stage.clientWidth, stage.clientHeight);
  rect = stage.getBoundingClientRect();
  menu.resize();       // the bough is framed by aspect, not by a fixed offset
});

/* --------------------------------------------------------------------- runtime */
const clock = new THREE.Clock();

// Adaptive resolution. Rather than guess a device tier, watch the actual frame
// time and step the pixel ratio down (and back up) to hold a smooth rate.
const quality = { ratio: Math.min(devicePixelRatio, 1.5), acc: 0, frames: 0,
                  fps: 60, calls: 0, tris: 0, stable: 0 };
const RATIO_MIN = Math.min(devicePixelRatio, 0.75);
const RATIO_MAX = Math.min(devicePixelRatio, 1.5);

function applyQuality() {
  renderer.setPixelRatio(quality.ratio);
}

const GRASS_MAX = grass.count;

function adapt(dt) {
  quality.acc += dt;
  quality.frames++;
  if (quality.acc < 0.5) return;          // react within half a second
  quality.fps = quality.frames / quality.acc;
  quality.acc = 0;
  quality.frames = 0;

  const slow = quality.fps < 58;
  // Require real headroom, so a 60 Hz display does not oscillate between tiers.
  const fast = quality.fps > 78 && ++quality.stable >= 12;
  if (quality.fps <= 78) quality.stable = 0;
  const next = slow ? quality.ratio - 0.25 : fast ? quality.ratio + 0.25 : quality.ratio;
  const clamped = THREE.MathUtils.clamp(next, RATIO_MIN, RATIO_MAX);

  // Resolution is the first and best lever. Only once it is at the floor and
  // the frame is still missing does the sward start thinning out, which an
  // InstancedMesh will do for free by drawing fewer of its instances.
  if (quality.ratio <= RATIO_MIN + 0.01 && slow) {
    grass.count = Math.max(3000, Math.round(grass.count * 0.8));
  } else if (fast && grass.count < GRASS_MAX) {
    grass.count = Math.min(GRASS_MAX, Math.round(grass.count * 1.15) + 60);
  }

  if (Math.abs(clamped - quality.ratio) < 0.01) return;
  quality.stable = 0;
  quality.ratio = clamped;
  applyQuality();
}
applyQuality();
let dive = 0;
const screenQ = new THREE.Quaternion();
const nav = document.querySelector('.branch-menu');
const aimTarget = new THREE.Vector3();
const forward = new THREE.Vector3();
const lureTarget = new THREE.Vector3();
const lureNdc = new THREE.Vector2();
const reflectionPosition = new THREE.Vector3(Infinity, Infinity, Infinity);
const reflectionRotation = new THREE.Quaternion();
let previousWash = '', previousNavOpacity = '';
const frameTimes = [];

function frame() {
  if (!assetsReady || contextLost || (reducedMotion.matches && !needsFrame)) return;
  needsFrame = false;
  renderer.info.reset();
  const rawDt = clock.getDelta();
  const dt = Math.min(rawDt, 0.05);
  const t = reducedMotion.matches ? 0 : clock.elapsedTime;
  dive = reducedMotion.matches ? 0 : dive + (scrollS - dive) * (1 - Math.exp(-12 * dt));
  if (Math.abs(dive - scrollS) < 0.0001) dive = scrollS;
  const wash = THREE.MathUtils.smoothstep(dive, 0.64, 0.80);
  const washValue = wash.toFixed(4);
  const navOpacity = (1 - THREE.MathUtils.smoothstep(dive, 0.02, 0.16)).toFixed(4);
  if (washValue !== previousWash) {
    stage.style.setProperty('--screen-wash', washValue);
    previousWash = washValue;
  }
  if (navOpacity !== previousNavOpacity) {
    nav.style.opacity = navOpacity;
    previousNavOpacity = navOpacity;
  }
  if (nav.inert !== (dive > 0.16)) nav.inert = dive > 0.16;
  menu.frame.visible = dive < 0.18;
  // Once blue fills the viewport, no hidden woodland frames are needed.
  if (wash >= 1) return;
  adapt(rawDt);
  if (robot) {
    if (robot.mixer) robot.mixer.timeScale = 1 - THREE.MathUtils.smoothstep(dive, 0, 0.14);
    robot.idle(t);
    aimTarget.copy(butterfly ? butterfly.root.position : FOCUS);
    if (['left', 'right', 'behind'].includes(debugPose)) {
      aimTarget.set(debugPose === 'left' ? -5 : 6, 2.3, debugPose === 'behind' ? -5 : 6);
      robot.frozen = false;
    }
    if (!reducedMotion.matches) {
      robot.pointAt(aimTarget, dt, t);
      robot.watch(dive > 0.005 ? HOME : aimTarget, dt, dive > 0.005 ? Math.PI : 0.7);
    }
    if (robot.screenAnchor) {
      robot.root.updateMatrixWorld(true);
      robot.screenAnchor.getWorldPosition(EYE_TARGET);
      robot.head.getWorldQuaternion(screenQ);
      forward.set(0, 0, 1).applyQuaternion(screenQ);
      EYE_POS.copy(EYE_TARGET).addScaledVector(forward, 0.75);
      THROUGH_POS.copy(EYE_TARGET).addScaledVector(forward, 0.035);
      screenLight.light.position.copy(EYE_TARGET).addScaledVector(forward, 0.16);
      screenLight.bounce.position.copy(EYE_TARGET).setY(EYE_TARGET.y - 0.25);
    }
  }

  edgePull.lerp(edgeWant, 1 - Math.exp(-3.2 * dt));
  if (dive > 0.001) {
    // Scroll dive: 0→0.5 closes onto the eye, 0.5→1 passes through the screen.
    if (dive < 0.5) {
      const u = easeInOut(THREE.MathUtils.clamp((dive - 0.10) / 0.40, 0, 1));
      camWant.lerpVectors(HOME, EYE_POS, u);
      aimWant.lerpVectors(FOCUS, EYE_TARGET, u);
    } else {
      const u = easeInOut(THREE.MathUtils.clamp((dive - 0.5) / 0.23, 0, 1));
      camWant.lerpVectors(EYE_POS, THROUGH_POS, u);
      aimWant.copy(EYE_TARGET);
    }
  } else {
    camWant.set(HOME.x + edgePull.x * DRIFT.x,
                HOME.y - edgePull.y * DRIFT.y,
                HOME.z - Math.abs(edgePull.x) * 0.25);
    aimWant.set(FOCUS.x + edgePull.x * 0.18, FOCUS.y - edgePull.y * 0.12, FOCUS.z);
  }
  camera.position.copy(camWant);
  camera.lookAt(aimWant);
  // All reflected objects are static. Reuse the pond image until the camera moves.
  water.userData.refreshReflection = camera.position.distanceToSquared(reflectionPosition) > 0.000004
    || camera.quaternion.angleTo(reflectionRotation) > 0.002;
  if (water.userData.refreshReflection) {
    reflectionPosition.copy(camera.position);
    reflectionRotation.copy(camera.quaternion);
  }

  if (butterfly) {
    // While the cursor rests on him, steer the butterfly with a ray aimed at the
    // fingertip instead of at the cursor. That both pulls it in and lets the
    // controller's own landing zone fire, so it settles on his finger.
    if (luring && robot && butterfly.state === 'flying') {
      robot.handPosition(lureTarget).project(camera);
      lureNdc.set(lureTarget.x, lureTarget.y);
      butterfly.handlePointer(lureNdc, camera);
    }
    if (!reducedMotion.matches || luring) butterfly.update(dt);
  }

  if (menu.frame.visible) menu.update(t, dt, rect);
  if (!reducedMotion.matches) water.material.uniforms.time.value += dt * 0.22;
  cascade.update(t);
  motes.material.uniforms.uTime.value = t;
  grass.userData.uniforms.uTime.value = t;
  if (fallingLeaves && !reducedMotion.matches) updateFallingLeaves(fallingLeaves, t, dt);
  renderer.render(scene, camera);
  quality.calls = renderer.info.render.calls;
  quality.tris = renderer.info.render.triangles;
  if (debugParams.has('debug') && rawDt < 0.25) {
    frameTimes.push(rawDt * 1000);
    if (frameTimes.length > 600) frameTimes.shift();
  }
}
renderer.setAnimationLoop(frame);
let inView = true;
function syncPlayback() {
  clock.getDelta();
  quality.acc = 0;
  quality.frames = 0;
  renderer.setAnimationLoop(inView && !document.hidden ? frame : null);
}
new IntersectionObserver(([entry]) => {
  inView = entry.isIntersecting;
  syncPlayback();
}, { threshold: 0 }).observe(stage);
document.addEventListener('visibilitychange', syncPlayback);
canvas.addEventListener('webglcontextlost', () => {
  contextLost = true;
  stage.classList.remove('is-ready', 'is-webgl');
  stage.style.setProperty('--screen-wash', '0');
  previousWash = '';
  nav.inert = false;
  nav.style.opacity = '1';
});
canvas.addEventListener('webglcontextrestored', async () => {
  try {
    await ready;
    environment.dispose();
    environment = buildEnvironment(scene, renderer);
    await renderer.compileAsync(scene, camera);
    sun.shadow.needsUpdate = true;
    reflectionPosition.set(Infinity, Infinity, Infinity);
    previousNavOpacity = '';
    needsFrame = true;
    contextLost = false;
    stage.classList.add('is-webgl', 'is-ready');
    syncPlayback();
  } catch (err) {
    console.error('[hero] scene recovery failed', err);
  }
});

if (debugParams.has('debug')) {
  // A readout, so "is it 60?" is answered by measurement rather than by feel.
  const hud = document.createElement('div');
  hud.id = 'hero-performance';
  hud.style.cssText = 'position:fixed;z-index:9;left:12px;top:12px;padding:7px 10px;'
    + 'background:rgba(12,20,10,.72);color:#dcef9a;font:11px/1.5 monospace;'
    + 'white-space:pre;border-radius:3px;pointer-events:none';
  document.body.appendChild(hud);
  setInterval(() => {
    const sorted = [...frameTimes].sort((a, b) => a - b);
    const percentile = p => (sorted[Math.floor((sorted.length - 1) * p)] || 0).toFixed(1);
    hud.textContent = `${quality.fps.toFixed(0)} fps   ratio ${quality.ratio.toFixed(2)}\n`
      + `${quality.calls} calls   ${(quality.tris / 1000).toFixed(0)}k tris\n`
      + `frame ms: p50 ${percentile(0.5)} / p95 ${percentile(0.95)} (${sorted.length})`;
  }, 250);
  const isolate = document.createElement('button');
  isolate.textContent = 'Inspect robot';
  isolate.style.cssText = 'position:fixed;z-index:10;left:12px;top:84px';
  isolate.addEventListener('click', () => {
    const isolated = isolate.textContent === 'Inspect robot';
    for (const child of scene.children) {
      if (child.isLight || child === robot?.root) continue;
      child.visible = !isolated;
    }
    isolate.textContent = isolated ? 'Show glade' : 'Inspect robot';
  });
  document.body.appendChild(isolate);

  window.__hero = { scene, camera, renderer, edgeWant, edgePull, menu, quality,
                    get robot() { return robot; },
                    get butterfly() { return butterfly; } };
}
