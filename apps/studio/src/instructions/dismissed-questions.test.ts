import { describe, expect, it } from 'bun:test';
import type { StudioEvent } from '@studio/events';
import { DISMISSED_QUESTIONS_CONTEXT, dismissedQuestionsContext } from './dismissed-questions.js';

type Input = StudioEvent extends infer T ? (T extends unknown ? Omit<T, 'sessionId' | 'eventId' | 'seq' | 'ts'> : never) : never;

function log(...inputs: Input[]): StudioEvent[] {
  return inputs.map((input, index) => ({ ...input, sessionId: 's1', eventId: `e${index}`, seq: index, ts: index }) as StudioEvent);
}

const questions = [{ question: 'Which layout?', header: 'Layout', options: [{ label: 'Grid', description: 'Tiles' }] }];
const asked = (requestId: string): Input => ({
  type: 'permission.requested', requestId, toolCallId: `q-${requestId}`, toolName: 'AskUserQuestion',
  options: [{ optionId: 'allow', label: 'Allow', kind: 'allow_once' }], questions,
});
const first: Input = { type: 'message.user', turnId: 't1', text: 'make a landing page', origin: 'user' };

describe('the context the person\'s next message carries after a dismissal (ONL-2901)', () => {
  it('names the dismissal when the latest question was dismissed and the person has not spoken since', () => {
    const events = log(first, asked('r1'), { type: 'permission.resolved', requestId: 'r1', toolCallId: 'q-r1', outcome: 'canceled', dismissed: true }, { type: 'turn.ended', turnId: 't1', stopReason: 'interrupted' });
    expect(dismissedQuestionsContext(events)).toBe(DISMISSED_QUESTIONS_CONTEXT);
  });

  it('is gone once the person has sent a message after the dismissal', () => {
    const events = log(first, asked('r1'), { type: 'permission.resolved', requestId: 'r1', toolCallId: 'q-r1', outcome: 'canceled', dismissed: true }, { type: 'message.user', turnId: 't2', text: 'grid please', origin: 'user' });
    expect(dismissedQuestionsContext(events)).toBeUndefined();
  });

  it('survives a message Studio sent on its own', () => {
    const events = log(first, asked('r1'), { type: 'permission.resolved', requestId: 'r1', toolCallId: 'q-r1', outcome: 'canceled', dismissed: true }, { type: 'message.user', turnId: 't2', text: 'look at the frame', origin: 'studio' });
    expect(dismissedQuestionsContext(events)).toBe(DISMISSED_QUESTIONS_CONTEXT);
  });

  it('is absent after an answered or a plainly stopped question', () => {
    expect(dismissedQuestionsContext(log(first, asked('r1'), { type: 'permission.resolved', requestId: 'r1', toolCallId: 'q-r1', outcome: 'allow_once', answers: { 'Which layout?': 'Grid' } }))).toBeUndefined();
    expect(dismissedQuestionsContext(log(first, asked('r1'), { type: 'permission.resolved', requestId: 'r1', toolCallId: 'q-r1', outcome: 'canceled' }))).toBeUndefined();
  });

  it('is absent when a later question followed the dismissed one', () => {
    const events = log(first, asked('r1'), { type: 'permission.resolved', requestId: 'r1', toolCallId: 'q-r1', outcome: 'canceled', dismissed: true }, asked('r2'), { type: 'permission.resolved', requestId: 'r2', toolCallId: 'q-r2', outcome: 'canceled' });
    expect(dismissedQuestionsContext(events)).toBeUndefined();
  });
});
