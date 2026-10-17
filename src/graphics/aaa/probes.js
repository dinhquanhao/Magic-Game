import * as THREE from 'three';
const NX=12,NY=6,NZ=12,COEFFICIENTS=9;
const basis=(x,y,z)=>[.282095,.488603*y,.488603*z,.488603*x,1.092548*x*y,1.092548*y*z,.315392*(3*z*z-1),1.092548*x*z,.546274*(x*x-y*y)];
export function createProbeGrid(fieldUniforms){
 const data=new Uint8Array(NX*NY*NZ*COEFFICIENTS*4);data.fill(128);
 const texture=new THREE.Data3DTexture(data,NX,NY,NZ*COEFFICIENTS);texture.minFilter=texture.magFilter=THREE.LinearFilter;texture.unpackAlignment=1;texture.needsUpdate=true;
 const enabled={value:1},tracked=new Set();let quality='High',slice=0,lastLightCount=0,updates=0,lastCost=0;
 const coefficients=new Float64Array(27),sourceBasis=new Float64Array(9);
 function update(){const start=performance.now(),count=fieldUniforms.uArcLightCount.value;
  if(count===0){if(lastLightCount){data.fill(128);texture.needsUpdate=true;}lastLightCount=0;return;}
  lastLightCount=count;if(quality==='Low')return;
  const y=slice;for(let z=0;z<NZ;z++)for(let x=0;x<NX;x++){
   const wx=-96+x/(NX-1)*192,wy=y/(NY-1)*48,wz=-96+z/(NZ-1)*192;coefficients.fill(0);
   for(let light=0;light<count;light++){
    const p=fieldUniforms.uArcLightPositionRadius.value[light],c=fieldUniforms.uArcLightColorIntensity.value[light],dx=p.x-wx,dy=p.y-wy,dz=p.z-wz,d=Math.max(.001,Math.hypot(dx,dy,dz));
    const reach=Math.max(1,p.w),fade=Math.max(0,1-d/reach),energy=Math.min(24,c.w)*fade*fade*.045;if(energy<=0)continue;
    const sh=basis(dx/d,dy/d,dz/d);
    for(let k=0;k<9;k++){const lambert=k===0?Math.PI:k<4?2*Math.PI/3:Math.PI/4;for(let channel=0;channel<3;channel++)coefficients[k*3+channel]+=[c.x,c.y,c.z][channel]*energy*sh[k]*lambert;}
   }
   for(let k=0;k<9;k++){const base=(((k*NZ+z)*NY+y)*NX+x)*4;for(let ch=0;ch<3;ch++)data[base+ch]=Math.round(THREE.MathUtils.clamp(coefficients[k*3+ch]/.7*.5+.5,0,1)*255);data[base+3]=255;}
  }
  texture.needsUpdate=true;slice=(slice+1)%NY;updates++;lastCost=performance.now()-start;
 }
 function attach(material){if(!material?.isMeshStandardMaterial||tracked.has(material))return;tracked.add(material);const previous=material.onBeforeCompile,key=material.customProgramCacheKey.bind(material);
  material.onBeforeCompile=shader=>{previous.call(material,shader);Object.assign(shader.uniforms,{uAaaProbe:{value:texture},uAaaProbeEnabled:enabled});
   shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vAaaProbeWorld;').replace('#include <project_vertex>',`#include <project_vertex>
vec4 aaaProbeWorld=modelMatrix*vec4(transformed,1.);
#ifdef USE_INSTANCING
aaaProbeWorld=modelMatrix*instanceMatrix*vec4(transformed,1.);
#endif
vAaaProbeWorld=aaaProbeWorld.xyz;`);
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
uniform highp sampler3D uAaaProbe;uniform float uAaaProbeEnabled;varying vec3 vAaaProbeWorld;
vec3 aaaReadSH(float index,vec3 p){vec3 uv=vec3(clamp((p.x+96.)/192.,.5/12.,11.5/12.),clamp(p.y/48.,.5/6.,5.5/6.),(clamp((p.z+96.)/192.,.5/12.,11.5/12.)+index)/9.);return (texture(uAaaProbe,uv).rgb-vec3(128./255.))*1.4;}
vec3 aaaIrradiance(vec3 p,vec3 n){vec3 result=aaaReadSH(0.,p)*.282095;result+=aaaReadSH(1.,p)*(.488603*n.y);result+=aaaReadSH(2.,p)*(.488603*n.z);result+=aaaReadSH(3.,p)*(.488603*n.x);result+=aaaReadSH(4.,p)*(1.092548*n.x*n.y);result+=aaaReadSH(5.,p)*(1.092548*n.y*n.z);result+=aaaReadSH(6.,p)*(.315392*(3.*n.z*n.z-1.));result+=aaaReadSH(7.,p)*(1.092548*n.x*n.z);result+=aaaReadSH(8.,p)*(.546274*(n.x*n.x-n.y*n.y));return clamp(result,vec3(0.),vec3(.3));}`)
   .replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
if(uAaaProbeEnabled>.5){vec3 aaaProbeNormal=inverseTransformDirection(normal,viewMatrix);reflectedLight.indirectDiffuse+=diffuseColor.rgb*aaaIrradiance(vAaaProbeWorld,aaaProbeNormal);}`);
  };material.customProgramCacheKey=()=>key()+'-aaa-sh9';material.needsUpdate=true;
  const forget=()=>{tracked.delete(material);material.removeEventListener('dispose',forget);};material.addEventListener('dispose',forget);
 }
 return {update,attach,setQuality(q){quality=q;enabled.value=q==='Low'?0:1;},reset(){data.fill(128);texture.needsUpdate=true;lastLightCount=0;},diagnostics(){return {grid:[NX,NY,NZ],coefficients:9,bytes:data.byteLength,updates,updateCostMs:lastCost,quality,enabled:enabled.value===1};},dispose(){texture.dispose();tracked.clear();}};
}
