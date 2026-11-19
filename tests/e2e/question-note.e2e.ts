import { test } from '@playwright/test';
import { closeStudio, FIRST_RUN_ENV, launchStudio } from './launch.js';
import { editQuestionNote, overflowQuestionNote, QUESTION_NOTE_STORY, type QuestionNoteEdit } from './questionNote.js';

for (const edit of ['typing', 'command', 'option', 'backspace'] satisfies QuestionNoteEdit[]) {
  test(`question responses keep every edit when ${edit} crosses the input width`, async () => {
    const app = await launchStudio('build', { STUDIO_SHOWROOM: QUESTION_NOTE_STORY, ...FIRST_RUN_ENV });
    try {
      const page = await app.firstWindow();
      await page.getByTestId('question-sheet-one').waitFor();
      if (edit !== 'typing') await overflowQuestionNote(page);
      await editQuestionNote(page, edit);
    } finally {
      await closeStudio(app);
    }
  });
}
