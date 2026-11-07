import assert from 'node:assert/strict';
import * as THREE from 'three';
import { resolveCamera } from '../lib/camera.js';
import { rasterDoc, formatTextPreview, diffRaster } from '../lib/raster.js';
import { runModelerScript } from '../lib/script.js';
import { objectPositions } from '../lib/analyze.js';

// Independent oracles: THREE's camera matrices/project(), and Raycaster's exact
// ray/triangle intersections. No screenshots, live model or WebGL is required.
const bounds = { min: [-1, -1, -1], max: [1, 1, 1] };
const build = (code) => runModelerScript(`return m.scene('camera-test',[${code}],{});`);
const vec = (a) => new THREE.Vector3(...a);
const close = (actual, expected, tolerance = 1e-9) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected} (tol ${tolerance})`);
const vectorClose = (actual, expected, tolerance = 1e-9) => actual.forEach((value, i) => close(value, expected[i], tolerance));
const cases = [];
function test(name, fn) {
  try { fn(); cases.push({ name, passed: true }); }
  catch (error) { cases.push({ name, passed: false, error: error.stack || String(error) }); }
}
function threeCamera(c) {
  const camera = c.projection === 'perspective'
    ? new THREE.PerspectiveCamera(c.fov, c.aspect, c.near, c.far)
    : new THREE.OrthographicCamera(-c.span * c.aspect / 2, c.span * c.aspect / 2, c.span / 2, -c.span / 2, c.near, c.far);
  camera.position.fromArray(c.eye);
  camera.up.fromArray(c.up);
  camera.lookAt(...c.target);
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();
  return camera;
}
function corners(b) {
  return [b.min[0], b.max[0]].flatMap((x) => [b.min[1], b.max[1]].flatMap((y) => [b.min[2], b.max[2]].map((z) => [x, y, z])));
}
function oracleScene(doc, faces) {
  return doc.objects.map((object, index) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(objectPositions(object), 3));
    const side = faces === 'double' || object.material?.doubleSided || object.kind === 'plane' ? THREE.DoubleSide : THREE.FrontSide;
    const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ side }));
    mesh.userData.index = index;
    mesh.updateMatrixWorld(true);
    return mesh;
  });
}
function assertOracle(doc, opts, minimumCovered = 20) {
  const result = rasterDoc(doc, { cols: 96, rows: 56, samples: 1, faces: 'double', keepBuffers: true, ...opts });
  const view = Object.values(result.views)[0];
  const camera = threeCamera(view.camera);
  const meshes = oracleScene(doc, result.metrics.faces);
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let compared = 0, covered = 0, mismatches = 0, maxDepthError = 0;
  for (let y = 0; y < view.buffers.H; y++) for (let x = 0; x < view.buffers.W; x++) {
    ndc.set(2 * (x + 0.5) / view.buffers.W - 1, 1 - 2 * (y + 0.5) / view.buffers.H);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(meshes, false);
    const hit = hits.find((h) => {
      const depth = -h.point.clone().applyMatrix4(camera.matrixWorldInverse).z;
      return depth >= camera.near - 1e-9 && depth <= camera.far + 1e-9;
    });
    const expected = hit?.object.userData.index ?? -1;
    const actual = view.buffers.nearestId[y * view.buffers.W + x];
    compared++;
    if (expected >= 0) covered++;
    if (actual !== expected) { mismatches++; continue; }
    if (expected >= 0) {
      const depth = hit.point.clone().applyMatrix4(camera.matrixWorldInverse).z;
      maxDepthError = Math.max(maxDepthError, Math.abs(view.buffers.nearest[y * view.buffers.W + x] - depth));
    }
  }
  for (const mesh of meshes) { mesh.geometry.dispose(); mesh.material.dispose(); }
  assert.ok(covered >= minimumCovered, `only ${covered} oracle hits`);
  assert.ok(mismatches <= 2, `${mismatches}/${compared} ray/triangle IDs disagree with Three`);
  assert.ok(maxDepthError < 2e-5, `eye-space depth error ${maxDepthError}`);
  return result;
}
function centerX(v) { return (v.footprint.x[0] + v.footprint.x[1]) / 2; }
function width(v) { return v.footprint.x[1] - v.footprint.x[0] + 1; }

test('explicit eye and target are preserved; basis matches Three lookAt', () => {
  const input = { eye: [4.3, 2.1, 5.7], target: [-0.4, 0.2, 0.7], up: [0.2, 1, 0.1], fov: 57 };
  const c = resolveCamera(bounds, { view: 'custom', camera: input, aspect: 1.83 });
  assert.deepEqual(c.eye, input.eye); assert.deepEqual(c.target, input.target);
  const reference = new THREE.PerspectiveCamera(57, 1.83, c.near, c.far);
  reference.position.fromArray(input.eye); reference.up.fromArray(input.up); reference.lookAt(...input.target); reference.updateMatrixWorld(true);
  vectorClose(c.right, new THREE.Vector3(1, 0, 0).applyQuaternion(reference.quaternion).toArray());
  vectorClose(c.up, new THREE.Vector3(0, 1, 0).applyQuaternion(reference.quaternion).toArray());
  vectorClose(c.eyeDir, new THREE.Vector3(0, 0, 1).applyQuaternion(reference.quaternion).toArray());
});

for (const projection of ['perspective', 'orthographic']) test(`${projection} coordinates match independent Three projection matrix`, () => {
  const c = resolveCamera(bounds, { camera: { eye: [3.2, 2.4, 4.1], target: [0.3, -0.2, 0.1], up: [0.7, 1, -0.3], projection, ...(projection === 'orthographic' ? { span: 5.4 } : { fov: 61 }) }, aspect: 1.7 });
  const reference = threeCamera(c);
  for (const point of [...corners(bounds), [0.31, 0.72, -0.44]]) {
    const relative = vec(point).sub(vec(c.eye)), depth = -relative.dot(vec(c.eyeDir));
    const halfV = projection === 'perspective' ? depth * Math.tan(c.fov * Math.PI / 360) : c.span / 2;
    const ndc = vec(point).project(reference);
    close(relative.dot(vec(c.right)) / (halfV * c.aspect), ndc.x);
    close(relative.dot(vec(c.up)) / halfV, ndc.y);
  }
});

test('orbit angles use degrees, +Z front, +X at 90, with front flip', () => {
  for (const front of [[0, 0, 1], [0, 0, -1]]) {
    const forward = resolveCamera(bounds, { camera: { azimuth: 0, elevation: 0, distance: 5 }, front });
    vectorClose(forward.eyeDir, front);
    const side = resolveCamera(bounds, { camera: { azimuth: 90, elevation: 0, distance: 5 }, front });
    vectorClose(side.eyeDir, [1, 0, 0]);
    const high = resolveCamera(bounds, { camera: { azimuth: 0, elevation: 30, distance: 5 }, front });
    close(high.eyeDir[1], 0.5); close(high.eyeDir[2], Math.sqrt(3) / 2 * front[2]);
  }
  const back = resolveCamera(bounds, { view: 'back', camera: { elevation: 10 } });
  assert.ok(back.eyeDir[2] < 0, 'elevation-only orbit changed preset yaw');
});

test('top orthographic has safe -Z up, and default orbit pole remains finite', () => {
  const top = resolveCamera(bounds, { view: 'top', camera: { projection: 'orthographic' } });
  vectorClose(top.up, [0, 0, -1]); vectorClose(top.eyeDir, [0, 1, 0]);
  for (const elevation of [90, -90]) {
    const c = resolveCamera(bounds, { camera: { azimuth: 0, elevation } });
    assert.ok([...c.eye, ...c.up, ...c.right].every(Number.isFinite));
    close(vec(c.up).dot(vec(c.eyeDir)), 0);
  }
});

test('invalid fields fail explicitly instead of producing NaN or guessing', () => {
  for (const camera of [
    { eye: [0, 0, 0], target: [0, 0, 0] }, { eye: [0, NaN, 2] },
    { eye: [0, 0, Infinity] }, { azimuth: NaN }, { elevation: Infinity },
    { distance: 0 }, { projection: 'orthographic', span: 0 }, { projection: 'orthographic', span: -1 },
    { projection: 'invalid' }, { projection: 'perspective', span: 4 },
    { fov: 0 }, { fov: 180 }, { target: [1, 2] }, { up: [0, 0, 0] }, { near: 0.1 }, { far: 100 },
    { eye: [0, 0, 4], target: [0, 0, 0], up: [0, 0, 1] },
    { eye: [0, 4, 0], target: [0, 0, 0], up: [0, 1, 0] },
    { eye: [0, 0, 4], azimuth: 0 }, { eye: [0, 0, 4], elevation: 10 }, { eye: [0, 0, 4], distance: 5 },
  ]) assert.throws(() => resolveCamera(bounds, { camera }), /camera/);
  assert.throws(() => resolveCamera(bounds, { view: 'unknown' }), /view/);
  assert.throws(() => resolveCamera(bounds, { view: 'toString' }), /view/);
  assert.throws(() => resolveCamera(bounds, { aspect: 0 }), /aspect/);
  assert.throws(() => resolveCamera({ min: [2, 0, 0], max: [1, 1, 1] }), /bounds/);
});

test('fixed eye retains visible shallow depths even with extreme sideways bounds', () => {
  const b = { min: [-1e7, -1, -1], max: [1e7, 1, 1] };
  for (const projection of ['perspective', 'orthographic']) {
    const c = resolveCamera(b, { camera: { eye: [0, 0, 5], target: [0, 0, 0], projection, ...(projection === 'orthographic' ? { span: 4 } : {}) } });
    assert.ok(c.near > 0 && c.near < 4 && c.far > 6);
    const camera = threeCamera(c);
    for (const point of [[0, 0, -1], [0, 0, 1]]) {
      const q = vec(point).project(camera);
      assert.ok(q.z > -1 && q.z < 1, `${q.z} outside clip range`);
    }
  }
});

for (const projection of ['perspective', 'orthographic']) test(`${projection} auto fit includes projected extreme AABBs and viewport aspect`, () => {
  for (const size of [[10000, 0.001, 0.002], [0.002, 10000, 0.001], [0.001, 0.002, 10000], [2, 2, 2]]) {
    const b = { min: size.map((v, i) => 13 * (i + 1) - v / 2), max: size.map((v, i) => 13 * (i + 1) + v / 2) };
    for (const view of ['front', 'back', 'side', 'left', 'top', 'bottom', 'iso']) for (const aspect of [0.3, 1.5, 4]) {
      const c = resolveCamera(b, { view, aspect, camera: { projection } });
      const reference = threeCamera(c);
      for (const p of corners(b)) {
        const q = vec(p).project(reference);
        assert.ok(Math.abs(q.x) < 0.900001 && Math.abs(q.y) < 0.900001, `${projection}/${view}/${aspect}: ${q.toArray()}`);
        assert.ok(q.z >= -1 - 1e-9 && q.z <= 1 + 1e-9);
      }
    }
  }
});

test('camera implies custom, rejects mixed custom requests, preserves default four views', () => {
  const doc = build('m.box(1,1,1)');
  assert.deepEqual(Object.keys(rasterDoc(doc, { cols: 40, rows: 20 }).views), ['front', 'side', 'top', 'iso']);
  assert.deepEqual(Object.keys(rasterDoc(doc, { camera: {}, cols: 40, rows: 20 }).views), ['custom']);
  assert.deepEqual(Object.keys(rasterDoc(doc, { camera: {}, views: ['custom'], cols: 40, rows: 20 }).views), ['custom']);
  assert.throws(() => rasterDoc(doc, { views: ['custom'] }), /custom/);
  assert.throws(() => rasterDoc(doc, { camera: {}, views: ['custom', 'front'] }), /custom/);
  assert.throws(() => rasterDoc(doc, { camera: {}, views: ['unknown'] }), /views/);
});

for (const projection of ['perspective', 'orthographic']) test(`${projection} raster and occlusion agree with Three for arbitrary eye/target/up`, () => {
  const doc = build("m.box(1.4,1.1,0.5).at(-0.6,0,0.4).rot(0.2,0.4,0.1),m.box(0.8,1.4,0.6).at(0.6,0.1,-0.7).rot(0.1,-0.3,0.2)");
  assertOracle(doc, { camera: { eye: [3.2, 2.1, 4.4], target: [-0.15, 0.1, 0], up: [0.4, 1, 0.2], projection, ...(projection === 'orthographic' ? { span: 3.6 } : { fov: 43 }) } });
});

test('perspective front-face culling agrees with Three away from the target axis', () => {
  const doc = build("m.box(1.1,1.4,0.7).at(-0.9,0,0.1).rot(0.2,0.4,-0.1),m.box(0.9,1,0.5).at(1.1,0,-0.6).rot(-0.1,0.6,0.2)");
  assertOracle(doc, { faces: 'front', camera: { eye: [1.2, 0.7, 3.6], target: [-0.4, 0.3, -0.2], fov: 62 } });
});

for (const projection of ['perspective', 'orthographic']) test(`${projection} cellAspect .5 and 1 retain entity physical width/height`, () => {
  const doc = build('m.box(2,1,0.02)');
  for (const cellAspect of [0.5, 1]) {
    const v = rasterDoc(doc, { cols: 160, rows: 96, samples: 2, cellAspect, keepBuffers: true, camera: { eye: [0, 0, 6], target: [0, 0, 0], projection, ...(projection === 'orthographic' ? { span: 4 } : { fov: 42 }) } }).views.custom;
    // Whole-cell footprints round both edges outward. Coverage-weighted central
    // slices measure the visible rectangle to subsample precision instead.
    const coveredWidth = v.buffers.cellCoverage.slice(48 * 160, 49 * 160).reduce((sum, c) => sum + c, 0);
    let coveredHeight = 0;
    for (let y = 0; y < 96; y++) coveredHeight += v.buffers.cellCoverage[y * 160 + 80];
    close(coveredWidth * cellAspect / coveredHeight, 2, 0.06);
    close(v.camera.aspect, 160 * cellAspect / 96);
    close(v.projection.scaleY / v.projection.scaleX, cellAspect);
  }
});

for (const projection of ['perspective', 'orthographic']) test(`${projection} translating eye and target moves framing instead of being recentered`, () => {
  const doc = build('m.box(1,1,0.02)');
  const options = { cols: 120, rows: 60, samples: 2, cellAspect: 0.5 };
  const camera = { eye: [0, 0, 6], target: [0, 0, 0], projection, ...(projection === 'orthographic' ? { span: 3 } : { fov: 42 }) };
  const original = rasterDoc(doc, { ...options, camera }).views.custom;
  const moved = rasterDoc(doc, { ...options, camera: { ...camera, eye: [0.6, 0, 6], target: [0.6, 0, 0] } }).views.custom;
  assert.ok(centerX(original) - centerX(moved) > 12);
  assert.deepEqual(moved.camera.eye, [0.6, 0, 6]); assert.deepEqual(moved.camera.target, [0.6, 0, 0]);
  if (projection === 'orthographic') close(centerX(moved) - centerX(original), -0.6 * options.cols / 3, 0.6);
  const aimed = assertOracle(doc, { ...options, camera: { ...camera, target: [0.7, 0, 0] } });
  assert.ok(centerX(original) - centerX(aimed.views.custom) > 10);
});

test('explicit ortho span controls zoom and near-plane clipping rejects behind-eye geometry', () => {
  const doc = build('m.box(1,1,0.02)');
  const camera = { projection: 'orthographic', eye: [0, 0, 5], target: [0, 0, 0], span: 3 };
  const original = rasterDoc(doc, { camera, cols: 120, rows: 60, samples: 2 }).views.custom;
  const zoomedOut = rasterDoc(doc, { camera: { ...camera, span: 6 }, cols: 120, rows: 60, samples: 2 }).views.custom;
  close(width(original) / width(zoomedOut), 2, 0.08);
  assert.equal(original.camera.span, 3); assert.equal(zoomedOut.camera.span, 6);
  const clippingDoc = build(`m.mesh([-1,-1,-1, 1,-1,-1, 0,1,1],'Cross'),m.mesh([-1,-1,1, 1,-1,1, 0,1,1],'Behind')`);
  const result = assertOracle(clippingDoc, { camera: { projection: 'orthographic', eye: [0, 0, 0], target: [0, 0, -1], span: 3 } });
  assert.ok(!result.views.custom.visible.includes(result.objectLegend.find((o) => o.name === 'Behind').id));
});

test('perspective near crossing clips before division; eye-back and pre-near triangles vanish', () => {
  const doc = build(`
    m.mesh([-0.8,-0.7,-1.2, 0.7,-0.7,-1.5, 0.1,0.9,0.2],'Cross'),
    m.mesh([-1,-1,0.3, 1,-1,0.3, 0,1,0.3],'Behind'),
    m.mesh([-1,-1,-0.000001, 1,-1,-0.000001, 0,1,-0.000001],'BeforeNear')
  `);
  const result = assertOracle(doc, { camera: { eye: [0, 0, 0], target: [0, 0, -1], fov: 65 } });
  const v = result.views.custom;
  for (const name of ['Behind', 'BeforeNear']) assert.ok(!v.visible.includes(result.objectLegend.find((o) => o.name === name).id));
  for (let i = 0; i < v.buffers.cellId.length; i++) if (v.buffers.cellId[i] >= 0) {
    assert.ok(Number.isFinite(v.buffers.cellDepth[i]));
    assert.ok(v.buffers.cellDepth[i] <= -v.camera.near + 1e-9 && v.buffers.cellDepth[i] >= -v.camera.far - 1e-9);
  }
});

test('perspective sloped-triangle depth and overlap remain correct in either draw order', () => {
  const sloped = "m.mesh([-1,-1,-1,1,-1,-5,0,1,-3],'Sloped')";
  const flat = "m.mesh([-2,-2,-3,2,-2,-3,0,2,-3],'Flat')";
  for (const code of [`${sloped},${flat}`, `${flat},${sloped}`]) {
    const result = assertOracle(build(code), { camera: { eye: [0, 0, 0], target: [0, 0, -1], fov: 60 } });
    assert.equal(result.views.custom.visible.length, 2);
  }
});

test('perspective is distinct from ortho: a nearer equal-sized object projects larger', () => {
  const doc = build("m.box(0.6,0.6,0.02).at(-0.9,0,1),m.box(0.6,0.6,0.02).at(0.9,0,-1)");
  const area = (v, index) => v.buffers.cellId.reduce((n, id) => n + (id === index ? 1 : 0), 0);
  const opts = { cols: 160, rows: 90, samples: 1, keepBuffers: true };
  const camera = { eye: [0, 0, 5], target: [0, 0, 0] };
  const perspective = rasterDoc(doc, { ...opts, camera }).views.custom;
  const orthographic = rasterDoc(doc, { ...opts, camera: { ...camera, projection: 'orthographic', span: 4 } }).views.custom;
  assert.ok(area(perspective, 0) / area(perspective, 1) > 1.9);
  close(area(orthographic, 0) / area(orthographic, 1), 1, 0.08);
});

test('output exposes camera/projection and formatted text includes actual values', () => {
  const r = rasterDoc(build('m.box(1,1,1)'), { cols: 40, rows: 20, camera: { azimuth: 25, elevation: 17 } });
  const text = formatTextPreview(r, { channel: 'shade' });
  assert.equal(r.views.custom.projection.type, 'perspective');
  for (const key of ['eye', 'target', 'up', 'right', 'eyeDir']) assert.ok(r.views.custom.camera[key].every(Number.isFinite));
  assert.match(text, /CAMERA perspective \| eye \[.*\] target \[.*\] up \[/);
  assert.match(text, /near\/far/);
});

test('valid custom pole, translated and empty-scene cameras never emit NaN', () => {
  const docs = [build('m.box(1,2,0.3)'), { version: 1, nextId: 1, objects: [] }];
  for (const doc of docs) for (const camera of [
    { azimuth: 135, elevation: 90 }, { azimuth: -235, elevation: -90, projection: 'orthographic' },
    { eye: [10, 10, 10], target: [9, 8, 7], up: [1, 2, 0.3] },
  ]) {
    const r = rasterDoc(doc, { cols: 40, rows: 20, camera, keepBuffers: true });
    assert.ok(!JSON.stringify(r).includes('NaN'));
    const v = r.views.custom;
    assert.ok(Object.values(v.camera).flat().filter((n) => typeof n === 'number').every(Number.isFinite));
    for (let i = 0; i < v.buffers.cellId.length; i++) if (v.buffers.cellId[i] >= 0) assert.ok(Number.isFinite(v.buffers.cellDepth[i]));
  }
});

test('a camera-only movement is not reported as geometry added or removed', () => {
 const doc=build(`m.box(1,1,1)`);
 const a=rasterDoc(doc,{cols:80,rows:40,views:['front'],camera:{eye:[0,0,0],target:[0,0,-1],fov:60}});
 const b=rasterDoc(doc,{cols:80,rows:40,views:['front'],camera:{eye:[0,0,.2],target:[0,0,-.8],fov:60}});
 assert.equal(diffRaster(a,b).front.comparable,false);
});

const summary = { tests: cases.length, passed: cases.filter((c) => c.passed).length, failed: cases.filter((c) => !c.passed).length };
console.log(JSON.stringify({ summary, tests: cases }, null, 2));
process.exitCode = summary.failed ? 1 : 0;
