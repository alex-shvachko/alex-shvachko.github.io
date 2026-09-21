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
robot.watch(new THREE.Vector3(), 1 / 60);
assert(robot.atom, 'Robot Atom did not use its web animation bridge');
assert(Number.isFinite(robot.handPosition().length()), 'Robot Atom hand target is invalid');
assert.equal(robot.mixer, undefined, 'Robot Atom should not play its walk animation');
console.log(`PASS: ${bytes.length.toLocaleString()} byte Robot Atom GLB, ${gltf.animations.length} animation clip(s), pointing bridge.`);

// Exercise the actual Atom joints after placement, including rapid target jumps.
const chestRest = robot.bones.chest.quaternion.clone();
const shoulderRest = robot.shoulder.quaternion.clone();
const headStart = robot.head.quaternion.clone();
robot.watch(new THREE.Vector3(3, 2, 4), 1);
assert(robot.head.quaternion.angleTo(headStart) > 0.01, 'head must track');
assert(robot.bones.chest.quaternion.equals(chestRest), 'head moved chest');
assert(robot.shoulder.quaternion.equals(shoulderRest), 'head moved shoulder');
for (const rotation of [0, -0.34, 1.1]) {
  robot.root.rotation.y = rotation;
  robot.root.position.set(1.28, 0.30, 3.95);
  for (const xyz of [[-5, 2, 6], [7, 2, 6], [0, 12, 4], [0, -6, 4]]) {
    for (let frame = 0; frame < 100; frame++) robot.pointAt(new THREE.Vector3(...xyz), 1 / 60, frame / 60);
    const shoulder = robot.shoulder.getWorldPosition(new THREE.Vector3());
    const elbow = robot.elbow.getWorldPosition(new THREE.Vector3());
    const wrist = robot.wrist.getWorldPosition(new THREE.Vector3());
    assert(Math.abs(shoulder.distanceTo(elbow) - robot.upperLength) < 1e-5, 'upper arm stretched');
    assert(Math.abs(elbow.distanceTo(wrist) - robot.foreLength) < 1e-5, 'forearm stretched');
    const fore = wrist.sub(elbow).normalize();
    const expected = robot._v[7].clone().applyQuaternion(robot.armFrame);
    assert(fore.dot(expected) > 0.999, 'forearm misses solved direction');
    assert(robot.elbowAngle() > 0.1, 'elbow locked');
  }
}
console.log('PASS: Atom head isolation, 1200 placed arm poses, separate forearm axis and fixed limb lengths.');
