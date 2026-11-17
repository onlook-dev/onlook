import { afterEach, beforeEach, expect, it } from 'bun:test';
import type { ArtifactNode, ArtifactSummary, CanvasDoc } from '@studio/events';
import { t } from '@studio/i18n';
import { useArtifactListing, resetArtifactListingForTests } from './artifact/listing.js';
import { canvasNodeLabeller } from '../nodeLabel.js';
import { canvasNodeLabelFacts } from './selection.js';
import { resetCanvasStoreForTests, useCanvasStore } from './store.js';

beforeEach(() => {
  resetCanvasStoreForTests();
  resetArtifactListingForTests();
});

afterEach(() => {
  resetCanvasStoreForTests();
  resetArtifactListingForTests();
});

it('uses current catalog titles and distinct identity tags for stale canvas nodes and their delete asks', () => {
  const nodes: ArtifactNode[] = ['12340000-1111-4111-8111-aaaaaaaaaaaa', '12340001-2222-4222-8222-bbbbbbbbbbbb'].map((artifactId, index) => ({
    id: `node-${index}`, pageId: 'main', kind: 'artifact', name: '', x: index * 400, y: 0, width: 300, height: 200, order: index,
    content: {artifactId, title: `Old title ${index}`},
  }));
  const records: ArtifactSummary[] = nodes.map((node) => ({id: node.content.artifactId, title: 'Pricing', pagePath: 'pages/index.html', updatedAt: '', readOnly: false}));
  const doc: CanvasDoc = {schemaVersion: 1, docId: 'labels', revision: 0, pages: {main: {id: 'main', name: 'Designs', order: 0}}, nodes: Object.fromEntries(nodes.map((node) => [node.id, node]))};
  useCanvasStore.setState({doc});
  useArtifactListing.setState({records});
  const titleMap = new Map(records.map((record) => [record.id, record.title]));
  const labelOf = canvasNodeLabeller(nodes.map(canvasNodeLabelFacts), t, titleMap);
  const labels = nodes.map((node) => labelOf(canvasNodeLabelFacts(node)));
  expect(labels).toEqual(['Pricing · 12340000', 'Pricing · 12340001']);
  const asks = nodes.map((node) => {
    useCanvasStore.getState().askDeleteArtifact(node.id);
    return useCanvasStore.getState().artifactDeleteAsk;
  });
  expect(asks).toEqual(nodes.map((node, index) => ({nodeId: node.id, title: labels[index]})));
  expect(nodes.map((node) => node.content.title)).toEqual(['Old title 0', 'Old title 1']);
  useArtifactListing.setState({records: null, error: true});
  useCanvasStore.getState().askDeleteArtifact(nodes[0]!.id);
  expect(useCanvasStore.getState().artifactDeleteAsk).toEqual({nodeId: nodes[0]!.id, title: 'Old title 0'});
});

it('hides an artifact from the shared listing when its Canvas deletion is pending (ONL-2873)', async () => {
  const originalWindow = globalThis.window;
  const artifactId = '12340000-1111-4111-8111-aaaaaaaaaaaa';
  const node: ArtifactNode = { id: 'artifact', pageId: 'main', kind: 'artifact', name: '', x: 0, y: 0, width: 300, height: 200, order: 0, content: { artifactId, title: 'Pricing' } };
  const record: ArtifactSummary = { id: artifactId, title: 'Pricing', pagePath: 'pages/index.html', updatedAt: '', readOnly: false };
  useCanvasStore.setState({ doc: { schemaVersion: 1, docId: 'removal', revision: 0, pages: { main: { id: 'main', name: 'Designs', order: 0 } }, nodes: { artifact: node } } });
  useArtifactListing.setState({ records: [record] });
  const deletion = Promise.withResolvers<{ ok: true }>();
  globalThis.window = { studio: { artifactDelete: () => deletion.promise, artifactList: async () => [] } } as unknown as Window & typeof globalThis;
  try {
    const pending = useCanvasStore.getState().deleteArtifact(node.id);
    expect(useArtifactListing.getState().records).toEqual([]);
    expect(useArtifactListing.getState().deletingIds).toEqual([artifactId]);
    deletion.resolve({ ok: true });
    await pending;
    expect(useArtifactListing.getState().records).toEqual([]);
    expect(useArtifactListing.getState().deletingIds).toEqual([]);
  } finally {
    globalThis.window = originalWindow;
  }
});
