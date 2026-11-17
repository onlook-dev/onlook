import {
  joinParagraphs,
  type ChatFileRef,
  type SkillAttachment,
  type PenLabel,
  type PenTake,
  type PenView,
  type PromptAttachment,
} from '@studio/events';
import { t } from '@studio/i18n';

export interface PenRowStrings {
  labels: Record<PenLabel, string>;
  takeLabel: string;
  discardLabel: string;
  attachmentsOnly: (count: number) => string;
}

export function penRowStrings(agent: string): PenRowStrings {
  return {
    labels: {
      question: t('chat.pen.question'),
      working: t('chat.pen.working', { agent }),
      'not-sent': t('chat.pen.notSent'),
    },
    takeLabel: t('chat.pen.take'),
    discardLabel: t('chat.pen.discard'),
    attachmentsOnly: (count) =>
      count === 1 ? t('chat.pen.attachment') : t('chat.pen.attachments', { count }),
  };
}

export interface TakenDraft {
  text: string;
  /** Only the images: the composer rebuilds its element and frame context from the live selection. */
  images: ChatFileRef[];
  skills?: SkillAttachment[];
}

function isImageRef(attachment: PromptAttachment): attachment is ChatFileRef {
  return !('kind' in attachment) || attachment.kind === 'file';
}

/** `null` is a take that answered with nothing, so the composer is left alone (ONL-2294). */
export function draftAfterTake(composer: string, taken: PenTake | undefined): TakenDraft | null {
  if (taken === undefined) return null;
  return {
    text: joinParagraphs(composer, taken.text),
    images: (taken.attachments ?? []).filter(isImageRef),
    ...((taken.attachments ?? []).some((ref) => 'kind' in ref && ref.kind === 'skill') ? { skills: (taken.attachments ?? []).filter((ref): ref is SkillAttachment => 'kind' in ref && ref.kind === 'skill') } : {}),
  };
}

/** The `penId` already returned, per workspace path; ids restart at `1` once a take empties the pen (ONL-2519). */
export type PenReceipt = Readonly<Record<string, number>>;

export interface PenReturnRead {
  pen: PenView | undefined;
  workspacePath: string | undefined;
  /** Before it, a return destroys the stored draft the restore is about to read (ONL-2519). */
  isDraftRestored: boolean;
  /** During one, a return duplicates that submit (ONL-2519). */
  isSubmitInFlight: boolean;
  /** During a walk back through earlier prompts, a return joins its text onto a recalled one (ONL-2509). */
  isComposerRecalling: boolean;
}

export interface PenReturnStep {
  receipt: PenReceipt;
  take?: { workspacePath: string; penId: number };
}

/** The pen's own return must not move the caret; a press of Edit is the designer asking for it (ONL-2519). */
export function focusesOnTake(by: 'pen' | 'designer'): boolean {
  return by === 'designer';
}

/** Forgets one workspace's returned id, so a take that answered with nothing can be tried again (ONL-2519). */
export function withoutWorkspace(receipt: PenReceipt, workspacePath: string | undefined): PenReceipt {
  if (workspacePath === undefined || !(workspacePath in receipt)) return receipt;
  const emptied = { ...receipt };
  delete emptied[workspacePath];
  return emptied;
}

/** `verdict: 'hold'` is main's published word that it will not send this; the rule is not re-derived here (ONL-2519). */
export function penReturnStep(read: PenReturnRead, receipt: PenReceipt): PenReturnStep {
  const { workspacePath, pen } = read;
  if (workspacePath === undefined) return { receipt };
  if (pen === undefined) return { receipt: withoutWorkspace(receipt, workspacePath) };
  if (pen.verdict !== 'hold') return { receipt };
  if (!read.isDraftRestored || read.isSubmitInFlight || read.isComposerRecalling) return { receipt };
  if (receipt[workspacePath] === pen.penId) return { receipt };
  return {
    receipt: { ...receipt, [workspacePath]: pen.penId },
    take: { workspacePath, penId: pen.penId },
  };
}

/** A release raises streaming again at once, so the chime would say finished while work resumes (ONL-2294). */
export function suppressesChime(pen: PenView | undefined): boolean {
  return pen?.verdict === 'send';
}
