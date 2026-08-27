# Three.js lighthouse hero

The scene is designed to run inside a Webflow hero without covering its text,
buttons, or links.

## Local preview

Serve this folder over HTTP:

```powershell
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Add it to Webflow

### 1. Create the scene layer

Inside the hero Section, add a Div Block and give it this ID:

```text
lighthouse-scene
```

Set the hero Section to `position: relative` and `overflow: hidden`. Set the
scene Div Block to absolute positioning with every inset set to `0`.

The hero must have an explicit height or minimum height. The renderer measures
this container and automatically responds when its size changes.

### 2. Add the import map

Paste the import map from `index.html` into the page's **Inside `<head>` tag**
custom code.

### 3. Load the model through jsDelivr

Webflow's Assets panel does not support `.glb` files. This project can instead
load the model through jsDelivr directly from a public GitHub repository. GitHub
Pages does not need to be enabled.

Commit and push this model path to the public repository:

```text
models/Lighthouse_Model.glb
```

Build its jsDelivr URL using this format:

```text
https://cdn.jsdelivr.net/gh/pri-bw/Website-Hero-Animation@main/models/Lighthouse_Model.glb
```

For example, while developing from the `main` branch:

```js
const modelUrl =
  "https://cdn.jsdelivr.net/gh/pri-bw/Website-Hero-Animation@main/models/Lighthouse_Model.glb";
```

For the published site, use a Git tag or commit hash so later repository changes
cannot unexpectedly alter the live model:

```js
const modelUrl =
  "https://cdn.jsdelivr.net/gh/pri-bw/Website-Hero-Animation@v1.0.0/models/Lighthouse_Model.glb";
```

Paths and filenames are case-sensitive. Open the finished URL directly in a
browser to verify it works. For production, replace `main` with a release tag or
commit hash after creating one in the repository.

### 4. Add the styles

Add these rules to the page head, an Embed, or your Webflow styles:

```css
#lighthouse-scene {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

#lighthouse-scene canvas {
  width: 100%;
  height: 100%;
  display: block;
}
```

Place the hero's normal content above it with a higher z-index, such as `1`.

### 5. Add the script

Either paste `main.js` inside a module script in the page's **Before `</body>`
tag** custom code:

```html
<script type="module">
  // Paste main.js here.
</script>
```

Or host `main.js` publicly and load it from the same location:

```html
<script type="module" src="https://your-cdn.example/main.js"></script>
```

Publish or use Webflow Preview to test scripts. The Designer may show only a
placeholder for code containing scripts.
