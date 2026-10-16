export function createElementSurfaceMaterial(THREE, elementIndex, hex) {
  const kind = elementIndex === 8 ? 0 : elementIndex === 13 ? 1 : 2;
  const uniforms = {
    uArcElementTime: { value: 0 },
    uArcElementIntensity: { value: 1 },
    uArcElementTint: { value: new THREE.Color(hex) },
    uArcElementKind: { value: kind }
  };
  const material = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: kind === 0 ? 0.42 : kind === 1 ? 0.28 : 0.18,
    roughness: kind === 0 ? 0.58 : kind === 1 ? 0.32 : 0.24,
    clearcoat: kind === 0 ? 0.2 : 0.72,
    clearcoatRoughness: 0.24,
    transparent: true,
    opacity: 0.86,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  material.userData.elementUniforms = uniforms;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
uniform float uArcElementTime;
varying vec3 vArcElementLocal;
varying vec3 vArcElementNormal;
varying vec3 vArcElementView;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
float arcElementVertexPulse=sin(position.y*4.1+uArcElementTime*.72)*.5+.5;
transformed+=normal*(arcElementVertexPulse-.5)*.012;
vArcElementLocal=position;`)
      .replace('#include <project_vertex>', `#include <project_vertex>
vArcElementNormal=normalize(normalMatrix*normal);
vArcElementView=normalize(-mvPosition.xyz);`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float uArcElementTime;
uniform float uArcElementIntensity;
uniform vec3 uArcElementTint;
uniform float uArcElementKind;
varying vec3 vArcElementLocal;
varying vec3 vArcElementNormal;
varying vec3 vArcElementView;
float arcElementHash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float arcElementNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(arcElementHash(i),arcElementHash(i+vec3(1,0,0)),f.x),mix(arcElementHash(i+vec3(0,1,0)),arcElementHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(arcElementHash(i+vec3(0,0,1)),arcElementHash(i+vec3(1,0,1)),f.x),mix(arcElementHash(i+vec3(0,1,1)),arcElementHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float arcElementFbm(vec3 p){float v=0.,a=.55;for(int i=0;i<4;i++){v+=arcElementNoise(p)*a;p=p*2.03+vec3(7.1,3.7,5.3);a*=.48;}return v;}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
vec3 arcEP=vArcElementLocal;
float arcEN=arcElementFbm(arcEP*3.2+vec3(0.,uArcElementTime*.08,0.));
float arcEF=pow(1.-abs(dot(normalize(vArcElementNormal),normalize(vArcElementView))),2.25);
vec3 arcEBase=vec3(.055,.025,.018);
if(uArcElementKind<.5){
 float arcFlow=arcElementFbm(arcEP*2.4+vec3(0.,-uArcElementTime*.18,0.));
 float arcCracks=1.-smoothstep(.015,.13,abs(sin((arcEP.x+arcEN*.11)*4.1)*sin((arcEP.y-arcEN*.08)*4.7)*sin((arcEP.z+arcEN*.1)*4.3)));
 float arcHot=clamp(arcCracks*(.34+arcFlow*.9)*uArcElementIntensity,0.,1.);
 arcEBase=mix(vec3(.018,.012,.01),vec3(.18,.045,.014),arcFlow*.62);
 arcEBase=mix(arcEBase,vec3(1.,.19,.025),arcHot*.72);
}else if(uArcElementKind<1.5){
 float arcNebula=arcElementFbm(arcEP*2.6+vec3(uArcElementTime*.025,0.,-uArcElementTime*.018));
 float arcStar=pow(arcElementHash(floor(arcEP*19.)),26.);
 arcEBase=mix(vec3(.012,.018,.09),vec3(.16,.075,.42),arcNebula);
 arcEBase=mix(arcEBase,vec3(.16,.72,1.),arcNebula*.38+arcStar*.72+arcEF*.34);
}else{
 float arcThought=.5+.5*sin(length(arcEP.xy)*13.-uArcElementTime*2.2+arcEN*5.);
 float arcPrism=.5+.5*sin(arcEP.z*7.+uArcElementTime*.6+arcEN*4.);
 arcEBase=mix(vec3(.035,.025,.16),vec3(.21,.12,.58),arcThought*.72);
 arcEBase=mix(arcEBase,vec3(.3,.72,1.),arcPrism*arcEF*.52+arcThought*.2);
}
arcEBase*=mix(vec3(1.),max(uArcElementTint,vec3(.25)),.28);
diffuseColor.rgb=mix(diffuseColor.rgb,arcEBase,clamp(.74+arcEN*.18,0.,.96));`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
roughnessFactor=mix(roughnessFactor,uArcElementKind<.5?.72:.24,clamp(.28+arcEN*.2,0.,.56));`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
if(uArcElementKind<.5){float arcCrackEmission=1.-smoothstep(.015,.13,abs(sin((arcEP.x+arcEN*.11)*4.1)*sin((arcEP.y-arcEN*.08)*4.7)*sin((arcEP.z+arcEN*.1)*4.3)));totalEmissiveRadiance+=vec3(1.,.16,.018)*arcCrackEmission*uArcElementIntensity*.42;}
else if(uArcElementKind<1.5){float arcStarEmission=pow(arcElementHash(floor(arcEP*19.)),24.);totalEmissiveRadiance+=vec3(.16,.54,1.)*(arcStarEmission+arcEN*.12+arcEF*.16)*uArcElementIntensity*.46;}
else{float arcMindWave=.5+.5*sin(length(arcEP.xy)*13.-uArcElementTime*2.2+arcEN*5.);totalEmissiveRadiance+=vec3(.24,.42,1.)*(arcMindWave*.18+arcEF*.22)*uArcElementIntensity*.36;}`);
    material.userData.elementShader = shader;
  };
  material.customProgramCacheKey = () => `arcane-element-surface-${kind}-v1`;
  material.userData.setElementTime = (time, intensity = 1) => {
    uniforms.uArcElementTime.value = time;
    uniforms.uArcElementIntensity.value = intensity;
  };
  return material;
}
