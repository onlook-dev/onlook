import { expect, type Locator, type Page } from '@playwright/test';

export const QUESTION_NOTE_STORY = 'chat/question-sheet/question-sheet-one';
export const LONG_QUESTION_NOTE = Array.from({ length: 20 }, () => 'wide').join(' ');
export type QuestionNoteEdit = 'typing' | 'command' | 'option' | 'backspace';

export function questionNote(page: Page): Locator {
  return page.getByTestId('question-sheet-one').getByTestId('question-note').locator('input');
}

export async function overflowQuestionNote(page: Page): Promise<void> {
  const input = questionNote(page);
  await input.fill(LONG_QUESTION_NOTE);
  await input.press('End');
  await expect(input).toHaveValue(LONG_QUESTION_NOTE);
  await expect.poll(() => input.evaluate(field => field.scrollWidth > field.clientWidth && field.scrollLeft > 0)).toBe(true);
}

export async function editQuestionNote(page: Page, edit: QuestionNoteEdit): Promise<string> {
  const input = questionNote(page);
  if (edit === 'typing') {
    await input.fill('');
    await input.pressSequentially(LONG_QUESTION_NOTE);
    await expect(input).toHaveValue(LONG_QUESTION_NOTE);
    await expect.poll(() => input.evaluate(field => field.scrollLeft > 0)).toBe(true);
    return LONG_QUESTION_NOTE;
  }
  if (edit === 'command') {
    await input.press('Meta+Backspace');
    await expect(input).toHaveValue('');
  } else {
    let expected = LONG_QUESTION_NOTE;
    while (expected.length > 0) {
      expected = edit === 'option' ? expected.trimEnd().replace(/\S+$/, '') : expected.slice(0, -1);
      await input.press(edit === 'option' ? 'Alt+Backspace' : 'Backspace');
      await expect(input).toHaveValue(expected);
    }
  }
  await expect.poll(() => input.evaluate(field => field.scrollLeft)).toBe(0);
  await input.pressSequentially('Readable');
  await input.press('Backspace');
  await input.press('Tab');
  await expect(input).toHaveValue('Readabl');
  return 'Readabl';
}
