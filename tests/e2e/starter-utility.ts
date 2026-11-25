import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ElectronApplication } from '@playwright/test';

export function probeStarterExit(application: ElectronApplication, scratch: string) {
  const modulePath = join(scratch, 'child.cjs');
  writeFileSync(modulePath, `
    process.parentPort.on('message', () => process.exit(3));
    process.parentPort.postMessage({ parentPid: process.ppid });
  `);
  return application.evaluate(async ({ app, utilityProcess }, path) => {
    const serviceName = 'studio-starter:exit-contract';
    const child = utilityProcess.fork(path, [], { serviceName });
    let sameParent = false;
    return new Promise<{ name: string | undefined; sameParent: boolean; exitCode: number }>((resolve, reject) => {
      const timeout = setTimeout(() => {
        app.off('child-process-gone', gone);
        child.kill();
        reject(new Error('No starter child-process-gone event within 10 seconds'));
      }, 10_000);
      const gone = (_event: Electron.Event, details: Electron.Details): void => {
        if (details.name !== serviceName && details.serviceName !== serviceName) return;
        clearTimeout(timeout);
        app.off('child-process-gone', gone);
        resolve({ name: details.name, sameParent, exitCode: details.exitCode });
      };
      app.on('child-process-gone', gone);
      child.once('message', (message: { parentPid: number }) => {
        sameParent = message.parentPid === process.pid;
        child.postMessage({ exit: true });
      });
    });
  }, modulePath);
}
