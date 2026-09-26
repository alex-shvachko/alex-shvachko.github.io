// Adapted from the butterfly-room project: the flight model, landing logic and
// animation blending are unchanged. Only the flight plane is new - it now faces
// the scene camera instead of a fixed side-on wall, so the butterfly tracks the
// cursor from any orbit angle.
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/addons/loaders/GLTFLoader.js';

export const MOTION = {
  scale: 0.40,
  followSpeed: 2.4,       // Maximum flight speed, world units/second.
  followGain: 2.1,        // Desired speed per unit of target distance; eases arrival.
  steering: 4.2,         // Velocity response /second. Lower = more inertia.
  turnSmoothness: 4.0,   // Orientation response /second. Lower = longer turning delay.
  bobbing: 0.075,        // Vertical bob amplitude in world units; zero disables.
  bobFrequency: 1.4,     // Bob cycles/second.
  noise: 0.09,           // Smooth deterministic drift amplitude; zero disables.
  noiseFrequency: 0.65,  // Drift time scale; uses layered sine noise, never random jumps.
  bankAngle: 0.48,       // Maximum roll in radians (~27 degrees), toward a turn.
  landingSpeed: 0.65,    // Approach/descent speed cap in world units/second.
  landingHeight: 0.65,   // Approach point height along the surface normal.
  footClearance: 0.16,   // Asset-space body-to-foot distance, multiplied by scale.
  flapRate: 1.25,        // Fly clip playback multiplier at hover (clip = 2 Hz).
  flapSpeedGain: 1.1,    // Extra playback multiplier at maximum flight speed.
  fadeDuration: 0.45,    // Seconds to crossfade between Fly and Landed.
};

const UP = new THREE.Vector3(0, 1, 0);
const FORWARD = new THREE.Vector3(0, 0, 1);
const damp = (rate, dt) => 1 - Math.exp(-rate * dt);

export class ButterflyController {
  static async load(scene, url, options = {}) {
    const loader = options.loader ?? new GLTFLoader();
    const gltf = await loader.loadAsync(url);
    return new ButterflyController(scene, gltf, options);
  }

  constructor(scene, gltf, { zones = [], motion = {}, onStateChange = () => {},
                            focus = new THREE.Vector3(), bounds = null, home = null } = {}) {
    this.focus = focus.clone();
    this.bounds = bounds ?? new THREE.Box3(
      new THREE.Vector3(-4, 0.55, -4), new THREE.Vector3(4, 4.5, 4));
    this.motion = { ...MOTION, ...motion };
    this.zones = zones;
    const ids = new Set();
    for (const zone of zones) {
      if (!zone.id || ids.has(zone.id) || (!zone.mesh && !zone.position) || (zone.radius !== undefined && zone.radius <= 0)) {
        throw new Error('Each landing zone needs a unique ID, mesh or position, and a positive optional radius.');
      }
      ids.add(zone.id);
    }
    this.root = new THREE.Group();
    this.root.name = 'Butterfly flight root';
    this.root.add(gltf.scene);
    gltf.scene.scale.setScalar(this.motion.scale);
    gltf.scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
    scene.add(this.root);
    this.mixer = new THREE.AnimationMixer(gltf.scene);
    this.actions = {};
    for (const name of ['Fly', 'Landed']) {
      const clip = THREE.AnimationClip.findByName(gltf.animations, name);
      if (!clip) throw new Error(`Missing required GLB animation: ${name}`);
      this.actions[name] = this.mixer.clipAction(clip).setLoop(THREE.LoopRepeat, Infinity);
    }
    this.actions.Fly.play();
    this.root.position.copy(home ?? this.focus);
    this.target = this.root.position.clone();
    this.velocity = new THREE.Vector3();
    this.heading = new THREE.Vector3(1, 0, .08).normalize();
    this.root.quaternion.setFromUnitVectors(FORWARD, this.heading);
    this.raycaster = new THREE.Raycaster();
    // The flight plane is rebuilt each pointer move so it always faces the
    // camera through the focus point; a fixed wall would collapse the mapping
    // once the hero camera orbits away from a side-on view.
    this.flightPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    this.state = 'flying';
    this.landing = null;
    this.zoneArmed = true;
    this.time = 0;
    this.onStateChange = onStateChange;
    // Reused temporary values keep the render loop free of per-frame allocations.
    this.v = Array.from({ length: 7 }, () => new THREE.Vector3());
    this.matrix = new THREE.Matrix4();
    this.normalMatrix = new THREE.Matrix3();
    this.rotation = new THREE.Quaternion();
    this.roll = new THREE.Quaternion();
  }

  setState(state) {
    this.state = state;
    this.onStateChange(state, this.landing?.zone.id ?? null);
  }

  hitZone() {
    let nearest = null;
    for (const zone of this.zones) {
      let hit;
      if (zone.mesh) {
        zone.mesh.updateWorldMatrix(true, true);
        const h = this.raycaster.intersectObject(zone.mesh, true).find(hit => hit.face);
        if (!h?.face) continue;
        const normal = h.face.normal.clone().applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(h.object.matrixWorld));
        const center = zone.point ? zone.mesh.localToWorld(zone.point.clone()) : zone.mesh.getWorldPosition(new THREE.Vector3());
        if (zone.radius && h.point.distanceTo(center) > zone.radius) continue;
        if (normal.dot(this.raycaster.ray.direction) >= 0) continue;
        hit = { point: h.point.clone(), normal, object: h.object, distance: h.distance };
        // point is an optional mesh-local anchor; otherwise land at the actual hit.
        if (zone.point) {
          hit.point.copy(center);
          hit.object = zone.mesh;
          if (zone.normal) hit.normal.copy(zone.normal).applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(zone.mesh.matrixWorld));
        }
      } else {
        const normal = (zone.normal ?? UP).clone().normalize();
        const point = this.raycaster.ray.intersectPlane(new THREE.Plane().setFromNormalAndCoplanarPoint(normal, zone.position), new THREE.Vector3());
        if (!point || point.distanceTo(zone.position) > (zone.radius ?? 0.5)) continue;
        hit = { point: zone.position.clone(), normal, object: null, distance: this.raycaster.ray.origin.distanceTo(point) };
      }
      // Select only front-facing surfaces; back faces would land underneath.
      if (!zone.mesh && hit.normal.dot(this.raycaster.ray.direction) >= 0) continue;
      if (!nearest || hit.distance < nearest.distance) nearest = { ...hit, zone };
    }
    return nearest;
  }

  handlePointer(ndc, camera) {
    // The final descent is committed - interrupting it would mean never
    // settling - but the approach is not. Crossing one perch on the way to
    // another used to capture the butterfly there for good, which made the
    // robot impossible to pass on the way to the menu.
    if (this.state === 'landing' || this.state === 'landed') return;
    camera.updateMatrixWorld();
    this.raycaster.setFromCamera(ndc, camera);
    const hit = this.hitZone();
    if (!hit) this.zoneArmed = true;
    if (hit && this.zoneArmed) {
      if (this.state === 'flying' || hit.zone !== this.landing?.zone) this.selectLanding(hit);
      return;
    }
    // Nothing under the cursor any more: break off and fly again.
    if (this.state === 'approaching') {
      this.landing = null;
      this.setState('flying');
    }
    const normal = this.v[1].subVectors(camera.position, this.focus);
    normal.y *= 0.25;                       // keep the plane close to upright
    if (normal.lengthSq() < 1e-6) normal.set(0, 0, 1);
    this.flightPlane.setFromNormalAndCoplanarPoint(normal.normalize(), this.focus);
    const point = this.raycaster.ray.intersectPlane(this.flightPlane, this.v[0]);
    if (point) this.target.copy(point).clamp(this.bounds.min, this.bounds.max);
  }

  selectLanding(hit) {
    this.landing = { ...hit, heading: this.heading.clone() };
    if (hit.object) {
      this.landing.localPoint = hit.object.worldToLocal(hit.point.clone());
      // Inverse of the normal transform (M^-T) is M^T, including nonuniform scale.
      this.landing.localNormal = hit.normal.clone().applyMatrix3(new THREE.Matrix3().setFromMatrix4(hit.object.matrixWorld).transpose()).normalize();
    }
    this.setState('approaching');
  }

  surface() {
    const l = this.landing;
    if (l.object) {
      l.object.updateWorldMatrix(true, false);
      l.point.copy(l.localPoint).applyMatrix4(l.object.matrixWorld);
      l.normal.copy(l.localNormal).applyNormalMatrix(this.normalMatrix.getNormalMatrix(l.object.matrixWorld));
    }
    return l;
  }

  orient(forward, up, bank, dt) {
    const z = this.v[4].copy(forward).addScaledVector(up, -forward.dot(up));
    if (z.lengthSq() < 1e-6) z.set(1, 0, 0).addScaledVector(up, -up.x);
    if (z.lengthSq() < 1e-6) z.set(0, 0, 1).addScaledVector(up, -up.z);
    z.normalize();
    const x = this.v[5].crossVectors(up, z).normalize();
    this.matrix.makeBasis(x, this.v[6].crossVectors(z, x).normalize(), z);
    this.rotation.setFromRotationMatrix(this.matrix);
    this.rotation.multiply(this.roll.setFromAxisAngle(FORWARD, bank));
    this.root.quaternion.slerp(this.rotation, damp(this.motion.turnSmoothness, dt));
  }

  update(delta) {
    // Bounded substeps make steering stable at 30/60/144 Hz and on tab resume.
    let remaining = Math.min(Math.max(delta, 0), 0.1);
    while (remaining > 1e-7) {
      const dt = Math.min(remaining, 1 / 120);
      this.step(dt); remaining -= dt;
    }
  }

  step(dt) {
    const m = this.motion;
    this.time += dt;
    if (this.state === 'landed') {
      const l = this.surface();
      this.root.position.copy(l.point).addScaledVector(l.normal, m.footClearance * m.scale);
      this.orient(l.heading, l.normal, 0, dt);
      this.mixer.update(dt);
      return;
    }
    const goal = this.v[0].copy(this.target);
    let speedLimit = m.followSpeed;
    if (this.state === 'flying') {
      const t = this.time * m.noiseFrequency;
      goal.x += m.noise * (Math.sin(t * 1.71) + .4 * Math.sin(t * 3.13));
      goal.z += m.noise * Math.sin(t * 1.29 + 2);
      goal.y += m.bobbing * Math.sin(this.time * m.bobFrequency * Math.PI * 2);
    } else {
      const l = this.surface();
      goal.copy(l.point).addScaledVector(l.normal, m.footClearance*m.scale + (this.state === 'approaching' ? m.landingHeight : 0));
      speedLimit = m.landingSpeed;
      if (this.state === 'approaching' && this.root.position.distanceTo(goal) < .09 && this.velocity.length() < .2) this.setState('landing');
    }
    const desired = this.v[1].subVectors(goal, this.root.position).multiplyScalar(m.followGain).clampLength(0, speedLimit);
    this.velocity.lerp(desired, damp(m.steering, dt));
    this.root.position.addScaledVector(this.velocity, dt);
    const horizontal = this.v[2].copy(this.velocity); horizontal.y = 0;
    let bank = 0;
    // Keep a readable side profile while climbing/hovering; only deliberate
    // lateral motion changes facing. Depth drift must not turn it toward camera.
    if (Math.abs(horizontal.x) > .06) {
      horizontal.z = Math.abs(horizontal.x) * .08;
      horizontal.normalize();
      const turn = this.v[3].crossVectors(this.heading, horizontal).y;
      bank = -THREE.MathUtils.clamp(turn * 2, -1, 1) * m.bankAngle;
      this.heading.lerp(horizontal, damp(m.turnSmoothness, dt)).normalize();
    }
    if (this.state === 'landing') {
      const l = this.landing;
      this.orient(l.heading, l.normal, 0, dt);
      if (this.root.position.distanceTo(goal) < .018 && this.velocity.length() < .045 && this.root.quaternion.angleTo(this.rotation) < .04) {
        this.root.position.copy(goal); this.velocity.set(0, 0, 0);
        this.actions.Landed.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
        this.actions.Fly.crossFadeTo(this.actions.Landed, m.fadeDuration, false);
        this.setState('landed');
      }
    } else this.orient(this.heading, UP, bank, dt);
    this.actions.Fly.setEffectiveTimeScale(m.flapRate + m.flapSpeedGain * Math.min(this.velocity.length()/m.followSpeed, 1));
    this.mixer.update(dt);
  }

  resetButterfly() {
    const normal = this.landing?.normal ?? UP;
    this.target.copy(this.root.position).addScaledVector(normal, 1.1);
    this.velocity.copy(normal).multiplyScalar(.45);
    this.actions.Fly.reset().setEffectiveWeight(1).play();
    if (this.state === 'landed') this.actions.Landed.crossFadeTo(this.actions.Fly, this.motion.fadeDuration, false);
    else this.actions.Landed.stop();
    this.landing = null;
    this.zoneArmed = false; // Leave the zone before it can trigger again after reset.
    this.setState('flying');
  }
}
