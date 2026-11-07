// Shared, dependency-free camera contract for the character and Three previews.
// Angles are degrees; eyeDir points from target towards the eye (camera +Z).
const PRESETS = {
  front: { dir: [0, 0, 1], up: [0, 1, 0] },
  back: { dir: [0, 0, -1], up: [0, 1, 0] },
  side: { dir: [1, 0, 0], up: [0, 1, 0] },
  left: { dir: [-1, 0, 0], up: [0, 1, 0] },
  top: { dir: [0, 1, 0], up: [0, 0, -1] },
  bottom: { dir: [0, -1, 0], up: [0, 0, 1] },
  iso: { dir: [1, 0.72, 1], up: [0, 1, 0] },
};
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a, b) => a.map((v, i) => v - b[i]);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a) => { const length = Math.hypot(...a); return a.map((v) => v / length); };
const has = (o, key) => o[key] !== undefined;

function vector(value, name) {
  if (!Array.isArray(value) || value.length !== 3 || !value.every((v) => typeof v === 'number' && Number.isFinite(v))) {
    throw new Error(`${name} must be an array of three finite numbers`);
  }
  return [...value];
}
function number(value, name, positive = false) {
  if (typeof value !== 'number' || !Number.isFinite(value) || (positive && value <= 0)) {
    throw new Error(`${name} must be a finite${positive ? ' positive' : ''} number`);
  }
  return value;
}

/**
 * Resolve one camera, without changing an explicit eye/target or recentering it.
 *
 * bounds: {min:[x,y,z], max:[x,y,z]} (world AABB).
 * camera: {eye,target,up,azimuth,elevation,distance,projection,fov,span}.
 * eye is mutually exclusive with azimuth/elevation/distance. span is the full
 * vertical orthographic field of view; fov is the vertical perspective angle.
 * Returned up/right/eyeDir are the actual orthonormal lookAt basis. near/far
 * are positive eye-space distances; geometry outside them must be clipped.
 * Auto fit uses all eight projected AABB corners, the viewport aspect and 12%
 * padding. Explicit target, distance and span retain their framing controls.
 */
export function resolveCamera(bounds, { view = 'iso', camera = {}, aspect = 1.5, front = [0, 0, 1], projectionDefault = 'perspective' } = {}) {
  if (typeof view !== 'string' || (view !== 'custom' && !Object.hasOwn(PRESETS, view))) {
    throw new Error('view must be front,back,side,left,top,bottom,iso or custom');
  }
  if (!camera || typeof camera !== 'object' || Array.isArray(camera)) throw new Error('camera must be an object');
  const allowed = ['eye', 'target', 'up', 'azimuth', 'elevation', 'distance', 'projection', 'fov', 'span'];
  for (const key of Object.keys(camera)) if (!allowed.includes(key)) throw new Error(`unknown camera field: ${key}`);
  const min = vector(bounds?.min, 'bounds.min'), max = vector(bounds?.max, 'bounds.max');
  if (min.some((v, i) => v > max[i])) throw new Error('bounds.min must not exceed bounds.max');
  const size = sub(max, min);
  if (!size.every(Number.isFinite)) throw new Error('bounds size exceeds the finite numeric range');
  const center = min.map((v, i) => v / 2 + max[i] / 2);
  const extent = Math.max(...size, 1e-6);
  aspect = number(aspect, 'aspect', true);
  const frontVector = vector(front, 'front');
  if (Math.hypot(...frontVector) === 0) throw new Error('front must be nonzero');
  if (!['perspective', 'orthographic'].includes(projectionDefault)) throw new Error('projectionDefault must be perspective or orthographic');
  const projection = camera.projection === undefined ? projectionDefault : camera.projection;
  if (!['perspective', 'orthographic'].includes(projection)) throw new Error('camera.projection must be perspective or orthographic');
  const fov = number(camera.fov === undefined ? 42 : camera.fov, 'camera.fov', true);
  if (fov >= 179) throw new Error('camera.fov must be greater than 0 and less than 179 degrees');
  if (has(camera, 'span')) {
    number(camera.span, 'camera.span', true);
    if (projection !== 'orthographic') throw new Error('camera.span is only valid for orthographic projection');
  }
  const explicitEye = has(camera, 'eye');
  if (explicitEye && ['azimuth', 'elevation', 'distance'].some((key) => has(camera, key))) {
    throw new Error('camera.eye cannot be combined with azimuth, elevation or distance');
  }
  const target = has(camera, 'target') ? vector(camera.target, 'camera.target') : center;
  const preset = PRESETS[view === 'custom' ? 'iso' : view];
  let eyeDir = [...preset.dir];
  // Metadata defines which end is front; world +X remains the right-side preset.
  if (frontVector[2] < 0 && ['front', 'back', 'iso', 'custom'].includes(view)) eyeDir[2] *= -1;
  if (explicitEye) eyeDir = sub(vector(camera.eye, 'camera.eye'), target);
  else if (has(camera, 'azimuth') || has(camera, 'elevation')) {
    const azimuth = number(camera.azimuth === undefined ? Math.atan2(eyeDir[0], eyeDir[2] * (frontVector[2] < 0 ? -1 : 1)) * 180 / Math.PI : camera.azimuth, 'camera.azimuth') * Math.PI / 180;
    const elevation = number(camera.elevation === undefined ? Math.atan2(eyeDir[1], Math.hypot(eyeDir[0], eyeDir[2])) * 180 / Math.PI : camera.elevation, 'camera.elevation') * Math.PI / 180;
    eyeDir = [Math.sin(azimuth) * Math.cos(elevation), Math.sin(elevation), Math.cos(azimuth) * Math.cos(elevation) * (frontVector[2] < 0 ? -1 : 1)];
  }
  if (!eyeDir.every(Number.isFinite) || !Number.isFinite(Math.hypot(...eyeDir))) throw new Error('camera direction exceeds the finite numeric range');
  if (Math.hypot(...eyeDir) === 0) throw new Error('camera.eye must differ from camera.target');
  eyeDir = unit(eyeDir);
  let up = has(camera, 'up') ? vector(camera.up, 'camera.up') : [...preset.up];
  if (Math.hypot(...up) === 0) throw new Error('camera.up must be nonzero');
  up = unit(up);
  if (Math.hypot(...cross(up, eyeDir)) < 1e-8) {
    if (has(camera, 'up')) throw new Error('camera.up must not be parallel to the viewing direction');
    // A default lookAt at either pole has a deterministic, safe screen-up.
    up = [0, 0, eyeDir[1] >= 0 ? -1 : 1];
  }
  const right = unit(cross(up, eyeDir));
  up = unit(cross(eyeDir, right));
  const corners = [];
  for (const x of [min[0], max[0]]) for (const y of [min[1], max[1]]) for (const z of [min[2], max[2]]) {
    const relative = sub([x, y, z], target);
    corners.push([dot(relative, right), dot(relative, up), dot(relative, eyeDir)]);
  }
  if (!corners.flat().every(Number.isFinite)) throw new Error('camera-relative bounds exceed the finite numeric range');
  const tanV = Math.tan(fov * Math.PI / 360), tanH = tanV * aspect;
  const padding = 1.12;
  let distance;
  if (explicitEye) distance = Math.hypot(...sub(camera.eye, target));
  else if (has(camera, 'distance')) distance = number(camera.distance, 'camera.distance', true);
  else if (projection === 'perspective') {
    distance = Math.max(extent * 0.01, ...corners.flatMap(([x, y, z]) => [z + Math.abs(x) * padding / tanH, z + Math.abs(y) * padding / tanV, z + extent * 0.01]));
  } else distance = Math.max(extent, ...corners.map((p) => p[2] + extent));
  const eye = explicitEye ? [...camera.eye] : target.map((v, i) => v + eyeDir[i] * distance);
  if (!eye.every(Number.isFinite) || !Number.isFinite(distance)) throw new Error('resolved camera exceeds the finite numeric range');
  if (Math.hypot(...sub(eye, target)) === 0) throw new Error('resolved camera.eye equals camera.target at this numeric precision');
  const span = projection === 'orthographic'
    ? (camera.span === undefined ? Math.max(extent * 1e-6, ...corners.flatMap(([x, y]) => [2 * Math.abs(x) * padding / aspect, 2 * Math.abs(y) * padding])) : camera.span)
    : 2 * distance * tanV;
  const depths = corners.map((p) => distance - p[2]);
  const minimumDepth = Math.min(...depths), maximumDepth = Math.max(...depths);
  const epsilon = Math.max(Math.min(extent * 1e-4, distance * 1e-3), 1e-12);
  // A huge sideways extent must not move near beyond shallow visible geometry.
  // If bounds cross/lie behind the eye, keep a positive near plane and let the
  // caller clip crossing polygons before dividing by perspective depth.
  const near = minimumDepth > 0 ? Math.max(Number.MIN_VALUE, minimumDepth * 0.5) : epsilon;
  const far = Math.max(near * 2, maximumDepth + extent * 0.1, near + extent);
  if (![span, near, far, tanH, tanV].every(Number.isFinite) || span <= 0 || far <= near || tanH <= 0) {
    throw new Error('resolved camera projection exceeds the finite numeric range');
  }
  return { eye, target, up, eyeDir, right, projection, fov, span, near, far, aspect, distance };
}

/** Derived support-plane clip range; eye/framing stay exactly as requested. */
export function observationCameraClipping(bounds,camera,floor) {
  if(!floor?.enabled||!Array.isArray(floor.size)||!Array.isArray(floor.position))return {near:camera.near,far:camera.far};
  const extent=Math.max(...bounds.max.map((v,i)=>v-bounds.min[i]),1e-9),eye=camera.eye;
  const n=unit(floor.normal||[0,1,0]);
  // Match PlaneGeometry's shortest rotation from local +Z to the stage normal.
  const r=1+n[2],q=r<1e-8?[0,-1,0,0]:(()=>{const scale=Math.sqrt(2*r);return [-n[1]/scale,n[0]/scale,0,scale/2];})();
  const [qx,qy,,qw]=q,u=[1-2*qy*qy,2*qx*qy,-2*qy*qw],v=[2*qx*qy,1-2*qx*qx,2*qx*qw];
  let distance=0;
  for(const a of [-floor.size[0]/2,floor.size[0]/2])for(const b of [-floor.size[1]/2,floor.size[1]/2]){
    const p=floor.position.map((value,i)=>value+u[i]*a+v[i]*b);distance=Math.max(distance,Math.hypot(...sub(p,eye)));
  }
  for(const x of [bounds.min[0],bounds.max[0]])for(const y of [bounds.min[1],bounds.max[1]])for(const z of [bounds.min[2],bounds.max[2]]){
    const p=[x,y,z],offset=dot(sub(p,floor.position),n);const reflected=p.map((value,i)=>value-2*offset*n[i]);
    distance=Math.max(distance,Math.hypot(...sub(reflected,eye)));
  }
  // A ground plane must not force near to extent/1000. At model depth that
  // can quantize touching parts and the floor to the same 24-bit depth value.
  // Resolve near from actual view-space geometry and the closest visible
  // ground ray instead. The same equations serve viewport, capture and Host.
  const center=bounds.min.map((value,i)=>(value+bounds.max[i])/2);
  const forward=unit(sub(camera.target||center,eye));
  let reference=camera.up||[0,1,0];
  if(Math.hypot(...cross(forward,reference))<1e-8)reference=Math.abs(forward[1])>.99?[0,0,1]:[0,1,0];
  const right=unit(cross(forward,reference)),up=cross(right,forward);
  const depths=[];
  for(const x of [bounds.min[0],bounds.max[0]])for(const y of [bounds.min[1],bounds.max[1]])for(const z of [bounds.min[2],bounds.max[2]])depths.push(dot(sub([x,y,z],eye),forward));
  const minimumDepth=Math.min(...depths),epsilon=Math.max(extent*1e-5,1e-12);
  let near=minimumDepth>epsilon?minimumDepth*.5:epsilon;
  const groundDepths=[];
  if(camera.projection==='orthographic'){
    const span=camera.span??extent*2,aspect=camera.aspect??1.5,denom=dot(forward,n);
    if(Math.abs(denom)>1e-10)for(const x of [-1,1])for(const y of [-1,1]){
      const offset=right.map((value,i)=>value*x*span*aspect/2+up[i]*y*span/2);
      groundDepths.push(-dot(sub(eye.map((value,i)=>value+offset[i]),floor.position),n)/denom);
    }
    if(groundDepths.some(value=>value<=0)&&groundDepths.some(value=>value>0))near=epsilon;
  }else{
    const tv=Math.tan((camera.fov??42)*Math.PI/360),th=tv*(camera.aspect??1.5),height=dot(sub(eye,floor.position),n);
    for(const x of [-1,1])for(const y of [-1,1]){
      const direction=forward.map((value,i)=>value+right[i]*x*th+up[i]*y*tv),denom=dot(direction,n);
      if(Math.abs(denom)>1e-10)groundDepths.push(-height/denom);
    }
  }
  for(const depth of groundDepths)if(depth>epsilon&&Number.isFinite(depth))near=Math.min(near,depth*.5);
  return {near:Math.max(epsilon,near),far:Math.max(camera.far,distance*1.02+extent)};
}
