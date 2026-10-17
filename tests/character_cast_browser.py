"""Run the real cast loop with a fixed .05s clock; render milestone frames in Chromium."""
import argparse,base64,json
from pathlib import Path
from playwright.sync_api import sync_playwright
from playwright_smoke import HOOK
p=argparse.ArgumentParser();p.add_argument('--url',default='http://127.0.0.1:5183/');p.add_argument('--output',required=True);p.add_argument('--smoke',action='store_true');p.add_argument('--quality',choices=['Low','Medium','High','Ultra']);p.add_argument('--lifecycle',action='store_true');a=p.parse_args()
out=Path(a.output);out.mkdir(parents=True,exist_ok=True)
EXTRA=r'''
window.__characterQA={
 steps:0,
 start(id,q='Low'){
  if(!playMode)setPlayMode(true);
  if(effect){scene.remove(effect);disposeTree(effect);effect=null;}playable.reset();graphics.resetSurface();sound.disable();config.paused=false;
  config.auto=false;config.runes=true;config.castTime=10;config.runeDrawSpeed=1;config.speed=1;config.infiniteMana=true;
  config.quality=q;config.qualityScale={Low:.35,High:1,Medium:.62,Ultra:1.4}[q];graphics.applyQuality(q,{...GRAPHICS_PRESETS[q],adaptive:false});
  select(skillDefs.findIndex(s=>s.id===id));this.steps=0;requestPlayerCast();
  playable.onKeyDown({code:'KeyW'});playable.onKeyDown({code:'KeyD'});
  return this.state();
 },
 tick(n=1,render=true){const original=composer.render;if(!render)composer.render=()=>{};
  try{for(let i=0;i<n;i++){animate();this.steps++;}}finally{composer.render=original;}return this.state();},
 until(phase,at=0){const original=composer.render;composer.render=()=>{};let n=0;
  try{while(effect&&(effect.userData.phase!==phase||(phase==='active'&&effect.userData.activeTime<at-1e-9))&&n++<2500){animate();this.steps++;}}
  finally{composer.render=original;}
  if(n>=2500)throw new Error('cast timeline stuck');composer.render();return this.state();
 },
 state(){const d=effect?.userData,r=playable.character;playable.mage.updateMatrixWorld(true);
  const g=d?.ritual,alphas=[];g?.traverse(o=>{for(const m of (Array.isArray(o.material)?o.material:o.material?[o.material]:[]))if(!m.isShaderMaterial)alphas.push(m.opacity);});
  return {...__magicQA.snapshot(),steps:this.steps,seconds:this.steps*.05,authoredEnd:skillDefs[spell].runeTower.timelineEnd,
   timing:d?.timing??null,worldActive:d?.activeWorldTime??null,runeStart:d?.runeFadeStartedAt??null,runeVisible:g?.visible??false,maxRuneOpacity:Math.max(0,...alphas),
   character:r.root.name,position:playable.motion.position.toArray(),velocity:playable.motion.velocity.toArray(),locked:playable.motion.castLocked,
   modelYaw:playable.mage.rotation.y,headTop:r.headTop.getWorldPosition(new THREE.Vector3()).toArray(),hands:r.hands.map(h=>h.getWorldPosition(new THREE.Vector3()).toArray()),arms:r.arms.map(h=>h.rotation.x),
   feedbackSeconds:document.querySelector('[data-cast-remaining]').textContent};
 },
 poseImage(){camera.position.copy(playable.mage.position).add(new THREE.Vector3(3.5,2.8,-5.6));camera.lookAt(playable.mage.position.x,1.3,playable.mage.position.z);composer.render();return canvas.toDataURL().split(',')[1];},
 sceneImage(){composer.render();return canvas.toDataURL().split(',')[1];},
 input(){playable.onKeyDown({code:'Space'});playable.onKeyDown({code:'KeyQ'});playable.onMouseMove(80,10);playable.toggleLock();},
 configure(values,recast=false){Object.assign(config,values);if(recast)cast();},
 pause(v){config.paused=v;},
 timeMode(phase,scale=1){timeScaleController.phase=phase;timeScaleController.remaining=phase==='idle'?0:20;timeScaleController.total=20;timeScaleController.scale=scale;},
 async audioReady(){if(!sound.enabled)await sound.enable();await sound.ready();this.audio=[];const original=sound.update;sound.update=(frame,pose,rate,paused)=>{this.audio.push({phase:frame?.phase,time:frame?.time,rate,paused});if(this.audio.length>30)this.audio.shift();return original(frame,pose,rate,paused);};},
 audioState(){const d=sound.diagnostics();return {frames:this.audio,rate:d.rates,errors:d.errors,finale:d.history.filter(h=>h.cast===effect?.uuid&&h.key==='finale')};},
 end(){return this.until('idle');}
};
'''
r={'passed':False,'errors':[],'warnings':[],'rows':[],'checks':{},'environment':'Chromium ANGLE/SwiftShader, fixed .05s simulation, milestone rendering; no GPU FPS claim'}
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']);page=b.new_page(viewport={'width':1100,'height':740});page.set_default_timeout(90000)
 page.on('pageerror',lambda e:r['errors'].append(str(e)));page.on('console',lambda m:r['errors' if m.type=='error' else 'warnings'].append(m.text) if m.type in ['error','warning'] else None)
 def route(rt):
  response=rt.fetch();s=response.text().replace('requestAnimationFrame(animate);','').replace('select(0);animate();','select(0);');rt.fulfill(response=response,body=s+'\n'+HOOK+'\n'+EXTRA)
 page.route('**/src/main.js*',route)
 ev=page.evaluate
 def check(s,pose=True):
  assert s['glError']==0 and s['badPrograms']==0 and not s['badTransforms'],s
  if pose and s['active'] and s['seconds']>=1:
   assert s['character']=='UploadedCyberBot' and s['locked'] and s['position']==[0,0,12] and s['velocity']==[0,0,0],s
   assert all(hand[1]>s['headTop'][1]+.05 for hand in s['hands']),s
  return s
 def capture(name,pose=False):
  (out/(name+'.png')).write_bytes(base64.b64decode(ev('__characterQA.poseImage()' if pose else '__characterQA.sceneImage()')))
 try:
  page.goto(a.url,wait_until='networkidle');skills=ev('__magicQA.skills');assert len(skills)==19 and len({s['element'] for s in skills})==15
  if not a.lifecycle:
   for q in [a.quality] if a.quality else ['Low'] if a.smoke else ['Low','High']:
    for skill in skills[:1] if a.smoke else skills:
     id=skill['id'];ev('([id,q])=>__characterQA.start(id,q)',[id,q]);samples=[]
     s=check(ev('__characterQA.tick(20,false)'));samples.append(s)
     if id=='FIRE-01' and q=='Low':capture('charging-pose',True)
     ev('__characterQA.input()');s=check(ev('__characterQA.until("channeling")'));assert abs(s['seconds']-8.5)<.051,s;samples.append(s)
     s=check(ev('__characterQA.until("active")'));pre=s['seconds'];assert abs(pre-10)<.101,s;samples.append(s)
     ev('__characterQA.input()');s=check(ev('__characterQA.until("active",.5)'));assert abs(s['worldActive']-1)<.051,s;samples.append(s)
     if id=='FIRE-01' and q=='Low':capture('active-pose',True)
     s=check(ev('(t)=>__characterQA.until("active",t)',skill['impact']+.05));samples.append(s)
     assert s['feedbackSeconds']!='' and not s['runeVisible'],s
     if q=='Low' and id in ['FIRE-01','WATER-01','TIME-01','NATURE-01']:capture(id.lower()+'-impact',True)
     s=check(ev('(t)=>__characterQA.until("active",t)',skill['end']-.1));samples.append(s)
     assert s['active'] and s['locked'],s
     ended=check(ev('__characterQA.end()'),False);assert not ended['active'],ended
     active_seconds=ended['seconds']-pre;assert abs(active_seconds-2*skill['end'])<=.061,(id,active_seconds,skill['end'])
     released=check(ev('__characterQA.tick(2,false)'),False);assert not released['locked'] and released['position']!=[0,0,12],released
     r['rows'].append({'id':id,'quality':q,'ritualSeconds':pre,'activeSeconds':active_seconds,'expectedActiveSeconds':2*skill['end'],'samples':samples,'cleanup':ended,'movementResumes':True})
     print('PASS',q,id,round(pre,3),round(active_seconds,3),flush=True)
  if a.lifecycle:
   ev('__characterQA.start("FIRE-01")');ev('__characterQA.until("active",.3)');before=check(ev('__characterQA.state()'))
   ev('__characterQA.pause(true)');paused=check(ev('__characterQA.tick(8,false)'));assert paused['time']==before['time'] and paused['worldActive']==before['worldActive'] and paused['arms']==before['arms'];ev('__characterQA.pause(false)');r['checks']['pauseFreezesBothClocksAndPose']=True
   ev('__characterQA.timeMode("freeze")');frozen=check(ev('__characterQA.tick(6,false)'));assert frozen['time']==before['time'] and frozen['worldActive']==before['worldActive'];r['checks']['hitStopFreezesRuneAndAttack']=True
   ev('__characterQA.timeMode("pre",.25)');slow=check(ev('__characterQA.tick(8,false)'));assert abs(slow['time']-frozen['time']-.05)<1e-8 and abs(slow['worldActive']-frozen['worldActive']-.1)<1e-8;r['checks']['quarterSpeedAndDoubleDurationCompose']=True
   ev('__characterQA.timeMode("idle")');faded=check(ev('__characterQA.until("active",1.1)'));assert not faded['runeVisible'] and faded['maxRuneOpacity']==0;r['checks']['fadeRemains1point8SimulationSeconds']=True
   fresh=ev('__characterQA.start("TIME-01")');early=check(ev('__characterQA.until("active",1.8)'));assert early['runeStart'] is None and early['runeVisible'];late=check(ev('__characterQA.until("active",2.85)'));assert not late['runeVisible'] and late['maxRuneOpacity']==0;r['checks']['delayedTimeEffectStillStartsFade']=True
   ev('__characterQA.start("FIRE-01")');page.locator('.audio-options summary').click();ev('__characterQA.audioReady()');ev('__characterQA.until("active",.1)');audio=ev('__characterQA.audioState()');assert abs(audio['frames'][-1]['rate']-.5)<1e-8,audio
   ev('__characterQA.timeMode("pre",.25)');ev('__characterQA.tick(1,false)');assert abs(ev('__characterQA.audioState()')['frames'][-1]['rate']-.125)<1e-8
   ev('__characterQA.pause(true)');ev('__characterQA.tick(1,false)');assert ev('__characterQA.audioState()')['frames'][-1]['rate']==0;ev('__characterQA.pause(false)');ev('__characterQA.timeMode("idle")')
   ev('(t)=>__characterQA.until("active",t)',skills[0]['impact']);audio=ev('__characterQA.audioState()');assert len(audio['finale'])==1 and not audio['errors'],audio;r['checks']['webAudioUsesSamePlaybackRateAndSingleFinale']=audio
   page.locator('#resetButton').click();reset=check(ev('__characterQA.tick(1,false)'),False);assert not reset['active'] and not reset['locked'];r['checks']['resetReleasesPose']=True
   for id in ['NATURE-01','FIRE-01','SHADOW-01','TIME-01','NATURE-01']:
    ev('(id)=>__characterQA.start(id)',id);check(ev('__characterQA.until("active",2)'));check(ev('__characterQA.end()'),False)
   r['checks']['rapidSelectionCleanup']=check(ev('__characterQA.tick(1,false)'),False)
   ev('__characterQA.start("FIRE-01")');ev('__characterQA.until("channeling")');ev('__characterQA.configure({castTime:20})');s=check(ev('__characterQA.until("active")'));assert abs(s['seconds']-10)<.1;r['checks']['sliderChangesOnlyNextCast']=True
   ev('__characterQA.configure({castTime:12,runeDrawSpeed:2},true)');assert ev('__characterQA.state().timing.ritual')==6;r['checks']['timingControlsRemainUsable']=True
  assert not r['errors'],r['errors'];r['passed']=True
 finally:
  (out/'results.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n');b.close()
