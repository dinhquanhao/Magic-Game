import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {CUE_REGISTRY,ELEMENT_ORDER} from '../src/audio/cues/registry.js';
import {renderCue} from '../src/audio/synthesis.js';
import {buildSkillScore} from '../src/audio/score.js';
const arg=key=>process.argv.includes(key)?process.argv[process.argv.indexOf(key)+1]:null;
const element=arg('--element'),only=arg('--only')?.split(',');
const corrections=fs.existsSync('audio/reports/corrections.json')?JSON.parse(fs.readFileSync('audio/reports/corrections.json','utf8')):{};
export function writeWav(file,data,rate=24000){fs.mkdirSync(path.dirname(file),{recursive:true});const b=Buffer.alloc(44+data.length*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(data.length*2,40);for(let i=0;i<data.length;i++)b.writeInt16LE(Math.round(Math.max(-1,Math.min(1,data[i]))*32767),44+i*2);fs.writeFileSync(file,b);}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const cues=CUE_REGISTRY.filter(c=>(!element||c.element===element)&&(!only||only.includes(c.id)));
 for(const cue of cues){for(let v=0;v<(cue.repeated?4:1);v++){const data=renderCue(cue,{variant:v,...corrections[cue.id]});writeWav(`audio/rendered/${cue.id}-${v}.wav`,data);}}
 fs.mkdirSync('audio/reports',{recursive:true});fs.writeFileSync('audio/cue-registry.json',JSON.stringify(CUE_REGISTRY,null,2)+'\n');
 const audit=JSON.parse(fs.readFileSync('audio/source-audit.json','utf8'));
 fs.writeFileSync('audio/scores.json',JSON.stringify(audit.skills.map(s=>buildSkillScore(s,s.plan)),null,2)+'\n');
 console.log(JSON.stringify({element:element||'ALL',logicalCues:cues.length,order:ELEMENT_ORDER}));
}
