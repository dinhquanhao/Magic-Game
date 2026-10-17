import {CUE_REGISTRY,ELEMENT_AUDIO} from './cues/registry.js';
export function mountAudioLab(sound,{skills,onPlaySkill}) {
 if(new URLSearchParams(location.search).get('audiolab')!=='1')return {update(){},dispose(){}};
 const root=document.createElement('section');root.className='audio-lab';root.setAttribute('aria-label','Audio Lab');
 root.innerHTML=`<header><h1>AUDIO LAB</h1><a href="?">VỀ GAME</a></header><p>Procedural · chung AudioContext/mixer với game · <strong>chưa kiểm chứng bằng tai</strong></p>
 <div class="lab-toolbar"><label>HỆ <select data-lab-element></select></label><label>KỸ NĂNG <select data-lab-skill></select></label><button data-lab-play>CHẠY TIMELINE THẬT</button><button data-lab-stop>DỪNG ÂM</button></div>
 <output data-lab-meter role="status"></output><canvas data-lab-wave width="840" height="120" aria-label="Waveform đầu ra"></canvas><canvas data-lab-spectrum width="840" height="170" aria-label="Spectrogram đầu ra"></canvas>
 <p>Meter ~LUFS dùng trọng số phổ và cửa sổ 3 giây, không phải EBU R128 được chứng nhận. Đồ thị dưới đây được đo offline; A/B chỉ có cho cue v1 tương ứng.</p>
 <div data-lab-cues></div><div class="lab-images"><img data-lab-static-wave alt="Waveform cue offline"><img data-lab-static-spectrum alt="Spectrogram cue offline"></div><p data-lab-description></p>`;
 document.body.append(root);
 const elementSelect=root.querySelector('[data-lab-element]'),skillSelect=root.querySelector('[data-lab-skill]'),list=root.querySelector('[data-lab-cues]');
 for(const element of Object.keys(ELEMENT_AUDIO)){const option=document.createElement('option');option.value=element;option.textContent=element+' · '+ELEMENT_AUDIO[element].keywords;elementSelect.append(option);}
 const listeners=[],listen=(el,event,fn)=>{el.addEventListener(event,fn);listeners.push(()=>el.removeEventListener(event,fn));};
 function selectCue(cue){root.querySelector('[data-lab-static-wave]').src=`/audio/reports/cues/${cue.id}-waveform.png`;root.querySelector('[data-lab-static-spectrum]').src=`/audio/reports/cues/${cue.id}-spectrogram.png`;root.querySelector('[data-lab-description]').textContent=`${cue.id} · seed ${cue.seed} · ${cue.duration}s · RMS mục tiêu ${cue.targetRmsDb} dBFS · ${cue.variants} biến thể công thức · chưa kiểm chứng bằng tai`;}
 function render(){const element=elementSelect.value;list.replaceChildren();skillSelect.replaceChildren();
  for(const skill of skills.filter(s=>s.id.startsWith(element+'-'))){const option=document.createElement('option');option.value=skill.id;option.textContent=skill.id+' · '+skill.vi;skillSelect.append(option);}
  for(const cue of CUE_REGISTRY.filter(c=>c.element===element)){
   const row=document.createElement('div');row.className='lab-cue';const label=document.createElement('span');label.textContent=cue.id;const play=document.createElement('button');play.textContent='NGHE MỚI';play.dataset.cue=cue.id;
   play.addEventListener('click',async()=>{selectCue(cue);await sound.audition(cue.id);});row.append(label,play);
   if(['precast','charging','casting','traveling','impact','shockwave','aftermath'].includes(cue.role)){const old=document.createElement('button');old.textContent='A: CŨ';old.dataset.legacy=cue.id;old.addEventListener('click',async()=>{selectCue(cue);await sound.audition(cue.id,{legacy:true});});row.append(old);}
   const wav=document.createElement('a');wav.href=`/audio/rendered/${cue.id}-0.wav`;wav.textContent='WAV';wav.download='';row.append(wav);list.append(row);
  }
  selectCue(CUE_REGISTRY.find(c=>c.element===element));
 }
 listen(elementSelect,'change',render);listen(root.querySelector('[data-lab-play]'),'click',async()=>{if(!sound.enabled)await sound.enable();onPlaySkill(skillSelect.value);await sound.ready();});
 listen(root.querySelector('[data-lab-stop]'),'click',()=>sound.stopCast());render();
 const wave=root.querySelector('[data-lab-wave]'),spec=root.querySelector('[data-lab-spectrum]'),wc=wave.getContext('2d'),sc=spec.getContext('2d');
 const samples=new Float32Array(2048),frequencies=new Float32Array(1024),energies=new Float64Array(90);let index=0,count=0,sum=0,last=0;
 const update=(now=performance.now())=>{if(now-last<33)return;last=now;sound.readAnalysis(samples,frequencies);const d=sound.diagnostics();
  wc.fillStyle='#081521';wc.fillRect(0,0,wave.width,wave.height);wc.strokeStyle='#7cddd0';wc.beginPath();for(let x=0;x<wave.width;x++){const y=wave.height/2-samples[Math.floor(x/wave.width*samples.length)]*wave.height*.46;if(x)wc.lineTo(x,y);else wc.moveTo(x,y);}wc.stroke();
  sc.drawImage(spec,-2,0);let total=0,weighted=0;
  for(let y=0;y<spec.height;y++){const frequency=20*10**((1-y/spec.height)*Math.log10(12000/20)),bin=Math.min(1023,Math.round(frequency/(d.sampleRate||48000)*2048)),value=Math.max(0,Math.min(1,(frequencies[bin]+85)/75));sc.fillStyle=`hsl(${260-value*230} 85% ${value*60}%)`;sc.fillRect(spec.width-2,y,2,1);}
  for(let i=1;i<frequencies.length;i++){const f=i*(d.sampleRate||48000)/2048,power=10**(frequencies[i]/10);total+=power;weighted+=power*(f<70?(f/70)**2:f>2000?1.4:1);}
  const energy=d.rms*d.rms*(total?weighted/total:1);sum-=energies[index];energies[index]=energy;sum+=energy;index=(index+1)%energies.length;count=Math.min(count+1,energies.length);
  const lufs=10*Math.log10(Math.max(1e-12,sum/Math.max(1,count)))-.691;
  root.querySelector('[data-lab-meter]').textContent=`${d.state} · peak ${(20*Math.log10(Math.max(1e-9,d.peak))).toFixed(1)} dBFS · RMS ${(20*Math.log10(Math.max(1e-9,d.rms))).toFixed(1)} dBFS · ~${lufs.toFixed(1)} LUFS · voice ${d.activeVoices}/${d.voiceLimit} (+${d.retiringVoices} fade) · limiter GR ${d.limiterReductionDb?.toFixed(1)||0} dB · ${d.limiter||'chưa bật'}`;
 };
 return {update,dispose(){listeners.forEach(f=>f());root.remove();}};
}
