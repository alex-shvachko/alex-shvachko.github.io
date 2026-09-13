import * as THREE from './vendor/three.module.js';
import { GLTFLoader } from './vendor/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from './vendor/addons/loaders/DRACOLoader.js';
import { EffectComposer } from './vendor/addons/postprocessing/EffectComposer.js';
import { RenderPass } from './vendor/addons/postprocessing/RenderPass.js';
import { ShaderPass } from './vendor/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from './vendor/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from './vendor/addons/postprocessing/OutputPass.js';
import { SMAAPass } from './vendor/addons/postprocessing/SMAAPass.js';
import { Robot } from './scene/robot.js';
import { ButterflyController } from './scene/butterfly.js';
import { GodRaysPass } from './scene/godrays.js';
import { buildGlassMenu } from './scene/glassbranch.js';
import {
  LAYOUT, buildEnvironment, placeTree, buildGround, buildRocks,
  buildPond, buildRoots, buildLights, buildScreenLight,
  buildMotes, buildFallingLeaves, updateFallingLeaves, buildTreeline, buildHollow,
  buildGrass,
} from './scene/world.js';

const canvas = document.querySelector('#scene');
const stage = canvas.parentElement;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
} catch {
  canvas.remove();
}
if (!renderer) throw new Error('WebGL unavailable; the still fallback stands in.');

renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
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
const FOCUS = new THREE.Vector3(1.05, 1.62, 4.05);
const HOME = new THREE.Vector3(2.05, 2.35, 10.6);
const DRIFT = { x: 0.85, y: 0.42 };      // metres of travel at the very border
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
buildRocks(scene);
const grass = buildGrass(scene);
const water = buildPond(scene, LAYOUT.sun);
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
let godRays = null;

const ready = (async () => {
  const [treeGltf, robotModel] = await Promise.all([
    loader.loadAsync('./assets/models/oak-tree.glb'),
    Robot.load(loader, './assets/models/robot-postman.glb'),
  ]);

  const { leaves } = placeTree(treeGltf, scene);
  // Shafts are built from the real canopy, so they break through the leaf gaps.
  const trunkOccluder = treeGltf.scene.getObjectByName('Trunk');
  godRays = new GodRaysPass(camera, LAYOUT.sun.clone().normalize().multiplyScalar(74),
    [...leaves, trunkOccluder], { resolution: rayScale(), samples: 10 });
  composer.insertPass(godRays, 1);      // which sizes it from the composer
  fallingLeaves = buildFallingLeaves(scene, leaves[0]?.material);
  water.reflectionSkips.push(fallingLeaves, robotModel.root);

  robot = robotModel;
  robot.root.position.copy(LAYOUT.robot.pos);
  robot.root.rotation.y = LAYOUT.robot.rotY;
  robot.root.scale.setScalar(LAYOUT.robot.scale);
  if (robot.screen?.material) {
    const m = robot.screen.material;
    m.emissive?.set('#8ff4ff');
    m.emissiveIntensity = 1.15;            // reads as a lit display, then blooms
    m.toneMapped = true;
  }
  scene.add(robot.root);

  // Roots reuse the real bark texture so the growth over him reads as the tree's.
  const trunkMesh = treeGltf.scene.getObjectByName('Trunk');
  const bark = new THREE.MeshStandardMaterial({ color: '#6b563d', roughness: 0.94, metalness: 0 });
  if (trunkMesh?.material?.map) {
    bark.map = trunkMesh.material.map;
    bark.normalMap = trunkMesh.material.normalMap;
    bark.color.set('#ffffff');
  }
  buildHollow(scene, bark);
  buildRoots(scene, bark);

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
  edgeWant.set(band(ndc.x), band(ndc.y));
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
// The hero owns the wheel: it must not scroll the page out from under the scene.
stage.addEventListener('wheel', e => e.preventDefault(), { passive: false });
stage.addEventListener('touchmove', e => e.preventDefault(), { passive: false });

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  godRays?.setResolution(rayScale());
  rect = stage.getBoundingClientRect();
  menu.resize();       // the bough is framed by aspect, not by a fixed offset
});

/* ------------------------------------------------------------- post-processing */
const composer = new EffectComposer(renderer);
composer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
composer.addPass(new RenderPass(scene, camera));

// Bloom runs at full resolution. Halving its chain looked like free money on
// paper - ten passes at a quarter of the pixels - but measured out at about
// 2.5% of the frame, and the coarse bottom mip haloed the pinpoint highlight on
// each glass bevel into a blocky white square sitting over the menu. Not a
// trade worth making.
const bloom = new UnrealBloomPass(
  new THREE.Vector2(innerWidth, innerHeight), 0.42, 0.65, 0.92);
composer.addPass(bloom);
composer.addPass(new OutputPass());
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 } },
  vertexShader: `varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime;
    varying vec2 vUv;
    void main(){
      vec3 c = texture2D( tDiffuse, vUv ).rgb;
      vec2 d = vUv - 0.5;
      c *= 1.0 - smoothstep( 0.30, 0.80, dot( d, d ) ) * 0.66;
      float g = fract( sin( dot( vUv * ( 1.0 + uTime ), vec2( 12.9898, 78.233 ) ) ) * 43758.5453 );
      c += ( g - 0.5 ) * 0.016;
      c = mix( vec3( dot( c, vec3( 0.299, 0.587, 0.114 ) ) ), c, 1.07 );
      gl_FragColor = vec4( c, 1.0 );
    }`,
});
composer.addPass(grade);
// Three more full-screen passes. Worth it at a low pixel ratio, redundant once
// the frame is already being supersampled - see applyQuality below.
const smaa = new SMAAPass();
composer.addPass(smaa);

/* --------------------------------------------------------------------- runtime */
const clock = new THREE.Clock();

// Adaptive resolution. Rather than guess a device tier, watch the actual frame
// time and step the pixel ratio down (and back up) to hold a smooth rate.
const quality = { ratio: Math.min(devicePixelRatio, 1.75), acc: 0, frames: 0,
                  fps: 60, calls: 0, tris: 0 };
const RATIO_MIN = Math.min(devicePixelRatio, 0.75);
const RATIO_MAX = Math.min(devicePixelRatio, 1.75);

// The shafts are soft and wide, so they are the one thing that can be rendered
// at a fraction of the frame and still look right. The composer hands every pass
// device pixels, so dividing by the ratio pins the ray buffer to half the CSS
// size however high the pixel ratio climbs. Without that, a 4K screen would be
// blurring a 2000px buffer for an effect nobody can resolve.
const rayScale = () => 0.5 / Math.max(1, quality.ratio);

function applyQuality() {
  renderer.setPixelRatio(quality.ratio);
  composer.setPixelRatio(quality.ratio);
  composer.setSize(innerWidth, innerHeight);
  godRays?.setResolution(rayScale());
  // Past about 1.4 the frame is already supersampled and SMAA is three passes
  // of work to soften edges that are no longer aliased.
  smaa.enabled = quality.ratio < 1.4;
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
    grass.count = Math.max(1500, Math.round(grass.count * 0.8));
  } else if (fast && grass.count < GRASS_MAX) {
    grass.count = Math.min(GRASS_MAX, Math.round(grass.count * 1.15) + 60);
  }

  if (Math.abs(clamped - quality.ratio) < 0.01) return;
  quality.ratio = clamped;
  applyQuality();
}
applyQuality();   // match SMAA and the transmission buffer to the starting ratio
const camPos = new THREE.Vector3();
const screenPos = new THREE.Vector3();
const aimTarget = new THREE.Vector3();
const forward = new THREE.Vector3();
const lureTarget = new THREE.Vector3();
const lureNdc = new THREE.Vector2();

function frame() {
  renderer.info.reset();
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
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
    butterfly.update(dt);
  }
  if (robot) {
    aimTarget.copy(butterfly ? butterfly.root.position : FOCUS);
    // Idle first: it moves the torso and neck, and the arm should solve against
    // where the shoulder has actually ended up this frame.
    robot.idle(t);
    robot.pointAt(aimTarget, dt, t);
    robot.watch(aimTarget, dt);
    if (robot.screen) {
      robot.screen.getWorldPosition(screenPos);
      forward.set(0, 0, 1).applyQuaternion(robot.root.quaternion);
      screenLight.light.position.copy(screenPos).addScaledVector(forward, 0.42);
      screenLight.light.intensity = 7.5 + Math.sin(t * 2.1) * 0.7 + Math.sin(t * 7.3) * 0.25;
      screenLight.bounce.position.copy(screenPos).setY(screenPos.y - 0.5);
    }
  }

  menu.update(t, dt, rect);
  water.material.uniforms.time.value += dt * 0.42;
  motes.material.uniforms.uTime.value = t;
  grass.userData.uniforms.uTime.value = t;
  if (fallingLeaves) updateFallingLeaves(fallingLeaves, t, dt);
  grade.uniforms.uTime.value = t;
  composer.render();
  quality.calls = renderer.info.render.calls;
  quality.tris = renderer.info.render.triangles;
}
renderer.setAnimationLoop(frame);

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
      + `rays ${godRays ? godRays.resolution.toFixed(2) : '-'}   smaa ${smaa.enabled ? 'on' : 'off'}`;
  }, 250);

  window.__hero = { scene, camera, renderer, composer, edgeWant, edgePull, menu, quality,
                    get godRays() { return godRays; },
                    get robot() { return robot; },
                    get butterfly() { return butterfly; } };
}
