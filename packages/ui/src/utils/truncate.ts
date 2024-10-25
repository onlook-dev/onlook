export const truncate = (
  str: string | null | undefined,
  length: number,
): string | null => {
  if (!str || str.length <= length) return str ?? null;
  return `${str.slice(0, length - 3)}...`;
};
