import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createPostEffects } from './graphics/core/post-effects.js';
import { createGraphicsFields } from './graphics/core/fields.js';
import { createWindGrass } from './graphics/core/wind-grass.js';
import { createParticleWind } from './graphics/core/particle-wind.js';

export const GRAPHICS_PRESETS = Object.freeze({
  Low: Object.freeze({ reflections: false, ao: false, volumetric: false, caustics: false, subsurface: false, motionBlur: false, dof: false, adaptive: true }),
  Medium: Object.freeze({ reflections: true, ao: true, volumetric: false, caustics: false, subsurface: false, motionBlur: false, dof: false, adaptive: true }),
  High: Object.freeze({ reflections: true, ao: true, volumetric: true, caustics: true, subsurface: true, motionBlur: false, dof: false, adaptive: true }),
  Ultra: Object.freeze({ reflections: true, ao: true, volumetric: true, caustics: true, subsurface: true, motionBlur: true, dof: false, adaptive: true })
});

const QUALITY_SCALE = Object.freeze({ Low: 0.8, Medium: 1.1, High: 1.45, Ultra: 1.8 });

function injectShaderDeclarations(source, declarations) {
  const commonChunk = '#include <common>';
  return source.includes(commonChunk) ? source.replace(commonChunk, `${commonChunk}\n${declarations}`) : `${declarations}\n${source}`;
}

export function createGraphicsUpgrade(THREE, renderer, scene, ground, composer, distortionPass, bloom) {
  const fields = createGraphicsFields(THREE);
  fields.init();
  const particleWind = createParticleWind(fields.getUniforms().uArcWind);
  const windGrass = createWindGrass(THREE, scene, fields.getUniforms().uArcWind);
  windGrass.init();
  const postEffects = createPostEffects({ renderer, scene, camera: composer.passes.find((pass) => pass.scene)?.camera, ground, composer, width: window.innerWidth, height: window.innerHeight, bloom });
  postEffects.init();
  const outputPass = new OutputPass();
  composer.addPass(outputPass);
  let environmentTarget;
  function restoreEnvironment() {
    // Render-target contents do not survive WebGL context loss. Re-render the
    // procedural IBL instead of reusing an allocated but empty PMREM texture.
    const room = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const nextTarget = pmrem.fromScene(room, 0.035);
    scene.environment = nextTarget.texture;
    environmentTarget?.dispose();
    environmentTarget = nextTarget;
    pmrem.dispose();
    room.dispose();
  }
  restoreEnvironment();
  function contextLost() {
    // Clear listeners while GL is lost. A dispose after restoration would try
    // deleting framebuffer/texture handles belonging to the former context.
    environmentTarget?.dispose();
    environmentTarget = null;
    scene.environment = null;
  }

  const groundUniforms = {
    uArcTime: { value: 0 },
    uGroundCenter: { value: new THREE.Vector2() },
    uGroundRadius: { value: 1 },
    uSurfaceState: { value: new THREE.Vector4() },
    uSurfaceAux: { value: new THREE.Vector4() },
    uBloodStain: { value: 0 },
    uSurfaceDust: { value: 0 },
    uSurfaceMud: { value: 0 },
    uSurfaceHeat: { value: 0 },
    uSurfaceNature: { value: 0 },
    uGroundAO: { value: 0 },
    uGroundCaustics: { value: 0 },
    uGroundDisturbance: { value: 0 },
    ...fields.getUniforms()
  };
  const groundMaterial = ground.material;
  groundMaterial.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, groundUniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uArcTime;\nuniform float uGroundDisturbance;\nuniform vec4 uArcWind;\nvarying vec3 vArcGroundPos;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
vArcGroundPos = vec3(position.x, 0.0, position.y);
float arcGroundWave = sin(position.x * 0.31 + uArcTime * 0.13) * cos(position.y * 0.27 - uArcTime * 0.11);
float arcWindPhase = dot(position.xy, uArcWind.xy) * 0.22 + uArcTime * (0.4 + uArcWind.w * 1.8);
transformed.z += arcGroundWave * uGroundDisturbance * 0.055 + sin(arcWindPhase) * uArcWind.z * 0.045;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float uArcTime;
uniform vec2 uGroundCenter;
uniform float uGroundRadius;
uniform vec4 uSurfaceState;
uniform vec4 uSurfaceAux;
uniform float uBloodStain;
uniform float uSurfaceDust;
uniform float uSurfaceMud;
uniform float uSurfaceHeat;
uniform float uSurfaceNature;
uniform float uGroundAO;
uniform float uGroundCaustics;
uniform vec4 uArcLightPositionRadius[8];
uniform vec4 uArcLightColorIntensity[8];
uniform float uArcLightCount;
varying vec3 vArcGroundPos;
float arcGroundHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float arcGroundNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(arcGroundHash(i), arcGroundHash(i + vec2(1.0, 0.0)), f.x), mix(arcGroundHash(i + vec2(0.0, 1.0)), arcGroundHash(i + vec2(1.0, 1.0)), f.x), f.y);
}`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
// Static soil detail stays anchored to the ground as the camera/time changes.
// Fade fine grain below a pixel to avoid distant shimmer; no texture allocation.
float arcSoilPatch = arcGroundNoise(vArcGroundPos.xz * 0.23);
vec2 arcSoilUV = vArcGroundPos.xz * 2.6;
float arcSoilDetail = 1.0 - smoothstep(0.35, 1.0, max(fwidth(arcSoilUV.x), fwidth(arcSoilUV.y)));
float arcSoilGrain = mix(0.5, arcGroundNoise(arcSoilUV), arcSoilDetail);
diffuseColor.rgb *= (0.78 + arcSoilPatch * 0.36) * (0.94 + arcSoilGrain * 0.12);
roughnessFactor = clamp(roughnessFactor + (arcSoilGrain - 0.5) * 0.04, 0.0, 1.0);
float arcGroundNoiseValue = arcGroundNoise(vArcGroundPos.xz * 0.19 + vec2(uArcTime * 0.018, -uArcTime * 0.012));
float arcGroundMask = 1.0 - smoothstep(max(0.15, uGroundRadius * 0.45), max(0.2, uGroundRadius), distance(vArcGroundPos.xz, uGroundCenter));
float arcNature=clamp(uSurfaceNature*arcGroundMask,0.,1.);
diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.065,.13,.027)*(.7+arcGroundNoiseValue*.5),arcNature*.82);
float arcWet = clamp(uSurfaceState.x * arcGroundMask, 0.0, 1.0);
float arcBurn = clamp(uSurfaceState.y * arcGroundMask, 0.0, 1.0);
float arcFrost = clamp(uSurfaceState.z * arcGroundMask, 0.0, 1.0);
float arcAcid = clamp(uSurfaceState.w * arcGroundMask, 0.0, 1.0);
float arcDust = clamp(uSurfaceDust * arcGroundMask, 0.0, 1.0);
float arcMud = clamp(uSurfaceMud * arcGroundMask, 0.0, 1.0);
float arcCrack = clamp(uSurfaceAux.x * arcGroundMask, 0.0, 1.0);
float arcCrackLine = 1.0 - smoothstep(0.0, 0.055, abs(sin((vArcGroundPos.x + arcGroundNoiseValue * 1.9) * 0.9) * sin((vArcGroundPos.z - arcGroundNoiseValue * 1.4) * 1.1)));
diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.32, 0.52, 0.60), arcWet * 0.78);
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.24, 0.12, 0.075) * (0.72 + arcGroundNoiseValue * 0.3), arcBurn * (0.56 + arcGroundNoiseValue * 0.28));
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.52, 0.70, 0.79) * (0.78 + arcGroundNoiseValue * 0.34), arcFrost * 0.68);
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.20, 0.26, 0.075) * (0.65 + arcGroundNoiseValue * 0.5), arcAcid * 0.72);
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.19, 0.035, 0.055) * (0.72 + arcGroundNoiseValue * 0.3), uBloodStain * arcGroundMask * 0.74);
diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.72, 0.68, 0.56), arcDust * 0.55);
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.20, 0.15, 0.10) * (0.74 + arcGroundNoiseValue * 0.24), arcMud * 0.68);
diffuseColor.rgb *= 1.0 - clamp(uGroundAO * arcGroundMask * (0.14 + 0.2 * arcCrackLine), 0.0, 0.42);
diffuseColor.rgb *= 1.0 - clamp(uSurfaceAux.w * arcGroundMask * 0.28, 0.0, 0.32);
diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.38, arcCrack * arcCrackLine * 0.78);
roughnessFactor = mix(roughnessFactor, 0.16, arcWet * 0.88);
roughnessFactor = mix(roughnessFactor, 0.96, arcFrost * 0.46);
roughnessFactor = mix(roughnessFactor, 0.94, arcDust * 0.38 + arcMud * 0.48);
`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
metalnessFactor = mix(metalnessFactor, 0.24, arcWet * 0.54);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
float arcCausticPattern = pow(max(0.0, sin(vArcGroundPos.x * 1.7 + uArcTime * 0.8 + sin(vArcGroundPos.z * 0.7)) * sin(vArcGroundPos.z * 1.9 - uArcTime * 0.62)), 8.0);
float arcCaustic = arcCausticPattern * uGroundCaustics * arcGroundMask * clamp(arcWet + arcFrost * 0.48, 0.0, 1.0);
totalEmissiveRadiance += vec3(0.035, 0.22, 0.31) * arcCaustic;
totalEmissiveRadiance += vec3(0.32, 0.14, 0.045) * arcBurn * arcCrackLine * 0.08;
totalEmissiveRadiance += vec3(0.38, 0.16, 0.045) * uSurfaceHeat * arcGroundMask * 0.085;
totalEmissiveRadiance += vec3(0.38, 0.48, 0.58) * uSurfaceAux.z * arcGroundMask * 0.08;
vec3 arcInjectedLight = vec3(0.0);
for (int arcLightIndex = 0; arcLightIndex < 8; arcLightIndex++) {
  if (float(arcLightIndex) >= uArcLightCount) break;
  vec4 arcLightPositionRadius = uArcLightPositionRadius[arcLightIndex];
  vec4 arcLightColorIntensity = uArcLightColorIntensity[arcLightIndex];
  float arcLightDistance = distance(vArcGroundPos, arcLightPositionRadius.xyz);
  float arcLightReach = max(1.0, arcLightPositionRadius.w);
  float arcLightFalloff = (1.0 / (1.0 + arcLightDistance * arcLightDistance / max(1.0, arcLightReach * arcLightReach))) * pow(max(0.0, 1.0 - arcLightDistance / arcLightReach), 2.0);
  arcInjectedLight += arcLightColorIntensity.rgb * arcLightColorIntensity.a * arcLightFalloff * 0.018;
}
totalEmissiveRadiance += min(arcInjectedLight, vec3(0.22)) * (0.24 + arcWet * 0.55 + arcFrost * 0.28);`);
  };
  groundMaterial.customProgramCacheKey = () => 'arcane-ground-reactive-v3-soil';
  groundMaterial.needsUpdate = true;

  const enhancedMaterials = new WeakSet();
  const enhancedMaterialList = new Set();
  const subsurfaceUniform = { value: 0 };
  const lightFieldUniforms = fields.getUniforms();
  function enhanceSurfaces(root) {
    particleWind.connect(root);
    root.traverse((object) => {
      if (object === ground || !object.isMesh || object.isPoints || object.isLine) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      const hasPhysicalSurface = materials.some((material) => material?.isMeshStandardMaterial || material?.isMeshPhysicalMaterial);
      if (!hasPhysicalSurface) return;
      const vertexCount = object.geometry?.attributes?.position?.count || 0;
      const isLargeInstance = object.isInstancedMesh && object.count <= 240;
      const isDetailedSurface = vertexCount >= 96 && vertexCount <= 20000;
      if (isLargeInstance || isDetailedSurface) object.castShadow = true;
      if (isDetailedSurface) object.receiveShadow = true;
      for (const material of materials) {
        if (!(material?.isMeshStandardMaterial || material?.isMeshPhysicalMaterial) || enhancedMaterials.has(material)) continue;
        enhancedMaterials.add(material);
        enhancedMaterialList.add(material);
        const onDispose = () => {
          enhancedMaterialList.delete(material);
          material.removeEventListener('dispose', onDispose);
        };
        material.addEventListener('dispose', onDispose);
        const previousCompile = material.onBeforeCompile;
        material.onBeforeCompile = (shader, activeRenderer) => {
          previousCompile?.call(material, shader, activeRenderer);
          shader.uniforms.uArcSubsurface = subsurfaceUniform;
          shader.uniforms.uArcLightPositionRadius = lightFieldUniforms.uArcLightPositionRadius;
          shader.uniforms.uArcLightColorIntensity = lightFieldUniforms.uArcLightColorIntensity;
          shader.uniforms.uArcLightCount = lightFieldUniforms.uArcLightCount;
          shader.uniforms.uArcSurfaceCenter = groundUniforms.uGroundCenter;
          shader.uniforms.uArcSurfaceRadius = groundUniforms.uGroundRadius;
          shader.uniforms.uArcSurfaceState = groundUniforms.uSurfaceState;
          shader.uniforms.uArcSurfaceAux = groundUniforms.uSurfaceAux;
          shader.uniforms.uArcSurfaceBlood = groundUniforms.uBloodStain;
          shader.uniforms.uArcSurfaceDust = groundUniforms.uSurfaceDust;
          shader.uniforms.uArcSurfaceMud = groundUniforms.uSurfaceMud;
          shader.uniforms.uArcSurfaceHeat = groundUniforms.uSurfaceHeat;
          shader.vertexShader = injectShaderDeclarations(shader.vertexShader, 'varying vec3 vArcSurfaceWorldPosition;')
            .replace('#include <begin_vertex>', `#include <begin_vertex>
vec4 arcSurfaceWorldPosition = modelMatrix * vec4(transformed, 1.0);
#ifdef USE_INSTANCING
arcSurfaceWorldPosition = modelMatrix * instanceMatrix * vec4(transformed, 1.0);
#endif
vArcSurfaceWorldPosition = arcSurfaceWorldPosition.xyz;`);
          shader.fragmentShader = injectShaderDeclarations(shader.fragmentShader, `
uniform float uArcSubsurface;
uniform vec4 uArcLightPositionRadius[8];
uniform vec4 uArcLightColorIntensity[8];
uniform float uArcLightCount;
uniform vec2 uArcSurfaceCenter;
uniform float uArcSurfaceRadius;
uniform vec4 uArcSurfaceState;
uniform vec4 uArcSurfaceAux;
uniform float uArcSurfaceBlood;
uniform float uArcSurfaceDust;
uniform float uArcSurfaceMud;
uniform float uArcSurfaceHeat;
varying vec3 vArcSurfaceWorldPosition;
float arcMaterialHash(vec3 p) { return fract(sin(dot(p, vec3(17.13, 41.7, 13.9))) * 43758.5453); }
float arcMaterialNoise(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = arcMaterialHash(i), b = arcMaterialHash(i + vec3(1.0, 0.0, 0.0));
  float c = arcMaterialHash(i + vec3(0.0, 1.0, 0.0)), d = arcMaterialHash(i + vec3(1.0, 1.0, 0.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}`);
          shader.fragmentShader = shader.fragmentShader
            .replace('#include <color_fragment>', `#include <color_fragment>
float arcMaterialGrain = arcMaterialNoise(vViewPosition * 2.6 + vec3(2.7, 1.1, 5.3));
diffuseColor.rgb *= 0.91 + arcMaterialGrain * 0.17;
float arcSurfaceDistance = distance(vArcSurfaceWorldPosition.xz, uArcSurfaceCenter);
float arcSurfaceMask = 1.0 - smoothstep(max(0.2, uArcSurfaceRadius * 0.45), max(0.3, uArcSurfaceRadius), arcSurfaceDistance);
float arcSurfaceWet = clamp(uArcSurfaceState.x * arcSurfaceMask, 0.0, 1.0);
float arcSurfaceBurn = clamp(uArcSurfaceState.y * arcSurfaceMask, 0.0, 1.0);
float arcSurfaceFrost = clamp(uArcSurfaceState.z * arcSurfaceMask, 0.0, 1.0);
float arcSurfaceAcid = clamp(uArcSurfaceState.w * arcSurfaceMask, 0.0, 1.0);
float arcSurfaceBlood = clamp(uArcSurfaceBlood * arcSurfaceMask, 0.0, 1.0);
float arcSurfaceDust = clamp(uArcSurfaceDust * arcSurfaceMask, 0.0, 1.0);
float arcSurfaceMud = clamp(uArcSurfaceMud * arcSurfaceMask, 0.0, 1.0);
float arcSurfaceCrackLine = 1.0 - smoothstep(0.0, 0.055, abs(sin((vArcSurfaceWorldPosition.x + arcMaterialGrain * 1.9) * 0.9) * sin((vArcSurfaceWorldPosition.z - arcMaterialGrain * 1.4) * 1.1)));
diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.34, 0.56, 0.66), arcSurfaceWet * 0.42);
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.24, 0.12, 0.075) * (0.72 + arcMaterialGrain * 0.3), arcSurfaceBurn * 0.64);
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.52, 0.70, 0.79) * (0.78 + arcMaterialGrain * 0.34), arcSurfaceFrost * 0.62);
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.20, 0.26, 0.075) * (0.65 + arcMaterialGrain * 0.5), arcSurfaceAcid * 0.64);
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.19, 0.035, 0.055) * (0.72 + arcMaterialGrain * 0.3), arcSurfaceBlood * 0.64);
diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.72, 0.68, 0.56), arcSurfaceDust * 0.48);
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.20, 0.15, 0.10) * (0.74 + arcMaterialGrain * 0.24), arcSurfaceMud * 0.58);
diffuseColor.rgb *= 1.0 - arcSurfaceBurn * arcSurfaceCrackLine * 0.32;`)
            .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
roughnessFactor = clamp(roughnessFactor * (0.86 + arcMaterialGrain * 0.26), 0.08, 1.0);
roughnessFactor = mix(roughnessFactor, 0.16, arcSurfaceWet * 0.84);
roughnessFactor = mix(roughnessFactor, 0.94, arcSurfaceFrost * 0.42 + arcSurfaceDust * 0.28);
roughnessFactor = mix(roughnessFactor, 0.88, arcSurfaceMud * 0.72);`)
            .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
totalEmissiveRadiance += vec3(0.32, 0.14, 0.045) * arcSurfaceBurn * arcSurfaceCrackLine * 0.08;
totalEmissiveRadiance += vec3(0.38, 0.48, 0.58) * uArcSurfaceHeat * arcSurfaceMask * 0.08;`);
          shader.fragmentShader = shader.fragmentShader.replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
float arcSssView = 1.0 - abs(dot(normalize(normal), normalize(vViewPosition)));
float arcSssWrap = pow(clamp(arcSssView, 0.0, 1.0), 3.0) * uArcSubsurface;
reflectedLight.indirectDiffuse += diffuseColor.rgb * vec3(0.20, 0.30, 0.38) * arcSssWrap * 0.16;
vec3 arcInjectedObjectLight = vec3(0.0);
for (int arcObjectLightIndex = 0; arcObjectLightIndex < 8; arcObjectLightIndex++) {
  if (float(arcObjectLightIndex) >= uArcLightCount) break;
  vec4 arcLightPositionRadius = uArcLightPositionRadius[arcObjectLightIndex];
  vec4 arcLightColorIntensity = uArcLightColorIntensity[arcObjectLightIndex];
  vec3 arcLightPositionView = (viewMatrix * vec4(arcLightPositionRadius.xyz, 1.0)).xyz;
  vec3 arcToLight = arcLightPositionView + vViewPosition;
  float arcLightDistance = max(length(arcToLight), 0.001);
  float arcLightReach = max(1.0, arcLightPositionRadius.w);
  float arcLightFade = max(0.0, 1.0 - arcLightDistance / arcLightReach);
  float arcLightFalloff = arcLightFade * arcLightFade / (1.0 + 0.45 * arcLightDistance * arcLightDistance / (arcLightReach * arcLightReach));
  float arcLightFacing = max(0.0, dot(normalize(normal), arcToLight / arcLightDistance));
  arcInjectedObjectLight += arcLightColorIntensity.rgb * arcLightColorIntensity.a * arcLightFalloff * arcLightFacing * 0.012;
}
reflectedLight.indirectDiffuse += diffuseColor.rgb * min(arcInjectedObjectLight, vec3(0.16));`);
        };
        const previousKey = material.customProgramCacheKey.bind(material);
        material.customProgramCacheKey = () => `${previousKey()}-arcane-pbr-v2`;
        material.envMapIntensity = Math.max(material.envMapIntensity ?? 1, 0.72);
        material.needsUpdate = true;
      }
    });
  }

  let features = { ...GRAPHICS_PRESETS.High };
  const autoDisabled = new Set();
  let quality = 'High';
  let lastCameraPosition = new THREE.Vector3();
  let hasCameraSample = false;
  let averageFrameMs = 16.7;
  let slowFrameStreak = 0;
  let fastFrameDuration = 0;
  let adaptiveActionTime = 0;
  const adaptiveOrder = ['motionBlur', 'dof', 'volumetric', 'caustics', 'reflections', 'ao', 'subsurface'];

  function effectiveFeatures() {
    const active = { ...features };
    for (const name of autoDisabled) active[name] = false;
    return active;
  }

  function syncPostFeatures() {
    const activeFeatures = effectiveFeatures();
    const u = distortionPass.uniforms;
    u.uVolumetric.value = activeFeatures.volumetric ? 1 : 0;
    u.uMotionBlur.value = activeFeatures.motionBlur ? 1 : 0;
    scene.environmentIntensity = ({ Low: 0.42, Medium: 0.56, High: 0.76, Ultra: 0.9 }[quality] || 0.76);
    const envIntensity = scene.environmentIntensity;
    for (const material of enhancedMaterialList) material.envMapIntensity = envIntensity;
    groundUniforms.uGroundAO.value = activeFeatures.ao ? ({ Low: 0.14, Medium: 0.22, High: 0.26, Ultra: 0.3 }[quality] || 0.26) : 0;
    groundUniforms.uGroundCaustics.value = activeFeatures.caustics ? ({ Low: 0.26, Medium: 0.42, High: 0.58, Ultra: 0.7 }[quality] || 0.58) : 0;
    subsurfaceUniform.value = activeFeatures.subsurface ? 1 : 0;
    postEffects.applyQuality(quality, activeFeatures);
  }

  function applyQuality(nextQuality, nextFeatures = features) {
    quality = GRAPHICS_PRESETS[nextQuality] ? nextQuality : 'High';
    features = { ...GRAPHICS_PRESETS[quality], ...nextFeatures };
    autoDisabled.clear();
    slowFrameStreak = 0;
    fastFrameDuration = 0;
    adaptiveActionTime = performance.now();
    fields.setQuality(quality);
    windGrass.setQuality(quality);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, QUALITY_SCALE[quality]));
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(window.innerWidth, window.innerHeight);
    postEffects.setSize(window.innerWidth * renderer.getPixelRatio(), window.innerHeight * renderer.getPixelRatio());
    const highQuality = quality === 'High' || quality === 'Ultra';
    renderer.shadowMap.enabled = highQuality;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const sun = scene.children.find((child) => child.isDirectionalLight);
    if (sun) {
      sun.castShadow = highQuality;
      sun.shadow.mapSize.set(quality === 'Ultra' ? 2048 : quality === 'High' ? 1024 : 512, quality === 'Ultra' ? 2048 : quality === 'High' ? 1024 : 512);
      sun.shadow.camera.left = -72;
      sun.shadow.camera.right = 72;
      sun.shadow.camera.top = 72;
      sun.shadow.camera.bottom = -72;
      sun.shadow.bias = -0.00022;
      sun.shadow.normalBias = 0.025;
      sun.shadow.radius = quality === 'Ultra' ? 5 : 3;
      sun.shadow.camera.updateProjectionMatrix();
    }
    syncPostFeatures();
  }

  function setFeature(name, enabled) {
    if (!(name in features)) return;
    features = { ...features, [name]: Boolean(enabled) };
    if (name === 'adaptive' && !enabled) autoDisabled.clear();
    if (enabled) autoDisabled.delete(name);
    syncPostFeatures();
  }

  function getFeatures() {
    return { ...features };
  }

  function getEffectiveFeatures() { return effectiveFeatures(); }

  function degradeOneFeature() {
    if (!features.adaptive) return false;
    const candidate = adaptiveOrder.find((name) => features[name] && !autoDisabled.has(name));
    if (!candidate) return false;
    autoDisabled.add(candidate);
    adaptiveActionTime = performance.now();
    syncPostFeatures();
    console.warn(`[Arcane VFX] Adaptive quality reduced ${candidate}; user settings are preserved.`);
    return candidate;
  }

  function reportFrame(frameMs) {
    if (!Number.isFinite(frameMs) || frameMs <= 0) return;
    averageFrameMs = averageFrameMs * 0.92 + frameMs * 0.08;
    if (!features.adaptive) return;
    if (frameMs > 40 || averageFrameMs > 34) {
      slowFrameStreak++;
      fastFrameDuration = 0;
      if (slowFrameStreak >= 8 && performance.now() - adaptiveActionTime > 1800) {
        degradeOneFeature();
        slowFrameStreak = 0;
      }
    } else {
      slowFrameStreak = Math.max(0, slowFrameStreak - 1);
      if (averageFrameMs < 21) fastFrameDuration += frameMs;
      else fastFrameDuration = 0;
      if (fastFrameDuration > 6000 && autoDisabled.size && performance.now() - adaptiveActionTime > 4500) {
        const candidate = [...adaptiveOrder].reverse().find((name) => autoDisabled.has(name));
        if (candidate) {
          autoDisabled.delete(candidate);
          adaptiveActionTime = performance.now();
          fastFrameDuration = 0;
          syncPostFeatures();
          console.info(`[Arcane VFX] Adaptive quality restored ${candidate} after sustained headroom.`);
        }
      }
    }
  }

  function reduceHeavyFeatures() {
    degradeOneFeature();
    return getEffectiveFeatures();
  }

  function update(time, camera, reducedMotion = false) {
    particleWind.update(time);
    groundUniforms.uArcTime.value = Number.isFinite(time) ? time : 0;
    const cameraPosition = camera.position;
    const motion = distortionPass.uniforms.uMotionDir.value;
    if (!hasCameraSample) {
      lastCameraPosition.copy(cameraPosition);
      hasCameraSample = true;
      motion.set(0, 0);
    } else {
      const dx = cameraPosition.x - lastCameraPosition.x;
      const dz = cameraPosition.z - lastCameraPosition.z;
      motion.set(THREE.MathUtils.clamp(dx * 0.0014, -0.006, 0.006), THREE.MathUtils.clamp(dz * 0.0014, -0.006, 0.006));
      lastCameraPosition.copy(cameraPosition);
    }
    const activeFeatures = effectiveFeatures();
    windGrass.update(time);
    distortionPass.uniforms.uMotionBlur.value = activeFeatures.motionBlur && !reducedMotion ? 1 : 0;
    distortionPass.uniforms.uVolumetric.value = activeFeatures.volumetric && !reducedMotion ? 1 : 0;
    postEffects.setReducedMotion(reducedMotion);
  }

  function updateSurface({ time = 0, center = null, radius = 1, wet = 0, burn = 0, frost = 0, acid = 0, blood = 0, dust = 0, mud = 0, heat = 0, nature = 0, crack = 0, wind = 0, windDirection = null, light = 0, shadow = 0 } = {}) {
    if (center) groundUniforms.uGroundCenter.value.set(center.x, center.z);
    else groundUniforms.uGroundCenter.value.set(0, 0);
    groundUniforms.uGroundRadius.value = Math.max(1, Number.isFinite(radius) ? radius : 1);
    groundUniforms.uSurfaceNature.value=THREE.MathUtils.clamp(nature,0,1);
    groundUniforms.uSurfaceState.value.set(wet, burn, frost, acid);
    groundUniforms.uSurfaceAux.value.set(crack, wind, light, shadow);
    groundUniforms.uBloodStain.value = THREE.MathUtils.clamp(blood, 0, 1);
    groundUniforms.uSurfaceDust.value = THREE.MathUtils.clamp(dust || Math.max(wind * 0.72, crack * 0.42), 0, 1);
    groundUniforms.uSurfaceMud.value = THREE.MathUtils.clamp(mud || wet * 0.18, 0, 1);
    groundUniforms.uSurfaceHeat.value = THREE.MathUtils.clamp(heat || burn * 0.25, 0, 1);
    groundUniforms.uGroundDisturbance.value = THREE.MathUtils.clamp(wind + crack * 0.22, 0, 1);
    fields.updateWind({ direction: windDirection, strength: wind, turbulence: Math.max(wind, crack * 0.25), time });
    postEffects.setReflectivity(THREE.MathUtils.clamp(wet * 0.56 + frost * 0.26 + acid * 0.18 + blood * 0.12 + light * 0.08, 0, 0.72));
    distortionPass.uniforms.uVolumeStrength.value = effectiveFeatures().volumetric ? THREE.MathUtils.clamp(wet * 0.22 + burn * 0.45 + light * 0.36 + frost * 0.12 + acid * 0.17 + shadow * 0.08, 0, 0.6) : 0;
    groundUniforms.uArcTime.value = time;
  }

  function resetSurface() {
    updateSurface();
    fields.clearLightSources();
    windGrass.reset();
    fields.updateWind({ strength: 0, turbulence: 0 });
    distortionPass.uniforms.uVolumeStrength.value = 0;
    distortionPass.uniforms.uMotionDir.value.set(0, 0);
  }

  function setLightSources(sources) { fields.setLightSources(sources); }
  function resize(width = window.innerWidth, height = window.innerHeight) {
    renderer.setSize(width, height);
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(width, height);
    postEffects.setSize(width * renderer.getPixelRatio(), height * renderer.getPixelRatio());
  }
  function getDiagnostics() {
    return {
      quality, features: effectiveFeatures(), requestedFeatures: getFeatures(), autoReduced: [...autoDisabled], averageFrameMs,
      post: postEffects.getStatus(), fields: fields.getStatus(), grass: windGrass.getStatus(), particleWind: particleWind.getStatus(), trackedMaterials: enhancedMaterialList.size, estimatedRenderTargetBytes: postEffects.estimateTargetBytes(), surfaceNature:groundUniforms.uSurfaceNature.value
    };
  }
  function dispose() { composer.removePass(outputPass); outputPass.dispose(); postEffects.dispose(); windGrass.dispose(); fields.dispose(); environmentTarget?.dispose(); }

  return { applyQuality, setFeature, getFeatures, getEffectiveFeatures, getDiagnostics, getWindUniform: () => fields.getUniforms().uArcWind, setLightSources, reportFrame, degradeOneFeature, reduceHeavyFeatures, enhanceSurfaces, update, updateSurface, resetSurface, resize, dispose, contextLost, restoreEnvironment, get environmentTarget() { return environmentTarget; } };
}
