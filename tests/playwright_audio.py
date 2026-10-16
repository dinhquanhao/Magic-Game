"""Real Chromium/WebAudio + WebGL integration; fixture only, no shipped globals."""
import argparse
import base64
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
from playwright_smoke import HOOK

AUDIO_HOOK = r'''
window.__magicAudio={
 status:()=>sound.diagnostics(), ready:()=>sound.ready(), select:i=>select(i),
 stop:()=>sound.stopCast(), dispose:()=>sound.dispose(),
 speed:r=>{config.speed=r;}, pause:p=>{config.paused=p;animate();},
 spatial(distance){sound.update({id:'spatial',element:elements[skillDefs[spell].elementIndex].id,phase:'charging',time:0,impact:2,center:[0,0,-distance]}, {position:[0,0,0],forward:[0,0,-1],up:[0,1,0]},1,false);},
 async recordStart(){
  this.tap=sound.createCapture();this.chunks=[];this.recorder=new MediaRecorder(this.tap.stream,{mimeType:'audio/webm;codecs=opus'});
  this.recorder.ondataavailable=e=>{if(e.data.size)this.chunks.push(e.data);};this.recorder.start();
 },
 async recordEnd(){
  await new Promise(resolve=>{this.recorder.onstop=resolve;this.recorder.stop();});this.tap.disconnect();
  const blob=new Blob(this.chunks,{type:'audio/webm'});
  return await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.readAsDataURL(blob);});
 }
};
'''

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--url', default='http://127.0.0.1:5173/')
    parser.add_argument('--output', default='test-results/audio-round1')
    args = parser.parse_args()
    out = Path(args.output); out.mkdir(parents=True, exist_ok=True)
    errors = []; warnings = []; results = {'skills': [], 'checks': {}, 'renderer': 'Chromium ANGLE/SwiftShader'}
    with sync_playwright() as p:
        executable = os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE') or ('/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None)
        browser = p.chromium.launch(executable_path=executable, headless=True, args=['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        page = browser.new_page(viewport={'width': 1280, 'height': 800})
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('console', lambda m: (errors if m.type == 'error' else warnings).append(m.text) if m.type in ['error', 'warning'] else None)
        def intercept(route):
            response = route.fetch(); source = response.text()
            source = source.replace('requestAnimationFrame(animate);', '').replace('select(0);animate();', 'select(0);')
            route.fulfill(response=response, body=source + '\n' + HOOK + AUDIO_HOOK)
        page.route('**/src/main.js*', intercept)
        def ev(expression): return page.evaluate(expression)
        def audio(): return ev('__magicAudio.status()')
        try:
            page.goto(args.url, wait_until='networkidle')
            page.wait_for_function('window.__magicAudio')
            assert audio()['state'] == 'uninitialized', 'autoplay before gesture'
            page.locator('.audio-options summary').click()
            page.locator('#audioToggle').click()
            ev('__magicAudio.ready()'); ev('__magicQA.tick()')
            assert audio()['state'] == 'running'
            results['checks']['gestureUnlock'] = True
            page.screenshot(path=str(out / 'startup.png'))
            for skill in ev('__magicQA.skills'):
                i = skill['index']
                ev(f'__magicAudio.select({i})'); ev('__magicAudio.ready()')
                ev('__magicQA.charging()'); ev('__magicQA.channeling()')
                ev(f'__magicQA.sample({i},.05)')
                ev(f'__magicQA.sample({i},{skill["impact"] + .03})')
                ev(f'__magicQA.sample({i},{skill["impact"] + .2})')
                snap = ev(f'__magicQA.sample({i},{skill["impact"] + .55})')
                state = audio(); cast = state['cast']
                cues = [h['cue'] for h in state['history'] if h['cast'] == cast]
                assert sorted(cues) == sorted(['precast', 'charging', 'casting', 'traveling', 'impact', 'shockwave', 'aftermath']), (skill['id'], cues)
                assert len(state['banks']) <= 3 and state['activeVoices'] <= state['voiceLimit']
                assert snap['badPrograms'] == 0 and snap['glError'] == 0 and not snap['badTransforms'], snap
                results['skills'].append({'id': skill['id'], 'cues': cues, 'voices': state['activeVoices'], 'banks': state['banks']})
                if skill['id'] in ['WATER-01', 'SHADOW-01']:
                    page.screenshot(path=str(out / (skill['id'].lower() + '.png')))
                ev('__magicAudio.stop()')
                assert audio()['activeVoices'] == 0
            results['checks']['all23SevenCues'] = True
            # A continuously playing charging loop supplies actual PCM, not just marker assertions.
            ev('__magicAudio.select(3)'); ev('__magicAudio.ready()'); ev('__magicQA.charging()')
            page.wait_for_timeout(350)
            signal = audio(); assert signal['rms'] > .0001 and signal['peak'] < 1, signal
            results['checks']['liveSignal'] = {k: signal[k] for k in ['peak', 'rms', 'maxVoices', 'decodedBytes']}
            ev('__magicAudio.pause(true)'); page.wait_for_timeout(150)
            a = audio(); page.wait_for_timeout(180); b = audio()
            assert b['state'] == 'suspended' and abs(a['currentTime'] - b['currentTime']) < .01
            ev('__magicAudio.pause(false)'); page.wait_for_timeout(150)
            assert audio()['state'] == 'running'
            ev('__magicAudio.speed(.4);__magicQA.tick()'); page.wait_for_timeout(100)
            assert all(abs(r - .4) < .03 for r in audio()['rates'])
            ev('__magicAudio.speed(1);__magicQA.tick()')
            results['checks']['pauseResumeSlowMotion'] = True
            page.locator('#audioVolume').fill('0'); page.locator('#audioVolume').dispatch_event('input')
            page.wait_for_timeout(300); muted = audio()
            assert muted['muted'] and muted['rms'] < .00001, muted
            page.locator('#audioVolume').fill('1'); page.locator('#audioVolume').dispatch_event('input')
            ev('__magicAudio.spatial(12)'); page.wait_for_timeout(350); near = audio()
            ev('__magicAudio.spatial(120)'); page.wait_for_timeout(350); far = audio()
            assert near['rms'] > far['rms'] * 1.8, (near['rms'], far['rms'])
            results['checks']['spatialAttenuation'] = {'nearRms': near['rms'], 'farRms': far['rms'], 'listener': far['listener'], 'source': far['center']}
            ev('__magicAudio.stop()'); page.locator('#ambientAudio').check(); page.wait_for_timeout(400)
            assert audio()['ambient']; page.locator('#ambientAudio').uncheck(); assert not audio()['ambient']
            results['checks']['ambientToggle'] = True
            # Force a decode failure in a bank evicted by the 3-bank cache.
            page.route('**/assets/audio/spells/earth/impact.wav', lambda route: route.fulfill(status=200, body='invalid WAV', content_type='audio/wav'))
            ev('__magicAudio.select(4)'); ev('__magicAudio.ready()')
            assert audio()['fallbacks'] == 1, audio()
            ev('__magicQA.charging()'); ev('__magicQA.sample(4,.05)'); ev('__magicQA.sample(4,3)')
            results['checks']['missingAssetFallback'] = True
            page.unroute('**/assets/audio/spells/earth/impact.wav')
            # Audible browser recording across three identities; video is captured separately.
            ev('__magicAudio.recordStart()')
            for i in [0, 3, 6]:
                ev(f'__magicAudio.select({i})'); ev('__magicAudio.ready()'); ev('__magicQA.charging()')
                page.wait_for_timeout(500)
                ev(f'__magicQA.sample({i},.05)'); page.wait_for_timeout(350)
                impact = ev(f'__magicQA.skills[{i}].impact')
                for offset in [.03, .2, .55]:
                    ev(f'__magicQA.sample({i},{impact + offset})'); page.wait_for_timeout(200)
                page.wait_for_timeout(600)
                assert audio()['peak'] < 1
            (out / 'browser-audio.webm').write_bytes(base64.b64decode(ev('__magicAudio.recordEnd()')))
            ev('__magicAudio.stop()')
            page.locator('#audioToggle').click(); page.wait_for_timeout(150)
            assert not audio()['enabled'] and audio()['state'] == 'suspended' and audio()['activeVoices'] == 0
            results['checks']['disableCleanup'] = True
            ev('__magicAudio.dispose()'); page.wait_for_timeout(100)
            final = audio()
            assert final['state'] == 'closed' and final['decodedBytes'] == 0 and not final['banks']
            results['checks']['dispose'] = True
            assert not errors, errors
            results['passed'] = True
        except Exception as error:
            results['passed'] = False; results['failure'] = str(error)
            page.screenshot(path=str(out / 'failure.png'))
            try: results['audioOnFailure'] = audio()
            except Exception: pass
            raise
        finally:
            results.update(errors=errors, warnings=warnings)
            (out / 'results.json').write_text(json.dumps(results, ensure_ascii=False, indent=2))
            browser.close()
    print(json.dumps({'passed': results['passed'], 'skills': len(results['skills']), 'checks': results['checks']}))

if __name__ == '__main__':
    main()
