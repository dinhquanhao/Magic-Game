import * as THREE from 'three';

export const PLAYER_VIEWS = ['quarter', 'moba', 'first-person', 'orbit', 'follow'];
const PRESETS = {
  quarter: { yaw: Math.PI / 4, pitch: .68, distance: 12, fov: 52 },
  moba: { yaw: Math.PI / 4, pitch: .96, distance: 40, fov: 46 },
  'first-person': { yaw: 0, pitch: 0, distance: 0, fov: 75 },
  orbit: { yaw: 0, pitch: .28, distance: 8.6, fov: 58 },
  follow: { yaw: 0, pitch: .22, distance: 8.6, fov: 58 }
};

// Camera angles never write actor yaw. The existing game owns the only RAF/renderer.
export function createPlayerCamera() {
  const preferences = Object.fromEntries(PLAYER_VIEWS.map(id => [id, { ...PRESETS[id] }]));
  const state = { mode: 'quarter', ...preferences.quarter, follow: false, needsSnap: true };
  const focus = new THREE.Vector3(), desired = new THREE.Vector3(), target = new THREE.Vector3();
  const direction = new THREE.Vector3(), forward = new THREE.Vector3(), right = new THREE.Vector3();
  const ray = new THREE.Raycaster(), hits = [], pointer = new THREE.Vector2(), edge = new THREE.Vector2();
  let pointerValid = false;
  function basis() { forward.set(-Math.sin(state.yaw), 0, -Math.cos(state.yaw)); right.set(-forward.z, 0, forward.x); }
  function center(position) { focus.copy(position); focus.y = 0; edge.set(0, 0); }
  function setMode(mode, position) {
    if (!PLAYER_VIEWS.includes(mode)) return false;
    Object.assign(preferences[state.mode], { yaw: state.yaw, pitch: state.pitch, distance: state.distance, fov: state.fov });
    Object.assign(state, preferences[mode], { mode, needsSnap: true }); center(position);
    pointerValid = false; return true;
  }
  function reset(position) {
    Object.assign(state, preferences[state.mode], { needsSnap: true }); center(position); pointerValid = false;
  }
  function rotate(dx, dy, sensitivity = 1) {
    if (state.mode === 'moba' || state.mode === 'quarter') return;
    state.yaw -= dx * .0022 * sensitivity;
    state.yaw = THREE.MathUtils.euclideanModulo(state.yaw + Math.PI, Math.PI * 2) - Math.PI;
    const limit = state.mode === 'first-person' ? 1.45 : 1.35;
    state.pitch = THREE.MathUtils.clamp(state.pitch + dy * .0018 * sensitivity, state.mode === 'first-person' ? -1.45 : -.08, limit);
  }
  function zoom(delta) {
    if (!delta || state.mode === 'first-person') return;
    const moba = state.mode === 'moba';
    state.distance = THREE.MathUtils.clamp(state.distance + Math.sign(delta) * (moba ? 3 : .9), moba ? 22 : 4.4, moba ? 85 : 24);
  }
  function pan(dx, dy) {
    if (state.mode !== 'moba') return;
    basis(); state.follow = false;
    focus.addScaledVector(right, -dx * state.distance * .0018).addScaledVector(forward, dy * state.distance * .0018);
  }
  function trackPointer(x, y, width, height, overCanvas) {
    edge.set(0, 0);
    if (!overCanvas || width <= 0 || height <= 0) return;
    pointer.set(x / width * 2 - 1, 1 - y / height * 2); pointerValid = true;
    const margin = 22;
    edge.set(x < margin ? -1 : x > width - margin ? 1 : 0, y < margin ? -1 : y > height - margin ? 1 : 0);
    if (state.mode === 'moba' && edge.lengthSq()) state.follow = false;
  }
  function update(dt, camera, position, colliders = [], arenaRadius = 58) {
    basis();
    if (state.mode === 'moba') {
      if (edge.lengthSq()) {
        state.follow = false;
        focus.addScaledVector(right, edge.x * dt * state.distance * .85).addScaledVector(forward, -edge.y * dt * state.distance * .85);
      } else if (state.follow) center(position);
      const limit = arenaRadius + 18;
      focus.x = THREE.MathUtils.clamp(focus.x, -limit, limit); focus.z = THREE.MathUtils.clamp(focus.z, -limit, limit);
      target.copy(focus); target.y = 1;
    } else { target.copy(position); target.y += state.mode === 'quarter' ? 1.05 : 1.45; }
    if (state.mode === 'first-person') {
      desired.copy(position); desired.y += 1.77; desired.addScaledVector(forward, .24);
      direction.set(forward.x * Math.cos(state.pitch), -Math.sin(state.pitch), forward.z * Math.cos(state.pitch));
      target.copy(desired).add(direction);
    } else {
      desired.set(Math.sin(state.yaw) * Math.cos(state.pitch), Math.sin(state.pitch), Math.cos(state.yaw) * Math.cos(state.pitch)).multiplyScalar(state.distance).add(target);
      desired.y = Math.max(.35, desired.y);
      if (state.mode !== 'moba') {
        direction.copy(desired).sub(target); const length = direction.length(); direction.normalize();
        ray.set(target, direction); ray.far = length; hits.length = 0; ray.intersectObjects(colliders, false, hits);
        if (hits.length) desired.copy(target).addScaledVector(direction, Math.max(.9, hits[0].distance - .42));
        desired.y = Math.max(.35, desired.y);
      }
    }
    if (state.needsSnap || state.mode === 'first-person') camera.position.copy(desired);
    else camera.position.lerp(desired, 1 - Math.exp(-dt * 8.5));
    state.needsSnap = false; camera.position.y = Math.max(.35, camera.position.y);
    if (camera.fov !== state.fov) { camera.fov = state.fov; camera.updateProjectionMatrix(); }
    camera.lookAt(target); camera.updateMatrixWorld(true);
  }
  return {
    state, pointer, focus, forward, setMode, reset, rotate, zoom, pan, trackPointer, update,
    get pointerAim() { return state.mode === 'quarter' || state.mode === 'moba'; },
    get hasPointer() { return pointerValid; },
    center, toggleFollow(position) { state.follow = !state.follow; if (state.follow) center(position); return state.follow; },
    clearPointer() { edge.set(0, 0); },
    setFov(value) { if (Number.isFinite(value)) state.fov = THREE.MathUtils.clamp(value, 38, 90); },
    diagnostics() { return { ...state, focus: focus.toArray(), pointer: pointer.toArray(), edge: edge.toArray() }; }
  };
}
