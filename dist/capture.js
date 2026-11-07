(()=>{async function Zh(n){if(!Array.isArray(n?.geometryPayloads)&&!Object.values(n?.appearanceAssets||{}).some(r=>r.codec==="gzip-rgba"))return n;if(n.geometryPayloads??=[],n.geometryPayloads.length>1024||typeof DecompressionStream!="function")throw Error("Compressed model geometry is not supported by this browser");let e=new Map,t=r=>{for(let s of r||[])e.set(s.id,s),s.parts&&t(s.parts)};t(n.doc?.objects);let i=0;for(let r of n.geometryPayloads){let s=e.get(r.id);if(r.codec!=="gzip-json"||!s?.recipe?.params||s.recipe.params.mesh!==null||typeof r.data!="string")throw Error("Invalid compressed model payload");let a=Uint8Array.from(atob(r.data),d=>d.charCodeAt(0)),o=new Blob([a]).stream().pipeThrough(new DecompressionStream("gzip")),l=o.getReader(),c=[],h=0;try{for(;;){let{done:d,value:p}=await l.read();if(d)break;if(h+=p.length,i+=p.length,h>128*1024*1024||i>384*1024*1024)throw Error("Model display geometry exceeds its decoded budget");c.push(p)}}finally{l.releaseLock()}let u=new Uint8Array(h),f=0;for(let d of c)u.set(d,f),f+=d.length;s.recipe.params.mesh=JSON.parse(new TextDecoder().decode(u)),typeof requestAnimationFrame=="function"&&await new Promise(d=>requestAnimationFrame(d))}for(let r of Object.values(n.appearanceAssets||{})){if(r.codec==="png"){if(typeof createImageBitmap!="function")throw Error("This browser cannot decode transported material images");let h=Uint8Array.from(atob(r.data),f=>f.charCodeAt(0)),u=await createImageBitmap(new Blob([h],{type:"image/png"}));try{let f=u.width,d=u.height;if(f!==r.width||d!==r.height)throw Error("Material image dimensions do not match its descriptor");let p=typeof OffscreenCanvas=="function"?new OffscreenCanvas(f,d):Object.assign(document.createElement("canvas"),{width:f,height:d}),y=p.getContext("2d",{willReadFrequently:!0});if(!y)throw Error("No 2D context for material images");y.drawImage(u,0,0);let g=y.getImageData(0,0,f,d).data;r.data=new Uint8Array(g.buffer.slice(0)),delete r.codec}finally{u.close?.()}continue}if(r.codec!=="gzip-rgba")continue;let s=r.width*r.height*4;if(!Number.isSafeInteger(s)||s<4||s>2048*2048*4)throw Error("Invalid material image dimensions");let a=Uint8Array.from(atob(r.data),h=>h.charCodeAt(0)),o=new Blob([a]).stream().pipeThrough(new DecompressionStream("gzip")).getReader(),l=new Uint8Array(s),c=0;try{for(;;){let h=await o.read();if(h.done)break;if(c+h.value.length>s)throw Error("Material image exceeds decoded dimensions");l.set(h.value,c),c+=h.value.length}}finally{o.releaseLock()}if(c!==s)throw Error("Material image is incomplete");r.data=l,delete r.codec}return delete n.geometryPayloads,n}var Zi="160";var Qp=0,Jh=1,em=2;var Of=1,bi=2,ei=3,Qt=0,en=1,Rt=2;var mi=0,Cr=1,Kh=2,Qh=3,eu=4,tm=5,Ui=100,nm=101,im=102,tu=103,nu=104,rm=200,sm=201,om=202,am=203,Fl=204,zl=205,lm=206,cm=207,hm=208,um=209,fm=210,dm=211,pm=212,mm=213,gm=214,ym=0,xm=1,_m=2,Fo=3,vm=4,bm=5,Mm=6,wm=7,Ff=0,Sm=1,Em=2,gi=0,Am=1,Tm=2,Rm=3,Cc=4,Cm=5,Im=6;var zf=300,Dr=301,Nr=302,Bl=303,kl=304,fa=306,Hi=1e3,un=1001,Hl=1002,vt=1003,iu=1004;var tl=1005;var Ct=1006,Pm=1007;var Vi=1008;var bn=1009,Lm=1010,Dm=1011,Ic=1012,Bf=1013,pi=1014,kn=1015,Gi=1016,kf=1017,Hf=1018,zi=1020,Nm=1021,It=1023,Um=1024,Om=1025,Bi=1026,Ur=1027,Fm=1028,Vf=1029,zm=1030,Gf=1031,Wf=1033,nl=33776,il=33777,rl=33778,sl=33779,ru=35840,su=35841,ou=35842,au=35843,Xf=36196,lu=37492,cu=37496,hu=37808,uu=37809,fu=37810,du=37811,pu=37812,mu=37813,gu=37814,yu=37815,xu=37816,_u=37817,vu=37818,bu=37819,Mu=37820,wu=37821,ol=36492,Su=36494,Eu=36495,Bm=36283,Au=36284,Tu=36285,Ru=36286;var zo=2300,Bo=2301,al=2302,Cu=2400,Iu=2401,Pu=2402;var qf=3e3,ki=3001,km=3200,Hm=3201,Pc=0,Vm=1,wt="",mt="srgb",ni="srgb-linear",Lc="display-p3",da="display-p3-linear",ko="linear",at="srgb",Ho="rec709",Vo="p3";var cr=7680;var Lu=519,Gm=512,Wm=513,Xm=514,Yf=515,qm=516,Ym=517,$m=518,jm=519,Du=35044;var Nu="300 es",Vl=1035,ti=2e3,Go=2001,yi=class{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});let i=this._listeners;i[e]===void 0&&(i[e]=[]),i[e].indexOf(t)===-1&&i[e].push(t)}hasEventListener(e,t){if(this._listeners===void 0)return!1;let i=this._listeners;return i[e]!==void 0&&i[e].indexOf(t)!==-1}removeEventListener(e,t){if(this._listeners===void 0)return;let r=this._listeners[e];if(r!==void 0){let s=r.indexOf(t);s!==-1&&r.splice(s,1)}}dispatchEvent(e){if(this._listeners===void 0)return;let i=this._listeners[e.type];if(i!==void 0){e.target=this;let r=i.slice(0);for(let s=0,a=r.length;s<a;s++)r[s].call(this,e);e.target=null}}},Gt=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],Uu=1234567,Ir=Math.PI/180,Or=180/Math.PI;function Wr(){let n=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,i=Math.random()*4294967295|0;return(Gt[n&255]+Gt[n>>8&255]+Gt[n>>16&255]+Gt[n>>24&255]+"-"+Gt[e&255]+Gt[e>>8&255]+"-"+Gt[e>>16&15|64]+Gt[e>>24&255]+"-"+Gt[t&63|128]+Gt[t>>8&255]+"-"+Gt[t>>16&255]+Gt[t>>24&255]+Gt[i&255]+Gt[i>>8&255]+Gt[i>>16&255]+Gt[i>>24&255]).toLowerCase()}function Ot(n,e,t){return Math.max(e,Math.min(t,n))}function Dc(n,e){return(n%e+e)%e}function Zm(n,e,t,i,r){return i+(n-e)*(r-i)/(t-e)}function Jm(n,e,t){return n!==e?(t-n)/(e-n):0}function _s(n,e,t){return(1-t)*n+t*e}function Km(n,e,t,i){return _s(n,e,1-Math.exp(-t*i))}function Qm(n,e=1){return e-Math.abs(Dc(n,e*2)-e)}function e0(n,e,t){return n<=e?0:n>=t?1:(n=(n-e)/(t-e),n*n*(3-2*n))}function t0(n,e,t){return n<=e?0:n>=t?1:(n=(n-e)/(t-e),n*n*n*(n*(n*6-15)+10))}function n0(n,e){return n+Math.floor(Math.random()*(e-n+1))}function i0(n,e){return n+Math.random()*(e-n)}function r0(n){return n*(.5-Math.random())}function s0(n){n!==void 0&&(Uu=n);let e=Uu+=1831565813;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}function o0(n){return n*Ir}function a0(n){return n*Or}function Gl(n){return(n&n-1)===0&&n!==0}function l0(n){return Math.pow(2,Math.ceil(Math.log(n)/Math.LN2))}function Wo(n){return Math.pow(2,Math.floor(Math.log(n)/Math.LN2))}function c0(n,e,t,i,r){let s=Math.cos,a=Math.sin,o=s(t/2),l=a(t/2),c=s((e+i)/2),h=a((e+i)/2),u=s((e-i)/2),f=a((e-i)/2),d=s((i-e)/2),p=a((i-e)/2);switch(r){case"XYX":n.set(o*h,l*u,l*f,o*c);break;case"YZY":n.set(l*f,o*h,l*u,o*c);break;case"ZXZ":n.set(l*u,l*f,o*h,o*c);break;case"XZX":n.set(o*h,l*p,l*d,o*c);break;case"YXY":n.set(l*d,o*h,l*p,o*c);break;case"ZYZ":n.set(l*p,l*d,o*h,o*c);break;default:console.warn("THREE.MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+r)}}function Er(n,e){switch(e.constructor){case Float32Array:return n;case Uint32Array:return n/4294967295;case Uint16Array:return n/65535;case Uint8Array:return n/255;case Int32Array:return Math.max(n/2147483647,-1);case Int16Array:return Math.max(n/32767,-1);case Int8Array:return Math.max(n/127,-1);default:throw new Error("Invalid component type.")}}function Jt(n,e){switch(e.constructor){case Float32Array:return n;case Uint32Array:return Math.round(n*4294967295);case Uint16Array:return Math.round(n*65535);case Uint8Array:return Math.round(n*255);case Int32Array:return Math.round(n*2147483647);case Int16Array:return Math.round(n*32767);case Int8Array:return Math.round(n*127);default:throw new Error("Invalid component type.")}}var pa={DEG2RAD:Ir,RAD2DEG:Or,generateUUID:Wr,clamp:Ot,euclideanModulo:Dc,mapLinear:Zm,inverseLerp:Jm,lerp:_s,damp:Km,pingpong:Qm,smoothstep:e0,smootherstep:t0,randInt:n0,randFloat:i0,randFloatSpread:r0,seededRandom:s0,degToRad:o0,radToDeg:a0,isPowerOfTwo:Gl,ceilPowerOfTwo:l0,floorPowerOfTwo:Wo,setQuaternionFromProperEuler:c0,normalize:Jt,denormalize:Er},ce=class n{constructor(e=0,t=0){n.prototype.isVector2=!0,this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){let t=this.x,i=this.y,r=e.elements;return this.x=r[0]*t+r[3]*i+r[6],this.y=r[1]*t+r[4]*i+r[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=Math.max(e.x,Math.min(t.x,this.x)),this.y=Math.max(e.y,Math.min(t.y,this.y)),this}clampScalar(e,t){return this.x=Math.max(e,Math.min(t,this.x)),this.y=Math.max(e,Math.min(t,this.y)),this}clampLength(e,t){let i=this.length();return this.divideScalar(i||1).multiplyScalar(Math.max(e,Math.min(t,i)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let i=this.dot(e)/t;return Math.acos(Ot(i,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,i=this.y-e.y;return t*t+i*i}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){let i=Math.cos(t),r=Math.sin(t),s=this.x-e.x,a=this.y-e.y;return this.x=s*i-a*r+e.x,this.y=s*r+a*i+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}},Ve=class n{constructor(e,t,i,r,s,a,o,l,c){n.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,i,r,s,a,o,l,c)}set(e,t,i,r,s,a,o,l,c){let h=this.elements;return h[0]=e,h[1]=r,h[2]=o,h[3]=t,h[4]=s,h[5]=l,h[6]=i,h[7]=a,h[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){let t=this.elements,i=e.elements;return t[0]=i[0],t[1]=i[1],t[2]=i[2],t[3]=i[3],t[4]=i[4],t[5]=i[5],t[6]=i[6],t[7]=i[7],t[8]=i[8],this}extractBasis(e,t,i){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),i.setFromMatrix3Column(this,2),this}setFromMatrix4(e){let t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let i=e.elements,r=t.elements,s=this.elements,a=i[0],o=i[3],l=i[6],c=i[1],h=i[4],u=i[7],f=i[2],d=i[5],p=i[8],y=r[0],g=r[3],m=r[6],_=r[1],x=r[4],v=r[7],E=r[2],w=r[5],M=r[8];return s[0]=a*y+o*_+l*E,s[3]=a*g+o*x+l*w,s[6]=a*m+o*v+l*M,s[1]=c*y+h*_+u*E,s[4]=c*g+h*x+u*w,s[7]=c*m+h*v+u*M,s[2]=f*y+d*_+p*E,s[5]=f*g+d*x+p*w,s[8]=f*m+d*v+p*M,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){let e=this.elements,t=e[0],i=e[1],r=e[2],s=e[3],a=e[4],o=e[5],l=e[6],c=e[7],h=e[8];return t*a*h-t*o*c-i*s*h+i*o*l+r*s*c-r*a*l}invert(){let e=this.elements,t=e[0],i=e[1],r=e[2],s=e[3],a=e[4],o=e[5],l=e[6],c=e[7],h=e[8],u=h*a-o*c,f=o*l-h*s,d=c*s-a*l,p=t*u+i*f+r*d;if(p===0)return this.set(0,0,0,0,0,0,0,0,0);let y=1/p;return e[0]=u*y,e[1]=(r*c-h*i)*y,e[2]=(o*i-r*a)*y,e[3]=f*y,e[4]=(h*t-r*l)*y,e[5]=(r*s-o*t)*y,e[6]=d*y,e[7]=(i*l-c*t)*y,e[8]=(a*t-i*s)*y,this}transpose(){let e,t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){let t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,i,r,s,a,o){let l=Math.cos(s),c=Math.sin(s);return this.set(i*l,i*c,-i*(l*a+c*o)+a+e,-r*c,r*l,-r*(-c*a+l*o)+o+t,0,0,1),this}scale(e,t){return this.premultiply(ll.makeScale(e,t)),this}rotate(e){return this.premultiply(ll.makeRotation(-e)),this}translate(e,t){return this.premultiply(ll.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){let t=Math.cos(e),i=Math.sin(e);return this.set(t,-i,0,i,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){let t=this.elements,i=e.elements;for(let r=0;r<9;r++)if(t[r]!==i[r])return!1;return!0}fromArray(e,t=0){for(let i=0;i<9;i++)this.elements[i]=e[i+t];return this}toArray(e=[],t=0){let i=this.elements;return e[t]=i[0],e[t+1]=i[1],e[t+2]=i[2],e[t+3]=i[3],e[t+4]=i[4],e[t+5]=i[5],e[t+6]=i[6],e[t+7]=i[7],e[t+8]=i[8],e}clone(){return new this.constructor().fromArray(this.elements)}},ll=new Ve;function $f(n){for(let e=n.length-1;e>=0;--e)if(n[e]>=65535)return!0;return!1}function Xo(n){return document.createElementNS("http://www.w3.org/1999/xhtml",n)}function h0(){let n=Xo("canvas");return n.style.display="block",n}var Ou={};function vs(n){n in Ou||(Ou[n]=!0,console.warn(n))}var Fu=new Ve().set(.8224621,.177538,0,.0331941,.9668058,0,.0170827,.0723974,.9105199),zu=new Ve().set(1.2249401,-.2249404,0,-.0420569,1.0420571,0,-.0196376,-.0786361,1.0982735),ro={[ni]:{transfer:ko,primaries:Ho,toReference:n=>n,fromReference:n=>n},[mt]:{transfer:at,primaries:Ho,toReference:n=>n.convertSRGBToLinear(),fromReference:n=>n.convertLinearToSRGB()},[da]:{transfer:ko,primaries:Vo,toReference:n=>n.applyMatrix3(zu),fromReference:n=>n.applyMatrix3(Fu)},[Lc]:{transfer:at,primaries:Vo,toReference:n=>n.convertSRGBToLinear().applyMatrix3(zu),fromReference:n=>n.applyMatrix3(Fu).convertLinearToSRGB()}},u0=new Set([ni,da]),Qe={enabled:!0,_workingColorSpace:ni,get workingColorSpace(){return this._workingColorSpace},set workingColorSpace(n){if(!u0.has(n))throw new Error(`Unsupported working color space, "${n}".`);this._workingColorSpace=n},convert:function(n,e,t){if(this.enabled===!1||e===t||!e||!t)return n;let i=ro[e].toReference,r=ro[t].fromReference;return r(i(n))},fromWorkingColorSpace:function(n,e){return this.convert(n,this._workingColorSpace,e)},toWorkingColorSpace:function(n,e){return this.convert(n,e,this._workingColorSpace)},getPrimaries:function(n){return ro[n].primaries},getTransfer:function(n){return n===wt?ko:ro[n].transfer}};function Pr(n){return n<.04045?n*.0773993808:Math.pow(n*.9478672986+.0521327014,2.4)}function cl(n){return n<.0031308?n*12.92:1.055*Math.pow(n,.41666)-.055}var hr,qo=class{static getDataURL(e){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let t;if(e instanceof HTMLCanvasElement)t=e;else{hr===void 0&&(hr=Xo("canvas")),hr.width=e.width,hr.height=e.height;let i=hr.getContext("2d");e instanceof ImageData?i.putImageData(e,0,0):i.drawImage(e,0,0,e.width,e.height),t=hr}return t.width>2048||t.height>2048?(console.warn("THREE.ImageUtils.getDataURL: Image converted to jpg for performance reasons",e),t.toDataURL("image/jpeg",.6)):t.toDataURL("image/png")}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){let t=Xo("canvas");t.width=e.width,t.height=e.height;let i=t.getContext("2d");i.drawImage(e,0,0,e.width,e.height);let r=i.getImageData(0,0,e.width,e.height),s=r.data;for(let a=0;a<s.length;a++)s[a]=Pr(s[a]/255)*255;return i.putImageData(r,0,0),t}else if(e.data){let t=e.data.slice(0);for(let i=0;i<t.length;i++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[i]=Math.floor(Pr(t[i]/255)*255):t[i]=Pr(t[i]);return{data:t,width:e.width,height:e.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}},f0=0,Yo=class{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:f0++}),this.uuid=Wr(),this.data=e,this.version=0}set needsUpdate(e){e===!0&&this.version++}toJSON(e){let t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];let i={uuid:this.uuid,url:""},r=this.data;if(r!==null){let s;if(Array.isArray(r)){s=[];for(let a=0,o=r.length;a<o;a++)r[a].isDataTexture?s.push(hl(r[a].image)):s.push(hl(r[a]))}else s=hl(r);i.url=s}return t||(e.images[this.uuid]=i),i}};function hl(n){return typeof HTMLImageElement<"u"&&n instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&n instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&n instanceof ImageBitmap?qo.getDataURL(n):n.data?{data:Array.from(n.data),width:n.width,height:n.height,type:n.data.constructor.name}:(console.warn("THREE.Texture: Unable to serialize Texture."),{})}var d0=0,Mn=class n extends yi{constructor(e=n.DEFAULT_IMAGE,t=n.DEFAULT_MAPPING,i=un,r=un,s=Ct,a=Vi,o=It,l=bn,c=n.DEFAULT_ANISOTROPY,h=wt){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:d0++}),this.uuid=Wr(),this.name="",this.source=new Yo(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=i,this.wrapT=r,this.magFilter=s,this.minFilter=a,this.anisotropy=c,this.format=o,this.internalFormat=null,this.type=l,this.offset=new ce(0,0),this.repeat=new ce(1,1),this.center=new ce(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Ve,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,typeof h=="string"?this.colorSpace=h:(vs("THREE.Texture: Property .encoding has been replaced by .colorSpace."),this.colorSpace=h===ki?mt:wt),this.userData={},this.version=0,this.onUpdate=null,this.isRenderTargetTexture=!1,this.needsPMREMUpdate=!1}get image(){return this.source.data}set image(e=null){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}toJSON(e){let t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];let i={metadata:{version:4.6,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(i.userData=this.userData),t||(e.textures[this.uuid]=i),i}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==zf)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case Hi:e.x=e.x-Math.floor(e.x);break;case un:e.x=e.x<0?0:1;break;case Hl:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case Hi:e.y=e.y-Math.floor(e.y);break;case un:e.y=e.y<0?0:1;break;case Hl:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}get encoding(){return vs("THREE.Texture: Property .encoding has been replaced by .colorSpace."),this.colorSpace===mt?ki:qf}set encoding(e){vs("THREE.Texture: Property .encoding has been replaced by .colorSpace."),this.colorSpace=e===ki?mt:wt}};Mn.DEFAULT_IMAGE=null;Mn.DEFAULT_MAPPING=zf;Mn.DEFAULT_ANISOTROPY=1;var Ge=class n{constructor(e=0,t=0,i=0,r=1){n.prototype.isVector4=!0,this.x=e,this.y=t,this.z=i,this.w=r}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,i,r){return this.x=e,this.y=t,this.z=i,this.w=r,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){let t=this.x,i=this.y,r=this.z,s=this.w,a=e.elements;return this.x=a[0]*t+a[4]*i+a[8]*r+a[12]*s,this.y=a[1]*t+a[5]*i+a[9]*r+a[13]*s,this.z=a[2]*t+a[6]*i+a[10]*r+a[14]*s,this.w=a[3]*t+a[7]*i+a[11]*r+a[15]*s,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);let t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,i,r,s,l=e.elements,c=l[0],h=l[4],u=l[8],f=l[1],d=l[5],p=l[9],y=l[2],g=l[6],m=l[10];if(Math.abs(h-f)<.01&&Math.abs(u-y)<.01&&Math.abs(p-g)<.01){if(Math.abs(h+f)<.1&&Math.abs(u+y)<.1&&Math.abs(p+g)<.1&&Math.abs(c+d+m-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;let x=(c+1)/2,v=(d+1)/2,E=(m+1)/2,w=(h+f)/4,M=(u+y)/4,T=(p+g)/4;return x>v&&x>E?x<.01?(i=0,r=.707106781,s=.707106781):(i=Math.sqrt(x),r=w/i,s=M/i):v>E?v<.01?(i=.707106781,r=0,s=.707106781):(r=Math.sqrt(v),i=w/r,s=T/r):E<.01?(i=.707106781,r=.707106781,s=0):(s=Math.sqrt(E),i=M/s,r=T/s),this.set(i,r,s,t),this}let _=Math.sqrt((g-p)*(g-p)+(u-y)*(u-y)+(f-h)*(f-h));return Math.abs(_)<.001&&(_=1),this.x=(g-p)/_,this.y=(u-y)/_,this.z=(f-h)/_,this.w=Math.acos((c+d+m-1)/2),this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=Math.max(e.x,Math.min(t.x,this.x)),this.y=Math.max(e.y,Math.min(t.y,this.y)),this.z=Math.max(e.z,Math.min(t.z,this.z)),this.w=Math.max(e.w,Math.min(t.w,this.w)),this}clampScalar(e,t){return this.x=Math.max(e,Math.min(t,this.x)),this.y=Math.max(e,Math.min(t,this.y)),this.z=Math.max(e,Math.min(t,this.z)),this.w=Math.max(e,Math.min(t,this.w)),this}clampLength(e,t){let i=this.length();return this.divideScalar(i||1).multiplyScalar(Math.max(e,Math.min(t,i)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this.z=e.z+(t.z-e.z)*i,this.w=e.w+(t.w-e.w)*i,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}},Wl=class extends yi{constructor(e=1,t=1,i={}){super(),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=1,this.scissor=new Ge(0,0,e,t),this.scissorTest=!1,this.viewport=new Ge(0,0,e,t);let r={width:e,height:t,depth:1};i.encoding!==void 0&&(vs("THREE.WebGLRenderTarget: option.encoding has been replaced by option.colorSpace."),i.colorSpace=i.encoding===ki?mt:wt),i=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Ct,depthBuffer:!0,stencilBuffer:!1,depthTexture:null,samples:0},i),this.texture=new Mn(r,i.mapping,i.wrapS,i.wrapT,i.magFilter,i.minFilter,i.format,i.type,i.anisotropy,i.colorSpace),this.texture.isRenderTargetTexture=!0,this.texture.flipY=!1,this.texture.generateMipmaps=i.generateMipmaps,this.texture.internalFormat=i.internalFormat,this.depthBuffer=i.depthBuffer,this.stencilBuffer=i.stencilBuffer,this.depthTexture=i.depthTexture,this.samples=i.samples}setSize(e,t,i=1){(this.width!==e||this.height!==t||this.depth!==i)&&(this.width=e,this.height=t,this.depth=i,this.texture.image.width=e,this.texture.image.height=t,this.texture.image.depth=i,this.dispose()),this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.texture=e.texture.clone(),this.texture.isRenderTargetTexture=!0;let t=Object.assign({},e.texture.image);return this.texture.source=new Yo(t),this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}},fn=class extends Wl{constructor(e=1,t=1,i={}){super(e,t,i),this.isWebGLRenderTarget=!0}},$o=class extends Mn{constructor(e=null,t=1,i=1,r=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:i,depth:r},this.magFilter=vt,this.minFilter=vt,this.wrapR=un,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}};var Xl=class extends Mn{constructor(e=null,t=1,i=1,r=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:i,depth:r},this.magFilter=vt,this.minFilter=vt,this.wrapR=un,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}};var xi=class{constructor(e=0,t=0,i=0,r=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=i,this._w=r}static slerpFlat(e,t,i,r,s,a,o){let l=i[r+0],c=i[r+1],h=i[r+2],u=i[r+3],f=s[a+0],d=s[a+1],p=s[a+2],y=s[a+3];if(o===0){e[t+0]=l,e[t+1]=c,e[t+2]=h,e[t+3]=u;return}if(o===1){e[t+0]=f,e[t+1]=d,e[t+2]=p,e[t+3]=y;return}if(u!==y||l!==f||c!==d||h!==p){let g=1-o,m=l*f+c*d+h*p+u*y,_=m>=0?1:-1,x=1-m*m;if(x>Number.EPSILON){let E=Math.sqrt(x),w=Math.atan2(E,m*_);g=Math.sin(g*w)/E,o=Math.sin(o*w)/E}let v=o*_;if(l=l*g+f*v,c=c*g+d*v,h=h*g+p*v,u=u*g+y*v,g===1-o){let E=1/Math.sqrt(l*l+c*c+h*h+u*u);l*=E,c*=E,h*=E,u*=E}}e[t]=l,e[t+1]=c,e[t+2]=h,e[t+3]=u}static multiplyQuaternionsFlat(e,t,i,r,s,a){let o=i[r],l=i[r+1],c=i[r+2],h=i[r+3],u=s[a],f=s[a+1],d=s[a+2],p=s[a+3];return e[t]=o*p+h*u+l*d-c*f,e[t+1]=l*p+h*f+c*u-o*d,e[t+2]=c*p+h*d+o*f-l*u,e[t+3]=h*p-o*u-l*f-c*d,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,i,r){return this._x=e,this._y=t,this._z=i,this._w=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){let i=e._x,r=e._y,s=e._z,a=e._order,o=Math.cos,l=Math.sin,c=o(i/2),h=o(r/2),u=o(s/2),f=l(i/2),d=l(r/2),p=l(s/2);switch(a){case"XYZ":this._x=f*h*u+c*d*p,this._y=c*d*u-f*h*p,this._z=c*h*p+f*d*u,this._w=c*h*u-f*d*p;break;case"YXZ":this._x=f*h*u+c*d*p,this._y=c*d*u-f*h*p,this._z=c*h*p-f*d*u,this._w=c*h*u+f*d*p;break;case"ZXY":this._x=f*h*u-c*d*p,this._y=c*d*u+f*h*p,this._z=c*h*p+f*d*u,this._w=c*h*u-f*d*p;break;case"ZYX":this._x=f*h*u-c*d*p,this._y=c*d*u+f*h*p,this._z=c*h*p-f*d*u,this._w=c*h*u+f*d*p;break;case"YZX":this._x=f*h*u+c*d*p,this._y=c*d*u+f*h*p,this._z=c*h*p-f*d*u,this._w=c*h*u-f*d*p;break;case"XZY":this._x=f*h*u-c*d*p,this._y=c*d*u-f*h*p,this._z=c*h*p+f*d*u,this._w=c*h*u+f*d*p;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+a)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){let i=t/2,r=Math.sin(i);return this._x=e.x*r,this._y=e.y*r,this._z=e.z*r,this._w=Math.cos(i),this._onChangeCallback(),this}setFromRotationMatrix(e){let t=e.elements,i=t[0],r=t[4],s=t[8],a=t[1],o=t[5],l=t[9],c=t[2],h=t[6],u=t[10],f=i+o+u;if(f>0){let d=.5/Math.sqrt(f+1);this._w=.25/d,this._x=(h-l)*d,this._y=(s-c)*d,this._z=(a-r)*d}else if(i>o&&i>u){let d=2*Math.sqrt(1+i-o-u);this._w=(h-l)/d,this._x=.25*d,this._y=(r+a)/d,this._z=(s+c)/d}else if(o>u){let d=2*Math.sqrt(1+o-i-u);this._w=(s-c)/d,this._x=(r+a)/d,this._y=.25*d,this._z=(l+h)/d}else{let d=2*Math.sqrt(1+u-i-o);this._w=(a-r)/d,this._x=(s+c)/d,this._y=(l+h)/d,this._z=.25*d}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let i=e.dot(t)+1;return i<Number.EPSILON?(i=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=i):(this._x=0,this._y=-e.z,this._z=e.y,this._w=i)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=i),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(Ot(this.dot(e),-1,1)))}rotateTowards(e,t){let i=this.angleTo(e);if(i===0)return this;let r=Math.min(1,t/i);return this.slerp(e,r),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){let i=e._x,r=e._y,s=e._z,a=e._w,o=t._x,l=t._y,c=t._z,h=t._w;return this._x=i*h+a*o+r*c-s*l,this._y=r*h+a*l+s*o-i*c,this._z=s*h+a*c+i*l-r*o,this._w=a*h-i*o-r*l-s*c,this._onChangeCallback(),this}slerp(e,t){if(t===0)return this;if(t===1)return this.copy(e);let i=this._x,r=this._y,s=this._z,a=this._w,o=a*e._w+i*e._x+r*e._y+s*e._z;if(o<0?(this._w=-e._w,this._x=-e._x,this._y=-e._y,this._z=-e._z,o=-o):this.copy(e),o>=1)return this._w=a,this._x=i,this._y=r,this._z=s,this;let l=1-o*o;if(l<=Number.EPSILON){let d=1-t;return this._w=d*a+t*this._w,this._x=d*i+t*this._x,this._y=d*r+t*this._y,this._z=d*s+t*this._z,this.normalize(),this}let c=Math.sqrt(l),h=Math.atan2(c,o),u=Math.sin((1-t)*h)/c,f=Math.sin(t*h)/c;return this._w=a*u+this._w*f,this._x=i*u+this._x*f,this._y=r*u+this._y*f,this._z=s*u+this._z*f,this._onChangeCallback(),this}slerpQuaternions(e,t,i){return this.copy(e).slerp(t,i)}random(){let e=Math.random(),t=Math.sqrt(1-e),i=Math.sqrt(e),r=2*Math.PI*Math.random(),s=2*Math.PI*Math.random();return this.set(t*Math.cos(r),i*Math.sin(s),i*Math.cos(s),t*Math.sin(r))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}},P=class n{constructor(e=0,t=0,i=0){n.prototype.isVector3=!0,this.x=e,this.y=t,this.z=i}set(e,t,i){return i===void 0&&(i=this.z),this.x=e,this.y=t,this.z=i,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(Bu.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(Bu.setFromAxisAngle(e,t))}applyMatrix3(e){let t=this.x,i=this.y,r=this.z,s=e.elements;return this.x=s[0]*t+s[3]*i+s[6]*r,this.y=s[1]*t+s[4]*i+s[7]*r,this.z=s[2]*t+s[5]*i+s[8]*r,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){let t=this.x,i=this.y,r=this.z,s=e.elements,a=1/(s[3]*t+s[7]*i+s[11]*r+s[15]);return this.x=(s[0]*t+s[4]*i+s[8]*r+s[12])*a,this.y=(s[1]*t+s[5]*i+s[9]*r+s[13])*a,this.z=(s[2]*t+s[6]*i+s[10]*r+s[14])*a,this}applyQuaternion(e){let t=this.x,i=this.y,r=this.z,s=e.x,a=e.y,o=e.z,l=e.w,c=2*(a*r-o*i),h=2*(o*t-s*r),u=2*(s*i-a*t);return this.x=t+l*c+a*u-o*h,this.y=i+l*h+o*c-s*u,this.z=r+l*u+s*h-a*c,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){let t=this.x,i=this.y,r=this.z,s=e.elements;return this.x=s[0]*t+s[4]*i+s[8]*r,this.y=s[1]*t+s[5]*i+s[9]*r,this.z=s[2]*t+s[6]*i+s[10]*r,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=Math.max(e.x,Math.min(t.x,this.x)),this.y=Math.max(e.y,Math.min(t.y,this.y)),this.z=Math.max(e.z,Math.min(t.z,this.z)),this}clampScalar(e,t){return this.x=Math.max(e,Math.min(t,this.x)),this.y=Math.max(e,Math.min(t,this.y)),this.z=Math.max(e,Math.min(t,this.z)),this}clampLength(e,t){let i=this.length();return this.divideScalar(i||1).multiplyScalar(Math.max(e,Math.min(t,i)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this.z=e.z+(t.z-e.z)*i,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){let i=e.x,r=e.y,s=e.z,a=t.x,o=t.y,l=t.z;return this.x=r*l-s*o,this.y=s*a-i*l,this.z=i*o-r*a,this}projectOnVector(e){let t=e.lengthSq();if(t===0)return this.set(0,0,0);let i=e.dot(this)/t;return this.copy(e).multiplyScalar(i)}projectOnPlane(e){return ul.copy(this).projectOnVector(e),this.sub(ul)}reflect(e){return this.sub(ul.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let i=this.dot(e)/t;return Math.acos(Ot(i,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,i=this.y-e.y,r=this.z-e.z;return t*t+i*i+r*r}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,i){let r=Math.sin(t)*e;return this.x=r*Math.sin(i),this.y=Math.cos(t)*e,this.z=r*Math.cos(i),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,i){return this.x=e*Math.sin(t),this.y=i,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){let t=this.setFromMatrixColumn(e,0).length(),i=this.setFromMatrixColumn(e,1).length(),r=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=i,this.z=r,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let e=(Math.random()-.5)*2,t=Math.random()*Math.PI*2,i=Math.sqrt(1-e**2);return this.x=i*Math.cos(t),this.y=i*Math.sin(t),this.z=e,this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}},ul=new P,Bu=new xi,dn=class{constructor(e=new P(1/0,1/0,1/0),t=new P(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,i=e.length;t<i;t+=3)this.expandByPoint(Cn.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,i=e.count;t<i;t++)this.expandByPoint(Cn.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,i=e.length;t<i;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){let i=Cn.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(i),this.max.copy(e).add(i),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);let i=e.geometry;if(i!==void 0){let s=i.getAttribute("position");if(t===!0&&s!==void 0&&e.isInstancedMesh!==!0)for(let a=0,o=s.count;a<o;a++)e.isMesh===!0?e.getVertexPosition(a,Cn):Cn.fromBufferAttribute(s,a),Cn.applyMatrix4(e.matrixWorld),this.expandByPoint(Cn);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),so.copy(e.boundingBox)):(i.boundingBox===null&&i.computeBoundingBox(),so.copy(i.boundingBox)),so.applyMatrix4(e.matrixWorld),this.union(so)}let r=e.children;for(let s=0,a=r.length;s<a;s++)this.expandByObject(r[s],t);return this}containsPoint(e){return!(e.x<this.min.x||e.x>this.max.x||e.y<this.min.y||e.y>this.max.y||e.z<this.min.z||e.z>this.max.z)}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return!(e.max.x<this.min.x||e.min.x>this.max.x||e.max.y<this.min.y||e.min.y>this.max.y||e.max.z<this.min.z||e.min.z>this.max.z)}intersectsSphere(e){return this.clampPoint(e.center,Cn),Cn.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,i;return e.normal.x>0?(t=e.normal.x*this.min.x,i=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,i=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,i+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,i+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,i+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,i+=e.normal.z*this.min.z),t<=-e.constant&&i>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(ps),oo.subVectors(this.max,ps),ur.subVectors(e.a,ps),fr.subVectors(e.b,ps),dr.subVectors(e.c,ps),ci.subVectors(fr,ur),hi.subVectors(dr,fr),Ii.subVectors(ur,dr);let t=[0,-ci.z,ci.y,0,-hi.z,hi.y,0,-Ii.z,Ii.y,ci.z,0,-ci.x,hi.z,0,-hi.x,Ii.z,0,-Ii.x,-ci.y,ci.x,0,-hi.y,hi.x,0,-Ii.y,Ii.x,0];return!fl(t,ur,fr,dr,oo)||(t=[1,0,0,0,1,0,0,0,1],!fl(t,ur,fr,dr,oo))?!1:(ao.crossVectors(ci,hi),t=[ao.x,ao.y,ao.z],fl(t,ur,fr,dr,oo))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,Cn).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(Cn).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(jn[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),jn[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),jn[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),jn[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),jn[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),jn[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),jn[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),jn[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(jn),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}},jn=[new P,new P,new P,new P,new P,new P,new P,new P],Cn=new P,so=new dn,ur=new P,fr=new P,dr=new P,ci=new P,hi=new P,Ii=new P,ps=new P,oo=new P,ao=new P,Pi=new P;function fl(n,e,t,i,r){for(let s=0,a=n.length-3;s<=a;s+=3){Pi.fromArray(n,s);let o=r.x*Math.abs(Pi.x)+r.y*Math.abs(Pi.y)+r.z*Math.abs(Pi.z),l=e.dot(Pi),c=t.dot(Pi),h=i.dot(Pi);if(Math.max(-Math.max(l,c,h),Math.min(l,c,h))>o)return!1}return!0}var p0=new dn,ms=new P,dl=new P,Wi=class{constructor(e=new P,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){let i=this.center;t!==void 0?i.copy(t):p0.setFromPoints(e).getCenter(i);let r=0;for(let s=0,a=e.length;s<a;s++)r=Math.max(r,i.distanceToSquared(e[s]));return this.radius=Math.sqrt(r),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){let t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){let i=this.center.distanceToSquared(e);return t.copy(e),i>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;ms.subVectors(e,this.center);let t=ms.lengthSq();if(t>this.radius*this.radius){let i=Math.sqrt(t),r=(i-this.radius)*.5;this.center.addScaledVector(ms,r/i),this.radius+=r}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(dl.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(ms.copy(e.center).add(dl)),this.expandByPoint(ms.copy(e.center).sub(dl))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}},Zn=new P,pl=new P,lo=new P,ui=new P,ml=new P,co=new P,gl=new P,Ss=class{constructor(e=new P,t=new P(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,Zn)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);let i=t.dot(this.direction);return i<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,i)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){let t=Zn.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(Zn.copy(this.origin).addScaledVector(this.direction,t),Zn.distanceToSquared(e))}distanceSqToSegment(e,t,i,r){pl.copy(e).add(t).multiplyScalar(.5),lo.copy(t).sub(e).normalize(),ui.copy(this.origin).sub(pl);let s=e.distanceTo(t)*.5,a=-this.direction.dot(lo),o=ui.dot(this.direction),l=-ui.dot(lo),c=ui.lengthSq(),h=Math.abs(1-a*a),u,f,d,p;if(h>0)if(u=a*l-o,f=a*o-l,p=s*h,u>=0)if(f>=-p)if(f<=p){let y=1/h;u*=y,f*=y,d=u*(u+a*f+2*o)+f*(a*u+f+2*l)+c}else f=s,u=Math.max(0,-(a*f+o)),d=-u*u+f*(f+2*l)+c;else f=-s,u=Math.max(0,-(a*f+o)),d=-u*u+f*(f+2*l)+c;else f<=-p?(u=Math.max(0,-(-a*s+o)),f=u>0?-s:Math.min(Math.max(-s,-l),s),d=-u*u+f*(f+2*l)+c):f<=p?(u=0,f=Math.min(Math.max(-s,-l),s),d=f*(f+2*l)+c):(u=Math.max(0,-(a*s+o)),f=u>0?s:Math.min(Math.max(-s,-l),s),d=-u*u+f*(f+2*l)+c);else f=a>0?-s:s,u=Math.max(0,-(a*f+o)),d=-u*u+f*(f+2*l)+c;return i&&i.copy(this.origin).addScaledVector(this.direction,u),r&&r.copy(pl).addScaledVector(lo,f),d}intersectSphere(e,t){Zn.subVectors(e.center,this.origin);let i=Zn.dot(this.direction),r=Zn.dot(Zn)-i*i,s=e.radius*e.radius;if(r>s)return null;let a=Math.sqrt(s-r),o=i-a,l=i+a;return l<0?null:o<0?this.at(l,t):this.at(o,t)}intersectsSphere(e){return this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){let t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;let i=-(this.origin.dot(e.normal)+e.constant)/t;return i>=0?i:null}intersectPlane(e,t){let i=this.distanceToPlane(e);return i===null?null:this.at(i,t)}intersectsPlane(e){let t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let i,r,s,a,o,l,c=1/this.direction.x,h=1/this.direction.y,u=1/this.direction.z,f=this.origin;return c>=0?(i=(e.min.x-f.x)*c,r=(e.max.x-f.x)*c):(i=(e.max.x-f.x)*c,r=(e.min.x-f.x)*c),h>=0?(s=(e.min.y-f.y)*h,a=(e.max.y-f.y)*h):(s=(e.max.y-f.y)*h,a=(e.min.y-f.y)*h),i>a||s>r||((s>i||isNaN(i))&&(i=s),(a<r||isNaN(r))&&(r=a),u>=0?(o=(e.min.z-f.z)*u,l=(e.max.z-f.z)*u):(o=(e.max.z-f.z)*u,l=(e.min.z-f.z)*u),i>l||o>r)||((o>i||i!==i)&&(i=o),(l<r||r!==r)&&(r=l),r<0)?null:this.at(i>=0?i:r,t)}intersectsBox(e){return this.intersectBox(e,Zn)!==null}intersectTriangle(e,t,i,r,s){ml.subVectors(t,e),co.subVectors(i,e),gl.crossVectors(ml,co);let a=this.direction.dot(gl),o;if(a>0){if(r)return null;o=1}else if(a<0)o=-1,a=-a;else return null;ui.subVectors(this.origin,e);let l=o*this.direction.dot(co.crossVectors(ui,co));if(l<0)return null;let c=o*this.direction.dot(ml.cross(ui));if(c<0||l+c>a)return null;let h=-o*ui.dot(gl);return h<0?null:this.at(h/a,s)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}},et=class n{constructor(e,t,i,r,s,a,o,l,c,h,u,f,d,p,y,g){n.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,i,r,s,a,o,l,c,h,u,f,d,p,y,g)}set(e,t,i,r,s,a,o,l,c,h,u,f,d,p,y,g){let m=this.elements;return m[0]=e,m[4]=t,m[8]=i,m[12]=r,m[1]=s,m[5]=a,m[9]=o,m[13]=l,m[2]=c,m[6]=h,m[10]=u,m[14]=f,m[3]=d,m[7]=p,m[11]=y,m[15]=g,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new n().fromArray(this.elements)}copy(e){let t=this.elements,i=e.elements;return t[0]=i[0],t[1]=i[1],t[2]=i[2],t[3]=i[3],t[4]=i[4],t[5]=i[5],t[6]=i[6],t[7]=i[7],t[8]=i[8],t[9]=i[9],t[10]=i[10],t[11]=i[11],t[12]=i[12],t[13]=i[13],t[14]=i[14],t[15]=i[15],this}copyPosition(e){let t=this.elements,i=e.elements;return t[12]=i[12],t[13]=i[13],t[14]=i[14],this}setFromMatrix3(e){let t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,i){return e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),i.setFromMatrixColumn(this,2),this}makeBasis(e,t,i){return this.set(e.x,t.x,i.x,0,e.y,t.y,i.y,0,e.z,t.z,i.z,0,0,0,0,1),this}extractRotation(e){let t=this.elements,i=e.elements,r=1/pr.setFromMatrixColumn(e,0).length(),s=1/pr.setFromMatrixColumn(e,1).length(),a=1/pr.setFromMatrixColumn(e,2).length();return t[0]=i[0]*r,t[1]=i[1]*r,t[2]=i[2]*r,t[3]=0,t[4]=i[4]*s,t[5]=i[5]*s,t[6]=i[6]*s,t[7]=0,t[8]=i[8]*a,t[9]=i[9]*a,t[10]=i[10]*a,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){let t=this.elements,i=e.x,r=e.y,s=e.z,a=Math.cos(i),o=Math.sin(i),l=Math.cos(r),c=Math.sin(r),h=Math.cos(s),u=Math.sin(s);if(e.order==="XYZ"){let f=a*h,d=a*u,p=o*h,y=o*u;t[0]=l*h,t[4]=-l*u,t[8]=c,t[1]=d+p*c,t[5]=f-y*c,t[9]=-o*l,t[2]=y-f*c,t[6]=p+d*c,t[10]=a*l}else if(e.order==="YXZ"){let f=l*h,d=l*u,p=c*h,y=c*u;t[0]=f+y*o,t[4]=p*o-d,t[8]=a*c,t[1]=a*u,t[5]=a*h,t[9]=-o,t[2]=d*o-p,t[6]=y+f*o,t[10]=a*l}else if(e.order==="ZXY"){let f=l*h,d=l*u,p=c*h,y=c*u;t[0]=f-y*o,t[4]=-a*u,t[8]=p+d*o,t[1]=d+p*o,t[5]=a*h,t[9]=y-f*o,t[2]=-a*c,t[6]=o,t[10]=a*l}else if(e.order==="ZYX"){let f=a*h,d=a*u,p=o*h,y=o*u;t[0]=l*h,t[4]=p*c-d,t[8]=f*c+y,t[1]=l*u,t[5]=y*c+f,t[9]=d*c-p,t[2]=-c,t[6]=o*l,t[10]=a*l}else if(e.order==="YZX"){let f=a*l,d=a*c,p=o*l,y=o*c;t[0]=l*h,t[4]=y-f*u,t[8]=p*u+d,t[1]=u,t[5]=a*h,t[9]=-o*h,t[2]=-c*h,t[6]=d*u+p,t[10]=f-y*u}else if(e.order==="XZY"){let f=a*l,d=a*c,p=o*l,y=o*c;t[0]=l*h,t[4]=-u,t[8]=c*h,t[1]=f*u+y,t[5]=a*h,t[9]=d*u-p,t[2]=p*u-d,t[6]=o*h,t[10]=y*u+f}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(m0,e,g0)}lookAt(e,t,i){let r=this.elements;return ln.subVectors(e,t),ln.lengthSq()===0&&(ln.z=1),ln.normalize(),fi.crossVectors(i,ln),fi.lengthSq()===0&&(Math.abs(i.z)===1?ln.x+=1e-4:ln.z+=1e-4,ln.normalize(),fi.crossVectors(i,ln)),fi.normalize(),ho.crossVectors(ln,fi),r[0]=fi.x,r[4]=ho.x,r[8]=ln.x,r[1]=fi.y,r[5]=ho.y,r[9]=ln.y,r[2]=fi.z,r[6]=ho.z,r[10]=ln.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let i=e.elements,r=t.elements,s=this.elements,a=i[0],o=i[4],l=i[8],c=i[12],h=i[1],u=i[5],f=i[9],d=i[13],p=i[2],y=i[6],g=i[10],m=i[14],_=i[3],x=i[7],v=i[11],E=i[15],w=r[0],M=r[4],T=r[8],b=r[12],S=r[1],I=r[5],O=r[9],k=r[13],L=r[2],U=r[6],F=r[10],H=r[14],N=r[3],B=r[7],$=r[11],J=r[15];return s[0]=a*w+o*S+l*L+c*N,s[4]=a*M+o*I+l*U+c*B,s[8]=a*T+o*O+l*F+c*$,s[12]=a*b+o*k+l*H+c*J,s[1]=h*w+u*S+f*L+d*N,s[5]=h*M+u*I+f*U+d*B,s[9]=h*T+u*O+f*F+d*$,s[13]=h*b+u*k+f*H+d*J,s[2]=p*w+y*S+g*L+m*N,s[6]=p*M+y*I+g*U+m*B,s[10]=p*T+y*O+g*F+m*$,s[14]=p*b+y*k+g*H+m*J,s[3]=_*w+x*S+v*L+E*N,s[7]=_*M+x*I+v*U+E*B,s[11]=_*T+x*O+v*F+E*$,s[15]=_*b+x*k+v*H+E*J,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){let e=this.elements,t=e[0],i=e[4],r=e[8],s=e[12],a=e[1],o=e[5],l=e[9],c=e[13],h=e[2],u=e[6],f=e[10],d=e[14],p=e[3],y=e[7],g=e[11],m=e[15];return p*(+s*l*u-r*c*u-s*o*f+i*c*f+r*o*d-i*l*d)+y*(+t*l*d-t*c*f+s*a*f-r*a*d+r*c*h-s*l*h)+g*(+t*c*u-t*o*d-s*a*u+i*a*d+s*o*h-i*c*h)+m*(-r*o*h-t*l*u+t*o*f+r*a*u-i*a*f+i*l*h)}transpose(){let e=this.elements,t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,i){let r=this.elements;return e.isVector3?(r[12]=e.x,r[13]=e.y,r[14]=e.z):(r[12]=e,r[13]=t,r[14]=i),this}invert(){let e=this.elements,t=e[0],i=e[1],r=e[2],s=e[3],a=e[4],o=e[5],l=e[6],c=e[7],h=e[8],u=e[9],f=e[10],d=e[11],p=e[12],y=e[13],g=e[14],m=e[15],_=u*g*c-y*f*c+y*l*d-o*g*d-u*l*m+o*f*m,x=p*f*c-h*g*c-p*l*d+a*g*d+h*l*m-a*f*m,v=h*y*c-p*u*c+p*o*d-a*y*d-h*o*m+a*u*m,E=p*u*l-h*y*l-p*o*f+a*y*f+h*o*g-a*u*g,w=t*_+i*x+r*v+s*E;if(w===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let M=1/w;return e[0]=_*M,e[1]=(y*f*s-u*g*s-y*r*d+i*g*d+u*r*m-i*f*m)*M,e[2]=(o*g*s-y*l*s+y*r*c-i*g*c-o*r*m+i*l*m)*M,e[3]=(u*l*s-o*f*s-u*r*c+i*f*c+o*r*d-i*l*d)*M,e[4]=x*M,e[5]=(h*g*s-p*f*s+p*r*d-t*g*d-h*r*m+t*f*m)*M,e[6]=(p*l*s-a*g*s-p*r*c+t*g*c+a*r*m-t*l*m)*M,e[7]=(a*f*s-h*l*s+h*r*c-t*f*c-a*r*d+t*l*d)*M,e[8]=v*M,e[9]=(p*u*s-h*y*s-p*i*d+t*y*d+h*i*m-t*u*m)*M,e[10]=(a*y*s-p*o*s+p*i*c-t*y*c-a*i*m+t*o*m)*M,e[11]=(h*o*s-a*u*s-h*i*c+t*u*c+a*i*d-t*o*d)*M,e[12]=E*M,e[13]=(h*y*r-p*u*r+p*i*f-t*y*f-h*i*g+t*u*g)*M,e[14]=(p*o*r-a*y*r-p*i*l+t*y*l+a*i*g-t*o*g)*M,e[15]=(a*u*r-h*o*r+h*i*l-t*u*l-a*i*f+t*o*f)*M,this}scale(e){let t=this.elements,i=e.x,r=e.y,s=e.z;return t[0]*=i,t[4]*=r,t[8]*=s,t[1]*=i,t[5]*=r,t[9]*=s,t[2]*=i,t[6]*=r,t[10]*=s,t[3]*=i,t[7]*=r,t[11]*=s,this}getMaxScaleOnAxis(){let e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],i=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],r=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,i,r))}makeTranslation(e,t,i){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,i,0,0,0,1),this}makeRotationX(e){let t=Math.cos(e),i=Math.sin(e);return this.set(1,0,0,0,0,t,-i,0,0,i,t,0,0,0,0,1),this}makeRotationY(e){let t=Math.cos(e),i=Math.sin(e);return this.set(t,0,i,0,0,1,0,0,-i,0,t,0,0,0,0,1),this}makeRotationZ(e){let t=Math.cos(e),i=Math.sin(e);return this.set(t,-i,0,0,i,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){let i=Math.cos(t),r=Math.sin(t),s=1-i,a=e.x,o=e.y,l=e.z,c=s*a,h=s*o;return this.set(c*a+i,c*o-r*l,c*l+r*o,0,c*o+r*l,h*o+i,h*l-r*a,0,c*l-r*o,h*l+r*a,s*l*l+i,0,0,0,0,1),this}makeScale(e,t,i){return this.set(e,0,0,0,0,t,0,0,0,0,i,0,0,0,0,1),this}makeShear(e,t,i,r,s,a){return this.set(1,i,s,0,e,1,a,0,t,r,1,0,0,0,0,1),this}compose(e,t,i){let r=this.elements,s=t._x,a=t._y,o=t._z,l=t._w,c=s+s,h=a+a,u=o+o,f=s*c,d=s*h,p=s*u,y=a*h,g=a*u,m=o*u,_=l*c,x=l*h,v=l*u,E=i.x,w=i.y,M=i.z;return r[0]=(1-(y+m))*E,r[1]=(d+v)*E,r[2]=(p-x)*E,r[3]=0,r[4]=(d-v)*w,r[5]=(1-(f+m))*w,r[6]=(g+_)*w,r[7]=0,r[8]=(p+x)*M,r[9]=(g-_)*M,r[10]=(1-(f+y))*M,r[11]=0,r[12]=e.x,r[13]=e.y,r[14]=e.z,r[15]=1,this}decompose(e,t,i){let r=this.elements,s=pr.set(r[0],r[1],r[2]).length(),a=pr.set(r[4],r[5],r[6]).length(),o=pr.set(r[8],r[9],r[10]).length();this.determinant()<0&&(s=-s),e.x=r[12],e.y=r[13],e.z=r[14],In.copy(this);let c=1/s,h=1/a,u=1/o;return In.elements[0]*=c,In.elements[1]*=c,In.elements[2]*=c,In.elements[4]*=h,In.elements[5]*=h,In.elements[6]*=h,In.elements[8]*=u,In.elements[9]*=u,In.elements[10]*=u,t.setFromRotationMatrix(In),i.x=s,i.y=a,i.z=o,this}makePerspective(e,t,i,r,s,a,o=ti){let l=this.elements,c=2*s/(t-e),h=2*s/(i-r),u=(t+e)/(t-e),f=(i+r)/(i-r),d,p;if(o===ti)d=-(a+s)/(a-s),p=-2*a*s/(a-s);else if(o===Go)d=-a/(a-s),p=-a*s/(a-s);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+o);return l[0]=c,l[4]=0,l[8]=u,l[12]=0,l[1]=0,l[5]=h,l[9]=f,l[13]=0,l[2]=0,l[6]=0,l[10]=d,l[14]=p,l[3]=0,l[7]=0,l[11]=-1,l[15]=0,this}makeOrthographic(e,t,i,r,s,a,o=ti){let l=this.elements,c=1/(t-e),h=1/(i-r),u=1/(a-s),f=(t+e)*c,d=(i+r)*h,p,y;if(o===ti)p=(a+s)*u,y=-2*u;else if(o===Go)p=s*u,y=-1*u;else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+o);return l[0]=2*c,l[4]=0,l[8]=0,l[12]=-f,l[1]=0,l[5]=2*h,l[9]=0,l[13]=-d,l[2]=0,l[6]=0,l[10]=y,l[14]=-p,l[3]=0,l[7]=0,l[11]=0,l[15]=1,this}equals(e){let t=this.elements,i=e.elements;for(let r=0;r<16;r++)if(t[r]!==i[r])return!1;return!0}fromArray(e,t=0){for(let i=0;i<16;i++)this.elements[i]=e[i+t];return this}toArray(e=[],t=0){let i=this.elements;return e[t]=i[0],e[t+1]=i[1],e[t+2]=i[2],e[t+3]=i[3],e[t+4]=i[4],e[t+5]=i[5],e[t+6]=i[6],e[t+7]=i[7],e[t+8]=i[8],e[t+9]=i[9],e[t+10]=i[10],e[t+11]=i[11],e[t+12]=i[12],e[t+13]=i[13],e[t+14]=i[14],e[t+15]=i[15],e}},pr=new P,In=new et,m0=new P(0,0,0),g0=new P(1,1,1),fi=new P,ho=new P,ln=new P,ku=new et,Hu=new xi,jo=class n{constructor(e=0,t=0,i=0,r=n.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=i,this._order=r}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,i,r=this._order){return this._x=e,this._y=t,this._z=i,this._order=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,i=!0){let r=e.elements,s=r[0],a=r[4],o=r[8],l=r[1],c=r[5],h=r[9],u=r[2],f=r[6],d=r[10];switch(t){case"XYZ":this._y=Math.asin(Ot(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-h,d),this._z=Math.atan2(-a,s)):(this._x=Math.atan2(f,c),this._z=0);break;case"YXZ":this._x=Math.asin(-Ot(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(o,d),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-u,s),this._z=0);break;case"ZXY":this._x=Math.asin(Ot(f,-1,1)),Math.abs(f)<.9999999?(this._y=Math.atan2(-u,d),this._z=Math.atan2(-a,c)):(this._y=0,this._z=Math.atan2(l,s));break;case"ZYX":this._y=Math.asin(-Ot(u,-1,1)),Math.abs(u)<.9999999?(this._x=Math.atan2(f,d),this._z=Math.atan2(l,s)):(this._x=0,this._z=Math.atan2(-a,c));break;case"YZX":this._z=Math.asin(Ot(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-h,c),this._y=Math.atan2(-u,s)):(this._x=0,this._y=Math.atan2(o,d));break;case"XZY":this._z=Math.asin(-Ot(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(f,c),this._y=Math.atan2(o,s)):(this._x=Math.atan2(-h,d),this._y=0);break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,i===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,i){return ku.makeRotationFromQuaternion(e),this.setFromRotationMatrix(ku,t,i)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return Hu.setFromEuler(this),this.setFromQuaternion(Hu,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};jo.DEFAULT_ORDER="XYZ";var Zo=class{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}},y0=0,Vu=new P,mr=new xi,Jn=new et,uo=new P,gs=new P,x0=new P,_0=new xi,Gu=new P(1,0,0),Wu=new P(0,1,0),Xu=new P(0,0,1),v0={type:"added"},b0={type:"removed"},Et=class n extends yi{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:y0++}),this.uuid=Wr(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=n.DEFAULT_UP.clone();let e=new P,t=new jo,i=new xi,r=new P(1,1,1);function s(){i.setFromEuler(t,!1)}function a(){t.setFromQuaternion(i,void 0,!1)}t._onChange(s),i._onChange(a),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:i},scale:{configurable:!0,enumerable:!0,value:r},modelViewMatrix:{value:new et},normalMatrix:{value:new Ve}}),this.matrix=new et,this.matrixWorld=new et,this.matrixAutoUpdate=n.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=n.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new Zo,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return mr.setFromAxisAngle(e,t),this.quaternion.multiply(mr),this}rotateOnWorldAxis(e,t){return mr.setFromAxisAngle(e,t),this.quaternion.premultiply(mr),this}rotateX(e){return this.rotateOnAxis(Gu,e)}rotateY(e){return this.rotateOnAxis(Wu,e)}rotateZ(e){return this.rotateOnAxis(Xu,e)}translateOnAxis(e,t){return Vu.copy(e).applyQuaternion(this.quaternion),this.position.add(Vu.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(Gu,e)}translateY(e){return this.translateOnAxis(Wu,e)}translateZ(e){return this.translateOnAxis(Xu,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(Jn.copy(this.matrixWorld).invert())}lookAt(e,t,i){e.isVector3?uo.copy(e):uo.set(e,t,i);let r=this.parent;this.updateWorldMatrix(!0,!1),gs.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?Jn.lookAt(gs,uo,this.up):Jn.lookAt(uo,gs,this.up),this.quaternion.setFromRotationMatrix(Jn),r&&(Jn.extractRotation(r.matrixWorld),mr.setFromRotationMatrix(Jn),this.quaternion.premultiply(mr.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(console.error("THREE.Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.parent!==null&&e.parent.remove(e),e.parent=this,this.children.push(e),e.dispatchEvent(v0)):console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let i=0;i<arguments.length;i++)this.remove(arguments[i]);return this}let t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(b0)),this}removeFromParent(){let e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),Jn.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),Jn.multiply(e.parent.matrixWorld)),e.applyMatrix4(Jn),this.add(e),e.updateWorldMatrix(!1,!0),this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let i=0,r=this.children.length;i<r;i++){let a=this.children[i].getObjectByProperty(e,t);if(a!==void 0)return a}}getObjectsByProperty(e,t,i=[]){this[e]===t&&i.push(this);let r=this.children;for(let s=0,a=r.length;s<a;s++)r[s].getObjectsByProperty(e,t,i);return i}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(gs,e,x0),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(gs,_0,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);let t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);let t=this.children;for(let i=0,r=t.length;i<r;i++)t[i].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);let t=this.children;for(let i=0,r=t.length;i<r;i++)t[i].traverseVisible(e)}traverseAncestors(e){let t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix),this.matrixWorldNeedsUpdate=!1,e=!0);let t=this.children;for(let i=0,r=t.length;i<r;i++){let s=t[i];(s.matrixWorldAutoUpdate===!0||e===!0)&&s.updateMatrixWorld(e)}}updateWorldMatrix(e,t){let i=this.parent;if(e===!0&&i!==null&&i.matrixWorldAutoUpdate===!0&&i.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix),t===!0){let r=this.children;for(let s=0,a=r.length;s<a;s++){let o=r[s];o.matrixWorldAutoUpdate===!0&&o.updateWorldMatrix(!1,!0)}}}toJSON(e){let t=e===void 0||typeof e=="string",i={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},i.metadata={version:4.6,type:"Object",generator:"Object3D.toJSON"});let r={};r.uuid=this.uuid,r.type=this.type,this.name!==""&&(r.name=this.name),this.castShadow===!0&&(r.castShadow=!0),this.receiveShadow===!0&&(r.receiveShadow=!0),this.visible===!1&&(r.visible=!1),this.frustumCulled===!1&&(r.frustumCulled=!1),this.renderOrder!==0&&(r.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(r.userData=this.userData),r.layers=this.layers.mask,r.matrix=this.matrix.toArray(),r.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(r.matrixAutoUpdate=!1),this.isInstancedMesh&&(r.type="InstancedMesh",r.count=this.count,r.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(r.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(r.type="BatchedMesh",r.perObjectFrustumCulled=this.perObjectFrustumCulled,r.sortObjects=this.sortObjects,r.drawRanges=this._drawRanges,r.reservedRanges=this._reservedRanges,r.visibility=this._visibility,r.active=this._active,r.bounds=this._bounds.map(o=>({boxInitialized:o.boxInitialized,boxMin:o.box.min.toArray(),boxMax:o.box.max.toArray(),sphereInitialized:o.sphereInitialized,sphereRadius:o.sphere.radius,sphereCenter:o.sphere.center.toArray()})),r.maxGeometryCount=this._maxGeometryCount,r.maxVertexCount=this._maxVertexCount,r.maxIndexCount=this._maxIndexCount,r.geometryInitialized=this._geometryInitialized,r.geometryCount=this._geometryCount,r.matricesTexture=this._matricesTexture.toJSON(e),this.boundingSphere!==null&&(r.boundingSphere={center:r.boundingSphere.center.toArray(),radius:r.boundingSphere.radius}),this.boundingBox!==null&&(r.boundingBox={min:r.boundingBox.min.toArray(),max:r.boundingBox.max.toArray()}));function s(o,l){return o[l.uuid]===void 0&&(o[l.uuid]=l.toJSON(e)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?r.background=this.background.toJSON():this.background.isTexture&&(r.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(r.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){r.geometry=s(e.geometries,this.geometry);let o=this.geometry.parameters;if(o!==void 0&&o.shapes!==void 0){let l=o.shapes;if(Array.isArray(l))for(let c=0,h=l.length;c<h;c++){let u=l[c];s(e.shapes,u)}else s(e.shapes,l)}}if(this.isSkinnedMesh&&(r.bindMode=this.bindMode,r.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(s(e.skeletons,this.skeleton),r.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){let o=[];for(let l=0,c=this.material.length;l<c;l++)o.push(s(e.materials,this.material[l]));r.material=o}else r.material=s(e.materials,this.material);if(this.children.length>0){r.children=[];for(let o=0;o<this.children.length;o++)r.children.push(this.children[o].toJSON(e).object)}if(this.animations.length>0){r.animations=[];for(let o=0;o<this.animations.length;o++){let l=this.animations[o];r.animations.push(s(e.animations,l))}}if(t){let o=a(e.geometries),l=a(e.materials),c=a(e.textures),h=a(e.images),u=a(e.shapes),f=a(e.skeletons),d=a(e.animations),p=a(e.nodes);o.length>0&&(i.geometries=o),l.length>0&&(i.materials=l),c.length>0&&(i.textures=c),h.length>0&&(i.images=h),u.length>0&&(i.shapes=u),f.length>0&&(i.skeletons=f),d.length>0&&(i.animations=d),p.length>0&&(i.nodes=p)}return i.object=r,i;function a(o){let l=[];for(let c in o){let h=o[c];delete h.metadata,l.push(h)}return l}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let i=0;i<e.children.length;i++){let r=e.children[i];this.add(r.clone())}return this}};Et.DEFAULT_UP=new P(0,1,0);Et.DEFAULT_MATRIX_AUTO_UPDATE=!0;Et.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;var Pn=new P,Kn=new P,yl=new P,Qn=new P,gr=new P,yr=new P,qu=new P,xl=new P,_l=new P,vl=new P,fo=!1,Fi=class n{constructor(e=new P,t=new P,i=new P){this.a=e,this.b=t,this.c=i}static getNormal(e,t,i,r){r.subVectors(i,t),Pn.subVectors(e,t),r.cross(Pn);let s=r.lengthSq();return s>0?r.multiplyScalar(1/Math.sqrt(s)):r.set(0,0,0)}static getBarycoord(e,t,i,r,s){Pn.subVectors(r,t),Kn.subVectors(i,t),yl.subVectors(e,t);let a=Pn.dot(Pn),o=Pn.dot(Kn),l=Pn.dot(yl),c=Kn.dot(Kn),h=Kn.dot(yl),u=a*c-o*o;if(u===0)return s.set(0,0,0),null;let f=1/u,d=(c*l-o*h)*f,p=(a*h-o*l)*f;return s.set(1-d-p,p,d)}static containsPoint(e,t,i,r){return this.getBarycoord(e,t,i,r,Qn)===null?!1:Qn.x>=0&&Qn.y>=0&&Qn.x+Qn.y<=1}static getUV(e,t,i,r,s,a,o,l){return fo===!1&&(console.warn("THREE.Triangle.getUV() has been renamed to THREE.Triangle.getInterpolation()."),fo=!0),this.getInterpolation(e,t,i,r,s,a,o,l)}static getInterpolation(e,t,i,r,s,a,o,l){return this.getBarycoord(e,t,i,r,Qn)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(s,Qn.x),l.addScaledVector(a,Qn.y),l.addScaledVector(o,Qn.z),l)}static isFrontFacing(e,t,i,r){return Pn.subVectors(i,t),Kn.subVectors(e,t),Pn.cross(Kn).dot(r)<0}set(e,t,i){return this.a.copy(e),this.b.copy(t),this.c.copy(i),this}setFromPointsAndIndices(e,t,i,r){return this.a.copy(e[t]),this.b.copy(e[i]),this.c.copy(e[r]),this}setFromAttributeAndIndices(e,t,i,r){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,i),this.c.fromBufferAttribute(e,r),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return Pn.subVectors(this.c,this.b),Kn.subVectors(this.a,this.b),Pn.cross(Kn).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return n.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return n.getBarycoord(e,this.a,this.b,this.c,t)}getUV(e,t,i,r,s){return fo===!1&&(console.warn("THREE.Triangle.getUV() has been renamed to THREE.Triangle.getInterpolation()."),fo=!0),n.getInterpolation(e,this.a,this.b,this.c,t,i,r,s)}getInterpolation(e,t,i,r,s){return n.getInterpolation(e,this.a,this.b,this.c,t,i,r,s)}containsPoint(e){return n.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return n.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){let i=this.a,r=this.b,s=this.c,a,o;gr.subVectors(r,i),yr.subVectors(s,i),xl.subVectors(e,i);let l=gr.dot(xl),c=yr.dot(xl);if(l<=0&&c<=0)return t.copy(i);_l.subVectors(e,r);let h=gr.dot(_l),u=yr.dot(_l);if(h>=0&&u<=h)return t.copy(r);let f=l*u-h*c;if(f<=0&&l>=0&&h<=0)return a=l/(l-h),t.copy(i).addScaledVector(gr,a);vl.subVectors(e,s);let d=gr.dot(vl),p=yr.dot(vl);if(p>=0&&d<=p)return t.copy(s);let y=d*c-l*p;if(y<=0&&c>=0&&p<=0)return o=c/(c-p),t.copy(i).addScaledVector(yr,o);let g=h*p-d*u;if(g<=0&&u-h>=0&&d-p>=0)return qu.subVectors(s,r),o=(u-h)/(u-h+(d-p)),t.copy(r).addScaledVector(qu,o);let m=1/(g+y+f);return a=y*m,o=f*m,t.copy(i).addScaledVector(gr,a).addScaledVector(yr,o)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}},jf={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},di={h:0,s:0,l:0},po={h:0,s:0,l:0};function bl(n,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?n+(e-n)*6*t:t<1/2?e:t<2/3?n+(e-n)*6*(2/3-t):n}var ye=class{constructor(e,t,i){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,i)}set(e,t,i){if(t===void 0&&i===void 0){let r=e;r&&r.isColor?this.copy(r):typeof r=="number"?this.setHex(r):typeof r=="string"&&this.setStyle(r)}else this.setRGB(e,t,i);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=mt){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,Qe.toWorkingColorSpace(this,t),this}setRGB(e,t,i,r=Qe.workingColorSpace){return this.r=e,this.g=t,this.b=i,Qe.toWorkingColorSpace(this,r),this}setHSL(e,t,i,r=Qe.workingColorSpace){if(e=Dc(e,1),t=Ot(t,0,1),i=Ot(i,0,1),t===0)this.r=this.g=this.b=i;else{let s=i<=.5?i*(1+t):i+t-i*t,a=2*i-s;this.r=bl(a,s,e+1/3),this.g=bl(a,s,e),this.b=bl(a,s,e-1/3)}return Qe.toWorkingColorSpace(this,r),this}setStyle(e,t=mt){function i(s){s!==void 0&&parseFloat(s)<1&&console.warn("THREE.Color: Alpha component of "+e+" will be ignored.")}let r;if(r=/^(\w+)\(([^\)]*)\)/.exec(e)){let s,a=r[1],o=r[2];switch(a){case"rgb":case"rgba":if(s=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return i(s[4]),this.setRGB(Math.min(255,parseInt(s[1],10))/255,Math.min(255,parseInt(s[2],10))/255,Math.min(255,parseInt(s[3],10))/255,t);if(s=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return i(s[4]),this.setRGB(Math.min(100,parseInt(s[1],10))/100,Math.min(100,parseInt(s[2],10))/100,Math.min(100,parseInt(s[3],10))/100,t);break;case"hsl":case"hsla":if(s=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return i(s[4]),this.setHSL(parseFloat(s[1])/360,parseFloat(s[2])/100,parseFloat(s[3])/100,t);break;default:console.warn("THREE.Color: Unknown color model "+e)}}else if(r=/^\#([A-Fa-f\d]+)$/.exec(e)){let s=r[1],a=s.length;if(a===3)return this.setRGB(parseInt(s.charAt(0),16)/15,parseInt(s.charAt(1),16)/15,parseInt(s.charAt(2),16)/15,t);if(a===6)return this.setHex(parseInt(s,16),t);console.warn("THREE.Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=mt){let i=jf[e.toLowerCase()];return i!==void 0?this.setHex(i,t):console.warn("THREE.Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=Pr(e.r),this.g=Pr(e.g),this.b=Pr(e.b),this}copyLinearToSRGB(e){return this.r=cl(e.r),this.g=cl(e.g),this.b=cl(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=mt){return Qe.fromWorkingColorSpace(Wt.copy(this),e),Math.round(Ot(Wt.r*255,0,255))*65536+Math.round(Ot(Wt.g*255,0,255))*256+Math.round(Ot(Wt.b*255,0,255))}getHexString(e=mt){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=Qe.workingColorSpace){Qe.fromWorkingColorSpace(Wt.copy(this),t);let i=Wt.r,r=Wt.g,s=Wt.b,a=Math.max(i,r,s),o=Math.min(i,r,s),l,c,h=(o+a)/2;if(o===a)l=0,c=0;else{let u=a-o;switch(c=h<=.5?u/(a+o):u/(2-a-o),a){case i:l=(r-s)/u+(r<s?6:0);break;case r:l=(s-i)/u+2;break;case s:l=(i-r)/u+4;break}l/=6}return e.h=l,e.s=c,e.l=h,e}getRGB(e,t=Qe.workingColorSpace){return Qe.fromWorkingColorSpace(Wt.copy(this),t),e.r=Wt.r,e.g=Wt.g,e.b=Wt.b,e}getStyle(e=mt){Qe.fromWorkingColorSpace(Wt.copy(this),e);let t=Wt.r,i=Wt.g,r=Wt.b;return e!==mt?`color(${e} ${t.toFixed(3)} ${i.toFixed(3)} ${r.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(i*255)},${Math.round(r*255)})`}offsetHSL(e,t,i){return this.getHSL(di),this.setHSL(di.h+e,di.s+t,di.l+i)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,i){return this.r=e.r+(t.r-e.r)*i,this.g=e.g+(t.g-e.g)*i,this.b=e.b+(t.b-e.b)*i,this}lerpHSL(e,t){this.getHSL(di),e.getHSL(po);let i=_s(di.h,po.h,t),r=_s(di.s,po.s,t),s=_s(di.l,po.l,t);return this.setHSL(i,r,s),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){let t=this.r,i=this.g,r=this.b,s=e.elements;return this.r=s[0]*t+s[3]*i+s[6]*r,this.g=s[1]*t+s[4]*i+s[7]*r,this.b=s[2]*t+s[5]*i+s[8]*r,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}},Wt=new ye;ye.NAMES=jf;var M0=0,Hn=class extends yi{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:M0++}),this.uuid=Wr(),this.name="",this.type="Material",this.blending=Cr,this.side=Qt,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=Fl,this.blendDst=zl,this.blendEquation=Ui,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new ye(0,0,0),this.blendAlpha=0,this.depthFunc=Fo,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=Lu,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=cr,this.stencilZFail=cr,this.stencilZPass=cr,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBuild(){}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(let t in e){let i=e[t];if(i===void 0){console.warn(`THREE.Material: parameter '${t}' has value of undefined.`);continue}let r=this[t];if(r===void 0){console.warn(`THREE.Material: '${t}' is not a property of THREE.${this.type}.`);continue}r&&r.isColor?r.set(i):r&&r.isVector3&&i&&i.isVector3?r.copy(i):this[t]=i}}toJSON(e){let t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});let i={metadata:{version:4.6,type:"Material",generator:"Material.toJSON"}};i.uuid=this.uuid,i.type=this.type,this.name!==""&&(i.name=this.name),this.color&&this.color.isColor&&(i.color=this.color.getHex()),this.roughness!==void 0&&(i.roughness=this.roughness),this.metalness!==void 0&&(i.metalness=this.metalness),this.sheen!==void 0&&(i.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(i.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(i.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(i.emissive=this.emissive.getHex()),this.emissiveIntensity&&this.emissiveIntensity!==1&&(i.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(i.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(i.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(i.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(i.shininess=this.shininess),this.clearcoat!==void 0&&(i.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(i.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(i.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(i.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(i.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,i.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.iridescence!==void 0&&(i.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(i.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(i.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(i.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(i.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(i.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(i.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(i.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(i.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(i.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(i.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(i.lightMap=this.lightMap.toJSON(e).uuid,i.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(i.aoMap=this.aoMap.toJSON(e).uuid,i.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(i.bumpMap=this.bumpMap.toJSON(e).uuid,i.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(i.normalMap=this.normalMap.toJSON(e).uuid,i.normalMapType=this.normalMapType,i.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(i.displacementMap=this.displacementMap.toJSON(e).uuid,i.displacementScale=this.displacementScale,i.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(i.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(i.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(i.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(i.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(i.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(i.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(i.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(i.combine=this.combine)),this.envMapIntensity!==void 0&&(i.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(i.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(i.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(i.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(i.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(i.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(i.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(i.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(i.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(i.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(i.size=this.size),this.shadowSide!==null&&(i.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(i.sizeAttenuation=this.sizeAttenuation),this.blending!==Cr&&(i.blending=this.blending),this.side!==Qt&&(i.side=this.side),this.vertexColors===!0&&(i.vertexColors=!0),this.opacity<1&&(i.opacity=this.opacity),this.transparent===!0&&(i.transparent=!0),this.blendSrc!==Fl&&(i.blendSrc=this.blendSrc),this.blendDst!==zl&&(i.blendDst=this.blendDst),this.blendEquation!==Ui&&(i.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(i.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(i.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(i.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(i.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(i.blendAlpha=this.blendAlpha),this.depthFunc!==Fo&&(i.depthFunc=this.depthFunc),this.depthTest===!1&&(i.depthTest=this.depthTest),this.depthWrite===!1&&(i.depthWrite=this.depthWrite),this.colorWrite===!1&&(i.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(i.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==Lu&&(i.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(i.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(i.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==cr&&(i.stencilFail=this.stencilFail),this.stencilZFail!==cr&&(i.stencilZFail=this.stencilZFail),this.stencilZPass!==cr&&(i.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(i.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(i.rotation=this.rotation),this.polygonOffset===!0&&(i.polygonOffset=!0),this.polygonOffsetFactor!==0&&(i.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(i.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(i.linewidth=this.linewidth),this.dashSize!==void 0&&(i.dashSize=this.dashSize),this.gapSize!==void 0&&(i.gapSize=this.gapSize),this.scale!==void 0&&(i.scale=this.scale),this.dithering===!0&&(i.dithering=!0),this.alphaTest>0&&(i.alphaTest=this.alphaTest),this.alphaHash===!0&&(i.alphaHash=!0),this.alphaToCoverage===!0&&(i.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(i.premultipliedAlpha=!0),this.forceSinglePass===!0&&(i.forceSinglePass=!0),this.wireframe===!0&&(i.wireframe=!0),this.wireframeLinewidth>1&&(i.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(i.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(i.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(i.flatShading=!0),this.visible===!1&&(i.visible=!1),this.toneMapped===!1&&(i.toneMapped=!1),this.fog===!1&&(i.fog=!1),Object.keys(this.userData).length>0&&(i.userData=this.userData);function r(s){let a=[];for(let o in s){let l=s[o];delete l.metadata,a.push(l)}return a}if(t){let s=r(e.textures),a=r(e.images);s.length>0&&(i.textures=s),a.length>0&&(i.images=a)}return i}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;let t=e.clippingPlanes,i=null;if(t!==null){let r=t.length;i=new Array(r);for(let s=0;s!==r;++s)i[s]=t[s].clone()}return this.clippingPlanes=i,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}},Vn=class extends Hn{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new ye(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.combine=Ff,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}};var Tt=new P,mo=new ce,tn=class{constructor(e,t,i=!1){if(Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=i,this.usage=Du,this._updateRange={offset:0,count:-1},this.updateRanges=[],this.gpuType=kn,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}get updateRange(){return console.warn("THREE.BufferAttribute: updateRange() is deprecated and will be removed in r169. Use addUpdateRange() instead."),this._updateRange}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,i){e*=this.itemSize,i*=t.itemSize;for(let r=0,s=this.itemSize;r<s;r++)this.array[e+r]=t.array[i+r];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,i=this.count;t<i;t++)mo.fromBufferAttribute(this,t),mo.applyMatrix3(e),this.setXY(t,mo.x,mo.y);else if(this.itemSize===3)for(let t=0,i=this.count;t<i;t++)Tt.fromBufferAttribute(this,t),Tt.applyMatrix3(e),this.setXYZ(t,Tt.x,Tt.y,Tt.z);return this}applyMatrix4(e){for(let t=0,i=this.count;t<i;t++)Tt.fromBufferAttribute(this,t),Tt.applyMatrix4(e),this.setXYZ(t,Tt.x,Tt.y,Tt.z);return this}applyNormalMatrix(e){for(let t=0,i=this.count;t<i;t++)Tt.fromBufferAttribute(this,t),Tt.applyNormalMatrix(e),this.setXYZ(t,Tt.x,Tt.y,Tt.z);return this}transformDirection(e){for(let t=0,i=this.count;t<i;t++)Tt.fromBufferAttribute(this,t),Tt.transformDirection(e),this.setXYZ(t,Tt.x,Tt.y,Tt.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let i=this.array[e*this.itemSize+t];return this.normalized&&(i=Er(i,this.array)),i}setComponent(e,t,i){return this.normalized&&(i=Jt(i,this.array)),this.array[e*this.itemSize+t]=i,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=Er(t,this.array)),t}setX(e,t){return this.normalized&&(t=Jt(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=Er(t,this.array)),t}setY(e,t){return this.normalized&&(t=Jt(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=Er(t,this.array)),t}setZ(e,t){return this.normalized&&(t=Jt(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=Er(t,this.array)),t}setW(e,t){return this.normalized&&(t=Jt(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,i){return e*=this.itemSize,this.normalized&&(t=Jt(t,this.array),i=Jt(i,this.array)),this.array[e+0]=t,this.array[e+1]=i,this}setXYZ(e,t,i,r){return e*=this.itemSize,this.normalized&&(t=Jt(t,this.array),i=Jt(i,this.array),r=Jt(r,this.array)),this.array[e+0]=t,this.array[e+1]=i,this.array[e+2]=r,this}setXYZW(e,t,i,r,s){return e*=this.itemSize,this.normalized&&(t=Jt(t,this.array),i=Jt(i,this.array),r=Jt(r,this.array),s=Jt(s,this.array)),this.array[e+0]=t,this.array[e+1]=i,this.array[e+2]=r,this.array[e+3]=s,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==Du&&(e.usage=this.usage),e}};var Jo=class extends tn{constructor(e,t,i){super(new Uint16Array(e),t,i)}};var Ko=class extends tn{constructor(e,t,i){super(new Uint32Array(e),t,i)}};var lt=class extends tn{constructor(e,t,i){super(new Float32Array(e),t,i)}};var w0=0,vn=new et,Ml=new Et,xr=new P,cn=new dn,ys=new dn,Ut=new P,Ft=class n extends yi{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:w0++}),this.uuid=Wr(),this.name="",this.type="BufferGeometry",this.index=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new($f(e)?Ko:Jo)(e,1):this.index=e,this}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,i=0){this.groups.push({start:e,count:t,materialIndex:i})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){let t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);let i=this.attributes.normal;if(i!==void 0){let s=new Ve().getNormalMatrix(e);i.applyNormalMatrix(s),i.needsUpdate=!0}let r=this.attributes.tangent;return r!==void 0&&(r.transformDirection(e),r.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(e){return vn.makeRotationFromQuaternion(e),this.applyMatrix4(vn),this}rotateX(e){return vn.makeRotationX(e),this.applyMatrix4(vn),this}rotateY(e){return vn.makeRotationY(e),this.applyMatrix4(vn),this}rotateZ(e){return vn.makeRotationZ(e),this.applyMatrix4(vn),this}translate(e,t,i){return vn.makeTranslation(e,t,i),this.applyMatrix4(vn),this}scale(e,t,i){return vn.makeScale(e,t,i),this.applyMatrix4(vn),this}lookAt(e){return Ml.lookAt(e),Ml.updateMatrix(),this.applyMatrix4(Ml.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(xr).negate(),this.translate(xr.x,xr.y,xr.z),this}setFromPoints(e){let t=[];for(let i=0,r=e.length;i<r;i++){let s=e[i];t.push(s.x,s.y,s.z||0)}return this.setAttribute("position",new lt(t,3)),this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new dn);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error('THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box. Alternatively set "mesh.frustumCulled" to "false".',this),this.boundingBox.set(new P(-1/0,-1/0,-1/0),new P(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let i=0,r=t.length;i<r;i++){let s=t[i];cn.setFromBufferAttribute(s),this.morphTargetsRelative?(Ut.addVectors(this.boundingBox.min,cn.min),this.boundingBox.expandByPoint(Ut),Ut.addVectors(this.boundingBox.max,cn.max),this.boundingBox.expandByPoint(Ut)):(this.boundingBox.expandByPoint(cn.min),this.boundingBox.expandByPoint(cn.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Wi);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error('THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere. Alternatively set "mesh.frustumCulled" to "false".',this),this.boundingSphere.set(new P,1/0);return}if(e){let i=this.boundingSphere.center;if(cn.setFromBufferAttribute(e),t)for(let s=0,a=t.length;s<a;s++){let o=t[s];ys.setFromBufferAttribute(o),this.morphTargetsRelative?(Ut.addVectors(cn.min,ys.min),cn.expandByPoint(Ut),Ut.addVectors(cn.max,ys.max),cn.expandByPoint(Ut)):(cn.expandByPoint(ys.min),cn.expandByPoint(ys.max))}cn.getCenter(i);let r=0;for(let s=0,a=e.count;s<a;s++)Ut.fromBufferAttribute(e,s),r=Math.max(r,i.distanceToSquared(Ut));if(t)for(let s=0,a=t.length;s<a;s++){let o=t[s],l=this.morphTargetsRelative;for(let c=0,h=o.count;c<h;c++)Ut.fromBufferAttribute(o,c),l&&(xr.fromBufferAttribute(e,c),Ut.add(xr)),r=Math.max(r,i.distanceToSquared(Ut))}this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){let e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}let i=e.array,r=t.position.array,s=t.normal.array,a=t.uv.array,o=r.length/3;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new tn(new Float32Array(4*o),4));let l=this.getAttribute("tangent").array,c=[],h=[];for(let S=0;S<o;S++)c[S]=new P,h[S]=new P;let u=new P,f=new P,d=new P,p=new ce,y=new ce,g=new ce,m=new P,_=new P;function x(S,I,O){u.fromArray(r,S*3),f.fromArray(r,I*3),d.fromArray(r,O*3),p.fromArray(a,S*2),y.fromArray(a,I*2),g.fromArray(a,O*2),f.sub(u),d.sub(u),y.sub(p),g.sub(p);let k=1/(y.x*g.y-g.x*y.y);isFinite(k)&&(m.copy(f).multiplyScalar(g.y).addScaledVector(d,-y.y).multiplyScalar(k),_.copy(d).multiplyScalar(y.x).addScaledVector(f,-g.x).multiplyScalar(k),c[S].add(m),c[I].add(m),c[O].add(m),h[S].add(_),h[I].add(_),h[O].add(_))}let v=this.groups;v.length===0&&(v=[{start:0,count:i.length}]);for(let S=0,I=v.length;S<I;++S){let O=v[S],k=O.start,L=O.count;for(let U=k,F=k+L;U<F;U+=3)x(i[U+0],i[U+1],i[U+2])}let E=new P,w=new P,M=new P,T=new P;function b(S){M.fromArray(s,S*3),T.copy(M);let I=c[S];E.copy(I),E.sub(M.multiplyScalar(M.dot(I))).normalize(),w.crossVectors(T,I);let k=w.dot(h[S])<0?-1:1;l[S*4]=E.x,l[S*4+1]=E.y,l[S*4+2]=E.z,l[S*4+3]=k}for(let S=0,I=v.length;S<I;++S){let O=v[S],k=O.start,L=O.count;for(let U=k,F=k+L;U<F;U+=3)b(i[U+0]),b(i[U+1]),b(i[U+2])}}computeVertexNormals(){let e=this.index,t=this.getAttribute("position");if(t!==void 0){let i=this.getAttribute("normal");if(i===void 0)i=new tn(new Float32Array(t.count*3),3),this.setAttribute("normal",i);else for(let f=0,d=i.count;f<d;f++)i.setXYZ(f,0,0,0);let r=new P,s=new P,a=new P,o=new P,l=new P,c=new P,h=new P,u=new P;if(e)for(let f=0,d=e.count;f<d;f+=3){let p=e.getX(f+0),y=e.getX(f+1),g=e.getX(f+2);r.fromBufferAttribute(t,p),s.fromBufferAttribute(t,y),a.fromBufferAttribute(t,g),h.subVectors(a,s),u.subVectors(r,s),h.cross(u),o.fromBufferAttribute(i,p),l.fromBufferAttribute(i,y),c.fromBufferAttribute(i,g),o.add(h),l.add(h),c.add(h),i.setXYZ(p,o.x,o.y,o.z),i.setXYZ(y,l.x,l.y,l.z),i.setXYZ(g,c.x,c.y,c.z)}else for(let f=0,d=t.count;f<d;f+=3)r.fromBufferAttribute(t,f+0),s.fromBufferAttribute(t,f+1),a.fromBufferAttribute(t,f+2),h.subVectors(a,s),u.subVectors(r,s),h.cross(u),i.setXYZ(f+0,h.x,h.y,h.z),i.setXYZ(f+1,h.x,h.y,h.z),i.setXYZ(f+2,h.x,h.y,h.z);this.normalizeNormals(),i.needsUpdate=!0}}normalizeNormals(){let e=this.attributes.normal;for(let t=0,i=e.count;t<i;t++)Ut.fromBufferAttribute(e,t),Ut.normalize(),e.setXYZ(t,Ut.x,Ut.y,Ut.z)}toNonIndexed(){function e(o,l){let c=o.array,h=o.itemSize,u=o.normalized,f=new c.constructor(l.length*h),d=0,p=0;for(let y=0,g=l.length;y<g;y++){o.isInterleavedBufferAttribute?d=l[y]*o.data.stride+o.offset:d=l[y]*h;for(let m=0;m<h;m++)f[p++]=c[d++]}return new tn(f,h,u)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;let t=new n,i=this.index.array,r=this.attributes;for(let o in r){let l=r[o],c=e(l,i);t.setAttribute(o,c)}let s=this.morphAttributes;for(let o in s){let l=[],c=s[o];for(let h=0,u=c.length;h<u;h++){let f=c[h],d=e(f,i);l.push(d)}t.morphAttributes[o]=l}t.morphTargetsRelative=this.morphTargetsRelative;let a=this.groups;for(let o=0,l=a.length;o<l;o++){let c=a[o];t.addGroup(c.start,c.count,c.materialIndex)}return t}toJSON(){let e={metadata:{version:4.6,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0){let l=this.parameters;for(let c in l)l[c]!==void 0&&(e[c]=l[c]);return e}e.data={attributes:{}};let t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});let i=this.attributes;for(let l in i){let c=i[l];e.data.attributes[l]=c.toJSON(e.data)}let r={},s=!1;for(let l in this.morphAttributes){let c=this.morphAttributes[l],h=[];for(let u=0,f=c.length;u<f;u++){let d=c[u];h.push(d.toJSON(e.data))}h.length>0&&(r[l]=h,s=!0)}s&&(e.data.morphAttributes=r,e.data.morphTargetsRelative=this.morphTargetsRelative);let a=this.groups;a.length>0&&(e.data.groups=JSON.parse(JSON.stringify(a)));let o=this.boundingSphere;return o!==null&&(e.data.boundingSphere={center:o.center.toArray(),radius:o.radius}),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let t={};this.name=e.name;let i=e.index;i!==null&&this.setIndex(i.clone(t));let r=e.attributes;for(let c in r){let h=r[c];this.setAttribute(c,h.clone(t))}let s=e.morphAttributes;for(let c in s){let h=[],u=s[c];for(let f=0,d=u.length;f<d;f++)h.push(u[f].clone(t));this.morphAttributes[c]=h}this.morphTargetsRelative=e.morphTargetsRelative;let a=e.groups;for(let c=0,h=a.length;c<h;c++){let u=a[c];this.addGroup(u.start,u.count,u.materialIndex)}let o=e.boundingBox;o!==null&&(this.boundingBox=o.clone());let l=e.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}},Yu=new et,Li=new Ss,go=new Wi,$u=new P,_r=new P,vr=new P,br=new P,wl=new P,yo=new P,xo=new ce,_o=new ce,vo=new ce,ju=new P,Zu=new P,Ju=new P,bo=new P,Mo=new P,St=class extends Et{constructor(e=new Ft,t=new Vn){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){let t=this.geometry.morphAttributes,i=Object.keys(t);if(i.length>0){let r=t[i[0]];if(r!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,a=r.length;s<a;s++){let o=r[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=s}}}}getVertexPosition(e,t){let i=this.geometry,r=i.attributes.position,s=i.morphAttributes.position,a=i.morphTargetsRelative;t.fromBufferAttribute(r,e);let o=this.morphTargetInfluences;if(s&&o){yo.set(0,0,0);for(let l=0,c=s.length;l<c;l++){let h=o[l],u=s[l];h!==0&&(wl.fromBufferAttribute(u,e),a?yo.addScaledVector(wl,h):yo.addScaledVector(wl.sub(t),h))}t.add(yo)}return t}raycast(e,t){let i=this.geometry,r=this.material,s=this.matrixWorld;r!==void 0&&(i.boundingSphere===null&&i.computeBoundingSphere(),go.copy(i.boundingSphere),go.applyMatrix4(s),Li.copy(e.ray).recast(e.near),!(go.containsPoint(Li.origin)===!1&&(Li.intersectSphere(go,$u)===null||Li.origin.distanceToSquared($u)>(e.far-e.near)**2))&&(Yu.copy(s).invert(),Li.copy(e.ray).applyMatrix4(Yu),!(i.boundingBox!==null&&Li.intersectsBox(i.boundingBox)===!1)&&this._computeIntersections(e,t,Li)))}_computeIntersections(e,t,i){let r,s=this.geometry,a=this.material,o=s.index,l=s.attributes.position,c=s.attributes.uv,h=s.attributes.uv1,u=s.attributes.normal,f=s.groups,d=s.drawRange;if(o!==null)if(Array.isArray(a))for(let p=0,y=f.length;p<y;p++){let g=f[p],m=a[g.materialIndex],_=Math.max(g.start,d.start),x=Math.min(o.count,Math.min(g.start+g.count,d.start+d.count));for(let v=_,E=x;v<E;v+=3){let w=o.getX(v),M=o.getX(v+1),T=o.getX(v+2);r=wo(this,m,e,i,c,h,u,w,M,T),r&&(r.faceIndex=Math.floor(v/3),r.face.materialIndex=g.materialIndex,t.push(r))}}else{let p=Math.max(0,d.start),y=Math.min(o.count,d.start+d.count);for(let g=p,m=y;g<m;g+=3){let _=o.getX(g),x=o.getX(g+1),v=o.getX(g+2);r=wo(this,a,e,i,c,h,u,_,x,v),r&&(r.faceIndex=Math.floor(g/3),t.push(r))}}else if(l!==void 0)if(Array.isArray(a))for(let p=0,y=f.length;p<y;p++){let g=f[p],m=a[g.materialIndex],_=Math.max(g.start,d.start),x=Math.min(l.count,Math.min(g.start+g.count,d.start+d.count));for(let v=_,E=x;v<E;v+=3){let w=v,M=v+1,T=v+2;r=wo(this,m,e,i,c,h,u,w,M,T),r&&(r.faceIndex=Math.floor(v/3),r.face.materialIndex=g.materialIndex,t.push(r))}}else{let p=Math.max(0,d.start),y=Math.min(l.count,d.start+d.count);for(let g=p,m=y;g<m;g+=3){let _=g,x=g+1,v=g+2;r=wo(this,a,e,i,c,h,u,_,x,v),r&&(r.faceIndex=Math.floor(g/3),t.push(r))}}}};function S0(n,e,t,i,r,s,a,o){let l;if(e.side===en?l=i.intersectTriangle(a,s,r,!0,o):l=i.intersectTriangle(r,s,a,e.side===Qt,o),l===null)return null;Mo.copy(o),Mo.applyMatrix4(n.matrixWorld);let c=t.ray.origin.distanceTo(Mo);return c<t.near||c>t.far?null:{distance:c,point:Mo.clone(),object:n}}function wo(n,e,t,i,r,s,a,o,l,c){n.getVertexPosition(o,_r),n.getVertexPosition(l,vr),n.getVertexPosition(c,br);let h=S0(n,e,t,i,_r,vr,br,bo);if(h){r&&(xo.fromBufferAttribute(r,o),_o.fromBufferAttribute(r,l),vo.fromBufferAttribute(r,c),h.uv=Fi.getInterpolation(bo,_r,vr,br,xo,_o,vo,new ce)),s&&(xo.fromBufferAttribute(s,o),_o.fromBufferAttribute(s,l),vo.fromBufferAttribute(s,c),h.uv1=Fi.getInterpolation(bo,_r,vr,br,xo,_o,vo,new ce),h.uv2=h.uv1),a&&(ju.fromBufferAttribute(a,o),Zu.fromBufferAttribute(a,l),Ju.fromBufferAttribute(a,c),h.normal=Fi.getInterpolation(bo,_r,vr,br,ju,Zu,Ju,new P),h.normal.dot(i.direction)>0&&h.normal.multiplyScalar(-1));let u={a:o,b:l,c,normal:new P,materialIndex:0};Fi.getNormal(_r,vr,br,u.normal),h.face=u}return h}var Es=class n extends Ft{constructor(e=1,t=1,i=1,r=1,s=1,a=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:i,widthSegments:r,heightSegments:s,depthSegments:a};let o=this;r=Math.floor(r),s=Math.floor(s),a=Math.floor(a);let l=[],c=[],h=[],u=[],f=0,d=0;p("z","y","x",-1,-1,i,t,e,a,s,0),p("z","y","x",1,-1,i,t,-e,a,s,1),p("x","z","y",1,1,e,i,t,r,a,2),p("x","z","y",1,-1,e,i,-t,r,a,3),p("x","y","z",1,-1,e,t,i,r,s,4),p("x","y","z",-1,-1,e,t,-i,r,s,5),this.setIndex(l),this.setAttribute("position",new lt(c,3)),this.setAttribute("normal",new lt(h,3)),this.setAttribute("uv",new lt(u,2));function p(y,g,m,_,x,v,E,w,M,T,b){let S=v/M,I=E/T,O=v/2,k=E/2,L=w/2,U=M+1,F=T+1,H=0,N=0,B=new P;for(let $=0;$<F;$++){let J=$*I-k;for(let re=0;re<U;re++){let Y=re*S-O;B[y]=Y*_,B[g]=J*x,B[m]=L,c.push(B.x,B.y,B.z),B[y]=0,B[g]=0,B[m]=w>0?1:-1,h.push(B.x,B.y,B.z),u.push(re/M),u.push(1-$/T),H+=1}}for(let $=0;$<T;$++)for(let J=0;J<M;J++){let re=f+J+U*$,Y=f+J+U*($+1),Z=f+(J+1)+U*($+1),le=f+(J+1)+U*$;l.push(re,Y,le),l.push(Y,Z,le),N+=6}o.addGroup(d,N,b),d+=N,f+=H}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new n(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}};function Fr(n){let e={};for(let t in n){e[t]={};for(let i in n[t]){let r=n[t][i];r&&(r.isColor||r.isMatrix3||r.isMatrix4||r.isVector2||r.isVector3||r.isVector4||r.isTexture||r.isQuaternion)?r.isRenderTargetTexture?(console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][i]=null):e[t][i]=r.clone():Array.isArray(r)?e[t][i]=r.slice():e[t][i]=r}}return e}function Kt(n){let e={};for(let t=0;t<n.length;t++){let i=Fr(n[t]);for(let r in i)e[r]=i[r]}return e}function E0(n){let e=[];for(let t=0;t<n.length;t++)e.push(n[t].clone());return e}function Zf(n){return n.getRenderTarget()===null?n.outputColorSpace:Qe.workingColorSpace}var A0={clone:Fr,merge:Kt},T0=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,R0=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,wn=class extends Hn{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=T0,this.fragmentShader=R0,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={derivatives:!1,fragDepth:!1,drawBuffers:!1,shaderTextureLOD:!1,clipCullDistance:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=Fr(e.uniforms),this.uniformsGroups=E0(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this}toJSON(e){let t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(let r in this.uniforms){let a=this.uniforms[r].value;a&&a.isTexture?t.uniforms[r]={type:"t",value:a.toJSON(e).uuid}:a&&a.isColor?t.uniforms[r]={type:"c",value:a.getHex()}:a&&a.isVector2?t.uniforms[r]={type:"v2",value:a.toArray()}:a&&a.isVector3?t.uniforms[r]={type:"v3",value:a.toArray()}:a&&a.isVector4?t.uniforms[r]={type:"v4",value:a.toArray()}:a&&a.isMatrix3?t.uniforms[r]={type:"m3",value:a.toArray()}:a&&a.isMatrix4?t.uniforms[r]={type:"m4",value:a.toArray()}:t.uniforms[r]={value:a}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;let i={};for(let r in this.extensions)this.extensions[r]===!0&&(i[r]=!0);return Object.keys(i).length>0&&(t.extensions=i),t}},Qo=class extends Et{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new et,this.projectionMatrix=new et,this.projectionMatrixInverse=new et,this.coordinateSystem=ti}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(e,t){super.updateWorldMatrix(e,t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}},Bt=class extends Qo{constructor(e=50,t=1,i=.1,r=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=i,this.far=r,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){let t=.5*this.getFilmHeight()/e;this.fov=Or*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){let e=Math.tan(Ir*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return Or*2*Math.atan(Math.tan(Ir*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}setViewOffset(e,t,i,r,s,a){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=i,this.view.offsetY=r,this.view.width=s,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=this.near,t=e*Math.tan(Ir*.5*this.fov)/this.zoom,i=2*t,r=this.aspect*i,s=-.5*r,a=this.view;if(this.view!==null&&this.view.enabled){let l=a.fullWidth,c=a.fullHeight;s+=a.offsetX*r/l,t-=a.offsetY*i/c,r*=a.width/l,i*=a.height/c}let o=this.filmOffset;o!==0&&(s+=e*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(s,s+r,t,t-i,e,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}},Mr=-90,wr=1,ql=class extends Et{constructor(e,t,i){super(),this.type="CubeCamera",this.renderTarget=i,this.coordinateSystem=null,this.activeMipmapLevel=0;let r=new Bt(Mr,wr,e,t);r.layers=this.layers,this.add(r);let s=new Bt(Mr,wr,e,t);s.layers=this.layers,this.add(s);let a=new Bt(Mr,wr,e,t);a.layers=this.layers,this.add(a);let o=new Bt(Mr,wr,e,t);o.layers=this.layers,this.add(o);let l=new Bt(Mr,wr,e,t);l.layers=this.layers,this.add(l);let c=new Bt(Mr,wr,e,t);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){let e=this.coordinateSystem,t=this.children.concat(),[i,r,s,a,o,l]=t;for(let c of t)this.remove(c);if(e===ti)i.up.set(0,1,0),i.lookAt(1,0,0),r.up.set(0,1,0),r.lookAt(-1,0,0),s.up.set(0,0,-1),s.lookAt(0,1,0),a.up.set(0,0,1),a.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(e===Go)i.up.set(0,-1,0),i.lookAt(-1,0,0),r.up.set(0,-1,0),r.lookAt(1,0,0),s.up.set(0,0,1),s.lookAt(0,1,0),a.up.set(0,0,-1),a.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(let c of t)this.add(c),c.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();let{renderTarget:i,activeMipmapLevel:r}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());let[s,a,o,l,c,h]=this.children,u=e.getRenderTarget(),f=e.getActiveCubeFace(),d=e.getActiveMipmapLevel(),p=e.xr.enabled;e.xr.enabled=!1;let y=i.texture.generateMipmaps;i.texture.generateMipmaps=!1,e.setRenderTarget(i,0,r),e.render(t,s),e.setRenderTarget(i,1,r),e.render(t,a),e.setRenderTarget(i,2,r),e.render(t,o),e.setRenderTarget(i,3,r),e.render(t,l),e.setRenderTarget(i,4,r),e.render(t,c),i.texture.generateMipmaps=y,e.setRenderTarget(i,5,r),e.render(t,h),e.setRenderTarget(u,f,d),e.xr.enabled=p,i.texture.needsPMREMUpdate=!0}},ea=class extends Mn{constructor(e,t,i,r,s,a,o,l,c,h){e=e!==void 0?e:[],t=t!==void 0?t:Dr,super(e,t,i,r,s,a,o,l,c,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}},Yl=class extends fn{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;let i={width:e,height:e,depth:1},r=[i,i,i,i,i,i];t.encoding!==void 0&&(vs("THREE.WebGLCubeRenderTarget: option.encoding has been replaced by option.colorSpace."),t.colorSpace=t.encoding===ki?mt:wt),this.texture=new ea(r,t.mapping,t.wrapS,t.wrapT,t.magFilter,t.minFilter,t.format,t.type,t.anisotropy,t.colorSpace),this.texture.isRenderTargetTexture=!0,this.texture.generateMipmaps=t.generateMipmaps!==void 0?t.generateMipmaps:!1,this.texture.minFilter=t.minFilter!==void 0?t.minFilter:Ct}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;let i={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},r=new Es(5,5,5),s=new wn({name:"CubemapFromEquirect",uniforms:Fr(i.uniforms),vertexShader:i.vertexShader,fragmentShader:i.fragmentShader,side:en,blending:mi});s.uniforms.tEquirect.value=t;let a=new St(r,s),o=t.minFilter;return t.minFilter===Vi&&(t.minFilter=Ct),new ql(1,10,this).update(e,a),t.minFilter=o,a.geometry.dispose(),a.material.dispose(),this}clear(e,t,i,r){let s=e.getRenderTarget();for(let a=0;a<6;a++)e.setRenderTarget(this,a),e.clear(t,i,r);e.setRenderTarget(s)}},Sl=new P,C0=new P,I0=new Ve,hn=class{constructor(e=new P(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,i,r){return this.normal.set(e,t,i),this.constant=r,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,i){let r=Sl.subVectors(i,t).cross(C0.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(r,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){let e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t){let i=e.delta(Sl),r=this.normal.dot(i);if(r===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;let s=-(e.start.dot(this.normal)+this.constant)/r;return s<0||s>1?null:t.copy(e.start).addScaledVector(i,s)}intersectsLine(e){let t=this.distanceToPoint(e.start),i=this.distanceToPoint(e.end);return t<0&&i>0||i<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){let i=t||I0.getNormalMatrix(e),r=this.coplanarPoint(Sl).applyMatrix4(e),s=this.normal.applyMatrix3(i).normalize();return this.constant=-r.dot(s),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}},Di=new Wi,So=new P,As=class{constructor(e=new hn,t=new hn,i=new hn,r=new hn,s=new hn,a=new hn){this.planes=[e,t,i,r,s,a]}set(e,t,i,r,s,a){let o=this.planes;return o[0].copy(e),o[1].copy(t),o[2].copy(i),o[3].copy(r),o[4].copy(s),o[5].copy(a),this}copy(e){let t=this.planes;for(let i=0;i<6;i++)t[i].copy(e.planes[i]);return this}setFromProjectionMatrix(e,t=ti){let i=this.planes,r=e.elements,s=r[0],a=r[1],o=r[2],l=r[3],c=r[4],h=r[5],u=r[6],f=r[7],d=r[8],p=r[9],y=r[10],g=r[11],m=r[12],_=r[13],x=r[14],v=r[15];if(i[0].setComponents(l-s,f-c,g-d,v-m).normalize(),i[1].setComponents(l+s,f+c,g+d,v+m).normalize(),i[2].setComponents(l+a,f+h,g+p,v+_).normalize(),i[3].setComponents(l-a,f-h,g-p,v-_).normalize(),i[4].setComponents(l-o,f-u,g-y,v-x).normalize(),t===ti)i[5].setComponents(l+o,f+u,g+y,v+x).normalize();else if(t===Go)i[5].setComponents(o,u,y,x).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),Di.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{let t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),Di.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(Di)}intersectsSprite(e){return Di.center.set(0,0,0),Di.radius=.7071067811865476,Di.applyMatrix4(e.matrixWorld),this.intersectsSphere(Di)}intersectsSphere(e){let t=this.planes,i=e.center,r=-e.radius;for(let s=0;s<6;s++)if(t[s].distanceToPoint(i)<r)return!1;return!0}intersectsBox(e){let t=this.planes;for(let i=0;i<6;i++){let r=t[i];if(So.x=r.normal.x>0?e.max.x:e.min.x,So.y=r.normal.y>0?e.max.y:e.min.y,So.z=r.normal.z>0?e.max.z:e.min.z,r.distanceToPoint(So)<0)return!1}return!0}containsPoint(e){let t=this.planes;for(let i=0;i<6;i++)if(t[i].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}};function Jf(){let n=null,e=!1,t=null,i=null;function r(s,a){t(s,a),i=n.requestAnimationFrame(r)}return{start:function(){e!==!0&&t!==null&&(i=n.requestAnimationFrame(r),e=!0)},stop:function(){n.cancelAnimationFrame(i),e=!1},setAnimationLoop:function(s){t=s},setContext:function(s){n=s}}}function P0(n,e){let t=e.isWebGL2,i=new WeakMap;function r(c,h){let u=c.array,f=c.usage,d=u.byteLength,p=n.createBuffer();n.bindBuffer(h,p),n.bufferData(h,u,f),c.onUploadCallback();let y;if(u instanceof Float32Array)y=n.FLOAT;else if(u instanceof Uint16Array)if(c.isFloat16BufferAttribute)if(t)y=n.HALF_FLOAT;else throw new Error("THREE.WebGLAttributes: Usage of Float16BufferAttribute requires WebGL2.");else y=n.UNSIGNED_SHORT;else if(u instanceof Int16Array)y=n.SHORT;else if(u instanceof Uint32Array)y=n.UNSIGNED_INT;else if(u instanceof Int32Array)y=n.INT;else if(u instanceof Int8Array)y=n.BYTE;else if(u instanceof Uint8Array)y=n.UNSIGNED_BYTE;else if(u instanceof Uint8ClampedArray)y=n.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+u);return{buffer:p,type:y,bytesPerElement:u.BYTES_PER_ELEMENT,version:c.version,size:d}}function s(c,h,u){let f=h.array,d=h._updateRange,p=h.updateRanges;if(n.bindBuffer(u,c),d.count===-1&&p.length===0&&n.bufferSubData(u,0,f),p.length!==0){for(let y=0,g=p.length;y<g;y++){let m=p[y];t?n.bufferSubData(u,m.start*f.BYTES_PER_ELEMENT,f,m.start,m.count):n.bufferSubData(u,m.start*f.BYTES_PER_ELEMENT,f.subarray(m.start,m.start+m.count))}h.clearUpdateRanges()}d.count!==-1&&(t?n.bufferSubData(u,d.offset*f.BYTES_PER_ELEMENT,f,d.offset,d.count):n.bufferSubData(u,d.offset*f.BYTES_PER_ELEMENT,f.subarray(d.offset,d.offset+d.count)),d.count=-1),h.onUploadCallback()}function a(c){return c.isInterleavedBufferAttribute&&(c=c.data),i.get(c)}function o(c){c.isInterleavedBufferAttribute&&(c=c.data);let h=i.get(c);h&&(n.deleteBuffer(h.buffer),i.delete(c))}function l(c,h){if(c.isGLBufferAttribute){let f=i.get(c);(!f||f.version<c.version)&&i.set(c,{buffer:c.buffer,type:c.type,bytesPerElement:c.elementSize,version:c.version});return}c.isInterleavedBufferAttribute&&(c=c.data);let u=i.get(c);if(u===void 0)i.set(c,r(c,h));else if(u.version<c.version){if(u.size!==c.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");s(u.buffer,c,h),u.version=c.version}}return{get:a,remove:o,update:l}}var ii=class n extends Ft{constructor(e=1,t=1,i=1,r=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:i,heightSegments:r};let s=e/2,a=t/2,o=Math.floor(i),l=Math.floor(r),c=o+1,h=l+1,u=e/o,f=t/l,d=[],p=[],y=[],g=[];for(let m=0;m<h;m++){let _=m*f-a;for(let x=0;x<c;x++){let v=x*u-s;p.push(v,-_,0),y.push(0,0,1),g.push(x/o),g.push(1-m/l)}}for(let m=0;m<l;m++)for(let _=0;_<o;_++){let x=_+c*m,v=_+c*(m+1),E=_+1+c*(m+1),w=_+1+c*m;d.push(x,v,w),d.push(v,E,w)}this.setIndex(d),this.setAttribute("position",new lt(p,3)),this.setAttribute("normal",new lt(y,3)),this.setAttribute("uv",new lt(g,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new n(e.width,e.height,e.widthSegments,e.heightSegments)}},L0=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,D0=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,N0=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,U0=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,O0=`#ifdef USE_ALPHATEST
	if ( diffuseColor.a < alphaTest ) discard;
#endif`,F0=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,z0=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,B0=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,k0=`#ifdef USE_BATCHING
	attribute float batchId;
	uniform highp sampler2D batchingTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,H0=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( batchId );
#endif`,V0=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,G0=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,W0=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,X0=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,q0=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,Y0=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#pragma unroll_loop_start
	for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
		plane = clippingPlanes[ i ];
		if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
	}
	#pragma unroll_loop_end
	#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
		bool clipped = true;
		#pragma unroll_loop_start
		for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
		}
		#pragma unroll_loop_end
		if ( clipped ) discard;
	#endif
#endif`,$0=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,j0=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,Z0=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,J0=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,K0=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,Q0=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
	varying vec3 vColor;
#endif`,eg=`#if defined( USE_COLOR_ALPHA )
	vColor = vec4( 1.0 );
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
	vColor = vec3( 1.0 );
#endif
#ifdef USE_COLOR
	vColor *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.xyz *= instanceColor.xyz;
#endif`,tg=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
mat3 transposeMat3( const in mat3 m ) {
	mat3 tmp;
	tmp[ 0 ] = vec3( m[ 0 ].x, m[ 1 ].x, m[ 2 ].x );
	tmp[ 1 ] = vec3( m[ 0 ].y, m[ 1 ].y, m[ 2 ].y );
	tmp[ 2 ] = vec3( m[ 0 ].z, m[ 1 ].z, m[ 2 ].z );
	return tmp;
}
float luminance( const in vec3 rgb ) {
	const vec3 weights = vec3( 0.2126729, 0.7151522, 0.0721750 );
	return dot( weights, rgb );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,ng=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,ig=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,rg=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,sg=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,og=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,ag=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,lg="gl_FragColor = linearToOutputTexel( gl_FragColor );",cg=`
const mat3 LINEAR_SRGB_TO_LINEAR_DISPLAY_P3 = mat3(
	vec3( 0.8224621, 0.177538, 0.0 ),
	vec3( 0.0331941, 0.9668058, 0.0 ),
	vec3( 0.0170827, 0.0723974, 0.9105199 )
);
const mat3 LINEAR_DISPLAY_P3_TO_LINEAR_SRGB = mat3(
	vec3( 1.2249401, - 0.2249404, 0.0 ),
	vec3( - 0.0420569, 1.0420571, 0.0 ),
	vec3( - 0.0196376, - 0.0786361, 1.0982735 )
);
vec4 LinearSRGBToLinearDisplayP3( in vec4 value ) {
	return vec4( value.rgb * LINEAR_SRGB_TO_LINEAR_DISPLAY_P3, value.a );
}
vec4 LinearDisplayP3ToLinearSRGB( in vec4 value ) {
	return vec4( value.rgb * LINEAR_DISPLAY_P3_TO_LINEAR_SRGB, value.a );
}
vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}
vec4 LinearToLinear( in vec4 value ) {
	return value;
}
vec4 LinearTosRGB( in vec4 value ) {
	return sRGBTransferOETF( value );
}`,hg=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
	#else
		vec4 envColor = vec4( 0.0 );
	#endif
	#ifdef ENVMAP_BLENDING_MULTIPLY
		outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_MIX )
		outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_ADD )
		outgoingLight += envColor.xyz * specularStrength * reflectivity;
	#endif
#endif`,ug=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,fg=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,dg=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,pg=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,mg=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,gg=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,yg=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,xg=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,_g=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,vg=`#ifdef USE_LIGHTMAP
	vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
	vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
	reflectedLight.indirectDiffuse += lightMapIrradiance;
#endif`,bg=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,Mg=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,wg=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,Sg=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	#if defined ( LEGACY_LIGHTS )
		if ( cutoffDistance > 0.0 && decayExponent > 0.0 ) {
			return pow( saturate( - lightDistance / cutoffDistance + 1.0 ), decayExponent );
		}
		return 1.0;
	#else
		float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
		if ( cutoffDistance > 0.0 ) {
			distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
		}
		return distanceFalloff;
	#endif
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif`,Eg=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, roughness * roughness) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,Ag=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,Tg=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,Rg=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,Cg=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,Ig=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb * ( 1.0 - metalnessFactor );
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = mix( min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = mix( vec3( 0.04 ), diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.07, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,Pg=`struct PhysicalMaterial {
	vec3 diffuseColor;
	float roughness;
	vec3 specularColor;
	float specularF90;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		float v = 0.5 / ( gv + gl );
		return saturate(v);
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColor;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transposeMat3( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float a = roughness < 0.25 ? -339.2 * r2 + 161.4 * roughness - 25.9 : -8.48 * r2 + 14.3 * roughness - 9.95;
	float b = roughness < 0.25 ? 44.0 * r2 - 23.7 * roughness + 3.26 : 1.97 * r2 - 3.27 * roughness + 0.72;
	float DG = exp( a * dotNV + b ) + ( roughness < 0.25 ? 0.0 : 0.1 * ( roughness - 0.25 ) );
	return saturate( DG * RECIPROCAL_PI );
}
vec2 DFGApprox( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	const vec4 c0 = vec4( - 1, - 0.0275, - 0.572, 0.022 );
	const vec4 c1 = vec4( 1, 0.0425, 1.04, - 0.04 );
	vec4 r = roughness * c0 + c1;
	float a004 = min( r.x * r.x, exp2( - 9.28 * dotNV ) ) * r.x + r.y;
	vec2 fab = vec2( - 1.04, 1.04 ) * a004 + r.zw;
	return fab;
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColor * t2.x + ( vec3( 1.0 ) - material.specularColor ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseColor * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
	#endif
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnel, material.roughness, singleScattering, multiScattering );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScattering, multiScattering );
	#endif
	vec3 totalScattering = singleScattering + multiScattering;
	vec3 diffuse = material.diffuseColor * ( 1.0 - max( max( totalScattering.r, totalScattering.g ), totalScattering.b ) );
	reflectedLight.indirectSpecular += radiance * singleScattering;
	reflectedLight.indirectSpecular += multiScattering * cosineWeightedIrradiance;
	reflectedLight.indirectDiffuse += diffuse * cosineWeightedIrradiance;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,Lg=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnel = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,Dg=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )
		iblIrradiance += getIBLIrradiance( geometryNormal );
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,Ng=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,Ug=`#if defined( USE_LOGDEPTHBUF ) && defined( USE_LOGDEPTHBUF_EXT )
	gl_FragDepthEXT = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,Og=`#if defined( USE_LOGDEPTHBUF ) && defined( USE_LOGDEPTHBUF_EXT )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Fg=`#ifdef USE_LOGDEPTHBUF
	#ifdef USE_LOGDEPTHBUF_EXT
		varying float vFragDepth;
		varying float vIsPerspective;
	#else
		uniform float logDepthBufFC;
	#endif
#endif`,zg=`#ifdef USE_LOGDEPTHBUF
	#ifdef USE_LOGDEPTHBUF_EXT
		vFragDepth = 1.0 + gl_Position.w;
		vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
	#else
		if ( isPerspectiveMatrix( projectionMatrix ) ) {
			gl_Position.z = log2( max( EPSILON, gl_Position.w + 1.0 ) ) * logDepthBufFC - 1.0;
			gl_Position.z *= gl_Position.w;
		}
	#endif
#endif`,Bg=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = vec4( mix( pow( sampledDiffuseColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), sampledDiffuseColor.rgb * 0.0773993808, vec3( lessThanEqual( sampledDiffuseColor.rgb, vec3( 0.04045 ) ) ) ), sampledDiffuseColor.w );
	
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,kg=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,Hg=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,Vg=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Gg=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,Wg=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,Xg=`#if defined( USE_MORPHCOLORS ) && defined( MORPHTARGETS_TEXTURE )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,qg=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	#ifdef MORPHTARGETS_TEXTURE
		for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
			if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
		}
	#else
		objectNormal += morphNormal0 * morphTargetInfluences[ 0 ];
		objectNormal += morphNormal1 * morphTargetInfluences[ 1 ];
		objectNormal += morphNormal2 * morphTargetInfluences[ 2 ];
		objectNormal += morphNormal3 * morphTargetInfluences[ 3 ];
	#endif
#endif`,Yg=`#ifdef USE_MORPHTARGETS
	uniform float morphTargetBaseInfluence;
	#ifdef MORPHTARGETS_TEXTURE
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
		uniform sampler2DArray morphTargetsTexture;
		uniform ivec2 morphTargetsTextureSize;
		vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
			int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
			int y = texelIndex / morphTargetsTextureSize.x;
			int x = texelIndex - y * morphTargetsTextureSize.x;
			ivec3 morphUV = ivec3( x, y, morphTargetIndex );
			return texelFetch( morphTargetsTexture, morphUV, 0 );
		}
	#else
		#ifndef USE_MORPHNORMALS
			uniform float morphTargetInfluences[ 8 ];
		#else
			uniform float morphTargetInfluences[ 4 ];
		#endif
	#endif
#endif`,$g=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	#ifdef MORPHTARGETS_TEXTURE
		for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
			if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
		}
	#else
		transformed += morphTarget0 * morphTargetInfluences[ 0 ];
		transformed += morphTarget1 * morphTargetInfluences[ 1 ];
		transformed += morphTarget2 * morphTargetInfluences[ 2 ];
		transformed += morphTarget3 * morphTargetInfluences[ 3 ];
		#ifndef USE_MORPHNORMALS
			transformed += morphTarget4 * morphTargetInfluences[ 4 ];
			transformed += morphTarget5 * morphTargetInfluences[ 5 ];
			transformed += morphTarget6 * morphTargetInfluences[ 6 ];
			transformed += morphTarget7 * morphTargetInfluences[ 7 ];
		#endif
	#endif
#endif`,jg=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,Zg=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,Jg=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Kg=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Qg=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,ey=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,ty=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,ny=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,iy=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,ry=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,sy=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,oy=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;
const vec3 PackFactors = vec3( 256. * 256. * 256., 256. * 256., 256. );
const vec4 UnpackFactors = UnpackDownscale / vec4( PackFactors, 1. );
const float ShiftRight8 = 1. / 256.;
vec4 packDepthToRGBA( const in float v ) {
	vec4 r = vec4( fract( v * PackFactors ), v );
	r.yzw -= r.xyz * ShiftRight8;	return r * PackUpscale;
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors );
}
vec2 packDepthToRG( in highp float v ) {
	return packDepthToRGBA( v ).yx;
}
float unpackRGToDepth( const in highp vec2 v ) {
	return unpackRGBAToDepth( vec4( v.xy, 0.0, 0.0 ) );
}
vec4 pack2HalfToRGBA( vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return depth * ( near - far ) - near;
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return ( near * far ) / ( ( far - near ) * depth - far );
}`,ay=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,ly=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,cy=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,hy=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,uy=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,fy=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,dy=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		struct SpotLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform sampler2D pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	float texture2DCompare( sampler2D depths, vec2 uv, float compare ) {
		return step( compare, unpackRGBAToDepth( texture2D( depths, uv ) ) );
	}
	vec2 texture2DDistribution( sampler2D shadow, vec2 uv ) {
		return unpackRGBATo2Half( texture2D( shadow, uv ) );
	}
	float VSMShadow (sampler2D shadow, vec2 uv, float compare ){
		float occlusion = 1.0;
		vec2 distribution = texture2DDistribution( shadow, uv );
		float hard_shadow = step( compare , distribution.x );
		if (hard_shadow != 1.0 ) {
			float distance = compare - distribution.x ;
			float variance = max( 0.00000, distribution.y * distribution.y );
			float softness_probability = variance / (variance + distance * distance );			softness_probability = clamp( ( softness_probability - 0.3 ) / ( 0.95 - 0.3 ), 0.0, 1.0 );			occlusion = clamp( max( hard_shadow, softness_probability ), 0.0, 1.0 );
		}
		return occlusion;
	}
	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
		float shadow = 1.0;
		shadowCoord.xyz /= shadowCoord.w;
		shadowCoord.z += shadowBias;
		bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
		bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
		if ( frustumTest ) {
		#if defined( SHADOWMAP_TYPE_PCF )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx0 = - texelSize.x * shadowRadius;
			float dy0 = - texelSize.y * shadowRadius;
			float dx1 = + texelSize.x * shadowRadius;
			float dy1 = + texelSize.y * shadowRadius;
			float dx2 = dx0 / 2.0;
			float dy2 = dy0 / 2.0;
			float dx3 = dx1 / 2.0;
			float dy3 = dy1 / 2.0;
			shadow = (
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
			) * ( 1.0 / 17.0 );
		#elif defined( SHADOWMAP_TYPE_PCF_SOFT )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx = texelSize.x;
			float dy = texelSize.y;
			vec2 uv = shadowCoord.xy;
			vec2 f = fract( uv * shadowMapSize + 0.5 );
			uv -= f * texelSize;
			shadow = (
				texture2DCompare( shadowMap, uv, shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( dx, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( 0.0, dy ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + texelSize, shadowCoord.z ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, 0.0 ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 0.0 ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, dy ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( 0.0, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 0.0, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( texture2DCompare( shadowMap, uv + vec2( dx, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( dx, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( mix( texture2DCompare( shadowMap, uv + vec2( -dx, -dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, -dy ), shadowCoord.z ),
						  f.x ),
					 mix( texture2DCompare( shadowMap, uv + vec2( -dx, 2.0 * dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 2.0 * dy ), shadowCoord.z ),
						  f.x ),
					 f.y )
			) * ( 1.0 / 9.0 );
		#elif defined( SHADOWMAP_TYPE_VSM )
			shadow = VSMShadow( shadowMap, shadowCoord.xy, shadowCoord.z );
		#else
			shadow = texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z );
		#endif
		}
		return shadow;
	}
	vec2 cubeToUV( vec3 v, float texelSizeY ) {
		vec3 absV = abs( v );
		float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );
		absV *= scaleToCube;
		v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );
		vec2 planar = v.xy;
		float almostATexel = 1.5 * texelSizeY;
		float almostOne = 1.0 - almostATexel;
		if ( absV.z >= almostOne ) {
			if ( v.z > 0.0 )
				planar.x = 4.0 - v.x;
		} else if ( absV.x >= almostOne ) {
			float signX = sign( v.x );
			planar.x = v.z * signX + 2.0 * signX;
		} else if ( absV.y >= almostOne ) {
			float signY = sign( v.y );
			planar.x = v.x + 2.0 * signY + 2.0;
			planar.y = v.z * signY - 2.0;
		}
		return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );
	}
	float getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		vec2 texelSize = vec2( 1.0 ) / ( shadowMapSize * vec2( 4.0, 2.0 ) );
		vec3 lightToPosition = shadowCoord.xyz;
		float dp = ( length( lightToPosition ) - shadowCameraNear ) / ( shadowCameraFar - shadowCameraNear );		dp += shadowBias;
		vec3 bd3D = normalize( lightToPosition );
		#if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT ) || defined( SHADOWMAP_TYPE_VSM )
			vec2 offset = vec2( - 1, 1 ) * shadowRadius * texelSize.y;
			return (
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyx, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyx, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxx, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp )
			) * ( 1.0 / 9.0 );
		#else
			return texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp );
		#endif
	}
#endif`,py=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,my=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,gy=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,yy=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,xy=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,_y=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,vy=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,by=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,My=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,wy=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,Sy=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 OptimizedCineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color *= toneMappingExposure;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	return color;
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,Ey=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,Ay=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
		vec3 refractedRayExit = position + transmissionRay;
		vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
		vec2 refractionCoords = ndcPos.xy / ndcPos.w;
		refractionCoords += 1.0;
		refractionCoords /= 2.0;
		vec4 transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
		vec3 transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,Ty=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,Ry=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,Cy=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,Iy=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,Py=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,Ly=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Dy=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Ny=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float flipEnvMap;
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Uy=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Oy=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Fy=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,zy=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( 1.0 );
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	float fragCoordZ = 0.5 * vHighPrecisionZW[0] / vHighPrecisionZW[1] + 0.5;
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#endif
}`,By=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,ky=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( 1.0 );
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = packDepthToRGBA( dist );
}`,Hy=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,Vy=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Gy=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Wy=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Xy=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,qy=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Yy=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,$y=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,jy=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,Zy=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Jy=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,Ky=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <packing>
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( packNormalToRGB( normal ), opacity );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,Qy=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,ex=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,tx=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,nx=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
		float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor );
		outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecularDirect + sheenSpecularIndirect;
	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,ix=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,rx=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,sx=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,ox=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,ax=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,lx=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,cx=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );
	vec2 scale;
	scale.x = length( vec3( modelMatrix[ 0 ].x, modelMatrix[ 0 ].y, modelMatrix[ 0 ].z ) );
	scale.y = length( vec3( modelMatrix[ 1 ].x, modelMatrix[ 1 ].y, modelMatrix[ 1 ].z ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,hx=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Pe={alphahash_fragment:L0,alphahash_pars_fragment:D0,alphamap_fragment:N0,alphamap_pars_fragment:U0,alphatest_fragment:O0,alphatest_pars_fragment:F0,aomap_fragment:z0,aomap_pars_fragment:B0,batching_pars_vertex:k0,batching_vertex:H0,begin_vertex:V0,beginnormal_vertex:G0,bsdfs:W0,iridescence_fragment:X0,bumpmap_pars_fragment:q0,clipping_planes_fragment:Y0,clipping_planes_pars_fragment:$0,clipping_planes_pars_vertex:j0,clipping_planes_vertex:Z0,color_fragment:J0,color_pars_fragment:K0,color_pars_vertex:Q0,color_vertex:eg,common:tg,cube_uv_reflection_fragment:ng,defaultnormal_vertex:ig,displacementmap_pars_vertex:rg,displacementmap_vertex:sg,emissivemap_fragment:og,emissivemap_pars_fragment:ag,colorspace_fragment:lg,colorspace_pars_fragment:cg,envmap_fragment:hg,envmap_common_pars_fragment:ug,envmap_pars_fragment:fg,envmap_pars_vertex:dg,envmap_physical_pars_fragment:Eg,envmap_vertex:pg,fog_vertex:mg,fog_pars_vertex:gg,fog_fragment:yg,fog_pars_fragment:xg,gradientmap_pars_fragment:_g,lightmap_fragment:vg,lightmap_pars_fragment:bg,lights_lambert_fragment:Mg,lights_lambert_pars_fragment:wg,lights_pars_begin:Sg,lights_toon_fragment:Ag,lights_toon_pars_fragment:Tg,lights_phong_fragment:Rg,lights_phong_pars_fragment:Cg,lights_physical_fragment:Ig,lights_physical_pars_fragment:Pg,lights_fragment_begin:Lg,lights_fragment_maps:Dg,lights_fragment_end:Ng,logdepthbuf_fragment:Ug,logdepthbuf_pars_fragment:Og,logdepthbuf_pars_vertex:Fg,logdepthbuf_vertex:zg,map_fragment:Bg,map_pars_fragment:kg,map_particle_fragment:Hg,map_particle_pars_fragment:Vg,metalnessmap_fragment:Gg,metalnessmap_pars_fragment:Wg,morphcolor_vertex:Xg,morphnormal_vertex:qg,morphtarget_pars_vertex:Yg,morphtarget_vertex:$g,normal_fragment_begin:jg,normal_fragment_maps:Zg,normal_pars_fragment:Jg,normal_pars_vertex:Kg,normal_vertex:Qg,normalmap_pars_fragment:ey,clearcoat_normal_fragment_begin:ty,clearcoat_normal_fragment_maps:ny,clearcoat_pars_fragment:iy,iridescence_pars_fragment:ry,opaque_fragment:sy,packing:oy,premultiplied_alpha_fragment:ay,project_vertex:ly,dithering_fragment:cy,dithering_pars_fragment:hy,roughnessmap_fragment:uy,roughnessmap_pars_fragment:fy,shadowmap_pars_fragment:dy,shadowmap_pars_vertex:py,shadowmap_vertex:my,shadowmask_pars_fragment:gy,skinbase_vertex:yy,skinning_pars_vertex:xy,skinning_vertex:_y,skinnormal_vertex:vy,specularmap_fragment:by,specularmap_pars_fragment:My,tonemapping_fragment:wy,tonemapping_pars_fragment:Sy,transmission_fragment:Ey,transmission_pars_fragment:Ay,uv_pars_fragment:Ty,uv_pars_vertex:Ry,uv_vertex:Cy,worldpos_vertex:Iy,background_vert:Py,background_frag:Ly,backgroundCube_vert:Dy,backgroundCube_frag:Ny,cube_vert:Uy,cube_frag:Oy,depth_vert:Fy,depth_frag:zy,distanceRGBA_vert:By,distanceRGBA_frag:ky,equirect_vert:Hy,equirect_frag:Vy,linedashed_vert:Gy,linedashed_frag:Wy,meshbasic_vert:Xy,meshbasic_frag:qy,meshlambert_vert:Yy,meshlambert_frag:$y,meshmatcap_vert:jy,meshmatcap_frag:Zy,meshnormal_vert:Jy,meshnormal_frag:Ky,meshphong_vert:Qy,meshphong_frag:ex,meshphysical_vert:tx,meshphysical_frag:nx,meshtoon_vert:ix,meshtoon_frag:rx,points_vert:sx,points_frag:ox,shadow_vert:ax,shadow_frag:lx,sprite_vert:cx,sprite_frag:hx},ie={common:{diffuse:{value:new ye(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Ve},alphaMap:{value:null},alphaMapTransform:{value:new Ve},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Ve}},envmap:{envMap:{value:null},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Ve}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Ve}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Ve},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Ve},normalScale:{value:new ce(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Ve},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Ve}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Ve}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Ve}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new ye(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new ye(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Ve},alphaTest:{value:0},uvTransform:{value:new Ve}},sprite:{diffuse:{value:new ye(16777215)},opacity:{value:1},center:{value:new ce(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Ve},alphaMap:{value:null},alphaMapTransform:{value:new Ve},alphaTest:{value:0}}},Bn={basic:{uniforms:Kt([ie.common,ie.specularmap,ie.envmap,ie.aomap,ie.lightmap,ie.fog]),vertexShader:Pe.meshbasic_vert,fragmentShader:Pe.meshbasic_frag},lambert:{uniforms:Kt([ie.common,ie.specularmap,ie.envmap,ie.aomap,ie.lightmap,ie.emissivemap,ie.bumpmap,ie.normalmap,ie.displacementmap,ie.fog,ie.lights,{emissive:{value:new ye(0)}}]),vertexShader:Pe.meshlambert_vert,fragmentShader:Pe.meshlambert_frag},phong:{uniforms:Kt([ie.common,ie.specularmap,ie.envmap,ie.aomap,ie.lightmap,ie.emissivemap,ie.bumpmap,ie.normalmap,ie.displacementmap,ie.fog,ie.lights,{emissive:{value:new ye(0)},specular:{value:new ye(1118481)},shininess:{value:30}}]),vertexShader:Pe.meshphong_vert,fragmentShader:Pe.meshphong_frag},standard:{uniforms:Kt([ie.common,ie.envmap,ie.aomap,ie.lightmap,ie.emissivemap,ie.bumpmap,ie.normalmap,ie.displacementmap,ie.roughnessmap,ie.metalnessmap,ie.fog,ie.lights,{emissive:{value:new ye(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Pe.meshphysical_vert,fragmentShader:Pe.meshphysical_frag},toon:{uniforms:Kt([ie.common,ie.aomap,ie.lightmap,ie.emissivemap,ie.bumpmap,ie.normalmap,ie.displacementmap,ie.gradientmap,ie.fog,ie.lights,{emissive:{value:new ye(0)}}]),vertexShader:Pe.meshtoon_vert,fragmentShader:Pe.meshtoon_frag},matcap:{uniforms:Kt([ie.common,ie.bumpmap,ie.normalmap,ie.displacementmap,ie.fog,{matcap:{value:null}}]),vertexShader:Pe.meshmatcap_vert,fragmentShader:Pe.meshmatcap_frag},points:{uniforms:Kt([ie.points,ie.fog]),vertexShader:Pe.points_vert,fragmentShader:Pe.points_frag},dashed:{uniforms:Kt([ie.common,ie.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Pe.linedashed_vert,fragmentShader:Pe.linedashed_frag},depth:{uniforms:Kt([ie.common,ie.displacementmap]),vertexShader:Pe.depth_vert,fragmentShader:Pe.depth_frag},normal:{uniforms:Kt([ie.common,ie.bumpmap,ie.normalmap,ie.displacementmap,{opacity:{value:1}}]),vertexShader:Pe.meshnormal_vert,fragmentShader:Pe.meshnormal_frag},sprite:{uniforms:Kt([ie.sprite,ie.fog]),vertexShader:Pe.sprite_vert,fragmentShader:Pe.sprite_frag},background:{uniforms:{uvTransform:{value:new Ve},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Pe.background_vert,fragmentShader:Pe.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1}},vertexShader:Pe.backgroundCube_vert,fragmentShader:Pe.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Pe.cube_vert,fragmentShader:Pe.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Pe.equirect_vert,fragmentShader:Pe.equirect_frag},distanceRGBA:{uniforms:Kt([ie.common,ie.displacementmap,{referencePosition:{value:new P},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Pe.distanceRGBA_vert,fragmentShader:Pe.distanceRGBA_frag},shadow:{uniforms:Kt([ie.lights,ie.fog,{color:{value:new ye(0)},opacity:{value:1}}]),vertexShader:Pe.shadow_vert,fragmentShader:Pe.shadow_frag}};Bn.physical={uniforms:Kt([Bn.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Ve},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Ve},clearcoatNormalScale:{value:new ce(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Ve},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Ve},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Ve},sheen:{value:0},sheenColor:{value:new ye(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Ve},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Ve},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Ve},transmissionSamplerSize:{value:new ce},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Ve},attenuationDistance:{value:0},attenuationColor:{value:new ye(0)},specularColor:{value:new ye(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Ve},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Ve},anisotropyVector:{value:new ce},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Ve}}]),vertexShader:Pe.meshphysical_vert,fragmentShader:Pe.meshphysical_frag};var Eo={r:0,b:0,g:0};function ux(n,e,t,i,r,s,a){let o=new ye(0),l=s===!0?0:1,c,h,u=null,f=0,d=null;function p(g,m){let _=!1,x=m.isScene===!0?m.background:null;x&&x.isTexture&&(x=(m.backgroundBlurriness>0?t:e).get(x)),x===null?y(o,l):x&&x.isColor&&(y(x,1),_=!0);let v=n.xr.getEnvironmentBlendMode();v==="additive"?i.buffers.color.setClear(0,0,0,1,a):v==="alpha-blend"&&i.buffers.color.setClear(0,0,0,0,a),(n.autoClear||_)&&n.clear(n.autoClearColor,n.autoClearDepth,n.autoClearStencil),x&&(x.isCubeTexture||x.mapping===fa)?(h===void 0&&(h=new St(new Es(1,1,1),new wn({name:"BackgroundCubeMaterial",uniforms:Fr(Bn.backgroundCube.uniforms),vertexShader:Bn.backgroundCube.vertexShader,fragmentShader:Bn.backgroundCube.fragmentShader,side:en,depthTest:!1,depthWrite:!1,fog:!1})),h.geometry.deleteAttribute("normal"),h.geometry.deleteAttribute("uv"),h.onBeforeRender=function(E,w,M){this.matrixWorld.copyPosition(M.matrixWorld)},Object.defineProperty(h.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),r.update(h)),h.material.uniforms.envMap.value=x,h.material.uniforms.flipEnvMap.value=x.isCubeTexture&&x.isRenderTargetTexture===!1?-1:1,h.material.uniforms.backgroundBlurriness.value=m.backgroundBlurriness,h.material.uniforms.backgroundIntensity.value=m.backgroundIntensity,h.material.toneMapped=Qe.getTransfer(x.colorSpace)!==at,(u!==x||f!==x.version||d!==n.toneMapping)&&(h.material.needsUpdate=!0,u=x,f=x.version,d=n.toneMapping),h.layers.enableAll(),g.unshift(h,h.geometry,h.material,0,0,null)):x&&x.isTexture&&(c===void 0&&(c=new St(new ii(2,2),new wn({name:"BackgroundMaterial",uniforms:Fr(Bn.background.uniforms),vertexShader:Bn.background.vertexShader,fragmentShader:Bn.background.fragmentShader,side:Qt,depthTest:!1,depthWrite:!1,fog:!1})),c.geometry.deleteAttribute("normal"),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),r.update(c)),c.material.uniforms.t2D.value=x,c.material.uniforms.backgroundIntensity.value=m.backgroundIntensity,c.material.toneMapped=Qe.getTransfer(x.colorSpace)!==at,x.matrixAutoUpdate===!0&&x.updateMatrix(),c.material.uniforms.uvTransform.value.copy(x.matrix),(u!==x||f!==x.version||d!==n.toneMapping)&&(c.material.needsUpdate=!0,u=x,f=x.version,d=n.toneMapping),c.layers.enableAll(),g.unshift(c,c.geometry,c.material,0,0,null))}function y(g,m){g.getRGB(Eo,Zf(n)),i.buffers.color.setClear(Eo.r,Eo.g,Eo.b,m,a)}return{getClearColor:function(){return o},setClearColor:function(g,m=1){o.set(g),l=m,y(o,l)},getClearAlpha:function(){return l},setClearAlpha:function(g){l=g,y(o,l)},render:p}}function fx(n,e,t,i){let r=n.getParameter(n.MAX_VERTEX_ATTRIBS),s=i.isWebGL2?null:e.get("OES_vertex_array_object"),a=i.isWebGL2||s!==null,o={},l=g(null),c=l,h=!1;function u(L,U,F,H,N){let B=!1;if(a){let $=y(H,F,U);c!==$&&(c=$,d(c.object)),B=m(L,H,F,N),B&&_(L,H,F,N)}else{let $=U.wireframe===!0;(c.geometry!==H.id||c.program!==F.id||c.wireframe!==$)&&(c.geometry=H.id,c.program=F.id,c.wireframe=$,B=!0)}N!==null&&t.update(N,n.ELEMENT_ARRAY_BUFFER),(B||h)&&(h=!1,T(L,U,F,H),N!==null&&n.bindBuffer(n.ELEMENT_ARRAY_BUFFER,t.get(N).buffer))}function f(){return i.isWebGL2?n.createVertexArray():s.createVertexArrayOES()}function d(L){return i.isWebGL2?n.bindVertexArray(L):s.bindVertexArrayOES(L)}function p(L){return i.isWebGL2?n.deleteVertexArray(L):s.deleteVertexArrayOES(L)}function y(L,U,F){let H=F.wireframe===!0,N=o[L.id];N===void 0&&(N={},o[L.id]=N);let B=N[U.id];B===void 0&&(B={},N[U.id]=B);let $=B[H];return $===void 0&&($=g(f()),B[H]=$),$}function g(L){let U=[],F=[],H=[];for(let N=0;N<r;N++)U[N]=0,F[N]=0,H[N]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:U,enabledAttributes:F,attributeDivisors:H,object:L,attributes:{},index:null}}function m(L,U,F,H){let N=c.attributes,B=U.attributes,$=0,J=F.getAttributes();for(let re in J)if(J[re].location>=0){let Z=N[re],le=B[re];if(le===void 0&&(re==="instanceMatrix"&&L.instanceMatrix&&(le=L.instanceMatrix),re==="instanceColor"&&L.instanceColor&&(le=L.instanceColor)),Z===void 0||Z.attribute!==le||le&&Z.data!==le.data)return!0;$++}return c.attributesNum!==$||c.index!==H}function _(L,U,F,H){let N={},B=U.attributes,$=0,J=F.getAttributes();for(let re in J)if(J[re].location>=0){let Z=B[re];Z===void 0&&(re==="instanceMatrix"&&L.instanceMatrix&&(Z=L.instanceMatrix),re==="instanceColor"&&L.instanceColor&&(Z=L.instanceColor));let le={};le.attribute=Z,Z&&Z.data&&(le.data=Z.data),N[re]=le,$++}c.attributes=N,c.attributesNum=$,c.index=H}function x(){let L=c.newAttributes;for(let U=0,F=L.length;U<F;U++)L[U]=0}function v(L){E(L,0)}function E(L,U){let F=c.newAttributes,H=c.enabledAttributes,N=c.attributeDivisors;F[L]=1,H[L]===0&&(n.enableVertexAttribArray(L),H[L]=1),N[L]!==U&&((i.isWebGL2?n:e.get("ANGLE_instanced_arrays"))[i.isWebGL2?"vertexAttribDivisor":"vertexAttribDivisorANGLE"](L,U),N[L]=U)}function w(){let L=c.newAttributes,U=c.enabledAttributes;for(let F=0,H=U.length;F<H;F++)U[F]!==L[F]&&(n.disableVertexAttribArray(F),U[F]=0)}function M(L,U,F,H,N,B,$){$===!0?n.vertexAttribIPointer(L,U,F,N,B):n.vertexAttribPointer(L,U,F,H,N,B)}function T(L,U,F,H){if(i.isWebGL2===!1&&(L.isInstancedMesh||H.isInstancedBufferGeometry)&&e.get("ANGLE_instanced_arrays")===null)return;x();let N=H.attributes,B=F.getAttributes(),$=U.defaultAttributeValues;for(let J in B){let re=B[J];if(re.location>=0){let Y=N[J];if(Y===void 0&&(J==="instanceMatrix"&&L.instanceMatrix&&(Y=L.instanceMatrix),J==="instanceColor"&&L.instanceColor&&(Y=L.instanceColor)),Y!==void 0){let Z=Y.normalized,le=Y.itemSize,de=t.get(Y);if(de===void 0)continue;let xe=de.buffer,De=de.type,Ue=de.bytesPerElement,Se=i.isWebGL2===!0&&(De===n.INT||De===n.UNSIGNED_INT||Y.gpuType===Bf);if(Y.isInterleavedBufferAttribute){let Ye=Y.data,V=Ye.stride,$t=Y.offset;if(Ye.isInstancedInterleavedBuffer){for(let ve=0;ve<re.locationSize;ve++)E(re.location+ve,Ye.meshPerAttribute);L.isInstancedMesh!==!0&&H._maxInstanceCount===void 0&&(H._maxInstanceCount=Ye.meshPerAttribute*Ye.count)}else for(let ve=0;ve<re.locationSize;ve++)v(re.location+ve);n.bindBuffer(n.ARRAY_BUFFER,xe);for(let ve=0;ve<re.locationSize;ve++)M(re.location+ve,le/re.locationSize,De,Z,V*Ue,($t+le/re.locationSize*ve)*Ue,Se)}else{if(Y.isInstancedBufferAttribute){for(let Ye=0;Ye<re.locationSize;Ye++)E(re.location+Ye,Y.meshPerAttribute);L.isInstancedMesh!==!0&&H._maxInstanceCount===void 0&&(H._maxInstanceCount=Y.meshPerAttribute*Y.count)}else for(let Ye=0;Ye<re.locationSize;Ye++)v(re.location+Ye);n.bindBuffer(n.ARRAY_BUFFER,xe);for(let Ye=0;Ye<re.locationSize;Ye++)M(re.location+Ye,le/re.locationSize,De,Z,le*Ue,le/re.locationSize*Ye*Ue,Se)}}else if($!==void 0){let Z=$[J];if(Z!==void 0)switch(Z.length){case 2:n.vertexAttrib2fv(re.location,Z);break;case 3:n.vertexAttrib3fv(re.location,Z);break;case 4:n.vertexAttrib4fv(re.location,Z);break;default:n.vertexAttrib1fv(re.location,Z)}}}}w()}function b(){O();for(let L in o){let U=o[L];for(let F in U){let H=U[F];for(let N in H)p(H[N].object),delete H[N];delete U[F]}delete o[L]}}function S(L){if(o[L.id]===void 0)return;let U=o[L.id];for(let F in U){let H=U[F];for(let N in H)p(H[N].object),delete H[N];delete U[F]}delete o[L.id]}function I(L){for(let U in o){let F=o[U];if(F[L.id]===void 0)continue;let H=F[L.id];for(let N in H)p(H[N].object),delete H[N];delete F[L.id]}}function O(){k(),h=!0,c!==l&&(c=l,d(c.object))}function k(){l.geometry=null,l.program=null,l.wireframe=!1}return{setup:u,reset:O,resetDefaultState:k,dispose:b,releaseStatesOfGeometry:S,releaseStatesOfProgram:I,initAttributes:x,enableAttribute:v,disableUnusedAttributes:w}}function dx(n,e,t,i){let r=i.isWebGL2,s;function a(h){s=h}function o(h,u){n.drawArrays(s,h,u),t.update(u,s,1)}function l(h,u,f){if(f===0)return;let d,p;if(r)d=n,p="drawArraysInstanced";else if(d=e.get("ANGLE_instanced_arrays"),p="drawArraysInstancedANGLE",d===null){console.error("THREE.WebGLBufferRenderer: using THREE.InstancedBufferGeometry but hardware does not support extension ANGLE_instanced_arrays.");return}d[p](s,h,u,f),t.update(u,s,f)}function c(h,u,f){if(f===0)return;let d=e.get("WEBGL_multi_draw");if(d===null)for(let p=0;p<f;p++)this.render(h[p],u[p]);else{d.multiDrawArraysWEBGL(s,h,0,u,0,f);let p=0;for(let y=0;y<f;y++)p+=u[y];t.update(p,s,1)}}this.setMode=a,this.render=o,this.renderInstances=l,this.renderMultiDraw=c}function px(n,e,t){let i;function r(){if(i!==void 0)return i;if(e.has("EXT_texture_filter_anisotropic")===!0){let M=e.get("EXT_texture_filter_anisotropic");i=n.getParameter(M.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else i=0;return i}function s(M){if(M==="highp"){if(n.getShaderPrecisionFormat(n.VERTEX_SHADER,n.HIGH_FLOAT).precision>0&&n.getShaderPrecisionFormat(n.FRAGMENT_SHADER,n.HIGH_FLOAT).precision>0)return"highp";M="mediump"}return M==="mediump"&&n.getShaderPrecisionFormat(n.VERTEX_SHADER,n.MEDIUM_FLOAT).precision>0&&n.getShaderPrecisionFormat(n.FRAGMENT_SHADER,n.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let a=typeof WebGL2RenderingContext<"u"&&n.constructor.name==="WebGL2RenderingContext",o=t.precision!==void 0?t.precision:"highp",l=s(o);l!==o&&(console.warn("THREE.WebGLRenderer:",o,"not supported, using",l,"instead."),o=l);let c=a||e.has("WEBGL_draw_buffers"),h=t.logarithmicDepthBuffer===!0,u=n.getParameter(n.MAX_TEXTURE_IMAGE_UNITS),f=n.getParameter(n.MAX_VERTEX_TEXTURE_IMAGE_UNITS),d=n.getParameter(n.MAX_TEXTURE_SIZE),p=n.getParameter(n.MAX_CUBE_MAP_TEXTURE_SIZE),y=n.getParameter(n.MAX_VERTEX_ATTRIBS),g=n.getParameter(n.MAX_VERTEX_UNIFORM_VECTORS),m=n.getParameter(n.MAX_VARYING_VECTORS),_=n.getParameter(n.MAX_FRAGMENT_UNIFORM_VECTORS),x=f>0,v=a||e.has("OES_texture_float"),E=x&&v,w=a?n.getParameter(n.MAX_SAMPLES):0;return{isWebGL2:a,drawBuffers:c,getMaxAnisotropy:r,getMaxPrecision:s,precision:o,logarithmicDepthBuffer:h,maxTextures:u,maxVertexTextures:f,maxTextureSize:d,maxCubemapSize:p,maxAttributes:y,maxVertexUniforms:g,maxVaryings:m,maxFragmentUniforms:_,vertexTextures:x,floatFragmentTextures:v,floatVertexTextures:E,maxSamples:w}}function mx(n){let e=this,t=null,i=0,r=!1,s=!1,a=new hn,o=new Ve,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(u,f){let d=u.length!==0||f||i!==0||r;return r=f,i=u.length,d},this.beginShadows=function(){s=!0,h(null)},this.endShadows=function(){s=!1},this.setGlobalState=function(u,f){t=h(u,f,0)},this.setState=function(u,f,d){let p=u.clippingPlanes,y=u.clipIntersection,g=u.clipShadows,m=n.get(u);if(!r||p===null||p.length===0||s&&!g)s?h(null):c();else{let _=s?0:i,x=_*4,v=m.clippingState||null;l.value=v,v=h(p,f,x,d);for(let E=0;E!==x;++E)v[E]=t[E];m.clippingState=v,this.numIntersection=y?this.numPlanes:0,this.numPlanes+=_}};function c(){l.value!==t&&(l.value=t,l.needsUpdate=i>0),e.numPlanes=i,e.numIntersection=0}function h(u,f,d,p){let y=u!==null?u.length:0,g=null;if(y!==0){if(g=l.value,p!==!0||g===null){let m=d+y*4,_=f.matrixWorldInverse;o.getNormalMatrix(_),(g===null||g.length<m)&&(g=new Float32Array(m));for(let x=0,v=d;x!==y;++x,v+=4)a.copy(u[x]).applyMatrix4(_,o),a.normal.toArray(g,v),g[v+3]=a.constant}l.value=g,l.needsUpdate=!0}return e.numPlanes=y,e.numIntersection=0,g}}function gx(n){let e=new WeakMap;function t(a,o){return o===Bl?a.mapping=Dr:o===kl&&(a.mapping=Nr),a}function i(a){if(a&&a.isTexture){let o=a.mapping;if(o===Bl||o===kl)if(e.has(a)){let l=e.get(a).texture;return t(l,a.mapping)}else{let l=a.image;if(l&&l.height>0){let c=new Yl(l.height/2);return c.fromEquirectangularTexture(n,a),e.set(a,c),a.addEventListener("dispose",r),t(c.texture,a.mapping)}else return null}}return a}function r(a){let o=a.target;o.removeEventListener("dispose",r);let l=e.get(o);l!==void 0&&(e.delete(o),l.dispose())}function s(){e=new WeakMap}return{get:i,dispose:s}}var _i=class extends Qo{constructor(e=-1,t=1,i=1,r=-1,s=.1,a=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=i,this.bottom=r,this.near=s,this.far=a,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,i,r,s,a){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=i,this.view.offsetY=r,this.view.width=s,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),i=(this.right+this.left)/2,r=(this.top+this.bottom)/2,s=i-e,a=i+e,o=r+t,l=r-t;if(this.view!==null&&this.view.enabled){let c=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;s+=c*this.view.offsetX,a=s+c*this.view.width,o-=h*this.view.offsetY,l=o-h*this.view.height}this.projectionMatrix.makeOrthographic(s,a,o,l,this.near,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}},Ar=4,Ku=[.125,.215,.35,.446,.526,.582],Oi=20,El=new _i,Qu=new ye,Al=null,Tl=0,Rl=0,Ni=(1+Math.sqrt(5))/2,Sr=1/Ni,ef=[new P(1,1,1),new P(-1,1,1),new P(1,1,-1),new P(-1,1,-1),new P(0,Ni,Sr),new P(0,Ni,-Sr),new P(Sr,0,Ni),new P(-Sr,0,Ni),new P(Ni,Sr,0),new P(-Ni,Sr,0)],zr=class{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(e,t=0,i=.1,r=100){Al=this._renderer.getRenderTarget(),Tl=this._renderer.getActiveCubeFace(),Rl=this._renderer.getActiveMipmapLevel(),this._setSize(256);let s=this._allocateTargets();return s.depthBuffer=!0,this._sceneToCubeUV(e,i,r,s),t>0&&this._blur(s,0,0,t),this._applyPMREM(s),this._cleanup(s),s}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=rf(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=nf(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodPlanes.length;e++)this._lodPlanes[e].dispose()}_cleanup(e){this._renderer.setRenderTarget(Al,Tl,Rl),e.scissorTest=!1,Ao(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===Dr||e.mapping===Nr?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),Al=this._renderer.getRenderTarget(),Tl=this._renderer.getActiveCubeFace(),Rl=this._renderer.getActiveMipmapLevel();let i=t||this._allocateTargets();return this._textureToCubeUV(e,i),this._applyPMREM(i),this._cleanup(i),i}_allocateTargets(){let e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,i={magFilter:Ct,minFilter:Ct,generateMipmaps:!1,type:Gi,format:It,colorSpace:ni,depthBuffer:!1},r=tf(e,t,i);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=tf(e,t,i);let{_lodMax:s}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=yx(s)),this._blurMaterial=xx(s,e,t)}return r}_compileMaterial(e){let t=new St(this._lodPlanes[0],e);this._renderer.compile(t,El)}_sceneToCubeUV(e,t,i,r){let o=new Bt(90,1,t,i),l=[1,-1,1,1,1,1],c=[1,1,1,-1,-1,-1],h=this._renderer,u=h.autoClear,f=h.toneMapping;h.getClearColor(Qu),h.toneMapping=gi,h.autoClear=!1;let d=new Vn({name:"PMREM.Background",side:en,depthWrite:!1,depthTest:!1}),p=new St(new Es,d),y=!1,g=e.background;g?g.isColor&&(d.color.copy(g),e.background=null,y=!0):(d.color.copy(Qu),y=!0);for(let m=0;m<6;m++){let _=m%3;_===0?(o.up.set(0,l[m],0),o.lookAt(c[m],0,0)):_===1?(o.up.set(0,0,l[m]),o.lookAt(0,c[m],0)):(o.up.set(0,l[m],0),o.lookAt(0,0,c[m]));let x=this._cubeSize;Ao(r,_*x,m>2?x:0,x,x),h.setRenderTarget(r),y&&h.render(p,o),h.render(e,o)}p.geometry.dispose(),p.material.dispose(),h.toneMapping=f,h.autoClear=u,e.background=g}_textureToCubeUV(e,t){let i=this._renderer,r=e.mapping===Dr||e.mapping===Nr;r?(this._cubemapMaterial===null&&(this._cubemapMaterial=rf()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=nf());let s=r?this._cubemapMaterial:this._equirectMaterial,a=new St(this._lodPlanes[0],s),o=s.uniforms;o.envMap.value=e;let l=this._cubeSize;Ao(t,0,0,3*l,2*l),i.setRenderTarget(t),i.render(a,El)}_applyPMREM(e){let t=this._renderer,i=t.autoClear;t.autoClear=!1;for(let r=1;r<this._lodPlanes.length;r++){let s=Math.sqrt(this._sigmas[r]*this._sigmas[r]-this._sigmas[r-1]*this._sigmas[r-1]),a=ef[(r-1)%ef.length];this._blur(e,r-1,r,s,a)}t.autoClear=i}_blur(e,t,i,r,s){let a=this._pingPongRenderTarget;this._halfBlur(e,a,t,i,r,"latitudinal",s),this._halfBlur(a,e,i,i,r,"longitudinal",s)}_halfBlur(e,t,i,r,s,a,o){let l=this._renderer,c=this._blurMaterial;a!=="latitudinal"&&a!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");let h=3,u=new St(this._lodPlanes[r],c),f=c.uniforms,d=this._sizeLods[i]-1,p=isFinite(s)?Math.PI/(2*d):2*Math.PI/(2*Oi-1),y=s/p,g=isFinite(s)?1+Math.floor(h*y):Oi;g>Oi&&console.warn(`sigmaRadians, ${s}, is too large and will clip, as it requested ${g} samples when the maximum is set to ${Oi}`);let m=[],_=0;for(let M=0;M<Oi;++M){let T=M/y,b=Math.exp(-T*T/2);m.push(b),M===0?_+=b:M<g&&(_+=2*b)}for(let M=0;M<m.length;M++)m[M]=m[M]/_;f.envMap.value=e.texture,f.samples.value=g,f.weights.value=m,f.latitudinal.value=a==="latitudinal",o&&(f.poleAxis.value=o);let{_lodMax:x}=this;f.dTheta.value=p,f.mipInt.value=x-i;let v=this._sizeLods[r],E=3*v*(r>x-Ar?r-x+Ar:0),w=4*(this._cubeSize-v);Ao(t,E,w,3*v,2*v),l.setRenderTarget(t),l.render(u,El)}};function yx(n){let e=[],t=[],i=[],r=n,s=n-Ar+1+Ku.length;for(let a=0;a<s;a++){let o=Math.pow(2,r);t.push(o);let l=1/o;a>n-Ar?l=Ku[a-n+Ar-1]:a===0&&(l=0),i.push(l);let c=1/(o-2),h=-c,u=1+c,f=[h,h,u,h,u,u,h,h,u,u,h,u],d=6,p=6,y=3,g=2,m=1,_=new Float32Array(y*p*d),x=new Float32Array(g*p*d),v=new Float32Array(m*p*d);for(let w=0;w<d;w++){let M=w%3*2/3-1,T=w>2?0:-1,b=[M,T,0,M+2/3,T,0,M+2/3,T+1,0,M,T,0,M+2/3,T+1,0,M,T+1,0];_.set(b,y*p*w),x.set(f,g*p*w);let S=[w,w,w,w,w,w];v.set(S,m*p*w)}let E=new Ft;E.setAttribute("position",new tn(_,y)),E.setAttribute("uv",new tn(x,g)),E.setAttribute("faceIndex",new tn(v,m)),e.push(E),r>Ar&&r--}return{lodPlanes:e,sizeLods:t,sigmas:i}}function tf(n,e,t){let i=new fn(n,e,t);return i.texture.mapping=fa,i.texture.name="PMREM.cubeUv",i.scissorTest=!0,i}function Ao(n,e,t,i,r){n.viewport.set(e,t,i,r),n.scissor.set(e,t,i,r)}function xx(n,e,t){let i=new Float32Array(Oi),r=new P(0,1,0);return new wn({name:"SphericalGaussianBlur",defines:{n:Oi,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${n}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:i},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:r}},vertexShader:Nc(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:mi,depthTest:!1,depthWrite:!1})}function nf(){return new wn({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:Nc(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:mi,depthTest:!1,depthWrite:!1})}function rf(){return new wn({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Nc(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:mi,depthTest:!1,depthWrite:!1})}function Nc(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}function _x(n){let e=new WeakMap,t=null;function i(o){if(o&&o.isTexture){let l=o.mapping,c=l===Bl||l===kl,h=l===Dr||l===Nr;if(c||h)if(o.isRenderTargetTexture&&o.needsPMREMUpdate===!0){o.needsPMREMUpdate=!1;let u=e.get(o);return t===null&&(t=new zr(n)),u=c?t.fromEquirectangular(o,u):t.fromCubemap(o,u),e.set(o,u),u.texture}else{if(e.has(o))return e.get(o).texture;{let u=o.image;if(c&&u&&u.height>0||h&&u&&r(u)){t===null&&(t=new zr(n));let f=c?t.fromEquirectangular(o):t.fromCubemap(o);return e.set(o,f),o.addEventListener("dispose",s),f.texture}else return null}}}return o}function r(o){let l=0,c=6;for(let h=0;h<c;h++)o[h]!==void 0&&l++;return l===c}function s(o){let l=o.target;l.removeEventListener("dispose",s);let c=e.get(l);c!==void 0&&(e.delete(l),c.dispose())}function a(){e=new WeakMap,t!==null&&(t.dispose(),t=null)}return{get:i,dispose:a}}function vx(n){let e={};function t(i){if(e[i]!==void 0)return e[i];let r;switch(i){case"WEBGL_depth_texture":r=n.getExtension("WEBGL_depth_texture")||n.getExtension("MOZ_WEBGL_depth_texture")||n.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":r=n.getExtension("EXT_texture_filter_anisotropic")||n.getExtension("MOZ_EXT_texture_filter_anisotropic")||n.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":r=n.getExtension("WEBGL_compressed_texture_s3tc")||n.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||n.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":r=n.getExtension("WEBGL_compressed_texture_pvrtc")||n.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:r=n.getExtension(i)}return e[i]=r,r}return{has:function(i){return t(i)!==null},init:function(i){i.isWebGL2?(t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance")):(t("WEBGL_depth_texture"),t("OES_texture_float"),t("OES_texture_half_float"),t("OES_texture_half_float_linear"),t("OES_standard_derivatives"),t("OES_element_index_uint"),t("OES_vertex_array_object"),t("ANGLE_instanced_arrays")),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture")},get:function(i){let r=t(i);return r===null&&console.warn("THREE.WebGLRenderer: "+i+" extension not supported."),r}}}function bx(n,e,t,i){let r={},s=new WeakMap;function a(u){let f=u.target;f.index!==null&&e.remove(f.index);for(let p in f.attributes)e.remove(f.attributes[p]);for(let p in f.morphAttributes){let y=f.morphAttributes[p];for(let g=0,m=y.length;g<m;g++)e.remove(y[g])}f.removeEventListener("dispose",a),delete r[f.id];let d=s.get(f);d&&(e.remove(d),s.delete(f)),i.releaseStatesOfGeometry(f),f.isInstancedBufferGeometry===!0&&delete f._maxInstanceCount,t.memory.geometries--}function o(u,f){return r[f.id]===!0||(f.addEventListener("dispose",a),r[f.id]=!0,t.memory.geometries++),f}function l(u){let f=u.attributes;for(let p in f)e.update(f[p],n.ARRAY_BUFFER);let d=u.morphAttributes;for(let p in d){let y=d[p];for(let g=0,m=y.length;g<m;g++)e.update(y[g],n.ARRAY_BUFFER)}}function c(u){let f=[],d=u.index,p=u.attributes.position,y=0;if(d!==null){let _=d.array;y=d.version;for(let x=0,v=_.length;x<v;x+=3){let E=_[x+0],w=_[x+1],M=_[x+2];f.push(E,w,w,M,M,E)}}else if(p!==void 0){let _=p.array;y=p.version;for(let x=0,v=_.length/3-1;x<v;x+=3){let E=x+0,w=x+1,M=x+2;f.push(E,w,w,M,M,E)}}else return;let g=new($f(f)?Ko:Jo)(f,1);g.version=y;let m=s.get(u);m&&e.remove(m),s.set(u,g)}function h(u){let f=s.get(u);if(f){let d=u.index;d!==null&&f.version<d.version&&c(u)}else c(u);return s.get(u)}return{get:o,update:l,getWireframeAttribute:h}}function Mx(n,e,t,i){let r=i.isWebGL2,s;function a(d){s=d}let o,l;function c(d){o=d.type,l=d.bytesPerElement}function h(d,p){n.drawElements(s,p,o,d*l),t.update(p,s,1)}function u(d,p,y){if(y===0)return;let g,m;if(r)g=n,m="drawElementsInstanced";else if(g=e.get("ANGLE_instanced_arrays"),m="drawElementsInstancedANGLE",g===null){console.error("THREE.WebGLIndexedBufferRenderer: using THREE.InstancedBufferGeometry but hardware does not support extension ANGLE_instanced_arrays.");return}g[m](s,p,o,d*l,y),t.update(p,s,y)}function f(d,p,y){if(y===0)return;let g=e.get("WEBGL_multi_draw");if(g===null)for(let m=0;m<y;m++)this.render(d[m]/l,p[m]);else{g.multiDrawElementsWEBGL(s,p,0,o,d,0,y);let m=0;for(let _=0;_<y;_++)m+=p[_];t.update(m,s,1)}}this.setMode=a,this.setIndex=c,this.render=h,this.renderInstances=u,this.renderMultiDraw=f}function wx(n){let e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function i(s,a,o){switch(t.calls++,a){case n.TRIANGLES:t.triangles+=o*(s/3);break;case n.LINES:t.lines+=o*(s/2);break;case n.LINE_STRIP:t.lines+=o*(s-1);break;case n.LINE_LOOP:t.lines+=o*s;break;case n.POINTS:t.points+=o*s;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",a);break}}function r(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:r,update:i}}function Sx(n,e){return n[0]-e[0]}function Ex(n,e){return Math.abs(e[1])-Math.abs(n[1])}function Ax(n,e,t){let i={},r=new Float32Array(8),s=new WeakMap,a=new Ge,o=[];for(let c=0;c<8;c++)o[c]=[c,0];function l(c,h,u){let f=c.morphTargetInfluences;if(e.isWebGL2===!0){let d=h.morphAttributes.position||h.morphAttributes.normal||h.morphAttributes.color,p=d!==void 0?d.length:0,y=s.get(h);if(y===void 0||y.count!==p){let L=function(){O.dispose(),s.delete(h),h.removeEventListener("dispose",L)};y!==void 0&&y.texture.dispose();let _=h.morphAttributes.position!==void 0,x=h.morphAttributes.normal!==void 0,v=h.morphAttributes.color!==void 0,E=h.morphAttributes.position||[],w=h.morphAttributes.normal||[],M=h.morphAttributes.color||[],T=0;_===!0&&(T=1),x===!0&&(T=2),v===!0&&(T=3);let b=h.attributes.position.count*T,S=1;b>e.maxTextureSize&&(S=Math.ceil(b/e.maxTextureSize),b=e.maxTextureSize);let I=new Float32Array(b*S*4*p),O=new $o(I,b,S,p);O.type=kn,O.needsUpdate=!0;let k=T*4;for(let U=0;U<p;U++){let F=E[U],H=w[U],N=M[U],B=b*S*4*U;for(let $=0;$<F.count;$++){let J=$*k;_===!0&&(a.fromBufferAttribute(F,$),I[B+J+0]=a.x,I[B+J+1]=a.y,I[B+J+2]=a.z,I[B+J+3]=0),x===!0&&(a.fromBufferAttribute(H,$),I[B+J+4]=a.x,I[B+J+5]=a.y,I[B+J+6]=a.z,I[B+J+7]=0),v===!0&&(a.fromBufferAttribute(N,$),I[B+J+8]=a.x,I[B+J+9]=a.y,I[B+J+10]=a.z,I[B+J+11]=N.itemSize===4?a.w:1)}}y={count:p,texture:O,size:new ce(b,S)},s.set(h,y),h.addEventListener("dispose",L)}let g=0;for(let _=0;_<f.length;_++)g+=f[_];let m=h.morphTargetsRelative?1:1-g;u.getUniforms().setValue(n,"morphTargetBaseInfluence",m),u.getUniforms().setValue(n,"morphTargetInfluences",f),u.getUniforms().setValue(n,"morphTargetsTexture",y.texture,t),u.getUniforms().setValue(n,"morphTargetsTextureSize",y.size)}else{let d=f===void 0?0:f.length,p=i[h.id];if(p===void 0||p.length!==d){p=[];for(let x=0;x<d;x++)p[x]=[x,0];i[h.id]=p}for(let x=0;x<d;x++){let v=p[x];v[0]=x,v[1]=f[x]}p.sort(Ex);for(let x=0;x<8;x++)x<d&&p[x][1]?(o[x][0]=p[x][0],o[x][1]=p[x][1]):(o[x][0]=Number.MAX_SAFE_INTEGER,o[x][1]=0);o.sort(Sx);let y=h.morphAttributes.position,g=h.morphAttributes.normal,m=0;for(let x=0;x<8;x++){let v=o[x],E=v[0],w=v[1];E!==Number.MAX_SAFE_INTEGER&&w?(y&&h.getAttribute("morphTarget"+x)!==y[E]&&h.setAttribute("morphTarget"+x,y[E]),g&&h.getAttribute("morphNormal"+x)!==g[E]&&h.setAttribute("morphNormal"+x,g[E]),r[x]=w,m+=w):(y&&h.hasAttribute("morphTarget"+x)===!0&&h.deleteAttribute("morphTarget"+x),g&&h.hasAttribute("morphNormal"+x)===!0&&h.deleteAttribute("morphNormal"+x),r[x]=0)}let _=h.morphTargetsRelative?1:1-m;u.getUniforms().setValue(n,"morphTargetBaseInfluence",_),u.getUniforms().setValue(n,"morphTargetInfluences",r)}}return{update:l}}function Tx(n,e,t,i){let r=new WeakMap;function s(l){let c=i.render.frame,h=l.geometry,u=e.get(l,h);if(r.get(u)!==c&&(e.update(u),r.set(u,c)),l.isInstancedMesh&&(l.hasEventListener("dispose",o)===!1&&l.addEventListener("dispose",o),r.get(l)!==c&&(t.update(l.instanceMatrix,n.ARRAY_BUFFER),l.instanceColor!==null&&t.update(l.instanceColor,n.ARRAY_BUFFER),r.set(l,c))),l.isSkinnedMesh){let f=l.skeleton;r.get(f)!==c&&(f.update(),r.set(f,c))}return u}function a(){r=new WeakMap}function o(l){let c=l.target;c.removeEventListener("dispose",o),t.remove(c.instanceMatrix),c.instanceColor!==null&&t.remove(c.instanceColor)}return{update:s,dispose:a}}var ta=class extends Mn{constructor(e,t,i,r,s,a,o,l,c,h){if(h=h!==void 0?h:Bi,h!==Bi&&h!==Ur)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");i===void 0&&h===Bi&&(i=pi),i===void 0&&h===Ur&&(i=zi),super(null,r,s,a,o,l,h,i,c),this.isDepthTexture=!0,this.image={width:e,height:t},this.magFilter=o!==void 0?o:vt,this.minFilter=l!==void 0?l:vt,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.compareFunction=e.compareFunction,this}toJSON(e){let t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}},Kf=new Mn,Qf=new ta(1,1);Qf.compareFunction=Yf;var ed=new $o,td=new Xl,nd=new ea,sf=[],of=[],af=new Float32Array(16),lf=new Float32Array(9),cf=new Float32Array(4);function Xr(n,e,t){let i=n[0];if(i<=0||i>0)return n;let r=e*t,s=sf[r];if(s===void 0&&(s=new Float32Array(r),sf[r]=s),e!==0){i.toArray(s,0);for(let a=1,o=0;a!==e;++a)o+=t,n[a].toArray(s,o)}return s}function Pt(n,e){if(n.length!==e.length)return!1;for(let t=0,i=n.length;t<i;t++)if(n[t]!==e[t])return!1;return!0}function Lt(n,e){for(let t=0,i=e.length;t<i;t++)n[t]=e[t]}function ma(n,e){let t=of[e];t===void 0&&(t=new Int32Array(e),of[e]=t);for(let i=0;i!==e;++i)t[i]=n.allocateTextureUnit();return t}function Rx(n,e){let t=this.cache;t[0]!==e&&(n.uniform1f(this.addr,e),t[0]=e)}function Cx(n,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(n.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Pt(t,e))return;n.uniform2fv(this.addr,e),Lt(t,e)}}function Ix(n,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(n.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(n.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(Pt(t,e))return;n.uniform3fv(this.addr,e),Lt(t,e)}}function Px(n,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(n.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Pt(t,e))return;n.uniform4fv(this.addr,e),Lt(t,e)}}function Lx(n,e){let t=this.cache,i=e.elements;if(i===void 0){if(Pt(t,e))return;n.uniformMatrix2fv(this.addr,!1,e),Lt(t,e)}else{if(Pt(t,i))return;cf.set(i),n.uniformMatrix2fv(this.addr,!1,cf),Lt(t,i)}}function Dx(n,e){let t=this.cache,i=e.elements;if(i===void 0){if(Pt(t,e))return;n.uniformMatrix3fv(this.addr,!1,e),Lt(t,e)}else{if(Pt(t,i))return;lf.set(i),n.uniformMatrix3fv(this.addr,!1,lf),Lt(t,i)}}function Nx(n,e){let t=this.cache,i=e.elements;if(i===void 0){if(Pt(t,e))return;n.uniformMatrix4fv(this.addr,!1,e),Lt(t,e)}else{if(Pt(t,i))return;af.set(i),n.uniformMatrix4fv(this.addr,!1,af),Lt(t,i)}}function Ux(n,e){let t=this.cache;t[0]!==e&&(n.uniform1i(this.addr,e),t[0]=e)}function Ox(n,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(n.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Pt(t,e))return;n.uniform2iv(this.addr,e),Lt(t,e)}}function Fx(n,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(n.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Pt(t,e))return;n.uniform3iv(this.addr,e),Lt(t,e)}}function zx(n,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(n.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Pt(t,e))return;n.uniform4iv(this.addr,e),Lt(t,e)}}function Bx(n,e){let t=this.cache;t[0]!==e&&(n.uniform1ui(this.addr,e),t[0]=e)}function kx(n,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(n.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Pt(t,e))return;n.uniform2uiv(this.addr,e),Lt(t,e)}}function Hx(n,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(n.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Pt(t,e))return;n.uniform3uiv(this.addr,e),Lt(t,e)}}function Vx(n,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(n.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Pt(t,e))return;n.uniform4uiv(this.addr,e),Lt(t,e)}}function Gx(n,e,t){let i=this.cache,r=t.allocateTextureUnit();i[0]!==r&&(n.uniform1i(this.addr,r),i[0]=r);let s=this.type===n.SAMPLER_2D_SHADOW?Qf:Kf;t.setTexture2D(e||s,r)}function Wx(n,e,t){let i=this.cache,r=t.allocateTextureUnit();i[0]!==r&&(n.uniform1i(this.addr,r),i[0]=r),t.setTexture3D(e||td,r)}function Xx(n,e,t){let i=this.cache,r=t.allocateTextureUnit();i[0]!==r&&(n.uniform1i(this.addr,r),i[0]=r),t.setTextureCube(e||nd,r)}function qx(n,e,t){let i=this.cache,r=t.allocateTextureUnit();i[0]!==r&&(n.uniform1i(this.addr,r),i[0]=r),t.setTexture2DArray(e||ed,r)}function Yx(n){switch(n){case 5126:return Rx;case 35664:return Cx;case 35665:return Ix;case 35666:return Px;case 35674:return Lx;case 35675:return Dx;case 35676:return Nx;case 5124:case 35670:return Ux;case 35667:case 35671:return Ox;case 35668:case 35672:return Fx;case 35669:case 35673:return zx;case 5125:return Bx;case 36294:return kx;case 36295:return Hx;case 36296:return Vx;case 35678:case 36198:case 36298:case 36306:case 35682:return Gx;case 35679:case 36299:case 36307:return Wx;case 35680:case 36300:case 36308:case 36293:return Xx;case 36289:case 36303:case 36311:case 36292:return qx}}function $x(n,e){n.uniform1fv(this.addr,e)}function jx(n,e){let t=Xr(e,this.size,2);n.uniform2fv(this.addr,t)}function Zx(n,e){let t=Xr(e,this.size,3);n.uniform3fv(this.addr,t)}function Jx(n,e){let t=Xr(e,this.size,4);n.uniform4fv(this.addr,t)}function Kx(n,e){let t=Xr(e,this.size,4);n.uniformMatrix2fv(this.addr,!1,t)}function Qx(n,e){let t=Xr(e,this.size,9);n.uniformMatrix3fv(this.addr,!1,t)}function e_(n,e){let t=Xr(e,this.size,16);n.uniformMatrix4fv(this.addr,!1,t)}function t_(n,e){n.uniform1iv(this.addr,e)}function n_(n,e){n.uniform2iv(this.addr,e)}function i_(n,e){n.uniform3iv(this.addr,e)}function r_(n,e){n.uniform4iv(this.addr,e)}function s_(n,e){n.uniform1uiv(this.addr,e)}function o_(n,e){n.uniform2uiv(this.addr,e)}function a_(n,e){n.uniform3uiv(this.addr,e)}function l_(n,e){n.uniform4uiv(this.addr,e)}function c_(n,e,t){let i=this.cache,r=e.length,s=ma(t,r);Pt(i,s)||(n.uniform1iv(this.addr,s),Lt(i,s));for(let a=0;a!==r;++a)t.setTexture2D(e[a]||Kf,s[a])}function h_(n,e,t){let i=this.cache,r=e.length,s=ma(t,r);Pt(i,s)||(n.uniform1iv(this.addr,s),Lt(i,s));for(let a=0;a!==r;++a)t.setTexture3D(e[a]||td,s[a])}function u_(n,e,t){let i=this.cache,r=e.length,s=ma(t,r);Pt(i,s)||(n.uniform1iv(this.addr,s),Lt(i,s));for(let a=0;a!==r;++a)t.setTextureCube(e[a]||nd,s[a])}function f_(n,e,t){let i=this.cache,r=e.length,s=ma(t,r);Pt(i,s)||(n.uniform1iv(this.addr,s),Lt(i,s));for(let a=0;a!==r;++a)t.setTexture2DArray(e[a]||ed,s[a])}function d_(n){switch(n){case 5126:return $x;case 35664:return jx;case 35665:return Zx;case 35666:return Jx;case 35674:return Kx;case 35675:return Qx;case 35676:return e_;case 5124:case 35670:return t_;case 35667:case 35671:return n_;case 35668:case 35672:return i_;case 35669:case 35673:return r_;case 5125:return s_;case 36294:return o_;case 36295:return a_;case 36296:return l_;case 35678:case 36198:case 36298:case 36306:case 35682:return c_;case 35679:case 36299:case 36307:return h_;case 35680:case 36300:case 36308:case 36293:return u_;case 36289:case 36303:case 36311:case 36292:return f_}}var $l=class{constructor(e,t,i){this.id=e,this.addr=i,this.cache=[],this.type=t.type,this.setValue=Yx(t.type)}},jl=class{constructor(e,t,i){this.id=e,this.addr=i,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=d_(t.type)}},Zl=class{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,i){let r=this.seq;for(let s=0,a=r.length;s!==a;++s){let o=r[s];o.setValue(e,t[o.id],i)}}},Cl=/(\w+)(\])?(\[|\.)?/g;function hf(n,e){n.seq.push(e),n.map[e.id]=e}function p_(n,e,t){let i=n.name,r=i.length;for(Cl.lastIndex=0;;){let s=Cl.exec(i),a=Cl.lastIndex,o=s[1],l=s[2]==="]",c=s[3];if(l&&(o=o|0),c===void 0||c==="["&&a+2===r){hf(t,c===void 0?new $l(o,n,e):new jl(o,n,e));break}else{let u=t.map[o];u===void 0&&(u=new Zl(o),hf(t,u)),t=u}}}var Lr=class{constructor(e,t){this.seq=[],this.map={};let i=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let r=0;r<i;++r){let s=e.getActiveUniform(t,r),a=e.getUniformLocation(t,s.name);p_(s,a,this)}}setValue(e,t,i,r){let s=this.map[t];s!==void 0&&s.setValue(e,i,r)}setOptional(e,t,i){let r=t[i];r!==void 0&&this.setValue(e,i,r)}static upload(e,t,i,r){for(let s=0,a=t.length;s!==a;++s){let o=t[s],l=i[o.id];l.needsUpdate!==!1&&o.setValue(e,l.value,r)}}static seqWithValue(e,t){let i=[];for(let r=0,s=e.length;r!==s;++r){let a=e[r];a.id in t&&i.push(a)}return i}};function uf(n,e,t){let i=n.createShader(e);return n.shaderSource(i,t),n.compileShader(i),i}var m_=37297,g_=0;function y_(n,e){let t=n.split(`
`),i=[],r=Math.max(e-6,0),s=Math.min(e+6,t.length);for(let a=r;a<s;a++){let o=a+1;i.push(`${o===e?">":" "} ${o}: ${t[a]}`)}return i.join(`
`)}function x_(n){let e=Qe.getPrimaries(Qe.workingColorSpace),t=Qe.getPrimaries(n),i;switch(e===t?i="":e===Vo&&t===Ho?i="LinearDisplayP3ToLinearSRGB":e===Ho&&t===Vo&&(i="LinearSRGBToLinearDisplayP3"),n){case ni:case da:return[i,"LinearTransferOETF"];case mt:case Lc:return[i,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space:",n),[i,"LinearTransferOETF"]}}function ff(n,e,t){let i=n.getShaderParameter(e,n.COMPILE_STATUS),r=n.getShaderInfoLog(e).trim();if(i&&r==="")return"";let s=/ERROR: 0:(\d+)/.exec(r);if(s){let a=parseInt(s[1]);return t.toUpperCase()+`

`+r+`

`+y_(n.getShaderSource(e),a)}else return r}function __(n,e){let t=x_(e);return`vec4 ${n}( vec4 value ) { return ${t[0]}( ${t[1]}( value ) ); }`}function v_(n,e){let t;switch(e){case Am:t="Linear";break;case Tm:t="Reinhard";break;case Rm:t="OptimizedCineon";break;case Cc:t="ACESFilmic";break;case Im:t="AgX";break;case Cm:t="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",e),t="Linear"}return"vec3 "+n+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}function b_(n){return[n.extensionDerivatives||n.envMapCubeUVHeight||n.bumpMap||n.normalMapTangentSpace||n.clearcoatNormalMap||n.flatShading||n.shaderID==="physical"?"#extension GL_OES_standard_derivatives : enable":"",(n.extensionFragDepth||n.logarithmicDepthBuffer)&&n.rendererExtensionFragDepth?"#extension GL_EXT_frag_depth : enable":"",n.extensionDrawBuffers&&n.rendererExtensionDrawBuffers?"#extension GL_EXT_draw_buffers : require":"",(n.extensionShaderTextureLOD||n.envMap||n.transmission)&&n.rendererExtensionShaderTextureLod?"#extension GL_EXT_shader_texture_lod : enable":""].filter(Tr).join(`
`)}function M_(n){return[n.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":""].filter(Tr).join(`
`)}function w_(n){let e=[];for(let t in n){let i=n[t];i!==!1&&e.push("#define "+t+" "+i)}return e.join(`
`)}function S_(n,e){let t={},i=n.getProgramParameter(e,n.ACTIVE_ATTRIBUTES);for(let r=0;r<i;r++){let s=n.getActiveAttrib(e,r),a=s.name,o=1;s.type===n.FLOAT_MAT2&&(o=2),s.type===n.FLOAT_MAT3&&(o=3),s.type===n.FLOAT_MAT4&&(o=4),t[a]={type:s.type,location:n.getAttribLocation(e,a),locationSize:o}}return t}function Tr(n){return n!==""}function df(n,e){let t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return n.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function pf(n,e){return n.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}var E_=/^[ \t]*#include +<([\w\d./]+)>/gm;function Jl(n){return n.replace(E_,T_)}var A_=new Map([["encodings_fragment","colorspace_fragment"],["encodings_pars_fragment","colorspace_pars_fragment"],["output_fragment","opaque_fragment"]]);function T_(n,e){let t=Pe[e];if(t===void 0){let i=A_.get(e);if(i!==void 0)t=Pe[i],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,i);else throw new Error("Can not resolve #include <"+e+">")}return Jl(t)}var R_=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function mf(n){return n.replace(R_,C_)}function C_(n,e,t,i){let r="";for(let s=parseInt(e);s<parseInt(t);s++)r+=i.replace(/\[\s*i\s*\]/g,"[ "+s+" ]").replace(/UNROLLED_LOOP_INDEX/g,s);return r}function gf(n){let e="precision "+n.precision+` float;
precision `+n.precision+" int;";return n.precision==="highp"?e+=`
#define HIGH_PRECISION`:n.precision==="mediump"?e+=`
#define MEDIUM_PRECISION`:n.precision==="lowp"&&(e+=`
#define LOW_PRECISION`),e}function I_(n){let e="SHADOWMAP_TYPE_BASIC";return n.shadowMapType===Of?e="SHADOWMAP_TYPE_PCF":n.shadowMapType===bi?e="SHADOWMAP_TYPE_PCF_SOFT":n.shadowMapType===ei&&(e="SHADOWMAP_TYPE_VSM"),e}function P_(n){let e="ENVMAP_TYPE_CUBE";if(n.envMap)switch(n.envMapMode){case Dr:case Nr:e="ENVMAP_TYPE_CUBE";break;case fa:e="ENVMAP_TYPE_CUBE_UV";break}return e}function L_(n){let e="ENVMAP_MODE_REFLECTION";if(n.envMap)switch(n.envMapMode){case Nr:e="ENVMAP_MODE_REFRACTION";break}return e}function D_(n){let e="ENVMAP_BLENDING_NONE";if(n.envMap)switch(n.combine){case Ff:e="ENVMAP_BLENDING_MULTIPLY";break;case Sm:e="ENVMAP_BLENDING_MIX";break;case Em:e="ENVMAP_BLENDING_ADD";break}return e}function N_(n){let e=n.envMapCubeUVHeight;if(e===null)return null;let t=Math.log2(e)-2,i=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),7*16)),texelHeight:i,maxMip:t}}function U_(n,e,t,i){let r=n.getContext(),s=t.defines,a=t.vertexShader,o=t.fragmentShader,l=I_(t),c=P_(t),h=L_(t),u=D_(t),f=N_(t),d=t.isWebGL2?"":b_(t),p=M_(t),y=w_(s),g=r.createProgram(),m,_,x=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(m=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,y].filter(Tr).join(`
`),m.length>0&&(m+=`
`),_=[d,"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,y].filter(Tr).join(`
`),_.length>0&&(_+=`
`)):(m=[gf(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,y,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+h:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors&&t.isWebGL2?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0&&t.isWebGL2?"#define MORPHTARGETS_TEXTURE":"",t.morphTargetsCount>0&&t.isWebGL2?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0&&t.isWebGL2?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.useLegacyLights?"#define LEGACY_LIGHTS":"",t.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",t.logarithmicDepthBuffer&&t.rendererExtensionFragDepth?"#define USE_LOGDEPTHBUF_EXT":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#if ( defined( USE_MORPHTARGETS ) && ! defined( MORPHTARGETS_TEXTURE ) )","	attribute vec3 morphTarget0;","	attribute vec3 morphTarget1;","	attribute vec3 morphTarget2;","	attribute vec3 morphTarget3;","	#ifdef USE_MORPHNORMALS","		attribute vec3 morphNormal0;","		attribute vec3 morphNormal1;","		attribute vec3 morphNormal2;","		attribute vec3 morphNormal3;","	#else","		attribute vec3 morphTarget4;","		attribute vec3 morphTarget5;","		attribute vec3 morphTarget6;","		attribute vec3 morphTarget7;","	#endif","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Tr).join(`
`),_=[d,gf(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,y,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+c:"",t.envMap?"#define "+h:"",t.envMap?"#define "+u:"",f?"#define CUBEUV_TEXEL_WIDTH "+f.texelWidth:"",f?"#define CUBEUV_TEXEL_HEIGHT "+f.texelHeight:"",f?"#define CUBEUV_MAX_MIP "+f.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.useLegacyLights?"#define LEGACY_LIGHTS":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",t.logarithmicDepthBuffer&&t.rendererExtensionFragDepth?"#define USE_LOGDEPTHBUF_EXT":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==gi?"#define TONE_MAPPING":"",t.toneMapping!==gi?Pe.tonemapping_pars_fragment:"",t.toneMapping!==gi?v_("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",Pe.colorspace_pars_fragment,__("linearToOutputTexel",t.outputColorSpace),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(Tr).join(`
`)),a=Jl(a),a=df(a,t),a=pf(a,t),o=Jl(o),o=df(o,t),o=pf(o,t),a=mf(a),o=mf(o),t.isWebGL2&&t.isRawShaderMaterial!==!0&&(x=`#version 300 es
`,m=[p,"precision mediump sampler2DArray;","#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+m,_=["precision mediump sampler2DArray;","#define varying in",t.glslVersion===Nu?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===Nu?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+_);let v=x+m+a,E=x+_+o,w=uf(r,r.VERTEX_SHADER,v),M=uf(r,r.FRAGMENT_SHADER,E);r.attachShader(g,w),r.attachShader(g,M),t.index0AttributeName!==void 0?r.bindAttribLocation(g,0,t.index0AttributeName):t.morphTargets===!0&&r.bindAttribLocation(g,0,"position"),r.linkProgram(g);function T(O){if(n.debug.checkShaderErrors){let k=r.getProgramInfoLog(g).trim(),L=r.getShaderInfoLog(w).trim(),U=r.getShaderInfoLog(M).trim(),F=!0,H=!0;if(r.getProgramParameter(g,r.LINK_STATUS)===!1)if(F=!1,typeof n.debug.onShaderError=="function")n.debug.onShaderError(r,g,w,M);else{let N=ff(r,w,"vertex"),B=ff(r,M,"fragment");console.error("THREE.WebGLProgram: Shader Error "+r.getError()+" - VALIDATE_STATUS "+r.getProgramParameter(g,r.VALIDATE_STATUS)+`

Program Info Log: `+k+`
`+N+`
`+B)}else k!==""?console.warn("THREE.WebGLProgram: Program Info Log:",k):(L===""||U==="")&&(H=!1);H&&(O.diagnostics={runnable:F,programLog:k,vertexShader:{log:L,prefix:m},fragmentShader:{log:U,prefix:_}})}r.deleteShader(w),r.deleteShader(M),b=new Lr(r,g),S=S_(r,g)}let b;this.getUniforms=function(){return b===void 0&&T(this),b};let S;this.getAttributes=function(){return S===void 0&&T(this),S};let I=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return I===!1&&(I=r.getProgramParameter(g,m_)),I},this.destroy=function(){i.releaseStatesOfProgram(this),r.deleteProgram(g),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=g_++,this.cacheKey=e,this.usedTimes=1,this.program=g,this.vertexShader=w,this.fragmentShader=M,this}var O_=0,Kl=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e){let t=e.vertexShader,i=e.fragmentShader,r=this._getShaderStage(t),s=this._getShaderStage(i),a=this._getShaderCacheForMaterial(e);return a.has(r)===!1&&(a.add(r),r.usedTimes++),a.has(s)===!1&&(a.add(s),s.usedTimes++),this}remove(e){let t=this.materialCache.get(e);for(let i of t)i.usedTimes--,i.usedTimes===0&&this.shaderCache.delete(i.code);return this.materialCache.delete(e),this}getVertexShaderID(e){return this._getShaderStage(e.vertexShader).id}getFragmentShaderID(e){return this._getShaderStage(e.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){let t=this.materialCache,i=t.get(e);return i===void 0&&(i=new Set,t.set(e,i)),i}_getShaderStage(e){let t=this.shaderCache,i=t.get(e);return i===void 0&&(i=new Ql(e),t.set(e,i)),i}},Ql=class{constructor(e){this.id=O_++,this.code=e,this.usedTimes=0}};function F_(n,e,t,i,r,s,a){let o=new Zo,l=new Kl,c=[],h=r.isWebGL2,u=r.logarithmicDepthBuffer,f=r.vertexTextures,d=r.precision,p={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function y(b){return b===0?"uv":`uv${b}`}function g(b,S,I,O,k){let L=O.fog,U=k.geometry,F=b.isMeshStandardMaterial?O.environment:null,H=(b.isMeshStandardMaterial?t:e).get(b.envMap||F),N=H&&H.mapping===fa?H.image.height:null,B=p[b.type];b.precision!==null&&(d=r.getMaxPrecision(b.precision),d!==b.precision&&console.warn("THREE.WebGLProgram.getParameters:",b.precision,"not supported, using",d,"instead."));let $=U.morphAttributes.position||U.morphAttributes.normal||U.morphAttributes.color,J=$!==void 0?$.length:0,re=0;U.morphAttributes.position!==void 0&&(re=1),U.morphAttributes.normal!==void 0&&(re=2),U.morphAttributes.color!==void 0&&(re=3);let Y,Z,le,de;if(B){let jt=Bn[B];Y=jt.vertexShader,Z=jt.fragmentShader}else Y=b.vertexShader,Z=b.fragmentShader,l.update(b),le=l.getVertexShaderID(b),de=l.getFragmentShaderID(b);let xe=n.getRenderTarget(),De=k.isInstancedMesh===!0,Ue=k.isBatchedMesh===!0,Se=!!b.map,Ye=!!b.matcap,V=!!H,$t=!!b.aoMap,ve=!!b.lightMap,Ce=!!b.bumpMap,pe=!!b.normalMap,dt=!!b.displacementMap,Fe=!!b.emissiveMap,C=!!b.metalnessMap,A=!!b.roughnessMap,W=b.anisotropy>0,ee=b.clearcoat>0,Q=b.iridescence>0,te=b.sheen>0,me=b.transmission>0,ae=W&&!!b.anisotropyMap,ue=ee&&!!b.clearcoatMap,we=ee&&!!b.clearcoatNormalMap,ze=ee&&!!b.clearcoatRoughnessMap,K=Q&&!!b.iridescenceMap,Ke=Q&&!!b.iridescenceThicknessMap,We=te&&!!b.sheenColorMap,Re=te&&!!b.sheenRoughnessMap,_e=!!b.specularMap,fe=!!b.specularColorMap,Oe=!!b.specularIntensityMap,Je=me&&!!b.transmissionMap,xt=me&&!!b.thicknessMap,ke=!!b.gradientMap,ne=!!b.alphaMap,D=b.alphaTest>0,se=!!b.alphaHash,oe=!!b.extensions,Ee=!!U.attributes.uv1,be=!!U.attributes.uv2,it=!!U.attributes.uv3,rt=gi;return b.toneMapped&&(xe===null||xe.isXRRenderTarget===!0)&&(rt=n.toneMapping),{isWebGL2:h,shaderID:B,shaderType:b.type,shaderName:b.name,vertexShader:Y,fragmentShader:Z,defines:b.defines,customVertexShaderID:le,customFragmentShaderID:de,isRawShaderMaterial:b.isRawShaderMaterial===!0,glslVersion:b.glslVersion,precision:d,batching:Ue,instancing:De,instancingColor:De&&k.instanceColor!==null,supportsVertexTextures:f,outputColorSpace:xe===null?n.outputColorSpace:xe.isXRRenderTarget===!0?xe.texture.colorSpace:ni,map:Se,matcap:Ye,envMap:V,envMapMode:V&&H.mapping,envMapCubeUVHeight:N,aoMap:$t,lightMap:ve,bumpMap:Ce,normalMap:pe,displacementMap:f&&dt,emissiveMap:Fe,normalMapObjectSpace:pe&&b.normalMapType===Vm,normalMapTangentSpace:pe&&b.normalMapType===Pc,metalnessMap:C,roughnessMap:A,anisotropy:W,anisotropyMap:ae,clearcoat:ee,clearcoatMap:ue,clearcoatNormalMap:we,clearcoatRoughnessMap:ze,iridescence:Q,iridescenceMap:K,iridescenceThicknessMap:Ke,sheen:te,sheenColorMap:We,sheenRoughnessMap:Re,specularMap:_e,specularColorMap:fe,specularIntensityMap:Oe,transmission:me,transmissionMap:Je,thicknessMap:xt,gradientMap:ke,opaque:b.transparent===!1&&b.blending===Cr,alphaMap:ne,alphaTest:D,alphaHash:se,combine:b.combine,mapUv:Se&&y(b.map.channel),aoMapUv:$t&&y(b.aoMap.channel),lightMapUv:ve&&y(b.lightMap.channel),bumpMapUv:Ce&&y(b.bumpMap.channel),normalMapUv:pe&&y(b.normalMap.channel),displacementMapUv:dt&&y(b.displacementMap.channel),emissiveMapUv:Fe&&y(b.emissiveMap.channel),metalnessMapUv:C&&y(b.metalnessMap.channel),roughnessMapUv:A&&y(b.roughnessMap.channel),anisotropyMapUv:ae&&y(b.anisotropyMap.channel),clearcoatMapUv:ue&&y(b.clearcoatMap.channel),clearcoatNormalMapUv:we&&y(b.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:ze&&y(b.clearcoatRoughnessMap.channel),iridescenceMapUv:K&&y(b.iridescenceMap.channel),iridescenceThicknessMapUv:Ke&&y(b.iridescenceThicknessMap.channel),sheenColorMapUv:We&&y(b.sheenColorMap.channel),sheenRoughnessMapUv:Re&&y(b.sheenRoughnessMap.channel),specularMapUv:_e&&y(b.specularMap.channel),specularColorMapUv:fe&&y(b.specularColorMap.channel),specularIntensityMapUv:Oe&&y(b.specularIntensityMap.channel),transmissionMapUv:Je&&y(b.transmissionMap.channel),thicknessMapUv:xt&&y(b.thicknessMap.channel),alphaMapUv:ne&&y(b.alphaMap.channel),vertexTangents:!!U.attributes.tangent&&(pe||W),vertexColors:b.vertexColors,vertexAlphas:b.vertexColors===!0&&!!U.attributes.color&&U.attributes.color.itemSize===4,vertexUv1s:Ee,vertexUv2s:be,vertexUv3s:it,pointsUvs:k.isPoints===!0&&!!U.attributes.uv&&(Se||ne),fog:!!L,useFog:b.fog===!0,fogExp2:L&&L.isFogExp2,flatShading:b.flatShading===!0,sizeAttenuation:b.sizeAttenuation===!0,logarithmicDepthBuffer:u,skinning:k.isSkinnedMesh===!0,morphTargets:U.morphAttributes.position!==void 0,morphNormals:U.morphAttributes.normal!==void 0,morphColors:U.morphAttributes.color!==void 0,morphTargetsCount:J,morphTextureStride:re,numDirLights:S.directional.length,numPointLights:S.point.length,numSpotLights:S.spot.length,numSpotLightMaps:S.spotLightMap.length,numRectAreaLights:S.rectArea.length,numHemiLights:S.hemi.length,numDirLightShadows:S.directionalShadowMap.length,numPointLightShadows:S.pointShadowMap.length,numSpotLightShadows:S.spotShadowMap.length,numSpotLightShadowsWithMaps:S.numSpotLightShadowsWithMaps,numLightProbes:S.numLightProbes,numClippingPlanes:a.numPlanes,numClipIntersection:a.numIntersection,dithering:b.dithering,shadowMapEnabled:n.shadowMap.enabled&&I.length>0,shadowMapType:n.shadowMap.type,toneMapping:rt,useLegacyLights:n._useLegacyLights,decodeVideoTexture:Se&&b.map.isVideoTexture===!0&&Qe.getTransfer(b.map.colorSpace)===at,premultipliedAlpha:b.premultipliedAlpha,doubleSided:b.side===Rt,flipSided:b.side===en,useDepthPacking:b.depthPacking>=0,depthPacking:b.depthPacking||0,index0AttributeName:b.index0AttributeName,extensionDerivatives:oe&&b.extensions.derivatives===!0,extensionFragDepth:oe&&b.extensions.fragDepth===!0,extensionDrawBuffers:oe&&b.extensions.drawBuffers===!0,extensionShaderTextureLOD:oe&&b.extensions.shaderTextureLOD===!0,extensionClipCullDistance:oe&&b.extensions.clipCullDistance&&i.has("WEBGL_clip_cull_distance"),rendererExtensionFragDepth:h||i.has("EXT_frag_depth"),rendererExtensionDrawBuffers:h||i.has("WEBGL_draw_buffers"),rendererExtensionShaderTextureLod:h||i.has("EXT_shader_texture_lod"),rendererExtensionParallelShaderCompile:i.has("KHR_parallel_shader_compile"),customProgramCacheKey:b.customProgramCacheKey()}}function m(b){let S=[];if(b.shaderID?S.push(b.shaderID):(S.push(b.customVertexShaderID),S.push(b.customFragmentShaderID)),b.defines!==void 0)for(let I in b.defines)S.push(I),S.push(b.defines[I]);return b.isRawShaderMaterial===!1&&(_(S,b),x(S,b),S.push(n.outputColorSpace)),S.push(b.customProgramCacheKey),S.join()}function _(b,S){b.push(S.precision),b.push(S.outputColorSpace),b.push(S.envMapMode),b.push(S.envMapCubeUVHeight),b.push(S.mapUv),b.push(S.alphaMapUv),b.push(S.lightMapUv),b.push(S.aoMapUv),b.push(S.bumpMapUv),b.push(S.normalMapUv),b.push(S.displacementMapUv),b.push(S.emissiveMapUv),b.push(S.metalnessMapUv),b.push(S.roughnessMapUv),b.push(S.anisotropyMapUv),b.push(S.clearcoatMapUv),b.push(S.clearcoatNormalMapUv),b.push(S.clearcoatRoughnessMapUv),b.push(S.iridescenceMapUv),b.push(S.iridescenceThicknessMapUv),b.push(S.sheenColorMapUv),b.push(S.sheenRoughnessMapUv),b.push(S.specularMapUv),b.push(S.specularColorMapUv),b.push(S.specularIntensityMapUv),b.push(S.transmissionMapUv),b.push(S.thicknessMapUv),b.push(S.combine),b.push(S.fogExp2),b.push(S.sizeAttenuation),b.push(S.morphTargetsCount),b.push(S.morphAttributeCount),b.push(S.numDirLights),b.push(S.numPointLights),b.push(S.numSpotLights),b.push(S.numSpotLightMaps),b.push(S.numHemiLights),b.push(S.numRectAreaLights),b.push(S.numDirLightShadows),b.push(S.numPointLightShadows),b.push(S.numSpotLightShadows),b.push(S.numSpotLightShadowsWithMaps),b.push(S.numLightProbes),b.push(S.shadowMapType),b.push(S.toneMapping),b.push(S.numClippingPlanes),b.push(S.numClipIntersection),b.push(S.depthPacking)}function x(b,S){o.disableAll(),S.isWebGL2&&o.enable(0),S.supportsVertexTextures&&o.enable(1),S.instancing&&o.enable(2),S.instancingColor&&o.enable(3),S.matcap&&o.enable(4),S.envMap&&o.enable(5),S.normalMapObjectSpace&&o.enable(6),S.normalMapTangentSpace&&o.enable(7),S.clearcoat&&o.enable(8),S.iridescence&&o.enable(9),S.alphaTest&&o.enable(10),S.vertexColors&&o.enable(11),S.vertexAlphas&&o.enable(12),S.vertexUv1s&&o.enable(13),S.vertexUv2s&&o.enable(14),S.vertexUv3s&&o.enable(15),S.vertexTangents&&o.enable(16),S.anisotropy&&o.enable(17),S.alphaHash&&o.enable(18),S.batching&&o.enable(19),b.push(o.mask),o.disableAll(),S.fog&&o.enable(0),S.useFog&&o.enable(1),S.flatShading&&o.enable(2),S.logarithmicDepthBuffer&&o.enable(3),S.skinning&&o.enable(4),S.morphTargets&&o.enable(5),S.morphNormals&&o.enable(6),S.morphColors&&o.enable(7),S.premultipliedAlpha&&o.enable(8),S.shadowMapEnabled&&o.enable(9),S.useLegacyLights&&o.enable(10),S.doubleSided&&o.enable(11),S.flipSided&&o.enable(12),S.useDepthPacking&&o.enable(13),S.dithering&&o.enable(14),S.transmission&&o.enable(15),S.sheen&&o.enable(16),S.opaque&&o.enable(17),S.pointsUvs&&o.enable(18),S.decodeVideoTexture&&o.enable(19),b.push(o.mask)}function v(b){let S=p[b.type],I;if(S){let O=Bn[S];I=A0.clone(O.uniforms)}else I=b.uniforms;return I}function E(b,S){let I;for(let O=0,k=c.length;O<k;O++){let L=c[O];if(L.cacheKey===S){I=L,++I.usedTimes;break}}return I===void 0&&(I=new U_(n,S,b,s),c.push(I)),I}function w(b){if(--b.usedTimes===0){let S=c.indexOf(b);c[S]=c[c.length-1],c.pop(),b.destroy()}}function M(b){l.remove(b)}function T(){l.dispose()}return{getParameters:g,getProgramCacheKey:m,getUniforms:v,acquireProgram:E,releaseProgram:w,releaseShaderCache:M,programs:c,dispose:T}}function z_(){let n=new WeakMap;function e(s){let a=n.get(s);return a===void 0&&(a={},n.set(s,a)),a}function t(s){n.delete(s)}function i(s,a,o){n.get(s)[a]=o}function r(){n=new WeakMap}return{get:e,remove:t,update:i,dispose:r}}function B_(n,e){return n.groupOrder!==e.groupOrder?n.groupOrder-e.groupOrder:n.renderOrder!==e.renderOrder?n.renderOrder-e.renderOrder:n.material.id!==e.material.id?n.material.id-e.material.id:n.z!==e.z?n.z-e.z:n.id-e.id}function yf(n,e){return n.groupOrder!==e.groupOrder?n.groupOrder-e.groupOrder:n.renderOrder!==e.renderOrder?n.renderOrder-e.renderOrder:n.z!==e.z?e.z-n.z:n.id-e.id}function xf(){let n=[],e=0,t=[],i=[],r=[];function s(){e=0,t.length=0,i.length=0,r.length=0}function a(u,f,d,p,y,g){let m=n[e];return m===void 0?(m={id:u.id,object:u,geometry:f,material:d,groupOrder:p,renderOrder:u.renderOrder,z:y,group:g},n[e]=m):(m.id=u.id,m.object=u,m.geometry=f,m.material=d,m.groupOrder=p,m.renderOrder=u.renderOrder,m.z=y,m.group=g),e++,m}function o(u,f,d,p,y,g){let m=a(u,f,d,p,y,g);d.transmission>0?i.push(m):d.transparent===!0?r.push(m):t.push(m)}function l(u,f,d,p,y,g){let m=a(u,f,d,p,y,g);d.transmission>0?i.unshift(m):d.transparent===!0?r.unshift(m):t.unshift(m)}function c(u,f){t.length>1&&t.sort(u||B_),i.length>1&&i.sort(f||yf),r.length>1&&r.sort(f||yf)}function h(){for(let u=e,f=n.length;u<f;u++){let d=n[u];if(d.id===null)break;d.id=null,d.object=null,d.geometry=null,d.material=null,d.group=null}}return{opaque:t,transmissive:i,transparent:r,init:s,push:o,unshift:l,finish:h,sort:c}}function k_(){let n=new WeakMap;function e(i,r){let s=n.get(i),a;return s===void 0?(a=new xf,n.set(i,[a])):r>=s.length?(a=new xf,s.push(a)):a=s[r],a}function t(){n=new WeakMap}return{get:e,dispose:t}}function H_(){let n={};return{get:function(e){if(n[e.id]!==void 0)return n[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new P,color:new ye};break;case"SpotLight":t={position:new P,direction:new P,color:new ye,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new P,color:new ye,distance:0,decay:0};break;case"HemisphereLight":t={direction:new P,skyColor:new ye,groundColor:new ye};break;case"RectAreaLight":t={color:new ye,position:new P,halfWidth:new P,halfHeight:new P};break}return n[e.id]=t,t}}}function V_(){let n={};return{get:function(e){if(n[e.id]!==void 0)return n[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ce};break;case"SpotLight":t={shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ce};break;case"PointLight":t={shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ce,shadowCameraNear:1,shadowCameraFar:1e3};break}return n[e.id]=t,t}}}var G_=0;function W_(n,e){return(e.castShadow?2:0)-(n.castShadow?2:0)+(e.map?1:0)-(n.map?1:0)}function X_(n,e){let t=new H_,i=V_(),r={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let h=0;h<9;h++)r.probe.push(new P);let s=new P,a=new et,o=new et;function l(h,u){let f=0,d=0,p=0;for(let O=0;O<9;O++)r.probe[O].set(0,0,0);let y=0,g=0,m=0,_=0,x=0,v=0,E=0,w=0,M=0,T=0,b=0;h.sort(W_);let S=u===!0?Math.PI:1;for(let O=0,k=h.length;O<k;O++){let L=h[O],U=L.color,F=L.intensity,H=L.distance,N=L.shadow&&L.shadow.map?L.shadow.map.texture:null;if(L.isAmbientLight)f+=U.r*F*S,d+=U.g*F*S,p+=U.b*F*S;else if(L.isLightProbe){for(let B=0;B<9;B++)r.probe[B].addScaledVector(L.sh.coefficients[B],F);b++}else if(L.isDirectionalLight){let B=t.get(L);if(B.color.copy(L.color).multiplyScalar(L.intensity*S),L.castShadow){let $=L.shadow,J=i.get(L);J.shadowBias=$.bias,J.shadowNormalBias=$.normalBias,J.shadowRadius=$.radius,J.shadowMapSize=$.mapSize,r.directionalShadow[y]=J,r.directionalShadowMap[y]=N,r.directionalShadowMatrix[y]=L.shadow.matrix,v++}r.directional[y]=B,y++}else if(L.isSpotLight){let B=t.get(L);B.position.setFromMatrixPosition(L.matrixWorld),B.color.copy(U).multiplyScalar(F*S),B.distance=H,B.coneCos=Math.cos(L.angle),B.penumbraCos=Math.cos(L.angle*(1-L.penumbra)),B.decay=L.decay,r.spot[m]=B;let $=L.shadow;if(L.map&&(r.spotLightMap[M]=L.map,M++,$.updateMatrices(L),L.castShadow&&T++),r.spotLightMatrix[m]=$.matrix,L.castShadow){let J=i.get(L);J.shadowBias=$.bias,J.shadowNormalBias=$.normalBias,J.shadowRadius=$.radius,J.shadowMapSize=$.mapSize,r.spotShadow[m]=J,r.spotShadowMap[m]=N,w++}m++}else if(L.isRectAreaLight){let B=t.get(L);B.color.copy(U).multiplyScalar(F),B.halfWidth.set(L.width*.5,0,0),B.halfHeight.set(0,L.height*.5,0),r.rectArea[_]=B,_++}else if(L.isPointLight){let B=t.get(L);if(B.color.copy(L.color).multiplyScalar(L.intensity*S),B.distance=L.distance,B.decay=L.decay,L.castShadow){let $=L.shadow,J=i.get(L);J.shadowBias=$.bias,J.shadowNormalBias=$.normalBias,J.shadowRadius=$.radius,J.shadowMapSize=$.mapSize,J.shadowCameraNear=$.camera.near,J.shadowCameraFar=$.camera.far,r.pointShadow[g]=J,r.pointShadowMap[g]=N,r.pointShadowMatrix[g]=L.shadow.matrix,E++}r.point[g]=B,g++}else if(L.isHemisphereLight){let B=t.get(L);B.skyColor.copy(L.color).multiplyScalar(F*S),B.groundColor.copy(L.groundColor).multiplyScalar(F*S),r.hemi[x]=B,x++}}_>0&&(e.isWebGL2?n.has("OES_texture_float_linear")===!0?(r.rectAreaLTC1=ie.LTC_FLOAT_1,r.rectAreaLTC2=ie.LTC_FLOAT_2):(r.rectAreaLTC1=ie.LTC_HALF_1,r.rectAreaLTC2=ie.LTC_HALF_2):n.has("OES_texture_float_linear")===!0?(r.rectAreaLTC1=ie.LTC_FLOAT_1,r.rectAreaLTC2=ie.LTC_FLOAT_2):n.has("OES_texture_half_float_linear")===!0?(r.rectAreaLTC1=ie.LTC_HALF_1,r.rectAreaLTC2=ie.LTC_HALF_2):console.error("THREE.WebGLRenderer: Unable to use RectAreaLight. Missing WebGL extensions.")),r.ambient[0]=f,r.ambient[1]=d,r.ambient[2]=p;let I=r.hash;(I.directionalLength!==y||I.pointLength!==g||I.spotLength!==m||I.rectAreaLength!==_||I.hemiLength!==x||I.numDirectionalShadows!==v||I.numPointShadows!==E||I.numSpotShadows!==w||I.numSpotMaps!==M||I.numLightProbes!==b)&&(r.directional.length=y,r.spot.length=m,r.rectArea.length=_,r.point.length=g,r.hemi.length=x,r.directionalShadow.length=v,r.directionalShadowMap.length=v,r.pointShadow.length=E,r.pointShadowMap.length=E,r.spotShadow.length=w,r.spotShadowMap.length=w,r.directionalShadowMatrix.length=v,r.pointShadowMatrix.length=E,r.spotLightMatrix.length=w+M-T,r.spotLightMap.length=M,r.numSpotLightShadowsWithMaps=T,r.numLightProbes=b,I.directionalLength=y,I.pointLength=g,I.spotLength=m,I.rectAreaLength=_,I.hemiLength=x,I.numDirectionalShadows=v,I.numPointShadows=E,I.numSpotShadows=w,I.numSpotMaps=M,I.numLightProbes=b,r.version=G_++)}function c(h,u){let f=0,d=0,p=0,y=0,g=0,m=u.matrixWorldInverse;for(let _=0,x=h.length;_<x;_++){let v=h[_];if(v.isDirectionalLight){let E=r.directional[f];E.direction.setFromMatrixPosition(v.matrixWorld),s.setFromMatrixPosition(v.target.matrixWorld),E.direction.sub(s),E.direction.transformDirection(m),f++}else if(v.isSpotLight){let E=r.spot[p];E.position.setFromMatrixPosition(v.matrixWorld),E.position.applyMatrix4(m),E.direction.setFromMatrixPosition(v.matrixWorld),s.setFromMatrixPosition(v.target.matrixWorld),E.direction.sub(s),E.direction.transformDirection(m),p++}else if(v.isRectAreaLight){let E=r.rectArea[y];E.position.setFromMatrixPosition(v.matrixWorld),E.position.applyMatrix4(m),o.identity(),a.copy(v.matrixWorld),a.premultiply(m),o.extractRotation(a),E.halfWidth.set(v.width*.5,0,0),E.halfHeight.set(0,v.height*.5,0),E.halfWidth.applyMatrix4(o),E.halfHeight.applyMatrix4(o),y++}else if(v.isPointLight){let E=r.point[d];E.position.setFromMatrixPosition(v.matrixWorld),E.position.applyMatrix4(m),d++}else if(v.isHemisphereLight){let E=r.hemi[g];E.direction.setFromMatrixPosition(v.matrixWorld),E.direction.transformDirection(m),g++}}}return{setup:l,setupView:c,state:r}}function _f(n,e){let t=new X_(n,e),i=[],r=[];function s(){i.length=0,r.length=0}function a(u){i.push(u)}function o(u){r.push(u)}function l(u){t.setup(i,u)}function c(u){t.setupView(i,u)}return{init:s,state:{lightsArray:i,shadowsArray:r,lights:t},setupLights:l,setupLightsView:c,pushLight:a,pushShadow:o}}function q_(n,e){let t=new WeakMap;function i(s,a=0){let o=t.get(s),l;return o===void 0?(l=new _f(n,e),t.set(s,[l])):a>=o.length?(l=new _f(n,e),o.push(l)):l=o[a],l}function r(){t=new WeakMap}return{get:i,dispose:r}}var ec=class extends Hn{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=km,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}},tc=class extends Hn{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}},Y_=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,$_=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
#include <packing>
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = unpackRGBATo2Half( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ) );
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = unpackRGBAToDepth( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ) );
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( squared_mean - mean * mean );
	gl_FragColor = pack2HalfToRGBA( vec2( mean, std_dev ) );
}`;function j_(n,e,t){let i=new As,r=new ce,s=new ce,a=new Ge,o=new ec({depthPacking:Hm}),l=new tc,c={},h=t.maxTextureSize,u={[Qt]:en,[en]:Qt,[Rt]:Rt},f=new wn({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new ce},radius:{value:4}},vertexShader:Y_,fragmentShader:$_}),d=f.clone();d.defines.HORIZONTAL_PASS=1;let p=new Ft;p.setAttribute("position",new tn(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let y=new St(p,f),g=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Of;let m=this.type;this.render=function(w,M,T){if(g.enabled===!1||g.autoUpdate===!1&&g.needsUpdate===!1||w.length===0)return;let b=n.getRenderTarget(),S=n.getActiveCubeFace(),I=n.getActiveMipmapLevel(),O=n.state;O.setBlending(mi),O.buffers.color.setClear(1,1,1,1),O.buffers.depth.setTest(!0),O.setScissorTest(!1);let k=m!==ei&&this.type===ei,L=m===ei&&this.type!==ei;for(let U=0,F=w.length;U<F;U++){let H=w[U],N=H.shadow;if(N===void 0){console.warn("THREE.WebGLShadowMap:",H,"has no shadow.");continue}if(N.autoUpdate===!1&&N.needsUpdate===!1)continue;r.copy(N.mapSize);let B=N.getFrameExtents();if(r.multiply(B),s.copy(N.mapSize),(r.x>h||r.y>h)&&(r.x>h&&(s.x=Math.floor(h/B.x),r.x=s.x*B.x,N.mapSize.x=s.x),r.y>h&&(s.y=Math.floor(h/B.y),r.y=s.y*B.y,N.mapSize.y=s.y)),N.map===null||k===!0||L===!0){let J=this.type!==ei?{minFilter:vt,magFilter:vt}:{};N.map!==null&&N.map.dispose(),N.map=new fn(r.x,r.y,J),N.map.texture.name=H.name+".shadowMap",N.camera.updateProjectionMatrix()}n.setRenderTarget(N.map),n.clear();let $=N.getViewportCount();for(let J=0;J<$;J++){let re=N.getViewport(J);a.set(s.x*re.x,s.y*re.y,s.x*re.z,s.y*re.w),O.viewport(a),N.updateMatrices(H,J),i=N.getFrustum(),v(M,T,N.camera,H,this.type)}N.isPointLightShadow!==!0&&this.type===ei&&_(N,T),N.needsUpdate=!1}m=this.type,g.needsUpdate=!1,n.setRenderTarget(b,S,I)};function _(w,M){let T=e.update(y);f.defines.VSM_SAMPLES!==w.blurSamples&&(f.defines.VSM_SAMPLES=w.blurSamples,d.defines.VSM_SAMPLES=w.blurSamples,f.needsUpdate=!0,d.needsUpdate=!0),w.mapPass===null&&(w.mapPass=new fn(r.x,r.y)),f.uniforms.shadow_pass.value=w.map.texture,f.uniforms.resolution.value=w.mapSize,f.uniforms.radius.value=w.radius,n.setRenderTarget(w.mapPass),n.clear(),n.renderBufferDirect(M,null,T,f,y,null),d.uniforms.shadow_pass.value=w.mapPass.texture,d.uniforms.resolution.value=w.mapSize,d.uniforms.radius.value=w.radius,n.setRenderTarget(w.map),n.clear(),n.renderBufferDirect(M,null,T,d,y,null)}function x(w,M,T,b){let S=null,I=T.isPointLight===!0?w.customDistanceMaterial:w.customDepthMaterial;if(I!==void 0)S=I;else if(S=T.isPointLight===!0?l:o,n.localClippingEnabled&&M.clipShadows===!0&&Array.isArray(M.clippingPlanes)&&M.clippingPlanes.length!==0||M.displacementMap&&M.displacementScale!==0||M.alphaMap&&M.alphaTest>0||M.map&&M.alphaTest>0){let O=S.uuid,k=M.uuid,L=c[O];L===void 0&&(L={},c[O]=L);let U=L[k];U===void 0&&(U=S.clone(),L[k]=U,M.addEventListener("dispose",E)),S=U}if(S.visible=M.visible,S.wireframe=M.wireframe,b===ei?S.side=M.shadowSide!==null?M.shadowSide:M.side:S.side=M.shadowSide!==null?M.shadowSide:u[M.side],S.alphaMap=M.alphaMap,S.alphaTest=M.alphaTest,S.map=M.map,S.clipShadows=M.clipShadows,S.clippingPlanes=M.clippingPlanes,S.clipIntersection=M.clipIntersection,S.displacementMap=M.displacementMap,S.displacementScale=M.displacementScale,S.displacementBias=M.displacementBias,S.wireframeLinewidth=M.wireframeLinewidth,S.linewidth=M.linewidth,T.isPointLight===!0&&S.isMeshDistanceMaterial===!0){let O=n.properties.get(S);O.light=T}return S}function v(w,M,T,b,S){if(w.visible===!1)return;if(w.layers.test(M.layers)&&(w.isMesh||w.isLine||w.isPoints)&&(w.castShadow||w.receiveShadow&&S===ei)&&(!w.frustumCulled||i.intersectsObject(w))){w.modelViewMatrix.multiplyMatrices(T.matrixWorldInverse,w.matrixWorld);let k=e.update(w),L=w.material;if(Array.isArray(L)){let U=k.groups;for(let F=0,H=U.length;F<H;F++){let N=U[F],B=L[N.materialIndex];if(B&&B.visible){let $=x(w,B,b,S);w.onBeforeShadow(n,w,M,T,k,$,N),n.renderBufferDirect(T,null,k,$,w,N),w.onAfterShadow(n,w,M,T,k,$,N)}}}else if(L.visible){let U=x(w,L,b,S);w.onBeforeShadow(n,w,M,T,k,U,null),n.renderBufferDirect(T,null,k,U,w,null),w.onAfterShadow(n,w,M,T,k,U,null)}}let O=w.children;for(let k=0,L=O.length;k<L;k++)v(O[k],M,T,b,S)}function E(w){w.target.removeEventListener("dispose",E);for(let T in c){let b=c[T],S=w.target.uuid;S in b&&(b[S].dispose(),delete b[S])}}}function Z_(n,e,t){let i=t.isWebGL2;function r(){let D=!1,se=new Ge,oe=null,Ee=new Ge(0,0,0,0);return{setMask:function(be){oe!==be&&!D&&(n.colorMask(be,be,be,be),oe=be)},setLocked:function(be){D=be},setClear:function(be,it,rt,Dt,jt){jt===!0&&(be*=Dt,it*=Dt,rt*=Dt),se.set(be,it,rt,Dt),Ee.equals(se)===!1&&(n.clearColor(be,it,rt,Dt),Ee.copy(se))},reset:function(){D=!1,oe=null,Ee.set(-1,0,0,0)}}}function s(){let D=!1,se=null,oe=null,Ee=null;return{setTest:function(be){be?Ue(n.DEPTH_TEST):Se(n.DEPTH_TEST)},setMask:function(be){se!==be&&!D&&(n.depthMask(be),se=be)},setFunc:function(be){if(oe!==be){switch(be){case ym:n.depthFunc(n.NEVER);break;case xm:n.depthFunc(n.ALWAYS);break;case _m:n.depthFunc(n.LESS);break;case Fo:n.depthFunc(n.LEQUAL);break;case vm:n.depthFunc(n.EQUAL);break;case bm:n.depthFunc(n.GEQUAL);break;case Mm:n.depthFunc(n.GREATER);break;case wm:n.depthFunc(n.NOTEQUAL);break;default:n.depthFunc(n.LEQUAL)}oe=be}},setLocked:function(be){D=be},setClear:function(be){Ee!==be&&(n.clearDepth(be),Ee=be)},reset:function(){D=!1,se=null,oe=null,Ee=null}}}function a(){let D=!1,se=null,oe=null,Ee=null,be=null,it=null,rt=null,Dt=null,jt=null;return{setTest:function(st){D||(st?Ue(n.STENCIL_TEST):Se(n.STENCIL_TEST))},setMask:function(st){se!==st&&!D&&(n.stencilMask(st),se=st)},setFunc:function(st,Zt,zn){(oe!==st||Ee!==Zt||be!==zn)&&(n.stencilFunc(st,Zt,zn),oe=st,Ee=Zt,be=zn)},setOp:function(st,Zt,zn){(it!==st||rt!==Zt||Dt!==zn)&&(n.stencilOp(st,Zt,zn),it=st,rt=Zt,Dt=zn)},setLocked:function(st){D=st},setClear:function(st){jt!==st&&(n.clearStencil(st),jt=st)},reset:function(){D=!1,se=null,oe=null,Ee=null,be=null,it=null,rt=null,Dt=null,jt=null}}}let o=new r,l=new s,c=new a,h=new WeakMap,u=new WeakMap,f={},d={},p=new WeakMap,y=[],g=null,m=!1,_=null,x=null,v=null,E=null,w=null,M=null,T=null,b=new ye(0,0,0),S=0,I=!1,O=null,k=null,L=null,U=null,F=null,H=n.getParameter(n.MAX_COMBINED_TEXTURE_IMAGE_UNITS),N=!1,B=0,$=n.getParameter(n.VERSION);$.indexOf("WebGL")!==-1?(B=parseFloat(/^WebGL (\d)/.exec($)[1]),N=B>=1):$.indexOf("OpenGL ES")!==-1&&(B=parseFloat(/^OpenGL ES (\d)/.exec($)[1]),N=B>=2);let J=null,re={},Y=n.getParameter(n.SCISSOR_BOX),Z=n.getParameter(n.VIEWPORT),le=new Ge().fromArray(Y),de=new Ge().fromArray(Z);function xe(D,se,oe,Ee){let be=new Uint8Array(4),it=n.createTexture();n.bindTexture(D,it),n.texParameteri(D,n.TEXTURE_MIN_FILTER,n.NEAREST),n.texParameteri(D,n.TEXTURE_MAG_FILTER,n.NEAREST);for(let rt=0;rt<oe;rt++)i&&(D===n.TEXTURE_3D||D===n.TEXTURE_2D_ARRAY)?n.texImage3D(se,0,n.RGBA,1,1,Ee,0,n.RGBA,n.UNSIGNED_BYTE,be):n.texImage2D(se+rt,0,n.RGBA,1,1,0,n.RGBA,n.UNSIGNED_BYTE,be);return it}let De={};De[n.TEXTURE_2D]=xe(n.TEXTURE_2D,n.TEXTURE_2D,1),De[n.TEXTURE_CUBE_MAP]=xe(n.TEXTURE_CUBE_MAP,n.TEXTURE_CUBE_MAP_POSITIVE_X,6),i&&(De[n.TEXTURE_2D_ARRAY]=xe(n.TEXTURE_2D_ARRAY,n.TEXTURE_2D_ARRAY,1,1),De[n.TEXTURE_3D]=xe(n.TEXTURE_3D,n.TEXTURE_3D,1,1)),o.setClear(0,0,0,1),l.setClear(1),c.setClear(0),Ue(n.DEPTH_TEST),l.setFunc(Fo),Fe(!1),C(Jh),Ue(n.CULL_FACE),pe(mi);function Ue(D){f[D]!==!0&&(n.enable(D),f[D]=!0)}function Se(D){f[D]!==!1&&(n.disable(D),f[D]=!1)}function Ye(D,se){return d[D]!==se?(n.bindFramebuffer(D,se),d[D]=se,i&&(D===n.DRAW_FRAMEBUFFER&&(d[n.FRAMEBUFFER]=se),D===n.FRAMEBUFFER&&(d[n.DRAW_FRAMEBUFFER]=se)),!0):!1}function V(D,se){let oe=y,Ee=!1;if(D)if(oe=p.get(se),oe===void 0&&(oe=[],p.set(se,oe)),D.isWebGLMultipleRenderTargets){let be=D.texture;if(oe.length!==be.length||oe[0]!==n.COLOR_ATTACHMENT0){for(let it=0,rt=be.length;it<rt;it++)oe[it]=n.COLOR_ATTACHMENT0+it;oe.length=be.length,Ee=!0}}else oe[0]!==n.COLOR_ATTACHMENT0&&(oe[0]=n.COLOR_ATTACHMENT0,Ee=!0);else oe[0]!==n.BACK&&(oe[0]=n.BACK,Ee=!0);Ee&&(t.isWebGL2?n.drawBuffers(oe):e.get("WEBGL_draw_buffers").drawBuffersWEBGL(oe))}function $t(D){return g!==D?(n.useProgram(D),g=D,!0):!1}let ve={[Ui]:n.FUNC_ADD,[nm]:n.FUNC_SUBTRACT,[im]:n.FUNC_REVERSE_SUBTRACT};if(i)ve[tu]=n.MIN,ve[nu]=n.MAX;else{let D=e.get("EXT_blend_minmax");D!==null&&(ve[tu]=D.MIN_EXT,ve[nu]=D.MAX_EXT)}let Ce={[rm]:n.ZERO,[sm]:n.ONE,[om]:n.SRC_COLOR,[Fl]:n.SRC_ALPHA,[fm]:n.SRC_ALPHA_SATURATE,[hm]:n.DST_COLOR,[lm]:n.DST_ALPHA,[am]:n.ONE_MINUS_SRC_COLOR,[zl]:n.ONE_MINUS_SRC_ALPHA,[um]:n.ONE_MINUS_DST_COLOR,[cm]:n.ONE_MINUS_DST_ALPHA,[dm]:n.CONSTANT_COLOR,[pm]:n.ONE_MINUS_CONSTANT_COLOR,[mm]:n.CONSTANT_ALPHA,[gm]:n.ONE_MINUS_CONSTANT_ALPHA};function pe(D,se,oe,Ee,be,it,rt,Dt,jt,st){if(D===mi){m===!0&&(Se(n.BLEND),m=!1);return}if(m===!1&&(Ue(n.BLEND),m=!0),D!==tm){if(D!==_||st!==I){if((x!==Ui||w!==Ui)&&(n.blendEquation(n.FUNC_ADD),x=Ui,w=Ui),st)switch(D){case Cr:n.blendFuncSeparate(n.ONE,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA);break;case Kh:n.blendFunc(n.ONE,n.ONE);break;case Qh:n.blendFuncSeparate(n.ZERO,n.ONE_MINUS_SRC_COLOR,n.ZERO,n.ONE);break;case eu:n.blendFuncSeparate(n.ZERO,n.SRC_COLOR,n.ZERO,n.SRC_ALPHA);break;default:console.error("THREE.WebGLState: Invalid blending: ",D);break}else switch(D){case Cr:n.blendFuncSeparate(n.SRC_ALPHA,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA);break;case Kh:n.blendFunc(n.SRC_ALPHA,n.ONE);break;case Qh:n.blendFuncSeparate(n.ZERO,n.ONE_MINUS_SRC_COLOR,n.ZERO,n.ONE);break;case eu:n.blendFunc(n.ZERO,n.SRC_COLOR);break;default:console.error("THREE.WebGLState: Invalid blending: ",D);break}v=null,E=null,M=null,T=null,b.set(0,0,0),S=0,_=D,I=st}return}be=be||se,it=it||oe,rt=rt||Ee,(se!==x||be!==w)&&(n.blendEquationSeparate(ve[se],ve[be]),x=se,w=be),(oe!==v||Ee!==E||it!==M||rt!==T)&&(n.blendFuncSeparate(Ce[oe],Ce[Ee],Ce[it],Ce[rt]),v=oe,E=Ee,M=it,T=rt),(Dt.equals(b)===!1||jt!==S)&&(n.blendColor(Dt.r,Dt.g,Dt.b,jt),b.copy(Dt),S=jt),_=D,I=!1}function dt(D,se){D.side===Rt?Se(n.CULL_FACE):Ue(n.CULL_FACE);let oe=D.side===en;se&&(oe=!oe),Fe(oe),D.blending===Cr&&D.transparent===!1?pe(mi):pe(D.blending,D.blendEquation,D.blendSrc,D.blendDst,D.blendEquationAlpha,D.blendSrcAlpha,D.blendDstAlpha,D.blendColor,D.blendAlpha,D.premultipliedAlpha),l.setFunc(D.depthFunc),l.setTest(D.depthTest),l.setMask(D.depthWrite),o.setMask(D.colorWrite);let Ee=D.stencilWrite;c.setTest(Ee),Ee&&(c.setMask(D.stencilWriteMask),c.setFunc(D.stencilFunc,D.stencilRef,D.stencilFuncMask),c.setOp(D.stencilFail,D.stencilZFail,D.stencilZPass)),W(D.polygonOffset,D.polygonOffsetFactor,D.polygonOffsetUnits),D.alphaToCoverage===!0?Ue(n.SAMPLE_ALPHA_TO_COVERAGE):Se(n.SAMPLE_ALPHA_TO_COVERAGE)}function Fe(D){O!==D&&(D?n.frontFace(n.CW):n.frontFace(n.CCW),O=D)}function C(D){D!==Qp?(Ue(n.CULL_FACE),D!==k&&(D===Jh?n.cullFace(n.BACK):D===em?n.cullFace(n.FRONT):n.cullFace(n.FRONT_AND_BACK))):Se(n.CULL_FACE),k=D}function A(D){D!==L&&(N&&n.lineWidth(D),L=D)}function W(D,se,oe){D?(Ue(n.POLYGON_OFFSET_FILL),(U!==se||F!==oe)&&(n.polygonOffset(se,oe),U=se,F=oe)):Se(n.POLYGON_OFFSET_FILL)}function ee(D){D?Ue(n.SCISSOR_TEST):Se(n.SCISSOR_TEST)}function Q(D){D===void 0&&(D=n.TEXTURE0+H-1),J!==D&&(n.activeTexture(D),J=D)}function te(D,se,oe){oe===void 0&&(J===null?oe=n.TEXTURE0+H-1:oe=J);let Ee=re[oe];Ee===void 0&&(Ee={type:void 0,texture:void 0},re[oe]=Ee),(Ee.type!==D||Ee.texture!==se)&&(J!==oe&&(n.activeTexture(oe),J=oe),n.bindTexture(D,se||De[D]),Ee.type=D,Ee.texture=se)}function me(){let D=re[J];D!==void 0&&D.type!==void 0&&(n.bindTexture(D.type,null),D.type=void 0,D.texture=void 0)}function ae(){try{n.compressedTexImage2D.apply(n,arguments)}catch(D){console.error("THREE.WebGLState:",D)}}function ue(){try{n.compressedTexImage3D.apply(n,arguments)}catch(D){console.error("THREE.WebGLState:",D)}}function we(){try{n.texSubImage2D.apply(n,arguments)}catch(D){console.error("THREE.WebGLState:",D)}}function ze(){try{n.texSubImage3D.apply(n,arguments)}catch(D){console.error("THREE.WebGLState:",D)}}function K(){try{n.compressedTexSubImage2D.apply(n,arguments)}catch(D){console.error("THREE.WebGLState:",D)}}function Ke(){try{n.compressedTexSubImage3D.apply(n,arguments)}catch(D){console.error("THREE.WebGLState:",D)}}function We(){try{n.texStorage2D.apply(n,arguments)}catch(D){console.error("THREE.WebGLState:",D)}}function Re(){try{n.texStorage3D.apply(n,arguments)}catch(D){console.error("THREE.WebGLState:",D)}}function _e(){try{n.texImage2D.apply(n,arguments)}catch(D){console.error("THREE.WebGLState:",D)}}function fe(){try{n.texImage3D.apply(n,arguments)}catch(D){console.error("THREE.WebGLState:",D)}}function Oe(D){le.equals(D)===!1&&(n.scissor(D.x,D.y,D.z,D.w),le.copy(D))}function Je(D){de.equals(D)===!1&&(n.viewport(D.x,D.y,D.z,D.w),de.copy(D))}function xt(D,se){let oe=u.get(se);oe===void 0&&(oe=new WeakMap,u.set(se,oe));let Ee=oe.get(D);Ee===void 0&&(Ee=n.getUniformBlockIndex(se,D.name),oe.set(D,Ee))}function ke(D,se){let Ee=u.get(se).get(D);h.get(se)!==Ee&&(n.uniformBlockBinding(se,Ee,D.__bindingPointIndex),h.set(se,Ee))}function ne(){n.disable(n.BLEND),n.disable(n.CULL_FACE),n.disable(n.DEPTH_TEST),n.disable(n.POLYGON_OFFSET_FILL),n.disable(n.SCISSOR_TEST),n.disable(n.STENCIL_TEST),n.disable(n.SAMPLE_ALPHA_TO_COVERAGE),n.blendEquation(n.FUNC_ADD),n.blendFunc(n.ONE,n.ZERO),n.blendFuncSeparate(n.ONE,n.ZERO,n.ONE,n.ZERO),n.blendColor(0,0,0,0),n.colorMask(!0,!0,!0,!0),n.clearColor(0,0,0,0),n.depthMask(!0),n.depthFunc(n.LESS),n.clearDepth(1),n.stencilMask(4294967295),n.stencilFunc(n.ALWAYS,0,4294967295),n.stencilOp(n.KEEP,n.KEEP,n.KEEP),n.clearStencil(0),n.cullFace(n.BACK),n.frontFace(n.CCW),n.polygonOffset(0,0),n.activeTexture(n.TEXTURE0),n.bindFramebuffer(n.FRAMEBUFFER,null),i===!0&&(n.bindFramebuffer(n.DRAW_FRAMEBUFFER,null),n.bindFramebuffer(n.READ_FRAMEBUFFER,null)),n.useProgram(null),n.lineWidth(1),n.scissor(0,0,n.canvas.width,n.canvas.height),n.viewport(0,0,n.canvas.width,n.canvas.height),f={},J=null,re={},d={},p=new WeakMap,y=[],g=null,m=!1,_=null,x=null,v=null,E=null,w=null,M=null,T=null,b=new ye(0,0,0),S=0,I=!1,O=null,k=null,L=null,U=null,F=null,le.set(0,0,n.canvas.width,n.canvas.height),de.set(0,0,n.canvas.width,n.canvas.height),o.reset(),l.reset(),c.reset()}return{buffers:{color:o,depth:l,stencil:c},enable:Ue,disable:Se,bindFramebuffer:Ye,drawBuffers:V,useProgram:$t,setBlending:pe,setMaterial:dt,setFlipSided:Fe,setCullFace:C,setLineWidth:A,setPolygonOffset:W,setScissorTest:ee,activeTexture:Q,bindTexture:te,unbindTexture:me,compressedTexImage2D:ae,compressedTexImage3D:ue,texImage2D:_e,texImage3D:fe,updateUBOMapping:xt,uniformBlockBinding:ke,texStorage2D:We,texStorage3D:Re,texSubImage2D:we,texSubImage3D:ze,compressedTexSubImage2D:K,compressedTexSubImage3D:Ke,scissor:Oe,viewport:Je,reset:ne}}function J_(n,e,t,i,r,s,a){let o=r.isWebGL2,l=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,c=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),h=new WeakMap,u,f=new WeakMap,d=!1;try{d=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function p(C,A){return d?new OffscreenCanvas(C,A):Xo("canvas")}function y(C,A,W,ee){let Q=1;if((C.width>ee||C.height>ee)&&(Q=ee/Math.max(C.width,C.height)),Q<1||A===!0)if(typeof HTMLImageElement<"u"&&C instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&C instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&C instanceof ImageBitmap){let te=A?Wo:Math.floor,me=te(Q*C.width),ae=te(Q*C.height);u===void 0&&(u=p(me,ae));let ue=W?p(me,ae):u;return ue.width=me,ue.height=ae,ue.getContext("2d").drawImage(C,0,0,me,ae),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+C.width+"x"+C.height+") to ("+me+"x"+ae+")."),ue}else return"data"in C&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+C.width+"x"+C.height+")."),C;return C}function g(C){return Gl(C.width)&&Gl(C.height)}function m(C){return o?!1:C.wrapS!==un||C.wrapT!==un||C.minFilter!==vt&&C.minFilter!==Ct}function _(C,A){return C.generateMipmaps&&A&&C.minFilter!==vt&&C.minFilter!==Ct}function x(C){n.generateMipmap(C)}function v(C,A,W,ee,Q=!1){if(o===!1)return A;if(C!==null){if(n[C]!==void 0)return n[C];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+C+"'")}let te=A;if(A===n.RED&&(W===n.FLOAT&&(te=n.R32F),W===n.HALF_FLOAT&&(te=n.R16F),W===n.UNSIGNED_BYTE&&(te=n.R8)),A===n.RED_INTEGER&&(W===n.UNSIGNED_BYTE&&(te=n.R8UI),W===n.UNSIGNED_SHORT&&(te=n.R16UI),W===n.UNSIGNED_INT&&(te=n.R32UI),W===n.BYTE&&(te=n.R8I),W===n.SHORT&&(te=n.R16I),W===n.INT&&(te=n.R32I)),A===n.RG&&(W===n.FLOAT&&(te=n.RG32F),W===n.HALF_FLOAT&&(te=n.RG16F),W===n.UNSIGNED_BYTE&&(te=n.RG8)),A===n.RGBA){let me=Q?ko:Qe.getTransfer(ee);W===n.FLOAT&&(te=n.RGBA32F),W===n.HALF_FLOAT&&(te=n.RGBA16F),W===n.UNSIGNED_BYTE&&(te=me===at?n.SRGB8_ALPHA8:n.RGBA8),W===n.UNSIGNED_SHORT_4_4_4_4&&(te=n.RGBA4),W===n.UNSIGNED_SHORT_5_5_5_1&&(te=n.RGB5_A1)}return(te===n.R16F||te===n.R32F||te===n.RG16F||te===n.RG32F||te===n.RGBA16F||te===n.RGBA32F)&&e.get("EXT_color_buffer_float"),te}function E(C,A,W){return _(C,W)===!0||C.isFramebufferTexture&&C.minFilter!==vt&&C.minFilter!==Ct?Math.log2(Math.max(A.width,A.height))+1:C.mipmaps!==void 0&&C.mipmaps.length>0?C.mipmaps.length:C.isCompressedTexture&&Array.isArray(C.image)?A.mipmaps.length:1}function w(C){return C===vt||C===iu||C===tl?n.NEAREST:n.LINEAR}function M(C){let A=C.target;A.removeEventListener("dispose",M),b(A),A.isVideoTexture&&h.delete(A)}function T(C){let A=C.target;A.removeEventListener("dispose",T),I(A)}function b(C){let A=i.get(C);if(A.__webglInit===void 0)return;let W=C.source,ee=f.get(W);if(ee){let Q=ee[A.__cacheKey];Q.usedTimes--,Q.usedTimes===0&&S(C),Object.keys(ee).length===0&&f.delete(W)}i.remove(C)}function S(C){let A=i.get(C);n.deleteTexture(A.__webglTexture);let W=C.source,ee=f.get(W);delete ee[A.__cacheKey],a.memory.textures--}function I(C){let A=C.texture,W=i.get(C),ee=i.get(A);if(ee.__webglTexture!==void 0&&(n.deleteTexture(ee.__webglTexture),a.memory.textures--),C.depthTexture&&C.depthTexture.dispose(),C.isWebGLCubeRenderTarget)for(let Q=0;Q<6;Q++){if(Array.isArray(W.__webglFramebuffer[Q]))for(let te=0;te<W.__webglFramebuffer[Q].length;te++)n.deleteFramebuffer(W.__webglFramebuffer[Q][te]);else n.deleteFramebuffer(W.__webglFramebuffer[Q]);W.__webglDepthbuffer&&n.deleteRenderbuffer(W.__webglDepthbuffer[Q])}else{if(Array.isArray(W.__webglFramebuffer))for(let Q=0;Q<W.__webglFramebuffer.length;Q++)n.deleteFramebuffer(W.__webglFramebuffer[Q]);else n.deleteFramebuffer(W.__webglFramebuffer);if(W.__webglDepthbuffer&&n.deleteRenderbuffer(W.__webglDepthbuffer),W.__webglMultisampledFramebuffer&&n.deleteFramebuffer(W.__webglMultisampledFramebuffer),W.__webglColorRenderbuffer)for(let Q=0;Q<W.__webglColorRenderbuffer.length;Q++)W.__webglColorRenderbuffer[Q]&&n.deleteRenderbuffer(W.__webglColorRenderbuffer[Q]);W.__webglDepthRenderbuffer&&n.deleteRenderbuffer(W.__webglDepthRenderbuffer)}if(C.isWebGLMultipleRenderTargets)for(let Q=0,te=A.length;Q<te;Q++){let me=i.get(A[Q]);me.__webglTexture&&(n.deleteTexture(me.__webglTexture),a.memory.textures--),i.remove(A[Q])}i.remove(A),i.remove(C)}let O=0;function k(){O=0}function L(){let C=O;return C>=r.maxTextures&&console.warn("THREE.WebGLTextures: Trying to use "+C+" texture units while this GPU supports only "+r.maxTextures),O+=1,C}function U(C){let A=[];return A.push(C.wrapS),A.push(C.wrapT),A.push(C.wrapR||0),A.push(C.magFilter),A.push(C.minFilter),A.push(C.anisotropy),A.push(C.internalFormat),A.push(C.format),A.push(C.type),A.push(C.generateMipmaps),A.push(C.premultiplyAlpha),A.push(C.flipY),A.push(C.unpackAlignment),A.push(C.colorSpace),A.join()}function F(C,A){let W=i.get(C);if(C.isVideoTexture&&dt(C),C.isRenderTargetTexture===!1&&C.version>0&&W.__version!==C.version){let ee=C.image;if(ee===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(ee.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{le(W,C,A);return}}t.bindTexture(n.TEXTURE_2D,W.__webglTexture,n.TEXTURE0+A)}function H(C,A){let W=i.get(C);if(C.version>0&&W.__version!==C.version){le(W,C,A);return}t.bindTexture(n.TEXTURE_2D_ARRAY,W.__webglTexture,n.TEXTURE0+A)}function N(C,A){let W=i.get(C);if(C.version>0&&W.__version!==C.version){le(W,C,A);return}t.bindTexture(n.TEXTURE_3D,W.__webglTexture,n.TEXTURE0+A)}function B(C,A){let W=i.get(C);if(C.version>0&&W.__version!==C.version){de(W,C,A);return}t.bindTexture(n.TEXTURE_CUBE_MAP,W.__webglTexture,n.TEXTURE0+A)}let $={[Hi]:n.REPEAT,[un]:n.CLAMP_TO_EDGE,[Hl]:n.MIRRORED_REPEAT},J={[vt]:n.NEAREST,[iu]:n.NEAREST_MIPMAP_NEAREST,[tl]:n.NEAREST_MIPMAP_LINEAR,[Ct]:n.LINEAR,[Pm]:n.LINEAR_MIPMAP_NEAREST,[Vi]:n.LINEAR_MIPMAP_LINEAR},re={[Gm]:n.NEVER,[jm]:n.ALWAYS,[Wm]:n.LESS,[Yf]:n.LEQUAL,[Xm]:n.EQUAL,[$m]:n.GEQUAL,[qm]:n.GREATER,[Ym]:n.NOTEQUAL};function Y(C,A,W){if(W?(n.texParameteri(C,n.TEXTURE_WRAP_S,$[A.wrapS]),n.texParameteri(C,n.TEXTURE_WRAP_T,$[A.wrapT]),(C===n.TEXTURE_3D||C===n.TEXTURE_2D_ARRAY)&&n.texParameteri(C,n.TEXTURE_WRAP_R,$[A.wrapR]),n.texParameteri(C,n.TEXTURE_MAG_FILTER,J[A.magFilter]),n.texParameteri(C,n.TEXTURE_MIN_FILTER,J[A.minFilter])):(n.texParameteri(C,n.TEXTURE_WRAP_S,n.CLAMP_TO_EDGE),n.texParameteri(C,n.TEXTURE_WRAP_T,n.CLAMP_TO_EDGE),(C===n.TEXTURE_3D||C===n.TEXTURE_2D_ARRAY)&&n.texParameteri(C,n.TEXTURE_WRAP_R,n.CLAMP_TO_EDGE),(A.wrapS!==un||A.wrapT!==un)&&console.warn("THREE.WebGLRenderer: Texture is not power of two. Texture.wrapS and Texture.wrapT should be set to THREE.ClampToEdgeWrapping."),n.texParameteri(C,n.TEXTURE_MAG_FILTER,w(A.magFilter)),n.texParameteri(C,n.TEXTURE_MIN_FILTER,w(A.minFilter)),A.minFilter!==vt&&A.minFilter!==Ct&&console.warn("THREE.WebGLRenderer: Texture is not power of two. Texture.minFilter should be set to THREE.NearestFilter or THREE.LinearFilter.")),A.compareFunction&&(n.texParameteri(C,n.TEXTURE_COMPARE_MODE,n.COMPARE_REF_TO_TEXTURE),n.texParameteri(C,n.TEXTURE_COMPARE_FUNC,re[A.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){let ee=e.get("EXT_texture_filter_anisotropic");if(A.magFilter===vt||A.minFilter!==tl&&A.minFilter!==Vi||A.type===kn&&e.has("OES_texture_float_linear")===!1||o===!1&&A.type===Gi&&e.has("OES_texture_half_float_linear")===!1)return;(A.anisotropy>1||i.get(A).__currentAnisotropy)&&(n.texParameterf(C,ee.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(A.anisotropy,r.getMaxAnisotropy())),i.get(A).__currentAnisotropy=A.anisotropy)}}function Z(C,A){let W=!1;C.__webglInit===void 0&&(C.__webglInit=!0,A.addEventListener("dispose",M));let ee=A.source,Q=f.get(ee);Q===void 0&&(Q={},f.set(ee,Q));let te=U(A);if(te!==C.__cacheKey){Q[te]===void 0&&(Q[te]={texture:n.createTexture(),usedTimes:0},a.memory.textures++,W=!0),Q[te].usedTimes++;let me=Q[C.__cacheKey];me!==void 0&&(Q[C.__cacheKey].usedTimes--,me.usedTimes===0&&S(A)),C.__cacheKey=te,C.__webglTexture=Q[te].texture}return W}function le(C,A,W){let ee=n.TEXTURE_2D;(A.isDataArrayTexture||A.isCompressedArrayTexture)&&(ee=n.TEXTURE_2D_ARRAY),A.isData3DTexture&&(ee=n.TEXTURE_3D);let Q=Z(C,A),te=A.source;t.bindTexture(ee,C.__webglTexture,n.TEXTURE0+W);let me=i.get(te);if(te.version!==me.__version||Q===!0){t.activeTexture(n.TEXTURE0+W);let ae=Qe.getPrimaries(Qe.workingColorSpace),ue=A.colorSpace===wt?null:Qe.getPrimaries(A.colorSpace),we=A.colorSpace===wt||ae===ue?n.NONE:n.BROWSER_DEFAULT_WEBGL;n.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,A.flipY),n.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,A.premultiplyAlpha),n.pixelStorei(n.UNPACK_ALIGNMENT,A.unpackAlignment),n.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,we);let ze=m(A)&&g(A.image)===!1,K=y(A.image,ze,!1,r.maxTextureSize);K=Fe(A,K);let Ke=g(K)||o,We=s.convert(A.format,A.colorSpace),Re=s.convert(A.type),_e=v(A.internalFormat,We,Re,A.colorSpace,A.isVideoTexture);Y(ee,A,Ke);let fe,Oe=A.mipmaps,Je=o&&A.isVideoTexture!==!0&&_e!==Xf,xt=me.__version===void 0||Q===!0,ke=E(A,K,Ke);if(A.isDepthTexture)_e=n.DEPTH_COMPONENT,o?A.type===kn?_e=n.DEPTH_COMPONENT32F:A.type===pi?_e=n.DEPTH_COMPONENT24:A.type===zi?_e=n.DEPTH24_STENCIL8:_e=n.DEPTH_COMPONENT16:A.type===kn&&console.error("WebGLRenderer: Floating point depth texture requires WebGL2."),A.format===Bi&&_e===n.DEPTH_COMPONENT&&A.type!==Ic&&A.type!==pi&&(console.warn("THREE.WebGLRenderer: Use UnsignedShortType or UnsignedIntType for DepthFormat DepthTexture."),A.type=pi,Re=s.convert(A.type)),A.format===Ur&&_e===n.DEPTH_COMPONENT&&(_e=n.DEPTH_STENCIL,A.type!==zi&&(console.warn("THREE.WebGLRenderer: Use UnsignedInt248Type for DepthStencilFormat DepthTexture."),A.type=zi,Re=s.convert(A.type))),xt&&(Je?t.texStorage2D(n.TEXTURE_2D,1,_e,K.width,K.height):t.texImage2D(n.TEXTURE_2D,0,_e,K.width,K.height,0,We,Re,null));else if(A.isDataTexture)if(Oe.length>0&&Ke){Je&&xt&&t.texStorage2D(n.TEXTURE_2D,ke,_e,Oe[0].width,Oe[0].height);for(let ne=0,D=Oe.length;ne<D;ne++)fe=Oe[ne],Je?t.texSubImage2D(n.TEXTURE_2D,ne,0,0,fe.width,fe.height,We,Re,fe.data):t.texImage2D(n.TEXTURE_2D,ne,_e,fe.width,fe.height,0,We,Re,fe.data);A.generateMipmaps=!1}else Je?(xt&&t.texStorage2D(n.TEXTURE_2D,ke,_e,K.width,K.height),t.texSubImage2D(n.TEXTURE_2D,0,0,0,K.width,K.height,We,Re,K.data)):t.texImage2D(n.TEXTURE_2D,0,_e,K.width,K.height,0,We,Re,K.data);else if(A.isCompressedTexture)if(A.isCompressedArrayTexture){Je&&xt&&t.texStorage3D(n.TEXTURE_2D_ARRAY,ke,_e,Oe[0].width,Oe[0].height,K.depth);for(let ne=0,D=Oe.length;ne<D;ne++)fe=Oe[ne],A.format!==It?We!==null?Je?t.compressedTexSubImage3D(n.TEXTURE_2D_ARRAY,ne,0,0,0,fe.width,fe.height,K.depth,We,fe.data,0,0):t.compressedTexImage3D(n.TEXTURE_2D_ARRAY,ne,_e,fe.width,fe.height,K.depth,0,fe.data,0,0):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):Je?t.texSubImage3D(n.TEXTURE_2D_ARRAY,ne,0,0,0,fe.width,fe.height,K.depth,We,Re,fe.data):t.texImage3D(n.TEXTURE_2D_ARRAY,ne,_e,fe.width,fe.height,K.depth,0,We,Re,fe.data)}else{Je&&xt&&t.texStorage2D(n.TEXTURE_2D,ke,_e,Oe[0].width,Oe[0].height);for(let ne=0,D=Oe.length;ne<D;ne++)fe=Oe[ne],A.format!==It?We!==null?Je?t.compressedTexSubImage2D(n.TEXTURE_2D,ne,0,0,fe.width,fe.height,We,fe.data):t.compressedTexImage2D(n.TEXTURE_2D,ne,_e,fe.width,fe.height,0,fe.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):Je?t.texSubImage2D(n.TEXTURE_2D,ne,0,0,fe.width,fe.height,We,Re,fe.data):t.texImage2D(n.TEXTURE_2D,ne,_e,fe.width,fe.height,0,We,Re,fe.data)}else if(A.isDataArrayTexture)Je?(xt&&t.texStorage3D(n.TEXTURE_2D_ARRAY,ke,_e,K.width,K.height,K.depth),t.texSubImage3D(n.TEXTURE_2D_ARRAY,0,0,0,0,K.width,K.height,K.depth,We,Re,K.data)):t.texImage3D(n.TEXTURE_2D_ARRAY,0,_e,K.width,K.height,K.depth,0,We,Re,K.data);else if(A.isData3DTexture)Je?(xt&&t.texStorage3D(n.TEXTURE_3D,ke,_e,K.width,K.height,K.depth),t.texSubImage3D(n.TEXTURE_3D,0,0,0,0,K.width,K.height,K.depth,We,Re,K.data)):t.texImage3D(n.TEXTURE_3D,0,_e,K.width,K.height,K.depth,0,We,Re,K.data);else if(A.isFramebufferTexture){if(xt)if(Je)t.texStorage2D(n.TEXTURE_2D,ke,_e,K.width,K.height);else{let ne=K.width,D=K.height;for(let se=0;se<ke;se++)t.texImage2D(n.TEXTURE_2D,se,_e,ne,D,0,We,Re,null),ne>>=1,D>>=1}}else if(Oe.length>0&&Ke){Je&&xt&&t.texStorage2D(n.TEXTURE_2D,ke,_e,Oe[0].width,Oe[0].height);for(let ne=0,D=Oe.length;ne<D;ne++)fe=Oe[ne],Je?t.texSubImage2D(n.TEXTURE_2D,ne,0,0,We,Re,fe):t.texImage2D(n.TEXTURE_2D,ne,_e,We,Re,fe);A.generateMipmaps=!1}else Je?(xt&&t.texStorage2D(n.TEXTURE_2D,ke,_e,K.width,K.height),t.texSubImage2D(n.TEXTURE_2D,0,0,0,We,Re,K)):t.texImage2D(n.TEXTURE_2D,0,_e,We,Re,K);_(A,Ke)&&x(ee),me.__version=te.version,A.onUpdate&&A.onUpdate(A)}C.__version=A.version}function de(C,A,W){if(A.image.length!==6)return;let ee=Z(C,A),Q=A.source;t.bindTexture(n.TEXTURE_CUBE_MAP,C.__webglTexture,n.TEXTURE0+W);let te=i.get(Q);if(Q.version!==te.__version||ee===!0){t.activeTexture(n.TEXTURE0+W);let me=Qe.getPrimaries(Qe.workingColorSpace),ae=A.colorSpace===wt?null:Qe.getPrimaries(A.colorSpace),ue=A.colorSpace===wt||me===ae?n.NONE:n.BROWSER_DEFAULT_WEBGL;n.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,A.flipY),n.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,A.premultiplyAlpha),n.pixelStorei(n.UNPACK_ALIGNMENT,A.unpackAlignment),n.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,ue);let we=A.isCompressedTexture||A.image[0].isCompressedTexture,ze=A.image[0]&&A.image[0].isDataTexture,K=[];for(let ne=0;ne<6;ne++)!we&&!ze?K[ne]=y(A.image[ne],!1,!0,r.maxCubemapSize):K[ne]=ze?A.image[ne].image:A.image[ne],K[ne]=Fe(A,K[ne]);let Ke=K[0],We=g(Ke)||o,Re=s.convert(A.format,A.colorSpace),_e=s.convert(A.type),fe=v(A.internalFormat,Re,_e,A.colorSpace),Oe=o&&A.isVideoTexture!==!0,Je=te.__version===void 0||ee===!0,xt=E(A,Ke,We);Y(n.TEXTURE_CUBE_MAP,A,We);let ke;if(we){Oe&&Je&&t.texStorage2D(n.TEXTURE_CUBE_MAP,xt,fe,Ke.width,Ke.height);for(let ne=0;ne<6;ne++){ke=K[ne].mipmaps;for(let D=0;D<ke.length;D++){let se=ke[D];A.format!==It?Re!==null?Oe?t.compressedTexSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ne,D,0,0,se.width,se.height,Re,se.data):t.compressedTexImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ne,D,fe,se.width,se.height,0,se.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):Oe?t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ne,D,0,0,se.width,se.height,Re,_e,se.data):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ne,D,fe,se.width,se.height,0,Re,_e,se.data)}}}else{ke=A.mipmaps,Oe&&Je&&(ke.length>0&&xt++,t.texStorage2D(n.TEXTURE_CUBE_MAP,xt,fe,K[0].width,K[0].height));for(let ne=0;ne<6;ne++)if(ze){Oe?t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ne,0,0,0,K[ne].width,K[ne].height,Re,_e,K[ne].data):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ne,0,fe,K[ne].width,K[ne].height,0,Re,_e,K[ne].data);for(let D=0;D<ke.length;D++){let oe=ke[D].image[ne].image;Oe?t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ne,D+1,0,0,oe.width,oe.height,Re,_e,oe.data):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ne,D+1,fe,oe.width,oe.height,0,Re,_e,oe.data)}}else{Oe?t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ne,0,0,0,Re,_e,K[ne]):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ne,0,fe,Re,_e,K[ne]);for(let D=0;D<ke.length;D++){let se=ke[D];Oe?t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ne,D+1,0,0,Re,_e,se.image[ne]):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ne,D+1,fe,Re,_e,se.image[ne])}}}_(A,We)&&x(n.TEXTURE_CUBE_MAP),te.__version=Q.version,A.onUpdate&&A.onUpdate(A)}C.__version=A.version}function xe(C,A,W,ee,Q,te){let me=s.convert(W.format,W.colorSpace),ae=s.convert(W.type),ue=v(W.internalFormat,me,ae,W.colorSpace);if(!i.get(A).__hasExternalTextures){let ze=Math.max(1,A.width>>te),K=Math.max(1,A.height>>te);Q===n.TEXTURE_3D||Q===n.TEXTURE_2D_ARRAY?t.texImage3D(Q,te,ue,ze,K,A.depth,0,me,ae,null):t.texImage2D(Q,te,ue,ze,K,0,me,ae,null)}t.bindFramebuffer(n.FRAMEBUFFER,C),pe(A)?l.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,ee,Q,i.get(W).__webglTexture,0,Ce(A)):(Q===n.TEXTURE_2D||Q>=n.TEXTURE_CUBE_MAP_POSITIVE_X&&Q<=n.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&n.framebufferTexture2D(n.FRAMEBUFFER,ee,Q,i.get(W).__webglTexture,te),t.bindFramebuffer(n.FRAMEBUFFER,null)}function De(C,A,W){if(n.bindRenderbuffer(n.RENDERBUFFER,C),A.depthBuffer&&!A.stencilBuffer){let ee=o===!0?n.DEPTH_COMPONENT24:n.DEPTH_COMPONENT16;if(W||pe(A)){let Q=A.depthTexture;Q&&Q.isDepthTexture&&(Q.type===kn?ee=n.DEPTH_COMPONENT32F:Q.type===pi&&(ee=n.DEPTH_COMPONENT24));let te=Ce(A);pe(A)?l.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,te,ee,A.width,A.height):n.renderbufferStorageMultisample(n.RENDERBUFFER,te,ee,A.width,A.height)}else n.renderbufferStorage(n.RENDERBUFFER,ee,A.width,A.height);n.framebufferRenderbuffer(n.FRAMEBUFFER,n.DEPTH_ATTACHMENT,n.RENDERBUFFER,C)}else if(A.depthBuffer&&A.stencilBuffer){let ee=Ce(A);W&&pe(A)===!1?n.renderbufferStorageMultisample(n.RENDERBUFFER,ee,n.DEPTH24_STENCIL8,A.width,A.height):pe(A)?l.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,ee,n.DEPTH24_STENCIL8,A.width,A.height):n.renderbufferStorage(n.RENDERBUFFER,n.DEPTH_STENCIL,A.width,A.height),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.DEPTH_STENCIL_ATTACHMENT,n.RENDERBUFFER,C)}else{let ee=A.isWebGLMultipleRenderTargets===!0?A.texture:[A.texture];for(let Q=0;Q<ee.length;Q++){let te=ee[Q],me=s.convert(te.format,te.colorSpace),ae=s.convert(te.type),ue=v(te.internalFormat,me,ae,te.colorSpace),we=Ce(A);W&&pe(A)===!1?n.renderbufferStorageMultisample(n.RENDERBUFFER,we,ue,A.width,A.height):pe(A)?l.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,we,ue,A.width,A.height):n.renderbufferStorage(n.RENDERBUFFER,ue,A.width,A.height)}}n.bindRenderbuffer(n.RENDERBUFFER,null)}function Ue(C,A){if(A&&A.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(t.bindFramebuffer(n.FRAMEBUFFER,C),!(A.depthTexture&&A.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");(!i.get(A.depthTexture).__webglTexture||A.depthTexture.image.width!==A.width||A.depthTexture.image.height!==A.height)&&(A.depthTexture.image.width=A.width,A.depthTexture.image.height=A.height,A.depthTexture.needsUpdate=!0),F(A.depthTexture,0);let ee=i.get(A.depthTexture).__webglTexture,Q=Ce(A);if(A.depthTexture.format===Bi)pe(A)?l.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,n.DEPTH_ATTACHMENT,n.TEXTURE_2D,ee,0,Q):n.framebufferTexture2D(n.FRAMEBUFFER,n.DEPTH_ATTACHMENT,n.TEXTURE_2D,ee,0);else if(A.depthTexture.format===Ur)pe(A)?l.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,n.DEPTH_STENCIL_ATTACHMENT,n.TEXTURE_2D,ee,0,Q):n.framebufferTexture2D(n.FRAMEBUFFER,n.DEPTH_STENCIL_ATTACHMENT,n.TEXTURE_2D,ee,0);else throw new Error("Unknown depthTexture format")}function Se(C){let A=i.get(C),W=C.isWebGLCubeRenderTarget===!0;if(C.depthTexture&&!A.__autoAllocateDepthBuffer){if(W)throw new Error("target.depthTexture not supported in Cube render targets");Ue(A.__webglFramebuffer,C)}else if(W){A.__webglDepthbuffer=[];for(let ee=0;ee<6;ee++)t.bindFramebuffer(n.FRAMEBUFFER,A.__webglFramebuffer[ee]),A.__webglDepthbuffer[ee]=n.createRenderbuffer(),De(A.__webglDepthbuffer[ee],C,!1)}else t.bindFramebuffer(n.FRAMEBUFFER,A.__webglFramebuffer),A.__webglDepthbuffer=n.createRenderbuffer(),De(A.__webglDepthbuffer,C,!1);t.bindFramebuffer(n.FRAMEBUFFER,null)}function Ye(C,A,W){let ee=i.get(C);A!==void 0&&xe(ee.__webglFramebuffer,C,C.texture,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,0),W!==void 0&&Se(C)}function V(C){let A=C.texture,W=i.get(C),ee=i.get(A);C.addEventListener("dispose",T),C.isWebGLMultipleRenderTargets!==!0&&(ee.__webglTexture===void 0&&(ee.__webglTexture=n.createTexture()),ee.__version=A.version,a.memory.textures++);let Q=C.isWebGLCubeRenderTarget===!0,te=C.isWebGLMultipleRenderTargets===!0,me=g(C)||o;if(Q){W.__webglFramebuffer=[];for(let ae=0;ae<6;ae++)if(o&&A.mipmaps&&A.mipmaps.length>0){W.__webglFramebuffer[ae]=[];for(let ue=0;ue<A.mipmaps.length;ue++)W.__webglFramebuffer[ae][ue]=n.createFramebuffer()}else W.__webglFramebuffer[ae]=n.createFramebuffer()}else{if(o&&A.mipmaps&&A.mipmaps.length>0){W.__webglFramebuffer=[];for(let ae=0;ae<A.mipmaps.length;ae++)W.__webglFramebuffer[ae]=n.createFramebuffer()}else W.__webglFramebuffer=n.createFramebuffer();if(te)if(r.drawBuffers){let ae=C.texture;for(let ue=0,we=ae.length;ue<we;ue++){let ze=i.get(ae[ue]);ze.__webglTexture===void 0&&(ze.__webglTexture=n.createTexture(),a.memory.textures++)}}else console.warn("THREE.WebGLRenderer: WebGLMultipleRenderTargets can only be used with WebGL2 or WEBGL_draw_buffers extension.");if(o&&C.samples>0&&pe(C)===!1){let ae=te?A:[A];W.__webglMultisampledFramebuffer=n.createFramebuffer(),W.__webglColorRenderbuffer=[],t.bindFramebuffer(n.FRAMEBUFFER,W.__webglMultisampledFramebuffer);for(let ue=0;ue<ae.length;ue++){let we=ae[ue];W.__webglColorRenderbuffer[ue]=n.createRenderbuffer(),n.bindRenderbuffer(n.RENDERBUFFER,W.__webglColorRenderbuffer[ue]);let ze=s.convert(we.format,we.colorSpace),K=s.convert(we.type),Ke=v(we.internalFormat,ze,K,we.colorSpace,C.isXRRenderTarget===!0),We=Ce(C);n.renderbufferStorageMultisample(n.RENDERBUFFER,We,Ke,C.width,C.height),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+ue,n.RENDERBUFFER,W.__webglColorRenderbuffer[ue])}n.bindRenderbuffer(n.RENDERBUFFER,null),C.depthBuffer&&(W.__webglDepthRenderbuffer=n.createRenderbuffer(),De(W.__webglDepthRenderbuffer,C,!0)),t.bindFramebuffer(n.FRAMEBUFFER,null)}}if(Q){t.bindTexture(n.TEXTURE_CUBE_MAP,ee.__webglTexture),Y(n.TEXTURE_CUBE_MAP,A,me);for(let ae=0;ae<6;ae++)if(o&&A.mipmaps&&A.mipmaps.length>0)for(let ue=0;ue<A.mipmaps.length;ue++)xe(W.__webglFramebuffer[ae][ue],C,A,n.COLOR_ATTACHMENT0,n.TEXTURE_CUBE_MAP_POSITIVE_X+ae,ue);else xe(W.__webglFramebuffer[ae],C,A,n.COLOR_ATTACHMENT0,n.TEXTURE_CUBE_MAP_POSITIVE_X+ae,0);_(A,me)&&x(n.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(te){let ae=C.texture;for(let ue=0,we=ae.length;ue<we;ue++){let ze=ae[ue],K=i.get(ze);t.bindTexture(n.TEXTURE_2D,K.__webglTexture),Y(n.TEXTURE_2D,ze,me),xe(W.__webglFramebuffer,C,ze,n.COLOR_ATTACHMENT0+ue,n.TEXTURE_2D,0),_(ze,me)&&x(n.TEXTURE_2D)}t.unbindTexture()}else{let ae=n.TEXTURE_2D;if((C.isWebGL3DRenderTarget||C.isWebGLArrayRenderTarget)&&(o?ae=C.isWebGL3DRenderTarget?n.TEXTURE_3D:n.TEXTURE_2D_ARRAY:console.error("THREE.WebGLTextures: THREE.Data3DTexture and THREE.DataArrayTexture only supported with WebGL2.")),t.bindTexture(ae,ee.__webglTexture),Y(ae,A,me),o&&A.mipmaps&&A.mipmaps.length>0)for(let ue=0;ue<A.mipmaps.length;ue++)xe(W.__webglFramebuffer[ue],C,A,n.COLOR_ATTACHMENT0,ae,ue);else xe(W.__webglFramebuffer,C,A,n.COLOR_ATTACHMENT0,ae,0);_(A,me)&&x(ae),t.unbindTexture()}C.depthBuffer&&Se(C)}function $t(C){let A=g(C)||o,W=C.isWebGLMultipleRenderTargets===!0?C.texture:[C.texture];for(let ee=0,Q=W.length;ee<Q;ee++){let te=W[ee];if(_(te,A)){let me=C.isWebGLCubeRenderTarget?n.TEXTURE_CUBE_MAP:n.TEXTURE_2D,ae=i.get(te).__webglTexture;t.bindTexture(me,ae),x(me),t.unbindTexture()}}}function ve(C){if(o&&C.samples>0&&pe(C)===!1){let A=C.isWebGLMultipleRenderTargets?C.texture:[C.texture],W=C.width,ee=C.height,Q=n.COLOR_BUFFER_BIT,te=[],me=C.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,ae=i.get(C),ue=C.isWebGLMultipleRenderTargets===!0;if(ue)for(let we=0;we<A.length;we++)t.bindFramebuffer(n.FRAMEBUFFER,ae.__webglMultisampledFramebuffer),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+we,n.RENDERBUFFER,null),t.bindFramebuffer(n.FRAMEBUFFER,ae.__webglFramebuffer),n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0+we,n.TEXTURE_2D,null,0);t.bindFramebuffer(n.READ_FRAMEBUFFER,ae.__webglMultisampledFramebuffer),t.bindFramebuffer(n.DRAW_FRAMEBUFFER,ae.__webglFramebuffer);for(let we=0;we<A.length;we++){te.push(n.COLOR_ATTACHMENT0+we),C.depthBuffer&&te.push(me);let ze=ae.__ignoreDepthValues!==void 0?ae.__ignoreDepthValues:!1;if(ze===!1&&(C.depthBuffer&&(Q|=n.DEPTH_BUFFER_BIT),C.stencilBuffer&&(Q|=n.STENCIL_BUFFER_BIT)),ue&&n.framebufferRenderbuffer(n.READ_FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.RENDERBUFFER,ae.__webglColorRenderbuffer[we]),ze===!0&&(n.invalidateFramebuffer(n.READ_FRAMEBUFFER,[me]),n.invalidateFramebuffer(n.DRAW_FRAMEBUFFER,[me])),ue){let K=i.get(A[we]).__webglTexture;n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,K,0)}n.blitFramebuffer(0,0,W,ee,0,0,W,ee,Q,n.NEAREST),c&&n.invalidateFramebuffer(n.READ_FRAMEBUFFER,te)}if(t.bindFramebuffer(n.READ_FRAMEBUFFER,null),t.bindFramebuffer(n.DRAW_FRAMEBUFFER,null),ue)for(let we=0;we<A.length;we++){t.bindFramebuffer(n.FRAMEBUFFER,ae.__webglMultisampledFramebuffer),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+we,n.RENDERBUFFER,ae.__webglColorRenderbuffer[we]);let ze=i.get(A[we]).__webglTexture;t.bindFramebuffer(n.FRAMEBUFFER,ae.__webglFramebuffer),n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0+we,n.TEXTURE_2D,ze,0)}t.bindFramebuffer(n.DRAW_FRAMEBUFFER,ae.__webglMultisampledFramebuffer)}}function Ce(C){return Math.min(r.maxSamples,C.samples)}function pe(C){let A=i.get(C);return o&&C.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&A.__useRenderToTexture!==!1}function dt(C){let A=a.render.frame;h.get(C)!==A&&(h.set(C,A),C.update())}function Fe(C,A){let W=C.colorSpace,ee=C.format,Q=C.type;return C.isCompressedTexture===!0||C.isVideoTexture===!0||C.format===Vl||W!==ni&&W!==wt&&(Qe.getTransfer(W)===at?o===!1?e.has("EXT_sRGB")===!0&&ee===It?(C.format=Vl,C.minFilter=Ct,C.generateMipmaps=!1):A=qo.sRGBToLinear(A):(ee!==It||Q!==bn)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture color space:",W)),A}this.allocateTextureUnit=L,this.resetTextureUnits=k,this.setTexture2D=F,this.setTexture2DArray=H,this.setTexture3D=N,this.setTextureCube=B,this.rebindTextures=Ye,this.setupRenderTarget=V,this.updateRenderTargetMipmap=$t,this.updateMultisampleRenderTarget=ve,this.setupDepthRenderbuffer=Se,this.setupFrameBufferTexture=xe,this.useMultisampledRTT=pe}function K_(n,e,t){let i=t.isWebGL2;function r(s,a=wt){let o,l=Qe.getTransfer(a);if(s===bn)return n.UNSIGNED_BYTE;if(s===kf)return n.UNSIGNED_SHORT_4_4_4_4;if(s===Hf)return n.UNSIGNED_SHORT_5_5_5_1;if(s===Lm)return n.BYTE;if(s===Dm)return n.SHORT;if(s===Ic)return n.UNSIGNED_SHORT;if(s===Bf)return n.INT;if(s===pi)return n.UNSIGNED_INT;if(s===kn)return n.FLOAT;if(s===Gi)return i?n.HALF_FLOAT:(o=e.get("OES_texture_half_float"),o!==null?o.HALF_FLOAT_OES:null);if(s===Nm)return n.ALPHA;if(s===It)return n.RGBA;if(s===Um)return n.LUMINANCE;if(s===Om)return n.LUMINANCE_ALPHA;if(s===Bi)return n.DEPTH_COMPONENT;if(s===Ur)return n.DEPTH_STENCIL;if(s===Vl)return o=e.get("EXT_sRGB"),o!==null?o.SRGB_ALPHA_EXT:null;if(s===Fm)return n.RED;if(s===Vf)return n.RED_INTEGER;if(s===zm)return n.RG;if(s===Gf)return n.RG_INTEGER;if(s===Wf)return n.RGBA_INTEGER;if(s===nl||s===il||s===rl||s===sl)if(l===at)if(o=e.get("WEBGL_compressed_texture_s3tc_srgb"),o!==null){if(s===nl)return o.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(s===il)return o.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(s===rl)return o.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(s===sl)return o.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(o=e.get("WEBGL_compressed_texture_s3tc"),o!==null){if(s===nl)return o.COMPRESSED_RGB_S3TC_DXT1_EXT;if(s===il)return o.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(s===rl)return o.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(s===sl)return o.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(s===ru||s===su||s===ou||s===au)if(o=e.get("WEBGL_compressed_texture_pvrtc"),o!==null){if(s===ru)return o.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(s===su)return o.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(s===ou)return o.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(s===au)return o.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(s===Xf)return o=e.get("WEBGL_compressed_texture_etc1"),o!==null?o.COMPRESSED_RGB_ETC1_WEBGL:null;if(s===lu||s===cu)if(o=e.get("WEBGL_compressed_texture_etc"),o!==null){if(s===lu)return l===at?o.COMPRESSED_SRGB8_ETC2:o.COMPRESSED_RGB8_ETC2;if(s===cu)return l===at?o.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:o.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(s===hu||s===uu||s===fu||s===du||s===pu||s===mu||s===gu||s===yu||s===xu||s===_u||s===vu||s===bu||s===Mu||s===wu)if(o=e.get("WEBGL_compressed_texture_astc"),o!==null){if(s===hu)return l===at?o.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:o.COMPRESSED_RGBA_ASTC_4x4_KHR;if(s===uu)return l===at?o.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:o.COMPRESSED_RGBA_ASTC_5x4_KHR;if(s===fu)return l===at?o.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:o.COMPRESSED_RGBA_ASTC_5x5_KHR;if(s===du)return l===at?o.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:o.COMPRESSED_RGBA_ASTC_6x5_KHR;if(s===pu)return l===at?o.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:o.COMPRESSED_RGBA_ASTC_6x6_KHR;if(s===mu)return l===at?o.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:o.COMPRESSED_RGBA_ASTC_8x5_KHR;if(s===gu)return l===at?o.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:o.COMPRESSED_RGBA_ASTC_8x6_KHR;if(s===yu)return l===at?o.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:o.COMPRESSED_RGBA_ASTC_8x8_KHR;if(s===xu)return l===at?o.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:o.COMPRESSED_RGBA_ASTC_10x5_KHR;if(s===_u)return l===at?o.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:o.COMPRESSED_RGBA_ASTC_10x6_KHR;if(s===vu)return l===at?o.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:o.COMPRESSED_RGBA_ASTC_10x8_KHR;if(s===bu)return l===at?o.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:o.COMPRESSED_RGBA_ASTC_10x10_KHR;if(s===Mu)return l===at?o.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:o.COMPRESSED_RGBA_ASTC_12x10_KHR;if(s===wu)return l===at?o.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:o.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(s===ol||s===Su||s===Eu)if(o=e.get("EXT_texture_compression_bptc"),o!==null){if(s===ol)return l===at?o.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:o.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(s===Su)return o.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(s===Eu)return o.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(s===Bm||s===Au||s===Tu||s===Ru)if(o=e.get("EXT_texture_compression_rgtc"),o!==null){if(s===ol)return o.COMPRESSED_RED_RGTC1_EXT;if(s===Au)return o.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(s===Tu)return o.COMPRESSED_RED_GREEN_RGTC2_EXT;if(s===Ru)return o.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return s===zi?i?n.UNSIGNED_INT_24_8:(o=e.get("WEBGL_depth_texture"),o!==null?o.UNSIGNED_INT_24_8_WEBGL:null):n[s]!==void 0?n[s]:null}return{convert:r}}var nc=class extends Bt{constructor(e=[]){super(),this.isArrayCamera=!0,this.cameras=e}},Xt=class extends Et{constructor(){super(),this.isGroup=!0,this.type="Group"}},Q_={type:"move"},bs=class{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Xt,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Xt,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new P,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new P),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Xt,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new P,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new P),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){let t=this._hand;if(t)for(let i of e.hand.values())this._getHandJoint(t,i)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,i){let r=null,s=null,a=null,o=this._targetRay,l=this._grip,c=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(c&&e.hand){a=!0;for(let y of e.hand.values()){let g=t.getJointPose(y,i),m=this._getHandJoint(c,y);g!==null&&(m.matrix.fromArray(g.transform.matrix),m.matrix.decompose(m.position,m.rotation,m.scale),m.matrixWorldNeedsUpdate=!0,m.jointRadius=g.radius),m.visible=g!==null}let h=c.joints["index-finger-tip"],u=c.joints["thumb-tip"],f=h.position.distanceTo(u.position),d=.02,p=.005;c.inputState.pinching&&f>d+p?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!c.inputState.pinching&&f<=d-p&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else l!==null&&e.gripSpace&&(s=t.getPose(e.gripSpace,i),s!==null&&(l.matrix.fromArray(s.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,s.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(s.linearVelocity)):l.hasLinearVelocity=!1,s.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(s.angularVelocity)):l.hasAngularVelocity=!1));o!==null&&(r=t.getPose(e.targetRaySpace,i),r===null&&s!==null&&(r=s),r!==null&&(o.matrix.fromArray(r.transform.matrix),o.matrix.decompose(o.position,o.rotation,o.scale),o.matrixWorldNeedsUpdate=!0,r.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(r.linearVelocity)):o.hasLinearVelocity=!1,r.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(r.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(Q_)))}return o!==null&&(o.visible=r!==null),l!==null&&(l.visible=s!==null),c!==null&&(c.visible=a!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){let i=new Xt;i.matrixAutoUpdate=!1,i.visible=!1,e.joints[t.jointName]=i,e.add(i)}return e.joints[t.jointName]}},ic=class extends yi{constructor(e,t){super();let i=this,r=null,s=1,a=null,o="local-floor",l=1,c=null,h=null,u=null,f=null,d=null,p=null,y=t.getContextAttributes(),g=null,m=null,_=[],x=[],v=new ce,E=null,w=new Bt;w.layers.enable(1),w.viewport=new Ge;let M=new Bt;M.layers.enable(2),M.viewport=new Ge;let T=[w,M],b=new nc;b.layers.enable(1),b.layers.enable(2);let S=null,I=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(Y){let Z=_[Y];return Z===void 0&&(Z=new bs,_[Y]=Z),Z.getTargetRaySpace()},this.getControllerGrip=function(Y){let Z=_[Y];return Z===void 0&&(Z=new bs,_[Y]=Z),Z.getGripSpace()},this.getHand=function(Y){let Z=_[Y];return Z===void 0&&(Z=new bs,_[Y]=Z),Z.getHandSpace()};function O(Y){let Z=x.indexOf(Y.inputSource);if(Z===-1)return;let le=_[Z];le!==void 0&&(le.update(Y.inputSource,Y.frame,c||a),le.dispatchEvent({type:Y.type,data:Y.inputSource}))}function k(){r.removeEventListener("select",O),r.removeEventListener("selectstart",O),r.removeEventListener("selectend",O),r.removeEventListener("squeeze",O),r.removeEventListener("squeezestart",O),r.removeEventListener("squeezeend",O),r.removeEventListener("end",k),r.removeEventListener("inputsourceschange",L);for(let Y=0;Y<_.length;Y++){let Z=x[Y];Z!==null&&(x[Y]=null,_[Y].disconnect(Z))}S=null,I=null,e.setRenderTarget(g),d=null,f=null,u=null,r=null,m=null,re.stop(),i.isPresenting=!1,e.setPixelRatio(E),e.setSize(v.width,v.height,!1),i.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(Y){s=Y,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(Y){o=Y,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||a},this.setReferenceSpace=function(Y){c=Y},this.getBaseLayer=function(){return f!==null?f:d},this.getBinding=function(){return u},this.getFrame=function(){return p},this.getSession=function(){return r},this.setSession=async function(Y){if(r=Y,r!==null){if(g=e.getRenderTarget(),r.addEventListener("select",O),r.addEventListener("selectstart",O),r.addEventListener("selectend",O),r.addEventListener("squeeze",O),r.addEventListener("squeezestart",O),r.addEventListener("squeezeend",O),r.addEventListener("end",k),r.addEventListener("inputsourceschange",L),y.xrCompatible!==!0&&await t.makeXRCompatible(),E=e.getPixelRatio(),e.getSize(v),r.renderState.layers===void 0||e.capabilities.isWebGL2===!1){let Z={antialias:r.renderState.layers===void 0?y.antialias:!0,alpha:!0,depth:y.depth,stencil:y.stencil,framebufferScaleFactor:s};d=new XRWebGLLayer(r,t,Z),r.updateRenderState({baseLayer:d}),e.setPixelRatio(1),e.setSize(d.framebufferWidth,d.framebufferHeight,!1),m=new fn(d.framebufferWidth,d.framebufferHeight,{format:It,type:bn,colorSpace:e.outputColorSpace,stencilBuffer:y.stencil})}else{let Z=null,le=null,de=null;y.depth&&(de=y.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,Z=y.stencil?Ur:Bi,le=y.stencil?zi:pi);let xe={colorFormat:t.RGBA8,depthFormat:de,scaleFactor:s};u=new XRWebGLBinding(r,t),f=u.createProjectionLayer(xe),r.updateRenderState({layers:[f]}),e.setPixelRatio(1),e.setSize(f.textureWidth,f.textureHeight,!1),m=new fn(f.textureWidth,f.textureHeight,{format:It,type:bn,depthTexture:new ta(f.textureWidth,f.textureHeight,le,void 0,void 0,void 0,void 0,void 0,void 0,Z),stencilBuffer:y.stencil,colorSpace:e.outputColorSpace,samples:y.antialias?4:0});let De=e.properties.get(m);De.__ignoreDepthValues=f.ignoreDepthValues}m.isXRRenderTarget=!0,this.setFoveation(l),c=null,a=await r.requestReferenceSpace(o),re.setContext(r),re.start(),i.isPresenting=!0,i.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(r!==null)return r.environmentBlendMode};function L(Y){for(let Z=0;Z<Y.removed.length;Z++){let le=Y.removed[Z],de=x.indexOf(le);de>=0&&(x[de]=null,_[de].disconnect(le))}for(let Z=0;Z<Y.added.length;Z++){let le=Y.added[Z],de=x.indexOf(le);if(de===-1){for(let De=0;De<_.length;De++)if(De>=x.length){x.push(le),de=De;break}else if(x[De]===null){x[De]=le,de=De;break}if(de===-1)break}let xe=_[de];xe&&xe.connect(le)}}let U=new P,F=new P;function H(Y,Z,le){U.setFromMatrixPosition(Z.matrixWorld),F.setFromMatrixPosition(le.matrixWorld);let de=U.distanceTo(F),xe=Z.projectionMatrix.elements,De=le.projectionMatrix.elements,Ue=xe[14]/(xe[10]-1),Se=xe[14]/(xe[10]+1),Ye=(xe[9]+1)/xe[5],V=(xe[9]-1)/xe[5],$t=(xe[8]-1)/xe[0],ve=(De[8]+1)/De[0],Ce=Ue*$t,pe=Ue*ve,dt=de/(-$t+ve),Fe=dt*-$t;Z.matrixWorld.decompose(Y.position,Y.quaternion,Y.scale),Y.translateX(Fe),Y.translateZ(dt),Y.matrixWorld.compose(Y.position,Y.quaternion,Y.scale),Y.matrixWorldInverse.copy(Y.matrixWorld).invert();let C=Ue+dt,A=Se+dt,W=Ce-Fe,ee=pe+(de-Fe),Q=Ye*Se/A*C,te=V*Se/A*C;Y.projectionMatrix.makePerspective(W,ee,Q,te,C,A),Y.projectionMatrixInverse.copy(Y.projectionMatrix).invert()}function N(Y,Z){Z===null?Y.matrixWorld.copy(Y.matrix):Y.matrixWorld.multiplyMatrices(Z.matrixWorld,Y.matrix),Y.matrixWorldInverse.copy(Y.matrixWorld).invert()}this.updateCamera=function(Y){if(r===null)return;b.near=M.near=w.near=Y.near,b.far=M.far=w.far=Y.far,(S!==b.near||I!==b.far)&&(r.updateRenderState({depthNear:b.near,depthFar:b.far}),S=b.near,I=b.far);let Z=Y.parent,le=b.cameras;N(b,Z);for(let de=0;de<le.length;de++)N(le[de],Z);le.length===2?H(b,w,M):b.projectionMatrix.copy(w.projectionMatrix),B(Y,b,Z)};function B(Y,Z,le){le===null?Y.matrix.copy(Z.matrixWorld):(Y.matrix.copy(le.matrixWorld),Y.matrix.invert(),Y.matrix.multiply(Z.matrixWorld)),Y.matrix.decompose(Y.position,Y.quaternion,Y.scale),Y.updateMatrixWorld(!0),Y.projectionMatrix.copy(Z.projectionMatrix),Y.projectionMatrixInverse.copy(Z.projectionMatrixInverse),Y.isPerspectiveCamera&&(Y.fov=Or*2*Math.atan(1/Y.projectionMatrix.elements[5]),Y.zoom=1)}this.getCamera=function(){return b},this.getFoveation=function(){if(!(f===null&&d===null))return l},this.setFoveation=function(Y){l=Y,f!==null&&(f.fixedFoveation=Y),d!==null&&d.fixedFoveation!==void 0&&(d.fixedFoveation=Y)};let $=null;function J(Y,Z){if(h=Z.getViewerPose(c||a),p=Z,h!==null){let le=h.views;d!==null&&(e.setRenderTargetFramebuffer(m,d.framebuffer),e.setRenderTarget(m));let de=!1;le.length!==b.cameras.length&&(b.cameras.length=0,de=!0);for(let xe=0;xe<le.length;xe++){let De=le[xe],Ue=null;if(d!==null)Ue=d.getViewport(De);else{let Ye=u.getViewSubImage(f,De);Ue=Ye.viewport,xe===0&&(e.setRenderTargetTextures(m,Ye.colorTexture,f.ignoreDepthValues?void 0:Ye.depthStencilTexture),e.setRenderTarget(m))}let Se=T[xe];Se===void 0&&(Se=new Bt,Se.layers.enable(xe),Se.viewport=new Ge,T[xe]=Se),Se.matrix.fromArray(De.transform.matrix),Se.matrix.decompose(Se.position,Se.quaternion,Se.scale),Se.projectionMatrix.fromArray(De.projectionMatrix),Se.projectionMatrixInverse.copy(Se.projectionMatrix).invert(),Se.viewport.set(Ue.x,Ue.y,Ue.width,Ue.height),xe===0&&(b.matrix.copy(Se.matrix),b.matrix.decompose(b.position,b.quaternion,b.scale)),de===!0&&b.cameras.push(Se)}}for(let le=0;le<_.length;le++){let de=x[le],xe=_[le];de!==null&&xe!==void 0&&xe.update(de,Z,c||a)}$&&$(Y,Z),Z.detectedPlanes&&i.dispatchEvent({type:"planesdetected",data:Z}),p=null}let re=new Jf;re.setAnimationLoop(J),this.setAnimationLoop=function(Y){$=Y},this.dispose=function(){}}};function ev(n,e){function t(g,m){g.matrixAutoUpdate===!0&&g.updateMatrix(),m.value.copy(g.matrix)}function i(g,m){m.color.getRGB(g.fogColor.value,Zf(n)),m.isFog?(g.fogNear.value=m.near,g.fogFar.value=m.far):m.isFogExp2&&(g.fogDensity.value=m.density)}function r(g,m,_,x,v){m.isMeshBasicMaterial||m.isMeshLambertMaterial?s(g,m):m.isMeshToonMaterial?(s(g,m),u(g,m)):m.isMeshPhongMaterial?(s(g,m),h(g,m)):m.isMeshStandardMaterial?(s(g,m),f(g,m),m.isMeshPhysicalMaterial&&d(g,m,v)):m.isMeshMatcapMaterial?(s(g,m),p(g,m)):m.isMeshDepthMaterial?s(g,m):m.isMeshDistanceMaterial?(s(g,m),y(g,m)):m.isMeshNormalMaterial?s(g,m):m.isLineBasicMaterial?(a(g,m),m.isLineDashedMaterial&&o(g,m)):m.isPointsMaterial?l(g,m,_,x):m.isSpriteMaterial?c(g,m):m.isShadowMaterial?(g.color.value.copy(m.color),g.opacity.value=m.opacity):m.isShaderMaterial&&(m.uniformsNeedUpdate=!1)}function s(g,m){g.opacity.value=m.opacity,m.color&&g.diffuse.value.copy(m.color),m.emissive&&g.emissive.value.copy(m.emissive).multiplyScalar(m.emissiveIntensity),m.map&&(g.map.value=m.map,t(m.map,g.mapTransform)),m.alphaMap&&(g.alphaMap.value=m.alphaMap,t(m.alphaMap,g.alphaMapTransform)),m.bumpMap&&(g.bumpMap.value=m.bumpMap,t(m.bumpMap,g.bumpMapTransform),g.bumpScale.value=m.bumpScale,m.side===en&&(g.bumpScale.value*=-1)),m.normalMap&&(g.normalMap.value=m.normalMap,t(m.normalMap,g.normalMapTransform),g.normalScale.value.copy(m.normalScale),m.side===en&&g.normalScale.value.negate()),m.displacementMap&&(g.displacementMap.value=m.displacementMap,t(m.displacementMap,g.displacementMapTransform),g.displacementScale.value=m.displacementScale,g.displacementBias.value=m.displacementBias),m.emissiveMap&&(g.emissiveMap.value=m.emissiveMap,t(m.emissiveMap,g.emissiveMapTransform)),m.specularMap&&(g.specularMap.value=m.specularMap,t(m.specularMap,g.specularMapTransform)),m.alphaTest>0&&(g.alphaTest.value=m.alphaTest);let _=e.get(m).envMap;if(_&&(g.envMap.value=_,g.flipEnvMap.value=_.isCubeTexture&&_.isRenderTargetTexture===!1?-1:1,g.reflectivity.value=m.reflectivity,g.ior.value=m.ior,g.refractionRatio.value=m.refractionRatio),m.lightMap){g.lightMap.value=m.lightMap;let x=n._useLegacyLights===!0?Math.PI:1;g.lightMapIntensity.value=m.lightMapIntensity*x,t(m.lightMap,g.lightMapTransform)}m.aoMap&&(g.aoMap.value=m.aoMap,g.aoMapIntensity.value=m.aoMapIntensity,t(m.aoMap,g.aoMapTransform))}function a(g,m){g.diffuse.value.copy(m.color),g.opacity.value=m.opacity,m.map&&(g.map.value=m.map,t(m.map,g.mapTransform))}function o(g,m){g.dashSize.value=m.dashSize,g.totalSize.value=m.dashSize+m.gapSize,g.scale.value=m.scale}function l(g,m,_,x){g.diffuse.value.copy(m.color),g.opacity.value=m.opacity,g.size.value=m.size*_,g.scale.value=x*.5,m.map&&(g.map.value=m.map,t(m.map,g.uvTransform)),m.alphaMap&&(g.alphaMap.value=m.alphaMap,t(m.alphaMap,g.alphaMapTransform)),m.alphaTest>0&&(g.alphaTest.value=m.alphaTest)}function c(g,m){g.diffuse.value.copy(m.color),g.opacity.value=m.opacity,g.rotation.value=m.rotation,m.map&&(g.map.value=m.map,t(m.map,g.mapTransform)),m.alphaMap&&(g.alphaMap.value=m.alphaMap,t(m.alphaMap,g.alphaMapTransform)),m.alphaTest>0&&(g.alphaTest.value=m.alphaTest)}function h(g,m){g.specular.value.copy(m.specular),g.shininess.value=Math.max(m.shininess,1e-4)}function u(g,m){m.gradientMap&&(g.gradientMap.value=m.gradientMap)}function f(g,m){g.metalness.value=m.metalness,m.metalnessMap&&(g.metalnessMap.value=m.metalnessMap,t(m.metalnessMap,g.metalnessMapTransform)),g.roughness.value=m.roughness,m.roughnessMap&&(g.roughnessMap.value=m.roughnessMap,t(m.roughnessMap,g.roughnessMapTransform)),e.get(m).envMap&&(g.envMapIntensity.value=m.envMapIntensity)}function d(g,m,_){g.ior.value=m.ior,m.sheen>0&&(g.sheenColor.value.copy(m.sheenColor).multiplyScalar(m.sheen),g.sheenRoughness.value=m.sheenRoughness,m.sheenColorMap&&(g.sheenColorMap.value=m.sheenColorMap,t(m.sheenColorMap,g.sheenColorMapTransform)),m.sheenRoughnessMap&&(g.sheenRoughnessMap.value=m.sheenRoughnessMap,t(m.sheenRoughnessMap,g.sheenRoughnessMapTransform))),m.clearcoat>0&&(g.clearcoat.value=m.clearcoat,g.clearcoatRoughness.value=m.clearcoatRoughness,m.clearcoatMap&&(g.clearcoatMap.value=m.clearcoatMap,t(m.clearcoatMap,g.clearcoatMapTransform)),m.clearcoatRoughnessMap&&(g.clearcoatRoughnessMap.value=m.clearcoatRoughnessMap,t(m.clearcoatRoughnessMap,g.clearcoatRoughnessMapTransform)),m.clearcoatNormalMap&&(g.clearcoatNormalMap.value=m.clearcoatNormalMap,t(m.clearcoatNormalMap,g.clearcoatNormalMapTransform),g.clearcoatNormalScale.value.copy(m.clearcoatNormalScale),m.side===en&&g.clearcoatNormalScale.value.negate())),m.iridescence>0&&(g.iridescence.value=m.iridescence,g.iridescenceIOR.value=m.iridescenceIOR,g.iridescenceThicknessMinimum.value=m.iridescenceThicknessRange[0],g.iridescenceThicknessMaximum.value=m.iridescenceThicknessRange[1],m.iridescenceMap&&(g.iridescenceMap.value=m.iridescenceMap,t(m.iridescenceMap,g.iridescenceMapTransform)),m.iridescenceThicknessMap&&(g.iridescenceThicknessMap.value=m.iridescenceThicknessMap,t(m.iridescenceThicknessMap,g.iridescenceThicknessMapTransform))),m.transmission>0&&(g.transmission.value=m.transmission,g.transmissionSamplerMap.value=_.texture,g.transmissionSamplerSize.value.set(_.width,_.height),m.transmissionMap&&(g.transmissionMap.value=m.transmissionMap,t(m.transmissionMap,g.transmissionMapTransform)),g.thickness.value=m.thickness,m.thicknessMap&&(g.thicknessMap.value=m.thicknessMap,t(m.thicknessMap,g.thicknessMapTransform)),g.attenuationDistance.value=m.attenuationDistance,g.attenuationColor.value.copy(m.attenuationColor)),m.anisotropy>0&&(g.anisotropyVector.value.set(m.anisotropy*Math.cos(m.anisotropyRotation),m.anisotropy*Math.sin(m.anisotropyRotation)),m.anisotropyMap&&(g.anisotropyMap.value=m.anisotropyMap,t(m.anisotropyMap,g.anisotropyMapTransform))),g.specularIntensity.value=m.specularIntensity,g.specularColor.value.copy(m.specularColor),m.specularColorMap&&(g.specularColorMap.value=m.specularColorMap,t(m.specularColorMap,g.specularColorMapTransform)),m.specularIntensityMap&&(g.specularIntensityMap.value=m.specularIntensityMap,t(m.specularIntensityMap,g.specularIntensityMapTransform))}function p(g,m){m.matcap&&(g.matcap.value=m.matcap)}function y(g,m){let _=e.get(m).light;g.referencePosition.value.setFromMatrixPosition(_.matrixWorld),g.nearDistance.value=_.shadow.camera.near,g.farDistance.value=_.shadow.camera.far}return{refreshFogUniforms:i,refreshMaterialUniforms:r}}function tv(n,e,t,i){let r={},s={},a=[],o=t.isWebGL2?n.getParameter(n.MAX_UNIFORM_BUFFER_BINDINGS):0;function l(_,x){let v=x.program;i.uniformBlockBinding(_,v)}function c(_,x){let v=r[_.id];v===void 0&&(p(_),v=h(_),r[_.id]=v,_.addEventListener("dispose",g));let E=x.program;i.updateUBOMapping(_,E);let w=e.render.frame;s[_.id]!==w&&(f(_),s[_.id]=w)}function h(_){let x=u();_.__bindingPointIndex=x;let v=n.createBuffer(),E=_.__size,w=_.usage;return n.bindBuffer(n.UNIFORM_BUFFER,v),n.bufferData(n.UNIFORM_BUFFER,E,w),n.bindBuffer(n.UNIFORM_BUFFER,null),n.bindBufferBase(n.UNIFORM_BUFFER,x,v),v}function u(){for(let _=0;_<o;_++)if(a.indexOf(_)===-1)return a.push(_),_;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function f(_){let x=r[_.id],v=_.uniforms,E=_.__cache;n.bindBuffer(n.UNIFORM_BUFFER,x);for(let w=0,M=v.length;w<M;w++){let T=Array.isArray(v[w])?v[w]:[v[w]];for(let b=0,S=T.length;b<S;b++){let I=T[b];if(d(I,w,b,E)===!0){let O=I.__offset,k=Array.isArray(I.value)?I.value:[I.value],L=0;for(let U=0;U<k.length;U++){let F=k[U],H=y(F);typeof F=="number"||typeof F=="boolean"?(I.__data[0]=F,n.bufferSubData(n.UNIFORM_BUFFER,O+L,I.__data)):F.isMatrix3?(I.__data[0]=F.elements[0],I.__data[1]=F.elements[1],I.__data[2]=F.elements[2],I.__data[3]=0,I.__data[4]=F.elements[3],I.__data[5]=F.elements[4],I.__data[6]=F.elements[5],I.__data[7]=0,I.__data[8]=F.elements[6],I.__data[9]=F.elements[7],I.__data[10]=F.elements[8],I.__data[11]=0):(F.toArray(I.__data,L),L+=H.storage/Float32Array.BYTES_PER_ELEMENT)}n.bufferSubData(n.UNIFORM_BUFFER,O,I.__data)}}}n.bindBuffer(n.UNIFORM_BUFFER,null)}function d(_,x,v,E){let w=_.value,M=x+"_"+v;if(E[M]===void 0)return typeof w=="number"||typeof w=="boolean"?E[M]=w:E[M]=w.clone(),!0;{let T=E[M];if(typeof w=="number"||typeof w=="boolean"){if(T!==w)return E[M]=w,!0}else if(T.equals(w)===!1)return T.copy(w),!0}return!1}function p(_){let x=_.uniforms,v=0,E=16;for(let M=0,T=x.length;M<T;M++){let b=Array.isArray(x[M])?x[M]:[x[M]];for(let S=0,I=b.length;S<I;S++){let O=b[S],k=Array.isArray(O.value)?O.value:[O.value];for(let L=0,U=k.length;L<U;L++){let F=k[L],H=y(F),N=v%E;N!==0&&E-N<H.boundary&&(v+=E-N),O.__data=new Float32Array(H.storage/Float32Array.BYTES_PER_ELEMENT),O.__offset=v,v+=H.storage}}}let w=v%E;return w>0&&(v+=E-w),_.__size=v,_.__cache={},this}function y(_){let x={boundary:0,storage:0};return typeof _=="number"||typeof _=="boolean"?(x.boundary=4,x.storage=4):_.isVector2?(x.boundary=8,x.storage=8):_.isVector3||_.isColor?(x.boundary=16,x.storage=12):_.isVector4?(x.boundary=16,x.storage=16):_.isMatrix3?(x.boundary=48,x.storage=48):_.isMatrix4?(x.boundary=64,x.storage=64):_.isTexture?console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group."):console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",_),x}function g(_){let x=_.target;x.removeEventListener("dispose",g);let v=a.indexOf(x.__bindingPointIndex);a.splice(v,1),n.deleteBuffer(r[x.id]),delete r[x.id],delete s[x.id]}function m(){for(let _ in r)n.deleteBuffer(r[_]);a=[],r={},s={}}return{bind:l,update:c,dispose:m}}var Ts=class{constructor(e={}){let{canvas:t=h0(),context:i=null,depth:r=!0,stencil:s=!0,alpha:a=!1,antialias:o=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:u=!1}=e;this.isWebGLRenderer=!0;let f;i!==null?f=i.getContextAttributes().alpha:f=a;let d=new Uint32Array(4),p=new Int32Array(4),y=null,g=null,m=[],_=[];this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this._outputColorSpace=mt,this._useLegacyLights=!1,this.toneMapping=gi,this.toneMappingExposure=1;let x=this,v=!1,E=0,w=0,M=null,T=-1,b=null,S=new Ge,I=new Ge,O=null,k=new ye(0),L=0,U=t.width,F=t.height,H=1,N=null,B=null,$=new Ge(0,0,U,F),J=new Ge(0,0,U,F),re=!1,Y=new As,Z=!1,le=!1,de=null,xe=new et,De=new ce,Ue=new P,Se={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};function Ye(){return M===null?H:1}let V=i;function $t(R,z){for(let X=0;X<R.length;X++){let q=R[X],G=t.getContext(q,z);if(G!==null)return G}return null}try{let R={alpha:!0,depth:r,stencil:s,antialias:o,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:h,failIfMajorPerformanceCaveat:u};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${Zi}`),t.addEventListener("webglcontextlost",ne,!1),t.addEventListener("webglcontextrestored",D,!1),t.addEventListener("webglcontextcreationerror",se,!1),V===null){let z=["webgl2","webgl","experimental-webgl"];if(x.isWebGL1Renderer===!0&&z.shift(),V=$t(z,R),V===null)throw $t(z)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}typeof WebGLRenderingContext<"u"&&V instanceof WebGLRenderingContext&&console.warn("THREE.WebGLRenderer: WebGL 1 support was deprecated in r153 and will be removed in r163."),V.getShaderPrecisionFormat===void 0&&(V.getShaderPrecisionFormat=function(){return{rangeMin:1,rangeMax:1,precision:1}})}catch(R){throw console.error("THREE.WebGLRenderer: "+R.message),R}let ve,Ce,pe,dt,Fe,C,A,W,ee,Q,te,me,ae,ue,we,ze,K,Ke,We,Re,_e,fe,Oe,Je;function xt(){ve=new vx(V),Ce=new px(V,ve,e),ve.init(Ce),fe=new K_(V,ve,Ce),pe=new Z_(V,ve,Ce),dt=new wx(V),Fe=new z_,C=new J_(V,ve,pe,Fe,Ce,fe,dt),A=new gx(x),W=new _x(x),ee=new P0(V,Ce),Oe=new fx(V,ve,ee,Ce),Q=new bx(V,ee,dt,Oe),te=new Tx(V,Q,ee,dt),We=new Ax(V,Ce,C),ze=new mx(Fe),me=new F_(x,A,W,ve,Ce,Oe,ze),ae=new ev(x,Fe),ue=new k_,we=new q_(ve,Ce),Ke=new ux(x,A,W,pe,te,f,l),K=new j_(x,te,Ce),Je=new tv(V,dt,Ce,pe),Re=new dx(V,ve,dt,Ce),_e=new Mx(V,ve,dt,Ce),dt.programs=me.programs,x.capabilities=Ce,x.extensions=ve,x.properties=Fe,x.renderLists=ue,x.shadowMap=K,x.state=pe,x.info=dt}xt();let ke=new ic(x,V);this.xr=ke,this.getContext=function(){return V},this.getContextAttributes=function(){return V.getContextAttributes()},this.forceContextLoss=function(){let R=ve.get("WEBGL_lose_context");R&&R.loseContext()},this.forceContextRestore=function(){let R=ve.get("WEBGL_lose_context");R&&R.restoreContext()},this.getPixelRatio=function(){return H},this.setPixelRatio=function(R){R!==void 0&&(H=R,this.setSize(U,F,!1))},this.getSize=function(R){return R.set(U,F)},this.setSize=function(R,z,X=!0){if(ke.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}U=R,F=z,t.width=Math.floor(R*H),t.height=Math.floor(z*H),X===!0&&(t.style.width=R+"px",t.style.height=z+"px"),this.setViewport(0,0,R,z)},this.getDrawingBufferSize=function(R){return R.set(U*H,F*H).floor()},this.setDrawingBufferSize=function(R,z,X){U=R,F=z,H=X,t.width=Math.floor(R*X),t.height=Math.floor(z*X),this.setViewport(0,0,R,z)},this.getCurrentViewport=function(R){return R.copy(S)},this.getViewport=function(R){return R.copy($)},this.setViewport=function(R,z,X,q){R.isVector4?$.set(R.x,R.y,R.z,R.w):$.set(R,z,X,q),pe.viewport(S.copy($).multiplyScalar(H).floor())},this.getScissor=function(R){return R.copy(J)},this.setScissor=function(R,z,X,q){R.isVector4?J.set(R.x,R.y,R.z,R.w):J.set(R,z,X,q),pe.scissor(I.copy(J).multiplyScalar(H).floor())},this.getScissorTest=function(){return re},this.setScissorTest=function(R){pe.setScissorTest(re=R)},this.setOpaqueSort=function(R){N=R},this.setTransparentSort=function(R){B=R},this.getClearColor=function(R){return R.copy(Ke.getClearColor())},this.setClearColor=function(){Ke.setClearColor.apply(Ke,arguments)},this.getClearAlpha=function(){return Ke.getClearAlpha()},this.setClearAlpha=function(){Ke.setClearAlpha.apply(Ke,arguments)},this.clear=function(R=!0,z=!0,X=!0){let q=0;if(R){let G=!1;if(M!==null){let he=M.texture.format;G=he===Wf||he===Gf||he===Vf}if(G){let he=M.texture.type,ge=he===bn||he===pi||he===Ic||he===zi||he===kf||he===Hf,Me=Ke.getClearColor(),Ae=Ke.getClearAlpha(),Be=Me.r,Ie=Me.g,Ne=Me.b;ge?(d[0]=Be,d[1]=Ie,d[2]=Ne,d[3]=Ae,V.clearBufferuiv(V.COLOR,0,d)):(p[0]=Be,p[1]=Ie,p[2]=Ne,p[3]=Ae,V.clearBufferiv(V.COLOR,0,p))}else q|=V.COLOR_BUFFER_BIT}z&&(q|=V.DEPTH_BUFFER_BIT),X&&(q|=V.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),V.clear(q)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){t.removeEventListener("webglcontextlost",ne,!1),t.removeEventListener("webglcontextrestored",D,!1),t.removeEventListener("webglcontextcreationerror",se,!1),ue.dispose(),we.dispose(),Fe.dispose(),A.dispose(),W.dispose(),te.dispose(),Oe.dispose(),Je.dispose(),me.dispose(),ke.dispose(),ke.removeEventListener("sessionstart",jt),ke.removeEventListener("sessionend",st),de&&(de.dispose(),de=null),Zt.stop()};function ne(R){R.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),v=!0}function D(){console.log("THREE.WebGLRenderer: Context Restored."),v=!1;let R=dt.autoReset,z=K.enabled,X=K.autoUpdate,q=K.needsUpdate,G=K.type;xt(),dt.autoReset=R,K.enabled=z,K.autoUpdate=X,K.needsUpdate=q,K.type=G}function se(R){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",R.statusMessage)}function oe(R){let z=R.target;z.removeEventListener("dispose",oe),Ee(z)}function Ee(R){be(R),Fe.remove(R)}function be(R){let z=Fe.get(R).programs;z!==void 0&&(z.forEach(function(X){me.releaseProgram(X)}),R.isShaderMaterial&&me.releaseShaderCache(R))}this.renderBufferDirect=function(R,z,X,q,G,he){z===null&&(z=Se);let ge=G.isMesh&&G.matrixWorld.determinant()<0,Me=jp(R,z,X,q,G);pe.setMaterial(q,ge);let Ae=X.index,Be=1;if(q.wireframe===!0){if(Ae=Q.getWireframeAttribute(X),Ae===void 0)return;Be=2}let Ie=X.drawRange,Ne=X.attributes.position,Mt=Ie.start*Be,an=(Ie.start+Ie.count)*Be;he!==null&&(Mt=Math.max(Mt,he.start*Be),an=Math.min(an,(he.start+he.count)*Be)),Ae!==null?(Mt=Math.max(Mt,0),an=Math.min(an,Ae.count)):Ne!=null&&(Mt=Math.max(Mt,0),an=Math.min(an,Ne.count));let Nt=an-Mt;if(Nt<0||Nt===1/0)return;Oe.setup(G,q,Me,X,Ae);let $n,pt=Re;if(Ae!==null&&($n=ee.get(Ae),pt=_e,pt.setIndex($n)),G.isMesh)q.wireframe===!0?(pe.setLineWidth(q.wireframeLinewidth*Ye()),pt.setMode(V.LINES)):pt.setMode(V.TRIANGLES);else if(G.isLine){let He=q.linewidth;He===void 0&&(He=1),pe.setLineWidth(He*Ye()),G.isLineSegments?pt.setMode(V.LINES):G.isLineLoop?pt.setMode(V.LINE_LOOP):pt.setMode(V.LINE_STRIP)}else G.isPoints?pt.setMode(V.POINTS):G.isSprite&&pt.setMode(V.TRIANGLES);if(G.isBatchedMesh)pt.renderMultiDraw(G._multiDrawStarts,G._multiDrawCounts,G._multiDrawCount);else if(G.isInstancedMesh)pt.renderInstances(Mt,Nt,G.count);else if(X.isInstancedBufferGeometry){let He=X._maxInstanceCount!==void 0?X._maxInstanceCount:1/0,Ja=Math.min(X.instanceCount,He);pt.renderInstances(Mt,Nt,Ja)}else pt.render(Mt,Nt)};function it(R,z,X){R.transparent===!0&&R.side===Rt&&R.forceSinglePass===!1?(R.side=en,R.needsUpdate=!0,io(R,z,X),R.side=Qt,R.needsUpdate=!0,io(R,z,X),R.side=Rt):io(R,z,X)}this.compile=function(R,z,X=null){X===null&&(X=R),g=we.get(X),g.init(),_.push(g),X.traverseVisible(function(G){G.isLight&&G.layers.test(z.layers)&&(g.pushLight(G),G.castShadow&&g.pushShadow(G))}),R!==X&&R.traverseVisible(function(G){G.isLight&&G.layers.test(z.layers)&&(g.pushLight(G),G.castShadow&&g.pushShadow(G))}),g.setupLights(x._useLegacyLights);let q=new Set;return R.traverse(function(G){let he=G.material;if(he)if(Array.isArray(he))for(let ge=0;ge<he.length;ge++){let Me=he[ge];it(Me,X,G),q.add(Me)}else it(he,X,G),q.add(he)}),_.pop(),g=null,q},this.compileAsync=function(R,z,X=null){let q=this.compile(R,z,X);return new Promise(G=>{function he(){if(q.forEach(function(ge){Fe.get(ge).currentProgram.isReady()&&q.delete(ge)}),q.size===0){G(R);return}setTimeout(he,10)}ve.get("KHR_parallel_shader_compile")!==null?he():setTimeout(he,10)})};let rt=null;function Dt(R){rt&&rt(R)}function jt(){Zt.stop()}function st(){Zt.start()}let Zt=new Jf;Zt.setAnimationLoop(Dt),typeof self<"u"&&Zt.setContext(self),this.setAnimationLoop=function(R){rt=R,ke.setAnimationLoop(R),R===null?Zt.stop():Zt.start()},ke.addEventListener("sessionstart",jt),ke.addEventListener("sessionend",st),this.render=function(R,z){if(z!==void 0&&z.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(v===!0)return;R.matrixWorldAutoUpdate===!0&&R.updateMatrixWorld(),z.parent===null&&z.matrixWorldAutoUpdate===!0&&z.updateMatrixWorld(),ke.enabled===!0&&ke.isPresenting===!0&&(ke.cameraAutoUpdate===!0&&ke.updateCamera(z),z=ke.getCamera()),R.isScene===!0&&R.onBeforeRender(x,R,z,M),g=we.get(R,_.length),g.init(),_.push(g),xe.multiplyMatrices(z.projectionMatrix,z.matrixWorldInverse),Y.setFromProjectionMatrix(xe),le=this.localClippingEnabled,Z=ze.init(this.clippingPlanes,le),y=ue.get(R,m.length),y.init(),m.push(y),zn(R,z,0,x.sortObjects),y.finish(),x.sortObjects===!0&&y.sort(N,B),this.info.render.frame++,Z===!0&&ze.beginShadows();let X=g.state.shadowsArray;if(K.render(X,R,z),Z===!0&&ze.endShadows(),this.info.autoReset===!0&&this.info.reset(),Ke.render(y,R),g.setupLights(x._useLegacyLights),z.isArrayCamera){let q=z.cameras;for(let G=0,he=q.length;G<he;G++){let ge=q[G];Wh(y,R,ge,ge.viewport)}}else Wh(y,R,z);M!==null&&(C.updateMultisampleRenderTarget(M),C.updateRenderTargetMipmap(M)),R.isScene===!0&&R.onAfterRender(x,R,z),Oe.resetDefaultState(),T=-1,b=null,_.pop(),_.length>0?g=_[_.length-1]:g=null,m.pop(),m.length>0?y=m[m.length-1]:y=null};function zn(R,z,X,q){if(R.visible===!1)return;if(R.layers.test(z.layers)){if(R.isGroup)X=R.renderOrder;else if(R.isLOD)R.autoUpdate===!0&&R.update(z);else if(R.isLight)g.pushLight(R),R.castShadow&&g.pushShadow(R);else if(R.isSprite){if(!R.frustumCulled||Y.intersectsSprite(R)){q&&Ue.setFromMatrixPosition(R.matrixWorld).applyMatrix4(xe);let ge=te.update(R),Me=R.material;Me.visible&&y.push(R,ge,Me,X,Ue.z,null)}}else if((R.isMesh||R.isLine||R.isPoints)&&(!R.frustumCulled||Y.intersectsObject(R))){let ge=te.update(R),Me=R.material;if(q&&(R.boundingSphere!==void 0?(R.boundingSphere===null&&R.computeBoundingSphere(),Ue.copy(R.boundingSphere.center)):(ge.boundingSphere===null&&ge.computeBoundingSphere(),Ue.copy(ge.boundingSphere.center)),Ue.applyMatrix4(R.matrixWorld).applyMatrix4(xe)),Array.isArray(Me)){let Ae=ge.groups;for(let Be=0,Ie=Ae.length;Be<Ie;Be++){let Ne=Ae[Be],Mt=Me[Ne.materialIndex];Mt&&Mt.visible&&y.push(R,ge,Mt,X,Ue.z,Ne)}}else Me.visible&&y.push(R,ge,Me,X,Ue.z,null)}}let he=R.children;for(let ge=0,Me=he.length;ge<Me;ge++)zn(he[ge],z,X,q)}function Wh(R,z,X,q){let G=R.opaque,he=R.transmissive,ge=R.transparent;g.setupLightsView(X),Z===!0&&ze.setGlobalState(x.clippingPlanes,X),he.length>0&&$p(G,he,z,X),q&&pe.viewport(S.copy(q)),G.length>0&&no(G,z,X),he.length>0&&no(he,z,X),ge.length>0&&no(ge,z,X),pe.buffers.depth.setTest(!0),pe.buffers.depth.setMask(!0),pe.buffers.color.setMask(!0),pe.setPolygonOffset(!1)}function $p(R,z,X,q){if((X.isScene===!0?X.overrideMaterial:null)!==null)return;let he=Ce.isWebGL2;de===null&&(de=new fn(1,1,{generateMipmaps:!0,type:ve.has("EXT_color_buffer_half_float")?Gi:bn,minFilter:Vi,samples:he?4:0})),x.getDrawingBufferSize(De),he?de.setSize(De.x,De.y):de.setSize(Wo(De.x),Wo(De.y));let ge=x.getRenderTarget();x.setRenderTarget(de),x.getClearColor(k),L=x.getClearAlpha(),L<1&&x.setClearColor(16777215,.5),x.clear();let Me=x.toneMapping;x.toneMapping=gi,no(R,X,q),C.updateMultisampleRenderTarget(de),C.updateRenderTargetMipmap(de);let Ae=!1;for(let Be=0,Ie=z.length;Be<Ie;Be++){let Ne=z[Be],Mt=Ne.object,an=Ne.geometry,Nt=Ne.material,$n=Ne.group;if(Nt.side===Rt&&Mt.layers.test(q.layers)){let pt=Nt.side;Nt.side=en,Nt.needsUpdate=!0,Xh(Mt,X,q,an,Nt,$n),Nt.side=pt,Nt.needsUpdate=!0,Ae=!0}}Ae===!0&&(C.updateMultisampleRenderTarget(de),C.updateRenderTargetMipmap(de)),x.setRenderTarget(ge),x.setClearColor(k,L),x.toneMapping=Me}function no(R,z,X){let q=z.isScene===!0?z.overrideMaterial:null;for(let G=0,he=R.length;G<he;G++){let ge=R[G],Me=ge.object,Ae=ge.geometry,Be=q===null?ge.material:q,Ie=ge.group;Me.layers.test(X.layers)&&Xh(Me,z,X,Ae,Be,Ie)}}function Xh(R,z,X,q,G,he){R.onBeforeRender(x,z,X,q,G,he),R.modelViewMatrix.multiplyMatrices(X.matrixWorldInverse,R.matrixWorld),R.normalMatrix.getNormalMatrix(R.modelViewMatrix),G.onBeforeRender(x,z,X,q,R,he),G.transparent===!0&&G.side===Rt&&G.forceSinglePass===!1?(G.side=en,G.needsUpdate=!0,x.renderBufferDirect(X,z,q,G,R,he),G.side=Qt,G.needsUpdate=!0,x.renderBufferDirect(X,z,q,G,R,he),G.side=Rt):x.renderBufferDirect(X,z,q,G,R,he),R.onAfterRender(x,z,X,q,G,he)}function io(R,z,X){z.isScene!==!0&&(z=Se);let q=Fe.get(R),G=g.state.lights,he=g.state.shadowsArray,ge=G.state.version,Me=me.getParameters(R,G.state,he,z,X),Ae=me.getProgramCacheKey(Me),Be=q.programs;q.environment=R.isMeshStandardMaterial?z.environment:null,q.fog=z.fog,q.envMap=(R.isMeshStandardMaterial?W:A).get(R.envMap||q.environment),Be===void 0&&(R.addEventListener("dispose",oe),Be=new Map,q.programs=Be);let Ie=Be.get(Ae);if(Ie!==void 0){if(q.currentProgram===Ie&&q.lightsStateVersion===ge)return Yh(R,Me),Ie}else Me.uniforms=me.getUniforms(R),R.onBuild(X,Me,x),R.onBeforeCompile(Me,x),Ie=me.acquireProgram(Me,Ae),Be.set(Ae,Ie),q.uniforms=Me.uniforms;let Ne=q.uniforms;return(!R.isShaderMaterial&&!R.isRawShaderMaterial||R.clipping===!0)&&(Ne.clippingPlanes=ze.uniform),Yh(R,Me),q.needsLights=Jp(R),q.lightsStateVersion=ge,q.needsLights&&(Ne.ambientLightColor.value=G.state.ambient,Ne.lightProbe.value=G.state.probe,Ne.directionalLights.value=G.state.directional,Ne.directionalLightShadows.value=G.state.directionalShadow,Ne.spotLights.value=G.state.spot,Ne.spotLightShadows.value=G.state.spotShadow,Ne.rectAreaLights.value=G.state.rectArea,Ne.ltc_1.value=G.state.rectAreaLTC1,Ne.ltc_2.value=G.state.rectAreaLTC2,Ne.pointLights.value=G.state.point,Ne.pointLightShadows.value=G.state.pointShadow,Ne.hemisphereLights.value=G.state.hemi,Ne.directionalShadowMap.value=G.state.directionalShadowMap,Ne.directionalShadowMatrix.value=G.state.directionalShadowMatrix,Ne.spotShadowMap.value=G.state.spotShadowMap,Ne.spotLightMatrix.value=G.state.spotLightMatrix,Ne.spotLightMap.value=G.state.spotLightMap,Ne.pointShadowMap.value=G.state.pointShadowMap,Ne.pointShadowMatrix.value=G.state.pointShadowMatrix),q.currentProgram=Ie,q.uniformsList=null,Ie}function qh(R){if(R.uniformsList===null){let z=R.currentProgram.getUniforms();R.uniformsList=Lr.seqWithValue(z.seq,R.uniforms)}return R.uniformsList}function Yh(R,z){let X=Fe.get(R);X.outputColorSpace=z.outputColorSpace,X.batching=z.batching,X.instancing=z.instancing,X.instancingColor=z.instancingColor,X.skinning=z.skinning,X.morphTargets=z.morphTargets,X.morphNormals=z.morphNormals,X.morphColors=z.morphColors,X.morphTargetsCount=z.morphTargetsCount,X.numClippingPlanes=z.numClippingPlanes,X.numIntersection=z.numClipIntersection,X.vertexAlphas=z.vertexAlphas,X.vertexTangents=z.vertexTangents,X.toneMapping=z.toneMapping}function jp(R,z,X,q,G){z.isScene!==!0&&(z=Se),C.resetTextureUnits();let he=z.fog,ge=q.isMeshStandardMaterial?z.environment:null,Me=M===null?x.outputColorSpace:M.isXRRenderTarget===!0?M.texture.colorSpace:ni,Ae=(q.isMeshStandardMaterial?W:A).get(q.envMap||ge),Be=q.vertexColors===!0&&!!X.attributes.color&&X.attributes.color.itemSize===4,Ie=!!X.attributes.tangent&&(!!q.normalMap||q.anisotropy>0),Ne=!!X.morphAttributes.position,Mt=!!X.morphAttributes.normal,an=!!X.morphAttributes.color,Nt=gi;q.toneMapped&&(M===null||M.isXRRenderTarget===!0)&&(Nt=x.toneMapping);let $n=X.morphAttributes.position||X.morphAttributes.normal||X.morphAttributes.color,pt=$n!==void 0?$n.length:0,He=Fe.get(q),Ja=g.state.lights;if(Z===!0&&(le===!0||R!==b)){let _n=R===b&&q.id===T;ze.setState(q,R,_n)}let _t=!1;q.version===He.__version?(He.needsLights&&He.lightsStateVersion!==Ja.state.version||He.outputColorSpace!==Me||G.isBatchedMesh&&He.batching===!1||!G.isBatchedMesh&&He.batching===!0||G.isInstancedMesh&&He.instancing===!1||!G.isInstancedMesh&&He.instancing===!0||G.isSkinnedMesh&&He.skinning===!1||!G.isSkinnedMesh&&He.skinning===!0||G.isInstancedMesh&&He.instancingColor===!0&&G.instanceColor===null||G.isInstancedMesh&&He.instancingColor===!1&&G.instanceColor!==null||He.envMap!==Ae||q.fog===!0&&He.fog!==he||He.numClippingPlanes!==void 0&&(He.numClippingPlanes!==ze.numPlanes||He.numIntersection!==ze.numIntersection)||He.vertexAlphas!==Be||He.vertexTangents!==Ie||He.morphTargets!==Ne||He.morphNormals!==Mt||He.morphColors!==an||He.toneMapping!==Nt||Ce.isWebGL2===!0&&He.morphTargetsCount!==pt)&&(_t=!0):(_t=!0,He.__version=q.version);let Ri=He.currentProgram;_t===!0&&(Ri=io(q,z,G));let $h=!1,ds=!1,Ka=!1,Vt=Ri.getUniforms(),Ci=He.uniforms;if(pe.useProgram(Ri.program)&&($h=!0,ds=!0,Ka=!0),q.id!==T&&(T=q.id,ds=!0),$h||b!==R){Vt.setValue(V,"projectionMatrix",R.projectionMatrix),Vt.setValue(V,"viewMatrix",R.matrixWorldInverse);let _n=Vt.map.cameraPosition;_n!==void 0&&_n.setValue(V,Ue.setFromMatrixPosition(R.matrixWorld)),Ce.logarithmicDepthBuffer&&Vt.setValue(V,"logDepthBufFC",2/(Math.log(R.far+1)/Math.LN2)),(q.isMeshPhongMaterial||q.isMeshToonMaterial||q.isMeshLambertMaterial||q.isMeshBasicMaterial||q.isMeshStandardMaterial||q.isShaderMaterial)&&Vt.setValue(V,"isOrthographic",R.isOrthographicCamera===!0),b!==R&&(b=R,ds=!0,Ka=!0)}if(G.isSkinnedMesh){Vt.setOptional(V,G,"bindMatrix"),Vt.setOptional(V,G,"bindMatrixInverse");let _n=G.skeleton;_n&&(Ce.floatVertexTextures?(_n.boneTexture===null&&_n.computeBoneTexture(),Vt.setValue(V,"boneTexture",_n.boneTexture,C)):console.warn("THREE.WebGLRenderer: SkinnedMesh can only be used with WebGL 2. With WebGL 1 OES_texture_float and vertex textures support is required."))}G.isBatchedMesh&&(Vt.setOptional(V,G,"batchingTexture"),Vt.setValue(V,"batchingTexture",G._matricesTexture,C));let Qa=X.morphAttributes;if((Qa.position!==void 0||Qa.normal!==void 0||Qa.color!==void 0&&Ce.isWebGL2===!0)&&We.update(G,X,Ri),(ds||He.receiveShadow!==G.receiveShadow)&&(He.receiveShadow=G.receiveShadow,Vt.setValue(V,"receiveShadow",G.receiveShadow)),q.isMeshGouraudMaterial&&q.envMap!==null&&(Ci.envMap.value=Ae,Ci.flipEnvMap.value=Ae.isCubeTexture&&Ae.isRenderTargetTexture===!1?-1:1),ds&&(Vt.setValue(V,"toneMappingExposure",x.toneMappingExposure),He.needsLights&&Zp(Ci,Ka),he&&q.fog===!0&&ae.refreshFogUniforms(Ci,he),ae.refreshMaterialUniforms(Ci,q,H,F,de),Lr.upload(V,qh(He),Ci,C)),q.isShaderMaterial&&q.uniformsNeedUpdate===!0&&(Lr.upload(V,qh(He),Ci,C),q.uniformsNeedUpdate=!1),q.isSpriteMaterial&&Vt.setValue(V,"center",G.center),Vt.setValue(V,"modelViewMatrix",G.modelViewMatrix),Vt.setValue(V,"normalMatrix",G.normalMatrix),Vt.setValue(V,"modelMatrix",G.matrixWorld),q.isShaderMaterial||q.isRawShaderMaterial){let _n=q.uniformsGroups;for(let el=0,Kp=_n.length;el<Kp;el++)if(Ce.isWebGL2){let jh=_n[el];Je.update(jh,Ri),Je.bind(jh,Ri)}else console.warn("THREE.WebGLRenderer: Uniform Buffer Objects can only be used with WebGL 2.")}return Ri}function Zp(R,z){R.ambientLightColor.needsUpdate=z,R.lightProbe.needsUpdate=z,R.directionalLights.needsUpdate=z,R.directionalLightShadows.needsUpdate=z,R.pointLights.needsUpdate=z,R.pointLightShadows.needsUpdate=z,R.spotLights.needsUpdate=z,R.spotLightShadows.needsUpdate=z,R.rectAreaLights.needsUpdate=z,R.hemisphereLights.needsUpdate=z}function Jp(R){return R.isMeshLambertMaterial||R.isMeshToonMaterial||R.isMeshPhongMaterial||R.isMeshStandardMaterial||R.isShadowMaterial||R.isShaderMaterial&&R.lights===!0}this.getActiveCubeFace=function(){return E},this.getActiveMipmapLevel=function(){return w},this.getRenderTarget=function(){return M},this.setRenderTargetTextures=function(R,z,X){Fe.get(R.texture).__webglTexture=z,Fe.get(R.depthTexture).__webglTexture=X;let q=Fe.get(R);q.__hasExternalTextures=!0,q.__hasExternalTextures&&(q.__autoAllocateDepthBuffer=X===void 0,q.__autoAllocateDepthBuffer||ve.has("WEBGL_multisampled_render_to_texture")===!0&&(console.warn("THREE.WebGLRenderer: Render-to-texture extension was disabled because an external texture was provided"),q.__useRenderToTexture=!1))},this.setRenderTargetFramebuffer=function(R,z){let X=Fe.get(R);X.__webglFramebuffer=z,X.__useDefaultFramebuffer=z===void 0},this.setRenderTarget=function(R,z=0,X=0){M=R,E=z,w=X;let q=!0,G=null,he=!1,ge=!1;if(R){let Ae=Fe.get(R);Ae.__useDefaultFramebuffer!==void 0?(pe.bindFramebuffer(V.FRAMEBUFFER,null),q=!1):Ae.__webglFramebuffer===void 0?C.setupRenderTarget(R):Ae.__hasExternalTextures&&C.rebindTextures(R,Fe.get(R.texture).__webglTexture,Fe.get(R.depthTexture).__webglTexture);let Be=R.texture;(Be.isData3DTexture||Be.isDataArrayTexture||Be.isCompressedArrayTexture)&&(ge=!0);let Ie=Fe.get(R).__webglFramebuffer;R.isWebGLCubeRenderTarget?(Array.isArray(Ie[z])?G=Ie[z][X]:G=Ie[z],he=!0):Ce.isWebGL2&&R.samples>0&&C.useMultisampledRTT(R)===!1?G=Fe.get(R).__webglMultisampledFramebuffer:Array.isArray(Ie)?G=Ie[X]:G=Ie,S.copy(R.viewport),I.copy(R.scissor),O=R.scissorTest}else S.copy($).multiplyScalar(H).floor(),I.copy(J).multiplyScalar(H).floor(),O=re;if(pe.bindFramebuffer(V.FRAMEBUFFER,G)&&Ce.drawBuffers&&q&&pe.drawBuffers(R,G),pe.viewport(S),pe.scissor(I),pe.setScissorTest(O),he){let Ae=Fe.get(R.texture);V.framebufferTexture2D(V.FRAMEBUFFER,V.COLOR_ATTACHMENT0,V.TEXTURE_CUBE_MAP_POSITIVE_X+z,Ae.__webglTexture,X)}else if(ge){let Ae=Fe.get(R.texture),Be=z||0;V.framebufferTextureLayer(V.FRAMEBUFFER,V.COLOR_ATTACHMENT0,Ae.__webglTexture,X||0,Be)}T=-1},this.readRenderTargetPixels=function(R,z,X,q,G,he,ge){if(!(R&&R.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Me=Fe.get(R).__webglFramebuffer;if(R.isWebGLCubeRenderTarget&&ge!==void 0&&(Me=Me[ge]),Me){pe.bindFramebuffer(V.FRAMEBUFFER,Me);try{let Ae=R.texture,Be=Ae.format,Ie=Ae.type;if(Be!==It&&fe.convert(Be)!==V.getParameter(V.IMPLEMENTATION_COLOR_READ_FORMAT)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}let Ne=Ie===Gi&&(ve.has("EXT_color_buffer_half_float")||Ce.isWebGL2&&ve.has("EXT_color_buffer_float"));if(Ie!==bn&&fe.convert(Ie)!==V.getParameter(V.IMPLEMENTATION_COLOR_READ_TYPE)&&!(Ie===kn&&(Ce.isWebGL2||ve.has("OES_texture_float")||ve.has("WEBGL_color_buffer_float")))&&!Ne){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}z>=0&&z<=R.width-q&&X>=0&&X<=R.height-G&&V.readPixels(z,X,q,G,fe.convert(Be),fe.convert(Ie),he)}finally{let Ae=M!==null?Fe.get(M).__webglFramebuffer:null;pe.bindFramebuffer(V.FRAMEBUFFER,Ae)}}},this.copyFramebufferToTexture=function(R,z,X=0){let q=Math.pow(2,-X),G=Math.floor(z.image.width*q),he=Math.floor(z.image.height*q);C.setTexture2D(z,0),V.copyTexSubImage2D(V.TEXTURE_2D,X,0,0,R.x,R.y,G,he),pe.unbindTexture()},this.copyTextureToTexture=function(R,z,X,q=0){let G=z.image.width,he=z.image.height,ge=fe.convert(X.format),Me=fe.convert(X.type);C.setTexture2D(X,0),V.pixelStorei(V.UNPACK_FLIP_Y_WEBGL,X.flipY),V.pixelStorei(V.UNPACK_PREMULTIPLY_ALPHA_WEBGL,X.premultiplyAlpha),V.pixelStorei(V.UNPACK_ALIGNMENT,X.unpackAlignment),z.isDataTexture?V.texSubImage2D(V.TEXTURE_2D,q,R.x,R.y,G,he,ge,Me,z.image.data):z.isCompressedTexture?V.compressedTexSubImage2D(V.TEXTURE_2D,q,R.x,R.y,z.mipmaps[0].width,z.mipmaps[0].height,ge,z.mipmaps[0].data):V.texSubImage2D(V.TEXTURE_2D,q,R.x,R.y,ge,Me,z.image),q===0&&X.generateMipmaps&&V.generateMipmap(V.TEXTURE_2D),pe.unbindTexture()},this.copyTextureToTexture3D=function(R,z,X,q,G=0){if(x.isWebGL1Renderer){console.warn("THREE.WebGLRenderer.copyTextureToTexture3D: can only be used with WebGL2.");return}let he=R.max.x-R.min.x+1,ge=R.max.y-R.min.y+1,Me=R.max.z-R.min.z+1,Ae=fe.convert(q.format),Be=fe.convert(q.type),Ie;if(q.isData3DTexture)C.setTexture3D(q,0),Ie=V.TEXTURE_3D;else if(q.isDataArrayTexture||q.isCompressedArrayTexture)C.setTexture2DArray(q,0),Ie=V.TEXTURE_2D_ARRAY;else{console.warn("THREE.WebGLRenderer.copyTextureToTexture3D: only supports THREE.DataTexture3D and THREE.DataTexture2DArray.");return}V.pixelStorei(V.UNPACK_FLIP_Y_WEBGL,q.flipY),V.pixelStorei(V.UNPACK_PREMULTIPLY_ALPHA_WEBGL,q.premultiplyAlpha),V.pixelStorei(V.UNPACK_ALIGNMENT,q.unpackAlignment);let Ne=V.getParameter(V.UNPACK_ROW_LENGTH),Mt=V.getParameter(V.UNPACK_IMAGE_HEIGHT),an=V.getParameter(V.UNPACK_SKIP_PIXELS),Nt=V.getParameter(V.UNPACK_SKIP_ROWS),$n=V.getParameter(V.UNPACK_SKIP_IMAGES),pt=X.isCompressedTexture?X.mipmaps[G]:X.image;V.pixelStorei(V.UNPACK_ROW_LENGTH,pt.width),V.pixelStorei(V.UNPACK_IMAGE_HEIGHT,pt.height),V.pixelStorei(V.UNPACK_SKIP_PIXELS,R.min.x),V.pixelStorei(V.UNPACK_SKIP_ROWS,R.min.y),V.pixelStorei(V.UNPACK_SKIP_IMAGES,R.min.z),X.isDataTexture||X.isData3DTexture?V.texSubImage3D(Ie,G,z.x,z.y,z.z,he,ge,Me,Ae,Be,pt.data):X.isCompressedArrayTexture?(console.warn("THREE.WebGLRenderer.copyTextureToTexture3D: untested support for compressed srcTexture."),V.compressedTexSubImage3D(Ie,G,z.x,z.y,z.z,he,ge,Me,Ae,pt.data)):V.texSubImage3D(Ie,G,z.x,z.y,z.z,he,ge,Me,Ae,Be,pt),V.pixelStorei(V.UNPACK_ROW_LENGTH,Ne),V.pixelStorei(V.UNPACK_IMAGE_HEIGHT,Mt),V.pixelStorei(V.UNPACK_SKIP_PIXELS,an),V.pixelStorei(V.UNPACK_SKIP_ROWS,Nt),V.pixelStorei(V.UNPACK_SKIP_IMAGES,$n),G===0&&q.generateMipmaps&&V.generateMipmap(Ie),pe.unbindTexture()},this.initTexture=function(R){R.isCubeTexture?C.setTextureCube(R,0):R.isData3DTexture?C.setTexture3D(R,0):R.isDataArrayTexture||R.isCompressedArrayTexture?C.setTexture2DArray(R,0):C.setTexture2D(R,0),pe.unbindTexture()},this.resetState=function(){E=0,w=0,M=null,pe.reset(),Oe.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return ti}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;let t=this.getContext();t.drawingBufferColorSpace=e===Lc?"display-p3":"srgb",t.unpackColorSpace=Qe.workingColorSpace===da?"display-p3":"srgb"}get outputEncoding(){return console.warn("THREE.WebGLRenderer: Property .outputEncoding has been removed. Use .outputColorSpace instead."),this.outputColorSpace===mt?ki:qf}set outputEncoding(e){console.warn("THREE.WebGLRenderer: Property .outputEncoding has been removed. Use .outputColorSpace instead."),this.outputColorSpace=e===ki?mt:ni}get useLegacyLights(){return console.warn("THREE.WebGLRenderer: The property .useLegacyLights has been deprecated. Migrate your lighting according to the following guide: https://discourse.threejs.org/t/updates-to-lighting-in-three-js-r155/53733."),this._useLegacyLights}set useLegacyLights(e){console.warn("THREE.WebGLRenderer: The property .useLegacyLights has been deprecated. Migrate your lighting according to the following guide: https://discourse.threejs.org/t/updates-to-lighting-in-three-js-r155/53733."),this._useLegacyLights=e}},rc=class extends Ts{};rc.prototype.isWebGL1Renderer=!0;var Xi=class extends Et{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){let t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t}};var Br=class extends Mn{constructor(e=null,t=1,i=1,r,s,a,o,l,c=vt,h=vt,u,f){super(null,a,o,l,c,h,r,s,u,f),this.isDataTexture=!0,this.image={data:e,width:t,height:i},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}};var vi=class extends Hn{constructor(e){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new ye(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}},vf=new P,bf=new P,Mf=new et,Il=new Ss,To=new Wi,sc=class extends Et{constructor(e=new Ft,t=new vi){super(),this.isLine=!0,this.type="Line",this.geometry=e,this.material=t,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){let e=this.geometry;if(e.index===null){let t=e.attributes.position,i=[0];for(let r=1,s=t.count;r<s;r++)vf.fromBufferAttribute(t,r-1),bf.fromBufferAttribute(t,r),i[r]=i[r-1],i[r]+=vf.distanceTo(bf);e.setAttribute("lineDistance",new lt(i,1))}else console.warn("THREE.Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}raycast(e,t){let i=this.geometry,r=this.matrixWorld,s=e.params.Line.threshold,a=i.drawRange;if(i.boundingSphere===null&&i.computeBoundingSphere(),To.copy(i.boundingSphere),To.applyMatrix4(r),To.radius+=s,e.ray.intersectsSphere(To)===!1)return;Mf.copy(r).invert(),Il.copy(e.ray).applyMatrix4(Mf);let o=s/((this.scale.x+this.scale.y+this.scale.z)/3),l=o*o,c=new P,h=new P,u=new P,f=new P,d=this.isLineSegments?2:1,p=i.index,g=i.attributes.position;if(p!==null){let m=Math.max(0,a.start),_=Math.min(p.count,a.start+a.count);for(let x=m,v=_-1;x<v;x+=d){let E=p.getX(x),w=p.getX(x+1);if(c.fromBufferAttribute(g,E),h.fromBufferAttribute(g,w),Il.distanceSqToSegment(c,h,f,u)>l)continue;f.applyMatrix4(this.matrixWorld);let T=e.ray.origin.distanceTo(f);T<e.near||T>e.far||t.push({distance:T,point:u.clone().applyMatrix4(this.matrixWorld),index:x,face:null,faceIndex:null,object:this})}}else{let m=Math.max(0,a.start),_=Math.min(g.count,a.start+a.count);for(let x=m,v=_-1;x<v;x+=d){if(c.fromBufferAttribute(g,x),h.fromBufferAttribute(g,x+1),Il.distanceSqToSegment(c,h,f,u)>l)continue;f.applyMatrix4(this.matrixWorld);let w=e.ray.origin.distanceTo(f);w<e.near||w>e.far||t.push({distance:w,point:u.clone().applyMatrix4(this.matrixWorld),index:x,face:null,faceIndex:null,object:this})}}}updateMorphTargets(){let t=this.geometry.morphAttributes,i=Object.keys(t);if(i.length>0){let r=t[i[0]];if(r!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,a=r.length;s<a;s++){let o=r[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=s}}}}},wf=new P,Sf=new P,qi=class extends sc{constructor(e,t){super(e,t),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){let e=this.geometry;if(e.index===null){let t=e.attributes.position,i=[];for(let r=0,s=t.count;r<s;r+=2)wf.fromBufferAttribute(t,r),Sf.fromBufferAttribute(t,r+1),i[r]=r===0?0:i[r-1],i[r+1]=i[r]+wf.distanceTo(Sf);e.setAttribute("lineDistance",new lt(i,1))}else console.warn("THREE.LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}};var Rs=class extends Hn{constructor(e){super(),this.isPointsMaterial=!0,this.type="PointsMaterial",this.color=new ye(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.size=e.size,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}},Ef=new et,oc=new Ss,Ro=new Wi,Co=new P,na=class extends Et{constructor(e=new Ft,t=new Rs){super(),this.isPoints=!0,this.type="Points",this.geometry=e,this.material=t,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}raycast(e,t){let i=this.geometry,r=this.matrixWorld,s=e.params.Points.threshold,a=i.drawRange;if(i.boundingSphere===null&&i.computeBoundingSphere(),Ro.copy(i.boundingSphere),Ro.applyMatrix4(r),Ro.radius+=s,e.ray.intersectsSphere(Ro)===!1)return;Ef.copy(r).invert(),oc.copy(e.ray).applyMatrix4(Ef);let o=s/((this.scale.x+this.scale.y+this.scale.z)/3),l=o*o,c=i.index,u=i.attributes.position;if(c!==null){let f=Math.max(0,a.start),d=Math.min(c.count,a.start+a.count);for(let p=f,y=d;p<y;p++){let g=c.getX(p);Co.fromBufferAttribute(u,g),Af(Co,g,l,r,e,t,this)}}else{let f=Math.max(0,a.start),d=Math.min(u.count,a.start+a.count);for(let p=f,y=d;p<y;p++)Co.fromBufferAttribute(u,p),Af(Co,p,l,r,e,t,this)}}updateMorphTargets(){let t=this.geometry.morphAttributes,i=Object.keys(t);if(i.length>0){let r=t[i[0]];if(r!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,a=r.length;s<a;s++){let o=r[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=s}}}}};function Af(n,e,t,i,r,s,a){let o=oc.distanceSqToPoint(n);if(o<t){let l=new P;oc.closestPointToPoint(n,l),l.applyMatrix4(i);let c=r.ray.origin.distanceTo(l);if(c<r.near||c>r.far)return;s.push({distance:c,distanceToRay:Math.sqrt(o),point:l,index:e,face:null,object:a})}}var Sn=class{constructor(){this.type="Curve",this.arcLengthDivisions=200}getPoint(){return console.warn("THREE.Curve: .getPoint() not implemented."),null}getPointAt(e,t){let i=this.getUtoTmapping(e);return this.getPoint(i,t)}getPoints(e=5){let t=[];for(let i=0;i<=e;i++)t.push(this.getPoint(i/e));return t}getSpacedPoints(e=5){let t=[];for(let i=0;i<=e;i++)t.push(this.getPointAt(i/e));return t}getLength(){let e=this.getLengths();return e[e.length-1]}getLengths(e=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===e+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;let t=[],i,r=this.getPoint(0),s=0;t.push(0);for(let a=1;a<=e;a++)i=this.getPoint(a/e),s+=i.distanceTo(r),t.push(s),r=i;return this.cacheArcLengths=t,t}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(e,t){let i=this.getLengths(),r=0,s=i.length,a;t?a=t:a=e*i[s-1];let o=0,l=s-1,c;for(;o<=l;)if(r=Math.floor(o+(l-o)/2),c=i[r]-a,c<0)o=r+1;else if(c>0)l=r-1;else{l=r;break}if(r=l,i[r]===a)return r/(s-1);let h=i[r],f=i[r+1]-h,d=(a-h)/f;return(r+d)/(s-1)}getTangent(e,t){let r=e-1e-4,s=e+1e-4;r<0&&(r=0),s>1&&(s=1);let a=this.getPoint(r),o=this.getPoint(s),l=t||(a.isVector2?new ce:new P);return l.copy(o).sub(a).normalize(),l}getTangentAt(e,t){let i=this.getUtoTmapping(e);return this.getTangent(i,t)}computeFrenetFrames(e,t){let i=new P,r=[],s=[],a=[],o=new P,l=new et;for(let d=0;d<=e;d++){let p=d/e;r[d]=this.getTangentAt(p,new P)}s[0]=new P,a[0]=new P;let c=Number.MAX_VALUE,h=Math.abs(r[0].x),u=Math.abs(r[0].y),f=Math.abs(r[0].z);h<=c&&(c=h,i.set(1,0,0)),u<=c&&(c=u,i.set(0,1,0)),f<=c&&i.set(0,0,1),o.crossVectors(r[0],i).normalize(),s[0].crossVectors(r[0],o),a[0].crossVectors(r[0],s[0]);for(let d=1;d<=e;d++){if(s[d]=s[d-1].clone(),a[d]=a[d-1].clone(),o.crossVectors(r[d-1],r[d]),o.length()>Number.EPSILON){o.normalize();let p=Math.acos(Ot(r[d-1].dot(r[d]),-1,1));s[d].applyMatrix4(l.makeRotationAxis(o,p))}a[d].crossVectors(r[d],s[d])}if(t===!0){let d=Math.acos(Ot(s[0].dot(s[e]),-1,1));d/=e,r[0].dot(o.crossVectors(s[0],s[e]))>0&&(d=-d);for(let p=1;p<=e;p++)s[p].applyMatrix4(l.makeRotationAxis(r[p],d*p)),a[p].crossVectors(r[p],s[p])}return{tangents:r,normals:s,binormals:a}}clone(){return new this.constructor().copy(this)}copy(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}toJSON(){let e={metadata:{version:4.6,type:"Curve",generator:"Curve.toJSON"}};return e.arcLengthDivisions=this.arcLengthDivisions,e.type=this.type,e}fromJSON(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}},ia=class extends Sn{constructor(e=0,t=0,i=1,r=1,s=0,a=Math.PI*2,o=!1,l=0){super(),this.isEllipseCurve=!0,this.type="EllipseCurve",this.aX=e,this.aY=t,this.xRadius=i,this.yRadius=r,this.aStartAngle=s,this.aEndAngle=a,this.aClockwise=o,this.aRotation=l}getPoint(e,t){let i=t||new ce,r=Math.PI*2,s=this.aEndAngle-this.aStartAngle,a=Math.abs(s)<Number.EPSILON;for(;s<0;)s+=r;for(;s>r;)s-=r;s<Number.EPSILON&&(a?s=0:s=r),this.aClockwise===!0&&!a&&(s===r?s=-r:s=s-r);let o=this.aStartAngle+e*s,l=this.aX+this.xRadius*Math.cos(o),c=this.aY+this.yRadius*Math.sin(o);if(this.aRotation!==0){let h=Math.cos(this.aRotation),u=Math.sin(this.aRotation),f=l-this.aX,d=c-this.aY;l=f*h-d*u+this.aX,c=f*u+d*h+this.aY}return i.set(l,c)}copy(e){return super.copy(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}toJSON(){let e=super.toJSON();return e.aX=this.aX,e.aY=this.aY,e.xRadius=this.xRadius,e.yRadius=this.yRadius,e.aStartAngle=this.aStartAngle,e.aEndAngle=this.aEndAngle,e.aClockwise=this.aClockwise,e.aRotation=this.aRotation,e}fromJSON(e){return super.fromJSON(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}},ac=class extends ia{constructor(e,t,i,r,s,a){super(e,t,i,i,r,s,a),this.isArcCurve=!0,this.type="ArcCurve"}};function Uc(){let n=0,e=0,t=0,i=0;function r(s,a,o,l){n=s,e=o,t=-3*s+3*a-2*o-l,i=2*s-2*a+o+l}return{initCatmullRom:function(s,a,o,l,c){r(a,o,c*(o-s),c*(l-a))},initNonuniformCatmullRom:function(s,a,o,l,c,h,u){let f=(a-s)/c-(o-s)/(c+h)+(o-a)/h,d=(o-a)/h-(l-a)/(h+u)+(l-o)/u;f*=h,d*=h,r(a,o,f,d)},calc:function(s){let a=s*s,o=a*s;return n+e*s+t*a+i*o}}}var Io=new P,Pl=new Uc,Ll=new Uc,Dl=new Uc,Cs=class extends Sn{constructor(e=[],t=!1,i="centripetal",r=.5){super(),this.isCatmullRomCurve3=!0,this.type="CatmullRomCurve3",this.points=e,this.closed=t,this.curveType=i,this.tension=r}getPoint(e,t=new P){let i=t,r=this.points,s=r.length,a=(s-(this.closed?0:1))*e,o=Math.floor(a),l=a-o;this.closed?o+=o>0?0:(Math.floor(Math.abs(o)/s)+1)*s:l===0&&o===s-1&&(o=s-2,l=1);let c,h;this.closed||o>0?c=r[(o-1)%s]:(Io.subVectors(r[0],r[1]).add(r[0]),c=Io);let u=r[o%s],f=r[(o+1)%s];if(this.closed||o+2<s?h=r[(o+2)%s]:(Io.subVectors(r[s-1],r[s-2]).add(r[s-1]),h=Io),this.curveType==="centripetal"||this.curveType==="chordal"){let d=this.curveType==="chordal"?.5:.25,p=Math.pow(c.distanceToSquared(u),d),y=Math.pow(u.distanceToSquared(f),d),g=Math.pow(f.distanceToSquared(h),d);y<1e-4&&(y=1),p<1e-4&&(p=y),g<1e-4&&(g=y),Pl.initNonuniformCatmullRom(c.x,u.x,f.x,h.x,p,y,g),Ll.initNonuniformCatmullRom(c.y,u.y,f.y,h.y,p,y,g),Dl.initNonuniformCatmullRom(c.z,u.z,f.z,h.z,p,y,g)}else this.curveType==="catmullrom"&&(Pl.initCatmullRom(c.x,u.x,f.x,h.x,this.tension),Ll.initCatmullRom(c.y,u.y,f.y,h.y,this.tension),Dl.initCatmullRom(c.z,u.z,f.z,h.z,this.tension));return i.set(Pl.calc(l),Ll.calc(l),Dl.calc(l)),i}copy(e){super.copy(e),this.points=[];for(let t=0,i=e.points.length;t<i;t++){let r=e.points[t];this.points.push(r.clone())}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}toJSON(){let e=super.toJSON();e.points=[];for(let t=0,i=this.points.length;t<i;t++){let r=this.points[t];e.points.push(r.toArray())}return e.closed=this.closed,e.curveType=this.curveType,e.tension=this.tension,e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,i=e.points.length;t<i;t++){let r=e.points[t];this.points.push(new P().fromArray(r))}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}};function Tf(n,e,t,i,r){let s=(i-e)*.5,a=(r-t)*.5,o=n*n,l=n*o;return(2*t-2*i+s+a)*l+(-3*t+3*i-2*s-a)*o+s*n+t}function nv(n,e){let t=1-n;return t*t*e}function iv(n,e){return 2*(1-n)*n*e}function rv(n,e){return n*n*e}function Ms(n,e,t,i){return nv(n,e)+iv(n,t)+rv(n,i)}function sv(n,e){let t=1-n;return t*t*t*e}function ov(n,e){let t=1-n;return 3*t*t*n*e}function av(n,e){return 3*(1-n)*n*n*e}function lv(n,e){return n*n*n*e}function ws(n,e,t,i,r){return sv(n,e)+ov(n,t)+av(n,i)+lv(n,r)}var lc=class extends Sn{constructor(e=new ce,t=new ce,i=new ce,r=new ce){super(),this.isCubicBezierCurve=!0,this.type="CubicBezierCurve",this.v0=e,this.v1=t,this.v2=i,this.v3=r}getPoint(e,t=new ce){let i=t,r=this.v0,s=this.v1,a=this.v2,o=this.v3;return i.set(ws(e,r.x,s.x,a.x,o.x),ws(e,r.y,s.y,a.y,o.y)),i}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}},Is=class extends Sn{constructor(e=new P,t=new P,i=new P,r=new P){super(),this.isCubicBezierCurve3=!0,this.type="CubicBezierCurve3",this.v0=e,this.v1=t,this.v2=i,this.v3=r}getPoint(e,t=new P){let i=t,r=this.v0,s=this.v1,a=this.v2,o=this.v3;return i.set(ws(e,r.x,s.x,a.x,o.x),ws(e,r.y,s.y,a.y,o.y),ws(e,r.z,s.z,a.z,o.z)),i}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}},cc=class extends Sn{constructor(e=new ce,t=new ce){super(),this.isLineCurve=!0,this.type="LineCurve",this.v1=e,this.v2=t}getPoint(e,t=new ce){let i=t;return e===1?i.copy(this.v2):(i.copy(this.v2).sub(this.v1),i.multiplyScalar(e).add(this.v1)),i}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new ce){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},hc=class extends Sn{constructor(e=new P,t=new P){super(),this.isLineCurve3=!0,this.type="LineCurve3",this.v1=e,this.v2=t}getPoint(e,t=new P){let i=t;return e===1?i.copy(this.v2):(i.copy(this.v2).sub(this.v1),i.multiplyScalar(e).add(this.v1)),i}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new P){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},uc=class extends Sn{constructor(e=new ce,t=new ce,i=new ce){super(),this.isQuadraticBezierCurve=!0,this.type="QuadraticBezierCurve",this.v0=e,this.v1=t,this.v2=i}getPoint(e,t=new ce){let i=t,r=this.v0,s=this.v1,a=this.v2;return i.set(Ms(e,r.x,s.x,a.x),Ms(e,r.y,s.y,a.y)),i}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},fc=class extends Sn{constructor(e=new P,t=new P,i=new P){super(),this.isQuadraticBezierCurve3=!0,this.type="QuadraticBezierCurve3",this.v0=e,this.v1=t,this.v2=i}getPoint(e,t=new P){let i=t,r=this.v0,s=this.v1,a=this.v2;return i.set(Ms(e,r.x,s.x,a.x),Ms(e,r.y,s.y,a.y),Ms(e,r.z,s.z,a.z)),i}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},dc=class extends Sn{constructor(e=[]){super(),this.isSplineCurve=!0,this.type="SplineCurve",this.points=e}getPoint(e,t=new ce){let i=t,r=this.points,s=(r.length-1)*e,a=Math.floor(s),o=s-a,l=r[a===0?a:a-1],c=r[a],h=r[a>r.length-2?r.length-1:a+1],u=r[a>r.length-3?r.length-1:a+2];return i.set(Tf(o,l.x,c.x,h.x,u.x),Tf(o,l.y,c.y,h.y,u.y)),i}copy(e){super.copy(e),this.points=[];for(let t=0,i=e.points.length;t<i;t++){let r=e.points[t];this.points.push(r.clone())}return this}toJSON(){let e=super.toJSON();e.points=[];for(let t=0,i=this.points.length;t<i;t++){let r=this.points[t];e.points.push(r.toArray())}return e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,i=e.points.length;t<i;t++){let r=e.points[t];this.points.push(new ce().fromArray(r))}return this}},Rf=Object.freeze({__proto__:null,ArcCurve:ac,CatmullRomCurve3:Cs,CubicBezierCurve:lc,CubicBezierCurve3:Is,EllipseCurve:ia,LineCurve:cc,LineCurve3:hc,QuadraticBezierCurve:uc,QuadraticBezierCurve3:fc,SplineCurve:dc}),ra=class extends Sn{constructor(){super(),this.type="CurvePath",this.curves=[],this.autoClose=!1}add(e){this.curves.push(e)}closePath(){let e=this.curves[0].getPoint(0),t=this.curves[this.curves.length-1].getPoint(1);if(!e.equals(t)){let i=e.isVector2===!0?"LineCurve":"LineCurve3";this.curves.push(new Rf[i](t,e))}return this}getPoint(e,t){let i=e*this.getLength(),r=this.getCurveLengths(),s=0;for(;s<r.length;){if(r[s]>=i){let a=r[s]-i,o=this.curves[s],l=o.getLength(),c=l===0?0:1-a/l;return o.getPointAt(c,t)}s++}return null}getLength(){let e=this.getCurveLengths();return e[e.length-1]}updateArcLengths(){this.needsUpdate=!0,this.cacheLengths=null,this.getCurveLengths()}getCurveLengths(){if(this.cacheLengths&&this.cacheLengths.length===this.curves.length)return this.cacheLengths;let e=[],t=0;for(let i=0,r=this.curves.length;i<r;i++)t+=this.curves[i].getLength(),e.push(t);return this.cacheLengths=e,e}getSpacedPoints(e=40){let t=[];for(let i=0;i<=e;i++)t.push(this.getPoint(i/e));return this.autoClose&&t.push(t[0]),t}getPoints(e=12){let t=[],i;for(let r=0,s=this.curves;r<s.length;r++){let a=s[r],o=a.isEllipseCurve?e*2:a.isLineCurve||a.isLineCurve3?1:a.isSplineCurve?e*a.points.length:e,l=a.getPoints(o);for(let c=0;c<l.length;c++){let h=l[c];i&&i.equals(h)||(t.push(h),i=h)}}return this.autoClose&&t.length>1&&!t[t.length-1].equals(t[0])&&t.push(t[0]),t}copy(e){super.copy(e),this.curves=[];for(let t=0,i=e.curves.length;t<i;t++){let r=e.curves[t];this.curves.push(r.clone())}return this.autoClose=e.autoClose,this}toJSON(){let e=super.toJSON();e.autoClose=this.autoClose,e.curves=[];for(let t=0,i=this.curves.length;t<i;t++){let r=this.curves[t];e.curves.push(r.toJSON())}return e}fromJSON(e){super.fromJSON(e),this.autoClose=e.autoClose,this.curves=[];for(let t=0,i=e.curves.length;t<i;t++){let r=e.curves[t];this.curves.push(new Rf[r.type]().fromJSON(r))}return this}};var Po=new P,Lo=new P,Nl=new P,Do=new Fi,sa=class extends Ft{constructor(e=null,t=1){if(super(),this.type="EdgesGeometry",this.parameters={geometry:e,thresholdAngle:t},e!==null){let r=Math.pow(10,4),s=Math.cos(Ir*t),a=e.getIndex(),o=e.getAttribute("position"),l=a?a.count:o.count,c=[0,0,0],h=["a","b","c"],u=new Array(3),f={},d=[];for(let p=0;p<l;p+=3){a?(c[0]=a.getX(p),c[1]=a.getX(p+1),c[2]=a.getX(p+2)):(c[0]=p,c[1]=p+1,c[2]=p+2);let{a:y,b:g,c:m}=Do;if(y.fromBufferAttribute(o,c[0]),g.fromBufferAttribute(o,c[1]),m.fromBufferAttribute(o,c[2]),Do.getNormal(Nl),u[0]=`${Math.round(y.x*r)},${Math.round(y.y*r)},${Math.round(y.z*r)}`,u[1]=`${Math.round(g.x*r)},${Math.round(g.y*r)},${Math.round(g.z*r)}`,u[2]=`${Math.round(m.x*r)},${Math.round(m.y*r)},${Math.round(m.z*r)}`,!(u[0]===u[1]||u[1]===u[2]||u[2]===u[0]))for(let _=0;_<3;_++){let x=(_+1)%3,v=u[_],E=u[x],w=Do[h[_]],M=Do[h[x]],T=`${v}_${E}`,b=`${E}_${v}`;b in f&&f[b]?(Nl.dot(f[b].normal)<=s&&(d.push(w.x,w.y,w.z),d.push(M.x,M.y,M.z)),f[b]=null):T in f||(f[T]={index0:c[_],index1:c[x],normal:Nl.clone()})}}for(let p in f)if(f[p]){let{index0:y,index1:g}=f[p];Po.fromBufferAttribute(o,y),Lo.fromBufferAttribute(o,g),d.push(Po.x,Po.y,Po.z),d.push(Lo.x,Lo.y,Lo.z)}this.setAttribute("position",new lt(d,3))}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}};var cv={triangulate:function(n,e,t=2){let i=e&&e.length,r=i?e[0]*t:n.length,s=id(n,0,r,t,!0),a=[];if(!s||s.next===s.prev)return a;let o,l,c,h,u,f,d;if(i&&(s=pv(n,e,s,t)),n.length>80*t){o=c=n[0],l=h=n[1];for(let p=t;p<r;p+=t)u=n[p],f=n[p+1],u<o&&(o=u),f<l&&(l=f),u>c&&(c=u),f>h&&(h=f);d=Math.max(c-o,h-l),d=d!==0?32767/d:0}return Ps(s,a,t,o,l,d,0),a}};function id(n,e,t,i,r){let s,a;if(r===Ev(n,e,t,i)>0)for(s=e;s<t;s+=i)a=Cf(s,n[s],n[s+1],a);else for(s=t-i;s>=e;s-=i)a=Cf(s,n[s],n[s+1],a);return a&&ga(a,a.next)&&(Ds(a),a=a.next),a}function Yi(n,e){if(!n)return n;e||(e=n);let t=n,i;do if(i=!1,!t.steiner&&(ga(t,t.next)||gt(t.prev,t,t.next)===0)){if(Ds(t),t=e=t.prev,t===t.next)break;i=!0}else t=t.next;while(i||t!==e);return e}function Ps(n,e,t,i,r,s,a){if(!n)return;!a&&s&&_v(n,i,r,s);let o=n,l,c;for(;n.prev!==n.next;){if(l=n.prev,c=n.next,s?uv(n,i,r,s):hv(n)){e.push(l.i/t|0),e.push(n.i/t|0),e.push(c.i/t|0),Ds(n),n=c.next,o=c.next;continue}if(n=c,n===o){a?a===1?(n=fv(Yi(n),e,t),Ps(n,e,t,i,r,s,2)):a===2&&dv(n,e,t,i,r,s):Ps(Yi(n),e,t,i,r,s,1);break}}}function hv(n){let e=n.prev,t=n,i=n.next;if(gt(e,t,i)>=0)return!1;let r=e.x,s=t.x,a=i.x,o=e.y,l=t.y,c=i.y,h=r<s?r<a?r:a:s<a?s:a,u=o<l?o<c?o:c:l<c?l:c,f=r>s?r>a?r:a:s>a?s:a,d=o>l?o>c?o:c:l>c?l:c,p=i.next;for(;p!==e;){if(p.x>=h&&p.x<=f&&p.y>=u&&p.y<=d&&Rr(r,o,s,l,a,c,p.x,p.y)&&gt(p.prev,p,p.next)>=0)return!1;p=p.next}return!0}function uv(n,e,t,i){let r=n.prev,s=n,a=n.next;if(gt(r,s,a)>=0)return!1;let o=r.x,l=s.x,c=a.x,h=r.y,u=s.y,f=a.y,d=o<l?o<c?o:c:l<c?l:c,p=h<u?h<f?h:f:u<f?u:f,y=o>l?o>c?o:c:l>c?l:c,g=h>u?h>f?h:f:u>f?u:f,m=pc(d,p,e,t,i),_=pc(y,g,e,t,i),x=n.prevZ,v=n.nextZ;for(;x&&x.z>=m&&v&&v.z<=_;){if(x.x>=d&&x.x<=y&&x.y>=p&&x.y<=g&&x!==r&&x!==a&&Rr(o,h,l,u,c,f,x.x,x.y)&&gt(x.prev,x,x.next)>=0||(x=x.prevZ,v.x>=d&&v.x<=y&&v.y>=p&&v.y<=g&&v!==r&&v!==a&&Rr(o,h,l,u,c,f,v.x,v.y)&&gt(v.prev,v,v.next)>=0))return!1;v=v.nextZ}for(;x&&x.z>=m;){if(x.x>=d&&x.x<=y&&x.y>=p&&x.y<=g&&x!==r&&x!==a&&Rr(o,h,l,u,c,f,x.x,x.y)&&gt(x.prev,x,x.next)>=0)return!1;x=x.prevZ}for(;v&&v.z<=_;){if(v.x>=d&&v.x<=y&&v.y>=p&&v.y<=g&&v!==r&&v!==a&&Rr(o,h,l,u,c,f,v.x,v.y)&&gt(v.prev,v,v.next)>=0)return!1;v=v.nextZ}return!0}function fv(n,e,t){let i=n;do{let r=i.prev,s=i.next.next;!ga(r,s)&&rd(r,i,i.next,s)&&Ls(r,s)&&Ls(s,r)&&(e.push(r.i/t|0),e.push(i.i/t|0),e.push(s.i/t|0),Ds(i),Ds(i.next),i=n=s),i=i.next}while(i!==n);return Yi(i)}function dv(n,e,t,i,r,s){let a=n;do{let o=a.next.next;for(;o!==a.prev;){if(a.i!==o.i&&Mv(a,o)){let l=sd(a,o);a=Yi(a,a.next),l=Yi(l,l.next),Ps(a,e,t,i,r,s,0),Ps(l,e,t,i,r,s,0);return}o=o.next}a=a.next}while(a!==n)}function pv(n,e,t,i){let r=[],s,a,o,l,c;for(s=0,a=e.length;s<a;s++)o=e[s]*i,l=s<a-1?e[s+1]*i:n.length,c=id(n,o,l,i,!1),c===c.next&&(c.steiner=!0),r.push(bv(c));for(r.sort(mv),s=0;s<r.length;s++)t=gv(r[s],t);return t}function mv(n,e){return n.x-e.x}function gv(n,e){let t=yv(n,e);if(!t)return e;let i=sd(t,n);return Yi(i,i.next),Yi(t,t.next)}function yv(n,e){let t=e,i=-1/0,r,s=n.x,a=n.y;do{if(a<=t.y&&a>=t.next.y&&t.next.y!==t.y){let f=t.x+(a-t.y)*(t.next.x-t.x)/(t.next.y-t.y);if(f<=s&&f>i&&(i=f,r=t.x<t.next.x?t:t.next,f===s))return r}t=t.next}while(t!==e);if(!r)return null;let o=r,l=r.x,c=r.y,h=1/0,u;t=r;do s>=t.x&&t.x>=l&&s!==t.x&&Rr(a<c?s:i,a,l,c,a<c?i:s,a,t.x,t.y)&&(u=Math.abs(a-t.y)/(s-t.x),Ls(t,n)&&(u<h||u===h&&(t.x>r.x||t.x===r.x&&xv(r,t)))&&(r=t,h=u)),t=t.next;while(t!==o);return r}function xv(n,e){return gt(n.prev,n,e.prev)<0&&gt(e.next,n,n.next)<0}function _v(n,e,t,i){let r=n;do r.z===0&&(r.z=pc(r.x,r.y,e,t,i)),r.prevZ=r.prev,r.nextZ=r.next,r=r.next;while(r!==n);r.prevZ.nextZ=null,r.prevZ=null,vv(r)}function vv(n){let e,t,i,r,s,a,o,l,c=1;do{for(t=n,n=null,s=null,a=0;t;){for(a++,i=t,o=0,e=0;e<c&&(o++,i=i.nextZ,!!i);e++);for(l=c;o>0||l>0&&i;)o!==0&&(l===0||!i||t.z<=i.z)?(r=t,t=t.nextZ,o--):(r=i,i=i.nextZ,l--),s?s.nextZ=r:n=r,r.prevZ=s,s=r;t=i}s.nextZ=null,c*=2}while(a>1);return n}function pc(n,e,t,i,r){return n=(n-t)*r|0,e=(e-i)*r|0,n=(n|n<<8)&16711935,n=(n|n<<4)&252645135,n=(n|n<<2)&858993459,n=(n|n<<1)&1431655765,e=(e|e<<8)&16711935,e=(e|e<<4)&252645135,e=(e|e<<2)&858993459,e=(e|e<<1)&1431655765,n|e<<1}function bv(n){let e=n,t=n;do(e.x<t.x||e.x===t.x&&e.y<t.y)&&(t=e),e=e.next;while(e!==n);return t}function Rr(n,e,t,i,r,s,a,o){return(r-a)*(e-o)>=(n-a)*(s-o)&&(n-a)*(i-o)>=(t-a)*(e-o)&&(t-a)*(s-o)>=(r-a)*(i-o)}function Mv(n,e){return n.next.i!==e.i&&n.prev.i!==e.i&&!wv(n,e)&&(Ls(n,e)&&Ls(e,n)&&Sv(n,e)&&(gt(n.prev,n,e.prev)||gt(n,e.prev,e))||ga(n,e)&&gt(n.prev,n,n.next)>0&&gt(e.prev,e,e.next)>0)}function gt(n,e,t){return(e.y-n.y)*(t.x-e.x)-(e.x-n.x)*(t.y-e.y)}function ga(n,e){return n.x===e.x&&n.y===e.y}function rd(n,e,t,i){let r=Uo(gt(n,e,t)),s=Uo(gt(n,e,i)),a=Uo(gt(t,i,n)),o=Uo(gt(t,i,e));return!!(r!==s&&a!==o||r===0&&No(n,t,e)||s===0&&No(n,i,e)||a===0&&No(t,n,i)||o===0&&No(t,e,i))}function No(n,e,t){return e.x<=Math.max(n.x,t.x)&&e.x>=Math.min(n.x,t.x)&&e.y<=Math.max(n.y,t.y)&&e.y>=Math.min(n.y,t.y)}function Uo(n){return n>0?1:n<0?-1:0}function wv(n,e){let t=n;do{if(t.i!==n.i&&t.next.i!==n.i&&t.i!==e.i&&t.next.i!==e.i&&rd(t,t.next,n,e))return!0;t=t.next}while(t!==n);return!1}function Ls(n,e){return gt(n.prev,n,n.next)<0?gt(n,e,n.next)>=0&&gt(n,n.prev,e)>=0:gt(n,e,n.prev)<0||gt(n,n.next,e)<0}function Sv(n,e){let t=n,i=!1,r=(n.x+e.x)/2,s=(n.y+e.y)/2;do t.y>s!=t.next.y>s&&t.next.y!==t.y&&r<(t.next.x-t.x)*(s-t.y)/(t.next.y-t.y)+t.x&&(i=!i),t=t.next;while(t!==n);return i}function sd(n,e){let t=new mc(n.i,n.x,n.y),i=new mc(e.i,e.x,e.y),r=n.next,s=e.prev;return n.next=e,e.prev=n,t.next=r,r.prev=t,i.next=t,t.prev=i,s.next=i,i.prev=s,i}function Cf(n,e,t,i){let r=new mc(n,e,t);return i?(r.next=i.next,r.prev=i,i.next.prev=r,i.next=r):(r.prev=r,r.next=r),r}function Ds(n){n.next.prev=n.prev,n.prev.next=n.next,n.prevZ&&(n.prevZ.nextZ=n.nextZ),n.nextZ&&(n.nextZ.prevZ=n.prevZ)}function mc(n,e,t){this.i=n,this.x=e,this.y=t,this.prev=null,this.next=null,this.z=0,this.prevZ=null,this.nextZ=null,this.steiner=!1}function Ev(n,e,t,i){let r=0;for(let s=e,a=t-i;s<t;s+=i)r+=(n[a]-n[s])*(n[s+1]+n[a+1]),a=s;return r}var oa=class n{static area(e){let t=e.length,i=0;for(let r=t-1,s=0;s<t;r=s++)i+=e[r].x*e[s].y-e[s].x*e[r].y;return i*.5}static isClockWise(e){return n.area(e)<0}static triangulateShape(e,t){let i=[],r=[],s=[];If(e),Pf(i,e);let a=e.length;t.forEach(If);for(let l=0;l<t.length;l++)r.push(a),a+=t[l].length,Pf(i,t[l]);let o=cv.triangulate(i,r);for(let l=0;l<o.length;l+=3)s.push(o.slice(l,l+3));return s}};function If(n){let e=n.length;e>2&&n[e-1].equals(n[0])&&n.pop()}function Pf(n,e){for(let t=0;t<e.length;t++)n.push(e[t].x),n.push(e[t].y)}var aa=class extends Ft{constructor(e=null){if(super(),this.type="WireframeGeometry",this.parameters={geometry:e},e!==null){let t=[],i=new Set,r=new P,s=new P;if(e.index!==null){let a=e.attributes.position,o=e.index,l=e.groups;l.length===0&&(l=[{start:0,count:o.count,materialIndex:0}]);for(let c=0,h=l.length;c<h;++c){let u=l[c],f=u.start,d=u.count;for(let p=f,y=f+d;p<y;p+=3)for(let g=0;g<3;g++){let m=o.getX(p+g),_=o.getX(p+(g+1)%3);r.fromBufferAttribute(a,m),s.fromBufferAttribute(a,_),Lf(r,s,i)===!0&&(t.push(r.x,r.y,r.z),t.push(s.x,s.y,s.z))}}}else{let a=e.attributes.position;for(let o=0,l=a.count/3;o<l;o++)for(let c=0;c<3;c++){let h=3*o+c,u=3*o+(c+1)%3;r.fromBufferAttribute(a,h),s.fromBufferAttribute(a,u),Lf(r,s,i)===!0&&(t.push(r.x,r.y,r.z),t.push(s.x,s.y,s.z))}}this.setAttribute("position",new lt(t,3))}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}};function Lf(n,e,t){let i=`${n.x},${n.y},${n.z}-${e.x},${e.y},${e.z}`,r=`${e.x},${e.y},${e.z}-${n.x},${n.y},${n.z}`;return t.has(i)===!0||t.has(r)===!0?!1:(t.add(i),t.add(r),!0)}var pn=class extends Hn{constructor(e){super(),this.isMeshStandardMaterial=!0,this.defines={STANDARD:""},this.type="MeshStandardMaterial",this.color=new ye(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new ye(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Pc,this.normalScale=new ce(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:""},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}},la=class extends pn{constructor(e){super(),this.isMeshPhysicalMaterial=!0,this.defines={STANDARD:"",PHYSICAL:""},this.type="MeshPhysicalMaterial",this.anisotropyRotation=0,this.anisotropyMap=null,this.clearcoatMap=null,this.clearcoatRoughness=0,this.clearcoatRoughnessMap=null,this.clearcoatNormalScale=new ce(1,1),this.clearcoatNormalMap=null,this.ior=1.5,Object.defineProperty(this,"reflectivity",{get:function(){return Ot(2.5*(this.ior-1)/(this.ior+1),0,1)},set:function(t){this.ior=(1+.4*t)/(1-.4*t)}}),this.iridescenceMap=null,this.iridescenceIOR=1.3,this.iridescenceThicknessRange=[100,400],this.iridescenceThicknessMap=null,this.sheenColor=new ye(0),this.sheenColorMap=null,this.sheenRoughness=1,this.sheenRoughnessMap=null,this.transmissionMap=null,this.thickness=0,this.thicknessMap=null,this.attenuationDistance=1/0,this.attenuationColor=new ye(1,1,1),this.specularIntensity=1,this.specularIntensityMap=null,this.specularColor=new ye(1,1,1),this.specularColorMap=null,this._anisotropy=0,this._clearcoat=0,this._iridescence=0,this._sheen=0,this._transmission=0,this.setValues(e)}get anisotropy(){return this._anisotropy}set anisotropy(e){this._anisotropy>0!=e>0&&this.version++,this._anisotropy=e}get clearcoat(){return this._clearcoat}set clearcoat(e){this._clearcoat>0!=e>0&&this.version++,this._clearcoat=e}get iridescence(){return this._iridescence}set iridescence(e){this._iridescence>0!=e>0&&this.version++,this._iridescence=e}get sheen(){return this._sheen}set sheen(e){this._sheen>0!=e>0&&this.version++,this._sheen=e}get transmission(){return this._transmission}set transmission(e){this._transmission>0!=e>0&&this.version++,this._transmission=e}copy(e){return super.copy(e),this.defines={STANDARD:"",PHYSICAL:""},this.anisotropy=e.anisotropy,this.anisotropyRotation=e.anisotropyRotation,this.anisotropyMap=e.anisotropyMap,this.clearcoat=e.clearcoat,this.clearcoatMap=e.clearcoatMap,this.clearcoatRoughness=e.clearcoatRoughness,this.clearcoatRoughnessMap=e.clearcoatRoughnessMap,this.clearcoatNormalMap=e.clearcoatNormalMap,this.clearcoatNormalScale.copy(e.clearcoatNormalScale),this.ior=e.ior,this.iridescence=e.iridescence,this.iridescenceMap=e.iridescenceMap,this.iridescenceIOR=e.iridescenceIOR,this.iridescenceThicknessRange=[...e.iridescenceThicknessRange],this.iridescenceThicknessMap=e.iridescenceThicknessMap,this.sheen=e.sheen,this.sheenColor.copy(e.sheenColor),this.sheenColorMap=e.sheenColorMap,this.sheenRoughness=e.sheenRoughness,this.sheenRoughnessMap=e.sheenRoughnessMap,this.transmission=e.transmission,this.transmissionMap=e.transmissionMap,this.thickness=e.thickness,this.thicknessMap=e.thicknessMap,this.attenuationDistance=e.attenuationDistance,this.attenuationColor.copy(e.attenuationColor),this.specularIntensity=e.specularIntensity,this.specularIntensityMap=e.specularIntensityMap,this.specularColor.copy(e.specularColor),this.specularColorMap=e.specularColorMap,this}};var ca=class extends Hn{constructor(e){super(),this.isMeshNormalMaterial=!0,this.type="MeshNormalMaterial",this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Pc,this.normalScale=new ce(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.flatShading=!1,this.setValues(e)}copy(e){return super.copy(e),this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.flatShading=e.flatShading,this}};function Oo(n,e,t){return!n||!t&&n.constructor===e?n:typeof e.BYTES_PER_ELEMENT=="number"?new e(n):Array.prototype.slice.call(n)}function Av(n){return ArrayBuffer.isView(n)&&!(n instanceof DataView)}var kr=class{constructor(e,t,i,r){this.parameterPositions=e,this._cachedIndex=0,this.resultBuffer=r!==void 0?r:new t.constructor(i),this.sampleValues=t,this.valueSize=i,this.settings=null,this.DefaultSettings_={}}evaluate(e){let t=this.parameterPositions,i=this._cachedIndex,r=t[i],s=t[i-1];e:{t:{let a;n:{i:if(!(e<r)){for(let o=i+2;;){if(r===void 0){if(e<s)break i;return i=t.length,this._cachedIndex=i,this.copySampleValue_(i-1)}if(i===o)break;if(s=r,r=t[++i],e<r)break t}a=t.length;break n}if(!(e>=s)){let o=t[1];e<o&&(i=2,s=o);for(let l=i-2;;){if(s===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(i===l)break;if(r=s,s=t[--i-1],e>=s)break t}a=i,i=0;break n}break e}for(;i<a;){let o=i+a>>>1;e<t[o]?a=o:i=o+1}if(r=t[i],s=t[i-1],s===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(r===void 0)return i=t.length,this._cachedIndex=i,this.copySampleValue_(i-1)}this._cachedIndex=i,this.intervalChanged_(i,s,r)}return this.interpolate_(i,s,e,r)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(e){let t=this.resultBuffer,i=this.sampleValues,r=this.valueSize,s=e*r;for(let a=0;a!==r;++a)t[a]=i[s+a];return t}interpolate_(){throw new Error("call to abstract method")}intervalChanged_(){}},gc=class extends kr{constructor(e,t,i,r){super(e,t,i,r),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:Cu,endingEnd:Cu}}intervalChanged_(e,t,i){let r=this.parameterPositions,s=e-2,a=e+1,o=r[s],l=r[a];if(o===void 0)switch(this.getSettings_().endingStart){case Iu:s=e,o=2*t-i;break;case Pu:s=r.length-2,o=t+r[s]-r[s+1];break;default:s=e,o=i}if(l===void 0)switch(this.getSettings_().endingEnd){case Iu:a=e,l=2*i-t;break;case Pu:a=1,l=i+r[1]-r[0];break;default:a=e-1,l=t}let c=(i-t)*.5,h=this.valueSize;this._weightPrev=c/(t-o),this._weightNext=c/(l-i),this._offsetPrev=s*h,this._offsetNext=a*h}interpolate_(e,t,i,r){let s=this.resultBuffer,a=this.sampleValues,o=this.valueSize,l=e*o,c=l-o,h=this._offsetPrev,u=this._offsetNext,f=this._weightPrev,d=this._weightNext,p=(i-t)/(r-t),y=p*p,g=y*p,m=-f*g+2*f*y-f*p,_=(1+f)*g+(-1.5-2*f)*y+(-.5+f)*p+1,x=(-1-d)*g+(1.5+d)*y+.5*p,v=d*g-d*y;for(let E=0;E!==o;++E)s[E]=m*a[h+E]+_*a[c+E]+x*a[l+E]+v*a[u+E];return s}},yc=class extends kr{constructor(e,t,i,r){super(e,t,i,r)}interpolate_(e,t,i,r){let s=this.resultBuffer,a=this.sampleValues,o=this.valueSize,l=e*o,c=l-o,h=(i-t)/(r-t),u=1-h;for(let f=0;f!==o;++f)s[f]=a[c+f]*u+a[l+f]*h;return s}},xc=class extends kr{constructor(e,t,i,r){super(e,t,i,r)}interpolate_(e){return this.copySampleValue_(e-1)}},Ln=class{constructor(e,t,i,r){if(e===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(t===void 0||t.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+e);this.name=e,this.times=Oo(t,this.TimeBufferType),this.values=Oo(i,this.ValueBufferType),this.setInterpolation(r||this.DefaultInterpolation)}static toJSON(e){let t=e.constructor,i;if(t.toJSON!==this.toJSON)i=t.toJSON(e);else{i={name:e.name,times:Oo(e.times,Array),values:Oo(e.values,Array)};let r=e.getInterpolation();r!==e.DefaultInterpolation&&(i.interpolation=r)}return i.type=e.ValueTypeName,i}InterpolantFactoryMethodDiscrete(e){return new xc(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodLinear(e){return new yc(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodSmooth(e){return new gc(this.times,this.values,this.getValueSize(),e)}setInterpolation(e){let t;switch(e){case zo:t=this.InterpolantFactoryMethodDiscrete;break;case Bo:t=this.InterpolantFactoryMethodLinear;break;case al:t=this.InterpolantFactoryMethodSmooth;break}if(t===void 0){let i="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(e!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(i);return console.warn("THREE.KeyframeTrack:",i),this}return this.createInterpolant=t,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return zo;case this.InterpolantFactoryMethodLinear:return Bo;case this.InterpolantFactoryMethodSmooth:return al}}getValueSize(){return this.values.length/this.times.length}shift(e){if(e!==0){let t=this.times;for(let i=0,r=t.length;i!==r;++i)t[i]+=e}return this}scale(e){if(e!==1){let t=this.times;for(let i=0,r=t.length;i!==r;++i)t[i]*=e}return this}trim(e,t){let i=this.times,r=i.length,s=0,a=r-1;for(;s!==r&&i[s]<e;)++s;for(;a!==-1&&i[a]>t;)--a;if(++a,s!==0||a!==r){s>=a&&(a=Math.max(a,1),s=a-1);let o=this.getValueSize();this.times=i.slice(s,a),this.values=this.values.slice(s*o,a*o)}return this}validate(){let e=!0,t=this.getValueSize();t-Math.floor(t)!==0&&(console.error("THREE.KeyframeTrack: Invalid value size in track.",this),e=!1);let i=this.times,r=this.values,s=i.length;s===0&&(console.error("THREE.KeyframeTrack: Track is empty.",this),e=!1);let a=null;for(let o=0;o!==s;o++){let l=i[o];if(typeof l=="number"&&isNaN(l)){console.error("THREE.KeyframeTrack: Time is not a valid number.",this,o,l),e=!1;break}if(a!==null&&a>l){console.error("THREE.KeyframeTrack: Out of order keys.",this,o,l,a),e=!1;break}a=l}if(r!==void 0&&Av(r))for(let o=0,l=r.length;o!==l;++o){let c=r[o];if(isNaN(c)){console.error("THREE.KeyframeTrack: Value is not a valid number.",this,o,c),e=!1;break}}return e}optimize(){let e=this.times.slice(),t=this.values.slice(),i=this.getValueSize(),r=this.getInterpolation()===al,s=e.length-1,a=1;for(let o=1;o<s;++o){let l=!1,c=e[o],h=e[o+1];if(c!==h&&(o!==1||c!==e[0]))if(r)l=!0;else{let u=o*i,f=u-i,d=u+i;for(let p=0;p!==i;++p){let y=t[u+p];if(y!==t[f+p]||y!==t[d+p]){l=!0;break}}}if(l){if(o!==a){e[a]=e[o];let u=o*i,f=a*i;for(let d=0;d!==i;++d)t[f+d]=t[u+d]}++a}}if(s>0){e[a]=e[s];for(let o=s*i,l=a*i,c=0;c!==i;++c)t[l+c]=t[o+c];++a}return a!==e.length?(this.times=e.slice(0,a),this.values=t.slice(0,a*i)):(this.times=e,this.values=t),this}clone(){let e=this.times.slice(),t=this.values.slice(),i=this.constructor,r=new i(this.name,e,t);return r.createInterpolant=this.createInterpolant,r}};Ln.prototype.TimeBufferType=Float32Array;Ln.prototype.ValueBufferType=Float32Array;Ln.prototype.DefaultInterpolation=Bo;var $i=class extends Ln{};$i.prototype.ValueTypeName="bool";$i.prototype.ValueBufferType=Array;$i.prototype.DefaultInterpolation=zo;$i.prototype.InterpolantFactoryMethodLinear=void 0;$i.prototype.InterpolantFactoryMethodSmooth=void 0;var _c=class extends Ln{};_c.prototype.ValueTypeName="color";var vc=class extends Ln{};vc.prototype.ValueTypeName="number";var bc=class extends kr{constructor(e,t,i,r){super(e,t,i,r)}interpolate_(e,t,i,r){let s=this.resultBuffer,a=this.sampleValues,o=this.valueSize,l=(i-t)/(r-t),c=e*o;for(let h=c+o;c!==h;c+=4)xi.slerpFlat(s,0,a,c-o,a,c,l);return s}},Ns=class extends Ln{InterpolantFactoryMethodLinear(e){return new bc(this.times,this.values,this.getValueSize(),e)}};Ns.prototype.ValueTypeName="quaternion";Ns.prototype.DefaultInterpolation=Bo;Ns.prototype.InterpolantFactoryMethodSmooth=void 0;var ji=class extends Ln{};ji.prototype.ValueTypeName="string";ji.prototype.ValueBufferType=Array;ji.prototype.DefaultInterpolation=zo;ji.prototype.InterpolantFactoryMethodLinear=void 0;ji.prototype.InterpolantFactoryMethodSmooth=void 0;var Mc=class extends Ln{};Mc.prototype.ValueTypeName="vector";var wc=class{constructor(e,t,i){let r=this,s=!1,a=0,o=0,l,c=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=i,this.itemStart=function(h){o++,s===!1&&r.onStart!==void 0&&r.onStart(h,a,o),s=!0},this.itemEnd=function(h){a++,r.onProgress!==void 0&&r.onProgress(h,a,o),a===o&&(s=!1,r.onLoad!==void 0&&r.onLoad())},this.itemError=function(h){r.onError!==void 0&&r.onError(h)},this.resolveURL=function(h){return l?l(h):h},this.setURLModifier=function(h){return l=h,this},this.addHandler=function(h,u){return c.push(h,u),this},this.removeHandler=function(h){let u=c.indexOf(h);return u!==-1&&c.splice(u,2),this},this.getHandler=function(h){for(let u=0,f=c.length;u<f;u+=2){let d=c[u],p=c[u+1];if(d.global&&(d.lastIndex=0),d.test(h))return p}return null}}},Tv=new wc,Sc=class{constructor(e){this.manager=e!==void 0?e:Tv,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={}}load(){}loadAsync(e,t){let i=this;return new Promise(function(r,s){i.load(e,r,t,s)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}};Sc.DEFAULT_MATERIAL_NAME="__DEFAULT";var Hr=class extends Et{constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new ye(e),this.intensity=t}dispose(){}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){let t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,this.groundColor!==void 0&&(t.object.groundColor=this.groundColor.getHex()),this.distance!==void 0&&(t.object.distance=this.distance),this.angle!==void 0&&(t.object.angle=this.angle),this.decay!==void 0&&(t.object.decay=this.decay),this.penumbra!==void 0&&(t.object.penumbra=this.penumbra),this.shadow!==void 0&&(t.object.shadow=this.shadow.toJSON()),t}},Vr=class extends Hr{constructor(e,t,i){super(e,i),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(Et.DEFAULT_UP),this.updateMatrix(),this.groundColor=new ye(t)}copy(e,t){return super.copy(e,t),this.groundColor.copy(e.groundColor),this}},Ul=new et,Df=new P,Nf=new P,Us=class{constructor(e){this.camera=e,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new ce(512,512),this.map=null,this.mapPass=null,this.matrix=new et,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new As,this._frameExtents=new ce(1,1),this._viewportCount=1,this._viewports=[new Ge(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){let t=this.camera,i=this.matrix;Df.setFromMatrixPosition(e.matrixWorld),t.position.copy(Df),Nf.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(Nf),t.updateMatrixWorld(),Ul.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Ul),i.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),i.multiply(Ul)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.bias=e.bias,this.radius=e.radius,this.mapSize.copy(e.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){let e={};return this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}},Ec=class extends Us{constructor(){super(new Bt(50,1,.5,500)),this.isSpotLightShadow=!0,this.focus=1}updateMatrices(e){let t=this.camera,i=Or*2*e.angle*this.focus,r=this.mapSize.width/this.mapSize.height,s=e.distance||t.far;(i!==t.fov||r!==t.aspect||s!==t.far)&&(t.fov=i,t.aspect=r,t.far=s,t.updateProjectionMatrix()),super.updateMatrices(e)}copy(e){return super.copy(e),this.focus=e.focus,this}},ha=class extends Hr{constructor(e,t,i=0,r=Math.PI/3,s=0,a=2){super(e,t),this.isSpotLight=!0,this.type="SpotLight",this.position.copy(Et.DEFAULT_UP),this.updateMatrix(),this.target=new Et,this.distance=i,this.angle=r,this.penumbra=s,this.decay=a,this.map=null,this.shadow=new Ec}get power(){return this.intensity*Math.PI}set power(e){this.intensity=e/Math.PI}dispose(){this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.angle=e.angle,this.penumbra=e.penumbra,this.decay=e.decay,this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}},Uf=new et,xs=new P,Ol=new P,Ac=class extends Us{constructor(){super(new Bt(90,1,.5,500)),this.isPointLightShadow=!0,this._frameExtents=new ce(4,2),this._viewportCount=6,this._viewports=[new Ge(2,1,1,1),new Ge(0,1,1,1),new Ge(3,1,1,1),new Ge(1,1,1,1),new Ge(3,0,1,1),new Ge(1,0,1,1)],this._cubeDirections=[new P(1,0,0),new P(-1,0,0),new P(0,0,1),new P(0,0,-1),new P(0,1,0),new P(0,-1,0)],this._cubeUps=[new P(0,1,0),new P(0,1,0),new P(0,1,0),new P(0,1,0),new P(0,0,1),new P(0,0,-1)]}updateMatrices(e,t=0){let i=this.camera,r=this.matrix,s=e.distance||i.far;s!==i.far&&(i.far=s,i.updateProjectionMatrix()),xs.setFromMatrixPosition(e.matrixWorld),i.position.copy(xs),Ol.copy(i.position),Ol.add(this._cubeDirections[t]),i.up.copy(this._cubeUps[t]),i.lookAt(Ol),i.updateMatrixWorld(),r.makeTranslation(-xs.x,-xs.y,-xs.z),Uf.multiplyMatrices(i.projectionMatrix,i.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Uf)}},ua=class extends Hr{constructor(e,t,i=0,r=2){super(e,t),this.isPointLight=!0,this.type="PointLight",this.distance=i,this.decay=r,this.shadow=new Ac}get power(){return this.intensity*4*Math.PI}set power(e){this.intensity=e/(4*Math.PI)}dispose(){this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.decay=e.decay,this.shadow=e.shadow.clone(),this}},Tc=class extends Us{constructor(){super(new _i(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}},Gr=class extends Hr{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(Et.DEFAULT_UP),this.updateMatrix(),this.target=new Et,this.shadow=new Tc}dispose(){this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}};var Oc="\\[\\]\\.:\\/",Rv=new RegExp("["+Oc+"]","g"),Fc="[^"+Oc+"]",Cv="[^"+Oc.replace("\\.","")+"]",Iv=/((?:WC+[\/:])*)/.source.replace("WC",Fc),Pv=/(WCOD+)?/.source.replace("WCOD",Cv),Lv=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",Fc),Dv=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",Fc),Nv=new RegExp("^"+Iv+Pv+Lv+Dv+"$"),Uv=["material","materials","bones","map"],Rc=class{constructor(e,t,i){let r=i||ut.parseTrackName(t);this._targetGroup=e,this._bindings=e.subscribe_(t,r)}getValue(e,t){this.bind();let i=this._targetGroup.nCachedObjects_,r=this._bindings[i];r!==void 0&&r.getValue(e,t)}setValue(e,t){let i=this._bindings;for(let r=this._targetGroup.nCachedObjects_,s=i.length;r!==s;++r)i[r].setValue(e,t)}bind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,i=e.length;t!==i;++t)e[t].bind()}unbind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,i=e.length;t!==i;++t)e[t].unbind()}},ut=class n{constructor(e,t,i){this.path=t,this.parsedPath=i||n.parseTrackName(t),this.node=n.findNode(e,this.parsedPath.nodeName),this.rootNode=e,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(e,t,i){return e&&e.isAnimationObjectGroup?new n.Composite(e,t,i):new n(e,t,i)}static sanitizeNodeName(e){return e.replace(/\s/g,"_").replace(Rv,"")}static parseTrackName(e){let t=Nv.exec(e);if(t===null)throw new Error("PropertyBinding: Cannot parse trackName: "+e);let i={nodeName:t[2],objectName:t[3],objectIndex:t[4],propertyName:t[5],propertyIndex:t[6]},r=i.nodeName&&i.nodeName.lastIndexOf(".");if(r!==void 0&&r!==-1){let s=i.nodeName.substring(r+1);Uv.indexOf(s)!==-1&&(i.nodeName=i.nodeName.substring(0,r),i.objectName=s)}if(i.propertyName===null||i.propertyName.length===0)throw new Error("PropertyBinding: can not parse propertyName from trackName: "+e);return i}static findNode(e,t){if(t===void 0||t===""||t==="."||t===-1||t===e.name||t===e.uuid)return e;if(e.skeleton){let i=e.skeleton.getBoneByName(t);if(i!==void 0)return i}if(e.children){let i=function(s){for(let a=0;a<s.length;a++){let o=s[a];if(o.name===t||o.uuid===t)return o;let l=i(o.children);if(l)return l}return null},r=i(e.children);if(r)return r}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(e,t){e[t]=this.targetObject[this.propertyName]}_getValue_array(e,t){let i=this.resolvedProperty;for(let r=0,s=i.length;r!==s;++r)e[t++]=i[r]}_getValue_arrayElement(e,t){e[t]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(e,t){this.resolvedProperty.toArray(e,t)}_setValue_direct(e,t){this.targetObject[this.propertyName]=e[t]}_setValue_direct_setNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(e,t){let i=this.resolvedProperty;for(let r=0,s=i.length;r!==s;++r)i[r]=e[t++]}_setValue_array_setNeedsUpdate(e,t){let i=this.resolvedProperty;for(let r=0,s=i.length;r!==s;++r)i[r]=e[t++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(e,t){let i=this.resolvedProperty;for(let r=0,s=i.length;r!==s;++r)i[r]=e[t++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(e,t){this.resolvedProperty[this.propertyIndex]=e[t]}_setValue_arrayElement_setNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(e,t){this.resolvedProperty.fromArray(e,t)}_setValue_fromArray_setNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(e,t){this.bind(),this.getValue(e,t)}_setValue_unbound(e,t){this.bind(),this.setValue(e,t)}bind(){let e=this.node,t=this.parsedPath,i=t.objectName,r=t.propertyName,s=t.propertyIndex;if(e||(e=n.findNode(this.rootNode,t.nodeName),this.node=e),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!e){console.warn("THREE.PropertyBinding: No target node found for track: "+this.path+".");return}if(i){let c=t.objectIndex;switch(i){case"materials":if(!e.material){console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.materials){console.error("THREE.PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}e=e.material.materials;break;case"bones":if(!e.skeleton){console.error("THREE.PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}e=e.skeleton.bones;for(let h=0;h<e.length;h++)if(e[h].name===c){c=h;break}break;case"map":if("map"in e){e=e.map;break}if(!e.material){console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.map){console.error("THREE.PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}e=e.material.map;break;default:if(e[i]===void 0){console.error("THREE.PropertyBinding: Can not bind to objectName of node undefined.",this);return}e=e[i]}if(c!==void 0){if(e[c]===void 0){console.error("THREE.PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,e);return}e=e[c]}}let a=e[r];if(a===void 0){let c=t.nodeName;console.error("THREE.PropertyBinding: Trying to update property for track: "+c+"."+r+" but it wasn't found.",e);return}let o=this.Versioning.None;this.targetObject=e,e.needsUpdate!==void 0?o=this.Versioning.NeedsUpdate:e.matrixWorldNeedsUpdate!==void 0&&(o=this.Versioning.MatrixWorldNeedsUpdate);let l=this.BindingType.Direct;if(s!==void 0){if(r==="morphTargetInfluences"){if(!e.geometry){console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!e.geometry.morphAttributes){console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}e.morphTargetDictionary[s]!==void 0&&(s=e.morphTargetDictionary[s])}l=this.BindingType.ArrayElement,this.resolvedProperty=a,this.propertyIndex=s}else a.fromArray!==void 0&&a.toArray!==void 0?(l=this.BindingType.HasFromToArray,this.resolvedProperty=a):Array.isArray(a)?(l=this.BindingType.EntireArray,this.resolvedProperty=a):this.propertyName=r;this.getValue=this.GetterByBindingType[l],this.setValue=this.SetterByBindingTypeAndVersioning[l][o]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}};ut.Composite=Rc;ut.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};ut.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};ut.prototype.GetterByBindingType=[ut.prototype._getValue_direct,ut.prototype._getValue_array,ut.prototype._getValue_arrayElement,ut.prototype._getValue_toArray];ut.prototype.SetterByBindingTypeAndVersioning=[[ut.prototype._setValue_direct,ut.prototype._setValue_direct_setNeedsUpdate,ut.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[ut.prototype._setValue_array,ut.prototype._setValue_array_setNeedsUpdate,ut.prototype._setValue_array_setMatrixWorldNeedsUpdate],[ut.prototype._setValue_arrayElement,ut.prototype._setValue_arrayElement_setNeedsUpdate,ut.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[ut.prototype._setValue_fromArray,ut.prototype._setValue_fromArray_setNeedsUpdate,ut.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];var xM=new Float32Array(1);typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:Zi}}));typeof window<"u"&&(window.__THREE__?console.warn("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=Zi);var ya=class{constructor(e){this.scene=e,this.group=new Xt,this.group.name="Modeler selection",this.group.renderOrder=1001,e.add(this.group)}clear(){for(let e of[...this.group.children]){e.removeFromParent(),e.geometry?.dispose();for(let t of Array.isArray(e.material)?e.material:[e.material])t?.dispose()}this.value=null}set(e,t){if(this.clear(),!e)return!1;if(e.assetId!==t.assetId||e.contentHash!==t.contentHash)throw Error("\u9009\u533A\u5C5E\u4E8E\u53E6\u4E00\u7248\u672C\uFF0C\u8BF7\u91CD\u65B0\u5B9A\u4F4D");if(e.space!=="world")throw Error("Selection overlay requires world geometry");if(["points","segments","triangles"].reduce((s,a)=>s+(e[a]?.length||0),0)>49152)throw Error("Selection overlay byte budget exceeded");let r=(s,a)=>{if(!Array.isArray(s)||!s.length)return;if(s.some(c=>!Number.isFinite(c)))throw Error("Invalid overlay coordinates");let o=new Ft;o.setAttribute("position",new lt(s,3));let l;a==="triangles"?l=new St(o,new Vn({color:"#31dbc8",transparent:!0,opacity:.44,side:Rt,depthTest:!1,depthWrite:!1})):a==="segments"?l=new qi(o,new vi({color:"#ffe18b",depthTest:!1,transparent:!0,opacity:.95})):l=new na(o,new Rs({color:"#ffe18b",size:7,sizeAttenuation:!1,depthTest:!1})),l.renderOrder=1001,this.group.add(l)};if(r(e.triangles,"triangles"),r(e.segments,"segments"),r(e.points,"points"),e.frame?.worldMatrix){let s=new et().fromArray(e.frame.worldMatrix),a=new P().setFromMatrixPosition(s),o=e.frame.displaySize||.12;for(let l=0;l<3;l++){let c=new P().fromArray(s.elements,l*4).normalize(),h=new Ft().setFromPoints([a,a.clone().addScaledVector(c,o)]),u=new vi({color:[16740978,9231723,7057151][l],depthTest:!1});this.group.add(new qi(h,u))}}return this.value=e,!0}bounds(){let e=new dn().setFromObject(this.group);return e.isEmpty()?null:{min:e.min.toArray(),max:e.max.toArray()}}dispose(){this.clear(),this.group.removeFromParent()}};var zc=Object.freeze({baseColor:"map",roughness:"roughnessMap",metalness:"metalnessMap",normal:"normalMap",emissive:"emissiveMap",ao:"aoMap",clearcoat:"clearcoatMap",clearcoatRoughness:"clearcoatRoughnessMap"}),xa=512,Ji=2048,Bc=1024*1024,ld=16,$e=(n,e)=>Object.prototype.hasOwnProperty.call(n,e),nn=(n,e,t)=>$e(n,e)?n[e]:t,Ov=n=>Math.max(0,Math.min(1,n));function Xe(n,e){throw new TypeError(`${n}: ${e}`)}function Ki(n,e){return(!n||typeof n!="object"||Array.isArray(n)||![Object.prototype,null].includes(Object.getPrototypeOf(n)))&&Xe(e,"expected a plain object"),n}function Yr(n,e,t){Ki(n,t);for(let i of Reflect.ownKeys(n))(typeof i!="string"||!e.includes(i))&&Xe(t,`unsupported field ${String(i)}`)}function ct(n,e,t,i,r=!1){return(typeof n!="number"||!Number.isFinite(n)||n<e||n>t||r&&!Number.isInteger(n))&&Xe(i,`expected ${r?"an integer":"a finite number"} from ${e} to ${t}`),n}function kc(n,e){return typeof n!="boolean"&&Xe(e,"expected a boolean"),n}function $r(n,e,t,i=-1e6,r=1e6){return(!Array.isArray(n)||n.length!==e)&&Xe(t,`expected ${e} finite components`),Array.from(n,(s,a)=>ct(s,i,r,`${t}[${a}]`))}function _a(n,e,t,i,r=!1){if(typeof n=="number")return[ct(n,t,i,e,r),n];let s=$r(n,2,e,t,i);return r&&s.forEach((a,o)=>ct(a,t,i,`${e}[${o}]`,!0)),s}function va(n,e,t=!0){let i;if(typeof n=="string"){let r=/^#([a-f\d]{3}|[a-f\d]{4}|[a-f\d]{6}|[a-f\d]{8})$/i.exec(n);if(r){let s=r[1];s.length<5&&(s=[...s].map(a=>a+a).join("")),i=[0,2,4].map(a=>parseInt(s.slice(a,a+2),16)/255),i.push(s.length===8?parseInt(s.slice(6),16)/255:1)}else{let s=n.toLowerCase();return $e(ye.NAMES,s)||Xe(e,"expected a hex color, a Three color name, an RGB integer, or unit RGB/RGBA components"),va(ye.NAMES[s],e,t)}}else if(typeof n=="number"){let r=ct(n,0,16777215,e,!0);i=[(r>>>16)/255,(r>>>8&255)/255,(r&255)/255,1]}else Array.isArray(n)&&(n.length===3||n.length===4)?(i=Array.from(n,(r,s)=>ct(r,0,1,`${e}[${s}]`)),i.length===3&&i.push(1)):Xe(e,"expected a hex color, a Three color name, an RGB integer, or unit RGB/RGBA components");return!t&&i[3]!==1&&Xe(e,"this Three color property does not support alpha"),i}function Mi(n,e){let t=va(n,e,!1);return new ye().setRGB(t[0],t[1],t[2],mt)}function Fv(n,e,t){return n===void 0?e.map((i,r)=>va(i,`${t}[${r}]`)):((!Array.isArray(n)||n.length!==2)&&Xe(t,"expected exactly two colors"),n.map((i,r)=>va(i,`${t}[${r}]`)))}function zv(n,e){$e(n,"size")&&($e(n,"width")||$e(n,"height"))&&Xe(e,"size cannot be combined with width/height"),$e(n,"width")!==$e(n,"height")&&Xe(e,"width and height must be supplied together"),n.type==="pixels"&&!$e(n,"size")&&!$e(n,"width")&&Xe(e,"pixels require size or width and height");let t=$e(n,"size")?_a(n.size,`${e}.size`,1,xa,!0):$e(n,"width")?[ct(n.width,1,xa,`${e}.width`,!0),ct(n.height,1,xa,`${e}.height`,!0)]:[64,64];return t[0]*t[1]*4>Bc&&Xe(e,`RGBA data exceeds ${Bc} channels`),t}function Bv(n,e,t){let i=typeof n.file=="string"?/(?:^|[\\/])image-([a-f\d]{64})\.png$/i.exec(n.file)?.[1]?.toLowerCase():void 0,r=n.image??i;(typeof r!="string"||!/^[a-f\d]{64}$/i.test(r))&&Xe(`${t}.image`,"expected a SHA-256 image hash or image-<hash>.png file"),n.file!==void 0&&(!i||i!==r.toLowerCase())&&Xe(`${t}.file`,"image filename must match its image hash"),Ki(e,"snapshot.appearanceAssets");let s=e[r.toLowerCase()];s||Xe(t,`appearance_image_missing: ${r}`),Ki(s,`snapshot.appearanceAssets.${r}`);let a=ct(s.width,1,Ji,`${t}.image.width`,!0),o=ct(s.height,1,Ji,`${t}.image.height`,!0),l=a*o*4,c;if(s.data instanceof Uint8Array)s.data.length!==l&&Xe(t,"Wrong decoded material image length"),c=s.data;else{(typeof s.data!="string"||s.data.length!==Math.ceil(l/3)*4||!/^[A-Za-z0-9+/]*={0,2}$/.test(s.data))&&Xe(`${t}.image.data`,`expected base64 encoding of exactly ${l} RGBA bytes`);try{if(typeof globalThis.atob=="function"){let f=globalThis.atob(s.data);f.length!==l&&Xe(`${t}.image.data`,`expected exactly ${l} decoded RGBA bytes`),c=new Uint8Array(l);for(let d=0;d<l;d++)c[d]=f.charCodeAt(d)}else globalThis.Buffer?.from?c=new Uint8Array(globalThis.Buffer.from(s.data,"base64")):Xe(`${t}.image.data`,"base64 decoding is unavailable")}catch(f){Xe(`${t}.image.data`,`invalid RGBA base64: ${f.message}`)}c.length!==l&&Xe(`${t}.image.data`,`expected exactly ${l} decoded RGBA bytes`)}let h=new Uint8Array(l),u=a*4;for(let f=0;f<o;f++)h.set(c.subarray(f*u,(f+1)*u),(o-f-1)*u);return{width:a,height:o,data:h,image:r.toLowerCase()}}function kv(n,e,t){let i=`material.textures.${e}`;Ki(n,i);let r=n.type;["checker","carbon","noise","pixels","flatnormal","image"].includes(r)||Xe(`${i}.type`,"expected checker, carbon, noise, pixels, flatnormal or image"),e==="normal"&&!["flatnormal","pixels","image"].includes(r)&&Xe(i,"normal maps require flatnormal or tangent-space RGBA pixels/image"),e!=="normal"&&r==="flatnormal"&&Xe(i,"flatnormal is supported only in the normal channel");let s=["type","scale","anisotropy","colorSpace"];r==="image"?s.push("image","file","texCoord"):s.push("size","width","height"),r==="pixels"&&s.push("data"),["checker","carbon","noise"].includes(r)&&s.push("colors"),["carbon","noise"].includes(r)&&s.push("seed"),["roughness","metalness","ao"].includes(e)&&s.push("channel"),e==="normal"&&s.push("normalY","normalScale"),Yr(n,s,i);let a=["baseColor","emissive"].includes(e)?"srgb":"linear";$e(n,"colorSpace")&&n.colorSpace!==a&&Xe(`${i}.colorSpace`,`expected ${a} for ${e}`);let o=$e(n,"texCoord")?ct(n.texCoord,0,1,`${i}.texCoord`,!0):0;$e(n,"channel")&&!["r","g","b"].includes(n.channel)&&Xe(`${i}.channel`,"expected r, g or b"),$e(n,"normalY")&&!["up","down"].includes(n.normalY)&&Xe(`${i}.normalY`,"expected up or down");let l=$e(n,"normalScale")?_a(n.normalScale,`${i}.normalScale`,0,100):void 0,c=r==="image"?Bv(n,t,i):null,[h,u]=c?[c.width,c.height]:zv(n,i),f=$e(n,"scale")?_a(n.scale,`${i}.scale`,1e-6,1024):[1,1],d=$e(n,"anisotropy")?ct(n.anisotropy,1,ld,`${i}.anisotropy`,!0):1,p=$e(n,"seed")?ct(n.seed,0,4294967295,`${i}.seed`,!0):1,y=c?.data,g;if(r==="pixels"){let m=n.data;(!(Array.isArray(m)||m instanceof Uint8Array||m instanceof Uint8ClampedArray)||m.length!==h*u*4)&&Xe(`${i}.data`,`expected exactly ${h*u*4} RGBA byte components`),y=new Uint8Array(m.length);for(let _=0;_<m.length;_++)y[_]=ct(m[_],0,255,`${i}.data[${_}]`,!0)}else!c&&r!=="flatnormal"&&(g=Fv(n.colors,r==="carbon"?["#090b0f","#48505c"]:["#202630","#c3cad4"],`${i}.colors`));return{type:r,width:h,height:u,scale:f,anisotropy:d,seed:p,data:y,colors:g,image:c?.image,component:n.channel??(c&&["roughness","metalness","ao"].includes(e)?"r":void 0),invertGreen:n.normalY==="down",normalScale:l,texCoord:o}}function od(n,e,t){let i=Math.imul(n+1,521288629)^Math.imul(e+1,1597334677)^t;return i=Math.imul(i^i>>>16,2146121005),i=Math.imul(i^i>>>15,2221713035),((i^i>>>16)>>>0)/4294967295}function Hv(n){if(n.data)return n.data;let{width:e,height:t,type:i,seed:r,colors:s}=n,a=new Uint8Array(e*t*4);for(let o=0;o<t;o++)for(let l=0;l<e;l++){let c=(o*e+l)*4;if(i==="flatnormal"){a.set([128,128,255,255],c);continue}let h=l/e*8,u=o/t*8,f;if(i==="checker")f=(Math.floor(h)+Math.floor(u))%2;else if(i==="noise")f=od(l,o,r);else{let d=(Math.floor(h)+Math.floor(u))%4<2,p=d?u:h,y=d?h:u,g=Math.sin(Math.PI*(p-Math.floor(p))),m=Math.cos(2*Math.PI*p*6);f=Ov(.12+.65*g+.08*m+.07*Math.cos(2*Math.PI*y)+.08*od(l,o,r))}for(let d=0;d<4;d++)a[c+d]=Math.round((s[0][d]*(1-f)+s[1][d]*f)*255)}return a}function cd(n={},e={}){if(Ki(n,"material"),!$e(n,"textures"))return{};Yr(n.textures,Object.keys(zc),"material.textures");let t=Object.keys(n.textures).map(r=>[r,kv(n.textures[r],r,e)]),i={};try{for(let[r,s]of t){let a=Hv(s);if(s.component||s.invertGreen)for(let l=0;l<a.length;l+=4)s.component&&(a[l]=a[l+1]=a[l+2]=a[l+{r:0,g:1,b:2}[s.component]]),s.invertGreen&&(a[l+1]=255-a[l+1]);let o=new Br(a,s.width,s.height,It,bn);i[zc[r]]=o,s.normalScale&&(i.normalScale=new ce(...s.normalScale)),o.name=`modeler-${r}-${s.type}`,o.colorSpace=r==="baseColor"||r==="emissive"?mt:wt,o.wrapS=o.wrapT=Hi,o.repeat.fromArray(s.scale),o.anisotropy=s.anisotropy,o.channel=s.texCoord,o.flipY=!1,o.magFilter=["pixels","checker","flatnormal"].includes(s.type)?vt:Ct,o.minFilter=s.type==="image"?Vi:o.magFilter,o.generateMipmaps=s.type==="image",s.image&&(o.userData={appearanceImage:s.image,sourceRows:"png-top-down",storedRows:"bottom-up",normalY:"up"}),o.needsUpdate=!0}return i}catch(r){for(let s of Object.values(i))s?.isTexture&&s.dispose();throw r}}function Vv(n){return Ki(n,"defaults"),{sky:Mi(n.hemisphereSky??"#d7e8ff","defaults.hemisphereSky"),ground:Mi(n.hemisphereGround??"#59606c","defaults.hemisphereGround"),hemisphereIntensity:ct(n.hemisphereIntensity??2,0,1e4,"defaults.hemisphereIntensity"),keyColor:Mi(n.keyColor??"#ffffff","defaults.keyColor"),keyIntensity:ct(n.keyIntensity??3,0,1e6,"defaults.keyIntensity"),keyPosition:$r(n.keyPosition??[4,7,5],3,"defaults.keyPosition")}}function Gv(n,e,t){let i=`stage.lights[${e}]`;Ki(n,i),["directional","point","spot"].includes(n.type)||Xe(`${i}.type`,"expected directional, point or spot");let r=["type","color","intensity","position","shadow"];n.type!=="point"&&r.push("target"),n.type!=="directional"&&r.push("distance"),n.type==="spot"&&r.push("angle","penumbra"),Yr(n,r,i);let s={type:n.type,color:$e(n,"color")?Mi(n.color,`${i}.color`):t.keyColor.clone(),intensity:ct(nn(n,"intensity",n.type==="directional"?t.keyIntensity:1),0,1e6,`${i}.intensity`),position:$r(nn(n,"position",t.keyPosition),3,`${i}.position`),shadow:$e(n,"shadow")?kc(n.shadow,`${i}.shadow`):void 0};return n.type!=="point"&&(s.target=$r(nn(n,"target",[0,0,0]),3,`${i}.target`),s.target.every((a,o)=>a===s.position[o])&&Xe(`${i}.target`,"must differ from the light position")),n.type!=="directional"&&(s.distance=ct(nn(n,"distance",0),0,1e6,`${i}.distance`),s.distance>0&&s.distance<=.01&&Xe(`${i}.distance`,"a finite light range must exceed the shadow near plane (.01)")),n.type==="spot"&&(s.angle=ct(nn(n,"angle",Math.PI/3),1e-6,Math.PI/2,`${i}.angle`),s.penumbra=ct(nn(n,"penumbra",0),0,1,`${i}.penumbra`)),s}function Wv(n,e){if(n==null)return null;Yr(n,["background","exposure","environmentIntensity","hemisphere","lights","floor","shadows","shadowSpan"],"stage");let t={shadowSpan:ct(nn(n,"shadowSpan",20),.001,1e5,"stage.shadowSpan")};if($e(n,"background")&&(t.background=n.background===null?null:Mi(n.background,"stage.background")),$e(n,"exposure")&&(t.exposure=ct(n.exposure,0,100,"stage.exposure")),$e(n,"environmentIntensity")&&(t.environmentIntensity=ct(n.environmentIntensity,0,100,"stage.environmentIntensity")),$e(n,"shadows")&&(t.shadows=kc(n.shadows,"stage.shadows")),$e(n,"hemisphere")&&(Yr(n.hemisphere,["sky","ground","intensity"],"stage.hemisphere"),t.hemisphere={sky:$e(n.hemisphere,"sky")?Mi(n.hemisphere.sky,"stage.hemisphere.sky"):e.sky.clone(),ground:$e(n.hemisphere,"ground")?Mi(n.hemisphere.ground,"stage.hemisphere.ground"):e.ground.clone(),intensity:ct(nn(n.hemisphere,"intensity",e.hemisphereIntensity),0,1e4,"stage.hemisphere.intensity")}),$e(n,"lights")&&((!Array.isArray(n.lights)||n.lights.length>8)&&Xe("stage.lights","expected at most eight lights"),t.lights=n.lights.map((i,r)=>Gv(i,r,e))),$e(n,"floor")){let i=n.floor;Yr(i,["size","position","color","roughness","metalness","shadow","normal"],"stage.floor");let r=$r(nn(i,"normal",[0,1,0]),3,"stage.floor.normal"),s=Math.hypot(...r);s<1e-12&&Xe("stage.floor.normal","expected a nonzero normal"),t.floor={size:_a(nn(i,"size",20),"stage.floor.size",1e-6,1e5),position:$r(nn(i,"position",[0,0,0]),3,"stage.floor.position"),color:Mi(nn(i,"color","#454b55"),"stage.floor.color"),roughness:ct(nn(i,"roughness",.8),0,1,"stage.floor.roughness"),metalness:ct(nn(i,"metalness",0),0,1,"stage.floor.metalness"),shadow:$e(i,"shadow")?kc(i.shadow,"stage.floor.shadow"):void 0,normal:r.map(a=>a/s)}}return t}function Xv(n){(!n||!n.scene?.isScene||!n.root?.isObject3D||!n.renderer?.shadowMap)&&Xe("studio","expected a Three scene, renderer with shadowMap, and geometry root"),n.defaultLights!==void 0&&(!Array.isArray(n.defaultLights)||n.defaultLights.some(e=>!e?.isLight))&&Xe("studio.defaultLights","expected only the exact default Three lights created by the studio")}function qv(n){let e=n.shadow;return{light:n,visible:n.visible,castShadow:n.castShadow,shadow:e?{map:e.map,mapPass:e.mapPass,mapSize:e.mapSize.clone(),camera:e.camera.clone(),bias:e.bias,normalBias:e.normalBias,radius:e.radius,autoUpdate:e.autoUpdate,needsUpdate:e.needsUpdate}:null}}function Yv(n){let{light:e}=n;if(e.visible=n.visible,e.castShadow=n.castShadow,!n.shadow)return;let t=e.shadow,i=n.shadow;for(let r of["map","mapPass"])t[r]&&t[r]!==i[r]&&t[r].dispose(),t[r]=i[r];t.mapSize.copy(i.mapSize),t.camera.copy(i.camera);for(let r of["bias","normalBias","radius","autoUpdate","needsUpdate"])t[r]=i[r]}function $v(n){for(let[e,t]of n.materials)e.envMapIntensity=t;n.materials.clear()}function hd(n){n&&(n.removeFromParent(),n.traverse(e=>{if(e.isLight&&(e.shadow?.dispose(),e.shadow&&(e.shadow.map=e.shadow.mapPass=null)),e.isMesh){e.geometry.dispose();for(let t of Array.isArray(e.material)?e.material:[e.material])t.dispose()}}),n.clear())}function ud(n,e){hd(e.group),e.group=null,$v(e);for(let t of e.defaultLights)Yv(t);n.scene.background=e.background,n.renderer.toneMappingExposure=e.exposure,n.renderer.shadowMap.enabled=e.shadowEnabled,n.renderer.shadowMap.type=e.shadowType}function fd(n,e){if(!n.shadow||!n.castShadow)return;let{shadow:t}=n;if(t.map||t.mapSize.set(1024,1024),t.bias=-1e-4,t.normalBias=.01,t.camera.near=.01,t.camera.far=n.distance>.01?n.distance:500,n.isDirectionalLight){let i=e/2;t.camera.left=t.camera.bottom=-i,t.camera.right=t.camera.top=i,t.camera.far=Math.max(500,new P().subVectors(n.position,n.target.position).length()+e*2)}n.isSpotLight&&(t.camera.fov=pa.radToDeg(n.angle*2),t.camera.aspect=t.mapSize.x/t.mapSize.y),t.camera.updateProjectionMatrix(),t.needsUpdate=!0}function jv(n,e){let t=new Xt;t.name="modeler-native-stage",t.userData.modelerStage=!0;let i=null;try{if(n.hemisphere){let r=n.hemisphere,s=new Vr(r.sky,r.ground,r.intensity);s.name="modeler-stage-hemisphere",t.add(s)}for(let[r,s]of(n.lights||[]).entries()){let a=s.type==="directional"?new Gr(s.color,s.intensity):s.type==="point"?new ua(s.color,s.intensity,s.distance,2):new ha(s.color,s.intensity,s.distance,s.angle,s.penumbra,2);a.name=`modeler-stage-${s.type}-${r}`,t.add(a),a.position.fromArray(s.position),a.target&&(a.target.name=`${a.name}-target`,a.target.position.fromArray(s.target),t.add(a.target)),a.castShadow=s.shadow??e,fd(a,n.shadowSpan)}if(n.floor){let r=n.floor;i=new St(new ii(...r.size),new pn({color:r.color,roughness:r.roughness,metalness:r.metalness,side:Rt})),i.name="modeler-stage-floor",i.position.fromArray(r.position),i.quaternion.setFromUnitVectors(new P(0,0,1),new P().fromArray(r.normal)),i.receiveShadow=r.shadow??e,i.castShadow=!1,t.add(i)}return{group:t,floor:i}}catch(r){throw hd(t),r}}function Zv(n,e,t,i){if(i===1)return 0;let r=new Set,s=a=>{for(let o of Array.isArray(a.material)?a.material:[a.material])o&&typeof o.envMapIntensity=="number"&&Number.isFinite(o.envMapIntensity)&&r.add(o)};n.traverse(s),e&&s(e);for(let a of r)t.materials.set(a,a.envMapIntensity),a.envMapIntensity*=i;return r.size}function Jv(n){let e=n.getWorldPosition(new P).toArray(),t={name:n.name||null,type:n.isDirectionalLight?"directional":n.isSpotLight?"spot":n.isPointLight?"point":n.isHemisphereLight?"hemisphere":n.type,color:`#${n.color.getHexString()}`,intensity:n.intensity,position:e};if(n.isHemisphereLight&&(t.sky=t.color,t.ground=`#${n.groundColor.getHexString()}`),n.target&&(t.target=n.target.getWorldPosition(new P).toArray()),(n.isPointLight||n.isSpotLight)&&(t.distance=n.distance,t.decay=n.decay),n.isSpotLight&&(t.angle=n.angle,t.penumbra=n.penumbra),n.shadow){let i=n.shadow.camera;t.shadow=n.castShadow,t.shadowMapSize=n.shadow.mapSize.toArray(),t.shadowCamera={near:i.near,far:i.far,...i.isOrthographicCamera?{left:i.left,right:i.right,top:i.top,bottom:i.bottom}:{fov:i.fov,aspect:i.aspect}}}return t}function ad(n,e,t,i=0){let r=[];n.scene.traverseVisible(a=>{a.isLight&&r.push(Jv(a))});let s=n.scene.background;return{mode:e?"stage":"default",background:s?.isColor?`#${s.getHexString()}`:s===null?null:{type:s?.type||"Texture",uuid:s?.uuid||null},exposure:n.renderer.toneMappingExposure,environmentIntensity:e?.environmentIntensity??1,hemisphere:r.find(a=>a.type==="hemisphere")||null,lights:r.filter(a=>a.type!=="hemisphere"),floor:t?{size:[t.geometry.parameters.width,t.geometry.parameters.height],position:t.position.toArray(),normal:new P(0,0,1).applyQuaternion(t.quaternion).toArray(),color:`#${t.material.color.getHexString()}`,roughness:t.material.roughness,metalness:t.material.metalness,shadow:t.receiveShadow}:null,shadows:n.renderer.shadowMap.enabled,shadowType:n.renderer.shadowMap.type,shadowSpan:e?.shadowSpan??null,shaderCapabilities:{threeRevision:Zi,uvTextureChannels:{...zc},textureDescriptorTypes:["checker","carbon","noise","pixels"],normalDescriptorTypes:["flatnormal","pixels"],maxTextureDimension:Ji,maxProceduralTextureDimension:xa,maxImagePixels:Ji*Ji,maxTextureChannels:Ji*Ji*4,maxProceduralTextureChannels:Bc,maxDescriptorAnisotropy:ld,colorTextureColorSpace:mt,dataTextureColorSpace:wt,lightTypes:["directional","point","spot"],maxStageLights:8,shadows:{enabled:n.renderer.shadowMap.enabled,type:n.renderer.shadowMap.type,typeName:n.renderer.shadowMap.type===bi?"PCFSoftShadowMap":"renderer-default"},environment:{present:!!n.scene.environment,application:"material.envMapIntensity multiplier",multiplier:e?.environmentIntensity??1,changedMaterials:i},defaultLightsRegistered:(n.defaultLights||[]).length}}}function dd(n,e,t={}){Xv(n);let i=Vv(t),r=Wv(e,i);if(!r)return Hc(n),ad(n,null,null);let s=n._nativeStage,a=r.shadows??s?.shadowEnabled??n.renderer.shadowMap.enabled,o=jv(r,a),l=s;l||(l={group:null,materials:new Map,background:n.scene.background,exposure:n.renderer.toneMappingExposure,shadowEnabled:n.renderer.shadowMap.enabled,shadowType:n.renderer.shadowMap.type,defaultLights:[...new Set(n.defaultLights||[])].map(qv)}),ud(n,l),n._nativeStage=l,l.group=o.group,n.scene.background=$e(r,"background")?r.background:l.background,n.renderer.toneMappingExposure=r.exposure??l.exposure,n.renderer.shadowMap.enabled=a,n.renderer.shadowMap.type=bi;for(let h of l.defaultLights){let{light:u}=h;(r.hemisphere&&u.isHemisphereLight||r.lights&&!u.isHemisphereLight)&&(u.visible=!1),u.visible&&a&&u.shadow&&(u.castShadow=!0,fd(u,r.shadowSpan))}o.group.children.length&&n.scene.add(o.group);let c=Zv(n.root,o.floor,l,r.environmentIntensity??1);return ad(n,r,o.floor,c)}function Hc(n){let e=n?._nativeStage;e&&(ud(n,e),delete n._nativeStage)}var pd={front:{dir:[0,0,1],up:[0,1,0]},back:{dir:[0,0,-1],up:[0,1,0]},side:{dir:[1,0,0],up:[0,1,0]},left:{dir:[-1,0,0],up:[0,1,0]},top:{dir:[0,1,0],up:[0,0,-1]},bottom:{dir:[0,-1,0],up:[0,0,1]},iso:{dir:[1,.72,1],up:[0,1,0]}},si=(n,e)=>n[0]*e[0]+n[1]*e[1]+n[2]*e[2],En=(n,e)=>n.map((t,i)=>t-e[i]),Jr=(n,e)=>[n[1]*e[2]-n[2]*e[1],n[2]*e[0]-n[0]*e[2],n[0]*e[1]-n[1]*e[0]],Qi=n=>{let e=Math.hypot(...n);return n.map(t=>t/e)},ri=(n,e)=>n[e]!==void 0;function jr(n,e){if(!Array.isArray(n)||n.length!==3||!n.every(t=>typeof t=="number"&&Number.isFinite(t)))throw new Error(`${e} must be an array of three finite numbers`);return[...n]}function Zr(n,e,t=!1){if(typeof n!="number"||!Number.isFinite(n)||t&&n<=0)throw new Error(`${e} must be a finite${t?" positive":""} number`);return n}function md(n,{view:e="iso",camera:t={},aspect:i=1.5,front:r=[0,0,1],projectionDefault:s="perspective"}={}){if(typeof e!="string"||e!=="custom"&&!Object.hasOwn(pd,e))throw new Error("view must be front,back,side,left,top,bottom,iso or custom");if(!t||typeof t!="object"||Array.isArray(t))throw new Error("camera must be an object");let a=["eye","target","up","azimuth","elevation","distance","projection","fov","span"];for(let N of Object.keys(t))if(!a.includes(N))throw new Error(`unknown camera field: ${N}`);let o=jr(n?.min,"bounds.min"),l=jr(n?.max,"bounds.max");if(o.some((N,B)=>N>l[B]))throw new Error("bounds.min must not exceed bounds.max");let c=En(l,o);if(!c.every(Number.isFinite))throw new Error("bounds size exceeds the finite numeric range");let h=o.map((N,B)=>N/2+l[B]/2),u=Math.max(...c,1e-6);i=Zr(i,"aspect",!0);let f=jr(r,"front");if(Math.hypot(...f)===0)throw new Error("front must be nonzero");if(!["perspective","orthographic"].includes(s))throw new Error("projectionDefault must be perspective or orthographic");let d=t.projection===void 0?s:t.projection;if(!["perspective","orthographic"].includes(d))throw new Error("camera.projection must be perspective or orthographic");let p=Zr(t.fov===void 0?42:t.fov,"camera.fov",!0);if(p>=179)throw new Error("camera.fov must be greater than 0 and less than 179 degrees");if(ri(t,"span")&&(Zr(t.span,"camera.span",!0),d!=="orthographic"))throw new Error("camera.span is only valid for orthographic projection");let y=ri(t,"eye");if(y&&["azimuth","elevation","distance"].some(N=>ri(t,N)))throw new Error("camera.eye cannot be combined with azimuth, elevation or distance");let g=ri(t,"target")?jr(t.target,"camera.target"):h,m=pd[e==="custom"?"iso":e],_=[...m.dir];if(f[2]<0&&["front","back","iso","custom"].includes(e)&&(_[2]*=-1),y)_=En(jr(t.eye,"camera.eye"),g);else if(ri(t,"azimuth")||ri(t,"elevation")){let N=Zr(t.azimuth===void 0?Math.atan2(_[0],_[2]*(f[2]<0?-1:1))*180/Math.PI:t.azimuth,"camera.azimuth")*Math.PI/180,B=Zr(t.elevation===void 0?Math.atan2(_[1],Math.hypot(_[0],_[2]))*180/Math.PI:t.elevation,"camera.elevation")*Math.PI/180;_=[Math.sin(N)*Math.cos(B),Math.sin(B),Math.cos(N)*Math.cos(B)*(f[2]<0?-1:1)]}if(!_.every(Number.isFinite)||!Number.isFinite(Math.hypot(..._)))throw new Error("camera direction exceeds the finite numeric range");if(Math.hypot(..._)===0)throw new Error("camera.eye must differ from camera.target");_=Qi(_);let x=ri(t,"up")?jr(t.up,"camera.up"):[...m.up];if(Math.hypot(...x)===0)throw new Error("camera.up must be nonzero");if(x=Qi(x),Math.hypot(...Jr(x,_))<1e-8){if(ri(t,"up"))throw new Error("camera.up must not be parallel to the viewing direction");x=[0,0,_[1]>=0?-1:1]}let v=Qi(Jr(x,_));x=Qi(Jr(_,v));let E=[];for(let N of[o[0],l[0]])for(let B of[o[1],l[1]])for(let $ of[o[2],l[2]]){let J=En([N,B,$],g);E.push([si(J,v),si(J,x),si(J,_)])}if(!E.flat().every(Number.isFinite))throw new Error("camera-relative bounds exceed the finite numeric range");let w=Math.tan(p*Math.PI/360),M=w*i,T=1.12,b;y?b=Math.hypot(...En(t.eye,g)):ri(t,"distance")?b=Zr(t.distance,"camera.distance",!0):d==="perspective"?b=Math.max(u*.01,...E.flatMap(([N,B,$])=>[$+Math.abs(N)*T/M,$+Math.abs(B)*T/w,$+u*.01])):b=Math.max(u,...E.map(N=>N[2]+u));let S=y?[...t.eye]:g.map((N,B)=>N+_[B]*b);if(!S.every(Number.isFinite)||!Number.isFinite(b))throw new Error("resolved camera exceeds the finite numeric range");if(Math.hypot(...En(S,g))===0)throw new Error("resolved camera.eye equals camera.target at this numeric precision");let I=d==="orthographic"?t.span===void 0?Math.max(u*1e-6,...E.flatMap(([N,B])=>[2*Math.abs(N)*T/i,2*Math.abs(B)*T])):t.span:2*b*w,O=E.map(N=>b-N[2]),k=Math.min(...O),L=Math.max(...O),U=Math.max(Math.min(u*1e-4,b*.001),1e-12),F=k>0?Math.max(Number.MIN_VALUE,k*.5):U,H=Math.max(F*2,L+u*.1,F+u);if(![I,F,H,M,w].every(Number.isFinite)||I<=0||H<=F||M<=0)throw new Error("resolved camera projection exceeds the finite numeric range");return{eye:S,target:g,up:x,eyeDir:_,right:v,projection:d,fov:p,span:I,near:F,far:H,aspect:i,distance:b}}function ba(n,e,t){if(!t?.enabled||!Array.isArray(t.size)||!Array.isArray(t.position))return{near:e.near,far:e.far};let i=Math.max(...n.max.map((T,b)=>T-n.min[b]),1e-9),r=e.eye,s=Qi(t.normal||[0,1,0]),a=1+s[2],o=a<1e-8?[0,-1,0,0]:(()=>{let T=Math.sqrt(2*a);return[-s[1]/T,s[0]/T,0,T/2]})(),[l,c,,h]=o,u=[1-2*c*c,2*l*c,-2*c*h],f=[2*l*c,1-2*l*l,2*l*h],d=0;for(let T of[-t.size[0]/2,t.size[0]/2])for(let b of[-t.size[1]/2,t.size[1]/2]){let S=t.position.map((I,O)=>I+u[O]*T+f[O]*b);d=Math.max(d,Math.hypot(...En(S,r)))}for(let T of[n.min[0],n.max[0]])for(let b of[n.min[1],n.max[1]])for(let S of[n.min[2],n.max[2]]){let I=[T,b,S],O=si(En(I,t.position),s),k=I.map((L,U)=>L-2*O*s[U]);d=Math.max(d,Math.hypot(...En(k,r)))}let p=n.min.map((T,b)=>(T+n.max[b])/2),y=Qi(En(e.target||p,r)),g=e.up||[0,1,0];Math.hypot(...Jr(y,g))<1e-8&&(g=Math.abs(y[1])>.99?[0,0,1]:[0,1,0]);let m=Qi(Jr(y,g)),_=Jr(m,y),x=[];for(let T of[n.min[0],n.max[0]])for(let b of[n.min[1],n.max[1]])for(let S of[n.min[2],n.max[2]])x.push(si(En([T,b,S],r),y));let v=Math.min(...x),E=Math.max(i*1e-5,1e-12),w=v>E?v*.5:E,M=[];if(e.projection==="orthographic"){let T=e.span??i*2,b=e.aspect??1.5,S=si(y,s);if(Math.abs(S)>1e-10)for(let I of[-1,1])for(let O of[-1,1]){let k=m.map((L,U)=>L*I*T*b/2+_[U]*O*T/2);M.push(-si(En(r.map((L,U)=>L+k[U]),t.position),s)/S)}M.some(I=>I<=0)&&M.some(I=>I>0)&&(w=E)}else{let T=Math.tan((e.fov??42)*Math.PI/360),b=T*(e.aspect??1.5),S=si(En(r,t.position),s);for(let I of[-1,1])for(let O of[-1,1]){let k=y.map((U,F)=>U+m[F]*I*b+_[F]*O*T),L=si(k,s);Math.abs(L)>1e-10&&M.push(-S/L)}}for(let T of M)T>E&&Number.isFinite(T)&&(w=Math.min(w,T*.5));return{near:Math.max(E,w),far:Math.max(e.far,d*1.02+i)}}var Kv="modeler-observation-floor",Vc=1e5,Qv=new et().set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),gd=n=>Math.max(...n.max.map((e,t)=>e-n.min[t]),1e-9),eb=n=>{let e=[];for(let t of[n.min[0],n.max[0]])for(let i of[n.min[1],n.max[1]])for(let r of[n.min[2],n.max[2]])e.push(new P(t,i,r));return e};function tb(n,e){n.updateMatrixWorld();let t=n.clone(),i=n.getWorldPosition(new P);i.y=2*e-i.y;let r=n.getWorldDirection(new P);r.y*=-1;let s=new P(0,1,0).transformDirection(n.matrixWorld);return s.y*=-1,t.position.copy(i),t.up.copy(s),t.lookAt(i.clone().add(r)),t.updateMatrixWorld(),t.projectionMatrix.copy(n.projectionMatrix),t.projectionMatrixInverse.copy(n.projectionMatrix).invert(),t}function nb(n,e){let t=new hn(new P(0,1,0),-e).applyMatrix4(n.matrixWorldInverse),i=new Ge(t.normal.x,t.normal.y,t.normal.z,t.constant),r=new Ge(Math.sign(i.x)||1,Math.sign(i.y)||1,1,1).applyMatrix4(n.projectionMatrix.clone().invert()),s=i.dot(r);if(Math.abs(s)<1e-10)throw new Error("Degenerate mirror clipping plane");i.multiplyScalar(2/s);let a=n.projectionMatrix.elements;a[2]=i.x-a[3],a[6]=i.y-a[7],a[10]=i.z-a[11],a[14]=i.w-a[15],n.projectionMatrixInverse.copy(n.projectionMatrix).invert()}function ib(n,e,t){let i=n.projectionMatrix.elements;return n.isOrthographicCamera?{origin:new P((e-i[12])/i[0],(t-i[13])/i[5],0).applyMatrix4(n.matrixWorld),direction:n.getWorldDirection(new P)}:{origin:n.getWorldPosition(new P),direction:new P((e+i[8])/i[0],(t+i[9])/i[5],-1).transformDirection(n.matrixWorld)}}function rb(n,e,t=640,i=480){n.updateMatrixWorld();let r=[],s=n.getWorldDirection(new P),a=new P(1,0,0).transformDirection(n.matrixWorld),o=new P(0,1,0).transformDirection(n.matrixWorld),l=n.isPerspectiveCamera?Math.tan(pa.degToRad(n.getEffectiveFOV()/2)):0,c=l*(n.aspect||1),h=Math.max(2,Math.min(t,2400));for(let u=0;u<h;u++){let f=(u+.5)/h*2-1,d=new Set([0,i-1]);if(n.isPerspectiveCamera&&Math.abs(o.y*l)>1e-12){let p=-(s.y+a.y*f*c)/(o.y*l),y=(1-p)*i*.5-.5;for(let g of[Math.floor(y),Math.ceil(y),Math.ceil(y)+1])g>=0&&g<i&&d.add(g)}for(let p of d){let y=1-2*(p+.5)/i,{origin:g,direction:m}=ib(n,f,y);if(Math.abs(m.y)<1e-10)continue;let _=(e-g.y)/m.y;_<=0||!Number.isFinite(_)||r.push(g.addScaledVector(m,_))}}return r}var sb="uniform mat4 mirrorMatrix; varying vec4 vMirrorUV;",ob=`uniform sampler2D mirrorTexture;
uniform vec2 mirrorTexel;
uniform float mirrorValid;
varying vec4 vMirrorUV;
vec4 samplePlanarRadiance(float roughness) {
  vec2 uv=vMirrorUV.xy/vMirrorUV.w;
  if(vMirrorUV.w<=0.0||any(lessThan(uv,vec2(0.0)))||any(greaterThan(uv,vec2(1.0))))return vec4(0.0);
  vec2 spread=mirrorTexel*(roughness*roughness*24.0);
  vec4 c=texture2D(mirrorTexture,uv)*0.4;
  c+=texture2D(mirrorTexture,uv+vec2(spread.x,0.0))*0.15;
  c+=texture2D(mirrorTexture,uv-vec2(spread.x,0.0))*0.15;
  c+=texture2D(mirrorTexture,uv+vec2(0.0,spread.y))*0.15;
  c+=texture2D(mirrorTexture,uv-vec2(0.0,spread.y))*0.15;
  return c*mirrorValid;
}`;function ab(n,e){Object.assign(n.uniforms,e),n.vertexShader=sb+`
`+n.vertexShader;let t="#include <worldpos_vertex>";if(!n.vertexShader.includes(t))throw new Error("Missing Three world position marker");n.vertexShader=n.vertexShader.replace(t,t+`
 vMirrorUV=mirrorMatrix*vec4(transformed,1.0);`);let i=Pe.envmap_physical_pars_fragment,r="return envMapColor.rgb * envMapIntensity;";if(!i.includes(r))throw new Error("Missing Three IBL radiance marker");let s=`vec4 planar=samplePlanarRadiance(roughness);
    // RT contains lit, premultiplied linear radiance: never apply env intensity twice.
    return planar.rgb+(1.0-planar.a)*envMapColor.rgb*envMapIntensity;`;n.fragmentShader=ob+`
`+n.fragmentShader.replace("#include <envmap_physical_pars_fragment>",i.replace(r,s))}function lb(n,e,t){let i=u=>{let f=[-.5,.5];for(let d of[-32,-16,-8,-4,-2,-1,-.5,-.25,0,.25,.5,1,2,4,8,16,32]){let p=d*t/u;p>-.5&&p<.5&&f.push(p)}return[...new Set(f)].sort((d,p)=>d-p)},r=i(n),s=i(e),a=[],o=[],l=[],c=[];for(let u of s)for(let f of r)a.push(f,u,0),o.push(0,0,1),l.push(f+.5,u+.5);for(let u=0;u<s.length-1;u++)for(let f=0;f<r.length-1;f++){let d=u*r.length+f,p=d+1,y=d+r.length,g=y+1;c.push(d,p,g,d,g,y)}let h=new Ft;return h.setAttribute("position",new lt(a,3)),h.setAttribute("normal",new lt(o,3)),h.setAttribute("uv",new lt(l,2)),h.setIndex(c),h.computeBoundingBox(),h.computeBoundingSphere(),h.userData.contactCellScale=t,h}var Gc=class{constructor(e){this.studio=e,this.group=new Xt,this.group.name=Kv,this.uniforms={mirrorTexture:{value:null},mirrorMatrix:{value:new et},mirrorTexel:{value:new ce(1/512,1/512)},mirrorValid:{value:0}},this.material=new pn({color:"#d8dde2",metalness:1,roughness:.045,polygonOffset:!0,polygonOffsetFactor:1,polygonOffsetUnits:4}),this.material.onBeforeCompile=t=>ab(t,this.uniforms),this.material.customProgramCacheKey=()=>"modeler-planar-linear-pbr-v1",this.mesh=new St(new ii(1,1),this.material),this.mesh.rotation.x=-Math.PI/2,this.mesh.name="modeler-observation-mirror",this.mesh.castShadow=!1,this.mesh.receiveShadow=!0,this.group.add(this.mesh),this.group.visible=!1,this.target=null,this.virtualCamera=null,this.floor=null,this.bounds=null,this.spec=null,this.cameraStates=new Map,this.geometryKey=null,this.disposed=!1}updateGeometry(e,t,i){let r=[e,t,i].join(":");if(r===this.geometryKey)return;let s=lb(e,t,i),a=this.mesh.geometry;this.mesh.geometry=s,this.geometryKey=r,a.dispose()}update(e,t){if(this.detach(),this.spec=e,this.bounds=t,!e?.enabled||!t)return this.floor={enabled:!1,mirror:!!e?.mirror,requestedEnabled:e?.requestedEnabled,forcedOff:e?.forcedOff,reason:e?.forcedOff?"diagnostic-mode":t?"disabled":"no-visible-geometry",size:null,position:null},this.floor;let i=gd(t),r=t.min.map((o,l)=>(o+t.max[l])/2),s=e.position?[...e.position]:[r[0],t.min[1]-i*1e-4,r[2]],a=e.size?[...e.size]:[Math.min(Vc,i*128),Math.min(Vc,i*128)];return this.group.position.fromArray(s),this.group.scale.set(a[0],1,a[1]),this.updateGeometry(a[0],a[1],i),this.group.visible=!0,this.material.color.set(e.tint),this.material.metalness=e.mirror?1:e.metalness,this.material.roughness=e.roughness,this.mesh.receiveShadow=!!e.shadow,this.mesh.name=e.mirror?"modeler-observation-mirror":"modeler-observation-matte-floor",this.uniforms.mirrorValid.value=0,this.studio.scene.add(this.group),this.floor={enabled:!0,mirror:!!e.mirror,requestedEnabled:e.requestedEnabled,forcedOff:e.forcedOff,reason:null,type:e.mirror?"planar-pbr":"matte-floor",tint:e.tint,roughness:e.roughness,metalness:this.material.metalness,shadow:!!e.shadow,shadowCatcher:!1,size:a,position:s,finite:!!e.size,depthSeparation:{method:"view-depth-near-and-local-grid",factor:1,units:4},reflection:{method:"linear-planar-over-IBL",roughness:"bounded-five-tap-screen-space",radialFade:!1},coverage:null},this.floor}prepare(e,t=this.bounds){if(!this.floor?.enabled)return{prepared:!1};let i=gd(t),r=this.studio.renderer.getDrawingBufferSize?.(new ce)||new ce(640,480);e.updateMatrixWorld();let s=rb(e,this.floor.position[1],Math.floor(r.x),Math.floor(r.y)),[a,o,l]=this.floor.position;if(!this.spec.size){let _=i*64,x=i*64;for(let E of s)_=Math.max(_,Math.abs(E.x-a)*1.02+i),x=Math.max(x,Math.abs(E.z-l)*1.02+i);let v=Math.max(Vc,i*32768);this.floor.size=[Math.min(v,_*2),Math.min(v,x*2)],this.group.scale.set(this.floor.size[0],1,this.floor.size[1])}let[c,h]=this.floor.size;this.updateGeometry(c,h,i);let u=e.getWorldPosition(new P),f=0;for(let _ of[a-c/2,a+c/2])for(let x of[l-h/2,l+h/2])f=Math.max(f,u.distanceTo(new P(_,o,x)));for(let _ of eb(t))_.y=2*o-_.y,f=Math.max(f,u.distanceTo(_));this.cameraStates.has(e)||this.cameraStates.set(e,{near:e.near,far:e.far,lastNear:null,lastFar:null});let d={near:e.near,far:e.far},p=e.getWorldDirection(new P),y=new P(0,1,0).transformDirection(e.matrixWorld),g=ba(t,{eye:u.toArray(),target:u.clone().add(p).toArray(),up:y.toArray(),projection:e.isOrthographicCamera?"orthographic":"perspective",fov:e.isPerspectiveCamera?e.getEffectiveFOV():void 0,span:e.isOrthographicCamera?(e.top-e.bottom)/e.zoom:void 0,aspect:e.isOrthographicCamera?(e.right-e.left)/(e.top-e.bottom):e.aspect,near:e.near,far:e.far},this.floor);e.near=g.near,e.far=g.far,this.cameraStates.get(e).lastNear=g.near,this.cameraStates.get(e).lastFar=g.far,e.updateProjectionMatrix(),e.updateMatrixWorld(),this.group.updateMatrixWorld(!0);let m=0;for(let _ of s)(Math.abs(_.x-a)>c/2||Math.abs(_.z-l)>h/2)&&m++;return this.floor.coverage={samples:s.length,outside:m,clamped:!this.spec.size&&m>0,size:[c,h],near:e.near,far:e.far,resolved:d},{prepared:!0,floor:this.floor,cameraFar:{resolved:d.far,effective:e.far}}}ensureTarget(){let e=this.studio.renderer.getDrawingBufferSize(new ce),t=Math.min(1,1024/Math.max(e.x,e.y)),i=Math.max(64,Math.round(e.x*t)),r=Math.max(64,Math.round(e.y*t));this.target?.width===i&&this.target?.height===r||(this.target?.dispose(),this.target=new fn(i,r,{type:Gi,format:It,minFilter:Ct,magFilter:Ct,depthBuffer:!0}),this.target.texture.colorSpace=wt,this.target.texture.name="modeler-linear-planar-radiance",this.uniforms.mirrorTexture.value=this.target.texture,this.uniforms.mirrorTexel.value.set(1/i,1/r))}renderReflection(e){if(!this.floor?.enabled||!this.floor.mirror||(this.uniforms.mirrorValid.value=0,e.getWorldPosition(new P).y<=this.floor.position[1]))return;this.ensureTarget();let t=this.studio.renderer,i=this.studio.scene,r=tb(e,this.floor.position[1]);this.virtualCamera=r,this.uniforms.mirrorMatrix.value.copy(Qv).multiply(r.projectionMatrix).multiply(r.matrixWorldInverse).multiply(this.mesh.matrixWorld),nb(r,this.floor.position[1]);let s={target:t.getRenderTarget(),face:t.getActiveCubeFace(),level:t.getActiveMipmapLevel(),viewport:t.getViewport(new Ge),scissor:t.getScissor(new Ge),scissorTest:t.getScissorTest(),clear:t.getClearColor(new ye),alpha:t.getClearAlpha(),auto:t.autoClear,autoColor:t.autoClearColor,autoDepth:t.autoClearDepth,autoStencil:t.autoClearStencil,xr:t.xr.enabled,shadowAuto:t.shadowMap.autoUpdate,background:i.background},a=[];i.traverse(o=>{(o===this.group||o.userData?.observationOverlay||o.userData?.modelerSelectionOverlay||o.name==="Modeler selection"||o.isTransformControls||o.isHelper||o.type.endsWith("Helper")||o.type==="TransformControls"||o.type==="Points")&&(a.push([o,o.visible]),o.visible=!1)});try{i.background=null,t.setClearColor(0,0),t.xr.enabled=!1,t.autoClear=t.autoClearColor=t.autoClearDepth=t.autoClearStencil=!0,t.shadowMap.autoUpdate=!0,t.setRenderTarget(this.target);let o=t.getContext?.();if(o&&o.checkFramebufferStatus(o.FRAMEBUFFER)!==o.FRAMEBUFFER_COMPLETE)throw new Error("Planar reflection HDR framebuffer is unavailable");let l=t.getPixelRatio();t.setViewport(0,0,this.target.width/l,this.target.height/l),t.setScissorTest(!1),t.clear(!0,!0,!0),t.render(i,r),this.uniforms.mirrorValid.value=1,this.floor.reflection={...this.floor.reflection,width:this.target.width,height:this.target.height,colorSpace:"linear",cameraType:r.type,near:r.near,far:r.far}}finally{for(let[o,l]of a)o.visible=l;i.background=s.background,t.setRenderTarget(s.target,s.face,s.level),t.setViewport(s.viewport),t.setScissor(s.scissor),t.setScissorTest(s.scissorTest),t.setClearColor(s.clear,s.alpha),t.autoClear=s.auto,t.autoClearColor=s.autoColor,t.autoClearDepth=s.autoDepth,t.autoClearStencil=s.autoStencil,t.xr.enabled=s.xr,t.shadowMap.autoUpdate=s.shadowAuto}}detach(){this.group.removeFromParent(),this.group.visible=!1,this.uniforms.mirrorValid.value=0,this.floor=null}restore(){for(let[e,t]of this.cameraStates)e.near===t.lastNear&&e.far===t.lastFar&&(e.near=t.near,e.far=t.far,e.updateProjectionMatrix());this.cameraStates.clear(),this.detach()}dispose(){this.disposed||(this.disposed=!0,this.restore(),this.target?.dispose(),this.target=null,this.mesh.geometry.dispose(),this.material.dispose(),this.group.clear())}},yd=n=>new Gc(n);var zs=Object.freeze(["material","clay","normal","final_normal","wire","id","zebra","orientation","roughness","metalness","albedo"]),Bs=Object.freeze(["normal","surface_wireframe","outline"]);var cb=new Set(zs),hb=new Set(Bs),ub=/^#([0-9a-f]{3}|[0-9a-f]{6})$/i,Xc=Object.freeze([256,512,1024,2048,4096]),kt=Object.freeze({maxLights:4,maxIntensity:1e3,maxExposure:100,maxEnvironmentIntensity:10,shadowMapSizes:Xc,maxOverlayTriangles:15e5,maxFloorSpan:1e5,maxOutlinePixels:85e5,maxOutlineIds:2048}),Ma=Object.freeze({color:"#fff1dc",intensity:2.4,position:Object.freeze([4,7,5]),shadows:!0}),wa=Object.freeze({color:"#b9d6ff",intensity:.7,position:Object.freeze([-5,3,2]),shadows:!1}),Sa=Object.freeze({color:"#e9f0ff",intensity:.8,position:Object.freeze([2,4,-6]),shadows:!1}),er=Object.freeze({sky:"#d7e8ff",ground:"#59606c",intensity:.25}),fb=Object.freeze({intensity:1}),Kr=Object.freeze({enabled:!0,mapSize:1024,bias:-1e-4,normalBias:.01}),qt=Object.freeze({enabled:!0,mirror:!0,tint:"#d8dde2",shadow:!0,size:null,position:null,roughness:.045,metalness:1}),At=Object.freeze({background:"#171c24",exposure:1,environment:fb,hemisphere:er,key:Ma,fill:wa,rim:Sa,shadows:Kr,floor:qt});function Dn(n,e){throw new TypeError(n+": "+e)}function db(n,e){return(!n||typeof n!="object"||Array.isArray(n)||![Object.prototype,null].includes(Object.getPrototypeOf(n)))&&Dn(e,"expected a plain object"),n}function Qr(n,e,t){db(n,t);for(let i of Object.keys(n))e.includes(i)||Dn(t,"unsupported field "+i);return n}function tr(n,e,t,i,r=!1){return(typeof n!="number"||!Number.isFinite(n)||n<e||n>t||r&&!Number.isInteger(n))&&Dn(i,"expected "+(r?"an integer":"a finite number")+" from "+e+" to "+t),n}function Os(n,e){return typeof n!="boolean"&&Dn(e,"expected a boolean"),n}function xd(n,e,{min:t=-1e6,max:i=1e6,nonZero:r=!1}={}){(!Array.isArray(n)||n.length!==3)&&Dn(e,"expected three finite components");let s=Array.from(n,(a,o)=>tr(a,t,i,e+"["+o+"]"));return r&&Math.hypot(s[0],s[1],s[2])<1e-9&&Dn(e,"expected a non-zero direction"),s}function Fs(n,e){if(Array.isArray(n))return n.length!==3&&Dn(e,"expected a hex color or three unit RGB components"),"#"+Array.from(n,(s,a)=>tr(s,0,1,e+"["+a+"]")).map(s=>Math.round(s*255).toString(16).padStart(2,"0")).join("");typeof n!="string"&&Dn(e,"expected a hex color or three unit RGB components");let t=ub.exec(n);t||Dn(e,"expected #rgb or #rrggbb");let i=t[1].toLowerCase();return i.length===3&&(i=[...i].map(r=>r+r).join("")),"#"+i}function wi(n,e,t,i,r){return n===void 0?e:tr(n,i,r,t)}function Wc(n,e,t){return Qr(n,["color","intensity","position","shadows"],t),{color:n.color===void 0?e.color:Fs(n.color,t+".color"),intensity:wi(n.intensity,e.intensity,t+".intensity",0,kt.maxIntensity),position:n.position===void 0?[...e.position]:xd(n.position,t+".position",{nonZero:!0}),shadows:n.shadows===void 0?e.shadows:Os(n.shadows,t+".shadows")}}function pb(n,e){return Qr(n,["sky","ground","intensity"],e),{sky:n.sky===void 0?er.sky:Fs(n.sky,e+".sky"),ground:n.ground===void 0?er.ground:Fs(n.ground,e+".ground"),intensity:wi(n.intensity,er.intensity,e+".intensity",0,kt.maxIntensity)}}function mb(n,e){Qr(n,["enabled","mapSize","bias","normalBias"],e);let t=n.mapSize===void 0?Kr.mapSize:tr(n.mapSize,256,4096,e+".mapSize",!0);return Xc.includes(t)||Dn(e+".mapSize","expected one of "+Xc.join(", ")),{enabled:n.enabled===void 0?Kr.enabled:Os(n.enabled,e+".enabled"),mapSize:t,bias:wi(n.bias,Kr.bias,e+".bias",-.01,.01),normalBias:wi(n.normalBias,Kr.normalBias,e+".normalBias",0,1)}}function gb(n,e){return n==null?null:typeof n=="number"?[tr(n,1e-6,kt.maxFloorSpan,e),n]:((!Array.isArray(n)||n.length!==2)&&Dn(e,"expected a positive scalar or [width, depth]"),[tr(n[0],1e-6,kt.maxFloorSpan,e+"[0]"),tr(n[1],1e-6,kt.maxFloorSpan,e+"[1]")])}function yb(n,e,t){Qr(n,["enabled","mirror","tint","shadow","size","position","roughness","metalness"],e);let i=n.enabled===void 0?qt.enabled:Os(n.enabled,e+".enabled"),r=t.floorAllowed;return{requestedEnabled:i,enabled:r?i:!1,forcedOff:!r&&i,mirror:n.mirror===void 0?qt.mirror:Os(n.mirror,e+".mirror"),tint:n.tint===void 0?qt.tint:Fs(n.tint,e+".tint"),shadow:n.shadow===void 0?qt.shadow:Os(n.shadow,e+".shadow"),size:gb(n.size,e+".size"),position:n.position===void 0||n.position===null?null:xd(n.position,e+".position"),roughness:wi(n.roughness,qt.roughness,e+".roughness",0,1),metalness:wi(n.metalness,qt.metalness,e+".metalness",0,1)}}function _d(n,e="normal"){if(!cb.has(n))throw new TypeError("mode: unknown observation mode "+String(n));if(!hb.has(e))throw new TypeError("displayMode: unknown display mode "+String(e));let t=e==="surface_wireframe"||e==="outline",i=e==="normal"&&n==="material";return Object.freeze({mode:n,displayMode:e,display:e,diagnostic:!i,floorAllowed:i,floorPolicy:i?"default-on":"forced-off",whiteClay:t,overlay:e==="surface_wireframe"?"surface-wireframe":e==="outline"?"hard-edges":null,surfaceMode:t?"white-clay":n,legacyWireframe:n==="wire",modeOverride:t})}function vd(n){return{display:n.display,diagnostic:n.diagnostic,floorAllowed:n.floorAllowed,floorPolicy:n.floorPolicy,whiteClay:n.whiteClay,overlay:n.overlay,surfaceMode:n.surfaceMode,modeOverride:n.modeOverride,legacyWireframe:n.legacyWireframe}}function es(n,{mode:e="material",displayMode:t="normal"}={}){let i=_d(e,t),r=n==null?{}:Qr(n,["background","exposure","environment","hemisphere","key","fill","rim","shadows","floor"],"lighting"),s={background:r.background!==void 0,exposure:r.exposure!==void 0,environment:r.environment!==void 0,hemisphere:r.hemisphere!==void 0,key:r.key!==void 0,fill:r.fill!==void 0,rim:r.rim!==void 0,shadows:r.shadows!==void 0,shadowEnabled:r.shadows!==void 0&&r.shadows.enabled!==void 0,shadowNormalBias:r.shadows!==void 0&&r.shadows.normalBias!==void 0,floor:r.floor!==void 0,floorEnabled:r.floor!==void 0&&r.floor.enabled!==void 0},a=r.environment===void 0?{intensity:At.environment.intensity}:(Qr(r.environment,["intensity"],"lighting.environment"),{intensity:wi(r.environment.intensity,At.environment.intensity,"lighting.environment.intensity",0,kt.maxEnvironmentIntensity)});return{schema:"dsh-modeler.observation-lighting",schemaVersion:1,mode:e,displayMode:t,provided:n!=null,explicit:s,policy:vd(i),background:r.background===void 0?At.background:Fs(r.background,"lighting.background"),exposure:wi(r.exposure,At.exposure,"lighting.exposure",0,kt.maxExposure),environment:a,hemisphere:r.hemisphere===void 0?{sky:er.sky,ground:er.ground,intensity:er.intensity}:pb(r.hemisphere,"lighting.hemisphere"),key:r.key===void 0?{...Ma,position:[...Ma.position]}:Wc(r.key,Ma,"lighting.key"),fill:r.fill===void 0?{...wa,position:[...wa.position]}:Wc(r.fill,wa,"lighting.fill"),rim:r.rim===void 0?{...Sa,position:[...Sa.position]}:Wc(r.rim,Sa,"lighting.rim"),shadows:r.shadows===void 0?{...Kr}:mb(r.shadows,"lighting.shadows"),floor:r.floor===void 0?{requestedEnabled:qt.enabled,enabled:i.floorAllowed?qt.enabled:!1,forcedOff:!i.floorAllowed&&qt.enabled,mirror:qt.mirror,tint:qt.tint,shadow:qt.shadow,size:null,position:null,roughness:qt.roughness,metalness:qt.metalness}:yb(r.floor,"lighting.floor",i)}}function ks(n,{mode:e=n?.mode,displayMode:t=n?.displayMode}={}){if(n?.schema!=="dsh-modeler.observation-lighting")return es(n,{mode:e||"material",displayMode:t||"normal"});let i=_d(e,t),r=n.floor?.requestedEnabled!==void 0?n.floor.requestedEnabled:n.floor?.enabled!==void 0?n.floor.enabled:qt.enabled;return{...n,mode:e,displayMode:t,policy:vd(i),floor:{...n.floor,requestedEnabled:r,enabled:i.floorAllowed?r:!1,forcedOff:!i.floorAllowed&&r}}}function bd(n,e=null,{mode:t,displayMode:i}={}){let r=n?.schema==="dsh-modeler.observation-lighting"?ks(n,{mode:t||n.mode,displayMode:i||n.displayMode}):es(n,{mode:t||n?.mode||"material",displayMode:i||n?.displayMode||"normal"}),s=r.policy,a=r.explicit||{},o=e?.mode==="stage",c=(o&&Array.isArray(e.lights)?e.lights:[]).filter(M=>String(M?.name||"").startsWith("modeler-stage-")),h=o&&String(e.hemisphere?.name||"").startsWith("modeler-stage-")?e.hemisphere:null,u=!!(a.key||a.fill||a.rim||a.hemisphere),f=o&&(c.length||h||e.authoredFields?.includes("lights")||e.authoredFields?.includes("hemisphere")),d=u?"observation":f?"asset-stage":"studio-default",p=o&&e.floor||null,y;s.floorAllowed?a.floor?y={enabled:r.floor.enabled,source:"observation",spec:r.floor}:p?y={enabled:!0,source:"asset-stage",spec:p}:y={enabled:r.floor.enabled,source:"observation-default",spec:r.floor}:y={enabled:!1,source:"display-mode"};let g=s.floorAllowed?a.background?{value:r.background,source:"transient"}:o&&e.background!==void 0?{value:e.background,source:"asset-stage"}:{value:At.background,source:"default"}:{value:a.background?r.background:At.background,source:"diagnostic-flat"},m=a.exposure?r.exposure:o?e.exposure??At.exposure:At.exposure,_=a.shadowEnabled?r.shadows.enabled:o?!!e.shadows:At.shadows.enabled,x=o&&Number.isFinite(e.environmentIntensity)?e.environmentIntensity:At.environment.intensity,v=a.environment?r.environment.intensity:null,E=v===null?x:v,w=d==="asset-stage"?{source:"asset-stage",hemisphere:e.hemisphere||null,lights:c,key:null,fill:null,rim:null}:{source:d==="observation"?"transient-observation":"studio-default",hemisphere:r.hemisphere,key:r.key,fill:r.fill,rim:r.rim,lights:[]};return{schema:"dsh-modeler.observation-plan",schemaVersion:1,mode:r.mode,displayMode:r.displayMode,policy:s,stage:{active:o,mode:e?.mode||"default"},background:g,exposure:m,environment:{base:x,override:v,effective:E,source:a.environment?"transient":o?"asset-stage":"default"},shadows:{enabled:_,mapSize:r.shadows.mapSize,bias:r.shadows.bias,normalBias:r.shadows.normalBias,source:a.shadowEnabled?"transient":o?"asset-stage":"default"},lightOwner:d,lights:w,floor:y,explicit:a}}var Ea=["hemisphere","key","fill","rim"],Ed=["key","fill","rim"],Md={wireframe:"#26303c",outline:"#16202e"};function xb(n){return Array.isArray(n)?n:[n]}function _b(n){return!n||!Array.isArray(n.min)||!Array.isArray(n.max)||n.min.length!==3||n.max.length!==3||![...n.min,...n.max].every(Number.isFinite)?null:{min:n.min.slice(),max:n.max.slice()}}function vb(n){return n?Math.max(n.max[0]-n.min[0],n.max[1]-n.min[1],n.max[2]-n.min[2],1e-6):1}function bb(n){return n?[(n.min[0]+n.max[0])/2,(n.min[1]+n.max[1])/2,(n.min[2]+n.max[2])/2]:[0,1,0]}function Mb(n){if(n.lights&&Ea.some(i=>n.lights[i]))return n.lights;let e={hemisphere:null,key:null,fill:null,rim:null},t=[];for(let i of n.defaultLights||[]){let r=i.userData?.observationRole;r&&Ea.includes(r)?e[r]=i:i.isHemisphereLight?e.hemisphere||=i:i.isDirectionalLight&&t.push(i)}for(let[i,r]of Ed.entries())e[r]||=t[i]||null;return e}function wb(n){let e=n.shadow;return{light:n,color:n.color?.clone?.()||null,groundColor:n.groundColor?.clone?.()||null,intensity:n.intensity,visible:n.visible,position:n.position?.clone?.()||null,castShadow:n.castShadow,target:n.target||null,shadow:e?{mapSize:e.mapSize.clone(),bias:e.bias,normalBias:e.normalBias,camera:{near:e.camera.near,far:e.camera.far,...e.camera.isOrthographicCamera?{left:e.camera.left,right:e.camera.right,top:e.camera.top,bottom:e.camera.bottom}:{}}}:null}}function Sb(n){let{light:e}=n;if(n.color&&e.color.copy(n.color),n.groundColor&&e.groundColor&&e.groundColor.copy(n.groundColor),e.intensity=n.intensity,e.visible=n.visible,n.position&&e.position.copy(n.position),e.castShadow=n.castShadow,e.target=n.target,!e.shadow||!n.shadow)return;let t=e.shadow,i=n.shadow;t.map&&(t.mapSize.x!==i.mapSize.x||t.mapSize.y!==i.mapSize.y)&&(t.map.dispose(),t.map=null),t.mapSize.copy(i.mapSize),t.bias=i.bias,t.normalBias=i.normalBias,t.camera.isOrthographicCamera&&i.camera.left!==void 0&&(t.camera.left=i.camera.left,t.camera.right=i.camera.right,t.camera.top=i.camera.top,t.camera.bottom=i.camera.bottom),t.camera.near=i.camera.near,t.camera.far=i.camera.far,t.camera.updateProjectionMatrix(),t.needsUpdate=!0}function qc(n,e,t){n.traverse(i=>{for(let r of xb(i.material))!r||typeof r.envMapIntensity!="number"||!Number.isFinite(r.envMapIntensity)||(t.has(r)||t.set(r,r.envMapIntensity),r.envMapIntensity=e)})}var $c=class{constructor(e){this.studio=e,this.lights=Mb(e),this.planarFloor=yd(e),this.state=null,this.actual=null,this.overlays=[],this.environmentMaterials=new Map,this.hidden=[],this.targets=null,this.cameraStates=new Map,this.disposed=!1}captureState(){return{background:this.studio.scene.background,exposure:this.studio.renderer.toneMappingExposure,shadowEnabled:this.studio.renderer.shadowMap.enabled,shadowType:this.studio.renderer.shadowMap.type,lights:(()=>{let e=[];return this.studio.scene.traverse(t=>{t.isLight&&e.push(wb(t))}),e})()}}clearOverlays(){for(let e of this.overlays)e.line.removeFromParent(),e.geometry.dispose(),e.material.dispose();this.overlays=[]}hideWhere(e){this.studio.scene.traverse(t=>{e(t)&&(this.hidden.push([t,t.visible]),t.visible=!1)})}restore(){if(this.state){this.clearOverlays(),this.planarFloor.restore();for(let[e,t]of this.cameraStates)e.near=t.near,e.far=t.far,e.updateProjectionMatrix();this.cameraStates.clear();for(let[e,t]of this.hidden)e.visible=t;this.hidden=[];for(let[e,t]of this.environmentMaterials)e.envMapIntensity=t;this.environmentMaterials.clear();for(let e of this.state.lights)Sb(e);this.studio.scene.background=this.state.background,this.studio.renderer.toneMappingExposure=this.state.exposure,this.studio.renderer.shadowMap.enabled=this.state.shadowEnabled,this.studio.renderer.shadowMap.type=this.state.shadowType,this.targets?.removeFromParent(),this.targets?.clear(),this.targets=null,this.state=null,this.actual=null}}defaultLights(e,t,i){this.hideWhere(a=>a.isLight&&String(a.name).startsWith("modeler-stage-"));let r=bb(i);this.targets=new Xt,this.targets.name="modeler-observation-targets",this.studio.scene.add(this.targets);for(let a of Ed){let o=this.lights[a],l=e[a];if(!o)continue;o.visible=!0,o.color.set(l.color),o.intensity=l.intensity,o.position.fromArray(r.map((h,u)=>h+l.position[u]));let c=new Et;c.position.fromArray(r),this.targets.add(c),o.target=c,o.castShadow=t.shadows.enabled&&l.shadows}let s=this.lights.hemisphere;s&&(s.visible=!0,s.color.set(e.hemisphere.sky),s.groundColor.set(e.hemisphere.ground),s.intensity=e.hemisphere.intensity)}fitShadows(e,t){if(!t)return;let i=vb(t),r=[];for(let s of[t.min[0],t.max[0]])for(let a of[t.min[1],t.max[1]])for(let o of[t.min[2],t.max[2]])r.push(new P(s,a,o));this.studio.scene.updateMatrixWorld(!0),this.studio.scene.traverseVisible(s=>{if(!s.isLight||!s.shadow||!s.castShadow)return;let a=s.shadow;if(a.map&&a.mapSize.x!==e.shadows.mapSize&&(a.dispose(),a.map=null,a.mapPass=null),a.mapSize.set(e.shadows.mapSize,e.shadows.mapSize),a.bias=e.shadows.bias,a.normalBias=e.explicit.shadowNormalBias?e.shadows.normalBias:i*.001,s.isDirectionalLight){a.updateMatrices(s);let o=new dn;for(let h of r)o.expandByPoint(h.clone().applyMatrix4(a.camera.matrixWorldInverse));let l=i*.08,c=a.camera;c.left=o.min.x-l,c.right=o.max.x+l,c.bottom=o.min.y-l,c.top=o.max.y+l,c.near=-o.max.z-l,c.far=-o.min.z+l,c.updateProjectionMatrix()}a.needsUpdate=!0})}buildOverlays(e,t){let i=e.policy;if(!i.overlay)return{kind:null,lines:0,triangles:0,skipped:null};let r=0;for(let a of t){if(!a?.isMesh||!a.visible)continue;let o=a.geometry?.getAttribute("position");o&&(r+=(a.geometry.index?.count??o.count)/3)}if(r>kt.maxOverlayTriangles)return{kind:i.overlay,lines:0,triangles:r,limit:kt.maxOverlayTriangles,skipped:"triangle-budget"};let s=0;for(let a of t){if(!a?.isMesh||!a.visible||!a.geometry)continue;let o=null;try{if(o=i.overlay==="surface-wireframe"?new aa(a.geometry):new sa(a.geometry,28),!o.getAttribute("position")?.count){o.dispose();continue}let l=new vi({color:i.overlay==="surface-wireframe"?Md.wireframe:Md.outline,transparent:!0,opacity:i.overlay==="surface-wireframe"?.55:.86,depthTest:!0,depthWrite:!1,toneMapped:!1}),c=new qi(o,l);c.name="modeler-observation-"+i.overlay,c.renderOrder=3,c.userData.observationOverlay=i.overlay,c.raycast=()=>{},a.add(c),this.overlays.push({mesh:a,line:c,geometry:o,material:l}),s++}catch(l){throw o?.dispose(),l}}return{kind:i.overlay,lines:s,triangles:r,limit:kt.maxOverlayTriangles,skipped:null}}actualLights(e){let t=new Set(Ea.map(r=>this.lights[r]).filter(Boolean)),i=[];return this.studio.scene.traverseVisible(r=>{if(!r.isLight)return;let s=Ea.find(l=>this.lights[l]===r)||null,a=t.has(r)?e?.lightOwner==="observation"?"observation":"studio-default":"asset-stage",o=r.shadow?{mapSize:r.shadow.mapSize.toArray(),bias:r.shadow.bias,normalBias:r.shadow.normalBias}:null;r.isHemisphereLight?i.push({role:s,name:r.name||null,source:a,type:"hemisphere",sky:"#"+r.color.getHexString(),ground:"#"+r.groundColor.getHexString(),intensity:r.intensity,visible:r.visible}):i.push({role:s,name:r.name||null,source:a,type:r.type,color:"#"+r.color.getHexString(),intensity:r.intensity,position:r.position.toArray(),castShadow:r.castShadow,shadow:o,visible:r.visible})}),i}apply(e,{mode:t="material",displayMode:i="normal",bounds:r=null,meshes:s=[],stage:a=null}={}){if(this.disposed)throw new Error("Observation stage disposed");this.restore(),this.state=this.captureState();let o=e?.schema==="dsh-modeler.observation-lighting"?ks(e,{mode:t,displayMode:i}):es(e,{mode:t,displayMode:i}),l=bd(o,a,{mode:t,displayMode:i}),c=this.studio;try{typeof l.background.value=="string"?c.scene.background=new ye(l.background.value):l.background.value===null&&(c.scene.background=null),c.renderer.toneMappingExposure=l.exposure,c.renderer.shadowMap.enabled=l.shadows.enabled,c.renderer.shadowMap.type=bi,l.lightOwner!=="asset-stage"&&this.defaultLights(o,l,r),this.fitShadows(l,r);let h,u=null;if(l.floor.source==="asset-stage"){u=c.scene.getObjectByName("modeler-stage-floor");let y=l.floor.spec;h={...y,enabled:!0,source:"asset-stage",type:"asset-stage-floor",mirror:!1,tint:y.color,shadow:y.shadow!==!1,forcedOff:!1,requestedEnabled:!0}}else this.hideWhere(y=>y.name==="modeler-stage-floor"),h=this.planarFloor.update({...l.floor.spec||o.floor,enabled:l.floor.enabled},_b(r)),h.source=l.floor.source;qc(c.root,l.environment.effective,this.environmentMaterials),this.planarFloor.group.parent&&qc(this.planarFloor.group,l.environment.effective,this.environmentMaterials),u&&qc(u,l.environment.effective,this.environmentMaterials);let f=this.actualLights(l),d=this.buildOverlays(o,s),p=c.environmentHandle;return this.actual={schema:"dsh-modeler.observation-stage",schemaVersion:2,mode:t,displayMode:i,policy:o.policy,plan:l,background:c.scene.background?.isColor?"#"+c.scene.background.getHexString():l.background.value,exposure:c.renderer.toneMappingExposure,lights:f,shadows:{...l.shadows,enabled:c.renderer.shadowMap.enabled,type:"PCFSoftShadowMap",castLights:f.filter(y=>y.castShadow).map(y=>y.name)},environment:{...l.environment,map:c.environmentSource,appliedIntensity:l.environment.effective,adjustedMaterials:this.environmentMaterials.size,actualMaterialIntensities:[...new Set([...this.environmentMaterials.keys()].map(y=>y.envMapIntensity))],...p?{radiance:{width:p.textureWidth,height:p.textureHeight,estimatedBytes:p.estimatedBytes,input:p.input}}:{}},floor:h,overlays:d,lightOwner:l.lightOwner,stage:{active:l.stage.active,lightOwner:l.lightOwner,stageLightsHidden:this.hidden.filter(([y])=>y.isLight).length,stageFloorHidden:this.hidden.filter(([y])=>y.name==="modeler-stage-floor").length},transient:!0},this.actual}catch(h){throw this.restore(),h}}prepareCamera(e,t){if(this.planarFloor.floor?.enabled){let i=this.planarFloor.prepare(e,t);return this.planarFloor.renderReflection(e),i}if(this.actual?.floor?.enabled&&t){this.cameraStates.has(e)||this.cameraStates.set(e,{near:e.near,far:e.far});let i=e.getWorldPosition(new P),r=e.getWorldDirection(new P),s=new P(0,1,0).transformDirection(e.matrixWorld),a=ba(t,{eye:i.toArray(),target:i.clone().add(r).toArray(),up:s.toArray(),projection:e.isOrthographicCamera?"orthographic":"perspective",fov:e.isPerspectiveCamera?e.getEffectiveFOV():void 0,span:e.isOrthographicCamera?(e.top-e.bottom)/e.zoom:void 0,aspect:e.isOrthographicCamera?(e.right-e.left)/(e.top-e.bottom):e.aspect,near:e.near,far:e.far},this.actual.floor);e.near=a.near,e.far=a.far,e.updateProjectionMatrix()}return{prepared:!1}}dispose(){this.disposed||(this.restore(),this.planarFloor.dispose(),this.disposed=!0)}},Eb=n=>new $c(n);function Ad(n,e,t={}){return n.observation||(n.observation=Eb(n)),n.observation.apply(e,t)}function Aa(n){n?.observation&&(n.observation.dispose(),delete n.observation)}var Yc=Object.freeze({r:22/255,g:32/255,b:46/255}),Ab=.9,Tb=`
#include <common>
#include <clipping_planes_pars_vertex>
void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <clipping_planes_vertex>
}
`,Rb=`
#include <common>
#include <clipping_planes_pars_fragment>
uniform vec3 idColor;
void main() {
  #include <clipping_planes_fragment>
  gl_FragColor = vec4(idColor, 1.0);
}
`,Cb=`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,Ib=`
uniform sampler2D tId;
uniform vec2 resolution;
uniform vec3 edgeColor;
uniform float opacity;
varying vec2 vUv;
float idDelta(vec3 a, vec3 b) {
  return max(max(abs(a.r - b.r), abs(a.g - b.g)), abs(a.b - b.b));
}
void main() {
  vec3 center = texture2D(tId, vUv).rgb;
  // Do not paint the empty background side of a silhouette; the lit object
  // side gets a 1px inner outline.
  if (dot(center, center) < 0.000001) discard;
  vec2 stepUv = 1.0 / resolution;
  float edge = 0.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      if (x == 0 && y == 0) continue;
      vec3 neighbour = texture2D(tId, vUv + vec2(float(x), float(y)) * stepUv).rgb;
      edge = max(edge, step(0.5 / 255.0, idDelta(center, neighbour)));
    }
  }
  if (edge < 0.5) discard;
  gl_FragColor = vec4(edgeColor, opacity);
}
`;function Pb(n){if(!Number.isInteger(n)||n<0||n>16777215)throw new RangeError("outline color index must be 0..16777215");return{r:(n>>16&255)/255,g:(n>>8&255)/255,b:(n&255)/255}}function wd(n){let e=n?.userData||{},t=e.editableId??e.semanticId??e.sourceId??e.part?.editableId??e.part?.id??n?.name??n?.uuid??"";return String(t||"")}function Sd(n){for(let e=n;e;e=e.parent)if(!e.visible)return!1;return!0}var jc=class{constructor(e){if(!e?.scene?.isScene||!e.renderer)throw new TypeError("outline studio requires a Three scene and renderer");this.studio=e,this.target=null,this.disposed=!1,this.nextIndex=1,this.freeIndices=[],this.idEntries=new Map,this.wrappers=new Map,this.last=null,this.idScene=new Xi,this.edgeScene=new Xi,this.edgeCamera=new _i(-1,1,1,-1,0,1),this.edgeMaterial=new wn({uniforms:{tId:{value:null},resolution:{value:new ce(1,1)},edgeColor:{value:new P(Yc.r,Yc.g,Yc.b)},opacity:{value:Ab}},vertexShader:Cb,fragmentShader:Ib,transparent:!0,depthTest:!1,depthWrite:!1,toneMapped:!1}),this.edgeMaterial.name="modeler-outline-edge",this.quad=new St(new ii(2,2),this.edgeMaterial),this.quad.frustumCulled=!1,this.quad.renderOrder=1e4,this.edgeScene.add(this.quad)}ensureTarget(e,t){if(!Number.isInteger(e)||!Number.isInteger(t)||e<1||t<1)throw new RangeError("outline target size must be positive integers");return this.target&&this.target.width===e&&this.target.height===t?this.target:(this.target?.dispose(),this.target=new fn(e,t,{minFilter:vt,magFilter:vt,format:It,type:bn,depthBuffer:!0,stencilBuffer:!1,generateMipmaps:!1}),this.target.texture.colorSpace=wt,this.target.texture.name="modeler-outline-id",this.edgeMaterial.uniforms.tId.value=this.target.texture,this.edgeMaterial.uniforms.resolution.value.set(e,t),this.target)}ensureIdMaterial(e){let t=this.idEntries.get(e);if(t)return t;if(this.idEntries.size>=kt.maxOutlineIds)throw Object.assign(new RangeError("outline semantic id budget exceeded"),{code:"outline_id_budget"});let i=this.freeIndices.length?this.freeIndices.pop():this.nextIndex++;if(i>16777215)throw Object.assign(new RangeError("outline semantic id space exhausted"),{code:"outline_id_budget"});let r=Pb(i),s=new wn({uniforms:{idColor:{value:new P(r.r,r.g,r.b)}},vertexShader:Tb,fragmentShader:Rb,depthTest:!0,depthWrite:!0,side:Qt,toneMapped:!1,clipping:!0});return s.name="modeler-outline-id-"+i,t={index:i,color:r,material:s},this.idEntries.set(e,t),t}liveKeys(e){let t=new Set;for(let i of e){if(!i?.isMesh)continue;let r=wd(i);r&&t.add(r)}return t}pruneIds(e){for(let[t,i]of this.idEntries)e.has(t)||(i.material.dispose(),this.freeIndices.push(i.index),this.idEntries.delete(t));for(let[t,i]of this.wrappers)e.has(i.userData.outlineKey)||(i.removeFromParent(),this.wrappers.delete(t))}updateWrappers(e){let t=this.liveKeys(e);this.pruneIds(t);let i=new Set;for(let r of e){if(!r?.isMesh||!Sd(r)||!r.geometry)continue;let s=wd(r);if(!s)continue;let a=this.ensureIdMaterial(s),o=this.wrappers.get(r.uuid);o||(o=new St(r.geometry,a.material),o.matrixAutoUpdate=!1,o.frustumCulled=!1,o.layers.mask=r.layers.mask,this.idScene.add(o),this.wrappers.set(r.uuid,o)),o.geometry=r.geometry,o.material=a.material,o.userData.outlineKey=s,o.layers.mask=r.layers.mask,o.matrix.copy(r.matrixWorld),o.matrixWorld.copy(r.matrixWorld),o.matrixWorldNeedsUpdate=!1,o.visible=!0,i.add(r.uuid)}for(let[r,s]of this.wrappers)i.has(r)||(s.removeFromParent(),this.wrappers.delete(r));return this.wrappers.size}render(e,t=[]){if(this.disposed)return{applied:!1,reason:"disposed"};let i=this.studio.renderer;if(i.render(this.studio.scene,e),this.pruneIds(this.liveKeys(t)),t.every(E=>!E?.isMesh||!Sd(E)))return{applied:!1,reason:"no-visible-meshes"};let r=i.getDrawingBufferSize(new ce),s=Math.max(0,Math.floor(r.x))*Math.max(0,Math.floor(r.y));if(s<1)return{applied:!1,reason:"empty-viewport"};if(s>kt.maxOutlinePixels)return{applied:!1,reason:"pixel-budget",pixels:{width:r.x,height:r.y,total:s},limit:kt.maxOutlinePixels};try{if(this.updateWrappers(t),!this.wrappers.size)return{applied:!1,reason:"no-visible-meshes"}}catch(E){return{applied:!1,reason:E.code==="outline_id_budget"?"id-budget":"id-error",error:String(E.message||E).slice(0,512),limit:kt.maxOutlineIds}}let a=Math.floor(r.x),o=Math.floor(r.y),l=typeof i.getPixelRatio=="function"?i.getPixelRatio():1,c=a/l,h=o/l;this.ensureTarget(a,o);let u=i.getRenderTarget(),f=i.getActiveCubeFace(),d=i.getActiveMipmapLevel(),p=i.autoClear,y=i.xr.enabled,g=i.getClearColor(new ye),m=i.getClearAlpha(),_=i.getViewport(new Ge),x=i.getScissor(new Ge),v=i.getScissorTest();try{i.setRenderTarget(this.target),i.setClearColor(0,1),i.autoClear=!0,i.xr.enabled=!1,i.setViewport(0,0,c,h),i.setScissor(0,0,c,h),i.setScissorTest(!1),i.clear(!0,!0,!0),i.render(this.idScene,e),i.setRenderTarget(u),i.autoClear=!1,i.setViewport(0,0,c,h),i.setScissor(0,0,c,h),i.setScissorTest(!1),i.render(this.edgeScene,this.edgeCamera);let E={applied:!0,displayMode:"outline",pixels:{width:a,height:o,total:s},ids:this.idEntries.size,wrappers:this.wrappers.size,edge:{method:"3x3-id-depth",width:1}};return this.last=E,E}catch(E){let w={applied:!1,reason:"outline-error",error:String(E.message||E).slice(0,512)};return this.last=w,w}finally{i.setRenderTarget(u,f,d),i.setClearColor(g,m),i.autoClear=p,i.xr.enabled=y,i.setViewport(_),i.setScissor(x),i.setScissorTest(v)}}stats(){return{disposed:this.disposed,target:this.target?{width:this.target.width,height:this.target.height}:null,ids:this.idEntries.size,wrappers:this.wrappers.size,indexCursor:this.nextIndex,freeIds:this.freeIndices.length,maxPixels:kt.maxOutlinePixels,maxIds:kt.maxOutlineIds}}dispose(){if(!this.disposed){this.disposed=!0,this.target?.dispose(),this.target=null;for(let e of this.idEntries.values())e.material.dispose();this.idEntries.clear(),this.freeIndices.length=0,this.wrappers.clear(),this.idScene.clear(),this.edgeMaterial.uniforms.tId.value=null,this.edgeMaterial.dispose(),this.quad.geometry.dispose(),this.edgeScene.clear()}}};function Lb(n){return new jc(n)}function Td(n,e,t=[],i="normal",r=null,s=null){if(!n?.scene?.isScene||!n.renderer||!e)throw new TypeError("Studio, renderer and camera required");return n.observation?.actual&&n.observation.prepareCamera(e,s||n.observation.planarFloor.bounds),i!=="outline"?(n.renderer.render(n.scene,e),{applied:!1,displayMode:i,reason:"not-outline"}):((!n.outline||n.outline.disposed)&&(n.outline=Lb(n)),n.outline.render(e,t))}function Rd(n){n?.outline&&(n.outline.dispose(),delete n.outline)}var Cd="studio-radiance-v3",Id=Object.freeze([256,128]),Db=[{direction:new P(-.85,.85,.8).normalize(),spread:.46,strength:1.1},{direction:new P(1,.55,.5).normalize(),spread:.58,strength:.65},{direction:new P(.1,1,-.8).normalize(),spread:.63,strength:.42}];function Nb(n){let e=new P(...n).normalize(),t=(e.y+1)*.5,r=.045+.36*(t*t*(3-2*t));for(let s of Db)r+=s.strength*Math.exp((e.dot(s.direction)-1)/(s.spread*s.spread));return[r,r,r]}function Ub(){let[n,e]=Id,t=new Float32Array(n*e*4);for(let i=0;i<e;i++){let r=((i+.5)/e-.5)*Math.PI;for(let s=0;s<n;s++){let a=((s+.5)/n-.5)*Math.PI*2,o=Nb([Math.cos(r)*Math.cos(a),Math.sin(r),Math.cos(r)*Math.sin(a)]);t.set([...o,1],(i*n+s)*4)}}return t}function Pd(n){if(!n?.isWebGLRenderer)throw new TypeError("Studio environment requires WebGLRenderer");let e=performance.now(),[t,i]=Id,r=new Br(Ub(),t,i,It,kn);r.name=Cd,r.colorSpace=wt,r.wrapS=Hi,r.wrapT=un,r.minFilter=r.magFilter=Ct,r.needsUpdate=!0;let s={target:n.getRenderTarget(),face:n.getActiveCubeFace(),level:n.getActiveMipmapLevel(),viewport:n.getViewport(new Ge),scissor:n.getScissor(new Ge),scissorTest:n.getScissorTest(),clear:n.getClearColor(new ye),alpha:n.getClearAlpha(),tone:n.toneMapping,exposure:n.toneMappingExposure,autoClear:n.autoClear},a,o;try{a=new zr(n),o=a.fromEquirectangular(r)}catch(c){throw r.dispose(),c}finally{a?.dispose(),n.setRenderTarget(s.target,s.face,s.level),n.setViewport(s.viewport),n.setScissor(s.scissor),n.setScissorTest(s.scissorTest),n.setClearColor(s.clear,s.alpha),n.toneMapping=s.tone,n.toneMappingExposure=s.exposure,n.autoClear=s.autoClear}let l=!1;return{source:Cd,texture:o.texture,sourceTexture:r,textureWidth:o.width,textureHeight:o.height,estimatedBytes:o.width*o.height*8+t*i*16,buildMs:+(performance.now()-e).toFixed(2),input:{width:t,height:i,type:"FloatType",colorSpace:"linear",verticalOrder:"south-to-north"},dispose(){l||(l=!0,o.dispose(),r.dispose())}}}var Ob=Object.freeze({maxVertices:1e6,maxTriangles:1e6,maxObjects:1e4,maxCoordinate:1e12});function j(n,e){return new Error(`${n}: ${e}`)}function ht(...n){let e={...Ob};for(let t of n)if(t!=null){if(typeof t!="object"||Array.isArray(t))throw j("budget","expected an object");for(let i of Object.keys(t)){if(!(i in e))throw j("budget",`unknown limit ${i}`);let r=t[i];if(!Number.isFinite(r)||r<=0||i!=="maxCoordinate"&&!Number.isSafeInteger(r))throw j("budget",`${i} must be a positive ${i==="maxCoordinate"?"number":"integer"}`);e[i]=Math.min(e[i],r)}}return e}function Le(n,e,t,i="mesh"){if(!Number.isSafeInteger(n)||!Number.isSafeInteger(e)||n>t.maxVertices||e>t.maxTriangles)throw j(i,`budget exceeded (vertices ${n}/${t.maxVertices}, triangles ${e}/${t.maxTriangles})`)}var Zc=n=>Array.isArray(n)||ArrayBuffer.isView(n)&&!(n instanceof DataView);function tt(n,{budget:e,operator:t="topology"}={}){let i=ht(e);if(!n||!Zc(n.vertices)||!Zc(n.indices))throw j(t,"expected {vertices: flat xyz, indices: flat triangle indices}");if(n.vertices.length%3||n.indices.length%3)throw j(t,"vertices and indices lengths must be multiples of three");let r=n.vertices.length/3;Le(r,n.indices.length/3,i,t);for(let s=0;s<n.vertices.length;s++)if(!Number.isFinite(n.vertices[s])||Math.abs(n.vertices[s])>i.maxCoordinate)throw j(t,`invalid/non-finite coordinate at ${s}`);for(let s=0;s<n.indices.length;s++)if(!Number.isSafeInteger(n.indices[s])||n.indices[s]<0||n.indices[s]>=r)throw j(t,`invalid vertex index at ${s}`);return{vertices:Array.from(n.vertices),indices:Array.from(n.indices)}}function Hs(n,e=1e-7,t={}){typeof e=="object"&&e!==null&&(t=e,e=t.tolerance??1e-7);let i="indexMesh",r=ht(t.budget);if(!Zc(n)||n.length%9)throw j(i,"positions must be flat unindexed triangles (length multiple of nine)");if(!Number.isFinite(e)||e<0)throw j(i,"tolerance must be finite and non-negative");Le(0,n.length/9,r,i);let s=[],a=[],o=new Map,l=(c,h,u)=>`${c}|${h}|${u}`;for(let c=0;c<n.length;c+=3){let h=n[c],u=n[c+1],f=n[c+2];if(![h,u,f].every(p=>Number.isFinite(p)&&Math.abs(p)<=r.maxCoordinate))throw j(i,`invalid/non-finite coordinate at ${c}`);let d=-1;if(e===0){let p=l(h,u,f);o.has(p)?d=o.get(p):(d=s.length/3,s.push(h,u,f),o.set(p,d))}else{let p=Math.floor(h/e),y=Math.floor(u/e),g=Math.floor(f/e);if(![p,y,g].every(Number.isSafeInteger))throw j(i,"coordinate/tolerance ratio exceeds safe welding precision; increase tolerance or use zero for exact welding");e:for(let m=-1;m<=1;m++)for(let _=-1;_<=1;_++)for(let x=-1;x<=1;x++){let v=o.get(l(p+m,y+_,g+x));if(v){for(let E of v)if(Math.hypot(s[E*3]-h,s[E*3+1]-u,s[E*3+2]-f)<=e){d=E;break e}}}if(d<0){d=s.length/3,s.push(h,u,f);let m=l(p,y,g),_=o.get(m);_?_.push(d):o.set(m,[d])}}s.length/3>r.maxVertices&&Le(s.length/3,n.length/9,r,i),a.push(d)}return{vertices:s,indices:a}}function Jc(n){let e=new Array(n.indices.length*3);for(let t=0;t<n.indices.length;t++)for(let i=0;i<3;i++)e[t*3+i]=n.vertices[n.indices[t]*3+i];return e}function nr(n,e,t,i){let r=n[t*3]-n[e*3],s=n[t*3+1]-n[e*3+1],a=n[t*3+2]-n[e*3+2],o=n[i*3]-n[e*3],l=n[i*3+1]-n[e*3+1],c=n[i*3+2]-n[e*3+2];return[s*c-a*l,a*o-r*c,r*l-s*o]}function ts(n,e="topology",t=null){let i=new Map;for(let r=0;r<n.indices.length/3;r++){if(t&&!t.has(r))continue;let s=n.indices.slice(r*3,r*3+3);for(let a=0;a<3;a++){let o=s[a],l=s[(a+1)%3],c=s[(a+2)%3];if(o===l)throw j(e,`degenerate edge on face ${r}`);let h=o<l?`${o}|${l}`:`${l}|${o}`;i.has(h)||i.set(h,[]);let u=i.get(h);if(u.push({a:o,b:l,opposite:c,face:r}),u.length>2)throw j(e,`non-manifold edge ${h}`);if(u.length===2&&u[0].a===o)throw j(e,`inconsistent winding on edge ${h}`)}}return i}function Vs(n,e="normals",t=!1){let i=new Array(n.vertices.length).fill(0);for(let r=0;r<n.indices.length;r+=3){let s=n.indices.slice(r,r+3),a=nr(n.vertices,...s);if(!a.every(Number.isFinite))throw j(e,"normal overflow");if(t&&Math.hypot(...a)===0)throw j(e,`zero-area face ${r/3}`);for(let o of s)for(let l=0;l<3;l++)i[o*3+l]+=a[l]}for(let r=0;r<i.length;r+=3){let s=Math.hypot(i[r],i[r+1],i[r+2]);if(!Number.isFinite(s))throw j(e,"normal overflow");if(t&&s===0)throw j(e,`undefined normal at vertex ${r/3}`);if(s)for(let a=0;a<3;a++)i[r+a]/=s}return i}var Fb=Number.isFinite;function Gs(n,e,t,i=!1){if(!Array.isArray(n)||n.length!==e||n.some(r=>!Fb(r)||i&&!Number.isSafeInteger(r)))throw Error("nativeMesh "+t+" has invalid shape/values");return n.slice()}function Ld(n,e={}){if(n?.schemaVersion!==1||!n.source||typeof n.source.type!="string"||!Array.isArray(n.features)||!n.mesh)throw Error("nativeMesh needs a materialized source/feature document");let t=n.mesh,i=tt(t,{budget:ht(e),operator:"nativeMesh"}),r=i.indices.length;t.cornerNormals!==void 0&&(i.cornerNormals=Gs(t.cornerNormals,r*3,"cornerNormals")),t.cornerUV?.length&&(i.cornerUV=Gs(t.cornerUV,r*2,"cornerUV")),t.cornerDetailUV?.length&&(i.cornerDetailUV=Gs(t.cornerDetailUV,r*2,"cornerDetailUV"));for(let s of["triangleMaterialIndices","triangleFaceIds","triangleSourceFaceIds","triangleInstanceIndices"])t[s]!==void 0&&(i[s]=Gs(t[s],r/3,s,!0));for(let s of["vertexIds","vertexSourceIds","vertexInstanceIndices"])t[s]!==void 0&&(i[s]=Gs(t[s],i.vertices.length/3,s,!0));return i}function Dd(n,e,t,i,r,s,a={}){let o=ht(a.budget),l=i+1,c=r+1,h=s+1,u=l*c,f=new Float64Array(l*c*h),d=t.map((w,M)=>(w-e[M])/[i,r,s][M]),p=(w,M,T)=>w+l*M+u*T;for(let w=0;w<=s;w++)for(let M=0;M<=r;M++)for(let T=0;T<=i;T++){let b=n([e[0]+d[0]*T,e[1]+d[1]*M,e[2]+d[2]*w]);if(!Number.isFinite(b))throw Error("nonfinite form field");f[p(T,M,w)]=b}let y=[],g=[],m=new Map,_=[[0,0,0],[1,0,0],[0,1,0],[1,1,0],[0,0,1],[1,0,1],[0,1,1],[1,1,1]],x=[[0,1,3,7],[0,3,2,7],[0,2,6,7],[0,6,4,7],[0,4,5,7],[0,5,1,7]],v=(w,M,T,b)=>{let S=b[w],I=b[M],O=f[S]/(f[S]-f[I]),k=O<1e-10?"p:"+S:O>1-1e-10?"p:"+I:S<I?S+":"+I:I+":"+S;if(m.has(k))return m.get(k);let L=T[w].map((F,H)=>F+(T[M][H]-F)*O),U=y.length/3;return y.push(...L),m.set(k,U),U},E=(w,M,T,b)=>{if(w===M||M===T||w===T)return;let S=y.slice(w*3,w*3+3),I=y.slice(M*3,M*3+3),O=y.slice(T*3,T*3+3),k=I.map((F,H)=>F-S[H]),L=O.map((F,H)=>F-S[H]);[k[1]*L[2]-k[2]*L[1],k[2]*L[0]-k[0]*L[2],k[0]*L[1]-k[1]*L[0]].reduce((F,H,N)=>F+H*b[N],0)<0&&([M,T]=[T,M]),g.push(w,M,T),g.length%3e4===0&&Le(y.length/3,g.length/3,o,"form isosurface")};for(let w=0;w<s;w++)for(let M=0;M<r;M++)for(let T=0;T<i;T++){let b=_.map(([O,k,L])=>p(T+O,M+k,w+L)),S=b.map(O=>f[O]<0);if(S.every(Boolean)||S.every(O=>!O))continue;let I=_.map(([O,k,L])=>[e[0]+d[0]*(T+O),e[1]+d[1]*(M+k),e[2]+d[2]*(w+L)]);for(let O of x){let k=O.filter(F=>S[F]),L=O.filter(F=>!S[F]);if(!k.length||!L.length)continue;let U=[0,1,2].map(F=>L.reduce((H,N)=>H+I[N][F],0)/L.length-k.reduce((H,N)=>H+I[N][F],0)/k.length);if(k.length===1){let F=L.map(H=>v(k[0],H,I,b));E(...F,U)}else if(k.length===3){let F=k.map(H=>v(L[0],H,I,b));E(...F,U)}else{let F=v(k[0],L[0],I,b),H=v(k[0],L[1],I,b),N=v(k[1],L[1],I,b),B=v(k[1],L[0],I,b);E(F,H,N,U),E(F,N,B,U)}}}return Le(y.length/3,g.length/3,o,"form isosurface"),{vertices:y,indices:g}}var UM=Math.PI*2;var zb=n=>Math.hypot(n[0],n[1],n[2]),Bb=(n,e,t)=>Math.max(e,Math.min(t,n));function Ta(n,e,t){let i=Bb(.5+.5*(e-n)/t,0,1);return e*(1-i)+n*i-t*i*(1-i)}var Nd=(n,e,t)=>-Ta(-n,-e,t);function Kc(n,e,t){let i=[(n[0]-e[0])/t[0],(n[1]-e[1])/t[1],(n[2]-e[2])/t[2]];return(zb(i)-1)*Math.min(t[0],t[1],t[2])}function Qc(n,e,t){let i=[Math.abs(n[0]-e[0])-t[0],Math.abs(n[1]-e[1])-t[1],Math.abs(n[2]-e[2])-t[2]];return Math.hypot(Math.max(i[0],0),Math.max(i[1],0),Math.max(i[2],0))+Math.min(Math.max(i[0],i[1],i[2]),0)}var kb=n=>JSON.parse(JSON.stringify(n)),th=Number.isFinite,Ws=(n,e,t)=>Math.max(e,Math.min(t,n)),nh=(n,e,t)=>n+(e-n)*t,bt=(n,e,t,i=-1/0,r=1/0)=>{if(n=n??e,typeof n!="number"||!th(n)||n<i||n>r)throw Error(t+" must be in "+i+".."+r);return n};function Hb(n={}){if(!Array.isArray(n.sections)||n.sections.length<2||n.sections.length>32)throw Error("form needs2..32 ordered sections {z,width,top,bottom,shoulder?,fullness?}");let e=n.sections.map(o=>{let l=bt(o.bottom,0,"bottom"),c=bt(o.top,.5,"top",l+1e-4),h=bt(o.width,1,"full width",1e-4,1e4);return{z:bt(o.z,void 0,"section z"),width:h,top:c,bottom:l,shoulder:bt(o.shoulder,.5,"shoulder height fraction",.15,.85),fullness:bt(o.fullness,2.6,"upper fullness exponent",1.6,5),lowerFullness:bt(o.lowerFullness,3,"lower fullness exponent",1.6,5),crownDip:bt(o.crownDip,0,"central crown depression",0,(c-l)*(1-(o.shoulder??.5))*.9),centerX:bt(o.centerX,0,"center X")}});for(let o=1;o<e.length;o++)if(e[o].z-e[o-1].z<1e-4)throw Error("form section z must increase");let t=n.resolution??[64,40,128];if(!Array.isArray(t)||t.length!==3||t.some(o=>!Number.isInteger(o)||o<12||o>256)||t.reduce((o,l)=>o*l,1)>2e6)throw Error("form resolution needs [nx,ny,nz],12..256 each, product<=2million");let i=bt(n.rounding,.025,"end rounding",0,Math.min(...e.map(o=>Math.min(o.width,o.top-o.bottom)))*.4),r=n.cuts??[];if(!Array.isArray(r)||r.length>16)throw Error("form supports at most16 persistent cut envelopes");let s=r.map((o,l)=>{if(!["cylinder","ellipsoid","box"].includes(o.type))throw Error("cut type needs cylinder/ellipsoid/box");if(!Array.isArray(o.center)||o.center.length!==3||!o.center.every(th))throw Error("cut center needs XYZ");let c={id:String(o.id??"cut-"+l),type:o.type,center:[...o.center],blend:bt(o.blend,.008,"cut blend",0,1),rimWidth:bt(o.rimWidth,0,"integrated rim width",0,1),rimHeight:bt(o.rimHeight,0,"integrated rim height",0,.2)};if(o.type==="cylinder"){if(c.axis=o.axis??"x",!["x","y","z"].includes(c.axis))throw Error("cylinder cut axis needs x/y/z");c.radius=bt(o.radius,void 0,"cut radius",1e-5,1e4),c.depth=o.depth===void 0?null:bt(o.depth,null,"cut depth",1e-5,1e4)}else{if(!Array.isArray(o.size)||o.size.length!==3||o.size.some(h=>!th(h)||h<=0))throw Error("cut size needs XYZ full extents");c.size=[...o.size]}return c});if(new Set(s.map(o=>o.id)).size!==s.length)throw Error("cut IDs must be unique");let a=n.features??[];if(!Array.isArray(a)||a.length>24)throw Error("at most24 form features");for(let o of a){if(!["narrow","ridge","bulge","bend","crown"].includes(o.kind))throw Error("unknown form feature");bt(o.at,.5,"form v",0,1),bt(o.radius,.35,"form radius",.03,1),bt(o.amount,0,"form amount",-1e4,1e4),bt(o.factor,1,"form width ratio",.25,3)}return{sections:e,resolution:[...t],rounding:i,cuts:s,features:kb(a)}}function Ud(n,e){let t=n.length,i=n.slice(1).map((a,o)=>a-n[o]),r=i.map((a,o)=>(e[o+1]-e[o])/a),s=new Array(t);if(t===2)s[0]=s[1]=r[0];else{let a=(o,l,c,h)=>{let u=((2*o+l)*c-o*h)/(o+l);return u*c<=0?0:(c*h<0&&Math.abs(u)>3*Math.abs(c)&&(u=3*c),u)};s[0]=a(i[0],i[1],r[0],r[1]),s[t-1]=a(i[t-2],i[t-3],r[t-2],r[t-3]);for(let o=1;o<t-1;o++)if(r[o-1]*r[o]<=0)s[o]=0;else{let l=2*i[o]+i[o-1],c=i[o]+2*i[o-1];s[o]=(l+c)/(l/r[o-1]+c/r[o])}}return a=>{a=Ws(a,n[0],n[t-1]);let o=0;for(;o<t-2&&a>n[o+1];)o++;let l=(a-n[o])/i[o],c=l*l,h=c*l;return(2*h-3*c+1)*e[o]+(h-2*c+l)*i[o]*s[o]+(-2*h+3*c)*e[o+1]+(h-c)*i[o]*s[o+1]}}var Ra=n=>(n=Math.abs(n),n>=1?0:(1-n*n)**3);function Xs(n){let e=Hb(n),t=e.sections,i=t.map(w=>w.z),r=i[0],s=i.at(-1),a=Object.fromEntries(["width","bottom","shoulder","fullness","lowerFullness","crownDip","centerX"].map(w=>[w,Ud(i,t.map(M=>M[w]))]));a.height=Ud(i,t.map(w=>w.top-w.bottom));let o=new Map,l=w=>{if(o.has(w))return o.get(w);let M=Object.fromEntries(Object.entries(a).map(([b,S])=>[b,S(w)])),T=(Ws(w,r,s)-r)/(s-r);M.top=M.bottom+M.height;for(let b of e.features){let S=O=>(O=Ws(O,0,1),O*O*(3-2*O)),I=Ra((T-(b.at??.5))/(b.radius??.35))*(b.keepEnds===!1?1:S(T/.12)*S((1-T)/.12));b.kind==="narrow"?M.width*=1+((b.factor??1)-1)*I:b.kind==="bend"?M.centerX+=(b.amount??0)*I:M.top+=(b.amount??0)*I}if(M.height=M.top-M.bottom,M.height<1e-4||M.width<1e-4)throw Error("form edit collapsed a section");if(M.middle=M.bottom+M.shoulder*M.height,M.top-M.middle-M.crownDip<=1e-6)throw Error("central depression collapses the upper section");return o.size>2048&&o.clear(),o.set(w,M),M},c=w=>{let[M,T,b]=w,S=l(b),I=T>=S.middle,O=S.crownDip*Ra((M-S.centerX)/(S.width*.42)),k=I?S.top-S.middle-O:S.middle-S.bottom,L=I?S.fullness:S.lowerFullness,U=Math.abs((M-S.centerX)/(S.width/2)),F=Math.abs((T-S.middle)/k),H=(Math.pow(U**L+F**L,1/L)-1)*Math.min(S.width/2,S.height/2);for(let N of e.cuts)if(N.type==="cylinder"&&N.axis==="x"&&N.rimWidth>0&&N.rimHeight>0){let B=Math.hypot(T-N.center[1],b-N.center[2])-N.radius,$=Ws((Math.abs(M-S.centerX)/(S.width/2)-.55)/.35,0,1);H-=N.rimHeight*Ra((B-N.rimWidth*.35)/N.rimWidth)*$}H=e.rounding?Nd(H,Math.max(r-b,b-s),e.rounding):Math.max(H,r-b,b-s);for(let N of e.cuts){let B;if(N.type==="cylinder"){let $=["x","y","z"].indexOf(N.axis),J=[0,1,2].filter(re=>re!==$);B=Math.hypot(...J.map(re=>w[re]-N.center[re]))-N.radius,N.depth!==null&&(B=Math.max(B,Math.abs(w[$]-N.center[$])-N.depth/2))}else N.type==="ellipsoid"?B=Kc(w,N.center,N.size.map($=>$/2)):B=Qc(w,N.center,N.size.map($=>$/2));H=N.blend?-Ta(-H,B,N.blend):Math.max(H,-B)}return H},h=(w,M)=>{w=bt(w,null,"u",0,1),M=bt(M,null,"v",0,1);let T=nh(r,s,M),b=l(T),S=w*2*Math.PI,I=Math.sin(S),O=Math.cos(S),k=O>=0,L=2/(k?b.fullness:b.lowerFullness),U=Math.sign(I)*Math.abs(I)**L,F=Math.sign(O)*Math.abs(O)**L;return[b.centerX+b.width/2*U,b.middle+(k?b.top-b.middle-b.crownDip*Ra(U/.84):b.middle-b.bottom)*F,T]},u=(w,M)=>{let T=h(w,M),b=1e-5,S=(U,F)=>T.map((H,N)=>H+(U===N?F:0)),I=[0,1,2].map(U=>(c(S(U,b))-c(S(U,-b)))/(2*b)),O=Math.hypot(...I);if(O<1e-10)throw Error("undefined form normal");if(c(T)>.001)throw Error("requested UV is inside a cutout or rounded end; move the anchor onto remaining body");let k=h((w+1e-5)%1,M).map((U,F)=>U-T[F]),L=Math.hypot(...k);return{point:T,normal:I.map(U=>U/O),du:k.map(U=>U/L),dv:[0,0,1]}},f=Math.max(...t.map(w=>w.width)),d=Math.max(...t.map(w=>Math.abs(w.centerX)))+e.features.filter(w=>w.kind==="bend").reduce((w,M)=>w+Math.abs(M.amount||0),0),p=e.features.filter(w=>w.kind==="narrow").reduce((w,M)=>w*Math.max(1,M.factor??1),1),y=e.features.filter(w=>!["bend","narrow"].includes(w.kind)).reduce((w,M)=>w+Math.abs(M.amount||0),0),g=Math.max(1e-4,Math.min(...t.map(w=>w.top-w.bottom))-e.features.filter(w=>!["bend","narrow"].includes(w.kind)&&w.amount<0).reduce((w,M)=>w-M.amount,0)),m=Math.min(...t.map(w=>w.width))*e.features.filter(w=>w.kind==="narrow").reduce((w,M)=>w*Math.min(1,M.factor??1),1),_=Math.max(0,...e.cuts.map(w=>w.rimHeight||0)),x=_*Math.max(1,f*p/g,(Math.max(...t.map(w=>w.top-w.bottom))+y)/m)*1.1,v=Math.max(.005,e.rounding*2,x),E={min:[-d-f/2*p-v,Math.min(...t.map(w=>w.bottom))-v,r-v],max:[d+f/2*p+v,Math.max(...t.map(w=>w.top))+y+v,s+v]};return{params:e,section:l,field:c,point:h,frame:u,bounds:E}}var ir=new Map,eh=0,Od=n=>({vertices:n.vertices.slice(),indices:n.indices.slice(),cornerNormals:n.cornerNormals.slice()});function Fd(n,e={}){let t=Xs(n),i=t.params,r=ht(e),s=JSON.stringify(i);if(ir.has(s)){let d=ir.get(s);if(Le(d.vertices.length/3,d.indices.length/3,r,"formBody"),d.vertices.some(p=>Math.abs(p)>r.maxCoordinate))throw Error("form exceeds requested coordinate budget");return Od(d)}let a=Dd(t.field,t.bounds.min,t.bounds.max,...i.resolution,{budget:r}),o=Math.min(...t.bounds.max.map((d,p)=>(d-t.bounds.min[p])/i.resolution[p]))*.08,l=[];Le(a.vertices.length/3,a.indices.length/3,r,"formBody");let c=Array.from({length:a.vertices.length/3},()=>[0,0,0]),h=[];for(let d=0;d<a.indices.length;d+=3){let p=a.indices.slice(d,d+3).map(x=>a.vertices.slice(x*3,x*3+3)),y=p[1].map((x,v)=>x-p[0][v]),g=p[2].map((x,v)=>x-p[0][v]),m=[y[1]*g[2]-y[2]*g[1],y[2]*g[0]-y[0]*g[2],y[0]*g[1]-y[1]*g[0]],_=Math.hypot(...m)||1;h.push(m.map(x=>x/_));for(let x of a.indices.slice(d,d+3))for(let v=0;v<3;v++)c[x][v]+=m[v]}let u=[];for(let d=0;d<a.vertices.length;d+=3){let p=a.vertices.slice(d,d+3),y=[0,1,2].map(b=>{let S=p.slice(),I=p.slice();return S[b]+=o,I[b]-=o,t.field(S)-t.field(I)}),g=Math.hypot(...y);if(g<1e-12)throw Error("form field has undefined normal");let m=y.map(b=>b/g),_=c[d/3],x=Math.hypot(..._)||1,v=_.map(b=>b/x),E=m.reduce((b,S,I)=>b+S*v[I],0),w=Ws((E-.3)/.65,0,1),M=m.map((b,S)=>b*w+v[S]*(1-w)),T=Math.hypot(...M)||1;u.push(M.map(b=>b/T))}for(let d=0;d<a.indices.length;d++){let p=h[Math.floor(d/3)],y=u[a.indices[d]],g=y.reduce((m,_,x)=>m+_*p[x],0);if(g<.05){let m=y.map((x,v)=>x+p[v]*(.05-g)),_=Math.hypot(...m)||1;l.push(...m.map(x=>x/_))}else l.push(...y)}a.cornerNormals=l;let f=a.vertices.length+a.indices.length+l.length;if(f<=7e6){for(;ir.size>=3||eh+f>7e6;){let d=ir.keys().next().value,p=ir.get(d);eh-=p.vertices.length+p.indices.length+p.cornerNormals.length,ir.delete(d)}return ir.set(s,a),eh+=f,Od(a)}return a}function zd(n,e={},t={}){let i=Xs(n),r=t.uvBounds??[0,0,1,1],s=t.resolution??[32,48];if(!Array.isArray(r)||r.length!==4||r.some(p=>!Number.isFinite(p))||r[2]<=r[0]||r[3]<=r[1]||r[2]-r[0]>1||r[1]<0||r[3]>1)throw Error("form UV region needs u span<=1 and v0..1");if(!Array.isArray(s)||s.length!==2||s.some(p=>!Number.isInteger(p)||p<4||p>128))throw Error("form region resolution4..128");let[a,o]=s,l=[],c=[],h=[],u=[],f=bt(t.offset,0,"region offset",-.1,.1);Le((a+1)*(o+1),a*o*2,ht(e),"formRegion");for(let p=0;p<=o;p++)for(let y=0;y<=a;y++){let g=(nh(r[0],r[2],y/a)%1+1)%1,m=nh(r[1],r[3],p/o),_=i.frame(g,m);u.push(_),l.push(..._.point.map((x,v)=>x+f*_.normal[v]))}let d=(p,y,g)=>{c.push(p,y,g);for(let m of[p,y,g])h.push(...u[m].normal)};for(let p=0;p<o;p++)for(let y=0;y<a;y++){let g=p*(a+1)+y,m=g+1,_=g+a+2,x=g+a+1;d(g,x,_),d(g,_,m)}return{vertices:l,indices:c,cornerNormals:h}}var ih=n=>JSON.parse(JSON.stringify(n)),oh=Number.isFinite,An=(n,e,t,i=-1/0,r=1/0)=>{if(n=n??e,typeof n!="number"||!oh(n)||n<i||n>r)throw Error(t+" must be finite in ["+i+","+r+"]");return n},rh=(n,e,t,i,r)=>{if(n=An(n,e,t,i,r),!Number.isInteger(n))throw Error(t+" must be an integer");return n},Bd=(n,e)=>n.map((t,i)=>t-e[i]),Gd=(n,e)=>[n[1]*e[2]-n[2]*e[1],n[2]*e[0]-n[0]*e[2],n[0]*e[1]-n[1]*e[0]],Wd=n=>{let e=Math.hypot(...n);if(e<1e-12)throw Error("surface has a collapsed tangent");return n.map(t=>t/e)},sh=["u0","u1","v0","v1"];function ah(n){return Array.from({length:n+4},(e,t)=>t<4?0:t>=n?1:(t-3)/(n-3))}function Ca(n,e){let t=ah(n);if(e=Math.max(0,Math.min(1,e)),e===1){let r=new Array(n).fill(0);return r[n-1]=1,r}let i=Array.from({length:n+3},(r,s)=>e>=t[s]&&e<t[s+1]?1:0);for(let r=1;r<=3;r++)i=Array.from({length:n+3-r},(s,a)=>{let o=t[a+r]-t[a],l=t[a+r+1]-t[a+1];return(o?(e-t[a])/o*i[a]:0)+(l?(t[a+r+1]-e)/l*i[a+1]:0)});return i}function kd(n,e){let t=ah(n);e=Math.max(0,Math.min(1-1e-12,e));let i=Array.from({length:n+3},(r,s)=>e>=t[s]&&e<t[s+1]?1:0);for(let r=1;r<=2;r++)i=Array.from({length:n+3-r},(s,a)=>{let o=t[a+r]-t[a],l=t[a+r+1]-t[a+1];return(o?(e-t[a])/o*i[a]:0)+(l?(t[a+r+1]-e)/l*i[a+1]:0)});return Array.from({length:n},(r,s)=>{let a=t[s+3]-t[s],o=t[s+4]-t[s+1];return(a?3/a*i[s]:0)-(o?3/o*i[s+1]:0)})}var Hd=n=>{let e=ah(n);return Array.from({length:n},(t,i)=>(e[i+1]+e[i+2]+e[i+3])/3)};function Vb(n={}){if(!n||typeof n!="object"||Array.isArray(n))throw Error("surface params must be an object");let e=An(n.width,1.2,"surface width",1e-4,1e4),t=An(n.length,1.8,"surface length",1e-4,1e4),i=An(n.crown,.15,"surface crown",-1e4,1e4),r=An(n.thickness,0,"surface thickness",0,Math.min(e,t)),s=n.grid??[7,7],a=n.resolution??[32,40];if(!Array.isArray(s)||s.length!==2||!Array.isArray(a)||a.length!==2)throw Error("grid/resolution need [u,v] counts");let o=s.map((h,u)=>rh(h,null,"grid "+u,4,13)),l=a.map((h,u)=>rh(h,null,"resolution "+u,4,128)),c;if(n.controls!==void 0){if(!Array.isArray(n.controls)||n.controls.length!==o[1]||n.controls.some(h=>!Array.isArray(h)||h.length!==o[0]||h.some(u=>!Array.isArray(u)||u.length!==3||u.some(f=>!oh(f)))))throw Error("controls must match grid[v][u][xyz]");c=ih(n.controls)}if(n.features!==void 0&&(!Array.isArray(n.features)||n.features.length>32))throw Error("surface features need at most32 ordered edits");return{width:e,length:t,crown:i,thickness:r,grid:o,resolution:l,...c?{controls:c}:{},features:ih(n.features||[])}}function rr(n,e,t){let i=Ca(n[0].length,e),r=Ca(n.length,t),s=[0,0,0];for(let a=0;a<n.length;a++)for(let o=0;o<n[a].length;o++)for(let l=0;l<3;l++)s[l]+=n[a][o][l]*i[o]*r[a];return s}function Gb(n,e,t,i,r){let s=r.fixedEdges??(r.keepBoundary===!1?[]:sh),a=r.keepTangents===!0?2:1;return s.some(o=>o==="u0"&&n<a||o==="u1"&&n>=t-a||o==="v0"&&e<a||o==="v1"&&e>=i-a)}function Wb(n={}){if(!n||typeof n!="object"||!["ridge","bulge","narrow","bend","crown"].includes(n.kind))throw Error("surface edit kind needs ridge/bulge/narrow/bend/crown");let e=n.at??[.5,.5],t=n.radius??(n.kind==="ridge"?[.28,.65]:[.45,.45]);if(!Array.isArray(e)||e.length!==2||!Array.isArray(t)||t.length!==2)throw Error("surface edit at/radius need [u,v]");let i=n.fixedEdges??(n.keepBoundary===!1?[]:sh);if(!Array.isArray(i)||i.some(r=>!sh.includes(r))||new Set(i).size!==i.length)throw Error("fixedEdges need unique u0/u1/v0/v1");return{kind:n.kind,at:e.map(r=>An(r,null,"surface UV",0,1)),radius:t.map(r=>An(r,null,"UV radius",.03,2)),amount:An(n.amount,0,"edit amount",-1e3,1e3),factor:An(n.factor,1,"width factor",.2,3),fixedEdges:[...i],keepTangents:n.keepTangents===!0}}var Vd=n=>(n=Math.min(1,Math.max(0,n)),1-n*n*(3-2*n));function Xb(n){let e=Vb(n),[t,i]=e.grid,r=Hd(t),s=Hd(i),a=e.controls?ih(e.controls):s.map(o=>r.map(l=>[(l-.5)*e.width,e.crown*(1-(2*l-1)**2)*(1-(2*o-1)**2),(o-.5)*e.length]));if(!e.controls&&e.crown){let o=rr(a,.5,.5)[1];for(let l of a)for(let c of l)c[1]*=e.crown/o}for(let o of e.features){let l=Wb(o),c=s.map((f,d)=>r.map((p,y)=>{if(Gb(y,d,t,i,l))return 0;let g=Math.abs(p-l.at[0])/l.radius[0],m=Math.abs(f-l.at[1])/l.radius[1];return Vd(g)*Vd(m)})),h=c.map((f,d)=>f.map((p,y)=>[a[d][y][0]*p,p,0])),u=rr(h,...l.at)[1];if(l.kind==="narrow"){let f=rr(a,1,l.at[1])[0]-rr(a,0,l.at[1])[0];u=(rr(h,1,l.at[1])[0]-rr(h,0,l.at[1])[0])/f}if(u<1e-10)throw Error("surface edit has no movable controls: enlarge radius, move anchor or relax boundary/tangent locks");for(let f=0;f<i;f++)for(let d=0;d<t;d++){let p=c[f][d]/u,y=a[f][d];p&&(l.kind==="narrow"?y[0]*=1+(l.factor-1)*p:l.kind==="bend"?y[0]+=l.amount*p:y[1]+=l.amount*p)}}return{params:e,net:a}}function lh(n){let{params:e,net:t}=Xb(n),i=(s,a)=>rr(t,s,a);return{params:e,net:t,point:i,frame:(s,a)=>{s=An(s,null,"u",0,1),a=An(a,null,"v",0,1);let o=Ca(t[0].length,s),l=Ca(t.length,a),c=kd(t[0].length,s),h=kd(t.length,a),u=i(s,a),f=[0,0,0],d=[0,0,0];for(let y=0;y<t.length;y++)for(let g=0;g<t[y].length;g++)for(let m=0;m<3;m++)f[m]+=t[y][g][m]*c[g]*l[y],d[m]+=t[y][g][m]*o[g]*h[y];let p=Wd(Gd(d,f));if(p[1]<=1e-5)throw Error("surface folds/collapses in its XZ parameter projection; reduce edit or correct the control net");return{point:u,du:f,dv:d,normal:p}}}}function Ia(n,e={},t={}){let i=lh(n),r=i.params,s=t.uvBounds??[0,0,1,1];if(!Array.isArray(s)||s.length!==4||s.some(_=>!oh(_)||_<0||_>1)||s[2]<=s[0]||s[3]<=s[1])throw Error("uvBounds need [u0,v0,u1,v1] in0..1");let a=t.resolution??r.resolution;if(!Array.isArray(a)||a.length!==2)throw Error("region resolution needs[u,v]");let[o,l]=a.map(_=>rh(_,null,"region resolution",4,128)),c=An(t.thickness,r.thickness,"surface thickness",0,Math.min(r.width,r.length)),h=(o+1)*(l+1),u=ht(e);Le(h*(c?2:1),o*l*2*(c?2:1)+(c?4*(o+l):0),u,"controlSurface");let f=[],d=[],p=[],y=[];for(let _=0;_<=l;_++)for(let x=0;x<=o;x++){let v=s[0]+(s[2]-s[0])*x/o,E=s[1]+(s[3]-s[1])*_/l,w=i.frame(v,E);y.push(w),f.push(...w.point)}if(c)for(let _ of y)f.push(_.point[0],_.point[1]-c,_.point[2]);let g=(_,x,v,E)=>{if(d.push(_,x,v),E)for(let w of E)p.push(...w);else{let w=f.slice(_*3,_*3+3),M=f.slice(x*3,x*3+3),T=f.slice(v*3,v*3+3),b=Wd(Gd(Bd(M,w),Bd(T,w)));p.push(...b,...b,...b)}};for(let _=0;_<l;_++)for(let x=0;x<o;x++){let v=_*(o+1)+x,E=v+1,w=v+o+2,M=v+o+1;g(v,M,w,[y[v].normal,y[M].normal,y[w].normal]),g(v,w,E,[y[v].normal,y[w].normal,y[E].normal]),c&&(g(v+h,w+h,M+h,[v,w,M].map(T=>y[T].normal.map(b=>-b))),g(v+h,E+h,w+h,[v,E,w].map(T=>y[T].normal.map(b=>-b))))}if(c){let _=[];for(let x=0;x<=l;x++)_.push(x*(o+1));for(let x=1;x<=o;x++)_.push(l*(o+1)+x);for(let x=l-1;x>=0;x--)_.push(x*(o+1)+o);for(let x=o-1;x>0;x--)_.push(x);for(let x=0;x<_.length;x++){let v=_[x],E=_[(x+1)%_.length],w=v%(o+1)===0&&E%(o+1)===0?"u0":v%(o+1)===o&&E%(o+1)===o?"u1":v<=o&&E<=o?"v0":"v1";t.edgeWalls&&!t.edgeWalls.includes(w)||(g(v,v+h,E+h),g(v,E+h,E))}}let m=tt({vertices:f,indices:d},{budget:u,operator:"controlSurface"});return m.cornerNormals=p,m}var Gn=n=>typeof n=="number"&&Number.isFinite(n),ch=(n,e)=>{if(!Array.isArray(n)||n.length!==3||!n.every(Gn))throw Error(e+" needs finite XYZ");return[...n]},uh=(n,e)=>[n[1]*e[2]-n[2]*e[1],n[2]*e[0]-n[0]*e[2],n[0]*e[1]-n[1]*e[0]],qs=(n,e)=>n.reduce((t,i,r)=>t+i*e[r],0),fh=(n,e)=>n.map((t,i)=>t-e[i]),hh=n=>{let e=Math.hypot(...n);if(e<1e-12)throw Error("zero brush direction");return n.map(t=>t/e)},Xd=(n,e,t,i,r)=>{if(n=n??e,!Number.isInteger(n)||n<t||n>i)throw Error(r+" outside "+t+".."+i);return n};function qd(n,e){let t=[n.w??n.width??1,n.h??n.height??1,n.d??n.depth??1];if(t.some(p=>!Gn(p)||p<=0||p>1e6))throw Error("plastic box dimensions must be positive finite");let i=t.map(p=>p/2),r=n.radius??n.bevel??Math.min(...t)*.08;if(!Gn(r)||r<0||r>=Math.min(...i))throw Error("bevel radius must be >=0 and less than half the smallest size");let s=Xd(n.resolution,20,1,96,"resolution"),a=Xd(n.bevelSegments,6,1,32,"bevelSegments"),o=i.map(p=>p-r),l=Math.max(...t)/s,c=o.map(p=>Math.max(1,Math.ceil(2*p/l))),h=[],u=(p,y,g,m)=>{let _=uh(fh(y,p),fh(g,p));Math.hypot(..._)<1e-14||(qs(_,m)<0&&([y,g]=[g,y]),h.push(...p,...y,...g))},f=(p,y,g,m,_)=>{u(p,y,g,_),u(p,g,m,_)},d=(p,y,g,m,_,x)=>{let v=[0,0,0];return v[p]=y,v[g]=m,v[_]=x,v};for(let p=0;p<3;p++){let[y,g]=[0,1,2].filter(m=>m!==p);for(let m of[-1,1]){let _=[0,0,0];_[p]=m;for(let x=0;x<c[y];x++)for(let v=0;v<c[g];v++){let E=-o[y]+2*o[y]*x/c[y],w=-o[y]+2*o[y]*(x+1)/c[y],M=-o[g]+2*o[g]*v/c[g],T=-o[g]+2*o[g]*(v+1)/c[g];f(d(p,m*i[p],y,E,g,M),d(p,m*i[p],y,w,g,M),d(p,m*i[p],y,w,g,T),d(p,m*i[p],y,E,g,T),_)}}}if(r>0){for(let p=0;p<3;p++){let[y,g]=[0,1,2].filter(m=>m!==p);for(let m of[-1,1])for(let _ of[-1,1]){let x=(v,E)=>{let w=E*Math.PI/(2*a),M=[0,0,0];return M[p]=-o[p]+2*o[p]*v/c[p],M[y]=m*(o[y]+r*Math.cos(w)),M[g]=_*(o[g]+r*Math.sin(w)),M};for(let v=0;v<c[p];v++)for(let E=0;E<a;E++){let w=[0,0,0],M=(E+.5)*Math.PI/(2*a);w[y]=m*Math.cos(M),w[g]=_*Math.sin(M),f(x(v,E),x(v+1,E),x(v+1,E+1),x(v,E+1),w)}}}for(let p of[-1,1])for(let y of[-1,1])for(let g of[-1,1]){let m=[p,y,g],_=(x,v)=>{let E=[Math.sin(x*Math.PI/(2*a)),Math.sin(v*Math.PI/(2*a)),Math.sin((a-x-v)*Math.PI/(2*a))],w=Math.hypot(...E);return E.map((M,T)=>m[T]*(o[T]+r*M/w))};for(let x=0;x<a;x++)for(let v=0;v<a-x;v++)u(_(x,v),_(x+1,v),_(x,v+1),m),x+v<a-1&&u(_(x+1,v),_(x+1,v+1),_(x,v+1),m)}}return Hs(h,Math.max(1e-12,Math.min(...t)*1e-9),{budget:e})}function Yd(n,e,t){let i=tt(n,{budget:t,operator:"plastic brush"}),r=ch(e.center,"brush.center"),s=hh(ch(e.normal??[0,1,0],"brush.normal")),a=e.amount;if(!Gn(a))throw Error("brush amount must be finite");let o=Array.isArray(e.radius)?e.radius:[e.radius??.3,e.radius??.3];if(o.length!==2||o.some(E=>!Gn(E)||E<=0))throw Error("brush radius needs positive scalar or [u,v]");let l=e.depth??Math.min(...o)*.5,c=e.steepness??1,h=e.hardness??0,u=e.rotation??0,f=e.shape??"ellipse";if(!["circle","ellipse","box"].includes(f)||!Gn(l)||l<=0||!Gn(c)||c<.1||c>12||!Gn(h)||h<0||h>=1||!Gn(u))throw Error("invalid brush region/falloff");if(e.mode!==void 0&&!["push","inflate"].includes(e.mode)||e.normalLimit!==void 0&&(!Gn(e.normalLimit)||e.normalLimit<-1||e.normalLimit>1))throw Error("invalid brush mode or normalLimit");let d=e.up?hh(ch(e.up,"brush.up")):Math.abs(s[1])>.9?[1,0,0]:[0,1,0],p=hh(uh(d,s)),y=uh(s,p),g=Math.cos(u),m=Math.sin(u),_=Vs(i),x=i.vertices.slice(),v=0;for(let E=0;E<x.length;E+=3){let w=i.vertices.slice(E,E+3),M=fh(w,r),T=qs(M,s),b=_.slice(E,E+3);if(Math.abs(T)>l||qs(b,s)<(e.normalLimit??.05))continue;let S=qs(M,p),I=qs(M,y),O=(S*g-I*m)/o[0],k=(S*m+I*g)/o[1],L=f==="box"?Math.max(Math.abs(O),Math.abs(k)):Math.hypot(O,k);if(L>=1)continue;let U=Math.max(0,(L-h)/(1-h)),F=Math.pow(1-U*U*(3-2*U),c),H=e.mode==="inflate"?b:s;for(let N=0;N<3;N++)x[E+N]+=H[N]*a*F;v++}if(!v)throw Error("brush region contains no front-facing vertices; choose a surface anchor or increase mesh resolution");return tt({vertices:x,indices:i.indices},{budget:t,operator:"plastic brush"})}var sr=n=>typeof n=="number"&&Number.isFinite(n),dh=(n,e,t,i,r)=>{if(n=n??e,!Number.isInteger(n)||n<t||n>i)throw new Error(`${r} must be ${t}..${i}`);return n};function qb(n){if(!n||typeof n!="object"||!["bezier","catmullrom"].includes(n.type))throw new Error("curve.type must be bezier or catmullrom");let e=n.points;if(!Array.isArray(e)||e.length<2||e.length>128||e.some(t=>!Array.isArray(t)||t.length!==3||!t.every(sr)))throw new Error("curve.points needs 2..128 finite XYZ points");if(n.type==="bezier"&&(e.length<4||(e.length-1)%3))throw new Error("Bezier needs 3n+1 control points; handles are explicit");if(n.closed&&n.type==="bezier"&&Math.hypot(...e[0].map((t,i)=>t-e.at(-1)[i]))>1e-8)throw new Error("closed Bezier endpoints must coincide");return{type:n.type,points:e.map(t=>[...t]),closed:!!n.closed,segments:dh(n.segments,48,4,256,"curve segments")}}function Yb(n){let e=n.points.map(i=>new P(...i));if(n.type==="catmullrom")return new Cs(e,n.closed,"centripetal",.5);let t=new ra;for(let i=0;i+3<e.length;i+=3)t.add(new Is(...e.slice(i,i+4)));return t}function $b(n,{segments:e}={}){let t=qb(n),i=dh(e,t.segments,4,256,"sweep segments"),r=Yb(t),s=r.getLength();if(!sr(s)||s<1e-9)throw new Error("curve has zero/nonfinite length");let a=r.computeFrenetFrames(i,t.closed),o=r.getSpacedPoints(i),l=o.map((c,h)=>({position:c.toArray(),tangent:a.tangents[h].toArray(),normal:a.normals[h].toArray(),binormal:a.binormals[h].toArray(),distance:s*h/i}));if(l.some(c=>[c.position,c.tangent,c.normal,c.binormal].some(h=>!h.every(sr))||Math.hypot(...c.tangent)<.9))throw new Error("curve has a degenerate tangent/frame");return{samples:l,length:s,closed:t.closed,sampling:{mode:"fixed-arc-length",segments:i,errorBound:null}}}function ph(n,e={}){if(!Array.isArray(n.profile)||n.profile.length<3||n.profile.length>128||n.profile.some(f=>!Array.isArray(f)||f.length!==2||!f.every(sr)))throw new Error("sweep profile needs3..128 finite XY points");let t=n.profile.map(f=>new ce(...f));if(t[0].distanceTo(t.at(-1))<1e-9&&t.pop(),t.length<3)throw new Error("degenerate sweep profile");let i=0;for(let f=0;f<t.length;f++)i+=t[f].x*t[(f+1)%t.length].y-t[(f+1)%t.length].x*t[f].y;if(Math.abs(i)<1e-12)throw new Error("sweep profile has zero area");i<0&&t.reverse();let r=n.scale??1,s=n.twist??0;if(!sr(r)||r<=0||!sr(s))throw new Error("sweep scale must be positive and twist finite");let a=$b(n.curve,{segments:n.segments}),o=a.samples.length-1,l=t.length,c=a.closed?o:o+1;if(c*l>(e.maxVertices??1e6)||2*o*l+2*(l-2)>(e.maxTriangles??1e6))throw new Error("curve sweep exceeds geometry budget");let h=[],u=[];for(let f=0;f<c;f++){let d=a.samples[f],p=s*f/o,y=Math.cos(p),g=Math.sin(p);for(let m of t){let _=r*(m.x*y-m.y*g),x=r*(m.x*g+m.y*y);for(let v=0;v<3;v++)h.push(d.position[v]+d.normal[v]*_+d.binormal[v]*x)}}for(let f=0;f<o;f++)for(let d=0;d<l;d++){let p=f*l+d,y=f*l+(d+1)%l,g=(f+1)%c*l+(d+1)%l,m=(f+1)%c*l+d;u.push(p,y,g,p,g,m)}if(!a.closed&&n.caps!==!1){let f=oa.triangulateShape(t,[]);if(f.length!==l-2)throw new Error("sweep caps could not triangulate profile");for(let[d,p,y]of f)u.push(y,p,d),u.push(o*l+d,o*l+p,o*l+y)}return{vertices:h,indices:u}}function $d(n,e){if(!sr(n.radius)||n.radius<=0)throw new Error("curveTube radius must be positive");let t=dh(n.radialSegments,12,3,64,"radialSegments"),i=Array.from({length:t},(r,s)=>[n.radius*Math.cos(s*2*Math.PI/t),n.radius*Math.sin(s*2*Math.PI/t)]);return ph({...n,profile:i},e)}var ns=Math.PI*2;function yt(n,e,t,i){let r=t[0]-e[0],s=t[1]-e[1],a=t[2]-e[2],o=i[0]-e[0],l=i[1]-e[1],c=i[2]-e[2],h=s*c-a*l,u=a*o-r*c,f=r*l-s*o;h*h+u*u+f*f<1e-14||n.push(e[0],e[1],e[2],t[0],t[1],t[2],i[0],i[1],i[2])}function mh(n,e,t){let i=n/2,r=e/2,s=t/2,a=[[-i,-r,-s],[i,-r,-s],[i,r,-s],[-i,r,-s],[-i,-r,s],[i,-r,s],[i,r,s],[-i,r,s]],o=[[0,3,2,1],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]],l=[];for(let c of o)yt(l,a[c[0]],a[c[1]],a[c[2]]),yt(l,a[c[0]],a[c[2]],a[c[3]]);return l}function jb(n){let e=0;for(let i=0;i<n.length;i+=9){let r=n[i],s=n[i+1],a=n[i+2],o=n[i+3],l=n[i+4],c=n[i+5],h=n[i+6],u=n[i+7],f=n[i+8];e+=(r*(l*f-c*u)+s*(c*h-o*f)+a*(o*u-l*h))/6}if(e>=0)return n;let t=new Array(n.length);for(let i=0;i<n.length;i+=9)t[i]=n[i],t[i+1]=n[i+1],t[i+2]=n[i+2],t[i+3]=n[i+6],t[i+4]=n[i+7],t[i+5]=n[i+8],t[i+6]=n[i+3],t[i+7]=n[i+4],t[i+8]=n[i+5];return t}function Pa(n,e=40,t=!0){let i=[],r=[];for(let s=0;s<=e;s++){let a=ns*s/e,o=[];for(let[l,c]of n)o.push([Math.cos(a)*l,c,Math.sin(a)*l]);r.push(o)}for(let s=0;s<e;s++){let a=r[s],o=r[s+1];for(let l=0;l<n.length-1;l++)yt(i,a[l],a[l+1],o[l]),yt(i,a[l+1],o[l+1],o[l])}if(t){let s=n.length-1,a=[0,n[0][1],0],o=[0,n[s][1],0];for(let l=0;l<e;l++)yt(i,a,r[l][0],r[l+1][0]),yt(i,o,r[l+1][s],r[l][s]);return jb(i)}return i}function jd(n=1,e=.2,t=48,i=24){let r=[],s=[];for(let a=0;a<=t;a++){let o=ns*a/t,l=[];for(let c=0;c<=i;c++){let h=ns*c/i;l.push([(n+e*Math.cos(h))*Math.cos(o),e*Math.sin(h),(n+e*Math.cos(h))*Math.sin(o)])}s.push(l)}for(let a=0;a<t;a++)for(let o=0;o<i;o++){let l=s[a][o],c=s[a+1][o],h=s[a][o+1],u=s[a+1][o+1];yt(r,l,h,c),yt(r,h,u,c)}return r}function Zd(n,e,t,i,r=48,s=16){let a=[],o=[];for(let h=0;h<=r;h++){let u=t+(i-t)*h/r,f=[];for(let d=0;d<=s;d++){let p=ns*d/s;f.push([(n+e*Math.cos(p))*Math.cos(u),(n+e*Math.cos(p))*Math.sin(u),e*Math.sin(p)])}o.push(f)}for(let h=0;h<r;h++)for(let u=0;u<s;u++){let f=o[h][u],d=o[h+1][u],p=o[h][u+1],y=o[h+1][u+1];yt(a,f,d,p),yt(a,p,d,y)}let l=h=>{let u=t+(i-t)*h/r;return[n*Math.cos(u),n*Math.sin(u),0]},c=(h,u)=>{let f=l(h),d=o[h];for(let p=0;p<s;p++){let y=(p+1)%s;u?yt(a,f,d[y],d[p]):yt(a,f,d[p],d[y])}};return c(0,!1),c(r,!0),a}function Zb(n){let e=n.length;if(e<3)return[];let t=0;for(let c=0;c<e;c++){let h=(c+1)%e;t+=n[c][0]*n[h][1]-n[h][0]*n[c][1]}let i=t>0,r=[];for(let c=0;c<e;c++)r.push(c);let s=[],a=1e-9,o=(c,h,u,f)=>{let d=(c[0]-u[0])*(h[1]-u[1])-(h[0]-u[0])*(c[1]-u[1]),p=(c[0]-f[0])*(u[1]-f[1])-(u[0]-f[0])*(c[1]-f[1]),y=(c[0]-h[0])*(f[1]-h[1])-(f[0]-h[0])*(c[1]-h[1]);return d>a&&p>a&&y>a||d<-a&&p<-a&&y<-a},l=0;for(;r.length>3&&l++<4*e*e;){let c=-1;for(let d=0;d<r.length;d++){let p=r[(d-1+r.length)%r.length],y=r[d],g=r[(d+1)%r.length],m=n[p],_=n[y],x=n[g],v=(_[0]-m[0])*(x[1]-m[1])-(_[1]-m[1])*(x[0]-m[0]);if(i?v<=1e-12:v>=-1e-12)continue;let E=!1;for(let w of r)if(!(w===p||w===y||w===g)&&o(n[w],m,_,x)){E=!0;break}if(!E){c=d;break}}if(c<0)break;let h=r[(c-1+r.length)%r.length],u=r[c],f=r[(c+1)%r.length];s.push([h,u,f]),r.splice(c,1)}return r.length===3&&s.push([r[0],r[1],r[2]]),s}function Jd(n,e){let t=[],i=n.map(c=>[c[0],c[1]]),r=0;for(let c=0;c<i.length;c++){let h=(c+1)%i.length;r+=i[c][0]*i[h][1]-i[h][0]*i[c][1]}r<0&&i.reverse();let s=i.length,a=-e/2,o=e/2,l=Zb(i);if(l.length!==s-2){l=[];for(let c=1;c<s-1;c++)l.push([0,c,c+1])}for(let[c,h,u]of l)yt(t,[i[c][0],i[c][1],o],[i[h][0],i[h][1],o],[i[u][0],i[u][1],o]),yt(t,[i[u][0],i[u][1],a],[i[h][0],i[h][1],a],[i[c][0],i[c][1],a]);for(let c=0;c<s;c++){let h=(c+1)%s,u=i[c][0],f=i[c][1],d=i[h][0],p=i[h][1];yt(t,[u,f,a],[d,p,a],[d,p,o]),yt(t,[u,f,a],[d,p,o],[u,f,o])}return t}function Kd(n,e,t,i=48,r=28){let s=[],a=[];for(let l=0;l<=r;l++){let c=Math.PI*l/r,h=[];for(let u=0;u<=i;u++){let f=ns*u/i;h.push([n*Math.sin(c)*Math.cos(f),e*Math.cos(c),t*Math.sin(c)*Math.sin(f)])}a.push(h)}let o=[];for(let l=0;l<r;l++)for(let c=0;c<i;c++){let h=a[l][c],u=a[l+1][c],f=a[l][c+1],d=a[l+1][c+1];for(let[p,y,g]of[[h,f,u],[f,d,u]]){let m=y[0]-p[0],_=y[1]-p[1],x=y[2]-p[2],v=g[0]-p[0],E=g[1]-p[1],w=g[2]-p[2];Math.hypot(_*w-x*E,x*v-m*w,m*E-_*v)/2>1e-10&&yt(o,p,y,g)}}return o}function Qd(n,e,t,i,r,s,a,o=28,l=16,c=1){let h=[],u=[];for(let f=0;f<=l;f++){let d=s+(a-s)*f/l,p=[];for(let y=0;y<=o;y++){let g=i+(r-i)*y/o;p.push([n*c*Math.sin(d)*Math.cos(g),e*c*Math.cos(d),t*c*Math.sin(d)*Math.sin(g)])}u.push(p)}for(let f=0;f<l;f++)for(let d=0;d<o;d++){let p=u[f][d],y=u[f+1][d],g=u[f][d+1],m=u[f+1][d+1];yt(h,p,y,g),yt(h,g,y,m)}return h}function ep(n,e=!0,t=!1){let i=[],r=n[0].length;for(let s=0;s<n.length-1;s++){let a=n[s],o=n[s+1];for(let l=0;l<r;l++){let c=(l+1)%r;yt(i,a[l],a[c],o[l]),yt(i,a[c],o[c],o[l])}}if(t)for(let s of[0,n.length-1]){let a=n[s],o=[0,0,0];for(let l of a)o[0]+=l[0]/a.length,o[1]+=l[1]/a.length,o[2]+=l[2]/a.length;for(let l=0;l<a.length;l++){let c=a[l],h=a[(l+1)%a.length];s===0?yt(i,o,h,c):yt(i,o,c,h)}}return i}function tp(n,e,t,i,r=32,s=.66,a=.78){let o=[];for(let l=0;l<r;l++){let c=ns*l/r,h=Math.cos(c),u=Math.sin(c),f=n*Math.sign(h)*Math.pow(Math.abs(h),s),d=t+e*(.5+.5*Math.sign(u)*Math.pow(Math.abs(u),a));o.push([f,d,i])}return o}var or=(n,e)=>n[0]*e[0]+n[1]*e[1]+n[2]*e[2],is=(n,e)=>n.map((t,i)=>t-e[i]),gh=(n,e)=>n.map((t,i)=>t+e[i]),rs=(n,e)=>n.map(t=>t*e),Jb=(n,e)=>[n[1]*e[2]-n[2]*e[1],n[2]*e[0]-n[0]*e[2],n[0]*e[1]-n[1]*e[0]];function yh(n,e){for(let t=1;t+1<n.length;t++){let i=Jb(is(n[t],n[0]),is(n[t+1],n[0])),r=Math.hypot(...i);if(r>1e-12){let s=rs(i,1/r);return{v:n,normal:s,w:or(s,n[0]),source:e}}}return null}var Kb=n=>({v:[...n.v].reverse(),normal:rs(n.normal,-1),w:-n.w,source:n.source});function np(n,e,{operation:t="union",tolerance:i=1e-6,maxPolygons:r=2e4,maxSplits:s=2e5}={}){if(!["union","subtract","intersect"].includes(t)||!Number.isFinite(i)||i<=0)throw new Error("invalid solid operation or tolerance");let a=0,o=()=>{if(++a>s)throw new Error("solid operation work budget exceeded")};function l(w,M,T,b,S,I){o();let O=M.v.map(N=>{let B=or(w.normal,N)-w.w;return B>i?1:B<-i?2:0}),k=O.reduce((N,B)=>N|B,0);if(k===0){(or(w.normal,M.normal)>0?S:I).push(M);return}if(k===1){T.push(M);return}if(k===2){b.push(M);return}let L=[],U=[];for(let N=0;N<M.v.length;N++){let B=(N+1)%M.v.length,$=M.v[N],J=M.v[B],re=O[N],Y=O[B];if(re!==2&&L.push($),re!==1&&U.push($),(re|Y)===3){let Z=is(J,$),le=(w.w-or(w.normal,$))/or(w.normal,Z),de=gh($,rs(Z,le));L.push(de),U.push(de)}}let F=yh(L,M.source),H=yh(U,M.source);F&&T.push(F),H&&b.push(H)}class c{constructor(M=[],T=0){if(T>180)throw new Error("solid BSP depth exceeded");this.depth=T,this.p=[],this.front=null,this.back=null,this.plane=null,M.length&&this.build(M)}invert(){this.p=this.p.map(Kb),this.plane&&(this.plane={normal:rs(this.plane.normal,-1),w:-this.plane.w}),this.front?.invert(),this.back?.invert(),[this.front,this.back]=[this.back,this.front]}clip(M){if(!this.plane)return M;let T=[],b=[];for(let S of M)l(this.plane,S,T,b,T,b);return this.front&&(T=this.front.clip(T)),this.back?b=this.back.clip(b):b=[],T.concat(b)}clipTo(M){this.p=M.clip(this.p),this.front?.clipTo(M),this.back?.clipTo(M)}all(){return this.p.concat(this.front?.all()||[],this.back?.all()||[])}build(M){if(this.p.length+M.length>r)throw new Error("solid polygon budget exceeded");this.plane||(this.plane={normal:M[0].normal,w:M[0].w});let T=[],b=[];for(let S of M)l(this.plane,S,T,b,this.p,this.p);T.length&&(this.front||(this.front=new c([],this.depth+1)),this.front.build(T)),b.length&&(this.back||(this.back=new c([],this.depth+1)),this.back.build(b))}}let h=(w,M)=>{if(w.indices.length/3>6e3)throw new Error("solid input exceeds6000 triangles; use a simpler source");let T=[];for(let b=0;b<w.indices.length;b+=3){let S=yh(w.indices.slice(b,b+3).map(I=>w.vertices.slice(I*3,I*3+3)),M);S&&T.push(S)}if(!T.length)throw new Error("solid input has no valid faces");return T},u=new c(h(n,0)),f=new c(h(e,1));t==="union"?(u.clipTo(f),f.clipTo(u),f.invert(),f.clipTo(u),f.invert(),u.build(f.all())):t==="subtract"?(u.invert(),u.clipTo(f),f.clipTo(u),f.invert(),f.clipTo(u),f.invert(),u.build(f.all()),u.invert()):(u.invert(),f.clipTo(u),f.invert(),u.clipTo(f),f.clipTo(u),u.build(f.all()),u.invert());let d=u.all();if(!d.length)throw new Error("solid result is empty");if(d.length>r)throw new Error("solid output budget exceeded");let p=new Map,y=w=>w.map(M=>Math.round(M/i)).join("|");for(let w of d)for(let M of w.v)p.set(y(M),M);let g=[...p.values()],m=[],_=[],x=new Map,v=0,E=w=>{let M=y(w);if(x.has(M))return x.get(M);let T=m.length/3;return m.push(...w),x.set(M,T),T};for(let w of d){let M=[];for(let S=0;S<w.v.length;S++){let I=w.v[S],O=w.v[(S+1)%w.v.length],k=is(O,I),L=or(k,k),U=[{t:0,v:I}];if(!(L<i*i)){for(let F of g){if(++v>4e6)throw new Error("solid boundary stitching budget exceeded");let H=or(is(F,I),k)/L;if(H<=1e-8||H>=1-1e-8)continue;let N=gh(I,rs(k,H));Math.hypot(...is(N,F))<=i&&U.push({t:H,v:F})}U.sort((F,H)=>F.t-H.t);for(let F of U)(!M.length||y(M.at(-1))!==y(F.v))&&M.push(F.v)}}let T=rs(M.reduce((S,I)=>gh(S,I),[0,0,0]),1/M.length),b=E(T);for(let S=0;S<M.length;S++){let I=E(M[S]),O=E(M[(S+1)%M.length]);I!==O&&I!==b&&O!==b&&_.push(b,I,O)}}return{vertices:m,indices:_,provenance:{operation:t,inputTriangles:[n.indices.length/3,e.indices.length/3],work:a,edgeTests:v,sourcePolicy:"one result material; source objects retained separately"}}}var Ys=(n,e)=>n.map((t,i)=>t-e[i]),Qb=(n,e)=>n.map(t=>t*e);var ip=(n,e)=>[n[1]*e[2]-n[2]*e[1],n[2]*e[0]-n[0]*e[2],n[0]*e[1]-n[1]*e[0]],_h=n=>Math.hypot(...n),La=(n,e)=>_h(Ys(n,e)),e1=n=>{let e=_h(n);return e?Qb(n,1/e):[0,0,0]};var t1=n=>Array.isArray(n)&&n.length===3&&n.every(Number.isFinite);function xh(n,e){if(!t1(n))throw new Error(`${e}: expected three finite numbers`);return n}function n1(n){if(n=n??1e-7,!Number.isFinite(n)||n<=0)throw new Error("tolerance: expected a positive finite number");return n}function i1(n){let e=[1/0,1/0,1/0],t=[-1/0,-1/0,-1/0];for(let i of n)for(let r=0;r<3;r++)e[r]=Math.min(e[r],i[r]),t[r]=Math.max(t[r],i[r]);return{min:e,max:t}}function rp(n,e={}){if(!(Array.isArray(n)||ArrayBuffer.isView(n))||n.length%9)throw new Error("trianglesFromPositions: expected flat triangle xyz positions");let t=[];for(let i=0;i<n.length;i+=9){let r=Array.from(n.slice(i,i+3)),s=Array.from(n.slice(i+3,i+6)),a=Array.from(n.slice(i+6,i+9));xh(r,"triangle"),xh(s,"triangle"),xh(a,"triangle"),t.push({...e,index:i/9,a:r,b:s,c:a,normal:e1(ip(Ys(s,r),Ys(a,r))),bounds:i1([r,s,a])})}return t}function sp(n,e={}){let t=n1(e.tolerance),i=[],r=new Map,s=[],a=new Map,o=0;function l(_){let x=_.map(M=>Math.floor(M/t));if(!x.every(Number.isSafeInteger)){let M=_.join("|");if(r.has(M))return r.get(M)[0];let T=i.length;return i.push(_),r.set(M,[T]),T}for(let M=-1;M<=1;M++)for(let T=-1;T<=1;T++)for(let b=-1;b<=1;b++){let S=r.get([x[0]+M,x[1]+T,x[2]+b].join("|"))||[];for(let I of S)if(La(i[I],_)<=t)return I}let E=i.length;i.push(_);let w=x.join("|");return r.has(w)||r.set(w,[]),r.get(w).push(E),E}for(let _ of n){let x=[_.a,_.b,_.c].map(l),v=_h(ip(Ys(_.b,_.a),Ys(_.c,_.a)));if(new Set(x).size<3||v<=t*Math.max(La(_.a,_.b),La(_.a,_.c),La(_.b,_.c))){o++;continue}let E=s.length;s.push(x);for(let w=0;w<3;w++){let M=x[w],T=x[(w+1)%3],b=M<T?`${M}|${T}`:`${T}|${M}`;a.has(b)||a.set(b,[]),a.get(b).push({a:M,b:T,face:E})}}let c=0,h=0,u=0,f=s.map(()=>[]);for(let _ of a.values()){_.length===1&&c++,_.length>2&&h++,_.length===2&&_[0].a===_[1].a&&u++;for(let x=1;x<_.length;x++)f[_[0].face].push(_[x].face),f[_[x].face].push(_[0].face)}let d=0,p=new Set;for(let _=0;_<s.length;_++)if(!p.has(_)){d++;let x=[_];for(p.add(_);x.length;)for(let v of f[x.pop()])p.has(v)||(p.add(v),x.push(v))}let y=0,g=i.map(()=>[]);s.forEach((_,x)=>_.forEach(v=>g[v].push(x)));for(let _=0;_<g.length;_++){let x=new Set(g[_]);if(!x.size)continue;let v=new Set,E=[x.values().next().value];for(;E.length;){let w=E.pop();if(!v.has(w)){v.add(w);for(let M of f[w])x.has(M)&&E.push(M)}}v.size!==x.size&&y++}let m=s.length>0&&!c&&!h&&!y&&!u&&!o;return{triangles:n.length,vertices:i.length,boundaryEdges:c,nonManifoldEdges:h,nonManifoldVertices:y,windingConflicts:u,degenerateTriangles:o,components:d,closed:m,solidSafe:m&&d===1,solidStatus:m&&d===1?"closed_manifold":"unsafe",tolerance:t,...d>1?{caution:"multiple_shells_not_classified"}:{}}}var rn=(n,e)=>n[0]*e[0]+n[1]*e[1]+n[2]*e[2],sn=(n,e)=>n.map((t,i)=>t-e[i]),bh=(n,e)=>[n[1]*e[2]-n[2]*e[1],n[2]*e[0]-n[0]*e[2],n[0]*e[1]-n[1]*e[0]],oi=(n,e)=>n.slice(e*3,e*3+3),Da=n=>typeof n=="number"&&Number.isFinite(n),r1=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],op=(n,e)=>[0,1,2].map(t=>e[t]*n[0]+e[4+t]*n[1]+e[8+t]*n[2]+e[12+t]);function lp(n){let e=[1/0,1/0,1/0],t=[-1/0,-1/0,-1/0];for(let i=0;i<n.length;i++)e[i%3]=Math.min(e[i%3],n[i]),t[i%3]=Math.max(t[i%3],n[i]);return{min:e,max:t}}function ss(n,e){for(let t=1;t+1<n.length;t++){let i=bh(sn(n[t],n[0]),sn(n[t+1],n[0])),r=Math.hypot(...i);if(r>e*e){let s=i.map(a=>a/r);return{normal:s,w:rn(s,n[0])}}}return null}function vh(n,e){let t=[];for(let i of n)(!t.length||Math.hypot(...sn(i,t.at(-1)))>e)&&t.push(i);return t.length>1&&Math.hypot(...sn(t[0],t.at(-1)))<=e&&t.pop(),t.length>=3&&ss(t,e)?t:null}function cp(n,e,t,i){i(n.length);let r=n.map(o=>rn(e.normal,o)-e.w);if(r.every(o=>o<=t))return{back:n,front:null};if(r.every(o=>o>=-t))return{back:null,front:n};let s=[],a=[];for(let o=0;o<n.length;o++){let l=(o+1)%n.length,c=n[o],h=n[l],u=r[o],f=r[l];if(u<=t&&s.push(c),u>=-t&&a.push(c),u>t&&f<-t||u<-t&&f>t){let d=u/(u-f),p=c.map((y,g)=>y+(h[g]-y)*d);s.push(p),a.push(p)}}return{back:vh(s,t),front:vh(a,t)}}function s1(n,e,t,i){for(let r of e)if(n=cp(n,r,t,i).back,!n)return null;return n}function ap(n,e,t,i,r=!1){if(r){let a=ss(n,t)?.normal;if(a&&e.some(o=>rn(a,o.normal)>1-1e-8&&n.every(l=>Math.abs(rn(o.normal,l)-o.w)<=t)))return[n]}let s=[];for(let a of e){let o=cp(n,a,t,i);if(o.front&&s.push(o.front),n=o.back,!n)break}return s}function hp(n,e={}){if(!n||typeof n!="object"||Array.isArray(n))throw j("clearance cutter","expected a cylindrical descriptor");let t="clearance cutter",i=ht(e.budget),r=n.axis??"y",s=["x","y","z"].indexOf(r);if(s<0)throw j(t,"axis must be x, y or z");let a=n.center??[0,0,0],o=n.radius,l=n.depth,c=n.segments??48,h=n.matrix??r1;if(!Array.isArray(a)||a.length!==3||!a.every(Da))throw j(t,"center needs three finite numbers");if(!Da(o)||o<=0||!Da(l)||l<=0)throw j(t,"radius and depth must be positive finite numbers");if(!Number.isSafeInteger(c)||c<8||c>256)throw j(t,"segments must be an integer in [8,256]");if(!Array.isArray(h)||h.length!==16||!h.every(Da)||h[3]!==0||h[7]!==0||h[11]!==0||h[15]!==1)throw j(t,"matrix must be affine column-major 4x4");Le(c*2,c*4-4,i,t);let u=[0,1,2].filter(x=>x!==s),f=o/Math.cos(Math.PI/c),d=[],p=[];for(let x of[-1,1])for(let v=0;v<c;v++){let E=2*Math.PI*(v+.5)/c,w=a.slice();w[s]+=x*l/2,w[u[0]]+=f*Math.cos(E),w[u[1]]+=f*Math.sin(E),d.push(op(w,h))}p.push(d.slice(0,c),d.slice(c));for(let x=0;x<c;x++){let v=(x+1)%c;p.push([d[x],d[v],d[v+c],d[x+c]])}let y=op(a,h),g=lp(d.flat()),m=Math.max(1e-12,Math.hypot(...sn(g.max,g.min))*1e-11),_=[];for(let x of p){let v=ss(x,m);if(!v)throw j(t,"singular/collapsed cylinder frame");let E=[0,1,2].map(w=>x.reduce((M,T)=>M+T[w],0)/x.length);rn(v.normal,sn(E,y))<0&&(x.reverse(),v=ss(x,m)),_.push(v)}return{polygons:p,planes:_,bounds:g}}function o1(n,e,t){let i="clearance source",r=ts(n,i);if(!r.size||[...r.values()].some(c=>c.length!==2))throw j(i,"requires a closed outward convex solid; open sources are unsupported");let s=[],a=[],o=0,l=oi(n.vertices,0);for(let c=0;c<n.indices.length;c+=3){let h=n.indices.slice(c,c+3).map(f=>oi(n.vertices,f)),u=ss(h,e);if(!u)throw j(i,"degenerate triangle");s.push(h),o+=rn(sn(h[0],l),bh(sn(h[1],l),sn(h[2],l)))/6,a.some(f=>(t(1),rn(u.normal,f.normal)>1-1e-10&&Math.abs(u.w-f.w)<=e))||a.push(u)}if(o<=e**3)throw j(i,"requires positive outward volume");for(let c of a)for(let h=0;h<n.vertices.length;h+=3)if(t(1),rn(c.normal,n.vertices.slice(h,h+3))-c.w>e*4)throw j(i,"non-convex sources are unsupported; use separate convex parts");return{polygons:s,planes:a,volume:o}}function a1(n,e,t,i){let r=[],s=[],a=new Map,o=(d,p,y)=>`${d}|${p}|${y}`,l=d=>{let p=d.map(m=>Math.floor(m/e)),y=-1;if(!p.every(Number.isSafeInteger))throw j("clearance","coordinate/precision ratio is unsupported");e:for(let m=-1;m<=1;m++)for(let _=-1;_<=1;_++)for(let x=-1;x<=1;x++)for(let v of a.get(o(p[0]+m,p[1]+_,p[2]+x))||[])if(Math.hypot(...sn(d,oi(r,v)))<=e){y=v;break e}if(y>=0)return y;y=r.length/3,r.push(...d);let g=o(...p);return a.has(g)||a.set(g,[]),a.get(g).push(y),Le(r.length/3,0,t,"clearance"),y};for(let d of n){let p=vh(d,e);if(!p)continue;let y=p.map(l).filter((g,m,_)=>g!==_[(m+_.length-1)%_.length]);new Set(y).size>=3&&s.push(y)}let c=r.length/3,h=[];for(let d of s){let p=[];for(let y=0;y<d.length;y++){let g=oi(r,d[y]),m=oi(r,d[(y+1)%d.length]),_=sn(m,g),x=rn(_,_),v=[];if(!(x<=e*e)){p.push(d[y]);for(let E=0;E<c;E++){if(E===d[y]||E===d[(y+1)%d.length])continue;i(1);let w=oi(r,E),M=rn(sn(w,g),_)/x;M<=e/Math.sqrt(x)||M>=1-e/Math.sqrt(x)||Math.hypot(...w.map((T,b)=>T-g[b]-M*_[b]))<=e*2&&v.push({id:E,t:M})}v.sort((E,w)=>E.t-w.t);for(let E of v)p.at(-1)!==E.id&&p.push(E.id)}}if(!(p.length<3)){if(p.length===3)h.push(...p);else{let y=[0,1,2].map(m=>d.reduce((_,x)=>_+r[x*3+m],0)/d.length),g=l(y);for(let m=0;m<p.length;m++)h.push(g,p[m],p[(m+1)%p.length])}Le(r.length/3,h.length/3,t,"clearance")}}let u=new Map,f={vertices:[],indices:[]};for(let d of h)u.has(d)||(u.set(d,f.vertices.length/3),f.vertices.push(...oi(r,d))),f.indices.push(u.get(d));for(let d=0;d<f.indices.length;d+=3)if(Math.hypot(...nr(f.vertices,...f.indices.slice(d,d+3)))<=e*e)throw j("clearance","precision collapsed a cut triangle");return tt(f,{budget:t,operator:"clearance"})}function up(n,e,t={}){let i="clearance",r=ht(t.budget),s=tt(n,{budget:r,operator:i});if(!Array.isArray(e)||e.length>32)throw j(i,"at most 32 cutters supported");if(!s.indices.length||!e.length)return s;let a=lp(s.vertices),o=Math.hypot(...sn(a.max,a.min)),l=Math.max(...a.min.map(Math.abs),...a.max.map(Math.abs)),c=Math.max(1e-11,o*1e-10,l*Number.EPSILON*8),h=0,u=x=>{if(h+=x,h>3e7)throw j(i,"clipping work budget exceeded; reduce cutters/segments/source complexity")},f=o1(s,c,u),d=e.filter(x=>{if(!x||!Array.isArray(x.polygons)||!Array.isArray(x.planes)||!x.bounds)throw j(i,"expected cylindricalEnvelope descriptors");return[0,1,2].every(v=>x.bounds.max[v]>=a.min[v]-c&&x.bounds.min[v]<=a.max[v]+c)&&!f.planes.some(v=>x.polygons.every(E=>E.every(w=>rn(v.normal,w)-v.w>=-c)))});if(!d.length)return s;let p=x=>Le(x.reduce((v,E)=>v+E.length,0),x.reduce((v,E)=>v+E.length-2,0),r,i),y=f.polygons;for(let x of d)y=y.flatMap(v=>ap(v,x.planes,c,u)),p(y);for(let x=0;x<d.length;x++)for(let v of d[x].polygons){let E=s1(v,f.planes,c,u);if(!E)continue;let w=ss(E,c).normal;if(f.planes.some(T=>rn(w,T.normal)>1-1e-8&&E.every(b=>Math.abs(rn(T.normal,b)-T.w)<=c)))continue;let M=[E];for(let T=0;T<d.length;T++)T!==x&&(M=M.flatMap(b=>ap(b,d[T].planes,c,u,x<T)));for(let T of M)y.push(T.slice().reverse());p(y)}let g=a1(y,c*4,r,u);if(!g.indices.length)return g;if([...ts(g,i).values()].some(x=>x.length!==2))throw j(i,"cut is not a closed manifold at this precision; adjust tangency/feature spacing");let m=0,_=oi(g.vertices,0);for(let x=0;x<g.indices.length;x+=3){let[v,E,w]=g.indices.slice(x,x+3).map(M=>sn(oi(g.vertices,M),_));m+=rn(v,bh(E,w))/6}if(m<=0||m>f.volume+c*o*o*16)throw j(i,"invalid oriented volume");return g}var Te=n=>{throw j("path",n)},Si=(n,e)=>n.map((t,i)=>t-e[i]),Yt=(n,e)=>n.map((t,i)=>t+e[i]),Ze=(n,e)=>n.map(t=>t*e),Wn=(n,e)=>n.reduce((t,i,r)=>t+i*e[r],0),os=(n,e)=>[n[1]*e[2]-n[2]*e[1],n[2]*e[0]-n[0]*e[2],n[0]*e[1]-n[1]*e[0]],gn=(n,e="direction")=>{let t=Math.hypot(...n);return(!Number.isFinite(t)||t<1e-12)&&Te(`${e} is degenerate`),Ze(n,1/t)},mn=(n,e,t,i=-1/0)=>(n=n===void 0?e:n,(typeof n!="number"||!Number.isFinite(n)||n<i)&&Te(`${t} must be finite and >= ${i}`),n),$s=(n,e,t)=>(n=n===void 0?e:n,(!Array.isArray(n)||n.length!==3||!n.every(Number.isFinite))&&Te(`${t} needs three finite coordinates`),n.slice()),l1=n=>(n?.modifiers??[]).some(e=>e.enabled!==!1),Tn=1e-8;function dp(n,e){let t=Ai(e);return gn([0,1,2].map(i=>t[i*4]*n[0]+t[i*4+1]*n[1]+t[i*4+2]*n[2]),"planeNormal")}function c1(n){let e=[0,4,8].map(r=>n.slice(r,r+3)),t=e.map(r=>Math.hypot(...r)),i=Math.max(...t);return(!i||t.some(r=>Math.abs(r-i)>Tn*i)||e.some((r,s)=>e.some((a,o)=>o>s&&Math.abs(Wn(r,a))>Tn*t[s]*t[o])))&&Te("owner frame must be rigid or uniformly scaled; nonuniform/sheared path owners are unsupported"),i}function pp(n,e,t,i={}){return e=gn(e,"tangent"),t=gn(t,"outward"),{position:n,tangent:e,outward:t,transverse:gn(os(t,e),"transverse"),handedness:1,...i}}function Na(n){return(!n||typeof n!="object")&&Te("path must be a descriptor"),n.type==="points"?[]:(n.type!=="belt"&&Te("path type must be points or belt"),(!Array.isArray(n.wheels)||n.wheels.length!==2||n.wheels.some(e=>typeof e!="string"||!e))&&Te("belt wheels must contain two exact object IDs"),n.wheels[0]===n.wheels[1]&&Te("belt wheels must reference distinct objects"),n.wheels.slice())}function mp(n,e,t=new Set){let i=n?.object;i||Te("wheel reference is missing"),(i.parts||l1(i)||n.ancestorModifiers)&&Te(`wheel ${i.id??""} must be an unmodified tyre or cylinder leaf`);let r=i.recipe?.type??i.kind,s=i.recipe?.params??i.params??{},a,o;if(r==="mirrorOf"){(!e||t.has(i.id)||t.size>32)&&Te("mirrored wheel needs an acyclic document target context"),(s.space??"world")!=="world"&&Te("mirrored wheel space must be world"),t.add(i.id);let u=mp(e(s.target),e,t),f=yp(s.axis??"x",s.pivot??0);return t.delete(i.id),{...u,target:String(i.id),center:Nn(u.center,f),axis:gn(Ei(u.axis,f),"wheel axis")}}if(r==="tyre")a=mn(s.outerRadius,.5,"outerRadius",Number.MIN_VALUE),o=mn(s.width,.25,"width",Number.MIN_VALUE);else if(r==="cylinder"){let u=!i.recipe,f=mn(s.radiusBottom??(u?void 0:s.radius),u?.42:.5,"radiusBottom",Number.MIN_VALUE),d=mn(s.radiusTop,u?.42:f,"radiusTop",Number.MIN_VALUE);Math.abs(f-d)>Tn*Math.max(f,d)&&Te("belt requires a cylinder with equal top/bottom radii"),a=Math.max(f,d),o=mn(s.height??s.h,u?1.1:1,"height",Number.MIN_VALUE)}else Te(`wheel ${i.id??""} needs a tyre or cylinder recipe; automatic bounds inference is unsupported`);let l=n.matrix??Xn(),c=[0,4,8].map(u=>l.slice(u,u+3)),h=c.map(u=>Math.hypot(...u));return(h.some(u=>!Number.isFinite(u)||u<1e-12)||Math.abs(h[0]-h[2])>Tn*Math.max(h[0],h[2])||c.some((u,f)=>c.some((d,p)=>p>f&&Math.abs(Wn(u,d))>Tn*h[f]*h[p])))&&Te(`wheel ${i.id??""} has nonuniform radial scale or shear; a circular world envelope is required`),{target:String(i.id),center:Nn([0,0,0],l),axis:gn(c[1],"wheel axis"),radius:a*Math.max(h[0],h[2]),halfWidth:o*h[1]/2}}function h1(n,e){(!Array.isArray(n.points)||n.points.length<2||n.points.length>4096)&&Te("points needs 2..4096 points"),n.closed!==void 0&&typeof n.closed!="boolean"&&Te("closed must be boolean"),n.outwardPoint!==void 0&&$s(n.outwardPoint,null,"outwardPoint");let t=n.closed!==!1,i=n.space??"owner";["owner","world"].includes(i)||Te("points space must be owner or world");let r=i==="owner"?e.matrix??Xn():Xn(),s=i==="owner"?c1(r):1,a=dp(gn($s(n.planeNormal,[1,0,0],"planeNormal")),r),o=n.points.map(b=>Nn($s(b,null,"point"),r)),l=Math.max(...[0,1,2].map(b=>Math.max(...o.map(S=>S[b]))-Math.min(...o.map(S=>S[b])))),c=1e-10*Math.max(1,l);t&&o.length>2&&Math.hypot(...Si(o[0],o.at(-1)))<=c&&o.pop(),t&&o.length<3&&Te("closed path needs three distinct points");let h=o[0],u=t?o.length:o.length-1,f=[],d=[],p=[0];for(let b of o)Math.abs(Wn(Si(b,h),a))>Tn*Math.max(1,l)&&Te("points must lie in planeNormal plane; nonplanar paths are unsupported");for(let b=0;b<u;b++){let S=Si(o[(b+1)%o.length],o[b]),I=Math.hypot(...S);I<=c&&Te("adjacent path points are coincident or degenerate"),f.push(I),d.push(Ze(S,1/I)),p.push(p.at(-1)+I)}let y=d[0],g=os(a,y),m=b=>{let S=Si(b,h);return[Wn(S,y),Wn(S,g)]},_=o.map(m),x=(b,S,I)=>(S[0]-b[0])*(I[1]-b[1])-(S[1]-b[1])*(I[0]-b[0]),v=(b,S,I)=>Math.abs(x(b,S,I))<=c*Math.max(c,Math.hypot(S[0]-b[0],S[1]-b[1]))&&I[0]>=Math.min(b[0],S[0])-c&&I[0]<=Math.max(b[0],S[0])+c&&I[1]>=Math.min(b[1],S[1])-c&&I[1]<=Math.max(b[1],S[1])+c;for(let b=0;b<u;b++)for(let S=b+1;S<u;S++){if(S===b+1||t&&b===0&&S===u-1)continue;let I=_[b],O=_[(b+1)%o.length],k=_[S],L=_[(S+1)%o.length];(x(I,O,k)*x(I,O,L)<0&&x(k,L,I)*x(k,L,O)<0||v(I,O,k)||v(I,O,L)||v(k,L,I)||v(k,L,O))&&Te("path self-intersects or touches a nonadjacent segment")}let E=1;if(t){let b=_.reduce((S,I,O)=>{let k=_[(O+1)%o.length];return S+I[0]*k[1]-k[0]*I[1]},0);Math.abs(b)<=c*Math.max(1,l)&&Te("closed path has degenerate area"),E=Math.sign(b)}else{n.outwardPoint===void 0&&Te("open paths require outwardPoint to choose an outward side");let b=Nn($s(n.outwardPoint,null,"outwardPoint"),r),S=Wn(Si(b,h),os(d[0],a));Math.abs(S)<=c&&Te("outwardPoint lies on the first path segment plane"),E=Math.sign(S)}let w=o.map((b,S)=>{if(!t&&(S===0||S===o.length-1))return d[S===0?0:u-1];let I=d[(S-1+u)%u],O=d[S%u];return Wn(I,O)<-1+Tn&&Te("path reverses at a degenerate 180-degree corner"),gn(Yt(I,O),"corner tangent")}),M=p.at(-1),T=b=>{b=mn(b,0,"distance"),t?b=(b%M+M)%M:(b<0||b>M)&&Te("open path sample lies outside [0,length]");let S=0;for(;S<u-1&&b>p[S+1]+c;)S++;let I=Math.max(0,Math.min(1,(b-p[S])/f[S])),O=Yt(o[S],Ze(Si(o[(S+1)%o.length],o[S]),I)),k=I<=c/f[S]?w[S]:1-I<=c/f[S]?w[(S+1)%o.length]:d[S];return pp(O,k,Ze(os(k,a),E),{distance:b,segmentIndex:S})};return{type:"points",closed:t,length:M,planeNormal:a,sourceScale:s,orientationSource:t?"winding":"outwardPoint",points:o,knots:p.slice(0,o.length),segments:o.slice(0,u).map((b,S)=>({a:b,b:o[(S+1)%o.length],start:p[S],length:f[S]})),sample:T}}function u1(n,e){let t=Na(n);typeof e.target!="function"&&Te("belt needs document target context");let i=t.map(y=>mp(e.target(y),e.target)),[r,s]=i;n.closed!==void 0&&typeof n.closed!="boolean"&&Te("closed must be boolean"),n.closed===!1&&Te("belt paths are closed"),(n.space??"world")!=="world"&&Te("belt paths use world wheel frames; space must be world");let a=Math.max(r.radius,s.radius),o=Si(s.center,r.center),l=Math.hypot(...o);Math.abs(r.radius-s.radius)>Tn*a&&Te("belt currently supports two equal world radii; unequal-radius or multi-wheel envelopes are unsupported"),l<Tn*Math.max(1,a)&&Te("belt wheel centers are coincident or too near"),(Math.abs(Math.abs(Wn(r.axis,s.axis))-1)>Tn||Math.abs(Wn(o,r.axis))>Tn*Math.max(1,l,a))&&Te("belt wheels must have parallel coplanar axes and centers");let c=r.axis;n.planeNormal!==void 0&&(c=gn($s(n.planeNormal,null,"planeNormal")),Math.abs(Math.abs(Wn(c,r.axis))-1)>Tn&&Te("belt planeNormal must be parallel to wheel axes"));let h=a+mn(n.clearance,0,"clearance",0),u=Ze(o,1/l),f=gn(os(c,u),"belt transverse"),d=2*l+2*Math.PI*h,p=y=>{y=mn(y,0,"distance"),y=(y%d+d)%d;let g,m,_,x;if(y<l)g=Yt(Yt(r.center,Ze(f,h)),Ze(u,y)),m=u,_=f,x=0;else if(y<l+Math.PI*h){let v=(y-l)/h;_=Yt(Ze(f,Math.cos(v)),Ze(u,Math.sin(v))),g=Yt(s.center,Ze(_,h)),m=Yt(Ze(f,-Math.sin(v)),Ze(u,Math.cos(v))),x=1}else if(y<2*l+Math.PI*h){let v=y-l-Math.PI*h;g=Si(Yt(s.center,Ze(f,-h)),Ze(u,v)),m=Ze(u,-1),_=Ze(f,-1),x=2}else{let v=(y-2*l-Math.PI*h)/h;_=Yt(Ze(f,-Math.cos(v)),Ze(u,-Math.sin(v))),g=Yt(r.center,Ze(_,h)),m=Yt(Ze(f,Math.sin(v)),Ze(u,-Math.cos(v))),x=3}return pp(g,m,_,{distance:y,segmentIndex:x})};return{type:"belt",closed:!0,length:d,planeNormal:c,sourceScale:1,orientationSource:"analytic-envelope",wheels:i,radius:h,knots:[0,l,l+Math.PI*h,2*l+Math.PI*h],segments:[{a:Yt(r.center,Ze(f,h)),b:Yt(s.center,Ze(f,h)),start:0,length:l},{a:Yt(s.center,Ze(f,-h)),b:Yt(r.center,Ze(f,-h)),start:l+Math.PI*h,length:l}],arcs:[{center:s.center,u:f,v:u,start:l,radius:h,sweep:Math.PI},{center:r.center,u:Ze(f,-1),v:Ze(u,-1),start:2*l+Math.PI*h,radius:h,sweep:Math.PI}],sample:p}}function f1(n,e={}){return Na(n),n.type==="points"?h1(n,e):u1(n,e)}function fp(n,e){let t=/^([+-]?)([xyz])$/.exec(n);return t||Te(`${e} must be x, y, z or a signed axis`),{index:"xyz".indexOf(t[2]),sign:t[1]==="-"?-1:1}}function d1(n,e="z",t="y",i=1){let r=fp(e,"forwardAxis"),s=fp(t,"outwardAxis");r.index===s.index&&Te("forwardAxis and outwardAxis must use different axes");let a=[];a[r.index]=Ze(n.tangent,r.sign),a[s.index]=Ze(n.outward,s.sign);let o=3-r.index-s.index;a[o]=os(a[(o+1)%3],a[(o+2)%3]);let l=Xn();for(let c=0;c<3;c++)for(let h=0;h<3;h++)l[c*4+h]=a[c][h]*i;for(let c=0;c<3;c++)l[12+c]=n.position[c];return l}function p1(n,e={}){e.count!==void 0&&e.spacing!==void 0&&Te("choose count or spacing, not both");let t=e.count;if(e.spacing!==void 0){let a=mn(e.spacing,void 0,"spacing",Number.MIN_VALUE);t=n.closed?Math.ceil(n.length/a):Math.ceil(n.length/a)+1}t=mn(t,32,"count",1),(!Number.isSafeInteger(t)||t>1e4)&&Te("count must be an integer in [1,10000]");let i=mn(e.phase,0,"phase");!n.closed&&i!==0&&Te("open path phase must be zero");let r=mn(e.offset,0,"offset");n.type==="belt"&&r<0&&Te("belt offset must be nonnegative to preserve its outer envelope");let s=[];for(let a=0;a<t;a++){let o=(n.closed?a/t:t===1?0:a/(t-1))*n.length+i*n.length,l=n.sample(o),c=Yt(l.position,Ze(l.outward,r)),h={...l,position:c,index:a};h.matrix=d1(h,e.forwardAxis??"z",e.outwardAxis??"y",n.sourceScale),s.push(h)}return s}function gp(n,e,t={}){let i=n.params??{},r=ht(t.budget,n.budget,i.budget),s=f1(i.path,e),a=p1(s,i),o=e.recipe(i.source,r),l=[],c=[];Le(o.vertices.length/3*a.length,o.indices.length/3*a.length,r,"pathRepeat");let h=Ai(e.matrix);for(let u of a){let f=Un(o,on(h,u.matrix),r),d=l.length/3;for(let p of f.vertices)l.push(p);for(let p of f.indices)c.push(d+p)}return e.record?.({directionRoles:{type:"path",space:"world",pathType:s.type,closed:s.closed,length:s.length,planeNormal:s.planeNormal,orientationSource:s.orientationSource,forwardAxis:i.forwardAxis??"z",outwardAxis:i.outwardAxis??"y",instanceCount:a.length,spacing:s.closed?s.length/a.length:a.length>1?s.length/(a.length-1):0,references:(s.wheels??[]).map(u=>({target:u.target,expectedSide:"outside"})),instances:a}}),tt({vertices:l,indices:c},{budget:r,operator:"pathRepeat"})}function yp(n="x",e=0){["x","y","z"].includes(n)||Te("mirror axis must be x, y or z"),e=mn(e,0,"pivot");let t=Xn(),i="xyz".indexOf(n);return t[i*4+i]=-1,t[12+i]=2*e,t}function m1(n,e){if(n)return{...n,planeNormal:n.planeNormal?dp(n.planeNormal,e):void 0,instances:(n.instances??[]).map(t=>({...t,position:Nn(t.position,e),tangent:gn(Ei(t.tangent,e)),outward:gn(Ei(t.outward,e)),transverse:gn(Ei(t.transverse,e)),handedness:-(t.handedness??1),matrix:t.matrix?on(e,t.matrix):void 0}))}}function xp(n,e,t={}){let i=n.params??{},r=ht(t.budget,n.budget,i.budget);(i.space??"world")!=="world"&&Te("mirrorOf currently supports world space only");let s=e.target(i.target);s.object.parts&&Te("mirrorOf currently requires a leaf target; reference each semantic leaf explicitly");for(let l of["followMaterial","followVisible","followShading"])i[l]!==void 0&&typeof i[l]!="boolean"&&Te(`${l} must be boolean`);let a=yp(i.axis??"x",i.pivot??0),o={directionRoles:m1(s.metadata?.directionRoles,a),mirror:{target:i.target,axis:i.axis??"x",pivot:i.pivot??0,space:"world"},...i.followMaterial!==!1?{material:s.material}:{},...i.followVisible!==!1?{visible:s.visible}:{},...i.followShading!==!1?{shading:s.shading}:{}};return e.record?.(o),Un(s.mesh,on(Ai(e.matrix),a),r)}var g1=Object.freeze(["surfacePath","surfaceAttach","clearance","pathRepeat","mirrorOf","meshBoolean","surfaceRegion","surfacePin","formRim"]),ar=n=>g1.includes(n?.type),qe=(n,e)=>{throw j(n,e)},zt=(n,e,t,i,r=-1/0)=>(n=n===void 0?e:n,(typeof n!="number"||!Number.isFinite(n)||n<r)&&qe(t,`${i} must be finite and >= ${r}`),n),as=(n,e,t,i)=>(n=n===void 0?e:n,(!Array.isArray(n)||n.length!==3||!n.every(r=>typeof r=="number"&&Number.isFinite(r)))&&qe(t,`${i} needs three finite coordinates`),n.slice()),ls=(n,e)=>n.map((t,i)=>t-e[i]),yn=(n,e)=>n.reduce((t,i,r)=>t+i*e[r],0),Ht=(n,e)=>[n[1]*e[2]-n[2]*e[1],n[2]*e[0]-n[0]*e[2],n[0]*e[1]-n[1]*e[0]],qn=(n,e)=>{let t=Math.hypot(...n);return t||qe(e,"direction/up cannot be zero"),n.map(i=>i/t)},Xn=()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],Nn=(n,e)=>[0,1,2].map(t=>e[t]*n[0]+e[4+t]*n[1]+e[8+t]*n[2]+e[12+t]),Ei=(n,e)=>[0,1,2].map(t=>e[t]*n[0]+e[4+t]*n[1]+e[8+t]*n[2]);function on(n,e){let t=new Array(16).fill(0);for(let i=0;i<4;i++)for(let r=0;r<4;r++)for(let s=0;s<4;s++)t[r*4+i]+=n[s*4+i]*e[r*4+s];return t}function Ai(n){let e=[n[0],n[4],n[8]],t=[n[1],n[5],n[9]],i=[n[2],n[6],n[10]],r=yn(e,Ht(t,i));(!Number.isFinite(r)||r===0)&&qe("relations","singular/unsupported transform");let s=Ht(t,i).map(h=>h/r),a=Ht(i,e).map(h=>h/r),o=Ht(e,t).map(h=>h/r),l=[s[0],s[1],s[2],0,a[0],a[1],a[2],0,o[0],o[1],o[2],0,0,0,0,1],c=Ei(n.slice(12,15),l);return l[12]=-c[0],l[13]=-c[1],l[14]=-c[2],l}function vp(n){let e=n.position??[0,0,0],t=n.scale??[1,1,1],i=n.rotation??[0,0,0],r=i.map(Math.cos),s=i.map(Math.sin),a=[r[2],s[2],0,0,-s[2],r[2],0,0,0,0,1,0,0,0,0,1],o=[r[1],0,-s[1],0,0,1,0,0,s[1],0,r[1],0,0,0,0,1],l=[1,0,0,0,0,r[0],s[0],0,0,-s[0],r[0],0,0,0,0,1],c=on(l,on(o,a));for(let h=0;h<3;h++)for(let u=0;u<3;u++)c[h*4+u]*=t[h];return c[12]=e[0],c[13]=e[1],c[14]=e[2],c}function Un(n,e,t){let i=[];for(let a=0;a<n.vertices.length;a+=3)i.push(...Nn(n.vertices.slice(a,a+3),e));let r=n.indices.slice();if(yn([e[0],e[1],e[2]],Ht([e[4],e[5],e[6]],[e[8],e[9],e[10]]))<0)for(let a=0;a<r.length;a+=3)[r[a+1],r[a+2]]=[r[a+2],r[a+1]];let s=tt({vertices:i,indices:r},{budget:t,operator:"relation transform"});if(n.cornerNormals){let a=Ai(e),o=[];for(let l=0;l<n.cornerNormals.length;l+=3){let c=n.cornerNormals.slice(l,l+3),h=[0,1,2].map(u=>a[u*4]*c[0]+a[u*4+1]*c[1]+a[u*4+2]*c[2]);o.push(...qn(h,"surface normal"))}if(yn([e[0],e[1],e[2]],Ht([e[4],e[5],e[6]],[e[8],e[9],e[10]]))<0)for(let l=0;l<o.length;l+=9)for(let c=0;c<3;c++)[o[l+3+c],o[l+6+c]]=[o[l+6+c],o[l+3+c]];s.cornerNormals=o}return s}function Ua(n,e=new Set){(!n||typeof n!="object"||typeof n.type!="string")&&qe("relations","source must be a recipe descriptor"),e.has(n)&&qe("relations","cyclic recipe source"),e.size>32&&qe("relations","recipe nesting budget exceeded"),e.add(n);let t=n.params??{},i=[];if(["surfacePath","surfaceAttach","mirrorOf","surfaceRegion","surfacePin","formRim"].includes(n.type)&&((typeof t.target!="string"||!t.target)&&qe(n.type,"target must be an exact object ID"),i.push(t.target)),n.type==="pathRepeat"&&i.push(...Na(t.path)),n.type==="meshBoolean"&&((!Array.isArray(t.targets)||t.targets.length!==2||t.targets.some(r=>typeof r!="string"||!r)||t.targets[0]===t.targets[1])&&qe("meshBoolean","two distinct exact targets required"),i.push(...t.targets)),n.type==="clearance"){(!Array.isArray(t.cutters)||t.cutters.length>32)&&qe("clearance","cutters must contain at most 32 descriptors");for(let r of t.cutters)(!r||typeof r!="object")&&qe("clearance","invalid cutter"),r.target!==void 0&&((typeof r.target!="string"||!r.target)&&qe("clearance","target must be an exact object ID"),i.push(r.target))}return["surfaceAttach","clearance","pathRepeat","surfacePin"].includes(n.type)&&i.push(...Ua(t.source,e)),e.delete(n),[...new Set(i)]}function y1(n,e,t,i=1/0){let r=qn(t,"surface projection"),s=null;for(let a=0;a<n.indices.length;a+=3){let[o,l,c]=n.indices.slice(a,a+3).map(v=>n.vertices.slice(v*3,v*3+3)),h=ls(l,o),u=ls(c,o),f=Ht(r,u),d=yn(h,f);if(Math.abs(d)<1e-13*Math.hypot(...h)*Math.hypot(...u))continue;let p=1/d,y=ls(e,o),g=yn(y,f)*p;if(g<-1e-9||g>1+1e-9)continue;let m=Ht(y,h),_=yn(r,m)*p;if(_<-1e-9||g+_>1+1e-9)continue;let x=yn(u,m)*p;x<-1e-10||x>i||s&&x>=s.distance||(s={point:e.map((v,E)=>v+Math.max(0,x)*r[E]),normal:qn(Ht(h,u),"surface normal"),distance:Math.max(0,x),face:a/3})}return s}function x1(n,e,t,i){Le(n.length*t+2,(n.length-1)*t*2+t*2,i,"surfacePath");let r=[],s=[],a=null;for(let o=0;o<n.length;o++){let l=qn(ls(n[Math.min(n.length-1,o+1)],n[Math.max(0,o-1)]),"surfacePath"),c=Math.abs(l[1])>.9?[1,0,0]:[0,1,0],h=a?a.map((d,p)=>d-l[p]*yn(a,l)):Ht(c,l);Math.hypot(...h)<1e-8&&(h=Ht(c,l));let u=qn(h,"surfacePath"),f=Ht(l,u);a=u;for(let d=0;d<t;d++){let p=2*Math.PI*d/t;r.push(...n[o].map((y,g)=>y+e*(u[g]*Math.cos(p)+f[g]*Math.sin(p))))}}for(let o=0;o+1<n.length;o++)for(let l=0;l<t;l++){let c=o*t+l,h=o*t+(l+1)%t,u=c+t,f=h+t;s.push(c,h,u,h,f,u)}for(let o of[0,n.length-1]){let l=r.length/3;r.push(...n[o]);for(let c=0;c<t;c++){let h=o*t+c,u=o*t+(c+1)%t;s.push(...o===0?[l,u,h]:[l,h,u])}}return tt({vertices:r,indices:s},{budget:i,operator:"surfacePath"})}function _1(n,e,t){let i=Ht(e,t),r=Math.max(-1,Math.min(1,yn(e,t))),s=Math.hypot(...i);if(s<1e-12){if(r>0)return n;let l=qn(Ht(e,Math.abs(e[0])<.9?[1,0,0]:[0,1,0]),"surfaceAttach");return n.map((c,h)=>2*l[h]*yn(l,n)-c)}let a=i.map(l=>l/s),o=Ht(a,n);return n.map((l,c)=>l*r+o[c]*s+a[c]*yn(a,n)*(1-r))}function _p(n,e,t){let i=e.target(n.target),r=n.space??"target";["target","world"].includes(r)||qe(t,"space must be target or world");let s=0,a=r==="target"?i.matrix:Xn(),o=qn(Ei(as(n.direction,[0,-1,0],t,"direction"),a),t),l=zt(n.maxDistance,10,t,"maxDistance",Number.MIN_VALUE),c=zt(n.offset,.003,t,"offset");return{target:i,frame:a,direction:o,maxDistance:l,offset:c,cast:h=>{s+=i.mesh.indices.length/3,s>3e7&&qe(t,"projection work budget exceeded; increase sampleStep or simplify target");let u=y1(i.mesh,Nn(h,a),o,l);return u||qe(t,`projection miss on target ${n.target} (maxDistance ${l})`),{...u,position:u.point.map((f,d)=>f+u.normal[d]*c)}}}}function bp(n,e,t={}){let i=n.type,r=n.params??{},s=ht(t.budget,n.budget,r.budget),a=Ai(e.matrix);if(i==="formRim"){let o=e.target(r.target);(o.object.recipe?.type!=="formBody"||o.ancestorModifiers||(o.object.modifiers||[]).some(m=>m.enabled!==!1))&&qe(i,"formRim needs an unmodified formBody source");let l=Xs(o.object.recipe.params),c=l.params.cuts.find(m=>m.id===r.cut);(!c||c.type!=="cylinder"||c.axis!=="x")&&qe(i,"rim currently needs a named transverse-X cylinder cut");let h=zt(r.side,Math.sign(c.center[0])||1,i,"side"),u=c.radius+zt(r.radialOffset,.012,i,"radialOffset",0),f=zt(r.segments,64,i,"segments",8);(!Number.isInteger(f)||f>128||![1,-1].includes(h))&&qe(i,"segments8..128 and side\xB11");let d=[],p=zt(r.startAngle,-Math.PI/2,i,"startAngle"),y=zt(r.endAngle,Math.PI/2,i,"endAngle");(y<=p||y-p>Math.PI*2)&&qe(i,"invalid rim angle range");for(let m=0;m<=f;m++){let _=p+(y-p)*m/f,x=c.center[1]+u*Math.cos(_),v=c.center[2]+u*Math.sin(_),E=l.section(v),w=l.bounds.max[0]-l.bounds.min[0],M=E.centerX+h*w,T=null;for(let b=1;b<=96;b++){let S=E.centerX+h*w*(1-b/96);if(l.field([S,x,v])<=0){T=S;break}M=S}T===null&&qe(i,"opening rim leaves the body; reduce radial offset or limit angles");for(let b=0;b<22;b++){let S=(T+M)/2;l.field([S,x,v])<=0?T=S:M=S}d.push([(T+M)/2+h*zt(r.offset,.003,i,"offset"),x,v])}let g;if(r.width!==void 0){let m=zt(r.width,.035,i,"width",1e-5),_=zt(r.thickness,.006,i,"thickness",1e-5),x=[],v=[];for(let M=0;M<d.length;M++){let T=p+(y-p)*M/f,b=[0,Math.cos(T),Math.sin(T)],S=d[M];for(let[I,O]of[[-m/2,_/2],[m/2,_/2],[m/2,-_/2],[-m/2,-_/2]])x.push(S[0]+h*O,S[1]+I*b[1],S[2]+I*b[2])}for(let M=0;M<f;M++)for(let T=0;T<4;T++){let b=M*4+T,S=M*4+(T+1)%4,I=(M+1)*4+(T+1)%4,O=(M+1)*4+T;v.push(b,S,I,b,I,O)}v.push(0,2,1,0,3,2);let E=f*4;v.push(E,E+1,E+2,E,E+2,E+3);let w=0;for(let M=0;M<v.length;M+=3){let T=x.slice(v[M]*3,v[M]*3+3),b=x.slice(v[M+1]*3,v[M+1]*3+3),S=x.slice(v[M+2]*3,v[M+2]*3+3);w+=yn(T,Ht(b,S))}if(w<0)for(let M=0;M<v.length;M+=3)[v[M+1],v[M+2]]=[v[M+2],v[M+1]];g=tt({vertices:x,indices:v},{budget:s,operator:i})}else g=e.recipe({type:"curveTube",params:{curve:{type:"catmullrom",points:d,segments:Math.min(256,f*2)},radius:zt(r.radius,.008,i,"radius",1e-5),radialSegments:8}},s);return e.record({openingRim:{target:r.target,cut:r.cut,source:"exact body-field intersection with named cylinder parameter curve"}}),Un(g,on(a,o.matrix),s)}if(i==="surfaceRegion"||i==="surfacePin"){let o=e.target(r.target);if((o.object.parts||!["controlSurface","formBody"].includes(o.object.recipe?.type)||o.ancestorModifiers||(o.object.modifiers||[]).some(E=>E.enabled!==!1))&&qe(i,"target must be an unmodified controlSurface leaf; use its control features for editing"),i==="surfaceRegion"){if(o.object.recipe.type==="formBody")return Un(zd(o.object.recipe.params,s,{uvBounds:r.uvBounds,resolution:r.resolution,offset:r.offset}),on(a,o.matrix),s);let E=r.uvBounds||[0,0,1,1],w=r.closeCuts===!0?["u0","u1","v0","v1"]:["u0","v0","u1","v1"].filter((T,b)=>E[b]===(b<2?0:1)),M=Ia(o.object.recipe.params,s,{uvBounds:r.uvBounds,thickness:r.thickness,resolution:r.resolution,edgeWalls:w});return Un(M,on(a,o.matrix),s)}(!Array.isArray(r.uv)||r.uv.length!==2)&&qe(i,"uv needs [u,v]");let l=(o.object.recipe.type==="formBody"?Xs:lh)(o.object.recipe.params).frame(...r.uv),c=e.recipe(r.source,s),h=l.normal,u=r.tangent?as(r.tangent,null,i,"tangent"):l.du,f=qn(u.map((E,w)=>E-h[w]*yn(u,h)),i),d=qn(Ht(f,h),i),p=zt(r.offset,0,i,"offset"),y=zt(r.rotation,0,i,"rotation"),g=Math.cos(y),m=Math.sin(y),_=[f.map((E,w)=>E*g+d[w]*m),h,d.map((E,w)=>E*g-f[w]*m)],x=l.point.map((E,w)=>E+h[w]*p),v=[..._[0],0,..._[1],0,..._[2],0,...x,1];return e.record({surfaceAnchor:{target:r.target,uv:r.uv,localPoint:l.point,localNormal:h,offset:p}}),Un(c,on(a,on(o.matrix,v)),s)}if(i==="pathRepeat")return gp(n,e,{budget:s});if(i==="mirrorOf")return xp(n,e,{budget:s});if(i==="meshBoolean"){let o=r.targets.map(u=>e.target(u)),l=u=>{let f=[];for(let d of u.indices)f.push(...u.vertices.slice(d*3,d*3+3));return sp(rp(f))};for(let u of o)u.object.parts&&qe(i,"target must be a closed leaf, not an assembly group"),l(u.mesh).solidSafe||qe(i,"input must be a closed connected oriented manifold; repair the selected shell first");let c=np(o[0].mesh,o[1].mesh,{operation:r.operation||"union",tolerance:r.tolerance??1e-6}),h=l(c);return(!h.closed||h.nonManifoldEdges||h.nonManifoldVertices||h.windingConflicts||h.degenerateTriangles)&&qe(i,"result topology could not be certified; source assets retained"),Un(c,a,s)}if(i==="surfacePath"){let o=_p(r,e,i),l=zt(r.sampleStep,.05,i,"sampleStep",Number.MIN_VALUE),c=zt(r.radius,.003,i,"radius",Number.MIN_VALUE),h=zt(r.radialSegments,8,i,"radialSegments",3);(!Number.isSafeInteger(h)||h>256)&&qe(i,"radialSegments must be an integer in [3,256]"),(!Array.isArray(r.points)||r.points.length<2||r.points.length>4096)&&qe(i,"points needs 2..4096 points");let u=r.points.map(d=>as(d,null,i,"point")),f=[];for(let d=0;d+1<u.length;d++){let p=u[d],y=u[d+1],g=Math.hypot(...ls(Nn(y,o.frame),Nn(p,o.frame)));g||qe(i,"adjacent points must be distinct");let m=Math.max(1,Math.ceil(g/l-1e-12*Math.max(1,g/l)));Le((f.length+m+1)*h+2,(f.length+m)*h*2+h*2,s,i);for(let _=0;_<m;_++)f.push(o.cast(p.map((x,v)=>x+(y[v]-x)*_/m)).position)}f.push(o.cast(u.at(-1)).position);for(let d=1;d<f.length;d++)Math.hypot(...ls(f[d],f[d-1]))<1e-12&&qe(i,"projected path collapses adjacent samples");return Un(x1(f,c,h,s),a,s)}if(i==="surfaceAttach"){let o=_p(r,e,i),l=o.cast(as(r.anchor,[0,1,0],i,"anchor")),c=e.recipe(r.source,s),h=as(r.up,[0,1,0],i,"up"),u=Ai(o.frame),f=qn([0,1,2].map(p=>u[p*4]*h[0]+u[p*4+1]*h[1]+u[p*4+2]*h[2]),i);r.alignNormal!==void 0&&typeof r.alignNormal!="boolean"&&qe(i,"alignNormal must be boolean");let d=[];for(let p=0;p<c.vertices.length;p+=3){let y=Ei(c.vertices.slice(p,p+3),o.frame);r.alignNormal!==!1&&(y=_1(y,f,l.normal)),d.push(...y.map((g,m)=>g+l.position[m]))}return Un({vertices:d,indices:Un(c,o.frame,s).indices},a,s)}if(i==="clearance"){let o=[],l=n,c=s;for(;l.type==="clearance";)o.length>32&&qe(i,"cutters budget exceeded"),c=ht(c,l.budget,l.params?.budget),o.push(...l.params.cutters.map(f=>({...f,segments:f.segments??l.params.segments??48}))),l=l.params.source;o.length>32&&qe(i,"cutters budget exceeded");let h=e.recipe(l,c),u=[];for(let f of o){let d=f.axis??"y",p=["x","y","z"].indexOf(d);p<0&&qe(i,"axis must be x, y or z");let y=Xn(),g=null;f.target!==void 0&&(g=e.target(f.target),g.ancestorModifiers&&qe(i,"reference ancestor modifiers are unsupported; reference an individual unmodified frame"),y=on(a,g.matrix));let m=g?.local,_=m?v1(m):null,x=g?.object?.recipe?.type==="tyre"&&d==="y"&&!(g.object.modifiers??[]).some(b=>b.enabled!==!1),v=as(f.center,x?[0,0,0]:_?_.min.map((b,S)=>(b+_.max[S])/2):[0,0,0],i,"center"),E=0;if(m)for(let b=0;b<m.vertices.length;b+=3)E=Math.max(E,Math.hypot(...[0,1,2].filter(S=>S!==p).map(S=>m.vertices[b+S]-v[S])));x&&f.center===void 0&&(E=g.object.recipe.params?.outerRadius??.5);let w=zt(f.radius,E||void 0,i,"radius",Number.MIN_VALUE),M=zt(f.clearance,0,i,"clearance",0),T=f.depth;if(T===void 0){let b=Ai(y),S=0;for(let I=0;I<h.vertices.length;I+=3)S=Math.max(S,Math.abs(Nn(h.vertices.slice(I,I+3),b)[p]-v[p]));T=2*(S+w+M+1)}u.push(hp({axis:d,center:v,radius:w+M,depth:T,segments:f.segments??r.segments??48,matrix:y},{budget:c}))}return up(h,u,{budget:c})}qe(i,"unknown contextual recipe")}function v1(n){let e=[1/0,1/0,1/0],t=[-1/0,-1/0,-1/0];for(let i=0;i<n.vertices.length;i++)e[i%3]=Math.min(e[i%3],n.vertices[i]),t[i%3]=Math.max(t[i%3],n.vertices[i]);return{min:e,max:t}}var lr="2.0.0";var xn=n=>Array.isArray(n)||ArrayBuffer.isView(n)?Array.from(n,xn):n&&typeof n=="object"?Object.fromEntries(Object.entries(n).map(([e,t])=>[e,xn(t)])):n,cs=(n,e)=>{for(let t of e)n.push(t)};function ft(n,e,t,i,{min:r=-1/0,max:s=1/0,integer:a=!1}={}){let o=n===void 0?e:n;if(typeof o!="number"||!Number.isFinite(o)||o<r||o>s||a&&!Number.isSafeInteger(o))throw j(t,`${i} must be a finite ${a?"integer":"number"} in [${r}, ${s}]`);return o}var ot=(n,e,t,i)=>ft(n,e,t,i,{min:Number.MIN_VALUE}),Rn=(n,e,t,i,r=3)=>ft(n,e,t,i,{min:r,max:4096,integer:!0});function ai(n,e,t,i){if(n===void 0)return e;if(typeof n!="boolean")throw j(t,`${i} must be boolean`);return n}function Oa(n,e,t,i){let r=n===void 0?e:n;if(!(Array.isArray(r)||ArrayBuffer.isView(r))||r.length!==3)throw j(t,`${i} must contain three numbers`);return Array.from(r,s=>ft(s,void 0,t,i))}function b1(n){if(!n||typeof n!="object"||typeof n.type!="string")throw j("recipe","expected {type, params}");if(n.params!==void 0&&(!n.params||typeof n.params!="object"||Array.isArray(n.params)))throw j(`recipe ${n.type}`,"params must be an object");return n.params||{}}function Mp(n,e,t=1e-7,i="recipe"){if(!n.length)throw j(i,"geometry collapsed below supported generator precision");let r=Hs(n,t,{budget:e});for(let s=0;s<r.indices.length;s+=3)if(r.indices[s]===r.indices[s+1]||r.indices[s]===r.indices[s+2]||r.indices[s+1]===r.indices[s+2])throw j(i,"weldTolerance collapses a triangle; decrease the tolerance");return r}function M1(n,e,t,i){let r=n/2,s=e/2,a=t/2,o=[],l=(u,f,d,p)=>[u*(r-(p===0?0:i)),f*(s-(p===1?0:i)),d*(a-(p===2?0:i))],c=(u,f,d)=>{let p=nr([...u,...f,...d],0,1,2),y=u.map((g,m)=>(g+f[m]+d[m])/3);cs(o,u),p.reduce((g,m,_)=>g+m*y[_],0)<0?(cs(o,d),cs(o,f)):(cs(o,f),cs(o,d))},h=(u,f,d,p)=>{c(u,f,d),c(u,d,p)};for(let u of[-1,1])h(l(u,-1,-1,0),l(u,-1,1,0),l(u,1,1,0),l(u,1,-1,0)),h(l(-1,u,-1,1),l(1,u,-1,1),l(1,u,1,1),l(-1,u,1,1)),h(l(-1,-1,u,2),l(1,-1,u,2),l(1,1,u,2),l(-1,1,u,2));for(let u of[-1,1])for(let f of[-1,1])h(l(1,u,f,1),l(-1,u,f,1),l(-1,u,f,2),l(1,u,f,2));for(let u of[-1,1])for(let f of[-1,1])h(l(u,1,f,0),l(u,-1,f,0),l(u,-1,f,2),l(u,1,f,2));for(let u of[-1,1])for(let f of[-1,1])h(l(u,f,1,0),l(u,f,-1,0),l(u,f,-1,1),l(u,f,1,1));for(let u of[-1,1])for(let f of[-1,1])for(let d of[-1,1])c(l(u,f,d,0),l(u,f,d,1),l(u,f,d,2));return o}var Yn=(n,e,t)=>(e[0]-n[0])*(t[1]-n[1])-(e[1]-n[1])*(t[0]-n[0]);function Fa(n,e,t=!0){if(!Array.isArray(n)||n.length<3||n.length>512)throw j(e,"profile needs 3..512 [x,y] points");let i=n.map((a,o)=>{if(!Array.isArray(a)||a.length!==2)throw j(e,`profile point ${o} must be [x,y]`);return a.map((l,c)=>ft(l,void 0,e,`profile[${o}][${c}]`,t?{min:c===0?-1:0,max:1}:{}))});i.length>3&&i[0][0]===i.at(-1)[0]&&i[0][1]===i.at(-1)[1]&&i.pop();let r=0;for(let a=0;a<i.length;a++){let o=i[a],l=i[(a+1)%i.length];if(o[0]===l[0]&&o[1]===l[1])throw j(e,"profile has duplicate adjacent points");r+=o[0]*l[1]-l[0]*o[1]}if(Math.abs(r)<1e-14)throw j(e,"profile has zero area");let s=(a,o,l)=>Math.abs(Yn(a,o,l))<1e-12&&l[0]>=Math.min(a[0],o[0])-1e-12&&l[0]<=Math.max(a[0],o[0])+1e-12&&l[1]>=Math.min(a[1],o[1])-1e-12&&l[1]<=Math.max(a[1],o[1])+1e-12;for(let a=0;a<i.length;a++)for(let o=a+1;o<i.length;o++){if(o===a+1||a===0&&o===i.length-1)continue;let l=i[a],c=i[(a+1)%i.length],h=i[o],u=i[(o+1)%i.length];if(Yn(l,c,h)*Yn(l,c,u)<0&&Yn(h,u,l)*Yn(h,u,c)<0||s(l,c,h)||s(l,c,u)||s(h,u,l)||s(h,u,c))throw j(e,"profile self-intersects")}return r<0?[i[0],...i.slice(1).reverse()]:i}function Mh(n,e){let t=n.map((s,a)=>a),i=[],r=(s,a,o,l)=>Yn(a,o,s)>=-1e-12&&Yn(o,l,s)>=-1e-12&&Yn(l,a,s)>=-1e-12;for(;t.length>3;){let s=-1;for(let a=0;a<t.length;a++){let o=t[(a+t.length-1)%t.length],l=t[a],c=t[(a+1)%t.length];if(!(Yn(n[o],n[l],n[c])<=1e-14)&&!t.some(h=>h!==o&&h!==l&&h!==c&&r(n[h],n[o],n[l],n[c]))){i.push(o,l,c),s=a;break}}if(s<0)throw j(e,"cannot triangulate profile cap; remove redundant or intersecting points");t.splice(s,1)}if(Yn(n[t[0]],n[t[1]],n[t[2]])<=1e-14)throw j(e,"degenerate profile cap");return i.push(...t),i}function w1(n,e){let t="recipe sectionLoft";if(!Array.isArray(n.sections)||n.sections.length<2)throw j(t,"sections needs at least two stations");let i=Rn(n.steps,1,t,"steps",1),r=ai(n.caps,!0,t,"caps"),s=n.profile===void 0?null:Fa(n.profile,t),a=n.sections.map((f,d)=>{if(!f||typeof f!="object")throw j(t,`invalid section ${d}`);let p=f.profile===void 0?s:Fa(f.profile,t);if(!p)throw j(t,`section ${d} needs a profile or a shared profile`);return{z:ft(f.z,void 0,t,`sections[${d}].z`),w:ot(f.w,void 0,t,`sections[${d}].w`),h:ot(f.h,void 0,t,`sections[${d}].h`),y:ft(f.y,0,t,`sections[${d}].y`),profile:p}}).sort((f,d)=>f.z-d.z),o=a[0].profile.length;for(let f=0;f<a.length;f++){if(a[f].profile.length!==o)throw j(t,"all profiles need corresponding point counts");if(f&&a[f].z===a[f-1].z)throw j(t,"station z values must be distinct")}let l=(a.length-1)*i+1;Le(l*o,(l-1)*o*2+(r?(o-2)*2:0),e,t);let c=[],h=[];for(let f=0;f<l;f++){let d=Math.min(Math.floor(f/i),a.length-2),p=(f-d*i)/i,y=a[d],g=a[d+1],m=(M,T)=>M+(T-M)*p,_=y.profile.map((M,T)=>M.map((b,S)=>m(b,g.profile[T][S])));Fa(_,t),h.push(_);let x=m(y.w,g.w),v=m(y.h,g.h),E=m(y.y,g.y),w=m(y.z,g.z);for(let M of _)c.push(M[0]*x/2,E+M[1]*v,w)}let u=[];for(let f=0;f<l-1;f++)for(let d=0;d<o;d++){let p=f*o+d,y=f*o+(d+1)%o,g=(f+1)*o+d,m=(f+1)*o+(d+1)%o;u.push(p,y,g,y,m,g)}if(r){let f=Mh(h[0],t),d=Mh(h.at(-1),t),p=(l-1)*o;for(let y=0;y<f.length;y+=3)u.push(f[y],f[y+2],f[y+1]);for(let y of d)u.push(p+y)}return tt({vertices:c,indices:u},{budget:e,operator:t})}function wh(n,e={}){let t=b1(n),i=n.type,r=`recipe ${i}`,s=ht(e.budget,n.budget,t.budget),a;if(ar(n))throw j(r,"needs document context; use evaluateDoc");if(i==="nativeMesh")return Ld(t,s);if(i==="sectionLoft")return w1(t,s);if(i==="controlSurface")return Ia(t,s);if(i==="formBody")return Fd(t,s);if(i==="clayBox"||i==="bevelBox")return qd({...t,...i==="bevelBox"?{resolution:t.resolution??1}:{}},s);if(i==="curveSweep"||i==="curveTube")return tt(i==="curveTube"?$d(t,s):ph(t,s),{budget:s,operator:r});if(i==="tyre"){let o=ot(t.rimRadius,.3,r,"rimRadius"),l=ot(t.outerRadius,.5,r,"outerRadius"),c=ot(t.width,.25,r,"width");if(o>=l)throw j(r,"requires 0 < rimRadius < outerRadius");let h=Rn(t.segments,64,r,"segments",8),u=Rn(t.profileSegments,4,r,"profileSegments",1),f=(l-o)*.12,d=c*.12,p=[];Le(h*4*(u+1),h*8*(u+1),s,r);let y=[[l-f,c/2-d],[o+f,c/2-d],[o+f,-c/2+d],[l-f,-c/2+d]];for(let g=0;g<4;g++)for(let m=0;m<=u;m++){let _=(g+m/u)*Math.PI/2;p.push([y[g][0]+f*Math.cos(_),y[g][1]+d*Math.sin(_)])}return p.push(p[0]),Mp(Pa(p,h,!1),s,1e-7,r)}if(i==="box"||i==="rbox"){let o=ot(t.width??t.w,1,r,"width"),l=ot(t.height??t.h,1,r,"height"),c=ot(t.depth??t.d,1,r,"depth");if(Le(i==="box"?8:24,i==="box"?12:44,s,r),i==="rbox"){let h=ot(t.c??t.bevel??t.radius,.03,r,"bevel"),u=Math.max(.001,Math.min(h,o*.225,l*.225,c*.225));if(u>=Math.min(o,l,c)/2)throw j(r,"dimensions are too small for the supported minimum bevel");a=M1(o,l,c,u)}else a=mh(o,l,c)}else if(i==="sphere"){let o=ot(t.rx??t.radius,.5,r,"rx"),l=ot(t.ry,o,r,"ry"),c=ot(t.rz,o,r,"rz"),h=Rn(t.segments??t.widthSegments,40,r,"segments"),u=Rn(t.rings??t.heightSegments,24,r,"rings",2);Le((h+1)*(u+1),h*u*2,s,r),a=Kd(o,l,c,h,u)}else if(i==="cylinder"||i==="cone"){let o=ft(t.radiusBottom??t.radius,.5,r,"radiusBottom",{min:0}),l=i==="cone"?0:ft(t.radiusTop,o,r,"radiusTop",{min:0}),c=ot(t.height??t.h,1,r,"height"),h=Rn(t.segments??t.radialSegments,40,r,"segments"),u=ai(t.caps,!0,r,"caps");if(o===0&&l===0)throw j(r,"at least one radius must be positive");Le(h*2+2,h*4,s,r),a=Pa([[o,-c/2],[l,c/2]],h,u)}else if(i==="torus"||i==="torusArc"){let o=ot(t.R??t.radius,.6,r,"radius"),l=ot(t.r??t.tube,.15,r,"tube"),c=Rn(t.segments??t.radialSegments,48,r,"segments"),h=Rn(t.tubeSegments??t.tubularSegments??(t.r!==void 0?t.tube:void 0),20,r,"tubeSegments");if(l>=o)throw j(r,"tube radius must be smaller than major radius");if(Le((c+1)*(h+1),c*h*2+(i==="torusArc"?h*2:0),s,r),i==="torus")a=jd(o,l,c,h);else{let u=ft(t.u0,0,r,"u0"),f=ft(t.u1,Math.PI,r,"u1");if(f<=u||f-u>Math.PI*2)throw j(r,"u1-u0 must be in (0,2\u03C0]");a=Zd(o,l,u,f,c,h),Math.abs(f-u-Math.PI*2)<1e-12&&(a=a.slice(0,c*h*2*9))}}else if(i==="lathe"){if(!Array.isArray(t.profile)||t.profile.length<2)throw j(r,"profile needs at least two [radius,y] points");let o=t.profile.map((h,u)=>{if(!Array.isArray(h)||h.length!==2)throw j(r,`invalid profile point ${u}`);return[ft(h[0],void 0,r,"profile radius",{min:0}),ft(h[1],void 0,r,"profile y")]});for(let h=1;h<o.length;h++)if(o[h][0]===o[h-1][0]&&o[h][1]===o[h-1][1])throw j(r,"duplicate profile point");let l=Rn(t.segments,48,r,"segments"),c=ai(t.caps,!0,r,"caps");Le((l+1)*o.length+2,l*(o.length-1)*2+(c?l*2:0),s,r),a=Pa(o,l,c)}else if(i==="loft"||i==="hull"){if(!Array.isArray(t.sections)||t.sections.length<2)throw j(r,"sections needs at least two stations");let o=Rn(t.segments,i==="hull"?20:32,r,"segments"),l=ai(t.caps,!0,r,"caps");for(let h of t.sections)if(!h||typeof h!="object"||Array.isArray(h))throw j(r,"each section must be an object");let c=t.sections.map(h=>({w:ot(h.w,.5,r,"section w"),h:ot(h.h,.3,r,"section h"),y:ft(h.y,0,r,"section y"),z:ft(h.z,void 0,r,"section z"),expX:ot(h.expX??t.expX,i==="hull"?.08:.66,r,"expX"),expY:ot(h.expY??t.expY,i==="hull"?.08:.78,r,"expY")})).sort((h,u)=>h.z-u.z);for(let h=1;h<c.length;h++)if(c[h].z===c[h-1].z)throw j(r,"station z values must be distinct");Le(c.length*o+2,(c.length-1)*o*2+(l?o*2:0),s,r),a=ep(c.map(h=>tp(i==="hull"?h.w/2:h.w,h.h,h.y,h.z,o,h.expX,h.expY)),!0,l)}else if(i==="extrude"){let o=Fa(t.polygon??t.profile,r,!1),l=ot(t.depth,.1,r,"depth");Mh(o,r),Le(o.length*2,o.length*4-4,s,r),a=Jd(o,l)}else if(i==="spherePatch"||i==="patch"){let o=ot(t.rx??t.radius,1,r,"rx"),l=ot(t.ry,o,r,"ry"),c=ot(t.rz,o,r,"rz"),h=ft(t.u0,0,r,"u0"),u=ft(t.u1,Math.PI*2,r,"u1"),f=ft(t.v0,.1,r,"v0",{min:0,max:Math.PI}),d=ft(t.v1,Math.PI-.1,r,"v1",{min:0,max:Math.PI}),p=Rn(t.segments,28,r,"segments"),y=Rn(t.rings,16,r,"rings",1);if(u<=h||u-h>Math.PI*2||d<=f)throw j(r,"invalid angular range");Le((p+1)*(y+1),p*y*2,s,r),a=Qd(o,l,c,h,u,f,d,p,y)}else if(i==="plane"){let o=ot(t.width,1.8,r,"width"),l=ot(t.height,1.8,r,"height");a=mh(o,.002,l)}else throw j(r,"unknown recipe operator");return Mp(a,s,ft(t.weldTolerance,1e-7,r,"weldTolerance",{min:0}),r)}function S1(n,e,t){let i="modifier subsurf",r=ft(e.levels,1,i,"levels",{min:0,max:6,integer:!0}),s=ai(e.crease,!1,i,"crease"),a=ft(e.creaseAngle,Math.PI/3,i,"creaseAngle",{min:0,max:Math.PI});for(let o=0;o<r;o++){Le(n.vertices.length/3,n.indices.length/3*4,t,i);let l=ts(n,i),c=n.vertices.length/3,h=Array.from({length:c},()=>new Set),u=Array.from({length:c},()=>new Set),f=[];for(let _=0;_<n.indices.length;_+=3){let x=nr(n.vertices,...n.indices.slice(_,_+3)),v=Math.hypot(...x);if(!v)throw j(i,`zero-area face ${_/3}`);f.push(x.map(E=>E/v))}let d=new Set;for(let[_,x]of l){let{a:v,b:E}=x[0];h[v].add(E),h[E].add(v),(x.length===1||s&&f[x[0].face].reduce((w,M,T)=>w+M*f[x[1].face][T],0)<Math.cos(a))&&(d.add(_),u[v].add(E),u[E].add(v))}Le(c+l.size,n.indices.length/3*4,t,i);let p=new Array(c*3);for(let _=0;_<c;_++){let x=[...u[_]],v=[...h[_]];for(let E=0;E<3;E++){let w=n.vertices[_*3+E],M=w;if(x.length===2)M=.75*w+.125*(n.vertices[x[0]*3+E]+n.vertices[x[1]*3+E]);else if(x.length<2&&v.length>=3){let T=v.length===3?.1875:3/(8*v.length);M=w*(1-v.length*T)+T*v.reduce((b,S)=>b+n.vertices[S*3+E],0)}p[_*3+E]=M}}let y=new Map;for(let[_,x]of l){let{a:v,b:E}=x[0];y.set(_,p.length/3);for(let w=0;w<3;w++)p.push(x.length===2&&!d.has(_)?3/8*(n.vertices[v*3+w]+n.vertices[E*3+w])+1/8*(n.vertices[x[0].opposite*3+w]+n.vertices[x[1].opposite*3+w]):(n.vertices[v*3+w]+n.vertices[E*3+w])/2)}let g=(_,x)=>y.get(_<x?`${_}|${x}`:`${x}|${_}`),m=[];for(let _=0;_<n.indices.length;_+=3){let[x,v,E]=n.indices.slice(_,_+3),w=g(x,v),M=g(v,E),T=g(E,x);m.push(x,w,T,w,v,M,T,M,E,w,M,T)}n=tt({vertices:p,indices:m},{budget:t,operator:i})}return n}function E1(n,e,t){let i="modifier solidify",r=ot(e.thickness,.02,i,"thickness"),s=ft(e.offset,0,i,"offset",{min:-1,max:1}),a=ts(n,i),o=[...a.values()].filter(f=>f.length===1).map(f=>f[0]),l=n.vertices.length/3;Le(l*2,n.indices.length/3*2+o.length*2,t,i);let c=Vs(n,i,!0),h=[],u=[];for(let f of[1,-1])for(let d=0;d<n.vertices.length;d++)h.push(n.vertices[d]+c[d]*r*(f+s)/2);for(let f=0;f<n.indices.length;f+=3){let[d,p,y]=n.indices.slice(f,f+3);u.push(d,p,y,d+l,y+l,p+l)}for(let{a:f,b:d}of o)u.push(f,f+l,d+l,f,d+l,d);return tt({vertices:h,indices:u},{budget:t,operator:i})}function Sh(n,e=[],t={}){let i=ht(t.budget);if(n=tt(n,{budget:i,operator:"modifiers"}),!Array.isArray(e)||e.length>32)throw j("modifiers","expected at most 32 modifiers");for(let r of e){if(!r||typeof r!="object"||typeof r.type!="string")throw j("modifier","expected a named operator");let s=`modifier ${r.type}`;if(!["mirror","array","subsurf","solidify","brush"].includes(r.type))throw j(s,"unknown modifier operator");if(ai(r.enabled,!0,s,"enabled")){if(r.type==="brush"){n=Yd(n,r,i);continue}if(r.type==="subsurf"){n=S1(n,r,i);continue}if(r.type==="solidify"){n=E1(n,r,i);continue}if(r.type==="mirror"){let o=r.axis??"x";if(!["x","y","z"].includes(o))throw j(s,"axis must be x, y or z");let l=ft(r.pivot,0,s,"pivot"),c=ai(r.keepOriginal,!0,s,"keepOriginal"),h=c?2:1;Le(n.vertices.length/3*h,n.indices.length/3*h,i,s);let u=c?n.vertices.slice():[],f=c?n.indices.slice():[],d=u.length/3,p=["x","y","z"].indexOf(o);for(let y=0;y<n.vertices.length;y++)u.push(y%3===p?2*l-n.vertices[y]:n.vertices[y]);for(let y=0;y<n.indices.length;y+=3)f.push(n.indices[y]+d,n.indices[y+2]+d,n.indices[y+1]+d);n=tt({vertices:u,indices:f},{budget:i,operator:s})}else{let o=ft(r.count,2,s,"count",{min:1,max:1e4,integer:!0}),l=Oa(r.offset,[1,0,0],s,"offset");Le(n.vertices.length/3*o,n.indices.length/3*o,i,s);let c=[],h=[],u=n.vertices.length/3;for(let f=0;f<o;f++){for(let d=0;d<n.vertices.length;d++)c.push(n.vertices[d]+l[d%3]*f);for(let d of n.indices)h.push(d+f*u)}n=tt({vertices:c,indices:h},{budget:i,operator:s})}}}return n}function A1(n,e,t){if(ar(n.recipe)){if(!t)throw j(`recipe ${n.recipe.type}`,"needs document context; use evaluateDoc");return t.base(n,e)}if(n.recipe!==void 0)return wh(n.recipe,{budget:e});if(n.topology!==void 0)return tt(n.topology,{budget:e,operator:`topology ${n.name??n.id??""}`});if(n.geometryData?.positions!==void 0)return Hs(n.geometryData.positions,n.geometryData.evaluatedKernelVersion===lr?0:n.weldTolerance??1e-7,{budget:e});let i=n.kind,r={sphere:{radius:.62,widthSegments:32,heightSegments:20},cylinder:{radiusTop:.42,radiusBottom:.42,height:1.1,radialSegments:32},cone:{radius:.55,height:1.15,radialSegments:32},torus:{radius:.58,tube:.2,radialSegments:20,tubularSegments:40}};return i===void 0||i==="custom"?{vertices:[],indices:[]}:wh({type:i,params:{...r[i],...n.params||{}}},{budget:e})}function Eh(n,e,t){let i=`transform ${e.name??e.id??"object"}`,r=Oa(e.position,[0,0,0],i,"position"),s=Oa(e.rotation,[0,0,0],i,"rotation"),a=Oa(e.scale,[1,1,1],i,"scale");if(a.some(y=>y===0))throw j(i,"scale components must be non-zero");let o=[],l=n.indices.slice(),c=Math.cos(s[2]),h=Math.sin(s[2]),u=Math.cos(s[1]),f=Math.sin(s[1]),d=Math.cos(s[0]),p=Math.sin(s[0]);for(let y=0;y<n.vertices.length;y+=3){let g=n.vertices[y]*a[0],m=n.vertices[y+1]*a[1],_=n.vertices[y+2]*a[2];[g,m]=[g*c-m*h,g*h+m*c],[g,_]=[g*u+_*f,-g*f+_*u],[m,_]=[m*d-_*p,m*p+_*d],o.push(g+r[0],m+r[1],_+r[2])}if(a[0]*a[1]*a[2]<0)for(let y=0;y<l.length;y+=3)[l[y+1],l[y+2]]=[l[y+2],l[y+1]];return tt({vertices:o,indices:l},{budget:t,operator:i})}function T1(n,e){if(e!==void 0&&!["flat","smooth"].includes(e))throw j("shading",`unknown mode ${e}`);if(e!=="flat")return Jc({vertices:Vs(n),indices:n.indices});let t=[];for(let i=0;i<n.indices.length;i+=3){let r=nr(n.vertices,...n.indices.slice(i,i+3)),s=Math.hypot(...r);if(!Number.isFinite(s))throw j("normals","normal overflow");for(let a=0;a<3;a++)for(let o of r)t.push(s?o/s:0)}return t}function R1(n,e){let t=e.rotation??[0,0,0],i=e.scale??[1,1,1];if(t.every(u=>u===0)&&i.every(u=>u===1))return n.slice();let r=[],s=Math.cos(t[2]),a=Math.sin(t[2]),o=Math.cos(t[1]),l=Math.sin(t[1]),c=Math.cos(t[0]),h=Math.sin(t[0]);for(let u=0;u<n.length;u+=3){let f=n[u]/i[0],d=n[u+1]/i[1],p=n[u+2]/i[2];[f,d]=[f*s-d*a,f*a+d*s],[f,p]=[f*o+p*l,-f*l+p*o],[d,p]=[d*c-p*h,d*h+p*c];let y=Math.hypot(f,d,p);if(!Number.isFinite(y))throw j("normals","normal transform overflow");r.push(y?f/y:0,y?d/y:0,y?p/y:0)}if(i[0]*i[1]*i[2]<0)for(let u=0;u<r.length;u+=9)for(let f=0;f<3;f++)[r[u+3+f],r[u+6+f]]=[r[u+6+f],r[u+3+f]];return r}function C1(n){if(n.geometryData?.evaluatedKernelVersion!==lr||n.recipe!==void 0||n.topology!==void 0)return null;let e=n.geometryData.normals;if(!(Array.isArray(e)||ArrayBuffer.isView(e))||e.length!==n.geometryData.positions.length||!Array.from(e).every(Number.isFinite))throw j("normals","invalid evaluated corner normal buffer");return Array.from(e)}function I1(n,e){return String(n.id??n.semanticId??n.key??n.name??`part_${e}`)}function Ba(n,{world:e,base:t,budget:i,parents:r=[],index:s=0,active:a=new Set,inheritedVisible:o=!0,context:l}){if(!n||typeof n!="object"||Array.isArray(n))throw j("evaluateObject","expected an object");if(a.has(n))throw j("evaluateObject","cyclic object.parts");if(r.length>64)throw j("evaluateObject","hierarchy depth budget exceeded");a.add(n),i=ht(i,n.budget),t&&Sh({vertices:[],indices:[]},n.modifiers??[],{budget:i}),Eh({vertices:[],indices:[]},n,i);let c=I1(n,s),h=ai(n.visible,!0,"evaluateObject","visible")&&o,u;if(n.parts!==void 0){if(!Array.isArray(n.parts))throw j("evaluateObject","parts must be an array");if(n.parts.length>i.maxObjects)throw j("evaluateObject","object budget exceeded");u=[];let p=0,y=0;for(let g=0;g<n.parts.length;g++){let m=Ba(n.parts[g],{world:!0,base:t,budget:i,parents:[...r,c],index:g,active:a,inheritedVisible:h,context:l});for(let _ of m)if(p+=_.mesh.vertices.length/3,y+=_.mesh.indices.length/3,Le(p,y,i,"evaluateObject"),u.push(_),u.length>i.maxObjects)throw j("evaluateObject","object budget exceeded")}if(n.materialOverride!==void 0&&n.materialOverride!==!1){let g=n.materialOverride===!0?n.material:n.materialOverride;if(!g||typeof g!="object"||Array.isArray(g))throw j("materialOverride","expected a material object or true with object.material");for(let m of u)m.material=xn(g),m.overrideMaterials=!0}}else{let p=A1(n,i,l),y=l?.metadata(n);u=[{mesh:p,attributes:{...p.cornerUV?{uvs:p.cornerUV}:{},...p.cornerDetailUV?{detailUvs:p.cornerDetailUV}:{},...p.triangleMaterialIndices?{materialIndices:p.triangleMaterialIndices}:{},...p.triangleFaceIds?{faceIds:p.triangleFaceIds}:{},...p.triangleSourceFaceIds?{sourceFaceIds:p.triangleSourceFaceIds}:{},...p.triangleInstanceIndices?{instanceIndices:p.triangleInstanceIndices}:{}},normals:n.shading==="flat"?null:p.cornerNormals||C1(n),object:n,material:xn(y?.material??n.material),shading:y?.shading??n.shading,metadata:y,sourceId:n.sourceId??n.id??c,semanticId:n.semanticId??n.key??n.id??c,parents:r.length?r:xn(n.parentIds||[]),id:r.length?[...r,c].join("/"):c,visible:h&&y?.visible!==!1}]}if(u.length>i.maxObjects)throw j("evaluateObject","object budget exceeded");let f=0,d=0;for(let p of u){if(!t){if(p.object.recipe?.type==="nativeMesh"&&(n.modifiers||[]).some(y=>y.enabled!==!1))throw j("nativeMesh","use native feature stack; legacy post modifiers would invalidate native attributes/selection");p.mesh=Sh(p.mesh,n.modifiers??[],{budget:i}),(n.modifiers??[]).some(y=>y.enabled!==!1)&&(p.normals=null,p.attributes={})}if(e&&(p.mesh=Eh(p.mesh,n,i),p.normals&&(p.normals=R1(p.normals,n)),(n.scale||[1,1,1]).reduce((y,g)=>y*g,1)<0)){for(let y of["uvs","detailUvs"])if(p.attributes?.[y]){let g=p.attributes[y].slice();for(let m=0;m<g.length;m+=6)for(let _=0;_<2;_++)[g[m+2+_],g[m+4+_]]=[g[m+4+_],g[m+2+_]];p.attributes={...p.attributes,[y]:g}}}f+=p.mesh.vertices.length/3,d+=p.mesh.indices.length/3,Le(f,d,i,"evaluateObject")}return a.delete(n),u}function P1(n,e,t){let i=new Map,r=new Map,s=!1,a=(_,x=[])=>{if(x.length>64)throw j("relations","hierarchy depth budget exceeded");for(let v of _){if(!v||typeof v!="object"||Array.isArray(v))throw j("evaluateObject","expected an object");if(i.has(v))throw j("relations","cyclic/shared object hierarchy");let E=x.at(-1),w=on(E?.matrix??Xn(),vp(v)),M={object:v,ancestors:x.slice(),matrix:w};if(i.set(v,M),ar(v.recipe)&&(s=!0),v.id!==void 0&&(r.has(v.id)?M.duplicate=!0:r.set(v.id,M)),v.parts!==void 0){if(!Array.isArray(v.parts))throw j("relations","parts must be an array");a(v.parts,[...x,M])}}};if(a(n.objects),!s)return;for(let _ of i.values())if(_.duplicate)throw j("relations",`duplicate object ID ${_.object.id}`);let o=_=>{let x=(_.object.parts??[]).map(v=>i.get(v));if(!_.object.parts&&ar(_.object.recipe))for(let v of Ua(_.object.recipe)){if(!r.has(v))throw j("relations",`target does not exist: ${v}`);x.push(r.get(v))}return x},l=new Set,c=new Set,h=(_,x=0)=>{if(c.has(_))throw j("relations",`dependency cycle at ${_.object.id}`);if(!l.has(_)){if(x>128)throw j("relations","dependency depth budget exceeded");c.add(_);for(let v of o(_))h(v,x+1);c.delete(_),l.add(_)}};for(let _ of i.values())h(_);let u=new Map,f=new Map,d=new Map,p=new Set,y,g=_=>{let x=[],v=[];for(let E of _){let w=x.length/3;cs(x,E.mesh.vertices);for(let M of E.mesh.indices)v.push(w+M);Le(x.length/3,v.length/3,e,"relations target")}return{vertices:x,indices:v}},m=_=>{if(f.has(_))return f.get(_);let x=r.get(_);if(!x)throw j("relations",`target does not exist: ${_}`);if(p.has(x))throw j("relations",`dependency cycle at ${_}`);p.add(x);let v=g(Ba(x.object,{world:!1,base:t,budget:e,context:y})),E=Ba(x.object,{world:!0,base:t,budget:e,context:y});for(let M=x.ancestors.length-1;M>=0;M--)for(let T of E){let b=x.ancestors[M].object;t||(T.mesh=Sh(T.mesh,b.modifiers??[],{budget:e})),T.mesh=Eh(T.mesh,b,e),T.visible=T.visible&&b.visible!==!1,b.materialOverride!==void 0&&b.materialOverride!==!1&&(T.material=xn(b.materialOverride===!0?b.material:b.materialOverride),T.overrideMaterials=!0)}let w={object:x.object,local:v,mesh:g(E),matrix:x.matrix,metadata:d.get(x.object),material:xn(E[0]?.material),shading:E[0]?.shading??x.object.shading,visible:E.some(M=>M.visible),ancestorModifiers:x.ancestors.some(M=>(M.object.modifiers??[]).some(T=>T.enabled!==!1))};return p.delete(x),f.set(_,w),w};return y={metadata:_=>d.get(_),base:(_,x)=>{if(u.has(_)){let b=u.get(_);return{...tt(b,{budget:x,operator:"relations"}),...Object.fromEntries(["cornerNormals","cornerUV","cornerDetailUV","triangleMaterialIndices","triangleFaceIds","vertexIds","vertexSourceIds","vertexInstanceIndices","triangleSourceFaceIds","triangleInstanceIndices"].filter(S=>b[S]).map(S=>[S,b[S]]))}}let v=i.get(_);if(!v)throw j("relations","object is outside document context");let E=0,w=b=>{if(E!==1)return;let S=b.directionRoles,I=![v,...v.ancestors].some(O=>(O.object.modifiers??[]).some(k=>k.enabled!==!1));d.set(_,{...b,...S?{directionRoles:{...S,ownerEditableId:String(_.id??""),validForGeometry:S.validForGeometry!==!1&&I}}:{}})},M=(b,S=x)=>{if(++E>32)throw j("relations","recipe nesting budget exceeded");let I=ar(b)?bp(b,{matrix:v.matrix,target:m,recipe:M,record:w},{budget:S}):wh(b,{budget:S});return E--,I},T=M(_.recipe);return u.set(_,T),T}},y}function wp(n,e={}){if(!n||typeof n!="object"||!Array.isArray(n.objects))throw j("evaluateDoc","expected a document with objects[]");if(!e||typeof e!="object"||Array.isArray(e))throw j("evaluateDoc","options must be an object");let t=ai(e.base,!1,"evaluateDoc","base"),i=ht(e.budget,n.budget),r=[],s=0,a=0;if(n.objects.length>i.maxObjects)throw j("evaluateDoc","object budget exceeded");let o=P1(n,i,t);for(let l=0;l<n.objects.length;l++){let c=Ba(n.objects[l],{world:!0,base:t,budget:i,index:l,context:o});for(let h of c){let u=xn(h.object);for(let f of["recipe","topology","parts","materialOverride"])delete u[f];if(u.id=h.id,u.editableId=String(h.object.id??h.semanticId),u.sourceId=h.sourceId,u.semanticId=h.semanticId,u.parentIds=h.parents.slice(),u.groupId=h.parents.at(-1)??u.groupId??null,u.kind="custom",u.params={},u.position=[0,0,0],u.rotation=[0,0,0],u.scale=[1,1,1],u.modifiers=[],u.visible=h.visible,h.overrideMaterials&&delete u.materialSlots,u.material=xn(h.material??{color:"#c0c7d4",metalness:.1,roughness:.5,opacity:1}),h.metadata?.directionRoles&&(u.directionRoles=xn(h.metadata.directionRoles)),h.metadata?.mirror&&(u.mirror=xn(h.metadata.mirror)),u.geometryData={positions:Jc(h.mesh),normals:h.normals??T1(h.mesh,h.shading??h.object.shading),...h.attributes,evaluatedKernelVersion:lr},r.push(u),s+=h.mesh.vertices.length/3,a+=h.mesh.indices.length/3,Le(s,a,i,"evaluateDoc"),r.length>i.maxObjects)throw j("evaluateDoc","object budget exceeded")}}return{...xn(n),version:1,meta:{...xn(n.meta||{}),evaluatedKernelVersion:lr},objects:r}}var Ah=Object.freeze(["shape","topology","appearance"]),ka=Object.freeze({shape:"outline",topology:"surface_wireframe",appearance:"normal"}),L1=new Set(zs),D1=new Set(Bs),Sp=n=>n!=null,js=(n,e="invalid_capture")=>Object.assign(new Error(n),{code:e});function Ep(n={},{requireSelection:e=!1,defaultPurpose:t=null}={}){let i=n.mode??"material",r=n.purpose??null,s=Sp(n.displayMode);if(!L1.has(i))throw js("\u672A\u77E5\u89C2\u5BDF\u901A\u9053 mode: "+String(i));if(r!==null&&!Ah.includes(r))throw js("purpose \u9700 shape/topology/appearance");if(t!==null&&!Ah.includes(t))throw js("\u65E0\u6548\u7684\u4E0A\u4E0B\u6587\u89C2\u5BDF\u7528\u9014");let a,o;if(s)a=n.displayMode,o="display-mode";else if(r!==null)a=ka[r],o="purpose";else if(Sp(n.mode)&&i!=="material")a="normal",o="channel";else if(t!==null)a=ka[t],o="context";else{if(e)throw Object.assign(js('\u622A\u56FE\u524D\u8BF7\u9009\u62E9\u89C2\u5BDF\u7528\u9014\uFF1Apurpose:"shape"\uFF08\u5F62\u4F53/\u90E8\u4EF6\u63CF\u8FB9\uFF09\u3001"topology"\uFF08\u4E09\u89D2\u9762\u7EBF\u6846\uFF09\u6216"appearance"\uFF08\u6750\u8D28/\u73BB\u7483\uFF09\uFF1B\u4E5F\u53EF\u663E\u5F0F\u6307\u5B9A displayMode \u6216\u8BCA\u65AD mode\u3002\u672A\u542F\u52A8\u6E32\u67D3\u3002',"capture_purpose_required"),{detail:{field:"purpose",choices:Ah.map(c=>({purpose:c,displayMode:ka[c]}))}});a="normal",o="legacy-default"}if(!D1.has(a))throw js("displayMode \u9700 normal/surface_wireframe/outline");return{schema:"dsh-modeler.observation-selection",schemaVersion:1,purpose:a==="outline"?"shape":a==="surface_wireframe"?"topology":i==="material"?"appearance":"channel",requestedPurpose:r,mode:i,displayMode:a,source:o,explicitOverride:r!==null&&s&&a!==ka[r]}}var Ih=n=>n!==null&&typeof n=="object"&&!Array.isArray(n),Ga=n=>JSON.parse(JSON.stringify(n)),je=(n,e)=>{throw Object.assign(new Error(n+": "+e),{code:"invalid_material_surface",detail:{field:n}})},Rp=(n,e)=>Object.prototype.hasOwnProperty.call(n,e),li=(n,e,t)=>{Ih(n)||je(t,"expected object");for(let i of Object.keys(n))e.includes(i)||je(t+"."+i,"unsupported field")},Js=(n,e,t=-1/0,i=1/0)=>((typeof n!="number"||!Number.isFinite(n)||n<t||n>i)&&je(e,`expected finite number ${t}..${i}`),n),On=(n,e)=>Js(n,e,0,1),Cp=(n,e)=>(Js(n,e),n<=0&&je(e,"expected positive number"),n),Va=(n,e,t=!1)=>((!Array.isArray(n)||n.length!==3)&&je(e,"expected three numbers"),n.forEach((i,r)=>t?Cp(i,`${e}[${r}]`):Js(i,`${e}[${r}]`)),n),Zs=(n,e)=>n.reduce((t,i,r)=>t+i*e[r],0),N1=(n,e)=>[n[1]*e[2]-n[2]*e[1],n[2]*e[0]-n[0]*e[2],n[0]*e[1]-n[1]*e[0]],Wa=(n,e)=>((typeof n!="string"||!/^[A-Za-z][A-Za-z0-9_-]{0,79}$/.test(n))&&je(e,"expected stable identifier up to 80 letters/digits/_/-"),n),Th=(n,e)=>((typeof n!="string"||!/^#(?:[a-f0-9]{3}|[a-f0-9]{6})$/i.test(n))&&je(e,"expected #rgb or #rrggbb"),n),Ap=Object.freeze(["object","world","frame","uv","generated"]),Tp=Object.freeze(["noise","voronoi","wave","weave","constant","mix","ramp","image"]),U1=Object.freeze(["sprayed_paint","cast_metal","brushed_metal","rolled_metal","rubber","fiber_weave","polished_metal","plain_glass"]),Lw=Object.freeze({substrate:Object.freeze(["metal","rubber","glass","composite","polymer"]),finish:Object.freeze(["painted","bare","coated","polished"]),process:U1,state:Object.freeze(["clean"])});function Ch(n,e="material.surface.mapping",{partial:t=!1}={}){li(n,["space","origin","rotation","scale","frame"],e),(!t||n.space!==void 0)&&!Ap.includes(n.space)&&je(e+".space","expected "+Ap.join("/"));for(let i of["origin","rotation","scale"])n[i]!==void 0&&Va(n[i],e+"."+i,i==="scale");if(n.frame!==void 0||n.space==="frame"&&!t){let i=e+".frame",r=n.frame;li(r,["origin","tangent","bitangent","normal"],i);for(let c of["origin","tangent","bitangent","normal"])Va(r[c],i+"."+c);let{tangent:s,bitangent:a,normal:o}=r,l=1e-6;for(let[c,h]of[["tangent",s],["bitangent",a],["normal",o]])Math.abs(Zs(h,h)-1)>l&&je(i+"."+c,"expected unit basis vector");(Math.abs(Zs(s,a))>l||Math.abs(Zs(s,o))>l||Math.abs(Zs(a,o))>l)&&je(i,"expected orthonormal basis; shear unsupported"),Zs(N1(s,a),o)<1-l&&je(i,"expected right-handed orthonormal basis"),n.space!==void 0&&n.space!=="frame"&&je(i,"frame only valid for frame space")}return Ga(n)}var Rh=(n,e,t)=>typeof n=="number"?On(n,e):(Wa(n,e),t.push({name:n,field:e}),n),Ha=(n,e,t)=>{Wa(n,e),t.push({name:n,field:e})};function Ip(n,e="material.surface.mask",t=[]){if(typeof n=="number")return On(n,e),n;li(n,["signal","min","max","invert"],e),Ha(n.signal,e+".signal",t);for(let i of["min","max"])n[i]!==void 0&&On(n[i],e+"."+i);return(n.min??0)>=(n.max??1)&&je(e+".max","expected max greater than min"),n.invert!==void 0&&typeof n.invert!="boolean"&&je(e+".invert","expected boolean"),Ga(n)}var O1={noise:["wavelength","detail","seed","stretch"],voronoi:["wavelength","seed","stretch"],wave:["wavelength","direction","profile","seed"],weave:["wavelength","ratio","seed"],constant:["value"],mix:["a","b","factor"],ramp:["input","min","max","invert"],image:["image","channel","colorSpace"]};function Pp(n,e,t){if(Ih(n)||je(e,"expected signal object"),Tp.includes(n.type)||je(e+".type","expected "+Tp.join("/")),li(n,["type","mapping",...O1[n.type]],e),n.mapping!==void 0&&Ch(n.mapping,e+".mapping",{partial:!0}),n.direction!==void 0&&(Va(n.direction,e+".direction"),Math.hypot(...n.direction)===0&&je(e+".direction","expected nonzero direction")),["noise","voronoi","wave","weave"].includes(n.type)&&Cp(n.wavelength,e+".wavelength"),n.detail!==void 0&&Js(n.detail,e+".detail",0,8),n.stretch!==void 0&&Va(n.stretch,e+".stretch",!0),n.seed!==void 0&&(!Number.isSafeInteger(n.seed)||n.seed<0||n.seed>1e6)&&je(e+".seed","expected integer 0..1000000"),n.profile!==void 0&&!["sine","saw","triangle"].includes(n.profile)&&je(e+".profile","expected sine/saw/triangle"),n.ratio!==void 0&&On(n.ratio,e+".ratio"),n.type==="constant"&&On(n.value,e+".value"),n.type==="mix"&&(Rh(n.a,e+".a",t),Rh(n.b,e+".b",t),Ip(n.factor,e+".factor",t)),n.type==="ramp"){Rh(n.input,e+".input",t);for(let i of["min","max"])n[i]!==void 0&&On(n[i],e+"."+i);(n.min??0)>=(n.max??1)&&je(e+".max","expected max greater than min"),n.invert!==void 0&&typeof n.invert!="boolean"&&je(e+".invert","expected boolean")}n.type==="image"&&((typeof n.image!="string"||!/^[a-f0-9]{64}$/.test(n.image))&&je(e+".image","expected imported image hash"),n.channel!==void 0&&!["r","g","b"].includes(n.channel)&&je(e+".channel","expected r/g/b"),n.colorSpace!=="linear"&&je(e+".colorSpace","expected linear for scalar image signal"))}function F1(n,e,t){li(n,["id","mask","color","roughness","metalness","clearcoat","clearcoatRoughness","height"],e),Wa(n.id,e+".id"),n.mask!==void 0&&Ip(n.mask,e+".mask",t),n.color!==void 0&&(typeof n.color=="string"?Th(n.color,e+".color"):(li(n.color,["a","b","signal"],e+".color"),Th(n.color.a,e+".color.a"),Th(n.color.b,e+".color.b"),Ha(n.color.signal,e+".color.signal",t)));for(let i of["roughness","metalness"])if(n[i]!==void 0){let r=e+"."+i,s=n[i];typeof s=="number"?On(s,r):(li(s,["min","max","signal"],r),On(s.min,r+".min"),On(s.max,r+".max"),s.min>s.max&&je(r+".max","expected max >= min"),Ha(s.signal,r+".signal",t))}for(let i of["clearcoat","clearcoatRoughness"])n[i]!==void 0&&On(n[i],e+"."+i);if(n.height!==void 0){let i=e+".height",r=n.height;li(r,["signal","amplitude","midlevel"],i),Ha(r.signal,i+".signal",t),Js(r.amplitude,i+".amplitude",0,.05),r.midlevel!==void 0&&On(r.midlevel,i+".midlevel")}}function z1(n){let e=[],t=new Map,i=(r,s)=>{if(Rp(n.signals,r)||je(s,"missing signal "+r),t.get(r)===1&&je(s,"signal cycle at "+r),t.get(r)===2)return;t.set(r,1);let a=[];Pp(n.signals[r],"material.surface.signals."+r,a);for(let o of a)i(o.name,o.field);t.set(r,2),e.push(r)};for(let r of Object.keys(n.signals))i(r,"material.surface.signals."+r);return e}function Ph(n){let e="material.surface";li(n,["version","mapping","signals","layers"],e),n.version!==1&&je(e+".version","expected version 1"),n.mapping!==void 0&&Ch(n.mapping),Ih(n.signals)||je(e+".signals","expected named signal table"),Object.keys(n.signals).length>16&&je(e+".signals","at most 16 signals");let t=[];for(let[r,s]of Object.entries(n.signals)){Wa(r,e+".signals."+r),Pp(s,e+".signals."+r,t);let a=Lh(n,s);Ch(a,e+".signals."+r+".mapping")}(!Array.isArray(n.layers)||n.layers.length<1||n.layers.length>8)&&je(e+".layers","expected 1..8 layers");let i=new Set;n.layers.forEach((r,s)=>{let a=`${e}.layers[${s}]`;F1(r,a,t),i.has(r.id)&&je(a+".id","duplicate layer id"),i.add(r.id)});for(let r of t)Rp(n.signals,r.name)||je(r.field,"missing signal "+r.name);return z1(n),Ga(n)}function Lh(n,e={}){let t=n?.mapping||{space:e.type==="image"?"uv":"object"},i=e.mapping||{},r={...t,...i};return i.space!==void 0&&i.space!=="frame"&&delete r.frame,r.space===void 0&&(r.space=e.type==="image"?"uv":"object"),Ga(r)}function Dh(n){let e=n?.surface||(n?.version===1&&n?.layers?n:null);if(!e)return[];let t=new Set(["baseColor","roughness","metalness"]);for(let i of e.layers||[]){i.height?.amplitude>0&&t.add("normal");for(let r of["clearcoat","clearcoatRoughness"])i[r]!==void 0&&t.add(r)}return["baseColor","roughness","metalness","normal","clearcoat","clearcoatRoughness"].filter(i=>t.has(i))}var Ks=n=>n!==null&&typeof n=="object"&&!Array.isArray(n),Up=n=>JSON.parse(JSON.stringify(n)),nt=(n,e,t="invalid_material_detail",i={})=>{throw Object.assign(Error(n+": "+e),{code:t,detail:{field:n,...i}})},Lp=(n,e,t)=>{Ks(n)||nt(t,"expected object");for(let i of Object.keys(n))e.includes(i)||nt(t+"."+i,"unsupported field")},B1=/^[a-f0-9]{64}$/,k1=n=>n?.detail||(n?.version===1&&n?.surface?n:null),Dp=(n,e)=>{(typeof n!="number"||!Number.isFinite(n)||n<=0)&&nt(e,"expected positive finite metres")},H1=(n,e)=>{(!Array.isArray(n)||n.length!==3||n.some(t=>typeof t!="number"||!Number.isFinite(t)))&&nt(e,"expected three finite numbers")},V1=Object.freeze(["box","xy","xz","yz"]),G1=Object.freeze(["object","world"]);function hs(n){let e=k1(n),t=e?.surface?.layers||[];return[...t.some(i=>i.color!==void 0)?["baseColor"]:[],...t.some(i=>i.roughness!==void 0)?["roughness"]:[],...t.some(i=>i.height?.amplitude>0)?["normal"]:[]]}function W1(n){try{Ph(n)}catch(e){throw e.detail?.field?.startsWith("material.surface")&&nt(e.detail.field.replace("material.surface","material.detail.surface"),e.message.slice(e.detail.field.length+2)),e}n.mapping&&n.mapping.space!=="object"&&nt("material.detail.surface.mapping.space","detail tile signals use object mappings");for(let[e,t]of Object.entries(n.signals))Lh(n,t).space!=="object"&&nt("material.detail.surface.signals."+e+".mapping.space","detail tile signals use object mappings; place the tile with detail.space");for(let[e,t]of n.layers.entries())for(let i of Object.keys(t))["id","mask","color","roughness","height"].includes(i)||nt(`material.detail.surface.layers[${e}].${i}`,"detail layers may write color, roughness and height only")}function Xa(n,e={}){let t="material.detail";Lp(n,["version","size","channelSizes","projection","space","origin","rotation","surface"],t),n.version!==1&&nt(t+".version","expected version 1"),Dp(n.size,t+".size"),V1.includes(n.projection)||nt(t+".projection","expected box/xy/xz/yz"),G1.includes(n.space)||nt(t+".space","expected object/world");for(let o of["origin","rotation"])n[o]!==void 0&&H1(n[o],t+"."+o);W1(n.surface);let i=hs(n),r=i.includes("roughness"),s=i.includes("normal"),a=i.includes("baseColor");if(i.length||nt(t+".surface.layers","declare color, roughness or positive height amplitude"),n.channelSizes!==void 0){Lp(n.channelSizes,i,t+".channelSizes");for(let[o,l]of Object.entries(n.channelSizes)){let c=t+".channelSizes."+o;Dp(l,c),Number.isFinite(1/l)||nt(c,"expected a positive finite reciprocal");let h=n.size/l;(!Number.isFinite(h)||h<1e-6||h>1024)&&nt(c,"physical size requires portable UV scale 1e-6..1024")}}e.procedural!==void 0&&nt("material.procedural","legacy procedural cannot be combined with portable detail"),a&&e.textures?.baseColor!==void 0&&nt("material.textures.baseColor","detail color replaces the base color texture"),r&&e.textures?.roughness!==void 0&&nt("material.textures.roughness","detail roughness replaces the base roughness channel"),r&&e.textures?.metalness!==void 0&&nt("material.textures.metalness","glTF metallic/roughness share a UV set; detail roughness requires uniform metalness"),s&&e.textures?.normal!==void 0&&nt("material.textures.normal","detail normal cannot be combined with an existing normal texture");for(let[o,l]of(e.surface?.layers||[]).entries())a&&l.color!==void 0&&nt(`material.surface.layers[${o}].color`,"macro surface cannot write color when detail replaces it"),r&&l.roughness!==void 0&&nt(`material.surface.layers[${o}].roughness`,"macro surface cannot write roughness when detail replaces it"),s&&l.height?.amplitude>0&&nt(`material.surface.layers[${o}].height`,"macro and detail height cannot be combined");return r&&(e.surface?.layers||[]).some(o=>o.metalness!==void 0)&&nt("material.surface.layers","fold constant macro metalness into material.metalness and remove layer declarations before attaching detail"),Up(n)}var Nh=n=>Array.isArray(n)?n.map(Nh):Ks(n)?Object.fromEntries(Object.keys(n).sort().map(e=>[e,Nh(n[e])])):n,X1=[1116352408,1899447441,3049323471,3921009573,961987163,1508970993,2453635748,2870763221,3624381080,310598401,607225278,1426881987,1925078388,2162078206,2614888103,3248222580,3835390401,4022224774,264347078,604807628,770255983,1249150122,1555081692,1996064986,2554220882,2821834349,2952996808,3210313671,3336571891,3584528711,113926993,338241895,666307205,773529912,1294757372,1396182291,1695183700,1986661051,2177026350,2456956037,2730485921,2820302411,3259730800,3345764771,3516065817,3600352804,4094571909,275423344,430227734,506948616,659060556,883997877,958139571,1322822218,1537002063,1747873779,1955562222,2024104815,2227730452,2361852424,2428436474,2756734187,3204031479,3329325298];function Uh(n){let e=new TextEncoder().encode(n),t=Math.ceil((e.length+9)/64)*64,i=new Uint8Array(t);i.set(e),i[e.length]=128;let r=new DataView(i.buffer),s=e.length*8;r.setUint32(t-8,Math.floor(s/4294967296)),r.setUint32(t-4,s>>>0);let a=[1779033703,3144134277,1013904242,2773480762,1359893119,2600822924,528734635,1541459225],o=new Uint32Array(64),l=(c,h)=>c>>>h|c<<32-h;for(let c=0;c<t;c+=64){for(let _=0;_<16;_++)o[_]=r.getUint32(c+_*4);for(let _=16;_<64;_++){let x=o[_-15],v=o[_-2];o[_]=o[_-16]+(l(x,7)^l(x,18)^x>>>3)+o[_-7]+(l(v,17)^l(v,19)^v>>>10)>>>0}let[h,u,f,d,p,y,g,m]=a;for(let _=0;_<64;_++){let x=m+(l(p,6)^l(p,11)^l(p,25))+(p&y^~p&g)+X1[_]+o[_]>>>0,v=(l(h,2)^l(h,13)^l(h,22))+(h&u^h&f^u&f)>>>0;m=g,g=y,y=p,p=d+x>>>0,d=f,f=u,u=h,h=x+v>>>0}for(let[_,x]of[h,u,f,d,p,y,g,m].entries())a[_]=a[_]+x>>>0}return a.map(c=>c.toString(16).padStart(8,"0")).join("")}function Op(n){if(!n?.detail)return null;Xa(n.detail,n);let e=n.roughness??.5;(typeof e!="number"||!Number.isFinite(e)||e<0||e>1)&&nt("material.roughness","expected number 0..1");let t={detail:n.detail,roughness:e};if(hs(n).includes("baseColor")){let i=n.color??[.7,.7,.7,1];typeof i=="string"&&/^#[a-f0-9]{6}$/i.test(i)||Array.isArray(i)&&[3,4].includes(i.length)&&i.every(r=>typeof r=="number"&&Number.isFinite(r)&&r>=0&&r<=1)||nt("material.color","expected hex RGB or linear unit RGB(A)"),t.color=i}return Uh(JSON.stringify(Nh(t)))}function Oh(n,e,{required:t=!1,resolution:i}={}){if(!e?.detail)return null;Xa(e.detail,e);let r=Op(e),s=hs(e),a=n?.meta?.materialDetails?.[r],o=[];if(i!==void 0&&(!Number.isSafeInteger(i)||i<64||i>1024)&&nt("detail.resolution","expected integer 64..1024"),!Ks(a))o.push("cache_missing");else{a.version!==1&&o.push("cache_version"),a.detailKey!==r&&o.push("cache_key_mismatch"),(!Number.isSafeInteger(a.resolution)||a.resolution<64||a.resolution>1024||i!==void 0&&a.resolution<i)&&o.push("cache_resolution"),a.size!==e.detail.size&&o.push("cache_size_mismatch"),(!Array.isArray(a.outputs)||a.outputs.length!==s.length||new Set(a.outputs.map(h=>h?.channel)).size!==s.length)&&o.push("cache_channels");for(let h of Array.isArray(a.outputs)?a.outputs:[]){if(!Ks(h)||!s.includes(h.channel)){o.push("cache_channel_unsupported");continue}if(typeof h.image!="string"||!B1.test(h.image)){o.push("cache_image_hash");continue}h.colorSpace!==(h.channel==="baseColor"?"srgb":"linear")&&o.push("cache_color_space"),(h.width!==a.resolution||h.height!==a.resolution)&&o.push("cache_dimensions");let u=n?.meta?.materialLibrary?.images?.[h.image];Ks(u)?(u.hash!==h.image||u.width!==a.resolution||u.height!==a.resolution||u.mime!==void 0&&u.mime!=="image/png")&&o.push("cache_image_descriptor"):o.push("cache_image_missing")}for(let h of s)(Array.isArray(a.outputs)?a.outputs:[]).some(u=>u?.channel===h)||o.push("cache_channel_missing_"+h)}if(o.length)return t&&nt("material.detail","bake the exact detail source before rendering","detail_bake_required",{detailKey:r,reasons:[...new Set(o)]}),null;let l={},c={};for(let h of a.outputs){let u=e.detail.size/(e.detail.channelSizes?.[h.channel]??e.detail.size),f=u===1?{}:{scale:[u,u]};l[h.channel]={type:"image",image:h.image,colorSpace:h.colorSpace,texCoord:1,...f},c[h.channel]={type:"image",file:"image-"+h.image+".png",colorSpace:h.colorSpace,...f}}return{detailKey:r,cache:Up(a),textures:l,detailTextures:c}}var Qs=n=>n!==null&&typeof n=="object"&&!Array.isArray(n),us=n=>JSON.parse(JSON.stringify(n)),Fn=(n,e,t="invalid_material")=>{throw Object.assign(new Error(n+": "+e),{code:t,detail:{field:n}})},Ww=Object.freeze(["baseColor","roughness","metalness","normal","ao","emissive","clearcoat","clearcoatRoughness"]);var $1=(n,e,t)=>{Qs(n)||Fn(t,"expected object");for(let i of Object.keys(n))e.includes(i)||Fn(t+"."+i,"unsupported field")};function j1(n){return(typeof n!="string"||!/^[A-Za-z][A-Za-z0-9_-]{0,79}$/.test(n))&&Fn("materialId","expected stable identifier of up to 80 letters/digits/_/-"),n}function Z1(n){let e=n?.meta?.materialLibrary;return e===void 0?{version:1,materials:{},images:{}}:($1(e,["version","materials","images"],"materialLibrary"),(e.version!==1||!Qs(e.materials)||!Qs(e.images))&&Fn("materialLibrary","unsupported version or tables"),(Object.keys(e.materials).length>256||Object.keys(e.images).length>512)&&Fn("materialLibrary","resource budget exceeded"),e)}function qa(n,e={}){if(Qs(e)||Fn("material","expected JSON object"),e.materialRef===void 0)return us(e);let t=j1(e.materialRef),i=Z1(n).materials[t];i||Fn("material.materialRef","missing material "+t,"material_not_found");let{materialRef:r,...s}=e;return{...us(i.spec),...us(s),...s.properties?{properties:{...i.spec.properties||{},...us(s.properties)}}:{},...s.textures?{textures:{...i.spec.textures||{},...us(s.textures)}}:{}}}var Ya=n=>Array.isArray(n)?n.map(Ya):Qs(n)?Object.fromEntries(Object.keys(n).sort().map(e=>[e,Ya(n[e])])):n;function Fh(n){return Uh(JSON.stringify(Ya(n)))}function J1(n,e={}){let t=qa(n,e),i=n.meta?.materialCompilation?.entries?.[Fh(t)];return i?((i.version!==1||i.sourceKey!==Fh(t)||i.specKey!==Fh(i.spec))&&Fn("material.compilation","derived material identity mismatch","material_compilation_stale"),us(i.spec)):t}function K1(n,e){let t,i,r=(a,o=[])=>{for(let l of a){let c=[...o,l];if(l.id===e){t=l,i=c;return}if(l.parts&&r(l.parts,c),t)return}};r(n.objects||[]),t||Fn("bake.object","object not found","not_found");let s={frames:i.map(a=>({id:a.id,position:a.position||[0,0,0],rotation:a.rotation||[0,0,0],scale:a.scale||[1,1,1]})),material:qa(n,t.material||{}),features:(t.recipe?.params?.features||[]).filter(a=>a.type==="material").map(a=>({id:a.id,material:qa(n,a.material)}))};return(t.materialSlots||[]).some(a=>a?.detail||a?.materialRef&&n?.meta?.materialLibrary?.materials?.[a.materialRef]?.spec?.detail)&&(s.materialSlots=t.materialSlots.map(a=>a?qa(n,a):null)),JSON.stringify(s.material.surface||s.material.detail||s.materialSlots||s.features.some(a=>a.material.surface||a.material.detail)?Ya(s):s)}function Fp(n,e={},t={}){let i=J1(n,e),r=i.detail?Oh(n,i,{required:!0}):null,s=n?.meta?.materialBakes?.[t.objectId],a=i.surface?Dh(i):i.procedural?["baseColor","roughness",...i.procedural.bumpDistance?["normal"]:[]]:[],o=new Set(hs(i));for(let c of[...o,...o.has("roughness")?["metalness"]:[]]){let h=a.indexOf(c);h>=0&&a.splice(h,1)}let l=new Set((s?.outputs||[]).map(c=>c.channel));if(s&&s.sourceHash===t.sourceHash&&s.topologyStamp===t.topologyStamp&&typeof s.appearanceKey=="string"&&s.appearanceKey===K1(n,t.objectId)&&a.every(c=>l.has(c))){i.textures={...i.textures||{}};for(let c of s.outputs||[])o.has(c.channel)||o.has("roughness")&&c.channel==="metalness"||(i.textures[c.channel]={type:"image",image:c.image,colorSpace:c.colorSpace},c.channel==="baseColor"&&(i.color="#ffffff"),c.channel==="emissive"&&(i.emissive="#ffffff",i.emissiveIntensity=1),["roughness","metalness","clearcoat","clearcoatRoughness"].includes(c.channel)&&(i[c.channel]=1),c.channel==="normal"&&(i.normalScale=1));delete i.procedural,delete i.surface}return i.surface&&Fn("material.surface","bake this object after its material/UV/geometry changes","material_bake_required"),i.procedural&&Fn("material.procedural","bake this object after its material/UV/geometry changes","material_bake_required"),r&&(i.textures={...i.textures||{},...r.textures},o.has("baseColor")&&(i.color="#ffffff"),o.has("roughness")&&(i.roughness=1),o.has("normal")&&(i.normalScale=1)),i}var fs=Object.freeze({background:At.background,lighting:"studio-lighting-v3",environment:"studio-radiance-v3",environmentSigma:0,hemisphereSky:At.hemisphere.sky,hemisphereGround:At.hemisphere.ground,hemisphereIntensity:At.hemisphere.intensity,keyColor:At.key.color,keyIntensity:At.key.intensity,keyPosition:Object.freeze([...At.key.position])}),kh=new Set(zs),Hh=new Set(Bs),Q1=Object.freeze({material:"\u6807\u51C6\u5DE5\u4F5C\u5BA4\u5916\u89C2\uFF1A\u5171\u4EABPBR\u6750\u8D28\u3001\u73AF\u5883\u4E0E\u706F\u5149\uFF1B\u9ED8\u8BA4\u663E\u793A\u89C2\u5BDF\u955C\u9762\u5730\u677F\u4E0E\u9634\u5F71\u3002Standard studio appearance; the default observation view.",clay:"\u65E2\u6709\u4E2D\u6027\u7070\u9ECF\u571F\uFF08#a6b6c6\uFF09\uFF0C\u4E0D\u662F\u65B0\u7684\u767D\u8272\u8BCA\u65AD\u6A21\u578B\uFF1B\u65E0\u955C\u9762\u5730\u677F\u3002Existing gray clay, not the white diagnostic model.",normal:"\u65E2\u6709\u53CC\u9762 MeshNormalMaterial \u663E\u793A\u7740\u8272\u6CD5\u7EBF\uFF1B\u5B83\u662F\u6CD5\u7EBF\u8BCA\u65AD\uFF0C\u4E0D\u662F\u6807\u51C6\u5916\u89C2\uFF0C\u4E5F\u4E0D\u662F\u65B0\u7684normal\u5916\u89C2\u6A21\u5F0F\u3002Existing shading-normal diagnostic, not the standard appearance.",final_normal:"Actual standard-material geometry and normalMap result; unlit, no tone mapping, displayed in sRGB.",orientation:"\u84DD\uFF1A\u76F8\u673A\u6240\u89C1\u7ED5\u5E8F\u6B63\u9762\uFF1B\u7EA2\uFF1A\u7ED5\u5E8F\u80CC\u9762\u3002\u53CC\u9762\u65E0\u5149\u7167\u3001\u5FFD\u7565\u900F\u660E\u5EA6\uFF1B\u4E0D\u5224\u5B9A\u95ED\u5408\u5185\u5916\uFF0C\u4E5F\u4E0D\u663E\u793A\u6CD5\u7EBF\u8D34\u56FE\u3002",zebra:"\u539F\u6709\u76F8\u673A\u76F8\u5BF9\u53CD\u5C04\u6761\u7EB9\uFF0C\u4FDD\u7559\u53CC\u9762\u663E\u793A\uFF1BDoubleSide \u4E0D\u8BC1\u660E\u9762\u7ED5\u5E8F\u6216\u95ED\u5408\u5916\u5411\u6B63\u786E\u3002",roughness:"\u5B9E\u9645 roughness \u56E0\u5B50 \xD7 \u8D34\u56FE G\uFF0C\u590D\u5236\u4E3A\u7070\u5EA6\uFF1B\u65E0\u5149\u7167\u3001\u65E0\u8272\u8C03\u6620\u5C04\uFF0C\u7EBF\u6027\u6807\u91CF\u7ECF sRGB \u663E\u793A\u7F16\u7801\uFF0C\u5FFD\u7565\u900F\u660E\u5EA6\u3002",metalness:"\u5B9E\u9645 metalness \u56E0\u5B50 \xD7 \u8D34\u56FE B\uFF0C\u590D\u5236\u4E3A\u7070\u5EA6\uFF1B\u65E0\u5149\u7167\u3001\u65E0\u8272\u8C03\u6620\u5C04\uFF0C\u7EBF\u6027\u6807\u91CF\u7ECF sRGB \u663E\u793A\u7F16\u7801\uFF0C\u5FFD\u7565\u900F\u660E\u5EA6\u3002",albedo:"\u5B9E\u9645 baseColor \u8D34\u56FE \xD7 \u989C\u8272\u56E0\u5B50\uFF1B\u65E0\u5149\u7167\u3001\u65E0\u8272\u8C03\u6620\u5C04\uFF0C\u4EE5 sRGB \u663E\u793A\uFF0C\u5FFD\u7565\u900F\u660E\u5EA6\u3002",wire:"\u65E2\u6709\u6750\u8D28\u7EBF\u6846\uFF08MeshStandardMaterial.wireframe\uFF09\uFF0C\u4EC5\u4E3A\u517C\u5BB9\u4FDD\u7559\uFF1B\u5B83\u9690\u85CF\u586B\u5145\u9762\uFF0C\u4E0D\u662Fsurface_wireframe\u7684\u6DF1\u5EA6\u611F\u77E5\u8868\u9762\u7EBF\u6846\u3002Legacy material wireframe, not the display overlay."}),Bh=Object.freeze({normal:"\u6807\u51C6\u663E\u793A\u8868\u9762\uFF1A\u4E0D\u53E0\u52A0\u51E0\u4F55\u7EBF\uFF1B\u7531mode\u51B3\u5B9A\u6750\u8D28/\u901A\u9053\u8BCA\u65AD\uFF0Cmaterial\u65F6\u9ED8\u8BA4\u663E\u793A\u5DE5\u4F5C\u5BA4\u955C\u9762\u5730\u677F\u3002No geometric overlay; mode still selects the channel appearance.",surface_wireframe:"\u767D\u8272\u9ECF\u571F\u5B9E\u4F53 + \u771F\u5B9E\u4E09\u89D2\u9762WireframeGeometry\u53E0\u52A0\u7EBF\uFF1B\u7EBF\u505A\u6DF1\u5EA6\u6D4B\u8BD5\uFF0C\u4FDD\u7559\u586B\u5145\u4E0E\u660E\u6697\uFF1B\u65E0\u955C\u9762\u5730\u677F\u3001\u7EAF\u80CC\u666F\uFF1B\u4E0E\u5176\u5B83\u663E\u793A\u5171\u7528\u540C\u4E00\u706F\u5149/\u9634\u5F71/\u76F8\u673A\u3002White clay with a depth-tested real surface wireframe overlay.",outline:"\u767D\u8272\u9ECF\u571F\u5B9E\u4F53 + \u53EF\u89C1\u8BED\u4E49\u8FB9\u754C\u4E0E\u8F6E\u5ED3\uFF1A\u6309 mesh.userData.editableId \u7684\u53EF\u89C1\u6DF1\u5EA6 ID \u505A 3x3 \u5C4F\u5E55\u7A7A\u95F4\u8FB9\u7F18\u5408\u6210\uFF0C\u540C\u4E00\u6765\u6E90\u5171\u4EAB\u989C\u8272\uFF1B\u76F8\u90BB\u5171\u9762\u90E8\u4EF6/\u63A5\u7F1D\u4E0E\u5149\u6ED1\u8F6E\u5ED3\u53EF\u8FA8\uFF0C\u6DF1\u5EA6\u6D4B\u8BD5\u4F7F\u906E\u6321\u8FB9\u4E0D\u7A7F\u900F\uFF1B\u53EF\u9009\u786C\u6298\u8FB9\u53E0\u52A0\u7EBF\u3002\u7F51\u683C\u4E09\u89D2\u5F62\u8FB9\u754C\u4E0D\u662F CAD \u62D3\u6251\u8BC1\u660E\uFF1B\u65E0\u955C\u9762\u5730\u677F\u3001\u7EAF\u80CC\u666F\u3002White clay with visible semantic editableId boundaries and silhouettes from a depth-tested 3x3 ID composite, plus optional hard crease edges; not a CAD topology proof."});function eM(n,e,t){let i=Q1[n]||null,r=e!=="normal"&&Bh[e]||null;return!i&&!r?null:{...i?{description:i}:{},...r?{displayMode:e,displayModeDescription:r,surfaceMode:t?.policy?.whiteClay?"white-clay":"channel",overlay:t?.policy?.overlay??null,floor:t?.floor?.enabled?"effective":"none",background:t?.policy?.floorAllowed?"effective":"flat"}:{}}}var tM=()=>"8539b9867abdfd13f50dd0b9b0cc78f37ab1449ae5b29ea588ff68edc8483ded",Vh=new WeakMap,nM="#f4f5f7";function iM(){return new pn({color:nM,metalness:0,roughness:.58,side:Qt,polygonOffset:!0,polygonOffsetFactor:1,polygonOffsetUnits:1})}var $a=n=>Array.isArray(n)?new ye().setRGB(n[0],n[1],n[2]):n;function eo(n){let e=new Set;for(let t of Array.isArray(n)?n:[n])if(t){for(let i of Object.values(t))i?.isTexture&&e.add(i);t.dispose()}for(let t of e)t.dispose()}function rM(n,e){let t=e.normalMap||null,i=new Set(Object.values(e).filter(s=>s?.isTexture)),r=n.normalScale!==void 0?Array.isArray(n.normalScale)?new ce(...n.normalScale):new ce(n.normalScale,n.normalScale):e.normalScale||new ce(1,1);try{let s=new pn({color:"#ffffff",metalness:0,roughness:1,normalMap:t,normalScale:r,side:n.doubleSided?Rt:Qt,toneMapped:!1,fog:!1,transparent:!1,opacity:1});s.onBeforeCompile=a=>{let o="#include <opaque_fragment>";if(!a.fragmentShader.includes(o))throw new Error("Three standard shader is missing opaque_fragment");a.fragmentShader=a.fragmentShader.replace(o,"gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, 1.0 );")},s.customProgramCacheKey=()=>"modeler-final-normal-with-normal-map-v1";for(let a of i)a!==t&&a.dispose();return s}catch(s){for(let a of i)a.dispose();throw s}}function sM(n,e,t){let i=t!=="albedo",r=t==="roughness"?"g":"b",s=i?e[t+"Map"]:e.map,a=n[t]??(t==="roughness"?.5:.1),o=new Vn({color:i?new ye().setRGB(a,a,a):$a(n.color??"#a5b6cc"),map:s||null,side:n.doubleSided?Rt:Qt,toneMapped:!1,fog:!1,transparent:!1,opacity:1});o.onBeforeCompile=l=>{l.fragmentShader=l.fragmentShader.replace("#include <map_fragment>",i?`#ifdef USE_MAP
 diffuseColor.rgb *= vec3(texture2D(map,vMapUv).${r});
#endif
 diffuseColor.a = 1.0;`:`#include <map_fragment>
 diffuseColor.a = 1.0;`)},o.customProgramCacheKey=()=>"modeler-final-channel-"+t+"-srgb-v1";for(let l of new Set(Object.values(e)))l?.isTexture&&l!==s&&l.dispose();return o}function zh(n,e="material",t={},i="normal"){if(!kh.has(e))throw new Error("Unknown observation mode: "+e);if(!Hh.has(i))throw new Error("Unknown display mode: "+i);if(i==="surface_wireframe"||i==="outline")return iM();if(e==="orientation"){let f=new Vn({color:"#ffffff",side:Rt,toneMapped:!1,fog:!1,transparent:!1,opacity:1});return f.onBeforeCompile=d=>{d.fragmentShader=d.fragmentShader.replace("#include <color_fragment>",`#include <color_fragment>
 diffuseColor = vec4(gl_FrontFacing ? vec3(0.0,0.2,1.0) : vec3(1.0,0.02,0.02),1.0);`)},f.customProgramCacheKey=()=>"modeler-camera-facing-winding-v1",f}if(e==="zebra"){let f=new pn({color:"#ffffff",metalness:0,roughness:.36,side:Rt});return f.onBeforeCompile=d=>{d.fragmentShader=d.fragmentShader.replace("#include <normal_fragment_maps>",`#include <normal_fragment_maps>
vec3 stripeReflection=reflect(-normalize(vViewPosition),normal); float stripePhase=18.0*atan(stripeReflection.x,stripeReflection.z)+5.0*stripeReflection.y; float stripeWave=sin(stripePhase); float stripeEdge=max(fwidth(stripeWave),.03); diffuseColor.rgb=mix(vec3(.025),vec3(.95),smoothstep(-stripeEdge,stripeEdge,stripeWave));`)},f.customProgramCacheKey=()=>"modeler-camera-relative-zebra-v1",f}if(e==="normal")return new ca({side:Rt});if(e==="id"){let f=2166136261;for(let d of String(n.editableId||n.id))f=Math.imul(f^d.charCodeAt(0),16777619);return new Vn({color:f>>>0&16777215})}if(e==="clay"||e==="wire")return new pn({color:"#a6b6c6",metalness:0,roughness:.62,wireframe:e==="wire"});let r=Fp(t.doc||{},n.material||{},t),s=t.materialPool,a=s?e+":"+JSON.stringify(r):null;if(s?.has(a))return s.get(a);let o=cd(r,t.appearanceAssets||{}),l=f=>(s&&s.set(a,f),f);if(e==="final_normal")return l(rM(r,o));if(["roughness","metalness","albedo"].includes(e))try{return l(sM(r,o,e))}catch(f){for(let d of new Set(Object.values(o)))d?.isTexture&&d.dispose();throw f}let c=r.opacity??(Array.isArray(r.color)?r.color[3]:void 0)??1,h={...o,color:$a(r.color??"#a5b6cc"),metalness:r.metalness??.1,roughness:r.roughness??.5,opacity:c,transparent:r.transparent??c<1,side:r.doubleSided?Rt:Qt,emissive:$a(r.emissive??"#000000"),emissiveIntensity:r.emissiveIntensity??0};r.normalScale!==void 0&&(h.normalScale=Array.isArray(r.normalScale)?new ce(...r.normalScale):new ce(r.normalScale,r.normalScale));let u=r.clearcoat||r.transmission||r.ior||r.thickness||o.clearcoatMap||o.clearcoatRoughnessMap;try{return l(u?new la({...h,clearcoat:typeof r.clearcoat=="number"?r.clearcoat:r.clearcoat?1:0,clearcoatRoughness:r.clearcoatRoughness??.15,transmission:r.transmission??0,ior:r.ior??1.5,thickness:r.thickness??0,attenuationColor:$a(r.attenuationColor??"#ffffff"),attenuationDistance:r.attenuationDistance??1/0}):new pn(h))}catch(f){for(let d of Object.values(o))d?.isTexture&&d.dispose();throw f}}function kp(n,e,t,i="normal"){if(i!=="normal"||!["material","roughness","metalness","albedo","final_normal"].includes(e)||!n.materialSlots?.length)return zh(n,e,t,i);if(n.materialSlots.length===1)return zh({...n,material:n.materialSlots[0]||n.material},e,t,i);let r=[];try{for(let s of n.materialSlots)r.push(zh({...n,material:s||n.material},e,t,i));return r}catch(s){throw eo(r),s}}function Hp(n){n.debug&&(n.debug.onShaderError=(e,t,i,r)=>{throw new Error("WebGL shader failure: "+[e.getProgramInfoLog(t),e.getShaderInfoLog(i),e.getShaderInfoLog(r)].join(" | ").slice(0,2400))}),n.outputColorSpace=mt,n.toneMapping=Cc,n.toneMappingExposure=1,n.localClippingEnabled=!0,n.shadowMap.enabled=!0,n.shadowMap.type=bi}function oM({canvas:n,width:e=1,height:t=1,pixelRatio:i=1,renderer:r,environment:s}={}){let a=!r,o=r||new Ts({...n?{canvas:n}:{},antialias:!0,preserveDrawingBuffer:!0}),l=new Xi,c=new Xt;l.background=new ye(fs.background),l.add(c);let h=s,u=null;try{a&&(Hp(o),o.setPixelRatio(i),o.setSize(e,t,!1)),h||(u=Pd(o),h=u),l.environment=h?.texture||h;let p=new Vr(fs.hemisphereSky,fs.hemisphereGround,fs.hemisphereIntensity);p.name="modeler-hemisphere",p.userData.observationRole="hemisphere",l.add(p),l.userData.modelerHemisphere=p;for(let y of["key","fill","rim"]){let g=At[y],m=new Gr(g.color,g.intensity);m.name="modeler-"+y,m.userData.observationRole=y,m.position.fromArray(g.position),m.shadow.mapSize.set(At.shadows.mapSize,At.shadows.mapSize),l.add(m),l.userData["modeler"+y[0].toUpperCase()+y.slice(1)]=m}}catch(p){throw u?.dispose?.(),a&&(o.dispose(),o.forceContextLoss()),p}let f=!1,d={renderer:o,scene:l,root:c,environment:h,environmentHandle:u||s,environmentSource:h?.source||"borrowed",ownsRenderer:a,lights:{hemisphere:l.userData.modelerHemisphere,key:l.userData.modelerKey,fill:l.userData.modelerFill,rim:l.userData.modelerRim},defaultLights:[l.userData.modelerHemisphere,l.userData.modelerKey,l.userData.modelerFill,l.userData.modelerRim],dispose(){f||(f=!0,Rd(d),Aa(d),Hc(d),ja([...c.children]),c.clear(),l.environment=null,l.clear(),u?.dispose?.(),a&&(o.renderLists.dispose(),o.dispose(),o.forceContextLoss()))}};return d}function zp(n,e){return n.observation?.restore(),{...dd(n,e,fs),authoredFields:e?Object.keys(e):[]}}function ja(n){let e=new Set;for(let t of n){t.removeFromParent();let i=[];t.traverse(r=>{r!==t&&i.push(r)});for(let r of i){r.removeFromParent(),r.geometry?.dispose();for(let s of Array.isArray(r.material)?r.material:[r.material])e.add(s)}t.geometry?.dispose();for(let r of Array.isArray(t.material)?t.material:[t.material])e.add(r);Vh.delete(t)}eo([...e])}function Vp(n){let e={...n,visible:n.visible!==!1&&n.hidden!==!0};return Array.isArray(n.parts)&&(e.parts=n.parts.map(Vp)),e}function aM(n){let e=new Map,t=i=>{for(let r of i)e.set(String(r.id??r.semanticId),r),r.parts&&t(r.parts)};return t(n.objects),e}function lM(n){let e=n?.recipe?.type==="nativeMesh"?n.recipe.params:null;if(!e)return n?.nativeIdentity;let t={...n.nativeIdentity||{},sourceHash:e.sourceHash,topologyStamp:e.topologyStamp};for(let i of["vertexIds","vertexSourceIds","vertexInstanceIndices","triangleFaceIds","triangleSourceFaceIds","triangleInstanceIndices"])e.mesh?.[i]&&(t[i]=e.mesh[i].slice());return t}function Gp(n){return(Array.isArray(n)?n:[n]).some(e=>!!e?.normalMap)}function Wp(n,e){let t=n.getAttribute("position"),i=n.getAttribute("uv"),r=n.getAttribute("uv1"),s=t.count,a=Array.isArray(e)?e:[e],o=n.groups.length?n.groups:[{start:0,count:s,materialIndex:0}],l=new Uint8Array(s),c=!1;for(let m of o){let _=a[m.materialIndex],x=_?.normalMap,v=x?.channel??0;if(v!==0&&v!==1)throw new Error("Normal map texCoord must be 0 or 1");if(x&&v===1&&!r)throw new Error("normalMap texCoord 1 requires geometryData.detailUvs");if(x&&v===0&&!i)throw new Error("normalMap texCoord 0 requires geometryData.uvs");v===0&&!i||(c=!0,l.fill(v,m.start,m.start+m.count))}if(!c)return;let h=new Float32Array(s*2);for(let m=0;m<s;m++){let _=l[m]===1?r:i;_&&(h[m*2]=_.getX(m),h[m*2+1]=_.getY(m))}let u=n.index,f=new Uint32Array(s);for(let m=0;m<s;m++)f[m]=m;n.setAttribute("uv",new lt(h,2)),n.setIndex(new tn(f,1));try{n.computeTangents()}finally{n.setIndex(u),i?n.setAttribute("uv",i):n.deleteAttribute("uv")}let d=n.getAttribute("tangent"),p=n.getAttribute("normal"),y=new P,g=new P;for(let m=0;m<s;m++)g.fromBufferAttribute(d,m).lengthSq()<1e-12&&(y.fromBufferAttribute(p,m).normalize(),y.lengthSq()<1e-12&&y.set(0,0,1),g.set(Math.abs(y.x)<.9?1:0,Math.abs(y.x)<.9?0:1,0).cross(y).normalize(),d.setXYZW(m,g.x,g.y,g.z,1))}function cM(n,e="material",{visibleOnly:t=!1,isolate:i=null,context:r=[],displayMode:s="normal"}={}){if(!n?.doc||!Array.isArray(n.doc.objects))throw new Error("Capture requires an immutable model snapshot");if(!kh.has(e))throw new Error("Unknown observation mode: "+e);if(!Hh.has(s))throw new Error("Unknown display mode: "+s);if(n.kernelVersion!==void 0&&n.kernelVersion!==lr)throw new Error("Snapshot geometry kernel version does not match renderer");let a=wp({...n.doc,objects:n.doc.objects.map(Vp)}),o=aM(n.doc),l=[],c=new Map,h=[];try{for(let u of a.objects){if(t&&(u.visible===!1||u.hidden===!0)||i&&!Ti(u,i)&&!r.some(x=>Ti(u,x)))continue;let f=new Ft,d,p,y=o.get(u.editableId)||u,g=y.recipe?.params,m={materialPool:c,doc:n.doc,appearanceAssets:n.appearanceAssets||{},objectId:y.id??u.editableId,sourceHash:g?.sourceHash,topologyStamp:g?.topologyStamp};try{if(f.setAttribute("position",new lt(u.geometryData.positions,3)),f.setAttribute("normal",new lt(u.geometryData.normals,3)),u.geometryData.uvs?.length===u.geometryData.positions.length/3*2&&f.setAttribute("uv",new lt(u.geometryData.uvs,2)),u.geometryData.detailUvs!==void 0){if(u.geometryData.detailUvs.length!==u.geometryData.positions.length/3*2||!u.geometryData.detailUvs.every(Number.isFinite))throw new Error("Invalid geometryData.detailUvs");f.setAttribute("uv1",new lt(u.geometryData.detailUvs,2))}if(p=kp(u,e,m,s),Array.isArray(u.materialSlots)&&u.materialSlots.length>1){let x=u.geometryData.materialIndices,v=u.geometryData.positions.length/9;if(!x||x.length!==v||x.some(M=>!Number.isInteger(M)||M<0||M>=u.materialSlots.length))throw new Error("Invalid triangle material indices for "+u.editableId);let E=0,w=x[0];for(let M=1;M<=x.length;M++)(M===x.length||x[M]!==w)&&(f.addGroup(E*3,(M-E)*3,w),E=M,w=x[M])}Gp(p)&&Wp(f,p),d=new St(f,p),d.castShadow=!0,d.receiveShadow=!0}catch(x){throw f.dispose(),p&&eo(p),x}d.name=u.name||u.id,d.userData={part:u,observationMode:e,observationDisplayMode:s,semanticId:u.semanticId,editableId:u.editableId,sourceId:u.sourceId,parentIds:u.parentIds};let _=lM(y);_&&(d.userData.nativeIdentity=_),h.push(m),Vh.set(d,m),d.visible=u.visible!==!1&&u.hidden!==!0,l.push(d)}for(let u of h)delete u.materialPool;return{evaluated:a,meshes:l}}catch(u){throw ja(l),u}}function to(n={}){let e=Ep(n),{mode:t,displayMode:i}=e,{isolate:r=null,context:s=[],section:a=null,lighting:o}=n;if(!kh.has(t))throw new Error("Unknown observation mode: "+t);if(!Hh.has(i))throw new Error("Unknown display mode: "+i);if(r!==null&&(typeof r!="string"||!r.trim()))throw new Error("Isolation requires a nonempty part id");if(a!==null){if(!a||!["x","y","z"].includes(a.axis)||typeof a.value!="number"||!Number.isFinite(a.value))throw new Error("Section requires axis x/y/z and a finite value");a={axis:a.axis,value:a.value}}if(!Array.isArray(s)||s.length>12||s.some(c=>typeof c!="string"||!c))throw new Error("Context needs at most12 exact part IDs");let l=o?.schema==="dsh-modeler.observation-lighting"?ks(o,{mode:t,displayMode:i}):es(o,{mode:t,displayMode:i});return{mode:t,displayMode:i,isolate:r,context:[...new Set(s)].sort(),section:a,lighting:l,observationSelection:e}}function Ti(n,e){return n.editableId===e||n.id===e||(n.parentIds||[]).includes(e)}function hM(n,e,t={}){let i=to(t),{mode:r,displayMode:s,isolate:a,context:o,section:l}=i,c=new Set;for(let u of o)if(!e.some(f=>{let d=f.userData.part;return d.visible!==!1&&d.hidden!==!0&&Ti(d,u)}))throw new Error("Context has no visible part: "+u);n.clippingPlanes=l?[new hn(new P(l.axis==="x"?1:0,l.axis==="y"?1:0,l.axis==="z"?1:0),-l.value)]:[];for(let u of e){let f=u.userData.part;if(f.visible!==!1&&f.hidden!==!0&&(a===null||Ti(f,a)||o.some(p=>Ti(f,p)))&&(u.userData.observationMode!==r||u.userData.observationDisplayMode!==s)){let p=kp(f,r,Vh.get(u),s);try{Gp(p)&&Wp(u.geometry,p)}catch(y){throw eo(p),y}for(let y of Array.isArray(u.material)?u.material:[u.material])c.add(y);u.material=p,u.userData.observationMode=r,u.userData.observationDisplayMode=s}u.visible=f.visible!==!1&&f.hidden!==!0&&(a===null||Ti(f,a)||o.some(p=>Ti(f,p)))}let h=new Set(e.flatMap(u=>Array.isArray(u.material)?u.material:[u.material]));return eo([...c].filter(u=>!h.has(u))),i}function Bp(n,{isolate:e=null,required:t=!1}={}){let i=new dn;for(let r of n)r.visible&&(!e||Ti(r.userData.part,e))&&r.geometry.getAttribute("position")?.count>=3&&i.expandByObject(r);if(i.isEmpty()){if(t)throw new Error(e!==null?"Isolation has no visible geometry: "+e:"The snapshot has no visible geometry");return null}return{min:i.min.toArray(),max:i.max.toArray()}}function uM(n){let{projection:e,fov:t,aspect:i,span:r,near:s,far:a}=n,o=e==="orthographic"?new _i(-r*i/2,r*i/2,r/2,-r/2,s,a):new Bt(t,i,s,a);return o.position.fromArray(n.eye),o.up.fromArray(n.up),o.lookAt(new P().fromArray(n.target)),o.updateProjectionMatrix(),o.updateMatrixWorld(),o}function Gh({width:n=1e3,height:e=700}={}){if(!Number.isSafeInteger(n)||!Number.isSafeInteger(e)||n<64||e<64||n>4096||e>4096||n*e>16*1024*1024)throw new Error("Capture dimensions must be integers from 64 to 4096 and at most 16 megapixels");return{width:n,height:e}}function fM(n){return{size:n.getSize(new ce),pixelRatio:n.getPixelRatio(),target:n.getRenderTarget(),cubeFace:n.getActiveCubeFace(),mipmapLevel:n.getActiveMipmapLevel(),viewport:n.getViewport(new Ge),scissor:n.getScissor(new Ge),scissorTest:n.getScissorTest(),clearColor:n.getClearColor(new ye),clearAlpha:n.getClearAlpha(),clippingPlanes:n.clippingPlanes,localClippingEnabled:n.localClippingEnabled,toneMapping:n.toneMapping,exposure:n.toneMappingExposure,colorSpace:n.outputColorSpace,autoClear:n.autoClear,autoClearColor:n.autoClearColor,autoClearDepth:n.autoClearDepth,autoClearStencil:n.autoClearStencil,xr:n.xr.enabled,shadowEnabled:n.shadowMap.enabled,shadowType:n.shadowMap.type}}function dM(n,e){n.setPixelRatio(e.pixelRatio),n.setSize(e.size.x,e.size.y,!1),n.setRenderTarget(e.target,e.cubeFace,e.mipmapLevel),n.setViewport(e.viewport),n.setScissor(e.scissor),n.setScissorTest(e.scissorTest),n.setClearColor(e.clearColor,e.clearAlpha),n.clippingPlanes=e.clippingPlanes,n.localClippingEnabled=e.localClippingEnabled,n.toneMapping=e.toneMapping,n.toneMappingExposure=e.exposure,n.outputColorSpace=e.colorSpace,n.autoClear=e.autoClear,n.autoClearColor=e.autoClearColor,n.autoClearDepth=e.autoClearDepth,n.autoClearStencil=e.autoClearStencil,n.xr.enabled=e.xr,n.shadowMap.enabled=e.shadowEnabled,n.shadowMap.type=e.shadowType}function pM(n){let e=n.getContext(),t=e.getExtension("WEBGL_debug_renderer_info"),i={maxTextureSize:e.getParameter(e.MAX_TEXTURE_SIZE),version:e.getParameter(e.VERSION),shadingLanguageVersion:e.getParameter(e.SHADING_LANGUAGE_VERSION),vendor:e.getParameter(e.VENDOR),renderer:e.getParameter(e.RENDERER),unmaskedVendor:t?e.getParameter(t.UNMASKED_VENDOR_WEBGL):null,unmaskedRenderer:t?e.getParameter(t.UNMASKED_RENDERER_WEBGL):null,contextAttributes:e.getContextAttributes(),threeRevision:Zi},r=i.unmaskedRenderer||i.renderer||"";return i.rendererMode=/swiftshader|llvmpipe|softpipe|software|lavapipe/i.test(r)?"webgl-software":i.unmaskedRenderer?"webgl-hardware":"webgl-unknown",i}function mM(n){let e=[],t=0;for(let i of n)if(i.visible)for(let[r,s]of(Array.isArray(i.material)?i.material:[i.material]).entries())for(let a of["map","roughnessMap","metalnessMap","normalMap","clearcoatMap","clearcoatRoughnessMap"]){let o=s?.[a];o&&(t++,e.length<16&&e.push({id:i.userData.editableId,slot:r,map:a,width:o.image?.width??null,height:o.image?.height??null,texCoord:o.channel,colorSpace:o.colorSpace}))}return{scope:"Source DataTexture image dimensions after rendering; not a GPU mip-level readback.",total:t,shown:e.length,complete:e.length===t,textures:e}}var Za=class{constructor(e={}){this.studio=oM(e),this.renderer=this.studio.renderer,this.scene=this.studio.scene,this.root=this.studio.root,this.environment=this.studio.environment,this.meshes=[],this.actualObservation=null,this.selectionOverlay=new ya(this.scene),this.disposed=!1}load(e,t="material",i={}){if(this.disposed)throw new Error("Capture renderer has been disposed");let r=to({...i,mode:t}),s=cM(e,t,{visibleOnly:!0,isolate:r.isolate,context:r.context,displayMode:r.displayMode});Aa(this.studio),ja(this.meshes),this.meshes=s.meshes,this.evaluated=s.evaluated,this.snapshot={assetId:e.assetId,revision:e.revision,contentHash:e.contentHash,kernelVersion:lr};for(let a of this.meshes)this.root.add(a);return this.renderStage=e.doc.meta?.renderStage,this.actualStage=zp(this.studio,this.renderStage),this}setObservation(e={}){return this.observation=hM(this.renderer,this.meshes,e),this.observation}capture(e={}){if(this.disposed||!this.snapshot)throw new Error("Load a snapshot before capturing");for(let o of["assetId","revision","contentHash"])if(e[o]!==void 0&&e[o]!==this.snapshot[o])throw new Error("Capture snapshot "+o+" does not match request");let{width:t,height:i}=Gh(e),r=to(e),s=this.studio.ownsRenderer?null:fM(this.renderer),a=this.renderer;try{Hp(a),a.xr.enabled=!1,a.setRenderTarget(null),a.setPixelRatio(1),a.setSize(t,i,!1),a.setViewport(0,0,t,i),a.setScissorTest(!1),a.autoClear=a.autoClearColor=a.autoClearDepth=a.autoClearStencil=!0,this.studio.observation?.restore(),this.setObservation(r),this.actualStage=zp(this.studio,this.renderStage),this.selectionOverlay.set(e.overlay||null,this.snapshot);let o=Bp(this.meshes,{required:!0}),l=Bp(this.meshes,{isolate:r.isolate,required:!0}),c=(e.focusSelection&&e.overlay?this.selectionOverlay.bounds():null)||l;this.actualObservation=Ad(this.studio,r.lighting,{mode:r.mode,displayMode:r.displayMode,bounds:o,meshes:this.meshes,stage:this.actualStage});let h=md(c,{view:e.view||"iso",camera:e.camera||{},aspect:t/i,front:this.evaluated.meta?.front||[0,0,1],projectionDefault:"perspective"}),u=uM(h),f=h.far,d=h.near;if(a.getContext().isContextLost())throw new Error("Three WebGL context was lost before capture");let p=Td(this.studio,u,this.meshes,this.actualObservation?.displayMode||r.displayMode,this.actualObservation,o);h.near=u.near,h.far=u.far;let y={resolved:f,effective:u.far};if(this.actualObservation&&(this.actualObservation.screenOutline=p),a.getContext().isContextLost())throw new Error("Three WebGL context was lost during capture");let g=a.domElement.toDataURL("image/png");if(!g.startsWith("data:image/png;base64,")||g.length<40)throw new Error("Three renderer did not produce a PNG image");let m=pM(a),_=this.actualObservation,x=_.plan,v=r.displayMode!=="normal"&&Bh[r.displayMode]?{displayMode:r.displayMode,description:Bh[r.displayMode],surfaceMode:x.policy.whiteClay?"white-clay":"channel",overlay:x.policy.overlay,floor:"none",background:"flat"}:null,E=eM(r.mode,r.displayMode,x),w={toneMapping:a.toneMapping,exposure:_.exposure,sceneBounds:o,cameraFar:y,cameraClipping:{policy:"model-and-ground-v2",resolved:{near:d,far:f},effective:{near:u.near,far:u.far}},colorSpace:a.outputColorSpace,baseStudio:fs,background:_.background,lighting:{owner:x.lightOwner,source:x.lights.source,effective:x.lights,actual:_.lights,shadows:_.shadows},environment:_.environment,floor:_.floor,width:t,height:i,pixelRatio:1,antialias:m.contextAttributes?.antialias??null,localClippingEnabled:a.localClippingEnabled,textures:mM(this.meshes),glInfo:m,...E?{observationDiagnostic:{...E,...["orientation","roughness","metalness","albedo","final_normal"].includes(r.mode)?{lighting:"none",toneMapping:"none",outputEncoding:"srgb",opacity:"ignored"}:{doubleSideCertifiesOrientation:!1}}}:{},...v?{displayModeDiagnostic:v}:{},...this.renderStage?{declaredSceneSettings:this.actualStage}:{},observationStage:_,screenOutline:_.screenOutline||null};return{...this.snapshot,...e.overlay?{selectionObservation:{id:e.overlay.id,contentHash:e.overlay.contentHash,total:e.overlay.total,shown:e.overlay.shown,complete:e.overlay.complete}}:{},requestId:e.requestId||null,view:e.view||"iso",bounds:c,modelFront:this.evaluated.meta?.front||[0,0,1],clientBuildId:tM(),renderer:"three-r160",rendererMode:m.rendererMode,...r,camera:h,renderConfig:w,data:g}}finally{s&&dM(a,s)}}dispose(){this.disposed||(this.disposed=!0,this.selectionOverlay.dispose(),Aa(this.studio),ja(this.meshes),this.meshes=[],this.actualObservation=null,this.snapshot=null,this.evaluated=null,this.studio.dispose())}};window.__captureDone=!1;window.__captureStatus="running";window.__captureError=null;var Xp="8539b9867abdfd13f50dd0b9b0cc78f37ab1449ae5b29ea588ff68edc8483ded",Yp=n=>new URL(n,location.href);async function qp(n,e){let t=await fetch(Yp(n),{method:"POST",cache:"no-store",credentials:"omit",headers:{"content-type":"application/json"},body:JSON.stringify(e)});if(!t.ok)throw new Error("Capture "+n+" upload failed: HTTP "+t.status)}async function gM(){let n;try{let e=await fetch(Yp("job.json"),{cache:"no-store",credentials:"omit"});if(!e.ok)throw new Error("Capture job fetch failed: HTTP "+e.status);let t=await e.json(),i=t.clientBuildId??t.build;if(!Xp||i!==Xp)throw new Error("Capture worker/client build mismatch");let r=t.requests??(t.request?[t.request]:null);if(!Array.isArray(r)||r.length<1||r.length>4)throw new Error("A capture batch requires 1\u20134 requests");let s=await Zh(t.snapshot);if(!s||typeof s.assetId!="string"||!Number.isSafeInteger(s.revision)||typeof s.contentHash!="string")throw new Error("Capture job is missing snapshot identity");for(let o of r){if(!o||typeof o!="object"||Array.isArray(o))throw new Error("Capture request must be an object");Gh(o),to(o);for(let l of["assetId","revision","contentHash"])if(o[l]!==void 0&&o[l]!==s[l])throw new Error("Capture job "+l+" mismatch")}n=new Za({canvas:document.getElementById("capture")||void 0,pixelRatio:1});let a=[];for(let o of r)n.load(s,o.mode||"material",o),a.push(await n.capture(o));n.dispose(),n=null,await qp("result",{frames:a}),window.__captureStatus="complete"}catch(e){let t=String(e?.message||e).slice(0,1800);window.__captureError=t,window.__captureStatus="failed";try{await qp("error",{error:t,message:t})}catch(i){window.__captureError=t+"; "+String(i?.message||i)}}finally{try{n?.dispose()}finally{window.__captureDone=!0}}}gM();})();
/*! Bundled license information:

three/build/three.module.js:
  (**
   * @license
   * Copyright 2010-2023 Three.js Authors
   * SPDX-License-Identifier: MIT
   *)
*/
