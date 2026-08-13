# Third Home

Prompt City. Urban Vision Wolfsburg 2026 — Design studio SoSe 2026
Bauhaus-Universität Weimar, InfAU

**Team:** Divya Venkatraman, Samhitha Chandrashekar, Ziad Ismaeil

## Abstract

Third Home confronts Wolfsburg's rhythm as a shift-based town that empties after factory hours, when commuters leave and public life fades. It draws on Ray Oldenburg's notion of the "third place" to propose a collectively owned six-storey community building, neither home nor workplace, that gives commuters and neighbouring residents a reason to stay into the evening. The structure separates a fixed core of services and long-stay rooms from lightweight modules that members can book, add and reconfigure themselves, so the building stays, in the team's terms, "always buildable." A digital interface governs both space and community: residents book rooms directly within a three-dimensional model and decide together through defined roles of guests, members and keepers. An open ground-floor kitchen ties the building to the street, and the model is intended to be repeated across the city's districts.

AI-assisted development shaped how interactive the interface became, turning the booking model from a static plan into something residents navigate and act on directly, and helped extend the governance concept — guests, members, and keepers — from an idea into the working logic of Third Home itself.

## The urban issue

Wolfsburg is a company town built around Volkswagen's shift schedule: when factory hours end, commuters leave and public life empties out with them. Outside of work and home, there's little in the city that gives workers, neighbours, or newcomers a reason to stay into the evening rather than leave.

## How to use this site

- The site opens on the **Space** view — the interactive 3D booking/deployable-module interface. **Plan/Iso** toggle the camera; click floor cells to book a space; the left panel toggles model layers.
- **Events** and **Exhibition** are alternate views of the same 3D space.
- **Deployables** (top nav) opens a separate deployable-module design tool, forked from a sibling studio project and adapted for Third Home.
- **HOME** (top nav) opens the governance/social side of the project: Home, Governance (the consent/proposal system), Events, Stay (room booking with role-based pricing), Community, Open Studio, and Configure (a flexible-floor-plan tool). Switch roles (Guest/Member/Keeper) with the pill switcher in that section's nav to see how the experience changes — this is the fastest way to see the actual idea (consent-based governance, role-dependent pricing) in under thirty seconds.
- **Materials** (top nav) opens supporting documents.

## What is frozen

- The exhibition visitors actually met was a separate Next.js app, deployed directly from a laptop to a free Vercel account, never committed to any repository. It has been recovered, ported into this site (the **HOME** section), and is now static — no server, no separate deployment.
- One of the four source repositories (`SamSam8620/third-home-interface`) has newer UI work on GitHub — a print-export feature, booking-halo highlighting, floor-navigation buttons, homepage character illustrations — that exists only as a minified, unreadable JavaScript bundle. No readable source for these changes could be found anywhere in the project. They are not in this build. If the source exists on another machine, it's worth recovering before it's lost for good.
- The governance section's "3D Model" link used to embed a separate, stale, mismatched build (from a different studio project entirely) in an iframe. It now links directly to this site's own working 3D viewer.
- The booking interface's building and space geometry was previously raw exported JSON — the largest single file was 67MB, and the full set totaled roughly 250MB. It has been converted to Draco-compressed `.glb` (roughly 5MB total) and loads from local files, not a backend.
- pdf.js is referenced in this project's original build brief but was never actually found anywhere in any of the four source repositories — there was nothing to vendor.

## Contents

- `materials/` — personas descriptions and a 300 dpi scan of the printed exhibition sheets showing the building versions (both PDF), viewable at `materials/index.html`. A site map and floor plans were referenced in the original brief but confirmed not to exist anywhere in the project.
- `presentation/` — 9 slides captured from the live presentation site (third-home-wolfsburg.vercel.app), viewable at `presentation/index.html`.
- `deployables/` — a second, separately-built 3D deployable-module design tool (forked from a sibling studio project, Rewire Wolfsburg, and rebranded here).
- Governance/social section (Home, Governance, Events, Stay, Community, Open Studio, Configure) — ported from what was originally a separate app, `home-app`, now merged directly into this site.

## How to run it

Static — serve this `site/` folder from any web server (or open a local one, e.g. `npx serve .`). No build step needed to view it as-is.

To rebuild from source: the buildable project lives in `source/webapp/site/`.

```
cd source/webapp/site
npm install
npm run build
```

This also builds the nested `deployables/` app automatically (chained in the `build` script). Output lands in `source/webapp/site/dist/` — that becomes the new `site/` folder.

`source/webapp/` also contains the conversion script used to turn the original raw-JSON geometry into `.glb` (`scripts/convert-models.mjs`), if the underlying 3D models are ever re-exported from Rhino and need reconverting.

## Credits

**Fonts** (vendored locally, both SIL Open Font License):
- IBM Plex Mono — IBM / Google Fonts
- Inter — Rasmus Andersson / Google Fonts

**Libraries** (all open source, bundled at build time — none loaded from a CDN):
- React, React DOM — MIT
- three.js — MIT
- @react-three/fiber, @react-three/drei — MIT
- Vite — MIT
- Tailwind CSS — MIT
- lucide-react — ISC
- clsx, tailwind-merge — MIT
- @gltf-transform (build-time only, not shipped in the site) — MIT

**3D geometry and photographs**: all original team work — Rhino models, renders, material reference images, and site/exhibition photography by Divya Venkatraman, Samhitha Chandrashekar, and Ziad Ismaeil.

## Permissions

We agree that InfAU may republish this work under a university account or domain —
including on GitHub Pages — host and mirror these files, and show the work in teaching,
exhibitions and documentation, with credit to the team.
