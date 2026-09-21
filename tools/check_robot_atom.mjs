import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as THREE from '../assets/js/vendor/three.module.js';
import { Robot } from '../assets/js/scene/robot.js';

const bytes = fs.readFileSync(new URL('../assets/models/robot-atom.glb', import.meta.url));
assert.equal(bytes.toString('utf8', 0, 4), 'glTF', 'not a GLB file');
const jsonLength = bytes.readUInt32LE(12);
const gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString());
const names = new Set(gltf.nodes.map(node => node.name));

for (const name of ['RobotAtom_Rig', 'root', 'head', 'hand.L', 'hand.R', 'thigh.L', 'thigh.R']) {
  assert(names.has(name), `missing Robot Atom bone: ${name}`);
}
assert(gltf.skins?.length, 'Robot Atom has no skin');
assert(gltf.animations?.length, 'Robot Atom rig export has no animation data');
assert(bytes.length < 5_000_000, `Robot Atom payload is too large: ${bytes.length}`);

const joints = new Set(gltf.skins.flatMap(skin => skin.joints));
const nodes = gltf.nodes.map((node, index) => {
  const object = joints.has(index) ? new THREE.Bone() : new THREE.Group();
  // Mirror GLTFLoader: three sanitizes every node name, so the bone map this
  // builds has the same keys the browser will see ("hand.R" -> "handR").
  object.name = THREE.PropertyBinding.sanitizeNodeName(node.name || '');
  if (node.translation) object.position.fromArray(node.translation);
  if (node.rotation) object.quaternion.fromArray(node.rotation);
  if (node.scale) object.scale.fromArray(node.scale);
  return object;
});
gltf.nodes.forEach((node, index) => node.children?.forEach(child => nodes[index].add(nodes[child])));
const scene = new THREE.Group();
gltf.scenes[gltf.scene || 0].nodes.forEach(index => scene.add(nodes[index]));
const robot = new Robot({ scene, animations: gltf.animations });
robot.idle(0);
robot.idle(1 / 60);
robot.pointAt(new THREE.Vector3(-2, 1, 2), 1 / 60);
robot.watch(new THREE.Vector3());
assert(robot.atom, 'Robot Atom did not use its web animation bridge');
assert(Number.isFinite(robot.handPosition().length()), 'Robot Atom hand target is invalid');
assert.equal(robot.mixer, undefined, 'Robot Atom should not play its walk animation');
console.log(`PASS: ${bytes.length.toLocaleString()} byte Robot Atom GLB, ${gltf.animations.length} animation clip(s), pointing bridge.`);
