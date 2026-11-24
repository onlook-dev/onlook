import type { ModelChoice } from './events.js';

export type ModelAlias = 'fable' | 'opus' | 'sonnet';

const MODELS: Record<ModelAlias, string> = {
  fable: 'Fable',
  opus: 'Opus',
  sonnet: 'Sonnet',
};

export const MODEL_ALIASES = Object.keys(MODELS) as ModelAlias[];

/** A bare alias, undated: resolving it to an id gives up "latest" (ONL-1885). */
export const DEFAULT_MODEL: ModelAlias = 'opus';

export function modelLabel(modelId: string): string {
  const id = modelId.toLowerCase().replace(/\[[^\]]*\]$/, '');
  const gpt = id.match(/^gpt-(\d+(?:\.\d+)?)((?:-[a-z0-9]+)*)$/);
  if (gpt) {
    const suffix = (gpt[2] ?? '')
      .split('-')
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1));
    return ['GPT', gpt[1], ...suffix].join(' ');
  }
  for (const alias of MODEL_ALIASES) {
    const match = id.match(new RegExp(`(?:^|-)${alias}(?:-|$)(.*)`));
    if (!match) continue;

    const [major, minor] = (match[1] ?? '').split('-');
    if (!major || !/^\d+$/.test(major)) return MODELS[alias];
    if (minor && /^\d{1,2}$/.test(minor)) return `${MODELS[alias]} ${major}.${minor}`;
    return `${MODELS[alias]} ${major}`;
  }
  return modelId;
}

export function modelDisplayName(choice: Pick<ModelChoice, 'value' | 'resolvedModel' | 'displayName'>): string {
  const id = choice.resolvedModel ?? choice.value;
  const label = modelLabel(id);
  if (label === id) return choice.displayName || choice.value;
  return label;
}

const CONTEXT_WINDOW_SUFFIX = /\[1m\]$/i;

export function offeredModels<T extends Pick<ModelChoice, 'value'>>(choices: readonly T[]): T[] {
  const withWindow = new Set(
    choices
      .map((c) => c.value.toLowerCase())
      .filter((v) => CONTEXT_WINDOW_SUFFIX.test(v))
      .map((v) => v.replace(CONTEXT_WINDOW_SUFFIX, '')),
  );
  return choices.filter((c) => {
    const value = c.value.toLowerCase();
    if (value === 'default') return false;
    return CONTEXT_WINDOW_SUFFIX.test(value) || !withWindow.has(value);
  });
}

export function findModelChoice(
  options: readonly ModelChoice[],
  value: string | null | undefined,
): ModelChoice | undefined {
  if (value === null || value === undefined) return undefined;
  const exact = options.find((option) => option.value === value || option.resolvedModel === value);
  if (exact) return exact;
  const bare = (id: string): string => id.toLowerCase().replace(CONTEXT_WINDOW_SUFFIX, '');
  const wanted = bare(value);
  return options.find(
    (option) => bare(option.value) === wanted || (option.resolvedModel !== undefined && bare(option.resolvedModel) === wanted),
  );
}

export type HarnessId = 'claude' | 'codex' | 'opencode' | 'freebuff';

export const HARNESS_IDS = ['claude', 'codex', 'opencode', 'freebuff'] as const satisfies readonly HarnessId[];

export function isHarnessId(value: unknown): value is HarnessId {
  return HARNESS_IDS.some((id) => id === value);
}

/**
 * The Harnesses Onlook installs and signs in for. OpenCode and Freebuff bring their own login from
 * the terminal, so they need no setup step and the setup screens never ask about them.
 */
export type SetupHarnessId = Extract<HarnessId, 'claude' | 'codex'>;

export const SETUP_HARNESS_IDS = ['claude', 'codex'] as const satisfies readonly SetupHarnessId[];

export function isSetupHarnessId(value: unknown): value is SetupHarnessId {
  return SETUP_HARNESS_IDS.some((id) => id === value);
}
