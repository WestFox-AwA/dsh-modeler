# Versioned delivery to a consumer

> Generated from `src/host/guide-system.js`; do not hand-edit. Runtime source of truth:
> `{"tool":"modeler_workbench","args":{"action":"guide","args":{"id":"delivery"}}}`.
> Call descriptors shaped {tool,args} mean: invoke that tool with args. Do not pass the tool field as a tool argument.

## Purpose

Hand the exact current version to a consumer as a bounded, versioned delivery package with a digest, without changing the asset or inventing a consumer-specific path.

## When to use

- The model is ready to import into a consumer such as dsh-godot-master.
- You need a reproducible artifact tied to one assetId/revision/contentHash.
- A consumer asks for a delivery package or digest rather than the live asset.

## Key facts

- **exactVersion.** delivery requires assetId and expectedHash (64 lowercase sha256); expectedRevision is optional. It packs the exact current version and rejects a binding or version mismatch instead of exporting a nearby version.
- **ticket.** The tool result is only a bounded ticket: schema, schemaVersion, digest, bytes, path plus node/leaf/image/triangle counts. The package can be large, so it is not returned in the context.
- **storage.** Packages live under ~/.dsh/modeler-deliveries/ with digest/versioned names. Publishing is temporary-file + rename; bounded cleanup only touches files matching the delivery pattern and schema marker.
- **scope.** The package carries constant PBR plus explicit baked UV image channels and a limitations/fidelity statement. Procedural/surface/detail, transmission/volume, non-UV projection and unsupported channel shapes are refused explicitly, never downgraded.
- **consumer.** The consumer verifies schema/schemaVersion, digest, source identity and its own import budget. Import details belong to that consumer's contract; do not invent a Godot API or path from this guide.

## Shortest meaningful loop

1. **Freeze the exact version.**
   - Call: `{"tool":"modeler_workbench","args":{"action":"status"}}`
   - Expect: The current assetId, revision and 64-character contentHash. Ensure no edit is in flight.
2. **Request the delivery ticket.**
   - Call: `{"tool":"modeler_workbench","args":{"action":"delivery","args":{"assetId":"<assetId>","expectedHash":"<contentHash>"}}}`
   - Expect: delivery.schema, schemaVersion, digest, bytes, path and counts; the asset revision/contentHash must be unchanged.
3. **Check the package boundary before handing it over.**
   - Note: Read delivery.materialScope and limitations in the ticket. If a material was refused, inspect the actual source and choose a supported representation; do not ask the consumer to ignore the limitation.
4. **Hand over identity plus ticket, not a guessed path.**
   - Note: Consumer input is the returned delivery path/digest together with assetId/revision/contentHash. It revalidates the package; this call does not prove visual fidelity.
5. **If the source changed, restart from step 1.**
   - Call: `{"tool":"modeler_workbench","args":{"action":"status"}}`
   - Expect: A different contentHash means a new delivery; an old package remains a valid artifact of the old version.

## Minimal example

**Goal:** Deliver exactly the current version.

Call: `{"tool":"modeler_workbench","args":{"action":"delivery","args":{"assetId":"<assetId>","expectedHash":"<64-char contentHash>","expectedRevision":7}}}`

Only assetId, expectedHash and expectedRevision are accepted. Other fields are rejected as invalid_argument.

## Side effects

- Read-only for the asset: no revision/contentHash change and no history write.
- Writes a package file and may clean older matching packages; it does not touch unrelated files or the resource store.
- A version/binding conflict returns an error; it never exports the current asset under the requested old identity.

## Result and evidence

- Ticket: schema dsh-modeler.delivery, schemaVersion, digest, bytes, path, nodes/leaves/images/triangles and materialScope.
- Package source identity and digest fix the delivered version; the consumer must verify both plus schemaVersion.
- limitations.fidelity states the supported scope; unsupported material fields are explicit errors, not omitted silently.

## Recovery

- **conflict or binding_conflict** — Re-read status and request delivery for the actual current asset/version.
- **MODELER_MATERIAL_UNSUPPORTED** — Change the material to supported constant PBR or explicit baked UV channels, or report that this asset is outside the delivery scope.
- **budget error (MODELER_BUDGET / texture budget)** — Reduce triangles/images or split the asset; do not truncate silently.
- **consumer rejects schema/digest** — Regenerate from the exact version and let the consumer validate; do not edit the package by hand.

## Exact contracts

- **Delivery package schema and limits:** `{"tool":"modeler_workbench","args":{"action":"help","args":{"topic":"actions","query":"delivery"}}}`
- **Material delivery/fidelity diagnostics (different from asset delivery):** `{"tool":"modeler_material","args":{"op":"help","topic":"delivery"}}`

## Next

- `{"tool":"modeler_workbench","args":{"action":"guide","args":{"id":"legacy"}}}`

