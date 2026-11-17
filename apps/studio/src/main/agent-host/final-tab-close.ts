export interface FinalTabCloseDeps {
  stopSetup(cwd: string): Promise<void>;
  releaseSession(cwd: string): Promise<void>;
  closed(cwd: string): void;
  failed(operation: 'setup' | 'session', error: unknown): void;
}

export async function finalTabClose(cwd: string, deps: FinalTabCloseDeps): Promise<void> {
  const complete = async (operation: 'setup' | 'session', action: () => Promise<void>): Promise<void> => {
    try { await action(); }
    catch (error) { deps.failed(operation, error); }
  };
  try {
    await Promise.all([
      complete('setup', () => deps.stopSetup(cwd)),
      complete('session', () => deps.releaseSession(cwd)),
    ]);
  } finally { deps.closed(cwd); }
}
