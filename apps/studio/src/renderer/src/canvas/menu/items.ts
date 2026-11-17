import {
  canvasPages,
  isDividerPage,
  resolveNodePageId,
  type CanvasDoc,
  type CanvasNode,
  type CanvasNodeId,
  type CanvasPageId,
} from '@studio/events';
import type { StringKey } from '@studio/i18n';

type CanvasNodeKind = CanvasNode['kind'];

export type CanvasMenuVerb =
  | 'open-element'
  | 'open-component'
  | 'duplicate'
  | 'restore-aspect-ratio'
  | 'bring-to-front'
  | 'send-to-back'
  | 'delete'
  | 'delete-artifact'
  | 'export-artifact'
  | 'attach-artifact'
  | 'handoff-artifact';

interface CanvasMenuItemBase {
  labelKey: StringKey;
  /** A rule is drawn above it. */
  isGroupStart: boolean;
}

interface CanvasMenuVerbItem extends CanvasMenuItemBase {
  verb: CanvasMenuVerb;
}

interface CanvasMenuPage {
  id: CanvasPageId;
  name: string;
}

/** The one item that opens a flyout rather than acting (ONL-2488). */
interface CanvasMenuMoveItem extends CanvasMenuItemBase {
  verb: 'move-to-page';
  pages: CanvasMenuPage[];
}

export type CanvasMenuItem = CanvasMenuVerbItem | CanvasMenuMoveItem;

interface CanvasMenuTarget {
  id: CanvasNodeId;
  kind: CanvasNodeKind;
}

/** What the mapper made of the selected element. `component` is the dev transform's name, read from the mapper's result and never re-derived here (ONL-2563). */
export interface CanvasMenuElement {
  component: string | null;
  /** Open component is offered only when the mapper found where it is declared. */
  hasDefinition: boolean;
}

export interface CanvasMenuSelection {
  /** What the verbs act on, in selection order; empty means no menu. */
  targets: CanvasMenuTarget[];
  /** Where the targets may go: every page in order but the ones they sit on, dividers dropped (ONL-2488). */
  movePages: CanvasMenuPage[];
}

interface Entry {
  verb: CanvasMenuItem['verb'];
  labelKey: StringKey;
  /** Omitted offers the verb on every kind. */
  kinds?: readonly CanvasNodeKind[];
  /** The stack has one answer per node, so these verbs leave a multi-selection. */
  needsOneNode?: true;
  /** Dropped when the targets have nowhere to go. */
  needsMovePages?: true;
  opensGroup?: true;
}

/** The order the canvas node and the Designs row both draw, so the two cannot drift (ONL-2486). */
const ENTRIES: readonly Entry[] = [
  { verb: 'duplicate', labelKey: 'canvas.node.menu.duplicate' },
  { verb: 'attach-artifact', labelKey: 'artifact.chat.attach', kinds: ['artifact'], needsOneNode: true },
  { verb: 'handoff-artifact', labelKey: 'artifact.chat.handoff', kinds: ['artifact'], needsOneNode: true },
  { verb: 'export-artifact', labelKey: 'artifact.export.open', kinds: ['artifact', 'browser'] },
  {
    verb: 'restore-aspect-ratio',
    labelKey: 'canvas.node.menu.restoreAspectRatio',
    kinds: ['image'],
    needsOneNode: true,
  },
  {
    verb: 'bring-to-front',
    labelKey: 'canvas.node.menu.bringToFront',
    kinds: ['browser', 'text', 'image', 'artifact'],
    needsOneNode: true,
    opensGroup: true,
  },
  { verb: 'send-to-back', labelKey: 'canvas.node.menu.sendToBack', kinds: ['browser', 'text', 'image', 'artifact'], needsOneNode: true },
  {
    verb: 'move-to-page',
    labelKey: 'canvas.node.menu.moveToPage',
    needsMovePages: true,
    opensGroup: true,
  },
  { verb: 'delete', labelKey: 'canvas.node.menu.delete', opensGroup: true },
  // A different act from `delete`, which removes the node: this destroys the artifact
  // everywhere it appears, so it is its own row and asks first (ONL-2568).
  {
    verb: 'delete-artifact',
    labelKey: 'canvas.artifact.delete',
    kinds: ['artifact'],
    needsOneNode: true,
  },
];

/** The right-clicked node inside the selection takes the selection with it, as ⌘D and Delete do. */
export function menuSelectionFor(
  state: { doc: CanvasDoc | null; selectedNodeIds: readonly CanvasNodeId[] },
  id: CanvasNodeId,
): CanvasMenuSelection {
  const doc = state.doc;
  const node = doc === null ? undefined : doc.nodes[id];
  if (doc === null || node === undefined) return { targets: [], movePages: [] };
  const ids = state.selectedNodeIds.includes(id)
    ? state.selectedNodeIds.filter((held) => doc.nodes[held] !== undefined)
    : [id];
  const held = ids.flatMap((memberId) => {
    const member = doc.nodes[memberId];
    return member === undefined ? [] : [member];
  });
  const occupied = new Set(held.map((member) => resolveNodePageId(doc, member)));
  return {
    targets: held.map((member) => ({ id: member.id, kind: member.kind })),
    movePages: canvasPages(doc).flatMap((page) =>
      isDividerPage(page) || occupied.has(page.id) ? [] : [{ id: page.id, name: page.name }],
    ),
  };
}

/** Above a rule, with the Frame's own verbs below it unchanged (ONL-2563). */
function elementItems(element: CanvasMenuElement | null): CanvasMenuVerbItem[] {
  if (element === null) return [];
  const items: CanvasMenuVerbItem[] = [
    { verb: 'open-element', labelKey: 'canvas.node.menu.openElement', isGroupStart: false },
  ];
  if (element.component !== null && element.hasDefinition) {
    items.push({ verb: 'open-component', labelKey: 'canvas.node.menu.openComponent', isGroupStart: false });
  }
  return items;
}

export function canvasMenuItems(
  selection: CanvasMenuSelection,
  element: CanvasMenuElement | null = null,
): CanvasMenuItem[] {
  const kinds = new Set(selection.targets.map((target) => target.kind));
  if (kinds.size === 0) return [];
  const shown = ENTRIES.filter(
    (entry) =>
      (entry.needsOneNode !== true || selection.targets.length === 1) &&
      (entry.needsMovePages !== true || selection.movePages.length > 0) &&
      (entry.kinds === undefined || [...kinds].every((kind) => entry.kinds?.includes(kind))),
  );
  const above = elementItems(element);
  const frameItems = shown.map((entry, index) => {
    // The first Frame verb opens a group when an element group sits above it.
    const isGroupStart = (index > 0 || above.length > 0) && (index > 0 ? entry.opensGroup === true : true);
    return entry.verb === 'move-to-page'
      ? { verb: entry.verb, labelKey: entry.labelKey, isGroupStart, pages: selection.movePages }
      : { verb: entry.verb, labelKey: entry.labelKey, isGroupStart };
  });
  return [...above, ...frameItems];
}
