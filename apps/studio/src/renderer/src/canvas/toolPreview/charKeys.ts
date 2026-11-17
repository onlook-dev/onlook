/** The nth occurrence of a letter keeps its key across words. */
export const charKeys = (word: string): { key: string; char: string }[] => {
  const seen = new Map<string, number>();
  return [...word].map((char) => {
    const lower = char.toLowerCase();
    const n = seen.get(lower) ?? 0;
    seen.set(lower, n + 1);
    return { key: `${lower}${String(n)}`, char };
  });
};
