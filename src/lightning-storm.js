import * as THREE from 'three';

const QUALITY = {
  Low: { bolts: 1100, segments: 36, sparks: 900 },
  Medium: { bolts: 1900, segments: 52, sparks: 1700 },
  High: { bolts: 3500, segments: 70, sparks: 2800 },
  Ultra: { bolts: 5800, segments: 77, sparks: 4200 },
};

function randomSource(seed) {
  let state = (Math.floor(seed * 1000003) ^ 0x9e3779b9) >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function makeStormCloudMaterial(layer, hex) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uForm: { value: 0 }, uFade: { value: 1 },
      uFlash: { value: 0 }, uTint: { value: new THREE.Color(hex) }, uLayer: { value: layer },
    },
    vertexShader: `
      varying vec3 vLocal;
      varying vec3 vNormalLocal;
      void main(){
        vLocal=position;
        vNormalLocal=normal;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime; uniform float uForm; uniform float uFade; uniform float uFlash; uniform float uLayer;
      uniform vec3 uTint; varying vec3 vLocal; varying vec3 vNormalLocal;
      float hash31(vec3 p){p=fract(p*.1031);p+=dot(p,p.yxz+33.33);return fract((p.x+p.y)*p.z);}
      float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(mix(hash31(i),hash31(i+vec3(1,0,0)),f.x),mix(hash31(i+vec3(0,1,0)),hash31(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash31(i+vec3(0,0,1)),hash31(i+vec3(1,0,1)),f.x),mix(hash31(i+vec3(0,1,1)),hash31(i+vec3(1,1,1)),f.x),f.y),f.z);}
      void main(){
        vec3 p=vLocal*vec3(2.6,1.75,2.6)+vec3(uTime*.012,uTime*.022,-uTime*.009);
        float n=noise3(p)+.52*noise3(p*2.05+5.7)+.24*noise3(p*4.1-2.3);
        float body=smoothstep(.72,1.12,n);
        float rim=(1.0-smoothstep(.025,.16,abs(n-.72)))*body;
        float cloudEdge=smoothstep(-.9,-.1,vNormalLocal.y)*(.86+.14*smoothstep(.45,.9,vNormalLocal.y));
        float alpha=body*cloudEdge*uForm*uFade*(.58+uLayer*.055);
        vec3 color=uTint*(.68+smoothstep(.72,1.25,n)*.38);
        color+=vec3(.22,.31,.5)*uFlash*(.18+rim*.82+body*.16);
        gl_FragColor=vec4(color,alpha);
      }
    `,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.NormalBlending, toneMapped: false,
  });
}

function makeBoltShapes(variantCount, segmentCount, seed, jaggedness = .35, branchDepth = 3) {
  const rand = randomSource(seed);
  const texels = variantCount * segmentCount * 4;
  const starts = new Float32Array(texels), ends = new Float32Array(texels);
  for (let variant = 0; variant < variantCount; variant++) {
    const segments = [];
    const trunkCount = Math.max(18, Math.round(segmentCount * .64));
    const trunk = [{ x: 0, y: 1.07, z: 0 }];
    for (let i = 1; i <= trunkCount; i++) {
      const t = i / trunkCount, prev = trunk[i - 1], taper = .32 + t * .48;
      trunk.push({
        x: prev.x + (rand() - .5) * .22 * taper * (jaggedness / .35),
        y: 1.07 - t * 1.07,
        z: prev.z + (rand() - .5) * .22 * taper * (jaggedness / .35),
      });
      segments.push({ a: trunk[i - 1], b: trunk[i], branch: 0 });
    }
    const branchSlots = segmentCount - segments.length;
    for (let i = 2; branchDepth > 0 && i < trunkCount && segments.length < segmentCount; i += 2 + Math.floor(rand() * 3)) {
      const root = trunk[i], direction = rand() < .5 ? -1 : 1;
      const split = { x: root.x + direction * (.045 + rand() * .13), y: root.y - (.025 + rand() * .065), z: root.z + (rand() - .5) * .08 };
      const tip = { x: split.x + direction * (.055 + rand() * .14), y: Math.max(.035, split.y - (.04 + rand() * .13)), z: split.z + (rand() - .5) * .11 };
      if (segments.length + 2 > segmentCount) break;
      segments.push({ a: root, b: split, branch: 1 }, { a: split, b: tip, branch: 1 });
      if (branchDepth > 1 && segments.length < segmentCount && rand() < .58) {
        const twig = { x: split.x - direction * (.025 + rand() * .08), y: Math.max(.02, split.y - (.02 + rand() * .07)), z: split.z + (rand() - .5) * .13 };
        segments.push({ a: split, b: twig, branch: 2 });
      }
    }
    for (let i = 0; i < segmentCount; i++) {
      const item = segments[i] || { a: { x: 0, y: 0, z: 0 }, b: { x: 0, y: 0, z: 0 }, branch: 3 };
      const p = (variant * segmentCount + i) * 4;
      starts[p] = item.a.x; starts[p + 1] = item.a.y; starts[p + 2] = item.a.z; starts[p + 3] = item.branch;
      ends[p] = item.b.x; ends[p + 1] = item.b.y; ends[p + 2] = item.b.z; ends[p + 3] = item.branch;
    }
    if (segments.length > segmentCount || branchSlots < 0) throw new Error('[Lightning Storm] Segment budget overflow.');
  }
  const startTexture = new THREE.DataTexture(starts, segmentCount, variantCount, THREE.RGBAFormat, THREE.FloatType);
  const endTexture = new THREE.DataTexture(ends, segmentCount, variantCount, THREE.RGBAFormat, THREE.FloatType);
  for (const texture of [startTexture, endTexture]) {
    texture.minFilter = THREE.NearestFilter; texture.magFilter = THREE.NearestFilter;
    texture.generateMipmaps = false; texture.needsUpdate = true;
  }
  return { startTexture, endTexture, starts, ends };
}

function makeBoltGeometry(segmentCount, boltCount, seed) {
  const geometry = new THREE.InstancedBufferGeometry();
  const vertices = segmentCount * 6;
  const positions = new Float32Array(vertices * 3), segments = new Float32Array(vertices), points = new Float32Array(vertices), sides = new Float32Array(vertices), progress = new Float32Array(vertices);
  const corners = [[0,-1],[1,-1],[1,1],[0,-1],[1,1],[0,1]];
  let v = 0;
  for (let segment = 0; segment < segmentCount; segment++) for (const [point, side] of corners) {
    segments[v] = segment; points[v] = point; sides[v] = side;
    progress[v] = (segment + point) / segmentCount;
    v++;
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  // One vertex attribute replaces four scalar slots, leaving room for bolt
  // instance data on devices exposing the WebGL2 minimum attribute budget.
  const vertexData = new Float32Array(vertices * 4);
  for (let i = 0; i < vertices; i++) vertexData.set([segments[i], points[i], sides[i], progress[i]], i * 4);
  geometry.setAttribute('aBoltVertex', new THREE.BufferAttribute(vertexData, 4));
  const rand = randomSource(seed), origin = new Float32Array(boltCount * 3), variant = new Float32Array(boltCount), born = new Float32Array(boltCount), leader = new Float32Array(boltCount), pulseCount = new Float32Array(boltCount), life = new Float32Array(boltCount), width = new Float32Array(boltCount), length = new Float32Array(boltCount), seedAttr = new Float32Array(boltCount), master = new Float32Array(boltCount), waveId = new Float32Array(boltCount);
  const add = (name, array, size = 1) => geometry.setAttribute(name, new THREE.InstancedBufferAttribute(array, size));
  add('aOrigin', origin, 3); add('aVariant', variant); add('aBorn', born); add('aLeader', leader); add('aPulseCount', pulseCount); add('aLife', life); add('aWidth', width); add('aLength', length); add('aSeed', seedAttr); add('aMaster', master); add('aWave', waveId);
  geometry.instanceCount = boltCount;
  geometry.frustumCulled = false;
  return { geometry, data: { origin, variant, born, leader, pulseCount, life, width, length, seed: seedAttr, master, waveId, rand } };
}

function makeBoltMaterial(startTexture, endTexture, segmentCount, variantCount) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uStart: { value: startTexture }, uEnd: { value: endTexture }, uSegmentCount: { value: segmentCount }, uVariantCount: { value: variantCount },
      uTime: { value: 0 }, uRadius: { value: 10 }, uHeight: { value: 14 }, uIntensity: { value: 1 }, uDensity: { value: 1 }, uReducedMotion: { value: 0 }, uFlickerHz: { value: 28 },
      uColor: { value: new THREE.Color(0x8c8bff) },
    },
    vertexShader: `
      attribute vec4 aBoltVertex;
      #define aSegment aBoltVertex.x
      #define aPoint aBoltVertex.y
      #define aSide aBoltVertex.z
      #define aProgress aBoltVertex.w
      attribute vec3 aOrigin; attribute float aVariant; attribute float aBorn; attribute float aLeader; attribute float aPulseCount; attribute float aLife; attribute float aWidth; attribute float aLength; attribute float aSeed; attribute float aMaster;
      uniform sampler2D uStart; uniform sampler2D uEnd; uniform float uSegmentCount; uniform float uVariantCount; uniform float uTime; uniform float uRadius; uniform float uHeight; uniform float uIntensity; uniform float uDensity; uniform float uReducedMotion; uniform float uFlickerHz;
      varying float vAlpha; varying float vSide; varying float vBranch; varying float vMaster; varying float vSeed;
      void main(){
        vec2 uv=vec2((aSegment+.5)/uSegmentCount,(aVariant+.5)/uVariantCount);
        vec4 from=texture2D(uStart,uv),to=texture2D(uEnd,uv);
        vec3 start=aOrigin+from.xyz*vec3(uRadius,uHeight*aLength,uRadius), finish=aOrigin+to.xyz*vec3(uRadius,uHeight*aLength,uRadius);
        float branch=max(from.w,to.w);
        vec4 viewStart=modelViewMatrix*vec4(start,1.0),viewEnd=modelViewMatrix*vec4(finish,1.0);
        vec4 view=mix(viewStart,viewEnd,aPoint);
        vec2 direction=normalize(viewEnd.xy-viewStart.xy+vec2(.000001));
        vec2 perpendicular=vec2(-direction.y,direction.x);
        float age=uTime-aBorn;
        float leader=max(.045,aLeader);
        float reveal=clamp(age/leader,0.0,1.0);
        float stroke=age<leader ? step(aProgress,reveal+.035) : 1.0;
        float life=leader*(1.0+.18*aPulseCount)+max(.38,aLife);
        float fade=1.0-smoothstep(life*.66,life,age);
        float restrike=.38+.62*abs(sin(max(0.0,age-leader)*(uFlickerHz*.48+aPulseCount*2.0)+aSeed*19.0));
        float rayActive=step(0.0,age)*stroke*fade*restrike;
        float flicker=.68+.32*abs(sin(uTime*(uFlickerHz+uReducedMotion*2.0)+aSeed*37.0));
        float branchWidth=branch<.5?1.0:branch<1.5?.58:.34;
        float masterBoost=1.0+aMaster*1.5;
        float px=aWidth*branchWidth*masterBoost*uRadius;
        view.xy+=perpendicular*aSide*px;
        gl_Position=projectionMatrix*view;
        vAlpha=rayActive*flicker*uIntensity*mix(.65,1.0,uDensity);
        vSide=aSide; vBranch=branch; vMaster=aMaster; vSeed=aSeed;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor; varying float vAlpha; varying float vSide; varying float vBranch; varying float vMaster; varying float vSeed;
      void main(){
        float edge=1.0-smoothstep(.18,1.0,vSide);
        float core=1.0-smoothstep(.0,.34,vSide);
        vec3 color=mix(uColor,vec3(.72,.88,1.0),core*.55);
        color=mix(color,vec3(.92,.98,1.0),vMaster*.7);
        float glow=mix(.28,1.0,edge);
        float alpha=vAlpha*glow*(1.0-vBranch*.12);
        if(alpha<.008)discard;
        gl_FragColor=vec4(color*mix(.75,1.7,core),alpha);
      }
    `,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending, toneMapped: false,
  });
}

// Lightweight conventional-line backup for browsers that fail to render
// instanced float-texture bolt geometry. It shares the generated paths/timing.
function makeFallbackLightning(starts, ends, segmentCount, variantCount, boltData, radius, height, hex) {
  const boltCount = boltData.data.born.length, sampleCount = Math.min(256, boltCount);
  const vertexCount = sampleCount * segmentCount * 2;
  const positions = new Float32Array(vertexCount * 3), born = new Float32Array(vertexCount), life = new Float32Array(vertexCount), seed = new Float32Array(vertexCount), master = new Float32Array(vertexCount);
  let vertex = 0;
  const put = (x, y, z, boltIndex, duration) => {
    const p = vertex * 3;
    positions[p] = x; positions[p + 1] = y; positions[p + 2] = z;
    born[vertex] = boltData.data.born[boltIndex]; life[vertex] = duration;
    seed[vertex] = boltData.data.seed[boltIndex]; master[vertex] = boltData.data.master[boltIndex];
    vertex++;
  };
  for (let sample = 0; sample < sampleCount; sample++) {
    const boltIndex = Math.min(boltCount - 1, Math.floor(sample * boltCount / sampleCount));
    const variant = Math.floor(boltData.data.variant[boltIndex]), ox = boltData.data.origin[boltIndex * 3], oz = boltData.data.origin[boltIndex * 3 + 2];
    const lengthScale = boltData.data.length[boltIndex], duration = Math.max(.8, boltData.data.leader[boltIndex] + boltData.data.pulseCount[boltIndex] * .18 + boltData.data.life[boltIndex] + .15);
    for (let segment = 0; segment < segmentCount; segment++) {
      const p = (variant * segmentCount + segment) * 4;
      put(ox + starts[p] * radius, starts[p + 1] * height * lengthScale, oz + starts[p + 2] * radius, boltIndex, duration);
      put(ox + ends[p] * radius, ends[p + 1] * height * lengthScale, oz + ends[p + 2] * radius, boltIndex, duration);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aBorn', new THREE.BufferAttribute(born, 1));
  geometry.setAttribute('aLife', new THREE.BufferAttribute(life, 1));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  geometry.setAttribute('aMaster', new THREE.BufferAttribute(master, 1));
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uIntensity: { value: 1 }, uColor: { value: new THREE.Color(hex) }, uFlickerHz: { value: 28 } },
    vertexShader: `attribute float aBorn; attribute float aLife; attribute float aSeed; attribute float aMaster; uniform float uTime; uniform float uIntensity; uniform float uFlickerHz; varying float vAlpha; varying float vMaster; void main(){float age=uTime-aBorn;float fadeIn=smoothstep(0.0,.035,age);float fadeOut=1.0-smoothstep(aLife*.68,aLife,age);float flicker=.62+.38*abs(sin(uTime*uFlickerHz*.72+aSeed*47.0));vAlpha=step(0.0,age)*fadeIn*fadeOut*flicker*uIntensity*(.9+.45*aMaster);vMaster=aMaster;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `uniform vec3 uColor; varying float vAlpha; varying float vMaster; void main(){vec3 c=mix(uColor,vec3(.88,.96,1.0),.42+.5*vMaster);gl_FragColor=vec4(c,vAlpha);}`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  });
  const lines = new THREE.LineSegments(geometry, material); lines.frustumCulled = false;
  return { lines, material };
}

function makeGroundMarkMaterial(arcLifetime, crawlingDensity, duration) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uIntensity: { value: 1 }, uDensity: { value: crawlingDensity }, uArcLifetime: { value: arcLifetime }, uDuration: { value: duration } },
    vertexShader: `varying vec2 vUv; varying vec3 vData; void main(){vUv=uv;vData=instanceColor;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0); }`,
    fragmentShader: `
      uniform float uTime; uniform float uIntensity; uniform float uDensity; uniform float uArcLifetime; uniform float uDuration; varying vec2 vUv; varying vec3 vData;
      void main(){
        vec2 p=(vUv-.5)*2.0; float r=length(p); float age=uTime-vData.r*uDuration;
        float life=uArcLifetime*mix(.72,1.0,vData.g);
        float fade=(1.0-smoothstep(life*.3,life,age))*step(0.0,age);
        float a=atan(p.y,p.x); float branch=pow(max(0.0,sin(a*11.0+sin(a*5.0)*1.8+vData.b*6.0)),18.0);
        branch*=(1.0-smoothstep(.08,1.0,r))*smoothstep(.05,.2,r)*uDensity;
        float scorch=(1.0-smoothstep(.38,.9,r))*.12;
        float rim=exp(-pow((r-(.24+.035*sin(a*9.0+vData.b*4.0))),2.0)*230.0);
        float glow=branch*.75+rim*.42+scorch;
        vec3 col=mix(vec3(.04,.06,.11),vec3(.25,.47,1.0),branch+rim*.25);
        float alpha=glow*fade*uIntensity*(.48+.52*sin(uTime*38.0+vData.b*10.0));
        if(alpha<.015)discard; gl_FragColor=vec4(col,alpha);
      }
    `,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending, toneMapped: false, vertexColors: true,
  });
}

function makeGroundParticles(count, seed, radius, fulguriteShare, thunderSpeed) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3), born = new Float32Array(count), speed = new Float32Array(count), size = new Float32Array(count), seedAttr = new Float32Array(count), rand = randomSource(seed);
  for (let i = 0; i < count; i++) {
    const angle = rand() * Math.PI * 2, r = radius * Math.sqrt(rand());
    positions[i * 3] = Math.cos(angle) * r; positions[i * 3 + 1] = .05; positions[i * 3 + 2] = Math.sin(angle) * r;
    born[i] = 2.5 + rand() * 9.9 + r * 16 / Math.max(1, thunderSpeed); const fulgurite = rand() < fulguriteShare; speed[i] = fulgurite ? 1.1 + rand() * 2.3 : 1.5 + rand() * 5.5; size[i] = fulgurite ? .8 + rand() * 1.2 : .35 + rand() * 1.45; seedAttr[i] = fulgurite ? .9 : rand();
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aBorn', new THREE.BufferAttribute(born, 1)); geometry.setAttribute('aSpeed', new THREE.BufferAttribute(speed, 1));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(size, 1)); geometry.setAttribute('aSeed', new THREE.BufferAttribute(seedAttr, 1));
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uIntensity: { value: 1 }, uPixelRatio: { value: Math.min(devicePixelRatio || 1, 1.8) } },
    vertexShader: `attribute float aBorn; attribute float aSpeed; attribute float aSize; attribute float aSeed; uniform float uTime; uniform float uPixelRatio; varying float vLife; varying float vSeed; void main(){float age=uTime-aBorn;vec3 p=position;p.y+=max(0.0,age)*aSpeed;p.x+=sin(age*3.0+aSeed*40.0)*age*.16;p.z+=cos(age*2.0+aSeed*23.0)*age*.16;vec4 mv=modelViewMatrix*vec4(p,1.0);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(aSize*uPixelRatio*(150.0/max(1.0,-mv.z)),1.0,8.0);vLife=step(0.0,age)*(1.0-smoothstep(1.0,2.8,age));vSeed=aSeed;}`,
    fragmentShader: `uniform float uIntensity; varying float vLife; varying float vSeed; void main(){vec2 p=gl_PointCoord-.5;float r=length(p);float a=(1.0-smoothstep(.1,.5,r))*vLife; if(a<.02)discard;vec3 c=mix(vec3(.25,.4,1.0),vec3(.78,.92,1.0),vSeed);gl_FragColor=vec4(c,a*.72*uIntensity);}`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  });
  return new THREE.Points(geometry, material);
}

function makeShockwave(radius, definition, duration) {
  const geometry = new THREE.PlaneGeometry(2, 2, 1, 1);
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uIntensity: { value: 1 }, uStart: { value: 12.25 }, uRadius: { value: radius }, uSpeed: { value: definition.speed / 16 }, uRingCount: { value: Math.min(4, definition.aftershock.count + 1) }, uInterval: { value: definition.aftershock.interval }, uDecay: { value: definition.aftershock.decay }, uDuration: { value: duration } },
    vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `
      uniform float uTime; uniform float uIntensity; uniform float uStart; uniform float uRadius; uniform float uSpeed; uniform float uRingCount; uniform float uInterval; uniform float uDecay; uniform float uDuration; varying vec2 vUv;
      void main(){vec2 p=(vUv-.5)*2.0;float r=length(p);float a=atan(p.y,p.x);float glow=0.0;
      for(int i=0;i<4;i++){float age=uTime-(uStart+float(i)*uInterval);if(float(i)<uRingCount&&age>0.0&&age<uDuration){float radius=age*uSpeed/max(.001,uRadius);float jag=sin(a*14.0+sin(a*5.0)*2.2)*.018+sin(a*31.0)*.008;float line=exp(-pow((r-radius-jag)*95.0,2.0));glow=max(glow,line*(1.0-age/uDuration)*pow(uDecay,float(i)));}}
      if(glow<.01)discard;vec3 col=mix(vec3(.16,.34,.85),vec3(.72,.9,1.0),glow);gl_FragColor=vec4(col,glow*.68*uIntensity);}
    `,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false,
  });
  const mesh = new THREE.Mesh(geometry, material); mesh.rotation.x = -Math.PI / 2; mesh.scale.setScalar(radius * 2); mesh.position.y = .012; mesh.frustumCulled = false;
  return mesh;
}

export function createLightningStormAttack(parent, index, hex, skill, config, callbacks) {
  const definition = skill.lightningStorm, quality = QUALITY[config.quality] || QUALITY.High;
  const scale = THREE.MathUtils.clamp(config.aoeRadius / skill.aoe, .38, 1.6);
  const radius = skill.spread * scale, height = radius * (definition.cloud.height / definition.aoeRadius) * 1.3, duration = definition.totalDuration;
  const requestedBoltCount = Math.round((definition.bolts.totalByQuality[config.quality] || quality.bolts) * (config.qualityScale || 1));
  const boltCount = Math.max(Math.round(quality.bolts * .72), requestedBoltCount);
  const segmentCount = Math.max(24, Math.min(77, Math.floor((definition.bolts.segmentBudgetByQuality[config.quality] || quality.bolts * quality.segments) / boltCount)));
  const variantCount = definition.bolts.shapeVariants;
  const group = new THREE.Group(); parent.add(group); group.visible = false;
  const { startTexture, endTexture, starts: boltStarts, ends: boltEnds } = makeBoltShapes(variantCount, segmentCount, index + 29, definition.bolts.jaggedness, definition.bolts.branchDepth);
  const boltData = makeBoltGeometry(segmentCount, boltCount, index + 71);
  const boltMaterial = makeBoltMaterial(startTexture, endTexture, segmentCount, variantCount);
  boltMaterial.uniforms.uRadius.value = radius; boltMaterial.uniforms.uHeight.value = height; boltMaterial.uniforms.uColor.value.setHex(hex); boltMaterial.uniforms.uFlickerHz.value = definition.bolts.flickerHz;
  const bolts = new THREE.Mesh(boltData.geometry, boltMaterial); bolts.frustumCulled = false; group.add(bolts);
  const rand = boltData.data.rand, allocations = definition.waves.map((wave, waveIndex) => ({ wave, waveIndex, count: Math.round(boltCount * wave.share) }));
  allocations[allocations.length - 1].count = boltCount - allocations.slice(0, -1).reduce((sum, item) => sum + item.count, 0);
  let boltIndex = 0, masterIndex = Math.floor(allocations.slice(0, -1).reduce((sum, item) => sum + item.count, 0) + allocations.at(-1).count * .5);
  const groundBirth = new Float32Array(boltCount), scratch = new THREE.Object3D(), patchGeometry = new THREE.PlaneGeometry(1, 1, 1, 1);
  for (const { wave, waveIndex, count } of allocations) for (let localIndex = 0; localIndex < count; localIndex++, boltIndex++) {
    const t = (localIndex + rand() * .6) / Math.max(1, count), angle = localIndex * 2.399963 + rand() * .48;
    const pattern = wave.pattern === 'concentric' ? .2 + .8 * t : wave.pattern === 'chain-hop' ? .32 + .62 * Math.abs(Math.sin(localIndex * 1.7)) : wave.pattern === 'carpet' ? Math.sqrt(t) : Math.sqrt(t);
    const isMaster = boltIndex === masterIndex;
    const x = isMaster ? 0 : Math.cos(angle) * radius * pattern, z = isMaster ? 0 : Math.sin(angle) * radius * pattern;
    boltData.data.origin.set([x, 0, z], boltIndex * 3);
    boltData.data.variant[boltIndex] = Math.floor(rand() * variantCount);
    boltData.data.born[boltIndex] = wave.start + rand() * wave.duration;
    boltData.data.leader[boltIndex] = isMaster ? definition.bolts.leaderDuration.master : definition.bolts.leaderDuration.normal;
    boltData.data.pulseCount[boltIndex] = isMaster ? 4 : definition.bolts.restrikes[0] + Math.floor(rand() * (definition.bolts.restrikes[1] - definition.bolts.restrikes[0] + 1));
    boltData.data.life[boltIndex] = definition.bolts.lingerTime[0] + rand() * (definition.bolts.lingerTime[1] - definition.bolts.lingerTime[0]);
    const widthRange = definition.bolts.widthRange;
    boltData.data.width[boltIndex] = (isMaster ? widthRange[1] : widthRange[0] + rand() * (widthRange[1] - widthRange[0])) / radius;
    const lengthRange = definition.bolts.lengthRange;
    boltData.data.length[boltIndex] = (lengthRange[0] + rand() * (lengthRange[1] - lengthRange[0])) / definition.aoeRadius;
    boltData.data.seed[boltIndex] = rand(); boltData.data.master[boltIndex] = isMaster ? 1 : 0;
    boltData.data.waveId[boltIndex] = waveIndex;
    groundBirth[boltIndex] = boltData.data.born[boltIndex];
  }
  for (const attribute of Object.values(boltData.data)) if (attribute?.needsUpdate !== undefined) attribute.needsUpdate = true;
  const fallbackBolts = makeFallbackLightning(boltStarts, boltEnds, segmentCount, variantCount, boltData, radius, height, hex);
  fallbackBolts.material.uniforms.uFlickerHz.value = definition.bolts.flickerHz;
  group.add(fallbackBolts.lines);
  const groundMarks = new THREE.InstancedMesh(patchGeometry, makeGroundMarkMaterial(definition.ground.arcLifetime[1], definition.ground.crawlingArcDensity, duration), boltCount);
  const markMat = groundMarks.material, markDummy = new THREE.Object3D(), markRand = randomSource(index + 89);
  groundMarks.instanceMatrix.setUsage(THREE.StaticDrawUsage); groundMarks.frustumCulled = false;
  for (let i = 0; i < boltCount; i++) {
    const x = boltData.data.origin[i * 3], z = boltData.data.origin[i * 3 + 2];
    markDummy.position.set(x, .008 + (i % 2) * .001, z); markDummy.rotation.set(-Math.PI / 2, 0, markRand() * Math.PI * 2);
    const s = (.17 + markRand() * .34) * definition.ground.scorchRadius / 6; markDummy.scale.set(s * (1.1 + markRand()), s * .65, 1); markDummy.updateMatrix(); groundMarks.setMatrixAt(i, markDummy.matrix);
    groundMarks.setColorAt(i, new THREE.Color(groundBirth[i] / duration, .72 + markRand() * .28, markRand()));
  }
  groundMarks.instanceMatrix.needsUpdate = true;
  if (groundMarks.instanceColor) { groundMarks.instanceColor.setUsage(THREE.StaticDrawUsage); groundMarks.instanceColor.needsUpdate = true; }
  group.add(groundMarks);
  const cloudMaterials = [], cloudColor = new THREE.Color(hex), cloudGeometry = new THREE.SphereGeometry(1, 48, 26);
  const cloudShells = [
    { radius: 1.12, y: height * .8, scale: [radius * 1.16, height * .22, radius * 1.14], tint: 0x0b111d },
    { radius: .9, y: height * .89, scale: [radius * .91, height * .19, radius * .94], tint: 0x080d17 },
    { radius: .72, y: height * .98, scale: [radius * .72, height * .16, radius * .76], tint: 0x0e1423 },
    { radius: 1.24, y: height * 1.035, scale: [radius * 1.23, height * .17, radius * 1.2], tint: 0x070b13 },
  ];
  for (let i = 0; i < Math.min(cloudShells.length, Math.max(1, definition.cloud.layers)); i++) {
    const shell = cloudShells[i], material = makeStormCloudMaterial(i, shell.tint);
    const mesh = new THREE.Mesh(cloudGeometry, material); mesh.position.y = shell.y; mesh.scale.set(...shell.scale); mesh.rotation.y = i * 1.17; mesh.frustumCulled = false;
    cloudMaterials.push(material); group.add(mesh);
  }
  const particles = makeGroundParticles(quality.sparks, index + 193, radius, definition.ground.fulguriteShare, definition.thunder.speed); particles.frustumCulled = false; group.add(particles);
  const shockwave = makeShockwave(radius * 1.65, { ...definition.shockwave, aftershock: definition.aftershock, speed: definition.shockwave.speed }, 2.5); group.add(shockwave);
  const light = new THREE.Vector3(0, height * .35, 0), localCam = new THREE.Vector3(), targetCam = new THREE.Vector3(), cameraPose = { position: new THREE.Vector3(), target: new THREE.Vector3() };
  let preSlow = false, finaleHit = false, lastWaveShake = -1, currentFlash = 0, currentMood = 0, currentTime = 0;
  const shakeByWave = definition.cameraShake.perWave;
  const update = (time, intensity = 1, density = 1) => {
    currentTime = Math.max(0, time);
    const form = THREE.MathUtils.smoothstep(currentTime, .08, definition.cloud.formDuration);
    const fade = 1 - THREE.MathUtils.smoothstep(currentTime, definition.cloud.dissipateStart, definition.cloud.dissipateStart + definition.cloud.dissipateDuration);
    const activeWave = definition.waves.find(wave => currentTime >= wave.start && currentTime <= wave.start + wave.duration);
    let pulse = 0, waveActivity = 0;
    for (const wave of definition.waves) {
      const local = currentTime - wave.start;
      if (local >= 0 && local <= wave.duration) {
        const hz = Math.min(2.65, definition.skyFlash.maxHz), phase = local * Math.PI * 2 * hz;
        const flash = Math.pow(Math.max(0, Math.sin(phase)), 7.0) * (wave.name === 'finale' ? 1 : .62);
        pulse = Math.max(pulse, flash); waveActivity = Math.max(waveActivity, 1 - local / wave.duration * .24);
      }
    }
    const reduced = config.reducedMotion ? definition.skyFlash.reducedMotionScale : 1;
    currentFlash = pulse * definition.skyFlash.intensity * reduced;
    currentMood = THREE.MathUtils.clamp((.36 * form + .48 * waveActivity + .16 * currentFlash) * fade, 0, 1);
    group.visible = currentTime < duration && currentTime > .025;
    boltMaterial.uniforms.uTime.value = currentTime; boltMaterial.uniforms.uIntensity.value = intensity * (1 + currentFlash * .35);
    boltMaterial.uniforms.uDensity.value = THREE.MathUtils.clamp(density, .2, 1.5); boltMaterial.uniforms.uReducedMotion.value = config.reducedMotion ? 1 : 0;
    fallbackBolts.material.uniforms.uTime.value = currentTime; fallbackBolts.material.uniforms.uIntensity.value = intensity * (1 + currentFlash * .35);
    markMat.uniforms.uTime.value = currentTime; markMat.uniforms.uIntensity.value = intensity * fade;
    particles.material.uniforms.uTime.value = currentTime; particles.material.uniforms.uIntensity.value = intensity * fade;
    shockwave.material.uniforms.uTime.value = currentTime; shockwave.material.uniforms.uIntensity.value = intensity * fade;
    for (const material of cloudMaterials) {
      material.uniforms.uTime.value = currentTime; material.uniforms.uForm.value = form;
      material.uniforms.uFade.value = fade; material.uniforms.uFlash.value = currentFlash * definition.cloud.internalFlash;
    }
    if (!preSlow && currentTime >= callbacks.plan.impactAt - callbacks.plan.preSlowDuration) { preSlow = true; callbacks.beginPreImpactSlowMotion(callbacks.plan); }
    if (!finaleHit && currentTime >= callbacks.plan.impactAt) { finaleHit = true; callbacks.beginImpactHitStop(callbacks.plan); callbacks.triggerCameraShake(callbacks.plan); }
    if (activeWave && activeWave.name !== 'finale') {
      const waveIndex = definition.waves.indexOf(activeWave);
      if (waveIndex > lastWaveShake && shakeByWave[waveIndex] !== 'none') {
        const amount = activeWave.shake * (config.reducedMotion ? .22 : 1);
        if (amount > .01) callbacks.triggerCameraShake({ ...callbacks.plan, shake: amount, shakeDuration: .36, shakeFrequency: 24, seed: callbacks.plan.seed + waveIndex * 3.1 });
        lastWaveShake = waveIndex;
      }
    }
  };
  const getWorldPoint = (out, y = 0) => { out.set(0, y, 0); group.updateWorldMatrix(true, false); return group.localToWorld(out); };
  const poseAt = () => {
    const phase = currentTime < 2.5 ? 0 : currentTime < 6.25 ? 1 : currentTime < 11.7 ? 2 : 3;
    const angle = phase * .94 + currentTime * .045;
    const distance = radius * (phase === 3 ? 2.55 : 2.15);
    localCam.set(Math.cos(angle) * distance, height * (phase === 0 ? 1.42 : phase === 1 ? 1.06 : phase === 2 ? .7 : .88), Math.sin(angle) * distance);
    targetCam.set(0, height * (phase === 0 ? .86 : .48), 0);
    group.updateWorldMatrix(true, false);
    cameraPose.position.copy(group.localToWorld(localCam.clone())); cameraPose.target.copy(group.localToWorld(targetCam.clone()));
    return cameraPose;
  };
  group.userData.dispose = () => { startTexture.dispose(); endTexture.dispose(); };
  return {
    group, update, radius,
    environmentMood: () => currentMood,
    flashLevel: () => currentFlash,
    cameraPull: () => currentMood * .12,
    cameraPose: poseAt,
    lightPosition: () => light,
    heatCenter: out => getWorldPoint(out, height * .32),
    distortionLevel: () => currentFlash * .22,
    runePulse: () => currentTime > callbacks.plan.impactAt - .08 && currentTime < callbacks.plan.impactAt + .28 ? currentFlash : 0,
  };
}
