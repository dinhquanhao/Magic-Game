import * as THREE from 'three';

const clamp01 = x => Math.max(0, Math.min(1, x));
const smooth = (a, b, x) => { const t = clamp01((x - a) / Math.max(.0001, b - a)); return t * t * (3 - 2 * t); };
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return x - Math.floor(x); };
const noiseGLSL = `
  float hash31(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
  float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(mix(hash31(i),hash31(i+vec3(1,0,0)),f.x),mix(hash31(i+vec3(0,1,0)),hash31(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash31(i+vec3(0,0,1)),hash31(i+vec3(1,0,1)),f.x),mix(hash31(i+vec3(0,1,1)),hash31(i+vec3(1,1,1)),f.x),f.y),f.z);}
  float fbm(vec3 p){float v=0.0,a=.5;for(int i=0;i<4;i++){v+=noise3(p)*a;p=p*2.03+vec3(7.1,3.7,5.3);a*=.48;}return v;}
`;

function makeOceanGate(parent, radius, height) {
  const group = new THREE.Group(); group.position.y = height; parent.add(group);
  const portalMaterial = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uOpen: { value: 0 }, uIntensity: { value: 1 } },
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: `uniform float uTime;uniform float uOpen;uniform float uIntensity;varying vec2 vUv;${noiseGLSL}
      void main(){vec2 p=vUv*2.0-1.0;float r=length(p);if(r>1.0)discard;float a=atan(p.y,p.x);float swirl=fbm(vec3(p*2.2+vec2(cos(a+uTime*.45),sin(a+uTime*.45))*.22,uTime*.15));float spiral=.5+.5*sin(a*7.0-r*21.0-uTime*2.2+swirl*5.0);float depth=1.0-smoothstep(.15,1.0,r);float whirl=pow(max(0.0,1.0-r),1.7);float caustic=pow(max(0.0,sin(a*11.0+r*34.0-uTime*3.0+swirl*7.0)),12.0);vec3 deep=vec3(.008,.045,.09),sea=vec3(.018,.28,.39),light=vec3(.42,.83,.82);vec3 color=mix(deep,sea,depth*.78+spiral*.12);color=mix(color,light,caustic*.32+whirl*.24);float rim=1.0-smoothstep(.88,1.0,r);float alpha=uOpen*(.42+depth*.3+rim*.25)*uIntensity;if(alpha<.015)discard;gl_FragColor=vec4(color,alpha);}`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.NormalBlending, toneMapped: false
  });
  const portal = new THREE.Mesh(new THREE.CircleGeometry(radius, 112), portalMaterial); portal.rotation.x = -Math.PI / 2; portal.position.y = -.025; group.add(portal);
  const ringGeometry = new THREE.TorusGeometry(1, .035, 8, 160), ringMaterial = new THREE.MeshBasicMaterial({ color: 0x66d8df, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const rings = [];
  for (const [scale, speed] of [[1, .12], [.78, -.18], [.54, .24]]) { const ring = new THREE.Mesh(ringGeometry, ringMaterial); ring.rotation.x = Math.PI / 2; ring.userData.spin = speed; ring.userData.size = scale; group.add(ring); rings.push(ring); }
  const crackPositions = [];
  for (let i = 0; i < 32; i++) { const a = i / 32 * Math.PI * 2, r1 = radius * (.94 + hash(i + 3) * .08), r2 = r1 + radius * (.08 + hash(i + 17) * .16); crackPositions.push(Math.cos(a) * r1, 0, Math.sin(a) * r1, Math.cos(a + (hash(i + 23) - .5) * .06) * r2, 0, Math.sin(a + (hash(i + 23) - .5) * .06) * r2); }
  const cracksGeometry = new THREE.BufferGeometry(); cracksGeometry.setAttribute('position', new THREE.Float32BufferAttribute(crackPositions, 3));
  const cracks = new THREE.LineSegments(cracksGeometry, new THREE.LineBasicMaterial({ color: 0x9defff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); cracks.rotation.x = -Math.PI / 2; group.add(cracks);
  const cloudGeometry = new THREE.SphereGeometry(1, 12, 8), cloudMaterial = new THREE.MeshBasicMaterial({ color: 0x193e56, transparent: true, opacity: .0, depthWrite: false, side: THREE.DoubleSide });
  const clouds = new THREE.InstancedMesh(cloudGeometry, cloudMaterial, 12), dummy = new THREE.Object3D();
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, r = radius * (1.02 + hash(i + 51) * .18); dummy.position.set(Math.cos(a) * r, (hash(i + 63) - .5) * radius * .1, Math.sin(a) * r); dummy.scale.set(radius * (.11 + hash(i + 75) * .1), radius * (.035 + hash(i + 87) * .035), radius * (.09 + hash(i + 99) * .09)); dummy.rotation.y = a; dummy.updateMatrix(); clouds.setMatrixAt(i, dummy.matrix); }
  group.add(clouds);
  return { group, portalMaterial, ringMaterial, rings, cracks, cloudMaterial, radius };
}

function whaleSection(u) {
  const torso = .16 + 1.12 * smooth(0, .36, u) + .16 * Math.sin(Math.PI * clamp01((u - .25) / .54));
  const taper = 1 - .97 * smooth(.76, 1, u);
  const width = Math.max(.035, torso * taper);
  const height = width * THREE.MathUtils.lerp(.58, .67, smooth(.2, .36, u));
  return [width, height];
}

function makeWhaleBodyGeometry(length, quality) {
  const along = quality === 'Low' ? 28 : quality === 'Medium' ? 36 : 48, around = quality === 'Low' ? 16 : quality === 'Medium' ? 20 : 28;
  const positions = [], uvs = [], indices = [];
  for (let j = 0; j <= along; j++) {
    const u = j / along, [w, h] = whaleSection(u), z = (u - .5) * length;
    for (let i = 0; i <= around; i++) { const a = i / around * Math.PI * 2; positions.push(Math.cos(a) * w, Math.sin(a) * h, z); uvs.push(u, i / around); }
  }
  for (let j = 0; j < along; j++) for (let i = 0; i < around; i++) { const a = j * (around + 1) + i, b = a + 1, c = a + around + 1, d = c + 1; indices.push(a, b, c, b, d, c); }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry;
}

function makePectoralFinGeometry(length = 2.75) {
  const positions = [], uvs = [], indices = [], along = 20, across = 8;
  for (let i = 0; i <= along; i++) { const u = i / along, width = .11 + Math.sin(Math.PI * u) * .42 * (1 - .45 * u); for (let j = 0; j <= across; j++) { const v = j / across; positions.push(length * u, -.06 + Math.sin(u * Math.PI) * .12, -length * .38 * u + (v - .5) * width); uvs.push(.5, v); } }
  for (let i = 0; i < along; i++) for (let j = 0; j < across; j++) { const a = i * (across + 1) + j, b = a + 1, c = a + across + 1, d = c + 1; indices.push(a, c, b, b, c, d); }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry;
}

function makeFlukeGeometry() {
  const positions = [], uvs = [], indices = [], along = 18, across = 10;
  for (let side = -1; side <= 1; side += 2) {
    const base = positions.length / 3;
    for (let i = 0; i <= along; i++) { const u = i / along, span = 2.35 * u, width = .05 + Math.sin(Math.PI * u) * 1.08; for (let j = 0; j <= across; j++) { const v = j / across; positions.push(side * span, (v - .5) * width, -.28 * u - Math.sin(Math.PI * v) * .13 * u); uvs.push(.5, v); } }
    for (let i = 0; i < along; i++) for (let j = 0; j < across; j++) { const a = base + i * (across + 1) + j, b = a + 1, c = a + across + 1, d = c + 1; indices.push(a, c, b, b, c, d); }
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry;
}

function makeWhaleSkin(length, bioluminescence) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uLength: { value: length }, uOpacity: { value: 0 }, uDissolve: { value: 0 }, uWag: { value: 1 }, uSpirit: { value: 0 }, uBio: { value: bioluminescence } },
    vertexShader: `uniform float uTime;uniform float uLength;uniform float uWag;varying vec3 vP;varying vec3 vN;varying vec3 vV;varying vec2 vUv;void main(){vec3 p=position;float tail=pow(1.0-clamp(uv.x,0.0,1.0),2.0);float wave=sin(uTime*2.2-uv.x*7.0);p.x+=wave*tail*uWag*.42;p.y+=cos(uTime*2.2-uv.x*7.0)*tail*uWag*.18;vP=p;vUv=uv;vec4 mv=modelViewMatrix*vec4(p,1.0);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `uniform float uTime;uniform float uOpacity;uniform float uDissolve;uniform float uSpirit;uniform float uBio;varying vec3 vP;varying vec3 vN;varying vec3 vV;varying vec2 vUv;${noiseGLSL}
      void main(){float n=fbm(vP*vec3(2.8,4.8,1.7)+vec3(0.0,uTime*.025,0.0));float freckles=smoothstep(.62,.88,fbm(vP*7.2+vec3(3.1,0.0,1.7)));float belly=1.0-smoothstep(-.96,-.28,vP.y);vec3 back=mix(vec3(.018,.09,.15),vec3(.075,.24,.32),n);vec3 underside=mix(vec3(.32,.45,.49),vec3(.58,.67,.67),n*.55);vec3 color=mix(back,underside,belly*.92);color*=1.0-freckles*.24;float facing=abs(dot(normalize(vN),normalize(vV)));float fres=pow(1.0-facing,3.0);float spec=pow(max(0.0,dot(reflect(-normalize(vV),normalize(vN)),normalize(vec3(-.4,.8,.35)))),32.0);float runeLine=pow(max(0.0,sin(vP.z*3.1+sin(vP.x*2.8)*.9+vP.y*3.4+uTime*.75)),18.0);float runeMask=smoothstep(.68,.95,n+fbm(vP*4.0)*.28);float bio=runeLine*runeMask*uBio*(.45+.55*sin(uTime*1.1+vP.z));color+=vec3(.04,.56,.66)*bio;vec3 spirit=mix(color,vec3(.19,.68,.76),.56);color=mix(color,spirit,uSpirit);color+=vec3(.2,.58,.67)*(fres*.34+spec*.38+bio*.28);float breakup=smoothstep(uDissolve-.12,uDissolve+.16,n);float dissolveMix=smoothstep(.04,.92,uDissolve);float alpha=uOpacity*(1.0-smoothstep(.25,1.0,uDissolve))*mix(1.0,breakup,dissolveMix);alpha*=mix(1.0,.48,uSpirit);if(alpha<.008)discard;gl_FragColor=vec4(color,alpha);}`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.NormalBlending, toneMapped: false
  });
}

function makeWhaleDetails(parent, length, skin, quality) {
  const body = new THREE.Mesh(makeWhaleBodyGeometry(length, quality), skin); body.name = 'blue-whale-body'; parent.add(body);
  const finGeometry = makePectoralFinGeometry(), fins = [];
  for (const side of [-1, 1]) { const pivot = new THREE.Group(); pivot.position.set(side * .88, -.12, length * .12); parent.add(pivot); const fin = new THREE.Mesh(finGeometry, skin); fin.scale.x = side; pivot.add(fin); fins.push(pivot); }
  const tailPivot = new THREE.Group(); tailPivot.position.z = -length * .48; parent.add(tailPivot); const tail = new THREE.Mesh(makeFlukeGeometry(), skin); tailPivot.add(tail);
  const dorsalShape = new THREE.Shape(); dorsalShape.moveTo(0, 0); dorsalShape.quadraticCurveTo(.18, .13, .28, .85); dorsalShape.quadraticCurveTo(.72, .5, .68, .04); dorsalShape.closePath(); const dorsal = new THREE.Mesh(new THREE.ShapeGeometry(dorsalShape, 12), skin); dorsal.position.set(-.25, .75, -length * .19); parent.add(dorsal);
  const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x021923 }), eyeGlow = new THREE.MeshBasicMaterial({ color: 0x56d8df, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, toneMapped: false });
  for (const side of [-1, 1]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(.085, 10, 8), eyeMaterial); eye.position.set(side * .69, .12, length * .405); parent.add(eye); const gleam = new THREE.Mesh(new THREE.SphereGeometry(.035, 8, 6), eyeGlow); gleam.position.set(side * .7, .15, length * .414); parent.add(gleam); }
  const pleatPositions = [];
  for (let row = -4; row <= 4; row++) { const f = row / 5; for (let i = 0; i < 26; i++) { const u0 = .59 + i / 26 * .31, u1 = .59 + (i + 1) / 26 * .31, [w0, h0] = whaleSection(u0), [w1, h1] = whaleSection(u1), x0 = f * w0, x1 = f * w1, y0 = -h0 * Math.sqrt(Math.max(.05, 1 - f * f)) * 1.008, y1 = -h1 * Math.sqrt(Math.max(.05, 1 - f * f)) * 1.008; pleatPositions.push(x0, y0, (u0 - .5) * length, x1, y1, (u1 - .5) * length); } }
  const pleatGeometry = new THREE.BufferGeometry(); pleatGeometry.setAttribute('position', new THREE.Float32BufferAttribute(pleatPositions, 3)); const pleats = new THREE.LineSegments(pleatGeometry, new THREE.LineBasicMaterial({ color: 0x78aeb7, transparent: true, opacity: .28, depthWrite: false })); parent.add(pleats);
  const baleenPositions = []; for (let i = 0; i < 14; i++) { const x = (i / 13 - .5) * 1.0, z = length * (.445 + (i % 2) * .007); baleenPositions.push(x, -.23, z, x * 1.04, -.55, z - .06); }
  const baleenGeometry = new THREE.BufferGeometry(); baleenGeometry.setAttribute('position', new THREE.Float32BufferAttribute(baleenPositions, 3)); const baleen = new THREE.LineSegments(baleenGeometry, new THREE.LineBasicMaterial({ color: 0xb7d8d7, transparent: true, opacity: .28, depthWrite: false })); parent.add(baleen);
  return { body, fins, tailPivot, pleats, baleen };
}

function makeWakeRibbon(parent, length, phase, material) {
  const positions = [], uvs = [], indices = [], segments = 40;
  for (let i = 0; i <= segments; i++) { const u = i / segments, width = (.035 + Math.sin(u * Math.PI) * .22) * (1 - u * .42); positions.push(-width, .08, -u * length, width, .08, -u * length); uvs.push(0, u, 1, u); }
  for (let i = 0; i < segments; i++) { const a = i * 2; indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); geometry.setIndex(indices);
  const mesh = new THREE.Mesh(geometry, material); mesh.userData.phase = phase; mesh.frustumCulled = false; parent.add(mesh); return mesh;
}

function makeWakeMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 } },
    vertexShader: 'uniform float uTime;varying vec2 vUv;void main(){vUv=uv;vec3 p=position;p.x+=sin(uv.y*8.0-uTime*1.7+uv.x*2.0)*uv.y*.22;p.y+=sin(uv.y*11.0-uTime*2.1)*uv.y*.13;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}',
    fragmentShader: `uniform float uOpacity;varying vec2 vUv;void main(){float edge=sin(vUv.x*3.14159);float tail=1.0-smoothstep(.68,1.0,vUv.y);float flow=.65+.35*sin(vUv.y*43.0-vUv.x*8.0);float a=edge*tail*flow*uOpacity*.34;vec3 c=mix(vec3(.08,.45,.6),vec3(.58,.9,.91),edge*.52);if(a<.012)discard;gl_FragColor=vec4(c,a);}`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.NormalBlending, toneMapped: false
  });
}

function makeTideSurface(parent, radius, settings) {
  const tide = settings.tide, unit = settings.worldUnitsPerMeter || 16;
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uIntensity: { value: 1 }, uRadius: { value: radius }, uSurgeStart: { value: settings.impactTime + .48 }, uSurgeSpeed: { value: tide.surgeSpeed / unit }, uWaveHeight: { value: tide.waveHeight / unit }, uFloodDepth: { value: tide.floodDepth / unit }, uEbbStart: { value: tide.ebbStart }, uEbbDuration: { value: tide.ebbDuration }, uWhirlpoolRadius: { value: tide.whirlpoolRadius / unit }, uReflectionDamping: { value: tide.reflectionDamping } },
    vertexShader: `uniform float uTime;uniform float uRadius;uniform float uSurgeStart;uniform float uSurgeSpeed;uniform float uWaveHeight;uniform float uFloodDepth;uniform float uEbbStart;uniform float uEbbDuration;uniform float uWhirlpoolRadius;varying vec2 vP;varying float vFoam;varying float vDepth;varying vec3 vN;varying vec3 vV;${noiseGLSL}
      void main(){vP=position.xy;float r=length(position.xy);float surge=clamp(uTime-uSurgeStart,0.0,20.0);float front=surge*uSurgeSpeed;float rayActive=smoothstep(uSurgeStart,uSurgeStart+.28,uTime)*(1.0-smoothstep(uEbbStart,uEbbStart+uEbbDuration,uTime));float ebb=smoothstep(uEbbStart,uEbbStart+uEbbDuration,uTime);float flood=smoothstep(uSurgeStart+1.0,uSurgeStart+3.6,uTime)*(1.0-ebb);float lead=exp(-abs(r-front)*1.45)*rayActive;float secondary=0.0;for(int i=1;i<=3;i++){float d=abs(r-(front-float(i)*uSurgeSpeed*1.35));secondary+=exp(-d*1.25)*rayActive/(float(i)+.65);}float angle=atan(position.y,position.x);float waveA=(sin(position.x*.72+uTime*1.1)*.09+sin(position.x*1.83+position.y*.31-uTime*1.76)*.035)*flood;
float waveB=(sin(position.y*.91-position.x*.22-uTime*.94)*.065+sin(position.y*2.14+uTime*1.48)*.024)*flood;
float wave=waveA+waveB+(sin(r*2.0-uTime*3.2+sin(angle*3.0)*.8)+sin(r*3.7-uTime*4.6+angle*2.0)*.36)*.105*flood;float whirl=exp(-r/max(.001,uWhirlpoolRadius*.38))*ebb*1.05;float n=fbm(vec3(position.xy*.62,uTime*.12));float height=uFloodDepth*flood+uWaveHeight*(lead*.72+secondary*.4)+wave+n*.07*flood-whirl;vec3 p=position;p.z=height;vFoam=clamp(lead*.82+secondary*.52+abs(wave)*.7+abs(waveA)*.42+abs(waveB)*.42,0.0,1.0);vDepth=clamp(flood+lead*.65,0.0,1.0);vec3 waveNormal=normalize(vec3(-(waveA+waveB)*.18,-(waveA-waveB)*.14,1.0));vec4 mv=modelViewMatrix*vec4(p,1.0);vN=normalize(normalMatrix*waveNormal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `uniform float uTime;uniform float uIntensity;uniform float uRadius;uniform float uReflectionDamping;varying vec2 vP;varying float vFoam;varying float vDepth;varying vec3 vN;varying vec3 vV;${noiseGLSL}
      void main(){float r=length(vP);if(r>uRadius)discard;float nDotV=clamp(dot(normalize(vN),normalize(vV)),0.0,1.0);float fres=.02+.98*pow(1.0-nDotV,5.0);float n=fbm(vec3(vP*1.8,uTime*.16));float caustic=pow(max(0.0,sin(vP.x*2.4+vP.y*2.1+uTime*.75+n*4.0)),12.0);vec3 shallow=vec3(.09,.43,.48);float waterThickness=clamp(vDepth*1.8,0.0,2.0);vec3 transmittance=exp(-vec3(2.35,1.12,.46)*waterThickness);vec3 absorbed=vec3(.008,.042,.13)+vec3(.13,.58,.64)*transmittance;vec3 color=mix(shallow,absorbed,clamp(vDepth*.84+.1,0.0,1.0));float specular=pow(max(0.0,dot(reflect(-normalize(vV),normalize(vN)),normalize(vec3(-.4,.82,.34)))),42.0);color=mix(color,vec3(.64,.91,.87),clamp(vFoam*.8+caustic*.1,0.0,.88));color+=vec3(.15,.46,.52)*fres*(.32+uReflectionDamping*.18)+vec3(.48,.72,.78)*specular*.3;float edge=1.0-smoothstep(uRadius*.94,uRadius,r);float alpha=(.4+vDepth*.22+fres*.28+vFoam*.13)*edge*uIntensity;if(alpha<.02)discard;gl_FragColor=vec4(color,alpha);}`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.NormalBlending, toneMapped: false
  });
  const geometry = new THREE.PlaneGeometry(radius * 2.1, radius * 2.1, 112, 112); const mesh = new THREE.Mesh(geometry, material); mesh.rotation.x = -Math.PI / 2; mesh.position.y = .035; mesh.frustumCulled = false; mesh.renderOrder = 4; parent.add(mesh); return { mesh, material };
}

function makeCrownSplash(parent, radius, height, start) {
  const positions = [], uvs = [], indices = [], around = 128, high = 18;
  for (let j = 0; j <= high; j++) for (let i = 0; i <= around; i++) { const a = i / around * Math.PI * 2, v = j / high; positions.push(Math.cos(a), v, Math.sin(a)); uvs.push(i / around, v); }
  for (let j = 0; j < high; j++) for (let i = 0; i < around; i++) { const a = j * (around + 1) + i, b = a + 1, c = a + around + 1, d = c + 1; indices.push(a, b, c, b, d, c); }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); geometry.setIndex(indices);
  const material = new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uStart: { value: start }, uRadius: { value: radius * .46 }, uHeight: { value: height }, uIntensity: { value: 1 } },
    vertexShader: `uniform float uTime;uniform float uStart;uniform float uRadius;uniform float uHeight;varying vec2 vUv;varying float vCrest;void main(){float age=max(0.0,uTime-uStart);float grow=clamp(age/1.05,0.0,1.0);float life=max(0.0,1.0-smoothstep(1.25,2.55,age));float a=uv.x*6.2831853;float spikes=max(0.0,sin(a*9.0+sin(a*3.0)*.7));float r=uRadius*(.42+grow*.9)+sin(a*7.0+uTime*2.1)*.18;float h=uHeight*(.3+spikes*.7)*sin(min(1.0,grow)*1.25)*life*uv.y;vec3 p=vec3(cos(a)*r,h,sin(a)*r);vUv=uv;vCrest=smoothstep(.72,1.0,uv.y)*(spikes*.55+.45);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}`,
    fragmentShader: `uniform float uTime;uniform float uStart;uniform float uIntensity;varying vec2 vUv;varying float vCrest;void main(){float age=uTime-uStart;if(age<0.0||age>2.6)discard;float fade=1.0-smoothstep(1.45,2.6,age);float foam=pow(max(0.0,sin(vUv.x*56.0-uTime*3.0)),8.0)*vCrest;vec3 c=mix(vec3(.035,.37,.53),vec3(.7,.94,.92),clamp(vCrest*.72+foam*.45,0.0,1.0));float alpha=(.46+vCrest*.26+foam*.2)*fade*uIntensity;if(alpha<.025)discard;gl_FragColor=vec4(c,alpha);}`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.NormalBlending, toneMapped: false });
  const mesh = new THREE.Mesh(geometry, material); mesh.frustumCulled = false; mesh.renderOrder = 5; parent.add(mesh); return { mesh, material };
}

function makeWaterColumn(parent, radius, height, start) {
  const material = new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uStart: { value: start }, uHeight: { value: height }, uIntensity: { value: 1 } },
    vertexShader: `uniform float uTime;uniform float uStart;uniform float uHeight;varying vec2 vUv;varying float vAlpha;void main(){float age=uTime-uStart;float grow=smoothstep(0.0,.34,age);float fade=1.0-smoothstep(1.0,2.1,age);vec3 p=position;p.y=(position.y+.5)*uHeight*grow;p.xz*=.78+.14*sin(uTime*2.0+position.y*9.0);vUv=uv;vAlpha=clamp(grow*fade,0.0,1.0);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}`,
    fragmentShader: `uniform float uTime;uniform float uIntensity;varying vec2 vUv;varying float vAlpha;void main(){float flow=.5+.5*sin(vUv.y*19.0-vUv.x*7.0-uTime*3.0);float edge=pow(max(0.0,1.0-abs(vUv.x-.5)*2.0),.6);vec3 c=mix(vec3(.035,.28,.43),vec3(.55,.88,.88),flow*.4);float alpha=(.32+edge*.24)*vAlpha*uIntensity;if(alpha<.025)discard;gl_FragColor=vec4(c,alpha);}`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.NormalBlending, toneMapped: false });
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius * .72, radius, 1, 48, 18, true), material); mesh.position.y = height * .5; mesh.frustumCulled = false; mesh.renderOrder = 4; parent.add(mesh); return { mesh, material };
}

function makeWaterParticles(parent, count, radius, gateHeight, settings) {
  const position = new Float32Array(count * 3), motion = new Float32Array(count * 4), meta = new Float32Array(count * 4), unit = settings.worldUnitsPerMeter || 16;
  for (let i = 0; i < count; i++) {
    const seed = hash(i + 91), angle = hash(i + 311) * Math.PI * 2, kind = seed < .1 ? 2 : seed < .27 ? 1 : 0;
    const start = kind === 2 ? settings.tide.ebbStart + hash(i + 17) * .5 : settings.impactTime + (kind === 1 ? .3 + hash(i + 23) * 2.2 : hash(i + 29) * .68);
    const x = Math.cos(angle) * radius * Math.sqrt(hash(i + 37)) * .92, z = Math.sin(angle) * radius * Math.sqrt(hash(i + 37)) * .92;
    position.set([x, 0, z], i * 3); motion.set([start, angle, 1.6 + hash(i + 41) * 5.8, .65 + hash(i + 43) * 1.65], i * 4);
    meta.set([kind === 0 ? 2.3 + hash(i + 47) * 2.4 : kind === 1 ? 2.2 + hash(i + 53) * .8 : 2.8, seed, kind, 2.0 + hash(i + 59) * 5.4], i * 4);
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(position, 3)); geometry.setAttribute('aMotion', new THREE.BufferAttribute(motion, 4)); geometry.setAttribute('aMeta', new THREE.BufferAttribute(meta, 4));
  const material = new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uIntensity: { value: 1 }, uGateHeight: { value: gateHeight }, uRadius: { value: radius }, uEbbStart: { value: settings.tide.ebbStart } },
    vertexShader: `attribute vec4 aMotion;attribute vec4 aMeta;uniform float uTime;uniform float uIntensity;uniform float uGateHeight;uniform float uRadius;uniform float uEbbStart;varying float vAlpha;varying float vSeed;varying float vKind;void main(){float age=uTime-aMotion.x;float life=max(.1,aMeta.x);float alive=step(0.0,age)*(1.0-step(life,age));float kind=aMeta.z;float angle=aMotion.y;vec3 p=position;if(kind<.5){float r=age*aMotion.z;p.x+=cos(angle)*r;p.z+=sin(angle)*r;p.y=.25+age*aMeta.w-age*age*1.15;}else if(kind<1.5){p.y=max(.08,uGateHeight-age*aMeta.w);p.x+=sin(age*1.4+aMeta.y*21.0)*.12;p.z+=cos(age*1.1+aMeta.y*17.0)*.12;}else{float phase=clamp(age/life,0.0,1.0);float r=mix(uRadius*.26,.25,phase);angle+=age*2.2;p.x=cos(angle)*r;p.z=sin(angle)*r;p.y=.12+sin(age*4.0+aMeta.y*13.0)*.12;}vAlpha=alive*(1.0-smoothstep(life*.72,life,age))*uIntensity;vSeed=aMeta.y;vKind=kind;vec4 mv=modelViewMatrix*vec4(p,1.0);gl_PointSize=clamp(aMotion.w*(kind<.5?5.0:3.2)*48.0/max(1.0,-mv.z),1.0,10.0);gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `varying float vAlpha;varying float vSeed;varying float vKind;void main(){vec2 q=gl_PointCoord-.5;float r=length(q)*2.0;float edge=1.0-smoothstep(.48,1.0,r);float sparkle=.7+.3*sin(vSeed*137.0);vec3 c=vKind<.5?vec3(.42,.82,.9):vKind<1.5?vec3(.68,.9,.94):vec3(.31,.77,.86);float a=edge*vAlpha*sparkle*(vKind<.5?.42:.3);if(r>1.0||a<.015)discard;gl_FragColor=vec4(c,a);}`,
    transparent: true, depthWrite: false, blending: THREE.NormalBlending, toneMapped: false });
  const points = new THREE.Points(geometry, material); points.frustumCulled = false; points.renderOrder = 6; parent.add(points); return { points, material, count };
}

export function createOceanDominionAttack(parent, index, hex, skill, config, callbacks) {
  const settings = skill.oceanDominion, unit = settings.worldUnitsPerMeter || 16, root = new THREE.Group(); parent.add(root); root.visible = false;
  const radius = Math.max(2, Math.min(settings.tide.maxRadius / unit, skill.spread * (config.aoeRadius / skill.aoe) * (config.aoeScale || 1)));
  const length = settings.whale.length / unit, gateRadius = settings.gate.radius / unit, gateHeight = settings.gate.height / unit;
  const quality = config.quality || 'High', dropCount = Math.min(settings.splash.dropsByQuality.Ultra, Math.round((settings.splash.dropsByQuality[quality] || 32000) * Math.max(.4, config.density || 1) * (config.qualityScale || 1)));
  const gate = makeOceanGate(root, gateRadius, gateHeight), tide = makeTideSurface(root, radius, settings), crown = makeCrownSplash(root, radius, settings.splash.crownHeight / unit, settings.impactTime), column = makeWaterColumn(root, Math.max(.8, radius * .13), settings.splash.columnHeight / unit, settings.impactTime + .06), droplets = makeWaterParticles(root, dropCount, radius, gateHeight, settings);
  const skin = makeWhaleSkin(length, settings.whale.bioluminescence), whaleRig = new THREE.Group(); root.add(whaleRig); const modelSlot = new THREE.Group(); whaleRig.add(modelSlot); const proceduralModel = new THREE.Group(); modelSlot.add(proceduralModel);
  const whale = makeWhaleDetails(proceduralModel, length, skin, quality), wakeMaterial = makeWakeMaterial(), wakes = [0, 1, 2].map(i => makeWakeRibbon(whaleRig, length * (1.1 + i * .17), i * 2.1, wakeMaterial));
  const shadowMaterial = new THREE.ShaderMaterial({ uniforms: { uOpacity: { value: 0 }, uRadius: { value: radius } }, vertexShader: 'varying vec2 vP;void main(){vP=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}', fragmentShader: 'uniform float uOpacity;uniform float uRadius;varying vec2 vP;void main(){float r=length(vP);float a=(1.0-smoothstep(.45,1.0,r/uRadius))*uOpacity;if(a<.01)discard;gl_FragColor=vec4(.004,.014,.024,a);}', transparent: true, depthWrite: false, blending: THREE.NormalBlending, toneMapped: false });
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(radius, 64), shadowMaterial); shadow.rotation.x = -Math.PI / 2; shadow.position.y = .008; shadow.scale.set(.01, .01, .01); root.add(shadow);
  const acousticGeometry = new THREE.TorusGeometry(1, .018, 5, 120), acousticMaterial = new THREE.MeshBasicMaterial({ color: 0x70d7df, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }), acoustic = [];
  for (let i = 0; i < 4; i++) { const ring = new THREE.Mesh(acousticGeometry, acousticMaterial); ring.rotation.x = Math.PI / 2; ring.position.set(0, gateHeight * .6, 0); root.add(ring); acoustic.push(ring); }
  const shockwaveGeometry = new THREE.TorusGeometry(1, .035, 6, 144), shockwaves = settings.shockwaves.map((shock, i) => {
    const color = shock.type === 'pressure' ? 0xc8f3ef : shock.type === 'water' ? 0x75dce2 : 0x39aebc;
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    const mesh = new THREE.Mesh(shockwaveGeometry, material); mesh.rotation.x = Math.PI / 2; mesh.position.y = .06 + i * .012; root.add(mesh);
    return { mesh, material, shock, index: i };
  });
  const pose = { position: new THREE.Vector3(), target: new THREE.Vector3() }, world = new THREE.Vector3(), center = new THREE.Vector3();
  let currentTime = 0, impactDone = false, slowDone = false, lastSurge = -1, lastAftershock = -1, replacedModel = null;
  const surgeTimes = Array.from({ length: settings.tide.secondaryWaves }, (_, i) => settings.impactTime + 1.0 + i * .72), aftershockTimes = Array.from({ length: settings.aftershock.count }, (_, i) => settings.impactTime + 1.05 + i * settings.aftershock.interval);
  function replaceWhaleModel(model) {
    if (!model?.isObject3D) throw new TypeError('Whale replacement must be a THREE.Object3D.');
    if (replacedModel) modelSlot.remove(replacedModel);
    const bounds = new THREE.Box3().setFromObject(model), size = bounds.getSize(new THREE.Vector3()), centerOfModel = bounds.getCenter(new THREE.Vector3()), longest = Math.max(size.x, size.y, size.z, .001), scale = length / longest;
    model.scale.setScalar(scale); model.position.set(-centerOfModel.x * scale, -centerOfModel.y * scale, -centerOfModel.z * scale); modelSlot.add(model); proceduralModel.visible = false; replacedModel = model; return model;
  }

  function update(t, intensity = 1, density = 1) {
    currentTime = Math.max(0, t); const time = currentTime; root.visible = time < settings.totalDuration;
    if (!root.visible) return;
    const gateOpen = smooth(2.35, 2.35 + settings.gate.formDuration, time) * (1 - smooth(settings.impactTime - .2, settings.impactTime + .5, time));
    gate.portalMaterial.uniforms.uTime.value = time; gate.portalMaterial.uniforms.uOpen.value = gateOpen; gate.portalMaterial.uniforms.uIntensity.value = intensity;
    gate.ringMaterial.opacity = gateOpen * .56 * intensity; gate.cloudMaterial.opacity = gateOpen * .18; gate.cracks.material.opacity = gateOpen * .32 * intensity;
    gate.rings.forEach(ring => { ring.rotation.z += ring.userData.spin * .016; ring.scale.setScalar(gate.radius * ring.userData.size * (.92 + Math.sin(time * 1.4 + ring.userData.size) * .025) * Math.max(.01, gateOpen)); });
    gate.group.rotation.y = Math.sin(time * .12) * .08;
    tide.material.uniforms.uTime.value = time; tide.material.uniforms.uIntensity.value = intensity * Math.min(1, density + .18);
    crown.material.uniforms.uTime.value = time; crown.material.uniforms.uIntensity.value = intensity;
    column.material.uniforms.uTime.value = time; column.material.uniforms.uIntensity.value = intensity;
    droplets.material.uniforms.uTime.value = time; droplets.material.uniforms.uIntensity.value = intensity * Math.min(1, density + .12);
    shockwaves.forEach(({ mesh, material, shock, index }) => { const age = time - settings.impactTime - .04 - index * .12, duration = shock.radius / Math.max(1, shock.speed), progress = clamp01(age / duration); mesh.visible = age >= 0 && progress < 1; mesh.scale.setScalar(.035 + progress * shock.radius / unit); material.opacity = (1 - progress) * .5 * intensity; });
    wakeMaterial.uniforms.uTime.value = time; skin.uniforms.uTime.value = time;

    const swimStart = 4.65, diveStart = settings.impactTime - settings.whale.descentTime, swim = clamp01((time - swimStart) / Math.max(.1, diveStart - swimStart));
    const swimAngle = -2.6 + swim * Math.PI * 1.25, orbit = settings.whale.skyArcRadius / unit * .52;
    const swimX = Math.cos(swimAngle) * orbit, swimZ = Math.sin(swimAngle) * orbit, swimY = gateHeight * .92 + Math.sin(swim * Math.PI) * radius * .16;
    const dive = smooth(diveStart, settings.impactTime, time), headClearance = length * .5 + .06;
    const finalX = swimX * (1 - dive), finalZ = swimZ * (1 - dive), finalY = THREE.MathUtils.lerp(swimY, headClearance, Math.pow(dive, 1.45));
    const appear = smooth(swimStart, swimStart + .55, time), dissolve = smooth(settings.impactTime + .06, settings.impactTime + .72, time);
    const spirit = smooth(settings.tide.ebbStart + .45, settings.tide.ebbStart + 1.15, time) * (1 - smooth(settings.tide.ebbStart + 1.72, settings.tide.ebbStart + 2.4, time));
    const spiritRise = smooth(settings.tide.ebbStart + .45, settings.tide.ebbStart + 1.2, time);
    whaleRig.visible = appear > .005 && (time < settings.impactTime + .78 || spirit > .005);
    whaleRig.position.set(spirit > .005 ? Math.sin(time * .7) * .45 : finalX, spirit > .005 ? .7 + spiritRise * 2.8 : finalY, spirit > .005 ? Math.cos(time * .55) * .42 : finalZ);
    const pitch = spirit > .005 ? -.04 : dive * Math.PI * settings.whale.impactAngleDeg / 180;
    whaleRig.rotation.set(pitch, swim > 0 && time < diveStart ? Math.atan2(-Math.sin(swimAngle), Math.cos(swimAngle)) : .14, Math.sin(swim * Math.PI * 2) * .045 * (1 - dive));
    const opacity = spirit > .005 ? .43 * spirit : appear * (1 - dissolve);
    skin.uniforms.uOpacity.value = opacity; skin.uniforms.uDissolve.value = spirit > .005 ? 0 : dissolve; skin.uniforms.uSpirit.value = spirit > .005 ? 1 : 0;
    skin.uniforms.uWag.value = settings.whale.waveAmplitude / .14 * (spirit > .005 ? .34 : 1);
    whale.tailPivot.rotation.x = Math.sin(time * Math.PI * 2 * settings.whale.tailBeatHz) * .22;
    whale.fins.forEach((fin, i) => { fin.rotation.z = Math.sin(time * 1.45 + i * Math.PI) * .09; });
    wakeMaterial.uniforms.uOpacity.value = opacity * (time < settings.impactTime ? .64 : .18);
    wakes.forEach(mesh => { mesh.visible = whaleRig.visible && time < settings.impactTime + .18; mesh.rotation.y = Math.sin(time * .8 + mesh.userData.phase) * .075; });
    const shadowProgress = smooth(diveStart, settings.impactTime, time); shadowMaterial.uniforms.uOpacity.value = .08 + shadowProgress * .48; const shadowScale = .22 + shadowProgress * radius * .11; shadow.scale.set(shadowScale, shadowScale, shadowScale); shadow.position.set(finalX, .008, finalZ);
    acoustic.forEach((ring, i) => { const age = time - (5.15 + i * .2); const p = clamp01(age / 1.7); ring.visible = age >= 0 && p < 1 && time < settings.impactTime; ring.position.set(finalX, finalY + length * .36, finalZ + length * .48); const r = .3 + p * (1.6 + i * .25); ring.scale.set(r, r, r); acousticMaterial.opacity = (1 - p) * .16 * intensity; });
    if (!slowDone && time >= settings.impactTime - settings.slowMotion.preImpactDuration) { slowDone = true; callbacks.beginPreImpactSlowMotion({ ...callbacks.plan, preSlowDuration: settings.slowMotion.preImpactDuration, preSlowScale: settings.slowMotion.preImpactScale }); }
    if (!impactDone && time >= settings.impactTime) { impactDone = true; if (settings.hitStop.enabled) callbacks.beginImpactHitStop({ ...callbacks.plan, hitStop: settings.hitStop.duration }); const shake = { god: 1.72, heavy: 1.5, medium: .9, light: .45 }[settings.cameraShake.impact] || 1.72; callbacks.triggerCameraShake({ ...callbacks.plan, shake, shakeDuration: 1.4, shakeFrequency: 8.5, seed: index * 17 + 43 }); }
    for (let i = 0; i < surgeTimes.length; i++) if (i > lastSurge && time >= surgeTimes[i]) { lastSurge = i; const shake = { god: 1.72, heavy: 1.5, medium: .66, light: .45 }[settings.cameraShake.surge] || .66; callbacks.triggerCameraShake({ ...callbacks.plan, shake: shake * Math.pow(.68, i), shakeDuration: .82, shakeFrequency: 7 + i, seed: index * 23 + i * 19 }); }
    for (let i = 0; i < aftershockTimes.length; i++) if (i > lastAftershock && time >= aftershockTimes[i]) { lastAftershock = i; const shake = { god: 1.72, heavy: 1.5, medium: .66, light: .34 }[settings.cameraShake.aftershock] || .34; callbacks.triggerCameraShake({ ...callbacks.plan, shake: shake * Math.pow(settings.aftershock.decay, i), shakeDuration: .45, shakeFrequency: 10 + i * 2, seed: index * 31 + i + 61 }); }
  }

  function cameraPose() {
    root.getWorldPosition(center); const t = currentTime;
    if (t < 4.8) { pose.position.set(center.x + radius * .42, center.y + gateHeight * 1.32, center.z + radius * 1.45); pose.target.set(center.x, center.y + gateHeight, center.z); }
    else if (t < settings.impactTime - .55) { whaleRig.getWorldPosition(world); pose.position.set(world.x + radius * .76, world.y + length * .32, world.z + radius * .72); pose.target.set(world.x, world.y, world.z); }
    else if (t < settings.impactTime + 1.1) { pose.position.set(center.x + radius * .32, center.y + Math.max(3.2, radius * .36), center.z + radius * 1.35); pose.target.set(center.x, center.y + 2.4, center.z); }
    else if (t < settings.tide.ebbStart) { pose.position.set(center.x + radius * 1.05, center.y + radius * .82, center.z + radius * 1.48); pose.target.set(center.x, center.y + 1.8, center.z); }
    else { pose.position.set(center.x + radius * .22, center.y + radius * 1.52, center.z + radius * 1.12); pose.target.set(center.x, center.y + 1.2, center.z); }
    return pose;
  }

  return {
    group: root, update, cameraPose, replaceWhaleModel,
    environmentMood: () => smooth(1.8, 4.2, currentTime) * (1 - smooth(settings.totalDuration - 1.65, settings.totalDuration, currentTime)),
    flashLevel: () => Math.exp(-Math.pow((currentTime - settings.impactTime - .06) / .24, 2)),
    pressureLevel: () => smooth(settings.impactTime, settings.impactTime + .18, currentTime) * (1 - smooth(settings.impactTime + 1.3, settings.impactTime + 2.3, currentTime)),
    lightPosition: () => center.set(0, gateHeight * .45, 0),
    whaleLength: length, radius, dropCount, gate, tideSurface: tide.mesh, whaleRoot: whaleRig
  };
}
