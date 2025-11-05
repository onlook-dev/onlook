import type { StorybookConfig } from "@storybook/nextjs-vite";

import { dirname, join, relative } from "path"

import { fileURLToPath } from "url"
import { existsSync, writeFileSync } from "fs"

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

/**
* Generate onbook metadata file with repository information
*/
function generateOnbookMetadata() {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const storybookDir = join(__dirname, '..');
  const gitRoot = findGitRoot(storybookDir);

  if (!gitRoot) {
    console.warn('Could not find git root for onbook metadata');
    return;
  }

  const storybookLocation = relative(gitRoot, storybookDir);

  const metadata = {
    // Relative path from git root to storybook directory
    // e.g., "apps/web/client"
    storybookLocation,
  };

  const outputPath = join(storybookDir, 'public', 'onbook-metadata.json');
  writeFileSync(outputPath, JSON.stringify(metadata, null, 2));
  console.log('✓ Generated onbook metadata:', outputPath);
}

// Generate metadata on startup
generateOnbookMetadata();
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
    });
  },
};
export default config;