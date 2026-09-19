import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as THREE from '../assets/js/vendor/three.module.js';
import { Robot } from '../assets/js/scene/robot.js';

// Read the shipped GLB's actual joint hierarchy; geometry compression does not
// affect transforms, so this test needs neither a browser nor a Draco worker.
const bytes = fs.readFileSync(new URL('../assets/models/robot-postman-refined.glb', import.meta.url));
const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
function loadRig() {
  const joints = new Set(gltf.skins.flatMap(s => s.joints));
  const nodes = gltf.nodes.map((n, i) => {
    const o = joints.has(i) ? new THREE.Bone() : new THREE.Group();
    o.name = n.name || '';
    if (n.matrix) new THREE.Matrix4().fromArray(n.matrix).decompose(o.position, o.quaternion, o.scale);
    if (n.translation) o.position.fromArray(n.translation);
    if (n.rotation) o.quaternion.fromArray(n.rotation);
    if (n.scale) o.scale.fromArray(n.scale);
    return o;
  });
  gltf.nodes.forEach((n, i) => n.children?.forEach(c => nodes[i].add(nodes[c])));
  const scene = new THREE.Group();
  gltf.scenes[gltf.scene || 0].nodes.forEach(i => scene.add(nodes[i]));
  return new Robot({ scene });
}
let samples = 0, minAngle = Infinity, maxAngle = 0;
for (const rotation of [0, -0.34, 1.1]) {
  const robot = loadRig();
  const restTorsoWorldQ = robot.torso.getWorldQuaternion(new THREE.Quaternion());
  robot.root.position.set(1.28, 0.30, 3.95);
  robot.root.rotation.y = rotation;
  // Include behind, both sides, near, overhead and alternating abrupt jumps.
  const targets = [[-5,2,6],[7,2,6],[0,2,-8],[0,12,4],[0,-6,4],
    [1.28,1.94,3.95],[-8,2,4],[8,2,4],[-8,2,4],[8,2,4]];
  for (const xyz of targets) for (let i = 0; i < 100; i++) {
    const t = samples / 60;
    robot.idle(t);
    robot.pointAt(new THREE.Vector3(...xyz), 1 / 60, t);
    robot.root.updateMatrixWorld(true);
    const s = robot.shoulder.getWorldPosition(new THREE.Vector3());
    const e = robot.elbow.getWorldPosition(new THREE.Vector3());
    const w = robot.wrist.getWorldPosition(new THREE.Vector3());
    const inv = robot.torso.getWorldQuaternion(new THREE.Quaternion())
      .multiply(restTorsoWorldQ.clone().invert()).invert();
    const elbow = e.clone().sub(s).applyQuaternion(inv);
    const wrist = w.clone().sub(s).applyQuaternion(inv);
    assert(elbow.z > 0.025, `elbow behind body: ${elbow.toArray()}`);
    assert(elbow.x < -0.02, `elbow inside torso: ${elbow.toArray()}`);
    assert(wrist.z > 0.035, `wrist behind body: ${wrist.toArray()}`);
    assert(Math.abs(e.distanceTo(s) - robot.upperLength) < 1e-6, 'upper arm stretched');
    assert(Math.abs(w.distanceTo(e) - robot.foreLength) < 1e-6, 'forearm stretched');
    const angle = robot.elbowAngle();
    assert(Number.isFinite(angle) && angle > 0.10 && angle < 2.65, `bad elbow angle ${angle}`);
    minAngle = Math.min(minAngle, angle); maxAngle = Math.max(maxAngle, angle);
    samples++;
  }
  const before = robot.shoulder.quaternion.clone();
  robot.frozen = true;
  robot.pointAt(new THREE.Vector3(20,10,-20), 1, 5);
  assert(before.equals(robot.shoulder.quaternion), 'perched arm moved');
}
console.log(`PASS: ${samples} poses, three root rotations, no backward elbow/torso crossing, fixed limb lengths, frozen perch. Elbow flexion ${(minAngle*180/Math.PI).toFixed(1)}–${(maxAngle*180/Math.PI).toFixed(1)} degrees.`);
