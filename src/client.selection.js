import * as THREE from './vendor/three.js';
// Selection is a versioned observation, never an independent editable mesh.
export class SelectionOverlay {
 constructor(scene){this.scene=scene;this.group=new THREE.Group();this.group.name='Modeler selection';this.group.renderOrder=1001;scene.add(this.group);}
 clear(){for(const o of [...this.group.children]){o.removeFromParent();o.geometry?.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m?.dispose();}this.value=null;}
 set(value,snapshot){this.clear();if(!value)return false;if(value.assetId!==snapshot.assetId||value.contentHash!==snapshot.contentHash)throw Error('选区属于另一版本，请重新定位');if(value.space!=='world')throw Error('Selection overlay requires world geometry');const total=['points','segments','triangles'].reduce((n,k)=>n+(value[k]?.length||0),0);if(total>49152)throw Error('Selection overlay byte budget exceeded');
  const add=(data,kind)=>{if(!Array.isArray(data)||!data.length)return;if(data.some(x=>!Number.isFinite(x)))throw Error('Invalid overlay coordinates');const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(data,3));let object;if(kind==='triangles')object=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:'#31dbc8',transparent:true,opacity:.44,side:THREE.DoubleSide,depthTest:false,depthWrite:false}));else if(kind==='segments')object=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:'#ffe18b',depthTest:false,transparent:true,opacity:.95}));else object=new THREE.Points(geometry,new THREE.PointsMaterial({color:'#ffe18b',size:7,sizeAttenuation:false,depthTest:false}));object.renderOrder=1001;this.group.add(object);};
  add(value.triangles,'triangles');add(value.segments,'segments');add(value.points,'points');if(value.frame?.worldMatrix){const m=new THREE.Matrix4().fromArray(value.frame.worldMatrix),origin=new THREE.Vector3().setFromMatrixPosition(m),length=value.frame.displaySize||.12;for(let k=0;k<3;k++){const direction=new THREE.Vector3().fromArray(m.elements,k*4).normalize(),geometry=new THREE.BufferGeometry().setFromPoints([origin,origin.clone().addScaledVector(direction,length)]),material=new THREE.LineBasicMaterial({color:[0xff7272,0x8cdd6b,0x6baeff][k],depthTest:false});this.group.add(new THREE.LineSegments(geometry,material));}}
  this.value=value;return true;
 }
 bounds(){const box=new THREE.Box3().setFromObject(this.group);return box.isEmpty()?null:{min:box.min.toArray(),max:box.max.toArray()};}
 dispose(){this.clear();this.group.removeFromParent();}
}
