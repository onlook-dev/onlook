import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'bun:test';
import { penLabel, type PenView } from '@studio/events';
import { t } from '@studio/i18n';
import {
  draftAfterTake,
  focusesOnTake,
  penReturnStep,
  penRowStrings,
  suppressesChime,
  withoutWorkspace,
  type PenReceipt,
  type PenReturnRead,
} from './penRow.js';

const labels = penRowStrings('Claude Code').labels;

describe('penRowStrings', () => {
  it('names the question while a question is parked', () => {
    expect(labels[penLabel({ isLive: true, needsAttention: true })]).toBe(t('chat.pen.question'));
  });

  it('says working while a turn is live and no question is parked', () => {
    expect(labels[penLabel({ isLive: true, needsAttention: false })]).toBe(
      t('chat.pen.working', { agent: 'Claude Code' }),
    );
  });

  it('says not-sent when no turn is live', () => {
    expect(labels[penLabel({ isLive: false, needsAttention: false })]).toBe(t('chat.pen.notSent'));
  });
});

describe('the pen catalog', () => {
  const renderer = join(import.meta.dir, '..');
  const catalog = JSON.parse(readFileSync(join(renderer, '../../../../../packages/i18n/src/locales/en/chat.json'), 'utf8')) as Record<string, string>;
  const penKeys = Object.keys(catalog).filter((key) => key.startsWith('chat.pen.'));
  const shipped = readdirSync(renderer, { recursive: true, encoding: 'utf8' })
    .filter((name) => /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name))
    .map((name) => readFileSync(join(renderer, name), 'utf8'))
    .join('\n');

  // `check:strings` reads a test file as a reference, so a key only a test still names reads as live.
  it('names no key whose only reader is a test', () => {
    expect(penKeys.filter((key) => !shipped.includes(key))).toEqual([]);
  });

  it('covers every label the row can wear', () => {
    expect(Object.keys(labels).sort()).toEqual(['not-sent', 'question', 'working']);
    for (const label of Object.values(labels)) expect(label.length).toBeGreaterThan(0);
  });
});

describe('draftAfterTake', () => {
  it('appends what the pen held to text already in the composer — both stay', () => {
    const draft = draftAfterTake('And keep the CTA above the fold.', {
      text: 'Make the hero two columns.',
    });
    expect(draft?.text).toBe('And keep the CTA above the fold.\n\nMake the hero two columns.');
  });

  it('an empty composer takes the held text alone, with no leading blank line', () => {
    expect(draftAfterTake('', { text: 'Make the hero two columns.' })?.text).toBe(
      'Make the hero two columns.',
    );
  });

  it('a pen that already released leaves the composer alone', () => {
    expect(draftAfterTake('And keep the CTA above the fold.', undefined)).toBeNull();
  });

  it('keeps both the text already typed and the held images (AE2)', () => {
    const draft = draftAfterTake('And keep the CTA above the fold.', {
      text: 'Match this.',
      attachments: [{ id: 'img-1', mediaType: 'image/png' }],
    });
    expect(draft).toEqual({
      text: 'And keep the CTA above the fold.\n\nMatch this.',
      images: [{ id: 'img-1', mediaType: 'image/png' }],
    });
  });

  it('returns the images for the composer to re-admit, and drops what it rebuilds itself', () => {
    const draft = draftAfterTake('', {
      text: 'Match this.',
      attachments: [
        { id: 'img-1', mediaType: 'image/png' },
        { kind: 'frame', name: 'Pricing' },
      ],
    });
    expect(draft?.images).toEqual([{ id: 'img-1', mediaType: 'image/png' }]);
  });
});

describe('suppressesChime', () => {
  it('a falling edge whose verdict will send plays no chime — work resumes immediately', () => {
    expect(suppressesChime({ penId: 1, text: 'Make the hero two columns.', verdict: 'send' })).toBe(
      true,
    );
  });

  it('a falling edge that will not send keeps the chime: a failed turn has no other cue', () => {
    expect(suppressesChime({ penId: 1, text: 'Make the hero two columns.', verdict: 'hold' })).toBe(
      false,
    );
    expect(suppressesChime({ penId: 1, text: 'Make the hero two columns.' })).toBe(false);
    expect(suppressesChime(undefined)).toBe(false);
  });
});

describe('penReturnStep', () => {
  const held = (penId: number): PenView => ({
    penId,
    text: 'Make the hero two columns.',
    verdict: 'hold',
  });
  const read = (over: Partial<PenReturnRead> = {}): PenReturnRead => ({
    pen: held(1),
    workspacePath: '/w/alpha',
    isDraftRestored: true,
    isSubmitInFlight: false,
    isComposerRecalling: false,
    ...over,
  });
  const NONE: PenReceipt = {};

  it('a held prompt whose draft has landed and whose composer is idle comes back', () => {
    expect(penReturnStep(read(), NONE).take).toEqual({ workspacePath: '/w/alpha', penId: 1 });
  });

  it('a prompt main may still deliver stays where it is', () => {
    expect(penReturnStep(read({ pen: { penId: 1, text: 'Hi' } }), NONE).take).toBeUndefined();
    expect(
      penReturnStep(read({ pen: { penId: 1, text: 'Hi', verdict: 'send' } }), NONE).take,
    ).toBeUndefined();
  });

  it('no workspace has no prompt to come back to', () => {
    expect(penReturnStep(read({ workspacePath: undefined }), NONE).take).toBeUndefined();
  });

  it('forgetting a workspace lets the same prompt be tried again after a take answered nothing', () => {
    const recorded = penReturnStep(read(), NONE).receipt;
    expect(penReturnStep(read(), recorded).take).toBeUndefined();

    const forgotten = withoutWorkspace(recorded, '/w/alpha');

    expect(penReturnStep(read(), forgotten).take).toEqual({ workspacePath: '/w/alpha', penId: 1 });
  });

  it('the pen returning a prompt takes no focus; the designer pressing Edit does', () => {
    expect(focusesOnTake('pen')).toBe(false);
    expect(focusesOnTake('designer')).toBe(true);
  });

  it('forgetting leaves every other workspace alone, and an unknown one changes nothing', () => {
    const both = { '/w/alpha': 1, '/w/beta': 1 };

    expect(withoutWorkspace(both, '/w/alpha')).toEqual({ '/w/beta': 1 });
    expect(withoutWorkspace(both, '/w/gamma')).toBe(both);
    expect(withoutWorkspace(both, undefined)).toBe(both);
  });

  it('waits for a walk back through earlier prompts, or its text joins a recalled one (ONL-2509)', () => {
    const gated = penReturnStep(read({ isComposerRecalling: true }), NONE);
    expect(gated.take).toBeUndefined();
    expect(penReturnStep(read(), gated.receipt).take).toEqual({
      workspacePath: '/w/alpha',
      penId: 1,
    });
  });

  it('waits for the workspace draft restore, or the stored draft is destroyed (ONL-2519)', () => {
    const waiting = penReturnStep(read({ isDraftRestored: false }), NONE);
    expect(waiting.take).toBeUndefined();
    expect(penReturnStep(read(), waiting.receipt).take).toEqual({
      workspacePath: '/w/alpha',
      penId: 1,
    });
  });

  it('waits for an in-flight submit, then comes back once it settles (ONL-2519)', () => {
    const gated = penReturnStep(read({ isSubmitInFlight: true }), NONE);
    expect(gated.take).toBeUndefined();
    expect(penReturnStep(read(), gated.receipt).take).toEqual({
      workspacePath: '/w/alpha',
      penId: 1,
    });
  });

  it('comes back once while it is still the published pen', () => {
    const first = penReturnStep(read(), NONE);
    expect(first.take).toBeDefined();
    expect(penReturnStep(read(), first.receipt).take).toBeUndefined();
  });

  it('the next prompt in the same workspace comes back, though it mints the same id', () => {
    const first = penReturnStep(read(), NONE);
    const emptied = penReturnStep(read({ pen: undefined }), first.receipt);
    expect(emptied.take).toBeUndefined();
    expect(penReturnStep(read(), emptied.receipt).take).toEqual({
      workspacePath: '/w/alpha',
      penId: 1,
    });
  });

  it('the same id in another workspace comes back too (AE7)', () => {
    const first = penReturnStep(read(), NONE);
    expect(penReturnStep(read({ workspacePath: '/w/beta' }), first.receipt).take).toEqual({
      workspacePath: '/w/beta',
      penId: 1,
    });
  });

  it('an emptied workspace keeps every other workspace receipt', () => {
    const alpha = penReturnStep(read(), NONE);
    const beta = penReturnStep(read({ workspacePath: '/w/beta' }), alpha.receipt);
    const emptied = penReturnStep(read({ workspacePath: '/w/beta', pen: undefined }), beta.receipt);
    expect(penReturnStep(read(), emptied.receipt).take).toBeUndefined();
  });
});

describe('what the row says when the prompt is only attachments (ONL-2294)', () => {
  const strings = penRowStrings('Claude Code');

  it('names the count, so a send that carried no text is never a blank row', () => {
    expect(strings.attachmentsOnly(1)).toBe(t('chat.pen.attachment'));
    expect(strings.attachmentsOnly(3)).toBe(t('chat.pen.attachments', { count: 3 }));
  });

  it('says something either way, so the row always carries a line', () => {
    expect(strings.attachmentsOnly(1).length).toBeGreaterThan(0);
    expect(strings.attachmentsOnly(0).length).toBeGreaterThan(0);
  });
});
