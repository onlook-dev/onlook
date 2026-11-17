import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import type { ClaudeSetupState, ClaudeStatusRequest, CodexSetupState, DefaultPatch, EffortLevel, HarnessId, ModelChoice } from '@studio/events';
import { resetAgentSetupForTesting, useAgentSetupStore } from '../agent-setup/store.js';
import { effortLevelsFor, type SelectedDefaults } from './derive.js';
import { pickDefaultModel, redetectForSetup, type SetDefault } from './SettingsSurface.js';

function installBridge(): { calls: string[]; claudeRequests: ClaudeStatusRequest[] } {
  const calls: string[] = [];
  const claudeRequests: ClaudeStatusRequest[] = [];
  const studio = {
    claudeStatus: (req: ClaudeStatusRequest): Promise<ClaudeSetupState> => {
      calls.push('claudeStatus');
      claudeRequests.push(req);
      return Promise.resolve(useAgentSetupStore.getState().claude);
    },
    codexStatus: (): Promise<CodexSetupState> => {
      calls.push('codexStatus');
      return Promise.resolve(useAgentSetupStore.getState().codex);
    },
  };
  Object.defineProperty(globalThis, 'window', { value: { studio }, configurable: true, writable: true });
  return { calls, claudeRequests };
}

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

describe('redetectForSetup', () => {
  it.each(['signing-in', 'awaiting-code'] as const)('reopens %s without replacing the active Claude login or its code', async (status) => {
    const claude: ClaudeSetupState = { status, command: 'claude auth login', browsers: [{ id: 'other', name: 'Other browser', isDefault: false }] };
    useAgentSetupStore.setState({ claude, code: 'unfinished-code' });
    redetectForSetup('claude');
    await settle();
    expect(bridge.calls).toEqual([]);
    expect(useAgentSetupStore.getState().claude).toBe(claude);
    expect(useAgentSetupStore.getState().code).toBe('unfinished-code');
  });

  it('Set up on Claude re-detects fresh under the settings entry point', async () => {
    redetectForSetup('claude');
    await settle();
    expect(bridge.calls).toEqual(['claudeStatus']);
    expect(bridge.claudeRequests).toEqual([{ fresh: true, entryPoint: 'settings' }]);
    expect(useAgentSetupStore.getState().touched.claude).toBe(true);
  });

  it('Set up on Codex re-reads the codex machine', async () => {
    redetectForSetup('codex');
    await settle();
    expect(bridge.calls).toEqual(['codexStatus']);
    expect(useAgentSetupStore.getState().touched.codex).toBe(true);
  });
});

describe('pickDefaultModel', () => {
  const OPTIONS: readonly ModelChoice[] = [
    { value: 'opus', displayName: 'Claude Opus', supportedEffortLevels: ['low', 'medium', 'high'] },
    { value: 'haiku', displayName: 'Claude Haiku' },
    { value: 'sonnet', displayName: 'Claude Sonnet', supportedEffortLevels: ['low', 'high'] },
  ];

  function spy(): { patches: { harness: HarnessId; patch: DefaultPatch }[]; setDefault: SetDefault } {
    const patches: { harness: HarnessId; patch: DefaultPatch }[] = [];
    return { patches, setDefault: (harness, patch) => void patches.push({ harness, patch }) };
  }

  const selected = (model: string | null, effort: EffortLevel | null): SelectedDefaults => ({
    model,
    effort,
    options: OPTIONS,
    levels: effortLevelsFor(OPTIONS, model),
  });

  it('writes the model against the shown harness, and leaves an effort the new model can carry', () => {
    const { patches, setDefault } = spy();
    pickDefaultModel(setDefault, 'claude', selected('opus', 'high'), 'sonnet');
    expect(patches).toEqual([{ harness: 'claude', patch: { model: 'sonnet' } }]);
  });

  it('clears an effort the newly picked model cannot carry — the row disables, so it could never be cleared by hand', () => {
    const { patches, setDefault } = spy();
    // Haiku declares no levels at all...
    pickDefaultModel(setDefault, 'claude', selected('opus', 'high'), 'haiku');
    // ...and Sonnet declares some, but not this one.
    pickDefaultModel(setDefault, 'claude', selected('opus', 'medium'), 'sonnet');
    expect(patches).toEqual([
      { harness: 'claude', patch: { model: 'haiku', effort: null } },
      { harness: 'claude', patch: { model: 'sonnet', effort: null } },
    ]);
  });

  it("Default resolves against the catalog's first row, so an effort it carries survives", () => {
    const { patches, setDefault } = spy();
    pickDefaultModel(setDefault, 'codex', selected('sonnet', null), null);
    pickDefaultModel(setDefault, 'codex', selected('sonnet', 'medium'), null);
    expect(patches).toEqual([
      { harness: 'codex', patch: { model: null } },
      { harness: 'codex', patch: { model: null } },
    ]);
  });
});
