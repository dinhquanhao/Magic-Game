import fs from 'node:fs';
import {CeilingLimiter} from '../public/audio/ceiling-limiter.js';
import {writeWav} from './render.mjs';
const input=process.argv[2],output=process.argv[3];
const wav=fs.readFileSync(input),rate=wav.readUInt32LE(24),count=(wav.length-44)/2,dsp=new CeilingLimiter(rate),result=new Float32Array(count+256);
let reduction=0;
for(let offset=0;offset<result.length;offset+=128){const source=new Float32Array(128);for(let i=0;i<128&&offset+i<count;i++)source[i]=wav.readInt16LE(44+(offset+i)*2)/32768;
 const block=[new Float32Array(128),new Float32Array(128)];const info=dsp.process([source,source],block);reduction=Math.max(reduction,info.reduction);result.set(block[0].subarray(0,Math.min(128,result.length-offset)),offset);
}
writeWav(output,result.subarray(128,128+count),rate);console.log(JSON.stringify({reductionDb:reduction,lookaheadSamples:128,rate}));
