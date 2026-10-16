import * as THREE from 'three';

const clamp01 = value => Math.max(0, Math.min(1, value));
const smooth = (a, b, value) => {
  const t = clamp01((value - a) / Math.max(.0001, b - a));
  return t * t * (3 - 2 * t);
};

function makeSingularityMaterial(hex, spinSpeed) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSpin: { value: spinSpeed },
      uIntensity: { value: 1 },
      uTint: { value: new THREE.Color(hex) },
    },
    vertexShader: [
      'varying vec2 vUv;',
      'varying vec3 vNormalView;',
      'varying vec3 vPositionView;',
      'void main(){',
      '  vUv=uv;',
      '  vec4 mvPosition=modelViewMatrix*vec4(position,1.0);',
      '  vPositionView=mvPosition.xyz;',
      '  vNormalView=normalize(normalMatrix*normal);',
      '  gl_Position=projectionMatrix*mvPosition;',
      '}',
    ].join('\n'),
    fragmentShader: [
      'uniform float uTime;',
      'uniform float uSpin;',
      'uniform float uIntensity;',
      'uniform vec3 uTint;',
      'varying vec2 vUv;',
      'varying vec3 vNormalView;',
      'varying vec3 vPositionView;',
      'void main(){',
      '  float angle=vUv.x*6.2831853;',
      '  float latitude=(vUv.y-.5)*3.1415926;',
      '  float flow=sin(angle*9.0-latitude*5.0-uTime*uSpin+sin(latitude*13.0+uTime*2.0)*.65);',
      '  float filament=pow(max(0.0,flow),18.0);',
      '  float crossFlow=sin(angle*5.0+latitude*16.0-uTime*uSpin*.72);',
      '  float secondary=pow(max(0.0,crossFlow),22.0);',
      '  float equator=exp(-abs(latitude)*8.5);',
      '  float facing=max(dot(normalize(vNormalView),normalize(-vPositionView)),0.0);',
      '  float rim=pow(1.0-facing,2.2);',
      '  vec3 core=vec3(.004,.003,.012);',
      '  vec3 violet=vec3(.22,.035,.72);',
      '  vec3 blue=vec3(.035,.5,.92);',
      '  vec3 white=vec3(.8,.94,1.0);',
      '  vec3 color=core;',
      '  color+=violet*(.08+equator*.18);',
      '  color+=uTint*(filament*.48+secondary*.2);',
      '  color+=blue*(equator*.18+rim*.22);',
      '  color+=white*(filament*.22+secondary*.12+rim*.08);',
      '  gl_FragColor=vec4(color*uIntensity,1.0);',
      '}',
    ].join('\n'),
    toneMapped: false,
  });
}

function makeInfallMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uCenterY: { value: 1 },
      uHorizon: { value: .6 },
      uPull: { value: 0 },
      uOpacity: { value: 1 },
      uIntensity: { value: 1 },
      uSpin: { value: 46 },
    },
    vertexShader: [
      'attribute vec4 aData;',
      'attribute float aSize;',
      'uniform float uTime;',
      'uniform float uCenterY;',
      'uniform float uHorizon;',
      'uniform float uPull;',
      'uniform float uSpin;',
      'varying float vAlpha;',
      'varying float vHeat;',
      'void main(){',
      '  float phase=smoothstep(aData.w,aData.w+2.5,uTime)*uPull;',
      '  float angularSpeed=uSpin*(.14+aData.w*.012);',
      '  float angle=aData.x+uTime*angularSpeed+phase*uTime*1.9;',
      '  float radius=mix(aData.y,uHorizon*.78,phase);',
      '  float height=mix(aData.z,uCenterY,phase);',
      '  vec3 p=vec3(cos(angle)*radius,height,sin(angle)*radius);',
      '  vec4 mv=modelViewMatrix*vec4(p,1.0);',
      '  gl_Position=projectionMatrix*mv;',
      '  gl_PointSize=clamp(aSize*(220.0/max(1.0,-mv.z)),1.0,9.0);',
      '  float edgeFade=smoothstep(uHorizon*.84,uHorizon*1.55,radius);',
      '  vAlpha=(.52+.48*phase)*edgeFade;',
      '  vHeat=phase;',
      '}',
    ].join('\n'),
    fragmentShader: [
      'uniform float uOpacity;',
      'uniform float uIntensity;',
      'varying float vAlpha;',
      'varying float vHeat;',
      'void main(){',
      '  vec2 p=gl_PointCoord-.5;',
      '  float r=length(p);',
      '  if(r>.5)discard;',
      '  float glow=1.0-smoothstep(.06,.5,r);',
      '  float core=1.0-smoothstep(0.0,.16,r);',
      '  vec3 color=mix(vec3(.32,.12,.78),vec3(.24,.72,1.0),vHeat*.68);',
      '  color=mix(color,vec3(.72,.8,.92),core*.42);',
      '  float alpha=glow*vAlpha*uOpacity*uIntensity;',
      '  gl_FragColor=vec4(color,alpha);',
      '}',
    ].join('\n'),
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
}

function randomSource(seed) {
  let state = (Math.floor(seed * 1000003) ^ 0x85ebca6b) >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function createSpaceBlackHoleAttack(parent, index, hex, skill, config, callbacks, camera) {
  const settings = skill.spaceBlackHole;
  const quality = settings.pull.debrisByQuality[config.quality] ? config.quality : 'High';
  const aoeScale = THREE.MathUtils.clamp(config.aoeRadius / skill.aoe, .38, 1.6);
  const unit = 1 / settings.worldUnitsPerMeter;
  const areaRadius = settings.pull.maxRadius * unit * aoeScale;
  const horizonRadius = settings.blackHole.horizonRadius * unit * Math.sqrt(aoeScale);
  const centerY = settings.blackHole.centerHeight * unit;
  const spinSpeed = settings.blackHole.spinSpeed;
  const rng = randomSource(index + skill.aoe * 3.17);
  const root = new THREE.Group();
  parent.add(root);
  root.visible = false;

  // The singularity is the only large visual object: a compact, very fast-spinning sphere.
  const sphereMaterial = makeSingularityMaterial(hex, spinSpeed);
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(horizonRadius, 48, 32), sphereMaterial);
  sphere.position.y = centerY;
  root.add(sphere);

  const slabCount = Math.min(
    settings.pull.slabs,
    Math.round(settings.pull.slabs * Math.max(.5, config.qualityScale || 1)),
  );
  const slabGeometry = new THREE.BoxGeometry(1, 1, 1);
  const slabMaterial = new THREE.MeshStandardMaterial({
    color: 0x251b42,
    emissive: 0x563caa,
    emissiveIntensity: .22,
    metalness: .48,
    roughness: .38,
    transparent: true,
    opacity: .6,
    flatShading: true,
  });
  const slabs = new THREE.InstancedMesh(slabGeometry, slabMaterial, slabCount);
  slabs.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  root.add(slabs);
  const slabData = [];
  const slabDummy = new THREE.Object3D();
  for (let i = 0; i < slabCount; i++) {
    const angle = rng() * Math.PI * 2;
    const radius = areaRadius * (.28 + rng() * .68);
    const y = centerY + (rng() - .5) * 5.5;
    slabData.push({
      angle,
      radius,
      y,
      size: .18 + rng() * .48,
      wave: Math.floor(rng() * settings.waves.length),
      spin: .55 + rng() * .9,
      tilt: (rng() - .5) * 1.1,
    });
    slabDummy.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
    slabDummy.rotation.set(rng() * 1.2, rng() * Math.PI * 2, rng() * 1.2);
    slabDummy.scale.set(.3, .18, .42);
    slabDummy.updateMatrix();
    slabs.setMatrixAt(i, slabDummy.matrix);
  }

  const dustCount = Math.min(
    settings.pull.particlesByQuality[quality],
    Math.round(settings.pull.debrisByQuality[quality] * 20 * (config.qualityScale || 1)),
  );
  const dustGeometry = new THREE.BufferGeometry();
  const dustPositions = new Float32Array(dustCount * 3);
  const dustData = new Float32Array(dustCount * 4);
  const dustSizes = new Float32Array(dustCount);
  for (let i = 0; i < dustCount; i++) {
    const angle = rng() * Math.PI * 2;
    const radius = areaRadius * (.08 + Math.sqrt(rng()) * .9);
    const y = centerY + (rng() - .5) * 8;
    const start = 1.7 + rng() * 5.8;
    dustData.set([angle, radius, y, start], i * 4);
    dustSizes[i] = .55 + rng() * 2.4;
  }
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  dustGeometry.setAttribute('aData', new THREE.BufferAttribute(dustData, 4));
  dustGeometry.setAttribute('aSize', new THREE.BufferAttribute(dustSizes, 1));
  const dustMaterial = makeInfallMaterial();
  const dust = new THREE.Points(dustGeometry, dustMaterial);
  dust.frustumCulled = false;
  root.add(dust);

  const light = new THREE.Vector3(0, centerY, 0);
  const worldPoint = new THREE.Vector3();
  const cameraPose = { position: new THREE.Vector3(), target: new THREE.Vector3() };
  let currentTime = 0;
  let currentMood = 0;
  let currentFlash = 0;
  let currentPull = 0;
  let preSlow = false;
  let convergence = false;
  let lastWave = -1;

  function update(time, intensity = 1, density = 1, realDt = 0) {
    currentTime = Math.max(0, time);
    root.visible = currentTime < settings.totalDuration;
    if (!root.visible) return;

    const endFade = 1 - smooth(settings.totalDuration - 1.1, settings.totalDuration, currentTime);
    const waveLevels = settings.waves.map(wave => smooth(wave.start, wave.start + wave.duration, currentTime));
    currentPull = Math.max(...waveLevels) * (.28 + .72 * smooth(2.2, 13, currentTime));
    const activeWave = waveLevels.reduce(
      (best, value, waveIndex) => value > best.value ? { index: waveIndex, value } : best,
      { index: -1, value: 0 },
    );

    if (activeWave.index > lastWave && activeWave.value > .12 && activeWave.index < settings.waves.length - 1) {
      lastWave = activeWave.index;
      callbacks.triggerCameraShake({
        ...callbacks.plan,
        shake: callbacks.plan.shake * (.2 + activeWave.index * .1),
        shakeDuration: .48,
        shakeFrequency: 8 + activeWave.index,
        seed: callbacks.plan.seed + activeWave.index * 2.7,
      });
    }
    if (!preSlow && currentTime >= callbacks.plan.impactAt - callbacks.plan.preSlowDuration) {
      preSlow = true;
      callbacks.beginPreImpactSlowMotion(callbacks.plan);
    }
    if (!convergence && currentTime >= settings.convergence.start) {
      convergence = true;
      callbacks.beginImpactHitStop(callbacks.plan);
      callbacks.triggerCameraShake(callbacks.plan);
    }

    currentMood = .04 + currentPull * .5;
    currentFlash = waveLevels.reduce((sum, value, waveIndex) => Math.max(sum, value * (.02 + waveIndex * .015)), 0);

    sphereMaterial.uniforms.uTime.value = currentTime;
    sphereMaterial.uniforms.uSpin.value = spinSpeed;
    sphereMaterial.uniforms.uIntensity.value = intensity * .62;
    sphere.rotation.y = currentTime * spinSpeed;
    sphere.rotation.x = Math.sin(currentTime * 2.2) * .045;

    dustMaterial.uniforms.uTime.value = currentTime;
    dustMaterial.uniforms.uCenterY.value = centerY;
    dustMaterial.uniforms.uHorizon.value = horizonRadius;
    dustMaterial.uniforms.uPull.value = currentPull;
    dustMaterial.uniforms.uOpacity.value = endFade;
    dustMaterial.uniforms.uIntensity.value = intensity * Math.max(.35, density) * .52;
    dustMaterial.uniforms.uSpin.value = spinSpeed;

    const dummy = slabDummy;
    for (let i = 0; i < slabCount; i++) {
      const item = slabData[i];
      const wave = settings.waves[item.wave];
      const tug = smooth(wave.start, wave.start + wave.duration, currentTime);
      const angle = item.angle + currentTime * spinSpeed * (.13 + tug * .17) * item.spin;
      const radius = THREE.MathUtils.lerp(item.radius, horizonRadius * 1.1, tug);
      const y = THREE.MathUtils.lerp(item.y, centerY, tug);
      const absorbed = smooth(.76, 1, tug);
      const size = item.size * (1 - absorbed * .98);
      dummy.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
      dummy.rotation.set(item.tilt + currentTime * spinSpeed * .08, angle + currentTime * spinSpeed * .1, Math.sin(currentTime + item.angle) * .22);
      dummy.scale.set(size * 1.3, size * .25, size * .75);
      dummy.updateMatrix();
      slabs.setMatrixAt(i, dummy.matrix);
    }
    slabs.instanceMatrix.needsUpdate = true;
    slabMaterial.opacity = .52 * endFade;

    if (currentPull > .02 && callbacks.updateTargets && realDt > 0) {
      root.updateWorldMatrix(true, false);
      const center = root.localToWorld(worldPoint.set(0, centerY, 0));
      callbacks.updateTargets(center, areaRadius, currentPull, 0, realDt);
    }
  }

  function getWorldPoint(out) {
    root.updateWorldMatrix(true, false);
    return root.localToWorld(out.set(0, centerY, 0));
  }

  function cameraPoseAt() {
    const stage = currentTime < 4 ? 0 : currentTime < 8 ? 1 : currentTime < 13 ? 2 : 3;
    const angle = currentTime * .22 + stage * .64;
    const distance = Math.max(8.5, horizonRadius * (stage === 0 ? 17 : stage === 1 ? 14 : 12));
    const localPosition = new THREE.Vector3(
      Math.cos(angle) * distance,
      centerY + distance * (stage === 0 ? .28 : stage === 2 ? .4 : .33),
      Math.sin(angle) * distance,
    );
    const localTarget = new THREE.Vector3(0, centerY, 0);
    root.updateWorldMatrix(true, false);
    cameraPose.position.copy(root.localToWorld(localPosition));
    cameraPose.target.copy(root.localToWorld(localTarget));
    return cameraPose;
  }

  return {
    group: root,
    radius: areaRadius,
    update,
    cameraPose: cameraPoseAt,
    environmentMood: () => currentMood,
    flashLevel: () => currentFlash,
    distortionLevel: () => currentPull * settings.blackHole.lensingStrength * .28 + currentFlash * .12,
    vignetteLevel: () => currentPull * settings.convergence.vignette * .18,
    heatCenter: out => getWorldPoint(out),
    lensingRadius: () => .12 + currentPull * .025,
    lightPosition: () => light,
    cameraPull: () => currentPull * .025,
    runePulse: () => currentPull * (.45 + .08 * Math.sin(currentTime * spinSpeed * .08)) + (convergence ? currentFlash * .2 : 0),
  };
}