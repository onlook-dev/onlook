import { describe, expect, it } from 'bun:test';
import type { AgentSkill, PromptAttachment, StudioEvent } from '@studio/events';
import { EventLog } from './event-log.js';
import { splitAttachments } from './prompt-content.js';
import { publishChangedSkills, recordQuestionReply, settleQuestionPark, type PublishedSkills } from './session-core.js';

const newLog = (): EventLog => new EventLog({ sessionId: 's1', cwd: '/tmp/studio-workspace', emit: () => {} });
const settings = (log: EventLog): StudioEvent[] => log.events.filter((event) => event.type === 'session.settings');

describe('settleQuestionPark', () => {
  it('keeps the wait running while a question is still open', () => {
    const log = newLog();
    log.parkQuestion(1_000);
    settleQuestionPark(log, true);
    expect(log.questionParkedSince).toBe(1_000);
  });

  it('banks the wait once no question is open', () => {
    const log = newLog();
    log.parkQuestion(Date.now() - 5_000);
    settleQuestionPark(log, false);
    expect(log.questionParkedSince).toBeUndefined();
    expect(log.turnWaitedMs).toBeGreaterThanOrEqual(5_000);
  });
});

describe('recordQuestionReply', () => {
  it('writes the plain reply as a user row and answers with the same text', () => {
    const log = newLog();
    const { messageId, reply, carriesMore } = recordQuestionReply(log, 'Blue', [], undefined, splitAttachments([]));
    expect(reply).toBe('Blue');
    expect(carriesMore).toBe(false);
    const row = log.events.find((event) => event.type === 'message.user');
    expect(row).toMatchObject({ type: 'message.user', messageId, text: 'Blue', origin: 'user' });
    expect(row).not.toHaveProperty('attachments');
    expect(row).not.toHaveProperty('context');
    expect(row).not.toHaveProperty('delivery');
  });

  it('joins the context to the answer, and leaves an empty context off the row', () => {
    const log = newLog();
    expect(recordQuestionReply(log, 'Blue', [], 'The server stopped.', splitAttachments([])).reply).toBe('Blue\n\nThe server stopped.');
    expect(recordQuestionReply(log, 'Blue', [], '', splitAttachments([])).reply).toBe('Blue');
    const rows = log.events.filter((event) => event.type === 'message.user');
    expect(rows[0]).toMatchObject({ context: 'The server stopped.' });
    expect(rows[1]).not.toHaveProperty('context');
  });

  it('marks a reply that carries a picture as steering, with its attachments on the row', () => {
    const log = newLog();
    const attachments: PromptAttachment[] = [{ id: 'img-1', mediaType: 'image/png' }];
    const { carriesMore } = recordQuestionReply(log, 'Like this', attachments, undefined, splitAttachments(attachments));
    expect(carriesMore).toBe(true);
    expect(log.events.find((event) => event.type === 'message.user')).toMatchObject({ attachments, delivery: 'steering' });
  });
});

describe('publishChangedSkills', () => {
  const skill: AgentSkill = { name: 'review', description: 'Reviews a change', agent: 'claude' };

  it('publishes a catalog once, and again only when it changes', () => {
    const log = newLog();
    const published: PublishedSkills = { fingerprint: undefined };
    publishChangedSkills(log, published, [skill], false);
    publishChangedSkills(log, published, [{ ...skill }], false);
    expect(settings(log)).toHaveLength(1);
    expect(settings(log)[0]).toMatchObject({ skills: [skill], skillsUnavailable: false });
    publishChangedSkills(log, published, [skill], true);
    publishChangedSkills(log, published, [], true);
    expect(settings(log)).toHaveLength(3);
    expect(settings(log)[2]).toMatchObject({ skills: [], skillsUnavailable: true });
  });

  it('publishes an empty, available catalog the first time', () => {
    const log = newLog();
    publishChangedSkills(log, { fingerprint: undefined }, [], false);
    expect(settings(log)).toHaveLength(1);
  });
});
