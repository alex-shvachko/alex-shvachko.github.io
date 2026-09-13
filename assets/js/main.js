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
buildTreeline(scene);
buildRocks(scene);
const grass = buildGrass(scene);
const water = buildPond(scene, LAYOUT.sun);
const screenLight = buildScreenLight(scene);
const motes = buildMotes(scene);
water.reflectionSkips.push(grass, motes);

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
    [...leaves, trunkOccluder], { resolution: 0.5 });
  godRays.setSize(innerWidth, innerHeight);
  composer.insertPass(godRays, 1);
  fallingLeaves = buildFallingLeaves(scene, leaves[0]?.material);
  water.reflectionSkips.push(fallingLeaves);

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
    motion: { scale: 0.26, followSpeed: 2.1, noise: 0.06, landingHeight: 0.45 },
    zones: [{ id: 'finger', mesh: robot.perch, radius: 0.34,
              normal: new THREE.Vector3(0, 1, 0) }],
    onStateChange: state => { robot.frozen = state !== 'flying'; },
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

function onMove(e) {
  const r = stage.getBoundingClientRect();
  const fx = (e.clientX - r.left) / r.width;
  const fy = (e.clientY - r.top) / r.height;
  ndc.set(fx * 2 - 1, -(fy * 2) + 1);

  // Pointing anywhere at the robot calls the butterfly to his hand; the lure in
  // the frame loop then walks it onto the fingertip.
  if (robot) {
    picker.setFromCamera(ndc, camera);
    luring = picker.intersectObject(robot.body, false).length > 0;
  }
  if (!luring) butterfly?.handlePointer(ndc, camera);

  // Only the outer band of the frame moves the camera at all.
  const band = v => {
    const a = Math.abs(v);
    return a <= DEADZONE ? 0 : Math.sign(v) * Math.min(1, (a - DEADZONE) / (1 - DEADZONE));
  };
  edgeWant.set(band(ndc.x), band(ndc.y));
}

stage.addEventListener('pointermove', onMove);
stage.addEventListener('pointerleave', () => edgeWant.set(0, 0));
// The hero owns the wheel: it must not scroll the page out from under the scene.
stage.addEventListener('wheel', e => e.preventDefault(), { passive: false });
stage.addEventListener('touchmove', e => e.preventDefault(), { passive: false });

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  godRays?.setSize(innerWidth, innerHeight);
});

/* ------------------------------------------------------------- post-processing */
const composer = new EffectComposer(renderer);
composer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(
  new THREE.Vector2(innerWidth, innerHeight), 0.42, 0.65, 0.92));
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
composer.addPass(new SMAAPass());

/* --------------------------------------------------------------------- runtime */
const clock = new THREE.Clock();

// Adaptive resolution. Rather than guess a device tier, watch the actual frame
// time and step the pixel ratio down (and back up) to hold a smooth rate.
const quality = { ratio: Math.min(devicePixelRatio, 1.75), acc: 0, frames: 0 };
const RATIO_MIN = Math.min(devicePixelRatio, 0.75);
const RATIO_MAX = Math.min(devicePixelRatio, 1.75);

function adapt(dt) {
  quality.acc += dt;
  quality.frames++;
  if (quality.acc < 1) return;
  const fps = quality.frames / quality.acc;
  quality.acc = 0;
  quality.frames = 0;
  const next = fps < 45 ? quality.ratio - 0.25
    : fps > 58 ? quality.ratio + 0.25 : quality.ratio;
  const clamped = THREE.MathUtils.clamp(next, RATIO_MIN, RATIO_MAX);
  if (Math.abs(clamped - quality.ratio) < 0.01) return;
  quality.ratio = clamped;
  renderer.setPixelRatio(clamped);
  composer.setPixelRatio(clamped);
  composer.setSize(innerWidth, innerHeight);
  godRays?.setSize(innerWidth, innerHeight);
}
const camPos = new THREE.Vector3();
const screenPos = new THREE.Vector3();
const aimTarget = new THREE.Vector3();
const forward = new THREE.Vector3();
const lureTarget = new THREE.Vector3();
const lureNdc = new THREE.Vector2();

function frame() {
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
    robot.pointAt(aimTarget, dt);
    robot.watch(aimTarget, dt);
    if (robot.screen) {
      robot.screen.getWorldPosition(screenPos);
      forward.set(0, 0, 1).applyQuaternion(robot.root.quaternion);
      screenLight.light.position.copy(screenPos).addScaledVector(forward, 0.42);
      screenLight.light.intensity = 7.5 + Math.sin(t * 2.1) * 0.7 + Math.sin(t * 7.3) * 0.25;
      screenLight.bounce.position.copy(screenPos).setY(screenPos.y - 0.5);
    }
  }

  water.material.uniforms.time.value += dt * 0.42;
  motes.material.uniforms.uTime.value = t;
  grass.userData.uniforms.uTime.value = t;
  if (fallingLeaves) updateFallingLeaves(fallingLeaves, t, dt);
  grade.uniforms.uTime.value = t;
  composer.render();
}
renderer.setAnimationLoop(frame);

if (new URLSearchParams(location.search).has('debug')) {
  window.__hero = { scene, camera, renderer, composer, edgeWant, edgePull,
                    get godRays() { return godRays; },
                    get robot() { return robot; },
                    get butterfly() { return butterfly; } };
}
