"""Context recovery regression for PMREM and live forest GPU resources."""
import argparse,json
from pathlib import Path
from playwright.sync_api import sync_playwright
from playwright_smoke import HOOK
p=argparse.ArgumentParser();p.add_argument('--url',default='http://127.0.0.1:5183/');p.add_argument('--output',default='work/context-lifecycle');a=p.parse_args();out=Path(a.output);out.mkdir(parents=True,exist_ok=True)
r={'passed':False,'errors':[],'warnings':[],'cycles':[]}
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']);page=b.new_page(viewport={'width':800,'height':540});page.set_default_timeout(60000)
 page.on('pageerror',lambda e:r['errors'].append(str(e)));page.on('console',lambda m:r['errors' if m.type=='error' else 'warnings'].append(m.text) if m.type in ['error','warning'] else None)
 def intercept(route):
  response=route.fetch();s=response.text().replace('requestAnimationFrame(animate);','').replace('select(0);animate();','select(0);');route.fulfill(response=response,body=s+'\n'+HOOK)
 page.route('**/src/main.js*',intercept)
 try:
  page.goto(a.url,wait_until='networkidle');page.evaluate('__magicQA.sample(20,8.2)')
  for cycle in range(3):
   before=page.evaluate('__magicQA.snapshot()');page.evaluate('__magicQA.loseContext()');page.wait_for_function('__magicQA.snapshot().contextLost');assert page.evaluate('__magicQA.snapshot().environmentId') is None
   page.evaluate('__magicQA.restoreContext()');page.wait_for_function('!__magicQA.snapshot().contextLost');after=page.evaluate('__magicQA.tick()');assert after['environmentId']!=before['environmentId'] and after['glError']==0 and after['badPrograms']==0
   r['cycles'].append({'before':before,'after':after})
  page.screenshot(path=str(out/'restored.png'));assert not r['errors'] and not r['warnings'],r;r['passed']=True
 except Exception as e:r['failure']=str(e);raise
 finally:(out/'results.json').write_text(json.dumps(r,ensure_ascii=False,indent=2));b.close()
print(json.dumps({'passed':r['passed'],'cycles':len(r['cycles']),'errors':r['errors'],'warnings':r['warnings']}))
