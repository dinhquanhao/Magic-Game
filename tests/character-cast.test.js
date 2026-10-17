import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { castTiming, skillPlaybackRate } from '../src/cast-timing.js';
import { createCharacterModel } from '../src/character-model.js';
import { createPlayableSystems } from '../src/playable.js';

test('ritual total is ten seconds and active playback doubles authored duration', () => {
  const timing = castTiming({ castTime: 10, runeDrawSpeed: 1 });
  assert.equal(timing.charge + timing.channel, 10);
  assert.equal(castTiming({ castTime: 12, runeDrawSpeed: 2 }).ritual, 6);
  assert.ok(Number.isFinite(castTiming({ castTime: NaN, runeDrawSpeed: 0 }).ritual));
  for (const seconds of [9.84, 18, 20.25]) {
    let authoredTime = 0;
    for (let i = 0; i < 200; i++) authoredTime += .05 * skillPlaybackRate('active');
    assert.ok(Math.abs(authoredTime - 5) < 1e-10);
    assert.equal(seconds / skillPlaybackRate('active'), seconds * 2);
  }
});

test('uploaded bot plants its feet and raises both hands above its head', () => {
  const model = createCharacterModel();
  const motion = { velocity: new THREE.Vector3(), grounded: true };
  for (let i = 0; i < 20; i++) model.update(.05, motion, true);
  model.root.updateMatrixWorld(true);
  const top = model.headTop.getWorldPosition(new THREE.Vector3()).y;
  for (const hand of model.hands) assert.ok(hand.getWorldPosition(new THREE.Vector3()).y > top + .05);
  for (const leg of model.legs) assert.ok(Math.abs(new THREE.Box3().setFromObject(leg).min.y) < 1e-7);
  model.reset(); assert.equal(model.arms[0].rotation.x, 0);
  const geometries = new Set(), materials = new Set(); let disposedGeometry = 0, disposedMaterial = 0;
  model.root.traverse(o => { if (o.geometry) geometries.add(o.geometry); if (o.material) materials.add(o.material); });
  geometries.forEach(g => g.addEventListener('dispose', () => disposedGeometry++));
  materials.forEach(m => m.addEventListener('dispose', () => disposedMaterial++));
  model.dispose(); assert.equal(disposedGeometry, geometries.size); assert.equal(disposedMaterial, materials.size);
});

test('held movement, jump, dash, aim and target tracking cannot move a casting player', () => {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(46, 1.5, .1, 180);
  const systems = createPlayableSystems(scene, null);
  const skill = { spread: 20, elementIndex: 0, slot: 0, archetype: 'skyfall' };
  systems.motion.position.set(5, 0, 11); systems.motion.velocity.set(3, 7, -4);
  systems.beginCast(); const anchor = systems.motion.position.clone(); const yaw = systems.mage.rotation.y;
  for (const phase of ['charging', 'channeling', 'active']) {
    systems.onKeyDown({ code: 'KeyW' }); systems.onKeyDown({ code: 'Space' }); systems.onKeyDown({ code: 'KeyQ' });
    systems.onMouseMove(80, 10); systems.toggleLock();
    for (let i = 0; i < 25; i++) systems.update(.05, .05, camera, skill, 0xff8800, phase, 0, true);
    assert.deepEqual(systems.motion.position.toArray(), anchor.toArray());
    assert.equal(systems.motion.velocity.lengthSq(), 0); assert.equal(systems.motion.dash, 0);
    assert.equal(systems.mage.rotation.y, yaw);
  }
  systems.update(.05, .05, camera, skill, 0xff8800, 'idle', 0);
  assert.ok(systems.motion.position.distanceTo(anchor) > 0);
  systems.onKeyDown({ code: 'Space' }); assert.ok(systems.motion.velocity.y > 0);
  systems.reset(); assert.equal(systems.motion.castLocked, false); assert.equal(systems.motion.castPhase, 'idle');
});
