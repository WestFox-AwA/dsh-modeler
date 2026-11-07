import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const fail=(message,code='source_error')=>Object.assign(new Error(message),{code});
function checkCode(code){if(typeof code!=='string'||!code.trim())throw fail('源码为空');if(code.length>200000)throw fail('源码超过200000字符预算','source_budget');return code;}
function idHash(id){if(typeof id!=='string'||!/^src_[a-f0-9]{64}$/.test(id))throw fail('sourceId需要source/save_source返回的标识');return id.slice(4);}
/** Inert source strings only. Geometry/history are never cached here. */
export function createSourceStore({directory=null}={}){
 const memory=new Map();let characters=0;
 function assetKey(assetId){if(typeof assetId!=='string'||!/^[A-Za-z0-9_-]{1,100}$/.test(assetId))throw fail('源码需要明确资源ID');return assetId;}
 function fileFor(assetId,hash){return path.join(directory,assetKey(assetId),hash+'.js');}
 function remember(key,code){if(memory.has(key))characters-=memory.get(key).length;memory.delete(key);memory.set(key,code);characters+=code.length;while(memory.size>32||characters>2000000){const first=memory.keys().next().value;characters-=memory.get(first).length;memory.delete(first);}}
 function put(assetId,code){assetKey(assetId);checkCode(code);const hash=sha(code),sourceId='src_'+hash,key=assetId+':'+hash;
  if(directory){const file=fileFor(assetId,hash);fs.mkdirSync(path.dirname(file),{recursive:true});try{fs.writeFileSync(file,code,{encoding:'utf8',flag:'wx'});}catch(error){if(error.code!=='EEXIST')throw error;if(fs.readFileSync(file,'utf8')!==code)throw fail('源码内容指纹冲突','source_integrity');}}
  remember(key,code);return {sourceId,sourceHash:hash,characters:code.length};
 }
 function get(assetId,sourceId,currentCode){assetKey(assetId);const hash=idHash(sourceId),key=assetId+':'+hash;
  if(typeof currentCode==='string'&&sha(currentCode)===hash)return currentCode;
  if(memory.has(key)){const code=memory.get(key);remember(key,code);return code;}
  if(directory){const file=fileFor(assetId,hash);try{const stat=fs.lstatSync(file);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>1200000)throw fail('源码文件无效','source_integrity');const code=fs.readFileSync(file,'utf8');checkCode(code);if(sha(code)!==hash)throw fail('源码内容指纹不匹配','source_integrity');remember(key,code);return code;}catch(error){if(error.code!=='ENOENT')throw error;}}
  throw fail('当前资源没有该源码；用source读取，或save_source保存后重试','source_not_found');
 }
 function read(assetId,code,{offset=0,limit=6000}={}){checkCode(code);if(!Number.isSafeInteger(offset)||offset<0||!Number.isSafeInteger(limit)||limit<1||limit>12000)throw fail('source offset需非负整数，limit需1–12000');const saved=put(assetId,code),end=Math.min(code.length,offset+limit),hash=saved.sourceHash;return {sourceId:'src_'+hash,sourceHash:hash,characters:code.length,offset,code:code.slice(offset,end),nextOffset:end<code.length?end:null,sourceSpace:'generator',changedCurrentAsset:false};}
 function patch(assetId,code,patches){checkCode(code);if(!Array.isArray(patches)||!patches.length||patches.length>64)throw fail('patches需要1–64条{find,replace,all?}');let next=code;
  for(const [index,p]of patches.entries()){if(!p||typeof p.find!=='string'||!p.find||typeof p.replace!=='string'||p.all!==undefined&&typeof p.all!=='boolean')throw fail('patches['+index+']字段无效');const count=next.split(p.find).length-1;if(count===0||count>1&&p.all!==true)throw fail('patches['+index+']匹配'+count+'处；需要唯一匹配或all:true','source_patch_conflict');next=p.all?next.split(p.find).join(p.replace):next.replace(p.find,()=>p.replace);checkCode(next);}
  const receipt=put(assetId,next);return {...receipt,code:next,patchesApplied:patches.length,changedCurrentAsset:false};
 }
 return {put,get,read,patch,state:()=>({sources:memory.size,characters,persistent:!!directory})};
}
export function sourceFailure(error){
 const message=String(error?.message||error).slice(0,1800),stack=String(error?.stack||'');const found=stack.match(/evalmachine\.<anonymous>:(\d+)(?::(\d+))?/);const wrappedLine=found?Number(found[1]):null;
 return {code:error?.code||'script_invalid',message,line:wrappedLine===null?null:Math.max(1,wrappedLine-2),lineScope:'generator source (VM wrapper removed when available)',recover:{action:'patch_source',then:'validate',commitsOnlyWith:'script'}};
}
