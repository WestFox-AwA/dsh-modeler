import {evaluateDoc} from './kernel.js';
import {objectMatrix,multiplyMatrix,identityMatrix,inverseMatrix,transformPoint} from './relations.js';
import {trianglesFromPositions,nearestSurface,raycastTriangles} from './spatial-query.js';
export function plasticEditOperations(doc,args){
 let found=null,matrix=null,ancestorModifiers=false;const walk=(items,parent=identityMatrix(),modified=false)=>{for(const o of items){const frame=multiplyMatrix(parent,objectMatrix(o));if(o.id===args.id){found=o;matrix=frame;ancestorModifiers=modified;}if(o.parts)walk(o.parts,frame,modified||(o.modifiers||[]).some(m=>m.enabled!==false));}};walk(doc.objects);if(!found||found.parts)throw Error('sculpt needs an exact leaf ID');
 if(args.kind==='bevel'){
  if(typeof args.radius!=='number'||!Number.isFinite(args.radius)||args.radius<0)throw Error('bevel radius must be a nonnegative finite number');
  if(!['box','rbox','clayBox','bevelBox'].includes(found.recipe?.type))throw Error('segment bevel currently supports box-like source recipes; arbitrary edge bevel is not implemented');
  const p=found.recipe.params||{},recipe={type:found.recipe.type==='clayBox'?'clayBox':'bevelBox',params:{w:p.w??p.width??1,h:p.h??p.height??1,d:p.d??p.depth??1,radius:args.radius,bevelSegments:args.segments??4,resolution:p.resolution??(found.recipe.type==='clayBox'?20:1)}};
  return {operations:[{op:'update',id:found.id,recipe}],resolved:{kind:'all-box-edges',radius:args.radius,segments:args.segments??4,note:'All box edges/corners; existing stroke modifiers are reapplied to the new source.'}};
 }
 if(ancestorModifiers)throw Error('surface anchoring with ancestor modifiers is unsupported; sculpt the unmodified local module or provide a direct source-local m.sculpt stroke');
 if(!['local','world',undefined].includes(args.space))throw Error('brush space must be local or world');
 const before=evaluateDoc(doc).objects.find(o=>o.editableId===found.id);if(!before)throw Error('sculpt target has no evaluated surface');const inverse=inverseMatrix(matrix),local=[];for(let i=0;i<before.geometryData.positions.length;i+=3)local.push(...transformPoint(before.geometryData.positions.slice(i,i+3),inverse));
 const determinant=matrix[0]*(matrix[5]*matrix[10]-matrix[6]*matrix[9])-matrix[4]*(matrix[1]*matrix[10]-matrix[2]*matrix[9])+matrix[8]*(matrix[1]*matrix[6]-matrix[2]*matrix[5]);if(determinant<0)for(let i=0;i<local.length;i+=9)for(let k=0;k<3;k++)[local[i+3+k],local[i+6+k]]=[local[i+6+k],local[i+3+k]];
 const triangles=trianglesFromPositions(local),convert=p=>args.space==='world'?transformPoint(p,inverse):p;let hit;
 if(args.origin&&args.direction){const origin=convert(args.origin),worldEnd=args.origin.map((v,k)=>v+args.direction[k]),end=convert(worldEnd),direction=end.map((v,k)=>v-origin[k]);const result=raycastTriangles(triangles,origin,direction,{maxTests:1000000,maxHits:1});if(!result.complete)throw Error('surface ray budget exceeded');hit=result.hits[0];}
 else{const point=args.center??args.point;if(!Array.isArray(point)||point.length!==3||!point.every(Number.isFinite))throw Error('sculpt needs local/world center or origin+direction');const result=nearestSurface(triangles,convert(point),{maxTests:1000000});if(!result.complete)throw Error('nearest surface budget exceeded');hit=result.hit;}
 if(!hit)throw Error('brush anchor missed the target surface');let normal=args.normal;
 if(normal&&args.space==='world')normal=[0,1,2].map(k=>matrix[k*4]*args.normal[0]+matrix[k*4+1]*args.normal[1]+matrix[k*4+2]*args.normal[2]);
 const stroke={type:'brush',center:hit.point,normal:normal||hit.normal,radius:args.radius??.3,amount:args.amount??.1,shape:args.shape??'ellipse',steepness:args.steepness??1,hardness:args.hardness??0,mode:args.mode??'push',...(args.depth!==undefined?{depth:args.depth}:{}),...(args.rotation!==undefined?{rotation:args.rotation}:{})};
 return {operations:[{op:'modifiers',id:found.id,modifiers:[...(found.modifiers||[]),stroke]}],resolved:{anchor:hit.point,normal:stroke.normal,space:'source-local after prior modifiers; before object/ancestor TRS',strokeIndex:found.modifiers?.length||0,stroke,radiusUnits:'source-local metres',warning:found.recipe?.type==='clayBox'?null:'Sparse source vertices limit brush detail; use clayBox or subdivide before brush.'}};
}
