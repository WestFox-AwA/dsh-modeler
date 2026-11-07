// Indexed marching tetrahedra. Consistent six-tet cell subdivision avoids ambiguous
// multi-sheet dual vertices at concave openings. Geometry remains an approximation.
import {checkBudget,resolveBudget} from './topology.js';
export function marchingTetrahedra(field,min,max,nx,ny,nz,options={}){
 const budget=resolveBudget(options.budget),X=nx+1,Y=ny+1,Z=nz+1,xy=X*Y,values=new Float64Array(X*Y*Z),steps=max.map((v,k)=>(v-min[k])/[nx,ny,nz][k]),id=(i,j,k)=>i+X*j+xy*k;
 for(let k=0;k<=nz;k++)for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){const value=field([min[0]+steps[0]*i,min[1]+steps[1]*j,min[2]+steps[2]*k]);if(!Number.isFinite(value))throw Error('nonfinite form field');values[id(i,j,k)]=value;}
 const vertices=[],indices=[],edges=new Map(),cornerDeltas=[[0,0,0],[1,0,0],[0,1,0],[1,1,0],[0,0,1],[1,0,1],[0,1,1],[1,1,1]],tets=[[0,1,3,7],[0,3,2,7],[0,2,6,7],[0,6,4,7],[0,4,5,7],[0,5,1,7]];
 const crossing=(a,b,points,ids)=>{const va=ids[a],vb=ids[b],t=values[va]/(values[va]-values[vb]),key=t<1e-10?'p:'+va:t>1-1e-10?'p:'+vb:va<vb?va+':'+vb:vb+':'+va;if(edges.has(key))return edges.get(key);const p=points[a].map((v,k)=>v+(points[b][k]-v)*t),index=vertices.length/3;vertices.push(...p);edges.set(key,index);return index;};
 const emit=(a,b,c,direction)=>{if(a===b||b===c||a===c)return;const A=vertices.slice(a*3,a*3+3),B=vertices.slice(b*3,b*3+3),C=vertices.slice(c*3,c*3+3),u=B.map((v,k)=>v-A[k]),v=C.map((v,k)=>v-A[k]),n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];if(n.reduce((sum,x,k)=>sum+x*direction[k],0)<0)[b,c]=[c,b];indices.push(a,b,c);if(indices.length%30000===0)checkBudget(vertices.length/3,indices.length/3,budget,'form isosurface');};
 for(let k=0;k<nz;k++)for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
  const ids=cornerDeltas.map(([a,b,c])=>id(i+a,j+b,k+c)),neg=ids.map(n=>values[n]<0);if(neg.every(Boolean)||neg.every(x=>!x))continue;const points=cornerDeltas.map(([a,b,c])=>[min[0]+steps[0]*(i+a),min[1]+steps[1]*(j+b),min[2]+steps[2]*(k+c)]);
  for(const tet of tets){const inside=tet.filter(n=>neg[n]),outside=tet.filter(n=>!neg[n]);if(!inside.length||!outside.length)continue;const direction=[0,1,2].map(k=>outside.reduce((s,n)=>s+points[n][k],0)/outside.length-inside.reduce((s,n)=>s+points[n][k],0)/inside.length);
   if(inside.length===1){const q=outside.map(n=>crossing(inside[0],n,points,ids));emit(...q,direction);}else if(inside.length===3){const q=inside.map(n=>crossing(outside[0],n,points,ids));emit(...q,direction);}else{const a=crossing(inside[0],outside[0],points,ids),b=crossing(inside[0],outside[1],points,ids),c=crossing(inside[1],outside[1],points,ids),d=crossing(inside[1],outside[0],points,ids);emit(a,b,c,direction);emit(a,c,d,direction);}
  }
 }
 checkBudget(vertices.length/3,indices.length/3,budget,'form isosurface');return {vertices,indices};
}
