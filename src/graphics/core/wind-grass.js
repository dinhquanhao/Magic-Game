const COUNTS = Object.freeze({ Low: 360, Medium: 800, High: 1400, Ultra: 2200 });

function random01(seed) {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
}

export function createWindGrass(THREE, scene, windUniform) {
  const bladeGeometry = new THREE.BufferGeometry();
  bladeGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -.045, 0, 0, .045, 0, 0,
    -.031, .34, 0, .031, .34, 0,
    -.016, .68, 0, .016, .68, 0,
    0, 1, 0
  ], 3));
  bladeGeometry.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4, 3, 5, 4, 4, 5, 6]);
  bladeGeometry.computeVertexNormals();
  const maxCount = COUNTS.Ultra;
  const yaws = new Float32Array(maxCount);
  const material = new THREE.MeshStandardMaterial({ color: 0x5d705e, emissive: 0x10190f, emissiveIntensity: 0.14, roughness: 0.94, metalness: 0, side: THREE.DoubleSide, transparent: true, opacity: 0.86, depthWrite: false });
  const mesh = new THREE.InstancedMesh(bladeGeometry, material, maxCount);
  bladeGeometry.setAttribute('aGrassYaw', new THREE.InstancedBufferAttribute(yaws, 1));
  mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  mesh.castShadow = false; mesh.receiveShadow = false; mesh.frustumCulled = false; mesh.visible = false; mesh.name = 'shared-wind-grass';
  const dummy = new THREE.Object3D(), color = new THREE.Color();
  for (let i = 0; i < maxCount; i++) {
    const angle = random01(i + 1) * Math.PI * 2, radius = Math.sqrt(random01(i + 73)) * 68;
    const height = 0.38 + random01(i + 211) * 1.02, width = 0.62 + random01(i + 419) * 0.9, yaw = random01(i + 631) * Math.PI * 2;
    yaws[i] = yaw;
    dummy.position.set(Math.cos(angle) * radius, -0.035, Math.sin(angle) * radius);
    dummy.rotation.set(0, yaw, (random01(i + 853) - 0.5) * 0.12);
    dummy.scale.set(width, height, 1); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
    const tint = 0.76 + random01(i + 997) * 0.38;
    color.setRGB(0.43 * tint, 0.53 * tint, 0.42 * tint); mesh.setColorAt(i, color);
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  const grassAlpha = { value: 0 }, grassTime = { value: 0 };
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uArcWind = windUniform; shader.uniforms.uArcGrassAlpha = grassAlpha; shader.uniforms.uArcGrassTime = grassTime;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
attribute float aGrassYaw;
uniform vec4 uArcWind;
uniform float uArcGrassTime;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
float arcGrassHeight = clamp(position.y, 0.0, 1.0);
float arcGrassCos = cos(aGrassYaw), arcGrassSin = sin(aGrassYaw);
vec2 arcGrassWindLocal = vec2(arcGrassCos * uArcWind.x - arcGrassSin * uArcWind.y, arcGrassSin * uArcWind.x + arcGrassCos * uArcWind.y);
float arcGrassGust = 0.72 + 0.18 * sin(uArcGrassTime * 2.15 + aGrassYaw * 3.1 + position.y * 4.0) + 0.10 * uArcWind.w * sin(uArcGrassTime * 6.4 + aGrassYaw * 8.0);
transformed.xz += arcGrassWindLocal * uArcWind.z * arcGrassGust * arcGrassHeight * arcGrassHeight * 0.82;
transformed.x += sin(uArcGrassTime * 1.35 + aGrassYaw + position.y * 2.7) * uArcWind.w * arcGrassHeight * arcGrassHeight * 0.12;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float uArcGrassAlpha;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
diffuseColor.a *= smoothstep(0.025, 0.14, uArcGrassAlpha);
diffuseColor.rgb *= 0.72 + 0.28 * uArcGrassAlpha;`);
  };
  material.customProgramCacheKey = () => 'arcane-wind-grass-v1'; material.needsUpdate = true;
  let quality = 'High', initialized = false, lastSimulationTime = null;
  function init() { if (!initialized) scene.add(mesh); initialized = true; mesh.count = COUNTS[quality]; return getStatus(); }
  function update(time = 0) {
    const now = Number.isFinite(time) ? time : 0;
    const delta = lastSimulationTime === null ? 0 : Math.min(0.1, Math.max(0, now - lastSimulationTime));
    lastSimulationTime = now;
    const target = Math.max(0, Math.min(1, windUniform.value.z)), rate = target > grassAlpha.value ? 3.4 : 1.45;
    grassAlpha.value += (target - grassAlpha.value) * (1 - Math.exp(-delta * rate));
    mesh.visible = initialized && grassAlpha.value > 0.018;
    grassTime.value = Number.isFinite(time) ? time : 0; return grassAlpha.value;
  }
  function setQuality(nextQuality) { quality = COUNTS[nextQuality] ? nextQuality : 'High'; mesh.count = COUNTS[quality]; return getStatus(); }
  function getStatus() { return { quality, bladeInstances: mesh.count, windAlpha: grassAlpha.value, initialized }; }
  function dispose() { if (initialized) scene.remove(mesh); initialized = false; mesh.visible = false; bladeGeometry.dispose(); material.dispose(); grassAlpha.value = 0; }
  return { init, update, setQuality, getStatus, dispose, mesh, material };
}
