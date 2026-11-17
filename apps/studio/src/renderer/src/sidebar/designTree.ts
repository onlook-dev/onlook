import { isInsideSection, type SectionBox } from '@studio/events';

import { SECTION_NODE_TYPE, type CanvasFlowNode } from '../canvas/model.js';

export interface DesignTreeRow {
  node: CanvasFlowNode;
  /** 0 at the top level, one more for each Section holding it. */
  depth: number;
  /** A Section with something inside it; only those wear a caret. */
  hasChildren: boolean;
}

const boxOf = (node: CanvasFlowNode): SectionBox => ({
  id: node.id,
  isSection: node.type === SECTION_NODE_TYPE,
  x: node.position.x,
  y: node.position.y,
  width: node.width ?? 0,
  height: node.height ?? 0,
});

const areaOf = (node: CanvasFlowNode): number => (node.width ?? 0) * (node.height ?? 0);

/** Reading order on the Canvas: down the page, then across it. */
const byReadingOrder = (first: CanvasFlowNode, second: CanvasFlowNode): number =>
  first.position.y - second.position.y ||
  first.position.x - second.position.x ||
  first.id.localeCompare(second.id);

/** The Designs list as a tree: the top level in the order it arrives, each Section's children in Canvas reading order, and a closed Section's children not at all. */
export function designTreeRows(
  frontFirst: readonly CanvasFlowNode[],
  closed: ReadonlySet<string> = new Set(),
): DesignTreeRow[] {
  const boxes = new Map(frontFirst.map((node) => [node.id, boxOf(node)]));
  const sections = frontFirst.filter((node) => node.type === SECTION_NODE_TYPE);
  const place = new Map(frontFirst.map((node, index) => [node.id, index]));
  const children = new Map<string, CanvasFlowNode[]>();
  const owned = new Set<string>();

  for (const node of frontFirst) {
    const box = boxes.get(node.id);
    if (box === undefined) continue;
    let owner: CanvasFlowNode | undefined;
    for (const section of sections) {
      const bounds = boxes.get(section.id);
      if (bounds === undefined || !isInsideSection(box, bounds)) continue;
      // The innermost wins; same area answers by the place the stack already gave them.
      const closer =
        owner === undefined ||
        areaOf(section) < areaOf(owner) ||
        (areaOf(section) === areaOf(owner) &&
          (place.get(section.id) ?? 0) < (place.get(owner.id) ?? 0));
      if (closer) owner = section;
    }
    if (owner === undefined) continue;
    owned.add(node.id);
    const held = children.get(owner.id);
    if (held === undefined) children.set(owner.id, [node]);
    else held.push(node);
  }
  for (const held of children.values()) held.sort(byReadingOrder);

  const rows: DesignTreeRow[] = [];
  const emit = (node: CanvasFlowNode, depth: number): void => {
    const held = children.get(node.id) ?? [];
    rows.push({ node, depth, hasChildren: held.length > 0 });
    if (closed.has(node.id)) return;
    for (const child of held) emit(child, depth + 1);
  };
  for (const node of frontFirst) if (!owned.has(node.id)) emit(node, 0);
  return rows;
}

/** Only a top-level object is draggable: a Section's place comes from its area and a child's from the Canvas, neither of which a drop can set. */
export const isReorderableRow = (row: DesignTreeRow): boolean =>
  row.depth === 0 && row.node.type !== SECTION_NODE_TYPE;
