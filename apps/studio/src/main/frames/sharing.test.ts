import { expect, it } from 'bun:test';
import { watchRendererSharing } from './sharing.js';

it('retains independent sharing checks and stops checking released renderers', async () => {
  let calls = 0;
  const check = (): void => { calls += 1; };
  const stopFirst = watchRendererSharing(check);
  const stopSecond = watchRendererSharing(check);
  try {
    const deadline = Date.now() + 1500;
    while (calls === 0 && Date.now() < deadline) await Bun.sleep(20);
    expect(calls).toBeGreaterThanOrEqual(2);
    stopFirst();
    stopFirst();
    const afterFirst = calls;
    while (calls === afterFirst && Date.now() < deadline) await Bun.sleep(20);
    expect(calls).toBeGreaterThan(afterFirst);
    stopSecond();
    const afterBoth = calls;
    await Bun.sleep(300);
    expect(calls).toBe(afterBoth);
  } finally {
    stopFirst();
    stopSecond();
  }
});
