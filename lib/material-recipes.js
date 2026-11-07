import {validateMaterialSpec} from './material-source.js';
import {SURFACE_RECIPE_IDS,validateSurfaceMapping,validateSurfaceMask} from './material-surface.js';
const copy=v=>JSON.parse(JSON.stringify(v)),record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const fail=(field,message)=>{throw Object.assign(Error(field+': '+message),{code:'invalid_material_surface',detail:{field}});};
const clamp=n=>Math.max(0,Math.min(1,n));
const definitions={
 sprayed_paint:{when:'Clean sprayed dielectric paint on a metal substrate; fine orange peel under a coating.',not:'Bare metal, exposed substrate, rust or chipped paint.',properties:{substrate:'metal',finish:'painted'},defaults:{color:'#547a91',roughness:.34,clearcoat:.28,wavelength:.0018,microWavelength:.00018,amplitude:.000025},allowed:['color','roughness','clearcoat','wavelength','microWavelength','amplitude','rotation','mapping','seed','mask']},
 cast_metal:{when:'Clean bare cast metal with distinct casting grain and micro roughness.',not:'Painted cast parts or polished sheet metal.',properties:{substrate:'metal',finish:'bare'},defaults:{color:'#8b8d8f',roughness:.52,metalness:1,wavelength:.004,microWavelength:.00035,amplitude:.00012},allowed:['color','roughness','metalness','wavelength','microWavelength','amplitude','rotation','mapping','seed','mask']},
 brushed_metal:{when:'Clean bare metal with physically oriented long brushing marks.',not:'Isotropic casting grain, paint or random scratches.',properties:{substrate:'metal',finish:'bare'},defaults:{color:'#a6a9ac',roughness:.3,metalness:1,wavelength:.00032,microWavelength:.000045,amplitude:.000008,direction:[1,0,0]},allowed:['color','roughness','metalness','wavelength','microWavelength','amplitude','direction','rotation','mapping','seed','mask']},
 rolled_metal:{when:'Clean rolled bare sheet metal with long directional roll structure.',not:'Cast grain, paint or worn/rusted metal.',properties:{substrate:'metal',finish:'bare'},defaults:{color:'#91979c',roughness:.4,metalness:1,wavelength:.0025,microWavelength:.00016,amplitude:.000025,direction:[1,0,0]},allowed:['color','roughness','metalness','wavelength','microWavelength','amplitude','direction','rotation','mapping','seed','mask']},
 rubber:{when:'Clean moulded rubber with fine mould texture and dielectric response.',not:'Metal, glossy paint or dirty/worn rubber.',properties:{substrate:'rubber',finish:'bare'},defaults:{color:'#252729',roughness:.72,wavelength:.0012,microWavelength:.00014,amplitude:.000028},allowed:['color','roughness','wavelength','microWavelength','amplitude','rotation','mapping','seed','mask']},
 fiber_weave:{when:'Clean woven composite with separate warp/weft signals and a clear coating.',not:'Random noise relabelled as fibres or exposed metallic fibres.',properties:{substrate:'composite',finish:'coated'},defaults:{color:'#303438',roughness:.25,clearcoat:1,wavelength:.002,microWavelength:.00013,amplitude:.000018},allowed:['color','roughness','clearcoat','wavelength','microWavelength','amplitude','rotation','mapping','seed','mask']},
 polished_metal:{when:'Clean polished bare metal with restrained microscopic structure.',not:'Chrome paint, coarse casting or a dirt layer.',properties:{substrate:'metal',finish:'polished'},defaults:{color:'#c2c5c8',roughness:.12,metalness:1,wavelength:.001,microWavelength:.00004,amplitude:.000002},allowed:['color','roughness','metalness','wavelength','microWavelength','amplitude','rotation','mapping','seed','mask']},
 plain_glass:{when:'Clean plain dielectric glass with scalar transmission and IOR.',not:'Dirty/frosted glass or coloured opaque paint.',properties:{substrate:'glass',finish:'polished'},defaults:{color:'#f4f8fa',roughness:.045,transmission:1,ior:1.5,thickness:.01},allowed:['color','roughness','transmission','ior','thickness','rotation','mapping','mask']}
};
const parameterSchema={
 transmission:{type:'number',minimum:0,maximum:1,description:'Fraction of dielectric transmission; independent of alpha opacity.'},
 ior:{type:'number',minimum:1,maximum:3,description:'Index of refraction; ordinary glass is 1.5.'},
 thickness:{type:'number',minimum:0,maximum:100,description:'Optical volume distance in object-local metres, NOT inferred mesh thickness. Use 0 for a thin sheet or measured crystal thickness (e.g. 0.0013). Legacy default is 0.01 m.'},
 color:{type:'string',pattern:'^#(?:[a-fA-F0-9]{3}|[a-fA-F0-9]{6})$',description:'Dielectric paint/rubber/composite colour or bare-metal reflectance colour.'},
 roughness:{type:'number',minimum:0,maximum:1},metalness:{type:'number',minimum:0,maximum:1,description:'Bare metal only; paint/rubber/composite/glass stay dielectric.'},clearcoat:{type:'number',minimum:0,maximum:1},
 wavelength:{type:'number',exclusiveMinimum:0,description:'Coarse surface wavelength: metres in object/world/frame, UV units in uv, normalised units in generated.'},
 microWavelength:{type:'number',exclusiveMinimum:0,description:'Independent micro roughness/height wavelength, smaller than wavelength; same mapping units.'},
 amplitude:{type:'number',minimum:0,maximum:.05,description:'Bump height in metres; does not change geometry.'},
 direction:{type:'array',minItems:3,maxItems:3,items:{type:'number'},description:'Brush/roll mark direction in mapping space; profile varies perpendicular to it in the mapping XY plane. Align the mapping plane with the target surface normal using rotation or frame; do not point the sampling axis through a flat face.'},
 rotation:{type:'array',minItems:3,maxItems:3,items:{type:'number'},description:'Pattern X then Y then Z rotation in radians; sampled with inverse rotation.'},
 mapping:{type:'object',additionalProperties:false,properties:{space:{enum:['object','world','frame','uv','generated']},origin:{type:'array',minItems:3,maxItems:3,items:{type:'number'}},rotation:{type:'array',minItems:3,maxItems:3,items:{type:'number'}},scale:{type:'array',minItems:3,maxItems:3,items:{type:'number',exclusiveMinimum:0}},frame:{type:'object',additionalProperties:false,required:['origin','tangent','bitangent','normal'],properties:Object.fromEntries(['origin','tangent','bitangent','normal'].map(k=>[k,{type:'array',minItems:3,maxItems:3,items:{type:'number'}}]))}},required:['space']},
 seed:{type:'integer',minimum:0,maximum:1000000},
 mask:{oneOf:[{type:'number',minimum:0,maximum:1},{type:'object',additionalProperties:false,required:['signal'],properties:{signal:{type:'string'},min:{type:'number',minimum:0,maximum:1},max:{type:'number',minimum:0,maximum:1},invert:{type:'boolean'}}}],description:'Mask for named finish layer, default 1. References a named signal in the expanded editable graph; no implicit wear.'}
};
export function surfaceRecipes(query){
 if(query!==undefined&&typeof query!=='string')fail('query','expected search string');let q=(query||'').toLowerCase().trim();const aliases={ground:'brushed_metal',grinding:'brushed_metal',machined:'brushed_metal',磨削:'brushed_metal',拉丝:'brushed_metal',喷漆:'sprayed_paint',喷涂:'sprayed_paint',铸造:'cast_metal',橡胶:'rubber',编织:'fiber_weave',碳纤维:'fiber_weave',轧制:'rolled_metal',抛光:'polished_metal',玻璃:'plain_glass'};q=aliases[q]||q;
 return SURFACE_RECIPE_IDS.filter(name=>!q||[name,definitions[name].when,definitions[name].not,...Object.values(definitions[name].properties)].join(' ').toLowerCase().includes(q)).map(name=>{
  const d=definitions[name];return {id:name,when:d.when,not:d.not,properties:{...d.properties,process:name,state:'clean'},params:{type:'object',additionalProperties:false,properties:Object.fromEntries(d.allowed.map(k=>[k,{...parameterSchema[k],...(d.defaults[k]!==undefined?{default:copy(d.defaults[k])}:{})}]))},example:{recipe:name,params:{color:d.defaults.color,mapping:{space:'object'}}},editExample:name==='sprayed_paint'?{layer:'finish',mask:0,meaning:'Explicitly expose the named metal substrate; set coating mask to the same value. Default masks remain 1.'}:{layer:'finish',mask:1,meaning:'Named editable finish layer; the author may supply a scalar or named signal mask.'},editExample:name==='sprayed_paint'?{layer:'finish',mask:0,meaning:'Explicitly expose named substrate; use the same mask on coating. Defaults remain 1.'}:{layer:'finish',mask:1},semantics:{mapping:'object local metres (object scaling stretches world texture); world/frame world metres; uv UV units; generated normalised 0..1. scale is dimensionless stretch.',layers:'Named finish layer mask defaults to 1; only declared channels mix in order. Height composes masked bump before base geometry normals.',clean:'Subtle colour variation, independent coarse/micro signals; no default rust, mud or substrate exposure.'}};
 });
}
const colorPair=(hex,amount)=>{
 const h=hex.slice(1),full=h.length===3?h.split('').map(c=>c+c).join(''):h,values=[0,2,4].map(i=>parseInt(full.slice(i,i+2),16));
 const tint=delta=>'#'+values.map(v=>Math.max(0,Math.min(255,Math.round(v+delta))).toString(16).padStart(2,'0')).join('');return [tint(-amount),tint(amount)];
};
export function createSurfaceRecipe(recipe,params={}){
 if(!SURFACE_RECIPE_IDS.includes(recipe))fail('recipe','expected '+SURFACE_RECIPE_IDS.join('/'));if(!record(params))fail('params','expected object');const d=definitions[recipe];
 for(const key of Object.keys(params))if(!d.allowed.includes(key))fail('params.'+key,'unsupported field for '+recipe);
 const p={...copy(d.defaults),...copy(params)};
 for(const key of ['roughness','metalness','clearcoat','transmission'])if(p[key]!==undefined&&(typeof p[key]!=='number'||!Number.isFinite(p[key])||p[key]<0||p[key]>1))fail('params.'+key,'expected number 0..1');
 for(const key of ['wavelength','microWavelength'])if(p[key]!==undefined&&(typeof p[key]!=='number'||!Number.isFinite(p[key])||p[key]<=0))fail('params.'+key,'expected positive number');
 if(p.microWavelength!==undefined&&p.microWavelength>=p.wavelength)fail('params.microWavelength','expected smaller than wavelength');
 if(typeof p.color!=='string'||!/^#(?:[a-f0-9]{3}|[a-f0-9]{6})$/i.test(p.color))fail('params.color','expected #rgb or #rrggbb');
 if(p.amplitude!==undefined&&(typeof p.amplitude!=='number'||!Number.isFinite(p.amplitude)||p.amplitude<0||p.amplitude>.05))fail('params.amplitude','expected number 0..0.05');
 if(p.seed!==undefined&&(!Number.isSafeInteger(p.seed)||p.seed<0||p.seed>1000000))fail('params.seed','expected integer 0..1000000');
 for(const key of ['direction','rotation'])if(p[key]!==undefined&&(!Array.isArray(p[key])||p[key].length!==3||!p[key].every(n=>typeof n==='number'&&Number.isFinite(n))))fail('params.'+key,'expected three finite numbers');
 if(p.direction&&Math.hypot(...p.direction)===0)fail('params.direction','expected nonzero direction');
 if(params.rotation!==undefined&&params.mapping?.rotation!==undefined)fail('params.rotation','set rotation once, directly or in mapping');
 if(params.mapping!==undefined)validateSurfaceMapping(params.mapping,'params.mapping');
  const mapping={...(p.mapping||{space:'object'}),...(p.rotation?{rotation:p.rotation}:{})};validateSurfaceMapping(mapping,'params.mapping');
 const properties={...d.properties,process:recipe,state:'clean'},surface={version:1,mapping,signals:{},layers:[]},spec={color:colorPair(p.color,0)[0],roughness:p.roughness,metalness:0,properties,surface};
 if(recipe==='plain_glass'){
  spec.transmission=p.transmission;spec.ior=p.ior;spec.thickness=p.thickness;spec.transparent=true;
  surface.layers.push({id:'finish',mask:p.mask??1,color:spec.color,roughness:p.roughness,metalness:0});
 }else{
  const seed=p.seed??0,microSeed=(seed+17)%1000001;
  surface.signals.grain={type:recipe==='cast_metal'?'voronoi':'noise',wavelength:p.wavelength,seed,...(recipe==='cast_metal'?{}:{detail:2})};
  surface.signals.microRoughness={type:'noise',wavelength:p.microWavelength,detail:2,seed:microSeed};
  surface.signals.microHeight={type:'noise',wavelength:p.microWavelength*.67,detail:2,seed:(seed+31)%1000001};
  surface.signals.surfaceRoughness={type:'mix',a:'grain',b:'microRoughness',factor:.7};
  surface.signals.surfaceHeight={type:'mix',a:'grain',b:'microHeight',factor:.35};
  let colorSignal='grain',roughSignal='surfaceRoughness',heightSignal='surfaceHeight';
  if(['brushed_metal','rolled_metal'].includes(recipe)){
   const dir=p.direction,len=Math.hypot(...dir),n=dir.map(v=>v/len),across=Math.abs(n[2])<.99?[-n[1],n[0],0]:[0,-n[2],n[1]];
   surface.signals.fineBrush={type:'wave',wavelength:p.microWavelength,direction:across,profile:'sine',seed:microSeed};
   surface.signals.brushHeight={type:'mix',a:'fineBrush',b:'microHeight',factor:.22};heightSignal='brushHeight';
   surface.signals.brush={type:'wave',wavelength:p.wavelength,direction:across,profile:'sine',seed};surface.signals.brushRoughness={type:'mix',a:'brush',b:'microRoughness',factor:.22};roughSignal='brushRoughness';
  }
  if(recipe==='fiber_weave'){
    const dir=[1,0,0],across=[0,1,0];
   surface.signals.warp={type:'wave',wavelength:p.wavelength,direction:dir,profile:'sine',seed};surface.signals.weft={type:'wave',wavelength:p.wavelength,direction:across,profile:'sine',seed:(seed+1)%1000001};
   surface.signals.interlace={type:'weave',wavelength:p.wavelength,ratio:.5,seed};surface.signals.fiberTone={type:'mix',a:'warp',b:'weft',factor:{signal:'interlace'}};surface.signals.fiberRoughness={type:'mix',a:'fiberTone',b:'microRoughness',factor:.12};surface.signals.fiberHeight={type:'mix',a:'interlace',b:'microHeight',factor:.16};
   colorSignal='fiberTone';roughSignal='fiberRoughness';heightSignal='fiberHeight';
  }
  if(d.properties.substrate==='metal'&&d.properties.finish!=='painted')spec.metalness=p.metalness;
  const[a,b]=colorPair(p.color,recipe==='fiber_weave'?3:1),finish={id:'finish',mask:p.mask??1,color:{a,b,signal:colorSignal},roughness:{min:clamp(p.roughness-.025),max:clamp(p.roughness+.025),signal:roughSignal},metalness:spec.metalness,height:{signal:heightSignal,amplitude:p.amplitude,midlevel:.5}};
  if(recipe==='sprayed_paint')surface.layers.push({id:'substrate',mask:1,color:'#96999c',metalness:1,roughness:.46});
  surface.layers.push(finish);
  if(p.clearcoat!==undefined){spec.clearcoat=0;spec.clearcoatRoughness=0;surface.layers.push({id:'coating',mask:p.mask??1,clearcoat:p.clearcoat,clearcoatRoughness:Math.min(.2,p.roughness)});}
 }
 if(p.mask!==undefined){const refs=[];validateSurfaceMask(p.mask,'params.mask',refs);for(const r of refs)if(!surface.signals[r.name])fail('params.mask.signal','missing recipe signal '+r.name);}
 return validateMaterialSpec(spec);
}
