import { joinParagraphs, type PenVerdict, type PromptAttachment, type SuggestionSend } from '@studio/events';

export interface PenPrompt {
  text: string;
  attachments?: PromptAttachment[];
  context?: string;
  /** Kept only by a send that joined nothing: a held or joined prompt is the designer's own words (ONL-2899). */
  suggestion?: SuggestionSend;
  resends?: 'suggestion';
}

type Tap = Pick<PenPrompt, 'suggestion' | 'resends'>;

export interface PenState {
  /** Retired by every join, so a take, discard or send quoting an older one is refused (ONL-2294). */
  penId: number;
  text: string;
  attachments?: PromptAttachment[];
  context?: string;
  /** Absent until a turn id is observable: codex raises streaming before `turn/started` names one (ONL-2383). */
  turnId?: string;
  /** Latched from the bound turn's own ending; a latched `hold` never auto-sends. */
  verdict?: PenVerdict;
  /** A tap parked alone; the first join retires it (ONL-2901). */
  tap?: Tap;
}

export type PenAction =
  | { type: 'hold'; prompt: PenPrompt; isLive: boolean; turnId?: string }
  | { type: 'take'; penId: number }
  | { type: 'discard'; penId: number }
  | { type: 'turnStarted'; turnId: string }
  /** Absent `isLive` reads as settled, so an ending and a falling edge in one step release here. */
  | { type: 'turnEnded'; turnId: string; stopReason?: string; isLive?: boolean }
  /** The falling edge of the live-turn state; it carries no outcome of its own (ONL-2294). */
  | { type: 'liveSettled' }
  /** The turn ended and reported no verdict, which an ending that pushes no `turn.ended` leaves behind (ONL-2519). */
  | { type: 'endedUnreported' }
  | { type: 'sessionReplaced' }
  | { type: 'teardown' };

export type PenSendCause = 'immediate' | 'released';

export type PenOutcome =
  | { kind: 'none' }
  | { kind: 'held' }
  | { kind: 'send'; prompt: PenPrompt; cause: PenSendCause }
  | { kind: 'taken'; prompt: PenPrompt }
  | { kind: 'emptied'; reason: 'discard' | 'teardown' };

export interface PenResult {
  pen: PenState | null;
  outcome: PenOutcome;
}

function attachmentKey(attachment: PromptAttachment): string {
  if ('kind' in attachment) {
    if (attachment.kind === 'artifact') return `artifact:${attachment.artifactId}:${attachment.pagePath ?? ''}`;
    if (attachment.kind === 'skill') return `skill:${attachment.agent}:${attachment.name}:${attachment.path ?? ''}`;
    if (attachment.kind === 'file') return `file:${attachment.id}`;
    return attachment.kind === 'frame' ? `frame:${attachment.name}` : `element:${attachment.id}`;
  }
  return `image:${attachment.id}`;
}

function unionAttachments(
  held: readonly PromptAttachment[] | undefined,
  joining: readonly PromptAttachment[] | undefined,
): PromptAttachment[] | undefined {
  const seen = new Set<string>();
  const kept: PromptAttachment[] = [];
  const replacesSkill = joining?.some((attachment) => 'kind' in attachment && attachment.kind === 'skill');
  const previous = replacesSkill ? held?.filter((attachment) => !('kind' in attachment && attachment.kind === 'skill')) : held;
  for (const attachment of [...(previous ?? []), ...(joining ?? [])]) {
    const key = attachmentKey(attachment);
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(attachment);
  }
  return kept.length === 0 ? undefined : kept;
}

function prompt(fields: {
  text: string;
  attachments?: PromptAttachment[];
  context?: string;
}): PenPrompt {
  return {
    text: fields.text,
    ...(fields.attachments === undefined || fields.attachments.length === 0
      ? {}
      : { attachments: fields.attachments }),
    ...(fields.context === undefined ? {} : { context: fields.context }),
  };
}

export function isTap(given: Tap): boolean {
  return given.suggestion !== undefined || given.resends !== undefined;
}

function tapOf(given: Tap): Tap | undefined {
  if (given.suggestion !== undefined) return { suggestion: given.suggestion };
  return given.resends === undefined ? undefined : { resends: given.resends };
}

const idle = (pen: PenState | null): PenResult => ({ pen, outcome: { kind: 'none' } });

const deliver = (pen: PenState, cause: PenSendCause): PenResult => ({
  pen: null,
  outcome: { kind: 'send', prompt: { ...prompt(pen), ...pen.tap }, cause },
});

/** An `immediate` send that joined a pen carries the only copy of its text (ONL-2294). */
export function restoresOnRefusal(cause: PenSendCause, waiting: PenState | null): boolean {
  return cause === 'released' || waiting !== null;
}

/** An allowlist of the two clean finishes the backends name; anything else is the designer's call (ONL-2294). */
export function endingVerdict(stopReason: string | undefined): PenVerdict {
  return stopReason === 'success' || stopReason === 'completed' ? 'send' : 'hold';
}

export function releaseVerdict(
  pen: PenState,
  ended: { turnId: string; stopReason?: string },
): PenVerdict {
  if (pen.verdict !== undefined) return pen.verdict;
  if (pen.turnId === undefined || pen.turnId !== ended.turnId) return 'hold';
  return endingVerdict(ended.stopReason);
}

export function reducePen(pen: PenState | null, action: PenAction): PenResult {
  switch (action.type) {
    case 'hold': {
      const tap = tapOf(action.prompt);
      if (tap !== undefined && pen !== null) {
        // The pen holds one prompt, so a tap meeting one during a live turn is refused.
        if (action.isLive) return idle(pen);
        return { pen, outcome: { kind: 'send', prompt: { ...prompt(action.prompt), ...tap }, cause: 'immediate' } };
      }
      const attachments = unionAttachments(pen?.attachments, action.prompt.attachments);
      const context = action.prompt.context ?? pen?.context;
      const joined = prompt({
        text: joinParagraphs(pen?.text ?? '', action.prompt.text),
        ...(attachments === undefined ? {} : { attachments }),
        ...(context === undefined ? {} : { context }),
      });
      if (!action.isLive) {
        const sent = pen === null ? { ...joined, ...tap } : joined;
        return { pen: null, outcome: { kind: 'send', prompt: sent, cause: 'immediate' } };
      }
      // A spent binding is dropped, an unspent one kept: the live turn is still the one it names.
      const turnId =
        pen === null || pen.verdict !== undefined ? action.turnId : (pen.turnId ?? action.turnId);
      return {
        pen: {
          penId: (pen?.penId ?? 0) + 1,
          ...joined,
          ...(turnId === undefined ? {} : { turnId }),
          ...(pen === null && tap !== undefined ? { tap } : {}),
        },
        outcome: { kind: 'held' },
      };
    }

    case 'take':
    case 'discard': {
      if (pen === null || pen.penId !== action.penId) return idle(pen);
      if (action.type === 'take') {
        return { pen: null, outcome: { kind: 'taken', prompt: prompt(pen) } };
      }
      return { pen: null, outcome: { kind: 'emptied', reason: 'discard' } };
    }

    case 'turnStarted': {
      if (pen === null || pen.verdict !== undefined || pen.turnId === action.turnId) return idle(pen);
      // A turn that died without an ending leaves an id no later ending can match (ONL-2294).
      return { pen: { ...pen, turnId: action.turnId }, outcome: { kind: 'none' } };
    }

    case 'turnEnded': {
      if (pen === null) return idle(pen);
      const verdict = releaseVerdict(pen, action);
      if (verdict === 'send' && action.isLive !== true) return deliver(pen, 'released');
      const latchable = pen.verdict === undefined && pen.turnId === action.turnId;
      return latchable ? { pen: { ...pen, verdict }, outcome: { kind: 'none' } } : idle(pen);
    }

    case 'liveSettled': {
      if (pen === null || pen.verdict !== 'send') return idle(pen);
      return deliver(pen, 'released');
    }

    case 'endedUnreported': {
      if (pen === null || pen.verdict !== undefined) return idle(pen);
      return { pen: { ...pen, verdict: 'hold' }, outcome: { kind: 'none' } };
    }

    case 'sessionReplaced': {
      if (pen === null) return idle(pen);
      return { pen: { ...pen, turnId: undefined, verdict: 'hold' }, outcome: { kind: 'none' } };
    }

    case 'teardown': {
      if (pen === null) return idle(pen);
      return { pen: null, outcome: { kind: 'emptied', reason: 'teardown' } };
    }
  }
}
