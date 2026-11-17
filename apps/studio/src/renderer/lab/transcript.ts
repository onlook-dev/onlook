/**
 * Long on purpose: the behaviour under design is what the panel does to the most
 * recent user message AS THE TRANSCRIPT SCROLLS, so a conversation that fits the
 * panel expresses nothing.
 */

import { SUGGEST_NEXT_TASKS_TOOL, type StudioEvent, type WelcomeProject } from '@studio/events';

export const LAB_WORKSPACE: WelcomeProject = {
  sourceRepoName: 'react-project-v1',
  workspaceName: 'skylark',
  branchName: 'ldavinci/skylark',
  baseBranch: 'main',
};

const SESSION_ID = 'lab-harness';

const TURNS: [prompt: string, reply: string][] = [
  [
    'Make the hero section two columns and move the CTA above the fold.',
    [
      'The hero is a two-column grid at desktop widths now, collapsing to one column below the medium breakpoint. The call to action sits above the fold on a laptop.',
      '',
      '- Set the grid template columns on the hero container',
      '- Extracted the button styles into a shared token so the secondary variant stays in sync',
      '- Removed the fixed height that letterboxed the image',
    ].join('\n'),
  ],
  [
    'The heading feels heavy. Try one step down and a little more air under it.',
    'Dropped the heading one step on the type scale and added a step of space beneath it. The supporting copy inherits from the stack primitive, so the rhythm holds if the scale changes again.',
  ],
  [
    'Can the image bleed to the edge of the viewport instead of sitting in the gutter?',
    [
      'The image is full-bleed now. It breaks out of the container with a negative inline margin rather than a viewport-width trick, so it stays correct inside the scrollbar.',
      '',
      'One thing worth flagging: the background is still loaded at full resolution on small screens. That is a performance concern rather than a layout one, but it will show up as a regression if this ships as is.',
    ].join('\n'),
  ],
  [
    'Use the accent colour for the primary button.',
    'The primary button reads from the accent token now instead of a hardcoded value, so it tracks the theme.',
  ],
  [
    'Now the secondary button looks wrong next to it. Quiet it down.',
    'The secondary button is a ghost treatment — no fill, border only, and it picks up the accent on hover so the pair reads as one family.',
  ],
  [
    'Add a testimonial row under the hero, three across.',
    [
      'Added a three-across testimonial row beneath the hero. It wraps to one column at the same breakpoint the hero does, so both sections change shape together.',
      '',
      'Each card is name, role, and quote, with the quote as the loudest thing in the card.',
    ].join('\n'),
  ],
  [
    'The gap between the hero and the testimonials is too big.',
    'Tightened the section gap by two steps. It is a section-level token, so every section boundary on the page moved with it — say the word and I will scope it to this one pair instead.',
  ],
  [
    'Scope it to the pair. The rest of the page was fine.',
    'Done. The tighter gap now applies only between the hero and the testimonial row; every other section boundary is back to where it was.',
  ],
];

function build(): StudioEvent[] {
  const events: StudioEvent[] = [];
  let seq = 0;
  const base = (): { sessionId: string; eventId: string; seq: number; ts: number } => {
    seq += 1;
    return { sessionId: SESSION_ID, eventId: `e${seq}`, seq, ts: seq * 1000 };
  };

  events.push({
    ...base(),
    type: 'session.started',
    cwd: '/workspaces/skylark',
    permissionMode: 'auto',
  });
  events.push({ ...base(), type: 'session.welcome', workspace: LAB_WORKSPACE });

  /**
   * The composer's model control is gated on `models` being non-empty, and the
   * row WITHOUT effort levels is what exercises `ModelEffortMenu`'s no-flyout
   * branch.
   */
  events.push({
    ...base(),
    type: 'session.settings',
    model: 'sonnet',
    effort: 'medium',
    models: [
      {
        value: 'opus',
        displayName: 'Opus',
        supportsEffort: true,
        supportedEffortLevels: ['low', 'medium', 'high'],
      },
      {
        value: 'sonnet',
        displayName: 'Sonnet',
        supportsEffort: true,
        supportedEffortLevels: ['low', 'medium', 'high'],
      },
      { value: 'haiku', displayName: 'Haiku' },
    ],
  });

  const turns = new URLSearchParams(window.location.search).get('canvas') === 'empty' ? [] : TURNS;
  turns.forEach(([prompt, reply], index) => {
    const turnId = `t${index}`;
    const blockId = `b${index}`;
    events.push({ ...base(), type: 'turn.started', turnId });
    events.push({ ...base(), type: 'message.user', turnId, text: prompt });
    events.push({ ...base(), type: 'text.start', blockId });
    events.push({ ...base(), type: 'text.end', blockId, text: reply });
    events.push({
      ...base(),
      type: 'turn.ended',
      turnId,
      durationMs: 8000 + index * 1200,
      tokens: { context: 14_000 + index * 9_500, contextWindow: 200_000 },
    });
  });

  if (new URLSearchParams(window.location.search).get('transcript') === 'confirmed-card') confirmCard(events, base);

  return events;
}

/** `?transcript=confirmed-card`: a turn that offered next tasks, then the agent at work on the one confirmed (ONL-2901). */
function confirmCard(events: StudioEvent[], base: () => { sessionId: string; eventId: string; seq: number; ts: number }): void {
  const tasks = [
    { title: 'Push the remix further', line: 'Bolder type and a tighter grid across the hero and testimonials.' },
    { title: 'Try a dark hero', line: 'The same layout on a dark ground, with the accent carrying the button.' },
    { title: 'Show it on mobile', line: 'A narrow Frame beside this one, so both widths stay in view.' },
  ];
  events.push({ ...base(), type: 'turn.started', turnId: 'offer' });
  events.push({ ...base(), type: 'message.user', turnId: 'offer', text: 'Remix the hero so it feels less like a template.' });
  events.push({ ...base(), type: 'text.start', blockId: 'offer-text' });
  events.push({ ...base(), type: 'text.end', blockId: 'offer-text', text: 'Remixed the hero: an offset grid, the headline set larger, and the image cropped to the subject.' });
  events.push({ ...base(), type: 'tool.start', toolCallId: 'offer-call', name: SUGGEST_NEXT_TASKS_TOOL, kind: 'other', title: 'Suggest next tasks', status: 'in_progress', input: { tasks } });
  events.push({ ...base(), type: 'tool.end', toolCallId: 'offer-call', status: 'completed' });
  events.push({ ...base(), type: 'turn.ended', turnId: 'offer', durationMs: 21_400, tokens: { context: 96_000, contextWindow: 200_000 } });
  events.push({ ...base(), type: 'turn.started', turnId: 'chosen' });
  events.push({ ...base(), type: 'message.user', turnId: 'chosen', text: tasks[0]!.title, origin: 'suggestion' });
  events.push({ ...base(), type: 'text.start', blockId: 'chosen-text' });
  events.push({ ...base(), type: 'text.delta', blockId: 'chosen-text', delta: 'Setting the headline a step larger and tightening the grid' });
}

export const LAB_EVENTS: StudioEvent[] = build();

export const LAB_LAST_SEQ: number = LAB_EVENTS.length;
