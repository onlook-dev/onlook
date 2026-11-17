import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { utilityProcess } from 'electron';
import { StarterFailure } from './failure.js';
import { userEnv } from '../env/shell-env.js';

interface HelperProbeChild {
  once(event: 'message' | 'exit', listener: (value: unknown) => void): unknown;
  kill(): boolean;
}

export type HelperProbeFork = (modulePath: string, args: string[], options: Electron.ForkOptions) => HelperProbeChild;

export async function checkHelperProcess(fork: HelperProbeFork = (modulePath, args, options) => utilityProcess.fork(modulePath, args, options), timeoutMs = 8_000): Promise<void> {
  const scratch = await mkdtemp(join(tmpdir(), 'studio-helper-check-'));
  try {
    const modulePath = join(scratch, 'probe.cjs');
    await writeFile(modulePath, 'process.parentPort.postMessage("onlook-ready");');
    const env = await userEnv();
    await new Promise<void>((resolve, reject) => {
      let child: HelperProbeChild;
      try { child = fork(modulePath, [], { cwd: scratch, env, stdio: 'pipe', serviceName: 'onlook-machine-check' }); }
      catch {
        reject(new StarterFailure('starter_exited', 'Helper could not be launched'));
        return;
      }
      let ready = false;
      const timer = setTimeout(() => {
        child.kill();
        reject(new Error('Helper did not start'));
      }, timeoutMs);
      child.once('message', (message) => {
        ready = message === 'onlook-ready';
        child.kill();
      });
      child.once('exit', () => {
        clearTimeout(timer);
        if (ready) resolve();
        else reject(new StarterFailure('starter_exited', 'Helper exited before ready'));
      });
    });
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}
