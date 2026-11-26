import { expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { win32 } from 'node:path';
import { runInNewContext } from 'node:vm';
import { createWindowsSignatureVerifier } from './signature.js';

const require = createRequire(import.meta.url);
const source = readFileSync(require.resolve('electron-updater/out/windowsExecutableCodeSignatureVerifier.js'), 'utf8');
const publisher = 'CN=Example Software, O=Example Software, C=US';
const path = 'C:\\Profiles\\Test Profile\\update.exe';
const signature = { Status: 0, Path: path, SignerCertificate: { Subject: publisher } };

interface Scenario {
  data?: unknown;
  error?: Error;
  stderr?: string;
  fallbackFails?: boolean;
  release?: string;
}

async function outcomes(scenario: Scenario) {
  const upstream: { verifySignature?: (names: string[], file: string, logger: object) => Promise<string | null> } = {};
  const stdout = JSON.stringify(scenario.data ?? signature);
  let upstreamFallbacks = 0;
  let customFallbacks = 0;
  runInNewContext(source, {
    exports: upstream,
    require: (name: string) => {
      if (name === 'os') return { release: () => scenario.release ?? '10.0' };
      if (name === 'path') return win32;
      if (name === 'child_process') return {
        execFile: (_executable: string, _args: string[], _options: object, callback: (error: Error | undefined, stdout: string, stderr: string) => void) => {
          callback(scenario.error, stdout, scenario.stderr ?? '');
        },
        execFileSync: () => {
          upstreamFallbacks++;
          if (scenario.fallbackFails) throw new Error('PowerShell unavailable');
          return '"test"';
        },
      };
      if (name === 'builder-util-runtime') return require(name);
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  const custom = createWindowsSignatureVerifier(async (_executable, args, options) => {
    if (args.at(-1)?.endsWith('ConvertTo-Json test"')) {
      expect(options.timeout).toBe(10_000);
      expect(options.shell).toBe(false);
      customFallbacks++;
      if (scenario.fallbackFails) throw new Error('PowerShell unavailable');
      return { stdout: '"test"', stderr: '' };
    }
    if (scenario.error) throw scenario.error;
    return { stdout, stderr: scenario.stderr ?? '' };
  }, () => scenario.release ?? '10.0');
  const classify = async (result: Promise<string | null>) => {
    try { return await result === null ? 'accepted' : 'rejected'; }
    catch { return 'threw'; }
  };
  const expected = await classify(upstream.verifySignature!([publisher], path, { info() {}, warn() {} }));
  expect(await classify(custom([publisher], path))).toBe(expected);
  expect(customFallbacks).toBe(upstreamFallbacks);
  return expected;
}

it('matches electron-updater when the signature result has no file path', async () => {
  expect(await outcomes({ data: { ...signature, Path: undefined } })).toBe('accepted');
});

it('matches electron-updater when PowerShell and its fallback both fail', async () => {
  expect(await outcomes({ error: new Error('PowerShell unavailable'), fallbackFails: true })).toBe('accepted');
});

it('matches electron-updater on Windows 6.x, including the Windows 6.3 exception', async () => {
  for (const release of ['6.0', '6.1', '6.2', '6.3', '10.0']) {
    expect(await outcomes({ release, error: new Error('PowerShell unavailable') })).toBe(release.startsWith('6.') && release !== '6.3' ? 'accepted' : 'threw');
  }
});

it('matches electron-updater for path mismatches and malformed signer data', async () => {
  for (const data of [{ ...signature, Path: 'C:\\Other\\update.exe' }, { ...signature, SignerCertificate: null }, { ...signature, SignerCertificate: {} }]) {
    for (const fallbackFails of [false, true]) await outcomes({ data, fallbackFails });
  }
});

it('matches electron-updater for stderr and signature status results', async () => {
  for (const fallbackFails of [false, true]) await outcomes({ stderr: 'PowerShell failed', fallbackFails });
  for (const Status of [0, 1, 2, 3, 4, 5, 6, '0', undefined]) await outcomes({ data: { ...signature, Status } });
});
