import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { PenRow } from './PenRow.js';

describe('a queued prompt with attachments (ONL-2485)', () => {
  it('renders its attachment shelf beside the queued text', () => {
    const markup = renderToStaticMarkup(
      <PenRow
        pen={{ penId: 1, text: 'Match this image' }}
        strings={{ labels: { working: 'Queued', question: 'Queued', 'not-sent': 'Queued' }, takeLabel: 'Edit', discardLabel: 'Discard', attachmentsOnly: () => 'An attachment' }}
        actions={{ onTake: () => {}, onDiscard: () => {} }}
        icons={{ edit: null, discard: null }}
        isLive
        needsAttention={false}
        attachments={<span data-testid="queued-image">Image</span>}
      />,
    );
    expect(markup).toContain('data-testid="queued-image"');
    expect(markup).toContain('Match this image');
    expect(markup).toContain('--studio-submitted-attachments-fade: transparent');
  });
});
