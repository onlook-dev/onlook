import { useCanvasStore } from '../canvas/store.js';
import { useSettingsStore } from '../settings/store.js';
import { shownLeftPanelView, type LeftPanelView } from './leftPanel.js';

export function useLeftPanelView(): LeftPanelView {
  const isCodeEnabled = useSettingsStore((state) => state.experimentalCodePanel);
  return shownLeftPanelView(useCanvasStore((state) => state.leftPanelView), isCodeEnabled);
}
