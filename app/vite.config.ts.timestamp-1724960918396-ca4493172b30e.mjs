// vite.config.ts
import react from "file:///Users/kietho/workplace/onlook/studio/app/node_modules/@vitejs/plugin-react/dist/index.mjs";
import { rmSync } from "node:fs";
import path from "node:path";
import { defineConfig } from "file:///Users/kietho/workplace/onlook/studio/app/node_modules/vite/dist/node/index.js";
import electron from "file:///Users/kietho/workplace/onlook/studio/app/node_modules/vite-plugin-electron/dist/simple.mjs";

// package.json
var package_default = {
  productName: "Onlook",
  name: "@onlook/browser",
  version: "0.0.16",
  homepage: "https://onlook.dev",
  main: "dist-electron/main/index.js",
  description: "The first-ever devtool for designers",
  license: "Apache-2.0",
  author: {
    name: "Onlook",
    email: "contact@onlook.dev"
  },
  private: true,
  repository: {
    type: "git",
    url: "https://github.com/onlook-dev/onlook.git"
  },
  debug: {
    env: {
      VITE_DEV_SERVER_URL: "http://127.0.0.1:7777/"
    }
  },
  type: "module",
  scripts: {
    dev: "vite",
    build: "tsc && vite build",
    package: "electron-builder",
    preview: "vite preview",
    pree2e: "vite build --mode=test",
    e2e: "playwright test",
    test: "bun test",
    lint: "eslint --fix .",
    format: "prettier --write .",
    increment_tag: "npm version patch",
    publish_tag: "./scripts/publish_tag.sh",
    remove_tag: "./scripts/remove_tag.sh"
  },
  dependencies: {
    "@radix-ui/react-accordion": "^1.2.0",
    "@radix-ui/react-alert-dialog": "^1.1.1",
    "@radix-ui/react-context-menu": "^2.2.1",
    "@radix-ui/react-dialog": "^1.1.1",
    "@radix-ui/react-dropdown-menu": "^2.1.1",
    "@radix-ui/react-icons": "^1.3.0",
    "@radix-ui/react-label": "^2.1.0",
    "@radix-ui/react-popover": "^1.1.1",
    "@radix-ui/react-select": "^2.1.1",
    "@radix-ui/react-separator": "^1.1.0",
    "@radix-ui/react-slot": "^1.1.0",
    "@radix-ui/react-tabs": "^1.1.0",
    "@radix-ui/react-toast": "^1.2.1",
    "@radix-ui/react-toggle": "^1.1.0",
    "@radix-ui/react-toggle-group": "^1.1.0",
    "@radix-ui/react-tooltip": "^1.1.2",
    "@supabase/supabase-js": "^2.44.4",
    "class-variance-authority": "^0.7.0",
    clsx: "^2.1.1",
    "css-to-tailwind-translator": "^1.2.8",
    culori: "^4.0.1",
    "electron-updater": "^6.2.1",
    fflate: "^0.8.2",
    "framer-motion": "^11.2.12",
    localtunnel: "^2.0.2",
    "lodash.debounce": "^4.0.8",
    mixpanel: "^0.18.0",
    nanoid: "^5.0.7",
    "react-arborist": "^3.4.0",
    "react-colorful": "^5.6.1",
    "react-diff-viewer-continued": "^3.4.0",
    "react-hotkeys-hook": "^4.5.0",
    "react-tiny-popover": "^8.0.4",
    "tailwind-merge": "^2.3.0",
    "tailwindcss-animate": "^1.0.7"
  },
  devDependencies: {
    "@eslint/compat": "^1.1.1",
    "@eslint/js": "^9.7.0",
    "@playwright/test": "^1.42.1",
    "@types/babel__traverse": "^7.20.6",
    "@types/bun": "^1.1.6",
    "@types/css-tree": "^2.3.8",
    "@types/culori": "^2.1.0",
    "@types/localtunnel": "^2.0.4",
    "@types/lodash": "^4.17.7",
    "@types/node": "^20.14.9",
    "@types/react": "^18.2.64",
    "@types/react-dom": "^18.2.21",
    "@vitejs/plugin-react": "^4.2.1",
    autoprefixer: "^10.4.19",
    "css-tree": "^2.3.1",
    electron: "^32.0.1",
    "electron-builder": "^24.13.3",
    eslint: "8.x",
    "eslint-config-prettier": "^9.1.0",
    "eslint-plugin-react": "^7.34.3",
    globals: "^15.8.0",
    husky: "^8.0.0",
    mobx: "^6.12.4",
    "mobx-react-lite": "^4.0.7",
    postcss: "^8.4.38",
    "postcss-import": "^16.0.1",
    prettier: "^3.3.2",
    react: "^18.2.0",
    "react-dom": "^18.2.0",
    tailwindcss: "^3.4.4",
    typescript: "^5.4.2",
    "typescript-eslint": "^7.16.0",
    vite: "^5.1.5",
    "vite-plugin-electron": "^0.28.4",
    "vite-plugin-electron-renderer": "^0.14.5"
  }
};

// vite.config.ts
var __vite_injected_original_dirname = "/Users/kietho/workplace/onlook/studio/app";
var vite_config_default = defineConfig(({ command }) => {
  rmSync("dist-electron", { recursive: true, force: true });
  const isServe = command === "serve";
  const isBuild = command === "build";
  const sourcemap = isServe || !!process.env.VSCODE_DEBUG;
  return {
    resolve: {
      alias: {
        "@": path.join(__vite_injected_original_dirname, "src"),
        common: path.join(__vite_injected_original_dirname, "common")
      }
    },
    plugins: [
      react(),
      electron({
        main: {
          // Shortcut of `build.lib.entry`
          entry: "electron/main/index.ts",
          onstart(args) {
            if (process.env.VSCODE_DEBUG) {
              console.log(
                /* For `.vscode/.debug.script.mjs` */
                "[startup] Electron App"
              );
            } else {
              args.startup();
            }
          },
          vite: {
            build: {
              sourcemap: sourcemap ? "inline" : void 0,
              minify: isBuild,
              outDir: "dist-electron/main",
              rollupOptions: {
                external: Object.keys(
                  "dependencies" in package_default ? package_default.dependencies : {}
                )
              }
            }
          }
        },
        preload: {
          input: {
            index: "electron/preload/browserview/index.ts",
            webview: "electron/preload/webview/index.ts"
          },
          vite: {
            build: {
              sourcemap: sourcemap ? "inline" : void 0,
              minify: isBuild,
              outDir: "dist-electron/preload",
              rollupOptions: {
                external: Object.keys(package_default.dependencies ?? {}),
                output: {
                  format: "cjs",
                  entryFileNames: "[name].js",
                  inlineDynamicImports: false
                }
              }
            }
          }
        },
        // Ployfill the Electron and Node.js API for Renderer process.
        // If you want use Node.js in Renderer process, the `nodeIntegration` needs to be enabled in the Main process.
        // See 👉 https://github.com/electron-vite/vite-plugin-electron-renderer
        renderer: {}
      })
    ],
    server: process.env.VSCODE_DEBUG && (() => {
      const url = new URL(package_default.debug.env.VITE_DEV_SERVER_URL);
      return {
        host: url.hostname,
        port: +url.port
      };
    })(),
    clearScreen: false
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiLCAicGFja2FnZS5qc29uIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiL1VzZXJzL2tpZXRoby93b3JrcGxhY2Uvb25sb29rL3N0dWRpby9hcHBcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy9raWV0aG8vd29ya3BsYWNlL29ubG9vay9zdHVkaW8vYXBwL3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy9raWV0aG8vd29ya3BsYWNlL29ubG9vay9zdHVkaW8vYXBwL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0JztcbmltcG9ydCB7IHJtU3luYyB9IGZyb20gJ25vZGU6ZnMnO1xuaW1wb3J0IHBhdGggZnJvbSAnbm9kZTpwYXRoJztcbmltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gJ3ZpdGUnO1xuaW1wb3J0IGVsZWN0cm9uIGZyb20gJ3ZpdGUtcGx1Z2luLWVsZWN0cm9uL3NpbXBsZSc7XG5pbXBvcnQgcGtnIGZyb20gJy4vcGFja2FnZS5qc29uJztcblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBjb21tYW5kIH0pID0+IHtcbiAgICBybVN5bmMoJ2Rpc3QtZWxlY3Ryb24nLCB7IHJlY3Vyc2l2ZTogdHJ1ZSwgZm9yY2U6IHRydWUgfSk7XG5cbiAgICBjb25zdCBpc1NlcnZlID0gY29tbWFuZCA9PT0gJ3NlcnZlJztcbiAgICBjb25zdCBpc0J1aWxkID0gY29tbWFuZCA9PT0gJ2J1aWxkJztcbiAgICBjb25zdCBzb3VyY2VtYXAgPSBpc1NlcnZlIHx8ICEhcHJvY2Vzcy5lbnYuVlNDT0RFX0RFQlVHO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICAgICAgYWxpYXM6IHtcbiAgICAgICAgICAgICAgICAnQCc6IHBhdGguam9pbihfX2Rpcm5hbWUsICdzcmMnKSxcbiAgICAgICAgICAgICAgICBjb21tb246IHBhdGguam9pbihfX2Rpcm5hbWUsICdjb21tb24nKSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICAgIHBsdWdpbnM6IFtcbiAgICAgICAgICAgIHJlYWN0KCksXG4gICAgICAgICAgICBlbGVjdHJvbih7XG4gICAgICAgICAgICAgICAgbWFpbjoge1xuICAgICAgICAgICAgICAgICAgICAvLyBTaG9ydGN1dCBvZiBgYnVpbGQubGliLmVudHJ5YFxuICAgICAgICAgICAgICAgICAgICBlbnRyeTogJ2VsZWN0cm9uL21haW4vaW5kZXgudHMnLFxuICAgICAgICAgICAgICAgICAgICBvbnN0YXJ0KGFyZ3MpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwcm9jZXNzLmVudi5WU0NPREVfREVCVUcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLyogRm9yIGAudnNjb2RlLy5kZWJ1Zy5zY3JpcHQubWpzYCAqLyAnW3N0YXJ0dXBdIEVsZWN0cm9uIEFwcCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXJncy5zdGFydHVwKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHZpdGU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJ1aWxkOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc291cmNlbWFwOiBzb3VyY2VtYXAgPyAnaW5saW5lJyA6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtaW5pZnk6IGlzQnVpbGQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3V0RGlyOiAnZGlzdC1lbGVjdHJvbi9tYWluJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4dGVybmFsOiBPYmplY3Qua2V5cyhcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdkZXBlbmRlbmNpZXMnIGluIHBrZyA/IHBrZy5kZXBlbmRlbmNpZXMgOiB7fSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHByZWxvYWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgaW5wdXQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGluZGV4OiAnZWxlY3Ryb24vcHJlbG9hZC9icm93c2Vydmlldy9pbmRleC50cycsXG4gICAgICAgICAgICAgICAgICAgICAgICB3ZWJ2aWV3OiAnZWxlY3Ryb24vcHJlbG9hZC93ZWJ2aWV3L2luZGV4LnRzJyxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgdml0ZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgYnVpbGQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzb3VyY2VtYXA6IHNvdXJjZW1hcCA/ICdpbmxpbmUnIDogdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1pbmlmeTogaXNCdWlsZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvdXREaXI6ICdkaXN0LWVsZWN0cm9uL3ByZWxvYWQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXh0ZXJuYWw6IE9iamVjdC5rZXlzKHBrZy5kZXBlbmRlbmNpZXMgPz8ge30pLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvdXRwdXQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvcm1hdDogJ2NqcycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnRyeUZpbGVOYW1lczogJ1tuYW1lXS5qcycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbmxpbmVEeW5hbWljSW1wb3J0czogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAvLyBQbG95ZmlsbCB0aGUgRWxlY3Ryb24gYW5kIE5vZGUuanMgQVBJIGZvciBSZW5kZXJlciBwcm9jZXNzLlxuICAgICAgICAgICAgICAgIC8vIElmIHlvdSB3YW50IHVzZSBOb2RlLmpzIGluIFJlbmRlcmVyIHByb2Nlc3MsIHRoZSBgbm9kZUludGVncmF0aW9uYCBuZWVkcyB0byBiZSBlbmFibGVkIGluIHRoZSBNYWluIHByb2Nlc3MuXG4gICAgICAgICAgICAgICAgLy8gU2VlIFx1RDgzRFx1REM0OSBodHRwczovL2dpdGh1Yi5jb20vZWxlY3Ryb24tdml0ZS92aXRlLXBsdWdpbi1lbGVjdHJvbi1yZW5kZXJlclxuICAgICAgICAgICAgICAgIHJlbmRlcmVyOiB7fSxcbiAgICAgICAgICAgIH0pLFxuICAgICAgICBdLFxuICAgICAgICBzZXJ2ZXI6XG4gICAgICAgICAgICBwcm9jZXNzLmVudi5WU0NPREVfREVCVUcgJiZcbiAgICAgICAgICAgICgoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgdXJsID0gbmV3IFVSTChwa2cuZGVidWcuZW52LlZJVEVfREVWX1NFUlZFUl9VUkwpO1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIGhvc3Q6IHVybC5ob3N0bmFtZSxcbiAgICAgICAgICAgICAgICAgICAgcG9ydDogK3VybC5wb3J0LFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9KSgpLFxuICAgICAgICBjbGVhclNjcmVlbjogZmFsc2UsXG4gICAgfTtcbn0pO1xuIiwgIntcbiAgICBcInByb2R1Y3ROYW1lXCI6IFwiT25sb29rXCIsXG4gICAgXCJuYW1lXCI6IFwiQG9ubG9vay9icm93c2VyXCIsXG4gICAgXCJ2ZXJzaW9uXCI6IFwiMC4wLjE2XCIsXG4gICAgXCJob21lcGFnZVwiOiBcImh0dHBzOi8vb25sb29rLmRldlwiLFxuICAgIFwibWFpblwiOiBcImRpc3QtZWxlY3Ryb24vbWFpbi9pbmRleC5qc1wiLFxuICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgZmlyc3QtZXZlciBkZXZ0b29sIGZvciBkZXNpZ25lcnNcIixcbiAgICBcImxpY2Vuc2VcIjogXCJBcGFjaGUtMi4wXCIsXG4gICAgXCJhdXRob3JcIjoge1xuICAgICAgICBcIm5hbWVcIjogXCJPbmxvb2tcIixcbiAgICAgICAgXCJlbWFpbFwiOiBcImNvbnRhY3RAb25sb29rLmRldlwiXG4gICAgfSxcbiAgICBcInByaXZhdGVcIjogdHJ1ZSxcbiAgICBcInJlcG9zaXRvcnlcIjoge1xuICAgICAgICBcInR5cGVcIjogXCJnaXRcIixcbiAgICAgICAgXCJ1cmxcIjogXCJodHRwczovL2dpdGh1Yi5jb20vb25sb29rLWRldi9vbmxvb2suZ2l0XCJcbiAgICB9LFxuICAgIFwiZGVidWdcIjoge1xuICAgICAgICBcImVudlwiOiB7XG4gICAgICAgICAgICBcIlZJVEVfREVWX1NFUlZFUl9VUkxcIjogXCJodHRwOi8vMTI3LjAuMC4xOjc3NzcvXCJcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXCJ0eXBlXCI6IFwibW9kdWxlXCIsXG4gICAgXCJzY3JpcHRzXCI6IHtcbiAgICAgICAgXCJkZXZcIjogXCJ2aXRlXCIsXG4gICAgICAgIFwiYnVpbGRcIjogXCJ0c2MgJiYgdml0ZSBidWlsZFwiLFxuICAgICAgICBcInBhY2thZ2VcIjogXCJlbGVjdHJvbi1idWlsZGVyXCIsXG4gICAgICAgIFwicHJldmlld1wiOiBcInZpdGUgcHJldmlld1wiLFxuICAgICAgICBcInByZWUyZVwiOiBcInZpdGUgYnVpbGQgLS1tb2RlPXRlc3RcIixcbiAgICAgICAgXCJlMmVcIjogXCJwbGF5d3JpZ2h0IHRlc3RcIixcbiAgICAgICAgXCJ0ZXN0XCI6IFwiYnVuIHRlc3RcIixcbiAgICAgICAgXCJsaW50XCI6IFwiZXNsaW50IC0tZml4IC5cIixcbiAgICAgICAgXCJmb3JtYXRcIjogXCJwcmV0dGllciAtLXdyaXRlIC5cIixcbiAgICAgICAgXCJpbmNyZW1lbnRfdGFnXCI6IFwibnBtIHZlcnNpb24gcGF0Y2hcIixcbiAgICAgICAgXCJwdWJsaXNoX3RhZ1wiOiBcIi4vc2NyaXB0cy9wdWJsaXNoX3RhZy5zaFwiLFxuICAgICAgICBcInJlbW92ZV90YWdcIjogXCIuL3NjcmlwdHMvcmVtb3ZlX3RhZy5zaFwiXG4gICAgfSxcbiAgICBcImRlcGVuZGVuY2llc1wiOiB7XG4gICAgICAgIFwiQHJhZGl4LXVpL3JlYWN0LWFjY29yZGlvblwiOiBcIl4xLjIuMFwiLFxuICAgICAgICBcIkByYWRpeC11aS9yZWFjdC1hbGVydC1kaWFsb2dcIjogXCJeMS4xLjFcIixcbiAgICAgICAgXCJAcmFkaXgtdWkvcmVhY3QtY29udGV4dC1tZW51XCI6IFwiXjIuMi4xXCIsXG4gICAgICAgIFwiQHJhZGl4LXVpL3JlYWN0LWRpYWxvZ1wiOiBcIl4xLjEuMVwiLFxuICAgICAgICBcIkByYWRpeC11aS9yZWFjdC1kcm9wZG93bi1tZW51XCI6IFwiXjIuMS4xXCIsXG4gICAgICAgIFwiQHJhZGl4LXVpL3JlYWN0LWljb25zXCI6IFwiXjEuMy4wXCIsXG4gICAgICAgIFwiQHJhZGl4LXVpL3JlYWN0LWxhYmVsXCI6IFwiXjIuMS4wXCIsXG4gICAgICAgIFwiQHJhZGl4LXVpL3JlYWN0LXBvcG92ZXJcIjogXCJeMS4xLjFcIixcbiAgICAgICAgXCJAcmFkaXgtdWkvcmVhY3Qtc2VsZWN0XCI6IFwiXjIuMS4xXCIsXG4gICAgICAgIFwiQHJhZGl4LXVpL3JlYWN0LXNlcGFyYXRvclwiOiBcIl4xLjEuMFwiLFxuICAgICAgICBcIkByYWRpeC11aS9yZWFjdC1zbG90XCI6IFwiXjEuMS4wXCIsXG4gICAgICAgIFwiQHJhZGl4LXVpL3JlYWN0LXRhYnNcIjogXCJeMS4xLjBcIixcbiAgICAgICAgXCJAcmFkaXgtdWkvcmVhY3QtdG9hc3RcIjogXCJeMS4yLjFcIixcbiAgICAgICAgXCJAcmFkaXgtdWkvcmVhY3QtdG9nZ2xlXCI6IFwiXjEuMS4wXCIsXG4gICAgICAgIFwiQHJhZGl4LXVpL3JlYWN0LXRvZ2dsZS1ncm91cFwiOiBcIl4xLjEuMFwiLFxuICAgICAgICBcIkByYWRpeC11aS9yZWFjdC10b29sdGlwXCI6IFwiXjEuMS4yXCIsXG4gICAgICAgIFwiQHN1cGFiYXNlL3N1cGFiYXNlLWpzXCI6IFwiXjIuNDQuNFwiLFxuICAgICAgICBcImNsYXNzLXZhcmlhbmNlLWF1dGhvcml0eVwiOiBcIl4wLjcuMFwiLFxuICAgICAgICBcImNsc3hcIjogXCJeMi4xLjFcIixcbiAgICAgICAgXCJjc3MtdG8tdGFpbHdpbmQtdHJhbnNsYXRvclwiOiBcIl4xLjIuOFwiLFxuICAgICAgICBcImN1bG9yaVwiOiBcIl40LjAuMVwiLFxuICAgICAgICBcImVsZWN0cm9uLXVwZGF0ZXJcIjogXCJeNi4yLjFcIixcbiAgICAgICAgXCJmZmxhdGVcIjogXCJeMC44LjJcIixcbiAgICAgICAgXCJmcmFtZXItbW90aW9uXCI6IFwiXjExLjIuMTJcIixcbiAgICAgICAgXCJsb2NhbHR1bm5lbFwiOiBcIl4yLjAuMlwiLFxuICAgICAgICBcImxvZGFzaC5kZWJvdW5jZVwiOiBcIl40LjAuOFwiLFxuICAgICAgICBcIm1peHBhbmVsXCI6IFwiXjAuMTguMFwiLFxuICAgICAgICBcIm5hbm9pZFwiOiBcIl41LjAuN1wiLFxuICAgICAgICBcInJlYWN0LWFyYm9yaXN0XCI6IFwiXjMuNC4wXCIsXG4gICAgICAgIFwicmVhY3QtY29sb3JmdWxcIjogXCJeNS42LjFcIixcbiAgICAgICAgXCJyZWFjdC1kaWZmLXZpZXdlci1jb250aW51ZWRcIjogXCJeMy40LjBcIixcbiAgICAgICAgXCJyZWFjdC1ob3RrZXlzLWhvb2tcIjogXCJeNC41LjBcIixcbiAgICAgICAgXCJyZWFjdC10aW55LXBvcG92ZXJcIjogXCJeOC4wLjRcIixcbiAgICAgICAgXCJ0YWlsd2luZC1tZXJnZVwiOiBcIl4yLjMuMFwiLFxuICAgICAgICBcInRhaWx3aW5kY3NzLWFuaW1hdGVcIjogXCJeMS4wLjdcIlxuICAgIH0sXG4gICAgXCJkZXZEZXBlbmRlbmNpZXNcIjoge1xuICAgICAgICBcIkBlc2xpbnQvY29tcGF0XCI6IFwiXjEuMS4xXCIsXG4gICAgICAgIFwiQGVzbGludC9qc1wiOiBcIl45LjcuMFwiLFxuICAgICAgICBcIkBwbGF5d3JpZ2h0L3Rlc3RcIjogXCJeMS40Mi4xXCIsXG4gICAgICAgIFwiQHR5cGVzL2JhYmVsX190cmF2ZXJzZVwiOiBcIl43LjIwLjZcIixcbiAgICAgICAgXCJAdHlwZXMvYnVuXCI6IFwiXjEuMS42XCIsXG4gICAgICAgIFwiQHR5cGVzL2Nzcy10cmVlXCI6IFwiXjIuMy44XCIsXG4gICAgICAgIFwiQHR5cGVzL2N1bG9yaVwiOiBcIl4yLjEuMFwiLFxuICAgICAgICBcIkB0eXBlcy9sb2NhbHR1bm5lbFwiOiBcIl4yLjAuNFwiLFxuICAgICAgICBcIkB0eXBlcy9sb2Rhc2hcIjogXCJeNC4xNy43XCIsXG4gICAgICAgIFwiQHR5cGVzL25vZGVcIjogXCJeMjAuMTQuOVwiLFxuICAgICAgICBcIkB0eXBlcy9yZWFjdFwiOiBcIl4xOC4yLjY0XCIsXG4gICAgICAgIFwiQHR5cGVzL3JlYWN0LWRvbVwiOiBcIl4xOC4yLjIxXCIsXG4gICAgICAgIFwiQHZpdGVqcy9wbHVnaW4tcmVhY3RcIjogXCJeNC4yLjFcIixcbiAgICAgICAgXCJhdXRvcHJlZml4ZXJcIjogXCJeMTAuNC4xOVwiLFxuICAgICAgICBcImNzcy10cmVlXCI6IFwiXjIuMy4xXCIsXG4gICAgICAgIFwiZWxlY3Ryb25cIjogXCJeMzIuMC4xXCIsXG4gICAgICAgIFwiZWxlY3Ryb24tYnVpbGRlclwiOiBcIl4yNC4xMy4zXCIsXG4gICAgICAgIFwiZXNsaW50XCI6IFwiOC54XCIsXG4gICAgICAgIFwiZXNsaW50LWNvbmZpZy1wcmV0dGllclwiOiBcIl45LjEuMFwiLFxuICAgICAgICBcImVzbGludC1wbHVnaW4tcmVhY3RcIjogXCJeNy4zNC4zXCIsXG4gICAgICAgIFwiZ2xvYmFsc1wiOiBcIl4xNS44LjBcIixcbiAgICAgICAgXCJodXNreVwiOiBcIl44LjAuMFwiLFxuICAgICAgICBcIm1vYnhcIjogXCJeNi4xMi40XCIsXG4gICAgICAgIFwibW9ieC1yZWFjdC1saXRlXCI6IFwiXjQuMC43XCIsXG4gICAgICAgIFwicG9zdGNzc1wiOiBcIl44LjQuMzhcIixcbiAgICAgICAgXCJwb3N0Y3NzLWltcG9ydFwiOiBcIl4xNi4wLjFcIixcbiAgICAgICAgXCJwcmV0dGllclwiOiBcIl4zLjMuMlwiLFxuICAgICAgICBcInJlYWN0XCI6IFwiXjE4LjIuMFwiLFxuICAgICAgICBcInJlYWN0LWRvbVwiOiBcIl4xOC4yLjBcIixcbiAgICAgICAgXCJ0YWlsd2luZGNzc1wiOiBcIl4zLjQuNFwiLFxuICAgICAgICBcInR5cGVzY3JpcHRcIjogXCJeNS40LjJcIixcbiAgICAgICAgXCJ0eXBlc2NyaXB0LWVzbGludFwiOiBcIl43LjE2LjBcIixcbiAgICAgICAgXCJ2aXRlXCI6IFwiXjUuMS41XCIsXG4gICAgICAgIFwidml0ZS1wbHVnaW4tZWxlY3Ryb25cIjogXCJeMC4yOC40XCIsXG4gICAgICAgIFwidml0ZS1wbHVnaW4tZWxlY3Ryb24tcmVuZGVyZXJcIjogXCJeMC4xNC41XCJcbiAgICB9XG59XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQTZTLE9BQU8sV0FBVztBQUMvVCxTQUFTLGNBQWM7QUFDdkIsT0FBTyxVQUFVO0FBQ2pCLFNBQVMsb0JBQW9CO0FBQzdCLE9BQU8sY0FBYzs7O0FDSnJCO0FBQUEsRUFDSSxhQUFlO0FBQUEsRUFDZixNQUFRO0FBQUEsRUFDUixTQUFXO0FBQUEsRUFDWCxVQUFZO0FBQUEsRUFDWixNQUFRO0FBQUEsRUFDUixhQUFlO0FBQUEsRUFDZixTQUFXO0FBQUEsRUFDWCxRQUFVO0FBQUEsSUFDTixNQUFRO0FBQUEsSUFDUixPQUFTO0FBQUEsRUFDYjtBQUFBLEVBQ0EsU0FBVztBQUFBLEVBQ1gsWUFBYztBQUFBLElBQ1YsTUFBUTtBQUFBLElBQ1IsS0FBTztBQUFBLEVBQ1g7QUFBQSxFQUNBLE9BQVM7QUFBQSxJQUNMLEtBQU87QUFBQSxNQUNILHFCQUF1QjtBQUFBLElBQzNCO0FBQUEsRUFDSjtBQUFBLEVBQ0EsTUFBUTtBQUFBLEVBQ1IsU0FBVztBQUFBLElBQ1AsS0FBTztBQUFBLElBQ1AsT0FBUztBQUFBLElBQ1QsU0FBVztBQUFBLElBQ1gsU0FBVztBQUFBLElBQ1gsUUFBVTtBQUFBLElBQ1YsS0FBTztBQUFBLElBQ1AsTUFBUTtBQUFBLElBQ1IsTUFBUTtBQUFBLElBQ1IsUUFBVTtBQUFBLElBQ1YsZUFBaUI7QUFBQSxJQUNqQixhQUFlO0FBQUEsSUFDZixZQUFjO0FBQUEsRUFDbEI7QUFBQSxFQUNBLGNBQWdCO0FBQUEsSUFDWiw2QkFBNkI7QUFBQSxJQUM3QixnQ0FBZ0M7QUFBQSxJQUNoQyxnQ0FBZ0M7QUFBQSxJQUNoQywwQkFBMEI7QUFB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
