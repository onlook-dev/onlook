import { expect, it, spyOn } from 'bun:test';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ArtifactList } from './ArtifactList.js';
import { ArtifactExportMenu, ArtifactExportStatus } from './ArtifactExportMenu.js';
it('mounts all menu actions on first opening and retains them while the menu closes', () => {
  const artifact = { id: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa', title: 'Shop', updatedAt: 'one', pagePath: 'pages/index.html', readOnly: false };
  for (const open of [true, false]) {
    const values = [open, true];
    const state = spyOn(React, 'useState').mockImplementation(() => [values.shift(), () => {}]);
    let menu: React.JSX.Element;
    try {
      menu = ArtifactExportMenu({ artifact, exporting: false, onSave: () => {}, onDelete: () => {}, onRename: () => {} });
    } finally {
      state.mockRestore();
    }
    const markup = renderToStaticMarkup(menu);
    expect(markup).toContain('Rename artifact');
    expect(markup).toContain('Export HTML');
    expect(markup).toContain('Export PDF');
    expect(markup).toContain('Delete artifact');
    expect(markup).toContain('Export PNG 1x');
    expect(markup).toContain('Export PNG 2x');
    expect(markup).toContain('Export JPEG');
    expect(markup.match(/role="menuitem"/g)).toHaveLength(7);
  }
});
it('puts named icon actions beside, never inside, the thumbnail button and keeps whole-artifact actions unique', () => {
  const markup = renderToStaticMarkup(<ArtifactList records={[{id:'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',title:'Shop',updatedAt:'one',pagePath:'pages/index.html',readOnly:false,pages:[{path:'pages/index.html',name:'Home'}]}]} onPlace={() => {}} />);
  expect(markup.match(/data-testid="artifact-page-actions"/g)).toHaveLength(1);
  expect(markup.indexOf('artifact-page-actions')).toBeGreaterThan(markup.indexOf('</button>'));
  expect(markup).toContain('>Add to canvas<');
  expect(markup).toContain('aria-haspopup="menu"');
  let depth = 0;
  for (const match of markup.matchAll(/<\/?button\b[^>]*>/g)) {
    if (match[0].startsWith('</')) depth -= 1;
    else { expect(depth).toBe(0); depth += 1; }
  }
  expect(depth).toBe(0);
});
it('keeps busy/cancel/refusal/saved feedback outside the hover-only controls', () => {
  expect(renderToStaticMarkup(<ArtifactExportStatus exporting result={null} />)).toContain('Preparing export');
  expect(renderToStaticMarkup(<ArtifactExportStatus exporting={false} result={{outcome:'cancelled'}} />)).toContain('Export cancelled');
  expect(renderToStaticMarkup(<ArtifactExportStatus exporting={false} result={{outcome:'refused',reason:'Private details'}} />)).toContain('role="alert"');
  expect(renderToStaticMarkup(<ArtifactExportStatus exporting={false} result={{outcome:'saved',name:'Idea.pdf'}} />)).toContain('Saved Idea.pdf');
});
