import '../../testing/dom.js';
import { afterEach, expect, it, mock } from 'bun:test';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { takeComplaints } from '../../testing/dom.js';
import { TabStrip } from './TabStrip.js';

let root: Root | undefined;
let container: HTMLDivElement | undefined;
const descriptors = new Map<string, PropertyDescriptor | undefined>();

afterEach(async () => {
  await act(async () => { root?.unmount(); });
  root = undefined;
  container?.remove();
  container = undefined;
  for (const [key, descriptor] of descriptors) {
    if (descriptor) Object.defineProperty(HTMLElement.prototype, key, descriptor);
    else Reflect.deleteProperty(HTMLElement.prototype, key);
  }
  descriptors.clear();
  expect(takeComplaints()).toEqual([]);
});

it('settles an added project in one layout instead of animating the row that sizes every tab', async () => {
  const animate = mock(() => ({ cancel() {}, onfinish: null }));
  for (const [key, descriptor] of Object.entries({
    animate: { value: animate },
    getAnimations: { value: () => [] },
    offsetWidth: { get(this: HTMLElement) { return this.querySelectorAll('[role="tab"]').length * 200; } },
  })) {
    descriptors.set(key, Object.getOwnPropertyDescriptor(HTMLElement.prototype, key));
    Object.defineProperty(HTMLElement.prototype, key, { ...descriptor, configurable: true });
  }
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  const render = (count: number) => root!.render(<TabStrip tabs={Array.from({ length: count }, (_, index) => ({ id: `project-${String(index)}`, name: 'Project' }))}
    activeTabId="project-0" canCreate onSelect={() => {}} onClose={() => {}} onNew={() => {}} onRename={() => {}} />);
  await act(async () => { render(3); });
  await act(async () => { render(4); });
  expect(container.querySelectorAll('[role="tab"]')).toHaveLength(4);
  expect(animate).not.toHaveBeenCalled();
  await act(async () => { render(3); });
  expect(animate).not.toHaveBeenCalled();
});
