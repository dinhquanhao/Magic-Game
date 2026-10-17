"""Unmodified production UI + native RAF, screenshot/video of all player camera modes."""
import argparse,json,os,shutil,signal,subprocess,time,http.client
from pathlib import Path
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser();p.add_argument('--output',required=True);p.add_argument('--port',type=int,default=4186);a=p.parse_args()
root=Path(__file__).resolve().parents[1];out=Path(a.output).resolve();out.mkdir(parents=True,exist_ok=True)
r={'passed':False,'production':True,'sourceInterception':False,'interactiveLivePreview':False,'videoAudioTrack':False,'deviceScaleFactor':.75,'errors':[],'warnings':[],'captures':[],'sourceCommit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(),'sourceDirty':bool(subprocess.check_output(['git','status','--porcelain'],cwd=root,text=True).strip())}
import playwright
registry=Path(playwright.__file__).parent/'driver/package/browsers.json';rev=next(x['revision'] for x in json.loads(registry.read_text())['browsers'] if x['name']=='ffmpeg');encoder=out/'browser-cache'/('ffmpeg-'+rev);encoder.mkdir(parents=True,exist_ok=True);link=encoder/'ffmpeg-linux'
if not link.exists():link.symlink_to(shutil.which('ffmpeg'))
os.environ['PLAYWRIGHT_BROWSERS_PATH']=str(out/'browser-cache')
log=(out/'server.log').open('w');server=subprocess.Popen(['npm','run','preview','--','--host','127.0.0.1','--port',str(a.port),'--strictPort'],cwd=root,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
try:
 for i in range(100):
  if server.poll() is not None:raise RuntimeError('preview failed')
  try:
   c=http.client.HTTPConnection('127.0.0.1',a.port,timeout=1);c.request('GET','/');ok=c.getresponse().status==200;c.close()
   if ok:break
  except OSError:pass
  time.sleep(.1)
 with sync_playwright() as pw:
  b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']);ctx=b.new_context(viewport={'width':1100,'height':740},device_scale_factor=.75,record_video_dir=str(out/'raw-video'),record_video_size={'width':880,'height':592});page=ctx.new_page();page.set_default_timeout(180000);video=page.video
  page.on('pageerror',lambda e:r['errors'].append(str(e)));page.on('console',lambda m:r['errors' if m.type=='error' else 'warnings'].append(m.text) if m.type in ['error','warning'] else None)
  def shot(name):
   page.screenshot(path=str(out/(name+'.png')));r['captures'].append({'file':name+'.png','view':page.locator('#playCameraMode').input_value(),'phase':page.locator('[data-cast-phase]').inner_text(),'help':page.locator('#cameraHelp').inner_text()});(out/'partial.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n');print('CAPTURE',name,flush=True)
  def mode(name):
   page.locator('#playCameraMode').select_option(name);page.locator('#playCameraMode').blur();page.wait_for_timeout(500)
  try:
   page.goto('http://127.0.0.1:'+str(a.port)+'/',wait_until='networkidle');page.wait_for_function("document.querySelectorAll('[data-element]').length===15");page.locator('#qualityPreset').select_option('Low')
   page.locator('.graphics-options').evaluate('e=>e.open=true');page.locator('#graphicsAdaptive').uncheck();page.locator('.graphics-options').evaluate('e=>e.open=false')
   for id in ['auto','runes','cameraShakeToggle','hitStopToggle','slowMotionToggle']:page.locator('#'+id).uncheck()
   page.locator('#modeToggle').click();shot('quarter')
   mode('moba');shot('moba');page.mouse.move(600,320);page.mouse.down(button='middle');page.mouse.move(740,390,steps=10);page.mouse.up(button='middle');page.wait_for_timeout(600);shot('moba-pan');page.locator('#cameraCenter').click();page.locator('#cameraCenter').blur();page.keyboard.press('y');page.keyboard.down('w');page.wait_for_timeout(500);page.keyboard.up('w');shot('moba-follow')
   mode('first-person');page.mouse.click(600,300);page.wait_for_function('!!document.pointerLockElement');page.mouse.move(730,350,steps=8);page.keyboard.down('w');page.wait_for_timeout(300);page.keyboard.up('w');shot('first-person');r['syntheticEscapeNotAutomated']=True
   # Headless Chromium stalls on native Escape through DevTools in this runner.
   # Public browser exit API is used explicitly; do not claim a native ESC test.
   page.evaluate('document.exitPointerLock()');page.wait_for_function('!document.pointerLockElement');r['pointerLockExitApiVerified']=True
   mode('orbit')
   for i in range(6):
    page.mouse.move(780,300);page.mouse.down(button='right');page.mouse.move(300,300,steps=10);page.mouse.up(button='right');page.wait_for_timeout(120)
    if i in [1,3,5]:shot('orbit-'+str(i+1))
   page.locator('#castButton').click();page.wait_for_function("document.querySelector('[data-cast-phase]').textContent==='KHAI TRIỂN'");page.wait_for_timeout(1000);page.locator('#pauseButton').click()
   for name in ['quarter','moba','first-person','orbit']:
    mode(name);shot('active-'+name)
   page.locator('#pauseButton').click();page.locator('#modeToggle').click();page.locator('#modeToggle').click();mode('quarter');shot('returned')
   assert not r['errors'],r['errors'];r['passed']=True
  finally:
   if not r['passed']:
    try:shot('incomplete-last-state')
    except Exception:pass
   ctx.close();video.save_as(str(out/'preview.webm'));b.close()
finally:
 (out/'results.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n')
 try:os.killpg(server.pid,signal.SIGTERM)
 except ProcessLookupError:pass
 try:server.wait(timeout=5)
 except subprocess.TimeoutExpired:os.killpg(server.pid,signal.SIGKILL);server.wait()
 log.close()
print(json.dumps({'passed':r['passed'],'output':str(out),'video':'preview.webm'}),flush=True)
