import * as THREE from 'three';

// Procedural player systems are kept separate from the Showcase and skill VFX.
export function createPlayableSystems(scene, canvas) {
  const makeMat = (color, metalness = .15, roughness = .5, emissive = 0x000000) => new THREE.MeshStandardMaterial({ color, metalness, roughness, emissive, emissiveIntensity: .8 });
  const robeMat = makeMat(0x252a31, .32, .58), trimMat = makeMat(0x9d8256, .68, .34), clothMat = makeMat(0x45464a, .15, .7), armorMat = makeMat(0x777a7d, .72, .3), darkMat = makeMat(0x171b20, .12, .65);
  const runeMat = new THREE.MeshBasicMaterial({ color: 0x7de9e3, transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const mage = new THREE.Group(); mage.name = 'ProceduralMage'; mage.visible = false; scene.add(mage);
  const modelRoot = new THREE.Group(); modelRoot.name = 'CharacterModelRoot'; mage.add(modelRoot);
  const hips = new THREE.Group(); hips.position.y = 1.03; modelRoot.add(hips);
  const body = new THREE.Group(); body.position.y = .35; hips.add(body);
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(.35, .52, .9, 8), robeMat); torso.position.y = .12; body.add(torso);
  const chest = new THREE.Mesh(new THREE.BoxGeometry(.69, .48, .25), armorMat); chest.position.set(0, .29, -.04); body.add(chest);
  const chestRune = new THREE.Mesh(new THREE.OctahedronGeometry(.1, 0), runeMat); chestRune.position.set(0, .3, -.18); body.add(chestRune);
  const shoulders = [];
  for (const side of [-1, 1]) { const shoulder = new THREE.Mesh(new THREE.SphereGeometry(.22, 8, 6), trimMat); shoulder.position.set(side * .43, .43, 0); body.add(shoulder); shoulders.push(shoulder); }
  const hood = new THREE.Group(); hood.position.y = .88; body.add(hood);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.24, 10, 8), darkMat); head.scale.set(.9, 1.16, .82); hood.add(head);
  const hoodShell = new THREE.Mesh(new THREE.SphereGeometry(.31, 10, 7, 0, Math.PI * 2, 0, Math.PI * .74), robeMat); hoodShell.position.y = .035; hoodShell.rotation.x = -.12; hood.add(hoodShell);
  const face = new THREE.Mesh(new THREE.SphereGeometry(.145, 8, 6), makeMat(0x9c9b96, .05, .8)); face.scale.set(.92, .84, .52); face.position.set(0, -.04, -.17); hood.add(face);
  const eyes = new THREE.Mesh(new THREE.BoxGeometry(.12, .025, .015), runeMat); eyes.position.set(0, -.01, -.285); hood.add(eyes);
  const arms = [], legs = [], forearms = [], calves = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(side * .42, .48, 0); body.add(arm); arms.push(arm);
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(.12, .15, .48, 7), clothMat); upper.position.y = -.25; arm.add(upper);
    const elbow = new THREE.Group(); elbow.position.y = -.48; arm.add(elbow); forearms.push(elbow);
    const lower = new THREE.Mesh(new THREE.CylinderGeometry(.085, .11, .4, 7), robeMat); lower.position.y = -.2; elbow.add(lower);
    const glove = new THREE.Mesh(new THREE.SphereGeometry(.105, 8, 6), runeMat); glove.position.y = -.42; elbow.add(glove);
    const leg = new THREE.Group(); leg.position.set(side * .2, -.18, 0); hips.add(leg); legs.push(leg);
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(.16, .19, .52, 7), robeMat); thigh.position.y = -.25; leg.add(thigh);
    const knee = new THREE.Group(); knee.position.y = -.5; leg.add(knee); calves.push(knee);
    const shin = new THREE.Mesh(new THREE.CylinderGeometry(.1, .14, .47, 7), darkMat); shin.position.y = -.23; knee.add(shin);
    const boot = new THREE.Mesh(new THREE.BoxGeometry(.2, .12, .33), trimMat); boot.position.set(0, -.47, -.06); knee.add(boot);
  }
  // A six-section cape has spring-like lag, not a single rigid plane.
  const cape = [];
  let capeParent = body;
  for (let i = 0; i < 6; i++) {
    const segment = new THREE.Group(); segment.position.set(0, i === 0 ? .51 : -.15, .11); capeParent.add(segment);
    const panel = new THREE.Mesh(new THREE.ConeGeometry(.34 + i * .055, .42, 6, 1, true), i % 2 ? robeMat : clothMat); panel.rotation.x = Math.PI; panel.position.y = -.2; segment.add(panel);
    const seam = new THREE.Mesh(new THREE.BoxGeometry(.025, .35, .022), trimMat); seam.position.set(0, -.22, -.08); segment.add(seam);
    cape.push(segment); capeParent = segment;
  }
  const staff = new THREE.Group(); staff.position.set(.58, -.34, -.05); arms[1].add(staff);
  const staffShaft = new THREE.Mesh(new THREE.CylinderGeometry(.045, .065, 2.35, 8), trimMat); staffShaft.position.y = .55; staff.add(staffShaft);
  const staffGrip = new THREE.Mesh(new THREE.CylinderGeometry(.075, .075, .36, 8), darkMat); staffGrip.position.y = .38; staff.add(staffGrip);
  let crystal = new THREE.Mesh(new THREE.OctahedronGeometry(.22, 0), runeMat); crystal.name = 'StaffCrystal'; crystal.position.y = 1.83; staff.add(crystal); let originAnchor = crystal;
  const crystalCage = new THREE.Mesh(new THREE.TorusGeometry(.28, .025, 6, 28), trimMat); crystalCage.position.y = 1.83; crystalCage.rotation.x = Math.PI / 2; staff.add(crystalCage);
  const feetRune = new THREE.Group(); feetRune.position.y = .035; mage.add(feetRune);
  const runeRings = [];
  for (const [r, width] of [[.58, .026], [.43, .012], [.24, .018]]) { const mesh = new THREE.Mesh(new THREE.TorusGeometry(r, width, 6, 64), runeMat.clone()); mesh.rotation.x = Math.PI / 2; feetRune.add(mesh); runeRings.push(mesh); }
  for (let i = 0; i < 8; i++) { const glyph = new THREE.Mesh(new THREE.BoxGeometry(.08, .012, .3), runeMat.clone()); glyph.position.set(Math.cos(i * Math.PI / 4) * .48, .01, Math.sin(i * Math.PI / 4) * .48); glyph.rotation.y = -i * Math.PI / 4; feetRune.add(glyph); }
  feetRune.visible = false;
  const castParticleCount = 24, castGeometry = new THREE.BufferGeometry(), castPositions = new Float32Array(castParticleCount * 3);
  castGeometry.setAttribute('position', new THREE.BufferAttribute(castPositions, 3));
  const castMaterial = new THREE.PointsMaterial({ color: 0x7de9e3, size: .105, transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, sizeAttenuation: true });
  const castParticles = new THREE.Points(castGeometry, castMaterial); castParticles.frustumCulled = false; mage.add(castParticles); castParticles.visible = false;
  const motion = { position: mage.position, velocity: new THREE.Vector3(), yaw: 0, pitch: .2, distance: 8.6, arenaRadius: 58, aim: false, locked: null, grounded: true, jumping: false, dash: 0, castPhase: 'idle', castStyle: '', recovery: 0, lastPhase: 'idle', time: 0, lastForward: new THREE.Vector3(0, 0, -1) };
  const pressed = new Set(); let rightHeld = false; let aimTarget = new THREE.Vector3(); let rangeExceeded = false, aimDistance = 0, aimMaxRange = 18;
  const cameraOffset = new THREE.Vector3(), cameraTarget = new THREE.Vector3(), desiredCamera = new THREE.Vector3(), cameraDirection = new THREE.Vector3(), rayDirection = new THREE.Vector3(), aimDelta = new THREE.Vector3(), aimFrom = new THREE.Vector3(), aimHit = new THREE.Vector3(), forward = new THREE.Vector3(), right = new THREE.Vector3(), move = new THREE.Vector3(), targetDelta = new THREE.Vector3(), camRay = new THREE.Raycaster();
  const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); const aimRay = new THREE.Ray(), cameraHits = [];
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
    camera.getWorldDirection(rayDirection); aimRay.set(camera.position, rayDirection);
    if (lockedTarget) { aimHit.copy(lockedTarget.group.position); aimHit.y += 1.15; }
    else if (!aimRay.intersectPlane(floorPlane, aimHit)) aimHit.copy(mage.position).addScaledVector(motion.lastForward, 18);
    const maxRange = aimMaxRange = Math.max(18, skill.spread * 1.75); aimFrom.copy(mage.position); aimFrom.y = 0;
    aimDelta.copy(aimHit).sub(aimFrom); aimDelta.y = 0; const dist = aimDistance = aimDelta.length(); rangeExceeded = dist > maxRange;
    if (rangeExceeded) aimHit.copy(aimFrom).add(aimDelta.normalize().multiplyScalar(maxRange));
    aimHit.y = 0; aimTarget.copy(aimHit);
  };
  const setColor = hex => { runeMat.color.setHex(hex); for (const ring of runeRings) ring.material.color.setHex(hex); for (const child of feetRune.children) if (child.material?.color) child.material.color.setHex(hex); if (crystal.material?.color) crystal.material.color.setHex(hex); chestRune.material.color.setHex(hex); eyes.material.color.setHex(hex); };
  function updateModel(realDt, playerDt, color, phase, skill, windForce=0, windDirection=null) {
    motion.time += realDt; const speed = Math.hypot(motion.velocity.x, motion.velocity.z); const moving = speed > .45;
    const stride = Math.sin(motion.time * (speed > 7 ? 12 : 8)) * Math.min(1, speed / 5);
    legs[0].rotation.x = stride * .55; legs[1].rotation.x = -stride * .55; calves[0].rotation.x = Math.max(0, -stride) * .52; calves[1].rotation.x = Math.max(0, stride) * .52;
    arms[0].rotation.x = -stride * .36; arms[1].rotation.x = stride * .28;
    if (phase === 'active' && motion.lastPhase !== 'active') motion.recovery = .72;
    if (phase === 'idle' || phase === 'recovery') motion.recovery = 0;
    motion.lastPhase = phase;
    const casting = phase === 'charging' || phase === 'channeling' || motion.recovery > 0; const charge = casting ? (phase === 'channeling' ? .85 : .5 + .22 * Math.sin(motion.time * 7)) : 0;
    const elementGesture = skill?.elementIndex ?? Math.floor(Number(skill) / 3);
    // Each element has a different casting pose; shape variation changes the wrist/weapon finish.
    const gestures = [[-.55, .25, .16], [-.18, -.38, .3], [.28, .52, -.12], [-1.08, .18, -.12], [.62, -.2, .18], [-.38, .82, .35], [-.85, -.48, -.24], [.1, .58, .16], [.46, .3, -.34], [-.2, -.76, .22], [-.72, .65, .38], [-.55, -.12, -.42], [.4, -.62, .12], [-.88, .4, -.32], [-.66, -.3, .46]];
      const pose = skill?.shape === 'dimensionalCollapse' ? [-1.26, -1.58, -.32] : skill?.shape === 'bloodChainNet' ? [-.94, -1.42, -.18] : skill?.shape === 'seraphicRain' ? [-.95, -1.22, -.2] : skill?.shape === 'earthMeteorRupture' ? [-1.12, -1.38, -.18] : skill?.shape === 'eternalWinter' ? [-.82, -1.34, -.2] : skill?.shape === 'venomApocalypse' ? [-1.02, -1.48, -.12] : skill?.shape === 'lightningStorm' ? [-1.18, -1.42, -.28] : (gestures[elementGesture] || gestures[0]), variant = ((skill?.slot ?? Number(shape) % 3) - 1) * .13;
    arms[0].rotation.x = THREE.MathUtils.damp(arms[0].rotation.x, casting ? pose[0] + variant - charge * .25 : -stride * .36, 8, realDt);
    arms[1].rotation.x = THREE.MathUtils.damp(arms[1].rotation.x, casting ? pose[1] - variant - charge * .28 : stride * .28, 8, realDt);
    arms[1].rotation.z = THREE.MathUtils.damp(arms[1].rotation.z, casting ? pose[2] + variant : 0, 7, realDt);
    forearms[0].rotation.x = casting ? pose[2] * 1.8 : 0; forearms[1].rotation.x = casting ? -.7 - charge * .3 : 0;
    body.rotation.z = THREE.MathUtils.damp(body.rotation.z, moving ? -motion.velocity.x * .025 : 0, 5, realDt);
    body.position.y = .35 + Math.sin(motion.time * 2.1) * .025 + (motion.grounded ? 0 : .06);
    hood.rotation.y = THREE.MathUtils.damp(hood.rotation.y, motion.aim ? motion.yaw - mage.rotation.y : 0, 5, realDt);
    const gust = THREE.MathUtils.clamp(windForce, 0, 1), gustX = windDirection?.x ?? 0; for (let i = 0; i < cape.length; i++) { const lag = Math.min(1, speed / 9); cape[i].rotation.x = .08 + lag * .2 + Math.sin(motion.time * 2.4 - i * .42) * (.035 + lag * .07) + (casting ? .09 : 0) + gust * (.18 + i * .025); cape[i].rotation.z = Math.sin(motion.time * 1.7 - i * .35) * .035 + motion.velocity.x * -.008 + gustX * gust * .14; }
    crystal.rotation.y += realDt * (1.1 + charge * 2); crystal.scale.setScalar(1 + charge * .13 + .05 * Math.sin(motion.time * 4)); runeMat.opacity = .68 + charge * .27 + .12 * Math.sin(motion.time * 3.5); chestRune.scale.setScalar(1 + charge * .45);
    feetRune.visible = casting; feetRune.rotation.y += playerDt * (elementGesture % 2 ? -1.2 : 1.15); feetRune.scale.setScalar(1 + charge * .12);
    castParticles.visible = casting; castMaterial.color.setHex(color); castMaterial.opacity = .45 + charge * .45;
    if (casting) {
      const positions = castGeometry.attributes.position.array, variantIndex = skill?.slot ?? Number(shape) % 3, converge = phase === 'channeling' ? .64 : phase === 'charging' ? .24 : Math.max(0, motion.recovery / .72) * .48, phi = 2.399963229728653;
      for (let i = 0; i < castParticleCount; i++) {
        const seed = i * phi + variantIndex * .9, u = i / castParticleCount, orbit = motion.time * ([.9, -.75, .25, .45, -.35, 1.6, 5.5, .1, .3, .7, 1.2, .25, -1.1, .55, .2][elementGesture] || .7); let a = seed + orbit;
        let r = .35 + (i % 5) * .11, y = 1.25 + (i % 7) * .19, x = Math.cos(a) * r, z = Math.sin(a) * r;
        if (elementGesture === 0 || elementGesture === 8 || elementGesture === 12) { a = seed + motion.time * 1.8; r *= .55 + .45 * Math.sin(u * Math.PI); y += Math.sin(a * 1.7) * .25; x = Math.cos(a) * r; z = Math.sin(a) * r; }
        else if (elementGesture === 1 || elementGesture === 5 || elementGesture === 9 || elementGesture === 13) { y += Math.sin(a * 1.35) * .34; x *= .76; z *= .76; }
        else if (elementGesture === 2 || elementGesture === 7) { x = Math.cos(seed) * r; z = Math.sin(seed) * r; y = 1.3 + (i % 4) * .24 + Math.sin(motion.time * 9 + i) * .08; }
        else if (elementGesture === 3 || elementGesture === 6 || elementGesture === 10) { r *= .65 + .3 * Math.sin(motion.time * 3 + i * .4); x = Math.cos(a * (elementGesture === 6 ? 3 : 1)) * r; z = Math.sin(a * 1.4) * r; }
        else if (elementGesture === 4 || elementGesture === 11 || elementGesture === 14) { y = 2.35 + Math.sin(a) * .35; x = Math.cos(a) * r * .85; z = Math.sin(a * 1.2) * r * .5; }
        const tx = .62, ty = 2.48, tz = -.08, pull = converge * (.35 + .65 * ((i * 7 % castParticleCount) / castParticleCount));
        positions[i * 3] = x * (1 - pull) + tx * pull; positions[i * 3 + 1] = y * (1 - pull) + ty * pull; positions[i * 3 + 2] = z * (1 - pull) + tz * pull;
      }
      castGeometry.attributes.position.needsUpdate = true;
    }
    if (motion.recovery > 0) motion.recovery = Math.max(0, motion.recovery - realDt);
    setColor(color);
  }
  function update(realDt, playerDt, camera, skill, color, phase, shape, aimHeld = rightHeld, cinematic = false, windForce = 0, windDirection = null, timeDomain = null, affectPlayerByDomain = false) {
    if (timeDomain && affectPlayerByDomain) playerDt *= timeDomain.timeFactorAt(motion.position);
    motion.aim = aimHeld; motion.castPhase = phase; motion.castStyle = skill?.archetype ?? shape;
    forward.set(Math.sin(motion.yaw), 0, -Math.cos(motion.yaw)); right.set(-forward.z, 0, forward.x);
    let x = (pressed.has('KeyD') || pressed.has('ArrowRight') ? 1 : 0) - (pressed.has('KeyA') || pressed.has('ArrowLeft') ? 1 : 0);
    let z = (pressed.has('KeyW') || pressed.has('ArrowUp') ? 1 : 0) - (pressed.has('KeyS') || pressed.has('ArrowDown') ? 1 : 0);
    const pads = navigator.getGamepads?.() || []; let pad = null; for (let i = 0; i < pads.length; i++) if (pads[i]) { pad = pads[i]; break; }
    if (pad) { x += Math.abs(pad.axes[0] || 0) > .12 ? pad.axes[0] : 0; z += Math.abs(pad.axes[1] || 0) > .12 ? -pad.axes[1] : 0; if (Math.abs(pad.axes[2] || 0) > .16) motion.yaw += pad.axes[2] * realDt * 2.2; if (Math.abs(pad.axes[3] || 0) > .16) motion.pitch = THREE.MathUtils.clamp(motion.pitch + pad.axes[3] * realDt * .8, -.02, .78); }
    const stick = Math.min(1, Math.hypot(x, z)); if (stick > .01) { x /= Math.max(1, Math.hypot(x, z)); z /= Math.max(1, Math.hypot(x, z)); }
    move.set(0, 0, 0).addScaledVector(right, x).addScaledVector(forward, z);
    const sprint = pressed.has('ShiftLeft') || pressed.has('ShiftRight') || (pad?.buttons?.[10]?.pressed ?? false); const topSpeed = sprint ? 8.2 : 5.1;
    motion.velocity.x = THREE.MathUtils.damp(motion.velocity.x, move.x * topSpeed, move.lengthSq() ? 8.5 : 5.5, playerDt);
    motion.velocity.z = THREE.MathUtils.damp(motion.velocity.z, move.z * topSpeed, move.lengthSq() ? 8.5 : 5.5, playerDt);
    if (motion.dash > 0) motion.dash = Math.max(0, motion.dash - realDt);
    if (!motion.grounded) motion.velocity.y -= 18 * playerDt;
    motion.position.addScaledVector(motion.velocity, playerDt);
    if (motion.position.y <= 0) { motion.position.y = 0; motion.velocity.y = 0; motion.grounded = true; }
    const radius = motion.arenaRadius, d = Math.hypot(motion.position.x, motion.position.z); if (d > radius) { const k = radius / d; motion.position.x *= k; motion.position.z *= k; motion.velocity.x *= .4; motion.velocity.z *= .4; }
    if (motion.aim && !motion.locked && move.lengthSq() < .02) { /* keep facing the camera while aiming */ }
    if (motion.locked) { targetDelta.copy(motion.locked.group.position).sub(motion.position); motion.yaw = Math.atan2(targetDelta.x, -targetDelta.z); }
    else if (move.lengthSq() > .02 && !motion.aim) motion.yaw = THREE.MathUtils.damp(motion.yaw, Math.atan2(move.x, -move.z), 9, playerDt);
    else if (motion.aim) motion.yaw = THREE.MathUtils.damp(motion.yaw, motion.yaw, 5, playerDt);
    if (move.lengthSq() > .01) motion.lastForward.copy(move).normalize();
    mage.rotation.y = motion.yaw;
    const headTarget = cameraTarget.set(motion.position.x, motion.position.y + 2.15, motion.position.z);
    const aimDist = motion.aim ? Math.min(motion.distance, 6.1) : motion.distance;
    const pitch = motion.pitch; cameraOffset.set(Math.sin(motion.yaw) * Math.cos(pitch) * aimDist, Math.sin(pitch) * aimDist + .22, Math.cos(motion.yaw) * Math.cos(pitch) * aimDist);
    desiredCamera.copy(headTarget).add(cameraOffset);
    cameraDirection.copy(cameraOffset).normalize(); camRay.set(headTarget, cameraDirection); cameraHits.length = 0; camRay.intersectObjects(colliders, false, cameraHits); let safeLength = aimDist; if (cameraHits.length && cameraHits[0].distance < safeLength) safeLength = Math.max(2.4, cameraHits[0].distance - .45);
    desiredCamera.copy(headTarget).addScaledVector(cameraDirection, safeLength);
    const smooth = 1 - Math.exp(-realDt * (cinematic ? 2.5 : 8.5)); camera.position.lerp(desiredCamera, smooth); camera.lookAt(headTarget.x + Math.sin(motion.yaw) * (motion.aim ? .45 : 0), headTarget.y + .12, headTarget.z - Math.cos(motion.yaw) * (motion.aim ? .45 : 0));
    updateReticle(camera, skill, motion.locked); updateModel(realDt, playerDt, color, phase, skill, windForce, windDirection);
    let echoBudget = timeDomain ? Math.max(0, timeDomain.afterimageCount || 0) : 0;
    for (const d of dummies) {
      const factor = timeDomain ? timeDomain.timeFactorAt(d.group.position) : 1;
      const localDt = Math.min(realDt * factor, timeDomain?.catchUpMaxStep ?? .05);
      d.motionTime += localDt;
      d.hit = Math.max(0, d.hit - localDt);
      d.goal.copy(d.base).add(d.impulse);
      d.group.position.lerp(d.goal, 1 - Math.exp(-localDt * 2.8));
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
  function castContext(skill, quality, mode = 'play') {
    const origin = new THREE.Vector3(); originAnchor.getWorldPosition(origin);
    const casterPosition = mage.position.clone(), casterForward = motion.aim ? new THREE.Vector3(Math.sin(motion.yaw), 0, -Math.cos(motion.yaw)) : motion.lastForward.clone();
    const archetype = ({ skyfall: 'Thiên giáng', colossal: 'Khổng lồ', barrage: 'Mưa đòn', vortex: 'Xoáy hội tụ', tornado: 'Siêu lốc', spatial: 'Không gian', timeDomain: 'Lĩnh vực thời gian', iceDomain: 'Lĩnh vực băng giá', bloodChainNet: 'Lồng xích huyết', elemental: 'Lĩnh vực nguyên tố' })[skill.archetype] || 'Lĩnh vực nguyên tố';
    const selfCentered = ['astralMindDominion'].includes(skill.shape);
    const aoeCenter = selfCentered ? casterPosition.clone() : aimTarget.clone(); aoeCenter.y = 0;
    return { origin, casterPosition, casterForward, target: aimTarget.clone(), targetNormal: new THREE.Vector3(0, 1, 0), aoeCenter, aoeScale: 1, lockedTarget: motion.locked?.group || null, quality, mode, archetype, maxRange: Math.max(18, skill.spread * 1.75) };
  }
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
  function reset() { pressed.clear(); rightHeld = false; motion.position.set(0, 0, 12); motion.velocity.set(0, 0, 0); motion.yaw = 0; motion.pitch = .2; motion.distance = 8.6; motion.arenaRadius = 58; motion.grounded = true; motion.locked = null; motion.dash = 0; motion.recovery = 0; motion.lastPhase = 'idle'; motion.lastForward.set(0, 0, -1); for (const d of dummies) { d.group.position.copy(d.base); d.impulse.set(0, 0, 0); d.hit = 0; d.motionTime = 0; d.echo.visible = false; d.bodyMesh.material = dummyMat; } }
  const systems = {
    mage, dummies, motion, aimTarget, get rangeExceeded() { return rangeExceeded; }, get locked() { return motion.locked; }, get aim() { return motion.aim; }, get distance() { return motion.distance; }, get colliders() { return colliders; },
    update, castContext, applyImpact, pullTargets, reset,
    toggleLock() { if (motion.locked) { motion.locked = null; return null; } const choices = dummies.map(d => ({ d, dist: d.group.position.distanceTo(mage.position) })).filter(x => x.dist < 70).sort((a, b) => a.dist - b.dist); motion.locked = choices[0]?.d || null; return motion.locked; },
    setAim(v) { rightHeld = v; },
    replaceModel(object3D, rig = {}) { modelRoot.clear(); modelRoot.add(object3D); object3D.position.y = object3D.position.y || 0; if (Array.isArray(rig.arms)) { arms.length = 0; arms.push(...rig.arms); } if (Array.isArray(rig.legs)) { legs.length = 0; legs.push(...rig.legs); } if (Array.isArray(rig.cape)) { cape.length = 0; cape.push(...rig.cape); } const anchor = rig.staffAnchor || object3D.getObjectByName?.('StaffCrystal'); if (anchor) { originAnchor = anchor; if (anchor.material?.color) crystal = anchor; } return mage; },
    onKeyDown(e) { pressed.add(e.code); if (e.code === 'Space' && motion.grounded) { motion.velocity.y = 7.5; motion.grounded = false; } if (e.code === 'KeyQ' && motion.grounded) { motion.dash = .24; motion.velocity.x += motion.lastForward.x * 13; motion.velocity.z += motion.lastForward.z * 13; } },
    onKeyUp(e) { pressed.delete(e.code); },
    onMouseMove(dx, dy, sensitivity = 1) { motion.yaw -= dx * .0022 * sensitivity; motion.pitch = THREE.MathUtils.clamp(motion.pitch + dy * .0018 * sensitivity, -.02, .78); },
    onWheel(delta) { motion.distance = THREE.MathUtils.clamp(motion.distance + Math.sign(delta) * .9, 4.4, 12.5); }, setArenaRadius(value) { motion.arenaRadius = THREE.MathUtils.clamp(value, 30, 82); },
    targetInfo: { target: aimTarget, dist: 0, maxRange: 18, exceeded: false },
    getTargetInfo(skill) { systems.targetInfo.dist = Math.min(aimDistance, Math.max(18, skill.spread * 1.75)); systems.targetInfo.maxRange = aimMaxRange; systems.targetInfo.exceeded = rangeExceeded; return systems.targetInfo; }
  };
  reset(); return systems;
}

