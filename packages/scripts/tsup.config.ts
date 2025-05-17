import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/setup-env.ts'],
    format: ['esm'],
    clean: true,
    dts: true,
    sourcemap: true,
    banner: ({ format }) => {
        if (format === 'esm') {
            return {
                js: '#!/usr/bin/env node',
            };
        }
        return {};
    },
});
