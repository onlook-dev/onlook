import { defineConfig } from 'tsup'

export default defineConfig([{
    entry: ['src/cli/index.ts'],
    format: ['cjs'],
    dts: false,
    splitting: false,
    sourcemap: true,
    clean: true,
    outDir: 'dist/cli'
},
{
    entry: ['src/api/index.ts'],
    format: ['esm'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    outDir: 'dist/api'
}
])