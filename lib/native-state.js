import { isMetadataRef } from './metadata-store.js';

// Only these root-level fields are backend output. Fields nested in source
// or features (raw buffers, selection stamps, provenance) remain source data.
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
export const NATIVE_CACHE_PARAMS = Object.freeze(['mesh', 'sourceHash', 'topologyStamp', 'counts', 'warnings', 'backendVersion', 'backendImplementation', 'relations', 'interfaceFrames']);
export const NATIVE_CACHE_OBJECT_FIELDS = Object.freeze(['geometryData', 'materialSlots']);
const cacheParams = new Set(NATIVE_CACHE_PARAMS);
export const isNativeRecipe = recipe => recipe?.type === 'nativeMesh' && recipe.params?.schemaVersion === 1 && record(recipe.params.source) && typeof recipe.params.source.type === 'string' && Array.isArray(recipe.params.features);
export function nativeSourceParams(params) {
  if (!record(params)) return params;
  return Object.fromEntries(Object.entries(params).filter(([key]) => !cacheParams.has(key)));
}
export const hasNativeCacheParams = params => record(params) && NATIVE_CACHE_PARAMS.some(key => own(params, key));
// A view for the next metadata write, never a read-time migration. Do not infer
// native ownership from field names on non-native/legacy parameter overrides.
export function nativeOverrideView(overrides) {
  if (isMetadataRef(overrides)) return overrides;
  let changed = false;
  const out = [];
  for (const override of overrides) {
    if (override.op !== 'parameters' || override.recipeType !== 'nativeMesh' || !hasNativeCacheParams(override.patch)) { out.push(override); continue; }
    changed = true;
    const patch = nativeSourceParams(override.patch);
    if (Object.keys(patch).length) out.push({ ...override, patch });
  }
  return changed ? out : overrides;
}
export function nativeManifestView(manifest) {
  const overrides = nativeOverrideView(manifest.overrides);
  let changed = overrides !== manifest.overrides;
  const history = manifest.history.map(entry => {
    const view = nativeOverrideView(entry.overrides);
    if (view === entry.overrides) return entry;
    changed = true; return { ...entry, overrides: view };
  });
  const projectHeads = Object.fromEntries(Object.entries(manifest.projectHeads).map(([id, head]) => {
    const view = nativeOverrideView(head.overrides);
    if (view === head.overrides) return [id, head];
    changed = true; return [id, { ...head, overrides: view }];
  }));
  return changed ? { ...manifest, overrides, history, projectHeads } : manifest;
}
