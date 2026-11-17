import { describe, expect, it } from 'bun:test';
import type { TranscriptItem } from '@studio/events';
import { placeTurnFooters } from './turnFooters.js';

const user = (id: string, extra: Partial<Extract<TranscriptItem, { kind: 'user' }>> = {}): TranscriptItem => ({ kind: 'user', id, text: id, ...extra });
const reply = (id: string): TranscriptItem => ({ kind: 'assistant-text', id, text: id, isStreaming: false });
const tools = (id: string): TranscriptItem => ({ kind: 'tools', id, calls: [] });

describe('the turn footer shows once, at the end of the turn (ONL-2960)', () => {
  it('goes on the last reply of a turn that wrote several between its tool runs', () => {
    const items = [user('p1'), reply('a'), tools('t1'), reply('b'), tools('t2'), reply('c'), tools('t3')];
    expect([...placeTurnFooters(items, false)]).toEqual(['c']);
  });

  it('draws none while the turn is still running, though its earlier replies have finished', () => {
    expect(placeTurnFooters([user('p1'), reply('a'), tools('t1')], true).size).toBe(0);
  });

  it('keeps each earlier prompt’s footer while a later one runs', () => {
    expect([...placeTurnFooters([user('p1'), reply('a'), reply('b'), user('p2'), reply('c')], true)]).toEqual(['b']);
  });

  it('is not split by a hidden Studio prompt or a message that joined the live turn', () => {
    const items = [user('setup', { origin: 'studio' }), reply('a'), user('more', { hidden: true }), reply('b'), user('typed', { joinsTurn: true }), reply('c')];
    expect([...placeTurnFooters(items, false)]).toEqual(['c']);
  });
});
