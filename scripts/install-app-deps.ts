import { spawn } from 'node:child_process';
import { constants } from 'node:os';

interface InstallOptions {
  run?: (command: string[]) => Promise<number>;
  log?: (message: string) => void;
  heartbeatMs?: number;
}

function runCommand(command: string[]): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(command[0]!, command.slice(1), { stdio: 'inherit' });
    const interrupt = () => { child.kill('SIGINT'); };
    const terminate = () => { child.kill('SIGTERM'); };
    process.on('SIGINT', interrupt);
    process.on('SIGTERM', terminate);
    const cleanup = () => {
      process.off('SIGINT', interrupt);
      process.off('SIGTERM', terminate);
    };
    child.once('error', (error) => { cleanup(); reject(error); });
    child.once('exit', (code, signal) => {
      cleanup();
      resolve(code ?? (signal ? 128 + constants.signals[signal] : 1));
    });
  });
}

export async function installAppDeps({
  run = runCommand,
  log = (message) => { process.stderr.write(`${message}\n`); },
  heartbeatMs = 10_000,
}: InstallOptions = {}): Promise<number> {
  const stages = [
    { label: 'Checking/downloading Electron', command: ['install-electron'] },
    { label: 'Checking/rebuilding native dependencies (node-pty)', command: ['electron-builder', 'install-app-deps'] },
  ];
  for (const stage of stages) {
    const started = performance.now();
    const elapsed = () => Math.floor((performance.now() - started) / 1000);
    log(`[install-app-deps] ${stage.label}...`);
    const timer = setInterval(() => {
      log(`[install-app-deps] ${stage.label}: still running (${elapsed()}s elapsed)`);
    }, heartbeatMs);
    try {
      const code = await run(stage.command);
      if (code !== 0) {
        log(`[install-app-deps] ${stage.label}: failed (exit ${code})`);
        return code;
      }
      log(`[install-app-deps] ${stage.label}: complete (${elapsed()}s elapsed)`);
    } catch (error) {
      log(`[install-app-deps] ${stage.label}: failed to run\n${error instanceof Error ? error.stack ?? error.message : String(error)}`);
      return 1;
    } finally {
      clearInterval(timer);
    }
  }
  return 0;
}

if (import.meta.main) process.exitCode = await installAppDeps();
