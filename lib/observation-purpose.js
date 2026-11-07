import {OBSERVATION_MODES,DISPLAY_MODES} from './observation-stage.js';

// Semantic observation planning. The renderer has no job guessing a question
// from colours, asset names, or whether another image was taken previously.
export const CAPTURE_PURPOSES=Object.freeze(['shape','topology','appearance']);
export const PURPOSE_DISPLAY_MODES=Object.freeze({shape:'outline',topology:'surface_wireframe',appearance:'normal'});
const modes=new Set(OBSERVATION_MODES),displays=new Set(DISPLAY_MODES);
const present=value=>value!==undefined&&value!==null;
const fail=(message,code='invalid_capture')=>Object.assign(new Error(message),{code});

/**
 * One policy for public capture, evidence normalization and Client rendering.
 * requireSelection applies to public business entrypoints; private/legacy
 * renderer calls can retain their documented material-view fallback.
 */
export function resolveCaptureSelection(input={}, {requireSelection=false,defaultPurpose=null}={}) {
  const mode=input.mode??'material',requestedPurpose=input.purpose??null,explicitDisplay=present(input.displayMode);
  if(!modes.has(mode))throw fail('未知观察通道 mode: '+String(mode));
  if(requestedPurpose!==null&&!CAPTURE_PURPOSES.includes(requestedPurpose))throw fail('purpose 需 shape/topology/appearance');
  if(defaultPurpose!==null&&!CAPTURE_PURPOSES.includes(defaultPurpose))throw fail('无效的上下文观察用途');
  let displayMode,source;
  if(explicitDisplay){displayMode=input.displayMode;source='display-mode';}
  else if(requestedPurpose!==null){displayMode=PURPOSE_DISPLAY_MODES[requestedPurpose];source='purpose';}
  else if(present(input.mode)&&mode!=='material'){displayMode='normal';source='channel';}
  else if(defaultPurpose!==null){displayMode=PURPOSE_DISPLAY_MODES[defaultPurpose];source='context';}
  else if(requireSelection){
    throw Object.assign(fail('截图前请选择观察用途：purpose:"shape"（形体/部件描边）、"topology"（三角面线框）或"appearance"（材质/玻璃）；也可显式指定 displayMode 或诊断 mode。未启动渲染。','capture_purpose_required'),
      {detail:{field:'purpose',choices:CAPTURE_PURPOSES.map(purpose=>({purpose,displayMode:PURPOSE_DISPLAY_MODES[purpose]}))}});
  }else{displayMode='normal';source='legacy-default';}
  if(!displays.has(displayMode))throw fail('displayMode 需 normal/surface_wireframe/outline');
  const purpose=displayMode==='outline'?'shape':displayMode==='surface_wireframe'?'topology':mode==='material'?'appearance':'channel';
  return {schema:'dsh-modeler.observation-selection',schemaVersion:1,purpose,requestedPurpose,mode,displayMode,source,
    explicitOverride:requestedPurpose!==null&&explicitDisplay&&displayMode!==PURPOSE_DISPLAY_MODES[requestedPurpose]};
}

const topologyFeatures=new Set(['subdivide','subdivision','triangulate','decimate','remesh','dissolve','merge','split']);
export function purposeForEdit(args={}) {
  if(['material_finish','material_author','material_preview','material_bake'].includes(args.op)||args.feature?.type==='material')return 'appearance';
  if(topologyFeatures.has(args.feature?.type))return 'topology';
  if(args.material&&!['source','sourceParams','position','rotation','scale','feature','visible'].some(key=>args[key]!==undefined))return 'appearance';
  if(args.operations?.length&&args.operations.every(op=>op.op==='material'||op.op==='update'&&op.material&&!['position','rotation','scale','recipe','params','visible'].some(key=>op[key]!==undefined)))return 'appearance';
  return 'shape';
}

/** Fill missing semantic context BEFORE an explicitly requested edit capture. */
export function observationForEdit(args={},observe={}) {
  const purpose=purposeForEdit(args);
  const selection=resolveCaptureSelection(observe,{defaultPurpose:purpose});
  // Only an unselected observation inherits the operation context. An explicit
  // purpose, displayMode or diagnostic channel always wins and is never rewritten.
  return selection.source==='context'?{...observe,purpose}:observe;
}

/** A single optional, version-bound capture request for the edit's real goal. */
export function editObservationRequest(receipt,focusId,args={}) {
  const purpose=purposeForEdit(args);
  return {tool:'modeler_capture',args:{purpose,expectedHash:receipt.contentHash,...(focusId?{isolate:focusId}:{})},when:'Optional observation of this edit; an explicit purpose or display mode overrides the operation context.'};
}
