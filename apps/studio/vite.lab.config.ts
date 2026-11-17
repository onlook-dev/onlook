import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Plain Vite, not electron-vite: a "web" mode in `electron.vite.config.ts` would
// put the design lab in the path of every real build.

const repoRoot = resolve(import.meta.dirname, '../..');

export default defineConfig({
  root: resolve(import.meta.dirname, 'src/renderer/lab'),
  envDir: repoRoot,
  resolve: {
    alias: { '@renderer': resolve(import.meta.dirname, 'src/renderer/src') },
  },
  plugins: [react()],
  // The lab draws the cloud build: its bridge already stubs a signed-in account, so the account slot renders.
  define: { 'import.meta.env.RENDERER_VITE_ONLOOK_CLOUD': JSON.stringify('true') },
  server: {
    // Never 3000: that belongs to the user's own dev server and the proof fixture.
    port: Number(process.env.LAB_PORT ?? 5273),
    strictPort: false,
    fs: { allow: [repoRoot] },
  },
});
