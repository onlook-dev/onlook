import type { StorybookConfig } from "@storybook/nextjs-vite";

import { dirname, join, relative } from "path"

import { fileURLToPath } from "url"
import { existsSync } from "fs"

/**
* This function is used to resolve the absolute path of a package.
* It is needed in projects that use Yarn PnP or are set up within a monorepo.
*/
function getAbsolutePath(value: string): any {
  return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)))
}

/**
* Find the git repository root by walking up the directory tree
*/
function findGitRoot(startPath: string): string | null {
  let currentPath = startPath;

  while (currentPath !== dirname(currentPath)) {
    if (existsSync(join(currentPath, '.git'))) {
      return currentPath;
    }
    currentPath = dirname(currentPath);
  }

  return null;
}
const config: StorybookConfig = {
  "stories": [
    "../src/**/*.mdx",
    "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  "addons": [
    getAbsolutePath('@chromatic-com/storybook'),
    getAbsolutePath('@storybook/addon-docs'),
    getAbsolutePath('@storybook/addon-onboarding'),
    getAbsolutePath("@storybook/addon-a11y"),
    getAbsolutePath("@storybook/addon-vitest")
  ],
  "framework": {
    "name": getAbsolutePath("@storybook/nextjs-vite"),
    "options": {}
  },
  "staticDirs": [
    "../public"
  ],
  async viteFinal(config) {
    const { mergeConfig } = await import('vite');

    const __dirname = dirname(fileURLToPath(import.meta.url));
    const storybookDir = join(__dirname, '..');
    const gitRoot = findGitRoot(storybookDir);
    const storybookLocation = gitRoot ? relative(gitRoot, storybookDir) : '';

    return mergeConfig(config, {
      define: {
        'process.env': '{}',
        'process': '{"env": {}}',
      },
      resolve: {
        alias: {
          '@/utils/supabase/client': fileURLToPath(
            new URL('./mocks/supabase-client.ts', import.meta.url)
          ),
          '@/trpc/react': fileURLToPath(
            new URL('./mocks/trpc-react.tsx', import.meta.url)
          ),
          '~/trpc/react': fileURLToPath(
            new URL('./mocks/trpc-react.tsx', import.meta.url)
          ),
        },
      },
      plugins: [
        {
          name: 'onbook-metadata',
          configureServer(server) {
            // Serve metadata in dev mode
            server.middlewares.use((req, res, next) => {
              if (req.url === '/onbook-metadata.json') {
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.end(JSON.stringify({ storybookLocation }));
                return;
              }
              next();
            });
          },
          configurePreviewServer(server) {
            // Serve metadata in preview/build mode (for Chromatic)
            server.middlewares.use((req, res, next) => {
              if (req.url === '/onbook-metadata.json') {
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.end(JSON.stringify({ storybookLocation }));
                return;
              }
              next();
            });
          },
        },
      ],
    });
  },
};
export default config;