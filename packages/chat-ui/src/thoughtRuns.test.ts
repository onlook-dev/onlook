import { describe, expect, it } from 'bun:test';
import type { TranscriptItem } from '@studio/events';
import { mergeThoughts } from './thoughtRuns.js';

const thought = (id: string, text: string, isStreaming = false): TranscriptItem => ({ kind: 'assistant-thinking', id, text, isStreaming });
const silent: TranscriptItem = { kind: 'tools', id: 'silent', calls: [] };
const drawn: TranscriptItem = { kind: 'tools', id: 'drawn', calls: [] };
const reply: TranscriptItem = { kind: 'assistant-text', id: 'reply', text: 'Done.', isStreaming: false };
const drawsNothing = (item: TranscriptItem): boolean => item === silent;

describe('consecutive thinking blocks read as one Thought', () => {
  it('folds adjacent blocks into the first one’s row, every block’s text in order', () => {
    const rows = mergeThoughts([thought('a', 'First.'), thought('b', ''), thought('c', 'Third.'), silent], drawsNothing, true);
    expect(rows).toStrictEqual([thought('a', 'First.\n\nThird.', true), silent]);
  });

  it('reaches across a row the column draws nothing for, and keeps that row in place', () => {
    const rows = mergeThoughts([thought('a', 'One.'), silent, thought('b', 'Two.'), silent], drawsNothing, true);
    expect(rows).toStrictEqual([thought('a', 'One.\n\nTwo.', true), silent, silent]);
  });

  it('keeps blocks apart when a drawn tool line sits between them', () => {
    const rows = mergeThoughts([thought('a', 'One.'), drawn, thought('b', 'Tw', true)], drawsNothing, true);
    expect(rows).toStrictEqual([drawn, thought('b', 'Tw', true)]);
  });

  it('stays streaming between blocks while it is the last thing a live turn drew', () => {
    const rows = mergeThoughts([thought('a', 'One.'), thought('b', 'Two.'), silent], drawsNothing, true);
    expect(rows[0]).toMatchObject({ id: 'a', isStreaming: true });
  });

  it('streams while its latest block does', () => {
    expect(mergeThoughts([thought('a', 'One.'), thought('b', 'Tw', true), drawn], drawsNothing, true)[0]).toMatchObject({ isStreaming: true });
  });
});

describe('a finished thought draws no line (ONL-2960)', () => {
  it('drops a thought once something drawn follows it, and keeps the rows around it', () => {
    expect(mergeThoughts([thought('a', 'One.'), thought('b', 'Two.'), drawn, thought('c', 'Three.'), reply], drawsNothing, false)).toStrictEqual([drawn, reply]);
  });

  it('drops a thought once the turn ends', () => {
    expect(mergeThoughts([thought('a', 'One.'), thought('b', 'Two.')], drawsNothing, false)).toStrictEqual([]);
  });

  it('keeps the line while the agent is still thinking', () => {
    expect(mergeThoughts([drawn, thought('a', 'On', true)], drawsNothing, true)).toStrictEqual([drawn, thought('a', 'On', true)]);
  });

  it('keeps a lone block thinking while it is the last thing a live turn drew, so the line does not drop out between blocks', () => {
    expect(mergeThoughts([drawn, thought('a', 'One.'), silent], drawsNothing, true)).toStrictEqual([drawn, thought('a', 'One.', true), silent]);
  });

  it('leaves the rows alone when there is no thought', () => {
    const items = [drawn, reply];
    expect(mergeThoughts(items, drawsNothing, false)).toBe(items);
  });
});
