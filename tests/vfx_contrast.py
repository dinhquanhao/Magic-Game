"""Seeded, fixed-camera render-only images and exposure checks (no UI pixels)."""
import argparse
import base64
import json
from pathlib import Path
import numpy as np
from PIL import Image
from playwright.sync_api import sync_playwright
from playwright_smoke import HOOK

p = argparse.ArgumentParser()
p.add_argument('--url', default='http://127.0.0.1:5181/')
p.add_argument('--label', required=True)
p.add_argument('--probe', action='store_true')
p.add_argument('--all-skills', action='store_true')
p.add_argument('--quality', choices=['Low','Medium','High','Ultra'], default='Low')
p.add_argument('--impact-only', action='store_true')
a = p.parse_args()
out = Path('work/vfx-contrast') / a.label
out.mkdir(parents=True, exist_ok=True)
result = {'passed': False, 'rows': [], 'errors': [], 'warnings': [], 'measurement': 'sRGB screenshot luminance; SwiftShader; no FPS claim'}
extra = r'''
window.__contrast={
 quality(q){if(effect){scene.remove(effect);disposeTree(effect);effect=null;graphics.resetSurface();}
 config.quality=q;config.qualityScale={Low:.35,Medium:.62,High:1,Ultra:1.4}[q];
 graphics.applyQuality(q,{...GRAPHICS_PRESETS[q],adaptive:false});document.querySelector('#qualityPreset').value=q;},
 frame(i,t){sound.disable();camera.position.set(0,18,34);controls.target.set(0,4.5,0);controls.update();
 const state=__magicQA.sample(i,t);return {...state,exposure:renderer.toneMappingExposure,bloom:{threshold:bloom.threshold,strength:bloom.strength,radius:bloom.radius}};},
 image(){composer.render();return canvas.toDataURL('image/png').split(',')[1];},
 probe(threshold,strength){bloom.threshold=threshold;bloom.strength=strength;return this.image();},
 resetProbe(){bloom.threshold=.12;bloom.strength=config.bloom;}
};
'''
with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
        args=['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    page = browser.new_page(viewport={'width': 960, 'height': 640})
    page.set_default_timeout(60000)
    page.add_init_script('''let seed=38017;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return (seed>>>0)/4294967296;};''')
    page.on('pageerror', lambda e: result['errors'].append(str(e)))
    page.on('console', lambda m: result['errors' if m.type == 'error' else 'warnings'].append(m.text) if m.type in ['error', 'warning'] else None)

    def intercept(r):
        response = r.fetch()
        source = response.text().replace('requestAnimationFrame(animate);', '').replace('select(0);animate();', 'select(0);')
        r.fulfill(response=response, body=source + '\n' + HOOK + extra)

    def save(name, data):
        f = out / (name + '.png')
        f.write_bytes(base64.b64decode(data))
        rgb = np.asarray(Image.open(f).convert('RGB'), dtype=np.float64) / 255
        lum = rgb @ np.array([.2126, .7152, .0722])
        return {'image': f.name, 'whiteFraction': float(np.mean(np.min(rgb, axis=2) >= 245/255)),
            'brightFraction': float(np.mean(lum >= .95)), 'meanLuminance': float(lum.mean()),
            'luminanceP95': float(np.percentile(lum, 95)), 'luminanceStd': float(lum.std())}

    page.route('**/src/main.js*', intercept)
    try:
        page.goto(a.url, wait_until='networkidle')
        skills = page.evaluate('__magicQA.skills')
        chosen = skills if a.all_skills else [s for s in skills if s['id'] in ['FIRE-01', 'WATER-01', 'LIGHT-01', 'SHADOW-01']]
        for skill in chosen:
            page.evaluate('(q)=>__contrast.quality(q)', a.quality)
            for phase, time in [('release', .2), ('impact', skill['impact'] + .15), ('aftermath', min(skill['end']-.1, skill['impact']+2.5))]:
                if (a.all_skills or a.impact_only) and phase != 'impact':
                    continue
                state = page.evaluate('([i,t])=>__contrast.frame(i,t)', [skill['index'], time])
                assert state['badPrograms'] == 0 and state['glError'] == 0 and not state['badTransforms'], state
                assert state['graphics']['quality'] == a.quality, state
                name = skill['id'] + '-' + phase
                row = {'id': skill['id'], 'phase': phase, 'time': time, 'preset': a.quality, 'state': state,
                    **save(name, page.evaluate('__contrast.image()'))}
                if a.probe and skill['id'] in ['FIRE-01','WATER-01','LIGHT-01'] and phase == 'impact':
                    row['probes'] = []
                    for threshold, strength in [(.65, .45), (.85, .12), (10., 0.)]:
                        row['probes'].append({'threshold': threshold, 'strength': strength,
                            **save(name + f'-probe-{threshold}', page.evaluate('([t,s])=>__contrast.probe(t,s)', [threshold, strength]))})
                    page.evaluate('__contrast.resetProbe()')
                result['rows'].append(row)
                (out / 'results.json').write_text(json.dumps(result, ensure_ascii=False, indent=2))
                print(skill['id'], phase, 'white', round(row['whiteFraction'], 4), flush=True)
        page.screenshot(path=str(out / 'ui.png'))
        assert not result['errors'], result['errors']
        result['passed'] = True
    except Exception as e:
        result['failure'] = str(e)
        raise
    finally:
        (out / 'results.json').write_text(json.dumps(result, ensure_ascii=False, indent=2))
        browser.close()
