"""Exercise the shipped bundle via UI only; no source interception or test globals."""
import argparse,json
from pathlib import Path
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser();p.add_argument('--url',default='http://127.0.0.1:4173/');p.add_argument('--output',default='work/thao-production');a=p.parse_args();out=Path(a.output);out.mkdir(parents=True,exist_ok=True)
r={'passed':False,'errors':[],'checks':{},'bundleRequests':[],'fixture':'none; production UI only'}
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']);page=b.new_page(viewport={'width':800,'height':540});page.set_default_timeout(180000)
 page.on('pageerror',lambda e:r['errors'].append(str(e)));page.on('console',lambda m:r['errors'].append(m.text) if m.type=='error' else None);page.on('request',lambda req:r['bundleRequests'].append(req.url) if '/assets/' in req.url and req.url.endswith('.js') else None)
 try:
  page.goto(a.url,wait_until='networkidle');assert page.locator('[data-element]').count()==15;assert '19' in page.locator('#projectCount').inner_text();page.locator('#qualityPreset').select_option('Low');page.locator('#auto').uncheck();page.locator('#runes').uncheck();page.locator('#reducedMotionToggle').check();page.locator('#speed').evaluate("e=>{e.value='2';e.dispatchEvent(new Event('input',{bubbles:true}));}")
  page.locator('[data-element="14"]').click();assert page.locator('[data-spell]').count()==1;assert 'Vạn Mộc Sinh Giới' in page.locator('#spellTitle').inner_text();r['checks']['natureLastSlotAndOneSkill']=True
  page.screenshot(path=str(out/'cast-ui.png'));page.wait_for_function("document.querySelector('[data-cast-phase]').textContent==='DƯ CHẤN'");page.screenshot(path=str(out/'forest-ui.png'));r['checks']['castThroughImpact']=True
  page.locator('#modeToggle').click();page.locator('#castButton').click();page.wait_for_function("document.querySelector('#manaText').textContent!=='100 / 100'");assert page.locator('#playHud').is_visible();page.locator('#pauseButton').click();assert 'TIẾP' in page.locator('#pauseButton').inner_text();page.screenshot(path=str(out/'play-ui.png'));r['checks']['playManaPause']=True
  assert page.evaluate("typeof window.__magicQA==='undefined' && typeof window.__natureQA==='undefined'");r['checks']['noShippedTestGlobals']=True;assert not r['errors'],r['errors'];r['passed']=True
 except Exception as e:
  r['failure']=str(e)
  try:page.screenshot(path=str(out/'failure.png'))
  except Exception:pass
  raise
 finally:(out/'results.json').write_text(json.dumps(r,ensure_ascii=False,indent=2));b.close()
print(json.dumps(r))
