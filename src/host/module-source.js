const clone=v=>JSON.parse(JSON.stringify(v));
const fail=(message,code='module_invalid')=>Object.assign(new Error(message),{code});
export function findModule(doc,id){let found=null;function walk(parts){for(const object of parts){if(object.id===id){if(found)throw fail('重复模块ID '+id);found=object;}if(object.parts)walk(object.parts);}}walk(doc.objects||[]);if(!found)throw fail('找不到模块 '+id);if(!Array.isArray(found.parts))throw fail('目标需为组合模块(parts[])，请先group');return found;}
/** Generator output is local to the selected module frame, not a whole asset. */
export function moduleReplacement(doc,moduleId,generated,code,{frameMode='preserve'}={}){
 const current=findModule(doc,moduleId);if(!generated||!Array.isArray(generated.objects)||generated.objects.length!==1)throw fail('模块程序必须return m.scene(...,[一个组合根])');
 const object=clone(generated.objects[0]);if(object.id!==moduleId||!Array.isArray(object.parts))throw fail('模块程序根需parts[]且.key与moduleId完全相同');
 if(current.semanticId!==undefined){if(object.semanticId!==undefined&&object.semanticId!==current.semanticId)throw fail('模块根semanticId不能改变');object.semanticId=current.semanticId;}
 if(!['preserve','source'].includes(frameMode))throw fail('frameMode需preserve或source');
 if(frameMode==='preserve')for(const field of ['position','rotation','scale'])object[field]=clone(current[field]|| (field==='scale'?[1,1,1]:[0,0,0]));
 object.module={...clone(current.module||{}),...clone(object.module||{}),sourceCode:code,sourceSpace:'module-local',frameMode};
 return {op:'replace_module',id:moduleId,object};
}
export function moduleDescriptor(doc,moduleId){const object=findModule(doc,moduleId),metadata=object.module||{};return {id:moduleId,name:object.name||moduleId,role:metadata.role||'assembly',sourceSpace:'module-local',frame:{position:object.position||[0,0,0],rotation:object.rotation||[0,0,0],scale:object.scale||[1,1,1]},children:object.parts.map(p=>({id:p.id,name:p.name||p.id,group:Array.isArray(p.parts),recipeType:p.recipe?.type||null})),controls:metadata.controls||[],interfaces:metadata.interfaces||[],available:typeof metadata.sourceCode==='string'&&!!metadata.sourceCode,notes:['程序只替换这个子树；根ID保持不变。','默认保留模块根TRS；子件坐标在模块局部。外部引用的子件ID不可无解释删除。','源程序检查使用完整资产上下文，模块外对象不会被替换。']};}
