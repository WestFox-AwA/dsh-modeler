// Named controls resolve to parametric leaves inside one declared module scope.
export function moduleControlOperations(doc,id,values){
 let module=null;const walk=items=>{for(const o of items||[]){if(o.id===id)module=o;if(o.parts)walk(o.parts);}};walk(doc.objects);
 if(!module?.parts)throw new Error('set_control需要明确的组合模块ID');
 if(!values||typeof values!=='object'||Array.isArray(values)||!Object.keys(values).length)throw new Error('values需控件名到新值的对象');
 const descendants=new Map();const gather=items=>{for(const o of items){descendants.set(o.id,o);if(o.parts)gather(o.parts);}};gather(module.parts);
 const controls=module.module?.controls||[],operations=[];
 for(const [name,value]of Object.entries(values)){const control=controls.find(c=>c.name===name);if(!control)throw new Error('模块未声明控件 '+name);const leaf=descendants.get(control.target);if(!leaf?.recipe||leaf.parts)throw new Error('控件目标必须是当前模块内参数叶件 '+name);const field=control.parameter;if(typeof field!=='string'||!Object.hasOwn(leaf.recipe.params||{},field)||['__proto__','prototype','constructor'].includes(field))throw new Error('控件parameter需目标recipe.params的现有字段 '+name);operations.push({op:'parameters',id:leaf.id,params:{[field]:value}});}
 return operations;
}
