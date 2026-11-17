import { describe, expect, it } from 'bun:test';
import { suggestedFiles, SUGGESTED_LIMIT } from './suggested.js';

const FILES = [
  'src/styles/tokens.css',
  'src/components/Button.tsx',
  'src/components/Card.tsx',
  'src/routes/checkout/page.tsx',
  'README.md',
  'package.json',
  'src/util/clamp.test.ts',
];

describe('what a designer is offered before they search (ONL-2563)', () => {
  it('leads with the file the selection mapped to', () => {
    const out = suggestedFiles({ files: FILES, mappedFile: 'src/routes/checkout/page.tsx' });
    expect(out[0]).toBe('src/routes/checkout/page.tsx');
  });

  it('puts the component’s own definition after it, then what they import', () => {
    const out = suggestedFiles({
      files: FILES,
      mappedFile: 'src/routes/checkout/page.tsx',
      componentFile: 'src/components/Button.tsx',
      related: ['src/styles/tokens.css'],
    });
    expect(out.slice(0, 3)).toEqual([
      'src/routes/checkout/page.tsx',
      'src/components/Button.tsx',
      'src/styles/tokens.css',
    ]);
  });

  /* With no mapping there is still a useful answer: the design files, in the
     order the scope switch returns them. */
  it('falls back to design files when nothing is selected', () => {
    const out = suggestedFiles({ files: FILES });
    expect(out).toContain('src/styles/tokens.css');
    expect(out).toContain('src/components/Button.tsx');
  });

  it('offers no config, lockfile or test, in either position', () => {
    const out = suggestedFiles({ files: FILES });
    expect(out).not.toContain('package.json');
    expect(out).not.toContain('src/util/clamp.test.ts');
  });

  /* The mapper names a path from page content; a file the walk never returned
     is not something to put on screen. */
  it('drops a file the project does not have', () => {
    const out = suggestedFiles({ files: FILES, mappedFile: 'src/Ghost.tsx' });
    expect(out).not.toContain('src/Ghost.tsx');
  });

  it('names each file once, however many ways it was suggested', () => {
    const out = suggestedFiles({
      files: FILES,
      mappedFile: 'src/components/Button.tsx',
      componentFile: 'src/components/Button.tsx',
      related: ['src/components/Button.tsx'],
    });
    expect(out.filter((path) => path === 'src/components/Button.tsx')).toHaveLength(1);
  });

  it('stops before it becomes a second tree', () => {
    const many = Array.from({ length: 40 }, (_, index) => `src/c/File${String(index)}.tsx`);
    expect(suggestedFiles({ files: many })).toHaveLength(SUGGESTED_LIMIT);
  });

  /* The selection's own files outrank the cap: a mapping the designer just made
     must not be pushed off by six stylesheets. */
  it('keeps the selection’s own files even past the design fill', () => {
    const many = Array.from({ length: 40 }, (_, index) => `src/c/File${String(index)}.tsx`);
    const out = suggestedFiles({ files: [...many, 'src/Hero.tsx'], mappedFile: 'src/Hero.tsx' });
    expect(out[0]).toBe('src/Hero.tsx');
  });
});
