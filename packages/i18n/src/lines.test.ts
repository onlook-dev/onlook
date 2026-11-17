import { describe, expect, test } from 'bun:test';
import { oneLine } from './lines.js';

describe('a catalog line break read on one line', () => {
  test('becomes a space between words', () => {
    expect(oneLine('The Open Source\nDeveloper Tool for Designers')).toBe('The Open Source Developer Tool for Designers');
  });

  test('becomes nothing between two Japanese characters', () => {
    expect(oneLine('デザイナーのための\nオープンソース開発ツール')).toBe('デザイナーのためのオープンソース開発ツール');
  });

  test('stays a space beside Latin text in a Japanese line', () => {
    expect(oneLine('Onlook の\nデザイン')).toBe('Onlook のデザイン');
    expect(oneLine('ようこそ\nOnlook')).toBe('ようこそ Onlook');
  });
});
