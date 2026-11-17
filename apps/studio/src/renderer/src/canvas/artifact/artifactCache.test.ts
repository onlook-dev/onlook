import { describe, expect, it } from 'bun:test';
import type { ArtifactId, ArtifactSummary } from '@studio/events';

import { createArtifactCache } from './artifactCache.js';

const ID = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa' as ArtifactId;

const summary = (title: string): ArtifactSummary => ({
  id: ID,
  title,
  pagePath: 'pages/index.html',
  updatedAt: '2026-10-06T00:00:00.000Z',
  readOnly: false,
});

describe('what tells a mounted node its artifact is gone (ONL-2568)', () => {
  it('recovers a refused initial read without needing a second node or a file change', async () => {
    let attempts = 0;
    const cache = createArtifactCache(async () => {
      attempts += 1;
      if (attempts === 1) throw new Error('Bridge temporarily unavailable');
      return summary('Saved artifact');
    }, () => {});
    expect((await cache.resolve(ID))?.title).toBe('Saved artifact');
    expect(attempts).toBe(2);
  });

  it('bounds failed startup reads and leaves them retryable, never missing', async () => {
    let attempts = 0;
    const cache = createArtifactCache(async () => {
      attempts += 1;
      throw new Error('Bridge unavailable');
    }, () => {});
    expect(await cache.resolve(ID)).toBeUndefined();
    expect(attempts).toBe(3);
    expect(cache.peek(ID)).toBeUndefined();
  });

  it('does not retry a refused read after an invalidation supersedes it', async () => {
    let attempts = 0;
    const cache = createArtifactCache(async () => {
      attempts += 1;
      if (attempts === 1) throw new Error('Unavailable');
      return summary('Current');
    }, () => {});
    const old = cache.resolve(ID);
    cache.forget(ID);
    expect((await cache.resolve(ID))?.title).toBe('Current');
    expect(await old).toBeUndefined();
    expect(attempts).toBe(2);
  });

  it('distinguishes a manual metadata retry from a content change for every subscriber', async () => {
    const cache = createArtifactCache(async () => summary('Saved artifact'));
    const reasons: string[] = [];
    let contentChanges = 0;
    cache.subscribe(ID, (reason) => reasons.push(reason), 'all');
    cache.subscribe(ID, () => { contentChanges += 1; });
    await cache.resolve(ID);
    cache.forget(ID, 'retry');
    expect(cache.peek(ID)).toBeUndefined();
    expect(contentChanges).toBe(0);
    expect((await cache.resolve(ID))?.title).toBe('Saved artifact');
    cache.forget(ID);
    expect(reasons).toEqual(['retry', 'content']);
    expect(contentChanges).toBe(1);
  });

  it('recovers updated metadata after a content read exhausts its retries', async () => {
    let unavailable = false;
    let current = summary('Original');
    const cache = createArtifactCache(async () => {
      if (unavailable) throw new Error('Bridge unavailable');
      return current;
    }, () => {});
    expect((await cache.resolve(ID))?.title).toBe('Original');
    current = { ...summary('Updated'), updatedAt: '2026-10-23T00:00:00.000Z' };
    unavailable = true;
    cache.forget(ID);
    expect(await cache.resolve(ID)).toBeUndefined();
    unavailable = false;
    cache.forget(ID, 'retry');
    expect(await cache.resolve(ID)).toEqual(current);
  });

  it('never lets an old read overwrite the update that replaced it', async () => {
    const completions: ((value: ArtifactSummary | null) => void)[] = [];
    const cache = createArtifactCache(() => new Promise((resolve) => completions.push(resolve)));
    const old = cache.resolve(ID);
    cache.forget(ID);
    const fresh = cache.resolve(ID);
    completions[1]?.(summary('New content'));
    await fresh;
    completions[0]?.(summary('Old content'));
    expect(await old).toBeUndefined();
    expect(cache.peek(ID)?.title).toBe('New content');
  });
  it('calls every subscriber when the artifact is forgotten', async () => {
    const cache = createArtifactCache(() => Promise.resolve(summary('Pricing')));
    await cache.resolve(ID);
    let first = 0;
    let second = 0;
    cache.subscribe(ID, () => {
      first += 1;
    });
    cache.subscribe(ID, () => {
      second += 1;
    });

    cache.forget(ID);

    expect([first, second]).toEqual([1, 1]);
  });

  it('answers the absence on the next resolve, so the node reaches missing', async () => {
    let answer: ArtifactSummary | null = summary('Pricing');
    const cache = createArtifactCache(() => Promise.resolve(answer));
    expect(await cache.resolve(ID)).not.toBeNull();

    // The order a confirmed delete runs in: main destroys the bytes, then the cache forgets.
    answer = null;
    cache.forget(ID);

    expect(cache.peek(ID)).toBeUndefined();
    expect(await cache.resolve(ID)).toBeNull();
  });

  it('leaves another artifact’s subscribers alone', async () => {
    const other = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb' as ArtifactId;
    const cache = createArtifactCache(() => Promise.resolve(summary('Pricing')));
    await cache.resolve(other);
    let calls = 0;
    cache.subscribe(other, () => {
      calls += 1;
    });

    cache.forget(ID);

    expect(calls).toBe(0);
  });

  it('stops calling a subscriber that unsubscribed', async () => {
    const cache = createArtifactCache(() => Promise.resolve(summary('Pricing')));
    await cache.resolve(ID);
    let calls = 0;
    const stop = cache.subscribe(ID, () => {
      calls += 1;
    });

    stop();
    cache.forget(ID);

    expect(calls).toBe(0);
  });

  it('survives a subscriber that unsubscribes while being called', async () => {
    const cache = createArtifactCache(() => Promise.resolve(summary('Pricing')));
    await cache.resolve(ID);
    const seen: string[] = [];
    const stopFirst = cache.subscribe(ID, () => {
      seen.push('first');
      stopFirst();
    });
    cache.subscribe(ID, () => {
      seen.push('second');
    });

    cache.forget(ID);

    expect(seen).toEqual(['first', 'second']);
  });
});
