import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  const worker = mode === 'worker';
  return {
    publicDir: worker ? 'public' : false,
    define: { 'process.env.NODE_ENV': JSON.stringify('production') },
    build: {
      emptyOutDir: worker,
      lib: {
        entry: resolve(import.meta.dirname, worker ? 'src/worker.ts' : 'src/inspector.tsx'),
        name: worker ? 'InteractionWorker' : 'InteractionInspector',
        formats: ['iife'],
        fileName: () => worker ? 'worker.js' : 'inspector.js',
      },
    },
  };
});
