import react from '@vitejs/plugin-react';
import { rmSync } from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import electron from 'vite-plugin-electron/simple';
import pkg from './package.json';

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
    rmSync('dist-electron', { recursive: true, force: true });

    const isServe = command === 'serve';
    const isBuild = command === 'build';
    const sourcemap = isServe || !!process.env.VSCODE_DEBUG;

    return {
        resolve: {
            alias: {
                '@': path.join(__dirname, 'src'),
                common: path.join(__dirname, 'common'),
            },
        },
        plugins: [
            react(),
            electron({
                main: {
                    // Shortcut of `build.lib.entry`
                    entry: 'electron/main/index.ts',
                    onstart(args) {
                        if (process.env.VSCODE_DEBUG) {
                            console.log(
                                /* For `.vscode/.debug.script.mjs` */ '[startup] Electron App',
                            );
                        } else {
                            args.startup();
                        }
                    },
                    vite: {
                        build: {
                            sourcemap: sourcemap ? 'inline' : undefined,
                            minify: isBuild,
                            outDir: 'dist-electron/main',
                            rollupOptions: {
                                external: Object.keys(
                                    'dependencies' in pkg ? pkg.dependencies : {},
                                ),
                            },
                        },
                    },
                },
                preload: {
                    input: {
                        index: 'electron/preload/browserview/index.ts',
                        webview: 'electron/preload/webview/index.ts',
                    },
                    vite: {
                        build: {
                            sourcemap: sourcemap ? 'inline' : undefined,
                            minify: isBuild,
                            outDir: 'dist-electron/preload',
                            rollupOptions: {
                                external: Object.keys(pkg.dependencies ?? {}),
                                output: {
                                    format: 'cjs',
                                    entryFileNames: '[name].js',
                                    inlineDynamicImports: false,
                                },
                            },
                        },
                    },
                },
                // Ployfill the Electron and Node.js API for Renderer process.
                // If you want use Node.js in Renderer process, the `nodeIntegration` needs to be enabled in the Main process.
                // See 👉 https://github.com/electron-vite/vite-plugin-electron-renderer
                renderer: {},
            }),
        ],
        server:
            process.env.VSCODE_DEBUG &&
            (() => {
                const url = new URL(pkg.debug.env.VITE_DEV_SERVER_URL);
                return {
                    host: url.hostname,
                    port: +url.port,
                };
            })(),
        clearScreen: false,
    };
});
