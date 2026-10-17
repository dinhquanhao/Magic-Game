"""Record fixed-time forest animation frames, then encode with ffmpeg.
The video playback rate is prescribed, not a real-time GPU FPS measurement.
"""
import argparse,base64,json,subprocess,time
from pathlib import Path
from playwright.sync_api import sync_playwright
from playwright_smoke import HOOK
p=argparse.ArgumentParser();p.add_argument('--url',default='http://127.0.0.1:5183/');p.add_argument('--output',default='work/thao-video');a=p.parse_args()
out=Path(a.output);out.mkdir(parents=True,exist_ok=True);frames=out/'frames';frames.mkdir(exist_ok=True);errors=[];started=time.monotonic();metadata={'passed':False,'method':'Chromium canvas sampled at fixed simulation times, encoded at 8fps; no audio, no real-time FPS claim; Rune Tower off for VFX detail, tested separately','errors':errors}
extra=r'''
window.__video={
 begin(){config.auto=false;config.quality='High';config.qualityScale=1;graphics.applyQuality('High',{...GRAPHICS_PRESETS.High,adaptive:false});renderSkills(14);select(20);sound.disable();},
 charge(p){elapsed=p*config.castTime*effect.userData.skillPlan.pace/config.runeDrawSpeed;animate();},
 image(){return canvas.toDataURL('image/png').split(',')[1];},
 closeup(t){__magicQA.sample(20,t);const target=playable.dummies[7].group.position;camera.position.copy(target).add(new THREE.Vector3(3,3,5));controls.target.copy(target).add(new THREE.Vector3(0,1,0));controls.update();composer.render();return this.image();}
};
'''
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']);page=b.new_page(viewport={'width':960,'height':640});page.set_default_timeout(60000);page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 def intercept(r):
  response=r.fetch();s=response.text().replace('requestAnimationFrame(animate);','').replace('select(0);animate();','select(0);');r.fulfill(response=response,body=s+'\n'+HOOK+extra)
 page.route('**/src/main.js*',intercept)
 try:
  page.goto(a.url,wait_until='networkidle');page.evaluate('__video.begin()')
  samples=[('cast',i/24) for i in range(24)]+[('active',i/8) for i in range(147)]
  for i,(phase,t) in enumerate(samples):
   page.evaluate('(t)=>__video.charge(t)',t) if phase=='cast' else page.evaluate('(t)=>__magicQA.sample(20,t)',t)
   (frames/f'{i:04}.png').write_bytes(base64.b64decode(page.evaluate('__video.image()')))
  metadata['finalState']=page.evaluate('__magicQA.snapshot()');assert not metadata['finalState']['active'];assert not errors,errors
  page.evaluate('__video.begin()')
  for t,label in [(6.6,'roots-spikes'),(7.5,'branch-fruit')]:
   (out/(label+'.png')).write_bytes(base64.b64decode(page.evaluate('(t)=>__video.closeup(t)',t)))
  metadata.update(passed=True,frames=len(samples),playbackFps=8,playbackSeconds=len(samples)/8,renderCaptureWallSeconds=time.monotonic()-started)
 except Exception as e:metadata['failure']=str(e);raise
 finally:(out/'recording.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2));b.close()
subprocess.run(['ffmpeg','-y','-framerate','8','-i',str(frames/'%04d.png'),'-c:v','libx264','-pix_fmt','yuv420p','-crf','22','-movflags','+faststart',str(out/'thao-showcase.mp4')],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
print(json.dumps({k:v for k,v in metadata.items() if k not in ['finalState']}))
