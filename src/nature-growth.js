import * as THREE from 'three';
import {getSkillAreaRadius} from './skill-area.js';
import {natureGeometry,natureDisc,natureHash,NATURE_VARIANTS} from './nature-geometry.js';

export const NATURE_BUDGETS={Low:{trees:36,particles:800,leaves:180},Medium:{trees:60,particles:1600,leaves:360},High:{trees:96,particles:3000,leaves:720},Ultra:{trees:144,particles:5000,leaves:1200}};
const common=`
uniform float uTime,uIntensity,uRadius,uReduced,uPlay,uGrow,uCastClock;uniform vec4 uWind;uniform vec3 uPlayer;uniform vec4 uTargets[8];
float safeLife(){return 1.-smoothstep(13.4,18.,uTime);}
float hash1(float x){return fract(sin(x*127.1+311.7)*43758.5453);}
vec3 safeDir(vec3 p){return p/max(.0001,length(p));}
float elastic(float age){float x=max(0.,age);return clamp((1.-exp(-x*4.5))*(1.+.11*sin(x*9.)*exp(-x*2.2)),0.,1.12);}
`;
const vertex=common+`
attribute vec4 iOrigin,iData;attribute float aPart;uniform float uMode;
varying vec3 vWorld,vNormal,vLocal;varying vec2 vUV;varying float vPart,vLife,vSeed;
void main(){
 float seed=iData.x,age=(uTime-iOrigin.z)*uGrow,life=safeLife()*step(0.,age),grow=elastic(age)*life;
 vec3 p=position,n=normal;float h=max(0.,p.y),size=iOrigin.w;
 int targetIndex=int(clamp(iData.z,0.,7.));vec4 target=uTargets[targetIndex];vec3 base=vec3(iOrigin.x,0.,iOrigin.y);
 vec3 delta=target.xyz-base;vec3 aim=safeDir(vec3(delta.x,0.,delta.z));float aimed=step(0.,iData.z)*target.w;
 float clock=max(0.,uTime-5.1-iData.w),phase=mod(clock,2.65),attackWindow=step(5.1+iData.w,uTime)*(1.-smoothstep(12.2,13.3,uTime))*aimed;
 if(uMode<.5){
  p.xz*=sqrt(max(0.,grow));p.y*=clamp(grow*1.4-h*.4,0.,1.15);
  float angle=iData.y;vec2 rotated=mat2(cos(angle),-sin(angle),sin(angle),cos(angle))*p.xz;p.xz=rotated;n.xz=mat2(cos(angle),-sin(angle),sin(angle),cos(angle))*n.xz;
  float swing=sin(clamp(phase/.55,0.,1.)*3.141593)*attackWindow;
  p.xz+=aim.xz*swing*h*h*.24;
  vec2 wind=vec2(uWind.x,uWind.y)*(.25+uWind.z);
  p.xz+=wind*sin(uTime*1.7+h*3.+seed)*h*h*.045*(1.-uReduced*.75);
  if(aPart>.5)p+=vec3(sin(seed+uTime*3.),sin(seed*3.+uTime*2.),cos(seed+uTime*2.3))*.012*(1.-uReduced*.7);
  p=p*size+base;
 }else if(uMode<1.5){
  float along=clamp(position.x,0.,1.),reach=clamp(phase/.75,0.,1.);life*=attackWindow*step(along,reach)*step(phase,1.9);
  float coil=smoothstep(.72,1.,along),theta=(along-.72)*55.+seed;
  p=base+vec3(delta.x,0.,delta.z)*along;
  p.xz+=vec2(-aim.z,aim.x)*(sin(along*13.+seed)*.2+position.z);
  p.xz+=vec2(cos(theta),sin(theta))*.45*coil;p.y=.1+position.y+coil*(along-.72)*3.9;
 }else if(uMode<2.5){
  float spikeAge=mod(max(0.,uTime-5.7-iData.w-length(delta.xz)*.018),2.65),burst=sin(clamp(spikeAge/.6,0.,1.)*3.141593);
  p=vec3(position.x*(.8+seed*.5),position.y*(1.5+seed*2.)*max(0.,burst),position.z)+target.xyz;
  p.xz+=vec2(sin(seed*19.),cos(seed*17.))*.65;life*=aimed*step(5.7+iData.w,uTime)*(1.-smoothstep(12.5,13.3,uTime));
 }else if(uMode<3.5){
  float flight=.95+seed*.45,t=mod(max(0.,uTime-5.6-iData.w),2.65),k=.28+seed*.2;
  vec3 origin=base+vec3(0.,size*.75,0.),goal=target.xyz+vec3(0.,1.1,0.),gravity=vec3(0.,-9.81,0.);
  float A=(1.-exp(-k*flight))/k;vec3 velocity=(goal-origin-gravity*(flight/k-A/k))/max(.001,A);
  float B=(1.-exp(-k*t))/k;vec3 at=origin+velocity*B+gravity*(t/k-B/k);
  p=position*(.8+seed*.5)+at;life*=aimed*step(5.6+iData.w,uTime)*step(t,flight)*(1.-smoothstep(12.2,13.,uTime));
 }else if(uMode<4.5){
  float t=mod(max(0.,uTime-iOrigin.z),3.2),fall=max(0.,uTime-12.8)*.3;
  float ca=cos(t*2.3+seed*17.),sa=sin(t*2.3+seed*17.);p.xy=mat2(ca,-sa,sa,ca)*p.xy;n.xy=mat2(ca,-sa,sa,ca)*n.xy;
  float cb=cos(t*1.7+seed*9.),sb=sin(t*1.7+seed*9.);p.yz=mat2(cb,-sb,sb,cb)*p.yz;n.yz=mat2(cb,-sb,sb,cb)*n.yz;
  p*=.13+seed*.2;p+=base+vec3(sin(seed*27.)*t+uWind.x*t*.6,size-t*t*.5-fall,cos(seed*19.)*t+uWind.y*t*.6);
  life*=smoothstep(0.,.3,t)*(1.-smoothstep(2.5,3.2,t))*step(0.,p.y);life*=1.-uReduced*.4;
 }
 vec4 world=modelMatrix*vec4(p,1.);vWorld=world.xyz;vNormal=normalize(mat3(modelMatrix)*n+vec3(.00001));vLocal=position;vUV=uv;vPart=uMode>3.5?(seed>.97?0.:1.+step(.88,seed)):aPart;vLife=life;vSeed=seed;
 gl_Position=projectionMatrix*viewMatrix*world;
}`;
const fragment=common+`
varying vec3 vWorld,vNormal,vLocal;varying vec2 vUV;varying float vPart,vLife,vSeed;
float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);float n=dot(i,vec3(1.,57.,113.));return mix(mix(mix(hash1(n),hash1(n+1.),f.x),mix(hash1(n+57.),hash1(n+58.),f.x),f.y),mix(mix(hash1(n+113.),hash1(n+114.),f.x),mix(hash1(n+170.),hash1(n+171.),f.x),f.y),f.z);}
void main(){
 float dither=hash1(dot(floor(gl_FragCoord.xy),vec2(12.9898,78.233)));if(vLife<.001||dither>clamp(vLife,0.,1.))discard;
 vec3 N=normalize(vNormal)*(gl_FrontFacing?1.:-1.),L=normalize(vec3(-.4,.82,.35)),V=safeDir(cameraPosition-vWorld);
 float noise=noise3(vWorld*3.7),rough=.82;vec3 albedo;
 if(vPart<.5){
  float grain=.5+.5*sin(vUV.x*78.+noise*6.+vLocal.y*11.),crack=pow(max(0.,sin(vUV.x*43.+noise*3.)),16.);
  albedo=mix(vec3(.075,.035,.014),vec3(.31,.18,.07),grain*.65+noise*.35);albedo*=1.-crack*.45;
  float moss=smoothstep(.1,.7,N.y+noise*.4)*.6;albedo=mix(albedo,vec3(.10,.18,.045),moss);
  vec3 dx=dFdx(vWorld),dy=dFdy(vWorld),r1=cross(dy,N),r2=cross(N,dx);float det=dot(dx,r1);vec3 gradient=sign(det)*(dFdx(grain)*r1+dFdy(grain)*r2);N=normalize(abs(det)*N-gradient*.006+vec3(.000001));
 }else{
  float vein=exp(-abs(vUV.y-.5)*65.)+pow(max(0.,cos(vUV.x*37.+abs(vUV.y-.5)*29.)),14.)*.3;
  albedo=mix(vec3(.026,.09,.018),vec3(.22,.38,.055),noise*.5+vSeed*.5);albedo=mix(albedo,vec3(.35,.47,.12),vein*.22);rough=.64;
  if(vPart>1.5&&vPart<2.5)albedo=mix(vec3(.31,.065,.11),vec3(.73,.36,.29),noise);
  if(vPart>2.5)albedo=mix(vec3(.17,.27,.024),vec3(.49,.32,.06),noise);
  if(uPlay>.5){vec3 ray=uPlayer-cameraPosition;float t=clamp(dot(vWorld-cameraPosition,ray)/max(.01,dot(ray,ray)),0.,1.);float separation=length(vWorld-(cameraPosition+ray*t));if(t<.99&&separation<1.25&&dither>.19)discard;}
 }
 float ndl=max(0.,dot(N,L)),back=max(0.,dot(-N,L)),F=.04+.96*pow(1.-max(0.,dot(N,V)),5.);
 float spec=pow(max(0.,dot(N,safeDir(L+V))),mix(70.,8.,rough))*(.03+F*.12);
 vec3 color=albedo*(.32+ndl*.85)+vec3(.9,.83,.6)*spec;
 if(vPart>.5)color+=albedo*back*(.38+.25*(1.-dot(V,L)));
 color+=vec3(.21,.34,.08)*pow(max(0.,dot(-N,L)),3.)*.035;
 if(vPart>2.5)color+=albedo*.12; // sap has a lit body as well as a restrained inner glow
 color*=.85+uIntensity*.15;
 float fog=1.-exp(-length(cameraPosition-vWorld)*.009);color=mix(color,vec3(.018,.035,.025),fog);
 gl_FragColor=vec4(clamp(color,vec3(0.),vec3(2.)),1.);
}`;
const circleFragment=common+`
uniform float uProgress;varying vec2 vP;
float band(float x,float width){return 1.-smoothstep(width,width*2.,abs(x));}
void main(){vec2 p=vP;float r=length(p);if(r>1.)discard;float a=atan(p.y,p.x)+(uTime<0.?uCastClock:uTime)*.025,turn=fract(a/6.2831853+.5),ready=smoothstep(turn-.04,turn+.02,uProgress);
 float circles=band(r-.84,.007)+band(r-.78,.004)+band(r-.51,.006)+band(r-.23,.003);
 float winding=sin(a*18.+sin(a*3.)*.8+uTime*.14),vine=band(r-(.66+winding*.026),.005);
 vec2 q=vec2(fract(turn*24.+uTime*.006)-.5,(r-.66)*12.);float leaf=pow(max(0.,1.-length(vec2(q.x*3.,q.y*1.8))),2.);
 float rune=band(fract(turn*16.)-.5,.025)*smoothstep(.31,.36,r)*(1.-smoothstep(.44,.49,r));
 rune+=band(abs(fract(turn*16.)-.5)-abs(r-.4)*1.8,.025)*smoothstep(.33,.35,r)*(1.-smoothstep(.45,.47,r));
 float pulse=exp(-pow((r-clamp(uTime*.45,0.,1.2))/.045,2.))*step(0.,uTime)*(1.-smoothstep(2.5,3.5,uTime));
 float crack=pow(max(0.,sin(a*31.+sin(r*29.)*2.)),30.)*(1.-smoothstep(.1,.72,r))*.2;
 float mist=(.5+.5*sin(p.x*21.+sin(p.y*19.)+uTime*.4))*.045;
 float detail=clamp(circles*.6+vine*.65+leaf*.5+rune*.52,0.,1.)*ready;
 vec3 color=mix(vec3(.09,.24,.07),vec3(.57,.67,.23),clamp(detail*.7+pulse*.3,0.,1.));
 float fade=uTime<0.?1.:1.-smoothstep(3.,5.,uTime);float alpha=(detail*.74+pulse*.3+mist+crack)*fade;
 if(alpha<.008)discard;gl_FragColor=vec4(color*(.65+uIntensity*.25),alpha);
}`;
const pollenVertex=common+`
attribute vec4 aSeed;varying float vAlpha,vType;
void main(){float seed=aSeed.x,type=floor(aSeed.w*3.),clock=uTime<0.?uCastClock:uTime,period=3.4,t=mod(max(0.,clock-aSeed.y),period),life=safeLife()*step(aSeed.y,clock);if(uTime<0.&&type>.5)life=0.;
 vec3 p=vec3(sin(seed*36.)*uRadius*sqrt(aSeed.z),.1,cos(seed*36.)*uRadius*sqrt(aSeed.z));
 if(type<.5){p+=vec3(uWind.x*t*.8,t*(.4+seed*.5),uWind.y*t*.8);}
 else if(type<1.5){p+=vec3(sin(seed*19.)*t,(1.+seed)*t-t*t,cos(seed*27.)*t);}
 else{t=mod(max(0.,clock-6.55-aSeed.y*.45),2.65);life*=1.-smoothstep(.5,1.15,t);int index=int(mod(floor(seed*10000.),8.));p=uTargets[index].xyz+vec3(sin(seed*71.),.6+cos(seed*39.)*.4,cos(seed*61.))*t*.65;life*=step(5.8,uTime)*uTargets[index].w;}
 vAlpha=life*smoothstep(0.,.2,t)*(1.-smoothstep(2.,3.4,t))*(1.-uReduced*.5);vType=type;
 vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp((type<.5?2.5:4.5)*(.65+seed*.75)*(180./max(3.,-mv.z)),1.,14.);
}`;
const pollenFragment=`varying float vAlpha,vType;void main(){float r=length(gl_PointCoord-.5),alpha=(1.-smoothstep(.05,.5,r))*vAlpha*.38;if(alpha<.008)discard;vec3 color=vType<.5?vec3(.66,.72,.24):vType<1.5?vec3(.26,.15,.07):vec3(.43,.58,.15);gl_FragColor=vec4(color,alpha);}`;

export function createNatureAttack(parent,index,hex,skill,cfg,hooks={}){
 const started=performance.now(),quality=NATURE_BUDGETS[cfg.quality]?cfg.quality:'High',budget={...NATURE_BUDGETS[quality],trees:skill.nature.treeCounts[quality]},R=getSkillAreaRadius(skill,cfg.aoeRadius),g=new THREE.Group();g.name='VerdantGenesis';parent.add(g);
 const targetUniform=Array.from({length:8},()=>new THREE.Vector4()),uniforms={uTime:{value:-1},uCastClock:{value:0},uGrow:{value:skill.nature.growthSpeed||1},uProgress:{value:0},uIntensity:{value:1},uRadius:{value:R},uWind:hooks.wind||{value:new THREE.Vector4(1,0,0,0)},uReduced:{value:cfg.reducedMotion?1:0},uPlay:{value:0},uPlayer:{value:new THREE.Vector3()},uTargets:{value:targetUniform}};
 const sourceRecords=[],targetIndices=new Int16Array(budget.trees).fill(-1),groups=Array.from({length:6},()=>[]),ancients=quality==='Low'?2:quality==='Medium'?3:quality==='High'?4:5,types=[0,1,2,3,5];
 for(let i=0;i<budget.trees;i++){const seed=natureHash(i+71),variant=i<ancients?4:types[i%5],a=i*2.399963,r=R*(i<ancients?.12+seed*.23:Math.sqrt((i-ancients+.5)/(budget.trees-ancients))*.91),height=variant===4?9+seed*4:variant===2?2.4+seed*1.2:variant===3?2.1+seed:3.4+seed*2.7,birth=variant===3?.45+seed*.65:variant===2?1.6+seed*.65:variant===4?3.4+seed*.6:2.4+seed*.8;
  sourceRecords.push({x:Math.cos(a)*r,z:Math.sin(a)*r,seed,angle:seed*6.28,height,birth,variant,delay:seed*1.6,groupIndex:groups[variant].length});groups[variant].push(i);}
 const allOrigins=new Float32Array(budget.trees*4),allData=new Float32Array(budget.trees*4),treeData=[];
 const material=new THREE.ShaderMaterial({uniforms:{...uniforms,uMode:{value:0}},vertexShader:vertex,fragmentShader:fragment,side:THREE.DoubleSide});
 const attribute=(array)=>new THREE.InstancedBufferAttribute(array,4).setUsage(THREE.DynamicDrawUsage);
 sourceRecords.forEach((p,i)=>{allOrigins.set([p.x,p.z,p.birth,p.height],i*4);allData.set([p.seed,p.angle,-1,p.delay],i*4);});
 const originAttribute=attribute(allOrigins),dataAttribute=attribute(allData),meshes=[];
 function instance(geometry,count,mat,origins=originAttribute,data=dataAttribute){geometry.setAttribute('iOrigin',origins);geometry.setAttribute('iData',data);const m=new THREE.InstancedMesh(geometry,mat,count);m.frustumCulled=false;g.add(m);meshes.push(m);return m;}
 for(let type=0;type<6;type++){const list=groups[type],origins=new Float32Array(list.length*4),data=new Float32Array(list.length*4);list.forEach((id,i)=>{origins.set(allOrigins.subarray(id*4,id*4+4),i*4);data.set(allData.subarray(id*4,id*4+4),i*4);});const da=attribute(data);treeData[type]=da;instance(natureGeometry(type,quality),list.length,material,attribute(origins),da);}
 for(const [name,mode]of [['root',1],['spike',2],['fruit',3]])instance(natureGeometry(name,quality),budget.trees,new THREE.ShaderMaterial({uniforms:{...uniforms,uMode:{value:mode}},vertexShader:vertex,fragmentShader:fragment,side:THREE.DoubleSide}));
 const leafOrigins=new Float32Array(budget.leaves*4),leafData=new Float32Array(budget.leaves*4);
 for(let i=0;i<budget.leaves;i++){const seed=natureHash(i+1781),a=i*2.399963,r=Math.sqrt(natureHash(i+19))*R;leafOrigins.set([Math.cos(a)*r,Math.sin(a)*r,1.5+seed*3,1+seed*5],i*4);leafData.set([seed,a,-1,0],i*4);}
 instance(natureGeometry('leaf',quality),budget.leaves,new THREE.ShaderMaterial({uniforms:{...uniforms,uMode:{value:4}},vertexShader:vertex,fragmentShader:fragment,side:THREE.DoubleSide}),attribute(leafOrigins),attribute(leafData));
 const circle=new THREE.Mesh(natureDisc(),new THREE.ShaderMaterial({uniforms,vertexShader:'varying vec2 vP;uniform float uRadius;void main(){vP=uv;vec3 p=position*uRadius;p.y=.025;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}',fragmentShader:circleFragment,transparent:true,depthWrite:false,side:THREE.DoubleSide}));circle.renderOrder=2;g.add(circle);
 const shadowGeo=natureDisc(24,4);shadowGeo.setAttribute('iOrigin',originAttribute);shadowGeo.setAttribute('iData',dataAttribute);
 const shadows=new THREE.InstancedMesh(shadowGeo,new THREE.ShaderMaterial({uniforms,vertexShader:common+'attribute vec4 iOrigin,iData;varying vec2 vP;varying float vA;void main(){vP=uv;float grow=elastic(uTime-iOrigin.z)*safeLife()*step(iOrigin.z,uTime);vA=grow;vec3 p=position;p.xz*=iOrigin.w*.28*grow;p.x+=iOrigin.x;p.z+=iOrigin.y;p.y=.018;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}',fragmentShader:'varying vec2 vP;varying float vA;void main(){float r=length(vP),a=(1.-smoothstep(.12,1.,r))*.24*vA;if(a<.004)discard;gl_FragColor=vec4(.018,.026,.012,a);}',transparent:true,depthWrite:false,side:THREE.DoubleSide}),budget.trees);shadows.frustumCulled=false;shadows.renderOrder=1;g.add(shadows);
 const particleGeo=new THREE.BufferGeometry(),seeds=new Float32Array(budget.particles*4);for(let i=0;i<budget.particles;i++)seeds.set([natureHash(i+902),natureHash(i+3)*3.4,natureHash(i+84),natureHash(i+188)],i*4);particleGeo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(budget.particles*3),3));particleGeo.setAttribute('aSeed',new THREE.BufferAttribute(seeds,4));
 const pollen=new THREE.Points(particleGeo,new THREE.ShaderMaterial({uniforms,vertexShader:pollenVertex,fragmentShader:pollenFragment,transparent:true,depthWrite:false,blending:THREE.NormalBlending}));pollen.frustumCulled=false;g.add(pollen);
 if(quality==='High'||quality==='Ultra'){
  const beamGeo=new THREE.BufferGeometry();beamGeo.setAttribute('position',new THREE.Float32BufferAttribute([-1,0,0,1,0,0,-.2,1,0,.2,1,0],3));beamGeo.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,0,1,1,1],2));beamGeo.setIndex([0,1,2,2,1,3]);beamGeo.setAttribute('iOrigin',originAttribute);beamGeo.setAttribute('iData',dataAttribute);
  const beams=new THREE.InstancedMesh(beamGeo,new THREE.ShaderMaterial({uniforms,vertexShader:common+'attribute vec4 iOrigin,iData;varying vec2 vUv;varying float vA;void main(){vUv=uv;float growth=elastic(uTime-iOrigin.z)*step(iOrigin.z,uTime);vA=growth*safeLife()*(1.-uReduced);vec3 p=position;p.x=p.x*1.7+(1.-uv.y)*2.3+iOrigin.x;p.y=uv.y*iOrigin.w;p.z=iOrigin.y;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}',fragmentShader:'uniform float uTime;varying vec2 vUv;varying float vA;void main(){float a=pow(sin(vUv.x*3.141593),2.)*sin(vUv.y*3.141593)*vA*.035*(.7+.3*sin(vUv.y*31.+uTime*.3));if(a<.002)discard;gl_FragColor=vec4(.68,.62,.27,a);}',transparent:true,depthWrite:false,side:THREE.DoubleSide}),ancients+2);beams.frustumCulled=false;g.add(beams);
 }
 const events=[];for(let i=0;i<budget.trees;i++)for(let cycle=0;cycle<3;cycle++)for(const [kind,offset]of [['root',5.65],['spike',5.95],['branch',5.38],['fruit',6.55+sourceRecords[i].seed*.45]]){const at=offset+sourceRecords[i].delay+cycle*2.65;if(at<13.2)events.push({at,kind,plant:i});}events.sort((a,b)=>a.at-b.at);
 let targetTimer=-1,eventIndex=0,lastTime=0,disposed=false,pre=false,impact=false,lastMicro=-10,retargets=0,cleared=false;
 const hits={root:0,spike:0,branch:0,fruit:0},center=parent.position,white=new THREE.Color(0xd8cc78),targetSample=[];
 function syncTargets(t){const targets=hooks.targets?.()||[];uniforms.uPlay.value=hooks.playing?.()?1:0;uniforms.uPlayer.value.copy(hooks.player?.()||new THREE.Vector3(0,-100,0));
  for(let i=0;i<8;i++){const p=targets[i]?.group?.position||targets[i]?.position;targetUniform[i].set(p?p.x-center.x:0,p?p.y-center.y:0,p?p.z-center.z:0,p?1:0);}
  if(t-targetTimer<.35&&targetTimer>=0)return;targetTimer=t;retargets++;
  sourceRecords.forEach((p,i)=>{let best=-1,distance=(skill.nature.attackRange||14)**2;for(let j=0;j<Math.min(8,targets.length);j++){const q=targetUniform[j],d=(q.x-p.x)**2+(q.z-p.z)**2;if(q.w&&d<distance){distance=d;best=j;}}if(targetIndices[i]!==best){targetIndices[i]=best;allData[i*4+2]=best;treeData[p.variant].array[p.groupIndex*4+2]=best;treeData[p.variant].needsUpdate=true;dataAttribute.needsUpdate=true;}});
 }
 function restore(){if(cleared)return;cleared=true;hooks.clearTargets?.();}
 let warmup='pending';
 const schedule=globalThis.requestIdleCallback||((fn)=>setTimeout(fn,0)),cancel=globalThis.cancelIdleCallback||clearTimeout;
 const warmHandle=hooks.warmup?schedule(()=>{if(disposed)return;try{hooks.warmup(g);warmup='ready';}catch(error){warmup='failed';console.warn('[Nature] Shader warm-up failed; regular render compile remains available.',error);}}):null;
 if(!hooks.warmup)warmup='unavailable';
 g.userData.dispose=()=>{disposed=true;if(warmHandle!==null)cancel(warmHandle);restore();};
 const constructionMs=performance.now()-started;
 return {group:g,radius:R,
  updateCast(progress,time){if(disposed)return;uniforms.uTime.value=-1;uniforms.uCastClock.value=time;uniforms.uProgress.value=progress;uniforms.uIntensity.value=cfg.intensity;syncTargets(time);},
  update(t,intensity=1,density=1){if(disposed)return;if(!Number.isFinite(t)){restore();throw new Error('Nature simulation time is not finite');}if(uniforms.uTime.value<0)targetTimer=-1;uniforms.uTime.value=t;uniforms.uProgress.value=1;uniforms.uIntensity.value=Math.min(3,Math.max(0,intensity));uniforms.uReduced.value=cfg.reducedMotion?1:0;syncTargets(t);
   const scale=Math.min(1,Math.max(.25,density));for(let kind=6;kind<9;kind++)meshes[kind].count=Math.floor(budget.trees*scale);meshes[9].count=Math.floor(budget.leaves*scale*(cfg.reducedMotion?.45:1));for(let kind=0;kind<6;kind++)meshes[kind].count=Math.max(Math.min(groups[kind].length,kind===4?2:3),Math.floor(groups[kind].length*scale));pollen.geometry.setDrawRange(0,Math.floor(budget.particles*scale));
   if(!pre&&t>=hooks.plan.impactAt-hooks.plan.preSlowDuration){pre=true;hooks.beginPreImpactSlowMotion?.(hooks.plan);}
   if(!impact&&t>=hooks.plan.impactAt){impact=true;hooks.beginImpactHitStop?.(hooks.plan);hooks.triggerCameraShake?.(hooks.plan);}
   while(eventIndex<events.length&&events[eventIndex].at<=t){const e=events[eventIndex++],target=targetIndices[e.plant];if(e.plant>=Math.floor(budget.trees*scale)||target<0||e.at<lastTime||t-e.at>.2)continue;hits[e.kind]++;hooks.onHit?.(target,e.kind);if(t-lastMicro>.75&&Math.abs(t-hooks.plan.impactAt)>.35&&!cfg.reducedMotion){lastMicro=t;hooks.beginImpactHitStop?.({...hooks.plan,hitStop:.022,postSlowDuration:.07,postSlowScale:.85});hooks.triggerCameraShake?.({...hooks.plan,shake:.08,shakeDuration:.16});}}
   if(t>=18)restore();lastTime=t;
  },
  environmentMood(){const t=uniforms.uTime.value;return t<0?0:THREE.MathUtils.smoothstep(t,.4,4.5)*(1-THREE.MathUtils.smoothstep(t,13.4,18));},
  lightColor:()=>white,runePulse:()=>Math.exp(-Math.abs(uniforms.uTime.value-.7)*3)*.4,
  diagnostics(){targetSample.length=0;for(let i=0;i<Math.min(8,targetIndices.length);i++)targetSample.push(targetIndices[i]);return {quality,budget,variants:NATURE_VARIANTS,trees:budget.trees,particles:budget.particles,retargets,hits:{...hits},targetSample:[...targetSample],time:uniforms.uTime.value,constructionMs,warmup,disposed,surfaceRestored:cleared};},
  reset(){restore();},dispose(){g.userData.dispose();},
 };
}
