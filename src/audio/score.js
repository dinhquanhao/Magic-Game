import {ELEMENT_AUDIO} from './cues/registry.js';
// Constants below are paired with source references. They describe existing VFX
// events, and never feed timing back into the game's simulation.
export function buildSkillScore(skill,plan) {
 const element=skill.id.split('-')[0],end=skill.runeTower.timelineEnd,impact=plan.impactAt;
 const events=[],add=(role,at,key,options={})=>{if(at>=0&&at<end)events.push({key:key||`${role}-${events.length}`,role,at,variant:events.length%4,gain:1,...options});};
 const settings=skill.rays||skill.bloodChainNet||skill.lightningStorm||skill.iceField||skill.poisonAcid||skill.spaceBlackHole||skill.shadowOrbCataclysm;
 add('casting',0,'release',{source:'main.js channel→active'});
 add('motion',.02,'formation-motion',{source:'main.js animateRelease'});
 for(const [i,wave] of (settings?.waves||[]).entries()) {
  const count=settings.waves.length,progress=(i+1)/count;
  add('material',wave.start,`wave-${i}`,{gain:.25+progress*.5,pitch:1+i*.025,density:1+i,source:`${skill.shape}.waves[${i}].start`,region:true});
  add('secondary',wave.start+Math.min(.18,(wave.duration||wave.spread||.4)*.15),`wave-detail-${i}`,{gain:.3+progress*.45,source:'cluster near wave emission, not individual GPU collision',region:true,domain:true});
 }
 if(skill.oceanDominion){const c=skill.oceanDominion;
  add('material',2.35,'gate',{source:'ocean-dominion.js gateOpen(2.35,...)'});add('motion',4.65,'whale-swim',{source:'ocean-dominion.js swimStart=4.65'});
  for(let i=0;i<c.tide.secondaryWaves;i++)add('material',impact+1+i*.72,`tide-${i}`,{gain:.7+i*.1,region:true,source:'ocean-dominion.js surgeTimes'});
 }
 if(skill.earthMeteor){add('material',impact-skill.earthMeteor.meteor.descentTime,'meteor-descent',{source:'earth-meteor.js descentStart'});
  for(const [i,offset]of skill.earthMeteor.aftershock.times.entries())add('shockwave',impact+offset,`ground-aftershock-${i}`,{gain:Math.pow(.55,i+1),region:true,source:'earthMeteor.aftershock.times'});
 }
 if(skill.tornado){add('material',impact,'touchdown',{source:'tornado.touchdownTime',gain:.6});
  for(let i=0;i<3;i++)add('motion',impact+skill.tornado.runeTower.fadeDuration+i*2,`vortex-travel-${i}`,{gain:.6,region:true,source:'main.js travelTime begins after touch+fade'});
 }
 if(skill.timeDomain){const chimes=skill.timeDomain.chimes;
  add('rune',chimes.first,'time-first',{source:'timeDomain.chimes.first'});
  chimes.expansion.forEach((c,i)=>add('rune',c.at,`time-expand-${i}`,{pitch:1+i*.125,gain:.7+i*.1,source:'timeDomain.chimes.expansion'}));
  for(let i=0;i<chimes.stasis.count;i++)add('rune',chimes.stasis.start+i*chimes.stasis.interval,`time-stasis-${i}`,{gain:.45,source:'timeDomain.chimes.stasis'});
  add('secondary',chimes.finale.at+skill.timeDomain.shell.crackDuration,'time-catchup',{pitch:1.7,gain:.5,source:'shell crackDuration + domain release'});
 }
 if(skill.shape==='phoenixDive')for(let i=0;i<4;i++)if(1.3+i*.72<impact-.45)add('motion',1.3+i*.72,`phoenix-beat-${i}`,{gain:.35+i*.09,source:'main.js phoenixShakeBeat'});
 add('riser',Math.max(0,impact-.8),'anticipation',{priority:85,source:'audio-only anticipation of existing impact; does not change VFX'});
 add('impact',impact,'finale',{priority:100,source:'cinematicPlans.impactAt / VFX hit-stop callback',gain:element==='TIME'?.7:1});
 const shockOffsets=skill.oceanDominion?[.04,.16,.28]:skill.shadowOrbCataclysm?[0,.12,.24]:skill.earthMeteor?[.04,.32,.65]:[0,.19,.38];
 shockOffsets.forEach((offset,i)=>add('shockwave',impact+offset,`pressure-${i}`,{gain:.5*Math.pow(.72,i),source:skill.oceanDominion?'ocean-dominion.js shockwaves age':skill.shadowOrbCataclysm?'shadow-orb.js shockwave age':skill.earthMeteor?'earth-meteor.js shockwaves':'main.js makeImpactSuite waves delay',region:true}));
 let after=[];
 if(skill.shadowOrbCataclysm){const a=skill.shadowOrbCataclysm.aftershock;after=Array.from({length:a.count},(_,i)=>a.start+i*a.interval);}
 else if(skill.oceanDominion){const a=skill.oceanDominion.aftershock;after=Array.from({length:a.count},(_,i)=>impact+1.05+i*a.interval);}
 else if(skill.iceField)after=Array.from({length:3},(_,i)=>impact+.76+i*.7);
 else if(skill.poisonAcid)after=Array.from({length:3},(_,i)=>impact+.78+i*.7);
 else if(skill.rays)after=Array.from({length:3},(_,i)=>12.35+i*.72);
 else if(!skill.earthMeteor&&!skill.timeDomain&&!skill.spaceBlackHole&&!skill.lightningStorm)after=Array.from({length:3},(_,i)=>impact+.62+i*.32);
 after.forEach((at,i)=>add('secondary',at,`aftershock-${i}`,{gain:.5*Math.pow(.55,i),source:'existing module aftershock array',region:true}));
 add('aftermath',Math.min(impact+.45,end-.1),'decay',{source:'audio tail follows existing aftermath; truncated by cleanup'});
 return {id:skill.id,name:skill.vi,element,identity:ELEMENT_AUDIO[element],chargePace:skill.pace,channelDuration:.58+skill.pace*.26,impact,end,
  fadeAt:skill.runeTower.fadeAt??skill.runeTower.fadeStart*end,hitstop:plan.hitStop,preSlow:plan.preSlowDuration,shake:plan.shake,
  events:events.sort((a,b)=>a.at-b.at),ideas:[
   {idea:`Rune cộng hưởng theo cấp của ${skill.vi}`,implemented:true,method:'actual tower progress → tier note; seeded modal frequency'},
   {idea:settings?.waves?`Độ dày tăng theo ${settings.waves.length} đợt thật`:`Đường chuyển động ${skill.shape} có cue riêng`,implemented:true,method:'existing waves/beat/descent markers; gain/pitch/round robin'},
   {idea:`Trường âm ${element} trải trên AOE`,implemented:true,method:'regional clusters within actual AOE and stereo-linked dry/wet; mono-safe core'},
   {idea:'Đọc lại mọi va chạm GPU để phát từng hạt',implemented:false,reason:'No GPU collision event readback; would stall rendering and produce excessive voices. Cluster at known wave markers instead.'},
  ]};
}
export class ScoreScheduler {
 constructor(){this.reset();}
 reset(){this.id=null;this.seen=new Set();this.lastPhase=null;this.lastTier=-1;this.lastTime=0;}
 update(frame,rate=1,adopt=false) {
  if(!frame?.id){this.reset();return {events:[],loops:[]};}
  if(this.id!==frame.id){this.reset();this.id=frame.id;}
  const events=[],score=frame.score,t=frame.time||0;
  if(!score)return {events,loops:[]};
  const emit=e=>{if(this.seen.has(e.key))return;this.seen.add(e.key);if(!adopt)events.push(e);};
  if(frame.phase!=='active') {
   if(!this.lastPhase)emit({key:'precast',role:'precast',at:0});
   const tier=Math.min(frame.tiers||8,Math.floor((frame.towerProgress||0)*(frame.tiers||8)));
   if(tier>this.lastTier){this.lastTier=tier;emit({key:`tier-${tier}`,role:'rune',at:0,pitch:2**(tier/12),gain:.6});}
   this.lastPhase=frame.phase;return {events,loops:['charging','environment','drone']};
  }
  const horizon=rate>0?Math.min(.025*rate,.04):0;
  for(const e of score.events)if(!this.seen.has(e.key)&&e.at<=t+horizon){
   if(e.at<t-.04&&(this.lastPhase!=='active'||t-this.lastTime>.15))this.seen.add(e.key);else emit(e);
  }
  this.lastPhase=frame.phase;this.lastTime=t;
  const loops=[];
  if(t<score.impact-.09)loops.push('traveling');
  if(t<score.fadeAt)loops.push('environment','drone');
  return {events,loops};
 }
}
