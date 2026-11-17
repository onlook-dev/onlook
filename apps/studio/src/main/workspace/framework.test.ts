import { describe, expect, it } from 'bun:test';
import { frameworkFromManifest, isElectronManifest } from './framework.js';

describe('frameworkFromManifest', () => {
  it('names a known framework from either dependency block', () => {
    expect(frameworkFromManifest({ dependencies: { next: '15', react: '19' } })).toBe('Next.js');
    expect(frameworkFromManifest({ devDependencies: { vite: '6' } })).toBe('Vite');
  });

  it('prefers the framework over its build tool, and matches a scope', () => {
    expect(frameworkFromManifest({ dependencies: { svelte: '5' }, devDependencies: { vite: '6' } })).toBe('Svelte');
    expect(frameworkFromManifest({ devDependencies: { '@sveltejs/kit': '2', svelte: '5', vite: '6' } })).toBe('SvelteKit');
    expect(frameworkFromManifest({ dependencies: { '@remix-run/react': '2' } })).toBe('Remix');
  });

  it('names nothing for an unknown stack or a manifest that is not an object', () => {
    expect(frameworkFromManifest({ dependencies: { express: '4', react: '19' } })).toBeUndefined();
    expect(frameworkFromManifest(null)).toBeUndefined();
    expect(frameworkFromManifest('{ not json')).toBeUndefined();
    expect(frameworkFromManifest(undefined)).toBeUndefined();
  });
});

describe('isElectronManifest', () => {
  it('recognises an Electron app from electron or electron-vite in either block, even when it also reads as Vite', () => {
    const studio = { devDependencies: { electron: '43', 'electron-vite': '4', vite: '7' } };
    expect(isElectronManifest(studio)).toBe(true);
    expect(frameworkFromManifest(studio)).toBe('Vite');
    expect(isElectronManifest({ dependencies: { 'electron-vite': '4' } })).toBe(true);
  });

  it('does not take a web app, or a package named like Electron, for one', () => {
    expect(isElectronManifest({ devDependencies: { vite: '7', 'electron-to-chromium': '1' } })).toBe(false);
    expect(isElectronManifest(null)).toBe(false);
  });
});
