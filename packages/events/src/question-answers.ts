import type { Question, QuestionAnswers } from './events.js';

/** The model writes the mark in the language it is speaking, in half- or full-width brackets. */
const RECOMMENDED_SUFFIX = /\s*[(（]\s*(?:recommended|おすすめ|オススメ|お勧め|お薦め|推奨)\s*[)）]\s*$/iu;

/** The SDK's own tool text asks the model to mark its pick this way; nothing on screen carries the mark. */
export function withoutRecommended(label: string): string {
  return label.replace(RECOMMENDED_SUFFIX, '');
}

export interface AnswerParts {
  picks: string[];
  note: string;
}

const JOIN = ', ';

/** Splits a sent answer back into the options it picked, in option order, and whatever was typed after them. */
export function answerParts(question: Question, answer: string): AnswerParts {
  const picks: string[] = [];
  let rest = answer;
  for (const option of question.options) {
    if (option.label === '' || !rest.startsWith(option.label)) continue;
    const after = rest.slice(option.label.length);
    if (after !== '' && !after.startsWith(JOIN)) continue;
    picks.push(option.label);
    rest = after.slice(JOIN.length);
  }
  return { picks, note: rest.trim() };
}

export function joinAnswer(picks: readonly string[], note: string): string {
  return [...picks, ...(note.trim() === '' ? [] : [note.trim()])].join(JOIN);
}

export interface AnswerCounts {
  /** Questions whose answer took the option the agent listed first. */
  firstOptionPicks: number;
  /** Questions answered with a pick and typed words beside it. */
  notes: number;
}

export function answerCounts(questions: readonly Question[], answers: QuestionAnswers): AnswerCounts {
  let firstOptionPicks = 0;
  let notes = 0;
  for (const question of questions) {
    const answer = answers[question.question];
    if (answer === undefined) continue;
    const { picks, note } = answerParts(question, answer);
    if (question.options[0] !== undefined && picks.includes(question.options[0].label)) firstOptionPicks += 1;
    if (picks.length > 0 && note !== '') notes += 1;
  }
  return { firstOptionPicks, notes };
}
