import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { cleanupTempFixtures, makeSourceCheckout, makeWorkspaceRoot } from '@studio/fixtures';
import { TESTID } from './contract.js';
import { agentSnapshot, closeStudio, createProjectWithoutStart, editorPage, launchStudio, repoRoot } from './launch.js';

test('Project Chat accepts 1,300 uninterrupted keystrokes without window errors and sends the complete draft', async () => {
  const app = await launchStudio('build', {
    STUDIO_WORKSPACE_ROOT: makeWorkspaceRoot(),
    STUDIO_AGENT_PROBE: 'ok',
    STUDIO_AGENT_VERIFY: 'ok',
    STUDIO_AGENT_REPLAY: join(repoRoot, 'tests/live/recordings/claude/tools.jsonl'),
  });
  try {
    const page = await editorPage(app);
    await createProjectWithoutStart(page, makeSourceCheckout().path);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const input = page.getByTestId(TESTID.chatComposer).locator('[contenteditable="true"]');
    await expect(input).toHaveAttribute('contenteditable', 'true');
    await input.click();
    const draft = 'Make the cards easier to read with consistent spacing. '.repeat(25).slice(0, 1299) + '.';
    expect(draft.length).toBe(1300);
    const session = await page.context().newCDPSession(page);
    try {
      await Promise.all([...draft].map(text => session.send('Input.dispatchKeyEvent', { type: 'char', text })));
    } finally {
      await session.detach();
    }
    expect(errors).toEqual([]);
    expect(await input.innerText()).toBe(draft);
    await page.keyboard.press('Enter');
    await expect.poll(async () => {
      const snapshot = await agentSnapshot(page);
      return snapshot.events.some(event => event.type === 'message.user' && event.text === draft);
    }).toBe(true);
    expect(errors).toEqual([]);
  } finally {
    await closeStudio(app);
    cleanupTempFixtures();
  }
});
