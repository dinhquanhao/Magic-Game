"""Run an actual material and impact cue through the shared browser mixer."""
import argparse,json
from pathlib import Path
from playwright.sync_api import sync_playwright
import sys
sys.path.insert(0,str(Path('tests').resolve()))
from playwright_smoke import HOOK
p=argparse.ArgumentParser();p.add_argument('--element',required=True);p.add_argument('--url',default='http://127.0.0.1:5181/');a=p.parse_args()
out=Path('audio/reports/runtime');out.mkdir(parents=True,exist_ok=True)
errors=[];result={'element':a.element,'earVerified':False}
with sync_playwright() as playwright:
 b=playwright.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':960,'height':640});page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 def intercept(route):
  response=route.fetch();s=response.text().replace('requestAnimationFrame(animate);','').replace('select(0);animate();','select(0);');route.fulfill(response=response,body=s+'\n'+HOOK+'\nwindow.__sound=sound;')
 page.route('**/src/main.js*',intercept)
 try:
  page.goto(a.url,wait_until='networkidle')
  audit=json.loads(Path('audio/source-audit.json').read_text());index=next(i for i,s in enumerate(audit['skills']) if s['id'].startswith(a.element+'-'));element=audit['skills'][index]['elementIndex']
  page.locator(f'[data-element="{element}"]').click();page.evaluate('__sound.ready()');page.evaluate('__magicQA.charging();__magicQA.tick()');page.wait_for_timeout(100)
  for role in ['material','impact']:
   page.evaluate('(id)=>__sound.audition(id)',a.element.lower()+'/'+role);page.wait_for_timeout(140);s=page.evaluate('__sound.diagnostics()');assert s['rms']>1e-7 and s['peak']<=10**(-1/20),s;assert not s['errors'],s
   result[role]={k:s[k] for k in ['peak','rms','limiter','limiterReductionDb','liveSources','pooledNodes','decodedBytes','baseLatency','outputLatency']}
   page.evaluate('__sound.stopCast()');page.wait_for_timeout(80)
  page.wait_for_timeout(700);s=page.evaluate('__sound.diagnostics()');assert s['liveSources']==0,s
  assert not errors,errors;result.update(passed=True,errors=errors)
 except Exception as e:result.update(passed=False,error=str(e),errors=errors);raise
 finally:(out/(a.element.lower()+'.json')).write_text(json.dumps(result,indent=2)+'\n');b.close()
print(json.dumps({'runtimeElement':a.element,'passed':result['passed']}))
