import { describe, expect, it } from 'bun:test';
import '../../testing/dom.js';
import { mountHook } from '../../testing/mountHook.js';
import { useStripHover } from './useStripHover.js';

const STRIP: string = 'active\nother';

describe('the hovered tab the strip holds', () => {
  it('drops it when the tabs under the pointer change, as after New Draft', async () => {
    const hook = await mountHook((key: string) => useStripHover(key), STRIP);
    await hook.settle(() => hook.current[1]('other'));
    expect(hook.current[0]).toBe('other');
    await hook.rerender(`${STRIP}\ndraft`);
    expect(hook.current[0]).toBeUndefined();
    await hook.unmount();
  });

  it('keeps it across a broadcast that leaves the tabs as they were', async () => {
    const hook = await mountHook((key: string) => useStripHover(key), STRIP);
    await hook.settle(() => hook.current[1]('other'));
    await hook.rerender(['active', 'other'].join('\n'));
    expect(hook.current[0]).toBe('other');
    await hook.unmount();
  });

  it('does not bring it back when the tabs return to how they were', async () => {
    const hook = await mountHook((key: string) => useStripHover(key), STRIP);
    await hook.settle(() => hook.current[1]('other'));
    await hook.rerender('other\nactive');
    await hook.rerender(STRIP);
    expect(hook.current[0]).toBeUndefined();
    await hook.unmount();
  });
});
