# Add the Faros lighthouse hero to Webflow

The JavaScript runs inside a **Webflow Code Embed**. The lighthouse model is
hosted in GitHub and delivered through jsDelivr. Service icons and label text
come from the existing **Services CMS collection**—no CMS API token is needed.

`main.js` is the source of truth. Copy its complete contents into the embed when
releasing code changes. Publishing CMS edits updates the icons/names/order on
the next page load without changing JavaScript.

## 1. Publish the lighthouse model

The repository is `pri-bw/Website-Hero-Animation`. Ensure this file exists in the
published revision:

```text
models/Lighthouse_Model.glb
```

For branch testing, the asset base is:

```text
https://cdn.jsdelivr.net/gh/pri-bw/Website-Hero-Animation@Alternative-Services/
```

Use a full commit SHA or an actual published release tag instead of the branch
for production. Keep the trailing slash. GitHub Pages is not required.

In CMS mode, you **do not need to upload the service SVGs to GitHub**. The
`Iconography/` files remain available for the standalone preview/legacy fallback.

## 2. Build the scene and CMS source list

Use this hierarchy in the Webflow Navigator:

```text
Hero Section
└── Lighthouse Scroll Track         class: lighthouse-scroll-track
    └── Lighthouse Scene            ID: lighthouse-scene
        ├── Service Labels          div, data-service-labels="true", initially empty
        ├── Services Collection List Wrapper   data-services-cms="true"
        │   └── Collection List     source: Services, sort: Order ascending
        │       └── Collection Item data-service-item bound to Slug
        │           ├── Rich Text   bound to Service Icon, data-service-icon="true"
        │           └── Label wrapper         data-service-label="true"
        │               └── Text/component    bound to Service Name,
        │                                     data-service-name="true"
        └── Code Embed              full module script from step 4
```

The scene must be a **direct child** of the scroll track; scroll duration uses
that direct parent. Service Labels must be a **direct child** of the scene so
its positioning coordinates match the canvas. Do not create a second scene ID
inside the Code Embed.

On Lighthouse Scene, add:

| Custom attribute | Value |
| --- | --- |
| `data-asset-base` | `https://cdn.jsdelivr.net/gh/pri-bw/Website-Hero-Animation@Alternative-Services/` |

Use your chosen published revision in the URL. This is essential for an inline
module: without the override, relative assets would point at the Webflow domain.
The same `main.js` works without modification in the embed.

### Connect your existing Services fields

| Existing CMS field | Binding |
| --- | --- |
| **Slug** | Collection Item's `data-service-item` attribute value |
| **Service Name** | Visible label text; mark that text/component wrapper with `data-service-name="true"` |
| **Service Icon** | Rich Text element marked `data-service-icon="true"`, containing the rendered inline SVG embed |
| **Order** | Collection List sort rule: ascending by Order |

For `data-service-item`, use the purple CMS binding control in the custom
attribute's Value field and choose **Slug**. Other marker attributes use the
literal value `true`. See Webflow's [dynamic custom attributes guide](https://help.webflow.com/hc/en-us/articles/33961389460115-Custom-attributes).

Your Service Icon field appears to be Rich Text with an HTML embed. Bind a Rich
Text element to that field; the published markup must contain a real `<svg>`.
If you instead store raw SVG in a plain-text field, output it through a dynamic
Code Embed inside the marked icon wrapper. Escaped text such as `&lt;svg…` is
not a rendered SVG and will be skipped. Webflow documents [CMS code embeds](https://help.webflow.com/hc/en-us/articles/33961236623635-Custom-code-in-the-CMS)
and [dynamic embed bindings](https://help.webflow.com/hc/en-us/articles/33961390851731-Use-dynamic-data-in-custom-code-embeds).

Keep all desired Services items on this page. Disable pagination/load-more and
set any display limit high enough to include them. The script reads the initial
rendered list once, in its rendered order. Configure sorting by your numeric
Order field in Webflow; use distinct order values for a predictable sequence.
See [Collection List settings](https://help.webflow.com/hc/en-us/articles/33961294051347-Collection-list).

### Inline SVG requirements

Your existing SVG format works:

```html
<svg width="30" height="20" viewBox="0 0 30 20"
     fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Keep your existing path data here. -->
  <path d="…" fill="currentColor" />
</svg>
```

Keep the complete original path data—the example's ellipsis is not a valid
replacement. Use self-contained SVG paths/styles with a valid `viewBox` or
numeric width and height. Include one service SVG in each marked icon wrapper.

The script clones the SVG, converts `currentColor` to white in that copy, and
creates a higher-resolution image texture (768 pixels on its longest side).
This prevents a 30×20 CMS thumbnail from looking pixelated when enlarged.
The cream Three.js material supplies the visible tint. Your original SVG,
`fill="none"`, and the CMS field are not edited. External page CSS is not copied
into the texture; keep required SVG styling inside the SVG.

### Webflow-owned labels and components

Build one label wrapper inside the Collection Item template. Its
`data-service-label` value can simply be `true`: the script assigns the item's
slug at runtime. Put the Text Block or component instance inside it and bind
the visible text to Service Name. Mark the bound text (or a wrapper containing
only that text) with `data-service-name="true"`.

The script **moves the actual label wrapper** from each CMS item into the empty
Service Labels overlay. It does not clone or replace the component contents.
This prevents Collection List layout wrappers from offsetting the projected
positions. Style components with their own classes; avoid selectors depending
on `.w-dyn-item` ancestry, since that ancestry changes at runtime.

Webflow controls typography, copy, color, and responsive styling. Suggested
starting sizes are 24px desktop and 18px mobile with centered pale-cream text
(`#fff5bb`). Remove default text margins. JS controls only the outer wrapper's
`transform`, `opacity`, and `visibility`; do not add competing Webflow
Interactions, CSS transitions, or transforms to that outer wrapper.

The script projects the below-icon anchor into CSS pixels each frame. Labels
remain HTML overlays rather than depth-tested 3D text. Keep the overlay free
of padding/borders/transforms and keep these moving labels noninteractive.
Place normal service navigation and accessible service copy elsewhere in the
page; do not make the cycling labels an `aria-live` region.

The CMS source list is hidden by the CSS below. Temporarily show it in Designer
when editing the template, then restore the hidden state before publishing.
Do not manually duplicate the nine old filename-based labels in CMS mode.

## 3. Add the import map and CSS to the page head

In **Page settings → Custom code → Inside `<head>`**, add:

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
  .lighthouse-scroll-track {
    position: relative;
    width: 100%;
    max-width: 100%;
    height: 200vh;
    overflow: visible;
    background: linear-gradient(to bottom, #010912, #031224);
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
    z-index: 0;
  }
  #lighthouse-scene canvas {
    display: block;
    width: 100%;
    max-width: 100%;
    height: 100%;
  }
  #lighthouse-scene > [data-service-labels] {
    position: absolute;
    inset: 0;
    padding: 0;
    border: 0;
    overflow: hidden;
    pointer-events: none;
    z-index: 1;
  }
  #lighthouse-scene [data-services-cms] {
    display: none;
  }
  [data-service-labels] [data-service-label] {
    position: absolute;
    top: 0;
    left: 0;
    width: max-content;
    max-width: min(18rem, 80vw);
    margin: 0;
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    text-align: center;
    will-change: transform, opacity;
  }
</style>
```

Merge with any existing import map; it must precede the module. Keep Three.js and
addons at the same version. Preserve overflow visible on the scroll track and
its ancestors. Use `100%`, not `100vw`, for widths. Add headings and buttons as
Webflow overlays above the canvas without changing the scroll track's height.
If an interactive overlay inherits `pointer-events: none`, set it to `auto`.

## 4. Paste the JavaScript into the Code Embed

In the Code Embed inside Lighthouse Scene:

```html
<script type="module">
  // Replace this comment with the COMPLETE contents of main.js,
  // including its two import statements.
</script>
```

The comment is a placement instruction, not a working script. Do not paste
Markdown fences or all of `index.html`. Run exactly one module instance per page:
remove the old footer/embed script or external `main.js` tag before installing
this one. The source list and overlay must exist when the module runs.

The script fits Webflow's 50,000-character Code Embed limit; check again if it
grows substantially. See [Code Embed documentation](https://help.webflow.com/hc/en-us/articles/33961332238611-Custom-code-embed).

## 5. Publish and verify

Publish to staging to check the actual SVG embeds; Designer placeholders are
not SVG data. Review [Webflow custom-code preview behavior](https://help.webflow.com/hc/en-us/articles/40748357886227-Supporting-external-resources-in-previews-of-custom-code).

- One canvas renders; the GLB loads from the correct GitHub revision.
- Each published CMS service has a unique slug, name, and inline SVG. The ring
  follows the Collection List order, with no `Iconography/` requests in CMS mode.
- Names match the CMS (including Clinical, Translation, and Commercialization),
  not the legacy repository filenames.
- Hover dims the opposing beam; automatic rotation speeds up side-on.
- Scroll settles to one fixed beam and the pitched, outward-facing icon ring.
- Labels appear in the overlay with your Webflow styling and fade below the
  focused icons. Reverse scroll hides them and restores the opening.
- Check portrait/landscape sizes, long names, and clickable Webflow overlays.

## Updating later

| Change | What to update |
| --- | --- |
| Service name, SVG, or Order | Edit/publish Services CMS; reload the page. No JS change |
| Add/remove a service | Publish CMS changes and ensure the Collection List includes it; spacing adjusts automatically |
| Label design | Edit the label component/template styling in Webflow and publish |
| Animation logic | Replace the complete module embed from `main.js` and publish |
| Lighthouse model | Publish a new asset revision and update `data-asset-base` |
| Three.js version | Update both import-map entries and test |

The script does not live-sync CMS changes or load subsequent pagination pages.
A GitHub push does not replace JavaScript pasted into Webflow.

## Local preview and legacy fallback

When **no** `[data-services-cms]` exists, `main.js` uses its local `serviceFiles`
list and the static label wrappers in `index.html`. In this mode the model and
`Iconography/` must be hosted together, and label identifiers use the cleaned
filenames (e.g. `data-service-label="IP"`). This keeps the local preview working
without a Webflow connection.

If the CMS source exists but is empty/invalid, the ring stays empty and logs a
warning—it does not silently display the unrelated local services. Invalid or
failed icons are skipped and the remaining icons are spaced evenly. Missing
labels warn and leave the valid icon visible. No CMS/API credentials are used.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Blank scene | Correct scene ID, nonzero height, import map before module, console/network errors |
| GLB requested from Webflow domain | Missing/incorrect absolute `data-asset-base` with trailing slash |
| Local icons appear instead of CMS icons | `[data-services-cms]` marker must exist inside the scene |
| Empty ring | Published Collection List, actual `<svg>` under `data-service-icon`, unique slug, and name marker |
| Black/blurry icons | Use self-contained SVGs with `viewBox`; currentColor is normalized automatically; external CSS is not embedded |
| Incorrect service order | Configure Collection List Order ascending; disable pagination and check equal sort values |
| Missing labels | Empty direct-child label overlay plus a label wrapper/name marker in each item; inspect warnings |
| Labels lose styling | Style the component's own classes rather than Collection Item ancestry |
| Labels drift/flicker | Remove overlay padding/transforms and competing wrapper interactions/transitions |
| Sticky fails | Check direct parent, ancestor overflow, and track height greater than scene height |
| Duplicate animation | Keep one scene ID and one script instance |
