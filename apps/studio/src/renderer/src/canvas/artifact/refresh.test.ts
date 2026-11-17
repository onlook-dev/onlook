import { expect, it } from 'bun:test';
import { createArtifactRefresh } from './refresh.js';

it('loads initially without reloading, then refreshes the ready guest once per revision', () => {
  let reloads = 0;
  const refresh = createArtifactRefresh(() => { reloads += 1; });
  refresh.update('one');
  refresh.ready();
  expect(reloads).toBe(0);
  refresh.update('two');
  expect(reloads).toBe(1);
  refresh.ready();
  refresh.update('two');
  expect(reloads).toBe(1);
  refresh.update('three');
  expect(reloads).toBe(2);
});

it('coalesces revisions arriving before attachment and during reload without losing the last edit', () => {
  let reloads = 0;
  const refresh = createArtifactRefresh(() => { reloads += 1; });
  refresh.update('one');
  refresh.update('two');
  refresh.update('three');
  expect(reloads).toBe(0);
  refresh.ready();
  expect(reloads).toBe(1);
  refresh.update('four');
  refresh.update('five');
  expect(reloads).toBe(1);
  refresh.ready();
  expect(reloads).toBe(2);
  refresh.ready();
  expect(reloads).toBe(2);
});
