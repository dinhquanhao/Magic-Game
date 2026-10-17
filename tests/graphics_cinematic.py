"""Fixed-camera visual milestones and synchronized render measurements.

FPS is a synthetic gl.finish wall-time rate, not native-GPU gameplay FPS.
"""
import argparse,json,time
from pathlib import Path
from playwright.sync_api import sync_playwright
from playwright_smoke import HOOK
parser=argparse.ArgumentParser();parser.add_argument('--label',required=True);parser.add_argument('--url',default='http://127.0.0.1:5181/');parser.add_argument('--all-presets',action='store_true');args=parser.parse_args()
out=Path('graphics/reports')/args.label;out.mkdir(parents=True,exist_ok=True)
extra=r'''
window.__cinematicQA={
 capabilities(){const gl=renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info');return {three:THREE.REVISION,webgl2:gl instanceof WebGL2RenderingContext,maxTextures:gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS),maxVertexTextures:gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS),maxAttributes:gl.getParameter(gl.MAX_VERTEX_ATTRIBS),floatColor:!!gl.getExtension('EXT_color_buffer_float'),floatLinear:!!gl.getExtension('OES_texture_float_linear'),instancing:typeof gl.drawArraysInstanced==='function',timerQuery:!!gl.getExtension('EXT_disjoint_timer_query_webgl2'),renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)};},
 entities(){const d={meshes:0,instanced:0,points:0,materials:{},bones:0,skinned:0};scene.traverse(o=>{if(o.isMesh)d.meshes++;if(o.isInstancedMesh)d.instanced+=o.count;if(o.isPoints)d.points+=o.geometry.attributes.position.count;if(o.isBone)d.bones++;if(o.isSkinnedMesh)d.skinned++;if(o.material){for(const m of (Array.isArray(o.material)?o.material:[o.material]))d.materials[m.type]=(d.materials[m.type]||0)+1;}});return d;},
 quality(p){if(effect){scene.remove(effect);disposeTree(effect);effect=null;graphics.resetSurface();}config.quality=p;config.qualityScale={Low:.35,Medium:.62,High:1,Ultra:1.4}[p];graphics.applyQuality(p,{...GRAPHICS_PRESETS[p],adaptive:false});document.querySelector('#qualityPreset').value=p;syncGraphicsFeatureControls();},
 measure(i,t){__magicQA.sample(i,t);const readback=new Uint8Array(4),gl=renderer.getContext();gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,readback);const values=[];for(let n=0;n<2;n++){effect.userData.activeTime=t-.05;const start=performance.now();animate();gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,readback);values.push(performance.now()-start);}const mean=values.reduce((a,b)=>a+b,0)/values.length;return {frameMs:values,meanFrameMs:mean,syntheticFps:1000/mean,render:{...renderer.info.render},memory:{...renderer.info.memory},diagnostics:graphics.getDiagnostics(),programErrors:renderer.info.programs.filter(p=>p.diagnostics?.runnable===false).length,glError:renderer.getContext().getError()};}
};
'''
result={'label':args.label,'measurement':'synchronized 1-pixel readPixels wall time; includes software renderer if reported; fixed scene, not real gameplay/native-GPU FPS','skills':[],'errors':[],'warnings':[]}
previous=out/'results.json'
if previous.exists():
 old=json.loads(previous.read_text());result['skills']=old.get('skills',[]);result['errors']=old.get('errors',[]);result['warnings']=old.get('warnings',[])
completed={(r['id'],r['preset'],r['phase']) for r in result['skills']}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':960,'height':640});page.set_default_timeout(60000);page.on('pageerror',lambda e:result['errors'].append(str(e)));page.on('console',lambda m:result['errors' if m.type=='error' else 'warnings'].append(m.text) if m.type in ['error','warning'] else None)
 def intercept(route):
  response=route.fetch();s=response.text().replace('requestAnimationFrame(animate);','').replace('select(0);animate();','select(0);');route.fulfill(response=response,body=s+'\n'+HOOK+extra)
 page.route('**/src/main.js*',intercept)
 try:
  page.goto(args.url,wait_until='networkidle');result['capabilities']=page.evaluate('__cinematicQA.capabilities()');result['entities']=page.evaluate('__cinematicQA.entities()');skills=page.evaluate('__magicQA.skills');first={}
  for skill in skills:first.setdefault(skill['element'],skill)
  for skill in first.values():
   for preset in (['Low','Medium','High','Ultra'] if args.all_presets else ['Low']):
    page.evaluate('(q)=>__cinematicQA.quality(q)',preset)
    for phase,t in [('opening',.2),('climax',skill['impact']+.15),('aftermath',min(skill['end']-.1,skill['impact']+2.5))]:
     if preset!='Low' and phase!='climax':continue
     if (skill['id'],preset,phase) in completed:continue
     state=page.evaluate('([i,t])=>__cinematicQA.measure(i,t)',[skill['index'],t]);assert state['programErrors']==0 and state['glError']==0,state
     filename=f'{skill["id"]}-{preset}-{phase}.jpg';page.screenshot(path=str(out/filename),type='jpeg',quality=72)
     result['skills'].append({'id':skill['id'],'preset':preset,'phase':phase,'time':t,'image':filename,**state});(out/'results.json').write_text(json.dumps(result,indent=2))
     print(skill['id'],preset,phase,round(state['meanFrameMs'],1),flush=True)
  assert not result['errors'],result['errors'];result['passed']=True
 except Exception as error:result.update(passed=False,failure=str(error));raise
 finally:(out/'results.json').write_text(json.dumps(result,indent=2));b.close()
