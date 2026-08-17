# ZYNORA viewerV2

Drop this complete folder into `src/components/viewerV2`.

The viewer accepts the existing `design`, `room`, or `floorPlan` data shapes:

```jsx
<House3DViewerV2 room={selectedRoom} />
```

For an uploaded CubiCasa-style SVG, pass the original SVG string and the V5
classification result. This path parses the SVG dynamically and does not fetch
`threejs_scene_10052.json`:

```jsx
<House3DViewerV2
  svgContent={svgContent}
  classification={classification}
  viewMode="top"
/>
```

The dynamic parser keeps every SVG floor, room, wall, door, and window at one
shared scale. Floors are aligned and stacked at their real storey elevations.
Use `selectedFloorId="all"` for the complete building or pass a floor ID for an
individual level.

## Phase 1 geometry pipeline

The viewer now normalizes every supported input into
`zynora.floorplan.v1` (`floorPlan.floorPlanJSON`). The document contains
metre-based room polygons, wall centre-lines, wall-linked openings, an exact
exterior wall loop, slab geometry, and roof massing.

Before rendering, ZYNORA:

- merges duplicate collinear wall segments;
- snaps nearby wall junctions without changing room coordinates;
- maps every door and window back onto its owning wall;
- detects or reconstructs a closed exterior wall loop;
- unions indoor room polygons into an incomplete shell while excluding outdoor
  areas;
- validates wall dimensions, openings, floor count, room containment,
  classifier matches, and shell closure;
- links V5 predictions by the CubiCasa `Space` UUID.

`captureMode` is intentionally different from the interactive cutaway. It
hides room floors, internal partitions, stairs, and furniture, then renders the
exterior walls, openings, foundation slab, flat roof, and parapet. The camera
starts at an architectural view facing the inferred main entrance, but remains
interactive by default.

Interactive controls:

- left-drag or one-finger drag: rotate;
- mouse wheel or two-finger pinch: zoom;
- right-drag or two-finger drag: pan;
- **Reset view**: return to the selected architectural camera.

Pass `interactive={false}` only while producing a fixed automated capture.
Pass `showInteractionHelp={false}` to hide the controls hint and reset button.

## Phase 2 architectural exterior

Exterior mode adds deterministic architectural finish without changing the
floor-plan geometry:

- preserves an imported `zynora.floorplan.v1` exterior shell during a JSON
  round-trip;
- identifies the front façade from ground-floor exterior doors and openings;
- adds wall finishes, plinth bands, slab fascia, window sills and sunshades;
- adds a portal, canopy, steps and wall lights only at the detected entrance;
- adds timber accent slats only in a clear wall interval;
- creates terrace slabs and railings only for explicitly outdoor rooms;
- adds roof caps, paving, planting, sky, soft shadows and filmic tone mapping;
- supports consistent hero, elevation, side, rear and aerial camera views.

`captureView` values:

```text
hero, front, front-left, front-right, left, right, rear, aerial
```

`exteriorStyle` presets:

```text
warm-modern, graphite-white, sandstone
```

```jsx
<House3DViewerV2
  svgContent={svgContent}
  classification={classification}
  captureMode={captureMode}
  captureView="hero"
  exteriorStyle="warm-modern"
  interactive
  selectedFloorId="all"
  onFloorPlanReady={(plan) => {
    console.log(plan.validation);
    console.log(plan.floorPlanJSON);
  }}
/>
```

Render the same normalized plan with several `captureView` values to produce a
matching exterior image set. Only the camera changes, so the house remains
consistent in every view.

It also preserves CubiCasa `FixedFurniture`, stair flights, landings, and tread
positions. If embedded fixture geometry exists, the viewer renders those exact
footprints and does not synthesize unrelated beds, sofas, or tables.

Supported geometry inputs include `outline`, `polygon`, `points`, `vertices`,
SVG point strings, simple SVG `M/L/H/V/Z` paths, and connected wall segments.
Concave room floors use `THREE.ShapeGeometry`, so they are triangulated without
the triangle-fan spikes seen in the earlier preview.

Doors and windows can be supplied in `openings`, `doors`, or `windows`, either
inside a wall or on the room object. An opening should include a wall reference
(`wallId` or `wallIndex`) plus `width`, `height`, and an `offset` or
`positionRatio`. Global `center`, `startPoint`, and `endPoint` coordinates are
also supported.

The V2 shell union uses one small geometry dependency. Run `npm install` after
extracting the overlay. Relevant packages are:

- `three`
- `@react-three/fiber`
- `@react-three/drei`
- `polygon-clipping`
