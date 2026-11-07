import {readScenePage} from './scene-read.js';
import {editingHelpTopic,editingProgramHelp} from './editing-help.js';
import {getModelerHelp,navigateCapabilities} from './discovery.js';
import {getActionHelp,hasActionHelp} from './action-help.js';
import {guideEnvelope,guideReference} from './guide-access.js';
import {authoringAdvice} from './capability-guidance.js';
import {attachDesignPlan} from './design-plan.js';
import {assemblyFeedback} from './assembly-feedback.js';
import {resolveCaptureSelection,observationForEdit} from './observation-purpose.js';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {runModelerScript} from './script.js';
import {evaluateDoc, evaluateObject, KERNEL_VERSION} from './kernel.js';
import { summariseArgs, summariseResult } from './probe-log.js';
import {analyzeDoc, diffDocs} from './analyze.js';
import {geometryVerdict} from './verdict.js';
import {rasterDoc, formatTextPreview} from './raster.js';
import {compareToReference} from './reference.js';
import {createWorkflowOperations} from './workflow-operations.js';
import {toolValue} from './tool-value.js';
import {moduleControlOperations} from './module-controls.js';
import {OBSERVATION_MODES,DISPLAY_MODES} from './observation-stage.js';

const clone=v=>JSON.parse(JSON.stringify(v));
export function walkParts(doc) {
  const list=[];const visit=(items,parents=[])=>{for(const p of items||[]){list.push({part:p,parents});if(p.parts)visit(p.parts,parents.concat(p.id));}};
  visit(doc.objects);return list;
}
const commands={
 begin:'读取当前绑定、版本守卫和最小起步；未绑定时只给new/open/fork，不自动建资源',
 help:'默认/start打开主指南；topic/函数名query查精确合同，无需读源码',
 guide:'按id读取主指南或局部指南（main/resources/explore/construct/assembly/edit/materials/delivery/legacy）；纯文档，不建资源',
 source:'按offset/limit读取当前生成源码或sourceId',
 save_source:'保存并检查源码，返回sourceId；不改变模型',
 patch_source:'对保存源码做唯一匹配补丁并检查；失败不改变模型',
 validate:'只求值检查code/sourceId，不提交',
 diagnose:'局部部件、两件关系、表面投射、剖面与依赖查询',
 trial:'试验operations/code/sourceId；可同相机截图比较和局部diagnostics，不提交',
 accept_trial:'接受明确的trial候选；基线变化拒绝',
 discard_trial:'丢弃未接受候选，不修改资产',
 status:'只读会话绑定、身份、版本与内容hash；未绑定时bound:false且不自动建资源',
 delivery:'只读：按assetId/expectedHash把当前确切版本打成schemaVersion+digest交付包，返回内部票据path/bytes/摘要；供消费者校验导入，不写资产',
 new:'为当前会话新建独立资源；可给title，不覆盖其他资源',
 fork:'将指定assetId复制成独立资源并在当前会话打开',
 tree:'读取模块树的直接子项、角色、局部框架和依赖，不加载几何列表',
 module_source:'读取所选模块局部生成器，不返回整个资产源码',
 save_module_source:'保存并在完整资产上下文校验模块程序；用trial→accept_trial替换子树',
 check_roles:'验证显式路径/外绕/朝外或左右对应规则，给出责任节点和反例',
 inspect:'语义部件、生成参数、求值统计、规格与几何发现；args.id 可局部展开',
 projects:'检索资源库；query按标题/ID搜索，offset/limit分页，近期优先',
 open:'只在当前会话切换到args.project资源ID；内容与其他会话绑定不变',
 script:'生成/重跑代码 args.code；rebase:true 保留可重放的局部覆写，冲突时不提交',
 set_control:'按模块声明的控件名原子修改子件参数；只允许当前子树内目标',
 edit:'原子局部修改 args.operations；每次修改携带 expectedRevision 或 expectedHash',
 history:'查看版本与改动理由；不写新版本',
 checkpoint:'命名当前恢复点 args.label',
 restore:'恢复 args.id 指定版本，创建新版本；需并发版本',
 preview:'同一求值结果的字符观察；可 isolate:id、views、channel，不作材质验收',
 variants:'局部参数试验 args.id/parameter/values；可 ref/view 比较轮廓。只生成候选不改变当前资产',
 apply_variant:'提交候选 args.id；基线变更后拒绝过期候选',
 capture:'独立Three真实渲染截图；view/views或camera设机位，displayMode选normal/surface_wireframe/outline，lighting为瞬态观察灯光/阴影/镜面地板；无需打开面板；返回PNG路径与版本/显示/观察回执',
 evidence:'查看当前资产的采集证据及是否属于当前版本',
 trace:'只读：按序号读取最近的观测事件（复盘用，不改变资产）',
 review:'只读：汇总本轮建模的调用、失败、规格与盲改比例（复盘用）',
};
export function createModelerOperations(service,{projectDir,evidence,clientState={},buildInfo=null,probe=null,resourceContext=null,sourceDirectory=null,renderSnapshot=null,evidenceDirectory=null,renderControl=null,nativeControl=null,guide=null}) {
 const variants=new Map();
 // Identity/guards/probe bookkeeping must not clone the current geometry. The
 // fallback keeps independently constructed services and tests compatible.
 const metadata=()=>{if(service.metadata)return service.metadata();const s=service.snapshot();return {assetId:s.assetId,revision:s.revision,contentHash:s.contentHash,initialized:s.initialized,updatedAt:s.updatedAt,title:s.doc?.meta?.title,project:s.doc?.meta?.project||null};};
 const identity=s=>({assetId:s.assetId,revision:s.revision,contentHash:s.contentHash,kernelVersion:KERNEL_VERSION,...(resourceContext?{sessionId:resourceContext.sessionId,resourceId:s.assetId}:{}),...(buildInfo?{clientBuildId:buildInfo.clientBuildId,kernelBuildId:buildInfo.kernelBuildId}:{})});
 const guards=a=>({expectedRevision:a.expectedRevision,expectedHash:a.expectedHash});
 const requireGuard=a=>{if(a.expectedRevision===undefined&&!a.expectedHash)throw Object.assign(new Error('写入需要 expectedRevision 或 expectedHash；先 status 取得当前版本'),{code:'missing_base'});const s=metadata();if(a.assetId!==undefined&&a.assetId!==s.assetId)throw Object.assign(new Error('当前会话已切换资源，拒绝将旧资源编辑应用到新目标'),{code:'binding_conflict',current:s});if((a.expectedRevision!==undefined&&a.expectedRevision!==s.revision)||(a.expectedHash!==undefined&&a.expectedHash!==s.contentHash))throw Object.assign(new Error('调用者提供的版本守卫不匹配'),{code:'conflict',current:{assetId:s.assetId,revision:s.revision,contentHash:s.contentHash}});};
 // Guide routing is resolved from ids and arguments only. It must never load,
 // create or snapshot an asset just to answer a docs request.
 const guideRef=id=>guideReference(guide,id);
 const guideDoc=id=>guideEnvelope(guide,id);
 const hasGuide=!!(guide&&typeof guide.get==='function');
 const geometrySubject=a=>{const topic=String(a.topic||'').toLowerCase(),q=String(a.query||'').toLowerCase();if(topic==='materials'||['mat','paint','metal','finish','uniform','rubber','glass'].includes(q)||q.startsWith('m.finish')||q.startsWith('m.paint')||q.startsWith('m.metal')||q.startsWith('m.glass')||q.startsWith('m.rubber')||q.startsWith('m.uniform'))return 'materials';if(topic==='relations'||q.startsWith('m.attach')||q.startsWith('m.region')||q.startsWith('part.attach'))return 'assembly';if(topic==='edit'||topic==='select'||['feature','update','select','remove_feature'].includes(q))return 'edit';return 'construct';};
 const subjectWithExact=(id,exact)=>{const full=guideDoc(id);if(!full||full.ok===false)return exact?{...exact,...(full&&full.ok===false?{guide:full}:{})}:full;return exact?{...exact,guide:full,exact}:full;};
 const withGuideRef=(id,value)=>hasGuide?{...value,guide:guideRef(id)}:value;
 const unboundNext=()=>[{action:'new',args:{title:'New model'}},{action:'projects',args:{query:'',limit:20}},{action:'open',args:{project:'$assetId'}},{action:'fork',args:{assetId:'$assetId'}}];
 const unboundIdentity=()=>({ok:true,bound:false,assetId:null,revision:null,contentHash:null,kernelVersion:KERNEL_VERSION,...(resourceContext?{sessionId:resourceContext.sessionId,resourceId:null}:{}),...(buildInfo?{clientBuildId:buildInfo.clientBuildId,kernelBuildId:buildInfo.kernelBuildId}:{})});
 const nativeGuideHelp=a=>{try{const requested=editingHelpTopic(a)||a.topic||'start';return editingProgramHelp(requested,{apiVersion:a.apiVersion??3});}catch(error){return {ok:false,code:error.code||'unknown_editing_help',error:error.message,next:{op:'help',topic:'start'}};}};
 function helpFor(a={}){
  const query=typeof a.query==='string'?a.query.trim():'';
  const declared=typeof a.topic==='string'?a.topic.trim():undefined;
  const topic=declared?declared.toLowerCase():undefined;
  const mainGuide=()=>{const full=guideDoc('main');if(!full)return navigateCapabilities({node:'root',query:a.query,limit:a.limit??4});return full.next?full:{...full,next:guideRef('resources')};};
  const materialGuide=()=>{const full=guideDoc('materials');return full?{...full,next:{tool:'modeler_material',args:{op:'help'}}}:{ok:false,code:'guide_unavailable',error:'guide system unavailable'};};
  if(!a||typeof a!=='object'||Array.isArray(a)||a.topic!==undefined&&typeof a.topic!=='string'||a.query!==undefined&&typeof a.query!=='string')return getModelerHelp(a);
  if(a.node!==undefined||topic==='tree')return withGuideRef('main',navigateCapabilities({node:a.node||'root',query:a.query,limit:a.limit??4}));
  if(topic==='actions'||topic==='trial'||(topic===undefined&&hasActionHelp(query)))return withGuideRef('main',getActionHelp({query:query||(topic==='trial'?'trial':'')}));
  if(topic==='legacy_api')return withGuideRef('legacy',getModelerHelp({...a,topic:'api'}));
  if(!query&&(topic===undefined||topic==='start'||topic==='main'||topic==='guide'||topic==='help'||topic==='workbench'))return mainGuide();
  if(topic==='geometry'||topic==='native'||topic==='program'||topic==='editing')return subjectWithExact(geometrySubject(a),nativeGuideHelp({...a,topic:'start'}));
  if(topic==='edit'&&!query)return guideDoc('edit');
  if(topic==='material'||topic==='materials'||topic==='surface'||topic==='appearance')return materialGuide();
  if(topic==='delivery')return guideDoc('delivery');
  if(topic==='resources'||topic==='explore'||topic==='construct'||topic==='assembly'||topic==='legacy')return guideDoc(topic);
  if(topic==='api')return withGuideRef('legacy',getModelerHelp({...a,topic:'api'}));
  if(query&&topic===undefined){const editing=editingHelpTopic({topic,query});if(editing)return withGuideRef(geometrySubject(a),nativeGuideHelp({...a,query:editing}));const exact=getModelerHelp({topic:'api',query});if(exact.detail==='entry')return withGuideRef('legacy',exact);return withGuideRef('main',navigateCapabilities({node:'root',query,limit:a.limit??4}));}
  if(topic){const result=getModelerHelp({...a,topic});if(result.ok&&result.topic==='observe')result.items.push({id:'observe.trial',kind:'workflow',summary:'trial内置比较的字段是observe；camera/尺寸/模式放在其中。',example:getActionHelp({query:'trial'}).items[0].example,detail:{action:'help',args:{topic:'actions',query:'trial'}}});return withGuideRef({modeling:'construct',edit:'edit',observe:'explore',relations:'assembly',source:'legacy'}[topic]||'main',result);}
  return mainGuide();
 }
 function beginFor(s){
  const guard={assetId:s.assetId,expectedRevision:s.revision,expectedHash:s.contentHash};
  return {ok:true,...identity(s),bound:true,title:s.title,existingResourcePreserved:true,guard,
   next:{action:'guide',args:{id:'resources'}},
   calls:[{action:'status'},{action:'new',args:{expectedBindingAssetId:s.assetId,title:'New model'}},{action:'open',args:{project:'$assetId',expectedBindingAssetId:s.assetId}},{action:'fork',args:{assetId:s.assetId,title:'Fork'}}],
   ...(hasGuide?{guide:guideRef('resources')}:{})};
 }
 function receipt(s,{before,findings=false}={}) {
   const analysis=analyzeDoc(s.doc);let assembly;
   if(before){try{assembly=assemblyFeedback(s.doc,{before,maxCandidates:12,maxPairs:2,maxTriangles:5000});}catch(e){assembly={status:'unknown',complete:false,reason:e.message};}}
   const nodes=walkParts(s.doc),organization={classDefinitions:s.doc.meta?.classDefinitions?.length||0,modules:nodes.filter(n=>n.part.parts).length,flatRootLeaves:s.doc.objects.filter(o=>!o.parts).length};
   if(organization.flatRootLeaves>24&&organization.modules===0)organization.suggestion={reason:'Parts remain flat; define responsibility classes or group existing systems before local refinement',next:{action:'help',args:{topic:'actions',query:'design'}}};
   return {ok:true,...identity(s),summary:analysis.summary,organization,authoring:authoringAdvice(s.doc),...(assembly?{assembly}:{}),verdict:geometryVerdict(s.doc,{findings,clientAgeMs:clientState.lastSeen?Date.now()-clientState.lastSeen:null}),
     ...(before?{delta:diffDocs(before,s.doc)}:{}),evidence:(evidence?.list()||[]).slice(0,2).map(e=>({id:e.id,path:e.path,mode:e.mode,contentHash:e.contentHash,current:e.current,captured:e.captured,reviewed:e.reviewed}))};
 }
 function projects() {
   const saved=service.projects?service.projects():[];
   const disk=fs.existsSync(projectDir)?fs.readdirSync(projectDir).filter(f=>f.endsWith('.js')).map(file=>{
     const code=fs.readFileSync(path.join(projectDir,file),'utf8');const title=code.match(/m\.scene\(\s*['"]([^'"]{1,100})/);
     const head=saved.find(s=>s.key===file);
     return {file,key:file,name:file.slice(0,-3),title:head?.title||title?.[1]||file,saved:!!head,...(head?{assetId:head.assetId,contentHash:head.contentHash}: {})};
   }):[];
   for(const s of saved){const key=s.key||s.assetId;if(!disk.some(p=>p.key===key))disk.push({...s,key,file:key,name:s.title,saved:true});}
   return disk.sort((a,b)=>a.title.localeCompare(b.title));
 }
 const workflow=createWorkflowOperations({service,projectDir,resourceContext,sourceDirectory,renderSnapshot,evidenceDirectory,buildInfo,identity,receipt});
 async function dispatch(action, args = {}) {
  const a=args||{};
   const captureSelection=action==='capture'?resolveCaptureSelection(a,{requireSelection:true}):null;
   // Pure docs and identity routes answer before any lazy service, snapshot,
   // metadata or backend resolution. They must not create a first-use resource.
   if(action==='guide'){const requestedGuideId=typeof a.id==='string'&&a.id.trim()?a.id.trim().slice(0,80):'main';return guideDoc(requestedGuideId)||{ok:false,code:'guide_unavailable',error:'guide system unavailable',requestedId:requestedGuideId,next:{action:'help',args:{}}};}
   if(action==='help')return helpFor(a);
   if(action==='status'){
     if(resourceContext){const s=resourceContext.resources.metadataForSession(resourceContext.sessionId);if(!s)return {...unboundIdentity(),title:null,project:null,clientOnline:!!clientState.lastSeen&&Date.now()-clientState.lastSeen<4000,clientCurrent:buildInfo?clientState.clientBuildId===buildInfo.clientBuildId:null,reportedClientBuild:clientState.clientBuildId||null,next:unboundNext(),...(hasGuide?{guide:guideRef('resources')}:{})};return {ok:true,...identity(s),bound:true,title:s.title,project:s.project||null,clientOnline:!!clientState.lastSeen&&Date.now()-clientState.lastSeen<4000,clientCurrent:buildInfo?clientState.clientBuildId===buildInfo.clientBuildId:null,reportedClientBuild:clientState.clientBuildId||null};}
     const s=metadata();return {ok:true,...identity(s),bound:true,title:s.title,project:s.project||null,clientOnline:!!clientState.lastSeen&&Date.now()-clientState.lastSeen<4000,clientCurrent:buildInfo?clientState.clientBuildId===buildInfo.clientBuildId:null,reportedClientBuild:clientState.clientBuildId||null};
   }
   if(action==='begin'){
     if(resourceContext){const s=resourceContext.resources.metadataForSession(resourceContext.sessionId);if(!s)return {...unboundIdentity(),title:null,project:null,existingResourcePreserved:false,guard:null,next:{action:'guide',args:{id:'resources'}},calls:[{action:'status'},{action:'new',args:{title:'New model'}},{action:'projects',args:{query:'',limit:20}},{action:'open',args:{project:'$assetId'}},{action:'fork',args:{assetId:'$assetId'}}],...(hasGuide?{guide:guideRef('resources')}:{})};return beginFor(s);}
     return beginFor(metadata());
   }
   if(action==='inspect'&&resourceContext&&!resourceContext.resources.metadataForSession(resourceContext.sessionId))return {ok:false,code:'unbound_resource',error:'当前会话尚未绑定资源；先 new、open 或 fork 建立明确目标',next:unboundNext(),bound:false,assetId:null,revision:null,contentHash:null};
   if(action==='read')return readScenePage(service.snapshot(),a);
   if(action==='geometry'&&a.op==='help'){const exact=nativeGuideHelp(a),subject=geometrySubject(a),isDefault=!a.query&&(a.topic===undefined||a.topic==='start');return isDefault?subjectWithExact(subject,exact):{...exact,...(hasGuide?{guide:guideRef(subject)}:{})};}
   if(action==='geometry'){if(!nativeControl)throw Error('native geometry backend unavailable');const result=await nativeControl.execute(service,{...a,...(a.observe?.capture?{wait:true}:{})});if(result.ok&&result.changedCurrentAsset&&a.observe?.capture){const selected=result.feedback?.selection?.overlay,observe=observationForEdit(a,a.observe);delete observe.capture;delete observe.selection;try{const image=await evidence.capture({...observe,expectedHash:result.contentHash,isolate:observe.isolate||a.id||result.sourceIds?.[0],...(selected?{overlay:selected,focusSelection:true}:{})});result.feedback={...(result.feedback||{}),capture:image};}catch(error){result.feedback={...(result.feedback||{}),capture:{ok:false,error:error.message,code:error.code||null}};}}return result;}
   if(action==='edit'&&nativeControl){const walk=xs=>xs.some(o=>o.recipe?.type==='nativeMesh'||o.parts&&walk(o.parts));if(walk(service.snapshot().doc.objects))return nativeControl.execute(service,{...a,op:'edit',wait:true});}
  if(action==='renderer'){if(!renderControl)throw Error('render state unavailable');if(a.op==='recover')return {ok:true,...await renderControl.recover()};return {ok:true,...renderControl.state()};}
   const extended=await workflow.dispatch(action,a);if(extended!==null)return extended;
  if(action==='catalog')return {ok:true,start:{action:'help',args:{}},api:{action:'help',args:{node:'root'}},version:3,kernelVersion:KERNEL_VERSION,guide:{action:'guide',args:{id:'main'}},guidePath:path.resolve(projectDir,'..','docs','AGENT-GUIDE.md'),commands,
   editing:{operations:['parameters','transform','material','modifiers','visibility','mesh_move','mesh_extrude','add','remove','duplicate','group','ungroup','reparent','pivot','module','replace_module'],
    example:{action:'edit',args:{expectedRevision:7,operations:[{op:'parameters',id:'body.shell',params:{sections:[{z:-2,w:1.8,h:.4,y:.2},{z:2,w:.6,h:.2,y:.1}]}}]}},
    notes:['参数是 recipe.params，不是源码文本替换','mesh_move 的 vertices 是基网格共享顶点索引；参数件转网格需 bake:true','组合件保留 parts/材质与身份；不以删件降对象数']},
   materialSupport:{rendered:['color','metalness','roughness','opacity','emissive','emissiveIntensity','clearcoat','doubleSided'],note:'其他材质字段可随源资产保存，不表示完整Shader/贴图支持'},
   observation:{modes:[...OBSERVATION_MODES],displayModes:[...DISPLAY_MODES],views:['front','side','top','iso','back','left','bottom'],camera:{eye:[4,2,5],target:[0,1,0],up:[0,1,0],projection:'perspective',fov:42},orbit:{azimuth:45,elevation:25,distance:6},orthographic:{projection:'orthographic',span:3},cellAspect:'字宽/行高；默认0.5，可校正实际字体行距',lighting:{background:'color',exposure:'0..100',environment:{intensity:'absolute override 0..10'},hemisphere:{sky:'color',ground:'color',intensity:'0..1000'},key:'{color,intensity,position,shadows}',fill:'同上',rim:'同上',shadows:{enabled:'boolean',mapSize:'256/512/1024/2048/4096',bias:'-0.01..0.01',normalBias:'0..1'},floor:{enabled:'boolean',mirror:'boolean',tint:'color',shadow:'boolean',size:'正数或[width,depth]',position:'[x,y,z]',roughness:'0..1',metalness:'0..1'}},capture:'modeler_capture/本命令capture返回真实Three PNG，不用重写渲染器；displayMode=normal且mode=material为标准外观（无资产地板时默认镜面地板）；surface_wireframe/outline为白色黏土诊断；观察配置按工作室默认→资产renderStage→显式lighting合并，诊断只强制无地板/纯背景并保留有效灯光/阴影/曝光；mode=normal仍为法线诊断；captured不等于reviewed'},
   examples:{sectionLoft:"const p=m.sectionLoft([{z:-1,w:1.8,h:.5,y:.1},{z:1,w:.6,h:.2,y:.1}],{profile:[[-1,0],[-1,.55],[-.5,1],[.5,1],[1,.55],[1,0]],steps:6}).key('body.shell');return m.scene('Prototype',[p]);"}};
  if(resourceContext&&['projects','new','open','fork'].includes(action)){
    const {resources,sessionId}=resourceContext;
    const current=resources.binding(sessionId);
    if(action==='projects'){const r=resources.list({query:a.query||'',offset:a.offset??0,limit:a.limit??50});return {ok:true,sessionId,current,projects:r.items.map(p=>({...p,key:p.assetId,file:p.assetId,saved:true})),total:r.total,nextOffset:r.nextOffset};}
    if(a.expectedBindingAssetId!==undefined&&a.expectedBindingAssetId!==current)throw Object.assign(new Error('会话绑定已变化，请刷新后切换资源'),{code:'binding_conflict'});
    let s;
    if(action==='new')s=resources.create(sessionId,{title:a.title});
    if(action==='fork')s=resources.fork(sessionId,a.assetId||current,{title:a.title});
    if(action==='open'){
      const target=String(a.project||a.assetId||'');
      if(target.endsWith('.js')&&target===path.basename(target)&&fs.existsSync(path.join(projectDir,target))){const doc=runModelerScript(fs.readFileSync(path.join(projectDir,target),'utf8'));s=resources.create(sessionId,{title:doc.meta?.title,doc});}
      else s=resources.open(sessionId,target,{expectedBindingAssetId:current});
    }
    return {ok:true,...identity(s),current:s.assetId,title:s.doc?.meta?.title,summary:analyzeDoc(s.doc).summary,resourceCreated:action==='new'||action==='fork'};
  }
  if(action==='snapshot'){const s=service.snapshot();return {ok:true,...s,...identity(s)};}
  if(action==='projects')return {ok:true,projects:projects(),current:service.snapshot().doc.meta?.project||null};
  if(action==='open'){
    requireGuard(a);const key=String(a.project||a.file||'');
    if(!a.reload && service.projects?.().some(s=>s.key===key||s.assetId===key))return {...receipt(await service.openProject(key,guards(a))),doc:service.snapshot().doc};
    if(!key||key!==path.basename(key)||!key.endsWith('.js'))throw new Error('项目必须是模型库中的脚本名');
    const code=fs.readFileSync(path.join(projectDir,key),'utf8');const doc=runModelerScript(code);doc.meta.project=key;
    const s=await service.replace(doc,{...guards(a),discardOverrides:true,label:'打开 '+key});return {...receipt(s),doc:s.doc,script:code};
  }
  if(action==='script'){
    requireGuard(a);
    const before=service.snapshot().doc;const t=performance.now();const doc=workflow.applyPlan(runModelerScript(String(workflow.sourceCode(a)||''),{params:a.params??before.meta?.generatorParams??{}}),a,before);if(a.project)doc.meta.project=String(a.project);
    const buildMs=performance.now()-t;
    const plan=workflow.sourcePlan(a,before);if(plan){const candidate=service.candidateReplace(doc,{...guards(a),rebase:a.rebase===true,discardOverrides:a.discardOverrides===true});attachDesignPlan(candidate.doc,plan);}
     const s=await service.replace(doc,{...guards(a),rebase:a.rebase===true,discardOverrides:a.discardOverrides===true,label:a.label||'运行生成程序'});
    workflow.didCommitPlan(a,s);
     return {...receipt(s,{before}),buildMs:+buildMs.toFixed(2)};
  }
  if(action==='set_control'){requireGuard(a);const s=service.snapshot(),operations=moduleControlOperations(s.doc,a.id,a.values);return receipt(await service.apply({...guards(a),operations,label:a.label||'module controls'}),{before:s.doc});}
  if(action==='edit') {requireGuard(a);const before=service.snapshot().doc;return receipt(await service.apply({...a,label:a.label||'局部编辑'}),{before});}
  if(action==='history')return {ok:true,...identity(metadata()),history:service.history({includeDoc:false})};
  if(action==='checkpoint'){requireGuard(a);return {ok:true,checkpoint:await service.checkpoint({...guards(a),label:a.label||'恢复点'}),...identity(metadata())};}
  if(action==='restore'){requireGuard(a);return receipt(await service.restore(a.id,guards(a)));}
  if(action==='inspect'){
    const s=service.snapshot();const parts=walkParts(s.doc);const wanted=a.id?parts.filter(p=>p.part.id===a.id||p.parents.includes(a.id)):parts;
    if(a.id&&!wanted.length)throw new Error('找不到语义部件 '+a.id);
    const list=wanted.slice(0,Math.max(1,Math.min(64,Number(a.limit)||(a.includeScript?8:12)))).map(({part:p,parents})=>({id:p.id,name:p.name,parents,visible:p.visible!==false,group:!!p.parts,
    recipe:p.recipe?(a.id&&JSON.stringify(p.recipe).length<8000?p.recipe:{type:p.recipe.type,params:Object.fromEntries(Object.entries(p.recipe.params||{}).filter(([,v])=>v===null||['number','string','boolean'].includes(typeof v))),parameterKeys:Object.keys(p.recipe.params||{}),omittedComplexParameters:true}):null,
    topology:p.topology?{vertices:p.topology.vertices.length/3,faces:p.topology.indices.length/3}:null,modifiers:p.modifiers||[],material:p.material,position:p.position,rotation:p.rotation,scale:p.scale}));
   let parameter;
   if(a.id&&a.parameter){if(typeof a.parameter!=='string'||['__proto__','prototype','constructor'].includes(a.parameter))throw new Error('parameter需recipe.params中的字段名');const value=wanted[0].part.recipe?.params?.[a.parameter];if(value===undefined)throw new Error('找不到该参数');const start=Math.max(0,Number(a.offset)||0),count=Math.max(1,Math.min(16,Number(a.count)||8));parameter=Array.isArray(value)?{name:a.parameter,value:value.slice(start,start+count),total:value.length,offset:start,nextOffset:start+count<value.length?start+count:null}:{name:a.parameter,value};}
   if(a.mesh&&a.id&&wanted[0].part.parts)throw new Error('组合件请展开并选择子件后读取可编辑基拓扑');
    const mesh=a.mesh&&a.id?evaluateObject(wanted[0].part,{base:true}).topology:null;
    const offset=Math.max(0,Number(a.offset)||0),count=Math.max(1,Math.min(64,Number(a.count)||24));
    const geometry=mesh?{space:'base-local',vertexCount:mesh.vertices.length/3,faceCount:mesh.indices.length/3,vertices:Array.from({length:Math.max(0,Math.min(count,mesh.vertices.length/3-offset))},(_,i)=>({id:i+offset,position:mesh.vertices.slice((i+offset)*3,(i+offset+1)*3)})),faces:Array.from({length:Math.max(0,Math.min(count,mesh.indices.length/3-offset))},(_,i)=>({id:i+offset,vertices:mesh.indices.slice((i+offset)*3,(i+offset+1)*3)}))}:undefined;
    return {...receipt(s,{findings:a.findings===true}),...(geometry?{geometry}:{}),...(parameter?{parameter}:{}),parts:list,totalParts:wanted.length,omitted:Math.max(0,wanted.length-list.length),sourceAvailable:!!s.doc.meta?.script,...(a.includeScript?{script:(s.doc.meta?.script||'').slice(Math.max(0,Number(a.scriptOffset)||0),Math.max(0,Number(a.scriptOffset)||0)+Math.max(1000,Math.min(48000,Number(a.scriptLimit)||3000))),sourceCharacters:(s.doc.meta?.script||'').length,sourceOffset:Math.max(0,Number(a.scriptOffset)||0),sourceNext:{action:'source',args:{offset:Math.max(0,Number(a.scriptOffset)||0)+Math.max(1000,Math.min(48000,Number(a.scriptLimit)||3000)),limit:6000}},sourceNote:'这是有界源码摘录；source返回稳定sourceId与完整分页，无需读内部存储' }:{})};
  }
  if(action==='preview'){
    const s=service.snapshot();let doc=evaluateDoc(s.doc);doc={...doc,objects:doc.objects.filter(o=>o.visible!==false)};
    if(a.context!==undefined&&(!Array.isArray(a.context)||a.context.length>12||a.context.some(id=>typeof id!=='string'||!id)))throw new Error('context需最多12个精确部件ID');
    if(a.isolate){const ids=[a.isolate,...(a.context||[])];doc={...doc,objects:doc.objects.filter(o=>ids.some(id=>o.editableId===id||o.id===id||(o.parentIds||[]).includes(id)))};}
    const raster=rasterDoc(doc,{views:a.views??(a.camera?undefined:['front','side','top']),camera:a.camera,cols:a.cols??64,rows:a.rows??25,samples:a.samples??1,cellAspect:a.cellAspect,faces:a.faces});
    return {ok:true,...identity(s),source:'shared-kernel-character-diagnostic',isolate:a.isolate||null,context:a.context||[],text:formatTextPreview(raster,{channel:a.channel||'shade',maxChars:10000}),cameras:Object.fromEntries(Object.entries(raster.views).map(([key,v])=>[key,v.camera||v.projection])),metrics:raster.metrics,appearance:{captured:false,reviewed:false}};
  }
  if(action==='variants'){
    const base=service.snapshot();if(a.expectedHash&&a.expectedHash!==base.contentHash)throw Object.assign(new Error('试验基线过期'),{code:'conflict'});
    const values=a.values;if(!Array.isArray(values)||!values.length||values.length>24)throw new Error('values 需1–24个候选值');
    const source=walkParts(base.doc).find(v=>v.part.id===a.id)?.part;
    if(!source?.recipe)throw new Error('只对保留生成定义的部件试参');
    if(typeof a.parameter!=='string'||!a.parameter||a.parameter.includes('__proto__')||a.parameter.includes('constructor'))throw new Error('parameter 需明确的生成参数名');
    const result=[];
    for(const value of values){
      const ops=[{op:'parameters',id:a.id,params:{[a.parameter]:clone(value)}}];
      try{
       const candidate=service.candidate({operations:ops,expectedHash:base.contentHash});
       const doc=candidate.doc;const analysis=analyzeDoc(doc);const health=geometryVerdict(doc);
       const compare=a.ref?compareToReference(doc,path.resolve(a.ref),{view:a.view||'side'}).comparison:null;
       const id=crypto.randomUUID();variants.set(id,{assetId:base.assetId,baseRevision:base.revision,baseHash:base.contentHash,operations:ops,value});
       let preview; if(a.preview===true&&result.length<6){const e=evaluateDoc(doc);const local={...e,objects:e.objects.filter(o=>o.editableId===a.id||(o.parentIds||[]).includes(a.id))};const r=rasterDoc(local,{views:[a.view||'side'],cols:40,rows:16,samples:1});preview=formatTextPreview(r,{channel:'shade',maxChars:1800});}
       result.push({id,value,contentHash:candidate.contentHash,bounds:analysis.summary.bounds,audit:health.audit,reference:compare,preview});
      }catch(e){result.push({value,error:e.message});}
    }
    while(variants.size>96)variants.delete(variants.keys().next().value);
    return {ok:true,...identity(base),changedCurrentAsset:false,candidates:result,note:'候选只在克隆资产上计算；apply_variant 才提交。轮廓得分不评价隐藏结构或材质。'};
  }
  if(action==='apply_variant'){
    requireGuard(a);const c=variants.get(a.id);if(!c)throw new Error('候选不存在或已过期');
    const current=metadata();
    if((a.expectedRevision!==undefined&&a.expectedRevision!==current.revision)||(a.expectedHash!==undefined&&a.expectedHash!==current.contentHash))throw Object.assign(new Error('调用者提供的版本守卫不匹配'),{code:'conflict'});
    if(c.assetId!==current.assetId||c.baseRevision!==current.revision||c.baseHash!==current.contentHash)throw Object.assign(new Error('候选资产或基线已变化，拒绝覆盖新编辑'),{code:'stale_candidate'});
    return receipt(await service.apply({expectedRevision:a.expectedRevision??c.baseRevision,expectedHash:a.expectedHash??c.baseHash,operations:c.operations,label:a.label||'接受参数候选'}));
  }
  if(action==='trace') {
    if (!probe) throw new Error('探针未启用');
    return { ok: true, ...probe.read({ since: Number(a.since) || 0, limit: a.limit || 200, includeDisk: a.includeDisk === true }), ...identity(metadata()) };
  }
  if(action==='review') {
    if (!probe) throw new Error('探针未启用');
    return { ok: true, ...probe.review({ includeDisk: a.includeDisk !== false, sessionId: a.session || null }), ...identity(metadata()) };
  }
  if(action==='capture'){
    if(nativeControl&&(a.selection||a.selectionId)){const selected=await nativeControl.execute(service,{op:'select',id:a.id||a.isolate,selection:a.selection,selectionId:a.selectionId,expectedHash:a.expectedHash,geometry:true});if(!selected.ok)throw Object.assign(Error(selected.error||'selection unavailable'),{code:selected.code,detail:selected.detail});a.overlay=selected.overlay;a.isolate=a.isolate||selected.id;a.focusSelection=a.focusSelection!==false;}
    if(a.source==='viewport'||a.view==='current'){
      if(buildInfo&&clientState.clientBuildId!==buildInfo.clientBuildId)throw Object.assign(new Error('页面仍是旧客户端，请刷新建模台后再采集'),{code:'stale_client'});
      if(!clientState.lastSeen||Date.now()-clientState.lastSeen>5000)throw Object.assign(new Error('当前没有面板视口；可使用默认独立渲染或source:isolated'),{code:'no_renderer'});
    }
    const result=await evidence.capture(a);return result.captures?{ok:true,...identity(metadata()),captures:result.captures,runtime:result.runtime,observationSelection:captureSelection}:{ok:true,...identity(metadata()),evidence:result,observationSelection:captureSelection};
  }
  if(action==='evidence')return {ok:true,...identity(metadata()),evidence:evidence.list(),qualityApproved:false};
  throw new Error('未知动作 '+action+'；先 catalog 获取操作与示例');
 }
 const NOT_PROBED = new Set(['trace', 'review', 'help', 'guide', 'catalog']);

  // Instrumentation lives here, at the single place every command passes through.
  // It records what already happened; it never recomputes geometry and never lets
  // a logging failure reach the caller.
  async function execute(action, args = {}) {
    if (!probe || NOT_PROBED.has(action) || (action==='geometry' && args?.op==='help')) return toolValue(await dispatch(action, args));
    let before = null;
    try { const s = resourceContext?resourceContext.resources.metadataForSession(resourceContext.sessionId):metadata();if(s)before = { id: s.assetId, revision: s.revision, hash: s.contentHash }; } catch { /* ignore */ }
    const started = performance.now();
    let codeRef = null;
    if (action === 'script' && typeof args?.code === 'string') { try { codeRef = probe.recordCode(args.code); } catch { codeRef = null; } }
    try {
      const result = toolValue(await dispatch(action, args));
      const after = result && result.assetId ? { id: result.assetId, revision: result.revision, hash: result.contentHash } : null;
      const text = typeof result?.text === 'string' ? result.text.length : undefined;
      probe.record({
        action,chatSessionId:resourceContext?.sessionId, ms: performance.now() - started, ok: result?.ok!==false, before, after,
        args: { ...summariseArgs(action, args), ...(codeRef ? { codeFile: codeRef.omitted ? 'omitted' : ('code/' + path.basename(codeRef.file)) } : {}) },
        facts: summariseResult(result),
        ...(text !== undefined ? { out: { textChars: text } } : {}),
      });
      return result;
    } catch (error) {
      probe.record({
        action,chatSessionId:resourceContext?.sessionId, ms: performance.now() - started, ok: false, code: error?.code || 'error', error: String(error?.message || error),
        before, args: summariseArgs(action, args),
      });
      throw error;
    }
  }

  return { execute, receipt, projects, close:()=>workflow.close() };
}
