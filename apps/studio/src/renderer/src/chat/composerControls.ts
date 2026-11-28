import {
  DEFAULT_EFFORT,
  DEFAULT_MODEL,
  findModelChoice,
  modelDisplayName,
  modelLabel,
  type EffortLevel,
  type HarnessId,
  type KnownEffortLevel,
  type ModelChoice,
  type TranscriptItem,
  type TurnTokens,
  type PermissionMode,
} from '@studio/events';
import { usageSeverity, type UsageLimit, type UsageMeterProps } from '@studio/chat-ui';
import { t, type StringKey } from '@studio/i18n';

const EFFORT_LABELS: Record<KnownEffortLevel, () => string> = {
  low: () => t('chat.composer.effort.low'),
  medium: () => t('chat.composer.effort.medium'),
  high: () => t('chat.composer.effort.high'),
  xhigh: () => t('chat.composer.effort.xhigh'),
  max: () => t('chat.composer.effort.max'),
  ultra: () => t('chat.composer.effort.ultra'),
};

// `EffortLevel` is open: a level with no catalog key falls back to its wire value, or its row renders blank.
export function effortLabel(level: EffortLevel): string {
  return EFFORT_LABELS[level as KnownEffortLevel]?.() ?? level;
}

interface ComposerEffortOption {
  /** `null` clears the override. */
  level: EffortLevel | null;
  label: string;
  isSelected: boolean;
  onClick: () => void;
}

export interface ComposerModelRow {
  label: string;
  value: string;
  isSelected: boolean;
  onClick: () => void;
  effortOptions: ComposerEffortOption[];
}

export interface ComposerControls {
  selectedModel: ModelChoice | undefined;
  modelName: string;
  effortName: string;
  combinedLabel: string;
  modelRows: ComposerModelRow[];
  isDisabled: boolean;
}

// The SDK silently downgrades an effort the model cannot do; an absent `supportedEffortLevels` is unknown and offers none.
export function composerControls(input: {
  harness: HarnessId;
  models: readonly ModelChoice[];
  model: string | undefined;
  effort: EffortLevel | undefined;
  setModel: (value: string) => void;
  setEffort: (level: EffortLevel | null) => void;
}): ComposerControls {
  // Resolved here, not only in the label: a session that has not reported still finds its row's effort levels.
  // The defaults are Claude's; a ChatGPT session names only what it has reported (ONL-2920).
  const isClaude = input.harness === 'claude';
  const model = input.model ?? (isClaude ? DEFAULT_MODEL : undefined);
  const effort = input.effort ?? (isClaude ? DEFAULT_EFFORT : undefined);

  const selectedModel = model === undefined ? undefined : findModelChoice(input.models, model);

  const modelName = selectedModel
    ? modelDisplayName(selectedModel).replace(/^Claude\s+/i, '')
    : model === undefined
      ? t('agent.name.codex')
      : modelLabel(model);

  const effortName = effort === undefined ? '' : effortLabel(effort);

  const combinedLabel =
    effort === undefined
      ? condenseModelName(modelName)
      : t('chat.composer.modelEffort', { model: condenseModelName(modelName), effort: effortName });

  const familyOf = (m: ModelChoice): string =>
    modelDisplayName(m).replace(/\s*\(.*$/, '').replace(/\s+[\d.]+.*$/, '').trim();
  const familyOrder: string[] = [];
  for (const m of input.models) {
    const family = familyOf(m);
    if (!familyOrder.includes(family)) familyOrder.push(family);
  }
  const groupedModels = [...input.models].sort(
    (a, b) => familyOrder.indexOf(familyOf(a)) - familyOrder.indexOf(familyOf(b)),
  );

  const modelRows: ComposerModelRow[] = groupedModels.map((m) => {
    const isActiveRow = m.value === selectedModel?.value;
    const rowLevels = m.supportedEffortLevels ?? [];
    const effortOptions: ComposerEffortOption[] =
      rowLevels.length === 0
        ? []
        : [
            {
              level: null,
              label: t('chat.composer.effort.default'),
              isSelected: isActiveRow && input.effort == null,
              onClick: () => {
                input.setModel(m.value);
                input.setEffort(null);
              },
            },
            ...rowLevels.map((level) => ({
              level,
              label: effortLabel(level),
              isSelected: isActiveRow && level === effort,
              onClick: () => {
                input.setModel(m.value);
                input.setEffort(level);
              },
            })),
          ];

    return {
      label: modelDisplayName(m),
      value: m.value,
      isSelected: isActiveRow,
      onClick: () => {
        input.setModel(m.value);
      },
      effortOptions,
    };
  });

  return {
    selectedModel,
    modelName,
    effortName,
    combinedLabel,
    modelRows,
    isDisabled: input.models.length === 0,
  };
}

function condenseModelName(displayName: string): string {
  return displayName.replace(/\(recommended\)\s*$/iu, '(rec)').trim();
}

// One key per enforced mode; the type is what keeps a label from naming a mode no backend keeps.
const PERMISSION_MODE_KEYS: Record<PermissionMode, StringKey> = {
  auto: 'chat.composer.mode.auto',
  default: 'chat.composer.mode.default',
  acceptEdits: 'chat.composer.mode.acceptEdits',
  plan: 'chat.composer.mode.plan',
  bypassPermissions: 'chat.composer.mode.bypassPermissions',
  'read-only': 'chat.composer.mode.read-only',
  'workspace-write': 'chat.composer.mode.workspace-write',
  'danger-full-access': 'chat.composer.mode.danger-full-access',
};

export function permissionModeLabel(mode: PermissionMode | undefined): string | undefined {
  if (mode === undefined) return undefined;
  const key = PERMISSION_MODE_KEYS[mode];
  return key === undefined ? undefined : t(key);
}

export interface ComposerPermissionRow {
  label: string;
  value: PermissionMode;
  isSelected: boolean;
  onClick: () => void;
}

export interface ComposerPermissionControl {
  label: string | undefined;
  rows: ComposerPermissionRow[];
  /** One offered mode is no choice: the control shows the posture and refuses the menu. */
  isDisabled: boolean;
}

/** Pure, so the menu is a presentation shell and the offer is testable without mounting it. */
export function permissionModeControls(input: {
  mode: PermissionMode | undefined;
  offered: readonly PermissionMode[];
  setMode: (mode: PermissionMode) => void;
}): ComposerPermissionControl {
  const rows = input.offered.map((value) => ({
    label: t(PERMISSION_MODE_KEYS[value]),
    value,
    isSelected: value === input.mode,
    onClick: () => input.setMode(value),
  }));
  return {
    label: permissionModeLabel(input.mode),
    rows,
    isDisabled: rows.length < 2,
  };
}

export function usageMeter(input: {
  items: readonly TranscriptItem[];
  limits?: UsageLimit[];
}): UsageMeterProps {
  let tokens: TurnTokens | undefined;
  for (let i = input.items.length - 1; i >= 0; i -= 1) {
    const item = input.items[i];
    if (item !== undefined && 'tokens' in item && item.tokens !== undefined) {
      tokens = item.tokens;
      break;
    }
  }

  const used = tokens?.context;
  const total = tokens?.contextWindow;
  const hasReading = used !== undefined && total !== undefined && total > 0;
  const percent = hasReading ? Math.min(100, Math.round((used / total) * 100)) : 0;
  const limits = input.limits ?? [];
  const shown = percent;
  const severity = usageSeverity(shown);

  return {
    percent: shown,
    label: t('chat.usage.label'),
    tooltipTitle: t(TITLE_KEYS[severity]),
    tooltipDetail: hasReading
      ? t('chat.usage.tooltipDetail', {
          percent,
          used: formatTokens(used),
          total: formatTokens(total),
        })
      : t('chat.usage.contextEmpty'),
    ...(hasReading && severity !== 'calm'
      ? { tooltipConsequence: t(CONSEQUENCE_KEYS[severity]) }
      : {}),
    contextTitle: t('chat.usage.contextTitle'),
    contextDetail: hasReading
      ? t('chat.usage.contextDetail', {
          percent,
          used: formatTokens(used),
          total: formatTokens(total),
        })
      : t('chat.usage.contextEmpty'),
    limitsTitle: t('chat.usage.limitsTitle'),
    limits,
  };
}

const TITLE_KEYS = {
  calm: 'chat.usage.title.calm',
  warn: 'chat.usage.title.warn',
  critical: 'chat.usage.title.critical',
} as const satisfies Record<string, StringKey>;

const CONSEQUENCE_KEYS = {
  warn: 'chat.usage.consequence.warn',
  critical: 'chat.usage.consequence.critical',
} as const satisfies Record<string, StringKey>;

export function formatTokens(count: number): string {
  if (count >= 1_000_000) return `${formatMillions(count)}M`;
  if (count < 1000) return String(count);
  return `${(count / 1000).toFixed(count < 10_000 ? 1 : 0)}k`;
}

function formatMillions(count: number): string {
  const millions = count / 1_000_000;
  const oneDecimal = millions.toFixed(1);
  return oneDecimal.endsWith('.0') ? oneDecimal.slice(0, -2) : oneDecimal;
}
