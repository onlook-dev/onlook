import { defineConfig } from 'tsup'

export default defineConfig({
    entry: ['src/index.ts'],
    outDir: 'dist',
    target: 'node18',
    format: ['cjs'],
    splitting: false,
    clean: true,
    minify: true,
    sourcemap: false,
    shims: false,
    dts: false,
    external: [],
    esbuildOptions(options) {
        options.platform = 'node'
    }
})
