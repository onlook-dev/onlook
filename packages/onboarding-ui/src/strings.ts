import type { HarnessId } from '@studio/events';
import type {
  ChatGptSetupStateId,
  ClaudeSetupStateId,
  ComingSoonId,
  SetupAction,
} from './state.js';

export interface PerHarnessCopy {
  claude: Record<ClaudeSetupStateId, string>;
  codex: Record<ChatGptSetupStateId, string>;
}

/** `{percent}`, `{email}` and `{plan}` are templates. */
export interface OnboardingUiStrings {
  harnessName: Record<HarnessId, string>;
  setUp: Record<HarnessId, string>;
  subscription: Record<HarnessId, string>;
  manage: string;
  preferred: string;
  makePreferred: string;
  defaultTooltip: string;
  makeDefaultTooltip: string;
  tileLine: PerHarnessCopy;
  dialogTitle: PerHarnessCopy;
  dialogTitleNoEmail: string;
  dialogBody: PerHarnessCopy;
  dialogHeader: Record<HarnessId, string>;
  action: Record<SetupAction, string>;
  comingSoon: string;
  comingSoonName: Record<ComingSoonId, string>;
  chatLine: Record<HarnessId, string>;
  chatSignedIn: string;
  chatSignedInNoEmail: string;
  /** The sign-in notice over the composer (ONL-2973). */
  chatNotice: { signedOutBody: string; notNow: string };
  browserDefault: string;
  signInWith: string;
  chooseBrowser: string;
  runtimeMissingTitle: string;
  runtimeMissingBody: string;
  mark: { attention: string; connected: string };
  /** The other agent's card on a failed sheet, keyed by the agent it offers (ONL-2903). */
  otherAgent: {
    label: Record<HarnessId, string>;
    needs: Record<HarnessId, string>;
    ready: Record<HarnessId, string>;
    setUp: string;
    use: string;
  };
}

export { fill } from '@studio/chat-ui';

export type CopyState = { harness: 'claude'; state: ClaudeSetupStateId } | { harness: 'codex'; state: ChatGptSetupStateId };

export function pickCopy(copy: PerHarnessCopy, state: CopyState): string {
  return state.harness === 'claude' ? copy.claude[state.state] : copy.codex[state.state];
}
