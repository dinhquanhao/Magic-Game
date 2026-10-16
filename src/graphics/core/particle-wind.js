// Add a small world-space drift to existing point shaders without replacing
// their motion, timing, point size, or element-specific fragment appearance.
export function createParticleWind(windUniform) {
  const timeUniform = { value: 0 };
  const connected = new WeakSet();
  let connectedCount = 0;
  function connect(root) {
    root.traverse((object) => {
      if (!object.isPoints) return;
      const material = object.material;
      if (!material?.isShaderMaterial || material.isRawShaderMaterial || connected.has(material)) return;
      // The common particle shader already consumes the same wind field.
      if (/uniform\s+vec4\s+uArcWind\b/.test(material.vertexShader)) return;
      const main = /void\s+main\s*\(\s*\)\s*\{/;
      if (!main.test(material.vertexShader)) return;
      material.vertexShader = `uniform vec4 uArcParticleWind;
uniform float uArcParticleWindTime;
${material.vertexShader.replace(main, 'void arcParticleMain(){')}
void main(){
  arcParticleMain();
  float gust=.55+.45*sin(uArcParticleWindTime*1.3+position.x*.2+position.y*.7);
  vec3 drift=vec3(uArcParticleWind.x,0.,uArcParticleWind.y)*uArcParticleWind.z*gust*.3;
  gl_Position+=projectionMatrix*viewMatrix*vec4(drift,0.);
}`;
      material.uniforms.uArcParticleWind = windUniform;
      material.uniforms.uArcParticleWindTime = timeUniform;
      connected.add(material);
      connectedCount++;
      const onDispose = () => { connectedCount--; material.removeEventListener('dispose', onDispose); };
      material.addEventListener('dispose', onDispose);
      material.needsUpdate = true;
    });
  }
  function update(time) { timeUniform.value = Number.isFinite(time) ? time : 0; }
  return { connect, update, getStatus: () => ({ connectedMaterials: connectedCount }) };
}
