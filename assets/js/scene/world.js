import * as THREE from '../vendor/three.module.js';
import { Water } from '../vendor/addons/objects/Water.js';

export const LAYOUT = {
  treeScale: 0.38,
  // Sunk into the root flare and turned toward the camera: the oak has grown up
  // around him where he sat down.
  robot: { pos: new THREE.Vector3(1.28, 0.30, 3.95), rotY: -0.34, scale: 1 },
  pond: { centre: new THREE.Vector3(-3.9, -0.72, 3.4), radius: 4.0 },
  sun: new THREE.Vector3(-4.2, 4.6, -17),
  sunTarget: new THREE.Vector3(0.9, 1.3, 3.6),
};

const rand = (() => {                     // deterministic: the scene must not
  let s = 20260913;                       // reshuffle between reloads
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
})();

/* ----------------------------------------------------------------- sky and IBL */
/** A bright summer sky: deep blue overhead, warm haze toward the sun. */
function skyTexture() {
  const w = 512, h = 256, data = new Uint8Array(w * h * 4);
  const zenith = new THREE.Color('#3f7fc4');
  const upper = new THREE.Color('#8fc0e4');
  const haze = new THREE.Color('#dce6cf');
  const floor = new THREE.Color('#6f8257');
  const warm = new THREE.Color('#fff0c9');
  const c = new THREE.Color(), t2 = new THREE.Color();
  for (let y = 0; y < h; y++) {
    const t = y / (h - 1);
    if (t < 0.36) c.copy(zenith).lerp(upper, THREE.MathUtils.smoothstep(t, 0, 0.36));
    else if (t < 0.56) c.copy(upper).lerp(haze, THREE.MathUtils.smoothstep(t, 0.36, 0.56));
    else c.copy(haze).lerp(floor, THREE.MathUtils.smoothstep(t, 0.56, 0.80));
    for (let x = 0; x < w; x++) {
      const az = (x / w) * Math.PI * 2;
      const glow = Math.pow(Math.max(0, Math.cos(az - 4.35)), 5) *
        Math.max(0, 1 - Math.abs(t - 0.26) * 3.2);
      t2.copy(c).lerp(warm, glow * 0.85);
      const i = (y * w + x) * 4;
      data[i] = t2.r * 255; data[i + 1] = t2.g * 255; data[i + 2] = t2.b * 255; data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function buildEnvironment(scene, renderer) {
  const sky = skyTexture();
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  scene.environment = pmrem.fromEquirectangular(sky).texture;
  scene.environmentIntensity = 1.15;
  scene.background = sky;
  scene.backgroundIntensity = 1.0;
  scene.fog = new THREE.FogExp2('#8aa07e', 0.0115);
  pmrem.dispose();
}

/* --------------------------------------------------------------- water normals */
function waterNormals() {
  const n = 256, data = new Uint8Array(n * n * 4);
  const k = (Math.PI * 2) / n;            // integer wavelengths so the map tiles
  const height = (x, y) =>
    Math.sin(x * k * 3) * 0.55 + Math.sin(y * k * 4 + 1.3) * 0.45 +
    Math.sin((x + y) * k * 2 + 2.1) * 0.6 + Math.sin((x - y) * k * 5) * 0.25;
  const v = new THREE.Vector3();
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const dx = height(x + 1, y) - height(x - 1, y);
      const dy = height(x, y + 1) - height(x, y - 1);
      v.set(-dx, -dy, 0.22).normalize();
      const i = (y * n + x) * 4;
      data[i] = (v.x * 0.5 + 0.5) * 255;
      data[i + 1] = (v.z * 0.5 + 0.5) * 255;
      data[i + 2] = (v.y * 0.5 + 0.5) * 255;
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, n, n, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

/* ------------------------------------------------------------------------ tree */
export function placeTree(gltf, scene) {
  const tree = gltf.scene;
  tree.scale.setScalar(LAYOUT.treeScale);
  tree.rotation.y = 0.6;
  scene.add(tree);

  const leaves = [];
  tree.traverse(o => {
    if (!o.isMesh) return;
    // Only the canopy casts: the brief is leaf shadows and nothing else.
    o.castShadow = false;
    o.receiveShadow = true;
    const m = o.material;
    if (m.map) m.map.anisotropy = 8;
    if (m.transparent || m.alphaMap || /leaf/i.test(m.name)) {
      // Cutout, not blending: the canopy must write depth so it self-sorts, and
      // so its shadow keeps real leaf shapes - that is what dapples the ground.
      m.transparent = false;
      m.alphaTest = 0.42;
      m.side = THREE.DoubleSide;
      m.shadowSide = THREE.DoubleSide;
      o.castShadow = true;
      m.color.setRGB(0.62, 0.74, 0.46);   // pull the vivid nursery green down
      m.roughness = 0.78;
      m.metalness = 0;
      translucentLeaves(m);
      leaves.push(o);
    } else {
      m.color.setRGB(0.44, 0.38, 0.30);
      m.roughness = 0.97;
      m.metalness = 0;
      if (m.normalScale) m.normalScale.set(1.35, 1.35);
    }
  });
  return { tree, leaves };
}

/** Two-sided leaf translucency: backlit leaves glow instead of going flat black. */
function translucentLeaves(material) {
  material.onBeforeCompile = shader => {
    shader.uniforms.uBacklight = { value: new THREE.Color().setRGB(0.68, 0.78, 0.34) };
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform vec3 uBacklight;`)
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
        #if NUM_DIR_LIGHTS > 0
          vec3 vd = normalize( vViewPosition );
          float wrap = pow( clamp( dot( vd, -directionalLights[ 0 ].direction ), 0.0, 1.0 ), 3.0 );
          float thin = 1.0 - abs( dot( normalize( normal ), vd ) ) * 0.5;
          reflectedLight.indirectDiffuse += uBacklight * directionalLights[ 0 ].color
            * wrap * thin * 0.42 * diffuseColor.rgb;
        #endif`);
  };
  material.customProgramCacheKey = () => 'leafTranslucent';
}

/* ---------------------------------------------------------------------- ground */
export function buildGround(scene) {
  const size = 110, seg = 200;
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colour = [];
  const soil = new THREE.Color('#3b3221');
  const moss = new THREE.Color('#4a5a26');
  const silt = new THREE.Color('#232c1c');
  const { centre, radius } = LAYOUT.pond;
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const d = Math.hypot(x - centre.x, z - centre.z);
    // A real basin. The root mound is masked out of it, otherwise the two
    // cancel and the pond surface ends up buried under its own bank.
    const basin = THREE.MathUtils.clamp(1 - d / (radius * 1.45), 0, 1);
    const bowl = -Math.pow(basin, 1.35) * 1.5;
    const bump = (Math.sin(x * 0.31) * Math.cos(z * 0.27) * 0.26
      + Math.sin(x * 0.83 + z * 0.6) * 0.11
      + Math.sin(x * 1.9 + z * 1.4) * 0.055
      + Math.sin(x * 4.7 + z * 3.1) * 0.022
      + Math.sin(x * 9.3 - z * 7.7) * 0.011) * (1 - basin * 0.8);
    const mound = Math.exp(-((x * x) + (z * z)) / 55) * 1.35 * (1 - basin);
    pos.setY(i, bowl + bump + mound);
    const wet = THREE.MathUtils.smoothstep(d, radius * 0.72, radius * 1.45);
    const patch = Math.sin(x * 1.7 + z * 1.1) * Math.cos(x * 0.9 - z * 2.3);
    c.copy(silt).lerp(soil, wet)
      .lerp(moss, THREE.MathUtils.clamp(0.3 + bump * 1.4 + patch * 0.35, 0, 1) * wet);
    colour.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colour, 3));
  geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 1, metalness: 0,
  }));
  ground.receiveShadow = true;
  scene.add(ground);
  return ground;
}

/* ----------------------------------------------------------------------- rocks */
export function buildRocks(scene) {
  const group = new THREE.Group();
  const dry = new THREE.MeshStandardMaterial({
    color: '#403d36', roughness: 1.0, metalness: 0, flatShading: false,
  });
  const wet = new THREE.MeshStandardMaterial({
    color: '#3b3c35', roughness: 0.72, metalness: 0, flatShading: false,
  });
  const { centre, radius } = LAYOUT.pond;
  for (let i = 0; i < 24; i++) {
    const geo = new THREE.IcosahedronGeometry(1, 2);
    const pos = geo.attributes.position;
    for (let v = 0; v < pos.count; v++) {
      const s = 0.86 + rand() * 0.2;
      pos.setXYZ(v, pos.getX(v) * s, pos.getY(v) * s * 0.66, pos.getZ(v) * s);
    }
    geo.computeVertexNormals();
    // Clustered along the left bank, hugging the waterline.
    const a = Math.PI * (0.38 + rand() * 1.24);
    const r = radius * (0.92 + rand() * 0.62);
    const scale = 0.22 + rand() * 0.72;
    const near = r < radius * 1.06;
    const rock = new THREE.Mesh(geo, near ? wet : dry);
    const bowl = -Math.pow(THREE.MathUtils.clamp(1 - r / (radius * 1.45), 0, 1), 1.35) * 1.5;
    rock.position.set(centre.x + Math.cos(a) * r, bowl + scale * 0.26 - 0.2,
      centre.z + Math.sin(a) * r);
    rock.scale.setScalar(scale);
    rock.rotation.set(rand() * 3, rand() * 3, rand() * 3);
    rock.castShadow = false;
    rock.receiveShadow = true;
    group.add(rock);
  }
  scene.add(group);
  return group;
}

/* ------------------------------------------------------------------------ pond */
export function buildPond(scene, sunDirection) {
  const geo = new THREE.CircleGeometry(LAYOUT.pond.radius, 72);
  const water = new Water(geo, {
    textureWidth: 512,
    textureHeight: 512,
    waterNormals: waterNormals(),
    sunDirection: sunDirection.clone().normalize(),
    sunColor: 0xfff0cf,
    waterColor: 0x16302a,
    distortionScale: 1.9,
    fog: true,
  });
  // Water's shader expects the surface in the mesh's XY plane, so the mesh - not
  // the geometry - carries the lie-flat rotation. Rotating both tips it on edge.
  water.rotation.x = -Math.PI / 2;
  water.position.copy(LAYOUT.pond.centre);
  water.material.uniforms.size.value = 2.4;
  // Water.js floors its reflective term at a flat vec3(0.1), which reads as a
  // milky disc in a shaded glade. Drop it so the pond can actually go dark.
  water.material.fragmentShader =
    water.material.fragmentShader.replace('vec3( 0.1 )', 'vec3( 0.015 )');
  water.material.needsUpdate = true;
  scene.add(water);
  return water;
}

/* ----------------------------------------------------------------------- roots */
/** Roots grown over the seated robot - the reason he never got up again. */
export function buildRoots(scene, material) {
  const group = new THREE.Group();
  const p = LAYOUT.robot.pos;
  const arcs = [
    [[-1.6, -0.3, -1.2], [-0.55, 0.30, 0.10], [0.5, 0.26, 0.78], [1.7, -0.25, 1.2]],
    [[-1.8, -0.3, 0.30], [-0.8, 0.42, 0.92], [0.35, 0.40, 1.32], [1.5, -0.3, 1.7]],
    [[-1.3, -0.2, -1.8], [-1.0, 0.58, -0.75], [-0.78, 0.66, 0.22], [-0.6, -0.1, 1.05]],
    [[-2.2, -0.3, 1.25], [-1.05, 0.16, 1.9], [0.25, 0.14, 2.1], [1.7, -0.3, 1.95]],
    [[0.6, -0.3, -1.7], [0.95, 0.46, -0.62], [1.12, 0.5, 0.42], [1.0, -0.15, 1.3]],
    [[-0.35, -0.35, 1.6], [0.2, 0.12, 1.85], [0.85, 0.1, 1.8], [1.45, -0.35, 1.5]],
  ];
  for (const pts of arcs) {
    const curve = new THREE.CatmullRomCurve3(
      pts.map(([x, y, z]) => new THREE.Vector3(p.x + x, p.y + y, p.z + z)));
    const radius = 0.1 + rand() * 0.08;
    const root = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 64, radius, 8, false), material);
    root.castShadow = false;
    root.receiveShadow = true;
    group.add(root);
  }
  scene.add(group);
  return group;
}

/* ---------------------------------------------------------------------- lights */
export function buildLights(scene) {
  // Key: low and raking, so the canopy throws long dapples across the robot.
  const sun = new THREE.DirectionalLight('#fff1d4', 4.2);
  sun.position.copy(LAYOUT.sun);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 48;
  // Tight frustum around the hero area: wide enough for the canopy overhead,
  // narrow enough that a shadow texel stays small enough to read leaf edges.
  const s = 14;
  sun.shadow.camera.left = -s;
  sun.shadow.camera.right = s;
  sun.shadow.camera.top = s;
  sun.shadow.camera.bottom = -s;
  sun.shadow.bias = -0.0008;
  sun.shadow.normalBias = 0.028;
  sun.shadow.camera.updateProjectionMatrix();
  sun.target.position.copy(LAYOUT.sunTarget);
  scene.add(sun, sun.target);

  // Sky bounce: just enough to keep the shade readable, not enough to flatten it.
  const sky = new THREE.HemisphereLight('#a9cff2', '#5a6634', 1.9);
  scene.add(sky);

  // Cool rim from behind the trunk, separating the robot from the bark.
  const rim = new THREE.DirectionalLight('#cfe6ff', 0.9);
  rim.position.set(8, 4.2, -7);
  rim.target.position.copy(LAYOUT.sunTarget);
  scene.add(rim, rim.target);

  // Warm bounce off the forest floor, filling the undersides.
  const bounce = new THREE.DirectionalLight('#c6a86a', 1.0);
  bounce.position.set(-2, -4, 6);
  scene.add(bounce);

  return { sun, sky, rim, bounce };
}

/** The glow from the robot's face screen, spilling onto bark and roots. */
export function buildScreenLight(scene) {
  const light = new THREE.PointLight('#6fe6ff', 7.5, 6.5, 2);
  scene.add(light);
  const bounce = new THREE.PointLight('#35c2e2', 3.2, 3.6, 2);
  scene.add(bounce);
  return { light, bounce };
}

/* ------------------------------------------------------------------ air / life */
/** Dust caught in the shafts coming through the canopy. */
export function buildMotes(scene) {
  const n = 420;
  const pos = new Float32Array(n * 3);
  const seed = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = -9 + rand() * 18;
    pos[i * 3 + 1] = 0.4 + rand() * 5.2;
    pos[i * 3 + 2] = -2 + rand() * 11;
    seed[i] = rand() * 6.283;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uColour: { value: new THREE.Color('#ffe2b0') } },
    vertexShader: `attribute float aSeed; uniform float uTime; varying float vFade;
      void main(){
        vec3 p = position;
        p.x += sin( uTime * 0.22 + aSeed ) * 0.55;
        p.y += sin( uTime * 0.15 + aSeed * 1.7 ) * 0.35;
        p.z += cos( uTime * 0.19 + aSeed * 2.3 ) * 0.45;
        vec4 mv = modelViewMatrix * vec4( p, 1.0 );
        vFade = ( 0.45 + 0.55 * sin( uTime * 0.7 + aSeed * 3.1 ) ) *
                smoothstep( 26.0, 6.0, -mv.z );
        gl_PointSize = ( 2.6 + 2.2 * sin( aSeed ) ) * ( 9.0 / -mv.z );
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `uniform vec3 uColour; varying float vFade;
      void main(){
        float d = length( gl_PointCoord - 0.5 );
        if ( d > 0.5 ) discard;
        gl_FragColor = vec4( uColour, smoothstep( 0.5, 0.0, d ) * vFade * 0.5 );
      }`,
  });
  const motes = new THREE.Points(geo, mat);
  motes.frustumCulled = false;
  scene.add(motes);
  return motes;
}

/** A slow fall of leaves, so the canopy above feels alive. */
export function buildFallingLeaves(scene, leafMaterial) {
  const count = 34;
  const geo = new THREE.PlaneGeometry(0.17, 0.24);
  const mat = new THREE.MeshStandardMaterial({
    color: '#8d6a2c', roughness: 0.8, metalness: 0, side: THREE.DoubleSide,
  });
  if (leafMaterial?.map) { mat.map = leafMaterial.map; mat.alphaTest = 0.42; mat.color.set('#c99a45'); }
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  mesh.castShadow = false;
  const state = [];
  for (let i = 0; i < count; i++) {
    state.push({
      x: -8 + rand() * 16, y: 0.5 + rand() * 6.5, z: -1 + rand() * 9,
      phase: rand() * 6.283, spin: 0.4 + rand() * 1.1, fall: 0.18 + rand() * 0.3,
    });
  }
  mesh.userData.state = state;
  scene.add(mesh);
  return mesh;
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3(1, 1, 1);

export function updateFallingLeaves(mesh, t, dt) {
  const state = mesh.userData.state;
  for (let i = 0; i < state.length; i++) {
    const s = state[i];
    s.y -= s.fall * dt;
    if (s.y < 0.15) { s.y = 6.8; s.x = -8 + Math.random() * 16; s.z = -1 + Math.random() * 9; }
    _p.set(s.x + Math.sin(t * 0.8 + s.phase) * 0.5, s.y,
           s.z + Math.cos(t * 0.6 + s.phase) * 0.4);
    _e.set(t * s.spin + s.phase, t * s.spin * 0.7, Math.sin(t + s.phase) * 0.8);
    _q.setFromEuler(_e);
    mesh.setMatrixAt(i, _m.compose(_p, _q, _s));
  }
  mesh.instanceMatrix.needsUpdate = true;
}

/** A ring of distant trees, so the glade sits inside a wood instead of ending
 *  on a bare horizon. Deliberately simple: fog and shade do the work. */
export function buildTreeline(scene) {
  const group = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#2f2a1d', roughness: 1 });
  const crownMat = new THREE.MeshStandardMaterial({
    color: '#2b3a1c', roughness: 1, flatShading: true,
  });
  const trunkGeo = new THREE.CylinderGeometry(0.26, 0.42, 6, 5);
  const crownGeo = new THREE.IcosahedronGeometry(1, 1);
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2 + rand() * 0.09;
    const r = 23 + rand() * 24;
    const h = 0.75 + rand() * 1.0;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.set(x, 3 * h - 0.6, z);
    trunk.scale.set(h, h, h);
    group.add(trunk);
    const crown = new THREE.Mesh(crownGeo, crownMat);
    crown.position.set(x, 6.4 * h, z);
    crown.scale.set((2.1 + rand()) * h, (2.9 + rand()) * h, (2.1 + rand()) * h);
    crown.rotation.set(rand() * 3, rand() * 3, rand() * 3);
    group.add(crown);
  }
  scene.add(group);
  return group;
}

/** A hollow worn into the trunk, so the robot is seated inside the tree rather
 *  than propped in front of it. Back faces only: the camera looks into it. */
export function buildHollow(scene, barkMaterial) {
  const shell = barkMaterial.clone();
  shell.side = THREE.BackSide;
  shell.color.multiplyScalar(0.28);          // the inside of a hollow is dark
  shell.roughness = 1;
  const geo = new THREE.SphereGeometry(1, 32, 24);
  geo.scale(1.02, 1.46, 1.5);
  const hollow = new THREE.Mesh(geo, shell);
  const p = LAYOUT.robot.pos;
  hollow.position.set(p.x - 0.06, p.y + 1.04, p.z - 1.02);
  hollow.rotation.y = LAYOUT.robot.rotY;
  hollow.receiveShadow = true;
  hollow.castShadow = false;
  scene.add(hollow);
  return { hollow };
}
