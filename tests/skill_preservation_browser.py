"""Compare retained skills against a pre-edit, seeded browser baseline."""
import argparse
import base64
import hashlib
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
from playwright_smoke import HOOK

p = argparse.ArgumentParser()
p.add_argument('--url', default='http://127.0.0.1:5183/')
p.add_argument('--output', required=True)
p.add_argument('--baseline')
a = p.parse_args()
out = Path(a.output)
out.mkdir(parents=True, exist_ok=True)
extra = r'''
window.__preserve={
 data(){return skillDefs.map((s,i)=>({skill:s,plan:cinematicPlans[i],profile:runeProfiles[i],mana:manaCost(s),cooldown:cooldownDuration(s),score:buildSkillScore(s,cinematicPlans[i])}));},
 start(id,q){sound.disable();if(effect){scene.remove(effect);disposeTree(effect);effect=null;}graphics.resetSurface();
 let seed=38017;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return (seed>>>0)/4294967296;};
 config.quality=q;config.qualityScale=q==='Low'?.35:1;graphics.applyQuality(q,{...GRAPHICS_PRESETS[q],adaptive:false});
 config.runes=true;config.paused=false;camera.position.set(0,18,34);controls.target.set(0,4.5,0);controls.update();
 select(skillDefs.findIndex(s=>s.id===id));effect.userData.phase='charging';elapsed=config.castTime*effect.userData.skillPlan.pace*.5;animate();return __magicQA.snapshot();},
 frame(t){return __magicQA.sample(spell,t);},
 image(){composer.render();return canvas.toDataURL('image/png').split(',')[1];}
};
'''
result = {'passed': False, 'errors': [], 'warnings': [], 'frames': [], 'data': []}
baseline = json.loads((Path(a.baseline) / 'results.json').read_text()) if a.baseline else None
with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
        args=['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    page = browser.new_page(viewport={'width': 960, 'height': 640})
    page.set_default_timeout(60000)
    page.on('pageerror', lambda e: result['errors'].append(str(e)))
    page.on('console', lambda m: result['errors' if m.type == 'error' else 'warnings'].append(m.text)
            if m.type in ['error', 'warning'] else None)

    def intercept(route):
        response = route.fetch()
        source = response.text().replace('requestAnimationFrame(animate);', '').replace('select(0);animate();', 'select(0);')
        route.fulfill(response=response, body=source + '\n' + HOOK + extra)

    page.route('**/src/main.js*', intercept)
    try:
        page.goto(a.url, wait_until='networkidle')
        data = page.evaluate('__preserve.data()')
        result['registryCount'] = len(data)
        retained = [d for d in data if d['skill']['elementIndex'] != 0 or d['skill']['slot'] == 0]
        result['data'] = retained
        assert len(retained) == 19
        if baseline:
            assert len(data) == 19
            assert retained == baseline['data'], 'Retained skill/config/cinematic/rune/audio/MP/cooldown changed'
        for d in retained:
            id = d['skill']['id']
            for q in (['Low', 'High'] if id == 'FIRE-01' else ['Low']):
                state = page.evaluate('([id,q])=>__preserve.start(id,q)', [id, q])
                phases = [('charging', None), ('impact', d['plan']['impactAt'] + .1),
                          ('aftermath', min(d['skill']['runeTower']['timelineEnd'] - .2, d['plan']['impactAt'] + 2.5))]
                for phase, time in phases:
                    if time is not None:
                        state = page.evaluate('(t)=>__preserve.frame(t)', time)
                    assert state['badPrograms'] == 0 and state['glError'] == 0 and not state['badTransforms'], state
                    name = id + '-' + q + '-' + phase + '.png'
                    png = base64.b64decode(page.evaluate('__preserve.image()'))
                    (out / name).write_bytes(png)
                    row = {'file': name, 'sha256': hashlib.sha256(png).hexdigest(), 'state': state}
                    if baseline:
                        old = next(r for r in baseline['frames'] if r['file'] == name)
                        row['pixelsIdentical'] = row['sha256'] == old['sha256']
                    result['frames'].append(row)
                print(id, q, 'PASS', flush=True)
                (out / 'results.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
        if baseline:
            assert all(r['pixelsIdentical'] for r in result['frames']), 'Fixed-camera images changed; inspect differing frames'
        assert not result['errors'], result['errors']
        result['passed'] = True
    except Exception as e:
        result['failure'] = str(e)
        raise
    finally:
        (out / 'results.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
        browser.close()
