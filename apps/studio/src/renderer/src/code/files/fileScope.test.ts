import { describe, expect, it } from 'bun:test';
import { designKind, filesInScope } from './fileScope.js';

const FILES = [
  'src/Button.tsx',
  'src/theme.css',
  'docs/guide.md',
  'src/Button.test.tsx',
  'vite.config.ts',
  'package.json',
  'bun.lock',
  'src/util.ts',
  '.env',
];

describe('which files the design scope shows (ONL-2563)', () => {
  it('keeps a component, a stylesheet and a document', () => {
    const kept = filesInScope(FILES, 'design');
    expect(kept).toContain('src/Button.tsx');
    expect(kept).toContain('src/theme.css');
    expect(kept).toContain('docs/guide.md');
  });

  it('leaves out a test, a config and a lockfile', () => {
    const kept = filesInScope(FILES, 'design');
    expect(kept).not.toContain('src/Button.test.tsx');
    expect(kept).not.toContain('vite.config.ts');
    expect(kept).not.toContain('package.json');
    expect(kept).not.toContain('bun.lock');
  });

  it('shows every one of them in the all-files scope', () => {
    expect(filesInScope(FILES, 'all')).toEqual(FILES);
  });

  it('orders them styles, then components, then docs', () => {
    expect(filesInScope(FILES, 'design')).toEqual(['src/theme.css', 'src/Button.tsx', 'docs/guide.md']);
  });

  /* Plain app plumbing is not a design file, but it is not excluded from the
     project either — the other position of the switch is where it lives. */
  it('leaves out an ordinary module that is neither a style, a component nor a doc', () => {
    expect(filesInScope(FILES, 'design')).not.toContain('src/util.ts');
    expect(filesInScope(FILES, 'all')).toContain('src/util.ts');
  });
});

describe('what counts as a design file', () => {
  it('names each kind', () => {
    expect(designKind('a/b.css')).toBe('style');
    expect(designKind('a/B.tsx')).toBe('component');
    expect(designKind('a/b.mdx')).toBe('doc');
  });

  it('includes every supported image format, including uppercase extensions', () => {
    const images = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'ico', 'svg'].map((extension) => `public/photo.${extension}`);
    expect(filesInScope([...images, 'public/LOGO.PNG'], 'design')).toEqual([...images, 'public/LOGO.PNG'].sort((a, b) => a.localeCompare(b)));
    expect(designKind('public/logo.svg')).toBe('image');
    expect(designKind('src/__tests__/fixture.png')).toBeNull();
    expect(designKind('public/movie.mp4')).toBeNull();
  });

  it('is decided on the whole path, so a test inside a folder of components is still a test', () => {
    expect(designKind('src/__tests__/Button.tsx')).toBeNull();
    expect(designKind('src/Button.spec.tsx')).toBeNull();
  });

  it('is null for anything else', () => {
    expect(designKind('src/util.ts')).toBeNull();
  });
});
