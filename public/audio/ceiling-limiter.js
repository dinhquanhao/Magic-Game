// Shared DSP implementation: used by the AudioWorklet and offline safety tests.
export class CeilingLimiter {
  constructor(sampleRate, channels=2, ceilingDb=-1.8, lookahead=128) {
    this.ceiling=10**(ceilingDb/20);this.operatingCeiling=this.ceiling*10**(-.6/20);this.size=lookahead+1;this.lookahead=lookahead;
    this.delay=Array.from({length:channels},()=>new Float32Array(this.size));
    this.peak=new Float32Array(this.size+2);this.index=new Float64Array(this.size+2);
    this.head=0;this.tail=0;this.frame=0;this.gain=1;this.reduction=0;
    this.release=1-Math.exp(-1/(sampleRate*.12));
    // Four-phase, 16-tap windowed-sinc reconstruction detects intersample peaks.
    // Lookahead supplies the future taps before the delayed sample is emitted.
    this.kernels=Array.from({length:3},(_,phase)=>{
      const fraction=(phase+1)/4,kernel=new Float64Array(16);let sum=0;
      for(let j=0;j<16;j++){const d=fraction-(j-7),sinc=Math.abs(d)<1e-9?1:Math.sin(Math.PI*d)/(Math.PI*d);kernel[j]=sinc*(.5+.5*Math.cos(Math.PI*d/8.5));sum+=kernel[j];}
      for(let j=0;j<16;j++)kernel[j]/=sum;return kernel;
    });
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
      for(let c=0;c<outputs.length;c++)for(const kernel of this.kernels){
        let reconstructed=0;
        for(let j=0;j<16;j++){const frame=this.frame-15+j;const value=frame<0?0:this.delay[c][(frame%this.size+this.size)%this.size];reconstructed+=value*kernel[j];}
        peak=Math.max(peak,Math.abs(reconstructed));
      }
      while(this.head!==this.tail && this.index[this.head]<this.frame-this.lookahead)this.head=(this.head+1)%capacity;
      while(this.head!==this.tail) {
        const previous=(this.tail-1+capacity)%capacity;
        if(this.peak[previous]>peak)break;
        this.tail=previous;
      }
      this.peak[this.tail]=peak;this.index[this.tail]=this.frame;this.tail=(this.tail+1)%capacity;
      const target=Math.min(1,this.operatingCeiling/Math.max(1e-12,this.peak[this.head]));
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
