// Declaration order is precedence: a Svelte or Vue app on Vite is named for the framework. A trailing `/` in `match` matches a scope.
const FRAMEWORKS = {
  'Next.js': { match: 'next', defaultPort: 3000 },
  Remix: { match: '@remix-run/', defaultPort: 3000 },
  Gatsby: { match: 'gatsby', defaultPort: 8000 },
  Astro: { match: 'astro', defaultPort: 4321 },
  SvelteKit: { match: '@sveltejs/kit', defaultPort: 5173 },
  Svelte: { match: 'svelte', defaultPort: 5173 },
  Nuxt: { match: 'nuxt', defaultPort: 3000 },
  Vue: { match: 'vue', defaultPort: 5173 },
  Angular: { match: '@angular/core', defaultPort: 4200 },
  Solid: { match: 'solid-js', defaultPort: 3000 },
  Vite: { match: 'vite', defaultPort: 5173 },
} as const satisfies Record<string, { match: string; defaultPort: number }>;

export type FrameworkName = keyof typeof FRAMEWORKS;

const FRAMEWORK_NAMES = Object.keys(FRAMEWORKS) as FrameworkName[];

function isFrameworkName(name: string): name is FrameworkName {
  return Object.hasOwn(FRAMEWORKS, name);
}

export function frameworkDefaultPort(framework: string | undefined): number | undefined {
  return framework !== undefined && isFrameworkName(framework) ? FRAMEWORKS[framework].defaultPort : undefined;
}

export function frameworkFromManifest(parsed: unknown): FrameworkName | undefined {
  if (typeof parsed !== 'object' || parsed === null) return undefined;
  const manifest = parsed as Record<string, unknown>;
  const names = new Set([...depNames(manifest['dependencies']), ...depNames(manifest['devDependencies'])]);
  return FRAMEWORK_NAMES.find((name) => {
    const dep = FRAMEWORKS[name].match;
    return dep.endsWith('/') ? [...names].some((installed) => installed.startsWith(dep)) : names.has(dep);
  });
}

function depNames(field: unknown): string[] {
  return typeof field === 'object' && field !== null ? Object.keys(field) : [];
}

const ELECTRON_DEPS = ['electron', 'electron-vite'] as const;

/** A desktop app whose window is not a page a Frame can load, whichever bundler serves its renderer (ONL-2960). */
export function isElectronManifest(parsed: unknown): boolean {
  if (typeof parsed !== 'object' || parsed === null) return false;
  const manifest = parsed as Record<string, unknown>;
  const names = new Set([...depNames(manifest['dependencies']), ...depNames(manifest['devDependencies'])]);
  return ELECTRON_DEPS.some((dep) => names.has(dep));
}
