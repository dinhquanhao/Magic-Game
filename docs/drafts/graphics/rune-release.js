import * as THREE from 'three';

const header=`uniform float uRuneFade,uRuneRadius;uniform vec3 uRuneCenter;varying vec3 vRunePoint;
float runeHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float runeKeep(){float radius=length(vRunePoint.xz)/max(.001,uRuneRadius);float noise=runeHash(floor(vRunePoint.xz*9.))*.09;float edge=mix(1.22,-.22,uRuneFade);return (1.-smoothstep(edge-.04,edge+.04,radius+noise))*(1.-smoothstep(.7,1.,uRuneFade));}
`;
function insertMainEnd(source,code){const at=source.lastIndexOf('}');if(at<0)throw new Error('Rune shader has no main body');return source.slice(0,at)+code+'\n'+source.slice(at);}
function disc(){const p=[],uv=[],ix=[],segments=96,rings=14;for(let row=0;row<=rings;row++)for(let col=0;col<=segments;col++){const r=row/rings,a=col/segments*Math.PI*2;p.push(Math.cos(a)*r,0,Math.sin(a)*r);uv.push(Math.cos(a)*r,Math.sin(a)*r);}for(let row=0;row<rings;row++)for(let col=0;col<segments;col++){const a=row*(segments+1)+col,b=a+segments+1;ix.push(a,b,a+1,a+1,b,b+1);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ix);return g;}
const groundFragment=`
uniform float uProgress,uTime,uFade,uEnergy,uElement,uReduced;uniform vec3 uColor;varying vec2 vP;
float band(float d,float w){return 1.-smoothstep(w,w*2.,abs(d));}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){
 vec2 p=vP;float r=length(p);if(r>1.)discard;
 float a=atan(p.y,p.x)+uTime*.025,turn=fract(a/6.2831853+.5),reveal=smoothstep(turn-.025,turn+.025,uProgress);
 float rings=band(r-.88,.004)+band(r-.81,.003)+band(r-.56,.004)+band(r-.29,.003);
 vec2 q=vec2(fract(turn*24.)-.5,(r-.68)*9.);float motif=0.;
 if(uElement<.5)motif=band(abs(q.x)-(.18-.1*sin(q.y*8.)),.025)*(1.-smoothstep(.2,.8,abs(q.y)));
 else if(uElement<1.5)motif=band(q.y-sin(q.x*11.)*.2,.035)+band(length(q*vec2(2.,1.))-.2,.035);
 else if(uElement<2.5)motif=band(abs(q.x)+abs(q.y)*.7-.35,.035)+band(q.y,.025)*.3;
 else if(uElement<3.5)motif=band(q.x,.022)+band(q.y,.022)+band(abs(q.x)-abs(q.y),.025)*.6;
 else if(uElement<4.5)motif=band(q.x-sin(q.y*13.)*.12,.03)*(1.-smoothstep(.2,.8,abs(q.y)));
 else if(uElement<5.5)motif=band(q.y-sin(q.x*8.+uTime*.3)*.14,.03);
 else if(uElement<6.5)motif=band(q.x-(fract(q.y*3.)-.5)*.32,.035);
 else if(uElement<7.5)motif=band(abs(q.x)*.86+abs(q.y)*.5-.27,.025)+band(q.x,.02)*.5;
 else if(uElement<8.5)motif=band(q.y-sin(q.x*21.)*.1,.04)*(1.-smoothstep(.3,.7,abs(q.x)));
 else if(uElement<9.5)motif=band(length(q*vec2(1.8,1.))-.25,.035)+band(length((q-vec2(.13,.32))*2.)-.1,.025);
 else if(uElement<10.5)motif=band(length(q)-(.25+.06*sin(atan(q.y,q.x)*3.+uTime*.2)),.03);
 else if(uElement<11.5)motif=band(length(q)-.3,.025)+band(q.x,.022)*step(0.,q.y)+band(q.y,.025)*step(q.x,0.);
 else if(uElement<12.5)motif=band(length((q+vec2(.12,.18))*vec2(2.,1.))-.2,.03)+band(length((q-vec2(.12,.18))*vec2(2.,1.))-.2,.03);
 else if(uElement<13.5)motif=band(abs(q.x)+abs(q.y)-.27,.025)+band(q.x,.02)*.5;
 else{float leaf=1.-length(vec2(q.x*3.,q.y*1.7));motif=pow(max(0.,leaf),2.)+band(q.y-sin(q.x*8.)*.13,.025);}
 motif*=smoothstep(.56,.59,r)*(1.-smoothstep(.77,.8,r));
 float spokes=band(fract(turn*16.)-.5,.022)*smoothstep(.31,.35,r)*(1.-smoothstep(.48,.52,r));
 float detail=clamp(rings*.7+motif*.6+spokes*.55,0.,1.)*reveal;
 float edge=mix(1.22,-.22,uFade),noise=hash(floor(p*180.))*.08,keep=(1.-smoothstep(edge-.03,edge+.03,r+noise))*(1.-smoothstep(.7,1.,uFade));
 float rim=band(r+noise-edge,.008)*step(.001,uFade),pulse=exp(-pow((r-uTime*2.8)/.065,2.))*step(0.,uTime)*(1.-smoothstep(.15,.42,uTime))*(1.-uReduced*.7);
 vec3 normal=normalize(vec3(-dFdx(detail)*.35,1.,-dFdy(detail)*.35));float lit=.5+.5*dot(normal,normalize(vec3(.3,1.,.4)));
 vec3 color=uColor*(.4+detail*.8)*lit+vec3(.1,.09,.045)*(rim+pulse*.35);color*=uEnergy;
 float alpha=(detail*.75+rim*.08+pulse*.12)*keep;if(alpha<.004)discard;gl_FragColor=vec4(clamp(color,vec3(0.),vec3(1.65)),alpha);
}`;

export function createRuneRelease({parent,tower,transfer,color,elementIndex,radius,quality,disposeTree}){
 const worldCenter=parent.getWorldPosition(new THREE.Vector3()),fadeUniform={value:0},radiusUniform={value:Math.max(14,radius)};
 const towerObjects=[tower,transfer],runeLights=[];
 for(const root of towerObjects)root.traverse(object=>{
  if(object.isLight){runeLights.push(object);return;}
  const materials=Array.isArray(object.material)?object.material:[object.material];
  for(const material of materials){
   if(!material||material.userData.runeReleaseBound)continue;material.userData.runeReleaseBound=true;
   const before=material.onBeforeCompile,cache=material.customProgramCacheKey.bind(material);
   material.onBeforeCompile=(shader,renderer)=>{
    before.call(material,shader,renderer);Object.assign(shader.uniforms,{uRuneFade:fadeUniform,uRuneRadius:radiusUniform,uRuneCenter:{value:worldCenter}});
    shader.vertexShader='uniform vec3 uRuneCenter;varying vec3 vRunePoint;\n'+insertMainEnd(shader.vertexShader,'vRunePoint=(modelMatrix*vec4(position,1.)).xyz-uRuneCenter;');
    shader.fragmentShader=header+insertMainEnd(shader.fragmentShader,'float arcRuneKeep=runeKeep();gl_FragColor.rgb*=1.-.78*smoothstep(0.,.58,uRuneFade);gl_FragColor.a*=arcRuneKeep;if(gl_FragColor.a<.004)discard;');
   };
   material.customProgramCacheKey=()=>cache()+'-rune-release-v1';material.needsUpdate=true;
  }
 });
 const group=new THREE.Group();group.name='RuneGround';parent.add(group);
 const uniforms={uProgress:{value:0},uTime:{value:-1},uFade:{value:0},uEnergy:{value:1},uElement:{value:elementIndex},uReduced:{value:0},uColor:{value:new THREE.Color(color)},uRadius:{value:Math.max(4,radius)}};
 const ground=new THREE.Mesh(disc(),new THREE.ShaderMaterial({uniforms,vertexShader:'uniform float uRadius;varying vec2 vP;void main(){vP=uv;vec3 p=position*uRadius;p.y=.027;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}',fragmentShader:groundFragment,transparent:true,depthWrite:false,side:THREE.DoubleSide}));ground.renderOrder=2;group.add(ground);
 const maxDust=480,seeds=new Float32Array(maxDust),positions=new Float32Array(maxDust*3);
 for(let i=0;i<maxDust;i++){const seed=((i+1)*.61803398875)%1,a=i*2.399963,r=Math.sqrt(((i+17)*.754877666)%1)*radius*.9;seeds[i]=seed;positions.set([Math.cos(a)*r,.03,Math.sin(a)*r],i*3);}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('aSeed',new THREE.BufferAttribute(seeds,1));
 const dust=new THREE.Points(geometry,new THREE.ShaderMaterial({uniforms,vertexShader:'attribute float aSeed;uniform float uTime,uFade,uEnergy,uProgress,uReduced;varying float vAlpha;void main(){float t=mod(max(0.,uTime)+aSeed*2.,2.);vec3 p=position;p.y+=t*(.24+aSeed*.4)*(1.-uReduced*.7);p.xz+=vec2(sin(aSeed*31.),cos(aSeed*19.))*t*.12;vAlpha=uEnergy*uProgress*sin(t*1.570796)*.24;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp((1.7+aSeed)*80./max(3.,-mv.z),1.,5.);}',fragmentShader:'uniform vec3 uColor;varying float vAlpha;void main(){float a=(1.-smoothstep(.1,.5,length(gl_PointCoord-.5)))*vAlpha;if(a<.004)discard;gl_FragColor=vec4(uColor*.8,a);}',transparent:true,depthWrite:false}));dust.frustumCulled=false;group.add(dust);
 let disposed=false,energy=0;const lightColor=new THREE.Color(color),mixedColor=new THREE.Color(),mixedPosition=new THREE.Vector3();
 function setQuality(q){geometry.setDrawRange(0,{Low:120,Medium:220,High:360,Ultra:480}[q]||360);}
 function dispose(){if(disposed)return;disposed=true;energy=0;for(const root of [...towerObjects,group]){disposeTree(root);root.removeFromParent();root.clear();root.userData={};}}
 setQuality(quality);
 return {group,setQuality,dispose,
  update(sequence,{time=0,intensity=1,visible=true,reducedMotion=false}={}){
   if(disposed)return;fadeUniform.value=sequence.fade;uniforms.uFade.value=sequence.fade;uniforms.uProgress.value=sequence.progress;uniforms.uTime.value=sequence.skillEnabled?time:-1+Math.max(0,time);uniforms.uEnergy.value=sequence.emissive*(1+sequence.pulse);uniforms.uReduced.value=reducedMotion?1:0;group.visible=visible;energy=visible?sequence.energy*intensity:0;
   for(const light of runeLights)light.intensity=visible?Math.min(2,light.intensity)*sequence.energy:0;
   if(sequence.disposed)dispose();
  },
  light(skillSource=null){
   const runePower=energy*3.5,skillPower=skillSource?.intensity||0,total=runePower+skillPower;if(total<.001)return [];
   mixedColor.copy(lightColor).multiplyScalar(runePower);if(skillSource)mixedColor.addScaledVector?mixedColor.addScaledVector(skillSource.color,skillPower):mixedColor.add(skillSource.color.clone().multiplyScalar(skillPower));mixedColor.multiplyScalar(1/total);
   mixedPosition.copy(worldCenter).add(new THREE.Vector3(0,.6,0)).multiplyScalar(runePower);if(skillSource)mixedPosition.addScaledVector(skillSource.position,skillPower);mixedPosition.multiplyScalar(1/total);
   return [{position:mixedPosition,color:mixedColor,intensity:total,radius:Math.max(radius,skillSource?.radius||radius)}];
  },
  diagnostics(){return {disposed,energy,fade:fadeUniform.value,groundVisible:group.visible&&!disposed,objects:group.children.length};}
 };
}
