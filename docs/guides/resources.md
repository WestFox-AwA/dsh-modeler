# Resources, binding and write guards

> Generated from `src/host/guide-system.js`; do not hand-edit. Runtime source of truth:
> `{"tool":"modeler_workbench","args":{"action":"guide","args":{"id":"resources"}}}`.
> Call descriptors shaped {tool,args} mean: invoke that tool with args. Do not pass the tool field as a tool argument.

## Purpose

Establish which persistent asset you are reading or writing, keep the exact version guards, and switch or copy assets only through explicit side effects.

## When to use

- Starting or resuming a chat session before reading or writing the asset.
- You do not yet know the current assetId, revision or contentHash.
- You need to inspect another asset, create a variant, or continue from an earlier version.

## Key facts

- **identity.** assetId names the resource; revision is monotonic; contentHash fixes the exact content version. Write receipts return the new identity. The version is the guard, not the title. An unbound session reports bound:false with a null identity; that is not an asset to edit.
- **binding.** Each chat session is bound to one working asset. Writes target that binding; passing assetId pins the expected binding and stale values fail with binding_conflict or conflict.
- **browse.** A panel view can browse another asset read-only under a viewId. Model callers normally list with projects and then open or fork. Writes while browsing fail with browsing_readonly; adopt_browse is the explicit conversion.
- **guards.** Writes require expectedRevision or expectedHash; a missing guard fails with missing_base. After any switch or conflict, re-read status and rebuild the call from fresh values.
- **storage.** Asset identity is stable; edits commit atomically as new versions; bindings switch only through open/new/fork. Releases are immutable packages: do not edit internal files or another session's binding directly. History retention is bounded (currently 40 entries), so do not promise arbitrary old versions.

## Shortest meaningful loop

1. **Read the current identity and guards.**
   - Call: `{"tool":"modeler_workbench","args":{"action":"status"}}`
   - Expect: assetId, revision, contentHash and title, or bound:false with a null identity. Use these exact values in the next write; an unbound result needs new/open/fork first.
2. **Find candidates without changing the working target.**
   - Call: `{"tool":"modeler_workbench","args":{"action":"projects","args":{"query":"","offset":0,"limit":20}}}`
   - Expect: A bounded list; continue with nextOffset only when needed.
3. **Choose an explicit switch or copy.**
   - Call: `{"tool":"modeler_workbench","args":{"action":"new","args":{"title":"New asset"}}}`
   - Note: new creates and binds a new asset. fork {assetId,title} copies that exact source version into a new asset and binds it; the source is untouched. open {assetId} or {project} binds an existing resource. Each changes only this session's working target.
4. **Pin a write to the working asset and version.**
   - Call: `{"tool":"modeler_workbench","args":{"action":"edit","args":{"assetId":"<assetId>","expectedHash":"<contentHash>","operations":[{"op":"parameters","id":"<id>","params":{"w":1.2}}]}}}`
   - Expect: A new revision/contentHash, or missing_base, conflict or binding_conflict.
5. **Recover from a guard failure.**
   - Call: `{"tool":"modeler_workbench","args":{"action":"status"}}`
   - Note: Re-read, confirm the asset, then re-apply the intended change to the new version. Old candidate ids stay bound to their old baseline.

## Minimal example

**Goal:** Fork the current asset to explore a variant without touching it.

Call: `{"tool":"modeler_workbench","args":{"action":"fork","args":{"assetId":"<current assetId>","title":"Variant A"}}}`

Use the returned assetId/revision/contentHash for the first write on the copy.

## Side effects

- status is read-only and does not create or bind an asset; it may return bound:false. projects is read-only. Other scoped calls may lazily create an empty asset for an unbound session, so bind explicitly with new/open/fork when the target matters.
- new creates and binds a new asset; fork copies the exact source version and binds the copy; open binds an existing resource, or creates one from a legacy .js project name. None rewrites the source asset.
- browse, follow_work and adopt_browse change a panel view; only adopt_browse changes the working target.
- An accepted write appends history and increments revision; old versions are not overwritten in place.

## Result and evidence

- status: assetId, revision, contentHash, title, project and client state.
- new/fork: resourceCreated:true plus the new identity; fork retains origin {type:"fork",assetId,revision,hash}.
- open/browse: current binding plus, for a view, mode work|browse and canEdit.

## Recovery

- **bound:false or null identity** — Choose new, open or fork deliberately; do not write against an unbound session.
- **conflict or binding_conflict** — Re-read status, confirm the asset, then re-apply the smallest intended change with fresh guards.
- **browsing_readonly** — Use adopt_browse explicitly, or fork/new, then edit the working resource.
- **unknown project or asset** — Search projects by title or ID; never guess an assetId or reuse another session's value.

## Exact contracts

- **Resource action fields and guards:** `{"tool":"modeler_workbench","args":{"action":"help","args":{"topic":"actions","query":"new"}}}`
- **Current identity:** `{"tool":"modeler_workbench","args":{"action":"status"}}`

## Next

- `{"tool":"modeler_workbench","args":{"action":"guide","args":{"id":"explore"}}}`

