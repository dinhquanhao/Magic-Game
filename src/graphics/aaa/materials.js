import * as THREE from 'three';
export const MATERIAL_PROFILES={
 stone:{color:0x706b60,rough:.83,metal:0,scale:.33,height:.08},soil:{color:0x594638,rough:.96,metal:0,scale:.22,height:.06},sand:{color:0xb2a17c,rough:.87,metal:0,scale:.4,height:.025},grass:{color:0x536444,rough:.94,metal:0,scale:.27,height:.03},wood:{color:0x725340,rough:.74,metal:0,scale:.45,height:.04},metal:{color:0x8e949c,rough:.32,metal:1,scale:.7,height:.015},cloth:{color:0x343d4c,rough:.96,metal:0,scale:2,height:.008},leather:{color:0x514235,rough:.62,metal:0,scale:1.2,height:.018},armor:{color:0x777f88,rough:.4,metal:.95,scale:.7,height:.018},glass:{color:0xc5d5d8,rough:.08,metal:0,scale:.8,height:.002},ice:{color:0x9ac4d4,rough:.16,metal:0,scale:.5,height:.012},water:{color:0x527d86,rough:.09,metal:0,scale:.3,height:.009},organic:{color:0xa77b64,rough:.68,metal:0,scale:1.4,height:.008},
};
const hash=(x,y,seed)=>{let n=Math.imul(x^seed,374761393)^Math.imul(y,668265263);n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967295;};
function noise(x,y,seed){const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,a=fx*fx*(3-2*fx),b=fy*fy*(3-2*fy);return THREE.MathUtils.lerp(THREE.MathUtils.lerp(hash(ix,iy,seed),hash(ix+1,iy,seed),a),THREE.MathUtils.lerp(hash(ix,iy+1,seed),hash(ix+1,iy+1,seed),a),b);}
export function generateMaterialMaps(kind,size=128){
 const profile=MATERIAL_PROFILES[kind]||MATERIAL_PROFILES.stone,seed=101+Object.keys(MATERIAL_PROFILES).indexOf(kind)*331,color=new THREE.Color(profile.color),height=new Float32Array(size*size),albedo=new Uint8Array(size*size*4),packed=new Uint8Array(size*size*4),normals=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=x/size,v=y/size,n=.5*noise(u*5,v*5,seed)+.3*noise(u*17,v*17,seed+1)+.2*noise(u*61,v*61,seed+2);let h=n;
  if(kind==='cloth')h=.5+.23*Math.sin(u*Math.PI*64)*Math.sin(v*Math.PI*64)+n*.08;
  if(kind==='wood')h=.5+.3*Math.sin(u*55+n*7)+n*.1;
  if(['metal','armor'].includes(kind))h=.5+n*.2+.08*Math.sin(u*190+noise(u*3,v*3,seed)*8);
  if(kind==='organic')h=.5+n*.17-Math.max(0,hash(x,y,seed)-.9)*1.2;
  height[y*size+x]=h;
  const i=(y*size+x)*4,macro=.8+n*.35;
  albedo[i]=Math.min(255,Math.round(color.r*255*macro));albedo[i+1]=Math.min(255,Math.round(color.g*255*macro));albedo[i+2]=Math.min(255,Math.round(color.b*255*macro));albedo[i+3]=Math.round(255*(.7+.3*h));
  packed[i]=Math.round(255*THREE.MathUtils.clamp(profile.rough+(n-.5)*.2,.04,1));packed[i+1]=Math.round(profile.metal*255);packed[i+2]=Math.round(h*255);packed[i+3]=0;
 }
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const get=(a,b)=>height[((b+size)%size)*size+(a+size)%size],dx=(get(x+1,y)-get(x-1,y))*1.8,dy=(get(x,y+1)-get(x,y-1))*1.8,n=new THREE.Vector3(-dx,-dy,1).normalize(),i=(y*size+x)*4;
  normals[i]=Math.round((n.x*.5+.5)*255);normals[i+1]=Math.round((n.y*.5+.5)*255);normals[i+2]=Math.round((n.z*.5+.5)*255);normals[i+3]=255;
 }
 return {albedo,packed,normals,height,size};
}
const DECLARATIONS=`
uniform sampler2D uAaaAlbedo;uniform sampler2D uAaaPacked;uniform sampler2D uAaaNormal;
uniform vec4 uAaaMaterial;uniform float uAaaDetail;uniform float uAaaKind;
varying vec3 vAaaWorld;
vec4 aaaProjection(sampler2D image,vec2 uv){vec4 a=texture2D(image,uv);vec2 rotated=mat2(.745,-.667,.667,.745)*uv*.731+vec2(.317,.619);vec4 b=texture2D(image,rotated);float blend=.5+.35*sin(uv.x*.37+sin(uv.y*.41));return mix(a,b,blend);}
vec4 aaaTriplanar(sampler2D image,vec3 p,vec3 n){vec3 w=pow(abs(n),vec3(4.));w/=max(.001,w.x+w.y+w.z);return aaaProjection(image,p.zy)*w.x+aaaProjection(image,p.xz)*w.y+aaaProjection(image,p.xy)*w.z;}
float aaaMicro(vec3 p){return sin(p.x*83.7+sin(p.y*21.))*sin(p.z*79.1+p.y*19.);}
`;
export function createMaterialLibrary(renderer){
 const resources=new Map(),patched=new Set(),owned=new Set();let quality='High',disposed=false;
 const detail={value:1};
 function maps(kind){const size=quality==='Low'?64:quality==='Medium'?128:256,key=kind+size;if(resources.has(key))return resources.get(key);const data=generateMaterialMaps(kind,size),textures={};
  for(const [name,bytes]of [['albedo',data.albedo],['packed',data.packed],['normal',data.normals]]){const texture=new THREE.DataTexture(bytes,size,size);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.generateMipmaps=true;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;texture.anisotropy=Math.min(quality==='Low'?2:8,renderer.capabilities.getMaxAnisotropy());texture.needsUpdate=true;textures[name]=texture;}
  resources.set(key,textures);return textures;
 }
 function apply(material,kind='stone',terrain=false){
  if(disposed||!material?.isMeshStandardMaterial||patched.has(material))return material;
  if(!MATERIAL_PROFILES[kind])kind='stone';patched.add(material);const profile=MATERIAL_PROFILES[kind],textures=maps(kind),previous=material.onBeforeCompile,previousKey=material.customProgramCacheKey.bind(material);
  const uniforms={uAaaAlbedo:{value:textures.albedo},uAaaPacked:{value:textures.packed},uAaaNormal:{value:textures.normal},uAaaMaterial:{value:new THREE.Vector4(profile.scale,profile.height,terrain?1:0,kind==='organic'?1:kind==='cloth'?2:kind==='metal'||kind==='armor'?3:0)},uAaaKind:{value:Object.keys(MATERIAL_PROFILES).indexOf(kind)},uAaaDetail:detail};
  const forget=()=>{patched.delete(material);owned.delete(material);material.removeEventListener('dispose',forget);};material.addEventListener('dispose',forget);
  material.userData.aaa={kind,uniforms};material.onBeforeCompile=shader=>{
   previous.call(material,shader);Object.assign(shader.uniforms,uniforms);
   shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vAaaWorld;').replace('#include <project_vertex>',`#include <project_vertex>
vec4 aaaWorld=modelMatrix*vec4(transformed,1.);
#ifdef USE_INSTANCING
aaaWorld=modelMatrix*instanceMatrix*vec4(transformed,1.);
#endif
vAaaWorld=aaaWorld.xyz;`);
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\n'+DECLARATIONS)
   .replace('#include <color_fragment>',`#include <color_fragment>
vec3 aaaNormalWorld=normalize(cross(dFdx(vAaaWorld),dFdy(vAaaWorld))+vec3(.0000001));
vec3 aaaPosition=vAaaWorld*uAaaMaterial.x;
// Fixed-bound parallax on nearly horizontal close surfaces only.
if(uAaaDetail>1.5&&abs(aaaNormalWorld.y)>.7&&length(vViewPosition)<18.){vec3 viewWorld=normalize(cameraPosition-vAaaWorld);vec2 stepUV=viewWorld.xz/max(.3,abs(viewWorld.y))*uAaaMaterial.y*.125;float depth=0.;for(int aaaStep=0;aaaStep<8;aaaStep++){float mapHeight=texture2D(uAaaPacked,aaaPosition.xz).b;if(depth>=mapHeight)break;aaaPosition.xz-=stepUV;depth+=.125;}}
vec4 aaaBase=aaaTriplanar(uAaaAlbedo,aaaPosition,aaaNormalWorld);vec4 aaaProperties=aaaTriplanar(uAaaPacked,aaaPosition,aaaNormalWorld);
float aaaHeight=aaaProperties.b+aaaMicro(vAaaWorld)*.018*uAaaDetail/(1.+length(vViewPosition)*.15);
float aaaMacro=.9+.1*sin(vAaaWorld.x*.037+sin(vAaaWorld.z*.043));
vec3 aaaColor=aaaBase.rgb*aaaMacro;
if(uAaaMaterial.z>.5){float slope=1.-abs(aaaNormalWorld.y),low=1.-smoothstep(-.5,3.,vAaaWorld.y);float rock=smoothstep(.15,.55,slope+aaaHeight*.2),grass=smoothstep(.1,.8,aaaHeight+.1)*(1.-rock)*(1.-low*.65);aaaColor=mix(aaaColor*vec3(.87,.79,.65),aaaColor*vec3(.6,.85,.53),grass);aaaColor=mix(aaaColor,aaaColor*vec3(.65,.69,.73),rock);}
diffuseColor.rgb=mix(diffuseColor.rgb,aaaColor,.64)*mix(.82,1.,aaaBase.a);`)
   .replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
roughnessFactor=mix(roughnessFactor,aaaProperties.r,.75);`)
   .replace('#include <metalnessmap_fragment>',`#include <metalnessmap_fragment>
metalnessFactor=mix(metalnessFactor,aaaProperties.g,.8);`)
   .replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
vec3 aaaDx=dFdx(-vViewPosition),aaaDy=dFdy(-vViewPosition),aaaR1=cross(aaaDy,normal),aaaR2=cross(normal,aaaDx);float aaaDet=dot(aaaDx,aaaR1);
vec3 aaaGradient=sign(aaaDet)*(dFdx(aaaHeight)*aaaR1+dFdy(aaaHeight)*aaaR2);
normal=normalize(abs(aaaDet)*normal-aaaGradient*uAaaMaterial.y*(1.+uAaaDetail));
vec3 aaaNormalMap=aaaTriplanar(uAaaNormal,aaaPosition,aaaNormalWorld).xyz*2.-1.;normal=normalize(normal+vec3(aaaNormalMap.xy,0.)*.04*uAaaDetail);`)
   .replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
float aaaRim=pow(1.-abs(dot(normal,normalize(vViewPosition))),2.5);
if(uAaaMaterial.w>.5&&uAaaMaterial.w<1.5){float thickness=.35+.35*aaaHeight;vec3 skinWrap=vec3(.25,.065,.035)*aaaRim*thickness;reflectedLight.indirectDiffuse+=diffuseColor.rgb*skinWrap;reflectedLight.indirectSpecular+=vec3(.018)*pow(max(0.,dot(normal,normalize(vViewPosition))),28.);}
if(uAaaMaterial.w>1.5&&uAaaMaterial.w<2.5)reflectedLight.indirectDiffuse+=diffuseColor.rgb*aaaRim*.12;
if(uAaaMaterial.w>2.5)reflectedLight.indirectSpecular+=diffuseColor.rgb*pow(aaaRim,2.)*aaaHeight*.025;`);
  };
  material.customProgramCacheKey=()=>previousKey()+'-aaa-'+kind+(terrain?'-terrain':'');material.needsUpdate=true;return material;
 }
 function create(kind,options={}){const p=MATERIAL_PROFILES[kind]||MATERIAL_PROFILES.stone,m=new THREE.MeshPhysicalMaterial({color:p.color,metalness:p.metal,roughness:p.rough,...(['glass','ice','water'].includes(kind)?{transmission:kind==='glass'?.7:.25,ior:kind==='glass'?1.5:1.31,thickness:.3,transparent:true,opacity:.9}:{}),...(kind==='cloth'?{sheen:.45,sheenRoughness:.8,sheenColor:0x62738b}:{}),...options});owned.add(m);return apply(m,kind);}
 return {apply,create,maps,
  setQuality(q){quality=q;detail.value=q==='Low'?0:q==='Medium'?.5:q==='High'?2:3;for(const m of patched){const r=m.userData.aaa,t=maps(r.kind);r.uniforms.uAaaAlbedo.value=t.albedo;r.uniforms.uAaaPacked.value=t.packed;r.uniforms.uAaaNormal.value=t.normal;}},
  diagnostics(){return {materials:patched.size,textureSets:resources.size,textureBytes:[...resources.values()].reduce((s,t)=>s+Object.values(t).reduce((n,v)=>n+v.image.data.byteLength*4/3,0),0),quality};},
  dispose(){disposed=true;for(const t of resources.values())Object.values(t).forEach(t=>t.dispose());resources.clear();for(const m of owned)m.dispose();owned.clear();patched.clear();},
 };
}
