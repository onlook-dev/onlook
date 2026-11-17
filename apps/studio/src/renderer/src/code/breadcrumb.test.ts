import { describe, expect, it } from 'bun:test';

import { breadcrumb, CRUMB_GAP, fileName } from './breadcrumb.js';

const PATH = 'apps/studio/src/renderer/src/code/CodePanel.tsx';
/** Wider than any path this suite spends, so nothing collapses for want of room. */
const ROOMY = 10_000;

describe('the header’s path', () => {
  it('puts the project at the root rather than the path’s first folder', () => {
    const crumb = breadcrumb('acme-shop', PATH, ROOMY);

    expect(crumb.root).toBe('acme-shop');
    expect(crumb.crumbs.map((c) => c.text)).not.toContain('acme-shop');
  });

  it('ends on the file, and draws every folder between it and the root', () => {
    const crumb = breadcrumb('acme-shop', PATH, ROOMY);

    expect(crumb.crumbs.map((c) => c.text)).toEqual([
      'apps',
      'studio',
      'src',
      'renderer',
      'src',
      'code',
      'CodePanel.tsx',
    ]);
    expect(crumb.crumbs[crumb.crumbs.length - 1]?.kind).toBe('file');
  });

  it('collapses the middle to one gap when the path outgrows its budget', () => {
    const crumb = breadcrumb('acme-shop', PATH, 240);
    const texts = crumb.crumbs.map((c) => c.text);

    expect(texts.filter((text) => text === CRUMB_GAP)).toHaveLength(1);
    expect(texts[0]).toBe(CRUMB_GAP);
    expect(texts.length).toBeLessThan(7);
  });

  it('keeps the folders it draws whole and the file entire, however narrow', () => {
    const crumb = breadcrumb('acme-shop', PATH, 120);
    const folders = ['apps', 'studio', 'src', 'renderer', 'code'];

    for (const crumbPart of crumb.crumbs) {
      if (crumbPart.kind === 'folder') expect(folders).toContain(crumbPart.text);
    }
    expect(crumb.crumbs[crumb.crumbs.length - 1]?.text).toBe('CodePanel.tsx');
  });

  it('keeps the folders nearest the file, which is the part that says where it is', () => {
    const crumb = breadcrumb('acme-shop', PATH, 320);
    const folders = crumb.crumbs.filter((c) => c.kind === 'folder').map((c) => c.text);

    expect(folders[folders.length - 1]).toBe('code');
  });

  it('draws no gap for a file at the project’s own root', () => {
    const crumb = breadcrumb('acme-shop', 'README.md', 120);

    expect(crumb.crumbs).toEqual([{ kind: 'file', text: 'README.md' }]);
  });
});

describe('a tab’s label', () => {
  it('is the file’s own name, not its path', () => {
    expect(fileName(PATH)).toBe('CodePanel.tsx');
    expect(fileName('README.md')).toBe('README.md');
  });
});
