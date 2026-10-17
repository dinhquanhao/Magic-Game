"""Camera story: UI/input -> independent view state -> aiming/render; no backend involved."""
import argparse,base64,json
from pathlib import Path
from playwright.sync_api import sync_playwright
from playwright_smoke import HOOK
p=argparse.ArgumentParser();p.add_argument('--url',default='http://127.0.0.1:5187/');p.add_argument('--output',required=True);p.add_argument('--matrix',action='store_true');a=p.parse_args()
out=Path(a.output);out.mkdir(parents=True,exist_ok=True)
EXTRA=r'''
window.__cameraQA={
 idle(mode='quarter',q='Low'){
  if(!playMode)setPlayMode(true);if(effect){scene.remove(effect);disposeTree(effect);effect=null;}sound.disable();graphics.resetSurface();playable.reset();config.paused=false;config.auto=false;config.runes=false;config.infiniteMana=true;
  config.cameraMode='orbit';config.quality=q;config.qualityScale={Low:.35,High:1}[q];graphics.applyQuality(q,{...GRAPHICS_PRESETS[q],adaptive:false});changePlayerView(mode);animate();return this.state();
 },
 cast(id){select(skillDefs.findIndex(s=>s.id===id));requestPlayerCast();animate();return this.state();},
 tick(n=1){const render=composer.render;composer.render=()=>{};try{for(let i=0;i<n;i++)animate();}finally{composer.render=render;}composer.render();return this.state();},
 state(){playable.mage.updateMatrixWorld(true);return {...__magicQA.snapshot(),view:playable.view.diagnostics(),actor:playable.motion.position.toArray(),actorYaw:playable.mage.rotation.y,modelVisible:playable.character.root.parent.visible,direction:camera.getWorldDirection(new THREE.Vector3()).toArray(),hands:playable.character.hands.map(h=>h.getWorldPosition(new THREE.Vector3()).toArray()),headTop:playable.character.headTop.getWorldPosition(new THREE.Vector3()).y,worldActive:effect?.userData.activeWorldTime,context:effect?{target:effect.userData.castContext.aoeCenter.toArray(),forward:effect.userData.castContext.casterForward.toArray()}:null,fov:camera.fov,aimTarget:playable.aimTarget.toArray(),maxRange:playable.getTargetInfo(skillDefs[spell]).maxRange};},
 image(){composer.render();return canvas.toDataURL().split(',')[1];},
 pointer(x,y){playable.view.trackPointer(x,y,960,640,true);return this.tick();},
 rotate(x,y){playable.onMouseMove(x,y);return this.tick(8);},
 key(code,down=true){playable[down?'onKeyDown':'onKeyUp']({code});},
 pan(x,y){playable.view.pan(x,y);return this.tick(8);},
 pause(v){config.paused=v;return this.tick();},
 cinematic(){config.cinematicCamera=true;config.cameraMode='cinematic';return this.tick();},
 finish(){__magicQA.finish(false);return this.tick(2);},
 context(){return this.state().context;}
};
'''
r={'passed':False,'errors':[],'warnings':[],'checks':{},'rows':[],'environment':'Chromium ANGLE/SwiftShader; fixed .05s clock, milestone rendering; no GPU FPS benchmark','story':'select/play camera -> controller/input/aim ray -> render; static client game, no API/database/credentials added'}
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']);page=b.new_page(viewport={'width':960,'height':640});page.set_default_timeout(90000)
 page.on('pageerror',lambda e:r['errors'].append(str(e)));page.on('console',lambda m:r['errors' if m.type=='error' else 'warnings'].append(m.text) if m.type in ['error','warning'] else None)
 def route(rt):
  response=rt.fetch();s=response.text().replace('requestAnimationFrame(animate);','').replace('select(0);animate();','select(0);');rt.fulfill(response=response,body=s+'\n'+HOOK+'\n'+EXTRA)
 page.route('**/src/main.js*',route);ev=page.evaluate
 def check(s):
  assert not s['badTransforms'] and s['glError']==0 and s['badPrograms']==0,s
  assert s['camera'][1]>=.35 and all(isinstance(v,(int,float)) for v in s['camera']),s
  assert s['modelVisible']==(s['view']['mode']!='first-person'),s
  return s
 def shot(name): (out/(name+'.png')).write_bytes(base64.b64decode(ev('__cameraQA.image()')))
 def select(mode):
  page.locator('#playCameraMode').select_option(mode);page.locator('#playCameraMode').blur();return check(ev('__cameraQA.tick(8)'))
 try:
  page.goto(a.url,wait_until='networkidle');skills=ev('__magicQA.skills');assert len(skills)==19
  modes=['quarter','moba','first-person','orbit','follow'];ev('__cameraQA.idle()')
  r['checks']['menu']=page.locator('#playCameraMode option').evaluate_all('els=>els.map(e=>({value:e.value,text:e.textContent}))');assert [e['value'] for e in r['checks']['menu']]==modes
  for mode in modes:
   s=select(mode);shot(mode+'-idle');r['checks'][mode+'Idle']=s
  # Full turn and running must leave camera azimuth independent of actor steering.
  ev('__cameraQA.idle("orbit")');base=ev('__cameraQA.state()');ev('__cameraQA.rotate(-Math.PI*2/.0022,0)');turned=check(ev('__cameraQA.state()'));assert abs(turned['view']['yaw']-base['view']['yaw'])<1e-7
  ev('__cameraQA.rotate(-Math.PI/2/.0022,0)');yaw=ev('__cameraQA.state().view.yaw');ev('__cameraQA.key("KeyW")');ran=check(ev('__cameraQA.tick(20)'));ev('__cameraQA.key("KeyW",false)');assert ran['view']['yaw']==yaw and ran['actor']!=base['actor'];r['checks']['orbitIndependentOfMovement']=ran
  shot('orbit-side');ev('__cameraQA.rotate(-Math.PI/2/.0022,0)');shot('orbit-front')
  # Real mouse middle-drag, edge pan and follow/recenter buttons.
  ev('__cameraQA.idle("moba")');initial=ev('__cameraQA.state()');page.mouse.move(550,300);page.mouse.down(button='middle');page.mouse.move(625,360,steps=5);page.mouse.up(button='middle');panned=check(ev('__cameraQA.tick(12)'));assert panned['actor']==initial['actor'] and panned['view']['focus']!=initial['view']['focus'];r['checks']['middleDrag']=panned
  page.mouse.move(955,380);edge=check(ev('__cameraQA.tick(20)'));assert edge['view']['focus']!=panned['view']['focus'];page.mouse.move(550,300);page.locator('#cameraCenter').click();center=check(ev('__cameraQA.tick(25)'));assert center['view']['focus']==center['actor'];r['checks']['edgeAndCenter']=center
  page.locator('#cameraFollow').click();ev('__cameraQA.key("KeyW")');follow=check(ev('__cameraQA.tick(20)'));ev('__cameraQA.key("KeyW",false)');assert follow['view']['focus']==follow['actor'] and follow['view']['follow'];r['checks']['follow']=follow
  page.mouse.move(955,380);ev('__cameraQA.tick(4)');assert page.locator('#cameraFollow').get_attribute('aria-pressed')=='false';page.mouse.move(550,300)
  # Cursor rays, target bounds, snapshot unaffected by camera pan after commit.
  ev('__cameraQA.idle("moba")');one=ev('__cameraQA.pointer(550,300)');two=ev('__cameraQA.pointer(640,410)');assert one['aimTarget']!=two['aimTarget'] and abs(two['aimTarget'][1])<1e-8;cast=ev('__cameraQA.cast("FIRE-01")');ctx=cast['context'];assert ctx['target']==two['aimTarget'];ev('__cameraQA.pan(90,40)');assert ev('__cameraQA.context()')==ctx;r['checks']['castSnapshotSurvivesMapPan']=True
  # Every view during casting holds the actor; selected views beat auto cinematic.
  ev('__cameraQA.idle("orbit")');ev('__cameraQA.cast("FIRE-01")');ev('__cameraQA.tick(20)');anchor=ev('__cameraQA.state().actor')
  for mode in modes[:4]:
   select(mode);ev('__cameraQA.rotate(-400,40)');ev('__cameraQA.key("KeyW")');s=check(ev('__cameraQA.tick(15)'));ev('__cameraQA.key("KeyW",false)');assert s['actor']==anchor and all(hand[1]>s['headTop']+.05 for hand in s['hands']),s
   if mode!='follow':before=s['camera'];auto=check(ev('__cameraQA.cinematic()'));assert auto['view']['mode']==mode and max(abs(a-b) for a,b in zip(auto['camera'],s['camera']))<.03
  select('orbit');before=ev('__cameraQA.state()');ev('__cameraQA.pause(true)');page.mouse.move(550,300);page.mouse.down(button='right');page.mouse.move(650,340,steps=4);page.mouse.up(button='right');paused=check(ev('__cameraQA.tick(10)'));assert paused['time']==before['time'] and paused['worldActive']==before['worldActive'] and paused['actor']==before['actor'] and paused['camera']!=before['camera'];r['checks']['pausedCameraWithoutSimulationDrift']=paused;ev('__cameraQA.pause(false)')
  ev('__cameraQA.idle("first-person")');ev('__cameraQA.rotate(1000,-600)');s=check(ev('__cameraQA.tick(10)'));assert abs(s['camera'][1]-1.77)<1e-8;r['checks']['firstPersonEyeAndLook']=s
  # Keyboard cycling and Showcase transitions do not leave the model hidden.
  select('quarter');page.keyboard.press('v');assert page.locator('#playCameraMode').input_value()=='moba';page.keyboard.press('y');page.keyboard.press('c');r['checks']['keyboardVCY']=check(ev('__cameraQA.tick()'))
  select('first-person');page.locator('#modeToggle').click();assert not ev('__magicQA.snapshot().playMode');page.locator('#modeToggle').click();select('orbit');s=check(ev('__cameraQA.tick()'));assert s['modelVisible'];r['checks']['showcaseRoundTrip']=s
  page.set_viewport_size({'width':390,'height':844});assert page.locator('#playCameraMode').is_visible();page.locator('#playCameraMode').select_option('moba');assert page.locator('#cameraCenter').is_visible();page.screenshot(path=str(out/'mobile-controls.png'));page.set_viewport_size({'width':960,'height':640});r['checks']['mobileControls']=True
  if a.matrix:
   for q in ['Low','High']:
    subset=skills if q=='Low' else [s for s in skills if s['id'] in ['FIRE-01','WATER-01','SPACE-01','TIME-01','SHADOW-01','NATURE-01']]
    for mode in modes:
     for skill in subset:
      ev('([mode,q])=>__cameraQA.idle(mode,q)',[mode,q]);ev('(id)=>__cameraQA.cast(id)',skill['id']);ev('([i,t])=>__magicQA.sample(i,t)',[skill['index'],skill['impact']+.1]);s=check(ev('__cameraQA.state()'));assert s['active'] and s['areaRadius']==s['vfxRadius'],s
      r['rows'].append({'id':skill['id'],'mode':mode,'quality':q,'state':s});check(ev('__cameraQA.finish()'))
     print('PASS',q,mode,len(subset),'skills',flush=True)
  assert not r['errors'],r['errors'];r['passed']=True
 finally:
  (out/'results.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n');b.close()
