import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('/node_modules/three/')) return undefined;
          if (id.includes('/examples/jsm/')) return 'three-addons';
          return 'three-core';
        }
      }
    }
  }
});
