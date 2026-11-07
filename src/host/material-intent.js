import {createSurfaceRecipe} from './material-recipes.js';
import {validateMaterialSpec,materialLibrary,resolveMaterialSpec} from './material-source.js';
import {planMaterialDelivery,materialDetailKey} from './material-detail.js';
import {hashContent} from './storage.js';

const copy=value=>JSON.parse(JSON.stringify(value));
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const fail=(field,message,code='invalid_material_intent')=>{throw Object.assign(Error(field+': '+message),{code,detail:{field}});};
const keys=(value,allowed,field)=>{if(!record(value))fail(field,'expected object');for(const key of Object.keys(value))if(!allowed.includes(key))fail(field+'.'+key,'unsupported field');};
const own=(value,key)=>Object.prototype.hasOwnProperty.call(value,key);
const OPTIONS=['delivery','resolution','detailResolution','detailSize','detailProjection','fidelity','label','recipeVersion'];
export const FINISH_RECIPE_VERSION=3;
const finishVersion=value=>{if(![2,3].includes(value))fail('finish.recipeVersion','expected 2 or 3');return value;};
const defaultDetailResolution=(recipe,version)=>version===3?({brushed_metal:512,rolled_metal:512,cast_metal:512,polished_metal:1024,fiber_weave:512}[recipe]??256):recipe==='fiber_weave'?512:256;
export function materialRole(role){if(typeof role!=='string'||!/^[A-Za-z0-9_-]{1,64}$/.test(role)||['__proto__','prototype','constructor'].includes(role))fail('finish.role','expected stable 1..64 ASCII letters/digits/_/-');return role;}
function finishOptions(value={}){
 keys(value,OPTIONS,'finish.options');const out={delivery:'auto',resolution:128,detailResolution:256,fidelity:'warn',...copy(value)};
 for(const [key,lo,hi]of [['resolution',64,2048],['detailResolution',64,1024]])if(!Number.isSafeInteger(out[key])||out[key]<lo||out[key]>hi)fail('finish.'+key,`expected integer ${lo}..${hi}`);
 if(!['auto','atlas','hybrid'].includes(out.delivery))fail('finish.delivery','expected auto/atlas/hybrid');
 if(!['warn','strict'].includes(out.fidelity))fail('finish.fidelity','expected warn/strict');
 if(out.detailSize!==undefined&&(!Number.isFinite(out.detailSize)||out.detailSize<=0))fail('finish.detailSize','expected positive metres');
 if(out.detailProjection!==undefined&&!['box','xy','xz','yz'].includes(out.detailProjection))fail('finish.detailProjection','expected box/xy/xz/yz');
 if(out.recipeVersion!==undefined)finishVersion(out.recipeVersion);
 if(out.label!==undefined&&(typeof out.label!=='string'||!out.label.trim()||out.label.length>120))fail('finish.label','expected 1..120 characters');return out;
}
const srgb=n=>n<=.0031308?12.92*n:1.055*Math.pow(n,1/2.4)-.055;
const linear=n=>n<=.04045?n/12.92:Math.pow((n+.055)/1.055,2.4);
function opticalPair(color,contrast){const rgb=[0,2,4].map(i=>linear(parseInt(color.slice(1+i,3+i),16)/255));return [-1,1].map(sign=>'#'+rgb.map(n=>Math.round(srgb(Math.max(0,Math.min(1,n*(1+sign*contrast))))*255).toString(16).padStart(2,'0')).join(''));}
export function createFinishSpec(recipe,params={}, {recipeVersion=FINISH_RECIPE_VERSION}={}){
 finishVersion(recipeVersion);if(!record(params))fail('finish.params','expected object');const legacy=copy(params);
 if(recipe!=='fiber_weave'&&(own(params,'towContrast')||own(params,'towRoughnessContrast')))fail('finish.params','tow parameters require fiber_weave');
 const contrast=params.towContrast??.35,roughContrast=params.towRoughnessContrast??.06;
 if(recipe==='fiber_weave'){
  for(const [key,value,max]of [['towContrast',contrast,.9],['towRoughnessContrast',roughContrast,.25]])if(!Number.isFinite(value)||value<0||value>max)fail('finish.params.'+key,'expected number 0..'+max);
  delete legacy.towContrast;delete legacy.towRoughnessContrast;
  if(legacy.color===undefined)legacy.color='#51565b';
 }
 const spec=createSurfaceRecipe(recipe,legacy),finish=spec.surface.layers.find(layer=>layer.id==='finish');
 if(typeof finish.color==='object'){
  if(recipe==='fiber_weave'){const [a,b]=opticalPair(spec.color,contrast);finish.color={...finish.color,a,b};finish.roughness={...finish.roughness,min:Math.max(0,spec.roughness-roughContrast),max:Math.min(1,spec.roughness+roughContrast)};}
  else finish.color=spec.color;
 }
 if(recipeVersion===3&&['brushed_metal','rolled_metal'].includes(recipe)){
  const direction=params.direction??[1,0,0],length=Math.hypot(...direction),unit=direction.map(n=>n/length),axis=unit.findIndex(n=>Math.abs(n)>1-1e-8);if(axis<0||unit.some((n,i)=>i!==axis&&Math.abs(n)>1e-8))fail('finish.params.direction','version3 uses cardinal recipe axes; orient the mapping for other brush directions or explicitly pin recipeVersion2');
  const stretch=[1,1,1];stretch[axis]=16;const signals=spec.surface.signals;
  for(const id of ['brush','fineBrush']){const previous=signals[id];signals[id]={type:'noise',wavelength:previous.wavelength,seed:previous.seed,detail:2,stretch:copy(stretch)};}
  for(const id of ['surfaceHeight',finish.height.signal]){const previous=signals[id];signals[id]={type:'mix',a:.5,b:'microHeight',factor:previous.factor};}
  signals.brushRoughness={...signals.brushRoughness,b:'grain'};
 }
 return validateMaterialSpec(spec);
}
export function finishRecipeSemantics(recipe,params={}, {recipeVersion=FINISH_RECIPE_VERSION}={}){
 const spec=createFinishSpec(recipe,params,{recipeVersion}),fiber=recipe==='fiber_weave',directional=recipeVersion===3&&['brushed_metal','rolled_metal'].includes(recipe);
 const semantics={version:recipeVersion,derivedFrom:{api:'createSurfaceRecipe',version:1},changes:fiber?['coated_tow_linear_reflectance_contrast','tow_roughness_contrast']:['uniform_pigment'],units:{wavelength:'mapping units: object/world/frame metres; UV units; generated normalized',amplitude:'metres',roughness:'unitless',towContrast:'fraction of mean linear RGB reflectance'},defaults:fiber?{color:'#51565b',towContrast:.35,towRoughnessContrast:.06}: {pigment:'uniform'},assumptions:fiber?['Clean resin-coated carbon tows; optical contrast approximated by scalar albedo and roughness, not anisotropic fibre scattering.','Warp/weft/interlace and original wavelength/height mechanisms retained.']:['Homogeneous clean pigment/alloy; roughness and height carry process structure.'],mapping:copy(spec.surface.mapping),physicalScaleChanged:false};
 if(directional){const height=spec.surface.layers.find(l=>l.id==='finish').height,mix=spec.surface.signals[height.signal];semantics.changes.push('directional_seeded_noise_roughness','roughness_micro_input_replaced_by_coarse_grain','remove_periodic_height_keep_isotropic_microheight');semantics.defaults.directionalRoughness={type:'seeded_noise',stretchAlongMarks:16,markDirection:copy(params.direction??[1,0,0]),stretch:copy(spec.surface.signals.brush.stretch),axes:'params.direction is the longitudinal mark axis, not the old perpendicular wave-phase axis; cardinal recipe axes only, rotate authored mapping to orient the process',signalIds:['brush','grain'],removedMicroRoughnessInput:'microRoughness',mixFactor:spec.surface.signals.brushRoughness.factor,wavelengthChanged:false};semantics.height={amplitude:height.amplitude,microFactor:mix.factor,effectiveMicroAmplitude:height.amplitude*mix.factor,coarseContribution:0,channelSignal:height.signal,removedPeriodicInputs:['surfaceHeight',height.signal],retainedSignal:'microHeight',retained:'Existing isotropic microHeight with the original amplitude*mix.factor contribution.'};semantics.assumptions.push('Version2 periodic directional height is removed; directional structure and coarse isotropic grain contribute roughness only, and microfeel comes from retained microHeight only.','Authored wavelength parameters, base mapping, declared amplitude, microHeight source and its exact mixed contribution are unchanged; active microRoughness is deliberately removed from roughness, and no grain/height/contrast boost is applied.');}
 if(recipeVersion===3)semantics.defaults.detailResolution=defaultDetailResolution(recipe,recipeVersion);
 return semantics;
}
function customProcessSpec(value){
 const spec=validateMaterialSpec(value),varying=layer=>layer.mask!==0&&(typeof layer.color==='object'&&layer.color.a!==layer.color.b||['roughness','metalness'].some(k=>typeof layer[k]==='object'&&layer[k].min!==layer[k].max)||layer.height?.amplitude>0||typeof layer.mask==='object'&&['color','roughness','metalness','clearcoat','clearcoatRoughness'].some(k=>layer[k]!==undefined));
 if(!spec.procedural&&!Object.keys(spec.textures||{}).length&&![...(spec.surface?.layers||[]),...(spec.detail?.surface?.layers||[])].some(varying))fail('finish.spec','constant optical values require uniform(role,spec,reason)');return spec;
}
export function finishDeclaration(role,recipe,params={},options={}){
 if(role!==undefined)materialRole(role);let source;
 if(record(recipe)){if(arguments.length>3&&Object.keys(options).length)fail('finish.options','custom finish uses finish(role,spec,options)');source={version:1,spec:customProcessSpec(recipe),...finishOptions({recipeVersion:FINISH_RECIPE_VERSION,...params})};}
 else {const version=finishVersion(options.recipeVersion===undefined?FINISH_RECIPE_VERSION:options.recipeVersion),opts=finishOptions({...options,recipeVersion:version,...(options.detailResolution===undefined?{detailResolution:defaultDetailResolution(recipe,version)}:{})});createFinishSpec(recipe,params,{recipeVersion:opts.recipeVersion});source={version:1,recipe,params:copy(params),...opts};}
 source.role=role??'finish_'+hashContent(source).slice(0,32);return {finish:source};
}
export function uniformDeclaration(role,spec,reason){
 if(role!==undefined)materialRole(role);if(typeof reason!=='string'||!reason.trim()||reason.length>500)fail('finish.reason','explicit 1..500 character reason required');
 const value=validateMaterialSpec(spec);if(value.surface||value.detail||value.procedural||Object.keys(value.textures||{}).length)fail('finish.uniform','uniform intent requires constant optical values');
 const source={version:1,uniform:value,reason:reason.trim()};source.role=role??'uniform_'+hashContent(source).slice(0,32);return {finish:source};
}
export function normalizeMaterialIntent(value){
 if(!record(value))return value;
 if(own(value,'finish')){
  keys(value,['finish'],'material');const f=value.finish;
  keys(f,['version','role','recipe','params','spec','uniform','reason',...OPTIONS],'finish');if(f.version!==1)fail('finish.version','expected 1');
  if(own(f,'uniform')){if(Object.keys(f).some(k=>!['version','role','uniform','reason'].includes(k)))fail('finish','uniform cannot include recipe/options');return uniformDeclaration(f.role,f.uniform,f.reason);}
  if(own(f,'reason'))fail('finish.reason','uniform only');const opts=Object.fromEntries(OPTIONS.filter(k=>own(f,k)).map(k=>[k,f[k]]));if(own(f,'spec')){if(own(f,'recipe')||own(f,'params'))fail('finish.spec','choose spec or recipe/params');return finishDeclaration(f.role,f.spec,opts);}return finishDeclaration(f.role,f.recipe,f.params??{},opts);
 }
 if(own(value,'recipe')||own(value,'spec')){keys(value,['recipe','role','params','spec','options',...OPTIONS],'material');if(own(value,'spec')&&(own(value,'recipe')||own(value,'params')))fail('material.spec','choose spec or recipe/params');if(value.options!==undefined&&!record(value.options))fail('material.options','expected object');const options={...(value.options||{})};for(const key of OPTIONS)if(own(value,key)){if(own(options,key))fail('material.'+key,'duplicate option');options[key]=value[key];}return own(value,'spec')?finishDeclaration(value.role,value.spec,options):finishDeclaration(value.role,value.recipe,value.params??{},options);}
 return copy(value);
}

// Fold only provably uniform ordered channels. The unabridged recipe remains in
// role.specSource/source; every delivery derivation is reported in its plan.
function foldConstantChannels(value){
 const spec=copy(value),changes=[],surface=spec.surface;if(!surface)return {spec,changes};
 for(const channel of ['color','metalness','roughness','clearcoat','clearcoatRoughness']){
  const layers=surface.layers.filter(l=>l[channel]!==undefined);if(!layers.length)continue;
  const scalar=channel!=='color';let current=spec[channel]??(channel==='roughness'?.5:0),valid=true;
  for(const layer of layers){const mask=layer.mask??1,v=layer[channel];if(typeof mask!=='number'||(scalar?typeof v!=='number':typeof v!=='string'||![0,1].includes(mask))){valid=false;break;}if(mask===0)continue;current=scalar?current+(v-current)*mask:v;}
  if(!valid)continue;spec[channel]=current;for(const layer of layers)delete layer[channel];changes.push({type:'fold_uniform_channel',channel,value:current,layers:layers.map(l=>l.id)});
 }
 surface.layers=surface.layers.filter(l=>Object.keys(l).some(k=>!['id','mask'].includes(k)));if(!surface.layers.length)delete spec.surface;return {spec,changes};
}
// Shared source-to-display normalization; source values remain authoritative.
export function compileMaterialSource(original,options={}){
 const folded=foldConstantChannels(validateMaterialSpec(original)),planned=planMaterialDelivery(folded.spec,options),final=foldConstantChannels(planned.spec);
 return {spec:validateMaterialSpec(final.spec),plan:{...planned.plan,transformations:[...folded.changes,...(planned.plan.transformations||[]),...final.changes]}};
}
export function createRecipeMaterial(recipe,params={},options={}){
 const c=compileMaterialIntent(finishDeclaration('material_source',recipe,params,options));
 return {source:c.specSource,spec:c.spec,plan:c.plan,options:c.options,recipeVersion:c.recipeVersion};
}
export function compileMaterialIntent(value,{recipeVersion}={}){
 if(!record(value))fail('finish','expected declaration object');const raw=own(value,'finish')?value.finish:value;if(!record(raw))fail('finish','expected declaration object');const process=!own(raw,'uniform'),pinned=own(raw,'recipeVersion');if(recipeVersion!==undefined)finishVersion(recipeVersion);const selectedVersion=process?finishVersion(pinned?raw.recipeVersion:recipeVersion??FINISH_RECIPE_VERSION):null;if(process&&pinned&&recipeVersion!==undefined&&selectedVersion!==recipeVersion)fail('finish.recipeVersion','source pin conflicts with registered recipeVersion','material_role_conflict');const declaration=process&&!pinned&&recipeVersion!==undefined?{...copy(raw),recipeVersion:selectedVersion}:raw,source=normalizeMaterialIntent({finish:declaration}).finish;if(process&&!pinned&&recipeVersion!==undefined)delete source.recipeVersion;
 const kind=own(source,'uniform')?'uniform':'process',options=kind==='process'?finishOptions(Object.fromEntries(OPTIONS.filter(k=>own(source,k)).map(k=>[k,source[k]]))):{};
 const custom=kind==='process'&&own(source,'spec'),original=kind==='process'?(custom?copy(source.spec):createFinishSpec(source.recipe,source.params,{recipeVersion:selectedVersion})):copy(source.uniform),planned=kind==='process'?compileMaterialSource(original,options):{spec:copy(original),plan:{version:1,delivery:'uniform',status:'ready',transformations:[]}},final={spec:planned.spec},derived=[];let normalSplit=null;
 if(!custom&&selectedVersion===3&&['brushed_metal','rolled_metal'].includes(source.recipe)&&final.spec.detail?.surface.signals.microHeight&&final.spec.detail.surface.layers.some(layer=>layer.height?.amplitude>0&&layer.mask!==0)){const detail=final.spec.detail,signal=detail.surface.signals.microHeight,mapping={...detail.surface.mapping,...signal.mapping},scale=mapping.scale??[1,1,1],stretch=signal.stretch??[1,1,1],period=signal.wavelength*Math.max(...scale.map((value,i)=>value*stretch[i])),normalSize=32*period;detail.channelSizes={...(detail.channelSizes||{}),normal:normalSize};normalSplit={channel:'normal',baseSize:detail.size,size:normalSize,maxAuthoredPeriod:period,periodsPerTile:32,detailResolution:options.detailResolution,nominalSamplesPerPeriod:options.detailResolution/32,retainedSignal:'microHeight',heightAmplitudeChanged:false,wavelengthChanged:false};derived.push({type:'per_channel_physical_tile',...normalSplit});}
 const spec=validateMaterialSpec(final.spec),plan={...planned.plan,transformations:[...(planned.plan.transformations||[]),...derived],...(normalSplit?{detailKey:materialDetailKey(spec),channelSizes:copy(spec.detail.channelSizes)}:{})};
 const compiled={id:source.role,role:source.role,kind,...(kind==='process'?{recipe:custom?'custom_surface':source.recipe,recipeVersion:selectedVersion,semantics:custom?{version:selectedVersion,origin:'authored_editable_spec',changes:[],physicalScaleChanged:false,units:{amplitude:'metres',wavelength:'authored mapping units'},assumptions:['Author-supplied PBR/surface/detail/procedural/image source; no preset pigment, amplitude or wavelength transformation.','Delivery derivations report only proven constant folding and supported channel partitioning; appearance and sampled retention require observation.']}:finishRecipeSemantics(source.recipe,source.params,{recipeVersion:selectedVersion})}:{reason:source.reason}),source:copy(source),sourceHash:hashContent(source),specHash:hashContent(spec),spec,specSource:original,options,plan};if(normalSplit)compiled.semantics.normalSplit=copy(normalSplit);return compiled;
}
function bindings(owner){
 const out=[];if(owner.material!==undefined)out.push({key:'material',value:owner.material,set:value=>{owner.material=value;}});
 for(const [i,value]of(owner.materialSlots||[]).entries())if(value)out.push({key:'slot:'+i,value,set:next=>{owner.materialSlots[i]=next;}});
 for(const feature of [...(owner.recipe?.params?.features||[]),...(owner.features||[])])if(feature.type==='material'&&feature.material!==undefined)out.push({key:'feature:'+feature.id,value:feature.material,set:next=>{feature.material=next;}});
 return out;
}
const intentMeta=row=>({version:1,role:row.role,kind:row.kind,materialId:row.materialId,sourceHash:row.sourceHash,specHash:row.specHash,source:copy(row.source)});
export function prepareMaterialIntents(doc,{ids}={}){
 if(!record(doc)||!Array.isArray(doc.objects))fail('doc','expected scene document');
 if(ids!==undefined&&(!Array.isArray(ids)||ids.length>256||ids.some(id=>typeof id!=='string'||!id)||new Set(ids).size!==ids.length))fail('ids','expected up to 256 distinct exact object IDs');
 const candidate=copy(doc),nodes=new Map(),all=[];const walk=items=>{for(const owner of items){if(!record(owner)||typeof owner.id!=='string'||!owner.id)fail('objects.id','expected exact object ID');if(nodes.has(owner.id))fail('objects.id','duplicate object ID '+owner.id);nodes.set(owner.id,owner);if(owner.parts)walk(owner.parts);else all.push(owner);}};walk(candidate.objects);
 if(ids)for(const id of ids)if(!nodes.has(id)||nodes.get(id).parts)fail('ids','expected existing leaf '+id);
 const selected=ids?new Set(ids):new Set(all.map(o=>o.id)),library=copy(materialLibrary(candidate)),table=candidate.meta?.materialRoles;
 if(table!==undefined){keys(table,['version','roles'],'meta.materialRoles');if(table.version!==1||!record(table.roles))fail('meta.materialRoles','expected version 1 role table');}
 const prior=new Map(Object.entries(table?.roles||{})),rows=new Map(),raw=new Map(),uses=[];
 if(prior.size>256)fail('meta.materialRoles','at most 256 roles');
 for(const [role,entry]of prior){
  materialRole(role);if(!record(entry)||entry.id!==role||!entry.source||entry.source.role!==role)fail('meta.materialRoles.'+role,'role identity mismatch');
  const row=compileMaterialIntent(entry.source,{recipeVersion:entry.recipeVersion}),saved=library.materials[entry.materialId];
  if(saved&&saved.hash===hashContent(saved.spec)&&saved.hash!==entry.specHash)continue;
  if(entry.sourceHash!==row.sourceHash||entry.specHash!==row.specHash||!saved||!Number.isSafeInteger(saved.revision)||saved.revision<1||hashContent(saved.spec)!==entry.specHash||saved.hash!==entry.specHash||entry.spec&&hashContent(entry.spec)!==entry.specHash)fail('meta.materialRoles.'+role,'registered compiled source/library identity differs; explicitly repair the role','material_role_conflict');
  if(entry.kind!==row.kind||row.kind==='process'&&entry.recipeVersion!==row.recipeVersion)fail('meta.materialRoles.'+role,'registered recipe version differs','material_role_conflict');
  rows.set(role,{...copy(entry),...row,materialId:entry.materialId,ids:[]});
 }
 for(const owner of all)for(const binding of bindings(owner)){
  const value=normalizeMaterialIntent(binding.value);
  if(value?.finish){const row=compileMaterialIntent(value),seen=raw.get(row.role);if(seen&&seen.sourceHash!==row.sourceHash)fail('finish.role','conflicting declarations for role '+row.role,'material_role_conflict');raw.set(row.role,row);uses.push({owner,binding,role:row.role,authored:true});}
  else if(value?.materialRef)uses.push({owner,binding,material:value});
 }
 for(const [role,row]of raw){const old=rows.get(role),materialId=old?.materialId??'finish_'+hashContent({role}).slice(0,32),saved=library.materials[materialId];
  if(saved&&!old)fail('materialLibrary.'+materialId,'unregistered library entry collision','material_role_conflict');
  rows.set(role,{...row,materialId,ids:[]});
 }
 if(rows.size>256)fail('meta.materialRoles','at most 256 roles');
 const byMaterial=new Map();for(const row of rows.values()){if(byMaterial.has(row.materialId))fail('meta.materialRoles','multiple roles alias the same materialId','material_role_conflict');byMaterial.set(row.materialId,row);}
 for(const use of uses)if(!use.authored){const row=byMaterial.get(use.material.materialRef);if(!row)continue;const previous=prior.get(row.role);const actual=resolveMaterialSpec(candidate,use.material),expected=previous?.specHash??row.specHash;if(hashContent(actual)!==expected){if(use.binding.key==='material')delete use.owner.meta?.materialIntent;else if(use.owner.meta?.materialIntents)delete use.owner.meta.materialIntents[use.binding.key];continue;}const declared=use.binding.key==='material'?use.owner.meta?.materialIntent:use.owner.meta?.materialIntents?.[use.binding.key];if(declared&&(declared.version!==1||declared.role!==row.role||declared.kind!==(previous?.kind??row.kind)||declared.materialId!==row.materialId||declared.specHash!==expected||declared.sourceHash!==(previous?.sourceHash??row.sourceHash)||!record(declared.source)||hashContent(declared.source)!==(previous?.sourceHash??row.sourceHash)))fail('meta.materialIntent','owner intent differs from registered role: '+use.owner.id,'material_role_conflict');use.role=row.role;}
 const changed=new Set();for(const [role,row]of rows){const saved=library.materials[row.materialId];if(!saved||saved.hash!==row.specHash){library.materials[row.materialId]={revision:(saved?.revision||0)+1,hash:row.specHash,spec:copy(row.spec)};changed.add(role);}if(prior.get(role)?.sourceHash!==row.sourceHash)changed.add(role);}
 for(const use of uses){if(!use.role)continue;const row=rows.get(use.role);use.binding.set({materialRef:row.materialId});row.ids.push(use.owner.id);use.owner.meta={...use.owner.meta};if(use.binding.key==='material'){use.owner.meta.materialIntent=intentMeta(row);use.owner.meta.nativeInheritMaterial=!!(!use.authored&&use.owner.meta.nativeInheritMaterial&&use.owner.meta.materialInheritance?.target);}else{use.owner.meta.materialIntents={...(use.owner.meta.materialIntents||{}),[use.binding.key]:intentMeta(row)};}}
 const compiled=[...rows.values()].map(row=>({...row,ids:[...new Set(row.ids)]})),pending=[...new Set(compiled.filter(row=>row.kind==='process').flatMap(row=>row.ids.filter(id=>selected.has(id)||changed.has(row.role))))];
 if(rows.size||table){candidate.meta={...candidate.meta,materialLibrary:library,materialRoles:{version:1,roles:Object.fromEntries(compiled.map(row=>{const {ids,...entry}=row;return [row.role,entry];}))}};materialLibrary(candidate);doc.meta=candidate.meta;doc.objects=candidate.objects;}
 return {ids:pending,roles:copy(candidate.meta?.materialRoles?.roles||{}),compiled,changedRoles:[...changed]};
}
