import { listTargets, withSession } from './cdp.js';

export interface FolderPickAsked {
  folder: boolean;
  answer: string | null;
}

export interface MainInspector {
  /** Main's Node inspector; a packaged build disables it with its fuses. */
  inspectPort: string;
}

/** Plain JS run inside main: every open dialog from here on answers from the queue, and an empty queue or a file pick answers canceled, so no native panel opens. */
const INSTALL = `(paths) => {
  const dialog = require('electron').dialog;
  const state = (globalThis.__studioFolderPicks ??= { queue: [], asked: [] });
  if (!state.installed) {
    dialog.showOpenDialog = async (...args) => {
      const options = args.find((arg) => arg && Array.isArray(arg.properties)) ?? {};
      const folder = options.properties?.includes('openDirectory') === true;
      const answer = folder ? (state.queue.shift() ?? null) : null;
      state.asked.push({ folder, answer });
      return answer === null ? { canceled: true, filePaths: [] } : { canceled: false, filePaths: [answer] };
    };
    state.installed = true;
  }
  state.queue.push(...paths);
  return state.queue.length;
}`;

export function folderPicksExpression(paths: readonly string[]): string {
  return `(${INSTALL})(${JSON.stringify(paths)})`;
}

export const FOLDER_PICKS_ASKED_EXPRESSION = 'JSON.stringify(globalThis.__studioFolderPicks?.asked ?? [])';

async function evaluateInMain<T>(app: Partial<MainInspector>, expression: string): Promise<T> {
  if (app.inspectPort === undefined) {
    throw new Error('This launch recorded no inspector port: it predates folder-pick answers. Launch again with launchStudio from this library.');
  }
  const [target] = (await listTargets(app.inspectPort)).filter((t) => t.type === 'node');
  if (!target) throw new Error(`Main's inspector on 127.0.0.1:${app.inspectPort} lists no node target.`);
  const result = (await withSession(target, (send) =>
    send('Runtime.evaluate', { expression, includeCommandLineAPI: true, awaitPromise: true, returnByValue: true }),
  )) as { result?: { value?: T }; exceptionDetails?: { text?: string; exception?: { description?: string } } };
  const thrown = result.exceptionDetails;
  if (thrown) throw new Error(`Main threw: ${thrown.exception?.description ?? thrown.text ?? 'unknown'}`);
  return result.result?.value as T;
}

/** Queues answers for the app's folder picker, in order; resolves with how many are still unanswered. */
export async function answerFolderPicks(app: Partial<MainInspector>, paths: readonly string[]): Promise<number> {
  return evaluateInMain<number>(app, folderPicksExpression(paths));
}

/** Every open dialog main was asked for since the first answer was queued, and what it answered. */
export async function folderPicksAsked(app: Partial<MainInspector>): Promise<FolderPickAsked[]> {
  return JSON.parse(await evaluateInMain<string>(app, FOLDER_PICKS_ASKED_EXPRESSION)) as FolderPickAsked[];
}
