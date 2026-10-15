import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// Webflow: give the hero's Three.js layer this ID.
const container = document.querySelector("#lighthouse-scene");

if (!container) {
  throw new Error('Missing an element with the ID "lighthouse-scene".');
}

// Webflow owns the label contents and typography. Only the outer positioning
// wrappers are animated; their children can be ordinary elements or components.
const labelLayer = container.querySelector(":scope > [data-service-labels]");
const serviceLabels = new Map();
if (labelLayer) {
  for (const label of labelLayer.querySelectorAll("[data-service-label]")) {
    const name = label.dataset.serviceLabel.trim();
    if (serviceLabels.has(name)) {
      console.warn(`Duplicate service label: ${name}. Use one positioning wrapper per service.`);
    } else {
      serviceLabels.set(name, label);
    }
    label.style.opacity = "0";
    label.style.visibility = "hidden";
  }
} else {
  console.warn("Missing [data-service-labels] inside #lighthouse-scene. Add the Webflow label overlay described in WEBFLOW.md.");
}
const labelScreenPosition = new THREE.Vector3();

// Webflow sets data-asset-base on the scene to a published GitHub CDN directory.
// Without that attribute, local/external modules resolve assets beside main.js.
const assetBaseUrl = new URL(container.dataset.assetBase || "./", import.meta.url);
const modelUrl = new URL("models/Lighthouse_Model.glb", assetBaseUrl).href;

// Scene and spotlight
const scene = new THREE.Scene();
let lighthouseBeam;
let beamRotationCompensation;
const beamReferenceOrientation = new THREE.Quaternion();
const beamParentOrientation = new THREE.Quaternion();
let pointerIsInside = false;
let pointerX = 0;
let pointerY = 0;
let interactiveBeamYaw = 0;
let interactiveBeamTilt = 0;
const interactiveBeamOrientation = new THREE.Quaternion();
const fixedBeamOrientation = new THREE.Quaternion();
const beamEuler = new THREE.Euler();
const beamAxis = new THREE.Vector3(1, 0, 0);
// Share the ring tilt and front-right focus with the final beam direction.
const servicesRingTilt = THREE.MathUtils.degToRad(10);
const servicesFocusAngle = THREE.MathUtils.degToRad(50);
const servicesBeamDirection = new THREE.Vector3(
  Math.cos(servicesFocusAngle),
  Math.sin(servicesRingTilt) * Math.sin(servicesFocusAngle),
  Math.cos(servicesRingTilt) * Math.sin(servicesFocusAngle),
);
const orbWorldPosition = new THREE.Vector3();
const automaticBeamDirection = new THREE.Vector3();
const cameraHorizontalDirection = new THREE.Vector3();

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
const automaticSideSpeedMultiplier = 2.2;
const oppositeHoverOpacity = 0.35;
let oppositeBeamBrightness = 1;
const scrollFollowSpeed = 0.08;
const cameraScrollEnd = 0.8;
const beamStartWidth = 1;
const beamEndWidth = 0.8;
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
const lighthouseEndRotation = { x: 0, y: 0, z: 0 };

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

// Desktop composition: right-hand opening, then a modest approach to the left.
const cameraStartDistance = 28;
const cameraEndDistance = 22;
const cameraStartTilt = THREE.MathUtils.degToRad(8);
const cameraEndTilt = THREE.MathUtils.degToRad(1);

// Phones reveal the upper half from slightly below, then move closer and level out.
const mobileLayout = window.matchMedia("(max-width: 767px), (max-height: 500px) and (pointer: coarse)");
const mobileModelCenter = new THREE.Vector3();
const mobileModelSize = new THREE.Vector3();
let mobileModelIsReady = false;
let mobileStartDistance = 40;
const mobileGrowth = 1.25;
const mobileStartTilt = THREE.MathUtils.degToRad(6);

function updateMobileFraming() {
  if (!mobileModelIsReady) return;
  const halfFovTangent = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  // The full tower spans about 80% of the height, with its lower half offscreen.
  // Reserve horizontal space for the closer final view.
  mobileStartDistance = Math.max(
    mobileModelSize.y / (2 * halfFovTangent * 0.8),
    mobileModelSize.x * mobileGrowth / (2 * halfFovTangent * camera.aspect * 0.8),
  ) + mobileModelSize.z / 2;
}

const camera = new THREE.PerspectiveCamera(
  24,
  1,
  0.1,
  1000,
);
camera.position.set(0, 3, cameraStartDistance);
camera.rotation.x = cameraStartTilt;
camera.zoom = 1;
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
  updateMobileFraming();
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
    scrollSection.offsetHeight - container.clientHeight,
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
  // Touch gestures scroll the page; they should not latch the beam to a finger.
  if (event.pointerType === "touch") {
    pointerIsInside = false;
    return;
  }
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
    interactiveBeamYaw = Math.atan2(
      Math.sin(interactiveBeamYaw),
      Math.cos(interactiveBeamYaw),
    );
  }

  pointerIsInside = true;

  pointerX = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
  pointerY = 1 - ((event.clientY - bounds.top) / bounds.height) * 2;
});

window.addEventListener("blur", () => {
  pointerIsInside = false;
});

document.documentElement.addEventListener("pointerleave", () => {
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
      beamOpacity: { value: 1 },
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
      uniform float beamOpacity;

      void main() {
        float distanceFromOrb = 1.0 - vUv.y;
        float originFade = smoothstep(0.0, 0.2, distanceFromOrb);
        float distanceFade = pow(1.0 - distanceFromOrb, 1.1);

        vec3 viewDirection = normalize(-vViewPosition);
        float facing = abs(dot(normalize(vNormal), viewDirection));
        float edgeSoftness = mix(0.9, 1.8, distanceFromOrb);
        float edgeFade = smoothstep(0.0, edgeSoftness, facing);

        float opacity = originFade * distanceFade * edgeFade * 0.6 * beamOpacity;
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
  // Share geometry and invert the local axis: always exactly opposite,
  // including when the shared pivot tilts, follows the pointer, or narrows.
  const oppositeBeam = beam.clone();
  // Independent uniforms let only this beam fade away in the services view.
  oppositeBeam.material = material.clone();
  oppositeBeam.rotation.z = -Math.PI / 2;
  oppositeBeam.position.x = -length / 2;
  pivot.add(oppositeBeam);
  pivot.userData.oppositeBeam = oppositeBeam;

  return pivot;
}

// Keep scene composition independent from viewport aspect ratio.
function updateCamera(progress) {
  const width = container.clientWidth;
  const height = container.clientHeight;
  if (!width || !height) return;
  let screenX;
  let screenY;
  if (mobileLayout.matches && mobileModelIsReady) {
    const distance = THREE.MathUtils.lerp(mobileStartDistance, mobileStartDistance / mobileGrowth, progress);
    const tilt = THREE.MathUtils.lerp(mobileStartTilt, 0, progress);
    camera.position.set(
      mobileModelCenter.x,
      mobileModelCenter.y - Math.sin(tilt) * distance,
      mobileModelCenter.z + Math.cos(tilt) * distance,
    );
    camera.rotation.set(tilt, 0, 0);
    screenX = THREE.MathUtils.lerp(0.6, 0.34, progress);
    screenY = THREE.MathUtils.lerp(1, 0.95, progress);
  } else {
    const distance = THREE.MathUtils.lerp(cameraStartDistance, cameraEndDistance, progress);
    const tilt = THREE.MathUtils.lerp(cameraStartTilt, cameraEndTilt, progress);
    camera.position.set(0, orbWorldPosition.y - Math.sin(tilt) * distance, Math.cos(tilt) * distance);
    camera.rotation.set(tilt, 0, 0);
    screenX = THREE.MathUtils.lerp(0.7, 0.23, progress);
    screenY = THREE.MathUtils.lerp(0.53, 0.43, progress);
  }
  camera.zoom = 1;
  camera.setViewOffset(width, height, width * (0.5 - screenX), height * (0.5 - screenY), width, height);
}

const serviceFiles = [
  "01_IP White.svg",
  "02_Regulatory White.svg",
  "03_Incorporation White.svg",
  "04_Scientifics White.svg",
  "05_Product Fit White.svg",
  "06_Marketing White.svg",
  "07_Commercialisation White.svg",
  "08_Insurance White.svg",
  "09_Funding White.svg",
];
const serviceRing = new THREE.Group();
scene.add(serviceRing);
const serviceItems = [];
// +Z faces the viewer: lift the front, lower the rear, keep left/right level.
// The beam uses this same basis so it intersects the front-right focus.
const ringAxisX = new THREE.Vector3(1, 0, 0);
const ringAxisZ = new THREE.Vector3(0, Math.sin(servicesRingTilt), Math.cos(servicesRingTilt));
const ringUp = new THREE.Vector3().crossVectors(ringAxisZ, ringAxisX).normalize();
const ringRadial = new THREE.Vector3();
const ringTangent = new THREE.Vector3();
const iconOrientation = new THREE.Matrix4();
const focusAngle = servicesFocusAngle;
let orbitAngle = focusAngle;
const orbitSpeed = (Math.PI * 2) / 45;
const ringRadius = 6;

function serviceName(filename) {
  return filename.replace(/\.[^.]+$/, "").replace(/^\d+[\s_-]*/, "").replace(/\s+(?:white|black|colou?r)$/i, "").trim();
}

function hideServiceLabels() {
  for (const label of serviceLabels.values()) {
    label.style.opacity = "0";
    label.style.visibility = "hidden";
  }
}

function updateServiceLabel(item, size, opacity, width, height) {
  if (!item.label) return;
  labelScreenPosition.copy(item.icon.position);
  labelScreenPosition.y -= size * 0.65 + 0.12;
  labelScreenPosition.project(camera);
  const inView = labelScreenPosition.z >= -1 && labelScreenPosition.z <= 1
    && Math.abs(labelScreenPosition.x) <= 1 && Math.abs(labelScreenPosition.y) <= 1;
  const visible = inView && opacity > 0.001 && width > 0 && height > 0;
  item.label.style.opacity = visible ? String(opacity) : "0";
  item.label.style.visibility = visible ? "visible" : "hidden";
  if (visible) {
    const x = (labelScreenPosition.x * 0.5 + 0.5) * width;
    const y = (0.5 - labelScreenPosition.y * 0.5) * height;
    item.label.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
  }
}

// Bend the SVG surface onto the orbit's cylinder. Its center faces local +Z;
// both edges recede toward the tower, with exactly the same radius as the ring.
function updateIconCurve(item, width, height, radius) {
  if (item.curveWidth === width && item.curveHeight === height && item.curveRadius === radius) return;
  const geometry = item.icon.geometry;
  const positions = geometry.attributes.position;
  const normals = geometry.attributes.normal;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < positions.count; i++) {
    const angle = (uv.getX(i) - 0.5) * width / radius;
    positions.setXYZ(i, radius * Math.sin(angle), (uv.getY(i) - 0.5) * height, radius * (Math.cos(angle) - 1));
    normals.setXYZ(i, Math.sin(angle), 0, Math.cos(angle));
  }
  positions.needsUpdate = true;
  normals.needsUpdate = true;
  geometry.computeBoundingSphere();
  item.curveWidth = width;
  item.curveHeight = height;
  item.curveRadius = radius;
}

function createServiceRing() {
  const textureLoader = new THREE.TextureLoader();
  for (const [index, filename] of serviceFiles.entries()) {
    const name = serviceName(filename);
    const texture = textureLoader.load(new URL(`Iconography/${filename}`, assetBaseUrl).href,
      (loaded) => {
        item.aspect = loaded.image.width / loaded.image.height;
      }, undefined,
      (error) => console.error(`Could not load service icon: ${filename}`, error),
    );
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshBasicMaterial({ map: texture, color: 0xfff5bb, transparent: true, opacity: 0, alphaTest: 0.01, side: THREE.DoubleSide, depthWrite: false, toneMapped: false });
    const icon = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 32, 1), material);
    icon.name = name;
    serviceRing.add(icon);

    const label = serviceLabels.get(name);
    if (labelLayer && !label) console.warn(`Missing [data-service-label="${name}"] in the label overlay.`);
    const item = { icon, label, aspect: 1.5, angle: index * Math.PI * 2 / serviceFiles.length };
    serviceItems.push(item);
  }
}

function updateServiceRing(delta, progress) {
  const reveal = THREE.MathUtils.smoothstep(progress, 0.5, 1);
  serviceRing.visible = reveal > 0;
  if (!serviceRing.visible || !serviceItems.length) {
    hideServiceLabels();
    return;
  }
  // Projection must use this frame's camera, before renderer.render updates it.
  camera.updateMatrixWorld();
  const labelWidth = container.clientWidth;
  const labelHeight = container.clientHeight;
  orbitAngle = (orbitAngle - delta * orbitSpeed * reveal) % (Math.PI * 2);
  // A smaller orbit on phones keeps the focused icon inside the narrow frame.
  const radius = mobileLayout.matches ? 2.6 : ringRadius;
  const iconSpacing = Math.PI * 2 / serviceItems.length;
  for (const item of serviceItems) {
    const angle = orbitAngle + item.angle;
    // The icons follow the tilted circle and keep their curved faces outward.
    item.icon.position.copy(orbWorldPosition)
      .addScaledVector(ringAxisX, Math.cos(angle) * radius)
      .addScaledVector(ringAxisZ, Math.sin(angle) * radius);
    const distance = Math.abs(Math.atan2(Math.sin(angle - focusAngle), Math.cos(angle - focusAngle)));
    const focus = 1 - THREE.MathUtils.smoothstep(distance, 0, Math.PI * 2 / serviceItems.length);
    const size = (mobileLayout.matches ? 0.52 : 0.85) * (1 + focus * 0.6);
    updateIconCurve(item, size * item.aspect, size, radius);
    ringRadial.copy(ringAxisX).multiplyScalar(Math.cos(angle))
      .addScaledVector(ringAxisZ, Math.sin(angle));
    ringTangent.crossVectors(ringUp, ringRadial);
    iconOrientation.makeBasis(ringTangent, ringUp, ringRadial);
    item.icon.quaternion.setFromRotationMatrix(iconOrientation);
    item.icon.material.opacity = reveal * (0.22 + focus * 0.78);
    // Fade to zero at the midpoint between icons, instead of abruptly swapping
    // the nearest label. Wrapped angular distance also keeps the loop seamless.
    const labelFocus = 1 - THREE.MathUtils.smoothstep(distance, iconSpacing * 0.1, iconSpacing * 0.5);
    updateServiceLabel(item, size, reveal * labelFocus, labelWidth, labelHeight);
  }
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

    // Measure only the model, before attaching the long decorative beam.
    const previousRotation = lighthousePivot.quaternion.clone();
    updateLighthouseRotation(0);
    lighthousePivot.updateWorldMatrix(true, true);
    const modelBounds = new THREE.Box3().setFromObject(lighthousePivot);
    lighthousePivot.quaternion.copy(previousRotation);
    lighthousePivot.updateWorldMatrix(true, true);
    modelBounds.getCenter(mobileModelCenter);
    modelBounds.getSize(mobileModelSize);
    mobileModelIsReady = true;
    updateMobileFraming();

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
      fixedBeamOrientation.setFromUnitVectors(
        beamAxis,
        servicesBeamDirection.clone().applyQuaternion(beamReferenceOrientation.clone().invert()),
      );
      orb.getWorldPosition(orbWorldPosition);
      createServiceRing();
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
function getAutomaticRotationMultiplier(yaw, tilt) {
  beamEuler.set(0, yaw, tilt);
  automaticBeamDirection.copy(beamAxis).applyEuler(beamEuler)
    .applyQuaternion(beamReferenceOrientation).setY(0).normalize();
  cameraHorizontalDirection.copy(camera.position).sub(orbWorldPosition).setY(0).normalize();
  const alignment = THREE.MathUtils.clamp(automaticBeamDirection.dot(cameraHorizontalDirection), -1, 1);
  // Squaring treats the two opposing beams symmetrically: normal speed toward
  // or away from the camera, smoothly peaking when the pair points sideways.
  return 1 + (automaticSideSpeedMultiplier - 1) * (1 - alignment * alignment);
}

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
  updateLighthouseRotation(mobileLayout.matches ? 0 : cameraProgress);
  updateBeamCompensation();

  updateCamera(cameraProgress);

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

    const lockProgress = THREE.MathUtils.smoothstep(cameraProgress, 0.15, 1);
    const oppositeBeam = lighthouseBeam.userData.oppositeBeam;
    oppositeBeamBrightness = THREE.MathUtils.lerp(
      oppositeBeamBrightness,
      pointerIsInside ? oppositeHoverOpacity : 1,
      followAlpha,
    );
    oppositeBeam.material.uniforms.beamOpacity.value = (1 - lockProgress) * oppositeBeamBrightness;
    oppositeBeam.visible = lockProgress < 1;
    // Stop updating the interactive orientation once the services view settles.
    if (lockProgress < 1) {
      if (pointerIsInside) {
        const targetYaw = currentBaseYaw + pointerX * currentHorizontalRange;
        const targetTilt = currentBaseTilt + pointerY * currentVerticalRange;
        interactiveBeamYaw = THREE.MathUtils.lerp(interactiveBeamYaw, targetYaw, followAlpha);
        interactiveBeamTilt = THREE.MathUtils.lerp(interactiveBeamTilt, targetTilt, followAlpha);
      } else {
        const speedMultiplier = getAutomaticRotationMultiplier(interactiveBeamYaw, interactiveBeamTilt);
        interactiveBeamYaw += automaticRotationSpeed * speedMultiplier * frameScale * (1 - lockProgress);
        interactiveBeamTilt = THREE.MathUtils.lerp(interactiveBeamTilt, currentBaseTilt, followAlpha);
      }
    }
    beamEuler.set(0, interactiveBeamYaw, interactiveBeamTilt);
    interactiveBeamOrientation.setFromEuler(beamEuler);
    lighthouseBeam.quaternion.copy(interactiveBeamOrientation).slerp(fixedBeamOrientation, lockProgress);
  }

  updateServiceRing(delta, cameraProgress);

  renderer.render(scene, camera);
}

updateAnimationState();
