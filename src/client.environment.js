import * as THREE from './vendor/three.js';

// One linear-radiance environment per studio; captures borrow it explicitly.
// A smooth 3-D directional function has no latitude branches or pole seams.
export const STUDIO_ENVIRONMENT_ID = 'studio-radiance-v3';
export const ENVIRONMENT_SIZE = Object.freeze([256, 128]);
const BOXES = [
  {direction: new THREE.Vector3(-.85,.85,.8).normalize(), spread:.46, strength:1.10},
  {direction: new THREE.Vector3(1,.55,.5).normalize(), spread:.58, strength:.65},
  {direction: new THREE.Vector3(.1,1,-.8).normalize(), spread:.63, strength:.42},
];
export function studioRadiance(direction) {
  const d = new THREE.Vector3(...direction).normalize();
  const t = (d.y+1)*.5, sky = t*t*(3-2*t);
  let value = .045+.36*sky;
  for (const box of BOXES) value += box.strength*Math.exp((d.dot(box.direction)-1)/(box.spread*box.spread));
  return [value,value,value];
}
export function environmentPixels() {
  const [width,height] = ENVIRONMENT_SIZE, data = new Float32Array(width*height*4);
  for (let y=0;y<height;y++) {
    // equirectUv.v = asin(direction.y)/PI+.5; DataTexture.flipY=false.
    // First data row is the south pole, not the north pole.
    const elevation=((y+.5)/height-.5)*Math.PI;
    for(let x=0;x<width;x++) {
      const azimuth=((x+.5)/width-.5)*Math.PI*2;
      const color=studioRadiance([Math.cos(elevation)*Math.cos(azimuth),Math.sin(elevation),Math.cos(elevation)*Math.sin(azimuth)]);
      data.set([...color,1],(y*width+x)*4);
    }
  }
  return data;
}
export function createStudioEnvironment(renderer) {
  if(!renderer?.isWebGLRenderer)throw new TypeError('Studio environment requires WebGLRenderer');
  const started=performance.now(),[width,height]=ENVIRONMENT_SIZE;
  const sourceTexture=new THREE.DataTexture(environmentPixels(),width,height,THREE.RGBAFormat,THREE.FloatType);
  sourceTexture.name=STUDIO_ENVIRONMENT_ID;sourceTexture.colorSpace=THREE.NoColorSpace;
  sourceTexture.wrapS=THREE.RepeatWrapping;sourceTexture.wrapT=THREE.ClampToEdgeWrapping;
  sourceTexture.minFilter=sourceTexture.magFilter=THREE.LinearFilter;sourceTexture.needsUpdate=true;
  const saved={target:renderer.getRenderTarget(),face:renderer.getActiveCubeFace(),level:renderer.getActiveMipmapLevel(),
    viewport:renderer.getViewport(new THREE.Vector4()),scissor:renderer.getScissor(new THREE.Vector4()),scissorTest:renderer.getScissorTest(),
    clear:renderer.getClearColor(new THREE.Color()),alpha:renderer.getClearAlpha(),tone:renderer.toneMapping,exposure:renderer.toneMappingExposure,autoClear:renderer.autoClear};
  let generator,target;
  try{generator=new THREE.PMREMGenerator(renderer);target=generator.fromEquirectangular(sourceTexture);}catch(error){sourceTexture.dispose();throw error;}
  finally{generator?.dispose();renderer.setRenderTarget(saved.target,saved.face,saved.level);renderer.setViewport(saved.viewport);renderer.setScissor(saved.scissor);renderer.setScissorTest(saved.scissorTest);renderer.setClearColor(saved.clear,saved.alpha);renderer.toneMapping=saved.tone;renderer.toneMappingExposure=saved.exposure;renderer.autoClear=saved.autoClear;}
  let disposed=false;
  return {source:STUDIO_ENVIRONMENT_ID,texture:target.texture,sourceTexture,
    textureWidth:target.width,textureHeight:target.height,estimatedBytes:target.width*target.height*8+width*height*16,
    buildMs:+(performance.now()-started).toFixed(2),input:{width,height,type:'FloatType',colorSpace:'linear',verticalOrder:'south-to-north'},
    dispose(){if(disposed)return;disposed=true;target.dispose();sourceTexture.dispose();}};
}
