// Publish measurements without re-rendering cues or extending repair histories.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {CUE_REGISTRY} from '../src/audio/cues/registry.js';
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const digest=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const cues={};
for(const element of new Set(CUE_REGISTRY.map(c=>c.element))){
 const report=read(`audio/reports/${element.toLowerCase()}.json`);
 for(const c of report.cues)cues[c.id]={status:c.status,failures:c.failures,iterations:c.iterations,earVerified:false,
  rmsDbFS:c.metrics[0].rmsDbFS,truePeakDbTP4x:c.metrics[0].truePeakDbTP4x};
}
if(Object.keys(cues).length!==CUE_REGISTRY.length)throw new Error('Incomplete cue reports');
const mirrors=[];
for(const [source,target] of [['audio/rendered','public/audio/rendered'],['audio/reports/cues','public/audio/reports/cues']]){
 fs.mkdirSync(target,{recursive:true});
 for(const file of fs.readdirSync(source,{recursive:true}).sort()){
  const src=path.join(source,file),dst=path.join(target,file);if(!fs.statSync(src).isFile())continue;
  fs.mkdirSync(path.dirname(dst),{recursive:true});if(!fs.existsSync(dst)||digest(src)!==digest(dst))fs.copyFileSync(src,dst);
  if(digest(src)!==digest(dst))throw new Error('Mirror hash mismatch '+file);
  mirrors.push({url:'/audio/'+path.relative('public/audio',dst).split(path.sep).join('/'),sha256:digest(src),bytes:fs.statSync(src).size});
 }
}
const skills=read('audio/reports/skill-mixes.json').map(s=>({id:s.id,passed:s.passed,earVerified:false,timeAxis:s.timeAxis,
 truePeakDbTP4x:s.metrics.truePeakDbTP4x,finaleContrastDb:s.finaleContrastDb,vacuumContrastDb:s.vacuumContrastDb}));
const summary={version:1,earVerified:false,cues,skills,totals:{cues:Object.keys(cues).length,passed:Object.values(cues).filter(c=>c.status==='PASS').length,
 failed:Object.values(cues).filter(c=>c.status!=='PASS').length,skills:skills.length,skillsPassed:skills.filter(s=>s.passed).length},artifacts:mirrors};
fs.writeFileSync('audio/reports/summary.json',JSON.stringify(summary,null,2)+'\n');
fs.writeFileSync('public/audio/qa-summary.json',JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({...summary.totals,mirroredArtifacts:mirrors.length,earVerified:false}));
