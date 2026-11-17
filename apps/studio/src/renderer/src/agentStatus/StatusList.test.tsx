import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';

import { COLLAPSED, createCollapseStore, type CollapseState } from './collapse.js';
import type { StatusLine } from './lines.js';
import { StatusList } from './StatusList.js';

const line = (frameId: string): StatusLine => ({ key: `frame:${frameId}`, state: 'done', target: { kind: 'frame', frameId }, before: 'Rewrote ', subject: 'Home’s', after: ' headline' });
const LINES = [line('fr_1'), line('fr_2'), line('fr_3')];

const render = (collapse: CollapseState): string =>
  renderToStaticMarkup(<StatusList lines={LINES} collapse={collapse} actions={createCollapseStore().getState()} onOpen={() => undefined} />);

describe('the collapsed status list', () => {
  it('seats the count after the list of rolling rows, inside none of them, so a new first line never carries it away', () => {
    const markup = render(COLLAPSED);
    const list = markup.slice(markup.indexOf('<section'), markup.indexOf('</section>'));
    expect(list).toContain('data-row=');
    expect(list).not.toContain('data-more');
    const rest = markup.slice(markup.indexOf('</section>'));
    const count = rest.match(/<button\b[^>]*data-more[^>]*>/)?.[0];
    expect(count).toBeDefined();
    expect(count).toContain('aria-expanded="false"');
    expect(count).toContain(`aria-controls="${/<section[^>]*\bid="([^"]+)"/.exec(markup)![1]!}"`);
  });

  it('draws no count while open, nor while the fold is still leaving', () => {
    expect(render({ ...COLLAPSED, open: true, shut: false })).not.toContain('data-more');
    expect(render({ ...COLLAPSED, shut: false, intent: 'fold' })).not.toContain('data-more');
  });
});
