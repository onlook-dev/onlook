import type { ArtifactIntegrityOutcome } from '@studio/events';
import { capture } from '../telemetry/index.js';
import type { TelemetryEventName, TelemetryProperties } from '../telemetry/events.js';

export type Capture = <N extends TelemetryEventName>(
  event: N,
  properties: TelemetryProperties<N>,
) => void;

export function recordArtifactAction(action: 'renamed' | 'searched' | 'deleted', count: number, emit: Capture = capture): void {
  emit(`artifact_${action}`, {count});
}

/**
 * The signal behind "zero artifacts lost": nothing here carries a title, a path or any
 * content, so a count and the outcome are the whole event (ONL-2568).
 */
export function recordArtifactIntegrity(
  outcome: ArtifactIntegrityOutcome,
  count: number,
  emit: Capture = capture,
): void {
  emit('artifact_integrity', { outcome, count });
}
