import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { CLAUDE_LOGIN_COMMAND, type ClaudeSetupState, type ClaudeSetupVerdict, type CodexSetupState, type HarnessId } from '@studio/events';
import { CHATGPT_SETUP_STATES, CLAUDE_SETUP_STATES, type SetupState } from '@studio/onboarding-ui/state';
import { dialogPurposeFor, disabledActionsFor, mappedSetupFor, SetupDialogController, type SetupDialogFacts } from './dialog.js';
import type { MappedSetup } from '../agents/mapping.js';
import { resetAgentSetupForTesting, useAgentSetupStore, type AgentSetupState, type HarnessFlight } from './store.js';
import { agentSetupStrings } from './strings.js';

const strings = agentSetupStrings();

function claude<Verdict extends ClaudeSetupVerdict>(verdict: Verdict): Verdict & { command: string } {
  return { ...verdict, command: CLAUDE_LOGIN_COMMAND };
}

function installBridge(): { calls: string[]; codes: string[] } {
  const calls: string[] = [];
  const codes: string[] = [];
  const accepted = (name: string) => (): Promise<{ accepted: boolean }> => {
    calls.push(name);
    return Promise.resolve({ accepted: true });
  };
  const done = (name: string) => (): Promise<void> => {
    calls.push(name);
    return Promise.resolve();
  };
  const studio = {
    claudeStatus: (): Promise<ClaudeSetupState> => {
      calls.push('claudeStatus');
      return Promise.resolve(useAgentSetupStore.getState().claude);
    },
    codexStatus: (): Promise<CodexSetupState> => {
      calls.push('codexStatus');
      return Promise.resolve(useAgentSetupStore.getState().codex);
    },
    claudeSignIn: accepted('claudeSignIn'),
    claudeOpenPageAgain: accepted('claudeOpenPageAgain'),
    claudeSubmitCode: (req: { code: string }): Promise<{ accepted: boolean }> => {
      calls.push('claudeSubmitCode');
      codes.push(req.code);
      return Promise.resolve({ accepted: true });
    },
    claudeSignInCancel: done('claudeSignInCancel'),
    codexInstall: accepted('codexInstall'),
    codexSignIn: accepted('codexSignIn'),
    codexSignInCancel: done('codexSignInCancel'),
  };
  Object.defineProperty(globalThis, 'window', { value: { studio }, configurable: true, writable: true });
  return { calls, codes };
}

function flights(claudeFlight: Partial<HarnessFlight>): AgentSetupState['inFlight'] {
  const idle: HarnessFlight = { detect: false, submit: false, check: false, signIn: false };
  return { claude: { ...idle, ...claudeFlight }, codex: idle };
}

function facts(): SetupDialogFacts {
  const { claude: claudeState, claudeSettled, codex, code, codexSignInAttempted, inFlight } = useAgentSetupStore.getState();
  return { claude: claudeState, claudeSettled, codex, code, codexSignInAttempted, inFlight };
}

function claudeSheet(id: (typeof CLAUDE_SETUP_STATES)[number]): SetupState {
  switch (id) {
    case 'signed-in':
      return { harness: 'claude', state: id, plan: 'p' };
    case 'fallback':
      return { harness: 'claude', state: id, command: 'c' };
    case 'cannot-connect':
      return { harness: 'claude', state: id, detail: 'd' };
    default:
      return { harness: 'claude', state: id };
  }
}

interface Rig {
  controller: SetupDialogController;
  closed: number;
  clipboard: string;
  written: string[];
  terminalOpens: number;
  switched: number;
}

function rig(harness: HarnessId, clipboard = '', options: { canSwitch?: boolean } = {}): Rig {
  const h: Rig = { controller: undefined as unknown as SetupDialogController, closed: 0, clipboard, written: [], terminalOpens: 0, switched: 0 };
  h.controller = new SetupDialogController({
    harness,
    entryPoint: 'onboarding',
    actions: () => useAgentSetupStore.getState(),
    readClipboardText: () => Promise.resolve(h.clipboard),
    writeClipboardText: (text) => {
      h.written.push(text);
    },
    openTerminal: () => {
      h.terminalOpens += 1;
      return Promise.resolve();
    },
    onClose: () => {
      h.closed += 1;
    },
    ...(options.canSwitch === false
      ? {}
      : {
          onSwitchHarness: () => {
            h.switched += 1;
          },
        }),
  });
  h.controller.mount();
  return h;
}

const mapped = (harness: HarnessId): MappedSetup => mappedSetupFor(harness, facts(), strings);
const state = (harness: HarnessId): SetupState => mapped(harness).state;

const settle = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

let bridge: ReturnType<typeof installBridge>;

beforeEach(() => {
  resetAgentSetupForTesting();
  bridge = installBridge();
});

afterEach(() => {
  resetAgentSetupForTesting();
  Reflect.deleteProperty(globalThis, 'window');
});

describe('the sheet from the store', () => {
  it('paste-code with nothing pasted disables Done alone; a pasted code enables it', () => {
    useAgentSetupStore.setState({ claude: claude({ status: 'awaiting-code' }) });
    expect(disabledActionsFor(state('claude'), facts())).toEqual(['done']);
    useAgentSetupStore.setState({ code: 'abc-def' });
    expect(disabledActionsFor(state('claude'), facts())).toEqual([]);
  });

  it('a rejected code keeps paste-code with the reason and the code still in the field', () => {
    useAgentSetupStore.setState({ claude: claude({ status: 'awaiting-code', detail: 'invalid-code' }), code: 'abc-def' });
    expect(state('claude')).toEqual({ harness: 'claude', state: 'paste-code', code: 'abc-def', detail: strings.claudeDetail['invalid-code'] });
  });

  it('Done is disabled while a submit is in flight, Check again while a check is', () => {
    useAgentSetupStore.setState({ claude: claude({ status: 'awaiting-code' }), code: 'abc' });
    expect(disabledActionsFor(state('claude'), facts())).toEqual([]);
    useAgentSetupStore.setState({ inFlight: flights({ submit: true }) });
    expect(disabledActionsFor(state('claude'), facts())).toEqual(['done']);
    useAgentSetupStore.setState({ claude: claude({ status: 'failed', detail: 'exited' }), inFlight: flights({ check: true }) });
    expect(disabledActionsFor(state('claude'), facts())).toEqual(['check-again']);
  });

  it('Sign in is disabled and the sheet reads busy while the press is with main', () => {
    useAgentSetupStore.setState({ claude: claude({ status: 'signed-out' }), inFlight: flights({ signIn: true }) });
    expect(disabledActionsFor(state('claude'), facts())).toEqual(['sign-in']);
    expect(mapped('claude').busy).toBe(true);
    useAgentSetupStore.setState({ inFlight: flights({}) });
    expect(disabledActionsFor(state('claude'), facts())).toEqual([]);
    expect(mapped('claude').busy).toBe(false);
  });

  it("the tap's detection draws the cached sheet busy, then the fresh verdict", () => {
    useAgentSetupStore.setState({ claude: claude({ status: 'signed-out' }), inFlight: flights({ detect: true }) });
    expect(mapped('claude')).toEqual({ state: { harness: 'claude', state: 'not-signed-in' }, busy: true });
    useAgentSetupStore.setState({ claude: claude({ status: 'signed-in', email: 'a@b.c', plan: 'max' }), inFlight: flights({}) });
    expect(mapped('claude')).toMatchObject({ state: { state: 'signed-in' }, busy: false });
  });

  it('a second tap on a connected Claude draws the check it is running, not the last Signed in (ONL-2496)', () => {
    useAgentSetupStore.setState({ claudeSettled: claude({ status: 'signed-in', email: 'a@b.c', plan: 'max' }) });
    for (const status of ['checking', 'verifying'] as const) {
      useAgentSetupStore.setState({ claude: claude({ status }), inFlight: flights({ detect: true }) });
      expect(mapped('claude'), status).toEqual({ state: { harness: 'claude', state: 'checking' }, busy: true });
    }
  });

  it('a Check again draws its own sheet busy, for either harness (ONL-2496)', () => {
    const idle: HarnessFlight = { detect: false, submit: false, check: false, signIn: false };
    // The press was the one in-flight flag `busy` did not read, so the sheet it drew had no shimmer and read as hung.
    useAgentSetupStore.setState({ claude: claude({ status: 'checking' }), inFlight: flights({ check: true }) });
    expect(mapped('claude').busy).toBe(true);
    useAgentSetupStore.setState({ inFlight: flights({}) });
    expect(mapped('claude').busy).toBe(false);

    useAgentSetupStore.setState({ inFlight: { claude: idle, codex: { ...idle, check: true } } });
    expect(mapped('codex').busy).toBe(true);
  });

  it('Check again waits for its own check on a failed verification, as it does on the fallback (ONL-2496)', () => {
    useAgentSetupStore.setState({ claude: claude({ status: 'verification-failed', detail: 'turn-service-error' }), inFlight: flights({ check: true }) });
    expect(state('claude').state).toBe('cannot-connect');
    expect(disabledActionsFor(state('claude'), facts())).toEqual(['check-again']);
    useAgentSetupStore.setState({ inFlight: flights({}) });
    expect(disabledActionsFor(state('claude'), facts())).toEqual([]);
  });

  it('no flight in progress ever disables the exit', () => {
    useAgentSetupStore.setState({ inFlight: flights({ detect: true, submit: true, check: true, signIn: true }) });
    for (const id of CLAUDE_SETUP_STATES) {
      expect(disabledActionsFor(claudeSheet(id), facts()), id).not.toContain('cancel');
    }
  });

  it('purpose is required for signing-in and paste-code, info for everything else on both Harnesses', () => {
    for (const id of CLAUDE_SETUP_STATES) {
      expect(dialogPurposeFor(claudeSheet(id))).toBe(id === 'signing-in' || id === 'paste-code' ? 'required' : 'info');
    }
    for (const id of CHATGPT_SETUP_STATES) {
      const fixture = { harness: 'codex', state: id, percent: 0, email: 'e', plan: 'p', detail: 'd', command: 'c' } as SetupState;
      expect(dialogPurposeFor(fixture)).toBe(id === 'signing-in' ? 'required' : 'info');
    }
  });
});

describe('the controller', () => {
  it('Use ChatGPT instead opens the other harness and installs nothing (ONL-2496)', async () => {
    useAgentSetupStore.setState({ claude: claude({ status: 'verification-failed', detail: 'turn-provider-refused' }) });
    const h = rig('claude');
    await h.controller.act('use-other-agent', state('claude'));
    expect(h.switched).toBe(1);
    expect(bridge.calls).toEqual([]);
    expect(h.closed).toBe(0);
  });

  it('a host that cannot switch is a no-op rather than a throw (ONL-2496)', async () => {
    useAgentSetupStore.setState({ claude: claude({ status: 'verification-failed', detail: 'turn-provider-refused' }) });
    const h = rig('claude', '', { canSwitch: false });
    await h.controller.act('use-other-agent', state('claude'));
    expect(h.switched).toBe(0);
    expect(bridge.calls).toEqual([]);
  });

  it('Check again on a failed verification re-detects with the entry point (ONL-2496)', async () => {
    useAgentSetupStore.setState({ claude: claude({ status: 'verification-failed', detail: 'turn-service-error' }) });
    const h = rig('claude');
    await h.controller.act('check-again', state('claude'));
    await settle();
    expect(bridge.calls).toEqual(['claudeStatus']);
  });

  it('a pasted string with line breaks lands as one sanitized code, and Done hands that code to main', async () => {
    useAgentSetupStore.setState({ claude: claude({ status: 'awaiting-code' }) });
    const h = rig('claude', '  ab12\n-cd34\r\n ');
    await h.controller.act('paste', state('claude'));
    expect(useAgentSetupStore.getState().code).toBe('ab12-cd34');
    await h.controller.act('done', state('claude'));
    await settle();
    expect(bridge.calls).toEqual(['claudeSubmitCode']);
    expect(bridge.codes).toEqual(['ab12-cd34']);
    expect(h.closed).toBe(0);
  });

  it('closing while signing-in cancels exactly once, the unmount that follows adding nothing', async () => {
    useAgentSetupStore.setState({ claude: claude({ status: 'signing-in' }) });
    const h = rig('claude');
    h.controller.onOpenChange(false);
    h.controller.dispose();
    await settle();
    expect(bridge.calls).toEqual(['claudeSignInCancel']);
    expect(h.closed).toBe(1);
  });

  it('the footer Cancel is the same exit as the X', async () => {
    useAgentSetupStore.setState({ claude: claude({ status: 'signing-in' }) });
    const h = rig('claude');
    await h.controller.act('cancel', state('claude'));
    await settle();
    expect(bridge.calls).toEqual(['claudeSignInCancel']);
    expect(h.closed).toBe(1);
  });

  it('a second Cancel press still cancels on a card the host never mounts (ONL-2496)', async () => {
    useAgentSetupStore.setState({ claude: claude({ status: 'verifying' }) });
    const h = rig('claude');
    // The chat transcript builds its controller without mounting it, so a latch set by the first press would strand the second.
    await h.controller.act('cancel', state('claude'));
    await h.controller.act('cancel', state('claude'));
    await settle();
    expect(bridge.calls).toEqual(['claudeSignInCancel', 'claudeSignInCancel']);
  });

  it('StrictMode’s cleanup-then-remount cancels nothing, so a tap keeps its own check (ONL-2496)', async () => {
    useAgentSetupStore.setState({ claude: claude({ status: 'verifying' }) });
    const h = rig('claude');
    // React runs mount, cleanup, mount in development; the cleanup here is not a real unmount.
    h.controller.mount();
    h.controller.dispose();
    h.controller.mount();
    await settle();
    expect(bridge.calls).toEqual([]);
  });

  it('a real unmount still cancels once the microtask settles (ONL-2496)', async () => {
    useAgentSetupStore.setState({ claude: claude({ status: 'verifying' }) });
    const h = rig('claude');
    h.controller.mount();
    h.controller.dispose();
    await settle();
    expect(bridge.calls).toEqual(['claudeSignInCancel']);
  });

  it('a remount reopens the latch, so a close after StrictMode’s double effect still cancels', async () => {
    useAgentSetupStore.setState({ claude: claude({ status: 'signing-in' }) });
    const h = rig('claude');
    h.controller.dispose();
    h.controller.mount();
    h.controller.onOpenChange(false);
    await settle();
    expect(bridge.calls).toEqual(['claudeSignInCancel', 'claudeSignInCancel']);
  });

  it('Done on signed-in only closes; the connection was the transition', async () => {
    useAgentSetupStore.setState({ claude: claude({ status: 'signed-in', email: 'a@b.c', plan: 'max' }) });
    const h = rig('claude');
    await h.controller.act('done', state('claude'));
    await settle();
    expect(bridge.calls).toEqual(['claudeSignInCancel']);
    expect(bridge.codes).toEqual([]);
    expect(h.closed).toBe(1);
  });

  it('routes the Claude sign-in, open-page-again and check-again to the store', async () => {
    useAgentSetupStore.setState({ claude: claude({ status: 'signed-out' }) });
    const h = rig('claude');
    await h.controller.act('sign-in', state('claude'));
    useAgentSetupStore.setState({ claude: claude({ status: 'signing-in' }) });
    await h.controller.act('open-page-again', state('claude'));
    useAgentSetupStore.setState({ claude: claude({ status: 'failed', detail: 'exited' }) });
    await h.controller.act('check-again', state('claude'));
    expect(bridge.calls).toEqual(['claudeSignIn', 'claudeOpenPageAgain', 'claudeStatus']);
    expect(h.closed).toBe(0);
  });

  it('the fallback copies the command and opens the Terminal without touching the machine', async () => {
    useAgentSetupStore.setState({ claude: claude({ status: 'failed', detail: 'server-rejected' }) });
    const h = rig('claude');
    await h.controller.act('copy', state('claude'));
    await h.controller.act('open-terminal', state('claude'));
    expect(h.written).toEqual([CLAUDE_LOGIN_COMMAND]);
    expect(h.terminalOpens).toBe(1);
    expect(bridge.calls).toEqual([]);
  });

  it('routes the ChatGPT actions onto the codex machine: install for the three remedies, sign in, check, cancel', async () => {
    useAgentSetupStore.setState({ codex: { status: 'idle' } });
    const h = rig('codex');
    const codex = state('codex');
    await h.controller.act('set-up', codex);
    await h.controller.act('try-again', codex);
    await h.controller.act('download-again', codex);
    await h.controller.act('sign-in', codex);
    await h.controller.act('check-again', codex);
    await h.controller.act('cancel', codex);
    await settle();
    expect(bridge.calls).toEqual(['codexInstall', 'codexInstall', 'codexInstall', 'codexSignIn', 'codexInstall', 'codexSignInCancel']);
    expect(useAgentSetupStore.getState().codexSignInAttempted).toBe(false);
    expect(h.closed).toBe(1);
  });
});
