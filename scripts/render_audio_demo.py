"""Export a listenable reference sequence; not a claim of artistic mix quality."""
from pathlib import Path
import json
import wave
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
manifest=json.loads((ROOT/'public/assets/audio/manifest.json').read_text())
rate=manifest['sampleRate']; segment=5
mix=np.zeros(rate*segment*15,dtype=np.float64)
chapters=[]
levels={'precast':.3,'charging':.16,'casting':.45,'traveling':.18,'impact':.65,'shockwave':.4,'aftermath':.25}
starts={'precast':.0,'charging':.15,'casting':1.2,'traveling':1.25,'impact':2.15,'shockwave':2.29,'aftermath':2.6}
for i,(element,entry) in enumerate(manifest['elements'].items()):
 chapters.append({'element':element,'startSeconds':i*segment,'impactSeconds':i*segment+2.15})
 for cue,asset in entry['cues'].items():
  with wave.open(str(ROOT/'public'/asset['url'].lstrip('/')),'rb') as reader:
   data=np.frombuffer(reader.readframes(reader.getnframes()),dtype='<i2').astype(float)/32768
  start=round((i*segment+starts[cue])*rate)
  mix[start:start+len(data)]+=data*levels[cue]
mix*=.85/max(1e-9,np.max(np.abs(mix)))
out=ROOT/'work/audio-round/demos';out.mkdir(parents=True,exist_ok=True)
with wave.open(str(out/'fifteen-elements.wav'),'wb') as writer:
 writer.setnchannels(1);writer.setsampwidth(2);writer.setframerate(rate);writer.writeframes(np.round(mix*32767).astype('<i2').tobytes())
(out/'chapters.json').write_text(json.dumps({'duration':len(mix)/rate,'note':'Reference cue sequence with demo gains; browser recording is separate and includes spatial/master gain.','chapters':chapters},indent=2)+'\n')
print(json.dumps({'duration':len(mix)/rate,'peak':float(np.max(np.abs(mix))),'rms':float(np.sqrt(np.mean(mix*mix)))}))
