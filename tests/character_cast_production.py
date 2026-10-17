"""Normal production UI/RAF observation of the uploaded character; no source hook."""
import argparse,json,os,shutil,signal,subprocess,time,http.client
from pathlib import Path
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser();p.add_argument('--output',required=True);p.add_argument('--port',type=int,default=4185);a=p.parse_args()
root=Path(__file__).resolve().parents[1];out=Path(a.output).resolve();out.mkdir(parents=True,exist_ok=True)
result={'passed':False,'production':True,'sourceInterception':False,'interactiveLivePreview':False,'videoAudioTrack':False,'deviceScaleFactor':.5,'errors':[],'warnings':[],'captures':[],'sourceCommit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(),'sourceDirty':bool(subprocess.check_output(['git','status','--porcelain'],cwd=root,text=True).strip())}
import playwright
registry=Path(playwright.__file__).parent/'driver/package/browsers.json';revision=next(x['revision'] for x in json.loads(registry.read_text())['browsers'] if x['name']=='ffmpeg');encoder=out/'browser-cache'/('ffmpeg-'+revision);encoder.mkdir(parents=True,exist_ok=True);link=encoder/'ffmpeg-linux'
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
  b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  context=b.new_context(viewport={'width':1100,'height':740},device_scale_factor=.5,record_video_dir=str(out/'raw-video'),record_video_size={'width':960,'height':646});page=context.new_page();page.set_default_timeout(360000);video=page.video
  page.on('pageerror',lambda e:result['errors'].append(str(e)));page.on('console',lambda m:result['errors' if m.type=='error' else 'warnings'].append(m.text) if m.type in ['error','warning'] else None)
  def capture(name):
   page.screenshot(path=str(out/(name+'.png')));print('CAPTURE',name,flush=True);result['captures'].append({'file':name+'.png','phase':page.locator('[data-cast-phase]').inner_text(),'remaining':page.locator('[data-cast-remaining]').inner_text(),'status':page.locator('#status').inner_text()})
  try:
   page.goto('http://127.0.0.1:'+str(a.port)+'/',wait_until='networkidle');page.wait_for_function("document.querySelectorAll('[data-element]').length===15")
   assert page.locator('#castTime').input_value()=='10'
   page.locator('#qualityPreset').select_option('Low');page.locator('.graphics-options').evaluate('e=>e.open=true');page.locator('#graphicsAdaptive').uncheck();page.locator('.graphics-options').evaluate('e=>e.open=false')
   for id in ['auto','cameraShakeToggle','hitStopToggle','slowMotionToggle']:page.locator('#'+id).uncheck()
   page.locator('#runes').check();page.locator('#modeToggle').click();page.locator('#infiniteManaToggle').check()
   page.locator('.settings').evaluate('e=>e.scrollTop=0');page.locator('#stage').hover();page.mouse.wheel(0,-500);page.wait_for_timeout(700);capture('idle-bot')
   page.locator('#castButton').click();page.locator('#castButton').blur();page.keyboard.down('w');page.keyboard.press('Space');page.keyboard.press('q');page.wait_for_timeout(1500);capture('casting-bot')
   page.keyboard.up('w');page.wait_for_function("document.querySelector('[data-cast-phase]').textContent==='HỘI TỤ'");capture('convergence')
   page.wait_for_function("document.querySelector('[data-cast-phase]').textContent==='KHAI TRIỂN'");page.wait_for_timeout(3000);page.locator('#pauseButton').click();capture('active-bot')
   # Rotate the normal play camera while the character stays planted.
   page.locator('#pauseButton').click();page.locator('#stage').hover();page.mouse.down(button='right');page.mouse.move(150,430,steps=18);page.mouse.up(button='right');page.wait_for_timeout(1000);page.locator('#pauseButton').click();capture('active-orbit')
   page.locator('#pauseButton').click();page.wait_for_function("document.querySelector('[data-cast-phase]').textContent==='DƯ CHẤN'");capture('aftermath')
   page.wait_for_function("document.querySelector('#castFeedback').hidden",timeout=360000);page.keyboard.down('w');page.wait_for_timeout(1000);page.keyboard.up('w');capture('movement-resumed')
   page.locator('#resetButton').click();capture('reset')
   assert 'Lỗi' not in page.locator('#status').inner_text();assert not result['errors'],result['errors'];result['passed']=True
  finally:
   if not result['passed']:
    try: capture('incomplete-last-state')
    except Exception: pass
   context.close();video.save_as(str(out/'preview.webm'));b.close()
finally:
 (out/'results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
 try:os.killpg(server.pid,signal.SIGTERM)
 except ProcessLookupError:pass
 try:server.wait(timeout=5)
 except subprocess.TimeoutExpired:os.killpg(server.pid,signal.SIGKILL);server.wait()
 log.close()
print(json.dumps({'passed':result['passed'],'output':str(out),'video':'preview.webm'}),flush=True)
