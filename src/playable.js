import * as THREE from 'three';
import { createCharacterModel } from './character-model.js';
import { isCastingPhase } from './cast-timing.js';
import { createPlayerCamera } from './player-camera.js';

// Player movement, targeting and the uploaded character share the existing game loop.
export function createPlayableSystems(scene, canvas) {
  const makeMat = (color, metalness = .15, roughness = .5, emissive = 0x000000) => new THREE.MeshStandardMaterial({ color, metalness, roughness, emissive, emissiveIntensity: .8 });
  const trimMat = makeMat(0x9d8256, .68, .34);
  const runeMat = new THREE.MeshBasicMaterial({ color: 0x7de9e3, transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const mage = new THREE.Group(); mage.name = 'PlayerCyberBot'; mage.visible = false; scene.add(mage);
  const modelRoot = new THREE.Group(); modelRoot.name = 'CharacterModelRoot'; mage.add(modelRoot);
  let character = createCharacterModel(); modelRoot.add(character.root);
  const castAnchorFallback = new THREE.Object3D(); castAnchorFallback.position.set(0, 2.08, -.05); mage.add(castAnchorFallback);
  const feetRune = new THREE.Group(); feetRune.position.y = .035; mage.add(feetRune);
  const runeRings = [];
  for (const [r, width] of [[.58, .026], [.43, .012], [.24, .018]]) { const mesh = new THREE.Mesh(new THREE.TorusGeometry(r, width, 6, 64), runeMat.clone()); mesh.rotation.x = Math.PI / 2; feetRune.add(mesh); runeRings.push(mesh); }
  for (let i = 0; i < 8; i++) { const glyph = new THREE.Mesh(new THREE.BoxGeometry(.08, .012, .3), runeMat.clone()); glyph.position.set(Math.cos(i * Math.PI / 4) * .48, .01, Math.sin(i * Math.PI / 4) * .48); glyph.rotation.y = -i * Math.PI / 4; feetRune.add(glyph); }
  feetRune.visible = false;
  const castParticleCount = 24, castGeometry = new THREE.BufferGeometry(), castPositions = new Float32Array(castParticleCount * 3);
  castGeometry.setAttribute('position', new THREE.BufferAttribute(castPositions, 3));
  const castMaterial = new THREE.PointsMaterial({ color: 0x7de9e3, size: .105, transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, sizeAttenuation: true });
  const castParticles = new THREE.Points(castGeometry, castMaterial); castParticles.frustumCulled = false; mage.add(castParticles); castParticles.visible = false;
  const motion = { position: mage.position, velocity: new THREE.Vector3(), yaw: 0, pitch: .2, distance: 8.6, arenaRadius: 58, aim: false, locked: null, grounded: true, jumping: false, dash: 0, castPhase: 'idle', castStyle: '', recovery: 0, lastPhase: 'idle', castLocked: false, castAnchor: new THREE.Vector3(), castYaw: 0, time: 0, lastForward: new THREE.Vector3(0, 0, -1) };
  const view = createPlayerCamera();
  const pressed = new Set(); let rightHeld = false; let aimTarget = new THREE.Vector3(); let rangeExceeded = false, aimDistance = 0, aimMaxRange = 18;
  const aimForward = new THREE.Vector3(0, 0, -1), rayDirection = new THREE.Vector3(), aimDelta = new THREE.Vector3(), aimFrom = new THREE.Vector3(), aimHit = new THREE.Vector3(), forward = new THREE.Vector3(), right = new THREE.Vector3(), move = new THREE.Vector3(), targetDelta = new THREE.Vector3(), camRay = new THREE.Raycaster();
  const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); const aimRay = new THREE.Ray();
  const dummyMat = makeMat(0x77858a, .72, .32, 0x102b31), dummyGlow = new THREE.MeshBasicMaterial({ color: 0x62d7ce, transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const dummies = [];
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4 + .23, radius = i % 2 ? 18 : 24, group = new THREE.Group(); group.position.set(Math.cos(a) * radius, 0, Math.sin(a) * radius); group.userData.base = group.position.clone(); scene.add(group);
    const bodyMesh = new THREE.Mesh(new THREE.CylinderGeometry(.34, .48, 2.35, 8), dummyMat); bodyMesh.position.y = 1.2; group.add(bodyMesh);
    const headMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(.35, 0), dummyGlow); headMesh.position.y = 2.62; group.add(headMesh);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.72, .035, 6, 36), dummyGlow); ring.position.y = .06; ring.rotation.x = Math.PI / 2; group.add(ring);
    const marker = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, .32, 8), trimMat); marker.position.y = 2.95; group.add(marker);
    const echo = group.clone(true), echoMaterials = [];
    echo.traverse(object => {
      if (!object.isMesh) return;
      const source = Array.isArray(object.material) ? object.material : [object.material];
      const copies = source.map(material => { const copy = material.clone(); copy.transparent = true; copy.opacity = .12; copy.depthWrite = false; copy.blending = THREE.AdditiveBlending; copy.color?.lerp(new THREE.Color(0xb9d9d6), .24); return copy; });
      echoMaterials.push(...copies);
      object.material = Array.isArray(object.material) ? copies : copies[0];
    });
    echo.visible = false; echo.renderOrder = 2; scene.add(echo);
    dummies.push({ group, bodyMesh, ring, headMesh, echo, echoMaterials, base: group.userData.base.clone(), goal: group.position.clone(), hit: 0, impulse: new THREE.Vector3(), hitMaterial: makeMat(0x62d7ce, .55, .32, 0x62d7ce), elementColor: 0x62d7ce, motionTime: 0 });
  }
  const colliders = dummies.flatMap(d => [d.bodyMesh, d.headMesh]);
  const updateReticle = (camera, skill, lockedTarget) => {
    if (view.pointerAim && view.hasPointer) { camRay.setFromCamera(view.pointer, camera); aimRay.copy(camRay.ray); }
    else { camera.getWorldDirection(rayDirection); aimRay.set(camera.position, rayDirection); }
    if (lockedTarget) { aimHit.copy(lockedTarget.group.position); aimHit.y += 1.15; }
    else if (!aimRay.intersectPlane(floorPlane, aimHit)) aimHit.copy(mage.position).addScaledVector(motion.lastForward, 18);
    const maxRange = aimMaxRange = Math.max(18, skill.spread * 1.75); aimFrom.copy(mage.position); aimFrom.y = 0;
    aimDelta.copy(aimHit).sub(aimFrom); aimDelta.y = 0; const dist = aimDistance = aimDelta.length(); rangeExceeded = dist > maxRange;
    if (rangeExceeded) aimHit.copy(aimFrom).add(aimDelta.normalize().multiplyScalar(maxRange));
    aimHit.y = 0; aimTarget.copy(aimHit); aimForward.copy(aimTarget).sub(mage.position).setY(0); if (aimForward.lengthSq() > .0001) aimForward.normalize(); else aimForward.copy(view.forward);
  };
  const setColor = hex => { runeMat.color.setHex(hex); for (const child of feetRune.children) if (child.material?.color) { child.material.color.setHex(hex); child.material.opacity = runeMat.opacity; } };
  function beginCast() {
    if (motion.castLocked) return;
    motion.position.y = 0; motion.velocity.set(0, 0, 0); motion.grounded = true; motion.dash = 0;
    motion.castAnchor.copy(motion.position); motion.castYaw = mage.rotation.y;
    motion.castLocked = true; motion.castPhase = 'charging';
  }
  function updateModel(realDt, playerDt, color, phase, skill, runeOpacity = 1) {
    motion.time += realDt;
    const casting = isCastingPhase(phase), charge = casting ? (phase === 'channeling' ? .85 : .5) : 0;
    const elementGesture = skill?.elementIndex ?? 0;
    character.update?.(realDt, motion, casting);
    runeMat.opacity = (.68 + charge * .27) * runeOpacity;
    feetRune.visible = casting && runeOpacity > .001; feetRune.rotation.y += playerDt * (elementGesture % 2 ? -1.2 : 1.15); feetRune.scale.setScalar(1 + charge * .12);
    castParticles.visible = casting && runeOpacity > .001; castMaterial.color.setHex(color); castMaterial.opacity = (.45 + charge * .45) * runeOpacity;
    if (casting) {
      const positions = castGeometry.attributes.position.array, variantIndex = skill?.slot ?? 0, converge = phase === 'channeling' ? .64 : phase === 'charging' ? .24 : Math.max(0, motion.recovery / .72) * .48, phi = 2.399963229728653;
      for (let i = 0; i < castParticleCount; i++) {
        const seed = i * phi + variantIndex * .9, u = i / castParticleCount, orbit = motion.time * ([.9, -.75, .25, .45, -.35, 1.6, 5.5, .1, .3, .7, 1.2, .25, -1.1, .55, .2][elementGesture] || .7); let a = seed + orbit;
        let r = .35 + (i % 5) * .11, y = 1.25 + (i % 7) * .19, x = Math.cos(a) * r, z = Math.sin(a) * r;
        if (elementGesture === 0 || elementGesture === 8 || elementGesture === 12) { a = seed + motion.time * 1.8; r *= .55 + .45 * Math.sin(u * Math.PI); y += Math.sin(a * 1.7) * .25; x = Math.cos(a) * r; z = Math.sin(a) * r; }
        else if (elementGesture === 1 || elementGesture === 5 || elementGesture === 9 || elementGesture === 13) { y += Math.sin(a * 1.35) * .34; x *= .76; z *= .76; }
        else if (elementGesture === 2 || elementGesture === 7) { x = Math.cos(seed) * r; z = Math.sin(seed) * r; y = 1.3 + (i % 4) * .24 + Math.sin(motion.time * 9 + i) * .08; }
        else if (elementGesture === 3 || elementGesture === 6 || elementGesture === 10) { r *= .65 + .3 * Math.sin(motion.time * 3 + i * .4); x = Math.cos(a * (elementGesture === 6 ? 3 : 1)) * r; z = Math.sin(a * 1.4) * r; }
        else if (elementGesture === 4 || elementGesture === 11) { y = 2.35 + Math.sin(a) * .35; x = Math.cos(a) * r * .85; z = Math.sin(a * 1.2) * r * .5; }
        else if(elementGesture===14){y=1.15+u*1.6+Math.sin(a)*.12;x=Math.cos(a)*r*(.4+u);z=Math.sin(a)*r*(.4+u);}
        const tx = 0, ty = 2.08, tz = -.05, pull = converge * (.35 + .65 * ((i * 7 % castParticleCount) / castParticleCount));
        positions[i * 3] = x * (1 - pull) + tx * pull; positions[i * 3 + 1] = y * (1 - pull) + ty * pull; positions[i * 3 + 2] = z * (1 - pull) + tz * pull;
      }
      castGeometry.attributes.position.needsUpdate = true;
    }
    setColor(color);
  }
  function update(realDt, playerDt, camera, skill, color, phase, shape, aimHeld = rightHeld, cinematic = false, windForce = 0, windDirection = null, timeDomain = null, affectPlayerByDomain = false, runeOpacity = 1) {
    if (timeDomain && affectPlayerByDomain) playerDt *= timeDomain.timeFactorAt(motion.position);
    const casting = isCastingPhase(phase);
    if (casting && !motion.castLocked) beginCast();
    if (!casting) motion.castLocked = false;
    motion.aim = aimHeld; motion.castPhase = phase; motion.castStyle = skill?.archetype ?? shape;
    forward.set(-Math.sin(view.state.yaw), 0, -Math.cos(view.state.yaw)); right.set(-forward.z, 0, forward.x);
    let x = (pressed.has('KeyD') || pressed.has('ArrowRight') ? 1 : 0) - (pressed.has('KeyA') || pressed.has('ArrowLeft') ? 1 : 0);
    let z = (pressed.has('KeyW') || pressed.has('ArrowUp') ? 1 : 0) - (pressed.has('KeyS') || pressed.has('ArrowDown') ? 1 : 0);
    const pads = navigator.getGamepads?.() || []; let pad = null; for (let i = 0; i < pads.length; i++) if (pads[i]) { pad = pads[i]; break; }
    if (pad) { x += Math.abs(pad.axes[0] || 0) > .12 ? pad.axes[0] : 0; z += Math.abs(pad.axes[1] || 0) > .12 ? -pad.axes[1] : 0; if (Math.abs(pad.axes[2] || 0) > .16 || Math.abs(pad.axes[3] || 0) > .16) view.rotate((pad.axes[2] || 0) * realDt * 1000, (pad.axes[3] || 0) * realDt * 450); }
    const stick = Math.min(1, Math.hypot(x, z)); if (stick > .01) { x /= Math.max(1, Math.hypot(x, z)); z /= Math.max(1, Math.hypot(x, z)); }
    move.set(0, 0, 0).addScaledVector(right, x).addScaledVector(forward, z);
    const sprint = pressed.has('ShiftLeft') || pressed.has('ShiftRight') || (pad?.buttons?.[10]?.pressed ?? false); const topSpeed = sprint ? 8.2 : 5.1;
    if (casting) {
      motion.position.copy(motion.castAnchor); motion.velocity.set(0, 0, 0); motion.dash = 0;
      motion.grounded = true; move.set(0, 0, 0); mage.rotation.y = motion.castYaw;
    } else {
      motion.velocity.x = THREE.MathUtils.damp(motion.velocity.x, move.x * topSpeed, move.lengthSq() ? 8.5 : 5.5, playerDt);
      motion.velocity.z = THREE.MathUtils.damp(motion.velocity.z, move.z * topSpeed, move.lengthSq() ? 8.5 : 5.5, playerDt);
      if (motion.dash > 0) motion.dash = Math.max(0, motion.dash - realDt);
      if (!motion.grounded) motion.velocity.y -= 18 * playerDt;
      motion.position.addScaledVector(motion.velocity, playerDt);
      if (motion.position.y <= 0) { motion.position.y = 0; motion.velocity.y = 0; motion.grounded = true; }
      const radius = motion.arenaRadius, d = Math.hypot(motion.position.x, motion.position.z); if (d > radius) { const k = radius / d; motion.position.x *= k; motion.position.z *= k; motion.velocity.x *= .4; motion.velocity.z *= .4; }
      if (motion.aim && !motion.locked && move.lengthSq() < .02) { /* keep facing the camera while aiming */ }
      if (motion.locked) { targetDelta.copy(motion.locked.group.position).sub(motion.position); motion.yaw = Math.atan2(-targetDelta.x, -targetDelta.z); }
      else if (move.lengthSq() > .02 && !motion.aim) motion.yaw += Math.atan2(Math.sin(Math.atan2(-move.x, -move.z) - motion.yaw), Math.cos(Math.atan2(-move.x, -move.z) - motion.yaw)) * (1 - Math.exp(-9 * playerDt));
      else if (motion.aim || view.state.mode === 'first-person') motion.yaw = view.pointerAim ? Math.atan2(-aimForward.x, -aimForward.z) : view.state.yaw;
      if (move.lengthSq() > .01) motion.lastForward.copy(move).normalize();
      mage.rotation.y = motion.yaw;
    }
    updateCamera(realDt, camera, skill);
    updateModel(realDt, playerDt, color, phase, skill, runeOpacity);
    let echoBudget = timeDomain ? Math.max(0, timeDomain.afterimageCount || 0) : 0;
    for (const d of dummies) {
      const factor = timeDomain ? timeDomain.timeFactorAt(d.group.position) : 1;
      const localDt = Math.min(realDt * factor, timeDomain?.catchUpMaxStep ?? .05);
      d.natureBind=Math.max(0,(d.natureBind||0)-localDt);
      d.motionTime += localDt;
      d.hit = Math.max(0, d.hit - localDt);
      d.goal.copy(d.base).add(d.impulse);
      d.group.position.lerp(d.goal, 1 - Math.exp(-localDt * (d.natureBind>0?.55:2.8)));
      d.impulse.multiplyScalar(Math.exp(-localDt * 2));
      d.group.rotation.z = Math.sin(d.motionTime * 14 + d.base.x) * d.hit * .12;
      d.hitMaterial.color.setHex(d.elementColor); d.hitMaterial.emissive.setHex(d.elementColor);
      d.bodyMesh.material = d.hit > 0 ? d.hitMaterial : dummyMat;
      d.ring.material.opacity = .5 + .35 * Math.sin(d.motionTime * 2 + d.base.x);
      const showEcho = !!timeDomain && factor < .35 && echoBudget > 0;
      d.echo.visible = showEcho;
      if (showEcho) {
        echoBudget--;
        d.echo.position.copy(d.group.position); d.echo.rotation.copy(d.group.rotation);
        d.echo.position.x += .16; d.echo.position.z -= .1;
        const opacity = .14 * (1 - factor) * (timeDomain.reducedMotion ? .45 : 1);
        d.echoMaterials.forEach((material, index) => { material.opacity = opacity / (index > 2 ? 1.45 : 1); });
      }
    }
  }
  function updateCamera(dt, camera, skill) {
    modelRoot.visible = view.state.mode !== 'first-person';
    view.update(dt, camera, motion.position, colliders, motion.arenaRadius);
    motion.pitch = view.state.pitch; motion.distance = view.state.distance;
    if (skill) updateReticle(camera, skill, motion.locked);
  }
  function castContext(skill, quality, mode = 'play') {
    const origin = new THREE.Vector3(); (character.castAnchor || castAnchorFallback).getWorldPosition(origin);
    const casterPosition = mage.position.clone(), casterForward = (motion.aim || view.pointerAim || view.state.mode === 'first-person') ? aimForward.clone() : motion.lastForward.clone();
    if (casterForward.lengthSq() < .01) casterForward.set(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), mage.rotation.y);
    const archetype = ({ skyfall: 'Thiên giáng', colossal: 'Khổng lồ', barrage: 'Mưa đòn', vortex: 'Xoáy hội tụ', tornado: 'Siêu lốc', spatial: 'Không gian', timeDomain: 'Lĩnh vực thời gian', iceDomain: 'Lĩnh vực băng giá', bloodChainNet: 'Lồng xích huyết', elemental: 'Lĩnh vực nguyên tố' })[skill.archetype] || 'Lĩnh vực nguyên tố';
    const aoeCenter = aimTarget.clone(); aoeCenter.y = 0;
    return { origin, casterPosition, casterForward, target: aimTarget.clone(), targetNormal: new THREE.Vector3(0, 1, 0), aoeCenter, aoeScale: 1, lockedTarget: motion.locked?.group || null, quality, mode, archetype, maxRange: Math.max(18, skill.spread * 1.75) };
  }
  function applyNatureHit(index, kind, color) {
    const d=dummies[index];if(!d)return;d.hit=.8;d.elementColor=color;
    d.hitMaterial.color.setHex(color);d.hitMaterial.emissive.setHex(color);d.bodyMesh.material=d.hitMaterial;
    if(kind==='root')d.natureBind=1.7;else{d.impulse.x+=Math.sin(index*2.4)*.12;d.impulse.z+=Math.cos(index*2.4)*.12;}
  }
  function clearNatureEffects(){for(const d of dummies){d.natureBind=0;d.impulse.set(0,0,0);d.hit=0;d.group.position.copy(d.base);d.goal.copy(d.base);d.group.rotation.z=0;d.bodyMesh.material=dummyMat;}}
  function applyImpact(center, radius, hex, visualOnly = false) {
    if (visualOnly) return 0;
    let count = 0;
    for (const d of dummies) { const dist = Math.hypot(d.group.position.x - center.x, d.group.position.z - center.z); if (dist <= radius * 1.15 + 2) { d.hit = 1.35; d.elementColor = hex; const dir = new THREE.Vector3(d.group.position.x - center.x, 0, d.group.position.z - center.z); if (dir.lengthSq() < .01) dir.set(1, 0, 0); dir.normalize(); d.impulse.copy(dir.multiplyScalar(2.1)); count++; } }
    return count;
  }
  function pullTargets(center, radius, pull, burst = 0, dt = 0) {
    let affected = 0;
    for (const d of dummies) {
      const dx = d.base.x - center.x, dz = d.base.z - center.z, distance = Math.hypot(dx, dz);
      if (distance > radius + 3) continue;
      const falloff = 1 - THREE.MathUtils.smoothstep(distance, radius * .72, radius + 3);
      const strength = THREE.MathUtils.clamp(pull, 0, 1) * falloff;
      const awayX = distance > .01 ? dx / distance : 1, awayZ = distance > .01 ? dz / distance : 0;
      const inward = Math.max(0, distance - .28) * strength;
      const outward = (2.8 + Math.min(5, distance * .18)) * THREE.MathUtils.clamp(burst, 0, 1) * falloff;
      const spiral = Math.min(3.8, distance * .3) * strength * (1 - strength * .78) * falloff; const targetX = -awayX * inward - awayZ * spiral + awayX * outward, targetZ = -awayZ * inward + awayX * spiral + awayZ * outward;
      d.impulse.x = THREE.MathUtils.lerp(d.impulse.x, targetX, 1 - Math.exp(-Math.max(.001, dt) * 3.4));
      d.impulse.z = THREE.MathUtils.lerp(d.impulse.z, targetZ, 1 - Math.exp(-Math.max(.001, dt) * 3.4));
      d.hit = Math.max(d.hit, .12 + strength * .3); d.elementColor = 0x9b83ff; affected++;
    }
    return affected;
  }
  function reset() { pressed.clear(); rightHeld = false; motion.position.set(0, 0, 12); motion.velocity.set(0, 0, 0); motion.yaw = 0; motion.pitch = .2; motion.distance = 8.6; motion.arenaRadius = 58; motion.grounded = true; motion.locked = null; motion.dash = 0; motion.recovery = 0; motion.lastPhase = 'idle'; motion.castPhase = 'idle'; motion.castLocked = false; character.reset?.(); motion.lastForward.set(0, 0, -1); mage.rotation.y = 0; view.reset(motion.position); for (const d of dummies) { d.group.position.copy(d.base); d.impulse.set(0, 0, 0); d.hit = 0; d.natureBind=0; d.motionTime = 0; d.echo.visible = false; d.bodyMesh.material = dummyMat; } }
  const systems = {
    mage, dummies, motion, aimTarget, aimForward, get rangeExceeded() { return rangeExceeded; }, get locked() { return motion.locked; }, get aim() { return motion.aim; }, get distance() { return motion.distance; }, get colliders() { return colliders; },
    update, updateCamera, view, beginCast, castContext, get character() { return character; }, applyImpact, applyNatureHit, clearNatureEffects, pullTargets, reset,
    toggleLock() { if (motion.locked) { motion.locked = null; return null; } const choices = dummies.map(d => ({ d, dist: d.group.position.distanceTo(mage.position) })).filter(x => x.dist < 70).sort((a, b) => a.dist - b.dist); motion.locked = choices[0]?.d || null; return motion.locked; },
    setAim(v) { rightHeld = v; },
    replaceModel(object3D, rig = {}) { character.dispose?.(); modelRoot.clear(); modelRoot.add(object3D); character = { ...rig, root: object3D, castAnchor: rig.castAnchor || rig.staffAnchor || object3D.getObjectByName?.('StaffCrystal') }; return mage; },
    releaseInput() { pressed.clear(); rightHeld = false; view.clearPointer(); },
    onKeyDown(e) { pressed.add(e.code); if (motion.castLocked || isCastingPhase(motion.castPhase)) return; if (e.code === 'Space' && motion.grounded) { motion.velocity.y = 7.5; motion.grounded = false; } if (e.code === 'KeyQ' && motion.grounded) { motion.dash = .24; motion.velocity.x += motion.lastForward.x * 13; motion.velocity.z += motion.lastForward.z * 13; } },
    onKeyUp(e) { pressed.delete(e.code); },
    onMouseMove(dx, dy, sensitivity = 1) { view.rotate(dx, dy, sensitivity); },
    onWheel(delta) { view.zoom(delta); }, setArenaRadius(value) { motion.arenaRadius = THREE.MathUtils.clamp(value, 30, 82); },
    targetInfo: { target: aimTarget, dist: 0, maxRange: 18, exceeded: false },
    getTargetInfo(skill) { systems.targetInfo.dist = Math.min(aimDistance, Math.max(18, skill.spread * 1.75)); systems.targetInfo.maxRange = aimMaxRange; systems.targetInfo.exceeded = rangeExceeded; return systems.targetInfo; }
  };
  reset(); return systems;
}

