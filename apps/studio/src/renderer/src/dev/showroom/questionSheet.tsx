import { useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { VStack } from '@astryxdesign/core/Layout';
import { ChatPanel, type ChatPanelProps } from '@studio/chat-ui';
import { emptyState, foldSessionState, type Question, type QuestionAnswers, type SessionState, type StudioEvent, type ToolCallView, type TranscriptItem } from '@studio/events';
import { Icon } from '@astryxdesign/core/Icon';
import { CHAT_FIXTURE_STRINGS as STRINGS, tool } from '../ChatFixture.js';
import { CloseIcon, CloseSmallIcon, ForwardIcon } from '../../icons/glyphs.js';
import { chatPanelProps } from '../../chat/panelProps.js';
import { REGION } from '../../layout.js';
import type { Category } from './Showroom.js';

const FONT: Question = {
  header: 'Font',
  question: 'Which font style should the headline use?',
  options: [
    { label: 'Warm serif', description: 'Like a bakery’s menu board. Classic and warm, a little old-fashioned.' },
    { label: 'Rounded sans', description: 'Soft and friendly, still plain enough to read at any size.' },
    { label: 'Hand-lettered', description: 'Casual, like a chalkboard. The boldest change of the three.' },
  ],
};
const PARTS: Question = {
  header: 'Sections',
  question: 'Which sections should change with it?',
  multiSelect: true,
  options: [
    { label: 'Headline & tagline', description: 'The title and the line under it, so they read as one voice.' },
    { label: 'Menu list', description: 'Spacing, type and the markers beside each item.' },
    { label: 'Order button', description: 'Colour and shape, to match the new headline.' },
  ],
};
const COLOUR: Question = {
  header: 'Paper colour',
  question: 'Should the colours warm up too?',
  options: [
    { label: 'Cream and brown', description: 'Paper and crust tones behind the new type.' },
    { label: 'Keep today’s', description: 'Only the type changes; the colours stay as they are.' },
  ],
};
const SPACING: Question = {
  header: 'Menu spacing',
  question: 'How roomy should the menu feel?',
  options: [
    { label: 'Airier', description: 'More space between items, so each one stands alone.' },
    { label: 'As it is', description: 'Leave the spacing alone.' },
  ],
};
const FONT_LONG: Question = { ...FONT, question: 'Which font style should the headline use, given that the menu below it keeps its plain type and the prices stay lined up?' };

const PROMPT = 'Make the headline feel warmer.';
const LEADS: Record<number, string> = { 1: 'One quick question before I change it.', 2: 'Two quick questions before I change it.', 4: 'Four quick questions before I change it.' };
const SHEET_STRINGS = STRINGS;
const SMALL_X = <Icon icon={CloseSmallIcon} size="sm" color="inherit" />;
const MEDIUM_X = <Icon icon={CloseIcon} size="sm" color="inherit" />;
const HEIGHT = 720;
const noop = (): void => undefined;

function asking(id: string, questions: Question[]): ToolCallView {
  const base = tool(id, 'other', 'AskUserQuestion', '', 'awaiting_approval', true);
  return { ...base, permission: { ...base.permission!, requestId: `req-${id}`, questions } };
}

function answered(id: string, questions: Question[], answers: QuestionAnswers): ToolCallView {
  return { ...tool(id, 'other', 'AskUserQuestion', '', 'completed'), answeredQuestions: { questions, answers } };
}

function rows(questions: Question[], calls: ToolCallView[], more: TranscriptItem[] = []): TranscriptItem[] {
  return [
    { kind: 'user', id: 'qs-prompt', text: PROMPT },
    { kind: 'assistant-text', id: 'qs-lead', text: LEADS[questions.length] ?? LEADS[2]!, isStreaming: false },
    { kind: 'tools', id: 'qs-ask', calls },
    ...more,
  ];
}

function askingState(questions: Question[]): SessionState {
  const call = asking('qs', questions);
  const now = Date.now();
  return { ...emptyState, items: rows(questions, [call]), isStreaming: true, midTurn: 'steer', awaitingApproval: [call], turnStartedAt: now - 20_000, questionParkedSince: now - 4_000 };
}

type DraftEvent = StudioEvent extends infer E ? (E extends StudioEvent ? Omit<E, 'sessionId' | 'eventId' | 'seq' | 'ts'> : never) : never;

/** Folded from the log a dismissal writes, so the showroom shows what the fold makes of it. */
function dismissedState(questions: Question[]): SessionState {
  const draft: DraftEvent[] = [
    { type: 'message.user', turnId: 't1', text: PROMPT, origin: 'user' },
    { type: 'turn.started', turnId: 't1' },
    { type: 'text.start', blockId: 'b1' },
    { type: 'text.end', blockId: 'b1', text: LEADS[questions.length] ?? LEADS[2]! },
    { type: 'tool.start', toolCallId: 'qs', name: 'AskUserQuestion', title: 'AskUserQuestion', kind: 'other', status: 'in_progress' },
    { type: 'permission.requested', requestId: 'req-qs', toolCallId: 'qs', toolName: 'AskUserQuestion', options: [{ optionId: 'allow', label: 'Allow', kind: 'allow_once' }], questions },
    { type: 'permission.resolved', requestId: 'req-qs', toolCallId: 'qs', outcome: 'canceled', dismissed: true },
    { type: 'tool.end', toolCallId: 'qs', status: 'canceled', errorMessage: 'Canceled' },
    { type: 'turn.ended', turnId: 't1', stopReason: 'interrupted' },
    { type: 'session.ended', reason: 'interrupted' },
  ];
  return foldSessionState(draft.map((event, index) => ({ ...event, sessionId: 'qs', eventId: `qs-${index}`, seq: index + 1, ts: Date.now() - 60_000 + index }) as StudioEvent));
}

function answeredState(questions: Question[], answers: QuestionAnswers): SessionState {
  return {
    ...emptyState,
    items: rows(questions, [answered('qs', questions, answers)], [{ kind: 'tools', id: 'qs-after', calls: [tool('qs-edit', 'edit', 'Edit', 'src/app/page.tsx', 'in_progress')] }]),
    isStreaming: true,
    midTurn: 'steer',
    turnStartedAt: Date.now() - 24_000,
  };
}

function Panel({ state, onRespond, onDismiss, closeIcon = SMALL_X }: { state: SessionState; onRespond?: ChatPanelProps['onRespond']; onDismiss?: () => void; closeIcon?: React.ReactNode }): React.JSX.Element {
  return (
    <div style={{ width: REGION.end, height: HEIGHT, border: 'var(--border-width) solid var(--color-border)', borderRadius: 'var(--radius-container)', overflow: 'hidden' }} data-testid="question-sheet-panel">
      <ChatPanel {...chatPanelProps({
        transcript: {
          state,
          connection: { status: 'ok' },
          strings: SHEET_STRINGS,
          onInterrupt: noop,
          onResume: noop,
          onRespond: onRespond ?? (() => new Promise<boolean>(() => undefined)),
          onDismissQuestion: onDismiss ?? noop,
          onCopy: noop,
          chevronIcon: ForwardIcon,
          closeIcon,
        },
        composer: { composerValue: '', onComposerChange: noop, onSend: noop },
      })} />
    </div>
  );
}

/** Ask, answer and dismiss for real against a stand-in session, so the motion can be felt and filmed. */
function LiveStage({ questions }: { questions: Question[] }): React.JSX.Element {
  const resting: SessionState = { ...emptyState, items: [{ kind: 'user', id: 'qs-prompt', text: PROMPT }, { kind: 'assistant-text', id: 'qs-lead', text: LEADS[questions.length] ?? LEADS[2]!, isStreaming: false }], isStreaming: true, midTurn: 'steer', turnStartedAt: Date.now() - 6_000 };
  const [state, setState] = useState<SessionState>(resting);
  const ask = (): void => setState(askingState(questions));
  const respond = (_requestId: string, _optionId: string, answers?: QuestionAnswers): Promise<boolean> =>
    new Promise((resolve) => setTimeout(() => {
      setState(answeredState(questions, answers ?? {}));
      resolve(true);
    }, 120));
  return (
    <VStack gap={3}>
      <Panel state={state} onRespond={respond} onDismiss={() => setState(dismissedState(questions))} />
      <div style={{ display: 'flex', gap: 8 }}>
        <Button label="Ask" size="sm" variant="secondary" onClick={ask} data-testid="question-sheet-ask" />
        <Button label="Reset" size="sm" variant="ghost" onClick={() => setState(resting)} data-testid="question-sheet-reset" />
      </div>
    </VStack>
  );
}

export const QUESTION_SHEET_CATEGORY: Category = {
  id: 'question-sheet',
  title: 'Question sheet — the newest row of the chat (ONL-2901)',
  stories: [
    { id: 'question-sheet-two', title: 'two questions', note: 'a count, and the close beside it while the pointer is in the card', render: () => <Panel state={askingState([FONT, PARTS])} /> },
    { id: 'question-sheet-two-medium-x', title: 'two questions, the larger close', render: () => <Panel state={askingState([FONT, PARTS])} closeIcon={MEDIUM_X} /> },
    { id: 'question-sheet-one', title: 'one question', note: 'no header; the close floats in the first line', render: () => <Panel state={askingState([FONT])} /> },
    { id: 'question-sheet-one-medium-x', title: 'one question, the larger close', render: () => <Panel state={askingState([FONT])} closeIcon={MEDIUM_X} /> },
    { id: 'question-sheet-four', title: 'four questions', render: () => <Panel state={askingState([FONT, PARTS, COLOUR, SPACING])} /> },
    { id: 'question-sheet-long-two', title: 'a long question, two questions', render: () => <Panel state={askingState([FONT_LONG, PARTS])} /> },
    { id: 'question-sheet-long-one', title: 'a long question, one question', note: 'only the first line stops short of the close', render: () => <Panel state={askingState([FONT_LONG])} /> },
    { id: 'question-sheet-dismissed', title: 'dismissed', note: 'tap the line to open the questions', render: () => <Panel state={dismissedState([FONT, PARTS])} /> },
    { id: 'question-sheet-dismissed-one', title: 'dismissed, one question', render: () => <Panel state={dismissedState([FONT])} /> },
    { id: 'question-sheet-answered-one', title: 'answered, one question', render: () => <Panel state={answeredState([FONT], { [FONT.question]: 'Warm serif' })} /> },
    {
      id: 'question-sheet-answered-four',
      title: 'answered, four questions',
      note: 'a note hangs under its answer',
      render: () => <Panel state={answeredState([FONT, PARTS, COLOUR, SPACING], { [FONT.question]: 'Warm serif', [PARTS.question]: 'Headline & tagline, Order button, Keep it readable on phones', [COLOUR.question]: 'Cream and brown', [SPACING.question]: 'Airier' })} />,
    },
    {
      id: 'question-sheet-answered-long',
      title: 'answered in their own words',
      note: 'a long answer wraps at full width',
      render: () => <Panel state={answeredState([FONT], { [FONT.question]: 'Somewhere between the warm serif and the hand-lettered one: friendly, but still easy to read at small sizes on the menu. Nothing too curly, and keep the prices in the plain font so they line up.' })} />,
    },
    { id: 'question-sheet-live', title: 'live: ask, answer, dismiss', note: 'Ask brings the question into the stream; Send leaves the answers, the close leaves a dismissed line', render: () => <LiveStage questions={[FONT, PARTS]} /> },
  ],
};
