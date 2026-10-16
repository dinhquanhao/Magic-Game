const LIGHT_COUNT = 8;

export function createGraphicsFields(THREE) {
  const lightPositions = Array.from({ length: LIGHT_COUNT }, () => new THREE.Vector4());
  const lightColors = Array.from({ length: LIGHT_COUNT }, () => new THREE.Vector4());
  const lightCountUniform = { value: 0 };
  const wind = new THREE.Vector4(1, 0, 0, 0);
  let activeLights = 0;
  let quality = 'High';
  let initialized = false;

  function init() {
    clearLightSources();
    updateWind({ direction: null, strength: 0, turbulence: 0 });
    initialized = true;
    return getStatus();
  }

  function updateWind({ direction = null, strength = 0, turbulence = 0, time = 0 } = {}) {
    const dx = Number.isFinite(direction?.x) ? direction.x : 1;
    const dz = Number.isFinite(direction?.z) ? direction.z : 0;
    const length = Math.hypot(dx, dz) || 1;
    wind.set(dx / length, dz / length, Math.max(0, Math.min(1, strength)), Math.max(0, Math.min(1, turbulence)));
    return time;
  }

  function sampleWind(position, time = 0, target = new THREE.Vector3()) {
    const phase = (Number.isFinite(position?.x) ? position.x : 0) * 0.11 + (Number.isFinite(position?.z) ? position.z : 0) * 0.07 + time * (0.7 + wind.w * 1.4);
    const curl = Math.sin(phase) * wind.w * 0.24;
    target.set(wind.x - wind.y * curl, 0, wind.y + wind.x * curl);
    return target.multiplyScalar(wind.z);
  }

  function setLightSources(sources = []) {
    activeLights = Math.min(LIGHT_COUNT, sources.length, quality === 'Low' ? 1 : LIGHT_COUNT);
    lightCountUniform.value = activeLights;
    for (let i = 0; i < LIGHT_COUNT; i++) {
      const source = sources[i];
      if (!source || i >= activeLights) {
        lightPositions[i].set(0, -10000, 0, 1);
        lightColors[i].set(0, 0, 0, 0);
        continue;
      }
      const p = source.position;
      const c = source.color;
      const radius = Math.max(1, Number.isFinite(source.radius) ? source.radius : 24);
      const intensity = Math.max(0, Math.min(24, Number.isFinite(source.intensity) ? source.intensity : 0));
      lightPositions[i].set(p?.x || 0, p?.y || 0, p?.z || 0, radius);
      lightColors[i].set(c?.r || 0, c?.g || 0, c?.b || 0, intensity);
    }
  }

  function clearLightSources() { setLightSources([]); }
  function setQuality(nextQuality) { quality = nextQuality; }
  function getUniforms() {
    return {
      uArcWind: { value: wind },
      uArcLightPositionRadius: { value: lightPositions },
      uArcLightColorIntensity: { value: lightColors },
      uArcLightCount: lightCountUniform
    };
  }
  function getStatus() { return { initialized, activeLights, windStrength: wind.z, windTurbulence: wind.w, quality }; }
  function dispose() { clearLightSources(); wind.set(1, 0, 0, 0); }

  return { init, update: updateWind, updateWind, setQuality, sampleWind, setLightSources, clearLightSources, getUniforms, getStatus, dispose };
}
