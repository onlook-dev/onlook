import { describe, expect, it } from 'bun:test';
import {
  DEFAULT_EFFORT,
  DEFAULT_MODEL,
  modelLabel,
  type EffortLevel,
  type HarnessId,
  type ModelChoice,
  type PermissionMode,
} from '@studio/events';
import {
  composerControls,
  effortLabel,
  formatTokens,
  permissionModeControls,
  permissionModeLabel,
  usageMeter,
} from './composerControls.js';
import { t, type StringKey } from '@studio/i18n';

function recorder(): {
  setModel: (value: string) => void;
  setEffort: (level: EffortLevel | null) => void;
  models: string[];
  efforts: (string | null)[];
} {
  const models: string[] = [];
  const efforts: (string | null)[] = [];
  return {
    setModel: (value) => models.push(value),
    setEffort: (level) => efforts.push(level),
    models,
    efforts,
  };
}

const OPUS: ModelChoice = {
  value: 'opus',
  resolvedModel: 'claude-opus-4-6',
  displayName: 'Claude Opus 4.6',
  supportedEffortLevels: ['low', 'medium', 'high'],
};

const SONNET: ModelChoice = {
  value: 'sonnet',
  resolvedModel: 'claude-sonnet-4-6',
  displayName: 'Claude Sonnet 4.6',
};

function controls(over: {
  models?: ModelChoice[];
  model?: string;
  effort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
  harness?: HarnessId;
  rec?: ReturnType<typeof recorder>;
}): ReturnType<typeof composerControls> {
  const rec = over.rec ?? recorder();
  return composerControls({
    harness: over.harness ?? 'claude',
    models: over.models ?? [],
    model: over.model,
    effort: over.effort,
    setModel: rec.setModel,
    setEffort: rec.setEffort,
  });
}

describe('the defaults, before the SDK has said anything (ONL-1885)', () => {
  it('names the default model rather than an empty state', () => {
    expect(controls({ models: [], model: undefined }).modelName).toBe(modelLabel(DEFAULT_MODEL));
  });

  it('names the default effort, and the running row marks Default and it as in force', () => {
    const { effortName, modelRows } = controls({ models: [OPUS], model: 'opus' });
    expect(effortName).toBe(effortLabel(DEFAULT_EFFORT));
    expect(modelRows[0]?.effortOptions.filter((o) => o.isSelected).map((o) => o.level)).toEqual([
      null,
      DEFAULT_EFFORT,
    ]);
  });
});

describe('a session that has not reported its model, per agent (ONL-2920)', () => {
  it('a ChatGPT session names its agent and no effort, never a Claude model', () => {
    const { combinedLabel } = controls({ harness: 'codex', models: [], model: undefined });
    expect(combinedLabel).toBe(t('agent.name.codex'));
  });

  it('a Claude session still names its own default model and effort', () => {
    const { combinedLabel } = controls({ harness: 'claude', models: [], model: undefined });
    expect(combinedLabel).toBe(
      t('chat.composer.modelEffort', { model: modelLabel(DEFAULT_MODEL), effort: effortLabel(DEFAULT_EFFORT) }),
    );
  });
});

describe('what the effort picker offers', () => {
  it('an override marks its own level on the running row, and Default no longer', () => {
    const { modelRows } = controls({ models: [OPUS, SONNET], model: 'opus', effort: 'high' });
    expect(modelRows[0]?.effortOptions.filter((o) => o.isSelected).map((o) => o.level)).toEqual([
      'high',
    ]);
  });

  it('names the level in force', () => {
    expect(controls({ models: [OPUS], model: 'opus', effort: 'high' }).effortName).toBe(
      t('chat.composer.effort.high'),
    );

    expect(controls({ models: [SONNET], model: 'sonnet', effort: 'max' }).effortName).toBe(
      t('chat.composer.effort.max'),
    );
  });
});

describe('the consolidated control', () => {
  it('is disabled while there are no models to choose, and enabled once there are', () => {
    expect(controls({ models: [] }).isDisabled).toBe(true);
    expect(controls({ models: [SONNET] }).isDisabled).toBe(false);
  });

  it('lists one row per model, each checkmarked and carrying its OWN effort popout', () => {
    const rec = recorder();
    const { modelRows } = controls({ models: [OPUS, SONNET], model: 'opus', rec });

    expect(modelRows.map((r) => r.label)).toEqual(['Opus 4.6', 'Sonnet 4.6']);
    expect(modelRows.map((r) => r.isSelected)).toEqual([true, false]);

    expect(modelRows[0]?.effortOptions.map((o) => o.label)).toEqual([
      t('chat.composer.effort.default'),
      t('chat.composer.effort.low'),
      t('chat.composer.effort.medium'),
      t('chat.composer.effort.high'),
    ]);

    modelRows[1]?.onClick();
    expect(rec.models).toEqual(['sonnet']);
    expect(rec.efforts).toEqual([]);
  });

  it('gives a model with no declared levels no popout at all', () => {
    const { modelRows } = controls({ models: [SONNET], model: 'sonnet' });
    expect(modelRows).toEqual([
      {
        label: 'Sonnet 4.6',
        value: 'sonnet',
        isSelected: true,
        onClick: expect.any(Function),
        effortOptions: [],
      },
    ]);
  });

  it("selecting an effort option switches the model too, even when it isn't running", () => {
    const rec = recorder();
    const opusWithMore: ModelChoice = { ...OPUS, supportedEffortLevels: ['low', 'medium'] };
    const sonnetWithLevels: ModelChoice = { ...SONNET, supportedEffortLevels: ['high'] };
    const { modelRows } = controls({
      models: [opusWithMore, sonnetWithLevels],
      model: 'opus',
      effort: 'medium',
      rec,
    });

    const sonnetRow = modelRows[1];
    expect(sonnetRow?.isSelected).toBe(false);
    expect(sonnetRow?.effortOptions.every((o) => !o.isSelected)).toBe(true);

    const highOption = sonnetRow?.effortOptions.find((o) => o.level === 'high');
    highOption?.onClick();
    expect(rec.models).toEqual(['sonnet']);
    expect(rec.efforts).toEqual(['high']);
  });

  it("Default inside a row switches to that model AND clears the override", () => {
    const rec = recorder();
    const { modelRows } = controls({
      models: [OPUS, { ...SONNET, supportedEffortLevels: ['low'] }],
      model: 'opus',
      effort: 'high',
      rec,
    });
    const defaultOption = modelRows[1]?.effortOptions[0];
    expect(defaultOption?.label).toBe(t('chat.composer.effort.default'));
    defaultOption?.onClick();
    expect(rec.models).toEqual(['sonnet']);
    expect(rec.efforts).toEqual([null]);
  });
});

describe('the SDK default row (ONL-2075)', () => {
  const SDK_DEFAULT: ModelChoice = { value: 'default', displayName: 'Default (recommended)' };

  it("a stored 'default' that main mapped to no choice checks our own default row", () => {
    const { modelRows, selectedModel } = controls({ models: [SDK_DEFAULT, OPUS, SONNET], model: undefined });
    expect(selectedModel).toBe(OPUS);
    expect(modelRows.filter((r) => r.isSelected).map((r) => r.value)).toEqual([DEFAULT_MODEL]);
  });
});

describe('the permission-mode control (ONL-2190)', () => {
  const CLAUDE: PermissionMode[] = ['default', 'acceptEdits', 'auto', 'plan'];

  function modeControl(over: {
    mode?: PermissionMode;
    offered?: PermissionMode[];
    chosen?: PermissionMode[];
  }): ReturnType<typeof permissionModeControls> {
    return permissionModeControls({
      mode: over.mode,
      offered: over.offered ?? CLAUDE,
      setMode: (mode) => over.chosen?.push(mode),
    });
  }

  it('offers one row per mode the backend enforces, with the running mode checked', () => {
    const { rows, label, isDisabled } = modeControl({ mode: 'auto' });
    expect(rows.map((r) => r.value)).toEqual(CLAUDE);
    expect(rows.map((r) => r.label)).toEqual([
      t('chat.composer.mode.default'),
      t('chat.composer.mode.acceptEdits'),
      t('chat.composer.mode.auto'),
      t('chat.composer.mode.plan'),
    ]);
    expect(rows.filter((r) => r.isSelected).map((r) => r.value)).toEqual(['auto']);
    expect(label).toBe(t('chat.composer.mode.auto'));
    expect(isDisabled).toBe(false);
  });

  it('asks for the chosen mode once, and only that one', () => {
    const chosen: PermissionMode[] = [];
    const { rows } = modeControl({ mode: 'auto', chosen });
    rows.find((r) => r.value === 'plan')?.onClick();
    expect(chosen).toEqual(['plan']);
  });

  it('a backend offering one mode is no choice, so the control is disabled rather than empty', () => {
    const { rows, label, isDisabled } = modeControl({
      mode: 'danger-full-access',
      offered: ['danger-full-access'],
    });
    expect(rows.map((r) => r.value)).toEqual(['danger-full-access']);
    expect(label).toBe(t('chat.composer.mode.danger-full-access'));
    expect(isDisabled).toBe(true);
  });

  it('follows the offered list when the backend publishes a different one', () => {
    expect(modeControl({ mode: 'auto', offered: ['auto', 'plan'] }).rows.map((r) => r.value)).toEqual([
      'auto',
      'plan',
    ]);
    expect(modeControl({ mode: 'read-only', offered: ['read-only', 'workspace-write'] }).rows.map(
      (r) => r.value,
    )).toEqual(['read-only', 'workspace-write']);
  });

  it('names every offered mode, and says nothing until a backend reports one', () => {
    const named: [PermissionMode, StringKey][] = [
      ['auto', 'chat.composer.mode.auto'],
      ['default', 'chat.composer.mode.default'],
      ['acceptEdits', 'chat.composer.mode.acceptEdits'],
      ['plan', 'chat.composer.mode.plan'],
      ['bypassPermissions', 'chat.composer.mode.bypassPermissions'],
      ['read-only', 'chat.composer.mode.read-only'],
      ['workspace-write', 'chat.composer.mode.workspace-write'],
      ['danger-full-access', 'chat.composer.mode.danger-full-access'],
    ];
    for (const [mode, key] of named) {
      expect(permissionModeLabel(mode)).toBe(t(key));
    }
    expect(permissionModeLabel(undefined)).toBeUndefined();
  });
});

describe('usageMeter', () => {
  it('reads the last settled turn\'s context against the window, not the thread total (ONL-2381)', () => {
    const item = (id: string, tokens: object) =>
      ({ kind: 'assistant-text', id, text: '', isStreaming: false, tokens }) as never;
    const meter = usageMeter({
      items: [
        item('a', { context: 20_000, threadTotal: 20_000, contextWindow: 258_400 }),
        item('b', { context: 41_000, threadTotal: 2_910_000, contextWindow: 258_400 }),
      ],
    });
    expect(meter.percent).toBe(16);
    expect(meter.tooltipDetail).toBe(
      t('chat.usage.tooltipDetail', { percent: 16, used: '41k', total: '258k' }),
    );

    const overflow = usageMeter({ items: [item('c', { context: 300_000, contextWindow: 258_400 })] });
    expect(overflow.percent).toBe(100);

    const fresh = usageMeter({ items: [] });
    expect(fresh.percent).toBe(0);
    expect(fresh.tooltipDetail).toBe(t('chat.usage.contextEmpty'));
  });
});

describe('formatTokens', () => {
  it('says 1M for a million-token window, one decimal only when non-zero (ONL-2381)', () => {
    expect(formatTokens(1_000_000)).toBe('1M');
    expect(formatTokens(1_500_000)).toBe('1.5M');
    expect(formatTokens(258_400)).toBe('258k');
    expect(formatTokens(9_500)).toBe('9.5k');
    expect(formatTokens(999)).toBe('999');
  });
});
