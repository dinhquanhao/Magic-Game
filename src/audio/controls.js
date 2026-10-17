export function mountAudioControls(sound) {
 const box=document.querySelector('.audio-options');
 const group=document.createElement('div');group.className='audio-extra';
 group.innerHTML=`
 <div class="control"><label for="audioSfx">HIỆU ỨNG <output id="audioSfxOut"></output></label><input id="audioSfx" type="range" min="-60" max="0" step="1"></div>
 <div class="control"><label for="audioAmbience">MÔI TRƯỜNG <output id="audioAmbienceOut"></output></label><input id="audioAmbience" type="range" min="-60" max="0" step="1"></div>
 <div class="control"><label for="audioDrone">NHẠC NỀN / DRONE <output id="audioDroneOut"></output></label><input id="audioDrone" type="range" min="-60" max="0" step="1"></div>
 <div class="control"><label for="audioImpact">VA CHẠM / BASS <output id="audioImpactOut"></output></label><input id="audioImpact" type="range" min="0" max="1.5" step="0.05"></div>
 <label class="toggle"><span>ÂM THANH KHÔNG GIAN</span><input id="audioSpatial" type="checkbox"></label>
 <label class="toggle"><span>DOPPLER</span><input id="audioDoppler" type="checkbox"></label>
 <label class="toggle"><span>GIẢM CƯỜNG ĐỘ</span><input id="audioReduced" type="checkbox"></label>
 <label class="toggle"><span>ÂM GIAO DIỆN</span><input id="audioUi" type="checkbox"></label>
 <label class="toggle"><span>TẮT TIẾNG</span><input id="audioMute" type="checkbox"></label>
 <div class="control"><label for="audioRoom">KHÔNG GIAN VANG</label><select id="audioRoom"><option value="arena">ĐẤU TRƯỜNG</option><option value="cave">HANG</option><option value="void">TRỐNG KHÔNG</option><option value="underwater">DƯỚI NƯỚC</option><option value="cathedral">ĐẠI SẢNH</option></select></div>
 <button id="audioTest" type="button">NGHE THỬ</button><a class="audio-lab-link" href="?audiolab=1">MỞ AUDIO LAB</a>
 <p id="audioIntensityHint" hidden>Cường độ va chạm cao; có thể bật Giảm cường độ.</p>`;
 box.insertBefore(group,document.querySelector('#audioStatus'));
 const bindings={audioVolume:'masterDb',audioSfx:'sfxDb',audioAmbience:'ambienceDb',audioDrone:'droneDb',audioImpact:'impact',audioSpatial:'spatial',audioDoppler:'doppler',audioReduced:'reduced',audioUi:'ui',audioMute:'mute',audioRoom:'room'};
 const master=document.querySelector('#audioVolume');master.min='-60';master.max='0';master.step='1';
 function render(){const s=sound.diagnostics().settings;for(const [id,key]of Object.entries(bindings)){const el=document.getElementById(id);if(el.type==='checkbox')el.checked=s[key];else el.value=s[key];const out=document.getElementById(id+'Out');if(out)out.textContent=key==='impact'?Math.round(s[key]*100)+'%':s[key]<=-60?'−∞ dB':s[key]+' dB';}document.getElementById('audioIntensityHint').hidden=s.impact<=1.3;}
 const listeners=[];
 for(const [id,key]of Object.entries(bindings)){const el=document.getElementById(id),event=el.type==='checkbox'||el.tagName==='SELECT'?'change':'input';const listener=()=>{sound.configure({[key]:el.type==='checkbox'?el.checked:el.tagName==='SELECT'?el.value:Number(el.value)});render();};el.addEventListener(event,listener);listeners.push(()=>el.removeEventListener(event,listener));}
 const test=async()=>{if(!sound.enabled)await sound.enable();await sound.ready();sound.testSound();};document.getElementById('audioTest').addEventListener('click',test);render();
 return {dispose(){listeners.forEach(remove=>remove());document.getElementById('audioTest').removeEventListener('click',test);}};
}
