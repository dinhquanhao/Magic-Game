import * as THREE from 'three';

// Cyber Bot geometry/materials adapted from the user's model_3d_camera_360.zip,
// js/game.js buildCharacterModel('bot'). No uploaded renderer, input or RAF runs.
export function createCharacterModel() {
  const root = new THREE.Group(); root.name = 'UploadedCyberBot';
  const primary = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: .3, metalness: .6 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: .5, metalness: .5 });
  const glow = new THREE.MeshBasicMaterial({ color: 0x7dd3fc });
  const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: .65, depthWrite: false });
  const aura = new THREE.Mesh(new THREE.RingGeometry(.52, .65, 32), ringMaterial);
  aura.rotation.x = -Math.PI / 2; aura.position.y = .03; root.add(aura);
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(.18, .35, 4), glow);
  arrow.rotation.x = -Math.PI / 2; arrow.position.set(0, .06, -.78); root.add(arrow);
  // The supplied feet end at y=.09. Lower only the articulated body to ground it.
  const bodyRoot = new THREE.Group(); bodyRoot.position.y = -.09; root.add(bodyRoot);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(.72, .85, .44), primary);
  torso.name = 'BotTorso'; torso.position.y = 1.15; bodyRoot.add(torso);
  const pack = new THREE.Mesh(new THREE.BoxGeometry(.52, .62, .26), dark);
  pack.position.set(0, .05, .32); torso.add(pack);
  const thruster = new THREE.Mesh(new THREE.CylinderGeometry(.08, .11, .18, 12), glow);
  thruster.position.set(-.15, -.32, .32); torso.add(thruster);
  const secondThruster = thruster.clone(); secondThruster.position.x = .15; torso.add(secondThruster);
  const head = new THREE.Group(); head.name = 'BotHead'; head.position.set(0, .68, 0); torso.add(head);
  head.add(new THREE.Mesh(new THREE.BoxGeometry(.56, .48, .52), primary));
  const visor = new THREE.Mesh(new THREE.BoxGeometry(.46, .2, .12), glow);
  visor.position.set(0, .03, -.25); head.add(visor);
  const headTop = new THREE.Object3D(); headTop.name = 'HeadTop'; headTop.position.y = .24; head.add(headTop);
  const armGeometry = new THREE.BoxGeometry(.22, .68, .22); armGeometry.translate(0, -.26, 0);
  const legGeometry = new THREE.BoxGeometry(.25, .68, .26); legGeometry.translate(0, -.32, 0);
  const arms = [], legs = [], hands = [];
  for (const [i, side] of [-1, 1].entries()) {
    const arm = new THREE.Mesh(armGeometry, dark); arm.name = i ? 'RightArm' : 'LeftArm';
    arm.position.set(side * .5, .32, 0); torso.add(arm); arms.push(arm);
    const hand = new THREE.Object3D(); hand.name = i ? 'RightHand' : 'LeftHand';
    hand.position.y = -.6; arm.add(hand); hands.push(hand);
    const leg = new THREE.Mesh(legGeometry, dark); leg.name = i ? 'RightLeg' : 'LeftLeg';
    leg.position.set(side * .2, -.4, 0); torso.add(leg); legs.push(leg);
  }
  const castAnchor = new THREE.Object3D(); castAnchor.name = 'RaisedHandsCastOrigin';
  castAnchor.position.set(0, 2.08, -.05); root.add(castAnchor);
  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  let time = 0;
  function update(dt, motion, casting) {
    time += dt;
    const speed = Math.hypot(motion.velocity.x, motion.velocity.z);
    const swing = Math.sin(time * (speed > 7 ? 12 : 8)) * Math.min(1, speed / 5);
    for (let i = 0; i < 2; i++) {
      const sign = i ? -1 : 1;
      legs[i].rotation.x = casting ? 0 : motion.grounded ? swing * sign * .55 : sign * .4;
      arms[i].position.y = THREE.MathUtils.damp(arms[i].position.y, casting ? .48 : .32, 12, dt);
      arms[i].rotation.x = THREE.MathUtils.damp(arms[i].rotation.x, casting ? -Math.PI + .08 : -swing * sign * .44, 12, dt);
      arms[i].rotation.z = THREE.MathUtils.damp(arms[i].rotation.z, casting ? sign * -.18 : 0, 12, dt);
    }
    torso.position.y = 1.15 + (casting ? 0 : motion.grounded ? Math.abs(Math.cos(time * 8)) * .08 * Math.min(1, speed / 8.2) : .05);
    torso.rotation.x = casting ? 0 : -speed * .02;
    torso.rotation.z = 0;
  }
  function reset() { time = 0; torso.position.y = 1.15; torso.rotation.set(0, 0, 0); for (const part of [...arms, ...legs]) part.rotation.set(0, 0, 0); arms.forEach(arm => { arm.position.y = .32; }); }
  function dispose() {
    const geometries = new Set(), materials = new Set();
    root.traverse(o => { if (o.geometry) geometries.add(o.geometry); if (o.material) materials.add(o.material); });
    geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); root.removeFromParent();
  }
  return { root, arms, legs, hands, headTop, castAnchor, update, reset, dispose };
}
