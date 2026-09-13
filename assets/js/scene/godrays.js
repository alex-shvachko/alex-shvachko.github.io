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
 * The occluders are static, so their stand-ins are built once at load.
 */
export class GodRaysPass extends Pass {
  constructor(camera, sunPosition, occluders, {
    density = 0.98, weight = 0.5, decay = 0.968, exposure = 1.05, samples = 96,
    resolution = 0.5, colour = new THREE.Color('#ffdba3'),
  } = {}) {
    super();
    this.camera = camera;
    this.sunPosition = sunPosition.clone();
    this.resolution = resolution;
    this.needsSwap = true;

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

    this.rt = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: true });
    // A second target: blurring rt into itself would read and write the
    // same texture in one pass.
    this.rtBlur = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false });

    this.blur = new THREE.ShaderMaterial({
      uniforms: {
        tOcclusion: { value: null }, uSun: { value: new THREE.Vector2(0.5, 0.5) },
        uDensity: { value: density }, uWeight: { value: weight },
        uDecay: { value: decay }, uExposure: { value: exposure },
        uVisible: { value: 0 },
      },
      vertexShader: `varying vec2 vUv;
        void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }`,
      fragmentShader: `
        uniform sampler2D tOcclusion; uniform vec2 uSun;
        uniform float uDensity, uWeight, uDecay, uExposure, uVisible;
        varying vec2 vUv;
        const int SAMPLES = ${samples};
        void main(){
          vec2 uv = vUv;
          vec2 step = ( uv - uSun ) * ( uDensity / float( SAMPLES ) );
          float illum = 1.0;
          float norm = 0.0;
          vec3 sum = vec3( 0.0 );
          for ( int i = 0; i < SAMPLES; i ++ ) {
            uv -= step;
            sum += texture2D( tOcclusion, uv ).rgb * illum * uWeight;
            norm += illum * uWeight;
            illum *= uDecay;
          }
          // Weighted average, so the strength is uExposure and not a function
          // of the sample count.
          gl_FragColor = vec4( sum / max( norm, 1e-4 ) * uExposure * uVisible, 1.0 );
        }`,
    });

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
    const w = Math.max(1, Math.round(width * this.resolution));
    const h = Math.max(1, Math.round(height * this.resolution));
    this.rt.setSize(w, h);
    this.rtBlur.setSize(w, h);
  }

  render(renderer, writeBuffer, readBuffer) {
    const sun = this._v.copy(this.sunPosition).project(this.camera);

    // Fade out as the sun leaves the frame, otherwise the radial blur streaks
    // from an off-screen origin and smears the whole image.
    const edge = Math.max(Math.abs(sun.x), Math.abs(sun.y));
    const visible = sun.z < 1 ? THREE.MathUtils.clamp(1.7 - edge, 0, 1) : 0;
    this.blur.uniforms.uVisible.value = visible;

    const prevTarget = renderer.getRenderTarget();

    if (visible > 0.001) {
      renderer.setRenderTarget(this.rt);
      renderer.render(this.occScene, this.camera);

      this.blur.uniforms.tOcclusion.value = this.rt.texture;
      this.blur.uniforms.uSun.value.set(sun.x * 0.5 + 0.5, sun.y * 0.5 + 0.5);
      renderer.setRenderTarget(this.rtBlur);
      this.quad.material = this.blur;
      this.quad.render(renderer);
    } else {
      renderer.setRenderTarget(this.rtBlur);
      renderer.setClearColor(0x000000, 1);
      renderer.clear(true, false, false);
    }

    this.composite.uniforms.tDiffuse.value = readBuffer.texture;
    this.composite.uniforms.tRays.value = this.rtBlur.texture;
    this.quad.material = this.composite;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    if (this.clear) renderer.clear();
    this.quad.render(renderer);
    renderer.setRenderTarget(prevTarget);
  }

  dispose() {
    this.rt.dispose();
    this.rtBlur.dispose();
    this.blur.dispose();
    this.composite.dispose();
    this.quad.dispose();
  }
}
