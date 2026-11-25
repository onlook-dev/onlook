import { execFile, type ExecFileOptionsWithStringEncoding } from 'node:child_process';
import { win32 } from 'node:path';
import { promisify } from 'node:util';
import { parseDn } from 'builder-util-runtime';
import type { VerifyUpdateCodeSignature } from 'electron-updater';
import { systemExecutable } from '../env/platform.js';

type RunPowerShell = (
  executable: string,
  args: string[],
  options: ExecFileOptionsWithStringEncoding,
) => Promise<{ stdout: string; stderr: string }>;

interface Signature {
  Status: number;
  Path: string;
  SignerCertificate: { Subject: string } | null;
}

export function createWindowsSignatureVerifier(
  run: RunPowerShell = promisify(execFile),
): VerifyUpdateCodeSignature {
  return async (publisherNames, updateFile) => {
    const { stdout, stderr } = await run(
      systemExecutable('WindowsPowerShell/v1.0/powershell.exe'),
      ['-NoProfile', '-NonInteractive', '-InputFormat', 'None', '-Command',
        '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-AuthenticodeSignature -LiteralPath $env:ONLOOK_UPDATE_FILE | ConvertTo-Json -Compress'],
      {
        encoding: 'utf8',
        timeout: 20_000,
        shell: false,
        env: { ...process.env, PSModulePath: '', ONLOOK_UPDATE_FILE: updateFile },
      },
    );
    if (stderr) throw new Error('Cannot read the Windows update signature.');
    const signature = JSON.parse(stdout.trim()) as Signature;
    if (signature.Status !== 0) return 'The Windows update signature is not valid.';
    if (typeof signature.Path !== 'string' || win32.normalize(signature.Path) !== win32.normalize(updateFile)) {
      return 'The Windows update signature refers to a different file.';
    }
    if (typeof signature.SignerCertificate?.Subject !== 'string') {
      return 'The Windows update signature has no publisher.';
    }
    const subject = parseDn(signature.SignerCertificate.Subject);
    for (const name of publisherNames) {
      const distinguishedName = parseDn(name);
      const matches = distinguishedName.size
        ? [...distinguishedName].every(([key, value]) => subject.get(key) === value)
        : subject.get('CN') === name;
      if (matches) return null;
    }
    return 'The Windows update publisher does not match.';
  };
}
