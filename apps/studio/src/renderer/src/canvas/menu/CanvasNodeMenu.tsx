import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { openExportPanel } from '../artifact/exportPanelState.js';
import { requestComposerFocus, requestComposerText } from '../../chat/composerRequest.js';
import { useWorkspaceStore } from '../../workspace/store.js';
import { sendTelemetry } from '../telemetry.js';
import { ContextMenu } from '@astryxdesign/core/ContextMenu';
import { Divider } from '@astryxdesign/core/Divider';
import { DropdownMenuItem } from '@astryxdesign/core/DropdownMenu';
import { Icon } from '@astryxdesign/core/Icon';
import type { CodeMapping, CanvasNodeId, CanvasPageId, ViewRect } from '@studio/events';
import { t } from '@studio/i18n';
import { ForwardIcon } from '../../icons/glyphs.js';
import { Submenu } from '../../menu/Submenu.jsx';
import { MENU_SURFACE, MenuKeyHint } from '../../menu/surface.js';
import { shortcutGlyph } from '../../shortcuts/glyphs.js';
import { useLatestRef } from '../../useLatestRef.js';
import { isCodePanelVisible, noteCodeOpened, useSelectionMappingRequest } from '../../code/selectionMapping.js';
import { useCodeStore } from '../../code/store.js';
import { useSettingsStore } from '../../settings/store.js';
import { useCanvasStore } from '../store.js';
import { correctedAnchorPoint } from './anchorPoint.js';
import { useCanvasMenuDismissal } from './useCanvasMenuDismissal.js';
import {
  canvasMenuItems,
  menuSelectionFor,
  type CanvasMenuSelection,
  type CanvasMenuVerb,
} from './items.js';

/** The flow rect a duplicate is placed inside; a panel row, outside React Flow, has none. */
type ReadViewRect = () => ViewRect | undefined;

/** The selected element's mapping, held beside the anchor rects (ONL-2563). */
function selectedMapping(): CodeMapping | null {
  const state = useCanvasStore.getState();
  const id = state.elementSelections[0]?.evidence.id;
  return id === undefined ? null : (state.elementMappings[id] ?? null);
}

function runVerb(
  verb: CanvasMenuVerb,
  selection: CanvasMenuSelection,
  view: ViewRect | undefined,
): void {
  if (verb === 'open-element' || verb === 'open-component') {
    if (!useSettingsStore.getState().experimentalCodePanel) return;
    const mapping = selectedMapping();
    if (mapping === null) return;
    const target = verb === 'open-element' ? mapping : mapping.definition;
    if (target === null) return;
    noteCodeOpened('menu', verb === 'open-element' ? 'element' : 'component', mapping.grade);
    // The panel may never have been opened; the view switch is part of the verb.
    useCanvasStore.getState().setLeftPanelView('code');
    void useCodeStore.getState().open(target.path, target.line);
    return;
  }
  const target = selection.targets[0];
  if (target === undefined) return;
  const store = useCanvasStore.getState();
  switch (verb) {
    case 'duplicate':
      store.duplicateSelectedFrame(view);
      return;
    case 'restore-aspect-ratio':
      store.restoreImageAspectRatio(target.id);
      return;
    case 'bring-to-front':
      store.stackNode(target.id, 'front');
      return;
    case 'send-to-back':
      store.stackNode(target.id, 'back');
      return;
    case 'delete':
      store.removeFrame(target.id);
      return;
    case 'delete-artifact':
      // Asks first, in the app, the way deleting a page asks: the dialog names what is destroyed.
      store.askDeleteArtifact(target.id);
      return;
    case 'export-artifact': {
      // The right rail's export panel: a preview, the format, then the save sheet (ONL-2593).
      openExportPanel();
      return;
    }
    case 'attach-artifact':
      useCanvasStore.setState({ selectedNodeIds: [target.id] });
      requestComposerFocus();
      return;
    case 'handoff-artifact': {
      const workspace = useWorkspaceStore.getState().workspace;
      if (workspace === null) return;
      useCanvasStore.setState({ selectedNodeIds: [target.id] });
      requestComposerText(t('artifact.chat.handoffPrompt'), true);
      sendTelemetry({ event: 'artifact_handoff_requested', properties: { count: 1 } });
      return;
    }
  }
}

/* Delete is React Flow's default `deleteKeyCode`. */
const KEY_HINTS: Partial<Record<string, string>> = {
  duplicate: shortcutGlyph('canvas.duplicate-frame'),
  'bring-to-front': shortcutGlyph('canvas.bring-to-front'),
  'send-to-back': shortcutGlyph('canvas.send-to-back'),
  delete: '⌫',
};

function moveToPage(selection: CanvasMenuSelection, pageId: CanvasPageId): void {
  useCanvasStore.getState().moveNodesToPage(
    selection.targets.map((target) => target.id),
    pageId,
  );
}

function CanvasNodeMenuItems({
  nodeId,
  isMenuOpen,
  readViewRect,
}: {
  nodeId: CanvasNodeId;
  isMenuOpen: boolean;
  readViewRect?: ReadViewRect;
}): React.JSX.Element | null {
  const codeEnabled = useSettingsStore((state) => state.experimentalCodePanel);
  const isCodeVisible = useCanvasStore(isCodePanelVisible);
  // Code's canvas hook is the sole requester while visible; otherwise ask only on right-click.
  useSelectionMappingRequest(isMenuOpen && !isCodeVisible);
  const doc = useCanvasStore((state) => state.doc);
  const selectedNodeIds = useCanvasStore((state) => state.selectedNodeIds);
  const selection = useMemo(
    () => menuSelectionFor({ doc, selectedNodeIds }, nodeId),
    [doc, selectedNodeIds, nodeId],
  );
  const mapping = useCanvasStore((state) => {
    const id = state.elementSelections[0]?.evidence.id;
    return id === undefined ? null : (state.elementMappings[id] ?? null);
  });
  const items = useMemo(
    () =>
      canvasMenuItems(
        selection,
        !codeEnabled || mapping === null
          ? null
          : { component: mapping.component, hasDefinition: mapping.definition !== null },
      ),
    [selection, mapping, codeEnabled],
  );
  if (items.length === 0) return null;
  return (
    <>
      {items.map((item) => (
        <Fragment key={item.verb}>
          {item.isGroupStart ? <Divider isFullBleed /> : null}
          {item.verb === 'move-to-page' ? (
            <Submenu
              label={t(item.labelKey)}
              isParentOpen={isMenuOpen}
              row={
                <DropdownMenuItem
                  label={t(item.labelKey)}
                  endContent={<Icon icon={ForwardIcon} size="sm" color="secondary" />}
                />
              }
            >
              {item.pages.map((page) => (
                <DropdownMenuItem
                  key={page.id}
                  label={page.name}
                  onClick={() => {
                    moveToPage(selection, page.id);
                  }}
                />
              ))}
            </Submenu>
          ) : (
            <DropdownMenuItem
              label={t(item.labelKey)}
              {...(KEY_HINTS[item.verb] === undefined
                ? {}
                : { endContent: <MenuKeyHint keys={KEY_HINTS[item.verb] ?? ''} /> })}
              onClick={() => {
                runVerb(item.verb, selection, readViewRect?.());
              }}
            />
          )}
        </Fragment>
      ))}
    </>
  );
}

export interface CanvasNodeMenuProps {
  nodeId: CanvasNodeId;
  readViewRect?: ReadViewRect;
  /** The canvas zoom the trigger is drawn at; a Designs row sits outside the flow and passes none. */
  readZoom?: () => number;
  /** The right-click target. */
  children: React.ReactNode;
}

/** One menu of verbs for any node kind, reachable from the canvas and from the Designs row (ONL-2486). */
export function CanvasNodeMenu({
  nodeId,
  readViewRect,
  readZoom,
  children,
}: CanvasNodeMenuProps): React.JSX.Element {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement | null>(null);
  // Read at event time, never a listener dep: `readZoom` is a fresh closure every render.
  const readZoomRef = useLatestRef(readZoom);

  useEffect(() => {
    const trigger = triggerRef.current;
    if (trigger === null) return;
    // Capture on the trigger itself: Astryx's handler is a React prop, so it runs at the root on the
    // way back up and never sees an event stopped here.
    const onContextMenu = (event: MouseEvent): void => {
      const zoom = readZoomRef.current?.();
      if (zoom === undefined) return;
      const rect = trigger.getBoundingClientRect();
      const corrected = correctedAnchorPoint({
        client: { x: event.clientX, y: event.clientY },
        origin: { x: rect.left, y: rect.top },
        zoom,
        detail: event.detail,
        isTrusted: event.isTrusted,
      });
      if (corrected === null) return;
      event.preventDefault();
      event.stopPropagation();
      trigger.dispatchEvent(
        new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          clientX: corrected.x,
          clientY: corrected.y,
          detail: event.detail,
        }),
      );
    };
    trigger.addEventListener('contextmenu', onContextMenu, true);
    return () => {
      trigger.removeEventListener('contextmenu', onContextMenu, true);
    };
  }, [readZoomRef]);

  useCanvasMenuDismissal(isMenuOpen);

  return (
    <ContextMenu
      ref={triggerRef}
      label={t('canvas.node.menu.label')}
      menuContent={
        <CanvasNodeMenuItems
          nodeId={nodeId}
          isMenuOpen={isMenuOpen}
          {...(readViewRect ? { readViewRect } : {})}
        />
      }
      menuWidth={200}
      style={MENU_SURFACE}
      // The verbs act on the selection, so opening on an unselected node claims it first.
      onOpenChange={(isOpen) => {
        setIsMenuOpen(isOpen);
        if (!isOpen) return;
        const state = useCanvasStore.getState();
        if (!state.selectedNodeIds.includes(nodeId)) state.selectFrame(nodeId, false);
      }}
      data-testid="canvas-node-menu"
    >
      {children}
    </ContextMenu>
  );
}
