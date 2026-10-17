"""Fixed-camera ground evidence; fixtures are injected only by Playwright."""
import argparse
import base64
import json
from pathlib import Path

from playwright.sync_api import sync_playwright
from playwright_smoke import HOOK

parser = argparse.ArgumentParser()
parser.add_argument('--url', default='http://127.0.0.1:5183/')
parser.add_argument('--output', required=True)
parser.add_argument('--baseline-only', action='store_true')
args = parser.parse_args()
out = Path(args.output)
out.mkdir(parents=True, exist_ok=True)
fixture = r'''
window.__groundQA={
 clear(){if(effect){scene.remove(effect);disposeTree(effect);effect=null;}graphics.resetSurface();},
 render(){elapsed=42;renderer.toneMappingExposure=1.2;camera.position.set(19,18,24);controls.target.set(0,4.5,0);controls.update();graphics.update(42,camera,false);composer.render();return canvas.toDataURL('image/png').split(',')[1];},
 baseline(q){this.clear();config.quality=q;config.qualityScale={Low:.35,Medium:.62,High:1,Ultra:1.4}[q];graphics.applyQuality(q,{...GRAPHICS_PRESETS[q],adaptive:false});return this.render();},
 surface(name){graphics.resetSurface();graphics.updateSurface({time:42,radius:35,[name]:1});return this.render();},
 nature(){__magicQA.sample(skillDefs.findIndex(s=>s.id==='NATURE-01'),8.2);return this.render();},
 state(){return {...__magicQA.snapshot(),ground:{color:floor.material.color.getHexString(),roughness:floor.material.roughness,metalness:floor.material.metalness}};}
};
'''
result = {'passed': False, 'errors': [], 'warnings': [], 'checks': [],
          'renderer': 'Chromium / SwiftShader; not a native GPU benchmark'}
with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
        args=['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    page = browser.new_page(viewport={'width': 1100, 'height': 740})
    page.set_default_timeout(60000)
    page.on('pageerror', lambda e: result['errors'].append(str(e)))
    page.on('console', lambda m: result['errors' if m.type == 'error' else 'warnings'].append(m.text)
            if m.type in ['error', 'warning'] else None)
    page.on('requestfailed', lambda r: result['errors'].append(r.url + ': ' + str(r.failure)))

    def intercept(route):
        response = route.fetch()
        source = response.text()
        assert source.count('requestAnimationFrame(animate);') == 1
        assert source.count('select(0);animate();') == 1
        source = source.replace('requestAnimationFrame(animate);', '').replace('select(0);animate();', 'select(0);')
        route.fulfill(response=response, body=source + '\n' + HOOK + fixture)

    page.route('**/src/main.js*', intercept)

    def capture(name, expression):
        png = page.evaluate(expression)
        (out / (name + '.png')).write_bytes(base64.b64decode(png))
        state = page.evaluate('__groundQA.state()')
        assert state['glError'] == 0 and state['badPrograms'] == 0 and not state['badTransforms'], state
        result['checks'].append({'name': name, 'state': state})
        print(name + ': PASS', flush=True)
        return png

    try:
        page.goto(args.url, wait_until='networkidle')
        skills = page.evaluate('__magicQA.skills')
        result['registry'] = skills
        assert len(skills) == 21 and len({s['element'] for s in skills}) == 15
        for quality in (['Low'] if args.baseline_only else ['Low', 'Medium', 'High', 'Ultra']):
            baseline = capture(quality + '-baseline', '__groundQA.baseline(' + json.dumps(quality) + ')')
            if args.baseline_only or quality not in ['Low', 'High']:
                continue
            for surface in ['wet', 'burn', 'frost', 'mud', 'nature']:
                changed = capture(quality + '-' + surface, '__groundQA.surface(' + json.dumps(surface) + ')')
                assert changed != baseline, surface + ' did not change the rendered surface'
            capture(quality + '-nature-skill', '__groundQA.nature()')
            restored = capture(quality + '-restored', '__groundQA.baseline(' + json.dumps(quality) + ')')
            assert restored == baseline, quality + ' reset did not restore the fixed-time baseline'
        assert not result['errors'], result['errors']
        result['passed'] = True
    except Exception as error:
        result['failure'] = str(error)
        raise
    finally:
        (out / 'results.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
        browser.close()
