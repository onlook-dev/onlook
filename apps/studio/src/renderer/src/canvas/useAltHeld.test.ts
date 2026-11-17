import '../testing/dom.js';
import { describe, expect, test } from 'bun:test';
import { altHeldAfter, fieldHasText, type AltEvent } from './useAltHeld.js';

const down = (key: string, isInField = false): AltEvent => ({ type: 'keydown', key, isInField });
const up = (key: string): AltEvent => ({ type: 'keyup', key, isInField: false });

const replay = (events: AltEvent[]): boolean => events.reduce(altHeldAfter, false);

describe('the ⌥ measuring chord', () => {
  test('⌥ down holds it and ⌥ up ends it', () => {
    expect(replay([down('Alt')])).toBe(true);
    expect(replay([down('Alt'), up('Alt')])).toBe(false);
  });

  test('arrows and ⇧ keep it, so a nudge under ⌥ shows its distance change live', () => {
    expect(replay([down('Alt'), down('ArrowRight'), down('ArrowRight'), down('Shift'), down('ArrowDown')])).toBe(true);
  });

  test('a character key with ⌥ is an option-character being typed, and ends it', () => {
    expect(replay([down('Alt'), down('é')])).toBe(false);
  });

  test('any key in a text field ends it: ⌥← and ⌥⌫ there are editing, not measuring', () => {
    expect(replay([down('Alt'), down('ArrowLeft', true)])).toBe(false);
    expect(replay([down('Alt'), down('Backspace', true)])).toBe(false);
  });

  test('⌥ in a field that already holds text does not start it', () => {
    expect(replay([{ type: 'keydown', key: 'Alt', isInField: true, hasTyped: true }])).toBe(false);
    expect(replay([{ type: 'keydown', key: 'Alt', isInField: true, hasTyped: false }])).toBe(true);
  });

  test('losing the window ends it, since the ⌥ keyup goes to another app', () => {
    expect(replay([down('Alt'), { type: 'blur' }])).toBe(false);
  });

  test('releasing another key does not end it', () => {
    expect(replay([down('Alt'), down('Shift'), up('Shift')])).toBe(true);
  });
});

describe('the field the chord reads', () => {
  const composer = (words: string): HTMLElement => {
    const host = document.createElement('div');
    host.contentEditable = 'true';
    host.append(document.createTextNode(words));
    const chip = document.createElement('span');
    chip.contentEditable = 'false';
    chip.append(document.createElement('button'));
    host.append(chip);
    return host;
  };

  test('an empty field has no text and a filled one does', () => {
    expect(fieldHasText(composer(''))).toBe(false);
    expect(fieldHasText(composer('make the heading bigger'))).toBe(true);
  });

  test('a chip inside the composer reads its words, so ⌥ on one stays an option-character (ONL-2640)', () => {
    const host = composer('make the heading bigger');
    const chip = host.querySelector('span');
    const inside = host.querySelector('button');
    expect(chip?.isContentEditable).toBe(false);
    expect(fieldHasText(chip)).toBe(true);
    expect(fieldHasText(inside)).toBe(true);
    expect(replay([{ type: 'keydown', key: 'Alt', isInField: true, hasTyped: fieldHasText(inside) }])).toBe(false);
  });

  test('a control outside any field holds no text', () => {
    expect(fieldHasText(document.createElement('button'))).toBe(false);
    expect(fieldHasText(null)).toBe(false);
  });
});
