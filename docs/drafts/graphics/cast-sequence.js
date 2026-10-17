export const DEFAULT_RUNE_FADE_SECONDS = 1.8;
const clamp = x => Math.max(0, Math.min(1, x));
const smooth = x => { x=clamp(x); return x*x*(3-2*x); };

// Stateless sampling from simulation time: pause, seek, hit-stop and replay
// cannot accumulate a second clock or delay the internal skill timeline.
export function sampleCastSequence({committed=false, skillTime=0, progress=0, fadeSeconds=DEFAULT_RUNE_FADE_SECONDS, reducedMotion=false}={}) {
 if(![skillTime,progress,fadeSeconds].every(Number.isFinite))throw new Error('Cast sequence received non-finite time/progress');
 const duration=Math.max(1.2,Math.min(2.5,fadeSeconds));
 if(!committed)return {phase:'CHANNELING',skillEnabled:false,progress:clamp(progress),fade:0,emissive:1,energy:(.12+.88*smooth(progress)),pulse:0,disposed:false};
 const time=Math.max(0,skillTime),fraction=clamp(time/duration),fade=smooth(fraction);
 return {phase:time===0?'COMMIT':time<duration?'RELEASE':'ACTIVE',skillEnabled:true,progress:1,fade,emissive:1-.78*smooth(fraction/.58),energy:(1-fade)*(1-fade),pulse:Math.exp(-time*9)*(reducedMotion?.14:.35),disposed:time>=duration};
}
