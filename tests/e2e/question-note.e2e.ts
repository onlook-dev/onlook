import { expect, test, type Locator, type Page } from '@playwright/test';
import { closeStudio, FIRST_RUN_ENV, launchStudio } from './launch.js';

const QUESTION_NOTE_STORY = 'chat/question-sheet/question-sheet-one';
const LONG_QUESTION_NOTE = Array.from({ length: 20 }, () => 'wide').join(' ');
type QuestionNoteEdit = 'typing' | 'command' | 'option' | 'backspace';

function questionNote(page: Page): Locator {
  return page.getByTestId('question-sheet-one').getByTestId('question-note');
}

async function overflowQuestionNote(page: Page): Promise<void> {
  const input = questionNote(page);
  await input.fill(LONG_QUESTION_NOTE);
  await input.press('End');
  await expect(input).toHaveValue(LONG_QUESTION_NOTE);
  await expect.poll(() => input.evaluate(field => field.scrollWidth > field.clientWidth && field.scrollLeft > 0)).toBe(true);
  await expect.poll(() => input.evaluate(field => field.closest('[data-sheet-note]')?.getAttribute('data-fade'))).toBe('start');
}

async function editQuestionNote(page: Page, edit: QuestionNoteEdit): Promise<void> {
  const input = questionNote(page);
  if (edit === 'typing') {
    await input.fill('');
    await input.pressSequentially(LONG_QUESTION_NOTE);
    await expect(input).toHaveValue(LONG_QUESTION_NOTE);
    await expect.poll(() => input.evaluate(field => field.scrollLeft > 0)).toBe(true);
    return;
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
  await expect.poll(() => input.evaluate(field => field.closest('[data-sheet-note]')?.getAttribute('data-fade'))).toBe('none');
  await input.pressSequentially('Readable');
  await input.press('Backspace');
  await input.press('Tab');
  await expect(input).toHaveValue('Readabl');
}

for (const edit of ['typing', 'command', 'option', 'backspace'] satisfies QuestionNoteEdit[]) {
  test(`question responses keep every edit when ${edit} crosses the input width`, async () => {
    const app = await launchStudio('build', { STUDIO_SHOWROOM: QUESTION_NOTE_STORY, ...FIRST_RUN_ENV });
    try {
      const page = await app.firstWindow();
      await expect(questionNote(page)).toBeVisible();
      if (edit !== 'typing') await overflowQuestionNote(page);
      await editQuestionNote(page, edit);
    } finally {
      await closeStudio(app);
    }
  });
}
