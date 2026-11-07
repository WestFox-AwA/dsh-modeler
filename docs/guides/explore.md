# Question-driven exploration and evidence

> Generated from `lib/guide-system.js`; do not hand-edit. Runtime source of truth:
> `{"tool":"modeler_workbench","args":{"action":"guide","args":{"id":"explore"}}}`.
> Call descriptors shaped {tool,args} mean: invoke that tool with args. Do not pass the tool field as a tool argument.

## Purpose

Answer a specific question about the current asset with the smallest read-only evidence, then stop or choose one informative next observation.

## When to use

- Before editing, when the exact part, parameter, contact or orientation is still uncertain.
- After a change, to verify the exact question the change was meant to answer.
- When a visual impression and a numeric claim disagree.

## Key facts

- **question.** Write the question so it can be false: "does rail A cross shell B?", "is this seam open?", "is this face outward?", "which parameter controls the width?". A vague "looks off" is not yet a check.
- **layers.** Source/parameters, evaluated geometry and rendered images answer different questions. Use measurements for numeric/contact claims and images for appearance, occlusion or material claims.
- **coverage.** diagnose, orientation, pick and probe report coverage, budgets and unknown reasons. complete:false or unknown is a real result, not a pass.
- **limits.** An AABB overlap is a candidate, not penetration. Surface distance is not signed contact. A PNG is camera-bound; captured:true is not reviewed:true or accepted.
- **menu.** The numbered loop below is an optional checks menu; pick only the evidence that answers the current question, and skip the rest.
- **exploration.** Choose the next observation from the unresolved part of the question. There is no video/trajectory API and no auto-explorer that picks questions for you.
- **displayModes.** mode is the existing channel diagnostic, not a display selector: material, clay, normal (existing MeshNormalMaterial diagnostic), final_normal, wire (legacy MeshStandardMaterial wireframe), id, zebra, orientation, roughness, metalness, albedo. displayMode is the separate display axis: normal means no display overlay and mode still selects the surface (default mode:material is PBR); surface_wireframe is a white clay model with a real depth-tested triangle-surface wireframe overlay; outline is white clay with visible semantic editableId boundaries and silhouettes from a depth-tested 3x3 screen-space ID composite (same source shares one color), plus optional hard crease edges. It is a mesh/source observation, not a CAD topology proof. Both new displayModes force no floor and a flat background; normal+material preserves an authored stage floor, otherwise shows the studio mirror by default.
- **lighting.** modeler_capture and the viewport accept one transient, camera-independent lighting object: key/fill/rim {color,intensity,position,shadows}, hemisphere {sky,ground,intensity}, environment {intensity}, shadows {enabled,mapSize,bias,normalBias}, floor {enabled,mirror,tint,shadow,size,position,roughness,metalness}, background and exposure. key/fill/rim position is a world-axis offset from the bounds centre/target, not an absolute world origin; floor.position is world coordinates. environment.intensity is an absolute override (0..10), not a multiplier; omitting it preserves the effective authored/default value. Merge order is studio defaults -> authored doc.meta.renderStage -> explicit transient lighting fields. Without explicit light/hemisphere, authored stage lights/background/exposure/shadows/floor persist; explicit light/hemisphere switches to observation defaults; explicit floor replaces the stage floor. Diagnostic displayModes force only floor off and a flat background; they keep the effective lights/shadows/exposure. Viewport lighting controls are temporary, usable while browsing, and Reset returns to the asset/default lighting; they never write the asset. Viewport/capture share linear HDR (studio-radiance-v3), PBR planar reflection and one final tone-map/sRGB conversion. Default ground covers the view without radial masks; explicit floor.size is finite. Omitted shadow normalBias scales with bounds; explicit values use world units. Camera receipts give actual clip planes. BRDF/normals stay authored; smoothing hard box edges can distort highlights. The receipt lists the effective lights and floor.

## Shortest meaningful loop

1. **Name the question and the evidence that would answer it.**
   - Note: Pick one: identity/parameter, geometry measurement, contact/relation, orientation/topology, or appearance.
2. **Read identity and structure before measuring.**
   - Call: `{"tool":"modeler_workbench","args":{"action":"tree","args":{"depth":2,"offset":0,"limit":24}}}`
   - Expect: Exact IDs, parents and module/leaf roles. Then inspect the specific part and parameter.
   - Note: Call modeler_inspect {id:"<id>"} for the part receipt, and modeler_workbench inspect {id:"<id>",parameter:"<field>",offset:0,count:8} for arrays or mesh:true for base topology.
3. **Measure numeric or contact questions.**
   - Call: `{"tool":"modeler_workbench","args":{"action":"diagnose","args":{"query":"pair","id":"<a>","other":"<b>"}}}`
   - Expect: classification, minimum gap, solid overlap, coverage and unknown reasons. Use query:"part" for bounds/topology, "section" for a cut, "relations" for declared constraints, and query:"surface" with method ray/project/nearest for a measured surface hit.
4. **Check orientation, topology identity or a picked face.**
   - Call: `{"tool":"modeler_geometry","args":{"op":"orientation","id":"<id>","count":8}}`
   - Note: orientation separates winding, geometric normals and shading normals. For a picked surface point/face call modeler_geometry {op:"pick",id:"<id>",origin:[0,2,0],direction:[0,-1,0]}; probe reports components/bounds without claiming components are semantic parts.
5. **Observe only when the question is visual.**
   - Call: `{"tool":"modeler_capture","args":{"isolate":"<id>","context":["<neighbor>"],"views":["iso"],"mode":"clay","displayMode":"normal","width":900,"height":700,"expectedHash":"<contentHash>"}}`
   - Expect: A PNG path plus assetId/revision/contentHash, camera, mode, displayMode and the transient lighting/observationStage receipt. Call read_image before drawing a conclusion.
   - Note: For a cutaway, use capture section:{axis:"x"|"y"|"z",value:<coordinate>}; the section is part of image identity. Use displayMode:"surface_wireframe" for white clay plus a real triangle-surface wireframe, or displayMode:"outline" for visible semantic editableId boundaries/silhouettes from a depth-tested 3x3 ID composite plus optional hard crease edges; mesh triangles are not a CAD topology proof. For shape inspection outline/surface_wireframe is often clearer than colored PBR; a same-camera/lighting/hash three-mode comparison is optional, not a mandatory triple call per edit. Pass lighting:{...} for bounded transient lights/shadows/mirror-floor overrides; key/fill/rim.position is relative to the bounds centre, not an absolute origin. The exact field contract is the capture help entry.
6. **Interpret and choose one next action.**
   - Note: If the question is answered, stop. If not, choose the smallest additional evidence (one pair, one section, one targeted view). Do not loop on captures; edit only when the evidence supports the intended change.

## Minimal example

**Goal:** Check whether two parts actually touch, keeping the assembly context.

Call: `{"tool":"modeler_workbench","args":{"action":"diagnose","args":{"query":"pair","id":"<a>","other":"<b>"}}}`

Read classification, minimumGap, solidOverlap and coverage. If the answer is still ambiguous, take one isolated clay/normal image with context, or one displayMode:"surface_wireframe"/"outline" image; outline is often clearest for shape. Same-camera/lighting/hash three-mode compare is optional, not mandatory per edit, and not a CAD topology proof.

## Side effects

- All exploration calls are read-only: no revision/contentHash change.
- capture writes evidence files and a receipt; it does not approve appearance. Transient lighting and displayMode never write doc.meta.renderStage or any asset field.
- trial_observe/trial_diagnose read a stored candidate; they do not commit it.

## Result and evidence

- diagnose: coverage.complete, result, unknownReasons, editTargets and witness points; open shells, hidden objects and budgets can leave unknown.
- capture: evidence.path or captures[].path, version, camera, mode, displayMode, lighting, renderer and image hash; compare only at the same camera, size, mode, displayMode and lighting.
- preview/modeler_views: character diagnostics for shape/occlusion; they do not prove material appearance.
- assembly_check: candidate pairs, classification, witness, contact intent and complete; AABB candidates are not penetration.

## Recovery

- **unknown or incomplete coverage** — Narrow the question to one id/pair/section, raise the explicit budget only if supported, or report the limit instead of asserting a pass.
- **stale image or changed version** — Re-read the current contentHash and re-capture the same camera; an old PNG never proves a new version.
- **no renderer for the viewport source** — Use the default isolated capture or modeler_views; viewport capture needs an online matching client.

## Exact contracts

- **Diagnose query fields and limits:** `{"tool":"modeler_workbench","args":{"action":"help","args":{"topic":"actions","query":"diagnose"}}}`
- **Capture camera/views/mode/displayMode/lighting fields and defaults:** `{"tool":"modeler_workbench","args":{"action":"help","args":{"topic":"actions","query":"capture"}}}`
- **Orientation and topologyStamp:** `{"tool":"modeler_geometry","args":{"op":"help","topic":"orientation"}}`

## Next

- `{"tool":"modeler_workbench","args":{"action":"guide","args":{"id":"construct"}}}`

