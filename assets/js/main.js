import * as THREE from './vendor/three.module.js';
import { GLTFLoader } from './vendor/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from './vendor/addons/loaders/DRACOLoader.js';
import { Robot } from './scene/robot.js?v=glade-1';
import { ButterflyController } from './scene/butterfly.js';
import { buildGlassMenu } from './scene/glassbranch.js?v=glade-1';
import {
  LAYOUT, buildEnvironment, placeTree, buildGround,
  buildPond, buildLights, buildScreenLight,
  buildMotes, buildFallingLeaves, updateFallingLeaves, buildTreeline,
  buildGrass, buildBotanicals,
} from './scene/world.js?v=glade-1';

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
renderer.toneMappingExposure = 1.05;
// The glass menu refracts what is behind it, which costs an extra pass over the
// opaque scene. Half resolution is free of visible cost through frosted glass.
renderer.transmissionResolutionScale = 0.5;
// info resets itself on every render() call, so by default it only ever reports
// the last pass of the chain. Reset it once per frame instead, and the counters
// describe the frame.
renderer.info.autoReset = false;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.1, 160);

/* ----------------------------------------------------------------- camera rig */
// Locked framing on the robot and the butterfly. The camera never orbits or
// zooms; it only drifts a little once the cursor approaches the edge of frame.
const FOCUS = new THREE.Vector3(1.15, 2.50, 3.6);
const HOME = new THREE.Vector3(3.1, 3.55, 12.2);
const DRIFT = { x: 0.22, y: 0.12 };
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
function frameCamera() {
  const aspect = stage.clientWidth / stage.clientHeight;
  camera.aspect = aspect;
  // Keep the robot and the left pond in frame; reserve the lower area on phones.
  if (aspect < 0.95) {
    FOCUS.set(0.90, 1.45, 3.65);
    HOME.set(2.0, 3.8, 3.65 + Math.max(11.4, 5.8 / aspect));
    camera.fov = 38;
  } else {
    FOCUS.set(1.55, 1.85, 3.6);
    HOME.set(3.15, 5.45, 3.6 + Math.max(8.3, 10.8 / aspect));
    camera.fov = 38;
  }
  camera.position.copy(HOME);
  camera.lookAt(FOCUS);
  camera.updateProjectionMatrix();
}
frameCamera();
const DEADZONE = 0.45;                   // cursor stays central until this far out

const edgePull = new THREE.Vector2(0, 0);   // eased -1..1 per axis
const edgeWant = new THREE.Vector2(0, 0);

camera.position.copy(HOME);
camera.lookAt(FOCUS);

/* ----------------------------------------------------------------- composition */
buildEnvironment(scene, renderer);
const { sun } = buildLights(scene);
buildGround(scene);
const treeline = buildTreeline(scene);
const grass = buildGrass(scene);
const water = buildPond(scene, LAYOUT.sun);
buildBotanicals(scene);
const screenLight = buildScreenLight(scene);
const motes = buildMotes(scene);

// The navigation, as a glass bough of the oak hanging into the right of frame.
const menu = buildGlassMenu(scene, camera, document.querySelector('.branch-menu'),
  { home: HOME, focus: FOCUS });

// The reflection re-renders the scene. At 256px in dark water none of these
// read as anything but noise, and they are most of the geometry.
water.reflectionSkips.push(grass, motes, treeline, menu.frame);

/* --------------------------------------------------------------------- loading */
const draco = new DRACOLoader().setDecoderPath('./assets/js/vendor/addons/libs/draco/');
const loader = new GLTFLoader().setDRACOLoader(draco);

const pointer = new THREE.Vector2(0, 0);
let robot = null;
let butterfly = null;
let fallingLeaves = null;

const ready = (async () => {
  const [treeGltf, robotModel, shoreGltf] = await Promise.all([
    loader.loadAsync('./assets/models/glade-oak.glb'),
    Robot.load(loader, './assets/models/robot-postman-refined.glb'),
    loader.loadAsync('./assets/models/glade-shore.glb'),
  ]);

  const { leaves } = placeTree(treeGltf, scene);
  shoreGltf.scene.traverse(o => { if (o.isMesh) {
    o.receiveShadow = true;
    o.material.side = THREE.DoubleSide;
  } });
  scene.add(shoreGltf.scene);
  water.reflectionSkips.push(...leaves);
  fallingLeaves = buildFallingLeaves(scene, leaves[0]?.material);
  water.reflectionSkips.push(fallingLeaves, robotModel.root);

  robot = robotModel;
  robot.root.position.copy(LAYOUT.robot.pos);
  robot.root.rotation.y = LAYOUT.robot.rotY;
  robot.root.scale.setScalar(LAYOUT.robot.scale);
  if (robot.screen?.material) {
    const m = robot.screen.material;
    m.emissive?.set('#8ff4ff');
    m.emissiveIntensity = 0.55;
    m.toneMapped = true;
  }
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

  // The canopy and the sun are both static and leaves are the only casters, so
  // the shadow map never needs to be re-rendered after the first frame.
  sun.shadow.needsUpdate = true;
  sun.shadow.autoUpdate = false;

  stage.classList.add('is-ready');
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
  edgeWant.set(0, 0);
  menu.setHover(null);
  stage.classList.remove('is-pointing');
  if (butterfly?.state === 'landed') butterfly.resetButterfly();
});
// Clicking the bead itself follows the link the same way its label does.
stage.addEventListener('click', e => {
  if (e.target.closest?.('.branch-menu a')) return;
  menu.nodes.find(n => n.id === menu.hovered)?.label?.click();
});
addEventListener('resize', () => {
  frameCamera();
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
                  fps: 60, calls: 0, tris: 0 };
const RATIO_MIN = Math.min(devicePixelRatio, 1);
const RATIO_MAX = Math.min(devicePixelRatio, 1.5);

function applyQuality() {
  renderer.setPixelRatio(quality.ratio);
  // Refraction through frosted glass hides a low-resolution backdrop; give it
  // up first when the frame budget is tight.
  renderer.transmissionResolutionScale = quality.ratio > 1.2 ? 0.5 : 0.35;
}

const GRASS_MAX = grass.count;

function adapt(dt) {
  quality.acc += dt;
  quality.frames++;
  if (quality.acc < 0.5) return;          // react within half a second
  quality.fps = quality.frames / quality.acc;
  quality.acc = 0;
  quality.frames = 0;

  const slow = quality.fps < 50;
  const fast = quality.fps > 58;
  const next = slow ? quality.ratio - 0.25 : fast ? quality.ratio + 0.25 : quality.ratio;
  const clamped = THREE.MathUtils.clamp(next, RATIO_MIN, RATIO_MAX);

  // Resolution is the first and best lever. Only once it is at the floor and
  // the frame is still missing does the sward start thinning out, which an
  // InstancedMesh will do for free by drawing fewer of its instances.
  if (quality.ratio <= RATIO_MIN + 0.01 && slow) {
    grass.count = Math.max(5000, Math.round(grass.count * 0.8));
  } else if (fast && grass.count < GRASS_MAX) {
    grass.count = Math.min(GRASS_MAX, Math.round(grass.count * 1.15) + 60);
  }

  if (Math.abs(clamped - quality.ratio) < 0.01) return;
  quality.ratio = clamped;
  applyQuality();
}
applyQuality();
const camPos = new THREE.Vector3();
const screenPos = new THREE.Vector3();
const aimTarget = new THREE.Vector3();
const forward = new THREE.Vector3();
const lureTarget = new THREE.Vector3();
const lureNdc = new THREE.Vector2();
let frameNumber = 0;

function frame() {
  water.userData.refreshReflection = frameNumber++ % 4 === 0;
  renderer.info.reset();
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = reducedMotion.matches ? 0 : clock.elapsedTime;
  adapt(dt);

  edgePull.lerp(edgeWant, 1 - Math.exp(-3.2 * dt));
  camPos.set(HOME.x + edgePull.x * DRIFT.x,
             HOME.y - edgePull.y * DRIFT.y,
             HOME.z - Math.abs(edgePull.x) * 0.25);
  camera.position.lerp(camPos, 1 - Math.exp(-5.0 * dt));
  camera.lookAt(FOCUS.x + edgePull.x * 0.18, FOCUS.y - edgePull.y * 0.12, FOCUS.z);

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
  if (robot) {
    aimTarget.copy(butterfly ? butterfly.root.position : FOCUS);
    // Idle first: it moves the torso and neck, and the arm should solve against
    // where the shoulder has actually ended up this frame.
    robot.idle(t);
    robot.pointAt(aimTarget, dt, t);
    robot.watch(aimTarget, dt);
    if (robot.screen) {
      robot.head.getWorldPosition(screenPos);
      forward.set(0, 0, 1).applyQuaternion(robot.root.quaternion);
      screenLight.light.position.copy(screenPos).addScaledVector(forward, 0.42);
      screenLight.light.intensity = 0.7 + Math.sin(t * 2.1) * 0.06;
      screenLight.bounce.position.copy(screenPos).setY(screenPos.y - 0.5);
    }
  }

  menu.update(t, dt, rect);
  if (!reducedMotion.matches) water.material.uniforms.time.value += dt * 0.22;
  motes.material.uniforms.uTime.value = t;
  grass.userData.uniforms.uTime.value = t;
  if (fallingLeaves && !reducedMotion.matches) updateFallingLeaves(fallingLeaves, t, dt);
  renderer.render(scene, camera);
  quality.calls = renderer.info.render.calls;
  quality.tris = renderer.info.render.triangles;
}
renderer.setAnimationLoop(frame);
let inView = true;
function syncPlayback() {
  clock.getDelta();
  renderer.setAnimationLoop(inView && !document.hidden ? frame : null);
}
new IntersectionObserver(([entry]) => {
  inView = entry.isIntersecting;
  syncPlayback();
}, { threshold: 0 }).observe(stage);
document.addEventListener('visibilitychange', syncPlayback);

if (new URLSearchParams(location.search).has('debug')) {
  // A readout, so "is it 60?" is answered by measurement rather than by feel.
  const hud = document.createElement('div');
  hud.style.cssText = 'position:fixed;z-index:9;left:12px;top:12px;padding:7px 10px;'
    + 'background:rgba(12,20,10,.72);color:#dcef9a;font:11px/1.5 monospace;'
    + 'white-space:pre;border-radius:3px;pointer-events:none';
  document.body.appendChild(hud);
  setInterval(() => {
    const r = renderer.info.render;
    hud.textContent = `${quality.fps.toFixed(0)} fps   ratio ${quality.ratio.toFixed(2)}\n`
      + `${r.calls} calls   ${(r.triangles / 1000).toFixed(0)}k tris\n`
      + `native antialiasing`;
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
