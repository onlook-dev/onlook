import { usePanelsStore } from '../panels/store.js';
import { leftOverlayWidth, type LeftPanelView } from '../rail/leftPanel.js';
import { isRailHidden, useCanvasStore } from './store.js';

export interface PanelCover {
  /** How much of the canvas the rail and the left panel cover, in window pixels. */
  start: number;
  /** The same for the chat panel. */
  end: number;
}

export interface CoverState {
  view: LeftPanelView;
  sidebar: number;
  code: number;
  chat: number;
  hidden: { left: boolean; right: boolean };
}


/** What the panels cover of the canvas. An overlay inset, not a column budget: React Flow's container keeps `inset: 0` and only the floating controls measure from here (ONL-1889, ONL-2563). */
export function panelCover(state: CoverState): PanelCover {
  return {
    start: state.hidden.left
      ? 0
      : leftOverlayWidth(state.view, { sidebar: state.sidebar, code: state.code, end: state.chat }),
    end: state.hidden.right ? 0 : state.chat,
  };
}

/** The same, live: it re-reads through a drag, because the panel store is written per pointermove. */
export function usePanelCover(): PanelCover {
  const view = useCanvasStore((state) => state.leftPanelView);
  const left = useCanvasStore((state) => isRailHidden(state, 'left'));
  const right = useCanvasStore((state) => isRailHidden(state, 'right'));
  const sidebar = usePanelsStore((state) => state.sidebar);
  const code = usePanelsStore((state) => state.code);
  const chat = usePanelsStore((state) => state.end);
  return panelCover({ view, sidebar, code, chat, hidden: { left, right } });
}
