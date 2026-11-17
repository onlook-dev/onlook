import { expect, mock, test } from 'bun:test';

mock.module('../tabs/host.js', () => ({ tabHost: () => undefined }));
const { createListenerCache } = await import('./read.js');

test('a port’s listener is looked up once, again only when that process has gone, and an unknown one at most every 30 s', async () => {
  const asked: number[] = [];
  let pid: number | undefined = 500;
  const listeners = createListenerCache(async (port) => {
    asked.push(port);
    return pid;
  });

  expect([...await listeners([3000], new Set([500]), 0)]).toEqual([[3000, 500]]);
  await listeners([3000], new Set([500]), 5_000);
  expect(asked).toEqual([3000]);

  pid = undefined;
  expect([...await listeners([3000], new Set(), 10_000)]).toEqual([]);
  await listeners([3000], new Set(), 15_000);
  expect(asked).toEqual([3000, 3000]);
  await listeners([3000], new Set(), 40_001);
  expect(asked).toEqual([3000, 3000, 3000]);
});
