import fs from 'node:fs';
import vm from 'node:vm';
import { registerHooks } from 'node:module';
import assert from 'node:assert/strict';
import * as THREE from '../assets/js/vendor/three.module.js';
import { Robot } from '../assets/js/scene/robot.js';

const bytes = fs.readFileSync(new URL('../assets/models/robot-atom.glb', import.meta.url));
const length = bytes.readUInt32LE(12);
const gltf = JSON.parse(bytes.subarray(20, 20 + length));
const binary = bytes.subarray(28 + length);
const module = { exports: {} };
vm.runInNewContext(fs.readFileSync(new URL('../assets/js/vendor/addons/libs/draco/draco_decoder.js', import.meta.url), 'utf8'),
  { module, exports: module.exports, console, setTimeout, clearTimeout, TextDecoder });
const draco = await module.exports({});
const primitive = gltf.meshes[0].primitives.find(p => gltf.materials[p.material].name === 'RobotBlack');
const ext = primitive.extensions.KHR_draco_mesh_compression;
const view = gltf.bufferViews[ext.bufferView];
const data = binary.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength);
const decoder = new draco.Decoder(), buffer = new draco.DecoderBuffer(), mesh = new draco.Mesh();
buffer.Init(new Int8Array(data), data.length);
assert(decoder.DecodeBufferToMesh(buffer, mesh).ok());
const values = new draco.DracoFloat32Array();
decoder.GetAttributeFloatForAllPoints(mesh, decoder.GetAttributeByUniqueId(mesh, ext.attributes.POSITION), values);
const position = Float32Array.from({ length: mesh.num_points() * 3 }, (_, i) => values.GetValue(i));
const face = new draco.DracoInt32Array(), index = [];
for (let i = 0; i < mesh.num_faces(); i++) {
  decoder.GetFaceFromMesh(mesh, i, face);
  index.push(face.GetValue(0), face.GetValue(1), face.GetValue(2));
}
const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
geometry.setIndex(index);
const material = new THREE.MeshStandardMaterial({ name: 'RobotBlack' });
const screenMesh = new THREE.Mesh(geometry, material);
const joints = new Set(gltf.skins.flatMap(skin => skin.joints));
const nodes = gltf.nodes.map((node, i) => {
  const obj = joints.has(i) ? new THREE.Bone() : new THREE.Group();
  obj.name = THREE.PropertyBinding.sanitizeNodeName(node.name || '');
  if (node.translation) obj.position.fromArray(node.translation);
  if (node.rotation) obj.quaternion.fromArray(node.rotation);
  if (node.scale) obj.scale.fromArray(node.scale);
  if (node.mesh !== undefined) obj.add(screenMesh);
  return obj;
});
gltf.nodes.forEach((node, i) => node.children?.forEach(child => nodes[i].add(nodes[child])));
const scene = new THREE.Group();
gltf.scenes[gltf.scene || 0].nodes.forEach(i => scene.add(nodes[i]));
const robot = new Robot({ scene, animations: [] });
assert(robot.screenMaterial?.emissive.b > robot.screenMaterial.emissive.g * 3, 'display must emit blue');
assert.equal(geometry.index.count, index.length, 'screen split must preserve all triangles');
assert(geometry.groups[1].count > 24, 'actual front display was not isolated');
assert(geometry.groups[0].count > geometry.groups[1].count, 'chassis must remain black');
const center = robot.screenAnchor.getWorldPosition(new THREE.Vector3());
assert(center.y > 1.98 && center.y < 2.1 && center.z > 0.06, 'camera anchor must sit on the front display');
for (const rotation of [-0.34, 0, 0.5]) {
  robot.root.rotation.y = rotation;
  const target = new THREE.Vector3(2.7, 3.65, 12.4);
  for (let i = 0; i < 180; i++) robot.watch(target, 1 / 60, Math.PI);
  const actual = new THREE.Vector3(0, 0, 1).applyQuaternion(robot.head.getWorldQuaternion(new THREE.Quaternion()));
  const wanted = target.clone().sub(robot.head.getWorldPosition(new THREE.Vector3())).normalize();
  assert(actual.angleTo(wanted) < 0.001, 'head must face the viewer regardless of root rotation');
}
console.log(`PASS: real Draco display split (${geometry.groups[1].count / 3} triangles), blue emission, camera anchor, gaze alignment at three root rotations.`);
for (const value of [face, values, mesh, buffer, decoder]) draco.destroy(value);


registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === 'three') return { url: new URL('../assets/js/vendor/three.module.js', import.meta.url).href, shortCircuit: true };
  return nextResolve(specifier, context);
} });
const { buildGlassMenu } = await import('../assets/js/scene/glassbranch.js');
globalThis.matchMedia = () => ({ matches: false });
for (const [width, height] of [[390, 844], [1280, 720], [2560, 720]]) {
  const aspect = width / height;
  const home = aspect < 0.95 ? new THREE.Vector3(1.1, 4.1, 3.65 + Math.max(11.4, 7.6 / aspect))
    : new THREE.Vector3(2.7, 3.65, 3.6 + Math.max(8.8, 10.8 / aspect));
  const focus = aspect < 0.95 ? new THREE.Vector3(0.05, 2.05, 3.65) : new THREE.Vector3(1.35, 2.15, 3.6);
  const camera = new THREE.PerspectiveCamera(38, aspect, 0.02, 160);
  camera.position.copy(home);
  camera.lookAt(focus);
  const nav = { clientWidth: width, clientHeight: height, querySelector: () => null };
  const menu = buildGlassMenu(new THREE.Scene(), camera, nav, { home, focus });
  for (const drift of [-1, 0, 1]) {
    camera.position.copy(home).add(new THREE.Vector3(drift * 0.22, 0, -Math.abs(drift) * 0.25));
    camera.lookAt(focus.clone().add(new THREE.Vector3(drift * 0.18, 0, 0)));
    camera.updateMatrixWorld(true);
    menu.update(7, 1 / 60, { width, height });
    const end = menu.bough.localToWorld(new THREE.Vector3(8, 0.42, -0.18)).project(camera);
    assert(end.x > 1.05, `branch end visible at ${width}x${height}, drift ${drift}`);
  }
}
console.log('PASS: branch endpoint stays outside phone, desktop and ultrawide frames at both camera drift extremes.');
