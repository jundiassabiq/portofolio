/**
 * earth.js
 * Fullscreen Cinematic 3D Earth (Three.js)
 * - 100vw, 100vh Fullscreen Hero Section
 * - Exactly upper half circle of Earth visible, rising from the bottom horizon
 * - 100% Matte Diffuse PBR Material (Roughness: 1.0, Metalness: 0, NO light reflection/specular glare)
 * - Deep-space backdrop: Milky Way, nebula, parallax stars, shooting stars
 * - Serene, slow, continuous rotation from right to left
 * - Optional smooth drag interaction with inertia
 */

class FullscreenHalfEarth {
  /**
   * @param {string} canvasId
   * @param {string} containerId
   * @param {object} [options]
   *   anchor: 'bottom' (dome rises from the bottom edge) or 'top' (dome hangs from the top edge)
   *   heightFactor: dome radius as a fraction of the viewport height
   *   widthFactorLandscape / widthFactorPortrait: radius cap as a fraction of half the width
   *   tilt: axial tilt in radians; rotationSpeed: radians per frame
   *   initialRotation: starting Y rotation; interactive: allow drag to spin
   *   lazy: only build the scene when the section is about to scroll into view
   *   libration: amplitude (radians) of a slow sway around the initial rotation
   */
  constructor(canvasId, containerId, options = {}) {
    this.canvas = document.getElementById(canvasId);
    this.container = document.getElementById(containerId);
    if (!this.canvas || !this.container || typeof THREE === 'undefined') return;

    this.options = Object.assign({
      anchor: 'bottom',
      heightFactor: 0.5,
      widthFactorLandscape: 0.675,
      widthFactorPortrait: 1.3,
      tilt: 0.22,
      rotationSpeed: 0.00065,
      initialRotation: 0,
      interactive: true,
      lazy: false,
      libration: 0
    }, options);

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.earthGroup = null;
    this.earthMesh = null;
    this.cloudsMesh = null;

    // Slow and majestic right-to-left rotation speed
    this.rotationSpeed = this.options.rotationSpeed;
    this.currentRotationY = this.options.initialRotation;
    this.targetRotationY = this.options.initialRotation;
    this.cloudsRotationY = 0;

    // Interactive pointer drag tracking
    this.isDragging = false;
    this.previousPointerX = 0;
    this.isRendering = true;

    // Starfield parallax state (normalized cursor position, -1..1)
    this.starLayers = [];
    this.pointerTarget = { x: 0, y: 0 };
    this.pointerCurrent = { x: 0, y: 0 };
    this.clock = null;
    this.reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (this.options.lazy && 'IntersectionObserver' in window) {
      const lazyObserver = new IntersectionObserver((entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        lazyObserver.disconnect();
        this.init();
      }, { rootMargin: '600px 0px' });
      lazyObserver.observe(this.container);
    } else {
      this.init();
    }
  }

  /**
   * Procedural procedural matte earth texture fallback
   * Ensures instant rendering while high-res textures load
   */
  createProceduralEarthTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Deep matte ocean
    const ocean = ctx.createLinearGradient(0, 0, 0, 512);
    ocean.addColorStop(0, '#0c3563');
    ocean.addColorStop(0.5, '#12487e');
    ocean.addColorStop(1, '#0c3563');
    ctx.fillStyle = ocean;
    ctx.fillRect(0, 0, 1024, 512);

    // Continents
    ctx.fillStyle = '#266343';
    const continents = [
      { x: 230, y: 150, r: 90 }, { x: 280, y: 180, r: 75 }, { x: 200, y: 190, r: 55 },
      { x: 330, y: 340, r: 80 }, { x: 320, y: 280, r: 65 },
      { x: 620, y: 140, r: 125 }, { x: 740, y: 170, r: 100 }, { x: 540, y: 160, r: 85 },
      { x: 530, y: 280, r: 95 }, { x: 560, y: 350, r: 75 },
      { x: 840, y: 360, r: 60 }
    ];

    continents.forEach(c => {
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // Polar caps
    ctx.fillStyle = '#e8eff5';
    ctx.fillRect(0, 0, 1024, 28);
    ctx.fillRect(0, 488, 1024, 24);

    return new THREE.CanvasTexture(canvas);
  }

  createProceduralCloudTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 1024, 512);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    for (let i = 0; i < 75; i++) {
      const x = Math.random() * 1024;
      const y = 80 + Math.random() * 350;
      const rx = 40 + Math.random() * 95;
      const ry = 15 + Math.random() * 35;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, Math.random() * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Deep-space backdrop behind the Earth:
   * - a procedural Milky Way band with gas, dust lanes and faint nebula clouds
   *   (rendered once into a texture, so it costs nothing per frame)
   * - parallax star layers with realistic colours, a dense star band along the
   *   galaxy, and a few bright stars with soft diffraction spikes
   * - a rare, subtle shooting star
   * Everything follows the cursor slightly; nearer layers move further.
   */
  createStarfield() {
    this.clock = new THREE.Clock();
    this.tanHalfFov = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    // Galaxy band in normalised view space (units of half the view height):
    // y = slope * x + offset. Runs from top-right down to the left horizon.
    this.band = { slope: 0.36, offset: 0.34, width: 0.24 };

    this.createNebula();
    this.createStarLayers();
    if (!this.reduceMotion) this.createShootingStar();
  }

  createNebula() {
    const dist = 85;
    const halfH = this.tanHalfFov * (dist + this.camera.position.z);
    const planeW = halfH * 2 * 3.2;
    const planeH = halfH * 2 * 1.4;

    const rtW = 2560;
    const rtH = Math.round(rtW * (planeH / planeW));
    const target = new THREE.WebGLRenderTarget(rtW, rtH, { depthBuffer: false });

    const bakeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uScale: { value: new THREE.Vector2(planeW / halfH, planeH / halfH) },
        uSlope: { value: this.band.slope },
        uOffset: { value: this.band.offset },
        uWidth: { value: this.band.width }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        uniform vec2 uScale;
        uniform float uSlope, uOffset, uWidth;

        float hash(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
        }
        float noise(vec2 p) {
          vec2 i = floor(p), f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                     mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
        }
        float fbm(vec2 p) {
          float v = 0.0, a = 0.5;
          mat2 r = mat2(0.8, 0.6, -0.6, 0.8);
          for (int i = 0; i < 7; i++) { v += a * noise(p); p = r * p * 2.03 + 3.1; a *= 0.5; }
          return v;
        }

        void main() {
          vec2 p = (vUv - 0.5) * uScale;

          // Distance from the galaxy's centre line, warped so it never looks like a stripe
          float d = (p.y - (uSlope * p.x + uOffset)) / sqrt(1.0 + uSlope * uSlope);
          d += (fbm(p * 0.7 + 1.7) - 0.5) * 0.22;
          float band = exp(-pow(d / uWidth, 2.0));
          float core = exp(-pow(d / (uWidth * 0.38), 2.0));

          // Gas structure (domain-warped fbm)
          vec2 q = vec2(fbm(p * 1.4 + 0.3), fbm(p * 1.4 + 5.2));
          float gas = fbm(p * 2.1 + q * 1.9);

          // Dark dust lanes that cut through the bright core
          float dust = smoothstep(0.46, 0.76, fbm(p * 3.2 + q * 2.2 + 11.0));

          float lum = band * smoothstep(0.28, 0.88, gas);
          lum *= 1.0 - dust * 0.8 * smoothstep(0.15, 1.0, band);

          vec3 deep   = vec3(0.09, 0.13, 0.32);
          vec3 violet = vec3(0.26, 0.15, 0.40);
          vec3 warm   = vec3(0.66, 0.54, 0.44);
          vec3 col = mix(deep, violet, smoothstep(0.35, 0.75, q.x));
          col = mix(col, warm, core * smoothstep(0.45, 0.9, gas));

          vec3 c = col * lum * 0.85;

          // Faint off-band nebula clouds for depth (deep blue and a touch of magenta)
          float cloudA = smoothstep(0.58, 0.95, fbm(p * 0.85 + vec2(8.0, 2.0)));
          float cloudB = smoothstep(0.62, 0.97, fbm(p * 0.7 + vec2(-4.0, 9.0)));
          c += vec3(0.04, 0.07, 0.18) * cloudA * 0.55;
          c += vec3(0.14, 0.04, 0.12) * cloudB * 0.35;

          // Soft fade at the plane edges so parallax never reveals a border
          vec2 e = smoothstep(0.0, 0.12, vUv) * smoothstep(0.0, 0.12, 1.0 - vUv);
          c *= e.x * e.y;

          gl_FragColor = vec4(c, 1.0);
        }`
    });

    const bakeScene = new THREE.Scene();
    bakeScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bakeMaterial));
    const prevTarget = this.renderer.getRenderTarget();
    const prevToneMapping = this.renderer.toneMapping;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.setRenderTarget(target);
    this.renderer.render(bakeScene, new THREE.Camera());
    this.renderer.setRenderTarget(prevTarget);
    this.renderer.toneMapping = prevToneMapping;
    bakeMaterial.dispose();

    target.texture.encoding = THREE.sRGBEncoding;
    const material = new THREE.MeshBasicMaterial({
      map: target.texture,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      blending: THREE.AdditiveBlending
    });

    this.nebulaMesh = new THREE.Mesh(new THREE.PlaneGeometry(planeW, planeH), material);
    this.nebulaMesh.position.z = -dist;
    this.nebulaMesh.renderOrder = -2;
    // Match the far star layer's on-screen parallax at this depth
    this.nebulaParallax = 0.5 * (dist + 5) / (57 + 5);
    this.scene.add(this.nebulaMesh);
  }

  createStarLayers() {
    const pixelRatio = Math.min(window.devicePixelRatio, 2);
    const camZ = this.camera.position.z;
    const band = this.band;

    // Approximate stellar colour temperatures (mostly white / blue-white, a few warm)
    const palette = [
      [0.80, 0.87, 1.00], [0.88, 0.92, 1.00], [1.00, 1.00, 1.00], [1.00, 1.00, 1.00],
      [1.00, 0.96, 0.90], [1.00, 0.90, 0.78], [1.00, 0.82, 0.66]
    ];

    const gauss = () => {
      let u = 0, v = 0;
      while (u === 0) u = Math.random();
      while (v === 0) v = Math.random();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    };

    const layers = [
      { count: 2600, zMin: 45, zMax: 70, size: 1.7, parallax: 0.5, bright: 0 },
      { count: 900,  zMin: 25, zMax: 40, size: 2.1, parallax: 1.1, bright: 0 },
      { count: 220,  zMin: 12, zMax: 20, size: 2.6, parallax: 2.0, bright: 0.05 },
      { count: 3400, zMin: 50, zMax: 64, size: 1.25, parallax: 0.5, bright: 0, inBand: true }
    ];

    const vertexShader = `
      attribute float aSize;
      attribute float aPhase;
      attribute float aBright;
      attribute vec3 aColor;
      uniform float uTime;
      uniform float uPixelRatio;
      varying float vAlpha;
      varying float vBright;
      varying vec3 vColor;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        // Gentle twinkle (kept subtle for an elegant feel)
        vAlpha = 0.78 + 0.22 * sin(uTime * (0.6 + fract(aPhase) * 1.2) + aPhase);
        vBright = aBright;
        vColor = aColor;
        gl_PointSize = aSize * uPixelRatio * (24.0 / -mv.z);
      }`;

    const fragmentShader = `
      varying float vAlpha;
      varying float vBright;
      varying vec3 vColor;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c);
        float core = exp(-d * d * mix(40.0, 170.0, vBright));
        float halo = vBright * exp(-d * 10.0) * 0.32;
        float spikes = vBright * 0.5 * (
          exp(-abs(c.x) * 90.0) * exp(-abs(c.y) * 8.0) +
          exp(-abs(c.y) * 90.0) * exp(-abs(c.x) * 8.0));
        float a = (core + halo + spikes) * vAlpha * (1.0 - smoothstep(0.42, 0.5, d));
        if (a < 0.004) discard;
        gl_FragColor = vec4(vColor, a);
      }`;

    layers.forEach((cfg) => {
      const positions = new Float32Array(cfg.count * 3);
      const sizes = new Float32Array(cfg.count);
      const phases = new Float32Array(cfg.count);
      const brights = new Float32Array(cfg.count);
      const colors = new Float32Array(cfg.count * 3);

      for (let i = 0; i < cfg.count; i++) {
        const dist = cfg.zMin + Math.random() * (cfg.zMax - cfg.zMin);
        const halfH = this.tanHalfFov * (dist + camZ);
        // Cover the view at this depth plus room for parallax and ultrawide screens
        const spanH = halfH * 2 * 1.3;
        const spanW = spanH * 2.6;

        let x = (Math.random() - 0.5) * spanW;
        let y;
        if (cfg.inBand) {
          const xn = x / halfH;
          const yn = band.slope * xn + band.offset + gauss() * band.width * 0.55;
          y = yn * halfH;
        } else {
          y = (Math.random() - 0.5) * spanH;
        }
        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = -dist;

        const isBright = Math.random() < cfg.bright;
        brights[i] = isBright ? 1 : 0;
        // Power-law sizes: many faint stars, very few large ones
        sizes[i] = isBright
          ? 12 + Math.random() * 6
          : cfg.size * (0.55 + Math.pow(Math.random(), 4) * 2.0);
        phases[i] = Math.random() * Math.PI * 2;

        const col = palette[Math.floor(Math.random() * palette.length)];
        const lum = isBright ? 1 : (cfg.inBand ? 0.35 + Math.random() * 0.45 : 0.45 + Math.pow(Math.random(), 2) * 0.55);
        colors[i * 3] = col[0] * lum;
        colors[i * 3 + 1] = col[1] * lum;
        colors[i * 3 + 2] = col[2] * lum;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
      geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
      geometry.setAttribute('aBright', new THREE.BufferAttribute(brights, 1));
      geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));

      const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uPixelRatio: { value: pixelRatio }
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });

      const points = new THREE.Points(geometry, material);
      points.renderOrder = -1;
      this.scene.add(points);
      this.starLayers.push({ points, material, parallax: cfg.parallax });
    });
  }

  createShootingStar() {
    const material = new THREE.ShaderMaterial({
      uniforms: { uAlpha: { value: 0 } },
      vertexShader: `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `
        varying vec2 vUv;
        uniform float uAlpha;
        void main() {
          float tail = pow(vUv.x, 2.6);
          float w = 1.0 - abs(vUv.y - 0.5) * 2.0;
          float a = tail * pow(w, 2.5) * uAlpha;
          gl_FragColor = vec4(vec3(0.85, 0.92, 1.0), a);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
    mesh.position.z = -30;
    mesh.visible = false;
    mesh.renderOrder = -1;
    this.scene.add(mesh);
    this.shootingStar = { mesh, material, active: false, nextAt: 3 + Math.random() * 5 };
  }

  updateShootingStar(time) {
    const s = this.shootingStar;
    if (!s) return;
    const halfH = this.tanHalfFov * (30 + this.camera.position.z);
    const halfW = halfH * this.camera.aspect;

    if (!s.active) {
      if (time < s.nextAt) return;
      // Spawn in the upper part of the sky, heading down and across
      const dir = Math.random() < 0.5 ? -1 : 1;
      const angle = dir < 0 ? Math.PI + 0.42 + Math.random() * 0.25 : -0.42 - Math.random() * 0.25;
      s.start = new THREE.Vector2((Math.random() * 1.2 - 0.6) * halfW, (0.35 + Math.random() * 0.5) * halfH);
      s.vel = new THREE.Vector2(Math.cos(angle), Math.sin(angle)).multiplyScalar(halfH * 0.9);
      s.length = halfH * (0.28 + Math.random() * 0.18);
      s.startTime = time;
      s.duration = 0.9 + Math.random() * 0.5;
      s.mesh.rotation.z = angle;
      s.mesh.scale.set(s.length, halfH * 0.0035, 1);
      s.mesh.visible = true;
      s.active = true;
    }

    const t = (time - s.startTime) / s.duration;
    if (t >= 1) {
      s.active = false;
      s.mesh.visible = false;
      s.nextAt = time + 7 + Math.random() * 10;
      return;
    }
    s.material.uniforms.uAlpha.value = Math.sin(Math.PI * t) * 0.85;
    s.mesh.position.x = s.start.x + s.vel.x * t * s.duration;
    s.mesh.position.y = s.start.y + s.vel.y * t * s.duration;
  }

  updateStarfield() {
    if (!this.starLayers.length) return;
    const time = this.clock.getElapsedTime();

    if (!this.reduceMotion) {
      this.pointerCurrent.x += (this.pointerTarget.x - this.pointerCurrent.x) * 0.045;
      this.pointerCurrent.y += (this.pointerTarget.y - this.pointerCurrent.y) * 0.045;
    }

    // Move toward the cursor; nearer layers shift further
    this.starLayers.forEach((layer) => {
      layer.material.uniforms.uTime.value = time;
      layer.points.position.x = this.pointerCurrent.x * layer.parallax;
      layer.points.position.y = -this.pointerCurrent.y * layer.parallax;
    });

    if (this.nebulaMesh) {
      this.nebulaMesh.position.x = this.pointerCurrent.x * this.nebulaParallax;
      this.nebulaMesh.position.y = -this.pointerCurrent.y * this.nebulaParallax;
    }

    this.updateShootingStar(time);
  }

  /** Lights for the Earth: warm sun from the upper left, cool fill and rim. */
  setupLights() {
    // 3. Diffused Uniform Lighting (Zero Specular Glare / No harsh reflections)
    const ambientLight = new THREE.AmbientLight(0xbcd4ff, 0.55);
    this.scene.add(ambientLight);

    // Soft sunlight from upper-left gives natural day/shade falloff across the globe
    const sunLight = new THREE.DirectionalLight(0xfff4e6, 1.9);
    sunLight.position.set(-4, 3.5, 5);
    this.scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x8fbfff, 0.35);
    rimLight.position.set(5, 1, -3);
    this.scene.add(rimLight);

  }

  /** Earth meshes: surface, clouds, Fresnel atmosphere; then high-res textures. */
  buildBody() {
    // 5. Unit Sphere Geometries (Scaled proportionally by updateSizing)
    const segments = 64;
    const earthGeometry = new THREE.SphereGeometry(1.0, segments, segments);
    const initialDayMap = this.createProceduralEarthTexture();

    // 100% Matte Material: roughness 1.0, metalness 0.0 -> COMPLETELY MATTE, ZERO SPECULAR REFLECTION
    const earthMaterial = new THREE.MeshStandardMaterial({
      map: initialDayMap,
      roughness: 0.92,
      metalness: 0.0,
      bumpScale: 0.02
    });

    this.earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
    this.earthGroup.add(this.earthMesh);

    // Soft Atmospheric Cloud Layer
    const cloudsGeometry = new THREE.SphereGeometry(1.012, segments, segments);
    const initialCloudMap = this.createProceduralCloudTexture();
    const cloudsMaterial = new THREE.MeshStandardMaterial({
      map: initialCloudMap,
      transparent: true,
      opacity: 0.6,
      roughness: 1.0,
      metalness: 0.0
    });

    this.cloudsMesh = new THREE.Mesh(cloudsGeometry, cloudsMaterial);
    this.earthGroup.add(this.cloudsMesh);

    // Fresnel atmosphere glow (thin blue rim, fades to transparent)
    const atmosphereMaterial = new THREE.ShaderMaterial({
      vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'varying vec3 vN; varying vec3 vV; void main(){ float f = 1.0 - max(dot(vN, vV), 0.0); float i = pow(f, 2.6); gl_FragColor = vec4(vec3(0.38,0.65,1.0), i * 0.9); }',
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide
    });
    this.atmosphereMesh = new THREE.Mesh(new THREE.SphereGeometry(1.035, segments, segments), atmosphereMaterial);
    this.earthGroup.add(this.atmosphereMesh);

    // 6. Seamlessly upgrade to High-Res Textures
    const textureLoader = new THREE.TextureLoader();
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();

    textureLoader.load('assets/textures/earth_day.jpg', (tex) => {
      tex.encoding = THREE.sRGBEncoding;
      tex.anisotropy = maxAniso;
      earthMaterial.map = tex;
      earthMaterial.needsUpdate = true;
    });

    textureLoader.load('assets/textures/earth_normal.jpg', (norm) => {
      norm.anisotropy = maxAniso;
      earthMaterial.normalMap = norm;
      earthMaterial.normalScale = new THREE.Vector2(0.8, 0.8);
      earthMaterial.needsUpdate = true;
    });

    // Specular map: oceans are slightly glossier than land (still very soft)
    textureLoader.load('assets/textures/earth_specular.jpg', (spec) => {
      spec.anisotropy = maxAniso;
      earthMaterial.roughnessMap = spec;
      earthMaterial.roughness = 1.0;
      earthMaterial.needsUpdate = true;
    });

    textureLoader.load('assets/textures/earth_clouds.png', (cloudTex) => {
      cloudTex.encoding = THREE.sRGBEncoding;
      cloudTex.anisotropy = maxAniso;
      cloudsMaterial.map = cloudTex;
      cloudsMaterial.alphaMap = null;
      cloudsMaterial.needsUpdate = true;
    });
  }
  init() {
    const width = window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    // 1. Scene & Camera setup
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.camera.position.set(0, 0, 5.0);

    // 2. High-performance WebGL Renderer with Apple White transparency
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    // 3. Lighting (overridable per body)
    this.setupLights();

    // 3b. Starfield behind the Earth (parallax layers that follow the cursor)
    this.createStarfield();

    // 4. Root group: axial tilt, positioned on the top or bottom edge by updateSizing
    this.earthGroup = new THREE.Group();
    this.earthGroup.rotation.x = this.options.tilt;
    this.scene.add(this.earthGroup);

    // 5. The body itself (meshes + textures), overridable per body
    this.buildBody();
    this.updateSizing();
    // 7. Event Listeners
    window.addEventListener('resize', this.onResize.bind(this));
    // Re-fit when the section itself changes height (e.g. content reflow)
    if ('ResizeObserver' in window) {
      let lastH = this.container.clientHeight;
      new ResizeObserver(() => {
        const h = this.container.clientHeight;
        if (Math.abs(h - lastH) > 1) { lastH = h; this.onResize(); }
      }).observe(this.container);
    }
    // Pause rendering while the section is off screen (saves CPU/battery)
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => { this.isRendering = entry.isIntersecting; })
        .observe(this.container);
    }

    // Interactive pointer drag listeners
    if (this.options.interactive) this.initPointerDrag();

    // Stars follow the cursor
    window.addEventListener('pointermove', (e) => {
      this.pointerTarget.x = (e.clientX / window.innerWidth - 0.5) * 2;
      this.pointerTarget.y = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });

    // 8. Start Rendering Loop
    this.animate();
  }

  /**
   * Calculates the exact radius so the dome has breathtaking Apple proportions
   * across all screen sizes and mobile aspect ratios.
   */
  calculateRadius(w, h) {
    if (!this.camera) return 2.6;
    const vFov = THREE.MathUtils.degToRad(this.camera.fov);
    const visibleHeight = 2 * Math.tan(vFov / 2) * this.camera.position.z;
    const visibleWidth = visibleHeight * (w / h);

    // Desktop/Laptop: dome spans ~51% of screen height
    // Mobile/Narrow: fits within ~67% of screen width to prevent horizontal clipping
    // Tie globe size to viewport height (not the shorter hero) so only the empty space above shrinks.
    const o = this.options;
    const rByHeight = visibleHeight * o.heightFactor * (window.innerHeight / h);
    // On portrait/mobile screens let the dome extend past the screen edges so it stays prominent
    const portrait = window.innerWidth / window.innerHeight < 0.8;
    const rByWidth = (visibleWidth / 2) * (portrait ? o.widthFactorPortrait : o.widthFactorLandscape);
    return Math.min(rByHeight, rByWidth);
  }

  /**
   * Pins the center of the sphere at the bottom camera frustum line.
   * This guarantees that EXACTLY the top half (semicircle) is visible on screen.
   */
  updateSizing() {
    if (!this.camera || !this.earthGroup) return;

    const width = window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    const vFov = THREE.MathUtils.degToRad(this.camera.fov);
    const visibleHeight = 2 * Math.tan(vFov / 2) * this.camera.position.z;
    const edgeY = this.options.anchor === 'top' ? visibleHeight / 2 : -visibleHeight / 2;

    // Pin the centre exactly on the top or bottom edge, so exactly half the sphere shows
    this.earthGroup.position.set(0, edgeY, 0);

    // Scale unit sphere to calculated radius
    const radius = this.calculateRadius(width, height);
    this.earthGroup.scale.set(radius, radius, radius);

    // Expose the on-screen radius so CSS can lay content out around the dome
    const radiusPx = (radius / visibleHeight) * height;
    this.container.style.setProperty('--body-radius', radiusPx.toFixed(1) + 'px');
  }

  onResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);

    this.updateSizing();
  }

  /**
   * Smooth interactive drag interaction (mouse & touch)
   */
  initPointerDrag() {
    const onPointerDown = (e) => {
      this.isDragging = true;
      this.previousPointerX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      this.canvas.style.cursor = 'grabbing';
    };

    const onPointerMove = (e) => {
      if (!this.isDragging) return;
      const currentX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      const deltaX = currentX - this.previousPointerX;
      this.previousPointerX = currentX;

      // Allow dragging left or right with smooth responsiveness
      this.targetRotationY += deltaX * 0.0035;
    };

    const onPointerUp = () => {
      this.isDragging = false;
      this.canvas.style.cursor = 'grab';
    };

    this.canvas.style.cursor = 'grab';
    this.canvas.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    this.canvas.addEventListener('touchstart', onPointerDown, { passive: true });
    window.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('touchend', onPointerUp, { passive: true });
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));

    if (!this.isRendering) return;

    // Continuous majestic right-to-left rotation (deltaY < 0 moves front face from right to left)
    if (!this.isDragging) {
      this.targetRotationY -= this.rotationSpeed;
    }

    // Smooth dampening interpolation
    this.currentRotationY += (this.targetRotationY - this.currentRotationY) * 0.08;

    if (this.earthMesh) {
      // Optional libration: a slow side-to-side sway instead of a full spin (used by the Moon)
      const sway = this.options.libration && this.clock
        ? Math.sin(this.clock.getElapsedTime() * 0.05) * this.options.libration
        : 0;
      this.earthMesh.rotation.y = this.currentRotationY + sway;
    }

    // Clouds rotate slightly faster for dynamic depth
    if (this.cloudsMesh) {
      this.cloudsRotationY -= this.rotationSpeed * 1.15;
      this.cloudsMesh.rotation.y = this.cloudsRotationY;
    }

    this.updateStarfield();

    this.renderer.render(this.scene, this.camera);
  }
}

// Auto-initialize on load
document.addEventListener('DOMContentLoaded', () => {
  window.fullscreenEarth = new FullscreenHalfEarth('earth-canvas', 'hero-fullscreen');
});
