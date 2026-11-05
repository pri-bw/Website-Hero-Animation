import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// Independent services composition: the hero continues to use main.js.
const container = document.querySelector("#lighthouse-services-scene");
if (!container) throw new Error('Missing "lighthouse-services-scene".');
const status = container.parentElement.querySelector(".scene-status");
const assetBase = new URL(container.dataset.assetBase || "./", import.meta.url);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 100);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
container.appendChild(renderer.domElement);

const spotlight = new THREE.SpotLight(0x0e345e, 5000, 16, Math.PI / 4, 1, 2);
spotlight.position.set(0, 10, 8);
spotlight.target.position.set(0, 5, 0);
scene.add(spotlight, spotlight.target);

const focus = new THREE.Vector3(0, 4.326, 0);
const track = container.closest("[data-services-track]") || container.parentElement;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const rotationPivot = new THREE.Group();
scene.add(rotationPivot);
let rotationTime = 0;
const projectedFocus = new THREE.Vector3();
let scrollTarget = 0;
let scrollProgress = 0;
let width = 1;
let height = 1;
let visible = true;
let frameRequested = false;
let previousTime = 0;

// Screen-space light spill stays attached to the projected lantern, including
// when the mobile camera pans it out of frame. Both lobes fade fully to zero.
const spillMaterial = new THREE.ShaderMaterial({
  uniforms: { source: { value: new THREE.Vector2(0, 0.55) } },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position.xy, 1.0, 1.0);
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    uniform vec2 source;
    void main() {
      vec2 delta = vUv - source;
      float radius = length(delta / vec2(0.72, 0.62));
      float haze = exp(-3.5 * radius * radius)
        * (1.0 - smoothstep(0.25, 1.25, radius));
      float rayRadius = length(vec2(delta.x / 0.9,
        (delta.y - delta.x * 0.12) / 0.18));
      float ray = exp(-3.0 * rayRadius * rayRadius)
        * (1.0 - smoothstep(0.1, 1.1, rayRadius));
      gl_FragColor = vec4(vec3(1.0, 0.83, 0.48), haze * 0.22 + ray * 0.07);
      #include <colorspace_fragment>
    }
  `,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  depthTest: false,
  toneMapped: false,
});
const spill = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), spillMaterial);
spill.frustumCulled = false;
spill.renderOrder = -1;
scene.add(spill);

function measure() {
  width = container.clientWidth;
  height = container.clientHeight;
  if (width && height) {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
  }
  updateScroll();
}

function updateScroll() {
  const travel = track.clientHeight - height;
  scrollTarget = travel > 0
    ? THREE.MathUtils.clamp(-track.getBoundingClientRect().top / travel, 0, 1)
    : 0;
  requestRender();
}

function render(time) {
  frameRequested = false;
  if (!width || !height || document.hidden || !visible) return;
  const delta = previousTime ? Math.min((time - previousTime) / 1000, 0.05) : 1 / 60;
  previousTime = time;
  const smoothing = reducedMotion.matches ? 1 : 1 - Math.exp(-7 * delta);
  scrollProgress = THREE.MathUtils.lerp(scrollProgress, scrollTarget, smoothing);
  const progress = THREE.MathUtils.smoothstep(scrollProgress, 0, 1);
  const mobile = width <= 767 || (window.matchMedia("(pointer: coarse)").matches && height <= 500);
  // Clear the phone's content before the second spread takes over.
  const panProgress = mobile ? THREE.MathUtils.smoothstep(scrollProgress, 0, 0.45) : progress;
  if (!reducedMotion.matches) rotationTime += delta;
  rotationPivot.rotation.y = reducedMotion.matches ? 0
    : (rotationTime * THREE.MathUtils.degToRad(0.6)) % (Math.PI * 2);

  // Keep framing distance based on the opening FOV so it doesn't cancel the
  // lens change. A small dolly adds perspective to the narrowing lens.
  const aspect = width / height;
  const visibleHeight = Math.max(2.1, 2.1 / aspect);
  const distance = visibleHeight / (2 * Math.tan(THREE.MathUtils.degToRad(24 / 2)));
  camera.position.set(focus.x, focus.y, focus.z + distance * (1 - progress * 0.04));
  camera.lookAt(focus);
  camera.zoom = 1;
  camera.fov = THREE.MathUtils.lerp(24, 21, progress);
  camera.setViewOffset(width, height,
    width * (0.5 + panProgress * (mobile ? 0.58 : 0.03)),
    height * 0.05, width, height);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  projectedFocus.copy(focus).project(camera);
  spillMaterial.uniforms.source.value.set(
    projectedFocus.x * 0.5 + 0.5, projectedFocus.y * 0.5 + 0.5,
  );
  renderer.render(scene, camera);
  if (Math.abs(scrollProgress - scrollTarget) > 0.0001
    || (!reducedMotion.matches && (!mobile || panProgress < 1))) {
    requestRender();
  } else {
    previousTime = 0;
  }
}

// Animate the slow rotation while visible; pause offscreen/in hidden tabs,
// and once the mobile lighthouse has left the frame.
function requestRender() {
  if (frameRequested || document.hidden || !visible) return;
  frameRequested = true;
  requestAnimationFrame(render);
}
new ResizeObserver(measure).observe(container);
new ResizeObserver(updateScroll).observe(track);
new IntersectionObserver(([entry]) => {
  visible = entry.isIntersecting;
  previousTime = 0;
  if (visible) { measure(); }
}).observe(container);
window.addEventListener("resize", measure);
window.addEventListener("scroll", updateScroll, { passive: true });
reducedMotion.addEventListener("change", requestRender);
document.addEventListener("visibilitychange", () => {
  previousTime = 0;
  if (!document.hidden) measure();
});

new GLTFLoader().load(
  new URL("models/Lighthouse_Model.glb", assetBase).href,
  ({ scene: lighthouse }) => {
    const glass = new THREE.MeshPhysicalMaterial({
      color: 0xffe9ac, roughness: 0.3, metalness: 0, specularIntensity: 0.35,
      // Thin tinted glazing: avoid refracting the interior a second time and
      // drawing both sides of the shell as overlapping transparent layers.
      transmission: 0, transparent: true, opacity: 0.14,
      thickness: 0, side: THREE.FrontSide, depthWrite: false,
    });
    const light = new THREE.MeshStandardMaterial({
      color: 0xffe9ac, emissive: 0xffe9ac, emissiveIntensity: 12,
      roughness: 0.2, metalness: 0,
    });
    // Clone once per shared material. Services-only finish changes leave the
    // GLB, texture maps, exported normals, and homepage materials untouched.
    const softenedMaterials = new Map();
    function softenMaterial(original) {
      if (softenedMaterials.has(original)) return softenedMaterials.get(original);
      const material = original.clone();
      if ("roughness" in material) material.roughness = Math.max(material.roughness, 0.85);
      if ("metalness" in material) material.metalness = Math.min(material.metalness, 0.15);
      if ("envMapIntensity" in material) material.envMapIntensity *= 0.35;
      if ("specularIntensity" in material) material.specularIntensity *= 0.45;
      if ("clearcoat" in material) material.clearcoat *= 0.25;
      softenedMaterials.set(original, material);
      return material;
    }
    let orb;
    lighthouse.traverse((child) => {
      if (!child.isMesh) return;
      if (!child.geometry.attributes.normal) child.geometry.computeVertexNormals();
      if (child.name === "Tower_Glass") child.material = glass;
      if (child.name === "Sphere001" || child.name === "Sphere.001") {
        child.material = light;
        orb = child;
      } else if (child.name !== "Tower_Glass") {
        child.material = Array.isArray(child.material)
          ? child.material.map(softenMaterial) : softenMaterial(child.material);
      }
    });
    scene.add(lighthouse);
    lighthouse.updateWorldMatrix(true, true);
    if (orb) {
      orb.getWorldPosition(focus);
      orb.add(new THREE.PointLight(0xffe9ac, 2, 2, 1));

      // A soft optical halo adds visible glow beyond the already-white orb.
      // Allocate once; the optical glow is independent of the surface finish.
      const haloCanvas = document.createElement("canvas");
      haloCanvas.width = haloCanvas.height = 128;
      const context = haloCanvas.getContext("2d");
      const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
      gradient.addColorStop(0, "rgba(255,233,172,0.6)");
      gradient.addColorStop(0.25, "rgba(255,233,172,0.3)");
      gradient.addColorStop(0.6, "rgba(255,233,172,0.08)");
      gradient.addColorStop(1, "rgba(255,233,172,0)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, 128, 128);
      const haloTexture = new THREE.CanvasTexture(haloCanvas);
      haloTexture.colorSpace = THREE.SRGBColorSpace;
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({
        map: haloTexture, transparent: true, blending: THREE.AdditiveBlending,
        depthWrite: false, depthTest: false, toneMapped: false,
      }));
      halo.position.copy(focus);
      halo.scale.set(1.5, 1.5, 1);
      halo.renderOrder = 1;
      scene.add(halo);
    } else {
      console.warn("Lighthouse lantern mesh missing; using the model's known lantern height.");
    }
    // Rotate around the lantern itself so the glow and camera anchor stay fixed.
    rotationPivot.position.copy(focus);
    rotationPivot.rotation.y = 0;
    rotationPivot.updateMatrixWorld();
    rotationPivot.attach(lighthouse);
    if (status) status.hidden = true;
    requestRender();
  },
  undefined,
  (error) => {
    console.error("Could not load the services lighthouse model:", error);
    if (status) status.textContent = "The lighthouse could not load. Please refresh to try again.";
  },
);
measure();
