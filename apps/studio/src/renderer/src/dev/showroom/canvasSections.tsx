import { useLayoutEffect, useRef } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { Text } from '@astryxdesign/core/Text';
import type { CanvasDoc } from '@studio/events';
import { Canvas } from '../../canvas/Canvas.js';
import { seedFlags } from '../../flags/store.js';
import { FrameChips } from '../../chat/FrameChips.js';
import { Sidebar } from '../../sidebar/Sidebar.js';
import { useCanvasStore } from '../../canvas/store.js';
import type { Category } from './Showroom.js';

type SectionState = 'default' | 'selected' | 'nested' | 'name-focus' | 'renaming' | 'menu-empty' | 'menu-populated' | 'node-menu' | 'tool-focus' | 'tool-hover' | 'surfaces' | 'flag-off';

function SectionScene({ state }: { state: SectionState }): React.JSX.Element {
  const root = useRef<HTMLDivElement>(null);
  const docId = useCanvasStore((canvas) => canvas.doc?.docId);
  useLayoutEffect(() => {
    /* This gallery is the Section feature itself, which ships behind the alpha flag; one story stands for the build without it (ONL-2661). */
    seedFlags({ sections: state !== 'flag-off', connectors: false, 'blank-first-moment': true });
    const empty = state === 'menu-empty';
    const doc: CanvasDoc = {
      schemaVersion: 1, docId: `showroom-sections-${state}`, revision: 0,
      pages: { sections: { id: 'sections', name: 'Explorations', order: 0 } },
      nodes: empty ? {} : {
        section: { id: 'section', kind: 'section', pageId: 'sections', name: 'Venue tile explorations', x: 60, y: 100, width: 680, height: 260, order: 2, content: {} },
        option: { id: 'option', kind: 'text', pageId: 'sections', name: '', x: 100, y: 160, width: 320, height: 48, order: 0, content: { text: 'Venue tiles — Option A', size: 'medium' } },
        ...(state === 'nested' ? { outer: { id: 'outer', kind: 'section' as const, pageId: 'sections', name: 'Design explorations', x: 30, y: 50, width: 740, height: 350, order: 3, content: {} } } : {}),
      },
    };
    if (docId !== doc.docId) {
      useCanvasStore.setState({ currentPageId: null, mountFitDone: true, restoredViewport: null, tool: 'select', mode: 'design', leftPanelView: 'designs' });
      useCanvasStore.getState().replaceDoc(doc);
      useCanvasStore.getState().deselectFrames();
      if (state === 'selected' || state === 'renaming' || state === 'node-menu' || state === 'surfaces') useCanvasStore.getState().selectFrame('section', false);
      return;
    }
    const applyState = (): boolean => {
      const name = root.current?.querySelector<HTMLButtonElement>('[data-testid="canvas-section-name"]');
      if ((state === 'name-focus' || state === 'renaming') && !name) return false;
      if (state === 'name-focus') name?.focus();
      if (state === 'renaming') name?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      if (state === 'node-menu') {
        const trigger = root.current?.querySelector('[data-frame-id="section"]')?.closest('[data-testid="canvas-node-menu"]');
        if (!trigger) return false;
        requestAnimationFrame(() => {
          if (!trigger.isConnected) return;
          const box = trigger.getBoundingClientRect();
          trigger.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2, clientX: box.x + 20, clientY: box.y + 10 }));
        });
      }
      if (state === 'menu-empty' || state === 'menu-populated' || state === 'flag-off') {
        const pane = root.current?.querySelector('.react-flow__pane');
        const box = pane?.getBoundingClientRect();
        if (!box) return false;
        pane?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2, clientX: box.x + 360, clientY: box.y + 140 }));
      }
      const tool = root.current?.querySelector<HTMLButtonElement>('[data-preview="section"] button');
      if (state === 'tool-focus') tool?.focus();
      if (state === 'tool-hover') tool?.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
      return true;
    };
    if (applyState() || !root.current) return;
    const observer = new MutationObserver(() => { if (applyState()) observer.disconnect(); });
    observer.observe(root.current, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [state, docId]);
  return <div ref={root} style={{ width: 900, height: 480, position: 'relative', background: 'var(--studio-ground)' }}>{state === 'surfaces' || state === 'node-menu'
    ? <div style={{ display: 'flex', gap: 24, padding: 16 }}><div style={{ width: 260, height: 400 }}><Sidebar /></div><div><FrameChips objects={[{ id: 'section', kind: 'section', name: 'Venue tile explorations', label: 'Venue tile explorations' }]} onRemove={() => undefined} /></div></div>
    : state === 'flag-off'
      // The same document as `default`, on a build that answered the flag off: list, toolbar, Canvas and menu in one frame.
      ? <div style={{ display: 'flex', height: '100%' }}><div style={{ width: 240, flexShrink: 0 }}><Sidebar /></div><div style={{ flex: '1 1 0', position: 'relative' }}><ReactFlowProvider><Canvas /></ReactFlowProvider></div></div>
      : <ReactFlowProvider><Canvas /></ReactFlowProvider>}</div>;
}

export const CANVAS_SECTIONS: Category = {
  id: 'sections', title: 'Sections and Canvas commands',
  stories: (['default', 'selected', 'nested', 'name-focus', 'renaming', 'menu-empty', 'menu-populated', 'node-menu', 'tool-focus', 'tool-hover', 'surfaces', 'flag-off'] as const).map((state) => ({
    id: `canvas-sections-${state}`, title: state, wide: true,
    render: (context) => context?.isIsolated
      ? <SectionScene state={state} />
      : <Text size="sm" color="secondary">Open this state from the sidebar.</Text>,
  })),
};
