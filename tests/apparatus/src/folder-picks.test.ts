import { afterEach, describe, expect, it } from 'bun:test';
import { FOLDER_PICKS_ASKED_EXPRESSION, folderPicksExpression, type FolderPickAsked } from './folder-picks.js';

type Dialog = { showOpenDialog: (...args: unknown[]) => Promise<{ canceled: boolean; filePaths: string[] }> };

const FOLDER = { properties: ['openDirectory', 'createDirectory'] };
const IMAGE = { properties: ['openFile', 'multiSelections'] };

function mainWith(dialog: Dialog) {
  const realm: Record<string, unknown> = {};
  const run = <T>(expression: string): T =>
    new Function('require', 'globalThis', `return ${expression}`)(() => ({ dialog }), realm) as T;
  return {
    queue: (paths: string[]) => run<number>(folderPicksExpression(paths)),
    asked: () => JSON.parse(run<string>(FOLDER_PICKS_ASKED_EXPRESSION)) as FolderPickAsked[],
  };
}

let realCalls = 0;
const realDialog = (): Dialog => ({
  showOpenDialog: async () => {
    realCalls += 1;
    return { canceled: false, filePaths: ['/real'] };
  },
});

afterEach(() => {
  realCalls = 0;
});

describe('folder-pick answers in main', () => {
  it('answers folder picks in queue order, with or without an owner window', async () => {
    const dialog = realDialog();
    const main = mainWith(dialog);
    main.queue(['/a', '/b']);
    expect(await dialog.showOpenDialog({ id: 'window' }, FOLDER)).toEqual({ canceled: false, filePaths: ['/a'] });
    expect(await dialog.showOpenDialog(FOLDER)).toEqual({ canceled: false, filePaths: ['/b'] });
  });

  it('answers canceled once the queue is empty and never opens the real dialog', async () => {
    const dialog = realDialog();
    const main = mainWith(dialog);
    main.queue([]);
    expect(await dialog.showOpenDialog(FOLDER)).toEqual({ canceled: true, filePaths: [] });
    expect(realCalls).toBe(0);
    expect(main.asked()).toEqual([{ folder: true, answer: null }]);
  });

  it('cancels a file pick without spending a queued folder', async () => {
    const dialog = realDialog();
    const main = mainWith(dialog);
    main.queue(['/a']);
    expect(await dialog.showOpenDialog(IMAGE)).toEqual({ canceled: true, filePaths: [] });
    expect(await dialog.showOpenDialog(FOLDER)).toEqual({ canceled: false, filePaths: ['/a'] });
    expect(realCalls).toBe(0);
  });

  it('adds to the queue on a second call instead of wrapping the stub again', async () => {
    const dialog = realDialog();
    const main = mainWith(dialog);
    main.queue(['/a']);
    expect(main.queue(['/b'])).toBe(2);
    await dialog.showOpenDialog(FOLDER);
    await dialog.showOpenDialog(FOLDER);
    expect(main.asked()).toEqual([
      { folder: true, answer: '/a' },
      { folder: true, answer: '/b' },
    ]);
  });
});
