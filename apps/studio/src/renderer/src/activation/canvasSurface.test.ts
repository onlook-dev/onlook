import { describe, expect, it } from 'bun:test';
import { canvasSurface } from './canvasSurface.js';
import type { ServerEntryState } from '@studio/events';

describe('canvas activation state', () => {
  const base = { copying: false, starting: false, nodeCount: 1 };
  it('counts server-covered frames as dead ends but not while starting or stopping', () => {
    for (const serverCover of ['non-started', 'dead', 'occupied', 'container', 'users-own'] as const) {
      const frames = [{ health: 'loading' as const, serverCover }];
      expect(canvasSurface({ ...base, frames })).toMatchObject({ surface: 'error_state', dead_end: { cover: serverCover, error_class: serverCover === 'occupied' || serverCover === 'container' ? 'unknown' : 'port_unreachable' } });
      expect(canvasSurface({ ...base, frames, starting: true })).toEqual({ surface: 'preview_loading' });
    }
  });
  it('reads a frame showing its quote while its turn runs as loading, whatever is under it (ONL-2960)', () => {
    const waiting = { health: 'loading' as const, serverCover: 'non-started' as const, quote: 'Halde, live from your code' };
    expect(canvasSurface({ ...base, frames: [{ ...waiting, quoteTurnRunning: true }] })).toEqual({ surface: 'preview_loading' });
    expect(canvasSurface({ ...base, frames: [{ ...waiting, quoteTurnRunning: false }] })).toMatchObject({ surface: 'error_state' });
  });
  it('does not misreport guest crashes and page load failures as unreachable ports', () => {
    expect(canvasSurface({ ...base, frames: [{ health: 'unreachable' }] })).toMatchObject({ dead_end: { error_class: 'unknown' } });
    expect(canvasSurface({ ...base, frames: [{ health: 'unreachable', loadFailure: {} }] })).toMatchObject({ dead_end: { cover: 'nothing', error_class: 'load_failed' } });
    expect(canvasSurface({ ...base, frames: [{ health: 'unreachable', serverLive: true, loadFailure: {} }] })).toMatchObject({ dead_end: { cover: 'page-failed', error_class: 'load_failed' } });
  });
  it('keeps the historical load-failed class when Nothing answered covers a failed page', () => {
    expect(canvasSurface({ ...base, frames: [{ health: 'unreachable', loadFailure: {} }, { health: 'unreachable', loadFailure: {} }] })).toEqual({ surface: 'error_state', dead_end: { state: 'preview_failed', cover: 'nothing', error_class: 'load_failed' } });
  });
  it('identifies one server across covered frames without attributing mixed or unclaimed endpoints', () => {
    const server = (entryId: string, port: number): ServerEntryState => ({ entryId, folderName: 'app', ownership: 'agent-started', status: 'stopped', everMeasuredLive: true, ports: [{ port, origin: `http://localhost:${String(port)}`, measured: 'dead', everLive: true }] });
    const frames = [{ health: 'unreachable' as const, serverCover: 'dead' as const, pointedUrl: 'http://localhost:4100/' }, { health: 'unreachable' as const, serverCover: 'dead' as const, pointedUrl: 'http://localhost:4101/other' }];
    const first = server('first', 4100);
    const second = server('second', 4101);
    expect(canvasSurface({ ...base, frames, servers: [{ ...first, ports: [...first.ports, ...second.ports] }] }).dead_end?.server_port).toBe(4100);
    expect(canvasSurface({ ...base, frames, servers: [first, second] }).dead_end?.server_port).toBeUndefined();
    expect(canvasSurface({ ...base, frames, servers: [first] }).dead_end?.server_port).toBeUndefined();
    expect(canvasSurface({ ...base, frames: [frames[1]!], servers: [{ ...first, ports: [...first.ports, ...second.ports] }] }).dead_end?.server_port).toBe(4101);
  });
  it('reports the blocking empty state and allows a live frame to recover the canvas', () => {
    expect(canvasSurface({ ...base, nodeCount: 0, frames: [], emptyFailure: 'preview' })).toMatchObject({ dead_end: { state: 'app_not_started' } });
    expect(canvasSurface({ ...base, frames: [{ health: 'live' }, { health: 'unreachable' }] })).toEqual({ surface: 'canvas' });
    expect(canvasSurface({ ...base, nodeCount: 0, frames: [] })).toEqual({ surface: 'chat_idle' });
  });
});
