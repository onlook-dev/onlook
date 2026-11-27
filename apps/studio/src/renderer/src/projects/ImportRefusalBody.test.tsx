import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ProjectImportRefusalReason } from '@studio/events';
import { t, type StringKey } from '@studio/i18n';
import { ImportRefusalBody, ImportRefusalDialog } from './ImportRefusalBody.js';

const REASONS: ProjectImportRefusalReason[] = [
  'not-a-repository',
  'repository-gone',
  'is-the-repository',
  'inside-a-project',
  'already-a-project',
  'busy',
  'being-cleaned-up',
  'fields-incomplete',
  'runtime-unavailable',
];

const TITLES: Record<ProjectImportRefusalReason, StringKey> = {
  'runtime-unavailable': 'machine.wsl.unavailable.title',
  'not-a-repository': 'projects.import.refused.notARepository.title',
  'repository-gone': 'projects.import.refused.repositoryGone.title',
  'is-the-repository': 'projects.import.refused.isTheRepository.title',
  'inside-a-project': 'projects.import.refused.insideAProject.title',
  'already-a-project': 'projects.import.refused.alreadyAProject.title',
  busy: 'projects.import.refused.busy.title',
  'being-cleaned-up': 'projects.import.refused.beingCleanedUp.title',
  'fields-incomplete': 'projects.import.refused.fieldsIncomplete.title',
};

describe('the import refusal dialog (ONL-2522)', () => {
  it('shows WSL diagnostics in the same failure card', () => {
    const markup = renderToStaticMarkup(<ImportRefusalDialog reason="runtime-unavailable" detail="Git is unavailable in Ubuntu" isInline onDismiss={() => {}} />);
    expect(markup).toContain('import-refused-detail');
    expect(markup).toContain('Git is unavailable in Ubuntu');
    expect(markup).toContain(t('machine.wsl.unavailable.title'));
  });

  it('reads the WSL diagnosis as prose, so its words stay whole (ONL-3395)', () => {
    const diagnosis = t('machine.wsl.toolsUnavailable', { tools: 'git, node', distro: 'Ubuntu' });
    const markup = renderToStaticMarkup(<ImportRefusalDialog reason="runtime-unavailable" detail={diagnosis} isInline onDismiss={() => {}} />);
    const prose = markup.indexOf(diagnosis);
    expect(prose).toBeGreaterThan(-1);
    expect(markup).not.toContain(t('blank.create.failed.detailLabel'));
    expect(markup.slice(0, prose)).not.toContain('<code');
    expect(markup.slice(0, prose)).not.toContain('<pre');
    const opening = /<[^>]*data-testid="import-refused-detail"[^>]*>/.exec(markup)?.[0] ?? '';
    expect(opening).toContain('overflow-wrap:anywhere');
  });

  it('quotes a machine report in its own block', () => {
    const markup = renderToStaticMarkup(<ImportRefusalDialog reason="not-a-repository" detail="fatal: not a git repository" isInline onDismiss={() => {}} />);
    expect(markup).toContain(t('blank.create.failed.detailLabel'));
    expect(markup).toContain('fatal: not a git repository');
  });
  it('stays closed without a refusal', () => {
    expect(renderToStaticMarkup(<ImportRefusalDialog reason={null} isInline onDismiss={() => {}} />)).toBe('');
  });

  it('names and describes the dialog with its visible copy', () => {
    const markup = renderToStaticMarkup(<ImportRefusalDialog reason="busy" isInline onDismiss={() => {}} />);
    const titleId = /aria-labelledby="([^"]+)"/.exec(markup)?.[1];
    const descriptionId = /aria-describedby="([^"]+)"/.exec(markup)?.[1];
    expect(titleId).toBeDefined();
    expect(descriptionId).toBeDefined();
    expect(markup).toContain(`id="${titleId}"`);
    expect(markup).toContain(`id="${descriptionId}"`);
    expect(markup).toContain(`${t('projects.import.refused.busy.title')}</h2>`);
  });
  for (const reason of REASONS) {
    it(`renders the warning and dismissal for ${reason}`, () => {
      const markup = renderToStaticMarkup(<ImportRefusalBody reason={reason} onDismiss={() => {}} />);

      expect(markup).toContain('data-testid="import-refused"');
      expect(markup).toContain('data-testid="import-refused-dismiss"');
      expect(markup.match(/<h[1-6]\b/g)).toHaveLength(1);
      expect(markup).toContain(`${t(TITLES[reason])}</h2>`);
      expect(markup).toContain('data-autofocus=""');
      expect(markup).not.toContain('astryx-layout-header');
      expect(markup).not.toContain('undefined');
    });
  }
});
