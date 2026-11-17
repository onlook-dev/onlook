export interface Keying {
  order: readonly string[];
  activeId: string | undefined;
}

/** A renderer answers only to the `TAB_ID` it was born with; under any other its pushes and assignment are rejected without an error (ONL-2318). */
export function rekeyed(current: Keying, from: string, to: string): Keying {
  if (from === to) return current;
  return {
    order: current.order.map((entry) => (entry === from ? to : entry)),
    activeId: current.activeId === from ? to : current.activeId,
  };
}
