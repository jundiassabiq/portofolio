/**
 * moon.js
 * Half Moon hanging from the top of the contact section.
 * Reuses the Earth scene engine (deep-space backdrop, parallax stars, sizing)
 * and only swaps the lighting and the body.
 *
 * Look: a full Moon as seen through a telescope. Front-lit, so the surface shows
 * albedo (dark maria, bright highlands, Tycho's rays) instead of shadowed relief,
 * and the brightness stays almost even out to the limb, like the real Moon.
 *
 * Texture: NASA Scientific Visualization Studio, CGI Moon Kit
 * (LRO / LROC WAC mosaic), public domain. https://svs.gsfc.nasa.gov/4720
 * Converted to neutral grey with gentle levels and sharpening.
 */

class HalfMoon extends FullscreenHalfEarth {
  // The full-Moon shader is self-lit, so no scene lights are needed
  setupLights() {}

  buildBody() {
    const segments = 160;

    this.moonMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: null },
        uHasMap: { value: 0 },
        uBrightness: { value: 1.12 }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
          vUv = uv;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vNormal = normalize(normalMatrix * normal);
          vView = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform sampler2D uMap;
        uniform float uHasMap;
        uniform float uBrightness;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
          vec3 albedo = uHasMap > 0.5 ? texture2D(uMap, vUv).rgb : vec3(0.55);
          float ndv = clamp(dot(normalize(vNormal), normalize(vView)), 0.0, 1.0);
          // The full Moon barely darkens toward its edge (regolith back-scatters light)
          float limb = mix(0.74, 1.0, pow(ndv, 0.35));
          // Hairline anti-aliased rim so the silhouette stays crisp
          float edge = smoothstep(0.0, 0.035, ndv);
          gl_FragColor = vec4(albedo * limb * uBrightness * edge, 1.0);
        }`
    });

    this.earthMesh = new THREE.Mesh(new THREE.SphereGeometry(1, segments, segments), this.moonMaterial);
    this.earthGroup.add(this.earthMesh);

    // Very soft halo, like light scattering around the Moon in a long-lens photo
    this.earthGroup.add(this.createHalo());

    const loader = new THREE.TextureLoader();
    loader.load('assets/textures/moon_color.jpg', (tex) => {
      tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      this.moonMaterial.uniforms.uMap.value = tex;
      this.moonMaterial.uniforms.uHasMap.value = 1;
    });
  }

  createHalo() {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.34, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(220, 228, 255, 0.55)');
    g.addColorStop(0.25, 'rgba(200, 212, 255, 0.18)');
    g.addColorStop(1, 'rgba(200, 212, 255, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);

    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(canvas),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.22,
      toneMapped: false
    }));
    halo.scale.set(2.9, 2.9, 1); // relative to the Moon's radius (group scale)
    return halo;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.contactMoon = new HalfMoon('moon-canvas', 'contact', {
    anchor: 'top',
    heightFactor: 0.4,
    widthFactorLandscape: 0.5,
    widthFactorPortrait: 1.05,
    tilt: 0.5,                     // shows the southern maria, highlands and Tycho's rays
    initialRotation: -Math.PI / 2, // near side faces the viewer
    rotationSpeed: 0,              // tidally locked: it does not spin...
    libration: 0.09,               // ...it only sways gently, like real lunar libration
    interactive: false,            // the contact form sits on top, so no drag-to-spin here
    lazy: true                     // build only when the contact section is near
  });
});
