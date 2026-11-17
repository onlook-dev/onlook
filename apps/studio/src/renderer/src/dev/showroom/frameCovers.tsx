import { useLayoutEffect, useState, type ReactNode } from 'react';
import { ReactFlow, ReactFlowProvider } from '@xyflow/react';
import { HStack, VStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { FrameNode } from '../../canvas/frame/FrameNode.js';
import { SetupFailureCardView } from '../../canvas/SetupFailureCard.js';
import type { SetupFailureCard } from '../../canvas/failureCentre.js';
import { FrameCover, type CoverBand } from '../../canvas/frame/FrameCover.js';
import { shownOverFrame, type FrameShownFacts } from '@studio/events';
import { frameCover, type CoverState } from '../../canvas/frame/coverState.js';
import { seedFlags } from '../../flags/store.js';
import { useAgentStore } from '../../agent/store.js';
import { useFrameZoomStyle } from '../../canvas/frame/useFrameZoomStyle.js';
import { noop, type Category } from './Showroom.js';

const HOME = 'http://localhost:4700/';
const FAILURE = { url: 'http://localhost:4700/menu', code: -6, description: 'ERR_FILE_NOT_FOUND' };

const HEALTHY: FrameShownFacts = {
  health: 'live',
  cover: undefined,
  serverLive: true,
  serverStarting: false,
  loadFailed: false,
  quote: undefined,
  turnRunning: false,
};

const FACTS: Record<CoverState, Partial<FrameShownFacts>> = {
  'agent-starting': { cover: 'non-started', serverStarting: true },
  'studio-starting': { cover: 'dead', serverStarting: true },
  'not-started': { cover: 'non-started' },
  stopped: { cover: 'dead' },
  nothing: { health: 'unreachable', serverLive: false },
  'page-failed': { health: 'unreachable', loadFailed: true },
  'own-server': { cover: 'users-own' },
  'port-taken': { cover: 'occupied' },
  container: { cover: 'container' },
};

const STATES = Object.keys(FACTS) as CoverState[];

const BAND_SIZE: Record<CoverBand, { width: number; height: number }> = {
  full: { width: 640, height: 400 },
  plain: { width: 400, height: 240 },
  short: { width: 240, height: 200 },
  title: { width: 170, height: 120 },
  art: { width: 100, height: 70 },
};

function Cover({ state, width, height, canAsk = true }: { state: CoverState; width: number; height: number; canAsk?: boolean }): React.JSX.Element {
  const shows = frameCover(shownOverFrame({ ...HEALTHY, ...FACTS[state] }), { hasLoaded: true, canAsk, startedBy: state === 'studio-starting' ? 'studio' : 'agent' });
  return (
    <VStack gap={1}>
      <Text size="sm" color="secondary">{state}</Text>
      <div style={{ position: 'relative', width, height, flex: '0 0 auto', overflow: 'hidden', border: 'var(--border-width) solid var(--color-border)' }}>
        {shows.kind === 'cover' && <FrameCover cover={shows.cover} actions={shows.actions} width={width} height={height} url={HOME} homeUrl={HOME} failure={FAILURE} onAction={noop} />}
      </div>
    </VStack>
  );
}

function bandStory(band: CoverBand) {
  const { width, height } = BAND_SIZE[band];
  return {
    id: `canvas-frame-covers-${band}`,
    title: `Frame covers, ${band} band (${String(width)}×${String(height)} on screen)`,
    render: () => (
      <div data-testid={`canvas-frame-covers-${band}`} style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'start', width: 4 * width + 3 * 16 + 48, padding: 24, boxSizing: 'border-box', background: 'var(--studio-ground)' }}>
        {STATES.map((state) => <Cover key={state} state={state} width={width} height={height} />)}
      </div>
    ),
  };
}

function CoversOn({ children }: { children: ReactNode }): React.JSX.Element | null {
  const [ready, setReady] = useState(false);
  useLayoutEffect(() => {
    seedFlags({ 'frame-covers': true });
    useAgentStore.setState({ hasSession: true, connection: { status: 'ok' } });
    setReady(true);
  }, []);
  return ready ? <>{children}</> : null;
}

function FrameZoom(): null {
  useFrameZoomStyle();
  return null;
}

const DESK = { width: 1512, height: 982 };
const PHONE = { width: 402, height: 874 };
const GAP = 120;
const ROW = DESK.height + 2 * GAP;
const PAGES = [
  [{ name: 'Home', path: '' }, { name: 'Menu', path: 'menu' }, { name: 'Shop', path: 'shop' }, { name: 'About', path: 'about' }],
  [{ name: 'Journal', path: 'journal' }, { name: 'Product', path: 'product' }, { name: 'Home', path: '', phone: true }],
];
const SPAN = { width: 4 * DESK.width + 3 * GAP, height: DESK.height + ROW };
const CANVAS = { width: 814, height: 856 };
const FIT = Math.min((CANVAS.width - 96) / SPAN.width, (CANVAS.height - 96 - 56 - 80) / SPAN.height);

function frameNode(id: string, name: string, path: string, x: number, y: number, size: { width: number; height: number }) {
  const url = `${HOME}${path}`;
  return {
    id,
    type: 'frame',
    position: { x, y },
    style: size,
    data: { name, homeUrl: url, currentUrl: url, health: 'unreachable' as const, serverCover: 'dead' as const, title: name, canGoBack: false, canGoForward: false },
  };
}

const SEVEN = PAGES.flatMap((row, r) =>
  row.map((page, c) => {
    const size = 'phone' in page ? PHONE : DESK;
    return frameNode(`cover-${String(r)}-${String(c)}`, page.name, page.path, c * (DESK.width + GAP), r * ROW + DESK.height - size.height, size);
  }),
);

function Canvas({ id, nodes, zoom, at, box = CANVAS }: { id: string; nodes: ReturnType<typeof frameNode>[]; zoom: number; at: { x: number; y: number }; box?: { width: number; height: number } }): React.JSX.Element {
  return (
    <CoversOn>
      <div data-testid={id} style={{ ...box, flex: '0 0 auto', overflow: 'hidden', background: 'var(--studio-ground)' }}>
        <ReactFlowProvider>
          <ReactFlow nodes={nodes} nodeTypes={{ frame: FrameNode }} defaultViewport={{ ...at, zoom }} minZoom={0.02} maxZoom={4} proOptions={{ hideAttribution: true }}><FrameZoom /></ReactFlow>
        </ReactFlowProvider>
      </div>
    </CoversOn>
  );
}

const centred = (zoom: number) => ({ x: (CANVAS.width - SPAN.width * zoom) / 2, y: (CANVAS.height - SPAN.height * zoom) / 2 });

const smallBandsStory = {
  id: 'canvas-frame-covers-small',
  title: 'Frame covers, title and art bands',
  render: () => (
    <VStack gap={4} data-testid="canvas-frame-covers-small" style={{ width: 'fit-content', padding: 24, background: 'var(--studio-ground)' }}>
      {(['title', 'art'] as const).map((band) => (
        <HStack key={band} gap={4} align="start">
          {STATES.map((state) => <Cover key={state} state={state} {...BAND_SIZE[band]} />)}
        </HStack>
      ))}
    </VStack>
  ),
};

const FAILURE_CARDS: readonly SetupFailureCard[] = [
  { step: 'install', cause: 'install' },
  { step: 'start', cause: 'start' },
  { step: 'start', cause: 'ready' },
];

const setupFailureCardStory = {
  id: 'canvas-setup-failure-card',
  title: 'Setup failure card, for each cause',
  render: () => (
    <VStack gap={6} data-testid="canvas-setup-failure-card" style={{ width: 'fit-content', padding: 48, background: 'var(--studio-ground)' }}>
      {FAILURE_CARDS.map((card) => (
        <VStack key={card.cause} gap={1}>
          <Text size="sm" color="secondary">{card.cause}</Text>
          <SetupFailureCardView card={card} onAsk={noop} />
        </VStack>
      ))}
    </VStack>
  ),
};

export const FRAME_COVERS: Category = {
  id: 'covers',
  title: 'Frame covers',
  stories: [
    ...(['full', 'plain', 'short', 'title', 'art'] as const).map(bandStory),
    smallBandsStory,
    setupFailureCardStory,
    {
      id: 'canvas-frame-covers-no-agent',
      title: 'Frame covers with no agent connected',
      note: 'the ask is left out, with no line in its place',
      render: () => (
        <HStack gap={4} align="start" data-testid="canvas-frame-covers-no-agent" style={{ width: 'fit-content', background: 'var(--studio-ground)', padding: 'var(--spacing-6)' }}>
          {(['not-started', 'stopped', 'nothing'] as const).map((state) => <Cover key={state} state={state} {...BAND_SIZE.full} canAsk={false} />)}
        </HStack>
      ),
    },
    {
      id: 'canvas-frame-covers-seven-fit',
      title: 'Seven frames on one stopped server, zoomed to fit',
      render: () => <Canvas id="canvas-frame-covers-seven-fit" nodes={SEVEN} zoom={FIT} at={centred(FIT)} />,
    },
    {
      id: 'canvas-frame-covers-seven-out',
      title: 'Seven frames on one stopped server, zoomed out',
      render: () => <Canvas id="canvas-frame-covers-seven-out" nodes={SEVEN} zoom={0.06} at={centred(0.06)} />,
    },
    {
      id: 'canvas-frame-covers-seven-work',
      title: 'Seven frames on one stopped server, at a working zoom',
      render: () => <Canvas id="canvas-frame-covers-seven-work" nodes={SEVEN} zoom={0.3} at={{ x: 56, y: 130 }} />,
    },
    {
      id: 'canvas-frame-covers-giant',
      title: 'One stopped frame at the largest zoom, content grown',
      render: () => <Canvas id="canvas-frame-covers-giant" nodes={[frameNode('cover-giant', 'Home', '', 0, 0, DESK)]} zoom={0.9} at={{ x: 25, y: 60 }} box={{ width: 1411, height: 976 }} />,
    },
  ],
};
