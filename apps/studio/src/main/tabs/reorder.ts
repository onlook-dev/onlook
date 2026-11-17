/**
 * ⚠️ THE USER'S INDEX IS NOT MAIN'S (ONL-2364). The strip draws only `purpose: 'project'`
 * tabs, so "position 2" means the third PROJECT tab while `order` may hold a
 * projects-list entry among them.
 *
 * Returns the SAME array on a no-op, so a caller can skip its broadcast.
 */
export function reorderedTabs(
  order: readonly string[],
  visible: readonly string[],
  tabId: string,
  toIndex: number,
): readonly string[] {
  const from = visible.indexOf(tabId);
  if (from === -1) return order;
  const to = Math.max(0, Math.min(toIndex, visible.length - 1));
  if (from === to) return order;

  const moved = visible.filter((id) => id !== tabId);
  moved.splice(to, 0, tabId);

  // Invisible entries keep their absolute positions, or a projects-list tab drifts to the front over repeated drags.
  let next = 0;
  const visibleSet = new Set(visible);
  const result = order.map((id) => (visibleSet.has(id) ? (moved[next++] ?? id) : id));
  return result;
}
