# Assembly, interfaces, relations and contact intent

> Generated from `lib/guide-system.js`; do not hand-edit. Runtime source of truth:
> `{"tool":"modeler_workbench","args":{"action":"guide","args":{"id":"assembly"}}}`.
> Call descriptors shaped {tool,args} mean: invoke that tool with args. Do not pass the tool field as a tool argument.

## Purpose

Organize parts into modules, declare actual interfaces and spatial constraints, and keep declared contact meaning separate from measured touching or overlap.

## When to use

- More than one part must share a persistent position, interface or module responsibility.
- You need to state whether parts are separate, touching, intentionally embedded, surface-following or solid-combined.
- A claim such as "these are joined" needs an actual interface, relation or measurement.

## Key facts

- **intentVsMeasurement.** contact_intent records author meaning. separate/touch receive a basic gap/conflict check and solidCombine checks conflicts; intentionalEmbed and surfaceRelief are declarations, not automatic proof. Actual touching/overlap needs diagnose pair or assembly_check.
- **interfaces.** A named interface (cylinderEnd, boundsFace, frame, selection) is a stable local feature. attach uses sourceInterface/targetInterface and persists the dependency; it does not weld geometry.
- **relations.** relation declares join, coaxial, outside, nonIntersection, gap, halfspace, wallThickness or envelope. Checks run during writes; conflict or unknown rejects the commit. Declarations never pass automatically.
- **globalVsModule.** Module source is module-local and replaces one compound subtree (frameMode preserve|source). Interfaces and world relations are evaluated in world space; group/module TRS still composes.
- **touching.** AABB overlap is a candidate, not penetration. Surface distance is not signed contact. assembly_check rechecks changed leaves (including transparent/same-module); hidden objects are excluded and open shells may remain unknown.

## Shortest meaningful loop

1. **Read the actual hierarchy and ids.**
   - Call: `{"tool":"modeler_workbench","args":{"action":"tree","args":{"depth":2,"offset":0,"limit":24}}}`
   - Expect: Modules/groups, exact child ids, local frames and dependencies. Do not infer ids from display names.
2. **Organize only when responsibility is clear.**
   - Call: `{"tool":"modeler_workbench","args":{"action":"edit","args":{"expectedHash":"<contentHash>","operations":[{"op":"group","id":"support","ids":["rail","bracket"],"keepWorld":true}]}}}`
   - Note: group/ungroup/reparent/pivot keep world transforms where representable. module attaches role/description/controls/interfaces; set_control later edits declared child parameters.
3. **Declare a real interface and attach through it.**
   - Call: `{"tool":"modeler_geometry","args":{"op":"save_interface","id":"tube","name":"end","interface":{"type":"cylinderEnd","end":"positive"},"expectedHash":"<contentHash>"}}`
   - Expect: Named interface on the object. Then modeler_geometry {op:"attach",id:"next",sourceInterface:"back",target:"tube",targetInterface:"end",offset:0,expectedHash:"<contentHash>"} commits the persistent placement.
4. **State contact meaning separately from the measurement.**
   - Call: `{"tool":"modeler_workbench","args":{"action":"contact_intent","args":{"a":"<a>","b":"<b>","type":"separate","minGap":0.01,"note":"service clearance","expectedHash":"<contentHash>"}}}`
   - Expect: contactIntents saved in meta; this does not move or merge either part.
5. **Measure the actual contact or overlap.**
   - Call: `{"tool":"modeler_workbench","args":{"action":"assembly_check","args":{"id":"<changed id>"}}}`
   - Expect: status clear|attention|partial, candidate pairs, classification, solidOverlap, witness and complete. For a specific pair use diagnose {query:"pair",id,other}.
6. **Use a declared relation when the constraint must persist.**
   - Call: `{"tool":"modeler_geometry","args":{"op":"relation","expectedHash":"<contentHash>","relation":{"id":"clearance","type":"gap","source":"<a>","target":"<b>","minimum":0.01}}}`
   - Note: Read with op:"relations"; remove with op:"remove_relation". A conflict/unknown rejects the write with the conflicting object and position.

## Minimal example

**Goal:** Intent and measurement are two calls, not one.

Call: `{"tool":"modeler_workbench","args":{"action":"contact_intent","args":{"a":"fixture","b":"cover","type":"separate","minGap":0.01,"note":"cover must clear the fixture","expectedHash":"<contentHash>"}}}`

Then assembly_check/diagnose pair. A clear intent does not prove the gap; a measured overlap does not decide whether the design should embed parts.

## Side effects

- group/ungroup/reparent/pivot/module and module replacement commit; keepWorld refuses rather than approximating shear.
- save_interface/attach/relation/contact_intent commit metadata or placement and need the current guard.
- assembly_check, tree, diagnose, interfaces and relations reads do not change the asset.
- solid_combine stages a real boolean candidate; accept_trial commits it, discard_trial leaves the asset unchanged.

## Result and evidence

- assembly_check: status, complete, changed leaves, candidate pairs, classification, intentViolation, witness and unknownReasons.
- relation checks: pass/fail/unknown with declared scope and witnesses; unknown is not a pass.
- interfaces: named definition plus placement; attach receipt shows the persistent dependency.
- check_roles: explicit path/symmetry evidence with coverage and witnesses; names alone do not imply left/right or outside.

## Recovery

- **unknown/partial contact** — Narrow to one pair or raise the explicit query budget; report open shells/budget as unknown instead of claiming clearance.
- **relation_conflict** — Adjust the design or the declaration; do not delete the relation merely to force a commit.
- **ambiguous_placement** — Clear the existing face/native placement before attaching an interface, or keep one placement only.
- **module source mismatch** — Read module_source, keep one compound root keyed by moduleId, then trial and accept; preserve the original frame unless source is explicit.

## Exact contracts

- **Assembly operation fields:** `{"tool":"modeler_workbench","args":{"action":"help","args":{"topic":"actions","query":"assembly"}}}`
- **Interface/attach/relation fields:** `{"tool":"modeler_geometry","args":{"op":"help","topic":"relations"}}`
- **Contact intent and assembly check fields:** `{"tool":"modeler_workbench","args":{"action":"help","args":{"topic":"actions","query":"contact_intent"}}}`
- **Module source route:** `{"tool":"modeler_workbench","args":{"action":"help","args":{"topic":"actions","query":"module_source"}}}`

## Next

- `{"tool":"modeler_workbench","args":{"action":"guide","args":{"id":"edit"}}}`

