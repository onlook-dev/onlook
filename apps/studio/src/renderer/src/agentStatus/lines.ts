import { isStudioSetupPrompt, type FrameChange, type FrameEdit, type SessionState, type TranscriptItem } from '@studio/events';
import { canvasNodeLabel, canvasNodeLabelText, type CanvasNodeLabelFacts } from '../nodeLabel.js';
import { t } from '@studio/i18n';
import type { LeftPanelView } from '../rail/leftPanel.js';
import {
  INITIAL_WORKING_ROW_STATE,
  workingRowReducer,
  type WorkingRowAction,
  type WorkingRowState,
} from '../chat/workingRow.js';

export const CHAT_PLACE: Record<StatusWaiting, string> = {
  question: '[data-testid="question-sheet"]',
  approval: '[data-testid="permission-request"]',
};

export interface AgentStatusState extends WorkingRowState {
  isSetupTurn: boolean;
  changes: readonly FrameChange[];
  /** The agent's words for what its question needs; today's wording stands in when it gave none. */
  waitingOn?: string;
}

export const INITIAL_AGENT_STATUS: AgentStatusState = { ...INITIAL_WORKING_ROW_STATE, isSetupTurn: false, changes: [] };

export type AgentStatusAction =
  | Exclude<WorkingRowAction, { type: 'streaming' | 'frames' }>
  | { type: 'frames'; frameIds: string[]; changes?: readonly FrameChange[] }
  | { type: 'streaming'; isStreaming: boolean; isSetupTurn: boolean }
  | { type: 'waitingOn'; what: string | undefined };

/** The chat's working row reads the same state and ignores `isSetupTurn`, so it keeps today's behaviour where the list is not shown (ONL-2973). */
export function agentStatusReducer(state: AgentStatusState, action: AgentStatusAction): AgentStatusState {
  if (action.type === 'reset') return INITIAL_AGENT_STATUS;
  if (action.type === 'waitingOn') {
    if (action.what === state.waitingOn) return state;
    const { waitingOn: _, ...rest } = state;
    return action.what === undefined ? rest : { ...rest, waitingOn: action.what };
  }
  const row = workingRowReducer(state, action);
  const isSetupTurn = action.type === 'streaming' && action.isStreaming ? action.isSetupTurn : state.isSetupTurn;
  const changes =
    row === state ? state.changes
    : action.type === 'frames' ? (action.changes ?? [])
    : action.type === 'streaming' && action.isStreaming ? []
    : state.changes;
  if (row === state && isSetupTurn === state.isSetupTurn) return state;
  const isNewTurn = action.type === 'streaming' && action.isStreaming;
  const waitingOn = isNewTurn ? undefined : state.waitingOn;
  return { phase: row.phase, frameIds: row.frameIds, isSetupTurn, changes, ...(waitingOn === undefined ? {} : { waitingOn }) };
}

/** Read as a turn starts: the prompt that opened it is the transcript's last user row. */
export function isSetupTurnStart(items: readonly TranscriptItem[]): boolean {
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i]!;
    if (item.kind === 'user') return isStudioSetupPrompt(item);
  }
  return false;
}

/** The Sidebar is the designs view; a stored code view with the code panel off still draws it, as `App` does. */
export function isStatusListShown(view: { isEnabled: boolean; leftHidden: boolean; leftPanelView: LeftPanelView; codeEnabled: boolean }): boolean {
  if (!view.isEnabled || view.leftHidden) return false;
  return view.leftPanelView === 'designs' || (view.leftPanelView === 'code' && !view.codeEnabled);
}

export type StatusWaiting = 'question' | 'approval';

export function statusWaiting(state: Pick<SessionState, 'questionParkedSince' | 'awaitingApproval'>): StatusWaiting | undefined {
  if (state.questionParkedSince !== undefined) return 'question';
  return state.awaitingApproval.length > 0 ? 'approval' : undefined;
}

type StatusTarget = { kind: 'frame'; frameId: string } | { kind: 'chat'; place: StatusWaiting };

export interface StatusLine {
  key: string;
  state: 'done' | 'needs-you';
  target: StatusTarget;
  before: string;
  subject: string;
  after: string;
}

const SUBJECT = '{subject}';

function sentence(template: string, subject: string): Pick<StatusLine, 'before' | 'subject' | 'after'> {
  const at = template.indexOf(SUBJECT);
  if (at === -1) throw new Error(`A status template names no subject: ${template}`);
  return { before: template.slice(0, at), subject, after: template.slice(at + SUBJECT.length) };
}

type CanvasNodeKind = CanvasNodeLabelFacts['kind'];

/** What a done line names; `noun` is absent when the name already says what the object is, such as "Untitled frame". */
export interface StatusSubject {
  name: string;
  noun?: CanvasNodeKind;
}

export function statusSubject(facts: CanvasNodeLabelFacts): StatusSubject {
  const name = canvasNodeLabelText(facts, t);
  const source = canvasNodeLabel(facts).source;
  return source === 'untitled' || source === 'pasted-image' ? { name } : { name, noun: facts.kind };
}

const CREATED = {
  browser: 'agentStatus.created.browser',
  artifact: 'agentStatus.created.artifact',
  image: 'agentStatus.created.image',
  section: 'agentStatus.created.section',
  text: 'agentStatus.created.text',
} as const satisfies Record<CanvasNodeKind, string>;

/** A frame the agent marked without saying what it changed draws no line; one it added reads as added, whatever it changed after (ONL-2973). */
function doneLine({ name, noun }: StatusSubject, changes: readonly FrameChange[]): Pick<StatusLine, 'before' | 'subject' | 'after'> | undefined {
  const creation = changes.find((change) => change.kind === 'created');
  if (creation !== undefined) return sentence(t(noun === undefined ? 'agentStatus.created' : CREATED[noun], { verb: creation.done }), name);
  const first = changes.find((change): change is FrameEdit => change.kind !== 'created');
  if (first === undefined) return undefined;
  return sentence(t('agentStatus.change', { verb: first.done, what: first.what }), t('agentStatus.possessive', { name }));
}

export function statusLines(
  state: AgentStatusState,
  waiting: StatusWaiting | undefined,
  subjectOf: (frameId: string) => StatusSubject | undefined,
): StatusLine[] {
  if (state.isSetupTurn) return [];
  const lines: StatusLine[] = [];
  if (waiting !== undefined && state.phase === 'working') {
    const isAnswersTo = waiting === 'question' && state.waitingOn !== undefined;
    const subject = waiting === 'question' ? (state.waitingOn ?? t('agentStatus.waiting.answer')) : t('agentStatus.waiting.approval');
    lines.push({ key: `chat:${waiting}`, state: 'needs-you', target: { kind: 'chat', place: waiting }, ...sentence(t(isAnswersTo ? 'agentStatus.waiting.answersTo' : 'agentStatus.waiting'), subject) });
  }
  if (state.phase !== 'done') return lines;
  for (const frameId of [...state.frameIds].reverse()) {
    const subject = subjectOf(frameId);
    if (subject === undefined) continue;
    const words = doneLine(subject, state.changes.filter((change) => change.frameId === frameId));
    if (words === undefined) continue;
    lines.push({ key: `frame:${frameId}`, state: 'done', target: { kind: 'frame', frameId }, ...words });
  }
  return lines;
}

/** What the collapsed line's "and N more" counts: the other lines, one per frame. */
export function collapsedCount(lines: readonly StatusLine[]): number {
  return Math.max(0, lines.length - 1);
}
