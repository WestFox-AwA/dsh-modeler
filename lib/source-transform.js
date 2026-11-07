const copy = value => JSON.parse(JSON.stringify(value));
const finite3 = value => Array.isArray(value) && value.length === 3 && value.every(Number.isFinite);
const identity = {position:[0,0,0],rotation:[0,0,0],scale:[1,1,1]};
const error = (field, message, detail={}) => Object.assign(new Error(message), {code:'source_transform_conflict',detail:{field,...detail}});

/** Apply an author's declared local TRS policy. Never infer the new mesh's basis. */
export function sourceTransform(previous, declared, {apiVersion=2, transformPolicy}={}) {
  const policy=declared.transformPolicy ?? transformPolicy ?? (apiVersion===1?'preserve':'auto');
  if(!['auto','preserve','reset'].includes(policy))throw error('transformPolicy','transformPolicy需auto/preserve/reset',{objectId:previous.id});
  for(const field of Object.keys(identity))if(declared[field]!==undefined&&(!finite3(declared[field])||field==='scale'&&declared[field].some(x=>x===0)))throw error(field,field+'需要三个有限数（scale非零）',{objectId:previous.id});
  const oldSource=previous.recipe?.params?.source||{},nextSource=declared.source||oldSource;
  const sourceChanged=JSON.stringify(oldSource)!==JSON.stringify(nextSource);
  const basisChanged=sourceChanged&&(oldSource.type!==nextSource.type||(oldSource.axis??'z')!==(nextSource.axis??'z')||nextSource.type==='mesh'&&JSON.stringify(oldSource.vertices)!==JSON.stringify(nextSource.vertices));
  const nonIdentity=field=>(previous[field]||identity[field]).some((x,k)=>Math.abs(x-identity[field][k])>1e-10);
  const ambiguous=Object.keys(identity).filter(field=>basisChanged&&nonIdentity(field)&&declared[field]===undefined);
  if(policy==='auto'&&ambiguous.length)throw error('transformPolicy','换源可能改变本地坐标框架，需明确保留或重置已有变换',{objectId:previous.id,sourceType:nextSource.type,fields:ambiguous,currentTransform:Object.fromEntries(Object.keys(identity).map(f=>[f,copy(previous[f]||identity[f])])),choices:[{transformPolicy:'preserve',meaning:'新源仍在原对象本地坐标中，保留未声明的TRS'},{transformPolicy:'reset',meaning:'使用新源的坐标框架，未声明TRS取单位默认'}],next:{op:'help',topic:'transforms'}});
  const retained=[];
  const transform={};for(const field of Object.keys(identity)){const provided=declared[field]!==undefined;transform[field]=copy(provided?declared[field]:policy==='reset'?identity[field]:previous[field]||identity[field]);if(!provided&&policy!=='reset')retained.push(field);}
  return {transform,receipt:{id:previous.id,policy,sourceChanged,basisChanged,retainedFields:retained,transform:copy(transform),space:'object-local'}};
}
