import { describe, expect, it } from 'bun:test';
import { animatePath } from './pathMotion.js';

function fixture() {
  let options: KeyframeAnimationOptions | undefined;
  let frames: Keyframe[] | PropertyIndexedKeyframes | null = null;
  let cancellations = 0;
  let complete = (): void => undefined;
  const tail = {
    animate: (keyframes: Keyframe[] | PropertyIndexedKeyframes | null, timing?: number | KeyframeAnimationOptions): Animation => {
      frames = keyframes;
      options = timing as KeyframeAnimationOptions;
      return { cancel: () => { cancellations += 1; }, finished: new Promise<void>((resolve) => { complete = resolve; }) } as unknown as Animation;
    },
  };
  return { tail, frames: () => frames, options: () => options, finish: () => complete(), cancellations: () => cancellations };
}

describe('breadcrumb presence motion', () => {
  it('reveals and retracts the whole path along one edge without translating its segments', () => {
    const motion = Object.assign(new EventTarget(), { matches: false });
    const entering = fixture();
    animatePath(entering.tail, 'enter', motion, () => undefined)();
    expect(entering.frames()).toEqual([{ opacity: 0, clipPath: 'inset(0 100% 0 0)' }, { opacity: 1, clipPath: 'inset(0 0 0 0)' }]);
    expect(entering.options()?.duration).toBe(240);
    const leaving = fixture();
    animatePath(leaving.tail, 'exit', motion, () => undefined)();
    expect(leaving.frames()).toEqual([{ opacity: 1, clipPath: 'inset(0 0 0 0)' }, { opacity: 0, clipPath: 'inset(0 100% 0 0)' }]);
    expect(leaving.options()?.duration).toBe(180);
  });

  it('cleans up interrupted motion and a changed preference exactly once', () => {
    const motion = Object.assign(new EventTarget(), { matches: false });
    const run = fixture();
    let completed = 0;
    const stop = animatePath(run.tail, 'enter', motion, () => { completed += 1; });
    motion.dispatchEvent(new Event('change'));
    stop();
    expect(run.cancellations()).toBe(1);
    expect(completed).toBe(1);
  });

  it('removes the exit copy when the path finishes', async () => {
    const motion = Object.assign(new EventTarget(), { matches: false });
    const run = fixture();
    let completed = 0;
    const stop = animatePath(run.tail, 'exit', motion, () => { completed += 1; });
    expect(completed).toBe(0);
    run.finish();
    await Promise.resolve();
    expect(completed).toBe(1);
    stop();
    expect(completed).toBe(1);
  });

  it('finishes immediately with reduced motion or an empty path', () => {
    const run = fixture();
    const motion = Object.assign(new EventTarget(), { matches: true });
    let completed = 0;
    animatePath(run.tail, 'enter', motion, () => { completed += 1; })();
    animatePath(null, 'exit', motion, () => { completed += 1; })();
    expect(run.options()).toBeUndefined();
    expect(completed).toBe(2);
  });
});
