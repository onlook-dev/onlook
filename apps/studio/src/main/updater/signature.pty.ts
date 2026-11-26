import { strict as assert } from 'node:assert';
import { execFile } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join, win32 } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { promisify } from 'node:util';
import { systemExecutable } from '../env/platform.js';
import { createWindowsSignatureVerifier } from './signature.js';

const run = promisify(execFile);
const powershell = systemExecutable('WindowsPowerShell/v1.0/powershell.exe');
const powershellArgs = ['-NoProfile', '-NonInteractive', '-InputFormat', 'None', '-Command'];
const utf8 = '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; ';
const modulePathCommand = `${utf8}$env:PSModulePath | ConvertTo-Json -Compress`;

async function readSignature(file: string) {
  const result = await run(powershell, [...powershellArgs,
    `${utf8}Get-AuthenticodeSignature -LiteralPath $env:ONLOOK_UPDATE_FILE | ConvertTo-Json -Compress`], {
    encoding: 'utf8',
    timeout: 20_000,
    shell: false,
    env: { ...process.env, PSModulePath: '', ONLOOK_UPDATE_FILE: file },
  });
  assert.equal(result.stderr, '');
  return JSON.parse(result.stdout.trim()) as {
    Status: number;
    Path: string;
    SignerCertificate: { Subject: string } | null;
  };
}

function modulePaths(stdout: string): string[] {
  const value: unknown = JSON.parse(stdout.trim());
  assert.equal(typeof value, 'string');
  return (value as string).split(';').filter(Boolean).map(path => win32.normalize(path).toLowerCase()).sort();
}

describe('Windows update signature integration', { skip: process.platform !== 'win32' }, () => {
  let directory: string;
  let publisher: string;
  const signedFiles: string[] = [];
  let unsignedFile: string;

  after(async () => {
    if (directory) await rm(directory, { recursive: true, force: true });
  });

  before(async () => {
    const scratch = join(process.cwd(), '.scratch', 'tmp');
    await mkdir(scratch, { recursive: true });
    directory = await mkdtemp(join(scratch, 'windows-signature-'));
    const signature = await readSignature(powershell);
    assert.equal(signature.Status, 0, 'the system PowerShell binary must have a valid signature');
    assert.ok(signature.SignerCertificate?.Subject);
    publisher = signature.SignerCertificate.Subject;
    for (const folder of ["ASCII's folder", 'Curly\u2019s folder']) {
      const destination = join(directory, folder);
      await mkdir(destination);
      const file = join(destination, 'update.exe');
      await copyFile(powershell, file);
      const copiedSignature = await readSignature(file);
      assert.equal(copiedSignature.Status, 0, 'the copied binary must retain a valid signature');
      assert.equal(copiedSignature.SignerCertificate?.Subject, publisher);
      assert.equal(win32.normalize(copiedSignature.Path), win32.normalize(file));
      signedFiles.push(file);
    }
    unsignedFile = join(directory, 'unsigned.ps1');
    await writeFile(unsignedFile, 'Write-Output "fixture"\r\n');
    assert.equal((await readSignature(unsignedFile)).Status, 2);
  });

  for (const [index, name] of ['ASCII apostrophe', 'curly U+2019 apostrophe'].entries()) {
    it(`accepts the actual publisher through a path containing an ${name}`, async () => {
      assert.equal(await createWindowsSignatureVerifier()([publisher], signedFiles[index]!), null);
    });

    it(`rejects a different publisher through a path containing an ${name}`, async () => {
      assert.equal(
        await createWindowsSignatureVerifier()(['CN=Onlook Test Publisher'], signedFiles[index]!),
        'The Windows update publisher does not match.',
      );
    });
  }

  it('rejects an unsigned file even with the actual system publisher configured', async () => {
    assert.equal(
      await createWindowsSignatureVerifier()([publisher], unsignedFile),
      'The Windows update signature is not valid.',
    );
  });

  it('runs the product command in ConstrainedLanguage without stderr', async () => {
    let calls = 0;
    const verify = createWindowsSignatureVerifier(async (executable, args, options) => {
      calls++;
      const commandIndex = args.indexOf('-Command') + 1;
      assert.ok(commandIndex > 0);
      assert.equal(commandIndex, args.length - 1);
      const constrainedArgs = [...args];
      constrainedArgs[commandIndex] = "$ExecutionContext.SessionState.LanguageMode = 'ConstrainedLanguage'; "
        + "if ($ExecutionContext.SessionState.LanguageMode -ne 'ConstrainedLanguage') { throw 'Expected ConstrainedLanguage' }; "
        + args[commandIndex];
      const result = await run(executable, constrainedArgs, options);
      assert.equal(result.stderr, '', 'the unchanged product command must not write errors in ConstrainedLanguage');
      return result;
    });
    assert.equal(await verify([publisher], signedFiles[0]!), null);
    assert.equal(calls, 1);
  });

  it('clears the inherited module path before startup like the upstream cmd command', async context => {
    const inheritedModulePath = process.env['PSModulePath'];
    const marker = join(directory, 'custom-modules');
    await mkdir(marker);
    process.env['PSModulePath'] = marker;
    context.after(() => {
      if (inheritedModulePath === undefined) delete process.env['PSModulePath'];
      else process.env['PSModulePath'] = inheritedModulePath;
    });

    const inherited = await run(powershell, [...powershellArgs, modulePathCommand], {
      encoding: 'utf8', timeout: 20_000, shell: false, env: { ...process.env },
    });
    assert.equal(inherited.stderr, '');
    const normalizedMarker = win32.normalize(marker).toLowerCase();
    assert.ok(modulePaths(inherited.stdout).includes(normalizedMarker), 'the inherited marker must reach PowerShell');

    const upstream = await run(systemExecutable('cmd.exe'), ['/d', '/s', '/c',
      `set "PSModulePath=" && "${powershell}" -NoProfile -NonInteractive -InputFormat None -Command "${modulePathCommand}"`], {
      encoding: 'utf8', timeout: 20_000, shell: false,
      windowsVerbatimArguments: true, env: { ...process.env },
    });
    assert.equal(upstream.stderr, '');
    const upstreamPaths = modulePaths(upstream.stdout);
    assert.ok(upstreamPaths.length > 0, 'PowerShell must repopulate its default module paths');
    assert.ok(!upstreamPaths.includes(normalizedMarker));

    let calls = 0;
    const verify = createWindowsSignatureVerifier(async (executable, args, options) => {
      calls++;
      assert.equal(options.env?.['PSModulePath'], '');
      const startup = await run(executable, [...powershellArgs, modulePathCommand], options);
      assert.equal(startup.stderr, '');
      const startupPaths = modulePaths(startup.stdout);
      assert.ok(!startupPaths.includes(normalizedMarker), 'the custom module path must not reach PowerShell');
      assert.deepEqual(startupPaths, upstreamPaths);
      assert.notDeepEqual(startupPaths, modulePaths(inherited.stdout));
      return run(executable, args, options);
    });
    assert.equal(await verify([publisher], signedFiles[0]!), null);
    assert.equal(calls, 1);
  });
});
