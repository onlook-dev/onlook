import type { ClaudeSetupStatus, CodexSetupStatus, HarnessId, ModelChoice } from '@studio/events';
import { readinessByHarness, type Readiness } from './readiness.js';

export type ReadinessFixtureId = 'ready' | 'not-signed-in' | 'not-installed' | 'unsupported' | 'checking';

export const READINESS_FIXTURE_IDS = ['ready', 'not-signed-in', 'not-installed', 'unsupported', 'checking'] as const satisfies readonly ReadinessFixtureId[];

export interface ReadinessFixture {
  agent: HarnessId;
  readiness: Record<HarnessId, Readiness>;
  claude: ClaudeSetupStatus;
  codex: CodexSetupStatus;
}

function fixture(agent: HarnessId, claude: ClaudeSetupStatus, codex: CodexSetupStatus): ReadinessFixture {
  return { agent, readiness: readinessByHarness(claude, codex), claude, codex };
}

/** Built through the real mapping, never a hand-typed verdict. */
export const READINESS_FIXTURES: Record<ReadinessFixtureId, ReadinessFixture> = {
  ready: fixture('claude', 'signed-in', 'ready'),
  'not-signed-in': fixture('claude', 'signed-out', 'ready'),
  'not-installed': fixture('codex', 'signed-in', 'failed'),
  unsupported: fixture('codex', 'signed-in', 'unsupported'),
  // `idle` reads as not-installed, so checking is `validating`.
  checking: fixture('codex', 'signed-in', 'validating'),
};

export const MODEL_CATALOGS: Record<HarnessId, readonly ModelChoice[]> = {
  claude: [
    { value: 'opus', resolvedModel: 'claude-opus-4-1', displayName: 'Claude Opus 4.1', supportedEffortLevels: ['low', 'medium', 'high', 'max'] },
    { value: 'sonnet', resolvedModel: 'claude-sonnet-4-5', displayName: 'Claude Sonnet 4.5', supportedEffortLevels: ['low', 'medium', 'high'] },
    { value: 'claude-haiku-4-5', displayName: 'Claude Haiku 4.5' },
  ],
  codex: [
    { value: 'gpt-5.6', displayName: 'gpt-5.6', supportedEffortLevels: ['low', 'medium', 'high', 'xhigh', 'max', 'ultra'] },
    { value: 'gpt-5.5', displayName: 'gpt-5.5', supportedEffortLevels: ['low', 'medium', 'high', 'xhigh'] },
  ],
};

export const EMPTY_CATALOG: readonly ModelChoice[] = [];
