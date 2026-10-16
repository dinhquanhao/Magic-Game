import * as THREE from 'three';

const TAU = Math.PI * 2;
const RAIN_COUNTS = Object.freeze({ Low: 2500, Medium: 6500, High: 15000, Ultra: 26000 });
const clamp01 = value => Math.max(0, Math.min(1, value));
const smooth = (a, b, value) => { const p = clamp01((value - a) / Math.max(.0001, b - a)); return p * p * (3 - 2 * p); };
function hash(x, y = 0, z = 0) { const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453123; return n - Math.floor(n); }

function makeRainGeometry() {
  const positions = [], indices = [], sides = 7;
  const rings = [[0, .14], [.09, .52], [.22, .72], [.4, .56], [.68, .31], [.9, .12], [1, .012]];
  for (const [y, radius] of rings) for (let i = 0; i < sides; i++) {
    const angle = i / sides * TAU;
    positions.push(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
  }
  for (let row = 0; row < rings.length - 1; row++) for (let i = 0; i < sides; i++) {
    const a = row * sides + i, b = row * sides + (i + 1) % sides, c = (row + 1) * sides + i, d = (row + 1) * sides + (i + 1) % sides;
    indices.push(a, b, c, b, d, c);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

function makeRainMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uCloudHeight: { value: 25 }, uIntensity: { value: 1 } },
    vertexShader: `attribute vec4 aRainTiming;attribute vec4 aRainMeta;attribute vec2 aRainWind;uniform float uTime;uniform float uCloudHeight;varying float vAlive;varying float vTail;varying float vSeed;varying float vColorType;varying float vRadius;varying vec3 vNormalView;varying vec3 vView;
      void main(){float duration=max(.05,aRainTiming.y);float age=uTime-aRainTiming.x;float progress=clamp(age/duration,0.0,1.0);float alive=step(0.0,age)*(1.0-step(duration,age));float fade=smoothstep(0.0,.08,progress)*(1.0-smoothstep(.82,1.0,progress));float fall=progress*progress*(3.0-2.0*progress);vec3 p=position;p.x*=aRainTiming.w;p.z*=aRainTiming.w;p.x+=aRainWind.x*fall+sin(uTime*3.0+aRainMeta.x*19.0)*aRainTiming.w*.18;p.z+=aRainWind.y*fall+cos(uTime*2.3+aRainMeta.x*13.0)*aRainTiming.w*.12;p.y=uCloudHeight-fall*(uCloudHeight+.12)+position.y*aRainTiming.z;vec4 mv=modelViewMatrix*instanceMatrix*vec4(p,1.0);vAlive=alive*fade;vTail=position.y;vSeed=aRainMeta.x;vColorType=aRainMeta.z;vRadius=length(position.xz);vNormalView=normalize(normalMatrix*mat3(instanceMatrix)*normal);vView=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `uniform float uIntensity;varying float vAlive;varying float vTail;varying float vSeed;varying float vColorType;varying float vRadius;varying vec3 vNormalView;varying vec3 vView;
      void main(){float facing=abs(dot(normalize(vNormalView),normalize(vView)));float fresnel=pow(1.0-facing,2.2);float core=1.0-smoothstep(.12,.82,vRadius);float pulse=.5+.5*sin(vTail*28.0+vSeed*37.0);vec3 deep=vec3(.018,.075,.012),toxic=vec3(.19,.42,.035),lime=vec3(.34,.46,.065),violet=vec3(.19,.105,.26);vec3 c=mix(deep,toxic,clamp(.32+core*.5+pulse*.18,0.0,1.0));c=mix(c,lime,fresnel*.38+core*.16);if(vColorType>.66)c=mix(c,violet,.4);else if(vColorType>.3)c=mix(c,lime,.36);float tailFade=1.0-smoothstep(.42,1.0,vTail)*.82;float alpha=(.10+fresnel*.12+core*.08)*tailFade*vAlive*uIntensity;if(alpha<.008)discard;gl_FragColor=vec4(c*(.62+core*.16),alpha);}`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.NormalBlending, toneMapped: false
  });
}

function noise3(p) {
  return `float hash31(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
    float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(mix(hash31(i),hash31(i+vec3(1,0,0)),f.x),mix(hash31(i+vec3(0,1,0)),hash31(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash31(i+vec3(0,0,1)),hash31(i+vec3(1,0,1)),f.x),mix(hash31(i+vec3(0,1,1)),hash31(i+vec3(1,1,1)),f.x),f.y),f.z);}
    float fbm(vec3 p){float sum=0.0,amp=.5;for(int i=0;i<4;i++){sum+=noise3(p)*amp;p=p*2.03+vec3(17.1,9.2,13.7);amp*=.5;}return sum;}`;
}

function makeCloudSystem(root, radius, settings) {
  const geometry = new THREE.SphereGeometry(1, 40, 24);
  geometry.setAttribute('aCloud', new THREE.InstancedBufferAttribute(new Float32Array([0, .17, 1, .31, 2, .53]), 2));
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uCloudLevel: { value: 0 }, uIntensity: { value: 1 } },
    vertexShader: `attribute vec2 aCloud;varying vec3 vLocal;varying vec2 vLayer;void main(){vLocal=position*vec3(2.4,1.7,2.4)+vec3(aCloud.x*.17,0.0,aCloud.y*.13);vLayer=aCloud;vec4 mv=modelViewMatrix*instanceMatrix*vec4(position,1.0);gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `uniform float uTime;uniform float uCloudLevel;uniform float uIntensity;varying vec3 vLocal;varying vec2 vLayer;${noise3('')}
      void main(){vec3 p=vLocal*vec3(1.15,.92,1.15);vec3 warp=vec3(fbm(p+vec3(0.0,uTime*.12,0.0)),fbm(p+vec3(4.7,uTime*.1,2.1)),fbm(p+vec3(1.3,3.1-uTime*.08,6.2)));float density=fbm(p+warp*.64+vec3(0.0,uTime*.075,0.0));float edge=1.0-smoothstep(.55,1.02,length(vLocal.xz)*.39);float folds=smoothstep(.27,.66,density+edge*.22);float ragged=1.0-smoothstep(.38,.8,fbm(p*2.1+warp));float alpha=folds*edge*(.34+vLayer.x*.11)*ragged*uCloudLevel*uIntensity;if(alpha<.012)discard;float rim=smoothstep(.4,.72,density+edge*.14);float vein=pow(max(0.0,sin(p.x*3.2+p.z*2.4+uTime*.28+warp.y*5.0)),18.0);vec3 c=mix(vec3(.018,.055,.024),vec3(.19,.34,.045),rim);c=mix(c,vec3(.51,.58,.08),smoothstep(.56,.78,density)*.62);c+=vec3(.22,.08,.31)*vein*.28;gl_FragColor=vec4(c,alpha);}`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.NormalBlending, toneMapped: false
  });
  const mesh = new THREE.InstancedMesh(geometry, material, 3), dummy = new THREE.Object3D();
  const layers = [[0, settings.cloud.height, 0, radius * 1.38, 4.5, radius * 1.28], [-radius * .28, settings.cloud.height + 1.35, radius * .12, radius * 1.15, 3.8, radius * 1.05], [radius * .24, settings.cloud.height + .42, -radius * .22, radius * 1.22, 4.2, radius * 1.12]];
  layers.forEach(([x, y, z, sx, sy, sz], i) => { dummy.position.set(x, y, z); dummy.scale.set(sx, sy, sz); dummy.rotation.y = i * 1.71; dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); });
  mesh.frustumCulled = false; mesh.renderOrder = 5; root.add(mesh);
  return { mesh, material };
}

function makeCorrosionGround(root, radius, settings) {
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uCorrosion: { value: 0 }, uEvaporate: { value: 0 }, uRadius: { value: radius }, uRain: { value: 0 }, uPitDepth: { value: settings.corrosion.pitDepth }, uPuddleMerge: { value: settings.corrosion.puddleMergeThreshold }, uIntensity: { value: 1 } },
    vertexShader: `uniform float uTime;uniform float uCorrosion;uniform float uPitDepth;varying vec2 vP;varying vec3 vN;varying vec3 vV;${noise3('')}
      void main(){vP=position.xy;float n=fbm(vec3(position.xy*.34,uTime*.08));float pits=1.0-smoothstep(.26,.52,fbm(vec3(position.xy*.72,1.7)));vec3 p=position;p.z+=uCorrosion*(n*.11-pits*uPitDepth*.34);vec4 mv=modelViewMatrix*vec4(p,1.0);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `uniform float uTime;uniform float uCorrosion;uniform float uEvaporate;uniform float uRadius;uniform float uRain;uniform float uPuddleMerge;uniform float uIntensity;varying vec2 vP;varying vec3 vN;varying vec3 vV;${noise3('')}
      void main(){float r=length(vP)/max(1.0,uRadius);if(r>1.0)discard;vec3 q=vec3(vP*.42,0.0);float broad=fbm(q+vec3(.0,uTime*.015,.0));float cell=fbm(vec3(vP*1.28,4.3));float puddle=1.0-smoothstep(uPuddleMerge*.55,uPuddleMerge,cell+sin(vP.x*.12+sin(vP.y*.1))* .06);float edge=abs(sin((vP.x+sin(vP.y*.18)*1.4)*2.2+cos(vP.y*.12)*1.7));float crack=1.0-smoothstep(.02,.09,edge);float wet=uCorrosion*(1.0-uEvaporate);float pool=puddle*wet*(.46+broad*.7);float pit=smoothstep(.55,.77,broad)*wet;float bubbles=pow(max(0.0,sin(vP.x*3.7+sin(vP.y*2.9+uTime*2.0)*2.2)*sin(vP.y*4.1-uTime*1.5)),12.0)*pool;float ripple=.5+.5*sin(length(vP)*2.6-uTime*5.4+sin(vP.x*1.4)*1.8);vec3 soil=vec3(.075,.064,.035);vec3 charred=vec3(.035,.046,.023);vec3 acid=vec3(.23,.38,.035);vec3 lime=vec3(.67,.75,.07);vec3 color=mix(soil,charred,wet*(.72+pit*.28));color=mix(color,acid,pool*.78);color=mix(color,lime,pool*(.12+ripple*.1)+bubbles*.55);float fresnel=pow(1.0-abs(dot(normalize(vN),normalize(vV))),3.0);color+=vec3(.38,.48,.13)*fresnel*pool;float foam=crack*wet*(.1+uRain*.18);color=mix(color,vec3(.53,.62,.17),foam);float alpha=clamp(wet*(.76+pool*.18+foam*.15)*uIntensity,0.0,.92);gl_FragColor=vec4(color,alpha);}`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.NormalBlending, toneMapped: false
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2.08, radius * 2.08, 96, 96), material);
  mesh.rotation.x = -Math.PI / 2; mesh.position.y = -.032; mesh.frustumCulled = false; mesh.renderOrder = 2; root.add(mesh);
  return { mesh, material };
}

function makeReactionParticles(root, points) {
  if (!points.length) return null;
  const position = new Float32Array(points.length * 3), fx = new Float32Array(points.length * 4), kind = new Float32Array(points.length);
  points.forEach((item, i) => { position.set([item.x, .055, item.z], i * 3); fx.set([item.start, item.life, item.size, item.seed], i * 4); kind[i] = item.kind; });
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(position, 3)); geometry.setAttribute('aFx', new THREE.BufferAttribute(fx, 4)); geometry.setAttribute('aKind', new THREE.BufferAttribute(kind, 1));
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uIntensity: { value: 1 } },
    vertexShader: `attribute vec4 aFx;attribute float aKind;uniform float uTime;uniform float uIntensity;varying float vAlpha;varying float vProgress;varying float vKind;varying float vSeed;void main(){float age=uTime-aFx.x;float life=max(.05,aFx.y);float p=clamp(age/life,0.0,1.0);float alive=step(0.0,age)*(1.0-step(life,age));vec3 pos=position;if(aKind<.5){pos.y+=.035;vAlpha=alive*(1.0-smoothstep(.54,1.0,p));}else if(aKind<1.5){pos.y+=p*1.2;pos.x+=sin(p*5.0+aFx.w*19.0)*.12;pos.z+=cos(p*4.0+aFx.w*13.0)*.12;vAlpha=alive*(1.0-smoothstep(.58,1.0,p));}else{pos.y+=p*2.7;pos.x+=sin(p*4.0+aFx.w*21.0)*(.18+p*.28);pos.z+=cos(p*3.6+aFx.w*15.0)*(.18+p*.28);vAlpha=alive*(1.0-smoothstep(.68,1.0,p))*.58;}vec4 mv=modelViewMatrix*vec4(pos,1.0);float scale=aKind<.5?(.55+p*1.8):aKind<1.5?(1.0+p*.42):(1.2+p*1.1);gl_PointSize=clamp(aFx.z*scale*(330.0/max(1.0,-mv.z)),1.0,42.0);vProgress=p;vKind=aKind;vSeed=aFx.w;vAlpha*=uIntensity;gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `varying float vAlpha;varying float vProgress;varying float vKind;varying float vSeed;void main(){vec2 q=gl_PointCoord-.5;float r=length(q)*2.0;float angle=atan(q.y,q.x);vec3 acid=vec3(.48,.96,.045);vec3 lime=vec3(.9,.98,.14);vec3 purple=vec3(.48,.27,.57);float alpha=0.0;vec3 color=acid;if(vKind<.5){float ringRadius=.28+vProgress*.63;float crown=1.0-smoothstep(.07,.2,abs(r-ringRadius+(sin(angle*9.0+vSeed*17.0)*.065)));float tips=pow(max(0.0,cos(angle*9.0+vSeed*17.0)),16.0);alpha=(crown*(.34+tips*.8))*(1.0-vProgress*.35);color=mix(acid,lime,tips*.68);}else if(vKind<1.5){float rim=1.0-smoothstep(.08,.2,abs(r-.62));float core=1.0-smoothstep(.18,.48,r);alpha=rim*.72+core*.09;color=mix(lime,acid,smoothstep(.2,.9,r));}else{float cloud=pow(max(0.0,1.0-r),2.2);float swirl=.72+.28*sin(angle*5.0+vSeed*9.0+vProgress*7.0);alpha=cloud*swirl;color=mix(vec3(.08,.23,.07),vec3(.35,.57,.08),r*.6);}if(r>1.0||alpha*vAlpha<.012)discard;gl_FragColor=vec4(color,alpha*vAlpha);}`,
    transparent: true, depthWrite: false, blending: THREE.NormalBlending, toneMapped: false
  });
  const particles = new THREE.Points(geometry, material); particles.frustumCulled = false; particles.renderOrder = 3; root.add(particles); return { particles, material };
}

function makeAcidShockwave(root, radius) {
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uProgress: { value: 0 }, uOpacity: { value: 0 }, uSeed: { value: .2 } },
    vertexShader: `varying vec2 vP;void main(){vP=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `uniform float uTime;uniform float uProgress;uniform float uOpacity;uniform float uSeed;varying vec2 vP;void main(){float r=length(vP);float front=uProgress*${radius.toFixed(3)};float jag=.5+.5*sin(atan(vP.y,vP.x)*19.0+uSeed+sin(uTime*2.0+vP.x)*.8);float band=1.0-smoothstep(.55,1.65,abs(r-front)+(jag-.5)*.42);float wake=(1.0-smoothstep(0.0,3.0,front-r))*.16;float alpha=(band*.78+wake)*uOpacity;if(alpha<.01)discard;vec3 c=mix(vec3(.25,.46,.06),vec3(.84,.94,.12),band);gl_FragColor=vec4(c,alpha);}`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false
  });
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(radius * 1.08, 128), material); mesh.rotation.x = -Math.PI / 2; mesh.position.y = .022; mesh.renderOrder = 4; mesh.frustumCulled = false; root.add(mesh); return { mesh, material };
}

export function createPoisonAcidRainAttack(parent, index, hex, skill, config, callbacks) {
  const settings = skill.poisonAcid, root = new THREE.Group(); parent.add(root); root.visible = false;
  const radius = Math.min(settings.cloud.radius, Math.max(1, skill.spread * (config.aoeRadius / skill.aoe) * (config.aoeScale || 1)));
  const total = Math.min(settings.rain.totalByQuality[config.quality] || RAIN_COUNTS.High, RAIN_COUNTS.Ultra);
  const timing = new Float32Array(total * 4), meta = new Float32Array(total * 4), wind = new Float32Array(total * 2), instancePosition = new Float32Array(total * 3);
  const reactions = [], golden = Math.PI * (3 - Math.sqrt(5)); let rainIndex = 0;
  settings.waves.forEach((wave, waveIndex) => {
    const count = Math.round(total * wave.share);
    for (let n = 0; n < count && rainIndex < total; n++, rainIndex++) {
      const seed = hash(rainIndex, 23), jitter = hash(n, waveIndex, 5), fraction = (n + .5 + jitter * .72) / Math.max(1, count);
      let angle = n * golden + (jitter - .5) * .34 + waveIndex * .71, r = radius * Math.sqrt(fraction), x, z;
      if (wave.pattern === 'sweep-slanted') { x = -radius + fraction * radius * 2; z = (hash(n, waveIndex, 9) - .5) * radius * .9 + x * .22; }
      else if (wave.pattern === 'carpet') { r = radius * Math.sqrt(fraction) * (.92 + hash(n, waveIndex, 11) * .08); x = Math.cos(angle) * r; z = Math.sin(angle) * r; }
      else { x = Math.cos(angle) * r; z = Math.sin(angle) * r; }
      x += (hash(rainIndex, 17) - .5) * radius / Math.sqrt(count) * .46; z += (hash(rainIndex, 19) - .5) * radius / Math.sqrt(count) * .46;
      const sizeSeed = Math.pow(hash(rainIndex, 31), 2.2), large = seed < settings.rain.heavyBlobShare;
      const length = THREE.MathUtils.lerp(settings.rain.dropLengthRange[0], settings.rain.dropLengthRange[1], hash(rainIndex, 37));
      const width = large ? THREE.MathUtils.lerp(settings.rain.blobSizeRange[0] / .72, settings.rain.blobSizeRange[1] / .72, hash(rainIndex, 39)) : THREE.MathUtils.lerp(.018, .055, Math.pow(hash(rainIndex, 41), 1.8));
      const speed = THREE.MathUtils.lerp(settings.rain.fallSpeedRange[0], settings.rain.fallSpeedRange[1], hash(rainIndex, 43));
      const fallDuration = THREE.MathUtils.clamp(settings.cloud.height / speed, .55, 1.65);
      const phase = wave.pattern === 'radial-grow' ? fraction * wave.duration * .64 + hash(rainIndex, 47) * wave.duration * .36 : wave.pattern === 'simultaneous' ? hash(rainIndex, 47) * .09 * wave.duration : hash(rainIndex, 47) * wave.duration;
      const start = wave.start + phase;
      let dx = 0, dz = 0;
      if (wave.pattern === 'sweep-slanted') { dx = radius * settings.rain.windSkew * .9; dz = -radius * settings.rain.windSkew * .28; }
      else { dx = Math.cos(angle + Math.PI * .5) * radius * settings.rain.windSkew * .12; dz = Math.sin(angle + Math.PI * .5) * radius * settings.rain.windSkew * .12; }
      instancePosition.set([x - dx, 0, z - dz], rainIndex * 3);
      timing.set([start, fallDuration, length, width], rainIndex * 4); meta.set([seed, large ? 1.0 : .25 + sizeSeed * .65, hash(rainIndex, 53) < .08 ? 2 : hash(rainIndex, 59) < .24 ? 1 : 0, waveIndex], rainIndex * 4); wind.set([dx, dz], rainIndex * 2);
      const impactX = x, impactZ = z, impactAt = start + fallDuration;
      if (hash(rainIndex, 61) < settings.rain.splashShare) {
        reactions.push({ x: impactX, z: impactZ, start: impactAt, life: .58, size: large ? 2.0 : .72 + hash(rainIndex, 67) * .64, seed, kind: 0 });
        if (hash(rainIndex, 71) < .3) reactions.push({ x: impactX + (hash(rainIndex, 73) - .5) * .34, z: impactZ + (hash(rainIndex, 79) - .5) * .34, start: impactAt + .08, life: 1.05 + hash(rainIndex, 83) * .7, size: .42 + hash(rainIndex, 89) * .48, seed: hash(rainIndex, 97), kind: 1 });
        if (hash(rainIndex, 101) < .12) reactions.push({ x: impactX, z: impactZ, start: impactAt + .04, life: 2.1 + hash(rainIndex, 103) * 1.2, size: .62 + hash(rainIndex, 107) * .68, seed: hash(rainIndex, 109), kind: 2 });
      }
    }
  });
  const rainGeometry = makeRainGeometry(); rainGeometry.setAttribute('aRainTiming', new THREE.InstancedBufferAttribute(timing, 4)); rainGeometry.setAttribute('aRainMeta', new THREE.InstancedBufferAttribute(meta, 4)); rainGeometry.setAttribute('aRainWind', new THREE.InstancedBufferAttribute(wind, 2));
  const rain = new THREE.InstancedMesh(rainGeometry, makeRainMaterial(), total); rain.frustumCulled = false; rain.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  const matrix = new THREE.Matrix4();
  for (let i = 0; i < total; i++) { matrix.makeTranslation(instancePosition[i * 3], 0, instancePosition[i * 3 + 2]); rain.setMatrixAt(i, matrix); }
  rain.instanceMatrix.needsUpdate = true;
  root.add(rain);

  const clouds = makeCloudSystem(root, radius, settings), ground = makeCorrosionGround(root, radius, settings), effects = makeReactionParticles(root, reactions), shock = makeAcidShockwave(root, radius);
  const center = new THREE.Vector3(), pose = { position: new THREE.Vector3(), target: new THREE.Vector3() };
  const waveFired = settings.waves.map(() => false), aftershocks = Array.from({ length: settings.aftershock.count }, (_, i) => settings.finalTime + .78 + i * settings.aftershock.interval);
  let currentTime = 0, preSlow = false, finale = false, lastAftershock = -1;

  function update(time, intensity = 1, density = 1) {
    const t = Math.max(0, time); currentTime = t; root.visible = t < settings.totalDuration;
    if (!root.visible) return;
    const cloudLevel = smooth(settings.cloud.formStart, settings.cloud.formStart + settings.cloud.formDuration, t) * (1 - smooth(settings.cloud.dissipateStart, settings.cloud.dissipateStart + settings.cloud.dissipateDuration, t));
    const corrosion = smooth(settings.waves[0].start + .35, settings.finalTime + .25, t), evaporate = smooth(settings.corrosion.evaporateStart, settings.corrosion.evaporateStart + settings.corrosion.evaporateDuration, t);
    clouds.material.uniforms.uTime.value = t; clouds.material.uniforms.uCloudLevel.value = cloudLevel; clouds.material.uniforms.uIntensity.value = intensity;
    ground.material.uniforms.uTime.value = t; ground.material.uniforms.uCorrosion.value = corrosion; ground.material.uniforms.uEvaporate.value = evaporate; ground.material.uniforms.uRain.value = corrosion * (1 - evaporate); ground.material.uniforms.uPitDepth.value = settings.corrosion.pitDepth; ground.material.uniforms.uPuddleMerge.value = settings.corrosion.puddleMergeThreshold; ground.material.uniforms.uIntensity.value = intensity;
    rain.material.uniforms.uTime.value = t; rain.material.uniforms.uCloudHeight.value = settings.cloud.height; rain.material.uniforms.uIntensity.value = intensity * Math.min(1, density + .12);
    if (effects) { effects.material.uniforms.uTime.value = t; effects.material.uniforms.uIntensity.value = intensity * Math.min(1, density + .18); }
    const shockP = clamp01((t - settings.finalTime) / settings.shockwave.duration); shock.material.uniforms.uTime.value = t; shock.material.uniforms.uProgress.value = shockP; shock.material.uniforms.uOpacity.value = shockP > 0 ? (1 - smooth(.72, 1, shockP)) * (1 - smooth(0, .08, shockP)) * intensity : 0;
    settings.waves.forEach((wave, i) => { if (!waveFired[i] && t >= wave.start) { waveFired[i] = true; const amplitudes = [0, 0, .24, .62, 1.32]; if (amplitudes[i] > 0 && i < 4) callbacks.triggerCameraShake({ ...callbacks.plan, shake: amplitudes[i], shakeDuration: .55, shakeFrequency: i === 3 ? 11 : 17, seed: index * 19 + i * 31 }); } });
    if (!preSlow && t >= settings.finalTime - callbacks.plan.preSlowDuration) { preSlow = true; callbacks.beginPreImpactSlowMotion(callbacks.plan); }
    if (!finale && t >= settings.finalTime) { finale = true; callbacks.beginImpactHitStop(callbacks.plan); callbacks.triggerCameraShake({ ...callbacks.plan, shake: 1.38, shakeDuration: 1.05, shakeFrequency: 25, seed: index * 29 + 41 }); }
    for (let i = 0; i < aftershocks.length; i++) if (i > lastAftershock && t >= aftershocks[i]) { lastAftershock = i; callbacks.triggerCameraShake({ ...callbacks.plan, shake: .38 * Math.pow(settings.aftershock.decay, i), shakeDuration: .38, shakeFrequency: 12 + i * 2, seed: index * 37 + i + 57 }); }
  }

  function cameraPose() {
    root.getWorldPosition(center); const t = currentTime;
    if (t < 4.7) { pose.position.set(center.x + 1, center.y + settings.cloud.height * .52, center.z + radius * .8); pose.target.set(center.x, center.y + settings.cloud.height, center.z); }
    else if (t < 7.6) { pose.position.set(center.x + 1, center.y + radius * .95, center.z + radius * 1.2); pose.target.set(center.x, center.y + radius * .15, center.z); }
    else if (t < 10.9) { pose.position.set(center.x + radius * .62, center.y + 8, center.z + radius * .42); pose.target.set(center.x, center.y + 4.8, center.z); }
    else { pose.position.set(center.x + radius * 1.45, center.y + radius * .88, center.z + radius * 1.65); pose.target.set(center.x, center.y + 3, center.z); }
    return pose;
  }
  function centerAt(out, y = .4) { root.localToWorld(out.set(0, y, 0)); return out; }
  return {
    group: root, update, cameraPose,
    environmentMood: () => smooth(2.5, 5.1, currentTime) * (1 - smooth(settings.cloud.dissipateStart, settings.totalDuration, currentTime) * .6),
    flashLevel: () => Math.exp(-Math.pow((currentTime - settings.finalTime - .08) / .22, 2)),
    heatLevel: () => smooth(8.2, 10.5, currentTime) * (1 - smooth(settings.corrosion.evaporateStart, settings.totalDuration, currentTime)) * .22,
    heatCenter: out => centerAt(out, .45), lightPosition: () => centerAt(center, 5.2), rainCount: total, reactionCount: reactions.length, radius
  };
}
