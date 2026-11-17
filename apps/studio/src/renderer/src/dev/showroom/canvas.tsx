/**
 * The real `<App/>`, not a reconstruction: furniture components render their own layering.
 * One frame only — `hiddenRails` is module-global, so four mounted editors all read the last write.
 */

import { useEffect, useLayoutEffect, useState } from 'react';
import { ReactFlow, ReactFlowProvider } from '@xyflow/react';
import { Center } from '@astryxdesign/core/Center';
import { HStack, VStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';

import { CANVAS_ARTIFACT_DEFAULT_BOX, CANVAS_TEXT_SIZES, DEFAULT_FRAME_SIZE, type CanvasTextSize } from '@studio/events';

import { App } from '../../App.js';
import { FrameLoadFailedCover, FrameLoadingLabel, FrameNode } from '../../canvas/frame/FrameNode.js';
import { useFrameZoomStyle } from '../../canvas/frame/useFrameZoomStyle.js';
import { FrameIdleThumbnail } from '../../canvas/frame/FrameIdleThumbnail.js';
import { frameRingScale } from '../../canvas/frame/geometry.js';
import {
  ArtifactNodeSurface,
  type ArtifactNodeSurfaceProps,
} from '../../canvas/artifact/ArtifactNode.js';
import {
  ImageNodeSurface,
  type ImageNodeSurfaceProps,
} from '../../canvas/image/ImageNode.js';
import { ImageRefusalBanner } from '../../canvas/image/RefusalBand.js';
import type { ImageRefusalReason } from '../../canvas/image/ingest.js';
import { MAX_FRAME_SIZE, MIN_IMAGE_SIZE } from '../../canvas/model.js';
import { NodeResizeHandles } from '../../canvas/NodeResizeHandles.js';
import { useCanvasStore } from '../../canvas/store.js';
import { TextSizeBarSurface } from '../../canvas/text/SizeBar.js';
import {
  TextNodeSurface,
  type TextNodeSurfaceProps,
} from '../../canvas/text/TextNode.js';
import { Focused, noop, type Category, type Gallery } from './Showroom.js';
import { FrameRecoverySurface } from '../../canvas/frame/FrameRecovery.js';
import { FrameQuote } from '../../canvas/frame/FrameQuote.js';
import { seedFlags } from '../../flags/store.js';
import { CANVAS_SECTIONS } from './canvasSections.js';
import { FRAME_SCROLLBAR } from './frameScrollbar.js';
import { FRAME_COVERS } from './frameCovers.js';
import { READY_CANVAS } from './readyCanvas.js';
import { SelectPreview, PanPreview, FrameToolPreview, SectionToolPreview, ArtifactToolPreview, TextToolPreview, ImageToolPreview, RunPreview } from '../../canvas/toolPreview/illustrations.js';

/** The design's own editor framing, so the band and toolbar sit at real size. */
const SCREEN = {
  position: 'relative',
  width: 1280,
  height: 800,
  flex: '0 0 auto',
  overflow: 'hidden',
  borderRadius: 'var(--radius-page)',
  border: 'var(--border-width) solid var(--color-border)',
  background: 'var(--studio-ground)',
} as const;

type RailState = 'shown' | 'left-hidden' | 'right-hidden' | 'both-hidden' | 'chord';

const STATES: readonly { id: RailState; label: string }[] = [
  { id: 'shown', label: 'Both rails' },
  { id: 'left-hidden', label: 'Left hidden' },
  { id: 'right-hidden', label: 'Right hidden' },
  { id: 'both-hidden', label: 'Both hidden' },
  { id: 'chord', label: '⌘. canvas alone' },
];

/** The presses that reach the state, not a `setState` of the answer: the bug lived in the actions. */
function drive(state: RailState): void {
  useCanvasStore.setState({ hiddenRails: { left: false, right: false }, chromeHidden: false });
  const store = useCanvasStore.getState();
  if (state === 'left-hidden') store.toggleRail('left');
  if (state === 'right-hidden') store.toggleRail('right');
  if (state === 'both-hidden') {
    store.toggleRail('left');
    store.toggleRail('right');
  }
  if (state === 'chord') store.toggleChrome();
}

function EditorFrame(): React.JSX.Element {
  const [state, setState] = useState<RailState>('shown');
  return (
    <VStack gap={3}>
      <HStack gap={2} vAlign="center">
        {STATES.map((option) => (
          <button
            key={option.id}
            type="button"
            data-testid={`canvas-rails-${option.id}`}
            aria-pressed={state === option.id}
            onClick={() => {
              drive(option.id);
              setState(option.id);
            }}
            style={{
              appearance: 'none',
              border: '0.5px solid var(--color-border)',
              borderRadius: 'var(--radius-element)',
              padding: 'var(--spacing-1) var(--spacing-3)',
              font: 'inherit',
              cursor: 'pointer',
              color: 'var(--color-text-primary)',
              background:
                state === option.id ? 'var(--color-background-gray)' : 'transparent',
            }}
          >
            <Text size="sm" color="inherit">
              {option.label}
            </Text>
          </button>
        ))}
      </HStack>
      <div style={SCREEN} data-testid="canvas-screen" data-rails={state}>
        <App onExitToProjects={noop} />
      </div>
    </VStack>
  );
}

const RECOVERY_STORIES =
    ['default', 'hover', 'focus', 'unavailable', 'sending', 'failed', 'restarting', 'compact'].map((state) => ({
      id: `canvas-frame-recovery-${state}`,
      title: `Preview recovery — ${state}`,
      render: () => (
        <Focused selector={state === 'focus' || state === 'hover' ? 'button' : undefined} hover={state === 'hover'}>
          <div style={{ position: 'relative', width: state === 'compact' ? 240 : 480, height: state === 'compact' ? 260 : 380, border: 'var(--border-width) solid var(--color-border)', borderRadius: 'var(--radius-element)', overflow: 'hidden' }}>
            <FrameRecoverySurface detail="Nothing answered at localhost:3000." canAsk={state !== 'unavailable'} sending={state === 'sending'} restarting={state === 'restarting'} failed={state === 'failed'} onAsk={noop} onRestart={noop} />
          </div>
        </Focused>
      ),
    }));

const RAILS: Category = {
  id: 'rails',
  title: 'Rails',
  stories: [
    {
      id: 'canvas-rails',
      title: 'The editor frame',
      note: 'Only ⌘. takes the mode band, toolbar and empty state.',
      render: () => <EditorFrame />,
    },
  ],
};

const TOOL_PREVIEWS: Category = {
  id: 'tool-previews',
  title: 'Tool previews',
  stories: [{
    id: 'tool-previews',
    title: 'Toolbar illustrations',
    render: () => (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 200px)', gap: 16 }}>
        {[
          ['Select', <SelectPreview />], ['Pan', <PanPreview />],
          ['Frame', <FrameToolPreview />], ['Artifact', <ArtifactToolPreview />],
          ['Section', <SectionToolPreview />],
          ['Text', <TextToolPreview />], ['Image', <ImageToolPreview />],
          ['Run', <RunPreview running={false} />], ['Stop', <RunPreview running />],
        ].map(([label, illustration]) => (
          <div key={String(label)} data-tool-preview style={{ padding: 16, borderRadius: 12, background: 'var(--color-background-muted)', border: 'var(--border-width) solid var(--color-border)' }}>
            <Text size="sm">{label}</Text>
            <div data-tpp-pane style={{ marginTop: 12 }}>{illustration}</div>
          </div>
        ))}
      </div>
    ),
  }],
};

const SHORT_QUOTE = 'A portfolio for my photography';
const LONG_QUOTE = 'A landing page for my ceramics studio in Lisbon, with the class schedule, a gallery of recent work, and a way to book a wheel-throwing class';
const OVERLONG_QUOTE = `${LONG_QUOTE}, plus an about page with the story of how the studio started, a shop for the mugs and bowls we sell, and a newsletter sign-up`;
const HERO_QUOTE = 'A hero for the remix feed with the carousel up top and the avatars spaced out properly';
const FULL_QUOTE = 'Made-up data, a polished report for the quarterly review: revenue by region, a churn line chart, four customer quotes, and a one-page summary the team can share';

const QUOTED_FRAMES = [
  { id: 'short', label: 'Short, fitted', quote: SHORT_QUOTE, zoom: 0.45, isBuilding: false, size: DEFAULT_FRAME_SIZE },
  { id: 'long', label: 'Long, fitted', quote: LONG_QUOTE, zoom: 0.45, isBuilding: false, size: DEFAULT_FRAME_SIZE },
  { id: 'far', label: 'Long, zoomed out', quote: LONG_QUOTE, zoom: 0.2, isBuilding: false, size: DEFAULT_FRAME_SIZE },
  { id: 'building', label: 'Long, building', quote: LONG_QUOTE, zoom: 0.45, isBuilding: true, size: DEFAULT_FRAME_SIZE },
  { id: 'clamped', label: 'Past the line limit', quote: OVERLONG_QUOTE, zoom: 0.45, isBuilding: false, size: DEFAULT_FRAME_SIZE },
  { id: 'resized', label: 'Long, in a resized frame', quote: LONG_QUOTE, zoom: 0.45, isBuilding: false, size: { width: 760, height: 560 } },
] as const;

const WIDTH_ZOOM = 0.3;
const QUOTE_WIDTHS = [
  { id: 'width-1512', label: '1512 wide', quote: LONG_QUOTE, zoom: WIDTH_ZOOM, isBuilding: false, size: { width: 1512, height: 982 } },
  { id: 'width-820', label: '820 wide', quote: LONG_QUOTE, zoom: WIDTH_ZOOM, isBuilding: false, size: { width: 820, height: 1180 } },
  { id: 'width-390', label: '390 wide', quote: LONG_QUOTE, zoom: WIDTH_ZOOM, isBuilding: false, size: { width: 390, height: 844 } },
  { id: 'width-390-hero', label: '390 wide, an 86-character brief', quote: HERO_QUOTE, zoom: WIDTH_ZOOM, isBuilding: false, size: { width: 390, height: 844 } },
  { id: 'width-390-short', label: '390 wide, short', quote: SHORT_QUOTE, zoom: WIDTH_ZOOM, isBuilding: false, size: { width: 390, height: 844 } },
] as const;

const FULL_ZOOM = 0.5;
const QUOTE_FITS = [
  { id: 'full-1512', label: '1512 × 982, a full brief', quote: FULL_QUOTE, zoom: FULL_ZOOM, isBuilding: false, size: DEFAULT_FRAME_SIZE },
  { id: 'full-artifact', label: '480 × 640, the artifact default, a full brief', quote: FULL_QUOTE, zoom: FULL_ZOOM, isBuilding: false, size: CANVAS_ARTIFACT_DEFAULT_BOX },
  { id: 'full-390', label: '390 × 844, a full brief', quote: FULL_QUOTE, zoom: FULL_ZOOM, isBuilding: false, size: { width: 390, height: 844 } },
  { id: 'full-wide', label: '1512 × 400, a full brief', quote: FULL_QUOTE, zoom: FULL_ZOOM, isBuilding: false, size: { width: 1512, height: 400 } },
] as const;

const QUOTE_GROUNDS = [
  { id: 'desktop', label: '1512 × 982 frame, canvas zoom 0.5', quote: LONG_QUOTE, size: DEFAULT_FRAME_SIZE, zoom: 0.5 },
  { id: 'artifact', label: '480 × 640 artifact, a full brief, canvas zoom 0.8', quote: FULL_QUOTE, size: CANVAS_ARTIFACT_DEFAULT_BOX, zoom: 0.8 },
  { id: 'phone', label: '390 × 844 frame, a full brief, canvas zoom 0.8', quote: FULL_QUOTE, size: { width: 390, height: 844 }, zoom: 0.8 },
  { id: 'wide', label: '1512 × 400 frame, a full brief, canvas zoom 0.5', quote: FULL_QUOTE, size: { width: 1512, height: 400 }, zoom: 0.5 },
  { id: 'gone', label: '480 × 640 artifact, canvas zoom 0.4: too small to read', quote: FULL_QUOTE, size: CANVAS_ARTIFACT_DEFAULT_BOX, zoom: 0.4 },
] as const;

function QuoteOnGround({ id, label, quote, size, zoom }: (typeof QUOTE_GROUNDS)[number]): React.JSX.Element {
  return (
    <VStack gap={1}>
      <Text size="sm" color="secondary">{label}</Text>
      <div data-testid={`canvas-frame-quote-ground-${id}`} style={{ position: 'relative', width: size.width * zoom, height: size.height * zoom, flex: '0 0 auto', overflow: 'hidden', border: 'var(--border-width) solid var(--color-border)' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, ...size, transform: `scale(${String(zoom)})`, transformOrigin: '0 0' }}>
          <FrameQuote quote={quote} isBuilding={false} width={size.width} height={size.height} canvasZoom={zoom} />
        </div>
      </div>
    </VStack>
  );
}

/** A Showroom launch never hears main's flag answer, so the brief's flag is seeded on (ONL-2960). */
function CoversOn({ children }: { children: React.ReactNode }): React.JSX.Element {
  useLayoutEffect(() => {
    seedFlags({ 'frame-covers': true });
  }, []);
  return <>{children}</>;
}

function QuotedFrame({ id, label, quote, zoom, isBuilding, size }: (typeof QUOTED_FRAMES)[number] | (typeof QUOTE_WIDTHS)[number] | (typeof QUOTE_FITS)[number]): React.JSX.Element {
  const { width, height } = size;
  return (
    <VStack gap={1}>
      <Text size="sm" color="secondary">{label}</Text>
      <div data-testid={`canvas-frame-quote-${id}`} style={{ position: 'relative', width: width * zoom, height: height * zoom, flex: '0 0 auto', overflow: 'hidden', border: 'var(--border-width) solid var(--color-border)' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width, height, transform: `scale(${String(zoom)})`, transformOrigin: '0 0' }}>
          <FrameQuote quote={quote} isBuilding={isBuilding} width={width} height={height} canvasZoom={zoom} />
        </div>
      </div>
    </VStack>
  );
}

/** A stand-in for the built page: in the app it is the frame's own webview, mounted under the quote the whole time. */
function BuiltPage(): React.JSX.Element {
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#f4efe6', color: '#2a211a', padding: 120, fontFamily: 'Georgia, serif' }}>
      <div style={{ fontSize: 28, letterSpacing: 4, textTransform: 'uppercase' }}>Barro Studio · Lisbon</div>
      <div style={{ fontSize: 120, lineHeight: 1.05, marginTop: 80, maxWidth: 1100 }}>Throw your first bowl this Saturday</div>
      <div style={{ marginTop: 60, display: 'inline-block', background: '#2a211a', color: '#f4efe6', padding: '28px 48px', fontSize: 32, borderRadius: 999 }}>Book a wheel class</div>
    </div>
  );
}

const LIFT_ZOOM = 0.5;

function LiftingQuote(): React.JSX.Element {
  const [quote, setQuote] = useState<string | undefined>(LONG_QUOTE);
  const { width, height } = DEFAULT_FRAME_SIZE;
  return (
    <VStack gap={2} style={{ background: 'var(--studio-ground)', padding: 'var(--spacing-6)' }}>
      <HStack gap={2}>
        <button type="button" data-testid="canvas-frame-quote-lift-toggle" onClick={() => setQuote((current) => (current === undefined ? LONG_QUOTE : undefined))}>
          {quote === undefined ? 'Place the quote again' : 'Lift the quote'}
        </button>
      </HStack>
      <div data-testid="canvas-frame-quote-lift-frame" style={{ position: 'relative', width: width * LIFT_ZOOM, height: height * LIFT_ZOOM, overflow: 'hidden', border: 'var(--border-width) solid var(--color-border)' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width, height, transform: `scale(${String(LIFT_ZOOM)})`, transformOrigin: '0 0' }}>
          <BuiltPage />
          <FrameQuote quote={quote} isBuilding={false} width={width} height={height} canvasZoom={LIFT_ZOOM} />
        </div>
      </div>
    </VStack>
  );
}

const TITLE_CENTRE_FRAMES = [
  { id: 'title-history', title: 'Design lab', url: 'about:blank', width: 600, canGoBack: true, canGoForward: true },
  { id: 'title-back', title: 'Design lab', url: 'about:blank', width: 600, canGoBack: true, canGoForward: false },
  { id: 'title-reload', title: 'Design lab', url: 'about:blank', width: 600, canGoBack: false, canGoForward: false },
  { id: 'title-long', title: 'Design lab — the quarterly planning board with every team’s roadmap, launch dates and open questions', url: 'about:blank', width: 600, canGoBack: true, canGoForward: true },
  { id: 'title-url', title: '', url: 'http://localhost:3000/dashboard', width: 600, canGoBack: true, canGoForward: true },
  { id: 'title-long-url', title: '', width: 600, canGoBack: true, canGoForward: true, url: 'http://localhost:3000/dashboard/projects/quarterly-planning/roadmap?team=design&view=board&sort=launch' },
  { id: 'title-narrow', title: 'Design lab — the quarterly planning board', url: 'about:blank', width: 320, canGoBack: true, canGoForward: true },
] as const;

const FRAME: Category = {
  id: 'frame',
  title: 'Frame',
  stories: [
    ...[0.1, 0.5, 1, 2].flatMap(zoom => ['default', 'selected', ...(zoom === 0.5 ? ['hover', 'focus'] : [])].map(state => ({
      id: `canvas-frame-zoom-${String(zoom * 100)}-${state}`,
      title: `Frame at ${String(zoom)} zoom, ${state}`,
      render: () => (
        <Focused selector={state === 'hover' || state === 'focus' ? '.react-flow__node' : undefined} hover={state === 'hover'}>
          <div style={{ width: 420, height: 270 }}>
            <ReactFlowProvider>
              <ReactFlow
                nodes={[{ id: `zoom-frame-${String(zoom)}-${state}`, type: 'frame', position: { x: 0, y: 0 }, selected: state === 'selected', style: { width: 360 / zoom, height: 180 / zoom }, data: { name: 'Frame', homeUrl: 'about:blank', currentUrl: 'about:blank', health: 'live', title: 'Frame', canGoBack: false, canGoForward: false } }]}
                nodeTypes={{ frame: FrameNode }}
                defaultViewport={{ x: 30, y: 60, zoom }}
                minZoom={0.1}
                maxZoom={4}
                proOptions={{ hideAttribution: true }}
                onNodeMouseEnter={(_event, node) => useCanvasStore.getState().hoverNode(node.id)}
                onNodeMouseLeave={() => useCanvasStore.getState().hoverNode(null)}
              ><FrameZoomStyle frameId={`zoom-frame-${String(zoom)}-${state}`} /></ReactFlow>
            </ReactFlowProvider>
          </div>
        </Focused>
      ),
    }))),
    ...RECOVERY_STORIES,
    {
      id: 'canvas-frame-title-centre',
      title: 'A frame’s name centred on the frame, whatever controls sit beside it',
      note: 'at rest the controls are hidden, so a name off the frame’s centre reads as misplaced; back and forward add width only on the left',
      render: () => (
        <VStack gap={6} data-testid="canvas-frame-title-centre">
          {TITLE_CENTRE_FRAMES.map((frame) => (
            <div key={frame.id} data-testid={`title-centre-${frame.id}`} style={{ width: 640, height: 150 }}>
              <ReactFlowProvider>
                <ReactFlow
                  nodes={[{ id: frame.id, type: 'frame', position: { x: 0, y: 0 }, style: { width: frame.width, height: 90 }, data: { name: frame.title, homeUrl: frame.url, currentUrl: frame.url, health: 'live', title: frame.title, canGoBack: frame.canGoBack, canGoForward: frame.canGoForward } }]}
                  nodeTypes={{ frame: FrameNode }}
                  defaultViewport={{ x: 20, y: 44, zoom: 1 }}
                  proOptions={{ hideAttribution: true }}
                ><FrameZoomStyle frameId={frame.id} /></ReactFlow>
              </ReactFlowProvider>
            </div>
          ))}
        </VStack>
      ),
    },
    {
      id: 'canvas-frame-quote',
      title: 'A new frame’s quote, before its page is built (ONL-2960)',
      note: 'the brief the agent wrote, in place of the page; it scales with the frame’s size, so a smaller frame breaks its lines as a desktop one does; it shimmers while the agent works on the frame, and a long quote stops at the lines the frame holds',
      render: () => (
        <CoversOn>
          <VStack gap={6} style={{ background: 'var(--studio-ground)', padding: 'var(--spacing-6)' }}>
            {QUOTED_FRAMES.map((frame) => <QuotedFrame key={frame.id} {...frame} />)}
          </VStack>
        </CoversOn>
      ),
    },
    {
      id: 'canvas-frame-quote-widths',
      title: 'A new frame’s quote at desktop, tablet and phone widths (ONL-2960)',
      note: 'one canvas zoom for every frame; the quote is the desktop layout scaled to fit each frame, so its lines break where they do at 1512 and no word splits',
      render: () => (
        <CoversOn>
          <HStack gap={6} align="start" style={{ background: 'var(--studio-ground)', padding: 'var(--spacing-6)' }}>
            {QUOTE_WIDTHS.map((frame) => <QuotedFrame key={frame.id} {...frame} />)}
          </HStack>
        </CoversOn>
      ),
    },
    {
      id: 'canvas-frame-quote-lift',
      title: 'A quote lifting off the page it stood in for (ONL-2960)',
      note: 'the page is under the quote all along; the lift fades the quote out over it in 200 ms, with no jump and no remount',
      render: () => (
        <CoversOn>
          <LiftingQuote />
        </CoversOn>
      ),
    },
    {
      id: 'canvas-frame-quote-fits',
      title: 'A full brief in a desktop frame, an artifact, a phone frame and a short wide frame (ONL-2960)',
      note: 'a brief at the longest the agent may write; each object shows the desktop layout shrunk to fit it in both directions, so nothing is cut off and the hyphenated word stays whole',
      render: () => (
        <CoversOn>
          <HStack gap={6} align="start" style={{ background: 'var(--studio-ground)', padding: 'var(--spacing-6)', flexWrap: 'wrap' }}>
            {QUOTE_FITS.map((frame) => <QuotedFrame key={frame.id} {...frame} />)}
          </HStack>
        </CoversOn>
      ),
    },
    {
      id: 'canvas-frame-quote-ground',
      title: 'A quote on its ground at desktop, artifact, phone and wide shapes (ONL-2960)',
      note: 'the card grey with the words centred; once the type is too small to read on screen, only the ground is drawn',
      render: () => (
        <CoversOn>
          <HStack gap={6} align="start" style={{ background: 'var(--studio-ground)', padding: 'var(--spacing-6)', width: 'fit-content', flexWrap: 'wrap', maxWidth: 1700 }}>
            {QUOTE_GROUNDS.map((row) => <QuoteOnGround key={row.id} {...row} />)}
          </HStack>
        </CoversOn>
      ),
    },
    {
      id: 'canvas-frame-idle',
      title: 'A paused page at two sizes',
      note: 'The thumbnail keeps the capture’s proportions and takes pointer input, so a press cannot reach the page under it.',
      render: () => {
        const thumbnail = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="180" viewBox="0 0 240 180"><rect width="240" height="180" fill="#f4f1ea"/><text x="20" y="30" font-family="sans-serif" font-size="15" fill="#20241f">Motion journal</text><rect x="20" y="46" width="200" height="34" rx="6" fill="#ffffff"/><text x="30" y="67" font-family="sans-serif" font-size="11" fill="#20241f">Unsaved design note</text><rect x="20" y="96" width="56" height="56" rx="6" fill="#b6c4b0"/><rect x="92" y="96" width="56" height="56" rx="6" fill="#d5bb9c"/><rect x="164" y="96" width="56" height="56" rx="6" fill="#b1bbc6"/></svg>')}`;
        return (
          <HStack gap={6} align="start">
            {[[240, 180], [120, 260]].map(([width, height]) => (
              <div key={width} style={{ position: 'relative', width, height, overflow: 'hidden', borderRadius: 'var(--radius-element)', border: 'var(--border-width) solid var(--color-border)' }}>
                <FrameIdleThumbnail thumbnail={thumbnail} />
              </div>
            ))}
          </HStack>
        );
      },
    },
    {
      id: 'canvas-frame-loading',
      title: 'The loading label (ONL-2179)',
      note: 'authored at the port report; the guest’s own load event lifts it — the real frame carries data-frame-health="loading" meanwhile',
      render: () => (
        <Center
          data-testid="canvas-frame-loading-surface"
          style={{
            position: 'relative',
            width: 640,
            height: 400,
            flex: '0 0 auto',
            background: 'var(--color-background-card)',
            border: 'var(--border-width) solid var(--color-border)',
            borderRadius: 'var(--radius-element)',
          }}
        >
          <FrameLoadingLabel />
        </Center>
      ),
    },
    {
      id: 'canvas-frame-load-failed',
      title: 'A page that failed on a live server (ONL-2336)',
      note: 'the server answered and the page moved to https on an http dev server — the cover names that and offers the way back, never "nothing answered"',
      render: () => (
        <Center
          data-testid="canvas-frame-load-failed-surface"
          style={{
            position: 'relative',
            width: 640,
            height: 400,
            flex: '0 0 auto',
            background: 'var(--color-background-card)',
            border: 'var(--border-width) solid var(--color-border)',
            borderRadius: 'var(--radius-element)',
          }}
        >
          <FrameLoadFailedCover
            failure={{ url: 'https://localhost:5173/dashboard', code: -107, description: 'ERR_SSL_PROTOCOL_ERROR' }}
            homeUrl="http://localhost:5173/"
            onBack={noop}
          />
        </Center>
      ),
    },
  ],
};

function FrameZoomStyle({ frameId }: { frameId: string }): null {
  useFrameZoomStyle();
  useEffect(() => () => {
    const store = useCanvasStore.getState();
    if (store.hoveredNodeId === frameId) store.hoverNode(null);
  }, [frameId]);
  return null;
}

const TEXT_GROUND = {
  position: 'relative',
  flex: '0 0 auto',
  padding: 'var(--spacing-6)',
  minHeight: 140,
  minWidth: 560,
  background: 'var(--studio-ground)',
  borderRadius: 'var(--radius-element)',
  border: 'var(--border-width) solid var(--color-border)',
} as const;

const PARAGRAPH =
  'A long note the user pasted in, which has to wrap inside the one layout width every text node shares rather than running out as a single line thousands of pixels wide.';

const AUTHORED_PARAGRAPH =
  'A text box keeps the width you choose. Drag a corner to make it narrower or wider; the words wrap to fit, and the font stays the same size.';

function TextStates({
  rows,
}: {
  rows: readonly { label: string; props: TextNodeSurfaceProps }[];
}): React.JSX.Element {
  return (
    <VStack gap={4}>
      {rows.map((row) => (
        <VStack key={row.label} gap={1}>
          <Text size="sm" color="secondary">
            {row.label}
          </Text>
          <div style={TEXT_GROUND}>
            <TextNodeSurface {...row.props} />
          </div>
        </VStack>
      ))}
    </VStack>
  );
}

function AuthoredTextState({
  wrapWidth,
  state,
  zoom = 1,
}: {
  wrapWidth: number;
  state: 'default' | 'hovered' | 'selected' | 'editing';
  zoom?: number;
}): React.JSX.Element {
  const isSelected = state === 'selected';
  const isEditing = state === 'editing';
  return (
    <ReactFlowProvider>
      <div style={{ ...TEXT_GROUND, width: Math.max(560, wrapWidth * zoom + 48), minHeight: 400 * zoom + 48 }}>
        <div style={{ position: 'relative', transform: `scale(${String(zoom)})`, transformOrigin: '0 0' }}>
          <TextNodeSurface
            text={AUTHORED_PARAGRAPH}
            size="medium"
            wrapWidth={wrapWidth}
            isSelected={isSelected}
            isEditing={isEditing}
            isHovered={state === 'hovered'}
            zoom={zoom}
            editableRef={isEditing ? (node) => node?.focus({ preventScroll: true }) : undefined}
          >
            {isSelected && <NodeResizeHandles
              id="showroom-authored-text"
              testId="canvas-text-resize-handle"
              scale={frameRingScale(zoom)}
              cornersOnly
              bounds={{ minWidth: 1, minHeight: 1, maxWidth: Infinity, maxHeight: Infinity }}
            />}
          </TextNodeSurface>
        </div>
      </div>
    </ReactFlowProvider>
  );
}

/** Every state the derived size answers, plus the live press so the group's own feel is reviewable. */
function SizeBarStates(): React.JSX.Element {
  const [picked, setPicked] = useState<CanvasTextSize | null>('medium');
  const rows: readonly { label: string; size: CanvasTextSize | null }[] = [
    ...CANVAS_TEXT_SIZES.map((size) => ({ label: `A selection all at ${size}`, size })),
    { label: 'A selection of mixed sizes — nothing pressed', size: null },
  ];
  return (
    <VStack gap={4}>
      {rows.map((row) => (
        <VStack key={row.label} gap={1}>
          <Text size="sm" color="secondary">
            {row.label}
          </Text>
          <div style={TEXT_GROUND}>
            <TextSizeBarSurface size={row.size} onPick={noop} />
          </div>
        </VStack>
      ))}
      <VStack gap={1}>
        <Text size="sm" color="secondary">
          Live — a press moves the pressed size
        </Text>
        <div style={TEXT_GROUND}>
          <TextSizeBarSurface size={picked} onPick={setPicked} />
        </div>
      </VStack>
    </VStack>
  );
}

const TEXT: Category = {
  id: 'text',
  title: 'Text node',
  stories: [
    ...[240, 720].flatMap((wrapWidth) => [
      ...(['default', 'hovered', 'selected', 'editing'] as const).map((state) => ({
        id: `canvas-text-authored-${String(wrapWidth)}-${state}`,
        title: `${String(wrapWidth)}px authored text — ${state}`,
        render: () => <AuthoredTextState wrapWidth={wrapWidth} state={state} />,
      })),
      ...[{ id: '04', zoom: 0.4 }, { id: '25', zoom: 2.5 }].map(({ id, zoom }) => ({
        id: `canvas-text-authored-${String(wrapWidth)}-zoom-${id}`,
        title: `${String(wrapWidth)}px selected text at zoom ${String(zoom)}`,
        render: () => <AuthoredTextState wrapWidth={wrapWidth} state="selected" zoom={zoom} />,
      })),
    ]),
    {
      id: 'canvas-text-states',
      title: 'Resting, selected, editing and empty (ONL-2486)',
      note: 'the outline is selection and the caret’s own box alike; an empty node shows the caret and no ghost text',
      render: () => (
        <TextStates
          rows={[
            { label: 'Resting', props: { text: 'Ship the handoff', size: 'medium', isSelected: false, isEditing: false } },
            { label: 'Selected — outline, no handles', props: { text: 'Ship the handoff', size: 'medium', isSelected: true, isEditing: false } },
            { label: 'Editing', props: { text: 'Ship the handoff', size: 'medium', isSelected: true, isEditing: true } },
            { label: 'Empty, just placed', props: { text: '', size: 'medium', isSelected: true, isEditing: true } },
            { label: 'Multi-line, typed with Enter', props: { text: 'First line\nSecond line\n\nAfter a blank one', size: 'medium', isSelected: false, isEditing: false } },
            { label: 'Wrapped at the layout width', props: { text: PARAGRAPH, size: 'small', isSelected: true, isEditing: false } },
          ]}
        />
      ),
    },
    {
      id: 'canvas-text-sizes',
      title: 'The three sizes (ONL-2486)',
      note: 'one line each, so the ramp reads against itself',
      render: () => (
        <TextStates
          rows={CANVAS_TEXT_SIZES.map((size) => ({
            label: size,
            props: { text: 'Ship the handoff', size, isSelected: false, isEditing: false },
          }))}
        />
      ),
    },
    {
      id: 'canvas-text-size-bar',
      title: 'The size bar above a text selection (ONL-2486)',
      note: 'one size pressed when the whole selection shares it, none when it does not; the bar is the canvas’s own overlay, so a press on it never commits the caret under it',
      render: () => <SizeBarStates />,
    },
    {
      id: 'canvas-text-zoom',
      title: 'The outline counter-scales with the camera (ONL-2486)',
      note: 'the same selected node at three zooms — the ring holds its screen weight',
      render: () => (
        <TextStates
          rows={[0.4, 1, 2.5].map((zoom) => ({
            label: `zoom ${String(zoom)}`,
            props: { text: 'Ship the handoff', size: 'medium', isSelected: true, isEditing: false, zoom },
          }))}
        />
      ),
    },
  ],
};

/** A 16×10 PNG, generated rather than hosted: the states under review are the box, the label and the ring. */
const SAMPLE_IMAGE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAKCAIAAAAy3EnLAAAAN0lEQVR42mPQrqogCTGISMkDEckaiNeGooEYPegaCGrDrgGPHpwacGkjoAFTG1EakPUQqwGuDQAj4HRhCUnctAAAAABJRU5ErkJggg==';

const IMAGE_GROUND = {
  position: 'relative',
  flex: '0 0 auto',
  width: 320,
  height: 200,
  background: 'var(--studio-ground)',
} as const;

function ImageStates({
  rows,
}: {
  rows: readonly { label: string; props: ImageNodeSurfaceProps }[];
}): React.JSX.Element {
  return (
    <HStack gap={6} style={{ flexWrap: 'wrap', paddingBlockStart: 'var(--spacing-6)' }}>
      {rows.map((row) => (
        <VStack key={row.label} gap={1}>
          <Text size="sm" color="secondary">
            {row.label}
          </Text>
          <div style={IMAGE_GROUND}>
            <ImageNodeSurface {...row.props} />
          </div>
        </VStack>
      ))}
    </HStack>
  );
}

const REFUSALS: readonly { label: string; reason: ImageRefusalReason; count: number }[] = [
  { label: 'Not an image format', reason: 'unsupported-format', count: 1 },
  { label: 'Over the shared size cap', reason: 'too-large', count: 1 },
  { label: 'The file could not be read', reason: 'unreadable', count: 1 },
  { label: 'More files than one gesture takes', reason: 'too-many-files', count: 21 },
  { label: 'The gesture carried no image', reason: 'no-image', count: 0 },
  { label: 'Two refused, one band', reason: 'unsupported-format', count: 2 },
];

/** The real controls, so the marks cannot drift; with no React Flow node behind them they paint and drag nothing. */
function ImageHandleStates({ zooms }: { zooms: readonly number[] }): React.JSX.Element {
  return (
    <ReactFlowProvider>
      <HStack gap={8} style={{ flexWrap: 'wrap', padding: 'var(--spacing-8)' }}>
        {zooms.map((zoom) => (
          <VStack key={zoom} gap={1}>
            <Text size="sm" color="secondary">
              {`zoom ${String(zoom)}`}
            </Text>
            <div style={IMAGE_GROUND}>
              <ImageNodeSurface
                name="checkout-hero.png"
                state="resolved"
                url={SAMPLE_IMAGE}
                isSelected
                zoom={zoom}
              />
              <NodeResizeHandles
                id="showroom-image"
                testId="canvas-image-resize-handle"
                scale={frameRingScale(zoom)}
                bounds={{
                  minWidth: MIN_IMAGE_SIZE.width,
                  minHeight: MIN_IMAGE_SIZE.height,
                  maxWidth: MAX_FRAME_SIZE.width,
                  maxHeight: MAX_FRAME_SIZE.height,
                }}
              />
            </div>
          </VStack>
        ))}
      </HStack>
    </ReactFlowProvider>
  );
}

function ArtifactStates({
  rows,
}: {
  rows: readonly { label: string; props: ArtifactNodeSurfaceProps }[];
}): React.JSX.Element {
  return (
    <HStack gap={6} style={{ flexWrap: 'wrap', paddingBlockStart: 'var(--spacing-6)' }}>
      {rows.map((row) => (
        <VStack key={row.label} gap={1}>
          <Text size="sm" color="secondary">
            {row.label}
          </Text>
          <div style={IMAGE_GROUND}>
            <ArtifactNodeSurface {...row.props} />
          </div>
        </VStack>
      ))}
    </HStack>
  );
}

const MID_QUOTE = LONG_QUOTE.slice(0, LONG_QUOTE.indexOf(', and a way'));
const ARTIFACT_QUOTES = [
  { id: 'short', quote: SHORT_QUOTE },
  { id: 'mid', quote: MID_QUOTE },
  { id: 'long', quote: LONG_QUOTE },
] as const;
const QUOTE_ZOOMS = [
  { id: 'zoom-1', label: 'zoom 1', zoom: 1 },
  { id: 'fit', label: 'fitted, the frame story’s 0.45', zoom: 0.45 },
] as const;

function QuotedArtifact({ quote, zoom, isWorking = false }: { quote: string; zoom: number; isWorking?: boolean }): React.JSX.Element {
  const { width, height } = CANVAS_ARTIFACT_DEFAULT_BOX;
  return (
    <div data-testid="quoted-artifact" style={{ position: 'relative', width: width * zoom, height: height * zoom, flex: '0 0 auto' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width, height, transform: `scale(${String(zoom)})`, transformOrigin: '0 0' }}>
        <ArtifactNodeSurface title="Pricing idea" state="reading" isSelected={false} isHovered isWorking={isWorking} zoom={zoom} quote={quote} size={{ width, height }} />
      </div>
    </div>
  );
}

function QuoteBesideFrame({ id, quote, zoom }: { id: string; quote: string; zoom: number }): React.JSX.Element {
  const { width, height } = DEFAULT_FRAME_SIZE;
  return (
    <div data-testid={`canvas-artifact-quote-${id}`} style={{ display: 'flex', gap: 'var(--spacing-6)', alignItems: 'flex-start', paddingBlockStart: 'var(--spacing-8)' }}>
      <QuotedArtifact quote={quote} zoom={zoom} />
      <div style={{ position: 'relative', width: width * zoom, height: height * zoom, flex: '0 0 auto', overflow: 'hidden', border: 'var(--border-width) solid var(--color-border)' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width, height, transform: `scale(${String(zoom)})`, transformOrigin: '0 0' }}>
          <FrameQuote quote={quote} isBuilding={false} width={width} height={height} canvasZoom={zoom} />
        </div>
      </div>
    </div>
  );
}

const ARTIFACT: Category = {
  id: 'artifact',
  title: 'Artifact node',
  stories: [
    {
      id: 'canvas-artifact-states',
      title: 'Pending, gone, and the accent that follows identity (ONL-2568)',
      note: 'a read in flight offers nothing, so opening a project never offers to remove every artifact before any of them resolved; only a resolved absence names it, and that removal takes the node and never the artifact',
      render: () => (
        <ArtifactStates
          rows={[
            {
              label: 'Pending — reserved at its final size, nothing offered',
              props: { title: 'Pricing idea', state: 'reading', isSelected: false },
            },
            {
              label: 'Gone — names it, offers to remove the node',
              props: {
                title: 'Pricing idea',
                state: 'missing',
                isSelected: false,
                onRemoveNode: () => undefined,
              },
            },
            {
              label: 'Selected — the blue follows the artifact, not a URL',
              props: { title: 'Pricing idea', state: 'reading', isSelected: true },
            },
            {
              label: 'Hovered — its title at the left edge',
              props: { title: 'Pricing idea', state: 'reading', isSelected: false, isHovered: true },
            },
          ]}
        />
      ),
    },
    {
      id: 'canvas-artifact-quote',
      title: 'A new artifact’s quote beside a new frame’s, at one zoom (ONL-2960)',
      note: 'the same quote at the same rule in the default 480×640 artifact and the 1512×982 frame; a short, a middling and a long brief, at zoom 1 and fitted',
      render: () => (
        <CoversOn>
          <VStack gap={6} style={{ background: 'var(--studio-ground)', padding: 'var(--spacing-6)' }}>
            {QUOTE_ZOOMS.flatMap((zoom) => ARTIFACT_QUOTES.map((quote) => (
              <VStack key={`${quote.id}-${zoom.id}`} gap={1}>
                <Text size="sm" color="secondary">{`${String(quote.quote.length)} characters, ${zoom.label}`}</Text>
                <QuoteBesideFrame id={`${quote.id}-${zoom.id}`} quote={quote.quote} zoom={zoom.zoom} />
              </VStack>
            )))}
          </VStack>
        </CoversOn>
      ),
    },
    {
      id: 'canvas-artifact-quote-shimmer',
      title: 'The title and the quote shimmering together while the agent builds (ONL-2960)',
      note: 'the agent placed the artifact and is working on it: its title shimmers as on any artifact it changes, and so does the quote',
      render: () => (
        <CoversOn>
          <HStack gap={6} style={{ background: 'var(--studio-ground)', padding: 'var(--spacing-6)', alignItems: 'flex-start' }}>
            {QUOTE_ZOOMS.map((zoom) => (
              <div key={zoom.id} data-testid={`canvas-artifact-quote-shimmer-${zoom.id}`} style={{ paddingBlockStart: 'var(--spacing-8)' }}>
                <QuotedArtifact quote={SHORT_QUOTE} zoom={zoom.zoom} isWorking />
              </div>
            ))}
          </HStack>
        </CoversOn>
      ),
    },
  ],
};

const IMAGE: Category = {
  id: 'image',
  title: 'Image node',
  stories: [
    {
      id: 'canvas-image-states',
      title: 'Reserved, resolved and gone (ONL-2486)',
      note: 'a read in flight is the plain muted box with no spinner; only a resolved absence names the file, so opening a project never flashes what looks like data loss',
      render: () => (
        <ImageStates
          rows={[
            {
              label: 'Reserved — the box is already its final size',
              props: { name: 'checkout-hero.png', state: 'reading', isSelected: false },
            },
            {
              label: 'Resolved',
              props: {
                name: 'checkout-hero.png',
                state: 'resolved',
                url: SAMPLE_IMAGE,
                isSelected: false,
              },
            },
            {
              label: 'Hovered — the name at the left edge',
              props: {
                name: 'checkout-hero.png',
                state: 'resolved',
                url: SAMPLE_IMAGE,
                isSelected: false,
                isHovered: true,
              },
            },
            {
              label: 'Selected',
              props: {
                name: 'checkout-hero.png',
                state: 'resolved',
                url: SAMPLE_IMAGE,
                isSelected: true,
              },
            },
            {
              label: 'The bytes are gone',
              props: { name: 'checkout-hero.png', state: 'missing', isSelected: false },
            },
            {
              label: 'Gone and selected',
              props: { name: 'checkout-hero.png', state: 'missing', isSelected: true },
            },
          ]}
        />
      ),
    },
    {
      id: 'canvas-image-handles',
      title: 'The eight resize controls a selected picture wears (ONL-2486)',
      note: 'the frame’s own marks, counter-scaled so they hold their screen weight; a multi-selection draws none',
      render: () => <ImageHandleStates zooms={[0.4, 1, 2.5]} />,
    },
    {
      id: 'canvas-image-refusals',
      title: 'Every reason a placement is refused (ONL-2486)',
      note: 'the canvas’s own band, above the toolbar — one refusal at a time, the newest, and a count when one gesture refused more than one file',
      render: () => (
        <VStack gap={4} style={{ maxWidth: 440 }}>
          {REFUSALS.map((row) => (
            <VStack key={row.label} gap={1}>
              <Text size="sm" color="secondary">
                {row.label}
              </Text>
              <ImageRefusalBanner
                refusal={{ reason: row.reason, name: 'notes.txt', count: row.count }}
                onDismiss={noop}
              />
            </VStack>
          ))}
        </VStack>
      ),
    },
  ],
};

export const CANVAS_GALLERY: Gallery = {
  id: 'canvas',
  title: 'Canvas',
  subtitle:
    'The editor frame at every rail configuration (ONL-2256), the frame’s loading label (ONL-2179), the text and image nodes’ states, their size bar and their resize controls (ONL-2486), and the artifact node’s three read states (ONL-2568).',
  categories: [RAILS, READY_CANVAS, TOOL_PREVIEWS, CANVAS_SECTIONS, FRAME, FRAME_COVERS, FRAME_SCROLLBAR, TEXT, IMAGE, ARTIFACT],
};
