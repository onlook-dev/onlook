import { afterEach, expect, test } from 'bun:test';
import { takeComplaints } from '../testing/dom.js';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { LayerProvider } from '@astryxdesign/core/Layer';
import { useToastFootClaim } from './foot.js';
import { TOAST_FOOT_PROPERTY, TOAST_LANE, TOAST_LANE_BOTTOM, TOAST_LANE_START } from './lane.js';

let root: Root | undefined;
let container: HTMLDivElement | undefined;

afterEach(async () => {
  await act(async () => { root?.unmount(); });
  container?.remove();
  root = undefined;
  container = undefined;
  expect(takeComplaints()).toEqual([]);
});

const CLAIM_PX = 112;

function Claimer(): React.JSX.Element {
  return <div ref={useToastFootClaim()} />;
}

async function mount(tree: React.ReactNode): Promise<HTMLElement> {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => { root!.render(<LayerProvider toast={TOAST_LANE}>{tree}</LayerProvider>); });
  const lane = document.querySelector<HTMLElement>('[role="region"]');
  if (lane === null) throw new Error('the layer provider drew no toast lane');
  return lane;
}

test('toasts land in the lower left, above the controls at the foot of the Left Rail', async () => {
  expect(TOAST_LANE.position).toBe('bottomStart');
  const lane = await mount(<div />);
  /* The lane reads the same tokens the corner's own furniture is placed with, so one change moves both. */
  expect(lane.style.bottom).toBe(TOAST_LANE_BOTTOM);
  expect(lane.style.insetInlineStart).toBe(TOAST_LANE_START);
  /* The measured foot drives the lane, and the corner's own box is the floor it never drops below. */
  expect(TOAST_LANE_BOTTOM).toContain(`var(${TOAST_FOOT_PROPERTY}, 0px)`);
  expect(TOAST_LANE_BOTTOM).toContain('var(--size-element-lg)');
  expect(document.documentElement.style.getPropertyValue(TOAST_FOOT_PROPERTY)).toBe('');
});

test('a claim at the foot publishes what the lane has to clear', async () => {
  const own = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = (): DOMRect =>
    ({ top: window.innerHeight - CLAIM_PX, width: 200, height: CLAIM_PX }) as DOMRect;
  try {
    await mount(<Claimer />);
    expect(document.documentElement.style.getPropertyValue(TOAST_FOOT_PROPERTY)).toBe(`${String(CLAIM_PX)}px`);
  } finally {
    Element.prototype.getBoundingClientRect = own;
  }
});

test('the claim leaving takes the property with it, so the floor stands again', () => {
  expect(document.documentElement.style.getPropertyValue(TOAST_FOOT_PROPERTY)).toBe('');
});
