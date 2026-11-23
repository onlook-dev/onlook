import { Children, isValidElement, type ReactNode } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Divider } from '@astryxdesign/core/Divider';
import { HStack } from '@astryxdesign/core/HStack';
import { Selector } from '@astryxdesign/core/Selector';
import { Switch } from '@astryxdesign/core/Switch';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { HARNESS_IDS, findModelChoice, modelLabel, type EffortLevel, type HarnessId, type ModelChoice, type SettingsState } from '@studio/events';
import { effortLabel } from '../chat/composerControls.js';
import { t } from '@studio/i18n';
import { ClaudeMarkIcon, OpenAiMarkIcon, modelMarkIcon } from '../icons/glyphs.js';
import { offersSetUp, type Readiness } from './readiness.js';

export const SETTINGS_TESTIDS = {
  codePanelToggle: 'settings-code-panel-toggle',
  pane: 'settings-pane',
  agentRow: 'settings-agent-row',
  agentSelector: 'settings-agent-selector',
  agentReadiness: 'settings-agent-readiness',
  setupAction: 'settings-agent-setup',
  modelRow: 'settings-model-row',
  modelSelector: 'settings-model-selector',
  effortRow: 'settings-effort-row',
  effortSelector: 'settings-effort-selector',
} as const;

export interface SettingsSwitchProps {
  value: boolean;
  onChange: (enabled: boolean) => void;
  isSaving?: boolean;
  saveFailed?: boolean;
}

export interface AnalyticsRowProps extends SettingsSwitchProps {
  consent?: SettingsState['telemetryConsent'];
}

export function AnalyticsRow({ value, onChange, isSaving = false, saveFailed = false, consent }: AnalyticsRowProps): React.JSX.Element {
  const removed = consent === 'removed';
  const label = t(consent === undefined ? 'settings.analytics.label' : 'telemetry.settings.label');
  return (
    <VStack gap={0} width="100%">
      <SettingsRow
        label={label}
        description={t(removed ? 'telemetry.settings.removed' : consent === undefined ? 'settings.analytics.description' : 'telemetry.settings.description')}
        testId="settings-analytics-row"
        facts={{ enabled: String(value) }}
        control={
          <Switch
            label={label}
            isLabelHidden
            value={value}
            onChange={onChange}
            isLoading={isSaving}
            isDisabled={isSaving || removed}
            data-testid="settings-analytics-toggle"
          />
        }
      />
      {saveFailed && <Text type="supporting" role="alert" style={{ color: 'var(--color-error)', paddingInline: 'var(--spacing-5)', paddingBottom: 'var(--spacing-3)' }}>{t('settings.analytics.saveFailed')}</Text>}
    </VStack>
  );
}

export function CodePanelRow({ value, onChange, isSaving = false, saveFailed = false }: SettingsSwitchProps): React.JSX.Element {
  return (
    <SettingsRow
      label={t('settings.codePanel.label')}
      description={t('settings.codePanel.description')}
      testId="settings-code-panel-row"
      facts={{ enabled: String(value) }}
      control={
        <Switch
          label={t('settings.codePanel.label')}
          isLabelHidden
          value={value}
          onChange={onChange}
          isLoading={isSaving}
          isDisabled={isSaving}
          status={saveFailed ? { type: 'error', message: t('settings.codePanel.saveFailed') } : undefined}
          data-testid={SETTINGS_TESTIDS.codePanelToggle}
        />
      }
    />
  );
}

export interface ResetTipsRowProps {
  onReset: () => void;
  state: 'idle' | 'resetting' | 'done' | 'failed';
}

export function ResetTipsRow({ onReset, state }: ResetTipsRowProps): React.JSX.Element {
  return (
    <VStack gap={0} width="100%">
      <SettingsRow
        label={t('settings.tips.label')}
        description={t('settings.tips.description')}
        testId="settings-tips-row"
        facts={{ state }}
        control={
          <Button
            label={t(state === 'done' ? 'settings.tips.done' : 'settings.tips.reset')}
            variant="secondary"
            size="sm"
            onClick={onReset}
            isLoading={state === 'resetting'}
            isDisabled={state === 'resetting' || state === 'done'}
            data-testid="settings-tips-reset"
          />
        }
      />
      {state === 'failed' && <Text type="supporting" role="alert" style={{ color: 'var(--color-error)', paddingInline: 'var(--spacing-5)', paddingBottom: 'var(--spacing-3)' }}>{t('settings.tips.failed')}</Text>}
    </VStack>
  );
}

/** The Selector's value for "Default" (`null` upstream). Namespaced so a catalog id cannot collide with it; the composer already treats a literal `default` id as a model row. */
const DEFAULT_OPTION = 'studio:default';

function fromOption(next: string): string | null {
  return next === DEFAULT_OPTION ? null : next;
}

const ROW = {
  paddingBlock: 'var(--spacing-3)',
  /* 20, the design's own row inset — one step wider than the card default. */
  paddingInline: 'var(--spacing-5)',
} as const;

/**
 * The design's leading, this pane only — see the token's note in `styles.css`.
 *
 * ⚠️ Re-points the leading TOKENS, not `line-height`: `Text` carries its own
 * `line-height: var(--text-body-leading)` rule, which beats anything inherited
 * from an ancestor. Setting the variables here is what reaches it.
 */
export const PANE_LEADING = {
  '--text-body-leading': 'var(--studio-settings-leading)',
  '--text-label-leading': 'var(--studio-settings-leading)',
  '--text-supporting-leading': 'var(--studio-settings-leading)',
} as React.CSSProperties;



const ROW_TEXT = { flex: '1 1 auto', minWidth: 0 } as const;
const ROW_CONTROL = { flex: '0 0 auto' } as const;

export interface SettingsSectionProps {
  label: string;
  description?: string;
  testId?: string;
  /** Rows. Pass several as an array, not a fragment: a fragment is one child and gets one divider. */
  children: ReactNode;
}

/** A divider is positional; it borrows the key of the row it precedes (`Children.toArray` gives every element one). */
function dividerKey(row: ReactNode, position: number): string {
  return `divider-${isValidElement(row) && row.key !== null ? row.key : position}`;
}

export function SettingsSection({ label, description, testId, children }: SettingsSectionProps): React.JSX.Element {
  const rows = Children.toArray(children);
  return (
    <VStack gap={2} data-testid={testId}>
      <VStack gap={0.5}>
        <Text type="body" size="lg" color="secondary">
          {label}
        </Text>
        {description !== undefined && <Text type="supporting">{description}</Text>}
      </VStack>
      <Card padding={0}>
        <VStack gap={0}>{rows.flatMap((row, position) => (position === 0 ? [row] : [<Divider key={dividerKey(row, position)} />, row]))}</VStack>
      </Card>
    </VStack>
  );
}

export interface SettingsRowProps {
  label: string;
  description?: string;
  control: ReactNode;
  testId?: string;
  /** Rendered as `data-<name>` so a driver reads state without copy. */
  facts?: Record<string, string>;
}

export function SettingsRow({ label, description, control, testId, facts = {} }: SettingsRowProps): React.JSX.Element {
  const attributes = Object.fromEntries(Object.entries(facts).map(([name, value]) => [`data-${name}`, value]));
  return (
    <HStack gap={4} vAlign="center" justify="between" style={ROW} data-testid={testId} {...attributes}>
      <VStack gap={0.5} style={ROW_TEXT}>
        <Text type="body">{label}</Text>
        {description !== undefined && <Text type="supporting">{description}</Text>}
      </VStack>
      <HStack style={ROW_CONTROL}>{control}</HStack>
    </HStack>
  );
}

function isHarnessId(value: string): value is HarnessId {
  return (HARNESS_IDS as readonly string[]).includes(value);
}

function agentName(harness: HarnessId): string {
  switch (harness) {
    case 'claude':
      return t('agent.name.claude');
    case 'codex':
      return t('agent.name.codex');
    case 'opencode':
      return t('agent.name.opencode');
    case 'freebuff':
      return t('agent.name.freebuff');
  }
}

function readinessLabel(readiness: Readiness): string {
  switch (readiness) {
    case 'ready':
      return t('settings.readiness.ready');
    case 'not-installed':
      return t('settings.readiness.not-installed');
    case 'not-signed-in':
      return t('settings.readiness.not-signed-in');
    case 'sign-in-incomplete':
      return t('settings.readiness.sign-in-incomplete');
    case 'needs-attention':
      return t('settings.readiness.needs-attention');
    case 'checking':
      return t('settings.readiness.checking');
  }
}

export interface DefaultAgentRowProps {
  billingLabel?: string;
  value: HarnessId;
  readiness: Record<HarnessId, Readiness>;
  onChange: (agent: HarnessId) => void;
  onSetUp: (agent: HarnessId) => void;
}

export function DefaultAgentRow({ value, readiness, onChange, onSetUp, billingLabel }: DefaultAgentRowProps): React.JSX.Element {
  const current = readiness[value];
  const options = HARNESS_IDS.map((harness) => ({
    value: harness,
    label: agentName(harness),
    icon: harness === 'codex' ? OpenAiMarkIcon : ClaudeMarkIcon,
  }));
  const control = (
    /* Stacked, not inline: inline narrows the label column enough to wrap the
       row's description, which costs more height than the second line saves. */
    /* `stretch`, not `end`: a column's cross axis is the horizontal one, so this
       is what makes the trigger fill the seat — `Selector` takes no width prop
       and forwards no style to it. */
    <VStack gap={1.5} hAlign="stretch" style={AGENT_SEAT}>
      <Selector
        label={t('settings.defaultAgent.label')}
        isLabelHidden
        size="sm"
        placement="below"
        options={options}
        value={value}
        startIcon={modelMarkIcon(value)}
        onChange={(next) => {
          if (isHarnessId(next)) onChange(next);
        }}
        data-testid={SETTINGS_TESTIDS.agentSelector}
      />
      {/* Set up FIRST, the verdict pinned to the seat's right edge and given a
          seat of its own. Read the other way round, a verdict that gains a
          button — Ready to Not installed — is shoved left by the button's whole
          width while the eye is on it, which is the jump this row had. */}
      <HStack gap={2} vAlign="center" justify="end" style={STATUS_LINE}>
        {current !== 'ready' && (
          <Button
            size="sm"
            variant="secondary"
            label={value === 'claude' && current === 'not-signed-in'
              ? t('settings.signInClaude')
              : value === 'claude' && current === 'sign-in-incomplete'
                ? t('settings.continueSignIn')
                : t('settings.setUp')}
            isDisabled={!offersSetUp(current)}
            onClick={() => onSetUp(value)}
            data-testid={SETTINGS_TESTIDS.setupAction}
          />
        )}
        <Text
          type="supporting"
          style={READINESS_SEAT}
          data-testid={SETTINGS_TESTIDS.agentReadiness}
          data-readiness={current}
        >
          {readinessLabel(current)}
        </Text>
      </HStack>
    </VStack>
  );
  return (
    <SettingsRow
      label={t('settings.defaultAgent.label')}
      description={value === 'claude' && billingLabel !== undefined ? billingLabel : t('settings.defaultAgent.description')}
      control={control}
      testId={SETTINGS_TESTIDS.agentRow}
      facts={{ value, readiness: current }}
    />
  );
}

export interface DefaultModelRowProps {
  /** `null` is Default: the run picks its own model. */
  value: string | null;
  /** The catalog main remembered for this agent; empty until a project has opened once. */
  options: readonly ModelChoice[];
  onChange: (value: string | null) => void;
}

export interface SelectorView {
  selected: string;
  choices: { value: string; label: string }[];
}

export function modelSelectorFor(value: string | null, options: readonly ModelChoice[]): SelectorView {
  const known = findModelChoice(options, value) !== undefined;
  return {
    // Deliberately `resolvedModel` ALONE: a stored id that is some row's own
    // `value` already names a selectable option, and matching `value` here would
    // pick that row ahead of the alias row whose `resolvedModel` it resolves to.
    selected: value === null ? DEFAULT_OPTION : (options.find((option) => option.resolvedModel === value)?.value ?? value),
    choices: [
      { value: DEFAULT_OPTION, label: t('settings.defaultModel.default') },
      ...(value !== null && !known ? [{ value, label: modelLabel(value) }] : []),
      ...options.map((option) => ({ value: option.value, label: option.displayName })),
    ],
  };
}

export function effortSelectorFor(value: EffortLevel | null, levels: readonly EffortLevel[]): SelectorView {
  return {
    selected: value ?? DEFAULT_OPTION,
    choices: [
      { value: DEFAULT_OPTION, label: t('chat.composer.effort.default') },
      ...(value !== null && !levels.includes(value) ? [{ value, label: effortLabel(value) }] : []),
      ...levels.map((level) => ({ value: level, label: effortLabel(level) })),
    ],
  };
}

export function DefaultModelRow({ value, options, onChange }: DefaultModelRowProps): React.JSX.Element {
  const empty = options.length === 0;
  const { selected, choices } = modelSelectorFor(value, options);
  return (
    <SettingsRow
      label={t('settings.defaultModel.label')}
      description={empty ? t('settings.defaultModel.empty') : undefined}
      control={
        <Selector
          label={t('settings.defaultModel.label')}
          isLabelHidden
          size="sm"
          placement="below"
          options={choices}
          value={selected}
          isDisabled={empty}
          onChange={(next) => onChange(fromOption(next))}
          data-testid={SETTINGS_TESTIDS.modelSelector}
        />
      }
      testId={SETTINGS_TESTIDS.modelRow}
      facts={{ value: value ?? 'default', options: String(options.length) }}
    />
  );
}

export interface DefaultEffortRowProps {
  /** `null` is Default: the run keeps the user's own setting. */
  value: EffortLevel | null;
  /** The selected model's own levels; empty means it declared none and the row disables. */
  levels: readonly EffortLevel[];
  onChange: (value: EffortLevel | null) => void;
}

export function DefaultEffortRow({ value, levels, onChange }: DefaultEffortRowProps): React.JSX.Element {
  const none = levels.length === 0;
  const { selected, choices } = effortSelectorFor(value, levels);
  return (
    <SettingsRow
      label={t('settings.defaultEffort.label')}
      description={none ? t('settings.defaultEffort.none') : undefined}
      control={
        <Selector
          label={t('settings.defaultEffort.label')}
          isLabelHidden
          size="sm"
          placement="below"
          options={choices}
          value={selected}
          isDisabled={none}
          onChange={(next) => onChange(fromOption(next))}
          data-testid={SETTINGS_TESTIDS.effortSelector}
        />
      }
      testId={SETTINGS_TESTIDS.effortRow}
      facts={{ value: value ?? 'default', levels: String(levels.length) }}
    />
  );
}

/**
 * One seat for the agent control, whatever is in it.
 *
 * ⚠️ Without this the trigger sizes to its own content, so picking the other
 * agent resizes it — a different name, a different mark — and the row jumps
 * under the pointer that just clicked it. The width is the design's own.
 */
const AGENT_SEAT = { flex: '0 0 auto', width: 'var(--studio-settings-agent-width)' } as const;

/** The verdict's own seat, wide enough for the longest of them, so changing it moves nothing. */
/** The status line holds the button's height whether or not the button is there — otherwise the row grows by 8 and everything under it steps down. */
const STATUS_LINE = { minHeight: 'var(--studio-settings-status-height)' } as const;


const READINESS_SEAT = {
  flex: '0 0 auto',
  width: 'var(--studio-settings-readiness-width)',
  textAlign: 'right',
} as const;
