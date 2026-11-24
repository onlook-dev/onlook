import { describe, expect, it } from 'bun:test';
import { classifyAttachmentBytes, HARNESS_IDS, isHarnessId } from '@studio/events';
import { HARNESSES, STORED_HARNESSES, harnessFor, harnessRunning, harnessStoredAs, isStoredHarness } from './harness.js';

describe('the Harness descriptors', () => {
  it('pins every value Claude is read by', () => {
    expect(HARNESSES.claude).toEqual({
      id: 'claude',
      stored: 'claude',
      telemetry: 'claude',
      executable: 'claude',
      processClass: 'claude_cli',
      pdfAttachments: true,
      reportsPromptChars: true,
      countsRetryAttempts: true,
      grantsFollowProviderThread: false,
      skillsCarryPath: false,
    });
  });

  it('pins every value Codex is read by', () => {
    expect(HARNESSES.codex).toEqual({
      id: 'codex',
      stored: 'appserver',
      telemetry: 'codex',
      executable: 'codex',
      processClass: 'codex',
      pdfAttachments: false,
      reportsPromptChars: false,
      countsRetryAttempts: false,
      grantsFollowProviderThread: true,
      skillsCarryPath: true,
    });
  });

  it('has one descriptor per Harness id, under its own id', () => {
    expect(Object.keys(HARNESSES)).toEqual([...HARNESS_IDS]);
    for (const id of HARNESS_IDS) expect(HARNESSES[id].id).toBe(id);
  });

  it('lists the stored names Claude first', () => {
    expect(STORED_HARNESSES).toEqual(['claude', 'appserver', 'acp', 'pty']);
  });

  it('agrees with the shared attachment classifier on PDFs', () => {
    const pdf = new TextEncoder().encode('%PDF-1.7');
    for (const id of HARNESS_IDS) expect(classifyAttachmentBytes(pdf, id).ok).toBe(HARNESSES[id].pdfAttachments);
  });
});

describe('the Harness lookups', () => {
  it('finds a descriptor by the id the user picked', () => {
    expect(harnessFor('claude')).toBe(HARNESSES.claude);
    expect(harnessFor('codex')).toBe(HARNESSES.codex);
  });

  it('finds a descriptor by its stored name', () => {
    expect(harnessStoredAs('claude')).toBe(HARNESSES.claude);
    expect(harnessStoredAs('appserver')).toBe(HARNESSES.codex);
  });

  it('reads a name no Harness answers to as Claude', () => {
    expect(harnessFor('appserver' as never)).toBe(HARNESSES.claude);
    expect(harnessStoredAs('codex' as never)).toBe(HARNESSES.claude);
  });

  it('finds a descriptor by the program it runs, and nothing for any other program', () => {
    expect(harnessRunning('claude')).toBe(HARNESSES.claude);
    expect(harnessRunning('codex')).toBe(HARNESSES.codex);
    expect(harnessRunning('node')).toBeUndefined();
    expect(harnessRunning('claude_cli')).toBeUndefined();
  });

  it('keeps the two vocabularies apart', () => {
    expect(['claude', 'codex', 'appserver', '', undefined, 1].map(isHarnessId)).toEqual([true, true, false, false, false, false]);
    expect(['claude', 'codex', 'appserver', '', undefined, 1].map(isStoredHarness)).toEqual([true, false, true, false, false, false]);
  });
});
