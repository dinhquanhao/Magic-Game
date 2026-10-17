"""Exercise the compact Fire menu and hotkeys on the real production bundle."""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

p = argparse.ArgumentParser()
p.add_argument('--url', default='http://127.0.0.1:4184/')
p.add_argument('--output', required=True)
a = p.parse_args()
out = Path(a.output)
out.mkdir(parents=True, exist_ok=True)
r = {'passed': False, 'errors': [], 'warnings': [], 'checks': {}}
with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
        args=['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    page = browser.new_page(viewport={'width': 1280, 'height': 800})
    page.set_default_timeout(60000)
    page.on('pageerror', lambda e: r['errors'].append(str(e)))
    page.on('console', lambda m: r['errors' if m.type == 'error' else 'warnings'].append(m.text)
            if m.type in ['error', 'warning'] else None)
    page.on('requestfailed', lambda req: r['errors'].append(req.url + ': ' + str(req.failure)))
    try:
        page.goto(a.url, wait_until='networkidle')
        assert page.locator('[data-element]').count() == 15
        assert page.locator('#projectCount').inner_text() == '15 HỆ · 19 TUYỆT KỸ'
        page.locator('#qualityPreset').select_option('Low')
        page.locator('#auto').uncheck()
        for element, count in [(8, 3), (13, 3), (14, 1), (0, 1)]:
            page.locator(f'[data-element="{element}"]').click()
            assert page.locator('[data-spell]').count() == count
        assert page.locator('#spellTitle').inner_text() == 'Thiên Nhật Diệt Thế'
        r['checks']['menus'] = 'Fire 1; Magma 3; Astral 3; Nature 1'
        page.screenshot(path=str(out / 'fire-menu.png'))
        page.locator('#modeToggle').click()
        # Canvas is not focusable. Release the mode button so the application's
        # deliberate "ignore hotkeys on controls" guard does not swallow keys.
        page.locator('#modeToggle').evaluate('(button)=>button.blur()')
        assert page.evaluate('document.activeElement.tagName') == 'BODY'
        for key in ['2', '3']:
            page.keyboard.press(key)
            assert page.locator('#spellTitle').inner_text() == 'Thiên Nhật Diệt Thế'
            assert page.locator('#manaText').inner_text() == '100 / 100'
        r['checks']['emptyHotkeysSafe'] = True
        page.keyboard.press('KeyE')
        page.wait_for_function("document.querySelector('#manaText').textContent!=='100 / 100'")
        page.locator('#pauseButton').click()
        r['checks']['fireManaAfterCast'] = page.locator('#manaText').inner_text()
        assert 45 <= int(r['checks']['fireManaAfterCast'].split('/')[0].strip()) <= 47
        page.screenshot(path=str(out / 'fire-play.png'))
        page.goto(a.url.rstrip('/') + '/?audiolab=1', wait_until='networkidle')
        page.locator('[data-lab-element]').select_option('FIRE')
        assert page.locator('[data-lab-skill] option').count() == 1
        assert page.locator('[data-lab-skill]').input_value() == 'FIRE-01'
        r['checks']['audioLabSingleFireSkill'] = True
        assert not r['errors'], r['errors']
        r['passed'] = True
    except Exception as error:
        r['failure'] = str(error)
        raise
    finally:
        (out / 'results.json').write_text(json.dumps(r, ensure_ascii=False, indent=2) + '\n')
        browser.close()
