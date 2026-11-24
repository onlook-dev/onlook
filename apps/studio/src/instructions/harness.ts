import type { HarnessId } from '@studio/events';

/** No `tool`: the model asks in chat text and ends the turn. */
export interface AskMethod {
  readonly tool?: string;
}

const ASK_METHOD: Record<HarnessId, AskMethod> = {
  claude: { tool: 'AskUserQuestion' },
  codex: { tool: 'request_user_input' },
  // ACP parks permissions, never questions, and a TUI asks in its own prose.
  opencode: {},
  freebuff: {},
};

export function askMethod(harness: HarnessId | undefined): AskMethod {
  return harness === undefined ? {} : ASK_METHOD[harness];
}
