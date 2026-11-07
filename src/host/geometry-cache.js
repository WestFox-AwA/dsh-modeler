import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
export const SCENE_SCHEMA = 'dsh-modeler/scene';
export const SCENE_VERSION = 2;
export const PAYLOAD_RAW_LIMIT = 256 * 1024 * 1024;
export const PAYLOAD_TOTAL_LIMIT = 512 * 1024 * 1024;
const VALUE_LIMIT = 64_000_000, COUNT_LIMIT = 65_536;
const HASH = /^[0-9a-f]{64}$/;
const FORBIDDEN = new Set(['__proto__','prototype','constructor']);
const REBUILDABLE = new Set(['box','rbox','sphere','cylinder','cone','torus','torusArc','lathe','loft','hull','extrude','spherePatch','patch','plane','sectionLoft','controlSurface','formBody','clayBox','bevelBox','curveSweep','curveTube','tyre','mirrorOf','meshBoolean','surfaceAttach','surfaceRegion','surfacePin','clearance','pathRepeat']);
const own = (o,k) => Object.prototype.hasOwnProperty.call(o,k);
const record = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const fail = (m,c='storage') => Object.assign(new Error(m),{code:c});
const nativeSource = r => r?.type === 'nativeMesh' && r.params?.schemaVersion === 1 && record(r.params.source) && typeof r.params.source.type === 'string' && Array.isArray(r.params.features);
// Detach complete leaf buffers, including attributes unknown to this version.
// Manual topology and raw mesh source arrays are always durable source.
export function splitScene(doc) {
 const payloads=[];
 const detach=(o,k,at,kind)=>{if(o[k]===null||typeof o[k]!=='object')return o;const out={...o};payloads.push({path:[...at,k],kind,value:o[k]});if(payloads.length>COUNT_LIMIT)throw fail('geometry payload count budget exceeded');delete out[k];return out;};
 const visit=(o,at,depth)=>{
  if(depth>64||!record(o))throw fail('invalid scene hierarchy');
  let out=detach(o,'geometryData',at,REBUILDABLE.has(o.recipe?.type)||nativeSource(o.recipe)?'cache':'source');
  out=detach(out,'topology',at,'source');
  if(record(o.recipe?.params)){
   const rp=[...at,'recipe','params'];let p=o.recipe.params;
   if(o.recipe.type==='nativeMesh')p=detach(p,'mesh',rp,nativeSource(o.recipe)?'cache':'source');
   if(record(p.source)&&p.source.type==='mesh'){let s=p.source;for(const k of Object.keys(s))s=detach(s,k,[...rp,'source'],'source');if(s!==p.source)p={...p,source:s};}
   if(p!==o.recipe.params)out={...out,recipe:{...o.recipe,params:p}};
  }
  if(Array.isArray(o.parts))out={...out,parts:o.parts.map((v,i)=>visit(v,[...at,'parts',i],depth+1))};return out;
 };
 if(!record(doc)||!Array.isArray(doc.objects))throw fail('scene must contain objects','validation');
 return {sourceDoc:{...doc,objects:doc.objects.map((o,i)=>visit(o,['objects',i],0))},payloads};
}
export function validateFiniteJson(v,b={values:0},depth=0,active=new Set()){
 if(++b.values>VALUE_LIMIT||depth>80)throw fail('geometry JSON value/depth budget exceeded');
 if(v===null||typeof v==='boolean'||typeof v==='string')return;
 if(typeof v==='number'){if(!Number.isFinite(v))throw fail('non-finite geometry JSON number');return;}
 if(typeof v!=='object'||active.has(v))throw fail('geometry must contain acyclic finite JSON');
 const array=Array.isArray(v),proto=Object.getPrototypeOf(v);
 if(!array&&proto!==null&&Object.getPrototypeOf(proto)!==null)throw fail('geometry must use plain JSON objects');active.add(v);
 if(array){if(v.length>VALUE_LIMIT)throw fail('geometry array budget exceeded');for(let i=0;i<v.length;i++){const d=Object.getOwnPropertyDescriptor(v,String(i));if(!d||!own(d,'value'))throw fail('sparse/accessor geometry array');validateFiniteJson(d.value,b,depth+1,active);}for(const k in v)if(own(v,k)&&(!/^(0|[1-9][0-9]*)$/.test(k)||Number(k)>=v.length))throw fail('custom geometry array fields');if(Object.getOwnPropertySymbols(v).length)throw fail('symbol geometry field');}
 else for(const k of Reflect.ownKeys(v)){const d=Object.getOwnPropertyDescriptor(v,k);if(!d.enumerable)continue;if(typeof k!=='string'||FORBIDDEN.has(k)||!own(d,'value'))throw fail('unsafe/accessor geometry field');validateFiniteJson(d.value,b,depth+1,active);}
 active.delete(v);
}
// Paths on disk come only from checked hashes, never a descriptor filename.
export function assertSafePath(file){
 const absolute=path.resolve(file),root=path.parse(absolute).root;let current=root;
 for(const p of absolute.slice(root.length).split(path.sep).filter(Boolean)){
  current=path.join(current,p);let st;try{st=fs.lstatSync(current);}catch(e){if(e.code==='ENOENT')return;throw e;}
  if(st.isSymbolicLink())throw fail('storage symlink is not allowed: '+path.basename(current));
  if(current!==absolute&&!st.isDirectory())throw fail('storage ancestor is not a directory');
 }
}
export function regularStat(file,limit,optional=false){
 assertSafePath(file);let st;try{st=fs.lstatSync(file);}catch(e){if(e.code==='ENOENT'&&optional)return null;if(e.code==='ENOENT')throw fail('missing storage reference: '+path.basename(file));throw e;}
 if(!st.isFile()||st.isSymbolicLink()||st.size>limit)throw fail('invalid storage file/byte budget: '+path.basename(file));return st;
}
export function readBoundedBuffer(file,limit){
 const before=regularStat(file,limit),fd=fs.openSync(file,fs.constants.O_RDONLY|(fs.constants.O_NOFOLLOW||0));
 try{
  const st=fs.fstatSync(fd);if(!st.isFile()||st.size>limit||st.dev!==before.dev||st.ino!==before.ino)throw fail('storage file changed while opening');
  const buf=Buffer.allocUnsafe(st.size);let at=0;while(at<buf.length){const n=fs.readSync(fd,buf,at,buf.length-at,at);if(!n)throw fail('storage file truncated');at+=n;}
  const after=fs.fstatSync(fd);if(after.size!==st.size||after.mtimeMs!==st.mtimeMs||after.ctimeMs!==st.ctimeMs)throw fail('storage file changed while reading');return buf;
 }finally{fs.closeSync(fd);}
}
const stamp=st=>[st.dev,st.ino,st.size,st.mtimeMs,st.ctimeMs].join(':');
const digest=buf=>createHash('sha256').update(buf).digest('hex');
function targetFor(doc,at){
 if(!Array.isArray(at)||at.length<3||at.length>140||at[0]!=='objects')throw fail('invalid geometry payload path');
 let object=doc,i=0;while(at[i]===(i===0?'objects':'parts')){const k=at[i++],n=at[i++];if(!Number.isSafeInteger(n)||n<0||!Array.isArray(object[k])||!record(object[k][n]))throw fail('geometry object path missing');object=object[k][n];if(at[i]!=='parts')break;}
 const tail=at.slice(i);let parent,key,kind;
 if(tail.length===1&&['geometryData','topology'].includes(tail[0])){parent=object;key=tail[0];kind=key==='geometryData'&&(REBUILDABLE.has(object.recipe?.type)||nativeSource(object.recipe))?'cache':'source';}
 else if(tail[0]==='recipe'&&tail[1]==='params'&&record(object.recipe?.params)){
  const p=object.recipe.params;
  if(tail.length===3&&tail[2]==='mesh'&&object.recipe.type==='nativeMesh'){parent=p;key='mesh';kind=nativeSource(object.recipe)?'cache':'source';}
  else if(tail.length===4&&tail[2]==='source'&&record(p.source)&&p.source.type==='mesh'){parent=p.source;key=tail[3];kind='source';}
 }
 if(!parent||typeof key!=='string'||FORBIDDEN.has(key)||own(parent,key))throw fail('invalid, duplicate or overlapping geometry payload target');return {parent,key,kind};
}
export function createGeometryCache(assets,{hashContent,canonicalByteLength,visitCanonical,sourceLimit}){
 const directory=path.join(assets,'.geometry'),verified=new Map(),counters={readHits:0,readMisses:0,writeHits:0,writeMisses:0};
 const fileFor=hash=>{if(typeof hash!=='string'||!HASH.test(hash))throw fail('invalid geometry payload hash');return path.join(directory,hash+'.json.gz');};
 const checkDescriptor=d=>{if(!record(d)||!['source','cache'].includes(d.kind)||typeof d.hash!=='string'||!HASH.test(d.hash)||!Number.isSafeInteger(d.rawBytes)||d.rawBytes<1||d.rawBytes>PAYLOAD_RAW_LIMIT||!Number.isSafeInteger(d.bytes)||d.bytes<1||d.bytes>PAYLOAD_RAW_LIMIT)throw fail('invalid geometry descriptor or byte budget');return fileFor(d.hash);};
 const readRaw=d=>{
  const compressed=readBoundedBuffer(checkDescriptor(d),PAYLOAD_RAW_LIMIT);if(compressed.length!==d.bytes)throw fail('geometry payload size mismatch: '+d.hash);
  let raw;try{raw=gunzipSync(compressed,{maxOutputLength:d.rawBytes});}catch(e){throw fail('geometry payload decompression budget/format: '+d.hash+' ('+(e.code||e.message)+')');}
  if(raw.length!==d.rawBytes||digest(raw)!==d.hash)throw fail('geometry payload contentHash mismatch: '+d.hash);return raw;
 };
 const validateEnvelope=(e,ref,{references=true}={})=>{
  if(!record(e)||e.schema!==SCENE_SCHEMA||e.version!==SCENE_VERSION||e.logicalHash!==ref||!HASH.test(ref)||!record(e.sourceDoc)||!Array.isArray(e.sourceDoc.objects)||!Array.isArray(e.payloads)||e.payloads.length>COUNT_LIMIT)throw fail('invalid scene envelope/contentHash mismatch: '+ref);
  validateFiniteJson(e.sourceDoc);if(canonicalByteLength(e.sourceDoc)>sourceLimit||e.sourceBodyHash!==hashContent(e.sourceDoc))throw fail('scene source contentHash mismatch or byte budget: '+ref);
  let rawBytes=0;const seen=new Set(),unique=new Map();
  for(const d of e.payloads){const file=checkDescriptor(d),target=targetFor(e.sourceDoc,d.path),key=JSON.stringify(d.path);
   if(seen.has(key)||target.kind!==d.kind)throw fail('duplicate geometry path or unsafe source/cache classification');seen.add(key);rawBytes+=d.rawBytes;
   if(rawBytes>PAYLOAD_TOTAL_LIMIT)throw fail('scene geometry decompression total budget exceeded');
   const previous=unique.get(d.hash);if(previous&&(previous.bytes!==d.bytes||previous.rawBytes!==d.rawBytes))throw fail('inconsistent geometry payload lengths');unique.set(d.hash,d);
   if(references&&regularStat(file,PAYLOAD_RAW_LIMIT).size!==d.bytes)throw fail('geometry payload size mismatch: '+d.hash);
  }return {unique,rawBytes};
 };
 const prepare=(doc,ref)=>{
  validateFiniteJson(doc);const {sourceDoc,payloads}=splitScene(doc),sourceBytes=canonicalByteLength(sourceDoc);
  if(sourceBytes>sourceLimit)throw fail('workspace scene source byte budget exceeded');
  const blobs=new Map(),descriptors=[];let rawTotal=0;
  for(const item of payloads){const hash=createHash('sha256');let rawBytes=0;
   visitCanonical(item.value,chunk=>{rawBytes+=Buffer.byteLength(chunk);if(rawBytes>PAYLOAD_RAW_LIMIT)throw fail('geometry payload raw byte budget exceeded');hash.update(chunk);});
   rawTotal+=rawBytes;if(rawTotal>PAYLOAD_TOTAL_LIMIT)throw fail('scene geometry byte budget exceeded');
   const key=hash.digest('hex');let blob=blobs.get(key);
   if(!blob){const file=fileFor(key),st=regularStat(file,PAYLOAD_RAW_LIMIT,true);
    if(st){const d={hash:key,rawBytes,bytes:st.size};if(verified.get(key)!==stamp(st)){readRaw({...d,kind:item.kind});verified.set(key,stamp(st));}blob={...d,file,existing:true};counters.writeHits++;}
    else {const chunks=[];visitCanonical(item.value,chunk=>chunks.push(chunk));const buffer=gzipSync(Buffer.from(chunks.join('')),{level:6});if(buffer.length>PAYLOAD_RAW_LIMIT)throw fail('compressed geometry byte budget exceeded');blob={hash:key,rawBytes,bytes:buffer.length,file,buffer,existing:false};counters.writeMisses++;}
    blobs.set(key,blob);
   }else counters.writeHits++;
   descriptors.push({path:item.path,kind:item.kind,hash:key,rawBytes,bytes:blob.bytes});
  }
  return {envelope:{schema:SCENE_SCHEMA,version:SCENE_VERSION,logicalHash:ref,sourceBodyHash:hashContent(sourceDoc),sourceDoc,payloads:descriptors},blobs,sourceBytes,rawBytes:rawTotal};
 };
 const hydrate=(e,ref,{verify=true}={})=>{
  validateEnvelope(e,ref);const doc=e.sourceDoc,budget={values:0},decoded=new Map();validateFiniteJson(doc,budget);
  for(const d of e.payloads){const target=targetFor(doc,d.path);let raw=decoded.get(d.hash);
   if(!raw){raw=readRaw(d);decoded.set(d.hash,raw);counters.readMisses++;}else counters.readHits++;
   let value;try{value=JSON.parse(raw.toString('utf8'));}catch(error){throw fail('cannot parse geometry payload: '+d.hash);}
   if(verify){validateFiniteJson(value,budget);if(hashContent(value)!==d.hash)throw fail('noncanonical geometry payload/contentHash mismatch: '+d.hash);}
   Object.defineProperty(target.parent,target.key,{value,enumerable:true,configurable:true,writable:true});
  }return doc;
 };
 return {directory,fileFor,prepare,hydrate,validateEnvelope,verifyBlob:readRaw,stats:()=>({...counters})};
}
