// Shared evaluation of an explicitly materialized native source. No process or IO.
import {validateMesh,resolveBudget} from './topology.js';
const finite=Number.isFinite;
function array(value,length,label,integer=false){if(!Array.isArray(value)||value.length!==length||value.some(x=>!finite(x)||(integer&&!Number.isSafeInteger(x))))throw Error('nativeMesh '+label+' has invalid shape/values');return value.slice();}
export function buildNativeMesh(params,budget={}){
 if(params?.schemaVersion!==1||!params.source||typeof params.source.type!=='string'||!Array.isArray(params.features)||!params.mesh)throw Error('nativeMesh needs a materialized source/feature document');
 const m=params.mesh,mesh=validateMesh(m,{budget:resolveBudget(budget),operator:'nativeMesh'}),corners=mesh.indices.length;
 if(m.cornerNormals!==undefined)mesh.cornerNormals=array(m.cornerNormals,corners*3,'cornerNormals');
 if(m.cornerUV?.length)mesh.cornerUV=array(m.cornerUV,corners*2,'cornerUV');
  if(m.cornerDetailUV?.length)mesh.cornerDetailUV=array(m.cornerDetailUV,corners*2,'cornerDetailUV');
 for(const k of ['triangleMaterialIndices','triangleFaceIds','triangleSourceFaceIds','triangleInstanceIndices'])if(m[k]!==undefined)mesh[k]=array(m[k],corners/3,k,true);
 for(const key of ['vertexIds','vertexSourceIds','vertexInstanceIndices'])if(m[key]!==undefined)mesh[key]=array(m[key],mesh.vertices.length/3,key,true);
 return mesh;
}
