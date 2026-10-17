// Shared DSP implementation: used by the AudioWorklet and offline safety tests.
export class CeilingLimiter {
  constructor(sampleRate, channels=2, ceilingDb=-1.8, lookahead=128) {
    this.ceiling=10**(ceilingDb/20);this.size=lookahead+1;this.lookahead=lookahead;
    this.delay=Array.from({length:channels},()=>new Float32Array(this.size));
    this.peak=new Float32Array(this.size+2);this.index=new Float64Array(this.size+2);
    this.head=0;this.tail=0;this.frame=0;this.gain=1;this.reduction=0;
    this.release=1-Math.exp(-1/(sampleRate*.12));
  }
  process(inputs,outputs) {
    const length=outputs[0].length,capacity=this.peak.length;
    let reduction=0,peakOut=0;
    for(let i=0;i<length;i++,this.frame++) {
      const write=this.frame%this.size;let peak=0;
      for(let c=0;c<outputs.length;c++) {
        const x=Number.isFinite(inputs[c]?.[i])?inputs[c][i]:0;
        this.delay[c][write]=x;peak=Math.max(peak,Math.abs(x));
      }
      while(this.head!==this.tail && this.index[this.head]<this.frame-this.lookahead)this.head=(this.head+1)%capacity;
      while(this.head!==this.tail) {
        const previous=(this.tail-1+capacity)%capacity;
        if(this.peak[previous]>peak)break;
        this.tail=previous;
      }
      this.peak[this.tail]=peak;this.index[this.tail]=this.frame;this.tail=(this.tail+1)%capacity;
      const target=Math.min(1,this.ceiling/Math.max(1e-12,this.peak[this.head]));
      this.gain=Math.min(target,this.gain+(1-this.gain)*this.release);
      reduction=Math.max(reduction,-20*Math.log10(Math.max(1e-12,this.gain)));
      const read=(write+1)%this.size;
      for(let c=0;c<outputs.length;c++) {
        const value=Math.max(-this.ceiling,Math.min(this.ceiling,this.delay[c][read]*this.gain));
        outputs[c][i]=value;peakOut=Math.max(peakOut,Math.abs(value));
      }
    }
    this.reduction=reduction;return {reduction,peak:peakOut};
  }
}
if(typeof AudioWorkletProcessor!=='undefined') {
  class CeilingProcessor extends AudioWorkletProcessor {
    constructor(){super();this.dsp=new CeilingLimiter(sampleRate);this.blocks=0;}
    process(inputs,outputs){
      const result=this.dsp.process(inputs[0]||[],outputs[0]);
      if(++this.blocks%32===0)this.port.postMessage({...result,frames:currentFrame,blocks:this.blocks});
      return true;
    }
  }
  registerProcessor('arcane-ceiling',CeilingProcessor);
}
