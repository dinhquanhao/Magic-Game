// Offline planner. Never invokes Codex, GitHub, a scheduler or paid API.
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve, dirname} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read=p=>readFileSync(resolve(root,p),'utf8');
export function planAutonomy(queue, ready, open=[]) {
 const claimed=new Set();
 for(const pr of open) for(const match of (pr.body||'').matchAll(/<!-- magic-task:([a-z0-9-]+) -->/g)) claimed.add(match[1]);
 const task=queue.tasks.filter(t=>t.status==='queued'&&!claimed.has(t.id)).sort((a,b)=>a.stage-b.stage||a.priority-b.priority)[0]||null;
 const activated=['enabled','authenticationVerified','usageAndCostsApproved','permissionsReviewed','protectedEnvironmentConfigured'].every(k=>ready[k]===true);
 return {mode:'offline-plan',activated,task,claimed:[...claimed],blockers:Object.entries(ready).filter(([k,v])=>typeof v==='boolean'&&!v).map(([k])=>k)};
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
const queue=JSON.parse(read('automation/tasks.json'));
const ready=JSON.parse(read('automation/readiness.json'));
for(const path of ['AGENTS.md','ROADMAP.md','PROGRESS.md','UPGRADE_PROGRESS.md']) {
  if(!read(path).trim()) throw new Error(`Empty required progress document: ${path}`);
}
let open=[];
const index=process.argv.indexOf('--open-prs');
if(index!==-1) open=JSON.parse(readFileSync(process.argv[index+1],'utf8'));
const result=planAutonomy(queue,ready,open);
if(process.argv.includes('--require-ready')&&!result.activated){process.stderr.write('Automation is disabled; verify authentication, permissions, protection, usage and approved costs first.\n');process.exitCode=2;}
process.stdout.write(JSON.stringify(result,null,2)+'\n');
}
