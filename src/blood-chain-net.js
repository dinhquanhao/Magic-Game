import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const smooth = (a, b, value) => {
  const t = clamp((value - a) / Math.max(0.0001, b - a));
  return t * t * (3 - 2 * t);
};
const hash = (value) => {
  const x = Math.sin(value * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
};
const lerp = (a, b, t) => a + (b - a) * t;

const QUALITY = {
  Low: { chains: 220, maxLinks: 38, minimumLinks: 16, particles: 700 },
  Medium: { chains: 320, maxLinks: 44, minimumLinks: 17, particles: 1300 },
  High: { chains: 460, maxLinks: 50, minimumLinks: 18, particles: 2300 },
  Ultra: { chains: 560, maxLinks: 56, minimumLinks: 18, particles: 3400 }
};

const makePoint = (radius, angle, y) => new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
const cubicPoint = (path, t) => {
  const s = 1 - t;
  return path[0].clone().multiplyScalar(s * s * s)
    .addScaledVector(path[1], 3 * s * s * t)
    .addScaledVector(path[2], 3 * s * t * t)
    .addScaledVector(path[3], t * t * t);
};

function makePath(waveIndex, localIndex, totalInWave, radius, skyHeight, seed, size) {
  const bundle = Math.floor(localIndex / 5);
  const slot = localIndex % 5;
  const angle = bundle * 2.399963229728653 + (slot - 2) * 0.075 + (hash(seed + 9) - 0.5) * 0.16;
  const spread = radius * (0.68 + hash(seed + 21) * 0.38);
  const lowY = hash(seed + 27) < 0.28 ? -1.5 : 0.2 + hash(seed + 29) * 2.2;
  const height = 4 + hash(seed + 37) * 13;
  const otherAngle = angle + Math.PI + (hash(seed + 43) - 0.5) * 0.52;
  const offset = (hash(seed + 53) - 0.5) * radius * 0.34;
  const side = new THREE.Vector3(-Math.sin(angle), 0, Math.cos(angle));
  let points;

  if (waveIndex === 0) {
    points = [
      makePoint(spread * 0.38, angle, skyHeight * (0.78 + hash(seed + 3) * 0.2)),
      makePoint(spread * 0.32, angle + 0.12, skyHeight * 0.48).addScaledVector(side, offset),
      makePoint(spread * 0.7, otherAngle, 4 + hash(seed + 5) * 8).addScaledVector(side, -offset * 0.5),
      makePoint(spread, otherAngle, lowY)
    ];
  } else if (waveIndex === 1) {
    points = [
      makePoint(spread, angle, lowY),
      makePoint(spread * 0.65, angle + 0.28, 5 + hash(seed + 7) * 7).addScaledVector(side, offset),
      makePoint(spread * 0.48, otherAngle - 0.16, skyHeight * 0.55).addScaledVector(side, -offset),
      makePoint(spread * 0.78, otherAngle, skyHeight * (0.82 + hash(seed + 11) * 0.15))
    ];
  } else if (waveIndex === 2) {
    points = [
      makePoint(spread, angle, height),
      makePoint(spread * 0.36, angle + 0.13, height + (hash(seed + 13) - 0.5) * 5).addScaledVector(side, offset),
      makePoint(spread * 0.34, otherAngle - 0.1, height + (hash(seed + 17) - 0.5) * 5).addScaledVector(side, -offset),
      makePoint(spread, otherAngle, height + (hash(seed + 19) - 0.5) * 2)
    ];
  } else if (waveIndex === 3) {
    const crown = skyHeight * (0.76 + hash(seed + 31) * 0.2);
    points = [
      makePoint(spread, angle, lowY),
      makePoint(spread * 0.62, angle + 0.12, crown * 0.72).addScaledVector(side, offset),
      makePoint(spread * 0.58, otherAngle - 0.1, crown * 0.78).addScaledVector(side, -offset),
      makePoint(spread * 0.96, otherAngle, 0.3 + hash(seed + 33) * 1.4)
    ];
  } else {
    const inner = radius * (0.12 + hash(seed + 41) * 0.45);
    points = [
      makePoint(spread * 0.88, angle, 1 + hash(seed + 47) * 5),
      makePoint(inner, angle + 0.2, 8 + hash(seed + 49) * 11).addScaledVector(side, offset * 0.75),
      makePoint(inner * 0.72, otherAngle - 0.16, 10 + hash(seed + 51) * 10).addScaledVector(side, -offset * 0.7),
      makePoint(spread * 0.92, otherAngle, lowY)
    ];
  }

  const sag = waveIndex === 2 ? 0.12 + hash(seed + 61) * 0.55 : 0.32 + hash(seed + 67) * 1.35;
  const braid = (hash(seed + 71) < 0.3 ? 1 : 0) * size * (0.45 + hash(seed + 73) * 1.05);
  const phase = hash(seed + 79) * Math.PI * 2;
  const rawSamples = [];
  const sampleCount = 80;
  for (let i = 0; i <= sampleCount; i++) {
    const t = i / sampleCount;
    const point = cubicPoint(points, t);
    point.y -= Math.sin(Math.PI * t) * sag;
    const perpendicular = new THREE.Vector3(-Math.sin(angle), 0, Math.cos(angle));
    point.addScaledVector(perpendicular, Math.sin(t * Math.PI * 2 * (1 + (bundle % 3)) + phase) * braid);
    rawSamples.push(point);
  }
  const distances = [0];
  let pathLength = 0;
  for (let i = 1; i < rawSamples.length; i++) {
    pathLength += rawSamples[i].distanceTo(rawSamples[i - 1]);
    distances.push(pathLength);
  }
  return { points: rawSamples, distances, length: pathLength, seed, angle, side, phase, waveIndex, totalInWave };
}

function pointAlongPath(path, fraction, target) {
  const wanted = path.length * clamp(fraction);
  let lo = 0, hi = path.distances.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (path.distances[mid] < wanted) lo = mid + 1;
    else hi = mid;
  }
  const upper = lo, lower = Math.max(0, upper - 1);
  const span = Math.max(0.0001, path.distances[upper] - path.distances[lower]);
  return target.copy(path.points[lower]).lerp(path.points[upper], clamp((wanted - path.distances[lower]) / span));
}

function buildLinkGeometry(variant) {
  const parts = [];
  const loop = new THREE.TorusGeometry(0.29, 0.085, 6, 12);
  loop.scale(1.28, 1, 0.94);
  parts.push(loop);
  if (variant === 1) {
    for (const sign of [-1, 1]) {
      const barb = new THREE.ConeGeometry(0.075, 0.23, 5, 1);
      barb.rotateZ(sign > 0 ? -Math.PI / 2 : Math.PI / 2);
      barb.scale(1.1, 1, 0.82);
      barb.translate(sign * 0.35, sign * 0.075, 0);
      parts.push(barb);
    }
  } else if (variant === 2) {
    const etched = new THREE.TorusGeometry(0.205, 0.022, 4, 10);
    etched.scale(1.35, 0.92, 1);
    etched.translate(0, 0, 0.077);
    parts.push(etched);
  }
  const geometry = mergeGeometries(parts, false);
  for (const part of parts) part.dispose();
  geometry.computeVertexNormals();
  return geometry;
}

function makeBloodMaterial(colorHex) {
  const uniforms = {
    uBloodTime: { value: 0 },
    uBloodIntensity: { value: 1 },
    uBloodConstrict: { value: 0 },
    uBloodShatterTime: { value: 12.72 },
    uBloodCenter: { value: new THREE.Vector3(0, 0, 0) },
    uBloodColor: { value: new THREE.Color(colorHex || 0x8f1028) },
    uBloodHotColor: { value: new THREE.Color(0xff3653) }
  };
  const material = new THREE.MeshPhysicalMaterial({
    color: 0x53101b,
    metalness: 0.72,
    roughness: 0.25,
    clearcoat: 0.78,
    clearcoatRoughness: 0.17,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  material.userData.bloodUniforms = uniforms;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    const attributes = '\nattribute float aBloodBorn;\nattribute float aBloodProgress;\nattribute float aBloodSeed;\nattribute float aBloodWaveStart;\nattribute float aBloodSize;\nattribute float aBloodVariant;\nattribute float aBloodTension;\nattribute float aBloodShatterSpeed;\nattribute vec3 aBloodTangent;\nattribute vec3 aBloodFragmentDirection;\nuniform float uBloodTime;\nuniform float uBloodIntensity;\nuniform float uBloodConstrict;\nuniform float uBloodShatterTime;\nuniform vec3 uBloodCenter;\nuniform vec3 uBloodColor;\nuniform vec3 uBloodHotColor;\nvarying vec3 vBloodLinkPosition;\nvarying vec3 vBloodViewDirection;\nvarying float vBloodAlpha;\nvarying float vBloodProgress;\nvarying float vBloodSeed;\nvarying float vBloodVariant;\nvarying float vBloodTension;';
    const fragmentDeclarations = '\nuniform float uBloodTime;\nuniform float uBloodIntensity;\nuniform vec3 uBloodColor;\nuniform vec3 uBloodHotColor;\nvarying vec3 vBloodLinkPosition;\nvarying vec3 vBloodViewDirection;\nvarying float vBloodAlpha;\nvarying float vBloodProgress;\nvarying float vBloodSeed;\nvarying float vBloodVariant;\nvarying float vBloodTension;';
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>' + attributes);
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvBloodLinkPosition = position;\nvBloodProgress = aBloodProgress;\nvBloodSeed = aBloodSeed;\nvBloodVariant = aBloodVariant;\nvBloodTension = aBloodTension;');
    shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', '\nvec4 bloodInstancePosition = instanceMatrix * vec4(transformed, 1.0);\nvec3 bloodCenter = instanceMatrix[3].xyz;\nvec3 bloodOffset = bloodInstancePosition.xyz - bloodCenter;\nfloat bloodBirth = smoothstep(aBloodBorn - 0.07, aBloodBorn + 0.22, uBloodTime);\nfloat bloodAge = max(0.0, uBloodTime - aBloodBorn);\nfloat whipEnvelope = exp(-abs((uBloodTime - aBloodWaveStart) - (0.22 + aBloodProgress * 0.72)) * 2.8);\nfloat whipWave = sin((uBloodTime - aBloodWaveStart) * 9.0 - aBloodProgress * 22.0 + aBloodSeed * 17.0);\nvec3 bloodSide = normalize(cross(aBloodTangent, vec3(0.0, 1.0, 0.0)) + vec3(0.001, 0.0, 0.0));\nvec3 whipOffset = bloodSide * whipWave * whipEnvelope * (0.09 + aBloodSize * 0.045);\nfloat tensionRattle = sin(uBloodTime * 43.0 + aBloodProgress * 31.0 + aBloodSeed * 45.0) * uBloodConstrict * aBloodTension * 0.022;\nvec3 tightCenter = bloodCenter;\ntightCenter.xz = mix(bloodCenter.xz, uBloodCenter.xz, uBloodConstrict * 0.84);\ntightCenter.y = mix(bloodCenter.y, 1.25 + bloodCenter.y * 0.12, uBloodConstrict);\nfloat shatter = smoothstep(uBloodShatterTime, uBloodShatterTime + 0.12, uBloodTime);\nfloat shatterAge = max(0.0, uBloodTime - uBloodShatterTime);\nvec3 fragmentMotion = aBloodFragmentDirection * aBloodShatterSpeed * shatterAge + vec3(0.0, -2.25 * shatterAge * shatterAge, 0.0);\nbloodInstancePosition.xyz = tightCenter + bloodOffset * mix(1.0, 0.78, uBloodConstrict) + whipOffset * (1.0 - uBloodConstrict * 0.8) + vec3(0.0, tensionRattle, 0.0) + fragmentMotion * shatter;\nvec4 mvPosition = modelViewMatrix * bloodInstancePosition;\nvBloodViewDirection = -mvPosition.xyz;\nvBloodAlpha = bloodBirth * (1.0 - smoothstep(uBloodShatterTime + 1.05, uBloodShatterTime + 4.65, uBloodTime));\ngl_Position = projectionMatrix * mvPosition;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>' + fragmentDeclarations);
    shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\nfloat bloodFlow = 0.5 + 0.5 * sin(vBloodProgress * 37.0 - uBloodTime * 2.8 + vBloodSeed * 22.0);\nfloat bloodEtch = pow(max(0.0, sin(vBloodLinkPosition.x * 19.0 + vBloodLinkPosition.y * 15.0 + vBloodSeed * 31.0 + vBloodProgress * 52.0)), 18.0);\nfloat bloodRune = pow(max(0.0, sin(vBloodLinkPosition.y * 28.0 + vBloodLinkPosition.x * 8.0 + vBloodSeed * 9.0)), 14.0);\nfloat bloodFresnel = pow(1.0 - abs(dot(normalize(normal), normalize(vBloodViewDirection))), 2.45);\nvec3 bloodMetal = mix(vec3(0.045, 0.003, 0.012), uBloodColor, 0.44 + bloodFlow * 0.28);\nbloodMetal = mix(bloodMetal, vec3(0.24, 0.012, 0.035), clamp(vBloodVariant * 0.12 + bloodRune * 0.2, 0.0, 0.42));\ndiffuseColor.rgb = mix(diffuseColor.rgb * 0.34, bloodMetal, 0.9);\ndiffuseColor.rgb += uBloodHotColor * (bloodFresnel * 0.22 + vBloodTension * 0.08);\ndiffuseColor.a *= vBloodAlpha;\ntotalEmissiveRadiance += uBloodHotColor * (bloodEtch * 0.52 + bloodRune * 0.24 + bloodFresnel * 0.08 + vBloodTension * 0.1) * uBloodIntensity * vBloodAlpha;');
  };
  material.customProgramCacheKey = () => 'arcane-blood-chain-instanced-v1';
  return material;
}

function makePortal(parent, radius, vertical, y, depthOffset) {
  const group = new THREE.Group();
  group.position.set(0, y, depthOffset);
  if (!vertical) group.rotation.x = -Math.PI / 2;
  parent.add(group);
  const uniforms = { uTime: { value: 0 }, uOpen: { value: 0 }, uIntensity: { value: 1 }, uFade: { value: 1 } };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: 'uniform float uTime;uniform float uOpen;uniform float uIntensity;uniform float uFade;varying vec2 vUv;void main(){vec2 p=vUv*2.0-1.0;float r=length(p);if(r>1.0)discard;float a=atan(p.y,p.x);float ring=pow(max(0.0,cos(r*58.0-uTime*1.35)),16.0);float glyph=pow(max(0.0,sin(a*31.0+r*47.0+sin(a*7.0)*1.8+uTime*0.18)),18.0);float spokes=pow(max(0.0,cos(a*13.0+uTime*0.1)),28.0)*smoothstep(0.25,0.86,r);float core=exp(-r*3.4);float edge=1.0-smoothstep(0.88,1.0,r);float alpha=(core*0.23+ring*0.25+glyph*0.28+spokes*0.22)*edge*uOpen*uFade*uIntensity;if(alpha<0.012)discard;vec3 c=mix(vec3(0.11,0.003,0.018),vec3(0.8,0.025,0.09),clamp(ring+glyph+spokes,0.0,1.0));gl_FragColor=vec4(c,alpha);}',
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    toneMapped: false
  });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(radius, 112), material);
  disc.position.z = vertical ? 0 : 0;
  group.add(disc);
  const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xb91c38, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const rings = [];
  for (const [scale, speed] of [[1, 0.14], [0.76, -0.21], [0.52, 0.28], [0.3, -0.34]]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * scale, Math.max(0.025, radius * 0.0022), 6, 144), ringMaterial);
    ring.position.z = vertical ? 0.03 : 0;
    group.add(ring);
    rings.push({ ring, speed });
  }
  return { group, uniforms, ringMaterial, rings };
}

function makeGroundMarks(parent, radius, settings) {
  const stainUniforms = {
    uTime: { value: 0 },
    uGrow: { value: 0 },
    uFade: { value: 0 },
    uIntensity: { value: 1 }
  };
  const stainMaterial = new THREE.ShaderMaterial({
    uniforms: stainUniforms,
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: 'uniform float uTime;uniform float uGrow;uniform float uFade;uniform float uIntensity;varying vec2 vUv;float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(h(i),h(i+vec2(1.0,0.0)),f.x),mix(h(i+vec2(0.0,1.0)),h(i+vec2(1.0,1.0)),f.x),f.y);}void main(){vec2 p=vUv*2.0-1.0;float r=length(p);float grain=n(p*11.0+uTime*0.015);float veins=n(p*23.0+vec2(uTime*0.008,-uTime*0.01));float edge=1.0-smoothstep(0.45,1.08,r+grain*0.13);float pools=smoothstep(0.38,0.78,grain*0.62+veins*0.5);float ripples=pow(max(0.0,sin(r*94.0-uTime*3.7+grain*4.0)),16.0)*(1.0-smoothstep(0.04,0.95,r));float alpha=(edge*pools*0.56+ripples*0.16)*uGrow*uFade*uIntensity;if(alpha<0.012)discard;vec3 c=mix(vec3(0.035,0.002,0.009),vec3(0.22,0.012,0.031),grain*0.72+ripples*0.3);gl_FragColor=vec4(c,alpha);}',
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    toneMapped: false
  });
  const stain = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2.18, radius * 2.18), stainMaterial);
  stain.rotation.x = -Math.PI / 2;
  stain.position.y = -0.043;
  stain.renderOrder = 2;
  parent.add(stain);

  const cracks = [];
  const anchorCount = Math.min(150, settings.chainCount);
  for (let i = 0; i < anchorCount; i++) {
    const angle = i * 2.399963229728653 + hash(i + 199) * 0.28;
    const r = radius * (0.28 + hash(i + 203) * 0.72);
    const origin = makePoint(r, angle, -0.025);
    for (let branch = 0; branch < 3; branch++) {
      const branchAngle = angle + (hash(i * 7 + branch + 211) - 0.5) * 1.25;
      const length = radius * (0.018 + hash(i * 13 + branch + 223) * 0.04);
      const middle = origin.clone().add(new THREE.Vector3(Math.cos(branchAngle) * length * 0.55, 0, Math.sin(branchAngle) * length * 0.55));
      const end = origin.clone().add(new THREE.Vector3(Math.cos(branchAngle + (hash(i + branch + 227) - 0.5) * 0.22) * length, 0, Math.sin(branchAngle + (hash(i + branch + 227) - 0.5) * 0.22) * length));
      cracks.push(origin.clone(), middle, middle.clone(), end);
    }
  }
  const crackGeometry = new THREE.BufferGeometry().setFromPoints(cracks);
  const crackMaterial = new THREE.LineBasicMaterial({ color: 0x8e1029, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const crackMesh = new THREE.LineSegments(crackGeometry, crackMaterial);
  crackMesh.renderOrder = 3;
  parent.add(crackMesh);

  const punctureGeometry = new THREE.TorusGeometry(Math.max(0.09, radius * 0.011), Math.max(0.018, radius * 0.0017), 4, 14);
  const punctureMaterial = new THREE.MeshBasicMaterial({ color: 0xe72a48, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const punctures = new THREE.InstancedMesh(punctureGeometry, punctureMaterial, anchorCount);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < anchorCount; i++) {
    const angle = i * 2.399963229728653 + hash(i + 199) * 0.28;
    const r = radius * (0.28 + hash(i + 203) * 0.72);
    dummy.position.copy(makePoint(r, angle, -0.018));
    dummy.rotation.set(Math.PI / 2, 0, hash(i + 239) * Math.PI * 2);
    dummy.scale.setScalar(0.48 + hash(i + 241) * 1.45);
    dummy.updateMatrix();
    punctures.setMatrixAt(i, dummy.matrix);
  }
  punctures.instanceMatrix.needsUpdate = true;
  punctures.frustumCulled = false;
  parent.add(punctures);
  return { stainMaterial, stainUniforms, crackMaterial, punctureMaterial, punctureGeometry };
}

function makeChainMaterialAttributes(mesh, records) {
  const count = records.length;
  const scalar = (name, read) => {
    const values = new Float32Array(count);
    for (let i = 0; i < count; i++) values[i] = read(records[i]);
    mesh.geometry.setAttribute(name, new THREE.InstancedBufferAttribute(values, 1));
  };
  const vector = (name, read) => {
    const values = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) values.set(read(records[i]), i * 3);
    mesh.geometry.setAttribute(name, new THREE.InstancedBufferAttribute(values, 3));
  };
  scalar('aBloodBorn', record => record.born);
  scalar('aBloodProgress', record => record.progress);
  scalar('aBloodSeed', record => record.seed);
  scalar('aBloodWaveStart', record => record.waveStart);
  scalar('aBloodSize', record => record.size);
  scalar('aBloodVariant', record => record.variant);
  scalar('aBloodTension', record => record.tension);
  scalar('aBloodShatterSpeed', record => record.shatterSpeed);
  vector('aBloodTangent', record => record.tangent.toArray());
  vector('aBloodFragmentDirection', record => record.fragmentDirection.toArray());
}

function makeMist(parent, settings, chainRecords, radius) {
  const count = settings.particleCount;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  const origin = new Float32Array(count * 3), velocity = new Float32Array(count * 3), born = new Float32Array(count), size = new Float32Array(count), seed = new Float32Array(count), kind = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const waveIndex = i % settings.waves.length;
    const wave = settings.waves[waveIndex];
    const chain = chainRecords[(i * 37 + Math.floor(hash(i + 251) * chainRecords.length)) % chainRecords.length];
    const progress = hash(i + 257);
    const source = pointAlongPath(chain.path, progress, new THREE.Vector3());
    const angle = hash(i + 263) * Math.PI * 2;
    const radial = hash(i + 269) * radius * 0.12;
    origin.set([source.x + Math.cos(angle) * radial, source.y + (hash(i + 271) - 0.5) * 0.5, source.z + Math.sin(angle) * radial], i * 3);
    const direction = new THREE.Vector3(Math.cos(angle), hash(i + 277) * 0.85 - 0.18, Math.sin(angle)).normalize();
    velocity.set([direction.x * (1.5 + hash(i + 281) * 7.5), direction.y * (0.4 + hash(i + 283) * 6), direction.z * (1.5 + hash(i + 293) * 7.5)], i * 3);
    born[i] = wave.start + hash(i + 307) * wave.duration + progress * 0.25;
    size[i] = 0.018 + Math.pow(hash(i + 311), 2) * 0.075;
    seed[i] = hash(i + 313);
    kind[i] = hash(i + 317);
  }
  geometry.setAttribute('aOrigin', new THREE.BufferAttribute(origin, 3));
  geometry.setAttribute('aVelocity', new THREE.BufferAttribute(velocity, 3));
  geometry.setAttribute('aBorn', new THREE.BufferAttribute(born, 1));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  geometry.setAttribute('aKind', new THREE.BufferAttribute(kind, 1));
  const uniforms = { uTime: { value: 0 }, uIntensity: { value: 1 } };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: 'attribute vec3 aOrigin;attribute vec3 aVelocity;attribute float aBorn;attribute float aSize;attribute float aSeed;attribute float aKind;uniform float uTime;uniform float uIntensity;varying float vAlpha;varying float vKind;varying float vSeed;void main(){float age=uTime-aBorn;float life=mix(2.6,4.8,aKind);float visible=step(0.0,age)*(1.0-smoothstep(life*0.58,life,age));float t=max(0.0,age);vec3 p=aOrigin+aVelocity*t+vec3(sin(t*3.0+aSeed*24.0)*0.12*t,-0.9*t*t,cos(t*2.4+aSeed*17.0)*0.12*t);vec4 mv=modelViewMatrix*vec4(p,1.0);gl_PointSize=clamp(aSize*(aKind>0.91?1.7:1.0)*uIntensity*150.0/max(2.0,-mv.z),1.0,9.0);gl_Position=projectionMatrix*mv;vAlpha=visible*exp(-t*0.55);vKind=aKind;vSeed=aSeed;}',
    fragmentShader: 'varying float vAlpha;varying float vKind;varying float vSeed;void main(){float r=length(gl_PointCoord-0.5)*2.0;float core=exp(-r*r*11.0);float edge=1.0-smoothstep(0.42,1.0,r);if(edge<0.015)discard;vec3 red=mix(vec3(0.34,0.008,0.028),vec3(0.95,0.055,0.12),core);float alpha=edge*vAlpha*(0.27+core*0.68)*(vKind>0.9?0.46:1.0);gl_FragColor=vec4(red,alpha);}',
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    toneMapped: false
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = 6;
  parent.add(points);
  return { material, uniforms, count };
}

function makeShockwaves(parent, radius, settings) {
  const rings = [];
  const times = settings.waves.map(wave => ({ time: wave.start + wave.duration * 0.78, strength: 0.44 }));
  times.push({ time: settings.shatterTime + 0.06, strength: 0.92 }, { time: settings.shatterTime + 0.86, strength: 0.48 }, { time: settings.shatterTime + 1.62, strength: 0.28 });
  times.forEach((event, index) => {
    const material = new THREE.MeshBasicMaterial({ color: index >= settings.waves.length ? 0xff5263 : 0xc91636, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(1, index >= settings.waves.length ? 0.022 : 0.014, 5, 112), material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = -0.012 + index * 0.004;
    mesh.scale.setScalar(0.001);
    mesh.renderOrder = 4;
    parent.add(mesh);
    rings.push({ mesh, material, time: event.time, strength: event.strength, duration: index >= settings.waves.length ? 1.65 : 0.95, scale: index >= settings.waves.length ? 1.42 : 1.18 });
  });
  return rings;
}

export function createBloodChainNetAttack(parent, index, hex, skill, config, callbacks = {}) {
  const settings = skill.bloodChainNet;
  const root = new THREE.Group();
  parent.add(root);
  root.visible = false;
  const radius = Math.max(4, skill.spread * (config.aoeRadius / skill.aoe) * (config.aoeScale || 1));
  const qualityName = config.quality || 'High';
  const quality = QUALITY[qualityName] || QUALITY.High;
  const density = Math.max(0.62, (config.density || 1) * (config.qualityScale || 1));
  const chainCount = Math.min(settings.chains.hardCap, Math.max(200, Math.round((settings.chains.totalByQuality[qualityName] || quality.chains) * Math.sqrt(density))));
  const totalLinksCap = Math.min(settings.chains.linkHardCap, settings.chains.linkBudgetByQuality[qualityName] || 30000);
  const skyHeight = Math.max(18, radius * settings.skyHeightScale);
  const waveCounts = settings.waves.map(wave => Math.max(1, Math.round(chainCount * wave.share)));
  waveCounts[waveCounts.length - 1] += chainCount - waveCounts.reduce((sum, count) => sum + count, 0);
  const chainPlans = [], variantRecords = [[], [], []], hookRecords = [], groundAnchors = [];
  let chainSequence = 0, totalLinks = 0;
  const dummy = new THREE.Object3D();

  for (let waveIndex = 0; waveIndex < settings.waves.length; waveIndex++) {
    const wave = settings.waves[waveIndex];
    for (let localIndex = 0; localIndex < waveCounts[waveIndex]; localIndex++) {
      const seed = chainSequence * 19.731 + 17;
      const tierRoll = hash(seed + 5);
      const size = tierRoll < 0.025 ? 1.34 + hash(seed + 89) * 0.35 : tierRoll < 0.15 ? 0.92 + hash(seed + 97) * 0.22 : tierRoll < 0.67 ? 0.63 + hash(seed + 101) * 0.21 : 0.43 + hash(seed + 103) * 0.17;
      const path = makePath(waveIndex, localIndex, waveCounts[waveIndex], radius, skyHeight, seed, size);
      const preferredLinks = Math.round(path.length / (0.59 * size));
      const left = chainCount - chainSequence;
      const remainingBudget = Math.max(quality.minimumLinks, Math.floor((totalLinksCap - totalLinks) / Math.max(1, left)));
      const linkCount = clamp(Math.min(preferredLinks, quality.maxLinks, remainingBudget), quality.minimumLinks, quality.maxLinks);
      const strandRecords = [];
      for (let linkIndex = 0; linkIndex < linkCount; linkIndex++) {
        const progress = linkCount <= 1 ? 0 : linkIndex / (linkCount - 1);
        const point = pointAlongPath(path, progress, new THREE.Vector3());
        const before = pointAlongPath(path, Math.max(0, progress - 1 / linkCount), new THREE.Vector3());
        const after = pointAlongPath(path, Math.min(1, progress + 1 / linkCount), new THREE.Vector3());
        const tangent = after.sub(before).normalize();
        if (tangent.lengthSq() < 0.001) tangent.set(0, 1, 0);
        const alternates = (linkIndex + (hash(seed + 107) > 0.5 ? 1 : 0)) % 2 === 1;
        const worldUp = Math.abs(tangent.y) > 0.88 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0);
        let side = new THREE.Vector3().crossVectors(worldUp, tangent).normalize();
        if (side.lengthSq() < 0.001) side.set(1, 0, 0);
        let normal = new THREE.Vector3().crossVectors(tangent, side).normalize();
        if (alternates) [side, normal] = [normal, side];
        const variant = linkIndex % 13 === 5 ? 1 : linkIndex % 7 === 0 ? 2 : 0;
        const fragmentAngle = hash(seed + linkIndex * 7 + 113) * Math.PI * 2;
        const fragmentDirection = new THREE.Vector3(Math.cos(fragmentAngle) * 0.72, 0.25 + hash(seed + linkIndex * 11 + 127) * 0.85, Math.sin(fragmentAngle) * 0.72).normalize();
        const record = {
          point,
          tangent,
          side,
          normal,
          size,
          progress,
          seed: hash(seed + linkIndex * 13 + 131),
          waveStart: wave.start,
          born: wave.start + progress * wave.arrivalDuration + hash(seed + linkIndex * 17 + 137) * 0.11,
          variant,
          tension: 0.36 + hash(seed + linkIndex * 19 + 139) * 0.64,
          shatterSpeed: 3.2 + hash(seed + linkIndex * 23 + 149) * 10.5,
          fragmentDirection,
          chainIndex: chainSequence
        };
        variantRecords[variant].push(record);
        strandRecords.push(record);
      }
      totalLinks += linkCount;
      chainPlans.push({ path, links: strandRecords, waveIndex, waveStart: wave.start, seed, size });
      const tip = strandRecords[strandRecords.length - 1];
      if (tip) {
        hookRecords.push({ ...tip, point: path.points[path.points.length - 1].clone(), progress: 1, born: wave.start + wave.arrivalDuration + 0.06, variant: 2, size: size * 0.86 });
        if (path.points[path.points.length - 1].y < 2.6) groundAnchors.push(path.points[path.points.length - 1].clone());
      }
      chainSequence++;
    }
  }

  const material = makeBloodMaterial(hex);
  const linkGeometries = [buildLinkGeometry(0), buildLinkGeometry(1), buildLinkGeometry(2)];
  const linkMeshes = [];
  for (let variant = 0; variant < linkGeometries.length; variant++) {
    const records = variantRecords[variant];
    if (!records.length) continue;
    const geometry = linkGeometries[variant];
    const mesh = new THREE.InstancedMesh(geometry, material, records.length);
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const x = record.tangent;
      const y = record.side;
      const z = record.normal;
      const basis = new THREE.Matrix4().makeBasis(x, y, z);
      dummy.position.copy(record.point);
      dummy.quaternion.setFromRotationMatrix(basis);
      dummy.scale.set(record.size, record.size, record.size);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    makeChainMaterialAttributes(mesh, records);
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    mesh.renderOrder = 5;
    root.add(mesh);
    linkMeshes.push(mesh);
  }

  const hookGeometry = new THREE.ConeGeometry(0.16, 0.76, 6, 1);
  const barbA = new THREE.ConeGeometry(0.075, 0.27, 5, 1);
  barbA.rotateZ(-Math.PI / 2);
  barbA.translate(0.13, 0.17, 0.02);
  const barbB = new THREE.ConeGeometry(0.075, 0.27, 5, 1);
  barbB.rotateZ(-Math.PI / 2);
  barbB.translate(-0.13, -0.17, -0.02);
  const hookMerged = mergeGeometries([hookGeometry, barbA, barbB], false);
  hookGeometry.dispose(); barbA.dispose(); barbB.dispose();
  const hooks = new THREE.InstancedMesh(hookMerged, material, hookRecords.length);
  hooks.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  const yAxis = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < hookRecords.length; i++) {
    const record = hookRecords[i];
    const quaternion = new THREE.Quaternion().setFromUnitVectors(yAxis, record.tangent);
    dummy.position.copy(record.point);
    dummy.quaternion.copy(quaternion);
    dummy.scale.setScalar(record.size);
    dummy.updateMatrix();
    hooks.setMatrixAt(i, dummy.matrix);
  }
  makeChainMaterialAttributes(hooks, hookRecords);
  hooks.instanceMatrix.needsUpdate = true;
  hooks.frustumCulled = false;
  hooks.renderOrder = 5;
  root.add(hooks);

  const ground = makeGroundMarks(root, radius, { chainCount });
  const lowerPortal = makePortal(root, radius * 0.92, false, -0.015, 0);
  const skyPortal = makePortal(root, radius * 0.74, true, skyHeight * 0.92, -radius * 0.16);
  const mist = makeMist(root, { ...settings, particleCount: Math.max(300, Math.floor(Math.min(settings.particles.particleBudgetByQuality[qualityName] || quality.particles, quality.particles * Math.max(0.55, density)))), waves: settings.waves }, chainPlans, radius);
  const shockwaves = makeShockwaves(root, radius, settings);
  const pose = { position: new THREE.Vector3(), target: new THREE.Vector3() };
  const world = new THREE.Vector3();
  let currentTime = 0, lastWave = -1, slowStarted = false, impactStopped = false, pulse = 0, mood = 0, flash = 0;

  function update(time, intensity = 1) {
    currentTime = time;
    root.visible = time > 0.035 && time < settings.totalDuration + 0.2;
    const portalOpen = smooth(settings.sigil.formStart, settings.sigil.formStart + settings.sigil.formDuration, time);
    const towerFade = 1 - smooth(settings.runeTower.fadeStart, settings.runeTower.fadeStart + settings.runeTower.fadeDuration, time);
    for (const portal of [lowerPortal, skyPortal]) {
      portal.uniforms.uTime.value = time;
      portal.uniforms.uOpen.value = portalOpen;
      portal.uniforms.uIntensity.value = intensity;
      portal.uniforms.uFade.value = towerFade;
      portal.ringMaterial.opacity = portalOpen * towerFade * 0.64 * intensity;
      portal.rings.forEach(({ ring, speed }, ringIndex) => { ring.rotation.z = time * speed * (1 + ringIndex * 0.08); });
    }
    const constrict = smooth(settings.constriction.start, settings.constriction.fullAt, time) * (1 - smooth(settings.shatterTime - 0.02, settings.shatterTime + 0.12, time));
    const bloodUniforms = material.userData.bloodUniforms;
    bloodUniforms.uBloodTime.value = time;
    bloodUniforms.uBloodIntensity.value = intensity;
    bloodUniforms.uBloodConstrict.value = constrict;
    bloodUniforms.uBloodShatterTime.value = settings.shatterTime;
    mist.uniforms.uTime.value = time;
    mist.uniforms.uIntensity.value = intensity;
    ground.stainUniforms.uTime.value = time;
    ground.stainUniforms.uGrow.value = smooth(settings.waves[0].start, settings.waves[0].start + 1.0, time);
    ground.stainUniforms.uFade.value = 1 - smooth(settings.ground.evaporateStart, settings.ground.evaporateStart + settings.ground.evaporateDuration, time);
    ground.stainUniforms.uIntensity.value = intensity;
    const markAlpha = smooth(settings.waves[0].start, settings.waves[0].start + 0.8, time) * ground.stainUniforms.uFade.value * intensity;
    ground.crackMaterial.opacity = markAlpha * 0.55;
    ground.punctureMaterial.opacity = markAlpha * 0.72;

    pulse = 0;
    flash = 0;
    for (let i = 0; i < shockwaves.length; i++) {
      const event = shockwaves[i];
      const age = time - event.time;
      const active = age >= 0 && age < event.duration;
      event.mesh.visible = active;
      if (active) {
        const progress = clamp(age / event.duration);
        const scale = radius * (0.035 + progress * event.scale) * event.strength;
        event.mesh.scale.set(scale, scale, scale);
        event.material.opacity = Math.sin(Math.PI * progress) * event.strength * 0.62 * intensity;
        pulse = Math.max(pulse, Math.sin(Math.PI * progress) * event.strength);
      }
    }

    for (let i = 0; i < settings.waves.length; i++) {
      const wave = settings.waves[i];
      const delta = time - wave.start;
      if (delta >= 0 && delta < 0.62) {
        const beat = Math.exp(-delta * 5.7);
        pulse = Math.max(pulse, beat);
        flash = Math.max(flash, beat * 0.48);
      }
      if (lastWave < i && time >= wave.start) {
        lastWave = i;
        const shake = settings.cameraShake.perWave[i];
        callbacks.triggerCameraShake?.({ shake: shake === 'heavy' ? 1.45 : shake === 'medium' ? 0.88 : 0.48, shakeDuration: i === 4 ? 0.82 : 0.48, shakeFrequency: i === 4 ? 18 : 24, seed: index * 1.31 + i * 3.7 });
        if (i === 4) flash = 1;
      }
    }
    if (!slowStarted && time >= settings.shatterTime - settings.slowMotion.preImpactDuration) {
      slowStarted = true;
      callbacks.beginPreImpactSlowMotion?.(callbacks.plan);
    }
    if (!impactStopped && time >= settings.shatterTime) {
      impactStopped = true;
      callbacks.triggerCameraShake?.({ shake: 1.5, shakeDuration: 1.05, shakeFrequency: 16, seed: index * 1.73 + 37 });
      callbacks.beginImpactHitStop?.(callbacks.plan);
      flash = 1;
    }
    if (time >= settings.shatterTime && time < settings.shatterTime + 0.38) flash = Math.max(flash, 1 - (time - settings.shatterTime) * 2.5);
    mood = smooth(0.9, 3.4, time) * (1 - smooth(settings.totalDuration - 2.9, settings.totalDuration, time));
  }

  function cameraPose() {
    root.getWorldPosition(world);
    if (currentTime < settings.waves[0].start) {
      pose.position.set(world.x + radius * 0.78, world.y + skyHeight * 0.72, world.z + radius * 1.75);
      pose.target.set(world.x, world.y + skyHeight * 0.46, world.z);
    } else if (currentTime < settings.waves[3].start) {
      const angle = currentTime * 0.22;
      pose.position.set(world.x + Math.cos(angle) * radius * 1.75, world.y + radius * 0.9, world.z + Math.sin(angle) * radius * 1.75);
      pose.target.set(world.x, world.y + skyHeight * 0.32, world.z);
    } else if (currentTime < settings.shatterTime + 0.85) {
      const angle = currentTime * 0.16;
      pose.position.set(world.x + Math.cos(angle) * radius * 2.0, world.y + skyHeight * 0.58, world.z + Math.sin(angle) * radius * 2.0);
      pose.target.set(world.x, world.y + skyHeight * 0.22, world.z);
    } else {
      pose.position.set(world.x + radius * 0.88, world.y + skyHeight * 0.9, world.z + radius * 1.45);
      pose.target.set(world.x, world.y + 2, world.z);
    }
    return pose;
  }

  const heatCenter = (out) => root.localToWorld(out.set(0, skyHeight * 0.34, 0));
  const environmentMood = () => mood;
  const flashLevel = () => flash;
  const runePulse = () => pulse;
  return { group: root, update, cameraPose, environmentMood, flashLevel, runePulse, heatCenter, radius, chainCount, linkCount: totalLinks, waveCounts };
}
