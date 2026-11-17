import { useLayoutEffect, useRef } from 'react';
import { ChatPanel } from '@studio/chat-ui';
import { emptyState, type ProjectSetupFailure, type ProjectSetupSnapshot, type SetupStepsLive, type ToolCallView, type TranscriptItem } from '@studio/events';
import { CHAT_FIXTURE_STRINGS as STRINGS, tool } from '../ChatFixture.js';
import { ForwardIcon } from '../../icons/glyphs.js';
import { chatPanelProps } from '../../chat/panelProps.js';
import { SETUP_STEP_GLYPHS } from '../../chat/setupStepGlyphs.js';
import { REGION } from '../../layout.js';
import { noop, type Category } from './Showroom.js';

const SAVED = { revision: 'r1', definition: { prepare: '', install: { script: 'npm install', inputs: ['package-lock.json'], outputs: ['node_modules'] }, servers: [{ id: 'web', cwd: '.', start: 'npm run dev', port: 5173 }] } };
const ERESOLVE: ProjectSetupFailure = { revision: 'r1', stage: 'install', command: 'npm install', reason: 'The install command exited with code 1.', outputTail: 'npm ERR! code ERESOLVE\nnpm ERR! ERESOLVE unable to resolve dependency tree', elapsedMs: 4200 };
const snapshot = (state: ProjectSetupSnapshot['state'], failure: ProjectSetupFailure | null = null): ProjectSetupSnapshot => ({ saved: SAVED, verified: null, state, failure });

const studioCall = (id: string, name: string, status: ToolCallView['displayStatus'], result?: unknown): ToolCallView =>
  tool(id, 'other', `mcp__studio__${name}`, name, status, false, result === undefined ? {} : { result: JSON.stringify(result) });

type Stage = 'asked' | 'kicked-off' | 'partway' | 'repairing' | 'failed' | 'incomplete' | 'done';

function transcript(stage: Stage): { items: TranscriptItem[]; isStreaming: boolean; live?: SetupStepsLive } {
  const isStreaming = stage === 'asked' || stage === 'kicked-off' || stage === 'partway' || stage === 'repairing';
  const calls: ToolCallView[] = [studioCall('get', 'get_project_setup', stage === 'kicked-off' ? 'in_progress' : 'completed', stage === 'kicked-off' ? undefined : { ...snapshot('idle'), saved: null })];
  if (stage !== 'kicked-off') {
    calls.push(tool('read', 'read', 'Read', 'package.json', 'completed'));
    calls.push(studioCall('save', 'save_project_setup', 'completed', { ok: true, snapshot: snapshot('idle') }));
    const runResult = stage === 'failed' ? { ok: false, reason: 'failed', snapshot: snapshot('failed', ERESOLVE) } : stage === 'done' ? { ok: true, snapshot: snapshot('running') } : undefined;
    calls.push(studioCall('run', 'run_project_setup', stage === 'incomplete' ? 'canceled' : runResult === undefined ? 'in_progress' : runResult.ok ? 'completed' : 'failed', runResult));
  }
  const items: TranscriptItem[] = [
    { kind: 'user', id: 'u', origin: 'studio', text: 'First call get_project_setup. Reuse saved setup with run_project_setup.' },
  ];
  if (stage !== 'asked') {
    items.push({ kind: 'assistant-text', id: 'a1', text: "I'll get the bakery site running.", isStreaming: false });
    items.push({ kind: 'tools', id: 't', calls });
  }
  const closing: Partial<Record<Stage, string>> = {
    failed: "I couldn't install the packages: react 19 and react-dom 18 don't agree. The fix is one line in package.json. Should I make it?",
    done: "It's running and open on the canvas. Tell me what to change.",
    incomplete: 'Stopped.',
  };
  const text = closing[stage];
  if (text !== undefined) items.push({ kind: 'assistant-text', id: 'a2', text, isStreaming: false, durationMs: 41_800 });
  const live: Partial<Record<Stage, SetupStepsLive>> = {
    partway: { snapshot: snapshot('starting'), livePorts: [] },
    repairing: { snapshot: snapshot('failed', ERESOLVE), livePorts: [] },
  };
  return { items, isStreaming, ...(live[stage] ? { live: live[stage] } : {}) };
}

function SetupStepsPanel({ stage, reopen = false }: { stage: Stage; reopen?: boolean }): React.JSX.Element {
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (reopen) root.current?.querySelector<HTMLElement>('[data-testid="setup-steps-fold"]')?.click();
  }, [reopen]);
  const { items, isStreaming, live } = transcript(stage);
  return (
    <div ref={root} data-testid="setup-steps-panel" style={{ width: REGION.end, height: 640, border: 'var(--border-width) solid var(--color-border)', borderRadius: 'var(--radius-container)', overflow: 'hidden' }}>
      <ChatPanel {...chatPanelProps({
        transcript: { state: { ...emptyState, items, isStreaming }, connection: { status: 'ok' }, strings: STRINGS, onInterrupt: noop, onRespond: noop, onCopy: noop, chevronIcon: ForwardIcon },
        composer: { composerValue: '', onComposerChange: noop, onSend: noop },
        setup: { setupRepo: 'hearth-bakery', ...(live ? { setupLive: live } : {}), stepGlyphs: SETUP_STEP_GLYPHS },
      })} />
    </div>
  );
}

export const setupSteps: Category = {
  id: 'setup-steps',
  title: 'Setup checklist — Studio ticks the agent\'s setup turn (ONL-2913)',
  stories: [
    { id: 'setup-steps-asked', title: 'asked', note: 'Studio sent the setup prompt; the agent has not answered yet', render: () => <SetupStepsPanel stage="asked" /> },
    { id: 'setup-steps-kicked-off', title: 'kicked off', render: () => <SetupStepsPanel stage="kicked-off" /> },
    { id: 'setup-steps-partway', title: 'partway', note: 'the setup machine is starting the dev server', render: () => <SetupStepsPanel stage="partway" /> },
    { id: 'setup-steps-repairing', title: 'repairing', note: 'the install failed while the agent can still fix it', render: () => <SetupStepsPanel stage="repairing" /> },
    { id: 'setup-steps-failed', title: 'failed', render: () => <SetupStepsPanel stage="failed" /> },
    { id: 'setup-steps-incomplete', title: 'incomplete', note: 'the person stopped the turn: no failure, nothing crossed', render: () => <SetupStepsPanel stage="incomplete" /> },
    { id: 'setup-steps-done', title: 'done, folded', render: () => <SetupStepsPanel stage="done" /> },
    { id: 'setup-steps-reopened', title: 'done, reopened', render: () => <SetupStepsPanel stage="done" reopen /> },
  ],
};
