const forbidden=new Set(['__proto__','prototype','constructor']);
const fail=(field,message)=>Object.assign(Error(message),{code:'invalid_read',detail:{field}});
function preview(value,depth=0,budget={left:5000}){
 if(budget.left<=0)return{omitted:true,reason:'summary budget'};
 if(typeof value==='string'&&value.length>512){budget.left-=512;return{kind:'string',characters:value.length,preview:value.slice(0,512),omitted:true};}
 if(value===null||typeof value!=='object'){budget.left-=JSON.stringify(value)?.length||4;return value;}
 if(Array.isArray(value))return {kind:'array',total:value.length};
 if(depth>=3)return{kind:'object',keys:Object.keys(value).slice(0,12)};
 const entries=Object.entries(value),out={};for(const[k,v]of entries.slice(0,20))out[k]=preview(v,depth+1,budget);if(entries.length>20)out.omittedKeys=entries.length-20;return out;
}
export function readScenePage(snapshot,args={}){
 if(args.expectedHash!==undefined&&args.expectedHash!==snapshot.contentHash||args.expectedRevision!==undefined&&args.expectedRevision!==snapshot.revision)throw Object.assign(Error('读取版本已变化'),{code:'conflict',detail:{expectedHash:args.expectedHash,currentHash:snapshot.contentHash}});
 if(args.assetId!==undefined&&args.assetId!==snapshot.assetId)throw Object.assign(Error('读取资源已变化'),{code:'binding_conflict'});
 const offset=args.offset??0;let count=args.count??24;if(!Number.isSafeInteger(offset)||offset<0)throw fail('offset','offset需要非负整数');if(!Number.isSafeInteger(count)||count<1||count>6000)throw fail('count','count需要正整数，数组最大64、字符串最大6000');
 const path=args.path||'object';if(typeof path!=='string'||path.length>200||!/^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]+)*$/.test(path)||path.split('.').some(k=>forbidden.has(k)))throw fail('path','需要明确安全字段路径');
 const objects=[];function walk(xs,parentId=null){for(const o of xs){objects.push({o,parentId});if(o.parts)walk(o.parts,o.id);}}walk(snapshot.doc.objects);
 let value,id=args.id||null;
 if(!id){if(path!=='object')throw fail('id','局部字段读取需要对象id');value=objects.map(({o,parentId})=>({id:o.id,parentId,name:o.name,sourceType:o.recipe?.params?.source?.type||o.recipe?.type||o.kind,position:o.position,rotation:o.rotation,scale:o.scale,visible:o.visible!==false,childCount:o.parts?.length||0}));}
 else{const o=objects.find(e=>e.o.id===id)?.o;if(!o)throw Object.assign(Error('对象不存在：'+id),{code:'not_found',detail:{objectId:id}});const native=o.recipe?.type==='nativeMesh',roots={object:o,source:native?o.recipe.params.source:o.recipe||o.topology||o.geometryData,features:native?o.recipe.params.features:[],mesh:native?o.recipe.params.mesh:o.topology||o.geometryData,meta:o.meta||{}};const fields=path.split('.');if(!(fields[0]in roots))throw fail('path','根字段支持object/source/features/mesh/meta');value=roots[fields.shift()];for(const field of fields){if(value===null||typeof value!=='object'||!Object.hasOwn(value,field))throw fail('path','字段不存在：'+path);value=value[field];}}
 if(value===undefined)throw fail('path','此对象没有该数据：'+path);
 const array=Array.isArray(value),text=typeof value==='string';if(text&&args.count===undefined)count=6000;if(array&&count>64)throw fail('count','数组count最大64');
 const total=array||text?value.length:1;let result=array?value.slice(offset,offset+count).map(x=>preview(x)):text?value.slice(offset,offset+count):preview(value);
 if(array)while(result.length>1&&JSON.stringify(result).length>10000)result.pop();const returned=array?result.length:text?result.length:1,nextOffset=(array||text)&&offset+returned<total?offset+returned:null;
 return{ok:true,assetId:snapshot.assetId,revision:snapshot.revision,contentHash:snapshot.contentHash,id,path,offset,count:returned,total,value:result,complete:nextOffset===null,representation:array||text?'page':'summary',scope:text?'characters':array?'items; nested arrays are summaries':'field summary; nested arrays require explicit field path',...(nextOffset!==null?{nextOffset,next:{op:'read',id,path,offset:nextOffset,count,expectedHash:snapshot.contentHash}}:{nextOffset:null})};
}
