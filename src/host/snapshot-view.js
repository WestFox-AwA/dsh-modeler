// Evaluation transport view: omit only data which the shared evaluator ignores.
// The authoritative document and its contentHash are not rewritten by observation.
export function evaluationSnapshot(snapshot){
 const visit=object=>{
  const out={...object};if(object.parts)out.parts=object.parts.map(visit);
  if(object.recipe||object.topology)delete out.geometryData;
  if(object.recipe?.type==='nativeMesh'){const p=object.recipe.params;out.recipe={...object.recipe,params:{...p,source:{type:p.source.type},features:(p.features||[]).map(f=>({id:f.id,type:f.type,...(f.type==='material'?{material:f.material}:{})}))}};}
  return out;
 };
 return {...snapshot,doc:{...snapshot.doc,objects:snapshot.doc.objects.map(visit)},transport:{kind:'evaluation-view',authoritativeHash:snapshot.contentHash,omitted:'Redundant legacy geometry cache and native construction-only parameters; exact evaluated mesh remains.'}};
}
