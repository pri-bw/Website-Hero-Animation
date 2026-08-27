import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// Webflow: give the hero's Three.js layer this ID.
const container = document.querySelector("#lighthouse-scene");

if (!container) {
  throw new Error('Missing an element with the ID "lighthouse-scene".');
}

// Webflow does not host .glb files; replace this with a public CDN URL.
const modelUrl =
  "https://cdn.jsdelivr.net/gh/pri-bw/Website-Hero-Animation@main/models/Lighthouse_Model.glb";

// Scene and spotlight
const scene = new THREE.Scene();
let lighthouseBeam;
let pointerIsInside = false;

// Beam interaction settings
const baseBeamYaw = THREE.MathUtils.degToRad(-110);
const baseBeamTilt = THREE.MathUtils.degToRad(-2);
const horizontalRange = THREE.MathUtils.degToRad(30);
const verticalRange = THREE.MathUtils.degToRad(16);
const followSpeed = 0.07;
const automaticRotationSpeed = 0.005;

let targetBeamYaw = baseBeamYaw;
let targetBeamTilt = baseBeamTilt;

const spotlight = new THREE.SpotLight(0x0E345E, 2000);
spotlight.position.set(0, 10, 8);
spotlight.angle = Math.PI / 4;
spotlight.penumbra = 0.6;
spotlight.target.position.set(0, 2, 0);
scene.add(spotlight);
scene.add(spotlight.target);

// Camera
const camera = new THREE.PerspectiveCamera(
  24,
  1,
  0.1,
  1000,
);
camera.position.set(-6, -4, 32);
camera.rotation.x = THREE.MathUtils.degToRad(18);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setClearColor(0x000000, 0);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
container.appendChild(renderer.domElement);

// Size the canvas to the Webflow hero rather than the browser window.
function resizeScene() {
  const width = container.clientWidth;
  const height = container.clientHeight;

  if (!width || !height) return;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

const resizeObserver = new ResizeObserver(resizeScene);
resizeObserver.observe(container);
resizeScene();

// Track the pointer without letting the canvas block Webflow links or buttons.
window.addEventListener("pointermove", (event) => {
  const bounds = container.getBoundingClientRect();
  const isInside =
    event.clientX >= bounds.left &&
    event.clientX <= bounds.right &&
    event.clientY >= bounds.top &&
    event.clientY <= bounds.bottom;

  if (!isInside) {
    pointerIsInside = false;
    return;
  }

  if (!pointerIsInside && lighthouseBeam) {
    lighthouseBeam.rotation.y = Math.atan2(
      Math.sin(lighthouseBeam.rotation.y),
      Math.cos(lighthouseBeam.rotation.y),
    );
  }

  pointerIsInside = true;

  const pointerX = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
  const pointerY = 1 - ((event.clientY - bounds.top) / bounds.height) * 2;

  targetBeamYaw = baseBeamYaw + pointerX * horizontalRange;
  targetBeamTilt = baseBeamTilt + pointerY * verticalRange;
});

window.addEventListener("blur", () => {
  pointerIsInside = false;
});

// Volumetric lighthouse beam
function createLightBeam() {
  const length = 20;
  const originRadius = 0.05;
  const radius = 4;
  const geometry = new THREE.CylinderGeometry(
    originRadius,
    radius,
    length,
    48,
    1,
    true,
  );

  const material = new THREE.ShaderMaterial({
    uniforms: {
      beamColor: { value: new THREE.Color(0xffe9ac) },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewPosition;

      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);

        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = viewPosition.xyz;
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      uniform vec3 beamColor;

      void main() {
        float distanceFromOrb = 1.0 - vUv.y;
        float originFade = smoothstep(0.0, 0.4, distanceFromOrb);
        float distanceFade = pow(1.0 - distanceFromOrb, 1.1);

        vec3 viewDirection = normalize(-vViewPosition);
        float facing = abs(dot(normalize(vNormal), viewDirection));
        float edgeSoftness = mix(0.9, 1.8, distanceFromOrb);
        float edgeFade = smoothstep(0.0, edgeSoftness, facing);

        float opacity = originFade * distanceFade * edgeFade * 0.2;
        gl_FragColor = vec4(beamColor, opacity);
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });

  const beam = new THREE.Mesh(geometry, material);
  beam.rotation.z = Math.PI / 2;
  beam.position.x = length / 2;

  // The pivot rotates the cone around the orb instead of around the cone's centre.
  const pivot = new THREE.Group();
  pivot.add(beam);

  return pivot;
}

// Load the lighthouse and create its materials
const loader = new GLTFLoader();
loader.load(
  modelUrl,
  (gltf) => {
    const lighthouse = gltf.scene;

    const lighthouseMaterial = new THREE.MeshStandardMaterial({
      color: 0x031224,
      roughness: 0.85,
      metalness: 0,
      flatShading: false,
    });

    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffe9ac,
      roughness: 0.1,
      metalness: 0,
      transmission: 0.9,
      transparent: true,
      opacity: 0.35,
      thickness: 0.2,
      ior: 1.45,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const orbMaterial = new THREE.MeshStandardMaterial({
      color: 0xffe9ac,
      emissive: 0xffe9ac,
      emissiveIntensity: 8,
      roughness: 0.2,
      metalness: 0,
    });

    let orb;

    // Assign materials to the named model parts.
    lighthouse.traverse((child) => {
      if (!child.isMesh) return;

      child.geometry.computeVertexNormals();

      if (child.name === "Tower_Glass") {
        child.material = glassMaterial;
      } else if (child.name === "Sphere001" || child.name === "Sphere.001") {
        child.material = orbMaterial;
        orb = child;
      } else {
        child.material = lighthouseMaterial;
      }
    });

    // Add these after traversal so their materials are not replaced.
    if (orb) {
      const orbLight = new THREE.PointLight(0xffe9ac, 10, 1.5, 2);
      orb.add(orbLight);

      lighthouseBeam = createLightBeam();
      orb.add(lighthouseBeam);
    }

    scene.add(lighthouse);
  },
  undefined,
  (error) => {
    console.error("Could not load the lighthouse model:", error);
  },
);

// Follow the pointer while it is inside; rotate automatically while it is outside.
renderer.setAnimationLoop(() => {
  if (lighthouseBeam) {
    if (pointerIsInside) {
      lighthouseBeam.rotation.y = THREE.MathUtils.lerp(
        lighthouseBeam.rotation.y,
        targetBeamYaw,
        followSpeed,
      );
      lighthouseBeam.rotation.z = THREE.MathUtils.lerp(
        lighthouseBeam.rotation.z,
        targetBeamTilt,
        followSpeed,
      );
    } else {
      lighthouseBeam.rotation.y += automaticRotationSpeed;
      lighthouseBeam.rotation.z = THREE.MathUtils.lerp(
        lighthouseBeam.rotation.z,
        baseBeamTilt,
        followSpeed,
      );
    }
  }

  renderer.render(scene, camera);
});
