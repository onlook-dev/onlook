import { describe, expect, it } from 'bun:test';
import { closeEveryTab } from './workspace-close.js';

/** The host re-derives from its live tab map; a queue stands in for it here. */
function queue(ids: string[]): { next: () => string | undefined; left: string[] } {
  const left = [...ids];
  return { next: () => left[0], left };
}

describe('closeEveryTab (ONL-2315)', () => {
  it('folds to true when every tab closes', async () => {
    const asked: string[] = [];
    const held = queue(['tab-1', 'tab-2', 'tab-3']);
    const closed = await closeEveryTab(
      held.next,
      (id) => {
        asked.push(id);
        held.left.shift();
        return Promise.resolve(true);
      },
      3,
    );
    expect(closed).toBe(true);
    expect(asked).toEqual(['tab-1', 'tab-2', 'tab-3']);
  });

  it('nothing to close is not a refusal', async () => {
    let asked = 0;
    const closed = await closeEveryTab(
      () => undefined,
      () => {
        asked += 1;
        return Promise.resolve(true);
      },
      0,
    );
    expect(closed).toBe(true);
    expect(asked).toBe(0);
  });

  it('stops at the first refusal and leaves the rest open', async () => {
    const asked: string[] = [];
    const held = queue(['tab-1', 'tab-2', 'tab-3']);
    const closed = await closeEveryTab(
      held.next,
      (id) => {
        asked.push(id);
        if (id === 'tab-2') return Promise.resolve(false);
        held.left.shift();
        return Promise.resolve(true);
      },
      3,
    );
    expect(closed).toBe(false);
    expect(asked).toEqual(['tab-1', 'tab-2']);
  });

  it('asks for the id again each round, so a tab the last close re-keyed is still reached', async () => {
    // Closing `tab-1` re-keys the remaining tab, which a snapshot taken up front would never name.
    const asked: string[] = [];
    const left = ['tab-1', 'stale'];
    const closed = await closeEveryTab(
      () => left[0],
      (id) => {
        asked.push(id);
        left.shift();
        if (id === 'tab-1') left[0] = 'tab-9-rekeyed';
        return Promise.resolve(true);
      },
      2,
    );
    expect(closed).toBe(true);
    expect(asked).toEqual(['tab-1', 'tab-9-rekeyed']);
  });

  it('refuses when a tab outlives its round budget rather than reporting a close', async () => {
    const closed = await closeEveryTab(
      () => 'tab-1',
      () => Promise.resolve(true),
      1,
    );
    expect(closed).toBe(false);
  });

  it('asks one tab at a time, so two modals never stand at once', async () => {
    const release: Array<(answer: boolean) => void> = [];
    const left = ['tab-1', 'tab-2'];
    let inFlight = 0;
    let overlapped = false;
    const folding = closeEveryTab(
      () => left[0],
      () => {
        inFlight += 1;
        if (inFlight > 1) overlapped = true;
        return new Promise<boolean>((resolve) => {
          release.push((answer) => {
            inFlight -= 1;
            left.shift();
            resolve(answer);
          });
        });
      },
      2,
    );
    await Promise.resolve();
    expect(release).toHaveLength(1);
    release[0]?.(true);
    await Promise.resolve();
    await Promise.resolve();
    expect(release).toHaveLength(2);
    release[1]?.(true);
    expect(await folding).toBe(true);
    expect(overlapped).toBe(false);
  });

  it('a failed ask rejects rather than reading as a close', async () => {
    const asked: string[] = [];
    const folding = closeEveryTab(
      () => 'tab-1',
      (id) => {
        asked.push(id);
        return Promise.reject(new Error('the modal failed'));
      },
      2,
    );
    await expect(folding).rejects.toThrow('the modal failed');
    expect(asked).toEqual(['tab-1']);
  });
});
