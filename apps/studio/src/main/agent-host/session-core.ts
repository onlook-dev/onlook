import { randomUUID } from 'node:crypto';
import type { AgentSkill, PromptAttachment } from '@studio/events';
import type { EventLog } from './event-log.js';
import { formatArtifactAttachments, type splitAttachments } from './prompt-content.js';

/** Banks the wait only once the last question clears: answering one of two resumes nothing (ONL-2295). */
export function settleQuestionPark(log: EventLog, questionOpen: boolean): void {
  if (questionOpen) return;
  log.unparkQuestion();
}

/** The designer's own words as the answer to every open question: the transcript row, and the text each question is answered with (ONL-2583). */
export function recordQuestionReply(
  log: EventLog,
  text: string,
  attachments: PromptAttachment[],
  context: string | undefined,
  parts: Pick<ReturnType<typeof splitAttachments>, 'images' | 'files' | 'skills' | 'elements'>,
): { messageId: string; reply: string; carriesMore: boolean } {
  const carriesMore = parts.images.length > 0 || parts.files.length > 0 || parts.skills.length > 0 || parts.elements.length > 0;
  const messageId = randomUUID();
  log.push({
    type: 'message.user',
    turnId: log.turnId,
    messageId,
    text,
    origin: 'user',
    ...(attachments.length > 0 ? { attachments } : {}),
    ...(context === undefined || context === '' ? {} : { context }),
    ...(carriesMore ? { delivery: 'steering' as const } : {}),
  });
  const reply = [text, context ?? '', formatArtifactAttachments(attachments)].filter((part) => part !== '').join('\n\n');
  return { messageId, reply, carriesMore };
}

export interface PublishedSkills {
  fingerprint: string | undefined;
}

/** A catalog equal to the last one published is not published again. */
export function publishChangedSkills(log: EventLog, published: PublishedSkills, skills: AgentSkill[], unavailable: boolean): void {
  const fingerprint = JSON.stringify([skills, unavailable]);
  if (fingerprint === published.fingerprint) return;
  published.fingerprint = fingerprint;
  log.push({ type: 'session.settings', skills, skillsUnavailable: unavailable });
}
