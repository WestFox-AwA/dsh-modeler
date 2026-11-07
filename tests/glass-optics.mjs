import assert from 'node:assert/strict';
import {createRecipeMaterial,createFinishSpec,prepareMaterialIntents} from '../src/host/material-intent.js';
import {createSurfaceRecipe,surfaceRecipes} from '../src/host/material-recipes.js';
import {material} from '../src/client.render.js';
import {getModelerGuide,MODELER_GUIDE_PROMPT} from '../src/host/guide-system.js';
const tests=[];const test=(name,fn)=>{try{fn();tests.push({name,passed:true});}catch(e){tests.push({name,passed:false,error:e.stack});}};
test('glass recipe exposes optical distance separately from object geometry',()=>{
 const description=surfaceRecipes('plain_glass')[0].params.properties;
 assert.equal(description.thickness.default,.01);assert(description.thickness.description.includes('NOT inferred mesh thickness'));assert(description.transmission&&description.ior);
 const spec=createRecipeMaterial('plain_glass',{thickness:.0013,ior:1.76,transmission:.98}).spec;
 assert.equal(spec.thickness,.0013);assert.equal(spec.ior,1.76);assert.equal(spec.transmission,.98);assert.equal(spec.metalness,0);
 const rendered=material({id:'crystal',material:spec});assert(rendered.isMeshPhysicalMaterial);assert.equal(rendered.thickness,.0013);assert.equal(rendered.ior,1.76);assert.equal(rendered.transmission,.98);rendered.dispose();
});
test('thin-sheet glass permits zero thickness and parameters fail before backend work',()=>{
 assert.equal(createRecipeMaterial('plain_glass',{thickness:0}).spec.thickness,0);
 for(const params of [{thickness:-.001},{thickness:Infinity},{ior:.9},{ior:3.1},{transmission:-1},{transmission:1.1}])assert.throws(()=>createRecipeMaterial('plain_glass',params));
 assert.throws(()=>createRecipeMaterial('sprayed_paint',{thickness:.001}));
});
test('legacy glass defaults and material-role hashes do not silently change',()=>{
 for(const recipeVersion of [2,3]){const spec=createFinishSpec('plain_glass',{}, {recipeVersion});assert.equal(spec.transmission,1);assert.equal(spec.ior,1.5);assert.equal(spec.thickness,.01);}
 const doc={version:1,meta:{},objects:[{id:'crystal',material:{finish:{version:1,role:'watch_glass',recipe:'plain_glass',params:{color:'#eef6ff'},recipeVersion:3}}}]};
 prepareMaterialIntents(doc);const baseline=JSON.stringify(doc);prepareMaterialIntents(doc);assert.equal(JSON.stringify(doc),baseline);
});
test('shape mode selection is visible before loading an optional exploration guide',()=>{
 assert(MODELER_GUIDE_PROMPT.includes('shape→outline'));assert(MODELER_GUIDE_PROMPT.includes('topology→surface_wireframe'));assert(MODELER_GUIDE_PROMPT.includes('appearance→normal'));assert(MODELER_GUIDE_PROMPT.includes('explicit displayMode overrides'));
 assert(MODELER_GUIDE_PROMPT.includes('no mandatory triple'));
 const main=JSON.stringify(getModelerGuide({id:'main'})),construct=JSON.stringify(getModelerGuide({id:'construct'}));
 for(const text of [main,construct]){assert(text.includes('outline'));assert(text.includes('surface_wireframe'));}
 assert(construct.includes('Choose the mode for the question'));
});
console.log(JSON.stringify({summary:{tests:tests.length,passed:tests.filter(t=>t.passed).length,failed:tests.filter(t=>!t.passed).length},tests},null,2));if(tests.some(t=>!t.passed))process.exitCode=1;
