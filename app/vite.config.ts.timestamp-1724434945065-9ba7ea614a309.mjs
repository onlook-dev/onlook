// vite.config.ts
import react from 'file:///C:/Users/karti/OneDrive/Desktop/onlook-d/app/node_modules/@vitejs/plugin-react/dist/index.mjs';
import { rmSync } from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'file:///C:/Users/karti/OneDrive/Desktop/onlook-d/app/node_modules/vite/dist/node/index.js';
import electron from 'file:///C:/Users/karti/OneDrive/Desktop/onlook-d/app/node_modules/vite-plugin-electron/dist/simple.mjs';

// package.json
var package_default = {
    productName: 'Onlook',
    name: '@onlook/browser',
    version: '0.0.14',
    homepage: 'https://onlook.dev',
    main: 'dist-electron/main/index.js',
    description: 'The first-ever devtool for designers',
    license: 'Apache-2.0',
    author: {
        name: 'Onlook',
        email: 'contact@onlook.dev',
    },
    private: true,
    repository: {
        type: 'git',
        url: 'https://github.com/onlook-dev/studio.git',
    },
    debug: {
        env: {
            VITE_DEV_SERVER_URL: 'http://127.0.0.1:7777/',
        },
    },
    type: 'module',
    scripts: {
        dev: 'vite',
        build: 'tsc && vite build',
        package: 'electron-builder',
        preview: 'vite preview',
        pree2e: 'vite build --mode=test',
        e2e: 'playwright test',
        test: 'bun test',
        lint: 'eslint --fix .',
        format: 'prettier --write .',
        increment_tag: 'npm version patch',
        publish_tag: './scripts/publish_tag.sh',
        remove_tag: './scripts/remove_tag.sh',
    },
    dependencies: {
        '@radix-ui/react-accordion': '^1.2.0',
        '@radix-ui/react-alert-dialog': '^1.1.1',
        '@radix-ui/react-context-menu': '^2.2.1',
        '@radix-ui/react-dialog': '^1.1.1',
        '@radix-ui/react-dropdown-menu': '^2.1.1',
        '@radix-ui/react-icons': '^1.3.0',
        '@radix-ui/react-label': '^2.1.0',
        '@radix-ui/react-popover': '^1.1.1',
        '@radix-ui/react-select': '^2.1.1',
        '@radix-ui/react-separator': '^1.1.0',
        '@radix-ui/react-slot': '^1.1.0',
        '@radix-ui/react-tabs': '^1.1.0',
        '@radix-ui/react-toast': '^1.2.1',
        '@radix-ui/react-toggle': '^1.1.0',
        '@radix-ui/react-toggle-group': '^1.1.0',
        '@radix-ui/react-tooltip': '^1.1.2',
        '@supabase/supabase-js': '^2.44.4',
        'class-variance-authority': '^0.7.0',
        clsx: '^2.1.1',
        'css-to-tailwind-translator': '^1.2.8',
        culori: '^4.0.1',
        'electron-updater': '^6.2.1',
        fflate: '^0.8.2',
        'framer-motion': '^11.2.12',
        localtunnel: '^2.0.2',
        'lodash.debounce': '^4.0.8',
        mixpanel: '^0.18.0',
        nanoid: '^5.0.7',
        'react-arborist': '^3.4.0',
        'react-colorful': '^5.6.1',
        'react-diff-viewer-continued': '^3.4.0',
        'react-hotkeys-hook': '^4.5.0',
        'react-tiny-popover': '^8.0.4',
        'tailwind-merge': '^2.3.0',
        'tailwindcss-animate': '^1.0.7',
    },
    devDependencies: {
        '@eslint/compat': '^1.1.1',
        '@eslint/js': '^9.7.0',
        '@playwright/test': '^1.42.1',
        '@types/bun': '^1.1.6',
        '@types/css-tree': '^2.3.8',
        '@types/culori': '^2.1.0',
        '@types/localtunnel': '^2.0.4',
        '@types/lodash': '^4.17.7',
        '@types/node': '^20.14.9',
        '@types/react': '^18.2.64',
        '@types/react-dom': '^18.2.21',
        '@vitejs/plugin-react': '^4.2.1',
        autoprefixer: '^10.4.19',
        'css-tree': '^2.3.1',
        electron: '^32.0.1',
        'electron-builder': '^24.13.3',
        eslint: '8.x',
        'eslint-config-prettier': '^9.1.0',
        'eslint-plugin-react': '^7.34.3',
        globals: '^15.8.0',
        husky: '^8.0.0',
        mobx: '^6.12.4',
        'mobx-react-lite': '^4.0.7',
        postcss: '^8.4.38',
        'postcss-import': '^16.0.1',
        prettier: '^3.3.2',
        react: '^18.2.0',
        'react-dom': '^18.2.0',
        tailwindcss: '^3.4.4',
        typescript: '^5.4.2',
        'typescript-eslint': '^7.16.0',
        vite: '^5.1.5',
        'vite-plugin-electron': '^0.28.4',
        'vite-plugin-electron-renderer': '^0.14.5',
    },
};

// vite.config.ts
var __vite_injected_original_dirname = 'C:\\Users\\karti\\OneDrive\\Desktop\\onlook-d\\app';
var vite_config_default = defineConfig(({ command }) => {
    rmSync('dist-electron', { recursive: true, force: true });
    const isServe = command === 'serve';
    const isBuild = command === 'build';
    const sourcemap = isServe || !!process.env.VSCODE_DEBUG;
    return {
        resolve: {
            alias: {
                '@': path.join(__vite_injected_original_dirname, 'src'),
                common: path.join(__vite_injected_original_dirname, 'common'),
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
                                /* For `.vscode/.debug.script.mjs` */
                                '[startup] Electron App',
                            );
                        } else {
                            args.startup();
                        }
                    },
                    vite: {
                        build: {
                            sourcemap,
                            minify: isBuild,
                            outDir: 'dist-electron/main',
                            rollupOptions: {
                                external: Object.keys(
                                    'dependencies' in package_default
                                        ? package_default.dependencies
                                        : {},
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
                            sourcemap: sourcemap ? 'inline' : void 0,
                            // #332
                            minify: isBuild,
                            outDir: 'dist-electron/preload',
                            rollupOptions: {
                                external: Object.keys(package_default.dependencies ?? {}),
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
                const url = new URL(package_default.debug.env.VITE_DEV_SERVER_URL);
                return {
                    host: url.hostname,
                    port: +url.port,
                };
            })(),
        clearScreen: false,
    };
});
export { vite_config_default as default };
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiLCAicGFja2FnZS5qc29uIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxca2FydGlcXFxcT25lRHJpdmVcXFxcRGVza3RvcFxcXFxvbmxvb2stZFxcXFxhcHBcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXGthcnRpXFxcXE9uZURyaXZlXFxcXERlc2t0b3BcXFxcb25sb29rLWRcXFxcYXBwXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9rYXJ0aS9PbmVEcml2ZS9EZXNrdG9wL29ubG9vay1kL2FwcC92aXRlLmNvbmZpZy50c1wiO2ltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XHJcbmltcG9ydCB7IHJtU3luYyB9IGZyb20gJ25vZGU6ZnMnO1xyXG5pbXBvcnQgcGF0aCBmcm9tICdub2RlOnBhdGgnO1xyXG5pbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcclxuaW1wb3J0IGVsZWN0cm9uIGZyb20gJ3ZpdGUtcGx1Z2luLWVsZWN0cm9uL3NpbXBsZSc7XHJcbmltcG9ydCBwa2cgZnJvbSAnLi9wYWNrYWdlLmpzb24nO1xyXG5cclxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCh7IGNvbW1hbmQgfSkgPT4ge1xyXG4gICAgcm1TeW5jKCdkaXN0LWVsZWN0cm9uJywgeyByZWN1cnNpdmU6IHRydWUsIGZvcmNlOiB0cnVlIH0pO1xyXG5cclxuICAgIGNvbnN0IGlzU2VydmUgPSBjb21tYW5kID09PSAnc2VydmUnO1xyXG4gICAgY29uc3QgaXNCdWlsZCA9IGNvbW1hbmQgPT09ICdidWlsZCc7XHJcbiAgICBjb25zdCBzb3VyY2VtYXAgPSBpc1NlcnZlIHx8ICEhcHJvY2Vzcy5lbnYuVlNDT0RFX0RFQlVHO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgcmVzb2x2ZToge1xyXG4gICAgICAgICAgICBhbGlhczoge1xyXG4gICAgICAgICAgICAgICAgJ0AnOiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnc3JjJyksXHJcbiAgICAgICAgICAgICAgICBjb21tb246IHBhdGguam9pbihfX2Rpcm5hbWUsICdjb21tb24nKSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHBsdWdpbnM6IFtcclxuICAgICAgICAgICAgcmVhY3QoKSxcclxuICAgICAgICAgICAgZWxlY3Ryb24oe1xyXG4gICAgICAgICAgICAgICAgbWFpbjoge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIFNob3J0Y3V0IG9mIGBidWlsZC5saWIuZW50cnlgXHJcbiAgICAgICAgICAgICAgICAgICAgZW50cnk6ICdlbGVjdHJvbi9tYWluL2luZGV4LnRzJyxcclxuICAgICAgICAgICAgICAgICAgICBvbnN0YXJ0KGFyZ3MpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHByb2Nlc3MuZW52LlZTQ09ERV9ERUJVRykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLyogRm9yIGAudnNjb2RlLy5kZWJ1Zy5zY3JpcHQubWpzYCAqLyAnW3N0YXJ0dXBdIEVsZWN0cm9uIEFwcCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXJncy5zdGFydHVwKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHZpdGU6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnVpbGQ6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNvdXJjZW1hcCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1pbmlmeTogaXNCdWlsZCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG91dERpcjogJ2Rpc3QtZWxlY3Ryb24vbWFpbicsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByb2xsdXBPcHRpb25zOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXh0ZXJuYWw6IE9iamVjdC5rZXlzKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnZGVwZW5kZW5jaWVzJyBpbiBwa2cgPyBwa2cuZGVwZW5kZW5jaWVzIDoge30sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBwcmVsb2FkOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgaW5wdXQ6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaW5kZXg6ICdlbGVjdHJvbi9wcmVsb2FkL2Jyb3dzZXJ2aWV3L2luZGV4LnRzJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgd2VidmlldzogJ2VsZWN0cm9uL3ByZWxvYWQvd2Vidmlldy9pbmRleC50cycsXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICB2aXRlOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJ1aWxkOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzb3VyY2VtYXA6IHNvdXJjZW1hcCA/ICdpbmxpbmUnIDogdW5kZWZpbmVkLCAvLyAjMzMyXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtaW5pZnk6IGlzQnVpbGQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvdXREaXI6ICdkaXN0LWVsZWN0cm9uL3ByZWxvYWQnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcm9sbHVwT3B0aW9uczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4dGVybmFsOiBPYmplY3Qua2V5cyhwa2cuZGVwZW5kZW5jaWVzID8/IHt9KSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvdXRwdXQ6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9ybWF0OiAnY2pzJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW50cnlGaWxlTmFtZXM6ICdbbmFtZV0uanMnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbmxpbmVEeW5hbWljSW1wb3J0czogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAvLyBQbG95ZmlsbCB0aGUgRWxlY3Ryb24gYW5kIE5vZGUuanMgQVBJIGZvciBSZW5kZXJlciBwcm9jZXNzLlxyXG4gICAgICAgICAgICAgICAgLy8gSWYgeW91IHdhbnQgdXNlIE5vZGUuanMgaW4gUmVuZGVyZXIgcHJvY2VzcywgdGhlIGBub2RlSW50ZWdyYXRpb25gIG5lZWRzIHRvIGJlIGVuYWJsZWQgaW4gdGhlIE1haW4gcHJvY2Vzcy5cclxuICAgICAgICAgICAgICAgIC8vIFNlZSBcdUQ4M0RcdURDNDkgaHR0cHM6Ly9naXRodWIuY29tL2VsZWN0cm9uLXZpdGUvdml0ZS1wbHVnaW4tZWxlY3Ryb24tcmVuZGVyZXJcclxuICAgICAgICAgICAgICAgIHJlbmRlcmVyOiB7fSxcclxuICAgICAgICAgICAgfSksXHJcbiAgICAgICAgXSxcclxuICAgICAgICBzZXJ2ZXI6XHJcbiAgICAgICAgICAgIHByb2Nlc3MuZW52LlZTQ09ERV9ERUJVRyAmJlxyXG4gICAgICAgICAgICAoKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdXJsID0gbmV3IFVSTChwa2cuZGVidWcuZW52LlZJVEVfREVWX1NFUlZFUl9VUkwpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICBob3N0OiB1cmwuaG9zdG5hbWUsXHJcbiAgICAgICAgICAgICAgICAgICAgcG9ydDogK3VybC5wb3J0LFxyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgfSkoKSxcclxuICAgICAgICBjbGVhclNjcmVlbjogZmFsc2UsXHJcbiAgICB9O1xyXG59KTtcclxuIiwgIntcclxuICAgIFwicHJvZHVjdE5hbWVcIjogXCJPbmxvb2tcIixcclxuICAgIFwibmFtZVwiOiBcIkBvbmxvb2svYnJvd3NlclwiLFxyXG4gICAgXCJ2ZXJzaW9uXCI6IFwiMC4wLjE0XCIsXHJcbiAgICBcImhvbWVwYWdlXCI6IFwiaHR0cHM6Ly9vbmxvb2suZGV2XCIsXHJcbiAgICBcIm1haW5cIjogXCJkaXN0LWVsZWN0cm9uL21haW4vaW5kZXguanNcIixcclxuICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgZmlyc3QtZXZlciBkZXZ0b29sIGZvciBkZXNpZ25lcnNcIixcclxuICAgIFwibGljZW5zZVwiOiBcIkFwYWNoZS0yLjBcIixcclxuICAgIFwiYXV0aG9yXCI6IHtcclxuICAgICAgICBcIm5hbWVcIjogXCJPbmxvb2tcIixcclxuICAgICAgICBcImVtYWlsXCI6IFwiY29udGFjdEBvbmxvb2suZGV2XCJcclxuICAgIH0sXHJcbiAgICBcInByaXZhdGVcIjogdHJ1ZSxcclxuICAgIFwicmVwb3NpdG9yeVwiOiB7XHJcbiAgICAgICAgXCJ0eXBlXCI6IFwiZ2l0XCIsXHJcbiAgICAgICAgXCJ1cmxcIjogXCJodHRwczovL2dpdGh1Yi5jb20vb25sb29rLWRldi9zdHVkaW8uZ2l0XCJcclxuICAgIH0sXHJcbiAgICBcImRlYnVnXCI6IHtcclxuICAgICAgICBcImVudlwiOiB7XHJcbiAgICAgICAgICAgIFwiVklURV9ERVZfU0VSVkVSX1VSTFwiOiBcImh0dHA6Ly8xMjcuMC4wLjE6Nzc3Ny9cIlxyXG4gICAgICAgIH1cclxuICAgIH0sXHJcbiAgICBcInR5cGVcIjogXCJtb2R1bGVcIixcclxuICAgIFwic2NyaXB0c1wiOiB7XHJcbiAgICAgICAgXCJkZXZcIjogXCJ2aXRlXCIsXHJcbiAgICAgICAgXCJidWlsZFwiOiBcInRzYyAmJiB2aXRlIGJ1aWxkXCIsXHJcbiAgICAgICAgXCJwYWNrYWdlXCI6IFwiZWxlY3Ryb24tYnVpbGRlclwiLFxyXG4gICAgICAgIFwicHJldmlld1wiOiBcInZpdGUgcHJldmlld1wiLFxyXG4gICAgICAgIFwicHJlZTJlXCI6IFwidml0ZSBidWlsZCAtLW1vZGU9dGVzdFwiLFxyXG4gICAgICAgIFwiZTJlXCI6IFwicGxheXdyaWdodCB0ZXN0XCIsXHJcbiAgICAgICAgXCJ0ZXN0XCI6IFwiYnVuIHRlc3RcIixcclxuICAgICAgICBcImxpbnRcIjogXCJlc2xpbnQgLS1maXggLlwiLFxyXG4gICAgICAgIFwiZm9ybWF0XCI6IFwicHJldHRpZXIgLS13cml0ZSAuXCIsXHJcbiAgICAgICAgXCJpbmNyZW1lbnRfdGFnXCI6IFwibnBtIHZlcnNpb24gcGF0Y2hcIixcclxuICAgICAgICBcInB1Ymxpc2hfdGFnXCI6IFwiLi9zY3JpcHRzL3B1Ymxpc2hfdGFnLnNoXCIsXHJcbiAgICAgICAgXCJyZW1vdmVfdGFnXCI6IFwiLi9zY3JpcHRzL3JlbW92ZV90YWcuc2hcIlxyXG4gICAgfSxcclxuICAgIFwiZGVwZW5kZW5jaWVzXCI6IHtcclxuICAgICAgICBcIkByYWRpeC11aS9yZWFjdC1hY2NvcmRpb25cIjogXCJeMS4yLjBcIixcclxuICAgICAgICBcIkByYWRpeC11aS9yZWFjdC1hbGVydC1kaWFsb2dcIjogXCJeMS4xLjFcIixcclxuICAgICAgICBcIkByYWRpeC11aS9yZWFjdC1jb250ZXh0LW1lbnVcIjogXCJeMi4yLjFcIixcclxuICAgICAgICBcIkByYWRpeC11aS9yZWFjdC1kaWFsb2dcIjogXCJeMS4xLjFcIixcclxuICAgICAgICBcIkByYWRpeC11aS9yZWFjdC1kcm9wZG93bi1tZW51XCI6IFwiXjIuMS4xXCIsXHJcbiAgICAgICAgXCJAcmFkaXgtdWkvcmVhY3QtaWNvbnNcIjogXCJeMS4zLjBcIixcclxuICAgICAgICBcIkByYWRpeC11aS9yZWFjdC1sYWJlbFwiOiBcIl4yLjEuMFwiLFxyXG4gICAgICAgIFwiQHJhZGl4LXVpL3JlYWN0LXBvcG92ZXJcIjogXCJeMS4xLjFcIixcclxuICAgICAgICBcIkByYWRpeC11aS9yZWFjdC1zZWxlY3RcIjogXCJeMi4xLjFcIixcclxuICAgICAgICBcIkByYWRpeC11aS9yZWFjdC1zZXBhcmF0b3JcIjogXCJeMS4xLjBcIixcclxuICAgICAgICBcIkByYWRpeC11aS9yZWFjdC1zbG90XCI6IFwiXjEuMS4wXCIsXHJcbiAgICAgICAgXCJAcmFkaXgtdWkvcmVhY3QtdGFic1wiOiBcIl4xLjEuMFwiLFxyXG4gICAgICAgIFwiQHJhZGl4LXVpL3JlYWN0LXRvYXN0XCI6IFwiXjEuMi4xXCIsXHJcbiAgICAgICAgXCJAcmFkaXgtdWkvcmVhY3QtdG9nZ2xlXCI6IFwiXjEuMS4wXCIsXHJcbiAgICAgICAgXCJAcmFkaXgtdWkvcmVhY3QtdG9nZ2xlLWdyb3VwXCI6IFwiXjEuMS4wXCIsXHJcbiAgICAgICAgXCJAcmFkaXgtdWkvcmVhY3QtdG9vbHRpcFwiOiBcIl4xLjEuMlwiLFxyXG4gICAgICAgIFwiQHN1cGFiYXNlL3N1cGFiYXNlLWpzXCI6IFwiXjIuNDQuNFwiLFxyXG4gICAgICAgIFwiY2xhc3MtdmFyaWFuY2UtYXV0aG9yaXR5XCI6IFwiXjAuNy4wXCIsXHJcbiAgICAgICAgXCJjbHN4XCI6IFwiXjIuMS4xXCIsXHJcbiAgICAgICAgXCJjc3MtdG8tdGFpbHdpbmQtdHJhbnNsYXRvclwiOiBcIl4xLjIuOFwiLFxyXG4gICAgICAgIFwiY3Vsb3JpXCI6IFwiXjQuMC4xXCIsXHJcbiAgICAgICAgXCJlbGVjdHJvbi11cGRhdGVyXCI6IFwiXjYuMi4xXCIsXHJcbiAgICAgICAgXCJmZmxhdGVcIjogXCJeMC44LjJcIixcclxuICAgICAgICBcImZyYW1lci1tb3Rpb25cIjogXCJeMTEuMi4xMlwiLFxyXG4gICAgICAgIFwibG9jYWx0dW5uZWxcIjogXCJeMi4wLjJcIixcclxuICAgICAgICBcImxvZGFzaC5kZWJvdW5jZVwiOiBcIl40LjAuOFwiLFxyXG4gICAgICAgIFwibWl4cGFuZWxcIjogXCJeMC4xOC4wXCIsXHJcbiAgICAgICAgXCJuYW5vaWRcIjogXCJeNS4wLjdcIixcclxuICAgICAgICBcInJlYWN0LWFyYm9yaXN0XCI6IFwiXjMuNC4wXCIsXHJcbiAgICAgICAgXCJyZWFjdC1jb2xvcmZ1bFwiOiBcIl41LjYuMVwiLFxyXG4gICAgICAgIFwicmVhY3QtZGlmZi12aWV3ZXItY29udGludWVkXCI6IFwiXjMuNC4wXCIsXHJcbiAgICAgICAgXCJyZWFjdC1ob3RrZXlzLWhvb2tcIjogXCJeNC41LjBcIixcclxuICAgICAgICBcInJlYWN0LXRpbnktcG9wb3ZlclwiOiBcIl44LjAuNFwiLFxyXG4gICAgICAgIFwidGFpbHdpbmQtbWVyZ2VcIjogXCJeMi4zLjBcIixcclxuICAgICAgICBcInRhaWx3aW5kY3NzLWFuaW1hdGVcIjogXCJeMS4wLjdcIlxyXG4gICAgfSxcclxuICAgIFwiZGV2RGVwZW5kZW5jaWVzXCI6IHtcclxuICAgICAgICBcIkBlc2xpbnQvY29tcGF0XCI6IFwiXjEuMS4xXCIsXHJcbiAgICAgICAgXCJAZXNsaW50L2pzXCI6IFwiXjkuNy4wXCIsXHJcbiAgICAgICAgXCJAcGxheXdyaWdodC90ZXN0XCI6IFwiXjEuNDIuMVwiLFxyXG4gICAgICAgIFwiQHR5cGVzL2J1blwiOiBcIl4xLjEuNlwiLFxyXG4gICAgICAgIFwiQHR5cGVzL2Nzcy10cmVlXCI6IFwiXjIuMy44XCIsXHJcbiAgICAgICAgXCJAdHlwZXMvY3Vsb3JpXCI6IFwiXjIuMS4wXCIsXHJcbiAgICAgICAgXCJAdHlwZXMvbG9jYWx0dW5uZWxcIjogXCJeMi4wLjRcIixcclxuICAgICAgICBcIkB0eXBlcy9sb2Rhc2hcIjogXCJeNC4xNy43XCIsXHJcbiAgICAgICAgXCJAdHlwZXMvbm9kZVwiOiBcIl4yMC4xNC45XCIsXHJcbiAgICAgICAgXCJAdHlwZXMvcmVhY3RcIjogXCJeMTguMi42NFwiLFxyXG4gICAgICAgIFwiQHR5cGVzL3JlYWN0LWRvbVwiOiBcIl4xOC4yLjIxXCIsXHJcbiAgICAgICAgXCJAdml0ZWpzL3BsdWdpbi1yZWFjdFwiOiBcIl40LjIuMVwiLFxyXG4gICAgICAgIFwiYXV0b3ByZWZpeGVyXCI6IFwiXjEwLjQuMTlcIixcclxuICAgICAgICBcImNzcy10cmVlXCI6IFwiXjIuMy4xXCIsXHJcbiAgICAgICAgXCJlbGVjdHJvblwiOiBcIl4zMi4wLjFcIixcclxuICAgICAgICBcImVsZWN0cm9uLWJ1aWxkZXJcIjogXCJeMjQuMTMuM1wiLFxyXG4gICAgICAgIFwiZXNsaW50XCI6IFwiOC54XCIsXHJcbiAgICAgICAgXCJlc2xpbnQtY29uZmlnLXByZXR0aWVyXCI6IFwiXjkuMS4wXCIsXHJcbiAgICAgICAgXCJlc2xpbnQtcGx1Z2luLXJlYWN0XCI6IFwiXjcuMzQuM1wiLFxyXG4gICAgICAgIFwiZ2xvYmFsc1wiOiBcIl4xNS44LjBcIixcclxuICAgICAgICBcImh1c2t5XCI6IFwiXjguMC4wXCIsXHJcbiAgICAgICAgXCJtb2J4XCI6IFwiXjYuMTIuNFwiLFxyXG4gICAgICAgIFwibW9ieC1yZWFjdC1saXRlXCI6IFwiXjQuMC43XCIsXHJcbiAgICAgICAgXCJwb3N0Y3NzXCI6IFwiXjguNC4zOFwiLFxyXG4gICAgICAgIFwicG9zdGNzcy1pbXBvcnRcIjogXCJeMTYuMC4xXCIsXHJcbiAgICAgICAgXCJwcmV0dGllclwiOiBcIl4zLjMuMlwiLFxyXG4gICAgICAgIFwicmVhY3RcIjogXCJeMTguMi4wXCIsXHJcbiAgICAgICAgXCJyZWFjdC1kb21cIjogXCJeMTguMi4wXCIsXHJcbiAgICAgICAgXCJ0YWlsd2luZGNzc1wiOiBcIl4zLjQuNFwiLFxyXG4gICAgICAgIFwidHlwZXNjcmlwdFwiOiBcIl41LjQuMlwiLFxyXG4gICAgICAgIFwidHlwZXNjcmlwdC1lc2xpbnRcIjogXCJeNy4xNi4wXCIsXHJcbiAgICAgICAgXCJ2aXRlXCI6IFwiXjUuMS41XCIsXHJcbiAgICAgICAgXCJ2aXRlLXBsdWdpbi1lbGVjdHJvblwiOiBcIl4wLjI4LjRcIixcclxuICAgICAgICBcInZpdGUtcGx1Z2luLWVsZWN0cm9uLXJlbmRlcmVyXCI6IFwiXjAuMTQuNVwiXHJcbiAgICB9XHJcbn1cclxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFvVSxPQUFPLFdBQVc7QUFDdFYsU0FBUyxjQUFjO0FBQ3ZCLE9BQU8sVUFBVTtBQUNqQixTQUFTLG9CQUFvQjtBQUM3QixPQUFPLGNBQWM7OztBQ0pyQjtBQUFBLEVBQ0ksYUFBZTtBQUFBLEVBQ2YsTUFBUTtBQUFBLEVBQ1IsU0FBVztBQUFBLEVBQ1gsVUFBWTtBQUFBLEVBQ1osTUFBUTtBQUFBLEVBQ1IsYUFBZTtBQUFBLEVBQ2YsU0FBVztBQUFBLEVBQ1gsUUFBVTtBQUFBLElBQ04sTUFBUTtBQUFBLElBQ1IsT0FBUztBQUFBLEVBQ2I7QUFBQSxFQUNBLFNBQVc7QUFBQSxFQUNYLFlBQWM7QUFBQSxJQUNWLE1BQVE7QUFBQSxJQUNSLEtBQU87QUFBQSxFQUNYO0FBQUEsRUFD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USxLQUFLLEtBQUssa0NBQVcsUUFBUTtBQUFBLE1BQ3pDO0FBQUEsSUFDSjtBQUFBLElBQ0EsU0FBUztBQUFBLE1BQ0wsTUFBTTtBQUFBLE1BQ04sU0FBUztBQUFBLFFBQ0wsTUFBTTtBQUFBO0FBQUEsVUFFRixPQUFPO0FBQUEsVUFDUCxRQUFRLE1BQU07QUFDVixnQkFBSSxRQUFRLElBQUksY0FBYztBQUMxQixzQkFBUTtBQUFBO0FBQUEsZ0JBQ2tDO0FBQUEsY0FDMUM7QUFBQSxZQUNKLE9BQU87QUFDSCxtQkFBSyxRQUFRO0FBQUEsWUFDakI7QUFBQSxVQUNKO0FBQUEsVUFDQSxNQUFNO0FBQUEsWUFDRixPQUFPO0FBQUEsY0FDSDtBQUFBLGNBQ0EsUUFBUTtBQUFBLGNBQ1IsUUFBUTtBQUFBLGNBQ1IsZUFBZTtBQUFBLGdCQUNYLFVBQVUsT0FBTztBQUFBLGtCQUNiLGtCQUFrQixrQkFBTSxnQkFBSSxlQUFlLENBQUM7QUFBQSxnQkFDaEQ7QUFBQSxjQUNKO0FBQUEsWUFDSjtBQUFBLFVBQ0o7QUFBQSxRQUNKO0FBQUEsUUFDQSxTQUFTO0FBQUEsVUFDTCxPQUFPO0FBQUEsWUFDSCxPQUFPO0FBQUEsWUFDUCxTQUFTO0FBQUEsVUFDYjtBQUFBLFVBQ0EsTUFBTTtBQUFBLFlBQ0YsT0FBTztBQUFBLGNBQ0gsV0FBVyxZQUFZLFdBQVc7QUFBQTtBQUFBLGNBQ2xDLFFBQVE7QUFBQSxjQUNSLFFBQVE7QUFBQSxjQUNSLGVBQWU7QUFBQSxnQkFDWCxVQUFVLE9BQU8sS0FBSyxnQkFBSSxnQkFBZ0IsQ0FBQyxDQUFDO0FBQUEsZ0JBQzVDLFFBQVE7QUFBQSxrQkFDSixRQUFRO0FBQUEsa0JBQ1IsZ0JBQWdCO0FBQUEsa0JBQ2hCLHNCQUFzQjtBQUFBLGdCQUMxQjtBQUFBLGNBQ0o7QUFBQSxZQUNKO0FBQUEsVUFDSjtBQUFBLFFBQ0o7QUFBQTtBQUFBO0FBQUE7QUFBQSxRQUlBLFVBQVUsQ0FBQztBQUFBLE1BQ2YsQ0FBQztBQUFBLElBQ0w7QUFBQSxJQUNBLFFBQ0ksUUFBUSxJQUFJLGlCQUNYLE1BQU07QUFDSCxZQUFNLE1BQU0sSUFBSSxJQUFJLGdCQUFJLE1BQU0sSUFBSSxtQkFBbUI7QUFDckQsYUFBTztBQUFBLFFBQ0gsTUFBTSxJQUFJO0FBQUEsUUFDVixNQUFNLENBQUMsSUFBSTtBQUFBLE1BQ2Y7QUFBQSxJQUNKLEdBQUc7QUFBQSxJQUNQLGFBQWE7QUFBQSxFQUNqQjtBQUNKLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
