# Architecture

`dsh-modeler` is a DSH plugin with a Host half (Node) and a browser half
(Three.js). Both halves share one geometry kernel and one observation contract.

## Layers

```text
Host (index.js)
  tools: modeler_geometry / modeler_material / modeler_workbench / modeler_capture ...
  resources: versioned workspace store (~/.dsh/modeler-resources)
  src/host/: kernel, workspace, materials, evidence, guides, operations
        │
        ├── optional Blender worker (src/runtime/): native geometry, material bakes
        │
        └── render worker: owned headless browser running capture.js
Browser (client.js)
  src/client.workbench.js   panel, viewport, lighting UI
  src/client.render.js      snapshot meshes, material construction, capture renderer
  src/client.observation.js observation stage: lights, shadows, overlays
  src/client.environment.js one linear HDR studio environment
  src/client.floor.js       continuous planar mirror floor
```

## Identity and versions

An asset is identified by `assetId`; a version by `revision` + `contentHash`.
Every write takes a guard (`expectedRevision` or `expectedHash`). A mismatch is a
conflict, never an overwrite. History is bounded and append-only.

## Geometry

API3 sources are declarative (`box`, `cylinder`, `mesh`, `loft`, `extrude`,
`curve`, `surface`, `sweep`, …) with ordered features. Evaluation produces
positions, corner normals, UVs and topology identity. Local edits target stable
semantic IDs, not array indices.

## Materials

A material is either uniform PBR (constant BRDF) or a spatial surface: named
signals plus ordered layers. Display preparation generates UVs and baked channels
once per source; the viewport and captures consume the same prepared data.

## Observation

`lib/observation-purpose.js` is the single resolver for capture intent:

- `purpose`: `shape` → outline, `topology` → surface wireframe, `appearance` → normal.
- Precedence: explicit `displayMode` → `purpose` → explicit diagnostic `mode` →
  edit context → internal legacy default.
- Public capture without any selection fails before asset read or render.

The same resolver runs on the Host (`normaliseCapture`), in the browser
(`normalizeObservation`), and in evidence receipts, so the rendered surface and
the recorded selection cannot disagree.

Rendering composes scene-linear radiance: one HDR environment, PBR planar
reflection for the floor, then a single tone-map + sRGB conversion. Diagnostic
display modes replace the surface with white clay and remove the floor while
keeping the same lights, shadows and camera.

## Evidence

A capture is bound to `assetId`, `revision`, `contentHash`, camera, mode,
display mode, lighting and the PNG hash. `captured` is not `reviewed`; a passing
test is not an aesthetic approval. Geometry measurements, rendered images and
author declarations are separate evidence kinds.

## Delivery

A delivery package carries a manifest, schema version, digest and source
identity so a consumer can verify exactly which version it received.
