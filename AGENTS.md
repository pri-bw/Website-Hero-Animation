# Faros interaction maintainer guide

## Purpose and workflow

This repository is maintained by Blurry Works for the Faros main website.
Read this file before modifying the interaction. `main.js` is the behavior source
of truth; `index.html` and `style.css` provide the local preview.

- Keep changes within the user's requested scope and preserve unrelated work.
- Update this file in the same change whenever animation behavior, coordinate
  conventions, asset loading, or deployment assumptions change. Record the
  decision and its reason; replace obsolete current-state notes.
- Keep `README.md` as the public project overview. Put Webflow setup details in
  `WEBFLOW.md`, and update that guide when integration changes.
- Do not publish, push, or modify the live website unless requested.
- Preserve model materials and exported normals except for the named glass/orb
  overrides. Measure the model before adding decorative beams.
- Do not replace the service SVGs with generated artwork or camera-facing icons.

## Coordinates and composition

World +Y is up. The camera is on +Z, so +Z is the front, toward the viewer; +X
is the right. The lighthouse remains near the world origin. Camera view offsets
place it on screen without moving the tower or breaking the orbit origin.

Desktop camera distance moves 28 → 22 with zoom fixed at 1. Its starting upward
angle is 8° (physically lower than the lantern) and finishes at 1°. The orb moves
from 70% across / 53% down to 23% across / 43% down the scene.

Mobile: at widths up to 767px, or coarse pointers with heights up to 500px,
use the model-bounds camera path. It starts with the upper half visible and a
6° upward view, grows about 25%, and levels out. Keep touch scrolling independent
of beam steering. The portrait view is intentionally cropped; verify focused
icons and long labels on narrow screens before release.

## Scroll and rendering invariants

- `#lighthouse-scene` must be a direct child of the scroll track; the script uses
  that parent to measure progress. The scene is sticky and `100svh` tall.
- Scroll travel is parent height minus scene height, including on mobile.
- Smoothed camera progress completes at 80% of scroll travel. Reversing scroll
  must restore the opening, including its second beam and interaction.
- Delta-time compensation keeps animation speeds consistent across frame rates.
  Cap large frame deltas; pause the animation loop when offscreen or tab-hidden.
- The pixel-ratio cap is 1.5. Avoid allocating materials/textures each frame.
- The canvas does not capture pointer events. Webflow owns headings, links, and
  buttons above it. Pointer movement is observed on `window`.

## Beam decisions

Both beams share geometry and one orientation pivot. Their local axes are
exactly opposite, including during tilt and hover. The opposing beam owns a
separate material/uniform so its brightness can change independently.

Before scroll, the main beam remains at full opacity. Hover smoothly brings the
opposing beam to 35% opacity; leaving restores it. During scroll, multiply that
brightness by `1 - lockProgress`, reaching zero/hidden in the services view.

Automatic rotation uses `getAutomaticRotationMultiplier()`: compare the beam's
horizontal world direction to the camera-to-orb direction. The factor is
`1 + (2.2 - 1) * (1 - alignment²)`. It is 1× when either beam faces toward/away
from the camera and 2.2× side-on, with a continuous ramp between. This is visual
speed compensation, not a claim of exact constant screen-space velocity.
Only automatic rotation uses this multiplier; hover smoothing is unchanged.

The final direction is derived from the same pitch and angle as the ring focus.
Do not tune the ring and final beam independently: they must intersect at focus.
Parent-rotation compensation keeps tower rotation from dragging the beam around.

## Ring and focus decisions

The current ring pitches **front up / back down** by 10° about the left-right
axis. It does **not** bank left-to-right. Orthonormal axes are:

- X: `(1, 0, 0)`
- Front: `(0, sin(pitch), cos(pitch))`
- Up: `Front × X`

The focus is 50° from +X toward the front within this plane. The beam's world
direction is `X * cos(focusAngle) + Front * sin(focusAngle)`. This puts the
highlight farther toward the viewer while retaining a rightward component.

Nine icons have equal angular spacing. Radius is 6 desktop / 2.6 mobile, with a
45-second full orbit at full reveal. They fade in during the second half of the
camera transition. Focus brightens and enlarges the nearest icon smoothly.

Icons are curved meshes, not sprites. The SVG texture is bent onto the orbit's
cylinder at its actual radius. Build each icon's orientation from tangent,
ring-up, and outward radial axes so its curvature follows the pitched plane.
Preserve transparent SVG backgrounds and outward-facing geometry.

Labels are HTML elements owned by Webflow, not Three.js sprites or canvas text.
The scene has a direct-child `[data-service-labels]` overlay containing unique
`[data-service-label="IP"]` positioning wrappers. Values match cleaned filenames
(extension, number prefix, and White/Black/Color/Colour suffix removed).
The wrapper may contain a reusable Webflow component; keep identifiers outside
the shared component so each service is independently mapped. Never overwrite
its contents, font, or responsive styling. Missing mappings warn once and skip
that label without breaking the scene; do not create fallback labels.

JavaScript owns only wrapper transform, opacity, and visibility. Update camera
world matrices before projecting the below-icon anchor to CSS pixels. The overlay
must fill the scene without padding, border, or transforms. Hide labels when the
ring is hidden or their anchors are clipped/behind the camera. HTML labels are
not depth-tested; the focus is deliberately on the front side. Keep labels
noninteractive/decorative and normal service navigation in Webflow page content.
Document any change to this DOM/CSS contract in WEBFLOW.md and mirror it in the
local preview's index.html/style.css.

Use wrapped angular distance for the label fade: full near 10% of the icon
spacing, zero at 50%. Do not gate opacity by an abruptly changing nearest index;
the fade must reach zero before the next name appears, including at the wrap seam.

## Asset and integration contract

`data-asset-base` on `#lighthouse-scene` overrides the asset directory. It must
be an absolute published URL with a trailing slash for inline Webflow modules.
Without it, assets resolve relative to `main.js` for the local/external-module
preview. Keep asset loading shared between the GLB and SVGs.

Use Three.js and its addons at the same pinned version (currently 0.179.1).
Place the import map before the module. Paste the complete `main.js` into one
Webflow `<script type="module">` embed; never load a second copy elsewhere.
The model and all filenames in `serviceFiles` must exist in the published asset
revision. The current icon directory was supplied by the user; do not assume
untracked local assets are already on GitHub.

## Validation

Run `node --input-type=module --check < main.js` and `git diff --check`.
For animation changes, preview desktop and phone sizes in a browser, inspect
console/network failures, hover enter/leave, touch scrolling, reverse scroll,
and viewport resizing. Verify the final beam stays still and only one beam is
visible; all nine labels should pass through focus over a full orbit.

For geometry changes, check equal spacing, outward mesh normals, curved surface
radius, front/back ring pitch, and alignment of the final beam and focus point.
For label changes, check DOM opacity near both sides of a focus boundary and at
the 0/2π seam, pixel alignment after resize/scroll, editable copy preservation,
and missing-label behavior. Report browser limitations honestly rather than marking unrun checks
as passed.

## Decision history

- **2026-10-08:** `Alternative-Services` introduces opposing opening beams, a
  leftward services composition, nine orbiting SVGs, and a fixed final beam.
  Later refinements add curved outward-facing meshes and shared beam/ring focus.
- **2026-10-15:** Lower the opening camera; dim the opposing beam on hover;
  compensate automatic speed through side-on directions. Replace the ring's
  right-side bank with front-up/rear-down pitch and move focus to 50° toward
  the viewer. Replace discrete label swaps with continuous angular fades.
  Separate the public README, Webflow embed guide, and this maintainer record.
- **2026-10-15 (Webflow labels):** Replace text sprites with projected HTML
  wrappers so Webflow can own copy, typography, and reusable components. Keep
  the existing angular fade and curved icon meshes. Add explicit label mapping,
  hide-on-reverse/clip handling, local preview markup, and Webflow setup notes.
