import {validateMaterialSurface,resolveSurfaceMapping,materialSurfaceReferencedImages} from './material-surface.js';

const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v),copy=v=>JSON.parse(JSON.stringify(v));
const fail=(field,message,code='invalid_material_detail',extra={})=>{throw Object.assign(Error(field+': '+message),{code,detail:{field,...extra}});};
const keys=(v,allowed,field)=>{if(!record(v))fail(field,'expected object');for(const k of Object.keys(v))if(!allowed.includes(k))fail(field+'.'+k,'unsupported field');};
const hashPattern=/^[a-f0-9]{64}$/,detailOf=v=>v?.detail||(v?.version===1&&v?.surface?v:null);
const positive=(v,field)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<=0)fail(field,'expected positive finite metres');};
const vec=(v,field)=>{if(!Array.isArray(v)||v.length!==3||v.some(n=>typeof n!=='number'||!Number.isFinite(n)))fail(field,'expected three finite numbers');};
export const MATERIAL_DETAIL_PROJECTIONS=Object.freeze(['box','xy','xz','yz']);
export const MATERIAL_DETAIL_SPACES=Object.freeze(['object','world']);

export function materialDetailChannels(value){const d=detailOf(value),layers=d?.surface?.layers||[];return [...(layers.some(l=>l.color!==undefined)?['baseColor']:[]),...(layers.some(l=>l.roughness!==undefined)?['roughness']:[]),...(layers.some(l=>l.height?.amplitude>0)?['normal']:[])];}
export function materialDetailReferencedImages(value){const d=detailOf(value);return d?materialSurfaceReferencedImages(d.surface):[];}

function validateDetailSurface(surface){
 try{validateMaterialSurface(surface);}catch(error){if(error.detail?.field?.startsWith('material.surface'))fail(error.detail.field.replace('material.surface','material.detail.surface'),error.message.slice(error.detail.field.length+2));throw error;}
 if(surface.mapping&&surface.mapping.space!=='object')fail('material.detail.surface.mapping.space','detail tile signals use object mappings');
 for(const[name,signal]of Object.entries(surface.signals))if(resolveSurfaceMapping(surface,signal).space!=='object')fail('material.detail.surface.signals.'+name+'.mapping.space','detail tile signals use object mappings; place the tile with detail.space');
 for(const[i,layer]of surface.layers.entries())for(const k of Object.keys(layer))if(!['id','mask','color','roughness','height'].includes(k))fail(`material.detail.surface.layers[${i}].${k}`,'detail layers may write color, roughness and height only');
}
function signalConstant(surface,name,memo=new Map()){
 if(typeof name==='number')return name;if(memo.has(name))return memo.get(name);const s=surface.signals[name];memo.set(name,null);let value=null;
 if(s?.type==='constant')value=s.value;
 if(s?.type==='ramp'){const n=signalConstant(surface,s.input,memo);if(n!==null){value=Math.max(0,Math.min(1,(n-(s.min??0))/((s.max??1)-(s.min??0))));if(s.invert)value=1-value;}}
 if(s?.type==='mix'){const a=signalConstant(surface,s.a,memo),b=signalConstant(surface,s.b,memo),f=maskConstant(surface,s.factor,memo);if(f===0)value=a;else if(f===1)value=b;else if(a!==null&&a===b)value=a;else if(a!==null&&b!==null&&f!==null)value=a+(b-a)*f;}
 memo.set(name,value);return value;
}
function maskConstant(surface,mask=1,memo){if(typeof mask==='number')return mask;const n=signalConstant(surface,mask.signal,memo);if(n===null)return null;const v=Math.max(0,Math.min(1,(n-(mask.min??0))/((mask.max??1)-(mask.min??0))));return mask.invert?1-v:v;}
function scalarConstant(surface,v){if(typeof v==='number')return v;if(v.min===v.max)return v.min;const n=signalConstant(surface,v.signal);return n===null?null:v.min+(v.max-v.min)*n;}
function foldScalar(surface,channel,base){let value=base;for(const layer of surface.layers){if(layer[channel]===undefined)continue;const next=scalarConstant(surface,layer[channel]),mask=maskConstant(surface,layer.mask);if(mask===0)continue;if(mask===1){value=next;continue;}if(value!==null&&next===value)continue;value=value!==null&&next!==null&&mask!==null?value+(next-value)*mask:null;}return value;}

export function validateMaterialDetail(detail,spec={}){
 const at='material.detail';keys(detail,['version','size','channelSizes','projection','space','origin','rotation','surface'],at);
 if(detail.version!==1)fail(at+'.version','expected version 1');positive(detail.size,at+'.size');
 if(!MATERIAL_DETAIL_PROJECTIONS.includes(detail.projection))fail(at+'.projection','expected box/xy/xz/yz');
 if(!MATERIAL_DETAIL_SPACES.includes(detail.space))fail(at+'.space','expected object/world');
 for(const k of ['origin','rotation'])if(detail[k]!==undefined)vec(detail[k],at+'.'+k);
 validateDetailSurface(detail.surface);const channels=materialDetailChannels(detail),rough=channels.includes('roughness'),normal=channels.includes('normal'),color=channels.includes('baseColor');
 if(!channels.length)fail(at+'.surface.layers','declare color, roughness or positive height amplitude');
 if(detail.channelSizes!==undefined){keys(detail.channelSizes,channels,at+'.channelSizes');for(const[channel,size]of Object.entries(detail.channelSizes)){const field=at+'.channelSizes.'+channel;positive(size,field);if(!Number.isFinite(1/size))fail(field,'expected a positive finite reciprocal');const ratio=detail.size/size;if(!Number.isFinite(ratio)||ratio<1e-6||ratio>1024)fail(field,'physical size requires portable UV scale 1e-6..1024');}}
 if(spec.procedural!==undefined)fail('material.procedural','legacy procedural cannot be combined with portable detail');
 if(color&&spec.textures?.baseColor!==undefined)fail('material.textures.baseColor','detail color replaces the base color texture');
 if(rough&&spec.textures?.roughness!==undefined)fail('material.textures.roughness','detail roughness replaces the base roughness channel');
 if(rough&&spec.textures?.metalness!==undefined)fail('material.textures.metalness','glTF metallic/roughness share a UV set; detail roughness requires uniform metalness');
 if(normal&&spec.textures?.normal!==undefined)fail('material.textures.normal','detail normal cannot be combined with an existing normal texture');
 for(const[i,l]of(spec.surface?.layers||[]).entries()){
  if(color&&l.color!==undefined)fail(`material.surface.layers[${i}].color`,'macro surface cannot write color when detail replaces it');
  if(rough&&l.roughness!==undefined)fail(`material.surface.layers[${i}].roughness`,'macro surface cannot write roughness when detail replaces it');
  if(normal&&l.height?.amplitude>0)fail(`material.surface.layers[${i}].height`,'macro and detail height cannot be combined');
 }
 if(rough&&(spec.surface?.layers||[]).some(l=>l.metalness!==undefined))fail('material.surface.layers','fold constant macro metalness into material.metalness and remove layer declarations before attaching detail');
 return copy(detail);
}

// Canonical SHA-256 matches storage.hashContent, but remains synchronous and
// browser-safe because material-source participates in render/capture bundles.
const ordered=v=>Array.isArray(v)?v.map(ordered):record(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,ordered(v[k])])):v;
const K=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
export function sha256(text){const bytes=new TextEncoder().encode(text),length=Math.ceil((bytes.length+9)/64)*64,data=new Uint8Array(length);data.set(bytes);data[bytes.length]=128;const view=new DataView(data.buffer),bits=bytes.length*8;view.setUint32(length-8,Math.floor(bits/4294967296));view.setUint32(length-4,bits>>>0);const h=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19],w=new Uint32Array(64),r=(n,b)=>(n>>>b)|(n<<(32-b));for(let p=0;p<length;p+=64){for(let i=0;i<16;i++)w[i]=view.getUint32(p+i*4);for(let i=16;i<64;i++){const a=w[i-15],b=w[i-2];w[i]=(w[i-16]+(r(a,7)^r(a,18)^(a>>>3))+w[i-7]+(r(b,17)^r(b,19)^(b>>>10)))>>>0;}let[a,b,c,d,e,f,g,q]=h;for(let i=0;i<64;i++){const x=(q+(r(e,6)^r(e,11)^r(e,25))+((e&f)^(~e&g))+K[i]+w[i])>>>0,y=((r(a,2)^r(a,13)^r(a,22))+((a&b)^(a&c)^(b&c)))>>>0;q=g;g=f;f=e;e=(d+x)>>>0;d=c;c=b;b=a;a=(x+y)>>>0;}for(const[i,n]of[a,b,c,d,e,f,g,q].entries())h[i]=(h[i]+n)>>>0;}return h.map(n=>n.toString(16).padStart(8,'0')).join('');}
export function materialDetailKey(spec){if(!spec?.detail)return null;validateMaterialDetail(spec.detail,spec);const roughness=spec.roughness??.5;if(typeof roughness!=='number'||!Number.isFinite(roughness)||roughness<0||roughness>1)fail('material.roughness','expected number 0..1');const source={detail:spec.detail,roughness};if(materialDetailChannels(spec).includes('baseColor')){const color=spec.color??[.7,.7,.7,1];if(!(typeof color==='string'&&/^#[a-f0-9]{6}$/i.test(color)||Array.isArray(color)&&[3,4].includes(color.length)&&color.every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1)))fail('material.color','expected hex RGB or linear unit RGB(A)');source.color=color;}return sha256(JSON.stringify(ordered(source)));}

export function resolveMaterialDetail(doc,spec,{required=false,resolution}={}){
 if(!spec?.detail)return null;validateMaterialDetail(spec.detail,spec);const detailKey=materialDetailKey(spec),channels=materialDetailChannels(spec),cache=doc?.meta?.materialDetails?.[detailKey],reasons=[];
 if(resolution!==undefined&&(!Number.isSafeInteger(resolution)||resolution<64||resolution>1024))fail('detail.resolution','expected integer 64..1024');
 if(!record(cache))reasons.push('cache_missing');else{
  if(cache.version!==1)reasons.push('cache_version');if(cache.detailKey!==detailKey)reasons.push('cache_key_mismatch');
  if(!Number.isSafeInteger(cache.resolution)||cache.resolution<64||cache.resolution>1024||resolution!==undefined&&cache.resolution<resolution)reasons.push('cache_resolution');if(cache.size!==spec.detail.size)reasons.push('cache_size_mismatch');
  if(!Array.isArray(cache.outputs)||cache.outputs.length!==channels.length||new Set(cache.outputs.map(o=>o?.channel)).size!==channels.length)reasons.push('cache_channels');
  for(const o of Array.isArray(cache.outputs)?cache.outputs:[]){if(!record(o)||!channels.includes(o.channel)){reasons.push('cache_channel_unsupported');continue;}if(typeof o.image!=='string'||!hashPattern.test(o.image)){reasons.push('cache_image_hash');continue;}if(o.colorSpace!==(o.channel==='baseColor'?'srgb':'linear'))reasons.push('cache_color_space');if(o.width!==cache.resolution||o.height!==cache.resolution)reasons.push('cache_dimensions');const image=doc?.meta?.materialLibrary?.images?.[o.image];if(!record(image))reasons.push('cache_image_missing');else if(image.hash!==o.image||image.width!==cache.resolution||image.height!==cache.resolution||image.mime!==undefined&&image.mime!=='image/png')reasons.push('cache_image_descriptor');}
  for(const c of channels)if(!(Array.isArray(cache.outputs)?cache.outputs:[]).some(o=>o?.channel===c))reasons.push('cache_channel_missing_'+c);
 }
 if(reasons.length){if(required)fail('material.detail','bake the exact detail source before rendering','detail_bake_required',{detailKey,reasons:[...new Set(reasons)]});return null;}
 const textures={},detailTextures={};for(const o of cache.outputs){const ratio=spec.detail.size/(spec.detail.channelSizes?.[o.channel]??spec.detail.size),scale=ratio===1?{}:{scale:[ratio,ratio]};textures[o.channel]={type:'image',image:o.image,colorSpace:o.colorSpace,texCoord:1,...scale};detailTextures[o.channel]={type:'image',file:'image-'+o.image+'.png',colorSpace:o.colorSpace,...scale};}
 return {detailKey,cache:copy(cache),textures,detailTextures};
}

// Cache records are internal metadata, not an alternate material source. PNG bytes
// and shared pixel budgets are checked by material-assets/host before publication.
export function validateMaterialDetailCache(cache,{detailKey=cache?.detailKey,images,field='meta.materialDetails.'+detailKey}={}){
 if(!record(cache))fail(field,'expected cache object','invalid_detail_cache');
 if(typeof detailKey!=='string'||!hashPattern.test(detailKey)||cache.detailKey!==detailKey)fail(field+'.detailKey','expected exact table key','invalid_detail_cache');
 if(cache.version!==1)fail(field+'.version','expected version 1','invalid_detail_cache');
 if(!Number.isSafeInteger(cache.resolution)||cache.resolution<64||cache.resolution>1024)fail(field+'.resolution','expected integer 64..1024','invalid_detail_cache');
 if(typeof cache.size!=='number'||!Number.isFinite(cache.size)||cache.size<=0)fail(field+'.size','expected positive finite metres','invalid_detail_cache');
 if(!Array.isArray(cache.outputs)||cache.outputs.length<1||cache.outputs.length>3)fail(field+'.outputs','expected baseColor, roughness and/or normal outputs','invalid_detail_cache');
 const seen=new Set();for(const[i,o]of cache.outputs.entries()){
  const at=field+'.outputs['+i+']';if(!record(o)||!['baseColor','roughness','normal'].includes(o.channel)||seen.has(o.channel))fail(at+'.channel','expected distinct baseColor/roughness/normal channel','invalid_detail_cache');seen.add(o.channel);
  if(typeof o.image!=='string'||!hashPattern.test(o.image))fail(at+'.image','expected image content hash','invalid_detail_cache');
  const colorSpace=o.channel==='baseColor'?'srgb':'linear';if(o.colorSpace!==colorSpace)fail(at+'.colorSpace','expected '+colorSpace,'invalid_detail_cache');
  if(o.width!==cache.resolution||o.height!==cache.resolution)fail(at,'image dimensions must equal resolution','invalid_detail_cache');
  if(images!==undefined){const image=images[o.image];if(!record(image))fail(at+'.image','image not imported: '+o.image,'image_not_found');if(image.hash!==o.image||image.width!==cache.resolution||image.height!==cache.resolution||image.mime!==undefined&&image.mime!=='image/png')fail(at+'.image','image descriptor differs from cache','invalid_detail_cache');}
 }
 return copy(cache);
}
export function validateMaterialDetails(doc){
 const table=doc?.meta?.materialDetails;if(table===undefined)return true;if(!record(table))fail('meta.materialDetails','expected cache table','invalid_detail_cache');if(Object.keys(table).length>512)fail('meta.materialDetails','at most 512 cached detail sources','invalid_detail_cache');
 for(const[key,cache]of Object.entries(table))validateMaterialDetailCache(cache,{detailKey:key,images:doc?.meta?.materialLibrary?.images||{}});return true;
}

const refs=s=>s.type==='mix'?[s.a,s.b,s.factor?.signal].filter(x=>typeof x==='string'):s.type==='ramp'?[s.input].filter(x=>typeof x==='string'):[];
const layerRefs=l=>[l.mask?.signal,l.color?.signal,l.roughness?.signal,l.height?.signal].filter(x=>typeof x==='string');
function closure(surface,roots){const out=new Set(),visit=n=>{if(out.has(n))return;out.add(n);for(const r of refs(surface.signals[n]))visit(r);};roots.forEach(visit);return out;}
function periods(surface,roots){const used=closure(surface,roots),out=[],issues=[],spaces=new Set();for(const n of used){const s=surface.signals[n],m=resolveSurfaceMapping(surface,s);if(!['object','world'].includes(m.space))issues.push({code:'nonphysical_mapping',field:'material.surface.signals.'+n+'.mapping.space',message:'Portable detail requires object/world metre signals.'});if(['constant','mix','ramp'].includes(s.type))continue;spaces.add(m.space);if(s.wavelength===undefined){issues.push({code:'unknown_signal_frequency',field:'material.surface.signals.'+n,message:'Image wavelength cannot be proven from its source hash.'});continue;}const scale=m.scale||[1,1,1],stretch=s.stretch||[1,1,1],axes=scale.map((v,i)=>v*stretch[i]);out.push({name:n,min:s.wavelength*Math.min(...axes),max:s.wavelength*Math.max(...axes),space:m.space});}return {used,periods:out,issues,spaces};}
function foldUniform(spec){if(!spec.surface)return null;if(Object.keys(spec.textures||{}).some(c=>spec.surface.layers.some(l=>l[c==='baseColor'?'color':c]!==undefined)))return null;const out=copy(spec),changes=[];for(const l of spec.surface.layers){const mask=maskConstant(spec.surface,l.mask);if(mask===null)return null;if(mask===0)continue;if(l.height?.amplitude>0)return null;for(const c of ['color','roughness','metalness','clearcoat','clearcoatRoughness']){if(l[c]===undefined)continue;const next=c==='color'?(typeof l[c]==='string'?l[c]:null):scalarConstant(spec.surface,l[c]);if(next===null)return null;if(c==='color'){if(mask===1||out.color===next)out.color=next;else return null;}else{const base=out[c]??(c==='roughness'?.5:c==='metalness'?.1:0);out[c]=base+(next-base)*mask;}changes.push({layer:l.id,channel:c,mask});}}delete out.surface;return {spec:out,changes};}
const OUTPUTS=['color','roughness','metalness','clearcoat','clearcoatRoughness','height'];
function result(source,requested,delivery,fields={}){return {spec:copy(source),plan:{version:1,requested,delivery,status:delivery==='atlas'?'unchanged':'ready',separable:delivery==='hybrid',reasons:[],warnings:[],transformations:[],...fields}};}

// Pure source partition, not a fidelity verdict: auto uses physical periods
// <= .05m unless supplied aggregate sampling already meets four pixels/period.
// Cross-frequency masks and packed MR conflicts retain the full atlas source;
// explicit hybrid rejects. Projection/periodicity is always reported derivation.
export function planMaterialDelivery(value,options={}){
 if(!record(value))fail('material','expected JSON object');const original=copy(value),spec=copy(value),delivery=options.delivery??'auto';if(!['auto','atlas','hybrid'].includes(delivery))fail('delivery','expected auto/atlas/hybrid','invalid_material_delivery');
 const threshold=options.microThreshold??.05;positive(threshold,'microThreshold');const requestedSpace=options.detailSpace??options.space;if(requestedSpace!==undefined&&!MATERIAL_DETAIL_SPACES.includes(requestedSpace))fail('detailSpace','expected object/world');if(spec.surface)validateMaterialSurface(spec.surface);
 if(spec.detail){validateMaterialDetail(spec.detail,spec);if(requestedSpace!==undefined&&requestedSpace!==spec.detail.space)fail('detailSpace','explicit detail placement cannot be silently reinterpreted','detail_delivery_conflict');if(delivery==='atlas')fail('delivery','explicit detail cannot be discarded into atlas','detail_delivery_conflict');return result(spec,delivery,'hybrid',{detailKey:materialDetailKey(spec),detailChannels:materialDetailChannels(spec),explicit:true});}
 if(delivery==='atlas')return result(spec,delivery,'atlas',{warnings:[{code:'atlas_sampling_unverified',message:'Atlas fidelity requires measured texel density.'}]});
 if(!spec.surface){if(delivery==='hybrid'&&spec.procedural)fail('material.procedural','legacy generated procedural cannot derive portable metre detail','detail_not_separable');return result(spec,delivery,spec.procedural?'atlas':'uniform',{separable:true});}
 const uniform=foldUniform(spec);if(uniform)return result(uniform.spec,delivery,'uniform',{separable:true,transformations:[{type:'fold_uniform_surface',channels:uniform.changes}]});
 const surface=spec.surface,macro=copy(surface),microLayers=[],reasons=[],transformations=[];let baseRoughness=spec.roughness??.5,variableRoughness=false;
 const reason=(code,field,message)=>reasons.push({code,field,message});
 for(const[i,l]of surface.layers.entries()){
  const field=`material.surface.layers[${i}]`,mask=maskConstant(surface,l.mask),micro={id:l.id,...(l.mask!==undefined?{mask:copy(l.mask)}:{})};
  if(l.roughness!==undefined){const v=scalarConstant(surface,l.roughness);if(mask===0)transformations.push({type:'fold_zero_mask',layer:l.id,channel:'roughness'});else if(!variableRoughness&&v!==null&&mask!==null){baseRoughness+=(v-baseRoughness)*mask;transformations.push({type:'fold_scalar_roughness',layer:l.id,value:baseRoughness});}else if(!variableRoughness&&v===baseRoughness){}else{micro.roughness=copy(l.roughness);variableRoughness=true;}}
  if(l.height?.amplitude>0&&mask!==0)micro.height=copy(l.height);
  if(micro.roughness!==undefined||micro.height!==undefined){const f=periods(surface,layerRefs(micro));reasons.push(...f.issues);for(const p of f.periods)if(p.max>threshold)reason('cross_frequency_dependency',field,`Signal ${p.name} at ${p.max}m exceeds the ${threshold}m detail threshold.`);if(mask===null&&typeof l.mask==='object'){const mf=periods(surface,[l.mask.signal]);if(!mf.periods.length||mf.periods.some(p=>p.max>threshold)||mf.issues.length)reason('macro_mask_drives_detail',field+'.mask','A nonuniform macro mask drives micro roughness/height.');}microLayers.push(micro);}
 }
 const colorLayers=surface.layers.filter(l=>l.color!==undefined),colorWarnings=[];let ownsColor=false;
 if(colorLayers.length){
  const colorRoots=colorLayers.flatMap(l=>[l.color?.signal,l.mask?.signal].filter(n=>typeof n==='string')),colorFreq=periods(surface,colorRoots),otherFreq=periods(surface,microLayers.flatMap(layerRefs)),colorReasons=[...colorFreq.issues];
  if(spec.textures?.baseColor)colorReasons.push({code:'base_color_texture_conflict',message:'A base color texture contributes to the complete color chain.'});
  if(colorFreq.periods.some(p=>p.max>threshold))colorReasons.push({code:'macro_color_frequency',message:'A color signal or mask contains macro frequency; the complete color chain stays in the atlas.'});
  if(new Set([...colorFreq.spaces,...otherFreq.spaces]).size>1)colorReasons.push({code:'mixed_color_detail_spaces',message:'Color and other detail channels require different placements.'});
  if(requestedSpace!==undefined&&colorFreq.spaces.size===1&&![...colorFreq.spaces].includes(requestedSpace))colorReasons.push({code:'color_space_reinterpretation',message:'Color placement cannot be reinterpreted as the requested detail space.'});
  if(!colorReasons.length){
   ownsColor=true;const byId=new Map(microLayers.map(l=>[l.id,l]));for(const l of colorLayers){const target=byId.get(l.id)||{id:l.id,...(l.mask!==undefined?{mask:copy(l.mask)}:{})};target.color=copy(l.color);byId.set(l.id,target);}
   microLayers.splice(0,microLayers.length,...surface.layers.filter(l=>byId.has(l.id)).map(l=>byId.get(l.id)));
   transformations.push({type:'partition_complete_color_chain',layers:colorLayers.map(l=>l.id),proof:'all color signal and mask dependencies are constant or micro physical periods',threshold});
  }else colorWarnings.push({code:'macro_color_retained',message:'The entire color channel remains in the atlas; independent roughness/height delivery is unaffected.',reasons:colorReasons});
 }
 if(spec.textures?.roughness&&surface.layers.some(l=>l.roughness!==undefined))reason('roughness_texture_conflict','material.textures.roughness','A base roughness texture conflicts with replacement detail roughness.');
 if(spec.textures?.normal&&microLayers.some(l=>l.height))reason('normal_texture_conflict','material.textures.normal','Detail height cannot combine with a base normal texture.');
 const roots=microLayers.flatMap(layerRefs),freq=periods(surface,roots);if(requestedSpace!==undefined&&freq.spaces.size===1&&![...freq.spaces].includes(requestedSpace))reason('detail_space_reinterpretation','detailSpace','Changing object/world placement requires an explicit reauthored detail source or exact coordinate conversion.');if(freq.spaces.size>1)reason('mixed_detail_spaces','material.surface.mapping','A single tile cannot preserve object and world signal placement together.');
 if(variableRoughness){if(spec.textures?.metalness)reason('metalness_texture_uv_conflict','material.textures.metalness','glTF metallic/roughness share one UV set.');const metal=foldScalar(surface,'metalness',spec.metalness??.1);if(metal===null)reason('macro_metalness_uv_conflict','material.surface.layers','Nonuniform macro metalness cannot share the detail roughness UV set.');else{spec.metalness=metal;for(const l of macro.layers)delete l.metalness;transformations.push({type:'fold_scalar_metalness',value:metal});}}
 const unresolved=()=>{const output=result(original,delivery,'atlas',{status:'atlas-unresolved',separable:false,reasons,warnings:[{code:'detail_separation_unresolved',message:'Original macro and micro contributions remain intact in the atlas; no detail fidelity is claimed.'}]});if(delivery==='hybrid')fail('delivery','surface is not separable into portable detail','detail_not_separable',{reasons:copy(reasons),plan:output.plan});return output;};
 if(reasons.length)return unresolved();if(!microLayers.length){if(delivery==='hybrid'){reason('no_micro_outputs','material.surface','No nonuniform detail channels were found.');return unresolved();}return result(original,delivery,'atlas',{separable:true});}
 const density=options.atlasPixelsPerMetre??options.sampling?.atlasPixelsPerMetre??options.sampling?.pixelsPerMetre,minPixels=options.minPixelsPerWavelength??4;if(delivery==='auto'&&Number.isFinite(density)&&density>0&&freq.periods.length&&freq.periods.every(p=>p.min*density>=minPixels))return result(original,delivery,'atlas',{separable:true,reasons:[{code:'atlas_density_sufficient',message:'Provided aggregate atlas density meets the requested samples per period; local coverage remains unverified.'}]});
 const projection=options.detailProjection??options.projection??'box',size=options.detailSize??options.size??(freq.periods.length?Math.max(...freq.periods.map(p=>p.max)):.001)*4;if(!MATERIAL_DETAIL_PROJECTIONS.includes(projection))fail('detailProjection','expected box/xy/xz/yz');positive(size,'detailSize');
 const signals={};for(const[n,s]of Object.entries(surface.signals))if(freq.used.has(n))signals[n]={...copy(s),mapping:{...resolveSurfaceMapping(surface,s),space:'object'}};
 const detail={version:1,size,projection,space:[...freq.spaces][0]||'object',surface:{version:1,mapping:{space:'object'},signals,layers:microLayers}};
 for(const l of macro.layers){delete l.roughness;delete l.height;if(ownsColor)delete l.color;}macro.layers=macro.layers.filter(l=>OUTPUTS.some(k=>l[k]!==undefined));if(macro.layers.length)spec.surface=macro;else delete spec.surface;
 spec.roughness=baseRoughness;spec.detail=detail;validateMaterialDetail(detail,spec);transformations.push({type:'partition_independent_channels',macro:[...(ownsColor?[]:['color']),'metalness','clearcoat','clearcoatRoughness'],detail:[...(ownsColor?['color']:[]),'roughness','height'],layers:microLayers.map(l=>l.id)},{type:'periodic_projection',projection,space:detail.space,size,plane:'local XY metres, normal +Z'});
 return result(spec,delivery,'hybrid',{detailKey:materialDetailKey(spec),detailChannels:materialDetailChannels(spec),separable:true,transformations,proof:{channels:'independent ordered layer outputs',masks:'uniform or detail-only',signalIds:[...freq.used],maxPeriod:Math.max(...freq.periods.map(p=>p.max),0)},warnings:[{code:'periodic_detail_projection',message:`Detail was projected to a seamless local XY tile using ${projection}; observed projection continuity is not claimed.`},...colorWarnings]});
}
