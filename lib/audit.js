import {meshTopology,trianglesFromPositions} from './spatial-query.js';
import { evaluateObject, evaluateDoc } from './kernel.js';
/**
 * Geometry audit: the checks that catch "I can see through my own model".
 *
 * Three independent signals per object:
 *  - signed volume: for a closed mesh, sum(a · (b × c))/6 is positive when the
 *    winding is outward. Negative means every face is inverted, which is what
 *    makes a solid render as a shell in a FrontSide renderer.
 *  - boundary edges: edges used by exactly one triangle. A closed solid has
 *    none; each one is a hole you can look through.
 *  - degenerate triangles: zero-area faces that break normals and shadows.
 *
 * Open surfaces (bands, decals, planes) are legitimately not watertight, so the
 * audit reports counts and lets the caller decide what is an error.
 */

// Share actual-distance welding and tolerance with diagnose; a fixed0.1mm
// quantization bucket incorrectly merged legitimate near-corner mesh edges.

export function auditObject(obj) {
  const g = evaluateObject(obj).positions;
  const out = {
    id: obj?.id,
    name: obj?.name,
    triangles: 0,
    degenerate: 0,
    boundaryEdges: 0,
    windingConflicts: 0,
    signedVolume: 0,
    closed: false,
    nonManifoldEdges: 0,
    outward: null,
  };
  if (!Array.isArray(g) || g.length < 9) return out;

  const tris = Math.floor(g.length / 9);
  out.triangles = tris;
  let vol = 0;

  for (let i = 0; i < tris; i++) {
    const o = i * 9;
    const a = [g[o], g[o + 1], g[o + 2]];
    const b = [g[o + 3], g[o + 4], g[o + 5]];
    const c = [g[o + 6], g[o + 7], g[o + 8]];
    // signed volume of the tetrahedron (origin, a, b, c)
    vol += (a[0] * (b[1] * c[2] - b[2] * c[1])
      + a[1] * (b[2] * c[0] - b[0] * c[2])
      + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;

  }

  out.signedVolume = vol;
  const topology=meshTopology(trianglesFromPositions(g));
  out.degenerate=topology.degenerateTriangles;out.boundaryEdges=topology.boundaryEdges;out.nonManifoldEdges=topology.nonManifoldEdges;out.nonManifoldVertices=topology.nonManifoldVertices;out.windingConflicts=topology.windingConflicts;out.closed=topology.closed;out.manifold=topology.closed;out.tolerance=topology.tolerance;
  if (out.closed) out.outward = vol > 0;
  return out;
}

export function auditDoc(doc) {
  doc = evaluateDoc(doc);
  const objects = (doc?.objects || []).map(auditObject);
  const inverted = objects.filter((o) => o.closed && o.outward === false);
  const open = objects.filter((o) => !o.closed);
  const degenerate = objects.filter((o) => o.degenerate > 0);
  return {
    summary: {
      objects: objects.length,
      triangles: objects.reduce((a, o) => a + o.triangles, 0),
      invertedObjects: inverted.length,
      openObjects: open.length,
      degenerateObjects: degenerate.length,
      degenerateTriangles: objects.reduce((a, o) => a + o.degenerate, 0),
      windingConflictObjects: objects.filter((o) => o.windingConflicts > 0).length,
      windingConflicts: objects.reduce((a, o) => a + o.windingConflicts, 0),
    },
    inverted: inverted.slice(0, 24),
    open: open.slice(0, 24),
    degenerate: degenerate.slice(0, 24),
    objects,
  };
}

/** Group-level rollup so a report names "Road wheel ×14" instead of fourteen lines. */
export function groupBy(audit) {
  const groups = new Map();
  for (const o of audit.objects) {
    const g = groups.get(o.name) || { name: o.name, count: 0, inverted: 0, open: 0, degenerate: 0, triangles: 0 };
    g.count++;
    g.triangles += o.triangles;
    if (o.closed && o.outward === false) g.inverted++;
    if (!o.closed) g.open++;
    if (o.degenerate > 0) g.degenerate++;
    if (o.windingConflicts > 0) g.winding = (g.winding || 0) + o.windingConflicts;
    groups.set(o.name, g);
  }
  return [...groups.values()].sort((a, b) => (b.inverted - a.inverted) || (b.open - a.open) || b.triangles - a.triangles);
}
