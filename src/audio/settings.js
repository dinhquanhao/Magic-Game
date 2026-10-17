export const AUDIO_PRESETS={
  Low:{voices:8,banks:2,bytes:12*1024*1024,panner:'equalpower',convolution:false,variants:3,grains:12},
  Medium:{voices:12,banks:3,bytes:20*1024*1024,panner:'equalpower',convolution:false,variants:3,grains:20},
  High:{voices:20,banks:3,bytes:32*1024*1024,panner:'HRTF',convolution:true,variants:4,grains:32},
  Ultra:{voices:28,banks:4,bytes:48*1024*1024,panner:'HRTF',convolution:true,variants:6,grains:48},
};
export const DEFAULT_AUDIO={masterDb:-9,sfxDb:0,ambienceDb:-10,droneDb:-15,impact:1,spatial:true,doppler:false,reduced:false,mute:false,ui:true,room:'arena'};
export const dbGain=db=>db<=-60?0:10**(db/20);
export function sanitizeSettings(values={}) {
 const s={...DEFAULT_AUDIO};
 for(const key of ['masterDb','sfxDb','ambienceDb','droneDb'])if(Number.isFinite(values[key]))s[key]=Math.max(-60,Math.min(0,values[key]));
 if(Number.isFinite(values.impact))s.impact=Math.max(0,Math.min(1.5,values.impact));
 for(const key of ['spatial','doppler','reduced','mute','ui'])if(typeof values[key]==='boolean')s[key]=values[key];
 if(['arena','cave','void','underwater','cathedral'].includes(values.room))s.room=values.room;
 return s;
}
export function loadSettings(){try{return sanitizeSettings(JSON.parse(localStorage.getItem('arcane-audio-v3')||'{}'));}catch{return {...DEFAULT_AUDIO};}}
export function saveSettings(s){try{localStorage.setItem('arcane-audio-v3',JSON.stringify(sanitizeSettings(s)));}catch{/* private-mode storage is optional */}}
