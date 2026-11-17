import { captureError, type ErrorOwner } from '../errors/index.js';
import { log, type LogFields } from '../log/index.js';
import { capture, recordActivationSurface } from '../telemetry/index.js';
import type { TelemetryProperties } from '../telemetry/events.js';
import { ownerForExit, tabHealthAfter, type RendererGoneReason, type TabHealth, type TabHealthEvent } from './health.js';

interface HealthContents {
  id: number;
  on(event: 'render-process-gone', listener: (event: unknown, details: { reason: string; exitCode: number }) => void): unknown;
  on(event: 'did-fail-load', listener: (event: unknown, errorCode: number, description: string, url: string, isMainFrame: boolean) => void): unknown;
  on(event: 'did-finish-load', listener: () => void): unknown;
}

export function observeTabHealth(contents: HealthContents, options: {
  isLive: () => boolean;
  health: () => TabHealth | undefined;
  setHealth: (health: TabHealth | undefined) => void;
  projectFields: () => { project_id?: string };
}): void {
  const record = (event: TabHealthEvent, failure: TelemetryProperties<'tab_view_failed'>, error?: { owner: ErrorOwner; message: string; fields: LogFields }): void => {
    if (!options.isLive()) return;
    options.setHealth(tabHealthAfter(options.health(), event));
    capture('tab_view_failed', { ...options.projectFields(), ...failure });
    recordActivationSurface(contents.id, { surface: 'error_state', dead_end: { state: 'frame_unreachable', error_class: failure.reason === 'renderer-gone' ? 'render_gone' : 'load_failed' } });
    if (error) captureError(new Error(error.message), { owner: error.owner, subsystem: 'tabs', ...error.fields, ...options.projectFields() });
  };
  contents.on('render-process-gone', (_event, details) => {
    const reason = details.reason as RendererGoneReason;
    const owner = ownerForExit(reason);
    if (owner === undefined) log('tabs').info('tab view exited cleanly', { exit_reason: reason });
    record(
      { kind: 'render-process-gone', reason },
      { reason: 'renderer-gone', exit_reason: reason },
      owner === undefined ? undefined : { owner, message: `tab view renderer gone: ${reason}`, fields: { exit_reason: reason, exit_code: details.exitCode } },
    );
  });
  contents.on('did-fail-load', (_event, errorCode, _description, _url, isMainFrame) => {
    const event: TabHealthEvent = { kind: 'did-fail-load', errorCode, isMainFrame };
    if (!options.isLive() || tabHealthAfter(undefined, event) === undefined) return;
    if (options.health() === 'failed') {
      options.setHealth('failed');
      return;
    }
    record(event, { reason: 'load-failed', error_code: errorCode }, { owner: 'ours', message: `tab view failed to load: ${String(errorCode)}`, fields: { error_code: errorCode } });
  });
  contents.on('did-finish-load', () => {
    if (!options.isLive()) return;
    options.setHealth(undefined);
  });
}
