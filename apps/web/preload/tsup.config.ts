import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['esm'],
    bundle: true,
    clean: true,
    dts: false,
    minify: true,
    outDir: 'dist',
    noExternal: [/(.*)/],
    splitting: false,
});
