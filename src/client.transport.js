// Display-only immutable payload decoding. Authoring APIs keep ordinary source
// documents; geometry is restored before any editor, renderer or exporter sees it.
export async function hydrateDisplay(value){
 if(!Array.isArray(value?.geometryPayloads)&&!Object.values(value?.appearanceAssets||{}).some(a=>a.codec==='gzip-rgba'))return value;value.geometryPayloads??=[];
 if(value.geometryPayloads.length>1024||typeof DecompressionStream!=='function')throw Error('Compressed model geometry is not supported by this browser');
 const byId=new Map();const walk=xs=>{for(const o of xs||[]){byId.set(o.id,o);if(o.parts)walk(o.parts);}};walk(value.doc?.objects);let total=0;
 for(const part of value.geometryPayloads){const target=byId.get(part.id);if(part.codec!=='gzip-json'||!target?.recipe?.params||target.recipe.params.mesh!==null||typeof part.data!=='string')throw Error('Invalid compressed model payload');const bytes=Uint8Array.from(atob(part.data),c=>c.charCodeAt(0)),stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')),reader=stream.getReader(),chunks=[];let length=0;
 try{for(;;){const {done,value:chunk}=await reader.read();if(done)break;length+=chunk.length;total+=chunk.length;if(length>128*1024*1024||total>384*1024*1024)throw Error('Model display geometry exceeds its decoded budget');chunks.push(chunk);}}finally{reader.releaseLock();}
 const all=new Uint8Array(length);let offset=0;for(const chunk of chunks){all.set(chunk,offset);offset+=chunk.length;}target.recipe.params.mesh=JSON.parse(new TextDecoder().decode(all));
 // Yield between pieces so workbench opening does not monopolize UI input.
 if(typeof requestAnimationFrame==='function')await new Promise(resolve=>requestAnimationFrame(resolve));
 }
 for(const asset of Object.values(value.appearanceAssets||{})){
  if(asset.codec==='png'){
   if(typeof createImageBitmap!=='function')throw Error('This browser cannot decode transported material images');
   const bytes=Uint8Array.from(atob(asset.data),c=>c.charCodeAt(0)),bitmap=await createImageBitmap(new Blob([bytes],{type:'image/png'}));
   try{const width=bitmap.width,height=bitmap.height;if(width!==asset.width||height!==asset.height)throw Error('Material image dimensions do not match its descriptor');const canvas=typeof OffscreenCanvas==='function'?new OffscreenCanvas(width,height):Object.assign(document.createElement('canvas'),{width,height}),context=canvas.getContext('2d',{willReadFrequently:true});if(!context)throw Error('No 2D context for material images');context.drawImage(bitmap,0,0);const pixels=context.getImageData(0,0,width,height).data;asset.data=new Uint8Array(pixels.buffer.slice(0));delete asset.codec;}finally{bitmap.close?.();}
   continue;
  }
  if(asset.codec!=='gzip-rgba')continue;const expected=asset.width*asset.height*4;if(!Number.isSafeInteger(expected)||expected<4||expected>2048*2048*4)throw Error('Invalid material image dimensions');const raw=Uint8Array.from(atob(asset.data),c=>c.charCodeAt(0)),reader=new Blob([raw]).stream().pipeThrough(new DecompressionStream('gzip')).getReader(),output=new Uint8Array(expected);let offset=0;try{for(;;){const r=await reader.read();if(r.done)break;if(offset+r.value.length>expected)throw Error('Material image exceeds decoded dimensions');output.set(r.value,offset);offset+=r.value.length;}}finally{reader.releaseLock();}if(offset!==expected)throw Error('Material image is incomplete');asset.data=output;delete asset.codec;}
 delete value.geometryPayloads;return value;
}
