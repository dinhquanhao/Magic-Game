import { getSkillAreaRadius } from './skill-area.js';
import * as THREE from 'three';

const QUALITY_RAYS = Object.freeze({ Low: 2000, Medium: 2800, High: 4200, Ultra: 5500 });
const WAVES = Object.freeze([
  { name: 'scatter', share: 0.05, start: 2.55, spread: 0.95 },
  { name: 'concentric', share: 0.15, start: 4.35, spread: 0.95 },
  { name: 'sweep', share: 0.20, start: 6.15, spread: 1.05 },
  { name: 'carpet', share: 0.35, start: 8.10, spread: 1.15 },
  { name: 'finale', share: 0.25, start: 10.85, spread: 0.12 }
]);
const GOLD = 0xffe7a3;
const WARM = 0xffc95f;

function hash(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

function chooseWaveCounts(total, waves) {
  const counts = waves.map(wave => Math.floor(total * wave.share));
  counts[counts.length - 1] += total - counts.reduce((sum, value) => sum + value, 0);
  return counts;
}

function sampleGround(pattern, localIndex, localCount, radius, seed) {
  const u = (localIndex + 0.5) / Math.max(1, localCount);
  if (pattern === 'carpet') {
    const side = Math.ceil(Math.sqrt(localCount));
    const x = ((localIndex % side) + 0.12 + hash(seed + 3) * 0.76) / side * 2 - 1;
    const z = (Math.floor(localIndex / side) + 0.12 + hash(seed + 9) * 0.76) / side * 2 - 1;
    const r = Math.min(1, Math.hypot(x, z));
    const angle = Math.atan2(z, x);
    const d = radius * (0.07 + 0.93 * Math.sqrt(u)) * r;
    return [Math.cos(angle) * d, Math.sin(angle) * d];
  }
  if (pattern === 'concentric') {
    const bands = Math.max(7, Math.round(Math.sqrt(localCount) * 0.72));
    const band = Math.floor(u * bands);
    const inBand = Math.floor(localIndex / bands);
    const bandCount = Math.ceil(localCount / bands);
    const angle = (inBand / bandCount) * Math.PI * 2 + band * 0.24 + (hash(seed + 5) - 0.5) * 0.055;
    const d = radius * (0.14 + 0.84 * (band + 0.5) / bands);
    return [Math.cos(angle) * d, Math.sin(angle) * d];
  }
  const d = radius * (0.055 + 0.945 * Math.pow(u, 0.76));
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const angle = pattern === 'sweep'
    ? localIndex * goldenAngle * 1.7 + d / radius * 8.6 + (hash(seed + 2) - 0.5) * 0.26
    : localIndex * goldenAngle + (hash(seed + 2) - 0.5) * (pattern === 'finale' ? 0.16 : 0.62);
  return [Math.cos(angle) * d, Math.sin(angle) * d];
}

function makeInstancedQuad(count, attributes) {
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -0.5, 0, 0,  0.5, 0, 0,  -0.5, 1, 0,
    -0.5, 1, 0,  0.5, 0, 0,   0.5, 1, 0
  ], 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([
    0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1
  ], 2));
  for (const [name, array, size] of attributes) {
    geometry.setAttribute(name, new THREE.InstancedBufferAttribute(array, size));
  }
  geometry.instanceCount = count;
  return geometry;
}

function makeBeamMaterial(hex) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uSkyHeight: { value: 28 }, uIntensity: { value: 1 }, uDensity: { value: 1 }, uDetail: { value: 1 }, uTint: { value: new THREE.Color(hex) } },
    vertexShader: `
      attribute vec2 aGround;
      attribute vec4 aMotion;
      attribute vec2 aTilt;
      attribute vec4 aStyle;
      uniform float uTime;
      uniform vec3 uTint;
      uniform float uSkyHeight;
      varying vec2 vUv;
      varying float vLife;
      varying float vBrightness;
      varying float vWarmth;
      varying float vSeed;
      void main(){
        float localTime=uTime-aMotion.x;
        float rayActive=step(0.0,localTime);
        float fallDuration=max(0.08,aMotion.y);
        float descent=clamp(localTime/fallDuration,0.0,1.0);
        float eased=descent*descent*(3.0-2.0*descent);
        float impactAge=max(0.0,localTime-fallDuration);
        float linger=max(0.0,1.0-smoothstep(aStyle.w*0.48,aStyle.w,impactAge));
        float fallLength=aMotion.z*eased;
        float beamLength=mix(fallLength,aMotion.z,step(fallDuration,localTime));
        beamLength*=mix(1.0,linger,step(fallDuration,localTime));
        float y=localTime<fallDuration ? aMotion.z*(1.0-eased)+position.y*fallLength : position.y*beamLength;
        float width=aMotion.w*(.52+.48*smoothstep(0.0,.22,position.y))*(1.0+0.10*sin(uTime*13.0+aStyle.z));
        vec3 p=vec3(aGround.x+aTilt.x*(aMotion.z-y),y,aGround.y+aTilt.y*(aMotion.z-y));
        vUv=uv;
        vLife=rayActive*max(0.0,localTime);
        vBrightness=aStyle.x*rayActive*(localTime<fallDuration?1.0:linger);
        vWarmth=aStyle.y;
        vSeed=aStyle.z;
        vec4 mv=modelViewMatrix*vec4(p,1.0);
        mv.x+=position.x*width;
        gl_Position=projectionMatrix*mv;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uIntensity;
      uniform float uDensity;
      uniform float uDetail;
      uniform vec3 uTint;
      varying vec2 vUv;
      varying float vLife;
      varying float vBrightness;
      varying float vWarmth;
      varying float vSeed;
      void main(){
        float x=abs(vUv.x-.5);
        float softEdge=1.0-smoothstep(.12,.5,x);
        float goldSleeve=1.0-smoothstep(.09,.29,x);
        float hotCore=1.0-smoothstep(.018,.105,x);
        float pointedHead=1.0-smoothstep(0.0,.12,vUv.y);
        float headHalo=exp(-pow(vUv.y/.055,2.0))*exp(-pow(x/.42,2.0));
        float headCore=exp(-pow(vUv.y/.022,2.0))*exp(-pow(x/.22,2.0));
        float dissolvingTail=1.0-smoothstep(.76,1.0,vUv.y)*.76;
        float trailEnvelope=smoothstep(.012,.095,vUv.y)*(1.0-smoothstep(.56,.9,vUv.y));
        float softTrail=exp(-pow(x/.42,2.0))*trailEnvelope;
        float flow=.62+.38*sin(vUv.y*mix(24.0,58.0,uDetail)-uTime*14.0+vSeed*31.0);
        float flicker=mix(.97,.93+.07*sin(uTime*19.0+vSeed*91.0),uDetail);
        float alpha=((softEdge*.20*uDensity+goldSleeve*.40+hotCore*.78)*(.45+pointedHead*.55)+headHalo*.48+headCore*.82+softTrail*.095*uDensity)*dissolvingTail*flow*flicker*vBrightness*uIntensity;
        vec3 gold=mix(vec3(1.0,.73,.24),uTint,vWarmth*.66);
        vec3 color=gold*(.52+goldSleeve*.72)+vec3(1.0,.97,.84)*(hotCore*1.75+headCore*2.4+headHalo*.65);
        color+=vec3(1.0,.84,.52)*softTrail*.16;
        color=mix(color,vec3(.70,.91,1.0),smoothstep(.92,1.0,vWarmth)*.08);
        gl_FragColor=vec4(color,clamp(alpha,0.0,.92));
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    toneMapped: false
  });
}

function makeGate(parent, radius, height, hex) {
  const group = new THREE.Group();
  group.position.y = height;
  parent.add(group);
  const ringGeometry = new THREE.TorusGeometry(1, 0.012, 5, 180);
  const ringMaterial = new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const rings = [];
  for (const [scale, direction] of [[1, 1], [0.76, -1], [0.48, 1]]) {
    const mesh = new THREE.Mesh(ringGeometry, ringMaterial);
    mesh.rotation.x = Math.PI / 2;
    mesh.scale.setScalar(radius * scale);
    mesh.userData.spinDirection = direction;
    group.add(mesh);
    rings.push(mesh);
  }
  const tickPositions = [];
  for (let i = 0; i < 64; i++) {
    const angle = i / 64 * Math.PI * 2;
    const outer = radius * (0.88 + (i % 4 === 0 ? 0.09 : 0));
    const inner = outer - (i % 4 === 0 ? radius * 0.035 : radius * 0.012);
    tickPositions.push(Math.cos(angle) * inner, 0, Math.sin(angle) * inner, Math.cos(angle) * outer, 0, Math.sin(angle) * outer);
  }
  const tickGeometry = new THREE.BufferGeometry();
  tickGeometry.setAttribute('position', new THREE.Float32BufferAttribute(tickPositions, 3));
  const ticks = new THREE.LineSegments(tickGeometry, new THREE.LineBasicMaterial({ color: 0xfff5d6, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  group.add(ticks);
  return { group, rings, ringMaterial, ticks, radius };
}

function makeGatePoints(parent, count, radius, height) {
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const r = radius * Math.sqrt((i + 0.5) / count);
    const angle = i * Math.PI * (3 - Math.sqrt(5));
    positions.set([Math.cos(angle) * r, height, Math.sin(angle) * r], i * 3);
    seeds[i] = hash(i + 25) * 100;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(0xfff0c4) }, uIntensity: { value: 1 }, uOpacity: { value: 0 } },
    vertexShader: `attribute float aSeed;uniform float uTime;uniform float uIntensity;uniform float uOpacity;varying float vAlpha;void main(){vec3 p=position;p.y+=sin(uTime*1.5+aSeed)*.08;vec4 mv=modelViewMatrix*vec4(p,1.0);float pulse=.32+.68*abs(sin(uTime*2.0+aSeed*1.7));vAlpha=pulse*uIntensity*uOpacity;gl_PointSize=clamp((1.6+3.4*pulse)*52.0/max(1.0,-mv.z),1.0,16.0);gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `uniform vec3 uColor;varying float vAlpha;void main(){float d=length(gl_PointCoord-.5)*2.0;float a=pow(max(0.0,1.0-d),2.2)*vAlpha;if(a<.025)discard;gl_FragColor=vec4(uColor*1.7,a);}`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  parent.add(points);
  return { points, material };
}

function makeGroundEffects(parent, rays) {
  const sparkCount = Math.min(10000, rays.length * 2);
  const sparkImpact = new Float32Array(sparkCount * 4);
  const sparkMotion = new Float32Array(sparkCount * 4);
  for (let i = 0; i < sparkCount; i++) {
    const ray = rays[Math.floor(i / 2)];
    const seed = hash(i + 503);
    sparkImpact.set([ray.x, ray.z, ray.launch + ray.fall, seed], i * 4);
    sparkMotion.set([seed * Math.PI * 2, 0.6 + hash(i + 89) * 2.8, 0.42 + seed * 0.7, 1.2 + hash(i + 1009) * 2.8], i * 4);
  }
  const sparkGeometry = new THREE.BufferGeometry();
  sparkGeometry.setAttribute('aImpact', new THREE.BufferAttribute(sparkImpact, 4));
  sparkGeometry.setAttribute('aSpark', new THREE.BufferAttribute(sparkMotion, 4));
  const sparkMaterial = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uIntensity: { value: 1 } },
    vertexShader: `attribute vec4 aImpact;attribute vec4 aSpark;uniform float uTime;uniform float uIntensity;varying float vAlpha;varying float vSeed;void main(){float age=uTime-aImpact.z;float life=clamp(age/.92,0.0,1.0);float alive=step(0.0,age)*(1.0-step(.92,age));float distance=aSpark.y*life;vec3 p=vec3(aImpact.x+cos(aSpark.x)*distance,.08+age*aSpark.y*1.15-age*age*2.15,aImpact.y+sin(aSpark.x)*distance);vAlpha=alive*(1.0-life)*aSpark.z*uIntensity;vSeed=aSpark.x;vec4 mv=modelViewMatrix*vec4(p,1.0);gl_PointSize=clamp(aSpark.w*38.0/max(1.0,-mv.z),1.0,20.0);gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `varying float vAlpha;varying float vSeed;void main(){float d=length(gl_PointCoord-.5)*2.0;float a=pow(max(0.0,1.0-d),2.4)*vAlpha;if(a<.025)discard;vec3 c=mix(vec3(1.0,.68,.22),vec3(1.0,.98,.83),.55+.45*sin(vSeed));gl_FragColor=vec4(c*1.8,a);}`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false
  });
  const sparks = new THREE.Points(sparkGeometry, sparkMaterial);
  sparks.frustumCulled = false;
  parent.add(sparks);

  const markCount = Math.ceil(rays.length / 4);
  const impact = new Float32Array(markCount * 4);
  const size = new Float32Array(markCount);
  for (let i = 0; i < markCount; i++) {
    const ray = rays[i * 4];
    const seed = hash(i + 701);
    impact.set([ray.x, ray.z, ray.launch + ray.fall, seed], i * 4);
    size[i] = 0.28 + seed * 0.62;
  }
  const decalGeometry = makeInstancedQuad(markCount, [['aImpact', impact, 4], ['aSize', size, 1]]);
  const decalMaterial = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uIntensity: { value: 1 } },
    vertexShader: `attribute vec4 aImpact;attribute float aSize;uniform float uTime;uniform float uIntensity;varying vec2 vUv;varying float vAge;varying float vSeed;void main(){float age=uTime-aImpact.z;float alive=step(0.0,age);float expand=min(1.0,age/.22);float fade=max(0.0,1.0-age/2.8);float r=aSize*(.15+expand*.85);vec3 p=vec3(aImpact.x+position.x*r,.035,aImpact.y+position.y*r);vUv=uv;vAge=alive*fade*uIntensity;vSeed=aImpact.w;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}`,
    fragmentShader: `varying vec2 vUv;varying float vAge;varying float vSeed;void main(){vec2 p=vUv*2.0-1.0;float r=length(p);float a=atan(p.y,p.x);float ring=1.0-smoothstep(.018,.095,abs(r-(.42+.035*sin(a*7.0+vSeed*8.0))));float spoke=pow(max(0.0,cos(a*(5.0+floor(vSeed*4.0))+vSeed*8.0)),42.0);float cracks=smoothstep(.82,.97,abs(sin(a*11.0+sin(r*17.0+vSeed*9.0))));float edge=1.0-smoothstep(.92,1.0,r);float alpha=vAge*edge*(ring*.48+spoke*.18+cracks*.14);if(alpha<.018)discard;gl_FragColor=vec4(vec3(1.0,.78,.38)*(1.0+spoke),alpha);}`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false
  });
  const decals = new THREE.Mesh(decalGeometry, decalMaterial);
  decals.frustumCulled = false;
  parent.add(decals);
  return { sparks, sparkMaterial, decals, decalMaterial };
}

export function createLightRayRainAttack(parent, index, hex, skill, config, callbacks) {
  const group = new THREE.Group();
  parent.add(group);
  group.visible = false;
  const radius = getSkillAreaRadius(skill, config.aoeRadius);
  const quality = config.quality || 'High';
  const rayConfig = skill.rays;
  const count = Math.min(rayConfig.hardCap, rayConfig.totalByQuality[quality] || QUALITY_RAYS.High);
  const sourceHeight = Math.max(rayConfig.lengthRange[1] / 16, radius * 1.42);
  const waves = rayConfig.waves?.length === 5 ? rayConfig.waves : WAVES;
  const waveCounts = chooseWaveCounts(count, waves);
  const ground = new Float32Array(count * 2);
  const motion = new Float32Array(count * 4);
  const tilt = new Float32Array(count * 2);
  const style = new Float32Array(count * 4);
  const rayData = [];
  let cursor = 0;
  for (let waveIndex = 0; waveIndex < waves.length; waveIndex++) {
    const wave = waves[waveIndex];
    const waveCount = waveCounts[waveIndex];
    for (let localIndex = 0; localIndex < waveCount; localIndex++, cursor++) {
      const seed = cursor + waveIndex * 17003;
      const [x, z] = sampleGround(wave.name, localIndex, waveCount, radius, seed);
      const qualityMix = hash(seed + 61);
      const lengthWorld = rayConfig.lengthRange[0] + (rayConfig.lengthRange[1] - rayConfig.lengthRange[0]) * (0.18 + qualityMix * 0.82);
      const length = lengthWorld / 16;
      const widthWorld = rayConfig.widthRange[0] + (rayConfig.widthRange[1] - rayConfig.widthRange[0]) * Math.pow(hash(seed + 77), 2.4);
      const width = Math.max(0.018, widthWorld / 16);
      const speed = rayConfig.descentSpeedRange[0] + hash(seed + 91) * (rayConfig.descentSpeedRange[1] - rayConfig.descentSpeedRange[0]);
      const rawFall = lengthWorld / speed;
      const fall = waveIndex === 4 ? Math.min(1.18, Math.max(0.72, rawFall)) : Math.max(0.52, Math.min(1.55, rawFall));
      let launch = wave.start + hash(seed + 11) * wave.spread;
      if (waveIndex === 4) launch = Math.max(wave.start, rayConfig.finaleImpactAt - fall + (hash(seed + 13) - 0.5) * 0.08);
      const brightness = 0.72 + hash(seed + 17) * 0.48 + waveIndex * 0.08;
      const warmth = hash(seed + 29) > 0.94 ? 1.0 : 0.2 + hash(seed + 31) * 0.68;
      const angle = (hash(seed + 41) - 0.5) * rayConfig.angleJitterDeg * Math.PI / 180;
      const azimuth = hash(seed + 47) * Math.PI * 2;
      const slope = Math.tan(angle);
      ground.set([x, z], cursor * 2);
      motion.set([launch, fall, length, width], cursor * 4);
      tilt.set([Math.cos(azimuth) * slope, Math.sin(azimuth) * slope], cursor * 2);
      style.set([brightness, warmth, hash(seed + 53) * 100, rayConfig.lingerTime[0] + hash(seed + 57) * (rayConfig.lingerTime[1] - rayConfig.lingerTime[0])], cursor * 4);
      rayData.push({ x, z, launch, fall, wave: waveIndex });
    }
  }

  const beamGeometry = makeInstancedQuad(count, [['aGround', ground, 2], ['aMotion', motion, 4], ['aTilt', tilt, 2], ['aStyle', style, 4]]);
  const beamMaterial = makeBeamMaterial(hex);
  beamMaterial.uniforms.uSkyHeight.value = sourceHeight;
  beamMaterial.uniforms.uDetail.value = { Low: 0.56, Medium: 0.74, High: 0.9, Ultra: 1 }[quality] || 0.9;
  const beams = new THREE.Mesh(beamGeometry, beamMaterial);
  beams.frustumCulled = false;
  group.add(beams);

  const gate = makeGate(group, radius * 0.96, sourceHeight, hex);
  const gateLights = makeGatePoints(group, Math.min(1800, Math.max(420, Math.round(count * 0.34))), radius * 0.92, sourceHeight);
  const groundEffects = makeGroundEffects(group, rayData);
  const aftershocks = [];
  const shockGeometry = new THREE.TorusGeometry(1, 0.035, 6, 160);
  for (let i = 0; i < 3; i++) {
    const material = new THREE.MeshBasicMaterial({ color: i === 1 ? 0xfff9e8 : GOLD, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    const ring = new THREE.Mesh(shockGeometry, material);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.07 + i * 0.018;
    group.add(ring);
    aftershocks.push({ ring, material, start: 12.35 + i * 0.72, duration: 1.45 + i * 0.18 });
  }

  const cameraCenter = new THREE.Vector3();
  const cameraPose = { position: new THREE.Vector3(), target: new THREE.Vector3() };
  let currentTime = 0;
  let lastWaveShake = -1;
  let preSlowTriggered = false;
  let finaleImpactTriggered = false;
  const waveImpactTimes = [3.74, 5.55, 7.48, 9.52, rayConfig.finaleImpactAt];
  const waveShake = [0.12, 0.22, 0.38, 0.62, 1.28];

  function update(time, intensity = 1, density = 1) {
    const t = Math.max(0, time * skill.pace);
    currentTime = t;
    group.visible = t > 0.03 && t < rayConfig.totalDuration;
    beamMaterial.uniforms.uTime.value = t;
    beamMaterial.uniforms.uIntensity.value = intensity;
    beamMaterial.uniforms.uDensity.value = density;
    gateLights.material.uniforms.uTime.value = t;
    gateLights.material.uniforms.uIntensity.value = intensity * (config.reducedMotion ? 0.72 : 1);
    groundEffects.sparkMaterial.uniforms.uTime.value = t;
    groundEffects.sparkMaterial.uniforms.uIntensity.value = intensity * (config.reducedMotion ? 0.7 : 1);
    groundEffects.decalMaterial.uniforms.uTime.value = t;
    groundEffects.decalMaterial.uniforms.uIntensity.value = intensity * (config.reducedMotion ? 0.68 : 1);

    const gateOpen = THREE.MathUtils.smoothstep(t, 0.38, 2.1);
    const gateFade = 1 - THREE.MathUtils.smoothstep(t, 12.8, 16.2);
    gateLights.material.uniforms.uOpacity.value = gateOpen * gateFade;
    gate.ringMaterial.opacity = (0.2 + 0.58 * gateOpen) * gateFade * intensity;
    gate.ticks.material.opacity = (0.14 + 0.55 * gateOpen) * gateFade * intensity;
    gate.rings.forEach((ring, i) => {
      ring.rotation.y += 0.003 * ring.userData.spinDirection * (i + 1);
      const pulse = 0.985 + 0.015 * Math.sin(t * (2.1 + i * 0.35) + i);
      ring.scale.setScalar(radius * [1, 0.76, 0.48][i] * pulse * (0.76 + gateOpen * 0.24));
    });
    const compression = Math.max(0, 1 - Math.abs(t - 2.38) / 0.36);
    gate.group.scale.set(1 - compression * 0.1, 1, 1 - compression * 0.1);

    for (let i = 0; i < waveImpactTimes.length; i++) {
      if (i <= lastWaveShake || t < waveImpactTimes[i]) continue;
      lastWaveShake = i;
      callbacks.triggerCameraShake({ ...callbacks.plan, shake: waveShake[i], shakeDuration: i === 4 ? 1.12 : 0.38 + i * 0.08, shakeFrequency: i === 4 ? 21 : 18 + i * 2, seed: index * 3.7 + i * 2.13 });
      if (i === 4 && !finaleImpactTriggered) {
        finaleImpactTriggered = true;
        callbacks.beginImpactHitStop(callbacks.plan);
      }
    }
    if (!preSlowTriggered && t >= rayConfig.finaleImpactAt - callbacks.plan.preSlowDuration) {
      preSlowTriggered = true;
      callbacks.beginPreImpactSlowMotion(callbacks.plan);
    }

    aftershocks.forEach(({ ring, material, start, duration }, i) => {
      const age = t - start;
      const progress = THREE.MathUtils.clamp(age / duration, 0, 1);
      ring.visible = age >= 0 && progress < 1;
      const waveRadius = radius * (0.08 + progress * (0.9 + i * 0.04));
      ring.scale.set(waveRadius, waveRadius, waveRadius);
      material.opacity = Math.max(0, 1 - progress) * (0.24 - i * 0.045) * intensity;
    });
  }

  function environmentWarmth() {
    const rise = THREE.MathUtils.smoothstep(currentTime, 0.8, 3.4);
    const wavePulse = Math.max(...waveImpactTimes.map((time, i) => Math.max(0, 1 - Math.abs(currentTime - time) / (i === 4 ? 1.05 : 0.9)) * (0.24 + i * 0.12)));
    const after = 1 - THREE.MathUtils.smoothstep(currentTime, 13.0, 16.3);
    return Math.max(0, Math.min(1, (rise * 0.4 + wavePulse + after * 0.12) * (1 - THREE.MathUtils.smoothstep(currentTime, 15.1, 17.2))));
  }

  function getCameraPose() {
    group.getWorldPosition(cameraCenter);
    const t = currentTime;
    if (t < 2.55) {
      cameraPose.position.set(cameraCenter.x + radius * 0.2, cameraCenter.y + sourceHeight * 1.18, cameraCenter.z + radius * 1.65);
      cameraPose.target.set(cameraCenter.x, cameraCenter.y + sourceHeight * 0.92, cameraCenter.z);
    } else if (t < 6.1) {
      cameraPose.position.set(cameraCenter.x, cameraCenter.y + sourceHeight * 1.7, cameraCenter.z + radius * 0.15);
      cameraPose.target.set(cameraCenter.x, cameraCenter.y, cameraCenter.z);
    } else if (t < 10.85) {
      const angle = (t - 6.1) * 0.18;
      cameraPose.position.set(cameraCenter.x + Math.cos(angle) * radius * 0.95, cameraCenter.y + radius * 0.55, cameraCenter.z + Math.sin(angle) * radius * 0.95);
      cameraPose.target.set(cameraCenter.x, cameraCenter.y + sourceHeight * 0.26, cameraCenter.z);
    } else {
      cameraPose.position.set(cameraCenter.x, cameraCenter.y + radius * 1.45, cameraCenter.z + radius * 2.05);
      cameraPose.target.set(cameraCenter.x, cameraCenter.y + sourceHeight * 0.18, cameraCenter.z);
    }
    return cameraPose;
  }

  return {
    group,
    update,
    cameraPose: getCameraPose,
    cameraPull: () => currentTime > rayConfig.finaleImpactAt ? 0.18 * Math.max(0, 1 - (currentTime - rayConfig.finaleImpactAt) / 1.5) : 0,
    environmentWarmth,
    radius, rayCount: count,
    waveCounts
  };
}

