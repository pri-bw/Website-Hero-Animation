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
  overrides and the services-only matte finish described below. Measure the model
  before adding decorative beams.
- Do not replace the service SVGs with generated artwork or camera-facing icons.

## Coordinates and composition

The independent `lighthouse-services.html` page uses `lighthouse-services.js`
and `lighthouse-services.css`, with container `#lighthouse-services-scene`.
It presents a lantern close-up at the left edge / 45% down, cropping
half the tower and leaving the right side open. Opening visible height is 2.1 world units
(or 2.1 / aspect on portrait screens). The orb uses emissive intensity 12 and
a local light at intensity 2 plus a one-time radial-texture sprite for a soft optical
halo, plus a broad additive screen-space spill anchored to the projected orb.
The spill's elliptical haze and soft ray fade to zero without a hard boundary.
Narrow viewports pull back to retain horizontal space. A lantern-centered pivot
rotates the model continuously in one direction at 0.6 degrees per second; no pointer
input moves the camera. Scroll over the two-spread
`[data-services-track]` wrapper narrows FOV from 24 to 21 degrees and dollies the
camera 4% closer (zoom stays 1), preserving the opening distance calculation at
24 degrees so the lens change is not cancelled. At widths up to
767px (or coarse pointers with heights up to 500px), the view offset also pans
the lantern from the left edge to 58% of a viewport outside the left edge,
completing at 45% of scroll travel. Desktop shifts it left by 3% of viewport width
over the full zoom transition.
The scene is sticky behind two transparent 100svh content sections. Progress is
clamped over wrapper height minus scene height; reverse scroll restores the opening.
Delta-time smoothing eases scroll; rotation runs while visible and pauses
offscreen/hidden or after mobile has exited. Reduced motion disables automatic
rotation and applies scroll positions directly.
Resize changes renderer size only when needed, not on every animation frame.
The blue key spotlight uses intensity 5000, a 45-degree cone, and full penumbra
for a gentler wash; keep the optical glow independent of tower illumination.
Services-only materials are cloned once per shared source material, retaining
maps and normals. Roughness is at least 0.85, metalness at most 0.15, environment
intensity is multiplied by 0.35, and physical specular/clearcoat are reduced.
Glass uses roughness 0.3 and specular intensity 0.35; the emissive orb stays bright.
Services glazing uses non-refracting transparency (transmission 0, opacity 0.14,
thickness 0, FrontSide, depthWrite false) to avoid layered refraction/transparent
back-face artifacts during rotation. Keep depth testing on so the opaque frame
occludes the glass. This is a thin tinted pane, not a volumetric glass simulation.
The GLB and homepage material settings remain unchanged.
It shares the model and named material overrides, with its own optional
`data-asset-base`; it does not depend on the hero scroll track or CMS markup.

World +Y is up. The camera is on +Z, so +Z is the front, toward the viewer; +X
is the right. The lighthouse remains near the world origin. Camera view offsets
place it on screen without moving the tower or breaking the orbit origin.

Desktop camera distance moves 28 → 22 with zoom fixed at 1. Its starting upward
angle is 8° (physically lower than the lantern) and finishes at 1°. The orb moves
from 70% across / 53% down to 23% across / 43% down the scene.

Mobile: at widths up to 767px, or coarse pointers with heights up to 500px,
use the model-bounds camera path. Start horizontally centered at the bottom,
with the upper half visible and a 6° upward view. Pull back 10% and raise
the camera above the lantern to a 22° downward view, keeping the lantern centered
at 68% down the final frame to reveal more of the lower tower. The target moves from model midpoint to lantern.
Tower rotation now shares the desktop timeline. Touch does not steer the beam.
The portrait view is intentionally cropped; check narrow screens and long labels.

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

The desktop ring pitches **front up / back down** by 10° about the left-right
axis. It does **not** bank left-to-right. Orthonormal axes are:

- X: `(1, 0, 0)`
- Front: `(0, sin(pitch), cos(pitch))`
- Up: `Front × X`

The focus is 50° from +X toward the front within this plane. The beam's world
direction is `X * cos(focusAngle) + Front * sin(focusAngle)`. This puts the
highlight farther toward the viewer while retaining a rightward component.

On mobile the ring pitch is zero: every icon center stays at the orb's height.
The elevated camera provides its visible perspective. The mobile focus is -90°
(away from the camera, across the ring), placing the highlighted icon above the
lantern in the centered frame. `updateServicesLayout()` updates the ring basis,
focus, and final beam direction together, including when crossing breakpoints.
The 4.5 mobile radius tightens the orbit without changing icon sizes;
peripheral icons may leave the portrait frame. Keep the same orbit speed,
curved outward icons, fades, and single final beam.

All successfully loaded service icons have equal angular spacing, independent of count. Radius is 6 desktop / 4.5 mobile, with a
45-second full orbit at full reveal. They fade in during the second half of the
camera transition. Focus brightens and enlarges the nearest icon smoothly.

Icons are curved meshes, not sprites. The SVG texture is bent onto the orbit's
cylinder at its actual radius. Build each icon's orientation from tangent,
ring-up, and outward radial axes so its curvature follows the pitched plane.
Preserve transparent SVG backgrounds and outward-facing geometry.

Labels are HTML elements owned by Webflow, not Three.js sprites or canvas text.
The scene has a direct-child `[data-service-labels]` overlay. In CMS mode, the
source list provides each label wrapper and the script moves that existing node
into the overlay, sets `data-service-label` to the stable CMS slug, and preserves
its text/component contents. This avoids Collection List positioning ancestors.
Style labels by their own classes, not Collection Item ancestry.
In local fallback mode, static overlay identifiers still match cleaned filenames
(extension, numeric prefix, and White/Black/Color/Colour suffix removed).
Never overwrite label copy or typography. Missing mappings warn and skip that
label without breaking a valid icon; do not create fallback labels.

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
preview. The asset base serves the GLB and local fallback SVGs, not inline CMS icons.

Use Three.js and its addons at the same pinned version (currently 0.179.1).
Place the import map before the module. Paste the complete `main.js` into one
Webflow `<script type="module">` embed; never load a second copy elsewhere.
The model must exist in the published asset revision. `serviceFiles` and
`Iconography/` are used only when there is no CMS source. Do not rename local
artwork to guess a mapping to renamed CMS services.

## CMS service contract

A `[data-services-cms]` source inside the scene selects CMS mode, even if empty.
Each `[data-service-item]` value is bound to Slug; `[data-service-name]` text is
bound to Service Name. `[data-service-icon]` contains a real inline SVG rendered
from the existing Service Icon rich-text embed. Each item may contain one
`[data-service-label]` wrapper with its label component. Webflow sorts the list
by the existing Order field ascending; preserve rendered DOM order in JS.

Read the initially published list once. Do not add a browser CMS API token,
live polling, or pagination fetching. Disable load-more/pagination in the hero
source list. Hide the source list with CSS after styling; move its labels into
the overlay, leaving the original SVG markup untouched.

`inlineSvgSource()` clones the SVG, uses its viewBox/dimensions for aspect ratio,
normalizes currentColor to white for the cream material tint, and raises raster
resolution to 768px on the longest side. Load the SVG through a temporary blob
URL; revoke it on both success and failure. Preserve transparent regions and
curved outward geometry. Use self-contained SVG styling.

Load icons asynchronously, preserve source order, skip invalid/duplicate-slug or
failed items with warnings, then space successful items evenly. An empty CMS
source must not fall back to unrelated local services. Names and slugs come
from the CMS, not legacy filenames (e.g. Clinical and Translation are valid).
Keep the local preview/fallback working without a Webflow connection.

## Validation

Run `node --input-type=module --check < main.js` and `git diff --check`.
For animation changes, preview desktop and phone sizes in a browser, inspect
console/network failures, hover enter/leave, touch scrolling, reverse scroll,
and viewport resizing. Verify the final beam stays still and only one beam is
visible; all loaded labels should pass through focus over a full orbit.

For geometry changes, check equal spacing, outward mesh normals, curved surface
radius, front/back ring pitch, and alignment of the final beam and focus point.
For label changes, check DOM opacity near both sides of a focus boundary and at
the 0/2π seam, pixel alignment after resize/scroll, editable copy preservation,
and missing-label behavior. Report browser limitations honestly rather than marking unrun checks
as passed.

## Decision history

- **2026-11-05 (services interaction):** Add lantern-linked light spill and a
  reversible lens zoom/dolly across two stacked spreads. Replace pointer camera movement
  with a continuous 0.6-degree/second rotation, shift desktop framing 3% left, and complete
  mobile's left exit at 45% of scroll travel so content clears sooner.
  Reduce mobile travel to 58% of a viewport; lower/widen the blue key light and
  halve the lantern's local light to soften illumination on the model.
  Narrow FOV 24 to 21 degrees with a 4% dolly, and apply cloned matte material
  adjustments only to this page to reduce reflections without editing the GLB.
  Replace services glass refraction/double-sided blending with a thin front-face
  tint to address reported flickering of the visible interior during rotation.
  Use a sticky background and explicit track marker so Webflow owns both sections.

- **2026-10-22 (services close-up):** Move the lantern center to the left edge,
  reduce framing height from 2.8 to 2.1, and add a warm optical halo so the
  closer, half-cropped lighthouse has a visibly stronger glow.

- **2026-10-22 (services page):** Add an independent lantern close-up page and
  module so the services composition can evolve separately from the hero.
  Use an offset camera and a stationary scene with open space on the right.

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
- **2026-10-15 (CMS icons):** Support the existing Services collection's inline
  SVG embeds, names, slugs, and rendered Order sort. Normalize currentColor only
  in texture copies and supersample small SVGs. Move actual CMS label wrappers
  into the overlay. Use dynamic icon counts with explicit empty/error behavior;
  retain the filesystem list only when the CMS marker is absent.
- **2026-10-15 (mobile composition):** Center the opening at the bottom; raise
  the final camera to a 22° downward view. Use a horizontal ring at lantern height
  and an across-ring focus/beam above the lantern on screen, following the mobile
  reference. Keep desktop composition intact and update both layouts on resize.
- **2026-10-15 (mobile framing refinement):** Pan the final viewport down by
  moving the lantern anchor from 76% to 68% of screen height. Reduce mobile ring
  radius from 5.2 to 4.5; retain camera elevation, icon sizes, and animation timing.
