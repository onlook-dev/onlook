import '../testing/dom.js';
import { expect, it } from 'bun:test';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { RendererTelemetryEvent } from '@studio/events';
import { installBridge } from '../testing/bridge.js';
import { takeComplaints } from '../testing/dom.js';
import { useSurface } from './useSurface.js';

it('sends the shown preview cover through the renderer telemetry bridge', async () => {
  const sent: RendererTelemetryEvent[] = [];
  installBridge({ telemetryEvent: event => { sent.push(event); } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  function Surface({ cover }: { cover: 'nothing' | 'mixed' }) {
    useSurface('canvas', 'error_state', 'preview_failed', { cover, server_port: cover === 'nothing' ? 4100 : undefined });
    return null;
  }
  try {
    await act(async () => { root.render(<Surface cover="nothing" />); });
    expect(sent.at(-1)).toEqual({ event: 'activation_surface', properties: { surface: 'error_state', dead_end: { state: 'preview_failed', error_class: 'unknown', cover: 'nothing', server_port: 4100 } } });
    await act(async () => { root.render(<Surface cover="mixed" />); });
    expect(sent.at(-1)).toMatchObject({ properties: { dead_end: { cover: 'mixed' } } });
  } finally {
    await act(async () => { root.unmount(); });
    container.remove();
  }
  expect(takeComplaints()).toEqual([]);
});
