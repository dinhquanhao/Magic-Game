"""Real shader/opacity/lifecycle checks for the shared rune release fade."""
import argparse, base64, json
from pathlib import Path
from playwright.sync_api import sync_playwright
from playwright_smoke import HOOK

p=argparse.ArgumentParser();p.add_argument('--url',default='http://127.0.0.1:5183/');p.add_argument('--output',required=True);p.add_argument('--baseline-only',action='store_true');p.add_argument('--lifecycle-only',action='store_true');a=p.parse_args()
out=Path(a.output);out.mkdir(parents=True,exist_ok=True)
extra=r'''
window.__runeQA={
 start(id,q){if(effect){scene.remove(effect);disposeTree(effect);effect=null;}graphics.resetSurface();let seed=38017;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return (seed>>>0)/4294967296;};
 sound.disable();config.runes=true;config.paused=false;config.quality=q;config.qualityScale={Low:.35,Medium:.62,High:1,Ultra:1.4}[q];graphics.applyQuality(q,{...GRAPHICS_PRESETS[q],adaptive:false});camera.position.set(0,18,34);controls.target.set(0,4.5,0);controls.update();select(skillDefs.findIndex(s=>s.id===id));effect.userData.phase='charging';elapsed=config.castTime*effect.userData.skillPlan.pace;animate();return this.state();},
 frame(t){__magicQA.sample(spell,t);return this.state();},
 state(){const g=effect?.userData.ritual,opacities=[],intensities=[];g?.traverse(o=>{for(const m of (Array.isArray(o.material)?o.material:o.material?[o.material]:[])){if(!m.isShaderMaterial)opacities.push(m.opacity);if(m.uniforms?.uIntensity)intensities.push(m.uniforms.uIntensity.value);}if(o.isLight)intensities.push(o.intensity);});return {...__magicQA.snapshot(),runeVisible:g?.visible??false,runeStart:effect?.userData.runeFadeStartedAt??null,opacitySum:opacities.reduce((a,b)=>a+b,0),maxOpacity:Math.max(0,...opacities),maxIntensity:Math.max(0,...intensities),runeObjects:g?.children.length??0,attackVisible:effect?.userData.attack.group?.visible??false};},
 image(){composer.render();return canvas.toDataURL('image/png').split(',')[1];},
 pause(v){config.paused=v;animate();return this.state();},
 timeMode(phase,scale=1){timeScaleController.phase=phase;timeScaleController.remaining=phase==='idle'?0:20;timeScaleController.total=20;timeScaleController.scale=scale;return this.state();},
 runes(v){config.runes=v;return this.state();},
 finish(){__magicQA.finish(false);return this.state();}
};
'''
r={'passed':False,'errors':[],'warnings':[],'rows':[],'checks':{},'renderer':'Chromium/SwiftShader; no native GPU benchmark'}
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']);page=b.new_page(viewport={'width':960,'height':640});page.set_default_timeout(60000)
 page.on('pageerror',lambda e:r['errors'].append(str(e)));page.on('console',lambda m:r['errors' if m.type=='error' else 'warnings'].append(m.text) if m.type in ['error','warning'] else None)
 def route(rt):
  response=rt.fetch();s=response.text().replace('requestAnimationFrame(animate);','').replace('select(0);animate();','select(0);');rt.fulfill(response=response,body=s+'\n'+HOOK+extra)
 page.route('**/src/main.js*',route)
 def check(s):
  assert s['glError']==0 and s['badPrograms']==0 and not s['badTransforms'],s
  return s
 def capture(name): (out/(name+'.png')).write_bytes(base64.b64decode(page.evaluate('__runeQA.image()')))
 try:
  page.goto(a.url,wait_until='networkidle');skills=page.evaluate('__magicQA.skills');assert len(skills)==19 and len({s['element'] for s in skills})==15
  for q in ([] if a.lifecycle_only else ['Low'] if a.baseline_only else ['Low','High']):
   for skill in skills:
    id=skill['id']
    if a.baseline_only and id not in ['FIRE-01','WATER-01','TIME-01','NATURE-01']:continue
    check(page.evaluate('([id,q])=>__runeQA.start(id,q)',[id,q]));previous=float('inf');frames=[]
    # The time-domain group intentionally remains hidden until active 1.85s.
    start=1.9 if id=='TIME-01' else .05
    times=[.05,.45,.9,1.35,1.9] if a.baseline_only else ([.05] if start>1 else [])+[start,start+.45,start+.9,start+1.35,start+1.85,max(start+2.5,skill['impact']+.1)]
    if q=='High' and not a.baseline_only:times=([.05] if start>1 else [])+[start,start+.9,start+1.85,max(start+2.5,skill['impact']+.1)]
    for t in times:
     s=check(page.evaluate('(t)=>__runeQA.frame(t)',t));frames.append({'at':t,'state':s})
     if not a.baseline_only:
      if t<start:assert s['runeVisible'] and s['runeStart'] is None,s
      elif t<start+1.8:
       assert s['runeVisible'] and abs(s['runeStart']-start)<1e-5,s
       assert s['opacitySum']<=previous+1e-5,s;previous=s['opacitySum']
      else:assert not s['runeVisible'] and s['maxOpacity']==0 and s['maxIntensity']==0,s
     if id in ['FIRE-01','TIME-01','NATURE-01'] and q=='Low':capture(id+'-'+str(round(t,2)))
    r['rows'].append({'id':id,'quality':q,'frames':frames});print(id,q,'PASS',flush=True)
    (out/'results.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n')
  if not a.baseline_only:
   for q in ['Medium','Ultra']:
    page.evaluate('([id,q])=>__runeQA.start(id,q)',['FIRE-01',q]);check(page.evaluate('__runeQA.frame(.05)'));mid=check(page.evaluate('__runeQA.frame(.95)'));assert mid['runeVisible'];end=check(page.evaluate('__runeQA.frame(1.9)'));assert not end['runeVisible'];r['checks'][q]=True
   page.evaluate('([id,q])=>__runeQA.start(id,q)',['FIRE-01','Low']);page.evaluate('__runeQA.frame(.05)');before=check(page.evaluate('__runeQA.frame(.65)'));page.evaluate('__runeQA.pause(true)');page.evaluate('__magicQA.tick(6)');paused=check(page.evaluate('__runeQA.state()'));assert paused['time']==before['time'] and paused['opacitySum']==before['opacitySum'];page.evaluate('__runeQA.pause(false)');r['checks']['pauseResume']=True
   frozen=page.evaluate('__runeQA.timeMode("freeze")');page.evaluate('__magicQA.tick(6)');still=check(page.evaluate('__runeQA.state()'));assert still['time']==frozen['time'] and still['opacitySum']==frozen['opacitySum'];r['checks']['hitStopFreezesFade']=True
   slow=page.evaluate('__runeQA.timeMode("pre",.25)');page.evaluate('__magicQA.tick(4)');slower=check(page.evaluate('__runeQA.state()'));assert abs(slower['time']-slow['time']-.05)<1e-6 and slower['opacitySum']<slow['opacitySum'];page.evaluate('__runeQA.timeMode("idle")');r['checks']['slowMotionUsesSimulationClock']=True
   page.evaluate('__runeQA.runes(false)');check(page.evaluate('__runeQA.frame(2.2)'));page.evaluate('__runeQA.runes(true)');assert not check(page.evaluate('__runeQA.frame(2.25)'))['runeVisible'];r['checks']['toggleDoesNotResurrect']=True
   page.evaluate('([id,q])=>__runeQA.start(id,q)',['FIRE-01','Low']);fresh=check(page.evaluate('__runeQA.frame(.05)'));assert fresh['runeVisible'] and fresh['maxOpacity']>.9;r['checks']['recastRestoresFullOpacity']=True
   page.evaluate('__magicQA.finish(true)');fresh=check(page.evaluate('__runeQA.state()'));assert fresh['active'] and fresh['phase']=='charging';check(page.evaluate('__runeQA.finish()'));r['checks']['autoRepeatCleanup']=True
  assert not r['errors'],r['errors'];r['passed']=True
 except Exception as e:r['failure']=str(e);raise
 finally:(out/'results.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n');b.close()
