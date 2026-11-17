import { afterEach, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { notarizeAndStaple, notaryCredentials, packageMac, stapleAndValidate, validateStapledTicket, type CommandResult, type NotaryCommands } from './mac-notarization.js';

const success: CommandResult = { status: 0, stdout: '', stderr: '' };
const disconnected: CommandResult = {
  status: 68,
  stdout: 'CloudKit\'s response is inconsistent with expections: (null)',
  stderr: 'NSURLErrorDomain Code=-1005 "The network connection was lost." api.apple-cloudkit.com/records/lookup',
};

function fixture(failures: CommandResult[]) {
  const calls: string[][] = [];
  const waits: number[] = [];
  const logs: string[] = [];
  const commands: NotaryCommands = {
    run(command, args) {
      calls.push([command, ...args]);
      if (args[0] === 'notarytool') return { ...success, stdout: '{"status":"Accepted"}' };
      if (args[0] === 'stapler' && args[1] === 'staple') return failures.shift() ?? success;
      return success;
    },
    async wait(milliseconds) { waits.push(milliseconds); },
    log(message) { logs.push(message); },
  };
  return { commands, calls, waits, logs };
}

test('a cut is notarized after two -1005 staple failures without resubmitting to Apple', async () => {
  const fake = fixture([disconnected, disconnected]);
  expect(await notarizeAndStaple('Onlook.app', 'upload.zip', ['--password', 'secret'], fake.commands)).toBe('notarized');
  expect(fake.waits).toEqual([15_000, 30_000]);
  expect(fake.calls.filter((call) => call[1] === 'notarytool')).toHaveLength(1);
  expect(fake.calls.filter((call) => call[2] === 'staple')).toHaveLength(3);
  expect(fake.calls.at(-1)).toEqual(['xcrun', 'stapler', 'validate', 'Onlook.app']);
  expect(fake.logs.join('\n')).not.toContain('secret');
});

test('a cut aborts after the last transient staple attempt, including under --require-notarized', async () => {
  const fake = fixture(Array.from({ length: 5 }, () => disconnected));
  const builds: boolean[] = [];
  const errors: unknown[] = [];
  await expect(packageMac(async (notarize) => {
    builds.push(notarize);
    try {
      await notarizeAndStaple('Onlook.app', 'upload.zip', [], fake.commands);
      return 0;
    } catch (error) {
      errors.push(error);
      return 1;
    }
  }, { notarize: true, requireNotarized: true, dirOnly: false }, () => {
    throw new Error('A required notarization must not fall back');
  })).rejects.toThrow('electron-builder exited 1');
  expect(builds).toEqual([true]);
  expect(String(errors[0])).toContain('attempt 5/5');
  expect(fake.waits).toEqual([15_000, 30_000, 60_000, 120_000]);
  expect(fake.calls.filter((call) => call[1] === 'notarytool')).toHaveLength(1);
  expect(fake.calls.filter((call) => call[2] === 'staple')).toHaveLength(5);
});

test('a non-transient staple error aborts without retry', async () => {
  const fake = fixture([{ ...success, status: 65, stderr: 'The signature is invalid' }]);
  await expect(notarizeAndStaple('Onlook.app', 'upload.zip', [], fake.commands)).rejects.toThrow();
  expect(fake.waits).toEqual([]);
  expect(fake.calls.filter((call) => call[2] === 'staple')).toHaveLength(1);
});

test('an Error 68 ticket lookup retries without an NSURLErrorDomain code', async () => {
  const fake = fixture([{ ...disconnected, stderr: '' }]);
  await stapleAndValidate('Onlook.app', fake.commands);
  expect(fake.waits).toEqual([15_000]);
});

test('Error 68 alone and a ticket that was never issued fail immediately', async () => {
  for (const stderr of ['The staple and validate action failed! Error 68.', 'Record not found at api.apple-cloudkit.com/records/lookup']) {
    const fake = fixture([{ ...success, status: 68, stderr }]);
    await expect(stapleAndValidate('Onlook.app', fake.commands)).rejects.toThrow('non-transient');
    expect(fake.waits).toEqual([]);
  }
});

test('a timeout retries stapling but a command that cannot start does not', async () => {
  const timeout = fixture([{ ...success, status: null, timedOut: true }]);
  await stapleAndValidate('Onlook.app', timeout.commands);
  expect(timeout.waits).toEqual([15_000]);
  const missing = fixture([{ ...success, status: null }]);
  await expect(stapleAndValidate('Onlook.app', missing.commands)).rejects.toThrow('non-transient');
  expect(missing.waits).toEqual([]);
});

test('validation retries only validation and never resubmits an accepted app', async () => {
  const fake = fixture([]);
  const run = fake.commands.run;
  let validations = 0;
  fake.commands.run = (command, args) => {
    const result = run(command, args);
    if (args[1] === 'validate' && validations++ === 0) return disconnected;
    return result;
  };
  await notarizeAndStaple('Onlook.app', 'upload.zip', [], fake.commands);
  expect(fake.calls.filter((call) => call[2] === 'staple')).toHaveLength(1);
  expect(fake.calls.filter((call) => call[2] === 'validate')).toHaveLength(2);
  expect(fake.calls.filter((call) => call[1] === 'notarytool')).toHaveLength(1);
  expect(fake.waits).toEqual([15_000]);
});

test('an invalid notarization or failed submission never attempts stapling', async () => {
  for (const submission of [{ ...success, stdout: '{"status":"Invalid"}' }, { ...success, status: 1 }]) {
    const fake = fixture([]);
    const run = fake.commands.run;
    fake.commands.run = (command, args) => {
      const result = run(command, args);
      return args[0] === 'notarytool' ? submission : result;
    };
    await expect(notarizeAndStaple('Onlook.app', 'upload.zip', [], fake.commands)).rejects.toThrow();
    expect(fake.calls.filter((call) => call[1] === 'stapler')).toHaveLength(0);
    expect(fake.waits).toEqual([]);
  }
});

test('a successful staple cannot hide a permanently invalid ticket', async () => {
  const fake = fixture([]);
  const run = fake.commands.run;
  fake.commands.run = (command, args) => {
    const result = run(command, args);
    return args[1] === 'validate' ? { ...success, status: 65, stderr: 'Could not validate ticket' } : result;
  };
  await expect(notarizeAndStaple('Onlook.app', 'upload.zip', [], fake.commands)).rejects.toThrow('Stapler validate failed');
  expect(fake.waits).toEqual([]);
});

test('retry logs include each attempt and a safe reason, never raw command output or credentials', async () => {
  const fake = fixture([{ ...disconnected, stderr: `${disconnected.stderr} password=private-secret` }]);
  await notarizeAndStaple('Onlook.app', 'upload.zip', ['--password', 'private-secret'], fake.commands);
  expect(fake.logs).toContain('Stapler staple attempt 1/5');
  expect(fake.logs).toContain('Stapler staple failed at attempt 1/5: network connection lost (-1005)');
  expect(fake.logs).toContain('Retrying staple in 15 seconds');
  expect(fake.logs).toContain('Stapler staple attempt 2/5');
  expect(fake.logs.join('\n')).not.toContain('private-secret');
});

test('only an optional notarization may degrade to a signed cut and it receives no notarization request', async () => {
  const builds: boolean[] = [];
  let fallbacks = 0;
  expect(await packageMac((notarize) => {
    builds.push(notarize);
    return notarize ? 1 : 0;
  }, { notarize: true, requireNotarized: false, dirOnly: false }, () => { fallbacks++; })).toBe(true);
  expect(builds).toEqual([true, false]);
  expect(fallbacks).toBe(1);
});

test('notary authentication supports API keys and Apple ID without changing the environment', () => {
  expect(notaryCredentials({ APPLE_API_KEY: '/key.p8', APPLE_API_KEY_ID: 'id', APPLE_API_ISSUER: 'issuer' })).toEqual([
    '--key', '/key.p8', '--key-id', 'id', '--issuer', 'issuer',
  ]);
  const env = { APPLE_ID: 'developer', APPLE_APP_SPECIFIC_PASSWORD: 'secret', APPLE_TEAM_ID: 'team' };
  expect(notaryCredentials(env)).toEqual(['--apple-id', 'developer', '--password', 'secret', '--team-id', 'team']);
  expect(env.APPLE_APP_SPECIFIC_PASSWORD).toBe('secret');
  expect(() => notaryCredentials({})).toThrow('credentials are incomplete');
});

test('packaging uses the signed-app hook instead of electron-builder automatic notarization', () => {
  const config = readFileSync(new URL('../apps/studio/electron-builder.yml', import.meta.url), 'utf8');
  expect(config).toContain('afterSign: ./build/notarize-app.mjs');
  expect(config).toContain('notarize: false');
});

test('certificate trust errors take precedence over Error 68, disconnects and timeouts', async () => {
  for (const diagnostic of [
    'Certificate trust evaluation did not return expected result. CSSMERRTPNOTTRUSTED. NSURLErrorDomain Code=-999',
    'CSSMERR_TP_NOT_TRUSTED',
    'NSURLErrorDomain Code=-1202',
    'certificate is not trusted',
  ]) {
    const fake = fixture([{ ...disconnected, timedOut: true, stderr: `${diagnostic}\n${disconnected.stderr}` }]);
    await expect(stapleAndValidate('Onlook.app', fake.commands)).rejects.toThrow('non-transient');
    expect(fake.waits).toEqual([]);
    expect(fake.calls.filter((call) => call[2] === 'staple')).toHaveLength(1);
  }
});

test('final validation recovers without resubmitting or restapling an already validated app', async () => {
  const fake = fixture([]);
  await notarizeAndStaple('Onlook.app', 'upload.zip', [], fake.commands);
  const run = fake.commands.run;
  let failures = 2;
  fake.commands.run = (command, args) => {
    const result = run(command, args);
    return args[1] === 'validate' && failures-- > 0 ? disconnected : result;
  };
  await validateStapledTicket('Onlook.app', fake.commands);
  expect(fake.waits).toEqual([15_000, 30_000]);
  expect(fake.calls.filter((call) => call[2] === 'staple')).toHaveLength(1);
  expect(fake.calls.filter((call) => call[1] === 'notarytool')).toHaveLength(1);
  const cut = readFileSync(new URL('./cut-dmg.ts', import.meta.url), 'utf8');
  expect(cut).toContain('await validateStapledTicket(packagedApp)');
  expect(cut).not.toContain("capture('xcrun', ['stapler', 'validate'");
});

test('final validation exhaustion cannot certify an app as notarized', async () => {
  const fake = fixture([]);
  fake.commands.run = () => disconnected;
  await expect(validateStapledTicket('Onlook.app', fake.commands)).rejects.toThrow('Stapler validate failed at attempt 5/5');
  expect(fake.waits).toEqual([15_000, 30_000, 60_000, 120_000]);
});

test('an unreadable notarization response cannot expose command output in errors', async () => {
  const fake = fixture([]);
  fake.commands.run = (_command, args) => args[0] === 'notarytool'
    ? { ...success, stdout: 'private-secret' }
    : success;
  await expect(notarizeAndStaple('Onlook.app', 'upload.zip', [], fake.commands)).rejects.toThrow('unreadable notarization result');
  expect(fake.logs.join('\n')).not.toContain('private-secret');
});

const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });

test('the real signed-app hook reaches the Bun entrypoint and validates before returning to packaging', () => {
  const root = mkdtempSync(join(tmpdir(), 'onlook-notary-hook-'));
  roots.push(root);
  const log = join(root, 'commands.log');
  writeFileSync(join(root, 'ditto'), '#!/bin/sh\nprintf "archive\\n" >> "$FAKE_NOTARY_LOG"\n', { mode: 0o755 });
  writeFileSync(join(root, 'xcrun'), `#!/bin/sh
printf '%s %s\\n' "$1" "$2" >> "$FAKE_NOTARY_LOG"
case "$1:$2" in
  notarytool:submit) printf '{"status":"Accepted"}';;
  stapler:staple) exit 0;;
  stapler:validate) exit "\${FAKE_VALIDATE_STATUS:-0}";;
  *) exit 99;;
esac
`, { mode: 0o755 });
  const hook = new URL('../apps/studio/build/notarize-app.mjs', import.meta.url).href;
  const context = { electronPlatformName: 'darwin', appOutDir: '/fake signed output', packager: { appInfo: { productFilename: 'Onlook' } } };
  const source = `import afterSign from ${JSON.stringify(hook)}; afterSign(${JSON.stringify(context)});`;
  const env = {
    ...process.env,
    PATH: `${root}${delimiter}${process.env['PATH']}`,
    ONLOOK_NOTARIZE_APP: '1',
    APPLE_API_KEY: '/fake/key.p8', APPLE_API_KEY_ID: 'fake-id', APPLE_API_ISSUER: 'fake-issuer',
    FAKE_NOTARY_LOG: log,
  };
  const run = (overrides: NodeJS.ProcessEnv = {}) => spawnSync('node', ['--input-type=module', '--eval', source], {
    encoding: 'utf8', env: { ...env, ...overrides }, timeout: 10_000,
  });
  const accepted = run();
  expect(accepted.status).toBe(0);
  expect(readFileSync(log, 'utf8').trim().split('\n')).toEqual(['archive', 'notarytool submit', 'stapler staple', 'stapler validate']);
  expect(accepted.stdout).toContain('Stapler validate succeeded');
  const rejected = run({ FAKE_VALIDATE_STATUS: '65' });
  expect(rejected.status).not.toBe(0);
  expect(rejected.stderr).toContain('App notarization or ticket stapling failed');
  writeFileSync(log, '');
  expect(run({ ONLOOK_NOTARIZE_APP: '0' }).status).toBe(0);
  expect(readFileSync(log, 'utf8')).toBe('');
});
