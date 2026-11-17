import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { CODEX_API_KEY_PLAN } from '@studio/events';

import { checkHealth, resolveCodex } from '../agent-host/appserver/resolve.js';
import { appServerToolSpecs, inertToolSinks } from '../agent-host/appserver/tools.js';
import { AppServerTransport } from '../agent-host/appserver/transport.js';
import { userEnv } from '../env/shell-env.js';
import { CODEX_VERSION } from './paths.js';

/** `validating` offers the user no button; an unbounded request is a spinner only force-quit ends. */
const REQUEST_TIMEOUT_MS = 30_000;

/** Also the anchor `codexVersionFrom` parses on. */
export const CODEX_CLIENT_NAME = 'onlook-studio';

/** `broken` offers a re-download, so an account that will not answer is `signed-out`, never `broken` (ONL-2020). */
type ValidationOutcome = 'ok' | 'signed-out' | 'outdated' | 'broken' | 'failed';

export type ValidationFailure = 'unusable' | 'no-version' | 'unresponsive' | 'home';

export interface ValidationResult {
  outcome: ValidationOutcome;
  /** Carries paths and raw errors on `broken`: the log reads it, the setup card does not (ONL-2459). */
  message: string;
  failure?: ValidationFailure;
  version?: string;
  account?: string;
  email?: string;
  plan?: string;
}

/** Anchored on the client name: the user agent carries three other version-shaped tokens (OS, terminal, our own version). */
export function codexVersionFrom(
  userAgent: string,
  clientName: string = CODEX_CLIENT_NAME,
): string | undefined {
  const escaped = clientName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`^${escaped}/(\\S+)`).exec(userAgent);
  return match?.[1];
}

export function compareCodexVersions(a: string, b: string): number {
  const [coreA = '', preA] = a.split('-', 2);
  const [coreB = '', preB] = b.split('-', 2);
  const partsA = coreA.split('.').map(Number);
  const partsB = coreB.split('.').map(Number);
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i += 1) {
    const left = partsA[i] ?? 0;
    const right = partsB[i] ?? 0;
    if (Number.isNaN(left) || Number.isNaN(right)) return 0;
    if (left !== right) return left < right ? -1 : 1;
  }
  if (preA === preB) return 0;
  if (preA === undefined) return 1;
  if (preB === undefined) return -1;
  return preA < preB ? -1 : 1;
}

export function meetsCodexFloor(version: string, floor: string = CODEX_VERSION): boolean {
  return compareCodexVersions(version, floor) >= 0;
}

interface AccountResponse {
  account?: { type?: string; planType?: string; email?: string | null } | null;
  requiresOpenaiAuth?: boolean;
}

/** A key stored in `~/.codex/auth.json` connects: the no-API-keys line is about Studio's own doors, not a credential the binary holds. */
export function accountVerdict(response: AccountResponse): {
  usable: boolean;
  description: string;
  email?: string;
  plan?: string;
} {
  const account = response.account;
  if (account === null || account === undefined) {
    return { usable: false, description: 'no account is signed in' };
  }
  if (account.type === 'chatgpt') {
    return {
      usable: true,
      description: `signed in to ChatGPT${account.planType ? ` (${account.planType})` : ''}`,
      ...(typeof account.email === 'string' && account.email.length > 0 ? { email: account.email } : {}),
      ...(account.planType ? { plan: account.planType } : {}),
    };
  }
  if (account.type === 'apiKey') {
    // The email codex reports for a key account is the key's owner, not a signed-in identity.
    return {
      usable: true,
      description: 'signed in to codex with an OpenAI API key',
      plan: CODEX_API_KEY_PLAN,
    };
  }
  return {
    usable: false,
    description: `the ChatGPT agent on this computer is signed in with an account Onlook does not support (${account.type ?? 'unknown'}). Onlook needs a ChatGPT subscription`,
  };
}

export interface ValidateOptions {
  root: string;
  /** Test seam: a scratch home is logged out, so the product validates the real one. */
  codexHome?: string;
}

export async function validateCodex(options: ValidateOptions): Promise<ValidationResult> {
  // A codex missing its `codex-code-mode-host` sibling spawns and handshakes fine; only the on-disk check sees it.
  const resolved = resolveCodex(options.root);
  const health = checkHealth(resolved, options.root);
  if (!health.ok || resolved === null) {
    return { outcome: 'broken', failure: 'unusable', message: health.problems.join('; ') };
  }

  const env = await userEnv();
  const codexHome = options.codexHome ?? env['CODEX_HOME'];
  if (codexHome !== undefined) {
    try {
      await mkdir(codexHome, { recursive: true });
    } catch (error) {
      return { outcome: 'failed', failure: 'home', message: String(error) };
    }
  }

  const cwd = await mkdtemp(join(tmpdir(), 'studio-codex-validate-'));
  const errors: string[] = [];
  let stderr = '';
  const transport = new AppServerTransport(
    {
      bin: resolved.bin,
      cwd,
      env,
      ...(options.codexHome === undefined ? {} : { codexHome: options.codexHome }),
    },
    {
      onStderr: (chunk) => (stderr += chunk),
      onMalformed: (raw) => errors.push(`unparseable frame: ${raw.slice(0, 200)}`),
      onServerRequest: (method, id) => transport.respondError(id, `validation does not answer ${method}`),
    },
  );

  try {
    const initialized = (await transport.request(
      'initialize',
      {
        clientInfo: { name: CODEX_CLIENT_NAME, title: 'Onlook', version: '0.0.0' },
        capabilities: { experimentalApi: true },
      },
      REQUEST_TIMEOUT_MS,
    )) as { userAgent?: string };

    const userAgent = initialized.userAgent ?? '';
    const version = codexVersionFrom(userAgent);
    if (version === undefined) {
      return {
        outcome: 'broken',
        failure: 'no-version',
        message: `could not read a codex version from the handshake (userAgent: ${userAgent})`,
      };
    }
    if (!meetsCodexFloor(version)) {
      return {
        outcome: 'outdated',
        message: `this codex is ${version}; Studio needs ${CODEX_VERSION} or newer`,
        version,
      };
    }

    transport.notify('initialized');

    const account = accountVerdict(
      // `refreshToken: true` here writes refreshed tokens back into the user's auth.json.
      (await transport.request('account/read', {}, REQUEST_TIMEOUT_MS)) as AccountResponse,
    );
    if (!account.usable) {
      return {
        outcome: 'signed-out',
        message: account.description,
        version,
        account: account.description,
      };
    }

    // Validation opens no turn: nothing caches the verdict across launches (ONL-2186).
    await transport.request(
      'thread/start',
      {
        cwd,
        // Only this keeps the thread out of the user's real `~/.codex`; `-c ephemeral=true` is silently ignored.
        ephemeral: true,
        sandbox: 'read-only',
        // Safe only because this opens no turn: for a session `'never'` means never ALLOW a host tool (ONL-2190).
        approvalPolicy: 'never',
        dynamicTools: appServerToolSpecs(inertToolSinks()),
      },
      REQUEST_TIMEOUT_MS,
    );

    return {
      outcome: 'ok',
      message: account.description,
      version,
      account: account.description,
      ...(account.email === undefined ? {} : { email: account.email }),
      ...(account.plan === undefined ? {} : { plan: account.plan }),
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    const noise = [...errors, stderr.trim()].filter(Boolean).join('; ');
    return { outcome: 'failed', failure: 'unresponsive', message: `${detail}${noise ? ` (${noise})` : ''}` };
  } finally {
    await transport.close();
    await rm(cwd, { recursive: true, force: true });
  }
}
