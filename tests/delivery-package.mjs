import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  buildDeliveryPackage,
  deliveryDigest,
  DELIVERY_SCHEMA,
  DELIVERY_SCHEMA_VERSION,
  DELIVERY_LIMITS,
  DELIVERY_MATERIAL_FIDELITY,
} from '../lib/delivery-package.js';

const tests = [];
async function run(name, fn) {
  try { await fn(); tests.push({name, passed: true}); }
  catch (error) { tests.push({name, passed: false, error: error.stack}); }
}
const clone = value => JSON.parse(JSON.stringify(value));
const box = (overrides = {}) => ({
  id: 'part', name: 'Part', kind: 'box',
  position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1],
  params: {w: 1, h: 2, d: 1},
  material: {color: '#aa6633', metalness: 0.1, roughness: 0.5, opacity: 1},
  ...overrides,
});
const scene = objects => ({version: 1, objects});
const build = (doc, options = {}) => buildDeliveryPackage({assetId: 'asset-1', revision: 3, doc}, options);

await run('schema/version/identity and complete geometry are self-describing', () => {
  const pkg = build(scene([box()]), {producerVersion: '0.20.1'});
  assert.equal(pkg.schema, DELIVERY_SCHEMA);
  assert.equal(pkg.schemaVersion, DELIVERY_SCHEMA_VERSION);
  assert.equal(pkg.producer.package, '@local/dsh-modeler');
  assert.equal(pkg.producer.version, '0.20.1');
  assert.equal(pkg.producer.kernelVersion, '2.0.0');
  assert.equal(pkg.source.provider, 'modeler');
  assert.equal(pkg.source.assetId, 'asset-1');
  assert.equal(pkg.source.revision, 3);
  assert.match(pkg.source.contentHash, /^[a-f0-9]{64}$/);
  assert.equal(pkg.source.units, 'meters');
  assert.equal(pkg.source.axes, 'Y-up');
  assert.equal(pkg.source.matrixLayout, 'column-major');
  assert.equal(pkg.triangles, 12);
  assert.equal(pkg.nodes.length, 1);
  assert.equal(pkg.leaves.length, 1);
  assert.equal(pkg.nodes[0].id, 'part');
  assert.equal(pkg.nodes[0].parent, null);
  assert.equal(pkg.nodes[0].matrix.length, 16);
  assert.equal(pkg.leaves[0].positions.length, 108);
  assert.equal(pkg.leaves[0].normals.length, 108);
  assert.equal(pkg.leaves[0].uvs, null);
  assert.deepEqual(pkg.leaves[0].triangleMaterials, new Array(12).fill(0));
  assert.equal(pkg.leaves[0].materials[0].color, '#aa6633');
  assert.equal(pkg.limitations.fidelity, DELIVERY_MATERIAL_FIDELITY);
  assert.ok(pkg.limitations.unsupported.includes('procedural'));
  assert.ok(pkg.limitations.unsupported.includes('surface'));
  assert.equal(pkg.digest, deliveryDigest(Object.fromEntries(Object.entries(pkg).filter(([key]) => key !== 'digest'))));
});

await run('package is deterministic and plain JSON, not typed arrays', () => {
  const doc = scene([box()]);
  const first = build(doc), second = build(doc);
  assert.deepEqual(first, second);
  assert.deepEqual(JSON.parse(JSON.stringify(first)), first);
  const changed = clone(doc);
  changed.objects[0].material.color = '#112233';
  const third = build(changed);
  assert.notEqual(first.source.contentHash, third.source.contentHash);
  assert.notEqual(first.digest, third.digest);
});

await run('hierarchy, local matrices and nested source identities are preserved', () => {
  const doc = scene([{
    id: 'pivot', name: 'AssemblyPivot', position: [2, 3, 4], rotation: [0, 0.3, 0], scale: [1.2, 2, 0.8],
    parts: [box({id: 'child', name: 'Child', position: [0, 1, 0]})],
  }]);
  const pkg = build(doc);
  assert.equal(pkg.nodes.length, 2);
  const pivot = pkg.nodes.find(node => node.id === 'pivot');
  const child = pkg.nodes.find(node => node.id === 'child');
  assert.equal(child.parent, 'pivot');
  assert.equal(pivot.matrix[12], 2);
  assert.equal(pivot.matrix[13], 3);
  assert.equal(pivot.matrix[14], 4);
  assert.equal(child.matrix[13], 1);
  assert.equal(pkg.leaves.length, 1);
  assert.equal(pkg.leaves[0].id, 'child');
});

await run('multi-slot native mesh carries corner UV and per-triangle material indices', () => {
  const doc = scene([{
    id: 'split', name: 'Split', position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1],
    material: {color: '#aaaaaa'},
    materialSlots: [{color: '#ff0000'}, {color: '#0000ff'}],
    recipe: {type: 'nativeMesh', params: {schemaVersion: 1, source: {type: 'mesh'}, features: [], mesh: {
      vertices: [0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0],
      indices: [0, 1, 2, 0, 2, 3],
      cornerUV: [0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1],
      triangleMaterialIndices: [0, 1],
    }}},
  }]);
  const pkg = build(doc);
  assert.equal(pkg.leaves.length, 1);
  assert.equal(pkg.leaves[0].materials.length, 2);
  assert.deepEqual(pkg.leaves[0].triangleMaterials, [0, 1]);
  assert.equal(pkg.leaves[0].uvs.length, 12);
  assert.equal(pkg.triangles, 2);
});

await run('ordinary material-library assignments migrate as resolved constant PBR', () => {
  const doc = scene([box({material: {materialRef: 'bodyPaint'}})]);
  doc.meta = {materialLibrary: {version: 1, materials: {bodyPaint: {revision: 1, spec: {color: '#123456', metalness: 0.2, roughness: 0.35, opacity: 1}}}, images: {}}};
  const pkg = build(doc);
  assert.equal(pkg.leaves[0].materials[0].color, '#123456');
  assert.equal(pkg.leaves[0].materials[0].metalness, 0.2);
  assert.equal(pkg.leaves[0].materials[0].roughness, 0.35);
});

await run('explicit baked UV images are embedded as RGBA8 base64 with dimensions', () => {
  const image = crypto.createHash('sha256').update('image').digest('hex');
  const doc = scene([box({material: {color: '#ffffff', metalness: 0, roughness: 0.5, opacity: 1, textures: {baseColor: {type: 'image', image, colorSpace: 'srgb'}}}})]);
  const pkg = build(doc, {appearanceAssets: {[image]: {width: 1, height: 1, data: Buffer.alloc(4, 255).toString('base64')}}});
  assert.deepEqual(Object.keys(pkg.images), [image]);
  assert.equal(pkg.images[image].codec, 'rgba8-base64');
  assert.equal(pkg.images[image].width, 1);
  assert.equal(pkg.images[image].height, 1);
  assert.deepEqual(pkg.leaves[0].materials[0].textures, {baseColor: {image}});
});

await run('unsupported procedural/surface/detail/transmission materials refuse, never flatten', () => {
  const cases = {
    procedural: {procedural: {type: 'noise'}},
    surface: {surface: {}},
    detail: {detail: {}},
    transmission: {transmission: 0.4},
    thickness: {thickness: 3},
    attenuationColor: {attenuationColor: '#ffffff'},
  };
  for (const [name, extra] of Object.entries(cases)) {
    assert.throws(() => build(scene([box({material: {color: '#ffffff', ...extra}})])), error => error.code === 'MODELER_MATERIAL_UNSUPPORTED', name);
  }
});

await run('unsupported texture channels/transforms and missing/invalid images fail explicitly', () => {
  const image = crypto.createHash('sha256').update('image-2').digest('hex');
  const texture = (spec = {}) => scene([box({material: {color: '#ffffff', textures: {baseColor: {type: 'image', image, ...spec}}}})]);
  assert.throws(() => build(texture({projection: 'triplanar'}), {appearanceAssets: {[image]: {width: 1, height: 1, data: Buffer.alloc(4).toString('base64')}}}), error => error.code === 'MODELER_TEXTURE_UNSUPPORTED');
  assert.throws(() => build(texture({normalY: 'down'}), {appearanceAssets: {[image]: {width: 1, height: 1, data: Buffer.alloc(4).toString('base64')}}}), error => error.code === 'MODELER_TEXTURE_UNSUPPORTED');
  assert.throws(() => build(texture({channel: 'g'}), {appearanceAssets: {[image]: {width: 1, height: 1, data: Buffer.alloc(4).toString('base64')}}}), error => error.code === 'MODELER_TEXTURE_UNSUPPORTED');
  assert.throws(() => build(texture()), error => error.code === 'MODELER_TEXTURE_MISSING');
  assert.throws(() => build(texture(), {appearanceAssets: {[image]: {width: 1, height: 1, data: Buffer.alloc(3).toString('base64')}}}), error => error.code === 'MODELER_TEXTURE_INVALID');
});

await run('duplicate source ids and stale declared contentHash fail before delivery', () => {
  assert.throws(() => build(scene([box(), box()])), error => error.code === 'MODELER_ID');
  const doc = scene([box()]);
  assert.throws(() => buildDeliveryPackage({assetId: 'asset-1', revision: 3, doc, contentHash: '0'.repeat(64)}), error => error.code === 'MODELER_SOURCE_CHANGED');
});

await run('budget constants are explicit and empty assets produce a valid (empty) package', () => {
  assert.deepEqual(DELIVERY_LIMITS, {
    maxTriangles: 250000, maxLeaves: 1000, maxNodes: 2048,
    maxImageDimension: 2048, maxImagePixels: 16 * 1024 * 1024,
    maxPackageBytes: 96 * 1024 * 1024, maxMaterialSlots: 64,
  });
  const pkg = build(scene([]));
  assert.equal(pkg.nodes.length, 0);
  assert.equal(pkg.leaves.length, 0);
  assert.equal(pkg.triangles, 0);
});

const failed = tests.filter(test => !test.passed);
console.log(JSON.stringify({summary: {tests: tests.length, passed: tests.length - failed.length, failed: failed.length}, tests}, null, 2));
process.exitCode = failed.length ? 1 : 0;
