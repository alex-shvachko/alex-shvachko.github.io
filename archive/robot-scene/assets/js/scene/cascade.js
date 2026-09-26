import * as THREE from '../vendor/three.module.js';

/** A stepped ribbon follows the exported cascade rocks into the pond. */
export function buildCascade(scene) {
  const group = new THREE.Group();
  group.name = 'ForestCascade';
  const curve = new THREE.CatmullRomCurve3([
    [-3.50, 2.19, 1.75], [-3.27, 2.08, 2.23], [-2.89, 1.52, 2.72],
    [-2.61, 1.39, 3.02], [-2.22, 1.01, 3.48], [-1.98, 0.75, 3.80],
    [-1.72, -0.26, 4.28],
  ].map(p => new THREE.Vector3(...p)), false, 'centripetal');
  const vertices = [], uv = [], indices = [];
  for (let i = 0; i <= 120; i++) {
    const t = i / 120, p = curve.getPoint(t), tangent = curve.getTangent(t);
    const side = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize();
    const width = 0.36 + Math.sin(t * 17) * 0.06 + t * 0.05;
    for (let j = 0; j <= 8; j++) {
      const u = j / 8;
      const v = p.clone().addScaledVector(side, (u - 0.5) * width * 2);
      v.y += Math.sin(u * Math.PI) * 0.025;
      vertices.push(v.x, v.y, v.z); uv.push(u, t);
      if (i < 120 && j < 8) {
        const a = i * 9 + j;
        indices.push(a, a + 1, a + 9, a + 1, a + 10, a + 9);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(indices); geo.computeVertexNormals();
  const time = { value: 0 };
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: time }, transparent: true, depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: `uniform float uTime; varying vec2 vUv;
      void main() {
        vUv = uv;
        vec3 p = position;
        p.y += sin(uv.y * 120.0 - uTime * 9.0 + uv.x * 18.0) * 0.009;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: `uniform float uTime; varying vec2 vUv;
      void main() {
        float flow = vUv.y * 48.0 - uTime * 3.8;
        float strands = sin(vUv.x * 107.0 + sin(flow * 0.6 + vUv.x * 19.0) * 2.5);
        float threads = pow(max(0.0, strands), 5.0)
          * smoothstep(-0.2, 0.8, sin(flow * 1.9 + vUv.x * 67.0));
        float streak = pow(max(0.0, sin(flow + sin(vUv.x * 54.0) * 2.0)), 8.0);
        float edge = smoothstep(0.0, 0.09, vUv.x) * smoothstep(0.0, 0.09, 1.0-vUv.x);
        vec3 c = mix(vec3(0.10, 0.30, 0.26), vec3(1.65, 1.60, 1.25), threads * 0.85 + streak * 0.55);
        gl_FragColor = vec4(c, edge * (0.48 + threads * 0.40 + streak * 0.12));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const ribbon = new THREE.Mesh(geo, material);
  group.add(ribbon);

  // Recycled ballistic droplets at the main impact, animated entirely on GPU.
  const count = 170, seeds = [];
  for (let i = 0; i < count; i++) seeds.push(i / count, (i * .618034) % 1, (i * .414214) % 1);
  const sprayGeo = new THREE.BufferGeometry();
  sprayGeo.setAttribute('position', new THREE.Float32BufferAttribute(seeds, 3));
  const spray = new THREE.Points(sprayGeo, new THREE.ShaderMaterial({
    uniforms: { uTime: time }, transparent: true, depthWrite: false,
    vertexShader: `uniform float uTime; varying float vAlpha;
      void main() {
        float age = fract(position.x + uTime * 0.65);
        float a = position.y * 6.28318;
        float speed = 0.3 + position.z * 0.6;
        vec3 p = vec3(-1.72, -0.23, 4.28);
        p += vec3(cos(a) * age * speed, sin(age * 3.14159) * speed * 0.45, sin(a) * age * speed);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(16.0 / -mv.z, 1.0, 3.0);
        vAlpha = sin(age * 3.14159) * 0.8;
      }`,
    fragmentShader: `varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        gl_FragColor = vec4(0.94,0.96,0.83, (1.0-smoothstep(0.1,0.5,d))*vAlpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  spray.frustumCulled = false;
  group.add(spray);
  const foam = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.ShaderMaterial({
    uniforms: { uTime: time }, transparent: true, depthWrite: false,
    vertexShader: `varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform float uTime; varying vec2 vUv;
      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float d = length(p), a = atan(p.y,p.x);
        float rings = pow(max(0.0, sin(d * 43.0 - uTime * 5.0 + sin(a * 11.0) * 0.6)), 12.0);
        float fade = (1.0-smoothstep(0.2,0.95,d)) * smoothstep(0.04,0.2,d);
        gl_FragColor = vec4(0.95,0.94,0.78, rings * fade * 0.70);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  foam.rotation.x = -Math.PI / 2;
  foam.position.set(-1.72, -0.265, 4.28);
  group.add(foam);
  scene.add(group);
  return { group, update: t => { time.value = t; } };
}
