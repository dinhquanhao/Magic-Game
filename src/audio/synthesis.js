export const TAU=Math.PI*2;
export function seeded(seed){let x=seed>>>0;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296;};}
export const softClip=x=>Math.tanh(x);
export function oscillator(type,phase){const p=phase-Math.floor(phase);return type==='sine'?Math.sin(TAU*p):type==='triangle'?1-4*Math.abs(p-.5):type==='saw'?2*p-1:p<.5?1:-1;}
export function adsr(t,duration,attack=.01,decay=.08,sustain=.6,release=.2){if(t<attack)return t/attack;if(t<attack+decay)return 1-(1-sustain)*(t-attack)/decay;if(t>duration-release)return sustain*Math.max(0,(duration-t)/release);return sustain;}
export function biquad(data,rate,type='lowpass',frequency=2400,q=.7,gainDb=0) {
 const w=TAU*Math.min(rate*.45,frequency)/rate,co=Math.cos(w),si=Math.sin(w),alpha=si/(2*q),a=10**(gainDb/40);
 let b0,b1,b2,a0,a1,a2;
 if(type==='lowpass'){b0=(1-co)/2;b1=1-co;b2=b0;a0=1+alpha;a1=-2*co;a2=1-alpha;}
 else if(type==='highpass'){b0=(1+co)/2;b1=-(1+co);b2=b0;a0=1+alpha;a1=-2*co;a2=1-alpha;}
 else if(type==='bandpass'){b0=alpha;b1=0;b2=-alpha;a0=1+alpha;a1=-2*co;a2=1-alpha;}
 else if(type==='notch'){b0=1;b1=-2*co;b2=1;a0=1+alpha;a1=b1;a2=1-alpha;}
 else{b0=1+alpha*a;b1=-2*co;b2=1-alpha*a;a0=1+alpha/a;a1=b1;a2=1-alpha/a;}
 let x1=0,x2=0,y1=0,y2=0;const out=new Float32Array(data.length);
 for(let i=0;i<data.length;i++){const x=data[i],y=(b0*x+b1*x1+b2*x2-a1*y1-a2*y2)/a0;out[i]=y;x2=x1;x1=x;y2=y1;y1=y;}return out;
}
export function noise(n,kind,rng){const out=new Float32Array(n);let brown=0,pink=0,previous=0;for(let i=0;i<n;i++){const white=rng()*2-1;brown=.995*brown+.09*white;pink=.88*pink+.22*white;out[i]=kind==='brown'?brown:kind==='pink'?pink:kind==='blue'?(white-previous)*.5:white;previous=white;}return out;}
export function modal(n,rate,base,ratios,decay=1){const out=new Float32Array(n);for(let i=0;i<n;i++){const t=i/rate;let v=0;for(let m=0;m<ratios.length;m++)v+=Math.sin(TAU*base*ratios[m]*t)*Math.exp(-t*(1+m*.7)/decay)/(1+m);out[i]=v;}return out;}
export function karplus(n,rate,frequency,rng,damping=.986){const length=Math.max(8,Math.floor(rate/frequency)),ring=Float32Array.from({length},()=>rng()*2-1),out=new Float32Array(n);for(let i=0;i<n;i++){const k=i%length;out[i]=ring[k];ring[k]=(ring[k]+ring[(k+1)%length])*.5*damping;}return out;}
export function granular(data,rate,rng,count,base,kind='noise'){
 for(let g=0;g<count;g++){const start=Math.floor(rng()*(data.length-rate*.05)),duration=Math.floor(rate*(.015+rng()*.07)),f=base*(.7+rng()*2.5);
  for(let j=0;j<duration&&start+j<data.length;j++){const t=j/rate,envelope=Math.sin(Math.PI*j/duration)**2;const signal=kind==='bubble'?Math.sin(TAU*f*(t+t*t*6)):kind==='modal'?Math.sin(TAU*f*t)+.35*Math.sin(TAU*f*2.71*t):rng()*2-1;data[start+j]+=signal*envelope*(.12+rng()*.1);}
 }return data;
}
export function modulation(data,rate,type,depth=.2,frequency=.8){const out=new Float32Array(data.length),delay=Math.round(rate*.007);for(let i=0;i<data.length;i++){const lfo=Math.sin(TAU*frequency*i/rate);if(type==='ring')out[i]=data[i]*lfo;else if(type==='bitcrush')out[i]=Math.round(data[i]*32)/32;else {const d=delay+Math.round(lfo*delay*.6);out[i]=data[i]+(data[Math.max(0,i-d)]||0)*depth;}}return out;}
export function wavetable(n,rate,frequency,table){const out=new Float32Array(n);for(let i=0;i<n;i++){const x=i*frequency/rate%1*(table.length-1),j=Math.floor(x);out[i]=table[j]+(table[(j+1)%table.length]-table[j])*(x-j);}return out;}
export function subDrop(n,rate,strength=1,reduced=false){const out=new Float32Array(n);let phase=0;for(let i=0;i<n;i++){const t=i/rate,f=30+90*Math.exp(-t*8);phase+=f/rate;const env=Math.min(1,t/.006)*Math.exp(-t*4.5);out[i]=softClip((Math.sin(TAU*phase)+(reduced?.3:.55)*Math.sin(TAU*phase*2)+.18*Math.sin(TAU*phase*3))*1.2)*env*strength*(reduced?.42:1);}return out;}
export function materialTexture(cue,rate,variant=0,grains=32){
 const p=cue.profile,n=Math.ceil(cue.duration*rate),rng=seeded(cue.seed+variant*7919),jitter=1+(rng()-.5)*.035,base=p.base*jitter;
 let x=noise(n,p.noise,rng),tone=modal(n,rate,base,p.modes,cue.loop?10:1.2),brown=noise(n,'brown',rng);
 const isBell=['bell','clock','crystal','stars'].includes(p.material);
 granular(x,rate,rng,Math.max(8,grains),base,['bubble','slime','viscous','lava'].includes(p.material)?'bubble':isBell?'modal':'noise');
 let phase=0;
 for(let i=0;i<n;i++){
  const t=i/rate,lfo=.6+.4*Math.sin(TAU*(.37+variant*.03)*t),fm=Math.sin(TAU*base*t+3*Math.sin(TAU*2.7*t));phase+=base/rate;
  switch(p.material){
   case 'bubble': x[i]=x[i]*.7+.18*Math.sin(TAU*base*(t+t*t*.6))*Math.exp(-t*3)+tone[i]*.1;break;
   case 'stone':x[i]=brown[i]*1.5+tone[i]*.6+x[i]*.35;break;
   case 'air':x[i]=x[i]*(1.1+.8*lfo)+fm*.025;break;
   case 'flame':x[i]=brown[i]*1.2+x[i]*.65+(rng()<.003?(rng()-.5)*2:0);break;
   case 'electric':x[i]=x[i]*(i<rate*.004?2:.35)+.16*oscillator('saw',phase)*Math.sin(TAU*50*t)+brown[i]*.45;break;
   case 'slime':x[i]=x[i]*.65+.22*Math.sin(TAU*base*(t+t*t*2))*Math.exp(-t*2)+fm*.1;break;
   case 'viscous':x[i]=brown[i]+.22*Math.sin(TAU*base*(t+t*t*.8))*Math.exp(-t*4)+tone[i]*.12;break;
   case 'lava':x[i]=brown[i]*1.7+.15*fm+tone[i]*.15;break;
   case 'void':x[i]=fm*.35+brown[i]*.8+.15*Math.sin(TAU*base*1.067*t);break;
   case 'warp':x[i]=fm*.35+.25*Math.sin(TAU*base*1.07*t+2*Math.sin(t*7))+brown[i]*.4;break;
   case 'wood':x[i]=brown[i]*.65+tone[i]*Math.exp(-((t*6)%1)*8)*.4+x[i]*.22*(.5+.5*Math.sin(TAU*17*t))+.12*Math.sin(TAU*base*(t+t*t*.018));break;
   default:x[i]=tone[i]*.75+x[i]*(p.material==='crystal'?.17:.025);
  }
 }
 x=biquad(x,rate,isBell?'highpass':'lowpass',isBell?120:p.cutoff);
 if(['warp','stars'].includes(p.material))x=modulation(x,rate,'chorus',.22,.45);
 return x;
}
export function renderCue(cue,{rate=24000,variant=0,reduced=false,grains=32,correctionDb=0,drive=1}={}) {
 const n=Math.ceil(cue.duration*rate),rng=seeded(cue.seed+variant*7919+3),x=materialTexture(cue,rate,variant,grains),p=cue.profile,role=cue.role;
 let rawPeak=0,sum=0,mean=0;
 if(role==='impact'){
  const body=Float32Array.from(x),sub=subDrop(n,rate,p.bass,reduced),tailNoise=biquad(noise(n,'pink',rng),rate,'lowpass',Math.min(5000,p.cutoff));
  // Separate transient/body/sub/late debris/tail. Time preserves a lighter sub.
  for(let i=0;i<n;i++){const t=i/rate,attack=Math.min(1,t/.0015),transient=t<.008?(rng()*2-1)*Math.exp(-t*700)*(reduced?.14:.45):0;
   x[i]=transient+body[i]*Math.exp(-t*8)*attack*1.4+sub[i]*.5+tailNoise[i]*Math.exp(-t*1.6)*Math.min(1,t/.12)*.25;
  }
  granular(x.subarray(Math.round(rate*.4)),rate,rng,12,p.base*2,['crystal','bell','stars','clock'].includes(p.material)?'modal':'noise');
 } else if(role==='riser'){
  let phase=0;for(let i=0;i<n;i++){const t=i/rate,u=i/n;phase+=(80+u*u*1700)/rate;x[i]=(x[i]*.5+Math.sin(TAU*phase)*.22)*u*u;}
 } else if(role==='rune'||role==='ui'){const tone=modal(n,rate,p.base*(role==='ui'?2:1),p.modes,.22);for(let i=0;i<n;i++)x[i]=tone[i]*.8+x[i]*.08;}
 else if(role==='drone'){for(let i=0;i<n;i++){const t=i/rate;x[i]=Math.sin(TAU*p.base*.5*t)*.25+Math.sin(TAU*p.base*.503*t)*.15+x[i]*.12;}}
 else if(role==='shockwave'){const sub=subDrop(n,rate,p.bass,reduced);for(let i=0;i<n;i++)x[i]=x[i]*.35+sub[i]*.55;}
 // Envelope is separate from material: every element retains its identity in Low.
 for(let i=0;i<n;i++){
  const t=i/rate,u=i/n;let env;
  if(cue.loop)env=Math.min(1,t/.008,(cue.duration-t)/.008);
  else if(role==='riser')env=Math.min(1,t/.01)*(u<.875?1:Math.max(0,(1-u)/.125));
  else if(role==='impact')env=Math.min(1,t/.001)*(1-u)**1.4;
  else if(role==='aftermath')env=Math.min(1,t/.03)*Math.exp(-u*5)*(1-u);
  else if(['casting','secondary','rune','ui'].includes(role))env=Math.min(1,t/.003)*Math.exp(-u*5)*(1-u);
  else if(role==='precast')env=Math.sin(Math.PI*u)**1.3;
  else env=Math.min(1,t/.012)*Math.exp(-u*3)*(1-u);
  x[i]*=Math.max(0,env);if(drive>1)x[i]=Math.tanh(x[i]*drive)/Math.tanh(drive);mean+=x[i];
 }
 mean/=n;
 for(let i=0;i<n;i++){x[i]-=mean;rawPeak=Math.max(rawPeak,Math.abs(x[i]));sum+=x[i]*x[i];}
 const target=10**((cue.targetRmsDb+correctionDb)/20),scale=Math.min(target/Math.sqrt(sum/n||1),.82/Math.max(1e-8,rawPeak));
 for(let i=0;i<n;i++)x[i]*=scale;
 if(reduced){const filtered=biquad(biquad(x,rate,'highpass',100),rate,'lowpass',2800);for(let i=0;i<n;i++)x[i]=filtered[i]*.6;}
 // Raised-cosine 4ms seams prevent clicks; ends and DC remain bounded.
 const edge=Math.round(rate*.004);for(let i=0;i<edge;i++){const e=Math.sin(i/edge*Math.PI/2)**2;x[i]*=e;x[n-1-i]*=e;}
 if(role==='riser'){const boundary=n-Math.round(rate*.09),fade=Math.round(rate*.015);for(let i=boundary-fade;i<boundary;i++)x[i]*=Math.sin((boundary-i)/fade*Math.PI/2)**2;x.fill(0,boundary);
  // Remove DC only over supported samples, with zero-valued boundaries/vacuum.
  let dc=0,weights=0;for(let i=0;i<boundary;i++){const weight=Math.min(1,i/(rate*.008),(boundary-i)/(rate*.015));dc+=x[i];weights+=Math.max(0,weight);}
  dc/=Math.max(1,weights);for(let i=0;i<boundary;i++){const weight=Math.max(0,Math.min(1,i/(rate*.008),(boundary-i)/(rate*.015)));x[i]-=dc*weight;}
 }
 return x;
}
