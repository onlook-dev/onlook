import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { t } from '@studio/i18n';
import { BlankCreateFailedDialog } from './BlankCreateModal.js';

const noop = (): void => {};

function failed(): string {
  return renderToStaticMarkup(
    <BlankCreateFailedDialog
      failure={{ stage: 'starting', detail: 'Error: starter exited (code 0) before it was ready' }}
      isInline
      onRetry={noop}
      onClose={noop}
    />,
  );
}

function titled(markup: string): string[] {
  return [...markup.matchAll(/id="([^"]+)"[^>]*>([^<]*)</g)]
    .filter(([, , text]) => text === t('blank.create.failed.title'))
    .map(([, id]) => id);
}

describe('the Blank Draft failure dialog (ONL-3085)', () => {
  it('explains missing Git without raw output or an unhelpful retry', () => {
    const markup = renderToStaticMarkup(
      <BlankCreateFailedDialog failure={{ stage: 'setting-up', cause: 'git_not_found', detail: 'Host executable not found in trusted PATH' }} isInline onRetry={noop} onClose={noop} />,
    );
    expect(markup).toContain(t('machine.failure.git_not_found'));
    expect(markup).not.toContain('Host executable not found');
    expect(markup).not.toContain('blank-create-retry');
    expect(markup).toContain('blank-create-dismiss');
  });
  it('states its title once, so the card reads as one piece', () => {
    expect(failed().split(t('blank.create.failed.title')).length - 1).toBe(1);
    expect(failed().match(/<h[1-6]\b/g)).toHaveLength(1);
  });

  it('is named by the title it shows, and renders no header to supply a second one', () => {
    const markup = failed();
    const ids = titled(markup);
    expect(ids).toHaveLength(1);
    expect(/aria-labelledby="([^"]+)"/.exec(markup)?.[1]).toBe(ids[0]);
    expect(markup).not.toContain('astryx-layout-header');
  });

  it('keeps a way out and a way back for a failure with nothing to quote', () => {
    const markup = renderToStaticMarkup(
      <BlankCreateFailedDialog failure={{ stage: 'installing' }} isInline onRetry={noop} onClose={noop} />,
    );
    expect(markup).toContain('blank-create-retry');
    expect(markup).toContain('blank-create-dismiss');
    // The shared body is also the folder and import refusals, which pass no explanation (ONL-3188).
    expect(markup).not.toContain('blank-create-explanation');
  });

  it('reads what the computer needs as prose, above what the machine reported (ONL-3111)', () => {
    const explanation = t('machine.failure.developer_tools_missing');
    const markup = renderToStaticMarkup(
      <BlankCreateFailedDialog failure={{ stage: 'setting-up', explanation, detail: 'fatal: no developer tools' }} isInline onRetry={noop} onClose={noop} />,
    );
    const prose = markup.indexOf(explanation);
    expect(prose).toBeGreaterThan(-1);
    // Before the quoted report, and outside it: guidance is not machine output.
    expect(prose).toBeLessThan(markup.indexOf('fatal: no developer tools'));
    expect(markup.slice(0, prose)).not.toContain('<code');
    expect(markup.slice(0, prose)).not.toContain('<pre');
  });

  it('keeps two failed checks as two paragraphs', () => {
    const both = `${t('machine.failure.developer_tools_missing')}\n\n${t('machine.failure.no_free_port')}`;
    const markup = renderToStaticMarkup(
      <BlankCreateFailedDialog failure={{ stage: 'setting-up', explanation: both }} isInline onRetry={noop} onClose={noop} />,
    );
    // The whole joined string, so rendering only its first paragraph fails here.
    expect(markup).toContain(both);
    const opening = /<[^>]*data-testid="blank-create-explanation"[^>]*>/.exec(markup)?.[0] ?? '';
    expect(opening).toContain('white-space:pre-wrap');
  });

  it('stays shut until a creation fails', () => {
    expect(renderToStaticMarkup(
      <BlankCreateFailedDialog failure={null} isInline onRetry={noop} onClose={noop} />,
    )).toBe('');
  });
});
