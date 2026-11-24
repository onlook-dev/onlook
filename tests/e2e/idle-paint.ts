import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { ElectronApplication, Page } from '@playwright/test';

export async function measureIdlePaint(app: ElectronApplication, page: Page, durationMs = 10_000) {
  const hostId = await app.evaluate(({ webContents }, url) => webContents.getAllWebContents().find(contents => contents.getURL() === url)!.getOSProcessId(), page.url());
  await app.evaluate(async ({ contentTracing }) => contentTracing.startRecording({ included_categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline.frame'] }));
  const path = join(tmpdir(), `idle-paint-${crypto.randomUUID()}.json`);
  try {
    await page.waitForTimeout(durationMs);
  } finally {
    await app.evaluate(async ({ contentTracing }, output) => contentTracing.stopRecording(output), path);
  }
  const { traceEvents } = JSON.parse(readFileSync(path, 'utf8')) as { traceEvents: Array<{ name: string; pid: number; tid: number; ts: number }> };
  const frames = new Set<string>();
  const currentFrames = new Map<number, number>();
  let paints = 0;
  for (const event of traceEvents.filter(event => event.pid === hostId).sort((left, right) => left.ts - right.ts)) {
    if (event.name === 'BeginMainThreadFrame') currentFrames.set(event.tid, event.ts);
    if (event.name !== 'Paint') continue;
    paints += 1;
    frames.add(`${event.tid}:${currentFrames.get(event.tid) ?? event.ts}`);
  }
  return { paints, paintedFrames: frames.size, paintedFramesPerSecond: frames.size / (durationMs / 1000) };
}
