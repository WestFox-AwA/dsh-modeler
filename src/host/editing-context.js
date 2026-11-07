import {objectMatrix,multiplyMatrix,identityMatrix,transformPoint} from './relations.js';
const copy=x=>JSON.parse(JSON.stringify(x));
const fail=(message,code='editing_reference')=>Object.assign(Error(message),{code});
export function editingNode(doc,id){let found;const walk=(items,parent=identityMatrix())=>{for(const object of items||[]){const matrix=multiplyMatrix(parent,objectMatrix(object));if(object.id===id)found={object,matrix,parentMatrix:parent};if(object.parts)walk(object.parts,matrix);}};walk(doc.objects);if(!found)throw fail('对象不存在：'+id,'not_found');return found;}
export function editingSelection(object,selection,seen=new Set()){
 if(!selection||typeof selection!=='object'||Array.isArray(selection))throw fail('需要明确选区');
 if(selection.name){if(seen.has(selection.name))throw fail('命名选区循环引用');const saved=object.meta?.nativeSelections?.[selection.name];if(!saved)throw fail('命名选区不存在：'+selection.name);return editingSelection(object,saved,new Set([...seen,selection.name]));}
 const value=copy(selection);if(value.seed)value.seed=editingSelection(object,value.seed,seen);if(value.sets)value.sets=value.sets.map(s=>editingSelection(object,s,seen));return value;
}
export function editingFrame(doc,ownerId,definition){
 if(typeof definition==='string')definition={name:definition};if(!definition||typeof definition!=='object')throw fail('需要明确frame定义');const target=definition.target||ownerId,object=editingNode(doc,target).object;let value=definition;
 if(definition.name){const saved=object.meta?.nativeFrames?.[definition.name];if(!saved)throw fail('命名工作框架不存在：'+definition.name);value={...copy(saved),...(definition.target?{target:definition.target}:{})};}
 const result={...copy(value),selection:editingSelection(object,value.selection)};delete result.name;if(target===ownerId)delete result.target;else result.target=target;return result;
}
export function editingFeatures(doc,object){return (object.recipe.params.features||[]).map(f=>{const next=copy(f);if(next.selection)next.selection=editingSelection(object,next.selection);if(next.frame)next.frame=editingFrame(doc,object.id,next.frame);delete next.frameId;return next;});}
export function selectionOverlay(snapshot,id,result,frame=null){
 const geometry=result.selectionGeometry||result.geometry;if(!geometry)return null;const {matrix}=editingNode(snapshot.doc,id),transform=values=>{if(!Array.isArray(values))return[];if(values.length%3||values.length>49152||values.some(n=>!Number.isFinite(n)))throw fail('选区几何无效');const out=[];for(let i=0;i<values.length;i+=3)out.push(...transformPoint(values.slice(i,i+3),matrix));return out;};
 return {assetId:snapshot.assetId,revision:snapshot.revision,contentHash:snapshot.contentHash,id,topologyStamp:result.topologyStamp,space:'world',points:transform(geometry.points||[]),segments:transform(geometry.segments||[]),triangles:transform(geometry.triangles||[]),total:result.total,shown:geometry.showingCount??result.showingCount??result.items?.length??0,complete:geometry.complete!==false&&!(geometry.omitted>0||geometry.omitted===true),scope:geometry.scope||'query page only',...(frame?{frame}:{})};
}
export function localEditFeedback(snapshot,ids){return ids.slice(0,12).map(id=>{const{object,matrix}=editingNode(snapshot.doc,id),p=object.recipe?.params;if(object.recipe?.type!=='nativeMesh')return{id,representation:object.recipe?.type||object.kind};const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity],v=p.mesh.vertices;for(let i=0;i<v.length;i+=3){const q=transformPoint(v.slice(i,i+3),matrix);for(let k=0;k<3;k++){min[k]=Math.min(min[k],q[k]);max[k]=Math.max(max[k],q[k]);}}return{id,contentHash:snapshot.contentHash,worldBounds:v.length?{min,max}:null,sourceType:p.source.type,topologyStamp:p.topologyStamp,features:p.features.map(f=>({id:f.id,type:f.type})),query:{op:'feedback',id},space:'world'};});}
