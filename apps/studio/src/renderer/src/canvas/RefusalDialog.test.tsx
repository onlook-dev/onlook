import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { RefusalBody, RefusalDialog } from './RefusalDialog.js';
import { t } from '@studio/i18n';

const noop = (): void => undefined;

describe('the folder refusal dialog (ONL-2895)', () => {
  it('stays closed without a refusal', () => {
    expect(renderToStaticMarkup(<RefusalDialog refusal={undefined} isInline onDismiss={noop} />)).toBe('');
  });

  it('names and describes the dialog with its visible copy', () => {
    const markup = renderToStaticMarkup(<RefusalDialog refusal={{ reason: 'no-base-ref' }} isInline onDismiss={noop} />);
    const titleId = /aria-labelledby="([^"]+)"/.exec(markup)?.[1];
    const descriptionId = /aria-describedby="([^"]+)"/.exec(markup)?.[1];
    expect(titleId).toBeDefined();
    expect(descriptionId).toBeDefined();
    expect(markup).toContain(`id="${titleId}"`);
    expect(markup).toContain(`id="${descriptionId}"`);
    expect(markup).toContain(`${t('workspace.refused.noBaseRef.title')}</h2>`);
  });

  it('omits Details when there is nothing to quote', () => {
    const markup = renderToStaticMarkup(<RefusalBody refusal={{ reason: 'no-base-ref' }} onDismiss={noop} />);
    expect(markup).not.toContain('workspace-refused-detail');
    expect(markup).not.toContain(t('blank.create.failed.detailLabel'));
  });
  for (const [reason, title] of [
    ['already-copied', 'workspace.refused.alreadyCopied.title'],
    ['no-base-ref', 'workspace.refused.noBaseRef.title'],
    ['name-unavailable', 'workspace.refused.nameUnavailable.title'],
    ['nothing-to-copy', 'workspace.startFresh.title'],
  ] as const) {
    it(`${reason} has one focused, case-specific heading and no generic header`, () => {
      const markup = renderToStaticMarkup(<RefusalBody refusal={{ reason, projectName: 'Lemonade' }} onDismiss={noop} />);
      expect(markup.match(/<h[1-6]\b/g)).toHaveLength(1);
      expect(markup).toContain(`data-autofocus=""`);
      expect(markup).toContain(`${t(title, { projectName: 'Lemonade' })}</h2>`);
      expect(markup).not.toContain('astryx-layout-header');
    });
  }
  it('a folder with nothing to copy offers a blank project where the screen can make one', () => {
    const markup = renderToStaticMarkup(
      <RefusalBody refusal={{ reason: 'nothing-to-copy', folderName: 'my-new-site' }} onDismiss={noop} onCreateBlank={noop} />,
    );

    expect(markup).toContain('data-testid="workspace-start-fresh"');
    expect(markup).toContain('data-testid="workspace-start-blank"');
    expect(markup).toContain('data-testid="workspace-refused-dismiss"');
    expect(markup).not.toContain('data-testid="workspace-refused"');
  });

  it('without a blank create on the screen it offers only the way back', () => {
    const markup = renderToStaticMarkup(
      <RefusalBody refusal={{ reason: 'nothing-to-copy', folderName: 'my-new-site' }} onDismiss={noop} />,
    );

    expect(markup).not.toContain('data-testid="workspace-start-blank"');
    expect(markup).toContain('data-testid="workspace-refused-dismiss"');
  });

  it('every other refusal keeps its own body, its detail and Close, and never offers a blank project', () => {
    for (const reason of ['already-copied', 'no-base-ref', 'name-unavailable'] as const) {
      const markup = renderToStaticMarkup(
        <RefusalBody refusal={{ reason, detail: 'the detail', projectName: 'lemonade' }} onDismiss={noop} onCreateBlank={noop} />,
      );

      expect(markup).toContain('data-testid="workspace-refused"');
      expect(markup).toContain('data-testid="workspace-refused-detail"');
      expect(markup).toContain('data-testid="workspace-refused-dismiss"');
      expect(markup).not.toContain('data-testid="workspace-start-blank"');
    }
  });
});
