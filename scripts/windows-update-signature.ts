import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { WINDOWS_PUBLISHER_NAME } from './windows-signing.js';

interface WindowsSignature {
  status: number;
  subject: string | null;
}

export function readWindowsSignature(file: string): WindowsSignature {
  const script = [
    "$ErrorActionPreference = 'Stop'",
    `$signature = Get-AuthenticodeSignature -LiteralPath '${file.replaceAll("'", "''")}'`,
    '$subject = if ($signature.SignerCertificate) { $signature.SignerCertificate.Subject } else { $null }',
    '@{ status = [int]$signature.Status; subject = $subject } | ConvertTo-Json -Compress',
  ].join('; ');
  return JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], { encoding: 'utf8', timeout: 30_000, windowsHide: true })) as WindowsSignature;
}

export function assertWindowsUpdateSignature(
  appDirectory: string,
  installer: string,
  inspect: (file: string) => WindowsSignature = readWindowsSignature,
): void {
  const appRequire = createRequire(join(import.meta.dirname, '../apps/studio/package.json'));
  const builderRequire = createRequire(appRequire.resolve('electron-builder'));
  const updaterRequire = createRequire(appRequire.resolve('electron-updater'));
  const { load } = builderRequire('js-yaml') as { load(text: string): unknown };
  const { parseDn } = updaterRequire('builder-util-runtime') as { parseDn(subject: string): Map<string, string> };
  const config = load(readFileSync(join(appDirectory, 'resources/app-update.yml'), 'utf8')) as { publisherName?: unknown } | null;
  const publishers = Array.isArray(config?.publisherName) ? config.publisherName : [config?.publisherName];
  if (publishers.length !== 1 || publishers[0] !== WINDOWS_PUBLISHER_NAME) {
    throw new Error('Packaged Windows updater publisher does not match the signing configuration');
  }
  const signature = inspect(installer);
  if (signature.status !== 0 || typeof signature.subject !== 'string' || parseDn(signature.subject).get('CN') !== WINDOWS_PUBLISHER_NAME) {
    throw new Error('Windows installer must have a valid signature from the configured publisher');
  }
}
