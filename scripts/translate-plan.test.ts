import { describe, expect, it } from 'bun:test';
import { composeGuide, glossary, noteFor, pendingByArea, sourceHash, type Catalog } from './translate-plan.js';

const english = new Map([['tour.json', { 'tour.skip': 'Skip', 'tour.next': 'Next', 'tour.done': 'Start', 'tour.new': 'Welcome' }]]);

describe('pendingByArea', () => {
  const catalog: Catalog = { english, translated: new Map([['tour.json', { 'tour.skip': 'スキップ', 'tour.next': '次へ', 'tour.done': '始める' }]]) };
  const record = { 'tour.skip': sourceHash('Skip'), 'tour.next': sourceHash('Next'), 'tour.done': sourceHash('Begin') };

  it('sends what is missing or whose English changed, and nothing current', () => {
    const pending = pendingByArea(catalog, record, []).get('tour.json') ?? [];
    expect(pending.map(({ key, reason }) => [key, reason])).toEqual([
      ['tour.done', 'changed'],
      ['tour.new', 'new'],
    ]);
    expect(pending[0]?.previous).toBe('始める');
  });

  it('sends a current key again when it is named, by key or by family', () => {
    expect(pendingByArea(catalog, record, ['tour.skip']).get('tour.json')?.find((item) => item.key === 'tour.skip')?.reason).toBe('redo');
    expect(pendingByArea(catalog, record, ['tour.*']).get('tour.json')).toHaveLength(4);
  });

  it('leaves a translation edited by hand alone while its English holds', () => {
    const edited: Catalog = { english, translated: new Map([['tour.json', { 'tour.skip': '飛ばす', 'tour.next': '次へ', 'tour.done': '始める', 'tour.new': 'ようこそ' }]]) };
    const all = { ...record, 'tour.done': sourceHash('Start'), 'tour.new': sourceHash('Welcome') };
    expect(pendingByArea(edited, all, []).size).toBe(0);
  });
});

describe('glossary', () => {
  it('keeps out translations whose English has moved on', () => {
    const catalog: Catalog = { english, translated: new Map([['tour.json', { 'tour.skip': 'スキップ', 'tour.done': '始める' }]]) };
    expect([...glossary(catalog, new Set(['tour.done'])).keys()]).toEqual(['Skip']);
  });
});

describe('noteFor', () => {
  it('finds the bullet that names the key, and only that one', () => {
    const notes = '# chat\n\n- From `chat.a`: First.\n- From `chat.ab`: Second,\n  over two lines.\n';
    expect(noteFor(notes, 'chat.ab')).toBe('- From `chat.ab`: Second,\n  over two lines.');
    expect(noteFor(notes, 'chat.b')).toBeUndefined();
  });
});

describe('composeGuide', () => {
  it('sends the shared guide first, then the language guide that overrides it, both filled for the language', () => {
    const guide = composeGuide('Translate from {source} to {target}.', 'In {target}, Finder is 访达.', 'Simplified Chinese');
    expect(guide).toBe('Translate from English to Simplified Chinese.\n\nFor Simplified Chinese in particular:\n\nIn Simplified Chinese, Finder is 访达.');
  });
});
