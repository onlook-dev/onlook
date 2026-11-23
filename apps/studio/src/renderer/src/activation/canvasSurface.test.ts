import { describe, expect, it } from 'bun:test';
import { canvasSurface } from './canvasSurface.js';

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
    expect(canvasSurface({ ...base, frames: [{ health: 'unreachable', loadFailure: {} }] })).toMatchObject({ dead_end: { error_class: 'load_failed' } });
  });
  it('reports the blocking empty state and allows a live frame to recover the canvas', () => {
    expect(canvasSurface({ ...base, nodeCount: 0, frames: [], emptyFailure: 'preview' })).toMatchObject({ dead_end: { state: 'app_not_started' } });
    expect(canvasSurface({ ...base, frames: [{ health: 'live' }, { health: 'unreachable' }] })).toEqual({ surface: 'canvas' });
    expect(canvasSurface({ ...base, nodeCount: 0, frames: [] })).toEqual({ surface: 'chat_idle' });
  });
});
