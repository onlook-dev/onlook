import type { HarnessId, SetupEntryPoint } from '@studio/events';
import type { SetupAction, SetupState } from '@studio/onboarding-ui/state';
import { accountLink, openAccountLink } from '../agents/accountLinks.js';
import { chatGptSetupState, claudeSetupState, isClaudeConnected, isCodexConnected, type AgentSetupStrings, type MappedSetup } from '../agents/mapping.js';
import type { AgentSetupState } from './store.js';

export type SetupDialogFacts = Pick<AgentSetupState, 'claude' | 'claudeSettled' | 'codex' | 'code' | 'codexSignInAttempted' | 'inFlight'>;

export function mappedSetupFor(harness: HarnessId, facts: SetupDialogFacts, strings: AgentSetupStrings, now = Date.now()): MappedSetup {
  const flight = facts.inFlight[harness];
  // `check` counts too: a Check again drew the in-flight sheet without its shimmer, so the sheet read as hung (ONL-2496).
  const busy = flight.detect || flight.submit || flight.signIn || flight.check;
  return harness === 'claude'
    ? claudeSetupState(facts.claude, strings, {
        code: facts.code,
        busy,
        ...(facts.claudeSettled === undefined ? {} : { previous: facts.claudeSettled }),
        otherReady: isCodexConnected(facts.codex),
        now,
      })
    : chatGptSetupState(facts.codex, strings, { attemptedSignIn: facts.codexSignInAttempted, busy, otherReady: isClaudeConnected(facts.claude) });
}

/** `required` while a login runs: Escape and the backdrop cannot kill it by accident. */
export function dialogPurposeFor(state: SetupState): 'info' | 'required' {
  return state.state === 'signing-in' || state.state === 'paste-code' ? 'required' : 'info';
}

export function disabledActionsFor(state: SetupState, facts: Pick<SetupDialogFacts, 'code' | 'inFlight'>, now = Date.now()): SetupAction[] {
  const flight = facts.inFlight[state.harness];
  const disabled: SetupAction[] = [];
  if (state.state === 'cannot-connect' && state.retryAt !== undefined && state.retryAt > now) disabled.push('check-again');
  if (flight.signIn) disabled.push('sign-in');
  if (state.state === 'paste-code' && (facts.code === '' || flight.submit)) disabled.push('done');
  if ((state.state === 'fallback' || state.state === 'cannot-connect') && flight.check) disabled.push('check-again');
  return disabled;
}

interface SetupActions {
  signInClaude: (entryPoint: SetupEntryPoint, browserId?: string) => Promise<void>;
  openPageAgain: () => Promise<void>;
  pasteCode: (raw: string) => void;
  submitCode: () => Promise<void>;
  cancelClaude: () => Promise<void>;
  checkClaude: (entryPoint?: SetupEntryPoint) => Promise<void>;
  installCodex: () => Promise<void>;
  signInCodex: (entryPoint?: SetupEntryPoint, browserId?: string) => Promise<void>;
  cancelCodex: () => Promise<void>;
  checkCodex: () => Promise<void>;
}

export interface SetupDialogDeps {
  harness: HarnessId;
  entryPoint: SetupEntryPoint;
  /** Read at call time: a store seeded after construction is the one driven. */
  actions: () => SetupActions;
  /** Main's clipboard: the renderer's async clipboard needs a focused document. */
  readClipboardText: () => Promise<string>;
  writeClipboardText: (text: string) => void;
  openTerminal: () => Promise<void>;
  /** Defaults to `window.open`, which main hands to the browser. */
  openLink?: (url: string) => void;
  /** Read at call time: which account page fits depends on the plan the last check named. */
  plan?: () => string | undefined;
  onClose: () => void;
  /** Absent on a host that cannot open the other harness's setup; the sheet offering it is never drawn there (ONL-2496). */
  onSwitchHarness?: () => void;
}

/** Every exit cancels the child before the dialog goes. */
export class SetupDialogController {
  private readonly deps: SetupDialogDeps;
  private released = false;

  constructor(deps: SetupDialogDeps) {
    this.deps = deps;
  }

  /** Reopens the latch: StrictMode runs the effect twice and the real close must still cancel. */
  mount(): void {
    this.released = false;
  }

  /** Deferred by a microtask: StrictMode runs this cleanup straight after mount, and a real unmount is not followed by one (ONL-2496). */
  dispose(): void {
    if (this.released) return;
    this.released = true;
    queueMicrotask(() => {
      if (this.released) void this.cancel();
    });
  }

  /** A press always cancels: the latch is about StrictMode's second unmount, and a card the host never mounts would latch on the first Cancel (ONL-2496). */
  close(): void {
    this.released = true;
    void this.cancel();
    this.deps.onClose();
  }

  onOpenChange(isOpen: boolean): void {
    if (!isOpen) this.close();
  }

  async act(action: SetupAction, state: SetupState, browserId?: string): Promise<void> {
    const actions = this.deps.actions();
    const isClaude = this.deps.harness === 'claude';
    switch (action) {
      case 'sign-in':
        // Both Harnesses carry the entry point or the funnel cannot tell onboarding from recovery (ONL-2187).
        return isClaude
          ? actions.signInClaude(this.deps.entryPoint, browserId)
          : actions.signInCodex(this.deps.entryPoint, browserId);
      case 'open-page-again':
        return actions.openPageAgain();
      case 'paste':
        actions.pasteCode(await this.deps.readClipboardText());
        return;
      case 'done':
        if (state.state === 'paste-code') return actions.submitCode();
        this.close();
        return;
      case 'cancel':
        this.close();
        return;
      case 'check-again':
        return isClaude ? actions.checkClaude(this.deps.entryPoint) : actions.checkCodex();
      case 'open-terminal':
        return this.deps.openTerminal();
      case 'copy':
        if (state.state === 'fallback') this.deps.writeClipboardText(state.command);
        return;
      case 'use-other-agent':
        this.deps.onSwitchHarness?.();
        return;
      case 'see-usage':
      case 'open-billing': {
        const url = accountLink(this.deps.harness, action === 'see-usage' ? 'usage' : 'billing', this.deps.plan?.());
        if (url !== undefined) (this.deps.openLink ?? openAccountLink)(url);
        return;
      }
      case 'copy-details':
        if ('diagnostic' in state && state.diagnostic !== undefined) this.deps.writeClipboardText(state.diagnostic);
        return;
      case 'set-up':
      case 'download-again':
      case 'try-again':
        return actions.installCodex();
      default: {
        const exhaustive: never = action;
        return exhaustive;
      }
    }
  }

  private cancel(): Promise<void> {
    const actions = this.deps.actions();
    return this.deps.harness === 'claude' ? actions.cancelClaude() : actions.cancelCodex();
  }
}
