import {evaluateDoc} from './kernel.js';
import {diagnoseDoc} from './diagnostics.js';
const box=o=>{const p=o.geometryData.positions,min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<p.length;i++){const k=i%3;min[k]=Math.min(min[k],p[i]);max[k]=Math.max(max[k],p[i]);}return {min,max};};
const own=(o,id)=>o.editableId===id||o.id===id||o.parentIds?.includes(id);
const pairKey=(a,b)=>[a,b].sort().join('\0');
export function assemblyFeedback(doc,{before=null,id=null,maxCandidates=24,maxPairs=3,maxComparisons=10000,maxTriangles=12000}={}){
 for(const [name,v,max]of [['maxCandidates',maxCandidates,100],['maxPairs',maxPairs,20],['maxComparisons',maxComparisons,100000],['maxTriangles',maxTriangles,200000]])if(!Number.isInteger(v)||v<1||v>max)throw new Error(name+' exceeds assembly feedback budget');
 const draw=evaluateDoc(doc),leaves=draw.objects.filter(o=>o.visible!==false),old=before?new Map(evaluateDoc(before).objects.map(o=>[o.editableId,o])):null;
 const changed=new Set();for(const o of leaves){const p=old?.get(o.editableId),a=o.geometryData.positions,b=p?.geometryData.positions;if(!old||!p||a.length!==b.length||a.some((v,i)=>v!==b[i]))changed.add(o.editableId);}
 if(before&&JSON.stringify(before.meta?.contactIntents||[])!==JSON.stringify(doc.meta?.contactIntents||[]))for(const intent of doc.meta?.contactIntents||[])for(const o of leaves)if(own(o,intent.a)||own(o,intent.b))changed.add(o.editableId);
 if(!changed.size)return {status:'unchanged',changedLeaves:0,changedLeafIds:[],candidatePairs:0,comparisons:0,complete:true,checks:[],next:[],coverage:'No changed visible geometry or contact declaration; old contacts were not rechecked.'};
 const entries=leaves.map(o=>({o,b:box(o)})).sort((a,b)=>a.b.min[0]-b.b.min[0]),candidates=[];let comparisons=0,truncated=false;
 outer:for(let i=0;i<entries.length;i++)for(let j=i+1;j<entries.length&&entries[j].b.min[0]<=entries[i].b.max[0]+1e-7;j++){
  if(++comparisons>maxComparisons){truncated=true;break outer;}const A=entries[i],B=entries[j];if(id&&!own(A.o,id)&&!own(B.o,id))continue;if(!changed.has(A.o.editableId)&&!changed.has(B.o.editableId))continue;
  if([1,2].some(k=>A.b.min[k]>B.b.max[k]+1e-7||B.b.min[k]>A.b.max[k]+1e-7))continue;
  if(candidates.length>=maxCandidates){truncated=true;break outer;}candidates.push([A.o,B.o]);
 }
 const intents=Array.isArray(doc.meta?.contactIntents)?doc.meta.contactIntents:[],checks=[];
 for(let i=0;i<candidates.length;i++){
  const [a,b]=candidates[i],decl=intents.find(x=>own(a,x.a)&&own(b,x.b)||own(a,x.b)&&own(b,x.a)),base={a:a.editableId,b:b.editableId,owners:[a.parentIds?.at(-1)||a.editableId,b.parentIds?.at(-1)||b.editableId],intent:decl||null,query:{action:'diagnose',args:{query:'pair',id:a.editableId,other:b.editableId}}};
  if(i>=maxPairs||a.geometryData.positions.length/9+b.geometryData.positions.length/9>maxTriangles){checks.push({...base,classification:'aabb_candidate',solidOverlap:'unknown',complete:false,reason:'feedback budget; use the explicit pair query'});continue;}
  const diagnosis=diagnoseDoc(doc,{query:'pair',id:a.editableId,other:b.editableId,maxOutputChars:6000,maxPairTests:6000,maxContainmentTests:12000,maxSamples:4,maxEvidence:1},{evaluatedDoc:draw}),r=diagnosis.result;
  const conflict=r.classification==='boundary_crossing'||r.solidOverlap===true,gap=r.minimumGap?.value,violates=decl?.type==='separate'&&(conflict||typeof gap==='number'&&gap<(decl.minGap||0))||decl?.type==='touch'&&(conflict||typeof gap==='number'&&gap>1e-6)||decl?.type==='solidCombine'&&conflict;
  checks.push({...base,classification:r.classification,solidOverlap:r.solidOverlap,complete:diagnosis.coverage.complete&&(!decl||['separate','touch'].includes(decl.type)),intentViolation:!!violates,attention:!!violates||conflict&&!decl,witness:r.surfaceEvidence?.[0]||r.closest||r.containment?.aInB?.witnesses?.inside||r.containment?.bInA?.witnesses?.inside||null,unknownReasons:diagnosis.unknownReasons,minimumGap:r.minimumGap,meaning:decl?'Declared intent retained; inspect its limits before accepting.':'Unclassified contact: choose separation, touch, allowed embed, relief or solid combination; geometry alone does not decide.'});
 }
 const complete=!truncated&&checks.every(c=>c.complete);return {status:checks.some(c=>c.attention)?'attention':complete?'clear':'partial',changedLeafIds:[...changed].slice(0,32),changedLeaves:changed.size,candidatePairs:candidates.length,comparisons,complete,coverage:'changed evaluated leaves, including same-module and transparent objects; hidden objects excluded',checks,next:checks.filter(c=>c.attention||!c.complete).slice(0,3).map(c=>c.query),note:'AABB candidates are not penetration. Open shells and incomplete work retain unknown; no automatic merge or movement.'};
}
export function setContactIntentOperation(doc,{a,b,type,minGap=0,note=''}={}){
 const ids=new Set();const walk=xs=>{for(const o of xs){ids.add(o.id);if(o.parts)walk(o.parts);}};walk(doc.objects);if(!ids.has(a)||!ids.has(b)||a===b)throw new Error('contact intent needs two distinct exact IDs');if(!['separate','touch','intentionalEmbed','surfaceRelief','solidCombine'].includes(type)||!Number.isFinite(minGap)||minGap<0)throw new Error('invalid contact intent or gap');const list=(doc.meta?.contactIntents||[]).filter(x=>pairKey(x.a,x.b)!==pairKey(a,b));list.push({a,b,type,minGap,note:String(note).slice(0,500)});return {...doc,meta:{...doc.meta,contactIntents:list}};
}
