import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { MAX_PROJECT_TABS } from '@studio/events';
import { t } from '@studio/i18n';
import { OpenRefusalDialog } from './OpenRefusalDialog.js';

describe('opening a project is refused', () => {
  it('stays closed without a refusal', () => {
    expect(renderToStaticMarkup(<OpenRefusalDialog reason={null} isInline onDismiss={() => {}} />)).toBe('');
  });

  for (const [reason, body] of [
    ['at-limit', t('tabs.newAtLimit', { max: MAX_PROJECT_TABS })],
    ['unknown-project', t('projects.open.unknown')],
    ['workspace-missing', t('projects.open.missing')],
    ['removing', t('projects.open.removing')],
    ['failed', t('projects.open.failed')],
  ] as const) {
    it(`explains ${reason} with a way forward and an accessible dismissal`, () => {
      const markup = renderToStaticMarkup(<OpenRefusalDialog reason={reason} isInline onDismiss={() => {}} />);
      expect(markup).toContain(body);
      expect(markup).toContain('data-testid="project-open-dismiss"');
      const titleId = /aria-labelledby="([^"]+)"/.exec(markup)?.[1];
      const descriptionId = /aria-describedby="([^"]+)"/.exec(markup)?.[1];
      expect(titleId).toBeDefined();
      expect(descriptionId).toBeDefined();
      expect(markup).toContain(`id="${titleId}"`);
      expect(markup).toContain(`id="${descriptionId}"`);
      expect(markup).not.toContain('undefined');
    });
  }
});
