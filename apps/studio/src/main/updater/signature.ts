import { execFile, type ExecFileOptionsWithStringEncoding } from 'node:child_process';
import { release } from 'node:os';
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
  Path?: string;
  SignerCertificate: { Subject: string };
}

export function createWindowsSignatureVerifier(
  run: RunPowerShell = promisify(execFile),
  windowsRelease: () => string = release,
): VerifyUpdateCodeSignature {
  return async (publisherNames, updateFile) => {
    const powershell = (command: string, timeout: number) => run(
      systemExecutable('WindowsPowerShell/v1.0/powershell.exe'),
      ['-NoProfile', '-NonInteractive', '-InputFormat', 'None', '-Command', command],
      {
        encoding: 'utf8',
        timeout,
        shell: false,
        env: { ...process.env, PSModulePath: '', ONLOOK_UPDATE_FILE: updateFile },
      },
    );
    try {
      const { stdout, stderr } = await powershell(
        "if ($ExecutionContext.SessionState.LanguageMode -eq 'FullLanguage') { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 }; Get-AuthenticodeSignature -LiteralPath $env:ONLOOK_UPDATE_FILE | ConvertTo-Json -Compress",
        20_000,
      );
      if (stderr) throw new Error('Cannot read the Windows update signature.');
      const signature = JSON.parse(stdout.trim()) as Signature;
      if (signature.Status !== 0) return 'The Windows update signature is not valid.';
      if (typeof signature.Path === 'string' && win32.normalize(signature.Path) !== win32.normalize(updateFile)) {
        throw new Error('The Windows update signature refers to a different file.');
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
    } catch (error) {
      const version = windowsRelease();
      if (version.startsWith('6.') && !version.startsWith('6.3')) return null;
      try { await powershell('ConvertTo-Json test', 10_000); }
      catch { return null; }
      throw error;
    }
  };
}
