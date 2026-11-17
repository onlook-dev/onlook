import {expect, it} from 'bun:test';
import type {ArtifactSummary, CanvasDoc, CanvasOpRequest, RendererTelemetryEvent} from '@studio/events';
import {ARTIFACT_PLACEMENT_TYPE, dragLibraryArtifact, dropLibraryArtifact, libraryArtifactPlacement, placeLibraryArtifact} from './libraryPlacement.js';
import {CANVAS_CLIPBOARD_TYPE} from '../clipboard/clipboard.js';
import {resetCanvasStoreForTests, useCanvasStore} from '../store.js';
import {seatCanvasTransport, type CanvasTransport} from '../wire.js';

const artifact: ArtifactSummary = {id: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa', title: 'Shared sketch', pagePath: 'pages/index.html', pages: [{path: 'pages/index.html', name: 'Home'}], updatedAt: 'revision', readOnly: false};
const doc: CanvasDoc = {schemaVersion: 1, docId: 'project', revision: 0, pages: {main: {id: 'main', name: 'Main', order: 0}}, nodes: {}};

it('Add and drop create nodes referencing the existing identity rather than duplicate ops that fork', () => {
  const added = libraryArtifactPlacement(artifact, doc, 'main');
  const dropped = libraryArtifactPlacement(artifact, doc, 'main', {x: 200, y: 100});
  for (const op of [added, dropped]) {
    expect(op?.type).toBe('create');
    if (op?.type !== 'create' || op.node.kind !== 'artifact') throw new Error('Expected artifact placement');
    expect(op.node.content).toEqual({artifactId: artifact.id, title: artifact.title, pagePath: artifact.pagePath});
    expect(op.node).not.toHaveProperty('provenance');
  }
  expect(added && 'node' in added && added.node.id).not.toBe(dropped && 'node' in dropped && dropped.node.id);
  expect(dropped && 'node' in dropped && dropped.node.x).toBe(200);
  expect(libraryArtifactPlacement({...artifact, readOnly: true}, doc, 'main')).toBeNull();
});

it('library placements use remembered dimensions and legacy records keep the default', () => {
  expect(libraryArtifactPlacement({ ...artifact, dimensions: { width: 390, height: 844 } }, doc, 'main')).toMatchObject({ node: { width: 390, height: 844 } });
  expect(libraryArtifactPlacement(artifact, doc, 'main')).toMatchObject({ node: { width: 480, height: 640 } });
});

it('drag carries a reference link, not the canvas clipboard payload or bytes', () => {
  const data = new Map<string, string>();
  const transfer = {effectAllowed: '', setData: (type: string, value: string) => data.set(type, value)};
  let prevented = false;
  const event = {dataTransfer: transfer, preventDefault: () => {prevented = true;}} as unknown as React.DragEvent;
  dragLibraryArtifact(event, artifact);
  expect(transfer.effectAllowed).toBe('move');
  expect(JSON.parse(data.get(ARTIFACT_PLACEMENT_TYPE)!)).toEqual({artifactId: artifact.id, pagePath: artifact.pagePath});
  expect(data.has(CANVAS_CLIPBOARD_TYPE)).toBe(false);
  data.clear();
  dragLibraryArtifact(event, {...artifact, readOnly: true});
  expect(prevented).toBe(true);
  expect(data.size).toBe(0);
});

it('drops a real bridge-shaped summary with shared identity and placement-only telemetry, refusing invalid or late destinations', async () => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const calls: CanvasOpRequest[] = [];
  const telemetry: RendererTelemetryEvent[] = [];
  let reply: ArtifactSummary | null = artifact;
  let reads = 0;
  const bridge = {artifactRead: async (): Promise<ArtifactSummary | null> => {reads += 1; return reply;}, telemetryEvent: (event: RendererTelemetryEvent) => telemetry.push(event)};
  Object.defineProperty(globalThis, 'window', {configurable: true, value: {studio: bridge}});
  const unused = (): never => {throw new Error('Unexpected canvas transport call');};
  const transport: CanvasTransport = {
    canvasOp: (request) => {calls.push(request);},
    canvasSnapshot: async () => unused(), canvasPageCameras: async () => unused(),
    canvasUndo: unused, canvasRedo: unused, onCanvasUpdate: unused, onCanvasRejected: unused,
    canvasViewport: unused, canvasCurrentPage: unused, canvasFrames: unused, onAgentWorkingFrames: unused, onCanvasFrameQuotes: unused,
  };
  seatCanvasTransport(transport);
  const raw = JSON.stringify({artifactId: artifact.id, pagePath: artifact.pagePath});
  try {
    resetCanvasStoreForTests();
    useCanvasStore.setState({doc, currentPageId: 'main'});
    expect(await dropLibraryArtifact(raw, {x: 123, y: 456})).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.op).toMatchObject({type: 'create', node: {x: 123, y: 456, content: {artifactId: artifact.id, pagePath: artifact.pagePath}}});
    expect(telemetry.map((event) => event.event)).toEqual(['artifact_placed']);
    calls.length = 0;
    const successfulReads = reads;
    for (const invalid of ['null', '{', raw.repeat(100), JSON.stringify({artifactId: '../private', pagePath: artifact.pagePath})]) {
      expect(await dropLibraryArtifact(invalid, {x: 0, y: 0})).toBe(false);
    }
    expect(reads).toBe(successfulReads);
    for (const refused of [null, {...artifact, readOnly: true}, {...artifact, pagePath: 'pages/other.html'}, {...artifact, pages: [...artifact.pages!, {path: 'pages/legacy.html', name: 'Legacy'}]}]) {
      reply = refused;
      expect(await dropLibraryArtifact(raw, {x: 0, y: 0})).toBe(false);
    }
    expect(calls).toHaveLength(0);
    let release: ((value: ArtifactSummary) => void) | undefined;
    bridge.artifactRead = () => new Promise((resolve) => {release = resolve;});
    const pending = dropLibraryArtifact(raw, {x: 0, y: 0});
    useCanvasStore.setState({doc: {...doc, docId: 'another-project'}});
    release!(artifact);
    expect(await pending).toBe(false);
    expect(calls).toHaveLength(0);
    useCanvasStore.setState({doc, currentPageId: 'main'});
    const pageSwitch = dropLibraryArtifact(raw, {x: 0, y: 0});
    useCanvasStore.setState({currentPageId: 'different-page'});
    release!(artifact);
    expect(await pageSwitch).toBe(false);
    expect(calls).toHaveLength(0);
    useCanvasStore.setState({doc, currentPageId: 'main'});
    bridge.artifactRead = async () => {throw new Error('Bridge unavailable');};
    expect(await dropLibraryArtifact(raw, {x: 0, y: 0})).toBe(false);
    expect(telemetry).toHaveLength(1);
  } finally {
    seatCanvasTransport(null);
    resetCanvasStoreForTests();
    if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});

it('Add without a drop point lands beside what is already placed, never over the canvas origin', () => {
  const calls: CanvasOpRequest[] = [];
  const unused = (): never => {throw new Error('Unexpected canvas transport call');};
  seatCanvasTransport({
    canvasOp: (request) => {calls.push(request);},
    canvasSnapshot: async () => unused(), canvasPageCameras: async () => unused(),
    canvasUndo: unused, canvasRedo: unused, onCanvasUpdate: unused, onCanvasRejected: unused,
    canvasViewport: unused, canvasCurrentPage: unused, canvasFrames: unused, onAgentWorkingFrames: unused, onCanvasFrameQuotes: unused,
  });
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', {configurable: true, value: {studio: {telemetryEvent: () => {}}}});
  try {
    resetCanvasStoreForTests();
    useCanvasStore.setState({doc, currentPageId: 'main', nodes: [{id: 'frame', type: 'frame', position: {x: 0, y: 0}, width: 1512, data: {}} as never]});
    expect(placeLibraryArtifact(artifact)).toBe(true);
    expect(calls[0]?.op).toMatchObject({type: 'create', node: {x: 1512 + 80, y: 0}});
    const op = calls[0]?.op;
    if (op?.type !== 'create') throw new Error('Expected artifact creation');
    // Nothing to fly to until main's echo carries the node, and nothing queued that could fire later.
    expect(useCanvasStore.getState().doc?.nodes[op.node.id]).toBeUndefined();
    expect(useCanvasStore.getState().flyTo).toBeNull();
    useCanvasStore.setState({doc: {...doc, nodes: {...doc.nodes, [op.node.id]: op.node}}});
    expect(useCanvasStore.getState().flyTo).toMatchObject({id: op.node.id, reveal: true});
  } finally {
    seatCanvasTransport(null);
    if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});

it('a page left before the placement lands keeps its camera, rather than a pan arriving later', () => {
  const calls: CanvasOpRequest[] = [];
  const unused = (): never => {throw new Error('Unexpected canvas transport call');};
  seatCanvasTransport({
    canvasOp: (request) => {calls.push(request);},
    canvasSnapshot: async () => unused(), canvasPageCameras: async () => unused(),
    canvasUndo: unused, canvasRedo: unused, onCanvasUpdate: unused, onCanvasRejected: unused,
    canvasViewport: unused, canvasCurrentPage: unused, canvasFrames: unused, onAgentWorkingFrames: unused, onCanvasFrameQuotes: unused,
  });
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', {configurable: true, value: {studio: {telemetryEvent: () => {}}}});
  try {
    resetCanvasStoreForTests();
    useCanvasStore.setState({doc, currentPageId: 'main', nodes: []});
    expect(placeLibraryArtifact(artifact)).toBe(true);
    const op = calls[0]?.op;
    if (op?.type !== 'create') throw new Error('Expected artifact creation');
    useCanvasStore.setState({currentPageId: 'other'});
    useCanvasStore.setState({doc: {...doc, nodes: {...doc.nodes, [op.node.id]: op.node}}});
    expect(useCanvasStore.getState().flyTo).toBeNull();
  } finally {
    seatCanvasTransport(null);
    resetCanvasStoreForTests();
    if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});
