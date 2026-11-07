import {materialLibrary,materialId,validateMaterialSpec,resolveMaterialSpec} from './material-source.js';
import {createRecipeMaterial} from './material-intent.js';
import {materialSurfaceSummary,materialSurfaceRequiredChannels} from './material-surface.js';
import {hashContent} from './storage.js';
const clone=x=>JSON.parse(JSON.stringify(x)),fail=(message,field='material')=>{throw Object.assign(Error(message),{code:'invalid_material_author',detail:{field}});};
export function authorTargets(doc,args){
 const list=args.ids??(args.id?[args.id]:[]);if(!Array.isArray(list)||!list.length||list.length>32)fail('author requires 1..32 explicit leaf IDs','ids');
 if(list.some(id=>typeof id!=='string'||!id)||new Set(list).size!==list.length)fail('ids must be distinct exact object IDs','ids');const nodes=new Map();const walk=xs=>{for(const o of xs){nodes.set(o.id,o);if(o.parts)walk(o.parts);}};walk(doc.objects);
 return list.map(id=>{const owner=nodes.get(id);if(!owner||owner.parts||owner.recipe?.type!=='nativeMesh')fail('author requires an existing native leaf: '+id,'ids');return owner;});
}
export function prepareMaterialAuthor(doc,args){
 const id=materialId(args.materialId),library=clone(materialLibrary(doc)),prior=library.materials[id];
 if(args.recipe!==undefined&&args.spec!==undefined)fail('choose recipe or spec, not both','recipe');
 const recipe=args.recipe!==undefined?createRecipeMaterial(args.recipe,args.params||{},Object.fromEntries(['recipeVersion','delivery','detailSize','detailProjection','resolution','detailResolution','fidelity'].filter(k=>args[k]!==undefined).map(k=>[k,args[k]]))):null,original=recipe?.spec||(args.spec!==undefined?validateMaterialSpec(args.spec):prior?clone(prior.spec):fail('provide a recipe, spec, or an existing materialId','spec'));
 const spec=original,plan=recipe?.plan||{delivery:'auto',scope:'Shared preparation resolves display data for every binding.'};
  validateMaterialSpec(spec);if(args.materialRevision!==undefined&&args.materialRevision!==(prior?.revision||0))throw Object.assign(Error('material revision conflict'),{code:'conflict'});
 const owners=authorTargets(doc,args),uv=args.uv??'smart';if(!['smart','cube','preserve'].includes(uv))fail('uv must be smart, cube or preserve','uv');
 if(args.selectionId!==undefined&&owners.length!==1)fail('a named face region requires exactly one object','selectionId');
 const specHash=hashContent(spec);library.materials[id]=prior?.hash===specHash?prior:{revision:(prior?.revision||0)+1,hash:specHash,spec};doc.meta={...doc.meta,materialLibrary:library};
 for(const owner of owners){
   delete owner.materialSlots;
  const p=owner.recipe.params;if(args.selectionId){const selection=owner.meta?.nativeSelections?.[args.selectionId];if(!selection)fail('named face region not found on '+owner.id,'selectionId');const featureId=args.featureId||'finish-'+id,features=p.features||[];const f={id:featureId,type:'material',selection:{name:args.selectionId},material:{materialRef:id}};const at=features.findIndex(x=>x.id===featureId);if(at<0)features.push(f);else if(features[at].type!=='material')fail('material feature ID conflicts with another edit','featureId');else features[at]=f;p.features=features;}
  else {owner.material={materialRef:id};owner.meta={...owner.meta,nativeInheritMaterial:false};}
  if(uv!=='preserve'){const featureId='finish-uv-'+id,features=p.features||[],at=features.findIndex(f=>f.id===featureId),f={id:featureId,type:'uv',method:uv};if(at<0)features.push(f);else if(features[at].type!=='uv')fail('UV feature identity conflict','uv');else features[at]=f;p.features=features;}
  if(p.features.length>64)fail('material/UV edit exceeds the existing 64-feature limit','features');
 }
 const channels=args.channels||[...new Set(['baseColor','roughness','metalness','normal',...materialSurfaceRequiredChannels(spec)])];
 return {ids:owners.map(o=>o.id),materialId:id,spec,plan,channels,uv,summary:materialSurfaceSummary(spec),materialRevision:library.materials[id].revision,recipe:args.recipe||null};
}
export function prepareMaterialAssignments(doc,args){
 const owners=authorTargets(doc,args),id=materialId(args.materialId);resolveMaterialSpec(doc,{materialRef:id});if(args.selectionId)fail('batch assign face regions uses author with one selected object','selectionId');for(const owner of owners){owner.material={materialRef:id};owner.meta={...owner.meta,nativeInheritMaterial:false};}return owners.map(o=>o.id);
}
