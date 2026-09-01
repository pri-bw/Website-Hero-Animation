# Three.js lighthouse hero

An interactive Three.js lighthouse built for a Webflow hero section. The scene
stays pinned while its parent scrolls, moves and zooms the camera, and lets the
lighthouse beam react to the pointer.

## Local preview

Serve the folder over HTTP:

```powershell
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Add it to Webflow

### 1. Build the Webflow structure

Create this hierarchy in the Navigator:

```text
Hero Section (200vh)
└── Lighthouse Scene Div
```

The scene Div must be a **direct child** of the scrolling Hero Section because
`main.js` uses its parent to calculate scroll progress.

Configure the Hero Section:

- Position: `relative`
- Height: `200vh`
- Overflow: `visible`
- Background: gradient from `#010912` to `#031224`

Do not use `overflow: hidden` on the Hero Section because that can prevent its
sticky child from working.

Give the scene Div this ID:

```text
lighthouse-scene
```

Configure the scene Div:

- Position: `sticky`
- Top: `0`
- Width: `100%`
- Height: `100vh`
- Overflow: `hidden`
- Z-index: `0`

Place normal hero content above the scene using a higher z-index, such as `1`.
The canvas has `pointer-events: none`, so it will not block Webflow links or
buttons.

### 2. Add the head code

In **Page settings → Custom code → Inside `<head>` tag**, add:

```html
<script type="importmap">
  {
    "imports": {
      "three": "https://cdn.jsdelivr.net/npm/three@0.179.1/build/three.module.js",
      "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.179.1/examples/jsm/"
    }
  }
</script>

<style>
  #lighthouse-scene {
    position: sticky;
    top: 0;
    width: 100%;
    height: 100svh;
    z-index: 0;
    overflow: hidden;
    pointer-events: none;
  }

  #lighthouse-scene canvas {
    width: 100%;
    height: 100%;
    display: block;
  }
</style>
```

If these properties are already configured in Webflow's Style panel, the
`<style>` block can be omitted.

### 3. Load the model through jsDelivr

The public GitHub model is already configured in `main.js`:

```js
const modelUrl =
  "https://cdn.jsdelivr.net/gh/pri-bw/Website-Hero-Animation@main/models/Lighthouse_Model.glb";
```

GitHub Pages does not need to be enabled. Open that URL directly in a browser to
confirm the model is available.

For production, create a Git tag and replace `main` with that tag so the cached
live model cannot change unexpectedly:

```js
const modelUrl =
  "https://cdn.jsdelivr.net/gh/pri-bw/Website-Hero-Animation@v1.0.0/models/Lighthouse_Model.glb";
```

### 4. Add the JavaScript before `</body>`

In **Page settings → Custom code → Before `</body>` tag**, use one of these
options.

Option A — paste the current contents of `main.js`:

```html
<script type="module">
  // Paste the contents of main.js here.
</script>
```

Option B — push `main.js` to the public repository and load it through
jsDelivr:

```html
<script
  type="module"
  src="https://cdn.jsdelivr.net/gh/pri-bw/Website-Hero-Animation@main/main.js"
></script>
```

The import map must appear before this module script. When releasing, use the
same Git tag for both `main.js` and `Lighthouse_Model.glb`.

### 5. Publish and test

Publish the Webflow page or open Preview mode. Script embeds may appear only as
placeholders in the normal Designer canvas.

In browser developer tools:

1. Check the Console for module or model-loading errors.
2. Check that `three.module.js`, `GLTFLoader.js`, and
   `Lighthouse_Model.glb` return status `200` in the Network panel.
3. Scroll through the complete 200vh section.
4. Confirm the camera moves and zooms throughout the scroll.
5. Confirm the beam follows the pointer at both the start and end positions.

## Editable animation settings

The main controls are grouped near the top of `main.js`.

Camera scroll:

```js
const cameraStartPosition = new THREE.Vector3(-6, -4, 32);
const cameraEndPosition = new THREE.Vector3(4, 2.4, 18);
const cameraStartTilt = THREE.MathUtils.degToRad(18);
const cameraEndTilt = THREE.MathUtils.degToRad(2);
const cameraStartZoom = 1;
const cameraEndZoom = 1.15;
```

Beam cursor alignment at each camera position:

```js
const baseBeamStartYaw = THREE.MathUtils.degToRad(-110);
const baseBeamEndYaw = THREE.MathUtils.degToRad(-78);
const baseBeamStartTilt = THREE.MathUtils.degToRad(-2);
const baseBeamEndTilt = THREE.MathUtils.degToRad(-6);
```

## What changed since the earlier Webflow setup

- The parent Hero Section is now a 200vh scroll track.
- The scene layer changed from absolute positioning to a sticky 100vh layer.
- The scene Div must be a direct child of the scrolling section.
- The parent must keep overflow visible for sticky positioning.
- Camera position, tilt, and zoom now respond to section scroll progress.
- The beam has separate cursor-alignment angles for the initial and final
  camera views.
- Canvas sizing now follows the Webflow container through `ResizeObserver`.
- Pointer tracking happens through the window, while the canvas remains
  non-blocking for links and buttons.
