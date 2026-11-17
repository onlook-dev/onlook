import { expect, it } from 'bun:test';
import { CLAUDE_LOGIN_COMMAND, claudeStateIsSettled, type ClaudeSetupState, type ClaudeSetupVerdict, type ClaudeSettledSetupState } from './claude-setup.js';
import type { CodexSetupState } from './codex.js';

type Rejected<Condition extends false> = Condition;
type Accepted<Condition extends true> = Condition;
type ClaudeWith<Payload> = Payload & { command: string };

export type SetupPayloadContracts = [
  Rejected<ClaudeWith<{ status: 'signed-out'; email: string }> extends ClaudeSetupState ? true : false>,
  Rejected<ClaudeWith<{ status: 'checking'; plan: string }> extends ClaudeSetupState ? true : false>,
  Rejected<ClaudeWith<{ status: 'signed-in'; turn: object }> extends ClaudeSetupState ? true : false>,
  Rejected<ClaudeWith<{ status: 'awaiting-code'; detail: 'exited' }> extends ClaudeSetupState ? true : false>,
  Rejected<ClaudeWith<{ status: 'failed'; detail: 'turn-no-answer' }> extends ClaudeSetupState ? true : false>,
  Rejected<ClaudeWith<{ status: 'verification-failed'; detail: 'exited' }> extends ClaudeSetupState ? true : false>,
  Rejected<ClaudeWith<{ status: 'checking' }> extends ClaudeSettledSetupState ? true : false>,
  Rejected<ClaudeWith<{ status: 'signing-in' }> extends ClaudeSettledSetupState ? true : false>,
  Rejected<ClaudeWith<{ status: 'awaiting-code' }> extends ClaudeSettledSetupState ? true : false>,
  Rejected<ClaudeWith<{ status: 'verifying' }> extends ClaudeSettledSetupState ? true : false>,
  Rejected<{ status: 'signed-out'; email: string } extends CodexSetupState ? true : false>,
  Rejected<{ status: 'ready'; percent: number } extends CodexSetupState ? true : false>,
  Rejected<{ status: 'ready'; authUrl: string } extends CodexSetupState ? true : false>,
  Rejected<{ status: 'downloading'; command: string } extends CodexSetupState ? true : false>,
  Rejected<{ status: 'unsupported' } extends CodexSetupState ? true : false>,
  Rejected<{ status: 'outdated' } extends CodexSetupState ? true : false>,
  Accepted<ClaudeWith<{ status: 'verification-failed'; detail: 'turn-no-answer'; plan: string }> extends ClaudeSetupState ? true : false>,
  Accepted<{ status: 'signed-out'; command: string } extends CodexSetupState ? true : false>,
];

it('phase-specific setup verdicts classify every legal settled restore', () => {
  const states = [
    { status: 'idle' },
    { status: 'checking' },
    { status: 'signed-out' },
    { status: 'signing-in' },
    { status: 'awaiting-code', detail: 'invalid-code' },
    { status: 'verifying' },
    { status: 'signed-in', email: 'designer@example.com', plan: 'max' },
    { status: 'verification-failed', detail: 'turn-service-error', turn: { diagnostic: { status: 503 } }, plan: 'max' },
    { status: 'failed', detail: 'exited' },
  ] satisfies ClaudeSetupVerdict[];
  const settled = states.map((state) => ({ ...state, command: CLAUDE_LOGIN_COMMAND })).filter(claudeStateIsSettled);
  expect(settled.map((state) => state.status)).toEqual(['idle', 'signed-out', 'signed-in', 'verification-failed', 'failed']);
});
