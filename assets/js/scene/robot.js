import * as THREE from '../vendor/three.module.js';

const damp = (rate, dt) => 1 - Math.exp(-rate * dt);
const clamp = THREE.MathUtils.clamp;

/**
 * The postman robot, rigged in Blender as one skinned mesh. Everything except
 * the right arm and the head ships in its final seated pose; those two are
 * exported at rest so they can be driven here.
 *
 * Bone maths note: in the rest pose the upper arm and the forearm both point
 * along the same axis (the arm is straight in the T-pose it was rigged from).
 * So a single `restDir` describes both, and aiming a bone is just the swing
 * that takes `restDir` to the direction we want, applied on top of that bone's
 * rest world rotation.
 */
export class Robot {
  static async load(loader, url) {
    const gltf = await loader.loadAsync(url);
    return new Robot(gltf);
  }

  constructor(gltf) {
    this.root = gltf.scene;
    this.root.traverse(o => {
      if (!o.isMesh) return;
      o.castShadow = false;              // only the canopy casts
      o.receiveShadow = true;
      o.frustumCulled = false;           // skinned bounds go stale as the arm moves
      if (Array.isArray(o.material)) {
        this.screen = o.material.some(m => m.name === 'RP_Cyan_Display') ? o : this.screen;
      } else if (o.material?.name === 'RP_Cyan_Display') {
        this.screen = o;
      }
      this.mesh = o;
    });

    this.bones = {};
    this.root.traverse(o => { if (o.isBone) this.bones[o.name] = o; });
    this.shoulder = this.bones.Shoulder_R;
    this.elbow = this.bones.Elbow_R;
    this.wrist = this.bones.Wrist_R;
    this.head = this.bones.Head;

    this.root.updateMatrixWorld(true);

    // Rest state, captured before anything moves.
    const s = this.shoulder.getWorldPosition(new THREE.Vector3());
    const e = this.elbow.getWorldPosition(new THREE.Vector3());
    const w = this.wrist.getWorldPosition(new THREE.Vector3());
    this.restDir = e.clone().sub(s).normalize();
    this.upperLength = e.distanceTo(s);
    this.foreLength = w.distanceTo(e);
    this.restShoulderWorldQ = this.shoulder.getWorldQuaternion(new THREE.Quaternion());
    this.restElbowWorldQ = this.elbow.getWorldQuaternion(new THREE.Quaternion());
    this.restHeadWorldQ = this.head.getWorldQuaternion(new THREE.Quaternion());
    this.restHeadDir = new THREE.Vector3(0, 0, 1)
      .applyQuaternion(this.restHeadWorldQ).normalize();

    this.aim = this.restDir.clone();
    this.gaze = this.restHeadDir.clone();
    this.frozen = false;

    // A generous invisible target on the fingertip. It is parented to the wrist
    // bone, so it tracks the hand instead of drifting off it as the arm moves.
    this.perch = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 10, 8),
      new THREE.MeshBasicMaterial({ visible: false }));
    this.perch.name = 'HandPerch';
    this.perch.position.set(-0.24, 0, 0);
    this.wrist.add(this.perch);

    // A cheap invisible volume standing in for his body when testing whether
    // the cursor is on him. Raycasting the skinned mesh itself would mean
    // transforming 55k vertices by the skeleton on every pointer move.
    this.body = new THREE.Mesh(
      new THREE.BoxGeometry(1.35, 2.0, 1.25),
      new THREE.MeshBasicMaterial({ visible: false }));
    this.body.name = 'BodyProxy';
    this.body.position.set(0, 1.0, 0);
    this.root.add(this.body);

    this._v = Array.from({ length: 8 }, () => new THREE.Vector3());
    this._q = Array.from({ length: 6 }, () => new THREE.Quaternion());
  }

  /** World position of the fingertip the butterfly perches on. */
  handPosition(out = new THREE.Vector3()) {
    return this.perch.getWorldPosition(out);
  }

  /** Apply a world-space swing to a bone, on top of its rest world rotation. */
  _swing(bone, parentWorldQ, restWorldQ, dir) {
    const swing = this._q[4].setFromUnitVectors(this.restDir, dir);
    const world = this._q[5].copy(swing).multiply(restWorldQ);
    bone.quaternion.copy(this._q[3].copy(parentWorldQ).invert()).multiply(world);
    return world;
  }

  /**
   * Two-bone IK. The elbow is solved from the triangle formed by the upper arm,
   * the forearm and the line to the target, so the joint bends by a real angle
   * that opens as he reaches and closes as the target comes near - rather than
   * a fixed bend that reads as a stiff rod.
   */
  pointAt(target, dt) {
    if (this.frozen) return;
    const S = this.shoulder.getWorldPosition(this._v[0]);
    const toTarget = this._v[1].subVectors(target, S);
    const reach = toTarget.length();
    if (reach < 1e-5) return;
    toTarget.normalize();
    this.aim.lerp(toTarget, damp(5.5, dt)).normalize();

    const a = this.upperLength;
    const b = this.foreLength;
    // Keep the triangle solvable: never fully locked out, never folded flat.
    const L = clamp(reach, Math.abs(a - b) + 0.04, (a + b) * 0.985);

    // Pole vector: the elbow hangs down and slightly back, as a real arm does.
    const pole = this._v[2].set(0, -1, -0.45).normalize();
    const axis = this._v[3].crossVectors(this.aim, pole);
    if (axis.lengthSq() < 1e-8) axis.set(0, 0, 1);
    axis.normalize();

    const alpha = Math.acos(clamp((a * a + L * L - b * b) / (2 * a * L), -1, 1));
    const upperDir = this._v[4].copy(this.aim)
      .applyQuaternion(this._q[0].setFromAxisAngle(axis, -alpha)).normalize();

    // Elbow position follows from the upper arm, and the forearm simply points
    // from there at the (clamped) target.
    const elbowPos = this._v[5].copy(S).addScaledVector(upperDir, a);
    const goal = this._v[6].copy(S).addScaledVector(this.aim, L);
    const foreDir = this._v[7].subVectors(goal, elbowPos);
    if (foreDir.lengthSq() < 1e-8) foreDir.copy(upperDir);
    foreDir.normalize();

    const parentQ = this.shoulder.parent.getWorldQuaternion(this._q[1]);
    const shoulderWorld = this._swing(
      this.shoulder, parentQ, this.restShoulderWorldQ, upperDir).clone();
    this._swing(this.elbow, shoulderWorld, this.restElbowWorldQ, foreDir);
  }

  /**
   * Turn the head to watch a target, within a believable cone so something
   * behind him never twists the neck round.
   */
  watch(target, dt, maxAngle = 1.0) {
    const p = this.head.getWorldPosition(this._v[0]);
    const want = this._v[1].subVectors(target, p);
    if (want.lengthSq() < 1e-6) return;
    want.normalize();

    const angle = Math.acos(clamp(want.dot(this.restHeadDir), -1, 1));
    if (angle > maxAngle) {
      const axis = this._v[2].crossVectors(this.restHeadDir, want);
      if (axis.lengthSq() > 1e-8) {
        want.copy(this.restHeadDir)
          .applyQuaternion(this._q[0].setFromAxisAngle(axis.normalize(), maxAngle));
      }
    }
    this.gaze.lerp(want, damp(4.0, dt)).normalize();

    const parentQ = this.head.parent.getWorldQuaternion(this._q[1]);
    const swing = this._q[2].setFromUnitVectors(this.restHeadDir, this.gaze);
    const world = this._q[3].copy(swing).multiply(this.restHeadWorldQ);
    this.head.quaternion.copy(this._q[4].copy(parentQ).invert()).multiply(world);
  }
}
