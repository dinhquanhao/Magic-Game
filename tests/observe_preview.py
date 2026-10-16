"""Start a built preview, exercise the real UI, and record review artifacts."""
import argparse
import http.client
import json
import os
from pathlib import Path
import shutil
import signal
import subprocess
import time

from playwright.sync_api import sync_playwright, Error

ROOT=Path(__file__).resolve().parents[1]

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--port',type=int,default=4180)
    parser.add_argument('--output',default='test-results/observations')
    parser.add_argument('--label',default='after')
    parser.add_argument('--hold-seconds',type=float,default=6)
    args=parser.parse_args()
    commit=subprocess.check_output(['git','rev-parse','--short','HEAD'],cwd=ROOT,text=True).strip()
    stamp=time.strftime('%Y%m%d-%H%M%S',time.gmtime())
    out=(ROOT/args.output/f'{args.label}-{commit}-{stamp}').resolve();out.mkdir(parents=True,exist_ok=False)
    executable=os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE')
    if not executable and Path('/usr/bin/chromium').exists():executable='/usr/bin/chromium'
    # The managed runtime has Chromium + system ffmpeg. Reuse that encoder in
    # Playwright's documented browser cache layout; no download is necessary.
    encoder=shutil.which('ffmpeg')
    if executable and encoder:
        import playwright
        registry=Path(playwright.__file__).parent/'driver/package/browsers.json'
        revision=next(x['revision'] for x in json.loads(registry.read_text())['browsers'] if x['name']=='ffmpeg')
        cache=out/'browser-cache';target=cache/f'ffmpeg-{revision}'
        target.mkdir(parents=True);(target/'ffmpeg-linux').symlink_to(encoder)
        os.environ['PLAYWRIGHT_BROWSERS_PATH']=str(cache)
    metadata={'commit':commit,'label':args.label,'utcRecordedAt':stamp,'production':True,
              'sourceDirty':bool(subprocess.check_output(['git','status','--porcelain'],cwd=ROOT,text=True).strip()),
              'interactiveLivePreview':False,'video':None,'errors':[],'warnings':[],'captures':{}}
    log=(out/'server.log').open('w')
    # Only terminate the server started by this run; never stop another preview.
    server=subprocess.Popen(['npm','run','preview','--','--host','127.0.0.1','--port',str(args.port),'--strictPort'],cwd=ROOT,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
    try:
        ready=False
        for _ in range(100):
            if server.poll() is not None:raise RuntimeError('Preview failed to start; see server.log')
            try:
                conn=http.client.HTTPConnection('127.0.0.1',args.port,timeout=1)
                conn.request('GET','/');ready=conn.getresponse().status==200;conn.close()
                if ready:break
            except OSError:pass
            time.sleep(.1)
        if not ready:raise RuntimeError('Preview did not become ready')
        with sync_playwright() as p:
            browser=p.chromium.launch(executable_path=executable,headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
            try:
                context=browser.new_context(viewport={'width':1280,'height':800},record_video_dir=str(out/'raw-video'),record_video_size={'width':960,'height':600})
            except Error as error:
                metadata['videoUnavailable']=str(error)
                context=browser.new_context(viewport={'width':1280,'height':800})
            page=context.new_page();video=page.video
            page.on('pageerror',lambda e:metadata['errors'].append({'type':'pageerror','text':str(e)}))
            page.on('console',lambda m:metadata['errors' if m.type=='error' else 'warnings'].append({'type':m.type,'text':m.text}) if m.type in ['error','warning'] else None)
            page.on('requestfailed',lambda r:metadata['errors'].append({'type':'requestfailed','text':r.url+': '+str(r.failure)}))
            try:
                page.goto(f'http://127.0.0.1:{args.port}/',wait_until='networkidle')
                page.wait_for_function("document.querySelectorAll('[data-element]').length===15")
                metadata['elements']=page.locator('[data-element]').count()
                page.locator('#qualityPreset').select_option('Low')
                page.locator('.graphics-options').evaluate('(e)=>e.open=true')
                page.locator('#graphicsAdaptive').uncheck()
                page.locator('.graphics-options').evaluate('(e)=>e.open=false')
                for name in ['auto','runes','cameraShakeToggle','hitStopToggle','slowMotionToggle']:page.locator('#'+name).uncheck()
                for name,value in [('castTime','.3'),('speed','2')]:
                    page.locator('#'+name).evaluate('(e,v)=>{e.value=v;e.dispatchEvent(new Event("input",{bubbles:true}));}',value)
                page.locator('.settings').evaluate('e=>e.scrollTop=0')
                page.screenshot(path=str(out/'startup.png'))
                for element,name in [(1,'water'),(4,'shadow')]:
                    page.locator(f'[data-element="{element}"]').click()
                    expected=page.locator('.spellbar button.active b').inner_text()
                    # Feedback from the previous skill can remain until RAF runs.
                    # Wait for this skill's accessible label as well as its phase.
                    page.wait_for_function("expected=>document.querySelector('#castFeedback progress').getAttribute('aria-label').includes(expected)&&document.querySelector('[data-cast-phase]').textContent==='KHAI TRIỂN'",arg=expected,timeout=45000)
                    page.wait_for_timeout(max(0,args.hold_seconds)*1000)
                    page.screenshot(path=str(out/(name+'.png')))
                    metadata['captures'][name]={'skill':expected,'phase':page.locator('[data-cast-phase]').inner_text(),'file':name+'.png'}
                    assert 'Lỗi' not in page.locator('#status').inner_text()
                page.locator('#modeToggle').click()
                page.locator('#castButton').click()
                page.wait_for_function("document.querySelector('#manaText').textContent!=='100 / 100'")
                page.locator('#pauseButton').click()
                page.screenshot(path=str(out/'play-mode.png'))
                metadata['mana']=page.locator('#manaText').inner_text()
                assert not metadata['errors'],metadata['errors'][:3]
                metadata['result']='passed'
            finally:
                context.close()
                if video:
                    video.save_as(str(out/'preview.webm'))
                    metadata['video']='preview.webm'
                browser.close()
        print(json.dumps({'output':str(out),'result':metadata.get('result'),'video':metadata['video']},ensure_ascii=False),flush=True)
    except Exception as error:
        metadata['result']='failed';metadata['failure']=str(error)
        raise
    finally:
        (out/'results.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n')
        # npm launches a shell and Vite child. Stop the owned process group so
        # repeated runs do not leave orphan servers holding the preview port.
        try:os.killpg(server.pid,signal.SIGTERM)
        except ProcessLookupError:pass
        try:server.wait(timeout=5)
        except subprocess.TimeoutExpired:
            os.killpg(server.pid,signal.SIGKILL);server.wait()
        log.close()

if __name__=='__main__':main()
