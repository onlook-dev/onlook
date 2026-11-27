import { APP_ENV, runChildOutput } from './env/child.js';
import { systemExecutable } from './env/platform.js';

export async function openWindowsTerminal(run = runChildOutput): Promise<void> {
  await run(systemExecutable('cmd.exe'), ['/d', '/s', '/c', 'start "" "%SystemRoot%\\System32\\cmd.exe" /d /k'], {
    env: APP_ENV,
    windowsHide: true,
    windowsVerbatimArguments: true,
    timeout: 5_000,
  });
}
