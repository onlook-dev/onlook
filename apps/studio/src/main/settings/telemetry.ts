/** `model` and `effort` arrive off a renderer payload as open strings, so they are shape-checked here; no `/` and no space admits no path (ONL-2395). */

import type { EffortLevel, HarnessId } from '@studio/events';
import { capture } from '../telemetry/index.js';

export function recordExperimentalToggled(enabled: boolean): void {
  capture('experimental_toggled', { feature: 'code_panel', enabled });
}

const ID_SHAPE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

function enumeratedId(value: string | null | undefined): string | undefined {
  return typeof value === 'string' && ID_SHAPE.test(value) ? value : undefined;
}

export function recordAgentDefaultChanged(change: {
  harness: HarnessId;
  setting: 'harness' | 'model';
  model?: string | null;
  effort?: EffortLevel | null;
}): void {
  const model = enumeratedId(change.model);
  const effort = enumeratedId(change.effort);
  capture('agent_default_changed', {
    harness: change.harness,
    setting: change.setting,
    ...(model === undefined ? {} : { model }),
    ...(effort === undefined ? {} : { effort }),
  });
}
