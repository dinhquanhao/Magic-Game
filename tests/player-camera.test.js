import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createPlayerCamera, PLAYER_VIEWS } from '../src/player-camera.js';
import { createPlayableSystems } from '../src/playable.js';

test('all views stay finite, clear first-person occlusion, and preserve the casting anchor', () => {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(58, 1.5, .1, 180);
  const player = createPlayableSystems(scene, null), skill = { spread: 20, elementIndex: 0, slot: 0 };
  player.motion.position.set(4, 0, 12); player.beginCast();
  for (const mode of PLAYER_VIEWS) {
    player.view.setMode(mode, player.motion.position); player.onMouseMove(1000, 150);
    player.onKeyDown({ code: 'KeyW' }); player.onKeyDown({ code: 'Space' });
    for (let i = 0; i < 25; i++) player.update(.05, .05, camera, skill, 0xff8800, 'active', 0);
    assert.deepEqual(player.motion.position.toArray(), [4, 0, 12]);
    assert.equal(player.mage.rotation.y, 0);
    assert.ok([...camera.position, ...camera.quaternion].every(Number.isFinite));
    assert.equal(player.character.root.parent.visible, mode !== 'first-person');
    if (mode === 'first-person') assert.ok(Math.abs(camera.position.y - 1.77) < 1e-8);
  }
});

test('orbit makes a full revolution without movement steering or actor yaw controlling it', () => {
  const player = createPlayableSystems(new THREE.Scene(), null), camera = new THREE.PerspectiveCamera();
  const skill = { spread: 20, elementIndex: 0, slot: 0 };
  player.view.setMode('orbit', player.motion.position); player.onMouseMove(-Math.PI * 2 / .0022, 0);
  assert.ok(Math.abs(player.view.state.yaw) < 1e-8);
  player.onMouseMove(-Math.PI / 2 / .0022, 0); const yaw = player.view.state.yaw;
  player.onKeyDown({ code: 'KeyW' }); const origin = player.motion.position.clone();
  for (let i = 0; i < 20; i++) player.update(.05, .05, camera, skill, 0xffffff, 'idle', 0);
  assert.equal(player.view.state.yaw, yaw);
  const direction = player.motion.position.clone().sub(origin).normalize();
  assert.ok(direction.dot(player.view.forward) > .999);
  const facing = new THREE.Vector3(0, 0, -1).applyQuaternion(player.mage.quaternion);
  assert.ok(facing.dot(direction) > .99);
});

test('LoL pan is independent, bounded, supports edges/follow/recenter and UI clears edge input', () => {
  const view = createPlayerCamera(), camera = new THREE.PerspectiveCamera(), position = new THREE.Vector3(5, 0, 9);
  view.setMode('moba', position); view.update(.05, camera, position);
  const initial = view.focus.clone(); position.x += 10; view.update(.05, camera, position);
  assert.deepEqual(view.focus.toArray(), initial.toArray());
  view.pan(100, 80); view.update(.05, camera, position); assert.ok(view.focus.distanceTo(initial) > 1);
  view.center(position); assert.deepEqual(view.focus.toArray(), position.toArray());
  view.toggleFollow(position); position.z += 3; view.update(.05, camera, position);
  assert.deepEqual(view.focus.toArray(), position.toArray());
  view.trackPointer(999, 300, 1000, 600, true); view.update(.05, camera, position); assert.equal(view.state.follow, false);
  const panned = view.focus.clone(); view.trackPointer(999, 300, 1000, 600, false); view.update(.05, camera, position);
  assert.deepEqual(view.focus.toArray(), panned.toArray());
  view.pan(1e7, 1e7); view.update(.05, camera, position); assert.ok(Math.abs(view.focus.x) <= 76 && Math.abs(view.focus.z) <= 76);
});

test('third-person collision and extreme zoom/pitch avoid obstacles and floor clipping', () => {
  const view = createPlayerCamera(), camera = new THREE.PerspectiveCamera(), position = new THREE.Vector3();
  const obstacle = new THREE.Mesh(new THREE.BoxGeometry(2, 3, 2)); obstacle.position.set(0, 2, 4); obstacle.updateMatrixWorld(true);
  view.setMode('orbit', position); view.update(.05, camera, position, [obstacle]);
  assert.ok(camera.position.z < 3); assert.equal(new THREE.Box3().setFromObject(obstacle).containsPoint(camera.position), false);
  for (const mode of PLAYER_VIEWS) {
    view.setMode(mode, position); for (let i = 0; i < 100; i++) view.zoom(-1);
    view.rotate(0, -1e6); view.update(.05, camera, position);
    assert.ok(camera.position.y >= .35 && Number.isFinite(camera.position.y));
    if (mode === 'first-person') assert.equal(view.state.distance, 0);
    else assert.ok(view.state.distance >= (mode === 'moba' ? 22 : 4.4));
  }
});

test('gamepad right stick looks right in orbit and first person without rotating a casting actor', () => {
  const original = Object.getOwnPropertyDescriptor(navigator, 'getGamepads');
  Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [{ axes: [0, 0, 1, 0], buttons: [] }] });
  try {
    for (const mode of ['orbit', 'first-person']) {
      const player = createPlayableSystems(new THREE.Scene(), null), camera = new THREE.PerspectiveCamera();
      player.view.setMode(mode, player.motion.position); player.beginCast();
      player.update(.05, .05, camera, { spread: 20, elementIndex: 0, slot: 0 }, 0xffffff, 'charging', 0);
      assert.ok(player.view.forward.x > 0, mode + ' right stick should look right');
      assert.equal(player.mage.rotation.y, 0); assert.deepEqual(player.motion.position.toArray(), [0, 0, 12]);
    }
  } finally {
    if (original) Object.defineProperty(navigator, 'getGamepads', original);
    else delete navigator.getGamepads;
  }
});
