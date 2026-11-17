import { describe, expect, it } from 'bun:test';
import type { ActivationSurfaceReport } from '@studio/events';
import { SurfaceReporter } from './surfaces.js';

describe('activation surface layers', () => {
  it('a replaced setup dialog keeps its surface when the old dialog cleanup runs', () => {
    const reports: ActivationSurfaceReport[] = [];
    const reporter = new SurfaceReporter((report) => reports.push(report));
    const oldOwner = Symbol('old');
    const newOwner = Symbol('new');
    reporter.set('canvas', { surface: 'canvas' });
    reporter.set('setup', { surface: 'setup' }, oldOwner);
    reporter.set('setup', { surface: 'error_state', dead_end: { state: 'setup_failed', error_class: 'unknown' } }, newOwner);
    reporter.remove('setup', oldOwner);
    expect(reports.at(-1)?.surface).toBe('error_state');
    reporter.remove('setup', newOwner);
    expect(reports.at(-1)?.surface).toBe('canvas');
  });
  it('restores the actual canvas after AI setup closes and deduplicates repeated renders', () => {
    const reports: ActivationSurfaceReport[] = [];
    const reporter = new SurfaceReporter((report) => reports.push(report));
    reporter.set('screen', { surface: 'chat_idle' });
    reporter.set('canvas', { surface: 'preview_loading' });
    reporter.set('setup', { surface: 'setup' });
    reporter.set('canvas', { surface: 'canvas' });
    reporter.set('setup', { surface: 'setup' });
    reporter.remove('setup');
    reporter.remove('canvas');
    reporter.set('screen', { surface: 'project_picker' });
    expect(reports.map((report) => report.surface)).toEqual(['chat_idle', 'preview_loading', 'setup', 'canvas', 'chat_idle', 'project_picker']);
  });

  it('reports a changed blocking state even when the surface stays error_state', () => {
    const reports: ActivationSurfaceReport[] = [];
    const reporter = new SurfaceReporter((report) => reports.push(report));
    reporter.set('canvas', { surface: 'error_state', dead_end: { state: 'setup_failed', error_class: 'unknown' } });
    reporter.set('canvas', { surface: 'error_state', dead_end: { state: 'app_not_started', error_class: 'timeout' } });
    expect(reports.map((report) => report.dead_end?.state)).toEqual(['setup_failed', 'app_not_started']);
  });
});
