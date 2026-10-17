import {CueTimeline} from './legacy-timeline.js';
import {ScoreScheduler} from './score.js';
import {CUE_REGISTRY,CUE_ROLES,getCue} from './cues/registry.js';
import {renderCue} from './synthesis.js';
import {CUE_CALIBRATION} from './cues/calibration.js';
import {createMixer,idle} from './mixer.js';
import {loadSettings,saveSettings,sanitizeSettings,dbGain,AUDIO_PRESETS} from './settings.js';
export {CueTimeline} from './legacy-timeline.js';
const CUES=['precast','charging','casting','traveling','impact','shockwave','aftermath'];
const LEVELS={precast:.13,charging:.12,casting:.22,traveling:.14,impact:.5,shockwave:.24,aftermath:.16};
const PRIORITY={impact:100,casting:80,shockwave:65,precast:55,charging:50,traveling:40,aftermath:30,ambient:5,drone:3,ui:60};
export function createSpellAudio({onStatus=()=>{},manifestUrl='/assets/audio/manifest.json'}={}) {
 let ctx,mixer,initPromise,enabled=false,disposed=false,hidden=false,paused=false,hitstop=false,settings=loadSettings(),quality='High';
 let manifest,manifestPromise,selection,loading,castId,frame,adopt=true,ambientEnabled=false,transition=Promise.resolve(),lastPose={position:[0,0,34],forward:[0,0,-1],up:[0,1,0]};
 let fallbackCount=0,maxVoices=0,decodedBytes=0,updateCost=0,deviceChanges=0,lastRate=1;
 const eventWindows=new Map(),roundRobin=new Map();
 const timeline=new CueTimeline(),scheduler=new ScoreScheduler(),scores=new Map(),banks=new Map(),voices=new Set(),loops=new Map(),history=[];
 const state={status:'Chạm để bật âm thanh',errors:[],pending:0};
 const status=text=>{state.status=text;onStatus(text);};
 function fail(error){const text=String(error?.message||error);if(state.errors.at(-1)!==text){state.errors.push(text);if(state.errors.length>10)state.errors.shift();}enabled=false;status('Âm thanh tạm tắt · chạm để thử lại');stopCast();syncContext();}
 function syncContext(){if(!ctx||disposed)return;transition=transition.then(async()=>{if(disposed||ctx.state==='closed')return;if(enabled&&!hidden&&!paused){if(ctx.state!=='running')await ctx.resume();}else if(ctx.state==='running')await ctx.suspend();}).catch(error=>{state.status='Chạm để tiếp tục âm thanh';state.errors.push(String(error));});}
 async function init(){
  const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio)throw new Error('WebAudio unavailable');
  if(!ctx){ctx=new Audio({latencyHint:'interactive'});ctx.onstatechange=()=>{if(!disposed)status(ctx.state==='running'?'Âm thanh sẵn sàng':ctx.state==='suspended'?'Âm thanh tạm dừng':ctx.state==='interrupted'?'Thiết bị âm thanh gián đoạn · chạm để tiếp tục':'Âm thanh đã đóng');};}
  await ctx.resume();mixer=await createMixer(ctx,settings,quality);
  // A silent one-shot warms the graph using the existing context.
  const warm=ctx.createBufferSource();warm.buffer=ctx.createBuffer(1,128,ctx.sampleRate);const slot=mixer.slots[0];mixer.route(slot,'ui',0);warm.connect(slot.envelope);warm.onended=()=>warm.disconnect();warm.start();
  navigator.mediaDevices?.addEventListener('devicechange',onDeviceChange);
 }
 function onDeviceChange(){deviceChanges++;syncContext();}
 function getManifest(){if(!manifestPromise)manifestPromise=fetch(manifestUrl).then(r=>{if(!r.ok)throw new Error(`Manifest ${r.status}`);return r.json();}).then(m=>(manifest=m)).catch(e=>{manifestPromise=null;throw e;});return manifestPromise;}
 function fallback(element,cue){fallbackCount++;const n=Math.ceil(ctx.sampleRate*.5),b=ctx.createBuffer(1,n,ctx.sampleRate),data=b.getChannelData(0),f=manifest?.elements[element]?.baseFrequency||110;for(let i=0;i<n;i++)data[i]=.15*Math.sin(2*Math.PI*f*i/ctx.sampleRate)*Math.sin(Math.PI*i/n)**2;return b;}
 function evict(){const budget=mixer?.budget||AUDIO_PRESETS[quality];decodedBytes=[...banks.values()].reduce((n,b)=>n+Object.values(b).reduce((s,v)=>s+v.length*v.numberOfChannels*4,0),0);while(banks.size>budget.banks||decodedBytes>budget.bytes){const first=banks.keys().next().value;if(first===selection&&banks.size===1)break;const bank=banks.get(first);decodedBytes-=Object.values(bank).reduce((s,v)=>s+v.length*v.numberOfChannels*4,0);banks.delete(first);}}
 async function renderBuffer(cue,variant=0) {
  const signal=renderCue(cue,{variant,grains:(mixer?.budget||AUDIO_PRESETS[quality]).grains,...CUE_CALIBRATION[cue.id]});
  if(['precast','charging','rune','ui'].includes(cue.role)&&globalThis.AudioBuffer){const buffer=new AudioBuffer({numberOfChannels:1,length:signal.length,sampleRate:24000});buffer.copyToChannel(signal,0);return buffer;}
  const Offline=globalThis.OfflineAudioContext||globalThis.webkitOfflineAudioContext;
  if(Offline){const offline=new Offline(1,signal.length,24000),source=offline.createBufferSource(),hp=offline.createBiquadFilter();
   const input=offline.createBuffer(1,signal.length,24000);input.copyToChannel(signal,0);source.buffer=input;hp.type='highpass';hp.frequency.value=22;source.connect(hp);hp.connect(offline.destination);source.start();return await offline.startRendering();}
  const buffer=ctx?ctx.createBuffer(1,signal.length,24000):new AudioBuffer({numberOfChannels:1,length:signal.length,sampleRate:24000});buffer.copyToChannel(signal,0);return buffer;
 }
 async function loadBank(element,prewarm=false){
  if(disposed||(!enabled&&!prewarm))return;
  if(loading&&loading.element!==element){loading.controller.abort();if(loading.partial)banks.delete(loading.element);}
  if(loading?.element===element)return loading.promise;
  if(banks.has(element)){const bank=banks.get(element);banks.delete(element);banks.set(element,bank);return bank;}
  loading?.controller.abort();const task={element,controller:new AbortController(),partial:true};loading=task;
  task.promise=(async()=>{
   const bank={};banks.set(element,bank);const priority=['precast','charging','rune','ui','impact'];for(const cue of CUE_REGISTRY.filter(c=>c.element===element).sort((a,b)=>(priority.includes(a.role)?priority.indexOf(a.role):99)-(priority.includes(b.role)?priority.indexOf(b.role):99))){
    const variants=cue.repeated?(mixer?.budget||AUDIO_PRESETS[quality]).variants:1;
    for(let variant=0;variant<variants;variant++){
     if(task.controller.signal.aborted||disposed)return;if(!['precast','charging'].includes(cue.role))await idle();if(disposed||task.controller.signal.aborted)return;
     try{bank[variant?cue.role+'#'+variant:cue.role]=await renderBuffer(cue,variant);}
     catch{if(task.controller.signal.aborted||disposed)return;bank[variant?cue.role+'#'+variant:cue.role]=fallback(element,cue.role);}
    }
   }
   if(task.controller.signal.aborted||disposed)return;task.partial=false;banks.set(element,bank);evict();if(enabled)status(fallbackCount?'Âm thanh sẵn sàng · có dự phòng':'Âm thanh sẵn sàng');return bank;
  })().finally(()=>{if(loading===task)loading=null;});return task.promise;
 }
 function cleanup(v){if(!voices.delete(v))return;v.source.onended=null;v.source.disconnect();if(v.slot.voice===v){v.slot.voice=null;v.slot.busy=false;v.slot.envelope.gain.cancelScheduledValues(ctx.currentTime);v.slot.envelope.gain.value=0;}if(loops.get(v.key)===v)loops.delete(v.key);}
 function retire(v,fade=.05){if(!voices.has(v))return;const now=ctx.currentTime;
  if(v.start>now+.001){try{v.source.stop(now);}catch{}cleanup(v);return;}
  const at=Math.min(v.stopAt||Infinity,now+fade);v.retiring=true;v.stopAt=at;
  if(v.slot.voice===v){const param=v.slot.envelope.gain;param.cancelScheduledValues(now);param.setTargetAtTime(0,now,Math.max(.003,fade/5));param.linearRampToValueAtTime(0,at);}
  try{v.source.stop(at);}catch{}if(!fade)cleanup(v);
 }
 function stopCast(immediate=false){for(const v of [...voices])if(v.kind!=='ambient')retire(v,immediate?0:.05);for(const [key,v]of loops)if(v.kind!=='ambient')loops.delete(key);timeline.reset();scheduler.reset();eventWindows.clear();castId=null;mixer?.flush();}
 function allocate(priority){
  const reserved=new Set([...voices].map(v=>v.slot));let slot=mixer.slots.find(s=>!reserved.has(s)),when=ctx.currentTime;
  if(reserved.size>=mixer.limit||!slot){
   const candidates=[...voices].filter(v=>v.slot.voice===v||v.retiring).sort((a,b)=>a.priority-b.priority||a.start-b.start);
   const victim=candidates[0];if(!victim||victim.priority>priority)return null;slot=victim.slot;
   retire(victim,priority>=90?.018:.04);
   for(const old of voices)if(old.slot===slot)when=Math.max(when,(old.stopAt||old.start)+.001);
  }
  return {slot,when};
 }
 function play(cue,bank,f,rate=1,loop=false,options={}) {
  if(!enabled||disposed||!mixer||!bank?.[cue])return;
  const metadata=getCue(f?.element||selection,cue);
  const key=options.key||cue,now=ctx.currentTime,window=eventWindows.get(cue)||{at:now,count:0};
  if(now-window.at>.12){window.at=now;window.count=0;}if(window.count>=3&&!options.unthrottled)return;window.count++;eventWindows.set(cue,window);
  const kind=options.kind||cue,priority=options.priority??metadata?.priority??PRIORITY[cue]??50,allocated=allocate(priority);if(!allocated)return;
  const {slot}=allocated,when=Math.max(allocated.when,options.when||0),source=ctx.createBufferSource();
  const index=roundRobin.get(cue)||0;roundRobin.set(cue,index+1);const variation=metadata?.repeated?index%mixer.budget.variants:0;source.buffer=bank[variation?cue+'#'+variation:cue]||bank[cue];source.loop=loop;source.playbackRate.value=Math.max(.02,Math.min(3,rate*(options.pitch||1)));
  const reduced=settings.reduced||f?.reduced;const level=(metadata?(cue==='impact'?.85:cue==='riser'?.55:cue==='drone'?.35:.6):(LEVELS[cue]||.12))*(options.gain??1)*(cue==='impact'?settings.impact*(reduced?.6:1):1);
  const category=options.category||(cue==='impact'?'impact':['charging','traveling'].includes(cue)?'magic':cue==='ambient'?'ambience':cue==='drone'?'drone':cue==='ui'?'ui':'sfx');
  mixer.route(slot,options.category||metadata?.category||category,options.wet??metadata?.wet??.15);
  const param=slot.envelope.gain;param.cancelScheduledValues(when);param.setValueAtTime(0,when);param.linearRampToValueAtTime(level,when+.009);
  source.connect(slot.envelope);const v={source,slot,cue,key,kind,start:when,rate,pitch:options.pitch||1,priority,domain:metadata?.domain,region:options.region,offset:options.position,frameId:f?.id,retiring:false};slot.busy=true;slot.voice=v;voices.add(v);if(loop)loops.set(key,v);
  source.onended=()=>cleanup(v);source.start(when,options.offset||0);
  if(cue==='impact')mixer.duck(6,.45);if(cue==='riser')mixer.duck(5,.8);
  const position=options.position||f?.center||[0,0,0],distance=Math.hypot(...position.map((x,i)=>x-lastPose.position[i]));mixer.spatial(slot,position,distance,rate);
  maxVoices=Math.max(maxVoices,[...voices].filter(v=>!v.retiring).length);
  history.push({cast:f?.id,element:f?.element,cue,key,time:f?.time||0,target:options.target??(f?.time||0),scheduledAt:when,requestedAt:ctx.currentTime,schedulingErrorMs:(when-(ctx.currentTime+((options.target??f?.time??0)-(f?.time||0))/Math.max(.02,rate)))*1000,variant:variation,rate:source.playbackRate.value,category});if(history.length>1000)history.shift();return v;
 }
 async function enable(){if(disposed)return false;try{enabled=true;adopt=true;if(!initPromise)initPromise=init();else await ctx.resume();await initPromise;syncContext();await loadBank(selection);if(ambientEnabled)void setAmbient(true);return true;}catch(error){fail(error);return false;}}
 function disable(){enabled=false;stopCast(true);for(const v of [...voices])retire(v,0);syncContext();status('Âm thanh đã tắt');}
 function setSelection(element){if(selection!==element){stopCast();selection=element;}void loadBank(element,true).catch(error=>{if(enabled)fail(error);});}
 async function setAmbient(value){ambientEnabled=!!value;for(const v of [...voices])if(v.kind==='ambient')retire(v);if(!enabled||!value||!mixer)return;
  try{const m=await getManifest(),r=await fetch(m.ambient.url);if(!r.ok)throw new Error('Ambient unavailable');const buffer=await ctx.decodeAudioData(await r.arrayBuffer());if(!enabled||!ambientEnabled||disposed)return;play('ambient',{ambient:buffer},null,1,true,{kind:'ambient',key:'ambient',category:'ambience',gain:.4,wet:.25,position:lastPose.position});}catch{status('Nền gió chưa tải được');}
 }
 function update(next,pose,rate=1,isPaused=false){
  if(!enabled||disposed||!mixer)return;
  const start=performance.now();try{
   frame=next;lastPose=pose||lastPose;
   if(paused!==isPaused){paused=isPaused;syncContext();}
   if(paused||hidden)return;
   if(hitstop!==(rate===0)){hitstop=rate===0;mixer.hitstop(hitstop);}
   mixer.listener(lastPose);
   if(!frame){if(castId)stopCast();return;}
   if(castId!==frame.id){stopCast();castId=frame.id;}
   frame.score=frame.score||scores.get(frame.skillId);
   if(rate!==lastRate){for(const v of [...voices])if(v.start>ctx.currentTime+.002){scheduler.seen.delete(v.key);retire(v,0);}lastRate=rate;}
   const usingScore=!!frame.score,markers=usingScore?scheduler.update(frame,rate,adopt):timeline.update(frame,adopt);adopt=false;
   const vacuum=usingScore&&frame.phase==='active'&&frame.time>=frame.score.impact-.09&&frame.time<frame.score.impact;
   mixer.anticipation(vacuum);
   const effective=rate===0?.2:Math.max(.02,rate),bank=banks.get(frame.element);
   for(const v of voices)if(!v.retiring&&v.kind!=='ambient'){
    const p=v.offset||(['charging','rune','precast'].includes(v.cue)?frame.caster:frame.center)||[0,0,0];
    const distance=Math.hypot(...p.map((x,i)=>x-lastPose.position[i]));
    let doppler=1;if(settings.doppler&&!settings.reduced&&!frame.reduced&&v.previousDistance!==undefined){const delta=Math.max(.01,ctx.currentTime-v.previousAt),velocity=Math.max(-40,Math.min(40,(distance-v.previousDistance)/delta));doppler=Math.max(.9,Math.min(1.1,343/(343+velocity*4)));}
    v.previousDistance=distance;v.previousAt=ctx.currentTime;
    const domain=v.domain?Math.max(.02,frame.domainFactor??1):1;
    v.source.playbackRate.setTargetAtTime(effective*domain*doppler*v.pitch,ctx.currentTime,.025);mixer.spatial(v.slot,p,distance,effective*domain,settings.reduced||frame.reduced);
    if(v.cue==='charging'&&frame.towerProgress!==undefined)v.slot.envelope.gain.setTargetAtTime(.2+.4*frame.towerProgress,ctx.currentTime,.03);
    if(v.cue==='environment'&&frame.wind!==undefined)v.slot.envelope.gain.setTargetAtTime(.25+frame.wind*.35,ctx.currentTime,.05);
   }
   for(const [key,v]of loops)if(!['ambient'].includes(v.kind)&&!markers.loops.includes(key))retire(v);
   {
    for(const event of markers.events){
     if(typeof event==='string'){play(event,bank,frame,effective);continue;}
     const due=ctx.currentTime+Math.max(0,event.at-frame.time)/effective;
     const angle=(event.variant||0)*2.39996,region=event.region&&settings.spatial,position=region?[(frame.center?.[0]||0)+Math.cos(angle)*(frame.radius||12)*.28,frame.center?.[1]||0,(frame.center?.[2]||0)+Math.sin(angle)*(frame.radius||12)*.28]:undefined;
     play(event.role,bank,frame,effective,false,{...event,key:event.key,when:due,target:event.at,position});
    }
    for(const cue of markers.loops)if(!loops.has(cue))play(cue,bank,frame,effective,true,{key:cue,kind:cue,gain:cue==='drone'?.35:1});
   }
  }catch(error){fail(error);}finally{updateCost=performance.now()-start;}
 }
 function configure(values){settings=sanitizeSettings({...settings,...values});saveSettings(settings);mixer?.applySettings(settings);return {...settings};}
 function diagnostics(){const m=mixer?.metrics()||{peak:0,rms:0};return {...m,enabled,sampleRate:ctx?.sampleRate||0,state:ctx?.state||'uninitialized',status:state.status,currentTime:ctx?.currentTime||0,volume:settings.mute?0:dbGain(settings.masterDb),muted:!enabled||settings.mute||settings.masterDb<=-60,settings:{...settings},activeVoices:[...voices].filter(v=>!v.retiring).length,retiringVoices:[...voices].filter(v=>v.retiring).length,liveSources:voices.size,voiceLimit:mixer?.limit||0,maxVoices,banks:[...banks.keys()],decodedBytes,fallbacks:fallbackCount,loading:!!loading,history:[...history],rates:[...voices].filter(v=>!v.retiring).map(v=>v.source.playbackRate.value),center:frame?.center||null,listener:lastPose.position,ambient:[...voices].some(v=>v.kind==='ambient'&&!v.retiring),cast:frame?.id||null,sourcePositions:[...voices].filter(v=>!v.retiring).map(v=>[v.slot.panner.positionX.value,v.slot.panner.positionY.value,v.slot.panner.positionZ.value]),updateCostMs:updateCost,deviceChanges,errors:[...state.errors],pending:[...voices].filter(v=>v.start>(ctx?.currentTime||0)&&!v.retiring).length};}
 return {
  get enabled(){return enabled;},enable,disable,update,stopCast,setSelection,diagnostics,configure,
  registerScores(list){for(const score of list)scores.set(score.id,score);},
  init:enable,ready:async()=>{if(initPromise)await initPromise;return loading?.promise||(enabled?loadBank(selection):banks.get(selection));},
  setQuality(value){if(value===quality)return;quality=value;mixer?.setQuality(value);if(mixer)evict();},
  setVolume(value){configure({masterDb:value<=0?-60:Math.max(-60,Math.min(0,20*Math.log10(value)))});},setAmbient,
  setHidden(value){hidden=!!value;syncContext();},
  reportFrame(cost,dt){mixer?.reportFrame(cost,dt);},
  uiFeedback(){if(!enabled||!settings.ui||!mixer)return;const bank=banks.get(selection);if(bank?.ui)play('ui',bank,{id:'ui',element:selection,time:0,center:lastPose.position},1,false,{key:'ui',category:'ui',wet:0,gain:.18});},
  testSound(){const bank=banks.get(selection);if(bank)play('impact',bank,{id:'test',element:selection,time:0,center:lastPose.position.map((v,i)=>v+(i===2?-12:0))},1,false,{gain:.5});},
  async audition(id,{legacy=false}={}){const cue=CUE_REGISTRY.find(c=>c.id===id);if(!cue)return;await enable();stopCast();setSelection(cue.element);await loadBank(cue.element);let bank=banks.get(cue.element);
   if(legacy){try{const m=await getManifest(),url=m.elements[cue.element]?.cues[cue.role]?.url;if(!url){status('Cue mới không có bản cũ để so A/B');return;}const r=await fetch(url);if(!r.ok)throw new Error('Legacy cue unavailable');bank={[cue.role]:await ctx.decodeAudioData(await r.arrayBuffer())};}catch(error){status(error.message);return;}}
   return play(cue.role,bank,{id:'lab',element:cue.element,time:0,center:lastPose.position.map((v,i)=>v+(i===2?-12:0))},1,false,{gain:.7,unthrottled:true});},
  readAnalysis(time,frequency){if(mixer){mixer.analyser.getFloatTimeDomainData(time);mixer.analyser.getFloatFrequencyData(frequency);}else{time.fill(0);frequency.fill(-Infinity);}},
  createCapture:()=>mixer?.capture(),
  dispose(){if(disposed)return;disable();disposed=true;loading?.controller.abort();banks.clear();decodedBytes=0;history.length=0;mixer?.dispose();navigator.mediaDevices?.removeEventListener('devicechange',onDeviceChange);if(ctx){ctx.onstatechange=null;void ctx.close();}},
 };
}
