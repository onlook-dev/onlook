export function manualClock() {
  let now = 0;
  let sequence = 0;
  const deadlines = new Map<number, { at: number; callback: () => void }>();
  return {
    after(milliseconds: number, callback: () => void): () => void {
      const id = sequence++;
      deadlines.set(id, { at: now + milliseconds, callback });
      return () => { deadlines.delete(id); };
    },
    advanceBy(milliseconds: number): void {
      const target = now + milliseconds;
      for (;;) {
        const next = [...deadlines.entries()]
          .filter(([, deadline]) => deadline.at <= target)
          .sort((left, right) => left[1].at - right[1].at || left[0] - right[0])[0];
        if (!next) break;
        const [id, deadline] = next;
        deadlines.delete(id);
        now = deadline.at;
        deadline.callback();
      }
      now = target;
    },
    get pending(): number { return deadlines.size; },
  };
}
