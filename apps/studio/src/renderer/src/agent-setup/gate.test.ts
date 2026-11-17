import { describe, expect, it } from 'bun:test';
import { CLAUDE_LOGIN_COMMAND, type ClaudeSetupVerdict } from '@studio/events';
import { canContinue, harnessToRecord, skipsDetectedSetup } from './gate.js';
import { resetAgentSetupForTesting, useAgentSetupStore } from './store.js';

function claude<Verdict extends ClaudeSetupVerdict>(verdict: Verdict): Verdict & { command: string } {
  return { ...verdict, command: CLAUDE_LOGIN_COMMAND };
}

function codex<Status extends 'idle' | 'ready' | 'signed-out' | 'downloading'>(status: Status): { status: Status } {
  return { status };
}

describe('canContinue', () => {
  it('skips detected setup only on the first selection of a connected provider', () => {
    const facts = { claude: claude({ status: 'signed-in' }), codex: codex('ready'), touched: { claude: false, codex: false } };
    expect(skipsDetectedSetup(facts, 'claude')).toBe(true);
    expect(skipsDetectedSetup(facts, 'codex')).toBe(true);
    expect(skipsDetectedSetup({ ...facts, touched: { claude: true, codex: true } }, 'claude')).toBe(false);
    expect(skipsDetectedSetup({ ...facts, codex: codex('signed-out') }, 'codex')).toBe(false);
  });
  it('is true with a touched signed-in Claude alone', () => {
    expect(canContinue({ claude: claude({ status: 'signed-in' }), codex: codex('idle'), touched: { claude: true, codex: false } })).toBe(true);
  });

  it('is true with a touched ready codex alone', () => {
    expect(canContinue({ claude: claude({ status: 'idle' }), codex: codex('ready'), touched: { claude: false, codex: true } })).toBe(true);
  });

  it('is false while a verification runs and false once it failed (ONL-2496)', () => {
    const touched = { claude: true, codex: false };
    expect(canContinue({ claude: claude({ status: 'verifying' }), codex: codex('idle'), touched })).toBe(false);
    expect(canContinue({ claude: claude({ status: 'verification-failed', detail: 'turn-service-error' }), codex: codex('idle'), touched })).toBe(false);
  });

  it('is false while both are in flight, however touched', () => {
    expect(canContinue({ claude: claude({ status: 'signing-in' }), codex: codex('downloading'), touched: { claude: true, codex: true } })).toBe(false);
  });

  it('is false for a primed signed-in Claude that was never tapped', () => {
    expect(canContinue({ claude: claude({ status: 'signed-in' }), codex: codex('ready'), touched: { claude: false, codex: false } })).toBe(false);
  });

  it('reads the touch per harness, not as one flag', () => {
    expect(canContinue({ claude: claude({ status: 'signed-in' }), codex: codex('signed-out'), touched: { claude: false, codex: true } })).toBe(false);
  });
});

describe('harnessToRecord', () => {
  it('records codex when codex was the last tapped connection, and claude otherwise', () => {
    resetAgentSetupForTesting();
    const store = useAgentSetupStore;
    expect(harnessToRecord(store.getState())).toBe('claude');

    store.setState({ touched: { claude: false, codex: true } });
    store.getState().applyCodex(codex('ready'), true);
    expect(harnessToRecord(store.getState())).toBe('codex');

    store.setState({ touched: { claude: true, codex: true } });
    store.getState().applyClaude(claude({ status: 'signed-in' }), true);
    expect(harnessToRecord(store.getState())).toBe('claude');

    resetAgentSetupForTesting();
    store.getState().applyCodex(codex('ready'));
    expect(harnessToRecord(store.getState())).toBe('claude');
    resetAgentSetupForTesting();
  });
});
