import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { t } from '@studio/i18n';
import { ProjectsShowroom } from './ProjectsShowroom.js';

describe('Project copy Showroom states (ONL-2515)', () => {
  it('shows actionable copy guidance, and choosing the folder again in place of Retry, for problems that need a folder change', () => {
    for (const cause of ['ignored_files', 'permission_denied', 'folder_unavailable', 'copy_in_progress', 'disk_full', 'git_failed'] as const) {
      const markup = renderToStaticMarkup(<ProjectsShowroom scenario={`copy-failure-${cause.replaceAll('_', '-')}`} />);
      expect(markup).toContain(renderToStaticMarkup(<>{t(`project.create.copy.${cause}`)}</>));
      expect(markup).not.toContain('data-testid="chat-setup-retry"');
      expect(markup).toContain('data-testid="chat-setup-choose-folder"');
    }
  });

  it('keeps the failing command\u2019s own words behind the details control (ONL-3285)', () => {
    const markup = renderToStaticMarkup(<ProjectsShowroom scenario="copy-failure-ignored-files" />);
    expect(markup).toContain('data-testid="chat-setup-detail-toggle"');
    expect(markup).toContain(t('project.create.details.show'));
    expect(markup).not.toContain('data-testid="chat-setup-detail"');
    expect(markup).not.toContain('nothing added to commit');
  });

  it('keeps Retry for a copy timeout and an unclassified failure', () => {
    for (const cause of ['git_timed_out', 'unknown']) {
      const markup = renderToStaticMarkup(<ProjectsShowroom scenario={`copy-failure-${cause.replaceAll('_', '-')}`} />);
      expect(markup).toContain('data-testid="chat-setup-retry"');
      expect(markup).not.toContain('data-testid="chat-setup-choose-folder"');
    }
  });
  it('exposes active, archived, missing, unresolved and limit card states through the real Projects grid', () => {
    for (const scenario of ['copy-active', 'copy-archived', 'copy-missing', 'copy-unresolved', 'copy-limit', 'copy-hover', 'copy-focus']) {
      const markup = renderToStaticMarkup(<ProjectsShowroom scenario={scenario} />);
      expect(markup).toContain('data-project-id="copy-source"');
      expect(markup).toContain('Landing');
      expect(markup).toContain('data-testid="project-grid"');
    }
  });

  it('uses the real setup narration and row with the source Project name', () => {
    const markup = renderToStaticMarkup(<ProjectsShowroom scenario="copy-setup" />);
    expect(markup).toContain('data-testid="chat-setup"');
    expect(markup).toContain('data-setup-phase="copying"');
    expect(markup).toContain('Making a copy of');
    expect(markup).toContain('Landing');
    expect(markup).not.toContain('fixture-app');
  });

  it('renders cataloged copy failure and submodule refusal through the real setup row', () => {
    const markup = renderToStaticMarkup(<ProjectsShowroom scenario="copy-error" />);

    expect(markup).toContain('data-testid="chat-setup"');
    expect(markup).toContain('data-setup-phase="copying"');
    expect(markup).toContain('data-setup-failed="true"');
    expect(markup).toContain(t('project.create.failed.copying', { repo: '' }).trim());
    expect(markup).toContain(t('project.create.next.copying'));
    expect(markup).toContain('data-testid="chat-setup-detail-toggle"');
    expect(markup).not.toContain(renderToStaticMarkup(<>{t('projects.copy.error.submodules')}</>));
    expect(markup).toContain('data-testid="chat-setup-retry"');
    expect(markup).toContain('Landing');
    expect(markup).not.toContain('data-project-id="copy-source"');
    expect(markup).not.toContain('data-testid="chat-setup-dismiss"');
  });
});
