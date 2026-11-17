import { expect, it } from 'bun:test';
import type { ArtifactPageState } from '@studio/events';
import { requestLivePageState } from './livePageState.js';

const settled = async (result: Promise<ArtifactPageState>) => {
  const states: ArtifactPageState[] = [];
  requestLivePageState(() => result, (state) => states.push(state), 10);
  await new Promise((resolve) => setTimeout(resolve, 30));
  return states;
};

it('keeps a settled missing, stale or failed answer instead of overwriting it at the load deadline', async () => {
  expect(await settled(Promise.resolve({outcome: 'missing'}))).toEqual([{outcome: 'missing'}]);
  expect(await settled(Promise.resolve({outcome: 'stale'}))).toEqual([{outcome: 'stale'}]);
  expect(await settled(Promise.reject(new Error('bridge')))).toEqual([{outcome: 'unavailable'}]);
});

it('still gives an issued page url the load deadline', async () => {
  const ready: ArtifactPageState = {outcome: 'ready', url: 'studio-artifact://aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa/pages/index.html'};
  expect(await settled(Promise.resolve(ready))).toEqual([ready, {outcome: 'unavailable'}]);
});

it('settles nothing after cancel', async () => {
  const states: ArtifactPageState[] = [];
  requestLivePageState(() => Promise.resolve({outcome: 'missing'}), (state) => states.push(state), 10).cancel();
  await new Promise((resolve) => setTimeout(resolve, 30));
  expect(states).toEqual([]);
});
