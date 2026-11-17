import { afterAll, spyOn, test } from 'bun:test';
import { ipcMain } from 'electron';
import { exerciseLaunchSession } from './launch-session.test-support.js';

const handlers = new Map<string, Parameters<typeof ipcMain.handle>[1]>();
const registration = spyOn(ipcMain, 'handle').mockImplementation((channel, handler) => { handlers.set(channel, handler); });
afterAll(() => { registration.mockRestore(); });

test('starting deliberate sign-out supersedes a pending launch expiry before provider completion', () => exerciseLaunchSession('sign-out-pending', () => import('./index.js'), handlers));
