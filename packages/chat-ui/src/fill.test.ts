import { describe, expect, test } from 'bun:test';
import { around, sentenceParts, withoutSlot } from './fill.js';

describe('a value placed by the translation, not by English word order', () => {
  test('sits where the template puts its slot', () => {
    expect(around('Couldn’t start {repo}', 'repo')).toEqual({ before: 'Couldn’t start ', after: '' });
    expect(around('{repo} を起動できませんでした', 'repo')).toEqual({ before: '', after: ' を起動できませんでした' });
  });

  test('follows a template that has no slot', () => {
    expect(around('Ran', 'target')).toEqual({ before: 'Ran ', after: '' });
  });

  test('leaves no slot or stray space behind when there is nothing to place', () => {
    expect(withoutSlot('Ran {target}', 'target')).toBe('Ran');
    expect(withoutSlot('Looked at {target} again', 'target')).toBe('Looked at again');
  });
});

describe('a sentence holding several values', () => {
  test('puts each value where the translation puts its slot', () => {
    expect(sentenceParts('We made a new copy of {repo} named {project}', ['repo', 'project'])).toEqual([
      { text: 'We made a new copy of ' },
      { slot: 'repo' },
      { text: ' named ' },
      { slot: 'project' },
    ]);
    expect(sentenceParts('{project} という名前で {repo} のコピーを作成しました。', ['repo', 'project'])).toEqual([
      { slot: 'project' },
      { text: ' という名前で ' },
      { slot: 'repo' },
      { text: ' のコピーを作成しました。' },
    ]);
  });

  test('still shows a value the template lost', () => {
    expect(sentenceParts('Copied {repo}', ['repo', 'project'])).toEqual([{ text: 'Copied ' }, { slot: 'repo' }, { slot: 'project' }]);
  });
});
