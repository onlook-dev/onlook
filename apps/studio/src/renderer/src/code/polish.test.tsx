import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { CodePanel } from './CodePanel.js';
import { SelectionLabel } from './SelectionLabel.js';
import { FilesView } from './files/FilesView.js';
import { tintLabel } from './tintLabel.js';

const noop = (): void => undefined;

describe('code panel polish', () => {
  it('keeps the project name prominent and path labels in the supporting line box', () => {
    const markup = renderToStaticMarkup(
      <CodePanel projectName="Shop project" repositoryName="shop" tabs={[{ path: 'src/shop.css', name: 'shop.css', isDirty: false }]}
        activePath="src/shop.css" refusal={null} isBrowsing={false} onActivate={noop}
        onClose={noop} onBrowse={noop} body={<div>Code</div>} />,
    );
    const row = markup.slice(markup.indexOf('data-testid="code-breadcrumb"'), markup.indexOf('data-testid="code-browse-toggle"'));
    expect(row).toBeDefined();
    expect(row?.match(/data-type="supporting"/g)).toHaveLength(5);
    expect(row).not.toContain('data-type="body"');
    expect(markup).toContain('Shop project');
    expect(row).toContain('shop');
    expect(row).not.toContain('font-size:var(--text-supporting-size)');
  });

  it('keeps the project name static and gives browsing its own button', () => {
    const markup = renderToStaticMarkup(
      <CodePanel projectName="shop" tabs={[]} activePath={null} refusal={null} isBrowsing
        onActivate={noop} onClose={noop} onBrowse={noop} body={<div>Files</div>} />,
    );
    const root = markup.match(/<span[^>]*data-testid="code-breadcrumb-root"[^>]*>/)?.[0];
    expect(root).toBeDefined();
    expect(root).not.toContain('margin-inline:calc(var(--spacing-1) * -1)');
    expect(root).not.toContain('cursor:pointer');
    expect(root).not.toContain('aria-haspopup');
    expect(markup).toContain('data-testid="code-browse-toggle"');
    expect(markup).toContain('aria-label="Browse files"');
    expect(markup).not.toContain('data-testid="code-search-toggle"');
  });

  it('applies the selected file scope to both search groups and keeps line destinations', () => {
    const props = {
      files: [], onScope: noop, query: 'test', onQuery: noop, isSearching: false,
      openPath: null, onOpen: noop,
      names: ['src/Card.tsx', 'src/Card.test.tsx'],
      contents: [
        { path: 'src/Card.tsx', lines: [{ line: 42, column: 0, text: 'const title = "test";' }], total: 1 },
        { path: 'bun.lock', lines: [{ line: 10, column: 0, text: '"test": "1"' }], total: 1 },
      ],
    };
    const design = renderToStaticMarkup(<FilesView {...props} scope="design" />);
    expect(design).toContain('data-line="42"');
    expect(design).toContain('code-search-line-number');
    expect(design).not.toContain('data-path="src/Card.test.tsx"');
    expect(design).not.toContain('data-path="bun.lock"');
    const all = renderToStaticMarkup(<FilesView {...props} scope="all" />);
    expect(all).toContain('data-path="src/Card.test.tsx"');
    expect(all).toContain('data-path="bun.lock"');
  });

  it('names the selection source when the designer is looking at a different file', () => {
    const source = { path: 'src/Hero.jsx', line: 14, column: 3, via: 'name-search' as const };
    const label = tintLabel({ mapping: { ...source, grade: 'best-guess', definition: null,
      component: 'Hero', others: [], uses: 0, produced: 1, producedComplete: true }, isStale: false });
    const markup = renderToStaticMarkup(<SelectionLabel label={label} others={[]} sourceElsewhere={source} onOpen={noop} />);
    expect(markup).toContain('Possible source: src/Hero.jsx:14:3');
    expect(markup).toContain('Verified source unavailable. These are possible matches.');
    expect(markup).toContain('data-confidence="code.tint.guess"');
  });
  it('shows a repeated image source as verified with a separate edit-reach warning', () => {
    const source = { path: 'src/components/plant-photo.tsx', line: 46, column: 11, via: 'owner-stack' as const };
    const label = tintLabel({ mapping: { ...source, grade: 'exact', definition: null,
      component: 'PlantPhoto', others: [], uses: 0, produced: 2, producedComplete: true }, isStale: false });
    const markup = renderToStaticMarkup(<SelectionLabel label={label} others={[]} sourceElsewhere={source} onOpen={noop} />);
    expect(markup).toContain('Source: src/components/plant-photo.tsx:46:11');
    expect(markup).toContain('Element source.');
    expect(markup).toContain('Editing this code may affect 2 elements.');
    expect(markup).toContain('2 elements');
    expect(markup).not.toContain('data-testid="code-tint-confidence"');
    expect(markup).not.toContain('probably');
    expect(markup).not.toContain('Possible source');
  });

  it('words a verified component call site separately from the element source', () => {
    const source = { path: 'src/App.tsx', line: 10, column: 3, via: 'component-stack' as const };
    const label = tintLabel({ mapping: { ...source, grade: 'likely', definition: null,
      component: 'Photo', others: [], uses: 0, produced: 1, producedComplete: false }, isStale: false });
    const markup = renderToStaticMarkup(<SelectionLabel label={label} others={[]} sourceElsewhere={source} onOpen={noop} />);
    expect(markup).toContain('Component call site.');
    expect(markup).toContain('Call site: src/App.tsx:10:3');
    expect(markup).not.toContain('Possible source');
  });

  it('temporarily replaces open tabs while browsing files', () => {
    const markup = renderToStaticMarkup(
      <CodePanel projectName="shop" tabs={[{ path: 'src/a.ts', name: 'a.ts', isDirty: false }]}
        activePath="src/a.ts" refusal={null} isBrowsing onActivate={noop} onClose={noop}
        onBrowse={noop} body={<div>Files</div>} />,
    );
    expect(markup).not.toContain('role="tablist"');
  });

  it('distinguishes alternative locations and only removes exact duplicates', () => {
    const candidate = { path: 'src/flow.html', line: 12, column: 3, via: 'element-search' as const };
    const markup = renderToStaticMarkup(
      <SelectionLabel label={tintLabel({ mapping: { ...candidate, grade: 'best-guess', definition: null,
        component: null, others: [candidate], uses: 0, produced: 0, producedComplete: false }, isStale: false })}
        others={[candidate, candidate, { ...candidate, line: 30 }, { ...candidate, column: 8 },
          { ...candidate, path: 'examples/flow.html' }]}
        onOpen={noop} />,
    );
    expect(markup).toContain('+4 matches');
    expect(markup).toContain('aria-haspopup="menu"');
    expect(markup).toContain('aria-expanded="false"');
  });

  it('offers the app close glyph as search clear, rather than a native cancel control', () => {
    const markup = renderToStaticMarkup(
      <FilesView files={[]} scope="all" onScope={noop} query="flow" onQuery={noop}
        names={[]} contents={[]} isSearching={false} openPath={null} onOpen={noop} />,
    );
    expect(markup).not.toContain('type="search"');
    expect(markup).toContain('data-testid="code-files-clear"');
  });
});
