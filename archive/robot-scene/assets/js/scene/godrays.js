import * as THREE from '../vendor/three.module.js';
import { Pass, FullScreenQuad } from '../vendor/addons/postprocessing/Pass.js';

/**
 * Volumetric light scattering (crepuscular rays).
 *
 * A separate occlusion scene holds a bright sun disc behind black stand-ins for
 * the canopy and trunk. The canopy stand-in keeps the leaf texture and its alpha
 * cutout, so the sun shows through the real gaps between leaves - that is what
 * makes the shafts leaf-shaped rather than a generic glow. That buffer is then
 * blurred radially away from the sun's screen position and added to the frame.
 *
 * The blur is separable in the way a radial blur can be: a pass of N samples at
 * stride 1 followed by a pass of N samples at stride N covers the same N*N-long
 * kernel, because the exponential falloff factorises as decay^(a + N*b) =
 * decay^a * (decay^N)^b. So the shafts reach as far as a 100-tap blur for the
 * cost of 20 taps. At a high pixel ratio the single-pass version was doing tens
 * of millions of texture fetches per frame and was the most expensive thing in
 * the scene by a wide margin.
 *
 * It is an approximation: the second pass reads pixels whose own direction to
 * the sun differs slightly from the centre pixel's. Radially that error stays
 * along the shaft rather than across it, so it is invisible in a soft glow.
 *
 * The occluders are static, so their stand-ins are built once at load.
 */
export class GodRaysPass extends Pass {
  constructor(camera, sunPosition, occluders, {
    density = 0.98, decay = 0.968, exposure = 1.05, samples = 10,
    resolution = 0.5, colour = new THREE.Color('#ffdba3'),
  } = {}) {
    super();
    this.camera = camera;
    this.sunPosition = sunPosition.clone();
    this.resolution = resolution;
    this.needsSwap = true;
    this._size = new THREE.Vector2(1, 1);

    this.occScene = new THREE.Scene();
    this.occScene.background = new THREE.Color(0x000000);

    const sun = new THREE.Mesh(
      new THREE.SphereGeometry(10, 24, 16),
      new THREE.MeshBasicMaterial({ color: colour, fog: false }));
    sun.position.copy(this.sunPosition);
    this.occScene.add(sun);
    this.sunMesh = sun;

    for (const mesh of occluders) {
      if (!mesh?.isMesh) continue;
      const src = mesh.material;
      const black = new THREE.MeshBasicMaterial({ color: 0x000000, fog: false });
      if (src?.alphaTest > 0 && src.map) {     // keep the leaf cutout
        black.map = src.map;
        black.alphaTest = src.alphaTest;
        black.side = THREE.DoubleSide;
      }
      const stand = new THREE.Mesh(mesh.geometry, black);
      mesh.updateWorldMatrix(true, false);
      stand.matrixAutoUpdate = false;
      stand.matrix.copy(mesh.matrixWorld);
      this.occScene.add(stand);
    }

    const target = () => new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false });
    this.rt = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: true });
    // Two more: a radial blur cannot read and write one texture in a pass, and
    // the second stride needs the first pass's result intact.
    this.rtA = target();
    this.rtB = target();

    this.samples = samples;
    this.total = samples * samples;
    this.decay = decay;

    this.blur = new THREE.ShaderMaterial({
      uniforms: {
        tOcclusion: { value: null }, uSun: { value: new THREE.Vector2(0.5, 0.5) },
        uDensity: { value: density }, uDecay: { value: decay },
        uStride: { value: 1 }, uScale: { value: 1 },
      },
      vertexShader: `varying vec2 vUv;
        void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }`,
      fragmentShader: `
        uniform sampler2D tOcclusion; uniform vec2 uSun;
        uniform float uDensity, uDecay, uStride, uScale;
        varying vec2 vUv;
        const int SAMPLES = ${samples};
        const float TOTAL = ${(samples * samples).toFixed(1)};
        void main(){
          vec2 uv = vUv;
          vec2 step = ( vUv - uSun ) * ( uDensity / TOTAL ) * uStride;
          float illum = 1.0;
          float norm = 0.0;
          vec3 sum = vec3( 0.0 );
          for ( int i = 0; i < SAMPLES; i ++ ) {
            sum += texture2D( tOcclusion, uv ).rgb * illum;
            norm += illum;
            uv -= step;
            illum *= uDecay;
          }
          // Weighted average, so strength is uScale and not a function of the
          // sample count.
          gl_FragColor = vec4( sum / max( norm, 1e-4 ) * uScale, 1.0 );
        }`,
    });
    this.exposure = exposure;

    this.composite = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: null }, tRays: { value: null } },
      vertexShader: `varying vec2 vUv;
        void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }`,
      fragmentShader: `uniform sampler2D tDiffuse; uniform sampler2D tRays; varying vec2 vUv;
        void main(){
          gl_FragColor = vec4( texture2D( tDiffuse, vUv ).rgb + texture2D( tRays, vUv ).rgb, 1.0 );
        }`,
    });

    this.quad = new FullScreenQuad(this.blur);
    this._v = new THREE.Vector3();
  }

  setSize(width, height) {
    this._size.set(width, height);
    const w = Math.max(1, Math.round(width * this.resolution));
    const h = Math.max(1, Math.round(height * this.resolution));
    this.rt.setSize(w, h);
    this.rtA.setSize(w, h);
    this.rtB.setSize(w, h);
  }

  /** Adaptive quality: the shafts are soft, so they take a resolution cut well. */
  setResolution(resolution) {
    if (Math.abs(resolution - this.resolution) < 0.01) return;
    this.resolution = resolution;
    this.setSize(this._size.x, this._size.y);
  }

  render(renderer, writeBuffer, readBuffer) {
    const sun = this._v.copy(this.sunPosition).project(this.camera);

    // Fade out as the sun leaves the frame, otherwise the radial blur streaks
    // from an off-screen origin and smears the whole image.
    const edge = Math.max(Math.abs(sun.x), Math.abs(sun.y));
    const visible = sun.z < 1 ? THREE.MathUtils.clamp(1.7 - edge, 0, 1) : 0;

    const prevTarget = renderer.getRenderTarget();

    if (visible > 0.001) {
      renderer.setRenderTarget(this.rt);
      renderer.render(this.occScene, this.camera);

      const u = this.blur.uniforms;
      u.uSun.value.set(sun.x * 0.5 + 0.5, sun.y * 0.5 + 0.5);
      this.quad.material = this.blur;

      u.tOcclusion.value = this.rt.texture;     // pass 1: the near taps
      u.uStride.value = 1;
      u.uDecay.value = this.decay;
      u.uScale.value = 1;
      renderer.setRenderTarget(this.rtA);
      this.quad.render(renderer);

      u.tOcclusion.value = this.rtA.texture;    // pass 2: strides of N
      u.uStride.value = this.samples;
      u.uDecay.value = Math.pow(this.decay, this.samples);
      u.uScale.value = this.exposure * visible;
      renderer.setRenderTarget(this.rtB);
      this.quad.render(renderer);
    } else {
      renderer.setRenderTarget(this.rtB);
      renderer.setClearColor(0x000000, 1);
      renderer.clear(true, false, false);
    }

    this.composite.uniforms.tDiffuse.value = readBuffer.texture;
    this.composite.uniforms.tRays.value = this.rtB.texture;
    this.quad.material = this.composite;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    if (this.clear) renderer.clear();
    this.quad.render(renderer);
    renderer.setRenderTarget(prevTarget);
  }

  dispose() {
    this.rt.dispose();
    this.rtA.dispose();
    this.rtB.dispose();
    this.blur.dispose();
    this.composite.dispose();
    this.quad.dispose();
  }
}
