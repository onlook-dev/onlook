import type { ServerHost } from '../server/index.js';
import type { WorkspaceTelemetryProperties } from '../telemetry/events.js';
import type { FirstFrameAnswer } from '../workspace/setup-signals.js';
import { untilAborted } from './runner.js';

export interface ProjectSetupReportDeps {
  host(): Pick<ServerHost, 'report' | 'awaitRunning'> | undefined;
  telemetryProperties(cwd: string): WorkspaceTelemetryProperties | undefined;
  noteReport(cwd: string, port: number, signal: AbortSignal): Promise<FirstFrameAnswer>;
  placeFrame(cwd: string, port: number, signal: AbortSignal): Promise<FirstFrameAnswer>;
  failure(kind: 'hostUnavailable' | 'bookNotReady' | 'frameNotPlaced', reason?: string): string;
}

export function createProjectSetupReport(deps: ProjectSetupReportDeps) {
  return async (cwd: string, folder: string, port: number, signal: AbortSignal): Promise<void> => {
    signal.throwIfAborted();
    const host = deps.host();
    if (!host) throw new Error(deps.failure('hostUnavailable'));
    await untilAborted(host.report(cwd, folder, port, deps.telemetryProperties(cwd), signal), signal);
    signal.throwIfAborted();
    if (await untilAborted(host.awaitRunning(cwd, port, 60000), signal) !== 'running') {
      throw new Error(deps.failure('bookNotReady'));
    }
    signal.throwIfAborted();
    const frame = await untilAborted(deps.noteReport(cwd, port, signal), signal);
    signal.throwIfAborted();
    const placed = frame.kind === 'no-setup' ? await untilAborted(deps.placeFrame(cwd, port, signal), signal) : frame;
    signal.throwIfAborted();
    if (placed.kind !== 'placed' && placed.kind !== 'already-shown') {
      throw new Error(deps.failure('frameNotPlaced', placed.kind === 'not-placed' ? placed.reason : ''));
    }
  };
}
