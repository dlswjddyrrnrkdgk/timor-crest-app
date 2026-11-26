# 3D Tour Quality Baseline

Minimum bar for every unit tour (set after the G-Type v6 / E-Type v3 round). A new or updated tour is not done until every item below passes.

## Geometry and surfaces
- No flicker (z-fighting) on pictures, TVs, rugs, mirrors, wall reveals or downlights while moving or turning. Thin layers sit on a decal offset (`scene.json` `decal`) or a real gap.
- No black blotches, torn faces or see-through cushions on bedding, sofas or chairs. Cloth layers have consistent normals facing the open side before baking.
- Curved props are smooth: faucets, pendants, flowers, vases, handles. No faceted or ball-like stand-ins.
- No holes or slits in walls, door frames or the entrance. No view through a wall into a neighbouring room.

## Materials and light
- Mirrors reflect (`mirror` material class). Metals stay soft (`brass_soft` for gold trims).
- Lighting is even with no blown-out areas (the kitchen in particular).
- Lightmaps are baked from a mesh that still has its texture UV layer (`UVMap`), then denoised.

## Verification
- Screenshot every room from at least two angles, check each item above, and fix before shipping.
- Assets ship under a new version folder (`public/tour-assets/<type>/vN`, bump `ASSET_VERSION`) because they are cached as immutable.
- Final check on the Netlify deploy preview: the tour loads the new version and the rooms look the same as the local check.
