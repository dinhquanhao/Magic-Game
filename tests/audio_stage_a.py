import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
from playwright_smoke import HOOK
out=Path('audio/reports/stage-a');out.mkdir(parents=True,exist_ok=True)
errors=[];result={'preset':[],'errors':errors,'earVerified':False}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':1280,'height':800})
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 def route(r):
  resp=r.fetch();s=resp.text().replace('requestAnimationFrame(animate);','').replace('select(0);animate();','select(0);')
  r.fulfill(response=resp,body=s+'\n'+HOOK+'\nwindow.__sound=sound;window.__pauseAudio=p=>{config.paused=p;animate();};')
 page.route('**/src/main.js*',route)
 try:
  page.goto('http://127.0.0.1:5181/',wait_until='networkidle');assert page.evaluate('__sound.diagnostics().state')=='uninitialized'
  page.locator('.audio-options summary').click();page.locator('#audioToggle').click();page.evaluate('__sound.ready()')
  for preset,limit in [('Low',8),('Medium',12),('High',20),('Ultra',28)]:
   page.evaluate('(p)=>__sound.setQuality(p)',preset);page.evaluate('__sound.testSound()');page.wait_for_timeout(200)
   state=page.evaluate('__sound.diagnostics()');assert state['voiceLimit']==limit,state;assert state['rms']>0 and state['peak']<=10**(-1/20),state
   result['preset'].append({k:state[k] for k in ['preset','voiceLimit','pooledNodes','limiter','peak','rms','limiterReductionDb','baseLatency','outputLatency','updateCostMs']})
   page.evaluate('__sound.stopCast()');page.wait_for_timeout(80)
  page.evaluate('__magicQA.charging();__magicQA.tick()');page.wait_for_timeout(100)
  page.evaluate('__pauseAudio(true)');page.wait_for_timeout(100);t=page.evaluate('__sound.diagnostics().currentTime');page.wait_for_timeout(130);assert page.evaluate('__sound.diagnostics().currentTime')==t
  page.evaluate('__pauseAudio(false)');page.wait_for_timeout(100);assert page.evaluate('__sound.diagnostics().state')=='running'
  page.locator('#audioMute').check();page.wait_for_timeout(250);assert page.evaluate('__sound.diagnostics().rms')<.00001
  page.locator('#audioMute').uncheck()
  for i in range(20):page.evaluate('__sound.testSound();__sound.stopCast()');page.wait_for_timeout(70)
  page.wait_for_timeout(750);state=page.evaluate('__sound.diagnostics()');assert state['liveSources']==0,state
  result['lifecycle']=True;result['final']=state;assert not errors,errors
  page.screenshot(path=str(out/'controls.png'));result['passed']=True
 except Exception as e:result.update(passed=False,failure=str(e));raise
 finally:(out/'results.json').write_text(json.dumps(result,indent=2));b.close()
print(json.dumps({'passed':True,'presets':len(result['preset'])}))
