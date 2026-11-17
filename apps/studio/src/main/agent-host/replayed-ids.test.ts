import { expect, test } from 'bun:test';
import { learnRunIds, withRunIds, type RunIds } from './replayed-ids.js';

const RECORDED_FRAME = '8ada2de7-fe0a-4283-87e0-136059070504';
const LIVE_FRAME = '1b4c7a2e-0d5f-4e6a-9c3b-2f8e1d7a6b50';

test("a recorded frame id and port become this run's in every later row", () => {
  const ids: RunIds = new Map();
  learnRunIds(
    [{ type: 'text', text: JSON.stringify([{ id: RECORDED_FRAME, url: 'http://localhost:59196/' }]) }],
    [{ type: 'text', text: JSON.stringify([{ id: LIVE_FRAME, url: 'http://localhost:63846/' }]) }],
    ids,
  );
  const later = { message: { content: [{ type: 'tool_use', input: { frame_id: RECORDED_FRAME, url: 'http://localhost:59196/' } }] } };
  expect(withRunIds(later, ids)).toEqual({ message: { content: [{ type: 'tool_use', input: { frame_id: LIVE_FRAME, url: 'http://localhost:63846/' } }] } });
});

test('answers that disagree on how many ids they name teach nothing, and an unchanged row is returned as is', () => {
  const ids: RunIds = new Map();
  learnRunIds(`${RECORDED_FRAME} ${RECORDED_FRAME.replace('8', '9')}`, LIVE_FRAME, ids);
  expect(ids.size).toBe(0);
  const row = { frame_id: RECORDED_FRAME };
  expect(withRunIds(row, ids)).toBe(row);
});
