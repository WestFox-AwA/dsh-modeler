export function specError(field,message,part){return Object.assign(new Error(field+': '+message),{code:'invalid_spec',detail:{field,...(part?{part:part.name||part.type}:{}),next:{tool:'modeler_geometry',args:{op:'help',topic:'construct'}}}});}
const types=new Set(['box','sphere','cylinder','cone','torus','lathe','extrude','loft','spherePatch','mesh']);
const finite3=v=>Array.isArray(v)&&v.length===3&&v.every(Number.isFinite);
export function validateSpec(spec){
 if(!spec||typeof spec!=='object'||Array.isArray(spec))throw specError('spec','需要场景对象');if(!Array.isArray(spec.parts)||!spec.parts.length)throw specError('parts','需要至少一个部件；清空资源请显式reset');if(spec.parts.length>10000)throw specError('parts','超过10000部件预算');
 for(const [i,p]of spec.parts.entries()){
  const at='parts['+i+']';if(!p||typeof p!=='object'||Array.isArray(p))throw specError(at,'需要部件对象');const type=p.type||'box';if(!types.has(type))throw specError(at+'.type','不支持的构造类型：'+type,p);
  for(const k of ['position','rotation','scale','size','radii'])if(p[k]!==undefined&&(!finite3(p[k])||['size','radii'].includes(k)&&p[k].some(n=>n<=0)||k==='scale'&&p[k].some(n=>n===0)))throw specError(at+'.'+k,'需要有限XYZ，尺寸/半径为正且scale非零',p);
  for(const k of ['radius','height','depth','tube','rx','ry','rz','radiusScale'])if(p[k]!==undefined&&(!Number.isFinite(p[k])||p[k]<=0))throw specError(at+'.'+k,'需要正有限数',p);
  for(const k of ['radiusTop','radiusBottom'])if(p[k]!==undefined&&(!Number.isFinite(p[k])||p[k]<0))throw specError(at+'.'+k,'需要非负有限数',p);
  for(const [key,min,max]of [['segments',3,1024],['rings',2,512],['tubeSegments',3,512]])if(p[key]!==undefined&&(!Number.isInteger(p[key])||p[key]<min||p[key]>max))throw specError(at+'.'+key,'需要'+min+'..'+max+'整数',p);
  if(type==='mesh'&&(!Array.isArray(p.positions)||p.positions.length<9||p.positions.length%9||p.positions.some(x=>!Number.isFinite(x))))throw specError(at+'.positions','此兼容build入口接受扁平三角XYZ；vertices/faces请使用geometry create的mesh源',p);
  for(const [kind,key,min]of [['lathe','profile',2],['extrude','polygon',3],['loft','sections',2]])if(type===kind&&(!Array.isArray(p[key])||p[key].length<min))throw specError(at+'.'+key,'需要至少'+min+'项',p);
 }
 return spec;
}
