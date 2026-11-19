import { useLayoutEffect, useState } from 'react';
import { HStack, VStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { SHIMMER_SWEEP_MS } from '@studio/chat-ui';
import { DEFAULT_NOTIFICATIONS, type CanvasDoc, type CanvasNode } from '@studio/events';

import {
  ARTIFACT_NODE_TYPE,
  FRAME_NODE_TYPE,
  IMAGE_NODE_TYPE,
  SECTION_NODE_TYPE,
  TEXT_NODE_TYPE,
  type CanvasFlowNode,
} from '../../canvas/model.js';
import { defaultOverlay } from '../../canvas/readModel.js';
import { useCanvasStore } from '../../canvas/store.js';
import { useAgentStore } from '../../agent/store.js';
import { agentStatusReducer, INITIAL_AGENT_STATUS, type AgentStatusAction, type AgentStatusState } from '../../agentStatus/lines.js';
import { useAgentStatusStore } from '../../agentStatus/store.js';
import { useProjectCreateStore } from '../../create/projectCreate.js';
import { seedFlags } from '../../flags/store.js';
import { Sidebar } from '../../sidebar/Sidebar.js';
import { InspireTipCard } from '../../sidebar/InspireTip.js';
import { useInspireTipStore } from '../../sidebar/footSeat.js';
import { resetTipBeats, startTipBeat } from '../../sidebar/footStore.js';
import { PromptTipCard } from '../../sidebar/PromptTip.js';
import { ScrollTipCard } from '../../sidebar/ScrollTip.js';
import { useSettingsStore } from '../../settings/store.js';
import { useWorkspaceStore } from '../../workspace/store.js';
import type { Category, Gallery } from './Showroom.js';
import { AGENT_STATUS } from './agentStatus.js';
import { SIDEBAR_RECOVERY } from './sidebarRecovery.js';

const PANEL = {
  width: 259,
  height: 320,
  flex: '0 0 auto',
  overflow: 'hidden',
  border: 'var(--border-width) solid var(--color-border)',
  borderRadius: 'var(--radius-element)',
  background: 'var(--studio-ground)',
} as const;

/** One of every kind the row can be. */
const ROWS: { name: string; homeUrl: string }[] = [
  { name: 'Home', homeUrl: 'http://localhost:4321/' },
  { name: 'Pricing', homeUrl: 'http://localhost:4321/pricing' },
  { name: 'Pricing — dense', homeUrl: 'http://localhost:4321/pricing/dense.html' },
  { name: 'Checkout', homeUrl: 'http://localhost:4321/checkout?step=2' },
  { name: 'Empty states', homeUrl: 'http://localhost:4321/kitchen-sink.html#empty' },
  { name: 'A very long design name that runs past the panel edge', homeUrl: 'http://localhost:4321/long' },
];

/** The store is module-global and every story here shares it, so all stories seed the same state. */
const STILL_SELECTED_INDEX = 2;
const STILL_WORKING_INDEX = 1;

function seed({ selectedIndex, workingIndex }: { selectedIndex: number; workingIndex: number }): void {
  useCanvasStore.setState({
    nodes: ROWS.map((row, index) => ({
      id: `still-${String(index)}`,
      type: 'frame',
      position: { x: 0, y: 0 },
      selected: index === selectedIndex,
      data: {
        homeUrl: row.homeUrl,
        name: row.name,
        currentUrl: row.homeUrl,
        health: 'live',
        title: row.name,
        canGoBack: false,
        canGoForward: false,
        working: index === workingIndex,
      },
    })) as ReturnType<typeof useCanvasStore.getState>['nodes'],
  });
}

/**
 * Every label source the list can reach: a given name, a label's own string, a
 * picture's filename, the two catalogue fallbacks, and one title held twice.
 */
const MIXED: CanvasFlowNode[] = [
  {
    id: 'mixed-artifact',
    type: ARTIFACT_NODE_TYPE,
    position: { x: 0, y: 0 },
    width: 480,
    height: 640,
    zIndex: 7,
    data: { artifactId: '3f9c1d20-0000-4000-8000-000000000001', title: 'Pricing', name: '' },
  },
  {
    id: 'mixed-artifact-twin',
    type: ARTIFACT_NODE_TYPE,
    position: { x: 0, y: 0 },
    width: 480,
    height: 640,
    zIndex: 6,
    data: { artifactId: 'b71e4a55-0000-4000-8000-000000000002', title: 'Pricing', name: '' },
  },
  {
    id: 'mixed-image',
    type: IMAGE_NODE_TYPE,
    position: { x: 0, y: 0 },
    width: 320,
    height: 200,
    zIndex: 5,
    data: { imageId: 'blob-1', name: 'hero-shot@2x.png', originalWidth: 1280, originalHeight: 800 },
  },
  {
    id: 'mixed-image-pasted',
    type: IMAGE_NODE_TYPE,
    position: { x: 0, y: 0 },
    width: 320,
    height: 200,
    zIndex: 4,
    data: { imageId: 'blob-2', name: '', originalWidth: 640, originalHeight: 400 },
  },
  {
    id: 'mixed-text',
    type: TEXT_NODE_TYPE,
    position: { x: 0, y: 0 },
    width: 480,
    height: 38,
    zIndex: 3,
    selected: true,
    data: { text: 'Everything about this flow needs to feel calmer', size: 'medium', name: '' },
  },
  {
    id: 'mixed-text-named',
    type: TEXT_NODE_TYPE,
    position: { x: 0, y: 0 },
    width: 480,
    height: 38,
    zIndex: 2,
    data: { text: 'Second draft of the headline', size: 'small', name: 'Headline' },
  },
  {
    id: 'mixed-text-empty',
    type: TEXT_NODE_TYPE,
    position: { x: 0, y: 0 },
    width: 480,
    height: 38,
    zIndex: 1,
    data: { text: '', size: 'medium', name: '' },
  },
  {
    id: 'mixed-frame',
    type: FRAME_NODE_TYPE,
    position: { x: 0, y: 0 },
    width: 1280,
    height: 800,
    zIndex: 0,
    data: {
      homeUrl: 'http://localhost:4321/checkout',
      name: 'Checkout',
      currentUrl: 'http://localhost:4321/checkout',
      health: 'live',
      title: 'Checkout',
      canGoBack: false,
      canGoForward: false,
    },
  },
];

/* One list for the whole gallery — the sidebar reads the module-global canvas
   store, so a story that seeds its own takes every other story's with it. */
const PAGES_SEED = [
  'Checkout',
  'Cart',
  '---',
  'Settings',
  'Billing',
  'Invoices',
  'Receipts',
  'Tax',
  '---',
  'Marketing site',
  'Docs',
  'Changelog',
  'Blog',
  'Blog — post',
  'Careers',
  'Pricing',
  'Pricing — annual',
  'Compare',
  '---',
  'Onboarding',
  'Sign in',
  'Sign up',
  'Reset password',
  'Verify email',
  'Two-factor',
  '---',
  'Dashboard',
  'Dashboard — empty',
  'Reports',
  'Usage',
  'Team',
  'Permissions',
  'Integrations',
  'Webhooks',
  'Audit log',
  'A very long page name that runs past the panel edge',
];

/** The one flow-node-to-document translation both seeds use; the menu and the grouping read the document, not the flow nodes. */
function docNode(node: CanvasFlowNode, order: number): CanvasNode {
  const box = {
    id: node.id,
    pageId: 'pg_main',
    x: node.position.x,
    y: node.position.y,
    width: node.width ?? 0,
    height: node.height ?? 0,
    order,
  };
  switch (node.type) {
    case SECTION_NODE_TYPE:
      return { ...box, kind: 'section', name: node.data.name, content: {} };
    case TEXT_NODE_TYPE:
      return { ...box, kind: 'text', name: node.data.name, content: { text: node.data.text, size: node.data.size } };
    case IMAGE_NODE_TYPE:
      return {
        ...box,
        kind: 'image',
        name: node.data.name,
        content: {
          imageId: node.data.imageId,
          name: node.data.name,
          originalWidth: node.data.originalWidth,
          originalHeight: node.data.originalHeight,
        },
      };
    case ARTIFACT_NODE_TYPE:
      return { ...box, kind: 'artifact', name: node.data.name, content: { artifactId: node.data.artifactId, title: node.data.title } };
    case FRAME_NODE_TYPE:
      return { ...box, kind: 'browser', name: node.data.name, content: { homeUrl: node.data.homeUrl } };
  }
}

function mixedDoc(): CanvasDoc {
  const nodes: Record<string, CanvasNode> = {};
  /* Every MIXED node sits at the origin: this seed is about labels and glyphs, and real positions would group them. */
  MIXED.forEach((node, index) => {
    nodes[node.id] = { ...docNode(node, MIXED.length - index), x: 0, y: 0 };
  });
  return {
    schemaVersion: 1,
    docId: 'showroom',
    revision: 1,
    pages: Object.fromEntries(
      PAGES_SEED.map((name, order) => {
        const id = order === 0 ? 'pg_main' : `pg_${String(order)}`;
        return [id, { id, name, order }];
      }),
    ),
    nodes,
  };
}

function EveryKind(): React.JSX.Element {
  useLayoutEffect(() => {
    useCanvasStore.setState({
      nodes: MIXED,
      doc: mixedDoc(),
      currentPageId: 'pg_main',
      selectedNodeIds: ['mixed-text'],
    });
  }, []);
  return (
    <div style={PANEL} data-testid="showroom-designs-kinds">
      <Sidebar />
    </div>
  );
}

/** A frame on Settings, so one page row signals work the user is not looking at (ONL-2488). */
const AWAY_FRAME_ID = 'away-frame';
const AWAY_PAGE_ID = 'pg_3';

function PagesAndDesigns(): React.JSX.Element {
  useLayoutEffect(() => {
    const doc = mixedDoc();
    const away: CanvasNode = {
      id: AWAY_FRAME_ID,
      pageId: AWAY_PAGE_ID,
      kind: 'browser',
      name: 'Plan picker',
      x: 0,
      y: 0,
      width: 1280,
      height: 800,
      order: 0,
      content: { homeUrl: 'http://localhost:4321/settings/plan' },
    };
    doc.nodes[AWAY_FRAME_ID] = away;
    useCanvasStore.setState({
      nodes: MIXED,
      doc,
      currentPageId: 'pg_main',
      selectedNodeIds: [],
      overlay: {
        [AWAY_FRAME_ID]: { ...defaultOverlay(away), working: true },
      },
    });
  }, []);
  return (
    <HStack gap={4} vAlign="start">
      <div style={{ ...PANEL, height: 420 }} data-testid="showroom-sidebar-pages">
        <Sidebar />
      </div>
      <div style={{ ...PANEL, height: 1100 }} data-testid="showroom-sidebar-pages-tall">
        <Sidebar />
      </div>
    </HStack>
  );
}

function DesignsList(): React.JSX.Element {
  /* Switchable, because entering the working state is what swaps the label's node (ONL-2650). */
  const [isWorking, setIsWorking] = useState(true);
  /* Seeding during render writes another component's store mid-commit. */
  useLayoutEffect(() => {
    seed({ selectedIndex: STILL_SELECTED_INDEX, workingIndex: isWorking ? STILL_WORKING_INDEX : -1 });
  }, [isWorking]);
  return (
    <VStack gap={2}>
      <button
        type="button"
        data-testid="showroom-toggle-working"
        onClick={() => {
          setIsWorking((value) => !value);
        }}
      >
        {isWorking ? 'Stop working' : 'Start working'}
      </button>
      <div style={PANEL} data-testid="showroom-designs-list">
        <Sidebar />
      </div>
    </VStack>
  );
}

/** A Section holding two explorations and a nested Section, beside an object no Section holds; positions decide the children's order, not this array (ONL-2661). */
const GROUPED: CanvasFlowNode[] = [
  {
    id: 'grouped-frame',
    type: FRAME_NODE_TYPE,
    position: { x: 1400, y: 0 },
    width: 400,
    height: 300,
    zIndex: 5,
    data: {
      homeUrl: 'http://localhost:4321/checkout',
      name: 'Checkout',
      currentUrl: 'http://localhost:4321/checkout',
      health: 'live',
      title: 'Checkout',
      canGoBack: false,
      canGoForward: false,
    },
  },
  {
    id: 'grouped-option-b',
    type: ARTIFACT_NODE_TYPE,
    position: { x: 360, y: 80 },
    width: 240,
    height: 240,
    zIndex: 4,
    data: { artifactId: '3f9c1d20-0000-4000-8000-00000000000b', title: 'Venue tiles — Option B', name: '' },
  },
  {
    id: 'grouped-option-a',
    type: ARTIFACT_NODE_TYPE,
    position: { x: 60, y: 80 },
    width: 240,
    height: 240,
    zIndex: 3,
    data: { artifactId: '3f9c1d20-0000-4000-8000-00000000000a', title: 'Venue tiles — Option A', name: '' },
  },
  {
    id: 'grouped-note',
    type: TEXT_NODE_TYPE,
    position: { x: 80, y: 420 },
    width: 200,
    height: 40,
    zIndex: 2,
    data: { text: 'Tighter grid, same tile', size: 'small', name: '' },
  },
  {
    id: 'grouped-dense',
    type: SECTION_NODE_TYPE,
    position: { x: 40, y: 380 },
    width: 500,
    height: 180,
    zIndex: -1,
    data: { name: 'Dense variants' },
  },
  {
    id: 'grouped-venue',
    type: SECTION_NODE_TYPE,
    position: { x: 0, y: 0 },
    width: 800,
    height: 600,
    zIndex: -2,
    data: { name: 'Venue tile explorations' },
  },
];

function groupedDoc(): CanvasDoc {
  const nodes: Record<string, CanvasNode> = {};
  GROUPED.forEach((node, index) => {
    nodes[node.id] = docNode(node, GROUPED.length - index);
  });
  return {
    schemaVersion: 1,
    docId: 'showroom-grouped',
    revision: 1,
    pages: { pg_main: { id: 'pg_main', name: 'Explorations', order: 0 } },
    nodes,
  };
}

function GroupedDesigns({ closedSectionIds }: { closedSectionIds: string[] }): React.JSX.Element {
  useLayoutEffect(() => {
    useCanvasStore.setState({
      nodes: GROUPED,
      doc: groupedDoc(),
      currentPageId: 'pg_main',
      selectedNodeIds: [],
      closedSectionIds,
    });
  }, [closedSectionIds]);
  return (
    <div style={{ ...PANEL, height: 420 }} data-testid="showroom-designs-grouped">
      <Sidebar />
    </div>
  );
}

const OPEN_GROUPS: string[] = [];
const CLOSED_GROUPS = ['grouped-venue'];

/** A negative delay on a paused animation picks the frozen point. */
const PHASES = [0, 0.25, 0.5, 0.75];

const FROZEN_STYLE = `
[data-still-phase] .studio-shimmer-clone::after,
[data-still-phase] .design-row-icon[data-working] {
  animation-play-state: paused;
}
${PHASES.map(
  (fraction) => `
[data-still-phase='${String(fraction)}'] .studio-shimmer-clone::after,
[data-still-phase='${String(fraction)}'] .design-row-icon[data-working] {
  animation-delay: ${String(-fraction * SHIMMER_SWEEP_MS)}ms;
}`,
).join('')}
`;

function FrozenSweep(): React.JSX.Element {
  useLayoutEffect(() => {
    seed({ selectedIndex: STILL_SELECTED_INDEX, workingIndex: STILL_WORKING_INDEX });
  }, []);
  return (
    <>
      <style href="showroom-sidebar-frozen" precedence="medium">
        {FROZEN_STYLE}
      </style>
      <VStack gap={3}>
        {PHASES.map((fraction) => (
          <HStack key={fraction} gap={4} vAlign="center">
            <Text type="supporting" color="secondary" style={{ width: 96 }}>
              {`${String(Math.round(fraction * SHIMMER_SWEEP_MS))}ms`}
            </Text>
            {/* Scaled on a wrapper so the row lays out at real size. */}
            <div style={{ width: 259 * 3, height: 23 * 3, overflow: 'hidden', flex: '0 0 auto' }}>
              <div
                data-still-phase={String(fraction)}
                style={{ width: 259, transform: 'scale(3)', transformOrigin: 'top left' }}
              >
                <div style={{ background: 'var(--studio-ground)' }}>
                  <Sidebar />
                </div>
              </div>
            </div>
          </HStack>
        ))}
      </VStack>
    </>
  );
}

const DESIGNS: Category = {
  id: 'designs',
  title: 'Designs list',
  stories: [
    {
      id: 'sidebar-designs-list',
      title: 'The list',
      note: 'an artifact selected (blue), a served row working, and a name past the panel edge',
      render: () => <DesignsList />,
    },
    {
      id: 'sidebar-designs-kinds',
      title: 'One of every kind',
      note: 'the glyph says the kind; the selected row shows the menu chip; the last three rows are a picture with no filename, an unwritten label, and a label that was renamed',
      render: () => <EveryKind />,
    },
    {
      id: 'sidebar-sections-open',
      title: 'A Section and what it holds',
      note: 'the caret sits left of the Section glyph, children indent under it in Canvas reading order — top to bottom, then left to right — and the nested Section carries its own caret. Only the object no Section holds can be dragged to reorder',
      render: (context) =>
        context?.isIsolated
          ? <GroupedDesigns closedSectionIds={OPEN_GROUPS} />
          : <Text size="sm" color="secondary">Open this state from the sidebar.</Text>,
    },
    {
      id: 'sidebar-sections-closed',
      title: 'A Section put away',
      note: 'the caret turns and the Section keeps its own row; everything it holds, the nested Section included, is hidden',
      render: (context) =>
        context?.isIsolated
          ? <GroupedDesigns closedSectionIds={CLOSED_GROUPS} />
          : <Text size="sm" color="secondary">Open this state from the sidebar.</Text>,
    },
    {
      id: 'sidebar-working-sweep',
      title: 'The working row, one sweep frozen at four points',
      note: 'the label travels, the glyph pulses, both on the same period and stagger — a still cannot show this, so the cycle is laid out as a strip',
      render: () => <FrozenSweep />,
    },
  ],
};

const PAGES: Category = {
  id: 'pages',
  title: 'Pages',
  stories: [
    {
      id: 'sidebar-pages',
      title: 'Pages above designs',
      note: 'one panel with two sections, divided by the project title’s own hairline: the same row height, type and selected ink, the current page marked, and a page named --- drawn as a rule. The list is 36 pages, so both panels cap the section and scroll inside it rather than pushing the designs list away. No row shows its menu chip at rest, the current one included — the chip is a hover',
      render: () => <PagesAndDesigns />,
    },
  ],
};

const TIP_PROJECT = '/showroom/blank-project';
const TIP_FRAMES: CanvasFlowNode[] = [
  {
    id: 'tip-home',
    type: FRAME_NODE_TYPE,
    position: { x: 0, y: 0 },
    width: 1280,
    height: 800,
    zIndex: 0,
    data: { homeUrl: 'http://localhost:4321/', name: 'Home', currentUrl: 'http://localhost:4321/', health: 'live', title: 'Home', canGoBack: false, canGoForward: false },
  },
];
const REWRITING_HOME: AgentStatusState = (
  [
    { type: 'streaming', isStreaming: true, isSetupTurn: false },
    { type: 'frames', frameIds: ['tip-home'], changes: [{ frameId: 'tip-home', done: 'Rewrote', what: 'headline' }] },
  ] satisfies AgentStatusAction[]
).reduce(agentStatusReducer, INITIAL_AGENT_STATUS);

/** A blank project with its inspiration tip unspent; the stores are module-global, so each state opens isolated. */
function TipInPanel({ isWorking, isInstalling = false }: { isWorking: boolean; isInstalling?: boolean }): React.JSX.Element {
  useLayoutEffect(() => {
    const before = useWorkspaceStore.getState().workspace;
    const workspace = { ...before, workspacePath: TIP_PROJECT, origin: 'blank' } as NonNullable<typeof before>;
    seedFlags({ 'blank-first-moment': true, 'rail-foot': true });
    useWorkspaceStore.setState({ workspace });
    useInspireTipStore.setState({ phases: { [TIP_PROJECT]: 'open' } });
    useCanvasStore.setState({ nodes: TIP_FRAMES, currentPageId: 'pg_main', selectedNodeIds: [] });
    useAgentStore.setState({ isStreaming: isWorking });
    useAgentStatusStore.setState({ status: isWorking ? REWRITING_HOME : INITIAL_AGENT_STATUS, waiting: undefined });
    useProjectCreateStore.setState({ state: isInstalling ? { kind: 'installing', workspace } : null });
    return () => {
      useWorkspaceStore.setState({ workspace: before });
      useAgentStore.setState({ isStreaming: false });
      useAgentStatusStore.setState({ status: INITIAL_AGENT_STATUS, waiting: undefined });
      useProjectCreateStore.setState({ state: null });
    };
  }, [isWorking, isInstalling]);
  return (
    <div style={{ ...PANEL, height: 520 }} data-testid="showroom-foot-panel">
      <Sidebar />
    </div>
  );
}

const GROW_PROJECT = '/showroom/grow-project';
const NEVER_MS = 1_000_000_000;

/** A blank project opening with rail-foot on: the Tips pill alone in the foot, then the inspiration tip grows out of it; Not now folds it back. */
function GrowInPanel({ beatMs }: { beatMs: number }): React.JSX.Element {
  const [run, setRun] = useState(0);
  useLayoutEffect(() => {
    const before = useWorkspaceStore.getState().workspace;
    const workspace = { ...before, workspacePath: GROW_PROJECT, origin: 'blank' } as NonNullable<typeof before>;
    seedFlags({ 'blank-first-moment': true, 'rail-foot': true });
    resetTipBeats();
    startTipBeat(GROW_PROJECT, beatMs);
    useWorkspaceStore.setState({ workspace });
    useInspireTipStore.setState({ phases: { [GROW_PROJECT]: 'open' } });
    useCanvasStore.setState({ nodes: [], currentPageId: 'pg_main', selectedNodeIds: [] });
    useAgentStore.setState({ isStreaming: false, needsAttention: false });
    useAgentStatusStore.setState({ status: INITIAL_AGENT_STATUS, waiting: undefined });
    useProjectCreateStore.setState({ state: null });
    return () => {
      resetTipBeats();
      useWorkspaceStore.setState({ workspace: before });
    };
  }, [beatMs, run]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {beatMs === NEVER_MS ? null : (
        <button type="button" onClick={() => setRun((n) => n + 1)} data-testid="showroom-grow-replay">
          Open again
        </button>
      )}
      <div style={{ ...PANEL, height: 520 }} data-testid="showroom-foot-panel">
        <Sidebar />
      </div>
    </div>
  );
}

const INVITE_PROJECT = '/showroom/imported-project';
const INVITE_FRAMES: CanvasFlowNode[] = ['Home', 'Pricing', 'About'].map((name, index) => ({
  id: `invite-${name.toLowerCase()}`,
  type: FRAME_NODE_TYPE,
  position: { x: index * 1400, y: 0 },
  width: 1280,
  height: 800,
  zIndex: 0,
  data: { homeUrl: `http://localhost:4321/${index === 0 ? '' : name.toLowerCase()}`, name, currentUrl: `http://localhost:4321/${index === 0 ? '' : name.toLowerCase()}`, health: 'live', title: name, canGoBack: false, canGoForward: false },
}));
const REWROTE_THREE: AgentStatusState = (
  [
    { type: 'streaming', isStreaming: true, isSetupTurn: false },
    {
      type: 'frames',
      frameIds: INVITE_FRAMES.map((frame) => frame.id),
      changes: [
        { frameId: 'invite-home', done: 'Rewrote', what: 'headline' },
        { frameId: 'invite-pricing', done: 'Restyled', what: 'plan cards' },
        { frameId: 'invite-about', done: 'Tightened', what: 'team grid' },
      ],
    },
    { type: 'streaming', isStreaming: false, isSetupTurn: false },
  ] satisfies AgentStatusAction[]
).reduce(agentStatusReducer, INITIAL_AGENT_STATUS);

/** An imported project on a returning launch, its notification invite pending; `hasLines` is a turn's done lines below it. */
function InviteInPanel({ hasLines }: { hasLines: boolean }): React.JSX.Element {
  useLayoutEffect(() => {
    const before = useWorkspaceStore.getState().workspace;
    const notificationsBefore = useSettingsStore.getState().notifications;
    const workspace = { ...before, workspacePath: INVITE_PROJECT, origin: 'imported' } as NonNullable<typeof before>;
    seedFlags({ 'blank-first-moment': true, 'rail-foot': true, 'invite-tip': true });
    useWorkspaceStore.setState({ workspace });
    useSettingsStore.setState({ notifications: { ...DEFAULT_NOTIFICATIONS, invitation: 'pending' } });
    useCanvasStore.setState({ nodes: INVITE_FRAMES, currentPageId: 'pg_main', selectedNodeIds: [] });
    useAgentStore.setState({ isStreaming: false, needsAttention: false });
    useAgentStatusStore.setState({ status: hasLines ? REWROTE_THREE : INITIAL_AGENT_STATUS, waiting: undefined });
    useProjectCreateStore.setState({ state: null });
    return () => {
      useWorkspaceStore.setState({ workspace: before });
      useSettingsStore.setState({ notifications: notificationsBefore });
      useAgentStatusStore.setState({ status: INITIAL_AGENT_STATUS, waiting: undefined });
    };
  }, [hasLines]);
  return (
    <div style={{ ...PANEL, height: 520 }} data-testid="showroom-foot-panel">
      <Sidebar />
    </div>
  );
}

const TIP_STATES: { id: string; title: string; note: string; panel: React.JSX.Element }[] = [
  { id: 'sidebar-foot-tip-idle', title: 'In the Sidebar, the tip with the agent idle', note: 'the inspiration tip over an empty seat: the status list has no line yet', panel: <TipInPanel isWorking={false} /> },
  { id: 'sidebar-foot-tip-over-status', title: 'In the Sidebar, the tip above the status list', note: 'the agent is working and the tip stays: it sits above the status list, one measured foot', panel: <TipInPanel isWorking /> },
  { id: 'sidebar-foot-tip-over-setup', title: 'In the Sidebar, the tip above setup', note: 'the tip sits above setup’s step bar too', panel: <TipInPanel isWorking={false} isInstalling /> },
  { id: 'sidebar-foot-invite-over-status', title: 'In the Sidebar, the notification invite above the status list', note: 'a returning launch after a turn: the invite sits above the done line, collapsed to one line and "and 2 more"', panel: <InviteInPanel hasLines /> },
  { id: 'sidebar-foot-invite-alone', title: 'In the Sidebar, the notification invite alone', note: 'a returning launch with no status line yet: the invite over an empty seat', panel: <InviteInPanel hasLines={false} /> },
  { id: 'sidebar-foot-grow-pill', title: 'In the Sidebar, the Tips pill during the opening beat', note: 'rail-foot on: a project just opened, so the foot holds only the shimmering Tips pill', panel: <GrowInPanel beatMs={NEVER_MS} /> },
  { id: 'sidebar-foot-grow', title: 'In the Sidebar, a tip grows out of the Tips pill', note: 'after a 1.5s beat (6s in the app) the inspiration tip grows out of the pill; Not now folds it back into the pill; Open again replays', panel: <GrowInPanel beatMs={1_500} /> },
];

const FOOT: Category = {
  id: 'foot',
  title: 'Foot',
  stories: [
    {
      id: 'sidebar-inspire-tip',
      title: 'The inspiration tip',
      note: 'a blank project’s first tip: “Not now” fills the row, “Add inspiration” sits at its own width on the right',
      render: () => (
        <div style={{ width: 259, background: 'var(--color-background-surface)' }}>
          <InspireTipCard onAdd={() => undefined} onLater={() => undefined} />
        </div>
      ),
    },
    {
      id: 'sidebar-scroll-tip',
      title: 'The scroll tip',
      note: 'after the inspiration Frame lands: “Dismiss” fills the row, “Show shortcuts” at its own width beside it',
      render: () => (
        <div style={{ width: 259, background: 'var(--color-background-surface)' }}>
          <ScrollTipCard onShow={() => undefined} onLater={() => undefined} />
        </div>
      ),
    },
    {
      id: 'sidebar-prompt-tip',
      title: 'The prompt tip',
      note: 'an imported project, a while after the next-task cards land unpicked: “Show prompts” is grey so the cards stay the thing to tap',
      render: () => (
        <div style={{ width: 259, background: 'var(--color-background-surface)' }}>
          <PromptTipCard onShow={() => undefined} onLater={() => undefined} />
        </div>
      ),
    },
    {
      id: 'sidebar-prompt-tip-narrow',
      title: 'The prompt tip, too narrow for one row',
      note: 'when the two labels do not fit side by side, “Show prompts” stacks above “Dismiss”, each full width',
      render: () => (
        <div style={{ width: 180, background: 'var(--color-background-surface)' }}>
          <PromptTipCard onShow={() => undefined} onLater={() => undefined} />
        </div>
      ),
    },
    ...TIP_STATES.map(({ id, title, note, panel }) => ({
      id,
      title,
      note,
      render: (context?: { isIsolated?: boolean }) =>
        context?.isIsolated ? panel : <Text size="sm" color="secondary">Open this state from the sidebar.</Text>,
    })),
  ],
};

export const SIDEBAR_GALLERY: Gallery = {
  id: 'sidebar',
  title: 'Sidebar',
  subtitle:
    'The panel’s two sections — the pages of a project, and the designs on the page you are reading.',
  categories: [PAGES, DESIGNS, FOOT, AGENT_STATUS, SIDEBAR_RECOVERY],
};
