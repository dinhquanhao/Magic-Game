import assert from 'node:assert/strict';
import {planAutonomy} from '../scripts/plan_autonomy.mjs';
const ready={enabled:true,authenticationVerified:true,usageAndCostsApproved:true,permissionsReviewed:true,protectedEnvironmentConfigured:true};
const queue={tasks:[
 {id:'first',stage:1,priority:1,status:'queued'},
 {id:'second',stage:1,priority:2,status:'queued'},
 {id:'later',stage:2,priority:0,status:'blocked'},
]};
assert.equal(planAutonomy(queue,{...ready,usageAndCostsApproved:false}).activated,false,'Unapproved costs must block activation');
assert.equal(planAutonomy(queue,{...ready,authenticationVerified:false}).activated,false,'Missing authentication must block activation');
assert.equal(planAutonomy(queue,ready).activated,true);
const open=[{body:'Existing work\n<!-- magic-task:first -->'}];
assert.equal(planAutonomy(queue,ready,open).task.id,'second','Do not claim a task in an open PR');
open.push({body:'<!-- magic-task:second -->'});
assert.equal(planAutonomy(queue,ready,open).task,null,'Do not skip a blocked stage when queued tasks are claimed');
