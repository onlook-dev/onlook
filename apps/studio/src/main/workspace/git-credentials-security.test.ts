import { afterAll, expect, it } from 'bun:test';
import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanupTempFixtures, makeGitRepo } from '@studio/fixtures';
import { git } from './git.js';

afterAll(cleanupTempFixtures);

for (const reset of [false, true]) {
  it(`security retains trusted credential helper order, URL scope and reset (${reset}) without repository execution`, async () => {
    const { root, path: project } = makeGitRepo();
    const calls = join(root, 'helpers-called');
    const marker = join(root, 'repository-helper-called');
    const system = join(root, 'system.gitconfig');
    const global = join(root, 'global.gitconfig');
    const systemHelper = join(root, 'system-helper');
    const globalHelper = join(root, 'global-helper');
    for (const [path, name, output] of [
      [systemHelper, 'system', 'username=fixture'],
      [globalHelper, 'global', 'username=fixture\\npassword=fixture'],
    ]) {
      writeFileSync(path!, `#!/bin/sh\n[ "$1" = get ] || exit 0\nprintf '${name}\\n' >> '${calls}'\nprintf '${output}\\n'\n`);
      chmodSync(path!, 0o755);
    }
    let authenticated = false;
    const server = Bun.serve({ hostname: '127.0.0.1', port: 0, fetch: (request) => {
      if (request.headers.has('authorization')) {
        authenticated = true;
        return new Response('fixture is not a remote', { status: 404 });
      }
      return new Response('', { status: 401, headers: { 'www-authenticate': 'Basic realm="fixture"' } });
    } });
    try {
      const url = `http://127.0.0.1:${String(server.port)}/repo`;
      writeFileSync(system, `[credential]\n\thelper = ${systemHelper}\n`);
      writeFileSync(global, `${reset ? '[credential]\n\thelper =\n' : ''}[credential "${url}"]\n\thelper = ${globalHelper}\n`);
      expect((await git(project, ['config', 'remote.origin.url', url])).ok).toBe(true);
      expect((await git(project, ['config', 'credential.helper', `!touch '${marker}'`])).ok).toBe(true);
      expect((await git(project, ['config', `credential.${url}.helper`, `!touch '${marker}'`])).ok).toBe(true);
      const result = await git(project, ['fetch', 'origin'], { env: {
        GIT_CONFIG_SYSTEM: system, GIT_CONFIG_GLOBAL: global, GIT_CONFIG_NOSYSTEM: '0', GIT_ASKPASS: '',
      } });
      expect(result.ok).toBe(false);
      expect(authenticated).toBe(true);
      expect(readFileSync(calls, 'utf8')).toBe(reset ? 'global\n' : 'system\nglobal\n');
      expect(existsSync(marker)).toBe(false);
    } finally {
      await server.stop(true);
    }
  });
}
