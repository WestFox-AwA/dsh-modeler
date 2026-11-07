# Independent legacy modeler_script DSL

> Generated from `lib/guide-system.js`; do not hand-edit. Runtime source of truth:
> `{"tool":"modeler_workbench","args":{"action":"guide","args":{"id":"legacy"}}}`.
> Call descriptors shaped {tool,args} mean: invoke that tool with args. Do not pass the tool field as a tool argument.

## Purpose

Read or edit an existing old modeler_script asset through its own route without mixing it with the current native API3 namespace.

## When to use

- The asset already has a legacy generator and you need to read, patch or rerun it.
- You are maintaining an old script asset rather than creating a native API3 source.
- A help result or example uses the old m.* signatures and axis conventions.

## Key facts

- **namespace.** old modeler_script (workbench script/validate/source) and current modeler_geometry program apiVersion3 are independent DSLs. They are not interchangeable, even when a function is spelled m.box.
- **box.** old m.box(w,h,d,name) uses positional full dimensions. API3 m.box([x,y,z]) (or three scalars) takes one size vector; same name, different signature.
- **cylinder.** old m.cylinder(radiusTop,radiusBottom,height,segments,name) is Y-axis with top radius first. API3 m.cylinder({radius,depth,segments,axis}) defaults to local Z; cylinder/torus/extrude accept an explicit axis.
- **mesh.** old m.mesh(positions,name) stores every nine numbers as one triangle (flat, non-indexed). API3 m.mesh(flatXYZ,polygonFaces,{smooth,uvs,orientation}) is indexed polygons and validates face indices.
- **sceneMaterials.** old m.scene(title,parts,meta?) allows a third meta argument; API3 m.scene(title,parts) only. Old material presets are constant PBR; API3 m.paint/m.rubber/m.metal declare process intent, m.glass/.uniform declare explicit uniform intent, and .finish can declare either.
- **methods.** old Part uses .at/.rot/.scaleTo/.mat/.mods/.shade/.key/.clone. API3 Part uses .at/.rot/.scale/.mat/.finish/.uniform/.feature/.interface/.attachTo/.transforms/.key.
- **axes.** Both observe world Y-up, but the old cylinder/torus and current cylinder/torus/extrude local axes differ. Read the exact help entry before reusing a snippet.
- **route.** Legacy source is read/staged with modeler_workbench source/save_source/patch_source/validate and committed with script. API3 native edits use modeler_geometry program/create/feature/update; apiVersion:1/2 only preserves old native-program semantics, not the old DSL.

## Shortest meaningful loop

1. **Confirm the asset is on the legacy route.**
   - Call: `{"tool":"modeler_workbench","args":{"action":"status"}}`
   - Note: A legacy asset has a generator source but no native API3 program/nodes. If unsure, read modeler_geometry {op:"status"} (totalNodes:0 with a legacy generator) and modeler_workbench source before choosing the route.
2. **Read the exact old signature before editing.**
   - Call: `{"tool":"modeler_workbench","args":{"action":"help","args":{"topic":"legacy_api","query":"m.box"}}}`
   - Expect: The old DSL entry, signature, defaults and examples in its own namespace.
3. **Read and stage the source without committing.**
   - Call: `{"tool":"modeler_workbench","args":{"action":"source","args":{"offset":0,"limit":6000}}}`
   - Note: Continue with nextOffset. save_source/patch_source stage immutable source ids; validate checks without changing the asset.
4. **Commit the legacy script with a current guard.**
   - Call: `{"tool":"modeler_workbench","args":{"action":"script","args":{"assetId":"<assetId>","expectedHash":"<contentHash>","sourceId":"<sourceId>"}}}`
   - Expect: A new revision/contentHash, or a validation/conflict error. Existing local overrides need rebase:true; dropping them needs discardOverrides:true explicitly.
5. **Verify the changed geometry or appearance.**
   - Call: `{"tool":"modeler_workbench","args":{"action":"inspect","args":{"id":"<id>"}}}`
   - Note: Then diagnose/capture only the claim that changed. Old DSL does not become API3 after a successful script commit.

## Minimal example

**Goal:** A minimal old-DSL declaration (not API3).

```js
const panel=m.box(1,.12,.6,'Panel').key('panel').at(0,.06,0).mat(m.matte('#607580'));return m.scene('Panel',[panel]);
```

Use with modeler_workbench script/source/validate only, where this is a legacy route. API3 also accepts three-scalar m.box (an extra name is ignored), m.matte, .at, .key and m.scene, so identical symbols do not prove identical semantics. Choose the route explicitly; the old Y-axis m.cylinder and flat non-indexed m.mesh are the clear distinguishers.

## Side effects

- source/save_source/patch_source/validate do not change the working asset; staged source ids are immutable.
- script commits the legacy generator and appends history; it requires the current guard and revalidates before commit.
- A failed validation leaves the old source and asset intact; an invalid code string may still be staged for repair.

## Result and evidence

- source: sourceId, sourceHash, code and characters; nextOffset for the rest.
- validate: validation.valid, error line where available, committable and changedCurrentAsset:false.
- script receipt: new revision/contentHash, delta and geometry feedback; it does not prove appearance.

## Recovery

- **unknown_program_method or wrong signature** — You are probably mixing namespaces. Query legacy_api for the old name and check box/cylinder/mesh/scene signatures.
- **validation failure** — Read validation.error, patch the staged source, validate again; do not commit invalid code.
- **conflict or override conflict** — Re-read the source/guards; choose rebase:true to preserve replayable overrides or discardOverrides:true to drop them explicitly.
- **the asset is actually native API3** — Use modeler_geometry program/feature; do not force it through the legacy script route.

## Exact contracts

- **Old DSL API entry:** `{"tool":"modeler_workbench","args":{"action":"help","args":{"topic":"legacy_api","query":"m.cylinder"}}}`
- **Old DSL precise scene/title/meta fields:** `{"tool":"modeler_workbench","args":{"action":"help","args":{"topic":"legacy_api","query":"m.scene"}}}`
- **Source staging and commit fields:** `{"tool":"modeler_workbench","args":{"action":"help","args":{"topic":"source"}}}`

## Next

- `{"tool":"modeler_workbench","args":{"action":"guide","args":{"id":"main"}}}`

