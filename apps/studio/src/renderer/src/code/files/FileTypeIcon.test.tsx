import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { FileTypeIcon, fileType } from './FileTypeIcon.js';

test('recognizes source, styles, documents and assets by their last extension', () => {
  for (const [path, type] of [
    ['src/routes/index.tsx', 'react'], ['Card.jsx', 'react'], ['types.d.ts', 'typescript'],
    ['worker.mjs', 'javascript'], ['theme.module.CSS', 'stylesheet'], ['README.md', 'markdown'],
    ['guide.mdx', 'markdown'], ['package.json', 'data'], ['config.yml', 'data'],
    ['index.html', 'html'], ['logo.svg', 'image'], ['photo.webp', 'image'],
  ] as const) expect(fileType(path)).toBe(type);
});

test('unknown, extensionless and dotfiles retain the generic file icon', () => {
  for (const path of ['LICENSE', '.gitignore', 'src.ts/unknown', 'archive.bin', 'README']) {
    expect(fileType(path)).toBe('file');
  }
});

test('type glyphs are decorative and do not add a second file label', () => {
  const html = renderToStaticMarkup(<FileTypeIcon path="Card.tsx" />);
  expect(html).toContain('aria-hidden="true"');
  expect(html).toContain('data-file-type="react"');
  expect(html).not.toContain('<title>');
});
