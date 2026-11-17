import { expect, it } from 'bun:test';
import type { StudioEvent } from '@studio/events';
import { artifactCodebaseTarget } from './artifact-target.js';

const base = { sessionId: 'session', eventId: 'event', ts: 0, cwd: 'registered-project' };
const attached: StudioEvent = { ...base, type: 'message.user', seq: 1, turnId: 'turn', text: '', attachments: [{ kind: 'artifact', artifactId: 'one', title: 'Private user title' }] };
const start: StudioEvent = { ...base, type: 'turn.started', seq: 2, turnId: 'turn' };
const end: StudioEvent = { ...base, type: 'turn.ended', seq: 3, turnId: 'turn', filesChanged: 2 };

it('records a real code edit with an artifact reference using scalars only', () => {
  expect(artifactCodebaseTarget(end, [attached, start, end])).toEqual({ count: 1 });
  expect(JSON.stringify(artifactCodebaseTarget(end, [attached, start, end]))).not.toContain('Private');
});

it('does not borrow a prior reference or report artifact-only turns as code edits', () => {
  const plain: StudioEvent = { ...attached, seq: 4, attachments: [] };
  const next: StudioEvent = { ...start, seq: 5, turnId: 'next' };
  const ending: StudioEvent = { ...end, seq: 6, turnId: 'next' };
  expect(artifactCodebaseTarget(ending, [attached, start, end, plain, next, ending])).toBeNull();
  expect(artifactCodebaseTarget({ ...end, filesChanged: 0 }, [attached, start, end])).toBeNull();
});
