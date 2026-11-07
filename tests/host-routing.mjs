import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {assertToolValue} from '../lib/tool-value.js';
import {encodePng} from '../lib/png.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),temp=fs.mkdtempSync(path.join(root,'tests/.host-routing-'));
const bundle=path.join(root,'.test-host-'+path.basename(temp)+'.mjs'),tests=[];
async function test(name,fn){try{await fn();tests.push({name,passed:true});}catch(error){tests.push({name,passed:false,error:error.stack});}}
const tools=new Map(),routes=new Map(),disposals=[];
try{
 await build({entryPoints:[path.join(root,'index.js')],outfile:bundle,bundle:true,platform:'node',format:'esm',packages:'external',logLevel:'silent',plugins:[{name:'fixture-only-native-tool-and-home',setup(b){b.onResolve({filter:/^@deepseek-ai\/dsh-tools$/},()=>({path:'definition',namespace:'fixture'}));b.onResolve({filter:/^node:os$/},()=>({path:'home',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:args.path==='definition'?'export const defineTool=value=>value;':'export default {homedir:()=>'+JSON.stringify(temp)+'};',loader:'js'}));}}]});
 const plugin=await import(pathToFileURL(bundle).href);
 const ctx={tools:{register:tool=>{assert(!tools.has(tool.name));tools.set(tool.name,tool);return ()=>tools.delete(tool.name);}},get:()=>undefined,effect:(fn,label)=>{assert.equal(label,'modeler scoped live bridge');return ()=>{};},inject:(dependencies,fn)=>fn({connection:{fetch:{register:route=>{routes.set(route.path,route);return ()=>routes.delete(route.path);}}}})};
 plugin.apply(ctx);
 const A='session-host-routing-A',B='session-host-routing-B',exec=id=>({agent:{id},callId:'test-call-'+id,rootCallId:'test-root'});
 const invoke=async(name,args,sid=A)=>{const result=await tools.get(name).execute(args,exec(sid));assertToolValue(result);return result;};
 const work=(action,args={},sid=A)=>invoke('modeler_workbench',{action,args},sid);
 const request=async(url,body)=>{const init=body?{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}:{};const res=await routes.get(new URL(url).pathname).fetch(new Request(url,init));return {status:res.status,body:res.status===204?null:await res.json()};};
 await test('all original native modeler tools are routed through the actual dispatch agent',async()=>{
  assert(tools.has('modeler_scene'));assert(tools.has('modeler_script'));assert(tools.has('modeler_capture'));const a=await work('status'),b=await work('status',{},B);assert.equal(a.bound,false);assert.equal(b.bound,false);assert.equal(a.assetId,null);assert.equal(b.assetId,null);assert.equal(a.sessionId,A);assert.equal(b.sessionId,B);
  const na=await work('new',{title:'Scoped A'}),nb=await work('new',{title:'Scoped B'},B);assert(na.assetId);assert(nb.assetId);assert.notEqual(na.assetId,nb.assetId);
  const aa=await invoke('modeler_script',{code:"return m.scene('Scoped car',[m.box(2,1,1).key('body')]);",expectedRevision:na.revision});const bb=await invoke('modeler_script',{code:"return m.scene('Scoped tank',[m.box(5,1,2).key('body')]);",expectedRevision:nb.revision},B);assert(aa.ok,aa.error);assert(bb.ok,bb.error);
  const sa=await invoke('modeler_scene',{op:'get'}),sb=await invoke('modeler_scene',{op:'get'},B);assert.equal(sa.title,'Scoped car');assert.equal(sb.title,'Scoped tank');assert.equal(sa.docOmitted,true);assert.equal(sa.objects[0].id,'body');const full=await invoke('modeler_scene',{op:'get',includeDoc:true});assert.equal(full.doc.meta.title,'Scoped car');const field=await invoke('modeler_scene',{op:'read',id:'body',path:'object'});assert.equal(field.value.id,'body');
 });
 await test('native inspect/source/validate complete outputs pass strict lossless JSON, including optional fields',async()=>{
  const detail=await invoke('modeler_inspect',{includeScript:true});assert(detail.ok,detail.error);assert.equal(Object.hasOwn(detail,'geometry'),false);assertToolValue(detail);
  const guide=await work('help',{topic:'api',query:'sphere'});assert(guide.items.length);assertToolValue(guide);
  const source=await work('source',{offset:0,limit:200});assert(source.sourceId);assertToolValue(source);
  const valid=await work('validate',{code:'return m.scene("Check",[m.box()]);'});assert(valid.committable);assertToolValue(valid);
 });
 await test('resource UI handlers see their selected session and validate query/body/header agreement',async()=>{
  const a=await request('http://local/api/modeler/workbench?sessionId='+A);assert.equal(a.body.sessionId,A);assert.equal(a.body.doc.meta.title,'Scoped car');
  const b=await request('http://local/api/modeler/workbench?sessionId='+B);assert.equal(b.body.doc.meta.title,'Scoped tank');
  const conflict=await request('http://local/api/modeler/workbench?sessionId='+A,{sessionId:B,action:'new',args:{title:'must not exist'}});assert.equal(conflict.status,400);assert.equal(conflict.body.code,'session_conflict');
  const missing=await request('http://local/api/modeler/workbench');assert.equal(missing.status,400);assert.equal(missing.body.code,'session_required');
 });
 await test('comparison image route serves only an exact key in the currently bound asset',async()=>{
   const current=await work('status'),key='a'.repeat(16)+'-'+'b'.repeat(24),folder=path.join(temp,'.dsh','modeler-evidence',current.assetId);fs.mkdirSync(folder,{recursive:true});const bytes=encodePng({width:64,height:64,data:new Uint8Array(64*64*4).fill(180)});fs.writeFileSync(path.join(folder,key+'.png'),bytes);
   const route=routes.get('/api/modeler/image'),url='http://local/api/modeler/image?sessionId='+A+'&assetId='+current.assetId+'&key='+key,res=await route.fetch(new Request(url));assert.equal(res.status,200);assert.equal(res.headers.get('content-type'),'image/png');assert.deepEqual(Buffer.from(await res.arrayBuffer()),bytes);
   assert.equal((await route.fetch(new Request(url.replace(key,'../../other')))).status,400);
   assert.equal((await route.fetch(new Request(url.replace(current.assetId,'another-asset')))).status,400);
  });
  await test('wait detects a lower-revision resource selected during the outstanding request',async()=>{
  const initial=await work('status');const pending=request('http://local/api/modeler/wait?sessionId='+A+'&assetId='+initial.assetId+'&since='+initial.revision+'&timeout=50');
  const next=await work('new',{title:'New isolated resource',expectedBindingAssetId:initial.assetId});const waited=await pending;assert.equal(waited.body.assetId,next.assetId);assert.equal(waited.body.sessionId,A);assert.equal(waited.body.revision,0);assert.notEqual(waited.body.unchanged,true);
 });
 await test('UI browsing never redirects native work; adoption is explicit and guarded',async()=>{
   const beforeB=await work('status',{},B),beforeA=await work('status'),url='http://local/api/modeler/workbench?sessionId='+A+'&viewId=test-panel';
   const opened=await request(url,{sessionId:A,viewId:'test-panel',action:'browse',args:{assetId:beforeB.assetId}});assert.equal(opened.body.assetId,beforeB.assetId);assert.equal(opened.body.changedWorkTarget,false);assert.equal(opened.body.view.canEdit,false);assert.equal((await work('status')).assetId,beforeA.assetId);
   const browsing=await request(url);assert.equal(browsing.body.assetId,beforeB.assetId);assert.equal(browsing.body.view.workingAssetId,beforeA.assetId);
   const denied=await request(url,{sessionId:A,viewId:'test-panel',action:'edit',args:{assetId:beforeB.assetId,expectedHash:beforeB.contentHash,operations:[]}});assert.equal(denied.body.code,'browsing_readonly');
   const legacy=await request('http://local/api/modeler/workbench?sessionId='+A,{sessionId:A,action:'open',args:{project:beforeB.assetId,expectedBindingAssetId:beforeA.assetId}});assert.equal(legacy.body.code,'explicit_adoption_required');
   const adopted=await request(url,{sessionId:A,viewId:'test-panel',action:'adopt_browse',args:{assetId:beforeB.assetId,expectedWorkingAssetId:beforeA.assetId}});assert.equal(adopted.body.assetId,beforeB.assetId);assert.equal(adopted.body.view.canEdit,true);assert.equal((await work('status')).assetId,beforeB.assetId);assert.equal((await work('status',{},B)).contentHash,beforeB.contentHash);
   const old=await invoke('modeler_scene',{op:'replace',assetId:beforeA.assetId,expectedRevision:beforeB.revision,doc:{version:1,objects:[]}});assert.equal(old.ok,false);assert.equal(old.code,'binding_conflict');
  });
  await test('a native caller cannot redirect to another chat via JSON arguments',async()=>{
  const native=await work('status',{sessionId:B});assert.equal(native.sessionId,A);const noAgent=await tools.get('modeler_workbench').execute({action:'status'});assert.equal(noAgent.ok,false);assert.equal(noAgent.code,'session_required');
 });

  await test('old viewport clients receive an explicit update error without consuming render work',async()=>{
    const r=await request('http://local/api/modeler/render?sessionId='+A+'&client=3&build=old-client-build');
    assert.equal(r.status,409);assert.equal(r.body.code,'stale_client');assert(r.body.clientBuildId);assert(r.body.error.includes('刷新整个页面'));
    assert.equal((await work('status')).clientCurrent,false);
  });
  const contracts=[...tools.values()].filter(t=>t.name?.startsWith('modeler_')).map(t=>({name:t.name,description:t.description,parameters:t.parameters}));fs.mkdirSync(path.join(root,'verification/refinement-0.15-20261030'),{recursive:true});fs.writeFileSync(path.join(root,'verification/refinement-0.15-20261030/tool-contracts-current.json'),JSON.stringify({at:new Date().toISOString(),method:'Actual Host tool registration schemas; characters, not tokenizer estimates',tools:contracts.map(t=>({name:t.name,characters:JSON.stringify(t).length})),totalCharacters:JSON.stringify(contracts).length},null,2));
}finally{for(const dispose of disposals.reverse())await dispose();if(path.dirname(bundle)===root&&path.basename(bundle).startsWith('.test-host-'))fs.rmSync(bundle,{force:true});if(path.dirname(temp)===path.join(root,'tests')&&path.basename(temp).startsWith('.host-routing-'))fs.rmSync(temp,{recursive:true,force:true});}
const failed=tests.filter(t=>!t.passed);fs.writeFileSync(path.join(root,'verification/refinement-0.15-20261030/host-routing.json'),JSON.stringify({summary:{tests:tests.length,passed:tests.length-failed.length,failed:failed.length},tests},null,2));console.log(JSON.stringify({summary:{tests:tests.length,passed:tests.length-failed.length,failed:failed.length},tests},null,2));process.exitCode=failed.length?1:0;
