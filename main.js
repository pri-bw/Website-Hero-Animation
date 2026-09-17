import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// Webflow: give the hero's Three.js layer this ID.
const container = document.querySelector("#lighthouse-scene");

if (!container) {
  throw new Error('Missing an element with the ID "lighthouse-scene".');
}

// Local testing: serve this project through a local web server.
const modelUrl = new URL("./models/Lighthouse_Model.glb", import.meta.url).href;

// Webflow deployment: comment out the local modelUrl above and uncomment below.
// const modelUrl =
//   "https://cdn.jsdelivr.net/gh/pri-bw/Website-Hero-Animation@main/models/Lighthouse_Model.glb";

// Scene and spotlight
const scene = new THREE.Scene();
let lighthouseBeam;
let beamRotationCompensation;
const beamReferenceOrientation = new THREE.Quaternion();
const beamParentOrientation = new THREE.Quaternion();
let pointerIsInside = false;
let pointerX = 0;
let pointerY = 0;

// Beam interaction settings
const baseBeamStartYaw = THREE.MathUtils.degToRad(-110);
const baseBeamEndYaw = THREE.MathUtils.degToRad(-72);
const baseBeamStartTilt = THREE.MathUtils.degToRad(-2);
const baseBeamEndTilt = THREE.MathUtils.degToRad(-6);
const horizontalStartRange = THREE.MathUtils.degToRad(30);
const horizontalEndRange = THREE.MathUtils.degToRad(10);
const verticalStartRange = THREE.MathUtils.degToRad(16);
const verticalEndRange = THREE.MathUtils.degToRad(10);
const followSpeed = 0.07;
const automaticRotationSpeed = 0.005;
const scrollFollowSpeed = 0.08;
const cameraScrollEnd = 0.8;
const beamStartWidth = 1;
const beamEndWidth = 0.4;
const maxPixelRatio = 1.5;

let targetScrollProgress = 0;
let scrollProgress = 0;
let scrollNeedsUpdate = true;

const spotlightStartIntensity = 4000;
const spotlightEndIntensity = 12000;

const spotlight = new THREE.SpotLight(
  0x0e345e, // colour
  spotlightStartIntensity,
  16, // maximum distance
  Math.PI / 5, // cone angle
  0.8, // soft edge
  2, // distance decay
);
spotlight.position.set(0, 10, 8);
spotlight.target.position.set(0, 5, 0);
scene.add(spotlight);
scene.add(spotlight.target);

// Lighthouse rotation in degrees: x = forward tilt, y = turn, z = sideways lean.
// Positive x tilts the top towards the camera on the +Z side.
const lighthouseStartRotation = { x: 0, y: -20, z: 0 };
const lighthouseEndRotation = { x: 0, y: 20, z: 0 };

// Rotate a parent group so the GLB's own transforms remain intact.
const lighthousePivot = new THREE.Group();
scene.add(lighthousePivot);

function updateLighthouseRotation(progress) {
  lighthousePivot.rotation.set(
    THREE.MathUtils.degToRad(THREE.MathUtils.lerp(lighthouseStartRotation.x, lighthouseEndRotation.x, progress)),
    THREE.MathUtils.degToRad(THREE.MathUtils.lerp(lighthouseStartRotation.y, lighthouseEndRotation.y, progress)),
    THREE.MathUtils.degToRad(THREE.MathUtils.lerp(lighthouseStartRotation.z, lighthouseEndRotation.z, progress)),
  );
}
updateLighthouseRotation(0);

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
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  powerPreference: "high-performance",
});
renderer.setClearColor(0x000000, 0);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.domElement.style.display = "block";
renderer.domElement.style.maxWidth = "100%";
container.appendChild(renderer.domElement);

// Size the canvas to the Webflow hero rather than the browser window.
function resizeScene() {
  const width = container.clientWidth;
  const height = container.clientHeight;

  if (!width || !height) return;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  // Also update the CSS size so the high-DPI buffer cannot overflow Webflow.
  renderer.setSize(width, height);
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

window.addEventListener("scroll", () => {
  scrollNeedsUpdate = true;
}, { passive: true });
window.addEventListener("resize", () => {
  scrollNeedsUpdate = true;
});
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
    32,
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
        float originFade = smoothstep(0.0, 0.2, distanceFromOrb);
        float distanceFade = pow(1.0 - distanceFromOrb, 1.1);

        vec3 viewDirection = normalize(-vViewPosition);
        float facing = abs(dot(normalize(vNormal), viewDirection));
        float edgeSoftness = mix(0.9, 1.8, distanceFromOrb);
        float edgeFade = smoothstep(0.0, edgeSoftness, facing);

        float opacity = originFade * distanceFade * edgeFade * 0.6;
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

// Load the lighthouse and override only the glass and light materials.
const loader = new GLTFLoader();
loader.load(
  modelUrl,
  (gltf) => {
    const lighthouse = gltf.scene;

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

    // Preserve the imported materials on all other model parts.
    lighthouse.traverse((child) => {
      if (!child.isMesh) return;

      // Keep exported normals; generate them only if the model has none.
      if (!child.geometry.attributes.normal) child.geometry.computeVertexNormals();

      if (child.name === "Tower_Glass") {
        child.material = glassMaterial;
      } else if (child.name === "Sphere001" || child.name === "Sphere.001") {
        child.material = orbMaterial;
        orb = child;

      }
    });

    lighthousePivot.add(lighthouse);

    // Add these after traversal so their materials are not replaced.
    if (orb) {
      const orbLight = new THREE.PointLight(0xffe9ac, 2, 1.5, 1);
      orb.add(orbLight);

      lighthouseBeam = createLightBeam();
      beamRotationCompensation = new THREE.Group();
      orb.add(beamRotationCompensation);
      beamRotationCompensation.add(lighthouseBeam);

      // Retain the original GLB orientation without the scroll rotation.
      orb.getWorldQuaternion(beamReferenceOrientation);
      beamParentOrientation.copy(lighthousePivot.quaternion).invert();
      beamReferenceOrientation.premultiply(beamParentOrientation);
      updateBeamCompensation();
    }


  },
  undefined,
  (error) => {
    console.error("Could not load the lighthouse model:", error);
  },
);

// Cancel inherited rotation while the beam origin continues to follow the orb.
function updateBeamCompensation() {
  if (!beamRotationCompensation) return;
  beamRotationCompensation.parent.getWorldQuaternion(beamParentOrientation);
  beamRotationCompensation.quaternion
    .copy(beamParentOrientation)
    .invert()
    .multiply(beamReferenceOrientation);
}

// Pause all WebGL work when the hero or browser tab is not visible.
let sceneIsVisible = true;
let animationIsRunning = false;
let previousFrameTime = performance.now();

function updateAnimationState() {
  const shouldRun = sceneIsVisible && !document.hidden;

  if (shouldRun && !animationIsRunning) {
    previousFrameTime = performance.now();
    renderer.setAnimationLoop(animate);
    animationIsRunning = true;
  } else if (!shouldRun && animationIsRunning) {
    renderer.setAnimationLoop(null);
    animationIsRunning = false;
  }
}

const visibilityObserver = new IntersectionObserver(([entry]) => {
  sceneIsVisible = entry.isIntersecting;
  updateAnimationState();
});
visibilityObserver.observe(container);

document.addEventListener("visibilitychange", updateAnimationState);

// Follow the pointer while it is inside; rotate automatically while it is outside.
function animate(time) {
  const delta = Math.min((time - previousFrameTime) / 1000, 0.05);
  previousFrameTime = time;
  const frameScale = delta * 60;
  const scrollAlpha = 1 - Math.pow(1 - scrollFollowSpeed, frameScale);
  const followAlpha = 1 - Math.pow(1 - followSpeed, frameScale);

  if (scrollNeedsUpdate) {
    updateScrollProgress();
    scrollNeedsUpdate = false;
  }

  scrollProgress = THREE.MathUtils.lerp(
    scrollProgress,
    targetScrollProgress,
    scrollAlpha,
  );

  // Reach the final camera values at 80% scroll, then hold them.
  const cameraProgress = THREE.MathUtils.clamp(
    scrollProgress / cameraScrollEnd,
    0,
    1,
  );
  // Rotate the lighthouse on the same timeline as the camera.
  updateLighthouseRotation(cameraProgress);
  updateBeamCompensation();

  camera.position.lerpVectors(
    cameraStartPosition,
    cameraEndPosition,
    cameraProgress,
  );

  // Position, zoom, and tilt share the same camera timeline.
  const nextCameraZoom = THREE.MathUtils.lerp(
    cameraStartZoom,
    cameraEndZoom,
    cameraProgress,
  );
  const zoomChanged = Math.abs(camera.zoom - nextCameraZoom) > 0.0001;
  camera.zoom = nextCameraZoom;
  camera.rotation.x = THREE.MathUtils.lerp(
    cameraStartTilt,
    cameraEndTilt,
    cameraProgress,
  );
  if (zoomChanged) camera.updateProjectionMatrix();

  spotlight.intensity = THREE.MathUtils.lerp(
    spotlightStartIntensity,
    spotlightEndIntensity,
    scrollProgress,
  );

  if (lighthouseBeam) {
    const beamWidth = THREE.MathUtils.lerp(
      beamStartWidth,
      beamEndWidth,
      cameraProgress,
    );
    lighthouseBeam.scale.y = beamWidth;
    lighthouseBeam.scale.z = beamWidth;

    // Keep the cursor controls centred on the camera as it moves.
    const currentBaseYaw = THREE.MathUtils.lerp(
      baseBeamStartYaw,
      baseBeamEndYaw,
      cameraProgress,
    );
    const currentBaseTilt = THREE.MathUtils.lerp(
      baseBeamStartTilt,
      baseBeamEndTilt,
      cameraProgress,
    );
    const currentHorizontalRange = THREE.MathUtils.lerp(
      horizontalStartRange,
      horizontalEndRange,
      cameraProgress,
    );
    const currentVerticalRange = THREE.MathUtils.lerp(
      verticalStartRange,
      verticalEndRange,
      cameraProgress,
    );

    if (pointerIsInside) {
      const targetBeamYaw = currentBaseYaw + pointerX * currentHorizontalRange;
      const targetBeamTilt = currentBaseTilt + pointerY * currentVerticalRange;

      lighthouseBeam.rotation.y = THREE.MathUtils.lerp(
        lighthouseBeam.rotation.y,
        targetBeamYaw,
        followAlpha,
      );
      lighthouseBeam.rotation.z = THREE.MathUtils.lerp(
        lighthouseBeam.rotation.z,
        targetBeamTilt,
        followAlpha,
      );
    } else {
      lighthouseBeam.rotation.y += automaticRotationSpeed * frameScale;
      lighthouseBeam.rotation.z = THREE.MathUtils.lerp(
        lighthouseBeam.rotation.z,
        currentBaseTilt,
        followAlpha,
      );
    }
  }

  renderer.render(scene, camera);
}

updateAnimationState();
