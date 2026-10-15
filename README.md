# Faros · Website Interactions

**Built for Faros by Blurry Works.**

This repository maintains the interactive assets and related files used on the
Faros main website. It brings together the lighthouse model, service iconography,
animation code, and integration guidance so the website experience can be
reviewed, refined, and released from one place.

The current hero interaction uses a lighthouse to introduce Faros’ interconnected
commercialization services: a pair of sweeping beams becomes a focused light,
while service icons orbit the tower.

## The experience

**Before scrolling** — The lighthouse sits to the right, seen from a slightly
lower camera looking upward. Two opposing light beams rotate automatically.
Their rotation accelerates as they face sideways and eases back to normal as
either beam faces the camera. Moving the pointer over the scene steers the main
beam and gently dims the opposing beam.

**On scroll** — The camera approaches and moves the lighthouse to the left.
The opposing beam fades away, leaving a fixed light aimed toward the viewer’s
front-right side. The camera transition finishes at 80% of the scroll track.

**The services view** — Nine equally spaced icons orbit the lighthouse on a
slightly pitched ring: the front rises and the back drops. Each SVG wraps onto
a curved surface and faces outward from the tower. As an icon crosses the beam’s
focus, it brightens and its name fades in below it, then fades out as it moves on.
Labels are ordinary HTML elements or Webflow component instances; Webflow owns
their copy and typography while the animation controls positioning and fades.

On phones, the composition uses a separate camera path and smaller orbit. Touch
gestures scroll the page without steering the beam. Rendering pauses when the
scene or browser tab is hidden.

## Built with

- **Three.js 0.179.1** for the WebGL scene, camera, lighting, and animation.
- **GLTFLoader** for the lighthouse model.
- **Custom shaders** for the visible beams.
- **SVG textures on curved meshes** for the service icons.
- **HTML, CSS, and native JavaScript modules** for the local preview and Webflow integration.

There is no application framework, bundler, or installation step for the preview.
Three.js is loaded from a pinned CDN URL.

## Repository guide

| File or directory | Purpose |
| --- | --- |
| [`main.js`](main.js) | Scene setup, camera paths, beam interaction, service orbit, and labels |
| [`style.css`](style.css) | Local hero layout and sticky scene styling |
| [`index.html`](index.html) | Standalone development preview and HTML service labels |
| [`models/`](models/) | Lighthouse GLB asset |
| [`Iconography/`](Iconography/) | Nine service SVGs, with filenames used to derive display names |
| [`WEBFLOW.md`](WEBFLOW.md) | Deployment guide for JavaScript inside a Webflow Code Embed |
| [`AGENTS.md`](AGENTS.md) | Maintainer instructions, coordinate conventions, and decision record |

## Preview locally

From the repository directory, run:

```sh
python3 -m http.server 8000
```

Open **http://localhost:8000**. Use a web server rather than opening `index.html`
directly: the preview loads modules, a GLB, and SVG assets over HTTP.

Check the opening, hover interaction, full scroll transition, reverse scroll,
and both portrait and landscape layouts when reviewing a change.

## Use on the Faros website

The preferred integration keeps the JavaScript **inside a Webflow Code Embed**.
The lighthouse model and service icons are versioned in GitHub and served through
jsDelivr. A `data-asset-base` attribute on the scene selects the published asset
version without changing the JavaScript.

Follow **[the Webflow integration guide](WEBFLOW.md)** for the element structure,
CSS, import map, embed setup, and release checks.

## Maintenance and releases

`main.js` is the source of truth for interaction behavior. Keep the deployed
Webflow embed in sync with the reviewed source, and publish the model and all
referenced SVGs together. Pin the asset base to a commit or release tag for a
reproducible deployment.

The `Alternative-Services` branch contains the service-ring exploration. Local
changes or commits do not update the live Faros website automatically: the
assets must be pushed, and the Webflow embed must be updated and published.

When behavior changes, update the decisions in [`AGENTS.md`](AGENTS.md) and any
relevant integration guidance. Keep website copy, links, and buttons in Webflow;
this repository supplies the visual interaction beneath them.

---

Maintained by **Blurry Works** for **Faros**.
