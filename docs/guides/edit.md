# Local editing, selections and candidates

> Generated from `src/host/guide-system.js`; do not hand-edit. Runtime source of truth:
> `{"tool":"modeler_workbench","args":{"action":"guide","args":{"id":"edit"}}}`.
> Call descriptors shaped {tool,args} mean: invoke that tool with args. Do not pass the tool field as a tool argument.

## Purpose

Change a persisted asset at the smallest suitable representation with exact ids and current guards, and keep candidate trials separate from committed versions.

## When to use

- A parameter, transform, material, visibility or feature needs a local change.
- A source or feature stack needs a controlled replacement rather than a full rebuild.
- You want to compare a candidate without committing it.

## Key facts

- **smallest.** Prefer parameters, then feature parameters, then a named selection, then a source patch, then full regeneration. A local change should preserve unrelated ids, materials, UVs and overrides.
- **selections.** Predicates resolve against current geometry; explicit ids must carry the topologyStamp returned by the query. Named selections are version-bound and reject when their target no longer exists. A rebuild can re-resolve predicates but cannot promise old explicit ids.
- **candidates.** trial stages operations or legacy/module code/sourceId and returns a candidate id/hash with changedCurrentAsset:false. accept_trial commits only when the baseline still matches; discard_trial releases it. trial_observe/trial_diagnose read that candidate, not the working version.
- **source.** source/save_source/patch_source/validate stage or read source without committing. script commits legacy code; API3 native source changes use geometry create/program/feature/update. rebase:true preserves replayable local overrides; discardOverrides:true is explicit.
- **guards.** Every commit needs expectedRevision or expectedHash and should include assetId. A conflict or stale candidate means re-read and restage; never force an old candidate onto a new baseline.

## Shortest meaningful loop

1. **Read the exact part, parameter or feature.**
   - Call: `{"tool":"modeler_inspect","args":{"id":"<id>"}}`
   - Expect: id, parents, recipe/params, transforms and material. Use modeler_workbench inspect {parameter,offset,count} for arrays and {mesh:true} for base topology.
2. **Choose the smallest write representation.**
   - Call: `{"tool":"modeler_workbench","args":{"action":"edit","args":{"assetId":"<assetId>","expectedHash":"<contentHash>","operations":[{"op":"parameters","id":"<id>","params":{"w":1.2}}]}}}`
   - Note: edit supports parameters/transform/material/modifiers/visibility/mesh_move/mesh_extrude and assembly operations. API3 feature changes use modeler_geometry feature/update/remove_feature.
3. **Or stage a candidate before committing.**
   - Call: `{"tool":"modeler_workbench","args":{"action":"trial","args":{"assetId":"<assetId>","expectedHash":"<contentHash>","operations":[{"op":"parameters","id":"<id>","params":{"w":1.2}}],"observe":{"view":"iso","mode":"clay","width":720,"height":480}}}}`
   - Expect: candidateHash/id, changedCurrentAsset:false, optional before/after images. Accept only the exact candidate you inspected.
4. **Use a feature with a stable selection.**
   - Call: `{"tool":"modeler_geometry","args":{"op":"feature","id":"panel","expectedHash":"<contentHash>","selectionId":"front","feature":{"id":"recess","type":"inset","thickness":0.02,"depth":-0.01}}}`
   - Note: Create the named selection first: modeler_geometry {op:"save_selection",id:"panel",name:"front",selection:{domain:"faces",where:{normal:{direction:[0,0,1],minDot:.99}}},expectedHash:"<contentHash>"}. update changes one feature params patch; remove_feature deletes it; explicit ids need topologyStamp.
5. **Commit or discard the candidate.**
   - Call: `{"tool":"modeler_workbench","args":{"action":"accept_trial","args":{"assetId":"<assetId>","expectedHash":"<contentHash>","id":"<candidate id>"}}}`
   - Expect: New revision/contentHash and acceptedCandidateHash; a changed baseline rejects with stale_trial. Use discard_trial to free a candidate without changing the asset.
6. **Re-observe only the claim you changed.**
   - Call: `{"tool":"modeler_workbench","args":{"action":"inspect","args":{"id":"<id>"}}}`
   - Note: Then one targeted diagnose or capture at the same camera/mode. Do not infer success from a receipt alone.

## Minimal example

**Goal:** One atomic local parameter edit.

Call: `{"tool":"modeler_workbench","args":{"action":"edit","args":{"assetId":"<assetId>","expectedHash":"<contentHash>","operations":[{"op":"parameters","id":"body.shell","params":{"w":1.5}}],"label":"widen shell"}}}`

Params deep-merge; arrays are replaced. Read the field names from inspect before writing.

## Side effects

- edit/feature/update/remove_feature/program commit and append history; receipts carry the new revision/contentHash and delta.
- trial/save_source/patch_source/validate do not change the working asset; source ids are immutable references to staged code.
- accept_trial commits the candidate exactly; discard_trial only releases it. Candidates are asset- and baseline-bound.
- script can replay overrides; rebase:true preserves them and discardOverrides:true drops them explicitly. Neither silently ignores a conflict.

## Result and evidence

- Commit receipt: revision/contentHash, changed ids, delta, organization, assembly feedback, material delivery summary and local feedback.
- Trial: candidateHash/id, base identity, comparison (sameCamera), diagnostics before/after, changedCurrentAsset:false.
- Validation: valid, error with available line, committable and changedCurrentAsset:false.
- Selection: domain, ids, topologyStamp, overlay coverage; saved selections re-resolve and fail closed.

## Recovery

- **conflict or missing_base** — Re-read status/inspect, confirm the target, restage the intended change against the new hash.
- **stale_trial** — Discard the old candidate and restage on the current baseline; do not accept across versions.
- **TOPOLOGY_STAMP_REQUIRED or selection not found** — Re-run select and read the current topologyStamp; use a predicate or named selection when the rebuild preserves geometry meaning.
- **invalid source or overrides** — Read validation.error, fix the source, and choose rebase:true or discardOverrides:true explicitly.

## Exact contracts

- **Edit operations and fields:** `{"tool":"modeler_workbench","args":{"action":"help","args":{"topic":"actions","query":"edit"}}}`
- **Trial/accept/discard fields:** `{"tool":"modeler_workbench","args":{"action":"help","args":{"topic":"actions","query":"trial"}}}`
- **Native selection and feature fields:** `{"tool":"modeler_geometry","args":{"op":"help","topic":"select"}}`
- **Source staging and commit:** `{"tool":"modeler_workbench","args":{"action":"help","args":{"topic":"source"}}}`

## Next

- `{"tool":"modeler_workbench","args":{"action":"guide","args":{"id":"materials"}}}`

