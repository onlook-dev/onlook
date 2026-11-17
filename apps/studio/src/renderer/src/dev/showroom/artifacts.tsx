import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { HStack } from '@astryxdesign/core/Layout';
import { SubmittedAttachments } from '@studio/chat-ui';
import type { ArtifactSummary } from '@studio/events';
import { ArtifactNodeSurface } from '../../canvas/artifact/ArtifactNode.js';
import { ArtifactTextEditorSurface, ArtifactTextRefusal } from '../../canvas/artifact/ArtifactTextEditor.js';
import type { ArtifactTextTarget } from '@studio/events';
import { DeleteArtifactDialog } from '../../canvas/artifact/DeleteArtifactDialog.js';
import { ArtifactList } from '../../canvas/artifact/ArtifactList.js';
import { ArtifactPageViewer } from '../../canvas/artifact/ArtifactPageViewer.js';
import { ArtifactSidebar } from '../../canvas/artifact/ArtifactSidebar.js';
import { ExportPanelSurface } from '../../canvas/artifact/ExportPanel.js';
import { IMAGE_FORMATS } from '../../canvas/artifact/exportPanelState.js';
import { useArtifactListing } from '../../canvas/artifact/listing.js';
import { ProjectsSidebar } from '../../projects/ProjectsSidebar.js';
import { ProjectsView } from '../../projects/ProjectsView.js';
import { ArtifactsPage } from '../../projects/ArtifactsPage.js';
import { CanvasToolbar } from '../../canvas/CanvasToolbar.js';
import { Canvas } from '../../canvas/Canvas.js';
import { ARTIFACT_NODE_TYPE } from '../../canvas/model.js';
import { useCanvasStore } from '../../canvas/store.js';
import { canvasNodeLabeller, type CanvasNodeLabelFacts } from '../../nodeLabel.js';
import { FrameChips } from '../../chat/FrameChips.js';
import { restoredArtifactLabels } from '../../chat/draftRestore.js';
import { t } from '@studio/i18n';
import { Sidebar } from '../../sidebar/Sidebar.js';
import { Focused, noop, type Gallery } from './Showroom.js';
import { studio } from '../../bridge.js';

const FACTS = [
  { kind: 'artifact', name: '', title: 'Pricing', artifactId: '12340000-1111-4111-8111-000000000001' },
  { kind: 'artifact', name: '', title: 'Pricing', artifactId: '12340001-1111-4111-8111-000000000002' },
] as const satisfies readonly CanvasNodeLabelFacts[];
const label = canvasNodeLabeller(FACTS, t);

const TEXT_TARGET: ArtifactTextTarget = {
  token: 'showroom', text: 'Make room for ideas', rect: { x: 40, y: 40, width: 340, height: 42 },
  style: { fontFamily: 'Arial, sans-serif', fontSize: '32px', fontWeight: '600', lineHeight: '42px', letterSpacing: '-0.5px', textAlign: 'left', color: '#171717', backgroundColor: '#ffffff' },
};

function TextEditState({ state }: { state: 'default' | 'hover' | 'focus' | 'saving' | 'error' | 'unsupported' | 'readonly' | 'stale' | 'empty' | 'refusal' }): React.JSX.Element {
  return <Focused selector={state === 'focus' ? 'textarea' : state === 'hover' ? '[data-testid="artifact-text-save"]' : undefined} hover={state === 'hover'}>
    <div data-accent="artifact" style={{ position: 'relative', width: 500, height: 280, background: '#ffffff' }}>
      <div style={{ position: 'absolute', left: 40, top: 40, font: '600 32px/42px Arial, sans-serif', letterSpacing: '-0.5px', color: '#171717' }}>{TEXT_TARGET.text}</div>
      {state === 'refusal' ? <ArtifactTextRefusal message={t('artifact.text.unsupported')} onDismiss={noop} /> : <ArtifactTextEditorSurface target={TEXT_TARGET} value={state === 'empty' ? '' : TEXT_TARGET.text} pending={state === 'saving'} error={state === 'error' ? t('artifact.text.failed') : state === 'unsupported' ? t('artifact.text.unsupportedSave') : state === 'readonly' ? t('artifact.text.readOnly') : null} stale={state === 'stale'} blocked={state === 'readonly'} onChange={noop} onSave={noop} onCancel={noop} />}
    </div>
  </Focused>;
}

const LIBRARY_RECORDS = FACTS.map((facts) => ({ id: facts.artifactId, title: facts.title, pagePath: 'pages/index.html', pages: [{ path: 'pages/index.html', name: 'Home' }], updatedAt: '2026-10-09T00:00:00Z', readOnly: false }));
const SHIMMER_ARTIFACT = { ...LIBRARY_RECORDS[0]!, title: 'Rail + toolbar — organize / tools' };
function LiveViewer(): React.JSX.Element {
  const [artifact, setArtifact] = useState<ArtifactSummary | null>(null);
  useEffect(() => {
    let active = true;
    void studio().artifactCreate({title: 'Live artifact'}).then((created) => { if (active && 'ok' in created) setArtifact(created.artifact); });
    return () => { active = false; };
  }, []);
  return artifact ? <ArtifactPageViewer artifact={artifact} pagePath={artifact.pagePath} onNavigate={noop} onClose={noop} /> : <div />;
}
function LibraryState({ focus = false, hover = false, records = LIBRARY_RECORDS, error = false }: { records?: ArtifactSummary[] | null; error?: boolean; focus?: boolean; hover?: boolean }): React.JSX.Element {
  return <Focused selector={focus || hover ? 'button' : undefined} hover={hover}><div style={{ width: 560 }}>
    <ArtifactList records={records} error={error} onPlace={noop} />
  </div></Focused>;
}

function SidebarState({ records = LIBRARY_RECORDS, error = false, focus = false, openMenu = false }: { records?: ArtifactSummary[] | null; error?: boolean; focus?: boolean; openMenu?: boolean }): React.JSX.Element {
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    useArtifactListing.setState({records, error});
    const timer = window.setTimeout(() => { if (openMenu) root.current?.querySelector<HTMLButtonElement>('[data-testid="artifact-export-menu"] button')?.click(); }, 100);
    return () => window.clearTimeout(timer);
  }, [records, error, openMenu]);
  return <Focused selector={focus ? '[data-testid="artifact-export-menu"] > button' : undefined}><div ref={root} style={{width: 260, height: 570}}><ArtifactSidebar /></div></Focused>;
}

function ProjectsEntry({ focus = false, hover = false }: { focus?: boolean; hover?: boolean }): React.JSX.Element {
  return <Focused selector={focus || hover ? 'button' : undefined} hover={hover}>
    <div style={{ height: 620 }}><ProjectsSidebar workspaces={[]} isRecentSelected onSelectRecent={noop} onCreateBlank={noop} /></div>
  </Focused>;
}

function ProjectsArtifacts({ records = LIBRARY_RECORDS, error = false, focus = false, hover = false }: {
  records?: ArtifactSummary[] | null; error?: boolean; focus?: boolean; hover?: boolean;
}): React.JSX.Element {
  return <Focused selector={focus ? '[data-testid="projects-artifacts"] button' : undefined}>
    <div style={{ width: 720, height: 600 }}>
      <ProjectsView title={t(hover ? 'projects.nav.recent' : 'artifact.library.title')} projects={[]} workspaces={[]}
        hasArtifacts isArtifactsSelected={!hover} isRecentSelected={hover} hoveredId={hover ? 'artifacts' : undefined}
        onSelectRecent={noop} onSelectArtifacts={noop} onCreateBlank={noop}
        {...(!hover ? { content: <ArtifactsPage records={records} error={error} /> } : {})} />
    </div>
  </Focused>;
}

function NodeState({ state, selected = false, hovered = false, focus = false }: {
  state: 'reading' | 'missing'; selected?: boolean; hovered?: boolean; focus?: boolean;
}): React.JSX.Element {
  return (
    <Focused selector={focus ? 'button' : undefined}>
      <div style={{ position: 'relative', width: 320, height: 200, marginBlockStart: 40 }}>
        <ArtifactNodeSurface title={label(FACTS[0])} state={state} isSelected={selected} isHovered={hovered} isFocused={focus} onRemoveNode={noop} onRefresh={noop} />
      </div>
    </Focused>
  );
}

const COVER_PAGE = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="625">'
  + '<rect width="1000" height="625" fill="#ffffff"/><rect width="1000" height="72" fill="#111827"/>'
  + '<rect x="32" y="28" width="120" height="16" rx="8" fill="#ffffff"/>'
  + '<rect x="760" y="28" width="208" height="16" rx="8" fill="#ffffff" opacity="0.45"/>'
  + '<rect x="64" y="140" width="520" height="44" rx="8" fill="#111827"/>'
  + '<rect x="64" y="204" width="400" height="20" rx="6" fill="#9ca3af"/>'
  + '<rect x="64" y="236" width="340" height="20" rx="6" fill="#d1d5db"/>'
  + '<rect x="64" y="300" width="260" height="48" rx="24" fill="#2563eb"/>'
  + '<rect x="64" y="420" width="260" height="150" rx="12" fill="#f3f4f6" stroke="#e5e7eb"/>'
  + '<rect x="364" y="420" width="260" height="150" rx="12" fill="#f3f4f6" stroke="#e5e7eb"/>'
  + '<rect x="664" y="420" width="260" height="150" rx="12" fill="#f3f4f6" stroke="#e5e7eb"/>'
  + '</svg>',
)}`;

/** The node's real 480x640 box against the preview's own 1000x625, which is what the crop has to survive (ONL-2791). */
function CoverState(): React.JSX.Element {
  return <div style={{ position: 'relative', width: 480, height: 640, marginBlockStart: 40 }}>
    <ArtifactNodeSurface title={label(FACTS[0])} state="resolved" url="studio-artifact://showroom/pages/index.html"
      artifact={LIBRARY_RECORDS[0]!} cover={COVER_PAGE} isSelected={false} />
  </div>;
}

function CanvasTitleState({ state = 'default', isWorking = false }: { state?: 'default' | 'hover' | 'focus' | 'editing' | 'disabled'; isWorking?: boolean }): React.JSX.Element {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state !== 'editing') return;
    root.current?.querySelector('[data-testid="artifact-title-button"]')?.dispatchEvent(new MouseEvent('dblclick', {bubbles: true}));
  }, [state]);
  const artifact = LIBRARY_RECORDS[0]!;
  return <Focused selector={state === 'focus' || state === 'hover' ? '[data-testid="artifact-title-button"]' : undefined} hover={state === 'hover'}>
    <div ref={root} style={{position: 'relative', width: 320, height: 200, marginBlockStart: 40}}>
      <ArtifactNodeSurface title={artifact.title} artifact={{...artifact, readOnly: state === 'disabled'}} state="reading" isSelected isWorking={isWorking} onRefresh={noop} />
    </div>
  </Focused>;
}

function RefreshState({ focus = false, hover = false }: { focus?: boolean; hover?: boolean }): React.JSX.Element {
  const artifact = LIBRARY_RECORDS[0]!;
  return <Focused selector={focus || hover ? '[data-testid="canvas-artifact-refresh"]' : undefined} hover={hover}>
    <div style={{position: 'relative', width: 320, height: 200, marginBlockStart: 40}}>
      <ArtifactNodeSurface title={artifact.title} artifact={artifact} state="reading" isSelected onRefresh={noop} />
    </div>
  </Focused>;
}

function ShimmerTitleState(): React.JSX.Element {
  return <div style={{ paddingBlockStart: 40, display: 'grid', gap: 64 }}>
    {[1, 0.73, 1.37].map((zoom, index) => <div key={zoom} style={{ position: 'relative', width: index === 2 ? 80 : 380, height: 120, transform: `scale(${String(zoom)})`, transformOrigin: 'top left' }}>
      <ArtifactNodeSurface title={SHIMMER_ARTIFACT.title} artifact={SHIMMER_ARTIFACT} state="reading" isSelected={false} isWorking isHovered zoom={zoom} />
    </div>)}
  </div>;
}

function Chips({ focus = false, hover = false, restored = false, unique = false }: { focus?: boolean; hover?: boolean; restored?: boolean; unique?: boolean }): React.JSX.Element {
  const facts = unique ? FACTS.slice(0, 1) : FACTS;
  const restoredLabels = restoredArtifactLabels(facts.map((artifact) => ({ kind: 'artifact', artifactId: artifact.artifactId, title: artifact.title })), [], new Map());
  return (
    <Focused selector={focus || hover ? 'button' : undefined} hover={hover}>
      <HStack gap={2}>
        <FrameChips objects={facts.map((artifact, index) => ({ id: `artifact-${String(index)}`, kind: 'artifact', name: '', label: restored ? restoredLabels.get(artifact.artifactId) ?? artifact.title : label(artifact) }))} onRemove={noop} />
      </HStack>
    </Focused>
  );
}

function Toolbar({ focus = false, hover = false, selected = false }: { focus?: boolean; hover?: boolean; selected?: boolean }): React.JSX.Element {
  return (
    <Focused selector={focus || hover ? '[data-preview="artifact"] button' : undefined} hover={hover}>
      <div style={{ width: 620, height: 340, position: 'relative', display: 'flex', alignItems: 'end', justifyContent: 'center' }}>
        <CanvasToolbar tool={selected ? 'artifact' : 'select'} onToolChange={noop} onPlaceImage={noop} onRunToggle={noop} hasFrames={false} />
      </div>
    </Focused>
  );
}

function DeleteConfirmation({ focus = false }: { focus?: boolean }): React.JSX.Element {
  return (
    <Focused selector={focus ? 'button' : undefined}>
      <DeleteArtifactDialog isOpen isInline title={label(FACTS[0])} onOpenChange={noop} onConfirm={noop} />
    </Focused>
  );
}

function Designs({ menu = false }: { menu?: boolean }): React.JSX.Element {
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const nodes = FACTS.map((facts, index) => ({
      id: `artifact-${String(index)}`, pageId: 'main', kind: 'artifact' as const, name: '',
      x: 0, y: 0, width: 320, height: 200, order: index,
      content: { artifactId: facts.artifactId, title: facts.title },
    }));
    useCanvasStore.setState({
      doc: { schemaVersion: 1, docId: 'showroom-artifacts', revision: 1, pages: { main: { id: 'main', name: 'Designs', order: 0 } }, nodes: Object.fromEntries(nodes.map((node) => [node.id, node])) },
      nodes: nodes.map((node, index) => ({ id: node.id, type: ARTIFACT_NODE_TYPE, position: { x: 0, y: 0 }, width: 320, height: 200, selected: index === 0, data: { artifactId: node.content.artifactId, title: 'Pricing', name: '' } })),
      currentPageId: 'main', selectedNodeIds: ['artifact-0'],
    });
    const timer = window.setTimeout(() => {
      if (!menu) return;
      const trigger = root.current?.querySelector('[data-testid="canvas-node-menu"]');
      const rect = trigger?.getBoundingClientRect();
      if (trigger && rect) trigger.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: rect.left + 40, clientY: rect.top + 12 }));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [menu]);
  return <div ref={root} style={{ width: 259, height: 320 }}><Sidebar /></div>;
}

function ResolvedCanvas({ neighbor = false, selected = 'artifact', hovered = false }: { neighbor?: boolean; selected?: 'artifact' | 'browser' | 'none'; hovered?: boolean }): React.JSX.Element {
  useEffect(() => {
    let active = true;
    void studio().artifactCreate({ title: 'Pricing' }).then((created) => {
      if (!active || !('ok' in created)) return;
      const artifact = created.artifact;
      const node = {
        id: 'showroom-artifact', pageId: 'main', kind: 'artifact' as const, name: '',
        x: neighbor ? 30 : 80, y: 60, width: neighbor ? 280 : 400, height: neighbor ? 200 : 250, order: 0,
        content: { artifactId: artifact.id, title: artifact.title },
      };
      const url = 'http://127.0.0.1:1/index.html';
      const browser = { id: 'showroom-browser', pageId: 'main', kind: 'browser' as const, name: 'Project browser', x: 350, y: 60, width: 280, height: 200, order: 1, content: { homeUrl: url } };
      useCanvasStore.setState({
        doc: { schemaVersion: 1, docId: 'showroom-artifacts', revision: 1, pages: { main: { id: 'main', name: 'Designs', order: 0 } }, nodes: { [node.id]: node, ...(neighbor ? { [browser.id]: browser } : {}) } },
        nodes: [
          { id: node.id, type: ARTIFACT_NODE_TYPE, position: { x: node.x, y: node.y }, width: node.width, height: node.height, selected: selected === 'artifact', data: { artifactId: artifact.id, title: artifact.title, name: '' } },
          ...(neighbor ? [{ id: browser.id, type: 'frame' as const, position: { x: browser.x, y: browser.y }, width: browser.width, height: browser.height, selected: selected === 'browser', data: { homeUrl: url, currentUrl: url, name: browser.name, title: '', health: 'unreachable' as const, canGoBack: false, canGoForward: false } }] : []),
        ],
        currentPageId: 'main', selectedNodeIds: selected === 'none' ? [] : [selected === 'artifact' ? node.id : browser.id], hoveredNodeId: hovered ? node.id : null,
      });
    });
    return () => { active = false; };
  }, [neighbor, selected, hovered]);
  return <div style={{ position: 'relative', width: 700, height: 450 }}><ReactFlowProvider><Canvas /></ReactFlowProvider></div>;
}

const IMAGE_EXPORT_REFUSALS: Partial<Record<string, Parameters<typeof t>[0]>> = {
  error: 'canvas.export.unavailable',
  failed: 'canvas.export.failed',
  large: 'canvas.export.tooLarge',
  resolution: 'canvas.export.resolution',
  timeout: 'canvas.export.timeout',
  'write-failed': 'canvas.export.writeFailed',
};

function ImageExportState({ state = 'default' }: { state?: 'default' | 'hover' | 'focus' | 'menu' | 'empty' | 'busy' | 'error' | 'failed' | 'large' | 'resolution' | 'timeout' | 'write-failed' | 'saved' | 'no-formats' }): React.JSX.Element {
  const root = useRef<HTMLDivElement>(null);
  const refusalKey = IMAGE_EXPORT_REFUSALS[state];
  useLayoutEffect(() => {
    if (state !== 'menu') return;
    const timer = window.setTimeout(() => root.current?.querySelector<HTMLButtonElement>('[data-testid="artifact-export-format"]')?.click(), 100);
    return () => window.clearTimeout(timer);
  }, [state]);
  return <Focused selector={state === 'focus' || state === 'hover' ? '[data-testid="artifact-export-run"]' : undefined} hover={state === 'hover'}>
    <div ref={root} style={{ position: 'relative', width: 360, height: 610 }}>
      <ExportPanelSurface targets={state === 'empty' ? [] : [{ nodeId: 'browser', title: 'Quarterly update', artifact: undefined }]} formats={state === 'no-formats' ? [] : ['png']} allowed={IMAGE_FORMATS} isExporting={state === 'busy'} refusal={refusalKey === undefined ? null : t(refusalKey)} savedName={state === 'saved' ? 'Quarterly update.png' : null} unexportable={null} onExport={noop} onClose={noop} />
    </div>
  </Focused>;
}

export const ARTIFACTS_GALLERY: Gallery = {
  id: 'artifacts',
  title: 'Artifacts',
  categories: [
    { id: 'text-editing', title: 'Direct text editing', stories: [
      ...(['default', 'hover', 'focus', 'saving', 'error', 'unsupported', 'readonly', 'stale', 'empty', 'refusal'] as const).map((state) => ({ id: `text-edit-${state}`, title: `Text editor ${state}`, render: () => <TextEditState state={state} /> })),
      { id: 'text-edit-refusal-focus', title: 'Text refusal keyboard focus', render: () => <Focused selector={'[data-testid="artifact-text-refusal"] button'}><TextEditState state="refusal" /></Focused> },
      { id: 'text-edit-refusal-hover', title: 'Text refusal hover', render: () => <Focused selector={'[data-testid="artifact-text-refusal"] button'} hover><TextEditState state="refusal" /></Focused> },
    ] },
    { id: 'image-export', title: 'Image export', stories: [
      { id: 'image-export-default', title: 'Frame selected', render: () => <ImageExportState /> },
      { id: 'image-export-hover', title: 'Export hover', render: () => <ImageExportState state="hover" /> },
      { id: 'image-export-focus', title: 'Export keyboard focus', render: () => <ImageExportState state="focus" /> },
      { id: 'image-export-menu', title: 'Image formats menu', render: () => <ImageExportState state="menu" /> },
      { id: 'image-export-empty', title: 'No selection', render: () => <ImageExportState state="empty" /> },
      { id: 'image-export-busy', title: 'Export in progress', render: () => <ImageExportState state="busy" /> },
      { id: 'image-export-error', title: 'Frame unavailable', render: () => <ImageExportState state="error" /> },
      { id: 'image-export-failed', title: 'Image could not be saved', render: () => <ImageExportState state="failed" /> },
      { id: 'image-export-large', title: 'Image too large', render: () => <ImageExportState state="large" /> },
      { id: 'image-export-resolution', title: 'Insufficient rendered pixels', render: () => <ImageExportState state="resolution" /> },
      { id: 'image-export-timeout', title: 'Rendering timed out', render: () => <ImageExportState state="timeout" /> },
      { id: 'image-export-write-failed', title: 'Save location unavailable', render: () => <ImageExportState state="write-failed" /> },
      { id: 'image-export-saved', title: 'Image saved', render: () => <ImageExportState state="saved" /> },
      { id: 'image-export-no-formats', title: 'No filetypes', render: () => <ImageExportState state="no-formats" /> },
    ] },
    {
      id: 'v05', title: 'Project reuse and portable export', stories: [
        { id: 'artifact-sidebar', title: 'Project Artifacts panel', render: () => <SidebarState /> },
        { id: 'artifact-sidebar-title-focus', title: 'Artifact title keyboard focus', render: () => <Focused selector={'[data-testid="artifact-title-button"]'}><SidebarState /></Focused> },
        { id: 'artifact-sidebar-focus', title: 'Artifacts panel keyboard focus', render: () => <SidebarState focus /> },
        { id: 'artifact-sidebar-menu', title: 'Compact per-artifact export menu', render: () => <SidebarState openMenu /> },
        { id: 'artifact-sidebar-reading', title: 'Artifacts panel reading', render: () => <SidebarState records={null} /> },
        { id: 'artifact-sidebar-empty', title: 'Artifacts panel empty', render: () => <SidebarState records={[]} /> },
        { id: 'artifact-sidebar-error', title: 'Artifacts panel unavailable', render: () => <SidebarState error /> },
        { id: 'artifact-sidebar-readonly', title: 'Artifacts panel newer-reader', render: () => <SidebarState records={LIBRARY_RECORDS.map((record) => ({...record, readOnly: true}))} /> },
        { id: 'library', title: 'Whole-idea shared placements', render: () => <LibraryState /> },
        { id: 'library-focus', title: 'Library keyboard focus', render: () => <LibraryState focus /> },
        { id: 'library-hover', title: 'Library pointer hover', render: () => <LibraryState hover /> },
        { id: 'library-reading', title: 'Library pending read', render: () => <LibraryState records={null} /> },
        { id: 'library-empty', title: 'Empty library', render: () => <LibraryState records={[]} /> },
        { id: 'library-error', title: 'Library read refused', render: () => <LibraryState error /> },
        { id: 'library-readonly', title: 'Newer artifact actions disabled', render: () => <LibraryState records={LIBRARY_RECORDS.map((record) => ({ ...record, readOnly: true }))} /> },
        { id: 'viewer-unavailable', title: 'Page inspection unavailable', render: () => <ArtifactPageViewer artifact={LIBRARY_RECORDS[0]!} pagePath="pages/index.html" onNavigate={noop} onClose={noop} /> },
        { id: 'viewer-retry-focus', title: 'Page retry keyboard focus', render: () => <Focused selector={'.artifact-page-viewer .artifact-preview-retry button'}><ArtifactPageViewer artifact={LIBRARY_RECORDS[0]!} pagePath="pages/index.html" onNavigate={noop} onClose={noop} /></Focused> },
        { id: 'viewer-retry-hover', title: 'Page retry pointer hover', render: () => <Focused selector={'.artifact-page-viewer .artifact-preview-retry button'} hover><ArtifactPageViewer artifact={LIBRARY_RECORDS[0]!} pagePath="pages/index.html" onNavigate={noop} onClose={noop} /></Focused> },
        { id: 'viewer-live', title: 'Live selectable dark starter', render: () => <LiveViewer /> },
        { id: 'projects', title: 'Projects without an artifact home', render: () => <ProjectsEntry /> },
        { id: 'projects-artifacts', title: 'Existing artifacts, full page', render: () => <ProjectsArtifacts /> },
        { id: 'projects-artifacts-focus', title: 'Artifacts navigation focus', render: () => <ProjectsArtifacts focus /> },
        { id: 'projects-artifacts-hover', title: 'Artifacts navigation hover', render: () => <ProjectsArtifacts hover /> },
        { id: 'projects-artifacts-loading', title: 'Artifacts pending without absence', render: () => <ProjectsArtifacts records={null} /> },
        { id: 'projects-artifacts-error', title: 'Artifacts error retains selection', render: () => <ProjectsArtifacts records={null} error /> },
        { id: 'projects-artifacts-empty', title: 'Confirmed empty artifacts', render: () => <ProjectsArtifacts records={[]} /> },
        { id: 'projects-artifacts-readonly', title: 'Newer artifacts remain listed, read-only', render: () => <ProjectsArtifacts records={LIBRARY_RECORDS.map((record) => ({ ...record, readOnly: true }))} /> },
        { id: 'projects-focus', title: 'Projects keyboard focus', render: () => <ProjectsEntry focus /> },
        { id: 'projects-hover', title: 'Projects pointer hover', render: () => <ProjectsEntry hover /> },
        { id: 'unique', title: 'Distinct titles without identity tags', render: () => <LibraryState records={LIBRARY_RECORDS.map((record, index) => ({ ...record, title: index === 0 ? 'Pricing' : 'Checkout' }))} /> },
        { id: 'unique-focus', title: 'Title keyboard focus', render: () => <Focused selector={'[data-testid="artifact-title-button"]'}><LibraryState records={[LIBRARY_RECORDS[0]!]} /></Focused> },
        { id: 'unique-hover', title: 'Title pointer hover', render: () => <Focused selector={'[data-testid="artifact-title-button"]'} hover><LibraryState records={[LIBRARY_RECORDS[0]!]} /></Focused> },
        { id: 'retry-focus', title: 'Preview retry keyboard focus', render: () => <Focused selector={'.artifact-preview-retry button'}><LibraryState records={[LIBRARY_RECORDS[0]!]} /></Focused> },
        { id: 'retry-hover', title: 'Preview retry pointer hover', render: () => <Focused selector={'.artifact-preview-retry button'} hover><LibraryState records={[LIBRARY_RECORDS[0]!]} /></Focused> },
        { id: 'submitted-unique', title: 'Submitted title without identity tag', render: () => <div style={{ width: 640 }}><SubmittedAttachments attachments={[{ kind: 'artifact', artifactId: FACTS[0].artifactId, title: FACTS[0].title }]} imageLabel={t('chat.image.label')} imageAlt={t('chat.image.alt')} imageUnavailable={t('chat.image.unavailable')} /></div> },
        { id: 'submitted', title: 'Persistent same-title artifact references', render: () => <div style={{ width: 640 }}><SubmittedAttachments attachments={FACTS.map((facts) => ({ kind: 'artifact', artifactId: facts.artifactId, title: facts.title, pagePath: 'pages/index.html' }))} imageLabel={t('chat.image.label')} imageAlt={t('chat.image.alt')} imageUnavailable={t('chat.image.unavailable')} /></div> },
      ],
    },
    {
      id: 'nodes', title: 'Read states', stories: [
        { id: 'refresh', title: 'Centered title with refresh and export', render: () => <RefreshState /> },
        { id: 'refresh-focus', title: 'Refresh keyboard focus', render: () => <RefreshState focus /> },
        { id: 'refresh-hover', title: 'Refresh pointer hover', render: () => <RefreshState hover /> },
        { id: 'shimmer', title: 'Working titles at whole and fractional zoom', wide: true, render: () => <ShimmerTitleState /> },
        ...(['default', 'hover', 'focus', 'editing', 'disabled'] as const).map((state) => ({id: `shimmer-${state}`, title: `Working title ${state}`, render: () => <CanvasTitleState state={state} isWorking />})),
        ...(['default', 'hover', 'focus', 'editing', 'disabled'] as const).map((state) => ({id: `canvas-title-${state}`, title: `Canvas title ${state}`, render: () => <CanvasTitleState state={state} />})),
        { id: 'pending', title: 'Reading', render: () => <NodeState state="reading" /> },
        { id: 'missing', title: 'Missing', render: () => <NodeState state="missing" /> },
        { id: 'missing-focus', title: 'Remove node focus', render: () => <NodeState state="missing" focus /> },
        { id: 'selected', title: 'Selected title', render: () => <NodeState state="reading" selected /> },
        { id: 'hovered', title: 'Hover title', render: () => <NodeState state="reading" hovered /> },
        { id: 'cover', title: 'Reopened page cover', render: () => <CoverState /> },
        { id: 'resolved', title: 'Live starter and selected size badge', render: () => <ResolvedCanvas /> },
        { id: 'neighbors', title: 'Selected artifact beside an ordinary HTML browser', render: () => <ResolvedCanvas neighbor /> },
        { id: 'neighbors-rest', title: 'Identity-blue at rest beside ordinary browser', render: () => <ResolvedCanvas neighbor selected="none" /> },
        { id: 'neighbors-hover', title: 'Artifact hover beside ordinary browser', render: () => <ResolvedCanvas neighbor selected="none" hovered /> },
        { id: 'neighbors-browser', title: 'Ordinary browser selection remains distinct', render: () => <ResolvedCanvas neighbor selected="browser" /> },
      ],
    },
    {
      id: 'controls', title: 'Controls', stories: [
        { id: 'tool', title: 'Draw tool', render: () => <Toolbar /> },
        { id: 'tool-focus', title: 'Draw tool focus', render: () => <Toolbar focus /> },
        { id: 'tool-hover', title: 'Draw tool hover', render: () => <Toolbar hover /> },
        { id: 'tool-selected', title: 'Draw tool armed', render: () => <Toolbar selected /> },
        { id: 'chips', title: 'Shared prefix chips', render: () => <Chips /> },
        { id: 'chips-focus', title: 'Chip removal focus', render: () => <Chips focus /> },
        { id: 'chips-hover', title: 'Chip removal hover', render: () => <Chips hover /> },
        { id: 'restored-chip', title: 'Restored sketch title without an identity tag', render: () => <Chips restored unique /> },
        { id: 'restored-chip-focus', title: 'Restored sketch chip keyboard focus', render: () => <Chips restored unique focus /> },
        { id: 'restored-chip-hover', title: 'Restored sketch chip pointer hover', render: () => <Chips restored unique hover /> },
        { id: 'restored-collisions', title: 'Restored sketches with matching titles', render: () => <Chips restored /> },
        { id: 'delete', title: 'Delete confirmation', render: () => <DeleteConfirmation /> },
        { id: 'delete-focus', title: 'Delete cancel focus', render: () => <DeleteConfirmation focus /> },
        { id: 'designs', title: 'Shared prefix Designs', render: () => <Designs /> },
        { id: 'menu', title: 'Artifact context menu', render: () => <Designs menu /> },
      ],
    },
  ].flatMap((category) => category.stories.map((story) => ({ id: story.id, title: story.title, stories: [story] }))),
};
