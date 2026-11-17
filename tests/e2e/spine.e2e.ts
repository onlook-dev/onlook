import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type ElectronApplication, type Page } from '@playwright/test';
import type { AgentConnectionStatus, AgentSnapshot, ClientCommand } from '@studio/events';
import { cleanupTempFixtures, makeSourceCheckout, makeWorkspaceRoot } from '@studio/fixtures';
import { TESTID } from './contract.js';
import { chromePage, closeStudio, createProjectWithoutStart, editorPage, isTargetPresent, launchStudio, missingHint, repoRoot, type Target } from './launch.js';

const target = (process.env['STUDIO_TARGET'] ?? 'build') as Target;
const RECORDING = join(repoRoot, 'tests/live/recordings/claude/tools.jsonl');

test.describe.configure({ mode: 'serial' });
test.skip(target === 'packaged', 'a replayed agent stream is shut on a packaged build');

let app: ElectronApplication;

test.beforeAll(async () => {
  expect(isTargetPresent(target), missingHint(target)).toBe(true);
  app = await launchStudio(target, {
    STUDIO_WORKSPACE_ROOT: makeWorkspaceRoot(),
    STUDIO_AGENT_REPLAY: RECORDING,
    // Unpinned, or the connection check reads the pin instead of the probe.
    STUDIO_AGENT_PROBE: '',
  });
});

test.afterAll(async () => {
  await closeStudio(app);
  cleanupTempFixtures();
});

type BridgeCall = { kind: 'probe' } | { kind: 'snapshot'; since?: number } | { kind: 'command'; command: ClientCommand };

function callStudio(page: Page, call: { kind: 'probe' }): Promise<AgentConnectionStatus>;
function callStudio(page: Page, call: { kind: 'snapshot'; since?: number }): Promise<AgentSnapshot>;
function callStudio(page: Page, call: { kind: 'command'; command: ClientCommand }): Promise<unknown>;
function callStudio(page: Page, call: BridgeCall): Promise<unknown> {
  return page.evaluate(async (request) => {
    const studio = globalThis.studio;
    if (request.kind === 'probe') return (await studio.agentProbe({ fresh: true })).status;
    if (request.kind === 'snapshot') return studio.agentSnapshot(request.since === undefined ? {} : { sinceSeq: request.since });
    return studio.agentCommand(request.command as ClientCommand);
  }, call);
}

const freshProbe = (page: Page): Promise<AgentConnectionStatus> => callStudio(page, { kind: 'probe' });

function pinProbe(status: AgentConnectionStatus | ''): Promise<void> {
  return app.evaluate((_electron, pinned) => {
    process.env['STUDIO_AGENT_PROBE'] = pinned;
  }, status);
}

function recordedToolNames(): string[] {
  return readFileSync(RECORDING, 'utf8')
    .split('\n')
    .filter((line) => line.includes('"tool_use"'))
    .flatMap((line) => {
      const row = JSON.parse(line) as { type?: string; message?: { content?: { type?: string; name?: string }[] } };
      return row.type === 'assistant' ? (row.message?.content ?? []).filter((block) => block.type === 'tool_use').map((block) => block.name ?? '') : [];
    });
}

test('the app launches into the projects view, with no canvas', async () => {
  const window = await editorPage(app);
  await expect(window.getByTestId(TESTID.projectsView)).toBeVisible();
  await expect(window.getByTestId(TESTID.projectsSidebar)).toBeVisible();
  await expect(window.getByTestId(TESTID.canvasRegion)).toHaveCount(0);
  await expect((await chromePage(app)).getByTestId(TESTID.topbar)).toBeVisible();
  await expect(window.locator('html')).toHaveAttribute('data-astryx-theme', 'studio');
});

test('connecting a git project from the projects view cuts its worktree and reaches the editor, with no safety screen', async () => {
  const window = await editorPage(app);
  await createProjectWithoutStart(window, makeSourceCheckout().path);

  await expect(window.getByTestId(TESTID.workspaceRefused)).toHaveCount(0);
  await expect(window.getByTestId(TESTID.canvasRegion)).toBeVisible();
  await expect(window.getByTestId(TESTID.sidebar)).toBeVisible();
  await expect(window.getByTestId(TESTID.chatRegion)).toBeVisible();
  const gitPill = (await chromePage(app)).getByTestId(TESTID.topbarGitStatus);
  await expect(gitPill).toBeVisible();
  await expect(gitPill).not.toHaveAttribute('data-git-state', 'first-paint', { timeout: 30_000 });
});

test('the chat connection check settles, and a failed check shows no connection until a fresh check passes', async () => {
  const window = await editorPage(app);
  const composer = window.getByTestId(TESTID.chatComposer);
  await expect(composer).toBeVisible();

  let status = 'unknown' as AgentConnectionStatus;
  await expect.poll(async () => (status = await freshProbe(window)), { timeout: 30_000 }).not.toBe('unknown');
  if (status !== 'ok') await expect(window.getByTestId(TESTID.chatNoConnection)).toBeVisible();

  await pinProbe('error');
  expect(await freshProbe(window)).toBe('error');
  await expect(window.getByTestId(TESTID.chatNoConnection)).toBeVisible();

  await pinProbe('ok');
  expect(await freshProbe(window)).toBe('ok');
  await expect(window.getByTestId(TESTID.chatNoConnection)).toHaveCount(0);
});

test('a prompt typed in the chat reaches the session, and its turn adds a frame to the canvas', async () => {
  expect(recordedToolNames(), 'the recording no longer creates a frame; re-record or pick another').toContain('mcp__studio__create_frame');
  const window = await editorPage(app);
  const frames = window.getByTestId(TESTID.frameNode);
  const before = await frames.count();
  const mark = (await callStudio(window, { kind: 'snapshot' })).lastSeq;

  const input = window.getByTestId(TESTID.chatComposer).locator('textarea, [contenteditable="true"]').first();
  await input.click();
  await input.fill('Add a frame for the dev server.');
  await input.press('Enter');

  // The recorded turn parks on undo_canvas and redo_canvas; each is answered the way the card's Allow answers it.
  const answered = new Set<string>();
  let snapshot: AgentSnapshot | undefined;
  await expect
    .poll(
      async () => {
        snapshot = await callStudio(window, { kind: 'snapshot', since: mark });
        for (const event of snapshot.events) {
          if (event.type !== 'permission.requested' || answered.has(event.requestId)) continue;
          answered.add(event.requestId);
          await callStudio(window, { kind: 'command', command: { type: 'permission.respond', requestId: event.requestId, optionId: 'allow' } });
        }
        return !snapshot.isStreaming && snapshot.events.some((event) => event.type === 'turn.ended');
      },
      { timeout: 30_000 },
    )
    .toBe(true);

  const prompted = snapshot!.events.find((event) => event.type === 'message.user');
  expect(prompted, 'the typed prompt never reached the session').toBeDefined();
  const created = snapshot!.events.find((event) => event.type === 'tool.end' && event.status === 'completed' && snapshot!.events.some((start) => start.type === 'tool.start' && start.toolCallId === event.toolCallId && start.name === 'mcp__studio__create_frame'));
  expect(created, 'create_frame did not complete on this canvas').toBeDefined();
  await expect(frames).toHaveCount(before + 1);
});
