import * as THREE from '../vendor/three.module.js';
import { mergeGeometries } from '../vendor/addons/utils/BufferGeometryUtils.js';

/**
 * The navigation: a bough of the oak hanging into the right of frame, rendered
 * as liquid glass with a bead at each section.
 *
 * It lives in world space rather than being parented to the camera. That costs a
 * little framing work on resize, but it is what lets the bough refract the real
 * scene behind it, take the real sun, drift with the camera's parallax - and,
 * above all, be somewhere the butterfly can actually fly to and land on.
 *
 * The frame group sits at the camera's home pose and looks at the focus point,
 * so everything inside it is authored in comfortable screen-ish coordinates:
 * +x right, +y up, -z away from the viewer.
 */

export const MENU = [
  { id: 'skills', href: '#skills' },
  { id: 'portfolio', href: '#work' },
  { id: 'education', href: '#education' },
  { id: 'about', href: '#about' },
  { id: 'contact', href: '#contact' },
];

const PIVOT_Y = 1.9;          // where the bough leaves the canopy, and swings from
const NODE_Y = [0.92, 0.40, -0.12, -0.64, -1.16];
const ROW_H = 0.52;
const LIMB_R0 = 0.095;        // thick where it leaves the tree
const LIMB_R1 = 0.024;        // tapering to the tip

// Menu space: the beads sit on x = 0, so reframing on resize is a single shift.
// The lateral wander matters: a limb that falls straight reads as a pipe.
const LIMB_PTS = [
  [0.72, 1.95, -0.38], [0.55, 1.35, -0.16], [0.34, 0.76, 0.04],
  [0.45, 0.16, 0.10], [0.31, -0.44, 0.02], [0.43, -1.06, -0.10],
  [0.28, -1.78, -0.32],
];
const LIMB_TOP = LIMB_PTS[0][1];
const LIMB_SPAN = LIMB_TOP - LIMB_PTS[LIMB_PTS.length - 1][1];

const v = (x, y, z) => new THREE.Vector3(x, y - PIVOT_Y, z);

/**
 * A tube whose radius tapers along the curve, which three's TubeGeometry cannot
 * do. A branch of constant radius reads as plumbing.
 *
 * The normals are the exact ring normals, so they ignore the slope the taper
 * introduces. Over a taper this gentle that error stays well under a degree.
 */
function taperedTube(curve, tubular, radial, r0, r1) {
  const frames = curve.computeFrenetFrames(tubular, false);
  const position = [], normal = [], uv = [], index = [];
  const P = new THREE.Vector3();
  for (let i = 0; i <= tubular; i++) {
    const u = i / tubular;
    curve.getPointAt(u, P);
    const N = frames.normals[i], B = frames.binormals[i];
    const r = THREE.MathUtils.lerp(r0, r1, u);
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const cx = -Math.cos(a), cy = -Math.sin(a);
      const dx = N.x * cx + B.x * cy, dy = N.y * cx + B.y * cy, dz = N.z * cx + B.z * cy;
      normal.push(dx, dy, dz);
      position.push(P.x + r * dx, P.y + r * dy, P.z + r * dz);
      uv.push(u, j / radial);
    }
  }
  for (let i = 1; i <= tubular; i++) {
    for (let j = 1; j <= radial; j++) {
      const a = (radial + 1) * (i - 1) + (j - 1);
      const b = (radial + 1) * i + (j - 1);
      const c = (radial + 1) * i + j;
      const d = (radial + 1) * (i - 1) + j;
      index.push(a, b, d, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setIndex(index);
  g.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(normal, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return g;
}

/** A hanging bead of glass: a teardrop revolved about its axis. */
function beadGeometry() {
  const profile = [[0, 0.115], [0.030, 0.100], [0.055, 0.072], [0.070, 0.035],
                   [0.072, 0], [0.062, -0.038], [0.038, -0.068], [0, -0.082]];
  return new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 26);
}

export function buildGlassBranch(scene, camera, nav, {
  home, focus, distance = 4.6, targetX = 0.60,
} = {}) {
  /* ------------------------------------------------------------------- framing */
  const frame = new THREE.Group();
  frame.name = 'BranchFrame';
  frame.position.copy(home);
  // Matrix4.lookAt, not Object3D.lookAt: the latter aims +Z at the target for a
  // plain object and only cameras and lights get the -Z convention. Using it
  // here would build the entire menu behind the viewer.
  frame.quaternion.setFromRotationMatrix(
    new THREE.Matrix4().lookAt(home, focus, new THREE.Vector3(0, 1, 0)));

  const sway = new THREE.Group();       // the whole bough swings from the pivot
  sway.position.set(0, PIVOT_Y, -distance);
  frame.add(sway);
  scene.add(frame);
  // Frame first, so the perch points below are derived from the final matrices.
  resize();
  frame.updateMatrixWorld(true);

  /* ------------------------------------------------------------------ material */
  // Transmission, not opacity: the bough bends the woodland behind it, which is
  // the whole difference between glass and a tinted overlay. Held just under 1
  // so some surface shading survives and the form stays readable against a busy
  // scene.
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xe4f1e6, transmission: 0.90, thickness: 0.42, roughness: 0.09,
    ior: 1.44, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.06,
    iridescence: 0.40, iridescenceIOR: 1.28, iridescenceThicknessRange: [100, 460],
    attenuationColor: new THREE.Color('#5f9c74'), attenuationDistance: 1.1,
    envMapIntensity: 1.5,
  });
  // Thickness is what lets the tint accumulate; with it near zero the glass
  // washes out to white plastic against a bright sky.
  glass.thickness = 0.85;
  const beadGlass = glass.clone();
  beadGlass.thickness = 0.26;
  beadGlass.roughness = 0.04;
  beadGlass.attenuationDistance = 0.7;

  /* ---------------------------------------------------------------- the branch */
  const limbCurve = new THREE.CatmullRomCurve3(LIMB_PTS.map(p => v(...p)));
  const parts = [taperedTube(limbCurve, 64, 10, LIMB_R0, LIMB_R1)];

  const along = y => THREE.MathUtils.clamp((LIMB_TOP - y) / LIMB_SPAN, 0, 1);
  const limbAt = y => limbCurve.getPoint(along(y));
  const limbRadiusAt = y => THREE.MathUtils.lerp(LIMB_R0, LIMB_R1, along(y));

  const nodes = [];
  const pods = [];
  const zones = [];
  const bead = beadGeometry();
  const coreGeo = new THREE.SphereGeometry(0.022, 10, 8);

  MENU.forEach((item, i) => {
    const y = NODE_Y[i];
    const twig = new THREE.CatmullRomCurve3([
      limbAt(y + 0.18),
      v(0.24, y + 0.13, 0.04),
      v(0.08, y + 0.05, 0.09),
      v(0, y + 0.115, 0.10),
    ]);
    parts.push(taperedTube(twig, 22, 7, 0.022, 0.011));

    const pod = new THREE.Mesh(bead, beadGlass);
    pod.position.copy(v(0, y, 0.10));
    pod.userData.nodeId = item.id;
    pod.castShadow = false;
    pod.receiveShadow = false;
    sway.add(pod);
    pods.push(pod);

    // A spark caught inside the glass. It is opaque, so it lands in the
    // transmission buffer and shows through the bead, refracted.
    const core = new THREE.Mesh(coreGeo, new THREE.MeshBasicMaterial());
    core.material.color.setRGB(0.42, 0.55, 0.26);
    core.position.copy(pod.position).setY(pod.position.y + 0.005);
    sway.add(core);

    // The butterfly's landing zone. The catcher is an invisible panel over the
    // whole row, label included, so simply moving the cursor onto the menu is
    // enough; `point` then puts the butterfly down on the bough itself rather
    // than wherever the panel happened to be struck.
    const catcher = new THREE.Mesh(
      new THREE.PlaneGeometry(2.25, ROW_H),
      new THREE.MeshBasicMaterial({ visible: false }));
    catcher.name = `MenuRow_${item.id}`;
    catcher.position.copy(v(-0.62, y, 0.30));
    sway.add(catcher);
    catcher.updateWorldMatrix(true, false);

    const perch = limbAt(y - 0.05);
    perch.y += limbRadiusAt(y - 0.05);
    zones.push({
      id: `menu-${item.id}`,
      mesh: catcher,
      point: catcher.worldToLocal(sway.localToWorld(perch)),
      normal: new THREE.Vector3(0, 1, 0),
    });

    const label = nav.querySelector(`[data-node="${item.id}"]`);
    nodes.push({ ...item, pod, core, label, glow: 0, want: 0 });
  });

  const woodGeo = mergeGeometries(parts);
  parts.forEach(g => g.dispose());
  const wood = new THREE.Mesh(woodGeo, glass);
  wood.name = 'GlassBough';
  wood.castShadow = false;
  wood.receiveShadow = false;
  sway.add(wood);

  /* ---------------------------------------------------------------- behaviour */
  let hovered = null;
  const setHover = id => {
    hovered = id;
    for (const n of nodes) {
      n.want = n.id === id ? 1 : 0;
      n.label?.classList.toggle('is-active', n.id === id);
    }
  };
  for (const n of nodes) {
    if (!n.label) continue;
    n.label.addEventListener('pointerenter', () => setHover(n.id));
    n.label.addEventListener('focus', () => setHover(n.id));
    n.label.addEventListener('pointerleave', () => { if (hovered === n.id) setHover(null); });
    n.label.addEventListener('blur', () => { if (hovered === n.id) setHover(null); });
  }

  const still = matchMedia('(prefers-reduced-motion: reduce)');
  const proj = new THREE.Vector3();
  const hot = new THREE.Color(2.4, 2.9, 1.5);   // over 1: this is what blooms
  const cool = new THREE.Color(0.42, 0.55, 0.26);

  function resize() {
    const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * distance;
    sway.position.x = targetX * halfH * camera.aspect;
  }

  function update(t, dt, rect) {
    if (!still.matches) {
      sway.rotation.z = Math.sin(t * 0.42) * 0.013 + Math.sin(t * 0.91) * 0.005;
      sway.rotation.x = Math.sin(t * 0.33 + 1.7) * 0.009;
    }
    const ease = 1 - Math.exp(-9 * dt);
    for (const n of nodes) {
      n.glow += (n.want - n.glow) * ease;
      n.pod.scale.setScalar(1 + n.glow * 0.22);
      n.core.scale.setScalar(1 + n.glow * 0.7);
      n.core.material.color.copy(cool).lerp(hot, n.glow);
      if (!n.label) continue;
      // The label is laid out from its own right edge, so it grows leftwards
      // away from the bead and never crosses it.
      n.pod.getWorldPosition(proj).project(camera);
      const x = (proj.x * 0.5 + 0.5) * rect.width - 20 - n.glow * 8;
      const y = (-proj.y * 0.5 + 0.5) * rect.height;
      n.label.style.transform =
        `translate3d(${x}px, ${y}px, 0) translate(-100%, -50%)`;
    }
  }

  return {
    frame, sway, nodes, pods, zones, resize, update, setHover,
    get hovered() { return hovered; },
  };
}
