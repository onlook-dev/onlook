import { afterEach, expect, test } from 'bun:test';
import '../../testing/dom.js';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { t } from '@studio/i18n';
import { seedCapabilities } from '../../capabilities.js';
import { seedFlags } from '../../flags/store.js';
import { GITHUB_IMPORT_GALLERY } from './github-import.js';

afterEach(() => {
  seedCapabilities();
  seedFlags({ sections: false, connectors: false, githubImport: false });
});

test('Settings stories retain their own states together and in isolation', async () => {
  const stories = GITHUB_IMPORT_GALLERY.categories.flatMap((category) => category.stories)
    .filter((story) => ['settings-checking', 'settings', 'settings-lapsed'].includes(story.id));
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    for (const selection of [stories, ...stories.map((story) => [story])]) {
      await act(async () => { root.render(<>{selection.map((story) => <div key={story.id} data-story={story.id}>{story.render()}</div>)}</>); });
      for (const story of selection) {
        const button = container.querySelector(`[data-story="${story.id}"] button`)!;
        expect(button.textContent).toBe(t(story.id === 'settings-checking' ? 'github.checking' : story.id === 'settings-lapsed' ? 'github.reconnect' : 'github.manage'));
      }
    }
  } finally {
    await act(async () => { root.unmount(); });
    container.remove();
  }
});

test('the disabled story shows a disabled Connect GitHub button, not Checking', async () => {
  const story = GITHUB_IMPORT_GALLERY.categories.flatMap((category) => category.stories).find((candidate) => candidate.id === 'disabled')!;
  const container = document.createElement('div');
  const root = createRoot(container);
  try {
    await act(async () => { root.render(story.render()); });
    const connect = [...container.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent === t('github.connect'))!;
    expect(connect.disabled).toBe(true);
    expect(container.textContent).not.toContain(t('github.checking'));
  } finally {
    await act(async () => { root.unmount(); });
  }
});
