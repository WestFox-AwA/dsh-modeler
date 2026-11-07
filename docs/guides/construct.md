# Construct persistent API3 geometry

> Generated from `src/host/guide-system.js`; do not hand-edit. Runtime source of truth:
> `{"tool":"modeler_workbench","args":{"action":"guide","args":{"id":"construct"}}}`.
> Call descriptors shaped {tool,args} mean: invoke that tool with args. Do not pass the tool field as a tool argument.

## Purpose

Declare persistent API3 geometry as a base source plus ordered features, with stable semantic IDs, so later edits remain local and replayable.

## When to use

- Creating a new native source or adding parts to an API3 asset.
- Choosing a base form (box, cylinder, mesh, loft, extrude, curve, surface, sweep) before detailing.
- Changing a source form or replaying a multi-part program.

## Key facts

- **axes.** World is Y-up with the ground on XZ. API3 cylinder, torus and extrude default to the local Z construction axis; pass axis to change it. Lengths are metres and rotations are radians.
- **sourceVsFeatures.** source is the base form; features are ordered local operations (bevel, inset, extrude, boolean, subdivision, mirror...). Keep the base declarative and put local shape intent into features with stable ids.
- **forms.** box{size}, cylinder{radius,depth}, sphere{radius}, torus{majorRadius,minorRadius}, mesh{vertices,faces}, loft{sections}, extrude{profile,depth}, curve{points}, controlGrid (m.surface), sweep, copy, attachment, region, pathArray. mesh uses flat XYZ plus polygon index faces, not one face per nine numbers.
- **ids.** .key(id) or object id is the semantic identity used by inspect/edit/select. Keep ids unique in the asset; module-local ids are resolved in the module source. Feature ids are stable within a source.
- **metadata.** Asset/module/part metadata is declaration, not evaluated geometry. Read exact source/inspect receipts.
- **appendVsUpsert.** program mode append adds/creates; upsert replaces the declared source/features for the same ID, keeps undeclared local features, rejects duplicate new IDs and generated/local feature-id collisions, and does not delete other IDs. transformPolicy auto|preserve|reset decides TRS when a source/axis changes.
- **version.** API3 (apiVersion:3) is current. apiVersion 1/2 keeps old native-program material/helper semantics (box/scene forms); it is not the independent old modeler_script DSL.

## Shortest meaningful loop

1. **Read the guard and choose one representation.**
   - Call: `{"tool":"modeler_workbench","args":{"action":"status"}}`
   - Note: Simple forms use create. Multi-part or relationship-heavy declarations use program. Existing old scripts stay on the legacy route.
2. **Create a source with features and a stable id.**
   - Call: `{"tool":"modeler_geometry","args":{"op":"create","id":"panel","source":{"type":"box","size":[1,0.12,0.6]},"features":[{"id":"round","type":"bevel","width":0.015,"segments":3,"selection":{"domain":"edges"}}],"position":[0,0.06,0],"expectedHash":"<contentHash>"}}`
   - Expect: The committed source, feature list, topologyStamp/counts and local feedback; or a validation error before commit.
3. **Or declare several parts in one replayable program.**
   - Call: `{"tool":"modeler_geometry","args":{"op":"program","mode":"append","apiVersion":3,"expectedHash":"<contentHash>","code":"const post=m.cylinder({radius:.06,depth:.8,segments:32}).key('post').at(0,.4,0);return m.scene('Post',[post]);"}}`
   - Expect: nativeProgram saved on the asset plus committed source nodes; append never deletes unrelated sources.
4. **Address a local area by predicate, not by guessed indices.**
   - Call: `{"tool":"modeler_geometry","args":{"op":"feature","id":"panel","expectedHash":"<contentHash>","selection":{"domain":"faces","where":{"normal":{"direction":[0,0,1],"minDot":0.99}}},"feature":{"id":"inset","type":"inset","thickness":0.02,"depth":-0.01}}}`
   - Note: Save a named selection when reusing it. Explicit ids require the topologyStamp returned by the query; predicates can be re-resolved after a rebuild.
5. **Verify the exact claim.**
   - Call: `{"tool":"modeler_geometry","args":{"op":"inspect","id":"panel","parameter":"features"}}`
   - Expect: Inspect ids/topologyStamp/counts. For shape/part boundaries capture displayMode:"outline"; for triangulation use "surface_wireframe"; for optics use "normal". Choose the mode for the question, not all three.

## Minimal example

**Goal:** A reusable source + feature declaration.

```js
const plate=m.box([1,.12,.6]).key('panel').at(0,.06,0);plate.feature('bevel',{id:'round',width:.015,segments:3,selection:{domain:'edges'}});return m.scene('Panel',[plate]);
```

Use this shape with modeler_geometry {op:"program",apiVersion:3,...}; the same source/feature data is valid on create. Do not use it in modeler_workbench script.

## Side effects

- create, program, feature, update, remove_feature and rebuild commit atomically with the current guard and return a new revision/contentHash.
- program stores the native program for replay; append/upsert semantics determine which other sources are left alone.
- Large operations may return a native job; poll job/cancel rather than assuming completion.

## Result and evidence

- Receipt: changed source ids, feature ids, topologyStamp, counts, relation checks, local selection/feedback and warnings.
- inspect: exact source/features and parameter paths; bounded by offset/count for arrays.
- Validation/relation failures are explicit and do not commit; a committed edit can still have unknown visual quality.

## Recovery

- **duplicate object or feature id** — Rename the new id; upsert does not silently merge conflicting declarations.
- **native_source_required** — The target is a legacy evaluated object; use adopt for an explicit conversion or create a new native source.
- **transform policy needed** — Choose auto, preserve or reset explicitly when replacing vertices/type/axis with existing non-unit TRS.
- **selection/topology rejected** — Re-query the selection and topologyStamp; do not reuse old explicit ids.

## Exact contracts

- **API3 source, feature and selection fields:** `{"tool":"modeler_geometry","args":{"op":"help","topic":"construct"}}`
- **Backend source/feature/query capabilities:** `{"tool":"modeler_geometry","args":{"op":"capabilities"}}`
- **Transform and upsert policy:** `{"tool":"modeler_geometry","args":{"op":"help","topic":"transforms"}}`
- **Mesh format and orientation:** `{"tool":"modeler_geometry","args":{"op":"help","topic":"mesh"}}`

## Next

- `{"tool":"modeler_workbench","args":{"action":"guide","args":{"id":"assembly"}}}`

