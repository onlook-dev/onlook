export interface VisibilityNode {
  position: { x: number; y: number };
  width?: number | null;
  height?: number | null;
}

/** React Flow's store transform: `[translateX, translateY, zoom]`. */
export type ViewportTransform = readonly [number, number, number];

export interface PaneSize {
  width: number;
  height: number;
}

export function hasVisibleNodes(
  nodes: readonly VisibilityNode[],
  transform: ViewportTransform,
  pane: PaneSize,
): boolean {
  // An unmeasured pane answers false on purpose: the caller keeps the recenter affordance up rather than assert a visibility it cannot measure (ONL-1979).
  if (nodes.length === 0 || pane.width === 0 || pane.height === 0) return false;

  const [x, y, zoom] = transform;

  const viewportLeft = -x / zoom;
  const viewportTop = -y / zoom;
  const viewportRight = viewportLeft + pane.width / zoom;
  const viewportBottom = viewportTop + pane.height / zoom;

  return nodes.some((node) => {
    const nodeLeft = node.position.x;
    const nodeTop = node.position.y;
    const nodeRight = nodeLeft + (node.width ?? 0);
    const nodeBottom = nodeTop + (node.height ?? 0);

    return (
      nodeLeft < viewportRight &&
      nodeRight > viewportLeft &&
      nodeTop < viewportBottom &&
      nodeBottom > viewportTop
    );
  });
}
