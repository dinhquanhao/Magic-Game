import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildSkillScore,ScoreScheduler} from '../src/audio/score.js';
import {getCue} from '../src/audio/cues/registry.js';

const {skills}=JSON.parse(readFileSync(new URL('../audio/source-audit.json',import.meta.url)));
const scores=skills.map(s=>buildSkillScore(s,s.plan));
assert.equal(scores.length,21);
assert.equal(new Set(scores.map(s=>s.element)).size,15);
for(const score of scores){
 assert.ok(Number.isFinite(score.fadeAt)&&score.fadeAt<=score.end,score.id);
 assert.equal(new Set(score.events.map(e=>e.key)).size,score.events.length,score.id);
 assert.equal(score.events.find(e=>e.key==='finale').at,score.impact);
 for(const e of score.events){assert.ok(e.at>=0&&e.at<score.end,score.id);assert.ok(getCue(score.element,e.role),e.role);}
 const scheduler=new ScoreScheduler(),frame={id:score.id,score,phase:'active',time:0};
 const emitted=[];
 for(let t=0;t<score.end;t+=.02){
  const now={...frame,time:t};emitted.push(...scheduler.update(now).events.map(e=>e.key));
  assert.equal(scheduler.update(now).events.length,0,'same frame replayed cue');
 }
 assert.deepEqual(new Set(emitted),new Set(score.events.map(e=>e.key)),score.id+' missed cue');
 assert.equal(emitted.length,new Set(emitted).size,score.id+' duplicate cue');
 const late=new ScoreScheduler();
 assert.equal(late.update({...frame,id:'late',time:score.impact+1},1,true).events.length,0);
 assert.ok(!late.update({...frame,id:'late',time:score.impact+1.02}).events.some(e=>e.role==='impact'),'late unlock replayed finale');
 // A lookahead event cancelled by a rate change can be rescheduled once the
 // slower clock actually reaches its horizon; the old reservation is removed.
 const ahead=score.events.find(e=>e.at>.1),clock=new ScoreScheduler();
 clock.update({...frame,time:ahead.at-.02});clock.seen.delete(ahead.key);
 assert.ok(!clock.update({...frame,time:ahead.at-.02},.2).events.some(e=>e.key===ahead.key));
 assert.equal(clock.update({...frame,time:ahead.at},.2).events.filter(e=>e.key===ahead.key).length,1);
}
