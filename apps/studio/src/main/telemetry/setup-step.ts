import { capture } from './index.js';
import { HARNESS_IDS } from '@studio/events';
import type { TelemetryProperties, SetupSkipReason } from './events.js';
import { markAgentSetupCompleted, resetSetupCompletionCacheForTesting } from './setup-completion.js';
import { classifySetupFailure, rememberSetupFailure, type SetupFailureInput } from './setup-failure.js';

type SetupStep = TelemetryProperties<'agent_setup_step'>;
type Provider = SetupStep['provider'];
type Step = SetupStep['step'];
type Outcome = SetupStep['outcome'];
type EntryPoint = SetupStep['entry_point'];

export type SetupStepOutcome = NonNullable<Outcome>;

const TERMINAL_STEPS: ReadonlySet<Step> = new Set(['connected', 'fallback', 'cancelled', 'skipped']);

const lastEntryPoint: Partial<Record<Provider, EntryPoint>> = {};
const attempts: Partial<Record<Provider, { step: Step; entryPoint: EntryPoint; renderer?: number }>> = {};

export function settleAgentSetupAttempt(provider: Provider): void {
  delete attempts[provider];
}

export function recordAgentSetupOpened(provider: Provider, entryPoint: EntryPoint, renderer?: number): void {
  const attempt = attempts[provider];
  if (attempt !== undefined) {
    if (renderer !== undefined) attempt.renderer = renderer;
    return;
  }
  recordAgentSetupStep(provider, 'opened', { entryPoint });
  const opened = attempts[provider];
  if (opened !== undefined && renderer !== undefined) opened.renderer = renderer;
}

export function recordAgentSetupStep(
  provider: Provider,
  step: Step,
  opts: { entryPoint?: EntryPoint; outcome?: Outcome; browserChoice?: SetupStep['browser_choice']; reason?: SetupSkipReason; failure?: SetupFailureInput } = {},
): void {
  if (opts.entryPoint !== undefined && opts.entryPoint !== 'startup') lastEntryPoint[provider] = opts.entryPoint;
  const entryPoint = opts.entryPoint ?? lastEntryPoint[provider] ?? lastEntryPoint.claude ?? 'unknown';
  const outcome = opts.outcome === undefined ? {} : { outcome: opts.outcome };
  const browser = opts.browserChoice === undefined ? {} : { browser_choice: opts.browserChoice };
  const reason = opts.reason === undefined ? {} : { reason: opts.reason };
  const failure = step === 'fallback' ? classifySetupFailure({ outcome: opts.outcome, ...opts.failure }) : undefined;
  if (step === 'fallback' || step === 'connected' || step === 'install_started' || step === 'sign_in_started') rememberSetupFailure(provider, failure);
  capture('agent_setup_step', { provider, harness: provider, step, entry_point: entryPoint, ...outcome, ...browser, ...reason, ...failure });
  if (TERMINAL_STEPS.has(step)) delete attempts[provider];
  else if (step === 'opened' || step === 'sign_in_started' || step === 'install_started' || step === 'verify_started' || attempts[provider] !== undefined) attempts[provider] = { ...attempts[provider], step, entryPoint };
  if (step === 'connected') {
    const captured = capture('agent_setup_completed', {
      provider,
      success: true,
      entry_point: entryPoint,
      ...outcome,
    });
    if (captured) markAgentSetupCompleted(provider);
  }
}

export function recordCodexSetupState(status: string, message?: string, failure?: SetupFailureInput): void {
  if (status === 'failed' || status === 'broken' || status === 'outdated' || status === 'unsupported') {
    recordAgentSetupStep('codex', 'fallback', { outcome: 'failed', failure: failure ?? { detail: status, error: message } });
  }
}

export function checkSetupAbandoned(onlyProvider?: Provider): void {
  for (const provider of onlyProvider === undefined ? HARNESS_IDS : [onlyProvider]) {
    const attempt = attempts[provider];
    if (attempt === undefined) continue;
    delete attempts[provider];
    capture('agent_setup_abandoned', { provider, entry_point: attempt.entryPoint, last_step: attempt.step });
  }
}

export function abandonSetupForRenderer(renderer: number): void {
  for (const provider of HARNESS_IDS) {
    if (attempts[provider]?.renderer === renderer) checkSetupAbandoned(provider);
  }
}

export function resetSetupTelemetryForTesting(): void {
  rememberSetupFailure('claude');
  rememberSetupFailure('codex');
  resetSetupCompletionCacheForTesting();
  delete lastEntryPoint.claude;
  delete lastEntryPoint.codex;
  delete attempts.claude;
  delete attempts.codex;
}
