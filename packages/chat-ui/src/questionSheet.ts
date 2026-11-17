import { joinAnswer, withoutRecommended, type Question, type QuestionAnswerInput, type QuestionAnswers } from '@studio/events';

export interface SheetDraft {
  picks: string[];
  text: string;
}

export interface SheetState {
  requestId: string;
  at: number;
  drafts: Readonly<Record<string, SheetDraft>>;
  input: QuestionAnswerInput;
  wentBack: boolean;
}

export interface SheetStep {
  at: number;
  isCurrent: boolean;
  /** Answered with nothing unanswered before it, so a jump can never strand an empty question behind Send. */
  isOpen: boolean;
  hint?: string;
}

const HINT_LIMIT = 120;

function hintOf(answer: string): string {
  if (answer.length <= HINT_LIMIT) return answer;
  const cut = answer.slice(0, HINT_LIMIT);
  const wordEnd = cut.lastIndexOf(' ');
  return `${(wordEnd > 0 ? cut.slice(0, wordEnd) : cut).trimEnd()}…`;
}

const EMPTY: SheetDraft = { picks: [], text: '' };

export function sheetHeader(questionCount: number): 'count' | 'none' {
  return questionCount >= 2 ? 'count' : 'none';
}

export function openSheet(requestId: string): SheetState {
  return { requestId, at: 0, drafts: {}, input: 'tap', wentBack: false };
}

export function draftOf(state: SheetState, question: Question): SheetDraft {
  return state.drafts[question.question] ?? EMPTY;
}

function current(state: SheetState, questions: readonly Question[]): Question | undefined {
  return questions[state.at];
}

export function pick(state: SheetState, questions: readonly Question[], label: string, input: QuestionAnswerInput = 'tap'): SheetState {
  const question = current(state, questions);
  if (question === undefined || !question.options.some((option) => option.label === label)) return state;
  const prior = draftOf(state, question);
  const chosen = question.multiSelect === true
    ? (prior.picks.includes(label) ? prior.picks.filter((value) => value !== label) : [...prior.picks, label])
    : [label];
  const picks = question.options.map((option) => option.label).filter((value) => chosen.includes(value));
  return { ...state, input, drafts: { ...state.drafts, [question.question]: { ...prior, picks } } };
}

export function writeNote(state: SheetState, questions: readonly Question[], text: string): SheetState {
  const question = current(state, questions);
  if (question === undefined) return state;
  return { ...state, drafts: { ...state.drafts, [question.question]: { ...draftOf(state, question), text } } };
}

function isAnswered(draft: SheetDraft): boolean {
  return draft.picks.length > 0 || draft.text.trim() !== '';
}

export function sheetKey(state: SheetState, questions: readonly Question[]): { action: 'next' | 'send'; isLit: boolean } {
  const question = current(state, questions);
  return {
    action: state.at >= questions.length - 1 ? 'send' : 'next',
    isLit: question !== undefined && isAnswered(draftOf(state, question)),
  };
}

export function next(state: SheetState, questions: readonly Question[]): SheetState {
  const key = sheetKey(state, questions);
  return key.isLit && key.action === 'next' ? { ...state, at: state.at + 1 } : state;
}

export function sheetSteps(state: SheetState, questions: readonly Question[]): SheetStep[] {
  let isClearBehind = true;
  return questions.map((question, at) => {
    const draft = draftOf(state, question);
    const answered = isAnswered(draft);
    const isCurrent = at === state.at;
    const step: SheetStep = {
      at,
      isCurrent,
      isOpen: !isCurrent && answered && isClearBehind,
      ...(answered ? { hint: hintOf(joinAnswer(draft.picks.map(withoutRecommended), draft.text)) } : {}),
    };
    isClearBehind = isClearBehind && answered;
    return step;
  });
}

export function goTo(state: SheetState, questions: readonly Question[], at: number): SheetState {
  if (sheetSteps(state, questions)[at]?.isOpen !== true) return state;
  return { ...state, at, wentBack: state.wentBack || at < state.at };
}

export function sheetAnswers(questions: readonly Question[], state: SheetState): QuestionAnswers {
  const answers: QuestionAnswers = {};
  for (const question of questions) {
    const draft = draftOf(state, question);
    if (isAnswered(draft)) answers[question.question] = joinAnswer(draft.picks, draft.text);
  }
  return answers;
}

export function sheetInput(state: SheetState): QuestionAnswerInput {
  return Object.values(state.drafts).some((draft) => draft.text.trim() !== '') ? 'typed' : state.input;
}
