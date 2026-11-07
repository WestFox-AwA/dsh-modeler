// Editable, inert surface IR. Rotation is pattern XYZ; sampling applies inverse.
const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v),copy=v=>JSON.parse(JSON.stringify(v));
const fail=(field,message)=>{throw Object.assign(new Error(field+': '+message),{code:'invalid_material_surface',detail:{field}});};
const own=(v,k)=>Object.prototype.hasOwnProperty.call(v,k);
const keys=(v,allowed,field)=>{if(!record(v))fail(field,'expected object');for(const k of Object.keys(v))if(!allowed.includes(k))fail(field+'.'+k,'unsupported field');};
const number=(v,field,min=-Infinity,max=Infinity)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)fail(field,`expected finite number ${min}..${max}`);return v;};
const unit=(v,field)=>number(v,field,0,1);
const positive=(v,field)=>{number(v,field);if(v<=0)fail(field,'expected positive number');return v;};
const vec=(v,field,pos=false)=>{if(!Array.isArray(v)||v.length!==3)fail(field,'expected three numbers');v.forEach((n,i)=>pos?positive(n,`${field}[${i}]`):number(n,`${field}[${i}]`));return v;};
const dot=(a,b)=>a.reduce((s,n,i)=>s+n*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const id=(v,field)=>{if(typeof v!=='string'||!/^[A-Za-z][A-Za-z0-9_-]{0,79}$/.test(v))fail(field,'expected stable identifier up to 80 letters/digits/_/-');return v;};
const color=(v,field)=>{if(typeof v!=='string'||!/^#(?:[a-f0-9]{3}|[a-f0-9]{6})$/i.test(v))fail(field,'expected #rgb or #rrggbb');return v;};
export const SURFACE_SPACES=Object.freeze(['object','world','frame','uv','generated']);
export const SURFACE_SIGNAL_TYPES=Object.freeze(['noise','voronoi','wave','weave','constant','mix','ramp','image']);
export const SURFACE_RECIPE_IDS=Object.freeze(['sprayed_paint','cast_metal','brushed_metal','rolled_metal','rubber','fiber_weave','polished_metal','plain_glass']);
export const MATERIAL_PROPERTY_VALUES=Object.freeze({substrate:Object.freeze(['metal','rubber','glass','composite','polymer']),finish:Object.freeze(['painted','bare','coated','polished']),process:SURFACE_RECIPE_IDS,state:Object.freeze(['clean'])});
export function validateMaterialProperties(v,field='material.properties'){
 keys(v,Object.keys(MATERIAL_PROPERTY_VALUES),field);
 for(const[k,allowed]of Object.entries(MATERIAL_PROPERTY_VALUES))if(!allowed.includes(v[k]))fail(field+'.'+k,'expected '+allowed.join('/'));
 return copy(v);
}
export function validateSurfaceMapping(v,field='material.surface.mapping',{partial=false}={}){
 keys(v,['space','origin','rotation','scale','frame'],field);
 if((!partial||v.space!==undefined)&&!SURFACE_SPACES.includes(v.space))fail(field+'.space','expected '+SURFACE_SPACES.join('/'));
 for(const k of ['origin','rotation','scale'])if(v[k]!==undefined)vec(v[k],field+'.'+k,k==='scale');
 if(v.frame!==undefined||v.space==='frame'&&!partial){
  const at=field+'.frame',f=v.frame;keys(f,['origin','tangent','bitangent','normal'],at);
  for(const k of ['origin','tangent','bitangent','normal'])vec(f[k],at+'.'+k);
  const{tangent:t,bitangent:b,normal:n}=f,eps=1e-6;
  for(const[k,a]of[['tangent',t],['bitangent',b],['normal',n]])if(Math.abs(dot(a,a)-1)>eps)fail(at+'.'+k,'expected unit basis vector');
  if(Math.abs(dot(t,b))>eps||Math.abs(dot(t,n))>eps||Math.abs(dot(b,n))>eps)fail(at,'expected orthonormal basis; shear unsupported');
  if(dot(cross(t,b),n)<1-eps)fail(at,'expected right-handed orthonormal basis');
  if(v.space!==undefined&&v.space!=='frame')fail(at,'frame only valid for frame space');
 }
 return copy(v);
}
const ref=(v,field,refs)=>{if(typeof v==='number')return unit(v,field);id(v,field);refs.push({name:v,field});return v;};
const named=(v,field,refs)=>{id(v,field);refs.push({name:v,field});};
export function validateSurfaceMask(v,field='material.surface.mask',refs=[]){
 if(typeof v==='number'){unit(v,field);return v;}
 keys(v,['signal','min','max','invert'],field);named(v.signal,field+'.signal',refs);
 for(const k of ['min','max'])if(v[k]!==undefined)unit(v[k],field+'.'+k);
 if((v.min??0)>=(v.max??1))fail(field+'.max','expected max greater than min');
 if(v.invert!==undefined&&typeof v.invert!=='boolean')fail(field+'.invert','expected boolean');return copy(v);
}
const signalFields={noise:['wavelength','detail','seed','stretch'],voronoi:['wavelength','seed','stretch'],wave:['wavelength','direction','profile','seed'],weave:['wavelength','ratio','seed'],constant:['value'],mix:['a','b','factor'],ramp:['input','min','max','invert'],image:['image','channel','colorSpace']};
function signal(v,field,refs){
 if(!record(v))fail(field,'expected signal object');
 if(!SURFACE_SIGNAL_TYPES.includes(v.type))fail(field+'.type','expected '+SURFACE_SIGNAL_TYPES.join('/'));
 keys(v,['type','mapping',...signalFields[v.type]],field);
 if(v.mapping!==undefined)validateSurfaceMapping(v.mapping,field+'.mapping',{partial:true});
 if(v.direction!==undefined){vec(v.direction,field+'.direction');if(Math.hypot(...v.direction)===0)fail(field+'.direction','expected nonzero direction');}
 if(['noise','voronoi','wave','weave'].includes(v.type))positive(v.wavelength,field+'.wavelength');
 if(v.detail!==undefined)number(v.detail,field+'.detail',0,8);
 if(v.stretch!==undefined)vec(v.stretch,field+'.stretch',true);
 if(v.seed!==undefined&&(!Number.isSafeInteger(v.seed)||v.seed<0||v.seed>1000000))fail(field+'.seed','expected integer 0..1000000');
 if(v.profile!==undefined&&!['sine','saw','triangle'].includes(v.profile))fail(field+'.profile','expected sine/saw/triangle');
 if(v.ratio!==undefined)unit(v.ratio,field+'.ratio');
 if(v.type==='constant')unit(v.value,field+'.value');
 if(v.type==='mix'){ref(v.a,field+'.a',refs);ref(v.b,field+'.b',refs);validateSurfaceMask(v.factor,field+'.factor',refs);}
 if(v.type==='ramp'){
  ref(v.input,field+'.input',refs);for(const k of ['min','max'])if(v[k]!==undefined)unit(v[k],field+'.'+k);
  if((v.min??0)>=(v.max??1))fail(field+'.max','expected max greater than min');
  if(v.invert!==undefined&&typeof v.invert!=='boolean')fail(field+'.invert','expected boolean');
 }
 if(v.type==='image'){
  if(typeof v.image!=='string'||!/^[a-f0-9]{64}$/.test(v.image))fail(field+'.image','expected imported image hash');
  if(v.channel!==undefined&&!['r','g','b'].includes(v.channel))fail(field+'.channel','expected r/g/b');
  if(v.colorSpace!=='linear')fail(field+'.colorSpace','expected linear for scalar image signal');
 }
}
function layer(v,field,refs){
 keys(v,['id','mask','color','roughness','metalness','clearcoat','clearcoatRoughness','height'],field);id(v.id,field+'.id');
 if(v.mask!==undefined)validateSurfaceMask(v.mask,field+'.mask',refs);
 if(v.color!==undefined){if(typeof v.color==='string')color(v.color,field+'.color');else{keys(v.color,['a','b','signal'],field+'.color');color(v.color.a,field+'.color.a');color(v.color.b,field+'.color.b');named(v.color.signal,field+'.color.signal',refs);}}
 for(const k of ['roughness','metalness'])if(v[k]!==undefined){const at=field+'.'+k,a=v[k];if(typeof a==='number')unit(a,at);else{keys(a,['min','max','signal'],at);unit(a.min,at+'.min');unit(a.max,at+'.max');if(a.min>a.max)fail(at+'.max','expected max >= min');named(a.signal,at+'.signal',refs);}}
 for(const k of ['clearcoat','clearcoatRoughness'])if(v[k]!==undefined)unit(v[k],field+'.'+k);
 if(v.height!==undefined){const at=field+'.height',h=v.height;keys(h,['signal','amplitude','midlevel'],at);named(h.signal,at+'.signal',refs);number(h.amplitude,at+'.amplitude',0,.05);if(h.midlevel!==undefined)unit(h.midlevel,at+'.midlevel');}
}
export function surfaceSignalOrder(s){
 const order=[],state=new Map(),visit=(name,field)=>{
  if(!own(s.signals,name))fail(field,'missing signal '+name);
  if(state.get(name)===1)fail(field,'signal cycle at '+name);if(state.get(name)===2)return;
  state.set(name,1);const refs=[];signal(s.signals[name],'material.surface.signals.'+name,refs);for(const r of refs)visit(r.name,r.field);state.set(name,2);order.push(name);
 };
 for(const name of Object.keys(s.signals))visit(name,'material.surface.signals.'+name);return order;
}
export function validateMaterialSurface(v){
 const at='material.surface';keys(v,['version','mapping','signals','layers'],at);if(v.version!==1)fail(at+'.version','expected version 1');if(v.mapping!==undefined)validateSurfaceMapping(v.mapping);
 if(!record(v.signals))fail(at+'.signals','expected named signal table');if(Object.keys(v.signals).length>16)fail(at+'.signals','at most 16 signals');
 const refs=[];for(const[name,s]of Object.entries(v.signals)){id(name,at+'.signals.'+name);signal(s,at+'.signals.'+name,refs);const merged=resolveSurfaceMapping(v,s);validateSurfaceMapping(merged,at+'.signals.'+name+'.mapping');}
 if(!Array.isArray(v.layers)||v.layers.length<1||v.layers.length>8)fail(at+'.layers','expected 1..8 layers');const ids=new Set();
 v.layers.forEach((a,i)=>{const field=`${at}.layers[${i}]`;layer(a,field,refs);if(ids.has(a.id))fail(field+'.id','duplicate layer id');ids.add(a.id);});
 for(const r of refs)if(!own(v.signals,r.name))fail(r.field,'missing signal '+r.name);surfaceSignalOrder(v);return copy(v);
}

// Signal mappings override supplied fields, with a space change dropping an
// inherited frame. No defaults are written into the authoring JSON.
export function resolveSurfaceMapping(surface,signal={}){
 const base=surface?.mapping||{space:signal.type==='image'?'uv':'object'},patch=signal.mapping||{},merged={...base,...patch};
 if(patch.space!==undefined&&patch.space!=='frame')delete merged.frame;
 if(merged.space===undefined)merged.space=signal.type==='image'?'uv':'object';
 return copy(merged);
}
export function materialSurfaceReferencedImages(spec){
 const signals=spec?.surface?.signals||spec?.signals||{};
 return [...new Set(Object.values(signals).filter(s=>s?.type==='image'&&typeof s.image==='string').map(s=>s.image))];
}
export function materialSurfaceRequiredChannels(spec){
 const surface=spec?.surface||(spec?.version===1&&spec?.layers?spec:null);if(!surface)return [];
 const used=new Set(['baseColor','roughness','metalness']);
 for(const layer of surface.layers||[]){
  if(layer.height?.amplitude>0)used.add('normal');
  for(const k of ['clearcoat','clearcoatRoughness'])if(layer[k]!==undefined)used.add(k);
 }
 return ['baseColor','roughness','metalness','normal','clearcoat','clearcoatRoughness'].filter(c=>used.has(c));
}
export function materialSurfaceSummary(spec={}){
 if(spec.detail){const {detail,...base}=spec,macro=materialSurfaceSummary(base),layers=detail.surface?.layers||[],channels=[...(layers.some(l=>l.color!==undefined)?['baseColor']:[]),...(layers.some(l=>l.roughness!==undefined)?['roughness']:[]),...(layers.some(l=>l.height?.amplitude>0)?['normal']:[])];return {...macro,kind:spec.surface?'hybrid':'detail',channels:[...new Set([...macro.channels,...channels])],spatialChannels:[...new Set([...(macro.spatialChannels||[]),...channels])],detail:{version:detail.version,size:detail.size,projection:detail.projection,space:detail.space,channels,signals:Object.keys(detail.surface?.signals||{}),layers:layers.map(l=>l.id)},needsBake:true,detailNext:'material.get',scope:'Declared source structure; inspect delivery/fidelity for measured retained detail.'};}
 const surface=spec.surface;
 if(!surface){const channels=Object.keys(spec.textures||{}),legacy=Boolean(spec.procedural);return {kind:legacy?'legacy-procedural':channels.length?'image':'uniform',properties:copy(spec.properties||{}),mapping:legacy?{space:'generated'}:channels.length?{space:'uv'}:null,signals:legacy?[{id:'procedural',type:spec.procedural.type,scale:spec.procedural.scale??5}]:[],layers:[],channels,spatialChannels:legacy?['baseColor','roughness',...(spec.procedural.bumpDistance?['normal']:[])]:channels,maps:channels,needsBake:legacy,detailNext:legacy||channels.length?'material.get':'material.put'};}
 return {kind:'surface',properties:copy(spec.properties||{}),mapping:copy(surface.mapping||{space:'object'}),signals:Object.entries(surface.signals||{}).map(([id,s])=>({id,type:s.type,...(s.wavelength!==undefined?{wavelength:s.wavelength}:{}),mapping:resolveSurfaceMapping(surface,s),...(s.direction?{direction:copy(s.direction)}:{})})),layers:(surface.layers||[]).map(l=>({id:l.id,mask:copy(l.mask??1),channels:['color','roughness','metalness','clearcoat','clearcoatRoughness','height'].filter(k=>l[k]!==undefined)})),channels:materialSurfaceRequiredChannels(spec),spatialChannels:[...new Set((surface.layers||[]).flatMap(l=>[...(typeof l.color==='object'?['baseColor']:[]),...(typeof l.roughness==='object'?['roughness']:[]),...(typeof l.metalness==='object'?['metalness']:[]),...(l.height?.amplitude>0?['normal']:[]),...(typeof l.mask==='object'?['color','roughness','metalness','clearcoat','clearcoatRoughness'].filter(k=>l[k]!==undefined).map(k=>k==='color'?'baseColor':k):[])]))],maps:Object.keys(spec.textures||{}),needsBake:true,detailNext:'material.get'};
}

// Reference sampler: point is already in object/UV/generated coordinates, or is
// a world point for world/frame. q=R^-1 basis^-1(p-origin)/scale/stretch/lambda.
export function surfacePointCoordinates(mapping,point,{stretch=[1,1,1],wavelength=1}={}){
 validateSurfaceMapping(mapping);vec(point,'point');vec(stretch,'stretch',true);positive(wavelength,'wavelength');
 const frame=mapping.space==='frame'?mapping.frame:null,origin=mapping.origin||(frame?.origin)||[0,0,0];
 let q=point.map((v,i)=>v-origin[i]);
 if(frame)q=[dot(q,frame.tangent),dot(q,frame.bitangent),dot(q,frame.normal)];
 const r=mapping.rotation||[0,0,0];
 for(const axis of [2,1,0]){const a=-r[axis],c=Math.cos(a),s=Math.sin(a),[x,y,z]=q;q=axis===2?[c*x-s*y,s*x+c*y,z]:axis===1?[c*x+s*z,y,-s*x+c*z]:[x,c*y-s*z,s*y+c*z];}
 const scale=mapping.scale||[1,1,1];return q.map((n,i)=>n/scale[i]/stretch[i]/wavelength);
}
