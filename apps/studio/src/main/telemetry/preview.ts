// `frame_state_changed` is a transition stream, so a flapping project emits several rows; the first settlement per launch wins.

import { capture } from './index.js';
import type { SetupErrorClass, WorkspaceTelemetryProperties } from './events.js';

const settled = new Set<string>();

export interface PreviewSettlement {
  workspaceTelemetry: WorkspaceTelemetryProperties;
  state: 'loading' | 'live' | 'unreachable';
  elapsedMs: number;
  entryPoint?: 'blank' | 'import' | 'repo' | 'reopen';
}

export function recordPreviewSettlement(settlement: PreviewSettlement): void {
  if (settlement.state === 'loading') return;
  if (settled.has(settlement.workspaceTelemetry.project_id)) return;
  settled.add(settlement.workspaceTelemetry.project_id);
  const failed = settlement.state === 'unreachable';
  capture('preview_ready', {
    ...settlement.workspaceTelemetry,
    outcome: failed ? 'failure' : 'success',
    duration_ms: settlement.elapsedMs,
    ...(settlement.entryPoint === undefined ? {} : { entry_point: settlement.entryPoint }),
    ...(failed ? { error_class: 'port_unreachable' satisfies SetupErrorClass } : {}),
  });
}

export function resetPreviewLatchForTesting(): void {
  settled.clear();
}
