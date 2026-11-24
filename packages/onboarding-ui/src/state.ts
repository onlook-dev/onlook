import type { HarnessId, SetupHarnessId } from '@studio/events';

export const HARNESSES = ['claude', 'codex'] as const satisfies readonly HarnessId[];

/** No `not-installed`: the agent kit pins Claude's binary, so it cannot occur (ONL-2176). */
export type ClaudeSetupStateId = 'not-signed-in' | 'checking' | 'signing-in' | 'paste-code' | 'signed-in' | 'cannot-connect' | 'fallback';
export const CLAUDE_SETUP_STATES = [
  'not-signed-in',
  'checking',
  'signing-in',
  'paste-code',
  'signed-in',
  'cannot-connect',
  'fallback',
] as const satisfies readonly ClaudeSetupStateId[];

export type ChatGptSetupStateId =
  | 'not-set-up'
  | 'downloading'
  | 'checking'
  | 'not-signed-in'
  | 'signing-in'
  | 'connected'
  | 'setup-failed'
  | 'wont-start'
  | 'out-of-date'
  | 'fallback';
export const CHATGPT_SETUP_STATES = [
  'not-set-up',
  'downloading',
  'checking',
  'not-signed-in',
  'signing-in',
  'connected',
  'setup-failed',
  'wont-start',
  'out-of-date',
  'fallback',
] as const satisfies readonly ChatGptSetupStateId[];

export type SetupStateId = ClaudeSetupStateId | ChatGptSetupStateId;

/** What a failed check heard; each picks its sheet's copy and footer (ONL-2903). */
export type CannotConnectCause = 'usage-limit' | 'rate-limited' | 'billing' | 'no-answer' | 'service-error' | 'agent-error' | 'unreachable';
export const CANNOT_CONNECT_CAUSES = [
  'usage-limit',
  'rate-limited',
  'billing',
  'no-answer',
  'service-error',
  'agent-error',
  'unreachable',
] as const satisfies readonly CannotConnectCause[];

/** The other agent, offered as a choice with what it takes; `ready` once it is set up on this Mac (ONL-2903). */
export interface OtherAgentOffer {
  harness: SetupHarnessId;
  ready: boolean;
}

/** A sheet's own title and body, resolved by the host when the state id alone cannot say why (ONL-2903). */
export interface SheetCopy {
  title: string;
  body: string;
  /** The sign-in button's label, where the sheet asks for it again. */
  signIn?: string;
}

/** Resolved strings, never codes. Under `copy`, the dialog's code box holds `diagnostic` — the provider's words or its status — and never Studio's own sentence (ONL-2186, ONL-2903). */
export type SetupState =
  | { harness: 'claude'; state: 'not-signed-in'; detail?: string; copy?: SheetCopy; diagnostic?: string }
  | { harness: 'claude'; state: 'checking' | 'signing-in' }
  | { harness: 'claude'; state: 'paste-code'; code?: string; detail?: string }
  | { harness: 'claude'; state: 'signed-in'; email?: string; plan: string }
  | {
      harness: 'claude';
      state: 'cannot-connect';
      detail: string;
      runtimeUnavailable?: boolean;
      cause?: CannotConnectCause;
      copy?: SheetCopy;
      diagnostic?: string;
      /** Check again waits for this instant (epoch ms), and its label names it. */
      retryAt?: number;
      retryLabel?: string;
      /** The account page the ghost action opens exists for this plan. */
      hasAccountLink?: boolean;
      other?: OtherAgentOffer;
    }
  | { harness: 'claude'; state: 'fallback'; command: string; detail?: string }
  | { harness: 'codex'; state: 'not-set-up' | 'checking' | 'signing-in' }
  | { harness: 'codex'; state: 'not-signed-in'; detail?: string }
  | { harness: 'codex'; state: 'downloading'; percent: number }
  | { harness: 'codex'; state: 'connected'; email?: string; plan: string }
  | { harness: 'codex'; state: 'setup-failed' | 'wont-start'; detail: string; other?: OtherAgentOffer }
  | { harness: 'codex'; state: 'out-of-date'; detail: string }
  | { harness: 'codex'; state: 'fallback'; command: string; detail?: string };

export type ClaudeTileStateId = 'idle' | ClaudeSetupStateId;
export type ChatGptTileStateId = 'idle' | ChatGptSetupStateId;
export const CLAUDE_TILE_STATES = ['idle', ...CLAUDE_SETUP_STATES] as const satisfies readonly ClaudeTileStateId[];
export const CHATGPT_TILE_STATES = ['idle', ...CHATGPT_SETUP_STATES] as const satisfies readonly ChatGptTileStateId[];

export type ComingSoonId = 'opencode' | 'other';
export const COMING_SOON = ['opencode', 'other'] as const satisfies readonly ComingSoonId[];

export type HarnessTileState =
  | { kind: 'harness'; harness: 'claude'; state: ClaudeTileStateId }
  | { kind: 'harness'; harness: 'codex'; state: Exclude<ChatGptTileStateId, 'downloading'> }
  | { kind: 'harness'; harness: 'codex'; state: 'downloading'; percent: number }
  | { kind: 'coming-soon'; id: ComingSoonId };

export type TileMark = 'attention' | 'connected';

const ATTENTION: ReadonlySet<SetupStateId> = new Set(['fallback', 'setup-failed', 'wont-start', 'cannot-connect']);
const CONNECTED: ReadonlySet<SetupStateId> = new Set(['signed-in', 'connected']);

export function markFor(tile: HarnessTileState): TileMark | undefined {
  if (tile.kind !== 'harness' || tile.state === 'idle') return undefined;
  if (ATTENTION.has(tile.state)) return 'attention';
  if (CONNECTED.has(tile.state)) return 'connected';
  return undefined;
}

const BUSY: ReadonlySet<SetupStateId> = new Set(['signing-in', 'paste-code', 'downloading', 'checking']);

export function isBusy(state: SetupStateId): boolean {
  return BUSY.has(state);
}

/** The showroom's chat-story inventory; the transcript itself draws whatever state the connection maps to (ONL-2496). */
export const CHAT_CARD_STATES = {
  claude: ['not-signed-in', 'signing-in', 'paste-code', 'signed-in'],
  codex: ['not-signed-in', 'signing-in', 'connected'],
} as const satisfies { claude: readonly ClaudeSetupStateId[]; codex: readonly ChatGptSetupStateId[] };

export type SignInCardHost = 'dialog' | 'chat';

export type SetupAction =
  | 'set-up'
  | 'sign-in'
  | 'cancel'
  | 'open-page-again'
  | 'done'
  | 'check-again'
  | 'open-terminal'
  | 'try-again'
  | 'download-again'
  | 'use-other-agent'
  | 'see-usage'
  | 'open-billing'
  | 'copy-details'
  | 'paste'
  | 'copy';

export interface SetupFooter {
  primary?: SetupAction;
  ghost?: SetupAction;
}

export const FOOTER: Record<SetupStateId, SetupFooter> = {
  'not-set-up': { primary: 'set-up' },
  downloading: { ghost: 'cancel' },
  checking: { ghost: 'cancel' },
  'not-signed-in': { primary: 'sign-in' },
  'signing-in': { ghost: 'cancel', primary: 'open-page-again' },
  'paste-code': { ghost: 'cancel', primary: 'done' },
  'signed-in': { primary: 'done' },
  connected: { primary: 'done' },
  'setup-failed': { primary: 'try-again' },
  'wont-start': { primary: 'download-again' },
  'out-of-date': { primary: 'download-again' },
  'cannot-connect': { primary: 'check-again' },
  fallback: { ghost: 'check-again', primary: 'open-terminal' },
};

const CAUSE_GHOST: Partial<Record<CannotConnectCause, SetupAction>> = {
  'usage-limit': 'see-usage',
  billing: 'open-billing',
  'agent-error': 'copy-details',
};

/** The other agent rides the sheet as a card, so the footer keeps only what fixes this agent (ONL-2903). */
export function footerFor(state: SetupState): SetupFooter {
  if (state.harness !== 'claude' || state.state !== 'cannot-connect') return FOOTER[state.state];
  if (state.runtimeUnavailable) return { ghost: 'use-other-agent', primary: 'done' };
  if (state.cause === undefined) return FOOTER[state.state];
  const ghost = state.retryAt === undefined ? CAUSE_GHOST[state.cause] : undefined;
  const linkless = (ghost === 'see-usage' || ghost === 'open-billing') && state.hasAccountLink !== true;
  const copyless = ghost === 'copy-details' && (state.diagnostic ?? '') === '';
  return { ...(ghost === undefined || linkless || copyless ? {} : { ghost }), primary: 'check-again' };
}

export function otherAgentFor(state: SetupState): OtherAgentOffer | undefined {
  return 'other' in state ? state.other : undefined;
}

export type AvatarGlyph = 'harness' | 'spinner' | 'browser' | 'check' | 'warning' | 'console' | 'download';

const CHATGPT_AVATAR: Record<ChatGptSetupStateId, AvatarGlyph> = {
  'not-set-up': 'download',
  downloading: 'spinner',
  checking: 'spinner',
  'not-signed-in': 'browser',
  'signing-in': 'browser',
  connected: 'check',
  'setup-failed': 'warning',
  'wont-start': 'warning',
  'out-of-date': 'download',
  fallback: 'console',
};

export function avatarFor(state: SetupState): AvatarGlyph {
  if (state.harness !== 'claude') return CHATGPT_AVATAR[state.state];
  // The brand mark holds still, so the verification sheet would read as hung without it (ONL-2496).
  return state.state === 'checking' ? 'spinner' : 'harness';
}

export type SignedInState = Extract<SetupState, { state: 'signed-in' | 'connected' }>;

/** A predicate, not an `in` check: a signed-in state with no email has no `email` key at runtime. */
export function isSignedIn(state: SetupState): state is SignedInState {
  return state.state === 'signed-in' || state.state === 'connected';
}
