import * as THREE from 'three';

const QUALITY = { Low: 0, Medium: 1, High: 2, Ultra: 3 };
const STREAM_BUDGET = [150, 400, 900, 1800];
const PARTICLE_BUDGET = [1200, 2800, 5200, 9000];
const TENDRIL_BUDGET = [16, 32, 64, 120];
const SHARD_BUDGET = [400, 1000, 2200, 4500];
const PURPLE = new THREE.Color(0x7450ac);
const DARK_PURPLE = new THREE.Color(0x26143e);

function smooth(a, b, x) {
  const t = THREE.MathUtils.clamp((x - a) / Math.max(.0001, b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

function qualityIndex(config) {
  return QUALITY[config.quality] ?? QUALITY.High;
}

function makeOrbMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uCompression: { value: 0 }, uCrack: { value: 0 }, uPulse: { value: 0 }, uFlash: { value: 0 }, uPurple: { value: PURPLE }, uDarkPurple: { value: DARK_PURPLE } },
    vertexShader: `
      varying vec3 vNormal; varying vec3 vPosition; varying vec3 vEye;
      uniform float uTime; uniform float uCompression;
      void main(){
        vec3 n=normalize(position); float wobble=sin(n.x*17.0+n.y*11.0+uTime*.7)*sin(n.z*19.0-uTime*.55);
        vec3 p=position*(1.0+wobble*(.012+.018*uCompression));
        vec4 mv=modelViewMatrix*vec4(p,1.0); vNormal=normalize(normalMatrix*normal); vPosition=n; vEye=normalize(-mv.xyz);
        gl_Position=projectionMatrix*mv;
      }`,
    fragmentShader: `
      varying vec3 vNormal; varying vec3 vPosition; varying vec3 vEye;
      uniform float uTime; uniform float uCompression; uniform float uCrack; uniform float uPulse; uniform float uFlash;
      uniform vec3 uPurple; uniform vec3 uDarkPurple;
      float hash(vec3 p){p=fract(p*.3183099+vec3(.1,.2,.3));p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
      float noise(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.0-2.0*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
      void main(){
        vec3 n=normalize(vNormal), eye=normalize(vEye), p=normalize(vPosition);
        float ink=noise(p*(5.0+uCompression*4.0)+vec3(0.0,uTime*.18,-uTime*.11));
        float inkVein=smoothstep(.62,.86,ink)*(.035+.12*uCompression);
        float edge=pow(1.0-clamp(abs(dot(n,eye)),0.0,1.0),5.2);
        float crackNoise=noise(p*vec3(13.0,17.0,11.0)+vec3(uTime*.08,-uTime*.04,uTime*.06));
        float cracks=(1.0-smoothstep(.012,.055,abs(crackNoise-.49)))*uCrack;
        float heartbeat=.82+.18*uPulse;
        vec3 color=vec3(.0015,.0012,.003)+uDarkPurple*inkVein+uPurple*(edge*(.22+.42*uCompression)+cracks*.9+uFlash*.12);
        color*=heartbeat; gl_FragColor=vec4(color,1.0);
      }`,
    transparent: false,
    depthWrite: true,
    side: THREE.FrontSide,
    toneMapped: false,
  });
}

function makeStreamGeometry(count, radius) {
  const segments = 12, along = [], side = [], positions = [];
  for (let i = 0; i < segments; i++) {
    const a = i / segments, b = (i + 1) / segments;
    for (const [t, s] of [[a, -1], [a, 1], [b, 1], [a, -1], [b, 1], [b, -1]]) {
      along.push(t); side.push(s); positions.push(0, 0, 0);
    }
  }
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('aAlong', new THREE.Float32BufferAttribute(along, 1));
  geometry.setAttribute('aSide', new THREE.Float32BufferAttribute(side, 1));
  const angles = new Float32Array(count), radii = new Float32Array(count), heights = new Float32Array(count), seeds = new Float32Array(count), spins = new Float32Array(count), colors = new Float32Array(count * 3);
  const tintChoices = [new THREE.Color(0x9c8cff), new THREE.Color(0x789fff), new THREE.Color(0xb6a0e8), new THREE.Color(0x87c6d1)];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const u = (i + .5) / count;
    angles[i] = i * golden + Math.sin(i * 12.9898) * .12;
    radii[i] = radius * Math.pow(u, .72) * (.94 + (i % 7) * .01);
    heights[i] = i % 5 === 0 ? .5 + ((i * 17) % 29) / 9 : .035 + ((i * 7) % 11) * .008;
    seeds[i] = (i * .61803398875) % 1;
    spins[i] = .4 + ((i * 23) % 61) / 100;
    const color = tintChoices[i % tintChoices.length]; colors.set([color.r, color.g, color.b], i * 3);
  }
  geometry.setAttribute('iAngle', new THREE.InstancedBufferAttribute(angles, 1));
  geometry.setAttribute('iRadius', new THREE.InstancedBufferAttribute(radii, 1));
  geometry.setAttribute('iHeight', new THREE.InstancedBufferAttribute(heights, 1));
  geometry.setAttribute('iSeed', new THREE.InstancedBufferAttribute(seeds, 1));
  geometry.setAttribute('iSpin', new THREE.InstancedBufferAttribute(spins, 1));
  geometry.setAttribute('iColor', new THREE.InstancedBufferAttribute(colors, 3));
  geometry.instanceCount = count;
  return geometry;
}

function makeParticleField(count, radius) {
  const positions = new Float32Array(count * 3), data = new Float32Array(count * 4);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const a = i * golden, r = radius * Math.sqrt((i + .5) / count);
    positions.set([Math.cos(a) * r, .08 + ((i * 13) % 31) / 18, Math.sin(a) * r], i * 3);
    data.set([a, r, (i * .41421356) % 1, .45 + ((i * 31) % 100) / 100], i * 4);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(data, 4));
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uStrength: { value: 0 }, uOrbY: { value: 4.3 }, uOrbRadius: { value: .5 }, uRadius: { value: radius } },
    vertexShader: `attribute vec4 aSeed; uniform float uTime; uniform float uStrength; uniform float uOrbY; uniform float uOrbRadius; uniform float uRadius; varying float vAlpha; varying float vTwinkle;
      void main(){float head=fract(aSeed.z+uTime*(.075+aSeed.w*.025));float q=head;float angle=aSeed.x+q*3.4+uTime*.12;float r=mix(aSeed.y,uOrbRadius*1.2,pow(q,.75));vec3 p=vec3(cos(angle)*r,mix(position.y,uOrbY,q)+sin(q*3.14159)*.55,sin(angle)*r);vec4 mv=modelViewMatrix*vec4(p,1.0);gl_PointSize=clamp((1.1+aSeed.w*1.8)*32.0/max(1.0,-mv.z),1.0,5.0);gl_Position=projectionMatrix*mv;vAlpha=uStrength*(.24+.76*sin(aSeed.z*31.0+uTime*2.0)*sin(aSeed.z*31.0+uTime*2.0))*(1.0-smoothstep(.82,1.0,head));vTwinkle=.45+.55*sin(aSeed.z*43.0+uTime*4.0);}`,
    fragmentShader: `varying float vAlpha; varying float vTwinkle; void main(){float d=length(gl_PointCoord-.5)*2.0;float a=pow(max(0.0,1.0-d),2.0);gl_FragColor=vec4(vec3(.52,.46,.86)*1.35,a*vAlpha*vTwinkle);}`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  });
  return new THREE.Points(geometry, material);
}

function makeGroundOverlay(radius) {
  const material = new THREE.ShaderMaterial({
    uniforms: { uRadius: { value: radius }, uDrainRadius: { value: 0 }, uDrain: { value: 0 }, uBurst: { value: 0 }, uTime: { value: 0 } },
    vertexShader: `varying vec2 vGround; void main(){vGround=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `uniform float uRadius; uniform float uDrainRadius; uniform float uDrain; uniform float uBurst; uniform float uTime; varying vec2 vGround;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);} void main(){float d=length(vGround);float n=hash(floor(vGround*1.8));float edge=uDrainRadius+(n-.5)*1.4;float mask=(1.0-smoothstep(edge-1.7,edge+1.2,d))*smoothstep(0.0,1.4,uDrainRadius);float veins=step(.91,fract((atan(vGround.y,vGround.x)+uTime*.03)*7.0+d*.22+n*.25));float alpha=clamp(mask*uDrain*.52+mask*veins*.11+uBurst*(1.0-smoothstep(uRadius*.25,uRadius,d))*.08,0.0,.68);if(alpha<.005)discard;vec3 color=mix(vec3(.006,.004,.012),vec3(.09,.045,.16),veins*.3+uBurst*.25);gl_FragColor=vec4(color,alpha);}`,
    transparent: true, depthWrite: false, blending: THREE.NormalBlending, side: THREE.DoubleSide, toneMapped: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2.3, radius * 2.3), material);
  mesh.rotation.x = -Math.PI / 2; mesh.position.y = .014; mesh.renderOrder = 1;
  return mesh;
}

function makeTendrils(parent, count, centerY, orbRadius) {
  const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(.15, .28, .03), new THREE.Vector3(-.1, .6, .12), new THREE.Vector3(.04, 1, .08)];
  const geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 18, .018, 5, false);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) seeds[i] = i * .61803398875;
  geometry.setAttribute('iSeed', new THREE.InstancedBufferAttribute(seeds, 1));
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uTension: { value: 0 }, uBurst: { value: 0 }, uOpacity: { value: 0 } },
    vertexShader: `attribute float iSeed; uniform float uTime; uniform float uTension; uniform float uBurst; varying vec3 vNormal; varying vec3 vEye; varying float vAlong;
      void main(){vec3 p=position;vAlong=clamp(position.y,0.0,1.0);float w=sin(uTime*(1.4+iSeed*.4)+vAlong*9.0+iSeed*6.28);p.x+=w*vAlong*(.06+.18*uTension);p.z+=cos(uTime*1.2+iSeed*8.0+vAlong*7.0)*vAlong*(.06+.2*uTension);p.y*=1.0+uBurst*10.0;vec4 local=instanceMatrix*vec4(p,1.0);vec4 mv=modelViewMatrix*local;vNormal=normalize(normalMatrix*mat3(instanceMatrix)*normal);vEye=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `uniform float uOpacity; varying vec3 vNormal; varying vec3 vEye; varying float vAlong; void main(){float rim=pow(1.0-abs(dot(normalize(vNormal),normalize(vEye))),2.3);vec3 c=mix(vec3(.008,.005,.014),vec3(.29,.16,.46),rim*.72);float a=uOpacity*(.34+rim*.45)*(1.0-.38*vAlong);gl_FragColor=vec4(c,a);}`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.NormalBlending, toneMapped: false,
  });
  const mesh = new THREE.InstancedMesh(geometry, material, count), dummy = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0);
  const center = new THREE.Vector3(0, centerY, 0);
  for (let i = 0; i < count; i++) {
    const a = i * 2.399963, direction = new THREE.Vector3(Math.cos(a), .18 + (i % 5) * .055, Math.sin(a)).normalize();
    dummy.position.copy(center).addScaledVector(direction, orbRadius * .74); dummy.quaternion.setFromUnitVectors(up, direction);
    dummy.scale.setScalar(.62 + (i % 7) * .08); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage); mesh.count = 0; parent.add(mesh);
  return mesh;
}

function makeShardField(parent, count) {
  const base = new THREE.IcosahedronGeometry(1, 0), geometry = new THREE.InstancedBufferGeometry();
  if (base.index) geometry.setIndex(base.index.clone());
  for (const [name, attribute] of Object.entries(base.attributes)) geometry.setAttribute(name, attribute.clone());
  const dirs = new Float32Array(count * 3), seeds = new Float32Array(count), speeds = new Float32Array(count), sizes = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const y = 1 - 2 * (i + .5) / count, a = i * 2.399963, r = Math.sqrt(Math.max(0, 1 - y * y));
    dirs.set([r * Math.cos(a), y, r * Math.sin(a)], i * 3); seeds[i] = (i * .754877666) % 1; speeds[i] = .55 + ((i * 29) % 100) / 90; sizes[i] = .025 + ((i * 17) % 50) / 1000;
  }
  geometry.setAttribute('iDirection', new THREE.InstancedBufferAttribute(dirs, 3)); geometry.setAttribute('iSeed', new THREE.InstancedBufferAttribute(seeds, 1));
  geometry.setAttribute('iSpeed', new THREE.InstancedBufferAttribute(speeds, 1)); geometry.setAttribute('iSize', new THREE.InstancedBufferAttribute(sizes, 1)); geometry.instanceCount = count;
  base.dispose();
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uDistance: { value: 0 }, uOpacity: { value: 0 }, uCenterY: { value: 4.3 } },
    vertexShader: `attribute vec3 iDirection; attribute float iSeed; attribute float iSpeed; attribute float iSize; uniform float uTime; uniform float uDistance; uniform float uCenterY; varying vec3 vNormal; varying vec3 vEye; varying float vSeed;
      void main(){float rot=uTime*(.25+iSpeed*.35)+iSeed*6.28318;vec3 p=position*iSize;float cs=cos(rot),sn=sin(rot);p.xz=mat2(cs,-sn,sn,cs)*p.xz;p+=iDirection*(uDistance*iSpeed);p.y+=uCenterY+sin(uTime*2.0+iSeed*16.0)*.3;vec4 mv=modelViewMatrix*vec4(p,1.0);vNormal=normalize(normalMatrix*normal);vEye=normalize(-mv.xyz);vSeed=iSeed;gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `uniform float uOpacity; varying vec3 vNormal; varying vec3 vEye; varying float vSeed; void main(){float edge=pow(1.0-abs(dot(normalize(vNormal),normalize(vEye))),2.0);vec3 c=mix(vec3(.009,.006,.018),vec3(.46,.31,.69),edge);gl_FragColor=vec4(c,uOpacity*(.28+.65*edge)*(.72+.28*sin(vSeed*97.0)));}`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.NormalBlending, toneMapped: false,
  });
  const mesh = new THREE.Mesh(geometry, material); mesh.frustumCulled = false; parent.add(mesh);
  return mesh;
}

function makeShockwave(color, opacity) {
  const material = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: opacity }, uTime: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `uniform vec3 uColor; uniform float uOpacity; uniform float uTime; varying vec2 vUv; void main(){float n=.83+.17*sin(vUv.x*53.0+uTime*2.0)*sin(vUv.y*19.0-uTime);float edge=smoothstep(.0,.18,vUv.y)*(1.0-smoothstep(.82,1.0,vUv.y));gl_FragColor=vec4(uColor*n,uOpacity*edge);}`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
  });
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(1, .035, 8, 128), material);
  mesh.rotation.x = -Math.PI / 2; mesh.position.y = .045; mesh.scale.setScalar(.001); mesh.visible = false;
  return mesh;
}

export function createShadowOrbAttack(parent, index, hex, skill, config, callbacks, camera) {
  const settings = skill.shadowOrbCataclysm;
  const quality = qualityIndex(config), aoeScale = THREE.MathUtils.clamp(config.aoeRadius / skill.aoe, .55, 1.55);
  const qualityName = config.quality.toLowerCase();
  const streamCount = settings.absorb.streamsByQuality[qualityName] ?? STREAM_BUDGET[quality];
  const particleCount = settings.absorb.particlesByQuality[qualityName] ?? PARTICLE_BUDGET[quality];
  const tendrilCount = settings.orb.tentacles[qualityName] ?? TENDRIL_BUDGET[quality];
  const shardCount = settings.detonation.shardsByQuality[qualityName] ?? SHARD_BUDGET[quality];
  const worldScale = 1 / settings.worldUnitsPerMeter;
  const areaRadius = Math.min(skill.spread * aoeScale, settings.aoeRadius * worldScale * aoeScale);
  const absorbRadius = settings.absorb.maxRadius * worldScale * aoeScale;
  const startRadius = settings.orb.startRadius * worldScale, maxRadius = settings.orb.maxRadius * worldScale;
  const centerY = settings.orb.hoverHeight * worldScale;
  const seed = (index + 1) * 71.13;
  const root = new THREE.Group(); root.name = 'Vạn Ảnh Thiên Kiếp · Quả cầu hấp thụ'; root.visible = false; parent.add(root);

  const orbMaterial = makeOrbMaterial();
  const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 5), orbMaterial); orb.position.y = centerY; orb.scale.setScalar(startRadius); root.add(orb);
  const haloMaterial = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uAlpha: { value: 0 } },
    vertexShader: `varying vec3 vNormal;varying vec3 vEye;void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);vNormal=normalize(normalMatrix*normal);vEye=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `uniform float uTime;uniform float uAlpha;varying vec3 vNormal;varying vec3 vEye;void main(){float rim=pow(1.0-abs(dot(normalize(vNormal),normalize(vEye))),3.0);float pulse=.85+.15*sin(uTime*2.0);gl_FragColor=vec4(vec3(.014,.007,.025),rim*uAlpha*pulse);}`,
    transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.NormalBlending, toneMapped: false,
  });
  const umbra = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), haloMaterial); umbra.position.copy(orb.position); umbra.scale.setScalar(startRadius * 2.0); root.add(umbra);

  const streams = new THREE.Mesh(makeStreamGeometry(streamCount, absorbRadius), new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uStrength: { value: 0 }, uOrbY: { value: centerY }, uOrbRadius: { value: startRadius }, uSpeed: { value: 1 }, uWidth: { value: 1 }, uSpiral: { value: settings.absorb.spiralTightness }, uBurst: { value: 0 } },
    vertexShader: `attribute float aAlong;attribute float aSide;attribute float iAngle;attribute float iRadius;attribute float iHeight;attribute float iSeed;attribute float iSpin;attribute vec3 iColor;uniform float uTime;uniform float uStrength;uniform float uOrbY;uniform float uOrbRadius;uniform float uSpeed;uniform float uWidth;uniform float uSpiral;uniform float uBurst;varying float vAlpha;varying vec3 vColor;
      void main(){float inwardHead=fract(iSeed+uTime*(.12+iSpin*.045)*uSpeed);float outwardHead=fract(iSeed*.37+uTime*.42);float head=mix(inwardHead,outwardHead,uBurst);float q=clamp(head-(1.0-aAlong)*.23,0.0,1.0);float angle=iAngle+q*(2.2+iSpin*2.0+uSpiral*2.2)+uTime*(.08+iSpin*.03);float inwardRadius=mix(iRadius,uOrbRadius*1.16,pow(q,.72));float outwardRadius=mix(uOrbRadius*1.16,iRadius,pow(q,.72));float radial=mix(inwardRadius,outwardRadius,uBurst);float width=(.009+iSeed*.009)*uWidth*(1.0-.72*q);vec3 side=vec3(-sin(angle),0.0,cos(angle));float inwardY=mix(iHeight,uOrbY,q),outwardY=mix(uOrbY,iHeight,q);vec3 p=vec3(cos(angle)*radial,mix(inwardY,outwardY,uBurst)+sin(q*3.14159)*(.38+iSpin*.45),sin(angle)*radial)+side*(aSide*width);vec4 mv=modelViewMatrix*vec4(p,1.0);gl_Position=projectionMatrix*mv;float ends=smoothstep(.015,.16,head)*(1.0-smoothstep(.78,1.0,head));vAlpha=uStrength*ends*(.18+.82*sin(iSeed*41.0+uTime*2.0)*sin(iSeed*41.0+uTime*2.0))*(.58+.42*(1.0-q));vColor=mix(mix(iColor,vec3(.31,.18,.49),smoothstep(.2,1.0,q)),mix(vec3(.31,.18,.49),iColor,smoothstep(.0,.9,q)),uBurst);}`,
    fragmentShader: `varying float vAlpha;varying vec3 vColor;void main(){float a=vAlpha*(.65+.35*sin(vAlpha*87.0));gl_FragColor=vec4(vColor*1.3,a);}`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  })); streams.frustumCulled = false; root.add(streams);

  const particles = makeParticleField(particleCount, absorbRadius); root.add(particles);
  const ground = makeGroundOverlay(absorbRadius); root.add(ground);
  const tendrils = makeTendrils(root, tendrilCount, centerY, startRadius);
  const burst = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 5), new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uAlpha: { value: 0 }, uNoise: { value: .03 }, uFlash: { value: 0 } },
    vertexShader: `varying vec3 vN;varying vec3 vP;varying vec3 vEye;uniform float uTime;uniform float uNoise;void main(){vec3 n=normalize(position);float d=sin(n.x*9.0+uTime)*sin(n.y*11.0-uTime*.7)*sin(n.z*13.0+uTime*.4);vec3 p=position*(1.0+d*uNoise);vec4 mv=modelViewMatrix*vec4(p,1.0);vN=normalize(normalMatrix*normal);vP=n;vEye=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `uniform float uTime;uniform float uAlpha;uniform float uFlash;varying vec3 vN;varying vec3 vP;varying vec3 vEye;void main(){float edge=pow(1.0-abs(dot(normalize(vN),normalize(vEye))),1.65);float noise=.5+.5*sin(vP.x*17.0+vP.y*11.0+vP.z*15.0+uTime*3.0);vec3 c=mix(vec3(.001,.001,.003),vec3(.24,.11,.4),smoothstep(.12,.88,edge+noise*.14));c+=vec3(.24,.13,.39)*edge*.45+vec3(.35,.26,.5)*uFlash*.42;gl_FragColor=vec4(c,uAlpha*(.82+noise*.14));}`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.NormalBlending, toneMapped: false,
  }));
  burst.position.y = centerY; burst.scale.setScalar(.001); burst.visible = false; root.add(burst);

  const shards = makeShardField(root, shardCount);
  const shockwaves = [makeShockwave(0xb9a0ed, .72), makeShockwave(0x3b255d, .48), makeShockwave(0x9270bf, .34)];
  shockwaves.forEach(mesh => root.add(mesh));
  const embers = makeShockwave(0x6b4b91, .24); embers.scale.setScalar(.001); root.add(embers);
  const worldPoint = new THREE.Vector3();
  const cameraPose = { position: new THREE.Vector3(), target: new THREE.Vector3() };
  let currentTime = 0, currentMood = 0, currentFlash = 0, currentPull = 0, currentVignette = 0;
  let preSlowTriggered = false, overloadTriggered = false, burstTriggered = false, lastWave = -1;
  let currentWave = -1, lastIntensity = 1;
  const aftershockEvents = Array(settings.aftershock.count).fill(false);

  function getOrbWorldPoint(out) {
    root.updateWorldMatrix(true, false);
    return out.copy(orb.position).applyMatrix4(root.matrixWorld);
  }

  function update(time, intensity = 1, density = 1, realDt = 0) {
    currentTime = Math.max(0, time); lastIntensity = intensity;
    root.visible = currentTime < settings.totalDuration;
    if (!root.visible) return;
    const t = currentTime, seedProgress = smooth(2.45, settings.orb.seedDuration + 2.45, t);
    const waves = settings.waves.map(wave => smooth(wave.start, wave.start + .32, t) * (1 - smooth(wave.start + wave.duration - .12, wave.start + wave.duration + .3, t)));
    const activeWave = waves.reduce((best, value, i) => value > best.value ? { index: i, value } : best, { index: -1, value: 0 });
    currentWave = activeWave.index;
    const absorption = smooth(4.25, 4.85, t) * (1 - smooth(12.0, 13.1, t));
    const waveStrength = activeWave.index >= 0 ? settings.absorb.strengthByWave[activeWave.index] : .2;
    currentPull = absorption * (.22 + Math.max(...waves) * (.48 + waveStrength * .3));
    const overload = smooth(settings.overload.start, settings.overload.start + .2, t) * (1 - smooth(settings.detonation.start, settings.detonation.start + .18, t));
    const detonationAge = Math.max(0, t - settings.detonation.start);
    const blast = t >= settings.detonation.start ? Math.exp(-Math.max(0, detonationAge - .18) * .75) * smooth(0, .16, detonationAge) : 0;
    const aftermath = smooth(settings.detonation.start + .3, settings.totalDuration - 1.2, t);
    const cleanup = smooth(settings.totalDuration - 1.1, settings.totalDuration, t);
    currentMood = Math.min(.76, .08 + .67 * smooth(1.2, 12.5, t)) * (1 - smooth(14.9, 17.0, t));
    currentMood = Math.max(currentMood, overload * .72) * (1 - cleanup);
    currentFlash = Math.max(0, 1 - detonationAge / .22) * (config.reducedMotion ? .05 : .22) + (t >= settings.detonation.start ? blast * (config.reducedMotion ? .025 : .08) : 0);
    currentVignette = Math.max(overload * settings.overload.vignette, currentPull * .12) * (1 - aftermath * .75);

    if (!preSlowTriggered && t >= settings.overload.start - .06) { preSlowTriggered = true; callbacks.beginPreImpactSlowMotion({ ...callbacks.plan, preSlowDuration: settings.slowMotion.overloadDuration, preSlowScale: settings.slowMotion.overloadScale }); }
    if (!overloadTriggered && t >= settings.overload.start) { overloadTriggered = true; callbacks.triggerCameraShake({ ...callbacks.plan, shake: callbacks.plan.shake * .38, shakeDuration: .9, shakeFrequency: 7, seed: seed + 2 }); }
    if (activeWave.index > lastWave && activeWave.index >= 0 && activeWave.value > .08) {
      lastWave = activeWave.index;
      callbacks.triggerCameraShake({ ...callbacks.plan, shake: callbacks.plan.shake * (.2 + activeWave.index * .1), shakeDuration: .42, shakeFrequency: 7 + activeWave.index, seed: seed + activeWave.index * 3.1 });
    }
    if (!burstTriggered && t >= settings.detonation.start) {
      burstTriggered = true;
      callbacks.beginImpactHitStop({ ...callbacks.plan, hitStop: settings.hitStop.duration, postSlowScale: settings.slowMotion.postBurstScale, postSlowDuration: settings.slowMotion.postBurstDuration });
      callbacks.triggerCameraShake({ ...callbacks.plan, shake: callbacks.plan.shake * 1.25, shakeDuration: .72, shakeFrequency: 18, seed: seed + 8 });
    }

    const waveIndex = Math.max(0, Math.min(settings.waves.length - 1, activeWave.index));
    const pulseHz = settings.orb.pulseHzByWave[waveIndex] || settings.orb.pulseHzByWave[0];
    const heartbeat = .91 + .09 * Math.sin(t * pulseHz * Math.PI * 2 + Math.sin(t * .7));
    const compress = smooth(4.5, 12.0, t);
    const swell = 1 + .68 * smooth(4.5, 10.8, t);
    const coreScale = THREE.MathUtils.lerp(startRadius * .18, startRadius * swell, seedProgress) * heartbeat * (1 - overload * .63 + blast * .08);
    orb.scale.setScalar(Math.max(startRadius * .09, Math.min(maxRadius, coreScale)));
    orb.rotation.set(t * .19, t * .31, t * -.14);
    orb.position.y = centerY + Math.sin(t * 1.15) * .07;
    orbMaterial.uniforms.uTime.value = t; orbMaterial.uniforms.uCompression.value = compress; orbMaterial.uniforms.uCrack.value = smooth(7.9, 10.4, t); orbMaterial.uniforms.uPulse.value = pulseHz; orbMaterial.uniforms.uFlash.value = currentFlash;
    haloMaterial.uniforms.uTime.value = t; haloMaterial.uniforms.uAlpha.value = .15 + currentPull * .24 + overload * .18;
    const pull = Math.max(currentPull, smooth(settings.overload.start - .3, settings.overload.start, t) * (1 - smooth(settings.detonation.start - .05, settings.detonation.start + .1, t)) * .25);
    const releaseStreams = t >= settings.detonation.start ? .92 * (1 - smooth(settings.detonation.start + 1.25, settings.detonation.start + 2.5, t)) : 0;
    streams.material.uniforms.uTime.value = t; streams.material.uniforms.uStrength.value = Math.max(pull, releaseStreams) * intensity; streams.material.uniforms.uOrbY.value = orb.position.y; streams.material.uniforms.uOrbRadius.value = orb.scale.x; streams.material.uniforms.uSpeed.value = 1 + compress * 2.8; streams.material.uniforms.uWidth.value = .72 + intensity * .3; streams.material.uniforms.uBurst.value = releaseStreams;
    streams.geometry.instanceCount = Math.max(0, Math.round(streamCount * THREE.MathUtils.clamp(density * (config.qualityScale || 1), .2, 1)));
    particles.material.uniforms.uTime.value = t; particles.material.uniforms.uStrength.value = pull * intensity; particles.material.uniforms.uOrbY.value = orb.position.y; particles.material.uniforms.uOrbRadius.value = orb.scale.x;
    particles.visible = pull > .015;
    const drain = smooth(4.4, 5.1, t) * (1 - smooth(15.4, 16.9, t));
    const drainRadius = absorbRadius * THREE.MathUtils.clamp((t - 4.35) * settings.absorb.groundDrainSpeed / Math.max(1, settings.absorb.maxRadius), 0, 1);
    ground.material.uniforms.uDrain.value = drain; ground.material.uniforms.uDrainRadius.value = drainRadius; ground.material.uniforms.uBurst.value = Math.max(0, blast - .12) * (1 - aftermath); ground.material.uniforms.uTime.value = t;
    ground.visible = drain > .01 || (blast > .01 && aftermath < .96);
    const tendrilMaterial = tendrils.material; tendrilMaterial.uniforms.uTime.value = t; tendrilMaterial.uniforms.uTension.value = compress; tendrilMaterial.uniforms.uBurst.value = smooth(0, .32, detonationAge) * (1 - smooth(1.6, 3.2, detonationAge));
    tendrilMaterial.uniforms.uOpacity.value = (.18 + compress * .32 + blast * .2) * (1 - cleanup); tendrils.count = Math.round(tendrilCount * THREE.MathUtils.clamp(density, .25, 1));
    const burstRadius = settings.detonation.burstRadius * worldScale * aoeScale;
    burst.visible = t >= settings.detonation.start && detonationAge < 2.8;
    const burstEase = smooth(0, .26, detonationAge) * (1 - smooth(2.2, 3.1, detonationAge));
    burst.scale.setScalar(Math.max(.001, burstRadius * burstEase)); burst.material.uniforms.uTime.value = t; burst.material.uniforms.uNoise.value = .08 + burstEase * .09; burst.material.uniforms.uAlpha.value = Math.max(0, .82 * (1 - smooth(1.15, 2.8, detonationAge))); burst.material.uniforms.uFlash.value = currentFlash;
    shards.material.uniforms.uTime.value = t; shards.material.uniforms.uCenterY.value = centerY; shards.material.uniforms.uDistance.value = burstRadius * smooth(0, .8, detonationAge); shards.material.uniforms.uOpacity.value = t >= settings.detonation.start ? Math.max(0, .92 * (1 - smooth(1.25, 3.4, detonationAge))) : 0;
    shards.geometry.instanceCount = Math.round(shardCount * THREE.MathUtils.clamp(density, .25, 1));
    shockwaves.forEach((mesh, i) => {
      const wave = settings.shockwaves[i], age = t - settings.detonation.start - i * .12;
      const active = age >= 0 && age < 2.7;
      mesh.visible = active; mesh.material.uniforms.uTime.value = t;
      if (active) { const p = smooth(0, 2.45, age); mesh.scale.setScalar(Math.max(.001, burstRadius * p * (wave.radius / settings.detonation.burstRadius))); mesh.material.uniforms.uOpacity.value = (.76 - i * .14) * (1 - smooth(1.75, 2.7, age)) * intensity; }
    });
    embers.visible = detonationAge > .45 && detonationAge < 4.2; embers.material.uniforms.uTime.value = t;
    if (embers.visible) { const q = detonationAge - .45; embers.scale.setScalar(burstRadius * (.35 + q * .12)); embers.material.uniforms.uOpacity.value = .25 * (1 - smooth(2.3, 4.2, detonationAge)); }
    if (activeWave.index >= 0 && activeWave.index !== currentWave) currentWave = activeWave.index;
    if (t > settings.aftershock.start) {
      for (let i = 0; i < settings.aftershock.count; i++) {
        if (!aftershockEvents[i] && t >= settings.aftershock.start + i * settings.aftershock.interval) {
          aftershockEvents[i] = true;
          callbacks.triggerCameraShake({ ...callbacks.plan, shake: callbacks.plan.shake * .18 * Math.pow(settings.aftershock.decay, i), shakeDuration: .36, shakeFrequency: 6 + i, seed: seed + 12 + i });
        }
      }
    }
  }

  function cameraPoseAt() {
    const stage = currentTime < 4.5 ? 0 : currentTime < 8.8 ? 1 : currentTime < settings.overload.start ? 2 : currentTime < settings.detonation.start ? 3 : 4;
    const local = [new THREE.Vector3(areaRadius * .52, centerY + 8, areaRadius * 1.05), new THREE.Vector3(areaRadius * .9, centerY + 5, areaRadius * 1.25), new THREE.Vector3(areaRadius * .62, centerY + 2.8, areaRadius * .72), new THREE.Vector3(areaRadius * .38, centerY + 1.65, areaRadius * .4), new THREE.Vector3(areaRadius * 1.5, centerY + 6, areaRadius * 1.7)][stage];
    root.updateWorldMatrix(true, false);
    cameraPose.position.copy(root.localToWorld(local.clone())); cameraPose.target.copy(root.localToWorld(new THREE.Vector3(0, centerY, 0)));
    return cameraPose;
  }

  function screenRadius(activeCamera) {
    const point = getOrbWorldPoint(new THREE.Vector3()).project(activeCamera), edge = getOrbWorldPoint(new THREE.Vector3()).add(new THREE.Vector3(absorbRadius, 0, 0)).project(activeCamera);
    return THREE.MathUtils.clamp(Math.hypot(point.x - edge.x, point.y - edge.y) * .5, .1, .44);
  }

  return {
    group: root, update, cameraPose: cameraPoseAt,
    environmentMood: () => currentMood,
    flashLevel: () => currentFlash,
    distortionLevel: () => currentPull * .65 + currentVignette * .22 + currentFlash * .2,
    vignetteLevel: () => currentVignette,
    heatCenter: out => getOrbWorldPoint(out),
    screenRadius,
    lightPosition: () => getOrbWorldPoint(worldPoint),
    runePulse: () => currentPull * .42 + currentFlash * .18,
    runeDrain: () => currentPull * .24,
    cameraPull: () => Math.max(0, .18 * (1 - smooth(settings.detonation.start, settings.detonation.start + 2.2, currentTime))),
    phaseName: () => currentTime < 2.5 ? 'seed' : currentTime < 4.5 ? 'forming-orb' : currentTime < 12 ? 'devouring' : currentTime < 13.5 ? 'overload' : currentTime < 15 ? 'detonation' : 'aftermath',
  };
}
