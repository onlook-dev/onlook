import { claudeBinaryPath } from '../agent-host/cli-path.js';
import { type Env, userEnv } from '../env/shell-env.js';
import { log } from '../log/index.js';
import { envWithout } from '../env/child.js';
import { readSwitch } from '../env/dev-switches.js';
import { readEnvSwitch } from '../env/switch.js';

const logger = log('claude');

/** A child inheriting these reads as nested inside a foreign session. `ANTHROPIC_API_KEY` is absent on purpose (ONL-2186). */
export const STUDIO_SESSION_VARS = [
  'CLAUDE_CODE_ENTRYPOINT',
  'CLAUDECODE',
  'CLAUDE_CODE_MESSAGING_SOCKET',
  'CLAUDE_CODE_MESSAGING_TOKEN',
] as const;

export function scrubStudioSession(env: Env): Env {
  return envWithout(env, STUDIO_SESSION_VARS);
}

/** Studio's process value beats the login shell's, so a driven run's store stays scratch; the login is the keychain item `CLAUDE_SECURESTORAGE_CONFIG_DIR` names, else one keyed by this dir. */
export function pinClaudeConfigDir(env: Env, processEnv?: NodeJS.ProcessEnv): Env {
  const dir = readEnvSwitch('CLAUDE_CONFIG_DIR', processEnv);
  return dir === undefined ? env : { ...env, CLAUDE_CONFIG_DIR: dir };
}

export async function claudeChildEnv(): Promise<Env> {
  return pinClaudeConfigDir(scrubStudioSession(await userEnv()));
}

let warnedAboutBin = false;

/** `STUDIO_CLAUDE_BIN` is a harness seat: `process.env`, not the login shell. */
export function claudeBinary(env?: NodeJS.ProcessEnv): string | undefined {
  const override = readSwitch('claudeBin', env);
  if (override) {
    if (!warnedAboutBin) {
      warnedAboutBin = true;
      logger.warn('STUDIO_CLAUDE_BIN is set: the sign-in binary is not the pinned one');
    }
    return override;
  }
  return claudeBinaryPath();
}

export type OpenExternal = (url: string) => Promise<void>;

export function openExternalForClaude(open: OpenExternal, env?: NodeJS.ProcessEnv): OpenExternal {
  if (readSwitch('claudeOpen', env) === '0') {
    return async () => {
      logger.info('STUDIO_CLAUDE_OPEN=0: not opening the sign-in page');
    };
  }
  return open;
}

export function resetClaudeEnvForTests(): void {
  warnedAboutBin = false;
}
