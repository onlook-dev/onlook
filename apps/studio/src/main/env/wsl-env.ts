import { randomUUID } from 'node:crypto';
import { runChildOutput } from './child.js';
import { parseEnvBlock } from './shell-env.js';
import { rememberWslEnvironment, wslHostPath, wslProject } from './wsl.js';

const captures = new Map<string, Promise<void>>();

export function ensureWslEnvironment(cwd: string, run = runChildOutput): Promise<void> {
  const project = wslProject(cwd);
  if (project === undefined) return Promise.resolve();
  const existing = captures.get(project.distro);
  if (existing !== undefined) return existing;
  const capture = (async () => {
    for (const flags of ['-ilc', '-lc']) {
      const marker = `ONLOOK_ENV_${randomUUID()}`;
      try {
        const { stdout } = await run('/bin/sh', ['-c', 'cd "$HOME" && exec /bin/bash "$@"', 'onlook-wsl-env', flags, `printf '%s' '${marker}:BEGIN'; /usr/bin/env -0; printf '%s' '${marker}:END'`], {
          cwd: wslHostPath(project, '/'),
          env: { SystemRoot: process.env['SystemRoot'] },
          timeout: 8_000,
          killSignal: 'SIGKILL',
          maxBuffer: 8 * 1024 * 1024,
          encoding: 'utf8',
        });
        const begin = stdout.lastIndexOf(`${marker}:BEGIN`);
        const end = stdout.lastIndexOf(`${marker}:END`);
        if (begin < 0 || end <= begin) continue;
        const environment = parseEnvBlock(stdout.slice(begin + `${marker}:BEGIN`.length, end));
        if (!environment['HOME']?.startsWith('/') || !environment['PATH']) continue;
        rememberWslEnvironment(project.distro, environment);
        return;
      } catch {}
    }
    captures.delete(project.distro);
    throw new Error('Could not read the WSL login environment');
  })();
  captures.set(project.distro, capture);
  return capture;
}
