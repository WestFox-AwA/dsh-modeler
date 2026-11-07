import * as THREE from './vendor/three.js';

// Synchronous, material-owned UV maps. No image loaders, external sources or
// shared texture cache are used here. Every descriptor field is validated.
const CHANNELS = Object.freeze({baseColor:'map', roughness:'roughnessMap', metalness:'metalnessMap', normal:'normalMap', emissive:'emissiveMap', ao:'aoMap', clearcoat:'clearcoatMap', clearcoatRoughness:'clearcoatRoughnessMap'});
const TEXTURE_LIMIT = 512;
const IMAGE_LIMIT = 2048;
const CHANNEL_LIMIT = 1024 * 1024;
const MAX_ANISOTROPY = 16;
const has = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const optional = (value, key, fallback) => has(value, key) ? value[key] : fallback;
const clamp = value => Math.max(0, Math.min(1, value));

function fail(path, message) { throw new TypeError(`${path}: ${message}`); }
function record(value, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) fail(path, 'expected a plain object');
  return value;
}
function fields(value, allowed, path) {
  record(value, path);
  for (const key of Reflect.ownKeys(value)) if (typeof key !== 'string' || !allowed.includes(key)) fail(path, `unsupported field ${String(key)}`);
}
function number(value, min, max, path, integer = false) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) fail(path, `expected ${integer ? 'an integer' : 'a finite number'} from ${min} to ${max}`);
  return value;
}
function boolean(value, path) { if (typeof value !== 'boolean') fail(path, 'expected a boolean'); return value; }
function vector(value, length, path, min = -1e6, max = 1e6) {
  if (!Array.isArray(value) || value.length !== length) fail(path, `expected ${length} finite components`);
  return Array.from(value, (item, index) => number(item, min, max, `${path}[${index}]`));
}
function pair(value, path, min, max, integer = false) {
  if (typeof value === 'number') return [number(value, min, max, path, integer), value];
  const out = vector(value, 2, path, min, max);
  if (integer) out.forEach((item, index) => number(item, min, max, `${path}[${index}]`, true));
  return out;
}

// Texture palette components are encoded values (unit RGB/RGBA), so scalar
// channels are never accidentally converted through Three's color management.
function rgba(value, path, allowAlpha = true) {
  let result;
  if (typeof value === 'string') {
    const match = /^#([a-f\d]{3}|[a-f\d]{4}|[a-f\d]{6}|[a-f\d]{8})$/i.exec(value);
    if (match) {
      let hex = match[1];
      if (hex.length < 5) hex = [...hex].map(char => char + char).join('');
      result = [0, 2, 4].map(index => parseInt(hex.slice(index, index + 2), 16) / 255);
      result.push(hex.length === 8 ? parseInt(hex.slice(6), 16) / 255 : 1);
    } else {
      const name = value.toLowerCase();
      if (!has(THREE.Color.NAMES, name)) fail(path, 'expected a hex color, a Three color name, an RGB integer, or unit RGB/RGBA components');
      return rgba(THREE.Color.NAMES[name], path, allowAlpha);
    }
  } else if (typeof value === 'number') {
    const hex = number(value, 0, 0xffffff, path, true);
    result = [(hex >>> 16) / 255, ((hex >>> 8) & 255) / 255, (hex & 255) / 255, 1];
  } else if (Array.isArray(value) && (value.length === 3 || value.length === 4)) {
    result = Array.from(value, (item, index) => number(item, 0, 1, `${path}[${index}]`));
    if (result.length === 3) result.push(1);
  } else fail(path, 'expected a hex color, a Three color name, an RGB integer, or unit RGB/RGBA components');
  if (!allowAlpha && result[3] !== 1) fail(path, 'this Three color property does not support alpha');
  return result;
}
function color(value, path) {
  const components = rgba(value, path, false);
  return new THREE.Color().setRGB(components[0], components[1], components[2], THREE.SRGBColorSpace);
}
function palette(value, fallback, path) {
  if (value === undefined) return fallback.map((item, index) => rgba(item, `${path}[${index}]`));
  if (!Array.isArray(value) || value.length !== 2) fail(path, 'expected exactly two colors');
  return value.map((item, index) => rgba(item, `${path}[${index}]`));
}
function dimensions(descriptor, path) {
  if (has(descriptor, 'size') && (has(descriptor, 'width') || has(descriptor, 'height'))) fail(path, 'size cannot be combined with width/height');
  if (has(descriptor, 'width') !== has(descriptor, 'height')) fail(path, 'width and height must be supplied together');
  if (descriptor.type === 'pixels' && !has(descriptor, 'size') && !has(descriptor, 'width')) fail(path, 'pixels require size or width and height');
  const size = has(descriptor, 'size') ? pair(descriptor.size, `${path}.size`, 1, TEXTURE_LIMIT, true) : has(descriptor, 'width') ? [number(descriptor.width, 1, TEXTURE_LIMIT, `${path}.width`, true), number(descriptor.height, 1, TEXTURE_LIMIT, `${path}.height`, true)] : [64, 64];
  if (size[0] * size[1] * 4 > CHANNEL_LIMIT) fail(path, `RGBA data exceeds ${CHANNEL_LIMIT} channels`);
  return size;
}
function appearanceImage(descriptor, appearanceAssets, path) {
  const fromFile = typeof descriptor.file === 'string' ? /(?:^|[\\/])image-([a-f\d]{64})\.png$/i.exec(descriptor.file)?.[1]?.toLowerCase() : undefined;
  const image = descriptor.image ?? fromFile;
  if (typeof image !== 'string' || !/^[a-f\d]{64}$/i.test(image)) fail(`${path}.image`, 'expected a SHA-256 image hash or image-<hash>.png file');
  if (descriptor.file !== undefined && (!fromFile || fromFile !== image.toLowerCase())) fail(`${path}.file`, 'image filename must match its image hash');
  record(appearanceAssets, 'snapshot.appearanceAssets');
  const asset = appearanceAssets[image.toLowerCase()];
  if (!asset) fail(path, `appearance_image_missing: ${image}`);
  record(asset, `snapshot.appearanceAssets.${image}`);
  const width = number(asset.width, 1, IMAGE_LIMIT, `${path}.image.width`, true), height = number(asset.height, 1, IMAGE_LIMIT, `${path}.image.height`, true);
  const count = width * height * 4;
  let decoded;if(asset.data instanceof Uint8Array){if(asset.data.length!==count)fail(path,'Wrong decoded material image length');decoded=asset.data;}else{
  if (typeof asset.data !== 'string' || asset.data.length !== Math.ceil(count / 3) * 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(asset.data)) fail(`${path}.image.data`, `expected base64 encoding of exactly ${count} RGBA bytes`);
  try {
    if (typeof globalThis.atob === 'function') {
      const bytes = globalThis.atob(asset.data);
      if (bytes.length !== count) fail(`${path}.image.data`, `expected exactly ${count} decoded RGBA bytes`);
      decoded = new Uint8Array(count);
      for (let index = 0; index < count; index++) decoded[index] = bytes.charCodeAt(index);
    } else if (globalThis.Buffer?.from) decoded = new Uint8Array(globalThis.Buffer.from(asset.data, 'base64'));
    else fail(`${path}.image.data`, 'base64 decoding is unavailable');
  } catch (error) { fail(`${path}.image.data`, `invalid RGBA base64: ${error.message}`); }
  if (decoded.length !== count) fail(`${path}.image.data`, `expected exactly ${count} decoded RGBA bytes`);
  }
  // PNG assets are top-down; native UVs and existing DataTextures use bottom-up
  // rows. Flip owned bytes, never source UVs or the shared snapshot payload.
  const data = new Uint8Array(count), stride = width * 4;
  for (let y = 0; y < height; y++) data.set(decoded.subarray(y * stride, (y + 1) * stride), (height - y - 1) * stride);
  return {width, height, data, image:image.toLowerCase()};
}
function textureSpec(descriptor, channel, appearanceAssets) {
  const path = `material.textures.${channel}`;
  record(descriptor, path);
  const type = descriptor.type;
  if (!['checker', 'carbon', 'noise', 'pixels', 'flatnormal', 'image'].includes(type)) fail(`${path}.type`, 'expected checker, carbon, noise, pixels, flatnormal or image');
  if (channel === 'normal' && !['flatnormal', 'pixels', 'image'].includes(type)) fail(path, 'normal maps require flatnormal or tangent-space RGBA pixels/image');
  if (channel !== 'normal' && type === 'flatnormal') fail(path, 'flatnormal is supported only in the normal channel');
  const allowed = ['type', 'scale', 'anisotropy', 'colorSpace'];
  if (type === 'image') allowed.push('image', 'file', 'texCoord');
  else allowed.push('size', 'width', 'height');
  if (type === 'pixels') allowed.push('data');
  if (['checker', 'carbon', 'noise'].includes(type)) allowed.push('colors');
  if (['carbon', 'noise'].includes(type)) allowed.push('seed');
  if (['roughness', 'metalness', 'ao'].includes(channel)) allowed.push('channel');
  if (channel === 'normal') allowed.push('normalY', 'normalScale');
  fields(descriptor, allowed, path);
  const colorSpace = ['baseColor', 'emissive'].includes(channel) ? 'srgb' : 'linear';
  if (has(descriptor, 'colorSpace') && descriptor.colorSpace !== colorSpace) fail(`${path}.colorSpace`, `expected ${colorSpace} for ${channel}`);
  const texCoord = has(descriptor, 'texCoord') ? number(descriptor.texCoord, 0, 1, `${path}.texCoord`, true) : 0;
  if (has(descriptor, 'channel') && !['r', 'g', 'b'].includes(descriptor.channel)) fail(`${path}.channel`, 'expected r, g or b');
  if (has(descriptor, 'normalY') && !['up', 'down'].includes(descriptor.normalY)) fail(`${path}.normalY`, 'expected up or down');
  const normalScale = has(descriptor, 'normalScale') ? pair(descriptor.normalScale, `${path}.normalScale`, 0, 100) : undefined;
  const image = type === 'image' ? appearanceImage(descriptor, appearanceAssets, path) : null;
  const [width, height] = image ? [image.width, image.height] : dimensions(descriptor, path);
  const scale = has(descriptor, 'scale') ? pair(descriptor.scale, `${path}.scale`, 1e-6, 1024) : [1, 1];
  const anisotropy = has(descriptor, 'anisotropy') ? number(descriptor.anisotropy, 1, MAX_ANISOTROPY, `${path}.anisotropy`, true) : 1;
  const seed = has(descriptor, 'seed') ? number(descriptor.seed, 0, 0xffffffff, `${path}.seed`, true) : 1;
  let data = image?.data, colors;
  if (type === 'pixels') {
    const input = descriptor.data;
    if (!(Array.isArray(input) || input instanceof Uint8Array || input instanceof Uint8ClampedArray) || input.length !== width * height * 4) fail(`${path}.data`, `expected exactly ${width * height * 4} RGBA byte components`);
    data = new Uint8Array(input.length);
    for (let index = 0; index < input.length; index++) data[index] = number(input[index], 0, 255, `${path}.data[${index}]`, true);
  } else if (!image && type !== 'flatnormal') colors = palette(descriptor.colors, type === 'carbon' ? ['#090b0f', '#48505c'] : ['#202630', '#c3cad4'], `${path}.colors`);
  return {type, width, height, scale, anisotropy, seed, data, colors, image:image?.image, component:descriptor.channel ?? (image && ['roughness', 'metalness', 'ao'].includes(channel) ? 'r' : undefined), invertGreen:descriptor.normalY === 'down', normalScale, texCoord};
}
function hashPixel(x, y, seed) {
  let hash = Math.imul(x + 1, 0x1f123bb5) ^ Math.imul(y + 1, 0x5f356495) ^ seed;
  hash = Math.imul(hash ^ (hash >>> 16), 0x7feb352d);
  hash = Math.imul(hash ^ (hash >>> 15), 0x846ca68b);
  return ((hash ^ (hash >>> 16)) >>> 0) / 0xffffffff;
}
function textureData(spec) {
  if (spec.data) return spec.data;
  const {width, height, type, seed, colors} = spec, data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const offset = (y * width + x) * 4;
    if (type === 'flatnormal') { data.set([128, 128, 255, 255], offset); continue; }
    const u = x / width * 8, v = y / height * 8;
    let mix;
    if (type === 'checker') mix = (Math.floor(u) + Math.floor(v)) % 2;
    else if (type === 'noise') mix = hashPixel(x, y, seed);
    else {
      // Two-over/two-under carbon weave, with independent seeded fibre grain.
      // This is strictly an albedo/scalar pattern, never a claimed bump map.
      const warp = (Math.floor(u) + Math.floor(v)) % 4 < 2, cross = warp ? v : u, along = warp ? u : v;
      const tow = Math.sin(Math.PI * (cross - Math.floor(cross)));
      const fibre = Math.cos(2 * Math.PI * cross * 6);
      mix = clamp(.12 + .65 * tow + .08 * fibre + .07 * Math.cos(2 * Math.PI * along) + .08 * hashPixel(x, y, seed));
    }
    for (let component = 0; component < 4; component++) data[offset + component] = Math.round((colors[0][component] * (1 - mix) + colors[1][component] * mix) * 255);
  }
  return data;
}

/**
 * Return material constructor props from materialSpec.textures. Channel keys are
 * baseColor/roughness/metalness/normal/emissive/ao. Size is an integer or [w,h],
 * alternatively width+height (1..512); pixels require explicit dimensions and
 * flat RGBA bytes. Image descriptors resolve SHA-256 keys in appearanceAssets
 * (1..2048, PNG top-down base64 RGBA), copied into bottom-up texture rows without
 * changing source UVs. Image scalar maps default to R; explicit R/G/B components
 * replicate to RGB for Three's channel conventions. Normal Y down inverts G.
 * Supplied colorSpace must be srgb for baseColor/emissive, linear otherwise.
 * Scale is UV repeat, a positive scalar or [u,v] <=1024.
 * Image texCoord selects uv=0 (default) or uv1=1 without changing either buffer.
 * Palettes contain exactly two colors; noise/carbon accept a uint32 seed.
 * Anisotropy is an integer 1..16 (Three further clamps it to GPU capability).
 * Each call owns fresh DataTextures; the receiving material must dispose them.
 */
export function materialTextures(materialSpec = {}, appearanceAssets = {}) {
  record(materialSpec, 'material');
  if (!has(materialSpec, 'textures')) return {};
  fields(materialSpec.textures, Object.keys(CHANNELS), 'material.textures');
  // Validate and copy every descriptor before allocating any Three resource.
  const specs = Object.keys(materialSpec.textures).map(channel => [channel, textureSpec(materialSpec.textures[channel], channel, appearanceAssets)]);
  const props = {};
  try {
    for (const [channel, spec] of specs) {
      const data = textureData(spec);
      if (spec.component || spec.invertGreen) for (let offset = 0; offset < data.length; offset += 4) {
        if (spec.component) data[offset] = data[offset + 1] = data[offset + 2] = data[offset + {r:0, g:1, b:2}[spec.component]];
        if (spec.invertGreen) data[offset + 1] = 255 - data[offset + 1];
      }
      const texture = new THREE.DataTexture(data, spec.width, spec.height, THREE.RGBAFormat, THREE.UnsignedByteType);
      props[CHANNELS[channel]] = texture;
      if (spec.normalScale) props.normalScale = new THREE.Vector2(...spec.normalScale);
      texture.name = `modeler-${channel}-${spec.type}`;
      texture.colorSpace = channel === 'baseColor' || channel === 'emissive' ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.fromArray(spec.scale);
      texture.anisotropy = spec.anisotropy;
      texture.channel = spec.texCoord;
      texture.flipY = false;
      texture.magFilter = ['pixels', 'checker', 'flatnormal'].includes(spec.type) ? THREE.NearestFilter : THREE.LinearFilter;
      texture.minFilter = spec.type === 'image' ? THREE.LinearMipmapLinearFilter : texture.magFilter;
      texture.generateMipmaps = spec.type === 'image';
      if (spec.image) texture.userData = {appearanceImage:spec.image, sourceRows:'png-top-down', storedRows:'bottom-up', normalY:'up'};
      texture.needsUpdate = true;
    }
    return props;
  } catch (error) {
    for (const texture of Object.values(props)) if (texture?.isTexture) texture.dispose();
    throw error;
  }
}

function stageDefaults(defaults) {
  record(defaults, 'defaults');
  // Other STUDIO_CONFIG fields describe the renderer/environment setup and are
  // intentionally left to the parent. Only consumed defaults are read here.
  return {
    sky:color(defaults.hemisphereSky ?? '#d7e8ff', 'defaults.hemisphereSky'),
    ground:color(defaults.hemisphereGround ?? '#59606c', 'defaults.hemisphereGround'),
    hemisphereIntensity:number(defaults.hemisphereIntensity ?? 2, 0, 1e4, 'defaults.hemisphereIntensity'),
    keyColor:color(defaults.keyColor ?? '#ffffff', 'defaults.keyColor'),
    keyIntensity:number(defaults.keyIntensity ?? 3, 0, 1e6, 'defaults.keyIntensity'),
    keyPosition:vector(defaults.keyPosition ?? [4, 7, 5], 3, 'defaults.keyPosition'),
  };
}
function lightSpec(input, index, defaults) {
  const path = `stage.lights[${index}]`;
  record(input, path);
  if (!['directional', 'point', 'spot'].includes(input.type)) fail(`${path}.type`, 'expected directional, point or spot');
  const allowed = ['type', 'color', 'intensity', 'position', 'shadow'];
  if (input.type !== 'point') allowed.push('target');
  if (input.type !== 'directional') allowed.push('distance');
  if (input.type === 'spot') allowed.push('angle', 'penumbra');
  fields(input, allowed, path);
  const result = {
    type:input.type,
    color:has(input, 'color') ? color(input.color, `${path}.color`) : defaults.keyColor.clone(),
    intensity:number(optional(input, 'intensity', input.type === 'directional' ? defaults.keyIntensity : 1), 0, 1e6, `${path}.intensity`),
    position:vector(optional(input, 'position', defaults.keyPosition), 3, `${path}.position`),
    shadow:has(input, 'shadow') ? boolean(input.shadow, `${path}.shadow`) : undefined,
  };
  if (input.type !== 'point') {
    result.target = vector(optional(input, 'target', [0, 0, 0]), 3, `${path}.target`);
    if (result.target.every((value, component) => value === result.position[component])) fail(`${path}.target`, 'must differ from the light position');
  }
  if (input.type !== 'directional') {
    result.distance = number(optional(input, 'distance', 0), 0, 1e6, `${path}.distance`);
    if (result.distance > 0 && result.distance <= .01) fail(`${path}.distance`, 'a finite light range must exceed the shadow near plane (.01)');
  }
  if (input.type === 'spot') {
    result.angle = number(optional(input, 'angle', Math.PI / 3), 1e-6, Math.PI / 2, `${path}.angle`);
    result.penumbra = number(optional(input, 'penumbra', 0), 0, 1, `${path}.penumbra`);
  }
  return result;
}
function stageSpec(stage, defaults) {
  if (stage === undefined || stage === null) return null;
  fields(stage, ['background', 'exposure', 'environmentIntensity', 'hemisphere', 'lights', 'floor', 'shadows', 'shadowSpan'], 'stage');
  const out = {shadowSpan:number(optional(stage, 'shadowSpan', 20), .001, 1e5, 'stage.shadowSpan')};
  if (has(stage, 'background')) out.background = stage.background === null ? null : color(stage.background, 'stage.background');
  if (has(stage, 'exposure')) out.exposure = number(stage.exposure, 0, 100, 'stage.exposure');
  if (has(stage, 'environmentIntensity')) out.environmentIntensity = number(stage.environmentIntensity, 0, 100, 'stage.environmentIntensity');
  if (has(stage, 'shadows')) out.shadows = boolean(stage.shadows, 'stage.shadows');
  if (has(stage, 'hemisphere')) {
    fields(stage.hemisphere, ['sky', 'ground', 'intensity'], 'stage.hemisphere');
    out.hemisphere = {
      sky:has(stage.hemisphere, 'sky') ? color(stage.hemisphere.sky, 'stage.hemisphere.sky') : defaults.sky.clone(),
      ground:has(stage.hemisphere, 'ground') ? color(stage.hemisphere.ground, 'stage.hemisphere.ground') : defaults.ground.clone(),
      intensity:number(optional(stage.hemisphere, 'intensity', defaults.hemisphereIntensity), 0, 1e4, 'stage.hemisphere.intensity'),
    };
  }
  if (has(stage, 'lights')) {
    if (!Array.isArray(stage.lights) || stage.lights.length > 8) fail('stage.lights', 'expected at most eight lights');
    out.lights = stage.lights.map((light, index) => lightSpec(light, index, defaults));
  }
  if (has(stage, 'floor')) {
    const floor = stage.floor;
    fields(floor, ['size', 'position', 'color', 'roughness', 'metalness', 'shadow', 'normal'], 'stage.floor');
    const normal = vector(optional(floor, 'normal', [0, 1, 0]), 3, 'stage.floor.normal');
    const length = Math.hypot(...normal);
    if (length < 1e-12) fail('stage.floor.normal', 'expected a nonzero normal');
    out.floor = {
      size:pair(optional(floor, 'size', 20), 'stage.floor.size', 1e-6, 1e5),
      position:vector(optional(floor, 'position', [0, 0, 0]), 3, 'stage.floor.position'),
      color:color(optional(floor, 'color', '#454b55'), 'stage.floor.color'),
      roughness:number(optional(floor, 'roughness', .8), 0, 1, 'stage.floor.roughness'),
      metalness:number(optional(floor, 'metalness', 0), 0, 1, 'stage.floor.metalness'),
      shadow:has(floor, 'shadow') ? boolean(floor.shadow, 'stage.floor.shadow') : undefined,
      normal:normal.map(value => value / length),
    };
  }
  return out;
}
function studioCheck(studio) {
  if (!studio || !studio.scene?.isScene || !studio.root?.isObject3D || !studio.renderer?.shadowMap) fail('studio', 'expected a Three scene, renderer with shadowMap, and geometry root');
  if (studio.defaultLights !== undefined && (!Array.isArray(studio.defaultLights) || studio.defaultLights.some(light => !light?.isLight))) fail('studio.defaultLights', 'expected only the exact default Three lights created by the studio');
}
function shadowSnapshot(light) {
  const shadow = light.shadow;
  return {
    light, visible:light.visible, castShadow:light.castShadow,
    shadow:shadow ? {map:shadow.map, mapPass:shadow.mapPass, mapSize:shadow.mapSize.clone(), camera:shadow.camera.clone(), bias:shadow.bias, normalBias:shadow.normalBias, radius:shadow.radius, autoUpdate:shadow.autoUpdate, needsUpdate:shadow.needsUpdate} : null,
  };
}
function restoreLight(saved) {
  const {light} = saved;
  light.visible = saved.visible;
  light.castShadow = saved.castShadow;
  if (!saved.shadow) return;
  const shadow = light.shadow, previous = saved.shadow;
  for (const key of ['map', 'mapPass']) {
    if (shadow[key] && shadow[key] !== previous[key]) shadow[key].dispose();
    shadow[key] = previous[key];
  }
  shadow.mapSize.copy(previous.mapSize);
  shadow.camera.copy(previous.camera);
  for (const key of ['bias', 'normalBias', 'radius', 'autoUpdate', 'needsUpdate']) shadow[key] = previous[key];
}
function restoreMaterials(state) {
  for (const [material, intensity] of state.materials) material.envMapIntensity = intensity;
  state.materials.clear();
}
function disposeOwned(group) {
  if (!group) return;
  group.removeFromParent();
  group.traverse(object => {
    if (object.isLight) { object.shadow?.dispose(); if (object.shadow) object.shadow.map = object.shadow.mapPass = null; }
    if (object.isMesh) {
      object.geometry.dispose();
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.dispose();
    }
  });
  group.clear();
}
function restoreStage(studio, state) {
  disposeOwned(state.group);
  state.group = null;
  restoreMaterials(state);
  for (const saved of state.defaultLights) restoreLight(saved);
  studio.scene.background = state.background;
  studio.renderer.toneMappingExposure = state.exposure;
  studio.renderer.shadowMap.enabled = state.shadowEnabled;
  studio.renderer.shadowMap.type = state.shadowType;
}
function configureShadow(light, span) {
  if (!light.shadow || !light.castShadow) return;
  const {shadow} = light;
  if (!shadow.map) shadow.mapSize.set(1024, 1024);
  shadow.bias = -.0001;
  shadow.normalBias = .01;
  shadow.camera.near = .01;
  shadow.camera.far = light.distance > .01 ? light.distance : 500;
  if (light.isDirectionalLight) {
    const half = span / 2;
    shadow.camera.left = shadow.camera.bottom = -half;
    shadow.camera.right = shadow.camera.top = half;
    shadow.camera.far = Math.max(500, new THREE.Vector3().subVectors(light.position, light.target.position).length() + span * 2);
  }
  if (light.isSpotLight) {
    shadow.camera.fov = THREE.MathUtils.radToDeg(light.angle * 2);
    shadow.camera.aspect = shadow.mapSize.x / shadow.mapSize.y;
  }
  shadow.camera.updateProjectionMatrix();
  shadow.needsUpdate = true;
}
function buildStage(spec, shadows) {
  const group = new THREE.Group();
  group.name = 'modeler-native-stage';
  group.userData.modelerStage = true;
  let floor = null;
  try {
    if (spec.hemisphere) {
      const h = spec.hemisphere, light = new THREE.HemisphereLight(h.sky, h.ground, h.intensity);
      light.name = 'modeler-stage-hemisphere';
      group.add(light);
    }
    for (const [index, input] of (spec.lights || []).entries()) {
      const light = input.type === 'directional' ? new THREE.DirectionalLight(input.color, input.intensity) : input.type === 'point' ? new THREE.PointLight(input.color, input.intensity, input.distance, 2) : new THREE.SpotLight(input.color, input.intensity, input.distance, input.angle, input.penumbra, 2);
      light.name = `modeler-stage-${input.type}-${index}`;
      group.add(light);
      light.position.fromArray(input.position);
      if (light.target) {
        light.target.name = `${light.name}-target`;
        light.target.position.fromArray(input.target);
        group.add(light.target);
      }
      light.castShadow = input.shadow ?? shadows;
      configureShadow(light, spec.shadowSpan);
    }
    if (spec.floor) {
      const input = spec.floor;
      floor = new THREE.Mesh(new THREE.PlaneGeometry(...input.size), new THREE.MeshStandardMaterial({color:input.color, roughness:input.roughness, metalness:input.metalness, side:THREE.DoubleSide}));
      floor.name = 'modeler-stage-floor';
      floor.position.fromArray(input.position);
      floor.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3().fromArray(input.normal));
      floor.receiveShadow = input.shadow ?? shadows;
      floor.castShadow = false;
      group.add(floor);
    }
    return {group, floor};
  } catch (error) { disposeOwned(group); throw error; }
}
function environmentIntensity(root, floor, state, multiplier) {
  if (multiplier === 1) return 0;
  const materials = new Set();
  const collect = object => { for (const material of Array.isArray(object.material) ? object.material : [object.material]) if (material && typeof material.envMapIntensity === 'number' && Number.isFinite(material.envMapIntensity)) materials.add(material); };
  root.traverse(collect);
  if (floor) collect(floor);
  for (const material of materials) {
    state.materials.set(material, material.envMapIntensity);
    material.envMapIntensity *= multiplier;
  }
  return materials.size;
}
function lightSettings(light) {
  const position = light.getWorldPosition(new THREE.Vector3()).toArray();
  const out = {name:light.name || null, type:light.isDirectionalLight ? 'directional' : light.isSpotLight ? 'spot' : light.isPointLight ? 'point' : light.isHemisphereLight ? 'hemisphere' : light.type, color:`#${light.color.getHexString()}`, intensity:light.intensity, position};
  if (light.isHemisphereLight) { out.sky = out.color; out.ground = `#${light.groundColor.getHexString()}`; }
  if (light.target) out.target = light.target.getWorldPosition(new THREE.Vector3()).toArray();
  if (light.isPointLight || light.isSpotLight) { out.distance = light.distance; out.decay = light.decay; }
  if (light.isSpotLight) { out.angle = light.angle; out.penumbra = light.penumbra; }
  if (light.shadow) {
    const camera = light.shadow.camera;
    out.shadow = light.castShadow;
    out.shadowMapSize = light.shadow.mapSize.toArray();
    out.shadowCamera = {near:camera.near, far:camera.far, ...(camera.isOrthographicCamera ? {left:camera.left, right:camera.right, top:camera.top, bottom:camera.bottom} : {fov:camera.fov, aspect:camera.aspect})};
  }
  return out;
}
function renderSettings(studio, spec, floor, changedMaterials = 0) {
  const lights = [];
  studio.scene.traverseVisible(object => { if (object.isLight) lights.push(lightSettings(object)); });
  const background = studio.scene.background;
  return {
    mode:spec ? 'stage' : 'default',
    background:background?.isColor ? `#${background.getHexString()}` : background === null ? null : {type:background?.type || 'Texture', uuid:background?.uuid || null},
    exposure:studio.renderer.toneMappingExposure,
    environmentIntensity:spec?.environmentIntensity ?? 1,
    hemisphere:lights.find(light => light.type === 'hemisphere') || null,
    lights:lights.filter(light => light.type !== 'hemisphere'),
    floor:floor ? {size:[floor.geometry.parameters.width, floor.geometry.parameters.height], position:floor.position.toArray(), normal:new THREE.Vector3(0, 0, 1).applyQuaternion(floor.quaternion).toArray(), color:`#${floor.material.color.getHexString()}`, roughness:floor.material.roughness, metalness:floor.material.metalness, shadow:floor.receiveShadow} : null,
    shadows:studio.renderer.shadowMap.enabled,
    shadowType:studio.renderer.shadowMap.type,
    shadowSpan:spec?.shadowSpan ?? null,
    shaderCapabilities:{
      threeRevision:THREE.REVISION,
      uvTextureChannels:{...CHANNELS},
      textureDescriptorTypes:['checker', 'carbon', 'noise', 'pixels'],
      normalDescriptorTypes:['flatnormal', 'pixels'],
      maxTextureDimension:IMAGE_LIMIT,
      maxProceduralTextureDimension:TEXTURE_LIMIT,
      maxImagePixels:IMAGE_LIMIT*IMAGE_LIMIT,
      maxTextureChannels:IMAGE_LIMIT*IMAGE_LIMIT*4,
      maxProceduralTextureChannels:CHANNEL_LIMIT,
      maxDescriptorAnisotropy:MAX_ANISOTROPY,
      colorTextureColorSpace:THREE.SRGBColorSpace,
      dataTextureColorSpace:THREE.NoColorSpace,
      lightTypes:['directional', 'point', 'spot'],
      maxStageLights:8,
      shadows:{enabled:studio.renderer.shadowMap.enabled, type:studio.renderer.shadowMap.type, typeName:studio.renderer.shadowMap.type === THREE.PCFSoftShadowMap ? 'PCFSoftShadowMap' : 'renderer-default'},
      environment:{present:!!studio.scene.environment, application:'material.envMapIntensity multiplier', multiplier:spec?.environmentIntensity ?? 1, changedMaterials},
      defaultLightsRegistered:(studio.defaultLights || []).length,
    },
  };
}

/**
 * Apply a validated native stage, returning actual light/floor/renderer settings
 * plus shaderCapabilities. Optional fields: background (opaque color or null),
 * exposure/environmentIntensity 0..100, hemisphere {sky,ground,intensity},
 * lights (<=8 directional/point/spot descriptors), floor, shadows, shadowSpan.
 * Spot angles are radians. Floor size is a scalar or [width,height]; its normal
 * defaults to +Y. Floor and light targets live outside studio.root.
 *
 * Register studio.defaultLights=[hemisphere,key] at studio creation. Only these
 * defaults may be suppressed/modified; other scene lights are always preserved.
 * Missing lights/hemisphere retain their exact registered default behavior.
 * Missing stage (undefined/null) and disposeRenderStage restore prior defaults.
 * Three r160 has no scene.environmentIntensity: current root/floor materials'
 * envMapIntensity is multiplied, preserving each material's authored value.
 * Reapply after replacing meshes and after configuring renderer exposure.
 */
export function applyRenderStage(studio, stage, defaults = {}) {
  studioCheck(studio);
  const normalizedDefaults = stageDefaults(defaults), spec = stageSpec(stage, normalizedDefaults);
  if (!spec) {
    disposeRenderStage(studio);
    return renderSettings(studio, null, null);
  }
  const prior = studio._nativeStage;
  const shadows = spec.shadows ?? prior?.shadowEnabled ?? studio.renderer.shadowMap.enabled;
  // Build off-scene first: validation/construction errors retain the prior stage.
  const next = buildStage(spec, shadows);
  let state = prior;
  if (!state) {
    state = {
      group:null, materials:new Map(),
      background:studio.scene.background,
      exposure:studio.renderer.toneMappingExposure,
      shadowEnabled:studio.renderer.shadowMap.enabled,
      shadowType:studio.renderer.shadowMap.type,
      defaultLights:[...new Set(studio.defaultLights || [])].map(shadowSnapshot),
    };
  }
  restoreStage(studio, state);
  studio._nativeStage = state;
  state.group = next.group;
  studio.scene.background = has(spec, 'background') ? spec.background : state.background;
  studio.renderer.toneMappingExposure = spec.exposure ?? state.exposure;
  studio.renderer.shadowMap.enabled = shadows;
  studio.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  for (const saved of state.defaultLights) {
    const {light} = saved;
    if ((spec.hemisphere && light.isHemisphereLight) || (spec.lights && !light.isHemisphereLight)) light.visible = false;
    if (light.visible && shadows && light.shadow) { light.castShadow = true; configureShadow(light, spec.shadowSpan); }
  }
  if (next.group.children.length) studio.scene.add(next.group);
  const changed = environmentIntensity(studio.root, next.floor, state, spec.environmentIntensity ?? 1);
  return renderSettings(studio, spec, next.floor, changed);
}

/** Dispose only stage-owned resources, then restore the captured studio defaults. */
export function disposeRenderStage(studio) {
  const state = studio?._nativeStage;
  if (!state) return;
  restoreStage(studio, state);
  delete studio._nativeStage;
}
