import { useRef, useState, type ReactNode } from 'react';
import type { RendererTelemetryEventMap } from '@studio/events';
import { ContextMenu } from '@astryxdesign/core/ContextMenu';
import { DropdownMenuItem } from '@astryxdesign/core/DropdownMenu';
import { Divider } from '@astryxdesign/core/Divider';
import { useFlag } from '../../flags/store.js';
import { t } from '@studio/i18n';
import { MENU_SURFACE, MenuKeyHint } from '../../menu/surface.js';
import { shortcutGlyph } from '../../shortcuts/glyphs.js';
import { useCanvasStore } from '../store.js';
import { sendTelemetry } from '../telemetry.js';
import { useCanvasMenuDismissal } from './useCanvasMenuDismissal.js';
import './menu.css';

function noteCommand(command: RendererTelemetryEventMap['canvas_menu_used']['action']): void {
  sendTelemetry({ event: 'canvas_menu_used', properties: { action: command } });
}

export function CanvasPaneMenu({ children, fitAll, paste }: {
  children: ReactNode;
  fitAll: () => void;
  paste: (point: { x: number; y: number }) => void;
}): React.JSX.Element {
  const point = useRef({ x: 0, y: 0 });
  const surface = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  useCanvasMenuDismissal(isOpen);
  const hasNodes = useCanvasStore((state) => state.nodes.length > 0);
  const hasDoc = useCanvasStore((state) => state.doc !== null);
  const canAdd = useCanvasStore((state) => state.mode !== 'interact' && state.leftPanelView !== 'code');
  const hasSections = useFlag('sections');
  return <div className="canvas-pane-context" style={{ height: '100%' }}>
    <ContextMenu label={t('canvas.menu.label')} data-testid="canvas-pane-menu" menuWidth={220} style={MENU_SURFACE} onOpenChange={setIsOpen}
      menuContent={<>
        <DropdownMenuItem label={t('canvas.menu.paste')} isDisabled={!hasDoc} endContent={<MenuKeyHint keys="⌘V" />}
          onClick={() => {
            noteCommand('paste');
            const anchor = { ...point.current };
            requestAnimationFrame(() => { surface.current?.focus({ preventScroll: true }); paste(anchor); });
          }} />
        <DropdownMenuItem label={t('canvas.menu.selectAll')} isDisabled={!hasNodes}
          onClick={() => { noteCommand('select-all'); const store = useCanvasStore.getState(); store.onNodesChange(store.nodes.map((node) => ({ type: 'select', id: node.id, selected: true }))); }} />
        {canAdd && <>
          <Divider isFullBleed />
          {hasSections && <DropdownMenuItem label={t('canvas.tool.section')} isDisabled={!hasDoc} endContent={<MenuKeyHint keys={shortcutGlyph('canvas.tool-section')} />}
            onClick={() => { noteCommand('section'); useCanvasStore.getState().setTool('section'); }} />}
          <DropdownMenuItem label={t('canvas.tool.text')} isDisabled={!hasDoc} endContent={<MenuKeyHint keys={shortcutGlyph('canvas.tool-text')} />}
            onClick={() => { noteCommand('text'); useCanvasStore.getState().setTool('text'); }} />
        </>}
        <Divider isFullBleed />
        <DropdownMenuItem label={t('canvas.menu.fit')} isDisabled={!hasNodes} onClick={() => { noteCommand('fit'); fitAll(); }} />
      </>}>
      <div ref={surface} tabIndex={-1} style={{ height: '100%', outline: 'none' }} onContextMenu={(event) => {
        if (!(event.target instanceof Element) || !event.target.classList.contains('react-flow__pane')) {
          event.stopPropagation();
          return;
        }
        point.current = { x: event.clientX, y: event.clientY };
      }}>{children}</div>
    </ContextMenu>
  </div>;
}
