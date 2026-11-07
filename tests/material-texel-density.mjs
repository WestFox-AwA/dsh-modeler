import assert from 'node:assert/strict';
import {runModelerScript} from '../src/host/script.js';
import {evaluateDoc} from '../src/host/kernel.js';
import {prepareMaterialConstruction} from '../src/host/material-construction.js';
import {hashContent} from '../src/host/storage.js';

const tests = [];
async function test(name, fn) {
  try { await fn(); tests.push({name, passed: true}); }
  catch (error) { tests.push({name, passed: false, error: error.stack}); }
}

function nativeDoc(program, material) {
  const doc = runModelerScript(program);
  const evaluated = evaluateDoc(doc);
  return {
    ...doc,
    objects: evaluated.objects.map((o, i) => ({
      id: o.id || 'native-' + i,
      name: o.name,
      semanticId: o.semanticId,
      kind: 'mesh',
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      shading: o.shading,
      material,
      recipe: {
        type: 'nativeMesh',
        params: {
          schemaVersion: 1,
          source: {type: 'mesh'},
          features: [],
          sourceHash: hashContent(JSON.stringify(o.geometryData.positions)),
          topologyStamp: 'native-' + i,
          mesh: {
            vertices: o.geometryData.positions,
            indices: Array.from({length: o.geometryData.positions.length / 3}, (_, index) => index),
            cornerNormals: o.geometryData.normals,
          },
        },
      },
    })),
  };
}

const grain = (wavelength = 0.05) => ({
  surface: {
    version: 1,
    mapping: {space: 'object'},
    signals: {grain: {type: 'noise', wavelength, detail: 2, seed: 3}},
    layers: [{id: 'base', color: '#b44638', roughness: {min: 0.3, max: 0.5, signal: 'grain'}}],
  },
});

const planFor = (size, material, args = {}) => {
  const doc = nativeDoc(`return m.scene('s${size}',[m.box(${size},${size},${size}).key('body')]);`, material);
  const prepared = prepareMaterialConstruction(doc, args);
  const group = prepared.groups[0];
  const entry = Object.values(doc.meta?.materialCompilation?.entries || {})[0];
  return {options: group.options, plan: entry?.plan, spec: entry?.spec};
};

await test('atlas resolution follows physical size instead of a fixed 128', () => {
  const small = planFor(0.2, grain());
  const large = planFor(10, grain());
  assert.equal(small.options.resolution, 256);
  assert.equal(large.options.resolution, 512);
  assert.ok(large.options.resolution > small.options.resolution);
  assert.equal(small.options.texelDensity, 80);
  assert.equal(large.options.texelDensity, 80);
});

await test('large parts auto-tile periodic detail instead of stretching the atlas', () => {
  const large = planFor(10, grain());
  assert.equal(large.options.atlasUnderSampled, true);
  assert.equal(large.options.autoTiled, true);
  assert.equal(large.plan.delivery, 'hybrid');
  assert.ok(large.spec.detail, 'detail tile exists');
  assert.ok(Math.abs(large.spec.detail.size - 0.2) < 1e-9, 'tile covers four 0.05m periods');
  assert.ok(large.options.detailResolution / large.spec.detail.size >= 1000, 'tile texel density is physical');
});

await test('small parts keep their original plan and are not tiled unnecessarily', () => {
  const small = planFor(0.2, grain());
  assert.equal(small.options.atlasUnderSampled, false);
  assert.equal(small.options.autoTiled, false);
  assert.equal(small.options.resolution, 256);
});

await test('explicit resolution still wins over the physical plan', () => {
  const explicit = planFor(10, grain(), {resolution: 384});
  assert.equal(explicit.options.resolution, 384);
});

await test('detail resolution scales with the declared tile size', () => {
  const material = {
    roughness: 0.4,
    detail: {
      version: 1,
      size: 8,
      projection: 'box',
      space: 'object',
      surface: {
        version: 1,
        mapping: {space: 'object'},
        signals: {g: {type: 'noise', wavelength: 0.05, detail: 1, seed: 1}},
        layers: [{id: 'd', roughness: {min: 0.2, max: 0.6, signal: 'g'}}],
      },
    },
  };
  const result = planFor(1, material);
  assert.equal(result.options.detailResolution, 1024, 'a fine pattern in a large tile gets the maximum tile resolution');
  assert.ok(result.options.detailResolution <= 1024);
});

await test('planning is deterministic for the same source and size', () => {
  const a = planFor(10, grain());
  const b = planFor(10, grain());
  assert.deepEqual(a.options.resolution, b.options.resolution);
  assert.deepEqual(a.options.texelDensity, b.options.texelDensity);
  assert.deepEqual(a.spec.detail.size, b.spec.detail.size);
});

const failed = tests.filter((t) => !t.passed);
console.log(JSON.stringify({summary: {tests: tests.length, passed: tests.length - failed.length, failed: failed.length}, tests}, null, 2));
if (failed.length) process.exitCode = 1;
