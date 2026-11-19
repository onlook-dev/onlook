import { afterEach, expect, it } from 'bun:test';
import { takeComplaints } from './testing/dom.js';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { t } from '@studio/i18n';
import type { RendererExceptionReport } from '@studio/events';
import { installBridge } from './testing/bridge.js';
import { RegionErrorBoundary } from './RegionErrorBoundary.js';

afterEach(() => { takeComplaints(); });

it('keeps the other regions mounted after a sidebar crash and retries the sidebar', async () => {
  const reports: RendererExceptionReport[] = [];
  installBridge({ log: () => undefined, telemetryException: (report) => { reports.push(report); } });
  let shouldThrow = true;
  function SidebarContent(): React.JSX.Element {
    if (shouldThrow) throw new TypeError("Cannot read properties of undefined (reading 'slice')");
    return <div data-testid="recovered-sidebar" />;
  }
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    await act(async () => {
      root.render(<>
        <div data-testid="canvas" />
        <RegionErrorBoundary region="sidebar" fallbackStyle={{ flex: '1 1 auto', backgroundImage: 'linear-gradient(var(--color-background-surface), var(--color-background-surface))' }}><SidebarContent /></RegionErrorBoundary>
        <textarea data-testid="chat" defaultValue="An unfinished message" />
      </>);
    });
    const canvas = container.querySelector('[data-testid="canvas"]');
    const chat = container.querySelector('[data-testid="chat"]');
    expect(canvas).not.toBeNull();
    expect(chat).not.toBeNull();
    expect(container.querySelector('[data-testid="region-error-sidebar"]')).not.toBeNull();
    const fallback = container.querySelector<HTMLElement>('[data-testid="region-error-sidebar"]');
    expect(fallback?.style.flex).toBe('1 1 auto');
    expect(fallback?.style.backgroundImage).toContain('var(--color-background-surface)');
    expect(reports).toHaveLength(1);
    expect(reports[0]?.region).toBe('sidebar');
    const retry = container.querySelector('button');
    expect(retry?.textContent).toBe(t('errorBoundary.retry'));
    shouldThrow = false;
    await act(async () => { retry?.click(); });
    expect(container.querySelector('[data-testid="recovered-sidebar"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="canvas"]')).toBe(canvas);
    expect(container.querySelector('[data-testid="chat"]')).toBe(chat);
    expect((chat as HTMLTextAreaElement).value).toBe('An unfinished message');
  } finally {
    await act(async () => { root.unmount(); });
    container.remove();
  }
});
