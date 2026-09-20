import * as THREE from '../vendor/three.module.js';

const damp = (rate, dt) => 1 - Math.exp(-rate * dt);
const clamp = THREE.MathUtils.clamp;

/**
 * The scene's character wrapper. Robot Atom uses its exported in-place walk;
 * the legacy branch retains the bespoke articulated pose controls.
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

    // Robot Atom is exported with its own compact biped rig and an in-place
    // walk. It is intentionally handled without the postman's bespoke arm IK.
    // The shared perch/body interfaces keep the butterfly interaction intact.
    // Names arrive sanitized: three strips [].:/ from every glTF node name, so
    // the exported "hand.R" is the bone called "handR" here.
    const handR = this.bones[THREE.PropertyBinding.sanitizeNodeName('hand.R')];
    if (handR) {
      this.atom = true;
      this.handBone = handR;
      this.perch = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 10, 8),
        new THREE.MeshBasicMaterial({ visible: false }));
      this.perch.name = 'HandPerch';
      this.handBone.add(this.perch);
      this.body = new THREE.Mesh(
        new THREE.BoxGeometry(1.05, 2.05, 0.9),
        new THREE.MeshBasicMaterial({ visible: false }));
      this.body.name = 'BodyProxy';
      this.body.position.set(0, 1.02, 0);
      this.root.add(this.body);
      if (gltf.animations.length) {
        this.mixer = new THREE.AnimationMixer(this.root);
        this.mixer.clipAction(gltf.animations[0]).play();
      }
      this.frozen = false;
      this._atomLastT = null;
      return;
    }
    this.shoulder = this.bones.Shoulder_R;
    this.elbow = this.bones.Elbow_R;
    this.wrist = this.bones.Wrist_R;
    this.head = this.bones.Head;
    this.neck = this.bones.Neck;
    this.torso = this.bones.Torso;

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
    this.restTorsoWorldQ = this.torso.getWorldQuaternion(new THREE.Quaternion());
    this.armFrame = new THREE.Quaternion();
    this.restHeadWorldQ = this.head.getWorldQuaternion(new THREE.Quaternion());
    this.restHeadDir = new THREE.Vector3(0, 0, 1)
      .applyQuaternion(this.restHeadWorldQ).normalize();

    // Idle motion is layered on top of whatever pose was exported, so each of
    // these bones keeps its seated rotation and only receives a small delta.
    this.restLocalQ = new Map();
    for (const bone of [this.torso, this.neck, this.wrist]) {
      if (bone) this.restLocalQ.set(bone, bone.quaternion.clone());
    }

    // Finger bones, if the rig has them. Held loosely so an older export that
    // binds the fingers rigidly to the wrist still loads and simply has no curl.
    this.fingers = [];
    for (const key of Object.keys(this.bones)) {
      if (!/^(Finger_\d+|Thumb)_(Prox|Dist)_R$/.test(key)) continue;
      const bone = this.bones[key];
      this.restLocalQ.set(bone, bone.quaternion.clone());
      this.fingers.push({
        bone,
        rest: bone.quaternion.clone(),
        // The distal joint leads the curl, and each digit is offset in phase so
        // the hand never closes as one rigid paddle.
        gain: key.includes('Dist') ? 1.35 : 0.85,
        phase: this.fingers.length * 0.62 + (key.startsWith('Thumb') ? 1.9 : 0),
        thumb: key.startsWith('Thumb'),
      });
    }

    this.aim = new THREE.Vector3(-0.65, -0.12, 0.75).normalize();
    this.gaze = this.restHeadDir.clone();
    this.extend = 1;
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
    this._q = Array.from({ length: 8 }, () => new THREE.Quaternion());
    this._e = new THREE.Euler();
  }

  /** World position of the fingertip the butterfly perches on. */
  handPosition(out = new THREE.Vector3()) {
    return this.perch.getWorldPosition(out);
  }

  /** Aim from the bind torso frame, then convert back to the bone's parent. */
  _swing(bone, parentWorldQ, restWorldQ, dir) {
    const swing = this._q[4].setFromUnitVectors(this.restDir, dir);
    const world = this._q[5].copy(this.armFrame).multiply(swing).multiply(restWorldQ);
    bone.quaternion.copy(this._q[3].copy(parentWorldQ).invert()).multiply(world);
    return world;
  }

  /**
   * Breathing and small weight shifts. Nothing here is doing a job; it exists so
   * that a machine sitting still still reads as a machine that is running.
   */
  idle(t) {
    if (this.atom) {
      const dt = this._atomLastT === null ? 0 : Math.min(t - this._atomLastT, 0.05);
      this._atomLastT = t;
      if (!this.frozen) this.mixer?.update(dt);
      return;
    }
    const delta = this._q[6];
    const e = this._e;
    if (this.torso) {
      e.set(Math.sin(t * 0.62) * 0.013,
            Math.sin(t * 0.41) * 0.020,
            Math.sin(t * 0.53 + 2.1) * 0.011);
      this.torso.quaternion.copy(this.restLocalQ.get(this.torso))
        .multiply(delta.setFromEuler(e));
    }
    if (this.neck) {
      e.set(Math.sin(t * 0.77 + 1.2) * 0.022, Math.sin(t * 0.52) * 0.030,
            Math.sin(t * 0.94) * 0.014);
      this.neck.quaternion.copy(this.restLocalQ.get(this.neck))
        .multiply(delta.setFromEuler(e));
    }
    if (this.wrist && this.restLocalQ.has(this.wrist)) {
      e.set(Math.sin(t * 0.85 + 0.4) * 0.10, Math.sin(t * 1.21) * 0.07,
            Math.sin(t * 0.67 + 2.6) * 0.13);
      this.wrist.quaternion.copy(this.restLocalQ.get(this.wrist))
        .multiply(delta.setFromEuler(e));
    }
    // Fingers: a slow, uneven curl, plus a faint tremor, so the hand is alive
    // even when the arm is holding a pose.
    for (const f of this.fingers) {
      const curl = (Math.sin(t * 0.58 + f.phase) * 0.5 + 0.5) * 0.34
        + Math.sin(t * 2.7 + f.phase * 2.2) * 0.018;
      e.set(0, 0, curl * f.gain * (f.thumb ? -0.7 : 1));
      f.bone.quaternion.copy(f.rest).multiply(delta.setFromEuler(e));
    }
  }

  /**
   * Two-bone IK. The elbow is solved from the triangle formed by the upper arm,
   * the forearm and the line to the target.
   *
   * The subtlety is that the thing he is reaching for is nearly always further
   * away than his arm is long. Feeding the true distance into the triangle
   * pinned the elbow at full extension on every single frame, so the arm read as
   * one rigid rod. What drives the joint instead is how far the target is
   * relative to a comfortable working range: near things bring the elbow in,
   * far things open it out, and a slow breath keeps it from ever being still.
   */
  pointAt(target, dt, t = 0) {
    if (this.atom) return;
    if (this.frozen) return;
    const S = this.shoulder.getWorldPosition(this._v[0]);
    const toTarget = this._v[1].subVectors(target, S);
    const reach = toTarget.length();
    if (reach < 1e-5) return;
    // Solve in the bind torso frame: root placement and breathing must rotate
    // the limits as well as the arm. +Z is forward, -X is his right side.
    this.armFrame.copy(this.torso.getWorldQuaternion(this._q[7]))
      .multiply(this._q[0].copy(this.restTorsoWorldQ).invert());
    toTarget.applyQuaternion(this._q[0].copy(this.armFrame).invert()).normalize();
    const yaw = clamp(Math.atan2(toTarget.x, toTarget.z), -1.30, 1.10);
    const pitch = clamp(Math.asin(clamp(toTarget.y, -1, 1)), -0.60, 0.65);
    toTarget.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch),
      Math.cos(yaw) * Math.cos(pitch));
    this.aim.lerp(toTarget, damp(5.5, dt)).normalize();

    const a = this.upperLength;
    const b = this.foreLength;
    const span = a + b;

    const want = THREE.MathUtils.smoothstep(reach, span * 1.1, span * 4.4);
    this.extend += (want - this.extend) * damp(2.6, dt);
    const breath = Math.sin(t * 0.73) * 0.045 + Math.sin(t * 1.31 + 1.1) * 0.025;
    // Never fully locked out, never folded flat: both ends of that range would
    // make the triangle degenerate.
    const L = span * clamp(
      THREE.MathUtils.lerp(0.55, 0.90, this.extend) + breath, 0.50, 0.94);

    // Keep the elbow down and outside the rib cage, with a forward bias.
    const pole = this._v[2].set(-0.65, -1, 0.35).normalize();
    const axis = this._v[3].crossVectors(this.aim, pole);
    if (axis.lengthSq() < 1e-8) axis.set(0, 0, 1);
    axis.normalize();

    const alpha = Math.acos(clamp((a * a + L * L - b * b) / (2 * a * L), -1, 1));
    const upperDir = this._v[4].copy(this.aim)
      .applyQuaternion(this._q[0].setFromAxisAngle(axis, alpha)).normalize();
    // Anatomical stop: no humerus behind the shoulder or through the torso,
    // including during a rapid sweep from one side of the screen to the other.
    upperDir.x = Math.min(upperDir.x, -0.12);
    upperDir.z = Math.max(upperDir.z, 0.20);
    upperDir.normalize();

    // Elbow position follows from the upper arm, and the forearm simply points
    // from there at the goal the extension chose.
    const elbowPos = this._v[5].copy(upperDir).multiplyScalar(a);
    const goal = this._v[6].copy(this.aim).multiplyScalar(L);
    const foreDir = this._v[7].subVectors(goal, elbowPos);
    if (foreDir.lengthSq() < 1e-8) foreDir.copy(upperDir);
    foreDir.normalize();

    const parentQ = this.shoulder.parent.getWorldQuaternion(this._q[1]);
    this._swing(this.shoulder, parentQ, this.restShoulderWorldQ, upperDir);
    const shoulderWorld = this.shoulder.getWorldQuaternion(this._q[2]);
    this._swing(this.elbow, shoulderWorld, this.restElbowWorldQ, foreDir);
  }

  /** The angle at the elbow, in radians. Straight is 0. Used by the tests. */
  elbowAngle() {
    if (this.atom) return 0;
    const s = this.shoulder.getWorldPosition(this._v[0]);
    const e = this.elbow.getWorldPosition(this._v[1]);
    const w = this.wrist.getWorldPosition(this._v[2]);
    const u = this._v[3].subVectors(e, s).normalize();
    const f = this._v[4].subVectors(w, e).normalize();
    return Math.acos(clamp(u.dot(f), -1, 1));
  }

  /**
   * Turn the head to watch a target, within a believable cone so something
   * behind him never twists the neck round.
   */
  watch(target, dt, maxAngle = 1.0) {
    if (this.atom) return;
    // The torso still breathes while a perched butterfly holds the arm still.
    this.armFrame.copy(this.torso.getWorldQuaternion(this._q[7]))
      .multiply(this._q[0].copy(this.restTorsoWorldQ).invert());
    const p = this.head.getWorldPosition(this._v[0]);
    const want = this._v[1].subVectors(target, p);
    if (want.lengthSq() < 1e-6) return;
    want.normalize();
    want.applyQuaternion(this._q[0].copy(this.armFrame).invert());

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
    const world = this._q[3].copy(this.armFrame).multiply(swing).multiply(this.restHeadWorldQ);
    this.head.quaternion.copy(this._q[4].copy(parentQ).invert()).multiply(world);
  }
}
