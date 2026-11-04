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

const spotlight = new THREE.SpotLight(0x0e345e, 12000, 16, Math.PI / 5, 0.8, 2);
spotlight.position.set(0, 10, 8);
spotlight.target.position.set(0, 5, 0);
scene.add(spotlight, spotlight.target);

const focus = new THREE.Vector3(0, 4.326, 0);
let frameRequested = false;

function render() {
  frameRequested = false;
  const width = container.clientWidth;
  const height = container.clientHeight;
  if (!width || !height || document.hidden) return;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(width, height, false);

  // Crop half the tower at the left edge, with the lantern 45% down.
  // On narrow screens allow some left-side cropping while keeping the right clear.
  const aspect = width / height;
  const visibleHeight = Math.max(2.1, 2.1 / aspect);
  const distance = visibleHeight / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
  camera.position.copy(focus).add(new THREE.Vector3(0, 0, distance));
  camera.lookAt(focus);
  camera.setViewOffset(width, height, width * 0.5, height * 0.05, width, height);
  camera.updateProjectionMatrix();
  renderer.render(scene, camera);
}

// This scene is stationary; redraw only when its assets or viewport change.
function requestRender() {
  if (frameRequested) return;
  frameRequested = true;
  requestAnimationFrame(render);
}
new ResizeObserver(requestRender).observe(container);
window.addEventListener("resize", requestRender);
document.addEventListener("visibilitychange", requestRender);

new GLTFLoader().load(
  new URL("models/Lighthouse_Model.glb", assetBase).href,
  ({ scene: lighthouse }) => {
    const glass = new THREE.MeshPhysicalMaterial({
      color: 0xffe9ac, roughness: 0.1, metalness: 0,
      transmission: 0.9, transparent: true, opacity: 0.35,
      thickness: 0.2, ior: 1.45, side: THREE.DoubleSide, depthWrite: false,
    });
    const light = new THREE.MeshStandardMaterial({
      color: 0xffe9ac, emissive: 0xffe9ac, emissiveIntensity: 12,
      roughness: 0.2, metalness: 0,
    });
    let orb;
    lighthouse.traverse((child) => {
      if (!child.isMesh) return;
      if (!child.geometry.attributes.normal) child.geometry.computeVertexNormals();
      if (child.name === "Tower_Glass") child.material = glass;
      if (child.name === "Sphere001" || child.name === "Sphere.001") {
        child.material = light;
        orb = child;
      }
    });
    scene.add(lighthouse);
    lighthouse.updateWorldMatrix(true, true);
    if (orb) {
      orb.getWorldPosition(focus);
      orb.add(new THREE.PointLight(0xffe9ac, 4, 2, 1));

      // A soft optical halo adds visible glow beyond the already-white orb.
      // Allocate once; keep the original model materials and renderer unchanged.
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
    if (status) status.hidden = true;
    requestRender();
  },
  undefined,
  (error) => {
    console.error("Could not load the services lighthouse model:", error);
    if (status) status.textContent = "The lighthouse could not load. Please refresh to try again.";
  },
);
requestRender();
