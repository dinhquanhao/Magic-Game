"""Run against `npm run dev`; no test globals are shipped in the application.

The route fixture pauses RAF and exposes the existing module's simulation to
sample VFX milestones deterministically. Separate production UI coverage uses
the built preview with no interception (--production).
"""
import argparse
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

HOOK = r'''
clock.getDelta=()=>.05;
config.auto=false;config.runes=false;config.cameraShake=false;config.hitStop=false;config.slowMotion=false;
config.quality='Low';config.qualityScale=.35;
graphics.applyQuality('Low',{...GRAPHICS_PRESETS.Low,adaptive:false});
document.querySelector('#qualityPreset').value='Low';for(const id of ['auto','runes','cameraShakeToggle','hitStopToggle','slowMotionToggle'])document.getElementById(id).checked=false;syncGraphicsFeatureControls();
window.__magicQA={
 skills:skillDefs.map((s,i)=>({index:i,id:s.id,name:s.vi,element:s.elementIndex,impact:cinematicPlans[i].impactAt,end:s.runeTower.timelineEnd})),
 sample(i,time){
  if(spell!==i||!effect)select(i);
  if(!effect)return {failed:true};
  const d=effect.userData;d.phase='active';d.root.visible=d.skill.shape!=='eternalRequiem';d.transfer.visible=false;
  d.activeTime=Math.max(0,time-.05);elapsed=5+time;animate();return this.snapshot();
 },
 tick(count=1){for(let i=0;i<count;i++)animate();return this.snapshot();},
 charging(){cast();elapsed=config.castTime*effect.userData.skillPlan.pace/config.runeDrawSpeed*.5;animate();return this.snapshot();},
 channeling(){effect.userData.phase='channeling';effect.userData.channelTime=.2;animate();return this.snapshot();},
 finish(auto=false){config.auto=auto;return this.sample(spell,skillDefs[spell].runeTower.timelineEnd+.2);},
 setRunes(enabled){config.runes=enabled;},
 area(i,meters){
  if(!playMode)setPlayMode(true);select(i);config.aoeRadius=meters;config.aoeScale=meters/skillDefs[i].aoe;
  updatePlayHud();cast(new THREE.Vector3(9,0,-7));return this.sample(i,cinematicPlans[i].impactAt);
 },
 watchdog(enabled){graphics.setFeature('adaptive',enabled);adaptiveQualityReduced=false;lowerRuntimeQuality('regression test',100);syncGraphicsFeatureControls();return this.snapshot();},
 sequence(i,time){
  select(i);const d=effect.userData;d.phase='active';d.root.visible=d.skill.shape!=='eternalRequiem';d.transfer.visible=false;
  const render=composer.render;composer.render=()=>{};
  try{while(effect?.userData===d&&d.activeTime<time-.05)animate();}
  finally{composer.render=render;}
  animate();return this.snapshot();
 },
 loseContext(){this.contextExtension=renderer.getContext().getExtension('WEBGL_lose_context');if(!this.contextExtension)throw new Error('WEBGL_lose_context unavailable');this.contextExtension.loseContext();},
 restoreContext(){this.contextExtension.restoreContext();},
 snapshot(){
  const gl=renderer.getContext();const badTransforms=[];scene.traverse(o=>{if(![...o.position,...o.scale,...o.quaternion].every(Number.isFinite))badTransforms.push(o.name||o.type);});
  return {skill:skillDefs[spell].id,active:!!effect,phase:effect?.userData.phase,time:effect?.userData.activeTime,
   areaRadius:effect?.userData.areaRadius,vfxRadius:effect?.userData.attack?.radius,previewRadius:targetReticle.scale.x,camera:camera.position.toArray(),environmentId:graphics.environmentTarget?.texture.uuid??null,status:document.querySelector('#status').textContent,mana,playMode,paused:config.paused,contextLost:webglContextLost,
   density:config.density,debrisDensity:config.debrisDensity,runtimeDensityScale,effectiveDensity:vfxConfig.density,
   render:{...renderer.info.render},memory:{...renderer.info.memory},badTransforms,
   badPrograms:renderer.info.programs.filter(p=>p.diagnostics?.runnable===false).length,glError:gl.getError(),
   graphics:graphics.getDiagnostics(),feedback:document.querySelector('[data-cast-phase]').textContent};
 }
};
'''

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--url',default='http://127.0.0.1:5173/')
    parser.add_argument('--output',default='test-results/magic-game')
    parser.add_argument('--production',action='store_true')
    parser.add_argument('--context-only',action='store_true')
    parser.add_argument('--areas-only',action='store_true')
    args=parser.parse_args()
    out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
    errors=[];warnings=[];results=[]
    with sync_playwright() as p:
        executable=os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE')
        if not executable and Path('/usr/bin/chromium').exists():executable='/usr/bin/chromium'
        browser=p.chromium.launch(executable_path=executable,headless=True,
            args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        page=browser.new_page(viewport={'width':960,'height':640})
        page.on('pageerror',lambda e:errors.append({'type':'pageerror','text':str(e)}))
        page.on('console',lambda m:(errors if m.type=='error' else warnings).append({'type':m.type,'text':m.text}) if m.type in ['error','warning'] else None)
        page.on('requestfailed',lambda r:errors.append({'type':'requestfailed','text':r.url+': '+str(r.failure)}))
        if not args.production:
            def intercept(route):
                response=route.fetch();source=response.text()
                assert source.count('requestAnimationFrame(animate);')==1
                assert source.count('select(0);animate();')==1
                source=source.replace('requestAnimationFrame(animate);','').replace('select(0);animate();','select(0);')
                route.fulfill(response=response,body=source+'\n'+HOOK)
            page.route('**/src/main.js*',intercept)
        try:
            page.goto(args.url,wait_until='networkidle')
            page.wait_for_function("document.querySelectorAll('[data-element]').length===15")
            ids=page.locator('[id]').evaluate_all('(els)=>els.map(e=>e.id)')
            assert len(ids)==len(set(ids)), 'Duplicate DOM IDs'
            if args.production:
                page.locator('#qualityPreset').select_option('Low')
                page.locator('[data-element="1"]').click()
                assert page.locator('[data-spell]').count()==1
                assert 'Hải Thần' in page.locator('#spellTitle').inner_text()
                page.locator('#modeToggle').click()
                assert page.locator('#playHud').is_visible()
                page.locator('#castButton').click()
                page.wait_for_function("document.querySelector('#manaText').textContent!=='100 / 100'")
                page.locator('#pauseButton').click()
                page.screenshot(path=str(out/'production-play.png'))
                results.append({'productionUI':'passed','elements':15})
            else:
                page.wait_for_function('window.__magicQA')
                skills=page.evaluate('__magicQA.skills')
                assert len(skills)==21 and len(set(s['element'] for s in skills))==15
                def state(expression='__magicQA.snapshot()'):
                    value=page.evaluate(expression)
                    assert not value.get('failed'),value
                    assert value['badPrograms']==0,value
                    assert value['glError']==0,value
                    assert not value['badTransforms'],value
                    return value
                if args.areas_only:
                    for skill in skills:
                        for meters in [120,350]:
                            sample=state(f"__magicQA.area({skill['index']},{meters})")
                            assert abs(sample['areaRadius']-sample['vfxRadius'])<1e-5,sample
                            assert abs(sample['areaRadius']-sample['previewRadius'])<1e-5,sample
                            results.append({'skill':skill['id'],'meters':meters,'sample':sample})
                        print(skill['id']+' AOE 120/350: passed',flush=True)
                    # A slider edit during an existing cast affects the next cast's
                    # preview; the active impact must keep its constructed radius.
                    before=state()['areaRadius']
                    page.locator('#aoeRadius').evaluate("e=>{e.value='120';e.dispatchEvent(new Event('input',{bubbles:true}));}")
                    after=state('__magicQA.tick()')
                    assert after['areaRadius']==before
                    page.screenshot(path=str(out/'aoe-play.png'))
                    assert not errors,errors[:3]
                    print('AOE matrix: PASS',flush=True)
                    return
                if args.context_only:
                    # Reproduce the Play -> Showcase camera transition before capture.
                    page.locator('#modeToggle').click();state('__magicQA.tick()')
                    page.locator('#modeToggle').click()
                    assert state()['camera'][1]>10
                    page.set_viewport_size({'width':1280,'height':800})
                    for i,t,name in [(0,2,'fire'),(3,8,'water'),(6,11,'shadow'),(16,11,'blood')]:
                        state(f'__magicQA.sequence({i},{t})')
                        page.screenshot(path=str(out/(name+'.png')))
                    before=state()['environmentId']
                    page.evaluate('__magicQA.loseContext()')
                    page.wait_for_function('__magicQA.snapshot().contextLost')
                    page.evaluate('__magicQA.restoreContext()')
                    page.wait_for_function('!__magicQA.snapshot().contextLost',timeout=30000)
                    restored=state('__magicQA.tick()')
                    assert restored['environmentId']!=before
                    page.screenshot(path=str(out/'restored.png'))
                    results.append({'contextRecovery':restored})
                    assert not errors,errors[:3]
                    print('Context and camera recovery: PASS',flush=True)
                    return
                # Every skill compiles and renders at release, impact and aftermath.
                for skill in skills:
                    samples=[]
                    for t in [.1,skill['impact'],min(skill['end']-.2,skill['impact']+3)]:
                        samples.append(state(f"__magicQA.sample({skill['index']},{t})"))
                    results.append({'skill':skill['id'],'quality':'Low','samples':samples})
                    print(skill['id']+' Low: passed',flush=True)
                # Corrected shaders also compile with PBR shadows and all High passes.
                page.locator('#qualityPreset').select_option('High')
                page.locator('.graphics-options').evaluate('(e)=>e.open=true')
                page.locator('#graphicsAdaptive').uncheck()
                for skill in skills:
                    # Include all procedural categories and the forest skill.
                    sample=state(f"__magicQA.sample({skill['index']},{skill['impact']})")
                    results.append({'skill':skill['id'],'quality':'High','sample':sample})
                    print(skill['id']+' High: passed',flush=True)
                # AO variants, DoF, SSR and DPR/viewport resizing while casting.
                for quality in ['Medium','Ultra','Low']:
                    page.locator('#qualityPreset').select_option(quality)
                    page.locator('#graphicsAdaptive').uncheck()
                    page.locator('#graphicsDof').check()
                    state('__magicQA.tick()')
                    page.set_viewport_size({'width':880,'height':620})
                    state('__magicQA.tick()')
                    page.locator('#graphicsDof').uncheck()
                # Feedback shares simulation time and freezes with pause.
                state('__magicQA.charging()')
                assert page.locator('[data-cast-phase]').inner_text()=='VẼ PHÙ VĂN'
                page.locator('#pauseButton').click()
                before=page.locator('[data-cast-remaining]').inner_text()
                state('__magicQA.tick(3)')
                assert page.locator('[data-cast-remaining]').inner_text()==before
                assert page.locator('[data-cast-phase]').inner_text()=='TẠM DỪNG'
                page.locator('#pauseButton').click()
                state('__magicQA.channeling()')
                assert page.locator('[data-cast-phase]').inner_text()=='HỘI TỤ'
                page.locator('#impactFlash').evaluate("e=>{e.value='0.45';e.dispatchEvent(new Event('input',{bubbles:true}));}")
                assert page.locator('#impactFlashOut').inner_text()=='0.45'
                # Runtime degradation preserves low user-selected densities.
                page.locator('#density').evaluate("e=>{e.value='0.25';e.dispatchEvent(new Event('input',{bubbles:true}));}")
                page.locator('#debrisDensity').evaluate("e=>{e.value='0.2';e.dispatchEvent(new Event('input',{bubbles:true}));}")
                disabled=state('__magicQA.watchdog(false)')
                assert disabled['runtimeDensityScale']==1
                limited=state('__magicQA.watchdog(true)')
                assert limited['density']==.25 and limited['debrisDensity']==.2
                assert limited['effectiveDensity']<.25
                results.append({'watchdog':limited})
                page.locator('#graphicsAdaptive').uncheck()
                page.locator('#density').evaluate("e=>{e.value='1';e.dispatchEvent(new Event('input',{bubbles:true}));}")
                page.locator('#debrisDensity').evaluate("e=>{e.value='1';e.dispatchEvent(new Event('input',{bubbles:true}));}")
                # Repeated rendered casts must return to the same GPU/resource counts.
                memory=[]
                for i in range(10):
                    state('__magicQA.sample(16,12.8)')
                    completed=state('__magicQA.finish(false)')
                    assert not completed['active']
                    memory.append({'memory':completed['memory'],'tracked':completed['graphics']['trackedMaterials']})
                assert all(m==memory[1] for m in memory[2:]),memory
                results.append({'repeatCasts':10,'memory':memory})
                for i in [0,3,16]:
                    state(f'__magicQA.sample({i},1)')
                    repeated=state('__magicQA.finish(true)')
                    assert repeated['active'] and repeated['phase']=='charging'
                state('__magicQA.finish(false)')
                # Real Play Mode UI respects mana, cooldown and pause.
                page.locator('#modeToggle').click()
                page.locator('#castButton').click();castState=state('__magicQA.tick()')
                assert castState['mana']<100 and castState['active']
                mana=castState['mana'];page.locator('#castButton').click()
                assert state()['mana']==mana
                page.locator('#pauseButton').click()
                page.locator('#castButton').click()
                assert state()['mana']==mana
                page.locator('#pauseButton').click()
                page.locator('#resetButton').click()
                assert state()['mana']==100 and not state()['active']
                page.locator('#modeToggle').click()
                # Render representative effects using sequential simulation updates.
                page.set_viewport_size({'width':1280,'height':800})
                for i,t,name in [(0,2,'fire'),(3,8,'water'),(8,8,'lightning'),(16,11,'blood')]:
                    state(f'__magicQA.sequence({i},{t})')
                    page.screenshot(path=str(out/(name+'.png')))
                state('__magicQA.charging()');page.evaluate('__magicQA.setRunes(true)')
                state('__magicQA.tick()');page.screenshot(path=str(out/'rune-tower.png'))
                page.evaluate('__magicQA.setRunes(false)')
                # Exercise a real WEBGL_lose_context cycle, then render again.
                page.evaluate('__magicQA.loseContext()')
                page.wait_for_function('__magicQA.snapshot().contextLost')
                page.evaluate('__magicQA.restoreContext()')
                page.wait_for_function('!__magicQA.snapshot().contextLost',timeout=30000)
                state('__magicQA.tick()')
                results.append({'contextRecovery':'passed'})
            assert not errors,errors[:3]
            print('PASS',flush=True)
        finally:
            (out/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
            (out/'errors.json').write_text(json.dumps(errors,ensure_ascii=False,indent=2))
            (out/'warnings.json').write_text(json.dumps(warnings,ensure_ascii=False,indent=2))
            browser.close()

if __name__=='__main__':main()
