"""Browser regression for the current synthesized audio, with real WebAudio.

The route adds test access to the existing engine and pauses visual RAF. No
test globals ship. Separate production smoke coverage keeps normal UI/RAF.
"""
import argparse
import base64
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
from playwright_smoke import HOOK

parser = argparse.ArgumentParser()
parser.add_argument('--url', default='http://127.0.0.1:5181/')
parser.add_argument('--output', default='work/audio-resume/round1')
parser.add_argument('--lab-only', action='store_true')
args = parser.parse_args()
out = Path(args.output)
out.mkdir(parents=True, exist_ok=True)
result = {'passed': False, 'checks': {}, 'skills': [], 'errors': [], 'earVerified': False}
EXTRA = r'''
window.__audioQA={
 sound,lab:audioLab,scores:skillDefs.map((s,i)=>buildSkillScore(s,cinematicPlans[i])),
 pose:{position:[0,3,16],forward:[0,0,-1],up:[0,1,0]},
 frame(score,time=0,phase='active',id=score.id){return {id,skillId:score.id,element:score.element,phase,time,score,center:[0,0,0],caster:[0,0,0],radius:20,towerProgress:.5,tiers:8};},
 step(score,time=0,phase='active',rate=1,id=score.id){sound.update(this.frame(score,time,phase,id),this.pose,rate,false);return sound.diagnostics();},
 tick(rate=1,paused=false){sound.update(this.last,this.pose,rate,paused);},
 async recordStart(){const tap=sound.createCapture();this.tap=tap;this.chunks=[];this.recorder=new MediaRecorder(tap.stream);this.recorder.ondataavailable=e=>this.chunks.push(e.data);this.recorder.start();},
 async recordEnd(){return new Promise(resolve=>{this.recorder.onstop=async()=>{const bytes=new Uint8Array(await new Blob(this.chunks).arrayBuffer());let text='';for(const x of bytes)text+=String.fromCharCode(x);this.tap.disconnect();resolve(btoa(text));};this.recorder.stop();});},
};
'''

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
        args=['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    page = browser.new_page(viewport={'width': 1280, 'height': 800})
    page.set_default_timeout(45000)
    page.on('pageerror', lambda e: result['errors'].append(str(e)))
    page.on('console', lambda m: result['errors'].append(m.text) if m.type == 'error' else None)

    def route(r):
        response = r.fetch()
        source = response.text().replace('requestAnimationFrame(animate);', '').replace('select(0);animate();', 'select(0);')
        r.fulfill(response=response, body=source + '\n' + HOOK + '\n' + EXTRA)

    page.route('**/src/main.js*', route)
    ev = page.evaluate
    diag = lambda: ev('__audioQA.sound.diagnostics()')
    try:
        page.goto(args.url, wait_until='networkidle')
        assert diag()['state'] == 'uninitialized'
        page.locator('.audio-options summary').click()
        page.wait_for_function('__audioQA.sound.diagnostics().enabled')
        ev('__audioQA.sound.ready()')
        assert diag()['state'] == 'running'
        result['checks']['gestureUnlock'] = True

        if not args.lab_only:
            # A scene with many distinct same-frame cues must respect Low's pool.
            stress = ev('''()=>{const q=__audioQA;q.sound.setQuality('Low');q.sound.stopCast(true);
              const roles=['charging','traveling','environment','drone','material','secondary','motion','rune','casting','shockwave','impact','riser'];
              const s={id:'pool-stress',element:'FIRE',impact:10,fadeAt:12,events:roles.map((role,i)=>({key:'stress-'+i,role,at:0}))};
              q.step(s,0,'charging');q.sound.stopCast(true);q.step(s,0);return q.sound.diagnostics();}''')
            assert stress['activeVoices'] <= stress['voiceLimit'], stress
            result['checks']['poolBurst'] = {k: stress[k] for k in ['activeVoices', 'liveSources', 'voiceLimit']}
            ev('__audioQA.sound.stopCast(true)')
            page.wait_for_timeout(200)

            budgets = []
            for quality, limit in [('Low', 8), ('Medium', 12), ('High', 20), ('Ultra', 28)]:
                ev('(q)=>__audioQA.sound.setQuality(q)', quality)
                ev('__audioQA.sound.testSound()')
                page.wait_for_timeout(180)
                d = diag()
                assert d['voiceLimit'] == limit and d['rms'] > 1e-7 and d['peak'] <= 10**(-1/20), d
                budgets.append({k: d[k] for k in ['preset', 'voiceLimit', 'pooledNodes', 'decodedBytes', 'peak', 'rms', 'limiter']})
                ev('__audioQA.sound.stopCast(true)')
            result['checks']['presets'] = budgets
            ev('__audioQA.sound.setQuality("Low")')

            # At the actual finale of every score, with the existing hit-stop rate,
            # one impact must be admitted, audible, and not replayed on the next tick.
            scores = ev('__audioQA.scores')
            for score in scores:
                ev('(e)=>__audioQA.sound.setSelection(e)', score['element'])
                ev('__audioQA.sound.ready()')
                ev('(s)=>__audioQA.step(s,0,"charging")', score)
                page.wait_for_timeout(140)
                ev('(s)=>__audioQA.step(s,s.impact-.11)', score)
                page.wait_for_timeout(130)
                ev('(s)=>__audioQA.step(s,s.impact,"active",0)', score)
                page.wait_for_timeout(180)
                d = diag()
                impacts = [e for e in d['history'] if e['cast'] == score['id'] and e['key'] == 'finale']
                assert len(impacts) == 1, (score['id'], impacts, d)
                assert d['rms'] > 1e-8 and d['peak'] <= 10**(-1/20) and not d['errors'], d
                ev('(s)=>__audioQA.step(s,s.impact,"active",0)', score)
                assert len([e for e in diag()['history'] if e['cast'] == score['id'] and e['key'] == 'finale']) == 1
                ev('__audioQA.sound.stopCast()')
                page.wait_for_timeout(280)
                d2 = diag()
                assert d2['liveSources'] == 0 and d2['rms'] < .0001, d2
                result['skills'].append({'id': score['id'], 'passed': True, 'impactCount': 1,
                    'rms': d['rms'], 'peak': d['peak'], 'cleanupRms': d2['rms'], 'banks': len(d2['banks'])})
                print('PASS', score['id'], flush=True)

            # Pause, time-rate changes, pending cancellation and category mute.
            ev('''()=>{const q=__audioQA,s=q.scores[0];q.sound.setSelection(s.element);
                q.last=q.frame(s,0,'charging','lifecycle');q.last.towerProgress=0;}''')
            ev('__audioQA.sound.ready()')
            ev('__audioQA.tick()')
            page.wait_for_timeout(150)
            ev('__audioQA.tick(1,true)')
            page.wait_for_timeout(100)
            a = diag()['currentTime']
            page.wait_for_timeout(150)
            assert abs(diag()['currentTime'] - a) < .01 and diag()['state'] == 'suspended'
            ev('__audioQA.tick(.4,false)')
            page.wait_for_timeout(140)
            assert all(abs(r - .4) < .03 for r in diag()['rates']), diag()
            ev('__audioQA.sound.configure({mute:true})')
            page.wait_for_timeout(250)
            assert diag()['rms'] < .00001, diag()
            ev('__audioQA.sound.configure({mute:false});__audioQA.sound.stopCast(true)')
            result['checks']['pauseRateMute'] = True

            # Switching quickly while partial banks are built must settle safely.
            ev('''async()=>{for(const s of __audioQA.scores)__audioQA.sound.setSelection(s.element);
                await __audioQA.sound.ready();}''')
            d = diag()
            assert len(d['banks']) <= 2 and not d['loading'] and not d['errors'], d
            result['checks']['rapidSelection'] = {k: d[k] for k in ['banks', 'decodedBytes', 'errors']}

        # Real Lab buttons, A/B, assets served by Vite and an actual capture.
        page.goto(args.url + '?audiolab=1', wait_until='networkidle')
        page.locator('[data-cue="water/impact"]').click()
        page.wait_for_function('__audioQA.sound.diagnostics().history.some(e=>e.cast==="lab")')
        page.wait_for_timeout(250)
        assert diag()['rms'] > 1e-8, diag()
        for selector in ['[data-lab-static-wave]', '[data-lab-static-spectrum]']:
            page.locator(selector).evaluate('(img)=>img.decode()')
            assert page.locator(selector).evaluate('(img)=>img.naturalWidth') > 0
        url = page.locator('.lab-cue a').first.get_attribute('href')
        assert page.request.get(args.url.rstrip('/') + url).status == 200
        ev('__audioQA.recordStart()')
        page.wait_for_timeout(400)
        (out / 'browser-audio.webm').write_bytes(base64.b64decode(ev('__audioQA.recordEnd()')))
        page.locator('[data-legacy="water/impact"]').click()
        page.wait_for_timeout(450)
        assert diag()['rms'] > 1e-8
        ev('__audioQA.lab.update()')
        page.screenshot(path=str(out / 'audio-lab.png'))
        page.locator('[data-lab-stop]').click()
        page.wait_for_timeout(100)
        assert not diag()['enabled'] and diag()['liveSources'] == 0
        result['checks']['labUIAssetsABStop'] = True
        assert not result['errors'], result['errors']
        result['passed'] = True
    except Exception as error:
        result['failure'] = str(error)
        try:
            result['diagnosticsOnFailure'] = diag()
            page.screenshot(path=str(out / 'failure.png'), timeout=5000)
        except Exception:
            pass
        raise
    finally:
        (out / 'results.json').write_text(json.dumps(result, ensure_ascii=False, indent=2))
        browser.close()
print(json.dumps({'passed': result['passed'], 'skills': len(result['skills']), 'checks': list(result['checks'])}))
