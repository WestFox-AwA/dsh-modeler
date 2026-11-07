import {prepareMaterialIntents,compileMaterialSource} from './material-intent.js';
import {hashContent} from './storage.js';
import {prepareDetailTiles} from './material-tiles.js';
import {bakeMaterialObjects} from './material-baking.js';
import {materialBakeFingerprint,resolveMaterialSpec,resolveDisplayMaterialSpec,materialSourceKey} from './material-source.js';
import {evaluateObject} from './kernel.js';
const find=(xs,id)=>{for(const o of xs||[]){if(o.id===id)return o;const hit=find(o.parts,id);if(hit)return hit;}};
// A copy declaration inherits the source's explicit role; it never guesses a role
// from a material name or equal color. Keep the native inheritance flag intact.
function inheritDeclaredRoles(doc,prepared,selected){
 const all=[];const walk=xs=>{for(const o of xs||[]){if(o.parts)walk(o.parts);else all.push(o);}};walk(doc.objects);const byId=new Map(all.map(o=>[o.id,o])),rows=new Map(prepared.compiled.map(r=>[r.role,r])),pending=new Set(prepared.ids),active=new Set(),done=new Set(),changed=new Set(prepared.changedRoles);
 const target=s=>typeof s?.target==='string'?s.target:s?.source?target(s.source):null;
 const visit=o=>{if(done.has(o.id))return;if(active.has(o.id))return;active.add(o.id);const inherited=o.meta?.nativeInheritMaterial===true,targetId=target(o.recipe?.params?.source),parent=inherited&&byId.get(targetId);if(parent){visit(parent);if(selected.has(parent.id))selected.add(o.id);const source=parent.meta?.materialIntent;if(source&&rows.has(source.role)){o.material=JSON.parse(JSON.stringify(parent.material));o.meta={...o.meta,materialIntent:JSON.parse(JSON.stringify(source)),materialInheritance:{version:1,target:parent.id},nativeInheritMaterial:true};}const extras=Object.fromEntries(Object.entries(o.meta?.materialIntents||{}).filter(([k])=>!k.startsWith('feature:inherited:')));for(const [key,value]of Object.entries(parent.meta?.materialIntents||{}))if(rows.has(value.role))extras['feature:inherited:'+parent.id+':'+key]=JSON.parse(JSON.stringify(value));if(Object.keys(extras).length)o.meta={...o.meta,materialIntents:extras};for(const i of [o.meta?.materialIntent,...Object.values(extras)]){const row=i&&rows.get(i.role);if(!row)continue;if(!row.ids.includes(o.id))row.ids.push(o.id);if(row.kind==='process'&&(selected.has(o.id)||changed.has(row.role)))pending.add(o.id);}}
 active.delete(o.id);done.add(o.id);};for(const o of all)visit(o);prepared.ids=[...pending];
}
function detailResolution(spec){
 const d=spec.detail;if(!d)return 256;let needed=256;
 for(const channel of ['baseColor','roughness','normal']){const roots=d.surface.layers.filter(l=>l.mask!==0).flatMap(l=>[l.mask?.signal,channel==='baseColor'?l.color?.signal:channel==='roughness'?l.roughness?.signal:l.height?.amplitude>0?l.height.signal:null]).filter(Boolean),seen=new Set();
 const visit=id=>{if(typeof id!=='string'||seen.has(id))return;seen.add(id);const n=d.surface.signals[id];if(!n)return;if(n.type==='mix'){visit(n.a);visit(n.b);if(typeof n.factor==='object')visit(n.factor.signal);}else if(n.type==='ramp')visit(n.input);else if(n.wavelength){const scale=n.mapping?.scale||d.surface.mapping?.scale||[1,1,1],stretch=n.stretch||[1,1,1],period=n.wavelength*Math.min(...scale.map((v,i)=>v*stretch[i]));needed=Math.max(needed,4*(d.channelSizes?.[channel]??d.size)/period);}};roots.forEach(visit);}
 return Math.min(1024,2**Math.ceil(Math.log2(needed)));
}

// Physical texel density. A fixed atlas resolution stretches the same pattern
// across a small part and a large one, so the large part looks blurred. Sample
// by metres instead: the finest declared period needs four pixels, and the atlas
// must cover the part's actual surface area.
const TEXEL_SAMPLES_PER_PERIOD = 4;
const DEFAULT_PIXELS_PER_METRE = 256;
const MIN_ATLAS = 256;
// The atlas shares one 16M-pixel job budget with every other baked object.
// Tiled materials keep a small atlas; only a non-separable macro surface may
// spend the larger one, because it has no tile to carry the missing detail.
const MAX_ATLAS_TILED = 512;
const MAX_ATLAS_MACRO = 1024;
const MIN_DETAIL = 256;
const MAX_DETAIL = 1024;

function powerOfTwo(value, min, max) {
  const clamped = Math.max(min, Math.min(max, value));
  return Math.min(max, 2 ** Math.ceil(Math.log2(clamped)));
}

function surfaceMetrics(object) {
  try {
    const evaluated = evaluateObject(object, {base: true});
    const positions = evaluated?.topology?.positions ?? evaluated?.positions;
    const indices = evaluated?.topology?.indices ?? evaluated?.indices;
    if (!positions?.length || !indices?.length) return null;
    let area = 0;
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < positions.length; i += 3) {
      for (let axis = 0; axis < 3; axis++) {
        const value = positions[i + axis];
        if (value < min[axis]) min[axis] = value;
        if (value > max[axis]) max[axis] = value;
      }
    }
    for (let i = 0; i < indices.length; i += 3) {
      const a = indices[i] * 3, b = indices[i + 1] * 3, c = indices[i + 2] * 3;
      const ab = [positions[b] - positions[a], positions[b + 1] - positions[a + 1], positions[b + 2] - positions[a + 2]];
      const ac = [positions[c] - positions[a], positions[c + 1] - positions[a + 1], positions[c + 2] - positions[a + 2]];
      const cross = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
      area += Math.hypot(cross[0], cross[1], cross[2]) / 2;
    }
    const extent = Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]);
    return {area: Math.max(area, 1e-9), extent: Math.max(extent, 1e-9)};
  } catch {
    return null;
  }
}

function finestPeriod(spec) {
  let period = Infinity;
  const consider = (wavelength, scale, stretch) => {
    if (!Number.isFinite(wavelength) || wavelength <= 0) return;
    const axes = [0, 1, 2].map((i) => (scale?.[i] ?? 1) * (stretch?.[i] ?? 1));
    period = Math.min(period, wavelength * Math.min(...axes));
  };
  for (const signal of Object.values(spec?.surface?.signals || {})) {
    consider(signal.wavelength, signal.mapping?.scale ?? spec?.surface?.mapping?.scale, signal.stretch);
  }
  if (spec?.detail?.size) {
    for (const signal of Object.values(spec.detail.surface?.signals || {})) {
      consider(signal.wavelength, signal.mapping?.scale ?? spec.detail.surface?.mapping?.scale, signal.stretch);
    }
    period = Math.min(period, spec.detail.size);
  }
  return Number.isFinite(period) ? period : null;
}

function texelPlan(object, spec, maxAtlas = MAX_ATLAS_TILED) {
  const metrics = surfaceMetrics(object);
  const period = finestPeriod(spec);
  const density = period ? TEXEL_SAMPLES_PER_PERIOD / period : DEFAULT_PIXELS_PER_METRE;
  const span = metrics ? Math.sqrt(metrics.area) : 1;
  const atlas = powerOfTwo(span * density, MIN_ATLAS, maxAtlas);
  const detailSize = spec?.detail?.size;
  const detail = detailSize ? powerOfTwo(detailSize * density, MIN_DETAIL, MAX_DETAIL) : null;
  return {
    density: Math.round(density * 100) / 100,
    period,
    atlas,
    detail,
    underSampled: span * density > maxAtlas,
    tileThreshold: Math.max(0.05, maxAtlas / density),
    span: Math.round(span * 1000) / 1000,
  };
}

export function prepareMaterialConstruction(doc,args={}){
 // Roles are optional authoring sugar. Every actual source uses this preparation
 // boundary, regardless of which public operation or program spelling supplied it.
 const prepared=prepareMaterialIntents(doc),selected=new Set(prepared.compiled.flatMap(r=>r.ids));inheritDeclaredRoles(doc,prepared,selected);
 const entries={},groups=new Map(),roles=new Map(prepared.compiled.map(r=>[r.materialId,r])),all=[];const walk=xs=>{for(const o of xs||[]){if(o.parts)walk(o.parts);else all.push(o);}};walk(doc.objects);
 const byId=new Map(all.map(o=>[o.id,o])),inherit=(o,active=new Set())=>{if(!o.meta?.nativeInheritMaterial||active.has(o.id))return;const source=o.recipe?.params?.source;let v=source;while(v&&!v.target)v=v.source;const parent=byId.get(v?.target);if(parent){active.add(o.id);inherit(parent,active);o.material=JSON.parse(JSON.stringify(parent.material));}};all.forEach(o=>inherit(o));
 for(const o of all){if(o.recipe?.type!=='nativeMesh')continue;const inputs=[o.material,...(o.recipe.params.features||[]).filter(f=>f.type==='material').map(f=>f.material)].filter(Boolean);let spatial=false,options={resolution:128,fidelity:args.fidelity??'warn'},resolution=256,plan=null;
 for(const input of inputs){const source=resolveMaterialSpec(doc,input),row=roles.get(input.materialRef);if(row)options={...options,...row.options};if(!(source.surface||source.detail||source.procedural))continue;spatial=true;const pre=texelPlan(o,source),compiled=compileMaterialSource(source,{...options,...(args.delivery?{delivery:args.delivery}:{}),...(args.detailSize?{detailSize:args.detailSize}:{}),...(pre.underSampled?{microThreshold:pre.tileThreshold}:{})}),key=materialSourceKey(source),tiled=compiled.plan?.delivery==='hybrid';plan=texelPlan(o,compiled.spec,tiled?MAX_ATLAS_TILED:MAX_ATLAS_MACRO);plan.autoTiled=pre.underSampled&&tiled;
 if(materialSourceKey(compiled.spec)!==key)entries[key]={version:1,sourceKey:key,specKey:materialSourceKey(compiled.spec),source,spec:compiled.spec,plan:compiled.plan};resolution=Math.max(resolution,detailResolution(compiled.spec));}
 if(!spatial)continue;options.resolution=args.resolution??Math.max(options.resolution??128,plan?.atlas??MIN_ATLAS);options.detailResolution=args.detailResolution??options.detailResolution??plan?.detail??resolution;for(const k of ['samples','margin','uvName'])if(args[k]!==undefined)options[k]=args[k];if(plan){options.texelDensity=plan.density;options.texelPeriod=plan.period;options.atlasUnderSampled=plan.underSampled;options.autoTiled=plan.autoTiled===true;}const p=o.recipe.params;p.features??=[];if(!p.features.some(f=>f.type==='uv')&&args.uv!=='preserve')p.features.push({id:'material-display-uv',type:'uv',method:args.uv??'smart'});if(p.features.length>64)throw Object.assign(Error('Automatic material UV exceeds64features'),{code:'feature_budget'});
 const key=hashContent(options),group=groups.get(key)||{ids:[],options};group.ids.push(o.id);groups.set(key,group);
 }
 if(Object.keys(entries).length)doc.meta={...doc.meta,materialCompilation:{version:1,entries}};else if(doc.meta?.materialCompilation)delete doc.meta.materialCompilation;
 return {...prepared,ids:[...groups.values()].flatMap(g=>g.ids),groups:[...groups.values()]};
}
export async function prepareConstructionTiles({backend,appearance,job,persist,doc,prepared}){
 const tiles=[];for(const row of prepared.groups){tiles.push(...await prepareDetailTiles({backend,appearance,job,persist,doc,args:{...row.options,ignoreDerivedSlots:true,ids:row.ids}}));}return tiles;
}
export async function bakeConstructionMaterials({backend,appearance,job,persist,doc,prepared}){
 const bakes=[];for(const row of prepared.groups){const ids=row.ids.filter(id=>{const o=find(doc.objects,id),p=o.recipe.params,b=doc.meta?.materialBakes?.[id],wanted=row.options.resolution;return !b||b.sourceHash!==p.sourceHash||b.topologyStamp!==p.topologyStamp||b.appearanceKey!==materialBakeFingerprint(doc,id)||(Number.isSafeInteger(wanted)&&b.outputs?.[0]?.width!==wanted);});for(let i=0;i<ids.length;i+=32)bakes.push(...await bakeMaterialObjects({backend,appearance,job,persist,doc,args:{...row.options,finishAuto:true},ids:ids.slice(i,i+32)}));}return bakes;
}
