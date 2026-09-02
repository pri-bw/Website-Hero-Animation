# Faros lighthouse hero for Webflow

This project renders an interactive Three.js lighthouse inside a Webflow hero.
The scene remains sticky while a 200vh parent scrolls. During that scroll, the
camera moves and zooms, the top spotlight becomes brighter, and the lighthouse
beam becomes narrower. The beam follows the pointer while it is over the scene
and rotates automatically when the pointer is outside it.

## Files used by the Webflow page

- `main.js` creates and animates the Three.js scene.
- `models/Lighthouse_Model.glb` is the Blender model.
- `index.html` is only the local reference page. Do not paste the whole file
  into Webflow.
- `style.css` contains the local version of the Webflow layout styles.

## Step-by-step Webflow setup

### 1. Push the latest files to GitHub

The public repository is:

```text
https://github.com/pri-bw/Website-Hero-Animation
```

Before updating Webflow, commit and push the latest `main.js` and model:

```text
main.js
models/Lighthouse_Model.glb
```

GitHub Pages does not need to be enabled. jsDelivr reads files directly from
the public GitHub repository.

### 2. Create the Webflow element structure

Create this hierarchy in the Webflow Navigator:

```text
Hero Section
  Lighthouse Scroll Track (200vh)
    Lighthouse Scene
```

The important requirement is that **Lighthouse Scroll Track is the direct
parent of Lighthouse Scene**. The JavaScript uses:

```js
const scrollSection = container.parentElement;
```

That direct parent therefore defines the complete scroll duration.

Give the elements these settings:

#### Hero Section

- Position: `relative`
- Width: `100%`
- Background: linear gradient from `#010912` to `#031224`
- Overflow: `visible`

#### Lighthouse Scroll Track

- Class: `lighthouse-scene-wrapper` (recommended)
- Position: `relative`
- Width: `100%`
- Height: `200vh`
- Overflow: `visible`

#### Lighthouse Scene

- ID: `lighthouse-scene` (required)
- Position: `sticky`
- Top: `0`
- Width: `100%`
- Height: `100vh`
- Overflow: `hidden`
- Z-index: `0`

The ID must be exact because `main.js` selects it with:

```js
document.querySelector("#lighthouse-scene");
```

Place Webflow headings, buttons, and other hero content above the scene using a
higher z-index, such as `1`. The canvas does not capture clicks, so links remain
interactive.

### 3. Add the Webflow CSS

The layout can be configured in Webflow's Style panel. Alternatively, paste the
following into **Page settings > Custom code > Inside `<head>` tag**:

```html
<style>
  body {
    max-width: 100%;
    overflow-x: clip;
  }

  .lighthouse-scene-wrapper {
    position: relative;
    width: 100%;
    max-width: 100%;
    height: 200vh;
  }

  #lighthouse-scene {
    position: sticky;
    top: 0;
    width: 100%;
    max-width: 100%;
    height: 100svh;
    box-sizing: border-box;
    contain: layout paint;
    overflow: hidden;
    pointer-events: none;
  }

  #lighthouse-scene canvas {
    display: block;
    width: 100%;
    max-width: 100%;
    height: 100%;
  }
</style>
```

Use `100%`, not `100vw`, for the section and wrapper widths. `100vw` includes
the browser scrollbar and can create horizontal overflow.

### 4. Add the Three.js import map

In **Page settings > Custom code > Inside `<head>` tag**, above any module
script, add:

```html
<script type="importmap">
  {
    "imports": {
      "three": "https://cdn.jsdelivr.net/npm/three@0.179.1/build/three.module.js",
      "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.179.1/examples/jsm/"
    }
  }
</script>
```

The double quotes are required because an import map contains JSON. Do not add
trailing commas or convert the quotes to curly smart quotes.

### 5. Understand how the GLB is loaded

`main.js` loads the Blender model with `GLTFLoader`:

```js
const loader = new GLTFLoader();
loader.load(modelUrl, ...);
```

The `modelUrl` points to jsDelivr:

```js
const modelUrl =
  "https://cdn.jsdelivr.net/gh/pri-bw/Website-Hero-Animation@main/models/Lighthouse_Model.glb";
```

The URL is composed as follows:

```text
https://cdn.jsdelivr.net/gh/
  pri-bw/                         GitHub username
  Website-Hero-Animation         repository name
  @main/                          branch
  models/Lighthouse_Model.glb    exact repository path
```

The repository must be public, the file must be committed, and every character
in the path is case-sensitive. Opening the complete jsDelivr URL in a browser
should download or display the GLB response.

For production, use a Git tag instead of `@main`:

```js
const modelUrl =
  "https://cdn.jsdelivr.net/gh/pri-bw/Website-Hero-Animation@v1.0.0/models/Lighthouse_Model.glb";
```

Using a tag prevents a future commit from unexpectedly changing the published
model and avoids confusion from branch-file caching.

### 6. Add `main.js` before the closing body tag

Use one of the following methods in **Page settings > Custom code > Before
`</body>` tag**.

#### Option A: paste the JavaScript

```html
<script type="module">
  // Paste the complete contents of main.js here.
</script>
```

Do not paste only the two import lines. The complete file must be inside the
same `type="module"` script.

#### Option B: load `main.js` through jsDelivr

Push the latest file to GitHub, then add:

```html
<script
  type="module"
  src="https://cdn.jsdelivr.net/gh/pri-bw/Website-Hero-Animation@main/main.js"
></script>
```

For production, use the same version tag for the JavaScript and GLB:

```html
<script
  type="module"
  src="https://cdn.jsdelivr.net/gh/pri-bw/Website-Hero-Animation@v1.0.0/main.js"
></script>
```

If the tagged `main.js` is used, its internal `modelUrl` should use the same
tag.

### 7. Publish and test

The script may not run in the normal Webflow Designer canvas. Test it in
Webflow Preview and on the published page.

Open browser developer tools and verify:

1. The Console contains no import-map, module, WebGL, or model-loading errors.
2. `three.module.js`, `GLTFLoader.js`, `main.js`, and
   `Lighthouse_Model.glb` return HTTP status `200` in the Network panel.
3. Only one canvas exists inside `#lighthouse-scene`.
4. The scene remains sticky for the full 200vh scroll track.
5. Camera movement finishes at 80% scroll.
6. The beam follows the pointer at both the initial and final camera views.
7. Webflow buttons above the canvas remain clickable.

## Adjusting the interactions

The primary controls are grouped near the top of `main.js`.

### Camera movement

```js
const cameraStartPosition = new THREE.Vector3(-6, -4, 32);
const cameraEndPosition = new THREE.Vector3(4, 2.4, 18);
const cameraStartTilt = THREE.MathUtils.degToRad(18);
const cameraEndTilt = THREE.MathUtils.degToRad(2);
const cameraStartZoom = 1;
const cameraEndZoom = 1.15;
const cameraScrollEnd = 0.8;
```

- Position uses `(x, y, z)`.
- A larger zoom value looks closer.
- `cameraScrollEnd = 0.8` makes the camera reach its final state at 80% scroll.

### Beam direction and pointer range

```js
const baseBeamStartYaw = THREE.MathUtils.degToRad(-110);
const baseBeamEndYaw = THREE.MathUtils.degToRad(-72);
const baseBeamStartTilt = THREE.MathUtils.degToRad(-2);
const baseBeamEndTilt = THREE.MathUtils.degToRad(-6);

const horizontalStartRange = THREE.MathUtils.degToRad(30);
const horizontalEndRange = THREE.MathUtils.degToRad(10);
const verticalStartRange = THREE.MathUtils.degToRad(16);
const verticalEndRange = THREE.MathUtils.degToRad(10);
```

- Yaw controls the horizontal centre of the cursor-controlled range.
- Tilt controls its vertical centre.
- Start/end range values control how far the cursor can move the beam before
  and after scrolling.

### Beam focus and motion

```js
const beamStartWidth = 1;
const beamEndWidth = 0.4;
const followSpeed = 0.07;
const automaticRotationSpeed = 0.005;
const scrollFollowSpeed = 0.08;
```

- A smaller `beamEndWidth` creates a tighter final beam.
- `followSpeed` controls how quickly it catches the pointer.
- `automaticRotationSpeed` controls rotation while the pointer is outside.
- `scrollFollowSpeed` controls camera smoothing behind the physical scroll.

### Top spotlight

```js
const spotlightStartIntensity = 200;
const spotlightEndIntensity = 800;

spotlight.position.set(0, 10, 8);
spotlight.target.position.set(0, 5, 0);
```

The intensities interpolate across the scroll. Position sets where the light is
placed; target sets where it points.

### Rendering quality

```js
const maxPixelRatio = 1.5;
```

Use `1` for better performance or up to `2` for sharper high-DPI rendering.
The scene automatically stops rendering when the hero or browser tab is not
visible.

## Common pitfalls

### The page has a large horizontal scrollbar

- Do not use `width: 100vw`; use `100%`.
- Keep the canvas CSS width at `100%`.
- Do not change `renderer.setSize(width, height)` back to
  `renderer.setSize(width, height, false)`. The latter can expose the high-DPI
  drawing-buffer width as layout width when the canvas CSS is missing.
- Check Webflow ancestors for negative margins, X transforms, fixed widths, or
  horizontal padding added on top of `width: 100%`.

### Sticky positioning does not work

- The scene's direct parent must be the 200vh scroll track.
- Keep `overflow: visible` on the scroll track and its ancestors.
- Apply `overflow: hidden` only to `#lighthouse-scene`.
- Avoid transformed ancestors around the sticky scene.

### `Failed to resolve module specifier "three"`

- Put the import map in the page head.
- Ensure it appears before the `type="module"` script.
- Confirm the import-map JSON uses straight double quotes and no trailing
  commas.

### The lighthouse does not appear

- Open the jsDelivr model URL directly and confirm it responds.
- Confirm the GitHub repository is public and the GLB is committed normally,
  not only referenced through Git LFS.
- Check filename capitalization: `models/Lighthouse_Model.glb`.
- Look for `Could not load the lighthouse model` in the browser Console.

### Changes pushed to GitHub do not appear immediately

- `@main` URLs can remain cached.
- Prefer a new Git tag for a release and update both script and model URLs.
- Confirm Webflow is loading the URL you edited in the Network panel.

### The scene appears twice or runs faster than expected

- Do not paste `main.js` and load it through an external script at the same
  time.
- Ensure the page contains only one element with ID `lighthouse-scene`.
- Check that only one canvas is created inside it.

### The canvas covers Webflow content

- Keep `pointer-events: none` on `#lighthouse-scene`.
- Give normal hero content a higher z-index than the scene.
- Keep the scene at z-index `0`.

### The scene is blank in Webflow Designer

Module scripts and custom code may appear as placeholders in Designer. Use
Preview mode or publish the page before treating this as a loading failure.
