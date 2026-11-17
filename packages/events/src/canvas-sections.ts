import type { CanvasNode } from './canvas.js';

export function compareCanvasPaintOrder(
  first: Pick<CanvasNode, 'id' | 'kind' | 'width' | 'height' | 'order'>,
  second: Pick<CanvasNode, 'id' | 'kind' | 'width' | 'height' | 'order'>,
): number {
  const kindOrder = Number(second.kind === 'section') - Number(first.kind === 'section');
  if (kindOrder !== 0) return kindOrder;
  if (first.kind === 'section' && second.kind === 'section') {
    const areaOrder = second.width * second.height - first.width * first.height;
    if (areaOrder !== 0) return areaOrder;
  }
  return first.order - second.order || first.id.localeCompare(second.id);
}

/** A box to test for enclosure: the document passes stored values, the renderer what it drew. */
export interface SectionBox {
  id: string;
  isSection: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** ⚠️ A section counts only when it is strictly smaller, so two sections of one size never hold each other and a chain of owners cannot close on itself. */
export function isInsideSection(node: SectionBox, section: SectionBox): boolean {
  return (
    node.id !== section.id &&
    node.x >= section.x && node.y >= section.y &&
    node.x + node.width <= section.x + section.width &&
    node.y + node.height <= section.y + section.height &&
    (!node.isSection || node.width < section.width || node.height < section.height)
  );
}

const boxOf = (node: CanvasNode): SectionBox => ({
  id: node.id,
  isSection: node.kind === 'section',
  x: node.x,
  y: node.y,
  width: node.width,
  height: node.height,
});

export function sectionMembersOnPage(
  nodes: readonly CanvasNode[],
  section: CanvasNode,
): CanvasNode[] {
  if (section.kind !== 'section') return [];
  const bounds = boxOf(section);
  return nodes.filter((node) => node.pageId === section.pageId && isInsideSection(boxOf(node), bounds));
}

export function withSectionContentsOnPage(nodes: readonly CanvasNode[], ids: readonly string[]): string[] {
  const result = new Set(ids);
  const byId = new Map(nodes.map((node) => [node.id, node]));
  for (const id of ids) {
    const section = byId.get(id);
    if (section?.kind !== 'section') continue;
    for (const member of sectionMembersOnPage(nodes, section)) result.add(member.id);
  }
  return [...result];
}
