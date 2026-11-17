import { expect, test } from 'bun:test';
import { questionAnsweredProperties } from './question-telemetry.js';

test('question telemetry contains only shape, counts, method, wait bucket and Harness', () => {
  const properties = questionAnsweredProperties([{ question: 'Private question', header: 'Private header', multiSelect: true, options: [{ label: 'Private answer', description: 'Private description' }] }], { 'Private question': 'Private answer, Private note' }, 'typed', 1000, 'appserver', true, 31_000);
  expect(properties).toEqual({ first_option_picks: 1, notes: 1, option_count: 1, question_count: 1, multi_select: true, used_other: true, input: 'typed', went_back: true, time_to_answer_bucket: '30-120s', harness: 'codex' });
  expect(JSON.stringify(properties)).not.toContain('Private');
});

test('untrusted input metadata cannot carry text into telemetry', () => {
  const properties = questionAnsweredProperties([], {}, 'Private answer' as never, 0, 'claude', false, 0);
  expect(properties.input).toBe('tap');
  expect(JSON.stringify(properties)).not.toContain('Private');
});
