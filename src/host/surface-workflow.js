import {normaliseForm,formEvaluator,formSummary} from './form-body.js';
import {normaliseSurface,normaliseSurfaceFeature,surfaceEvaluator,surfaceControlSummary} from './control-surface.js';
import {recipeDependencies} from './relations.js';
const clone=v=>JSON.parse(JSON.stringify(v));
const find=(items,id)=>{for(const o of items||[]){if(o.id===id)return o;const found=find(o.parts,id);if(found)return found;}return null;};
const walk=(items,out=[])=>{for(const o of items||[]){out.push(o);if(o.parts)walk(o.parts,out);}return out;};
const fail=(s,code='surface_edit_invalid')=>Object.assign(Error(s),{code});
export function compileSurfaceIntent(args={}){
 const text=String(args.intent||'').normalize('NFKC').toLowerCase();let kind=args.kind||null,sign=1;
 if(!kind){if(/收窄|变窄|narrow|taper/.test(text))kind='narrow';else if(/加宽|拓宽|widen/.test(text))kind='narrow';else if(/脊|ridge|spine/.test(text))kind='ridge';else if(/鼓|隆起|凹|压低|抬高|bulge|dome|dent|raise|lower/.test(text))kind='bulge';else if(/侧弯|偏移|bend|shift/.test(text))kind='bend';}
 if(!kind)throw fail('未明确形面动作。可用“抬高脊线”“鼓起中部”“收窄中段，保持两端”，并给amount(米)或factor；也可直接指定kind。','needs_surface_intent');
 if(/压低|降低|下凹|凹陷|lower|dent/.test(text))sign=-1;
 const matched=text.match(/(-?\d+(?:\.\d+)?)\s*(mm|cm|m|毫米|厘米|米)(?![a-z])/),units={mm:.001,cm:.01,m:1,'毫米':.001,'厘米':.01,'米':1};let amount=args.amount??(matched?Number(matched[1])*units[matched[2]]:undefined),factor=args.factor;
 if(kind==='narrow'&&factor===undefined){const percentage=text.match(/(\d+(?:\.\d+)?)\s*%/);if(percentage)factor=1+(/加宽|拓宽|widen/.test(text)?1:-1)*Number(percentage[1])/100;}
 if(kind==='narrow'&&factor===undefined)throw fail('收窄/加宽需factor比例，如0.85表示该段缩至85%；不猜修改强度。','needs_surface_parameters');
 if(kind!=='narrow'&&amount===undefined)throw fail('抬高/鼓起/侧弯需amount局部米数，或在意图中写明确的m/cm/mm数值。','needs_surface_parameters');
 if(typeof amount==='number'&&sign<0)amount=-Math.abs(amount);
 const all=['u0','u1','v0','v1'];let fixed=args.fixedEdges??(args.keepBoundary===false?[]:kind==='narrow'?['v0','v1']:all);
 if(/保持两端|固定两端|keep ends/.test(text)&&args.fixedEdges===undefined)fixed=['v0','v1'];if(/保持边界|固定边界|keep boundary/.test(text)&&args.fixedEdges===undefined)fixed=all;
 if(kind==='narrow'&&fixed.includes('u0')&&fixed.includes('u1'))throw fail('外轮廓宽度不能同时改变又完全固定左右边界；收窄请固定两端v0/v1，或改内部鼓度。','conflicting_surface_constraints');
 const at=args.at??(/前端|front/.test(text)?[.5,.85]:/后端|rear/.test(text)?[.5,.15]:[.5,.5]);
 return normaliseSurfaceFeature({kind,amount:amount??0,factor:factor??1,at,radius:args.radius??(kind==='ridge'?[.3,.75]:kind==='narrow'?[1,.6]:[.48,.48]),fixedEdges:fixed,keepTangents:args.keepTangents??kind!=='narrow'});
}
function changeOperations(doc,args){
 const object=find(doc.objects,args.id);if(!object||object.parts||!['controlSurface','formBody'].includes(object.recipe?.type))throw fail('选择精确的controlSurface/formBody源ID；对分区请修改其引用的主形。');
 if((object.modifiers||[]).some(m=>m.enabled!==false))throw fail('该主表面已有网格modifier；先选择未烘焙主表面，用其features控制，避免锚点/边界失配。');
 if(object.recipe.type==='formBody'){
  const f=compileSurfaceIntent({...args,keepBoundary:args.keepBoundary??false,fixedEdges:args.fixedEdges??['v0','v1'],keepTangents:false}),p=normaliseForm(object.recipe.params),feature={kind:f.kind,at:f.at[1],radius:f.radius[1],amount:f.amount,factor:f.factor,keepEnds:true},next={...p,features:[...p.features,feature]},before=formEvaluator(p),after=formEvaluator(next),z0=p.sections[0].z,z1=p.sections.at(-1).z;
  return {operations:[{op:'parameters',id:object.id,params:{features:next.features}}],control:{target:object.id,representation:'formBody',compiled:feature,featureIndex:p.features.length,keptBoundaries:['end sections'],endChanges:[z0,z1].map(z=>({z,before:before.section(z),after:after.section(z)})),following:walk(doc.objects).filter(o=>o.recipe&&recipeDependencies(o.recipe).includes(object.id)).map(o=>({id:o.id,relation:o.recipe.type})),scope:'Complete section envelope; each side and bottom follows the same stations. Surface cuts stay in source-local units. No arbitrary global self-intersection certification.'}};
 }
 const p=normaliseSurface(object.recipe.params),feature=compileSurfaceIntent(args),next={...p,features:[...p.features,feature]};const before=surfaceEvaluator(p),after=surfaceEvaluator(next),boundary=[];
 for(let i=0;i<=16;i++)for(const uv of [[0,i/16],[1,i/16],[i/16,0],[i/16,1]])boundary.push(Math.hypot(...before.point(...uv).map((x,k)=>x-after.point(...uv)[k])));
 const nodes=walk(doc.objects),dependents=nodes.filter(o=>o.recipe&&recipeDependencies(o.recipe).includes(object.id)).map(o=>({id:o.id,relation:o.recipe.type}));
 return {operations:[{op:'parameters',id:object.id,params:{features:next.features}}],control:{target:object.id,compiled:feature,featureIndex:p.features.length,maxSampledBoundaryMovement:Math.max(...boundary),units:'source-local metres; UV radii0..1',following:dependents,keptBoundaries:feature.fixedEdges,keptTangents:feature.keepTangents,scope:'One source control net; dependent regions and UV details re-evaluate. Sampled checks do not certify global self-intersections.'}};
}
export function createSurfaceWorkflow({service,trials,guard,receipt,identity}={}){
 const readSnapshot=args=>args.trialId?trials.snapshot(args.trialId):service.snapshot();
 async function stageOrCommit(args,operations,details,defaults={}){const base=service.snapshot();guard(args,true);if(args.preview===false){const s=await service.apply({operations,expectedHash:base.contentHash,expectedRevision:base.revision,label:args.label||'Surface edit'});return {...receipt(s,{before:base.doc}),surface:details};}const observe=args.observe===false?undefined:args.observe??defaults.observe??{view:'iso',mode:'clay',width:800,height:600};return {...await trials.stage({assetId:base.assetId,expectedRevision:base.revision,expectedHash:base.contentHash,operations,observe,...(args.diagnostics?{diagnostics:args.diagnostics}:{})}),surface:details};}
 async function dispatch(args={}){
  const op=args.op||'inspect';
  if(op==='inspect'){guard(args);const snapshot=readSnapshot(args),object=find(snapshot.doc.objects,args.id);if(!object?.recipe)throw fail('没有此表面ID');const target=['controlSurface','formBody'].includes(object.recipe.type)?object:find(snapshot.doc.objects,object.recipe.params?.target);if(!['controlSurface','formBody'].includes(target?.recipe?.type))throw fail('所选对象不是主表面或其分区/锚点');return {ok:true,...identity(snapshot),trialId:args.trialId||null,id:object.id,masterId:target.id,definition:(target.recipe.type==='formBody'?formSummary:surfaceControlSummary)(target.recipe.params),following:walk(snapshot.doc.objects).filter(o=>o.recipe&&recipeDependencies(o.recipe).includes(target.id)).map(o=>({id:o.id,type:o.recipe.type,params:o.recipe.params})),changedCurrentAsset:false};}
  if(op==='shape'){const base=service.snapshot(),prepared=changeOperations(base.doc,args);return stageOrCommit(args,prepared.operations,prepared.control);}
  if(op==='compare'){
   guard(args,true);if(!Array.isArray(args.choices)||args.choices.length<2||args.choices.length>4)throw fail('compare需要2..4个choices；每项是同一主表面的意图与控制量');const snapshots=service.snapshot(),staged=[];
   for(const choice of args.choices){const input={...args,...choice,id:args.id},prepared=changeOperations(snapshots.doc,input),result=await trials.stage({assetId:snapshots.assetId,expectedHash:snapshots.contentHash,operations:prepared.operations});staged.push({id:result.id,label:choice.label||choice.intent||choice.kind,control:prepared.control,candidateHash:result.candidateHash});}
   const comparison=await trials.compare({ids:staged.map(c=>c.id),observe:args.observe||{view:'iso',mode:'clay',width:800,height:600}});return {ok:true,...identity(snapshots),candidates:staged,comparison,changedCurrentAsset:false,next:{action:'accept_trial',args:{id:'$chosen.id',assetId:snapshots.assetId,expectedHash:snapshots.contentHash,reason:'$observedImprovement'}}};
  }
  if(op==='profile'){
   guard(args,true);const base=service.snapshot(),object=find(base.doc.objects,args.id);if(object?.recipe?.type!=='formBody')throw fail('profile需要formBody完整包络源');if(!args.sections&&!args.cuts)throw fail('profile需要sections或cuts明确更新');const p=normaliseForm({...object.recipe.params,...(args.sections?{sections:args.sections}:{}),...(args.cuts?{cuts:args.cuts}:{})});return stageOrCommit(args,[{op:'parameters',id:args.id,params:p}],{target:args.id,definition:formSummary(p),scope:'One source profile; cuts and following detail remain linked.'});
  }
  if(op==='study'){
   guard(args,true);if(!Array.isArray(args.choices)||args.choices.length<2||args.choices.length>3)throw fail('study需要2..3个完整主形候选');const base=service.snapshot(),staged=[];
   for(const choice of args.choices){if(!Array.isArray(choice.changes)||!choice.changes.length||choice.changes.length>8)throw fail('each choice needs1..8 principal changes');const operations=[],working=clone(base.doc);for(const change of choice.changes){const object=find(working.objects,change.id);if(!['controlSurface','formBody'].includes(object?.recipe?.type))throw fail('study只改明确可编辑主形源');const edits=change.params?[{op:'parameters',id:change.id,params:clone(change.params)}]:changeOperations(working,change).operations;for(const edit of edits){operations.push(edit);Object.assign(find(working.objects,edit.id).recipe.params,clone(edit.params));}}const result=await trials.stage({assetId:base.assetId,expectedHash:base.contentHash,operations});staged.push({id:result.id,label:String(choice.label||'form alternative'),candidateHash:result.candidateHash});}
   const comparison=await trials.compare({ids:staged.map(c=>c.id),observe:args.observe||{view:'iso',mode:'clay',width:1000,height:750}});return {ok:true,...identity(base),candidates:staged,comparison,changedCurrentAsset:false,selection:['Compare complete silhouette and primary masses before small fittings','Inspect whether selected changes improved the named design problem','Accept one exact observed candidate; discard or revise alternatives']};
  }
  if(op==='create'){
   guard(args,true);const base=service.snapshot();if(typeof args.id!=='string'||!args.id||find(base.doc.objects,args.id))throw fail('create需要一个未占用的明确id；已有表面用shape');
   const form=args.sections!==undefined||args.params?.sections!==undefined,raw=args.params??{width:args.width,length:args.length,crown:args.crown,thickness:args.thickness,grid:args.grid,resolution:args.resolution,...(args.sections?{sections:args.sections,cuts:args.cuts,rounding:args.rounding}:{})};const p=form?normaliseForm(raw):normaliseSurface(raw);
   const object={id:args.id,semanticId:args.id,name:args.name||'Editable surface',kind:'custom',recipe:{type:form?'formBody':'controlSurface',params:p},material:args.material??{color:'#517d98',metalness:.18,roughness:.36},...(args.position?{position:args.position}:{}),...(args.rotation?{rotation:args.rotation}:{})};
   return stageOrCommit({...args,preview:args.preview??false},[{op:'add',object,...(args.parentId?{parentId:args.parentId}:{})}],{id:args.id,definition:(form?formSummary:surfaceControlSummary)(p),nextIntent:'抬高脊线 / 鼓起中部 / 收窄中段，保持两端'});
  }
  if(op==='attach'||op==='region'){
   guard(args,true);const base=service.snapshot(),master=find(base.doc.objects,args.target||args.id);if(!['controlSurface','formBody'].includes(master?.recipe?.type))throw fail('target需controlSurface主表面');if(typeof args.newId!=='string'||!args.newId||find(base.doc.objects,args.newId))throw fail('需要未占用newId');let recipe;
   if(op==='region'&&(!Array.isArray(args.uvBounds)||args.uvBounds.length!==4))throw fail('region需要uvBounds:[u0,v0,u1,v1]');
   if(op==='region')recipe={type:'surfaceRegion',params:{target:master.id,uvBounds:args.uvBounds,...(args.closeCuts===true?{closeCuts:true}:{}),...(args.thickness!==undefined?{thickness:args.thickness}:{}),...(args.resolution?{resolution:args.resolution}:{})}};
   else{const source=args.source??(args.size?{type:'box',params:{w:args.size[0],h:args.size[1],d:args.size[2]}}:null);if(!source)throw fail('附件需source recipe或size:[w,h,d]；尺寸不猜测');recipe={type:'surfacePin',params:{target:master.id,source,uv:args.uv,offset:args.offset??0,rotation:args.angle??0}};}
   const object={id:args.newId,semanticId:args.newId,name:args.name||args.newId,kind:'custom',recipe,material:args.material??master.material},operations=[{op:'add',object,...(args.parentId?{parentId:args.parentId}:{})}];if(args.hideMaster===true)operations.push({op:'visibility',id:master.id,visible:false});return stageOrCommit(args,operations,{masterId:master.id,id:args.newId,relation:recipe,sourcePreserved:true});
  }
  if(op==='remove_feature'){
   guard(args,true);const base=service.snapshot(),o=find(base.doc.objects,args.id);if(!['controlSurface','formBody'].includes(o?.recipe?.type))throw fail('需要主表面');const features=(o.recipe.type==='formBody'?normaliseForm:normaliseSurface)(o.recipe.params).features,index=args.index??features.length-1;if(!Number.isInteger(index)||index<0||index>=features.length)throw fail('没有此特征序号');return stageOrCommit(args,[{op:'parameters',id:o.id,params:{features:features.filter((_,i)=>i!==index)}}],{removedFeature:index});
  }
  throw fail('surface op需create/inspect/profile/shape/study/compare/attach/region/remove_feature');
 }
 return {dispatch};
}
