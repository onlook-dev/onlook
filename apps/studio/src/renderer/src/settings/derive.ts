import { findModelChoice, type EffortLevel, type HarnessId, type ModelChoice, type SettingsDefaults } from '@studio/events';

export const NO_DEFAULTS: SettingsDefaults = { claude: { models: [] }, codex: { models: [] } };

/** Absent levels offer none, never every level. */
export function effortLevelsFor(options: readonly ModelChoice[], value: string | null): readonly EffortLevel[] {
  const selected = value === null ? options[0] : findModelChoice(options, value);
  return selected?.supportedEffortLevels ?? [];
}

export function carriesEffort(options: readonly ModelChoice[], value: string | null, effort: EffortLevel | null): boolean {
  return effort === null || effortLevelsFor(options, value).includes(effort);
}

export interface SelectedDefaults {
  /** `null` is the row's "Default". */
  model: string | null;
  effort: EffortLevel | null;
  options: readonly ModelChoice[];
  levels: readonly EffortLevel[];
}

export function selectedDefaults(defaults: SettingsDefaults, harness: HarnessId): SelectedDefaults {
  const held = defaults[harness];
  const options = held?.models ?? [];
  const model = held?.model ?? null;
  return { model, effort: held?.effort ?? null, options, levels: effortLevelsFor(options, model) };
}

/** "Show tips again" brings back only the tips a flag draws, so with every one off there is nothing to reset (ONL-2901). */
export function offersTipsReset(flags: { promptTip: boolean; inviteTip: boolean; blankFirstMoment: boolean }): boolean {
  return flags.promptTip || flags.inviteTip || flags.blankFirstMoment;
}
