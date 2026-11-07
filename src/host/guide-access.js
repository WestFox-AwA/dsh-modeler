// Pure adapter around the injected guide facade. lib/guide-system.js owns the
// guide content; routing only forwards ids and never reads the asset store.
// A missing facade keeps exact legacy help working for direct module callers.
const MAX_GUIDE_ID=80;
function normalizedId(value){const text=typeof value==='string'&&value.trim()?value.trim():'main';return text.slice(0,MAX_GUIDE_ID)||'main';}
export function resolveGuide(facade,id='main'){
 const requested=normalizedId(id);
 if(!facade||typeof facade.get!=='function')return {available:false,requestedId:requested};
 try{return {available:true,requestedId:requested,value:facade.get(requested)};}catch(error){return {available:true,requestedId:requested,error};}
}
export function guideReference(facade,id='main'){
 if(!facade||typeof facade.ref!=='function')return null;
 try{return facade.ref(normalizedId(id));}catch{return null;}
}
export function guideEnvelope(facade,id='main'){
 const {available,requestedId,value,error}=resolveGuide(facade,id);
 if(!available)return null;
 if(error)return {ok:false,code:error.code||'unknown_guide',error:String(error.message||error),requestedId,recovery:guideReference(facade,'main'),guideRef:guideReference(facade,'main'),next:{action:'guide',args:{id:'main'}}};
 if(value&&value.ok===false)return {...value,requestedId,guideRef:guideReference(facade,'main')};
 return {...value,guideId:requestedId,guideRef:guideReference(facade,requestedId)};
}
