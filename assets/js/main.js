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
import {
  LAYOUT, buildEnvironment, placeTree, buildGround, buildRocks,
  buildPond, buildRoots, buildLights, buildScreenLight,
  buildMotes, buildFallingLeaves, updateFallingLeaves, buildTreeline,
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

/* ------------------------------------------------------------------ camera rig */
const FOCUS = new THREE.Vector3(0.25, 1.60, 4.2);
const rig = { theta: 0.34, phi: 0.09, radius: 8.6, dragging: false, x: 0, y: 0 };
const LIMIT = { phi: [-0.12, 0.62], radius: [5.2, 13.5], theta: [-0.72, 1.0] };

function orbitTarget(out) {
  const reach = Math.cos(rig.phi) * rig.radius;
  return out.set(
    FOCUS.x + Math.sin(rig.theta) * reach,
    FOCUS.y + Math.sin(rig.phi) * rig.radius,
    FOCUS.z + Math.cos(rig.theta) * reach);
}
camera.position.copy(orbitTarget(new THREE.Vector3()));
camera.lookAt(FOCUS);

/* ----------------------------------------------------------------- composition */
buildEnvironment(scene, renderer);
buildLights(scene);
buildGround(scene);
buildTreeline(scene);
buildRocks(scene);
const water = buildPond(scene, LAYOUT.sun);
const screenLight = buildScreenLight(scene);
const motes = buildMotes(scene);

/* --------------------------------------------------------------------- loading */
const draco = new DRACOLoader().setDecoderPath('./assets/js/vendor/addons/libs/draco/');
const loader = new GLTFLoader().setDRACOLoader(draco);

const pointer = new THREE.Vector2(0, 0);
let robot = null;
let butterfly = null;
let fallingLeaves = null;

const ready = (async () => {
  const [treeGltf, robotModel] = await Promise.all([
    loader.loadAsync('./assets/models/oak-tree.glb'),
    Robot.load(loader, './assets/models/robot-postman.glb'),
  ]);

  const { leaves } = placeTree(treeGltf, scene);
  fallingLeaves = buildFallingLeaves(scene, leaves[0]?.material);

  robot = robotModel;
  robot.root.position.copy(LAYOUT.robot.pos);
  robot.root.rotation.y = LAYOUT.robot.rotY;
  robot.root.scale.setScalar(LAYOUT.robot.scale);
  scene.add(robot.root);

  // Roots reuse the real bark texture so the growth over him reads as the tree's.
  const trunkMesh = treeGltf.scene.getObjectByName('Trunk');
  const bark = new THREE.MeshStandardMaterial({ color: '#6b563d', roughness: 0.94, metalness: 0 });
  if (trunkMesh?.material?.map) {
    bark.map = trunkMesh.material.map;
    bark.normalMap = trunkMesh.material.normalMap;
    bark.color.set('#ffffff');
  }
  buildRoots(scene, bark);

  const hand = robot.handPosition(new THREE.Vector3());
  butterfly = await ButterflyController.load(scene, './assets/models/butterfly.glb', {
    loader,
    focus: new THREE.Vector3(FOCUS.x - 0.3, FOCUS.y + 0.35, FOCUS.z + 1.2),
    home: hand.clone().add(new THREE.Vector3(0.4, 0.7, 0.9)),
    bounds: new THREE.Box3(
      new THREE.Vector3(-5.5, 0.7, 1.0), new THREE.Vector3(5.5, 5.6, 7.5)),
    motion: { scale: 0.26, followSpeed: 2.1, noise: 0.07 },
  });

  stage.classList.add('is-ready');
})();

stage.classList.add('is-webgl');
ready.catch(err => {
  console.error('[hero] scene failed to load', err);
  stage.classList.remove('is-webgl');
});

/* ----------------------------------------------------------------- interaction */
const ndc = new THREE.Vector2();
const startDrag = e => { rig.dragging = true; rig.x = e.clientX; rig.y = e.clientY; };
const stopDrag = () => { rig.dragging = false; };

function onMove(e) {
  const r = stage.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  pointer.set(e.clientX / innerWidth - 0.5, e.clientY / innerHeight - 0.5);
  butterfly?.handlePointer(ndc, camera);
  if (!rig.dragging) return;
  const dx = e.clientX - rig.x, dy = e.clientY - rig.y;
  rig.theta = THREE.MathUtils.clamp(rig.theta - dx * 0.005, LIMIT.theta[0], LIMIT.theta[1]);
  rig.phi = THREE.MathUtils.clamp(rig.phi - dy * 0.0035, LIMIT.phi[0], LIMIT.phi[1]);
  rig.x = e.clientX;
  rig.y = e.clientY;
}

stage.addEventListener('pointerdown', e => {
  e.preventDefault(); startDrag(e); stage.setPointerCapture?.(e.pointerId);
});
stage.addEventListener('pointermove', onMove);
stage.addEventListener('pointerup', e => { stopDrag(); stage.releasePointerCapture?.(e.pointerId); });
stage.addEventListener('pointercancel', stopDrag);
stage.addEventListener('wheel', e => {
  e.preventDefault();
  rig.radius = THREE.MathUtils.clamp(rig.radius + e.deltaY * 0.006, LIMIT.radius[0], LIMIT.radius[1]);
}, { passive: false });

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});

/* ------------------------------------------------------------- post-processing */
const composer = new EffectComposer(renderer);
composer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(
  new THREE.Vector2(innerWidth, innerHeight), 0.5, 0.7, 0.86));
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
const camPos = new THREE.Vector3();
const screenPos = new THREE.Vector3();
const aimTarget = new THREE.Vector3();
const forward = new THREE.Vector3();

function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  orbitTarget(camPos);
  camPos.x += pointer.x * 0.22;
  camPos.y += -pointer.y * 0.12;
  camera.position.lerp(camPos, 1 - Math.exp(-4.5 * dt));
  camera.lookAt(FOCUS);

  if (butterfly) butterfly.update(dt);
  if (robot) {
    aimTarget.copy(butterfly ? butterfly.root.position : FOCUS);
    robot.pointAt(aimTarget, dt);
    if (robot.screen) {
      robot.screen.getWorldPosition(screenPos);
      forward.set(0, 0, 1).applyQuaternion(robot.root.quaternion);
      screenLight.light.position.copy(screenPos).addScaledVector(forward, 0.55);
      screenLight.light.intensity = 3.0 + Math.sin(t * 2.1) * 0.22 + Math.sin(t * 7.3) * 0.06;
      screenLight.bounce.position.copy(screenPos).setY(screenPos.y - 0.5);
    }
  }

  water.material.uniforms.time.value += dt * 0.42;
  motes.material.uniforms.uTime.value = t;
  if (fallingLeaves) updateFallingLeaves(fallingLeaves, t, dt);
  grade.uniforms.uTime.value = t;
  composer.render();
}
renderer.setAnimationLoop(frame);

if (new URLSearchParams(location.search).has('debug')) {
  window.__hero = { scene, camera, renderer, composer, rig, get robot() { return robot; },
                    get butterfly() { return butterfly; } };
}
