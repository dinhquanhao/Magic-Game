// Cast resources are owned by their tree. Shared geometries/materials are
// released once; InstancedMesh.dispose also releases instance GPU buffers.
export function disposeObjectTree(root) {
  if (!root) return;
  const geometries = new Set(), materials = new Set();
  root.traverse((object) => {
    try { object.userData?.dispose?.(); }
    catch (error) { console.error('[Arcane VFX] custom cleanup failed', error); }
    if (object.isInstancedMesh) object.dispose();
    if (object.geometry) geometries.add(object.geometry);
    const ownMaterials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of ownMaterials) if (material) materials.add(material);
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
}
