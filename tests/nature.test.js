import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {natureTemplate,NATURE_VARIANTS} from '../src/nature-geometry.js';
import {createNatureAttack,NATURE_BUDGETS} from '../src/nature-growth.js';
import {disposeObjectTree} from '../src/graphics/core/dispose-tree.js';

function fixture(quality='Low',extra={}){
 const parent=new THREE.Group(),targets=[{position:new THREE.Vector3(4,0,1)},{position:new THREE.Vector3(-7,0,-3)}],hit=[];
 let restores=0;
 const skill={aoe:320,spread:20,nature:{treeCounts:{Low:36,Medium:60,High:96,Ultra:144},attackRange:14,growthSpeed:1}};
 const attack=createNatureAttack(parent,20,0x72a45a,skill,{quality,aoeRadius:320},
 {plan:{impactAt:7.2,preSlowDuration:.22},targets:()=>targets,onHit:(target,kind)=>hit.push({target,kind}),clearTargets:()=>restores++,...extra});
 return {parent,attack,targets,hit,restores:()=>restores};
}

test('six forest templates have finite, bounded, valid indices at every detail level',()=>{
 assert.equal(NATURE_VARIANTS.length,6);
 const signatures=new Set();
 for(const quality of ['Low','Medium','High','Ultra'])for(let type=0;type<6;type++){
  const template=natureTemplate(type,quality);
  assert.equal(natureTemplate(type,quality),template,'CPU templates are reused');
  assert.ok(template.position.length>90);
  assert.ok(template.position.every(Number.isFinite)&&template.normal.every(Number.isFinite));
  assert.ok(template.position.every(x=>Math.abs(x)<3));
  assert.ok(template.index.every(i=>i<template.position.length/3));
  if(quality==='High')signatures.add(Buffer.from(template.position.buffer).toString('base64'));
 }
 assert.equal(signatures.size,6);
});

test('nearest targets are throttled; all four real hits occur and retarget after movement',()=>{
 const f=fixture();for(let t=0;t<13.4;t+=.04)f.attack.update(t);
 assert.ok(f.attack.diagnostics().retargets<40);
 assert.deepEqual(new Set(f.hit.map(h=>h.kind)),new Set(['root','spike','branch','fruit']));
 const tree=f.attack.group.children[0],origins=tree.geometry.getAttribute('iOrigin'),data=tree.geometry.getAttribute('iData');
 for(let i=0;i<origins.count;i++){
  const distances=f.targets.map(t=>Math.hypot(t.position.x-origins.getX(i),t.position.z-origins.getY(i)));
  const nearest=distances.indexOf(Math.min(...distances));assert.equal(data.getZ(i),distances[nearest]<14?nearest:-1);
 }
 f.targets.forEach(t=>t.position.set(200,0,200));f.attack.update(13.9);assert.ok(f.attack.diagnostics().targetSample.every(i=>i===-1));
 f.attack.update(18);assert.equal(f.restores(),1);disposeObjectTree(f.parent);assert.equal(f.restores(),1);
});

test('every quality has bounded GPU batches, no per-tree Mesh, and disposable instance buffers',()=>{
 for(const quality of Object.keys(NATURE_BUDGETS)){
  const f=fixture(quality),geometries=new Set(),materials=new Set();let instances=0,released=0;
  f.parent.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);if(o.isInstancedMesh){instances++;o.addEventListener('dispose',()=>released++);}});
  assert.ok(instances>=11&&instances<=12);assert.ok(geometries.size<=14);assert.ok(materials.size<=9);
  assert.equal(f.attack.diagnostics().trees,NATURE_BUDGETS[quality].trees);
  assert.equal(f.attack.group.children.filter(o=>o.isMesh&&!o.isInstancedMesh).length,1,'only the single ground circle is a regular Mesh');
  disposeObjectTree(f.parent);assert.equal(released,instances);assert.equal(f.restores(),1);
 }
});

test('invalid time cleans target effects; pending shader warm-up cancels safely on rapid replacement',async()=>{
 let warmed=0;const f=fixture('High',{warmup:()=>warmed++});
 assert.throws(()=>f.attack.update(NaN),/not finite/);assert.equal(f.restores(),1);
 disposeObjectTree(f.parent);await new Promise(resolve=>setTimeout(resolve,20));assert.equal(warmed,0);
 const g=fixture('High',{warmup:()=>warmed++});await new Promise(resolve=>setTimeout(resolve,20));assert.equal(warmed,1);assert.equal(g.attack.diagnostics().warmup,'ready');disposeObjectTree(g.parent);
});
