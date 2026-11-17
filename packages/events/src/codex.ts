/** `failed` retries, `broken` and `outdated` reinstall, `unsupported` offers nothing (ONL-2081). */
export type CodexSetupStatus = CodexSetupState['status'];

type NoCodexAccount = { email?: never; plan?: never };
type NoCodexLogin = { authUrl?: never; command?: never };

export type CodexSetupState =
  | (({ status: 'idle' } | { status: 'checking' } | { status: 'validating' }) & NoCodexAccount & NoCodexLogin & { percent?: never; message?: never })
  | ({ status: 'downloading'; percent?: number; message?: string } & NoCodexAccount & NoCodexLogin)
  | ({ status: 'ready'; email?: string; plan?: string; percent?: never; message?: never } & NoCodexLogin)
  | (({ status: 'failed'; message?: string } | { status: 'broken'; message?: string } | { status: 'unsupported'; message: string } | { status: 'outdated'; message: string }) & NoCodexAccount & NoCodexLogin & { percent?: never })
  | ({ status: 'signed-out'; message?: string; command?: string; authUrl?: never; percent?: never } & NoCodexAccount)
  | ({ status: 'signing-in'; authUrl?: string; command?: never; percent?: never; message?: never } & NoCodexAccount);

export const CODEX_API_KEY_PLAN = 'api-key';

export const IDLE_CODEX_SETUP_STATE: CodexSetupState = { status: 'idle' };
