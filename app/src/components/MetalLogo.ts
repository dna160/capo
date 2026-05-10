import * as THREE from 'three';

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform float uTime;
varying vec2 vUv;

// Simplex noise functions
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float fbm(vec2 p) {
  float sum = 0.0;
  float amp = 1.0;
  float freq = 1.0;
  for (int i = 0; i < 5; i++) {
    sum += amp * snoise(p * freq);
    freq *= 2.0;
    amp *= 0.5;
  }
  return sum;
}

void main() {
  vec2 uv = vUv;
  float time = uTime * 0.3;

  // Create flowing metallic noise
  float n1 = fbm(vec2(uv.x * 3.0 + time, uv.y * 3.0 - time * 0.5));
  float n2 = fbm(vec2(uv.x * 2.0 - time * 0.7, uv.y * 4.0 + time * 0.3));
  float n3 = fbm(vec2(uv.x * 5.0 + time * 0.2, uv.y * 2.0 - time * 0.8));

  // Metallic color palette
  float metal = (n1 + n2 * 0.5 + n3 * 0.25) / 1.75;
  metal = metal * 0.5 + 0.5;

  // Dark steel base with cyan highlights
  vec3 darkSteel = vec3(0.05, 0.06, 0.08);
  vec3 midSteel = vec3(0.15, 0.18, 0.22);
  vec3 highlight = vec3(0.0, 0.95, 1.0); // Cyan
  vec3 whiteHot = vec3(0.8, 0.95, 1.0);

  vec3 color = mix(darkSteel, midSteel, smoothstep(0.0, 0.4, metal));
  color = mix(color, highlight, smoothstep(0.4, 0.7, metal) * 0.6);
  color = mix(color, whiteHot, smoothstep(0.7, 0.95, metal) * 0.3);

  // Add subtle magenta edge glow
  float edgeGlow = smoothstep(0.0, 0.3, uv.x) * smoothstep(1.0, 0.7, uv.x);
  edgeGlow += smoothstep(0.0, 0.2, uv.y) * smoothstep(1.0, 0.8, uv.y);
  color += vec3(1.0, 0.0, 1.0) * edgeGlow * 0.04;

  gl_FragColor = vec4(color, 1.0);
}
`;

export class MetalLogo {
  container: HTMLElement;
  width: number;
  height: number;
  time: number;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  material: THREE.ShaderMaterial;
  mesh: THREE.Mesh;
  animationId: number;
  resizeObserver: ResizeObserver | null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.resizeObserver = null;
    this.animationId = 0;
    this.time = 0;

    const rect = container.getBoundingClientRect();
    this.width = Math.max(rect.width, 100);
    this.height = Math.max(rect.height, 100);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x050608, 1);

    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.display = 'block';

    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 0.1, 100);
    this.camera.position.set(0, 0, 2);

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0.0 },
      },
    });

    const geometry = new THREE.PlaneGeometry(3, 3);
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.scene.add(this.mesh);

    this.render = this.render.bind(this);
  }

  render() {
    this.animationId = requestAnimationFrame(this.render);
    this.material.uniforms.uTime.value = this.time;
    this.renderer.render(this.scene, this.camera);
    this.time += 0.016;
  }

  start() {
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          this.width = width;
          this.height = height;
          this.camera.aspect = this.width / this.height;
          this.camera.updateProjectionMatrix();
          this.renderer.setSize(this.width, this.height);
        }
      }
    });
    this.resizeObserver.observe(this.container);
    this.render();
  }

  stop() {
    cancelAnimationFrame(this.animationId);
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  resize() {
    const rect = this.container.getBoundingClientRect();
    this.width = Math.max(rect.width, 100);
    this.height = Math.max(rect.height, 100);
    if (this.width === 0 || this.height === 0) return;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }

  destroy() {
    this.stop();
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
