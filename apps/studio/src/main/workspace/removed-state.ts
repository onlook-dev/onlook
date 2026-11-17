const reopeners = new Map<string, () => void>();

export function rememberRemovedState(spellings: readonly string[], reopen: () => void): void {
  const restore = (): void => {
    reopen();
    for (const spelling of spellings) reopeners.delete(spelling);
  };
  for (const spelling of spellings) reopeners.set(spelling, restore);
}

export function reopenRemovedState(spellings: readonly string[]): void {
  for (const spelling of spellings) reopeners.get(spelling)?.();
}
