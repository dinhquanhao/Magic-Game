import * as THREE from 'three';

const clamp = THREE.MathUtils.clamp;
const smooth01 = (value) => {
  const x = clamp(value, 0, 1);
  return x * x * (3 - 2 * x);
};

/** Reusable local time-scale query for anything that opts into a time domain. */
export function domainTimeScale(state, worldPosition) {
  if (!state?.active || !worldPosition) return 1;
  const distance = worldPosition.distanceTo(state.center);
  if (distance >= state.radius + state.edgeWidth) return 1;

  const catchUp = state.catchUp;
  if (state.time >= state.releaseStart) {
    const normalizedDistance = clamp(distance / Math.max(.001, state.radius), 0, 1);
    const releaseDistance = state.releaseOrder === 'center-out' ? normalizedDistance : 1 - normalizedDistance;
    const thawAt = state.releaseStart + state.releaseDuration * releaseDistance;
    const thaw = smooth01((state.time - thawAt) / .42);
    const released = THREE.MathUtils.lerp(state.minFactor, 1, thaw);
    const catchUpAge = state.time - thawAt - .12;
    const burst = catchUpAge > 0 && catchUpAge < catchUp.duration
      ? (catchUp.scale - 1) * Math.sin(Math.PI * catchUpAge / catchUp.duration)
      : 0;
    return clamp(released + burst, state.minFactor, catchUp.scale);
  }

  if (state.time < state.freezeStart) return 1;
  const rawSweep = (state.frontRadius + state.edgeWidth - distance) / (state.edgeWidth * 2);
  const swept = state.freezeEase === 'linear' ? clamp(rawSweep, 0, 1) : smooth01(rawSweep);
  return THREE.MathUtils.lerp(1, state.minFactor, swept);
}

function createShellMaterial(color, shellSettings) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uSilver: { value: new THREE.Color(0xc7d8d8) },
      uFresnel: { value: shellSettings.fresnel },
      uPatternRings: { value: shellSettings.patternRings },
      uTime: { value: 0 },
      uReveal: { value: 0 },
      uPulse: { value: 0 },
      uCrack: { value: 0 },
      uIntensity: { value: 1 }
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vView;
      varying vec3 vLocal;
      void main(){
        vUv=uv;
        vLocal=normalize(position);
        vec4 viewPosition=modelViewMatrix*vec4(position,1.0);
        vNormalView=normalize(normalMatrix*normal);
        vView=normalize(-viewPosition.xyz);
        gl_Position=projectionMatrix*viewPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform vec3 uSilver;
      uniform float uFresnel;
      uniform float uPatternRings;
      uniform float uTime;
      uniform float uReveal;
      uniform float uPulse;
      uniform float uCrack;
      uniform float uIntensity;
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vView;
      varying vec3 vLocal;
      void main(){
        vec3 n=normalize(vNormalView);
        float fresnel=pow(1.0-abs(dot(n,normalize(vView))),uFresnel);
        float latitude=abs(sin(vUv.y*75.398));
        float hourMarks=step(.955,fract(vUv.x*uPatternRings+sin(vUv.y*19.0)*.018));
        float fineMarks=step(.982,fract(vUv.x*96.0));
        float longitude=pow(max(0.0,sin(atan(vLocal.z,vLocal.x)*uPatternRings+uTime*.035)),36.0);
        float crackAngle=atan(vLocal.z,vLocal.x);
        float cracks=pow(max(0.0,cos(crackAngle*17.0+sin(vUv.y*31.0)*2.3)),72.0);
        cracks*=smoothstep(.015,.44,uCrack)*(0.35+0.65*sin(vUv.y*43.0+crackAngle*9.0));
        float pattern=(1.0-smoothstep(.0,.075,latitude))*.16+hourMarks*.19+fineMarks*.055+longitude*.1;
        float alpha=(.018+fresnel*.13+pattern*.12+uPulse*.11+cracks*.19)*uReveal;
        vec3 color=mix(uColor,uSilver,clamp(fresnel*.72+pattern*.35+uPulse*.55+cracks*.8,0.0,1.0));
        color*=.9+fresnel*.45+uPulse*.35+cracks*.65;
        if(alpha<.004)discard;
        gl_FragColor=vec4(color*uIntensity,clamp(alpha,0.0,.48));
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false
  });
}

function createWaveMaterial(color) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uAlpha: { value: 0 }, uIntensity: { value: 1 } },
    vertexShader: `varying vec3 vNormalView;varying vec3 vView;void main(){vec4 p=modelViewMatrix*vec4(position,1.0);vNormalView=normalize(normalMatrix*normal);vView=normalize(-p.xyz);gl_Position=projectionMatrix*p;}`,
    fragmentShader: `uniform vec3 uColor;uniform float uAlpha;uniform float uIntensity;varying vec3 vNormalView;varying vec3 vView;void main(){float f=pow(1.0-abs(dot(normalize(vNormalView),normalize(vView))),1.4);float a=(.018+f*.34)*uAlpha;if(a<.004)discard;gl_FragColor=vec4(uColor*uIntensity,a);}`,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    toneMapped: false
  });
}

function makeMotes(parent, count, radius, color) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    // Stratified spherical samples avoid clumps and keep a gentle floor-weighted density.
    const y = 1 - 2 * ((i + Math.random()) / count);
    const angle = i * 2.399963229728653 + Math.random() * .18;
    const radial = Math.sqrt(Math.max(0, 1 - y * y));
    const volume = Math.cbrt((i + Math.random()) / count);
    const floorBias = .78 + .22 * Math.sqrt((y + 1) * .5);
    const r = radius * volume * floorBias;
    positions.set([Math.cos(angle) * radial * r, y * r, Math.sin(angle) * radial * r], i * 3);
    seeds.set([Math.random(), Math.random(), Math.random()], i * 3);
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 3));
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(color) }, uReveal: { value: 0 }, uIntensity: { value: 1 } },
    vertexShader: `
      attribute vec3 aSeed;uniform float uTime;uniform float uReveal;uniform float uIntensity;varying float vAlpha;
      void main(){vec3 p=position;float t=uTime*(.018+aSeed.x*.018);p.x+=sin(t*2.0+aSeed.y*9.0)*.025;p.y+=sin(t*1.4+aSeed.z*11.0)*.03;p.z+=cos(t*1.8+aSeed.x*7.0)*.025;vAlpha=(.16+.32*pow(max(0.0,sin(uTime*.12+aSeed.y*22.0)),8.0))*uReveal*uIntensity;vec4 mv=modelViewMatrix*vec4(p,1.0);gl_PointSize=clamp(22.0/max(1.0,-mv.z),.65,2.3);gl_Position=projectionMatrix*mv;}
    `,
    fragmentShader: `uniform vec3 uColor;varying float vAlpha;void main(){float d=length(gl_PointCoord-.5)*2.0;float a=pow(max(0.0,1.0-d),2.0)*vAlpha;if(a<.012)discard;gl_FragColor=vec4(uColor,a);}`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  parent.add(points);
  return material;
}

function makeGroundRunes(parent, radius, color) {
  const group = new THREE.Group();
  group.position.y = .08;
  parent.add(group);
  const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .22, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  for (const fraction of [.42, .62, .78, .94]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * fraction, .018 + (1 - fraction) * .012, 5, 192), material.clone());
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
  }
  const marks = [];
  for (let i = 0; i < 48; i++) {
    const a = i * Math.PI * 2 / 48;
    const inner = radius * (i % 4 === 0 ? .82 : .89), outer = radius * .96;
    marks.push(new THREE.Vector3(Math.cos(a) * inner, 0, Math.sin(a) * inner));
    marks.push(new THREE.Vector3(Math.cos(a) * outer, 0, Math.sin(a) * outer));
  }
  const tickGeometry = new THREE.BufferGeometry().setFromPoints(marks);
  const ticks = new THREE.LineSegments(tickGeometry, new THREE.LineBasicMaterial({ color: 0xb9d5d4, transparent: true, opacity: .42, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  group.add(ticks);
  return group;
}

function makeShards(parent, count, radius, color) {
  const geometry = new THREE.IcosahedronGeometry(1, 0);
  const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.visible = false;
  mesh.frustumCulled = false;
  parent.add(mesh);
  const dummy = new THREE.Object3D();
  const shards = [];
  for (let i = 0; i < count; i++) {
    const y = 1 - 2 * ((i + .5) / count), a = i * 2.399963229728653;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const direction = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r).normalize();
    shards.push({ direction, size: .035 + (i % 7) * .014, spin: (i % 2 ? 1 : -1) * (.25 + (i % 5) * .09), seed: (i * 17 % 29) / 29 });
  }
  return { mesh, material, shards, dummy, radius };
}

export function createTimeDomainAttack(parent, index, color, skill, config, callbacks, camera) {
  const settings = skill.timeDomain;
  const unitsPerMeter = settings.worldUnitsPerMeter;
  const radius = Math.min(skill.spread * config.aoeScale, settings.domain.maxRadius / unitsPerMeter, settings.domain.shellHeight / unitsPerMeter);
  const centerY = Math.max(.12, radius * .1);
  const centerLocal = new THREE.Vector3(0, centerY, 0);
  const tint = 0x8ed5ca;
  const group = new THREE.Group();
  group.visible = false;
  parent.add(group);

  const shellMaterial = createShellMaterial(tint, settings.shell);
  const shell = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 40), shellMaterial);
  shell.position.copy(centerLocal);
  shell.scale.setScalar(radius);
  group.add(shell);

  const clock = new THREE.Group();
  clock.position.copy(centerLocal);
  group.add(clock);
  const clockRingMaterial = new THREE.MeshBasicMaterial({ color: 0xc4d5d1, transparent: true, opacity: .34, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  for (const fraction of [.32, .56, .79]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * fraction, Math.max(.018, radius * .0012), 5, 160), clockRingMaterial.clone());
    ring.rotation.x = Math.PI / 2;
    clock.add(ring);
  }
  const hands = [];
  for (let i = 0; i < settings.stasis.clockHands; i++) {
    const length = radius * (.42 + i * .15);
    const handMaterial = new THREE.MeshBasicMaterial({ color: i === 0 ? 0xd5e3da : tint, transparent: true, opacity: .56, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    const hand = new THREE.Mesh(new THREE.BoxGeometry(length, Math.max(.025, radius * .003), Math.max(.018, radius * .002)), handMaterial);
    hand.rotation.x = Math.PI / 2;
    hand.position.x = length * .5;
    clock.add(hand);
    hands.push(hand);
  }
  for (let i = 0; i < 24; i++) {
    const a = i * Math.PI * 2 / 24, inner = radius * .76, outer = radius * (i % 2 === 0 ? .83 : .79);
    const tick = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(Math.cos(a) * inner, 0, Math.sin(a) * inner),
      new THREE.Vector3(Math.cos(a) * outer, 0, Math.sin(a) * outer)
    ]);
    clock.add(new THREE.Line(tick, new THREE.LineBasicMaterial({ color: 0xd0dfda, transparent: true, opacity: .42, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })));
  }

  const groundRunes = makeGroundRunes(group, radius, tint);
  const waveGeometry = new THREE.SphereGeometry(1, 40, 24);
  const waveEvents = [
    { at: settings.chimes.first, radius: .08 },
    ...settings.chimes.expansion,
    ...Array.from({ length: settings.chimes.stasis.count }, (_, i) => ({ at: settings.chimes.stasis.start + i * settings.chimes.stasis.interval, radius: 1 })),
    { at: settings.chimes.finale.at, radius: 1 }
  ];
  const waves = waveEvents.map((event) => {
    const material = createWaveMaterial(tint);
    const mesh = new THREE.Mesh(waveGeometry, material);
    mesh.position.copy(centerLocal);
    mesh.visible = false;
    group.add(mesh);
    return { event, mesh, material };
  });

  const quality = String(config.quality || 'High').toLowerCase();
  const particleBudget = settings.stasis.particlesByQuality[quality] || settings.stasis.particlesByQuality.high;
  const motes = makeMotes(group, Math.min(settings.stasis.hardCap, Math.round(particleBudget * config.density)), radius, tint);
  const shardBudget = settings.shell.shardsByQuality[quality] || settings.shell.shardsByQuality.high;
  const shards = makeShards(group, Math.min(settings.shell.hardCap, Math.round(shardBudget * config.debrisDensity)), radius, 0xc8dcda);
  const light = new THREE.PointLight(tint, 0, Math.max(18, radius * 1.7), 2);
  light.position.copy(centerLocal);
  group.add(light);

  const state = {
    active: true, time: 0, center: new THREE.Vector3(), radius,
    edgeWidth: Math.max(.35, radius * settings.domain.edgeFraction), frontRadius: 0,
    freezeStart: 8, releaseStart: settings.chimes.finale.at,
    releaseDuration: 2.5, releaseOrder: settings.domain.releaseOrder, freezeEase: settings.domain.freezeEase,
    minFactor: settings.domain.minFreezeFactor,
    catchUp: settings.domain.catchUp
  };
  const screenCenter = new THREE.Vector3();
  let particleTime = 0, realCameraTime = 0, hitStopSent = false, crackStart = -1;
  let latestPulse = 0, latestPulseAt = -10;

  function updateCenter() {
    state.center.copy(group.localToWorld(centerLocal.clone()));
  }
  function timeFactorAt(worldPosition) {
    updateCenter();
    return domainTimeScale(state, worldPosition);
  }
  function waveAmount(time, event) {
    const age = time - event.at;
    if (age < 0 || age > .9) return 0;
    const p = age / .9;
    return Math.sin(Math.PI * p) * (1 - p * .22);
  }
  function frontAt(time) {
    let front = 0;
    for (const event of waveEvents.slice(1, 4)) {
      const p = smooth01((time - event.at) / .78);
      front = Math.max(front, radius * event.radius * p);
    }
    return front;
  }
  function cameraPose() {
    updateCenter();
    const t = state.time;
    let orbit = realCameraTime * .055;
    let distance = radius * 2.15;
    let height = radius * .52;
    if (t < 4.5) { distance = radius * .72; height = radius * .28; }
    else if (t < 8) { const p = smooth01((t - 4.5) / 3.5); distance = radius * (2.2 - p * .65); height = radius * (.55 + p * .24); }
    else if (t < settings.chimes.finale.at) { distance = radius * .68; height = radius * .24; orbit = realCameraTime * .075; }
    else { const p = smooth01((t - settings.chimes.finale.at) / 2.2); distance = radius * (.68 + p * 1.75); height = radius * (.24 + p * .62); }
    const position = state.center.clone().add(new THREE.Vector3(Math.cos(orbit) * distance, height, Math.sin(orbit) * distance));
    const target = state.center.clone();
    if (t < 4.5) target.y += radius * .34;
    return { position, target };
  }
  function screenRadius(activeCamera = camera) {
    updateCenter();
    const distance = activeCamera.position.distanceTo(state.center);
    if (distance <= radius * .92) return .98;
    const fov = THREE.MathUtils.degToRad(activeCamera.fov || 46);
    return clamp(radius / Math.max(.01, distance * Math.tan(fov * .5)), .12, .98);
  }
  function update(time, intensity = 1, density = 1, realDt = 0) {
    state.time = Math.max(0, time);
    realCameraTime += Math.max(0, realDt);
    updateCenter();
    const t = state.time;
    const expansion = smooth01((t - 4.5) / settings.domain.expandDuration);
    const stasis = smooth01((t - 7.8) / .45) * (1 - smooth01((t - settings.chimes.finale.at - 2.5) / .45));
    state.frontRadius = frontAt(t);
    const crack = smooth01((t - settings.chimes.finale.at) / settings.shell.crackDuration);
    if (t >= settings.chimes.finale.at && crackStart < 0) crackStart = t;
    const hitStopAt = settings.hitStop.at === 'shellCrack'
      ? settings.chimes.finale.at
      : settings.chimes.stasis.start + (settings.chimes.stasis.count - 1) * settings.chimes.stasis.interval;
    if (!hitStopSent && t >= hitStopAt) {
      hitStopSent = true;
      if (settings.hitStop.enabled && !config.reducedMotion) {
        callbacks.beginImpactHitStop?.(callbacks.plan);
        callbacks.triggerCameraShake?.({ ...callbacks.plan, shake: .38, shakeDuration: .42, shakeFrequency: 19, seed: index * .73 + 2 });
      }
    }
    const preSlowAt = settings.chimes.finale.at - settings.slowMotion.duration;
    if (!callbacks._preSlowSent && t >= preSlowAt) {
      callbacks._preSlowSent = true;
      callbacks.beginPreImpactSlowMotion?.(callbacks.plan);
    }

    shellMaterial.uniforms.uTime.value = t;
    shellMaterial.uniforms.uReveal.value = smooth01((t - 4.35) / .58) * (1 - smooth01((t - 14.8) / 3.2));
    shell.scale.setScalar(radius * Math.max(.002, expansion));
    shellMaterial.uniforms.uCrack.value = crack;
    shellMaterial.uniforms.uIntensity.value = intensity * (.72 + stasis * .2);
    latestPulse = 0;
    for (let i = 0; i < waveEvents.length; i++) {
      const event = waveEvents[i];
      const age = t - event.at;
      const p = age >= 0 ? smooth01(age / .76) : 0;
      const alpha = waveAmount(t, event) * (i === waveEvents.length - 1 ? .72 : .58);
      const wave = waves[i];
      wave.mesh.visible = alpha > .006;
      wave.mesh.scale.setScalar(Math.max(.001, radius * event.radius * p));
      wave.material.uniforms.uAlpha.value = alpha * intensity * (config.reducedMotion ? .45 : 1);
      wave.material.uniforms.uIntensity.value = intensity;
      if (alpha > latestPulse) { latestPulse = alpha; latestPulseAt = t; }
    }
    const chimeFlash = Math.max(0, 1 - (t - latestPulseAt) / .72) * latestPulse;
    motes.uniforms.uTime.value = particleTime;
    motes.uniforms.uReveal.value = smooth01((t - 4.3) / .8) * (1 - smooth01((t - 15.1) / 2.4));
    motes.uniforms.uIntensity.value = intensity * (.34 + stasis * .4 + chimeFlash * .38);
    const localMotion = t < 8 ? 1 : t < settings.chimes.finale.at ? settings.stasis.microMotion : t < settings.chimes.finale.at + 2.5 ? 1.25 : .55;
    particleTime += Math.max(0, realDt) * config.speed * localMotion;

    clock.rotation.y += realDt * settings.stasis.clockRotation * (1 - stasis + stasis * settings.runeTower.slowFactor);
    clock.rotation.x = Math.sin(realCameraTime * .1) * .015;
    hands.forEach((hand, i) => {
      hand.rotation.y = particleTime * (.035 + i * .011) + Math.floor(t / 1.06) * (Math.PI / (i + 2));
      hand.material.opacity = (.38 + chimeFlash * .3) * (1 - crack * .34);
    });
    groundRunes.rotation.y += realDt * settings.runeTower.groundRotation * (.12 + stasis * .15);
    groundRunes.children.forEach((ring, i) => { if (ring.material?.opacity !== undefined) ring.material.opacity = (.15 + chimeFlash * .16) * (1 - crack * .7) * intensity; });

    const shardProgress = crack;
    shards.mesh.visible = shardProgress > .015;
    shards.material.opacity = (1 - smooth01((t - settings.chimes.finale.at - .65) / 1.2)) * .48 * intensity;
    if (shards.mesh.visible) {
      for (let i = 0; i < shards.shards.length; i++) {
        const shard = shards.shards[i], start = shard.direction.clone().multiplyScalar(radius);
        const drift = shardProgress * (1.1 + shard.seed * 2.4);
        const pos = start.addScaledVector(shard.direction, drift).add(new THREE.Vector3(0, shardProgress * shardProgress * (.7 + shard.seed), 0));
        shards.dummy.position.copy(centerLocal).add(pos);
        shards.dummy.rotation.set(shard.seed * 5 + shardProgress * shard.spin, shard.seed * 8 + shardProgress * shard.spin * 1.3, shardProgress * shard.spin);
        shards.dummy.scale.set(shard.size, shard.size * (.25 + shard.seed * .65), shard.size * .08);
        shards.dummy.updateMatrix();
        shards.mesh.setMatrixAt(i, shards.dummy.matrix);
      }
      shards.mesh.instanceMatrix.needsUpdate = true;
    }
    light.intensity = (.55 + expansion * .35 + stasis * .55 + chimeFlash * 1.2) * intensity * (1 - crack * .55);
    light.color.setHex(0x9accc4);
    light.position.copy(centerLocal);
    group.visible = t >= 1.85 && t <= settings.totalDuration;
    return { expansion, stasis, crack, chime: chimeFlash };
  }

  const attack = {
    group,
    update,
    cameraPose,
    screenRadius,
    heatCenter(target) { updateCenter(); return target.copy(state.center); },
    lightPosition() { return state.center; },
    timeFactorAt,
    runeTowerTimeScale() { return state.time >= 8 && state.time < settings.chimes.finale.at ? settings.runeTower.slowFactor : 1; },
    stasisLevel() { return state.time < 7.8 ? 0 : state.time < settings.chimes.finale.at ? 1 : 1 - smooth01((state.time - settings.chimes.finale.at) / 2.5); },
    distortionLevel() { return Math.max(0, latestPulse * .26 + (crackStart >= 0 ? .12 * (1 - smooth01((state.time - crackStart) / .8)) : 0)); },
    vignetteLevel() { return attack.stasisLevel() * .075; },
    runePulse() { return latestPulse; },
    afterimageCount: settings.stasis.afterimageCount[quality] || 0,
    catchUpMaxStep: settings.domain.catchUp.maxStep,
    get reducedMotion() { return !!config.reducedMotion; },
    environmentMood() { return attack.stasisLevel() * .38; },
    flashLevel() { return latestPulse; },
    domainState: state,
    radius
  };
  return attack;
}
