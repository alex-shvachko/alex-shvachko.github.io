import * as THREE from '../vendor/three.module.js';

const damp = (rate, dt) => 1 - Math.exp(-rate * dt);

/**
 * The postman robot, rigged in Blender as a skinned mesh. Everything except the
 * right arm ships in its final seated pose; the right arm is exported at rest so
 * it can be aimed here, at the cursor, every frame.
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
      o.castShadow = true;
      o.receiveShadow = true;
      o.frustumCulled = false;          // skinned bounds go stale as the arm moves
      const mat = o.material;
      if (mat?.name === 'RP_Cyan_Display') this.screen = o;
    });

    this.bones = {};
    this.root.traverse(o => {
      if (o.isBone) this.bones[o.name] = o;
    });
    this.shoulder = this.bones.Shoulder_R;
    this.elbow = this.bones.Elbow_R;
    this.wrist = this.bones.Wrist_R;

    // Rest state of the free arm, captured before anything aims it.
    this.root.updateMatrixWorld(true);
    this.restShoulderQ = this.shoulder.quaternion.clone();
    this.restElbowQ = this.elbow.quaternion.clone();
    const s = this.shoulder.getWorldPosition(new THREE.Vector3());
    const e = this.elbow.getWorldPosition(new THREE.Vector3());
    const w = this.wrist.getWorldPosition(new THREE.Vector3());
    this.restDir = e.clone().sub(s).normalize();
    this.upperLength = e.distanceTo(s);
    this.foreLength = w.distanceTo(e);

    this.aim = this.restDir.clone();
    this._v = Array.from({ length: 4 }, () => new THREE.Vector3());
    this._q = Array.from({ length: 4 }, () => new THREE.Quaternion());
  }

  /** World position the fingertips currently point from. */
  handPosition(out = new THREE.Vector3()) {
    return this.wrist.getWorldPosition(out);
  }

  /**
   * Swing the free arm toward a world-space target. The shoulder aims along the
   * line to the target and the elbow keeps a soft bend, so the pose reads as a
   * deliberate point rather than a stiff rod.
   */
  pointAt(target, dt) {
    const shoulder = this.shoulder;
    const parent = shoulder.parent;
    const s = shoulder.getWorldPosition(this._v[0]);
    const want = this._v[1].subVectors(target, s);
    if (want.lengthSq() < 1e-6) return;
    want.normalize();

    // Ease the aim direction itself; slerping the quaternion alone can swing the
    // arm the long way round when the cursor crosses behind the shoulder.
    this.aim.lerp(want, damp(5.5, dt)).normalize();

    const parentQ = parent.getWorldQuaternion(this._q[0]);
    const invParentQ = this._q[1].copy(parentQ).invert();

    const swing = this._q[2].setFromUnitVectors(this.restDir, this.aim);
    shoulder.quaternion.copy(invParentQ).multiply(swing).multiply(parentQ)
      .multiply(this.restShoulderQ);

    // Soft elbow: bend away from the aim axis, opening up as the arm extends.
    const reach = target.distanceTo(s) / (this.upperLength + this.foreLength);
    const bend = THREE.MathUtils.lerp(0.55, 0.12, THREE.MathUtils.clamp(reach, 0, 1));
    shoulder.updateMatrixWorld(true);
    const axis = this._v[2].set(0, 1, 0).cross(this.aim);
    if (axis.lengthSq() < 1e-6) axis.set(1, 0, 0);
    axis.normalize();
    // The elbow's parent is the shoulder we just rotated, so read its world
    // rotation back rather than reusing the torso's.
    const shoulderQ = shoulder.getWorldQuaternion(this._q[3]);
    const invShoulderQ = this._q[1].copy(shoulderQ).invert();
    const bendQ = this._q[2].setFromAxisAngle(axis, bend);
    this.elbow.quaternion.copy(invShoulderQ).multiply(bendQ).multiply(shoulderQ)
      .multiply(this.restElbowQ);
  }
}
