import { afterEach, expect, it } from 'bun:test';
import type { ArtifactPickResult, StudioBridge } from '@studio/events';
import { resetSettingsPrimeForTests, useSettingsStore } from '../../settings/store.js';
import { useCanvasStore, resetCanvasStoreForTests } from '../store.js';
import { applyArtifactPick, isArtifactPickerLive } from './useArtifactPicker.js';

afterEach(() => {
  resetCanvasStoreForTests();
  resetSettingsPrimeForTests();
  Reflect.deleteProperty(globalThis, 'window');
});
const selected: ArtifactPickResult = { outcome: 'selected', evidence: { kind: 'element', id: 'artifact:2:heading', tag: 'h1', domPath: 'html:nth-of-type(1)>body:nth-of-type(1)>h1:nth-of-type(1)', classes: [], textContent: 'Sketch', outerHtmlSnippet: '<h1>', frameUrl: 'studio-artifact://aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa/pages/index.html' }, rect: {x: 12, y: 30, width: 80, height: 24} };

it('leaves the first click and shift-click on another artifact to whole-node selection', () => {
  expect(isArtifactPickerLive(useCanvasStore.getState(), 'node')).toBe(false);
  useCanvasStore.setState({selectedNodeIds: ['other']});
  expect(isArtifactPickerLive(useCanvasStore.getState(), 'node')).toBe(false);
  useCanvasStore.setState({selectedNodeIds: ['node']});
  expect(isArtifactPickerLive(useCanvasStore.getState(), 'node')).toBe(true);
  applyArtifactPick(selected, 'node', false);
  expect(isArtifactPickerLive(useCanvasStore.getState(), 'node')).toBe(true);
  useCanvasStore.setState({mode: 'interact'});
  expect(isArtifactPickerLive(useCanvasStore.getState(), 'node')).toBe(false);
  useCanvasStore.setState({mode: 'design', tool: 'pan'});
  expect(isArtifactPickerLive(useCanvasStore.getState(), 'node')).toBe(false);
});

it('selects artifact DOM through existing bounded evidence and outline state without source mapping', () => {
  applyArtifactPick(selected, 'node', false);
  expect(useCanvasStore.getState().elementSelections).toMatchObject([{frameNodeId: 'node', evidence: selected.evidence, stale: false}]);
  expect(useCanvasStore.getState().elementAnchorRects[selected.evidence.id]).toEqual(selected.rect);
  expect(useCanvasStore.getState().elementMappings).toEqual({});
});

it('whole-frame picks clear inner evidence while shift retains gathered elements', () => {
  applyArtifactPick(selected, 'node', false);
  applyArtifactPick({outcome: 'none'}, 'node', true);
  expect(useCanvasStore.getState().elementSelections).toHaveLength(1);
  applyArtifactPick({outcome: 'none'}, 'node', false);
  expect(useCanvasStore.getState().elementSelections).toHaveLength(0);
});

it('unavailable reads do not clear the designer’s current selection', () => {
  applyArtifactPick(selected, 'node', false);
  const before = useCanvasStore.getState().elementSelections;
  applyArtifactPick({outcome: 'unavailable'}, 'node', false);
  expect(useCanvasStore.getState().elementSelections).toBe(before);
});

it('shift-regathers fresh evidence after an in-place reload without discarding the other selections', () => {
  applyArtifactPick(selected, 'node', false);
  const other = { ...selected, evidence: { ...selected.evidence, id: 'other', textContent: 'Reference' } };
  applyArtifactPick(other, 'node', true);
  useCanvasStore.getState().setElementStale(selected.evidence.id, true);
  const updated = { ...selected, evidence: { ...selected.evidence, textContent: 'Updated sketch', classes: ['fresh'] } };
  applyArtifactPick(updated, 'node', true);
  expect(useCanvasStore.getState().elementSelections).toMatchObject([
    { evidence: updated.evidence, stale: false },
    { evidence: other.evidence, stale: false },
  ]);
});

it('the first element picked dismisses the tips pill for good, and a whole-frame pick does not', () => {
  const sources: unknown[] = [];
  const studio: Pick<StudioBridge, 'settingsDismissTipsPill' | 'telemetryEvent'> = {
    settingsDismissTipsPill: async () => ({ tipsPillDismissed: true }),
    telemetryEvent: (event) => { if (event.event === 'tips_pill_dismissed') sources.push(event.properties.source); },
  };
  Object.defineProperty(globalThis, 'window', { value: { studio }, configurable: true, writable: true });
  useSettingsStore.getState().apply({});
  applyArtifactPick({outcome: 'none'}, 'node', false);
  expect(useSettingsStore.getState().tipsPillDismissed).toBe(false);
  applyArtifactPick(selected, 'node', false);
  expect(useSettingsStore.getState().tipsPillDismissed).toBe(true);
  expect(sources).toEqual(['selection']);
});
