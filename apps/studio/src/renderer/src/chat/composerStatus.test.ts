import { describe, expect, it } from 'bun:test';
import { MAX_ELEMENT_SELECTIONS } from '@studio/events';
import { composerStatusFor, gatherRefusalStatus } from './composerStatus.js';

const RESTING = { unsupportedPdfName: undefined, sendRejected: false, attachFailure: undefined, gatherRefusal: null } as const;

describe('the composer’s status band', () => {
  it('shows nothing at rest', () => {
    expect(composerStatusFor(RESTING)).toBeUndefined();
  });

  it('says why a refused pick added nothing, which is the whole of ONL-2482', () => {
    const capped = composerStatusFor({ ...RESTING, gatherRefusal: 'count-cap' });
    expect(capped?.type).toBe('warning');
    expect(capped?.message).toContain(String(MAX_ELEMENT_SELECTIONS));

    const large = composerStatusFor({ ...RESTING, gatherRefusal: 'byte-cap' });
    expect(large?.type).toBe('warning');
    expect(large?.message).not.toBe(capped?.message);
  });

  it('carries the same sentence the bubble’s band does, so one refusal reads one way', () => {
    for (const reason of ['count-cap', 'byte-cap'] as const) {
      expect(composerStatusFor({ ...RESTING, gatherRefusal: reason })).toEqual(
        gatherRefusalStatus(reason),
      );
    }
  });

  it('is reached for a refused pick once the gesture retired the stale file error', () => {
    // Arming the picker dismisses a standing attach failure, so the band the gather's
    // own refusals land in is free by the time one arrives (ONL-2482).
    expect(
      composerStatusFor({ ...RESTING, gatherRefusal: 'count-cap' }),
    ).toEqual(gatherRefusalStatus('count-cap'));
  });

  it('lets a failure the user has to act on outrank a cap they just bumped', () => {
    const attach = { reason: 'too-large', name: 'poster.png' } as const;
    expect(
      composerStatusFor({ ...RESTING, attachFailure: attach, gatherRefusal: 'count-cap' }),
    ).toEqual(composerStatusFor({ ...RESTING, attachFailure: attach }));
    expect(
      composerStatusFor({ ...RESTING, sendRejected: true, attachFailure: attach, gatherRefusal: 'count-cap' }),
    ).toEqual(composerStatusFor({ ...RESTING, sendRejected: true }));
  });

  it('an attached PDF on ChatGPT names the file and says removing it is the way out', () => {
    const band = composerStatusFor({ ...RESTING, unsupportedPdfName: 'brand-book.pdf' });
    expect(band?.type).toBe('error');
    expect(band?.message).toContain('brand-book.pdf');

    // The attach-time refusal promises a switch; this file is already attached, so only removal clears it.
    const refusal = composerStatusFor({ ...RESTING, attachFailure: { reason: 'pdf-unsupported', name: 'brand-book.pdf' } });
    expect(band?.message).not.toBe(refusal?.message);
  });

  it('the attached-PDF band outranks the rest, because no other action can clear it', () => {
    const band = composerStatusFor({ unsupportedPdfName: 'brand-book.pdf', sendRejected: true, attachFailure: { reason: 'too-large', name: 'huge.png' }, gatherRefusal: 'count-cap' });
    expect(band?.message).toContain('brand-book.pdf');
  });

  it('removing the PDF leaves the band empty with no dismissal', () => {
    expect(composerStatusFor({ ...RESTING, unsupportedPdfName: undefined })).toBeUndefined();
  });

  it('names the file a failed attach was about, and resolves one sentence per reason', () => {
    const messages = (['unsupported-format', 'too-large', 'unreadable'] as const).map((reason) => {
      const status = composerStatusFor({ ...RESTING, attachFailure: { reason, name: 'poster.png' } });
      expect(status?.type).toBe('error');
      expect(status?.message).toContain('poster.png');
      return status?.message;
    });
    expect(new Set(messages).size).toBe(3);
  });
});
