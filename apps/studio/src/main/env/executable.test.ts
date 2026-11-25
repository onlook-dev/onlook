import { afterEach, describe, expect, it } from 'bun:test';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { hostExecutable, pathExecutable } from './executable.js';
import { runCli } from './cli.js';

const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'studio-host-command-'));
  roots.push(root);
  const project = join(root, 'project');
  const trusted = join(root, 'trusted');
  mkdirSync(project);
  mkdirSync(trusted);
  const script = join(project, 'studio-probe');
  writeFileSync(script, '#!/bin/sh\ntouch compromised\n');
  chmodSync(script, 0o755);
  return { root, project, trusted, script };
}

describe('host executable security', () => {
  it('resolves a user toolchain without consulting a project or relative PATH entries', () => {
    const { trusted } = fixture();
    const binary = join(trusted, 'git');
    writeFileSync(binary, '#!/bin/sh\nexit 0\n');
    chmodSync(binary, 0o755);
    expect(pathExecutable('git', { PATH: ['', '.', 'node_modules/.bin', trusted].join(delimiter) })).toBe(binary);
    expect(pathExecutable('git', { PATH: ['', '.', 'node_modules/.bin'].join(delimiter) })).toBeUndefined();
    expect(pathExecutable('./git', { PATH: trusted })).toBeUndefined();
  });

  it('security ignores relative PATH and project-local executable candidates', async () => {
    const { project } = fixture();
    const PATH = ['', '.', 'node_modules/.bin', project].join(delimiter);
    expect(hostExecutable('studio-probe', project, { PATH })).toBeUndefined();
    const result = await runCli('studio-probe', project, [], { timeoutMs: 1000, env: { PATH } });
    expect(result.missing).toBe(true);
    expect(existsSync(join(project, 'compromised'))).toBe(false);
  });

  it('security rejects a trusted PATH symlink whose target is inside the project', () => {
    const { project, trusted, script } = fixture();
    symlinkSync(script, join(trusted, 'studio-probe'));
    expect(hostExecutable('studio-probe', project, { PATH: trusted })).toBeUndefined();
  });

  it('security resolves host programs absolutely while keeping explicit host paths', async () => {
    const { project, trusted } = fixture();
    const binary = join(trusted, 'studio-probe');
    writeFileSync(binary, '#!/bin/sh\nprintf trusted\n');
    chmodSync(binary, 0o755);
    const PATH = [project, trusted].join(delimiter);
    expect(hostExecutable('studio-probe', project, { PATH })).toBe(binary);
    expect(hostExecutable('./studio-probe', project, { PATH })).toBeUndefined();
    expect(hostExecutable('/bin/sh', project, { PATH: '' })).toBe('/bin/sh');
    const result = await runCli('studio-probe', project, [], { timeoutMs: 1000, env: { PATH } });
    expect(result).toMatchObject({ ok: true, out: 'trusted' });
  });

  it('Windows resolves npm.cmd before npm.bat and ignores the extensionless npm shell script', () => {
    const { project, trusted } = fixture();
    for (const name of ['npm', 'npm.cmd', 'npm.bat']) {
      const binary = join(trusted, name);
      writeFileSync(binary, '#!/bin/sh\nexit 0\n');
      chmodSync(binary, 0o755);
    }
    expect(hostExecutable('npm', project, { PATH: trusted }, 'win32')).toBe(join(trusted, 'npm.cmd'));
  });

  it('Windows prefers exe before cmd and bat while honoring an explicit executable extension', () => {
    const { project, trusted } = fixture();
    for (const name of ['npm.bat', 'npm.cmd', 'npm.exe']) {
      const binary = join(trusted, name);
      writeFileSync(binary, 'trusted');
      chmodSync(binary, 0o755);
    }
    expect(hostExecutable('npm', project, { PATH: trusted }, 'win32')).toBe(join(trusted, 'npm.exe'));
    expect(hostExecutable('npm.cmd', project, { PATH: trusted }, 'win32')).toBe(join(trusted, 'npm.cmd'));
    expect(hostExecutable('npm.bat', project, { PATH: trusted }, 'win32')).toBe(join(trusted, 'npm.bat'));
  });

  it('Windows resolves bat when it is the only executable extension', () => {
    const { project, trusted } = fixture();
    const binary = join(trusted, 'npm.bat');
    writeFileSync(binary, 'trusted');
    chmodSync(binary, 0o755);
    expect(hostExecutable('npm', project, { PATH: trusted }, 'win32')).toBe(binary);
  });

  it('Windows rejects an extensionless-only shell script without a shell fallback', () => {
    const { project, trusted } = fixture();
    const binary = join(trusted, 'npm');
    writeFileSync(binary, '#!/bin/sh\ntouch compromised\n');
    chmodSync(binary, 0o755);
    expect(hostExecutable('npm', project, { PATH: trusted }, 'win32')).toBeUndefined();
    expect(existsSync(join(project, 'compromised'))).toBe(false);
  });

  it('Windows excludes project executables and trusted PATH symlinks into the project', () => {
    const { project, trusted, script } = fixture();
    const binary = join(project, 'npm.cmd');
    writeFileSync(binary, 'untrusted');
    chmodSync(binary, 0o755);
    symlinkSync(script, join(trusted, 'npm.exe'));
    const PATH = [project, trusted].join(delimiter);
    expect(hostExecutable('npm', project, { PATH }, 'win32')).toBeUndefined();
  });

  it('Windows preserves explicit trusted absolute executable overrides', () => {
    const { project, trusted } = fixture();
    const binary = join(trusted, 'npm');
    expect(hostExecutable(binary, project, { PATH: '' }, 'win32')).toBe(binary);
  });
});
