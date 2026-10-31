import * as THREE from '../js/vendor/three.module.js';
import { GLTFLoader } from '../js/vendor/addons/loaders/GLTFLoader.js';

export async function showModel(host, url) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.replaceChildren(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, .01, 1000);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x6b7180, 2.2));
  const light = new THREE.DirectionalLight(0xffffff, 2.5); light.position.set(4, 7, 6); scene.add(light);
  let active = true, dragging = false, lastX = 0, lastY = 0;
  const model = (await new GLTFLoader().loadAsync(url)).scene;
  if (!host.isConnected) { renderer.dispose(); return () => {}; }
  const bounds = new THREE.Box3().setFromObject(model), center = bounds.getCenter(new THREE.Vector3()), size = bounds.getSize(new THREE.Vector3());
  model.position.sub(center); const pivot = new THREE.Group(); pivot.add(model); scene.add(pivot);
  if (url.includes("butterfly")) pivot.rotation.x = -.55;
  const scale = Math.max(size.x, size.y, size.z) || 1;
  camera.position.set(0, scale * .2, scale * 2.15); camera.lookAt(0, 0, 0);
  function draw() { if (active) renderer.render(scene, camera); }
  function resize() { const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); draw(); }
  const observer = new ResizeObserver(resize); observer.observe(host); resize();

  const canvas = renderer.domElement;
  canvas.setAttribute('aria-label','3D model. Drag to rotate, or use the arrow keys.'); canvas.tabIndex = 0;
  function down(e) { dragging = true; lastX = e.clientX; lastY = e.clientY; canvas.setPointerCapture(e.pointerId); }
  function move(e) { if (!dragging) return; pivot.rotation.y += (e.clientX-lastX)*.01; pivot.rotation.x += (e.clientY-lastY)*.01; lastX=e.clientX; lastY=e.clientY; draw(); }
  function up() { dragging = false; }
  function key(e) { if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) return; e.preventDefault(); if(e.key==='ArrowLeft') pivot.rotation.y-=.15; if(e.key==='ArrowRight') pivot.rotation.y+=.15; if(e.key==='ArrowUp') pivot.rotation.x-=.15; if(e.key==='ArrowDown') pivot.rotation.x+=.15; draw(); }
  canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move); canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up); canvas.addEventListener('keydown', key);
  return () => { active=false; observer.disconnect(); scene.traverse(o => { if(o.geometry) o.geometry.dispose(); if(o.material) (Array.isArray(o.material)?o.material:[o.material]).forEach(m => { Object.values(m).forEach(v => { if (v && v.isTexture) v.dispose(); }); m.dispose(); }); }); renderer.dispose(); };
}
