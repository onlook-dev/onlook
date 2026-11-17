/**
 * `bun run apps/studio/src/main/agent-host/probe.ts <mode> [prompt]` — runs
 * outside Electron; `index.ts` is the only Electron-aware module here.
 */

import { foldSessionState } from '@studio/events';
import type { StudioEvent } from '@studio/events';
import { probeOutput } from '../log/index.js';
import { probeConnection } from './connection.js';
import { AgentSession } from './session.js';
import { devSwitches } from '../env/dev-switches.js';

const TARGET = devSwitches.targetDir ?? process.cwd();

const MODES = [
  'connection',
  'approve',
  'deny',
  'interrupt',
  'interrupt-pending',
  'inspect',
  'two-turn',
] as const;
type Mode = (typeof MODES)[number];

function isMode(value: string): value is Mode {
  return (MODES as readonly string[]).includes(value);
}

async function main(): Promise<void> {
  const mode = process.argv[2] ?? 'connection';
  if (!isMode(mode)) {
    probeOutput(`unknown mode "${mode}" — expected one of ${MODES.join(' | ')}`);
    process.exit(2);
  }

  if (mode === 'connection') {
    probeOutput(JSON.stringify(await probeConnection(), null, 2));
    return;
  }

  const prompt = process.argv[3] ?? 'Read README.md and summarise it in one sentence.';
  const events: StudioEvent[] = [];

  const session = new AgentSession({
    cwd: TARGET,
    keepRaw: false,
    onEvent: (event) => {
      events.push(event);
      const { type, seq } = event;
      probeOutput(`  ${String(seq).padStart(3)} ${type} ${summarise(event)}`);

      if (mode === 'inspect' && event.type === 'tool.end') {
        probeOutput(`  [inspect] tool.end result:\n${event.result ?? '(none)'}`);
      }
      if (
        mode === 'inspect' &&
        (event.type === 'permission.requested' ||
          event.type === 'tool.start' ||
          event.type === 'tool.update')
      ) {
        probeOutput(`  [inspect] ${event.type}\n${JSON.stringify(event, null, 2)}`);
      }
      if (event.type !== 'permission.requested') return;

      // Allowing a question with no answers yields "The user did not answer the questions."
      if (event.questions) {
        const answers = Object.fromEntries(
          event.questions.map((q) => [q.question, q.options[0]?.label ?? '']),
        );
        probeOutput(`  [probe] answering question(s): ${JSON.stringify(answers)}`);
        session.respond(event.requestId, 'allow', answers);
        return;
      }

      if (mode === 'inspect') {
        session.respond(event.requestId, 'allow');
        return;
      }
      if (mode === 'approve' || mode === 'deny') {
        session.respond(event.requestId, mode === 'approve' ? 'allow' : 'deny');
        return;
      }
      if (mode === 'interrupt-pending') {
        probeOutput('  [probe] leaving the permission parked, interrupting in 2s');
        setTimeout(() => void session.interrupt(), 2000);
      }
    },
    onState: ({ isStreaming }) => probeOutput(`  [state] streaming=${isStreaming}`),
    onConnection: (connection) => probeOutput(`  [connection] ${JSON.stringify(connection)}`),
  });

  probeOutput(`[probe] mode=${mode} cwd=${TARGET}`);
  session.prompt(prompt);

  if (mode === 'two-turn') {
    await waitForIdle(() => !session.isStreaming, 120_000);
    probeOutput('[probe] second turn');
    session.prompt('Now say the word "done" and nothing else.');
  }

  if (mode === 'interrupt') {
    await sleep(4000);
    probeOutput('[probe] interrupting');
    await session.interrupt();
  }

  await waitForIdle(() => !session.isStreaming, 120_000);
  await session.close();

  const state = foldSessionState(events);
  probeOutput('\n[probe] projection');
  probeOutput(`  items          ${state.items.length}`);
  probeOutput(`  awaiting       ${state.awaitingApproval.length}`);
  // The code, not the prose: a failure that sent none would print blank, which reads as no failure (ONL-2495).
  probeOutput(
    `  error          ${state.error === undefined ? '-' : `${state.error.code ?? 'unknown'} ${state.error.message}`.trim()}`,
  );
  for (const item of state.items) {
    if (item.kind !== 'tools') continue;
    for (const call of item.calls) {
      probeOutput(
        `  tool ${call.title} ${call.target ?? ''} -> ${call.displayStatus}` +
          ` (total ${call.durationMs}ms, waited ${call.waitedMs ?? 0}ms, ran ${call.ranMs}ms)`,
      );
    }
  }
  const unmapped = session.unmappedTypes;
  if (Object.keys(unmapped).length > 0) probeOutput(`  unmapped SDK types ${JSON.stringify(unmapped)}`);
}

function summarise(event: StudioEvent): string {
  switch (event.type) {
    case 'tool.start':
      return `${event.name} ${event.target ?? ''} [${event.source}] ${event.status}`;
    case 'tool.update':
      return `${event.toolCallId.slice(-6)} ${event.title ?? ''} ${event.target ?? ''}${event.status ? ` -> ${event.status}` : ''}`;
    case 'tool.end':
      return `${event.toolCallId.slice(-6)} ${event.status} ran=${event.ranMs}ms waited=${event.waitedMs ?? 0}ms`;
    case 'permission.requested':
      return `${event.toolName} — ${event.title ?? ''}`;
    case 'permission.resolved':
      return event.outcome;
    case 'text.delta':
    case 'thinking.delta':
      return JSON.stringify(event.delta.slice(0, 40));
    case 'turn.ended':
      return `${event.stopReason} total=${event.totalCostUsd} delta=${event.costDeltaUsd}`;
    case 'session.error':
      return `${event.code}: ${event.message}`;
    default:
      return '';
  }
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function waitForIdle(done: () => boolean, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  // `isStreaming` is false until the turn starts.
  await sleep(1500);
  while (!done() && Date.now() < deadline) await sleep(250);
}

void main();
