# Add the Faros lighthouse hero to Webflow

This guide keeps the JavaScript **inside a Webflow Code Embed** and serves the
GLB and SVG assets from this GitHub repository through jsDelivr. `main.js` remains
the source of truth: copy it into the embed whenever you deploy a code change.

## 1. Publish the assets to GitHub

Publish these paths together, preserving case and spaces:

```text
models/Lighthouse_Model.glb
Iconography/01_IP White.svg
Iconography/02_Regulatory White.svg
Iconography/03_Incorporation White.svg
Iconography/04_Scientifics White.svg
Iconography/05_Product Fit White.svg
Iconography/06_Marketing White.svg
Iconography/07_Commercialisation White.svg
Iconography/08_Insurance White.svg
Iconography/09_Funding White.svg
```

The repository is `pri-bw/Website-Hero-Animation`. Assets must be available in the
revision you use. Local, untracked files are not available to Webflow until they
are committed and pushed. GitHub Pages is not required for this delivery method.

For testing this branch, the asset base is:

```text
https://cdn.jsdelivr.net/gh/pri-bw/Website-Hero-Animation@Alternative-Services/
```

For production, replace `Alternative-Services` with the full commit SHA or an
actual published release tag containing the assets. Keep the trailing slash.
A new version URL also avoids relying on an old cached branch response.

For example, append these paths to the base to check the actual downloads:

```text
models/Lighthouse_Model.glb
Iconography/01_IP%20White.svg
```

The script constructs and encodes asset URLs automatically; do not rename the
files merely to remove their spaces.

## 2. Create the Webflow structure

In the Navigator, create:

```text
Hero Section
└── Lighthouse Scroll Track     class: lighthouse-scroll-track
    └── Lighthouse Scene        ID: lighthouse-scene
        ├── Service Labels      attribute: data-service-labels="true"
        │   ├── Label wrapper   attribute: data-service-label="IP"
        │   │   └── Label text or component instance
        │   ├── Label wrapper   attribute: data-service-label="Regulatory"
        │   │   └── Label text or component instance
        │   └── …one wrapper for each of the nine services
        └── Code Embed          contains the module script from step 4
```

**Lighthouse Scene must be a direct child of Lighthouse Scroll Track.**
The JavaScript uses `container.parentElement` to calculate scroll duration.
Do not insert a wrapper between those two elements. The Code Embed belongs
inside the scene; the script appends its canvas to that scene automatically.
Do not add a second element with the `lighthouse-scene` ID inside the embed.

On **Lighthouse Scene**, add this custom attribute in Element settings:

| Attribute | Value |
| --- | --- |
| `data-asset-base` | `https://cdn.jsdelivr.net/gh/pri-bw/Website-Hero-Animation@Alternative-Services/` |

Use your published production revision in that value when deploying. This
attribute is essential for an inline embed: otherwise `import.meta.url` resolves
relative assets against the Webflow page instead of the GitHub asset directory.
There is no need to edit the JavaScript's `modelUrl` or `assetBaseUrl` lines.

Keep the Hero Section and scroll track overflow visible. Put headings and buttons
in Webflow as an overlay above the canvas; they should not change the scroll
track's measured height. The supplied interaction contains no website copy or
service-navigation links. If decorative, the scene can have `aria-hidden="true"`;
keep actual service names and navigation accessible in the Webflow content.

### Set up the Webflow labels

The service names are now **Webflow-owned HTML**, not Three.js text. Create a
Service Labels div **directly inside Lighthouse Scene**, beside the Code Embed,
and give it the custom attribute `data-service-labels` with value `true`.

Inside that layer, create one positioning div per service. Put a Text Block,
Heading, or reusable label component instance inside each positioning div. The
outer div gets `data-service-label`; the component/text inside owns the visible
copy, font, color, size, spacing, and responsive styles.

| Outer wrapper's `data-service-label` value | Suggested visible text |
| --- | --- |
| `IP` | IP |
| `Regulatory` | Regulatory |
| `Incorporation` | Incorporation |
| `Scientifics` | Scientifics |
| `Product Fit` | Product Fit |
| `Marketing` | Marketing |
| `Commercialisation` | Commercialisation |
| `Insurance` | Insurance |
| `Funding` | Funding |

Identifiers are case-sensitive and must match the cleaned SVG filename. Use each
identifier exactly once. Keep the attribute on the **outer positioning wrapper**,
not also on its text child. The visible wording can be anything you prefer:
`data-service-label="IP"` can display “Intellectual Property” without a JS change.

For components, keep the per-service identifier on the ordinary div outside each
instance. This allows all nine labels to share one component design without
hard-coding a single service identifier into the shared component. Set each
instance's visible text through your component's text configuration.

The structural CSS below hides labels until they are focused and places the
layer above the canvas. Style the **child text/component** in Webflow. Suggested
starting typography is pale cream (`#fff5bb`), 24px desktop / 18px mobile, with
centered text and no default paragraph/heading margins. You can change these
styles without editing the script.

Do not apply Webflow Interactions, CSS transitions, or layout transforms to the
outer positioning wrappers: JavaScript owns their `transform`, `opacity`, and
`visibility`. Keep the overlay at zero padding/border with no transform so its
coordinates match the canvas. Put decorative typography effects on the child.

The script projects the icon's below-icon anchor into the overlay's CSS pixels
on each frame. Labels follow camera movement, resizing, and the orbit, with the
same smooth focus fade as before. HTML labels do not shrink with 3D distance;
Webflow controls their font size. They are an overlay, not depth-tested 3D text;
the current front-facing focus keeps them on the visible side of the tower.

Missing labels produce a console warning and are skipped; the 3D animation keeps
running. The script does not invent replacement HTML or overwrite label copy.
Create the label layer and wrappers before the module runs. Keep these moving
labels decorative/noninteractive, with service links in the normal page content;
do not add an `aria-live` region that announces each orbit.

When editing in Designer, you can temporarily show the positioning wrappers to
style their contents. Restore the hidden state before publishing; the script
will control their visibility at runtime. For an existing installation, add this
layer, the new CSS, and the new module together—updating only the script will
remove the old Three.js text without supplying Webflow labels.

## 3. Add the import map and CSS to the page head

In **Page settings → Custom code → Inside `<head>`**, paste:

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

If the page already has an import map, merge these entries into it instead of
adding conflicting mappings. The import map must precede the module script.
Keep core Three.js and addons on the same version.

Use `100%` widths, rather than `100vw`, to avoid scrollbar-width overflow. The
scene is one small-viewport height tall; the parent supplies the extra scroll
travel. A taller track slows the transition over a longer scroll distance.

For overlay buttons inside a parent with `pointer-events: none`, explicitly set
`pointer-events: auto` on the interactive overlay and give it a higher z-index.
The canvas itself should continue to ignore clicks.

## 4. Paste the JavaScript into the Code Embed

Open the Code Embed inside Lighthouse Scene. Add these wrapper tags and paste
**the complete contents of [`main.js`](main.js)** between them:

```html
<script type="module">
  // Replace this comment with the entire contents of main.js,
  // including the two import statements at the top.
</script>
```

The comment above is a placement instruction, not a working animation. Do not
paste Markdown code fences into Webflow. Do not paste all of `index.html`:
Webflow already supplies the page structure, and step 3 supplies the import map.

Remove any previous copy of the lighthouse script from page footer custom code,
site custom code, or another embed. **Run exactly one instance per page.**
There is no need for an external `<script src="…/main.js">` in this setup.

Webflow's Code Embed supports HTML/CSS/JavaScript and has a 50,000-character
limit. Check the size if the script grows substantially. See Webflow's
[Code Embed documentation](https://help.webflow.com/hc/en-us/articles/33961332238611-Custom-code-embed).

## 5. Publish to staging and review

Publish to your Webflow staging domain before updating the live site. A script
may appear as a placeholder while editing; review the actual published page.
Webflow also documents [custom code preview behavior](https://help.webflow.com/hc/en-us/articles/40748357886227-Supporting-external-resources-in-previews-of-custom-code).

Check these behaviors:

- One canvas and nine label wrappers exist in `#lighthouse-scene`; no missing-label, module, WebGL, model,
  or SVG errors appear in the console.
- The GLB and all nine SVGs load from the intended published revision.
- Before scroll, the camera looks slightly upward. Both beams rotate; side-on
  rotation is faster. Hover steers the main beam and dims its opposite.
- Scrolling moves the lighthouse left and gently closer. At the end there is
  only one fixed beam, aimed at the front-right focus.
- The ring lifts at the front and drops at the back. Icons face outward, and
  each HTML label fades below its icon as it enters and leaves focus. Confirm
  your Webflow text and fonts appear, and labels disappear when scrolling back.
- Reverse scrolling restores the initial state. The scene pauses offscreen
  and resumes when visible.
- Phone touch scrolling works without capturing the beam. Inspect narrow and
  landscape layouts, especially the focused icon and long service names.
- Webflow headings and buttons remain positioned and clickable.

## Updating later

| Change | Webflow update |
| --- | --- |
| Animation logic or tuning in `main.js` | Replace the full module contents in the Code Embed and republish |
| Label wording, typography, or component styling | Edit the label contents in Webflow and republish; keep the identifier unchanged |
| Model or SVG changes | Publish the assets, change `data-asset-base` to the new revision, and republish |
| Add/remove service icons | Publish assets, update `serviceFiles`, add/remove matching label wrappers, and replace the embed |
| Scene or scroll-track layout | Update Webflow styles/head CSS and republish |
| Three.js version | Update both import-map entries and retest the complete interaction |

Keep the reviewed source commit and deployed asset revision together in your
release notes. A GitHub push does not replace JavaScript pasted into Webflow.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Icons show but labels do not | Direct-child `data-service-labels` layer, matching unique identifiers, required CSS, and missing-label console warnings |
| Labels drift or flicker | Remove padding/transforms from the overlay and competing interactions/transitions from positioning wrappers |
| Blank scene | Correct ID, nonzero scene height, import map before the module, console/network errors |
| Model or icons requested from the Webflow domain | Missing/incorrect `data-asset-base`; use an absolute URL with trailing slash |
| 404 for an icon | Filename case/spaces, exact `serviceFiles` entry, and whether the SVG exists in the published revision |
| Sticky animation does not stick | Direct-parent structure and ancestor overflow/scrolling containers; scene must be shorter than its track |
| Animation runs twice | Remove duplicate script embeds/external script tags; keep one scene ID |
| Old asset still appears | Use a new immutable asset revision rather than assuming a branch URL refreshed |
| Buttons stop responding | Put content above the canvas and enable pointer events on interactive overlay elements |

For placement of page-level custom code, see Webflow's
[head/body custom code guide](https://help.webflow.com/hc/en-us/articles/33961357265299-Custom-code-in-head-and-body-tags).
