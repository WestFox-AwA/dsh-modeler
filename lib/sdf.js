// Minimal signed-distance-field toolkit + surface-nets mesher for showpiece busts.
// No external dependencies; deterministic.

const TAU = Math.PI * 2;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function smin(a, b, k) {
  const h = clamp(0.5 + 0.5 * (b - a) / k, 0, 1);
  return b * (1 - h) + a * h - k * h * (1 - h);
}
export const smax = (a, b, k) => -smin(-a, -b, k);
export const ssub = (a, b, k) => smax(a, -b, k);

export function sphere(p, c, r) {
  return len(sub(p, c)) - r;
}

export function ellipsoid(p, c, r) {
  const q = [ (p[0]-c[0])/r[0], (p[1]-c[1])/r[1], (p[2]-c[2])/r[2] ];
  return (len(q) - 1) * Math.min(r[0], r[1], r[2]);
}

export function box(p, c, b) {
  const q = [Math.abs(p[0]-c[0]) - b[0], Math.abs(p[1]-c[1]) - b[1], Math.abs(p[2]-c[2]) - b[2]];
  const outside = Math.hypot(Math.max(q[0],0), Math.max(q[1],0), Math.max(q[2],0));
  return outside + Math.min(Math.max(q[0], q[1], q[2]), 0);
}

export function capsule(p, a, b, r) {
  const pa = sub(p, a), ba = sub(b, a);
  const h = clamp(dot(pa, ba) / Math.max(dot(ba, ba), 1e-8), 0, 1);
  return len([pa[0]-ba[0]*h, pa[1]-ba[1]*h, pa[2]-ba[2]*h]) - r;
}

export function roundBox(p, c, b, r) {
  return box(p, c, [b[0]-r, b[1]-r, b[2]-r]) - r;
}

// Surface nets. Returns flat triangle positions.
export function surfaceNets(fn, min, max, nx, ny, nz) {
  const sx = (max[0] - min[0]) / nx, sy = (max[1] - min[1]) / ny, sz = (max[2] - min[2]) / nz;
  const nx1 = nx + 1, ny1 = ny + 1, nz1 = nz + 1;
  const vals = new Float32Array(nx1 * ny1 * nz1);
  const idx = (i, j, k) => i + nx1 * (j + ny1 * k);
  for (let k = 0; k < nz1; k++) {
    const z = min[2] + sz * k;
    for (let j = 0; j < ny1; j++) {
      const y = min[1] + sy * j;
      for (let i = 0; i < nx1; i++) {
        vals[idx(i, j, k)] = fn([min[0] + sx * i, y, z]);
      }
    }
  }
  const cellVert = new Int32Array(nx * ny * nz).fill(-1);
  const verts = [];
  const cellIdx = (i, j, k) => i + nx * (j + ny * k);
  const corners = [
    [0,0,0],[1,0,0],[0,1,0],[1,1,0],[0,0,1],[1,0,1],[0,1,1],[1,1,1],
  ];
  const edges = [[0,1],[1,3],[3,2],[2,0],[4,5],[5,7],[7,6],[6,4],[0,4],[1,5],[2,6],[3,7]];
  for (let k = 0; k < nz; k++) {
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const v = corners.map(([dx,dy,dz]) => vals[idx(i+dx, j+dy, k+dz)]);
        let mask = 0;
        for (let c = 0; c < 8; c++) if (v[c] < 0) mask |= 1 << c;
        if (mask === 0 || mask === 255) continue;
        let ax = 0, ay = 0, az = 0, n = 0;
        for (const [a, b] of edges) {
          const va = v[a], vb = v[b];
          if ((va < 0) === (vb < 0)) continue;
          const t = va / (va - vb);
          const pa = corners[a], pb = corners[b];
          ax += pa[0] + (pb[0] - pa[0]) * t;
          ay += pa[1] + (pb[1] - pa[1]) * t;
          az += pa[2] + (pb[2] - pa[2]) * t;
          n++;
        }
        if (!n) continue;
        const px = min[0] + (i + ax / n) * sx;
        const py = min[1] + (j + ay / n) * sy;
        const pz = min[2] + (k + az / n) * sz;
        cellVert[cellIdx(i,j,k)] = verts.length;
        verts.push([px, py, pz]);
      }
    }
  }
  const out = [];
  const grad = (p) => {
    const e = 0.005;
    return [
      fn([p[0]+e,p[1],p[2]]) - fn([p[0]-e,p[1],p[2]]),
      fn([p[0],p[1]+e,p[2]]) - fn([p[0],p[1]-e,p[2]]),
      fn([p[0],p[1],p[2]+e]) - fn([p[0],p[1],p[2]-e]),
    ];
  };
  const quad = (a, b, c, d) => {
    for (const [u, v, w] of [[a,b,c],[a,c,d]]) {
      if (u < 0 || v < 0 || w < 0) continue;
      const A = verts[u], B = verts[v], C = verts[w];
      const n = [
        (B[1]-A[1])*(C[2]-A[2]) - (B[2]-A[2])*(C[1]-A[1]),
        (B[2]-A[2])*(C[0]-A[0]) - (B[0]-A[0])*(C[2]-A[2]),
        (B[0]-A[0])*(C[1]-A[1]) - (B[1]-A[1])*(C[0]-A[0]),
      ];
      const mid = [(A[0]+B[0]+C[0])/3, (A[1]+B[1]+C[1])/3, (A[2]+B[2]+C[2])/3];
      if (dot(n, grad(mid)) < 0) out.push(A[0],A[1],A[2], C[0],C[1],C[2], B[0],B[1],B[2]);
      else out.push(A[0],A[1],A[2], B[0],B[1],B[2], C[0],C[1],C[2]);
    }
  };
  // x-edges
  for (let k = 1; k < nz; k++) for (let j = 1; j < ny; j++) for (let i = 0; i < nx; i++) {
    const a = vals[idx(i,j,k)], b = vals[idx(i+1,j,k)];
    if ((a < 0) === (b < 0)) continue;
    quad(cellVert[cellIdx(i,j-1,k-1)], cellVert[cellIdx(i,j,k-1)], cellVert[cellIdx(i,j,k)], cellVert[cellIdx(i,j-1,k)]);
  }
  // y-edges
  for (let k = 1; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 1; i < nx; i++) {
    const a = vals[idx(i,j,k)], b = vals[idx(i,j+1,k)];
    if ((a < 0) === (b < 0)) continue;
    quad(cellVert[cellIdx(i-1,j,k-1)], cellVert[cellIdx(i,j,k-1)], cellVert[cellIdx(i,j,k)], cellVert[cellIdx(i-1,j,k)]);
  }
  // z-edges
  for (let k = 0; k < nz; k++) for (let j = 1; j < ny; j++) for (let i = 1; i < nx; i++) {
    const a = vals[idx(i,j,k)], b = vals[idx(i,j,k+1)];
    if ((a < 0) === (b < 0)) continue;
    quad(cellVert[cellIdx(i-1,j-1,k)], cellVert[cellIdx(i,j-1,k)], cellVert[cellIdx(i,j,k)], cellVert[cellIdx(i-1,j,k)]);
  }
  return out;
}
