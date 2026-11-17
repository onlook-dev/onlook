/**
 * The chat panel driven from a captured conversation instead of a live agent. Gated by the main process (`STUDIO_CHAT_FIXTURE`, `main/env/dev-switches.ts`): a packaged build cannot produce the hash.
 * The frame around the panel is a harness, not a copy of `App.tsx`: only the panel's box has to match (`REGION.end` wide, full height under a `REGION.topBar` band).
 */

import { Profiler, useEffect, useState, type ProfilerOnRenderCallback } from 'react';
import { Icon } from '@astryxdesign/core/Icon';
import { HStack } from '@astryxdesign/core/Layout';
import { Layout, LayoutContent, LayoutHeader, LayoutPanel } from '@astryxdesign/core/Layout';
import { ChatPanel, type ChatStrings, type WelcomeTurnStrings } from '@studio/chat-ui';
import { ChatPanelFrame } from '../chat/ChatPanelFrame.js';
import { composerControls, permissionModeControls } from '../chat/composerControls.js';
import { chatPanelProps, modelMenuFooter } from '../chat/panelProps.js';
import { CopyIcon, ForwardIcon } from '../icons/glyphs.js';

import { REGION } from '../layout.js';
import { RESTING_WORKSPACE } from '../restingMock.js';
import { failureStrings } from '../chat/failureStrings.js';
import { toolLineStrings } from '../chat/toolLineStrings.js';
import type { ModelChoice, SessionState, ToolCallView, TranscriptItem } from '@studio/events';
import '../chat/chat.css';

/**
 * `long`: one reply taller than the panel (ONL-1806).
 * `single`: one tool call awaiting approval (ONL-1809).
 * `multi`: a four-call group with the last call awaiting approval; more than three calls collapses the group.
 * `multi-live`: `multi`'s end state arriving one call at a time (ONL-1815). The defect is in the transition, so a scenario mounted already-finished cannot express it.
 * `depth`: `multi-live` on top of an existing conversation (ONL-1815); see `PRIOR_TURNS`.
 * `mid-turn` / `mid-turn-queueing`: a turn in flight on each of the two runtime behaviours (ONL-2052).
 * `stress`: ~300 finished items (ONL-2358); the per-keystroke commit cost lands on `window.__chatCommits`.
 */
export type ChatFixtureScenario =
  | 'long'
  | 'single'
  | 'multi'
  | 'multi-live'
  | 'depth'
  | 'welcome'
  | 'welcome-live'
  | 'attachments'
  | 'mid-turn'
  | 'mid-turn-queueing'
  | 'error'
  | 'stress';

/** Declared above `CHAT_FIXTURE_STRINGS`, which embeds it: a `const` read before its own declaration is a TDZ ReferenceError at module load, a blank screen on a fixture route. */
const WELCOME_STRINGS: WelcomeTurnStrings = {
  copy: 'We made a new copy of {repo} named {project}',
  branch: 'Also a branch named {branch} was made based off of the {base} branch of your codebase',
  copiedNote: 'This folder is not tracked by git yet. Onlook sets that up on its copy. Your folder stays as it is.',
};

/** The catalog's copy as a fixture bag; the showroom's chat gallery mounts on it too. */
export const CHAT_FIXTURE_STRINGS: ChatStrings = {
  // The catalog's own text — the shipping placeholder names no runtime, so a
  // brand here would put one on a codex composer.
  composerPlaceholder: 'Ask for a change…',
  composerResume: 'Resume',
  composerSend: 'Send',
  composerStop: 'Stop',
  turnResumed: 'Work resumed',
  nextTasksLabel: 'Suggested next tasks',
  setupRunning: 'Setting up {repo}',
  setupEnded: 'Set up {repo}',
  setupSteps: {
    label: 'Setup steps',
    done: 'Running on the canvas',
    steps: { find: 'Find how the project runs', install: 'Install packages', start: 'Start the dev server', canvas: 'Open it on the canvas' },
  },
  composerPlaceholderDisconnected: 'Disconnected',
  composerPlaceholderQuestion: 'Answer above, or reply here…',
  composerPlaceholderSkill: 'Add arguments, or send as is',
  approvalPrompt: 'Allow this?',
  questionSheet: { next: 'Next', send: 'Send', dismiss: 'Dismiss', goToQuestion: 'Question {n}', step: '{at} of {total}', ownWords: 'Type response…', dismissedOne: 'Question dismissed', dismissedMany: 'Questions dismissed' },
  toolAwaitingApproval: 'Needs approval',
  toolAwaitingAnswer: 'Question',
  toolDenied: 'Denied',
  toolCanceled: 'Canceled',
  destructiveClasses: {
    force_push: 'This rewrites history on the remote branch. Commits only on the remote will be lost.',
    branch_delete: 'This deletes a branch. Work only on that branch will be lost.',
    hard_reset: 'This throws away commits and any uncommitted changes in the working copy.',
  },
  imageAttachmentLabel: 'Image',
  imageAlt: 'Image in the conversation',
  imageUnavailable: 'Image unavailable',
  toolVerbs: {
    read: { running: 'Reading', done: 'Read' },
    write: { running: 'Writing', done: 'Wrote' },
    edit: { running: 'Editing', done: 'Edited' },
    search: { running: 'Searching', done: 'Searched' },
    find: { running: 'Finding', done: 'Found' },
    run: { running: 'Running', done: 'Ran' },
    fetch: { running: 'Fetching', done: 'Fetched' },
    searchWeb: { running: 'Searching the web', done: 'Searched the web' },
    use: { running: 'Using', done: 'Used' },
    rename: { running: 'Naming the project', done: 'Named the project' },
  },
  toolRows: {
    failedSuffix: ' — failed',
    canceledSuffix: ' — stopped',
    commandCount: '{count} commands',
    commandsVerb: { running: 'Running {target}', done: 'Ran {target}' },
    overflow: '+{count} more',
    lineCount: '{count} lines',
  },
  toolLines: toolLineStrings(),
  connectionMissingTitle: 'Missing',
  connectionMissingBody: 'Missing body',
  welcome: WELCOME_STRINGS,
  connectionErrorTitle: 'Error',
  connectionDetailsLabel: 'Details',
  connectionCodexMissingTitle: 'ChatGPT missing',
  connectionCodexMissingBody: 'ChatGPT missing body',
  connectionCodexMissingAction: 'Set up ChatGPT',
  connectionCodexUnauthedTitle: 'ChatGPT unauthed',
  connectionCodexUnauthedBody: 'ChatGPT unauthed body',
  connectionCodexUnauthedAction: 'Sign in to ChatGPT',
  connectionCodexErrorTitle: 'ChatGPT error',
  errorTitle: 'Error',
  errorCutOffTitle: 'The reply was cut off. Retry sends the same message again.',
  failure: failureStrings('Claude', 'ChatGPT'),
  errorReason: {
    api_error: 'Claude could not answer. Its API failed.',
    api_error_status: 'Claude could not answer. Its API failed with HTTP {status}.',
    prompt_too_long: 'This message is too long for the model. Shorten it or start a new chat.',
    rate_limited: 'You have reached a usage limit. Try again later.',
    max_turns: 'The agent stopped at its turn limit for this message.',
    max_budget: 'The agent stopped at its spend limit for this message.',
    tool_use_failed: 'The agent’s tool calls kept failing.',
    turn_setup_failed: 'This turn could not be started.',
    model_error: 'The model failed on this message.',
    image_error: 'An attached image could not be read.',
    hook_stopped: 'A hook stopped this turn.',
  },
  errorRetryAction: 'Retry',
  noticeStopAndResend: 'Stop and send again',
  delivery: {
    waiting: 'Waiting on the question above',
    refused: 'Refused',
    discarded: 'Not sent, stopped',
  },
  pen: {
    labels: {
      question: 'Sends after you answer the question',
      working: 'Sends when ChatGPT finishes',
      'not-sent': 'Not sent — send it when you’re ready',
    },
    takeLabel: 'Edit',
    discardLabel: 'Discard',
    attachmentsOnly: (count: number) =>
      count === 1 ? '1 attachment, no message' : `${String(count)} attachments, no message`,
  },
  thinkingLabel: 'Thinking',
  thoughtLabel: 'Thought',
  newMessages: 'New messages',
  scrollToBottom: 'Scroll to bottom',
  responseDuration: '{seconds}s',
  responseDurationLong: '{minutes}m {seconds}s',
  turnWaiting: 'Waiting on you',
  turnWaitingSkip: 'Waiting on you ({skip})',
  turnSkip: 'skip',
  responseTokens: '{count} tokens',
  responseCopyLabel: 'Copy',
};

/** `name` decides the presentation a call gets: `classifyToolCalls` reads the raw SDK tool name before `kind`, so a vague name renders as "Used". */
/** A `ToolCallView` fixture; the showroom's chat gallery builds on it too. */
export function tool(
  id: string,
  kind: ToolCallView['kind'],
  title: string,
  target: string,
  displayStatus: ToolCallView['displayStatus'],
  withPermission = false,
  extra: Partial<Pick<ToolCallView, 'input' | 'result' | 'errorMessage'>> = {},
): ToolCallView {
  return {
    toolCallId: id,
    name: title,
    kind,
    title,
    target,
    status: displayStatus === 'awaiting_approval' ? 'pending' : (displayStatus as never),
    displayStatus,
    ranMs: 260,
    startedAt: 0,
    ...extra,
    ...(withPermission
      ? {
          permission: {
            requestId: `req-${id}`,
            options: [
              { optionId: 'allow', label: 'Approve', kind: 'allow_once' as const },
              { optionId: 'deny', label: 'Deny', kind: 'reject_once' as const },
            ],
          },
        }
      : {}),
  };
}

const LONG_REPLY = [
  'Here is what I changed and why it matters for the layout you asked about.',
  '',
  'The hero section now uses a two-column grid at desktop widths and collapses to a single column below the medium breakpoint. I moved the call-to-action above the fold so it is visible without scrolling on a laptop.',
  '',
  '- Updated the grid template columns on the hero container',
  '- Extracted the button styles into a shared token so the secondary variant stays in sync',
  '- Removed the fixed height that was causing the image to letterbox',
  '- Adjusted the vertical rhythm between the heading and the supporting copy',
  '',
  'The spacing scale is doing most of the work here. Previously the heading and the paragraph were both using an ad-hoc margin, which meant they drifted apart whenever the type scale changed. Now they inherit from the stack primitive.',
  '',
  'One thing worth flagging: the background image is still being loaded at full resolution on mobile. That is a separate concern from the layout work, but it will show up as a performance regression if you ship this as-is. I would suggest a responsive source set as a follow-up.',
  '',
  'Let me know if you want the columns reversed, or if the image should bleed to the edge of the viewport rather than sitting inside the container gutter.',
].join('\n');

/** `long` — a reply taller than the panel, and nothing else in the way. */
const ITEMS_LONG: TranscriptItem[] = [
  { kind: 'user', id: 'u1', text: 'Make the hero section two columns and move the CTA above the fold.' },
  { kind: 'assistant-text', id: 'a1', text: LONG_REPLY, isStreaming: false, durationMs: 12_000 },
];

/** `single`: one call awaiting approval, so `ChatToolCalls` takes its `calls.length === 1` inline path. */
const ITEMS_SINGLE: TranscriptItem[] = [
  { kind: 'user', id: 'u1', text: 'Update the accent token.' },
  {
    kind: 'assistant-text',
    id: 'a0',
    text: LONG_REPLY.split('\n\n').slice(0, 4).join('\n\n'),
    isStreaming: false,
  },
  {
    kind: 'tools',
    id: 't1',
    calls: [tool('c4', 'edit', 'Edit', 'src/styles/tokens.css', 'awaiting_approval', true)],
  },
];

/**
 * `multi`: four calls with the last awaiting approval, at the end of a transcript taller than the panel. `ChatToolCalls` collapses a group of more than three.
 * The ORDER is load-bearing: a pending approval is always the most recent thing in a transcript, so the bulk goes above it.
 */
const EDIT_BODY = `.hero {
  display: grid;
  grid-template-columns: 1fr 1fr;
}`;

const BUILD_OUTPUT = `✓ 41 modules transformed
built in 812ms`;

const ITEMS_MULTI: TranscriptItem[] = [
  { kind: 'user', id: 'u1', text: 'Make the hero section two columns and move the CTA above the fold.' },
  { kind: 'assistant-text', id: 'a1', text: LONG_REPLY, isStreaming: false, durationMs: 12_000 },
  {
    kind: 'tools',
    id: 't1',
    calls: [
      tool('c1', 'read', 'Read', 'src/components/Hero.tsx', 'completed'),
      tool('c2', 'search', 'Grep', 'hero-container', 'completed'),
      tool('c3', 'edit', 'Edit', 'src/components/Hero.tsx', 'completed', false, {
        input: { new_string: EDIT_BODY },
      }),
      tool('c5', 'execute', 'Bash', 'bun run build', 'completed', false, {
        result: BUILD_OUTPUT,
      }),
      tool('c4', 'edit', 'Edit', 'src/styles/tokens.css', 'awaiting_approval', true, {
        input: { new_string: EDIT_BODY },
      }),
    ],
  },
];

/**
 * `multi-live` (ONL-1815): the same group as `multi`, staged the way `foldSessionState()` builds one, so `ChatToolCalls` re-renders at each length.
 * `multi` mounts the final frame and never performs that growth.
 */
const PROMPT = 'Make the hero section two columns and move the CTA above the fold.';

/** The calls of the turn in arrival order, the approval last. Ten, not `multi`'s four: the size of the jump is the variable under test. */
const LIVE_CALLS: [string, ToolCallView['kind'], string, string][] = [
  ['c1', 'read', 'Read', 'src/components/Hero.tsx'],
  ['c2', 'search', 'Grep', 'hero-container'],
  ['c3', 'read', 'Read', 'src/components/Hero.module.css'],
  ['c4', 'search', 'Grep', 'cta-button'],
  ['c5', 'read', 'Read', 'src/styles/tokens.css'],
  ['c6', 'execute', 'Bash', 'yarn typecheck'],
  ['c7', 'read', 'Read', 'src/components/Cta.tsx'],
  ['c8', 'edit', 'Edit', 'src/components/Cta.tsx'],
  ['c9', 'edit', 'Edit', 'src/components/Hero.tsx'],
  ['cA', 'edit', 'Edit', 'src/styles/tokens.css'],
];

/** The id of the call that ends up awaiting approval — the last to arrive. */
const APPROVAL_CALL_ID = 'cA';

/** The turn, frame by frame, from an empty transcript: the panel starts short and grows past its own height, a different scroll regime from mounting already-overflowing. */
function buildMultiLiveStages(): TranscriptItem[][] {
  const user: TranscriptItem = { kind: 'user', id: 'u1', text: PROMPT };
  const stages: TranscriptItem[][] = [[], [user]];

  /*
   * The thinking block resolves rather than vanishing, reversing ONL-1933: `thinking.end` only flips `isStreaming` to false, so the finished row stays staged.
   * Markdown, because reasoning is markdown on the wire (ONL-2052).
   */
  const THINKING =
    '**Reading the hero layout** Looking at the layout and the token file to see what drives the columns.';
  for (let i = 1; i <= 3; i++) {
    stages.push([
      user,
      {
        kind: 'assistant-thinking',
        id: 'th1',
        text: THINKING.slice(0, Math.ceil((THINKING.length * i) / 3)),
        isStreaming: i < 3,
      },
    ]);
  }

  const thinking: TranscriptItem = {
    kind: 'assistant-thinking',
    id: 'th1',
    text: THINKING,
    isStreaming: false,
  };

  // The reply streams in after it. The true->false flip at the end is a
  // re-parse, so it can make the transcript SHORTER rather than taller.
  const paras = LONG_REPLY.split('\n\n');
  for (let i = 1; i <= paras.length; i++) {
    stages.push([
      user,
      thinking,
      {
        kind: 'assistant-text',
        id: 'a1',
        text: paras.slice(0, i).join('\n\n'),
        isStreaming: i < paras.length,
      },
    ]);
  }

  const reply: TranscriptItem = {
    kind: 'assistant-text',
    id: 'a1',
    text: LONG_REPLY,
    isStreaming: false,
  };

  // Then the calls, one at a time, each running before it completes — the
  // sequence `ChatToolCalls` sees: inline row at length 1, collapsed group from
  // length 2, force-expanded when the approval lands.
  for (let n = 1; n <= LIVE_CALLS.length; n++) {
    for (const phase of ['running', 'settled'] as const) {
      const calls: ToolCallView[] = LIVE_CALLS.slice(0, n).map(([id, kind, title, target], i) => {
        const isLast = i === n - 1;
        const isApproval = id === APPROVAL_CALL_ID;
        if (!isLast) return tool(id, kind, title, target, 'completed');
        if (phase === 'running') return tool(id, kind, title, target, 'in_progress');
        return isApproval
          ? tool(id, kind, title, target, 'awaiting_approval', true)
          : tool(id, kind, title, target, 'completed');
      });
      stages.push([user, thinking, reply, { kind: 'tools', id: 't1', calls }]);
    }
  }

  return stages;
}

const MULTI_LIVE_STAGES: TranscriptItem[][] = buildMultiLiveStages();

/** `depth` (ONL-1815): prior messages to anchor on, slack left in `ChatMessageList`'s `flex: 1` spacer, and a non-zero `scrollTop`. */
const PRIOR_TURNS: TranscriptItem[] = [
  { kind: 'user', id: 'p1u', text: 'Rename the hero heading to "Approved edit one".' },
  { kind: 'assistant-text', id: 'p1a', text: 'Done — the heading now reads "Approved edit one".', isStreaming: false },
  { kind: 'user', id: 'p2u', text: 'Now make the tagline sentence case.' },
  { kind: 'assistant-text', id: 'p2a', text: 'Updated the tagline to sentence case.', isStreaming: false },
  { kind: 'user', id: 'p3u', text: 'Try a blue accent.' },
  { kind: 'assistant-text', id: 'p3a', text: 'That edit was denied. The tagline remains "Approved edit one."', isStreaming: false },
];

/** The same live turn, but arriving on top of an existing conversation. */
const DEPTH_STAGES: TranscriptItem[][] = MULTI_LIVE_STAGES.map((s) => [...PRIOR_TURNS, ...s]);

/** Gap between stages, long enough that the scroll spring settles: overlapping stages would merge into one jump. */
const STAGE_MS = 300;

/** Dwell on the opening frame so the scroll position settles before the turn. */
const SETTLE_MS = 1200;

/**
 * A turn in flight: a settled thought, then prose still streaming. The thought
 * carries markdown so this scenario shows both halves of ONL-2052 at once.
 */
const ITEMS_MID_TURN: TranscriptItem[] = [
  { kind: 'user', id: 'u1', text: PROMPT },
  {
    kind: 'assistant-thinking',
    id: 'th1',
    text:
      '**Searching for the layout definition** The columns come from a grid token, ' +
      'so the `hero` rule is the one to change.',
    isStreaming: false,
  },
  {
    kind: 'assistant-text',
    id: 'a1',
    text: 'Switching the hero to a two-column grid at desktop widths',
    isStreaming: true,
  },
];

type StaticScenario = Exclude<ChatFixtureScenario, 'multi-live' | 'depth'>;

/**
 * The session-error block, whose subject is text it does not control. The first message has the shape `appserver/resolve.ts` produces: two absolute paths with no spaces to break at, wider than the panel.
 * The second is long enough that the block would own the panel, the case the bounded scroller exists for.
 */
const ITEMS_ERROR: TranscriptItem[] = [
  { kind: 'user', id: 'eu1', text: 'Make the hero heading larger.' },
  {
    kind: 'error',
    id: 'ee1',
    message:
      "the codex install at /var/folders/j8/3xq1v_2n0ld5k7wq9rr8xz4c0000gn/T/onl2108-cache-cW2uFI/codex-0.147.0 is unusable: no codex binary under /var/folders/j8/3xq1v_2n0ld5k7wq9rr8xz4c0000gn/T/onl2108-cache-cW2uFI/codex-0.147.0 — expected the platform executable, a codex-package.json descriptor, a vendor/<triple>/ tree, or a directory containing 'codex'",
  },
  { kind: 'user', id: 'eu2', text: 'Try again.' },
  {
    kind: 'error',
    id: 'ee2',
    message:
      'the app-server closed the connection before the turn completed: Error: read ECONNRESET\n' +
      '    at TCP.onStreamRead (node:internal/stream_base_commons:216:20)\n' +
      '    at Socket.emit (node:events:519:28)\n' +
      '    at addChunk (node:internal/streams/readable:559:12)\n' +
      '    at readableAddChunkPushByteMode (node:internal/streams/readable:510:3)\n' +
      'the runtime exited with status 1 and left no diagnostic beyond this trace, which usually '  +
      'means the sandbox denied a syscall the binary needs',
  },
  { kind: 'user', id: 'eu3', text: 'Give the cards more breathing room.' },
  {
    kind: 'error',
    id: 'ee3',
    message: 'fetch failed: getaddrinfo ENOTFOUND api.anthropic.com',
    retry: { text: 'Give the cards more breathing room.' },
  },
  // The long-brief failure (ONL-2495): a declared code and status, so the row names the reason.
  { kind: 'user', id: 'eu4', text: 'Here is the full brief for the marketing site. '.repeat(200) },
  {
    kind: 'error',
    id: 'ee4',
    message: '',
    code: 'api_error',
    apiErrorStatus: 529,
    retry: { text: 'Here is the full brief for the marketing site. '.repeat(200) },
  },
];

const STRESS_TURNS = 100;

const STRESS_REPLY = LONG_REPLY.split('\n\n').slice(0, 4).join('\n\n');

const STRESS_CALLS: [ToolCallView['kind'], string, string][] = [
  ['read', 'Read', 'src/components/Hero.tsx'],
  ['search', 'Grep', 'hero-container'],
  ['edit', 'Edit', 'src/components/Hero.tsx'],
  ['execute', 'Bash', 'bun run build'],
  ['fetch', 'WebFetch', 'https://example.com/spec'],
  ['other', 'Task', 'Explore the layout module'],
];

function buildStressItems(): TranscriptItem[] {
  const items: TranscriptItem[] = [];
  for (let turn = 0; turn < STRESS_TURNS; turn++) {
    items.push({ kind: 'user', id: `su${turn}`, text: `Turn ${turn + 1}: ${PROMPT}` });
    items.push({
      kind: 'assistant-text',
      id: `sa${turn}`,
      text: STRESS_REPLY,
      isStreaming: false,
      durationMs: 12_000,
    });
    const calls = [0, 1, 2].map((slot) => {
      const [kind, title, target] = STRESS_CALLS[(turn + slot) % STRESS_CALLS.length] as [
        ToolCallView['kind'],
        string,
        string,
      ];
      const extra =
        kind === 'edit' ? { input: { new_string: EDIT_BODY } } : kind === 'execute' ? { result: BUILD_OUTPUT } : {};
      return tool(`sc${turn}-${slot}`, kind, title, target, 'completed', false, extra);
    });
    items.push({ kind: 'tools', id: `st${turn}`, calls });
  }
  return items;
}

const ITEMS_STRESS: TranscriptItem[] = buildStressItems();

const SCENARIOS: Record<StaticScenario, TranscriptItem[]> = {
  long: ITEMS_LONG,
  error: ITEMS_ERROR,
  stress: ITEMS_STRESS,
  'mid-turn': ITEMS_MID_TURN,
  'mid-turn-queueing': ITEMS_MID_TURN,
  single: ITEMS_SINGLE,
  multi: ITEMS_MULTI,
  // `welcome` is the EMPTY transcript on purpose — the panel's RESTING content,
  // drawn while there is no session at all.
  welcome: [],
  /** The welcome turn as a transcript row with a conversation on top (ONL-1861). Separate from `welcome` because the layout specs tell the empty-state machinery from the row inside the scroller. */
  'welcome-live': [
    { kind: 'welcome', id: 'w1', workspace: RESTING_WORKSPACE },
    { kind: 'user', id: 'wu1', text: 'Make the hero heading larger.' },
    {
      kind: 'assistant-text',
      id: 'wa1',
      text: 'Done — the hero heading is now one step larger.',
      isStreaming: false,
    },
  ],
  /** A sent message carrying frame attachments (ONL-2045): the submitted pill's accent arm, unreachable through a live drive without a real session. */
  attachments: [
    {
      kind: 'user',
      id: 'au1',
      text: 'Align the header across both of these.',
      attachments: [
        { kind: 'frame', name: 'Journal copy' },
        { kind: 'frame', name: 'Journal' },
      ],
    },
    {
      kind: 'assistant-text',
      id: 'aa1',
      text: 'Done — both headers now share the same top offset.',
      isStreaming: false,
    },
  ],
};


/** `midTurn` is the backend's own steering rule: `refuse` is what a codex session reports once `turn/steer` has been refused (ONL-2180). */
const state = (
  items: TranscriptItem[],
  isStreaming = false,
  harnessId?: SessionState['harnessId'],
  midTurn: SessionState['midTurn'] = 'steer',
): SessionState => ({
  isStreaming,
  midTurn,
  harnessId,
  // What each backend publishes for itself (ONL-2190); codex offers one, so its control is disabled.
  permissionMode: harnessId === 'codex' ? 'danger-full-access' : 'auto',
  permissionModes:
    harnessId === 'codex' ? ['danger-full-access'] : ['default', 'acceptEdits', 'auto', 'plan'],
  items,
  touchedFiles: [],
  awaitingApproval: [],
  // No SDK behind this fixture, so nothing can answer `supportedModels()`.
  // Empty is the honest value and renders the pickers disabled.
  models: [],
  lastSeq: 0,
});

/** What a live session reports, enough for the control to render enabled. */
export const FIXTURE_MODELS: ModelChoice[] = [
  {
    value: 'opus',
    displayName: 'Opus',
    supportsEffort: true,
    supportedEffortLevels: ['low', 'medium', 'high'],
  },
  { value: 'sonnet', displayName: 'Sonnet' },
];

function fixtureControls(): ReturnType<typeof composerControls> {
  return composerControls({
    harness: 'claude',
    models: FIXTURE_MODELS,
    model: undefined,
    effort: undefined,
    setModel: () => {},
    setEffort: () => {},
  });
}

/** The mode control on the same fold, so the two triggers' shrink order is reviewable (ONL-2190). */
function fixturePermissionControl(state: SessionState): ReturnType<typeof permissionModeControls> {
  return permissionModeControls({
    mode: state.permissionMode,
    offered: state.permissionModes,
    setMode: () => {},
  });
}

// Module-level so the rows' memo sees one identity per prop; an inline arrow
// here would re-render every row per keystroke and measure the fixture (ONL-2358).
const noop = (): void => {};
const COPY_ICON = <Icon icon={CopyIcon} size="sm" color="inherit" />;

interface ChatCommit {
  phase: 'mount' | 'update' | 'nested-update';
  actualDuration: number;
  baseDuration: number;
}

type CommitWindow = Window & { __chatCommits?: ChatCommit[] };

const recordCommit: ProfilerOnRenderCallback = (_id, phase, actualDuration, baseDuration) => {
  const commits = ((window as CommitWindow).__chatCommits ??= []);
  commits.push({ phase, actualDuration, baseDuration });
};

/** The harness frame — only the chat region's contents are synthetic. */
export function ChatFixture({ scenario = 'long' }: { scenario?: ChatFixtureScenario }): React.JSX.Element {
  const [composerValue, setComposerValue] = useState('');

  // The staged scenarios walk their stages on a timer; every other scenario is
  // a single frame and this stays parked at 0.
  const stages =
    scenario === 'multi-live' ? MULTI_LIVE_STAGES : scenario === 'depth' ? DEPTH_STAGES : null;
  const isStaged = stages != null;
  const [stage, setStage] = useState(0);

  // `depth` waits for a REAL composer submit. Every other scenario swaps state
  // on a timer, which skips the send entirely — no typing, no Enter, no clearing
  // — so it cannot contain whatever the send itself does to the scroll position.
  const startsOnSend = scenario === 'depth';
  const [hasSent, setHasSent] = useState(false);
  const isRunning = !startsOnSend || hasSent;

  useEffect(() => {
    if (!stages || !isRunning) return;
    if (stage >= stages.length - 1) return;
    // Stage 0 dwells so the scroll offset comes to rest before the turn.
    const id = setTimeout(() => setStage((s) => s + 1), stage === 0 ? SETTLE_MS : STAGE_MS);
    return () => clearTimeout(id);
  }, [stages, stage, isRunning]);

  const items = stages
    ? (stages[stage] as TranscriptItem[])
    : (SCENARIOS[scenario as StaticScenario] ?? ITEMS_LONG);
  // The turn is in flight until the last stage lands, which drives the stop
  // button and `aria-busy`. The mid-turn pair streams from mount instead.
  const isMidTurn = scenario === 'mid-turn' || scenario === 'mid-turn-queueing';
  const STATE = state(
    items,
    isMidTurn || (isStaged && stage < (stages?.length ?? 0) - 1),
    scenario === 'mid-turn' ? 'codex' : undefined,
    scenario === 'mid-turn' ? 'refuse' : 'steer',
  );

  const panel = (
    <ChatPanel {...chatPanelProps({
      transcript: {
        chevronIcon: ForwardIcon,
        state: STATE,
        connection: { status: 'ok' },
        strings: CHAT_FIXTURE_STRINGS,
        onInterrupt: noop,
        onRespond: noop,
        onRetry: noop,
        onCopy: noop,
        copyIcon: COPY_ICON,
      },
      composer: {
        // DATA, not a rendered turn (ONL-1861): a live session's welcome
        // arrives as an event and folds into the transcript the same way.
        composerValue,
        onComposerChange: setComposerValue,
        /* Clearing mirrors the app: `ChatRegion` empties the composer only once main accepts the command, so an unchanged draft means the send never happened. */
        onSend: () => {
          setHasSent(true);
          setComposerValue('');
        },
        composerSlots: { footer: modelMenuFooter({ harness: STATE.harnessId, controls: fixtureControls() }) },
        permission: { control: fixturePermissionControl(STATE) },
      },
    })} />
  );

  return (
    <Layout
      height="fill"
      header={
        <LayoutHeader hasDivider height={REGION.topBar} label="Onlook" data-testid="topbar">
          <HStack gap={3} vAlign="center" hAlign="between" height="100%" />
        </LayoutHeader>
      }
      start={
        <LayoutPanel
          width={REGION.sidebar}
          hasDivider
          padding={0}
          label="Sidebar"
          data-testid="sidebar"
        />
      }
      end={
        <LayoutPanel
          width={REGION.end}
          // Mirrors `App.tsx`: the panel draws its own hairline, so the
          // container must not add a second one.
          hasDivider={false}
          isScrollable={false}
          padding={0}
          label="Chat"
          data-testid="chat-region"
        >
          {/* The SHIPPING chrome, not a copy of it — the specs assert controls
              sit inside the panel's box and are hittable at their centre, so a
              fixture reproducing stale chrome would test the fixture. */}
          <ChatPanelFrame>
            {import.meta.env.DEV ? (
              <Profiler id="chat-panel" onRender={recordCommit}>
                {panel}
              </Profiler>
            ) : (
              panel
            )}
          </ChatPanelFrame>
        </LayoutPanel>
      }
    >
      <LayoutContent padding={0} isScrollable={false} label="Canvas" data-testid="canvas-region" />
    </Layout>
  );
}
