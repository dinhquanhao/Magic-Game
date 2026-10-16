import { getSkillAreaRadius } from './skill-area.js';
import * as THREE from 'three';

const PI = Math.PI;
const TAU = PI * 2;
const SPIKE_COUNTS = Object.freeze({ Low: 300, Medium: 800, High: 1600, Ultra: 2800 });
const clamp01 = value => Math.max(0, Math.min(1, value));
const smooth = (a, b, value) => { const p = clamp01((value - a) / Math.max(.0001, b - a)); return p * p * (3 - 2 * p); };
function hash(x, y = 0, z = 0) { const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453123; return n - Math.floor(n); }

function createCrystalGeometry(variant) {
  const positions = [];
  const addTriangle = (a, b, c) => positions.push(...a, ...b, ...c);
  const addShard = (offsetX, offsetZ, height, radius, sides, seed) => {
    const levels = [0, .12, .67, .91, 1], widths = [.62, .52, .28, .12, 0];
    const rings = levels.map((y, level) => Array.from({ length: sides }, (_, i) => {
      const a = i * TAU / sides + seed;
      const irregular = .84 + hash(i, level, seed) * .28;
      return [offsetX + Math.cos(a) * radius * widths[level] * irregular + y * height * .12 * Math.sin(seed), y * height, offsetZ + Math.sin(a) * radius * widths[level] * irregular + y * height * .12 * Math.cos(seed * 1.7)];
    }));
    for (let ring = 0; ring < rings.length - 2; ring++) for (let i = 0; i < sides; i++) {
      const next = (i + 1) % sides, a = rings[ring][i], b = rings[ring][next], c = rings[ring + 1][i], d = rings[ring + 1][next];
      addTriangle(a, c, b); addTriangle(b, c, d);
    }
    const last = rings[rings.length - 2], tip = [offsetX + height * .12 * Math.sin(seed), height, offsetZ + height * .12 * Math.cos(seed * 1.7)];
    for (let i = 0; i < sides; i++) addTriangle(last[i], tip, last[(i + 1) % sides]);
    const base = rings[0], center = [offsetX, 0, offsetZ];
    for (let i = 0; i < sides; i++) addTriangle(center, base[(i + 1) % sides], base[i]);
  };
  const sideCount = [5, 6, 7, 5][variant];
  addShard(0, 0, 1, 1, sideCount, .37 + variant * .73);
  addShard(-.21, .04, .48 + variant * .06, .43, 5, 1.21 + variant);
  addShard(.24, -.08, .35 + variant * .08, .34, 5, 2.3 + variant * .71);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function crystalMaterial() {
  const material = new THREE.MeshPhysicalMaterial({
    color: 0x9adcf2, roughness: .17, metalness: .04, clearcoat: .85, clearcoatRoughness: .1,
    transparent: true, opacity: .78, depthWrite: false, flatShading: true, side: THREE.DoubleSide,
    emissive: 0x183b5b, emissiveIntensity: .24
  });
  material.userData.iceTime = 0;
  material.onBeforeCompile = shader => {
    shader.uniforms.uIceTime = { value: material.userData.iceTime };
    material.userData.iceUniforms = shader.uniforms;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aIceGrowth;\nattribute vec4 aIceDetail;\nuniform float uIceTime;\nvarying vec3 vIceNormal;\nvarying vec3 vIceLocal;\nvarying vec3 vIceView;\nvarying float vIceGrow;\nvarying float vIceSeed;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float iceAge=uIceTime-aIceGrowth.x;
        float iceProgress=clamp(iceAge/max(.02,aIceGrowth.y),0.0,1.0);
        float iceEase=1.0-pow(1.0-iceProgress,3.0);
        float iceOvershoot=sin(iceProgress*3.14159265)*exp(-iceProgress*5.0)*aIceDetail.y;
        float iceGrowth=max(.001,iceEase+iceOvershoot);
        transformed.xz*=aIceGrowth.w*iceGrowth;
        transformed.y*=aIceGrowth.z*iceGrowth;
        transformed.x+=sin(max(0.0,iceAge)*13.0+aIceDetail.x*31.0)*max(0.0,1.0-iceProgress)*.025;
        vIceLocal=transformed;
        vIceGrow=iceEase;
        vIceSeed=aIceDetail.x;`)
      .replace('#include <defaultnormal_vertex>', '#include <defaultnormal_vertex>\nvIceNormal=normalize(transformedNormal);')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvIceView=normalize(-mvPosition.xyz);');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vIceNormal;\nvarying vec3 vIceLocal;\nvarying vec3 vIceView;\nvarying float vIceGrow;\nvarying float vIceSeed;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float iceFacing=abs(dot(normalize(vIceNormal),normalize(vIceView)));
        float iceFresnel=pow(1.0-clamp(iceFacing,0.0,1.0),2.8);
        float iceVein=pow(max(0.0,sin(vIceLocal.y*39.0+sin(vIceLocal.x*12.0+vIceSeed*21.0)*2.2+cos(vIceLocal.z*11.0)*1.5)),18.0);
        float iceBubbles=smoothstep(.79,.96,sin(vIceLocal.x*19.0+vIceSeed*9.0)*sin(vIceLocal.y*23.0)*sin(vIceLocal.z*17.0));
        vec3 iceAbsorption=mix(vec3(.035,.12,.23),vec3(.44,.84,.96),iceFresnel);
        diffuseColor.rgb=mix(diffuseColor.rgb,iceAbsorption,.38+iceFresnel*.4);
        diffuseColor.a*=clamp(.62+iceFresnel*.42+iceBubbles*.05,.45,.96);`)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance+=vec3(.13,.38,.58)*(iceVein*.8+iceBubbles*.12)*(.35+vIceGrow*.65);');
  };
  material.customProgramCacheKey = () => 'arcane-ice-crystal-v1';
  return material;
}

function makeIceField(radius) {
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uSpread: { value: 0 }, uThaw: { value: 0 }, uRadius: { value: radius }, uIntensity: { value: 1 }, uCrackDensity: { value: .7 }, uEdgeThickness: { value: 2.4 }, uFrostMargin: { value: 4.2 } },
    vertexShader: `varying vec2 vUv;varying vec2 vPoint;void main(){vUv=uv;vPoint=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `uniform float uTime;uniform float uSpread;uniform float uThaw;uniform float uRadius;uniform float uIntensity;uniform float uCrackDensity;uniform float uEdgeThickness;uniform float uFrostMargin;varying vec2 vUv;varying vec2 vPoint;
      float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float voronoiEdge(vec2 p){vec2 i=floor(p),f=fract(p);float d1=8.0,d2=8.0;for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){vec2 g=vec2(float(x),float(y));vec2 r=g+vec2(h(i+g),h(i+g+17.0))*.82-f;float d=dot(r,r);if(d<d1){d2=d1;d1=d;}else if(d<d2)d2=d;}return sqrt(d2)-sqrt(d1);}
      void main(){float r=length(vUv-.5)*2.0;float dist=r*uRadius;float front=uSpread*uRadius-dist;float edge=1.0-smoothstep(-uEdgeThickness*.62,uEdgeThickness,front);float frozen=smoothstep(-uEdgeThickness*.82,uEdgeThickness*.74,front)*(1.0-uThaw);float frost=smoothstep(-uFrostMargin,-.2,front)*(1.0-smoothstep(0.0,uEdgeThickness,front))*(1.0-uThaw);
        vec2 p=vUv*uRadius*.92;float cells=voronoiEdge(p*1.9+vec2(sin(p.y*1.8),cos(p.x*1.6))*.28);float cracks=(1.0-smoothstep(.018,.052,cells))*uCrackDensity;float branches=pow(max(0.0,sin((p.x+p.y*.73)*8.0+sin(p.y*4.0)*2.0)),20.0);float ripple=.5+.5*sin(p.x*17.0+p.y*13.0+sin(p.x*5.0-uTime*.7)*2.0);float glint=pow(max(0.0,sin(p.x*27.0+p.y*19.0+uTime*1.2)),22.0);
        vec3 deep=vec3(.045,.16,.28),ice=vec3(.28,.62,.78),frostColor=vec3(.76,.91,.98);float refractionTint=.5+.5*sin(vPoint.x*13.0+vPoint.y*9.0+sin(vPoint.x*4.0)*1.8);vec3 color=mix(deep,ice,.28+ripple*.22+refractionTint*.24);color=mix(color,frostColor,clamp(cracks*.62+branches*.36+frost*.55,0.0,1.0));color+=vec3(.44,.78,1.0)*(glint*.36+edge*.15);
        float alpha=(frozen*(.19+ripple*.14+cracks*.18+edge*.1)+frost*.12+glint*.07)*uIntensity;alpha*=1.0-uThaw*.3;gl_FragColor=vec4(color,clamp(alpha,0.0,.72));}`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.NormalBlending, toneMapped: false
  });
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(1, 128), material);
  mesh.rotation.x = -PI / 2; mesh.position.y = -.045; mesh.scale.setScalar(radius); mesh.frustumCulled = false;
  return { mesh, material };
}

function makeGroundWave(radius, start, duration) {
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uProgress: { value: 0 }, uOpacity: { value: 0 }, uWidth: { value: .035 } },
    vertexShader: `varying vec2 vP;void main(){vP=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `uniform float uTime;uniform float uProgress;uniform float uOpacity;uniform float uWidth;varying vec2 vP;void main(){float r=length(vP);float a=atan(vP.y,vP.x);float edge=1.0-smoothstep(uWidth,uWidth*2.2,abs(r-uProgress));float noise=.72+.28*sin(a*17.0+sin(a*5.0+uTime)*.8);float forks=pow(max(0.0,sin(a*23.0+uProgress*41.0)),14.0);gl_FragColor=vec4(vec3(.54,.86,1.0)*(1.1+edge*.9),edge*noise*uOpacity*(.7+forks*.3));}`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false
  });
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(1, 128), material); mesh.rotation.x = -PI / 2; mesh.position.y = .025; mesh.scale.setScalar(radius); mesh.frustumCulled = false;
  return { mesh, material, start, duration };
}

function makeColdParticles(parent, count, radius, type) {
  const positions = new Float32Array(count * 3), data = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    const angle = hash(i, 2) * TAU, r = Math.sqrt(hash(i, 3)) * radius;
    const height = type === 0 ? .12 + hash(i, 5) * 1.6 : .45 + hash(i, 7) * 7.2;
    positions.set([Math.cos(angle) * r, height, Math.sin(angle) * r], i * 3);
    data.set([hash(i, 11) * 5, .7 + hash(i, 13) * 2.3, .04 + hash(i, 17) * .14, hash(i, 19)], i * 4);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aColdData', new THREE.BufferAttribute(data, 4));
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uStrength: { value: 0 }, uType: { value: type }, uIntensity: { value: 1 } },
    vertexShader: `attribute vec4 aColdData;uniform float uTime;uniform float uStrength;uniform float uType;uniform float uIntensity;varying float vAlpha;varying float vSeed;varying float vType;void main(){float age=mod(uTime+aColdData.x, aColdData.y);float fade=smoothstep(0.0,.22,age)*(1.0-smoothstep(aColdData.y-.3,aColdData.y,age));vec3 p=position;float phase=uTime*(uType<.5?.42:.78)+aColdData.w*6.28;p.x+=sin(phase+p.z*.13)*(.16+uStrength*.42);p.z+=cos(phase*.73+p.x*.11)*(.16+uStrength*.42);p.y+=sin(phase*.65)*.08;vec4 mv=modelViewMatrix*vec4(p,1.0);gl_PointSize=clamp(aColdData.z*(330.0/max(1.0,-mv.z))*(uType<.5?1.8:1.0),1.0,20.0);vAlpha=fade*uStrength*uIntensity;vSeed=aColdData.w;vType=uType;gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `varying float vAlpha;varying float vSeed;varying float vType;void main(){vec2 p=gl_PointCoord-.5;float r=length(p)*2.0;float core=1.0-smoothstep(.12,.92,r);float sparkle=pow(max(0.0,sin(vSeed*173.0+atan(p.y,p.x)*3.0)),16.0);if(core<.01)discard;vec3 c=vType<.5?vec3(.72,.88,.96):mix(vec3(.55,.84,1.0),vec3(1.0),sparkle*.8);gl_FragColor=vec4(c,core*vAlpha*(.42+sparkle*.58));}`,
    transparent: true, depthWrite: false, blending: type === 0 ? THREE.NormalBlending : THREE.AdditiveBlending, toneMapped: false
  });
  const points = new THREE.Points(geometry, material); points.frustumCulled = false; parent.add(points);
  return { points, material };
}

function addInstanceAttributes(mesh, growth, detail) {
  mesh.geometry.setAttribute('aIceGrowth', new THREE.InstancedBufferAttribute(growth, 4));
  mesh.geometry.setAttribute('aIceDetail', new THREE.InstancedBufferAttribute(detail, 4));
}

function createSpikeForest(root, settings, config, radius, events) {
  const total = Math.min(settings.spikes.totalByQuality[config.quality] || SPIKE_COUNTS.High, SPIKE_COUNTS.Ultra);
  const byVariant = Array.from({ length: settings.spikes.variants }, () => []);
  const golden = PI * (3 - Math.sqrt(5));
  let globalIndex = 0;
  events.forEach(event => {
    const waveCount = Math.round(total * event.share);
    for (let n = 0; n < waveCount && globalIndex < total; n++, globalIndex++) {
      const k = globalIndex; let angle = k * golden + (hash(k, 2) - .5) * .18;
      const u = (n + .5 + hash(k, 5) * .6) / Math.max(1, waveCount);
      let r;
      if (event.pattern === 'rings') r = radius * (.31 + .56 * Math.floor(n / Math.max(1, Math.sqrt(waveCount))) / Math.max(1, Math.sqrt(waveCount)) + (hash(k, 7) - .5) * .035);
      else if (event.pattern === 'fault-lines') { const arm = Math.floor(hash(k, 11) * 7), t = .16 + u * .82; angle = arm * TAU / 7 + Math.sin(t * 13 + arm) * .12 + (hash(k, 13) - .5) * .16; r = radius * t; }
      else if (event.pattern === 'burst-center') r = radius * Math.pow(u, 1.6) * .78;
      else r = radius * Math.pow(u, .63) * .88;
      const x = Math.cos(angle) * r + (hash(k, 17) - .5) * .7, z = Math.sin(angle) * r + (hash(k, 19) - .5) * .7;
      const sizeSeed = Math.pow(hash(k, 23), 2.2), height = THREE.MathUtils.lerp(settings.spikes.heightRange[0], settings.spikes.heightRange[1], sizeSeed);
      const width = THREE.MathUtils.lerp(settings.spikes.widthRange[0], settings.spikes.widthRange[1], Math.pow(sizeSeed, .55));
      const delay = event.start + hash(k, 29) * event.duration;
      const growDuration = THREE.MathUtils.lerp(settings.spikes.growDurationRange[0], settings.spikes.growDurationRange[1], sizeSeed);
      const variant = k % settings.spikes.variants;
      byVariant[variant].push({ x, z, height, width, delay, growDuration, seed: hash(k, 31), tilt: THREE.MathUtils.degToRad((hash(k, 37) - .5) * settings.spikes.tiltDeg * 2), yaw: hash(k, 41) * TAU, overshoot: settings.spikes.overshoot * (.5 + hash(k, 43)) });
    }
  });
  const materials = [], meshes = [];
  const dummy = new THREE.Object3D();
  byVariant.forEach((instances, variant) => {
    if (!instances.length) return;
    const geometry = createCrystalGeometry(variant), material = crystalMaterial();
    const mesh = new THREE.InstancedMesh(geometry, material, instances.length); mesh.frustumCulled = false; mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    const growth = new Float32Array(instances.length * 4), detail = new Float32Array(instances.length * 4);
    instances.forEach((item, i) => {
      growth.set([item.delay, item.growDuration, item.height, item.width], i * 4);
      detail.set([item.seed, item.overshoot, item.tilt, variant], i * 4);
      dummy.position.set(item.x, 0, item.z); dummy.rotation.set(item.tilt * .35, item.yaw, item.tilt); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
    });
    addInstanceAttributes(mesh, growth, detail); mesh.instanceMatrix.needsUpdate = true;
    root.add(mesh); materials.push(material); meshes.push(mesh); geometry.userData.iceOwned = true;
  });
  const centralGeometry = createCrystalGeometry(2), centralMaterial = crystalMaterial(), central = new THREE.InstancedMesh(centralGeometry, centralMaterial, 1);
  const centralGrowth = new Float32Array([settings.finalTime, .96, settings.spikes.centralHeight, settings.spikes.centralWidth]);
  const centralDetail = new Float32Array([.817, settings.spikes.overshoot, .015, 2]);
  addInstanceAttributes(central, centralGrowth, centralDetail); central.position.set(0, 0, 0); central.frustumCulled = false; root.add(central); materials.push(centralMaterial); meshes.push(central);
  dummy.position.set(0, 0, 0); dummy.rotation.set(0, .31, 0); dummy.updateMatrix(); central.setMatrixAt(0, dummy.matrix); central.instanceMatrix.needsUpdate = true;
  return { materials, meshes, count: total };
}

export function createIceFreezeAttack(parent, index, hex, skill, config, callbacks) {
  const settings = skill.iceField, root = new THREE.Group(); parent.add(root); root.visible = false;
  const radius = getSkillAreaRadius(skill, config.aoeRadius);
  const events = settings.waves.map(wave => ({ ...wave }));
  const forest = createSpikeForest(root, settings, config, radius, events);
  const field = makeIceField(radius); root.add(field.mesh);
  const waves = events.map(event => makeGroundWave(radius * 1.08, event.start, event.duration)); waves.forEach(wave => root.add(wave.mesh));
  const particleBase = config.quality === 'Low' ? 380 : config.quality === 'Medium' ? 820 : config.quality === 'Ultra' ? 2100 : 1450;
  const mist = makeColdParticles(root, Math.round(particleBase * Math.max(.5, config.density || 1)), radius * 1.16, 0);
  const diamondDust = makeColdParticles(root, Math.round(particleBase * .72 * Math.max(.5, config.density || 1)), radius * .9, 1);
  const center = new THREE.Vector3(), pose = { position: new THREE.Vector3(), target: new THREE.Vector3() };
  let currentTime = 0, compressionDone = false, finalSlowDone = false, finaleDone = false;
  const waveTriggered = events.map(() => false), aftershockTimes = Array.from({ length: settings.aftershock.count }, (_, i) => settings.finalTime + .76 + i * settings.aftershock.interval);
  let lastAftershock = -1;

  function update(time, intensity = 1, density = 1) {
    const t = Math.max(0, time); currentTime = t; root.visible = t < settings.totalDuration;
    if (!root.visible) return;
    const spread = smooth(settings.freeze.spreadStart, settings.freeze.spreadStart + settings.freeze.spreadDuration, t);
    const thaw = smooth(settings.freeze.thawStart, settings.freeze.thawStart + settings.freeze.thawDuration, t);
    const strength = smooth(2.0, 4.2, t) * (1.0 - thaw * .58);
    field.material.uniforms.uTime.value = t; field.material.uniforms.uSpread.value = spread; field.material.uniforms.uThaw.value = thaw; field.material.uniforms.uIntensity.value = intensity; field.material.uniforms.uCrackDensity.value = settings.freeze.crackDensity; field.material.uniforms.uEdgeThickness.value = settings.freeze.edgeThickness; field.material.uniforms.uFrostMargin.value = settings.freeze.frostMargin;
    forest.materials.forEach(material => { material.userData.iceTime = t; if (material.userData.iceUniforms?.uIceTime) material.userData.iceUniforms.uIceTime.value = t; });
    waves.forEach((wave, i) => {
      const local = clamp01((t - wave.start) / wave.duration), waveFade = (1 - smooth(.6, 1, local)) * (t >= wave.start ? 1 : 0);
      wave.material.uniforms.uTime.value = t; wave.material.uniforms.uProgress.value = local; wave.material.uniforms.uOpacity.value = waveFade * (.44 - i * .055) * intensity;
    });
    mist.material.uniforms.uTime.value = t; mist.material.uniforms.uStrength.value = strength; mist.material.uniforms.uIntensity.value = intensity * Math.min(1, density + .15);
    diamondDust.material.uniforms.uTime.value = t; diamondDust.material.uniforms.uStrength.value = strength * .9; diamondDust.material.uniforms.uIntensity.value = intensity * Math.min(1, density + .1);
    if (!compressionDone && t >= 3.2) { compressionDone = true; callbacks.beginPreImpactSlowMotion({ ...callbacks.plan, preSlowDuration: .58, preSlowScale: .52 }); }
    if (!finalSlowDone && t >= settings.finalTime - callbacks.plan.preSlowDuration) { finalSlowDone = true; callbacks.beginPreImpactSlowMotion(callbacks.plan); }
    events.forEach((event, i) => {
      if (!waveTriggered[i] && t >= event.start) {
        waveTriggered[i] = true;
        const amplitudes = [.0, .24, .58, 1.18];
        if (amplitudes[i] > 0 && i < 3) callbacks.triggerCameraShake({ ...callbacks.plan, shake: amplitudes[i], shakeDuration: .48 + i * .08, shakeFrequency: 12 + i * 3, seed: index * 7 + i * 19 });
      }
    });
    if (!finaleDone && t >= settings.finalTime) {
      finaleDone = true; callbacks.beginImpactHitStop(callbacks.plan);
      callbacks.triggerCameraShake({ ...callbacks.plan, shake: 1.45, shakeDuration: .95, shakeFrequency: 31, seed: index * 11 + 29 });
    }
    for (let i = 0; i < aftershockTimes.length; i++) if (i > lastAftershock && t >= aftershockTimes[i]) {
      lastAftershock = i; callbacks.triggerCameraShake({ ...callbacks.plan, shake: .42 * Math.pow(settings.aftershock.decay, i), shakeDuration: .42, shakeFrequency: 13 + i * 2, seed: index * 13 + i + 51 });
    }
  }

  function cameraPose() {
    root.getWorldPosition(center); const t = currentTime;
    if (t < 3.5) { pose.position.set(center.x + 2, center.y + 6, center.z + 17); pose.target.set(center.x, center.y + .4, center.z); }
    else if (t < 7.2) { pose.position.set(center.x + 1, center.y + 19, center.z + 24); pose.target.set(center.x, center.y, center.z); }
    else if (t < 9.4) { pose.position.set(center.x + 1, center.y + 17, center.z + 21); pose.target.set(center.x, center.y + 1, center.z); }
    else if (t < settings.finalTime) { pose.position.set(center.x + 3, center.y + 7, center.z + 13); pose.target.set(center.x, center.y + 5, center.z); }
    else { pose.position.set(center.x + 1, center.y + 22, center.z + 29); pose.target.set(center.x, center.y + 2.2, center.z); }
    return pose;
  }

  return {
    group: root, update, cameraPose,
    freezeLevel: () => smooth(settings.freeze.spreadStart, settings.freeze.spreadStart + settings.freeze.spreadDuration, currentTime) * (1 - smooth(settings.freeze.thawStart, settings.freeze.thawStart + settings.freeze.thawDuration, currentTime) * .55),
    environmentMood: () => smooth(2.2, 6.2, currentTime) * (1 - smooth(settings.freeze.thawStart, settings.freeze.thawStart + settings.freeze.thawDuration, currentTime) * .48),
    flashLevel: () => Math.exp(-Math.pow((currentTime - settings.finalTime - .05) / .18, 2)),
    lightPosition: () => center.set(0, 5.5, 0),
    radius, spikeCount: forest.count
  };
}
