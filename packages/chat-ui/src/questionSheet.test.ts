import { describe, expect, test } from 'bun:test';
import { answerCounts, answerParts, type Question } from '@studio/events';
import {
  draftOf,
  goTo,
  next,
  openSheet,
  pick,
  sheetAnswers,
  sheetHeader,
  sheetInput,
  sheetKey,
  sheetSteps,
  writeNote,
} from './questionSheet.js';

const FONT: Question = {
  question: 'Which font style should the headline use?',
  header: 'Font',
  options: [
    { label: 'Warm serif', description: 'Classic and warm' },
    { label: 'Rounded sans', description: 'Soft and friendly' },
  ],
};
const PARTS: Question = {
  question: 'Which sections should change with it?',
  header: 'Sections',
  multiSelect: true,
  options: [
    { label: 'Headline & tagline', description: '' },
    { label: 'Menu list', description: '' },
    { label: 'Order button', description: '' },
  ],
};
const COLOUR: Question = { question: 'Warm the colours?', header: 'Colour', options: [{ label: 'Yes', description: '' }, { label: 'No', description: '' }] };

describe('the header', () => {
  test('one question has none, and two or more show a count', () => {
    expect(sheetHeader(1)).toBe('none');
    expect(sheetHeader(2)).toBe('count');
    expect(sheetHeader(4)).toBe('count');
  });
});

describe('the key', () => {
  test('says Next before the last question and Send on it', () => {
    const questions = [FONT, PARTS];
    const first = pick(openSheet('r1'), questions, 'Warm serif');
    expect(sheetKey(first, questions).action).toBe('next');
    const second = next(first, questions);
    expect(second.at).toBe(1);
    expect(sheetKey(second, questions).action).toBe('send');
  });

  test('stays unlit until the current question has a pick or words of its own', () => {
    const questions = [FONT];
    const open = openSheet('r1');
    expect(sheetKey(open, questions).isLit).toBe(false);
    expect(sheetKey(pick(open, questions, 'Rounded sans'), questions).isLit).toBe(true);
    expect(sheetKey(writeNote(open, questions, 'Something hand-drawn'), questions).isLit).toBe(true);
    expect(sheetKey(writeNote(open, questions, '   '), questions).isLit).toBe(false);
  });

  test('cannot step past a question nobody answered', () => {
    const questions = [FONT, PARTS];
    expect(next(openSheet('r1'), questions).at).toBe(0);
  });
});

describe('picking', () => {
  test('a single-select pick replaces the last one and does not send', () => {
    const questions = [FONT];
    const state = pick(pick(openSheet('r1'), questions, 'Warm serif'), questions, 'Rounded sans');
    expect(sheetAnswers(questions, state)).toEqual({ [FONT.question]: 'Rounded sans' });
    expect(sheetKey(state, questions).action).toBe('send');
  });

  test('a multi-select pick toggles, and the answer lists picks in option order', () => {
    const questions = [PARTS];
    let state = openSheet('r1');
    for (const label of ['Order button', 'Headline & tagline', 'Menu list', 'Menu list']) state = pick(state, questions, label);
    expect(sheetAnswers(questions, state)).toEqual({ [PARTS.question]: 'Headline & tagline, Order button' });
  });

  test('a pick lands on the question on screen, not the first one', () => {
    const questions = [FONT, PARTS];
    const state = pick(next(pick(openSheet('r1'), questions, 'Warm serif'), questions), questions, 'Menu list');
    expect(sheetAnswers(questions, state)).toEqual({ [FONT.question]: 'Warm serif', [PARTS.question]: 'Menu list' });
  });

  test('a label that is not an option of the question on screen changes nothing', () => {
    const questions = [FONT];
    const open = openSheet('r1');
    expect(pick(open, questions, 'Menu list')).toEqual(open);
  });
});

describe('the field', () => {
  test('a note rides after the picks, and words alone are the answer', () => {
    const questions = [FONT, PARTS];
    let state = writeNote(pick(openSheet('r1'), questions, 'Warm serif'), questions, ' bolder ');
    state = writeNote(next(state, questions), questions, 'Only the hero');
    expect(sheetAnswers(questions, state)).toEqual({ [FONT.question]: 'Warm serif, bolder', [PARTS.question]: 'Only the hero' });
  });

  test('typed words make the answer typed; picks alone keep how they were picked', () => {
    const questions = [FONT];
    const tapped = pick(openSheet('r1'), questions, 'Warm serif', 'number-key');
    expect(sheetInput(tapped)).toBe('number-key');
    expect(sheetInput(writeNote(tapped, questions, 'bolder'))).toBe('typed');
  });
});

describe('splitting a sent answer for the bubble', () => {
  test('picks come back in option order and the rest is the note', () => {
    expect(answerParts(PARTS, 'Headline & tagline, Order button, Keep it readable')).toEqual({ picks: ['Headline & tagline', 'Order button'], note: 'Keep it readable' });
  });

  test('an answer in their own words is all note', () => {
    expect(answerParts(FONT, 'Something hand-drawn')).toEqual({ picks: [], note: 'Something hand-drawn' });
  });

  test('a label that is only the start of a longer word is not a pick', () => {
    const question: Question = { question: 'q', header: '', options: [{ label: 'Warm', description: '' }] };
    expect(answerParts(question, 'Warmer please')).toEqual({ picks: [], note: 'Warmer please' });
  });

  test('round-trips what the sheet sends', () => {
    const questions = [PARTS];
    const state = writeNote(pick(pick(openSheet('r1'), questions, 'Menu list'), questions, 'Order button'), questions, 'Keep it readable');
    expect(answerParts(PARTS, sheetAnswers(questions, state)[PARTS.question]!)).toEqual({ picks: ['Menu list', 'Order button'], note: 'Keep it readable' });
  });
});

describe('what the answers count', () => {
  test('counts questions that took the first option, and picks that carried a note', () => {
    expect(answerCounts([FONT, PARTS, COLOUR], {
      [FONT.question]: 'Warm serif, bolder',
      [PARTS.question]: 'Menu list',
      [COLOUR.question]: 'Yes',
    })).toEqual({ firstOptionPicks: 2, notes: 1 });
  });
});

describe('picking', () => {
  test('picking the same single-choice option again leaves it picked, once', () => {
    const questions = [FONT];
    const twice = pick(pick(openSheet('r1'), questions, 'Warm serif'), questions, 'Warm serif');
    expect(draftOf(twice, FONT).picks).toEqual(['Warm serif']);
    expect(sheetAnswers(questions, twice)).toEqual({ [FONT.question]: 'Warm serif' });
  });
});

describe('going back', () => {
  const questions = [FONT, PARTS, COLOUR];
  const atSecond = next(pick(openSheet('r1'), questions, 'Warm serif'), questions);

  test('keeps the answers given, and sends the one that changed', () => {
    const answeredSecond = pick(atSecond, questions, 'Menu list');
    const back = goTo(answeredSecond, questions, 0);
    expect(back.at).toBe(0);
    expect(sheetKey(back, questions)).toEqual({ action: 'next', isLit: true });
    const changed = pick(back, questions, 'Rounded sans');
    const atLast = pick(next(next(changed, questions), questions), questions, 'Yes');
    expect(sheetAnswers(questions, atLast)).toEqual({ [FONT.question]: 'Rounded sans', [PARTS.question]: 'Menu list', [COLOUR.question]: 'Yes' });
    expect(atLast.wentBack).toBe(true);
  });

  test('a question past an unanswered one cannot be reached, so Send never waits on a question left behind', () => {
    const answeredSecond = pick(atSecond, questions, 'Menu list');
    const atLast = next(answeredSecond, questions);
    const back = goTo(atLast, questions, 1);
    const cleared = pick(back, questions, 'Menu list');
    expect(sheetSteps(cleared, questions)[2]?.isOpen).toBe(false);
    expect(goTo(cleared, questions, 2).at).toBe(1);
  });

  test('an earlier question shows what was answered, cut on a word when long', () => {
    const long = 'word '.repeat(60).trim();
    const noted = next(writeNote(openSheet('r1'), questions, long), questions);
    const hint = sheetSteps(noted, questions)[0]?.hint ?? '';
    expect(hint.length).toBeLessThanOrEqual(121);
    expect(hint.endsWith('word…')).toBe(true);
    expect(sheetSteps(atSecond, questions)[0]?.hint).toBe('Warm serif');
  });
});
