import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import {decodePng} from './png.js';import {readBoundedBuffer,assertSafePath} from './geometry-cache.js';
import {referencedImages,materialLibrary} from './material-source.js';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),fail=(m,c='material_image')=>Object.assign(Error(m),{code:c});
const LIMIT=32*1024*1024,PIXELS=2048*2048,TOTAL=16*1024*1024;
export function createMaterialAssets({directory,backend}={}){
 if(!directory)throw Error('material image store requires directory');directory=path.resolve(directory);assertSafePath(directory);fs.mkdirSync(directory,{recursive:true});const cache=new Map();
 const fileFor=hash=>{if(typeof hash!=='string'||!/^[a-f0-9]{64}$/.test(hash))throw fail('invalid image hash');return path.join(directory,hash+'.png');};
 function load(hash){const file=fileFor(hash),bytes=readBoundedBuffer(file,LIMIT);if(sha(bytes)!==hash)throw fail('image content hash mismatch: '+hash);let image=cache.get(hash);if(!image){try{image=decodePng(bytes,{strict:true,maxPixels:PIXELS});}catch(e){throw fail('PNG image unsupported or corrupt: '+e.message,'invalid_image');}if(image.width>2048||image.height>2048)throw fail('image dimensions exceed 2048');cache.set(hash,image);while(cache.size>8)cache.delete(cache.keys().next().value);}return {file,bytes,image};}
 function importBytes(bytes,{name='Image'}={}){
  if(!Buffer.isBuffer(bytes))bytes=Buffer.from(bytes);if(!bytes.length||bytes.length>LIMIT)throw fail('image file byte budget exceeded');let image;try{image=decodePng(bytes,{strict:true,maxPixels:PIXELS});}catch(error){throw fail('PNG requires complete noninterlaced 8-bit RGB/RGBA data: '+error.message,'invalid_image');}if(image.width>2048||image.height>2048)throw fail('image dimensions exceed 2048');const hash=sha(bytes),file=fileFor(hash);assertSafePath(file);
  if(fs.existsSync(file)){if(!readBoundedBuffer(file,LIMIT).equals(bytes))throw fail('immutable image file mismatch');}
  else {const space=fs.statfsSync(directory);if(Number(space.bavail)*Number(space.bsize)<bytes.length+256*1024*1024)throw fail('insufficient disk reserve for image','storage_space');const temp=file+'.'+crypto.randomUUID()+'.tmp';try{fs.writeFileSync(temp,bytes,{flag:'wx'});fs.renameSync(temp,file);}finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}}
  cache.set(hash,image);while(cache.size>8)cache.delete(cache.keys().next().value);return {hash,mime:'image/png',width:image.width,height:image.height,bytes:bytes.length,name:String(name).slice(0,120)};
 }
 function importFile(file){if(typeof file!=='string'||!path.isAbsolute(file))throw fail('image import requires an absolute PNG path');const bytes=readBoundedBuffer(file,LIMIT);return importBytes(bytes,{name:path.basename(file)});}
 function prepareBackend(doc,assetId){let pixels=0;for(const hash of referencedImages(doc)){const loaded=load(hash);pixels+=loaded.image.width*loaded.image.height;if(pixels>TOTAL)throw fail('referenced image set exceeds 16 million pixels');const output=backend.assetFile(assetId,'image-'+hash+'.png');if(fs.existsSync(output)){if(sha(readBoundedBuffer(output,LIMIT))!==hash)throw fail('worker image hash mismatch');}else fs.writeFileSync(output,loaded.bytes,{flag:'wx'});}}
 function snapshot(snapshot){const assets={};let pixels=0;for(const hash of referencedImages(snapshot.doc)){const{image}=load(hash);pixels+=image.width*image.height;if(pixels>TOTAL)throw fail('render image set exceeds 16 million pixels');assets[hash]={width:image.width,height:image.height,data:Buffer.from(image.data).toString('base64')};}return Object.keys(assets).length?{...snapshot,appearanceAssets:assets}:snapshot;}
 return {importFile,importBytes,load,fileFor,prepareBackend,snapshot,directory,limits:{format:'8-bit noninterlaced PNG',maxDimension:2048,maxImagePixels:PIXELS,maxReferencedPixels:TOTAL}};
}
