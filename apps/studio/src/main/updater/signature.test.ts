import { describe, expect, it } from 'bun:test';
import { createWindowsSignatureVerifier } from './signature.js';

const publisher = 'CN=Example Software, O=Example Software, C=US';

function validSignature(path: string) {
  return { Status: 0, Path: path, SignerCertificate: { Subject: publisher } };
}

describe('Windows update signatures', () => {
  for (const apostrophe of ["'", '\u2018', '\u2019', '\u201a', '\u201b']) {
    it(`verifies an update in a profile path containing U+${apostrophe.charCodeAt(0).toString(16).toUpperCase()}`, async () => {
      const path = `C:\\Profiles\\Test${apostrophe}Profile\\AppData\\Local\\onlook-updater\\pending\\update.exe`;
      let calls = 0;
      const verify = createWindowsSignatureVerifier(async (executable, args, options) => {
        calls++;
        expect(executable.replaceAll('\\', '/')).toEndWith('/System32/cmd.exe');
        expect(options.shell).toBe(false);
        expect(options.timeout).toBe(20_000);
        expect(options.encoding).toBe('utf8');
        expect(options.windowsVerbatimArguments).toBe(true);
        expect(Object.keys(options.env ?? {}).filter(name => name.toLowerCase() === 'psmodulepath')).toEqual([]);
        expect(options.env?.['ONLOOK_UPDATE_FILE']).toBe(path);
        expect(args.join(' ')).not.toContain(path);
        expect(args.at(-1)).toContain('-LiteralPath $env:ONLOOK_UPDATE_FILE');
        expect(args.at(-1)).toStartWith('chcp 65001 >NUL & ');
        return { stdout: JSON.stringify(validSignature(path)), stderr: '' };
      });
      expect(await verify([publisher], path)).toBeNull();
      expect(calls).toBe(1);
    });
  }

  const path = 'C:\\Profiles\\Test Profile\\AppData\\Local\\onlook-updater\\pending\\update.exe';
  const verifyResult = (data: unknown, publishers = [publisher]) =>
    createWindowsSignatureVerifier(async () => ({ stdout: JSON.stringify(data), stderr: '' }))(publishers, path);

  it('removes inherited module paths regardless of environment key casing', async () => {
    const previous = process.env['PSMODULEPATH'];
    process.env['PSMODULEPATH'] = 'C:\\ExampleModules';
    try {
      let inherited: string[] = [];
      const verify = createWindowsSignatureVerifier(async (_executable, _args, options) => {
        inherited = Object.keys(options.env ?? {}).filter(name => name.toLowerCase() === 'psmodulepath');
        return { stdout: JSON.stringify(validSignature(path)), stderr: '' };
      });
      expect(await verify([publisher], path)).toBeNull();
      expect(inherited).toEqual([]);
    } finally {
      if (previous === undefined) delete process.env['PSMODULEPATH'];
      else process.env['PSMODULEPATH'] = previous;
    }
  });

  it('accepts any configured publisher and preserves full distinguished-name matching', async () => {
    expect(await verifyResult(validSignature(path), ['CN=Other, O=Other', publisher])).toBeNull();
    expect(await verifyResult(validSignature(path), ['CN=Example Software, O=Example Software'])).toBeNull();
    expect(await verifyResult(validSignature(path), ['CN=Example Software, O=Other'])).not.toBeNull();
  });

  it('preserves common-name matching for publishers without a distinguished name', async () => {
    expect(await verifyResult(validSignature(path), ['Example Software'])).toBeNull();
    expect(await verifyResult(validSignature(path), ['Other Software'])).not.toBeNull();
    expect(await verifyResult(validSignature(path), [])).not.toBeNull();
  });

  it('rejects unsigned and invalid signatures even when the publisher matches', async () => {
    for (const Status of [1, 2, 3, 4, 5, 6, '0', undefined]) {
      expect(await verifyResult({ ...validSignature(path), Status })).not.toBeNull();
    }
  });

  it('rejects a signature for another file and accepts a missing file path like electron-updater', async () => {
    await expect(verifyResult(validSignature('C:\\Other\\update.exe'))).rejects.toThrow();
    expect(await verifyResult({ ...validSignature(path), Path: undefined })).toBeNull();
    expect(await verifyResult(validSignature(path.replaceAll('\\', '/')))).toBeNull();
  });

  it('rejects a missing signer or subject', async () => {
    await expect(verifyResult({ ...validSignature(path), SignerCertificate: null })).rejects.toThrow();
    await expect(verifyResult({ ...validSignature(path), SignerCertificate: {} })).rejects.toThrow();
  });

  it('rejects command errors, stderr and malformed responses', async () => {
    const failed = createWindowsSignatureVerifier(async (_executable, args) => {
      if (!args.at(-1)?.endsWith('ConvertTo-Json test"')) throw new Error('PowerShell failed');
      return { stdout: '"test"', stderr: '' };
    });
    await expect(failed([publisher], path)).rejects.toThrow('PowerShell failed');
    const withStderr = createWindowsSignatureVerifier(async () => ({ stdout: JSON.stringify(validSignature(path)), stderr: 'failed' }));
    await expect(withStderr([publisher], path)).rejects.toThrow();
    const malformed = createWindowsSignatureVerifier(async () => ({ stdout: 'not JSON', stderr: '' }));
    await expect(malformed([publisher], path)).rejects.toThrow();
  });
});
