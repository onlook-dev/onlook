import { describe, expect, it } from 'bun:test';
import { closeConfirmation, type ClosingWork } from './close-confirm.js';

const quiet: ClosingWork = { isWorking: false, status: undefined, isCreating: false };

describe('an active session always confirms (ONL-2209)', () => {
  it('does not ask for a quiet tab', () => {
    expect(closeConfirmation(quiet)).toEqual({ needsConfirm: false, losses: [] });
  });

  it('asks for a streaming turn', () => {
    expect(closeConfirmation({ ...quiet, isWorking: true })).toEqual({
      needsConfirm: true,
      losses: ['turn'],
    });
  });

  it('asks for an approval the agent is holding', () => {
    expect(closeConfirmation({ ...quiet, status: 'waiting' })).toEqual({
      needsConfirm: true,
      losses: ['approval'],
    });
  });

  it('asks for a worktree cut still running (ONL-2244)', () => {
    expect(closeConfirmation({ ...quiet, isCreating: true })).toEqual({
      needsConfirm: true,
      losses: ['creation'],
    });
  });

  it('names every loss at once, so the modal can state all of them', () => {
    expect(
      closeConfirmation({ isWorking: true, status: 'waiting', isCreating: true }).losses,
    ).toEqual(['turn', 'approval', 'creation']);
  });

  it('asks for unsaved code (ONL-2563)', () => {
    expect(closeConfirmation({ ...quiet, hasUnsavedCode: true })).toEqual({
      needsConfirm: true,
      losses: ['unsaved-code'],
    });
  });

  /* Push order is copy order in the joined message box, and this is the only
     loss that is the designer's own typing rather than the agent's work. */
  it('leads the message with unsaved code when a turn is in flight too', () => {
    expect(
      closeConfirmation({ ...quiet, hasUnsavedCode: true, isWorking: true, status: 'waiting' }).losses,
    ).toEqual(['unsaved-code', 'turn', 'approval']);
  });
});

describe('what is not a loss', () => {
  it('a done acknowledgement is not work in flight', () => {
    expect(closeConfirmation({ ...quiet, status: 'done' }).needsConfirm).toBe(false);
  });

  it('a working status alongside the flag does not double the loss', () => {
    expect(closeConfirmation({ ...quiet, isWorking: true, status: 'working' }).losses).toEqual(['turn']);
  });
});
