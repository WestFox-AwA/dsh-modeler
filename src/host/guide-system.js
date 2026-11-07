// Agent-facing, layered guide system for DSH Modeler.
//
// This module is a pure, data-only reader. It does not read the filesystem,
// resources, assets, the native backend or any service. Every call returns a
// fresh deep copy. Exact parameter contracts stay in the existing help/action
// sources; these guides only teach the mental model, workflows, evidence and
// recovery decisions that connect those contracts.
//
// Docs under docs/AGENT-GUIDE.md and docs/guides/*.md are rendered from the same
// data by renderGuideMarkdown(). Do not maintain a second rulebook.

const SCHEMA = 'dsh-modeler.guide';
const SCHEMA_VERSION = 1;
const MAX_ECHO_ID = 80;
const CALL_CONVENTION = 'Call descriptors shaped {tool,args} mean: invoke that tool with args. Do not pass the tool field as a tool argument.';

export const MODELER_GUIDE_IDS = Object.freeze([
  'main',
  'resources',
  'explore',
  'construct',
  'assembly',
  'edit',
  'materials',
  'delivery',
  'legacy',
]);

// Brief EN onboarding pointer + essentials, suitable for a tool/prompt section.
// It deliberately does not duplicate parameter schemas; those stay in help.
export const MODELER_GUIDE_PROMPT =
  'Modeler: read main via modeler_workbench {action:"guide",args:{id:"main"}}, then one relevant subject. Keep assetId/contentHash and exact help contracts. Choose capture purpose by question: shape→outline, topology→surface_wireframe, appearance→normal; an explicit displayMode overrides it; no mandatory triple capture. Use measurements for geometry, images for visible appearance, declarations as intent. Uniform BRDF is intentionally uniform; spatial .mat/.finish and library authoring share automatic display preparation, no extra bake or mandatory role/review. No sample asset is required.';

const clone = (value) => JSON.parse(JSON.stringify(value));

const call = (tool, args) => ({ tool, args });

const statusCall = () => call('modeler_workbench', { action: 'status' });
const guideCall = (id) => call('modeler_workbench', { action: 'guide', args: { id } });

// One-line directory entries used by main and by the bounded unknown-id reply.
const DIRECTORY_WHEN = Object.freeze({
  resources: 'Establish or switch the working asset, read version guards, browse or fork without accidental overwrite.',
  explore: 'Answer a specific geometry, contact, orientation or appearance question with read-only evidence.',
  construct: 'Create persistent API3 sources and ordered features with stable semantic IDs.',
  assembly: 'Organize modules, declare interfaces/relations and separate contact intent from measured touching or overlap.',
  edit: 'Change parameters, features, selections or source at the smallest suitable representation.',
  materials: 'Declare uniform PBR or spatial material intent and rely on automatic display preparation.',
  delivery: 'Export the exact current version as a versioned delivery ticket for a consumer import.',
  legacy: 'Read or edit an existing independent old modeler_script DSL asset without mixing it with API3.',
});

const MAIN = {
  kind: 'overview',
  title: 'DSH Modeler agent guide',
  purpose:
    'Model a persistent, versioned 3D asset: establish what you are editing, ask evidence-driven questions, change the smallest suitable representation, then verify or deliver the exact version.',
  mentalModel: {
    identity:
      'assetId + revision + contentHash identify one version. Writes take expectedRevision or expectedHash (and normally assetId) and return a new revision/contentHash. A mismatch is a conflict: re-read and rebuild the call, never retry the old guard blindly.',
    structure:
      'A document holds semantic parts with stable IDs, optional modules/groups, source declarations, ordered features, named selections, local overrides and materials. Read exact IDs and parameters; never guess them.',
    representations:
      'Source/features/overrides are author data; evaluated geometry is the computed mesh/topology; a rendered PNG is a camera-bound observation; display/material caches are derived. These layers do not substitute for one another.',
    editing:
      'Choose the smallest suitable representation for the task (a parameter, feature, saved selection, source patch or regeneration); that order is a decision, not a compulsory ladder. Trials and candidates are optional and never commit by themselves.',
    evidence:
      'Measure dimensions/contact; capture outline for shape/parts, surface_wireframe for triangulation, normal for materials. Images are camera-bound; declarations need checking, and unknown is a result.',
    optionality:
      'Plan, trial, role checks, material review and aesthetic acceptance are optional. No sample asset or mandatory design/review stage is required; the author owns visual judgment.',
  },
  entry: {
    call: guideCall('resources'),
    note: 'Start by establishing the working asset and its exact guards. No sample asset is required; create or fork only when the task calls for it.',
  },
  directory: MODELER_GUIDE_IDS.filter((id) => id !== 'main').map((id) => ({
    id,
    when: DIRECTORY_WHEN[id],
    call: guideCall(id),
  })),
  capabilities: [
    'modeler_geometry: persistent API3 sources, features, program, selections, interfaces, relations, orientation, pick and native jobs.',
    'modeler_workbench: resource identity/binding, history, legacy script, trials, assembly checks and versioned delivery.',
    'modeler_capture + read_image: real Three PNG observations, displayMode normal|surface_wireframe|outline; modeler_views/preview: quick character diagnostics, not material proof.',
    'modeler_inspect: semantic parts and recipe parameters; modeler_probe: component/bounds findings. modeler_material: material source, recipes, author/preview, delivery/fidelity diagnostics.',
  ],
  contracts: [
    {
      need: 'Geometry quickstart (help start = construct guide + start, not full syntax; query m.box for exact fields)',
      call: call('modeler_geometry', { op: 'help', topic: 'start' }),
    },
    {
      need: 'Backend source/feature/selection capabilities (may start the backend)',
      call: call('modeler_geometry', { op: 'capabilities' }),
    },
    {
      need: 'Exact API3 source/feature fields',
      call: call('modeler_geometry', { op: 'help', topic: 'construct' }),
    },
    {
      need: 'Action contracts by name',
      call: call('modeler_workbench', { action: 'help', args: { topic: 'actions', query: 'edit' } }),
    },
    {
      need: 'Material guide + operations contract',
      call: call('modeler_material', { op: 'help' }),
    },
    {
      need: 'Independent legacy modeler_script DSL help',
      call: call('modeler_workbench', { action: 'help', args: { topic: 'legacy_api', query: 'm.box' } }),
    },
  ],
  retrieval:
    'Every guide is one call: modeler_workbench {action:"guide",args:{id:"<id>"}}. The call/retrieval objects are {tool,args} descriptors: invoke that tool with args. An unknown id returns this bounded directory plus guideRef("main"); there is no pagination.',
  next: guideCall('resources'),
};

const RESOURCES = {
  kind: 'subject',
  title: 'Resources, binding and write guards',
  purpose:
    'Establish which persistent asset you are reading or writing, keep the exact version guards, and switch or copy assets only through explicit side effects.',
  when: [
    'Starting or resuming a chat session before reading or writing the asset.',
    'You do not yet know the current assetId, revision or contentHash.',
    'You need to inspect another asset, create a variant, or continue from an earlier version.',
  ],
  model: {
    identity:
      'assetId names the resource; revision is monotonic; contentHash fixes the exact content version. Write receipts return the new identity. The version is the guard, not the title. An unbound session reports bound:false with a null identity; that is not an asset to edit.',
    binding:
      'Each chat session is bound to one working asset. Writes target that binding; passing assetId pins the expected binding and stale values fail with binding_conflict or conflict.',
    browse:
      'A panel view can browse another asset read-only under a viewId. Model callers normally list with projects and then open or fork. Writes while browsing fail with browsing_readonly; adopt_browse is the explicit conversion.',
    guards:
      'Writes require expectedRevision or expectedHash; a missing guard fails with missing_base. After any switch or conflict, re-read status and rebuild the call from fresh values.',
    storage:
      'Asset identity is stable; edits commit atomically as new versions; bindings switch only through open/new/fork. Releases are immutable packages: do not edit internal files or another session\'s binding directly. History retention is bounded (currently 40 entries), so do not promise arbitrary old versions.',
  },
  loop: [
    {
      step: 1,
      goal: 'Read the current identity and guards.',
      call: statusCall(),
      expect: 'assetId, revision, contentHash and title, or bound:false with a null identity. Use these exact values in the next write; an unbound result needs new/open/fork first.',
    },
    {
      step: 2,
      goal: 'Find candidates without changing the working target.',
      call: call('modeler_workbench', { action: 'projects', args: { query: '', offset: 0, limit: 20 } }),
      expect: 'A bounded list; continue with nextOffset only when needed.',
    },
    {
      step: 3,
      goal: 'Choose an explicit switch or copy.',
      call: call('modeler_workbench', { action: 'new', args: { title: 'New asset' } }),
      note:
        'new creates and binds a new asset. fork {assetId,title} copies that exact source version into a new asset and binds it; the source is untouched. open {assetId} or {project} binds an existing resource. Each changes only this session\'s working target.',
    },
    {
      step: 4,
      goal: 'Pin a write to the working asset and version.',
      call: call('modeler_workbench', {
        action: 'edit',
        args: {
          assetId: '<assetId>',
          expectedHash: '<contentHash>',
          operations: [{ op: 'parameters', id: '<id>', params: { w: 1.2 } }],
        },
      }),
      expect: 'A new revision/contentHash, or missing_base, conflict or binding_conflict.',
    },
    {
      step: 5,
      goal: 'Recover from a guard failure.',
      call: statusCall(),
      note: 'Re-read, confirm the asset, then re-apply the intended change to the new version. Old candidate ids stay bound to their old baseline.',
    },
  ],
  example: {
    goal: 'Fork the current asset to explore a variant without touching it.',
    call: call('modeler_workbench', { action: 'fork', args: { assetId: '<current assetId>', title: 'Variant A' } }),
    note: 'Use the returned assetId/revision/contentHash for the first write on the copy.',
  },
  sideEffects: [
    'status is read-only and does not create or bind an asset; it may return bound:false. projects is read-only. Other scoped calls may lazily create an empty asset for an unbound session, so bind explicitly with new/open/fork when the target matters.',
    'new creates and binds a new asset; fork copies the exact source version and binds the copy; open binds an existing resource, or creates one from a legacy .js project name. None rewrites the source asset.',
    'browse, follow_work and adopt_browse change a panel view; only adopt_browse changes the working target.',
    'An accepted write appends history and increments revision; old versions are not overwritten in place.',
  ],
  evidence: [
    'status: assetId, revision, contentHash, title, project and client state.',
    'new/fork: resourceCreated:true plus the new identity; fork retains origin {type:"fork",assetId,revision,hash}.',
    'open/browse: current binding plus, for a view, mode work|browse and canEdit.',
  ],
  recovery: [
    { when: 'bound:false or null identity', action: 'Choose new, open or fork deliberately; do not write against an unbound session.' },
    { when: 'conflict or binding_conflict', action: 'Re-read status, confirm the asset, then re-apply the smallest intended change with fresh guards.' },
    { when: 'browsing_readonly', action: 'Use adopt_browse explicitly, or fork/new, then edit the working resource.' },
    { when: 'unknown project or asset', action: 'Search projects by title or ID; never guess an assetId or reuse another session\'s value.' },
  ],
  contracts: [
    { need: 'Resource action fields and guards', call: call('modeler_workbench', { action: 'help', args: { topic: 'actions', query: 'new' } }) },
    { need: 'Current identity', call: statusCall() },
  ],
  next: guideCall('explore'),
};

const EXPLORE = {
  kind: 'subject',
  title: 'Question-driven exploration and evidence',
  purpose:
    'Answer a specific question about the current asset with the smallest read-only evidence, then stop or choose one informative next observation.',
  when: [
    'Before editing, when the exact part, parameter, contact or orientation is still uncertain.',
    'After a change, to verify the exact question the change was meant to answer.',
    'When a visual impression and a numeric claim disagree.',
  ],
  model: {
    question:
      'Write the question so it can be false: "does rail A cross shell B?", "is this seam open?", "is this face outward?", "which parameter controls the width?". A vague "looks off" is not yet a check.',
    layers:
      'Source/parameters, evaluated geometry and rendered images answer different questions. Use measurements for numeric/contact claims and images for appearance, occlusion or material claims.',
    coverage:
      'diagnose, orientation, pick and probe report coverage, budgets and unknown reasons. complete:false or unknown is a real result, not a pass.',
    limits:
      'An AABB overlap is a candidate, not penetration. Surface distance is not signed contact. A PNG is camera-bound; captured:true is not reviewed:true or accepted.',
    menu:
      'The numbered loop below is an optional checks menu; pick only the evidence that answers the current question, and skip the rest.',
    exploration:
      'Choose the next observation from the unresolved part of the question. There is no video/trajectory API and no auto-explorer that picks questions for you.',
    displayModes:
      'mode is the existing channel diagnostic, not a display selector: material, clay, normal (existing MeshNormalMaterial diagnostic), final_normal, wire (legacy MeshStandardMaterial wireframe), id, zebra, orientation, roughness, metalness, albedo. displayMode is the separate display axis: normal means no display overlay and mode still selects the surface (default mode:material is PBR); surface_wireframe is a white clay model with a real depth-tested triangle-surface wireframe overlay; outline is white clay with visible semantic editableId boundaries and silhouettes from a depth-tested 3x3 screen-space ID composite (same source shares one color), plus optional hard crease edges. It is a mesh/source observation, not a CAD topology proof. Both new displayModes force no floor and a flat background; normal+material preserves an authored stage floor, otherwise shows the studio mirror by default.',
    lighting:
      'modeler_capture and the viewport accept one transient, camera-independent lighting object: key/fill/rim {color,intensity,position,shadows}, hemisphere {sky,ground,intensity}, environment {intensity}, shadows {enabled,mapSize,bias,normalBias}, floor {enabled,mirror,tint,shadow,size,position,roughness,metalness}, background and exposure. key/fill/rim position is a world-axis offset from the bounds centre/target, not an absolute world origin; floor.position is world coordinates. environment.intensity is an absolute override (0..10), not a multiplier; omitting it preserves the effective authored/default value. Merge order is studio defaults -> authored doc.meta.renderStage -> explicit transient lighting fields. Without explicit light/hemisphere, authored stage lights/background/exposure/shadows/floor persist; explicit light/hemisphere switches to observation defaults; explicit floor replaces the stage floor. Diagnostic displayModes force only floor off and a flat background; they keep the effective lights/shadows/exposure. Viewport lighting controls are temporary, usable while browsing, and Reset returns to the asset/default lighting; they never write the asset. Viewport/capture share linear HDR (studio-radiance-v3), PBR planar reflection and one final tone-map/sRGB conversion. Default ground covers the view without radial masks; explicit floor.size is finite. Omitted shadow normalBias scales with bounds; explicit values use world units. Camera receipts give actual clip planes. BRDF/normals stay authored; smoothing hard box edges can distort highlights. The receipt lists the effective lights and floor.',
  },
  loop: [
    {
      step: 1,
      goal: 'Name the question and the evidence that would answer it.',
      note: 'Pick one: identity/parameter, geometry measurement, contact/relation, orientation/topology, or appearance.',
    },
    {
      step: 2,
      goal: 'Read identity and structure before measuring.',
      call: call('modeler_workbench', { action: 'tree', args: { depth: 2, offset: 0, limit: 24 } }),
      expect: 'Exact IDs, parents and module/leaf roles. Then inspect the specific part and parameter.',
      note: 'Call modeler_inspect {id:"<id>"} for the part receipt, and modeler_workbench inspect {id:"<id>",parameter:"<field>",offset:0,count:8} for arrays or mesh:true for base topology.',
    },
    {
      step: 3,
      goal: 'Measure numeric or contact questions.',
      call: call('modeler_workbench', { action: 'diagnose', args: { query: 'pair', id: '<a>', other: '<b>' } }),
      expect: 'classification, minimum gap, solid overlap, coverage and unknown reasons. Use query:"part" for bounds/topology, "section" for a cut, "relations" for declared constraints, and query:"surface" with method ray/project/nearest for a measured surface hit.',
    },
    {
      step: 4,
      goal: 'Check orientation, topology identity or a picked face.',
      call: call('modeler_geometry', { op: 'orientation', id: '<id>', count: 8 }),
      note: 'orientation separates winding, geometric normals and shading normals. For a picked surface point/face call modeler_geometry {op:"pick",id:"<id>",origin:[0,2,0],direction:[0,-1,0]}; probe reports components/bounds without claiming components are semantic parts.',
    },
    {
      step: 5,
      goal: 'Observe only when the question is visual.',
      call: call('modeler_capture', {
        isolate: '<id>',
        context: ['<neighbor>'],
        views: ['iso'],
        mode: 'clay',
        displayMode: 'normal',
        width: 900,
        height: 700,
        expectedHash: '<contentHash>',
      }),
      expect: 'A PNG path plus assetId/revision/contentHash, camera, mode, displayMode and the transient lighting/observationStage receipt. Call read_image before drawing a conclusion.',
      note: 'For a cutaway, use capture section:{axis:"x"|"y"|"z",value:<coordinate>}; the section is part of image identity. Use displayMode:"surface_wireframe" for white clay plus a real triangle-surface wireframe, or displayMode:"outline" for visible semantic editableId boundaries/silhouettes from a depth-tested 3x3 ID composite plus optional hard crease edges; mesh triangles are not a CAD topology proof. For shape inspection outline/surface_wireframe is often clearer than colored PBR; a same-camera/lighting/hash three-mode comparison is optional, not a mandatory triple call per edit. Pass lighting:{...} for bounded transient lights/shadows/mirror-floor overrides; key/fill/rim.position is relative to the bounds centre, not an absolute origin. The exact field contract is the capture help entry.',
    },
    {
      step: 6,
      goal: 'Interpret and choose one next action.',
      note: 'If the question is answered, stop. If not, choose the smallest additional evidence (one pair, one section, one targeted view). Do not loop on captures; edit only when the evidence supports the intended change.',
    },
  ],
  example: {
    goal: 'Check whether two parts actually touch, keeping the assembly context.',
    call: call('modeler_workbench', { action: 'diagnose', args: { query: 'pair', id: '<a>', other: '<b>' } }),
    note: 'Read classification, minimumGap, solidOverlap and coverage. If the answer is still ambiguous, take one isolated clay/normal image with context, or one displayMode:"surface_wireframe"/"outline" image; outline is often clearest for shape. Same-camera/lighting/hash three-mode compare is optional, not mandatory per edit, and not a CAD topology proof.',
  },
  sideEffects: [
    'All exploration calls are read-only: no revision/contentHash change.',
    'capture writes evidence files and a receipt; it does not approve appearance. Transient lighting and displayMode never write doc.meta.renderStage or any asset field.',
    'trial_observe/trial_diagnose read a stored candidate; they do not commit it.',
  ],
  evidence: [
    'diagnose: coverage.complete, result, unknownReasons, editTargets and witness points; open shells, hidden objects and budgets can leave unknown.',
    'capture: evidence.path or captures[].path, version, camera, mode, displayMode, lighting, renderer and image hash; compare only at the same camera, size, mode, displayMode and lighting.',
    'preview/modeler_views: character diagnostics for shape/occlusion; they do not prove material appearance.',
    'assembly_check: candidate pairs, classification, witness, contact intent and complete; AABB candidates are not penetration.',
  ],
  recovery: [
    { when: 'unknown or incomplete coverage', action: 'Narrow the question to one id/pair/section, raise the explicit budget only if supported, or report the limit instead of asserting a pass.' },
    { when: 'stale image or changed version', action: 'Re-read the current contentHash and re-capture the same camera; an old PNG never proves a new version.' },
    { when: 'no renderer for the viewport source', action: 'Use the default isolated capture or modeler_views; viewport capture needs an online matching client.' },
  ],
  contracts: [
    { need: 'Diagnose query fields and limits', call: call('modeler_workbench', { action: 'help', args: { topic: 'actions', query: 'diagnose' } }) },
    { need: 'Capture camera/views/mode/displayMode/lighting fields and defaults', call: call('modeler_workbench', { action: 'help', args: { topic: 'actions', query: 'capture' } }) },
    { need: 'Orientation and topologyStamp', call: call('modeler_geometry', { op: 'help', topic: 'orientation' }) },
  ],
  next: guideCall('construct'),
};

const CONSTRUCT = {
  kind: 'subject',
  title: 'Construct persistent API3 geometry',
  purpose:
    'Declare persistent API3 geometry as a base source plus ordered features, with stable semantic IDs, so later edits remain local and replayable.',
  when: [
    'Creating a new native source or adding parts to an API3 asset.',
    'Choosing a base form (box, cylinder, mesh, loft, extrude, curve, surface, sweep) before detailing.',
    'Changing a source form or replaying a multi-part program.',
  ],
  model: {
    axes:
      'World is Y-up with the ground on XZ. API3 cylinder, torus and extrude default to the local Z construction axis; pass axis to change it. Lengths are metres and rotations are radians.',
    sourceVsFeatures:
      'source is the base form; features are ordered local operations (bevel, inset, extrude, boolean, subdivision, mirror...). Keep the base declarative and put local shape intent into features with stable ids.',
    forms:
      'box{size}, cylinder{radius,depth}, sphere{radius}, torus{majorRadius,minorRadius}, mesh{vertices,faces}, loft{sections}, extrude{profile,depth}, curve{points}, controlGrid (m.surface), sweep, copy, attachment, region, pathArray. mesh uses flat XYZ plus polygon index faces, not one face per nine numbers.',
    ids:
      '.key(id) or object id is the semantic identity used by inspect/edit/select. Keep ids unique in the asset; module-local ids are resolved in the module source. Feature ids are stable within a source.',
    metadata:
      'Asset/module/part metadata is declaration, not evaluated geometry. Read exact source/inspect receipts.',
    appendVsUpsert:
      'program mode append adds/creates; upsert replaces the declared source/features for the same ID, keeps undeclared local features, rejects duplicate new IDs and generated/local feature-id collisions, and does not delete other IDs. transformPolicy auto|preserve|reset decides TRS when a source/axis changes.',
    version:
      'API3 (apiVersion:3) is current. apiVersion 1/2 keeps old native-program material/helper semantics (box/scene forms); it is not the independent old modeler_script DSL.',
  },
  loop: [
    {
      step: 1,
      goal: 'Read the guard and choose one representation.',
      call: statusCall(),
      note: 'Simple forms use create. Multi-part or relationship-heavy declarations use program. Existing old scripts stay on the legacy route.',
    },
    {
      step: 2,
      goal: 'Create a source with features and a stable id.',
      call: call('modeler_geometry', {
        op: 'create',
        id: 'panel',
        source: { type: 'box', size: [1, 0.12, 0.6] },
        features: [{ id: 'round', type: 'bevel', width: 0.015, segments: 3, selection: { domain: 'edges' } }],
        position: [0, 0.06, 0],
        expectedHash: '<contentHash>',
      }),
      expect: 'The committed source, feature list, topologyStamp/counts and local feedback; or a validation error before commit.',
    },
    {
      step: 3,
      goal: 'Or declare several parts in one replayable program.',
      call: call('modeler_geometry', {
        op: 'program',
        mode: 'append',
        apiVersion: 3,
        expectedHash: '<contentHash>',
        code: "const post=m.cylinder({radius:.06,depth:.8,segments:32}).key('post').at(0,.4,0);return m.scene('Post',[post]);",
      }),
      expect: 'nativeProgram saved on the asset plus committed source nodes; append never deletes unrelated sources.',
    },
    {
      step: 4,
      goal: 'Address a local area by predicate, not by guessed indices.',
      call: call('modeler_geometry', {
        op: 'feature',
        id: 'panel',
        expectedHash: '<contentHash>',
        selection: { domain: 'faces', where: { normal: { direction: [0, 0, 1], minDot: 0.99 } } },
        feature: { id: 'inset', type: 'inset', thickness: 0.02, depth: -0.01 },
      }),
      note: 'Save a named selection when reusing it. Explicit ids require the topologyStamp returned by the query; predicates can be re-resolved after a rebuild.',
    },
    {
      step: 5,
      goal: 'Verify the exact claim.',
      call: call('modeler_geometry', { op: 'inspect', id: 'panel', parameter: 'features' }),
      expect: 'Inspect ids/topologyStamp/counts. For shape/part boundaries capture displayMode:"outline"; for triangulation use "surface_wireframe"; for optics use "normal". Choose the mode for the question, not all three.',
    },
  ],
  example: {
    goal: 'A reusable source + feature declaration.',
    code: "const plate=m.box([1,.12,.6]).key('panel').at(0,.06,0);plate.feature('bevel',{id:'round',width:.015,segments:3,selection:{domain:'edges'}});return m.scene('Panel',[plate]);",
    note: 'Use this shape with modeler_geometry {op:"program",apiVersion:3,...}; the same source/feature data is valid on create. Do not use it in modeler_workbench script.',
  },
  sideEffects: [
    'create, program, feature, update, remove_feature and rebuild commit atomically with the current guard and return a new revision/contentHash.',
    'program stores the native program for replay; append/upsert semantics determine which other sources are left alone.',
    'Large operations may return a native job; poll job/cancel rather than assuming completion.',
  ],
  evidence: [
    'Receipt: changed source ids, feature ids, topologyStamp, counts, relation checks, local selection/feedback and warnings.',
    'inspect: exact source/features and parameter paths; bounded by offset/count for arrays.',
    'Validation/relation failures are explicit and do not commit; a committed edit can still have unknown visual quality.',
  ],
  recovery: [
    { when: 'duplicate object or feature id', action: 'Rename the new id; upsert does not silently merge conflicting declarations.' },
    { when: 'native_source_required', action: 'The target is a legacy evaluated object; use adopt for an explicit conversion or create a new native source.' },
    { when: 'transform policy needed', action: 'Choose auto, preserve or reset explicitly when replacing vertices/type/axis with existing non-unit TRS.' },
    { when: 'selection/topology rejected', action: 'Re-query the selection and topologyStamp; do not reuse old explicit ids.' },
  ],
  contracts: [
    { need: 'API3 source, feature and selection fields', call: call('modeler_geometry', { op: 'help', topic: 'construct' }) },
    { need: 'Backend source/feature/query capabilities', call: call('modeler_geometry', { op: 'capabilities' }) },
    { need: 'Transform and upsert policy', call: call('modeler_geometry', { op: 'help', topic: 'transforms' }) },
    { need: 'Mesh format and orientation', call: call('modeler_geometry', { op: 'help', topic: 'mesh' }) },
  ],
  next: guideCall('assembly'),
};

const ASSEMBLY = {
  kind: 'subject',
  title: 'Assembly, interfaces, relations and contact intent',
  purpose:
    'Organize parts into modules, declare actual interfaces and spatial constraints, and keep declared contact meaning separate from measured touching or overlap.',
  when: [
    'More than one part must share a persistent position, interface or module responsibility.',
    'You need to state whether parts are separate, touching, intentionally embedded, surface-following or solid-combined.',
    'A claim such as "these are joined" needs an actual interface, relation or measurement.',
  ],
  model: {
    intentVsMeasurement:
      'contact_intent records author meaning. separate/touch receive a basic gap/conflict check and solidCombine checks conflicts; intentionalEmbed and surfaceRelief are declarations, not automatic proof. Actual touching/overlap needs diagnose pair or assembly_check.',
    interfaces:
      'A named interface (cylinderEnd, boundsFace, frame, selection) is a stable local feature. attach uses sourceInterface/targetInterface and persists the dependency; it does not weld geometry.',
    relations:
      'relation declares join, coaxial, outside, nonIntersection, gap, halfspace, wallThickness or envelope. Checks run during writes; conflict or unknown rejects the commit. Declarations never pass automatically.',
    globalVsModule:
      'Module source is module-local and replaces one compound subtree (frameMode preserve|source). Interfaces and world relations are evaluated in world space; group/module TRS still composes.',
    touching:
      'AABB overlap is a candidate, not penetration. Surface distance is not signed contact. assembly_check rechecks changed leaves (including transparent/same-module); hidden objects are excluded and open shells may remain unknown.',
  },
  loop: [
    {
      step: 1,
      goal: 'Read the actual hierarchy and ids.',
      call: call('modeler_workbench', { action: 'tree', args: { depth: 2, offset: 0, limit: 24 } }),
      expect: 'Modules/groups, exact child ids, local frames and dependencies. Do not infer ids from display names.',
    },
    {
      step: 2,
      goal: 'Organize only when responsibility is clear.',
      call: call('modeler_workbench', {
        action: 'edit',
        args: {
          expectedHash: '<contentHash>',
          operations: [{ op: 'group', id: 'support', ids: ['rail', 'bracket'], keepWorld: true }],
        },
      }),
      note: 'group/ungroup/reparent/pivot keep world transforms where representable. module attaches role/description/controls/interfaces; set_control later edits declared child parameters.',
    },
    {
      step: 3,
      goal: 'Declare a real interface and attach through it.',
      call: call('modeler_geometry', {
        op: 'save_interface',
        id: 'tube',
        name: 'end',
        interface: { type: 'cylinderEnd', end: 'positive' },
        expectedHash: '<contentHash>',
      }),
      expect: 'Named interface on the object. Then modeler_geometry {op:"attach",id:"next",sourceInterface:"back",target:"tube",targetInterface:"end",offset:0,expectedHash:"<contentHash>"} commits the persistent placement.',
    },
    {
      step: 4,
      goal: 'State contact meaning separately from the measurement.',
      call: call('modeler_workbench', {
        action: 'contact_intent',
        args: { a: '<a>', b: '<b>', type: 'separate', minGap: 0.01, note: 'service clearance', expectedHash: '<contentHash>' },
      }),
      expect: 'contactIntents saved in meta; this does not move or merge either part.',
    },
    {
      step: 5,
      goal: 'Measure the actual contact or overlap.',
      call: call('modeler_workbench', { action: 'assembly_check', args: { id: '<changed id>' } }),
      expect: 'status clear|attention|partial, candidate pairs, classification, solidOverlap, witness and complete. For a specific pair use diagnose {query:"pair",id,other}.',
    },
    {
      step: 6,
      goal: 'Use a declared relation when the constraint must persist.',
      call: call('modeler_geometry', {
        op: 'relation',
        expectedHash: '<contentHash>',
        relation: { id: 'clearance', type: 'gap', source: '<a>', target: '<b>', minimum: 0.01 },
      }),
      note: 'Read with op:"relations"; remove with op:"remove_relation". A conflict/unknown rejects the write with the conflicting object and position.',
    },
  ],
  example: {
    goal: 'Intent and measurement are two calls, not one.',
    call: call('modeler_workbench', {
      action: 'contact_intent',
      args: { a: 'fixture', b: 'cover', type: 'separate', minGap: 0.01, note: 'cover must clear the fixture', expectedHash: '<contentHash>' },
    }),
    note: 'Then assembly_check/diagnose pair. A clear intent does not prove the gap; a measured overlap does not decide whether the design should embed parts.',
  },
  sideEffects: [
    'group/ungroup/reparent/pivot/module and module replacement commit; keepWorld refuses rather than approximating shear.',
    'save_interface/attach/relation/contact_intent commit metadata or placement and need the current guard.',
    'assembly_check, tree, diagnose, interfaces and relations reads do not change the asset.',
    'solid_combine stages a real boolean candidate; accept_trial commits it, discard_trial leaves the asset unchanged.',
  ],
  evidence: [
    'assembly_check: status, complete, changed leaves, candidate pairs, classification, intentViolation, witness and unknownReasons.',
    'relation checks: pass/fail/unknown with declared scope and witnesses; unknown is not a pass.',
    'interfaces: named definition plus placement; attach receipt shows the persistent dependency.',
    'check_roles: explicit path/symmetry evidence with coverage and witnesses; names alone do not imply left/right or outside.',
  ],
  recovery: [
    { when: 'unknown/partial contact', action: 'Narrow to one pair or raise the explicit query budget; report open shells/budget as unknown instead of claiming clearance.' },
    { when: 'relation_conflict', action: 'Adjust the design or the declaration; do not delete the relation merely to force a commit.' },
    { when: 'ambiguous_placement', action: 'Clear the existing face/native placement before attaching an interface, or keep one placement only.' },
    { when: 'module source mismatch', action: 'Read module_source, keep one compound root keyed by moduleId, then trial and accept; preserve the original frame unless source is explicit.' },
  ],
  contracts: [
    { need: 'Assembly operation fields', call: call('modeler_workbench', { action: 'help', args: { topic: 'actions', query: 'assembly' } }) },
    { need: 'Interface/attach/relation fields', call: call('modeler_geometry', { op: 'help', topic: 'relations' }) },
    { need: 'Contact intent and assembly check fields', call: call('modeler_workbench', { action: 'help', args: { topic: 'actions', query: 'contact_intent' } }) },
    { need: 'Module source route', call: call('modeler_workbench', { action: 'help', args: { topic: 'actions', query: 'module_source' } }) },
  ],
  next: guideCall('edit'),
};

const EDIT = {
  kind: 'subject',
  title: 'Local editing, selections and candidates',
  purpose:
    'Change a persisted asset at the smallest suitable representation with exact ids and current guards, and keep candidate trials separate from committed versions.',
  when: [
    'A parameter, transform, material, visibility or feature needs a local change.',
    'A source or feature stack needs a controlled replacement rather than a full rebuild.',
    'You want to compare a candidate without committing it.',
  ],
  model: {
    smallest:
      'Prefer parameters, then feature parameters, then a named selection, then a source patch, then full regeneration. A local change should preserve unrelated ids, materials, UVs and overrides.',
    selections:
      'Predicates resolve against current geometry; explicit ids must carry the topologyStamp returned by the query. Named selections are version-bound and reject when their target no longer exists. A rebuild can re-resolve predicates but cannot promise old explicit ids.',
    candidates:
      'trial stages operations or legacy/module code/sourceId and returns a candidate id/hash with changedCurrentAsset:false. accept_trial commits only when the baseline still matches; discard_trial releases it. trial_observe/trial_diagnose read that candidate, not the working version.',
    source:
      'source/save_source/patch_source/validate stage or read source without committing. script commits legacy code; API3 native source changes use geometry create/program/feature/update. rebase:true preserves replayable local overrides; discardOverrides:true is explicit.',
    guards:
      'Every commit needs expectedRevision or expectedHash and should include assetId. A conflict or stale candidate means re-read and restage; never force an old candidate onto a new baseline.',
  },
  loop: [
    {
      step: 1,
      goal: 'Read the exact part, parameter or feature.',
      call: call('modeler_inspect', { id: '<id>' }),
      expect: 'id, parents, recipe/params, transforms and material. Use modeler_workbench inspect {parameter,offset,count} for arrays and {mesh:true} for base topology.',
    },
    {
      step: 2,
      goal: 'Choose the smallest write representation.',
      call: call('modeler_workbench', {
        action: 'edit',
        args: {
          assetId: '<assetId>',
          expectedHash: '<contentHash>',
          operations: [{ op: 'parameters', id: '<id>', params: { w: 1.2 } }],
        },
      }),
      note: 'edit supports parameters/transform/material/modifiers/visibility/mesh_move/mesh_extrude and assembly operations. API3 feature changes use modeler_geometry feature/update/remove_feature.',
    },
    {
      step: 3,
      goal: 'Or stage a candidate before committing.',
      call: call('modeler_workbench', {
        action: 'trial',
        args: {
          assetId: '<assetId>',
          expectedHash: '<contentHash>',
          operations: [{ op: 'parameters', id: '<id>', params: { w: 1.2 } }],
          observe: { view: 'iso', mode: 'clay', width: 720, height: 480 },
        },
      }),
      expect: 'candidateHash/id, changedCurrentAsset:false, optional before/after images. Accept only the exact candidate you inspected.',
    },
    {
      step: 4,
      goal: 'Use a feature with a stable selection.',
      call: call('modeler_geometry', {
        op: 'feature',
        id: 'panel',
        expectedHash: '<contentHash>',
        selectionId: 'front',
        feature: { id: 'recess', type: 'inset', thickness: 0.02, depth: -0.01 },
      }),
      note: 'Create the named selection first: modeler_geometry {op:"save_selection",id:"panel",name:"front",selection:{domain:"faces",where:{normal:{direction:[0,0,1],minDot:.99}}},expectedHash:"<contentHash>"}. update changes one feature params patch; remove_feature deletes it; explicit ids need topologyStamp.',
    },
    {
      step: 5,
      goal: 'Commit or discard the candidate.',
      call: call('modeler_workbench', { action: 'accept_trial', args: { assetId: '<assetId>', expectedHash: '<contentHash>', id: '<candidate id>' } }),
      expect: 'New revision/contentHash and acceptedCandidateHash; a changed baseline rejects with stale_trial. Use discard_trial to free a candidate without changing the asset.',
    },
    {
      step: 6,
      goal: 'Re-observe only the claim you changed.',
      call: call('modeler_workbench', { action: 'inspect', args: { id: '<id>' } }),
      note: 'Then one targeted diagnose or capture at the same camera/mode. Do not infer success from a receipt alone.',
    },
  ],
  example: {
    goal: 'One atomic local parameter edit.',
    call: call('modeler_workbench', {
      action: 'edit',
      args: {
        assetId: '<assetId>',
        expectedHash: '<contentHash>',
        operations: [{ op: 'parameters', id: 'body.shell', params: { w: 1.5 } }],
        label: 'widen shell',
      },
    }),
    note: 'Params deep-merge; arrays are replaced. Read the field names from inspect before writing.',
  },
  sideEffects: [
    'edit/feature/update/remove_feature/program commit and append history; receipts carry the new revision/contentHash and delta.',
    'trial/save_source/patch_source/validate do not change the working asset; source ids are immutable references to staged code.',
    'accept_trial commits the candidate exactly; discard_trial only releases it. Candidates are asset- and baseline-bound.',
    'script can replay overrides; rebase:true preserves them and discardOverrides:true drops them explicitly. Neither silently ignores a conflict.',
  ],
  evidence: [
    'Commit receipt: revision/contentHash, changed ids, delta, organization, assembly feedback, material delivery summary and local feedback.',
    'Trial: candidateHash/id, base identity, comparison (sameCamera), diagnostics before/after, changedCurrentAsset:false.',
    'Validation: valid, error with available line, committable and changedCurrentAsset:false.',
    'Selection: domain, ids, topologyStamp, overlay coverage; saved selections re-resolve and fail closed.',
  ],
  recovery: [
    { when: 'conflict or missing_base', action: 'Re-read status/inspect, confirm the target, restage the intended change against the new hash.' },
    { when: 'stale_trial', action: 'Discard the old candidate and restage on the current baseline; do not accept across versions.' },
    { when: 'TOPOLOGY_STAMP_REQUIRED or selection not found', action: 'Re-run select and read the current topologyStamp; use a predicate or named selection when the rebuild preserves geometry meaning.' },
    { when: 'invalid source or overrides', action: 'Read validation.error, fix the source, and choose rebase:true or discardOverrides:true explicitly.' },
  ],
  contracts: [
    { need: 'Edit operations and fields', call: call('modeler_workbench', { action: 'help', args: { topic: 'actions', query: 'edit' } }) },
    { need: 'Trial/accept/discard fields', call: call('modeler_workbench', { action: 'help', args: { topic: 'actions', query: 'trial' } }) },
    { need: 'Native selection and feature fields', call: call('modeler_geometry', { op: 'help', topic: 'select' }) },
    { need: 'Source staging and commit', call: call('modeler_workbench', { action: 'help', args: { topic: 'source' } }) },
  ],
  next: guideCall('materials'),
};

const MATERIALS = {
  kind: 'subject',
  title: 'Uniform and spatial materials',
  purpose:
    'Declare either a uniform PBR constant or a spatial material signal with real physical scale, then let the shared automatic preparation produce display data.',
  when: [
    'Assigning or changing appearance on a persistent part.',
    'Deciding whether a color/BRDF constant is enough or a surface/detail signal is actually needed.',
    'Reusing a material source across parts or diagnosing why a surface looks uniform.',
  ],
  model: {
    kinds:
      'Uniform PBR is intentionally homogeneous color/BRDF (metalness, roughness, opacity, emissive...). A spatial signal defines varying color/roughness/height/coat through surface/detail/procedural/image data with mapping and physical units. A name such as "fabric" does not create texture.',
    api3:
      'In API3, .mat(spatialSpec) or .finish(role,recipe,params/options) declares process intent; .mat("#color") remains a plain constant. m.paint/m.rubber/m.metal are actual process recipe helpers; m.glass is an explicit uniform optical declaration with a reason; m.matte/m.emitter stay constants. Use .uniform(role,constant,reason) when you explicitly choose a uniform intent.',
    legacy:
      'The independent old modeler_script DSL has its own constant presets; they are not API3 process declarations. Never infer one namespace from the other.',
    physicalScale:
      'Surface/detail mapping and wavelengths are metrical (object/world/frame) or UV/generated units; object scale can stretch an object-space texture. Keep the actual source and declared scale; do not silently change wavelength or amplitude to make an image look busier.',
    preparation:
      'A normal .mat spatial source, .finish, material-library put/assign, and material author/preview share the same automatic display preparation. No extra bake is required for display, and role/review checks are optional diagnostics, not prerequisites.',
    versions:
      'New declarations default to recipeVersion:3. An explicit recipeVersion:2 keeps the saved old recipe semantics; saved sources are compiled by their own version, never re-interpreted by name.',
  },
  loop: [
    {
      step: 1,
      goal: 'Decide uniform vs spatial from the actual requirement.',
      note: 'If the surface must vary at a physical scale (paint orange peel, brushed metal, weave, wear mask), use a spatial source or process recipe. A uniform constant is correct when the intent is genuinely homogeneous.',
    },
    {
      step: 2,
      goal: 'Declare it on the part or from the material library.',
      call: call('modeler_material', { op: 'recipe', recipe: 'sprayed_paint', params: { color: '#35727c' } }),
      expect: 'The current-version spec/source and surface summary. Then author or inline it; the source remains editable.',
    },
    {
      step: 3,
      goal: 'Apply the declaration.',
      call: call('modeler_geometry', {
        op: 'program',
        mode: 'append',
        apiVersion: 3,
        expectedHash: '<contentHash>',
        code: "const p=m.box([1,.12,.6]).key('panel').finish('panel_finish','sprayed_paint',{color:'#35727c'});return m.scene('Panel',[p]);",
      }),
      note: 'Inline .mat(spatialSpec) and .finish use the same automatic preparation. Library put/assign and author are alternatives when reuse or batch assignment is useful.',
    },
    {
      step: 4,
      goal: 'Inspect the real source and physical scale.',
      call: call('modeler_material', { op: 'get', materialId: '<materialId>' }),
      expect: 'Source, spec, surface summary, revision/hash and mapping/scale. Use modeler_material {op:"info"} or {op:"uv_info"} for native material/UV details, and {op:"delivery"} or {op:"fidelity"} for actual slot state.',
    },
    {
      step: 5,
      goal: 'Verify appearance with an image that can show it.',
      call: call('modeler_capture', { isolate: '<id>', mode: 'material', views: ['iso'], width: 900, height: 700, expectedHash: '<contentHash>' }),
      note: 'Read the PNG. final_normal includes the final normal map; normal shows geometry/shading normals only. Captured does not mean reviewed or accepted.',
    },
  ],
  example: {
    goal: 'One process finish and one explicitly uniform tinted surface.',
    code: "const body=m.box([1,.1,.6]).key('body').finish('body_finish','sprayed_paint',{color:'#35727c'});const window=m.box([.2,.01,.1]).key('window').uniform('window',{color:'#d5e3eb',metalness:0,roughness:.04},'Uniform tinted panel; intentionally homogeneous, no transmission');return m.scene('Panel',[body,window]);",
    note: 'Use this in modeler_geometry program apiVersion3. Do not paste it into the old modeler_script route.',
  },
  sideEffects: [
    'Inline material declarations commit with their part/program; material library put/assign and author commit a revision.',
    'preview builds with the same source and preparation but does not commit; its receipt says changedCurrentAsset:false.',
    'Automatic preparation may create/refresh derived UVs and images without changing the authored source or revision.',
    'Explicit bake remains available for compatibility/export channels; it is not a required display step.',
  ],
  evidence: [
    'source/spec/surface: actual declared channels, mapping space, wavelength/amplitude, masks and layers. Names and PNG presence are not fidelity evidence.',
    'delivery: actual material slots and derived state across program/inline/put/author; fidelity: local UV density, sampling and effective channel ranges.',
    'author/preview: same-source candidate plus delivery plan and detail tiles; a preview image is not a committed material.',
    'capture final_normal vs normal: final includes the prepared normal map; normal is the geometry/shading normal diagnostic.',
  ],
  recovery: [
    { when: 'appearance is uniform but a spatial source was intended', action: 'Check the actual source type and delivery state; a constant color/BRDF is uniform by design, not by its name.' },
    { when: 'sampling/fidelity insufficient', action: 'Raise detailResolution/detailSize within budget, or report the limit; do not claim fine detail from a non-empty image.' },
    { when: 'material not found or library revision conflict', action: 'List/get the library, re-read its revision, then put/assign with the current values.' },
    { when: 'delivery rejects the material scope', action: 'Follow the delivery guide: reduce to supported constant/baked UV channels or accept the explicit boundary; never expect a silent solid-color downgrade.' },
  ],
  contracts: [
    { need: 'Material operations and readiness', call: call('modeler_material', { op: 'help' }) },
    { need: 'Surface signals, mapping and detail tiles', call: call('modeler_material', { op: 'help', topic: 'surface' }) },
    { need: 'Delivery/fidelity diagnostics', call: call('modeler_material', { op: 'help', topic: 'delivery' }) },
    { need: 'API3 material helper semantics', call: call('modeler_geometry', { op: 'help', topic: 'materials' }) },
  ],
  next: guideCall('delivery'),
};

const DELIVERY = {
  kind: 'subject',
  title: 'Versioned delivery to a consumer',
  purpose:
    'Hand the exact current version to a consumer as a bounded, versioned delivery package with a digest, without changing the asset or inventing a consumer-specific path.',
  when: [
    'The model is ready to import into a consumer such as dsh-godot-master.',
    'You need a reproducible artifact tied to one assetId/revision/contentHash.',
    'A consumer asks for a delivery package or digest rather than the live asset.',
  ],
  model: {
    exactVersion:
      'delivery requires assetId and expectedHash (64 lowercase sha256); expectedRevision is optional. It packs the exact current version and rejects a binding or version mismatch instead of exporting a nearby version.',
    ticket:
      'The tool result is only a bounded ticket: schema, schemaVersion, digest, bytes, path plus node/leaf/image/triangle counts. The package can be large, so it is not returned in the context.',
    storage:
      'Packages live under ~/.dsh/modeler-deliveries/ with digest/versioned names. Publishing is temporary-file + rename; bounded cleanup only touches files matching the delivery pattern and schema marker.',
    scope:
      'The package carries constant PBR plus explicit baked UV image channels and a limitations/fidelity statement. Procedural/surface/detail, transmission/volume, non-UV projection and unsupported channel shapes are refused explicitly, never downgraded.',
    consumer:
      'The consumer verifies schema/schemaVersion, digest, source identity and its own import budget. Import details belong to that consumer\'s contract; do not invent a Godot API or path from this guide.',
  },
  loop: [
    {
      step: 1,
      goal: 'Freeze the exact version.',
      call: statusCall(),
      expect: 'The current assetId, revision and 64-character contentHash. Ensure no edit is in flight.',
    },
    {
      step: 2,
      goal: 'Request the delivery ticket.',
      call: call('modeler_workbench', { action: 'delivery', args: { assetId: '<assetId>', expectedHash: '<contentHash>' } }),
      expect: 'delivery.schema, schemaVersion, digest, bytes, path and counts; the asset revision/contentHash must be unchanged.',
    },
    {
      step: 3,
      goal: 'Check the package boundary before handing it over.',
      note: 'Read delivery.materialScope and limitations in the ticket. If a material was refused, inspect the actual source and choose a supported representation; do not ask the consumer to ignore the limitation.',
    },
    {
      step: 4,
      goal: 'Hand over identity plus ticket, not a guessed path.',
      note: 'Consumer input is the returned delivery path/digest together with assetId/revision/contentHash. It revalidates the package; this call does not prove visual fidelity.',
    },
    {
      step: 5,
      goal: 'If the source changed, restart from step 1.',
      call: statusCall(),
      expect: 'A different contentHash means a new delivery; an old package remains a valid artifact of the old version.',
    },
  ],
  example: {
    goal: 'Deliver exactly the current version.',
    call: call('modeler_workbench', {
      action: 'delivery',
      args: { assetId: '<assetId>', expectedHash: '<64-char contentHash>', expectedRevision: 7 },
    }),
    note: 'Only assetId, expectedHash and expectedRevision are accepted. Other fields are rejected as invalid_argument.',
  },
  sideEffects: [
    'Read-only for the asset: no revision/contentHash change and no history write.',
    'Writes a package file and may clean older matching packages; it does not touch unrelated files or the resource store.',
    'A version/binding conflict returns an error; it never exports the current asset under the requested old identity.',
  ],
  evidence: [
    'Ticket: schema dsh-modeler.delivery, schemaVersion, digest, bytes, path, nodes/leaves/images/triangles and materialScope.',
    'Package source identity and digest fix the delivered version; the consumer must verify both plus schemaVersion.',
    'limitations.fidelity states the supported scope; unsupported material fields are explicit errors, not omitted silently.',
  ],
  recovery: [
    { when: 'conflict or binding_conflict', action: 'Re-read status and request delivery for the actual current asset/version.' },
    { when: 'MODELER_MATERIAL_UNSUPPORTED', action: 'Change the material to supported constant PBR or explicit baked UV channels, or report that this asset is outside the delivery scope.' },
    { when: 'budget error (MODELER_BUDGET / texture budget)', action: 'Reduce triangles/images or split the asset; do not truncate silently.' },
    { when: 'consumer rejects schema/digest', action: 'Regenerate from the exact version and let the consumer validate; do not edit the package by hand.' },
  ],
  contracts: [
    { need: 'Delivery package schema and limits', call: call('modeler_workbench', { action: 'help', args: { topic: 'actions', query: 'delivery' } }) },
    { need: 'Material delivery/fidelity diagnostics (different from asset delivery)', call: call('modeler_material', { op: 'help', topic: 'delivery' }) },
  ],
  next: guideCall('legacy'),
};

const LEGACY = {
  kind: 'subject',
  title: 'Independent legacy modeler_script DSL',
  purpose:
    'Read or edit an existing old modeler_script asset through its own route without mixing it with the current native API3 namespace.',
  when: [
    'The asset already has a legacy generator and you need to read, patch or rerun it.',
    'You are maintaining an old script asset rather than creating a native API3 source.',
    'A help result or example uses the old m.* signatures and axis conventions.',
  ],
  model: {
    namespace:
      'old modeler_script (workbench script/validate/source) and current modeler_geometry program apiVersion3 are independent DSLs. They are not interchangeable, even when a function is spelled m.box.',
    box:
      'old m.box(w,h,d,name) uses positional full dimensions. API3 m.box([x,y,z]) (or three scalars) takes one size vector; same name, different signature.',
    cylinder:
      'old m.cylinder(radiusTop,radiusBottom,height,segments,name) is Y-axis with top radius first. API3 m.cylinder({radius,depth,segments,axis}) defaults to local Z; cylinder/torus/extrude accept an explicit axis.',
    mesh:
      'old m.mesh(positions,name) stores every nine numbers as one triangle (flat, non-indexed). API3 m.mesh(flatXYZ,polygonFaces,{smooth,uvs,orientation}) is indexed polygons and validates face indices.',
    sceneMaterials:
      'old m.scene(title,parts,meta?) allows a third meta argument; API3 m.scene(title,parts) only. Old material presets are constant PBR; API3 m.paint/m.rubber/m.metal declare process intent, m.glass/.uniform declare explicit uniform intent, and .finish can declare either.',
    methods:
      'old Part uses .at/.rot/.scaleTo/.mat/.mods/.shade/.key/.clone. API3 Part uses .at/.rot/.scale/.mat/.finish/.uniform/.feature/.interface/.attachTo/.transforms/.key.',
    axes:
      'Both observe world Y-up, but the old cylinder/torus and current cylinder/torus/extrude local axes differ. Read the exact help entry before reusing a snippet.',
    route:
      'Legacy source is read/staged with modeler_workbench source/save_source/patch_source/validate and committed with script. API3 native edits use modeler_geometry program/create/feature/update; apiVersion:1/2 only preserves old native-program semantics, not the old DSL.',
  },
  loop: [
    {
      step: 1,
      goal: 'Confirm the asset is on the legacy route.',
      call: call('modeler_workbench', { action: 'status' }),
      note: 'A legacy asset has a generator source but no native API3 program/nodes. If unsure, read modeler_geometry {op:"status"} (totalNodes:0 with a legacy generator) and modeler_workbench source before choosing the route.',
    },
    {
      step: 2,
      goal: 'Read the exact old signature before editing.',
      call: call('modeler_workbench', { action: 'help', args: { topic: 'legacy_api', query: 'm.box' } }),
      expect: 'The old DSL entry, signature, defaults and examples in its own namespace.',
    },
    {
      step: 3,
      goal: 'Read and stage the source without committing.',
      call: call('modeler_workbench', { action: 'source', args: { offset: 0, limit: 6000 } }),
      note: 'Continue with nextOffset. save_source/patch_source stage immutable source ids; validate checks without changing the asset.',
    },
    {
      step: 4,
      goal: 'Commit the legacy script with a current guard.',
      call: call('modeler_workbench', {
        action: 'script',
        args: { assetId: '<assetId>', expectedHash: '<contentHash>', sourceId: '<sourceId>' },
      }),
      expect: 'A new revision/contentHash, or a validation/conflict error. Existing local overrides need rebase:true; dropping them needs discardOverrides:true explicitly.',
    },
    {
      step: 5,
      goal: 'Verify the changed geometry or appearance.',
      call: call('modeler_workbench', { action: 'inspect', args: { id: '<id>' } }),
      note: 'Then diagnose/capture only the claim that changed. Old DSL does not become API3 after a successful script commit.',
    },
  ],
  example: {
    goal: 'A minimal old-DSL declaration (not API3).',
    code: "const panel=m.box(1,.12,.6,'Panel').key('panel').at(0,.06,0).mat(m.matte('#607580'));return m.scene('Panel',[panel]);",
    note: 'Use with modeler_workbench script/source/validate only, where this is a legacy route. API3 also accepts three-scalar m.box (an extra name is ignored), m.matte, .at, .key and m.scene, so identical symbols do not prove identical semantics. Choose the route explicitly; the old Y-axis m.cylinder and flat non-indexed m.mesh are the clear distinguishers.',
  },
  sideEffects: [
    'source/save_source/patch_source/validate do not change the working asset; staged source ids are immutable.',
    'script commits the legacy generator and appends history; it requires the current guard and revalidates before commit.',
    'A failed validation leaves the old source and asset intact; an invalid code string may still be staged for repair.',
  ],
  evidence: [
    'source: sourceId, sourceHash, code and characters; nextOffset for the rest.',
    'validate: validation.valid, error line where available, committable and changedCurrentAsset:false.',
    'script receipt: new revision/contentHash, delta and geometry feedback; it does not prove appearance.',
  ],
  recovery: [
    { when: 'unknown_program_method or wrong signature', action: 'You are probably mixing namespaces. Query legacy_api for the old name and check box/cylinder/mesh/scene signatures.' },
    { when: 'validation failure', action: 'Read validation.error, patch the staged source, validate again; do not commit invalid code.' },
    { when: 'conflict or override conflict', action: 'Re-read the source/guards; choose rebase:true to preserve replayable overrides or discardOverrides:true to drop them explicitly.' },
    { when: 'the asset is actually native API3', action: 'Use modeler_geometry program/feature; do not force it through the legacy script route.' },
  ],
  contracts: [
    { need: 'Old DSL API entry', call: call('modeler_workbench', { action: 'help', args: { topic: 'legacy_api', query: 'm.cylinder' } }) },
    { need: 'Old DSL precise scene/title/meta fields', call: call('modeler_workbench', { action: 'help', args: { topic: 'legacy_api', query: 'm.scene' } }) },
    { need: 'Source staging and commit fields', call: call('modeler_workbench', { action: 'help', args: { topic: 'source' } }) },
  ],
  next: guideCall('main'),
};

const GUIDES = Object.freeze({
  main: MAIN,
  resources: RESOURCES,
  explore: EXPLORE,
  construct: CONSTRUCT,
  assembly: ASSEMBLY,
  edit: EDIT,
  materials: MATERIALS,
  delivery: DELIVERY,
  legacy: LEGACY,
});

function normalizeId(value) {
  if (typeof value !== 'string') return 'main';
  const trimmed = value.trim();
  if (!trimmed) return 'main';
  return trimmed.slice(0, MAX_ECHO_ID);
}

/**
 * Return the canonical tool invocation for one guide. The returned object is
 * fresh on every call, so callers can mutate it without affecting the module.
 */
export function guideRef(id = 'main') {
  return call('modeler_workbench', { action: 'guide', args: { id: normalizeId(id) } });
}

/**
 * Read one guide as plain JSON. Pure and bounded:
 * - known id: schema/version/id, purpose, workflow, evidence, recovery, contracts;
 * - unknown id: bounded directory + recovery call (no throw);
 * - each call returns an independent deep clone.
 */
export function getModelerGuide(options = {}) {
  const requested = normalizeId(options && typeof options === 'object' ? options.id : undefined);
  const guide = GUIDES[requested];

  if (!guide) {
    return clone({
      ok: false,
      schema: SCHEMA,
      schemaVersion: SCHEMA_VERSION,
      code: 'unknown_guide',
      requestedId: requested,
      message: 'Unknown guide id. Use main or one of the subject guides; this reply is bounded and includes a recovery call.',
      callConvention: CALL_CONVENTION,
      directory: MODELER_GUIDE_IDS.map((id) => ({
        id,
        when: DIRECTORY_WHEN[id] || 'Overview, mental model and guide directory.',
        call: guideRef(id),
      })),
      next: guideRef('main'),
    });
  }

  return clone({
    ok: true,
    schema: SCHEMA,
    schemaVersion: SCHEMA_VERSION,
    id: requested,
    callConvention: CALL_CONVENTION,
    ...guide,
    retrieval: guideRef(requested),
  });
}

/**
 * Pure Markdown renderer used to generate docs/AGENT-GUIDE.md and
 * docs/guides/*.md from the same guide data. It performs no file I/O; the
 * generation step is deliberately outside this module.
 */
export function renderGuideMarkdown(id = 'main') {
  const guide = getModelerGuide({ id });
  const lines = [];
  const push = (...items) => lines.push(...items);
  const code = (value) => '`' + String(value).replace(/`/g, '\\`') + '`';
  const json = (value) => code(JSON.stringify(value));
  const cell = (value) => String(value).replace(/\|/g, '\\|').replace(/\n/g, ' ');

  push(`# ${guide.title}`, '');
  push(
    '> Generated from `src/host/guide-system.js`; do not hand-edit. Runtime source of truth:',
    `> ${json(guide.retrieval || guide.next)}.`,
    `> ${guide.callConvention}`,
    ''
  );

  if (!guide.ok) {
    push(`Unknown guide id: ${code(guide.requestedId)}.`, '');
    push('| id | When to use | One call |', '|---|---|---|');
    for (const item of guide.directory) push(`| ${item.id} | ${cell(item.when)} | ${json(item.call)} |`);
    push('', `Next: ${json(guide.next)}`, '');
    return lines.join('\n') + '\n';
  }

  if (guide.purpose) push('## Purpose', '', guide.purpose, '');
  if (guide.when) {
    push('## When to use', '');
    for (const item of guide.when) push(`- ${item}`);
    push('');
  }
  if (guide.mentalModel) {
    push('## Mental model', '');
    for (const [name, text] of Object.entries(guide.mentalModel)) push(`- **${name}.** ${text}`);
    push('');
  }
  if (guide.model) {
    push('## Key facts', '');
    for (const [name, text] of Object.entries(guide.model)) push(`- **${name}.** ${text}`);
    push('');
  }
  if (guide.entry) {
    push('## Entry', '', `- **Why.** ${guide.entry.note}`, `- **Call.** ${json(guide.entry.call)}`, '');
  }
  if (guide.directory) {
    push('## Guide directory', '', '| id | When to use | One call |', '|---|---|---|');
    for (const item of guide.directory) push(`| ${item.id} | ${cell(item.when)} | ${json(item.call)} |`);
    push('');
    push('Markdown copies: ' + guide.directory.map((item) => `[${item.id}](guides/${item.id}.md)`).join(', '), '');
  }
  if (guide.capabilities) {
    push('## Current capabilities', '');
    for (const item of guide.capabilities) push(`- ${item}`);
    push('');
  }
  if (guide.loop) {
    push('## Shortest meaningful loop', '');
    for (const step of guide.loop) {
      push(`${step.step}. **${step.goal}**`);
      if (step.call) push(`   - Call: ${json(step.call)}`);
      if (step.expect) push(`   - Expect: ${step.expect}`);
      if (step.note) push(`   - Note: ${step.note}`);
    }
    push('');
  }
  if (guide.example) {
    push('## Minimal example', '', `**Goal:** ${guide.example.goal}`, '');
    if (guide.example.call) push(`Call: ${json(guide.example.call)}`, '');
    if (guide.example.code) push('```js', guide.example.code, '```', '');
    if (guide.example.note) push(guide.example.note, '');
  }
  if (guide.sideEffects) {
    push('## Side effects', '');
    for (const item of guide.sideEffects) push(`- ${item}`);
    push('');
  }
  if (guide.evidence) {
    push('## Result and evidence', '');
    for (const item of guide.evidence) push(`- ${item}`);
    push('');
  }
  if (guide.recovery) {
    push('## Recovery', '');
    for (const item of guide.recovery) {
      push(`- **${item.when}** — ${item.action}`);
      if (item.call) push(`  - Call: ${json(item.call)}`);
    }
    push('');
  }
  if (guide.contracts) {
    push('## Exact contracts', '');
    for (const item of guide.contracts) push(`- **${item.need}:** ${json(item.call)}`);
    push('');
  }
  if (guide.next) push('## Next', '', `- ${json(guide.next)}`, '');
  return lines.join('\n') + '\n';
}
