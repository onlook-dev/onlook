import { useLayoutEffect, useState } from 'react';
import { useStore } from 'zustand';
import { HStack, VStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';

import {
  agentStatusReducer,
  INITIAL_AGENT_STATUS,
  statusLines,
  type AgentStatusAction,
  type AgentStatusState,
  type StatusSubject,
  type StatusWaiting,
} from '../../agentStatus/lines.js';
import { COLLAPSED, createCollapseStore, linesKeyOf, statusCollapse } from '../../agentStatus/collapse.js';
import { useAgentStatusStore } from '../../agentStatus/store.js';
import { StatusList } from '../../agentStatus/StatusList.js';
import { FRAME_NODE_TYPE, type CanvasFlowNode } from '../../canvas/model.js';
import { useCanvasStore } from '../../canvas/store.js';
import { seedFlags } from '../../flags/store.js';
import { Sidebar } from '../../sidebar/Sidebar.js';
import { HAIRLINE } from '../../panels/rowGeometry.js';
import type { Category } from './Showroom.js';

const frameSubject = (name: string | undefined): StatusSubject | undefined => (name === undefined ? undefined : { name, noun: 'browser' });

const NAMES: Record<string, string> = {
  fr_home: 'Home',
  fr_pricing: 'Pricing',
  fr_phone: 'Home on a phone, with the new headline and the Order button',
};

const start: AgentStatusAction = { type: 'streaming', isStreaming: true, isSetupTurn: false };
const end: AgentStatusAction = { type: 'streaming', isStreaming: false, isSetupTurn: false };
const HEADLINE = { done: 'Rewrote', what: 'headline' };
const BUTTON = { done: 'Restyled', what: 'Order button' };
const MENU = { done: 'Tightened', what: 'menu spacing' };
const WORDS: Record<string, (typeof HEADLINE)[]> = { fr_home: [HEADLINE], fr_pricing: [BUTTON], fr_phone: [HEADLINE] };
const marked = (...frameIds: string[]): AgentStatusAction => ({
  type: 'frames',
  frameIds,
  changes: frameIds.flatMap((frameId) => (WORDS[frameId] ?? []).map((words) => ({ frameId, ...words }))),
});
const after = (...actions: AgentStatusAction[]): AgentStatusState => actions.reduce(agentStatusReducer, INITIAL_AGENT_STATUS);

const WORKING = after(start, marked('fr_home'));
const ASKING = after(start, marked('fr_home'), { type: 'waitingOn', what: 'a font choice for the headline' });
const DONE = after(start, marked('fr_home', 'fr_pricing'), end);
const LONG = after(start, marked('fr_home', 'fr_phone'), end);
const ADDED = { kind: 'created' as const, done: 'Added' };
const COPIED = { kind: 'created' as const, done: 'Copied' };
const WARMING = { done: 'Warmed', what: 'palette' };
const ADDING_ARTISAN: AgentStatusAction = {
  type: 'frames',
  frameIds: ['fr_home', 'fr_artisan'],
  changes: [{ frameId: 'fr_home', ...HEADLINE }, { frameId: 'fr_artisan', ...ADDED }, { frameId: 'fr_artisan', ...WARMING }, { frameId: 'fr_artisan', ...BUTTON }],
};
const CREATED_DONE = after(start, ADDING_ARTISAN, end);
const DUPLICATED = after(
  start,
  { type: 'frames', frameIds: ['fr_copy_1', 'fr_copy_2'], changes: [{ frameId: 'fr_copy_1', ...COPIED }, { frameId: 'fr_copy_2', ...COPIED }] },
  end,
);
const BOARD_NAMES = { fr_menu: 'Menu', fr_pricing: 'Pricing', fr_about: 'About', fr_contact: 'Contact', fr_careers: 'Careers', fr_blog: 'Blog', fr_home: 'Home' };
const BOARD_WORDS: Record<string, typeof HEADLINE> = {
  fr_menu: { done: 'Added', what: 'opening hours' },
  fr_pricing: BUTTON,
  fr_about: { done: 'Rewrote', what: 'story' },
  fr_contact: { done: 'Added', what: 'map' },
  fr_careers: { done: 'Added', what: 'openings' },
  fr_blog: { done: 'Restyled', what: 'cards' },
  fr_home: HEADLINE,
};
const finished = (...newestFirst: (keyof typeof BOARD_NAMES)[]): AgentStatusState => {
  const frameIds = [...newestFirst].reverse();
  return after(start, { type: 'frames', frameIds, changes: frameIds.map((frameId) => ({ frameId, ...BOARD_WORDS[frameId]! })) }, end);
};
const THREE = finished('fr_menu', 'fr_pricing', 'fr_home');
const FIVE = finished('fr_menu', 'fr_pricing', 'fr_about', 'fr_contact', 'fr_home');
const SEVEN = finished('fr_menu', 'fr_pricing', 'fr_about', 'fr_contact', 'fr_careers', 'fr_blog', 'fr_home');

const SEVERAL = after(
  start,
  { type: 'frames', frameIds: ['fr_home'], changes: [HEADLINE, BUTTON, MENU].map((words) => ({ frameId: 'fr_home', ...words })) },
  end,
);

function Rail({ state, waiting }: { state: AgentStatusState; waiting?: StatusWaiting }): React.JSX.Element {
  return (
    <div
      data-testid="showroom-status-rail"
      style={{ width: 248, height: 150, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', background: 'var(--studio-band)', borderRight: HAIRLINE }}
    >
      <Collapsible state={state} {...(waiting === undefined ? {} : { waiting })} />
    </div>
  );
}

function Collapsible({ state, waiting }: { state: AgentStatusState; waiting?: StatusWaiting }): React.JSX.Element {
  const [store] = useState(() => createCollapseStore());
  const collapse = useStore(store, (s) => s);
  return <StatusList lines={statusLines(state, waiting, (id) => frameSubject(NAMES[id]))} collapse={collapse} actions={collapse} onOpen={() => undefined} />;
}

function Cap({ label, children }: { label: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <VStack gap={1}>
      {children}
      <Text type="supporting" color="secondary">{label}</Text>
    </VStack>
  );
}

function Lines(): React.JSX.Element {
  return (
    <HStack gap={4} vAlign="start">
      <Cap label="waiting on a question"><Rail state={ASKING} waiting="question" /></Cap>
      <Cap label="after the turn"><Rail state={DONE} /></Cap>
      <Cap label="too long: the fade"><Rail state={LONG} /></Cap>
    </HStack>
  );
}

const panelFrames = (names: Record<string, string>): CanvasFlowNode[] => Object.entries(names).map(([id, name], index) => ({
  id,
  type: FRAME_NODE_TYPE,
  position: { x: index * 1400, y: 0 },
  width: 1280,
  height: 800,
  zIndex: 0,
  data: {
    homeUrl: `http://localhost:4321/${id}`,
    name,
    currentUrl: `http://localhost:4321/${id}`,
    health: 'live',
    title: name,
    canGoBack: false,
    canGoForward: false,
  },
}));
const PANEL_FRAMES = panelFrames(NAMES);
const WITH_ARTISAN = panelFrames({ ...NAMES, fr_artisan: 'Home artisan' });
const WITH_COPIES = panelFrames({ ...NAMES, fr_copy_1: 'Home copy', fr_copy_2: 'Home copy' });
const BOARD_FRAMES = panelFrames(BOARD_NAMES);

function InPanel({ state, waiting, isOn = true, isOpen = false, frames = PANEL_FRAMES }: { state: AgentStatusState; waiting?: StatusWaiting; isOn?: boolean; isOpen?: boolean; frames?: CanvasFlowNode[] }): React.JSX.Element {
  useLayoutEffect(() => {
    seedFlags({ 'rail-foot': isOn });
    useCanvasStore.setState({ nodes: frames, currentPageId: 'pg_main', selectedNodeIds: [] });
    useAgentStatusStore.setState({ status: state, waiting });
    const names = new Map(frames.map((node) => [node.id, String(node.data['name'])]));
    const keys = statusLines(state, waiting, (id) => frameSubject(names.get(id))).map((line) => line.key);
    statusCollapse.setState(isOpen ? { ...COLLAPSED, open: true, shut: false, linesKey: linesKeyOf(keys) } : COLLAPSED);
    return () => {
      useAgentStatusStore.setState({ status: INITIAL_AGENT_STATUS, waiting: undefined });
      statusCollapse.setState(COLLAPSED);
    };
  }, [state, waiting, isOn, isOpen, frames]);
  return (
    <div style={{ width: 259, height: 420, overflow: 'hidden', border: HAIRLINE, background: 'var(--studio-ground)' }} data-testid="showroom-status-panel">
      <Sidebar />
    </div>
  );
}

const UPDATES = [
  finished('fr_menu', 'fr_pricing', 'fr_home'),
  finished('fr_about', 'fr_pricing', 'fr_home'),
  finished('fr_contact', 'fr_pricing', 'fr_home'),
];
const ONE_MORE = finished('fr_careers', 'fr_contact', 'fr_pricing', 'fr_home');

function Updates(): React.JSX.Element {
  const [store] = useState(() => createCollapseStore());
  const collapse = useStore(store, (s) => s);
  const [state, setState] = useState(UPDATES[0]!);
  const [step, setStep] = useState(0);
  return (
    <HStack gap={4} vAlign="end">
      <div
        data-testid="showroom-status-updates"
        style={{ width: 248, height: 150, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', background: 'var(--studio-band)', borderRight: HAIRLINE }}
      >
        <StatusList lines={statusLines(state, undefined, (id) => frameSubject(BOARD_NAMES[id as keyof typeof BOARD_NAMES]))} collapse={collapse} actions={collapse} onOpen={() => undefined} />
      </div>
      <VStack gap={1}>
        <button
          type="button"
          data-testid="showroom-status-next-line"
          onClick={() => {
            const next = (step + 1) % UPDATES.length;
            setStep(next);
            setState(UPDATES[next]!);
          }}
        >
          Next first line
        </button>
        <button type="button" data-testid="showroom-status-one-more" onClick={() => setState(ONE_MORE)}>
          One more frame
        </button>
        <button
          type="button"
          data-testid="showroom-status-fold"
          onClick={() => {
            collapse.tapCount();
            collapse.pointerLeave();
          }}
        >
          Open, then fold
        </button>
      </VStack>
    </HStack>
  );
}

const OPEN_FROM_SIDEBAR = <Text size="sm" color="secondary">Open this state from the sidebar.</Text>;

const PANEL_STATES: { id: string; title: string; note: string; panel: React.JSX.Element }[] = [
  { id: 'sidebar-status-panel', title: 'In the Sidebar, while the agent works', note: 'no line for work in progress: the frame and the chat show it', panel: <InPanel state={WORKING} /> },
  { id: 'sidebar-status-done', title: 'In the Sidebar, done', note: 'two frames changed: the newest, and a count of the other', panel: <InPanel state={DONE} /> },
  { id: 'sidebar-status-several', title: 'In the Sidebar, several changes to one frame', note: 'one line for the frame, naming its first change', panel: <InPanel state={SEVERAL} /> },
  { id: 'sidebar-status-collapsed', title: 'In the Sidebar, collapsed with a count', note: 'three finished frames: one line and “and 2 more”; tap the count to open it', panel: <InPanel state={THREE} frames={BOARD_FRAMES} /> },
  { id: 'sidebar-status-open-three', title: 'In the Sidebar, three frames, open', note: 'one line per frame, newest first, none with a count', panel: <InPanel state={THREE} frames={BOARD_FRAMES} isOpen /> },
  { id: 'sidebar-status-open-five', title: 'In the Sidebar, five lines, open', note: 'no cap: the foot grows up into the Pages list', panel: <InPanel state={FIVE} frames={BOARD_FRAMES} isOpen /> },
  { id: 'sidebar-status-open-seven', title: 'In the Sidebar, seven lines, open', note: 'no cap and no scroll', panel: <InPanel state={SEVEN} frames={BOARD_FRAMES} isOpen /> },
  { id: 'sidebar-status-waiting', title: 'In the Sidebar, waiting on a question', note: 'the waiting line on top, in the agent’s words for what it needs', panel: <InPanel state={ASKING} waiting="question" /> },
  { id: 'sidebar-status-long', title: 'In the Sidebar, a line too long for the panel', note: 'it fades at its right edge and shows its full text on hover', panel: <InPanel state={LONG} /> },
  { id: 'sidebar-status-created-done', title: 'In the Sidebar, a frame the agent added, done', note: 'the added frame, and a count standing for the edited one it came from', panel: <InPanel state={CREATED_DONE} frames={WITH_ARTISAN} /> },
  { id: 'sidebar-status-duplicated', title: 'In the Sidebar, two copies of one frame', note: 'copies keep their source’s name until the agent renames them, so their lines read the same', panel: <InPanel state={DUPLICATED} frames={WITH_COPIES} /> },
  { id: 'sidebar-status-off', title: 'In the Sidebar, the switch off', note: 'rail-foot off: no list, whatever the turn did', panel: <InPanel state={DONE} isOn={false} /> },
];

export const AGENT_STATUS: Category = {
  id: 'status',
  title: 'Agent status',
  stories: [
    {
      id: 'sidebar-status-lines',
      title: 'The status list at the panel’s foot',
      note: 'Studio’s own lines: a parked question waits on the user, a finished turn reads as done, and a line too long for the panel fades at its right edge',
      render: () => <Lines />,
    },
    {
      id: 'sidebar-status-updates',
      title: 'The collapsed line, updating',
      note: 'its buttons swap the first line, add a frame, or open the list and let it fold; only the words beside the count change, and the count slides in once the fold has settled',
      render: () => <Updates />,
    },
    ...PANEL_STATES.map(({ id, title, note, panel }) => ({
      id,
      title,
      note,
      render: (context?: { isIsolated?: boolean }) => (context?.isIsolated ? panel : OPEN_FROM_SIDEBAR),
    })),
  ],
};
