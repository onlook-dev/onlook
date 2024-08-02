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
  version: "0.0.6",
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
    url: "https://github.com/onlook-dev/studio.git"
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
    "react-tiny-popover": "^8.0.4",
    "tailwind-merge": "^2.3.0",
    "tailwindcss-animate": "^1.0.7"
  },
  devDependencies: {
    "@eslint/compat": "^1.1.1",
    "@eslint/js": "^9.7.0",
    "@playwright/test": "^1.42.1",
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
    electron: "^31.3.1",
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
              sourcemap,
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
              // #332
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiLCAicGFja2FnZS5qc29uIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiL1VzZXJzL2tpZXRoby93b3JrcGxhY2Uvb25sb29rL3N0dWRpby9hcHBcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy9raWV0aG8vd29ya3BsYWNlL29ubG9vay9zdHVkaW8vYXBwL3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy9raWV0aG8vd29ya3BsYWNlL29ubG9vay9zdHVkaW8vYXBwL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0JztcbmltcG9ydCB7IHJtU3luYyB9IGZyb20gJ25vZGU6ZnMnO1xuaW1wb3J0IHBhdGggZnJvbSAnbm9kZTpwYXRoJztcbmltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gJ3ZpdGUnO1xuaW1wb3J0IGVsZWN0cm9uIGZyb20gJ3ZpdGUtcGx1Z2luLWVsZWN0cm9uL3NpbXBsZSc7XG5pbXBvcnQgcGtnIGZyb20gJy4vcGFja2FnZS5qc29uJztcblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBjb21tYW5kIH0pID0+IHtcbiAgICBybVN5bmMoJ2Rpc3QtZWxlY3Ryb24nLCB7IHJlY3Vyc2l2ZTogdHJ1ZSwgZm9yY2U6IHRydWUgfSk7XG5cbiAgICBjb25zdCBpc1NlcnZlID0gY29tbWFuZCA9PT0gJ3NlcnZlJztcbiAgICBjb25zdCBpc0J1aWxkID0gY29tbWFuZCA9PT0gJ2J1aWxkJztcbiAgICBjb25zdCBzb3VyY2VtYXAgPSBpc1NlcnZlIHx8ICEhcHJvY2Vzcy5lbnYuVlNDT0RFX0RFQlVHO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICAgICAgYWxpYXM6IHtcbiAgICAgICAgICAgICAgICAnQCc6IHBhdGguam9pbihfX2Rpcm5hbWUsICdzcmMnKSxcbiAgICAgICAgICAgICAgICBjb21tb246IHBhdGguam9pbihfX2Rpcm5hbWUsICdjb21tb24nKSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICAgIHBsdWdpbnM6IFtcbiAgICAgICAgICAgIHJlYWN0KCksXG4gICAgICAgICAgICBlbGVjdHJvbih7XG4gICAgICAgICAgICAgICAgbWFpbjoge1xuICAgICAgICAgICAgICAgICAgICAvLyBTaG9ydGN1dCBvZiBgYnVpbGQubGliLmVudHJ5YFxuICAgICAgICAgICAgICAgICAgICBlbnRyeTogJ2VsZWN0cm9uL21haW4vaW5kZXgudHMnLFxuICAgICAgICAgICAgICAgICAgICBvbnN0YXJ0KGFyZ3MpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwcm9jZXNzLmVudi5WU0NPREVfREVCVUcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLyogRm9yIGAudnNjb2RlLy5kZWJ1Zy5zY3JpcHQubWpzYCAqLyAnW3N0YXJ0dXBdIEVsZWN0cm9uIEFwcCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXJncy5zdGFydHVwKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHZpdGU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJ1aWxkOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc291cmNlbWFwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1pbmlmeTogaXNCdWlsZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvdXREaXI6ICdkaXN0LWVsZWN0cm9uL21haW4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXh0ZXJuYWw6IE9iamVjdC5rZXlzKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2RlcGVuZGVuY2llcycgaW4gcGtnID8gcGtnLmRlcGVuZGVuY2llcyA6IHt9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICApLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgcHJlbG9hZDoge1xuICAgICAgICAgICAgICAgICAgICBpbnB1dDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgaW5kZXg6ICdlbGVjdHJvbi9wcmVsb2FkL2Jyb3dzZXJ2aWV3L2luZGV4LnRzJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHdlYnZpZXc6ICdlbGVjdHJvbi9wcmVsb2FkL3dlYnZpZXcvaW5kZXgudHMnLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB2aXRlOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBidWlsZDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNvdXJjZW1hcDogc291cmNlbWFwID8gJ2lubGluZScgOiB1bmRlZmluZWQsIC8vICMzMzJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtaW5pZnk6IGlzQnVpbGQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3V0RGlyOiAnZGlzdC1lbGVjdHJvbi9wcmVsb2FkJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4dGVybmFsOiBPYmplY3Qua2V5cyhwa2cuZGVwZW5kZW5jaWVzID8/IHt9KSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3V0cHV0OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3JtYXQ6ICdjanMnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW50cnlGaWxlTmFtZXM6ICdbbmFtZV0uanMnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5saW5lRHluYW1pY0ltcG9ydHM6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgLy8gUGxveWZpbGwgdGhlIEVsZWN0cm9uIGFuZCBOb2RlLmpzIEFQSSBmb3IgUmVuZGVyZXIgcHJvY2Vzcy5cbiAgICAgICAgICAgICAgICAvLyBJZiB5b3Ugd2FudCB1c2UgTm9kZS5qcyBpbiBSZW5kZXJlciBwcm9jZXNzLCB0aGUgYG5vZGVJbnRlZ3JhdGlvbmAgbmVlZHMgdG8gYmUgZW5hYmxlZCBpbiB0aGUgTWFpbiBwcm9jZXNzLlxuICAgICAgICAgICAgICAgIC8vIFNlZSBcdUQ4M0RcdURDNDkgaHR0cHM6Ly9naXRodWIuY29tL2VsZWN0cm9uLXZpdGUvdml0ZS1wbHVnaW4tZWxlY3Ryb24tcmVuZGVyZXJcbiAgICAgICAgICAgICAgICByZW5kZXJlcjoge30sXG4gICAgICAgICAgICB9KSxcbiAgICAgICAgXSxcbiAgICAgICAgc2VydmVyOlxuICAgICAgICAgICAgcHJvY2Vzcy5lbnYuVlNDT0RFX0RFQlVHICYmXG4gICAgICAgICAgICAoKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHVybCA9IG5ldyBVUkwocGtnLmRlYnVnLmVudi5WSVRFX0RFVl9TRVJWRVJfVVJMKTtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBob3N0OiB1cmwuaG9zdG5hbWUsXG4gICAgICAgICAgICAgICAgICAgIHBvcnQ6ICt1cmwucG9ydCxcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSkoKSxcbiAgICAgICAgY2xlYXJTY3JlZW46IGZhbHNlLFxuICAgIH07XG59KTtcbiIsICJ7XG4gICAgXCJwcm9kdWN0TmFtZVwiOiBcIk9ubG9va1wiLFxuICAgIFwibmFtZVwiOiBcIkBvbmxvb2svYnJvd3NlclwiLFxuICAgIFwidmVyc2lvblwiOiBcIjAuMC42XCIsXG4gICAgXCJob21lcGFnZVwiOiBcImh0dHBzOi8vb25sb29rLmRldlwiLFxuICAgIFwibWFpblwiOiBcImRpc3QtZWxlY3Ryb24vbWFpbi9pbmRleC5qc1wiLFxuICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgZmlyc3QtZXZlciBkZXZ0b29sIGZvciBkZXNpZ25lcnNcIixcbiAgICBcImxpY2Vuc2VcIjogXCJBcGFjaGUtMi4wXCIsXG4gICAgXCJhdXRob3JcIjoge1xuICAgICAgICBcIm5hbWVcIjogXCJPbmxvb2tcIixcbiAgICAgICAgXCJlbWFpbFwiOiBcImNvbnRhY3RAb25sb29rLmRldlwiXG4gICAgfSxcbiAgICBcInByaXZhdGVcIjogdHJ1ZSxcbiAgICBcInJlcG9zaXRvcnlcIjoge1xuICAgICAgICBcInR5cGVcIjogXCJnaXRcIixcbiAgICAgICAgXCJ1cmxcIjogXCJodHRwczovL2dpdGh1Yi5jb20vb25sb29rLWRldi9zdHVkaW8uZ2l0XCJcbiAgICB9LFxuICAgIFwiZGVidWdcIjoge1xuICAgICAgICBcImVudlwiOiB7XG4gICAgICAgICAgICBcIlZJVEVfREVWX1NFUlZFUl9VUkxcIjogXCJodHRwOi8vMTI3LjAuMC4xOjc3NzcvXCJcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXCJ0eXBlXCI6IFwibW9kdWxlXCIsXG4gICAgXCJzY3JpcHRzXCI6IHtcbiAgICAgICAgXCJkZXZcIjogXCJ2aXRlXCIsXG4gICAgICAgIFwiYnVpbGRcIjogXCJ0c2MgJiYgdml0ZSBidWlsZFwiLFxuICAgICAgICBcInBhY2thZ2VcIjogXCJlbGVjdHJvbi1idWlsZGVyXCIsXG4gICAgICAgIFwicHJldmlld1wiOiBcInZpdGUgcHJldmlld1wiLFxuICAgICAgICBcInByZWUyZVwiOiBcInZpdGUgYnVpbGQgLS1tb2RlPXRlc3RcIixcbiAgICAgICAgXCJlMmVcIjogXCJwbGF5d3JpZ2h0IHRlc3RcIixcbiAgICAgICAgXCJ0ZXN0XCI6IFwiYnVuIHRlc3RcIixcbiAgICAgICAgXCJsaW50XCI6IFwiZXNsaW50IC0tZml4IC5cIixcbiAgICAgICAgXCJmb3JtYXRcIjogXCJwcmV0dGllciAtLXdyaXRlIC5cIixcbiAgICAgICAgXCJpbmNyZW1lbnRfdGFnXCI6IFwibnBtIHZlcnNpb24gcGF0Y2hcIixcbiAgICAgICAgXCJwdWJsaXNoX3RhZ1wiOiBcIi4vc2NyaXB0cy9wdWJsaXNoX3RhZy5zaFwiLFxuICAgICAgICBcInJlbW92ZV90YWdcIjogXCIuL3NjcmlwdHMvcmVtb3ZlX3RhZy5zaFwiXG4gICAgfSxcbiAgICBcImRlcGVuZGVuY2llc1wiOiB7XG4gICAgICAgIFwiQHJhZGl4LXVpL3JlYWN0LWFjY29yZGlvblwiOiBcIl4xLjIuMFwiLFxuICAgICAgICBcIkByYWRpeC11aS9yZWFjdC1hbGVydC1kaWFsb2dcIjogXCJeMS4xLjFcIixcbiAgICAgICAgXCJAcmFkaXgtdWkvcmVhY3QtZGlhbG9nXCI6IFwiXjEuMS4xXCIsXG4gICAgICAgIFwiQHJhZGl4LXVpL3JlYWN0LWRyb3Bkb3duLW1lbnVcIjogXCJeMi4xLjFcIixcbiAgICAgICAgXCJAcmFkaXgtdWkvcmVhY3QtaWNvbnNcIjogXCJeMS4zLjBcIixcbiAgICAgICAgXCJAcmFkaXgtdWkvcmVhY3QtbGFiZWxcIjogXCJeMi4xLjBcIixcbiAgICAgICAgXCJAcmFkaXgtdWkvcmVhY3QtcG9wb3ZlclwiOiBcIl4xLjEuMVwiLFxuICAgICAgICBcIkByYWRpeC11aS9yZWFjdC1zZWxlY3RcIjogXCJeMi4xLjFcIixcbiAgICAgICAgXCJAcmFkaXgtdWkvcmVhY3Qtc2VwYXJhdG9yXCI6IFwiXjEuMS4wXCIsXG4gICAgICAgIFwiQHJhZGl4LXVpL3JlYWN0LXNsb3RcIjogXCJeMS4xLjBcIixcbiAgICAgICAgXCJAcmFkaXgtdWkvcmVhY3QtdGFic1wiOiBcIl4xLjEuMFwiLFxuICAgICAgICBcIkByYWRpeC11aS9yZWFjdC10b2FzdFwiOiBcIl4xLjIuMVwiLFxuICAgICAgICBcIkByYWRpeC11aS9yZWFjdC10b2dnbGVcIjogXCJeMS4xLjBcIixcbiAgICAgICAgXCJAcmFkaXgtdWkvcmVhY3QtdG9nZ2xlLWdyb3VwXCI6IFwiXjEuMS4wXCIsXG4gICAgICAgIFwiQHN1cGFiYXNlL3N1cGFiYXNlLWpzXCI6IFwiXjIuNDQuNFwiLFxuICAgICAgICBcImNsYXNzLXZhcmlhbmNlLWF1dGhvcml0eVwiOiBcIl4wLjcuMFwiLFxuICAgICAgICBcImNsc3hcIjogXCJeMi4xLjFcIixcbiAgICAgICAgXCJjc3MtdG8tdGFpbHdpbmQtdHJhbnNsYXRvclwiOiBcIl4xLjIuOFwiLFxuICAgICAgICBcImN1bG9yaVwiOiBcIl40LjAuMVwiLFxuICAgICAgICBcImVsZWN0cm9uLXVwZGF0ZXJcIjogXCJeNi4yLjFcIixcbiAgICAgICAgXCJmZmxhdGVcIjogXCJeMC44LjJcIixcbiAgICAgICAgXCJmcmFtZXItbW90aW9uXCI6IFwiXjExLjIuMTJcIixcbiAgICAgICAgXCJsb2NhbHR1bm5lbFwiOiBcIl4yLjAuMlwiLFxuICAgICAgICBcImxvZGFzaC5kZWJvdW5jZVwiOiBcIl40LjAuOFwiLFxuICAgICAgICBcIm1peHBhbmVsXCI6IFwiXjAuMTguMFwiLFxuICAgICAgICBcIm5hbm9pZFwiOiBcIl41LjAuN1wiLFxuICAgICAgICBcInJlYWN0LWFyYm9yaXN0XCI6IFwiXjMuNC4wXCIsXG4gICAgICAgIFwicmVhY3QtY29sb3JmdWxcIjogXCJeNS42LjFcIixcbiAgICAgICAgXCJyZWFjdC1kaWZmLXZpZXdlci1jb250aW51ZWRcIjogXCJeMy40LjBcIixcbiAgICAgICAgXCJyZWFjdC10aW55LXBvcG92ZXJcIjogXCJeOC4wLjRcIixcbiAgICAgICAgXCJ0YWlsd2luZC1tZXJnZVwiOiBcIl4yLjMuMFwiLFxuICAgICAgICBcInRhaWx3aW5kY3NzLWFuaW1hdGVcIjogXCJeMS4wLjdcIlxuICAgIH0sXG4gICAgXCJkZXZEZXBlbmRlbmNpZXNcIjoge1xuICAgICAgICBcIkBlc2xpbnQvY29tcGF0XCI6IFwiXjEuMS4xXCIsXG4gICAgICAgIFwiQGVzbGludC9qc1wiOiBcIl45LjcuMFwiLFxuICAgICAgICBcIkBwbGF5d3JpZ2h0L3Rlc3RcIjogXCJeMS40Mi4xXCIsXG4gICAgICAgIFwiQHR5cGVzL2J1blwiOiBcIl4xLjEuNlwiLFxuICAgICAgICBcIkB0eXBlcy9jc3MtdHJlZVwiOiBcIl4yLjMuOFwiLFxuICAgICAgICBcIkB0eXBlcy9jdWxvcmlcIjogXCJeMi4xLjBcIixcbiAgICAgICAgXCJAdHlwZXMvbG9jYWx0dW5uZWxcIjogXCJeMi4wLjRcIixcbiAgICAgICAgXCJAdHlwZXMvbG9kYXNoXCI6IFwiXjQuMTcuN1wiLFxuICAgICAgICBcIkB0eXBlcy9ub2RlXCI6IFwiXjIwLjE0LjlcIixcbiAgICAgICAgXCJAdHlwZXMvcmVhY3RcIjogXCJeMTguMi42NFwiLFxuICAgICAgICBcIkB0eXBlcy9yZWFjdC1kb21cIjogXCJeMTguMi4yMVwiLFxuICAgICAgICBcIkB2aXRlanMvcGx1Z2luLXJlYWN0XCI6IFwiXjQuMi4xXCIsXG4gICAgICAgIFwiYXV0b3ByZWZpeGVyXCI6IFwiXjEwLjQuMTlcIixcbiAgICAgICAgXCJjc3MtdHJlZVwiOiBcIl4yLjMuMVwiLFxuICAgICAgICBcImVsZWN0cm9uXCI6IFwiXjMxLjMuMVwiLFxuICAgICAgICBcImVsZWN0cm9uLWJ1aWxkZXJcIjogXCJeMjQuMTMuM1wiLFxuICAgICAgICBcImVzbGludFwiOiBcIjgueFwiLFxuICAgICAgICBcImVzbGludC1jb25maWctcHJldHRpZXJcIjogXCJeOS4xLjBcIixcbiAgICAgICAgXCJlc2xpbnQtcGx1Z2luLXJlYWN0XCI6IFwiXjcuMzQuM1wiLFxuICAgICAgICBcImdsb2JhbHNcIjogXCJeMTUuOC4wXCIsXG4gICAgICAgIFwiaHVza3lcIjogXCJeOC4wLjBcIixcbiAgICAgICAgXCJtb2J4XCI6IFwiXjYuMTIuNFwiLFxuICAgICAgICBcIm1vYngtcmVhY3QtbGl0ZVwiOiBcIl40LjAuN1wiLFxuICAgICAgICBcInBvc3Rjc3NcIjogXCJeOC40LjM4XCIsXG4gICAgICAgIFwicG9zdGNzcy1pbXBvcnRcIjogXCJeMTYuMC4xXCIsXG4gICAgICAgIFwicHJldHRpZXJcIjogXCJeMy4zLjJcIixcbiAgICAgICAgXCJyZWFjdFwiOiBcIl4xOC4yLjBcIixcbiAgICAgICAgXCJyZWFjdC1kb21cIjogXCJeMTguMi4wXCIsXG4gICAgICAgIFwidGFpbHdpbmRjc3NcIjogXCJeMy40LjRcIixcbiAgICAgICAgXCJ0eXBlc2NyaXB0XCI6IFwiXjUuNC4yXCIsXG4gICAgICAgIFwidHlwZXNjcmlwdC1lc2xpbnRcIjogXCJeNy4xNi4wXCIsXG4gICAgICAgIFwidml0ZVwiOiBcIl41LjEuNVwiLFxuICAgICAgICBcInZpdGUtcGx1Z2luLWVsZWN0cm9uXCI6IFwiXjAuMjguNFwiLFxuICAgICAgICBcInZpdGUtcGx1Z2luLWVsZWN0cm9uLXJlbmRlcmVyXCI6IFwiXjAuMTQuNVwiXG4gICAgfVxufVxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUE2UyxPQUFPLFdBQVc7QUFDL1QsU0FBUyxj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
