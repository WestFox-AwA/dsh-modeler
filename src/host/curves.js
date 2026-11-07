import {Vector2,Vector3,CurvePath,CubicBezierCurve3,CatmullRomCurve3,ShapeUtils} from 'three';
const finite=v=>typeof v==='number'&&Number.isFinite(v),int=(v,d,lo,hi,label)=>{v=v??d;if(!Number.isInteger(v)||v<lo||v>hi)throw new Error(`${label} must be ${lo}..${hi}`);return v;};
export function normalizeCurve(desc){
 if(!desc||typeof desc!=='object'||!['bezier','catmullrom'].includes(desc.type))throw new Error('curve.type must be bezier or catmullrom');
 const points=desc.points;if(!Array.isArray(points)||points.length<2||points.length>128||points.some(p=>!Array.isArray(p)||p.length!==3||!p.every(finite)))throw new Error('curve.points needs 2..128 finite XYZ points');
 if(desc.type==='bezier'&&(points.length<4||(points.length-1)%3))throw new Error('Bezier needs 3n+1 control points; handles are explicit');
 if(desc.closed&&desc.type==='bezier'&&Math.hypot(...points[0].map((x,k)=>x-points.at(-1)[k]))>1e-8)throw new Error('closed Bezier endpoints must coincide');
 return {type:desc.type,points:points.map(p=>[...p]),closed:!!desc.closed,segments:int(desc.segments,48,4,256,'curve segments')};
}
function threeCurve(d){const ps=d.points.map(p=>new Vector3(...p));if(d.type==='catmullrom')return new CatmullRomCurve3(ps,d.closed,'centripetal',.5);const path=new CurvePath();for(let i=0;i+3<ps.length;i+=3)path.add(new CubicBezierCurve3(...ps.slice(i,i+4)));return path;}
export function sampleCurve(descriptor,{segments}={}){
 const d=normalizeCurve(descriptor),n=int(segments,d.segments,4,256,'sweep segments'),curve=threeCurve(d),length=curve.getLength();if(!finite(length)||length<1e-9)throw new Error('curve has zero/nonfinite length');
 const frames=curve.computeFrenetFrames(n,d.closed),points=curve.getSpacedPoints(n),samples=points.map((p,i)=>({position:p.toArray(),tangent:frames.tangents[i].toArray(),normal:frames.normals[i].toArray(),binormal:frames.binormals[i].toArray(),distance:length*i/n}));
 if(samples.some(s=>[s.position,s.tangent,s.normal,s.binormal].some(v=>!v.every(finite))||Math.hypot(...s.tangent)<.9))throw new Error('curve has a degenerate tangent/frame');
 return {samples,length,closed:d.closed,sampling:{mode:'fixed-arc-length',segments:n,errorBound:null}};
}
export function buildCurveSweep(p,budget={}){
 if(!Array.isArray(p.profile)||p.profile.length<3||p.profile.length>128||p.profile.some(q=>!Array.isArray(q)||q.length!==2||!q.every(finite)))throw new Error('sweep profile needs3..128 finite XY points');
 let profile=p.profile.map(v=>new Vector2(...v));if(profile[0].distanceTo(profile.at(-1))<1e-9)profile.pop();if(profile.length<3)throw new Error('degenerate sweep profile');
 let area=0;for(let j=0;j<profile.length;j++)area+=profile[j].x*profile[(j+1)%profile.length].y-profile[(j+1)%profile.length].x*profile[j].y;if(Math.abs(area)<1e-12)throw new Error('sweep profile has zero area');if(area<0)profile.reverse();
 const scale=p.scale??1,twist=p.twist??0;if(!finite(scale)||scale<=0||!finite(twist))throw new Error('sweep scale must be positive and twist finite');const sampled=sampleCurve(p.curve,{segments:p.segments}),N=sampled.samples.length-1,M=profile.length,rings=sampled.closed?N:N+1;
 if(rings*M>(budget.maxVertices??1000000)||2*N*M+2*(M-2)>(budget.maxTriangles??1000000))throw new Error('curve sweep exceeds geometry budget');
 const vertices=[],indices=[];for(let i=0;i<rings;i++){const f=sampled.samples[i],a=twist*i/N,c=Math.cos(a),s=Math.sin(a);for(const q of profile){const x=scale*(q.x*c-q.y*s),y=scale*(q.x*s+q.y*c);for(let k=0;k<3;k++)vertices.push(f.position[k]+f.normal[k]*x+f.binormal[k]*y);}}
 for(let i=0;i<N;i++)for(let j=0;j<M;j++){const a=i*M+j,b=i*M+(j+1)%M,c=((i+1)%rings)*M+(j+1)%M,d=((i+1)%rings)*M+j;indices.push(a,b,c,a,c,d);}
 if(!sampled.closed&&p.caps!==false){const tris=ShapeUtils.triangulateShape(profile,[]);if(tris.length!==M-2)throw new Error('sweep caps could not triangulate profile');for(const [a,b,c]of tris){indices.push(c,b,a);indices.push(N*M+a,N*M+b,N*M+c);}}
 return {vertices,indices};
}
export function buildCurveTube(p,budget){if(!finite(p.radius)||p.radius<=0)throw new Error('curveTube radius must be positive');const n=int(p.radialSegments,12,3,64,'radialSegments'),profile=Array.from({length:n},(_,i)=>[p.radius*Math.cos(i*2*Math.PI/n),p.radius*Math.sin(i*2*Math.PI/n)]);return buildCurveSweep({...p,profile},budget);}
