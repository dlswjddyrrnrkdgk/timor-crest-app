# 3D Tour Quality Baseline

Minimum bar for every unit tour. **Reference: E-Type v3** (raised 2026-11-27; previously set after the G-Type v6 / E-Type v3 round).
A new or updated tour is not done until every item below passes. When in doubt, put the same view of the new tour
next to E-Type and fix whatever looks flatter, darker or more artificial.

## Light (E-Type recipe)
- Daylight leads. Bake with a sun (about 12 W/m², warm white `(1.0, 0.94, 0.86)`, 1.2° disc, low enough to throw
  sun patches through the main glazing) and a physical sky (Nishita multiple scattering, background strength about 0.1)
  for ambient light. A flat-coloured or dusk world is not enough.
- Artificial light is accent, not the main source: coves about 10–25 W per strip, downlights about half of an
  evening setup, table lamps about 6 W. Dusk wall-washers on terraces are off.
- Rooms without direct sun still read bright and even; no blown-out areas (the kitchen in particular).
- Renders and QA stills use AgX, Medium High Contrast, exposure about −0.15.

## Surfaces and materials
- Large surfaces carry real texture, not flat colour: walls get a plaster photo texture (albedo detail and a normal map),
  wood gets a veneer texture, stone floors get crisp veining and tile joints.
- Texture detail survives the bake. Lightmaps are split-baked: albedo (colour only, no noise), light (diffuse direct +
  indirect, denoised on its own) and emission, then combined as `albedo × light + emit`. Only the light pass is
  denoised, so veins, grain and plaster stay sharp.
- Lightmaps are baked from a mesh that still has its texture UV layer (`UVMap`).
- Mirrors reflect (`mirror` material class). Metals stay soft (`brass_soft` for gold trims).

## Furniture and fit-out
- Furniture is scaled to the room: dining and desk chairs about 0.45–0.50 m wide; beds leave a 0.6 m walkway at the foot;
  wardrobes never block a door swing or a terrace door.
- Built-in wardrobes sit flush: the run fills a wall from corner to door casing (or corner to corner), its face is the
  room's wall plane, with flat doors in the wall colour, hairline joints, no handles, and a bulkhead to the ceiling.
  No visible box sides.
- Every route a visitor would take is walkable: room doors, terrace sliders, aisles beside beds and wardrobes.
  Chairs and stools are walk-through; tables, beds and casework are solid.

## Geometry
- No flicker (z-fighting) on pictures, TVs, rugs, mirrors, wall reveals or downlights while moving or turning.
  Thin layers sit on a decal offset (`scene.json` `decal`) or a real gap.
- No shimmer ("지지직") on marble, wood, slats or tile joints while walking: every lightmap KTX2 ships with a full
  mip chain (`ktx_mip.py`, ETC1S, linear-light box filter). Blender's glTF KTX2 export writes one level only, so
  never ship its output directly; check `levelCount` > 1 in the KTX2 header.
- No black blotches, torn faces or see-through cushions on bedding, sofas or chairs. Cloth layers have consistent
  normals facing the open side before baking.
- Curved props are smooth: faucets, pendants, flowers, vases, handles, plants. No faceted or ball-like stand-ins.
- No holes or slits in walls, door frames or the entrance. No view through a wall into a neighbouring room.
- Lights move with the furniture they belong to. After any layout change, re-sync lamp lights to their shades and
  rebake every group whose faces see the change: long walls and ceilings often belong to another room's group.

## Verification
- Screenshot every room from at least two angles, next to the matching E-Type view, check each item above, and fix
  before shipping.
- Walk-test the routes listed under Furniture and fit-out.
- Assets ship under a new version folder (`public/tour-assets/<type>/vN`, bump `ASSET_VERSION`) because they are
  cached as immutable.
- Final check on the Netlify deploy preview: the tour loads the new version and the rooms look the same as the local check.

## Penthouse (PA / PB) notes
- Floor-to-floor 3,000, ceiling 2,800. Door head 2,150, window head 2,450 and sills match the other unit types; the
  extra height goes into tray ceilings (band at 2,620) and bulkheads over built-ins and kitchen uppers.
- Large units are split into more lightmap groups (living, kitchen/dining, corridor, alpha, service, two terraces)
  so each 4K map keeps the same texel density as the smaller types.
- Keep thousands of tiny islands out of a baked group: crystal chandelier prisms go to the GLASS group, otherwise
  they eat a large part of the room's lightmap.
- A mirror that faces a dark wall reads as a black hole in the tour (probe reflection); use art there instead.
- Rooms in `scene.json` are the architectural rooms (`TOUR_ROOMS` in the unit cfg) with the web group as `id`, so the
  floor-plan labels sit in the real room while each room still switches to its own reflection probe. The web group
  rects follow as hidden fallbacks for door openings. `lp` places a label, `fs` shrinks it for narrow rooms, `hide`
  drops it (small service rooms).
- Wet-room cladding must not run along the joint between two rects of the same room (a toilet / tub alcove would be
  sealed behind a tile skin); `clad(..., others=)` cuts those edges.
- Terrace floors meet the lawn with no gap: a strip without a floor box blocks walking and shows as a dark slot.
