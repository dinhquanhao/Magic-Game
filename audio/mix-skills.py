import json,math,subprocess,wave,os
from pathlib import Path
os.environ.setdefault('MPLCONFIGDIR',str(Path('work/matplotlib').resolve()))
import numpy as np
from scipy import signal
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from analyze import read_wav,measure,db
RATE=24000
scores=json.loads(Path('audio/scores.json').read_text());audit=json.loads(Path('audio/source-audit.json').read_text());profiles={c['element']:c['profile'] for c in json.loads(Path('audio/cue-registry.json').read_text())}
roles={c['id']:c for c in json.loads(Path('audio/cue-registry.json').read_text())};out=Path('audio/rendered/skills');out.mkdir(parents=True,exist_ok=True);report=Path('audio/reports/skills');report.mkdir(parents=True,exist_ok=True)
def write(path,x):
 path.parent.mkdir(parents=True,exist_ok=True)
 with wave.open(str(path),'wb') as f:f.setnchannels(1);f.setsampwidth(2);f.setframerate(RATE);f.writeframes(np.round(np.clip(x,-.9999,.9999)*32767).astype('<i2').tobytes())
def get(element,role,variant=0):
 p=Path(f'audio/rendered/{element.lower()}/{role}-{variant}.wav')
 if not p.exists():p=p.with_name(f'{role}-0.wav')
 return read_wav(p)[1]
allresults=[]
for index,score in enumerate(scores):
 skill=audit['skills'][index];charge=4.5*skill['pace'];start=charge+score['channelDuration'];duration=start+score['end'];n=round(duration*RATE);stems={k:np.zeros(n) for k in ['sfx','impact','ambience','magic','drone','ui']};wet=np.zeros(n)
 def add(role,at,gain=1,pitch=1,variant=0,loopto=None):
  cue=roles[f'{score["element"].lower()}/{role}'];x=get(score['element'],role,variant)
  if pitch!=1:x=np.interp(np.arange(0,len(x),pitch),np.arange(len(x)),x)
  if loopto is not None:x=np.tile(x,math.ceil(max(0,loopto-at)*RATE/len(x)))[:max(0,round((loopto-at)*RATE))]
  position=round(at*RATE);length=min(len(x),n-position)
  if length<=0:return
  level=(.85 if role=='impact' else .55 if role=='riser' else .35 if role=='drone' else .6)*gain
  if role=='impact':level*=score['element']=='TIME' and .7 or 1
  x=x[:length]*level;stems[cue['category']][position:position+length]+=x;wet[position:position+length]+=x*cue['wet']
 add('precast',0);add('charging',0,loopto=start)
 for tier in range(8):add('rune',tier/7*charge,gain=.6,pitch=2**(tier/12),variant=tier%4)
 add('environment',0,loopto=start+score['fadeAt']);add('drone',0,gain=.35,loopto=start+score['fadeAt'])
 add('traveling',start,loopto=start+max(0,score['impact']-.09))
 for event in score['events']:add(event['role'],start+event['at'],event.get('gain',1),event.get('pitch',1),event.get('variant',0))
 impact=start+score['impact'];vacuum=(np.arange(n)/RATE>=impact-.09)&(np.arange(n)/RATE<impact)
 duck=np.ones(n);duck[round(impact*RATE):min(n,round((impact+.45)*RATE))]=10**(-6/20)
 # Smooth duck/recovery, not an instantaneous hard mute.
 for category in ['ambience','drone']:stems[category]*=signal.lfilter([.03],[1,-.97],duck)*10**((-10 if category=='ambience' else -15)/20)
 mix=sum(stems.values());rng=np.random.default_rng(871+index);length=round(RATE*1.8);ir=rng.normal(size=length);ir=signal.sosfilt(signal.butter(1,3500,fs=RATE,output='sos'),ir);ir*=np.exp(-np.arange(length)/(length*.18));ir/=np.sqrt(np.sum(ir*ir));mix+=signal.fftconvolve(wet,ir)[:n]*.22
 # Complete the designed 90ms vacuum with 8ms ramps at its borders.
 vacgain=np.ones(n);a=round((impact-.09)*RATE);b=round(impact*RATE);fade=round(RATE*.008);vacgain[max(0,a-fade):a]=np.linspace(1,.015,min(fade,a));vacgain[a:b]=.015;vacgain[b:min(n,b+fade)]=np.linspace(.015,1,min(fade,n-b));mix*=vacgain
 mix=signal.sosfilt(signal.butter(2,22,btype='highpass',fs=RATE,output='sos'),mix)
 # Map simulation time through the extracted pre-slow/freeze/post-slow controller.
 controls=sorted(score.get('timeControls',[]),key=lambda e:e['at']);world=[];gains=[];w=0.;real=0.;phase='idle';remaining=0.;scale=1.;post_duration=0.;post_scale=1.;event_index=0;freeze_age=0.;step=.001
 while w<score['end'] and real<score['end']*10:
  while event_index<len(controls) and w>=controls[event_index]['at']:
   event=controls[event_index];event_index+=1;remaining=event['duration']
   if event['type']=='pre':phase='pre';scale=event['scale']
   else:phase='freeze';post_duration=event['postDuration'];post_scale=event['postScale'];freeze_age=0
  if phase=='freeze':current_scale=0.;freeze_age+=step
  elif phase=='pre':current_scale=scale
  elif phase=='post':current_scale=post_scale+(1-post_scale)*(1-max(0,remaining)/max(.001,post_duration))
  else:current_scale=1.
  world.append(w+freeze_age*.02 if phase=='freeze' else w);gains.append(.18 if phase=='freeze' and freeze_age>.0167 else 1.)
  w+=step*current_scale;real+=step
  if phase!='idle':
   remaining-=step
   if remaining<=0:
    if phase=='freeze':phase='post';remaining=post_duration
    else:phase='idle'
 wall=np.arange(0,real,1/RATE);world_sample=np.interp(wall,np.arange(len(world))*.001,world);duck_sample=np.interp(wall,np.arange(len(gains))*.001,gains)
 charge_samples=round(start*RATE);original=mix[charge_samples:];mix=np.concatenate([mix[:charge_samples],np.interp(world_sample*RATE,np.arange(len(original)),original)*duck_sample]);n=len(mix)
 impact=start+float(wall[np.argmax(world_sample>=score['impact'])]);duration=n/RATE;a=round((impact-.09)*RATE);b=round(impact*RATE)
 # Reference master is conservative -9dB; DSP limiter is the actual worklet core.
 mix*=10**(-9/20);raw=Path('work/audio-v3')/(score['id']+'-raw.wav');write(raw,mix)
 target=out/(score['id']+'.wav');info=subprocess.run(['node','audio/master.mjs',str(raw),str(target)],capture_output=True,text=True,check=True);limiter=json.loads(info.stdout)
 _,pcm=read_wav(target);m=measure(RATE,pcm)
 window=round(RATE*.05);rms=np.sqrt(np.convolve(pcm*pcm,np.ones(window)/window,mode='valid')[::round(RATE*.025)]);times=(np.arange(len(rms))*.025)+.025
 peak_at=float(times[np.argmax(rms)]);finale_mask=(times>=impact)&(times<impact+.5);pre_mask=(times>=max(start,impact-2))&(times<impact-.15)
 finale_db=db(max(rms[finale_mask])) if finale_mask.any() else -120;before_db=db(max(rms[pre_mask])) if pre_mask.any() else -120
 vacuum_db=db(np.sqrt(np.mean(pcm[a:b]**2)));v_before=db(np.sqrt(np.mean(pcm[max(0,a-round(RATE*.15)):a]**2)))
 result={'id':score['id'],'duration':duration,'timeAxis':'reference wall-time mapping of extracted world controls; not a recording of browser output','impactSeconds':impact,'metrics':m,'limiter':limiter,'peakEnvelopeAt':peak_at,'finalePeakWindowDbFS':finale_db,'preFinalePeakWindowDbFS':before_db,'finaleContrastDb':finale_db-before_db,'vacuumContrastDb':v_before-vacuum_db,'earVerified':False,'thresholds':{'masterTruePeakDbTP4xMax':-1,'vacuumContrastDbMin':12,'finaleContrastDbMin':3},'passed':m['truePeakDbTP4x']<=-1 and v_before-vacuum_db>=12 and finale_db-before_db>=3}
 (report/(score['id']+'.json')).write_text(json.dumps(result,indent=2)+'\n');allresults.append(result)
 fig,ax=plt.subplots(figsize=(10,3),dpi=110);ax.plot(times,20*np.log10(np.maximum(1e-6,rms)),label='50ms RMS, 25ms hop');ax.axvline(impact,color='red',label='existing VFX impact');ax.axvspan(impact-.09,impact,alpha=.25,color='black',label='vacuum');ax.set(ylim=(-85,-8),xlabel='seconds (charge + channel + active)',ylabel='dBFS',title=score['id']+' · full timeline · chưa kiểm chứng bằng tai');ax.legend(fontsize=7);fig.tight_layout();fig.savefig(report/(score['id']+'-intensity.png'));plt.close(fig)
 print(score['id'],'PASS' if result['passed'] else 'FAIL',round(result['finaleContrastDb'],2),round(result['vacuumContrastDb'],2),round(m['truePeakDbTP4x'],2),flush=True)
Path('audio/reports/skill-mixes.json').write_text(json.dumps(allresults,indent=2)+'\n')
