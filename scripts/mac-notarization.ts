import { spawnSync } from 'node:child_process';

export interface CommandResult {
  status: number | null;
  stdout: string;
  stderr: string;
  timedOut?: boolean;
}

export interface NotaryCommands {
  run(command: string, args: string[]): CommandResult;
  wait(milliseconds: number): Promise<void>;
  log(message: string): void;
}

export const notaryCommands: NotaryCommands = {
  run(command, args) {
    const result = spawnSync(command, args, {
      encoding: 'utf8',
      timeout: args[0] === 'stapler' ? 120_000 : undefined,
    });
    return {
      status: result.status,
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      timedOut: (result.error as NodeJS.ErrnoException | undefined)?.code === 'ETIMEDOUT',
    };
  },
  wait: (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  log: (message) => console.log(message),
};

export async function stapleAndValidate(path: string, commands = notaryCommands): Promise<void> {
  await runStapler('staple', path, commands);
  await validateStapledTicket(path, commands);
}

export async function validateStapledTicket(path: string, commands = notaryCommands): Promise<void> {
  await runStapler('validate', path, commands);
}

async function runStapler(action: 'staple' | 'validate', path: string, commands: NotaryCommands): Promise<void> {
  const delays = [15_000, 30_000, 60_000, 120_000];
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    commands.log(`Stapler ${action} attempt ${attempt + 1}/${delays.length + 1}`);
    const result = commands.run('xcrun', ['stapler', action, path]);
    if (result.status === 0) {
      commands.log(`Stapler ${action} succeeded`);
      return;
    }
    const reason = transientStapleFailure(result);
    const failure = `Stapler ${action} failed at attempt ${attempt + 1}/${delays.length + 1}: ${reason ?? `non-transient error (exit ${result.status})`}`;
    commands.log(failure);
    const delay = delays[attempt];
    if (!reason || delay === undefined) throw new Error(failure);
    commands.log(`Retrying ${action} in ${delay / 1000} seconds`);
    await commands.wait(delay);
  }
}

function transientStapleFailure(result: CommandResult): string | undefined {
  const output = `${result.stdout}\n${result.stderr}`;
  if (/invalid signature|signature is invalid|not signed|revoked|not notarized|record not found|no ticket|ticket.*not found|could not find.*ticket|unsupported/i.test(output)) return undefined;
  if (/certificate trust|CSSMERR_?TP_?NOT_?TRUSTED|certificate.*(?:expired|untrusted|not trusted|invalid)|NSURLErrorDomain\s+Code=-120[0-6]\b/i.test(output)) return undefined;
  const networkCode = output.match(/NSURLErrorDomain\s+Code=(-\d+)\b/)?.[1];
  if (networkCode && networkCode !== '-1005' && networkCode !== '-1001') return undefined;
  if (/NSURLErrorDomain\s+Code=-1005\b/.test(output)) return 'network connection lost (-1005)';
  if (result.timedOut || /NSURLErrorDomain\s+Code=-1001\b|ETIMEDOUT|request timed out/i.test(output)) return 'network request timed out';
  if (result.status === 68 && /api\.apple-cloudkit\.com.*records\/lookup|CloudKit's response is inconsistent with expections: \(null\)/s.test(output)) {
    return 'Apple ticket lookup unavailable (68)';
  }
  return undefined;
}

export async function packageMac(
  build: (notarize: boolean) => number | Promise<number>,
  options: { notarize: boolean; requireNotarized: boolean; dirOnly: boolean },
  reportFallback: () => void,
): Promise<boolean> {
  const status = await build(options.notarize);
  if (status === 0) return false;
  if (!options.notarize || options.requireNotarized || options.dirOnly) {
    throw new Error(`electron-builder exited ${status}`);
  }
  reportFallback();
  const fallbackStatus = await build(false);
  if (fallbackStatus !== 0) throw new Error(`electron-builder exited ${fallbackStatus}`);
  return true;
}

export async function notarizeAndStaple(
  app: string,
  archive: string,
  credentials: string[],
  commands = notaryCommands,
): Promise<'notarized'> {
  if (commands.run('ditto', ['-c', '-k', '--sequesterRsrc', '--keepParent', app, archive]).status !== 0) {
    throw new Error('Could not archive the signed app for notarization');
  }
  commands.log('Submitting the signed app to Apple for notarization');
  const submission = commands.run('xcrun', ['notarytool', 'submit', archive, ...credentials, '--wait', '--output-format', 'json']);
  if (submission.status !== 0) throw new Error('Apple notarization failed; no stapling was attempted');
  let verdict: unknown;
  try {
    verdict = JSON.parse(submission.stdout);
  } catch {
    throw new Error('Apple returned an unreadable notarization result; no stapling was attempted');
  }
  if (!verdict || typeof verdict !== 'object' || !('status' in verdict) || verdict.status !== 'Accepted') {
    throw new Error('Apple did not accept the notarization; no stapling was attempted');
  }
  commands.log('Apple accepted the notarization');
  await stapleAndValidate(app, commands);
  return 'notarized';
}

export function notaryCredentials(env: NodeJS.ProcessEnv): string[] {
  if (env['APPLE_API_KEY'] && env['APPLE_API_KEY_ID'] && env['APPLE_API_ISSUER']) {
    return ['--key', env['APPLE_API_KEY'], '--key-id', env['APPLE_API_KEY_ID'], '--issuer', env['APPLE_API_ISSUER']];
  }
  if (env['APPLE_ID'] && env['APPLE_APP_SPECIFIC_PASSWORD'] && env['APPLE_TEAM_ID']) {
    return ['--apple-id', env['APPLE_ID'], '--password', env['APPLE_APP_SPECIFIC_PASSWORD'], '--team-id', env['APPLE_TEAM_ID']];
  }
  throw new Error('Notarization credentials are incomplete');
}
