// Project only the three model-facing result contracts. UI and explicit snapshots stay full.
export const RECEIPT_LIMITS=Object.freeze({targetChars:12000,hardCapChars:32000,defaultPage:12});
const copy=x=>JSON.parse(JSON.stringify(x)),size=x=>JSON.stringify(x).length;
const array=x=>Array.isArray(x),object=x=>x!==null&&typeof x==='object'&&!array(x);
const pick=(x,keys)=>Object.fromEntries(keys.filter(k=>x?.[k]!==undefined).map(k=>[k,x[k]]));
const identity=['ok','id','op','assetId','resourceId','revision','contentHash','status','phase','error','code','detail','fieldErrors','current','changedCurrentAsset'];
function call(tool,args){return{tool,args};}
function owner(args,result){const id=args.id||result.id;return typeof id==='string'&&!id.startsWith('native_job_')?id:null;}
function originalSelector(args){const selector=args.selection||null;return selector&&size(selector)<=2000?copy(selector):null;}
function selectNext(args,result,{retry=false,offset}={}){
 const id=owner(args,result);if(!id)return null;const next={op:'select',id,geometry:true,expectedHash:result.contentHash};
 if(args.selectionId)next.selectionId=args.selectionId;else if(args.selection){const selection=originalSelector(args);if(!selection)return call('modeler_geometry',{op:'inspect',id,expectedHash:result.contentHash});next.selection=selection;}
 const from=result.offset??args.offset??args.selection?.offset??0,limit=args.count??args.selection?.limit??12;
 next.offset=offset??from;next.count=Math.max(1,Math.min(12,retry?Math.floor(limit/2)||1:limit));return call('modeler_geometry',next);
}
function detailNext(args,result){
 if(result.id?.startsWith('native_job_'))return call('modeler_geometry',{op:'job',jobId:result.id,detail:'full'});
 const id=owner(args,result);if(!id)return null;if(size(args)>2500)return call('modeler_geometry',{op:'inspect',id,expectedHash:result.contentHash});return call('modeler_geometry',{...args,id,detail:'full'});
}
function node(o,parentId=null){const p=o.recipe?.params;return{id:o.id,...(parentId?{parentId}:{}),name:o.name,sourceType:p?.source?.type||o.recipe?.type||o.kind,position:o.position,rotation:o.rotation,scale:o.scale,visible:o.visible!==false,...(o.material?{material:pick(o.material,['color','metalness','roughness','opacity'])}:{}),featureCount:p?.features?.length||0,childCount:o.parts?.length||0};}
function scene(result,args){
 if(!result.doc)return{...result};const out={...result},doc=result.doc,objects=[];function walk(xs,parentId=null){for(const o of xs){objects.push({o,parentId});if(o.parts)walk(o.parts,o.id);}}walk(doc.objects||[]);
 const offset=Math.max(0,Math.floor(args.offset||0)),count=Math.max(1,Math.min(16,Math.floor(args.count||12))),rows=objects.slice(offset,offset+count);delete out.doc;delete out.store;
 out.docOmitted=true;out.title=doc.meta?.title||result.title;out.objects=rows.map(({o,parentId})=>node(o,parentId));out.totalParts=objects.length;out.offset=offset;out.returned=rows.length;out.complete=offset+rows.length>=objects.length;
 if(result.object)out.object=node(result.object);
 out.next=call('modeler_scene',{op:'read',path:'object',offset:out.complete?0:offset+rows.length,count,expectedHash:result.contentHash});if(rows.length)out.detailNext=call('modeler_scene',{op:'read',id:rows[0].o.id,path:'source',offset:0,count:24,expectedHash:result.contentHash});
 return out;
}
function selection(result,args){
 if(!result||!object(result))return result;const out={...result};
 if(array(out.items)&&out.items.length>12){out.itemsTotal=result.total??out.items.length;out.itemsOmitted=out.items.length-12;out.items=out.items.slice(0,12);out.itemNext=selectNext(args,result,{offset:(result.offset||0)+12});}
 if(args.geometry!==true){delete out.selectionGeometry;delete out.geometry;delete out.overlay;out.geometryOmitted=!!(result.selectionGeometry||result.geometry||result.overlay);}
 else{
  // Local geometry is authoritative for editing. Avoid duplicating it as a world overlay in the prompt.
  if(out.selectionGeometry&&out.overlay){delete out.overlay;out.worldOverlayOmitted=true;}
  const geometry=out.selectionGeometry||out.geometry||out.overlay;
  if(geometry&&size(geometry)>18000){delete out.selectionGeometry;delete out.geometry;delete out.overlay;out.geometryOmitted=true;out.geometryReason='Whole coverage exceeds receipt budget; no coordinate prefix returned.';
   if(args.op!=='frame')out.next=selectNext(args,result,{retry:true});
   const id=owner(args,result),selector=originalSelector(args);if(id&&(selector||args.selectionId))out.captureNext=call('modeler_capture',{isolate:id,...(args.selectionId?{selectionId:args.selectionId}:{selection:selector}),expectedHash:result.contentHash,focusSelection:true});
  }
 }
 if(args.geometry!==true&&args.op!=='frame'&&!out.next)out.next=selectNext(args,result);return out;
}
function taskSummary(task){if(!object(task))return task;return {...pick(task,['version','assetId','contentHash','enabled','state','ready','counts','total','offset','nextOffset','note']),roles:(task.roles||[]).slice(0,4).map(r=>({...pick(r,['role','kind','state','requiredChannels']),targetCount:r.targetCount??r.ids?.length??0,targets:(r.targets||r.ids||[]).slice(0,3),issueCount:r.issueCount??r.issues?.length??0,fidelityIssueCount:r.fidelityIssueCount??r.fidelityIssues?.length??0,issues:(r.issues||[]).slice(0,2),fidelityIssues:(r.fidelityIssues||[]).slice(0,2),observations:Object.fromEntries(Object.entries(r.observations||{}).map(([k,v])=>[k,pick(v,['status','evidenceId'])]))})),unclassifiedGroups:task.unclassifiedGroups??task.unclassified?.length??0,unclassified:(task.unclassified||[]).slice(0,3).map(g=>({kind:g.kind,targetCount:g.targetCount??g.ids?.length??0,targets:(g.targets||g.ids||[]).slice(0,3)})),issues:(task.issues||[]).slice(0,3),next:call('modeler_material',{op:'task',limit:8,expectedHash:task.contentHash}),scope:'Bounded current task summary; exact role coverage and observations remain available through task.'};}
function native(result,args){
 const out={...result};if(result.materialTask)out.materialTask=taskSummary(result.materialTask);if(result.detailTiles)out.detailTiles=result.detailTiles.map(d=>({...pick(d,['detailKey','reused','resolution']),fidelity:d.fidelity?{status:d.fidelity.status,complete:d.fidelity.complete,channels:(d.fidelity.channels||[]).map(c=>pick(c,['channel','status','std','neutralNormalFraction'])),warnings:(d.fidelity.warnings||[]).slice(0,3)}:null}));if(args.op==='job'&&object(result.result))out.result=fitNative(native(result.result,{...args,op:result.op||result.result.op||'result'}),args,10000);if(result.feedback){out.feedback={...result.feedback};if(result.feedback.selection){const raw={...result.feedback.selection,assetId:result.assetId,revision:result.revision,contentHash:result.contentHash},next=raw.next,scopeArgs={...args,op:'select',id:next?.id||args.id,selection:next?.selection||args.observe?.selection,geometry:args.geometry===true};out.feedback.selection=selection(raw,scopeArgs);if(next&&!out.feedback.selection.next)out.feedback.selection.next={...next};}}
 if(['select','frame','feedback'].includes(args.op))return selection(out,args);
 if(array(out.nodes))out.nodes=out.nodes.map(n=>({...n,features:array(n.features)?n.features.slice(0,8):n.features,...(array(n.features)&&n.features.length>8?{featuresOmitted:n.features.length-8}:{})}));return out;
}
function probe(result,args){
 const out={...result};if(!result.pages)return out;out.pages={...result.pages};const limit=Math.max(1,Math.min(12,args.limit||12)),offset=args.offset||0;let more=false;for(const[key,page]of Object.entries(result.pages)){if(!array(result[key]))continue;out[key]=result[key].slice(0,limit);out.pages[key]={...page,returned:out[key].length,complete:offset+out[key].length>=page.total};more||=!out.pages[key].complete;}out.complete=!more;if(more)out.next=call('modeler_probe',{...args,offset:offset+limit,limit});else delete out.next;return out;
}
function boundedDetail(value,depth=0,budget={left:10000}){
 if(budget.left<=0)return{omitted:true};if(typeof value==='string'){const n=Math.min(1024,budget.left);budget.left-=Math.min(n,value.length);return value.length>n?value.slice(0,n)+' [omitted]':value;}if(value===null||typeof value!=='object'){budget.left-=16;return value;}
 if(depth>5)return{omitted:true};if(array(value)){const items=[];for(const item of value.slice(0,16)){if(budget.left<=0)break;items.push(boundedDetail(item,depth+1,budget));}return items.length===value.length?items:{items,total:value.length,omitted:value.length-items.length};}
 const keys=Object.keys(value),priority=['field','path','nodeId','objectId','code','error','message','expectedTopologyStamp','suppliedTopologyStamp','id'],order=[...priority.filter(k=>keys.includes(k)),...keys.filter(k=>!priority.includes(k))],out={};let used=0;for(const k of order.slice(0,32)){if(budget.left<=0)break;budget.left-=k.length;out[k]=boundedDetail(value[k],depth+1,budget);used++;}if(keys.length>used)out.omittedKeys=keys.length-used;return out;
}
function scenePageFit(out,args,target){
 while(array(out.objects)&&out.objects.length>1&&size(out)>target)out.objects.pop();if(array(out.objects)){out.returned=out.objects.length;out.complete=(out.offset||0)+out.returned>=(out.totalParts||0);if(!out.complete)out.next=call('modeler_scene',{op:'read',path:'object',offset:(out.offset||0)+out.returned,count:Math.max(1,out.returned),expectedHash:out.contentHash});else delete out.next;}
 return out;
}
function fitNative(out,args,target){
 if(size(out)<=target)return out;
 if(out.feedback){out.feedback={...out.feedback};if(array(out.feedback.changed))out.feedback.changed=out.feedback.changed.map(n=>({...n,...(array(n.features)&&n.features.length>8?{features:n.features.slice(0,8),featuresTotal:n.features.length}: {})}));if(array(out.feedback.reused)){out.feedback.reusedCount=out.feedback.reused.length;delete out.feedback.reused;}if(out.feedback.selection){out.feedback.selection={...out.feedback.selection};for(const k of ['selectionGeometry','geometry','overlay'])if(out.feedback.selection[k]){delete out.feedback.selection[k];out.feedback.selection.geometryOmitted=true;}}}
 if(size(out)>target&&array(out.nodes)&&out.nodes.length>4){out.nodesTotal=out.nodes.length;out.nodes=out.nodes.slice(0,4);out.nodesOmitted=out.nodesTotal-out.nodes.length;}
 if(size(out)>target)for(const k of ['sourceIds','changedIds','unchangedIds','sourceTransforms'])if(array(out[k])&&out[k].length>16){out[k+'Total']=out[k].length;out[k+'Omitted']=out[k].length-16;out[k]=out[k].slice(0,16);}
 if(size(out)>target&&out.feedback?.selection?.items?.length>4){out.feedback.selection.itemsOmitted=out.feedback.selection.items.length-4;out.feedback.selection.items=out.feedback.selection.items.slice(0,4);}
 return out;
}
export function modelReceipt(name,args={},result,context={}){
 if(!object(result))return result;
 if(name==='modeler_workbench'&&args.action==='snapshot'||args.includeDoc===true||args.detail==='full'||args.op==='read')return result;
 const target=Math.min(12000,context.targetChars||12000),cap=Math.min(32000,context.hardCapChars||32000);let out;
 if(name==='modeler_scene')out=scenePageFit(scene(result,args),args,target);
 else if(name==='modeler_geometry')out=fitNative(native(result,args),args,target);
 else if(name==='modeler_probe')out=probe(result,args);else return result;
 const omitted=[];if(name==='modeler_scene'&&result.doc)omitted.push('doc');if(out.geometryOmitted)omitted.push('selectionGeometry');if(out.worldOverlayOmitted)omitted.push('overlay');if(out.feedback?.selection?.geometryOmitted)omitted.push('feedback.selection.geometry');for(const k of ['sourceIds','changedIds','unchangedIds','sourceTransforms','nodes'])if(out[k+'Omitted'])omitted.push(k);
 if(size(out)>cap){
  if(name==='modeler_geometry'){for(const k of ['selectionGeometry','geometry','overlay'])if(out[k]){delete out[k];omitted.push(k);}if(['select','feedback'].includes(args.op))out.next=selectNext(args,result,{retry:true});out=fitNative(out,args,Math.max(2000,target/2));}
  if(name==='modeler_scene')out=scenePageFit(out,args,Math.max(2000,target/2));
  if(size(out)>cap){const compact={...(object(out.result)?pick(out.result,['assetId','revision','contentHash','changedCurrentAsset']):{}),...pick(out,[...identity,'objectCount','totalParts','summary','counts','total','domain','topologyStamp','bounds']),...((out.materialTask||out.result?.materialTask)?{materialTask:taskSummary(out.materialTask||out.result.materialTask)}:{})};for(const k of ['detail','fieldErrors','error'])if(compact[k]!==undefined)compact[k]=boundedDetail(compact[k]);if(array(out.objects))compact.objects=out.objects.slice(0,1);if(array(out.nodes))compact.nodes=out.nodes.slice(0,1);compact.detailNext=detailNext(args,result);compact.dataOmitted=true;omitted.push('optional result payload');out=compact;}
 }
 out.truncationMetadata={version:1,representation:'summary',omitted:omitted.length>0||out.dataOmitted===true,omittedFields:omitted,hardCapChars:cap};
 if(name==='modeler_geometry'&&size(result)>size(out)&&!out.detailNext)out.detailNext=detailNext(args,result);
 // A single huge error message cannot break the default presentation budget.
 if(size(out)>cap&&typeof out.error==='string'){out.error=out.error.slice(0,1600)+' [omitted]';out.truncationMetadata.omitted=true;}
 return out;
}
