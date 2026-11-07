# DSH Modeler agent guide

> Generated from `lib/guide-system.js`; do not hand-edit. Runtime source of truth:
> `{"tool":"modeler_workbench","args":{"action":"guide","args":{"id":"main"}}}`.
> Call descriptors shaped {tool,args} mean: invoke that tool with args. Do not pass the tool field as a tool argument.

## Purpose

Model a persistent, versioned 3D asset: establish what you are editing, ask evidence-driven questions, change the smallest suitable representation, then verify or deliver the exact version.

## Mental model

- **identity.** assetId + revision + contentHash identify one version. Writes take expectedRevision or expectedHash (and normally assetId) and return a new revision/contentHash. A mismatch is a conflict: re-read and rebuild the call, never retry the old guard blindly.
- **structure.** A document holds semantic parts with stable IDs, optional modules/groups, source declarations, ordered features, named selections, local overrides and materials. Read exact IDs and parameters; never guess them.
- **representations.** Source/features/overrides are author data; evaluated geometry is the computed mesh/topology; a rendered PNG is a camera-bound observation; display/material caches are derived. These layers do not substitute for one another.
- **editing.** Choose the smallest suitable representation for the task (a parameter, feature, saved selection, source patch or regeneration); that order is a decision, not a compulsory ladder. Trials and candidates are optional and never commit by themselves.
- **evidence.** Measure dimensions/contact; capture outline for shape/parts, surface_wireframe for triangulation, normal for materials. Images are camera-bound; declarations need checking, and unknown is a result.
- **optionality.** Plan, trial, role checks, material review and aesthetic acceptance are optional. No sample asset or mandatory design/review stage is required; the author owns visual judgment.

## Entry

- **Why.** Start by establishing the working asset and its exact guards. No sample asset is required; create or fork only when the task calls for it.
- **Call.** `{"tool":"modeler_workbench","args":{"action":"guide","args":{"id":"resources"}}}`

## Guide directory

| id | When to use | One call |
|---|---|---|
| resources | Establish or switch the working asset, read version guards, browse or fork without accidental overwrite. | `{"tool":"modeler_workbench","args":{"action":"guide","args":{"id":"resources"}}}` |
| explore | Answer a specific geometry, contact, orientation or appearance question with read-only evidence. | `{"tool":"modeler_workbench","args":{"action":"guide","args":{"id":"explore"}}}` |
| construct | Create persistent API3 sources and ordered features with stable semantic IDs. | `{"tool":"modeler_workbench","args":{"action":"guide","args":{"id":"construct"}}}` |
| assembly | Organize modules, declare interfaces/relations and separate contact intent from measured touching or overlap. | `{"tool":"modeler_workbench","args":{"action":"guide","args":{"id":"assembly"}}}` |
| edit | Change parameters, features, selections or source at the smallest suitable representation. | `{"tool":"modeler_workbench","args":{"action":"guide","args":{"id":"edit"}}}` |
| materials | Declare uniform PBR or spatial material intent and rely on automatic display preparation. | `{"tool":"modeler_workbench","args":{"action":"guide","args":{"id":"materials"}}}` |
| delivery | Export the exact current version as a versioned delivery ticket for a consumer import. | `{"tool":"modeler_workbench","args":{"action":"guide","args":{"id":"delivery"}}}` |
| legacy | Read or edit an existing independent old modeler_script DSL asset without mixing it with API3. | `{"tool":"modeler_workbench","args":{"action":"guide","args":{"id":"legacy"}}}` |

Markdown copies: [resources](guides/resources.md), [explore](guides/explore.md), [construct](guides/construct.md), [assembly](guides/assembly.md), [edit](guides/edit.md), [materials](guides/materials.md), [delivery](guides/delivery.md), [legacy](guides/legacy.md)

## Current capabilities

- modeler_geometry: persistent API3 sources, features, program, selections, interfaces, relations, orientation, pick and native jobs.
- modeler_workbench: resource identity/binding, history, legacy script, trials, assembly checks and versioned delivery.
- modeler_capture + read_image: real Three PNG observations, displayMode normal|surface_wireframe|outline; modeler_views/preview: quick character diagnostics, not material proof.
- modeler_inspect: semantic parts and recipe parameters; modeler_probe: component/bounds findings. modeler_material: material source, recipes, author/preview, delivery/fidelity diagnostics.

## Exact contracts

- **Geometry quickstart (help start = construct guide + start, not full syntax; query m.box for exact fields):** `{"tool":"modeler_geometry","args":{"op":"help","topic":"start"}}`
- **Backend source/feature/selection capabilities (may start the backend):** `{"tool":"modeler_geometry","args":{"op":"capabilities"}}`
- **Exact API3 source/feature fields:** `{"tool":"modeler_geometry","args":{"op":"help","topic":"construct"}}`
- **Action contracts by name:** `{"tool":"modeler_workbench","args":{"action":"help","args":{"topic":"actions","query":"edit"}}}`
- **Material guide + operations contract:** `{"tool":"modeler_material","args":{"op":"help"}}`
- **Independent legacy modeler_script DSL help:** `{"tool":"modeler_workbench","args":{"action":"help","args":{"topic":"legacy_api","query":"m.box"}}}`

## Next

- `{"tool":"modeler_workbench","args":{"action":"guide","args":{"id":"resources"}}}`

