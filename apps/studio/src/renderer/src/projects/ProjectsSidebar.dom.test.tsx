// A real root, not markup: the claim is what the Settings row DOES when pressed, which static HTML cannot answer.

import { afterEach, describe, expect, it } from 'bun:test';
import { takeComplaints } from '../testing/dom.js';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { RendererTelemetryEvent } from '@studio/events';
import { installBridge } from '../testing/bridge.js';
import {
  resetSettingsDialogForTesting,
  useSettingsDialogStore,
} from '../settings/settingsDialogStore.js';
import { ProjectsSidebar } from './ProjectsSidebar.js';

const reported: RendererTelemetryEvent[] = [];

afterEach(() => {
  resetSettingsDialogForTesting();
  reported.length = 0;
  takeComplaints();
});

async function railWithSettingsPressed(): Promise<void> {
  installBridge({
    telemetryEvent: (event: RendererTelemetryEvent) => {
      reported.push(event);
    },
  });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(<ProjectsSidebar workspaces={[]} isRecentSelected />);
  });
  const row = container.querySelector('[data-testid="projects-settings"] button');
  expect(row).not.toBeNull();
  await act(async () => {
    (row as HTMLButtonElement).click();
  });
  await act(async () => {
    root.unmount();
  });
  container.remove();
}

describe('the Projects rail’s Settings row (ONL-2499)', () => {
  it('opens the modal itself rather than selecting a page', async () => {
    await railWithSettingsPressed();

    expect(useSettingsDialogStore.getState().isOpen).toBe(true);
  });

  it('names its own door, so the two ways in stay tellable apart', async () => {
    await railWithSettingsPressed();

    expect(useSettingsDialogStore.getState().source).toBe('sidebar');
    expect(reported).toEqual([
      { event: 'settings_opened', properties: { source: 'sidebar' } },
    ]);
  });
});
