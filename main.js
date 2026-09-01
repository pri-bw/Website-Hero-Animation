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
let pointerX = 0;
let pointerY = 0;

// Beam interaction settings
const baseBeamStartYaw = THREE.MathUtils.degToRad(-110);
const baseBeamEndYaw = THREE.MathUtils.degToRad(-78);
const baseBeamStartTilt = THREE.MathUtils.degToRad(-2);
const baseBeamEndTilt = THREE.MathUtils.degToRad(-6);
const horizontalRange = THREE.MathUtils.degToRad(30);
const verticalRange = THREE.MathUtils.degToRad(16);
const followSpeed = 0.07;
const automaticRotationSpeed = 0.005;
const scrollFollowSpeed = 0.08;

let targetScrollProgress = 0;
let scrollProgress = 0;

const spotlight = new THREE.SpotLight(
  0x0e345e, // colour
  500, // intensity
  16, // maximum distance
  Math.PI / 5, // cone angle
  0.8, // soft edge
  2, // distance decay
);
spotlight.position.set(0, 10, 8);
spotlight.target.position.set(0, 5, 0);
scene.add(spotlight);
scene.add(spotlight.target);

// Camera positions at the start and end of the parent section's scroll.
const cameraStartPosition = new THREE.Vector3(-6, -4, 32);
const cameraEndPosition = new THREE.Vector3(4, 2.4, 18);
const cameraStartTilt = THREE.MathUtils.degToRad(18);
const cameraEndTilt = THREE.MathUtils.degToRad(2);
const cameraStartZoom = 1;
const cameraEndZoom = 1.15;

const camera = new THREE.PerspectiveCamera(
  24,
  1,
  0.1,
  1000,
);
camera.position.copy(cameraStartPosition);
camera.rotation.x = cameraStartTilt;
camera.zoom = cameraStartZoom;
camera.updateProjectionMatrix();

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

// Convert the parent section's scroll distance into a value from 0 to 1.
const scrollSection = container.parentElement;

function updateScrollProgress() {
  const sectionBounds = scrollSection.getBoundingClientRect();
  const scrollDistance = Math.max(
    scrollSection.offsetHeight - window.innerHeight,
    1,
  );

  targetScrollProgress = THREE.MathUtils.clamp(
    -sectionBounds.top / scrollDistance,
    0,
    1,
  );
}

window.addEventListener("scroll", updateScrollProgress, { passive: true });
window.addEventListener("resize", updateScrollProgress);
updateScrollProgress();

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

  pointerX = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
  pointerY = 1 - ((event.clientY - bounds.top) / bounds.height) * 2;
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
      // Navy remains visible below while the white surface receives blue light.
      color: 0xffffff,
      emissive: 0x031224,
      emissiveIntensity: 1,
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
  scrollProgress = THREE.MathUtils.lerp(
    scrollProgress,
    targetScrollProgress,
    scrollFollowSpeed,
  );
  camera.position.lerpVectors(
    cameraStartPosition,
    cameraEndPosition,
    scrollProgress,
  );

  // Position, zoom, and tilt all use the full scroll duration.
  camera.zoom = THREE.MathUtils.lerp(
    cameraStartZoom,
    cameraEndZoom,
    scrollProgress,
  );
  camera.rotation.x = THREE.MathUtils.lerp(
    cameraStartTilt,
    cameraEndTilt,
    scrollProgress,
  );
  camera.updateProjectionMatrix();

  if (lighthouseBeam) {
    // Keep the cursor controls centred on the camera as it moves.
    const currentBaseYaw = THREE.MathUtils.lerp(
      baseBeamStartYaw,
      baseBeamEndYaw,
      scrollProgress,
    );
    const currentBaseTilt = THREE.MathUtils.lerp(
      baseBeamStartTilt,
      baseBeamEndTilt,
      scrollProgress,
    );

    if (pointerIsInside) {
      const targetBeamYaw = currentBaseYaw + pointerX * horizontalRange;
      const targetBeamTilt = currentBaseTilt + pointerY * verticalRange;

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
        currentBaseTilt,
        followSpeed,
      );
    }
  }

  renderer.render(scene, camera);
});
