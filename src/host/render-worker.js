import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';

// An owned browser process renders the same capture.js/shared Three studio as
// the live viewport. No user browser profile, no replacement Harness server, no
// model code eval, no UI polling, and no historical source scene stays resident.
const error=(message,code='render_failed')=>Object.assign(new Error(message),{code});
const RETRYABLE_PROFILE_ERRORS=new Set(['EBUSY','EPERM','EACCES','ENOTEMPTY','EMFILE','ENFILE']);
const childStopped=child=>!child||(child.exitCode!==null&&child.exitCode!==undefined)||(child.signalCode!==null&&child.signalCode!==undefined);
const errorText=e=>String(e?.message||e||'unknown error').slice(0,2000);

export function findRenderBrowser(){
 const candidates=[process.env.DSH_MODELER_BROWSER,
  process.env.PROGRAMFILES&&path.join(process.env.PROGRAMFILES,'Google/Chrome/Application/chrome.exe'),
  process.env['PROGRAMFILES(X86)']&&path.join(process.env['PROGRAMFILES(X86)'],'Microsoft/Edge/Application/msedge.exe'),
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  ...(process.platform==='linux'?['/usr/bin/chromium','/usr/bin/chromium-browser','/usr/bin/google-chrome']:[])].filter(Boolean);
 const found=candidates.find(p=>fs.existsSync(p));if(!found)throw error('没有可用的Chromium渲染运行时；设置 DSH_MODELER_BROWSER 指向 Edge/Chrome。','renderer_unavailable');return found;
}
async function collect(request,limit){
 const chunks=[];let size=0;for await(const b of request){size+=b.length;if(size>limit)throw error('截图返回超出图像预算','render_budget');chunks.push(b);}return Buffer.concat(chunks).toString('utf8');
}
async function diagnoseOwnedBrowser(profile){
 try{
  const port=Number(fs.readFileSync(path.join(profile,'DevToolsActivePort'),'utf8').split(/\r?\n/)[0]);
  const pages=await fetch('http://127.0.0.1:'+port+'/json/list',{signal:AbortSignal.timeout(1500)}).then(r=>r.json());const page=pages.find(p=>p.type==='page');if(!page)return 'no-page';
  return await new Promise(resolve=>{let done=false;const ws=new WebSocket(page.webSocketDebuggerUrl);const finish=value=>{if(done)return;done=true;clearTimeout(timer);ws.close();resolve(String(value).slice(0,2000));};const timer=setTimeout(()=>finish('debug-timeout'),1800);timer.unref?.();ws.addEventListener('open',()=>ws.send(JSON.stringify({id:1,method:'Runtime.evaluate',params:{expression:'JSON.stringify({ready:document.readyState,html:document.documentElement.outerHTML.slice(0,1400),status:window.__captureStatus,error:window.__captureError})',returnByValue:true}})));ws.addEventListener('message',event=>{const data=JSON.parse(event.data);if(data.id===1)finish(data.result?.result?.value||JSON.stringify(data));});ws.addEventListener('error',()=>finish('debug-unavailable'));});
 }catch(e){return 'debug:'+e.message;}
}
function processEvidence(controller){
 return {pid:controller?.child?.pid??null,processStopped:childStopped(controller?.child),serverListening:!!controller?.server?.listening,profile:controller?.profile||null,phase:controller?.phase||null};
}
function recoveryFailure(controller,reason,cause){
 const evidence=processEvidence(controller);
 const suffix=` PID ${evidence.pid??'unknown'}; processStopped=${evidence.processStopped}; serverListening=${evidence.serverListening}`;
 return Object.assign(error(`专用渲染器恢复未确认：${reason}${suffix}；保留清理所有权`,'recovery_required'),{evidence,cause});
}
function cleanupFailure(profile,e){
 const code=e?.code||'unknown';
 return Object.assign(error(`专用渲染profile清理失败：${code}`,'renderer_cleanup'),{profile,cleanupCode:code,retryable:RETRYABLE_PROFILE_ERRORS.has(code),cause:e});
}
async function closeServer(server){
 if(!server?.listening)return {closed:true};
 try{server.closeAllConnections?.();}catch{}
 await new Promise((resolve,reject)=>{let settled=false;const done=(e)=>{if(settled)return;settled=true;if(e&&e.code!=='ERR_SERVER_NOT_RUNNING')reject(e);else resolve();};try{server.close(done);}catch(e){done(e);}});
 return {closed:!server.listening};
}
async function stopOwnedProcess(child){
 if(!child?.pid||childStopped(child))return {confirmed:true,alreadyExited:true,pid:child?.pid??null};
 const exited=new Promise(resolve=>{if(childStopped(child))return resolve();child.once('exit',resolve);});
 // Re-check immediately before acting. This avoids sending taskkill to a PID
 // after the owned ChildProcess has already reported its exit.
 if(!childStopped(child)){
  if(process.platform==='win32'){
   const killer=spawn('taskkill.exe',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});
   await new Promise(resolve=>{killer.once('exit',resolve);killer.once('error',resolve);});
  }else{try{process.kill(-child.pid,'SIGTERM');}catch{try{child.kill('SIGTERM');}catch{}}}
 }
 await Promise.race([exited,new Promise(resolve=>{const t=setTimeout(resolve,3000);t.unref?.();})]);
 if(childStopped(child))return {confirmed:true,pid:child.pid};
 throw recoveryFailure({child,phase:'stopping'},'无法确认专用渲染进程已退出');
}
function cloneQueuedRequest(request){
 if(typeof structuredClone==='function')return structuredClone(request);
 return JSON.parse(JSON.stringify(request));
}
function identityOf(scene){return {assetId:scene?.assetId,revision:scene?.revision,contentHash:scene?.contentHash};}
function assertSnapshotIdentity(request,scene){
 if(!scene||typeof scene!=='object')throw error('渲染快照无效','renderer_snapshot');
 if(request.assetId&&request.assetId!==scene.assetId||request.contentHash&&request.contentHash!==scene.contentHash||request.revision!==undefined&&request.revision!==scene.revision)throw error('渲染开始前资产已改变，请重新取版本','conflict');
 return identityOf(scene);
}

export function createRenderWorker({root,buildInfo,snapshot,timeoutMs=45000,browserPath,temporaryDirectory,testHooks}={}){
 if(!root||!snapshot)throw Error('Renderer needs package root and snapshot provider');
 const hooks=testHooks&&typeof testHooks==='object'?testHooks:{};
 const removeDirectory=typeof hooks.removeDirectory==='function'?hooks.removeDirectory:(target,options)=>fs.promises.rm(target,options);
 const stopProcess=typeof hooks.stopProcess==='function'?hooks.stopProcess:stopOwnedProcess;
 const spawnProcess=typeof hooks.spawnProcess==='function'?hooks.spawnProcess:spawn;
 let active=null,disposed=false,tail=Promise.resolve(),queued=0,queuedBytes=0;
 const retryableLeftovers=new Map();
 const stats={completed:0,failed:0,lastPid:null,lastCleanup:null};

 function activeState(){
  if(!active)return null;
  return {phase:active.phase,pid:active.child?.pid??null,processStopped:childStopped(active.child),serverListening:!!active.server?.listening,profile:active.profile||null,error:active.recoveryError?errorText(active.recoveryError):null};
 }
 function state(){
  return {...stats,busy:!!active&&active.phase==='running',recoveryRequired:!!active&&active.phase==='recovery',active:activeState(),retryableLeftovers:[...retryableLeftovers.values()].map(item=>({path:item.path,attempts:item.attempts,lastError:item.lastError})),queued,queuedBytes,disposed};
 }
 async function retryLeftovers(){
  for(const [profile,item] of [...retryableLeftovers]){
   try{
    await removeDirectory(profile,{recursive:true,force:true,maxRetries:6,retryDelay:150});
    retryableLeftovers.delete(profile);stats.lastCleanup='removed';
   }catch(e){
    item.attempts++;item.lastError=errorText(e);stats.lastCleanup=`清理待重试profile失败：${item.lastError}`;
   }
  }
 }
 async function cleanupController(controller){
  if(controller.cleanupPromise)return controller.cleanupPromise;
  controller.cleanupPromise=(async()=>{
   let stopError=null,serverError=null;
   try{
    if(!controller.processStopped){
     const result=await stopProcess(controller.child);
     // A hook may report a status, but the child state is still checked. A
     // live or unknown child never permits a new owned browser.
     if(result?.confirmed===false||!childStopped(controller.child))throw recoveryFailure(controller,'无法确认专用渲染进程已退出',result?.cause||result);
     controller.processStopped=true;
    }
   }catch(e){stopError=e.code==='recovery_required'?e:recoveryFailure(controller,'停止专用渲染进程失败',e);}
   try{
    if(controller.server&&!controller.serverClosed){await closeServer(controller.server);if(controller.server.listening)throw recoveryFailure(controller,'无法确认本地渲染服务已关闭');controller.serverClosed=true;}
   }catch(e){serverError=e.code==='recovery_required'?e:recoveryFailure(controller,'关闭本地渲染服务失败',e);}
   if(stopError||serverError){
    controller.phase='recovery';controller.recoveryError=stopError||serverError;
    if(stopError&&serverError)controller.recoveryError=Object.assign(stopError,{server:serverError.evidence});
    controller.cleanupPromise=null;
    return {blocked:true,error:controller.recoveryError};
   }
   let warning=null,fatal=null;
   if(controller.profile&&!controller.profileRemoved){
    const profile=controller.profile;
    try{await removeDirectory(profile,{recursive:true,force:true,maxRetries:6,retryDelay:150});controller.profileRemoved=true;controller.profile=null;stats.lastCleanup='removed';}
    catch(e){
     const cleanup=cleanupFailure(profile,e);stats.lastCleanup=cleanup.message;
     if(cleanup.retryable){
      const item=retryableLeftovers.get(profile)||{path:profile,attempts:0,lastError:null};item.attempts++;item.lastError=cleanup.message;retryableLeftovers.set(profile,item);controller.profile=null;warning=cleanup.message;
     }else fatal=cleanup;
    }
   }
   if(fatal){controller.phase='recovery';controller.recoveryError=fatal;controller.cleanupPromise=null;return {blocked:true,error:fatal,warning};}
   controller.phase='done';if(active===controller)active=null;
   return {warning};
  })();
  return controller.cleanupPromise;
 }
 async function recover(){
  if(active){
   if(active.phase==='running')throw error('已有一批截图正在渲染；完成后重试。','renderer_busy');
   const outcome=await cleanupController(active);
   if(outcome.blocked)throw outcome.error;
  }
  await retryLeftovers();
  return state();
 }
 async function executeCapture(job){
  const executionStarted=performance.now();
  if(disposed)throw error('渲染上下文已关闭','renderer_closed');
  if(active){
   if(active.phase==='running')throw error('已有一批截图正在渲染；完成后重试。','renderer_busy');
   await recover();
  }else await retryLeftovers();
  if(active)throw recoveryFailure(active,'仍有专用渲染资源未确认停止');

  const request=job.request,identity=job.identity;
  let markDone;const controller={child:null,server:null,abort:null,profile:null,phase:'running',processStopped:false,serverClosed:false,profileRemoved:false,done:new Promise(resolve=>{markDone=resolve;})};active=controller;
  let temp,json=null,jobId,endpoint,stderr='',renderDone=false,result=null,primaryError=null,served=false;
  const requestsSeen=[];
  try{
   const browser=browserPath||findRenderBrowser();
   const requests=request.requests||[request];if(!Array.isArray(requests)||requests.length<1||requests.length>4)throw error('每批截图需要1–4个机位','render_budget');
   const scratch=temporaryDirectory||path.join(root,'.capture-jobs');fs.mkdirSync(scratch,{recursive:true});
   temp=fs.mkdtempSync(path.join(scratch,'dsh-modeler-render-'));controller.profile=temp;
   jobId=crypto.randomBytes(24).toString('hex');
   // Snapshot once at queue submission. The scene and identity here are the
   // pinned values; no mutable work binding is consulted after queue wait.
   json='{"snapshot":'+job.sceneJson+',"requests":'+JSON.stringify(requests.map(r=>({...r,...identity})))+',"clientBuildId":'+JSON.stringify(buildInfo.clientBuildId)+'}';
   if(Buffer.byteLength(json)>96*1024*1024)throw error('当前资产超过独立渲染数据预算','render_budget');
   let settle,fail;const pending=new Promise((resolve,reject)=>{settle=resolve;fail=reject;});
   controller.abort=()=>fail(error('截图请求已取消，渲染资源将释放','renderer_closed'));
   const server=http.createServer(async(req,res)=>{
    try{
     const url=new URL(req.url,'http://local');const expected='/'+jobId+'/';
     if(!url.pathname.startsWith(expected)){res.writeHead(404).end();return;}
     const file=url.pathname.slice(expected.length);if(requestsSeen.length<12)requestsSeen.push(req.method+' '+file);
     res.setHeader('Cache-Control','no-store');
     if(req.method==='GET'&&file===''){
      res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><meta charset="utf-8"><title>Modeler capture worker</title><canvas id="capture"></canvas><script src="capture.js"></script>');
     }else if(req.method==='GET'&&file==='capture.js'){
      res.setHeader('Content-Type','text/javascript');fs.createReadStream(path.join(root,'dist','capture.js')).on('error',fail).pipe(res);
     }else if(req.method==='GET'&&file==='job.json'){
      if(served){res.writeHead(410).end();return;}served=true;res.setHeader('Content-Type','application/json');res.end(json);json=null;
     }else if(req.method==='POST'&&file==='result'){
      const payload=JSON.parse(await collect(req,64*1024*1024));
      if(!Array.isArray(payload.frames)||payload.frames.length!==requests.length)throw error('渲染器返回的机位数量不匹配');
      res.setHeader('Content-Type','application/json');res.end('{"ok":true}');renderDone=true;
      settle({frames:payload.frames.map(frame=>({...frame,source:'isolated-webgl'})),runtime:{backend:'chromium-headless',pid:controller.child?.pid,batchFrames:payload.frames.length}});
     }else if(req.method==='POST'&&file==='error'){
      const payload=JSON.parse(await collect(req,32768));res.end('{"ok":true}');fail(error('真实Three渲染失败：'+String(payload.error||payload.message||'未知错误').slice(0,1800)));
     }else res.writeHead(404).end();
    }catch(e){if(!res.headersSent)res.writeHead(400);if(!res.writableEnded)res.end('capture request rejected');fail(e);}
   });controller.server=server;
   await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
   endpoint='http://127.0.0.1:'+server.address().port+'/'+jobId+'/';
   const flags=['--headless=new','--no-sandbox','--disable-gpu-sandbox','--no-first-run','--no-default-browser-check','--disable-extensions','--disable-background-networking','--disable-background-mode','--disable-component-update','--disable-sync','--metrics-recording-only','--mute-audio','--hide-scrollbars','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage','--remote-debugging-port=0','--user-data-dir='+temp,endpoint];
   const child=spawnProcess(browser,flags,{windowsHide:true,stdio:['ignore','ignore','pipe'],detached:process.platform!=='win32'});controller.child=child;stats.lastPid=child.pid||null;
   child.stderr?.on('data',b=>{stderr=(stderr+b.toString('utf8')).slice(-12000);});
   child.once?.('error',e=>fail(error('无法启动独立渲染器：'+e.message,'renderer_unavailable')));
   child.once?.('exit',(code,signal)=>{if(!renderDone)fail(error('独立渲染器提前退出 '+code+'/'+signal+' '+stderr.slice(-1200)));});
   let timer;try{result=await Promise.race([pending,new Promise((_,reject)=>{timer=setTimeout(async()=>{const diagnostic=await diagnoseOwnedBrowser(temp);reject(error('真实Three截图超时；阶段 '+JSON.stringify(requestsSeen)+'；页面 '+diagnostic+'；'+stderr.slice(-1200),'render_timeout'));},timeoutMs);timer.unref?.();})]);}finally{clearTimeout(timer);}
  }catch(e){primaryError=e;}
  const cleanup=await cleanupController(controller);
  json=null;
  const durationMs=+(performance.now()-executionStarted).toFixed(1),queueWaitMs=Math.max(0,+(executionStarted-job.submittedAt).toFixed(1));
  if(result){result.runtime={...result.runtime,durationMs,queueWaitMs};if(cleanup.warning)result.runtime.cleanupWarning=cleanup.warning;}
  markDone();
  if(cleanup.blocked&&!primaryError)primaryError=cleanup.error;
  else if(cleanup.blocked&&primaryError)primaryError.cleanupRecovery=cleanup.error.evidence;
  else if(cleanup.fatal&&!primaryError)primaryError=cleanup.error;
  if(primaryError){stats.failed++;throw primaryError;}
  if(result)stats.completed++;
  return result;
 }
 async function close(){
  disposed=true;const job=active;job?.abort?.();if(job)await job.done;
  let blocked=null;
  if(active){const outcome=await cleanupController(active);if(outcome.blocked)blocked=outcome.error;}
  await retryLeftovers();
  await tail.catch(()=>{});
  if(blocked)throw blocked;
  if(retryableLeftovers.size)throw Object.assign(error('仍有专用渲染profile待清理','renderer_cleanup'),{retryable:true,evidence:state().retryableLeftovers});
 }
 async function capture(request){
   if(disposed)throw error('渲染上下文已关闭','renderer_closed');
   if(queued>=32)throw error('截图队列已满','render_queue_full');
   const submittedAt=performance.now(),pinnedRequest=cloneQueuedRequest(request);let sceneJson,identity,bytes=0;queued++;
   try{const supplied=snapshot(request),scene=supplied?.then?await supplied:supplied;if(disposed)throw error('渲染上下文已关闭','renderer_closed');identity=assertSnapshotIdentity(pinnedRequest,scene);sceneJson=typeof scene.sceneJson==='string'?scene.sceneJson:JSON.stringify(scene);bytes=Buffer.byteLength(sceneJson);if(bytes>96*1024*1024||queuedBytes+bytes>192*1024*1024)throw error('排队快照超出渲染内存预算；减少同时提交的视图或等待已排队项完成','render_budget');}
   catch(e){queued--;throw e;}
   queuedBytes+=bytes;const job=tail.then(()=>executeCapture({request:pinnedRequest,sceneJson,identity,submittedAt}));tail=job.catch(()=>{});
   return job.finally(()=>{queued--;queuedBytes-=bytes;});
  }
  return {capture,close,recover,state};
}
