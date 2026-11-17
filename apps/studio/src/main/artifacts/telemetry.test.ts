import { describe, expect, it } from 'bun:test';
import { ARTIFACT_INTEGRITY_OUTCOMES } from '@studio/events';
import { recordArtifactAction, recordArtifactIntegrity } from './telemetry.js';

it('records name, search and deletion actions using counts only, never input text or identity', () => {
  const captured: unknown[] = [];
  for (const action of ['renamed', 'searched', 'deleted'] as const) recordArtifactAction(action, 2, (event, properties) => {captured.push({event, properties});});
  expect(captured).toEqual(['renamed', 'searched', 'deleted'].map((action) => ({event: `artifact_${action}`, properties: {count: 2}})));
});

describe('the integrity event', () => {
  it('carries the outcome and a count, and nothing else', () => {
    const captured: { event: string; properties: Record<string, unknown> }[] = [];
    const emit = (event: string, properties: unknown): void => {
      captured.push({ event, properties: properties as Record<string, unknown> });
    };

    for (const outcome of ARTIFACT_INTEGRITY_OUTCOMES) {
      recordArtifactIntegrity(outcome, 3, emit as never);
    }

    expect(captured.map((row) => row.event)).toEqual([
      'artifact_integrity',
      'artifact_integrity',
      'artifact_integrity',
    ]);
    expect(captured[0]?.properties).toEqual({ outcome: 'quarantined', count: 3 });
    expect(captured.map((row) => row.properties['outcome'])).toEqual([
      'quarantined',
      'newer_build_refused',
      'index_rebuilt',
    ]);
  });

  it('ships no title, path or content for any outcome', () => {
    const captured: unknown[] = [];
    const emit = (event: string, properties: unknown): void => {
      captured.push({ event, properties });
    };

    for (const outcome of ARTIFACT_INTEGRITY_OUTCOMES) {
      recordArtifactIntegrity(outcome, 1, emit as never);
    }

    const shipped = JSON.stringify(captured);
    expect(shipped).not.toContain('title');
    expect(shipped).not.toContain('/');
    expect(shipped).not.toContain('artifacts');
    // Only the three declared property names ever appear.
    for (const row of captured as { properties: Record<string, unknown> }[]) {
      expect(Object.keys(row.properties).sort()).toEqual(['count', 'outcome']);
    }
  });
});
