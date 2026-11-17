import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import {
  CLAUDE_LOGIN_COMMAND,
  type ClaudeSetupState,
  type ClaudeSetupVerdict,
  type ClaudeStatusRequest,
  type CodexSetupState,
} from '@studio/events';
import {
  primeAgentSetup,
  resetAgentSetupForTesting,
  subscribeToAgentSetup,
  useAgentSetupStore,
} from './store.js';
import { canContinue } from './gate.js';
import { chatGptSetupState, claudeMark } from '../agents/mapping.js';
import { agentSetupStrings } from './strings.js';
import { disabledActionsFor, mappedSetupFor } from './dialog.js';

function claude<Verdict extends ClaudeSetupVerdict>(verdict: Verdict): Verdict & { command: string } {
  return { ...verdict, command: CLAUDE_LOGIN_COMMAND };
}

function fakeBridge(): {
  install: () => void;
  emitClaude: (state: ClaudeSetupState) => void;
  emitCodex: (state: CodexSetupState) => void;
  answerClaude: (state: ClaudeSetupState) => Promise<void>;
  answerCodex: (state: CodexSetupState) => Promise<void>;
  answerSubmit: () => Promise<void>;
  answerSignIn: () => Promise<void>;
  claudeRequests: ClaudeStatusRequest[];
  claudeSignInRequests: { entryPoint: string; browserId?: string }[];
  calls: string[];
  codes: string[];
  codexSignInEntryPoints: (string | undefined)[];
} {
  let claudeListener: ((state: ClaudeSetupState) => void) | undefined;
  let codexListener: ((state: CodexSetupState) => void) | undefined;
  const pendingClaude: Array<(state: ClaudeSetupState) => void> = [];
  const pendingCodex: Array<(state: CodexSetupState) => void> = [];
  const pendingSubmit: Array<() => void> = [];
  const pendingSignIn: Array<() => void> = [];
  const claudeRequests: ClaudeStatusRequest[] = [];
  const claudeSignInRequests: { entryPoint: string; browserId?: string }[] = [];
  const calls: string[] = [];
  const codexSignInEntryPoints: (string | undefined)[] = [];
  const codes: string[] = [];

  const bridge = {
    onClaudeState(listener: (state: ClaudeSetupState) => void): () => void {
      claudeListener = listener;
      return () => {};
    },
    onCodexState(listener: (state: CodexSetupState) => void): () => void {
      codexListener = listener;
      return () => {};
    },
    claudeStatus(req: ClaudeStatusRequest = {}): Promise<ClaudeSetupState> {
      claudeRequests.push(req);
      calls.push('claudeStatus');
      return new Promise((resolve) => pendingClaude.push(resolve));
    },
    codexStatus(): Promise<CodexSetupState> {
      calls.push('codexStatus');
      return new Promise((resolve) => pendingCodex.push(resolve));
    },
    claudeSignIn(request: { entryPoint: string; browserId?: string }): Promise<{ accepted: boolean }> {
      calls.push('claudeSignIn');
      claudeSignInRequests.push(request);
      return new Promise((resolve) => pendingSignIn.push(() => resolve({ accepted: true })));
    },
    claudeOpenPageAgain(): Promise<{ accepted: boolean }> {
      calls.push('claudeOpenPageAgain');
      return Promise.resolve({ accepted: true });
    },
    claudeSubmitCode(req: { code: string }): Promise<{ accepted: boolean }> {
      calls.push('claudeSubmitCode');
      codes.push(req.code);
      return new Promise((resolve) => pendingSubmit.push(() => resolve({ accepted: true })));
    },
    claudeSignInCancel(): Promise<void> {
      calls.push('claudeSignInCancel');
      return Promise.resolve();
    },
    codexInstall(): Promise<{ accepted: boolean }> {
      calls.push('codexInstall');
      return Promise.resolve({ accepted: true });
    },
    codexSignIn(request?: { entryPoint?: string }): Promise<{ accepted: boolean }> {
      calls.push('codexSignIn');
      codexSignInEntryPoints.push(request?.entryPoint);
      return Promise.resolve({ accepted: true });
    },
    codexSignInCancel(): Promise<void> {
      calls.push('codexSignInCancel');
      return Promise.resolve();
    },
  };

  const settle = async (): Promise<void> => {
    await Promise.resolve();
    await Promise.resolve();
  };

  return {
    install(): void {
      Object.defineProperty(globalThis, 'window', { value: { studio: bridge }, configurable: true, writable: true });
    },
    emitClaude(state): void {
      claudeListener?.(state);
    },
    emitCodex(state): void {
      codexListener?.(state);
    },
    async answerClaude(state): Promise<void> {
      pendingClaude.shift()?.(state);
      await settle();
    },
    async answerCodex(state): Promise<void> {
      pendingCodex.shift()?.(state);
      await settle();
    },
    async answerSubmit(): Promise<void> {
      pendingSubmit.shift()?.();
      await settle();
    },
    async answerSignIn(): Promise<void> {
      pendingSignIn.shift()?.();
      await settle();
    },
    claudeRequests,
    claudeSignInRequests,
    calls,
    codexSignInEntryPoints,
    codes,
  };
}

let bridge: ReturnType<typeof fakeBridge>;

beforeEach(() => {
  resetAgentSetupForTesting();
  bridge = fakeBridge();
  bridge.install();
});

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'window');
});

const store = (): ReturnType<typeof useAgentSetupStore.getState> => useAgentSetupStore.getState();

it('sends only the selected browser id to main and preserves the default request', async () => {
  const selected = store().signInClaude('editor', 'chrome');
  await bridge.answerSignIn();
  await selected;
  const defaultBrowser = store().signInClaude('settings');
  await bridge.answerSignIn();
  await defaultBrowser;
  expect(bridge.claudeSignInRequests).toEqual([{ entryPoint: 'editor', browserId: 'chrome' }, { entryPoint: 'settings' }]);
});

describe('the boot prime', () => {
  it('asks both statuses once, and never fresh', async () => {
    subscribeToAgentSetup();
    void primeAgentSetup();
    void primeAgentSetup();
    expect(bridge.calls).toEqual(['claudeStatus', 'codexStatus']);
    expect(bridge.claudeRequests).toEqual([{}]);
    await bridge.answerClaude(claude({ status: 'signed-out' }));
    expect(store().claude.status).toBe('signed-out');
  });

  it('lets a state emitted before the snapshot lands stand', async () => {
    subscribeToAgentSetup();
    const primed = primeAgentSetup();
    bridge.emitClaude(claude({ status: 'checking' }));
    bridge.emitCodex({ status: 'downloading', percent: 10 });
    await bridge.answerClaude(claude({ status: 'idle' }));
    await bridge.answerCodex({ status: 'idle' });
    await primed;
    expect(store().claude.status).toBe('checking');
    expect(store().codex.status).toBe('downloading');
  });

  it('still catches up a store that heard nothing live', async () => {
    subscribeToAgentSetup();
    const primed = primeAgentSetup();
    await bridge.answerClaude(claude({ status: 'signed-in', email: 'a@b.c', plan: 'max' }));
    await bridge.answerCodex({ status: 'ready' });
    await primed;
    expect(store().claude.status).toBe('signed-in');
    expect(store().codex.status).toBe('ready');
  });

  it('does not overwrite a broadcast heard before priming starts', async () => {
    subscribeToAgentSetup();
    bridge.emitClaude(claude({ status: 'verifying' }));
    bridge.emitCodex({ status: 'validating' });
    const primed = primeAgentSetup();
    await bridge.answerClaude(claude({ status: 'signed-out' }));
    await bridge.answerCodex({ status: 'signed-out' });
    await primed;
    expect(store().claude.status).toBe('verifying');
    expect(store().codex.status).toBe('validating');
  });

  it('landing on signed-in touches nothing: no mark, no Continue, no lastConnected (ONL-2186)', async () => {
    subscribeToAgentSetup();
    const primed = primeAgentSetup();
    await bridge.answerClaude(claude({ status: 'signed-in', plan: 'max' }));
    await bridge.answerCodex({ status: 'ready' });
    await primed;
    const state = store();
    expect(state.touched).toEqual({ claude: false, codex: false });
    expect(state.lastConnected).toBeNull();
    expect(claudeMark(state)).toBeUndefined();
    expect(canContinue(state)).toBe(false);
  });
});

describe('tapping', () => {
  it('a Claude tap sets touched, asks fresh with the entry point, and flags detect while pending', async () => {
    subscribeToAgentSetup();
    const tap = store().tapClaude('onboarding');
    expect(store().touched.claude).toBe(true);
    expect(store().inFlight.claude.detect).toBe(true);
    expect(bridge.claudeRequests).toEqual([{ fresh: true, entryPoint: 'onboarding' }]);
    await bridge.answerClaude(claude({ status: 'signed-out' }));
    await tap;
    expect(store().inFlight.claude.detect).toBe(false);
    expect(store().claude.status).toBe('signed-out');
    expect(store().lastConnected).toBeNull();
  });

  it('a tap that finds a stored credential counts as connecting it', async () => {
    subscribeToAgentSetup();
    const primed = primeAgentSetup();
    await bridge.answerClaude(claude({ status: 'signed-in', plan: 'max' }));
    await bridge.answerCodex({ status: 'idle' });
    await primed;
    expect(store().lastConnected).toBeNull();

    const tap = store().tapClaude('onboarding');
    await bridge.answerClaude(claude({ status: 'signed-in', plan: 'max' }));
    await tap;
    expect(store().lastConnected).toBe('claude');
    expect(canContinue(store())).toBe(true);
  });

  it('a live connected transition sets lastConnected only for a touched harness', async () => {
    subscribeToAgentSetup();
    const tap = store().tapCodex();
    await bridge.answerCodex({ status: 'signed-out' });
    await tap;
    expect(bridge.calls).toEqual(['codexStatus']);

    bridge.emitCodex({ status: 'ready' });
    expect(store().lastConnected).toBe('codex');

    bridge.emitClaude(claude({ status: 'signed-in', plan: 'max' }));
    expect(store().lastConnected).toBe('codex');
    expect(store().touched.claude).toBe(false);
  });

  it('keeps the last settled verdict through a re-check and through the verification behind it (ONL-2496)', () => {
    subscribeToAgentSetup();
    for (const status of ['checking', 'verifying'] as const) {
      bridge.emitClaude(claude({ status: 'signed-out' }));
      bridge.emitClaude(claude({ status }));
      expect(store().claude.status, status).toBe(status);
      expect(store().claudeSettled?.status, status).toBe('signed-out');
    }
  });

  it('Check again asks fresh under the check flag; codex re-checks through install', async () => {
    subscribeToAgentSetup();
    const check = store().checkClaude();
    expect(store().inFlight.claude.check).toBe(true);
    expect(bridge.claudeRequests).toEqual([{ fresh: true }]);
    await bridge.answerClaude(claude({ status: 'signed-out' }));
    await check;
    expect(store().inFlight.claude.check).toBe(false);

    await store().checkCodex();
    expect(bridge.calls).toEqual(['claudeStatus', 'codexInstall']);
  });
});

describe('request ownership', () => {
  for (const harness of ['claude', 'codex'] as const) {
    for (const firstToFinish of ['older', 'newer'] as const) {
      it(`${harness} overlapping taps retain their own detect owners when ${firstToFinish} finishes first`, async () => {
        const older = Promise.withResolvers<ClaudeSetupState>();
        const newer = Promise.withResolvers<ClaudeSetupState>();
        const olderCodex = Promise.withResolvers<CodexSetupState>();
        const newerCodex = Promise.withResolvers<CodexSetupState>();
        const claudeResponses = [older, newer];
        const codexResponses = [olderCodex, newerCodex];
        window.studio.claudeStatus = () => claudeResponses.shift()!.promise;
        window.studio.codexStatus = () => codexResponses.shift()!.promise;
        const tap = (): Promise<void> => harness === 'claude' ? store().tapClaude('onboarding') : store().tapCodex();
        const requests = [tap(), tap()];
        const first = firstToFinish === 'older' ? 0 : 1;
        const second = first === 0 ? 1 : 0;
        const pendingClaude = [older, newer];
        const pendingCodex = [olderCodex, newerCodex];
        if (harness === 'claude') pendingClaude[first]!.resolve(claude({ status: 'signed-out' }));
        else pendingCodex[first]!.resolve({ status: 'signed-out' });
        await requests[first];
        expect(store().inFlight[harness].detect).toBe(true);
        if (harness === 'claude') pendingClaude[second]!.resolve(claude({ status: 'signed-in', plan: 'max' }));
        else pendingCodex[second]!.resolve({ status: 'ready' });
        await requests[second];
        expect(store().inFlight[harness].detect).toBe(false);
        expect(store()[harness].status).toBe(firstToFinish === 'older' ? harness === 'claude' ? 'signed-in' : 'ready' : 'signed-out');
      });
    }
  }

  for (const action of ['signIn', 'submit'] as const) {
    for (const firstToFinish of ['older', 'newer'] as const) {
      it(`Claude overlapping ${action} requests keep busy after ${firstToFinish} rejects`, async () => {
        const older = Promise.withResolvers<{ accepted: boolean }>();
        const newer = Promise.withResolvers<{ accepted: boolean }>();
        const responses = [older, newer];
        if (action === 'signIn') window.studio.claudeSignIn = () => responses.shift()!.promise;
        else window.studio.claudeOpenPageAgain = () => responses.shift()!.promise;
        const invoke = (): Promise<void> => action === 'signIn' ? store().signInClaude('editor') : store().openPageAgain();
        const requests = [invoke(), invoke()];
        const first = firstToFinish === 'older' ? 0 : 1;
        const second = first === 0 ? 1 : 0;
        const pending = [older, newer];
        pending[first]!.reject(new Error('unavailable'));
        await requests[first];
        expect(store().inFlight.claude[action]).toBe(true);
        pending[second]!.resolve({ accepted: true });
        await requests[second];
        expect(store().inFlight.claude[action]).toBe(false);
      });
    }
  }

  for (const harness of ['claude', 'codex'] as const) {
    for (const firstToFinish of ['older', 'newer'] as const) {
      for (const outcome of ['resolve', 'reject'] as const) {
        it(`${harness} overlapping checks stay busy when ${firstToFinish} finishes first by ${outcome}`, async () => {
          subscribeToAgentSetup();
          const older = Promise.withResolvers<ClaudeSetupState>();
          const newer = Promise.withResolvers<ClaudeSetupState>();
          const olderInstall = Promise.withResolvers<{ accepted: boolean }>();
          const newerInstall = Promise.withResolvers<{ accepted: boolean }>();
          const checks = [older, newer];
          const installs = [olderInstall, newerInstall];
          window.studio.claudeStatus = () => checks.shift()!.promise;
          window.studio.codexInstall = () => installs.shift()!.promise;
          const check = harness === 'claude' ? store().checkClaude : store().checkCodex;
          const requests = [check(), check()];
          if (harness === 'claude') bridge.emitClaude(claude({ status: 'verifying' }));
          else bridge.emitCodex({ status: 'checking' });

          const first = firstToFinish === 'older' ? 0 : 1;
          const second = first === 0 ? 1 : 0;
          const pendingChecks = [older, newer];
          const pendingInstalls = [olderInstall, newerInstall];
          if (outcome === 'reject') {
            (harness === 'claude' ? pendingChecks[first]! : pendingInstalls[first]!).reject(new Error('unavailable'));
          } else if (harness === 'claude') {
            pendingChecks[first]!.resolve(claude({ status: 'signed-out' }));
          } else {
            pendingInstalls[first]!.resolve({ accepted: true });
          }
          await requests[first];

          expect(store().inFlight[harness].check).toBe(true);
          const mapped = mappedSetupFor(harness, store(), agentSetupStrings());
          expect(mapped.state.state).toBe('checking');
          expect(mapped.busy).toBe(true);
          expect(disabledActionsFor({ harness, state: 'fallback', command: 'login' }, store())).toContain('check-again');

          if (harness === 'claude') pendingChecks[second]!.resolve(claude({ status: 'signed-out' }));
          else pendingInstalls[second]!.resolve({ accepted: true });
          await requests[second];
          expect(store().inFlight[harness].check).toBe(false);
        });
      }
    }
  }

  for (const firstToFinish of ['older', 'newer'] as const) {
    it(`ignores an older Claude reply when ${firstToFinish} finishes first`, async () => {
      const older = Promise.withResolvers<ClaudeSetupState>();
      const newer = Promise.withResolvers<ClaudeSetupState>();
      const responses = [older, newer];
      window.studio.claudeStatus = () => responses.shift()!.promise;
      const olderCheck = store().checkClaude();
      const newerCheck = store().checkClaude();
      if (firstToFinish === 'older') {
        older.resolve(claude({ status: 'signed-out' }));
        await olderCheck;
        expect(store().claude.status).toBe('idle');
      }
      newer.resolve(claude({ status: 'signed-in', email: 'new@example.com', plan: 'max' }));
      await newerCheck;
      if (firstToFinish === 'newer') {
        older.resolve(claude({ status: 'signed-out' }));
        await olderCheck;
      }
      expect(store().claude.status).toBe('signed-in');
      expect(store().claude.email).toBe('new@example.com');
    });
  }

  it('keeps a live Claude broadcast over a pending tap reply and its remembered display facts', async () => {
    subscribeToAgentSetup();
    const tap = store().tapClaude('onboarding');
    bridge.emitClaude(claude({ status: 'signed-in', email: 'live@example.com', plan: 'max' }));
    await bridge.answerClaude(claude({ status: 'signed-out' }));
    await tap;
    expect(store().claude.status).toBe('signed-in');
    expect(store().claudeSettled?.status).toBe('signed-in');
    expect(store().lastConnected).toBe('claude');
    expect(canContinue(store())).toBe(true);
  });

  it('keeps a live Codex broadcast over an older tap reply', async () => {
    subscribeToAgentSetup();
    const tap = store().tapCodex();
    bridge.emitCodex({ status: 'ready', email: 'live@example.com' });
    await bridge.answerCodex({ status: 'signed-out' });
    await tap;
    expect(store().codex.status).toBe('ready');
    expect(store().lastConnected).toBe('codex');
  });

  for (const harness of ['claude', 'codex'] as const) {
    it(`ignores a pending ${harness} tap response after cancellation`, async () => {
      const tap = harness === 'claude' ? store().tapClaude('editor') : store().tapCodex();
      if (harness === 'claude') {
        await store().cancelClaude();
        await bridge.answerClaude(claude({ status: 'signed-in', plan: 'max' }));
      } else {
        await store().cancelCodex();
        await bridge.answerCodex({ status: 'ready' });
      }
      await tap;
      expect(store()[harness].status).toBe('idle');
      expect(store().lastConnected).toBeNull();
      expect(store().inFlight[harness].detect).toBe(false);
    });
  }

  it('does not let the boot prime supersede a later request without a broadcast', async () => {
    const primed = primeAgentSetup();
    const checked = store().checkClaude();
    const tapped = store().tapCodex();
    await bridge.answerClaude(claude({ status: 'signed-in', plan: 'max' }));
    await bridge.answerCodex({ status: 'ready' });
    await primed;
    expect(store().claude.status).toBe('idle');
    expect(store().codex.status).toBe('idle');
    await bridge.answerClaude(claude({ status: 'signed-out' }));
    await bridge.answerCodex({ status: 'signed-out' });
    await Promise.all([checked, tapped]);
    expect(store().claude.status).toBe('signed-out');
    expect(store().codex.status).toBe('signed-out');
  });

  it('cleans only the completed Claude action while another action and Harness remain pending', async () => {
    const checking = store().checkClaude();
    const signingIn = store().signInClaude('editor');
    const detecting = store().tapCodex();
    await bridge.answerSignIn();
    await signingIn;
    expect(store().inFlight.claude.signIn).toBe(false);
    expect(store().inFlight.claude.check).toBe(true);
    expect(store().inFlight.codex.detect).toBe(true);
    await bridge.answerClaude(claude({ status: 'signed-out' }));
    await bridge.answerCodex({ status: 'signed-out' });
    await Promise.all([checking, detecting]);
  });

  for (const superseding of ['ready', 'cancel', 'check', 'reset'] as const) {
    it(`does not restore an obsolete Codex sign-in marker after ${superseding}`, async () => {
      subscribeToAgentSetup();
      const response = Promise.withResolvers<{ accepted: boolean }>();
      window.studio.codexSignIn = () => response.promise;
      const signingIn = store().signInCodex();
      bridge.emitCodex({ status: 'signing-in' });
      switch (superseding) {
        case 'ready': bridge.emitCodex({ status: 'ready' }); break;
        case 'cancel': await store().cancelCodex(); break;
        case 'check': await store().checkCodex(); break;
        case 'reset': store().resetTouched(); break;
      }
      response.resolve({ accepted: true });
      await signingIn;
      expect(store().codexSignInAttempted).toBe(false);
      expect(store().inFlight.codex.submit).toBe(false);
    });
  }

  it('does not mark an unaccepted Codex sign-in as attempted', async () => {
    window.studio.codexSignIn = () => Promise.resolve({ accepted: false });
    await store().signInCodex();
    expect(store().codexSignInAttempted).toBe(false);
  });

  it('does not mark a rejected Codex sign-in as attempted', async () => {
    window.studio.codexSignIn = () => Promise.reject(new Error('unavailable'));
    await store().signInCodex();
    expect(store().codexSignInAttempted).toBe(false);
    expect(store().inFlight.codex.submit).toBe(false);
  });

  it('allows only the latest Codex sign-in acknowledgement to mark an attempt', async () => {
    const older = Promise.withResolvers<{ accepted: boolean }>();
    const newer = Promise.withResolvers<{ accepted: boolean }>();
    const responses = [older, newer];
    window.studio.codexSignIn = () => responses.shift()!.promise;
    const olderSignIn = store().signInCodex();
    const newerSignIn = store().signInCodex();
    older.resolve({ accepted: true });
    await olderSignIn;
    expect(store().codexSignInAttempted).toBe(false);
    expect(store().inFlight.codex.submit).toBe(true);
    newer.resolve({ accepted: true });
    await newerSignIn;
    expect(store().codexSignInAttempted).toBe(true);
    expect(store().inFlight.codex.submit).toBe(false);
  });

  it('keeps Codex submit busy until both install and sign-in settle', async () => {
    const installed = Promise.withResolvers<{ accepted: boolean }>();
    const signedIn = Promise.withResolvers<{ accepted: boolean }>();
    window.studio.codexInstall = () => installed.promise;
    window.studio.codexSignIn = () => signedIn.promise;
    const installing = store().installCodex();
    const signingIn = store().signInCodex();
    signedIn.resolve({ accepted: true });
    await signingIn;
    expect(store().inFlight.codex.submit).toBe(true);
    installed.resolve({ accepted: true });
    await installing;
    expect(store().inFlight.codex.submit).toBe(false);
  });
});

describe('the paste path', () => {
  it('submits the held code once and never an empty one', async () => {
    subscribeToAgentSetup();
    bridge.emitClaude(claude({ status: 'awaiting-code' }));
    await store().submitCode();
    expect(bridge.calls).toEqual([]);

    store().pasteCode(' 1a2b-3c4d\n');
    const submit = store().submitCode();
    expect(store().inFlight.claude.submit).toBe(true);
    await store().submitCode();
    expect(bridge.codes).toEqual(['1a2b-3c4d']);
    await bridge.answerSubmit();
    await submit;
    expect(store().inFlight.claude.submit).toBe(false);
  });

  it('keeps the code through a rejection and drops it once the child is done', () => {
    subscribeToAgentSetup();
    bridge.emitClaude(claude({ status: 'awaiting-code' }));
    store().pasteCode('1a2b');
    bridge.emitClaude(claude({ status: 'awaiting-code', detail: 'invalid-code' }));
    expect(store().code).toBe('1a2b');
    bridge.emitClaude(claude({ status: 'checking' }));
    expect(store().code).toBe('1a2b');
    bridge.emitClaude(claude({ status: 'verifying' }));
    expect(store().code).toBe('1a2b');
    bridge.emitClaude(claude({ status: 'signed-in', plan: 'max' }));
    expect(store().code).toBe('');
  });

  it('cancel drops the code and tells main', async () => {
    subscribeToAgentSetup();
    bridge.emitClaude(claude({ status: 'awaiting-code' }));
    store().pasteCode('1a2b');
    await store().cancelClaude();
    expect(store().code).toBe('');
    expect(bridge.calls).toEqual(['claudeSignInCancel']);
  });

  it('sign in holds its own flag, not the submit flag, until main answers; open again reaches main', async () => {
    subscribeToAgentSetup();
    const press = store().signInClaude('editor');
    expect(store().inFlight.claude.signIn).toBe(true);
    expect(store().inFlight.claude.submit).toBe(false);
    await bridge.answerSignIn();
    await press;
    expect(store().inFlight.claude.signIn).toBe(false);
    await store().openPageAgain();
    expect(bridge.calls).toEqual(['claudeSignIn', 'claudeOpenPageAgain']);
  });
});

describe('codex', () => {
  it('keeps the earlier signed-out result out of fallback until main answers sign-in (ONL-3043)', async () => {
    subscribeToAgentSetup();
    bridge.emitCodex({ status: 'signed-out', message: 'not logged in' });
    let answer!: () => void;
    window.studio.codexSignIn = () => new Promise((resolve) => {
      answer = () => resolve({ accepted: true });
    });
    const pending = store().signInCodex();
    expect(store().codexSignInAttempted).toBe(false);
    bridge.emitCodex({ status: 'signing-in' });
    answer();
    await pending;
    expect(store().codexSignInAttempted).toBe(true);
    expect(store().codex.status).toBe('signing-in');
  });

  it('a signed-out recheck offers Sign in instead of another fallback loop (ONL-3043)', async () => {
    subscribeToAgentSetup();
    await store().signInCodex();
    bridge.emitCodex({ status: 'signed-out', message: 'login timed out' });
    await store().checkCodex();
    bridge.emitCodex({ status: 'signed-out', message: 'Not logged in' });
    const facts = store();
    expect(chatGptSetupState(facts.codex, agentSetupStrings(), { attemptedSignIn: facts.codexSignInAttempted }).state)
      .toEqual({ harness: 'codex', state: 'not-signed-in', detail: 'Not logged in' });
  });

  it('remembers a sign-in attempt until ready, so a signed-out with a detail is the fallback', async () => {
    subscribeToAgentSetup();
    expect(store().codexSignInAttempted).toBe(false);
    await store().signInCodex();
    expect(store().codexSignInAttempted).toBe(true);
    bridge.emitCodex({ status: 'signed-out', message: 'did not complete' });
    expect(store().codexSignInAttempted).toBe(true);
    bridge.emitCodex({ status: 'ready' });
    expect(store().codexSignInAttempted).toBe(false);
  });

  it('a codex sign-in carries the entry point it started from (ONL-2187)', async () => {
    subscribeToAgentSetup();
    await store().signInCodex('editor');
    await store().signInCodex('onboarding');
    expect(bridge.codexSignInEntryPoints).toEqual(['editor', 'onboarding']);
  });
});

describe('resetTouched', () => {
  it('forgets the taps, the record and the code, and keeps the machine facts', async () => {
    subscribeToAgentSetup();
    const tap = store().tapClaude('onboarding');
    await bridge.answerClaude(claude({ status: 'signed-in', plan: 'max' }));
    await tap;
    store().pasteCode('1a2b');
    expect(store().lastConnected).toBe('claude');

    store().resetTouched();
    expect(store().touched).toEqual({ claude: false, codex: false });
    expect(store().lastConnected).toBeNull();
    expect(store().code).toBe('');
    expect(store().claude.status).toBe('signed-in');
  });
});
