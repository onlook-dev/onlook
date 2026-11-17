import { describe, expect, it } from 'bun:test';
import { finalTabClose } from './final-tab-close.js';

describe('final tab cleanup', () => {
  it('starts bounded saved setup shutdown alongside session release and waits for both', async () => {
    const calls: string[] = [];
    let finishStop: () => void = () => undefined;
    const stop = new Promise<void>((resolve) => { finishStop = resolve; });
    const pending = finalTabClose('/project-a', {
      stopSetup: (cwd) => { calls.push(`stop:${cwd}`); return stop; },
      releaseSession: async (cwd) => { calls.push(`release:${cwd}`); },
      closed: (cwd) => { calls.push(`closed:${cwd}`); },
      failed: () => { throw new Error('unexpected failure'); },
    });
    expect(calls).toEqual(['stop:/project-a', 'release:/project-a']);
    finishStop();
    await pending;
    expect(calls).toEqual(['stop:/project-a', 'release:/project-a', 'closed:/project-a']);
  });

  it('handles an uninitialized setup service and rejected session release without dropping final cleanup', async () => {
    const failures: string[] = [];
    const closed: string[] = [];
    await finalTabClose('/project-a', {
      stopSetup: () => { throw new Error('not initialized'); },
      releaseSession: async () => { throw new Error('release rejected'); },
      failed: (operation) => { failures.push(operation); },
      closed: (cwd) => { closed.push(cwd); },
    });
    expect(failures).toEqual(['setup', 'session']);
    expect(closed).toEqual(['/project-a']);
  });
});
