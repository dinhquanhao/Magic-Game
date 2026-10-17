"""Reproducible DSP measurements and per-cue repair ledger. No listening claims."""
import argparse,hashlib,json,math,os,subprocess,wave
from pathlib import Path
os.environ.setdefault('MPLCONFIGDIR',str(Path('work/matplotlib').resolve()))
import numpy as np
from scipy import signal
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
ROOT=Path(__file__).resolve().parents[1]
os.chdir(ROOT)
ORDER=['WATER','EARTH','WIND','FIRE','ICE','LIGHTNING','POISON','LIGHT','SHADOW','BLOOD','SPACE','TIME','MAGMA','ASTRAL','NATURE']
REPORT=Path('audio/reports');REPORT.mkdir(parents=True,exist_ok=True)
def db(x):return float(20*np.log10(max(1e-12,float(x))))
def read_wav(path):
 with wave.open(str(path),'rb') as f:rate=f.getframerate();x=np.frombuffer(f.readframes(f.getnframes()),dtype='<i2').astype(float)/32768
 return rate,x
def measure(rate,x):
 peak=float(np.max(np.abs(x)));rms=float(np.sqrt(np.mean(x*x)));truepeak=float(np.max(np.abs(signal.resample_poly(x,4,1))))
 freq,power=signal.welch(x,rate,nperseg=min(2048,len(x)))
 total=max(1e-20,np.sum(power));bands=[]
 for low,high in [(20,80),(80,250),(250,2000),(2000,6000),(6000,rate/2)]:bands.append(float(np.sum(power[(freq>=low)&(freq<high)])/total))
 width=round(rate*.02);chunks=np.array([np.sqrt(np.mean(x[i:i+width]**2)) for i in range(0,len(x)-width+1,width)])
 tail=db(np.sqrt(np.mean(x[-width:]**2)));maximum=db(max(chunks))
 def centroid(part):
  f,p=signal.welch(part,rate,nperseg=min(1024,len(part)));return float(np.sum(f*p)/max(1e-20,np.sum(p)))
 # Approximate perceptual weighting; not a certified BS.1770/R128 implementation.
 weighted=signal.sosfilt(signal.butter(2,70,fs=rate,btype='highpass',output='sos'),x)
 weighted+=.35*signal.sosfilt(signal.butter(2,1800,fs=rate,btype='highpass',output='sos'),x)
 return {'peakDbFS':db(peak),'truePeakDbTP4x':db(truepeak),'rmsDbFS':db(rms),'lufsApprox':db(np.sqrt(np.mean(weighted**2)))-.691,'duration':len(x)/rate,'dc':float(abs(np.mean(x))),'seam':float(abs(x[0]-x[-1])),'tailDropDb':maximum-tail,'centroidHz':centroid(x),'riserCentroidDeltaHz':centroid(x[int(len(x)*.45):int(len(x)*.8)])-centroid(x[int(len(x)*.05):int(len(x)*.25)]),'bands':bands,'vacuumRmsDbFS':db(np.sqrt(np.mean(x[-round(rate*.08):]**2))),'vacuumBoundaryDelta':float(abs(x[len(x)-round(rate*.09)]-x[len(x)-round(rate*.09)-1])), 'finite':bool(np.isfinite(x).all())}
def failures(cue,m):
 t=cue['thresholds'];errors=[]
 if not m['finite']:errors.append('nonfinite')
 if m['truePeakDbTP4x']>t['truePeakDbMax']:errors.append('true-peak')
 if abs(m['rmsDbFS']-cue['targetRmsDb'])>t['rmsToleranceDb']:errors.append('RMS/crest')
 if m['dc']>t['dcMax']:errors.append('DC')
 if cue.get('loop') and m['seam']>t['seamMax']:errors.append('loop seam')
 if not cue.get('loop') and cue['role'] not in ['riser','precast'] and m['tailDropDb']<t['tailDropDb']:errors.append('tail envelope')
 if cue['role']=='riser' and (m['riserCentroidDeltaHz']<80 or m['vacuumRmsDbFS']>-70 or m['vacuumBoundaryDelta']>.015):errors.append('riser/vacuum')
 return errors
def plots(cue,variants):
 dest=REPORT/'cues'/cue['element'].lower();dest.mkdir(parents=True,exist_ok=True)
 fig,ax=plt.subplots(figsize=(8,2.2),dpi=110);fig.patch.set_facecolor('#091523');ax.set_facecolor('#091523')
 for v,(rate,x,m) in enumerate(variants):
  step=max(1,len(x)//1800);ax.plot(np.arange(0,len(x),step)/rate,x[::step],lw=.6,alpha=.85 if not v else .35)
 ax.set(title=f"{cue['id']} · variants · chưa kiểm chứng bằng tai",xlabel='seconds',ylabel='PCM');ax.tick_params(colors='#abc8d1');ax.title.set_color('#cde8ef');ax.xaxis.label.set_color('#abc8d1');ax.yaxis.label.set_color('#abc8d1');fig.tight_layout();fig.savefig(dest/f'{cue["role"]}-waveform.png');plt.close(fig)
 rate,x,m=variants[0];f,t,z=signal.stft(x,rate,nperseg=512,noverlap=384)
 fig,ax=plt.subplots(figsize=(8,2.2),dpi=110);im=ax.pcolormesh(t,f,20*np.log10(np.maximum(1e-7,np.abs(z))),shading='auto',cmap='magma',vmin=-85,vmax=-12);ax.set(ylim=(20,10000),ylabel='Hz',xlabel='seconds',title=f"{cue['id']} · centroid {m['centroidHz']:.0f} Hz");fig.colorbar(im,ax=ax,label='dB (STFT magnitude)');fig.tight_layout();fig.savefig(dest/f'{cue["role"]}-spectrogram.png');plt.close(fig)
def run(element,makeplots=True,only=None):
 subprocess.run(['node','audio/render.mjs','--element',element],check=True,capture_output=True,text=True)
 registry=json.loads(Path('audio/cue-registry.json').read_text());cues=[c for c in registry if c['element']==element and (not only or c['id']==only)]
 correctionfile=REPORT/'corrections.json';corrections=json.loads(correctionfile.read_text()) if correctionfile.exists() else {}
 historyfile=REPORT/'cue-history.json';history=json.loads(historyfile.read_text()) if historyfile.exists() else {}
 final=[]
 for cue in cues:
  records=history.setdefault(cue['id'],[]);variants=[]
  for iteration in range(len(records)+1,6):
   variants=[];issues=[]
   for v in range(4 if cue.get('repeated') else 1):
    path=Path(f'audio/rendered/{cue["id"]}-{v}.wav');rate,x=read_wav(path);m=measure(rate,x);bad=failures(cue,m);variants.append((rate,x,m));issues+=bad
   records.append({'iteration':len(records)+1,'parameters':corrections.get(cue['id'],{}).copy(),'variants':[m for _,_,m in variants],'failures':sorted(set(issues)),'status':'PASS' if not issues else 'FAIL','earVerified':False})
   historyfile.write_text(json.dumps(history,indent=2)+'\n')
   if not issues:break
   if iteration==5:break
   change=corrections.setdefault(cue['id'],{})
   if 'RMS/crest' in issues:change['drive']=change.get('drive',1)*1.8
   if 'true-peak' in issues:change['correctionDb']=change.get('correctionDb',0)-1
   if 'DC' in issues or 'tail envelope' in issues or 'riser/vacuum' in issues:
    # These are shape failures, not repairable by gain. Preserve the failure and
    # stop for an intentional formula correction in source rather than random edits.
    break
   correctionfile.write_text(json.dumps(corrections,indent=2)+'\n')
   subprocess.run(['node','audio/render.mjs','--element',element,'--only',cue['id']],check=True,capture_output=True,text=True)
  if makeplots:plots(cue,variants)
  final.append({'id':cue['id'],'role':cue['role'],'iterations':len(records),'status':records[-1]['status'],'failures':records[-1]['failures'],'metrics':records[-1]['variants'],'earVerified':False})
 previousfile=REPORT/f'{element.lower()}.json'
 if only and previousfile.exists():final=[c for c in json.loads(previousfile.read_text())['cues'] if c['id']!=only]+final
 result={'element':element,'cues':final,'passed':all(c['status']=='PASS' for c in final),'earVerified':False}
 (REPORT/f'{element.lower()}.json').write_text(json.dumps(result,indent=2)+'\n')
 with Path('AUDIO_PROGRESS.md').open('a') as f:
  f.write(f"\n### {element} — render/đo cue\n\n- {sum(c['status']=='PASS' for c in final)}/{len(final)} logical cue đạt ngưỡng kỹ thuật, max {max(c['iterations'] for c in final)} vòng; lịch sử trước/sau: audio/reports/cue-history.json. Chưa kiểm chứng bằng tai.\n")
  for c in final:
   f.write(f"- `{c['id']}`: {c['status']} (vòng {c['iterations']}), RMS {c['metrics'][0]['rmsDbFS']:.2f} dBFS, TP4× {c['metrics'][0]['truePeakDbTP4x']:.2f} dBTP; {', '.join(c['failures']) or 'ngưỡng đạt'}.\n")
 print(json.dumps({'element':element,'passed':result['passed'],'failed':[c['id']+':'+','.join(c['failures']) for c in final if c['status']=='FAIL']}),flush=True)
 return result
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--element',choices=ORDER);p.add_argument('--no-plots',action='store_true');p.add_argument('--only');args=p.parse_args()
 for e in ([args.element] if args.element else ORDER):run(e,not args.no_plots,args.only)
