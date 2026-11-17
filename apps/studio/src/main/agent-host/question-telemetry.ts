import { answerCounts, type Question, type QuestionAnswerInput, type QuestionAnswers } from '@studio/events';
import { harnessStoredAs } from './harness.js';
import type { SessionHarness } from './sessions.js';

export function questionAnsweredProperties(questions: readonly Question[], answers: QuestionAnswers, input: QuestionAnswerInput, requestedAt: number, harness: SessionHarness, wentBack = false, now = Date.now()) {
  const method: QuestionAnswerInput = input === 'typed' || input === 'number-key' ? input : 'tap';
  const waited = Math.max(0, now - requestedAt);
  const counts = answerCounts(questions, answers);
  return {
    first_option_picks: counts.firstOptionPicks,
    notes: counts.notes,
    option_count: questions.reduce((count, question) => count + question.options.length, 0),
    question_count: questions.length,
    multi_select: questions.some((question) => question.multiSelect === true),
    used_other: method === 'typed',
    input: method,
    went_back: wentBack,
    time_to_answer_bucket: waited < 10_000 ? 'under-10s' as const : waited < 30_000 ? '10-30s' as const : waited < 120_000 ? '30-120s' as const : 'over-120s' as const,
    harness: harnessStoredAs(harness).telemetry,
  };
}
