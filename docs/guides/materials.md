# Uniform and spatial materials

> Generated from `src/host/guide-system.js`; do not hand-edit. Runtime source of truth:
> `{"tool":"modeler_workbench","args":{"action":"guide","args":{"id":"materials"}}}`.
> Call descriptors shaped {tool,args} mean: invoke that tool with args. Do not pass the tool field as a tool argument.

## Purpose

Declare either a uniform PBR constant or a spatial material signal with real physical scale, then let the shared automatic preparation produce display data.

## When to use

- Assigning or changing appearance on a persistent part.
- Deciding whether a color/BRDF constant is enough or a surface/detail signal is actually needed.
- Reusing a material source across parts or diagnosing why a surface looks uniform.

## Key facts

- **kinds.** Uniform PBR is intentionally homogeneous color/BRDF (metalness, roughness, opacity, emissive...). A spatial signal defines varying color/roughness/height/coat through surface/detail/procedural/image data with mapping and physical units. A name such as "fabric" does not create texture.
- **api3.** In API3, .mat(spatialSpec) or .finish(role,recipe,params/options) declares process intent; .mat("#color") remains a plain constant. m.paint/m.rubber/m.metal are actual process recipe helpers; m.glass is an explicit uniform optical declaration with a reason; m.matte/m.emitter stay constants. Use .uniform(role,constant,reason) when you explicitly choose a uniform intent.
- **legacy.** The independent old modeler_script DSL has its own constant presets; they are not API3 process declarations. Never infer one namespace from the other.
- **physicalScale.** Surface/detail mapping and wavelengths are metrical (object/world/frame) or UV/generated units; object scale can stretch an object-space texture. Keep the actual source and declared scale; do not silently change wavelength or amplitude to make an image look busier.
- **preparation.** A normal .mat spatial source, .finish, material-library put/assign, and material author/preview share the same automatic display preparation. No extra bake is required for display, and role/review checks are optional diagnostics, not prerequisites.
- **versions.** New declarations default to recipeVersion:3. An explicit recipeVersion:2 keeps the saved old recipe semantics; saved sources are compiled by their own version, never re-interpreted by name.

## Shortest meaningful loop

1. **Decide uniform vs spatial from the actual requirement.**
   - Note: If the surface must vary at a physical scale (paint orange peel, brushed metal, weave, wear mask), use a spatial source or process recipe. A uniform constant is correct when the intent is genuinely homogeneous.
2. **Declare it on the part or from the material library.**
   - Call: `{"tool":"modeler_material","args":{"op":"recipe","recipe":"sprayed_paint","params":{"color":"#35727c"}}}`
   - Expect: The current-version spec/source and surface summary. Then author or inline it; the source remains editable.
3. **Apply the declaration.**
   - Call: `{"tool":"modeler_geometry","args":{"op":"program","mode":"append","apiVersion":3,"expectedHash":"<contentHash>","code":"const p=m.box([1,.12,.6]).key('panel').finish('panel_finish','sprayed_paint',{color:'#35727c'});return m.scene('Panel',[p]);"}}`
   - Note: Inline .mat(spatialSpec) and .finish use the same automatic preparation. Library put/assign and author are alternatives when reuse or batch assignment is useful.
4. **Inspect the real source and physical scale.**
   - Call: `{"tool":"modeler_material","args":{"op":"get","materialId":"<materialId>"}}`
   - Expect: Source, spec, surface summary, revision/hash and mapping/scale. Use modeler_material {op:"info"} or {op:"uv_info"} for native material/UV details, and {op:"delivery"} or {op:"fidelity"} for actual slot state.
5. **Verify appearance with an image that can show it.**
   - Call: `{"tool":"modeler_capture","args":{"isolate":"<id>","mode":"material","views":["iso"],"width":900,"height":700,"expectedHash":"<contentHash>"}}`
   - Note: Read the PNG. final_normal includes the final normal map; normal shows geometry/shading normals only. Captured does not mean reviewed or accepted.

## Minimal example

**Goal:** One process finish and one explicitly uniform tinted surface.

```js
const body=m.box([1,.1,.6]).key('body').finish('body_finish','sprayed_paint',{color:'#35727c'});const window=m.box([.2,.01,.1]).key('window').uniform('window',{color:'#d5e3eb',metalness:0,roughness:.04},'Uniform tinted panel; intentionally homogeneous, no transmission');return m.scene('Panel',[body,window]);
```

Use this in modeler_geometry program apiVersion3. Do not paste it into the old modeler_script route.

## Side effects

- Inline material declarations commit with their part/program; material library put/assign and author commit a revision.
- preview builds with the same source and preparation but does not commit; its receipt says changedCurrentAsset:false.
- Automatic preparation may create/refresh derived UVs and images without changing the authored source or revision.
- Explicit bake remains available for compatibility/export channels; it is not a required display step.

## Result and evidence

- source/spec/surface: actual declared channels, mapping space, wavelength/amplitude, masks and layers. Names and PNG presence are not fidelity evidence.
- delivery: actual material slots and derived state across program/inline/put/author; fidelity: local UV density, sampling and effective channel ranges.
- author/preview: same-source candidate plus delivery plan and detail tiles; a preview image is not a committed material.
- capture final_normal vs normal: final includes the prepared normal map; normal is the geometry/shading normal diagnostic.

## Recovery

- **appearance is uniform but a spatial source was intended** — Check the actual source type and delivery state; a constant color/BRDF is uniform by design, not by its name.
- **sampling/fidelity insufficient** — Raise detailResolution/detailSize within budget, or report the limit; do not claim fine detail from a non-empty image.
- **material not found or library revision conflict** — List/get the library, re-read its revision, then put/assign with the current values.
- **delivery rejects the material scope** — Follow the delivery guide: reduce to supported constant/baked UV channels or accept the explicit boundary; never expect a silent solid-color downgrade.

## Exact contracts

- **Material operations and readiness:** `{"tool":"modeler_material","args":{"op":"help"}}`
- **Surface signals, mapping and detail tiles:** `{"tool":"modeler_material","args":{"op":"help","topic":"surface"}}`
- **Delivery/fidelity diagnostics:** `{"tool":"modeler_material","args":{"op":"help","topic":"delivery"}}`
- **API3 material helper semantics:** `{"tool":"modeler_geometry","args":{"op":"help","topic":"materials"}}`

## Next

- `{"tool":"modeler_workbench","args":{"action":"guide","args":{"id":"delivery"}}}`

