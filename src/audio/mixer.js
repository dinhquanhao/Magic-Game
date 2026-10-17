import {AUDIO_PRESETS,dbGain} from './settings.js';
const CATEGORIES=['sfx','impact','ambience','magic','drone','ui'];
export const idle=()=>new Promise(resolve=>globalThis.requestIdleCallback?requestIdleCallback(resolve,{timeout:150}):queueMicrotask(resolve));
const curve=new Float32Array(65537);
for(let i=0;i<curve.length;i++)curve[i]=Math.max(-.794328,Math.min(.794328,(i/(curve.length-1)*2-1)));
function set(param,value,now,tau=.015){param.cancelScheduledValues(now);param.setTargetAtTime(value,now,tau);}

export async function createMixer(ctx,settings,quality='High') {
 const nodes=new Set(),buses={},slots=[],irCache=new Map();
 let disposed=false,preset=quality,adaptive=1,room=settings.room,limiterStats={reduction:0,peak:0,blocks:0};
 let limiterKind='waveshaper-ceiling',cpuSlow=0,cpuGood=0,duckUntil=0,vacuumActive=false,hitstopActive=false;
 const node=n=>{nodes.add(n);return n;};
 const gain=v=>{const g=node(ctx.createGain());g.gain.value=v;return g;};
 const master=gain(dbGain(settings.masterDb)),eq=node(ctx.createBiquadFilter());eq.type='highpass';eq.frequency.value=22;eq.Q.value=.5;
 const compressor=node(ctx.createDynamicsCompressor());compressor.threshold.value=-15;compressor.knee.value=6;compressor.ratio.value=2.5;compressor.attack.value=.012;compressor.release.value=.18;
 const analyser=node(ctx.createAnalyser());analyser.fftSize=2048;const meterData=new Float32Array(analyser.fftSize);
 let limiter;
 try {
  if(!ctx.audioWorklet)throw new Error('No worklet');
  await ctx.audioWorklet.addModule('/audio/ceiling-limiter.js');
  limiter=node(new AudioWorkletNode(ctx,'arcane-ceiling',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[2]}));
  limiter.port.onmessage=e=>{limiterStats=e.data;};limiterKind='lookahead-brickwall';
 } catch {
  limiter=node(ctx.createWaveShaper());limiter.curve=curve;limiter.oversample='none';
 }
 master.connect(eq);eq.connect(compressor);compressor.connect(limiter);limiter.connect(analyser);analyser.connect(ctx.destination);
 const reverbInput=gain(.22),wetOut=gain(.28),convolver=node(ctx.createConvolver()),convGain=gain(1),fdnGain=gain(0);
 const pre=node(ctx.createDelay(.2));pre.delayTime.value=.024;reverbInput.connect(pre);pre.connect(convolver);convolver.connect(convGain);convGain.connect(wetOut);wetOut.connect(master);
 // Two short damped delay lines are the Low/Medium room; both feed a common bus.
 for(const delayTime of [.073,.109]) {
  const delay=node(ctx.createDelay(.5)),damping=node(ctx.createBiquadFilter()),feedback=gain(.28);
  delay.delayTime.value=delayTime;damping.type='lowpass';damping.frequency.value=2700;
  pre.connect(delay);delay.connect(damping);damping.connect(feedback);feedback.connect(delay);damping.connect(fdnGain);
 }
 fdnGain.connect(wetOut);
 for(const name of CATEGORIES) {
  const dry=gain(1),wet=gain(1),duck=gain(1);dry.connect(duck);duck.connect(master);wet.connect(reverbInput);
  buses[name]={dry,wet,duck};
 }
 // Nodes are pooled once. BufferSourceNodes are one-shot by WebAudio design.
 for(let i=0;i<AUDIO_PRESETS.Ultra.voices;i++) {
  const envelope=gain(0),filter=node(ctx.createBiquadFilter()),panner=node(ctx.createPanner()),send=gain(0),direct=gain(1);
  filter.type='lowpass';filter.frequency.value=16000;panner.distanceModel='inverse';panner.refDistance=16;panner.maxDistance=220;panner.rolloffFactor=.45;
  const bass=node(ctx.createBiquadFilter()),presence=node(ctx.createBiquadFilter());bass.type='lowshelf';bass.frequency.value=100;presence.type='highshelf';presence.frequency.value=3000;envelope.connect(bass);bass.connect(presence);presence.connect(filter);filter.connect(panner);panner.connect(direct);panner.connect(send);
  slots.push({envelope,bass,presence,filter,panner,send,direct,busy:false,category:null});
 }
 async function setRoom(next) {
  if(disposed)return;
  room=next;const durations={arena:1.8,cave:2.8,void:4.2,underwater:1.1,cathedral:4};
  if(!irCache.has(next)) {
   await idle();if(disposed)return;
   const duration=durations[next]||1.8,n=Math.ceil(ctx.sampleRate*duration),buffer=ctx.createBuffer(2,n,ctx.sampleRate);
   let seed=371+Object.keys(durations).indexOf(next)*17;
   for(let c=0;c<2;c++) {
    const data=buffer.getChannelData(c);let low=0;
    for(let j=0;j<n;j++) {seed=(Math.imul(seed,1664525)+1013904223)|0;const white=(seed>>>0)/2147483648-1;low+=(white-low)*(next==='underwater'?.035:.22);data[j]=low*Math.exp(-j/(n*.18))*.35;}
   }
   irCache.set(next,buffer);
   while(irCache.size>3)irCache.delete(irCache.keys().next().value);
  }
  if(room===next&&!disposed)convolver.buffer=irCache.get(next);
 }
 function applySettings(s) {
  settings=s;const now=ctx.currentTime;
  set(master.gain,s.mute?0:dbGain(s.masterDb),now);
  for(const category of CATEGORIES) {
   const db=category==='ambience'?s.ambienceDb:category==='drone'?s.droneDb:s.sfxDb;
   const volume=(category==='ui'&&!s.ui)?0:dbGain(db);
   set(buses[category].dry.gain,volume,now);set(buses[category].wet.gain,volume,now);
  }
  if(s.room!==room)void setRoom(s.room);
 }
 function setQuality(next) {
  if(!AUDIO_PRESETS[next])return;
  preset=next;const convolution=AUDIO_PRESETS[next].convolution&&adaptive>.5,now=ctx.currentTime;
  set(convGain.gain,convolution?1:0,now);set(fdnGain.gain,convolution?0:.7,now);
  for(const slot of slots)try{slot.panner.panningModel=AUDIO_PRESETS[next].panner;}catch{slot.panner.panningModel='equalpower';}
 }
 function attach(slot,category) {
  if(slot.category===category)return;
  slot.direct.disconnect();slot.send.disconnect();slot.direct.connect(buses[category].dry);slot.send.connect(buses[category].wet);slot.category=category;
 }
 function duck(amountDb=6,duration=.4) {
  const now=ctx.currentTime;duckUntil=Math.max(duckUntil,now+duration);
  for(const name of ['ambience','drone']) {
   for(const param of [buses[name].duck.gain,buses[name].wet.gain]) {
    const base=param===buses[name].wet.gain?dbGain(name==='ambience'?settings.ambienceDb:settings.droneDb):1;
    param.cancelScheduledValues(now);param.setTargetAtTime(base*dbGain(-amountDb),now,.008);param.setTargetAtTime(base,duckUntil,.15);
   }
  }
 }
 function reportFrame(cost,dt) {
  if(cost>35){cpuSlow+=dt;cpuGood=0;}else{cpuGood+=dt;cpuSlow=Math.max(0,cpuSlow-dt);}
  if(cpuSlow>2&&adaptive> .5){adaptive=.5;setQuality(preset);cpuSlow=0;}
  if(cpuGood>8&&adaptive<1){adaptive=1;setQuality(preset);cpuGood=0;}
 }
 applySettings(settings);setQuality(quality);await setRoom(room);
 return {
  slots,attach,duck,applySettings,setQuality,setRoom,reportFrame,analyser,
  get limit(){return Math.max(4,Math.floor(AUDIO_PRESETS[preset].voices*adaptive));},
  get budget(){return AUDIO_PRESETS[preset];},
  route(slot,category,wet=.1){attach(slot,category);slot.send.gain.value=wet;slot.direct.gain.value=1;},
  listener(pose) {const now=ctx.currentTime;for(const [prefix,values] of Object.entries(pose))if(values&&['position','forward','up'].includes(prefix)) {
   if(ctx.listener[`${prefix}X`])for(let i=0;i<3;i++)set(ctx.listener[`${prefix}${'XYZ'[i]}`],values[i],now,.018);
   else if(prefix==='position')ctx.listener.setPosition(...values);else if(prefix==='forward')ctx.listener.setOrientation(...values,...(pose.up||[0,1,0]));
  }},
  spatial(slot,position,distance,rate=1,reduced=settings.reduced) {const now=ctx.currentTime;
   for(let i=0;i<3;i++)set(slot.panner[`position${'XYZ'[i]}`],settings.spatial?position[i]:[0,0,-1][i],now,.015);
   slot.panner.rolloffFactor=settings.spatial?.45:0;
   const cutoff=(reduced?8500:16000)/(1+Math.max(0,distance-16)*.018);
   set(slot.filter.frequency,Math.max(160,cutoff*Math.max(.08,Math.min(1,rate))),now,.02);set(slot.bass.gain,(settings.impact-1)*6-(reduced?9:0),now,.02);set(slot.presence.gain,reduced?-8:0,now,.02);
  },
  anticipation(active){if(active===vacuumActive)return;vacuumActive=active;const now=ctx.currentTime;for(const category of ['ambience','drone','magic','sfx']){const ducked=['ambience','drone'].includes(category)&&now<duckUntil?.5:1;const compressed=hitstopActive&&['magic','sfx'].includes(category)?.18:1;set(buses[category].duck.gain,active?.015:ducked*compressed,now,active?.008:.03);}},
  hitstop(active){hitstopActive=active;const now=ctx.currentTime;for(const category of ['sfx','impact','magic'])set(buses[category].duck.gain,vacuumActive&&category!=='impact'?.015:active?.18:1,now,active?.006:.025);},
  metrics(){analyser.getFloatTimeDomainData(meterData);let peak=0,sum=0;for(const x of meterData){peak=Math.max(peak,Math.abs(x));sum+=x*x;}
   return {peak,rms:Math.sqrt(sum/meterData.length),limiter:limiterKind,ceilingDb:limiterKind==='lookahead-brickwall'?-1.8:-2,limiterReductionDb:limiterStats.reduction,compressorReductionDb:compressor.reduction,limiterBlocks:limiterStats.blocks,preset,adaptive,pooledNodes:nodes.size,irBuffers:irCache.size,baseLatency:ctx.baseLatency??null,outputLatency:ctx.outputLatency??null,estimatedUnderruns:null};},
  capture(){const tap=ctx.createMediaStreamDestination();limiter.connect(tap);return {stream:tap.stream,disconnect(){limiter.disconnect(tap);tap.disconnect();}};},
  flush(){const now=ctx.currentTime;set(wetOut.gain,0,now,.012);const buffer=convolver.buffer;convolver.buffer=null;convolver.buffer=buffer;set(wetOut.gain,.28,now+.7,.15);},
  dispose(){disposed=true;limiter.port&&(limiter.port.onmessage=null);for(const n of nodes)n.disconnect();nodes.clear();irCache.clear();},
 };
}
