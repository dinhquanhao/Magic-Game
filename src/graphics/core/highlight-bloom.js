// Bound only the light scattered by bloom. The original HDR scene, hot cores,
// exposure and the player's bloom-strength control stay in the normal pipeline.
export function configureHighlightBloom(bloom) {
 const material=bloom.materialHighPassFilter,anchor='float v = luminance( texel.xyz );';
 // Five blur levels accumulate energy; keep their input below the display
 // shoulder so a dense storm cannot turn the whole frame into a white sheet.
 const limit={value:.5};
 if(!material.fragmentShader.includes(anchor))throw new Error('Unsupported bloom high-pass shader');
 material.uniforms.uArcBloomLimit=limit;
 material.fragmentShader='uniform float uArcBloomLimit;\n'+material.fragmentShader.replace(anchor,`${anchor}
 float arcPeak=max(max(texel.r,texel.g),texel.b);
 texel.rgb*=min(1.0,uArcBloomLimit/max(.0001,arcPeak));`);
 material.needsUpdate=true;
 bloom.highPassUniforms.smoothWidth.value=.18;
 return {
  selectElement(element){bloom.threshold=['SHADOW','SPACE','TIME'].includes(element)?.12:.65;},
  diagnostics(){return {threshold:bloom.threshold,spreadLimit:limit.value,strength:bloom.strength};},
 };
}
