import * as THREE from 'three';

const TAU = Math.PI * 2;
const QUALITY_FRAGMENTS = Object.freeze({ Low: 200, Medium: 500, High: 1200, Ultra: 2500 });
const QUALITY_DUST = Object.freeze({ Low: 280, Medium: 620, High: 1200, Ultra: 1900 });
const QUALITY_SLABS = Object.freeze({ Low: 12, Medium: 22, High: 36, Ultra: 40 });

const clamp01 = value => Math.max(0, Math.min(1, value));
const smooth = (a, b, value) => { const x = clamp01((value - a) / Math.max(.0001, b - a)); return x * x * (3 - 2 * x); };
function hash(x, y = 0, z = 0) { const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453123; return n - Math.floor(n); }
function valueNoise(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = x - ix, fy = y - iy, fz = z - iz;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy), sz = fz * fz * (3 - 2 * fz);
  const a = THREE.MathUtils.lerp(hash(ix, iy, iz), hash(ix + 1, iy, iz), sx);
  const b = THREE.MathUtils.lerp(hash(ix, iy + 1, iz), hash(ix + 1, iy + 1, iz), sx);
  const c = THREE.MathUtils.lerp(hash(ix, iy, iz + 1), hash(ix + 1, iy, iz + 1), sx);
  const d = THREE.MathUtils.lerp(hash(ix, iy + 1, iz + 1), hash(ix + 1, iy + 1, iz + 1), sx);
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(a, b, sy), THREE.MathUtils.lerp(c, d, sy), sz);
}
function fbm(x, y, z, octaves = 5) {
  let sum = 0, weight = .54, total = 0;
  for (let i = 0; i < octaves; i++) { sum += valueNoise(x, y, z) * weight; total += weight; x = x * 2.03 + 7.1; y = y * 2.03 + 3.7; z = z * 2.03 + 5.3; weight *= .48; }
  return sum / Math.max(.001, total);
}

function makeMeteorGeometry(radius, octaves) {
  const geometry = new THREE.IcosahedronGeometry(1, 4);
  const positions = geometry.attributes.position;
  const pits = [];
  for (let i = 0; i < 9; i++) {
    const y = 1 - 2 * (i + .5) / 9, angle = i * 2.399963229728653;
    pits.push(new THREE.Vector3(Math.sqrt(1 - y * y) * Math.cos(angle), y, Math.sqrt(1 - y * y) * Math.sin(angle)));
  }
  const dir = new THREE.Vector3();
  for (let i = 0; i < positions.count; i++) {
    dir.fromBufferAttribute(positions, i).normalize();
    const broad = fbm(dir.x * 3.4 + 2, dir.y * 3.4 - 1, dir.z * 3.4 + 4, octaves) - .5;
    const rough = valueNoise(dir.x * 16 + 9, dir.y * 16, dir.z * 16 - 7) - .5;
    let pit = 0;
    for (const center of pits) { const alignment = Math.max(0, dir.dot(center)); pit = Math.max(pit, Math.exp(-Math.pow((1 - alignment) * 22, 2)) * .105); }
    const radiusScale = THREE.MathUtils.clamp(1 + broad * .32 + rough * .12 - pit, .72, 1.24);
    positions.setXYZ(i, dir.x * radius * radiusScale, dir.y * radius * radiusScale, dir.z * radius * radiusScale);
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function meteorMaterial(radius) {
  return new THREE.ShaderMaterial({
    uniforms: { uRadius: { value: radius }, uHeat: { value: .1 }, uTime: { value: 0 } },
    vertexShader: `varying vec3 vLocal;varying vec3 vNormal;void main(){vLocal=position;vNormal=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `
      uniform float uRadius;uniform float uHeat;uniform float uTime;varying vec3 vLocal;varying vec3 vNormal;
      float h31(vec3 p){p=fract(p*.1031);p+=dot(p,p.yxz+33.33);return fract((p.x+p.y)*p.z);}
      float n3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x),mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x),f.y),mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x),mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x),f.y),f.z);}
      float fb(vec3 p){float v=0.0,a=.56;for(int i=0;i<4;i++){v+=n3(p)*a;p=p*2.03+vec3(7.1,3.7,5.3);a*=.48;}return v;}
      float cellEdge(vec3 p){vec3 i=floor(p),f=fract(p);float d1=8.0,d2=8.0;for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++)for(int z=-1;z<=1;z++){vec3 c=vec3(float(x),float(y),float(z));vec3 g=c+vec3(h31(i+c),h31(i+c+17.0),h31(i+c+41.0));float d=length(c+g-f);if(d<d1){d2=d1;d1=d;}else if(d<d2)d2=d;}return d2-d1;}
      void main(){vec3 n=normalize(vNormal);float noise=fb(vLocal*.48+vec3(2.0,4.0,1.0));float strata=.5+.5*sin(vLocal.y*4.7+noise*8.0+fb(vLocal*1.2)*3.0);vec3 dark=vec3(.075,.068,.059);vec3 earth=vec3(.25,.205,.15);vec3 ochre=vec3(.39,.30,.19);vec3 rock=mix(dark,earth,smoothstep(.2,.72,noise));rock=mix(rock,ochre,smoothstep(.63,.94,strata)*.42);float front=1.0-smoothstep(-.86,-.22,vLocal.y/uRadius);rock=mix(rock,vec3(.025,.024,.022),front*.62);float edge=cellEdge(vLocal*.62+vec3(noise*2.0));float crack=1.0-smoothstep(.035,.13,edge);float heat=clamp(uHeat,0.0,1.0);float flicker=.86+.14*sin(uTime*13.0+noise*29.0);vec3 fissure=mix(vec3(.32,.085,.018),vec3(1.0,.53,.17),heat);float light=.32+.68*max(0.0,dot(n,normalize(vec3(-.38,.72,.58))));vec3 color=rock*light+fissure*crack*(.08+heat*.95)*flicker;gl_FragColor=vec4(color,1.0);}`,
    toneMapped: true
  });
}

function plasmaMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uHeat: { value: 0 }, uOpacity: { value: 0 } },
    vertexShader: `varying vec3 vNormal;varying vec3 vLocal;varying vec3 vEye;void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);vNormal=normalize(normalMatrix*normal);vLocal=position;vEye=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `uniform float uTime;uniform float uHeat;uniform float uOpacity;varying vec3 vNormal;varying vec3 vLocal;varying vec3 vEye;float h(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}float n(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z);}void main(){float facing=1.0-abs(dot(normalize(vNormal),normalize(vEye)));float noise=n(vLocal*3.0+vec3(0.0,uTime*.12,0.0));float front=smoothstep(-.35,.68,-normalize(vLocal).y);float tongues=smoothstep(.42,.8,noise+front*.26);float alpha=(pow(facing,1.45)*.42+tongues*.26)*uHeat*uOpacity;vec3 c=mix(vec3(.88,.16,.025),vec3(1.0,.48,.09),noise);c=mix(c,vec3(1.0,.94,.72),smoothstep(.78,.97,noise)*uHeat);gl_FragColor=vec4(c*(1.0+uHeat),alpha);}`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false
  });
}

function makePortal(parent, height, radius) {
  const group = new THREE.Group(); group.position.y = height; parent.add(group);
  const diskGeo = new THREE.CircleGeometry(radius * .92, 96);
  const diskMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 } },
    vertexShader: `varying vec2 vP;void main(){vP=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `uniform float uTime;uniform float uOpacity;varying vec2 vP;void main(){float r=length(vP);float a=atan(vP.y,vP.x);float radial=1.0-smoothstep(.62,.92,r);float spokes=pow(max(0.0,cos(a*24.0+sin(a*7.0)*.4+uTime*.13)),28.0);float bands=.5+.5*sin(r*38.0-uTime*3.0+sin(a*5.0));float alpha=(radial*.16+spokes*.35+bands*.08)*uOpacity;gl_FragColor=vec4(vec3(.55,.30,.11)+vec3(.4,.21,.06)*spokes,alpha);}`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false
  });
  const disk = new THREE.Mesh(diskGeo, diskMat); disk.rotation.x = -Math.PI / 2; disk.position.y = -.03; group.add(disk);
  const rings = [];
  for (const [scale, direction] of [[1, 1], [.72, -1], [.46, 1]]) {
    const material = new THREE.MeshBasicMaterial({ color: 0xc99557, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius * scale, .045 + .018 * scale, 7, 192), material);
    mesh.rotation.x = Math.PI / 2; mesh.userData.spin = direction; group.add(mesh); rings.push(mesh);
  }
  const ticks = [];
  for (let i = 0; i < 64; i++) {
    const angle = i * TAU / 64, r1 = radius * (.83 + (i % 4 === 0 ? .04 : 0)), r2 = radius * .96;
    ticks.push(new THREE.Vector3(Math.cos(angle) * r1, .02, Math.sin(angle) * r1), new THREE.Vector3(Math.cos(angle) * r2, .02, Math.sin(angle) * r2));
  }
  const tickGeo = new THREE.BufferGeometry().setFromPoints(ticks);
  const tickMat = new THREE.LineBasicMaterial({ color: 0xe5bd80, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  group.add(new THREE.LineSegments(tickGeo, tickMat));
  return { group, diskMat, rings, tickMat };
}

function makeShadow(parent, radius) {
  const geometry = new THREE.CircleGeometry(1, 80);
  const material = new THREE.ShaderMaterial({
    uniforms: { uOpacity: { value: 0 }, uHeat: { value: 0 } },
    vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `uniform float uOpacity;uniform float uHeat;varying vec2 vUv;void main(){vec2 p=(vUv-.5)*2.0;float r=length(p);float edge=1.0-smoothstep(.55,1.0,r);float irregular=.82+.18*sin(atan(p.y,p.x)*9.0+sin(r*17.0));float alpha=edge*uOpacity*irregular;vec3 c=mix(vec3(.012,.009,.006),vec3(.12,.047,.012),uHeat*.16);gl_FragColor=vec4(c,alpha);}`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false
  });
  const mesh = new THREE.Mesh(geometry, material); mesh.rotation.x = -Math.PI / 2; mesh.position.y = -.025; mesh.scale.setScalar(radius); parent.add(mesh); return { mesh, material };
}

function makeCraterGeometry(radius, depth, rimHeight) {
  const radial = 32, segments = 128, positions = [], uvs = [], indices = [];
  for (let ring = 0; ring <= radial; ring++) {
    const r = ring / radial;
    for (let s = 0; s <= segments; s++) {
      const a = s / segments * TAU, rr = r * radius * 1.3;
      const bowl = -depth * (1 - smooth(.05, .83, r)) * .12;
      const rim = rimHeight * Math.exp(-Math.pow((r - .80) / .12, 2));
      const ripple = Math.sin(a * 7 + r * 19) * .035 * (1 - r);
      positions.push(Math.cos(a) * rr, .025 + bowl + rim + ripple, Math.sin(a) * rr);
      uvs.push(.5 + Math.cos(a) * r * .5, .5 + Math.sin(a) * r * .5);
    }
  }
  for (let ring = 0; ring < radial; ring++) for (let s = 0; s < segments; s++) {
    const a = ring * (segments + 1) + s, b = a + segments + 1;
    indices.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

function craterMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uHeat: { value: 1 }, uOpacity: { value: 0 } },
    vertexShader: `varying vec2 vUv;varying float vHeight;void main(){vUv=uv;vHeight=position.y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `uniform float uTime;uniform float uHeat;uniform float uOpacity;varying vec2 vUv;varying float vHeight;void main(){vec2 p=(vUv-.5)*2.0;float r=length(p);float core=1.0-smoothstep(.1,.68,r);float rim=exp(-pow((r-.61)*12.0,2.0));float strata=.5+.5*sin(r*62.0+sin(atan(p.y,p.x)*8.0)*1.4);float cool=smoothstep(1.4,7.0,uTime);vec3 ash=vec3(.045,.039,.031);vec3 hot=vec3(1.0,.29,.035);vec3 edge=vec3(.30,.20,.11);vec3 color=mix(edge,ash,core*.96);color=mix(color,hot,core*uHeat*(1.0-cool)*.88);color+=rim*mix(vec3(.15,.08,.035),vec3(.9,.31,.05),uHeat*(1.0-cool))*(.42+.2*strata);color+=max(0.0,vHeight-.2)*vec3(.035,.027,.018);float alpha=uOpacity*(1.0-smoothstep(1.18,1.31,r));gl_FragColor=vec4(color,alpha);}`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false
  });
}

function makeFaultGeometry(config, radius) {
  const positions = [], travels = [], sides = [];
  const path = (angle, startRadius, length, seed, branch = false) => {
    const steps = branch ? 6 : 14, centers = [];
    for (let j = 0; j <= steps; j++) {
      const t = j / steps, r = startRadius + t * length;
      const a = angle + Math.sin(t * 8.5 + seed) * .13 + Math.sin(t * 17 + seed * 2) * .035;
      centers.push(new THREE.Vector3(Math.cos(a) * r, .075 + Math.sin(t * 9 + seed) * .025, Math.sin(a) * r));
    }
    for (let j = 0; j < steps; j++) {
      const p0 = centers[j], p1 = centers[j + 1], dx = p1.x - p0.x, dz = p1.z - p0.z, m = Math.max(.001, Math.hypot(dx, dz));
      const nx = -dz / m, nz = dx / m, t0 = j / steps, t1 = (j + 1) / steps;
      const width0 = (branch ? .075 : .14) * (1 - .66 * t0) * (0.76 + hash(j, seed) * .5), width1 = (branch ? .075 : .14) * (1 - .66 * t1) * (0.76 + hash(j + 1, seed) * .5);
      const a = [p0.x + nx * width0, p0.y, p0.z + nz * width0], b = [p0.x - nx * width0, p0.y + .004, p0.z - nz * width0], c = [p1.x + nx * width1, p1.y, p1.z + nz * width1], d = [p1.x - nx * width1, p1.y + .004, p1.z - nz * width1];
      for (const [v, travel, side] of [[a,t0,1],[b,t0,-1],[c,t1,1],[c,t1,1],[b,t0,-1],[d,t1,-1]]) { positions.push(...v); travels.push((startRadius + travel * length) / radius); sides.push(side); }
    }
  };
  const count = Math.max(8, config.faultCount || 18), maxRadius = radius;
  for (let i = 0; i < count; i++) {
    const angle = i * TAU / count + (hash(i, 5) - .5) * .2;
    const startRadius = config.craterRadius * (.82 + hash(i, 3) * .12);
    const length = Math.min(maxRadius - startRadius, maxRadius * (.55 + hash(i, 11) * .44));
    path(angle, startRadius, length, i + 2);
    if (i % 2 === 0) {
      const branchT = .28 + hash(i, 23) * .48;
      const branchStart = Math.min(maxRadius, startRadius + length * branchT);
      const branchLength = Math.min(maxRadius - branchStart, length * (.16 + hash(i, 37) * .2));
      path(angle + (hash(i, 29) > .5 ? 1 : -1) * (.28 + hash(i, 31) * .32), branchStart, branchLength, i + 41, true);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('aTravel', new THREE.Float32BufferAttribute(travels, 1)); geometry.setAttribute('aSide', new THREE.Float32BufferAttribute(sides, 1));
  return geometry;
}

function faultMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uReach: { value: 0 }, uHeat: { value: 1 }, uIntensity: { value: 1 }, uTime: { value: 0 } },
    vertexShader: `attribute float aTravel;attribute float aSide;varying float vTravel;varying float vSide;void main(){vTravel=aTravel;vSide=aSide;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `uniform float uReach;uniform float uHeat;uniform float uIntensity;uniform float uTime;varying float vTravel;varying float vSide;void main(){if(vTravel>uReach+.004)discard;float edge=1.0-smoothstep(.2,1.0,abs(vSide));float glow=1.0-smoothstep(.05,.48,abs(vSide));float reveal=1.0-smoothstep(uReach-.045,uReach+.012,vTravel);float cooling=smoothstep(1.5,7.5,uTime);vec3 crack=mix(vec3(.20,.10,.045),vec3(1.0,.40,.055),uHeat*(1.0-cooling));float pulse=.82+.18*sin(uTime*8.0-vTravel*21.0);gl_FragColor=vec4(crack*(.32+glow*1.5)*pulse,edge*reveal*uIntensity*(.35+glow*.62)*(1.0-cooling*.58));}`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false
  });
}

function makeShockwave(radius, color, start, speed, width) {
  const geometry = new THREE.CircleGeometry(1, 128);
  const material = new THREE.ShaderMaterial({
    uniforms: { uRadius: { value: 0 }, uOpacity: { value: 0 }, uWidth: { value: width }, uTime: { value: 0 }, uColor: { value: new THREE.Color(color) } },
    vertexShader: `varying vec2 vP;void main(){vP=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `uniform float uRadius;uniform float uOpacity;uniform float uWidth;uniform float uTime;uniform vec3 uColor;varying vec2 vP;void main(){float r=length(vP);float a=atan(vP.y,vP.x);float noise=.84+.16*sin(a*13.0+sin(a*5.0+uTime)*.7);float band=exp(-pow((r-uRadius)/max(.002,uWidth),2.0));float tail=exp(-pow((r-(uRadius-uWidth*2.1))/max(.002,uWidth*1.9),2.0));float alpha=max(band,tail*.24)*noise*uOpacity;gl_FragColor=vec4(uColor*(.75+band*1.8),alpha);}`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false
  });
  const mesh = new THREE.Mesh(geometry, material); mesh.rotation.x = -Math.PI / 2; mesh.position.y = .095; mesh.scale.setScalar(radius); return { mesh, material, start, speed };
}

function makeInstancedFragments(parent, count, impactAt, radius) {
  const base = new THREE.DodecahedronGeometry(.34, 0), geometry = new THREE.InstancedBufferGeometry();
  geometry.index = base.index;
  for (const [name, attribute] of Object.entries(base.attributes)) geometry.setAttribute(name, attribute);
  const origins = new Float32Array(count * 3), velocities = new Float32Array(count * 3), data = new Float32Array(count * 4), colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const a = hash(i, 2) * TAU, r = Math.sqrt(hash(i, 3)) * radius * .62;
    origins.set([Math.cos(a) * r, .16 + hash(i, 5) * .48, Math.sin(a) * r], i * 3);
    const speed = 3.0 + Math.pow(hash(i, 7), .6) * 14.0, elevation = .28 + hash(i, 11) * .8;
    velocities.set([Math.cos(a) * speed, 2.0 + elevation * speed * .62, Math.sin(a) * speed], i * 3);
    const start = impactAt + .025 + Math.pow(hash(i, 13), 1.4) * 2.25;
    data.set([start, 2.8 + hash(i, 17) * 3.5, .16 + Math.pow(hash(i, 19), 2) * .56, hash(i, 23)], i * 4);
    const shade = .45 + hash(i, 29) * .4; colors.set([shade, shade * (.85 + hash(i, 31) * .14), shade * (.68 + hash(i, 37) * .16)], i * 3);
  }
  geometry.setAttribute('aOrigin', new THREE.InstancedBufferAttribute(origins, 3)); geometry.setAttribute('aVelocity', new THREE.InstancedBufferAttribute(velocities, 3)); geometry.setAttribute('aData', new THREE.InstancedBufferAttribute(data, 4)); geometry.setAttribute('aColor', new THREE.InstancedBufferAttribute(colors, 3)); geometry.instanceCount = count;
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uGravity: { value: 8.4 }, uIntensity: { value: 1 } },
    vertexShader: `attribute vec3 aOrigin;attribute vec3 aVelocity;attribute vec4 aData;attribute vec3 aColor;uniform float uTime;uniform float uGravity;uniform float uIntensity;varying vec3 vColor;varying float vAlpha;varying float vHeat;void main(){float age=uTime-aData.x;float alive=step(0.0,age)*(1.0-step(aData.y,age));float spin=age*(1.3+aData.w*4.7);vec3 p=position*aData.z;float c=cos(spin),s=sin(spin);p.xz=mat2(c,-s,s,c)*p.xz;p.xy=mat2(c*.8,-s,s,c*.8)*p.xy;p+=aOrigin+aVelocity*max(0.0,age)+vec3(0.0,-.5*uGravity*age*age,0.0);vec4 mv=modelViewMatrix*vec4(p,1.0);gl_Position=projectionMatrix*mv;vAlpha=alive*(1.0-smoothstep(aData.y*.68,aData.y,age))*uIntensity;vColor=aColor;vHeat=1.0-smoothstep(0.0,1.8,age);}`,
    fragmentShader: `varying vec3 vColor;varying float vAlpha;varying float vHeat;void main(){vec3 n=normalize(vec3(gl_FragCoord.xy,1.0));float shade=.45+.55*abs(n.y);vec3 c=vColor*shade+vec3(.42,.12,.018)*vHeat;gl_FragColor=vec4(c,vAlpha);}`,
    transparent: true, depthWrite: true, side: THREE.DoubleSide, toneMapped: false
  });
  const mesh = new THREE.Mesh(geometry, material); mesh.frustumCulled = false; parent.add(mesh); base.dispose(); return { mesh, material };
}

function makeDust(parent, count, descentStart, descentDuration, skyHeight, impactAt) {
  const positions = new Float32Array(count * 3), velocities = new Float32Array(count * 3), data = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    const seed = i + 1, trail = i < Math.floor(count * .42), a = hash(seed, 2) * TAU;
    let x = Math.cos(a) * hash(seed, 4) * 2.2, y = .1 + hash(seed, 7) * .8, z = Math.sin(a) * hash(seed, 9) * 2.2;
    let start, life, vx, vy, vz;
    if (trail) {
      start = descentStart + hash(seed, 11) * descentDuration * .95;
      const p = clamp01((start - descentStart) / descentDuration), eased = p * p;
      y = skyHeight - (skyHeight - 5.8) * eased; x += -4.2 + p * 4.2;
      life = 1.4 + hash(seed, 13) * 2.8; vx = (hash(seed, 17) - .5) * 1.2; vy = -1.3 - hash(seed, 19) * 3.4; vz = (hash(seed, 23) - .5) * 1.2;
    } else {
      start = impactAt + hash(seed, 29) * 3.9; life = 2.6 + hash(seed, 31) * 4.2;
      const r = Math.sqrt(hash(seed, 37)) * 8.5; x = Math.cos(a) * r; z = Math.sin(a) * r; y = .12;
      vx = Math.cos(a) * (1.1 + hash(seed, 41) * 3.4); vy = .8 + hash(seed, 43) * 4.2; vz = Math.sin(a) * (1.1 + hash(seed, 47) * 3.4);
    }
    positions.set([x, y, z], i * 3); velocities.set([vx, vy, vz], i * 3); data.set([start, life, .035 + hash(seed, 53) * .14, hash(seed, 59)], i * 4);
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3)); geometry.setAttribute('aVelocity', new THREE.BufferAttribute(velocities, 3)); geometry.setAttribute('aData', new THREE.BufferAttribute(data, 4));
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uIntensity: { value: 1 }, uGravity: { value: 2.8 } },
    vertexShader: `attribute vec3 aVelocity;attribute vec4 aData;uniform float uTime;uniform float uIntensity;uniform float uGravity;varying float vAlpha;varying float vSeed;void main(){float age=uTime-aData.x;float alive=step(0.0,age)*(1.0-step(aData.y,age));vec3 p=position+aVelocity*max(0.0,age)+vec3(sin(age*2.1+aData.w*9.0)*age*.13,-.5*uGravity*age*age,cos(age*1.8+aData.w*7.0)*age*.13);vec4 mv=modelViewMatrix*vec4(p,1.0);float fade=(1.0-smoothstep(aData.y*.66,aData.y,age));gl_PointSize=clamp(aData.z*(820.0/max(1.0,-mv.z))*(1.0+min(age,1.0)*.55),1.0,42.0);vAlpha=alive*fade*uIntensity;vSeed=aData.w;gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `varying float vAlpha;varying float vSeed;void main(){vec2 p=gl_PointCoord-.5;float r=length(p)*2.0;float core=1.0-smoothstep(.04,.68,r);float noise=.82+.18*sin(vSeed*100.0+atan(p.y,p.x)*7.0);if(core<.02)discard;vec3 c=mix(vec3(.21,.12,.065),vec3(.95,.38,.075),.28+.4*noise);gl_FragColor=vec4(c,core*vAlpha*noise);}`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false
  });
  const points = new THREE.Points(geometry, material); points.frustumCulled = false; parent.add(points); return { points, material };
}

function makeSlabs(parent, count, rupture, craterRadius) {
  const geometry = new THREE.IcosahedronGeometry(1, 0), positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i), irregularity = .82 + hash(i, 47) * .34;
    positions.setXYZ(i, x * irregularity, y * (.17 + hash(i, 53) * .12), z * irregularity);
  }
  positions.needsUpdate = true; geometry.computeVertexNormals(); geometry.computeBoundingSphere();
  const data = new Float32Array(count * 4), scales = new Float32Array(count * 3);
  const color = new THREE.Color(), timeUniform = { value: 0 };
  const material = new THREE.MeshStandardMaterial({ color: 0x6a5540, roughness: .97, metalness: .015, flatShading: true });
  const injectMotion = (shader) => {
    shader.uniforms.uSlabTime = timeUniform;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aSlabData;\nattribute vec3 aSlabScale;\nuniform float uSlabTime;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
float slabAge = uSlabTime - aSlabData.z;
float slabRise = smoothstep(0.0, 0.32, slabAge);
float slabSlam = max(0.0, 1.0 - smoothstep(0.5, 1.65, slabAge));
float slabSettle = smoothstep(1.65, 2.5, slabAge);
float slabLift = slabAge < 0.0 ? -1.2 : 0.08 + aSlabScale.y * slabRise * (1.0 - slabSettle * 0.75) - slabSlam * aSlabScale.y * 0.52 + max(0.0, sin(max(0.0, slabAge) * 8.0 + aSlabData.w)) * slabSlam * 0.2;
transformed *= aSlabScale;
float slabCos = cos(aSlabData.x), slabSin = sin(aSlabData.x);
vec2 slabXZ = vec2(transformed.x * slabCos - transformed.z * slabSin, transformed.x * slabSin + transformed.z * slabCos);
float slabTiltX = sin(max(0.0, slabAge) * 3.0 + aSlabData.w) * 0.12 * slabRise;
float slabTiltZ = cos(max(0.0, slabAge) * 2.5 + aSlabData.w) * 0.17 * slabRise;
transformed.x = slabXZ.x + cos(aSlabData.x) * aSlabData.y;
transformed.z = slabXZ.y + sin(aSlabData.x) * aSlabData.y;
transformed.y = transformed.y * (slabAge < 0.0 ? 0.001 : 1.0) + slabLift + slabTiltX * position.z - slabTiltZ * position.x;`);
  };
  material.onBeforeCompile = injectMotion;
  material.customProgramCacheKey = () => 'arcane-earth-fracture-motion-v1';
  const mesh = new THREE.InstancedMesh(geometry, material, count); mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage); mesh.frustumCulled = false; parent.add(mesh);
  const depthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  depthMaterial.onBeforeCompile = injectMotion;
  depthMaterial.customProgramCacheKey = () => 'arcane-earth-fracture-depth-v1';
  mesh.customDepthMaterial = depthMaterial;
  mesh.userData.dispose = () => depthMaterial.dispose();
  const identity = new THREE.Matrix4();
  for (let i = 0; i < count; i++) {
    const a = i * 2.399963 + (hash(i, 3) - .5) * .4, r = craterRadius * (1.04 + hash(i, 7) * .86), start = rupture.impactAt + .18 + r / Math.max(1, rupture.propagationSpeed) + hash(i, 11) * .7;
    const width = .7 + hash(i, 13) * 1.5, height = .23 + hash(i, 17) * .48;
    const phase = hash(i, 19) * TAU;
    data.set([a, r, start, phase], i * 4);
    scales.set([width, height, width * (.45 + hash(i, 23) * .7)], i * 3);
    color.setHSL(.075 + hash(i, 29) * .025, .12, .22 + hash(i, 31) * .13);
    mesh.setMatrixAt(i, identity); mesh.setColorAt(i, color);
  }
  geometry.setAttribute('aSlabData', new THREE.InstancedBufferAttribute(data, 4));
  geometry.setAttribute('aSlabScale', new THREE.InstancedBufferAttribute(scales, 3));
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return { mesh, timeUniform };
}

export function createEarthMeteorAttack(parent, index, hex, skill, config, callbacks) {
  const settings = skill.earthMeteor, root = new THREE.Group(); parent.add(root); root.visible = false;
  const aoe = Math.max(1, skill.spread * (config.aoeRadius / skill.aoe) * (config.aoeScale || 1));
  const meteorRadius = settings.meteor.radius, craterRadius = settings.crater.radius, ruptureRadius = Math.min(settings.rupture.maxRadius, aoe * 1.12);
  const impactAt = callbacks.plan.impactAt, descentTime = settings.meteor.descentTime, descentStart = impactAt - descentTime, skyHeight = settings.meteor.skyHeight;
  const angle = THREE.MathUtils.degToRad(THREE.MathUtils.clamp(settings.meteor.impactAngleDeg, 70, 89.5));
  const drift = (skyHeight - meteorRadius) / Math.tan(angle), driftX = -drift * .42, driftZ = -drift * .91;
  const meteor = new THREE.Group(); root.add(meteor);
  const rockMaterial = meteorMaterial(meteorRadius), distantRockMaterial = meteorMaterial(meteorRadius), rockLod = new THREE.LOD();
  const rock = new THREE.Mesh(makeMeteorGeometry(meteorRadius, settings.meteor.noiseOctaves), rockMaterial);
  const distantRock = new THREE.Mesh(makeMeteorGeometry(meteorRadius, Math.max(2, settings.meteor.noiseOctaves - 2)), distantRockMaterial);
  rockLod.addLevel(rock, 0); rockLod.addLevel(distantRock, 42); meteor.add(rockLod);
  rock.material.uniforms.uHeat.value = .1;
  const crackPositions = [];
  for (let i = 0; i < 21; i++) {
    const seed = i + 7, start = new THREE.Vector3(Math.sin(seed * 4.1), Math.cos(seed * 7.3), Math.sin(seed * 9.7)).normalize();
    let tangent = new THREE.Vector3().crossVectors(start, new THREE.Vector3(0, 1, 0)); if (tangent.lengthSq() < .02) tangent.set(1, 0, 0); tangent.normalize();
    const tangent2 = new THREE.Vector3().crossVectors(start, tangent).normalize(), points = [];
    for (let j = 0; j <= 13; j++) {
      const t = j / 13 - .5, direction = start.clone().addScaledVector(tangent, t * .9).addScaledVector(tangent2, Math.sin(t * 9 + seed) * .07).normalize();
      const radial = meteorRadius * (.998 + .005 * Math.sin(seed + j * 4.2)); points.push(direction.multiplyScalar(radial));
    }
    for (let j = 0; j < points.length - 1; j++) crackPositions.push(points[j].x, points[j].y, points[j].z, points[j + 1].x, points[j + 1].y, points[j + 1].z);
  }
  const crackGeo = new THREE.BufferGeometry(); crackGeo.setAttribute('position', new THREE.Float32BufferAttribute(crackPositions, 3));
  const meteorCracksMat = new THREE.LineBasicMaterial({ color: 0xf26b24, transparent: true, opacity: .62, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  meteor.add(new THREE.LineSegments(crackGeo, meteorCracksMat));
  const plasma = new THREE.Mesh(new THREE.IcosahedronGeometry(meteorRadius * 1.13, 3), plasmaMaterial()); meteor.add(plasma);
  plasma.rotation.x = Math.PI * .5;
  const bowShockMaterial = new THREE.MeshBasicMaterial({ color: 0xffd49a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  const bowShock = new THREE.Mesh(new THREE.TorusGeometry(meteorRadius * 1.27, .12, 8, 72), bowShockMaterial);
  bowShock.rotation.x = Math.PI / 2; bowShock.position.y = meteorRadius * .68; meteor.add(bowShock);
  const orbitGeometry = new THREE.DodecahedronGeometry(.38, 0), orbitMaterial = new THREE.MeshStandardMaterial({ color: 0x554638, roughness: .98, flatShading: true });
  const orbitingRocks = new THREE.InstancedMesh(orbitGeometry, orbitMaterial, 14), orbitDummy = new THREE.Object3D(); orbitingRocks.instanceMatrix.setUsage(THREE.DynamicDrawUsage); meteor.add(orbitingRocks);

  const portal = makePortal(root, skyHeight + 3.0, Math.max(4.8, meteorRadius * 1.75));
  const shadow = makeShadow(root, craterRadius * 1.85);
  const crater = new THREE.Mesh(makeCraterGeometry(craterRadius, settings.crater.depth, settings.crater.rimHeight), craterMaterial()); crater.position.y = .34; crater.visible = false; root.add(crater);
  const faultGeo = makeFaultGeometry({ ...settings.rupture, craterRadius }, ruptureRadius);
  const faultMat = faultMaterial(); const faults = new THREE.Mesh(faultGeo, faultMat); faults.frustumCulled = false; root.add(faults);
  const fragmentCount = Math.max(120, Math.min(2500, Math.round((settings.meteor.fragmentCount[config.quality] || QUALITY_FRAGMENTS.High) * Math.max(.45, config.debrisDensity || 1) * (config.qualityScale || 1))));
  const fragments = makeInstancedFragments(root, fragmentCount, impactAt, craterRadius);
  const dustCount = Math.round((QUALITY_DUST[config.quality] || QUALITY_DUST.High) * Math.max(.45, config.density || 1) * (config.qualityScale || 1));
  const dust = makeDust(root, dustCount, descentStart, descentTime, skyHeight, impactAt);
  const slabsCount = Math.max(12, Math.round((settings.rupture.slabs[config.quality] || QUALITY_SLABS.High) * (config.qualityScale || 1)));
  const slabs = makeSlabs(root, slabsCount, { impactAt, propagationSpeed: settings.rupture.propagationSpeed }, craterRadius);
  const shockwaves = [
    makeShockwave(ruptureRadius * 1.16, 0xffe1a0, impactAt + .04, 1.1, .026),
    makeShockwave(ruptureRadius * 1.34, 0x9b7048, impactAt + .32, .72, .045),
    makeShockwave(ruptureRadius * 1.48, 0xe0a651, impactAt + .68, .58, .018)
  ];
  shockwaves.forEach(wave => root.add(wave.mesh));

  const cloudMaterial = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uAlpha: { value: 0 }, uHeat: { value: 0 }, uSeed: { value: 0 } },
    vertexShader: `varying vec3 vN;varying vec3 vEye;varying vec3 vP;void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);vN=normalize(normalMatrix*normal);vEye=normalize(-mv.xyz);vP=position;gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `uniform float uTime;uniform float uAlpha;uniform float uHeat;uniform float uSeed;varying vec3 vN;varying vec3 vEye;varying vec3 vP;float h(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}float n(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z);}void main(){float f=abs(dot(normalize(vN),normalize(vEye)));float noise=n(vP*2.6+vec3(0.,uTime*.08,uSeed));float rim=1.-smoothstep(.22,.92,f);float breakup=smoothstep(.23,.72,noise+rim*.28);float alpha=breakup*rim*uAlpha;vec3 dust=mix(vec3(.17,.12,.075),vec3(.52,.29,.13),noise);dust=mix(dust,vec3(.83,.29,.065),uHeat*.42);gl_FragColor=vec4(dust,alpha);}`,
    transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.NormalBlending, toneMapped: false
  });
  const clouds = [];
  for (let i = 0; i < 3; i++) { const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), cloudMaterial.clone()); mesh.material.uniforms.uSeed.value = i * 4.7; mesh.visible = false; root.add(mesh); clouds.push(mesh); }

  const pose = { position: new THREE.Vector3(), target: new THREE.Vector3() }, worldCenter = new THREE.Vector3(), meteorWorld = new THREE.Vector3(), lastMeteorPosition = new THREE.Vector3();
  let currentTime = 0, preSlow = false, impactDone = false, lastAftershock = -1;
  const aftershockTimes = settings.aftershock.times.map(offset => impactAt + offset);

  function meteorHeight(t) {
    if (t < descentStart) return skyHeight;
    const p = clamp01((t - descentStart) / descentTime), ease = p * p * (2.2 - 1.2 * p);
    return THREE.MathUtils.lerp(skyHeight, meteorRadius * .98, ease);
  }
  function heatLevel(t) {
    const descent = smooth(descentStart, impactAt - .25, t);
    const blast = Math.exp(-Math.pow((t - impactAt) / .42, 2));
    const cooling = smooth(impactAt + .8, settings.totalDuration, t);
    return clamp01(Math.max(.08 + descent * .72, blast) * (1 - cooling * .62));
  }
  function update(time, intensity = 1) {
    const t = Math.max(0, time * skill.pace); currentTime = t;
    root.visible = t < settings.totalDuration;
    if (!root.visible) return;
    const appear = smooth(2.5, 3.45, t), descent = clamp01((t - descentStart) / descentTime), heat = heatLevel(t);
    const pathP = Math.pow(descent, 1.36), currentY = meteorHeight(t), currentX = THREE.MathUtils.lerp(driftX, 0, pathP), currentZ = THREE.MathUtils.lerp(driftZ, 0, pathP);
    meteor.position.set(currentX, currentY, currentZ); meteor.rotation.set(.2 + t * .035, t * .16, -.13 + t * .028);
    const meteorFade = 1 - smooth(impactAt + .025, impactAt + .22, t);
    meteor.visible = t >= 2.48 && meteorFade > .002;
    meteor.scale.setScalar(Math.max(.001, appear * meteorFade));
    for (const material of [rockMaterial, distantRockMaterial]) { material.uniforms.uHeat.value = heat; material.uniforms.uTime.value = t; }
    plasma.material.uniforms.uTime.value = t; plasma.material.uniforms.uHeat.value = heat; plasma.material.uniforms.uOpacity.value = smooth(descentStart - .25, descentStart + .6, t) * meteorFade * .78;
    bowShock.rotation.z += .008; bowShock.scale.setScalar(1 + Math.sin(t * 8) * .035); bowShockMaterial.opacity = smooth(descentStart - .15, descentStart + .5, t) * meteorFade * (.14 + heat * .2) * intensity;
    meteorCracksMat.opacity = (.32 + heat * .58) * meteorFade * intensity;
    for (let i = 0; i < 14; i++) {
      const a = i * TAU / 14 + t * (i % 2 ? .52 : -.4), orbit = meteorRadius * (1.2 + .18 * (i % 5));
      orbitDummy.position.set(Math.cos(a) * orbit, Math.sin(a * 1.6 + i) * meteorRadius * .55, Math.sin(a) * orbit);
      orbitDummy.rotation.set(a * .72, a * 1.31, a * .46); orbitDummy.scale.setScalar(.24 + (i % 4) * .12); orbitDummy.updateMatrix(); orbitingRocks.setMatrixAt(i, orbitDummy.matrix);
    }
    orbitingRocks.instanceMatrix.needsUpdate = true;

    const portalOpen = smooth(2.2, 3.2, t), portalFade = 1 - smooth(5.3, 6.7, t);
    portal.diskMat.uniforms.uTime.value = t; portal.diskMat.uniforms.uOpacity.value = portalOpen * portalFade * .8 * intensity;
    portal.rings.forEach((item, i) => { item.rotation.z += .0022 * item.userData.spin * (i + 1); item.material.opacity = portalOpen * portalFade * (.55 - i * .07) * intensity; });
    portal.tickMat.opacity = portalOpen * portalFade * .52 * intensity;

    const shadowApproach = smooth(2.7, impactAt, t), shadowStrength = shadowApproach * (1 - smooth(impactAt + 1.5, impactAt + 7, t));
    shadow.material.uniforms.uOpacity.value = shadowStrength * (.28 + .56 * shadowApproach);
    shadow.material.uniforms.uHeat.value = heat;
    shadow.mesh.position.set(currentX, -.025, currentZ);
    shadow.mesh.scale.setScalar(craterRadius * (1.08 + shadowApproach * .72));

    const impactProgress = smooth(impactAt - .08, impactAt + .58, t);
    crater.visible = t >= impactAt - .08; crater.scale.setScalar(Math.max(.001, impactProgress));
    crater.material.uniforms.uTime.value = Math.max(0, t - impactAt); crater.material.uniforms.uHeat.value = Math.max(0, 1 - smooth(impactAt + 1.2, impactAt + 8.6, t)); crater.material.uniforms.uOpacity.value = impactProgress * (1 - smooth(settings.totalDuration - 2.2, settings.totalDuration, t)) * intensity;
    faultMat.uniforms.uReach.value = smooth(impactAt + .2, impactAt + settings.rupture.propagationDuration, t);
    faultMat.uniforms.uHeat.value = heat; faultMat.uniforms.uTime.value = Math.max(0, t - impactAt); faultMat.uniforms.uIntensity.value = intensity;

    fragments.material.uniforms.uTime.value = t; fragments.material.uniforms.uIntensity.value = intensity;
    dust.material.uniforms.uTime.value = t; dust.material.uniforms.uIntensity.value = intensity;
    shockwaves.forEach((wave, i) => { const p = clamp01((t - wave.start) * wave.speed / ruptureRadius); wave.material.uniforms.uRadius.value = p; wave.material.uniforms.uOpacity.value = p > 0 && p < 1 ? (1 - p) * (.82 - i * .16) * intensity : 0; wave.material.uniforms.uTime.value = t; });
    slabs.timeUniform.value = t;

    clouds.forEach((cloud, i) => {
      const cloudAge = Math.max(0, t - (impactAt + i * .38)); cloud.visible = t >= impactAt && cloudAge < 7.2;
      const expand = .5 + smooth(0, 2.1, cloudAge) * (1.2 + i * .32), rise = Math.max(0, cloudAge) * (.42 + i * .11);
      cloud.position.set(Math.sin(i * 4.8 + cloudAge * .4) * craterRadius * .18, .5 + rise, Math.cos(i * 3.2 + cloudAge * .35) * craterRadius * .2);
      cloud.scale.set(craterRadius * expand, craterRadius * (.36 + i * .08) * expand, craterRadius * expand);
      cloud.material.uniforms.uTime.value = t; cloud.material.uniforms.uHeat.value = heat; cloud.material.uniforms.uAlpha.value = cloud.visible ? (.25 + i * .035) * Math.max(0, 1 - cloudAge / 7.2) * intensity : 0;
    });

    if (!preSlow && t >= impactAt - callbacks.plan.preSlowDuration) { preSlow = true; callbacks.beginPreImpactSlowMotion(callbacks.plan); }
    if (!impactDone && t >= impactAt) {
      impactDone = true; callbacks.beginImpactHitStop(callbacks.plan); callbacks.triggerCameraShake({ ...callbacks.plan, shake: 1.55, shakeDuration: 1.38, shakeFrequency: 18, seed: index * 2.7 + 17 });
    }
    for (let i = 0; i < aftershockTimes.length; i++) if (i > lastAftershock && t >= aftershockTimes[i]) {
      lastAftershock = i; callbacks.triggerCameraShake({ ...callbacks.plan, shake: .62 * Math.pow(settings.aftershock.decay, i), shakeDuration: .62, shakeFrequency: 8 + i * 2, seed: index * 3 + i + 41 });
    }
    root.getWorldPosition(worldCenter); meteor.getWorldPosition(meteorWorld); lastMeteorPosition.copy(meteorWorld);
  }

  function cameraPose() {
    root.getWorldPosition(worldCenter); meteor.getWorldPosition(meteorWorld);
    const t = currentTime;
    if (t < 2.8) { pose.position.set(worldCenter.x + 8, worldCenter.y + 19, worldCenter.z + 28); pose.target.set(worldCenter.x, worldCenter.y + skyHeight + 1, worldCenter.z); }
    else if (t < descentStart) { pose.position.set(worldCenter.x + 17, worldCenter.y + 12, worldCenter.z + 23); pose.target.set(worldCenter.x + driftX * .35, worldCenter.y + skyHeight * .88, worldCenter.z + driftZ * .35); }
    else if (t < impactAt - .35) { pose.position.set(meteorWorld.x + 12, worldCenter.y + Math.max(6, meteor.position.y * .45), meteorWorld.z + 22); pose.target.set(meteorWorld.x, worldCenter.y + meteor.position.y * .72, meteorWorld.z); }
    else if (t < impactAt + .6) { pose.position.set(worldCenter.x + 14, worldCenter.y + 11, worldCenter.z + 25); pose.target.set(worldCenter.x, worldCenter.y + 1, worldCenter.z); }
    else { const p = smooth(impactAt + .6, impactAt + 2.2, t); pose.position.set(worldCenter.x + 1, worldCenter.y + ruptureRadius * (1.1 + p * .45), worldCenter.z + ruptureRadius * (1.35 + p * .55)); pose.target.set(worldCenter.x, worldCenter.y, worldCenter.z); }
    return pose;
  }

  function heatCenter(target) {
    target.copy(currentTime < impactAt ? lastMeteorPosition : worldCenter);
    if (currentTime >= impactAt) target.y += .6;
    return target;
  }
  return {
    group: root, update, cameraPose, heatCenter,
    heatLevel: () => heatLevel(currentTime),
    flashLevel: () => Math.exp(-Math.pow((currentTime - impactAt - .035) / .13, 2)),
    environmentMood: () => clamp01(.2 + smooth(2.4, 6.4, currentTime) * .55 - smooth(impactAt + 2, impactAt + 9, currentTime) * .22),
    lightPosition: () => meteor.position,
    impactAt, rayCount: fragmentCount, slabCount: slabsCount
  };
}
