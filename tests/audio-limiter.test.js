import assert from 'node:assert/strict';
import {CeilingLimiter} from '../public/audio/ceiling-limiter.js';
const limiter=new CeilingLimiter(48000),ceiling=10**(-1.8/20);
let maximum=0,reduction=0;
for(let block=0;block<500;block++) {
 const left=new Float32Array(128),right=new Float32Array(128);
 for(let i=0;i<128;i++){left[i]=8*Math.sin((block*128+i)*.117);right[i]=(block%7===0?11:.01)*Math.sin((block*128+i)*.09);}
 if(block===13)left[31]=NaN;
 const output=[new Float32Array(128),new Float32Array(128)];
 const stats=limiter.process([left,right],output);reduction=Math.max(reduction,stats.reduction);
 for(const channel of output)for(const sample of channel){assert.ok(Number.isFinite(sample));maximum=Math.max(maximum,Math.abs(sample));}
}
assert.ok(maximum<=ceiling+1e-7,`Ceiling exceeded ${maximum}`);
assert.ok(reduction>15,'Hot inputs must produce measurable gain reduction');
