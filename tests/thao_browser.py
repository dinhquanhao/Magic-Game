"""Real WebGL evidence for the forest skill; no test API is shipped."""
import argparse,base64,json
from pathlib import Path
from playwright.sync_api import sync_playwright
from playwright_smoke import HOOK

p=argparse.ArgumentParser();p.add_argument('--url',default='http://127.0.0.1:5183/');p.add_argument('--output',default='/workspace/work/thao-task/browser-1');p.add_argument('--quality',default='Low');p.add_argument('--stress',action='store_true');p.add_argument('--integration',action='store_true');a=p.parse_args()
out=Path(a.output);out.mkdir(parents=True,exist_ok=True)
extra=r'''
window.__natureQA={
 choose(q){if(effect){scene.remove(effect);disposeTree(effect);effect=null;graphics.resetSurface();}config.quality=q;config.qualityScale={Low:.35,Medium:.62,High:1,Ultra:1.4}[q];graphics.applyQuality(q,{...GRAPHICS_PRESETS[q],adaptive:false});document.querySelector('#qualityPreset').value=q;renderSkills(14);select(skillDefs.findIndex(s=>s.id==='NATURE-01'));sound.disable();return this.state();},
 state(){return {...__magicQA.snapshot(),runes:config.runes,runeObjects:effect?.userData.ritual?.children.length||0,nature:effect?.userData.attack?.diagnostics?.(),timeScale:timeScaleController.phase==='idle'?1:timeScaleController.phase==='freeze'?0:timeScaleController.scale,controllerPhase:timeScaleController.phase,binds:playable.dummies.map(d=>d.natureBind||0),hits:playable.dummies.map(d=>d.hit)};},
 frame(time){__magicQA.sample(skillDefs.findIndex(s=>s.id==='NATURE-01'),time);return this.state();},
 advance(from,to){const render=composer.render;composer.render=()=>{};try{for(let t=from;t<=to;t+=.04){effect.userData.activeTime=t;effect.userData.attack.update(t,config.intensity,vfxConfig.density,.04);}}finally{composer.render=render;}return this.frame(to);},
 casting(){__magicQA.charging();return this.state();},
 baseline(){if(effect){scene.remove(effect);disposeTree(effect);effect=null;}graphics.resetSurface();renderer.toneMappingExposure=1.2;camera.position.set(19,18,24);controls.target.set(0,4.5,0);controls.update();elapsed=42;graphics.update(42,camera,false);composer.render();return canvas.toDataURL('image/png').split(',')[1];},
 image(){composer.render();return canvas.toDataURL('image/png').split(',')[1];},
 pause(value){config.paused=value;animate();return this.state();},
 reduced(value){config.reducedMotion=value;return this.frame(8.);},
 play(){if(!playMode)setPlayMode(true);select(skillDefs.findIndex(s=>s.id==='NATURE-01'));config.runes=true;config.cinematicCamera=false;config.cameraMode='orbit';mana=100;cooldowns.fill(0);cast(new THREE.Vector3(9,0,-7));return this.frame(8.2);},
 clocked(){config.runes=true;config.hitStop=true;config.slowMotion=true;config.cameraShake=false;config.reducedMotion=false;config.auto=false;config.paused=false;cast();const render=composer.render;composer.render=()=>{};const scales=[];const phases=new Set();try{for(let i=0;i<1100&&effect;i++){animate();scales.push(this.state().timeScale);phases.add(effect?.userData.phase);}}finally{composer.render=render;}animate();return {scales:[Math.min(...scales),Math.max(...scales)],phases:[...phases],state:this.state()};},
 measure(){composer.render();const samples=[];for(let i=0;i<8;i++){const start=performance.now();composer.render();renderer.getContext().finish();samples.push(performance.now()-start);}return {samplesMs:samples,pixelRatio:renderer.getPixelRatio(),method:'fixed peak state, render+gl.finish, SwiftShader; excludes UI/simulation and is not native GPU FPS'};},
 failTime(){try{effect.userData.attack.update(NaN);}catch(e){return String(e);}return null;}
};
'''
result={'passed':False,'quality':a.quality,'errors':[],'warnings':[],'frames':[],'checks':{},'measurement':'SwiftShader browser; no native GPU FPS claim'}
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']);page=b.new_page(viewport={'width':1100,'height':740});page.set_default_timeout(60000)
 page.on('pageerror',lambda e:result['errors'].append(str(e)));page.on('console',lambda m:result['errors' if m.type=='error' else 'warnings'].append(m.text) if m.type in ['error','warning'] else None)
 def intercept(r):
  response=r.fetch();source=response.text().replace('requestAnimationFrame(animate);','').replace('select(0);animate();','select(0);');r.fulfill(response=response,body=source+'\n'+HOOK+extra)
 page.route('**/src/main.js*',intercept)
 def check(state):
  assert state['badPrograms']==0 and state['glError']==0 and not state['badTransforms'],state
  assert state['graphics']['quality']==a.quality,state
  return state
 def capture(name):
  (out/(name+'.png')).write_bytes(base64.b64decode(page.evaluate('__natureQA.image()')))
 try:
  page.goto(a.url,wait_until='networkidle');skills=page.evaluate('__magicQA.skills');assert len(skills)==21 and len(set(s['element'] for s in skills))==15
  page.locator('[data-element="14"]').click();assert page.locator('#spellTitle').inner_text().endswith('Vạn Mộc Sinh Giới');assert page.locator('[data-spell]').count()==1
  page.evaluate('(q)=>__natureQA.choose(q)',a.quality)
  baseline=page.evaluate('__natureQA.baseline()');(out/'baseline.png').write_bytes(base64.b64decode(baseline))
  page.evaluate('(q)=>__natureQA.choose(q)',a.quality)
  s=check(page.evaluate('__natureQA.casting()'));capture('cast');result['frames'].append({'phase':'cast','state':s})
  s=check(page.evaluate('__natureQA.frame(3.6)'));capture('growth');result['frames'].append({'phase':'growth','state':s})
  s=check(page.evaluate('__natureQA.advance(3.6,8.2)'));capture('attack');result['frames'].append({'phase':'attack','state':s});assert all(s['nature']['hits'][k]>0 for k in ['root','spike','branch','fruit']),s
  assert s['nature']['retargets']<40,s
  result['checks']['peakRenderTiming']=page.evaluate('__natureQA.measure()')
  before=page.evaluate('__natureQA.state().nature.time');page.evaluate('__natureQA.pause(true)');page.evaluate('__magicQA.tick(4)');assert page.evaluate('__natureQA.state().nature.time')==before;page.evaluate('__natureQA.pause(false)');result['checks']['pauseResume']=True
  s=check(page.evaluate('__natureQA.frame(16)'));capture('aftermath');result['frames'].append({'phase':'aftermath','state':s})
  check(page.evaluate('__natureQA.frame(18.2)'));after=page.evaluate('__natureQA.baseline()');(out/'restored.png').write_bytes(base64.b64decode(after));result['checks']['surfaceRestoreExactPixels']=baseline==after;assert baseline==after,'Restored canvas differs from fixed-time baseline'
  result['checks']['cleanup']=page.evaluate('__natureQA.state()');assert result['checks']['cleanup']['graphics']['surfaceNature']==0 and result['checks']['cleanup']['graphics']['fields']['activeLights']==0
  if a.stress:
   memories=[]
   for i in range(10):
    page.evaluate('(q)=>__natureQA.choose(q)',a.quality);check(page.evaluate('__natureQA.frame(8.2)'));page.evaluate('__natureQA.baseline()');memories.append(page.evaluate('__natureQA.state().memory'))
   result['checks']['tenCasts']=memories;assert memories[-1]['geometries']<=memories[0]['geometries']+1 and memories[-1]['textures']<=memories[0]['textures']+1,memories
   for i in [0,20,3,20,8,20]:page.evaluate('(i)=>__magicQA.sample(i,.1)',i)
   result['checks']['rapidSelection']=True
   page.evaluate('(q)=>__natureQA.choose(q)',a.quality);page.evaluate('__natureQA.reduced(true)');check(page.evaluate('__natureQA.state()'));result['checks']['reducedMotion']=True
   assert 'not finite' in page.evaluate('__natureQA.failTime()');page.evaluate('__natureQA.baseline()');result['checks']['nanGuardCleanup']=True
  if a.integration:
   page.evaluate('(q)=>__natureQA.choose(q)',a.quality)
   s=check(page.evaluate('__natureQA.play()'));capture('play-mode');assert s['playMode'] and s['runes'] and s['runeObjects']>0 and s['nature']['trees']>0;snap=page.evaluate('__magicQA.snapshot()');result['checks']['playModeRuneTower']=snap
   check(page.evaluate('__natureQA.frame(18.2)'));page.locator('#replayButton').click();assert page.evaluate('__natureQA.state().phase')=='charging';page.locator('#resetButton').click();s=check(page.evaluate('__natureQA.state()'));assert not s['active'] and all(v==0 for v in s['binds']) and s['graphics']['surfaceNature']==0;result['checks']['replayReset']=True
   page.locator('#modeToggle').click();check(page.evaluate('__natureQA.frame(8.2)'))
   c=page.evaluate('__natureQA.clocked()');result['checks']['worldClockHitStopRuneTower']=c;check(c['state']);assert not c['state']['active'] and c['state']['timeScale']==1 and c['scales'][0]==0 and all(x in c['phases'] for x in ['charging','channeling','active']);result['checks']['worldClockHitStopRuneTower']=c
  assert not result['errors'],result['errors'];result['passed']=True
 except Exception as e:
  result['failure']=str(e)
  try:page.screenshot(path=str(out/'failure.png'),timeout=5000)
  except Exception:pass
  raise
 finally:(out/'results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));b.close()
print(json.dumps({'passed':result['passed'],'quality':a.quality,'checks':list(result['checks'])}))
