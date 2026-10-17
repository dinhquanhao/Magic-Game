"""Sequential system gates: measure, build, run browser, record, then next system."""
import json,os,shutil,subprocess
from pathlib import Path
from analyze import ORDER,run
for element in ORDER:
 report=Path(f'audio/reports/{element.lower()}.json')
 runtime=Path(f'audio/reports/runtime/{element.lower()}.json')
 if not report.exists():result=run(element)
 else:result=json.loads(report.read_text())
 if not result['passed'] and not all(c['status']=='PASS' or c['id'] in result.get('acceptedExceptions',{}) for c in result['cues']):raise SystemExit('STOP for intentional repair: '+element)
 corrections=Path('audio/reports/corrections.json')
 calibration=json.loads(corrections.read_text()) if corrections.exists() else {}
 Path('src/audio/cues/calibration.js').write_text('// Generated from measured cue history.\nexport const CUE_CALIBRATION='+json.dumps(calibration,indent=2)+';\n')
 build=subprocess.run(['npm','run','build'],capture_output=True,text=True)
 Path(f'audio/reports/{element.lower()}-build.log').write_text(build.stdout+build.stderr)
 if build.returncode:raise SystemExit('BUILD FAIL '+element)
 if not runtime.exists() or not json.loads(runtime.read_text()).get('passed'):
  browser=subprocess.run(['python','audio/verify-element.py','--element',element],capture_output=True,text=True)
  Path(f'audio/reports/{element.lower()}-browser.log').write_text(browser.stdout+browser.stderr)
  if browser.returncode:raise SystemExit('BROWSER FAIL '+element+' '+browser.stderr[-1200:])
 with Path('AUDIO_PROGRESS.md').open('a') as f:f.write(f'\n- Gate {element}: build đạt; Chromium material/impact/stop qua mixer đạt; ảnh waveform/spectrogram và JSON lưu. Chưa kiểm chứng bằng tai. Chuyển sang hệ kế theo thứ tự.\n')
 print(('SYSTEM GATE PASSED ' if result['passed'] else 'SYSTEM GATE WITH DOCUMENTED FAIL ') +element,flush=True)
print('ALL 15 SYSTEM GATES PROCESSED; CHECK DOCUMENTED EXCEPTIONS',flush=True)
