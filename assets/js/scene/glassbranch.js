import * as THREE from '../vendor/three.module.js';
import { mergeGeometries } from '../vendor/addons/utils/BufferGeometryUtils.js';

/**
 * The right-hand furniture of the hero: a stack of liquid-glass buttons, and,
 * separate from them, a horizontal leafy bough that exists only as somewhere for
 * the butterfly to land.
 *
 * Both live in world space rather than parented to the camera. That is what lets
 * the glass refract the real woodland behind it, lets the bough take the real
 * sun, and puts the bough somewhere the butterfly can actually fly to.
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

const BTN_W = 1.42;                   // sized to hold the type, not the other way round
const BTN_H = 0.26;
const BTN_R = 0.09;                   // corner radius: rounded, not a pill
const ROW_Y = [0.60, 0.22, -0.16, -0.54, -0.92];

const BOUGH_Y = 1.12;                 // clear of the buttons, up where the canopy is
const BOUGH_X = 1.35;                 // pivot off the right edge, where it sways from
const BOUGH_R0 = 0.085;
const BOUGH_R1 = 0.022;
const LEAF_COUNT = 132;

// Authored from the bough's pivot, running left across frame and sagging a
// little under its own weight.
const BOUGH_PTS = [
  [0, 0, 0], [-0.62, -0.07, 0.06], [-1.24, -0.15, 0.04],
  [-1.86, -0.19, -0.04], [-2.48, -0.17, -0.12], [-2.95, -0.08, -0.22],
];

const rand = (() => {                 // deterministic: it must not reshuffle
  let s = 991137;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
})();

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

/** A rounded rectangle. Corners, not a circle and not a pill. */
function roundedRect(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** A simple pointed leaf, as geometry rather than an alpha-cut card. */
function leafGeometry() {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(0.055, 0.035, 0.085, 0.125, 0, 0.215);
  s.bezierCurveTo(-0.085, 0.125, -0.055, 0.035, 0, 0);
  return new THREE.ShapeGeometry(s, 7);
}

export function buildGlassMenu(scene, camera, nav, {
  home, focus, distance = 4.6, targetX = 0.62,
} = {}) {
  /* ------------------------------------------------------------------- framing */
  const frame = new THREE.Group();
  frame.name = 'MenuFrame';
  frame.position.copy(home);
  // Matrix4.lookAt, not Object3D.lookAt: the latter aims +Z at the target for a
  // plain object and only cameras and lights get the -Z convention. Using it
  // here would build the whole thing behind the viewer.
  frame.quaternion.setFromRotationMatrix(
    new THREE.Matrix4().lookAt(home, focus, new THREE.Vector3(0, 1, 0)));

  const panel = new THREE.Group();        // the buttons: UI, so it holds still
  panel.position.set(0, 0, -distance);
  frame.add(panel);

  const bough = new THREE.Group();        // the perch: swings in the wind
  bough.position.set(BOUGH_X, BOUGH_Y, -distance);
  frame.add(bough);

  scene.add(frame);
  resize();                               // frame first, so the perches below
  frame.updateMatrixWorld(true);          // come out of the final matrices

  /* ------------------------------------------------------------- glass buttons */
  // Transmission rather than opacity: the buttons bend the woodland behind them,
  // which is the whole difference between glass and a tinted overlay. The
  // roughness is what frosts the backdrop, and the frosting is what keeps the
  // label legible over a busy scene.
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xeaf4ef, transmission: 0.97, thickness: 0.22, roughness: 0.17,
    // A near-mirror clearcoat concentrates the sun into a pinpoint that crosses
    // the bloom threshold and, at bloom's half resolution, smears into a blocky
    // white square over the UI. Spreading the lobe keeps the sheen and loses the
    // artefact.
    ior: 1.42, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.28,
    iridescence: 0.34, iridescenceIOR: 1.3, iridescenceThicknessRange: [120, 460],
    attenuationColor: new THREE.Color('#6f9d86'), attenuationDistance: 1.9,
    envMapIntensity: 1.5,
  });

  const slab = new THREE.ExtrudeGeometry(roundedRect(BTN_W, BTN_H, BTN_R), {
    depth: 0.07, bevelEnabled: true, bevelSize: 0.022,
    bevelThickness: 0.022, bevelSegments: 3, curveSegments: 7,
  });
  slab.translate(0, 0, -0.035);

  const nodes = [];
  const buttons = [];
  MENU.forEach((item, i) => {
    const mesh = new THREE.Mesh(slab, glass);
    mesh.position.set(0, ROW_Y[i], 0);
    mesh.userData.nodeId = item.id;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    panel.add(mesh);
    buttons.push(mesh);
    nodes.push({
      ...item, mesh, label: nav.querySelector(`[data-node="${item.id}"]`),
      glow: 0, want: 0,
    });
  });

  /* ------------------------------------------------------- the bough, and leaves */
  const curve = new THREE.CatmullRomCurve3(
    BOUGH_PTS.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
  const parts = [taperedTube(curve, 56, 9, BOUGH_R0, BOUGH_R1)];

  // A couple of forks, so it reads as a bough rather than a dowel.
  for (const [t, dx, dy, dz] of [[0.34, -0.42, 0.30, 0.10], [0.62, -0.38, -0.26, -0.08]]) {
    const a = curve.getPoint(t);
    parts.push(taperedTube(new THREE.CatmullRomCurve3([
      a.clone(),
      a.clone().add(new THREE.Vector3(dx * 0.45, dy * 0.55, dz * 0.5)),
      a.clone().add(new THREE.Vector3(dx, dy, dz)),
    ]), 18, 7, 0.030, 0.014));
  }
  // MeshPhysicalMaterial purely for `specularIntensity`. A dark, rough cylinder
  // silhouetted against a bright sky picks up a near-total Fresnel rim across
  // most of its projected width, which washed the bough out to pale grey
  // whatever its albedo. MeshStandardMaterial gives no way to turn that down.
  const wood = new THREE.Mesh(mergeGeometries(parts), new THREE.MeshPhysicalMaterial({
    color: '#4a3520', roughness: 1, metalness: 0,
    specularIntensity: 0.12, envMapIntensity: 0.35,
  }));
  parts.forEach(g => g.dispose());
  wood.name = 'PerchBough';
  wood.castShadow = false;      // the canopy's shadow map is baked once and frozen
  wood.receiveShadow = true;
  bough.add(wood);

  const leafMat = new THREE.MeshPhysicalMaterial({
    color: '#5f7d33', roughness: 0.9, metalness: 0, side: THREE.DoubleSide,
    specularIntensity: 0.25, envMapIntensity: 0.6,
  });
  const leafGeo = leafGeometry();
  const leaves = new THREE.InstancedMesh(leafGeo, leafMat, LEAF_COUNT);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), spin = new THREE.Quaternion();
  const p = new THREE.Vector3(), sc = new THREE.Vector3(), dir = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);
  const tint = new THREE.Color();
  for (let i = 0; i < LEAF_COUNT; i++) {
    const t = 0.05 + (i / LEAF_COUNT) * 0.93;
    const a = rand() * Math.PI * 2;
    const r = THREE.MathUtils.lerp(BOUGH_R0, BOUGH_R1, t);
    curve.getPoint(t, p);
    p.x += (rand() - 0.5) * 0.1;
    p.y += Math.sin(a) * r * 0.85;
    p.z += Math.cos(a) * r * 0.85 + (rand() - 0.5) * 0.08;
    // Leaves fan outward and hang: mostly down, splayed around the stem.
    dir.set(Math.cos(a) * 0.55 + (rand() - 0.5) * 0.3,
            -0.62 - rand() * 0.35,
            Math.sin(a) * 0.55).normalize();
    q.setFromUnitVectors(UP, dir);
    q.multiply(spin.setFromAxisAngle(UP, rand() * Math.PI * 2));
    const s = 1.05 + rand() * 0.75;
    sc.set(s, s, s);
    leaves.setMatrixAt(i, m.compose(p, q, sc));
    // setRGB takes linear values, so these are multipliers on the base green
    // rather than sRGB swatches: some leaves warmer and older, some fresher.
    const warm = rand();
    leaves.setColorAt(i, tint.setRGB(0.74 + warm * 0.50, 0.92 + warm * 0.18,
                                     0.58 + warm * 0.30));
  }
  leaves.instanceMatrix.needsUpdate = true;
  leaves.instanceColor.needsUpdate = true;
  leaves.castShadow = false;
  leaves.receiveShadow = true;
  leaves.frustumCulled = false;
  bough.add(leaves);

  /* -------------------------------------------------------------- landing zones */
  // The bough itself, so hovering it lands the butterfly wherever you point.
  const zones = [{ id: 'bough', mesh: wood, normal: new THREE.Vector3(0, 1, 0) }];

  // And one invisible catcher per button row, so simply moving the cursor onto
  // the menu sends the butterfly to the bough. `point` is what puts it down on
  // the branch instead of wherever the catcher was struck; the catchers are
  // children of the bough so the butterfly rides the sway once it has settled.
  ROW_Y.forEach((y, i) => {
    const catcher = new THREE.Mesh(
      new THREE.PlaneGeometry(BTN_W + 0.34, 0.42),
      new THREE.MeshBasicMaterial({ visible: false }));
    catcher.name = `MenuRow_${MENU[i].id}`;
    catcher.position.set(-BOUGH_X, y - BOUGH_Y, 0.34);
    bough.add(catcher);
    catcher.updateWorldMatrix(true, false);

    // Spread the five perches along the bough, so it matters which one you hover.
    const t = 0.22 + (i / (ROW_Y.length - 1)) * 0.62;
    const perch = curve.getPoint(t);
    perch.y += THREE.MathUtils.lerp(BOUGH_R0, BOUGH_R1, t);
    zones.push({
      id: `menu-${MENU[i].id}`,
      mesh: catcher,
      point: catcher.worldToLocal(bough.localToWorld(perch)),
      normal: new THREE.Vector3(0, 1, 0),
    });
  });

  /* ------------------------------------------------------------------ behaviour */
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

  function resize() {
    const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * distance;
    const shift = targetX * halfH * camera.aspect;
    panel.position.x = shift;
    bough.position.x = shift + BOUGH_X;
  }

  function update(t, dt, rect) {
    if (!still.matches) {
      bough.rotation.z = Math.sin(t * 0.47) * 0.019 + Math.sin(t * 0.93) * 0.007;
      bough.rotation.x = Math.sin(t * 0.36 + 1.7) * 0.013;
    }
    const ease = 1 - Math.exp(-9 * dt);
    for (const n of nodes) {
      n.glow += (n.want - n.glow) * ease;
      // A press-forward, not a balloon: the slab lifts toward the viewer.
      n.mesh.scale.setScalar(1 + n.glow * 0.045);
      n.mesh.position.z = n.glow * 0.085;
      if (!n.label) continue;
      n.mesh.getWorldPosition(proj).project(camera);
      const x = (proj.x * 0.5 + 0.5) * rect.width;
      const y = (-proj.y * 0.5 + 0.5) * rect.height;
      n.label.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
    }
  }

  return {
    frame, panel, bough, nodes, buttons, zones, resize, update, setHover,
    get hovered() { return hovered; },
  };
}
