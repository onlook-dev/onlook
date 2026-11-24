import electron from 'electron';
import { GONE_REASONS, type GoneReason, type ProcessClass } from '@studio/events';
import { STARTER_SERVICE_PREFIX } from '../starter/runner.js';
import { tabHost } from '../tabs/host.js';
import { recordProcessExit } from './index.js';

let installed = false;

function goneReason(reason: string): GoneReason | undefined {
  return (GONE_REASONS as readonly string[]).includes(reason) ? reason as GoneReason : undefined;
}

export function installProcessCrashHooks(target = electron.app): void {
  if (installed) return;
  installed = true;
  target.on('render-process-gone', (_event, contents, details) => {
    const reason = goneReason(details.reason);
    if (reason === undefined) return;
    const processClass: ProcessClass = contents.getType() === 'webview' ? 'frame' : tabHost()?.isBandContents(contents.id) === true ? 'band' : 'tab';
    void recordProcessExit({ process_class: processClass, reason, exit_code: details.exitCode });
  });
  target.on('child-process-gone', (_event, details) => {
    const reason = goneReason(details.reason);
    if (reason === undefined) return;
    const starter = details.serviceName?.startsWith(STARTER_SERVICE_PREFIX) === true;
    if (starter && reason === 'killed') return;
    const processClass: ProcessClass = details.type === 'GPU' ? 'gpu' : starter ? 'dev_server' : details.type === 'Utility' ? 'utility' : 'other';
    void recordProcessExit({ process_class: processClass, reason, exit_code: details.exitCode });
  });
}

export function resetProcessCrashHooksForTesting(): void {
  installed = false;
}
