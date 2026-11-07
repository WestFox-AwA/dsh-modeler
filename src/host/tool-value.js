// Canonical output, before the Harness validates or logs it. Optional record
// fields may be absent; invalid numerics and exotic values never become null.
export function toolValue(value){
 const active=new Set();
 function visit(v,path,depth){
  if(depth>100)throw new Error('工具返回值过深：'+path);
  if(v===null||typeof v==='string'||typeof v==='boolean')return v;
  if(typeof v==='number'){if(!Number.isFinite(v))throw new Error('工具返回非有限数字：'+path);return Object.is(v,-0)?0:v;}
  if(typeof v!=='object')throw new Error('工具返回非JSON值：'+path);
  if(active.has(v))throw new Error('工具返回循环引用：'+path);active.add(v);let out;
  if(Array.isArray(v)){out=v.map((item,i)=>visit(item,path+'['+i+']',depth+1));if(Object.keys(v).length!==v.length)throw new Error('工具返回稀疏或扩展数组：'+path);}
  else {out={};for(const key of Object.keys(v)){const item=v[key];if(item!==undefined)out[key]=visit(item,path+'.'+key,depth+1);}}
  active.delete(v);return out;
 }
 return visit(value,'$',0);
}
export function assertToolValue(value){
 function walk(v,p){if(v===null||typeof v==='string'||typeof v==='boolean')return;if(typeof v==='number'){if(!Number.isFinite(v)||Object.is(v,-0))throw Error(p);return;}if(typeof v!=='object')throw Error(p);if(Array.isArray(v)){if(Object.keys(v).length!==v.length)throw Error(p);v.forEach((x,i)=>walk(x,p+'['+i+']'));}else for(const k of Object.keys(v))walk(v[k],p+'.'+k);}
 walk(value,'$');return true;
}
