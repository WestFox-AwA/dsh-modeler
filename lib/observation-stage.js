// Pure, bounded observation-stage contract shared by the Host capture path and
// the browser viewport/capture renderer. It never reads or writes an asset:
// `lighting` is a transient studio observation, not doc.meta.renderStage.
//
// Two independent public axes:
// - `mode` keeps every existing channel diagnostic value and its meaning
//   (notably normal = MeshNormalMaterial, wire = legacy material wireframe).
// - `displayMode` selects normal studio appearance / white-clay surface
//   wireframe / white-clay per-mesh hard/boundary edge display. displayMode
//   normal means "no display overlay"; the existing mode still chooses the
//   channel appearance. The outline is geometric, not semantic/CAD/silhouette.

export const OBSERVATION_MODES = Object.freeze([
  'material',
  'clay',
  'normal',
  'final_normal',
  'wire',
  'id',
  'zebra',
  'orientation',
  'roughness',
  'metalness',
  'albedo',
]);

export const DISPLAY_MODES = Object.freeze(['normal', 'surface_wireframe', 'outline']);

// Existing channel values. No old mode was renamed or redefined.
export const LEGACY_OBSERVATION_MODES = OBSERVATION_MODES;

const MODE_SET = new Set(OBSERVATION_MODES);
const DISPLAY_SET = new Set(DISPLAY_MODES);
const SAME_SCALE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const SHADOW_MAP_SIZES = Object.freeze([256, 512, 1024, 2048, 4096]);

export const OBSERVATION_STAGE_LIMITS = Object.freeze({
  maxLights: 4,
  maxIntensity: 1000,
  maxExposure: 100,
  maxEnvironmentIntensity: 10,
  shadowMapSizes: SHADOW_MAP_SIZES,
  maxOverlayTriangles: 1_500_000,
  maxFloorSpan: 100_000,
  maxOutlinePixels: 8_500_000,
  maxOutlineIds: 2048,
});

// One studio default contract for runtime, capture and UI.
const DEFAULT_KEY = Object.freeze({color: '#fff1dc', intensity: 2.4, position: Object.freeze([4, 7, 5]), shadows: true});
const DEFAULT_FILL = Object.freeze({color: '#b9d6ff', intensity: .7, position: Object.freeze([-5, 3, 2]), shadows: false});
const DEFAULT_RIM = Object.freeze({color: '#e9f0ff', intensity: .8, position: Object.freeze([2, 4, -6]), shadows: false});
const DEFAULT_HEMISPHERE = Object.freeze({sky: '#d7e8ff', ground: '#59606c', intensity: .25});
const DEFAULT_ENVIRONMENT = Object.freeze({intensity: 1});
const DEFAULT_SHADOWS = Object.freeze({enabled: true, mapSize: 1024, bias: -.0001, normalBias: .01});
const DEFAULT_FLOOR = Object.freeze({enabled: true, mirror: true, tint: '#d8dde2', shadow: true, size: null, position: null, roughness: .045, metalness: 1});

export const OBSERVATION_LIGHTING_DEFAULTS = Object.freeze({
  background: '#171c24',
  exposure: 1,
  environment: DEFAULT_ENVIRONMENT,
  hemisphere: DEFAULT_HEMISPHERE,
  key: DEFAULT_KEY,
  fill: DEFAULT_FILL,
  rim: DEFAULT_RIM,
  shadows: DEFAULT_SHADOWS,
  floor: DEFAULT_FLOOR,
});

function fail(path, message) {
  throw new TypeError(path + ': ' + message);
}
function record(value, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) fail(path, 'expected a plain object');
  return value;
}
function fields(value, allowed, path) {
  record(value, path);
  for (const key of Object.keys(value)) if (!allowed.includes(key)) fail(path, 'unsupported field ' + key);
  return value;
}
function number(value, min, max, path, integer = false) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) fail(path, 'expected ' + (integer ? 'an integer' : 'a finite number') + ' from ' + min + ' to ' + max);
  return value;
}
function boolean(value, path) {
  if (typeof value !== 'boolean') fail(path, 'expected a boolean');
  return value;
}
function vector(value, path, {min = -1e6, max = 1e6, nonZero = false} = {}) {
  if (!Array.isArray(value) || value.length !== 3) fail(path, 'expected three finite components');
  const out = Array.from(value, (item, index) => number(item, min, max, path + '[' + index + ']'));
  if (nonZero && Math.hypot(out[0], out[1], out[2]) < 1e-9) fail(path, 'expected a non-zero direction');
  return out;
}
function color(value, path) {
  if (Array.isArray(value)) {
    if (value.length !== 3) fail(path, 'expected a hex color or three unit RGB components');
    const rgb = Array.from(value, (item, index) => number(item, 0, 1, path + '[' + index + ']'));
    return '#' + rgb.map(item => Math.round(item * 255).toString(16).padStart(2, '0')).join('');
  }
  if (typeof value !== 'string') fail(path, 'expected a hex color or three unit RGB components');
  const match = SAME_SCALE.exec(value);
  if (!match) fail(path, 'expected #rgb or #rrggbb');
  let hex = match[1].toLowerCase();
  if (hex.length === 3) hex = [...hex].map(char => char + char).join('');
  return '#' + hex;
}
function finiteOr(value, fallback, path, min, max) {
  return value === undefined ? fallback : number(value, min, max, path);
}
function light(input, fallback, path) {
  fields(input, ['color', 'intensity', 'position', 'shadows'], path);
  return {
    color: input.color === undefined ? fallback.color : color(input.color, path + '.color'),
    intensity: finiteOr(input.intensity, fallback.intensity, path + '.intensity', 0, OBSERVATION_STAGE_LIMITS.maxIntensity),
    position: input.position === undefined ? [...fallback.position] : vector(input.position, path + '.position', {nonZero: true}),
    shadows: input.shadows === undefined ? fallback.shadows : boolean(input.shadows, path + '.shadows'),
  };
}
function hemisphere(input, path) {
  fields(input, ['sky', 'ground', 'intensity'], path);
  return {
    sky: input.sky === undefined ? DEFAULT_HEMISPHERE.sky : color(input.sky, path + '.sky'),
    ground: input.ground === undefined ? DEFAULT_HEMISPHERE.ground : color(input.ground, path + '.ground'),
    intensity: finiteOr(input.intensity, DEFAULT_HEMISPHERE.intensity, path + '.intensity', 0, OBSERVATION_STAGE_LIMITS.maxIntensity),
  };
}
function shadows(input, path) {
  fields(input, ['enabled', 'mapSize', 'bias', 'normalBias'], path);
  const mapSize = input.mapSize === undefined ? DEFAULT_SHADOWS.mapSize : number(input.mapSize, 256, 4096, path + '.mapSize', true);
  if (!SHADOW_MAP_SIZES.includes(mapSize)) fail(path + '.mapSize', 'expected one of ' + SHADOW_MAP_SIZES.join(', '));
  return {
    enabled: input.enabled === undefined ? DEFAULT_SHADOWS.enabled : boolean(input.enabled, path + '.enabled'),
    mapSize,
    bias: finiteOr(input.bias, DEFAULT_SHADOWS.bias, path + '.bias', -0.01, 0.01),
    normalBias: finiteOr(input.normalBias, DEFAULT_SHADOWS.normalBias, path + '.normalBias', 0, 1),
  };
}
function floorSize(value, path) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return [number(value, 1e-6, OBSERVATION_STAGE_LIMITS.maxFloorSpan, path), value];
  if (!Array.isArray(value) || value.length !== 2) fail(path, 'expected a positive scalar or [width, depth]');
  return [number(value[0], 1e-6, OBSERVATION_STAGE_LIMITS.maxFloorSpan, path + '[0]'), number(value[1], 1e-6, OBSERVATION_STAGE_LIMITS.maxFloorSpan, path + '[1]')];
}
function floor(input, path, policy) {
  fields(input, ['enabled', 'mirror', 'tint', 'shadow', 'size', 'position', 'roughness', 'metalness'], path);
  const requestedEnabled = input.enabled === undefined ? DEFAULT_FLOOR.enabled : boolean(input.enabled, path + '.enabled');
  const allowed = policy.floorAllowed;
  return {
    requestedEnabled,
    enabled: allowed ? requestedEnabled : false,
    forcedOff: !allowed && requestedEnabled,
    mirror: input.mirror === undefined ? DEFAULT_FLOOR.mirror : boolean(input.mirror, path + '.mirror'),
    tint: input.tint === undefined ? DEFAULT_FLOOR.tint : color(input.tint, path + '.tint'),
    shadow: input.shadow === undefined ? DEFAULT_FLOOR.shadow : boolean(input.shadow, path + '.shadow'),
    size: floorSize(input.size, path + '.size'),
    position: input.position === undefined || input.position === null ? null : vector(input.position, path + '.position'),
    roughness: finiteOr(input.roughness, DEFAULT_FLOOR.roughness, path + '.roughness', 0, 1),
    metalness: finiteOr(input.metalness, DEFAULT_FLOOR.metalness, path + '.metalness', 0, 1),
  };
}

/**
 * Pure two-axis policy. `displayMode:normal` is the standard studio appearance
 * surface and performs no geometric overlay; the existing `mode` still selects
 * the material/channel treatment. `surface_wireframe` and `outline` force a
 * clearly white clay surface plus their overlay, whatever channel mode was
 * requested (the requested mode is still reported in the receipt). Only
 * displayMode:normal + mode:material shows the mirror floor by default; every
 * diagnostic combination is forced to a flat background with no floor while
 * keeping the same studio lights, shadows and camera contract.
 */
export function observationStagePolicy(mode, displayMode = 'normal') {
  if (!MODE_SET.has(mode)) throw new TypeError('mode: unknown observation mode ' + String(mode));
  if (!DISPLAY_SET.has(displayMode)) throw new TypeError('displayMode: unknown display mode ' + String(displayMode));
  const whiteClay = displayMode === 'surface_wireframe' || displayMode === 'outline';
  const floorAllowed = displayMode === 'normal' && mode === 'material';
  return Object.freeze({
    mode,
    displayMode,
    display: displayMode,
    diagnostic: !floorAllowed,
    floorAllowed,
    floorPolicy: floorAllowed ? 'default-on' : 'forced-off',
    whiteClay,
    overlay: displayMode === 'surface_wireframe' ? 'surface-wireframe' : displayMode === 'outline' ? 'hard-edges' : null,
    surfaceMode: whiteClay ? 'white-clay' : mode,
    legacyWireframe: mode === 'wire',
    modeOverride: whiteClay,
  });
}

function policyReceipt(policy) {
  return {
    display: policy.display,
    diagnostic: policy.diagnostic,
    floorAllowed: policy.floorAllowed,
    floorPolicy: policy.floorPolicy,
    whiteClay: policy.whiteClay,
    overlay: policy.overlay,
    surfaceMode: policy.surfaceMode,
    modeOverride: policy.modeOverride,
    legacyWireframe: policy.legacyWireframe,
  };
}

/**
 * Validate and normalize the public transient `lighting` object.
 *
 * Allowed top-level fields (all optional; omitted fields use studio defaults):
 * background, exposure, environment{intensity}, hemisphere{sky,ground,intensity},
 * key/fill/rim{color,intensity,position,shadows},
 * shadows{enabled,mapSize,bias,normalBias},
 * floor{enabled,mirror,tint,shadow,size,position,roughness,metalness}.
 *
 * Colors are #rgb/#rrggbb or unit RGB. Positions are three finite metres.
 * environment.intensity is an absolute override (0..10), not a multiplier.
 * mapSize is one of 256/512/1024/2048/4096. No shader code or texture is
 * accepted. Diagnostic modes force floor.enabled=false and report forcedOff.
 * The result is a fresh deterministic plain object; the input is never mutated.
 */
export function normalizeObservationLighting(value, {mode = 'material', displayMode = 'normal'} = {}) {
  const policy = observationStagePolicy(mode, displayMode);
  const input = value === undefined || value === null ? {} : fields(value, ['background', 'exposure', 'environment', 'hemisphere', 'key', 'fill', 'rim', 'shadows', 'floor'], 'lighting');
  const explicit = {
    background: input.background !== undefined,
    exposure: input.exposure !== undefined,
    environment: input.environment !== undefined,
    hemisphere: input.hemisphere !== undefined,
    key: input.key !== undefined,
    fill: input.fill !== undefined,
    rim: input.rim !== undefined,
    shadows: input.shadows !== undefined,
    shadowEnabled: input.shadows !== undefined && input.shadows.enabled !== undefined,
    shadowNormalBias: input.shadows !== undefined && input.shadows.normalBias !== undefined,
    floor: input.floor !== undefined,
    floorEnabled: input.floor !== undefined && input.floor.enabled !== undefined,
  };
  const environment = input.environment === undefined ? {intensity: OBSERVATION_LIGHTING_DEFAULTS.environment.intensity} : (fields(input.environment, ['intensity'], 'lighting.environment'), {intensity: finiteOr(input.environment.intensity, OBSERVATION_LIGHTING_DEFAULTS.environment.intensity, 'lighting.environment.intensity', 0, OBSERVATION_STAGE_LIMITS.maxEnvironmentIntensity)});
  return {
    schema: 'dsh-modeler.observation-lighting',
    schemaVersion: 1,
    mode,
    displayMode,
    provided: value !== undefined && value !== null,
    explicit,
    policy: policyReceipt(policy),
    background: input.background === undefined ? OBSERVATION_LIGHTING_DEFAULTS.background : color(input.background, 'lighting.background'),
    exposure: finiteOr(input.exposure, OBSERVATION_LIGHTING_DEFAULTS.exposure, 'lighting.exposure', 0, OBSERVATION_STAGE_LIMITS.maxExposure),
    environment,
    hemisphere: input.hemisphere === undefined ? {sky: DEFAULT_HEMISPHERE.sky, ground: DEFAULT_HEMISPHERE.ground, intensity: DEFAULT_HEMISPHERE.intensity} : hemisphere(input.hemisphere, 'lighting.hemisphere'),
    key: input.key === undefined ? {...DEFAULT_KEY, position: [...DEFAULT_KEY.position]} : light(input.key, DEFAULT_KEY, 'lighting.key'),
    fill: input.fill === undefined ? {...DEFAULT_FILL, position: [...DEFAULT_FILL.position]} : light(input.fill, DEFAULT_FILL, 'lighting.fill'),
    rim: input.rim === undefined ? {...DEFAULT_RIM, position: [...DEFAULT_RIM.position]} : light(input.rim, DEFAULT_RIM, 'lighting.rim'),
    shadows: input.shadows === undefined ? {...DEFAULT_SHADOWS} : shadows(input.shadows, 'lighting.shadows'),
    floor: input.floor === undefined ? {
      requestedEnabled: DEFAULT_FLOOR.enabled,
      enabled: policy.floorAllowed ? DEFAULT_FLOOR.enabled : false,
      forcedOff: !policy.floorAllowed && DEFAULT_FLOOR.enabled,
      mirror: DEFAULT_FLOOR.mirror,
      tint: DEFAULT_FLOOR.tint,
      shadow: DEFAULT_FLOOR.shadow,
      size: null,
      position: null,
      roughness: DEFAULT_FLOOR.roughness,
      metalness: DEFAULT_FLOOR.metalness,
    } : floor(input.floor, 'lighting.floor', policy),
  };
}

/** True for every accepted existing observation-channel mode. */
export function isObservationMode(mode) {
  return typeof mode === 'string' && MODE_SET.has(mode);
}

/**
 * Rebase an already-normalized lighting receipt onto a new mode/displayMode axis
 * without re-reading its normalized fields as raw input. Values, `provided` and
 * `explicit` are preserved; only the policy and the diagnostic floor policy are
 * recomputed. This is the accepted path for viewport transient state and for a
 * renderer request that already carries the Host-normalized lighting object.
 */
export function rebaseObservationLighting(lighting, {mode = lighting?.mode, displayMode = lighting?.displayMode} = {}) {
  if (lighting?.schema !== 'dsh-modeler.observation-lighting') return normalizeObservationLighting(lighting, {mode: mode || 'material', displayMode: displayMode || 'normal'});
  const policy = observationStagePolicy(mode, displayMode);
  const requestedEnabled = lighting.floor?.requestedEnabled !== undefined ? lighting.floor.requestedEnabled : lighting.floor?.enabled !== undefined ? lighting.floor.enabled : DEFAULT_FLOOR.enabled;
  return {
    ...lighting,
    mode,
    displayMode,
    policy: policyReceipt(policy),
    floor: {...lighting.floor, requestedEnabled, enabled: policy.floorAllowed ? requestedEnabled : false, forcedOff: !policy.floorAllowed && requestedEnabled},
  };
}

/**
 * Pure merge plan for observation. Base order is studio defaults -> authored
 * asset renderStage (the `stage` receipt produced by applyRenderStage) ->
 * explicit transient `lighting` fields. A transient key/fill/rim/hemisphere
 * field switches light ownership to the observation defaults; otherwise stage
 * lights remain authoritative and are reported as such. A transient floor field
 * replaces the stage floor; without one, an authored stage floor is preserved.
 * Diagnostic displayModes force only floor off and a flat background; they keep
 * the effective lights/shadows/exposure. The returned plan is data-only and is
 * the receipt's effective configuration.
 */
export function resolveObservationPlan(lighting, stage = null, {mode, displayMode} = {}) {
  const normalized = lighting?.schema === 'dsh-modeler.observation-lighting'
    ? rebaseObservationLighting(lighting, {mode: mode || lighting.mode, displayMode: displayMode || lighting.displayMode})
    : normalizeObservationLighting(lighting, {mode: mode || lighting?.mode || 'material', displayMode: displayMode || lighting?.displayMode || 'normal'});
  const policy = normalized.policy, explicit = normalized.explicit || {};
  const stageActive = stage?.mode === 'stage';
  const stageLights = stageActive && Array.isArray(stage.lights) ? stage.lights : [];
  const stageOwnedLights = stageLights.filter(light => String(light?.name || '').startsWith('modeler-stage-'));
  const stageOwnedHemisphere = stageActive && String(stage.hemisphere?.name || '').startsWith('modeler-stage-') ? stage.hemisphere : null;
  const explicitLights = !!(explicit.key || explicit.fill || explicit.rim || explicit.hemisphere);
  const hasAuthoredLights=stageActive&&(stageOwnedLights.length||stageOwnedHemisphere||stage.authoredFields?.includes('lights')||stage.authoredFields?.includes('hemisphere'));
   const lightOwner = explicitLights ? 'observation' : hasAuthoredLights ? 'asset-stage' : 'studio-default';
  const stageFloor = stageActive ? stage.floor || null : null;
  let floor;
  if (!policy.floorAllowed) floor = {enabled: false, source: 'display-mode'};
  else if (explicit.floor) floor = {enabled: normalized.floor.enabled, source: 'observation', spec: normalized.floor};
  else if (stageFloor) floor = {enabled: true, source: 'asset-stage', spec: stageFloor};
  else floor = {enabled: normalized.floor.enabled, source: 'observation-default', spec: normalized.floor};
  const background = !policy.floorAllowed
    ? {value: explicit.background ? normalized.background : OBSERVATION_LIGHTING_DEFAULTS.background, source: 'diagnostic-flat'}
    : explicit.background
      ? {value: normalized.background, source: 'transient'}
      : stageActive && stage.background !== undefined
        ? {value: stage.background, source: 'asset-stage'}
        : {value: OBSERVATION_LIGHTING_DEFAULTS.background, source: 'default'};
  const exposure = explicit.exposure ? normalized.exposure : stageActive ? stage.exposure ?? OBSERVATION_LIGHTING_DEFAULTS.exposure : OBSERVATION_LIGHTING_DEFAULTS.exposure;
  const shadowsEnabled = explicit.shadowEnabled ? normalized.shadows.enabled : stageActive ? !!stage.shadows : OBSERVATION_LIGHTING_DEFAULTS.shadows.enabled;
  const baseEnvironment = stageActive && Number.isFinite(stage.environmentIntensity) ? stage.environmentIntensity : OBSERVATION_LIGHTING_DEFAULTS.environment.intensity;
  const environmentOverride = explicit.environment ? normalized.environment.intensity : null;
  const effectiveEnvironment = environmentOverride === null ? baseEnvironment : environmentOverride;
  const lights = lightOwner === 'asset-stage'
    ? {source: 'asset-stage', hemisphere: stage.hemisphere || null, lights: stageOwnedLights, key: null, fill: null, rim: null}
    : {source: lightOwner === 'observation' ? 'transient-observation' : 'studio-default', hemisphere: normalized.hemisphere, key: normalized.key, fill: normalized.fill, rim: normalized.rim, lights: []};
  return {
    schema: 'dsh-modeler.observation-plan',
    schemaVersion: 1,
    mode: normalized.mode,
    displayMode: normalized.displayMode,
    policy,
    stage: {active: stageActive, mode: stage?.mode || 'default'},
    background,
    exposure,
    environment: {base: baseEnvironment, override: environmentOverride, effective: effectiveEnvironment, source: explicit.environment ? 'transient' : stageActive ? 'asset-stage' : 'default'},
    shadows: {enabled: shadowsEnabled, mapSize: normalized.shadows.mapSize, bias: normalized.shadows.bias, normalBias: normalized.shadows.normalBias, source: explicit.shadowEnabled ? 'transient' : stageActive ? 'asset-stage' : 'default'},
    lightOwner,
    lights,
    floor,
    explicit,
  };
}
