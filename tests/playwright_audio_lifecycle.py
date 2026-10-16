"""Exercise audio at real context loss and rapid cast/selection boundaries."""
import argparse
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
from playwright_smoke import HOOK
from playwright_audio import AUDIO_HOOK

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--url',default='http://127.0.0.1:5173/')
    parser.add_argument('--output',default='test-results/audio-lifecycle')
    args=parser.parse_args();out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
    result={'checks':{},'errors':[],'warnings':[]}
    with sync_playwright() as p:
        executable=os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE') or ('/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None)
        browser=p.chromium.launch(executable_path=executable,headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        page=browser.new_page(viewport={'width':1280,'height':800})
        page.on('pageerror',lambda e:result['errors'].append(str(e)))
        page.on('console',lambda m:result['errors' if m.type=='error' else 'warnings'].append(m.text) if m.type in ['error','warning'] else None)
        def route_source(route):
            response=route.fetch();source=response.text().replace('requestAnimationFrame(animate);','').replace('select(0);animate();','select(0);')
            route.fulfill(response=response,body=source+'\n'+HOOK+AUDIO_HOOK+'\nwindow.__audioRate=rate=>updateAudioFrame(rate);')
        page.route('**/src/main.js*',route_source)
        ev=page.evaluate
        try:
            page.goto(args.url,wait_until='networkidle')
            page.locator('.audio-options summary').click();page.locator('#audioToggle').click()
            ev('__magicAudio.ready()');ev('__magicQA.tick();__magicQA.charging()')
            ev('__audioRate(0)');page.wait_for_timeout(150)
            t=ev('__magicAudio.status().currentTime');page.wait_for_timeout(150)
            assert ev('__magicAudio.status().currentTime')==t
            ev('__audioRate(.35)');page.wait_for_timeout(150)
            state=ev('__magicAudio.status()');assert state['state']=='running' and all(abs(r-.35)<.03 for r in state['rates'])
            result['checks']['zeroRateHitStop']=True
            ev('__magicQA.loseContext()')
            page.wait_for_function('__magicQA.snapshot().contextLost')
            page.wait_for_function('__magicAudio.status().state==="suspended"')
            ev('__magicQA.restoreContext()')
            page.wait_for_function('!__magicQA.snapshot().contextLost')
            ev('__magicQA.tick()');page.wait_for_function('__magicAudio.status().state==="running"')
            result['checks']['webglLossRestoreAudio']=True
            # Switching before decode finishes must not populate unbounded banks.
            ev('[0,4,7,10,15,18,22,3].forEach(i=>__magicAudio.select(i))')
            ev('__magicAudio.ready()');ev('__magicQA.charging()')
            assert len(ev('__magicAudio.status().banks'))<=3
            result['checks']['rapidSelectionAbort']=True
            casts=[]
            for _ in range(10):
                ev('__magicQA.charging()');ev('__magicQA.sample(3,.05)')
                casts.append(ev('__magicAudio.status().activeVoices'))
                ev('__magicAudio.stop()');assert ev('__magicAudio.status().activeVoices')==0
            result['checks']['tenRecasts']={'voicesDuringCast':casts,'afterStop':0}
            page.locator('#audioToggle').click()
            ev('__magicQA.sample(3,__magicQA.skills[3].impact+2)')
            before=len(ev('__magicAudio.status().history'))
            page.locator('#audioToggle').click();ev('__magicAudio.ready()');ev('__magicQA.tick()')
            assert len(ev('__magicAudio.status().history'))==before,'Enabling late replayed old cues'
            ev('__magicQA.charging()')
            new=ev('__magicAudio.status().history').__getitem__(slice(before,None))
            assert [event['cue'] for event in new]==['precast','charging'],new
            result['checks']['lateUnlockDoesNotReplayImpact']=True
            assert not result['errors'],result['errors']
            result['passed']=True
            page.screenshot(path=str(out/'restored.png'))
        except Exception as e:
            result.update(passed=False,failure=str(e));page.screenshot(path=str(out/'failure.png'));raise
        finally:
            (out/'results.json').write_text(json.dumps(result,indent=2)+'\n');browser.close()
    print(json.dumps(result['checks']))

if __name__=='__main__':main()
