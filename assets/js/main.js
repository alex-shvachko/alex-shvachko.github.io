import * as THREE from './vendor/three.module.js';

const canvas = document.querySelector('#scene');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#718339');
scene.fog = new THREE.Fog('#718339', 9, 28);
const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, .1, 40);
camera.position.set(0, 3.1, 10.5); camera.lookAt(0, 2.3, 0);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75)); renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
scene.add(new THREE.HemisphereLight('#e9efbd', '#34421f', 2.2));
const sun = new THREE.DirectionalLight('#ffe2a5', 4); sun.position.set(-5, 9, 5); sun.castShadow = true; scene.add(sun);
const material = color => new THREE.MeshStandardMaterial({ color, roughness: .85, flatShading: true });
const ground = new THREE.Mesh(new THREE.PlaneGeometry(35, 35), material('#586a2d')); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
const water = new THREE.Mesh(new THREE.CircleGeometry(4.2, 32), new THREE.MeshStandardMaterial({ color: '#2d7166', roughness: .18, metalness: .12, transparent: true, opacity: .88 })); water.rotation.x = -Math.PI / 2; water.position.set(0, .035, 1.1); scene.add(water);
const trunkMat = material('#63371e'), leafMat = material('#38591e'), grassMat = material('#4e791f');
for (let i = 0; i < 15; i++) { const x = (i % 2 ? 1 : -1) * (5 + Math.random() * 4), z = -5 + Math.random() * 8, s = .8 + Math.random() * 1.4; const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.18 * s, .28 * s, 2.5 * s, 6), trunkMat); trunk.position.set(x, 1.25 * s, z); trunk.castShadow = true; scene.add(trunk); const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(1.35 * s, 0), leafMat); crown.position.set(x, 3.25 * s, z); crown.castShadow = true; scene.add(crown); }
for (let i = 0; i < 100; i++) { const blade = new THREE.Mesh(new THREE.ConeGeometry(.09, .65 + Math.random() * .8, 3), grassMat); const side = i % 2 ? 1 : -1; blade.position.set(side * (3.6 + Math.random() * 4.5), .35, Math.random() * 8 - 4); blade.rotation.z = (Math.random() - .5) * .35; blade.castShadow = true; scene.add(blade); }
const robot = new THREE.Group(); robot.position.set(0, .3, -.4); scene.add(robot);
const body = new THREE.Mesh(new THREE.BoxGeometry(1.55, 1.35, 1.05), material('#8f401c')); body.position.y = 1.3; body.castShadow = true; robot.add(body);
const head = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.05, .82), material('#0b1716')); head.position.set(0, 2.45, 0); head.castShadow = true; robot.add(head);
const eye = new THREE.Mesh(new THREE.SphereGeometry(.3, 16, 8), new THREE.MeshStandardMaterial({ color: '#9ee7e1', emissive: '#46d4d2', emissiveIntensity: 2 })); eye.position.set(0, 2.5, .43); robot.add(eye);
for (const side of [-1, 1]) { const arm = new THREE.Mesh(new THREE.CylinderGeometry(.16, .2, .95, 6), material('#d5d5be')); arm.position.set(side * 1.05, 1.65, 0); arm.rotation.z = side * .45; arm.castShadow = true; robot.add(arm); }
const leaves = []; const leafColors = ['#bc8735', '#c75f32', '#8a5e2c'];
for (let i = 0; i < 26; i++) { const leaf = new THREE.Mesh(new THREE.PlaneGeometry(.2, .32), material(leafColors[i % 3])); leaf.position.set((Math.random() - .5) * 10, 1 + Math.random() * 6, -4 + Math.random() * 8); leaf.userData = { phase: Math.random() * 6.28, speed: .25 + Math.random() * .4 }; scene.add(leaf); leaves.push(leaf); }
const pointer = { x: 0, y: 0 }, cameraControl = { theta: 0, phi: .08, radius: 10.5, dragging: false, x: 0, y: 0 };
addEventListener('pointermove', event => { pointer.x = event.clientX / innerWidth - .5; pointer.y = event.clientY / innerHeight - .5; if (cameraControl.dragging) { cameraControl.theta -= (event.clientX - cameraControl.x) * .006; cameraControl.phi = THREE.MathUtils.clamp(cameraControl.phi + (event.clientY - cameraControl.y) * .004, -.65, .8); cameraControl.x = event.clientX; cameraControl.y = event.clientY; } });
addEventListener('pointerdown', event => { cameraControl.dragging = true; cameraControl.x = event.clientX; cameraControl.y = event.clientY; canvas.setPointerCapture?.(event.pointerId); });
addEventListener('pointerup', () => { cameraControl.dragging = false; });
addEventListener('wheel', event => { event.preventDefault(); cameraControl.radius = THREE.MathUtils.clamp(cameraControl.radius + event.deltaY * .012, 6.2, 16); }, { passive: false });
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => { const time = clock.getElapsedTime(); robot.position.y = .3 + Math.sin(time * 1.4) * .06; robot.rotation.y = Math.sin(time * .45) * .08; const orbitY = 3.1 + Math.sin(cameraControl.phi) * cameraControl.radius; const orbitX = Math.sin(cameraControl.theta) * cameraControl.radius; const orbitZ = Math.cos(cameraControl.theta) * cameraControl.radius; camera.position.x += (orbitX + pointer.x * .25 - camera.position.x) * .08; camera.position.y += (orbitY - camera.position.y) * .08; camera.position.z += (orbitZ - camera.position.z) * .08; camera.lookAt(0, 2.2, 0); leaves.forEach(leaf => { leaf.position.y -= leaf.userData.speed * .016; leaf.position.x += Math.sin(time + leaf.userData.phase) * .008; leaf.rotation.x += .012; leaf.rotation.z += .009; if (leaf.position.y < .3) { leaf.position.y = 6.8; leaf.position.x = (Math.random() - .5) * 10; } }); renderer.render(scene, camera); });
