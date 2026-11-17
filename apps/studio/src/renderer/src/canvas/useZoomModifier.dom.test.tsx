// A real React Flow pane on a real root: which handler the pane runs on the very next wheel is the claim, and no synchronous callback has that state (ONL-2890).

import { afterEach, describe, expect, it } from 'bun:test';
import { takeComplaints } from '../testing/dom.js';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ReactFlow, type Viewport } from '@xyflow/react';
import { useZoomModifier } from './useZoomModifier.js';

let root: Root | undefined;
let container: HTMLElement | undefined;
let renders = 0;
const moves: Viewport[] = [];

function Pane(): ReactNode {
  renders += 1;
  const isZoomHeld = useZoomModifier();
  return (
    <ReactFlow
      nodes={[]}
      edges={[]}
      panOnScroll={!isZoomHeld}
      zoomOnScroll={isZoomHeld}
      zoomActivationKeyCode={null}
      onError={() => undefined}
      onViewportChange={(viewport) => {
        moves.push(viewport);
      }}
    />
  );
}

async function pane(): Promise<HTMLElement> {
  renders = 0;
  moves.length = 0;
  container = document.createElement('div');
  document.body.appendChild(container);
  const created = createRoot(container);
  root = created;
  await act(async () => {
    created.render(<Pane />);
  });
  const renderer = container.querySelector('.react-flow__renderer');
  expect(renderer).not.toBeNull();
  return renderer as HTMLElement;
}

function key(type: string, init: { key: string; metaKey: boolean; shiftKey?: boolean }): KeyboardEvent {
  return new KeyboardEvent(type, { bubbles: true, ...init });
}

function pointer(metaKey: boolean): PointerEvent {
  return new PointerEvent('pointermove', { bubbles: true, metaKey, clientX: 250, clientY: 250 });
}

// happy-dom's WheelEvent keeps the deltas and drops every field it inherits from MouseEvent, so the modifier and the pointer go back on by hand.
function wheel(metaKey: boolean, deltaY: number): WheelEvent {
  const event = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY });
  const mouse = { metaKey, ctrlKey: false, shiftKey: false, altKey: false, button: 0, clientX: 250, clientY: 250 };
  for (const [field, value] of Object.entries(mouse)) Object.defineProperty(event, field, { value });
  return event;
}

afterEach(async () => {
  await act(async () => {
    root?.unmount();
  });
  root = undefined;
  container?.remove();
  container = undefined;
  const complaints = takeComplaints();
  if (complaints.length > 0) throw new Error(`React complained during this test: ${complaints.join(' / ')}`);
});

describe('the canvas wheel after a screenshot shortcut (ONL-2890)', () => {
  it('pans on the wheel that follows a swallowed release, at a constant scale', async () => {
    const renderer = await pane();
    await act(async () => {
      window.dispatchEvent(key('keydown', { key: '4', metaKey: true, shiftKey: true }));
    });
    let paneKnewBeforeTheWheel = false;

    await act(async () => {
      const rendered = renders;
      renderer.dispatchEvent(pointer(false));
      paneKnewBeforeTheWheel = renders > rendered;
      renderer.dispatchEvent(wheel(false, 120));
    });

    expect(paneKnewBeforeTheWheel).toBe(true);
    expect(moves.length).toBeGreaterThan(0);
    expect(moves.at(-1)?.zoom).toBe(1);
    expect(moves.at(-1)?.y).toBeLessThan(0);
  });

  it('zooms on the wheel that follows a genuine Command press', async () => {
    const renderer = await pane();
    let paneKnewBeforeTheWheel = false;

    await act(async () => {
      const rendered = renders;
      window.dispatchEvent(key('keydown', { key: 'Meta', metaKey: true }));
      paneKnewBeforeTheWheel = renders > rendered;
      renderer.dispatchEvent(wheel(true, -120));
    });

    expect(paneKnewBeforeTheWheel).toBe(true);
    expect(moves.length).toBeGreaterThan(0);
    expect(moves.at(-1)?.zoom).toBeGreaterThan(1);
  });

  it('keeps panning across a plain scroll without touching the scale', async () => {
    const renderer = await pane();

    await act(async () => {
      renderer.dispatchEvent(wheel(false, 120));
    });
    await act(async () => {
      renderer.dispatchEvent(wheel(false, 120));
    });

    expect(moves.at(-1)?.zoom).toBe(1);
    expect(moves.at(-1)?.y).toBeLessThan(moves.at(0)?.y ?? 0);
  });
});
