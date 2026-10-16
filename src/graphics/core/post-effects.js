import { SSRPass } from 'three/addons/postprocessing/SSRPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';

// Each pass owns its render targets. Disabled features release their targets;
// re-enabling a feature constructs one pass, never a target per frame or cast.
export function createPostEffects({ renderer, scene, camera, ground, composer, width, height, bloom }) {
  const passes = {};
  const errors = [];
  const failed = new Set();
  const maxTextures = renderer.capabilities?.maxTextures ?? 0;
  let quality = 'High';
  let settings = {};
  let reducedMotion = false;
  let reflectionStrength = 0.15;
  let lastUpdateMs = 0;

  function insertBeforeBloom(pass) {
    pass.enabled = true;
    const bloomIndex = composer.passes.indexOf(bloom);
    composer.insertPass(pass, bloomIndex < 0 ? composer.passes.length : bloomIndex);
  }

  function construct(key) {
    if (passes[key] || failed.has(key)) return passes[key] || null;
    try {
      let pass;
      if (key === 'ssr') {
        pass = new SSRPass({ renderer, scene, camera, width, height, selects: [ground], bouncing: false });
        pass.resolutionScale = 0.5;
        pass.blur = true;
        pass.opacity = reflectionStrength;
        pass.maxDistance = 36;
        pass.thickness = 0.12;
        pass.distanceAttenuation = true;
        pass.fresnel = true;
      } else if (key === 'gtao') {
        pass = new GTAOPass(scene, camera, width, height);
        pass.blendIntensity = 0.75;
        pass.pdSamples = 8;
      } else if (key === 'ssao') {
        pass = new SSAOPass(scene, camera, width, height, 16);
        pass.kernelRadius = 7;
        pass.minDistance = 0.005;
        pass.maxDistance = 0.12;
      } else if (key === 'dof') {
        pass = new BokehPass(scene, camera, { focus: 34, aperture: 0.00001, maxblur: 0.0025 });
      }
      if (!pass) return null;
      passes[key] = pass;
      insertBeforeBloom(pass);
      return pass;
    } catch (error) {
      failed.add(key);
      errors.push(key + ': ' + (error?.message || error));
      console.warn('[Arcane VFX] Optional post effect unavailable; using its fallback.', key, error);
      return null;
    }
  }

  function release(key) {
    const pass = passes[key];
    if (!pass) return;
    composer.removePass(pass);
    pass.dispose?.();
    delete passes[key];
  }

  function orderPasses() {
    for (const key of ['ssr', 'gtao', 'ssao', 'dof']) {
      const pass = passes[key];
      if (!pass) continue;
      composer.removePass(pass);
      const bloomIndex = composer.passes.indexOf(bloom);
      composer.insertPass(pass, bloomIndex < 0 ? composer.passes.length : bloomIndex);
    }
  }

  function setSize(nextWidth = width, nextHeight = height) {
    width = Math.max(1, Math.floor(nextWidth));
    height = Math.max(1, Math.floor(nextHeight));
    const scale = quality === 'Medium' ? 0.5 : quality === 'Ultra' ? 1 : 0.75;
    passes.ssr?.setSize(width, height);
    passes.gtao?.setSize(Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale)));
    passes.ssao?.setSize(Math.max(1, Math.round(width * 0.5)), Math.max(1, Math.round(height * 0.5)));
    passes.dof?.setSize(Math.max(1, Math.round(width * 0.75)), Math.max(1, Math.round(height * 0.75)));
  }

  function applyQuality(nextQuality, nextSettings = settings) {
    quality = nextQuality;
    settings = { ...nextSettings };
    const high = quality === 'High' || quality === 'Ultra';
    const wantSsr = Boolean(settings.reflections) && quality !== 'Low' && maxTextures >= 8;
    const wantGtao = Boolean(settings.ao) && high && maxTextures >= 8;
    const wantSsao = Boolean(settings.ao) && quality === 'Medium';
    const wantDof = Boolean(settings.dof) && !reducedMotion;
    if (wantSsr) construct('ssr'); else release('ssr');
    if (wantGtao) construct('gtao'); else release('gtao');
    if (wantSsao) construct('ssao'); else release('ssao');
    if (wantDof) construct('dof'); else release('dof');
    if (passes.ssr) {
      passes.ssr.resolutionScale = quality === 'Medium' ? 0.5 : 1;
      passes.ssr.opacity = reflectionStrength;
      passes.ssr.enabled = wantSsr && reflectionStrength > 0.015;
    }
    orderPasses();
    setSize(width, height);
  }

  function setReflectivity(value) {
    reflectionStrength = Math.max(0, Math.min(0.72, Number.isFinite(value) ? value : 0));
    if (passes.ssr) {
      passes.ssr.opacity = reflectionStrength;
      passes.ssr.enabled = reflectionStrength > 0.015 && Boolean(settings.reflections) && quality !== 'Low';
    }
  }

  function setReducedMotion(value) {
    const next = Boolean(value);
    if (reducedMotion === next) return;
    reducedMotion = next;
    applyQuality(quality, settings);
  }

  function init() {
    setSize(width, height);
    return getStatus();
  }

  function update(deltaMs = 0) {
    lastUpdateMs = Number.isFinite(deltaMs) ? Math.max(0, deltaMs) : 0;
    return lastUpdateMs;
  }

  function setQuality(nextQuality, nextSettings = settings) {
    applyQuality(nextQuality, nextSettings);
    return getStatus();
  }

  function getStatus() {
    return {
      ssr: Boolean(passes.ssr?.enabled),
      gtao: Boolean(passes.gtao),
      ssao: Boolean(passes.ssao),
      dof: Boolean(passes.dof),
      ssrTemporal: false,
      ssrResolution: passes.ssr ? Math.round(passes.ssr.resolutionScale * 100) + '%' : 'fallback IBL',
      maxTextures,
      lastUpdateMs,
      unavailable: [...errors]
    };
  }

  function estimateTargetBytes() {
    const px = Math.max(1, width * height);
    const ssr = passes.ssr ? px * 12 + px * passes.ssr.resolutionScale ** 2 * 16 : 0;
    const ao = passes.gtao ? px * (quality === 'Ultra' ? 1 : 0.5625) * 12 : passes.ssao ? px * 0.25 * 12 : 0;
    const dof = passes.dof ? px * 0.5625 * 8 : 0;
    return Math.round(ssr + ao + dof);
  }

  function dispose() {
    for (const key of Object.keys(passes)) release(key);
  }

  return { init, update, applyQuality, setQuality, setSize, setReflectivity, setReducedMotion, getStatus, estimateTargetBytes, dispose };
}
