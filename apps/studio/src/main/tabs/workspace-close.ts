/** All-or-nothing, and the next id each round: closing one tab can re-key another, so a snapshot goes stale (ONL-2315). */
export async function closeEveryTab(
  nextId: () => string | undefined,
  close: (id: string) => Promise<boolean>,
  rounds: number,
): Promise<boolean> {
  for (let round = 0; round < rounds; round += 1) {
    const id = nextId();
    if (id === undefined) return true;
    if (!(await close(id))) return false;
  }
  return nextId() === undefined;
}
