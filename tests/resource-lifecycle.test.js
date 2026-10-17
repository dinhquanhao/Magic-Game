import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { disposeObjectTree } from '../src/graphics/core/dispose-tree.js';

test('releasing a cast disposes shared resources once and every instance buffer', () => {
  const root = new THREE.Group();
  const geometry = new THREE.BoxGeometry();
  const material = new THREE.MeshStandardMaterial();
  let geometryDisposals = 0, materialDisposals = 0, instanceDisposals = 0, customDisposals = 0;
  geometry.addEventListener('dispose', () => geometryDisposals++);
  material.addEventListener('dispose', () => materialDisposals++);
  for (let i = 0; i < 3; i++) {
    const mesh = new THREE.InstancedMesh(geometry, material, 12);
    mesh.addEventListener('dispose', () => instanceDisposals++);
    root.add(mesh);
  }
  root.add(new THREE.Mesh(geometry, [material, material]));
  root.userData.dispose = () => customDisposals++;
  disposeObjectTree(root);
  assert.deepEqual({ geometryDisposals, materialDisposals, instanceDisposals, customDisposals },
    { geometryDisposals: 1, materialDisposals: 1, instanceDisposals: 3, customDisposals: 1 });
});
