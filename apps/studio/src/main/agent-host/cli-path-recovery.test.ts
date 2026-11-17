import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  constants,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'bun:test';
import { resolvePlatformBinary } from './cli-path.js';

describe.skipIf(process.platform === 'win32')('replacing Onlook restores its pinned Claude executable (ONL-2671)', () => {
  for (const damage of ['missing', 'unexecutable'] as const) {
    it(`recovers a ${damage} bundled executable after reopening, without using a PATH CLI`, () => {
      const root = realpathSync(mkdtempSync(join(tmpdir(), 'studio-cli-recovery-')));
      try {
        const node = Bun.which('node');
        expect(node).not.toBeNull();
        const originalBinary = resolvePlatformBinary();
        expect(originalBinary).toBeDefined();
        const nativeDirectory = dirname(originalBinary!);
        const nativePackage = basename(nativeDirectory);
        const appPackage = join(import.meta.dirname, '../../../package.json');
        const appMetadata = JSON.parse(readFileSync(appPackage, 'utf8'));
        const requireFrom = createRequire(import.meta.url);
        const sdkDirectory = dirname(requireFrom.resolve('@anthropic-ai/claude-agent-sdk'));
        const sdkMetadata = JSON.parse(readFileSync(join(sdkDirectory, 'package.json'), 'utf8'));
        const nativeMetadata = JSON.parse(readFileSync(join(nativeDirectory, 'package.json'), 'utf8'));
        expect(sdkMetadata.version).toBe(appMetadata.dependencies['@anthropic-ai/claude-agent-sdk']);
        expect(nativeMetadata.version).toBe(sdkMetadata.version);

        const home = join(root, 'home');
        const pathDirectory = join(root, 'external-bin');
        mkdirSync(home);
        mkdirSync(pathDirectory);
        const externalCli = join(pathDirectory, 'claude');
        const externalMarker = `${externalCli}.invoked`;
        writeFileSync(
          externalCli,
          '#!/bin/sh\nprintf invoked > "$0.invoked"\nprintf "external-path-cli\\n"\n',
          { mode: 0o755 },
        );
        const env = {
          PATH: pathDirectory,
          HOME: home,
          XDG_CONFIG_HOME: join(home, '.config'),
          CLAUDE_CONFIG_DIR: join(home, '.claude'),
          DISABLE_AUTOUPDATER: '1',
          CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
          ...(process.env.TMPDIR === undefined ? {} : { TMPDIR: process.env.TMPDIR }),
        };
        const externalVersion = spawnSync('claude', ['--version'], { cwd: root, env, encoding: 'utf8' });
        expect(externalVersion.error).toBeUndefined();
        expect(externalVersion.status).toBe(0);
        expect(externalVersion.stdout.trim()).toBe('external-path-cli');
        expect(existsSync(externalMarker)).toBe(true);
        rmSync(externalMarker);

        const originalVersion = spawnSync(originalBinary!, ['--version'], {
          cwd: root, env, encoding: 'utf8', timeout: 10_000,
        });
        expect(originalVersion.error).toBeUndefined();
        expect(originalVersion.status).toBe(0);
        expect(originalVersion.stdout.trim()).toBe(`${sdkMetadata.claudeCodeVersion} (Claude Code)`);

        function createBundle(app: string, includeExecutable: boolean): void {
          const archive = join(app, 'Contents/Resources/app.asar');
          const unpacked = join(app, 'Contents/Resources/app.asar.unpacked');
          const mainDirectory = join(archive, 'out/main');
          const sdk = join(archive, 'node_modules/@anthropic-ai/claude-agent-sdk');
          const native = join(archive, 'node_modules/@anthropic-ai', nativePackage);
          const unpackedNative = join(unpacked, 'node_modules/@anthropic-ai', nativePackage);
          for (const directory of [mainDirectory, sdk, native, unpackedNative]) {
            mkdirSync(directory, { recursive: true });
          }
          copyFileSync(appPackage, join(archive, 'package.json'));
          copyFileSync(join(import.meta.dirname, 'cli-path.ts'), join(mainDirectory, 'cli-path.ts'));
          copyFileSync(join(sdkDirectory, 'package.json'), join(sdk, 'package.json'));
          writeFileSync(join(sdk, 'sdk.mjs'), '');
          copyFileSync(join(nativeDirectory, 'package.json'), join(native, 'package.json'));
          copyFileSync(join(nativeDirectory, 'package.json'), join(unpackedNative, 'package.json'));
          writeFileSync(join(native, basename(originalBinary!)), '');
          if (includeExecutable) {
            const executable = join(unpackedNative, basename(originalBinary!));
            copyFileSync(originalBinary!, executable, constants.COPYFILE_FICLONE);
            chmodSync(executable, 0o755);
          }
        }

        const installedApp = join(root, 'Onlook.app');
        const replacementApp = join(root, 'download/Onlook.app');
        const retiredApp = join(root, 'retired-Onlook.app');
        createBundle(installedApp, damage !== 'missing');
        createBundle(replacementApp, true);
        const archive = join(installedApp, 'Contents/Resources/app.asar');
        const archivedBinary = join(archive, 'node_modules/@anthropic-ai', nativePackage, basename(originalBinary!));
        const installedBinary = join(
          installedApp, 'Contents/Resources/app.asar.unpacked/node_modules/@anthropic-ai',
          nativePackage, basename(originalBinary!),
        );
        if (damage === 'unexecutable') chmodSync(installedBinary, 0o644);
        const resolverUrl = pathToFileURL(join(archive, 'out/main/cli-path.ts')).href;
        const probe = `
          import { spawnSync } from 'node:child_process';
          import { renameSync } from 'node:fs';
          import { claudeBinaryPath, claudeExecutablePath, resolvePlatformBinary } from ${JSON.stringify(resolverUrl)};
          function probe() {
            const executable = claudeExecutablePath();
            const binary = claudeBinaryPath();
            const result = spawnSync(executable ?? ${JSON.stringify(installedBinary)}, ['--version'], {
              encoding: 'utf8', timeout: 10000,
            });
            return {
              resolved: resolvePlatformBinary() ?? null,
              executable: executable ?? null,
              binary: binary ?? null,
              version: {
                status: result.status, error: result.error?.code ?? null, stdout: result.stdout ?? null,
              },
            };
          }
        `;
        function runProbe(script: string) {
          const result = spawnSync(node!, ['--input-type=module', '--eval', `${probe}\n${script}`], {
            cwd: root, env, encoding: 'utf8', timeout: 30_000,
          });
          expect(result.error).toBeUndefined();
          expect({ status: result.status, stderr: result.stderr }).toEqual({ status: 0, stderr: '' });
          return JSON.parse(result.stdout);
        }

        const replacement = runProbe(`
          const before = probe();
          renameSync(${JSON.stringify(installedApp)}, ${JSON.stringify(retiredApp)});
          renameSync(${JSON.stringify(replacementApp)}, ${JSON.stringify(installedApp)});
          process.stdout.write(JSON.stringify({ before, cached: probe() }));
        `);
        const expectedFailure = {
          resolved: archivedBinary,
          executable: damage === 'missing' ? null : installedBinary,
          binary: damage === 'missing' ? null : installedBinary,
          version: { status: null, error: damage === 'missing' ? 'ENOENT' : 'EACCES', stdout: null },
        };
        expect(replacement.before).toEqual(expectedFailure);
        const healthyVersion = { status: 0, error: null, stdout: originalVersion.stdout };
        expect(replacement.cached).toEqual({
          ...expectedFailure,
          version: healthyVersion,
        });

        const reopened = runProbe('process.stdout.write(JSON.stringify(probe()));');
        expect(reopened).toEqual({
          resolved: archivedBinary,
          executable: installedBinary,
          binary: installedBinary,
          version: healthyVersion,
        });
        expect(existsSync(externalMarker)).toBe(false);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    }, 60_000);
  }
});
