import { spawn } from 'node-pty';
import type { PtyEchoRequest, PtyEchoResult } from '@studio/events';
import { devSwitches } from './env/dev-switches.js';
import { messageOf } from './errors/message.js';

// A diagnostic behind `STUDIO_DIAGNOSTICS`, not a feature: the one seat where node-pty failing to load from
// `app.asar.unpacked` in a signed .app shows (`smoke.e2e.ts`).
export async function ptyEcho(req: PtyEchoRequest): Promise<PtyEchoResult> {
  // The quarantine's promise is that no pty spawns in the run, this exiting one included (ONL-1860).
  if (devSwitches.noPty === '1') {
    return { output: '', error: 'node-pty disabled in this run (STUDIO_NO_PTY, ONL-1860).' };
  }

  return new Promise<PtyEchoResult>((resolve) => {
    let pty: ReturnType<typeof spawn>;
    try {
      pty = spawn('/bin/sh', ['-c', `printf '%s' "$0"`, req.text], {
        name: 'xterm-color',
        cols: 80,
        rows: 24,
        cwd: process.env['HOME'] ?? process.cwd(),
        env: process.env as Record<string, string>,
      });
    } catch (error) {
      resolve({ output: '', error: messageOf(error) });
      return;
    }

    let output = '';
    const timeout = setTimeout(() => {
      pty.kill();
      resolve({ output, error: 'pty timed out' });
    }, 5_000);

    pty.onData((chunk) => {
      output += chunk;
    });

    pty.onExit(() => {
      clearTimeout(timeout);
      resolve({ output: output.trim() });
    });
  });
}
