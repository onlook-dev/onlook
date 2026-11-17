import type { ChatGptSetupStateId, ChatGptTileStateId, ClaudeSetupStateId, ClaudeTileStateId, HarnessTileState, SetupState } from './state.js';
import type { OnboardingUiStrings } from './strings.js';

/** The copy is the board's, verbatim. */
export const STUB_STRINGS: OnboardingUiStrings = {
  harnessName: { claude: 'Claude', codex: 'ChatGPT' },
  setUp: { claude: 'Set up Claude', codex: 'Set up ChatGPT' },
  subscription: { claude: 'Claude subscription', codex: 'ChatGPT subscription' },
  manage: 'Manage',
  preferred: 'Default',
  makePreferred: 'Make default',
  defaultTooltip: 'New projects start with {name}',
  makeDefaultTooltip: 'Start new projects with {name}',
  tileLine: {
    claude: {
      'not-signed-in': 'Not signed in',
      checking: 'Checking it works…',
      'signing-in': 'Signing in…',
      'paste-code': 'Waiting for code',
      'signed-in': 'Connected',
      'cannot-connect': 'Could not connect',
      fallback: 'Sign-in failed',
    },
    codex: {
      'not-set-up': 'Not set up',
      downloading: 'Downloading… {percent}%',
      checking: 'Checking it works…',
      'not-signed-in': 'Not signed in',
      'signing-in': 'Signing in…',
      connected: 'Connected',
      'setup-failed': 'Setup failed',
      'wont-start': 'Will not start',
      'out-of-date': 'Out of date',
      fallback: 'Sign-in failed',
    },
  },
  dialogTitle: {
    claude: {
      'not-signed-in': 'Sign in to Claude to continue',
      checking: 'Checking it works',
      'signing-in': 'Finish signing in to Claude in your browser',
      'paste-code': 'Claude showed you a code',
      'signed-in': 'Signed in as {email}',
      'cannot-connect': 'Claude could not be reached',
      fallback: 'Finish signing in from the Terminal',
    },
    codex: {
      'not-set-up': 'Set up the ChatGPT agent',
      downloading: 'Downloading the ChatGPT agent',
      checking: 'Checking it works',
      'not-signed-in': 'Sign in to ChatGPT to finish',
      'signing-in': 'Finish signing in to ChatGPT in your browser',
      connected: 'Signed in as {email}',
      'setup-failed': 'Setting up the ChatGPT agent did not finish',
      'wont-start': 'The ChatGPT agent downloaded but will not start',
      'out-of-date': 'The ChatGPT agent on this computer is older than Onlook needs',
      fallback: 'Finish signing in from the Terminal',
    },
  },
  dialogBody: {
    claude: {
      'not-signed-in': 'Onlook opens claude.com in your browser.',
      checking: 'Onlook is sending Claude one short message to make sure it answers.',
      'signing-in': 'We are waiting for it. Come back when the page says you are done.',
      'paste-code': 'Paste it here and you are done.',
      'signed-in': '{plan}',
      'cannot-connect': 'Onlook sent Claude a short message and it did not go through.',
      fallback:
        'Copy the line below, paste it into Terminal, and press Return. Come back here when Claude says you are signed in.',
    },
    codex: {
      'not-set-up': 'Onlook installs its own copy of the ChatGPT agent. Nothing else on your machine changes.',
      downloading: 'About 111 MB. It only takes about 30 seconds.',
      checking: 'Onlook is checking the agent answers and that this computer is signed in.',
      'not-signed-in':
        'Onlook opens chatgpt.com in your browser. This replaces any other OpenAI credentials saved on this computer.',
      'signing-in': 'This closes on its own once you’ve signed in.',
      connected: '{plan}',
      'setup-failed': 'It can be picked up from where it stopped.',
      'wont-start': 'Downloading a fresh copy usually fixes it.',
      'out-of-date': 'It runs, but Onlook drives a newer version. The download is the current one.',
      fallback:
        'Copy the line below, paste it into Terminal, and press Return. Come back here when ChatGPT says you are signed in.',
    },
  },
  dialogHeader: { claude: 'Set up Claude', codex: 'Set up ChatGPT' },
  action: {
    'set-up': 'Set up ChatGPT',
    'sign-in': 'Sign in',
    cancel: 'Cancel',
    'open-page-again': 'Open the page again',
    done: 'Done',
    'check-again': 'Check again',
    'open-terminal': 'Open Terminal',
    'try-again': 'Try again',
    'download-again': 'Download again',
    'use-other-agent': 'Use ChatGPT instead',
    'see-usage': 'See usage in Claude',
    'open-billing': 'Open Claude billing',
    'copy-details': 'Copy details',
    paste: 'Paste',
    copy: 'Copy',
  },
  comingSoon: 'Coming soon',
  comingSoonName: { opencode: 'OpenCode', other: 'Other AI providers' },
  chatLine: {
    claude: 'Please sign in to Claude to continue designing in Onlook',
    codex: 'Please sign in to ChatGPT to continue designing in Onlook',
  },
  chatSignedIn: 'Signed in as {email}',
  mark: { attention: 'Needs you', connected: 'Connected' },
  dialogTitleNoEmail: 'Signed in',
  chatSignedInNoEmail: 'Signed in',
  chatNotice: { signedOutBody: 'Claude says this computer isn’t signed in anymore. Your chat and changes are kept.', notNow: 'Not now' },
  browserDefault: '{browser} (default)',
  signInWith: 'Sign in with {browser}',
  chooseBrowser: 'Choose a browser',
  runtimeMissingTitle: 'Claude couldn’t start',
  otherAgent: {
    label: { claude: 'Use Claude instead', codex: 'Use ChatGPT instead' },
    needs: {
      claude: 'Needs a Claude Pro or Max plan. You sign in once in your browser.',
      codex: 'Needs a ChatGPT plan. Onlook downloads its agent and you sign in.',
    },
    ready: { claude: 'Claude is set up on this Mac.', codex: 'ChatGPT is set up on this Mac.' },
    setUp: 'Set up',
    use: 'Use',
  },
  runtimeMissingBody: 'Claude comes with Onlook. Download Onlook again and replace your installed copy, then reopen it. If Claude still won’t start, contact support.',
};

export const FIXTURE_EMAIL = 'wren@example.com';
export const FIXTURE_PERCENT = 42;
export const FIXTURE_CODE = '1a2b-3c4d-5e6f';
export const CLAUDE_COMMAND = 'claude auth login';
export const CODEX_COMMAND = 'codex login --device-auth';

export const CODEX_DETAIL = {
  'setup-failed': "the ChatGPT agent's credentials were refused: insufficient_quota",
  'wont-start': 'the ChatGPT agent exited before the handshake completed (exit 1)',
  'out-of-date': 'This ChatGPT agent is 0.140.0; Onlook needs 0.147.0 or newer',
} as const;

export const CLAUDE_DETAIL = {
  'invalid-code': 'That code was not accepted. Try pasting it again.',
  'server-rejected': 'The server turned the sign-in away.',
  'turn-signed-out': 'Claude answered that this computer is not signed in.',
  'turn-provider-refused': 'The service Claude sends requests to refused them.',
} as const;

export const CLAUDE_PLAN = 'Max plan';

export const CLAUDE_SETUP_FIXTURES: Record<ClaudeSetupStateId, SetupState> = {
  'not-signed-in': { harness: 'claude', state: 'not-signed-in' },
  checking: { harness: 'claude', state: 'checking' },
  'signing-in': { harness: 'claude', state: 'signing-in' },
  'paste-code': { harness: 'claude', state: 'paste-code', code: FIXTURE_CODE },
  'signed-in': { harness: 'claude', state: 'signed-in', email: FIXTURE_EMAIL, plan: CLAUDE_PLAN },
  'cannot-connect': { harness: 'claude', state: 'cannot-connect', detail: CLAUDE_DETAIL['turn-provider-refused'], other: { harness: 'codex', ready: false } },
  fallback: { harness: 'claude', state: 'fallback', command: CLAUDE_COMMAND },
};

export type ClaudeSetupVariantId = 'paste-code-rejected' | 'signed-in-no-email' | 'fallback-rejected' | 'not-signed-in-after-turn';

export const CLAUDE_SETUP_VARIANTS: Record<ClaudeSetupVariantId, SetupState> = {
  'paste-code-rejected': { harness: 'claude', state: 'paste-code', code: FIXTURE_CODE, detail: CLAUDE_DETAIL['invalid-code'] },
  'signed-in-no-email': { harness: 'claude', state: 'signed-in', plan: CLAUDE_PLAN },
  'fallback-rejected': { harness: 'claude', state: 'fallback', command: CLAUDE_COMMAND, detail: CLAUDE_DETAIL['server-rejected'] },
  'not-signed-in-after-turn': { harness: 'claude', state: 'not-signed-in', detail: CLAUDE_DETAIL['turn-signed-out'] },
};

export const CHATGPT_SETUP_FIXTURES: Record<ChatGptSetupStateId, SetupState> = {
  'not-set-up': { harness: 'codex', state: 'not-set-up' },
  downloading: { harness: 'codex', state: 'downloading', percent: FIXTURE_PERCENT },
  checking: { harness: 'codex', state: 'checking' },
  'not-signed-in': { harness: 'codex', state: 'not-signed-in' },
  'signing-in': { harness: 'codex', state: 'signing-in' },
  connected: { harness: 'codex', state: 'connected', email: FIXTURE_EMAIL, plan: 'Pro plan • Max' },
  'setup-failed': { harness: 'codex', state: 'setup-failed', detail: CODEX_DETAIL['setup-failed'] },
  'wont-start': { harness: 'codex', state: 'wont-start', detail: CODEX_DETAIL['wont-start'] },
  'out-of-date': { harness: 'codex', state: 'out-of-date', detail: CODEX_DETAIL['out-of-date'] },
  fallback: { harness: 'codex', state: 'fallback', command: CODEX_COMMAND },
};

export function claudeTile(state: ClaudeTileStateId): HarnessTileState {
  return { kind: 'harness', harness: 'claude', state };
}

export function codexTile(state: ChatGptTileStateId): HarnessTileState {
  return state === 'downloading' ? { kind: 'harness', harness: 'codex', state, percent: FIXTURE_PERCENT } : { kind: 'harness', harness: 'codex', state };
}
