import {
  CLAUDE_LOGIN_COMMAND,
  IDLE_CLAUDE_SETUP_STATE,
  type ClaudeLoginDetail,
  type ClaudeVerificationDetail,
  type ClaudeSettledSetupState,
  type ClaudeSetupVerdict,
  type ClaudeSetupState,
  type ClaudeTurnFacts,
} from '@studio/events';

export interface ClaudeSetupMachineOptions {
  emit: (next: ClaudeSetupState) => void;
}

export interface SignedInFacts {
  email?: string;
  plan?: string;
}

/** Every `set` emits, the `awaiting-code` self-transition included: its detail is the only thing that tells the dialog a code bounced. */
export class ClaudeSetupMachine {
  private state: ClaudeSetupState = IDLE_CLAUDE_SETUP_STATE;
  private readonly emit: (next: ClaudeSetupState) => void;

  constructor(options: ClaudeSetupMachineOptions) {
    this.emit = options.emit;
  }

  current(): ClaudeSetupState {
    return this.state;
  }

  isSigningIn(): boolean {
    return this.state.status === 'signing-in' || this.state.status === 'awaiting-code';
  }

  checking(): void {
    this.set({ status: 'checking' });
  }

  signedOut(detail?: 'exited'): void {
    this.set({ status: 'signed-out', ...(detail === undefined ? {} : { detail }) });
  }

  signedIn(facts: SignedInFacts = {}): void {
    this.set({
      status: 'signed-in',
      ...(facts.email === undefined ? {} : { email: facts.email }),
      ...(facts.plan === undefined ? {} : { plan: facts.plan }),
    });
  }

  signingIn(): void {
    this.set({ status: 'signing-in' });
  }

  awaitingCode(detail?: 'invalid-code'): void {
    this.set({ status: 'awaiting-code', ...(detail === undefined ? {} : { detail }) });
  }

  verifying(): void {
    this.set({ status: 'verifying' });
  }

  /** The plan rides the verdict: which account page can fix it depends on it (ONL-2903). */
  verificationFailed(detail: ClaudeVerificationDetail, turn?: ClaudeTurnFacts, plan?: string): void {
    this.set({
      status: 'verification-failed',
      detail,
      ...(turn === undefined ? {} : { turn }),
      ...(plan === undefined ? {} : { plan }),
    });
  }

  failed(detail: ClaudeLoginDetail): void {
    this.set({ status: 'failed', detail });
  }

  /** The abort path puts back what the detection replaced, so a stopped check leaves no verdict behind (ONL-2496). */
  restore(state: ClaudeSettledSetupState): void {
    this.set(state);
  }

  private set(next: ClaudeSetupVerdict): void {
    this.state = { ...next, command: CLAUDE_LOGIN_COMMAND };
    this.emit(this.state);
  }
}
